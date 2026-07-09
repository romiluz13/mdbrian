# @mdbrian/tools

AI SDK tool helpers for Mdbrian. Use this package when you want to expose supported Mdbrian operations as Vercel AI SDK tools.

## Install

```bash
npm install @mdbrian/tools
```

## When to use this package

- You are wiring Mdbrian into an AI SDK agent.
- You want ready-made tool definitions for search, KB search, read, add, write-event, profile, status, chain-trace, novelty-scan, and consolidate.

## Example

```ts
import { MdbrianClient } from "@mdbrian/client"
import { createMdbrianTools } from "@mdbrian/tools"

const client = new MdbrianClient({ baseUrl: "http://127.0.0.1:3847" })
const tools = createMdbrianTools(client)
```

## Memory intelligence tools

- `mdbrian_chain_trace` -- reasoning chain traversal (provenance via `$lookup`)
- `mdbrian_novelty_scan` -- surprisal novelty detection (Atlas Vector Search centroid)
- `mdbrian_consolidate` -- trigger offline consolidation (Dreamer pipeline)

If you need a different agent wrapper or a custom tool set, build on top of [`@mdbrian/client`](../client/README.md).
