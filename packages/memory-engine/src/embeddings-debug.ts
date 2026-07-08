import { isTruthyEnvValue, createSubsystemLogger } from "@mbrain/lib"

const debugEmbeddings = isTruthyEnvValue(process.env.MBRAIN_DEBUG_EMBEDDINGS)
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
