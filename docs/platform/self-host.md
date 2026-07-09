# Self-host Mdbrian

Mdbrian is data-plane memory you run next to your agents. This runbook describes the supported Mdbrian deployment layout for managed Atlas cloud and the local Atlas Preview parity stack.

## Components

1. MongoDB via managed Atlas cloud or `mongodb/mongodb-atlas-local:preview`.
2. `apps/api` - stateless HTTP service.
3. Optional: `apps/web` and `apps/mcp`.

## Configuration

- `MDBRAIN_MONGODB_URI` - required for standalone API processes.
- `MDBRAIN_API_KEY` - set in any untrusted network.
- `MDBRAIN_API_SCOPED_KEYS` - optional JSON policy for narrower bearer tokens bound to explicit `agentId`, `scope`, and `scopeRef` values.
- `MDBRAIN_API_PORT` / `MDBRAIN_API_HOST` - bind address for `apps/api`.
- `VOYAGE_API_KEY` - required for auto-embed and hybrid retrieval quality. Use an Atlas Model key with the `al-...` prefix.

Optional file config: `~/.mdbrian/mdbrian.json` or `MDBRAIN_CONFIG_PATH`. See `apps/docs/guides/memory-config.mdx`.

## MongoDB runtimes

Managed Atlas cloud:

```bash
export MDBRAIN_MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=mdbrian"
export VOYAGE_API_KEY="al-your-atlas-model-api-key"
```

Atlas Local Preview:

```bash
export VOYAGE_API_KEY="al-your-atlas-model-api-key"
docker compose -f docker/mongodb/docker-compose.preview.yml up -d
export MDBRAIN_MONGODB_URI="mongodb://127.0.0.1:27017/?directConnection=true"
```

Use managed Atlas cloud for benchmark/control runs and Atlas Local Preview for local reproducibility.

## Running the API

```bash
cd /opt/mdbrian
bun install --frozen-lockfile
export MDBRAIN_MONGODB_URI="mongodb://..."
export MDBRAIN_API_HOST="0.0.0.0"
cd apps/api && bun run start
```

Put TLS termination and your preferred ingress in front of `apps/api` when exposing it outside localhost.

## Scoped API keys

`MDBRAIN_API_KEY` is the admin bearer token. For agent-facing integrations, prefer a scoped token so a valid client cannot freely choose another agent or memory namespace:

```bash
export MDBRAIN_API_SCOPED_KEYS='[
  {
    "token": "agent-facing-secret",
    "agentIds": ["codex"],
    "scopes": ["workspace"],
    "scopeRefs": ["/opt/workspaces/mdbrian"]
  }
]'
```

Requests using a scoped token must send the matching `agentId`, `scope`, and `scopeRef` explicitly. Use `MDBRAIN_API_KEY` only for admin operators, migrations, and trusted local development.

`MDBRAIN_API_SCOPED_KEYS` is fail-closed: invalid JSON, an empty policy list, or a token without at least one constraint prevents the API from starting. This avoids accidentally exposing `/v1` routes because of a malformed scoped-key config.

## Health checks

- Liveness: `GET /health`
- OpenAPI: `GET /openapi.json`
- Memory status: `GET /v1/status`
- Contract proof: `bun run proof-pack`

## MCP

MCP is stdio; the host process spawns `apps/mcp` and sets `MDBRAIN_API_URL` to your API base URL.
