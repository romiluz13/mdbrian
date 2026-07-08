import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { MemoryConfig, MbrainConfig } from "@mbrain/lib"

export const MBRAIN_CONFIG_FILENAME = path.join(".mbrain", "mbrain.json")

export function resolveMbrainStandaloneWorkspaceDir(
	env: NodeJS.ProcessEnv = process.env,
): string {
	const explicit = env.MBRAIN_WORKSPACE_DIR?.trim()
	if (explicit) {
		return path.resolve(explicit)
	}
	return path.join(os.homedir(), ".mbrain", "workspace")
}

export function resolveMbrainConfigFilePath(
	env: NodeJS.ProcessEnv = process.env,
): string {
	const fromEnv = env.MBRAIN_CONFIG_PATH?.trim()
	if (fromEnv) {
		return path.resolve(fromEnv)
	}
	return path.join(os.homedir(), MBRAIN_CONFIG_FILENAME)
}

function readMbrainJsonFile(
	filePath: string,
): { memory?: MemoryConfig; agents?: MbrainConfig["agents"] } | undefined {
	try {
		if (!fs.existsSync(filePath)) {
			return undefined
		}
		const raw = fs.readFileSync(filePath, "utf-8")
		const parsed = JSON.parse(raw) as unknown
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return undefined
		}
		return parsed as { memory?: MemoryConfig; agents?: MbrainConfig["agents"] }
	} catch {
		return undefined
	}
}

export function buildMbrainConfig(
	env: NodeJS.ProcessEnv = process.env,
): MbrainConfig {
	const filePath = resolveMbrainConfigFilePath(env)
	const fromFile = readMbrainJsonFile(filePath)

	const uriFromEnv =
		env.MBRAIN_MONGODB_URI?.trim() || env.MBRAIN_FORCE_MONGODB_URI?.trim()
	const uriFromFile = fromFile?.memory?.mongodb?.uri?.trim()
	const uri = uriFromEnv || uriFromFile
	const collectionPrefixFromEnv = env.MBRAIN_MONGODB_COLLECTION_PREFIX?.trim()

	const mergedMongo: MemoryConfig["mongodb"] = {
		...fromFile?.memory?.mongodb,
		...(uri ? { uri } : {}),
		...(collectionPrefixFromEnv
			? { collectionPrefix: collectionPrefixFromEnv }
			: {}),
	}

	const memory: MemoryConfig = {
		backend: "mongodb",
		citations: fromFile?.memory?.citations ?? "auto",
		sources: fromFile?.memory?.sources,
		mongodb: mergedMongo,
	}

	const workspace = resolveMbrainStandaloneWorkspaceDir(env)

	return {
		memory,
		agents: {
			...fromFile?.agents,
			defaults: {
				...fromFile?.agents?.defaults,
				workspace,
			},
		},
	}
}

export function resolveBridgeConfig(): MbrainConfig {
	return buildMbrainConfig()
}
