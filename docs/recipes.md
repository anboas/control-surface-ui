# Recipe Index

This index turns the component inventory into implementation playbooks. Use it with [`component-manifest.json`](./component-manifest.json), [`event-catalog.md`](./event-catalog.md), and [`component-api.md`](./component-api.md).

## How To Use A Recipe

1. Pick the user intent from the table below.
2. Read the recipe's "Choose this when" and "Do not choose when" sections.
3. Copy the listed component ids into the implementation notes.
4. Add the required classes and `data-if-*` attributes.
5. Hydrate with `init(root)` after injection and `destroy(root)` before removal.
6. Listen to the listed events only when the host app needs telemetry, persistence, or server synchronization.

## Quick Selection Table

| User intent | Choose this recipe | Primary components |
| --- | --- | --- |
| Full enterprise product page | [Application Shell](#application-shell) | `shell-layout`, `topbar-utility-cluster`, `sidebar-navigation` |
| Desktop tri-pane record review | [Tri-Pane Workspace](#tri-pane-workspace) | `shell-layout`, `metadata-panel`, `data-table` |
| Search with highlighted suggestions | [Search Autosuggest](#search-autosuggest) | `search-autocomplete` |
| Sort/filter/page records | [Enterprise Data Table](#enterprise-data-table) | `data-table`, `search-autocomplete` |
| Show source registry and agent runs | [Sources Registry](#sources-registry) | `data-table`, `governance-patterns`, `charts-analytics` |
| Show KPI cards and charts | [Analytics Dashboard](#analytics-dashboard) | `kpi-metrics`, `charts-analytics` |
| Traverse relationships and clusters | [Graph Explorer](#graph-explorer) | `graph-explorer`, `metadata-panel` |
| Use production graph layout engine | [Graph Layout Adapter](#graph-layout-adapter) | `graph-explorer` |
| Show law-to-implementation depth | [Authority Hierarchy](#authority-hierarchy) | `hierarchy-explorer`, `relationship-map` |
| Show full landscape map | [Landscape Hierarchy](#landscape-hierarchy) | `hierarchy-explorer`, `claim-tracking` |
| Review claims and completion | [Claim Tracking Workbench](#claim-tracking-workbench) | `claim-tracking`, `document-viewer` |
| Show historical detail of an item | [Item History Viewer](#item-history-viewer) | `item-history`, `policy-diff` |
| View PDFs, parsed text, orgs, refs | [Document Intelligence Viewer](#document-intelligence-viewer) | `document-viewer`, `claim-tracking` |
| Compare policy line changes | [Policy Diff Review](#policy-diff-review) | `policy-diff`, `review-workflow` |
| Build architecture diagrams | [Architecture Diagram](#architecture-diagram) | `architecture-diagram`, `configuration-demo-controls` |
| Export diagram or graph surfaces | [Diagram Export](#diagram-export) | `architecture-diagram`, `graph-explorer` |
| Show agent health/runs | [Agent Runtime](#agent-runtime) | `governance-patterns`, `charts-analytics` |
| Add reviewer commands and ledger | [Review Action Bar](#review-action-bar) | `review-workflow`, `buttons-actions`, `form-validation` |
| Build Adam Boas Consulting pages | [Public Consulting Page](#public-consulting-page) | `public-site-patterns` |
| Build configurable design demos | [Configurable Showcase](#configurable-showcase) | `configuration-demo-controls` |
| Hide optional card/panel details inline | [Collapsible Surfaces](#collapsible-surfaces) | `collapsible-surface`, `metadata-panel` |

## Stable Init And Destroy

### Vite Or ESM

```js
import "control-surface-ui/css";
import { init, destroy, setTheme } from "control-surface-ui";

const root = document.querySelector("#policy-workspace");
init(root, { modules: ["themes", "icons", "navigation", "tables", "graph"] });
setTheme("light");

// Before a route swap or before removing a fragment:
destroy(root, { modules: ["graph", "tables", "overlays"] });
```

### Plain HTML

```html
<link rel="stylesheet" href="./node_modules/control-surface-ui/dist/interface-framework.css">
<script src="./node_modules/control-surface-ui/dist/interface-framework.js"></script>
<script>
  const root = document.querySelector("#policy-workspace");
  window.InterfaceFramework.init(root);
  window.addEventListener("beforeunload", () => window.InterfaceFramework.destroy(root));
</script>
```

### Injected Fragment

```js
async function mountReviewPanel(container, html) {
  container.innerHTML = html;
  InterfaceFramework.init(container, { modules: ["icons", "forms", "review-workflows"] });
}

function unmountReviewPanel(container) {
  InterfaceFramework.destroy(container, { modules: ["review-workflows", "forms", "overlays"] });
  container.replaceChildren();
}
```

## Application Shell

Choose this when:

- You need a product page with a topbar, primary navigation, utility cluster, sidebar, and main content.
- The page should look like the policy intelligence wireframes.

Do not choose this when:

- You are building a public marketing page. Use [Public Consulting Page](#public-consulting-page).

Use components:

- `shell-layout`
- `topbar-utility-cluster`
- `sidebar-navigation`
- `overlays`
- `theme-controls`

Required wiring:

- Add `.if-shell`, `.if-topbar`, `.if-main`, `.if-sidebar`, and `.if-content`.
- Use `.if-topbar__nav` with active `.if-nav-link.is-active`.
- Add `.if-utility-cluster` for search, notifications, and account.
- Run `init(document)` or `init(shell)`.

Listen when needed:

- `if:route-change`
- `if:theme-change`
- `if:autocomplete-select`

Primary docs:

- [`component-api.md#shell-and-layout`](./component-api.md#shell-and-layout)
- [`component-api.md#topbar-and-utility-cluster`](./component-api.md#topbar-and-utility-cluster)

## Tri-Pane Workspace

Choose this when:

- You need a left filter/navigation rail, central table or graph, and right contextual detail panel.
- A selected row or node should drive the detail panel.

Do not choose this when:

- The page is mostly content reading and does not need a persistent side detail.

Use components:

- `shell-layout`
- `data-table` or `graph-explorer`
- `metadata-panel`
- `overlays`

Required wiring:

- Use `.if-main.if-main--tri-pane`.
- Put primary work inside `.if-content`.
- Put contextual details inside `.if-detail-region`.
- Add `data-if-focus-surface` when selection can be cleared by clicking empty space.

Listen when needed:

- `if:focus-select`
- `if:focus-clear`
- `if:table-select`
- `if:graph-node-select`

## Search Autosuggest

Choose this when:

- A search box should show highlighted local or server-backed suggestions as the user types.
- You need empty, loading, cancelled, and error states.

Do not choose this when:

- Suggestions could leak sensitive data before explicit search submission.

Use components:

- `search-autocomplete`
- optional `data-table`

Required wiring:

```html
<label class="if-search if-autocomplete">
  <span class="if-search__icon if-icon-slot" data-if-icon="search" aria-hidden="true"></span>
  <input class="if-input"
    id="search-input"
    type="search"
    data-if-autocomplete-remote="policy-api"
    data-if-autocomplete-delay="180"
    data-if-autocomplete-limit="8"
    data-if-autocomplete-output="#search-summary"
    placeholder="Search policies, sources, organizations...">
</label>
<p class="if-autocomplete-summary" id="search-summary" data-if-adapter-status></p>
<button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-autocomplete-cancel="#search-input">Cancel</button>
```

Production adapter:

```js
InterfaceFramework.registerAutocompleteAdapter("policy-api", async ({ query, limit, signal }) => {
  const response = await fetch("/api/suggest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, limit }),
    signal
  });
  if (!response.ok) throw new Error("Suggestion service unavailable.");
  const { items } = await response.json();
  return items.length ? items : { state: "empty", items: [], title: "No suggestions" };
});
```

Listen when needed:

- `if:autocomplete-request`
- `if:autocomplete-results`
- `if:autocomplete-cancel`
- `if:autocomplete-error`
- `if:autocomplete-state`
- `if:autocomplete-select`
- `if:adapter-state`

Public APIs: `hydrateAutocompleteInputs(root)`, `getAutocompleteState(input)`, `registerAutocompleteAdapter(name, adapter)`, `unregisterAutocompleteAdapter(name)`, `renderAutocomplete(input)`, and `cancelAutocomplete(input)`.

## Enterprise Data Table

Choose this when:

- Records need sorting, filtering, pagination, selected counts, expansion, resizing, pinning, virtualization, or server-backed loading.

Do not choose this when:

- A two-column key/value panel communicates the data better.

Use components:

- `data-table`
- `search-autocomplete`
- `buttons-actions`
- `form-validation` for filter forms when needed

Required wiring:

- Wrap the table in `[data-if-data-table]`.
- Add `data-if-table-sort` on header buttons.
- Add `data-if-table-filter="#table-id"` on filter input.
- Add `data-if-table-page`, `data-if-table-prev`, `data-if-table-next`, and `data-if-table-page-size` for pagination.

Server adapter:

```js
InterfaceFramework.registerDataTableAdapter("policy-records", async (params) => {
  const response = await fetch("/api/policies/table", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
    signal: params.signal
  });
  if (!response.ok) throw new Error("Table service unavailable.");
  return response.json();
});

InterfaceFramework.refreshDataTable(document.querySelector("[data-if-data-table]"));
```

Listen when needed:

- `if:table-request`
- `if:table-results`
- `if:table-cancel`
- `if:table-error`
- `if:table-sort`
- `if:table-filter`
- `if:table-select`

## Sources Registry

Choose this when:

- You need a source table, agent roster, source health metrics, run controls, publication rules, and audit log.

Use components:

- `data-table`
- `governance-patterns`
- `charts-analytics`
- `kpi-metrics`

Required wiring:

- Use a table for sources and a separate pattern grid for agents/rules/audit.
- Use badges for source health and parser state.
- Use sparklines for change rates.

Listen when needed:

- `if:table-select`
- `if:chart-dataset`
- `if:chart-point-select`
- `if:demo-state`

## Analytics Dashboard

Choose this when:

- You need KPI cards, trendline sparklines, and analytical charts.

Use components:

- `kpi-metrics`
- `charts-analytics`
- `configuration-demo-controls`

Required wiring:

- Use `.if-metric` for scan cards.
- Add `data-if-sparkline` for compact trendlines.
- Add `data-if-chart` and `data-if-chart-data` for larger analytics.

Listen when needed:

- `if:kpi-metric-update`
- `if:chart-dataset`
- `if:chart-point-select`
- `if:control-var`

Use `if:kpi-metric-update` when dashboard summaries, telemetry, or saved workspace views need to react to metric value, delta, metadata, or sparkline changes without reading DOM text manually.

Use `if:chart-point-select` when larger analytics should drive a detail panel, synchronized table filter, route state, or persisted user exploration state from the selected datum.

## Operations Workspace

Choose this when:

- A page needs selectable signal cards, a table or record set, contextual detail, provenance, and action queues to behave like one coherent control surface.
- A downstream app needs a generic operations/inventory/review workspace without product-specific component primitives.

Do not choose this when:

- The page is only a static dashboard. Use [Analytics Dashboard](#analytics-dashboard).
- The primary interaction is graph traversal. Use [Graph Explorer](#graph-explorer).

Use components:

- `operations-workspace`
- `kpi-metrics`
- `data-table`
- `metadata-panel`
- `governance-patterns`
- `search-autocomplete`
- `buttons-actions`

Required wiring:

- Add `[data-if-operations-workspace]` around the synchronized region.
- Add `[data-if-operations-signal]` to each selectable signal card.
- Add matching `[data-if-operations-panel]` values for drilldown panels.
- Add `[data-if-operations-current-label]` where the active signal label should render.
- Add `[data-if-operations-reset]` where the user can clear the selected signal.
- Use `.if-table-command-band` for dense table filters, saved views, export, and column controls.
- Use `.if-record-detail` and `.if-provenance-grid` for selected record context.

Listen when needed:

- `if:operations-signal-change`
- `if:operations-signal-reset`
- `if:table-filter`
- `if:table-select`
- `if:adapter-state`
- `if:kpi-metric-update`

Public APIs:

- `hydrateOperationsWorkspaces(root)`
- `setOperationsSignal(target, value, options)`
- `resetOperationsSignal(target, options)`
- `getOperationsWorkspaceState(workspace)`
- `getComponentController(target)`

Example:

- `examples/operations-workspace.html`
- `examples/components.html#operations-workspace`

## Graph Explorer

Choose this when:

- Users need to traverse related, implements, derived from, references, guides, obligations, opportunities, evidence, and gaps.
- Users need panning, zooming, drag-to-arrange, clusters, edge filters, and node detail panels.

Do not choose this when:

- You need a strict tree. Use [Authority Hierarchy](#authority-hierarchy).

Use components:

- `graph-explorer`
- `metadata-panel`
- `relationship-map`
- `hierarchy-explorer`

Required wiring:

- Graph root uses `data-if-graph`.
- Generated graphs can use `data-if-graph-source="#graph-json"` or `data-if-graph-json` with `{ nodes, edges, selected, mode, layout }`.
- Nodes use `.if-graph-node[data-node-id]`.
- Node kinds use `data-node-type` and may be registered with `InterfaceFramework.registerGraphNodeType("implementation-package", { className, icon, color, label })`.
- Edge labels use `data-if-graph-edge`, `data-edge-label-from`, and `data-edge-label-to`.
- Hidden child groups use `data-if-graph-cluster` on the existing owner node and `data-cluster-member` on hidden child nodes or edges.
- Add `data-if-graph-a11y` fallback for keyboard-readable graph state.
- Use `renderGraph`, `hydrateGraph`, and `getGraphState` when the host app owns graph data and wants predictable component markup.

Listen when needed:

- `if:graph-node-select`
- `if:graph-edge-select`
- `if:graph-cluster`
- `if:graph-viewport`
- `if:graph-organization`
- `if:graph-node-types`
- `if:graph-layout-result`

## Graph Layout Adapter

Choose this when:

- Static layout presets are not enough and the production app will use a graph layout engine.

Use components:

- `graph-explorer`

Required wiring:

```js
InterfaceFramework.registerGraphLayoutEngine("policy-force", async ({ nodes, edges, options, signal }) => {
  const response = await fetch("/api/graph/layout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nodes, edges, options }),
    signal
  });
  if (!response.ok) throw new Error("Layout engine unavailable.");
  return response.json();
});

InterfaceFramework.runGraphLayoutEngine(
  document.querySelector("[data-if-graph]"),
  "policy-force"
);
```

For production-owned node semantics:

```js
InterfaceFramework.registerGraphNodeType("implementation-package", {
  className: "component",
  icon: "implementation",
  color: "#0f766e",
  label: "Implementation Package",
  data: { graphLane: "implementation" }
});

InterfaceFramework.applyGraphNodeTypes(document.querySelector("[data-if-graph]"));
```

Listen when needed:

- `if:graph-layout-request`
- `if:graph-layout-cancel`
- `if:graph-layout-apply`
- `if:graph-layout-result`
- `if:graph-layout-error`

## Authority Hierarchy

Choose this when:

- You need a law, executive direction, DoD policy, service policy, command document, implementation artifact, and evidence drilldown.

Use components:

- `hierarchy-explorer`
- `relationship-map`
- `metadata-panel`

Required wiring:

- Use `[data-if-hierarchy]`.
- Rows use `data-hierarchy-node`.
- Children use `data-hierarchy-parent`.
- Node kinds use `data-hierarchy-type` and may be registered with `InterfaceFramework.registerHierarchyNodeType("stig", { className, icon, color, label })`.
- Branches are inferred from rendered child rows. Use `data-hierarchy-state="branch"` plus `data-hierarchy-child-count` and `data-hierarchy-load="lazy"` for unloaded descendants.
- Leaves and terminal records use `.if-hierarchy-row__spacer`; explicit terminal records can set `data-hierarchy-state="dead-end"`.
- Detail panels use `data-hierarchy-panel`.
- Branch toggles use `data-if-hierarchy-toggle`.

Listen when needed:

- `if:hierarchy-select`
- `if:hierarchy-toggle`
- `if:hierarchy-structure`
- `if:hierarchy-node-types`
- `if:hierarchy-load`
- `if:hierarchy-dead-end`

For production-owned hierarchy semantics:

```js
InterfaceFramework.registerHierarchyNodeType("stig", {
  className: "baseline",
  icon: "checklist",
  color: "#b45309",
  label: "STIG / Technical Baseline"
});

InterfaceFramework.applyHierarchyStructure(document.querySelector("[data-if-hierarchy]"));
InterfaceFramework.applyHierarchyNodeTypes(document.querySelector("[data-if-hierarchy]"));
```
- `if:traversal-select`

## Landscape Hierarchy

Choose this when:

- You need a horizontal anatomy of the entire law-to-evidence landscape.

Use components:

- `hierarchy-explorer`
- `claim-tracking`
- `metadata-panel`

Required wiring:

- Use `.if-landscape-hierarchy` and `.if-landscape-node`.
- Use connector primitives rather than raw arrows.
- Pair with rollup grid and sibling comparison table.

Listen when needed:

- `if:hierarchy-select`
- `if:claim-select`

## Claim Tracking Workbench

Choose this when:

- Extracted claims, obligations, references, and implementation statements need review and completion status.

Use components:

- `claim-tracking`
- `document-viewer`
- `item-history`

Required wiring:

- Structured trackers can use `data-if-claims-source="#json-script"` or `renderClaimTracker(root, config)`.
- Claim rows use `data-claim-id`.
- Detail panels use `data-claim-panel`.
- Document jumps use `data-if-doc-jump`.
- Status timelines use textual states for complete, active, pending, and blocked.

Listen when needed:

- `if:claim-select`
- `if:doc-annotation-select`

Public APIs: `renderClaimTracker(root, config)`, `hydrateClaimTrackers(root)`, `getClaimTrackerState(root)`, and `selectClaim(row)`.

## Item History Viewer

Choose this when:

- You need to show historical details for one item: version changes, decisions, source updates, confidence shifts, or downstream impact.

Use components:

- `item-history`
- `policy-diff`
- `metadata-panel`

Required wiring:

- Rows use `data-history-event`.
- Panels use `data-history-panel`.
- Optional label uses `data-if-history-current`.

Listen when needed:

- `if:history-select`
- `if:diff-decision`

## Document Intelligence Viewer

Choose this when:

- You need a Document Viewer with embedded artifacts, reconstituted text, full-text search, semantic highlighting, claims, references, organizations, parser output, and a reference graph preview.

Use components:

- `document-viewer`
- `claim-tracking`
- `relationship-map`
- `metadata-panel`

Required wiring:

- Workspace root uses `data-if-doc-workspace`.
- Optional corpus hydration uses `data-if-doc-corpus="./data/policy-corpus.json"` with records that include `id`, `title`, `source`, `status`, `pages`, `lineCount`, `lines`, `claims`, `refs`, `orgs`, `sections`, and `authority`.
- Artifact source cards use `data-if-doc-source`.
- Matching artifacts use `data-if-doc-artifact`.
- Reconstituted text region uses `data-if-doc-viewer`.
- Search uses `data-if-doc-search`.
- Filter buttons use `data-if-doc-filter="all|matches|claim|org|reference|..."`.
- Highlight toggles use `data-if-doc-highlight`.
- Annotation marks use `data-if-doc-annotation` and `data-if-doc-annotation-value`.
- Count slots use `data-if-doc-match-count`, `data-if-doc-query-count`, `data-if-doc-total-count`, and `data-if-doc-active-filter`.

Listen when needed:

- `if:doc-artifact-select`
- `if:doc-search`
- `if:doc-filter-change`
- `if:doc-highlight-change`
- `if:doc-search-clear`
- `if:doc-jump`
- `if:doc-annotation-select`
- `if:doc-annotation-panel`
- `if:doc-mode-change`

Public APIs: `hydrateDocumentViewers(root)`, `hydrateDocumentCorpus(root)`, `getDocumentViewer(root)`, `getDocumentViewerState(root)`, `getDocumentWorkspaceState(root)`, `updateDocumentSearch(viewer)`, `selectDocumentArtifact(sourceButton)`, `setDocumentArtifactMode(modeButton)`, and `selectDocumentAnnotation(mark)`.

## Policy Diff Review

Choose this when:

- You need side-by-side or unified policy line changes with reviewer decisions.

Use components:

- `policy-diff`
- `review-workflow`
- `form-validation`

Required wiring:

- Diff root uses `data-if-policy-diff`.
- Optional structured render uses `data-if-policy-diff-source="#json-script"` or `data-if-policy-diff-json`.
- Changes use `data-if-diff-change`.
- Navigation uses `data-if-diff-prev` and `data-if-diff-next`.
- Decisions use `data-if-diff-decision`.
- Count and external summaries use `data-if-diff-count`, `data-if-diff-selected-summary`, and `data-if-diff-decision-summary`.

Listen when needed:

- `if:diff-select`
- `if:diff-decision`
- `if:review-workflow-action`

## Review Action Bar

Choose this when:

- Findings need approve, reject, edit, escalate, assign, snooze, create work item, or export actions.

Use components:

- `review-workflow`
- `buttons-actions`
- `split-button-menu`
- `form-validation`

Required wiring:

- Workflow root uses `data-if-review-workflow`.
- Structured workflow data can be supplied with `data-if-review-workflow-source="#json-script"` or by calling `renderReviewWorkflow(root, config)`.
- Items use `data-if-review-item`.
- Commands use `data-if-review-action`.
- Decision reason uses `data-if-review-reason`.

Listen when needed:

- `if:review-workflow-select`
- `if:review-workflow-action`
- `if:form-validate`

Public APIs: `renderReviewWorkflow(root, config)`, `getReviewWorkflow(root)`, `getReviewWorkflowState(root)`, `selectReviewWorkflowItem(item)`, `applyReviewWorkflowAction(control, action)`, `updateReviewWorkflow(root)`, and `hydrateReviewWorkflows(root)`.

## Architecture Diagram

Choose this when:

- You need to reconstruct an architecture artifact with stages, service boxes, connectors, trust boundaries, hover details, click focus, node search, sliders, layer toggles, and export.

Use components:

- `architecture-diagram`
- `configuration-demo-controls`
- `metadata-panel`
- `search-autocomplete`

Required wiring:

- Diagram root uses `data-if-diagram`.
- Selectable items use `data-if-diagram-item`.
- Detail panel uses `data-if-diagram-detail`.
- Optional node search uses `data-if-diagram-search` and `data-if-diagram-search-status`.
- Optional layout editing uses `data-if-diagram-edit-toggle`, `data-if-diagram-edit-field`, and `data-if-diagram-layout-save/load/reset`.
- Connector surface uses `data-if-connector-routing`.
- Endpoints use `data-if-connector-node`.
- Routes use `data-if-connector-route`, `data-if-connector-from`, and `data-if-connector-to`.
- Route labels are selectable; use `selectDiagramConnectorRoute()` to focus one programmatically and `setDiagramConnectorRoute()` to change label, style, tone, anchors, node avoidance, or `data-if-connector-waypoints`.
- Optional real image marks use `.if-asset-slot[data-if-asset]` inside diagram items. Use `data-if-asset-fallback-icon` for missing images and `data-if-asset-export="false"` for cross-origin images that are not CORS-enabled.

Listen when needed:

- `if:diagram-layer`
- `if:diagram-search`
- `if:diagram-var`
- `if:diagram-select`
- `if:diagram-edit-mode`
- `if:diagram-route-select`
- `if:diagram-route-edit`
- `if:diagram-source-node-create`
- `if:diagram-node-duplicate`
- `if:diagram-node-reorder`
- `if:diagram-selected-copy`
- `if:diagram-selected-apply`
- `if:diagram-selected-reset`
- `if:diagram-node-move`
- `if:diagram-item-edit`
- `if:diagram-layout-save`
- `if:asset-load`
- `if:asset-error`
- `if:connector-routes`
- `if:surface-export`

## Diagram Export

Choose this when:

- A graph, diagram, authority chain, or data model surface needs PNG or PDF export.

Use components:

- `architecture-diagram`
- `graph-explorer`
- `relationship-map`

Required wiring:

- Add `data-if-export="#target-id"` to the export button.
- The export target should have stable dimensions and visible background.
- Use PNG for screenshots and PDF for shareable review artifacts.

Listen when needed:

- `if:surface-export`

## Agent Runtime

Choose this when:

- You need to show healthy, running, paused, degraded, failing, blocked, and recovering agents with progress, logs, model/prompt versions, eval scores, and output contracts.

Use components:

- `governance-patterns`
- `charts-analytics`
- `configuration-demo-controls`

Required wiring:

- Use `.if-agent-state-card` for state snapshots.
- Use `.if-agent-runtime` and `.if-agent-progress` for execution views.
- Use badges for state, eval, model, and contract version.

Listen when needed:

- `if:demo-state`
- `if:chart-dataset`
- `if:chart-point-select`

## Governance Operation Card

Choose this when:

- You need provenance ledgers, degraded state cards, alert rules, publication thresholds, API/export contracts, or role-gated actions.

Use components:

- `governance-patterns`
- `metadata-panel`
- `form-validation`

Listen when needed:

- `if:field-validate`
- `if:demo-state`
- `if:surface-export`

## Public Consulting Page

Choose this when:

- You are building Adam Boas Consulting homepage, service, resume, profile, blog, publication, reference loop, engagement package, or contact surfaces.

Do not choose this when:

- The screen is an internal policy intelligence product surface.

Use components:

- `public-site-patterns`
- `search-autocomplete`
- `icon-system`

Required wiring:

- Use `.if-site-shell`, not `.if-shell`.
- Use `.if-site-hero`, `.if-service-card`, `.if-profile-media`, `.if-publication-card`, `.if-resume-timeline`, `.if-engagement-package`, and `.if-contact-grid`.
- Use `docs/public-site-handoff.md` as the route, content schema, adapter, trusted-example, and acceptance contract for AdamBoas.com buildout.

Listen when needed:

- `if:autocomplete-select`
- `if:route-change`

## Public Site Search

Choose this when:

- A public site needs writing/package/resource search with editorial result cards.

Use components:

- `public-site-patterns`
- `search-autocomplete`

Required wiring:

- Use `.if-public-search` with `data-if-public-search`.
- Add `data-if-public-search-query` to the search input.
- Add `data-if-public-search-filter="all|category"` to category controls.
- Add `data-if-public-search-result` plus `data-if-public-search-category` and optional `data-if-public-search-text` to result cards.
- Add `data-if-public-search-count` and `data-if-public-search-empty` for user feedback.
- Add `data-if-autocomplete` for local suggestions or `data-if-autocomplete-remote` for a site API.

Listen when needed:

- `if:public-search`

## Configurable Showcase

Choose this when:

- A design-system page needs sliders, state buttons, transitions, density/radius demos, theme demos, live data demos, or token previews.

Use components:

- `configuration-demo-controls`
- any target component

Required wiring:

```html
<div data-if-config-demo data-if-config-demo-source="#config-demo"></div>

<input class="if-range" type="range"
  data-if-control-var="--demo-gap"
  data-if-control-target="#preview"
  data-if-control-output="#gap-output"
  data-if-control-unit="rem">

<button class="if-btn" type="button"
  data-if-demo-target="#preview"
  data-if-demo-state-prefix="if-showcase-state--"
  data-if-demo-state="blocked">
  Blocked
</button>
```

Listen when needed:

- `if:control-var`
- `if:demo-state`

Public APIs: `renderConfigurationDemo(root, config)`, `hydrateConfigurationControls(root)`, `getConfigurationState(root)`, `setControlVariable(control)`, and `setDemoState(control)`.

## Component Inventory Readiness

Choose this when:

- A design-system, admin console, or agent handoff page needs a searchable component/capability catalog with readiness counts.
- Component cards already use stable ids such as `data-if-inventory-id` and should stay aligned with `docs/component-manifest.json`.

Use components:

- `configuration-demo-controls`
- inventory cards with `data-if-inventory-id`

Required wiring:

```html
<input class="if-input" type="search" data-if-component-inventory-filter="#component-inventory">
<select class="if-select" data-if-component-inventory-category="#component-inventory">
  <option value="all">All categories</option>
  <option value="Data display">Data display</option>
</select>
<select class="if-select" data-if-component-inventory-status="#component-inventory">
  <option value="all">All statuses</option>
  <option value="Ready">Ready</option>
</select>
<select class="if-select" data-if-component-inventory-risk="#component-inventory">
  <option value="all">All risk states</option>
  <option value="p0">P0 release blockers</option>
  <option value="clear">Clear components</option>
</select>
<div data-if-component-inventory-active-filters aria-label="Active filters"></div>
<section id="component-inventory" data-if-component-inventory data-if-component-manifest="../docs/component-manifest.json" data-if-component-inventory-deficiency-source="#package-deficiency-backlog">
  <article data-if-inventory-id="data-table">
    <header><div><span>Data display</span><h3>Enterprise Data Table</h3></div><span class="if-badge">Ready</span></header>
    <p>Sorting, filtering, pagination, adapters, and virtualization.</p>
    <!-- The framework injects data-if-component-inventory-card-readiness after manifest hydration. -->
  </article>
</section>
<aside data-if-component-inventory-detail>
  <strong data-if-component-inventory-selected-title>Enterprise Data Table</strong>
  <span data-if-component-inventory-selected-id>data-table</span>
  <span data-if-component-inventory-selected-status>Ready</span>
  <strong data-if-component-inventory-selected-score>100%</strong>
  <div role="meter" aria-valuemin="0" aria-valuemax="100" data-if-component-inventory-selected-scorebar></div>
  <p data-if-component-inventory-selected-evidence></p>
  <p data-if-component-inventory-selected-missing></p>
  <p data-if-component-inventory-selected-classes></p>
  <p data-if-component-inventory-selected-attributes></p>
  <p data-if-component-inventory-selected-apis></p>
  <p data-if-component-inventory-selected-events></p>
  <p data-if-component-inventory-selected-use></p>
  <p data-if-component-inventory-selected-avoid></p>
  <p data-if-component-inventory-selected-recipes></p>
  <p data-if-component-inventory-selected-actions></p>
</aside>
<section data-if-component-inventory-scorecard aria-label="Component readiness scorecard"></section>
<section data-if-component-inventory-report aria-label="Category readiness rollup"></section>
<button type="button" data-if-component-inventory-category-set="#component-inventory" data-if-component-inventory-category-value="Data display">View Data Display</button>
<section data-if-component-inventory-release-gate aria-label="Release readiness gate"></section>
<section data-if-component-inventory-risk-register aria-label="Prioritized readiness risk register"></section>
<section data-if-component-inventory-deficiency-assessment aria-label="Most deficient component and capability assessment"></section>
<section data-if-component-inventory-actions aria-label="Prioritized readiness action queue"></section>
<section data-if-component-inventory-evidence-matrix aria-label="Evidence lens matrix"></section>
<section data-if-component-inventory-snapshot aria-label="Machine-readable readiness snapshot"></section>
<section data-if-component-inventory-view-state aria-label="Compact inventory view state"></section>
<button type="button" data-if-component-inventory-select="#component-inventory" data-if-component-inventory-select-id="data-table">Select Data Table</button>
<script type="application/json" id="package-deficiency-backlog">
{
  "status": "shipping-backlog",
  "openItems": [],
  "closedItems": [
    {
      "id": "PUBLIC-HANDOFF",
      "title": "AdamBoas.com public-site handoff",
      "evidence": "docs/public-site-handoff.md",
      "closed": "Homepage, services, profile, resume, insights, attribution, reference loop, public search, and contact contracts are frozen for downstream buildout."
    },
    {
      "id": "REL-PROV",
      "title": "Release provenance evidence",
      "evidence": "release/provenance.json",
      "closed": "Local package, checksum, tarball, CDN/export, no-React, and publish-provenance evidence is generated and verified."
    },
    {
      "id": "FW-013",
      "title": "Production starter handoff kits",
      "evidence": "starters/README.md",
      "closed": "Plain HTML and Vite starters for Policy Intelligence and AdamBoas.com consume package artifacts only."
    },
    {
      "id": "FW-017",
      "title": "Document intelligence production path",
      "evidence": "docs/document-intelligence-production-path.md",
      "closed": "Parser output, annotations, search/highlight, and fallback contracts are frozen."
    },
    {
      "id": "FW-019",
      "title": "Manifest state and motion contracts",
      "evidence": "docs/component-manifest.json",
      "closed": "Layout, navigation, actions, overlays, charts, KPIs, relationship maps, and scale-lab families now expose explicit stateAndMotion hooks for the inventory motion lens."
    },
    {
      "id": "FW-020",
      "title": "KPI metric event contract",
      "evidence": "docs/event-catalog.md",
      "closed": "KPI cards now emit if:kpi-metric-update when sparkline, value, delta, metadata, or streaming state changes."
    },
    {
      "id": "FW-021",
      "title": "Chart point selection contract",
      "evidence": "docs/event-catalog.md",
      "closed": "Charts now normalize data points with role, index, aria-selected, selected styling, keyboard activation, and if:chart-point-select events."
    },
    {
      "id": "FW-022",
      "title": "Deficiency assessment hydration stability",
      "evidence": "src/js/index.js",
      "closed": "Manifest-backed readiness panels now render an evidence-loading state instead of scoring card-only placeholders before component manifest metadata resolves."
    },
    {
      "id": "FW-023",
      "title": "Deficiency assessment event contract",
      "evidence": "docs/event-catalog.md",
      "closed": "Component inventories now emit if:component-inventory-deficiency with assessment totals, focus, top deficiencies, weak capability lenses, and backlog data."
    },
    {
      "id": "FW-024",
      "title": "Deficiency snapshot contract",
      "evidence": "src/js/index.js",
      "closed": "Readiness snapshots now include a serializable deficiencyAssessment block with filters, totals, backlog, top deficiencies, weak capability lenses, and focus guidance."
    }
  ]
}
</script>
```

Listen when needed:

- `if:component-inventory-filter`
- `if:component-inventory-select`
- `if:component-inventory-manifest`
- `if:component-inventory-manifest-error`
- `if:component-inventory-deficiency`

Public APIs: `hydrateComponentInventories(root)`, `getComponentInventoryState(root)`, `getComponentInventoryViewState(root)`, `applyComponentInventoryViewState(root, viewState)`, `applyComponentInventoryPreset(control)`, `clearComponentInventoryFilter(control)`, `getComponentInventoryReadinessReport(root)`, `getComponentInventoryReadinessScorecard(root)`, `getComponentInventoryReadinessActions(root)`, `getComponentInventoryDeficiencyBacklog(root)`, `getComponentInventoryDeficiencyAssessment(root)`, `getComponentInventoryEvidenceMatrix(root)`, `getComponentInventoryCapabilityCoverage(root)`, `getComponentInventoryReadinessSnapshot(root)`, `getComponentInventoryReleaseGate(root)`, `getComponentInventoryRiskRegister(root)`, `setComponentInventoryCapabilityFilter(control)`, `setComponentInventoryCategoryFilter(control)`, `applyComponentInventoryFilters(rootOrControl)`, `selectComponentInventoryCard(inventoryOrCard, cardOrId)`, and `moveComponentInventorySelection(cardOrInventory, direction)`.

Filtering sets `data-if-component-inventory-motion="filtering"` briefly, and selection adds `.is-selection-pulse` briefly. Keep custom inventory CSS compatible with the framework-wide `prefers-reduced-motion` guard.

The manifest-level `stateAndMotion` object is the agent-readable contract for component families whose motion is controlled by shared states such as `open`, `selected`, `streaming`, `running`, `collapsed`, or `theme-changing`. Use it to verify available hooks, transition surfaces, and reduced-motion expectations before introducing new animation behavior in an application.

Focused inventory cards use roving selection: `ArrowRight` / `ArrowDown` move to the next visible card, `ArrowLeft` / `ArrowUp` move to the previous visible card, `Home` / `End` jump to the bounds, and `Enter` / `Space` select the focused card.

Use `[data-if-component-inventory-capability-coverage]` or `getComponentInventoryCapabilityCoverage(root)` when a host needs a readiness lens for scripting APIs, events, data attributes, classes, docs, examples, accessibility notes, recipes, and motion/state hooks. Use `[data-if-component-inventory-capability="#inventory"]` or `setComponentInventoryCapabilityFilter(control)` to show only components missing a selected capability; generated coverage rows with gaps expose `[data-if-component-inventory-capability-set]` drilldown buttons.

Use `[data-if-component-inventory-sort="#inventory"]` to reorder cards by manifest order, risk priority, action count, evidence gaps, evidence coverage, readiness, category, or title. Sorting goes through `applyComponentInventoryFilters(rootOrControl)`, so reports, snapshots, motion feedback, and keyboard traversal use the same ordered card set.

Use `[data-if-component-inventory-preset="#inventory"][data-if-component-inventory-preset-value="release-blockers"]` or `applyComponentInventoryPreset(control)` for one-click readiness views. Built-in presets include `all`, `release-blockers`, `readiness-actions`, `evidence-gaps`, `motion-gaps`, `hardening`, and `clean`.

Use `[data-if-component-inventory-deficiency-source="#json-script"]` or `getComponentInventoryDeficiencyBacklog(root)` when the inventory should show package-level readiness items in addition to per-component manifest gaps. This is the recommended place to surface release smoke, provenance, starter-kit, or downstream handoff deficiencies that do not belong to a single component family.

Use `if:component-inventory-deficiency` when a release dashboard, package-health monitor, or downstream agent needs the generated deficiency assessment without scraping rendered text.

Use `getComponentInventoryReadinessSnapshot(root)` as the one-call handoff payload for release smoke and agent transfer. The snapshot includes filters, release gate, risk register, readiness totals, evidence and capability coverage, actions, component contract counts, and the serializable deficiency assessment block.

Use `[data-if-component-inventory-view-state]` or `getComponentInventoryViewState(root)` when a host needs a compact persistence payload. Replay it with `applyComponentInventoryViewState(root, viewState)` to restore filters, sort, preset, selection, and visible ids.

## Collapsible Surfaces

Choose this when:

- A card, metadata panel, design-system specimen, or dense workbench panel should reveal optional details without opening a modal or full-screen surface.
- The host app needs to persist collapsed state per workspace, section, or user preference.

Do not choose this when:

- The control should expand an entire graph, diagram, or document work surface. Use `data-if-surface-expand` and [Diagram Export](#diagram-export)-style surface controls instead.
- The content is mutually exclusive navigation. Use tabs or accordions.

Use components:

- `collapsible-surface`
- optional `metadata-panel`
- optional `configuration-demo-controls`

Required wiring:

```html
<article class="if-panel" data-if-collapsible data-if-collapsible-label="Parser metadata">
  <header class="if-panel__header">
    <h2 class="if-panel__title" data-if-collapsible-title>Parser metadata</h2>
    <button class="if-icon-btn" type="button" data-if-collapsible-toggle aria-expanded="true">
      <span class="if-icon-slot" data-if-icon="minus" data-if-collapsible-icon aria-hidden="true"></span>
    </button>
  </header>
  <div class="if-collapsible-region" data-if-collapsible-region>
    Optional details.
  </div>
</article>
```

Listen when needed:

- `if:collapsible-toggle`

## Coverage Closure

Choose this when:

- A design-system or product page needs the remaining P0/P1 primitives in one suite: upload/dropzone, command palette, editable grid, date picker, wizard/stepper, annotation toolbar, and success/empty/loading/error/cancelled adapter states.

Use components:

- `upload-dropzone`
- `command-palette`
- `editable-grid`
- `date-calendar-picker`
- `wizard-stepper`
- `annotation-toolbar`
- `state-variants`

Listen when needed:

- `if:dropzone-change`
- `if:command-palette-action`
- `if:editable-grid-change`
- `if:date-picker-change`
- `if:wizard-step`
- `if:annotation-tool-change`
- `if:state-variant-change`
- `if:adapter-state`
- `if:adapter-retry`

## Upload Dropzone

Choose this when a user needs to stage source artifacts before parser or ingestion work. Use `.if-dropzone`, `data-if-dropzone`, and a native file input with `data-if-dropzone-input`. Listen for `if:dropzone-change` to hand files to the host upload service.

## Command Palette

Choose this when a dense control surface needs searchable actions or Ctrl+K access. For editor-friendly surfaces, store commands as JSON and point the palette at them with `data-if-command-source="#commands-json"` or inline them with `data-if-command-json`. `renderCommandPalette` generates grouped command rows, shortcut hints, live visible/total counts, and the empty state; `getCommandPaletteState` returns the active command, query, visible count, total count, id, group, route, and shortcut metadata.

Use hand-authored DOM only when the host must own the full row markup: `data-if-command-palette`, `data-if-command-input`, `data-if-command-item`, and optional `data-if-command-palette-toggle`. Listen for `if:command-palette-filter` to sync search state and `if:command-palette-action` to execute the selected command.

## Editable Grid

Choose this when extracted claims, obligations, owners, confidence values, or review rows need lightweight inline edits. Use `.if-editable-grid`, `data-if-editable-grid`, and `data-if-editable-cell`. Listen for `if:editable-grid-change`.

## Date Calendar Picker

Choose this when a compact due-date or source-window picker is enough. Use `data-if-date-picker`, `data-if-date-grid`, `data-if-date-nav`, `data-if-date-select`, `data-if-date-output`, `data-if-date-native`, and `data-if-date-summary`. Listen for `if:date-picker-change` and optionally `if:date-picker-month`.

## Wizard Stepper

Choose this when a watchlist, ingest, export, rule-builder, or review workflow needs visible multi-step progress. Use `data-if-wizard`, `data-if-wizard-step`, `data-if-wizard-panel`, `data-if-wizard-next`, and `data-if-wizard-prev`. For generated flows, store the steps as JSON and point the root at it with `data-if-wizard-source="#wizard-json"` or inline it with `data-if-wizard-json`. Add `data-if-wizard-status` and `data-if-wizard-progress` when users need current-step feedback. Listen for `if:wizard-step`.

Use `.if-stepper--semantic` when the steps need explicit workflow meaning: `.is-complete` for completed/past steps, `.is-active` for the current step, `.is-blocked` for blocked steps, `.is-optional` for optional/warning steps, and no explicit state for future steps. Add `.if-stepper--boxed` when each step should feel like a deliberate node or `.if-stepper--unboxed` when the rail and dots should carry the workflow without boxed cards. Add `.if-stepper--compact` for dense review strips and `.if-stepper--vertical` for route-style checklists.

For configurable showcases or product settings, use the generic demo-state adapter to swap production classes:

```html
<button data-if-demo-target="#review-stepper" data-if-demo-state-prefix="if-stepper--" data-if-demo-state="boxed" aria-pressed="true">Boxed nodes</button>
<button data-if-demo-target="#review-stepper" data-if-demo-state-prefix="if-stepper--" data-if-demo-state="unboxed" aria-pressed="false">Rail only</button>
<ol id="review-stepper" class="if-stepper if-stepper--interactive if-stepper--semantic if-stepper--boxed"></ol>
```

Public APIs: `renderWizard(root, config)`, `hydrateWizard(root)`, `getWizard(root)`, `getWizardState(root)`, and `setWizardStep(root, stepIndexOrId)`. Keyboard users can move between steps with arrow keys, `Home`, `End`, `Enter`, and `Space`.

## Annotation Toolbar

Choose this when users mark text as claim, reference, organization, evidence, implementation, or enablement. Use `.if-annotation-toolbar`, `data-if-annotation-toolbar`, and `data-if-annotation-tool`; add `data-if-annotation-label`, `data-if-annotation-short`, and `data-if-annotation-description` when the visible button label is abbreviated. `hydrateAnnotationToolbars(root)` normalizes toolbar roles, roving tab stops, `aria-pressed`, preview classes, and status slots.

```html
<section data-if-annotation-scope>
  <div class="if-annotation-toolbar" data-if-annotation-toolbar data-if-annotation-current="claim" role="toolbar" aria-label="Annotation tools">
    <button class="is-active" type="button" data-if-annotation-tool="claim" data-if-annotation-label="Claim" data-if-annotation-short="CLM" data-if-annotation-description="Requirement language.">CLM</button>
    <button type="button" data-if-annotation-tool="reference" data-if-annotation-label="Reference" data-if-annotation-short="REF" data-if-annotation-description="Source authority.">REF</button>
  </div>
  <p class="if-annotation-preview if-annotation-preview--claim" data-if-annotation-preview><span data-if-annotation-label>CLM</span> Marked text preview.</p>
  <span data-if-annotation-current>Claim</span>
</section>
```

Listen for `if:annotation-tool-change` with `{ toolbar, control, tool, label, state }`, or read `getAnnotationToolbarState(toolbar)` before applying the selected semantic mode to a document viewer.

## State Variants

Choose this when a component needs no-results, loading, recoverable error, or skeleton feedback. Use `.if-empty`, `.if-loading`, `.if-error-state`, `.if-skeleton`, and optional `data-if-state-preview` controls. Listen for `if:state-variant-change` in demos or host orchestration.

Use `runAdapterTask(target, adapter, context, { channel })` when a new analytics surface needs production-style loading, empty, error, cancel, and success states but does not yet have a specialized registry. The helper creates an `AbortSignal`, cancels stale work in the same channel, writes `data-if-adapter-state`, updates `[data-if-adapter-status]`, and emits both generic `if:adapter-*` events and scoped `if:{channel}-*` events.

```js
await InterfaceFramework.runAdapterTask(
  document.querySelector("#document-annotation-panel"),
  ({ signal, artifactId }) => fetch(`/api/annotations/${artifactId}`, { signal }).then((res) => res.json()),
  { artifactId: "500087p" },
  { channel: "document-annotation", loadingMessage: "Loading annotations..." }
);
```

Use `cancelAdapterTask(target, channel, reason)` for explicit cancel controls and `getAdapterTaskState(target, channel)` for status rails.

## Performance Scale Lab

Choose this when a release smoke page, design-system page, or downstream sample needs large-data proof for tables, graphs, diagrams, document viewers, and charts. Use `performance-scale-lab`, `data-if-performance-lab`, `data-if-performance-run`, `data-if-overflow-check`, and the five generated surface slots. Mark intentionally scrollable regions with `data-if-overflow-mode="scroll"` so page-level overflow failures stay meaningful.

```html
<article class="if-performance-lab" data-if-performance-lab data-if-performance-profile="balanced">
  <button type="button" data-if-performance-run="large">Large data</button>
  <div data-if-performance-table data-if-overflow-check data-if-overflow-mode="scroll"></div>
  <div data-if-performance-graph data-if-overflow-check></div>
  <div data-if-performance-report></div>
</article>
```

Listen when needed:

- `if:performance-run`

Use programmatic APIs:

- `runPerformanceLab(root, "large")`
- `evaluatePerformanceBudgets(profile, sections, overflow, totalMs)`
- `measureOverflow(root)`

Use `docs/performance-budgets.md` when wiring this into a release or CI gate.

## Supporting Recipes

### Toolbar Actions

Choose this when a compact toolbar needs icon buttons, labels, active states, tooltips, or export controls. Use `buttons-actions`, `icon-system`, and `split-button-menu`. Wire icons with `data-if-icon` and tooltips with `data-if-tooltip`.

### Split Export Action

Choose this when one export button needs CSV, JSON, PDF, PNG, or package-specific choices. Use `split-button-menu` with `data-if-menu-toggle`, `data-if-menu`, and `data-if-menu-item`. Listen for `if:menu-select` and `if:surface-export` when the host app owns the export.

### Theme Switcher

Choose this when the account/profile surface or a settings page needs light, dark, high contrast, or system preference controls. Use `theme-controls` with `data-if-theme`, `data-if-theme-control`, and `data-if-theme-label`. Listen for `if:theme-change`.

### Mobile Route Nav

Choose this when a mobile or narrow viewport needs route-aware bottom or drawer navigation. Use `sidebar-navigation`, `topbar-utility-cluster`, and `data-if-route-nav`. Call `setRouteNavigation(nav, route)` after host route changes.

### Notification Account Cluster

Choose this when a top-right utility area needs notifications, account actions, profile preference controls, and theme switching. Use `topbar-utility-cluster`, `overlays`, `theme-controls`, and `search-autocomplete`.

### Metadata Detail Panel

Choose this when a selected row, node, source, document, or claim needs a right-side summary of provenance, confidence, source, owner, dates, and actions. Use `metadata-panel`, optional `tabs-accordions`, and `data-if-focus-detail`.

### Authority Path

Choose this when a small authority or impact chain needs directional connectors without a full graph. Use `relationship-map`, `.if-relationship-map__arrow`, `.if-chip`, and optional `data-if-connector-routing`.

### Relationship Summary

Choose this when a record detail should summarize counts by relationship type. Use `relationship-map`, `metadata-panel`, and badges for confidence/count labels. Link to `graph-explorer` only when users need traversal.

### Source Health Table

Choose this when a sources page needs change-rate sparklines, health badges, parser status, and row actions. Use `data-table`, `charts-analytics`, `kpi-metrics`, and `governance-patterns`.

### Validated Review Form

Choose this when a decision, escalation, assignment, or export needs required reason capture with error summaries. Use `form-validation`, `review-workflow`, and `buttons-actions`. Listen for `if:form-validate` and `if:review-workflow-action`.

## Documentation Template For Agent Output

When an agent implements a component, document the work in this shape:

```md
Component choice: `data-table`
Recipe: `enterprise-data-table`
Why: The user needed sorting, filtering, pagination, selected counts, and server loading.
Classes used: `.if-table-wrap`, `.if-table`, `.if-table-toolbar`
Data attributes used: `data-if-data-table`, `data-if-table-sort`, `data-if-table-filter`
JavaScript APIs used: `registerDataTableAdapter`, `refreshDataTable`
Events listened to: `if:table-results`, `if:table-error`
Accessibility notes: Native buttons in headers, visible row count, keyboard selection preserved.
Docs linked: `docs/component-api.md#enterprise-data-table`
```
