# Policy MVP Route Component Map

This map turns the MVP route contracts into implementation choices. Use it when building a route from framework primitives: it names the primary components, supporting components, required JavaScript behavior, expected events, and trusted examples.

Pair this with `docs/mvp-route-contracts.md` for acceptance criteria and `docs/component-manifest.json` for component-level APIs.

## MVP Planning Freeze Alignment

Status: frozen-for-v0.1-planning-handoff.

This map is the implementation-selection companion to `docs/mvp-route-contracts.md`. It is not production route code. Each MVP route row must include primary components, secondary components, required JavaScript behavior, expected events, and trusted example-page references so an agent can choose framework primitives without reverse-engineering the design showcase.

Freeze cross-check:

- Route rows must cover Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model.
- Required adapter names must match the route contracts and `docs/adapter-fixture-contracts.md`.
- Expected events must come from `docs/event-catalog.md` or be explicitly added there before use.
- Trusted examples are composition references only; they are not production data models.

## Route Map Matrix

| Route | Primary components | Secondary components | Required JavaScript behavior | Expected events | Example-page references |
| --- | --- | --- | --- | --- | --- |
| Overview | `shell-layout`, `topbar-utility-cluster`, `sidebar-navigation`, `kpi-metrics`, `data-table`, `metadata-panel` | `search-autocomplete`, `tabs`, `chips-badges`, `sparkline`, `form-validation`, `state-variants`, `buttons-actions` | Initialize shell/nav, hydrate KPI trends, register `overviewMetrics`, `policyRecordsTable`, `policyRecordDetail`, and `globalAutocomplete`, refresh table on filters, select row, update right detail panel, open drawers on narrow viewports. | `if:route-change`, `if:table-request`, `if:table-results`, `if:table-filter`, `if:table-select`, `if:autocomplete-request`, `if:autocomplete-results`, `if:autocomplete-select`, `if:tab-change`, `if:adapter-state` | `examples/index.html`, `examples/dashboard.html`, `examples/components.html#data` |
| Graph | `graph-explorer`, `metadata-panel`, `relationship-map`, `search-autocomplete` | `hierarchy-explorer`, `chips-badges`, `state-variants`, `buttons-actions`, `tooltip`, `collapsible-surface` | Register graph node types, register `policyGraphLayout`, wire traversal/search adapters, enable pan/zoom/drag, apply relationship filters, expand hidden children as normal nodes, update accessible fallback, reset focus on Escape/click-off. | `if:graph-node-select`, `if:graph-edge-select`, `if:graph-reset`, `if:graph-filter`, `if:graph-traverse`, `if:graph-layout-request`, `if:graph-layout-result`, `if:graph-layout-error`, `if:autocomplete-select`, `if:adapter-state` | `examples/graph-view.html`, `examples/components.html#graph`, `examples/policy-data-model.html` |
| Documents | `document-viewer`, `claim-tracking`, `metadata-panel`, `search-autocomplete`, `annotation-toolbar` | `relationship-map`, `tabs`, `policy-diff`, `chips-badges`, `state-variants`, `tooltip`, `buttons-actions` | Register `documentCorpus`, `artifactFetch`, `documentSearch`, and `annotationSchema`, switch artifact/text/parser modes, run full-text search, highlight CLM/REF/ORG/IMP/ENB annotations, scroll to selected line with context, open hover/click details. | `if:doc-mode-change`, `if:doc-search`, `if:doc-annotation-select`, `if:claim-select`, `if:history-select`, `if:tab-change`, `if:adapter-state` | `examples/document-viewer.html`, `examples/components.html#documents`, `examples/policy-data-model.html` |
| Review | `review-workflow`, `data-table`, `policy-diff`, `form-validation`, `metadata-panel` | `command-palette`, `buttons-actions`, `alerts`, `chips-badges`, `state-variants`, `date-calendar-picker`, `item-history` | Register `reviewQueue`, `reviewFindingDetail`, `reviewDecision`, and `assignmentLookup`, manage queue selection, validate reason fields, apply approve/reject/escalate/assign/snooze actions, update ledger/counts, preserve bulk-selection state. | `if:review-workflow-select`, `if:review-workflow-action`, `if:diff-decision`, `if:form-error-summary`, `if:table-select`, `if:table-results`, `if:adapter-state` | `examples/review.html`, `examples/dashboard.html`, `examples/components.html#workflow` |
| Sources | `data-table`, `governance-patterns`, `charts-analytics`, `metadata-panel`, `buttons-actions` | `search-autocomplete`, `form-validation`, `state-variants`, `sparkline`, `item-history`, `alerts`, `collapsible-surface` | Register `sourceRegistry`, `agentRuns`, `sourceHealth`, and `auditLog`, hydrate source table, animate run/progress states, refresh charts, run/pause/resume/reprocess source actions, export source table, show audit detail. | `if:table-request`, `if:table-results`, `if:table-action`, `if:chart-point-hover`, `if:surface-export-request`, `if:surface-export-result`, `if:adapter-state` | `examples/sources.html`, `examples/components.html#governance`, `examples/components.html#charts` |
| Search | `search-autocomplete`, `data-table`, `form-validation`, `chips-badges`, `metadata-panel` | `cards-panels`, `buttons-actions`, `state-variants`, `collapsible-surface`, `command-palette`, `tabs` | Register `searchSuggestions`, `searchResults`, `relatedEntities`, and `savedSearches`, debounce/cancel suggestions, validate query clauses, apply filters, hydrate result snippets, save/pin/export searches, update right-side refinements. | `if:autocomplete-request`, `if:autocomplete-results`, `if:autocomplete-cancel`, `if:autocomplete-error`, `if:autocomplete-select`, `if:table-request`, `if:table-results`, `if:table-filter`, `if:adapter-state` | `examples/search.html`, `examples/index.html`, `examples/components.html#inputs` |
| Workspace | `shell-layout`, `sidebar-navigation`, `cards-panels`, `theme-controls`, `form-validation` | `collapsible-surface`, `buttons-actions`, `wizard-stepper`, `state-variants`, `topbar-utility-cluster`, `chips-badges` | Register `workspaceViews`, `widgetLayout`, and `userPreferences`, sync route-aware nav, toggle/collapse setting sections, apply theme/density previews, track unsaved changes, save/discard/reset preferences. | `if:route-change`, `if:disclosure-toggle`, `if:theme-change`, `if:form-submit`, `if:form-error-summary`, `if:adapter-state` | `examples/dashboard.html`, `examples/components.html#configuration`, `examples/index.html` |
| Diagrams | `architecture-diagram`, `configuration-demo-controls`, `metadata-panel`, `search-autocomplete`, `buttons-actions` | `state-variants`, `charts-analytics`, `tooltip`, `collapsible-surface`, `form-validation`, `tabs` | Register `diagramLayout`, `diagramSearch`, `diagramExport`, and `diagramPersistence`, apply connector routing, search/highlight node text, select node/route details, export PNG/PDF, enable optional edit mode and session snapshot save/load/reset. | `if:diagram-node-select`, `if:diagram-route-select`, `if:diagram-search`, `if:diagram-layout-save`, `if:diagram-layout-load`, `if:surface-export-request`, `if:surface-export-result`, `if:surface-export-error`, `if:adapter-state` | `examples/diagrams.html`, `examples/diagrams2.html`, `examples/components.html#architecture-diagrams` |
| Data Model | `metadata-panel`, `data-table`, `relationship-map`, `hierarchy-explorer`, `architecture-diagram` | `document-viewer`, `chips-badges`, `state-variants`, `search-autocomplete`, `tabs`, `collapsible-surface` | Register `entityCatalog`, `relationshipOntology`, `schemaSearch`, and `decompositionModel`, hydrate entity/field tables, select entity detail, render relationship ontology, trace decomposition from source to graph/review/export records. | `if:table-select`, `if:table-results`, `if:hierarchy-select`, `if:diagram-node-select`, `if:connector-routes`, `if:autocomplete-select`, `if:adapter-state` | `examples/policy-data-model.html`, `examples/components.html#api-reference`, `examples/document-viewer.html` |

## Route Behavior Details

### Overview

- Required modules: `icons`, `navigation`, `autocomplete`, `tables`, `tabs`, `forms`, `charts`, `adapters`.
- Required controllers: selected policy detail panel, filter drawer, table, global search.
- Minimum adapters: `overviewMetrics`, `policyRecordsTable`, `policyRecordDetail`, `globalAutocomplete`.
- State panels: empty table, loading metrics, detail error, permission-denied detail, stale metric warning.

### Graph

- Required modules: `icons`, `graph`, `autocomplete`, `disclosure`, `tooltips`, `adapters`.
- Required controllers: graph root, selected node panel, relationship filters, graph search.
- Minimum adapters: `policyGraphLayout`, `graphTraversal`, `graphSearch`, `graphNodeDetail`.
- State panels: layout error, no visible nodes, filtered relationships empty, traversal denied, partial graph.

### Documents

- Required modules: `icons`, `documents`, `autocomplete`, `tabs`, `tooltips`, `adapters`.
- Required controllers: document workspace, artifact mode control, annotation filter group, document search.
- Minimum adapters: `documentCorpus`, `artifactFetch`, `documentSearch`, `annotationSchema`.
- State panels: artifact unavailable, text extraction empty, annotation schema error, search no matches.

### Review

- Required modules: `icons`, `tables`, `review`, `forms`, `diff`, `commandPalette`, `adapters`.
- Required controllers: review queue, action bar, decision form, diff panel, assignment autocomplete.
- Minimum adapters: `reviewQueue`, `reviewFindingDetail`, `reviewDecision`, `assignmentLookup`.
- State panels: no review items, blocked decision, validation error summary, bulk action partial failure.

### Sources

- Required modules: `icons`, `tables`, `charts`, `forms`, `disclosure`, `adapters`.
- Required controllers: source table, run controls, publication rules form, audit panel.
- Minimum adapters: `sourceRegistry`, `agentRuns`, `sourceHealth`, `auditLog`.
- State panels: source degraded, agent paused, run failed, parser warning, no audit events.

### Search

- Required modules: `icons`, `autocomplete`, `tables`, `forms`, `disclosure`, `adapters`.
- Required controllers: natural-language search, clause builder, filter rail, result table, saved search control.
- Minimum adapters: `searchSuggestions`, `searchResults`, `relatedEntities`, `savedSearches`.
- State panels: suggestion cancelled, invalid query, no results, saved-search conflict, related entities empty.

### Workspace

- Required modules: `icons`, `navigation`, `disclosure`, `forms`, `themes`, `adapters`.
- Required controllers: saved-view nav, settings panels, theme/profile dropdown, widget layout surface.
- Minimum adapters: `workspaceViews`, `widgetLayout`, `userPreferences`.
- State panels: unsaved changes, save error, preference validation, no saved views, reset confirmation.

### Diagrams

- Required modules: `icons`, `diagrams`, `connectors`, `autocomplete`, `exports`, `forms`, `adapters`.
- Required controllers: diagram surface, node detail panel, route detail panel, search input, export control, edit session panel.
- Minimum adapters: `diagramLayout`, `diagramSearch`, `diagramExport`, `diagramPersistence`.
- State panels: export pending/error/cancelled, no search matches, layout conflict, unsaved edit session, persistence conflict.

### Data Model

- Required modules: `icons`, `tables`, `hierarchy`, `diagrams`, `connectors`, `autocomplete`, `adapters`.
- Required controllers: entity catalog table, ontology map, selected entity detail, schema search.
- Minimum adapters: `entityCatalog`, `relationshipOntology`, `schemaSearch`, `decompositionModel`.
- State panels: unknown entity type, schema search empty, unsupported relationship, decomposition unavailable.

## Build Handoff Checklist

- Pick the route row from the matrix before opening example markup.
- Use the primary components as the route skeleton.
- Add secondary components only when the route job requires them.
- Register every minimum adapter with loading, success, empty, error, and cancelled states.
- Wire every expected event that crosses the route/application boundary.
- Use listed examples for composition, not as production data models.
- Record any new route behavior in `docs/event-catalog.md`, `docs/component-api.md`, and `docs/component-manifest.json` before using it in an app.
