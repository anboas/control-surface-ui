# Diagram Component Production Requirements

The diagram component is a first-class framework surface, not a one-off demo. It must support architecture maps, research workflows, data-flow diagrams, policy authority chains, system dependency maps, and exportable briefing artifacts from a stable data contract.

## Definition Of Finished

A downstream agent can build a new diagram by providing a schema, selecting framework-provided node and edge types, wiring optional adapters, and relying on documented keyboard, editing, search, export, persistence, and accessibility behavior without reverse-engineering the demo markup.

## P0 Requirements

| ID | Requirement | Test Contract |
| --- | --- | --- |
| R-DIAG-001 | Schema-first rendering | `validateDiagramSchema`, `normalizeDiagramSchema`, and `renderDiagramSchema` accept a stable schema with nodes, edges, groups, regions, metadata, and layout hints. |
| R-DIAG-002 | Node type delegation | `registerDiagramNodeType` lets products define type defaults for icon, layout, tone, background, and CSS class. |
| R-DIAG-003 | Edge routing API | Connectors support direct, elbow, curved, and orthogonal routes, labels, tones, anchors, waypoints, deletion, and route updates. |
| R-DIAG-004 | Mode-scoped editor | Inspect, text, move, connect, style, add, and delete modes expose only relevant controls. |
| R-DIAG-005 | In-session persistence | Layout snapshots preserve nodes, edges, offsets, fields, layer state, variables, and dynamic additions. |
| R-DIAG-006 | Adapter persistence | `registerDiagramLayoutAdapter` supports save, load, reset, success, empty, loading, error, cancellation, and retry states through the shared adapter contract. |
| R-DIAG-007 | Search and highlighting | `data-if-diagram-search` filters/focuses nodes, highlights matching text, and exposes status/results. |
| R-DIAG-008 | Export | PNG and PDF exports route through the shared export adapter and emit request/result/error/cancel events. |
| R-DIAG-009 | Accessibility | Nodes and routes are keyboard selectable, Escape clears focus, labels are announced, and hidden layers are skipped in navigation. |
| R-DIAG-010 | Overflow safety | Diagram nodes must preserve readable text at desktop and mobile breakpoints; nested node groups cannot collapse into single-character columns. |

## P1 Requirements

| ID | Requirement | Test Contract |
| --- | --- | --- |
| R-DIAG-011 | Region and group visibility | Regions and groups can be toggled without mutating source data. |
| R-DIAG-012 | Embedded assets | Nodes can render framework icons or external PNG/JPG/SVG assets with fit, size, fallback, and alt handling. |
| R-DIAG-013 | Edit tools | Edit mode supports inspect, text, move, connect, style, add, delete, undo delete, and keyboard nudging. |
| R-DIAG-014 | Connector collision avoidance | Orthogonal routing can navigate around node bounds and accept explicit waypoints when the default route is poor. |
| R-DIAG-015 | Agentic ergonomics | Requirements, schema docs, API tables, recipe examples, and tests are discoverable from package metadata. |

## P2 Requirements

| ID | Requirement | Test Contract |
| --- | --- | --- |
| R-DIAG-016 | Layout engine adapter | Optional layout engines can transform schema nodes and return positions/routes without becoming framework dependencies. |
| R-DIAG-017 | Collaborative editing hooks | Products can intercept save/load/reset and node/route mutations to persist to a server. |
| R-DIAG-018 | Diffable diagram snapshots | Layout snapshots are stable enough to review and version control. |

## TDD Path To Completion

1. Contract tests define the schema, editor, connector, search, export, accessibility, and overflow requirements.
2. Unit-like source tests check public APIs and required behavior hooks.
3. Browser contract tests exercise click, keyboard, search, edit-mode, and export paths.
4. Visual regression snapshots cover light, dark, high contrast, desktop, and mobile diagrams.
5. Performance tests stress large schemas and verify overflow budgets.

## Diagram Schema Shape

```json
{
  "schemaVersion": 1,
  "id": "research-intelligence-platform",
  "title": "Research Intelligence Platform",
  "regions": [{ "id": "fabric", "title": "AI-Powered Fabric", "tone": "primary" }],
  "groups": [{ "id": "storage", "title": "Storage Layer", "region": "fabric" }],
  "nodes": [
    {
      "id": "document-intelligence",
      "title": "Document Intelligence",
      "description": "Layout, OCR, tables, figures, sections.",
      "type": "service",
      "layout": "tile",
      "background": "surface",
      "icon": "artifact",
      "group": "storage",
      "region": "fabric",
      "x": 30,
      "y": 70
    }
  ],
  "edges": [
    {
      "id": "document-to-extraction",
      "from": "document-intelligence",
      "to": "extraction-normalization",
      "label": "Parsed text",
      "style": "orthogonal",
      "tone": "success",
      "fromAnchor": "right",
      "toAnchor": "left"
    }
  ]
}
```

## Current Gap Diagnosis

The `diagrams2` page is visually dense and hand-authored, while the editor is trying to behave like a data-driven diagram authoring surface. Until the schema contract becomes the source of truth for nodes, routes, groups, regions, and edit capabilities, each improvement will feel local and brittle. The next passes should prioritize schema rendering, route editing, browser-level edit tests, and visual regression over additional static markup polish.
