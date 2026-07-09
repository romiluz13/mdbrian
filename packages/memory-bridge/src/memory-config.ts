import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { MemoryConfig, MdbrianConfig } from "@mdbrian/lib"

export const MDBRAIN_CONFIG_FILENAME = path.join(".mdbrian", "mdbrian.json")

export function resolveMdbrianStandaloneWorkspaceDir(
	env: NodeJS.ProcessEnv = process.env,
): string {
	const explicit = env.MDBRAIN_WORKSPACE_DIR?.trim()
	if (explicit) {
		return path.resolve(explicit)
	}
	return path.join(os.homedir(), ".mdbrian", "workspace")
}

export function resolveMdbrianConfigFilePath(
	env: NodeJS.ProcessEnv = process.env,
): string {
	const fromEnv = env.MDBRAIN_CONFIG_PATH?.trim()
	if (fromEnv) {
		return path.resolve(fromEnv)
	}
	return path.join(os.homedir(), MDBRAIN_CONFIG_FILENAME)
}

function readMdbrianJsonFile(
	filePath: string,
): { memory?: MemoryConfig; agents?: MdbrianConfig["agents"] } | undefined {
	try {
		if (!fs.existsSync(filePath)) {
			return undefined
		}
		const raw = fs.readFileSync(filePath, "utf-8")
		const parsed = JSON.parse(raw) as unknown
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return undefined
		}
		return parsed as { memory?: MemoryConfig; agents?: MdbrianConfig["agents"] }
	} catch {
		return undefined
	}
}

export function buildMdbrianConfig(
	env: NodeJS.ProcessEnv = process.env,
): MdbrianConfig {
	const filePath = resolveMdbrianConfigFilePath(env)
	const fromFile = readMdbrianJsonFile(filePath)

	const uriFromEnv =
		env.MDBRAIN_MONGODB_URI?.trim() || env.MDBRAIN_FORCE_MONGODB_URI?.trim()
	const uriFromFile = fromFile?.memory?.mongodb?.uri?.trim()
	const uri = uriFromEnv || uriFromFile
	const collectionPrefixFromEnv = env.MDBRAIN_MONGODB_COLLECTION_PREFIX?.trim()

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

	const workspace = resolveMdbrianStandaloneWorkspaceDir(env)

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

export function resolveBridgeConfig(): MdbrianConfig {
	return buildMdbrianConfig()
}
