/* eslint-disable @typescript-eslint/unbound-method -- Vitest mock method assertions */
import type { Collection, Db } from "mongodb"
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the schema module before imports
vi.mock("./mongodb-schema.js", () => ({
	chunksCollection: vi.fn(),
	eventsCollection: vi.fn(),
	migrationsCollection: vi.fn(),
}))

import {
	backfillEventsFromChunks,
	BACKFILL_EVENTS_MIGRATION_ID,
	isMigrationApplied,
	recordMigrationApplied,
} from "./mongodb-migration.js"
import {
	chunksCollection,
	eventsCollection,
	migrationsCollection,
	type MigrationDoc,
} from "./mongodb-schema.js"

// ---------------------------------------------------------------------------
// Mock collection factories
// ---------------------------------------------------------------------------

function createMockChunksCol(
	chunks: Record<string, unknown>[] = [],
): Collection {
	return {
		find: vi.fn(() => ({
			toArray: vi.fn(async () => chunks),
		})),
	} as unknown as Collection
}

function createMockEventsCol(): Collection {
	return {
		bulkWrite: vi.fn(async (ops: unknown[]) => ({
			upsertedCount: ops.length,
			modifiedCount: 0,
			insertedCount: 0,
			matchedCount: 0,
			deletedCount: 0,
			ok: 1,
		})),
	} as unknown as Collection
}

/** H3 (#28): mock migrations collection — not applied by default. */
function createMockMigrationsCol(applied = false): {
	col: Collection<MigrationDoc>
	findOne: ReturnType<typeof vi.fn>
	updateOne: ReturnType<typeof vi.fn>
} {
	const findOne = vi
		.fn()
		.mockResolvedValue(
			applied
				? { _id: BACKFILL_EVENTS_MIGRATION_ID, appliedAt: new Date() }
				: null,
		)
	const updateOne = vi
		.fn()
		.mockResolvedValue({ matchedCount: 0, modifiedCount: 0, upsertedCount: 1 })
	const col = { findOne, updateOne } as unknown as Collection<MigrationDoc>
	return { col, findOne, updateOne }
}

function mockDb(): Db {
	return {} as unknown as Db
}

// ---------------------------------------------------------------------------
// Tests: backfillEventsFromChunks
// ---------------------------------------------------------------------------

describe("backfillEventsFromChunks", () => {
	let migrationsCol: Collection<MigrationDoc>
	let migrationsUpdateOne: ReturnType<typeof vi.fn>

	beforeEach(() => {
		vi.clearAllMocks()
		const m = createMockMigrationsCol(false)
		migrationsCol = m.col
		migrationsUpdateOne = m.updateOne
		vi.mocked(migrationsCollection).mockReturnValue(migrationsCol)
	})

	it("reads chunks and creates events", async () => {
		const chunks = [
			{
				path: "sessions/msg-1",
				text: "Hello from chunk",
				hash: "abc123",
				source: "conversation",
				updatedAt: new Date("2025-06-01"),
			},
			{
				path: "sessions/msg-2",
				text: "Another message",
				hash: "def456",
				source: "sessions",
				updatedAt: new Date("2025-06-02"),
			},
		]

		const chunksCol = createMockChunksCol(chunks)
		const eventsCol = createMockEventsCol()

		vi.mocked(chunksCollection).mockReturnValue(chunksCol)
		vi.mocked(eventsCollection).mockReturnValue(eventsCol)

		const result = await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		expect(result.chunksProcessed).toBe(2)
		expect(result.eventsCreated).toBe(2)
		expect(result.skipped).toBe(0)

		// Verify bulkWrite was called
		expect(eventsCol.bulkWrite).toHaveBeenCalled()

		// Verify the operations are updateOne with upsert
		const ops = vi.mocked(eventsCol.bulkWrite).mock
			.calls[0][0] as unknown as Array<Record<string, unknown>>
		expect(ops.length).toBe(2)

		const firstOp = ops[0] as {
			updateOne: {
				filter: Record<string, unknown>
				update: Record<string, Record<string, unknown>>
				upsert: boolean
			}
		}
		expect(firstOp.updateOne).toBeDefined()
		expect(firstOp.updateOne.upsert).toBe(true)
		expect(firstOp.updateOne.update.$setOnInsert).toBeDefined()
		expect(firstOp.updateOne.update.$setOnInsert.body).toBe("Hello from chunk")
		expect(firstOp.updateOne.update.$setOnInsert.scopeRef).toBe("agent:agent-1")
	})

	it("is idempotent - re-running does not duplicate", async () => {
		const chunks = [
			{
				path: "sessions/msg-1",
				text: "Hello",
				hash: "abc123",
				source: "conversation",
				updatedAt: new Date("2025-06-01"),
			},
		]

		const chunksCol = createMockChunksCol(chunks)
		// Second run: bulkWrite returns 0 upserted (all matched existing)
		const eventsCol = createMockEventsCol()
		vi.mocked(eventsCol.bulkWrite).mockResolvedValue({
			upsertedCount: 0,
			modifiedCount: 0,
			insertedCount: 0,
			matchedCount: 1,
			deletedCount: 0,
			ok: 1,
		} as never)

		vi.mocked(chunksCollection).mockReturnValue(chunksCol)
		vi.mocked(eventsCollection).mockReturnValue(eventsCol)

		const result = await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		// Chunks were processed but no new events created (idempotent)
		expect(result.chunksProcessed).toBe(1)
		expect(result.eventsCreated).toBe(0)

		// Verify deterministic eventId: same chunk produces same eventId
		const ops = vi.mocked(eventsCol.bulkWrite).mock
			.calls[0][0] as unknown as Array<Record<string, unknown>>
		const firstOp = ops[0] as { updateOne: { filter: { eventId: string } } }
		const eventId1 = firstOp.updateOne.filter.eventId

		// Run again with same data
		vi.mocked(eventsCol.bulkWrite).mockClear()
		vi.mocked(eventsCol.bulkWrite).mockResolvedValue({
			upsertedCount: 0,
			modifiedCount: 0,
			insertedCount: 0,
			matchedCount: 1,
			deletedCount: 0,
			ok: 1,
		} as never)

		await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		const ops2 = [...vi.mocked(eventsCol.bulkWrite).mock.calls[0][0]] as Array<
			Record<string, unknown>
		>
		const secondOp = ops2[0] as { updateOne: { filter: { eventId: string } } }
		expect(secondOp.updateOne.filter.eventId).toBe(eventId1)
	})

	it("preserves chunk text as event body", async () => {
		const chunks = [
			{
				path: "sessions/msg-1",
				text: "Preserved text content here",
				hash: "hash1",
				source: "conversation",
				updatedAt: new Date("2025-06-01"),
			},
		]

		const chunksCol = createMockChunksCol(chunks)
		const eventsCol = createMockEventsCol()

		vi.mocked(chunksCollection).mockReturnValue(chunksCol)
		vi.mocked(eventsCollection).mockReturnValue(eventsCol)

		await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		const ops = vi.mocked(eventsCol.bulkWrite).mock
			.calls[0][0] as unknown as Array<Record<string, unknown>>
		const firstOp = ops[0] as {
			updateOne: { update: { $setOnInsert: { body: string } } }
		}
		expect(firstOp.updateOne.update.$setOnInsert.body).toBe(
			"Preserved text content here",
		)
	})

	it("sets scope agent as default", async () => {
		const chunks = [
			{
				path: "sessions/msg-1",
				text: "Test",
				hash: "hash1",
				source: "conversation",
				updatedAt: new Date("2025-06-01"),
			},
		]

		const chunksCol = createMockChunksCol(chunks)
		const eventsCol = createMockEventsCol()

		vi.mocked(chunksCollection).mockReturnValue(chunksCol)
		vi.mocked(eventsCollection).mockReturnValue(eventsCol)

		await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		const ops = vi.mocked(eventsCol.bulkWrite).mock
			.calls[0][0] as unknown as Array<Record<string, unknown>>
		const firstOp = ops[0] as {
			updateOne: { update: { $setOnInsert: { scope: string } } }
		}
		expect(firstOp.updateOne.update.$setOnInsert.scope).toBe("agent")
	})

	it("reports eventsCreated, chunksProcessed, skipped", async () => {
		const chunks = [
			{
				path: "sessions/msg-1",
				text: "Good chunk",
				hash: "hash1",
				source: "conversation",
				updatedAt: new Date("2025-06-01"),
			},
			{
				path: "sessions/msg-2",
				text: "",
				hash: "hash2",
				source: "sessions",
				updatedAt: new Date("2025-06-02"),
			},
			{
				path: "sessions/msg-3",
				hash: "hash3",
				source: "conversation",
				updatedAt: new Date("2025-06-03"),
			},
		]

		const chunksCol = createMockChunksCol(chunks)
		const eventsCol = createMockEventsCol()
		vi.mocked(eventsCol.bulkWrite).mockResolvedValue({
			upsertedCount: 1,
			modifiedCount: 0,
			insertedCount: 0,
			matchedCount: 0,
			deletedCount: 0,
			ok: 1,
		} as never)

		vi.mocked(chunksCollection).mockReturnValue(chunksCol)
		vi.mocked(eventsCollection).mockReturnValue(eventsCol)

		const result = await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		expect(result.chunksProcessed).toBe(3)
		expect(result.skipped).toBe(2) // empty text and missing text
		expect(result.eventsCreated).toBe(1)
	})

	it("skips chunks with missing or null path/hash", async () => {
		const chunks = [
			{
				path: "sessions/msg-1",
				text: "Valid chunk",
				hash: "hash1",
				source: "conversation",
				updatedAt: new Date("2025-06-01"),
			},
			{
				// missing path entirely
				text: "No path chunk",
				hash: "hash2",
				source: "conversation",
				updatedAt: new Date("2025-06-02"),
			},
			{
				path: "sessions/msg-3",
				text: "No hash chunk",
				// missing hash entirely
				source: "conversation",
				updatedAt: new Date("2025-06-03"),
			},
			{
				path: null,
				text: "Null path chunk",
				hash: "hash4",
				source: "sessions",
				updatedAt: new Date("2025-06-04"),
			},
			{
				path: "sessions/msg-5",
				text: "Null hash chunk",
				hash: null,
				source: "sessions",
				updatedAt: new Date("2025-06-05"),
			},
		]

		const chunksCol = createMockChunksCol(chunks)
		const eventsCol = createMockEventsCol()
		vi.mocked(eventsCol.bulkWrite).mockResolvedValue({
			upsertedCount: 1,
			modifiedCount: 0,
			insertedCount: 0,
			matchedCount: 0,
			deletedCount: 0,
			ok: 1,
		} as never)

		vi.mocked(chunksCollection).mockReturnValue(chunksCol)
		vi.mocked(eventsCollection).mockReturnValue(eventsCol)

		const result = await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		// Only the first chunk is valid (has text, path, and hash)
		expect(result.chunksProcessed).toBe(5)
		expect(result.skipped).toBe(4) // 4 skipped: missing/null path or hash
		expect(result.eventsCreated).toBe(1)

		// Verify bulkWrite was called with exactly 1 operation
		const ops = vi.mocked(eventsCol.bulkWrite).mock
			.calls[0][0] as unknown as Array<Record<string, unknown>>
		expect(ops.length).toBe(1)
	})

	it("records the migration as applied after a successful backfill (H3 #28)", async () => {
		const chunks = [
			{
				path: "sessions/msg-1",
				text: "Hello",
				hash: "abc",
				source: "conversation",
				updatedAt: new Date(),
			},
		]
		const chunksCol = createMockChunksCol(chunks)
		const eventsCol = createMockEventsCol()
		vi.mocked(chunksCollection).mockReturnValue(chunksCol)
		vi.mocked(eventsCollection).mockReturnValue(eventsCol)

		await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		expect(migrationsUpdateOne).toHaveBeenCalledOnce()
		const [filter] = migrationsUpdateOne.mock.calls[0] as unknown[]
		expect(filter).toEqual({ _id: BACKFILL_EVENTS_MIGRATION_ID })
	})

	it("skips backfill when the migration is already applied (H3 #28)", async () => {
		const applied = createMockMigrationsCol(true)
		vi.mocked(migrationsCollection).mockReturnValue(applied.col)
		const chunksCol = createMockChunksCol([
			{
				path: "sessions/msg-1",
				text: "Hello",
				hash: "abc",
				source: "conversation",
				updatedAt: new Date(),
			},
		])
		const eventsCol = createMockEventsCol()
		vi.mocked(chunksCollection).mockReturnValue(chunksCol)
		vi.mocked(eventsCollection).mockReturnValue(eventsCol)

		const result = await backfillEventsFromChunks({
			db: mockDb(),
			prefix: "test_",
			agentId: "agent-1",
		})

		expect(result).toEqual({ eventsCreated: 0, chunksProcessed: 0, skipped: 0 })
		expect(eventsCol.bulkWrite).not.toHaveBeenCalled()
		// Already applied → recordMigrationApplied not called again.
		expect(applied.updateOne).not.toHaveBeenCalled()
	})
})

// ---------------------------------------------------------------------------
// H3 (#28): migration tracking helpers
// ---------------------------------------------------------------------------

describe("isMigrationApplied / recordMigrationApplied (H3 #28)", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("isMigrationApplied returns false when no record exists", async () => {
		const { col, findOne } = createMockMigrationsCol(false)
		vi.mocked(migrationsCollection).mockReturnValue(col)

		const applied = await isMigrationApplied(
			mockDb(),
			"test_",
			"some-migration",
		)

		expect(applied).toBe(false)
		expect(findOne).toHaveBeenCalledWith({ _id: "some-migration" })
	})

	it("isMigrationApplied returns true when a record exists", async () => {
		const { col } = createMockMigrationsCol(true)
		vi.mocked(migrationsCollection).mockReturnValue(col)

		const applied = await isMigrationApplied(
			mockDb(),
			"test_",
			BACKFILL_EVENTS_MIGRATION_ID,
		)

		expect(applied).toBe(true)
	})

	it("recordMigrationApplied upserts the migration record", async () => {
		const { col, updateOne } = createMockMigrationsCol(false)
		vi.mocked(migrationsCollection).mockReturnValue(col)

		await recordMigrationApplied(
			mockDb(),
			"test_",
			BACKFILL_EVENTS_MIGRATION_ID,
		)

		expect(updateOne).toHaveBeenCalledOnce()
		const [filter, update, options] = updateOne.mock.calls[0] as unknown[]
		expect(filter).toEqual({ _id: BACKFILL_EVENTS_MIGRATION_ID })
		expect((update as Record<string, unknown>).$setOnInsert).toEqual(
			expect.objectContaining({
				_id: BACKFILL_EVENTS_MIGRATION_ID,
				appliedAt: expect.any(Date),
			}),
		)
		expect(options).toEqual(expect.objectContaining({ upsert: true }))
	})
})
