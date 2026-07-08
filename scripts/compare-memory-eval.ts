import { randomUUID } from "node:crypto"
import { MbrainClient } from "@mbrain/client"

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
		process.env.MBRAIN_EVAL_SEED?.trim() ??
		`compare-${randomUUID().slice(0, 8)}`
	const baselineClient = new MbrainClient({
		baseUrl: readBaseUrl("MBRAIN_BASELINE_API_URL", process.env.MBRAIN_API_URL),
		apiKey: process.env.MBRAIN_BASELINE_API_KEY?.trim() || undefined,
		maxRetries: 2,
	})
	const candidateClient = new MbrainClient({
		baseUrl: readBaseUrl(
			"MBRAIN_CANDIDATE_API_URL",
			process.env.MBRAIN_API_URL,
		),
		apiKey:
			process.env.MBRAIN_CANDIDATE_API_KEY?.trim() ||
			process.env.MBRAIN_API_KEY?.trim() ||
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
