// Minimal type declaration for js-yaml (the package ships no types and we only
// use load + dump). Keeps the wiki-engine self-contained without a full
// @types/js-yaml install that could disturb the locked node_modules tree.
declare module "js-yaml" {
	export function load(text: string, opts?: Record<string, unknown>): unknown
	export function dump(obj: unknown, opts?: Record<string, unknown>): string
	// The safe schema (DEFAULT_SCHEMA) is the default in js-yaml v4. Exposed so
	// callers can pass it explicitly to guard against unsafe-schema regressions.
	export const DEFAULT_SCHEMA: unknown
	const _default: {
		load: typeof load
		dump: typeof dump
		DEFAULT_SCHEMA: typeof DEFAULT_SCHEMA
	}
	export default _default
}
