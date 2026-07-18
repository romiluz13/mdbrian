import { createHash } from "node:crypto"
import type { Db } from "mongodb"
import { createSubsystemLogger } from "@mdbrain/lib"
import {
	chunksCollection,
	eventsCollection,
	migrationsCollection,
} from "./mongodb-schema.js"
import { resolveScopeRef } from "./mongodb-scope.js"

const log = createSubsystemLogger("memory:mongodb:migration")

// H3 (#28): migration tracking -------------------------------------------------

/** Stable id for the chunks→events backfill migration. */
export const BACKFILL_EVENTS_MIGRATION_ID = "backfill-events-from-chunks"

/**
 * H3 (#28): Returns true when `migrationId` has already been recorded in the
 * migrations collection. Uses a simple { _id: migrationId } lookup.
 */
export async function isMigrationApplied(
	db: Db,
	prefix: string,
	migrationId: string,
): Promise<boolean> {
	const existing = await migrationsCollection(db, prefix).findOne({
		_id: migrationId,
	})
	return existing !== null
}

/**
 * H3 (#28): Records a migration as applied. Idempotent — uses upsert so a
 * repeat call after a partial run is a no-op.
 */
export async function recordMigrationApplied(
	db: Db,
	prefix: string,
	migrationId: string,
): Promise<void> {
	await migrationsCollection(db, prefix).updateOne(
		{ _id: migrationId },
		{ $setOnInsert: { _id: migrationId, appliedAt: new Date() } },
		{ upsert: true },
	)
}

// ---------------------------------------------------------------------------
// Backfill v1 conversation chunks into canonical events
// ---------------------------------------------------------------------------

/**
 * Read existing conversation chunks (source: "memory" or "sessions") and create
 * canonical events from them. Uses deterministic eventIds derived from chunk
 * path + hash for idempotency. Safe to re-run.
 */
export async function backfillEventsFromChunks(params: {
	db: Db
	prefix: string
	agentId: string
	batchSize?: number
}): Promise<{
	eventsCreated: number
	chunksProcessed: number
	skipped: number
}> {
	const { db, prefix, agentId, batchSize = 100 } = params

	// H3 (#28): skip if this migration has already been applied.
	if (await isMigrationApplied(db, prefix, BACKFILL_EVENTS_MIGRATION_ID)) {
		log.info(
			`migration ${BACKFILL_EVENTS_MIGRATION_ID} already applied; skipping backfill`,
		)
		return { eventsCreated: 0, chunksProcessed: 0, skipped: 0 }
	}

	const chunks = chunksCollection(db, prefix)
	const events = eventsCollection(db, prefix)
	const scope = "agent"
	const scopeRef = resolveScopeRef({ scope, agentId })

	// Read all conversation chunks
	const allChunks = await chunks
		.find({ source: { $in: ["conversation", "memory", "sessions"] } })
		.toArray()

	let chunksProcessed = 0
	let skipped = 0
	let eventsCreated = 0

	// Process in batches
	for (let i = 0; i < allChunks.length; i += batchSize) {
		const batch = allChunks.slice(i, i + batchSize)
		const ops: Array<{
			updateOne: {
				filter: { eventId: string }
				update: { $setOnInsert: Record<string, unknown> }
				upsert: boolean
			}
		}> = []

		for (const chunk of batch) {
			chunksProcessed++

			// Skip chunks without text
			const text = chunk.text as string | undefined
			if (!text) {
				skipped++
				continue
			}

			// Skip chunks with missing/null path or hash (invalid for deterministic eventId)
			const chunkPath = chunk.path as string | undefined | null
			const chunkHash = chunk.hash as string | undefined | null
			if (!chunkPath || !chunkHash) {
				log.warn(
					`skipping chunk with missing path or hash: path=${String(chunkPath)} hash=${String(chunkHash)}`,
				)
				skipped++
				continue
			}

			// Deterministic eventId from chunk path + hash for idempotency
			const eventId = createHash("sha256")
				.update(chunkPath + chunkHash)
				.digest("hex")
				.slice(0, 32)

			const timestamp = (chunk.updatedAt as Date) ?? new Date()

			ops.push({
				updateOne: {
					filter: { eventId },
					update: {
						$setOnInsert: {
							eventId,
							agentId,
							role: "user",
							body: text,
							scope,
							scopeRef,
							timestamp,
						},
					},
					upsert: true,
				},
			})
		}

		if (ops.length > 0) {
			const batchIndex = Math.floor(i / batchSize) + 1
			try {
				const result = await events.bulkWrite(ops)
				eventsCreated += result.upsertedCount
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err)
				log.warn(
					`bulkWrite failed on batch ${batchIndex} (${eventsCreated} events created so far, ${chunksProcessed}/${allChunks.length} chunks processed): ${msg}`,
				)
				throw err
			}
		}
	}

	log.info(
		`backfill complete: chunksProcessed=${chunksProcessed} eventsCreated=${eventsCreated} skipped=${skipped}`,
	)
	// H3 (#28): record the migration as applied so re-runs are skipped.
	await recordMigrationApplied(db, prefix, BACKFILL_EVENTS_MIGRATION_ID)
	return { eventsCreated, chunksProcessed, skipped }
}
