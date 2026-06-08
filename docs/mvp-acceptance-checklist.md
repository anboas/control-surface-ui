# Policy MVP Acceptance Checklist

This checklist defines what "ready to build the Policy Intelligence MVP" means for the framework handoff. Use it as the final gate before a downstream agent starts implementing production routes.

## MVP Planning Freeze Evidence

Status: frozen-for-v0.1-planning-handoff.

The planning package is complete when `docs/mvp-route-contracts.md`, `docs/route-component-map.md`, `docs/adapter-fixture-contracts.md`, this checklist, `docs/agent-handoff.md`, and `docs/github-shipping-work-items.md` agree on route scope, component choices, adapter names, state expectations, and the no-real-MVP-work boundary.

Planning freeze source-of-truth order:

1. Route scope and acceptance: `docs/mvp-route-contracts.md`
2. Component selection and behavior wiring: `docs/route-component-map.md`
3. Mock and production-shaped adapter payloads: `docs/adapter-fixture-contracts.md`
4. Final readiness gates: `docs/mvp-acceptance-checklist.md`
5. Downstream operating brief: `docs/agent-handoff.md`

## Definition Of Ready

The framework is ready for Policy MVP buildout when every P0 item below is complete and every P1 item is either complete or explicitly owned in the production backlog.

| Gate | Priority | Acceptance check | Evidence |
| --- | --- | --- | --- |
| Package install | P0 | `npm install`, `npm run build`, `npm run validate`, and `npm run release:smoke` pass from a clean checkout or release tarball. | `docs/package-handoff.md`, `docs/release-smoke.md`, `release/control-surface-ui-0.1.0.tgz` |
| Compiled artifacts | P0 | Downstream sites can use only `dist/interface-framework.css` and `dist/interface-framework.js` or package exports. No production route imports framework `src` files directly. | `dist/`, `package.json`, `README.md` |
| No React dependency | P0 | Release smoke confirms the package has no React runtime dependency and works in plain HTML and clean Vite consumers. | `scripts/release-smoke.mjs`, `docs/package-handoff.md` |
| Starter kits | P0 | Policy Intelligence and AdamBoas.com have plain HTML and Vite starter kits that consume package artifacts only and include shell, route, theme/account, and adapter placeholders. | `starters/`, `docs/package-handoff.md`, `docs/agent-handoff.md` |
| Route contracts | P0 | Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model have purpose, layout, adapters, events, states, and acceptance checks documented. | `docs/mvp-route-contracts.md` |
| Route-component mapping | P0 | Each MVP route maps to primary components, secondary components, required JS behavior, expected events, and trusted example pages. | `docs/route-component-map.md` |
| Adapter contracts | P0 | Tables, autocomplete, graph layout, document annotations, source registry, search, review queues, and exports have mock and production-shaped fixture contracts. | `docs/adapter-fixture-contracts.md`, `docs/data-schemas.md` |
| Component ownership | P0 | The coverage audit has no unowned P0/P1 gaps for MVP-critical components. | `docs/component-coverage-audit.md` |
| Agent handoff | P0 | A buildout agent can find the build order, trusted examples, adapter expectations, known gaps, and component selection guidance without reading every source file. | `docs/agent-handoff.md`, `docs/component-manifest.json`, `docs/recipes.md` |
| Browser QA baseline | P0 | Playwright visual screenshots and browser accessibility checks are established for MVP-critical surfaces across desktop/mobile. | `tests/playwright/__screenshots__/`, `docs/testing.md` |
| Accessibility and keyboard | P0 | Static and browser accessibility suites pass, and keyboard behavior specs exist for navigation, overlays, forms, menus, graph, document, and diagram interactions. | `docs/accessibility.md`, `docs/keyboard.md`, `tests/playwright/a11y.spec.mjs` |
| Theme readiness | P0 | Light default, dark, high-contrast, system, calm, and executive themes have docs, contrast report, forced-colors guidance, and visual snapshots. | `docs/themes.md`, `docs/forced-colors.md`, `docs/theme-contrast-report.md`, `examples/theme-states.html` |
| Release governance | P0 | Changelog, migration notes, browser support, deprecation policy, release checklist, checksums, local provenance, and release governance docs are present. | `CHANGELOG.md`, `docs/release-governance.md`, `dist/SHA256SUMS`, `release/provenance.json` |
| Performance and overflow | P1 | Large synthetic table, graph, diagram, document, and chart demos have performance/overflow checks and mobile/desktop coverage. | `examples/components.html#performance-scale`, `tests/playwright/component-contracts.spec.mjs` |
| Graph production path | P1 | Built-in graph layouts are usable for MVP scaffolding, and production layout-engine integration, traversal, hidden children, node/edge typing, and accessible fallback are documented for larger real datasets. | `docs/graph-diagram-production-path.md`, `docs/component-api.md`, `docs/data-schemas.md`, `examples/graph-view.html` |
| Document parser path | P1 | Document viewer supports corpus fixtures, artifact records, parser output, reconstituted text, highlighting, claims, orgs, refs, obligations, relationships, implementation, evidence, gaps, and annotation schemas suitable for production parser output. | `docs/document-intelligence-production-path.md`, `examples/document-viewer.html`, `docs/adapter-fixture-contracts.md`, `docs/data-schemas.md` |
| Diagram production path | P1 | Diagram surfaces support details, search/highlight, connector routing, export contracts, optional edit/session tooling, and persistence/event expectations. | `docs/graph-diagram-production-path.md`, `examples/diagrams.html`, `examples/diagrams2.html`, `docs/diagram-component-requirements.md` |

## MVP Route Acceptance

Each route must meet these minimum checks before production buildout begins.

| Route | Ready when |
| --- | --- |
| Overview | KPI cards, filters, policy records table, global autocomplete, and selected-record detail panel are mapped to framework components and adapter fixtures. |
| Graph | Graph explorer, node details, traversal, hierarchy companion, accessible fallback, and layout adapter contract are documented and demonstrated. |
| Documents | Artifact metadata, embedded/source artifact mode, reconstituted text, full-text search, semantic highlights, claims, references, organizations, and annotation schemas are represented. |
| Review | Queue table, finding detail, decision actions, reason validation, notes, assignment, diff/evidence tabs, and provenance/audit surfaces are covered. |
| Sources | Source registry, health/status tables, agent roster, run controls, publication rules, charts, audit log, and adapter states are represented. |
| Search | Natural-language search, autocomplete suggestions, builder clauses, semantic expansion, related entities, filters, and results table have component and adapter contracts. |
| Workspace | Saved views, layout editor, widgets, density/theme settings, personal defaults, and settings panels have reusable patterns and behavior hooks. |
| Diagrams | Architecture diagrams can search/highlight nodes, focus details, export PNG/PDF, and expose optional edit/session layout controls with events. |
| Data Model | Entity catalog, relationship ontology, decomposition hierarchy, ERD-style view, source-to-store mapping, and export/readiness states are represented. |

## Required Commands

Run these before handing the framework to the Policy MVP builder:

```bash
npm install
npm run build
npm run validate
npm run release:smoke
npm run release:provenance
npm run release:provenance:check
npm run playwright:install
npm run test:browser
```

When `npm` is unavailable on PATH, use the bundled Node runtime to run the underlying scripts directly, then record the command variant in the handoff notes.

## Handoff Decision

The framework is ready to begin Policy MVP buildout when:

- All P0 checklist gates are complete.
- P1 gaps have owners and are not blocking the first MVP increment.
- Browser visual and a11y baselines are clean.
- Route and adapter docs are current.
- No unowned P0/P1 component gaps remain.
- The downstream agent starts from `docs/agent-handoff.md`, then follows `docs/mvp-route-contracts.md`, `docs/route-component-map.md`, and `docs/adapter-fixture-contracts.md`.
