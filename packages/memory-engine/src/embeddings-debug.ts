import { isTruthyEnvValue, createSubsystemLogger } from "@mdbrain/lib"

const debugEmbeddings = isTruthyEnvValue(process.env.MDBRAIN_DEBUG_EMBEDDINGS)
const log = createSubsystemLogger("memory/embeddings")

export function debugEmbeddingsLog(
	message: string,
	meta?: Record<string, unknown>,
): void {
	if (!debugEmbeddings) {
		return
	}
	const suffix = meta ? ` ${JSON.stringify(meta)}` : ""
	log.raw(`${message}${suffix}`)
}
