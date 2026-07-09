# Mdbrian Capability Matrix

This matrix maps the supported Mdbrian memory engine to the standalone product surface that ships in this repo.

## Public contract

- Canonical HTTP request fields:
  - `query`
  - `limit`
  - `sessionKey` for search
  - `sessionId` for writes
  - `scopeRef` for profile synthesis
  - `agentId`
- Deprecated compatibility aliases still accepted during stabilization:
  - `q`
  - `maxResults`
  - `containerTag`

## Surface map

| Capability | Engine | Bridge | HTTP | SDK | Verification |
|---|---|---|---|---|---|
| Memory search | `packages/memory-engine/src/mongodb-manager.ts` `search()` | `packages/memory-bridge/src/mdbrian-bridge.ts` `mdbrianBridgeSearch()` | `POST /v1/search` | `packages/client/src/client.ts` `search()` | `apps/api/src/app.test.ts`, `packages/memory-engine` unit suite |
| Memory search (detailed) | `searchDetailed()` | `mdbrianBridgeSearchDetailed()` | `POST /v1/search-detailed` | `client.searchDetailed()` | production readiness E2E |
| KB search | `packages/memory-engine/src/mongodb-manager.ts` `searchKB()` | `mdbrianBridgeSearchKB()` | `POST /v1/search-kb` | `searchKB()` | `packages/memory-engine` unit suite |
| Memory reopen | `packages/memory-engine/src/types.ts` `readFile()` contract | `mdbrianBridgeReadFile()` | `POST /v1/read-file` | `readFile()` | `packages/memory-engine` unit suite |
| Conversation ingest | `writeConversationEvent()` | `mdbrianBridgeWriteConversationEvent()` | `POST /v1/write-event` | `writeEvent()` | `packages/memory-engine` unit suite |
| User-message shortcut | `writeConversationEvent({ role: "user" })` | `mdbrianBridgeAdd()` | `POST /v1/add` | `add()` | `apps/api/src/app.test.ts` |
| Structured memory | `packages/memory-engine/src/mongodb-structured-memory.ts` | `mdbrianBridgeWriteStructuredMemory()` | `POST /v1/write-structured` | `writeStructured()` | `packages/memory-engine` unit suite |
| Procedures | `packages/memory-engine/src/mongodb-procedures.ts` | `mdbrianBridgeWriteProcedure()` | `POST /v1/write-procedure` | `writeProcedure()` | `packages/memory-engine` unit suite |
| Profile synthesis | `packages/memory-engine/src/mongodb-profile.ts` | `mdbrianBridgeProfile()` | `POST /v1/profile` | `profile()` | `apps/api/src/app.test.ts`, `packages/memory-engine` unit suite |
| Context bundle | `packages/memory-engine/src/mongodb-context-bundle.ts` | `mdbrianBridgeBuildContextBundle()` | `POST /v1/context-bundle` | `buildContextBundle()` | `packages/memory-engine/src/mongodb-context-bundle.test.ts`, `apps/api/src/app.test.ts`, `scripts/proof-pack.ts`, `scripts/real-agent-smoke.ts` |
| Status | `status()` | `mdbrianBridgeStatus()` | `GET /v1/status` | `status()` | `apps/api/src/app.test.ts`, `scripts/proof-pack.ts` |
| Detailed status | `getDetailedStatus()` | `mdbrianBridgeGetDetailedStatus()` | `GET /v1/status/detailed` | `getDetailedStatus()` | `packages/memory-engine` unit suite |
| Stats | `stats()` | `mdbrianBridgeStats()` | `GET /v1/stats` | `stats()` | `scripts/proof-pack.ts` |
| Sync | `sync()` | `mdbrianBridgeSync()` | `POST /v1/sync` | `sync()` | `packages/memory-engine` unit suite |
| Embedding probe | `probeEmbeddingAvailability()` | `mdbrianBridgeProbeEmbedding()` | `GET /v1/probes/embedding` | `probeEmbedding()` | `scripts/proof-pack.ts` |
| Vector probe | `probeVectorAvailability()` | `mdbrianBridgeProbeVector()` | `GET /v1/probes/vector` | `probeVector()` | `scripts/proof-pack.ts` |
| Relevance explain | `packages/memory-engine/src/mongodb-relevance.ts` | `mdbrianBridgeRelevanceExplain()` | `POST /v1/admin/relevance/explain` | `relevanceExplain()` | `packages/memory-engine` unit suite |
| Relevance benchmark | `relevanceBenchmark()` | `mdbrianBridgeRelevanceBenchmark()` | `POST /v1/admin/relevance/benchmark` | `relevanceBenchmark()` | `packages/memory-engine/src/production-readiness.e2e.test.ts` |
| Relevance report | `relevanceReport()` | `mdbrianBridgeRelevanceReport()` | `GET /v1/admin/relevance/report` | `relevanceReport()` | `scripts/proof-pack.ts` |
| Relevance sample rate | `relevanceSampleRate()` | `mdbrianBridgeRelevanceSampleRate()` | `GET /v1/admin/relevance/sample-rate` | `relevanceSampleRate()` | `packages/memory-engine` unit suite |
| Reasoning chain trace | `packages/memory-engine/src/mongodb-reasoning-chain.ts` | `mdbrianBridgeTraceChain()` | `POST /v1/chain-trace` | `traceChain()` | `packages/memory-engine` unit suite |
| Novelty scan | `packages/memory-engine/src/mongodb-novelty.ts` | `mdbrianBridgeScanNovelty()` | `POST /v1/novelty-scan` | `scanNovelty()` | `packages/memory-engine` unit suite |
| Consolidate (Dreamer) | `packages/memory-engine/src/mongodb-consolidator.ts` | `mdbrianBridgeConsolidate()` | `POST /v1/consolidate` | `consolidate()` | `packages/memory-engine` unit suite |
| Access tracking | `packages/memory-engine/src/mongodb-access-tracker.ts` (`AccessTracker`) | -- | -- | -- | `packages/memory-engine` unit suite |
| Importance decay | `computeImportanceDecay()` in `packages/memory-engine/src/mongodb-trust.ts` | -- | -- | -- | `packages/memory-engine` unit suite |
| Wiki source categorization | `wikiSource`/`vault`/`section` fields on KB schema | -- | -- | -- | `packages/memory-engine` unit suite |

## Memory coverage

| Mdbrian memory area | Active modules |
|---|---|
| Event sourcing and projection | `packages/memory-engine/src/mongodb-events.ts`, `packages/memory-engine/src/mongodb-manager.ts` |
| Retrieval planning | `packages/memory-engine/src/mongodb-retrieval-planner.ts` |
| Hybrid search and fusion | `packages/memory-engine/src/mongodb-hybrid.ts`, `packages/memory-engine/src/mongodb-search.ts` |
| Structured memory | `packages/memory-engine/src/mongodb-structured-memory.ts` |
| Procedures | `packages/memory-engine/src/mongodb-procedures.ts` |
| Profile synthesis | `packages/memory-engine/src/mongodb-profile.ts` |
| Context assembly | `packages/memory-engine/src/mongodb-context-bundle.ts`, `packages/memory-engine/src/mongodb-active-slate.ts`, `packages/memory-engine/src/mongodb-discovery-projections.ts` |
| Knowledge base | `packages/memory-engine/src/mongodb-kb.ts`, `packages/memory-engine/src/mongodb-kb-search.ts` |
| Graph and entities | `packages/memory-engine/src/mongodb-graph.ts`, `packages/memory-engine/src/mongodb-entity-extractor.ts` |
| Episodes | `packages/memory-engine/src/mongodb-episodes.ts` |
| Query cache | `packages/memory-engine/src/mongodb-query-cache.ts` |
| Relevance and telemetry | `packages/memory-engine/src/mongodb-relevance.ts`, `packages/memory-engine/src/mongodb-telemetry.ts` |
| Reasoning chains | `packages/memory-engine/src/mongodb-reasoning-chain.ts` |
| Novelty detection | `packages/memory-engine/src/mongodb-novelty.ts` |
| Access tracking | `packages/memory-engine/src/mongodb-access-tracker.ts` |
| Importance decay | `packages/memory-engine/src/mongodb-trust.ts` |
| Consolidation (Dreamer) | `packages/memory-engine/src/mongodb-consolidator.ts` |
| Migration | `packages/memory-engine/src/mongodb-migration.ts` |

## Proof path

- MongoDB runtime parity: `bun run mongodb:parity` with managed Atlas cloud, Atlas Local Preview, or both configured.
- `repo-foundation`: `bun run check-types`, `bun run lint`, `bun run build`, `bun run test`
- `api-contract`: `bun run proof-pack`
- `package-publishability`: `bun run check-publishability`
- `live-core`: `packages/memory-engine/src/production-readiness.e2e.test.ts`
- `live-capability`:
  - auto-embed/search: `packages/memory-engine/src/real-e2e-v2.e2e.test.ts` with managed Atlas cloud or `docker/mongodb/docker-compose.preview.yml` and an `al-...` Atlas Model key
  - replica-set-only features: `packages/memory-engine/src/mongodb-e2e.e2e.test.ts` with `docker/mongodb/docker-compose.mongodb.yml` `replicaset` or `fullstack`
- Benchmark methodology: [benchmark-pack.md](benchmark-pack.md)
