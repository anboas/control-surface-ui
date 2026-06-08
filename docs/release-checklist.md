# Release Checklist

Use this checklist for every release candidate.

## Preparation

- [ ] Confirm `package.json` version matches the planned release.
- [ ] Update `CHANGELOG.md` with date, summary, migration notes, browser-support changes, deprecations, and checksum status.
- [ ] Update `docs/migration.md` for the target version.
- [ ] Update `docs/browser-support.md` if platform support changed.
- [ ] Update `docs/deprecation-policy.md` if public contract policy changed.
- [ ] Update examples and docs for new or changed public APIs.

## Build And Static Verification

- [ ] Run `npm run theme:compile`.
- [ ] Run `npm run build`.
- [ ] Run `npm run checksums -- --check`.
- [ ] Run `npm run release:provenance:check`.
- [ ] Run `npm run validate`.
- [ ] Run `npm run accessibility`.
- [ ] Run `npm run test:contracts`.

## Browser Verification

- [ ] Run `npm run playwright:install` when browsers are not installed.
- [ ] Run `npm run test:visual`.
- [ ] Run `npm run test:a11y:browser`.
- [ ] Run `npm run test:browser`.
- [ ] Review visual diffs intentionally before accepting new snapshots.

## Theme And Contrast Freeze

- [ ] Confirm `docs/themes.md` documents built-in themes, scoped theme usage, JavaScript controls, public token groups, custom theme authoring, and the visual smoke page.
- [ ] Confirm `docs/forced-colors.md` documents system-color mappings, authoring rules, verification, and component checklist coverage.
- [ ] Confirm `docs/theme-contrast-report.md` and `docs/theme-contrast-report.json` are current after `npm run theme:compile`.
- [ ] Confirm the contrast report passes light, system light, system dark, dark, midnight, high-contrast, calm, and executive themes.
- [ ] Confirm `examples/theme-states.html` includes semantic-state visual targets for every built-in theme.
- [ ] Confirm `tests/playwright/visual.spec.mjs` captures theme semantic state snapshots across desktop and mobile projects.
- [ ] Confirm `docs/github-shipping-work-items.md` includes FW-010 status evidence.

## CI Release Gate

- [ ] Confirm `.github/workflows/ci.yml` runs install, theme compilation, build, checksum verification, validation, release smoke, and Playwright browser checks.
- [ ] Confirm `.github/workflows/ci.yml` uses `actions/upload-artifact` to Upload Playwright reports, browser test output, release smoke evidence, and checksum artifacts.
- [ ] Confirm `.github/workflows/release.yml` is available as a manual release workflow with `workflow_dispatch`, package-version verification, checksum verification, and `id-token: write` provenance readiness.
- [ ] Confirm `.github/workflows/release.yml` uses `actions/upload-artifact` to Upload release package and evidence.

## Agent Handoff Freeze

- [ ] Confirm `docs/agent-handoff.md` identifies the route, component, adapter, acceptance, and remaining-risk source-of-truth documents.
- [ ] Confirm `docs/agent-handoff.md` includes a first-30-minutes operating path for the next agent.
- [ ] Confirm `docs/agent-handoff.md` includes a handoff freeze verification matrix covering manifest, recipes, API docs, event catalog, schemas, route contracts, route-component map, adapter fixtures, MVP checklist, and GitHub work items.
- [ ] Confirm `starters/` includes Policy Intelligence and AdamBoas.com plain HTML and Vite starters that consume package artifacts only.
- [ ] Confirm the handoff brief explicitly says not to start real MVP implementation work in this framework repository.

## Component Contract Freeze

- [ ] Confirm `docs/component-manifest.json` includes the v0.1 `contractFreeze` block and stability tier definitions.
- [ ] Confirm every component has `stability` and `contract` metadata.
- [ ] Confirm every `stable` component has identity fields, when-to-use guidance, avoid-when guidance, primary classes, data attributes, JavaScript API metadata, events or explicit static-event policy, recipes, docs, examples, and accessibility notes.
- [ ] Confirm `docs/component-api.md` documents the Contract Stability Model.
- [ ] Confirm `docs/github-shipping-work-items.md` includes FW-005 status evidence.
- [ ] Run `npm run validate` so `scripts/validate.mjs` enforces the component contract freeze.

## Adapter Lifecycle Freeze

- [ ] Confirm `runAdapterTask`, `cancelAdapterTask`, and `getAdapterTaskState` are exported from the browser bundle and documented in `docs/component-api.md`, `docs/data-schemas.md`, and `docs/adapter-fixture-contracts.md`.
- [ ] Confirm `if:adapter-request`, `if:adapter-result`, `if:adapter-cancel`, and `if:adapter-error` are listed in `docs/event-catalog.md`.
- [ ] Confirm new adapter families use the shared task runner unless they have a specialized registry with equivalent loading, success, empty, error, cancelled, retry, request-id, and `AbortSignal` behavior.
- [ ] Confirm `docs/github-shipping-work-items.md` includes FW-008 status evidence.
- [ ] Run `npm run test:contracts` so the hydrated browser contract checks success, empty, error, superseded, and explicit-cancel adapter states.

## MVP Planning Freeze

- [ ] Confirm `docs/mvp-route-contracts.md` declares `frozen-for-v0.1-planning-handoff` and covers Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model.
- [ ] Confirm `docs/route-component-map.md` maps each MVP route to primary components, secondary components, required JavaScript behavior, expected events, and trusted examples.
- [ ] Confirm `docs/adapter-fixture-contracts.md` maps each MVP route to required adapters and stateful fixture contracts.
- [ ] Confirm `docs/mvp-acceptance-checklist.md` records the planning freeze source-of-truth order.
- [ ] Confirm `docs/github-shipping-work-items.md` includes FW-006 status evidence.
- [ ] Confirm no production MVP route code is added as part of this framework planning freeze.

## QA Baseline Freeze

- [ ] Confirm `docs/qa-baseline.md` declares `frozen-for-v0.1-qa-handoff`.
- [ ] Confirm `tests/playwright/__screenshots__/chromium-desktop` contains 14 PNG baselines.
- [ ] Confirm `tests/playwright/__screenshots__/chromium-mobile` contains 14 PNG baselines.
- [ ] Confirm `tests/playwright/visual.spec.mjs`, `tests/playwright/a11y.spec.mjs`, and `tests/playwright/component-contracts.spec.mjs` are present and aligned with the QA baseline matrix.
- [ ] Confirm `playwright.config.mjs` runs desktop and mobile Chromium projects against HTTP-loaded examples.
- [ ] Confirm `docs/performance-budgets.md` declares `frozen-for-v0.1-performance-handoff` and the browser component-contract suite enforces the large profile at desktop and mobile widths.
- [ ] Run `npm run test:browser` or `.\node_modules\.bin\playwright.cmd test` before release handoff.
- [ ] Confirm `docs/github-shipping-work-items.md` includes FW-007 status evidence.

## Graph And Diagram Production Path Freeze

- [ ] Confirm `docs/graph-diagram-production-path.md` declares `frozen-for-v0.1-graph-diagram-handoff`.
- [ ] Confirm the graph production contract documents node type delegation, `registerGraphNodeType`, `registerGraphLayoutEngine`, `GraphLayoutRequest`, `GraphLayoutResult`, traversal, hiddenChildren ownership, expand/collapse semantics, and accessible fallback.
- [ ] Confirm the diagram production contract documents diagram node types, grouped regions, embedded assets, connector routing, search/highlight, edit-mode boundaries, export adapter behavior, and storage adapter behavior.
- [ ] Confirm advanced graph and diagram capabilities are separated into Stable For v0.1 and Experimental For v0.1 boundaries.
- [ ] Confirm `docs/component-api.md`, `docs/data-schemas.md`, `docs/event-catalog.md`, `docs/recipes.md`, `docs/accessibility.md`, and `docs/diagram-component-requirements.md` remain linked as supporting source-of-truth artifacts.
- [ ] Confirm `docs/github-shipping-work-items.md` includes FW-011 status evidence.
- [ ] Run `npm run validate` so `scripts/validate.mjs` enforces the graph and diagram production path freeze.

## Document Intelligence Production Path Freeze

- [ ] Confirm `docs/document-intelligence-production-path.md` declares `frozen-for-v0.1-document-intelligence-handoff`.
- [ ] Confirm the document production contract documents `DocumentCorpusRecord`, `DocumentArtifactRecord`, `DocumentParserOutput`, and `DocumentAnnotationRecord`.
- [ ] Confirm annotation coverage includes claim, organization, reference, obligation, relationship, implementation, evidence, and gap records.
- [ ] Confirm search/highlight behavior preserves surrounding line context and emits the documented `if:doc-*` events.
- [ ] Confirm review workflow handoff documents `DocumentReviewFinding` and source-line linkage.
- [ ] Confirm adapter expectations include loading, success, empty, error, cancelled, retry, and shared `runAdapterTask` lifecycle behavior.
- [ ] Confirm accessible fallback covers embedded artifacts, reconstituted text, focusable marks, extracted-list routing, and graph/reference preview alternatives.
- [ ] Confirm `docs/github-shipping-work-items.md` includes FW-017 status evidence.
- [ ] Run `npm run validate` so `scripts/validate.mjs` enforces the document intelligence production path freeze.

## Package Smoke

- [ ] Run `node scripts/release-smoke.mjs` or `npm run release:smoke`.
- [ ] Run `npm run release:provenance` after package smoke so tarball hashes are captured.
- [ ] Run `npm run release:provenance:check`.
- [ ] Run `npm pack`.
- [ ] Install the tarball into a clean plain HTML sample.
- [ ] Load only packaged `dist` CSS/JS in the plain HTML sample.
- [ ] Install the tarball into a clean Vite sample.
- [ ] Import `control-surface-ui/css` and ESM APIs from the package root.
- [ ] Verify no React or heavy runtime dependency is installed by the package.
- [ ] Verify CDN metadata: `unpkg`, `jsdelivr`, `style`, `browser`, `module`, and `exports`.

## Signing And Checksums

- [ ] Confirm `dist/interface-framework.checksums.json` includes all release artifacts.
- [ ] Confirm `dist/SHA256SUMS` matches the JSON manifest.
- [ ] Confirm `release/provenance.json` records package metadata, CDN/export metadata, runtime dependencies, checksum evidence, release tarball hashes, and no-React runtime status.
- [ ] Confirm `release/provenance.md` gives the human-readable evidence summary.
- [ ] Sign checksum files in the release pipeline or publish with npm provenance where available.
- [ ] Store checksum/signing evidence with release notes.

## Post-Release

- [ ] Tag the release.
- [ ] Publish package artifacts.
- [ ] Verify CDN paths resolve after publish.
- [ ] Record release smoke results in `docs/release-smoke.md`.
- [ ] Notify downstream teams with changelog, migration notes, browser policy, deprecations, and checksum locations.
