import { type MdbrainConfig, resolveUserPath } from "@mdbrain/lib"

const SAFE_AGENT_PATH_SEGMENT = /^[A-Za-z0-9._-]+$/

type AgentMemorySearchConfig = {
	extraPaths?: string[]
}

type AgentConfigShape = {
	id?: string
	workspace?: string
	memorySearch?: AgentMemorySearchConfig
}

type AgentsShape = Record<string, unknown> & {
	defaults?: AgentConfigShape
	list?: AgentConfigShape[]
}

function isAgentConfigShape(value: unknown): value is AgentConfigShape {
	return typeof value === "object" && value !== null
}

function getAgents(cfg: MdbrainConfig): AgentsShape | undefined {
	return typeof cfg.agents === "object" && cfg.agents !== null
		? (cfg.agents as AgentsShape)
		: undefined
}

export function resolveAgentConfig(
	cfg: MdbrainConfig,
	agentId: string,
): AgentConfigShape | undefined {
	const agents = getAgents(cfg)
	const direct = agents?.[agentId]
	if (isAgentConfigShape(direct)) {
		return direct
	}
	if (Array.isArray(agents?.list)) {
		const fromList = agents.list.find(
			(entry) => isAgentConfigShape(entry) && entry.id === agentId,
		)
		if (fromList) {
			return fromList
		}
	}
	return undefined
}

export function resolveAgentWorkspaceDir(
	cfg: MdbrainConfig,
	agentId: string,
): string {
	const agentConfig = resolveAgentConfig(cfg, agentId)
	const defaults = getAgents(cfg)?.defaults
	const workspace =
		agentConfig?.workspace?.trim() || defaults?.workspace?.trim()
	return workspace
		? resolveUserPath(workspace)
		: resolveUserPath(`~/.mdbrain/agents/${agentIdPathSegment(agentId)}`)
}

function agentIdPathSegment(agentId: string): string {
	const trimmed = agentId.trim() || "main"
	if (
		SAFE_AGENT_PATH_SEGMENT.test(trimmed) &&
		trimmed !== "." &&
		trimmed !== ".."
	) {
		return trimmed
	}
	return `agent-${Buffer.from(trimmed).toString("base64url")}`
}

export function resolveAgentMemorySearchExtraPaths(
	cfg: MdbrainConfig,
	agentId: string,
): string[] | undefined {
	const agentConfig = resolveAgentConfig(cfg, agentId)
	const defaults = getAgents(cfg)?.defaults
	return (
		agentConfig?.memorySearch?.extraPaths ?? defaults?.memorySearch?.extraPaths
	)
}
