# Operations Workspace Conversion Task Plan

Source signal: a downstream analytics demo exposed gaps in the framework's ability to compose dense table, record-detail, provenance, data-source, storage, and action surfaces without app-local UI primitives.

This plan keeps the framework domain-agnostic. The reusable output is an operations workspace pattern that can support inventory, policy, grants, procurement, source registry, review, compliance, or portfolio analytics surfaces without naming or styling itself around any one domain.

## Conversion Principles

- Framework first: recurring visual language, behavior, component states, and documentation belong in `control-surface-ui`.
- Generic naming: component ids, classes, recipes, docs, and examples should describe reusable UI jobs, not a downstream product.
- Agentic consumption: every promoted pattern needs a manifest entry, choose/avoid guidance, copy-paste markup, events, and public APIs.
- Data-shaped, not app-shaped: adapters and examples should work with generic records, sources, fields, queues, and actions.
- Release-shaped: package, provenance, checksums, and clean consumer install paths must stay reliable while conversion work progresses.

## Current Completed Batch

### CSUI-OPS-001 Operations Workspace Recipe And Example

**Goal:** Add a first-class operations workspace composition for dense analytics control surfaces.

**Framework tasks**

- Add `examples/operations-workspace.html` as the canonical generic example.
- Demonstrate selectable signal cards, drilldown panels, provenance fields, table command bands, record detail, action queues, and source health cards.
- Add design-system specimen coverage in `examples/components.html#operations-workspace`.
- Add manifest, API docs, event catalog, and recipe coverage.

**Definition of done**

- The page works from `dist/` artifacts only.
- The pattern is reusable for arbitrary operations/inventory/review records.
- No public component, class, recipe, event, or doc title uses a downstream domain as its component identity.

### CSUI-OPS-002 Signal Drilldown Pattern

**Goal:** Make metric cards support exclusive drilldown behavior for analytics workspaces.

**Framework tasks**

- Add `[data-if-operations-workspace]` to scope signals and panels.
- Add `[data-if-operations-signal]` for selectable KPI or summary cards.
- Add `[data-if-operations-panel]` for matching drilldown panels.
- Add `[data-if-operations-current-label]` slots for selected-signal labels.
- Add `[data-if-operations-reset]` controls.
- Dispatch `if:operations-signal-change` and `if:operations-signal-reset`.
- Support arrow-key navigation, Home, End, and Escape.

**Definition of done**

- A host can synchronize URL, table filters, telemetry, or secondary panels from event detail.
- ARIA state and `.is-selected` stay synchronized for pointer, keyboard, and JavaScript API paths.

### CSUI-OPS-003 Record Detail Intelligence Panel

**Goal:** Add a reusable record-detail composition for decision support.

**Framework tasks**

- Add `.if-record-detail`, `.if-record-detail__header`, `.if-record-detail__body`, `.if-record-detail__summary`, and `.if-record-detail__actions`.
- Demonstrate posture, next action, core facts, attention snapshot, provenance, and source evidence.
- Compose with badges, alerts, metadata panels, source badges, and action queues.

**Definition of done**

- The panel answers: what is this record, what matters, who owns it, what changed, and what should happen next?
- Row expansion, right detail panes, and full-page drilldowns can use the same classes.

### CSUI-OPS-004 Field-Level Provenance Grid

**Goal:** Add a first-class field provenance pattern.

**Framework tasks**

- Add `.if-provenance-grid`, `.if-provenance-field`, `.if-provenance-field__label`, `.if-provenance-field__value`, and `.if-provenance-field__status`.
- Add `.if-source-badge` variants for `system`, `manual`, `derived`, `stale`, and `conflict`.
- Demonstrate stale and conflicting values without creating domain-specific labels.

**Definition of done**

- A downstream app can show field source, freshness, confidence, conflict, and review posture with framework classes only.

### CSUI-OPS-005 Compact Table Command Band

**Goal:** Replace app-local table toolbar composition with a reusable dense control band.

**Framework tasks**

- Add `.if-table-command-band`.
- Add leading, filter, and action regions.
- Demonstrate saved views, filters, export, column controls, density, and selected-count actions.

**Definition of done**

- The command band composes with the existing table API and does not require page-specific spacing hacks.

## Remaining Generic Backlog

### CSUI-OPS-006 Saved Views, Column Picker, And Density Cluster

- Add a stronger preferences cluster demo with saved view, column visibility, density, and reset controls.
- Add storage-adapter documentation for loading, saving, deleting, and resetting view state.
- Add keyboard behavior notes for menus and column toggles.

### CSUI-OPS-007 Data Source Operations Console

- Generalize source/feed health cards for API, file, queue, crawler, and manual sources.
- Demonstrate freshness, throughput, failures, retry, pause/resume, and audit events.
- Connect to shared adapter state helpers for loading, empty, error, cancel, retry, and success.

### CSUI-OPS-008 Local-First Storage Console

- Add a local/session storage management pattern for demo and offline-first controls.
- Include storage health, last save, clear/reset confirmation, export snapshot, and restore snapshot.
- Keep production hooks adapter-ready so a host can swap local storage for a database.

### CSUI-OPS-009 Import And Reconciliation Workflow

- Compose upload/dropzone, preview, field mapping, conflict review, and import state patterns.
- Support record import from CSV, JSON, spreadsheet, or service payloads.
- Add empty/error/loading/cancelled examples.

### CSUI-OPS-010 Operational Timeline Pattern

- Add a generic operational timeline for deadlines, windows, milestones, renewal dates, evidence gates, overdue states, and due-soon states.
- Compose with item history and claim/status tracking rather than creating a product-specific timeline.

### CSUI-OPS-011 Operational Audit Ledger

- Add timestamp, action, actor, record context, JSON/detail preview, clear ledger, empty state, and filters.
- Add disclosure for detail preview and confirmation for clearing ledger.

### CSUI-OPS-012 Domain Icon Aliases

- Extend icon aliases for common analytics domains: record, source, queue, storage, budget, obligation, deadline, risk, trust, import, export, evidence, and reconciliation.
- Keep icons generic and reusable across policy, source, procurement, compliance, and operational analytics pages.

### CSUI-OPS-013 Framework Consumption Layer

- Provide thin wrapper examples for host apps that use React, Vue, Svelte, or vanilla rendering while consuming the framework CSS/JS.
- Keep host frameworks responsible for state/data and Control Surface UI responsible for visual/behavior primitives.

### CSUI-OPS-014 Shared Dialog And Modal Cleanup

- Ensure import, storage reset, delete, export, edit, and assignment flows can use framework modal/drawer/menu primitives.
- Add docs for destructive confirmation and async adapter states.

### CSUI-OPS-015 Shared Chips, Badges, Status Tags, And Pagination

- Confirm small repeated status primitives cover risk, trust, source health, state, due dates, feed status, and conflict states.
- Confirm pagination supports dense table surfaces and command-band composition.

## Verification Commands

Run after framework changes:

```bash
npm run build
npm run validate
npm run accessibility
npm run test:contracts
```

Run before release handoff:

```bash
npm run release:smoke
npm run release:provenance
npm run release:provenance:check
```

## Acceptance Criteria

- New component families remain generic and agent-readable.
- Examples load only from `/dist` artifacts.
- Manifest entries, API docs, recipes, event catalog, and design-system specimens stay aligned.
- Behavior works by markup, pointer, keyboard, and `InterfaceFramework.getComponentController`.
- No downstream product gets a special component family when a generic pattern can do the job.
