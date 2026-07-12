import type { MemoryConfig } from "./types.memory.js"

/** Minimal Mdbrain config -- standalone version of the config surface used by the memory engine. */
export type MdbrainConfig = {
	memory?: MemoryConfig
	models?: {
		providers?: Record<
			string,
			{
				apiKey?: SecretInput
				baseUrl?: string
				headers?: Record<string, string>
			}
		>
		[key: string]: unknown
	}
	agents?: {
		defaults?: {
			workspace?: string
			model?: string
		}
		[key: string]: unknown
	}
	[key: string]: unknown
}

/** Opaque secret that may be a plain string or a { secretRef } pointer. */
export type SecretInput = string | { secretRef: string }
