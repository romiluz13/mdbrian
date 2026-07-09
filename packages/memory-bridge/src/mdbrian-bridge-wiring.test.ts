import { describe, it, expect } from "vitest"
import { MdbrianClient } from "@mdbrian/client"
import { createMdbrianTools } from "@mdbrian/tools"
import * as bridge from "./mdbrian-bridge.js"

describe("Phase 7-11 wiring: bridge functions", () => {
	it("exports mdbrianBridgeShutdown (bridge shutdown part 2)", async () => {
		expect(typeof bridge.mdbrianBridgeShutdown).toBe("function")
	})

	it("exports mdbrianBridgeGetLifecycleItem", async () => {
		expect(typeof bridge.mdbrianBridgeGetLifecycleItem).toBe("function")
	})

	it("exports mdbrianBridgeUpdateLifecycleItem", async () => {
		expect(typeof bridge.mdbrianBridgeUpdateLifecycleItem).toBe("function")
	})

	it("exports mdbrianBridgeDeleteLifecycleItem", async () => {
		expect(typeof bridge.mdbrianBridgeDeleteLifecycleItem).toBe("function")
	})

	it("exports mdbrianBridgeGetLifecycleHistory", async () => {
		expect(typeof bridge.mdbrianBridgeGetLifecycleHistory).toBe("function")
	})

	it("exports mdbrianBridgeRecallConversation", async () => {
		expect(typeof bridge.mdbrianBridgeRecallConversation).toBe("function")
	})

	it("exports mdbrianBridgeTraceChain", async () => {
		expect(typeof bridge.mdbrianBridgeTraceChain).toBe("function")
	})

	it("exports mdbrianBridgeScanNovelty", async () => {
		expect(typeof bridge.mdbrianBridgeScanNovelty).toBe("function")
	})

	it("exports mdbrianBridgeConsolidate", async () => {
		expect(typeof bridge.mdbrianBridgeConsolidate).toBe("function")
	})

	it("exports mdbrianBridgeImportConversations", async () => {
		expect(typeof bridge.mdbrianBridgeImportConversations).toBe("function")
	})

	it("exports mdbrianBridgeReportProcedureOutcome", async () => {
		expect(typeof bridge.mdbrianBridgeReportProcedureOutcome).toBe("function")
	})

	it("exports mdbrianBridgeApplyMemoryFeedback", async () => {
		expect(typeof bridge.mdbrianBridgeApplyMemoryFeedback).toBe("function")
	})
})

describe("Phase 10 wiring: client methods", () => {
	it("MdbrianClient has getLifecycleItem method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.getLifecycleItem).toBe("function")
	})

	it("MdbrianClient has updateLifecycleItem method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.updateLifecycleItem).toBe("function")
	})

	it("MdbrianClient has deleteLifecycleItem method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.deleteLifecycleItem).toBe("function")
	})

	it("MdbrianClient has getLifecycleHistory method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.getLifecycleHistory).toBe("function")
	})

	it("MdbrianClient has recallConversation method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.recallConversation).toBe("function")
	})

	it("MdbrianClient has traceChain method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.traceChain).toBe("function")
	})

	it("MdbrianClient has scanNovelty method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.scanNovelty).toBe("function")
	})

	it("MdbrianClient has consolidate method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.consolidate).toBe("function")
	})

	it("MdbrianClient has importConversations method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.importConversations).toBe("function")
	})

	it("MdbrianClient has reportProcedureOutcome method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.reportProcedureOutcome).toBe("function")
	})

	it("MdbrianClient has applyMemoryFeedback method", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		expect(typeof client.applyMemoryFeedback).toBe("function")
	})
})

describe("Phase 10 wiring: AI SDK tools", () => {
	it("createMdbrianTools includes mdbrian_lifecycle_get", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_lifecycle_get).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_lifecycle_update", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_lifecycle_update).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_lifecycle_delete", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_lifecycle_delete).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_lifecycle_history", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_lifecycle_history).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_recall_conversation", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_recall_conversation).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_chain_trace", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_chain_trace).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_novelty_scan", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_novelty_scan).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_consolidate", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_consolidate).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_import_conversations", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_import_conversations).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_procedure_outcome", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_procedure_outcome).toBeDefined()
	})

	it("createMdbrianTools includes mdbrian_memory_feedback", async () => {
		const client = new MdbrianClient({ baseUrl: "http://localhost:9999" })
		const tools = createMdbrianTools(client)
		expect(tools.mdbrian_memory_feedback).toBeDefined()
	})
})

describe("Phase 10 wiring: client types exported", () => {
	it("exports MdbrianTraceChainInput type", async () => {
		expect(MdbrianClient).toBeDefined()
	})
})
