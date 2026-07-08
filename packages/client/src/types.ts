/**
 * Request shapes for the Mbrain HTTP API.
 * Runtime implementation lives in @mbrain/memory-bridge.
 */

export type MbrainContainerTag = string

export type MbrainAddInput = {
	content: string
	/** @deprecated Prefer `sessionId`. */
	containerTag?: MbrainContainerTag
	entityContext?: string
	customId?: string
	metadata?: Record<string, string | number | boolean | null>
	agentId?: string
	sessionId?: string
}

export type MbrainSearchInput = {
	query: string
	/** @deprecated Prefer `sessionKey`. */
	containerTag?: MbrainContainerTag
	limit?: number
	agentId?: string
	minScore?: number
	sessionKey?: string
}

export type SearchConfig = {
	recipe?: "fast" | "hybrid" | "deep" | "temporal" | "chain-of-thought"
	recallProfile?: "latency" | "balanced" | "proof"
	maxResults?: number
	searchMode?: "auto" | "direct" | "agentic"
	maxPasses?: number
	sourcePreference?: Array<
		| "reference"
		| "conversation"
		| "structured"
		| "procedural"
		| "episodic"
		| "graph"
	>
	timeRange?: { preset?: string; start?: string; end?: string }
	needExactEvidence?: boolean
	numCandidates?: number
	fusionMethod?: "scoreFusion" | "rankFusion" | "js-merge"
	hybridMode?: "hybrid" | "vector-only"
	allowHybridBackstop?: boolean
	lexicalPrefilter?: "disabled" | "experimental"
}

export type MbrainConversationRecallInput = {
	query?: string
	sessionId?: string
	roles?: Array<"user" | "assistant" | "system" | "tool">
	startTime?: string
	endTime?: string
	timezone?: string
	includeToolMessages?: boolean
	limit?: number
	agentId?: string
}

export type MbrainConversationImportInput = {
	datasetPath: string
	scope?: "session" | "user" | "agent" | "workspace" | "tenant" | "global"
	limitConversations?: number
	limitTurnsPerConversation?: number
	agentId?: string
}

export type MbrainSourceAgent = {
	id: string
	name: string
	runId?: string
}

export type MbrainActorRole = "user" | "assistant" | "system"
export type MbrainMemoryFeedbackSignal = "confirm" | "correct" | "irrelevant"

export type MbrainLifecycleFamily = "structured" | "procedure"
export type MbrainLifecycleState = "active" | "invalidated" | "conflicted"
export type MbrainLifecycleHistoryKind = "revision" | "current"

type MbrainStableHandleBase = {
	family: MbrainLifecycleFamily
	id: string
	agentId: string
	scope: "session" | "user" | "agent" | "workspace" | "tenant" | "global"
	scopeRef: string
	revision: number
	state: MbrainLifecycleState
	validFrom?: string
	validTo?: string
	updatedAt?: string
}

export type MbrainStructuredStableHandle = MbrainStableHandleBase & {
	family: "structured"
	structured: {
		type: string
		key: string
	}
}

export type MbrainProcedureStableHandle = MbrainStableHandleBase & {
	family: "procedure"
	procedure: {
		procedureId: string
	}
}

export type MbrainStableHandle =
	| MbrainStructuredStableHandle
	| MbrainProcedureStableHandle

export type MbrainLifecycleStructuredData = {
	type: string
	key: string
	value: string
	context?: string
	confidence?: number
	source?: string
	sessionId?: string
	tags?: string[]
	salience?: string
	temporalScope?: string
	provenance?: Record<string, unknown>
	sourceEventIds?: string[]
	sourceReliability?: number
	reinforcementCount?: number
	reviewAt?: string
	lastConfirmedAt?: string
	sourceAgent?: MbrainSourceAgent
	artifact?: Record<string, unknown>
}

export type MbrainLifecycleProcedureData = {
	procedureId: string
	name: string
	intentTags?: string[]
	triggerQueries?: string[]
	steps: string[]
	successSignals?: string[]
	confidence?: number
	provenance?: Record<string, unknown>
	sourceEventIds?: string[]
	successCount?: number
	failCount?: number
	lastSuccessAt?: string
	lastFailureAt?: string
	sourceAgent?: MbrainSourceAgent
}

export type MbrainLifecycleItem =
	| {
			family: "structured"
			handle: MbrainStructuredStableHandle
			data: MbrainLifecycleStructuredData
			createdAt?: string
			updatedAt?: string
	  }
	| {
			family: "procedure"
			handle: MbrainProcedureStableHandle
			data: MbrainLifecycleProcedureData
			createdAt?: string
			updatedAt?: string
	  }

export type MbrainLifecycleHistoryEntry = MbrainLifecycleItem & {
	historyKind: MbrainLifecycleHistoryKind
	supersededAt?: string
}

export type MbrainStructuredLifecyclePatch = Partial<
	Pick<
		MbrainLifecycleStructuredData,
		| "value"
		| "context"
		| "confidence"
		| "source"
		| "sessionId"
		| "tags"
		| "salience"
		| "temporalScope"
		| "provenance"
		| "sourceEventIds"
		| "sourceReliability"
		| "reviewAt"
		| "lastConfirmedAt"
		| "sourceAgent"
		| "artifact"
	> & { validTo: string }
>

export type MbrainProcedureLifecyclePatch = Partial<
	Pick<
		MbrainLifecycleProcedureData,
		| "name"
		| "intentTags"
		| "triggerQueries"
		| "steps"
		| "successSignals"
		| "confidence"
		| "provenance"
		| "sourceEventIds"
		| "sourceAgent"
	>
>

export type MbrainLifecycleGetInput = {
	handle: MbrainStableHandle
}

export type MbrainLifecycleUpdateInput =
	| {
			handle: MbrainStructuredStableHandle
			patch: MbrainStructuredLifecyclePatch
	  }
	| {
			handle: MbrainProcedureStableHandle
			patch: MbrainProcedureLifecyclePatch
	  }

export type MbrainLifecycleDeleteInput = {
	handle: MbrainStableHandle
	invalidatedBy?: Record<string, unknown>
}

export type MbrainLifecycleHistoryInput = {
	handle: MbrainStableHandle
	limit?: number
}

export type MbrainProcedureOutcomeInput = {
	handle: MbrainProcedureStableHandle
	success: boolean
	note?: string
	actorRole?: MbrainActorRole
}

export type MbrainMemoryFeedbackInput =
	| {
			handle: MbrainStructuredStableHandle
			signal: "confirm"
			note?: string
			actorRole?: MbrainActorRole
	  }
	| {
			handle: MbrainStructuredStableHandle
			signal: "correct"
			patch: MbrainStructuredLifecyclePatch
			note?: string
			actorRole?: MbrainActorRole
	  }
	| {
			handle: MbrainStructuredStableHandle
			signal: "irrelevant"
			note?: string
			actorRole?: MbrainActorRole
			invalidatedBy?: Record<string, unknown>
	  }

export type MbrainProfileInput = {
	/** @deprecated Prefer `scopeRef`. */
	containerTag?: MbrainContainerTag
	agentId?: string
	scope?: "session" | "user" | "agent" | "workspace" | "tenant" | "global"
	scopeRef?: string
	maxEntities?: number
	maxEpisodes?: number
}

export type MbrainActiveSlateInput = {
	agentId?: string
	scope?: "session" | "user" | "agent" | "workspace" | "tenant" | "global"
	scopeRef?: string
	maxItems?: number
}

export type MbrainDiscoveryProjectionInput = {
	agentId?: string
	kind: "entity-brief" | "topic-brief" | "what-changed" | "contradiction-report"
	query?: string
	scope?: "session" | "user" | "agent" | "workspace" | "tenant" | "global"
	scopeRef?: string
	maxItems?: number
	timeRange?: { preset?: string; start?: string; end?: string }
}

export type MbrainTraceChainInput = {
	factId: string
	collection: string
	agentId?: string
	maxDepth?: number
}

export type MbrainScanNoveltyInput = {
	agentId?: string
	limit?: number
	scope?: string
}

export type MbrainConsolidateInput = {
	agentId?: string
	maxEvents?: number
	minCombinedScore?: number
	scope?: string
}

export type MbrainSelfEditInput = {
	block: "user" | "persona" | "instructions"
	action: "append" | "replace" | "prepend"
	content: string
	agentId?: string
}

export type MbrainSelfEditResponse = {
	upserted: boolean
	id: string
}

export type MbrainExtractInput = {
	eventId: string
	agentId?: string
}

export type MbrainExtractResponse = {
	ok: true
	jobId: string
	scheduled: boolean
}

// ---------------------------------------------------------------------------
// Response types for typed client methods (JSON wire format — dates as strings)
// ---------------------------------------------------------------------------

export type MbrainReadFileResponse = {
	text: string
	path: string
	locator?: string
	source?: string
	sourceType?: string
	title?: string
	key?: string
	type?: string
	error?: string
	disabled?: boolean
}

export type MbrainStatusResponse = {
	backend: "mongodb"
	provider: string
	model?: string
	requestedProvider?: string
	files?: number
	chunks?: number
	dirty?: boolean
	workspaceDir?: string
	sources?: string[]
	sourceCounts?: Array<{ source: string; files: number; chunks: number }>
	cache?: { enabled: boolean; entries?: number; maxEntries?: number }
	fts?: { enabled: boolean; available: boolean; error?: string }
	vector?: {
		enabled: boolean
		available?: boolean
		loadError?: string
		dims?: number
	}
	batch?: {
		enabled: boolean
		failures: number
		limit: number
		wait: boolean
		concurrency: number
		pollIntervalMs: number
		timeoutMs: number
		lastError?: string
		lastProvider?: string
	}
	custom?: Record<string, unknown>
}

export type MbrainConversationRecallCitation = {
	eventId: string
	sessionId?: string
	role: "user" | "assistant" | "system" | "tool"
	timestamp: string
	sourceRef?: string
	preview: string
}

export type MbrainConversationRecallResult = {
	citation: MbrainConversationRecallCitation
	score?: number
	matchType: "filter" | "semantic" | "hybrid"
}

export type MbrainConversationRecallResponse = {
	results: MbrainConversationRecallResult[]
	metadata: {
		totalMatched: number
		queryUsed?: string
		filtersApplied: string[]
		searchMethod: "standard" | "semantic" | "hybrid"
		durationMs: number
	}
}

export type MbrainDetailedStatusResponse = {
	events: { count: number; latestTimestamp?: string }
	entities: { count: number }
	relations: { count: number }
	episodes: { count: number; latestTimestamp?: string }
	procedures: { count: number; latestTimestamp?: string }
	projectionLag: Record<string, number | null>
	projectionHealth: Record<
		string,
		| "ok"
		| "projection-behind"
		| "derived-product-unavailable"
		| "health-uncertain"
	>
	laneCoverage: Record<
		string,
		{ hasData: boolean; count: number; lastUpdated: string | null }
	>
	health: {
		overall: "ok" | "degraded" | "health-uncertain"
		retrieval: "ok" | "retrieval-degraded" | "health-uncertain"
		recentNoRelevantResults: boolean
		canonicalIngest: "ok" | "canonical-ingest-failed" | "health-uncertain"
		derivedProducts: Record<
			string,
			| "ok"
			| "projection-behind"
			| "derived-product-unavailable"
			| "health-uncertain"
		>
		diagnostics: string[]
	}
}

export type MbrainStatsResponse = {
	sources: Array<{ source: string; files: number; chunks: number }>
	totalFiles: number
	totalChunks: number
	embeddingCoverage: Record<string, number>
	embeddingStatusCoverage: Record<string, number>
	cachedEmbeddings: number
	staleFiles: string[]
	collectionSizes: { files: number; chunks: number; embeddingCache: number }
	indexStats: Array<{
		name: string
		collection: string
		size: number
		accesses: number
	}>
}

export type MbrainProbeEmbeddingResponse = {
	ok: boolean
	error?: string
}

export type MbrainProfileResponse = {
	agentId: string
	scope: string
	scopeRef: string
	preferences: Array<{
		key: string
		value: string
		salience: string
		updatedAt: string
	}>
	decisions: Array<{
		key: string
		value: string
		salience: string
		updatedAt: string
	}>
	facts: Array<{
		key: string
		value: string
		salience: string
		updatedAt: string
	}>
	todos: Array<{
		key: string
		value: string
		salience: string
		updatedAt: string
	}>
	topEntities: Array<{ name: string; type: string; relationCount: number }>
	recentEpisodes: Array<{
		title: string
		summary: string
		type: string
		timeRange: { start: string; end: string }
	}>
	activityPatterns: {
		roleDistribution: Record<string, number>
		totalEvents: number
		lastActive: string | null
	}
	synthesizedAt: string
}

export type MbrainRelevanceExplainResponse = {
	runId?: string
	latencyMs: number
	sourceScope: string
	health: "ok" | "degraded" | "insufficient-data"
	fallbackPath?: string
	sampleRate: number
	artifacts: Array<{
		artifactType: string
		summary: Record<string, unknown>
		rawExplain?: unknown
		compression?: "none"
	}>
	results: Array<Record<string, unknown>>
}

export type MbrainBenchmarkBuildIdentity = {
	source: "env" | "unknown"
	commitSha?: string
	buildId?: string
	buildLabel?: string
}

export type MbrainBenchmarkReleaseGate = {
	gate:
		| "official-retrieval"
		| "internal-retrieval"
		| "conversation-recall-regression"
		| "query-governance"
	status: "passed" | "warning" | "not-run" | "advisory-only"
	evidence: string
}

export type MbrainBenchmarkRunReport = {
	generatedAt: string
	build: MbrainBenchmarkBuildIdentity
	corpus: {
		datasetVersion: string
		datasetName?: string
		datasetKind?: "generic" | "longmemeval" | "locomo" | "legacy-query"
		scenarios?: number
		cases: number
		scoredCases?: number
		skippedCases?: number
	}
	metrics: {
		internal: {
			hitRate: number
			emptyRate: number
			avgTopScore: number
			p95LatencyMs: number
			rAt5?: number
			rAt10?: number
			ndcgAt10?: number
		}
		official?: {
			longMemEval?: {
				retrievalCases: number
				abstentionCases: number
				session: MbrainBenchmarkOfficialRetrievalMetrics
				turn?: MbrainBenchmarkOfficialRetrievalMetrics
			}
			loCoMo?: {
				qaCases: number
				abstentionCases: number
				sessionEvidenceRecallAt5: number
				sessionEvidenceRecallAt10: number
				dialogEvidenceRecallAt5?: number
				dialogEvidenceRecallAt10?: number
			}
		}
	}
	releaseGates: MbrainBenchmarkReleaseGate[]
	warnings: string[]
	degradations: string[]
}

export type MbrainRelevanceBenchmarkResponse = {
	datasetVersion: string
	datasetName?: string
	datasetKind?: "generic" | "longmemeval" | "locomo" | "legacy-query"
	scenarios?: number
	cases: number
	scoredCases?: number
	skippedCases?: number
	hitRate: number
	emptyRate: number
	avgTopScore: number
	p95LatencyMs: number
	rAt5?: number
	rAt10?: number
	ndcgAt10?: number
	questionTypeBreakdown?: Array<{
		questionType: string
		cases: number
		scoredCases: number
		hitRate: number
		rAt5: number
		rAt10: number
		ndcgAt10: number
	}>
	officialMetrics?: {
		longMemEval?: {
			retrievalCases: number
			abstentionCases: number
			session: MbrainBenchmarkOfficialRetrievalMetrics
			turn?: MbrainBenchmarkOfficialRetrievalMetrics
		}
		loCoMo?: {
			qaCases: number
			abstentionCases: number
			sessionEvidenceRecallAt5: number
			sessionEvidenceRecallAt10: number
			dialogEvidenceRecallAt5?: number
			dialogEvidenceRecallAt10?: number
		}
	}
	ingest?: {
		conversationsIngested: number
		turnsIngested: number
		skippedConversations: number
		failedLines: number
		failedTurns: number
	}
	regressions: Array<{
		metricName: string
		baseline: number
		current: number
		delta: number
		severity: "low" | "medium" | "high"
	}>
	queryGovernance?: {
		status: "advisory-only"
		generatedAt: string
		candidates: Array<{
			candidateId: string
			source: "benchmark" | "operator-trace"
			queryShapeFamily: "search-detailed"
			recipe?: "fast" | "hybrid" | "deep" | "temporal" | "chain-of-thought"
			scope: "cluster"
			reason: string
			evidence: {
				datasetName?: string
				datasetKind?: "generic" | "longmemeval" | "locomo" | "legacy-query"
				cases: number
				hitRate: number
				p95LatencyMs: number
				rAt5?: number
				ndcgAt10?: number
			}
			recommendedAction: "inspect-query-stats" | "consider-setQuerySettings"
			rollbackNote: string
		}>
		notes: string[]
	}
	benchmarkReport?: MbrainBenchmarkRunReport
}

export type MbrainBenchmarkOfficialRetrievalMetrics = {
	recallAnyAt1: number
	recallAllAt1: number
	ndcgAnyAt1: number
	recallAnyAt3: number
	recallAllAt3: number
	ndcgAnyAt3: number
	recallAnyAt5: number
	recallAllAt5: number
	ndcgAnyAt5: number
	recallAnyAt10: number
	recallAllAt10: number
	ndcgAnyAt10: number
	recallAnyAt30: number
	recallAllAt30: number
	ndcgAnyAt30: number
	recallAnyAt50: number
	recallAllAt50: number
	ndcgAnyAt50: number
}

export type MbrainRelevanceReportResponse = {
	health: "ok" | "degraded" | "insufficient-data"
	runs: number
	sampledRuns: number
	emptyRate: number
	avgTopScore: number
	fallbackRate: number
	lastRegressionAt?: string
	profileCapabilities: {
		textExplain: boolean
		vectorExplain: boolean
		fusionExplain: boolean
	}
}

export type MbrainRelevanceSampleRateResponse = {
	enabled: boolean
	current: number
	base: number
	max: number
	windowSize: number
	degradedSignals: number
}

export type MbrainBenchmarkIngestResponse = {
	datasetPath: string
	datasetName?: string
	conversationsIngested: number
	turnsIngested: number
	skippedConversations: number
	failedLines: number
	failedTurns: number
	startedAt: string
	completedAt: string
}

export type MbrainConversationImportResponse = {
	datasetPath: string
	datasetName?: string
	datasetKind?: "generic" | "longmemeval" | "locomo"
	conversationsImported: number
	turnsImported: number
	skippedConversations: number
	failedLines: number
	failedTurns: number
	startedAt: string
	completedAt: string
}

export type MbrainAccessTrendResponse = Array<{
	collection: string
	memoryId: string
	day: string
	count: number
	rolling7dCount: number
	lastAccessedAt?: string
}>

export type MbrainAccessSummaryResponse = Array<{
	collection: string
	memoryId: string
	accessCount: number
	lastAccessedAt?: string
}>

export type MbrainTraceChainResponse = {
	factId: string
	collection: string
	nodes: Array<{
		type: "event" | "fact" | "gap"
		id: string
		collection: string
		body?: string
		role?: string
		timestamp?: string
		depth: number
		reason?: string
	}>
	chainComplete: boolean
	maxDepthReached: boolean
	agentId: string
}

export type MbrainNoveltyResponse = {
	events: Array<{
		eventId: string
		body: string
		noveltyScore: number
		timestamp: string
		role: string
		nearestNeighborDistance: number
	}>
	scannedCount: number
	error?: string
	agentId: string
}

export type MbrainConsolidateResponse = {
	runId: string
	agentId: string
	eventsProcessed: number
	factsPromoted: number
	factsPruned: number
	conflictsResolved: number
	durationMs: number
	candidates: Array<{
		eventId: string
		body: string
		timestamp: string
		noveltyScore: number
		importanceDecay: number
		accessCount: number
		combinedScore: number
	}>
	orientStats?: {
		unprocessedCount: number
		byRole: Array<{ role: string; count: number }>
		topScopes: Array<{ scope: string; lastActivity: string }>
	}
	prunedCount?: number
}

export type MbrainRecallTrace = {
	traceId: string
	agentId: string
	query: string
	timestamp: string
	lanesUsed?: string[]
	lanesSkipped?: string[]
	totalHits?: number
	latencyMs?: number
	hitsByLane?: Record<string, number>
	topHitIds?: string[]
	tokenBudgetUsed?: number
	bundleMode?: "full" | "wake-up"
}

export type MbrainMemoryJobStatus =
	| "pending"
	| "running"
	| "completed"
	| "failed"
	| "cancelled"

export type MbrainMemoryJobType =
	| "consolidation"
	| "extraction"
	| "import"
	| "materialization"
	| "enrichment"

export type MbrainMemoryJob = {
	jobId: string
	jobType: MbrainMemoryJobType
	agentId: string
	status: MbrainMemoryJobStatus
	createdAt: string
	startedAt?: string
	completedAt?: string
	error?: string
	inputCount?: number
	outputCount?: number
	durationMs?: number
	metadata?: Record<string, unknown>
}

export type MbrainSearchKBResponse = {
	results: Array<{
		path: string
		startLine: number
		endLine: number
		score: number
		snippet: string
		source: string
		canonicalId?: string
		timestamp?: string
		scope?: string
		scopeRef?: string
	}>
}

export type MbrainSearchResponse = {
	results: Array<{
		path: string
		startLine: number
		endLine: number
		score: number
		snippet: string
		source: string
		canonicalId?: string
		sessionId?: string
		timestamp?: string
		scope?: string
		scopeRef?: string
	}>
}

export type MbrainContextBundleInput = {
	agentId?: string
	query?: string
	scope?: "session" | "user" | "agent" | "workspace" | "tenant" | "global"
	scopeRef?: string
	sessionId?: string
	tokenBudget?: number
	maxActiveItems?: number
	maxEvidenceItems?: number
	maxRecentEvents?: number
	includeDiscoveryProjection?: boolean
	discoveryKind?:
		| "entity-brief"
		| "topic-brief"
		| "what-changed"
		| "contradiction-report"
	includeProfile?: boolean
	timeRange?: { preset?: string; start?: string; end?: string }
	/** "wake-up" returns a compact 250-token projection for session start. Default: "full". */
	mode?: "full" | "wake-up"
}
