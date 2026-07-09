# @mdbrian/memory-bridge

Stable facade over the Mdbrian engine. Use this package when you want one supported entry point for config resolution and engine operations without binding to the HTTP API.

## Install

```bash
npm install @mdbrian/memory-bridge
```

## When to use this package

- You are implementing an HTTP API, MCP server, or custom server around Mdbrian.
- You want one stable layer between app code and the engine.
- You need bridge helpers such as search, write, status, sync, relevance, chain-trace, novelty-scan, and consolidation operations.

## Example

```ts
import { mdbrianBridgeSearch, mdbrianBridgeStatus } from "@mdbrian/memory-bridge"

const status = await mdbrianBridgeStatus({ agentId: "main" })
const results = await mdbrianBridgeSearch({
	query: "deployment notes",
	agentId: "main",
	maxResults: 10,
})
```

## Memory intelligence bridge functions

- `mdbrianBridgeTraceChain()` -- reasoning chain traversal (provenance via `$lookup`)
- `mdbrianBridgeScanNovelty()` -- surprisal novelty detection (Atlas Vector Search centroid)
- `mdbrianBridgeConsolidate()` -- trigger offline consolidation (Dreamer pipeline)

If you are building against the public HTTP surface, prefer [`@mdbrian/client`](../client/README.md).
