import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
	buildMdbrainConfig,
	resolveMdbrainConfigFilePath,
	resolveMdbrainStandaloneWorkspaceDir,
	resolveBridgeConfig,
} from "./memory-config.js"

describe("memory-config standalone", () => {
	const prev = { ...process.env }

	afterEach(() => {
		process.env = { ...prev }
	})

	it("uses ~/.mdbrain/workspace when MDBRAIN_WORKSPACE_DIR is unset", () => {
		const ws = resolveMdbrainStandaloneWorkspaceDir({})
		expect(ws).toBe(path.join(os.homedir(), ".mdbrain", "workspace"))
	})

	it("respects MDBRAIN_WORKSPACE_DIR", () => {
		const dir = resolveMdbrainStandaloneWorkspaceDir({
			MDBRAIN_WORKSPACE_DIR: "/tmp/mws",
		})
		expect(dir).toBe("/tmp/mws")
	})

	it("buildMdbrainConfig preserves the mongodb backend by default", () => {
		process.env = { ...prev, MDBRAIN_STANDALONE: "1" }
		const cfg = buildMdbrainConfig(process.env)
		expect(cfg.memory?.backend).toBe("mongodb")
	})

	it("buildMdbrainConfig uses MDBRAIN_MONGODB_URI when it is set", () => {
		process.env = {
			...prev,
			MDBRAIN_MONGODB_URI: "mongodb://127.0.0.1:27017/x",
		}
		const cfg = buildMdbrainConfig(process.env)
		expect(cfg.memory?.mongodb?.uri).toBe("mongodb://127.0.0.1:27017/x")
	})

	it("resolveBridgeConfig reads from process.env", () => {
		process.env = {
			...prev,
			MDBRAIN_MONGODB_URI: "mongodb://127.0.0.1:27017/bridge",
		}
		const cfg = resolveBridgeConfig()
		expect(cfg.memory?.mongodb?.uri).toBe("mongodb://127.0.0.1:27017/bridge")
	})

	it("reads collection prefix from process.env", () => {
		process.env = {
			...prev,
			MDBRAIN_MONGODB_URI: "mongodb://127.0.0.1:27017/bridge",
			MDBRAIN_MONGODB_COLLECTION_PREFIX: "mdbrain_bench_",
		}
		const cfg = buildMdbrainConfig(process.env)
		expect(cfg.memory?.mongodb?.collectionPrefix).toBe("mdbrain_bench_")
	})

	it("buildMdbrainConfig merges URI from env", () => {
		process.env = {
			...prev,
			MDBRAIN_MONGODB_URI:
				"mongodb://127.0.0.1:27017/mdbrain?directConnection=true",
		}
		const cfg = buildMdbrainConfig(process.env)
		expect(cfg.memory?.backend).toBe("mongodb")
		expect(cfg.memory?.mongodb?.uri).toBe(
			"mongodb://127.0.0.1:27017/mdbrain?directConnection=true",
		)
		expect(cfg.agents?.defaults?.workspace).toBeTruthy()
	})

	it("reads optional mdbrain.json when present", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mdbrain-cfg-"))
		const cfgPath = path.join(dir, "mdbrain.json")
		fs.writeFileSync(
			cfgPath,
			JSON.stringify({
				memory: {
					mongodb: { database: "fromfile" },
				},
			}),
			"utf-8",
		)
		process.env = {
			...prev,
			MDBRAIN_CONFIG_PATH: cfgPath,
			MDBRAIN_MONGODB_URI: "mongodb://h/",
		}
		const cfg = buildMdbrainConfig(process.env)
		expect(cfg.memory?.mongodb?.database).toBe("fromfile")
		expect(resolveMdbrainConfigFilePath(process.env)).toBe(cfgPath)
		fs.rmSync(dir, { recursive: true, force: true })
	})
})
