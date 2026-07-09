// Minimal type declaration for js-yaml (the package ships no types and we only
// use load + dump). Keeps the wiki-engine self-contained without a full
// @types/js-yaml install that could disturb the locked node_modules tree.
declare module "js-yaml" {
	export function load(text: string, opts?: Record<string, unknown>): unknown
	export function dump(obj: unknown, opts?: Record<string, unknown>): string
	const _default: { load: typeof load; dump: typeof dump }
	export default _default
}
