/**
 * Self-editing memory: allows agents to directly edit their own core memory
 * blocks (user preferences, persona identity, task instructions).
 */
import type { Db, MongoClient } from "mongodb"
import type { MemoryMongoDBEmbeddingMode } from "@mdbrain/lib"
import type { MemorySelfEditBlock, MemorySelfEditAction } from "./types.js"
import { structuredMemCollection } from "./mongodb-schema.js"
import {
	writeStructuredMemory,
	type StructuredMemoryType,
} from "./mongodb-structured-memory.js"

// ---------------------------------------------------------------------------
// Block → structured memory type/key mapping
// ---------------------------------------------------------------------------

const BLOCK_MAP: Record<
	MemorySelfEditBlock,
	{ type: StructuredMemoryType; key: string }
> = {
	user: { type: "preference", key: "core:user" },
	persona: { type: "identity", key: "core:persona" },
	instructions: { type: "instruction", key: "core:instructions" },
}

// ---------------------------------------------------------------------------
// selfEditBlock — standalone function
// ---------------------------------------------------------------------------

export async function selfEditBlock(params: {
	db: Db
	prefix: string
	agentId: string
	embeddingMode: MemoryMongoDBEmbeddingMode
	client?: MongoClient
	block: MemorySelfEditBlock
	action: MemorySelfEditAction
	content: string
}): Promise<{ upserted: boolean; id: string }> {
	const { db, prefix, agentId, embeddingMode, client, block, action, content } =
		params
	const { type, key } = BLOCK_MAP[block]

	if (action !== "replace" && client) {
		const session = client.startSession()
		try {
			let result: { upserted: boolean; id: string } | undefined
			await session.withTransaction(async () => {
				const existing = await structuredMemCollection(db, prefix).findOne(
					{ agentId, type, key },
					{ session },
				)
				const existingValue =
					existing && typeof existing.value === "string" ? existing.value : null
				const value =
					existingValue == null
						? content
						: action === "append"
							? `${existingValue}\n${content}`
							: `${content}\n${existingValue}`

				result = await writeStructuredMemory({
					db,
					prefix,
					entry: {
						type,
						key,
						value,
						agentId,
						confidence: 1.0,
						salience: "critical",
						sourceAgent: { id: agentId, name: "user" },
					},
					embeddingMode,
					session,
				})
			})

			return { upserted: result?.upserted ?? false, id: `core:${block}` }
		} finally {
			await session.endSession()
		}
	}

	if (action === "replace") {
		const result = await writeStructuredMemory({
			db,
			prefix,
			entry: {
				type,
				key,
				value: content,
				agentId,
				confidence: 1.0,
				salience: "critical",
				sourceAgent: { id: agentId, name: "user" },
			},
			embeddingMode,
			client,
		})
		return { upserted: result.upserted, id: `core:${block}` }
	}

	// H2 (#27): append/prepend without a transaction — use an atomic
	// aggregation-pipeline update so we don't lose updates to a concurrent
	// writer. $ifNull makes the concat a no-op on a missing field, and
	// upsert:true lets us create the doc in the same atomic step.
	// Embeddings are re-derived by the writer path below.
	const filter = { agentId, type, key }
	const concatExpr =
		action === "append"
			? { $concat: [{ $ifNull: ["$value", ""] }, "\n", content] }
			: { $concat: [content, "\n", { $ifNull: ["$value", ""] }] }

	const updated = await structuredMemCollection(db, prefix).findOneAndUpdate(
		filter,
		[{ $set: { value: concatExpr } }],
		{ upsert: true, returnDocument: "after" },
	)

	// Mark the embedding as stale so the next search / projection refreshes it.
	if (updated) {
		try {
			await structuredMemCollection(db, prefix).updateOne(filter, {
				$set: { embeddingStatus: "pending", updatedAt: new Date() },
			})
		} catch {
			// Non-fatal — the value was already persisted atomically.
		}
	}

	return { upserted: updated !== null, id: `core:${block}` }
}
