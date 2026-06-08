# Contract Operations Conversion Task Plan

Source brief: `https://github.com/anboas/contract-inventory-control-surface-demo/blob/main/docs/codex-100-percent-conversion-brief.md`

This task plan converts the Contract Inventory Control Surface Demo to a full `control-surface-ui` implementation by promoting recurring contract-management needs into the framework first, then consuming those primitives from the demo. Do not solve these gaps with app-local CSS adapters or one-off React primitives unless the framework contract already exists and the adapter is only a thin consumption layer.

## Conversion Principles

- Framework first: recurring visual language, behavior, component states, and documentation belong in `control-surface-ui`.
- Demo second: the demo should consume package artifacts and framework classes, not recreate the UI system locally.
- Adapter-light: keep app adapters for data and domain state; remove visual token systems, bridge CSS, and duplicate menu/modal/table behavior.
- Contract-ready: every new component pattern needs docs, manifest coverage, example usage, behavior hooks, and verification.
- Release-shaped: package, provenance, checksums, and clean consumer install paths must stay reliable while the demo conversion progresses.

## Execution Order

1. Build contract-operations primitives in `control-surface-ui`.
2. Document recipes, component APIs, events, manifest entries, and examples.
3. Rebuild/package the framework and refresh the demo's vendored dependency.
4. Convert demo surfaces one at a time, deleting app-local visual primitives as coverage lands.
5. Run framework and demo verification after each major batch.
6. Commit and push framework changes before demo dependency refresh commits.

## P0 Framework Tasks

### CSUI-CONTRACT-001 Contract Operations Recipe And Example

**Goal:** Add a first-class contract portfolio management recipe to the framework.

**Framework tasks**

- Add a contract operations recipe section to `docs/recipes.md`.
- Add contract operations guidance to `docs/components.md`.
- Add manifest entries in `docs/component-manifest.json` for contract-specific patterns.
- Add at least one runnable framework example page under `examples/`, for example `examples/contract-operations.html`.
- Demonstrate portfolio signals, contract table workspace, detail intelligence, provenance, action queue, data-source operations, and local-first storage controls in the example.

**Demo tasks**

- Treat the new example as the canonical conversion reference.
- Replace demo-local layout and styling decisions with classes and data attributes from the recipe.

**Definition of done**

- The framework example loads only from framework artifacts.
- The recipe tells an agent which components to choose and in what order.
- Manifest and docs name the classes, attributes, events, and adapter seams.

### CSUI-CONTRACT-002 Portfolio Signal Drilldown Component

**Goal:** Make metric cards support exclusive drilldown behavior used by contract analytics.

**Framework tasks**

- Add selectable metric/KPI card state for exclusive drilldowns.
- Expose selected state with `aria-pressed` or a documented equivalent.
- Add keyboard behavior for metric selection, reset, and panel focus.
- Add a focused analytics-panel region that opens below a metric row.
- Add compact desktop and stacked mobile examples.
- Emit a stable event such as `if:metric-drilldown-change`.

**Demo tasks**

- Map Active Portfolio to base table reset.
- Map Ceiling Remaining to ceiling analytics.
- Map 90-Day Actions to action-window analytics.
- Map Source Trust to source confidence analytics.
- Map Critical Risk to critical risk analytics.

**Definition of done**

- One metric can be active at a time.
- Reset closes analytics panels and returns to base table.
- The pattern is documented in recipe, component API, and manifest.

### CSUI-CONTRACT-003 Contract Detail Intelligence Panel

**Goal:** Add a reusable record-detail composition for contract owner decision support.

**Framework tasks**

- Create a record-detail intelligence pattern for management snapshot, posture, next action, ceiling posture, data trust, core facts, attention snapshot, and source evidence.
- Support collapsed evidence sections.
- Support inline row expansion and full-page drilldown variants.
- Add event hooks for selected record, expanded evidence, and action selection.

**Demo tasks**

- Replace app-local detail card composition with the new framework detail panel.
- Use the same panel for row expansion and full contract drilldown.

**Definition of done**

- The panel answers: what should a contract owner, company, or monitor do next?
- Demo detail surfaces use framework classes and behavior, not app-local panels.

### CSUI-CONTRACT-004 Field-Level Provenance Grid

**Goal:** Add a first-class field provenance pattern.

**Framework tasks**

- Add source badges for Manual, SAM.gov, FPDS, USAspending.gov, derived, and calculated states.
- Add mismatch, stale, conflict, confidence, and trust indicators.
- Support compact table usage and detail-panel usage.
- Add accessible labels for source, confidence, staleness, and conflict state.

**Demo tasks**

- Replace field-level app badges with the framework provenance grid.
- Use the pattern in detail panels and data-quality surfaces.

**Definition of done**

- A reviewer can see where a field came from, whether it is stale or conflicting, and how much confidence the system has.

### CSUI-CONTRACT-005 Compact Table Control Band

**Goal:** Replace app-local table toolbar composition with a reusable dense control band.

**Framework tasks**

- Combine query, filters, saved views, density, columns, count, primary action, secondary actions, and export menu into one documented pattern.
- Support mobile wrapping without clipped controls.
- Emit events for query, filter, view, density, column, export, and primary action changes.
- Add copy-paste markup and a live example.

**Demo tasks**

- Replace most of `src/workspace.jsx` toolbar/control-band code.
- Keep domain filter state in the app, but use framework controls and events.

**Definition of done**

- The table control area is framework-owned and reusable across contract table, data quality, audit, local storage, and API analytics pages.

### CSUI-CONTRACT-006 Saved Views, Column Picker, And Density Cluster

**Goal:** Add a reusable table preferences cluster.

**Framework tasks**

- Add saved view selector, save current view, manage/delete saved view, required/pinned columns, reset defaults, density selector, and browser-local persistence hooks.
- Document adapter contracts for loading, saving, deleting, and resetting view state.
- Add keyboard behavior for menus and column toggles.

**Demo tasks**

- Move saved-view and column-picker UI out of app-local primitives.
- Use browser-local persistence hooks for demo state.

**Definition of done**

- The demo can save, switch, manage, and reset table views using framework controls.

### CSUI-CONTRACT-007 Reliable Package Consumption Path

**Goal:** Make demo dependency refresh predictable and documented.

**Framework tasks**

- Choose the near-term path: versioned tarball with checksum/provenance, unless npm/GitHub Packages is explicitly configured.
- Document refresh instructions in framework package handoff docs.
- Keep `release/control-surface-ui-<version>.tgz`, checksums, and provenance current after framework changes.

**Demo tasks**

- Document exactly how the vendored framework package is refreshed.
- Verify the installed package name, version, checksum, and no React runtime dependency.

**Definition of done**

- A new agent can refresh the demo's framework package without private GitHub dependency fetch failures.

## P1 Framework Tasks

### CSUI-CONTRACT-008 Data Source Operations Console

**Goal:** Add a connector operations console for API/feed health workflows.

**Framework tasks**

- Add feed health cards, API status, latency, last checked, recent calls table, redacted endpoint display, clear local log action, and browser-local telemetry language.
- Add warning/error states per feed.
- Add empty/loading/error/success states.

**Demo tasks**

- Convert API Analytics and Data Sources / Sync surfaces to the new console.
- Remove app-local health cards and endpoint display styles.

**Definition of done**

- API Analytics and source sync screens use framework-owned operations-console primitives.

### CSUI-CONTRACT-009 Local-First Storage Console

**Goal:** Add local browser storage management components.

**Framework tasks**

- Add app-scoped key grouping, masked sensitive values, clear app data, delete key, backup export/import, and trust copy.
- Add a table-ready storage inventory structure.
- Add safety confirmation states for destructive actions.

**Demo tasks**

- Convert the Local Storage page to the framework pattern.
- Remove custom local-storage card/table styling.

**Definition of done**

- The Local Storage page clearly explains browser-local storage boundaries and supports backup/clear/delete flows.

### CSUI-CONTRACT-010 Import And Reconciliation Workflow

**Goal:** Compose upload, preview, field mapping, conflict review, and import states into one workflow.

**Framework tasks**

- Add a recipe and component composition for file drop/select, preview table, new/resync/duplicate/conflict states, mapping summary, conflict review, apply/import action, error handling, and large preview containment.
- Add event hooks for file selected, preview parsed, conflict selected, import applied, retry, and cancel.

**Demo tasks**

- Convert the SAM.gov CSV import modal to the framework workflow.
- Delete modal-specific duplicate upload/table styles.

**Definition of done**

- The import modal can show a large preview without overflow and has clear conflict states.

### CSUI-CONTRACT-011 Contract Timeline / Period Of Performance Pattern

**Goal:** Add contract-specific operational timeline support.

**Framework tasks**

- Add period-of-performance bands, expiration windows, renewal/action dates, SAM registration expiration, obligation/ceiling markers, overdue states, and due-soon states.
- Support compact page and detail-panel variants.

**Demo tasks**

- Convert the Timeline page to the new framework pattern.

**Definition of done**

- Contract timelines show operational risk windows without relying on generic history-only components.

### CSUI-CONTRACT-012 Operational Audit Ledger

**Goal:** Add browser-local audit ledger pattern.

**Framework tasks**

- Add timestamp, action, contract/vendor context, JSON/detail preview, clear ledger, empty state, filters, and table-ready structure.
- Add disclosure for detail preview and confirmation for clearing ledger.

**Demo tasks**

- Convert Audit Trail page to the framework ledger pattern.

**Definition of done**

- Audit Trail is filterable, clearable, and readable with framework classes and behavior.

### CSUI-CONTRACT-013 Procurement Icon Taxonomy

**Goal:** Extend the icon registry for contract operations.

**Framework tasks**

- Add icons or documented aliases for contract, IDIQ, BPA, delivery order, definitive contract, ceiling, obligation, period of performance, SAM.gov, FPDS, USAspending.gov, UEI, vendor, source mismatch, source trust, agile fit, DevSecOps fit, backup, export, and import.
- Add examples to icon showcase and manifest.

**Demo tasks**

- Replace app-local icon choices with framework icon names.

**Definition of done**

- Contract operations pages have domain-appropriate iconography without one-off SVGs.

### CSUI-CONTRACT-014 React Consumption Layer

**Goal:** Give React apps a thin, documented way to consume framework behavior without rebuilding components.

**Framework tasks**

- Add recipes or wrappers for modal/dialog, menu/popover, metric card, table control band, data table shell, detail panel, disclosure, status badge, provenance badge, and pagination.
- Document lifecycle expectations for `init`, `destroy`, refs, and route teardown.
- Add examples that keep React responsible for state/data and the framework responsible for visual/behavior contracts.

**Demo tasks**

- Replace duplicate React primitives in `src/ui.jsx`, `src/dialog.jsx`, and `src/workspace.jsx` with thin wrappers or plain framework markup.

**Definition of done**

- The React app no longer needs to duplicate menu, modal, table toolbar, disclosure, badge, or pagination behavior.

### CSUI-CONTRACT-015 Token Migration Contract

**Goal:** Remove app-local visual token dependence.

**Framework tasks**

- Add a migration map from app `U.*` tokens and inline style patterns to framework CSS variables/classes.
- Document which dynamic inline styles are acceptable: data-driven dimensions, calculated progress widths, and one-off CSS custom property values.

**Demo tasks**

- Remove or sharply reduce `U.*` visual layout/color usage.
- Keep domain constants in app logic only.

**Definition of done**

- Visible layout, color, spacing, border, radius, and typography are framework-owned across converted demo surfaces.

## P2 Framework Tasks

### CSUI-CONTRACT-016 Contract Table And Row Expansion

**Goal:** Ensure the framework table shell supports contract-specific row expansion and attention states.

**Framework tasks**

- Add examples for expandable rows with detail summary, inline evidence, status badges, and row-level actions.
- Confirm sorting/filtering/pagination survive expanded rows.

**Demo tasks**

- Convert contract table rows and expansion content.

**Definition of done**

- Expanded rows feel like framework table content, not embedded app-local cards.

### CSUI-CONTRACT-017 Shared Dialog And Modal Cleanup

**Goal:** Consolidate demo dialogs onto framework overlay primitives.

**Framework tasks**

- Confirm modal/dialog recipes cover import, sync, destructive confirmation, evidence detail, and saved-view management.
- Add any missing variant docs.

**Demo tasks**

- Replace `src/dialog.jsx` visual primitives with framework markup and behavior.

**Definition of done**

- All shared dialogs use framework modal/drawer/menu contracts.

### CSUI-CONTRACT-018 Shared Chips, Badges, Status Tags, And Pagination

**Goal:** Normalize small repeated status primitives.

**Framework tasks**

- Add contract-domain badge examples for risk, trust, source, state, contract type, deadline, and feed status.
- Confirm pagination supports dense table surfaces.

**Demo tasks**

- Replace custom chips/tags/pagination with framework classes.

**Definition of done**

- Repeated status indicators are visually consistent and documented.

## Demo Conversion Surface Checklist

Convert these demo surfaces after the relevant framework tasks are available:

- [ ] Top shell/header/banner/footer.
- [ ] Primary and support navigation.
- [ ] Portfolio signals and drilldown panels.
- [ ] Table control band.
- [ ] Saved views, density, columns, and exports.
- [ ] Contract table and row expansion.
- [ ] Contract detail intelligence panel.
- [ ] Timeline page.
- [ ] Data Quality page.
- [ ] API Analytics page.
- [ ] Audit Trail page.
- [ ] Local Storage page.
- [ ] Import modal.
- [ ] Data sources / sync modals.
- [ ] Shared dialog component.
- [ ] Shared chips, badges, status tags, and pagination.

## Removal Checklist

Remove or sharply reduce these app-local surfaces:

- [ ] App-local visual primitives in `src/ui.jsx`.
- [ ] Inline style-heavy JSX where styles are not data-driven.
- [ ] App-local `U.*` visual token dependence.
- [ ] `src/control-surface-adapter.css` bridge overrides.
- [ ] Duplicate menu behavior.
- [ ] Duplicate modal/dialog behavior.
- [ ] Duplicate table toolbar behavior.
- [ ] Duplicate pagination and badge styling.

## Verification Gates

### Framework

Run after each framework batch:

```bash
npm install
npm run build
npm run validate
npm run accessibility
npm run test:contracts
```

Run when browser dependencies are available:

```bash
npm run test:browser
```

### Demo

Run after dependency refresh and each converted surface batch:

```bash
npm install
npm run verify:all
```

Inspect generated screenshots under `test-results/`, especially:

- Desktop contracts workspace.
- Mobile contracts workspace.
- Data Quality.
- Audit Trail.
- API Analytics.
- Local Storage.
- Expanded contract detail.
- Each portfolio signal panel.

## Commit And Push Choreography

1. Commit framework primitives and docs in `control-surface-ui`.
2. Run release smoke and produce a refreshed `release/control-surface-ui-<version>.tgz`.
3. Push `control-surface-ui`.
4. Refresh the demo's vendored framework dependency.
5. Commit demo conversion changes in `contract-inventory-control-surface-demo`.
6. Push demo repo.
7. Confirm demo GitHub Actions.
8. Start the demo locally and report the URL.

## Completion Definition

The conversion is complete only when:

- The app visibly reads as a `control-surface-ui` product.
- Major visible surfaces use framework primitives or newly added contract-operations primitives.
- Contract-specific patterns are documented in recipes, component docs, and manifest.
- A runnable framework example demonstrates contract operations.
- The demo imports the refreshed framework package.
- The large adapter CSS layer is deleted or reduced to narrow compatibility seams.
- Framework verification passes.
- Demo verification passes.
- Both repositories are committed and pushed.
