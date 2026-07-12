/**
 * Stable entry for the Mdbrain HTTP product layer: loads standalone config and
 * delegates to the MongoDB memory manager.
 */
import { createSubsystemLogger } from "@mdbrain/lib"
import type { MemoryScope } from "@mdbrain/lib/types/memory"
import type {
	ConversationRecallResponse,
	MemoryProviderStatus,
	MemoryJob,
	MemoryJobStatus,
	MemoryJobType,
	MemoryAccessSummary,
	MemoryAccessTrend,
	MemoryBenchmarkIngestResult,
	MemoryConversationImportResult,
	MemoryFeedbackSignal,
	AccessEventCollection,
	MemoryActorRole,
	RecallTrace,
	MemoryStateFamily,
	MemoryStats,
	MemoryLifecycleHistoryEntry,
	MemoryLifecycleItem,
	MemoryStableHandle,
	MongoDBMemoryManager,
	ProcedureLifecyclePatch,
	ProcedureEntry,
	RelevanceBenchmarkResult,
	RelevanceExplainResult,
	RelevanceReport,
	RelevanceSampleState,
	RelevanceSourceScope,
	StructuredMemoryLifecyclePatch,
	StructuredMemoryEntry,
	V2Status,
} from "@mdbrain/memory-engine"
import {
	closeAllMemorySearchManagers,
	getMemorySearchManager,
	materializeBlocks,
} from "@mdbrain/memory-engine"
import { resolveBridgeConfig } from "./memory-config.js"

/**
 * Graceful shutdown: Graceful bridge shutdown.
 * Closes every cached MongoDB memory manager, which in turn flushes the
 * access tracker and closes the Mongo client. Swallows errors per-manager
 * via `closeAllMemorySearchManagers` so one failing manager does not block
 * the rest.
 */
export async function mdbrainBridgeShutdown(): Promise<void> {
	await closeAllMemorySearchManagers()
}

type MdbrainBridgeActiveSlate = {
	agentId: string
	scope: MemoryScope
	scopeRef: string
	items: Array<{
		kind: string
		source: string
		title: string
		summary: string
		path: string
		canonicalId?: string
		timestamp?: Date
		scope?: MemoryScope
		scopeRef?: string
		state?: string
		salience?: string
		provenance?: Record<string, unknown>
		sourceEventIds?: string[]
	}>
	metadata: {
		maxItems: number
		truncated: boolean
		partial: boolean
		countsByKind: Record<string, number>
		sourceCounts: Record<string, number>
	}
	hydratedAt: Date
}

type MdbrainBridgeDiscoveryProjection = {
	kind: "entity-brief" | "topic-brief" | "what-changed" | "contradiction-report"
	query?: string
	title: string
	summary: string
	scope: MemoryScope
	scopeRef: string
	sections: Array<{
		title: string
		summary: string
		evidence: Array<{
			title: string
			summary: string
			path: string
			source: string
			canonicalId?: string
			timestamp?: Date
			scope?: MemoryScope
			scopeRef?: string
			sourceEventIds?: string[]
		}>
	}>
	metadata: {
		partial: boolean
		evidenceCount: number
		sourceCounts: Record<string, number>
		timeRange?: {
			label: string
			start: Date
			end: Date
		}
	}
	builtAt: Date
}

type MdbrainBridgeContextBundle = {
	agentId: string
	query?: string
	scope: MemoryScope
	scopeRef: string
	sessionId?: string
	rendered: string
	sections: Array<{
		kind:
			| "active-slate"
			| "query-evidence"
			| "summary"
			| "recent-events"
			| "discovery-projection"
			| "profile"
		title: string
		summary?: string
		items: Array<{
			title: string
			summary: string
			path?: string
			source?: string
			canonicalId?: string
			timestamp?: Date
			scope?: MemoryScope
			scopeRef?: string
			sourceEventIds?: string[]
			trust?: {
				score: number
				confidence: "high" | "medium" | "low"
				exactness: "exact-id" | "exact-locator" | "approximate"
				freshness: "fresh" | "aging" | "stale" | "timeless" | "unknown"
				contradiction: "none" | "conflicted" | "invalidated"
				scopeMatch: "exact" | "partial" | "unknown" | "mismatch"
				provenance: "dense" | "partial" | "sparse" | "none"
				sourceDiversity: "single" | "multi"
				factors: string[]
			}
			metadata?: Record<string, unknown>
		}>
		estimatedTokens: number
		truncated: boolean
		partial: boolean
	}>
	metadata: {
		tokenBudget: number
		estimatedTokensUsed: number
		partial: boolean
		truncated: boolean
		pathsExecuted: string[]
		trustSummary?: {
			topScore: number | null
			topConfidence: "high" | "medium" | "low" | null
			averageScore: number | null
			distribution: Record<"high" | "medium" | "low", number>
			contradictionCount: number
			staleCount: number
			exactCount: number
			sourceDiversity: "single" | "multi" | "none"
		}
		sectionsIncluded: Array<
			| "active-slate"
			| "query-evidence"
			| "summary"
			| "recent-events"
			| "discovery-projection"
			| "profile"
		>
	}
	builtAt: Date
}

type ActiveSlateCapableManager = MongoDBMemoryManager & {
	hydrateActiveSlate?: (params?: {
		scope?: MemoryScope
		scopeRef?: string
		maxItems?: number
	}) => Promise<MdbrainBridgeActiveSlate>
}

type DiscoveryProjectionCapableManager = MongoDBMemoryManager & {
	buildDiscoveryProjection?: (params: {
		kind:
			| "entity-brief"
			| "topic-brief"
			| "what-changed"
			| "contradiction-report"
		query?: string
		scope?: MemoryScope
		scopeRef?: string
		maxItems?: number
		timeRange?: {
			preset?: string
			start?: string
			end?: string
		}
	}) => Promise<MdbrainBridgeDiscoveryProjection>
}

type ContextBundleCapableManager = MongoDBMemoryManager & {
	buildContextBundle?: (params?: {
		query?: string
		scope?: MemoryScope
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
		timeRange?: {
			preset?: string
			start?: string
			end?: string
		}
		mode?: "full" | "wake-up"
	}) => Promise<MdbrainBridgeContextBundle>
}

type ConversationRecallCapableManager = MongoDBMemoryManager & {
	recallConversation?: (params: {
		query?: string
		sessionId?: string
		roles?: Array<"user" | "assistant" | "system" | "tool">
		startTime?: string
		endTime?: string
		timezone?: string
		includeToolMessages?: boolean
		limit?: number
	}) => Promise<ConversationRecallResponse>
}

type ChainCapableManager = MongoDBMemoryManager & {
	traceChain?: (params: {
		factId: string
		collection: string
		options?: { maxDepth?: number }
	}) => Promise<unknown>
}

type NoveltyCapableManager = MongoDBMemoryManager & {
	scanNovelty?: (params?: {
		limit?: number
		scope?: string
	}) => Promise<unknown>
}

type ConsolidateCapableManager = MongoDBMemoryManager & {
	consolidate?: (params?: {
		maxEvents?: number
		minCombinedScore?: number
		scope?: string
	}) => Promise<unknown>
}

type SelfEditCapableManager = MongoDBMemoryManager & {
	selfEditBlock?: (params: {
		block: "user" | "persona" | "instructions"
		action: "append" | "replace" | "prepend"
		content: string
	}) => Promise<{ upserted: boolean; id: string }>
}

type RecallTraceCapableManager = MongoDBMemoryManager & {
	listRecallTraces?: (params?: { limit?: number }) => Promise<RecallTrace[]>
	getRecallTrace?: (params: { traceId: string }) => Promise<RecallTrace | null>
}

type MemoryJobsCapableManager = MongoDBMemoryManager & {
	listMemoryJobs?: (params?: {
		status?: MemoryJobStatus
		limit?: number
		jobType?: MemoryJobType
	}) => Promise<MemoryJob[]>
	getMemoryJob?: (params: { jobId: string }) => Promise<MemoryJob | null>
}

type ExtractionCapableManager = MongoDBMemoryManager & {
	extractEvent?: (params: {
		eventId: string
	}) => Promise<{ jobId: string; scheduled: boolean }>
}

type LifecycleCapableManager = MongoDBMemoryManager & {
	getLifecycleItem?: (
		handle: MemoryStableHandle,
	) => Promise<MemoryLifecycleItem | null>
	updateLifecycleItem?: (
		handle: MemoryStableHandle,
		patch: StructuredMemoryLifecyclePatch | ProcedureLifecyclePatch,
	) => Promise<MemoryLifecycleItem | null>
	invalidateLifecycleItem?: (
		handle: MemoryStableHandle,
		invalidatedBy?: Record<string, unknown>,
	) => Promise<MemoryLifecycleItem | null>
	getLifecycleHistory?: (params: {
		handle: MemoryStableHandle
		limit?: number
	}) => Promise<MemoryLifecycleHistoryEntry[]>
	reportProcedureOutcome?: (params: {
		handle: Extract<MemoryStableHandle, { family: "procedure" }>
		success: boolean
		note?: string
		actorRole?: MemoryActorRole
	}) => Promise<Extract<MemoryLifecycleItem, { family: "procedure" }> | null>
	applyMemoryFeedback?: (params: {
		handle: Extract<MemoryStableHandle, { family: "structured" }>
		signal: MemoryFeedbackSignal
		patch?: StructuredMemoryLifecyclePatch
		invalidatedBy?: Record<string, unknown>
		note?: string
		actorRole?: MemoryActorRole
	}) => Promise<Extract<MemoryLifecycleItem, { family: "structured" }> | null>
}

type ConversationImportCapableManager = MongoDBMemoryManager & {
	importConversations?: (params: {
		datasetPath: string
		scope?: MemoryScope
		limitConversations?: number
		limitTurnsPerConversation?: number
	}) => Promise<MemoryConversationImportResult>
}

export type MdbrainBridgeContext = {
	agentId: string
}

function resolveAgentId(explicit?: string): string {
	return (explicit ?? process.env.MDBRAIN_AGENT_ID ?? "main").trim() || "main"
}

export async function mdbrainBridgeGetManager(
	agentId?: string,
): Promise<MongoDBMemoryManager> {
	const id = resolveAgentId(agentId)
	const cfg = resolveBridgeConfig()
	const { manager, error } = await getMemorySearchManager({ cfg, agentId: id })
	if (!manager || error) {
		throw new Error(error ?? "mongodb memory unavailable")
	}
	const typedManager = manager as MongoDBMemoryManager
	// Initialize the wiki_pages collection + schema validation + indexes +
	// search indexes. This is critical — without it, wiki search returns
	// empty results (no vector/text search indexes on wiki_pages).
	try {
		const { getWikiDbHandle, ensureWikiSchema } = await import(
			"@mdbrain/wiki-engine"
		)
		const handle = getWikiDbHandle(typedManager)
		await ensureWikiSchema(handle.db, handle.prefix)
	} catch (err) {
		// Don't crash the API if wiki schema init fails — log + continue.
		// The memory engine still works; only wiki features are affected.
		const log = createSubsystemLogger("wiki:bridge")
		log.warn(
			`wiki schema initialization failed: ${err instanceof Error ? err.message : String(err)}`,
		)
	}
	return typedManager
}

export async function mdbrainBridgeSearch(params: {
	query: string
	agentId?: string
	maxResults?: number
	minScore?: number
	sessionKey?: string
	scope?: MemoryScope
	scopeRef?: string
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.search(params.query, {
		maxResults: params.maxResults,
		minScore: params.minScore,
		sessionKey: params.sessionKey,
		scope: params.scope,
		scopeRef: params.scopeRef,
	})
}

export async function mdbrainBridgeWaitForBenchmarkSearchReadiness(params: {
	agentId?: string
	retrievalLane?: "native" | "raw-session"
	scope?: MemoryScope
	scopeRef?: string
	sessionId?: string
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	await m.waitForBenchmarkSearchReadiness({
		retrievalLane: params.retrievalLane,
		scope: params.scope,
		scopeRef: params.scopeRef,
		sessionId: params.sessionId,
	})
}

export async function mdbrainBridgeSearchKB(params: {
	query: string
	agentId?: string
	maxResults?: number
	minScore?: number
	filter?: { tags?: string[]; category?: string; source?: string }
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.searchKB(params.query, {
		maxResults: params.maxResults,
		minScore: params.minScore,
		filter: params.filter,
	})
}

export async function mdbrainBridgeReadFile(params: {
	relPath: string
	from?: number
	lines?: number
	agentId?: string
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.readFile({
		relPath: params.relPath,
		from: params.from,
		lines: params.lines,
	})
}

/** Legacy: append a user message (same as `writeConversationEvent` with role user). */
export async function mdbrainBridgeAdd(params: {
	content: string
	agentId?: string
	sessionId?: string
	metadata?: Record<string, unknown>
	scope?: MemoryScope
	scopeRef?: string
}) {
	return mdbrainBridgeWriteConversationEvent({
		agentId: params.agentId,
		role: "user",
		body: params.content,
		sessionId: params.sessionId,
		metadata: params.metadata,
		scope: params.scope,
		scopeRef: params.scopeRef,
	})
}

export async function mdbrainBridgeWriteConversationEvent(params: {
	agentId?: string
	role: "user" | "assistant" | "system" | "tool"
	body: string
	sessionId?: string
	timestamp?: string
	metadata?: Record<string, unknown>
	scope?: MemoryScope
	scopeRef?: string
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	const timestamp = params.timestamp ? new Date(params.timestamp) : undefined
	return m.writeConversationEvent({
		role: params.role,
		body: params.body,
		sessionId: params.sessionId,
		timestamp,
		metadata: params.metadata,
		scope: params.scope,
		scopeRef: params.scopeRef,
	})
}

export async function mdbrainBridgeExtractEvent(params: {
	agentId?: string
	eventId: string
}): Promise<{ jobId: string; scheduled: boolean }> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as ExtractionCapableManager
	if (!m.extractEvent) {
		throw new Error("extractEvent is not available on this manager")
	}
	return m.extractEvent({ eventId: params.eventId })
}

export async function mdbrainBridgeWriteStructuredMemory(params: {
	agentId?: string
	entry: StructuredMemoryEntry
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	const id = resolveAgentId(params.agentId)
	return m.writeStructuredMemory({
		...params.entry,
		agentId: params.entry.agentId ?? id,
	})
}

export async function mdbrainBridgeWriteProcedure(params: {
	agentId?: string
	entry: ProcedureEntry
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	const id = resolveAgentId(params.agentId)
	return m.writeProcedure({
		...params.entry,
		agentId: params.entry.agentId ?? id,
	})
}

export async function mdbrainBridgeProfile(params: {
	agentId?: string
	scope?: MemoryScope
	scopeRef?: string
	maxEntities?: number
	maxEpisodes?: number
	maxPerType?: number
	activityWindowMs?: number
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.synthesizeProfile({
		scope: params.scope,
		scopeRef: params.scopeRef,
		maxEntities: params.maxEntities,
		maxEpisodes: params.maxEpisodes,
		maxPerType: params.maxPerType,
		activityWindowMs: params.activityWindowMs,
	})
}

export async function mdbrainBridgeHydrateActiveSlate(params: {
	agentId?: string
	scope?: MemoryScope
	scopeRef?: string
	maxItems?: number
}): Promise<MdbrainBridgeActiveSlate> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as ActiveSlateCapableManager
	if (!m.hydrateActiveSlate) {
		throw new Error("hydrateActiveSlate is not available on this manager")
	}
	return m.hydrateActiveSlate({
		scope: params.scope,
		scopeRef: params.scopeRef,
		maxItems: params.maxItems,
	})
}

export async function mdbrainBridgeBuildDiscoveryProjection(params: {
	agentId?: string
	kind: "entity-brief" | "topic-brief" | "what-changed" | "contradiction-report"
	query?: string
	scope?: MemoryScope
	scopeRef?: string
	maxItems?: number
	timeRange?: {
		preset?: string
		start?: string
		end?: string
	}
}): Promise<MdbrainBridgeDiscoveryProjection> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as DiscoveryProjectionCapableManager
	if (!m.buildDiscoveryProjection) {
		throw new Error("buildDiscoveryProjection is not available on this manager")
	}
	return m.buildDiscoveryProjection({
		kind: params.kind,
		query: params.query,
		scope: params.scope,
		scopeRef: params.scopeRef,
		maxItems: params.maxItems,
		timeRange: params.timeRange,
	})
}

export async function mdbrainBridgeBuildContextBundle(params: {
	agentId?: string
	query?: string
	scope?: MemoryScope
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
	timeRange?: {
		preset?: string
		start?: string
		end?: string
	}
	mode?: "full" | "wake-up"
}): Promise<MdbrainBridgeContextBundle> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as ContextBundleCapableManager
	if (!m.buildContextBundle) {
		throw new Error("buildContextBundle is not available on this manager")
	}
	return m.buildContextBundle({
		query: params.query,
		scope: params.scope,
		scopeRef: params.scopeRef,
		sessionId: params.sessionId,
		tokenBudget: params.tokenBudget,
		maxActiveItems: params.maxActiveItems,
		maxEvidenceItems: params.maxEvidenceItems,
		maxRecentEvents: params.maxRecentEvents,
		includeDiscoveryProjection: params.includeDiscoveryProjection,
		discoveryKind: params.discoveryKind,
		includeProfile: params.includeProfile,
		timeRange: params.timeRange,
		mode: params.mode,
	})
}

export async function mdbrainBridgeRecallConversation(params: {
	agentId?: string
	query?: string
	sessionId?: string
	roles?: Array<"user" | "assistant" | "system" | "tool">
	startTime?: string
	endTime?: string
	timezone?: string
	includeToolMessages?: boolean
	limit?: number
}): Promise<ConversationRecallResponse> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as ConversationRecallCapableManager
	if (!m.recallConversation) {
		throw new Error("recallConversation is not available on this manager")
	}
	return m.recallConversation({
		query: params.query,
		sessionId: params.sessionId,
		roles: params.roles,
		startTime: params.startTime,
		endTime: params.endTime,
		timezone: params.timezone,
		includeToolMessages: params.includeToolMessages,
		limit: params.limit,
	})
}

export async function mdbrainBridgeGetLifecycleItem(params: {
	handle: MemoryStableHandle
}): Promise<MemoryLifecycleItem | null> {
	const m = (await mdbrainBridgeGetManager(
		params.handle.agentId,
	)) as LifecycleCapableManager
	if (!m.getLifecycleItem) {
		throw new Error("getLifecycleItem is not available on this manager")
	}
	return m.getLifecycleItem(params.handle)
}

export async function mdbrainBridgeUpdateLifecycleItem(params: {
	handle: MemoryStableHandle
	patch: StructuredMemoryLifecyclePatch | ProcedureLifecyclePatch
}): Promise<MemoryLifecycleItem | null> {
	const m = (await mdbrainBridgeGetManager(
		params.handle.agentId,
	)) as LifecycleCapableManager
	if (!m.updateLifecycleItem) {
		throw new Error("updateLifecycleItem is not available on this manager")
	}
	return m.updateLifecycleItem(params.handle, params.patch)
}

export async function mdbrainBridgeDeleteLifecycleItem(params: {
	handle: MemoryStableHandle
	invalidatedBy?: Record<string, unknown>
}): Promise<MemoryLifecycleItem | null> {
	const m = (await mdbrainBridgeGetManager(
		params.handle.agentId,
	)) as LifecycleCapableManager
	if (!m.invalidateLifecycleItem) {
		throw new Error("invalidateLifecycleItem is not available on this manager")
	}
	return m.invalidateLifecycleItem(params.handle, params.invalidatedBy)
}

export async function mdbrainBridgeGetLifecycleHistory(params: {
	handle: MemoryStableHandle
	limit?: number
}): Promise<MemoryLifecycleHistoryEntry[]> {
	const m = (await mdbrainBridgeGetManager(
		params.handle.agentId,
	)) as LifecycleCapableManager
	if (!m.getLifecycleHistory) {
		throw new Error("getLifecycleHistory is not available on this manager")
	}
	return m.getLifecycleHistory({
		handle: params.handle,
		limit: params.limit,
	})
}

export async function mdbrainBridgeReportProcedureOutcome(params: {
	handle: Extract<MemoryStableHandle, { family: "procedure" }>
	success: boolean
	note?: string
	actorRole?: MemoryActorRole
}): Promise<Extract<MemoryLifecycleItem, { family: "procedure" }> | null> {
	const m = (await mdbrainBridgeGetManager(
		params.handle.agentId,
	)) as LifecycleCapableManager
	if (!m.reportProcedureOutcome) {
		throw new Error("reportProcedureOutcome is not available on this manager")
	}
	return m.reportProcedureOutcome(params)
}

export async function mdbrainBridgeApplyMemoryFeedback(params: {
	handle: Extract<MemoryStableHandle, { family: "structured" }>
	signal: MemoryFeedbackSignal
	patch?: StructuredMemoryLifecyclePatch
	invalidatedBy?: Record<string, unknown>
	note?: string
	actorRole?: MemoryActorRole
}): Promise<Extract<MemoryLifecycleItem, { family: "structured" }> | null> {
	const m = (await mdbrainBridgeGetManager(
		params.handle.agentId,
	)) as LifecycleCapableManager
	if (!m.applyMemoryFeedback) {
		throw new Error("applyMemoryFeedback is not available on this manager")
	}
	return m.applyMemoryFeedback(params)
}

export async function mdbrainBridgeSearchDetailed(params: {
	agentId?: string
	query: string
	scope?: MemoryScope
	scopeRef?: string
	maxResults?: number
	minScore?: number
	searchMode?: "auto" | "direct" | "agentic"
	sourcePreference?: string[]
	timeRange?: {
		preset?: string
		start?: string
		end?: string
	}
	needExactEvidence?: boolean
	maxPasses?: number
	returnPlan?: boolean
	conversationScope?: { sessionKey?: string }
	structuredScope?: {
		type?: string
		state?: string | string[]
		salience?: string[]
	}
	referenceScope?: {
		source?: string
		category?: string
		tags?: string[]
	}
	proceduralScope?: { state?: string; intentTags?: string[] }
	searchConfig?: {
		recipe?: "fast" | "hybrid" | "deep" | "temporal" | "chain-of-thought"
		recallProfile?: "latency" | "balanced" | "proof"
		maxResults?: number
		searchMode?: "auto" | "direct" | "agentic"
		maxPasses?: number
		sourcePreference?: string[]
		timeRange?: {
			preset?: string
			start?: string
			end?: string
		}
		needExactEvidence?: boolean
		numCandidates?: number
		fusionMethod?: "scoreFusion" | "rankFusion" | "js-merge"
		hybridMode?: "hybrid" | "vector-only"
		allowHybridBackstop?: boolean
		lexicalPrefilter?: "disabled" | "experimental"
	}
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	if (!m.searchDetailed) {
		throw new Error("searchDetailed is not available on this manager")
	}
	return m.searchDetailed({
		query: params.query,
		scope: params.scope,
		scopeRef: params.scopeRef,
		maxResults: params.maxResults,
		minScore: params.minScore,
		searchMode: params.searchMode,
		sourcePreference: params.sourcePreference as
			| Array<
					| "reference"
					| "conversation"
					| "structured"
					| "procedural"
					| "episodic"
					| "graph"
			  >
			| undefined,
		timeRange: params.timeRange as
			| {
					preset?:
						| "today"
						| "yesterday"
						| "last-24h"
						| "last-7d"
						| "this-week"
						| "last-30d"
						| "this-month"
					start?: string
					end?: string
			  }
			| undefined,
		needExactEvidence: params.needExactEvidence,
		maxPasses: params.maxPasses,
		returnPlan: params.returnPlan,
		conversationScope: params.conversationScope,
		structuredScope: params.structuredScope,
		referenceScope: params.referenceScope,
		proceduralScope: params.proceduralScope,
		searchConfig: params.searchConfig as
			| {
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
					timeRange?: {
						preset?:
							| "today"
							| "yesterday"
							| "last-24h"
							| "last-7d"
							| "this-week"
							| "last-30d"
							| "this-month"
						start?: string
						end?: string
					}
					needExactEvidence?: boolean
					numCandidates?: number
					fusionMethod?: "scoreFusion" | "rankFusion" | "js-merge"
					hybridMode?: "hybrid" | "vector-only"
					allowHybridBackstop?: boolean
					lexicalPrefilter?: "disabled" | "experimental"
			  }
			| undefined,
	})
}

export async function mdbrainBridgeStatus(params: {
	agentId?: string
}): Promise<MemoryProviderStatus> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.status()
}

export async function mdbrainBridgeGetDetailedStatus(params: {
	agentId?: string
}): Promise<V2Status> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.getDetailedStatus()
}

export async function mdbrainBridgeStats(params: {
	agentId?: string
}): Promise<MemoryStats> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.stats()
}

export async function mdbrainBridgeSync(params: {
	agentId?: string
	reason?: string
	force?: boolean
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.sync({
		reason: params.reason,
		force: params.force,
	})
}

export async function mdbrainBridgeProbeEmbedding(params: {
	agentId?: string
}) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.probeEmbeddingAvailability()
}

export async function mdbrainBridgeProbeVector(params: { agentId?: string }) {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.probeVectorAvailability()
}

export async function mdbrainBridgeRelevanceExplain(params: {
	agentId?: string
	query: string
	sourceScope?: RelevanceSourceScope
	sessionKey?: string
	maxResults?: number
	minScore?: number
	deep?: boolean
}): Promise<RelevanceExplainResult> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.relevanceExplain({
		query: params.query,
		sourceScope: params.sourceScope,
		sessionKey: params.sessionKey,
		maxResults: params.maxResults,
		minScore: params.minScore,
		deep: params.deep,
	})
}

export async function mdbrainBridgeRelevanceBenchmark(params: {
	agentId?: string
	datasetPath?: string
	maxResults?: number
	minScore?: number
	/** Task 1.A parity envelope — optional pass-through. */
	datasetSha256?: string
	embeddingConfig?: {
		model: string
		dimensions: number
		quantization: "float32" | "int8" | "binary"
	}
	rerankerConfig?: {
		model: string
		version: string | null
		stage: "post-fusion" | "pre-fusion" | "none"
	}
	retrievalLane?: "native" | "raw-session"
}): Promise<RelevanceBenchmarkResult> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.relevanceBenchmark({
		datasetPath: params.datasetPath,
		maxResults: params.maxResults,
		minScore: params.minScore,
		...(params.datasetSha256 ? { datasetSha256: params.datasetSha256 } : {}),
		...(params.embeddingConfig
			? { embeddingConfig: params.embeddingConfig }
			: {}),
		...(params.rerankerConfig ? { rerankerConfig: params.rerankerConfig } : {}),
		...(params.retrievalLane ? { retrievalLane: params.retrievalLane } : {}),
	})
}

export async function mdbrainBridgeRelevanceReport(params: {
	agentId?: string
	windowMs?: number
}): Promise<RelevanceReport> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.relevanceReport({ windowMs: params.windowMs })
}

export async function mdbrainBridgeRelevanceSampleRate(params: {
	agentId?: string
}): Promise<RelevanceSampleState> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.relevanceSampleRate()
}

export async function mdbrainBridgeBenchmarkIngest(params: {
	agentId?: string
	datasetPath: string
	scope?: MemoryScope
	limitConversations?: number
	limitTurnsPerConversation?: number
}): Promise<MemoryBenchmarkIngestResult> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.benchmarkIngest({
		datasetPath: params.datasetPath,
		scope: params.scope,
		limitConversations: params.limitConversations,
		limitTurnsPerConversation: params.limitTurnsPerConversation,
	})
}

export async function mdbrainBridgeImportConversations(params: {
	agentId?: string
	datasetPath: string
	scope?: MemoryScope
	limitConversations?: number
	limitTurnsPerConversation?: number
}): Promise<MemoryConversationImportResult> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as ConversationImportCapableManager
	if (!m.importConversations) {
		throw new Error("importConversations is not available on this manager")
	}
	return m.importConversations({
		datasetPath: params.datasetPath,
		scope: params.scope,
		limitConversations: params.limitConversations,
		limitTurnsPerConversation: params.limitTurnsPerConversation,
	})
}

export async function mdbrainBridgeAccessTrends(params: {
	agentId?: string
	collection?: AccessEventCollection
	memoryIds?: string[]
	windowDays?: number
	limit?: number
}): Promise<MemoryAccessTrend[]> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	return m.accessTrends({
		collection: params.collection,
		memoryIds: params.memoryIds,
		windowDays: params.windowDays,
		limit: params.limit,
	})
}

export async function mdbrainBridgeAccessSummaries(params: {
	agentId?: string
	collection: AccessEventCollection
	memoryIds: string[]
	windowDays?: number
}): Promise<MemoryAccessSummary[]> {
	const m = await mdbrainBridgeGetManager(params.agentId)
	if (!m.accessSummaries) {
		return []
	}
	return m.accessSummaries({
		collection: params.collection,
		memoryIds: params.memoryIds,
		windowDays: params.windowDays,
	})
}

export async function mdbrainBridgeTraceChain(params: {
	agentId?: string
	factId: string
	collection: string
	maxDepth?: number
}) {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as ChainCapableManager
	if (!m.traceChain) {
		throw new Error("traceChain is not available on this manager")
	}
	return m.traceChain({
		factId: params.factId,
		collection: params.collection,
		options:
			params.maxDepth !== undefined ? { maxDepth: params.maxDepth } : undefined,
	})
}

export async function mdbrainBridgeScanNovelty(params: {
	agentId?: string
	limit?: number
	scope?: string
}) {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as NoveltyCapableManager
	if (!m.scanNovelty) {
		throw new Error("scanNovelty is not available on this manager")
	}
	return m.scanNovelty({
		limit: params.limit,
		scope: params.scope,
	})
}

export async function mdbrainBridgeConsolidate(params: {
	agentId?: string
	maxEvents?: number
	minCombinedScore?: number
	scope?: string
}) {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as ConsolidateCapableManager
	if (!m.consolidate) {
		throw new Error("consolidate is not available on this manager")
	}
	return m.consolidate({
		maxEvents: params.maxEvents,
		minCombinedScore: params.minCombinedScore,
		scope: params.scope,
	})
}

export async function mdbrainBridgeSelfEdit(params: {
	agentId?: string
	block: "user" | "persona" | "instructions"
	action: "append" | "replace" | "prepend"
	content: string
}): Promise<{ upserted: boolean; id: string }> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as SelfEditCapableManager
	if (!m.selfEditBlock) {
		throw new Error("selfEditBlock is not available on this manager")
	}
	return m.selfEditBlock({
		block: params.block,
		action: params.action,
		content: params.content,
	})
}

export async function mdbrainBridgeGetState(params: {
	agentId?: string
	scope?: MemoryScope
	scopeRef?: string
}): Promise<MemoryStateFamily & { partial?: boolean }> {
	const results = await Promise.allSettled([
		mdbrainBridgeProfile({
			agentId: params.agentId,
			scope: params.scope,
			scopeRef: params.scopeRef,
		}),
		mdbrainBridgeHydrateActiveSlate({
			agentId: params.agentId,
			scope: params.scope,
			scopeRef: params.scopeRef,
		}),
		mdbrainBridgeBuildContextBundle({
			agentId: params.agentId,
			scope: params.scope,
			scopeRef: params.scopeRef,
		}),
	])
	const partial = results.some((r) => r.status === "rejected")
	const profile =
		results[0].status === "fulfilled" ? results[0].value : ({} as any)
	const slate = results[1].status === "fulfilled" ? results[1].value : null
	const bundle =
		results[2].status === "fulfilled" ? results[2].value : ({} as any)
	const blocks = slate
		? materializeBlocks(slate as Parameters<typeof materializeBlocks>[0])
		: { blocks: [], totalTokenBudget: 0, totalActualTokens: 0 }
	return { profile, blocks, bundle, ...(partial ? { partial: true } : {}) }
}

export async function mdbrainBridgeListRecallTraces(params: {
	agentId?: string
	limit?: number
}): Promise<RecallTrace[]> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as RecallTraceCapableManager
	if (!m.listRecallTraces) {
		throw new Error("listRecallTraces is not available on this manager")
	}
	return m.listRecallTraces({ limit: params.limit })
}

export async function mdbrainBridgeGetRecallTrace(params: {
	agentId?: string
	traceId: string
}): Promise<RecallTrace | null> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as RecallTraceCapableManager
	if (!m.getRecallTrace) {
		throw new Error("getRecallTrace is not available on this manager")
	}
	return m.getRecallTrace({ traceId: params.traceId })
}

export async function mdbrainBridgeListMemoryJobs(params: {
	agentId?: string
	status?: MemoryJobStatus
	limit?: number
	jobType?: MemoryJobType
}): Promise<MemoryJob[]> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as MemoryJobsCapableManager
	if (!m.listMemoryJobs) {
		throw new Error("listMemoryJobs is not available on this manager")
	}
	return m.listMemoryJobs({
		status: params.status,
		limit: params.limit,
		jobType: params.jobType,
	})
}

export async function mdbrainBridgeGetMemoryJob(params: {
	agentId?: string
	jobId: string
}): Promise<MemoryJob | null> {
	const m = (await mdbrainBridgeGetManager(
		params.agentId,
	)) as MemoryJobsCapableManager
	if (!m.getMemoryJob) {
		throw new Error("getMemoryJob is not available on this manager")
	}
	return m.getMemoryJob({ jobId: params.jobId })
}

export type {
	MemoryConversationImportResult,
	MemoryLifecycleHistoryEntry,
	MemoryLifecycleItem,
	MemoryStableHandle,
	ProcedureEntry,
	StructuredMemoryEntry,
} from "@mdbrain/memory-engine"
