import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
	buildMdbrianConfig,
	resolveMdbrianConfigFilePath,
	resolveMdbrianStandaloneWorkspaceDir,
	resolveBridgeConfig,
} from "./memory-config.js"

describe("memory-config standalone", () => {
	const prev = { ...process.env }

	afterEach(() => {
		process.env = { ...prev }
	})

	it("uses ~/.mdbrian/workspace when MDBRAIN_WORKSPACE_DIR is unset", () => {
		const ws = resolveMdbrianStandaloneWorkspaceDir({})
		expect(ws).toBe(path.join(os.homedir(), ".mdbrian", "workspace"))
	})

	it("respects MDBRAIN_WORKSPACE_DIR", () => {
		const dir = resolveMdbrianStandaloneWorkspaceDir({
			MDBRAIN_WORKSPACE_DIR: "/tmp/mws",
		})
		expect(dir).toBe("/tmp/mws")
	})

	it("buildMdbrianConfig preserves the mongodb backend by default", () => {
		process.env = { ...prev, MDBRAIN_STANDALONE: "1" }
		const cfg = buildMdbrianConfig(process.env)
		expect(cfg.memory?.backend).toBe("mongodb")
	})

	it("buildMdbrianConfig uses MDBRAIN_MONGODB_URI when it is set", () => {
		process.env = {
			...prev,
			MDBRAIN_MONGODB_URI: "mongodb://127.0.0.1:27017/x",
		}
		const cfg = buildMdbrianConfig(process.env)
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
			MDBRAIN_MONGODB_COLLECTION_PREFIX: "mdbrian_bench_",
		}
		const cfg = buildMdbrianConfig(process.env)
		expect(cfg.memory?.mongodb?.collectionPrefix).toBe("mdbrian_bench_")
	})

	it("buildMdbrianConfig merges URI from env", () => {
		process.env = {
			...prev,
			MDBRAIN_MONGODB_URI:
				"mongodb://127.0.0.1:27017/mdbrian?directConnection=true",
		}
		const cfg = buildMdbrianConfig(process.env)
		expect(cfg.memory?.backend).toBe("mongodb")
		expect(cfg.memory?.mongodb?.uri).toBe(
			"mongodb://127.0.0.1:27017/mdbrian?directConnection=true",
		)
		expect(cfg.agents?.defaults?.workspace).toBeTruthy()
	})

	it("reads optional mdbrian.json when present", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mdbrian-cfg-"))
		const cfgPath = path.join(dir, "mdbrian.json")
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
		const cfg = buildMdbrianConfig(process.env)
		expect(cfg.memory?.mongodb?.database).toBe("fromfile")
		expect(resolveMdbrianConfigFilePath(process.env)).toBe(cfgPath)
		fs.rmSync(dir, { recursive: true, force: true })
	})
})
