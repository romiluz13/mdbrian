import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
	buildMbrainConfig,
	resolveMbrainConfigFilePath,
	resolveMbrainStandaloneWorkspaceDir,
	resolveBridgeConfig,
} from "./memory-config.js"

describe("memory-config standalone", () => {
	const prev = { ...process.env }

	afterEach(() => {
		process.env = { ...prev }
	})

	it("uses ~/.mbrain/workspace when MBRAIN_WORKSPACE_DIR is unset", () => {
		const ws = resolveMbrainStandaloneWorkspaceDir({})
		expect(ws).toBe(path.join(os.homedir(), ".mbrain", "workspace"))
	})

	it("respects MBRAIN_WORKSPACE_DIR", () => {
		const dir = resolveMbrainStandaloneWorkspaceDir({
			MBRAIN_WORKSPACE_DIR: "/tmp/mws",
		})
		expect(dir).toBe("/tmp/mws")
	})

	it("buildMbrainConfig preserves the mongodb backend by default", () => {
		process.env = { ...prev, MBRAIN_STANDALONE: "1" }
		const cfg = buildMbrainConfig(process.env)
		expect(cfg.memory?.backend).toBe("mongodb")
	})

	it("buildMbrainConfig uses MBRAIN_MONGODB_URI when it is set", () => {
		process.env = {
			...prev,
			MBRAIN_MONGODB_URI: "mongodb://127.0.0.1:27017/x",
		}
		const cfg = buildMbrainConfig(process.env)
		expect(cfg.memory?.mongodb?.uri).toBe("mongodb://127.0.0.1:27017/x")
	})

	it("resolveBridgeConfig reads from process.env", () => {
		process.env = {
			...prev,
			MBRAIN_MONGODB_URI: "mongodb://127.0.0.1:27017/bridge",
		}
		const cfg = resolveBridgeConfig()
		expect(cfg.memory?.mongodb?.uri).toBe("mongodb://127.0.0.1:27017/bridge")
	})

	it("reads collection prefix from process.env", () => {
		process.env = {
			...prev,
			MBRAIN_MONGODB_URI: "mongodb://127.0.0.1:27017/bridge",
			MBRAIN_MONGODB_COLLECTION_PREFIX: "mbrain_bench_",
		}
		const cfg = buildMbrainConfig(process.env)
		expect(cfg.memory?.mongodb?.collectionPrefix).toBe("mbrain_bench_")
	})

	it("buildMbrainConfig merges URI from env", () => {
		process.env = {
			...prev,
			MBRAIN_MONGODB_URI:
				"mongodb://127.0.0.1:27017/mbrain?directConnection=true",
		}
		const cfg = buildMbrainConfig(process.env)
		expect(cfg.memory?.backend).toBe("mongodb")
		expect(cfg.memory?.mongodb?.uri).toBe(
			"mongodb://127.0.0.1:27017/mbrain?directConnection=true",
		)
		expect(cfg.agents?.defaults?.workspace).toBeTruthy()
	})

	it("reads optional mbrain.json when present", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mbrain-cfg-"))
		const cfgPath = path.join(dir, "mbrain.json")
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
			MBRAIN_CONFIG_PATH: cfgPath,
			MBRAIN_MONGODB_URI: "mongodb://h/",
		}
		const cfg = buildMbrainConfig(process.env)
		expect(cfg.memory?.mongodb?.database).toBe("fromfile")
		expect(resolveMbrainConfigFilePath(process.env)).toBe(cfgPath)
		fs.rmSync(dir, { recursive: true, force: true })
	})
})
