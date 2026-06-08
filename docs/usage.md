# Usage

## Install And Build

```bash
npm install
npm run build
```

The build writes compiled assets to `dist/`.

## Use In Plain HTML

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/dist/interface-framework.css">
  </head>
  <body>
    <div class="if-shell">
      <header class="if-topbar">
        <a class="if-brand" href="/">
          <span class="if-brand__mark">PI</span>
          <span>Policy Intelligence</span>
        </a>
      </header>
      <main class="if-content">
        <article class="if-card">Content</article>
      </main>
    </div>
    <script src="/dist/interface-framework.js"></script>
  </body>
</html>
```

No React runtime is required. JavaScript behavior is optional and is activated with data attributes.

## Use From A Bundler

```js
import "control-surface-ui/css";
import { init, destroy, setTheme } from "control-surface-ui";

init(document);
setTheme("light");

// On route teardown or before removing a mounted fragment:
destroy(document);
```

The package export map routes ESM consumers to `dist/interface-framework.esm.js`. The plain browser bundle remains available at `dist/interface-framework.js`, `control-surface-ui/js`, and the pinned CDN paths for no-build sites.

## Development Server

```bash
npm run dev
```

The included server opens the examples from the same compiled artifacts used for distribution.

## Component Reference

Use [`component-api.md`](./component-api.md) as the copy-paste implementation reference. It contains API tables, variant matrices, and minimal plain-HTML examples for the full component inventory: layout, controls, inputs, navigation, overlays, data display, graph and hierarchy surfaces, document viewers, diagrams, governance patterns, and public-site components.

For agentic implementation, start with [`agent-handoff.md`](./agent-handoff.md) for the MVP route map and build order, choose a starter kit from [`../starters/README.md`](../starters/README.md), read [`mvp-route-contracts.md`](./mvp-route-contracts.md) for page-level acceptance contracts, use [`route-component-map.md`](./route-component-map.md) for route-level component/behavior/event/example mapping, use [`adapter-fixture-contracts.md`](./adapter-fixture-contracts.md) for production-shaped mocks and adapter payloads, use [`component-manifest.json`](./component-manifest.json) to select components, choose a playbook from [`recipes.md`](./recipes.md), wire integrations from [`event-catalog.md`](./event-catalog.md), and document the component decision using [`agentic-ergonomics.md`](./agentic-ergonomics.md). The same files are exported from the package as `control-surface-ui/agent-handoff`, `control-surface-ui/starters`, `control-surface-ui/mvp-route-contracts`, `control-surface-ui/route-component-map`, `control-surface-ui/adapter-fixture-contracts`, `control-surface-ui/component-manifest`, `control-surface-ui/recipes`, `control-surface-ui/event-catalog`, and `control-surface-ui/agentic-ergonomics`.

## Validation

```bash
npm run validate
npm run accessibility
npm run test:contracts
npm run release:verify
npm test
```

The validation suite is intentionally dependency-free. It verifies required files, package export targets, CSS imports, example-page distribution contracts, static example links, icon and chart usage, ARIA and keyboard contracts, component contracts, JSON data, and JavaScript syntax. Run it after every component or behavior pass. Use `npm run accessibility` for the focused ARIA, keyboard, focus-state, and example-markup checks.

Browser regression suites are available after installing Playwright browsers:

```bash
npm run playwright:install
npm run test:visual
npm run test:a11y:browser
npm run test:browser
```

Use `npm run test:visual -- --update-snapshots` only when the visual change is intentional. See [`testing.md`](./testing.md) for the full visual regression, browser accessibility, and component contract workflow.

## Release Governance

Release artifacts are governed by [`release-governance.md`](./release-governance.md), [`migration.md`](./migration.md), [`browser-support.md`](./browser-support.md), [`deprecation-policy.md`](./deprecation-policy.md), and [`release-checklist.md`](./release-checklist.md).

```bash
npm run build
npm run checksums
npm run checksums -- --check
npm run release:verify
```

`npm run build` emits the compiled CSS/JS files and writes `dist/interface-framework.checksums.json` plus `dist/SHA256SUMS`. `npm run release:verify` rebuilds, verifies the checksum artifacts, and runs the static validation suite. Production package signing should happen in the release pipeline or through npm provenance; the local framework output supplies the checksum artifacts that can be signed and audited.

## Density

Apply density at the page or component root:

```html
<div class="if-shell" data-density="compact">
  ...
</div>
```

Supported density values:

- `compact`
- `comfortable`
- `spacious`

## Utility Layer

The framework includes a focused utility layer for repeated composition needs. It is intentionally smaller than Tailwind and should be used to support framework layouts, not replace component classes.

Common utility families:

- Layout: `.if-stack`, `.if-flow`, `.if-cluster`, `.if-flex`, `.if-inline-flex`, `.if-grid`, `.if-grid--2`, `.if-grid--3`, `.if-grid--4`, `.if-grid--auto`, `.if-grid--auto-xs`, `.if-grid--auto-sm`, `.if-grid--auto-md`, `.if-grid--auto-lg`, `.if-grid--sidebar`, `.if-grid--detail`, `.if-grid--custom`
- Flex and alignment: `.if-flex-1`, `.if-basis-*`, `.if-grow`, `.if-shrink-0`, `.if-order-first`, `.if-order-last`, `.if-align-start`, `.if-align-center`, `.if-align-stretch`, `.if-justify-items-*`, `.if-place-center`, `.if-self-start`, `.if-self-stretch`, `.if-justify-between`
- Rhythm: `.if-gap-0` through `.if-gap-6`, `.if-row-gap-*`, `.if-col-gap-*`, `.if-p-*`, `.if-px-*`, `.if-py-*`, `.if-pt-*`, `.if-pb-*`, `.if-mt-*`, `.if-mb-*`, `.if-mx-auto`, `.if-ml-auto`
- Text safety: `.if-truncate`, `.if-clamp-1`, `.if-clamp-2`, `.if-clamp-3`, `.if-nowrap`, `.if-wrap-anywhere`, `.if-measure`, `.if-tabular-nums`, `.if-min-w-0`, `.if-min-h-0`, `.if-max-w-full`
- Surfaces: `.if-surface`, `.if-surface-subtle`, `.if-surface-selected`, `.if-surface-success`, `.if-surface-warning`, `.if-surface-info`, `.if-surface-danger`
- Borders and shape: `.if-border`, `.if-border-subtle`, `.if-border-strong`, `.if-border-selected`, `.if-border-success`, `.if-border-warning`, `.if-border-danger`, `.if-rounded-none`, `.if-rounded`, `.if-rounded-sm`, `.if-rounded-lg`, `.if-rounded-pill`
- Positioning and overflow: `.if-overflow-auto`, `.if-overflow-x-auto`, `.if-overflow-y-auto`, `.if-overflow-hidden`, `.if-scroll-region`, `.if-scroll-shadow`, `.if-contain-inline`, `.if-sticky-top`, `.if-sticky-bottom`, `.if-relative`, `.if-inset-0`
- Production safety: `.if-focus-ring`, `.if-select-none`, `.if-pointer`, `.if-pe-none`, `.if-sm-*`, `.if-md-*`, `.if-lg-*`, `.if-print-hidden`, `.if-print-only`, `.if-print-block`, `.if-print-grid`, `.if-print-break-before`, `.if-print-break-after`, `.if-print-avoid`, `.if-print-surface-flat`, `.if-motion-safe`
- Height consistency: `.if-equal-height-grid` for repeated cards that should stretch together without forcing child overflow

Example:

```html
<section class="if-grid if-grid--auto if-gap-3" style="--if-auto-grid-min: 12rem">
  <article class="if-surface if-border if-rounded-sm if-p-3 if-flow if-flow--tight">
    <strong class="if-text-strong">Source Health</strong>
    <p class="if-text-xs if-text-muted if-m-0">Compact utility-composed status block.</p>
  </article>
</section>
```

For responsive composition, prefer the smallest utility that expresses the layout change:

```html
<section class="if-grid if-grid--detail if-gap-3 if-sm-stack">
  <main class="if-min-w-0">...</main>
  <aside class="if-sticky-top if-surface-subtle if-border if-rounded-sm if-p-3">...</aside>
</section>
```

Tailwind still leads on raw utility breadth, theme generation tooling, ecosystem adoption, variant combinatorics, and rapid arbitrary layout prototyping. This framework intentionally closes the most useful enterprise gaps with token-aware utilities and named components, while avoiding a full atomic-class clone.

## Themes

Apply a theme with `data-theme`:

```html
<div class="if-shell" data-theme="midnight">
  ...
</div>
```

Included themes:

- default light theme
- `system` as an explicit user preference for OS color-scheme matching
- `dark`
- `midnight` for backward-compatible dark enterprise surfaces
- `high-contrast`
- `calm`
- `executive`

Use behavior-layer controls when a site needs an in-product theme switcher:

```html
<button type="button" class="if-btn is-active" data-if-theme="light">Light</button>
<button type="button" class="if-btn" data-if-theme="dark">Dark</button>
<button type="button" class="if-btn" data-if-theme="high-contrast">High contrast</button>
<select class="if-select" data-if-theme-control>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="high-contrast">High contrast</option>
  <option value="system">System</option>
</select>
```

The browser bundle exposes `InterfaceFramework.setTheme()`, `InterfaceFramework.getTheme()`, and `InterfaceFramework.hydrateThemeControls()`. The account/profile dropdown examples use the same controls, so the "Jane Doe" surface can own user theme preference without page-specific JavaScript. See [`themes.md`](./themes.md) for the complete theme token contract, scoped theme examples, high-contrast guidance, and custom theme authoring.

Run `npm run theme:compile` after changing theme tokens. It regenerates [`theme-contrast-report.md`](./theme-contrast-report.md) and [`theme-contrast-report.json`](./theme-contrast-report.json), and `npm run validate` fails if any built-in theme drops below the contrast gate.

## JavaScript API

The browser bundle exposes `window.InterfaceFramework`:

```js
InterfaceFramework.init();
InterfaceFramework.hydrateIcons(document);
InterfaceFramework.hydrateAssets(document);
InterfaceFramework.setTheme("dark");
InterfaceFramework.openModal(document.querySelector("#confirm-modal"));
InterfaceFramework.closeModal();
InterfaceFramework.openDrawer(document.querySelector("#details-drawer"));
```

Most pages only need to include the script; it auto-initializes on load.

### Behavior Lifecycle API

The behavior layer is modular. `InterfaceFramework.init(root, options)` and `InterfaceFramework.destroy(root, options)` are the stable lifecycle entrypoints for host applications, route transitions, server-rendered partial updates, and embedded widgets. Both return the normalized root that was acted on, dispatch lifecycle events, and can run every core behavior or only a named subset. Page-level init defaults to `continueOnError: true`, registers document events first, and reports isolated module failures without disabling the rest of the page; pass `continueOnError: false` when a host build wants fail-fast behavior.

```js
// Hydrate an injected fragment without touching the rest of the page.
const panel = document.querySelector("#review-panel");
InterfaceFramework.init(panel, { modules: ["icons", "assets", "tables", "review-workflows"] });
InterfaceFramework.init(document, { modules: ["navigation", "overlays", "events"] });

// Tear down streams, adapters, menus, and delegated state before removing it.
InterfaceFramework.destroy(panel, { modules: ["visualization", "overlays", "tables"] });
InterfaceFramework.destroy(document, { modules: ["events"] });
panel.remove();
```

Core module names are stable: `themes`, `icons`, `assets`, `visualization`, `keyboard`, `navigation`, `overlays`, `forms`, `configuration`, `diagrams`, `tables`, `policy-diff`, `hierarchy`, `claims-history`, `review-workflows`, `documents`, `erd`, `graph`, and `events`.

Module introspection and extension APIs:

```js
InterfaceFramework.getBehaviorModules();
InterfaceFramework.initBehavior("graph", document);
InterfaceFramework.destroyBehavior("graph", document);

const unregister = InterfaceFramework.registerBehaviorModule({
  name: "host-router",
  description: "Synchronizes host routes with active framework navigation.",
  selectors: ["[data-host-route]"],
  init(root) {
    // Attach host-specific route state.
  },
  destroy(root) {
    // Remove route listeners or abort pending work.
  }
});

unregister();
```

Lifecycle events are emitted from the acted-on root: `if:framework-init:before`, `if:framework-init`, `if:framework-destroy:before`, `if:framework-destroy`, plus per-module `if:behavior-init:before`, `if:behavior-init`, `if:behavior-destroy:before`, `if:behavior-destroy`, and `if:behavior-*:error`.

Reusable behaviors exposed on the browser bundle include:

- Navigation, drawers, modals, tabs, accordions, popovers, and autocomplete.
- Charts, sparklines, icons, embedded asset slots, table controls, filters, and exports.
- Graph layouts, graph traversal, graph viewport controls, graph organization, and focus reset.
- Hierarchy explorers, claim trackers, history viewers, policy diffs, and document search/highlighting.

### Programmatic Component Control

When host code, tests, or an agent needs to operate a component, prefer the controller facade instead of simulating clicks or reaching into page-specific handlers:

```js
const table = InterfaceFramework.getComponentController("#policy-table");
table.reset();
table.refresh();

const wizard = InterfaceFramework.getComponentController("[data-if-wizard]");
wizard.select(2);

const account = InterfaceFramework.getComponentController("#account-popover-toggle");
account.open();
account.close({ restoreFocus: true });
```

Controller methods are intentionally consistent across component families:

- `open(options)` / `close(options)` for menus, popovers, collapsibles, and command surfaces.
- `toggle(options)` for disclosures, expandable surfaces, and pressed controls.
- `select(value, options)` for tabs, graph nodes, diagram items, hierarchy rows, date pickers, and wizards.
- `setState(state, options)` for richer modes such as graph viewport or diagram edit state.
- `reset(options)`, `refresh(options)`, and `destroy(options)` for lifecycle-safe host integration.

Use the lower-level helpers only when authoring host-owned wrappers: `setDisclosureState`, `setPressed`, `setSelected`, and `setExpanded`. See [`component-api.md#programmatic-behavior-contract`](./component-api.md#programmatic-behavior-contract) for the full contract.

Data-driven components have an explicit schema reference in [`data-schemas.md`](./data-schemas.md), including chart grammars, sparkline streaming attributes, generated chart-point metadata, table adapter params/results, and serialization helpers.

Accessibility and keyboard behavior are also explicit framework contracts. See [`accessibility.md`](./accessibility.md) for ARIA requirements, focus/fallback rules, and test expectations. See [`keyboard.md`](./keyboard.md) for the per-component keyboard matrix.

## Data Attribute Behaviors

- `data-if-nav-toggle`: toggles a sidebar or mobile navigation region
- `data-if-drawer-open="#drawer-id"`: opens a drawer
- `data-if-drawer-close`: closes a drawer
- `data-if-modal-open="#modal-id"`: opens a modal
- `data-if-modal-close`: closes a modal
- `data-if-tabs`: activates child ARIA tabs
- `data-if-tabs-source="#json-script"` / `data-if-tabs-json`: renders tab buttons, panels, and optional nested accordions from structured data
- `data-if-accordion-trigger` or `data-if-accordion`: toggles accordion panels
- `data-if-accordion-source="#json-script"` / `data-if-accordion-json`: renders accordion groups from structured data
- `data-if-filter`: filters `[data-if-filter-text]` items
- `data-if-autocomplete`: renders keyboard-accessible local search suggestions with highlighted matches
- `data-if-autocomplete-remote="policy-intelligence"`: emulates server-side/postback autosuggest with synthetic policy intelligence data
- `data-if-autocomplete-delay` / `data-if-autocomplete-limit`: controls mock remote latency and visible suggestion count
- `data-if-icon="search"`: hydrates a local dependency-free outline glyph
- `data-if-asset="./mark.svg"`: hydrates an embedded SVG/PNG/JPG/etc. asset slot with sizing, fallback, and export-safe handling
- `data-if-theme="dark"`: applies a named theme to the document, syncs active controls, persists the preference, and emits `if:theme-change`
- `data-if-theme-control`: wires a select/radio theme control to the same theme API
- `data-if-theme-target="#surface-id"`: scopes a theme control to one surface instead of the whole document
- `data-if-theme-label`: renders the current theme label
- `data-if-sparkline="1,3,2,5"`: renders a lightweight SVG trendline from numeric data
- `data-if-data-table`: initializes reusable table status, sorting, selection, and expansion behavior
- `data-if-table-sort="field"`: sorts rows using matching `data-sort-field` values or `[data-if-table-cell="field"]` text
- `data-if-table-filter="#table-id"`: filters a table from a search input and resets pagination to page 1
- `data-if-table-prev` / `data-if-table-next` / `data-if-table-page`: moves between client-side table pages
- `data-if-table-page-size`: changes rows per page and recalculates table ranges
- `data-if-table-select` / `data-if-table-select-all`: manages selected row styling and selected-count status
- `data-if-table-expand`: opens the following `data-if-table-detail` row for expanded record profiles
- `data-if-table-resizable="true"` / `data-if-table-width`: enables pointer column resizing and width persistence through CSS variables
- `data-if-table-pin="left|right"` / `data-if-table-pinned-columns`: creates sticky pinned columns for dense review and source tables
- `data-if-table-virtual="true"`: enables virtualized row windows for large client-side datasets
- `data-if-table-adapter="name"`: delegates sort, filter, pagination, loading, success, empty, error, and cancellation states to a registered server adapter
- `data-if-adapter-state`, `data-if-adapter-status`, and `data-if-adapter-retry`: expose the shared production adapter state contract across tables, autocomplete, graph layouts, exports, and document annotations
- `runAdapterTask(target, adapter, context, { channel })`: wrap any new production analytics adapter with abort signals, stale-request cancellation, loading/success/empty/error/cancelled states, generic events, and channel-scoped telemetry
- `InterfaceFramework.registerDataTableAdapter`, `refreshDataTable`, `setDataTableData`, `resizeDataTableColumn`, and `pinDataTableColumn`: public table APIs for production integration
- `data-if-control-var="--token-name"`: binds a range or input control to a CSS custom property on `data-if-control-target`
- `data-if-control-output="#output-id"` / `data-if-control-unit="rem"`: mirrors the live control value into documentation and app previews
- `data-if-demo-state="state-name"`: toggles a semantic preview class on `data-if-demo-target`
- `data-if-demo-state-prefix="if-custom-demo--"`: customizes the state class prefix for reusable specimen-specific demos
- `data-if-config-demo-source="#json-script"`: renders a complete configurable showcase from a JSON document
- Configurable showcases can combine both contracts, for example sliders targeting `#configurable-showcase-preview` and state buttons using `data-if-demo-state-prefix="if-showcase-state--"`
- `data-if-date-picker`: initializes the reusable date/calendar picker scope
- `data-if-date-grid`: renders a 7-column month grid with selected, today, and outside-month states
- `data-if-date-nav="prev|next|today"`: moves between months or returns to today
- `data-if-date-select="YYYY-MM-DD"`: declares/selects a date button and emits `if:date-picker-change`
- `data-if-date-output`, `data-if-date-summary`, and `data-if-date-month-label`: mirror the selected date and visible month
- `data-if-date-native`: syncs a native `type="date"` fallback for mobile and accessibility support
- `InterfaceFramework.setDatePickerValue(picker, "2026-05-20")`: public API for host-driven due-date or source-window selection
- `data-if-graph-layout="radial"`: switches graph node and edge layouts
- `data-if-graph-layout-engine="built-in|name"`: routes layout changes through a registered production layout adapter instead of only using static presets
- `data-graph-mode="unified"`: labels the default graph model where node clicks inspect, node drags arrange, and empty-canvas drags pan without mode switching
- `data-if-graph-status="mode|layout|nodes|edges|selected"`: live graph status targets updated by filtering, traversal, layouts, and interaction modes
- `data-if-graph-mode-label`: compact label target for graph HUDs or interaction guidance
- `data-if-graph-viewport="in|out|fit|reset"`: controls reusable graph viewport zoom and reset actions
- `.if-graph-viewport`: wraps graph nodes, edge labels, clusters, and SVG edges so the whole view can pan and zoom together
- `data-graph-world="expanded"` on `.if-graph-canvas`: creates a larger pannable graph world; combine with `--graph-world-width`, `--graph-world-height`, and graph root bounds such as `data-graph-min-x/y` and `data-graph-max-x/y`
- `.if-graph-organizer`: option panel for modifying layout presets without hard-coding production choices
- `data-if-graph-option="orientation|spacing|labelDensity|nodeDensity|edgeStyle|direction"`: applies reusable graph organization options
- `data-if-graph-organize="reset"`: restores graph organization controls to their default values
- `.if-graph-node[data-node-id]`: selects graph nodes, opens related panels and node context menus, supports hover quick-peeks, and can be dragged to update live edge geometry
- `data-node-type="policy|law|org|obligation|evidence|gap|custom"` or `data-node-kind="..."`: delegates node styling, icon defaults, color, labels, and type metadata through the graph node type registry
- `data-if-graph-context-action="focus|toggle-children|arrange|depth"`: action buttons used inside the generated node context menu; useful for production replacement with app-specific traversal commands
- `data-if-graph-edge`: selects and inspects a graph relationship label
- `data-if-graph-traverse="node-id"`: traverses from panels, breadcrumbs, or edges to a graph node
- `data-if-graph-cluster="cluster-id"`: expands or collapses dense graph neighborhoods from an existing graph node; pair the owner node with `data-if-graph-child-count`, `data-cluster-count`, `data-cluster-label`, `data-cluster-layout="branch"`, and child nodes/edges marked `data-cluster-member="cluster-id"` plus optional `data-cluster-offset-x/y` for serial node-to-node branches
- `data-if-graph-a11y`, `data-if-graph-a11y-summary`, `data-if-graph-a11y-nodes`, and `data-if-graph-a11y-edges`: render a keyboard-friendly graph fallback index from visible graph state
- `InterfaceFramework.registerGraphLayoutEngine`, `runGraphLayoutEngine`, `collectGraphLayoutInput`, and `applyGraphLayoutResult`: public APIs for external graph layout engines with async cancellation and apply events
- `InterfaceFramework.registerGraphNodeType`, `unregisterGraphNodeType`, `applyGraphNodeType`, `applyGraphNodeTypes`, and `getGraphNodeTypeConfig`: public APIs for production-owned node type palettes, icons, colors, labels, extra dataset fields, and per-type render hooks
- Clicking empty space inside `.if-graph-canvas` resets node/edge focus back to the seed graph context
- `data-if-focus-surface="graph|diagram|custom"`: standardizes selected/focused surface behavior across dense control surfaces
- `data-if-focus-detail`, `data-if-focus-item`, and `data-if-focus-exclude`: declare detail panels, selectable items, and click-off exceptions for reusable focus reset behavior
- `data-if-focus-clear`: clears the nearest focus surface; graph and diagram surfaces use their richer reset behavior automatically
- `data-if-hierarchy`: initializes parent-child hierarchy explorers for org charts and authority trees
- `data-if-hierarchy-toggle`: expands or collapses descendant hierarchy rows
- `data-hierarchy-node` / `data-hierarchy-parent`: define hierarchy row ids and parent-child relationships
- `data-hierarchy-type` / `data-hierarchy-kind`: delegates hierarchy styling, color, icon defaults, and readable type labels through the hierarchy node type registry
- `data-hierarchy-state="branch|leaf|dead-end"`: explicitly declares branch behavior when the DOM should override inferred children
- `data-hierarchy-child-count` and `data-hierarchy-load="lazy"`: expose unloaded descendants and emit `if:hierarchy-load` on expansion
- `data-hierarchy-panel="node-id"`: shows detail content for the selected hierarchy row
- `InterfaceFramework.applyHierarchyStructure`, `registerHierarchyNodeType`, `applyHierarchyNodeType`, `applyHierarchyNodeTypes`, and `getHierarchyNodeTypeConfig`: public APIs for production-owned hierarchy contracts
- `.if-landscape-hierarchy`: column-based full-landscape hierarchy for law-to-implementation drill-down views
- `.if-landscape-node`: selectable landscape node that can reuse `data-hierarchy-node` and matching `data-hierarchy-panel`
- `data-if-collapsible`: adds inline expand/collapse behavior to a card, panel, metadata section, or design-system specimen; pair it with `data-if-collapsible-toggle` and `data-if-collapsible-region`
- `InterfaceFramework.hydrateCollapsibleSurfaces(root)` and `InterfaceFramework.toggleCollapsibleSurface(button)`: public APIs for syncing or invoking collapsible card/panel state
- `data-if-surface-expand="#surface-id"`: expands or collapses reusable panels and work surfaces; `.if-expandable-surface` targets lock background scroll while inline targets only show or hide themselves
- `data-if-export="#surface-id"`: exports a target surface as PNG or downloadable PDF; graph, architecture, flow, topology, swimlane, boundary, and matrix diagram surfaces get structured canvas renders
- `data-if-export-adapter="name"` and `registerExportAdapter(name, adapter)`: route export through a production service while preserving loading, success, empty, error, cancelled, and retry states
- `data-if-export-cancel`: cancels a pending export for the target surface
- `data-if-connector-routing`: initializes a reusable SVG connector routing surface for architecture and diagram components
- `data-if-connector-node="node-id"`: declares an endpoint that connector routes can attach to
- `data-if-connector-route="route-id"` with `data-if-connector-from` / `data-if-connector-to`: declares a routed connector between two named endpoints
- `data-if-connector-style="direct|orthogonal|elbow|curved"` and `data-if-connector-tone="primary|async|guarded|success|danger"`: optional route geometry and semantic styling
- `data-if-claims`: initializes extracted-claim trackers with status timelines and detail panels
- `data-claim-id` / `data-claim-panel="claim-id"`: define selectable claim rows and matching detail content
- `data-if-history`: initializes item history viewers for policy records, claims, findings, source records, and organizations
- `data-history-event` / `data-history-panel="event-id"`: define selectable historical events and matching detail content
- `data-if-history-current`: optional label target updated when a history event is selected
- `data-if-policy-diff`: initializes policy line-change review interactions
- `data-if-diff-change`: selects a change and reveals matching detail panels
- `data-if-diff-prev` / `data-if-diff-next`: navigate line changes
- `data-if-diff-decision="Approved"`: writes a decision status to the selected change
- `data-if-keyboard-model="global|menus|tabs|tables|graphs|documents|reviewer|all"`: renders the formal keyboard contract into docs, training panels, or QA surfaces
- `data-if-review-workflow`: initializes a reviewer queue with roving selection, shortcut actions, counts, reason capture, and event ledger behavior
- `data-if-review-item="finding-id"` / `data-if-review-status="open"`: define selectable reviewer items and their current workflow state
- `data-if-review-action="approve|reject|escalate|assign|snooze|reopen"`: applies the chosen workflow transition to the selected review item
- `data-if-review-reason`: optional text/select control used as the decision reason for workflow transitions
- `data-if-review-count="approved|rejected|escalated|open|selected"`: live count target for reviewer workflow summaries
- `data-if-review-ledger`: optional ordered/list target that receives workflow transition entries
- `data-if-doc-workspace`: initializes the document/artifact intelligence viewer
- `data-if-doc-corpus="./data/policy-corpus.json"`: loads additional stored corpus records and renders them into the Documents tab
- `data-if-doc-source-list`: target list where corpus document source cards are appended
- `data-if-doc-source="artifact-id"`: selects an ingested artifact and updates metadata, original artifact, and reconstituted text panes
- `data-if-doc-artifact`: target region for the embedded original artifact
- `data-if-doc-viewer`: target region for reconstituted text, extracted lines, claims, organizations, references, and relationship highlights
- `data-if-doc-search`: filters and highlights extracted text using local mock search behavior
- `data-if-doc-highlight="claims|organizations|references|relationships"`: toggles semantic highlighting classes
- `data-if-doc-filter="claims|organizations|references|relationships|all"`: filters visible extracted lines by annotation type
- `data-if-doc-jump="line-id"`: scrolls to a matching reconstituted document line without narrowing the surrounding text context
- `data-if-doc-mode="reconstituted|embedded|split|metadata"`: switches an artifact between text, embedded source, side-by-side, and metadata-oriented review modes
- `data-if-doc-mode-current`: optional live text slot for the selected artifact mode
- `data-if-doc-annotation="org|claim|reference"` and `data-if-doc-annotation-value`: identify semantic marks that should receive tooltips, persistent selection, duplicate linking, and extracted-target navigation
- `data-if-doc-annotation-panel`: optional inspector panel updated when a semantic mark is selected; supports `data-if-doc-annotation-type`, `value`, `expansion`, `count`, `line`, `target`, and `matches` slots
- `data-if-doc-match-count`, `data-if-doc-visible-count`, `data-if-doc-query-count`, `data-if-doc-total-count`, and `data-if-doc-active-filter`: optional live status targets for viewer counts and active filters

The examples also use the bundled mockup layer to render synthetic widgets, source registries, agent rosters, audit logs, toasts, and filters. This layer is exposed as part of the demo bundle so the showcase behaves like a working application while the CSS classes remain reusable.

The synthetic data layer includes source-aware ingest objects for Federal Register, GovInfo/Congress.gov, DoD Issuances, Navy directives, OMB, NIST, CISA, and restricted repositories. These records demonstrate how adapters, extraction agents, relationship bundles, obligations, events, opportunities, and review findings should appear in the UI.

Governance and operations components are CSS-first patterns. Use `.if-pattern-grid` with `.if-pattern-card` for alert rules, provenance ledgers, degraded/access states, agent run evaluations, impact/opportunity chains, export/API contracts, and role-gated high-impact actions. These compose with existing badges, chips, metadata grids, alerts, history viewers, and policy diff controls.

## Extending

Prefer overriding tokens rather than rewriting component selectors:

```css
:root {
  --if-accent: #087b7a;
  --if-card-radius: 0.25rem;
  --if-control-height: 2.25rem;
}
```

For product-specific additions, compose new classes around primitives such as `.if-panel`, `.if-card`, `.if-toolbar`, `.if-table`, and `.if-node-card`.

For public website additions, compose around `.if-site-shell`, `.if-site-container`, `.if-site-hero`, `.if-profile-media`, `.if-publication-card`, `.if-reference-loop`, `.if-engagement-package`, `.if-public-search`, `.if-attribution-strip`, `.if-service-card`, `.if-insight-card`, `.if-resume-item`, and `.if-contact-grid`. See `examples/consulting.html` and `examples/adamboas.html` for homepage, services, engagement packages, public-site search, attribution, profile media, publication cards, reference architecture loops, resume, blog, and contact patterns.
