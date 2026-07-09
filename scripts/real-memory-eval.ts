import { randomUUID } from "node:crypto"
import { MdbrianClient } from "@mdbrian/client"

import { runMemoryEvalSuite } from "./memory-eval-core.js"
import { writeProofArtifact } from "./proof-artifacts.js"

const baseUrl = (
	process.env.MDBRAIN_API_URL?.trim() ?? "http://127.0.0.1:3847"
).replace(/\/$/, "")
const apiKey = process.env.MDBRAIN_API_KEY?.trim() || undefined
const label = process.env.MDBRAIN_EVAL_LABEL?.trim() ?? "candidate"
const seed =
	process.env.MDBRAIN_EVAL_SEED?.trim() ?? `eval-${randomUUID().slice(0, 8)}`

async function main() {
	const client = new MdbrianClient({
		baseUrl,
		apiKey,
		maxRetries: 2,
	})

	const report = await runMemoryEvalSuite({
		client,
		label,
		seed,
	})
	const artifactPath = await writeProofArtifact({
		suite: "real-memory-eval",
		payload: report,
	})

	console.log(
		JSON.stringify(
			artifactPath ? { ...report, artifactPath } : report,
			null,
			2,
		),
	)
}

await main()
