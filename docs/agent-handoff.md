# Agent Handoff Brief

This brief is the starting point for an agent building the Policy Intelligence MVP with the Control Surface UI. Use it before reading examples or source files.

## Current Package State

- Release smoke passed for `control-surface-ui-0.1.0`.
- Handoff tarball: `release/control-surface-ui-0.1.0.tgz`.
- Starter kits are packaged under `starters/` for Policy Intelligence and AdamBoas.com in plain HTML and Vite variants.
- The framework has no React runtime dependency.
- Use compiled package artifacts in downstream projects; do not copy from `src` unless you are developing the framework itself.

## Handoff Freeze Status

This document is the frozen buildout brief for the next agent. It is intended to be sufficient for planning and starting the Policy MVP without reading prior chat history.

- Source of truth for route scope: `docs/mvp-route-contracts.md`.
- Source of truth for component selection: `docs/component-manifest.json`.
- Source of truth for route wiring: `docs/route-component-map.md`.
- Source of truth for adapter payloads: `docs/adapter-fixture-contracts.md`.
- Source of truth for launch readiness: `docs/mvp-acceptance-checklist.md`.
- Source of truth for remaining framework backlog: `docs/github-shipping-work-items.md`.
- Source of truth for graph and diagram production upgrades: `docs/graph-diagram-production-path.md`, the production upgrade contract for graph node/edge delegation, layout-engine adapters, traversal, accessible fallback, connector routing, export adapters, storage adapters, and diagram edit/session behavior.
- Source of truth for document intelligence production upgrades: `docs/document-intelligence-production-path.md`, the production upgrade contract for document parser output, artifact records, annotation records, search/highlight behavior, review finding handoff, and accessible fallbacks.
- Source of truth for AdamBoas.com public-site buildout: `docs/public-site-handoff.md`, the frozen route, content schema, adapter, trusted-example, and acceptance contract for homepage, services, profile, resume, insights, attribution, reference loop, public search, and contact flows.

Do not start real MVP implementation work in this framework repository. Use this package and these docs to start a separate downstream app repository.

## First 30 Minutes

1. Install the tarball or package into a clean downstream project.
2. Copy the closest starter from `starters/policy-plain-html`, `starters/policy-vite`, `starters/adamboas-plain-html`, or `starters/adamboas-vite`.
3. Open `docs/mvp-route-contracts.md` and pick one route contract.
4. Open `docs/route-component-map.md` for that route and copy the required modules, adapters, events, and example references into the app task plan.
5. Open `docs/component-manifest.json` and select only the named primary components first.
6. Open `docs/adapter-fixture-contracts.md` and create mock adapter stubs with `loading`, `success`, `empty`, `error`, and `cancelled` states.
7. Mount compiled CSS/JS package artifacts and call `InterfaceFramework.init(root, { modules })` after the route renders.
8. Wire route events from `docs/event-catalog.md`; do not invent unregistered event names.
9. Run the downstream app against synthetic fixtures before connecting any service.
10. Check the route against `docs/mvp-acceptance-checklist.md`.
11. Record any new framework gap as a new work item instead of patching around the framework locally.

## Minimum Read Set

1. `docs/component-manifest.json` for component selection.
2. `docs/recipes.md` for implementation playbooks.
3. `docs/component-api.md` for markup, classes, data attributes, and public APIs.
4. `docs/event-catalog.md` for telemetry, persistence, adapters, and workflow events.
5. `docs/data-schemas.md` before wiring tables, graph layouts, document annotations, charts, exports, or adapter payloads.
6. `docs/mvp-route-contracts.md` for detailed page-by-page route contracts.
7. `docs/route-component-map.md` for primary components, secondary components, required behavior, events, and examples by route.
8. `docs/adapter-fixture-contracts.md` for mock and production-shaped adapter payloads.
9. `docs/mvp-acceptance-checklist.md` for the final readiness gate before buildout.
10. `docs/package-handoff.md` for install and release-smoke expectations.
11. `starters/README.md` for package-owned downstream starter kit options.
12. `docs/graph-diagram-production-path.md` before graph traversal, diagram editing, connector routing, graph/diagram export, or layout-engine work.
13. `docs/document-intelligence-production-path.md` before parser output, artifact viewer, annotation, full-text search, or document review workflow work.
14. `docs/public-site-handoff.md` before AdamBoas.com homepage, services, profile, resume, insights, attribution, reference loop, public search, or contact work.

## Handoff Freeze Verification Matrix

| Artifact | Verifies | Next-agent action |
| --- | --- | --- |
| `docs/component-manifest.json` | Component ids, categories, classes, data attributes, APIs, events, docs, examples, and accessibility notes. | Use it to choose a component before opening example markup. |
| `docs/recipes.md` | Practical composition recipes for common framework tasks. | Use it for copy-paste structure and route scaffolding order. |
| `docs/component-api.md` | Stable markup, variants, public APIs, init/destroy behavior, and programmatic controller patterns. | Use it to wire components without relying on synthetic click events. |
| `docs/event-catalog.md` | Event names, payload expectations, adapter lifecycle events, and telemetry hooks. | Use only cataloged events across app/framework boundaries. |
| `docs/data-schemas.md` | Data table, graph, document, chart, export, and adapter schemas. | Normalize service payloads into these shapes before rendering. |
| `docs/themes.md`, `docs/forced-colors.md`, `docs/theme-contrast-report.md`, `docs/theme-contrast-report.json` | Theme tokens, forced-colors behavior, contrast gates, machine-readable report data, and visual smoke targets. | Use them before changing palettes, theme controls, or scoped product surfaces. |
| `docs/graph-diagram-production-path.md` | Graph node/edge delegation, layout-engine adapters, traversal, hidden children, accessible fallback, diagram node types, connectors, search/highlight, edit boundaries, export, and storage adapters. | Use it before building or extending Graph and Diagrams routes. |
| `docs/document-intelligence-production-path.md` | Document parser output, corpus records, artifact records, annotation records, search/highlight behavior, review finding handoff, adapter states, and accessible fallback. | Use it before building or extending Documents, Review, Search, or Data Model document-intelligence surfaces. |
| `docs/public-site-handoff.md` | AdamBoas.com route contracts, public-site content schemas, public search, contact submission, attribution, starter selection, and acceptance checks. | Use it before building public homepage, services, profile, resume, insights, attribution, reference loop, search, or contact surfaces. |
| `docs/mvp-route-contracts.md` | Route jobs, layout contracts, adapters, events, states, and acceptance checks. | Use it as the route-level definition of done. |
| `docs/route-component-map.md` | Route-to-component wiring, modules, controllers, adapter names, and examples. | Use it as the build order for each route. |
| `docs/adapter-fixture-contracts.md` | Mock and production-shaped adapter fixtures. | Use it to build adapter stubs before service integration. |
| `docs/mvp-acceptance-checklist.md` | Framework readiness and route readiness gates. | Use it before asking for production MVP implementation. |
| `docs/github-shipping-work-items.md` | Remaining framework risk register and release-hardening backlog. | Use it to file GitHub issues or continue framework hardening. |

If these artifacts disagree, prefer the route contract first, then the route-component map, then the component manifest. Update the conflicting doc before building.

## Build Rules

- Start from framework components and recipes. Do not invent page-only component systems.
- Use `InterfaceFramework.init(root, { modules: [...] })` after mounting a page or fragment.
- Use `InterfaceFramework.destroy(root, { modules: [...] })` before removing a page or fragment.
- Use `InterfaceFramework.getComponentController(target)` for host-driven `open`, `close`, `toggle`, `select`, `reset`, `refresh`, and `destroy` behavior instead of dispatching synthetic clicks.
- Register production adapters for data-driven surfaces instead of editing demo data in-place.
- Keep route-specific app code outside the framework unless the behavior is reusable across pages.

## MVP Route Map

| Route | MVP purpose | Primary components | Trusted examples | Required adapters |
| --- | --- | --- | --- | --- |
| Overview | Daily policy intelligence dashboard with KPIs, filters, policy records, and selected-record detail. | `shell-layout`, `topbar-utility-cluster`, `sidebar-navigation`, `kpi-metrics`, `data-table`, `metadata-panel`, `search-autocomplete` | `examples/index.html`, `examples/dashboard.html` | `policyRecordsTable`, `globalAutocomplete`, `overviewMetrics` |
| Graph | Relationship traversal across laws, policies, orgs, references, guides, obligations, evidence, and gaps. | `graph-explorer`, `metadata-panel`, `hierarchy-explorer`, `relationship-map`, `state-variants` | `examples/graph-view.html`, `examples/components.html#graph` | `policyGraphLayout`, `graphSearch`, `graphTraversal` |
| Documents | Artifact viewer with original PDF/embed, reconstituted text, claims, orgs, refs, highlights, and parser output. | `document-viewer`, `claim-tracking`, `metadata-panel`, `search-autocomplete`, `state-variants` | `examples/document-viewer.html`, `examples/components.html#documents` | `documentCorpus`, `documentSearch`, `annotationSchema`, `artifactFetch` |
| Review | Human-in-the-loop findings queue with decision controls, evidence, diff, notes, assignment, and audit context. | `review-workflow`, `data-table`, `policy-diff`, `form-validation`, `metadata-panel`, `command-palette` | `examples/review.html`, `examples/dashboard.html` | `reviewQueue`, `reviewDecision`, `workItemCreate`, `assignmentLookup` |
| Sources | Source registry, parser status, agent roster, run controls, publication rules, and audit log. | `data-table`, `governance-patterns`, `charts-analytics`, `metadata-panel`, `state-variants` | `examples/sources.html`, `examples/components.html#governance` | `sourceRegistry`, `agentRuns`, `sourceHealth`, `auditLog` |
| Search | Advanced search builder with natural language query, filters, semantic expansion, related entities, and results table. | `search-autocomplete`, `data-table`, `form-validation`, `metadata-panel`, `chips-badges` | `examples/search.html`, `examples/index.html` | `searchResults`, `searchSuggestions`, `relatedEntities`, `savedSearches` |
| Workspace | Saved views, dashboard personalization, widget layout, settings, density/theme defaults, and user preferences. | `shell-layout`, `sidebar-navigation`, `cards-panels`, `form-validation`, `theme-controls`, `collapsible-surface` | `examples/dashboard.html`, `examples/components.html#configuration` | `workspaceViews`, `userPreferences`, `widgetLayout` |
| Diagrams | Architecture and process diagrams with search, focus, details, export, and optional edit/session layout tools. | `architecture-diagram`, `configuration-demo-controls`, `metadata-panel`, `state-variants` | `examples/diagrams.html`, `examples/diagrams2.html` | `diagramLayout`, `diagramExport`, `diagramSearch` |
| Data Model | Entity catalog, relationship ontology, policy decomposition model, ERD, and source-to-store mapping. | `metadata-panel`, `data-table`, `relationship-map`, `hierarchy-explorer`, `architecture-diagram` | `examples/policy-data-model.html`, `examples/components.html#api-reference` | `entityCatalog`, `relationshipOntology`, `schemaSearch` |

Use `docs/mvp-route-contracts.md` as the detailed implementation contract for each route, `docs/route-component-map.md` as the route-to-component wiring guide, and `docs/adapter-fixture-contracts.md` for production-shaped fixtures. This table is the quick orientation layer.

## Component Selection Guide

| Need | Use | Avoid |
| --- | --- | --- |
| Full product shell | `shell-layout`, `topbar-utility-cluster`, `sidebar-navigation` | Rebuilding headers or sidebars per route. |
| Dense records with operations | `data-table` | Static tables without adapter, sort, filter, page, and state contracts. |
| Global or contextual search | `search-autocomplete` | Custom suggestion popovers. |
| Many-to-many traversal | `graph-explorer` | Hierarchy component when relationships are not strict parent-child. |
| Strict law/org/implementation tree | `hierarchy-explorer` | Graph component when the intended model is a tree. |
| Source facts and selected-record detail | `metadata-panel` | Unstructured cards without field labels. |
| Parser output and text intelligence | `document-viewer`, `claim-tracking` | Raw PDF iframe without extracted text, annotations, and fallback content. |
| Findings decisions | `review-workflow`, `policy-diff`, `form-validation` | Buttons without reason, validation, state, and audit events. |
| Source and agent operations | `governance-patterns`, `state-variants` | One-off health cards without adapter state. |
| Architecture/process artifacts | `architecture-diagram` | Static image-only diagrams when nodes, details, export, or search are required. |

## Adapter Expectations

Every production adapter should support:

- `loading`, `success`, `empty`, `error`, and `cancelled` states.
- `AbortSignal` cancellation for stale requests.
- Retry behavior through framework adapter retry controls when applicable.
- Events from `docs/event-catalog.md` for telemetry and persistence.
- Stable request and result shapes documented in `docs/data-schemas.md`.
- `runAdapterTask(target, adapter, context, { channel })` for new adapter families that need consistent request ids, `AbortSignal`s, stale-request cancellation, state panels, and scoped telemetry before a specialized registry exists.

Recommended MVP adapter names:

| Adapter | Owns | Key events |
| --- | --- | --- |
| `globalAutocomplete` | Topbar and route search suggestions. | `if:autocomplete-request`, `if:autocomplete-results`, `if:autocomplete-cancel`, `if:autocomplete-error` |
| `policyRecordsTable` | Overview policy records table. | `if:table-request`, `if:table-results`, `if:table-error`, `if:table-select` |
| `sourceRegistry` | Sources table and health filters. | `if:table-request`, `if:table-results`, `if:adapter-state` |
| `reviewQueue` | Findings/review queue table. | `if:table-results`, `if:review-workflow-select`, `if:review-workflow-action` |
| `searchResults` | Advanced search result table. | `if:table-filter`, `if:table-results`, `if:autocomplete-select` |
| `policyGraphLayout` | Graph node positioning and traversal expansion. | `if:graph-layout-request`, `if:graph-layout-result`, `if:graph-layout-error` |
| `documentCorpus` | Artifact metadata, PDF/embed URLs, extracted text, and parser summaries. | `if:doc-annotation-select`, `if:doc-mode-change`, `if:adapter-state` |
| `annotationSchema` | Parser annotations for claims, organizations, references, obligations, relationships, implementation, evidence, and gaps. | `if:doc-annotation-select`, `if:doc-annotation-panel`, `if:doc-filter-change` |
| `diagramExport` | PNG/PDF or archive export for diagrams and graph surfaces. | `if:surface-export-request`, `if:surface-export-result`, `if:surface-export-error` |

## Build Order

1. Install the handoff tarball in the Policy MVP workspace.
2. Copy `starters/policy-vite` or `starters/policy-plain-html` into the downstream workspace.
3. Create or prune the app shell, topbar, route nav, account/theme controls, and empty route placeholders.
4. Wire global lifecycle: `init` on mount, `destroy` on route teardown.
5. Add adapter registry stubs for the MVP adapter names above.
6. Build Overview with synthetic adapter data and selected-record detail.
7. Build Sources and Review because they exercise table, state, and workflow contracts.
8. Build Documents with corpus fixtures, search, highlights, and annotation panels.
9. Build Graph with the framework fallback layout first, then register a production layout adapter.
10. Build Search, Workspace, Diagrams, and Data Model routes.
11. Run validation, visual/a11y checks, and route acceptance checks before replacing synthetic fixtures with services.

## Trusted Examples

Use these examples as references:

- `examples/index.html`: overview layout, filters, KPIs, policy table, right detail panel.
- `examples/dashboard.html`: workspace layout, saved views, compare/diff patterns.
- `examples/graph-view.html`: graph traversal, hierarchy explorer, node detail, graph controls.
- `examples/document-viewer.html`: artifact viewer, reconstituted text, highlights, document corpus data.
- `examples/review.html`: review queue, decisions, evidence, notes, provenance.
- `examples/sources.html`: source registry, agent roster, run controls, publication rules.
- `examples/search.html`: advanced search builder and result refinement.
- `examples/diagrams.html` and `examples/diagrams2.html`: diagram primitives, details, export, search/edit stress cases.
- `examples/policy-data-model.html`: entity and relationship model representation.
- `examples/components.html`: component variants, configuration controls, and framework inventory.

Use examples for composition and behavior, not as production data models.

## Known Gaps And Cautions

- Browser visual and a11y baselines should still be run and committed before fast MVP iteration.
- Graph and diagram production paths are now frozen in `docs/graph-diagram-production-path.md`. Use built-in layouts for MVP scaffolding, but expect a production layout engine for larger real graph data and a production persistence adapter for diagram authoring.
- Document parser output and annotation handoff are now frozen in `docs/document-intelligence-production-path.md`. Production services still need to normalize live parser payloads to the documented `DocumentParserOutput` and `DocumentAnnotationRecord` shapes before service integration.
- Diagram editing is useful for demos and session layout work. Production diagram authoring must provide explicit persistence, permission, audit, and conflict rules outside the framework.
- Official seals and customer-provided marks may require an attribution/licensing policy outside the framework.
- Do not treat example synthetic data as canonical policy truth.

## MVP Ready Checklist

- Use `docs/mvp-acceptance-checklist.md` as the authoritative buildout readiness checklist.
- Release smoke passed and handoff tarball is available.
- Package-owned starter kits are available for Policy Intelligence and AdamBoas.com in plain HTML and Vite variants.
- Route contracts exist for every MVP route.
- Adapter stubs exist for every route that loads data.
- Each route maps to framework components and trusted examples.
- App shell initializes and destroys framework behavior on route changes.
- Overview, Graph, Documents, Review, Sources, and Search have loading, empty, error, and success states.
- Visual and accessibility checks have been run against MVP-critical routes.
- No production route relies on framework source files directly.
