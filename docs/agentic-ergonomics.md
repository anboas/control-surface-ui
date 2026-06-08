# Agentic Ergonomics

This document is the agent-facing guide for using the framework without spelunking through every source file. It explains how to select components from metadata, wire behavior, add host integration, and document the result.

Primary agent inputs:

- [`agent-handoff.md`](./agent-handoff.md): MVP route map, trusted examples, adapter expectations, build order, and known gaps.
- [`mvp-route-contracts.md`](./mvp-route-contracts.md): page-level MVP route contracts and acceptance checks.
- [`route-component-map.md`](./route-component-map.md): route-level component choices, behavior requirements, events, and example references.
- [`adapter-fixture-contracts.md`](./adapter-fixture-contracts.md): production-shaped fixture payloads for mocks and service adapters.
- [`component-manifest.json`](./component-manifest.json): machine-readable component inventory.
- [`recipes.md`](./recipes.md): implementation playbooks.
- [`event-catalog.md`](./event-catalog.md): emitted event contracts.
- [`component-api.md`](./component-api.md): copy-paste markup and variant matrices.
- [`data-schemas.md`](./data-schemas.md): table, graph, chart, and adapter payloads.

## Definition Of Done For An Agent

An agent has enough information when it can answer these questions without reading `src/js/index.js` or `src/styles/components.css`:

- Which component should I choose?
- What classes and `data-if-*` attributes are required?
- Which JavaScript APIs are stable and optional?
- Which events should I listen to?
- What accessibility rules apply?
- Which docs and examples should I cite?
- How do I initialize and destroy the component safely?

## Metadata-First Workflow

1. Read `docs/component-manifest.json`.
2. Match the user request against `components[].whenToUse`.
3. Reject bad fits using `components[].avoidWhen`.
4. Choose a recipe from `components[].recipes`.
5. Copy classes from `components[].primaryClasses`.
6. Copy behavior hooks from `components[].dataAttributes`.
7. Wire host integration using `components[].jsApis` and `components[].events`.
8. Check `components[].accessibility`.
9. Link the chosen `components[].docs` in your implementation notes.
10. Run `npm run build` and `npm run validate`.

## Programmatic Behavior Workflow

Use markup and data attributes for the default behavior. Use `InterfaceFramework.getComponentController(target)` when a host app, test, or agent needs to drive a component from JavaScript. This keeps state changes on the same path as pointer and keyboard interactions.

```js
const controller = InterfaceFramework.getComponentController("[data-if-graph]");
controller.select("dodi-5200-01");
controller.reset();
```

Controller methods are stable across component families: `open`, `close`, `toggle`, `select`, `setState`, `reset`, `refresh`, and `destroy`. If you need a new capability, extend the controller contract and update `component-api.md`, `event-catalog.md`, `component-manifest.json`, and behavior tests in the same change.

## Component Selection Guidance

| Need | Choose | Reason |
| --- | --- | --- |
| Full app shell | `shell-layout` | Provides app root, topbar, sidebar, content and detail regions. |
| Top-right enterprise controls | `topbar-utility-cluster` | Bundles global search, notifications, account, and theme/profile surfaces. |
| Dense left navigation | `sidebar-navigation` | Handles grouped sections, counts, filters, and route-aware nav. |
| Action hierarchy | `buttons-actions` | Covers primary, secondary, tertiary, semantic, destructive, and icon commands. |
| Primary action with options | `split-button-menu` | Adds keyboard-accessible dropdown choices without losing the primary command. |
| Domain glyphs and image marks | `icon-system` | Provides dependency-free icons, asset slots for approved SVG/PNG/JPG marks, and a registry catalog. |
| Profile theme control | `theme-controls` | Keeps light default, dark, high contrast, system, and scoped themes consistent. |
| Help text and validation | `form-validation` | Provides label/help/error contracts, summaries, and validation events. |
| Autosuggest search | `search-autocomplete` | Handles local and remote suggestions, highlighted matches, cancellation, empty/error states. |
| Artifact staging | `upload-dropzone` | Provides drop/click upload affordance, staged file chips, and upload events. |
| Searchable command surface | `command-palette` | Provides Ctrl+K-style action discovery and keyboard command activation. |
| Inline extracted-item editing | `editable-grid` | Covers small editable claim/owner/confidence grids without a heavy spreadsheet runtime. |
| Due date selection | `date-calendar-picker` | Provides compact date buttons, output syncing, and due-date events. |
| Multi-step setup | `wizard-stepper` | Covers rule builders, ingest setup, export, and review activation steps. |
| Semantic markup tools | `annotation-toolbar` | Covers CLM/REF/ORG/EVD tool selection for document and claim workflows. |
| Adapter/state feedback | `state-variants` | Covers reusable success, no-results, skeleton/loading, cancelled, and retryable error states. |
| Record-heavy data | `data-table` | Covers sort, filter, pagination, selection, expand, resize, pin, virtualize, and adapters. |
| Dense operational workspace | `operations-workspace` | Coordinates selectable signal cards, drilldown panels, table command bands, record detail, provenance, and action queues. |
| Dashboard numbers | `kpi-metrics` | Dense KPI scan units with icon, value, delta, sparkline, and metadata. |
| Analytical visuals | `charts-analytics` | Dependency-free charts, sparklines, and animated demos. |
| Entity provenance | `metadata-panel` | Best for source, confidence, owner, date, review state, and linked facts. |
| Network traversal | `graph-explorer` | Best for many-to-many relationships and interactive traversal. |
| Ordered authority path | `relationship-map` | Best for compact law-to-document or impact paths. |
| Tree or landscape | `hierarchy-explorer` | Best for strict parent-child authority or organization relationships. |
| Parser claims | `claim-tracking` | Best for extracted statements, obligations, evidence, blockers, and completion status. |
| Historical audit | `item-history` | Best for change history, version history, decision history, and source history. |
| PDF and text intelligence | `document-viewer` | Best for embedded artifact plus reconstituted text, highlights, claims, orgs, and refs. |
| Line changes | `policy-diff` | Best for before/after policy text and review decisions. |
| Reviewer queue | `review-workflow` | Best for human-in-the-loop approve/reject/escalate/assign flows. |
| Architecture artifact | `architecture-diagram` | Best for diagram boxes, routed connectors, details, layers, sliders, export. |
| Agent/run governance | `governance-patterns` | Best for agent health, provenance, degraded states, rules, exports, and role gates. |
| Public website | `public-site-patterns` | Best for Adam Boas Consulting pages, publications, profile, resume, blog, contact. |
| Design-system demos | `configuration-demo-controls` | Best for sliders, state toggles, transitions, and component configuration previews. |

## Stable Init And Destroy Contracts

### Whole Page

```js
import "control-surface-ui/css";
import { init, destroy } from "control-surface-ui";

init(document);

window.addEventListener("pagehide", () => {
  destroy(document);
});
```

### Route Fragment

```js
import { init, destroy } from "control-surface-ui";

export function mountPolicyPanel(root, html) {
  root.innerHTML = html;
  init(root, { modules: ["themes", "icons", "forms", "tables", "documents"] });
}

export function unmountPolicyPanel(root) {
  destroy(root, { modules: ["documents", "tables", "forms", "overlays"] });
  root.replaceChildren();
}
```

### Host Module

```js
const unregister = InterfaceFramework.registerBehaviorModule({
  name: "host-router",
  description: "Syncs host route state into framework navigation.",
  selectors: ["[data-host-route]"],
  init(root) {
    root.querySelectorAll("[data-host-route]").forEach((nav) => {
      InterfaceFramework.setRouteNavigation(nav, location.pathname);
    });
  },
  destroy(root) {
    root.querySelectorAll("[data-host-route]").forEach((nav) => {
      nav.querySelectorAll(".is-active").forEach((item) => item.classList.remove("is-active"));
    });
  }
});

// Later:
unregister();
```

## Async Adapter Contracts

Adapters should accept `signal`, return structured empty states, and throw only for real errors. All production adapters share `loading`, `success`, `empty`, `error`, and `cancelled` through `setAdapterState(target, state, detail)`, `data-if-adapter-state`, and the `if:adapter-state` event. For new adapter families, prefer `runAdapterTask(target, adapter, context, { channel })` so request ids, abort signals, stale-request cancellation, generic `if:adapter-*` telemetry, and channel-scoped telemetry are consistent without custom page code.

### Autocomplete

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
  return items.length
    ? items
    : { items: [], state: "empty", title: "No matches", message: "Try a broader query." };
});
```

### Data Table

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
```

### Graph Layout

```js
InterfaceFramework.registerGraphLayoutEngine("authority-layout", async ({ nodes, edges, options, signal }) => {
  const response = await fetch("/api/graph/layout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ nodes, edges, options }),
    signal
  });

  if (!response.ok) throw new Error("Layout engine unavailable.");
  return response.json();
});
```

### Graph Node Semantics

Use the node type registry when production data owns the taxonomy. Keep the DOM stable with `data-node-id` and `data-node-type`; register icons, colors, class mapping, labels, and optional render hooks during app bootstrap.

```js
InterfaceFramework.registerGraphNodeType("implementation-package", {
  className: "component",
  icon: "implementation",
  color: "#0f766e",
  label: "Implementation Package",
  data: { graphLane: "implementation" },
  render(node) {
    node.dataset.nodeContract = "implementation-package";
  }
});

InterfaceFramework.applyGraphNodeTypes(document.querySelector("[data-if-graph]"));
```

### Export Routing

```js
InterfaceFramework.registerExportAdapter("archive-api", async ({ target, format, filename, signal }) => {
  const response = await fetch("/api/export", {
    method: "POST",
    body: JSON.stringify({ format, filename, html: target.outerHTML }),
    signal
  });

  if (!response.ok) throw new Error("Export service unavailable.");
  return { state: "success", filename, format, id: await response.text() };
});
```

### Annotation Schemas

```js
document.addEventListener("if:doc-annotation-select", ({ detail }) => {
  reviewPanel.load(detail.annotation);
});
```

Use `getDocumentAnnotationSchema(mark)` when an agent or adapter needs a serializable line-level annotation without scraping rendered text structure.

## Event Wiring Guidance

Only listen to events that serve a host need:

- Persisting user preferences: `if:theme-change`, `if:graph-organization`, `if:table-density`.
- Server telemetry: `if:autocomplete-request`, `if:table-request`, `if:graph-layout-request`, `if:surface-export-request`, `if:adapter-state`.
- Audit log: `if:review-workflow-action`, `if:diff-decision`, `if:surface-export`.
- Route synchronization: `if:route-change`, `if:graph-node-select`, `if:hierarchy-select`.
- Error reporting: `if:table-error`, `if:autocomplete-error`, `if:graph-layout-error`, `if:surface-export-error`.

Example:

```js
workspace.addEventListener("if:review-workflow-action", ({ detail }) => {
  auditLog.record({
    action: detail.action,
    item: detail.id,
    previousStatus: detail.previousStatus,
    status: detail.status,
    reason: detail.reason
  });
});
```

## Agent Documentation Template

Use this template in implementation notes, PR summaries, or generated docs:

```md
Intent:
Component ids:
Recipe:
Why this component:
Rejected alternatives:
Classes:
Data attributes:
JavaScript APIs:
Events:
Accessibility:
Docs:
Examples:
Verification:
```

Example:

```md
Intent: Server-backed review queue with filters and selected-count actions.
Component ids: `data-table`, `search-autocomplete`, `review-workflow`, `form-validation`.
Recipe: `enterprise-data-table` plus `review-action-bar`.
Why this component: Data table covers sort/filter/page/select/pin/resize/server adapter; review workflow covers approve/reject/escalate.
Rejected alternatives: Metadata panel cannot support multi-record operations.
Classes: `.if-table-wrap`, `.if-table`, `.if-command-strip`.
Data attributes: `data-if-data-table`, `data-if-table-adapter`, `data-if-review-workflow`.
JavaScript APIs: `registerDataTableAdapter`, `refreshDataTable`, `applyReviewWorkflowAction`.
Events: `if:table-results`, `if:table-error`, `if:review-workflow-action`.
Accessibility: Native buttons in headers; visible selected count; decision reason has label/help/error summary.
Docs: `docs/component-api.md#enterprise-data-table`, `docs/event-catalog.md#data-table-events`.
Examples: `examples/review.html`, `examples/components.html`.
Verification: `npm run build`, `npm run validate`.
```

## Quality Gates For Agentic Changes

Before calling a component implementation complete:

- Manifest entry exists or was updated when a new component family was added.
- Recipe exists for any new cross-component workflow.
- Event catalog includes any new emitted event.
- `component-api.md` has copy-paste markup.
- `accessibility.md` or `keyboard.md` covers non-obvious interaction rules.
- `data-schemas.md` covers adapter payloads.
- Examples load only compiled `dist` artifacts.
- `npm run build` passes.
- `npm run validate` passes.

## Common Mistakes

- Adding a new `data-if-*` behavior without listing it in the manifest or recipe docs.
- Listening to visual text instead of a framework event.
- Destroying a DOM fragment without first calling `destroy(fragment)`.
- Using graph explorer for a strict parent-child tree.
- Using metadata panels for record sets that need sorting or bulk actions.
- Using a chart when a KPI card or table would be more legible.
- Adding raw ASCII arrows instead of connector primitives.
- Adding icon-only buttons without accessible names.
