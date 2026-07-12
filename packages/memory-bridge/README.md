# @mdbrain/memory-bridge

Stable facade over the Mdbrain engine. Use this package when you want one supported entry point for config resolution and engine operations without binding to the HTTP API.

## Install

```bash
npm install @mdbrain/memory-bridge
```

## When to use this package

- You are implementing an HTTP API, MCP server, or custom server around Mdbrain.
- You want one stable layer between app code and the engine.
- You need bridge helpers such as search, write, status, sync, relevance, chain-trace, novelty-scan, and consolidation operations.

## Example

```ts
import { mdbrainBridgeSearch, mdbrainBridgeStatus } from "@mdbrain/memory-bridge"

const status = await mdbrainBridgeStatus({ agentId: "main" })
const results = await mdbrainBridgeSearch({
	query: "deployment notes",
	agentId: "main",
	maxResults: 10,
})
```

## Memory intelligence bridge functions

- `mdbrainBridgeTraceChain()` -- reasoning chain traversal (provenance via `$lookup`)
- `mdbrainBridgeScanNovelty()` -- surprisal novelty detection (Atlas Vector Search centroid)
- `mdbrainBridgeConsolidate()` -- trigger offline consolidation (Dreamer pipeline)

If you are building against the public HTTP surface, prefer [`@mdbrain/client`](../client/README.md).
