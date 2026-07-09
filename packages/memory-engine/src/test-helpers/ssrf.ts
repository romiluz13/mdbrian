import { vi } from "vitest"
import type { SsrFPolicy } from "@mdbrian/lib"

export function mockSsrfPolicy(): SsrFPolicy {
	return { allowPrivateNetwork: true }
}

export function mockPublicPinnedHostname(): void {
	// The standalone Mdbrian test surface allows mocked fetch requests by default.
}

export function createMockLookup(addresses: string[] = ["93.184.216.34"]) {
	return vi.fn().mockResolvedValue(
		addresses.map((address) => ({
			address,
			family: address.includes(":") ? 6 : 4,
		})),
	)
}
