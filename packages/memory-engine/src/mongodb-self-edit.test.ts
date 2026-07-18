import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks — selfEditBlock reads from structuredMemCollection and writes via
// writeStructuredMemory, both of which we mock.
// ---------------------------------------------------------------------------

vi.mock("./mongodb-schema.js", () => ({
	structuredMemCollection: vi.fn(),
}))

vi.mock("./mongodb-structured-memory.js", () => ({
	writeStructuredMemory: vi.fn(async () => ({
		upserted: true,
		id: "mock-id",
	})),
}))

import { structuredMemCollection } from "./mongodb-schema.js"
import { writeStructuredMemory } from "./mongodb-structured-memory.js"
import { selfEditBlock } from "./mongodb-self-edit.js"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFakeFindOne(existing: { value: string } | null) {
	return vi.fn().mockResolvedValue(existing)
}

/**
 * H2 (#27): standalone append/prepend now uses an atomic
 * findOneAndUpdate (aggregation pipeline) + updateOne to mark embeddings
 * stale. This helper mocks both paths. `updatedValue` is the value the
 * atomic update should report as the post-update doc.
 */
function setupCollection(
	existing: { value: string } | null,
	updatedValue?: string,
) {
	const findOne = makeFakeFindOne(existing)
	const updatedDoc =
		updatedValue !== undefined
			? {
					value: updatedValue,
					agentId: "agent-1",
					type: "preference",
					key: "core:user",
				}
			: null
	const findOneAndUpdate = vi.fn().mockResolvedValue(updatedDoc)
	const updateOne = vi
		.fn()
		.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 })
	vi.mocked(structuredMemCollection).mockReturnValue({
		findOne,
		findOneAndUpdate,
		updateOne,
	} as any)
	return { findOne, findOneAndUpdate, updateOne }
}

const baseParams = {
	db: {} as any,
	prefix: "test_",
	agentId: "agent-1",
	embeddingMode: "automated" as const,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("selfEditBlock", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("replace: writes new value directly", async () => {
		setupCollection(null)

		const result = await selfEditBlock({
			...baseParams,
			block: "user",
			action: "replace",
			content: "User likes TypeScript",
		})

		expect(result).toEqual({ upserted: expect.any(Boolean), id: "core:user" })
		expect(writeStructuredMemory).toHaveBeenCalledWith(
			expect.objectContaining({
				entry: expect.objectContaining({
					type: "preference",
					key: "core:user",
					value: "User likes TypeScript",
					confidence: 1.0,
					salience: "critical",
					sourceAgent: { id: "agent-1", name: "user" },
				}),
			}),
		)
	})

	it("append: appends atomically via aggregation pipeline (H2 #27)", async () => {
		const { findOneAndUpdate, updateOne } = setupCollection(
			{ value: "Existing content" },
			"Existing content\nNew content",
		)

		const result = await selfEditBlock({
			...baseParams,
			block: "user",
			action: "append",
			content: "New content",
		})

		expect(result.id).toBe("core:user")
		expect(result.upserted).toBe(true)
		// Atomic findOneAndUpdate used, not read-then-write via writeStructuredMemory
		expect(findOneAndUpdate).toHaveBeenCalledOnce()
		expect(writeStructuredMemory).not.toHaveBeenCalled()
		const [filter, pipeline, options] = findOneAndUpdate.mock
			.calls[0] as unknown[]
		expect(filter).toEqual({
			agentId: "agent-1",
			type: "preference",
			key: "core:user",
		})
		// Aggregation pipeline: [{ $set: { value: { $concat: [..., "\n", content] } } }]
		expect(Array.isArray(pipeline)).toBe(true)
		expect(options).toEqual(
			expect.objectContaining({ upsert: true, returnDocument: "after" }),
		)
		// Embedding marked stale after the atomic value update
		expect(updateOne).toHaveBeenCalledOnce()
	})

	it("append with client: uses a transaction and passes the session to the write path", async () => {
		const { findOne } = setupCollection({ value: "Existing content" })
		const withTransaction = vi.fn(async (fn: () => Promise<void>) => {
			await fn()
		})
		const endSession = vi.fn(async () => {})
		const session = { withTransaction, endSession } as any
		const client = {
			startSession: vi.fn(() => session),
		} as any

		await selfEditBlock({
			...baseParams,
			client,
			block: "user",
			action: "append",
			content: "New content",
		})

		expect(client.startSession).toHaveBeenCalledTimes(1)
		expect(findOne).toHaveBeenCalledWith(
			{ agentId: "agent-1", type: "preference", key: "core:user" },
			{ session },
		)
		expect(writeStructuredMemory).toHaveBeenCalledWith(
			expect.objectContaining({
				session,
				entry: expect.objectContaining({
					value: "Existing content\nNew content",
				}),
			}),
		)
		expect(withTransaction).toHaveBeenCalledTimes(1)
		expect(endSession).toHaveBeenCalledTimes(1)
	})

	it("prepend: prepends atomically via aggregation pipeline (H2 #27)", async () => {
		const { findOneAndUpdate } = setupCollection(
			{ value: "Existing content" },
			"New content\nExisting content",
		)

		const result = await selfEditBlock({
			...baseParams,
			block: "persona",
			action: "prepend",
			content: "New content",
		})

		expect(result.id).toBe("core:persona")
		expect(findOneAndUpdate).toHaveBeenCalledOnce()
		expect(writeStructuredMemory).not.toHaveBeenCalled()
		const [filter, pipeline] = findOneAndUpdate.mock.calls[0] as unknown[]
		expect(filter).toEqual({
			agentId: "agent-1",
			type: "identity",
			key: "core:persona",
		})
		// prepend order: content, "\n", existing
		const setStage = (pipeline as Array<Record<string, unknown>>)[0]
			.$set as Record<string, unknown>
		const concat = setStage.value as Record<string, unknown>
		expect(concat.$concat).toEqual([
			"New content",
			"\n",
			expect.objectContaining({ $ifNull: ["$value", ""] }),
		])
	})

	it("append on non-existing doc: creates with just the content (H2 #27)", async () => {
		const { findOneAndUpdate } = setupCollection(null, "Follow these rules")

		const result = await selfEditBlock({
			...baseParams,
			block: "instructions",
			action: "append",
			content: "Follow these rules",
		})

		expect(result.id).toBe("core:instructions")
		expect(findOneAndUpdate).toHaveBeenCalledOnce()
		const [filter, , options] = findOneAndUpdate.mock.calls[0] as unknown[]
		expect(filter).toEqual({
			agentId: "agent-1",
			type: "instruction",
			key: "core:instructions",
		})
		// upsert creates the doc when missing; $ifNull yields just the content
		expect(options).toEqual(
			expect.objectContaining({ upsert: true, returnDocument: "after" }),
		)
	})

	it("sets confidence=1.0 and sourceAgent.name='user'", async () => {
		setupCollection(null)

		await selfEditBlock({
			...baseParams,
			block: "user",
			action: "replace",
			content: "Anything",
		})

		expect(writeStructuredMemory).toHaveBeenCalledWith(
			expect.objectContaining({
				entry: expect.objectContaining({
					confidence: 1.0,
					sourceAgent: { id: "agent-1", name: "user" },
				}),
			}),
		)
	})

	it("maps block 'persona' to type 'identity' and key 'core:persona'", async () => {
		setupCollection(null)

		await selfEditBlock({
			...baseParams,
			block: "persona",
			action: "replace",
			content: "I am helpful",
		})

		expect(writeStructuredMemory).toHaveBeenCalledWith(
			expect.objectContaining({
				entry: expect.objectContaining({
					type: "identity",
					key: "core:persona",
				}),
			}),
		)
	})

	it("maps block 'instructions' to type 'instruction' and key 'core:instructions'", async () => {
		setupCollection(null)

		await selfEditBlock({
			...baseParams,
			block: "instructions",
			action: "replace",
			content: "Always be concise",
		})

		expect(writeStructuredMemory).toHaveBeenCalledWith(
			expect.objectContaining({
				entry: expect.objectContaining({
					type: "instruction",
					key: "core:instructions",
				}),
			}),
		)
	})
})
