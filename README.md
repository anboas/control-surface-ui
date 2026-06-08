# Control Surface UI

A reusable front-end interface framework for dense enterprise control surfaces, analytics tooling, graph exploration, review queues, source controls, diagrams, document intelligence, and public-site patterns. It is distributed as compiled CSS and JavaScript and works in plain HTML without a React runtime.

## What Is Included

- Design tokens in `src/tokens/`
- Source CSS organized into `src/styles/`
- Vanilla JavaScript behavior in `src/js/`
- Compiled assets in `dist/`
- Plain HTML examples in `examples/`
- Usage and component documentation in `docs/`
- Icon-system guidance in `docs/icons.md`
- Data schema reference in `docs/data-schemas.md`
- Component API reference in `docs/component-api.md`
- Agent-readable component manifest in `docs/component-manifest.json`
- Recipe index in `docs/recipes.md`
- Event catalog in `docs/event-catalog.md`
- Agentic implementation guide in `docs/agentic-ergonomics.md`
- Theme guidance in `docs/themes.md`, forced-colors guidance in `docs/forced-colors.md`, and generated contrast reports in `docs/theme-contrast-report.md`
- Accessibility contract in `docs/accessibility.md`
- Keyboard behavior specification in `docs/keyboard.md`
- Testing workflow in `docs/testing.md`
- Release smoke report in `docs/release-smoke.md`
- Agent handoff brief in `docs/agent-handoff.md`
- Policy MVP route contracts in `docs/mvp-route-contracts.md`
- Route-to-component implementation map in `docs/route-component-map.md`
- Adapter fixture contracts in `docs/adapter-fixture-contracts.md`
- MVP acceptance checklist in `docs/mvp-acceptance-checklist.md`
- AdamBoas.com public-site handoff in `docs/public-site-handoff.md`
- Contract operations conversion task plan in `docs/contract-operations-conversion-tasks.md`
- GitHub shipping work items in `docs/github-shipping-work-items.md`
- Starter kits in `starters/` for Policy Intelligence and AdamBoas.com plain HTML and Vite consumers
- Release governance in `docs/release-governance.md`
- Migration notes in `docs/migration.md`
- Browser support policy in `docs/browser-support.md`
- Deprecation policy in `docs/deprecation-policy.md`
- Release checklist in `docs/release-checklist.md`
- Next-step planning notes in `docs/next-steps.md`
- Versioned release notes in `CHANGELOG.md`

## Quick Start

Install dependencies and build:

```bash
npm install
npm run theme:compile
npm run build
npm run accessibility
npm run test:contracts
npm run validate
npm run release:verify
```

Use the compiled files in any HTML page:

```html
<link rel="stylesheet" href="./dist/interface-framework.css">
<script src="./dist/interface-framework.js"></script>
```

Or import the package from a bundler such as Vite:

```js
import "control-surface-ui/css";
import { init, destroy, setTheme } from "control-surface-ui";

init(document);
setTheme("light");
```

Or use pinned CDN assets:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/control-surface-ui@0.1.0/dist/interface-framework.min.css">
<script src="https://cdn.jsdelivr.net/npm/control-surface-ui@0.1.0/dist/interface-framework.min.js"></script>
```

Run the local example server:

```bash
npm run dev
```

Then open `http://localhost:5173/examples/index.html`.

## Design Language

The framework is inspired by operational intelligence wireframes: restrained enterprise branding, dense but readable tables, strong provenance and confidence cues, card-based metadata, graph exploration patterns, and review-oriented action surfaces.

The system favors:

- Mobile-first layouts that scale into multi-panel desktop workspaces
- High information density without decorative clutter
- Clear selection states and confidence/status visualization
- Reusable shell, sidebar, topbar, panel, table, dashboard, and graph primitives
- Graph node type registry for production-owned semantic nodes, icons, colors, labels, and per-type render hooks
- Dependency-free outline icon slots for common controls, entities, and graph nodes
- First-party policy, defense-domain, artifact, and source glyphs with guidance for open-source icon pack extension
- Light-default, dark, high-contrast, explicit system, calm, and executive theme tokens with reusable theme-switching controls
- Data attributes for optional JavaScript behavior

## Distributed Files

After `npm run build`, these files are generated:

- `dist/interface-framework.css`
- `dist/interface-framework.min.css`
- `dist/interface-framework.js`
- `dist/interface-framework.min.js`
- `dist/interface-framework.esm.js`
- `dist/interface-framework.esm.min.js`
- `dist/interface-framework.checksums.json`
- `dist/SHA256SUMS`

The browser files expose `window.InterfaceFramework` for plain HTML and CDN usage. The ESM files power package imports through Vite or other bundlers. The package is CDN-ready through explicit `unpkg`, `jsdelivr`, `style`, `browser`, `module`, and `exports` metadata. For version history and pinned CDN examples, see `CHANGELOG.md`.

## Agentic Ergonomics

Agents and automation can select and wire components from metadata without reading the source files:

- `control-surface-ui/component-manifest`: machine-readable inventory with when-to-use guidance, required classes, data attributes, APIs, events, docs, and examples.
- `control-surface-ui/recipes`: task-oriented implementation playbooks.
- `control-surface-ui/event-catalog`: event names, targets, payloads, and listener patterns.
- `control-surface-ui/agent-handoff`: MVP route map, component choices, trusted examples, adapter expectations, build order, and known gaps.
- `control-surface-ui/mvp-route-contracts`: page-by-page MVP route contracts for Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model.
- `control-surface-ui/route-component-map`: per-route component selection, JavaScript behavior, expected events, and examples.
- `control-surface-ui/adapter-fixture-contracts`: production-shaped mock fixture contracts for tables, autocomplete, graph layouts, documents, sources, search, review, and exports.
- `control-surface-ui/mvp-acceptance-checklist`: readiness gate for starting Policy MVP buildout.
- `control-surface-ui/public-site-handoff`: AdamBoas.com route contracts, content schemas, public search and contact adapters, attribution rules, trusted examples, and acceptance checks.
- `control-surface-ui/github-shipping-work-items`: repo-ready framework packaging milestones, issue stories, scope guardrails, and release gates.
- `control-surface-ui/starters`: packaged Policy Intelligence and AdamBoas.com plain HTML and Vite starter kit index.
- `control-surface-ui/performance-budgets`: frozen performance profile thresholds, budget result schema, and browser release-gate criteria.
- `control-surface-ui/agentic-ergonomics`: end-to-end selection, lifecycle, adapter, and documentation workflow.

Use these docs before adding a new component, data attribute, adapter, or emitted event.

## Quality And Validation

Use the validation suite before sharing framework changes:

```bash
npm run validate
npm run accessibility
npm run test:contracts
```

`npm test` runs the same suite as `npm run validate`. The validator checks required artifacts, package export targets, CSS import resolution, example-page distribution contracts, static example links, icon/chart/data-schema contracts, theme contrast reports, component API docs, ARIA/keyboard accessibility contracts, component contracts, JSON data, and JavaScript syntax. Use `npm run accessibility` when you only need the accessibility contract suite.

Browser regression suites are available after installing Playwright browsers:

```bash
npm run playwright:install
npm run test:visual
npm run test:a11y:browser
npm run test:browser
```

See `docs/framework-quality.md` for the full component completion checklist, `docs/testing.md` for visual-regression, browser-a11y, and component-contract workflows, and `docs/next-steps.md` for the current production-hardening roadmap.
Use `docs/github-shipping-work-items.md` to finish packaging the framework as a GitHub-ready deliverable without starting MVP implementation. Use `docs/agent-handoff.md` as the starting brief for a buildout agent beginning the Policy Intelligence MVP later, then use `docs/mvp-route-contracts.md` as the page-by-page build contract, `docs/route-component-map.md` as the implementation map, and `docs/adapter-fixture-contracts.md` for production-shaped mock data.
Use `docs/mvp-acceptance-checklist.md` as the final readiness gate before the downstream Policy MVP build starts. Use `docs/public-site-handoff.md` before starting AdamBoas.com public-site buildout.

## Release Governance

Use `npm run release:verify` before packaging or handing artifacts to another team. The release gate rebuilds the compiled assets, verifies SHA-256 checksum artifacts, verifies local release provenance, and runs the validation suite.

Use the full package-consumer smoke before handoff:

```bash
node scripts/release-smoke.mjs
# or, when npm is available on PATH
npm run release:smoke
```

The smoke script runs `npm pack`, installs the tarball into clean plain HTML and Vite consumers, verifies package exports/CDN metadata, and confirms the installed package does not include a React runtime dependency. See `docs/package-handoff.md` for the downstream handoff path.

After package smoke, refresh the local provenance evidence:

```bash
npm run release:provenance
npm run release:provenance:check
```

Starter kits are packaged under `starters/`:

- `starters/policy-plain-html`
- `starters/policy-vite`
- `starters/adamboas-plain-html`
- `starters/adamboas-vite`

Use these as downstream starting shells before copying deeper composition from `examples/`.

Release governance artifacts:

- `docs/release-governance.md`: release gates, downstream audit workflow, and signing/checksum policy
- `docs/package-handoff.md`: exactly what to hand to another project and how an agent should consume it
- `docs/agent-handoff.md`: route map, component selection guide, adapter expectations, build order, and known MVP gaps
- `docs/mvp-route-contracts.md`: detailed page contracts for the Policy Intelligence MVP routes
- `docs/route-component-map.md`: route-to-component, behavior, event, and example mapping
- `docs/adapter-fixture-contracts.md`: adapter fixture shapes for mocks, production adapters, and state testing
- `docs/mvp-acceptance-checklist.md`: definition of ready for Policy MVP buildout
- `docs/public-site-handoff.md`: AdamBoas.com public route, content schema, adapter, attribution, and acceptance contract
- `docs/github-shipping-work-items.md`: issue-ready framework packaging work items and GitHub handoff gates
- `docs/performance-budgets.md`: scale budgets for large tables, graphs, diagrams, documents, and charts
- `docs/migration.md`: version-by-version upgrade guidance
- `docs/browser-support.md`: evergreen browser and forced-colors support policy
- `docs/deprecation-policy.md`: public contract deprecation and removal rules
- `docs/release-checklist.md`: publish-readiness checklist
- `dist/interface-framework.checksums.json` and `dist/SHA256SUMS`: generated artifact hashes
- `release/provenance.json` and `release/provenance.md`: local package, checksum, tarball, CDN/export, and no-React runtime provenance evidence

Production package signing should happen in the publish pipeline through npm provenance/Sigstore where available, or by signing the generated checksum artifacts.

## Examples

- `examples/index.html`: policy overview, filters, records table, detail panel
- `examples/components.html`: component and pattern library
- `examples/dashboard.html`: saved workspace, review queue, compare/diff patterns
- `examples/graph-view.html`: graph explorer, node selection, hierarchy explorer, entity detail panel
- `examples/sources.html`: source registry, agent controls, publication rules, audit log
- `examples/review.html`: review queue, decision controls, evidence, diff, history
- `examples/search.html`: advanced search builder, semantic controls, refinements, results
- `examples/document-viewer.html`: ingested artifact viewer, corpus records from `examples/data/policy-corpus.json`, reconstituted text, semantic highlights, and source metadata
- `examples/theme-states.html`: scoped theme snapshots for built-in themes, semantic states, and contrast visual smoke targets
- `examples/diagrams.html`: architecture diagram primitives and Azure deployment architecture reconstruction
- `examples/diagram3.html`: FastDAS autonomous growth operations diagram using framework diagram controls
- `examples/policy-data-model.html`: source hierarchy, ERD-style canonical entity catalog, relationship ontology, decomposition pipeline, and storage mapping from `examples/data/policy-data-model.json`
- `examples/consulting.html`: Adam Boas Consulting website patterns, services, profile, resume, blog, and contact flows

Each example loads only compiled files from `dist/`.

## Browser Support

The framework uses modern CSS custom properties, grid, flexbox, SVG, and standard DOM APIs. It is intended for current evergreen browsers. See `docs/browser-support.md` for the formal browser, forced-colors, and support-change policy.

## JavaScript API

The compiled browser bundle auto-initializes and exposes reusable behavior through `window.InterfaceFramework`, including stable lifecycle `init`/`destroy`, module-scoped `initBehavior`/`destroyBehavior`, behavior module registration, tabs, drawers, modals, popovers, tooltips, validation states, autocomplete, menus, charts, graph traversal, hierarchy explorers, document search, policy diffs, and export helpers. The adapter lifecycle API includes `runAdapterTask`, `cancelAdapterTask`, `getAdapterTaskState`, shared state panels, request ids, `AbortSignal` cancellation, and generic/channel-scoped telemetry for production analytics adapters. The table API includes sorting, filtering, pagination, selection, expansion, column resizing, sticky pinning, virtualization, async server adapters with cancellation, and loading/error/empty states. The graph API includes layout-engine adapters with cancellation, layout-result application, and accessible node/edge fallback indexes for non-visual or keyboard-first workflows.

For host apps, tests, and agent-authored integrations, prefer the controller facade when operating components programmatically:

```js
const graph = InterfaceFramework.getComponentController("[data-if-graph]");
graph.select("dodi-5200-01");
graph.reset();

const menu = InterfaceFramework.getComponentController("#export-menu-toggle");
menu.open();
menu.close({ restoreFocus: true });
```

The controller delegates to the same behavior paths as pointer and keyboard interaction, so ARIA state, classes, events, and visible state stay synchronized. See `docs/component-api.md#programmatic-behavior-contract`.

## License

MIT
