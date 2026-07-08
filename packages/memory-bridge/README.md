# @mbrain/memory-bridge

Stable facade over the Mbrain engine. Use this package when you want one supported entry point for config resolution and engine operations without binding to the HTTP API.

## Install

```bash
npm install @mbrain/memory-bridge
```

## When to use this package

- You are implementing an HTTP API, MCP server, or custom server around Mbrain.
- You want one stable layer between app code and the engine.
- You need bridge helpers such as search, write, status, sync, relevance, chain-trace, novelty-scan, and consolidation operations.

## Example

```ts
import { mbrainBridgeSearch, mbrainBridgeStatus } from "@mbrain/memory-bridge"

const status = await mbrainBridgeStatus({ agentId: "main" })
const results = await mbrainBridgeSearch({
	query: "deployment notes",
	agentId: "main",
	maxResults: 10,
})
```

## Memory intelligence bridge functions

- `mbrainBridgeTraceChain()` -- reasoning chain traversal (provenance via `$lookup`)
- `mbrainBridgeScanNovelty()` -- surprisal novelty detection (Atlas Vector Search centroid)
- `mbrainBridgeConsolidate()` -- trigger offline consolidation (Dreamer pipeline)

If you are building against the public HTTP surface, prefer [`@mbrain/client`](../client/README.md).
