# Event Catalog

The behavior layer emits `CustomEvent` objects from the component root or acted-on element. All framework events bubble unless explicitly noted. Use this catalog when integrating telemetry, persistence, server adapters, route state, reviewer audit logs, or agent-authored components.

Use `event.detail` as the integration contract. Do not parse visual text.

```js
document.addEventListener("if:table-results", (event) => {
  console.log(event.detail.result.total, event.detail.params);
});
```

## Event Naming Rules

- Lifecycle events start with `if:framework-*` or `if:behavior-*`.
- Component events start with `if:<component>-*`.
- Request/cancel/result/error events always include the request context and should be safe for telemetry.
- Selection events include the selected id or element where available.
- Validation and workflow events include the previous state when that matters for audit.

## Lifecycle Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:framework-init:before` | acted-on root | `{ root, modules, options }` | Prepare host state before hydration. |
| `if:framework-init` | acted-on root | `{ root, modules, options }` | Confirm hydration completed. |
| `if:framework-destroy:before` | acted-on root | `{ root, modules, options }` | Persist or detach host state before teardown. |
| `if:framework-destroy` | acted-on root | `{ root, modules, options }` | Confirm teardown completed. |
| `if:behavior-init:before` | acted-on root | `{ root, module, modules, options }` | Observe one module hydration. |
| `if:behavior-init` | acted-on root | `{ root, module, modules, options, result }` | Module hydrated successfully. |
| `if:behavior-init:error` | acted-on root | `{ root, module, modules, options, error }` | Record module hydration failure. |
| `if:behavior-destroy:before` | acted-on root | `{ root, module, modules, options }` | Observe module teardown. |
| `if:behavior-destroy` | acted-on root | `{ root, module, modules, options, result }` | Module destroyed successfully. |
| `if:behavior-destroy:error` | acted-on root | `{ root, module, modules, options, error }` | Record module teardown failure. |

Stable lifecycle example:

```js
const root = document.querySelector("#workspace");
root.addEventListener("if:framework-init", ({ detail }) => {
  console.debug("Hydrated modules", detail.modules);
});
InterfaceFramework.init(root, { modules: ["icons", "tables", "graph"] });
```

## Theme And Configuration Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:theme-change` | theme target | `{ theme, target }` | Persist profile theme, update account labels, or sync host shell. |
| `if:control-var` | configured target | `{ control, target, property, value, unit }` | Persist design-system sliders or live component customization. |
| `if:demo-state` | configured target | `{ control, target, state, prefix }` | Drive demo state, screenshots, or QA assertions. |
| `if:component-inventory-filter` | component inventory | `{ inventory, state }` | Track component/readiness search, category filters, status filters, and visible family counts. |
| `if:component-inventory-select` | component inventory | `{ inventory, card, component, state }` | Inspect a component family and synchronize detail panels or host-side selection state. |
| `if:component-inventory-manifest` | component inventory | `{ inventory, manifest, count }` | Confirm manifest metadata loaded and enriched the inventory detail surface. |
| `if:component-inventory-manifest-error` | component inventory | `{ inventory, error }` | Log missing or invalid manifest metadata while keeping card-only inventory behavior usable. |
| `if:component-inventory-deficiency` | component inventory | `{ inventory, assessment, totals, focus, topDeficiencies, weakCapabilities, backlog }` | Persist readiness telemetry, update release dashboards, or let an agent react to current deficiency state without scraping rendered assessment text. |
| `if:chart-dataset` | chart slot | `{ chart, data, label }` | Track dynamic chart changes. |
| `if:chart-point-select` | chart slot | `{ chart, point, type, chartLabel, index, label, value, rawValue, share, series, selected }` | Persist selected datum, route to filtered table rows, synchronize analytics detail panels, or audit user exploration. |
| `if:asset-load` | asset slot | `{ slot, img, src }` | Observe successful SVG/PNG/JPG/etc. asset hydration for diagrams, cards, or branded marks. |
| `if:asset-error` | asset slot | `{ slot, src }` | Swap host fallbacks, log missing marks, or alert that export will use the configured fallback icon. |

## Menu, Popover, Tooltip, And Focus Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:menu-select` | menu item | `{ value, icon }` | Update host state when a split-button option is selected. |
| `if:menu-action` | action button | `{ message }` | Log mock/demo command execution or bridge to host action dispatcher. |
| `if:tooltip-show` | tooltip trigger | `{ text, placement, collision }` | Telemetry for guidance and help surfaces. |
| `if:tooltip-hide` | tooltip trigger | `{}` | Clear help state. |
| `if:focus-select` | focus surface | `{ item, surface }` | Sync inspector detail with selected graph/diagram item. |
| `if:focus-clear` | focus surface | `{ item, surface }` | Clear selected detail on click-off or Escape. |
| `if:route-change` | route nav | `{ route, current, link }` | Sync host route state, active labels, or analytics. |
| `if:tab-change` | tabs root | `{ tab, target, state }` | Persist selected tab or sync URL fragments. |
| `if:disclosure-toggle` | disclosure trigger | `{ expanded, trigger, target, state }` | Persist accordion/collapsible section state. |
| `if:adapter-state` | adapter target | `{ state, channel, message, requestId, target }` | Observe loading, success, empty, error, cancelled, and retry flows across production adapters. |
| `if:adapter-request` | adapter target | `{ channel, requestId, signal, target, ...context }` | Observe a reusable adapter task starting. |
| `if:adapter-result` | adapter target | `{ channel, requestId, state, result, elapsedMs, target, ...context }` | Observe a reusable adapter task completing as success or empty. |
| `if:adapter-cancel` | adapter target | `{ channel, requestId, state, reason, elapsedMs, target, ...context }` | Observe superseded, user-cancelled, or teardown-cancelled adapter tasks. |
| `if:adapter-error` | adapter target | `{ channel, requestId, state, error, elapsedMs, target, ...context }` | Observe reusable adapter task failures. |
| `if:{channel}-request/result/cancel/error` | adapter target | Same as the matching generic adapter task payload. | Listen to one production channel such as `if:source-registry-result` or `if:document-annotation-error`. |
| `if:adapter-retry` | retry control | `{ target, kind }` | Track generic retry commands before the framework re-runs the matching adapter. |

State consistency rule: openable controls should expose `aria-expanded`, toggle controls should expose `aria-pressed`, selectable controls should expose `aria-selected`, and focusable composite controls should support Escape/click-off clearing. Component-specific events can add detail, but should not replace these shared DOM contracts.

Programmatic behavior rule: host apps should prefer `InterfaceFramework.getComponentController(target)` for cross-component `open`, `close`, `toggle`, `select`, `reset`, `refresh`, and `destroy` actions. The controller delegates to the same behavior paths as pointer and keyboard interaction, so events and ARIA state stay consistent.

## Form And Validation Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:field-state` | field/control | `{ field, state, message }` | Sync validation state with host form model. |
| `if:field-validate` | field/control | `{ rule, state, valid, value }` | Audit validation result. |
| `if:form-validate` | form | `{ valid, results }` | Block submit, store validation summary, or trigger review workflow. |

Example:

```js
form.addEventListener("if:form-validate", ({ detail }) => {
  if (detail.valid) submitDecision();
});
```

## Autocomplete Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:autocomplete-state` | input | `{ state, adapterState, query, provider, items, autocomplete }` | Render external loading/empty/error indicators. |
| `if:autocomplete-request` | input | `{ query, limit, provider, requestId, signal, autocomplete }` | Track remote suggestion request. |
| `if:autocomplete-results` | input | `{ query, provider, items, state, meta, requestId, autocomplete }` | Inspect returned suggestions. |
| `if:autocomplete-cancel` | input | `{ query, provider, requestId, reason, autocomplete }` | Confirm async cancellation. |
| `if:autocomplete-error` | input | `{ query, provider, requestId, error, autocomplete }` | Show or log suggestion service failure. |
| `if:autocomplete-select` | input | `{ value, label, meta, type, id, autocomplete }` | Apply selected suggestion to route, filter, or detail panel. |

Production adapter rule:

- Always use `signal` inside your fetch.
- Return `{ state: "empty", items: [] }` instead of throwing for a valid no-result response.
- Throw only for actual service or parsing failures.

## Data Table Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:table-sort` | table shell | `{ field, direction, table }` | Persist sort preference. |
| `if:table-filter` | table shell | `{ query, visible, total }` | Track local filtering and empty states. |
| `if:table-select` | table shell | `{ selected, total, row, checked }` | Update bulk-action state. |
| `if:table-density` | table shell | `{ density }` | Persist density preference. |
| `if:table-column-resize` | table shell | `{ field, width, column }` | Live resize telemetry. |
| `if:table-column-resize-end` | table shell | `{ field, width, column }` | Persist column width. |
| `if:table-column-pin` | table shell | `{ field, side, pinned }` | Persist sticky column configuration. |
| `if:table-request` | table shell | adapter params | Start loading indicator or telemetry. |
| `if:table-results` | table shell | `{ ...params, result }` | Render external stats or persist result metadata. |
| `if:table-cancel` | table shell | adapter params | Confirm cancellation on fast filter/sort changes. |
| `if:table-error` | table shell | `{ ...params, error }` | Show service failure state. |

Adapter detail includes `signal`, `page`, `pageSize`, `sort`, `filters`, `query`, `requestId`, and table metadata where available.

## Metric Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:kpi-metric-update` | `.if-metric` card | `{ metric, sparkline, label, value, change, trend, values, first, last, delta, deltaText, metadata, state }` | Persist live KPI changes, synchronize dashboard summaries, or audit streaming metric updates. |

KPI metric updates fire when a metric sparkline renders, steps, resets, or streams. Hosts should listen on a containing dashboard region and use `detail.label`, `detail.value`, `detail.deltaText`, and `detail.metadata` for telemetry or external summaries.

## Performance Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:performance-run` | performance lab root | `{ profile, profileKey, sections, overflow, totalMs, budget, state }` | Collect performance smoke metrics, fail release checks, or record desktop/mobile overflow status. |

Performance detail includes section timings for `table`, `graph`, `diagram`, `document`, and `charts`. The `overflow` payload comes from `measureOverflow(root)` and separates uncontained failures from allowed internal scroll regions. The `budget` payload is produced by `evaluatePerformanceBudgets()` and includes per-section limits, total render limits, overflow limits, and a `passed` boolean aligned to `docs/performance-budgets.md`.

## Graph Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:graph-node-select` | graph root | `{ node, nodeId, panel }` | Sync details, route, or breadcrumbs. |
| `if:graph-edge-select` | graph root | `{ edge, from, to, type }` | Show relationship detail. |
| `if:graph-focus-reset` | graph root | `{ graph }` | Reset side panel to seed context. |
| `if:graph-mode` | graph root | `{ mode }` | Persist explore, pan, or arrange mode. |
| `if:graph-viewport` | graph canvas | `{ scale, x, y, action }` | Persist zoom/pan or update minimap. |
| `if:graph-organization` | graph root | `{ option, value, options }` | Persist orientation, spacing, labels, density, edge style, or direction. |
| `if:graph-cluster` | graph root | `{ cluster, expanded, parent, type, count }` | Expand/collapse related links and sync detail panel. |
| `if:graph-cluster-layout` | graph root | `{ cluster, control, members }` | Persist expanded branch coordinates or run a host layout adapter. |
| `if:graph-cluster-move` | graph root | `{ id, node, position }` | Persist arranged relationship-bundle callout coordinates. |
| `if:graph-trace` | graph root | `{ from, relationships }` | Start traversal or trace path UI. |
| `if:graph-node-types` | graph root | `{ graph, applied }` | Audit or persist framework-applied node type config, including registered production types. |
| `if:graph-node-move` | graph root | `{ node, nodeId, x, y }` | Persist arranged node coordinates. |
| `if:graph-deconflict` | graph root | `{ moved, iterations }` | Audit overlap-relaxation pass. |

## Graph Layout Engine Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:graph-layout-request` | graph root | `{ engine, requestId, input }` | Start external layout work. |
| `if:graph-layout-cancel` | graph root | `{ engine, requestId, reason }` | Abort obsolete requests. |
| `if:graph-layout-apply` | graph root | `{ engine, result }` | Persist applied layout output. |
| `if:graph-layout-result` | graph root | `{ engine, requestId, result }` | Telemetry or cache successful layout. |
| `if:graph-layout-error` | graph root | `{ engine, requestId, error }` | Report layout failure and use fallback. |

## Diagram And Connector Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:diagram-select` | diagram root | `{ diagram, item, summary }` | Sync external inspectors, breadcrumbs, telemetry, or editing panels when a node is selected. |
| `if:diagram-clear` | diagram root | `{ diagram }` | Clear details on click-off or close. |
| `if:diagram-search` | diagram root | `{ diagram, input, query, matches }` | Persist diagram search query, sync result count, or drive external inspectors. |
| `if:diagram-layer` | diagram root | `{ layer, active }` | Persist layer toggles. |
| `if:diagram-var` | diagram root or target | `{ property, value, unit, target }` | Persist diagram spacing/sizing sliders. |
| `if:diagram-edit-mode` | diagram root | `{ active, diagram, tool }` | Persist or audit diagram edit mode. |
| `if:diagram-edit-tool` | diagram root | `{ active, diagram, tool }` | Persist selected edit intent: inspect, text, move, connect, style, add, or delete. |
| `if:diagram-node-types` | diagram root | `{ diagram, items }` | Observe registry application for typed diagram nodes after initialization or manual rehydration. |
| `if:diagram-node-create` | diagram root | `{ diagram, item }` | Persist or audit a dynamically added diagram node. |
| `if:diagram-source-node-create` | diagram root | `{ diagram, item, node }` | Persist or audit a dynamically added node created from source JSON. |
| `if:diagram-node-duplicate` | diagram root | `{ diagram, item, source }` | Persist or audit a selected node copied into its parent container. |
| `if:diagram-node-reorder` | diagram root | `{ diagram, item, container, direction }` | Persist a selected node moved earlier or later inside its parent container. |
| `if:diagram-selected-copy` | diagram root | `{ diagram, kind, data, text }` | Observe selected node or connector JSON copied from the editor. |
| `if:diagram-selected-apply` | diagram root | `{ diagram, kind, data }` | Persist or audit selected node or connector JSON applied from the source editor. |
| `if:diagram-selected-reset` | diagram root | `{ diagram, kind, item, route, removed }` | Observe a selected baseline node or route reset, or a session-only item removed. |
| `if:diagram-node-delete` | diagram root | `{ diagram, item }` | Persist a node hidden from the current layout. |
| `if:diagram-node-style` | diagram root | `{ diagram, item, tone, nodeType, layout, background, icon }` | Persist semantic tone, type, layout, background, or icon changes for a selected node. |
| `if:diagram-inline-edit` | diagram root | `{ diagram, item, field, value }` | Persist direct inline edits made to a selected node title or description in text mode. |
| `if:diagram-route-create` | diagram root | `{ connector, diagram, from, to }` | Persist a session-created routed connector between two nodes. |
| `if:diagram-route-select` | diagram root | `{ connector, diagram, routeId, surface }` | Sync external inspectors or route-edit panels when a connector label is selected. |
| `if:diagram-route-edit` | diagram root | `{ connector, diagram, surface }` | Persist connector label, style, tone, anchor, avoidance, or waypoint changes. |
| `if:diagram-route-delete` | diagram root | `{ diagram, route, routeId, surface }` | Persist a connector removed from the current session layout. |
| `if:diagram-delete-undo` | diagram root | `{ diagram, entry, item, route }` | Persist a session restore after a node or connector deletion is undone. |
| `if:diagram-node-move` | diagram root | `{ diagram, item, offset }` | Persist dragged node offsets or trigger connector refresh. |
| `if:diagram-item-edit` | diagram root | `{ diagram, item, field, value }` | Persist selected-node text/metadata edits. |
| `if:diagram-layout-apply` | diagram root | `{ diagram, snapshot }` | Observe loaded, reset, or externally-applied layout snapshots. |
| `if:diagram-layout-save` | diagram root | `{ diagram, snapshot }` | Persist successful session or adapter-backed layout saves. |
| `if:diagram-layout-reset` | diagram root | `{ diagram }` | Clear session layout and restore the baseline layout. |
| `if:connector-routes` | connector surface | `{ routes, surface }` | Inspect computed SVG connector routes. |
| `if:collapsible-toggle` | collapsible surface | `{ expanded, region, surface, control }` | Persist inline card/panel collapse state or synchronize companion controls. |
| `if:surface-expand` | target surface | `{ expanded, target, mode }` | Sync expand/collapse state. `mode` is `fullscreen` for work surfaces that lock background scroll and `inline` for lightweight target reveal. |
| `if:public-search` | `.if-public-search` / `[data-if-public-search]` | `{ query, filter, visible, total }` | Public website search query or category filter changed. |
| `if:surface-export-request` | target surface | `{ adapter, format, filename, requestId, signal, target }` | Start local export, server export, or telemetry. |
| `if:surface-export-result` | target surface | `{ adapter, format, filename, requestId, result, target }` | Persist successful PNG/PDF or service export metadata. |
| `if:surface-export-cancel` | target surface | `{ adapter, format, filename, requestId, reason, target }` | Confirm export cancellation. |
| `if:surface-export-error` | target surface | `{ adapter, format, filename, requestId, error, target }` | Recover from failed export services. |
| `if:surface-export` | target surface | `{ adapter, format, filename, result, target }` | Legacy success event after export completes. |

## Coverage Closure Component Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:dropzone-change` | dropzone root | `{ files, zone }` | Start upload, parse staging, or validate file list. |
| `if:command-palette-open` | command palette | `{ palette, trigger, state }` | Track palette usage or seed server commands. |
| `if:command-palette-filter` | command palette | `{ palette, query, state }` | Mirror filtered count, active command, or remote command search state. |
| `if:command-palette-action` | command palette | `{ command, id, item, route, state }` | Execute host route, export, task, or workflow command. |
| `if:editable-grid-change` | editable grid | `{ grid, rows, averageConfidence }` | Persist dirty cells or recompute extracted item summaries. |
| `if:date-picker-change` | date picker | `{ picker, value, label }` | Persist selected due date or source window. |
| `if:date-picker-month` | date picker | `{ picker, month }` | Track visible month navigation without requiring a selected date change. |
| `if:wizard-step` | wizard root | `{ wizard, step, total, state }` | Save step progress or validate step transitions. |
| `if:annotation-tool-change` | annotation toolbar | `{ toolbar, control, tool, label, state }` | Switch parser/reviewer annotation mode and persist the normalized toolbar state. |
| `if:state-variant-change` | state preview | `{ target, variant }` | Coordinate empty, loading, error, or success states across demos. |

## Hierarchy, Traversal, Claims, And History Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:hierarchy-select` | hierarchy root | `{ node, nodeId, panel }` | Sync detail panel or route. |
| `if:hierarchy-toggle` | hierarchy root | `{ id, row, expanded, childCount }` | Persist branch expansion. |
| `if:hierarchy-structure` | hierarchy root | `{ hierarchy, rows }` | Audit inferred branch/leaf/dead-end state after hydration or DOM updates. |
| `if:hierarchy-node-types` | hierarchy root | `{ hierarchy, applied }` | Audit type registry application for production-owned hierarchy semantics. |
| `if:hierarchy-load` | hierarchy root | `{ id, row }` | Fetch lazy children for a branch with declared but unloaded descendants. |
| `if:hierarchy-dead-end` | hierarchy root | `{ id, row }` | Track attempted expansion of an explicit terminal node. |
| `if:traversal-select` | traversal root | `{ item, target }` | Move into/out of a node or branch. |
| `if:claim-select` | claim tracker | `{ claim, claimId, id, panel, state }` | Show claim detail and source line. |
| `if:history-select` | history viewer | `{ event, eventId, panel }` | Show selected historical event. |

## Document, Annotation, Diff, And Review Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:doc-artifact-select` | workspace/artifact | `{ artifact, artifactId, source, state }` | Persist active artifact and synchronize source cards. |
| `if:doc-search` | viewer | `{ query, filter, state, viewer }` | Persist text search, counts, and active filter state. |
| `if:doc-filter-change` | viewer | `{ filter, control, state }` | Persist category filtering such as claims, organizations, references, or query hits. |
| `if:doc-highlight-change` | viewer | `{ highlight, checked, control, state }` | Persist semantic highlight visibility. |
| `if:doc-search-clear` | viewer/artifact | `{ artifact, control, state }` | Track search reset actions. |
| `if:doc-jump` | viewer | `{ control, line, query, state }` | Track source-line navigation from authority, parser, claim, or match controls. |
| `if:doc-annotation-select` | artifact/viewer | `{ type, value, annotation, annotations, target, matches, state }` | Route from highlighted org/claim/ref to extracted list. |
| `if:doc-annotation-panel` | annotation panel | `{ type, value, expansion, annotation, annotations, target, matches, state }` | Populate external inspector. |
| `if:doc-mode-change` | artifact/viewer | `{ mode, artifact, control, state }` | Persist embedded, reconstituted, split, or metadata mode. |
| `if:diff-select` | diff root | `{ change, index, item, state }` | Sync the selected line-change row. |
| `if:diff-decision` | diff root | `{ change, decision, item, state }` | Record line-change decision. |
| `if:review-workflow-select` | workflow root | `{ id, item, state }` | Sync selected finding. |
| `if:review-workflow-action` | workflow root | `{ action, id, item, previousStatus, reason, state, status }` | Audit reviewer transition. |

## ERD And Data Model Events

| Event | Target | Detail | Use |
| --- | --- | --- | --- |
| `if:erd-mode` | ERD root | `{ mode }` | Persist select/pan/arrange mode. |
| `if:erd-viewport` | ERD canvas | `{ scale, x, y, action }` | Persist zoom/pan. |
| `if:erd-zone` | ERD canvas | `{ zone }` | Track active model zone. |
| `if:erd-density` | ERD root | `{ density }` | Persist model density. |
| `if:erd-deconflict` | ERD root | `{ moved, iterations }` | Audit node relaxation. |
| `if:erd-layout-reset` | ERD root | `{}` | Reset stored layout. |
| `if:erd-edge-filter` | ERD root | `{ type, visible }` | Persist relationship filter. |
| `if:erd-pan` | ERD canvas | `{ x, y }` | Track manual panning. |
| `if:erd-node-move` | ERD root | `{ node, x, y }` | Persist node placement. |

## Event Listener Patterns

### Host Telemetry

```js
const telemetryEvents = [
  "if:table-results",
  "if:graph-layout-result",
  "if:review-workflow-action",
  "if:surface-export"
];

telemetryEvents.forEach((name) => {
  document.addEventListener(name, (event) => {
    sendTelemetry(name, event.detail);
  });
});
```

### Route Or State Persistence

```js
workspace.addEventListener("if:graph-node-select", ({ detail }) => {
  history.replaceState(null, "", `?node=${encodeURIComponent(detail.nodeId)}`);
});

workspace.addEventListener("if:table-column-resize-end", ({ detail }) => {
  localStorage.setItem(`column:${detail.field}`, detail.width);
});
```

### Error And Empty States

```js
table.addEventListener("if:table-error", ({ detail }) => {
  renderExternalBanner(`Unable to load table: ${detail.error.message || detail.error}`);
});

input.addEventListener("if:autocomplete-results", ({ detail }) => {
  if (detail.state === "empty") renderEmptySearchHint();
});
```
