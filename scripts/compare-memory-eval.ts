import { randomUUID } from "node:crypto"
import { MdbrainClient } from "@mdbrain/client"

import { compareEvalRuns, runMemoryEvalSuite } from "./memory-eval-core.js"
import { writeProofArtifact } from "./proof-artifacts.js"

function readBaseUrl(name: string, fallback?: string): string {
	const value = process.env[name]?.trim() || fallback
	if (!value) {
		throw new Error(`${name} is required`)
	}
	return value.replace(/\/$/, "")
}

async function main() {
	const seed =
		process.env.MDBRAIN_EVAL_SEED?.trim() ??
		`compare-${randomUUID().slice(0, 8)}`
	const baselineClient = new MdbrainClient({
		baseUrl: readBaseUrl(
			"MDBRAIN_BASELINE_API_URL",
			process.env.MDBRAIN_API_URL,
		),
		apiKey: process.env.MDBRAIN_BASELINE_API_KEY?.trim() || undefined,
		maxRetries: 2,
	})
	const candidateClient = new MdbrainClient({
		baseUrl: readBaseUrl(
			"MDBRAIN_CANDIDATE_API_URL",
			process.env.MDBRAIN_API_URL,
		),
		apiKey:
			process.env.MDBRAIN_CANDIDATE_API_KEY?.trim() ||
			process.env.MDBRAIN_API_KEY?.trim() ||
			undefined,
		maxRetries: 2,
	})

	const baseline = await runMemoryEvalSuite({
		client: baselineClient,
		label: "baseline",
		seed: `${seed}-baseline`,
	})
	const candidate = await runMemoryEvalSuite({
		client: candidateClient,
		label: "candidate",
		seed: `${seed}-candidate`,
	})

	const comparison = compareEvalRuns({
		baseline: baseline.summary,
		candidate: candidate.summary,
	})
	const report = {
		baseline,
		candidate,
		comparison,
	}
	const artifactPath = await writeProofArtifact({
		suite: "compare-memory-eval",
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
