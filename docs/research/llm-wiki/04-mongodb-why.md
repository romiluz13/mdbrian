# Why MongoDB Atlas Is a Superior Backend for an LLM Wiki / Company Brain

An evidence-based argument for building an OSS "LLM wiki on MongoDB" rather than gluing together a vector DB + graph DB + metadata store.

---

## 0. Executive Summary

The biggest pain point in the LLM-wiki / agent-knowledge-base category is **knowledge decay**: facts get stale, contradictory, and hard to update at scale while remaining queryable across three axes simultaneously — **semantic** (what does this mean?), **structured** (how is this related to what else?), and **temporal** (when was this true?). The typical solution glues together three specialized databases (vector DB + graph DB + metadata/relational DB) with fragile CDC/ETL pipelines, creating an "inconsistency window" where one store is updated and another isn't — the root cause of ghost retrievals and confident hallucinations. **MongoDB Atlas uniquely collapses all three axes into one operational system**: document model for structure, `$vectorSearch` + Atlas Search for semantic, Time Series + point-in-time reads for temporal, Change Streams for freshness, and `$rankFusion` / `$graphLookup` for hybrid retrieval — all in one database, one API, one consistency boundary.

---

## 1. Atlas Vector Search ($vectorSearch) — HNSW, Hybrid, Filtered

### What it is
Atlas Vector Search performs Approximate Nearest Neighbor (ANN) search using **HNSW (Hierarchical Navigable Small World)** indexes via the `$vectorSearch` aggregation stage. Key parameters include `index`, `path`, `queryVector`, `numCandidates`, and `limit`. As of 2025-2026, MongoDB also supports **Exact Nearest Neighbor (ENN)** search via `exact: true` for small datasets or high-precision benchmarking, and **Flat Indexes** optimized for filtered/multi-tenant workloads with high selectivity.
- [MongoDB Vector Search Overview](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/)
- [Run Vector Search Queries](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/)

### Why "vector + filter in one query" beats separate vector DB + metadata store
The decisive architectural advantage is that **the embedding lives inside the same document as the metadata it describes**. A single `$vectorSearch` stage accepts a `filter` clause that applies structured predicates (tenant, date range, entity type, permissions) *before or during* the ANN search, so the vector index never returns documents that would be filtered out downstream. This eliminates the two-phase anti-pattern where a dedicated vector DB returns top-K candidates by similarity, then a separate metadata store filters them — potentially leaving zero results after filtering and requiring re-query with expanded K.

**Comparison:** Dedicated vector DBs (Pinecone, Milvus, Weaviate) store vectors separately from business data, requiring constant ETL/CDC synchronization. Metadata filtering on dedicated vector DBs can be a bottleneck at scale, whereas MongoDB's unified model applies filters within the same query boundary.
- [Zilliz: MongoDB Atlas vs Pinecone](https://zilliz.com/comparison/mongodb-atlas-vs-pinecone)
- [Liveblocks: Best Vector DB for AI Products](https://liveblocks.io/blog/whats-the-best-vector-database-for-building-ai-products)

### Hybrid retrieval with $rankFusion (RRF)
MongoDB 8.0+ introduced `$rankFusion` (Reciprocal Rank Fusion) and `$scoreFusion` (weighted score combination) as native aggregation stages. `$rankFusion` takes multiple sub-pipelines (e.g., an Atlas Search full-text pipeline and a `$vectorSearch` semantic pipeline) and fuses their ranked results using the RRF formula: `Score = Σ Weight/(Rank + 60)`. It automatically deduplicates documents appearing in multiple sub-pipelines by `_id`. This means hybrid retrieval (keyword + semantic + graph) is a **single aggregation pipeline**, not application-layer glue code.
- [$rankFusion docs](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion/)
- [Hybrid Search Tutorial](https://www.mongodb.com/docs/atlas/atlas-vector-search/tutorials/reciprocal-rank-fusion/)

---

## 2. Document Model Advantage for Knowledge Graphs / Wikis

### Polymorphic entities in one collection
A company brain stores heterogeneous entity types — person, company, concept, event, document — in the same collection. MongoDB's flexible schema handles this natively: each document can have a `type` discriminator field and completely different field sets, while sharing a common interface (`_id`, `name`, `embedding`, `edges`, `valid_from`, `valid_to`). In a rigid SQL store, this requires either a wide table full of NULLs, an entity-attribute-value (EAV) pattern (notoriously slow to query), or table-per-type (no unified search).

### Nested arrays for edges — no JOIN explosion
Relationships (edges) can be stored as nested arrays within the entity document: `edges: [{type: "works_at", target: ObjectId(...), since: ISODate(...), until: ISODate(...)}]`. For a wiki where most queries traverse 1-2 hops, this avoids the N+1 JOIN explosion of relational stores and the operational overhead of a separate graph DB. The **Schema Versioning Pattern** (`schemaVersion` field + lazy migration) handles evolution without big-bang migrations.
- [MongoDB Schema Versioning Pattern](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/schema-versioning/)
- [MongoDB Building with Patterns: Schema Versioning](https://www.mongodb.com/company/blog/building-with-patterns-the-schema-versioning-pattern)

### Schema validation guardrails
MongoDB's `$jsonSchema` validator provides a middle ground: enforce required fields and types on critical fields (e.g., `email`, `type`, `status`) while leaving `additionalProperties: true` so developers can add new fields without a migration. `validationLevel: "moderate"` enforces rules on new documents only, perfect for evolving legacy collections. `validationAction` can be `"warn"` (log) or `"error"` (reject). This is guardrails, not a straitjacket.
- [MongoDB JSON Schema Tips](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/json-schema-tips/)

### Tradeoff: unbounded arrays
MongoDB's own documentation warns against the **unbounded array anti-pattern**: if an entity accumulates thousands of edges, the document grows beyond the 16MB BSON limit and degrades read performance. For high-degree nodes, use the **Extended Reference Pattern** (store edges in a separate collection with `$graphLookup` to traverse) or the **Subset Pattern** (store recent/frequent edges inline, overflow to a separate collection).
- [MongoDB: Unbounded Arrays Anti-Pattern](https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/)

---

## 3. Atlas Search (Lucene) — Full-Text, Fuzzy, Autocomplete, Faceted

### One engine, many retrieval modes
Atlas Search is an embedded Apache Lucene-based full-text search engine that runs alongside MongoDB — "eliminates the need to run a separate search system alongside your database." It is queried via the `$search` and `$searchMeta` aggregation pipeline stages, meaning it composes natively with `$vectorSearch`, `$graphLookup`, `$rankFusion`, and any other pipeline stage.
- [MongoDB Search Overview](https://www.mongodb.com/docs/atlas/atlas-search/)

### Capabilities
- **Full-text search** with BM25 scoring and customizable boosting/decay functions
- **Fuzzy matching** (edit-distance tolerance for typos)
- **Autocomplete** (search-as-you-type with partial word prediction)
- **Faceted search** (`facet` collector for grouping results by value/range — essential for wiki navigation: filter by entity type, date, source)
- **Synonym maps** (domain-specific synonyms: "AI" ↔ "artificial intelligence" ↔ "ML")
- **Custom analyzers** (tokenization, normalization, stemming — language-specific)
- **Geo search** (if entities have locations)
- **Paginated results** (`searchAfter` / `searchBefore` tokens)

### Hybrid retrieval in one pipeline
The critical point: Atlas Search and Vector Search run in the **same aggregation pipeline**. You can `$rankFusion` a `$search` (keyword + fuzzy + autocomplete) sub-pipeline with a `$vectorSearch` sub-pipeline, weight them, deduplicate, and return a single ranked list — no application-layer result merging, no separate Elasticsearch cluster to sync.
- [MongoDB Search: Text Operator](https://www.mongodb.com/docs/atlas/atlas-search/text/)
- [MongoDB Search: Autocomplete](https://www.mongodb.com/docs/search/query/operators-collectors/autocomplete/)
- [MongoDB Search: Facet](https://www.mongodb.com/docs/search/query/operators-collectors/facet/)

---

## 4. Change Streams — Real-Time Wiki Updates, Event-Driven Re-Embedding

### No separate message bus
MongoDB Change Streams provide a **resumable, filterable CDC stream** built into the database — no Kafka, no Debezium, no separate message bus. You open a `watch()` cursor on a collection and receive `insert`, `update`, `replace`, `delete` events in real time, with `fullDocument: "updateLookup"` to get the complete document state on every change.
- [MongoDB Change Streams docs](https://www.mongodb.com/docs/manual/changeStreams/)

### Event-driven re-embedding
When a wiki entity is edited, a Change Stream listener:
1. Receives the change event with the full document
2. Re-chunks and re-embeds the text via an embedding model (Voyage AI, OpenAI, or local Ollama)
3. Writes the new embedding back into the **same document** — making the update atomic (document + vector update together, no sync window)

### MongoDB Atlas Automated Embedding
Atlas now offers **Automated Embedding** (2025-2026): define a vector index with field type `autoEmbed`, and Atlas automatically detects document changes, sends text to Voyage AI, and refreshes the vector index — zero code required. This is the "no synchronization tax" path.
- [MongoDB Automated Embedding Overview](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/overview/)
- [MongoDB: Automated Embedding Public Preview](https://www.mongodb.com/products/updates/now-in-public-preview-automated-embedding-in-mongodb-vector-search-on-atlas/)

### Filtering and fault tolerance
Change Streams support **aggregation pipeline filters** — e.g., `$match: { "updateDescription.updatedFields.content": { $exists: true } }` to ignore metadata-only changes. **Resume tokens** provide exactly-once semantics: store the token, and on crash, resume from the exact position.
- [Building Real-Time ETL with MongoDB Change Streams](https://medium.com/@firmanbrilian/building-real-time-etl-pipelines-with-mongodb-change-streams-92ee38974070)

---

## 5. Time Series + Versioning — Temporal Knowledge

### Bitemporal data management
A knowledge base needs to answer "when was this fact true?" MongoDB supports bitemporal data:
- **Valid Time** (when the fact was true in the real world): stored as the `timeField` in a Time Series collection, or as `valid_from` / `valid_to` fields on entity documents
- **Transaction Time** (when the database recorded the fact): provided by **`$clusterTime`**, MongoDB's cluster-wide logical clock

### Point-in-time reads
Since MongoDB 5.0, you can perform **point-in-time reads** using `readConcern: { level: "snapshot", atClusterTime: <Timestamp> }`. This queries the database exactly as it existed at a specific moment — "time travel" without a full restore. Limitation: the snapshot history window defaults to 300 seconds (`minSnapshotHistoryWindowInSeconds`); for longer lookback, increase the window (at cost of cache/storage) or use continuous backups.
- [MongoDB: Read Concern Snapshot](https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/)

### Time Series collections
Time Series collections (MongoDB 5.0+) use an underlying columnar storage format with time-ordered writes, reducing disk usage and I/O for temporal queries. MongoDB 6.3+ auto-creates a compound index on `metaField` + `timeField`. Use these for high-volume temporal signals (entity mention frequency, fact-change events, access logs) — not for the entity documents themselves.
- [MongoDB Time Series Collections](https://www.mongodb.com/docs/manual/core/timeseries-collections/)

### Document versioning pattern
For entity-level versioning (tracking how a wiki page evolved), use the **Schema Versioning Pattern**: store `schemaVersion` and `valid_from`/`valid_to` on each document, or insert new versions as separate documents and query with `$sort` + `$last` to get the current version. The "Correction Pattern" (insert a new measurement rather than updating the old one) preserves audit history.
- [MongoDB Bitemporal Data Management](https://medium.com/mongodb/mongodb-a-case-study-in-bitemporal-data-management-addressing-challenges-in-high-frequency-2417419f1500)

---

## 6. Aggregation Pipeline — $rankFusion, $scoreFusion, $unionWith, $graphLookup

### Graph traversal over a doc store — without a graph DB
**`$graphLookup`** performs recursive searches across a collection following a `connectFromField` → `connectToField` linkage, up to a `maxDepth`. It's the core of graph traversal in MongoDB — find all sub-entities of a concept, trace an org chart, follow citation chains. Combined with `$rankFusion`, you can fuse semantic search results with graph-traversal results in one pipeline.
- [$graphLookup docs](https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphlookup/)

### $unionWith for cross-collection fusion
`$unionWith` merges results from a different collection into the pipeline — essential when entities are split across collections (people, companies, documents) but need unified ranking. Combined with `$rankFusion`, you can run parallel `$vectorSearch` on each collection and fuse the results.

### $scoreFusion for custom scoring
When scores are normalized (0-1), `$scoreFusion` provides a weighted average — useful for combining semantic similarity with a custom relevance signal (e.g., freshness decay, authority score, citation count).

### Honest constraint
`$rankFusion` and `$scoreFusion` require **MongoDB 8.0+**. All sub-pipelines within `$rankFusion` must operate on the same collection (use `$unionWith` or `$lookup` inside sub-pipelines for cross-collection data).
- [$rankFusion docs](https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankfusion/)

---

## 7. Multi-Tenant Isolation

### Logical isolation with tenant_id + compound index
The most scalable multi-tenant pattern: one shared collection, every document has a `tenant_id` field, and vector search queries include `filter: { tenant_id: "XYZ" }` as a pre-filter. This ensures the ANN algorithm only considers documents belonging to that tenant.
- [MongoDB: Multi-Tenant Vector Search Architecture](https://www.mongodb.com/docs/vector-search/deployment/multi-tenant-architecture/)
- [MongoDB: Build Multi-Tenant Architecture](https://www.mongodb.com/docs/atlas/build-multi-tenant-arch/)

### Flat Indexes for small per-tenant datasets
For applications with many small tenants (<10,000 vectors each), **Flat Indexes** (introduced 2026) are specifically optimized for high-selectivity filtered search — they outperform HNSW when the filter narrows the candidate set drastically.

### Field-Level / Queryable Encryption
**Queryable Encryption (QE)** enables equality and range queries on encrypted fields — PII like SSN or email stays encrypted at rest but remains queryable. For multi-tenant cryptographic isolation, use a **unique Data Encryption Key (DEK) per tenant** with **Explicit Encryption** (to avoid connection-pool exhaustion from per-tenant `MongoClient` instances).
- [MongoDB Queryable Encryption](https://www.mongodb.com/docs/manual/core/queryable-encryption/)

### Critical constraint: vector fields cannot be encrypted
Vector search requires mathematical operations (cosine similarity) on raw float values. Both CSFLE and QE store data as randomized BinData blobs, making vector search impossible on encrypted fields. **Best practice**: encrypt sensitive plaintext fields (PII), store embeddings in plaintext, enforce tenant isolation via `tenant_id` pre-filters.

---

## 8. Operational Maturity — Backups, Sharding, Replication, Tiered Storage

### What Atlas provides that bolt-on vector DBs don't
- **Continuous Cloud Backups with PITR**: Point-in-Time Recovery with RPO as low as 1 minute — rarely found in early-stage vector databases. Backup covers both application data and vectors simultaneously (one system, one backup).
- **Automated Sharding**: Horizontal scaling managed through UI/API; Atlas handles chunk migration and rebalancing. Native, proven at multi-terabyte scale.
- **High-Availability Replication**: Every Atlas cluster is a replica set (typically 3 nodes across AZs) with automatic failover in seconds.
- **Online Archive (tiered storage)**: Automatically moves cold/aged data from SSDs to low-cost S3, while keeping it queryable through a unified Data Federation endpoint. The application doesn't know if data is hot or cold.
- [MongoDB Atlas Backups](https://www.mongodb.com/docs/atlas/architecture/current/backups/)
- [MongoDB Atlas vs Self-Hosted Cost Management](https://oneuptime.com/blog/post-2026-03-31-mongodb-atlas-vs-self-hosted-cost-management/view)

### The "one backup" argument
In a 3-system stack (vector DB + graph DB + metadata DB), you need 3 backup strategies, 3 monitoring dashboards, 3 IAM configurations, and 3 disaster recovery plans. In MongoDB Atlas, a single backup policy covers all data — structured metadata, vector embeddings, graph edges, temporal versions — because they all live in one database.

---

## 9. The Category's Biggest Pain Point — and How MongoDB Solves It

### The pain point: Knowledge Decay at Scale
The biggest technical hurdle in production RAG/knowledge bases is not retrieval speed or model size — it's the **Staleness Gap**: the divergence between evolving source data and the static, vectorized snapshots used for inference. At scale, this manifests as:
- **Silent failures**: RAG evaluations pass because the model is "faithful" to retrieved context, even if that context is outdated
- **Contradictory overlap**: New documents ("Policy 2026") are added but old ones ("Policy 2024") aren't removed; vector similarity may rank the old version higher due to keyword density
- **~60% failure rate**: Industry reports suggest ~60% of enterprise RAG projects fail because they cannot maintain data freshness at scale
- [RAGaboutit: The Knowledge Decay Problem](https://ragaboutit.com/the-knowledge-decay-problem-how-to-build-rag-systems-that-stay-fresh-at-scale/)
- [RAGaboutit: The Data Pipeline Silent Killer](https://ragaboutit.com/the-data-pipeline-silent-killer-why-your-rag-systems-information-layer-is-rotting-without-you-knowing/)
- [Ranjan Kumar: RAG Index Staleness Gap](https://ranjankumar.in/rag-engineering-index-staleness-gap)

### Why the 3-system stack makes this worse
The typical GraphRAG/OpenWiki architecture uses:
1. **Vector DB** (Pinecone/Milvus) for semantic similarity — but no logic to resolve "new vs. old"
2. **Graph DB** (Neo4j/FalkorDB) for structured relationships — version edges, overrides
3. **Metadata/Relational Store** (Postgres/RDS) for structured filtering, permissions, lineage

The **fragmentation tax**: updates must propagate to all three systems via CDC/ETL pipelines (Debezium, custom glue code). This creates an **inconsistency window** where one store is updated and another isn't — the root cause of ghost retrievals. A single user query requires semantic search in System A, relationship traversal in System B, and permission check in System C, with the application layer manually joining results. Production research shows the fragmented stack requires ~1000+ lines of glue code and can reduce sync-related code by up to 93% when unified.
- [Solution Architecture: RAG Vector DB Pipelines](https://www.solutionarchitecture.ai/rag-systems-vector-databases-building-retrieval-pipelines-that-actually-work-in-production/)

### How MongoDB's combo solves it in ONE system
| Axis | 3-System Stack | MongoDB Atlas (One System) |
|------|---------------|---------------------------|
| **Semantic** | Vector DB (Pinecone/Milvus) | `$vectorSearch` (HNSW) in same collection |
| **Structured** | Graph DB (Neo4j) | Document model + `$graphLookup` + nested edge arrays |
| **Full-text** | Elasticsearch (4th system!) | Atlas Search (Lucene) — `$search` stage |
| **Temporal** | Custom bitemporal layer | Time Series + `$clusterTime` + point-in-time reads |
| **Freshness** | CDC pipeline (Debezium/Kafka) | Change Streams — built-in, resumable, filterable |
| **Hybrid ranking** | Application-layer merge | `$rankFusion` (RRF) / `$scoreFusion` — native stage |
| **Multi-tenant** | Per-system isolation logic | `tenant_id` pre-filter + per-tenant DEK |
| **Backup/DR** | 3 backup strategies | 1 backup policy (PITR) |
| **Consistency** | Eventual (sync lag) | Strong (single transaction boundary) |

**The atomic update argument**: When a wiki entity is edited in MongoDB, the document text, its metadata, and (via Change Stream → re-embed) its vector embedding all update within the same system. There is no "sync window" where the vector DB has old embeddings and the metadata DB has new text. This is the single strongest argument for MongoDB as an LLM wiki backend.

---

## 10. Honest Gaps and Tradeoffs

### Gap 1: Graph traversal depth — $graphLookup vs Neo4j
MongoDB's `$graphLookup` performs **index-based lookups** (simulating joins) per hop, while Neo4j uses **index-free adjacency** (following physical pointers). Practical sweet spot for `$graphLookup` is **1-3 hops**; beyond 5 hops, CPU and index overhead make it unusable for real-time queries. The traditional 100MB memory cap can be mitigated with `allowDiskUse: true` (v5.0+) at the cost of I/O latency. Neo4j handles 10+ hop queries in milliseconds via Quantified Path Patterns. **If your wiki's primary query pattern is deep multi-hop relationship discovery ("how are these two entities connected across 6+ steps?"), MongoDB is the wrong tool.**
- [PuppyGraph: MongoDB vs Neo4j](https://puppygraph.com/blog/mongodb-vs-neo4j)
- [Reddit: Is MongoDB $graphLookup suitable for GraphRAG?](https://www.reddit.com/r/LLMDevs/comments/1c8rhsl/is_mongodb_graphlookup_suitable_for_graph_rag_in/)

### Gap 2: No native graph query language
MongoDB has no Cypher-equivalent. Graph queries are expressed as aggregation pipelines (`$graphLookup`, `$match`, `$unwind`), which are more verbose and less declarative than Cypher/Gremlin for complex path patterns. This is an ergonomics gap, not a capability gap for shallow traversals.

### Gap 3: Embedding model — Voyage (acquired) or third-party
MongoDB acquired Voyage AI (2025) and now offers Automated Embedding with Voyage-4 models. However, if you need specialized models (medical embeddings, audio-to-vector, latest OpenAI/Anthropic models), you must use the **manual embedding path** — bringing back pipeline management overhead (though still within one database, not across three). The automated path is largely locked into the Voyage ecosystem.
- [MongoDB Automated Embedding](https://www.mongodb.com/docs/vector-search/crud-embeddings/automated-embedding/overview/)
- [Constellation Research: MongoDB adds Voyage Embeddings](https://www.constellationr.com/insights/news/mongodb-adds-automated-voyage-embeddings-atlas-vector-search)

### Gap 4: Billion-scale vector throughput
MongoDB's HNSW is competitive for small-to-medium datasets (millions of vectors). At **billion-vector scale**, dedicated vector databases (Milvus/Zilliz, Pinecone) still hold a throughput and p99 latency advantage because their entire storage engine is purpose-built for vector math. MongoDB also requires **separate Search Nodes** (dedicated infrastructure isolating search from CRUD) for production-grade performance, adding cost.
- [Vector Databases 2026: Scale Limits and Architecture Tradeoffs](https://www.marktechpost.com/2026/05/10/best-vector-databases-in-2026-pricing-scale-limits-and-architecture-tradeoffs-across-nine-leading-systems/)
- [MongoDB Vector Search Benchmark](https://www.mongodb.com/docs/vector-search/benchmark/overview/)

### Gap 5: Quantization rescoring overhead
MongoDB uses scalar and binary quantization to save memory. Binary quantization significantly degrades accuracy, requiring a mandatory **rescoring step** (fetching full-fidelity vectors from disk to re-rank top results), which adds latency compared to databases using more efficient hardware-accelerated quantization (Product Quantization).

### Gap 6: Unbounded arrays
The document model's strength (nested edge arrays) becomes a liability for high-degree nodes. Entities with thousands of relationships hit the 16MB BSON limit and degrade read performance. Must use the Extended Reference or Subset Pattern — adding design complexity that a graph DB handles natively.
- [MongoDB: Unbounded Arrays Anti-Pattern](https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/)

---

## 11. Conclusion: The Strongest MongoDB-Only Argument

**MongoDB Atlas is the only system that solves semantic retrieval ($vectorSearch + Atlas Search), structured relationships (document model + $graphLookup), temporal versioning (Time Series + $clusterTime + point-in-time reads), and real-time freshness (Change Streams) within a single database, single API, and single consistency boundary.** Every alternative requires gluing 2-4 specialized databases together with fragile CDC pipelines — and the synchronization gap between those systems is precisely where knowledge bases decay, contradict themselves, and hallucinate. For an OSS "LLM wiki on MongoDB," the atomic-update property (edit text → Change Stream fires → re-embed → vector + metadata + edges all consistent in one system) is the category-defining advantage that no 3-system stack can match.

The honest tradeoff: if your wiki's primary workload is deep graph traversal (5+ hops) or billion-scale vector search, you need a specialized graph DB or vector DB respectively. But for the 90% case — a company brain with polymorphic entities, hybrid search, temporal facts, and real-time updates at million-entity scale — MongoDB Atlas collapses the stack and eliminates the fragmentation tax.
