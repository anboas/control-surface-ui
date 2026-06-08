# Component Coverage Audit

This audit maps the extracted local design documents and interface design documents to the current framework. It is intended as a practical coverage checklist, not a raw transcript of the source documents.

## Coverage Matrix

| Requirement area | Framework coverage | Reference surfaces |
| --- | --- | --- |
| Distributable framework contract | Source tokens, source CSS, vanilla JS behavior layer, Vite build, compiled CSS and JS artifacts, examples, docs, README, and package metadata are present. | `src/tokens/`, `src/styles/`, `src/js/`, `dist/`, `examples/`, `docs/`, `README.md`, `package.json` |
| Design tokens | Color, typography, spacing, radius, shadow, border, z-index, motion, density, dark/high-contrast themes, and semantic state tokens are represented as CSS custom properties. | `src/tokens/`, `src/styles/themes.css`, `docs/themes.md`, `docs/design-system.md` |
| Product shell and layout | Enterprise shell, compact topbar, horizontal primary navigation, left sidebars, right contextual rails, content regions, panels, cards, grids, split views, drawers, responsive navigation, and dense dashboard regions are available. | `examples/index.html`, `examples/dashboard.html`, `examples/sources.html` |
| Core controls | Buttons, icon buttons, inputs, selects, search bars, filters, tabs, accordions, modals, drawers, alerts, badges, chips, cards, metadata panels, status indicators, and state surfaces are covered. | `examples/components.html`, `docs/components.md` |
| P0/P1 component gap closure | Upload/dropzone, command palette, editable grid, date/calendar picker, wizard/stepper, annotation toolbar, adapter success/empty/loading/error/cancelled variants, and the reusable adapter task lifecycle are implemented, documented, and owned in the component manifest. | `examples/components.html#coverage-components`, `docs/component-api.md`, `docs/component-manifest.json` |
| Search and filtering | Autocomplete with local and mock remote/server-side behavior, highlighted suggestion matches, advanced search builder, semantic expansion controls, saved searches, recent searches, filter chips, and reset/apply flows are present. | `examples/index.html`, `examples/search.html`, `examples/graph-view.html` |
| Data tables | Dense tables include sorting, filtering, pagination, selectable rows, expandable details, table toolbar actions, row states, status badges, and source/run-specific columns. | `examples/index.html`, `examples/sources.html`, `examples/review.html`, `docs/components.md` |
| Performance and scale | On-demand stress lab generates large synthetic table, graph, diagram, document, and chart surfaces with render budgets and overflow checks. | `examples/components.html#performance-scale`, `docs/component-api.md`, `docs/components.md` |
| Graph and relationship exploration | Graph nodes, routed edges, arrows, edge labels, clusters, traversal controls, relationship filters, draggable nodes, hover peeks, detail panels, zoom/pan/fit/reset, layout modes, and organization options are implemented as reusable graph patterns. | `examples/graph-view.html`, `docs/components.md`, `docs/usage.md` |
| Hierarchy and landscape views | Parent-child hierarchy explorers, authority paths, impact paths, law-to-implementation landscape views, organization hierarchy examples, and selectable hierarchy detail panels are represented. | `examples/components.html`, `examples/graph-view.html` |
| Policy detail and lineage | Policy records, selected policy summaries, lineage cards, version history, relationship summaries, linked obligations, deadlines, impacted organizations, provenance, review state, and quick actions are covered. | `examples/index.html`, `examples/dashboard.html`, `examples/components.html` |
| Document and artifact intelligence | Embedded source artifact viewing, reconstituted document text, extracted metadata, full text search, query highlighting, claim/org/reference/relationship highlighting, artifact cards, parser/provenance strips, and document line navigation are present. | `examples/document-viewer.html`, `docs/components.md`, `docs/usage.md` |
| Claims and line-item tracking | DoDI line-item decomposition, claim rows, claim detail panels, status timelines, evidence targets, obligations, review state, and completion/blocking visualization are available. | `examples/components.html`, `examples/document-viewer.html`, `docs/components.md` |
| Review and workflow | Review queues, decision controls, evidence panes, reviewer notes, provenance ledgers, escalation/assignment controls, compare/diff review, bulk review, status timelines, item history, and decision-state updates are present. | `examples/review.html`, `examples/dashboard.html`, `examples/components.html` |
| Diff and version comparison | Side-by-side policy line changes, added/removed/changed line styling, selected change navigation, decision buttons, conflict indicators, and bulk action composition are covered. | `examples/dashboard.html`, `examples/components.html`, `docs/components.md` |
| Sources, ingest, and agents | Source registry, source health, parsers, source artifacts, agent roster, run controls, publication rules, audit log, ingest/adapter concepts, architecture pipeline cards, and synthetic source-aware data are represented. | `examples/sources.html`, `examples/components.html`, `examples/document-viewer.html` |
| Watchlists and alerts | Watchlist navigation, alert rule builder, trigger conditions, thresholds, severity, quiet hours, escalation, routing, delivery channels, alert preview, and activity history are covered as framework patterns. | `examples/components.html`, `docs/components.md` |
| Workspace personalization | Saved views, dashboard layout editing, widget cards, templates, role presets, user settings, density controls, theme controls, notification menu, and account control menu are represented. | `examples/dashboard.html`, `examples/index.html` |
| Trust, provenance, and confidence | Confidence badges, trust labels, provenance panels, source ledgers, audit logs, parser/model/run metadata, evidence panels, source hashes, and review state badges are represented across product surfaces. | `examples/index.html`, `examples/review.html`, `examples/sources.html`, `examples/document-viewer.html` |
| State and feedback | Empty, loading, error, skeleton, toast, alert, degraded, blocked, paused, stale, and access-state patterns are present. | `examples/components.html`, `docs/components.md` |
| Consulting website patterns | Adam Boas Consulting homepage, services, engagement packages, public-site search, attribution strips, experience/resume, profile media modules, publication cards, reference architecture loops, insights/blog, contact, CTA, stats, cards, badges, progress steps, and public website primitives are represented. | `examples/consulting.html`, `examples/adamboas.html`, `examples/components.html`, `docs/components.md`, `docs/usage.md` |

## Intentional Extension Points

- Production search, graph query, parser, OCR, and extraction engines are outside the framework. The framework supplies the UI contracts, states, and mock interaction layer used to validate those surfaces.
- Large-scale graph layout can remain pluggable. The current vanilla implementation demonstrates radial, authority, impact, traversal, clustering, panning, zooming, and node dragging without forcing a heavy runtime dependency.
- Identity, CUI/access-gated content, and role enforcement are represented visually, but production authorization belongs to the host application.
- The implementation uses the `if-` namespace for the interface framework. Some source documents reference Adam Boas or `ab-` naming; those patterns are represented through `if-site-*` public website primitives and `if-*` framework classes.

## P0/P1 Gap Ownership Register

No unowned P0/P1 component gaps remain as of this audit.

| Gap | Priority | Owner component | Current status | Definition of done evidence |
| --- | --- | --- | --- | --- |
| Upload/dropzone | P1 | `upload-dropzone` | Implemented / owned | Design-system specimen, drop/change behavior, event catalog, manifest entry, recipe, API docs |
| Command palette | P1 | `command-palette` | Implemented / owned | Searchable command list, Ctrl+K/open behavior, keyboard navigation, event catalog, recipe, API docs |
| Editable grid | P1 | `editable-grid` | Implemented / owned | Inline editable cells, dirty state, add-row demo, change event, manifest entry, recipe |
| Date/calendar picker | P1 | `date-calendar-picker` | Implemented / owned | Date selection, output/status sync, event contract, manifest entry, recipe |
| Wizard/stepper | P1 | `wizard-stepper` | Implemented / owned | Interactive stepper, panels, next/previous controls, ARIA current step, event contract |
| Annotation toolbar | P1 | `annotation-toolbar` | Implemented / owned | Semantic tool buttons, preview states, event contract, document-viewer composition path |
| Adapter state variants | P0 | `state-variants` | Implemented / owned | Shared success, empty, skeleton/loading, cancelled, error/retry classes, configurable state preview, `runAdapterTask`, explicit cancellation, task-state inspection, and lifecycle telemetry |

## Remaining Watch Items

- Keep the QA baseline freeze current: browser visual, accessibility, keyboard, mobile, and component-contract baselines now exist and should be updated intentionally through `docs/qa-baseline.md`.
- The current shell environment does not expose `npm` on PATH, though the bundled Node build path works. Keep `npm install` / `npm run build` as the package contract for normal developer environments.
- As production schemas mature, expand documentation for exact claim, relationship, artifact, and source metadata payloads. The components already cover the needed visual and interaction states.
