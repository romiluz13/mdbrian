# Codebase Recon: LLM Wiki on MongoDB — Existing Implementations & Reusable Patterns

## Executive Summary

The most directly relevant repo is **mbrain** — a full MongoDB-native "Company Brain" memory framework with entities, relations, episodes, knowledge base, hybrid search ($vectorSearch + $search + $rankFusion), $graphLookup, consolidation ("Dreamer"), and wiki-source tracking fields. It is the single best foundation to build on.

**Hybrid-Search-RAG** is a MongoDB-backed LightRAG fork with KG extraction, $vectorSearch, $search, $graphLookup, $rankFusion, Voyage embeddings, and conversation memory — a strong reference for graph-augmented RAG patterns.

**SDR-AI** has a production-grade LangGraph + MongoDB agent memory system with langgraph-store-mongodb, $vectorSearch indexes, Atlas $search, session memory, learning loops, and procedural playbooks.

**openclaw** has a markdown-vault-based `memory-wiki` extension (entity/concept/synthesis pages with claims, evidence, contradictions, relationships) — but uses SQLite/sqlite-vec, NOT MongoDB. Valuable as a schema/UX reference for wiki page structure.

---

## 1. mbrain — PRIMARY CANDIDATE

**Path:** `/Users/rom.iluz/Dev/mbrain`
**What it does:** MongoDB-native long-term AI memory framework ("Company Brain"). Stores conversations, facts, procedures, KB chunks, episodes, and graph relationships in MongoDB. Retrieves with hybrid vector + full-text search + $rankFusion. Ships as monorepo: HTTP API (Hono), MCP server, TypeScript client, AI SDK tools, Next.js web console.

### MongoDB Collections (prefix-based, ~30 collections)
**File:** `packages/memory-engine/src/mongodb-schema.ts` (3835 lines)

| Collection | Schema const | Purpose |
|---|---|---|
| `knowledge_base` | `KB_SCHEMA` | KB documents with `wikiSource`, `vault`, `section` fields |
| `kb_chunks` | `KB_CHUNKS_SCHEMA` | Chunked KB content with `wikiSource`, `vault`, `embedding` |
| `structured_mem` | `STRUCTURED_MEM_SCHEMA` | Typed memories: decision, preference, fact, person, todo, project, architecture. Has scope, salience, temporalScope, bi-temporal validFrom/validTo, revision history, confidence, provenance, sourceAgent, artifact (code/config) |
| `structured_mem_revisions` | `STRUCTURED_MEM_REVISIONS_SCHEMA` | Full revision history for structured memories |
| `procedures` | `PROCEDURES_SCHEMA` | Procedural playbooks with steps, triggerQueries, success/fail counts, evolutionHistory |
| `events` | `EVENTS_SCHEMA` | Conversation events (user/assistant/system/tool), bi-temporal validAt/invalidAt, scope, sessionId |
| `entities` | `ENTITIES_SCHEMA` | Named entities (person, project, concept, etc.) with aliases, attributes, confidence, mentionCount, wikiUrl, confidenceSource (onboarding/learned/inferred) |
| `relations` | `RELATIONS_SCHEMA` | Typed edges (fromEntityId→toEntityId, type, weight, confidence, bi-temporal, state) |
| `entity_links` | `ENTITY_LINKS_SCHEMA` | Entity disambiguation links (confirmed_same, candidate_same, related_mention) |
| `episodes` | `EPISODES_SCHEMA` | Consolidated event groups (daily, weekly, thread, topic, decision) with summaries |
| `chunks` | `CHUNKS_SCHEMA` | General memory chunks with embeddings |
| `consolidation_runs` | — | Dreamer consolidation run records |
| `memory_quarantine` | — | Injection-safety quarantine |
| `memory_evidence` | `MEMORY_EVIDENCE_SCHEMA` | Evidence backing for memories |
| `recall_traces` | — | Retrieval trace records |
| `memory_jobs` | — | Background jobs |
| `lane_coverage` | — | Retrieval lane coverage tracking |
| `access_events` | — | Memory access tracking |
| `memory_mutations` | — | Mutation audit log |
| `query_cache` | — | Query result cache |
| `embedding_cache` | — | Embedding cache |
| `ingest_runs` | — | Ingestion run tracking |
| `projection_runs` | — | Projection run tracking |
| `relevance_runs/artifacts/regressions` | — | Relevance evaluation |
| `memory_telemetry` | — | Telemetry |
| `session_chunks` | — | Session-scoped chunks |

### Key source files
- `packages/memory-engine/src/mongodb-schema.ts` (lines 1-3835) — all collection schemas + $jsonSchema validators + index creation
- `packages/memory-engine/src/mongodb-graph.ts` (1717 lines) — entity upsert, relation upsert, entity links, **$graphLookup** graph expansion (lines 835-1127), entity extraction
- `packages/memory-engine/src/mongodb-entity-extractor.ts` — regex + LLM entity extraction with stop words, ambiguity detection
- `packages/memory-engine/src/mongodb-episodes.ts` — event consolidation into episodes with summarizer injection
- `packages/memory-engine/src/mongodb-consolidator.ts` — "Dreamer" 5-phase offline pipeline: novelty scan, $vectorSearch similarity decisions, injection classification, entity extraction, structured memory promotion
- `packages/memory-engine/src/mongodb-search-executor.ts` — search recipes (fast/hybrid/deep), multi-pass agentic search, source preferences (conversation, structured, procedural, reference, episodic, graph)
- `packages/memory-engine/src/mongodb-conversation-recall.ts` (lines 519-822) — **$vectorSearch + $search + $rankFusion** hybrid recall with bitemporal filters
- `packages/memory-engine/src/mongodb-kb.ts` — KB ingestion (chunkMarkdown, hashText, transactional upsert)
- `packages/memory-engine/src/mongodb-kb-search.ts` — KB chunk $vectorSearch with tag/category/source filters
- `packages/memory-engine/src/embeddings-voyage.ts` — Voyage AI embedding provider
- `packages/memory-engine/src/mongodb-trust.ts` — trust-weighted scoring, importance decay
- `packages/memory-engine/src/mongodb-novelty.ts` — novelty detection
- `packages/memory-engine/src/mongodb-reasoning-chain.ts` — reasoning chain tracing
- `packages/memory-engine/src/mongodb-injection-classifier.ts` — injection safety for memory writes
- `packages/memory-engine/src/types.ts` — all type exports
- `packages/lib/src/types.memory.ts` — MemoryScope, config types, deployment profiles
- `packages/memory-bridge/src/index.ts` — stable facade API
- `apps/api/src/app.ts` + `routes/v1.ts` — HTTP API
- `apps/mcp/src/server.ts` — MCP server
- `packages/tools/src/index.ts` — AI SDK tool definitions (memory_search, memory_save, kb_search, etc.)

### Dependencies
- `mongodb: 7.2.0` (Node.js MongoDB driver)
- `@mbrain/lib: 1.1.0` (shared types)
- `node-llama-cpp: >=3.0.0` (optional, local embeddings)
- No langchain/langgraph dependency — pure MongoDB driver

### Wiki-relevant features already present
1. **KB collections with `wikiSource`, `vault`, `section` fields** — schema explicitly references "obsidian, notion, confluence" as wiki sources
2. **Entity graph with $graphLookup** — multi-hop traversal across entity→relation edges
3. **Entity disambiguation** via entity_links (confirmed_same, candidate_same, related_mention)
4. **Structured memory taxonomy** — decision, preference, fact, person, todo, project, architecture + custom
5. **Bi-temporal validity** — validAt/invalidAt on events, validFrom/validTo on structured_mem and relations
6. **Revision history** — structured_mem_revisions and procedure_revisions
7. **Episode consolidation** — daily/weekly/thread/topic/decision summaries from raw events
8. **Hybrid search** — $vectorSearch + $search + $rankFusion with recipes (fast/hybrid/deep)
9. **Consolidation "Dreamer"** — automated fact promotion from events to structured memory
10. **Provenance tracking** — sourceEventIds, sourceAgent, sourceReliability on all memory records
11. **Scope system** — session/user/agent/workspace/tenant/global

---

## 2. Hybrid-Search-RAG — GraphRAG REFERENCE

**Path:** `/Users/rom.iluz/Dev/Hybrid-Search-RAG`
**What it does:** MongoDB-native LightRAG fork. Full RAG engine with KG extraction, hybrid search, graph traversal, conversation memory. Python, async pymongo.

### Key patterns
- **KnowledgeGraphNode/Edge types** (`src/hybridrag/engine/types.py` lines 13-31): Pydantic models with id, labels, properties (nodes) and id, type, source, target, properties (edges)
- **MongoDB KG storage** (`src/hybridrag/engine/kg/mongo_impl.py`): BaseGraphStorage/BaseVectorStorage/BaseKVStorage implementations using AsyncMongoClient, SearchIndexModel for vector indexes
- **Workspace-prefixed collections** (`get_collection_name()`): multi-tenant via `{workspace}_{base_name}` prefix
- **Namespace constants** (`src/hybridrag/engine/namespace.py`): full_docs, text_chunks, llm_response_cache, full_entities, full_relations, entity_chunks, relation_chunks, entities (vector), relationships (vector), chunks (vector), chunk_entity_relation (graph)
- **$vectorSearch filters** (`src/hybridrag/enhancements/filters/vector_search_filters.py`): MQL prefilter building
- **$search.vectorSearch** (`src/hybridrag/enhancements/filters/lexical_prefilters.py`): MongoDB 8.2+ lexical prefilters
- **Atlas $search compound** (`src/hybridrag/enhancements/filters/atlas_search_filters.py`): Atlas Search compound filter building
- **$graphLookup graph search** (`src/hybridrag/enhancements/graph_search.py`): bidirectional traversal, configurable depth/weight, `kg_edges` collection
- **$rankFusion hybrid search** (`src/hybridrag/enhancements/mongodb_hybrid_search.py`): RRF with numCandidates = top_k × 20
- **Conversation memory** (`src/hybridrag/memory/conversation.py`): session + message collections, progressive summarization, history size limiting
- **Voyage AI embeddings** (`src/hybridrag/core/rag.py` lines 199-203): Voyage-only, no fallbacks
- **Entity boosting** (`src/hybridrag/enhancements/entity_boosting.py`): structural relevance boost in reranking
- **Schema validation migration** (`src/hybridrag/migrations/migrate_schema_validation.py`): $jsonSchema validators for conversation_sessions, conversation_messages, ingested_documents, ingested_chunks

### Dependencies
- `pymongo>=4.7.0,<5.0` + `motor>=3.4.0,<4.0` (async)
- `voyageai>=0.3.0`
- `pydantic>=2.0.0`, `pydantic-settings>=2.0.0`
- `numpy>=1.24.0`
- Optional: `langchain-openai>=0.2.0`, `langchain-core>=0.3.0`, `langchain-anthropic>=0.3.0`, `langgraph>=0.2.0`

---

## 3. SDR-AI — LangGraph + MongoDB Agent Memory

**Path:** `/Users/rom.iluz/Dev/SDR-AI`
**What it does:** Autonomous SDR (Sales Development Rep) AI agent with MongoDB-backed memory, learning loops, procedural playbooks, and outreach corpus search.

### Key patterns
- **LangGraph MongoDBStore** (`src/sdr_ai/agent/graph_memory.py`): `langgraph.store.mongodb.MongoDBStore` with `create_vector_index_config` for cross-thread memory. SearchTextBackfillStore wraps puts to ensure search_text field.
- **Atlas $search session memory** (`src/sdr_ai/personalization/stores.py` lines 68-90): `session_memory_search` index with compound text + fuzzy + equals filter
- **$vectorSearch index creation** (`scripts/create_vector_indexes.py`): SearchIndexModel with vector + filter fields, namespace_prefix scoping
- **Learning store** (`src/sdr_ai/personalization/stores.py`): LearningStore class — session index, playbook candidates, procedural playbooks, feedback events, learning digests, coaching rules
- **Operating memory** (`src/sdr_ai/personalization/operating_memory.py`): OperatingMemoryStore — semantic, episodic, procedural, outcome memory with MongoDB persistence
- **Procedural playbooks** (`src/sdr_ai/personalization/models.py`): ProceduralPlaybook model with trigger_conditions, steps, pitfalls, verification, allowed/blocked tools, outcome_metrics, evolution history
- **Learning safety** (`src/sdr_ai/personalization/learning.py`): injection protection for learning proposals, protected patterns, capacity snapshots
- **Outreach corpus search** (`src/sdr_ai/proactive/outreach_corpus.py`): $vectorSearch over past outreach messages

### Dependencies
- `pymongo>=4.12,<4.17`
- `langchain>=1.3.11,<2.0.0`, `langchain-core>=1.4.8`, `langchain-anthropic>=1.4.7`, `langchain-openai>=1.2.1`, `langchain-google-genai>=4.2.5`, `langchain-voyageai>=0.3.3`
- `langgraph==1.2.6`, `langgraph-checkpoint-mongodb==0.4.0`, `langgraph-store-mongodb>=0.3.0`
- `voyageai>=0.4.0`

---

## 4. openclaw — memory-wiki (Non-MongoDB Reference)

**Path:** `/Users/rom.iluz/Dev/openclaw/extensions/memory-wiki`
**What it does:** Markdown-vault-based "persistent wiki compiler and Obsidian-friendly knowledge vault." File-backed, NOT MongoDB.

### Wiki page schema (valuable as conceptual reference)
**File:** `extensions/memory-wiki/src/markdown.ts`
- **Page kinds:** entity, concept, source, synthesis, report
- **WikiClaim:** id, text, status, confidence, evidence[], updatedAt
- **WikiClaimEvidence:** kind, sourceId, path, lines, weight, confidence, privacyTier, note
- **WikiPersonCard:** canonicalId, handles, socials, emails, timezone, lane, askFor, avoidAskingFor, bestUsedFor, notEnoughFor
- **WikiRelationship:** targetId, targetPath, targetTitle, kind, weight, confidence, evidenceKind, privacyTier
- **WikiPageSummary:** kind, title, id, aliases, sourceIds, linkTargets, claims, contradictions, questions, confidence, privacyTier, personCard, relationships, bestUsedFor, notEnoughFor

### Key files
- `extensions/memory-wiki/index.ts` — plugin entry, registers wiki_status, wiki_lint, wiki_apply, wiki_search, wiki_get tools
- `extensions/memory-wiki/src/config.ts` — vault modes (isolated, bridge, unsafe-local), render modes (native, obsidian), search backends (shared, local), corpora (wiki, memory, all)
- `extensions/memory-wiki/src/memory-palace.ts` — palace status with clusters by kind, claim/question/contradiction counts
- `extensions/memory-wiki/src/prompt-section.ts` — agent digest builder (top pages + claims injected into prompt)
- `extensions/memory-wiki/src/query.ts` — vault query with file-system traversal
- `extensions/memory-wiki/src/tool.ts` — tool schemas (wiki_search, wiki_get, wiki_apply, wiki_lint, wiki_status)

### OpenClaw memory infrastructure (also non-MongoDB)
- `packages/memory-host-sdk/src/host/memory-schema.ts` — SQLite schema: memory_index_sources, memory_index_chunks, memory_embedding_cache, memory_index_fts, memory_index_vec
- `packages/memory-host-sdk/src/host/sqlite-vec.ts` — sqlite-vec vector search extension
- `packages/memory-host-sdk/src/host/embeddings.ts` — local embedding provider (node-llama-cpp)
- `extensions/memory-lancedb/` — LanceDB vector store alternative

---

## 5. langchain-mongodb-deepagents-vfs-adapter

**Path:** `/Users/rom.iluz/Dev/langchain-mongodb-deepagents-vfs-adapter`
**What it does:** MongoDB Atlas-backed virtual filesystem search adapter for LangChain DeepAgents. Provides ls/glob/grep over S3-backed documents using MongoDB vector search.

### Key patterns
- **SearchRouter** (`src/deepagents_mongodb_fs/search.py`): ls (prefix aggregation), glob (pattern match), grep ($rankFusion hybrid search with langchain_mongodb pipelines)
- **langchain_mongodb pipelines** — uses `text_search_stage` and `vector_search_stage` from langchain-mongodb
- **Chunker** (`src/deepagents_mongodb_fs/chunker.py`): token-aware chunking for embedding model limits
- **Embedder** (`src/deepagents_mongodb_fs/embedder.py`): LangChain Embeddings wrapper, defaults to OpenAIEmbeddings(dimensions=1024)
- **IndexManager** (`src/deepagents_mongodb_fs/index_manager.py`): Atlas Search index management

### Dependencies
- `pymongo>=4.6.0`
- `langchain-core>=0.2.0`, `langchain-mongodb>=0.4.0,<0.9.0`
- Optional: `langchain-openai>=0.1.0`, `langchain-aws>=0.2.0`

---

## 6. Other Repos (Lower Relevance)

### mbrain-competitors
**Path:** `/Users/rom.iluz/Dev/mbrain-competitors`
Competitor analysis repos: Membench, OpenViking, hindsight, letta, locomo, mastra, mem0, memory-benchmarks, mempalace, openclaw-eval, supermemory, zep. Reference for benchmarking and feature comparison.

### mbrain-oss-review-findings
**Path:** `/Users/rom.iluz/Dev/mbrain-oss-review-findings`
Markdown reports from OSS review of mbrain. Useful for understanding known issues and quality gates.

### hermes-agent
**Path:** `/Users/rom.iluz/Dev/hermes-agent`
Python agent framework with multiple memory plugins: mem0 (Platform + OSS backends), holographic (FTS5 + Jaccard + HRR hybrid), hindsight, honcho, supermemory, byterover, openviking, retaindb. File-backed MEMORY.md/USER.md curated memory. No MongoDB vector search — uses SQLite FTS5 + mem0 API. The MemoryProvider ABC pattern (`plugins/memory/mem0/__init__.py`) is a useful interface reference.

### Archon
**Path:** `/Users/rom.iluz/Dev/Archon`
TypeScript workflow orchestration platform. SQLite-based DB (`packages/core/src/db/`). No MongoDB, no vector search, no knowledge graph. Not relevant.

### RomBot-ClawMongo / ClawMongo-RomBot-Migration
**Path:** `/Users/rom.iluz/Dev/RomBot-ClawMongo`
WhatsApp bot fork of openclaw. Has MongoDB portal connection resolution (`apps/portal/lib/mongodb`). No vector search or knowledge graph.

### boardika
**Path:** `/Users/rom.iluz/Dev/boardika`
Next.js app with MongoDB (users, suppliers, styles). Has Atlas Search index creation (`scripts/ensure-indexes.ts`). No memory/wiki/KG features. Uses `mongodb` npm driver.

### pay4what
**Path:** `/Users/rom.iluz/Dev/pay4what`
Rust project (Cargo.toml). Not relevant.

### cc10x
**Path:** `/Users/rom.iluz/Dev/cc10x`
Python coding agent. Not relevant to MongoDB wiki.

### eve
**Path:** `/Users/rom.iluz/Dev/eve`
TypeScript AI agent framework (Vercel-based). No MongoDB or vector search. Not relevant.

---

## Reuse Recommendations for "LLM Wiki on MongoDB"

### Build directly on mbrain
1. **Reuse the entire memory-engine** as the storage + retrieval layer — it already has entities, relations, episodes, KB, hybrid search, $graphLookup, consolidation
2. **Add wiki-specific collections or extend KB schema** — `wikiSource`, `vault`, `section` fields already exist in KB_SCHEMA and KB_CHUNKS_SCHEMA
3. **Borrow openclaw memory-wiki page schema** (entity/concept/synthesis/source/report kinds, claims with evidence, contradictions, questions, relationships, person cards) as the conceptual model for wiki pages stored in MongoDB
4. **Reuse Hybrid-Search-RAG's GraphRAG patterns** for LLM-based entity extraction and KG construction if mbrain's regex extractor is insufficient
5. **Reuse SDR-AI's langgraph-store-mongodb pattern** if LangGraph agent integration is needed
6. **Reuse langchain-mongodb-deepagents-vfs-adapter** for file-system ingestion (S3 → chunk → embed → MongoDB)

### What's missing (would need to be built)
- Wiki page rendering/compilation layer (openclaw has this but for markdown files, not MongoDB)
- Obsidian/Confluence/Notion sync connectors (mbrain has schema fields but no connectors)
- Claim contradiction detection across pages (openclaw has the schema, mbrain has injection classification but not cross-page contradiction)
- Backlink/dashboard generation (openclaw has `createBacklinks`, `createDashboards` config flags)
