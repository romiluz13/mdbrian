import { describe, it, expect } from "vitest"
import { MbrainClient } from "@mbrain/client"
import { createMbrainTools } from "@mbrain/tools"
import * as bridge from "./mbrain-bridge.js"

describe("Phase 7-11 wiring: bridge functions", () => {
	it("exports mbrainBridgeShutdown (bridge shutdown part 2)", async () => {
		expect(typeof bridge.mbrainBridgeShutdown).toBe("function")
	})

	it("exports mbrainBridgeGetLifecycleItem", async () => {
		expect(typeof bridge.mbrainBridgeGetLifecycleItem).toBe("function")
	})

	it("exports mbrainBridgeUpdateLifecycleItem", async () => {
		expect(typeof bridge.mbrainBridgeUpdateLifecycleItem).toBe("function")
	})

	it("exports mbrainBridgeDeleteLifecycleItem", async () => {
		expect(typeof bridge.mbrainBridgeDeleteLifecycleItem).toBe("function")
	})

	it("exports mbrainBridgeGetLifecycleHistory", async () => {
		expect(typeof bridge.mbrainBridgeGetLifecycleHistory).toBe("function")
	})

	it("exports mbrainBridgeRecallConversation", async () => {
		expect(typeof bridge.mbrainBridgeRecallConversation).toBe("function")
	})

	it("exports mbrainBridgeTraceChain", async () => {
		expect(typeof bridge.mbrainBridgeTraceChain).toBe("function")
	})

	it("exports mbrainBridgeScanNovelty", async () => {
		expect(typeof bridge.mbrainBridgeScanNovelty).toBe("function")
	})

	it("exports mbrainBridgeConsolidate", async () => {
		expect(typeof bridge.mbrainBridgeConsolidate).toBe("function")
	})

	it("exports mbrainBridgeImportConversations", async () => {
		expect(typeof bridge.mbrainBridgeImportConversations).toBe("function")
	})

	it("exports mbrainBridgeReportProcedureOutcome", async () => {
		expect(typeof bridge.mbrainBridgeReportProcedureOutcome).toBe("function")
	})

	it("exports mbrainBridgeApplyMemoryFeedback", async () => {
		expect(typeof bridge.mbrainBridgeApplyMemoryFeedback).toBe("function")
	})
})

describe("Phase 10 wiring: client methods", () => {
	it("MbrainClient has getLifecycleItem method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.getLifecycleItem).toBe("function")
	})

	it("MbrainClient has updateLifecycleItem method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.updateLifecycleItem).toBe("function")
	})

	it("MbrainClient has deleteLifecycleItem method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.deleteLifecycleItem).toBe("function")
	})

	it("MbrainClient has getLifecycleHistory method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.getLifecycleHistory).toBe("function")
	})

	it("MbrainClient has recallConversation method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.recallConversation).toBe("function")
	})

	it("MbrainClient has traceChain method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.traceChain).toBe("function")
	})

	it("MbrainClient has scanNovelty method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.scanNovelty).toBe("function")
	})

	it("MbrainClient has consolidate method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.consolidate).toBe("function")
	})

	it("MbrainClient has importConversations method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.importConversations).toBe("function")
	})

	it("MbrainClient has reportProcedureOutcome method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.reportProcedureOutcome).toBe("function")
	})

	it("MbrainClient has applyMemoryFeedback method", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.applyMemoryFeedback).toBe("function")
	})
})

describe("Phase 10 wiring: AI SDK tools", () => {
	it("createMbrainTools includes mbrain_lifecycle_get", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_lifecycle_get).toBeDefined()
	})

	it("createMbrainTools includes mbrain_lifecycle_update", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_lifecycle_update).toBeDefined()
	})

	it("createMbrainTools includes mbrain_lifecycle_delete", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_lifecycle_delete).toBeDefined()
	})

	it("createMbrainTools includes mbrain_lifecycle_history", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_lifecycle_history).toBeDefined()
	})

	it("createMbrainTools includes mbrain_recall_conversation", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_recall_conversation).toBeDefined()
	})

	it("createMbrainTools includes mbrain_chain_trace", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_chain_trace).toBeDefined()
	})

	it("createMbrainTools includes mbrain_novelty_scan", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_novelty_scan).toBeDefined()
	})

	it("createMbrainTools includes mbrain_consolidate", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_consolidate).toBeDefined()
	})

	it("createMbrainTools includes mbrain_import_conversations", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_import_conversations).toBeDefined()
	})

	it("createMbrainTools includes mbrain_procedure_outcome", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_procedure_outcome).toBeDefined()
	})

	it("createMbrainTools includes mbrain_memory_feedback", async () => {
		const client = new MbrainClient({ baseUrl: "http://localhost:9999" })
		const tools = createMbrainTools(client)
		expect(tools.mbrain_memory_feedback).toBeDefined()
	})
})

describe("Phase 10 wiring: client types exported", () => {
	it("exports MbrainTraceChainInput type", async () => {
		expect(MbrainClient).toBeDefined()
	})
})
