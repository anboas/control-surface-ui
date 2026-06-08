# Release Governance

Release governance makes each package upgrade intentional, auditable, and repeatable. The framework ships release notes, migration guidance, browser-support policy, deprecation rules, release checklist, and SHA-256 checksum artifacts with the package.

## Release Artifacts

| Artifact | Location | Purpose |
| --- | --- | --- |
| Versioned changelog | `CHANGELOG.md` | Human-readable release history, upgrade notes, and compatibility notes. |
| Package handoff guide | `docs/package-handoff.md` | Downstream install, agent starting path, and production buildout guidance. |
| Migration notes | `docs/migration.md` | Version-by-version upgrade guidance for downstream teams. |
| Browser support policy | `docs/browser-support.md` | Supported browser and assistive-technology expectations. |
| Deprecation policy | `docs/deprecation-policy.md` | How classes, data attributes, APIs, tokens, and events are deprecated and removed. |
| Release checklist | `docs/release-checklist.md` | Required verification before publishing or handing a build to another team. |
| Checksum manifest | `dist/interface-framework.checksums.json` | Machine-readable SHA-256 hashes, sizes, package version, and signing policy metadata. |
| SHA-256 summary | `dist/SHA256SUMS` | Portable checksum file for command-line verification. |
| Local provenance manifest | `release/provenance.json` | Machine-readable package, checksum, tarball, CDN/export, and no-React runtime evidence for handoff. |
| Local provenance summary | `release/provenance.md` | Human-readable release evidence summary generated from the same manifest. |

## Release Gates

Every release candidate should pass these gates before publication:

1. Build artifacts from source with `npm run build`.
2. Verify package-level contracts with `npm run validate`.
3. Run behavior and component contract suites with `npm run accessibility` and `npm run test:contracts`.
4. Generate and verify checksums with `npm run checksums -- --check`.
5. Run browser visual and accessibility suites when Playwright browsers are available.
6. Run `node scripts/release-smoke.mjs` or `npm run release:smoke` to pack the tarball and install it in clean plain HTML and Vite samples.
7. Generate and verify local provenance with `npm run release:provenance` and `npm run release:provenance:check`.
8. Update `CHANGELOG.md`, `docs/migration.md`, and release checklist evidence before publishing.

Use `npm run release:verify` for the local release gate that can run without external services. It rebuilds, verifies checksums, verifies release provenance, and runs the validation suite.
Use `node scripts/release-smoke.mjs` for the package-consumer release gate; it downloads a temporary npm CLI when npm is not available on PATH.

## Checksum And Signing Policy

The repository generates SHA-256 checksums for the distributable CSS/JS files, package metadata, release notes, and release-governance docs. The generated manifest records:

- package name and version
- checksum algorithm
- artifact path
- byte size
- SHA-256 digest
- signing policy metadata

Local builds are not cryptographically signed because signing requires a trusted release identity and key/provenance provider. Production publication should either:

- publish through npm provenance or an equivalent Sigstore-backed flow, or
- sign `dist/SHA256SUMS` and `dist/interface-framework.checksums.json` in the release pipeline.

Downstream consumers can still audit local or CDN artifacts by comparing hashes against the shipped checksum manifest.

## Local Provenance Evidence

`scripts/release-provenance.mjs` generates the handoff provenance files after the package smoke tarball exists:

```bash
npm run release:provenance
npm run release:provenance:check
```

The generated `release/provenance.json` records package name/version, public package metadata, CDN fields, export keys, runtime dependencies, no-React runtime status, checksum artifact evidence, release tarball SHA-256 hashes, and the external publishing policy. The matching `release/provenance.md` gives downstream humans the same evidence in a scan-friendly format.

This closes the local framework provenance gap. External cryptographic signing still belongs to the trusted publish pipeline through `npm publish --provenance` or equivalent signed checksum automation.

## Downstream Upgrade Audit

A downstream team should be able to upgrade by following this sequence:

1. Read the target version in `CHANGELOG.md`.
2. Read the matching entry in `docs/migration.md`.
3. Check browser and accessibility constraints in `docs/browser-support.md`.
4. Review deprecated or removed contracts in `docs/deprecation-policy.md`.
5. Verify package artifacts against `dist/interface-framework.checksums.json` or `dist/SHA256SUMS`.
6. Review `release/provenance.json` or `release/provenance.md` for tarball, CDN/export, no-React, and publishing-policy evidence.
7. Follow `docs/package-handoff.md` for install, imports, and agent orientation.
8. Run their product smoke tests with only compiled `dist` CSS/JS loaded.
9. Record any local overrides or adapter changes required by the upgrade.

## Release Evidence Contract

Each release note should include:

- release date
- added, changed, deprecated, removed, fixed, and security sections where applicable
- migration notes or a statement that no migration is required
- browser-support changes or a statement that support is unchanged
- checksum generation status
- local provenance status
- package smoke-test status

## Definition Of Done

A release is governed when a downstream team can audit what changed, verify the package artifacts, understand compatibility risks, follow migration notes, and reproduce the release checks without reading private implementation context.
