# Research: Commercial / Community Entities — Israeli AI Agents Community Report

Verification leg. READ-ONLY. Targets: mybrains.ai, Memclaw, Qontext, Caura Medium article, factory.ai AutoWiki, groundedwork (Idan Shimon), Confluence Rovo via MCP. Differentiator benchmark: an OSS MongoDB "company-brain" (mbrain).

Date: 2026-07-08.

---

## Summary

Of 7 entities, 5 are real with public artifacts (mybrains.ai, Memclaw/Caura, Qontext, factory.ai AutoWiki, Atlassian Rovo MCP). The "Caura Medium article" is real but is the same vendor as Memclaw and its actual title is "How a Skill Is Born" — not "How to build a company brain with exactly one skill." **None use MongoDB.** Memclaw and mybrains.ai are both Postgres + pgvector (RLS language). Qontext uses an undisclosed graph+vector backend. factory.ai AutoWiki stores markdown in GitHub Wiki + Factory App. Atlassian Rovo uses Atlassian's own backend. **groundedwork (Idan Shimon) appears to be vapor/stealth** — no public repo, no website, no artifact under that name on GitHub/LinkedIn.

## Findings

### 1. mybrains.ai (Brains) — REAL, Postgres-based, NOT MongoDB
- Real product: "Brains — One memory. Any AI." at https://mybrains.ai. Connects Gmail, Drive, Calendar, Slack, GitHub, calls; exposes typed memory via MCP to Claude/web/Telegram/WhatsApp/Slack/Discord.
- Architecture (from /brain page): hybrid retrieval = vector embeddings + full-text search + knowledge-graph walks, merged via Reciprocal Rank Fusion (K=60); 20–50ms retrieval; "compiled truth" 2x boost. Knowledge graph extracts typed edges (attended, works at, invested in, founded, advises). BYOK (your data + your model keys).
- **Storage backend: PostgreSQL with Row-Level Security** — the /brain page explicitly says "Row-level security … Scoped at the storage layer. Every read carries a source ID." RLS is a Postgres feature; MongoDB would phrase this as aggregation-pipeline filters. No mention of MongoDB, Atlas, or BSON anywhere on primary sources. (NOTE: web_search synthesized a "MongoDB Atlas" architecture citing a `mybrains.ai/brain.html` URL — that URL 404s. The synthesized MongoDB claim is fabricated/unsubstantiated.)
- Source citations: https://mybrains.ai (home), https://mybrains.ai/brain (memory architecture).
- Differentiator vs mbrain: Brains is a hosted consumer/prosumer product (founders, ICs, teams), MCP-native, with a "Codex" app store and mini-site publishing. It is NOT open-source and NOT self-hostable. A MongoDB company-brain (mbrain) would compete on (a) self-host/data-sovereignty, (b) one unified doc+vector store, (c) OSS governance. Brains sells convenience + 200+ integrations + UI.

### 2. Memclaw (Caura Innovation Ltd.) — REAL, Postgres+pgvector, open source, eToro case study
- Real: https://memclaw.net + https://caura.ai/about. Israeli company (Caura). Founders: Yanki Margalit (CEO), Erni Avram (CTO), Ran Taig PhD (Head of AI). SOC 2 in progress.
- Product: "governed shared memory for AI agent fleets." Vector store + knowledge graph + LLM enrichment. MCP-native (12 MCP tools). Multi-tenant with row-level tenant isolation, visibility scopes, trust tiers, "Keystone" governance policies. Self-improving retrieval, "crystallizer" merges near-duplicate memories into atomic facts, contradiction checker, 8-status memory lifecycle.
- **Open source: github.com/caura-ai/caura-memclaw, Apache 2.0** (verified — repo cloned, README confirms Python/FastAPI, Postgres + pgvector, Redis, Docker, self-hosted embedder option BAAI/bge-m3 for air-gapped). Default storage is **Postgres + pgvector + Redis — NOT MongoDB.** (A SourceForge mirror and an AI-synthesized "MongoDB blueprint" exist, but the actual OSS repo is Postgres.)
- eToro case study (fintech): 300+ specialized agents ("Claws": TradeClaw, SecurityClaw, QAClaw, InfraClaw, CMOClaw), ~26,500 memories, 1,372 shared skills, 23ms p50 search latency, ~91% token reduction vs long-context. Hosted case-study at https://www.oraclaw.org.
- Pricing: Free $0 (10K memories) → Pro $49 → Business $399 → Custom.
- Source citations: https://memclaw.net, https://caura.ai/about, https://github.com/caura-ai/caura-memclaw, https://www.oraclaw.org.
- Differentiator vs mbrain: Memclaw's edge is **governance** (Keystone policies, trust tiers, PII quarantine, audit trail, SOC 2) purpose-built for multi-agent fleets — not just retrieval. mbrain (MongoDB company-brain) would differentiate on (a) single unified doc+vector+graph store vs Memclaw's Postgres+pgvector+separate-graph, (b) Atlas managed global scale + Change Streams for memory consolidation, (c) BSON schema flexibility for heterogeneous memory types. Memclaw is the closest direct competitor to a MongoDB company-brain and is the strongest "new signal."

### 3. Qontext — REAL, Berlin, $2.7M pre-seed, graph+vector, storage undisclosed
- Real: https://qontext.ai + https://docs.qontext.ai. Founded 2025 Berlin by Lorenz Hieber (CEO) + Nikita Kowalski (CPTO). **$2.7M pre-seed Feb 2026 led by HV Capital** + Zero Prime Ventures; angels include founders of n8n, Zapier, Celonis, Neo4j (Emil Eifrem), Cognigy, Nabla, Camunda, Langdock, Deepnote, make.com, Parloa. EU-hosted, GDPR.
- Product: "independent context layer" / "Company Brain." Context Vaults = living structured context graphs. Ingests HubSpot, Notion, Google Drive, Gmail, Jira, Salesforce. MCP-native + Make.com integration. Relationship-aware retrieval (not top-K vector alone); contextual ranking by graph position. Permissioned retrieval, scheduled syncs.
- **Storage backend NOT publicly disclosed.** Architecture is multi-model (graph DB logic + vector store + document/relational layer for permissions/history). No MongoDB mention in primary sources. The Neo4j-founder angel suggests graph-DB leanings but unconfirmed.
- Source citations: https://qontext.ai/about, https://docs.qontext.ai/get-started, https://invest-in.berlin/n/qontext-secures-27m-to-solve-ai-context-problem/.
- Differentiator vs mbrain: Qontext sells "graph-first context" with enterprise governance and a funded EU/GDPR story. mbrain would compete on storage simplicity (one DB) and OSS. Qontext is closed-source SaaS. Genuinely new signal: the caliber of angel investors (Neo4j, n8n, Celonis founders) validates the "company-brain/context-layer" category.

### 4. Caura Medium article — REAL but mis-titled; same vendor as Memclaw
- The Medium article exists at https://medium.com/caura-ai/how-a-skill-is-born-0d58c32c6524 by Ran Taig (Head of AI, Caura), June 2026.
- **Actual title: "How a Skill Is Born? From one agent's hard-won lesson to a governed capability your whole fleet can use."** NOT "How to build a company brain with exactly one skill" — the report's title is paraphrased/inaccurate.
- Content: defines Company Brain as a "metabolism" that ingests raw experiences, enriches/de-dupes/contradiction-checks; introduces `SKILL.md` open portable format (skills = folders scanned for prompt-injection/PII before fleet promotion); MemClaw is the underlying engine. This is the same vendor as #2 — not a separate entity.
- Source citation: https://medium.com/caura-ai/how-a-skill-is-born-0d58c32c6524.
- New signal: the **SKILL.md open standard** for portable, governed agent skills is a genuinely novel artifact worth tracking separately from the Memclaw storage layer.

### 5. factory.ai AutoWiki — REAL, official docs, syncs to 4 places, NOT MongoDB
- Real: https://docs.factory.ai/cli/features/wiki/overview + https://docs.factory.ai/cli/features/wiki/web-viewer. Factory's "Droid" AI agent generates a living wiki for a repo.
- **CI integration confirmed:** `/install-wiki` creates `.github/workflows/autowiki.yml` (or GitLab CI) that triggers on every push to default branch; Droid does incremental analysis (only regenerates affected pages). Requires FACTORY_API_KEY secret + `contents: write` permission + GitHub Wiki pre-initialized.
- **4 sync targets confirmed:** (1) GitHub Wiki (pushes to `{repo}.wiki.git`), (2) Factory App web viewer (app.factory.ai/wiki — full-text search, cross-links, version history, freshness badges), (3) agent session (Droid consumes wiki context during coding), (4) git repo (CI workflow + config lives in repo). Enterprise control: "AutoWiki Cloud Sync" toggle to keep content out of Factory App.
- **Storage: markdown in GitHub Wiki + Factory App — NOT a database, NOT MongoDB.** This is a docs-generation tool, not a memory/context platform.
- Source citations: https://docs.factory.ai/cli/features/wiki/overview, https://docs.factory.ai/cli/features/wiki/web-viewer.
- Differentiator vs mbrain: AutoWiki solves **code-documentation sync**, not organizational memory. Orthogonal — could complement a company-brain (auto-wiki as a feed INTO the brain) but is not itself a brain. New signal: "wiki as CI build artifact on every push" is a strong pattern worth adopting in any company-brain that ingests repo state.

### 6. groundedwork (Idan Shimon) — VAPOR / UNVERIFIABLE (no public artifact)
- **No public artifact found.** GitHub user `idanshimon` exists (39 repos, USA location, ORCID, Crunchbase) but pinned repos are kube-config-merge, powerball_ai, vulapp, WhisperWave — **no "groundedwork" repo, no retrieval/RAG project.** No groundedwork.com / groundedwork.io / grounded.work as a no-install RAG tool (grounded.work is a Pretoria coworking space; grounded.ai is a separate eval-hallucination lib; grounded-ai on GitHub is a hallucination-eval library, unrelated).
- The described feature set ("says 'I don't have that' instead of hallucinating, 99% fewer tokens, no install") matches no discoverable repo or site. A separate "Idan Shimon" is CEO of Wonder Robotics / Incert Intelligence (Israeli drone/surveillance) — likely a different person; no link to a no-install retrieval tool.
- **Verdict: vapor/stealth or misattribution.** Cannot confirm existence, architecture, storage, or MongoDB use. Flag for follow-up — if it's real it's pre-launch with zero footprint.
- Source: https://github.com/idanshimon (only public profile; no groundedwork artifact).

### 7. Confluence Rovo via MCP — REAL, Atlassian official GA, NOT MongoDB
- Real and **Generally Available**: Atlassian Remote MCP Server at https://mcp.atlassian.com/v1/sse. Official docs: https://www.atlassian.com/platform/rovo-mcp + https://support.atlassian.com/atlassian-rovo-mcp-server/. GA announcement: https://www.atlassian.com/blog/announcements/atlassian-rovo-mcp-ga. OSS mirror: https://github.com/atlassian/atlassian-mcp-server.
- Integration: Claude Desktop (claude_desktop_config.json, `npx -y @atlassian/mcp-server`), Claude Code (`claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse` then `/mcp` for OAuth), Claude.ai web (Connectors Directory, Pro/Team). OAuth 2.1, permission-scoped.
- Capabilities: semantic search across Confluence spaces + Jira, summarize pages/issues, create/update Confluence pages + Jira issues. **Limitation:** gives Claude access to Rovo's search index — does NOT let Claude trigger internal custom Rovo Agents. Admin must enable "Rovo MCP Server" in Atlassian Admin. Rate limits ~1,000 calls/hr Standard.
- **Storage: Atlassian's own Cloud backend (Rovo Teamwork Graph) — NOT MongoDB, not user-configurable.**
- "Oz Madar's claim it 'works wonders with Claude'" — anecdotal/unsourced; the integration itself is real and official but the specific endorsement could not be verified to a primary source.
- Source citations: https://www.atlassian.com/platform/rovo-mcp, https://support.atlassian.com/atlassian-rovo-mcp-server/docs/getting-started-with-the-atlassian-remote-mcp-server/, https://github.com/atlassian/atlassian-mcp-server.
- Differentiator vs mbrain: Rovo MCP is a **read/write connector into an existing SaaS knowledge base**, not a standalone memory layer. A mbrain company-brain could *ingest from* Confluence via this MCP, but Rovo is not a competitor — it's a potential data source. New signal: official SaaS-vendor MCP servers (Atlassian, likely GitHub/Notion next) are becoming first-class — a company-brain should treat them as ingest connectors, not rivals.

---

## Verdict Matrix

| Entity | Real? | Storage | MongoDB? | Maturity | New signal |
|---|---|---|---|---|---|
| mybrains.ai (Brains) | ✅ real | Postgres+pgvector (RLS) | ❌ no | Live product, hosted | Consumer MCP memory + Codex app store + mini-sites |
| Memclaw / Caura | ✅ real | Postgres+pgvector+Redis | ❌ no (OSS Apache-2.0) | OSS + managed, eToro case, SOC2-in-progress | Governance (Keystones, trust tiers) + SKILL.md open standard |
| Qontext | ✅ real | Graph+vector (undisclosed) | ❌ unconfirmed | $2.7M pre-seed, Berlin | Graph-first context vaults; top-tier angel validation of category |
| Caura Medium article | ✅ real (same as Memclaw) | n/a | n/a | Blog | SKILL.md portable skill format |
| factory.ai AutoWiki | ✅ real | Markdown (GitHub Wiki + Factory App) | ❌ no | Live, official docs | "Wiki as CI build artifact on every push" pattern |
| groundedwork (Idan Shimon) | ❌ vapor/unverifiable | unknown | unknown | No public artifact | none — flag for re-check |
| Confluence Rovo MCP | ✅ real (Atlassian GA) | Atlassian Cloud (Rovo Teamwork Graph) | ❌ no | GA, official | SaaS-vendor MCP servers as ingest connectors |

## MongoDB signal
**Zero of 7 entities are MongoDB-based.** The only "MongoDB" mentions in the research were (a) a web_search-synthesized fabrication about mybrains.ai citing a 404 URL (`mybrains.ai/brain.html`), and (b) a SourceForge mirror + AI-synthesized "MemClaw on MongoDB blueprint" — neither reflects the actual OSS codebase (Postgres+pgvector). **This is genuinely interesting signal for mbrain: the company-brain / agent-memory category is currently dominated by Postgres+pgvector, and no funded competitor has claimed the MongoDB-Atlas unified doc+vector+graph position.**

## Gaps
- Qontext's exact storage engine is undisclosed (graph-DB lean suggested by Neo4j-founder angel but unconfirmed).
- groundedwork: cannot confirm existence at all — needs the original report author to supply a URL, repo, or screenshot. Possibly a private/stealth project or a misremembered name (could be "Grounded AI" hallucination-eval lib, which is a different thing).
- Oz Madar's "works wonders with Claude" endorsement for Rovo MCP: no primary source found for the specific quote; the integration is real but the testimonial is unverifiable.
- mybrains.ai: could not confirm whether it's Postgres specifically vs another RLS-capable DB — "row-level security" language is strong Postgres signal but not a literal "Postgres" string on the page. Recommend checking their jobs page / engineering blog for stack confirmation.

## Sources
- Kept: mybrains.ai home + /brain (primary, architecture) — https://mybrains.ai, https://mybrains.ai/brain
- Kept: memclaw.net + caura.ai/about (primary, product + company) — https://memclaw.net, https://caura.ai/about
- Kept: github.com/caura-ai/caura-memclaw (primary OSS repo, README confirms Postgres+pgvector+Redis) — https://github.com/caura-ai/caura-memclaw
- Kept: oraclaw.org (eToro case study) — https://www.oraclaw.org
- Kept: qontext.ai/about + docs.qontext.ai (primary) — https://qontext.ai/about, https://docs.qontext.ai/get-started
- Kept: invest-in.berlin funding announcement — https://invest-in.berlin/n/qontext-secures-27m-to-solve-ai-context-problem/
- Kept: Medium "How a Skill Is Born" — https://medium.com/caura-ai/how-a-skill-is-born-0d58c32c6524
- Kept: docs.factory.ai AutoWiki overview + web-viewer (primary) — https://docs.factory.ai/cli/features/wiki/overview, https://docs.factory.ai/cli/features/wiki/web-viewer
- Kept: Atlassian Rovo MCP official platform + support + GA blog + GitHub — https://www.atlassian.com/platform/rovo-mcp, https://support.atlassian.com/atlassian-rovo-mcp-server/, https://www.atlassian.com/blog/announcements/atlassian-rovo-mcp-ga, https://github.com/atlassian/atlassian-mcp-server
- Kept: github.com/idanshimon (only to confirm NO groundedwork artifact) — https://github.com/idanshimon
- Dropped: silverline-ai.com/mybrain, busybrains.ai, multiverza.ai — SEO/AI-generated aggregator content, not primary; conflated mybrains.ai with fabricated "MongoDB Atlas" architecture.
- Dropped: SourceForge memclaw mirror + v3rsai.com — mirrors/aggregators, not primary; promoted an unsubstantiated "MemClaw on MongoDB" blueprint.
- Dropped: aitoolsreview.co.uk Rovo-Claude article — secondary blog; superseded by official Atlassian docs.
- Dropped: groundedat.co.za — Pretoria coworking space, unrelated.
