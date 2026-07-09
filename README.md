# Mdbrian

<p align="center">
  <img src="./docs/assets/README-hero.png" alt="Mdbrian - MongoDB-native long-term AI memory" width="100%">
</p>

<p align="center">
  <strong>MongoDB-native Company Brain memory framework for AI apps, agents, and teams.</strong>
</p>

<p align="center">
  <a href="./apps/docs/quickstart.mdx">Quickstart</a> ·
  <a href="./apps/docs/concepts/framework.mdx">Framework</a> ·
  <a href="./apps/docs/concepts/architecture.mdx">Architecture</a> ·
  <a href="./apps/docs/api/overview.mdx">API</a> ·
  <a href="https://mdbrian.rom-88f.workers.dev">Live Site</a> ·
  <a href="./docs/benchmarks/BENCHMARKS.md">Benchmarks</a> ·
  <a href="./docs/platform/PRODUCTION-READY.md">Release Gate</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mdbrian/memory"><img alt="@mdbrian/memory npm version" src="https://img.shields.io/npm/v/%40mdbrian%2Fmemory?label=%40mdbrian%2Fmemory"></a>
  <a href="https://www.npmjs.com/package/@mdbrian/client"><img alt="@mdbrian/client npm version" src="https://img.shields.io/npm/v/%40mdbrian%2Fclient?label=%40mdbrian%2Fclient"></a>
  <a href="https://www.npmjs.com/package/@mdbrian/tools"><img alt="@mdbrian/tools npm version" src="https://img.shields.io/npm/v/%40mdbrian%2Ftools?label=%40mdbrian%2Ftools"></a>
</p>

Mdbrian gives AI systems durable Company Brain memory on top of MongoDB. It
stores conversations, facts, procedures, knowledge-base chunks, episodes, and
graph relationships in one MongoDB-backed memory engine, then retrieves context
with vector search, full-text search, and hybrid ranking.

The public repo is intentionally focused: a runnable API, MCP server, TypeScript client, AI SDK tools, web console, docs, Docker MongoDB setup, and release checks.

## Quickstart

Prerequisites:

- Node.js 20+
- Bun 1.2+
- Docker (for the local MongoDB path — uses MongoDB Atlas Local Preview with mongot for Atlas Search)

```bash
git clone https://github.com/romiluz13/mdbrian.git
cd mdbrian
bun install
```

Start MongoDB:

```bash
docker compose -f docker/docker-compose.yml up -d
export MDBRAIN_MONGODB_URI="mongodb://127.0.0.1:27017/?directConnection=true"
export MDBRAIN_API_KEY="local-dev-secret"
# Required for semantic search results below (Atlas Model API key, `al-...` prefix):
export VOYAGE_API_KEY="al-your-atlas-model-api-key"
```

The default Docker file uses MongoDB Atlas Local Preview. Set `VOYAGE_API_KEY`
to a MongoDB Atlas Model API key with the `al-...` prefix when you want MongoDB
auto-embeddings. Without it, you can still use local development paths that do
not require auto-embed.

Start the API:

```bash
cd apps/api
bun run dev
```

In another shell, add and search memory:

```bash
curl -s http://127.0.0.1:3847/health

curl -s http://127.0.0.1:3847/v1/add \
  -H "content-type: application/json" \
  -H "authorization: Bearer local-dev-secret" \
  -d '{"content":"The user prefers TypeScript and concise release notes.","sessionId":"demo-user"}'

curl -s http://127.0.0.1:3847/v1/search \
  -H "content-type: application/json" \
  -H "authorization: Bearer local-dev-secret" \
  -d '{"query":"What does the user prefer?","sessionKey":"demo-user","maxResults":5}'
```

> Semantic search returns `{"results":[]}` until `VOYAGE_API_KEY` is set (see
> above) — embeddings are required to match stored memories by meaning.

For a guided setup, see [Quickstart](apps/docs/quickstart.mdx).

## What You Get

| Surface | Location | Purpose |
|---|---|---|
| HTTP API | `apps/api` | Hono server exposing `/v1/*`, `/health`, and OpenAPI |
| MCP server | `apps/mcp` | stdio adapter for MCP-compatible clients |
| Web console | `apps/web` | Operator UI for the API |
| Docs | `apps/docs` | Public docs |
| Engine | `packages/memory-engine` | MongoDB memory core |
| Bridge | `packages/memory-bridge` | Stable facade over the engine |
| Client SDK | `packages/client` | TypeScript HTTP client |
| AI tools | `packages/tools` | Vercel AI SDK tool helpers |
| Published barrel | `packages/mdbrian-memory` | `@mdbrian/memory` convenience package |

## Memory Framework

Mdbrian's framework contract is:

- Memory taxonomy: episodic events, semantic facts, procedural playbooks,
  profile preferences, workspace knowledge, and provenance.
- Core operations: recall, context bundles, remember, update, forget, feedback,
  and trace.
- Scope model: `session`, `user`, `agent`, `workspace`, `tenant`, and `global`.
- Safety model: read by default; write only on explicit user, app, operator,
  test, or import intent.

See [Memory Framework](apps/docs/concepts/framework.mdx), [Memory Taxonomy](apps/docs/concepts/memory-taxonomy.mdx), and [Company Brain Guide](apps/docs/guides/company-brain.mdx).

## How It Works

```text
App / Agent / MCP client
  -> Mdbrian HTTP API or TypeScript client
  -> Memory bridge
  -> MongoDB memory engine
  -> MongoDB Search, Vector Search, collections, indexes, and telemetry
```

Mdbrian keeps the product interface small while the engine handles:

- Conversation and event memory
- Structured facts and revisions
- Procedure memory
- Knowledge-base ingestion
- Episodes and graph relationships
- Hybrid retrieval across vector and lexical evidence
- Optional high-recall retrieval profiles for evaluation and audit work

## Configuration

Mdbrian reads environment variables and an optional config file at `~/.mdbrian/mdbrian.json`.

Common variables:

| Variable | Purpose |
|---|---|
| `MDBRAIN_MONGODB_URI` | MongoDB connection string |
| `MDBRAIN_API_HOST` | API bind host, default `127.0.0.1` |
| `MDBRAIN_API_PORT` | API port, default `3847` |
| `MDBRAIN_API_KEY` | Recommended bearer token for API requests |
| `MDBRAIN_AGENT_ID` | Default memory isolation key |
| `MDBRAIN_MONGODB_RECALL_PROFILE` | `latency`, `balanced`, or `proof`; default `balanced` |
| `VOYAGE_API_KEY` | Atlas Model API key for MongoDB auto-embed lanes |
| `MDBRAIN_ENRICHMENT_BASE_URL` | Optional OpenAI-compatible or Anthropic endpoint for LLM enrichment |
| `MDBRAIN_ENRICHMENT_API_KEY` | API key for the enrichment endpoint |
| `MDBRAIN_ENRICHMENT_MODEL` | Model used by enrichment when enabled |

OpenAI-compatible enrichment defaults to `Authorization: Bearer`. Gateways that
require provider-specific headers can set
`MDBRAIN_ENRICHMENT_AUTH_STYLE=api-key` or `x-api-key`; gateways that require
newer completion token naming can set
`MDBRAIN_ENRICHMENT_TOKEN_PARAM=max_completion_tokens`.

For managed Atlas and Atlas Local Preview notes, see [Configuration](apps/docs/guides/memory-config.mdx) and [Self-hosting](docs/platform/self-host.md).

## Benchmarks

Mdbrian benchmark evidence is scoped by lane. Current public evidence supports selected MemPalace P0 retrieval-lane comparisons only. Broader ecosystem benchmarks, including Mem0 LongMemEval judged-answer rows, are still under audit. No Mem0 LongMemEval win is claimed.

Read the evidence page before quoting any number: [Benchmark Evidence](docs/benchmarks/BENCHMARKS.md).

Benchmark rules:

- No question-ID tuning.
- No hidden fallback.
- Retrieval recall and judged answer quality are reported separately.
- No broad ecosystem leadership claim is made from one benchmark family.

## Release Gate

Run these checks before publishing packages, tagging a release, or making production claims:

```bash
bun install --frozen-lockfile
bun run check-types
bun run lint
bun run build
bun run test
bun run check-publishability
```

Live validation requires a running API and MongoDB:

```bash
bun run proof-pack
bun run agent-smoke
```

See [Production-ready Checklist](docs/platform/PRODUCTION-READY.md), [Validation Pack](docs/platform/validation-pack.md), and [Publishing](docs/platform/publish.md).

## Packages

```bash
npm install @mdbrian/memory
npm install @mdbrian/client
npm install @mdbrian/tools
```

Package READMEs:

- [@mdbrian/client](packages/client/README.md)
- [@mdbrian/tools](packages/tools/README.md)
- [@mdbrian/memory](packages/mdbrian-memory/README.md)
- [@mdbrian/memory-bridge](packages/memory-bridge/README.md)
- [@mdbrian/memory-engine](packages/memory-engine/README.md)

## License

Apache-2.0. See [LICENSE](LICENSE).
