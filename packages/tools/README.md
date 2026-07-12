# @mdbrain/tools

AI SDK tool helpers for Mdbrain. Use this package when you want to expose supported Mdbrain operations as Vercel AI SDK tools.

## Install

```bash
npm install @mdbrain/tools
```

## When to use this package

- You are wiring Mdbrain into an AI SDK agent.
- You want ready-made tool definitions for search, KB search, read, add, write-event, profile, status, chain-trace, novelty-scan, and consolidate.

## Example

```ts
import { MdbrainClient } from "@mdbrain/client"
import { createMdbrainTools } from "@mdbrain/tools"

const client = new MdbrainClient({ baseUrl: "http://127.0.0.1:3847" })
const tools = createMdbrainTools(client)
```

## Memory intelligence tools

- `mdbrain_chain_trace` -- reasoning chain traversal (provenance via `$lookup`)
- `mdbrain_novelty_scan` -- surprisal novelty detection (Atlas Vector Search centroid)
- `mdbrain_consolidate` -- trigger offline consolidation (Dreamer pipeline)

If you need a different agent wrapper or a custom tool set, build on top of [`@mdbrain/client`](../client/README.md).
