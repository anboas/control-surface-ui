# GitHub Shipping Work Items

This document is the repo-ready plan for buttoning up the UI Framework as a packaged deliverable. It is intentionally scoped to framework packaging, governance, documentation, testing, and handoff readiness. It does not authorize production Policy MVP or AdamBoas.com buildout work.

## Scope Boundary

| In scope | Out of scope |
| --- | --- |
| Package, validate, document, and hand off the UI Framework. | Build production Policy MVP routes. |
| Create GitHub-ready work items and release gates. | Connect to real production services. |
| Freeze component contracts, adapter fixtures, and examples. | Replace mock data with live data. |
| Verify clean package consumption from artifacts. | Create real user accounts, permissions, or deployment infrastructure. |
| Prepare downstream agent instructions. | Re-theme or rebuild the product application itself. |

## Definition Of Buttoned Up

The framework is ready to ship into a real GitHub repo when all of the following are true:

- `npm install`, `npm run build`, `npm run validate`, `npm run release:smoke`, and `npm run test:browser` pass from a clean checkout.
- `npm pack` produces a tarball that installs into clean plain HTML and Vite consumers using package artifacts only.
- Package-owned starter kits exist for Policy Intelligence and AdamBoas.com in plain HTML and Vite variants.
- `dist/interface-framework.css`, `dist/interface-framework.min.css`, `dist/interface-framework.js`, `dist/interface-framework.min.js`, `dist/interface-framework.esm.js`, checksums, package exports, CDN metadata, and no-React dependency checks are verified.
- `docs/agent-handoff.md`, `docs/mvp-route-contracts.md`, `docs/route-component-map.md`, `docs/adapter-fixture-contracts.md`, and `docs/mvp-acceptance-checklist.md` are current and linked from `README.md`.
- `docs/component-manifest.json`, `docs/component-api.md`, `docs/recipes.md`, `docs/event-catalog.md`, and `docs/data-schemas.md` agree on component names, behaviors, events, and adapter contracts.
- Browser visual, accessibility, keyboard, and component-contract baselines exist for MVP-critical examples.
- No unowned P0/P1 component gaps remain in `docs/component-coverage-audit.md`.
- Release governance, changelog, migration notes, browser support, deprecation policy, release checklist, checksums, local provenance evidence, and external provenance/signing expectations are documented.

## Suggested GitHub Labels

| Label | Use |
| --- | --- |
| `p0-release-blocker` | Must close before handing framework to downstream agents. |
| `p1-production-hardening` | Needed for a confident production-grade release, but can follow the first package handoff if explicitly accepted. |
| `docs-handoff` | Agent-facing documentation, route maps, recipes, or acceptance criteria. |
| `qa-baseline` | Visual, accessibility, keyboard, browser, performance, or overflow checks. |
| `package-release` | npm pack, exports, CDN metadata, checksums, provenance, and release notes. |
| `component-contract` | Component API, manifest, events, schemas, or examples. |
| `adapter-contract` | Mock/production-shaped data adapters and state contracts. |
| `non-mvp-planning` | Planning-only work that must not implement the production MVP. |

## Milestones

| Milestone | Outcome | Exit gate |
| --- | --- | --- |
| M1 Package Freeze | Package metadata, exports, dist assets, release smoke, checksums, and local provenance are stable. | Clean tarball installs in plain HTML and Vite samples without React and produces provenance evidence. |
| M2 Contract Freeze | Component manifest, API docs, event catalog, recipes, data schemas, route map, and adapters align. | Validation checks pass and downstream agent can select components from metadata. |
| M3 QA Baseline | Browser visual/a11y/keyboard/component-contract baselines exist for critical examples. | Playwright suite passes and screenshots are committed intentionally. |
| M4 GitHub Handoff | Repo hygiene, CI plan, release governance, and issue backlog are ready. | A downstream agent can clone, install, validate, and follow work items without chat history. |

## P0 Work Items

### FW-001 Package Release Smoke

**User story:** As a release agent, I need the framework tarball to install into clean consumers so downstream projects can use package artifacts only.

**Tasks**

- Run `npm run release:smoke` from a clean checkout.
- Verify plain HTML consumer loads CSS and browser JS from `node_modules/control-surface-ui/dist`.
- Verify Vite consumer imports `control-surface-ui/css` and `control-surface-ui`.
- Verify package exports, CDN fields, release notes, checksums, and no React runtime dependency.
- Archive the tarball under `release/`.

**Acceptance criteria**

- Release smoke passes without local source-file imports.
- `release/control-surface-ui-0.1.0.tgz` exists.
- `docs/release-smoke.md` reflects the latest smoke result.

### FW-002 GitHub Repo Hygiene

**User story:** As a repository maintainer, I need standard repo metadata so the framework can be governed outside this workspace.

**Tasks**

- Add or verify `LICENSE`, `.gitignore`, `CONTRIBUTING.md`, `SECURITY.md`, and `CODEOWNERS`.
- Decide whether generated screenshots and release tarballs are committed or produced by CI.
- Document Node/npm version expectations.
- Document branch, release, and review rules.

**Acceptance criteria**

- A fresh contributor can clone, install, test, and understand how to contribute.
- Generated artifacts have an explicit commit/ignore policy.

**Status evidence**

- Repository hygiene files now exist: `LICENSE`, `.gitignore`, `CONTRIBUTING.md`, `SECURITY.md`, and `.github/CODEOWNERS`.
- `CONTRIBUTING.md` documents setup, validation, generated-artifact policy, review checklist, branch expectations, and release-note expectations.
- `SECURITY.md` documents supported versions, vulnerability reporting, security scope, and maintainer response expectations.
- `scripts/validate.mjs` now verifies the repo hygiene files and ownership policy as part of the framework release gate.

### FW-003 CI Release Gate

**User story:** As a framework owner, I need CI to enforce the same gates a downstream agent will trust.

**Tasks**

- Add GitHub Actions for install, build, validate, release smoke, Playwright browser tests, and checksum verification.
- Upload Playwright reports and screenshots as artifacts.
- Add a manual release workflow for checksum/provenance generation.

**Acceptance criteria**

- Pull requests fail on broken exports, docs contracts, visual/a11y failures, or missing dist artifacts.
- Release workflow produces auditable package artifacts.

**Status evidence**

- `.github/workflows/ci.yml` now enforces `npm ci`, theme compilation, distributable build, checksum verification, framework validation, release smoke, and Playwright browser tests.
- `.github/workflows/ci.yml` uploads release-smoke evidence, checksum manifests, Playwright reports, and browser test output as GitHub Actions artifacts.
- `.github/workflows/release.yml` provides a manual `workflow_dispatch` release artifact path with package-version verification, release smoke, checksum verification, release checklist evidence, changelog evidence, and `id-token: write` provenance readiness.
- `scripts/validate.mjs` now treats CI and release workflow coverage as part of the framework contract, so missing automation fails local and CI validation.

### FW-004 Agent Handoff Freeze

**User story:** As the next buildout agent, I need one reliable brief that tells me how to use the framework without reading every source file.

**Tasks**

- Verify `docs/agent-handoff.md` is current.
- Cross-check route contracts, route-component map, adapter fixtures, component manifest, recipes, and event catalog.
- Confirm known gaps are explicit and not hidden in examples.
- Add a short "first 30 minutes" path for the next agent.

**Acceptance criteria**

- A downstream agent can choose a route, identify primary components, register adapters, and know what not to implement yet.

**Status evidence**

- `docs/agent-handoff.md` now includes an explicit handoff freeze status, first-30-minutes operating path, minimum read set, route map, component selection guide, adapter expectations, build order, trusted examples, known gaps, and MVP readiness checklist.
- `docs/agent-handoff.md` now includes a handoff freeze verification matrix that cross-checks `docs/component-manifest.json`, `docs/recipes.md`, `docs/component-api.md`, `docs/event-catalog.md`, `docs/data-schemas.md`, `docs/mvp-route-contracts.md`, `docs/route-component-map.md`, `docs/adapter-fixture-contracts.md`, `docs/mvp-acceptance-checklist.md`, and this risk register.
- `scripts/validate.mjs` now verifies the first-30-minutes path, freeze verification matrix, source-of-truth links, and no-real-MVP-work guardrail as part of the agentic handoff contract.

### FW-005 Component Contract Freeze

**User story:** As an agentic developer, I need component contracts to be stable and machine-readable.

**Tasks**

- Compare `docs/component-manifest.json` against `docs/component-api.md`, `docs/recipes.md`, `docs/event-catalog.md`, and examples.
- Mark each component as stable, experimental, or demo-only.
- Ensure every stable component has variants, data attributes, JS behavior, emitted events, accessibility notes, and copy-paste examples.

**Acceptance criteria**

- No stable component exists only as an untracked visual example.
- Validation catches missing exports, docs, or required component metadata.

**Status evidence**

- `docs/component-manifest.json` now includes a `contractFreeze` block with the v0.1 handoff status, source-of-truth docs, stability tier definitions, and stable component requirements.
- Every manifest component now has a machine-readable `stability` value of `stable`, `experimental`, or `demo-only` plus a `contract` block describing release tier, behavior type, variant coverage, copy-paste coverage, event policy, accessibility evidence, examples evidence, and validation ownership.
- `docs/component-api.md` now documents the Contract Stability Model so downstream agents know which components can be used directly and which require explicit hardening acceptance.
- `scripts/validate.mjs` now fails if a component is missing stability metadata, contract evidence, docs, examples, accessibility guidance, or the stable-component event/static-event contract.

### FW-006 MVP Planning Freeze

**User story:** As the Policy MVP planner, I need clear route contracts without starting real MVP implementation.

**Tasks**

- Verify `docs/mvp-route-contracts.md` covers Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model.
- Verify `docs/route-component-map.md` lists primary components, secondary components, JS behaviors, events, and example references.
- Verify `docs/adapter-fixture-contracts.md` provides mock/production-shaped fixtures for each route.
- Verify `docs/mvp-acceptance-checklist.md` defines "ready to build Policy MVP."

**Acceptance criteria**

- The MVP build can start later from planning artifacts, not from chat history.
- No production route code is added as part of this work item.

**Status evidence**

- `docs/mvp-route-contracts.md` now declares the `frozen-for-v0.1-planning-handoff` status and confirms the source-of-truth route coverage for Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model.
- `docs/route-component-map.md` now declares the same planning freeze status and cross-checks primary components, secondary components, JavaScript behavior, expected events, and trusted examples for every MVP route.
- `docs/adapter-fixture-contracts.md` now declares the adapter planning freeze status and requires every adapter path to expose success, empty, loading, error, and cancelled states before production service wiring.
- `docs/mvp-acceptance-checklist.md` now records the planning freeze source-of-truth order and the no-real-MVP-work boundary.
- `scripts/validate.mjs` now verifies FW-006 route coverage and planning-freeze evidence across the route contracts, route-component map, adapter fixtures, acceptance checklist, handoff brief, release checklist, and this risk register.

### FW-007 QA Baseline Freeze

**User story:** As a QA agent, I need evidence that critical examples render, behave, and remain accessible.

**Tasks**

- Run browser visual, accessibility, keyboard, and component-contract suites.
- Commit or archive baseline screenshots for desktop and mobile.
- Document snapshot update policy.
- Record known acceptable differences.

**Acceptance criteria**

- MVP-critical surfaces have visual baselines and browser checks.
- Overflow, clipped text, keyboard traps, and missing labels are caught before handoff.

**Status evidence**

- `docs/qa-baseline.md` now declares the `frozen-for-v0.1-qa-handoff` status, browser QA scope, baseline surface matrix, theme snapshot matrix, screenshot counts, commands, snapshot update policy, known acceptable differences, and definition of done.
- `docs/testing.md` documents the visual regression workflow, browser accessibility workflow, component contract tests, full browser pass, and screenshot update policy.
- `tests/playwright/__screenshots__/chromium-desktop` contains 14 committed PNG baselines and `tests/playwright/__screenshots__/chromium-mobile` contains 14 committed PNG baselines.
- `tests/playwright/visual.spec.mjs`, `tests/playwright/a11y.spec.mjs`, and `tests/playwright/component-contracts.spec.mjs` cover visual surfaces, hydrated browser accessibility, and browser component contracts.
- `playwright.config.mjs` defines desktop and mobile Chromium projects, HTTP-loaded example pages, reduced motion, hidden caret rendering, and the checked-in screenshot path.
- `scripts/validate.mjs` now verifies QA baseline docs, screenshot counts, Playwright specs, package export metadata, and FW-007 status evidence.

## P1 Work Items

### FW-008 Adapter State Hardening

**User story:** As an integration agent, I need every production adapter path to expose loading, empty, error, cancel, retry, and success states.

**Tasks**

- Harden table, autocomplete, graph layout, diagram export, document annotation, source registry, search, review queue, and export adapters.
- Add async cancellation and retry examples.
- Add telemetry events for adapter lifecycle states.

**Acceptance criteria**

- Adapters can swap from mock data to service calls without changing component markup.

**Status evidence**

- `InterfaceFramework.runAdapterTask(target, adapter, context, options)` now provides a reusable adapter lifecycle wrapper for new production analytics adapters.
- `InterfaceFramework.cancelAdapterTask(target, channel, reason)` and `InterfaceFramework.getAdapterTaskState(target, channel)` expose explicit cancellation and inspection paths for status rails and command surfaces.
- The task runner creates request ids and `AbortSignal`s, cancels stale work in the same channel, normalizes `success`, `empty`, `error`, and `cancelled` states, writes the shared `data-if-adapter-state` contract, and emits generic `if:adapter-*` plus scoped `if:{channel}-*` telemetry.
- `docs/data-schemas.md`, `docs/component-api.md`, `docs/recipes.md`, `docs/event-catalog.md`, `docs/adapter-fixture-contracts.md`, and `docs/component-manifest.json` now document the adapter task contract.
- `tests/playwright/component-contracts.spec.mjs` verifies reusable adapter task success, empty, error, superseded cancellation, manual cancellation, hidden state panels, scoped events, and no pending task after cancellation.
- `scripts/behavior-tests.mjs` verifies the adapter lifecycle APIs and source-level cancellation/state/event contract.

### FW-009 Performance And Scale Budgets

**User story:** As a product agent, I need confidence that large demos remain usable at desktop and mobile breakpoints.

**Tasks**

- Stress test large tables, graphs, diagrams, document viewers, charts, and source registries.
- Maintain performance budgets for render time, interaction response, and overflow.
- Keep a report path for `if:performance-run` metrics.

**Acceptance criteria**

- Large synthetic demos remain responsive and do not introduce uncontrolled overflow.

**Status evidence**

- `docs/performance-budgets.md` now declares the `frozen-for-v0.1-performance-handoff` status, profile counts, section timing thresholds, total render budgets, uncontained overflow limits, and browser release-gate criteria.
- `InterfaceFramework.runPerformanceLab()` now returns `result.budget` with per-section states, total state, overflow state, failures, warnings, and `passed`.
- `InterfaceFramework.evaluatePerformanceBudgets(profile, sections, overflow, totalMs)` is exported so downstream QA pages and host-rendered stress surfaces can use the same budget vocabulary.
- `tests/playwright/component-contracts.spec.mjs` now runs the `large` profile at desktop and mobile widths and fails on section budget breaches, total budget breaches, uncontained overflow, or page-level horizontal overflow.
- `scripts/validate.mjs` now verifies the performance budget document, budget evaluator API, event payload docs, and design-showcase readiness language.

### FW-010 Theme And Contrast Release Evidence

**User story:** As an accessibility reviewer, I need every theme to pass contrast and visual smoke checks.

**Tasks**

- Run token compiler and contrast report.
- Verify light, dark, high-contrast, and forced-colors guidance across core components.
- Capture visual snapshots for semantic states.

**Acceptance criteria**

- Built-in themes pass documented contrast gates across core components.

**Status evidence**

- `scripts/theme-compiler.mjs` resolves semantic theme tokens, verifies forced-colors mappings, and generates `docs/theme-contrast-report.md` plus `docs/theme-contrast-report.json`.
- `docs/theme-contrast-report.md` records passing AA contrast checks for light, system light, system dark, dark, midnight, high-contrast, calm, and executive themes.
- `docs/themes.md` documents the built-in theme contract, scoped theme usage, JavaScript controls, public token groups, custom theme authoring, and the visual smoke page.
- `docs/forced-colors.md` documents the operating-system forced-colors mapping, authoring rules, verification path, and component checklist.
- `examples/theme-states.html` renders semantic-state snapshots for every built-in theme across buttons, badges, alerts, form fields, tables, KPI cards, metadata, and focus rings.
- `tests/playwright/visual.spec.mjs` captures theme semantic-state snapshots for every built-in theme on desktop and mobile Chromium projects.
- `scripts/validate.mjs` runs the theme compiler in `--check` mode and verifies contrast report coverage, forced-colors mapping, visual smoke targets, package exports, and this FW-010 status evidence.

### FW-011 Diagram And Graph Production Path

**User story:** As a domain UI agent, I need graph and diagram primitives to have explicit production upgrade paths.

**Tasks**

- Document graph node/edge type delegation, layout-engine adapter expectations, traversal behavior, expand/collapse semantics, and accessible fallback.
- Document diagram node types, groups, connectors, search/highlight, edit-mode boundaries, export, and storage adapters.
- Decide which advanced graph/diagram capabilities remain experimental for v0.1.

**Acceptance criteria**

- The framework can support Policy graph and architecture diagrams without bespoke page-only behavior.

**Status evidence**

- `docs/graph-diagram-production-path.md` now declares `frozen-for-v0.1-graph-diagram-handoff` and defines the graph and diagram production upgrade contract.
- The graph contract documents `registerGraphNodeType`, `registerGraphLayoutEngine`, `GraphLayoutRequest`, `GraphLayoutResult`, traversal behavior, hiddenChildren ownership, expand/collapse semantics, and accessible fallback requirements.
- The diagram contract documents diagram node types, grouped regions, embedded assets, connector routing, search/highlight, edit-mode boundaries, export adapter behavior, and storage adapter expectations.
- `docs/component-api.md`, `docs/data-schemas.md`, `docs/event-catalog.md`, `docs/recipes.md`, `docs/accessibility.md`, and `docs/diagram-component-requirements.md` remain the supporting source-of-truth documents.
- `docs/release-checklist.md`, `docs/package-handoff.md`, `docs/agent-handoff.md`, `docs/next-steps.md`, and `docs/mvp-acceptance-checklist.md` now reference the graph and diagram production path.
- `scripts/validate.mjs` now verifies the FW-011 evidence, source-of-truth links, public API hooks, examples, package export, and stable versus experimental v0.1 boundaries.

### FW-017 Document Intelligence Production Path

**User story:** As a document-intelligence agent, I need parser outputs, annotation records, artifact viewer states, and review handoff expectations to have explicit production upgrade paths.

**Tasks**

- Document the production-shaped `DocumentCorpusRecord`, `DocumentArtifactRecord`, `DocumentParserOutput`, and `DocumentAnnotationRecord` contracts.
- Document annotation coverage for claims, organizations, references, obligations, relationships, implementation records, evidence, and gaps.
- Document full-text search, semantic highlighting, authority jump, and annotation-selection behavior without losing surrounding text context.
- Document review finding handoff, adapter lifecycle states, and accessible fallback expectations.
- Export the document intelligence production path from package metadata and validate it as part of the release gate.

**Acceptance criteria**

- A production parser output can hydrate the framework document viewer without changing component markup.
- Review, Search, Documents, and Data Model routes can link findings, extracted entities, relationships, and source lines through documented events and adapter states.

**Status evidence**

- `docs/document-intelligence-production-path.md` now declares `frozen-for-v0.1-document-intelligence-handoff` and defines the document intelligence production upgrade contract.
- The production path documents `DocumentCorpusRecord`, `DocumentArtifactRecord`, `DocumentParserOutput`, `DocumentAnnotationRecord`, `DocumentSearchResult`, and `DocumentReviewFinding`.
- Annotation coverage explicitly includes claim, organization, reference, obligation, relationship, implementation, evidence, and gap records.
- The handoff contract references `hydrateDocumentCorpus`, `hydrateDocumentAnnotations`, `updateDocumentSearch`, `selectDocumentAnnotation`, `if:doc-annotation-select`, and `if:doc-annotation-panel`.
- `docs/release-checklist.md`, `docs/package-handoff.md`, `docs/agent-handoff.md`, `docs/next-steps.md`, and `docs/mvp-acceptance-checklist.md` now reference the document intelligence production path.
- `scripts/validate.mjs` now verifies the FW-017 evidence, source-of-truth links, public API hooks, package export, and stable versus experimental v0.1 boundaries.

### FW-018 Release Provenance Evidence

**User story:** As a release agent, I need auditable local provenance evidence before a downstream team trusts a packaged framework handoff.

**Tasks**

- Generate local release provenance from package metadata, checksum artifacts, package smoke tarballs, and runtime dependency metadata.
- Verify the provenance files from a deterministic script.
- Document the difference between local provenance evidence and external npm/Sigstore signing.
- Surface the closed evidence in the design-system deficiency assessment.

**Acceptance criteria**

- `release/provenance.json` and `release/provenance.md` exist after package smoke.
- `npm run release:provenance:check` fails when package metadata, checksums, or tarball evidence is stale.
- Release docs explain that trusted cryptographic signing still happens in the publishing pipeline.

**Status evidence**

- `scripts/release-provenance.mjs` generates and verifies package provenance evidence.
- `release/provenance.json` records package name/version, CDN/export metadata, no-React runtime status, checksum evidence, release tarball SHA-256 hashes, and external publish-provenance policy.
- `release/provenance.md` gives the human-readable release evidence summary.
- `docs/release-governance.md`, `docs/release-checklist.md`, `README.md`, and `docs/next-steps.md` now reference local provenance as a release gate.
- `scripts/validate.mjs` now verifies the release provenance artifacts as part of the release governance contract.

### FW-019 Manifest State And Motion Contracts

**User story:** As an agentic buildout developer, I need each mature component family to declare its state and motion hooks so I can wire transitions without reading every source file or inventing bespoke animation behavior.

**Tasks**

- Add manifest-level `stateAndMotion` contracts for layout, navigation, actions, overlays, charts, KPIs, relationship maps, item history, date/calendar, public-site patterns, and scale-lab families.
- Teach the live component-inventory capability lens to read `stateAndMotion` directly instead of relying only on broad text matching.
- Surface the closure in the design-system deficiency assessment backlog.

**Acceptance criteria**

- The `motion` capability lens has no visible gaps on the design-system component inventory.
- Reduced-motion expectations, hook names, supported states, and transition surfaces are visible from `docs/component-manifest.json`.
- The remaining deficiency assessment work is not mixed with motion-state evidence.

**Status evidence**

- `docs/component-manifest.json` now includes `stateAndMotion` entries for all formerly missing motion/state families.
- `src/js/index.js` now evaluates `card.stateAndMotion` as first-class readiness evidence for the motion capability lens.
- `docs/component-api.md`, `docs/recipes.md`, and `examples/components.html` document the manifest state/motion contract and closed gate.

### FW-020 KPI Metric Event Contract

**User story:** As a dashboard buildout agent, I need KPI cards to emit a stable event when their displayed value, delta, metadata, or trendline changes so live overview pages can synchronize without scraping card text.

**Tasks**

- Promote KPI metrics from static display evidence to an interactive event-backed component contract.
- Dispatch `if:kpi-metric-update` from metric cards when their sparkline render, step, reset, or stream update changes the displayed metric state.
- Document the event payload in the event catalog, component API, recipes, and manifest.

**Acceptance criteria**

- The component inventory event lens has no visible gaps.
- KPI metric updates expose label, value, change text, trend, raw values, delta, metadata, and state in one event detail object.
- The design-system deficiency assessment reports no component issues after hydration.

**Status evidence**

- `src/js/index.js` dispatches `if:kpi-metric-update` from `.if-metric` cards with compact dashboard state.
- `docs/component-manifest.json` lists `if:kpi-metric-update` for `kpi-metrics` and updates the behavior/event policy contract.
- `docs/event-catalog.md`, `docs/component-api.md`, `docs/recipes.md`, and `examples/components.html` document the KPI event closure.

### FW-021 Chart Point Selection Contract

**User story:** As an analytics buildout agent, I need chart points to expose a stable selection event and ARIA state so charts can drive details, filters, telemetry, and saved workspace state without custom DOM scraping.

**Tasks**

- Normalize chart points with `role="button"`, `data-if-chart-index`, and `aria-selected`.
- Dispatch `if:chart-point-select` when a user or host selects a chart datum by pointer, keyboard, or API.
- Add selected-state styling across bar, line, pie, heatmap, grouped, stacked, bullet, histogram, funnel, scatter, and treemap chart variants.
- Document the API, event payload, recipes, manifest hook, and deficiency-assessment closure.

**Acceptance criteria**

- Click, `Enter`, `Space`, and `InterfaceFramework.selectChartPoint(point)` select the same datum through one contract.
- Event detail includes chart type, chart label, point index, label, value, raw value, share, series, and selected state.
- Selected chart points visibly persist selected state and expose `aria-selected="true"`.

**Status evidence**

- `src/js/index.js` normalizes chart points and dispatches `if:chart-point-select`.
- `src/styles/components.css` adds selected-state styling for chart point variants.
- `docs/component-manifest.json`, `docs/event-catalog.md`, `docs/component-api.md`, `docs/recipes.md`, and `examples/components.html` document the chart point closure.

### FW-022 Deficiency Assessment Hydration Stability

**User story:** As a framework handoff reviewer, I need the live deficiency assessment to avoid false evidence gaps while async component manifest metadata loads.

**Tasks**

- Detect manifest-backed inventories that have not yet resolved metadata.
- Render an evidence-loading state for the deficiency panel instead of scoring card-only placeholder data.
- Re-render the real assessment once the manifest resolves, and fall back to card-only scoring if manifest loading fails.
- Surface the closure in the design-system deficiency backlog.

**Acceptance criteria**

- The deficiency panel does not flash broad P1 evidence gaps before manifest metadata loads.
- After manifest hydration, the assessment reports the real component evidence state.
- Manifest failure still produces a usable card-only assessment rather than a permanently pending panel.

**Status evidence**

- `src/js/index.js` adds manifest-pending detection and a deficiency loading state.
- `src/js/index.js` re-applies inventory filters after manifest-load failure so fallback scoring remains available.
- `examples/components.html` and `docs/recipes.md` add FW-022 to the closed readiness gates.

### FW-023 Deficiency Assessment Event Contract

**User story:** As a release dashboard or agentic handoff consumer, I need the deficiency assessment to emit a stable event whenever its generated readiness state changes so I can persist or react to framework debt without scraping visible text.

**Tasks**

- Dispatch `if:component-inventory-deficiency` after the readiness report and deficiency panel are refreshed.
- Include assessment totals, focus guidance, ranked deficiencies, weak capability lenses, and backlog data in the event detail.
- Document the event in the event catalog, component API, recipes, and manifest.
- Surface the closure in the live design-system deficiency backlog.

**Acceptance criteria**

- Filter, preset, and manifest-driven report refreshes emit `if:component-inventory-deficiency`.
- The event detail matches the same assessment shape returned by `getComponentInventoryDeficiencyAssessment(inventory)`.
- The design-system deficiency assessment remains clear and reports the new closed gate.

**Status evidence**

- `src/js/index.js` dispatches the event from `updateComponentInventoryReadinessReport`.
- `docs/event-catalog.md`, `docs/component-api.md`, `docs/recipes.md`, and `docs/component-manifest.json` document the event contract.
- `examples/components.html` records FW-023 as a closed readiness gate.

### FW-024 Deficiency Snapshot Contract

**User story:** As a release smoke script, package-health monitor, or downstream buildout agent, I need the readiness snapshot to include the deficiency assessment so I can evaluate framework debt from one serializable payload.

**Tasks**

- Add a `deficiencyAssessment` block to `getComponentInventoryReadinessSnapshot(inventory)`.
- Keep the snapshot block serializable by excluding DOM references while preserving filters, totals, backlog, top deficiencies, weak capability lenses, and focus guidance.
- Document the snapshot shape in the component API and recipes.
- Surface the closure in the live design-system deficiency backlog.

**Acceptance criteria**

- `JSON.stringify(getComponentInventoryReadinessSnapshot(inventory))` succeeds.
- The snapshot exposes the same deficiency totals and focus guidance as the visible panel.
- The design-system deficiency assessment remains clear and reports the new closed gate.

**Status evidence**

- `src/js/index.js` includes `deficiencyAssessment` in readiness snapshots.
- `docs/component-api.md` and `docs/recipes.md` document the one-call handoff payload.
- `examples/components.html` records FW-024 as a closed readiness gate.

### FW-012 Public Site Handoff Plan

**User story:** As the AdamBoas.com buildout agent, I need a content and component map before production implementation begins.

**Status evidence**

- `docs/public-site-handoff.md` declares `frozen-for-v0.1-public-site-handoff` and defines AdamBoas.com route contracts for Homepage, Services, Profile, Resume, Insights, Insight detail, Contact, Attribution, Reference Loop, and Public Search.
- The handoff contract maps each route to primary framework components, trusted examples, content schemas, adapter states, required events, and acceptance checks.
- Public-site content schemas now include `PublicSiteProfile`, `PublicSiteService`, `PublicSiteEngagementPackage`, `PublicSiteInsightPost`, `PublicSiteResumeRole`, `PublicSiteContactRequest`, `PublicSiteAttributionRecord`, `PublicSiteSearchRecord`, and `PublicSiteArtifactRef`.
- Public adapter contracts now name `profileContentAdapter`, `servicesContentAdapter`, `insightIndexAdapter`, `publicSearchAdapter`, `contactSubmitAdapter`, and `attributionAdapter` with loading, success, empty, error, and cancelled states.
- `docs/agent-handoff.md`, `docs/package-handoff.md`, `docs/recipes.md`, `docs/next-steps.md`, `package.json`, and `examples/components.html` now point to the public-site handoff contract as a package-owned artifact.

**Tasks**

- Keep the public-site handoff contract synchronized when public-site components, starters, events, or adapter APIs change.
- Convert accepted downstream changes into migration notes instead of editing starter assumptions silently.

**Acceptance criteria**

- AdamBoas.com buildout can start from component recipes and schemas, not from wireframe interpretation alone.
- Public-site route/content contracts are package-exported and validated as part of the release gate.

### FW-013 Starter Kits

**User story:** As a downstream product agent, I need starter folders for the Policy site and AdamBoas.com with framework wiring already in place.

**Status evidence**

- `starters/policy-plain-html` consumes `node_modules/control-surface-ui/dist/*` and provides route placeholders, utility controls, KPI/table/detail composition, and adapter guidance.
- `starters/policy-vite` imports `control-surface-ui/css` plus ESM behavior APIs and includes autocomplete/table adapter stubs.
- `starters/adamboas-plain-html` consumes `node_modules/control-surface-ui/dist/*` and provides public-site navigation, hero, services, insights, profile/contact scaffolding, and public search hooks.
- `starters/adamboas-vite` imports packaged CSS/ESM behavior APIs and provides a public-site route shell with theme controls and writing cards.
- `docs/package-handoff.md`, `docs/agent-handoff.md`, `README.md`, and `package.json` now include the starter kits as package-owned handoff artifacts.

**Acceptance criteria**

- Plain HTML and Vite starter folders consume the package and demonstrate shells, themes, adapters, and routing placeholders.
- A new downstream site can begin from starter artifacts instead of copying from `examples/`.

## P2 Work Items

| ID | Work item | Acceptance criteria |
| --- | --- | --- |
| FW-014 | Icon Registry Governance | Domain icons, official seals, customer-provided images, and open-source icons have registration, attribution, sizing, and theme rules. |
| FW-015 | Docs Site Packaging | Docs can be published as static pages or GitHub Pages without depending on the demo app. |
| FW-016 | Migration Recipes | Common downstream upgrade and component replacement recipes exist for future releases. |

## Immediate Next Steps

1. Run the package release smoke after the latest docs and dist updates, then refresh `release/provenance.json` and `release/provenance.md`.
2. Keep FW-011 graph/diagram production-path evidence current when graph or diagram APIs change.
3. Keep FW-017 document intelligence production-path evidence current when parser, artifact, annotation, or review handoff APIs change.
4. Keep `docs/public-site-handoff.md` synchronized if AdamBoas.com starter routes, public search, contact flows, or attribution rules change.
5. Package the final tarball and hand off `docs/agent-handoff.md`, this work-item list, `docs/graph-diagram-production-path.md`, `docs/document-intelligence-production-path.md`, `docs/public-site-handoff.md`, and `docs/mvp-acceptance-checklist.md` to the next agent.

## Handoff Package Index

The minimum framework package handoff is:

- `release/control-surface-ui-0.1.0.tgz`
- `README.md`
- `CHANGELOG.md`
- `docs/package-handoff.md`
- `docs/github-shipping-work-items.md`
- `docs/graph-diagram-production-path.md`
- `docs/document-intelligence-production-path.md`
- `docs/agent-handoff.md`
- `docs/mvp-route-contracts.md`
- `docs/route-component-map.md`
- `docs/adapter-fixture-contracts.md`
- `docs/mvp-acceptance-checklist.md`
- `docs/component-manifest.json`
- `docs/component-api.md`
- `docs/recipes.md`
- `docs/event-catalog.md`
- `docs/data-schemas.md`
- `docs/testing.md`
- `docs/release-governance.md`
- `docs/release-checklist.md`
- `dist/interface-framework.checksums.json`
- `dist/SHA256SUMS`
- `starters/README.md`
- `starters/policy-plain-html/`
- `starters/policy-vite/`
- `starters/adamboas-plain-html/`
- `starters/adamboas-vite/`
