# @mbrain/tools

AI SDK tool helpers for Mbrain. Use this package when you want to expose supported Mbrain operations as Vercel AI SDK tools.

## Install

```bash
npm install @mbrain/tools
```

## When to use this package

- You are wiring Mbrain into an AI SDK agent.
- You want ready-made tool definitions for search, KB search, read, add, write-event, profile, status, chain-trace, novelty-scan, and consolidate.

## Example

```ts
import { MbrainClient } from "@mbrain/client"
import { createMbrainTools } from "@mbrain/tools"

const client = new MbrainClient({ baseUrl: "http://127.0.0.1:3847" })
const tools = createMbrainTools(client)
```

## Memory intelligence tools

- `mbrain_chain_trace` -- reasoning chain traversal (provenance via `$lookup`)
- `mbrain_novelty_scan` -- surprisal novelty detection (Atlas Vector Search centroid)
- `mbrain_consolidate` -- trigger offline consolidation (Dreamer pipeline)

If you need a different agent wrapper or a custom tool set, build on top of [`@mbrain/client`](../client/README.md).
