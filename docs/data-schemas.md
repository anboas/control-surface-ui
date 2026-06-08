# Interface Data Schemas

Schema reference for data-driven framework components. These contracts are intentionally small and serializable so plain HTML pages, server-rendered pages, and framework adapters can all feed the same UI layer.

Current schema reference: `interface-framework.data.v0.1`

## General Rules

- Labels are plain text. Do not pass HTML in labels or series names.
- Numeric values must parse with `Number.parseFloat`.
- Pipe-delimited chart rows preserve visual order.
- Invalid rows are ignored rather than rendered as zero.
- Production systems can keep richer API payloads, then serialize the relevant view data into the attributes below before calling `InterfaceFramework.hydrateCharts(target)`.

## Adapter State Schema

Production adapters share one state vocabulary across tables, autocomplete, graph layout engines, export routes, and document annotation panels.

```ts
type AdapterState = "idle" | "loading" | "success" | "empty" | "error" | "cancelled";

type AdapterStateDetail = {
  channel?: "table" | "autocomplete" | "graph-layout" | "diagram-layout" | "export" | "document";
  message?: string;
  requestId?: string;
  target?: HTMLElement;
};

type AdapterTaskContext = {
  channel?: string;
  requestId?: string;
  signal?: AbortSignal;
  target?: HTMLElement;
  [key: string]: unknown;
};

type AdapterTaskResult<T = unknown> = {
  state: AdapterState;
  result?: T;
  error?: Error;
  channel: string;
  requestId: string;
  elapsedMs: number;
  target: HTMLElement;
};
```

Use `InterfaceFramework.setAdapterState(target, state, detail)` when a host adapter owns rendering but still wants the framework to expose a consistent lifecycle. The framework writes `data-if-adapter-state`, applies `is-adapter-*` classes, updates `[data-if-adapter-status]`, shows/hides `[data-if-adapter-state]` panels, and emits `if:adapter-state`.

Use `InterfaceFramework.runAdapterTask(target, adapter, context, options)` when a host needs the framework to own the lifecycle wrapper. The adapter may be a function or an object exposing `run`, `request`, `load`, `search`, `fetch`, `export`, or `save`. The framework creates an `AbortController`, cancels any previous task in the same channel, sends `{ ...context, channel, requestId, signal, target }`, normalizes the result to `success` or `empty`, catches aborts as `cancelled`, catches failures as `error`, and emits generic plus channel-scoped lifecycle events.

Use `InterfaceFramework.cancelAdapterTask(target, channel, reason)` to abort a pending task and `InterfaceFramework.getAdapterTaskState(target, channel)` to inspect pending request metadata. This is the production adapter path for source registries, document annotations, graph traversal, diagram persistence, export jobs, and any future analytics adapter that does not already have a specialized registry.

State expectations:

| State | Use When |
| --- | --- |
| `loading` | A request is pending and has an active `AbortSignal`. |
| `success` | The adapter produced usable rows, suggestions, graph positions, export output, or annotation data. |
| `empty` | The request succeeded but returned no displayable records. |
| `error` | The request failed and can be retried or inspected. |
| `cancelled` | The request was aborted by a newer request, user action, or component dismissal. |

Retry controls can use `data-if-adapter-retry="#target"` when the target is an autocomplete input, data table, graph, or export surface. Specialized controls such as `data-if-table-refresh`, `data-if-autocomplete-cancel`, and `data-if-export-cancel` remain available for tighter command surfaces.

Task events:

| Event | Target | Detail |
| --- | --- | --- |
| `if:adapter-request` | adapter target | `{ channel, requestId, signal, target, ...context }` |
| `if:adapter-result` | adapter target | `{ channel, requestId, state, result, elapsedMs, target, ...context }` |
| `if:adapter-cancel` | adapter target | `{ channel, requestId, state: "cancelled", reason, elapsedMs, target, ...context }` |
| `if:adapter-error` | adapter target | `{ channel, requestId, state: "error", error, elapsedMs, target, ...context }` |
| `if:{channel}-request/result/cancel/error` | adapter target | Same payload, scoped to the normalized channel name. |

## Performance Budget Result Schema

Performance lab runs return a normalized budget result so browser tests, release smoke pages, and downstream hosts can use the same gate.

```ts
type PerformanceBudgetState = "pass" | "fail";

type PerformanceBudgetSection = {
  count: number;
  ms: number;
  limit: number;
  state: PerformanceBudgetState;
};

type PerformanceBudgetResult = {
  profile: string;
  sections: Record<"table" | "graph" | "diagram" | "document" | "charts", PerformanceBudgetSection>;
  total: { ms: number; limit: number; state: PerformanceBudgetState };
  overflow: { checked: number; contained: number; failures: number; limit: number; state: PerformanceBudgetState };
  warnings: Array<Record<string, unknown>>;
  failures: Array<Record<string, unknown>>;
  passed: boolean;
};
```

Use `InterfaceFramework.evaluatePerformanceBudgets(profile, sections, overflow, totalMs)` when a host adapter renders its own large surfaces but still wants the framework's budget vocabulary. The frozen thresholds live in `docs/performance-budgets.md`.

## Autocomplete Adapter Schema

Autocomplete adapters receive a small request context and may return either an array of suggestions or a structured result with an explicit lifecycle state.

```ts
type AutocompleteItem = {
  label: string;
  value?: string;
  type?: string;
  meta?: string;
  id?: string;
};

type AutocompleteAdapterContext = {
  input: HTMLInputElement;
  provider: string;
  query: string;
  limit: number;
  requestId: string;
  signal: AbortSignal;
};

type AutocompleteAdapterResult =
  | AutocompleteItem[]
  | {
      items?: AutocompleteItem[];
      state?: "results" | "success" | "empty" | "error" | "cancelled";
      title?: string;
      message?: string;
      meta?: Record<string, unknown>;
    };

type AutocompleteState = {
  activeId: string;
  activeIndex: number;
  activeLabel: string;
  adapterState: AdapterState | string;
  items: AutocompleteItem[];
  limit: number | null;
  open: boolean;
  provider: string;
  query: string;
  requestId: string;
  resultState: string;
  selected: string;
  total: number;
};
```

DOM contracts:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-autocomplete` | JSON or pipe-delimited string | Local suggestions. |
| `data-if-autocomplete-remote` | adapter name | Remote/production suggestion adapter. |
| `data-if-autocomplete-mock` | mock provider name | Example fixture provider. |
| `data-if-autocomplete-delay` | milliseconds | Mock/adapter delay for lifecycle testing. |
| `data-if-autocomplete-limit` | number | Maximum suggestions shown. |
| `data-if-autocomplete-min` | number | Minimum query length for remote search. |
| `data-if-autocomplete-output` | selector | Selected suggestion summary target. |
| `data-if-autocomplete-cancel` | selector | Control that aborts a pending request. |

Events include the normalized autocomplete state as `detail.autocomplete` on request, results, cancel, error, state, and select events.

## Configuration Demo Schema

Configurable showcase surfaces can be authored as DOM controls or generated from a small JSON document.

```ts
type ConfigurationDemoDocument = {
  title?: string;
  description?: string;
  targetId?: string;
  target?: string;
  controls?: Array<{
    label: string;
    property: string;
    min?: number;
    max?: number;
    value?: number;
    step?: number;
    unit?: string;
    outputId?: string;
  }>;
  states?: Array<{
    label: string;
    state: string;
    prefix?: string;
    variant?: string;
    active?: boolean;
  }>;
  preview?: {
    title?: string;
    body?: string;
    badge?: string;
    badgeClass?: string;
    icon?: string;
  };
};
```

DOM contracts:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-config-demo` | boolean | Renders or hydrates a generated configuration demo. |
| `data-if-config-demo-source` | selector | Points at JSON containing a `ConfigurationDemoDocument`. |
| `data-if-config-demo-json` | JSON string | Inline `ConfigurationDemoDocument` fallback for small demos. |
| `data-if-control-var` | CSS custom property | Binds a range/input value to a target CSS variable. |
| `data-if-control-target` | selector | Target surface that receives the CSS variable. |
| `data-if-control-output` | selector | Output element updated with the formatted value. |
| `data-if-control-unit` | string | Unit suffix appended to the control value. |
| `data-if-demo-state` | string | State name applied as a class to the target. |
| `data-if-demo-state-prefix` | string | Optional state-class prefix. |

## Tabs And Accordion Schema

Navigation disclosures can be authored as DOM or generated from JSON.

```ts
type TabsDocument = {
  label?: string;
  selected?: string;
  tabs: Array<{
    id: string;
    title: string;
    badge?: string;
    body?: string;
    meta?: string;
    accordions?: Array<AccordionItem>;
  }>;
};

type AccordionItem = {
  id?: string;
  title: string;
  body?: string;
  badge?: string;
  expanded?: boolean;
};
```

DOM contracts:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-tabs` | boolean | Hydrates a tablist and panels. |
| `data-if-tabs-source` | selector | Points at JSON containing a `TabsDocument`. |
| `data-if-tabs-json` | JSON string | Inline `TabsDocument` fallback for small demos. |
| `data-if-accordion-trigger` | boolean | Disclosure trigger for an accordion panel. |
| `data-if-accordion` | boolean | Compatibility alias for an accordion trigger. |
| `data-if-accordion-source` | selector | Points at JSON containing accordion items. |
| `data-if-accordion-json` | JSON string | Inline accordion-item fallback. |

## Claim Tracker Schema

Claim trackers can be authored as DOM rows/panels or generated from a normalized claim document.

```ts
type ClaimTrackerDocument = {
  label?: string;
  selected?: string;
  summaries?: Array<"total" | "complete" | "blocked" | string>;
  claims: Array<{
    id: string;
    title: string;
    status?: "active" | "complete" | "pending" | "blocked" | string;
    modal?: string;
    line?: string;
    body?: string;
    quote?: string;
    actor?: string;
    predicate?: string;
    object?: string;
    due?: string;
    confidence?: string;
    tags?: string[];
    evidence?: Array<string | { title: string; meta?: string; status?: string }>;
    relationships?: string[];
  }>;
};
```

DOM contracts:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-claims` | boolean | Hydrates a claim tracker. |
| `data-if-claims-source` | selector | Points at JSON containing a `ClaimTrackerDocument`. |
| `data-if-claims-json` | JSON string | Inline `ClaimTrackerDocument` fallback. |
| `data-claim-id` | string | Stable claim id for selectable rows. |
| `data-claim-panel` | string | Detail panel id matching a claim row. |
| `data-if-claim-count` | key | Live status count target. |

## Command Palette Schema

Command palettes can be authored as DOM buttons or generated from a grouped command document.

```ts
type CommandPaletteDocument = {
  label?: string;
  placeholder?: string;
  emptyText?: string;
  groupLabel?: string;
  commands?: CommandPaletteCommand[];
  groups?: Array<{
    id?: string;
    label: string;
    commands: CommandPaletteCommand[];
  }>;
};

type CommandPaletteCommand = {
  id?: string;
  label: string;
  description?: string;
  icon?: string;
  route?: string;
  shortcut?: string;
  selected?: boolean;
};
```

DOM contracts:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-command-palette` | boolean | Hydrates a searchable command surface. |
| `data-if-command-source` | selector | Points at JSON containing a `CommandPaletteDocument`. |
| `data-if-command-json` | JSON string | Inline `CommandPaletteDocument` fallback. |
| `data-if-command-palette-toggle` | selector | Opens the target palette. |
| `data-if-command-input` | search input | Filters visible commands. |
| `data-if-command-item` | boolean | Selectable command row. |
| `data-if-command-id` | string | Stable command id emitted with action events. |
| `data-if-command-label` | string | Searchable command label. |
| `data-if-command-route` | string | Host route/action key emitted with action events. |
| `data-if-command-shortcut` | string | Shortcut hint displayed in the item. |
| `data-if-command-group` | string | Group id for generated sections and items. |
| `data-if-command-count` | `visible` or `total` | Live count target updated by filtering. |
| `data-if-command-empty` | boolean | Empty panel shown when no commands match. |

## Keyboard And Reviewer Workflow Schema

The keyboard model is exposed as a serializable object so host applications can document or test behavior without scraping prose.

```ts
type KeyboardModel = Record<string, Array<{
  keys: string;
  action: string;
  details: string;
}>>;
```

Reviewer workflow roots use DOM attributes for state and can also be backed by server data.

```ts
type ReviewWorkflowItem = {
  id: string;
  title: string;
  status: "open" | "approved" | "rejected" | "escalated" | "assigned" | "snoozed";
  assignee?: string;
  body?: string;
  evidence?: string;
  meta?: string;
  reason?: string;
  severity?: "low" | "medium" | "high" | "critical" | string;
  tags?: string[];
};

type ReviewWorkflowDocument = {
  label?: string;
  selected?: string;
  actions?: Array<"approve" | "reject" | "escalate" | "assign" | "snooze" | "reopen">;
  counts?: string[];
  items: ReviewWorkflowItem[];
};

type ReviewWorkflowAction = {
  action: "approve" | "reject" | "escalate" | "assign" | "snooze" | "reopen";
  id: string;
  previousStatus: string;
  status: string;
  reason: string;
  state: {
    counts: Record<string, number>;
    current: string;
    index: number;
    total: number;
  };
};
```

DOM contracts:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-keyboard-model` | scope list | Renders one or more keyboard-model scopes. |
| `data-if-review-workflow` | boolean | Initializes roving selection, shortcut actions, counts, ledger, and events. |
| `data-if-review-workflow-source` | selector | Points at a JSON script containing a `ReviewWorkflowDocument`. |
| `data-if-review-workflow-json` | JSON string | Inline `ReviewWorkflowDocument` fallback for small embedded workflows. |
| `data-if-review-item` | string | Stable finding or review-item id. |
| `data-if-review-title` | string | Detail-panel title for the selected item. |
| `data-if-review-status` | enum | Current review state. |
| `data-if-review-action` | enum | Workflow action applied to the selected item. |
| `data-if-review-reason` | text control | Decision reason read during transitions. |
| `data-if-review-count` | key | Live count target for workflow summaries. |
| `data-if-review-ledger` | list | Receives compact audit entries for transitions. |

Events:

| Event | Detail |
| --- | --- |
| `if:review-workflow-select` | `{ id, item, state }` |
| `if:review-workflow-action` | `{ action, id, item, previousStatus, reason, state, status }` |
| `if:diff-select` | `{ change, index, item, state }` |
| `if:diff-decision` | `{ change, decision, item, state }` |

## Connector Routing Schema

Reusable connector routing is designed for architecture diagrams, lightweight dependency maps, and custom node-link surfaces where a full graph layout engine would be too heavy.

```html
<div data-if-connector-routing data-if-connector-style="orthogonal">
  <article data-if-connector-node="source">Source</article>
  <article data-if-connector-node="store">Store</article>
  <span hidden
    data-if-connector-route="source-store"
    data-if-connector-from="source"
    data-if-connector-to="store"
    data-if-connector-label="publishes"
    data-if-connector-tone="async"></span>
</div>
```

```ts
type ConnectorRoute = {
  id: string;
  from: string;
  to: string;
  label?: string;
  labelHidden?: boolean;
  style?: "direct" | "orthogonal" | "elbow" | "curved";
  tone?: "primary" | "async" | "guarded" | "success" | "danger";
  fromAnchor?: "auto" | "left" | "right" | "top" | "bottom";
  toAnchor?: "auto" | "left" | "right" | "top" | "bottom";
  avoid?: boolean;
  waypoints?: string; // "50%,45%;62%,45%" or pixel pairs, routed through the surface coordinate space.
};
```

`orthogonal` connectors route around known connector nodes by default. Set `avoid` to `false` or `data-if-connector-avoid="false"` only when a host wants a deliberate straight-through lane. Manual `waypoints` override the smart route but still preserve the generated label, tone, and export behavior.

Events:

| Event | Detail |
| --- | --- |
| `if:connector-routes` | `{ routes, surface }` after connector paths and labels are rendered. |
| `if:surface-export-request` | `{ adapter, format, filename, requestId, signal, target }` when export starts. |
| `if:surface-export-result` | `{ adapter, format, filename, requestId, result, target }` when export succeeds. |
| `if:surface-export-cancel` | `{ adapter, format, filename, requestId, reason, target }` when an export is cancelled. |
| `if:surface-export-error` | `{ adapter, format, filename, requestId, error, target }` when export fails. |
| `if:surface-export` | `{ adapter, format, filename, result, target }` legacy success event after PNG or PDF export completes. |

## Diagram Asset Slot Schema

Diagram and card nodes can use first-party glyphs or real image assets. Asset slots are intentionally data-attribute driven so an agent or server renderer can swap SVG, PNG, JPG, WebP, AVIF, GIF, blob, or data URI marks without rewriting component CSS.

```ts
type DiagramAssetSlot = {
  asset: string;       // writes data-if-asset; URL, relative path, blob URL, or data:image URI
  alt?: string;        // writes data-if-asset-alt for meaningful marks
  kind?: "svg" | "png" | "jpg" | "webp" | "avif" | "gif" | "image";
  size?: string;       // writes data-if-asset-size, e.g. "2rem" or "32px"
  width?: string;      // writes data-if-asset-width for wide marks
  height?: string;     // writes data-if-asset-height for wide marks
  fit?: "contain" | "cover" | "fill" | "scale-down" | "none";
  position?: string;   // CSS object-position value
  fallbackIcon?: string;
  export?: "auto" | "force" | "false";
};
```

Export note: same-origin, blob, and data URI assets are export-safe by default. Cross-origin images should be CORS-enabled, proxied by the host application, or marked `data-if-asset-export="false"` so the framework uses the fallback in PNG/PDF output without tainting the canvas.

## Diagram Layout Snapshot Schema

Diagram edit mode serializes layout and metadata without requiring a framework runtime beyond the vanilla behavior layer. The built-in fallback stores this shape in `sessionStorage`; production systems can post it to a database, cache, or layout service through `registerDiagramLayoutAdapter()`.

```ts
type DiagramLayoutSnapshot = {
  version: 1;
  key: string;
  updatedAt: string;
  document: DiagramDocument;
  layers: Array<{
    layer: string;
    active: boolean;
  }>;
  variables: Array<{
    property: string;
    value: string;
    unit?: string;
  }>;
  items: Array<{
    id: string;
    hidden: boolean;
    order?: number;
    x: number;
    y: number;
    fields: {
      title?: string;
      description?: string;
      status?: string;
      owner?: string;
      throughput?: string;
      dependencies?: string;
      contract?: string;
    };
  }>;
  routes?: Array<{
    id: string;
    from: string;
    to: string;
    label?: string;
    style?: ConnectorRoute["style"];
    tone?: ConnectorRoute["tone"];
    fromAnchor?: ConnectorRoute["fromAnchor"];
    toAnchor?: ConnectorRoute["toAnchor"];
    avoid?: boolean | string;
    waypoints?: string;
  }>;
};

type DiagramDocument = {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  metadata?: {
    format?: "interface-framework.diagram";
    updatedAt?: string;
    [key: string]: unknown;
  };
  nodes: Array<{
    id: string;
    title: string;
    description?: string;
    status?: string;
    owner?: string;
    throughput?: string;
    dependencies?: string;
    contract?: string;
    container?: string;
    section?: string;
    layer?: string;
    type?: string;
    layout?: string;
    background?: string;
    icon?: string;
    tone?: string;
    hidden?: boolean;
    dynamic?: boolean;
    order?: number;
    x?: number;
    y?: number;
  }>;
  edges?: DiagramLayoutSnapshot["routes"];
};

type DiagramLayoutAdapter = {
  load?: (context: { diagram: HTMLElement; key: string }) => Promise<DiagramLayoutSnapshot | null> | DiagramLayoutSnapshot | null;
  save?: (context: { diagram: HTMLElement; key: string; snapshot: DiagramLayoutSnapshot; signal?: AbortSignal }) => Promise<DiagramLayoutSnapshot | void> | DiagramLayoutSnapshot | void;
  reset?: (context: { diagram: HTMLElement; key: string }) => Promise<void> | void;
};
```

DOM contract:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-diagram-layout-key` | string | Stable storage key for the diagram snapshot. |
| `data-if-diagram-layout-adapter` | string | Adapter name registered with `registerDiagramLayoutAdapter()`. |
| `data-if-diagram-layout-autosave` | boolean | Saves after node drag or field edit when set to `true`. |
| `data-if-diagram-edit-toggle` | control | Toggles draggable/editable diagram state. |
| `data-if-diagram-edit-field` | field name | Edits selected-node metadata such as `title`, `status`, or `contract`. |
| `data-if-diagram-edit-readout` | `id`, `layer`, `x`, `y` | Displays selected-node layout metadata. |
| `data-if-diagram-route-label/style/tone` | controls | Sets new connector defaults and edits selected connector routes. |
| `data-if-diagram-route-from-anchor/to-anchor` | `auto`, `left`, `right`, `top`, `bottom` | Overrides smart endpoint anchors for the selected route. |
| `data-if-diagram-route-avoid` | checkbox | Toggles smart routing around diagram nodes. |
| `data-if-diagram-route-waypoint-x/y` | range | Writes a manual bend waypoint in percentage coordinates. |
| `data-if-diagram-route-clear-waypoint` | control | Removes the manual waypoint and restores smart routing. |
| `data-if-connector-waypoints` | string | Declarative manual connector bend points. |
| `data-if-connector-avoid` | boolean | Opts a route or surface out of node avoidance when set to `false`. |
| `data-if-connector-label-hidden` | boolean | Hides the generated connector label for simple arrow-only relationships. |
| `data-if-diagram-duplicate-node` | control | Copies the selected node's editable metadata into the same parent container and reapplies that container's node template. |
| `data-if-diagram-layout-save/load/reset` | control | Saves, loads, or restores the baseline layout. |
| `data-if-diagram-layout-status` | text slot | Displays adapter/session status. |
| `data-if-diagram-source` | textarea | Displays the live `DiagramDocument` JSON collected from the diagram. |
| `data-if-diagram-source-refresh` | control | Rebuilds the JSON source from current nodes, edges, and metadata. |
| `data-if-diagram-source-validate` | control | Parses the editor source, including fenced Markdown JSON, and reports schema validity without applying changes. |
| `data-if-diagram-source-format` | control | Parses and rewrites the source editor as pretty `DiagramDocument` JSON without applying changes. |
| `data-if-diagram-source-apply` | control | Applies edited JSON back onto the live diagram. |
| `data-if-diagram-source-copy` | control | Copies the current source text, refreshing first when the editor is empty. |
| `data-if-diagram-source-download` | control | Downloads the current source text as JSON; `data-if-diagram-source-download-name` sets the filename. |
| `data-if-diagram-source-import` | file input | Loads a selected `.json`, `.md`, or text file into the source editor for validation or apply. |
| `data-if-diagram-container` | container id | Marks a parent container that can receive new or moved nodes. |
| `data-if-diagram-container-label` | string | Human-readable label for container pickers. |
| `data-if-diagram-container-class/type/layout/background/icon` | template hints | Controls the default node class and visual treatment inherited by added or moved nodes. |
| `data-if-diagram-container-select` | select | Chooses the parent container for Add or Move actions. |
| `data-if-diagram-move-container` | control | Moves the selected node into the chosen container and clears pixel offsets. |
| `data-if-diagram-add-from-source` | control | Creates a new node from a single node JSON object in the source editor using the selected container's template. |
| `data-if-diagram-reorder` | `up`, `down` | Moves the selected node earlier or later within its current parent container. |
| `data-if-diagram-clear-selection` | control | Clears the selected node or connector route, closes the detail panel, and syncs editor controls. |
| `data-if-diagram-copy-selected` | control | Copies the selected node or connector route as formatted JSON. |
| `data-if-diagram-apply-selected` | control | Applies a single node or connector JSON object from the source editor onto the current selection. |
| `data-if-diagram-reset-selected` | control | Restores the selected baseline node or connector route without resetting the whole diagram. Session-only nodes or routes are removed. |
| `data-if-diagram-delete-selected` | control | Deletes the selected connector route or hides the selected node from the session layout. |

Events:

| Event | Detail |
| --- | --- |
| `if:diagram-select` | `{ diagram, item, summary }` |
| `if:diagram-edit-mode` | `{ active, diagram }` |
| `if:diagram-route-select` | `{ connector, diagram, routeId, surface }` |
| `if:diagram-route-edit` | `{ connector, diagram, surface }` |
| `if:diagram-node-duplicate` | `{ diagram, item, source }` |
| `if:diagram-source-node-create` | `{ diagram, item, node }` |
| `if:diagram-node-reorder` | `{ diagram, item, container, direction }` |
| `if:diagram-selected-copy` | `{ diagram, kind, data, text }` |
| `if:diagram-selected-apply` | `{ diagram, kind, data }` |
| `if:diagram-selected-reset` | `{ diagram, kind, item?, route?, removed? }` |
| `if:diagram-node-move` | `{ diagram, item, offset }` |
| `if:diagram-item-edit` | `{ diagram, item, field, value }` |
| `if:diagram-layout-apply` | `{ diagram, snapshot }` |
| `if:diagram-layout-save` | `{ diagram, snapshot }` |
| `if:diagram-layout-reset` | `{ diagram }` |
| `if:diagram-document-apply` | `{ diagram, document }` |
| `if:diagram-node-container-move` | `{ diagram, item, container }` |

## Graph Node Type Schema

Graph nodes can be rendered from server or adapter data, then delegated to the framework with `data-node-type`. Production code can register additional types without forking component CSS.

```ts
type GraphNodeTypeConfig = {
  className?: string;  // maps to .if-graph-node--{className}
  color?: string;      // writes --node-color
  icon?: string;       // writes data-if-icon on the node icon slot
  label?: string;      // human-readable type label
  data?: Record<string, string | number | boolean>;
  render?: (node: HTMLElement, context: { config: GraphNodeTypeConfig; type: string }) => void;
};

type GraphNode = {
  id: string;
  label: string;
  type: string;
  subtitle?: string;
  icon?: string;
  x?: number;
  y?: number;
  status?: string;
  confidence?: number;
  childCount?: number;
};
```

DOM contract:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-node-id` | string | Stable graph node id. |
| `data-node-type` | string | Semantic type resolved through `registerGraphNodeType` or built-in defaults. |
| `data-node-kind` | string | Alias used by adapters that already call the semantic field `kind`. |
| `data-node-label` | string | Human-readable selected/fallback label. |
| `data-node-type-label` | string | Written by the framework after type resolution for quick-peek, analytics, or accessible fallback copy. |
| `data-if-graph-node-icon` | boolean | Optional icon slot marker if a custom node template does not use `.if-graph-node__icon`. |
| `--node-color` | CSS color | Written by registered type config and consumed by node accents and icons. |
| `--x`, `--y` | percent | Node position inside the graph viewport. |

Events:

| Event | Detail |
| --- | --- |
| `if:graph-node-types` | `{ graph, applied }` after registered/default node types are applied. |

## Hierarchy Node Schema

Hierarchy rows are stricter than a visual list: parent-child structure is inferred from `data-hierarchy-parent`, and hydration upgrades any row with children into an expandable branch.

```ts
type HierarchyNodeTypeConfig = {
  className?: string;  // maps to .if-hierarchy-row--{className}
  color?: string;      // writes --hierarchy-type-color and edge color
  icon?: string;       // writes data-if-icon on an optional row icon slot
  label?: string;      // human-readable type label
  data?: Record<string, string | number | boolean>;
  render?: (row: HTMLElement, context: { config: HierarchyNodeTypeConfig; type: string }) => void;
};

type HierarchyNode = {
  id: string;
  parentId?: string;
  label: string;
  type?: string;
  state?: "branch" | "leaf" | "dead-end";
  childCount?: number;
  load?: "eager" | "lazy";
};
```

DOM contract:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-hierarchy-node` | string | Stable hierarchy node id. |
| `data-hierarchy-parent` | string | Parent node id; descendants inherit expand/collapse visibility from this chain. |
| `data-hierarchy-type` | string | Semantic type resolved through `registerHierarchyNodeType` or built-in defaults. |
| `data-hierarchy-kind` | string | Alias for adapters that call the semantic field `kind`. |
| `data-hierarchy-state` | branch, leaf, dead-end | Optional override for inferred branch/leaf state. |
| `data-hierarchy-child-count` | number | Direct descendant count; useful for lazy branches before children are rendered. |
| `data-hierarchy-load` | lazy | Emits `if:hierarchy-load` when expanded and no child rows are present. |
| `data-if-hierarchy-toggle` | boolean | Expand/collapse control; automatically inserted when a spacer row has children. |
| `.if-hierarchy-row__spacer` | class | Explicit non-action rail marker for leaves and dead ends. |

Events:

| Event | Detail |
| --- | --- |
| `if:hierarchy-structure` | `{ hierarchy, rows }` after branch/leaf/dead-end structure is inferred. |
| `if:hierarchy-node-types` | `{ hierarchy, applied }` after node type configs are applied. |
| `if:hierarchy-load` | `{ id, row }` when a lazy branch opens and needs host-provided children. |
| `if:hierarchy-dead-end` | `{ id, row }` when code attempts to expand an explicit terminal node. |

## Export Adapter Schema

Export routes are adapter-backed so the same diagram, graph, or connector surface can use the built-in PNG/PDF export or a production service that stores files, opens a review package, or queues a long-running export job.

```js
InterfaceFramework.registerExportAdapter("archive-api", async ({ target, format, filename, signal }) => {
  const response = await fetch("/api/exports", {
    method: "POST",
    body: JSON.stringify({ html: target.outerHTML, format, filename }),
    signal
  });
  if (!response.ok) throw new Error("Export service unavailable");
  return { state: "success", id: await response.text(), filename, format };
});
```

```ts
type ExportAdapterParams = {
  adapter: string;
  control: HTMLElement;
  filename: string;
  format: "png" | "pdf" | string;
  requestId: string;
  signal: AbortSignal;
  target: HTMLElement;
};

type ExportAdapterResult = {
  state?: AdapterState;
  filename?: string;
  format?: string;
  message?: string;
  blob?: Blob;
  id?: string;
};
```

Use `data-if-export-adapter="archive-api"` on an export control or target surface to route through a registered adapter. Starting a new export for the same target aborts the previous request.

## Chart Slot Schema

```html
<div
  data-if-chart="bar"
  data-if-chart-label="Issuances by type"
  data-if-chart-data="Instructions:130|Memos:84|Manuals:52">
</div>
```

Required attributes:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-chart` | enum | Chart renderer: `bar`, `line`, `pie`, `heatmap`, `grouped-bar`, `stacked-bar`, `gauge`, `bullet`, `histogram`, `funnel`, `scatter`, or `treemap`. |
| `data-if-chart-data` | string | Serialized data payload using the grammar for the selected chart type. |

Optional attributes:

| Attribute | Type | Applies to | Purpose |
| --- | --- | --- | --- |
| `data-if-chart-label` | string | all | Accessible chart label and control surface title. |
| `data-if-chart-max` | number | `bullet` | Maximum value for value and target percentages. Defaults to `100`. |
| `data-if-chart-target-value` | number | `gauge`, `bullet` | Target threshold. Gauge expects a 0-100 value. |
| `data-if-chart-x-label` | string | `scatter` | X-axis label in tooltips and axis text. |
| `data-if-chart-y-label` | string | `scatter` | Y-axis label in tooltips and axis text. |
| `--chart-height` | CSS length | all | Visual chart height, usually controlled by a range input. |

## Chart Data Grammars

### Pair Series

Used by: `bar`, `line`, `pie`, `histogram`, `funnel`, `gauge`, `bullet`, `treemap`.

Grammar:

```text
Label:Value|Label:Value|Label:Value
```

Object form:

```ts
type ChartPair = {
  label: string;
  value: number;
};
```

Examples:

```html
<div data-if-chart="line" data-if-chart-data="2020:58|2021:71|2022:64|2023:89"></div>
<div data-if-chart="funnel" data-if-chart-data="Fetched:1248|Parsed:1124|Published:348"></div>
<div data-if-chart="gauge" data-if-chart-data="Relationship Linker:86" data-if-chart-target-value="90"></div>
```

Notes:

- `gauge` reads the first pair as the displayed score.
- `bullet` reads every pair as a row and uses `data-if-chart-max` plus `data-if-chart-target-value`.
- `pie` and `treemap` calculate share from the sum of all values.

### Grouped And Stacked Series

Used by: `grouped-bar`, `stacked-bar`.

Grammar:

```text
Category:Series=Value,Series=Value|Category:Series=Value,Series=Value
```

Object form:

```ts
type ChartSeriesRow = {
  label: string;
  values: Record<string, number>;
};
```

Example:

```html
<div
  data-if-chart="stacked-bar"
  data-if-chart-data="DoD:Extracted=184,Validated=156,Blocked=18|SECNAV:Extracted=122,Validated=98,Blocked=11">
</div>
```

The framework creates series toggles automatically. Generated points include `data-if-chart-series` so interactions can mute or highlight one series at a time.

### Heatmap Rows

Used by: `heatmap`.

Grammar:

```text
Row label:Value,Value,Value;Row label:Value,Value,Value
```

Object form:

```ts
type HeatmapRow = {
  label: string;
  values: number[];
};
```

Example:

```html
<div data-if-chart="heatmap" data-if-chart-data="DoD:22,44,71,93;SECNAV:14,25,36,51"></div>
```

Rows can have different lengths, but a consistent column count reads better and produces a cleaner grid.

### Scatter Points

Used by: `scatter`.

Grammar:

```text
Label:X,Y,Size|Label:X,Y,Size
```

Object form:

```ts
type ScatterPoint = {
  label: string;
  x: number;
  y: number;
  size?: number;
};
```

Example:

```html
<div
  data-if-chart="scatter"
  data-if-chart-x-label="Risk"
  data-if-chart-y-label="Confidence"
  data-if-chart-data="DoDI 5200.01:74,91,11|Records gap:88,68,4">
</div>
```

`size` is optional and defaults to `1`.

## Chart Control Schema

Dataset switches:

```html
<button
  data-if-chart-dataset
  data-if-chart-target="#coverage-chart"
  data-if-chart-label="Finding volume"
  data-if-chart-data="Open:128|Blocked:18|Approved:142">
  Findings
</button>
```

Threshold controls:

```html
<input
  type="range"
  value="40"
  data-if-chart-threshold
  data-if-chart-target="#coverage-chart">
<strong data-if-chart-threshold-value="#coverage-chart">40</strong>
```

Height controls:

```html
<input
  type="range"
  value="13"
  data-if-chart-height
  data-if-chart-target="#coverage-chart">
<strong data-if-chart-height-value="#coverage-chart">13rem</strong>
```

Generated point attributes:

| Attribute | Purpose |
| --- | --- |
| `data-if-chart-point` | Marks an interactive point, bar, segment, cell, or row. |
| `data-if-chart-label` | Tooltip label. |
| `data-if-chart-value` | Numeric value used for tooltip and threshold filtering. |
| `data-if-chart-share` | Optional secondary tooltip line, usually percent, conversion, or target. |
| `data-if-chart-series` | Series key for grouped and stacked charts. |

## Sparkline Schema

```html
<span
  data-if-sparkline="18,22,21,29,25,34"
  data-if-sparkline-label="Source change rate"
  data-if-sparkline-output="#source-change-rate">
</span>
```

Required attribute:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-sparkline` | number list | Comma- or whitespace-delimited numeric samples. |

Optional attributes:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-sparkline-label` | string | Accessible label. |
| `data-if-sparkline-width` | number | SVG viewBox width. Defaults to `120`. |
| `data-if-sparkline-height` | number | SVG viewBox height. Defaults to `36`. |
| `data-if-sparkline-output` | selector | Receives percentage delta text. |
| `data-if-sparkline-value-output` | selector | Receives latest sample value. |
| `data-if-sparkline-sample-output` | selector | Receives sample count. |
| `data-if-sparkline-value-precision` | number | Decimal precision for latest value output. |

Streaming attributes:

| Attribute | Type | Purpose |
| --- | --- | --- |
| `data-if-sparkline-stream="true"` | boolean | Starts a demo stream on hydration. |
| `data-if-sparkline-interval` | number | Tick interval in milliseconds. Minimum is `500`. |
| `data-if-sparkline-volatility` | number | Synthetic wave amplitude. |
| `data-if-sparkline-drift` | number | Synthetic directional drift per tick. |
| `data-if-sparkline-min` | number | Lower clamp for generated samples. |
| `data-if-sparkline-max` | number | Upper clamp for generated samples. |
| `data-if-sparkline-max-points` | number | Number of samples to retain. Defaults to initial sample count. |

Controls:

```html
<button data-if-sparkline-toggle="#source-trend">Pause stream</button>
<button data-if-sparkline-step="#source-trend">Add sample</button>
<button data-if-sparkline-reset="#source-trend">Reset</button>
```

## Data Table Adapter Schema

Server-backed tables use a function adapter so the same table markup can hydrate from local rows or remote data.

```js
InterfaceFramework.registerDataTableAdapter("policy-records", async (params) => {
  const response = await fetch("/api/policies", { signal: params.signal });
  return response.json();
});
```

Adapter params:

```ts
type DataTableAdapterParams = {
  filters: Record<string, string[]>;
  page: number;
  pageSize: number;
  query: string;
  requestId: string;
  signal: AbortSignal;
  sort: null | {
    key: string;
    direction: "ascending" | "descending";
  };
  table: HTMLElement;
};
```

Adapter result:

```ts
type DataTableAdapterResult = {
  rows?: PolicyRecordRow[];
  rowsHtml?: string;
  total?: number;
  filtered?: number;
  page?: number;
  pageSize?: number;
  state?: AdapterState;
  message?: string;
};
```

`rowsHtml` lets a server return fully rendered table rows. If `rows` is used, the default demo renderer expects policy-record-like objects with fields such as `title`, `subtitle`, `type`, `authority`, `updatedLabel`, `confidence`, `confidenceScore`, `risk`, `status`, `icon`, and `links`.

Events: `if:table-request`, `if:table-results`, `if:table-cancel`, `if:table-error`, and the shared `if:adapter-state`. New requests abort older requests for the same table.

## Graph Layout Adapter Schema

Graph layout adapters let production systems plug in a layout engine without replacing the framework's graph controls, traversal, edge inspection, minimap, pan/zoom, and accessible fallback index.

```js
InterfaceFramework.registerGraphLayoutEngine("policy-layout", async (params) => {
  const response = await fetch("/api/graph/layout", {
    method: "POST",
    body: JSON.stringify({ nodes: params.nodes, edges: params.edges, options: params.options }),
    signal: params.signal
  });
  return response.json();
});
```

Adapter params:

```ts
type GraphLayoutAdapterParams = {
  canvas: HTMLElement | null;
  edges: GraphLayoutEdge[];
  engine: string;
  graph: HTMLElement;
  layout: string;
  nodes: GraphLayoutNode[];
  options: {
    direction: "directed" | "none" | "bidirectional";
    edgeStyle: "routed" | "direct" | "subtle" | "emphasis";
    labelDensity: "full" | "compact" | "minimal";
    nodeDensity: "comfortable" | "compact" | "expanded";
    orientation: "standard" | "top-down" | "right-left" | "bottom-up";
    spacing: number;
  };
  requestId: string;
  signal: AbortSignal;
};

type GraphLayoutNode = {
  id: string;
  label: string;
  kind: string;
  relation?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hidden: boolean;
};

type GraphLayoutEdge = {
  from: string;
  to: string;
  type: string;
  label: string;
  confidence?: string;
  cluster?: string;
  inferred: boolean;
  hidden: boolean;
};
```

Adapter result:

```ts
type GraphLayoutAdapterResult = {
  coordinateSpace?: "percent" | "pixel" | "unit";
  nodes: Array<{ id: string; x: number; y: number }> | Record<string, { x: number; y: number } | [number, number]>;
  state?: AdapterState;
  message?: string;
  view?: {
    panX?: number;
    panY?: number;
    zoom?: number;
  };
};
```

Starting a new layout request aborts the previous request for the same graph. Listen for `if:graph-layout-request`, `if:graph-layout-cancel`, `if:graph-layout-apply`, `if:graph-layout-result`, `if:graph-layout-error`, and the shared `if:adapter-state` when production code needs telemetry or persistence.

## Annotation Toolbar State

Annotation toolbars expose the selected semantic mark independent of a document parser. The framework exposes `InterfaceFramework.getAnnotationToolbarState(toolbar)` and includes the same normalized state in `if:annotation-tool-change`.

```ts
interface AnnotationToolbarTool {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  active: boolean;
  disabled: boolean;
  pressed: boolean;
}

interface AnnotationToolbarState {
  tool: string;
  label: string;
  shortLabel: string;
  description: string;
  preview: {
    label: string;
    text: string;
    className: string;
  };
  tools: AnnotationToolbarTool[];
}
```

| DOM contract | Purpose |
| --- | --- |
| `data-if-annotation-toolbar` | Toolbar root and event target. |
| `data-if-annotation-current` | Active tool id on the toolbar, or a mirrored status slot inside the scope. |
| `data-if-annotation-tool` | Tool id such as `claim`, `reference`, `organization`, `evidence`, `implementation`, or `enablement`. |
| `data-if-annotation-label` | Full label for status and event detail, or preview label slot when nested in the preview. |
| `data-if-annotation-short` | Compact visible badge text such as CLM or REF. |
| `data-if-annotation-description` | Tool-specific guidance or status slot. |
| `data-if-annotation-count` | Optional slot for the number of tools in the toolbar. |
| `data-if-annotation-preview` | Preview surface that receives `if-annotation-preview--{tool}` and `data-if-annotation-current`. |

| Event | Detail |
| --- | --- |
| `if:annotation-tool-change` | `{ toolbar, control, tool, label, state }` |

## Document Annotation Schema

Document annotations represent parser output in reconstituted text and can be mapped to claim, organization, reference, obligation, and relationship panels. The framework exposes `InterfaceFramework.getDocumentAnnotationSchema(mark)` and includes the schema in `if:doc-annotation-select` and `if:doc-annotation-panel` events.

```ts
type DocumentAnnotationSchema = {
  artifactId: string;
  confidence: string;
  expansion: string;
  id: string;
  line: number | null;
  lineId: string;
  lineText: string;
  range: string;
  source: string;
  text: string;
  type: "org" | "claim" | "reference" | string;
  value: string;
};

type DocumentViewerState = {
  activeFilter: string;
  annotationCount: number;
  artifactId: string;
  highlights: Record<string, boolean>;
  lineCount: number;
  mode: "reconstituted" | "embedded" | "split" | "metadata" | string;
  query: string;
  queryMatches: number;
  selectedAnnotation: DocumentAnnotationSchema | null;
  visibleCount: number;
};

type DocumentWorkspaceState = {
  artifactCount: number;
  sourceCount: number;
  selectedArtifact: string;
  selectedSource: string;
  artifacts: Array<{
    id: string;
    title: string;
    mode: string;
    hidden: boolean;
    selected: boolean;
  }>;
};
```

Production parser output should be normalized before hydrating the viewer. The complete production handoff contract lives in `docs/document-intelligence-production-path.md`, but downstream adapters should expect these top-level records:

```ts
type DocumentParserOutput = {
  documentId: string;
  parserRunId: string;
  parserVersion: string;
  extractedAt: string;
  sections: unknown[];
  annotations: DocumentAnnotationSchema[];
  references: unknown[];
  relationships: unknown[];
  claims: unknown[];
  obligations: unknown[];
  organizations: unknown[];
  confidence: number;
  provenance: unknown[];
};

type DocumentReviewFinding = {
  id: string;
  documentId: string;
  annotationIds: string[];
  findingType: "claim" | "obligation" | "gap" | "reference" | "organization" | string;
  status: "open" | "in-review" | "approved" | "rejected" | "blocked" | string;
};
```

Recommended DOM attributes:

| Attribute | Purpose |
| --- | --- |
| `data-if-doc-annotation` | Annotation type such as `org`, `claim`, or `reference`. |
| `data-if-doc-annotation-value` | Canonical extracted value. |
| `data-if-doc-annotation-id` | Stable parser/entity id. |
| `data-if-doc-annotation-confidence` | Confidence score or label. |
| `data-if-doc-annotation-range` | Character, token, or source-span reference. |
| `data-if-doc-annotation-source` | Parser, model, source page, or extraction job reference. |
| `data-if-doc-match-count` | Visible-line count slot. |
| `data-if-doc-visible-count` | Visible-line count slot for dashboards or compact bars. |
| `data-if-doc-query-count` | Query-hit count slot. |
| `data-if-doc-total-count` | Total line-count slot. |
| `data-if-doc-active-filter` | Human-readable active filter slot. |

Events:

| Event | Detail |
| --- | --- |
| `if:doc-annotation-select` | `{ type, value, annotation, annotations, mark, target, matches, state }` |
| `if:doc-annotation-panel` | `{ type, value, expansion, annotation, annotations, mark, target, matches, state }` |
| `if:doc-artifact-select` | `{ artifact, artifactId, source, state }` |
| `if:doc-search` | `{ query, filter, state, viewer }` |
| `if:doc-filter-change` | `{ filter, control, state }` |
| `if:doc-highlight-change` | `{ highlight, checked, control, state }` |
| `if:doc-search-clear` | `{ artifact, control, state }` |
| `if:doc-jump` | `{ control, line, query, state }` |

## Performance Run Result Schema

The performance scale lab emits a compact smoke-test payload after each synthetic run. Treat this as a release-quality signal for UI containment and responsiveness, not as a replacement for browser performance profiling.

```ts
type PerformanceRunResult = {
  profileKey: "mobile" | "balanced" | "large" | string;
  profile: {
    label: string;
    tableRows: number;
    graphNodes: number;
    graphEdges: number;
    diagramNodes: number;
    docLines: number;
    chartPoints: number;
    budgets: Record<"table" | "graph" | "diagram" | "document" | "charts" | "total", number>;
  };
  sections: Record<"table" | "graph" | "diagram" | "document" | "charts", {
    count: number;
    ms: number;
  }>;
  overflow: {
    checked: number;
    contained: number;
    failures: Array<{
      axis: "x" | "y" | "both";
      scrollWidth: number;
      clientWidth: number;
      scrollHeight: number;
      clientHeight: number;
    }>;
    passed: boolean;
  };
  totalMs: number;
  state: "passed" | "warning" | "failed";
};
```

Listen for `if:performance-run` or call `InterfaceFramework.runPerformanceLab(root, "large")` directly in browser smoke tests. Use `data-if-overflow-mode="scroll"` to mark intentionally scrollable internal regions so the overflow report catches only uncontained component/page overflow.

## Serialization Helpers

Recommended adapter-side helpers:

```js
function pairsToChartData(rows) {
  return rows.map(({ label, value }) => `${label}:${Number(value)}`).join("|");
}

function seriesToChartData(rows) {
  return rows
    .map(({ label, values }) => `${label}:${Object.entries(values).map(([key, value]) => `${key}=${Number(value)}`).join(",")}`)
    .join("|");
}

function heatmapToChartData(rows) {
  return rows.map(({ label, values }) => `${label}:${values.map(Number).join(",")}`).join(";");
}

function scatterToChartData(points) {
  return points.map(({ label, x, y, size = 1 }) => `${label}:${Number(x)},${Number(y)},${Number(size)}`).join("|");
}
```

Set `element.dataset.ifChartData = pairsToChartData(rows)` and call `InterfaceFramework.hydrateCharts(element)` after replacing data.
