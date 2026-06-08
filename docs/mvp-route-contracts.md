# Policy MVP Route Contracts

These contracts define the first production Policy Intelligence routes that should be built with the Control Surface UI. They are intentionally route-level, not page mockups: each route names the user job, layout, component choices, adapters, events, state requirements, acceptance checks, and known caveats.

Use this document with `docs/agent-handoff.md`, `docs/component-manifest.json`, `docs/recipes.md`, `docs/component-api.md`, `docs/event-catalog.md`, and `docs/data-schemas.md`.

## MVP Planning Freeze Status

Status: frozen-for-v0.1-planning-handoff.

This document is the route source of truth for the planning handoff. It covers Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model without starting production MVP implementation. If this file disagrees with `docs/route-component-map.md`, `docs/adapter-fixture-contracts.md`, or `docs/mvp-acceptance-checklist.md`, update the planning artifacts before a downstream agent writes route code.

Freeze evidence:

- Each route has purpose, primary user jobs, layout contract, primary components, required adapters, core events, state requirements, and acceptance checks.
- Every adapter named here is expected to appear in `docs/adapter-fixture-contracts.md`.
- Every route named here is expected to appear in `docs/route-component-map.md` and `docs/mvp-acceptance-checklist.md`.
- Production data, authentication, persistence, deployment, and route implementation work remain out of scope for this framework handoff.

## Global Route Contract

Every MVP route must follow these rules:

- Mount into the product shell with `shell-layout`, `topbar-utility-cluster`, route-aware navigation, and a consistent desktop/mobile content rhythm.
- Call `InterfaceFramework.init(root, { modules: [...] })` after route content is inserted.
- Call `InterfaceFramework.destroy(root, { modules: [...] })` before route content is removed.
- Use `InterfaceFramework.getComponentController(target)` for route-driven component state changes.
- Expose loading, success, empty, error, and cancelled states for every adapter-backed surface.
- Emit or listen to documented events from `docs/event-catalog.md`; do not create route-only event names unless they are added to the framework catalog.
- Keep synthetic data in route fixtures or app adapters, not in framework component source.
- Preserve keyboard access, Escape/click-off reset where relevant, and accessible fallback lists for graph, diagram, and document intelligence surfaces.

## Overview

Purpose: The analyst's daily operating picture for policy changes, stale sources, implementation gaps, linked opportunities, and selected policy detail.

Primary user jobs:

- Scan top-level KPIs and trust the source/date context behind each metric.
- Filter policy records by source, document type, authority, organization, capability area, review state, and confidence.
- Select a policy record and inspect summary, provenance, linked events, opportunities, obligations, and next actions.
- Launch review, graph, compare, source, or watchlist workflows from the selected item.

Layout contract:

- Desktop: left filter rail, central KPI/table column, right contextual detail panel.
- Tablet: filters collapse into drawer; detail panel becomes stacked panel below table or drawer.
- Mobile: top metrics become horizontal scroll or two-column compact grid; table becomes card/list pattern with the same fields.

Primary components:

- `shell-layout`, `topbar-utility-cluster`, `sidebar-navigation`
- `kpi-metrics`, `sparkline`, `data-table`
- `metadata-panel`, `tabs`, `chips-badges`
- `search-autocomplete`, `form-validation`, `state-variants`

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `overviewMetrics` | date range, saved view id, filters | KPI cards with value, delta, icon, source, scope, trend points |
| `policyRecordsTable` | pagination, sort, filters, query, selected id | rows, total count, selected row detail id, adapter state |
| `policyRecordDetail` | record id | summary, tags, provenance, linked events/opportunities/obligations, actions |
| `globalAutocomplete` | query, scope, abort signal | suggestions grouped by policy, source, org, event, route |

Core events:

- `if:table-request`, `if:table-results`, `if:table-select`, `if:table-filter`
- `if:autocomplete-request`, `if:autocomplete-results`, `if:autocomplete-select`
- `if:tab-change`, `if:adapter-state`

State requirements:

- Empty table explains which filters removed results and offers clear filters.
- Detail panel has selected, loading, empty, error, and permission-denied variants.
- Metrics can render stale data with a visible source/date scope and warning tone.

Acceptance checks:

- A user can filter, sort, page, select a row, and see detail without page reload.
- A selected row remains visually and semantically selected.
- KPI cards are dense, aligned, and include icon, label, value, delta, and metadata.
- Route works with only compiled package CSS/JS and registered app adapters.

## Graph

Purpose: Interactive relationship traversal across laws, policies, issuances, organizations, sources, references, obligations, evidence, events, opportunities, gaps, and implementation artifacts.

Primary user jobs:

- Start from a seed entity and traverse in or out by relationship type.
- Switch between radial, authority, impact, organization, and custom layouts.
- Drag nodes, pan/zoom the canvas, select nodes/edges, and inspect details.
- Expand hidden children as normal graph nodes while preserving traversal context.
- Use accessible fallback lists for visible nodes and relationships.

Layout contract:

- Desktop: left graph filter rail, central graph workspace, right detail/traversal panel, bottom path/claims/conflicts panels.
- Tablet/mobile: filters and detail panels become drawers; graph preserves pan/zoom and fallback list.
- Do not require mutually exclusive explore/pan/arrange modes for basic use. Click selects, drag node moves, drag background pans.

Primary components:

- `graph-explorer`, `metadata-panel`, `relationship-map`
- `hierarchy-explorer` for strict tree supplements
- `search-autocomplete`, `chips-badges`, `state-variants`

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `policyGraphLayout` | nodes, edges, layout mode, viewport, filters, abort signal | node positions, edge routes, label hints, warnings |
| `graphTraversal` | seed id, edge direction, relationship type, depth, abort signal | expanded nodes, expanded edges, hidden-child counts |
| `graphSearch` | query, current graph context, abort signal | matching node/edge ids and suggestion groups |
| `graphNodeDetail` | node id, selected edge id optional | metadata, inbound/outbound counts, related sections, actions |

Core events:

- `if:graph-node-select`, `if:graph-edge-select`, `if:graph-reset`
- `if:graph-layout-request`, `if:graph-layout-result`, `if:graph-layout-error`
- `if:graph-traverse`, `if:graph-filter`, `if:adapter-state`

State requirements:

- Nodes with hidden children show a discrete count and expand into ordinary nodes.
- Layout failures leave existing graph visible and show a retryable warning.
- Relationship filters remove both edge visuals and related fallback-list entries.
- Graph supports no-results, partial-results, and permission-filtered states.

Acceptance checks:

- A user can select a node, clear selection by clicking empty graph space, and use Escape to reset focus.
- A user can pan, zoom, drag nodes, and run layout without losing node selection.
- Edge labels, connector segments, and blank connectors render as one coherent relationship mark and remain attached to endpoints.
- Expanded children do not overlap the parent by default and can be dragged beyond the initial viewport.

## Documents

Purpose: Artifact intelligence workspace for source PDFs/files, extracted metadata, reconstituted text, parser annotations, references, organizations, claims, obligations, and evidence.

Primary user jobs:

- Open a source artifact and switch between embedded artifact, reconstituted text, parser output, references, claims, and relationships.
- Search full text and highlight matches.
- Hover or select highlighted org/claim/ref/enables/implements text and inspect its normalized entity record.
- See where referenced documents and DoDI-style citations appear.
- Compare extracted obligations and completion evidence.

Layout contract:

- Desktop: document/corpus rail, central artifact/text pane, right annotation/detail panel.
- Reconstituted text uses aligned line numbers, left-side annotation labels, and hover/click affordances.
- Embedded artifact mode must preserve source context and fallback when PDF/image cannot load.

Primary components:

- `document-viewer`, `claim-tracking`, `metadata-panel`
- `search-autocomplete`, `annotation-toolbar`, `relationship-map`
- `tabs`, `state-variants`, `policy-diff` where a document comparison is required

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `documentCorpus` | corpus id, query, filters, abort signal | document list, metadata, parser status, artifact URLs |
| `artifactFetch` | document id, artifact mode, abort signal | embed URL/blob, text pages, source availability |
| `documentSearch` | document id, query, highlight filters, abort signal | matches, selected line id, grouped results |
| `annotationSchema` | document id, annotation filters | annotations, relationships, entity expansions |

Core events:

- `if:doc-mode-change`, `if:doc-search`, `if:doc-annotation-select`
- `if:claim-select`, `if:history-select`, `if:adapter-state`

State requirements:

- Artifact unavailable shows a recoverable state and keeps extracted text visible if available.
- Search supports loading, empty, cancelled, and error states.
- Annotation clicks scroll to the related line without destroying surrounding context.
- Org acronym hover exposes expansion; click links to the extracted entity panel.

Acceptance checks:

- A user can search text, jump between matches, and see highlighted text in context.
- A user can toggle annotation classes without line-number or label overflow.
- A user can inspect references, organizations, claims, obligations, and evidence from the same document context.
- The route works with PDF unavailable and text-only fallback.

## Review

Purpose: Human-in-the-loop decision console for findings, candidate relationships, implementation gaps, source onboarding candidates, policy changes, and diff/bulk review.

Primary user jobs:

- Triage review queue by status, risk, confidence, assignee, due date, source, and finding type.
- Select a finding and inspect evidence, diff, related records, history, provenance, and agent reasoning.
- Approve, reject, escalate, assign, snooze, or create work items with required reasons where appropriate.
- Bulk-review selected findings with audit-safe state changes.

Layout contract:

- Desktop: left filters, center review queue table, right finding decision panel.
- Bulk diff workspace may use left context rail, central side-by-side diff, right action rail.
- Mobile: queue becomes cards; decision controls remain explicit and reason-first.

Primary components:

- `review-workflow`, `data-table`, `policy-diff`
- `form-validation`, `metadata-panel`, `command-palette`
- `buttons-actions`, `alerts`, `state-variants`

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `reviewQueue` | filters, sort, pagination, selected ids, abort signal | findings, counts, statuses, total count |
| `reviewFindingDetail` | finding id | summary, evidence, related records, history, provenance, agent reasoning |
| `reviewDecision` | finding id, action, reason, reviewer, related work item | updated status, audit entry, validation errors |
| `assignmentLookup` | query, role, team | assignee suggestions and routing metadata |

Core events:

- `if:review-workflow-select`, `if:review-workflow-action`
- `if:diff-decision`, `if:form-error-summary`, `if:table-select`
- `if:adapter-state`

State requirements:

- High-impact/destructive decisions require reason validation.
- Bulk actions show selection count and preview affected items.
- Decision errors preserve user-entered reason and selected item.
- Keyboard shortcuts never hide irreversible actions behind a single key.

Acceptance checks:

- A user can select a queue item, approve/reject/escalate/assign it, and see the ledger update.
- Required decision reason produces an error summary and field-level error.
- Bulk selection state remains consistent across filtering and pagination.
- Diff view supports before/after, conflict counts, and decision context.

## Sources

Purpose: Operations surface for source registry, source health, parsers, agents, publication rules, run controls, and audit trail.

Primary user jobs:

- Monitor active sources, degraded sources, parser status, document volume, and change rates.
- Inspect source records and source health history.
- Review agent roster, last/next run, paused states, and failures.
- Run, pause, resume, reprocess, promote, publish, or hold source workflows.
- See publication thresholds, review gates, and audit log.

Layout contract:

- Desktop: left source filters, main source registry table, right/mid operations panels for agents, rules, controls, and audit.
- Source actions are compact icon/text controls with clear disabled/loading states.
- Charts should fit dense operations panels without card overflow.

Primary components:

- `data-table`, `governance-patterns`, `charts-analytics`
- `metadata-panel`, `buttons-actions`, `state-variants`
- `search-autocomplete`, `form-validation`

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `sourceRegistry` | filters, sort, pagination, query, abort signal | source rows, health, parser status, sparkline data |
| `agentRuns` | agent filters, time window, abort signal | roster, run status, progress, last/next run, errors |
| `sourceHealth` | source id, time window | health summary, trend, incidents, parser warnings |
| `auditLog` | source id optional, event type, time window | audit events, actor, timestamp, result |

Core events:

- `if:table-request`, `if:table-results`, `if:table-action`
- `if:adapter-state`, `if:chart-point-hover`
- `if:surface-export-request` where export is available

State requirements:

- Source and agent operations expose running, healthy, degraded, paused, warning, failed, and blocked states.
- Run controls show pending/running/success/error feedback.
- Publication rule changes require explicit save/reset or confirmation.

Acceptance checks:

- A user can filter sources, select a row, and inspect source health/detail.
- A user can trigger a mock run action and see state transition without layout shift.
- Source table supports sort, filter, pagination, selection, sticky headers, and compact density.
- Audit log remains readable at desktop and mobile breakpoints.

## Search

Purpose: Advanced policy search and filter builder across documents, sources, orgs, claims, relationships, obligations, evidence, and related entities.

Primary user jobs:

- Enter natural language or structured search.
- Build clauses and groups with include/exclude logic.
- Toggle semantic expansion, inferred relationships, proximity, confidence, source tier, date, organization, and relationship filters.
- Review related entities, suggested refinements, top terms, and result snippets.
- Save, pin, or export search/filter sets.

Layout contract:

- Desktop: left filter rail, top natural-language search row, central builder/results, right related/refinement panels.
- Builder clauses are compact but readable; nested groups must not overflow.
- Mobile: advanced builder collapses into stepper/drawer; results remain searchable and pageable.

Primary components:

- `search-autocomplete`, `data-table`, `form-validation`
- `chips-badges`, `metadata-panel`, `cards-panels`
- `buttons-actions`, `state-variants`

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `searchSuggestions` | query, scope, field, abort signal | suggestions, highlighted matches, entities, recent searches |
| `searchResults` | query model, filters, sort, pagination, abort signal | rows, snippets, match metadata, total count |
| `relatedEntities` | query model, selected result ids | entities, relationship counts, scopes |
| `savedSearches` | user id, action, query model | saved search records and persistence state |

Core events:

- `if:autocomplete-request`, `if:autocomplete-results`, `if:autocomplete-select`
- `if:table-request`, `if:table-results`, `if:table-filter`
- `if:adapter-state`

State requirements:

- Suggestions support local, remote, loading, empty, error, and cancelled states.
- Result snippets highlight terms without injecting unsafe HTML.
- Builder validation catches empty clauses, invalid ranges, unsupported fields, and incompatible operators.

Acceptance checks:

- Typing shows highlighted suggestions and cancellation works when the query changes quickly.
- Applying a query updates result count, table rows, related entities, top terms, and refinement suggestions.
- Saved search action emits persistence state and does not lose unsaved query changes on failure.

## Workspace

Purpose: User and team personalization surface for saved views, dashboard layout, widget settings, density, default route, default filters, theme, and access settings.

Primary user jobs:

- Manage saved views, pinned views, team views, and role presets.
- Customize dashboard widgets and order.
- Set default landing page, default saved view, density, number/date defaults, graph depth, and theme preferences.
- Restore defaults or save workspace settings.

Layout contract:

- Desktop: left workspace nav, center layout editor, right settings panel.
- Layout editor uses cards/panels with stable height, drag/reorder affordances, and clear empty slot.
- Mobile: editor becomes stacked list; right settings panel becomes drawer.

Primary components:

- `shell-layout`, `sidebar-navigation`, `cards-panels`
- `collapsible-surface`, `theme-controls`, `form-validation`
- `buttons-actions`, `state-variants`, `wizard-stepper` where setup is multi-step

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `workspaceViews` | user id, team id, filters | saved views, pinned views, team views, counts |
| `widgetLayout` | user id, route, layout changes | widget positions, sizes, visibility, persistence state |
| `userPreferences` | user id, preference patch | theme, density, defaults, validation, save state |

Core events:

- `if:route-change`, `if:disclosure-toggle`, `if:adapter-state`
- `if:theme-change`, `if:form-submit`, `if:form-error-summary`

State requirements:

- Unsaved changes are visible and reversible.
- Save failure preserves local edits and gives retry/reset options.
- Theme changes preview immediately but should persist only through preference save unless host chooses autosave.

Acceptance checks:

- A user can switch saved views, modify widget layout, and save or discard changes.
- Theme/density changes update visible components without route reload.
- Settings forms expose validation and error summary.

## Diagrams

Purpose: Architecture and process diagram surface for reconstructing deployment, agent, data-flow, and intelligence-fabric diagrams with searchable nodes, details, export, and optional session editing.

Primary user jobs:

- View architecture diagrams built from framework primitives, not static screenshots.
- Search node text and metadata with real-time match highlighting.
- Select nodes/connectors and inspect details.
- Export diagrams to PNG and PDF.
- Optionally enable edit mode, then inspect, edit text, move, add, delete, style, or connect nodes with session persistence.

Layout contract:

- Desktop: page heading/summary, compact diagram toolbar, diagram viewport, right or lower detail/edit panel.
- Controls are grouped by mode: view, search, export, edit session, tuning.
- Edit mode is opt-in; tools are disabled or visually secondary until edit mode is enabled.
- Diagram nodes support semantic types, embedded assets, icon slots, background tones, and nested groups.

Primary components:

- `architecture-diagram`, `configuration-demo-controls`
- `search-autocomplete`, `metadata-panel`, `buttons-actions`
- `state-variants`, `charts-analytics` where diagrams show operational metrics

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `diagramLayout` | diagram id, nodes, connectors, layout variables, abort signal | node positions, connector routes, collision warnings |
| `diagramSearch` | diagram id, query, visible groups | matching node ids, highlighted text ranges, result list |
| `diagramExport` | diagram id, format, target surface, abort signal | PNG/PDF blob or URL, status, errors |
| `diagramPersistence` | snapshot, user id, diagram id | saved layout, version, conflict state |

Core events:

- `if:diagram-node-select`, `if:diagram-route-select`
- `if:diagram-search`, `if:diagram-layout-save`, `if:diagram-layout-load`
- `if:surface-export-request`, `if:surface-export-result`, `if:surface-export-error`
- `if:adapter-state`

State requirements:

- Export exposes pending, success, cancelled, and error states.
- Search highlights matches inside visible nodes and dims nonmatching nodes.
- Edit tools clearly indicate selected tool and selected node/connector.
- Session storage fallback works without production persistence.

Acceptance checks:

- A user can search "Azure" or "agent" and see matching nodes highlighted and selectable.
- A user can select a node, edit text in session mode, move it, save, reload, and reset.
- A user can create or edit a connector label/style/tone and see it routed with framework connector styling.
- PNG/PDF export produces a usable artifact or a clear retryable error.

## Data Model

Purpose: Explain and inspect the production information model: entities, relationships, policy decomposition, source-to-store flow, search documents, graph snapshots, review records, and export artifacts.

Primary user jobs:

- Understand what the system tracks and how entities relate.
- Inspect canonical entity definitions and relationship ontology.
- Drill from source artifact to parsed sections, claims, obligations, evidence, graph relationships, and review decisions.
- Validate API/schema expectations before integrating services.

Layout contract:

- Desktop: navigation for model sections, central model diagrams/tables, right metadata or selected entity detail.
- Use tables for field catalogs, relationship maps for ontology, diagrams for data flow, and hierarchy for law-to-implementation chains.
- Mobile: model sections collapse into accordions and detail panels stack below selected item.

Primary components:

- `metadata-panel`, `data-table`, `relationship-map`
- `hierarchy-explorer`, `architecture-diagram`, `document-viewer`
- `chips-badges`, `state-variants`

Required adapters:

| Adapter | Required inputs | Required outputs |
| --- | --- | --- |
| `entityCatalog` | entity type, query, pagination | entity definitions, fields, relationships, examples |
| `relationshipOntology` | source type, target type, relationship type | relationship definitions, direction, confidence rules |
| `schemaSearch` | query, scope | matching entities, fields, docs, examples |
| `decompositionModel` | document id or policy id | sections, claims, obligations, evidence, graph relationships |

Core events:

- `if:table-select`, `if:hierarchy-select`, `if:diagram-node-select`
- `if:connector-routes`, `if:adapter-state`

State requirements:

- Unknown or unsupported entity types render a documented fallback.
- Schema search empty state points to known model sections and docs.
- Relationship direction, confidence, provenance, and review gate rules are visible where relevant.

Acceptance checks:

- A user can search for an entity type, select it, and see fields, relationships, examples, and docs.
- A user can trace a policy artifact from source to decomposition, graph relationship, review gate, and export/search index.
- The data model page references `docs/data-schemas.md` contracts rather than inventing route-only schemas.

## Cross-Route Adapter Names

These names are the first production adapter registry targets. They may be implemented as one service client internally, but route code should address them by these capabilities.

| Adapter | Routes |
| --- | --- |
| `globalAutocomplete` | Overview, Graph, Documents, Search, Sources |
| `overviewMetrics` | Overview |
| `policyRecordsTable` | Overview |
| `policyRecordDetail` | Overview, Data Model |
| `policyGraphLayout` | Graph |
| `graphTraversal` | Graph |
| `graphSearch` | Graph, Search |
| `documentCorpus` | Documents |
| `artifactFetch` | Documents |
| `documentSearch` | Documents |
| `annotationSchema` | Documents, Data Model |
| `reviewQueue` | Review |
| `reviewFindingDetail` | Review |
| `reviewDecision` | Review |
| `assignmentLookup` | Review |
| `sourceRegistry` | Sources |
| `agentRuns` | Sources |
| `sourceHealth` | Sources |
| `auditLog` | Sources |
| `searchSuggestions` | Search |
| `searchResults` | Search |
| `relatedEntities` | Search |
| `savedSearches` | Search |
| `workspaceViews` | Workspace |
| `widgetLayout` | Workspace |
| `userPreferences` | Workspace |
| `diagramLayout` | Diagrams |
| `diagramSearch` | Diagrams |
| `diagramExport` | Diagrams |
| `diagramPersistence` | Diagrams |
| `entityCatalog` | Data Model |
| `relationshipOntology` | Data Model |
| `schemaSearch` | Data Model |
| `decompositionModel` | Data Model |

## Route Build Readiness Checklist

Before a route is considered MVP-ready:

- Route contract section above is satisfied.
- Route uses compiled framework assets, not `src` imports.
- Route has adapter-backed success, loading, empty, error, and cancelled states.
- Route has keyboard and accessible fallback behavior for nontrivial interactive surfaces.
- Route has at least one trusted example or route fixture that demonstrates the contract.
- Route events are listed in `docs/event-catalog.md` or explicitly proposed for addition.
- Route data shapes are covered by `docs/data-schemas.md` or a documented application schema that serializes into framework contracts.
- Route passes build, framework validation, and downstream visual/a11y smoke checks.
