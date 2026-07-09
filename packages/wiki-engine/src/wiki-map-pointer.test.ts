// wiki-map-pointer.ts tests (T8).
//
// Tests the block generation + idempotent injection logic (no disk I/O for the
// core tests; writeWikiMapToFile uses real fs in a tmp dir).

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Collection, Db, Document } from "mongodb"
import {
	buildWikiMapBlock,
	generateWikiMapBlock,
	injectWikiMapBlock,
	writeWikiMapToFile,
} from "./wiki-map-pointer.js"
import type { WikiDbHandle } from "./wiki-bridge.js"

const PAGES = [
	{
		title: "Accounts Table",
		slug: "tables/accounts",
		summary: "Holds customer balance data.",
	},
	{ title: "Users Table", slug: "tables/users", summary: "Application users." },
]

describe("buildWikiMapBlock", () => {
	it("lists pages with title, slug, and summary", () => {
		const block = buildWikiMapBlock(PAGES)
		expect(block).toContain("## MDBrain Wiki Map")
		expect(block).toContain("**[Accounts Table](wiki/tables/accounts)**")
		expect(block).toContain("`tables/accounts`")
		expect(block).toContain("— Holds customer balance data.")
		expect(block).toContain("**[Users Table](wiki/tables/users)**")
		expect(block).toContain("2 page(s).")
	})

	it("wraps the block in START/END markers", () => {
		const block = buildWikiMapBlock(PAGES)
		expect(block).toContain("<!-- MDBRAIN-WIKI-MAP:START -->")
		expect(block).toContain("<!-- MDBRAIN-WIKI-MAP:END -->")
	})

	it("shows a placeholder when there are no pages", () => {
		const block = buildWikiMapBlock([])
		expect(block).toContain("No wiki pages found")
		expect(block).toContain("0 page(s).")
	})

	it("supports a custom heading", () => {
		const block = buildWikiMapBlock(PAGES, { heading: "## Project Wiki" })
		expect(block).toContain("## Project Wiki")
	})
})

describe("injectWikiMapBlock", () => {
	it("appends the block when the file has no existing block", () => {
		const result = injectWikiMapBlock(
			"# My Project\n\nSome content.",
			buildWikiMapBlock(PAGES),
		)
		expect(result).toContain("# My Project")
		expect(result).toContain("Some content.")
		expect(result).toContain("<!-- MDBRAIN-WIKI-MAP:START -->")
		// The original content is preserved and the block is appended.
		expect(result.indexOf("# My Project")).toBeLessThan(
			result.indexOf("MDBRAIN-WIKI-MAP:START"),
		)
	})

	it("replaces the existing block in place (idempotent), preserving the rest", () => {
		const original = `# Project

Some intro.

<!-- MDBRAIN-WIKI-MAP:START -->
## MDBrain Wiki Map

- **[Old Page](wiki/old)**

<!-- MDBRAIN-WIKI-MAP:END -->

More content below.`
		const result = injectWikiMapBlock(original, buildWikiMapBlock(PAGES))
		// Rest of file preserved.
		expect(result).toContain("# Project")
		expect(result).toContain("Some intro.")
		expect(result).toContain("More content below.")
		// Old page gone, new pages present.
		expect(result).not.toContain("[Old Page]")
		expect(result).toContain("[Accounts Table]")
		expect(result).toContain("[Users Table]")
		// Only one block.
		const startCount = (result.match(/MDBRAIN-WIKI-MAP:START/g) || []).length
		expect(startCount).toBe(1)
	})

	it("handles a file that is only the block", () => {
		const original = `<!-- MDBRAIN-WIKI-MAP:START -->
## old
<!-- MDBRAIN-WIKI-MAP:END -->`
		const result = injectWikiMapBlock(original, buildWikiMapBlock(PAGES))
		expect(result).toContain("[Accounts Table]")
		expect(result).not.toContain("## old")
	})

	it("handles an empty file", () => {
		const result = injectWikiMapBlock("", buildWikiMapBlock(PAGES))
		expect(result).toContain("<!-- MDBRAIN-WIKI-MAP:START -->")
		expect(result).toContain("[Accounts Table]")
	})

	it("handles malformed markers (START without END) — strips orphan, no duplicate", () => {
		const malformed = `# Project\n\n<!-- MDBRAIN-WIKI-MAP:START -->\n## old\n\nSome orphaned content.\n`
		const result = injectWikiMapBlock(malformed, buildWikiMapBlock(PAGES))
		// Only one START marker (no duplicate).
		const startCount = (result.match(/MDBRAIN-WIKI-MAP:START/g) || []).length
		expect(startCount).toBe(1)
		// Orphaned content is gone.
		expect(result).not.toContain("Some orphaned content")
		// New block is present.
		expect(result).toContain("[Accounts Table]")
		// Project content preserved.
		expect(result).toContain("# Project")
	})

	it("preserves a trailing newline when replacing a block at EOF", () => {
		const original = `# Project\n\n<!-- MDBRAIN-WIKI-MAP:START -->\n## old\n<!-- MDBRAIN-WIKI-MAP:END -->`
		const result = injectWikiMapBlock(original, buildWikiMapBlock(PAGES))
		expect(result.endsWith("\n")).toBe(true)
	})
})

describe("generateWikiMapBlock", () => {
	function mockHandle(pages: Document[]): WikiDbHandle {
		const coll = {
			find: vi.fn(() => ({
				sort: vi.fn(() => ({
					skip: vi.fn(() => ({
						limit: vi.fn(() => ({ toArray: async () => pages })),
					})),
				})),
			})),
			countDocuments: vi.fn(async () => pages.length),
		} as unknown as Collection
		const db = { collection: vi.fn(() => coll) } as unknown as Db
		return { db, prefix: "test_" }
	}

	it("fetches pages and builds the block", async () => {
		const h = mockHandle([
			{
				_id: { toString: () => "1" },
				kind: "concept",
				title: "X",
				slug: "x",
				aliases: [],
				summary: "An X.",
				body: "",
				frontmatter: { type: "concept" },
				claims: [],
				contradictions: [],
				questions: [],
				relationships: [],
				personCard: null,
				scope: "workspace",
				scopeRef: "ws-1",
				trustTier: "standard",
				permissions: {},
				state: "active",
				revision: 1,
				validFrom: new Date(),
				freshness: "fresh",
				backlinks: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		])
		const block = await generateWikiMapBlock(h, {
			scope: "workspace",
			scopeRef: "ws-1",
		})
		expect(block).toContain("[X]")
		expect(block).toContain("`x`")
		expect(block).toContain("An X.")
	})
})

describe("writeWikiMapToFile", () => {
	let tmp: string
	beforeEach(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mdbrian-map-"))
	})
	afterEach(() => {
		fs.rmSync(tmp, { recursive: true, force: true })
	})

	it("creates the file with the block if it doesn't exist", async () => {
		const f = path.join(tmp, "AGENTS.md")
		await writeWikiMapToFile(f, buildWikiMapBlock(PAGES))
		const content = fs.readFileSync(f, "utf-8")
		expect(content).toContain("<!-- MDBRAIN-WIKI-MAP:START -->")
		expect(content).toContain("[Accounts Table]")
	})

	it("updates the block in an existing file (idempotent)", async () => {
		const f = path.join(tmp, "AGENTS.md")
		fs.writeFileSync(f, "# Project\n\nIntro.\n", "utf-8")
		await writeWikiMapToFile(f, buildWikiMapBlock(PAGES))
		const content1 = fs.readFileSync(f, "utf-8")
		expect(content1).toContain("# Project")
		expect(content1).toContain("[Accounts Table]")
		// Re-run with different pages — should replace, not duplicate.
		await writeWikiMapToFile(
			f,
			buildWikiMapBlock([{ title: "New", slug: "new", summary: "N" }]),
		)
		const content2 = fs.readFileSync(f, "utf-8")
		expect(content2).toContain("# Project")
		expect(content2).not.toContain("[Accounts Table]")
		expect(content2).toContain("[New]")
		const startCount = (content2.match(/MDBRAIN-WIKI-MAP:START/g) || []).length
		expect(startCount).toBe(1)
	})
})
