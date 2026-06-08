# Adapter Fixture Contracts

These fixtures define production-shaped mock data for the first Policy Intelligence MVP adapters. They are not canonical policy facts; they are contract fixtures that let agents wire routes, tests, and demos before services exist.

Use these with `docs/mvp-route-contracts.md`, `docs/route-component-map.md`, `docs/data-schemas.md`, and `docs/event-catalog.md`.

## MVP Planning Freeze Coverage

Status: frozen-for-v0.1-planning-handoff.

This document is the adapter source of truth for the planning handoff. It names the mock and production-shaped adapter boundaries that downstream route work should register against, while keeping real service integration out of scope for this repository.

Freeze cross-check:

- Adapter ownership covers Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model.
- Adapter families cover tables, autocomplete, graph layout, graph traversal, document annotations, source registry, search, review queues, exports, diagrams, workspace preferences, and data-model catalogs.
- Every adapter path must expose `success`, `empty`, `loading`, `error`, and `cancelled` states before production service wiring begins.
- Fixtures must remain serializable, abortable, stateful, and free of route-specific HTML unless explicitly documented as server-rendered rows.

## Shared Adapter Envelope

Every adapter fixture should be serializable, abortable, and stateful.

```ts
type AdapterState = "idle" | "loading" | "success" | "empty" | "error" | "cancelled";

type AdapterFixtureEnvelope<TRequest, TResult> = {
  adapter: string;
  fixtureVersion: "0.1";
  request: TRequest & {
    requestId: string;
    route: "overview" | "graph" | "documents" | "review" | "sources" | "search" | "workspace" | "diagrams" | "data-model";
  };
  result: TResult & {
    state: AdapterState;
    message?: string;
    generatedAt: string;
  };
  telemetry?: {
    elapsedMs?: number;
    source?: "mock" | "service" | "cache";
    traceId?: string;
  };
};
```

Adapter implementation rules:

- Accept an `AbortSignal` and stop work when it is aborted.
- Prefer `InterfaceFramework.runAdapterTask(target, adapter, context, { channel })` for new adapter families that do not already have a specialized registry. It supplies `signal`, `requestId`, generic `if:adapter-*` telemetry, channel-scoped telemetry, normalized states, and stale-request cancellation.
- Use `InterfaceFramework.cancelAdapterTask(target, channel, reason)` for explicit cancel controls and `InterfaceFramework.getAdapterTaskState(target, channel)` for status rails.
- Return `{ state: "empty" }` for successful no-result responses.
- Return `{ state: "cancelled" }` only when cancellation is intentional and observable.
- Throw or return `{ state: "error" }` only for service, authorization, validation, or parsing failures.
- Include stable ids for rows, suggestions, nodes, annotations, and export jobs.
- Keep display labels plain text; do not send HTML in labels, snippets, or descriptions.

## Tables

Used by: Overview, Sources, Review, Search, Data Model.

Expected framework APIs: `registerDataTableAdapter`, `refreshDataTable`, `setDataTableData`, `setAdapterState`.

Expected events: `if:table-request`, `if:table-results`, `if:table-cancel`, `if:table-error`, `if:adapter-state`.

Request fixture:

```json
{
  "adapter": "policyRecordsTable",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "tbl-001",
    "route": "overview",
    "page": 1,
    "pageSize": 25,
    "sort": { "field": "updated", "direction": "desc" },
    "query": "cloud",
    "filters": {
      "authority": ["DoD", "SECNAV"],
      "confidence": ["high", "medium"],
      "reviewState": ["in-review"]
    }
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "total": 246,
    "filtered": 18,
    "page": 1,
    "pageSize": 25,
    "rows": [
      {
        "id": "pol-dodi-5200-01",
        "title": "DoDI 5200.01 Information Governance",
        "subtitle": "Information handling, governance, and evidence relationships",
        "type": "Instruction",
        "authority": "DoD",
        "source": "DoD Issuances",
        "updated": "2025-05-01",
        "updatedLabel": "May 1, 2025",
        "confidence": "High",
        "confidenceScore": 0.86,
        "risk": "Medium",
        "status": "In Review",
        "links": { "events": 5, "opportunities": 3, "obligations": 12 },
        "selected": true
      }
    ]
  }
}
```

Production response may use `rowsHtml` instead of `rows` when a server owns row rendering. If `rowsHtml` is used, the host still owns selection ids, total counts, and state.

Empty fixture:

```json
{
  "adapter": "policyRecordsTable",
  "fixtureVersion": "0.1",
  "request": { "requestId": "tbl-empty", "route": "overview", "page": 1, "pageSize": 25, "query": "zzzz" },
  "result": {
    "state": "empty",
    "generatedAt": "2026-05-26T12:00:00Z",
    "total": 0,
    "filtered": 0,
    "rows": [],
    "message": "No policy records match the current filters."
  }
}
```

## Autocomplete

Used by: global topbar search, Overview, Graph, Documents, Review assignee lookup, Search, Sources, Data Model.

Expected framework APIs: `registerAutocompleteAdapter`, `unregisterAutocompleteAdapter`, `setAdapterState`.

Expected events: `if:autocomplete-request`, `if:autocomplete-results`, `if:autocomplete-cancel`, `if:autocomplete-error`, `if:autocomplete-select`, `if:adapter-state`.

Request/result fixture:

```json
{
  "adapter": "globalAutocomplete",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "ac-001",
    "route": "overview",
    "query": "dodi 5200",
    "limit": 6,
    "scope": ["policy", "source", "organization", "document"]
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "items": [
      {
        "id": "pol-dodi-5200-01",
        "type": "policy",
        "label": "DoDI 5200.01 Information Governance",
        "value": "DoDI 5200.01",
        "meta": "Policy / DoD Issuances / High confidence",
        "route": "/graph?node=pol-dodi-5200-01",
        "matchedRanges": [{ "field": "label", "start": 0, "end": 11 }]
      },
      {
        "id": "doc-dodi-5025-01",
        "type": "document",
        "label": "DoDI 5025.01 Directives Program",
        "value": "DoDI 5025.01",
        "meta": "Referenced document",
        "route": "/documents?artifact=doc-dodi-5025-01"
      }
    ]
  }
}
```

Autocomplete item rules:

- `label` is what the user sees.
- `value` is what may be written into the input.
- `type` controls grouping and iconography.
- `route` is optional; use it when a suggestion should navigate.
- `matchedRanges` are optional; the framework can also highlight based on query text.

## Graph Layout

Used by: Graph and Data Model relationship surfaces.

Expected framework APIs: `registerGraphLayoutEngine`, `runGraphLayoutEngine`, `collectGraphLayoutInput`, `applyGraphLayoutResult`, `setAdapterState`.

Expected events: `if:graph-layout-request`, `if:graph-layout-cancel`, `if:graph-layout-apply`, `if:graph-layout-result`, `if:graph-layout-error`, `if:adapter-state`.

Request/result fixture:

```json
{
  "adapter": "policyGraphLayout",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "graph-layout-001",
    "route": "graph",
    "layout": "radial",
    "seedId": "pol-dodi-5200-01",
    "options": {
      "orientation": "standard",
      "spacing": 72,
      "labelDensity": "full",
      "nodeDensity": "comfortable",
      "edgeStyle": "direct",
      "direction": "directed"
    },
    "nodes": [
      { "id": "pol-dodi-5200-01", "label": "DoDI 5200.01", "kind": "policy", "x": 50, "y": 48, "width": 160, "height": 118, "hidden": false },
      { "id": "doc-dodi-5025-01", "label": "DoDI 5025.01", "kind": "policy", "x": 68, "y": 32, "width": 140, "height": 104, "hidden": false }
    ],
    "edges": [
      { "from": "pol-dodi-5200-01", "to": "doc-dodi-5025-01", "type": "references", "label": "References", "inferred": false, "hidden": false }
    ]
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "coordinateSpace": "percent",
    "nodes": {
      "pol-dodi-5200-01": { "x": 50, "y": 48 },
      "doc-dodi-5025-01": { "x": 70, "y": 30 }
    },
    "edges": [
      {
        "from": "pol-dodi-5200-01",
        "to": "doc-dodi-5025-01",
        "type": "references",
        "label": "References",
        "route": { "style": "direct", "labelMode": "inline", "fromAnchor": "right", "toAnchor": "left" }
      }
    ],
    "view": { "panX": 0, "panY": 0, "zoom": 1 }
  }
}
```

Graph traversal fixture:

```json
{
  "adapter": "graphTraversal",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "graph-traverse-001",
    "route": "graph",
    "seedId": "doc-dodi-5025-01",
    "relationship": "references",
    "direction": "outbound",
    "depth": 1
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "expandedParentId": "doc-dodi-5025-01",
    "nodes": [
      { "id": "doc-manual-5025-01", "label": "DoD Manual 5025.01", "kind": "document", "relation": "References" },
      { "id": "forms-registry", "label": "Forms Registry", "kind": "source", "relation": "References" }
    ],
    "edges": [
      { "from": "doc-dodi-5025-01", "to": "doc-manual-5025-01", "type": "references", "label": "References" },
      { "from": "doc-dodi-5025-01", "to": "forms-registry", "type": "references", "label": "References" }
    ],
    "hiddenChildCount": 0
  }
}
```

## Document Annotations

Used by: Documents, Review evidence, Data Model decomposition views.

Expected framework APIs: `getDocumentAnnotationSchema`, `getDocumentAnnotationSchemas`, `selectDocumentAnnotation`, `updateDocumentSearch`, `setAdapterState`.

Expected events: `if:doc-annotation-select`, `if:doc-annotation-panel`, `if:doc-mode-change`, `if:doc-search`, `if:adapter-state`.

Fixture:

```json
{
  "adapter": "annotationSchema",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "ann-001",
    "route": "documents",
    "documentId": "doc-dodi-5200-01",
    "filters": ["claim", "reference", "org", "implements", "enables"]
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "artifactId": "doc-dodi-5200-01",
    "annotations": [
      {
        "id": "clm-5200-01-0007",
        "type": "claim",
        "value": "organizations shall classify data",
        "text": "Organizations shall classify data based on sensitivity and criticality.",
        "line": 42,
        "lineId": "line-0042",
        "lineText": "Organizations shall classify data based on sensitivity and criticality.",
        "range": "42:14-42:46",
        "confidence": "0.91",
        "source": "claim-extractor-v0.4",
        "expansion": "Normative shall statement"
      },
      {
        "id": "org-disa-001",
        "type": "org",
        "value": "DISA",
        "text": "DISA",
        "line": 58,
        "lineId": "line-0058",
        "lineText": "DISA provides enterprise guidance for network implementation.",
        "range": "58:1-58:5",
        "confidence": "0.87",
        "source": "entity-linker-v0.3",
        "expansion": "Defense Information Systems Agency"
      }
    ],
    "summary": {
      "claims": 42,
      "references": 18,
      "organizations": 12,
      "obligations": 7,
      "evidenceLinks": 31
    }
  }
}
```

## Source Registry

Used by: Sources and Overview source health panels.

Expected framework APIs: `registerDataTableAdapter`, `hydrateCharts`, `setAdapterState`.

Expected events: `if:table-request`, `if:table-results`, `if:table-action`, `if:chart-point-hover`, `if:adapter-state`.

Fixture:

```json
{
  "adapter": "sourceRegistry",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "src-001",
    "route": "sources",
    "filters": { "tier": ["tier-1", "tier-2"], "health": ["healthy", "degraded"], "parserStatus": ["ok", "warning"] },
    "page": 1,
    "pageSize": 20
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "total": 124,
    "rows": [
      {
        "id": "src-dod-issuances",
        "name": "DoD Issuances Portal",
        "tier": "Tier 1",
        "health": "Healthy",
        "lastSync": "2026-05-26T10:21:00Z",
        "documentCount": 12845,
        "changeRate": 8.4,
        "parserStatus": "OK",
        "accessMode": "public",
        "actions": ["run", "edit", "audit"]
      },
      {
        "id": "src-service-watchlist",
        "name": "Service Memo Watchlist",
        "tier": "Tier 3",
        "health": "Degraded",
        "lastSync": "2026-05-26T08:31:00Z",
        "documentCount": 742,
        "changeRate": -4.8,
        "parserStatus": "Errors",
        "accessMode": "restricted",
        "actions": ["run", "edit", "audit"]
      }
    ],
    "metrics": {
      "activeSources": 124,
      "degradedSources": 7,
      "agentsHealthy": 7,
      "failedRuns": 3
    }
  }
}
```

## Search

Used by: Search route, topbar search, document search, related-entity lookup.

Expected framework APIs: `registerAutocompleteAdapter`, `registerDataTableAdapter`, `setAdapterState`.

Expected events: `if:autocomplete-request`, `if:autocomplete-results`, `if:table-request`, `if:table-results`, `if:table-filter`, `if:adapter-state`.

Search request fixture:

```json
{
  "adapter": "searchResults",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "search-001",
    "route": "search",
    "queryModel": {
      "naturalLanguage": "zero trust architecture AND cloud migration guides that implement NIST 800-207",
      "clauses": [
        { "id": "c1", "operator": "contains", "value": "zero trust architecture", "field": "any" },
        { "id": "c2", "operator": "relationshipType", "value": "implements", "target": "NIST SP 800-207" }
      ],
      "semanticExpansion": true,
      "inferredRelationships": true
    },
    "page": 1,
    "pageSize": 25,
    "sort": { "field": "relevance", "direction": "desc" }
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "total": 4812,
    "elapsedMs": 830,
    "rows": [
      {
        "id": "res-zero-trust-guide",
        "title": "Zero Trust Architecture Implementation Guide for Cloud Environments",
        "type": "Policy / Guidance",
        "authority": "CISA",
        "source": "CISA Docs Portal",
        "updated": "2026-05-12",
        "confidence": "High",
        "matchedOn": ["title", "abstract", "relationships"],
        "snippet": "Provides guidance for implementing zero trust architecture in cloud environments.",
        "highlights": [
          { "field": "snippet", "start": 24, "end": 58 },
          { "field": "snippet", "start": 62, "end": 67 }
        ]
      }
    ],
    "relatedEntities": [
      { "id": "ent-nist-800-207", "type": "standard", "label": "NIST SP 800-207", "relationship": "Referenced by", "count": 124 },
      { "id": "ent-cloud-migration", "type": "initiative", "label": "Cloud Migration Initiative", "relationship": "Implements", "count": 76 }
    ],
    "suggestedRefinements": [
      { "label": "Add Authority: CISA", "delta": 732 },
      { "label": "Increase Similarity to 0.80", "delta": -618 }
    ]
  }
}
```

## Review Queues

Used by: Review, Overview selected-detail actions, Documents claim review.

Expected framework APIs: `updateReviewWorkflow`, `selectReviewWorkflowItem`, `applyReviewWorkflowAction`, `registerDataTableAdapter`, `setAdapterState`.

Expected events: `if:review-workflow-select`, `if:review-workflow-action`, `if:diff-decision`, `if:form-error-summary`, `if:table-request`, `if:table-results`, `if:adapter-state`.

Queue fixture:

```json
{
  "adapter": "reviewQueue",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "rev-001",
    "route": "review",
    "filters": { "status": ["open", "needs-review"], "risk": ["high"], "assignedTo": ["Jane Doe"] },
    "page": 1,
    "pageSize": 20
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "total": 128,
    "rows": [
      {
        "id": "finding-1178-002",
        "title": "Supplier Data Residency Obligation Missing",
        "type": "Implementation Gap Candidate",
        "source": "Global Privacy Policy v2.1",
        "confidence": "High",
        "confidenceScore": 0.87,
        "risk": "High",
        "assignedTo": "Jane Doe",
        "due": "2026-05-31",
        "status": "Needs Review",
        "blocking": true
      }
    ],
    "counts": { "open": 128, "needsReviewToday": 34, "blocking": 9, "reviewedThisWeek": 142 }
  }
}
```

Decision fixture:

```json
{
  "adapter": "reviewDecision",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "rev-action-001",
    "route": "review",
    "findingId": "finding-1178-002",
    "action": "approve",
    "reason": "Confirmed gap against source policy and implementation evidence.",
    "reviewer": "Jane Doe"
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "findingId": "finding-1178-002",
    "previousStatus": "Needs Review",
    "status": "Approved",
    "auditEntry": {
      "id": "audit-9001",
      "actor": "Jane Doe",
      "timestamp": "2026-05-26T12:00:00Z",
      "action": "approve",
      "reason": "Confirmed gap against source policy and implementation evidence."
    }
  }
}
```

Validation error fixture:

```json
{
  "adapter": "reviewDecision",
  "fixtureVersion": "0.1",
  "request": { "requestId": "rev-action-error", "route": "review", "findingId": "finding-1178-002", "action": "reject", "reason": "" },
  "result": {
    "state": "error",
    "generatedAt": "2026-05-26T12:00:00Z",
    "message": "Decision reason is required.",
    "fieldErrors": [{ "field": "reason", "message": "Enter a decision reason before rejecting this finding." }]
  }
}
```

## Exports

Used by: tables, graphs, diagrams, document views, review reports.

Expected framework APIs: `registerExportAdapter`, `unregisterExportAdapter`, `cancelSurfaceExport`, `setAdapterState`.

Expected events: `if:surface-export-request`, `if:surface-export-result`, `if:surface-export-cancel`, `if:surface-export-error`, `if:surface-export`.

Request/result fixture:

```json
{
  "adapter": "diagramExport",
  "fixtureVersion": "0.1",
  "request": {
    "requestId": "export-001",
    "route": "diagrams",
    "format": "png",
    "filename": "policy-intelligence-architecture.png",
    "surfaceId": "azure-deployment-architecture",
    "include": ["visible-nodes", "connectors", "legend", "metadata"]
  },
  "result": {
    "state": "success",
    "generatedAt": "2026-05-26T12:00:00Z",
    "jobId": "export-job-001",
    "format": "png",
    "filename": "policy-intelligence-architecture.png",
    "mimeType": "image/png",
    "sizeBytes": 482113,
    "url": "blob:mock-policy-intelligence/export-job-001",
    "checksum": "sha256:mocked"
  }
}
```

PDF export uses the same shape with `format: "pdf"` and `mimeType: "application/pdf"`. Server-backed export may return `url`, `blob`, or an application-managed `downloadId`; the route should not care which one is used as long as `state`, `format`, and `filename` are present.

## Adapter Ownership By Route

| Route | Required adapter fixtures |
| --- | --- |
| Overview | `overviewMetrics`, `policyRecordsTable`, `policyRecordDetail`, `globalAutocomplete` |
| Graph | `policyGraphLayout`, `graphTraversal`, `graphSearch`, `graphNodeDetail` |
| Documents | `documentCorpus`, `artifactFetch`, `documentSearch`, `annotationSchema` |
| Review | `reviewQueue`, `reviewFindingDetail`, `reviewDecision`, `assignmentLookup` |
| Sources | `sourceRegistry`, `agentRuns`, `sourceHealth`, `auditLog` |
| Search | `searchSuggestions`, `searchResults`, `relatedEntities`, `savedSearches` |
| Workspace | `workspaceViews`, `widgetLayout`, `userPreferences` |
| Diagrams | `diagramLayout`, `diagramSearch`, `diagramExport`, `diagramPersistence` |
| Data Model | `entityCatalog`, `relationshipOntology`, `schemaSearch`, `decompositionModel` |

## Fixture Test Matrix

Every adapter family should include at least these fixture states:

| State | Required example |
| --- | --- |
| `success` | Normal populated result with ids and metadata. |
| `empty` | Valid request, no rows/items/nodes/matches. |
| `loading` | UI state triggered before adapter resolves. |
| `error` | Service, validation, auth, or parser failure with message. |
| `cancelled` | Previous request aborted by new filter/search/layout/export. |

Minimum test assertions:

- Success result renders without route-specific JavaScript beyond adapter registration.
- Empty state does not render stale prior records.
- Error state preserves user input and exposes retry where relevant.
- Cancelled state does not show an error banner.
- Events include request id and adapter/channel name for telemetry.
