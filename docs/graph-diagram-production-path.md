# Graph And Diagram Production Path

Status: frozen-for-v0.1-graph-diagram-handoff.

This document is the production upgrade contract for the framework's graph explorer and architecture diagram primitives. It turns the current examples, recipes, schema notes, event catalog, accessibility guidance, and JavaScript APIs into one handoff path a downstream agent can follow without depending on page-only behavior.

## Scope Boundary

| In scope | Out of scope for v0.1 |
| --- | --- |
| Graph and diagram contracts, data shapes, adapter expectations, events, and accessibility fallbacks. | Building the production Policy MVP graph service. |
| Stable framework hooks for node typing, layout adapters, traversal, connector routing, search, detail focus, export, and session persistence. | Choosing a single production graph layout library for every downstream app. |
| Explicit stability boundaries for built-in demos versus production adapters. | Real authorization, persistence, audit, or collaborative editing infrastructure. |

Use this file with `docs/component-api.md`, `docs/data-schemas.md`, `docs/event-catalog.md`, `docs/recipes.md`, `docs/accessibility.md`, and `docs/diagram-component-requirements.md`.

## Source Of Truth Map

| Contract area | Primary artifact | Supporting artifacts |
| --- | --- | --- |
| Public classes, attributes, and APIs | `docs/component-api.md` | `docs/usage.md`, `examples/graph-view.html`, `examples/diagrams.html`, `examples/diagrams2.html` |
| Graph and diagram data schemas | `docs/data-schemas.md` | `docs/adapter-fixture-contracts.md`, `docs/route-component-map.md` |
| Events and adapter telemetry | `docs/event-catalog.md` | `docs/component-api.md`, `src/js/index.js` |
| Accessibility fallback | `docs/accessibility.md` | `docs/keyboard.md`, `tests/playwright/a11y.spec.mjs` |
| Diagram-specific requirements | `docs/diagram-component-requirements.md` | `scripts/diagram-component-tests.mjs`, `tests/playwright/component-contracts.spec.mjs` |
| Production readiness evidence | `docs/github-shipping-work-items.md` | `docs/release-checklist.md`, `docs/mvp-acceptance-checklist.md` |

## Graph Production Contract

### Node Type Delegation

Production graph data should not hard-code framework CSS classes in service payloads. Instead, normalize each node into a semantic type and let the framework resolve styling through `registerGraphNodeType`, `applyGraphNodeType`, and `applyGraphNodeTypes`.

Minimum graph node shape:

```ts
type GraphProductionNode = {
  id: string;
  type: "law" | "policy" | "source" | "organization" | "obligation" | "evidence" | "event" | "gap" | string;
  title: string;
  subtitle?: string;
  icon?: string;
  status?: "active" | "review" | "blocked" | "complete" | "partial" | string;
  confidence?: number;
  badge?: string;
  children?: GraphProductionNode[];
  hiddenChildren?: number;
  metadata?: Record<string, string | number | boolean | null>;
  actions?: Array<{ id: string; label: string; event?: string }>;
};
```

Rules:

- Use `data-node-id` as the stable join key for nodes, edges, detail panels, fallback rows, and service updates.
- Use `data-node-type` or `data-node-kind` for type delegation.
- Use `data-if-graph-child-count` and `hiddenChildren` when a node owns collapsed related children.
- Collapsed neighborhoods must belong to the owner node. Do not create separate "cluster branch" controls as a second node model.
- A node can expose hidden children, but child expansion should still produce normal graph nodes and normal graph edges.

### Edge And Relationship Schema

Graph relationships should be first-class data records, not labels painted onto unrelated lines.

```ts
type GraphProductionEdge = {
  id: string;
  source: string;
  target: string;
  type: "derived-from" | "references" | "implements" | "guides" | "has-obligation" | "enables" | "evidence" | "conflicts-with" | string;
  label?: string;
  directed?: boolean;
  inferred?: boolean;
  confidence?: number;
  status?: "active" | "review" | "blocked" | "hidden" | string;
  metadata?: Record<string, string | number | boolean | null>;
};
```

Rules:

- Relationship filters operate on `type`.
- Edge selection emits the graph edge event contract from `docs/event-catalog.md`.
- Direct-edge labels should be integrated with their connector treatment so the label and line read as one relationship primitive.
- Edges without visible labels still need a connector primitive and an accessible name.

### Layout Engine Adapter

Built-in graph layouts are scaffolding. Production graphs should integrate a layout engine through `registerGraphLayoutEngine`, `runGraphLayoutEngine`, `collectGraphLayoutInput`, and `applyGraphLayoutResult`.

```ts
type GraphLayoutRequest = {
  graph: HTMLElement;
  canvas: HTMLElement | null;
  nodes: GraphProductionNode[];
  edges: GraphProductionEdge[];
  layout: "radial" | "authority" | "impact" | "hierarchy" | string;
  options: {
    orientation: "standard" | "top-down" | "right-left" | "bottom-up";
    spacing: number;
    labelDensity: "full" | "compact" | "minimal";
    nodeDensity: "comfortable" | "compact" | "expanded";
    edgeStyle: "direct" | "routed" | "subtle" | "emphasis";
    direction: "directed" | "none" | "bidirectional";
    depth?: number;
    filters?: Record<string, boolean>;
    viewport?: { panX: number; panY: number; zoom: number };
  };
  requestId: string;
  signal: AbortSignal;
};

type GraphLayoutResult = {
  state?: "success" | "empty" | "error" | "cancelled";
  coordinateSpace?: "percent" | "pixel" | "unit";
  nodes: Array<{ id: string; x: number; y: number; width?: number; height?: number }>;
  edges?: Array<{ id: string; source: string; target: string; waypoints?: Array<{ x: number; y: number }> }>;
  hiddenCounts?: Record<string, number>;
  a11yIndex?: { nodes: string[]; edges: string[] };
  view?: { panX?: number; panY?: number; zoom?: number };
  message?: string;
};
```

Adapter requirements:

- Accept an `AbortSignal` and cancel stale layout work.
- Return empty/error/cancelled states through the shared adapter lifecycle.
- Preserve node ids exactly.
- Treat pan, zoom, node drag, and selected node as host state that can survive layout refreshes.
- Return route hints only when useful; the framework remains responsible for keyboard focus, node selection, and accessible fallback.

### Traversal, Expansion, And Focus

The production graph interaction model is unified:

- Click a node to inspect/select it.
- Click empty graph space to reset focus to the seed context.
- Drag a node to refine arrangement.
- Drag empty canvas space to pan.
- Use viewport controls for zoom in, zoom out, fit, and reset.
- Use relationship controls to filter visible edge types.
- Use `traceGraphFrom`, `traverseGraph`, and `toggleGraphCluster` to expand from a node by relationship type and depth.

Expansion rules:

- Hidden children are represented on their owner node through a count or compact badge.
- Expanding a node creates normal child nodes and edges.
- Collapsing a node hides those descendants without deleting source data.
- Serial traversal such as law -> executive order -> instruction -> service issuance -> implementation package must not force every node around one nucleus.

### Accessible Fallback

Every production graph needs an accessible fallback. Use `data-if-graph-a11y`, `data-if-graph-a11y-summary`, `data-if-graph-a11y-nodes`, `data-if-graph-a11y-edges`, and `updateGraphA11yFallback`.

Fallback rules:

- Nodes and edges must be reachable as lists.
- Spatial layout cannot be the only way to understand relationships.
- Edge labels, direction, inferred state, confidence, and hidden child counts must be represented in text.
- Escape clears focus, and click-off reset has a keyboard equivalent.

### Stable For v0.1

- `registerGraphNodeType`, `applyGraphNodeTypes`, and node type metadata.
- `registerGraphLayoutEngine`, `runGraphLayoutEngine`, `collectGraphLayoutInput`, and `applyGraphLayoutResult`.
- Node selection, edge selection, traversal events, relationship filters, zoom/pan controls, node dragging, and click-off reset.
- Collapsed child counts on owner nodes.
- Graph accessible fallback index.

### Experimental For v0.1

- Perfect edge deconfliction for very dense graphs.
- Large-scale force simulation inside the framework bundle.
- Cross-route persisted graph view state.
- Domain-specific graph query language.
- Production permission checks for traversal depth.

## Diagram Production Contract

### Diagram Node Types, Groups, And Assets

Diagram nodes should be schema-driven and type-delegated through `registerDiagramNodeType`, `applyDiagramNodeType`, and `applyDiagramNodeTypes`.

Minimum diagram node shape:

```ts
type DiagramProductionNode = {
  id: string;
  title: string;
  type: "service" | "agent" | "storage" | "workflow" | "boundary" | "actor" | "output" | string;
  group?: string;
  region?: string;
  layout?: "tile" | "compact" | "media" | "callout" | "metric" | string;
  background?: "surface" | "tint" | "outline" | "muted" | string;
  icon?: string;
  asset?: {
    src: string;
    alt: string;
    fit?: "contain" | "cover" | "scale-down";
    export?: boolean;
    fallbackIcon?: string;
  };
  x?: number;
  y?: number;
  metadata?: Record<string, string | number | boolean | null>;
};
```

Rules:

- Use regions for large semantic areas such as workflow bands, storage layers, security boundaries, and outcome rails.
- Use groups for hide/show, editing scope, and route ownership.
- Use `.if-asset-slot[data-if-asset]` for PNG, JPG, SVG, WebP, AVIF, GIF, blob, or data URI marks.
- Assets need alt text, sizing, fit, fallback icon, and export policy.

### Connector Routing

Diagram connectors should use the shared connector routing API rather than raw arrows.

```ts
type DiagramConnectorRoute = {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: "data-flow" | "control-flow" | "optional" | "guarded" | string;
  direction?: "directed" | "none" | "bidirectional";
  style?: "direct" | "orthogonal" | "elbow" | "curved";
  tone?: "primary" | "async" | "guarded" | "success" | "danger" | string;
  fromAnchor?: "auto" | "left" | "right" | "top" | "bottom";
  toAnchor?: "auto" | "left" | "right" | "top" | "bottom";
  waypoints?: Array<{ x: number; y: number }>;
  avoidNodes?: boolean;
};
```

Rules:

- Use `data-if-connector-routing`, `data-if-connector-node`, and `data-if-connector-route`.
- Default routing should avoid nodes as best as possible.
- Manual waypoints are allowed when the automatic route is not good enough.
- Labels are selectable connector entities and must not be the only source of meaning.
- Route edits use `setDiagramConnectorRoute` and `updateSelectedDiagramRoute`.

### Search, Highlight, And Detail Focus

Diagram search is optional but production-ready when used:

- Use `data-if-diagram-search` to search visible node text and metadata.
- Matching nodes receive search state classes and inline match highlights.
- Search result buttons select nodes through the same selection contract as direct node clicks.
- Click-off and Escape clear detail focus.
- Detail panels must include close controls and live status text.

### Edit Mode Boundaries

Built-in diagram edit mode is a framework authoring surface, not a production CMS.

Stable edit primitives:

- Inspect
- Text
- Move
- Connect
- Style
- Add
- Delete
- Duplicate
- Reorder
- Undo delete
- Copy/apply/reset selected node or route
- Save/load/reset layout snapshot

Host responsibilities:

- Permissions and audit.
- Multi-user conflict handling.
- Server persistence.
- Schema migration.
- Approval workflow for destructive edits.

### Export Adapter

Diagram and graph exports use the shared export adapter contract. Production apps can keep the built-in PNG/PDF export or register an export adapter that creates a file server-side.

Rules:

- Use `data-if-export`, `data-if-export-format`, `data-if-export-adapter`, and the export events from `docs/event-catalog.md`.
- Export starts with a request id and `AbortSignal`.
- Export surfaces should include visible status text for loading, success, error, empty, and cancelled states.
- Cross-origin image assets must be marked with `data-if-asset-export="false"` unless the server provides CORS-safe assets.

### Storage Adapter

The built-in diagram edit fallback stores `DiagramLayoutSnapshot` in `sessionStorage`. Production systems should register a storage adapter through `registerDiagramLayoutAdapter`.

Adapter rules:

- `load`, `save`, and `reset` must accept the diagram, key, snapshot, and `AbortSignal` where applicable.
- Empty, loading, error, cancelled, retry, and success states must follow the shared adapter contract.
- The snapshot must remain diffable for reviews and migrations.
- Production storage may be a database, cache, object store, or post-back endpoint.

### Stable For v0.1

- Diagram item selection and detail focus.
- `data-if-diagram-search` search/highlight behavior.
- `registerDiagramNodeType` and typed node defaults.
- Region/group visibility toggles.
- Connector routing primitives and route selection.
- Session layout save/load/reset.
- Export request/result/error events and adapter path.

### Experimental For v0.1

- Collaborative editing.
- Full visual authoring parity with dedicated diagram products.
- Automatic collision-free layout for arbitrary imported diagrams.
- Diff/merge conflict handling for diagram snapshots.
- Production-grade route optimization for hundreds of connectors.

## Downstream Agent Checklist

Before building a production graph or diagram route:

1. Choose `graph-explorer` or `architecture-diagram` from `docs/component-manifest.json`.
2. Normalize service payloads to the graph or diagram schemas in `docs/data-schemas.md`.
3. Register domain node types before rendering.
4. Register graph layout, diagram layout, export, search, or persistence adapters only when the built-in fallback is insufficient.
5. Wire events from `docs/event-catalog.md`.
6. Add accessible fallback content for graph and diagram surfaces.
7. Use examples as composition references only; do not copy synthetic data as canonical domain data.
8. Keep production implementation outside this framework repo unless the behavior is reusable framework infrastructure.

## Definition Of Done

FW-011 is complete when:

- This document declares `frozen-for-v0.1-graph-diagram-handoff`.
- `docs/github-shipping-work-items.md` records status evidence for FW-011.
- `docs/release-checklist.md`, `docs/package-handoff.md`, `docs/agent-handoff.md`, `docs/next-steps.md`, and `docs/mvp-acceptance-checklist.md` reference this production path.
- `scripts/validate.mjs` verifies the graph and diagram production path, source-of-truth docs, public APIs, data schemas, events, examples, and package export.
