# Components

Accessibility and keyboard behavior are framework-level component contracts. Use [`accessibility.md`](./accessibility.md) for ARIA requirements and fallback rules, and [`keyboard.md`](./keyboard.md) for per-component key handling.

For API tables, variant matrices, and copy-paste examples across the full component inventory, use [`component-api.md`](./component-api.md).

## Capability Coverage Model

Treat each component family as complete only when it answers the same production questions:

| Lens | Coverage expectation |
| --- | --- |
| Visual anatomy | Base, compact, dense, expanded, selected, disabled, hover, focus, empty, loading, and error states share the same spacing, radius, border, type, and clipping rules. |
| Behavior contract | Interactive components expose stable `data-if-*` hooks, `init` / `destroy` lifecycle behavior, emitted events, keyboard behavior, and click-off / Escape cleanup where relevant. |
| Adapter readiness | Data-driven components expose loading, empty, error, cancel, retry, and success states; production services plug in through registered adapters or `runAdapterTask()` instead of bespoke page logic. |
| Accessibility | Components document ARIA roles, names, focus behavior, keyboard interactions, fallback modes, and screen-reader-safe state updates. |
| Responsive containment | Components define wrapping, scrolling, truncation, sticky, mobile, and overflow behavior rather than depending on page-specific fixes. |
| Theme and density | Components use design tokens, built-in light/dark/high-contrast themes, density controls, and scoped theme behavior without hard-coded one-off colors. |
| Docs and recipes | Components have manifest entries, API tables, copy-paste examples, recipes, event catalog entries, data schemas when applicable, and example links. |
| Tests and evidence | Components participate in static validation, behavior contracts, accessibility checks, Playwright visual baselines, browser accessibility checks, keyboard checks, and mobile smoke baselines. |

The executable version of this audit lives in `examples/components.html` under **Framework Inventory & Readiness**. Keep it synchronized with [`component-manifest.json`](./component-manifest.json), [`recipes.md`](./recipes.md), [`event-catalog.md`](./event-catalog.md), and [`data-schemas.md`](./data-schemas.md).

## Shell

```html
<div class="if-shell">
  <header class="if-topbar">...</header>
  <div class="if-main if-main--with-sidebar">
    <aside class="if-sidebar">...</aside>
    <main class="if-content">...</main>
  </div>
</div>
```

## Buttons

```html
<button class="if-btn if-btn--primary">
  <span class="if-icon-slot" data-if-icon="plus"></span>
  Primary
</button>
<button class="if-btn if-btn--secondary">Secondary</button>
<button class="if-btn if-btn--tertiary">Tertiary</button>
<button class="if-btn if-btn--danger">Delete</button>
<button class="if-icon-btn" aria-label="More">
  <span class="if-icon-slot" data-if-icon="more"></span>
</button>
```

Split buttons use the same menu primitive as other command menus. Add `data-if-menu-toggle` to the toggle button and `data-if-menu` to the menu surface. The JavaScript layer applies menu roles, roving `tabindex`, Arrow Up/Down, Home/End, Enter/Space selection, Escape return-to-toggle, and Tab close behavior.

```html
<div class="if-split-action-wrap">
  <div class="if-split-action" role="group" aria-label="Export options">
    <button class="if-btn if-btn--primary" type="button" data-if-menu-action="Export selected records">
      <span class="if-icon-slot" data-if-icon="download"></span>
      <span id="export-label">Export selected</span>
    </button>
    <button class="if-btn if-btn--primary if-split-action__toggle"
      type="button"
      aria-label="Choose export format"
      aria-expanded="false"
      data-if-menu-toggle="#export-menu">
      <span class="if-icon-slot" data-if-icon="chevronDown"></span>
    </button>
  </div>
  <div class="if-menu" id="export-menu" data-if-menu hidden>
    <button type="button" data-if-menu-item="CSV" data-if-menu-label="#export-label">CSV</button>
    <button type="button" data-if-menu-item="JSON" data-if-menu-label="#export-label">JSON</button>
    <button type="button" data-if-menu-item="PDF" data-if-menu-label="#export-label">PDF</button>
  </div>
</div>
```

## Icons

The optional JavaScript behavior layer hydrates local outline glyphs from `data-if-icon` attributes. The framework ships a small dependency-free icon registry for common app controls and graph/entity types; it is styled to match open-source 24px outline icon sets such as Lucide.

Domain icon coverage includes compact entity glyphs and circular seal-style authority marks such as `sealDod`, `sealDepartmentOfWar`, `sealArmy`, `sealNavy`, `sealMarineCorps`, `sealAirForce`, `sealSpaceForce`, `sealCisa`, `sealNist`, and `sealFederalRegister`. Use compact glyphs in dense tables and seal-style marks where provenance, hierarchy, or source authority needs a stronger visual anchor.

```html
<span class="if-icon-slot" data-if-icon="search"></span>
<button class="if-icon-btn" aria-label="Export">
  <span class="if-icon-slot" data-if-icon="download"></span>
</button>
<span class="if-icon-slot" data-if-icon="departmentOfWar"></span>
<span class="if-icon-slot" data-if-icon="combatantCommand"></span>
<span class="if-icon-slot" data-if-icon="obligation"></span>
```

Use the registry catalog component on design-system or audit pages when you need to show every icon currently shipped by the framework. It is generated from the same internal icon registry used by `data-if-icon`, so it stays synchronized with the behavior layer.

```html
<input class="if-input" type="search" data-if-icon-catalog-filter placeholder="Filter icons">
<div class="if-icon-catalog" data-if-icon-catalog aria-label="Available framework icons"></div>
```

Catalog classes include `.if-icon-catalog`, `.if-icon-catalog__section`, `.if-icon-catalog__grid`, and `.if-icon-swatch`. The JavaScript layer groups icons into operations, navigation, domain, and general categories. Add `data-if-icon-catalog-filter` to filter the generated catalog; clicking a swatch selects it and copies a reusable markup snippet when clipboard access is available.

Use asset slots when the diagram or card needs a real SVG/PNG/JPG/WebP/AVIF/GIF mark instead of a framework glyph. The behavior layer creates the image element, applies sizing variables, records load/error state, and falls back to a registry icon when the asset is unavailable.

```html
<span
  class="if-asset-slot if-asset-slot--brand"
  data-if-asset="./assets/approved-service-mark.svg"
  data-if-asset-alt="Approved service mark"
  data-if-asset-size="2rem"
  data-if-asset-fit="contain"
  data-if-asset-fallback-icon="shield">
</span>
```

Asset slots support `data-if-asset-width`, `data-if-asset-height`, `data-if-asset-position`, `data-if-asset-crossorigin`, and `data-if-asset-export`. Same-origin, blob, and data URI images can be included in PNG/PDF exports; cross-origin images should be CORS-enabled or marked `data-if-asset-export="false"` so export uses the fallback safely.

## Theme Controls

Use `data-theme` on `html`, `.if-shell`, or a scoped panel to apply a token overlay. Built-in themes include `light`, `dark`, `high-contrast`, `midnight`, `calm`, `executive`, and explicit `system`; omitting the attribute uses the light default.

```html
<button class="if-btn if-btn--secondary is-active" type="button" data-if-theme="light">Light</button>
<button class="if-btn if-btn--secondary" type="button" data-if-theme="dark">Dark</button>
<button class="if-btn if-btn--secondary" type="button" data-if-theme="high-contrast">High contrast</button>
<span data-if-theme-label>Light</span>
```

The JavaScript layer keeps controls synchronized and exposes `setTheme`, `getTheme`, and `hydrateThemeControls`. Full token and accessibility guidance lives in [`themes.md`](./themes.md).

## Inputs And Filters

```html
<label class="if-field">
  <span class="if-field__label">Authority level</span>
  <select class="if-select">
    <option>All levels</option>
  </select>
</label>

<label class="if-search">
  <span class="if-search__icon" aria-hidden="true">Q</span>
  <span class="if-sr-only">Search</span>
  <input class="if-input" type="search" placeholder="Search policies...">
</label>
```

## Autocomplete Search

Use `data-if-autocomplete` for local suggestions in a plain HTML search box. Suggestions can be a pipe-delimited string or JSON objects with `label`, `value`, `type`, `meta`, and `id`. The component supports highlighted query matches, mouse selection, arrow-key navigation, Enter, Escape, ARIA combobox attributes, and dispatches an `input` event after selection so it can pair with `data-if-filter`.

```html
<label class="if-search if-autocomplete">
  <span class="if-search__icon if-icon-slot" data-if-icon="search"></span>
  <input class="if-input"
    data-if-filter
    data-if-filter-target="#rows"
    data-if-autocomplete='[
      {"label":"Supplier Data Residency Obligation Missing","value":"Supplier Data Residency","meta":"High risk"},
      {"label":"CloudTrail Logging Requirement Gap","value":"CloudTrail Logging","meta":"Evidence gap"}
    ]'
    placeholder="Search findings...">
</label>
```

Use `data-if-autocomplete-remote` to emulate server-side autosuggest or wire to a production postback layer. The framework ships synthetic `policy-intelligence` providers for examples; production systems register named adapters with `registerAutocompleteAdapter(name, adapter)`. Adapters receive an `AbortSignal`, return arrays or structured `{ items, state, title, message }` payloads, and can represent loading, success, empty, error, and cancelled states without custom page rendering. Remote autocomplete also participates in the shared adapter lifecycle: `data-if-adapter-state`, `if:adapter-state`, `data-if-adapter-status`, and `data-if-adapter-retry="#search-id"` work the same way they do for tables, graph layouts, and exports. Use `getAutocompleteState(input)` to inspect query, provider, result state, adapter state, active option, selected suggestion, and visible option metadata.

```html
<label class="if-search if-autocomplete">
  <span class="if-search__icon if-icon-slot" data-if-icon="search"></span>
  <input class="if-input"
    type="search"
    data-if-autocomplete-remote="policy-intelligence"
    data-if-autocomplete-delay="220"
    data-if-autocomplete-limit="8"
    placeholder="Search policies, sources, organizations...">
</label>
```

```js
window.InterfaceFramework.registerAutocompleteAdapter("policy-api", async ({ query, limit, signal }) => {
  const response = await fetch("/api/policy-search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, limit }),
    signal
  });

  if (!response.ok) throw new Error("Policy search is temporarily unavailable.");
  const { results } = await response.json();
  return results.length
    ? results
    : { items: [], state: "empty", title: "No records found", message: "Broaden the query or remove filters." };
});
```

The framework cancels older remote requests when the query changes, when the menu closes, and when `destroy(root)` removes a hydrated surface. Listen for `if:autocomplete-request`, `if:autocomplete-results`, `if:autocomplete-cancel`, `if:autocomplete-error`, `if:autocomplete-state`, and `if:adapter-state` for telemetry, loading indicators outside the menu, or server-side analytics. Selection can write a summary to `data-if-autocomplete-output`, and `data-if-autocomplete-cancel="#search-id"` aborts a pending request from a nearby control surface.

## Validation, Tooltips, And Behavior API

The optional JavaScript layer exposes reusable behavior contracts through `data-if-*` attributes and the global `window.InterfaceFramework` bundle API. Use `init(root)` after injecting markup, and `destroy(root)` before removing a hydrated surface that owns live streams or global interactions.

The lifecycle API is module-aware. Use `init(root, { modules: ["icons", "tables"] })` or `destroy(root, { modules: ["visualization", "overlays"] })` when a host application swaps only part of the page. `getBehaviorModules()` lists stable core modules, while `registerBehaviorModule()` lets a production app add host-specific behavior without forking the framework.

```html
<form data-if-form data-if-form-live-summary="true" data-if-form-success="Decision validated" novalidate>
  <div class="if-form-summary" data-if-form-summary role="alert" aria-live="polite" hidden></div>
  <label class="if-field" data-if-validate="required min:8"
    data-if-field-label="Decision reason"
    data-if-error="Use at least 8 characters."
    data-if-warning="Add more context."
    data-if-valid="Looks ready.">
    <span class="if-field__meta">
      <span class="if-field__label">Decision reason <span class="if-field__required">*</span></span>
      <button class="if-icon-btn if-icon-btn--sm" type="button"
        data-if-tooltip="Explain the decision in language a reviewer can audit."
        data-if-tooltip-placement="right"
        aria-label="Decision reason help">
        <span class="if-icon-slot" data-if-icon="alert"></span>
      </button>
    </span>
    <span class="if-field__hint" data-if-field-help>Required before approving, rejecting, or escalating a finding.</span>
    <input class="if-input" type="text">
    <span class="if-field__feedback" data-if-field-feedback></span>
  </label>
  <button class="if-btn if-btn--primary" type="submit">Validate decision</button>
</form>
```

Validation helpers apply `.if-field--valid`, `.if-field--invalid`, or `.if-field--warning`, update `aria-invalid`, wire help text and feedback into `aria-describedby`, write feedback text, render clickable `.if-form-summary` error summaries, and emit `if:field-validate`, `if:field-state`, and `if:form-validate` events. Tooltip helpers use `data-if-tooltip`, hover/focus activation, `data-if-tooltip-placement`, `data-if-tooltip-offset`, collision-aware placement scoring, viewport clamping, arrow anchoring, and top-layer Escape close.

Tooltip placement accepts `top`, `bottom`, `left`, `right`, or `auto`. When the preferred side would collide with the viewport, the behavior layer scores fallback placements by visible area and alignment cost, then clamps the tooltip inside the configured margin. Escape closes one active behavior layer at a time in this order: tooltip, autocomplete, menu, popover, modal, drawer, then focus-surface selection.

```js
window.InterfaceFramework.init(document);
window.InterfaceFramework.cancelAutocomplete(document.querySelector("[data-if-autocomplete-remote]"));
window.InterfaceFramework.validateField(document.querySelector("[data-if-validate] input"));
window.InterfaceFramework.validateForm(document.querySelector("[data-if-form]"));
window.InterfaceFramework.setFieldState(document.querySelector(".if-field"), "warning", "Needs more detail.");
window.InterfaceFramework.destroy(document);
```

## Enterprise Utility Cluster

Use `.if-utility-cluster` inside `.if-topbar__actions` for the compact enterprise control group shown in the wireframes: global search, notifications, and account identity.

```html
<div class="if-topbar__actions if-utility-cluster">
  <label class="if-search if-autocomplete if-utility-search if-desktop-only">
    <span class="if-search__icon if-icon-slot" data-if-icon="search"></span>
    <input class="if-input" data-if-autocomplete-remote="policy-intelligence" placeholder="Search policies, sources, organizations...">
  </label>
  <div class="if-popover if-notification-menu" data-if-popover>
    <button class="if-icon-btn if-notification-btn"
      aria-label="Notifications"
      aria-expanded="false"
      aria-controls="global-notifications"
      data-if-popover-toggle="global-notifications">
      <span class="if-icon-slot" data-if-icon="bell"></span>
      <span class="if-notification-btn__badge">3</span>
    </button>
    <section class="if-popover__panel if-notifications" id="global-notifications" role="dialog" aria-label="Notifications" hidden>
      <header class="if-notifications__header">
        <div>
          <h2>Notifications</h2>
          <p>3 unread intelligence events</p>
        </div>
        <button class="if-btn if-btn--sm" data-if-notification-read>Mark read</button>
      </header>
      <div class="if-notifications__body">
        <a class="if-notification-item if-notification-item--unread if-notification-item--warning" href="#">
          <span class="if-notification-item__icon if-icon-slot" data-if-icon="warning"></span>
          <span class="if-notification-item__content">
            <strong class="if-notification-item__title">Implementation gap escalated</strong>
            <span class="if-notification-item__meta">Supplier data residency obligation requires reviewer action.</span>
          </span>
          <span class="if-notification-item__time">8m</span>
        </a>
      </div>
    </section>
  </div>
  <div class="if-popover if-account-popover" data-if-popover>
    <button class="if-account-menu"
      aria-label="Account menu"
      aria-expanded="false"
      aria-controls="global-account-menu"
      data-if-popover-toggle="global-account-menu">
      <span class="if-avatar">JD</span>
      <span class="if-account-menu__name">Jane Doe</span>
      <span class="if-icon-slot if-account-menu__chevron" data-if-icon="chevronDown"></span>
    </button>
    <section class="if-popover__panel if-account-surface" id="global-account-menu" role="dialog" aria-label="Account controls" hidden>
      <header class="if-account-surface__header">
        <span class="if-account-surface__avatar">JD</span>
        <span class="if-account-surface__identity">
          <strong>Jane Doe</strong>
          <span>Policy Reviewer - Data Governance</span>
          <span>jane.doe@example.mil</span>
        </span>
      </header>
      <div class="if-account-surface__body">
        <a class="if-account-action" href="#">
          <span class="if-account-action__icon if-icon-slot" data-if-icon="home"></span>
          <span class="if-account-action__content">
            <strong class="if-account-action__title">My Daily Overview</strong>
            <span class="if-account-action__meta">Default landing page</span>
          </span>
          <span class="if-badge if-badge--info">Default</span>
        </a>
        <section class="if-account-surface__section" aria-label="Preferences">
          <span class="if-account-surface__label">Preferences</span>
          <div class="if-account-theme-control" aria-label="Theme preference">
            <span class="if-account-theme-control__label">Theme</span>
            <div class="if-account-theme-control__options" role="group" aria-label="Theme preference">
              <button class="if-btn if-btn--secondary if-btn--sm is-active" type="button" data-if-theme="light" aria-pressed="true">Light</button>
              <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-theme="dark" aria-pressed="false">Dark</button>
              <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-theme="high-contrast" aria-pressed="false">High contrast</button>
            </div>
            <span class="if-account-theme-control__current">Current: <strong data-if-theme-label>Light</strong></span>
          </div>
        </section>
      </div>
    </section>
  </div>
</div>
```

## Utility Composition

Use utility classes for small composition and safety needs that recur across components. The utility layer covers stack/flow rhythm, cluster layouts, flex/grid display, auto grids, sidebar/detail grid templates, gaps, padding, margins, text safety, width constraints, overflow containment, sticky positioning, tokenized surfaces, semantic borders, focus rings, print visibility, and reduced-motion safety.

```html
<section class="if-grid if-grid--auto-md if-gap-3 if-equal-height-grid">
  <article class="if-surface if-border if-rounded-sm if-p-3 if-flow if-flow--tight">
    <h3 class="if-m-0">Policy lineage</h3>
    <p class="if-clamp-2 if-text-xs if-text-muted">
      NDAA FY2025 / EO 14250 / DoDI 5200.01 / SECNAV Memo 25-104
    </p>
  </article>
  <aside class="if-surface-warning if-border-warning if-rounded-sm if-p-3">
    <strong class="if-text-warning">Evidence gap</strong>
  </aside>
</section>
```

Keep utilities close to layout and resilience. Use named components for reusable domain objects such as graph nodes, claim rows, metadata ledgers, document annotations, source cards, and architecture stages.

## Route-Aware Navigation

Use `data-if-route-nav` for navigation surfaces whose active state should be derived from the current route or from a host router. The behavior layer compares each link `href` or optional `data-if-route` value, applies `.is-active` and `aria-current="page"`, and updates any `[data-if-route-current]` labels inside the nav. The same contract can drive desktop topbars, mobile drawers, bottom bars, route switchers, and in-page demo controls.

```html
<nav class="if-mobile-bottom-nav" data-if-route-nav aria-label="Mobile navigation">
  <a href="./index.html" data-if-route-label="Overview">
    <span class="if-icon-slot" data-if-icon="dashboard"></span>
    Overview
  </a>
  <a href="./graph-view.html" data-if-route-label="Graph">
    <span class="if-icon-slot" data-if-icon="graph"></span>
    Graph
  </a>
  <a href="./review.html" data-if-route-label="Review">
    <span class="if-icon-slot" data-if-icon="check"></span>
    Review
  </a>
</nav>
```

For client-side routers, call `setRouteNavigation(nav, route)` after a route transition. Use `data-if-route-match="prefix"` for section families such as `/sources/*`, or `data-if-route-match="hash"` when a route should include the URL fragment.

```js
const nav = document.querySelector("[data-if-route-nav]");
window.InterfaceFramework.setRouteNavigation(nav, "/examples/graph-view.html");
```

## Charts And Analytics

Use `data-if-chart` for dependency-free SVG/HTML charts. Supported chart types are `bar`, `grouped-bar`, `stacked-bar`, `line`, `pie`, `heatmap`, `gauge`, `bullet`, `histogram`, `funnel`, `scatter`, and `treemap`. Most charts use pipe-delimited `Label:Value` pairs; grouped and stacked charts use `Category:Series=Value,Series=Value`; heatmaps use semicolon-delimited rows with comma-delimited values; scatter plots use `Label:x,y,size`. Rendered chart points expose hover/focus tooltips, animated entry, keyboard-accessible emphasis states, and legend-based series toggles where relevant.

For exact chart, sparkline, and table-adapter payload contracts, see [`docs/data-schemas.md`](./data-schemas.md). The schema reference includes the attribute grammar, object-shaped equivalents for server adapters, generated point metadata, and serialization helpers.

```html
<section class="if-chart-card">
  <header class="if-chart-card__header">
    <div>
      <h3 class="if-chart-card__title">Issuances by Type</h3>
      <p class="if-chart-card__meta">Canonical corpus count</p>
    </div>
    <span class="if-badge if-badge--info">Bar</span>
  </header>
  <div data-if-chart="bar"
    data-if-chart-label="Issuances by type"
    data-if-chart-data="Instructions:130|Memos:84|Manuals:52|Guides:41|Directives:29"></div>
</section>

<div data-if-chart="line"
  data-if-chart-data="2020:58|2021:71|2022:64|2023:89|2024:112|2025:146"></div>

<div data-if-chart="pie"
  data-if-chart-data="Reviewed:156|In Review:83|Needs Review:128|Blocked:9"></div>

<div data-if-chart="heatmap"
  data-if-chart-data="DoD:22,44,71,93;SECNAV:14,25,36,51;OMB:9,18,24,32"></div>

<div data-if-chart="stacked-bar"
  data-if-chart-data="DoD:Extracted=184,Validated=156,Blocked=18|SECNAV:Extracted=122,Validated=98,Blocked=11"></div>

<div data-if-chart="grouped-bar"
  data-if-chart-data="Claims:Opened=42,Closed=31,Escalated=6|Policies:Opened=18,Closed=14,Escalated=3"></div>

<div data-if-chart="gauge"
  data-if-chart-data="Relationship Linker:86"
  data-if-chart-target-value="90"></div>

<div data-if-chart="bullet"
  data-if-chart-data="Freshness:91|Parser:74|Coverage:83"
  data-if-chart-max="100"
  data-if-chart-target-value="85"></div>
```

Interactive controls can target any chart by selector:

```html
<label class="if-chart-control">
  <span class="if-chart-control__label">
    Minimum value <strong data-if-chart-threshold-value="#coverage-chart">40</strong>
  </span>
  <input class="if-range" type="range" min="0" max="140" value="40"
    data-if-chart-threshold data-if-chart-target="#coverage-chart">
</label>

<label class="if-chart-control">
  <span class="if-chart-control__label">
    Chart height <strong data-if-chart-height-value="#coverage-chart">13rem</strong>
  </span>
  <input class="if-range" type="range" min="9" max="18" value="13"
    data-if-chart-height data-if-chart-target="#coverage-chart">
</label>
```

Use `.if-chart-card--interactive` and `.if-chart-controls` when a chart needs a visible control surface. `data-if-chart-threshold` dims points below the slider value; `data-if-chart-height` updates the chart canvas height. Bars, grouped bars, stacked segments, lines, pie segments, heatmap cells, gauges, and bullet rows include animated entry, hover, focus, active, and muted states.

Dataset buttons can reuse the same chart surface:

```html
<button
  class="if-btn if-btn--secondary if-btn--sm"
  data-if-chart-dataset
  data-if-chart-target="#coverage-chart"
  data-if-chart-label="Finding volume"
  data-if-chart-data="Open:128|Blocked:18|Approved:142">
  Findings
</button>
```

The framework re-renders the chart, preserves active button state, and reapplies any threshold or height controls for that target.

## Performance And Scale Lab

Use the performance lab when a page or component family needs proof that large synthetic data remains responsive and contained. The lab is intentionally on-demand: it generates large table, graph, diagram, document, and chart surfaces only when `runPerformanceLab()` is called or when a lab opts into `data-if-performance-auto`.

```html
<article class="if-performance-lab"
  data-if-performance-lab
  data-if-performance-profile="balanced"
  data-if-performance-auto="balanced">
  <button type="button" data-if-performance-run="mobile">Mobile smoke</button>
  <button type="button" data-if-performance-run="balanced">Balanced</button>
  <button type="button" data-if-performance-run="large">Large data</button>

  <div data-if-performance-table data-if-overflow-check data-if-overflow-mode="scroll"></div>
  <div data-if-performance-graph data-if-overflow-check></div>
  <div data-if-performance-diagram data-if-overflow-check data-if-overflow-mode="scroll"></div>
  <div data-if-performance-document data-if-overflow-check data-if-overflow-mode="scroll"></div>
  <div data-if-performance-charts data-if-overflow-check></div>
</article>
```

The default profiles are `mobile`, `balanced`, and `large`. Each profile has counts and budgets for rows, nodes, edges, diagram boxes, document lines, chart points, and total render time. Use `measureOverflow(root)` to distinguish uncontained overflow from intentional internal scroll regions. A scroll region should declare `data-if-overflow-mode="scroll"` so the lab treats it as contained rather than broken page overflow.

```js
const result = window.InterfaceFramework.runPerformanceLab(
  document.querySelector("[data-if-performance-lab]"),
  "large"
);

console.log(result.totalMs, result.budget.passed, result.overflow.failures.length);
```

The lab evaluates timing and overflow through `evaluatePerformanceBudgets(profile, sections, overflow, totalMs)` and emits `if:performance-run` with the profile, measured section timings, total timing, overflow report, normalized `budget` result, and pass/failed state. Use `docs/performance-budgets.md` as the release-gate source of truth for the built-in profile thresholds.

## Configuration And Demo Controls

Design-system and sandbox pages can expose token-driven configuration without page-specific scripts. Use `data-if-control-var` to bind a range input to a CSS custom property on a target:

```html
<input
  type="range"
  min="0"
  max="12"
  value="4"
  data-if-control-var="--if-card-radius"
  data-if-control-unit="px"
  data-if-control-target="#preview"
  data-if-control-output="#radius-output">
```

Use `data-if-demo-state` for preview states:

```html
<button
  data-if-demo-state="warning"
  data-if-demo-target="#preview"
  aria-pressed="false">
  Warning
</button>
```

The target receives a class like `.is-demo-state-warning`. This is useful for documenting state, motion, density, and semantic variants in the control library.

The design-system examples include three reusable playground families:

- `.if-config-playground` with `.if-config-preview`: general spacing, radius, motion speed, progress, and semantic state testing
- `.if-showcase-lab` with `.if-showcase-preview`: composed component showcases controlled by CSS-variable knobs and semantic state presets
- `.if-surface-preview` with `.if-surface-sample`: joined surfaces, accent weight, elevation, density, metadata tiles, and button-group rhythm
- `.if-motion-lab`: enter, focus, queued, and exit transitions with tokenized duration, distance, progress, and stacked-card offsets
- `.if-framework-customization-lab`: audit-level demonstration harness for scenario presets, token sliders, live progress meters, preview contracts, and implementation notes

Use `data-if-demo-state-prefix` when a specimen needs named semantic states instead of the default `.is-demo-state-*` classes:

```html
<button
  data-if-demo-state="reviewer"
  data-if-demo-state-prefix="if-custom-demo--"
  data-if-demo-target="#preview">
  Reviewer
</button>
```

The preview receives `.if-custom-demo--reviewer`, letting the specimen switch tone, density, or operational emphasis without custom scripts.

For full component showcases, pair both APIs on the same preview. Bind sliders to specimen-scoped variables such as `--showcase-density`, `--showcase-radius`, `--showcase-accent-width`, `--showcase-elevation`, and `--showcase-progress`, then use `data-if-demo-state-prefix="if-showcase-state--"` for operational, review, blocked, or executive states. This keeps the demo portable: consumers can copy the markup, replace the synthetic data, and preserve the same configuration behavior in plain HTML.

Generated configuration demos can use `data-if-config-demo-source="#json-script"` or `data-if-config-demo-json`. The renderer creates a controls column, range outputs, state buttons, and a preview surface from `{ title, description, targetId, controls, states, preview }`. Component inventory surfaces can use `data-if-component-inventory`, `data-if-component-manifest`, `data-if-component-inventory-deficiency-source`, `data-if-inventory-id`, `data-if-component-inventory-filter`, `data-if-component-inventory-active-filters`, `data-if-component-inventory-category`, `data-if-component-inventory-category-set`, `data-if-component-inventory-capability`, `data-if-component-inventory-capability-set`, `data-if-component-inventory-status`, `data-if-component-inventory-risk`, `data-if-component-inventory-sort`, `data-if-component-inventory-preset`, `data-if-component-inventory-motion`, `data-if-component-inventory-scorecard`, `data-if-component-inventory-release-gate`, `data-if-component-inventory-risk-register`, `data-if-component-inventory-deficiency-assessment`, `data-if-component-inventory-report`, `data-if-component-inventory-actions`, `data-if-component-inventory-evidence-matrix`, `data-if-component-inventory-capability-coverage`, `data-if-component-inventory-view-state`, `data-if-component-inventory-snapshot`, and `data-if-component-inventory-detail` to make manifest-aligned readiness cards searchable, inspectable, risk-filterable, active-filter-chip aware, category-drillable, capability-gap-drillable, preset-aware, sort-aware, keyboard-navigable with roving selection, motion-aware, scorecard summarized, release-gate aware, risk-register aware, deficiency-assessment aware, package-backlog aware, category-rollup aware, action-queue aware, evidence-lens aware, capability-coverage aware, machine-readable, view-state-persistable, and enriched with card-level evidence strips, selectable risk/action controls, selected-component actions, manifest classes, attributes, APIs, events, docs, examples, accessibility notes, use guidance, avoid guidance, and recipes. Public APIs: `renderConfigurationDemo(root, config)`, `hydrateConfigurationControls(root)`, `hydrateComponentInventories(root)`, `getConfigurationState(root)`, `getComponentInventoryState(root)`, `getComponentInventoryViewState(root)`, `applyComponentInventoryViewState(root, viewState)`, `applyComponentInventoryPreset(control)`, `clearComponentInventoryFilter(control)`, `getComponentInventoryReadinessReport(root)`, `getComponentInventoryReadinessScorecard(root)`, `getComponentInventoryReadinessActions(root)`, `getComponentInventoryDeficiencyBacklog(root)`, `getComponentInventoryDeficiencyAssessment(root)`, `getComponentInventoryEvidenceMatrix(root)`, `getComponentInventoryCapabilityCoverage(root)`, `getComponentInventoryReadinessSnapshot(root)`, `getComponentInventoryReleaseGate(root)`, `getComponentInventoryRiskRegister(root)`, `setComponentInventoryCapabilityFilter(control)`, `setComponentInventoryCategoryFilter(control)`, `applyComponentInventoryFilters(rootOrControl)`, `selectComponentInventoryCard(rootOrCard, cardOrId)`, `moveComponentInventorySelection(rootOrCard, direction)`, `setControlVariable(control)`, and `setDemoState(control)`.

```html
<div data-if-config-demo data-if-config-demo-source="#config-demo"></div>
<script type="application/json" id="config-demo">
{
  "targetId": "preview",
  "controls": [
    { "label": "Density", "property": "--showcase-density", "value": 0.7, "unit": "rem" }
  ],
  "states": [
    { "label": "Operational", "state": "operational", "prefix": "if-showcase-state--", "active": true }
  ]
}
</script>
```

## Architecture Diagrams

Use architecture diagram primitives to compose source-aware deployment diagrams without leaving the framework. The pattern is built from stage containers, service tiles, service variants, connector semantics, layer toggles, guarded service states, platform bands, interface contracts, and legends. See `examples/diagrams.html` for a full Azure deployment architecture reconstruction.

Diagram, graph, and other inspector-heavy surfaces should opt into the shared focus-surface contract. Add `data-if-focus-surface`, list selectable items with `data-if-focus-item`, list detail panels with `data-if-focus-detail`, and add `data-if-focus-clear` to close controls. The framework also injects close controls into standard panel headers where possible, supports click-off dismissal, listens for `Escape`, and emits `if:focus-select` / `if:focus-clear` events for host applications.

Add `data-if-diagram-search` to a standard `.if-search` input when the diagram needs node search. The behavior searches visible node text plus diagram metadata, dims nonmatches, highlights matching text inside nodes with `.if-diagram-search-mark`, adds ranked badges, focuses the first result, updates `[data-if-diagram-search-status]`, can render clickable results into `[data-if-diagram-search-results]`, directly binds previous/next/clear controls during diagram init, syncs multiple search inputs that target the same diagram, and emits `if:diagram-search`.

For dense diagrams, add `.if-diagram-status-bar` with `[data-if-diagram-stat]` fields for `visible`, `layers`, `matches`, `selected`, and `hidden-layers`. The diagrams behavior keeps these fields synchronized as users search, toggle layers, select nodes, or clear focus. Diagram items also support keyboard traversal: arrow keys move across visible nodes, `Home`/`End` jump to the ends, and `Enter`/`Space` opens the detail panel.

For controlled editing, add `data-if-diagram-edit-toggle`, `data-if-diagram-edit-tool`, `data-if-diagram-layout-save`, `data-if-diagram-layout-load`, and `data-if-diagram-layout-reset` controls plus optional `[data-if-diagram-edit-field]` inputs inside the detail panel. Edit mode is intentionally tool-based: `inspect` opens details, `text` enables editable fields and direct inline title/description editing on the selected node, `move` enables node dragging, arrow-key nudging, and optional `[data-if-diagram-nudge]` buttons, `connect` creates routed connectors by selecting source and target nodes, `style` enables `[data-if-diagram-style-tone]`, `add` creates a draft node and switches into text editing, and `delete` hides a node or removes a selected connector from the saved session layout. Add `[data-if-diagram-add-from-source]` to create a node from source JSON in the selected container, `[data-if-diagram-duplicate-node]` to copy the selected node into its current parent container with that container's formatting, `[data-if-diagram-reorder="up|down"]` to move the selected node earlier or later inside that container, `[data-if-diagram-clear-selection]` to close the active node or route editor, `[data-if-diagram-copy-selected]` to place the active node or route JSON on the clipboard, `[data-if-diagram-apply-selected]` to patch the active node or route from the source editor, `[data-if-diagram-reset-selected]` to restore the active baseline node or route without resetting the whole diagram, `[data-if-diagram-delete-selected]` to remove the active route or selected node without switching tools, and `[data-if-diagram-undo-delete]` when the surface should restore the last node or route hidden in the current edit session. Layout snapshots contain layer state, CSS variable controls, node offsets, editable metadata, dynamic nodes, typed node styling, DOM order, and session-created connector routes, so a host app can start with session storage and later swap in `registerDiagramLayoutAdapter()` without changing markup.

For source-driven diagrams, add `[data-if-diagram-source]` to a textarea plus `[data-if-diagram-source-refresh]`, `[data-if-diagram-source-validate]`, `[data-if-diagram-source-format]`, and `[data-if-diagram-source-apply]` controls. `collectDiagramDocument()` serializes visible diagram nodes and connector routes to a `DiagramDocument` with `schemaVersion`, `nodes`, `edges`, ownership metadata, section/container ids, typed node styling, and offsets. `applyDiagramDocument()` validates ids, updates matching nodes in place, creates missing nodes inside declared containers, re-renders connector routes, and deduplicates dynamic nodes so repeated Apply JSON actions do not stack duplicate cards. The source editor accepts raw JSON, saved layout snapshots by reading their `document` property, and JSON inside Markdown code fences. Optional `[data-if-diagram-source-copy]`, `[data-if-diagram-source-download]`, and `[data-if-diagram-source-import]` controls let authors move the same source between the live editor, docs, and files without custom host code.

Typed diagram nodes use the same registry idea as graph and hierarchy nodes. Add `data-diagram-node-type="source|workflow|agent|search|graph|storage|governance|outcome|review|service|custom"` to declare semantic intent. Optional `data-diagram-node-layout="tile|compact|media|metric|capability|pipeline|callout"`, `data-diagram-node-background="surface|subtle|tint|soft|outline|inverted"`, and `data-diagram-node-icon="database"` control the visual contract without changing the component markup. The style editor can bind selects to `data-if-diagram-node-type`, `data-if-diagram-node-layout`, `data-if-diagram-node-background`, and `data-if-diagram-node-icon`. The connect tool can bind `data-if-diagram-route-label`, `data-if-diagram-route-style`, and `data-if-diagram-route-tone` so new edges use host-defined label and route defaults.

Connector labels are selectable editor controls, not static decoration. Click a connector label or call `selectDiagramConnectorRoute(routeOrLabel)` to populate the detail panel with the route contract. While edit mode is active, route controls can change the label, tone, style, endpoint anchors, node-avoidance, and a manual bend waypoint through `data-if-diagram-route-from-anchor`, `data-if-diagram-route-to-anchor`, `data-if-diagram-route-avoid`, `data-if-diagram-route-waypoint-x`, `data-if-diagram-route-waypoint-y`, and `data-if-diagram-route-clear-waypoint`. Delete mode, `[data-if-diagram-route-delete]`, or `Delete`/`Backspace` on a focused connector label removes the session route and emits `if:diagram-route-delete`; `undoDiagramDelete()` or `[data-if-diagram-undo-delete]` restores the last deleted node or connector and emits `if:diagram-delete-undo`. The default `orthogonal` route is smart: it scores candidate paths and attempts to route around diagram nodes before falling back to direct or curved geometry.

Node type APIs: `registerDiagramNodeType(type, config)`, `unregisterDiagramNodeType(type)`, `getDiagramNodeTypeConfig(type)`, `applyDiagramNodeType(item, type, options)`, `applyDiagramNodeTypes(root)`, `setDiagramItemLayout(item, layout)`, `setDiagramItemBackground(item, background)`, and `setDiagramItemIcon(item, icon)`. Config objects accept `{ label, className, color, icon, layout, background }` so production apps can add domain-specific node types while keeping the renderer framework-owned.

```html
<section class="if-architecture-diagram" data-if-diagram data-if-diagram-layout-key="azure-architecture">
  <header class="if-architecture-header">
    <div>
      <h1 class="if-architecture-header__title">Policy Intelligence - Azure Deployment Architecture</h1>
      <p class="if-architecture-header__subtitle">Container-first, source-aware, agent-enabled architecture.</p>
    </div>
  </header>

  <div class="if-diagram-layer-controls">
    <button class="if-btn if-btn--secondary if-btn--sm"
      type="button"
      aria-pressed="true"
      data-if-diagram-layer-toggle="sources">
      Sources
    </button>
  </div>

  <label class="if-search">
    <span class="if-search__icon if-icon-slot" data-if-icon="search"></span>
    <input class="if-input" type="search"
      data-if-diagram-search
      data-if-diagram-search-status="[data-if-diagram-search-status]"
      placeholder="Search diagram nodes">
  </label>
  <span data-if-diagram-search-status>Search diagram nodes.</span>

  <div class="if-diagram-layout-controls">
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-edit-toggle aria-pressed="false">Edit layout</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-edit-tool="text" aria-pressed="false">Text</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-edit-tool="move" aria-pressed="false">Move</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-edit-tool="connect" aria-pressed="false">Connect</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-edit-tool="style" aria-pressed="false">Style</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-add-node>Add node</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-layout-save>Save session</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-layout-load>Load</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-layout-reset>Reset</button>
    <span class="if-diagram-layout-status" data-if-diagram-layout-status>Session layout ready</span>
    <span class="if-diagram-tool-status" data-if-diagram-tool-status>Turn on edit mode to modify diagram content or layout.</span>
  </div>

  <div class="if-architecture-board">
    <section class="if-arch-stage if-arch-stage--external" data-diagram-layer="sources">
      <header class="if-arch-stage__header">
        <span class="if-arch-stage__num">1</span>
        <h2 class="if-arch-stage__title">External Sources</h2>
      </header>
      <article class="if-arch-service if-arch-service--source"
        data-if-diagram-item
        data-diagram-node-type="source"
        data-diagram-node-layout="media"
        data-diagram-node-background="surface"
        data-diagram-layer="sources"
        data-diagram-status="Verified"
        data-diagram-owner="Source Monitor">
        <span class="if-icon-slot" data-if-icon="policy"></span>
        <span><strong>DoD Issuances</strong><span>Directives, instructions, manuals</span></span>
        <em class="if-arch-service__badge">Tier 1</em>
      </article>
    </section>
  </div>
</section>
```

Service variants include `.if-arch-service--source`, `.if-arch-service--compute`, `.if-arch-service--ai`, `.if-arch-service--storage`, `.if-arch-service--api`, `.if-arch-service--review`, and `.if-arch-service--guarded`. Connector samples use `.if-connector-line`, `.if-connector-line--async`, `.if-connector-line--guarded`, and `.if-connector-line--bidirectional`. Use `.if-interface-contracts` for compact input/output/gate summaries and `.if-arch-swimlane` for cross-cutting platform bands.

Use `.if-diagram-region` when a diagram lane should own a continuous tinted background instead of rendering as a white panel with nested cards. Pair it with tone helpers such as `.if-diagram-region--blue`, `.if-diagram-region--purple`, `.if-diagram-region--green`, or `.if-diagram-region--teal`, then place repeated children inside `.if-diagram-region__band` when the band should inherit the same tint. Region tokens include `--if-diagram-region-color`, `--if-diagram-region-tint`, `--if-diagram-region-panel-tint`, `--if-diagram-region-bg`, and `--if-diagram-region-panel-bg`.

For reusable routed connectors, add `data-if-connector-routing` to the diagram surface, mark endpoints with `data-if-connector-node`, and add descriptor elements with `data-if-connector-route`, `data-if-connector-from`, `data-if-connector-to`, and optional `data-if-connector-label`, `data-if-connector-label-hidden="true"`, `data-if-connector-style="direct|orthogonal|elbow|curved"`, `data-if-connector-tone="primary|async|guarded|success|danger"`, `data-if-connector-from-anchor="left|right|top|bottom"`, `data-if-connector-to-anchor="left|right|top|bottom"`, `data-if-connector-waypoints="50%,45%"`, and `data-if-connector-avoid="false"`. The framework creates an SVG connector layer, places selectable labels, refreshes on resize, tries to avoid intervening nodes by default, and emits `if:connector-routes`.

The layout snapshot contains stable item ids, layer visibility, CSS variable control values, per-node offsets, and editable metadata. Use this when a host app wants in-session personalization first and later needs server-backed diagram curation without changing markup.

```html
<div class="if-architecture-board" data-if-connector-routing data-if-connector-style="orthogonal">
  <article class="if-arch-service" data-if-connector-node="source">Source adapter</article>
  <article class="if-arch-service" data-if-connector-node="store">Policy store</article>
  <span hidden data-if-connector-route="source-store"
    data-if-connector-from="source"
    data-if-connector-to="store"
    data-if-connector-label="publishes"
    data-if-connector-tone="async"></span>
</div>
```

Public connector APIs: `collectConnectorRoutes(surface)`, `computeConnectorRoute(surface, connector, options)`, `applyConnectorRoutes(surface)`, `refreshConnectorRoutes(root)`, and `hydrateConnectorRoutes(root)`.

Editable connector APIs: `createDiagramConnectorRoute(diagram, fromId, toId, options)`, `selectDiagramConnectorRoute(routeOrLabel)`, `setDiagramConnectorRoute(routeOrDiagram, options)`, and `updateSelectedDiagramRoute(control)`. `setDiagramConnectorRoute()` accepts `{ label, style, tone, fromAnchor, toAnchor, avoid, waypoints, waypointPercent }` so production systems can update a route from an inspector, a persisted layout, or a server post-back without simulating UI events.

The diagram system also includes non-Azure primitives for product architecture work: `.if-diagram-flow-board` for authority or dependency ladders, `.if-diagram-topology-board` for hub-and-spoke runtime maps, `.if-diagram-swimlane-board` for operational pipelines, `.if-diagram-boundary-board` for trust boundaries, and `.if-diagram-matrix` for dependency intensity. Any selectable object can opt into details and export by adding `data-if-diagram-item` plus optional `data-diagram-title`, `data-diagram-description`, `data-diagram-status`, `data-diagram-owner`, `data-diagram-throughput`, `data-diagram-dependencies`, and `data-diagram-contract`.

## Tabs

Tabs can be hand-authored or generated from `data-if-tabs-source="#json-script"` / `data-if-tabs-json`. Structured tabs use `{ label, selected, tabs }`; each tab can include `id`, `title`, `badge`, `body`, `meta`, and nested `accordions`. Public APIs: `renderTabs(root, config)`, `getTabs(root)`, `getTabsState(root)`, and `activateTab(tab)`. Activating a tab emits `if:tab-change` with `{ tab, target, state }`.

```html
<div class="if-tabs" data-if-tabs data-if-tabs-source="#tabs-data"></div>
<script type="application/json" id="tabs-data">
{
  "selected": "summary",
  "tabs": [
    { "id": "summary", "title": "Summary", "body": "Summary content" },
    { "id": "history", "title": "History", "body": "History content" }
  ]
}
</script>
```

## Accordion

Accordions use `data-if-accordion-trigger` on disclosure buttons. For compatibility, `data-if-accordion` is also accepted on a trigger. Generated groups can use `.if-accordion[data-if-accordion-source]` or `data-if-accordion-json`. Public APIs: `renderAccordion(root, config)`, `getAccordionState(root)`, and `setDisclosureState(control, panel, expanded)`. Toggling emits `if:disclosure-toggle` with `{ expanded, trigger, target, state }`.

```html
<div class="if-accordion">
  <div class="if-accordion__item">
    <button class="if-accordion__trigger" data-if-accordion-trigger aria-expanded="true">
      Provenance
    </button>
    <div class="if-accordion__panel">Source and validation details.</div>
  </div>
</div>
```

## Modal

```html
<button class="if-btn" data-if-modal-open="#confirm-modal">Open modal</button>

<div class="if-modal" id="confirm-modal" role="dialog" aria-modal="true" aria-hidden="true">
  <div class="if-modal__dialog">
    <div class="if-modal__header">
      <h2 class="if-panel__title">Confirm action</h2>
      <button class="if-icon-btn" data-if-modal-close aria-label="Close">x</button>
    </div>
    <div class="if-modal__body">Are you sure?</div>
  </div>
</div>
```

## Drawers

```html
<button class="if-btn" data-if-drawer-open="#details-drawer">Open drawer</button>
<aside class="if-drawer" id="details-drawer" aria-hidden="true">
  <div class="if-drawer__header">
    <h2 class="if-panel__title">Policy Details</h2>
    <button class="if-icon-btn" data-if-drawer-close="#details-drawer">x</button>
  </div>
</aside>
<div class="if-backdrop" data-if-backdrop hidden></div>
```

## Tables

```html
<div class="if-data-table" data-if-data-table>
  <div class="if-table-toolbar">
    <span><strong data-if-table-status="rows">0</strong> visible</span>
    <span><strong data-if-table-status="selected">0</strong> selected</span>
    <input class="if-input" data-if-table-filter="#policy-table" placeholder="Filter rows...">
  </div>
  <div class="if-table-wrap">
    <table class="if-table if-table--dense">
      <thead>
        <tr>
          <th><input type="checkbox" data-if-table-select-all aria-label="Select all rows"></th>
          <th><button class="if-table__sort" data-if-table-sort="title" aria-sort="none">Title</button></th>
          <th>Type</th>
          <th><button class="if-table__sort" data-if-table-sort="confidence" aria-sort="none">Confidence</button></th>
        </tr>
      </thead>
      <tbody>
      <tr class="is-selected" data-if-table-row data-sort-title="Policy title" data-sort-confidence="High">
        <td><input type="checkbox" data-if-table-select checked aria-label="Select policy"></td>
        <td><span class="if-row-title"><strong>Policy title</strong><span>Subtitle</span></span></td>
        <td>Instruction</td>
        <td><span class="if-badge if-badge--confidence-high">High</span></td>
      </tr>
      <tr class="if-table-detail" data-if-table-detail hidden>
        <td colspan="4">
          <div class="if-table-detail__content">Expanded row profile, provenance, audit, and actions.</div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
  <div class="if-table-footer">
    <span>Showing <strong data-if-table-status="start">0</strong>-<strong data-if-table-status="end">0</strong> of <strong data-if-table-status="filtered">0</strong></span>
    <nav class="if-pagination" aria-label="Table pagination">
      <button class="if-page-btn" data-if-table-prev>&lt;</button>
      <span class="if-pagination__pages" data-if-table-pages></span>
      <button class="if-page-btn" data-if-table-next>&gt;</button>
      <select class="if-select" data-if-table-page-size>
        <option value="10">10 / page</option>
        <option value="20">20 / page</option>
      </select>
    </nav>
  </div>
</div>
```

Use `data-if-table-sort` for sortable headers, `data-if-table-filter` for global client-side filtering, and `data-if-table-column-filter="fieldName"` for per-column select/input filters. Rows can expose filterable fields with `data-filter-fieldName` and sortable fields with `data-sort-fieldName`.

Pagination uses `data-if-table-page-size`, `data-if-table-prev`, `data-if-table-next`, and `data-if-table-pages`. Selection uses `data-if-table-select`, `data-if-table-select-all`, `data-if-table-bulk`, and `data-if-table-selected-count` for bulk-action bars. Use `data-if-table-status` keys `total`, `filtered`, `visible`, `selected`, `selectedTotal`, `page`, `pages`, `start`, and `end` for live counts and ranges.

Use `data-if-table-density="compact|comfortable|spacious"` to switch table density, `data-if-table-clear` to reset search and column filters, `data-if-table-empty` for no-result states, and `data-if-table-expand` with the following `data-if-table-detail` row for expandable operational profiles. Source registries can compose trust/coverage bars with `.if-source-signal`; generic data tables can use `.if-table-cell-main`, `.if-table-actions`, `.if-table-progress`, and `.if-table-detail-card` for dense, aligned record anatomy.

Advanced table contracts are first-class framework behavior:

- Column resizing: add `data-if-table-resizable="true"` to the table wrapper and optional `data-if-table-width="10rem"` on header cells. The framework injects resize handles, persists column width as CSS variables, and emits `if:table-column-resize` plus `if:table-column-resize-end`.
- Sticky pinning: add `data-if-table-pin="left|right"` to header cells, or initialize by index/key with `data-if-table-pinned-columns="0,title,status"`. Trigger pinning from controls with `data-if-table-pin-column="2"`, `data-if-table-pin-side="left|right|none"`, and optional `data-if-table-target="#table-id"`.
- Virtualization: wrap the table in `.if-table-wrap--virtual`, add `data-if-table-virtual="true"`, and tune `data-if-table-virtual-row-height` / `data-if-table-virtual-overscan`. The table renders only the visible row window while maintaining footer counts and scroll height.
- Server adapters: add `data-if-table-adapter="adapter-name"` and register an adapter with `InterfaceFramework.registerDataTableAdapter(name, handler)`. Handlers receive `{ page, pageSize, sort, filters, query, signal, table }` and return `{ rows, total, filtered, page, pageSize, renderRows }`; the `AbortSignal` cancels stale requests during fast filtering or pagination.
- Loading/error/empty hooks: use `data-if-table-loading`, `data-if-table-error`, `data-if-table-empty`, `data-if-table-server-status`, and `data-if-table-refresh` to build production-style states without changing table markup.

```js
InterfaceFramework.registerDataTableAdapter("policy-records", async ({ page, pageSize, sort, filters, query, signal }) => {
  const response = await fetch(`/api/policies?page=${page}&pageSize=${pageSize}`, { signal });
  return response.json();
});

InterfaceFramework.refreshDataTable("#policy-table");
InterfaceFramework.resizeDataTableColumn("#policy-table", 2, 180);
InterfaceFramework.pinDataTableColumn("#policy-table", 1, "left");
```

## Operations Workspace

Use the operations workspace pattern when a record-heavy analytics page needs signal cards, a dense table command band, selected-record detail, provenance, source health, and action queues to behave as one surface. The pattern is intentionally generic: it can represent policy records, source registries, compliance findings, grants, assets, procurements, or any operational dataset.

```html
<section class="if-operations-workspace" data-if-operations-workspace data-if-operations-current="risk">
  <div class="if-operations-signal-grid">
    <button class="if-card if-metric if-operations-signal" type="button" data-if-operations-signal="risk">
      <div class="if-metric__top">
        <span class="if-metric__icon if-icon-slot" data-if-icon="warning"></span>
        <p class="if-metric__label">Critical risk</p>
      </div>
      <p class="if-metric__value">14</p>
    </button>
  </div>
  <article class="if-operations-panel" data-if-operations-panel="risk">
    <div class="if-operations-panel__header">
      <h3>Risk drilldown</h3>
      <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-operations-reset>Clear</button>
    </div>
  </article>
</section>
```

The JavaScript API exposes `hydrateOperationsWorkspaces`, `setOperationsSignal`, `resetOperationsSignal`, and `getOperationsWorkspaceState`. It emits `if:operations-signal-change` and `if:operations-signal-reset`, so host apps can synchronize URL state, table filters, detail panels, or telemetry without parsing visible text.

For full application shells, use `.if-operations-app` with `.if-operations-app--wide` when dense data surfaces need more desktop width. Compose a compact sticky masthead with `.if-product-header--sticky`, `.if-product-header--compact`, `.if-product-header__inner`, and `.if-operations-topnav` so primary surfaces can live in the top-right header while secondary surfaces sit in a compact menu.

Secondary operations pages use the same family when a support surface should remain visually aligned with the main workspace without adding app-local CSS. Compose `.if-operations-page`, `.if-operations-page__topbar`, `.if-breadcrumbs`, `.if-operations-page__hero`, `.if-operations-metric-grid`, `.if-operations-section-grid`, `.if-operations-section`, `.if-operations-list`, `.if-source-feed-grid`, `.if-table-shell`, `.if-empty-state`, `.if-pagination`, and `.if-danger-zone` for data quality, audit, source analytics, storage, admin, and diagnostic routes.

Schedule-heavy operations pages can compose `.if-schedule-gantt`, `.if-schedule-gantt__panel`, `.if-schedule-gantt__summary-grid`, `.if-schedule-gantt__controls`, `.if-schedule-gantt__scroller`, `.if-schedule-gantt__axis-row`, `.if-schedule-gantt__row`, `.if-schedule-gantt__period-row`, `.if-schedule-gantt__bar`, and `.if-schedule-gantt__period-bar` for period-of-performance, roadmap, renewal, deadline, or milestone planning views. Host apps should only set dynamic positions and widths inline; static layout, color, status, legend, and density belong to the framework classes.

## Semantic Badges And Chips

Use explicit semantic classes when the label carries operational meaning. Reserve the older tone aliases for backwards compatibility or decorative category tags.

```html
<span class="if-badge if-badge--confidence-high">High confidence</span>
<span class="if-badge if-badge--risk-high">High risk</span>
<span class="if-badge if-badge--severity-critical">Critical</span>
<span class="if-badge if-badge--status-needs-review">Needs Review</span>
<span class="if-chip if-chip--risk-medium">Medium risk</span>
```

Confidence uses the wireframe's blue trust treatment, risk/severity use green/amber/red escalation, and workflow state uses status classes such as `if-badge--status-open`, `if-badge--status-in-review`, `if-badge--status-approved`, `if-badge--status-on-track`, `if-badge--status-paused`, and `if-badge--status-blocked`.

## Dashboard Metrics

```html
<section class="if-metric-grid">
  <article class="if-card if-metric">
    <div class="if-metric__top">
      <span class="if-metric__icon if-icon-slot" data-if-icon="warning"></span>
      <p class="if-metric__label">Implementation gaps</p>
    </div>
    <div class="if-metric__main">
      <p class="if-metric__value">22</p>
      <span data-if-sparkline="13,15,16,18,19,21,22" data-if-sparkline-label="Implementation gaps trend"></span>
    </div>
    <span class="if-metric__change">Up 10% vs last week</span>
  </article>
</section>
```

Sparkline components hydrate from real numeric data in `data-if-sparkline`. The JavaScript layer computes scaled SVG points, trend direction, and accessible labels without requiring a charting library.

For live-data or streaming-change-rate displays, add `data-if-sparkline-stream="true"` and optionally set `data-if-sparkline-interval`, `data-if-sparkline-volatility`, `data-if-sparkline-drift`, and `data-if-sparkline-output`. This keeps compact table-cell change-rate diagrams and larger analytics cards on the same component contract.

```html
<span class="if-source-signal if-source-signal--success">
  <span
    data-if-sparkline="18,22,21,29,25,34"
    data-if-sparkline-stream="true"
    data-if-sparkline-output="#source-change-rate"></span>
  <span id="source-change-rate" class="if-table-cell-meta">+8.4%</span>
</span>

<div id="source-change-rate-chart" data-if-sparkline="18,22,21,29,25,34" data-if-sparkline-stream="true"></div>
<button data-if-sparkline-toggle="#source-change-rate-chart">Pause stream</button>
<button data-if-sparkline-step="#source-change-rate-chart">Add sample</button>
<button data-if-sparkline-reset="#source-change-rate-chart">Reset</button>
```

## Graph Nodes

```html
<div class="if-graph-shell" data-if-graph>
  <button class="if-btn" data-if-graph-layout="radial" aria-pressed="true">Radial</button>
  <button class="if-btn" data-if-graph-layout="impact" aria-pressed="false">Impact</button>
  <button class="if-icon-btn" data-if-graph-viewport="out">-</button>
  <button class="if-icon-btn" data-if-graph-viewport="in">+</button>
  <button class="if-icon-btn" data-if-graph-viewport="fit">Fit</button>
  <div class="if-graph-canvas">
    <div class="if-graph-viewport">
      <svg class="if-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line data-edge-from="seed" data-edge-to="org"></line>
      </svg>
      <button class="if-graph-node if-graph-node--policy if-graph-node--primary"
        style="--x: 50%; --y: 50%;"
        data-node-id="seed"
        data-node-type="instruction">
        <span class="if-graph-node__icon if-icon-slot" data-if-icon="policy"></span>
        <span class="if-graph-node__title">DoDI 5200.01</span>
      </button>
    </div>
  </div>
  <aside data-node-panel="seed">Selected node details</aside>
</div>
```

Add `data-edge-type` to SVG edges and matching labels to make relationship filters work. Use `data-if-graph-relation="guides"` on checkboxes, `data-if-graph-traverse="node-id"` on buttons that should jump to a related entity, and `data-if-graph-cluster="cluster-name"` on an existing graph node when that node owns hidden children. Pair the owner with child nodes or edges using `data-cluster-member="cluster-name"`. The owner node can show a compact child count with `data-if-graph-child-count`, plus `data-cluster-count`, `data-cluster-label`, `data-cluster-context`, and `data-cluster-layout="branch"`. Member nodes can declare `data-cluster-offset-x` and `data-cluster-offset-y` to open as a serial branch from the existing graph node rather than adding a separate branch-control node. The behavior layer generates `aria-controls`, updates open/closed state, expands/collapses member nodes and edges, returns selection to the owning node when a selected child is collapsed, hides clustered children when their relationship type is filtered out, and emits `if:graph-cluster`, `if:graph-cluster-layout`, and `if:graph-cluster-move`.

Use `data-node-type` when the production app owns the semantic taxonomy. Built-in types cover policy/instruction, law/authority, organization, opportunity, obligation, evidence, event, gap, claim, and implementation nodes. Register additional types with `InterfaceFramework.registerGraphNodeType(type, { className, icon, color, label, data, render })`, then call `InterfaceFramework.applyGraphNodeTypes(graph)` after server-rendered nodes are inserted. The registry writes stable classes, `--node-color`, icon slots, human-readable type labels, and any extra dataset values without requiring app code to fork the graph component.

Graph nodes are draggable by default when they use `.if-graph-node[data-node-id]`. Dragging updates SVG edge endpoints and edge labels live, emits `if:graph-node-move`, and runs light overlap avoidance on drop. Hovering or focusing a node shows a quick-peek card with relationship context and visible/clustered link counts; clicking the node opens the matching `[data-node-panel]` and a compact node context menu. Context menu actions use `data-if-graph-context-action` and cover focus, expand/collapse children, neighborhood arrange, and traversal-depth mock interactions.

Generated graph surfaces can use `data-if-graph-source="#json-script"` or `data-if-graph-json` instead of hand-authored DOM. The renderer creates the graph toolbar, SVG paths, edge labels, nodes, node panels, edge panel, path rail, and accessible fallback index from `{ nodes, edges, selected, mode, layout }`. Public APIs: `renderGraph(graph, config)`, `hydrateGraph(graph)`, `getGraphState(graph)`, `collectGraphLayoutInput(graph)`, and `updateGraphA11yFallback(graph)`.

Wrap graph content in `.if-graph-viewport` to pan and zoom the entire canvas. Add toolbar controls with `data-if-graph-viewport="in"`, `out`, `fit`, or `reset`; users can also mouse-wheel over `.if-graph-canvas` and drag empty canvas space to pan. Node dragging remains scoped to `.if-graph-node`.

Use `data-graph-world="expanded"` on `.if-graph-canvas` when the graph needs a larger working surface than the visible viewport. Tune the stage with `--graph-world-width` and `--graph-world-height`, and tune drag limits with `data-graph-min-x`, `data-graph-max-x`, `data-graph-min-y`, and `data-graph-max-y` on the `[data-if-graph]` root. This is useful for expandable child neighborhoods where nodes need to open into side branches without colliding with the owner node.

The default graph interaction model is unified: click a node to inspect/traverse, drag a node to move it, drag empty canvas to pan, and use zoom controls or wheel gestures for scale. `data-graph-mode` may still be used as a status label for constrained products, but pointer behavior is inferred from the target so users do not need to switch between explore, pan, and arrange modes.

```html
<span class="if-badge if-badge--info">Unified interaction</span>

<div class="if-graph-organizer__summary">
  <span class="if-graph-stat">Interaction <strong data-if-graph-status="mode">Unified</strong></span>
  <span class="if-graph-stat">Focus <strong data-if-graph-status="selected">DoDI 5200.01</strong></span>
</div>

<aside class="if-graph-hud">
  <strong data-if-graph-mode-label>Live</strong>
</aside>
```

Status targets with `data-if-graph-status="mode|layout|nodes|edges|selected"` update automatically after mode changes, filtering, layout changes, traversal, node moves, and focus resets. Use `data-if-graph-mode-label` for a compact in-canvas HUD or help surface.

Use `.if-graph-organizer` for production-facing layout options. Controls with `data-if-graph-option` can tune a preset without changing the preset name:

- `orientation`: `standard`, `top-down`, `right-left`, or `bottom-up`
- `spacing`: numeric scale from `0.72` to `1.28`
- `labelDensity`: `full`, `compact`, or `minimal`
- `nodeDensity`: `comfortable`, `compact`, or `expanded`
- `edgeStyle`: `direct`, `subtle`, or `emphasis`
- `direction`: `directed`, `none`, or `bidirectional`

Buttons with `data-if-graph-organize="reset"` return those options to each control's `data-default-value`. The framework emits `if:graph-organization` after options apply, so production systems can listen and persist layout preferences.

Use arrows for directional relationships such as derived-from, guides, implements, supersedes, and has-obligation. Use `direction="none"` for exploratory similarity maps or dense neighborhood views where arrowheads add visual noise.

### Graph Layout Engines And Fallbacks

The framework ships with dependency-free graph presets, but production systems can register a layout engine adapter instead of hard-coding placement. This keeps the package framework-neutral while allowing ELK, Dagre, Cytoscape, D3-force, a server-side layout service, or a custom policy graph solver to own node coordinates.

```js
InterfaceFramework.registerGraphLayoutEngine("policy-layout", async ({ nodes, edges, options, signal }) => {
  const response = await fetch("/api/layouts/policy-graph", {
    method: "POST",
    body: JSON.stringify({ nodes, edges, options }),
    signal
  });
  return response.json();
});

await InterfaceFramework.runGraphLayoutEngine(
  document.querySelector("[data-if-graph]"),
  "policy-layout",
  { layout: "authority", preserveView: true }
);
```

Adapter params include `nodes`, `edges`, `layout`, graph `options`, `requestId`, and an `AbortSignal`. Starting a new layout run aborts the previous run and emits `if:graph-layout-cancel`. Successful runs emit `if:graph-layout-request`, `if:graph-layout-apply`, and `if:graph-layout-result`; failures emit `if:graph-layout-error`.

Layout results accept percent coordinates by default:

```js
{
  coordinateSpace: "percent",
  nodes: [
    { id: "seed", x: 50, y: 50 },
    { id: "authority", x: 22, y: 18 }
  ]
}
```

Use `coordinateSpace: "pixel"` for engine outputs in canvas pixels, or `coordinateSpace: "unit"` for normalized `0..1` coordinates.

Add an accessible fallback index inside the same `[data-if-graph]` surface when the graph is a primary control surface. The behavior layer fills visible nodes and relationships after layout, filtering, traversal, and focus changes.

```html
<section class="if-panel if-graph-a11y" data-if-graph-a11y aria-label="Accessible graph fallback">
  <p data-if-graph-a11y-summary></p>
  <div class="if-graph-a11y__grid">
    <section class="if-graph-a11y__section">
      <h3>Nodes</h3>
      <ol class="if-graph-a11y__list" data-if-graph-a11y-nodes></ol>
    </section>
    <section class="if-graph-a11y__section">
      <h3>Relationships</h3>
      <ol class="if-graph-a11y__list" data-if-graph-a11y-edges></ol>
    </section>
  </div>
</section>
```

### Relationship Mapping Components

Use relationship map primitives when a full graph would be too heavy but the user still needs directional meaning, edge type, confidence, provenance, and review state. These components are intentionally composable with tables, document parser panels, metadata drawers, and graph detail panes.

```html
<div class="if-relationship-map if-relationship-map--path">
  <span class="if-map-node if-map-node--authority">
    <span class="if-icon-slot" data-if-icon="authorization"></span>
    <strong>EO 14250</strong>
    <em>Source authority</em>
  </span>
  <span class="if-map-edge if-map-edge--derived">
    <i></i><strong>Derived from</strong>
  </span>
  <span class="if-map-node is-active">
    <span class="if-icon-slot" data-if-icon="policy"></span>
    <strong>DoDI 5200.01</strong>
    <em>Canonical policy</em>
  </span>
</div>
```

Edge tokens can be reused in legends, bundles, matrices, and compact cards:

```html
<span class="if-edge-token if-edge-token--implements">
  <i></i><strong>Implements</strong><em>Policy to execution</em>
</span>
```

Supported semantic variants are `--derived`, `--implements`, `--references`, `--guides`, `--evidence`, and `--conflict`. Use `.if-relationship-bundle-card` and `.if-relationship-bundle-list` for dense neighborhoods, and `.if-relationship-matrix` for reviewable source/relationship/target rows with confidence and state.

### Authority Chain Graphs

Use `.if-graph-shell--authority-chain` with `.if-graph-canvas--authority-chain` when the graph needs to show formal governance lineage across authority layers instead of a radial neighborhood. This variant supports lane-by-lane authority chains from law/statute through government-wide, department, service, echelon 2, echelon 3, and echelon 4 governance artifacts. It keeps the regular graph component behavior: selectable nodes, clickable edge labels, routed SVG edges, pan/zoom, arrange mode, status counters, and node/edge detail panels.

Set `data-if-graph-initial-selection="none"` when the chain should open with every artifact fully visible. Add `data-if-graph-empty-label="Full chain"` to customize the focus counter before a node or edge is selected.

Use `data-if-graph-trace="upstream"`, `data-if-graph-trace="downstream"`, or `data-if-graph-trace="both"` with `data-if-graph-trace-node="node-id"` when a panel action should highlight the full authority path instead of only immediate neighbors. This supports both common workflows: start at a law section and follow propagation down, or start at an Echelon 4 statement and run provenance back up.

Edge labels can carry optional inspection metadata:

- `data-edge-rule`: evidence required before publishing the relationship.
- `data-edge-review`: review condition for inferred, ambiguous, or high-impact relationships.
- `data-edge-storage`: canonical storage objects that should own the relationship.

Use `.if-trace-playbook-grid` and `.if-trace-playbook` for saved investigation starts, `.if-relation-matrix` with `.if-relation-card` for edge ontology definitions, and `.if-propagation-stage-grid` with `.if-propagation-stage` for the storage/decomposition contract that explains how source text becomes canonical graph intelligence.

For service-lane authority maps, avoid a single-service path unless the product is intentionally scoped that way. Render parallel Service nodes for Army, Navy, Marine Corps, Air Force, and Space Force, then use `.if-service-implementation-grid` and `.if-service-implementation` inside node panels to show each service's publication families. Add `data-node-peek` when hover previews should summarize the implementation families before the user opens the panel.

Keep the graph as a visual orientation layer. Use `.if-semantic-grid` and `.if-semantic-card` for the durable ontology: claim types, reference types, relationship primitives, and storage fields that survive beyond any single graph layout.

```html
<section class="if-graph-shell if-graph-shell--authority-chain"
  data-if-graph
  data-graph-layout="authority-chain"
  data-graph-direction="directed"
  data-if-graph-initial-selection="none"
  data-if-graph-empty-label="Full chain">
  <div class="if-graph-canvas if-graph-canvas--authority-chain">
    <div class="if-graph-viewport" data-if-graph-viewport>
      <div class="if-graph-lanes" style="--lane-count: 8">
        <section class="if-graph-lane"><span class="if-graph-lane__label">Law</span><span class="if-graph-lane__meta">Public law</span></section>
        <section class="if-graph-lane"><span class="if-graph-lane__label">Echelon 2</span><span class="if-graph-lane__meta">SYSCOM / major command</span></section>
        <section class="if-graph-lane"><span class="if-graph-lane__label">Echelon 3</span><span class="if-graph-lane__meta">command / activity</span></section>
        <section class="if-graph-lane"><span class="if-graph-lane__label">Echelon 4</span><span class="if-graph-lane__meta">SOP / local policy</span></section>
      </div>
      <svg class="if-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path data-edge-from="law" data-edge-to="statute" data-edge-type="codifies"></path>
      </svg>
      <button class="if-edge-label" data-if-graph-edge data-edge-label-from="law" data-edge-label-to="statute" data-edge-type="codifies">codifies</button>
      <button class="if-graph-node if-graph-node--law if-graph-node--primary" style="--x: 8%; --y: 50%;" data-node-id="law">
        <span class="if-graph-node__icon if-icon-slot" data-if-icon="book"></span>
        <span class="if-graph-node__title">NDAA FY2025</span>
        <span class="if-graph-node__meta">Public Law</span>
      </button>
      <button class="if-graph-node if-graph-node--echelon4" style="--x: 90%; --y: 72%;" data-node-id="local-sop">
        <span class="if-graph-node__icon if-icon-slot" data-if-icon="check"></span>
        <span class="if-graph-node__title">Ech. 4 SOP</span>
        <span class="if-graph-node__meta">Local policy item</span>
      </button>
    </div>
  </div>
  <section class="if-panel" data-node-panel="local-sop" hidden>
    <button class="if-btn" type="button" data-if-graph-trace="upstream" data-if-graph-trace-node="local-sop">Trace Upstream</button>
  </section>
</section>
```

```html
<label class="if-checkbox">
  <input type="checkbox" data-if-graph-relation="references" checked>
  References
</label>

<line data-edge-from="policy" data-edge-to="manual" data-edge-type="references"></line>
<button class="if-graph-node if-graph-node--policy"
  data-node-id="directive"
  data-node-relation="references"
  data-if-graph-cluster="manuals"
  data-cluster-count="3"
  data-cluster-label="reference children"
  data-cluster-context="from DoDI 5025.01"
  data-cluster-layout="branch"
  aria-expanded="false">
  <span class="if-graph-node__icon if-icon-slot" data-if-icon="reference" aria-hidden="true"></span>
  <span class="if-graph-node__title">DoDI 5025.01</span>
  <span class="if-graph-node__child-count" data-if-graph-child-count aria-hidden="true">3</span>
  <span class="if-graph-node__meta">References</span>
</button>
<button class="if-graph-node" data-node-id="manual" data-node-relation="references" data-cluster-member="manuals" data-cluster-offset-x="2" data-cluster-offset-y="-10" hidden>
  Manual 5025.01
</button>
<button class="if-btn" data-if-graph-traverse="manual">Traverse</button>
```

For edge inspection, render relationship labels as buttons with `data-if-graph-edge`. The framework highlights the selected connection, mutes unrelated context, opens `[data-edge-panel]`, and provides source/target traversal actions.

```html
<button class="if-edge-label" type="button"
  data-if-graph-edge
  data-edge-label-from="policy"
  data-edge-label-to="manual"
  data-edge-type="references"
  data-edge-confidence="0.88"
  data-edge-evidence="Citation graph agent linked the policy to this manual.">
  References
</button>

<section class="if-panel" data-edge-panel hidden></section>
<div class="if-graph-path" data-if-graph-path aria-label="Traversal path"></div>
```

Use `.if-traversal-workbench` when the graph needs to demonstrate deliberate drilldown and backtracking across authority levels. Add `data-if-traversal` to the wrapper, `data-traversal-step="id"` to each rail item, matching `data-traversal-panel="id"` detail panels, and `data-if-traversal-target="id"` on buttons that should dig into or back out of a node.

```html
<section class="if-panel" data-if-traversal>
  <div class="if-traversal-workbench">
    <div class="if-traversal-rail" role="listbox">
      <button class="if-traversal-step is-selected" data-traversal-step="law">NDAA FY2025</button>
      <button class="if-traversal-step" data-traversal-step="dodi">DoDI 5200.01</button>
      <button class="if-traversal-step" data-traversal-step="artifact">NAVWAR API Gateway Plan</button>
    </div>
    <article class="if-traversal-panel" data-traversal-panel="law">
      <button data-if-traversal-target="dodi">Drill into DoDI</button>
    </article>
    <article class="if-traversal-panel" data-traversal-panel="dodi" hidden>
      <button data-if-traversal-target="law">Back to law</button>
    </article>
  </div>
</section>
```

## Hierarchy Explorer

Use `.if-hierarchy` for organization charts, command structures, authority trees, ownership trees, and affected-organization rollups where parent-child meaning must remain explicit. Rows use `data-hierarchy-node`; child rows point to parents with `data-hierarchy-parent`; semantic types use `data-hierarchy-type`; matching detail cards use `data-hierarchy-panel`.

```html
<div class="if-hierarchy" data-if-hierarchy>
  <div class="if-hierarchy__tree">
    <ol class="if-hierarchy__list" role="tree">
      <li class="if-hierarchy-row is-selected" style="--level:0"
        data-hierarchy-node="dow" data-hierarchy-type="authority" data-hierarchy-label="Department of War">
        <button class="if-hierarchy-row__toggle" type="button"
          data-if-hierarchy-toggle aria-expanded="true"></button>
        <span class="if-hierarchy-row__main">
          <span class="if-hierarchy-row__title">Department of War</span>
          <span class="if-hierarchy-row__meta">Root authority</span>
        </span>
      </li>
      <li class="if-hierarchy-row" style="--level:1"
        data-hierarchy-node="navy" data-hierarchy-parent="dow" data-hierarchy-type="service">
        <span class="if-hierarchy-row__spacer"></span>
        <span class="if-hierarchy-row__main">
          <span class="if-hierarchy-row__title">Department of the Navy</span>
          <span class="if-hierarchy-row__meta">Service implementation</span>
        </span>
      </li>
    </ol>
  </div>

  <div class="if-hierarchy__detail">
    <article class="if-hierarchy-panel" data-hierarchy-panel="dow">Root details</article>
    <article class="if-hierarchy-panel" data-hierarchy-panel="navy" hidden>Navy details</article>
  </div>
</div>
```

The JavaScript layer handles row selection, branch disclosure, descendant hiding, matching detail-panel activation, `Enter` / `Space` selection, and `ArrowLeft` / `ArrowRight` branch controls. During hydration it infers actual branch rows from `data-hierarchy-parent`, upgrades spacer-only rows to disclosure buttons when they have children, marks true leaves/dead ends, sets child counts, and emits `if:hierarchy-structure`. Selection emits `if:hierarchy-select`; branch changes emit `if:hierarchy-toggle`.

Branch disclosure uses a compact plus/minus control that sits on the hierarchy rail. Expanded branches render a minus state, collapsed branches render a plus state, and leaf rows use `.if-hierarchy-row__spacer` to keep the connector rhythm aligned without implying an action. If a server knows a node has unloaded descendants, set `data-hierarchy-state="branch"` with `data-hierarchy-child-count` and `data-hierarchy-load="lazy"`; expanding it emits `if:hierarchy-load` so the host can fetch children. If a node is explicitly terminal, set `data-hierarchy-state="dead-end"` or `data-hierarchy-dead-end="true"`.

Use the hierarchy node type registry when production data owns the taxonomy:

```js
InterfaceFramework.registerHierarchyNodeType("stig", {
  className: "baseline",
  color: "#b45309",
  icon: "checklist",
  label: "STIG / Technical Baseline"
});

InterfaceFramework.applyHierarchyNodeTypes(document.querySelector("[data-if-hierarchy]"));
```

## Landscape Hierarchy

Use `.if-landscape-hierarchy` when the user needs one horizontal view of the entire policy landscape, from law through executive or department policy, source records, extracted claims, obligations, affected organizations, and the lowest tracked implementation artifact. It uses the same `data-if-hierarchy` behavior as the tree component, but the visual layout is column-based.

```html
<section class="if-panel" data-if-hierarchy>
  <div class="if-landscape-hierarchy">
    <div class="if-landscape-hierarchy__map" role="tree">
      <section class="if-landscape-level" aria-label="Law">
        <div class="if-landscape-level__header">
          <span class="if-landscape-level__label">Law</span>
          <span class="if-landscape-level__meta">Statutory authority</span>
        </div>
        <button class="if-landscape-node is-selected" data-hierarchy-node="law" data-hierarchy-label="NDAA FY2025">
          <span class="if-landscape-node__type">Public Law</span>
          <span class="if-landscape-node__title">NDAA FY2025</span>
          <span class="if-landscape-node__meta">Root authority</span>
        </button>
      </section>

      <section class="if-landscape-level" aria-label="Implementation">
        <div class="if-landscape-level__header">
          <span class="if-landscape-level__label">Implementation</span>
          <span class="if-landscape-level__meta">Lowest tracked artifact</span>
        </div>
        <button class="if-landscape-node" data-hierarchy-node="plan" data-hierarchy-parent="law">
          <span class="if-landscape-node__type">Implementation Plan</span>
          <span class="if-landscape-node__title">NAVWAR API Gateway Migration Plan</span>
          <span class="if-landscape-node__meta">Milestones, evidence, and review state</span>
        </button>
      </section>
    </div>

    <div class="if-landscape-hierarchy__detail">
      <article class="if-hierarchy-panel" data-hierarchy-panel="law">Root detail</article>
      <article class="if-hierarchy-panel" data-hierarchy-panel="plan" hidden>Implementation detail</article>
    </div>
  </div>
</section>
```

Use `.if-landscape-level` for each depth layer, `.if-landscape-node` for selectable nodes, `.if-landscape-node--secondary` for alternate branches, and `.if-landscape-node--gap` for blocked or missing evidence. Add type modifiers such as `.if-landscape-node--authority`, `.if-landscape-node--directive`, `.if-landscape-node--policy`, `.if-landscape-node--org`, `.if-landscape-node--implementation`, and `.if-landscape-node--evidence` to color the semantic lane without changing the component contract.

Expanded landscape anatomy should use the shared connector-routing API for card-to-card relationships, labels, arrowheads, and tones:

```html
<div class="if-landscape-hierarchy if-landscape-hierarchy--expanded">
  <div class="if-landscape-hierarchy__map" data-if-connector-routing data-if-connector-style="elbow">
    <section class="if-landscape-level">
      <div class="if-landscape-level__header">
        <span class="if-landscape-level__index">03</span>
        <span>
          <span class="if-landscape-level__label">DoD Policy</span>
          <span class="if-landscape-level__meta">Canonical record</span>
        </span>
      </div>
      <button class="if-landscape-node if-landscape-node--policy"
        type="button"
        data-if-connector-node="dodi-5200">
        <span class="if-landscape-node__type">Instruction</span>
        <span class="if-landscape-node__title">DoDI 5200.01</span>
        <span class="if-landscape-node__meta">Information Governance</span>
        <span class="if-landscape-node__footer">
          <span class="if-badge if-badge--confidence-high">High</span>
          <span>42 claims</span>
        </span>
      </button>
    </section>
    <section class="if-landscape-level">
      <button class="if-landscape-node if-landscape-node--implementation"
        type="button"
        data-if-connector-node="navwar-plan">NAVWAR package</button>
    </section>
    <span hidden data-if-connector-route="dodi-navwar"
      data-if-connector-from="dodi-5200"
      data-if-connector-to="navwar-plan"
      data-if-connector-label="Adopts"
      data-if-connector-tone="success"></span>
  </div>
</div>
```

Use `.if-landscape-rollup-panel` for landscape-level metrics, `.if-landscape-legend` for type and connector keys, and `.if-landscape-anatomy` in documentation or design-system pages to explain the parts of the visualization. The older `--connector-label` shortcut is available for static sketches, but production and design-system examples should prefer `data-if-connector-routing`.

## Hierarchy Composition Patterns

Hierarchy views can be composed with smaller primitives when a full tree is too large for the current surface. Use `.if-hierarchy-breadcrumb` for drilldown paths, `.if-hierarchy-rollup-grid` for descendant summaries, `.if-hierarchy-status-map` for propagated completion state, `.if-hierarchy-comparison` for sibling branches, and `.if-hierarchy-mini` for compact side-panel or autocomplete representations.

```html
<nav class="if-hierarchy-breadcrumb" aria-label="Hierarchy drilldown path">
  <button type="button">NDAA FY2025</button>
  <span class="if-hierarchy-breadcrumb__arrow" aria-hidden="true"></span>
  <button type="button">DoDI 5200.01</button>
  <span class="if-hierarchy-breadcrumb__arrow" aria-hidden="true"></span>
  <button class="is-current" type="button">NAVWAR API Gateway Plan</button>
</nav>

<div class="if-hierarchy-rollup-grid">
  <div class="if-hierarchy-rollup">
    <span>Open obligations</span>
    <strong>18</strong>
    <em>7 due this quarter</em>
  </div>
  <div class="if-hierarchy-rollup if-hierarchy-rollup--warning">
    <span>Evidence packages</span>
    <strong>7</strong>
    <em>3 partial</em>
  </div>
</div>

<div class="if-hierarchy-status-map">
  <div class="if-hierarchy-status-node if-hierarchy-status-node--complete">
    <span>Law mapped</span>
    <strong>Complete</strong>
  </div>
  <div class="if-hierarchy-status-node if-hierarchy-status-node--blocked">
    <span>Implementation</span>
    <strong>Blocked</strong>
  </div>
</div>
```

These primitives are intentionally data-agnostic: use them for authority chains, organization command structures, policy-to-obligation decomposition, source inheritance, claim extraction status, or implementation ownership.

## Expandable And Exportable Surfaces

Use `data-if-collapsible` when a card, panel, metadata section, or design-system specimen should collapse inline. The behavior layer syncs the toggle, content region, icon, optional status text, and emits `if:collapsible-toggle` for saved workspace preferences or telemetry.

```html
<article class="if-panel" data-if-collapsible data-if-collapsible-label="Source metadata">
  <header class="if-panel__header">
    <h2 class="if-panel__title" data-if-collapsible-title>Source metadata</h2>
    <button class="if-icon-btn" type="button" data-if-collapsible-toggle aria-expanded="true">
      <span class="if-icon-slot" data-if-icon="minus" data-if-collapsible-icon aria-hidden="true"></span>
    </button>
  </header>
  <div class="if-collapsible-region" data-if-collapsible-region>
    Optional dense panel content.
  </div>
</article>
```

Use `data-if-surface-expand` when a larger tool surface should expand or collapse as a workspace mode. The target can be an explicit selector or the nearest `.if-expandable-surface`. Targets with `.if-expandable-surface` use full-screen expansion and lock background scroll; lightweight explicit targets reveal inline and keep the page scrollable.

```html
<article class="if-panel if-expandable-surface" id="graph-panel">
  <button class="if-icon-btn" data-if-surface-expand="#graph-panel" aria-pressed="false">Expand</button>
  <button class="if-icon-btn" data-if-export="#graph-panel" data-if-export-format="png" data-if-export-name="graph.png">Export</button>
</article>
```

`data-if-export` supports PNG and PDF download directly in the browser. Graph canvases render from graph nodes, edges, and labels; architecture diagrams render stage/service blocks from `.if-architecture-board`; other surfaces use a lightweight title/text fallback. `data-if-export-format="pdf"` generates a downloadable PDF artifact from the same export canvas rather than relying on a print dialog. For production routes, add `data-if-export-adapter="archive-api"` and register `registerExportAdapter("archive-api", adapter)`. The adapter receives `{ target, format, filename, signal, requestId }`, can be cancelled with `data-if-export-cancel`, and reports through `if:surface-export-request/result/cancel/error` plus the shared `if:adapter-state`.

## Claim Tracking Workbench

Use `.if-claim-tracker` for extracted policy claims, obligations, evidence packages, review gates, and completion state. Rows use `data-claim-id`; matching panels use `data-claim-panel`. Status classes communicate whether the claim is complete, active, blocked, or pending. Add `.if-claim-tracker--rich` when the surface needs a full workbench with parser fields, evidence readiness, provenance, and relationship links. Generated trackers can use `data-if-claims-source="#json-script"` or `data-if-claims-json`; the renderer creates the summary cards, claim list, parser detail panels, evidence lists, and relationship chips from `{ label, selected, claims }`.

```html
<div class="if-claim-tracker if-claim-tracker--rich"
  data-if-claims
  data-if-claims-source="#claims-data"></div>

<script type="application/json" id="claims-data">
{
  "selected": "standards",
  "claims": [
    {
      "id": "standards",
      "title": "Components shall adopt open data standards.",
      "status": "complete",
      "quote": "Components shall adopt open data standards for authoritative exchange.",
      "actor": "DoD Components",
      "predicate": "shall adopt",
      "object": "open data standards",
      "evidence": [{ "title": "Control package", "meta": "Mapped evidence" }]
    }
  ]
}
</script>
```

The JavaScript layer handles claim selection, detail-panel activation, status counts, Arrow/Home/End keyboard selection, and emits `if:claim-select` with a state snapshot. Public APIs: `renderClaimTracker(root, config)`, `hydrateClaimTrackers(root)`, `getClaimTrackerState(root)`, and `selectClaim(row)`. Compose `.if-status-timeline--claim`, `.if-claim-evidence`, `.if-claim-mini-list`, `.if-claim-link-cloud`, and `.if-claim-anatomy-grid` to show whether extracted claims have completed successfully, are waiting for source confirmation, or are blocked by missing implementation evidence.

Recommended normalized claim fields: source span, source document, section path, line number, actor, modality, action verb, object, condition, deadline, exception, claim type, obligation type, evidence target, cited authority, relationship edges, confidence, extraction agent, validation state, reviewer decision, and downstream implementation state.

## DoDI Line-Item Intelligence

Use `.if-document-intel` to decompose instructions, manuals, memoranda, and implementation plans into reviewable line-item intelligence. The pattern combines a document outline, extracted statement rows, claim detail panels, and an extraction rule strip. It reuses `data-if-claims`, so selecting a line item can reveal a matching `data-claim-panel`.

```html
<section class="if-document-intel" data-if-claims>
  <aside class="if-doc-outline">
    <ol class="if-doc-outline__list">
      <li class="is-active"><span>2</span><strong>Responsibilities</strong><em>Actors and assigned actions</em></li>
    </ol>
  </aside>

  <div class="if-line-item-viewer">
    <button class="if-line-item is-selected" data-claim-id="standards">
      <span class="if-line-item__ref">3.1.a</span>
      <span class="if-line-item__body">
        <strong>Systems must comply with applicable standards.</strong>
        <em>Procedure / compliance obligation / evidence target</em>
      </span>
      <span class="if-badge if-badge--high">0.92</span>
    </button>
  </div>

  <div class="if-doc-claim-detail">
    <article class="if-claim-panel" data-claim-panel="standards">
      <dl class="if-meta-grid if-meta-grid--dense">
        <div class="if-kv"><dt>Actor</dt><dd>System owner</dd></div>
        <div class="if-kv"><dt>Modality</dt><dd>must comply</dd></div>
      </dl>
    </article>
  </div>
</section>
```

Recommended decomposition fields: section path, line marker, source text, actor, modality, action verb, object, condition, exception, claim type, obligation type, evidence target, cited authority, downstream relationship, confidence, and review state.

## Artifact Viewer And Reconstituted Documents

Use the document artifact pattern when a source PDF, DOCX, HTML page, or extracted text record needs to remain inspectable beside the reconstituted policy intelligence. The pattern supports embedded artifacts, extracted metadata, parser/provenance strips, full text search, query highlighting, semantic highlight filters, and line-level navigation.

```html
<section class="if-doc-workspace" data-if-doc-workspace>
  <aside class="if-doc-source-list">
    <button class="if-doc-source-card is-active" data-if-doc-source="dodi-5000-87">
      <span class="if-icon-slot" data-if-icon="file-text"></span>
      <span><strong>DoDI 5000.87</strong><em>Operation of the Software Acquisition Pathway</em></span>
      <span class="if-badge if-badge--high">0.91</span>
    </button>
  </aside>

  <article class="if-doc-artifact" data-if-doc-artifact>
    <iframe title="Original artifact" src="examples/artifacts/500087p.pdf"></iframe>
  </article>

  <article class="if-doc-reconstitution" data-if-doc-viewer>
    <div class="if-toolbar">
      <input class="if-input" data-if-doc-search placeholder="Search extracted text..." />
      <button class="if-chip is-active" data-if-doc-filter="claims">Claims</button>
      <button class="if-chip" data-if-doc-filter="organizations">Organizations</button>
      <button class="if-chip" data-if-doc-filter="references">References</button>
    </div>

    <p class="if-doc-line" data-if-doc-line="3.1.a">
      <span class="if-doc-line__ref">3.1.a</span>
      <span>Program managers <mark class="if-mark if-mark--claim">shall identify software pathway obligations</mark>
      with <mark class="if-mark if-mark--org">assigned organizations</mark>.</span>
    </p>
  </article>
</section>
```

Pair `.if-doc-review-strip`, `.if-doc-meta-panel`, `.if-doc-highlight-legend`, and `.if-doc-line-list` with the base viewer for richer artifact review. See `examples/document-viewer.html` for the full working mockup using the two ingested DoDI PDFs.

Reconstituted text uses a fixed gutter: semantic extraction labels render to the left and line numbers remain right-aligned. Supported generated labels include `CLM`, `REF`, `ORG`, `IMP`, `ENB`, `REL`, and `SEC`, derived from `data-doc-cats` values such as `claim`, `reference`, `org`, `implements`, `enables`, `related`, and `section`.

Semantic marks inside reconstituted text can be interactive. Marks with `data-doc-mark="org"`, `data-doc-mark="claim"`, or `data-doc-mark="reference"` are hydrated with hover/focus tooltips and click behavior. Use `data-if-doc-annotation`, `data-if-doc-annotation-value`, and optional `data-if-doc-annotation-expansion` when a downstream parser already knows the normalized entity and expansion. Clicking a mark attempts to reveal the matching organization chip, reference row, parser row, or claim row; if no matching target exists, the viewer falls back to filtering the text by that annotation value.

Artifact mode controls use `data-if-doc-mode="reconstituted|embedded|split|metadata"` inside a `data-if-doc-artifact` surface. Reconstituted, embedded, and claims modes activate matching tabs when present; split mode exposes the reconstituted and embedded panels together for side-by-side review. Use `data-if-doc-mode-current` for a live mode label.

Persistent annotation inspectors use `data-if-doc-annotation-panel` with optional slots: `data-if-doc-annotation-type`, `data-if-doc-annotation-value`, `data-if-doc-annotation-expansion`, `data-if-doc-annotation-count`, `data-if-doc-annotation-line`, `data-if-doc-annotation-target`, and `data-if-doc-annotation-matches`. Search and filter controls can mirror state with `data-if-doc-match-count`, `data-if-doc-query-count`, `data-if-doc-total-count`, and `data-if-doc-active-filter`. The JavaScript layer emits `if:doc-artifact-select`, `if:doc-search`, `if:doc-filter-change`, `if:doc-highlight-change`, `if:doc-search-clear`, `if:doc-jump`, `if:doc-annotation-select`, `if:doc-annotation-panel`, and `if:doc-mode-change`; host applications can call `getDocumentViewerState` or `getDocumentWorkspaceState` to persist the same shape used in those events.

### Authority Drilldown

Use `.if-authority-drilldown` inside document, graph, or policy detail surfaces when an item needs to show the full stack from statutory backing to implementation evidence. Each `.if-authority-node` may be wired to `data-if-doc-jump`, graph traversal, or a host application route.

```html
<section class="if-panel if-authority-drilldown">
  <div class="if-authority-stack">
    <article class="if-authority-stage if-authority-stage--law">
      <div class="if-authority-stage__label">Law</div>
      <button class="if-authority-node" data-if-doc-jump="Section 800">
        <span class="if-authority-node__type">Public Law</span>
        <strong>FY2020 NDAA, Section 800</strong>
        <span>Software pathway authority.</span>
      </button>
    </article>
    <article class="if-authority-stage if-authority-stage--current">
      <div class="if-authority-stage__label">Canonical Issuance</div>
      <button class="if-authority-node is-current" data-if-doc-jump="DOD INSTRUCTION 5000.87">
        <span class="if-authority-node__type">DoD Instruction</span>
        <strong>DoDI 5000.87</strong>
        <span>Policy, responsibilities, and procedures.</span>
      </button>
    </article>
    <article class="if-authority-stage if-authority-stage--implementation">
      <div class="if-authority-stage__label">Next Layers</div>
      <button class="if-authority-node">
        <span class="if-authority-node__type">Implementation artifact</span>
        <strong>Program evidence package</strong>
        <span>Delivery cadence, cyber evidence, outcomes, and review status.</span>
      </button>
    </article>
  </div>
</section>
```

### Parser Engine Output

Use `.if-parser-results` to show what extraction engines produced from an artifact before those objects are promoted into the canonical graph. Typical cards include normalized DoDI/DoDD references, external authorities, citation graph previews, and enumerated modal statements such as `will`, `shall`, `must`, or `should`.

```html
<section class="if-panel if-parser-results">
  <div class="if-parser-grid">
    <article class="if-parser-card">
      <header class="if-parser-card__header">
        <span class="if-icon-slot" data-if-icon="policy"></span>
        <div><h3>DoDI / DoDD References</h3><p>Canonical citation candidates.</p></div>
      </header>
      <div class="if-parser-list">
        <button class="if-parser-row" data-if-doc-jump="DoD Directive 5135.02">
          <strong>DoDD 5135.02</strong><span>Authority cited in purpose clause</span><em>Line 12</em>
        </button>
      </div>
    </article>

    <article class="if-parser-card if-parser-card--wide">
      <header class="if-parser-card__header"><span class="if-icon-slot" data-if-icon="graph"></span><div><h3>DoDI Reference Graph</h3></div></header>
      <div class="if-parser-graph">
        <button class="if-parser-node if-parser-node--law">PL 116-92<br><span>Section 800</span></button>
        <span class="if-parser-edge">authorizes</span>
        <button class="if-parser-node if-parser-node--current">DoDI 5000.87<br><span>Software pathway</span></button>
      </div>
    </article>

    <article class="if-parser-card if-parser-card--wide">
      <header class="if-parser-card__header"><span class="if-icon-slot" data-if-icon="check"></span><div><h3>Enumerated WILL Statements</h3></div></header>
      <ol class="if-obligation-list">
        <li><button data-if-doc-jump="software deliveries will be"><span class="if-obligation-list__ref">1.2.e</span><strong>Software deliveries will be delivered annually.</strong><em>Evidence target: release package</em></button></li>
      </ol>
    </article>
  </div>
</section>
```

## Item History Viewer

Use `.if-history-viewer` when a specific policy item, source record, claim, finding, or organization node needs a durable history surface. The pattern combines a selectable event rail, matching detail panels, version trails, before/after fields, review decisions, provenance notes, and downstream impact. Add `.if-history-viewer--rich` for audit-heavy surfaces that need source synchronization, impact propagation, gap opening, and decision history in the same component.

```html
<div class="if-history-toolbar">
  <div>
    <strong data-if-history-current>Version changed</strong>
    <span>Durable audit surface for state, text changes, provenance, and impact.</span>
  </div>
</div>

<div class="if-history-viewer if-history-viewer--rich" data-if-history>
  <div class="if-history-list" role="listbox">
    <button class="if-history-event is-selected" data-history-event="version" aria-selected="true">
      <span class="if-history-event__marker"></span>
      <span>
        <span class="if-history-event__eyebrow">Version event - May 22, 2025</span>
        <span class="if-history-event__title">Section 4.2 modified</span>
        <span class="if-history-event__meta">Facility language changed to FedRAMP High cloud environment.</span>
      </span>
      <span class="if-badge if-badge--info">v2.2</span>
    </button>
  </div>

  <div class="if-history-detail">
    <article class="if-history-panel" data-history-panel="version">
      <div class="if-history-panel__header">
        <div>
          <span class="if-history-panel__eyebrow">Version Comparison</span>
          <h3>Section 4.2 Data Classification & Handling</h3>
        </div>
      </div>
      <div class="if-history-version-strip">
        <span class="if-history-version">v2.1 current</span>
        <span class="if-history-version is-active">v2.2 proposed</span>
      </div>
      <div class="if-history-field-grid if-history-field-grid--rich">
        <div class="if-history-field if-history-field--before"><span>Before</span><strong>Approved U.S. facilities.</strong></div>
        <div class="if-history-field if-history-field--after"><span>After</span><strong>Approved FedRAMP High cloud environments.</strong></div>
        <div class="if-history-field"><span>Changed by</span><strong>Source Discovery Agent v2.8</strong></div>
        <div class="if-history-field"><span>Review state</span><strong>Pending policy owner approval</strong></div>
      </div>
      <div class="if-history-impact-grid">
        <div class="if-history-impact-card"><span>Claims updated</span><strong>5</strong></div>
        <div class="if-history-impact-card if-history-impact-card--warning"><span>Conflicts</span><strong>3</strong></div>
      </div>
    </article>
  </div>
</div>
```

Rows use `data-history-event`; panels use `data-history-panel`. The JavaScript layer handles row selection, panel activation, optional `data-if-history-current` label updates, and emits `if:history-select`. Compose it with `.if-history-toolbar`, `.if-history-panel__header`, `.if-history-field-grid--rich`, `.if-history-impact-grid`, `.if-history-source-grid`, `.if-history-change-list`, `.if-history-ledger--rich`, `.if-status-timeline`, and `.if-policy-diff` to show historical status, field changes, source confidence, decisions, and downstream impact.

Recommended history fields: event type, event timestamp, event actor, actor type, source system, source hash, prior value, new value, affected field, affected section, parser version, confidence delta, reviewer decision, decision reason, related work item, impacted claims, impacted obligations, impacted organizations, and propagated gaps.

## Governance And Operations Patterns

Use `.if-pattern-grid` and `.if-pattern-card` for compact operational components that need to sit beside tables, graph panels, review queues, and admin consoles. The design documents call for these patterns wherever the interface must explain why a control is available, who or what produced a result, and what downstream surface will be affected.

```html
<div class="if-ops-command-strip">
  <div class="if-ops-kpi">
    <span>Sources watched</span>
    <strong>124</strong>
    <em>7 degraded</em>
  </div>
</div>

<div class="if-pattern-grid">
  <section class="if-pattern-card if-pattern-card--wide if-alert-rule">
    <div class="if-pattern-card__header">
      <span class="if-icon-slot" data-if-icon="bell"></span>
      <div>
        <h3>Watchlist & Alert Rule</h3>
        <p>Trigger, threshold, quiet hours, digest, and channels.</p>
      </div>
      <span class="if-badge if-badge--success">Active</span>
    </div>
    <div class="if-rule-builder-mini">
      <div class="if-rule-line"><span>Trigger</span><strong>New source issue</strong></div>
      <div class="if-rule-line"><span>Threshold</span><strong>Confidence &lt; 0.80</strong></div>
      <div class="if-rule-line"><span>Escalation</span><strong>After 48 hours</strong></div>
      <div class="if-rule-controls"><span class="if-chip">Daily digest</span><span class="if-chip">Max 25/day</span></div>
    </div>
  </section>

  <section class="if-pattern-card">
    <div class="if-pattern-card__header">
      <span class="if-icon-slot" data-if-icon="shield"></span>
      <div><h3>Provenance Ledger</h3><p>Source, agent, model, prompt, and review events.</p></div>
    </div>
    <ol class="if-ledger-list if-ledger-list--rich">
      <li><span>Extracted by Metadata Agent v2.3</span><strong>hash 8f42</strong></li>
      <li><span>Reviewed by Jane Doe</span><strong>confidence 0.91</strong></li>
    </ol>
  </section>
</div>
```

Recommended patterns:

- `.if-ops-command-strip` and `.if-ops-kpi`: dense operations summary metrics for source health, agent health, gates, and exports
- `.if-ledger-list--rich`: provenance, audit, source, model, prompt, run, and reviewer events
- `.if-alert-rule` with `.if-rule-builder-mini`: watchlist rules, digest/fatigue controls, quiet hours, escalation, and delivery channels
- `.if-state-stack` with `.if-state-pill`: access denied, source stale, parser degraded, action failed, and recovery states
- `.if-source-health-card` with `.if-ops-meter-list`: source freshness, parser success, access checks, and recovery controls
- `.if-agent-run-card` with `.if-run-meter` and `.if-run-contract`: agent health, run history, eval score, model/prompt version, and output contract state
- `.if-agent-state-showcase` with `.if-agent-state-card--healthy`, `--running`, `--paused`, `--degraded`, `--failing`, and `--blocked`: the full operational spectrum for agent cards, including state color, icon, eval meter, run metadata, and contract chips
- `.if-agent-runtime` with `.if-agent-run`, `.if-agent-progress`, `.if-agent-steps`, and `.if-agent-runtime__log`: live or replayed agent execution views showing queue state, progress, step completion, elapsed/ETA metadata, warnings, failures, handoffs, and generated runtime events
- `.if-publication-card` with `.if-threshold-stack` and `.if-check-list`: publication thresholds, review gates, source rules, and supervisor release
- `.if-impact-card` with `.if-impact-chain`: policy driver, opportunity, event, affected organization, and implementation-action chains
- `.if-contract-card` with `.if-artifact-row`: API/export schema version, format, filter hash, generated artifact, and validation status
- `.if-permission-card` with `.if-blast-radius`: role-gated high-impact action summaries and confirmation surfaces
- `.if-ops-runbook-card` with `.if-runbook-list`: detection, containment, recovery, and closeout steps for degraded operational paths

Recommended governance fields: source health, parser status, agent version, model version, prompt version, output schema, validation hash, reviewer, decision reason, publication threshold, independent-source requirement, access mode, blast radius, affected records, generated artifacts, recovery step, escalation route, and audit timestamp.

## Policy Diff Review

Use `if-policy-diff` for side-by-side policy line review, version comparisons, obligation changes, and bulk review workspaces. The JavaScript layer handles structured JSON rendering, roving keyboard selection, next/previous navigation, selected-change summaries, and decision status updates.

```html
<div class="if-policy-diff" data-if-policy-diff>
  <div class="if-policy-diff__toolbar">
    <button class="if-btn" data-if-diff-prev>Previous</button>
    <span data-if-diff-count>1 of 2</span>
    <button class="if-btn" data-if-diff-next>Next</button>
    <button class="if-btn if-btn--success" data-if-diff-decision="Approved">Approve</button>
  </div>

  <div class="if-policy-diff__grid">
    <button class="if-change-item is-selected" data-if-diff-change="change-1">
      <span class="if-badge">2</span>
      <span><span class="if-change-item__title">Cloud residency expansion</span></span>
      <span data-if-diff-status>Open</span>
    </button>

    <div class="if-policy-diff__compare">
      <section class="if-policy-diff__pane">
        <div class="if-policy-diff__pane-header">Current</div>
        <div class="if-policy-diff__line if-policy-diff__line--removed">
          <span class="if-policy-diff__line-number">2</span>
          <span>Approved U.S. facilities.</span>
        </div>
      </section>
      <section class="if-policy-diff__pane">
        <div class="if-policy-diff__pane-header">Proposed</div>
        <div class="if-policy-diff__line if-policy-diff__line--added">
          <span class="if-policy-diff__line-number">2</span>
          <span>Approved FedRAMP High environments.</span>
        </div>
      </section>
    </div>
  </div>
</div>
```

For generated screens, keep policy diffs as data and let the component render the same predictable structure:

```html
<div class="if-policy-diff" data-if-policy-diff data-if-policy-diff-source="#policy-diff-json"></div>
<script type="application/json" id="policy-diff-json">
{
  "leftTitle": "Current",
  "rightTitle": "Proposed",
  "decisions": ["Approved", "Rejected", "Needs evidence"],
  "changes": [
    {
      "id": "retention",
      "line": "4",
      "title": "Retention period increased",
      "meta": "Section 4.2 - Obligation",
      "before": "Retain records for 7 years.",
      "after": "Retain records for 10 years."
    }
  ]
}
</script>
```

Public functions: `renderPolicyDiff(diff, config)`, `hydratePolicyDiff(diff)`, `getPolicyDiff(diff)`, `getPolicyDiffState(diff)`, `updatePolicyDiff(diff, selectedChangeOrId)`, and `setPolicyDiffDecision(diffOrControl, decision)`. Events: `if:diff-select` and `if:diff-decision`.

## Keyboard Model And Reviewer Workflow

The behavior layer exposes a formal keyboard contract through `InterfaceFramework.getKeyboardModel(scope)` and can render it into any element with `data-if-keyboard-model="global,menus,reviewer"`. Supported scopes are `global`, `menus`, `tabs`, `tables`, `graphs`, `documents`, and `reviewer`.

Reviewer work queues use `data-if-review-workflow` as the root, `data-if-review-item` for selectable findings, and `data-if-review-action="approve|reject|escalate|assign|snooze|reopen"` for commands. The contract handles roving selection, `Arrow` navigation, `Home`/`End`, shortcut decisions (`A`, `R`, `E`), notes focus (`N`), status badge updates, decision reason capture, count targets, and ledger entries. Generated workflows can use `data-if-review-workflow-source="#json-script"` or `data-if-review-workflow-json`; the renderer creates the action toolbar, queue, selected-item detail panels, reason field, shortcuts, count strip, and ledger from `{ label, selected, actions, counts, items }`.

```html
<div class="if-review-workflow"
  data-if-review-workflow
  data-if-review-workflow-source="#review-data"></div>

<script type="application/json" id="review-data">
{
  "selected": "CF-2025-1187-001",
  "items": [
    {
      "id": "CF-2025-1187-001",
      "title": "Cloud residency obligation missing",
      "status": "open",
      "severity": "high",
      "assignee": "Source Discovery",
      "body": "The proposed language lacks a matching downstream obligation.",
      "evidence": "Draft v2.2 line 2"
    }
  ]
}
</script>
```

Public functions: `renderReviewWorkflow(root, config)`, `getReviewWorkflow(root)`, `getReviewWorkflowState(root)`, `selectReviewWorkflowItem(item)`, `applyReviewWorkflowAction(control, action)`, `updateReviewWorkflow(root)`, `hydrateReviewWorkflows(root)`, `getKeyboardModel(scope)`, and `hydrateKeyboardModel(root)`. Events: `if:review-workflow-select`, `if:review-workflow-action`, and `if:diff-decision`; workflow events include a `state` snapshot.

## States

Use `.if-empty`, `.if-loading`, `.if-error-state`, and `.if-skeleton` for non-data states. Use `.if-alert` variants for feedback.

## Public Website Patterns

The framework also includes Adam Boas Consulting website patterns for homepage, services, profile, resume, blog, and contact pages. These use the same token system and controls as the policy product, with a more editorial layout rhythm.

```html
<div class="if-site-shell">
  <header class="if-site-nav">
    <a class="if-site-brand" href="/">
      <span class="if-site-brand__name">Adam Boas</span>
      <span class="if-site-brand__sub">Consulting</span>
    </a>
  </header>

  <section class="if-site-container if-site-hero">
    <div class="if-site-hero__copy">
      <p class="if-site-eyebrow">Policy intelligence. Real-world impact.</p>
      <h1 class="if-site-hero__title">Strategic counsel for complex policy work.</h1>
      <a class="if-btn if-btn--primary" href="#contact">Work With Us</a>
    </div>
    <div class="if-site-hero__media"></div>
  </section>
</div>
```

Use `.if-service-card` for service rows, `.if-publication-card`, `.if-insight-card`, and `.if-featured-post` for blog and writing content, `.if-resume-timeline` and `.if-resume-item` for experience snapshots, `.if-profile-card` for biography/profile sections, `.if-reference-loop` for architecture and governance loops, `.if-engagement-package` for consulting offers, `.if-public-search` for public-site search and resource discovery, `.if-attribution-strip` for source, credit, license, and last-reviewed metadata, `.if-contact-grid` for contact pages, and `.if-stat-strip` for impact metrics.

### Profile Media Module

Use `.if-profile-media` when a public profile needs one reusable block for portrait media or initials fallback, caption/source attribution, role summary, credential rail, and profile actions. Add `.if-profile-media--horizontal` for a wider side-by-side presentation, or `.if-profile-media--compact` for sidebar profile contexts.

```html
<article class="if-profile-media if-profile-media--horizontal">
  <figure class="if-profile-media__figure">
    <img class="if-profile-media__portrait" src="portrait.jpg" alt="Adam Boas">
    <figcaption class="if-profile-media__caption">Photo credit or media context.</figcaption>
  </figure>
  <div class="if-profile-media__body">
    <header class="if-profile-media__header">
      <span class="if-profile-media__eyebrow">Public profile</span>
      <h2 class="if-profile-media__name">Adam Boas</h2>
      <p class="if-profile-media__role">Defense AI & Autonomy Solutions Architect</p>
      <p class="if-profile-media__summary">Short profile summary for biography, consulting, speaker, or author pages.</p>
    </header>
    <div class="if-profile-media__rail" aria-label="Credentials">
      <div class="if-profile-media__credential"><strong>Security+</strong><span>Certification</span></div>
      <div class="if-profile-media__credential"><strong>AWS SAA</strong><span>Architecture</span></div>
    </div>
    <div class="if-profile-media__actions">
      <a class="if-btn if-btn--secondary" href="#">Resume PDF</a>
      <a class="if-btn if-btn--primary" href="#">Start project</a>
    </div>
    <footer class="if-profile-media__footer">
      <p class="if-profile-media__attribution">Profile facts last verified from public resume.</p>
    </footer>
  </div>
</article>
```

If no production portrait is available, replace the image with `<div class="if-profile-media__portrait if-profile-media__portrait--initials" aria-hidden="true">AB</div>`.

### Publication Card

Use `.if-publication-card` for papers, notes, white papers, case studies, talks, or writing indexes. It packages publication metadata, a title and abstract, tag chips, repeated action affordances, and canonical URL/source metadata. Add `.if-publication-card--featured` for a larger lead card, `.if-publication-card--split` when the container is wide enough for media beside copy, or `.if-publication-card--compact` for a grid/list item.

```html
<article class="if-publication-card if-publication-card--featured if-publication-card--split">
  <div class="if-publication-card__visual" aria-hidden="true">
    <span class="if-publication-card__monogram">ACP-RA</span>
  </div>
  <div class="if-publication-card__body">
    <div class="if-publication-card__meta">
      <span class="if-badge if-badge--info">Reference architecture</span>
      <span>Feb 10, 2026</span>
      <span>Paper</span>
    </div>
    <header class="if-publication-card__header">
      <h2 class="if-publication-card__title"><a href="#">Agent Control Plane Reference Architecture</a></h2>
      <p class="if-publication-card__abstract">A short abstract or deck-summary sentence for scanning.</p>
    </header>
    <div class="if-publication-card__tags" aria-label="Publication tags">
      <span class="if-chip">Trust scopes</span>
      <span class="if-chip">Policy gates</span>
    </div>
    <div class="if-publication-card__actions">
      <a class="if-btn if-btn--primary" href="#">Read paper</a>
      <a class="if-btn if-btn--secondary" href="#">PDF</a>
      <button class="if-btn if-btn--tertiary" type="button">Cite</button>
    </div>
    <footer class="if-publication-card__footer">
      <span>Canonical</span>
      <a class="if-publication-card__canonical" href="#">adamboas.com/writing/acp-ra</a>
    </footer>
  </div>
</article>
```

### Reference Architecture Loop

Use `.if-reference-loop` for public-site reference architectures, governance loops, assurance fabrics, and explanatory systems that need numbered stages with implementation contracts. Add `.if-reference-loop--linear` for a four-column desktop row with a full-width feedback step.

```html
<div class="if-reference-loop if-reference-loop--linear" aria-label="Reference architecture loop">
  <article class="if-reference-loop__step">
    <div class="if-reference-loop__top">
      <span class="if-reference-loop__index">01</span>
      <span class="if-reference-loop__icon if-icon-slot" data-if-icon="authorization" aria-hidden="true"></span>
    </div>
    <h3 class="if-reference-loop__title">Authority</h3>
    <p class="if-reference-loop__body">Declare scope, delegated limits, and conditions for action.</p>
    <div class="if-reference-loop__contract">
      <span>Contract</span>
      <strong>Policy bundle and authority manifest</strong>
    </div>
  </article>
  <article class="if-reference-loop__step if-reference-loop__step--feedback">
    <div class="if-reference-loop__top">
      <span class="if-reference-loop__index">05</span>
      <span class="if-reference-loop__icon if-icon-slot" data-if-icon="trend" aria-hidden="true"></span>
    </div>
    <h3 class="if-reference-loop__title">Learning loop</h3>
    <p class="if-reference-loop__body">Feed evaluations, traces, and after-action findings into the next version.</p>
    <div class="if-reference-loop__contract">
      <span>Contract</span>
      <strong>Evaluation set, trace, and upgrade path</strong>
    </div>
  </article>
</div>
```

### Public-Site Search

Use `.if-public-search` for editorial/public websites that need a search field, category filters, suggested topics, result summaries, and adjacent article navigation. Add `data-if-public-search` to enable framework filtering with `data-if-public-search-query`, `data-if-public-search-filter`, `data-if-public-search-result`, `data-if-public-search-count`, and `data-if-public-search-empty`. The search input can still compose with `.if-autocomplete` and `data-if-autocomplete` for suggestions. Add `.if-public-search--split` when the page can support a side navigation rail, or `.if-public-search--compact` for inline search above a writing index.

```html
<section class="if-public-search if-public-search--split" data-if-public-search aria-labelledby="public-search-title">
  <header class="if-public-search__header">
    <div>
      <span class="if-public-search__eyebrow">Knowledge search</span>
      <h2 class="if-public-search__title" id="public-search-title">Find architectures, packages, and field notes.</h2>
    </div>
    <span class="if-public-search__icon if-icon-slot" data-if-icon="search" aria-hidden="true"></span>
  </header>
  <p class="if-public-search__summary">A short summary of what the public search covers.</p>
  <div class="if-public-search__form" role="search">
    <label class="if-search if-autocomplete">
      <span class="if-search__icon if-icon-slot" data-if-icon="search" aria-hidden="true"></span>
      <span class="if-sr-only">Search public site</span>
      <input class="if-input" type="search" data-if-public-search-query data-if-autocomplete="Architecture Readiness|Autonomy Guardrails" placeholder="Search writing, services, packages...">
    </label>
    <button class="if-btn if-btn--primary" type="button" data-if-public-search-submit>Search</button>
  </div>
  <div class="if-public-search__filters" aria-label="Search filters">
    <button class="if-btn if-btn--secondary if-btn--sm is-active" type="button" data-if-public-search-filter="all" aria-pressed="true">All <span data-if-public-search-count>1 of 1</span></button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-public-search-filter="writing" aria-pressed="false">Writing</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-public-search-filter="packages" aria-pressed="false">Packages</button>
  </div>
  <div class="if-public-search__results" aria-label="Search results">
    <article class="if-public-search__result" data-if-public-search-result data-if-public-search-category="writing" data-if-public-search-text="Agent Control Plane Reference Architecture writing reference architecture autonomy governance">
      <div class="if-public-search__result-header">
        <h3 class="if-public-search__result-title"><a href="#">Agent Control Plane Reference Architecture</a></h3>
        <span class="if-badge if-badge--info">Paper</span>
      </div>
      <div class="if-public-search__result-meta"><span>Writing</span><span>Reference architecture</span></div>
      <p class="if-public-search__result-summary">Search result summary copy.</p>
    </article>
    <p class="if-public-search__summary" data-if-public-search-empty hidden>No results match the current search.</p>
  </div>
  <aside class="if-public-search__nav" aria-label="Article navigation">
    <h3 class="if-public-search__nav-title">Browse library</h3>
    <ul class="if-public-search__nav-list">
      <li><a href="#">Reference architectures <span class="if-link__arrow" aria-hidden="true"></span></a></li>
      <li><a href="#">Engagement packages <span class="if-link__arrow" aria-hidden="true"></span></a></li>
    </ul>
  </aside>
</section>
```

### Attribution Strip

Use `.if-attribution-strip` for compact source, license, image credit, canonical, last-reviewed, and external-link attribution on public pages. It can sit below hero media, publication cards, profile modules, or research pages. Add `.if-attribution-strip--compact` for caption-sized contexts, `.if-attribution-strip--inverse` on dark media, or `.if-attribution-strip--stacked` when multiple facts need more vertical space.

```html
<div class="if-attribution-strip" aria-label="Public page attribution">
  <div class="if-attribution-strip__item">
    <span class="if-attribution-strip__icon if-icon-slot" data-if-icon="sourcePortal" aria-hidden="true"></span>
    <span class="if-attribution-strip__text">
      <span class="if-attribution-strip__label">Source</span>
      <strong class="if-attribution-strip__value">DVIDS public-domain media</strong>
    </span>
  </div>
  <div class="if-attribution-strip__item">
    <span class="if-attribution-strip__icon if-icon-slot" data-if-icon="calendar" aria-hidden="true"></span>
    <span class="if-attribution-strip__text">
      <span class="if-attribution-strip__label">Verified</span>
      <strong class="if-attribution-strip__value">May 14, 2026</strong>
    </span>
  </div>
  <p class="if-attribution-strip__note">Short source, license, or editorial context.</p>
  <div class="if-attribution-strip__links">
    <a class="if-link" href="#">View source</a>
    <a class="if-link" href="#">Citation details</a>
  </div>
</div>
```

### Engagement Package

Use `.if-engagement-package` for consulting offers, advisory packages, assessment sprints, proposal support options, and implementation readiness engagements. Add `.if-engagement-package--featured` for a larger package with header/facts beside scope and deliverables, or `.if-engagement-package--compact` for repeated cards in a package grid.

```html
<article class="if-engagement-package if-engagement-package--featured">
  <header class="if-engagement-package__header">
    <div>
      <span class="if-engagement-package__eyebrow">Architecture sprint</span>
      <h2 class="if-engagement-package__title">Control Plane Readiness Review</h2>
    </div>
    <span class="if-engagement-package__icon if-icon-slot" data-if-icon="briefcase" aria-hidden="true"></span>
  </header>
  <p class="if-engagement-package__summary">A short description of the engagement outcome, audience, and decision it supports.</p>
  <div class="if-engagement-package__facts" aria-label="Engagement facts">
    <div class="if-engagement-package__fact"><span>Timeline</span><strong>2-3 weeks</strong></div>
    <div class="if-engagement-package__fact"><span>Cadence</span><strong>Two sessions / week</strong></div>
    <div class="if-engagement-package__fact"><span>Output</span><strong>Decision-ready roadmap</strong></div>
  </div>
  <div class="if-engagement-package__sections">
    <section class="if-engagement-package__section">
      <h3>Scope</h3>
      <ul class="if-engagement-package__list">
        <li>Architecture review across policy, cloud, delivery, and autonomy boundaries.</li>
        <li>Risk and dependency map for accreditation, identity, data, and operating model constraints.</li>
      </ul>
    </section>
    <section class="if-engagement-package__section">
      <h3>Deliverables</h3>
      <ul class="if-engagement-package__list">
        <li>Executive brief with decision points, tradeoffs, and sequencing.</li>
        <li>Implementation backlog sized for proposal, prototype, or delivery planning.</li>
      </ul>
    </section>
  </div>
  <div class="if-engagement-package__fit" aria-label="Best fit criteria">
    <span class="if-chip">Pre-proposal shaping</span>
    <span class="if-chip">Control-plane strategy</span>
  </div>
  <footer class="if-engagement-package__footer">
    <p class="if-engagement-package__note">Use this space for intake rules, assumptions, availability, pricing language, or procurement notes.</p>
    <div class="if-engagement-package__actions">
      <a class="if-btn if-btn--primary" href="#">Discuss package</a>
      <a class="if-btn if-btn--secondary" href="#">Download one-pager</a>
    </div>
  </footer>
</article>
```

## Coverage Closure Components

Use these primitives when a screen needs production-shaped interaction states that are smaller than a full app surface:

- Upload/dropzone: `.if-dropzone`, `data-if-dropzone`, native file input, staged file chips.
- Command palette: `.if-command-palette`, structured JSON via `data-if-command-source`, generated command groups/items, live visible/total counts, empty state, Ctrl+K/open-toggle behavior, and `getCommandPaletteState`.
- Editable grid: `.if-editable-grid`, `data-if-editable-cell`, row add/status summaries.
- Date/calendar picker: `.if-calendar-grid`, `data-if-date-picker`, generated month grid, previous/next/today controls, native fallback, output/status slots, and arrow/PageUp/PageDown keyboard movement.
- Wizard/stepper: `.if-stepper--interactive`, `.if-stepper--semantic`, `.if-stepper--boxed`, `.if-stepper--unboxed`, `.if-stepper--compact`, `.if-stepper--vertical`, `data-if-wizard`, structured JSON via `data-if-wizard-source`, panels, progress bars, status output, next/previous controls, roving keyboard navigation, and `getWizardState`. Semantic steppers use green completed steps, blue active steps, red future/blocked steps, optional warning states, and configurable boxed, rail-only, or compact node treatment.
- Annotation toolbar: `.if-annotation-toolbar`, `data-if-annotation-toolbar`, `data-if-annotation-tool`, label/short/description metadata, semantic preview states, status slots, roving keyboard controls, `getAnnotationToolbarState`, and `if:annotation-tool-change`.
- Empty/loading/error variants: `.if-empty`, `.if-loading`, `.if-error-state`, `.if-skeleton`, `data-if-state-preview`.

Each emits a named event documented in `docs/event-catalog.md`, and each is included in `examples/components.html#coverage-components`.

## Product Patterns

The examples demonstrate reusable product-level compositions:

- Review queue: table selection, decision command bar, evidence tabs, reviewer notes, provenance timeline.
- Advanced search: natural-language query, clause builder, semantic threshold, saved search, refinement chips, result table.
- Sources and agents: source registry, agent roster, run controls, publication thresholds, audit log.
- Source-aware ingest: external adapters, extraction stages, agent outputs, synthetic records, and relationship bundles.
- Workspace personalization: saved views, dashboard widget canvas, right-side settings, density and theme controls.
- Consulting website: homepage hero, services overview, engagement packages, public-site search, attribution strips, profile/resume timeline, publication cards, reference architecture loops, insights/blog cards, contact form, stats, badges, progress steps.
