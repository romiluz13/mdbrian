# @mbrain/client

TypeScript HTTP client for the Mbrain API. Use this package when you want to call the supported public API from an app, job, or integration.

## Install

```bash
npm install @mbrain/client
```

## When to use this package

- You are talking to `apps/api`.
- You want retrying HTTP requests and a typed client surface.
- You do not need direct engine access.

## Example

```ts
import { MbrainClient } from "@mbrain/client"

const client = new MbrainClient({
	baseUrl: "http://127.0.0.1:3847",
})

await client.add({
	content: "The user prefers concise release notes.",
	sessionId: "main",
})

const results = await client.search({
	query: "What does the user prefer?",
	sessionKey: "main",
})
```

## Memory intelligence methods

- `client.traceChain()` -- reasoning chain traversal (`POST /v1/chain-trace`)
- `client.scanNovelty()` -- surprisal novelty detection (`POST /v1/novelty-scan`)
- `client.consolidate()` -- trigger consolidation agent (`POST /v1/consolidate`)

If you need server-side helpers or direct engine access, use [`@mbrain/memory-bridge`](../memory-bridge/README.md) or [`@mbrain/memory-engine`](../memory-engine/README.md).
