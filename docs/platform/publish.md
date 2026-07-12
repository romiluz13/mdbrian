# Publishing `@mdbrain/*` packages

This monorepo uses the `@mdbrain` npm scope. Publishing is maintainer-operated; the repo root is `private: true` and does not publish itself.

## Before you publish anything

1. Complete [PRODUCTION-READY.md](PRODUCTION-READY.md).
2. Confirm no secrets in the working tree.
3. Bump semver in the package(s) you ship; tag releases in git to match.
4. Configure `NPM_TOKEN` as a GitHub Actions secret with publish access to the
   `@mdbrain` npm scope.

## Which packages are intended for npm

| Package | Name | Typical consumers |
|---------|------|-------------------|
| Engine | `@mdbrain/memory-engine` | Advanced integrations |
| Bridge | `@mdbrain/memory-bridge` | API and custom servers |
| Barrel | `@mdbrain/memory` (`packages/mdbrain-memory`) | Single import for engine + bridge |
| Client | `@mdbrain/client` | Apps using the HTTP API |
| Tools | `@mdbrain/tools` | Vercel AI SDK tool helpers |

`@mdbrain/lib` is also published as a runtime support package because the engine and bridge depend on it, but it is not a primary integration surface.

## Publish mechanics

From repo root, after all release-blocking lanes are green:

```bash
bun run check-publishability
```

CI publish must fail hard if any package fails to publish. Do not rely on best-effort publish loops or workflows that swallow errors.

From a package directory:

```bash
cd packages/client
npm publish --access public
```

The GitHub publish workflow runs only from `v*` tags or manual dispatch. It uses
Bun for install/build/test and `npm publish --access public --provenance` for
npm publishing with provenance.

For an emergency manual publish, use npm with your org's 2FA and provenance
policy.

## Recommended publish order

When shipping the coordinated `@mdbrain/*` package set, publish in dependency
order so install smoke and downstream resolution stay clean:

1. `@mdbrain/lib`
2. `@mdbrain/memory-engine`
3. `@mdbrain/memory-bridge`
4. `@mdbrain/memory`
5. `@mdbrain/client`
6. `@mdbrain/tools`

## Docker

There is no single Mdbrain all-in-one image in-tree as of this writing. Production deployments typically:

- Run MongoDB.
- Run `apps/api` as a container or process behind a reverse proxy.
- Run `apps/web` and `apps/mcp` where needed.

See [self-host.md](self-host.md).

## Scope and naming

- Do not publish under legacy `@romiluz/*` names for new releases; this repo standardizes on `@mdbrain/*`.
- Historical material is kept outside the public launch tree.

## Related docs

- [MAINTAINER-MAP.md](MAINTAINER-MAP.md)
- [PACKAGE-STATUS.md](PACKAGE-STATUS.md)
- [PRODUCTION-READY.md](PRODUCTION-READY.md)
