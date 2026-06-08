# Component API Reference

This file is the copy-paste reference for the framework. Each component family includes:

- API table: required classes, optional classes, behavior attributes, and public JavaScript hooks.
- Variant matrix: supported visual, density, state, and behavior variants.
- Copy-paste example: minimal plain HTML that works with the compiled CSS and optional JavaScript layer.

Use this with [`components.md`](./components.md), [`usage.md`](./usage.md), [`accessibility.md`](./accessibility.md), [`keyboard.md`](./keyboard.md), [`data-schemas.md`](./data-schemas.md), [`component-manifest.json`](./component-manifest.json), [`recipes.md`](./recipes.md), [`event-catalog.md`](./event-catalog.md), and [`agentic-ergonomics.md`](./agentic-ergonomics.md).

Agent-oriented order of operations:

1. Use `component-manifest.json` to select the component id, classes, data attributes, APIs, events, examples, and docs.
2. Use `recipes.md` for the implementation playbook.
3. Use `event-catalog.md` for host integration and telemetry.
4. Return here for exact copy-paste markup and variant matrices.

## Contract Stability Model

The manifest is the source of truth for whether a component can be used by a downstream agent without renegotiating its API. Every component in `docs/component-manifest.json` carries `stability` and `contract` fields.

| Stability | Meaning | Downstream use |
| --- | --- | --- |
| `stable` | Public component contract is frozen for v0.1 handoff. Classes, data attributes, JS APIs, emitted events or explicit static-event policy, accessibility notes, docs, and examples are required. | Use in Policy MVP or AdamBoas.com planning and buildout. |
| `experimental` | Framework-owned and reusable, but still needs production hardening, fallback definition, or adapter/engine validation. | Use only with the documented caveat and a visible hardening work item. |
| `demo-only` | Exists to test, stress, or explain the framework rather than to serve as a production surface. | Keep in design showcase and QA flows unless promoted later. |

Stable components must have component identity, when-to-use guidance, avoid-when guidance, primary classes, data attributes, JS APIs or an explicit static behavior contract, events or an explicit static-event policy, recipe links, docs links, example links, accessibility notes, and contract evidence metadata. `npm run validate` enforces this freeze through `scripts/validate.mjs`.

## Programmatic Behavior Contract

The framework is designed to be controlled by markup, user interaction, or JavaScript. Use `InterfaceFramework.getComponentController(target)` when an app, adapter, test, or agent needs to operate a component without coupling to page-specific click handlers.

```js
const table = InterfaceFramework.getComponentController("#policy-table");
table.reset();
table.refresh();

const graph = InterfaceFramework.getComponentController("[data-if-graph]");
graph.select("dodi-5200-01");
graph.reset();

const popover = InterfaceFramework.getComponentController("#account-menu-button");
popover.open();
popover.close({ restoreFocus: true });
```

### Controller Methods

| Method | Purpose | Supported component families |
| --- | --- | --- |
| `open(options)` | Open a disclosure-like surface. | Menu toggles, popover toggles, collapsible panels, command palette. |
| `close(options)` | Close a disclosure-like surface and optionally restore focus. | Menu toggles, popover toggles, collapsible panels, command palette. |
| `toggle(options)` | Toggle open/closed, pressed, or expanded state. | Menus, popovers, collapsibles, expandable surfaces, pressed controls. |
| `select(value, options)` | Select an item by id, index, node id, date value, or step index. | Tabs, graph nodes, diagram items, hierarchy rows, date picker, wizard. |
| `setState(state, options)` | Apply a named component state or mode. | Data table refresh, graph viewport, diagram edit mode/tool, state previews. |
| `reset(options)` | Return the component to its default visible state. | Tables, graphs, diagrams, hierarchy, date picker. |
| `refresh(options)` | Rehydrate a component subtree and recompute generated UI. | Tables, graphs, diagrams, any framework subtree. |
| `destroy(options)` | Tear down behavior modules for a component subtree. | Any framework subtree. |

### Shared State Helpers

Use these helpers when building custom components or host-owned wrappers:

| Helper | Contract |
| --- | --- |
| `setDisclosureState(control, target, expanded, options)` | Synchronizes `aria-expanded`, `hidden`, `aria-hidden`, active/open classes, and optional `aria-pressed`. |
| `setPressed(control, pressed)` | Synchronizes `aria-pressed` and active styling. |
| `setSelected(control, selected, options)` | Synchronizes `aria-selected`, selected/active styling, and optional roving focus. |
| `setExpanded(control, expanded)` | Synchronizes `aria-expanded` and expanded styling. |

This keeps programmatic state changes, pointer interactions, keyboard interactions, and integration tests aligned.

## Component Inventory

| Area | Component families |
| --- | --- |
| Foundations | Shell, topbar, sidebar, content regions, utilities, theme controls, icons |
| Actions | Buttons, icon buttons, split buttons, menus, command strips |
| Inputs | Fields, inputs, selects, checkboxes, radio buttons, toggles, ranges, search, autocomplete, validation, tooltips |
| Navigation | Tabs, accordions, route nav, mobile nav, pagination, breadcrumbs |
| Overlays | Popovers, account menu, notifications, modals, drawers, toasts |
| Data display | Badges, chips, cards, panels, metadata panels, tables, charts, sparklines, KPI cards |
| Intelligence | Graphs, relationship maps, hierarchy explorers, claim trackers, timelines, document viewer, policy diff, diagrams |
| Governance | Provenance, alert rules, degraded states, agent runs, export contracts, role-gated actions |
| Public site | Site shell, hero, service cards, profile media, publication cards, reference loops, search, contact, engagement packages |

## Shell And Layout

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Root | `.if-shell` | `.if-shell--library`, `.if-site-shell`, `data-density` | App or documentation root. |
| Main layout | `.if-main` | `.if-main--with-sidebar`, `.if-main--tri-pane` | Use with `.if-sidebar`, `.if-content`, and detail panels. |
| Content | `.if-content` | `.if-page`, `.if-content-region`, `.if-detail-region` | Central scrollable work area. |
| Utilities | none | `.if-grid`, `.if-stack`, `.if-cluster`, `.if-scroll-region` | Use utilities for repeated layout composition. |

### Variant Matrix

| Variant | Class or attribute | Use |
| --- | --- | --- |
| Standard app | `.if-shell` | Product pages. |
| Library | `.if-shell--library` | Design-system and documentation surfaces. |
| Sidebar | `.if-main--with-sidebar` | Filters, saved views, library nav. |
| Tri-pane | `.if-main--tri-pane` | Sidebar, primary work area, contextual detail panel. |
| Density | `data-density="compact|comfortable|spacious"` | Page or component density. |

### Copy-Paste

```html
<div class="if-shell" data-density="comfortable">
  <header class="if-topbar">...</header>
  <div class="if-main if-main--with-sidebar">
    <aside class="if-sidebar">...</aside>
    <main class="if-content">
      <section class="if-page">...</section>
    </main>
  </div>
</div>
```

## Topbar And Utility Cluster

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Topbar | `.if-topbar` | `.if-topbar__nav`, `.if-topbar__actions` | Global nav and utility area. |
| Brand | `.if-brand` | `.if-brand__mark` | Use as first topbar item. |
| Navigation | `.if-nav-link` | `.is-active`, `aria-current="page"` | Active state is underline/bar style. |
| Utility cluster | `.if-utility-cluster` | `.if-utility-search`, `.if-notification-btn`, `.if-account-menu` | Search, notifications, account. |

### Variant Matrix

| Variant | Contract | Behavior |
| --- | --- | --- |
| Desktop search | `.if-utility-search.if-desktop-only` | Global autocomplete. |
| Notifications | `.if-popover.if-notification-menu` | Opens notification surface. |
| Account | `.if-popover.if-account-popover` | Opens profile/preferences/actions. |
| Mobile nav | `[data-if-nav-toggle]` | Opens `.if-sidebar` or nav drawer. |

### Copy-Paste

```html
<header class="if-topbar">
  <a class="if-brand" href="/"><span class="if-brand__mark">PI</span><span>Policy Intelligence</span></a>
  <nav class="if-topbar__nav" aria-label="Primary">
    <a class="if-nav-link is-active" href="/" aria-current="page">Overview</a>
    <a class="if-nav-link" href="/graph">Graph</a>
  </nav>
  <div class="if-topbar__actions if-utility-cluster">
    <label class="if-search if-autocomplete if-utility-search">
      <span class="if-search__icon if-icon-slot" data-if-icon="search" aria-hidden="true"></span>
      <input class="if-input" type="search" data-if-autocomplete-remote="policy-intelligence" placeholder="Search...">
    </label>
  </div>
</header>
```

## Sidebar And Navigation Lists

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Sidebar | `.if-sidebar` | `id`, `.is-open` | Persistent or mobile drawer-like nav. |
| Section | `.if-sidebar__section` | `.if-sidebar__title` | Groups filters or links. |
| Nav | `.if-sidebar__nav` | `.if-sidebar__nav--library`, `data-if-section-nav` | Section-aware scrolling. |
| Link | `.if-sidebar__link` | `.is-active`, badge/count | Use for library and watchlist nav. |

### Variant Matrix

| Variant | Contract | Use |
| --- | --- | --- |
| Library nav | `.if-sidebar__nav--library` | Design-system sections. |
| Filter rail | `.if-sidebar` with fields | Search/filter controls. |
| Watchlist rail | `.if-sidebar__nav-group` with badges | Saved views and group counts. |

### Copy-Paste

```html
<aside class="if-sidebar" id="page-nav">
  <div class="if-sidebar__section">
    <h2 class="if-sidebar__title">Library sections</h2>
    <nav class="if-sidebar__nav if-sidebar__nav--library" data-if-section-nav>
      <a class="if-sidebar__link is-active" href="#buttons">Buttons</a>
      <a class="if-sidebar__link" href="#tables">Tables</a>
    </nav>
  </div>
</aside>
```

## Buttons

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Button | `.if-btn` | semantic and size modifiers | Native `button` or link. |
| Icon | `.if-icon-slot[data-if-icon]` | leading or trailing | Hydrated by JS icon module. |
| State | none | `.is-active`, `[aria-pressed]`, `[disabled]` | Keep state semantic. |

### Variant Matrix

| Variant | Class | Use |
| --- | --- | --- |
| Primary | `.if-btn--primary` | Main action. |
| Secondary | `.if-btn--secondary` | Alternate action. |
| Tertiary | `.if-btn--tertiary` | Low emphasis. |
| Ghost | `.if-btn--ghost` | Toolbar/flat control. |
| Success | `.if-btn--success` | Approve/positive workflow. |
| Warning | `.if-btn--warning` | Snooze/escalation caution. |
| Danger | `.if-btn--danger` | Reject/delete/destructive. |
| Small | `.if-btn--sm` | Dense toolbars. |
| Large | `.if-btn--lg` | Prominent CTA. |
| Full width | `.if-btn--block` | Drawer or mobile actions. |

### Copy-Paste

```html
<button class="if-btn if-btn--primary" type="button">
  <span class="if-icon-slot" data-if-icon="plus" aria-hidden="true"></span>
  Create policy
</button>
<button class="if-btn if-btn--danger" type="button">Delete</button>
```

## Icon Buttons

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Icon button | `.if-icon-btn` | `.if-icon-btn--sm`, `.is-active` | Must have visible text, `aria-label`, or `title`. |
| Icon slot | `.if-icon-slot[data-if-icon]` | `aria-hidden="true"` | Use registry names from `docs/icons.md`. |

### Variant Matrix

| Variant | Class | Use |
| --- | --- | --- |
| Default | `.if-icon-btn` | Toolbar action. |
| Small | `.if-icon-btn--sm` | Tables, panels, compact toolbars. |
| Active | `.is-active` | Selected mode. |
| Semantic | pair with surface/border utility | Approve, warning, danger contexts. |

### Copy-Paste

```html
<button class="if-icon-btn if-icon-btn--sm" type="button" aria-label="Export">
  <span class="if-icon-slot" data-if-icon="download" aria-hidden="true"></span>
</button>
```

## Split Buttons And Menus

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Wrapper | `.if-split-action-wrap` | none | Anchors menu. |
| Group | `.if-split-action` | `role="group"` | Keeps command and toggle together. |
| Toggle | `[data-if-menu-toggle]` | `aria-expanded`, `aria-label` | Points to menu id or selector. |
| Menu | `.if-menu[data-if-menu]` | `hidden` | JS applies menu roles and keyboard behavior. |
| Item | `[data-if-menu-item]` | `data-if-menu-label`, `data-if-menu-target` | Updates label/preview when selected. |

### Variant Matrix

| Variant | Contract | Use |
| --- | --- | --- |
| Export split | primary button plus toggle | Export format selection. |
| Segmented menu | `.if-menu` with icons | Toolbar options. |
| Row action menu | icon toggle plus menu | Table actions. |

### Copy-Paste

```html
<div class="if-split-action-wrap">
  <div class="if-split-action" role="group" aria-label="Export options">
    <button class="if-btn if-btn--primary" type="button">Export selected</button>
    <button class="if-btn if-btn--primary if-split-action__toggle"
      type="button"
      aria-label="Choose export format"
      aria-expanded="false"
      data-if-menu-toggle="#export-menu">
      <span class="if-icon-slot" data-if-icon="chevronDown"></span>
    </button>
  </div>
  <div class="if-menu" id="export-menu" data-if-menu hidden>
    <button type="button" data-if-menu-item="CSV">CSV</button>
    <button type="button" data-if-menu-item="JSON">JSON</button>
    <button type="button" data-if-menu-item="PDF">PDF</button>
  </div>
</div>
```

## Icons

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Icon slot | `.if-icon-slot[data-if-icon]` | `title`, `aria-hidden` | Hydrated from local registry. |
| Asset slot | `.if-asset-slot[data-if-asset]` | `data-if-asset-alt`, `data-if-asset-size`, `data-if-asset-width`, `data-if-asset-height`, `data-if-asset-fit`, `data-if-asset-position`, `data-if-asset-fallback-icon`, `data-if-asset-export` | Hydrates SVG/PNG/JPG/WebP/AVIF/GIF/image data URIs with consistent sizing and fallback behavior. |
| Catalog | `[data-if-icon-catalog]` | `[data-if-icon-catalog-filter]` | Searchable icon registry. |

### Variant Matrix

| Variant | Registry examples | Use |
| --- | --- | --- |
| Controls | `search`, `download`, `filter`, `more` | Toolbars and inputs. |
| Entities | `policy`, `source`, `obligation`, `evidence` | Data and graph nodes. |
| Domain | `army`, `navy`, `airForce`, `spaceForce` | Organization and hierarchy. |
| Seal-style | `sealDod`, `sealNavy`, `sealCisa` | Provenance and authority. |
| Embedded assets | SVG/PNG/JPG marks through `data-if-asset` | Branded service marks, approved source logos, scientific/clinical images, or third-party icons. |

### Copy-Paste

```html
<span class="if-icon-slot" data-if-icon="sealDod" aria-hidden="true"></span>
<span class="if-icon-slot" data-if-icon="policy" aria-hidden="true"></span>
<span class="if-asset-slot if-asset-slot--brand"
  data-if-asset="./assets/service-mark.svg"
  data-if-asset-alt="Service mark"
  data-if-asset-fallback-icon="shield"></span>
```

## Theme Controls

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Theme root | `data-theme` | `light`, `dark`, `high-contrast`, `system`, `calm`, `executive` | Omit for light default. |
| Button | `[data-if-theme]` | `data-if-theme-target` | Applies theme and syncs controls. |
| Select | `[data-if-theme-control]` | `data-if-theme-target` | Uses selected value. |
| Label | `[data-if-theme-label]` | none | Displays current theme. |
| API | `setTheme`, `getTheme`, `hydrateThemeControls` | none | Browser bundle functions. |
| Compiler | `npm run theme:compile` | `--check` through `npm run validate` | Regenerates and verifies contrast reports. |

### Variant Matrix

| Variant | Value | Use |
| --- | --- | --- |
| Light | `light` | Default. |
| Dark | `dark` or `midnight` | Low-light operations. |
| High contrast | `high-contrast` | Maximum boundary clarity. |
| System | `system` | Explicit OS preference matching. |
| Accent overlays | `calm`, `executive` | Light theme with alternate accent. |

### Copy-Paste

```html
<button class="if-btn if-btn--secondary is-active" type="button" data-if-theme="light">Light</button>
<button class="if-btn if-btn--secondary" type="button" data-if-theme="dark">Dark</button>
<button class="if-btn if-btn--secondary" type="button" data-if-theme="high-contrast">High contrast</button>
<span data-if-theme-label>Light</span>
```

Contrast reports live at `docs/theme-contrast-report.md` and `docs/theme-contrast-report.json`; scoped visual snapshots live in `examples/theme-states.html`.

## Fields, Inputs, Selects, And Help Text

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Field | `.if-field` | `.if-field--invalid`, `.if-field--valid`, `.if-field--warning` | Label/help/feedback wrapper. |
| Label | `.if-field__label` | `.if-field__required` | Visible label required. |
| Control | `.if-input`, `.if-select`, `.if-textarea` | `aria-invalid`, `aria-describedby` | Native form control. |
| Help | `.if-field__help`, `.if-field__hint` | `[data-if-field-help]` | Contract or instruction copy. |
| Feedback | `.if-field__feedback`, `.if-field__error` | `[data-if-field-feedback]` | Validation feedback. |

### Variant Matrix

| Variant | Contract | Use |
| --- | --- | --- |
| Text | `.if-input` | Short value. |
| Text area | `.if-textarea` | Long note. |
| Select | `.if-select` | Single option. |
| Invalid | `.if-field--invalid`, `aria-invalid="true"` | Blocking issue. |
| Warning | `.if-field--warning` | Non-blocking guidance. |
| Valid | `.if-field--valid` | Positive confirmation. |

### Copy-Paste

```html
<label class="if-field" data-if-validate="required min:8" data-if-error="Use at least 8 characters.">
  <span class="if-field__label">Decision reason <span class="if-field__required">*</span></span>
  <span class="if-field__help" data-if-field-help>Required before approving.</span>
  <input class="if-input" type="text">
  <span class="if-field__feedback" data-if-field-feedback></span>
</label>
```

## Search And Autocomplete

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Search wrapper | `.if-search` | `.if-search--compact`, `.if-autocomplete`, `.if-autocomplete--reserve` | Aligns icon and input; reserve variant keeps controls below an open menu reachable. |
| Icon | `.if-search__icon` | `.if-icon-slot[data-if-icon="search"]` | Visual anchor. |
| Local suggestions | `[data-if-autocomplete]` | JSON or pipe-delimited string | Client-side suggestions. |
| Remote adapter | `[data-if-autocomplete-remote]`, `[data-if-autocomplete-mock]` | delay, limit, min, output | Uses registered adapter or framework mock provider. |
| Output | `[data-if-autocomplete-output]` | selector | Writes selected suggestion summary. |
| Cancel | `[data-if-autocomplete-cancel]` | selector | Aborts pending remote request and can render cancelled state. |
| Demo state | `[data-if-autocomplete-demo]` | query/state fixtures | Drives result, empty, and error scenarios in docs and examples. |
| API | `hydrateAutocompleteInputs`, `getAutocompleteState`, `registerAutocompleteAdapter`, `unregisterAutocompleteAdapter`, `cancelAutocomplete`, `renderAutocomplete` | none | Production integration and editor state inspection. |
| Events | `if:autocomplete-request`, `if:autocomplete-results`, `if:autocomplete-cancel`, `if:autocomplete-error`, `if:autocomplete-state`, `if:autocomplete-select` | autocomplete detail | Emits query, provider, request id, items, state, and selected metadata. |

### Variant Matrix

| Variant | Contract | Use |
| --- | --- | --- |
| Static search | `.if-search` | Plain search input. |
| Local autocomplete | `[data-if-autocomplete]` | Small known lists. |
| Mock remote | `data-if-autocomplete-remote="policy-intelligence"` | Examples and demos. |
| Production remote | custom adapter name | Server/postback suggestions. |

### Copy-Paste

```html
<label class="if-search if-autocomplete">
  <span class="if-search__icon if-icon-slot" data-if-icon="search" aria-hidden="true"></span>
  <input class="if-input"
    type="search"
    data-if-autocomplete-remote="policy-intelligence"
    data-if-autocomplete-delay="220"
    data-if-autocomplete-limit="8"
    placeholder="Search policies, sources, organizations...">
</label>
```

## Checkboxes, Radios, Toggles, And Ranges

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Checkbox | `.if-checkbox input[type="checkbox"]` | checked/disabled | Multi-select and filters. |
| Radio | `.if-radio input[type="radio"]` | checked/disabled | Mutually exclusive choice. |
| Toggle | `.if-toggle input[type="checkbox"]` | checked/disabled | Binary settings. |
| Range | `.if-range` | `data-if-control-var`, output hooks | Numeric controls. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Checked | Active filter or option. |
| Disabled | Unavailable option. |
| Indeterminate | Mixed table selection. |
| Token range | Live CSS-variable controls. |

### Copy-Paste

```html
<label class="if-checkbox"><input type="checkbox" checked> Include inferred links</label>
<label class="if-toggle"><input type="checkbox" checked> Show analyst-reviewed only</label>
<label class="if-field">
  <span class="if-field__label">Density <output id="density-output">0.7rem</output></span>
  <input class="if-range" type="range" min="0.45" max="1.25" step="0.05"
    data-if-control-var="--surface-density"
    data-if-control-target="#preview"
    data-if-control-output="#density-output">
</label>
```

## Validation And Error Summaries

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Form | `[data-if-form]` | `data-if-form-live-summary`, `data-if-form-success` | Enables validation. |
| Summary | `[data-if-form-summary]` | role/aria-live | Renders errors. |
| Field rules | `[data-if-validate]` | required, min, max, email | Rule string. |
| Messages | `data-if-error`, `data-if-warning`, `data-if-valid` | none | State messages. |
| API | `validateField`, `validateForm`, `setFieldState` | none | Programmatic control. |

### Variant Matrix

| Variant | Contract | Use |
| --- | --- | --- |
| Required | `data-if-validate="required"` | Non-empty. |
| Minimum | `min:8` | Text length. |
| Email | `email` | Address validation. |
| Live summary | `data-if-form-live-summary="true"` | Reviewer forms. |

### Copy-Paste

```html
<form data-if-form data-if-form-live-summary="true" novalidate>
  <div class="if-form-summary" data-if-form-summary role="alert" aria-live="polite" hidden></div>
  <label class="if-field" data-if-validate="required min:8" data-if-error="Add a review reason.">
    <span class="if-field__label">Review reason</span>
    <input class="if-input" type="text">
    <span class="if-field__feedback" data-if-field-feedback></span>
  </label>
  <button class="if-btn if-btn--primary" type="submit">Validate</button>
</form>
```

## Tooltips

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Trigger | `[data-if-tooltip]` | placement, offset | Tooltip text lives in attribute. |
| Placement | `data-if-tooltip-placement` | `top`, `bottom`, `left`, `right`, `auto` | Collision-aware. |
| API | `showTooltip`, `hideTooltip`, `computeTooltipPosition` | none | Programmatic control. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Hover/focus | Default trigger behavior. |
| Auto placement | Collision-aware fallback. |
| Help icon | Dense field or table header help. |

### Copy-Paste

```html
<button class="if-icon-btn if-icon-btn--sm"
  type="button"
  aria-label="Decision reason help"
  data-if-tooltip="Explain the decision in language a reviewer can audit."
  data-if-tooltip-placement="right">
  <span class="if-icon-slot" data-if-icon="info" aria-hidden="true"></span>
</button>
```

## Tabs

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Root | `[data-if-tabs]` | `.if-tabs` | Behavior root. |
| Structured root | `[data-if-tabs-source]` | `data-if-tabs-json` | Renders tablist, panels, and nested accordions from JSON. |
| List | `[role="tablist"]` | `.if-tabs__list` | Tab buttons. |
| Tab | `[role="tab"]` | `aria-selected`, `aria-controls` | Controls one panel. |
| Panel | `[role="tabpanel"]` | `hidden` | Associated content. |
| API | `renderTabs`, `getTabs`, `getTabsState`, `activateTab` | none | Programmatic rendering, state reads, and activation. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Standard | Content sections. |
| Compact | Dense detail panels. |
| Segmented | View mode switchers. |

### Copy-Paste

```html
<div class="if-tabs" data-if-tabs>
  <div class="if-tabs__list" role="tablist">
    <button id="summary-tab" role="tab" aria-controls="summary-panel" aria-selected="true">Summary</button>
    <button id="history-tab" role="tab" aria-controls="history-panel" aria-selected="false">History</button>
  </div>
  <section id="summary-panel" role="tabpanel" aria-labelledby="summary-tab">...</section>
  <section id="history-panel" role="tabpanel" aria-labelledby="history-tab" hidden>...</section>
</div>
```

## Accordions

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Structured group | `.if-accordion[data-if-accordion-source]` | `data-if-accordion-json` | Renders accordion items from JSON. |
| Trigger | `[data-if-accordion-trigger]` or `[data-if-accordion]` | `aria-expanded` | Toggle control. |
| Panel | target id | `hidden` | Collapsible content. |
| API | `renderAccordion`, `getAccordionState`, `setDisclosureState` | none | Programmatic rendering, state reads, and disclosure updates. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Single section | Dense detail disclosure. |
| Grouped | Filter or FAQ-style lists. |
| Nested | Metadata subsections. |

### Copy-Paste

```html
<button class="if-accordion__trigger" type="button" aria-expanded="false" aria-controls="policy-refs" data-if-accordion>
  References
</button>
<section id="policy-refs" hidden>...</section>
```

## Popovers, Account Menu, And Notifications

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Root | `.if-popover[data-if-popover]` | component modifier | Anchor. |
| Toggle | `[data-if-popover-toggle]` | `aria-expanded`, `aria-controls` | Opens target. |
| Panel | `.if-popover__panel` | `role="dialog"`, `hidden` | Dismissible surface. |
| Account | `.if-account-surface` | theme controls, actions | Profile dropdown. |
| Notifications | `.if-notifications` | unread classes | Event inbox. |
| API | `togglePopover`, `closePopovers` | none | Programmatic behavior. |

### Variant Matrix

| Variant | Contract | Use |
| --- | --- | --- |
| Generic | `.if-popover` | Small anchored panel. |
| Account | `.if-account-popover` | Profile and preferences. |
| Notifications | `.if-notification-menu` | Alerts and events. |
| Menu-like | `.if-menu` | Command choices. |

### Copy-Paste

```html
<div class="if-popover if-account-popover" data-if-popover>
  <button class="if-account-menu" type="button" aria-label="Account menu"
    aria-expanded="false" aria-controls="account-menu" data-if-popover-toggle="account-menu">
    <span class="if-avatar">JD</span><span class="if-account-menu__name">Jane Doe</span>
  </button>
  <section class="if-popover__panel if-account-surface" id="account-menu" role="dialog" aria-label="Account controls" hidden>
    ...
  </section>
</div>
```

## Modals

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Open | `[data-if-modal-open]` | selector/id target | Opens modal. |
| Modal | `.if-modal` | `role="dialog"`, `aria-modal="true"` | Backdrop/modal surface. |
| Close | `[data-if-modal-close]` | none | Closes containing modal. |
| API | `openModal`, `closeModal` | none | Programmatic behavior. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Confirm | Focused destructive/approval choice. |
| Form | Short review input. |
| Wide | Dense diff or evidence preview. |

### Copy-Paste

```html
<button class="if-btn" type="button" data-if-modal-open="#confirm-modal">Open modal</button>
<div class="if-modal" id="confirm-modal" role="dialog" aria-modal="true" aria-label="Confirm action" hidden>
  <section class="if-modal__surface">
    <button class="if-icon-btn" type="button" data-if-modal-close aria-label="Close">x</button>
    <h2>Confirm action</h2>
    <button class="if-btn if-btn--primary" type="button">Confirm</button>
  </section>
</div>
```

## Drawers

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Open | `[data-if-drawer-open]` | selector/id target | Opens drawer. |
| Drawer | `.if-drawer` | side variants, `hidden` | Sliding detail surface. |
| Close | `[data-if-drawer-close]` | none | Closes drawer. |
| API | `openDrawer`, `closeDrawer` | none | Programmatic behavior. |

### Variant Matrix

| Variant | Class | Use |
| --- | --- | --- |
| End / right | `.if-drawer` | Default contextual detail. |
| Start / left | `.if-drawer--start` | Filter/navigation drawer. |
| Wide | `.if-drawer` with local width override | Review or document context. |

### Copy-Paste

```html
<button class="if-btn" type="button" data-if-drawer-open="#details-drawer">Open details</button>
<aside class="if-drawer" id="details-drawer" hidden>
  <header class="if-drawer__header">
    <h2>Policy details</h2>
    <button class="if-icon-btn" type="button" data-if-drawer-close aria-label="Close">x</button>
  </header>
</aside>
```

## Alerts, Empty, Loading, Success, Cancelled, And Error States

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Alert | `.if-alert` | semantic modifier | Inline feedback. |
| Empty | `.if-empty` | icon/action | No data or no results. |
| Loading | `.if-skeleton`, `.if-loading-dot` | none | Non-blocking loading. |
| Success | `.if-empty`, `.if-alert--success` | action | Successful adapter or workflow. |
| Cancelled | `.if-empty` | retry action | Cancelled async adapter request. |
| Error | `.if-error-state` | retry action | Recoverable error. |

### Variant Matrix

| Variant | Class | Use |
| --- | --- | --- |
| Info | `.if-alert--info` | Neutral information. |
| Success | `.if-alert--success` | Saved/complete. |
| Warning | `.if-alert--warning` | Risk or attention. |
| Danger | `.if-alert--danger` | Error/blocking. |

### Copy-Paste

```html
<section class="if-alert if-alert--warning" role="status">
  <span class="if-icon-slot" data-if-icon="warning" aria-hidden="true"></span>
  <span>Parser warning on 14 document sections.</span>
</section>
```

## Badges And Chips

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Badge | `.if-badge` | semantic modifier | Status, confidence, risk. |
| Chip | `.if-chip` | removable/actionable | Filter tag or entity token. |
| Chip list | `.if-chip-list` | none | Wraps chips safely. |

### Variant Matrix

| Family | Classes |
| --- | --- |
| Confidence | `.if-badge--confidence-high`, `--confidence-medium`, `--confidence-low` |
| Risk | `.if-badge--risk-high`, `--risk-medium`, `--risk-low` |
| Status | `.if-badge--status-open`, `--status-in-review`, `--status-approved`, `--status-blocked` |
| Source health | `.if-badge--status-healthy`, `--status-degraded`, `--status-errors` |
| Severity | `.if-badge--high`, `--medium`, `--low` |

### Copy-Paste

```html
<span class="if-badge if-badge--confidence-high">High</span>
<button class="if-chip" type="button">Cyber <span aria-hidden="true">x</span></button>
```

## Cards, Panels, And Metadata Panels

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Card | `.if-card` | semantic/state modifiers | Repeated content item. |
| Panel | `.if-panel` | `.if-content-region`, `.if-detail-region` | Framed work area. |
| Metadata | `.if-metadata-panel` | `.if-kv`, badge/chip lists | Record facts. |
| Header | component header class | icon/action slots | Keep title/action aligned. |
| Collapsible root | `[data-if-collapsible]` | `data-if-collapsed="true"`, `data-if-collapsible-label` | Opt-in inline collapse for cards, panels, and specimens. |
| Collapsible toggle | `[data-if-collapsible-toggle]` | `data-if-expanded-label`, `data-if-collapsed-label`, `data-if-preserve-label` | Native button; behavior syncs `aria-expanded` and `aria-controls`. |
| Collapsible region | `[data-if-collapsible-region]` | explicit selector via `data-if-collapsible-region` | The body/content region hidden when collapsed. |
| Collapsible status | `[data-if-collapsible-status]` | `data-if-expanded-text`, `data-if-collapsed-text` | Optional text state for dense settings rows. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Record card | Table/detail companion. |
| KPI card | Dashboard metrics. |
| Metadata panel | Provenance and record facts. |
| Command panel | Action set for review/source operations. |
| Evidence panel | Source snippets and provenance. |
| Collapsible card | Optional details inside a repeated card or control specimen. |
| Collapsible work panel | Hide/show dense sidecar controls without entering a full-screen expanded mode. |

### Collapsible Surface Behavior

Use `data-if-collapsible` when a card or panel should be able to hide its own body inline. This is separate from `data-if-surface-expand`, which expands a larger work surface when the target uses `.if-expandable-surface`; explicit lightweight targets are revealed inline without locking page scroll.

```html
<article class="if-panel" data-if-collapsible data-if-collapsible-label="Source health details">
  <header class="if-panel__header">
    <h2 class="if-panel__title" data-if-collapsible-title>Source health details</h2>
    <button class="if-icon-btn if-collapsible-toggle" type="button" data-if-collapsible-toggle aria-expanded="true">
      <span class="if-icon-slot" data-if-icon="minus" data-if-collapsible-icon aria-hidden="true"></span>
    </button>
  </header>
  <div class="if-collapsible-region" data-if-collapsible-region>
    <p>Dense metadata, charts, or optional controls live here.</p>
  </div>
</article>
```

Behavior API:

- `InterfaceFramework.hydrateCollapsibleSurfaces(root)` syncs ARIA, icons, hidden state, and status labels.
- `InterfaceFramework.toggleCollapsibleSurface(button)` toggles the nearest or explicitly targeted collapsible surface.
- `if:collapsible-toggle` emits `{ expanded, region, surface, control }`.

### Copy-Paste

```html
<article class="if-panel if-metadata-panel">
  <header class="if-panel__header">
    <h2 class="if-panel__title">Provenance</h2>
    <span class="if-badge if-badge--confidence-high">0.91</span>
  </header>
  <dl class="if-kv">
    <div><dt>Source</dt><dd>DoD Issuances Portal</dd></div>
    <div><dt>Published</dt><dd>May 10, 2025</dd></div>
  </dl>
</article>
```

## Tables

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Root | `.if-data-table[data-if-data-table]` | page size, server adapter | Behavior root. |
| Rows | `[data-if-table-row]` | search/sort attributes | Filter/sort targets. |
| Filter | `[data-if-table-filter]` | target selector | Searches table. |
| Sort | `[data-if-table-sort]` | sort key | Sort button. |
| Select | `[data-if-table-select]`, `[data-if-table-select-all]` | none | Selection state. |
| Status | `[data-if-table-status]` | `filtered`, `selected`, `start`, `end` | Live counts. |
| API | `setDataTableData`, `refreshDataTable`, `registerDataTableAdapter`, `pinDataTableColumn`, `resizeDataTableColumn` | none | Production integration. |

### Variant Matrix

| Variant | Contract | Use |
| --- | --- | --- |
| Client table | rows in markup | Small/medium datasets. |
| Server table | adapter name | Async query/cancel/error/empty. |
| Sticky/pinned | pin API or data attrs | Wide operational tables. |
| Virtualized | virtual window API | Large datasets. |
| Selectable | selection attrs | Bulk actions. |

### Copy-Paste

```html
<div class="if-data-table" id="records-table" data-if-data-table data-if-table-page-size="10">
  <label class="if-search">
    <input class="if-input" data-if-table-filter="#records-table" placeholder="Filter records...">
  </label>
  <table class="if-table">
    <thead><tr><th><button class="if-table__sort" data-if-table-sort="title">Title</button></th></tr></thead>
    <tbody>
      <tr data-if-table-row data-if-table-search="DoDI 5200.01 information" data-sort-title="DoDI 5200.01">
        <td>DoDI 5200.01</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Pagination

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Pagination | `.if-pagination` | `.if-pagination__pages` | Table/page controls. |
| Button | `.if-page-btn` | `.is-active`, disabled | Use native buttons. |
| Table hooks | `[data-if-table-prev]`, `[data-if-table-next]`, `[data-if-table-pages]` | none | Table pagination. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Table pagination | Data table pages. |
| Static pages | Search results. |
| Compact | Dense card or mobile. |

### Copy-Paste

```html
<div class="if-pagination">
  <button class="if-page-btn" type="button" data-if-table-prev>&lt;</button>
  <span class="if-pagination__pages" data-if-table-pages></span>
  <button class="if-page-btn" type="button" data-if-table-next>&gt;</button>
</div>
```

## Charts, Analytics, And Sparklines

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Chart slot | `[data-if-chart]` | label, data, threshold, height, selected point state | Hydrated SVG/chart markup with selectable, keyboard-accessible data points. |
| Sparkline | `[data-if-sparkline]` | stream controls | Inline trend chart. |
| API | `hydrateCharts`, `setChartDataset`, `setChartHeight`, `setChartThreshold`, `selectChartPoint`, `renderSparkline`, `startSparklineStream` | none | Production and demo controls. |

### Variant Matrix

| Chart | `data-if-chart` value |
| --- | --- |
| Bar | `bar` |
| Line | `line` |
| Pie | `pie` |
| Heatmap | `heatmap` |
| Grouped bar | `grouped-bar` |
| Stacked bar | `stacked-bar` |
| Gauge | `gauge` |
| Bullet | `bullet` |
| Histogram | `histogram` |
| Funnel | `funnel` |
| Scatter | `scatter` |
| Treemap | `treemap` |

### Copy-Paste

```html
<section class="if-chart-card">
  <header class="if-chart-card__header"><h3>Issuance Types</h3></header>
  <div data-if-chart="bar"
    data-if-chart-label="Issuances"
    data-if-chart-data="Instructions:42|Memos:28|Guides:17|Sources:31"></div>
</section>
```

Chart points are normalized with `data-if-chart-point`, `data-if-chart-index`, `role="button"`, `tabindex="0"`, and `aria-selected`. Click, `Enter`, `Space`, or `InterfaceFramework.selectChartPoint(point)` emits `if:chart-point-select` from the chart root with `{ chart, point, type, chartLabel, index, label, value, rawValue, share, series, selected }` so dashboards can synchronize detail panels, table filters, and telemetry without scraping rendered text.

## Performance And Scale Lab

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Lab root | `[data-if-performance-lab]` | profile, auto profile | Owns scale profile, metrics, and report. |
| Run control | `[data-if-performance-run]` | profile value | Triggers synthetic render. |
| Surface slots | `[data-if-performance-table]`, `[data-if-performance-graph]`, `[data-if-performance-diagram]`, `[data-if-performance-document]`, `[data-if-performance-charts]` | none | Slots for generated large demos. |
| Overflow check | `[data-if-overflow-check]` | `data-if-overflow-mode="scroll"` | Measures uncontained overflow while allowing internal scroll regions. |
| Metrics | `[data-if-performance-metric]` | status state | Mirrors counts, timings, and overflow results. |
| API | `getPerformanceProfile`, `evaluatePerformanceBudgets`, `hydratePerformanceLabs`, `runPerformanceLab`, `measureOverflow` | none | On-demand scale testing, normalized budget checks, and CI smoke hooks. |

### Variant Matrix

| Profile | Use |
| --- | --- |
| `mobile` | Smaller dataset for narrow breakpoints and quick smoke checks. |
| `balanced` | Default design-system run that proves large surfaces without making the page heavy. |
| `large` | Stress profile for release gates, overflow checks, and performance budget review. |

### Copy-Paste

```html
<article class="if-performance-lab"
  data-if-performance-lab
  data-if-performance-profile="balanced">
  <button type="button" data-if-performance-run="large">Large data</button>
  <div data-if-performance-table data-if-overflow-check data-if-overflow-mode="scroll"></div>
  <div data-if-performance-graph data-if-overflow-check></div>
</article>
```

```js
const lab = document.querySelector("[data-if-performance-lab]");
const result = window.InterfaceFramework.runPerformanceLab(lab, "large");
console.log(result.totalMs, result.budget.passed, result.budget.failures);
```

Use `docs/performance-budgets.md` for the frozen profile thresholds and browser release-gate criteria.

## KPI And Dashboard Metrics

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Metric card | `.if-card.if-metric` | semantic/state modifiers | Dashboard metric. |
| Icon | `.if-metric__icon` with icon slot | none | Anchor the metric visually. |
| Label/value/delta | `.if-metric__label`, `.if-metric__value`, `.if-metric__change` | trend sparkline, metadata row | Keep compact. |
| Trendline | `[data-if-sparkline]` | `data-if-sparkline-label`, `data-if-sparkline-output`, `data-if-sparkline-value-output`, `data-if-sparkline-stream` | Updates compact trendline and dispatches metric events when inside `.if-metric`. |
| Metadata | `.if-metric__meta` | source/date scope | Credibility context. |
| Metadata | small row | source/date scope | Credibility context. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Count | New policy changes. |
| Age/time | Expiring or stale sources. |
| Percent | False positive rate. |
| Trend | Delta with sparkline. |
| Risk/status | Gap or blocking count. |

Listen for `if:kpi-metric-update` on a metric card or containing dashboard region. The event detail includes `{ metric, sparkline, label, value, change, trend, values, first, last, delta, deltaText, metadata, state }`, which is enough for host dashboards to persist live metric updates, synchronize a secondary summary, or audit streaming KPI behavior.

### Copy-Paste

```html
<article class="if-card if-metric">
  <div class="if-metric__top">
    <span class="if-metric__icon if-icon-slot" data-if-icon="policy" aria-hidden="true"></span>
    <p class="if-metric__label">New policy changes</p>
  </div>
  <div class="if-metric__main">
    <p class="if-metric__value">27</p>
    <span data-if-sparkline="12,15,14,18,21,20,27"></span>
  </div>
  <span class="if-metric__change if-text-success">+38% vs Apr 1 - Apr 30</span>
  <div class="if-metric__meta"><span>DoD Issuances</span><span>30-day window</span></div>
</article>
```

## Graph View

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Root | `[data-if-graph]` | `data-if-graph-source`, `data-if-graph-json`, layout engine, focus surface | Graph behavior scope; can render from structured graph JSON. |
| Node | `.if-graph-node[data-node-id]` | `data-node-type`, status, position vars | Draggable/selectable. |
| Node type registry | `registerGraphNodeType(type, config)` | `applyGraphNodeTypes(root)`, `getGraphNodeTypeConfig(type)` | Lets production define node classes, icons, colors, labels, data defaults, and render hooks without editing framework CSS/JS. |
| Edge | SVG/data edge plus `[data-if-graph-edge]` labels | edge type, inferred, confidence | Filter/traverse/select. |
| Child-owning node | `.if-graph-node[data-if-graph-cluster][data-node-id]` | `data-if-graph-child-count`, `data-cluster-count`, `data-cluster-label`, `data-cluster-context`, `data-cluster-layout` | Dense related links with expand/collapse owned by an existing graph node, not a separate branch-control node. |
| Cluster branch node | `[data-cluster-member]` | `data-cluster-offset-x`, `data-cluster-offset-y` | Positions expanded child members relative to the owner node for serial law-to-implementation traversal. |
| Expanded world | `.if-graph-canvas[data-graph-world="expanded"]` | `--graph-world-width`, `--graph-world-height`, `data-graph-min-x/y`, `data-graph-max-x/y` | Gives graphs a larger draggable/pannable workspace for expanded neighborhoods. |
| Controls | `[data-if-graph-layout]`, `[data-if-graph-mode]`, `[data-if-graph-zoom]` | none | View organization. |
| API | `renderGraph`, `hydrateGraph`, `getGraphState`, `setGraphLayout`, `setGraphMode`, `setGraphViewport`, `traverseGraph`, `traceGraphFrom`, `registerGraphLayoutEngine`, `registerGraphNodeType`, `applyGraphNodeTypes` | none | Production integration. |

### Variant Matrix

| Variant | Contract | Use |
| --- | --- | --- |
| Layouts | radial, authority, impact | Different graph organization models. |
| Modes | explore, pan, arrange | Interaction mode. |
| Edges | direct, routed | Label and connector style. |
| Direction | directed, undirected | Arrow and relationship semantics. |
| Nodes | compact, comfortable, expanded | Density and detail level. |
| Node types | policy, law, org, opportunity, obligation, evidence, event, gap, custom | Semantic styling and type-owned defaults. |
| Clusters | collapsed, expanded | Hide or reveal dense related nodes and edges. |
| Relationship filters | `data-if-graph-relation` | Toggle edge types. |

### Copy-Paste

```html
<section data-if-graph data-if-graph-layout-engine="built-in">
  <button class="if-graph-node" type="button" data-node-id="seed" data-node-type="policy" style="--x:50%;--y:45%;">
    <span class="if-icon-slot" data-if-icon="policy"></span>
    <strong>DoDI 5200.01</strong>
  </button>
  <button class="if-edge-label" type="button"
    data-if-graph-edge
    data-edge-label-from="seed"
    data-edge-label-to="authority"
    data-edge-type="derived">
    Derived From
  </button>
</section>
```

Structured graph renderers may keep the graph as data:

```html
<section class="if-graph-shell" data-if-graph data-if-graph-source="#graph-json"></section>
<script type="application/json" id="graph-json">
{
  "selected": "policy",
  "nodes": [
    { "id": "policy", "label": "DoDI 5200.01", "kind": "policy", "x": 50, "y": 42, "primary": true },
    { "id": "evidence", "label": "eMASS Evidence", "kind": "evidence", "x": 74, "y": 72 }
  ],
  "edges": [
    { "from": "policy", "to": "evidence", "type": "evidence", "label": "validated by", "confidence": "0.78" }
  ]
}
</script>
```

```js
InterfaceFramework.registerGraphNodeType("claim", {
  className: "evidence",
  icon: "claim",
  color: "#15803d",
  label: "Extracted Claim"
});
InterfaceFramework.applyGraphNodeTypes(document.querySelector("[data-if-graph]"));
```

## Graph Accessibility Fallback

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Fallback | `[data-if-graph-a11y]` | aria-label | Keyboard-readable graph index. |
| Summary | `[data-if-graph-a11y-summary]` | none | Generated state summary. |
| Nodes list | `[data-if-graph-a11y-nodes]` | none | Generated node actions. |
| Edges list | `[data-if-graph-a11y-edges]` | none | Generated edge actions. |
| API | `updateGraphA11yFallback` | none | Refresh after graph changes. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Embedded fallback | Under graph canvas. |
| Detail fallback | In side panel for graph-heavy pages. |
| Screen-reader first | Visible list for non-visual review. |

### Copy-Paste

```html
<section class="if-panel if-graph-a11y" data-if-graph-a11y aria-label="Accessible graph fallback">
  <p data-if-graph-a11y-summary>Graph relationships are available as lists.</p>
  <ol data-if-graph-a11y-nodes></ol>
  <ol data-if-graph-a11y-edges></ol>
</section>
```

## Relationship Maps And Authority Chains

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Map | `.if-relationship-map` | `.if-authority-chain`, connector modifiers | Compact relationship path. |
| Node | component-specific node class | badge/status | Inline entity. |
| Connector | `.if-connector-arrow`, `.if-relationship-map__arrow`, or connector SVG | label, confidence | Direction and relationship type. Avoid raw text arrows. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Linear path | Authority or impact path. |
| Relationship bundle | Multiple edge types around seed. |
| Authority chain graph | Upstream/downstream provenance. |

### Copy-Paste

```html
<div class="if-relationship-map" aria-label="Authority path">
  <span class="if-chip">NDAA FY2025</span>
  <span class="if-relationship-map__arrow" aria-hidden="true"></span>
  <span class="if-chip">DoDI 5200.01</span>
  <span class="if-relationship-map__arrow" aria-hidden="true"></span>
  <span class="if-chip">NAVWAR Plan</span>
</div>
```

## Hierarchy Explorer

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Root | `[data-if-hierarchy]` | density/layout classes | Behavior scope. |
| Row/node | `[data-hierarchy-node]` | `data-hierarchy-parent`, `data-hierarchy-type`, label, role treeitem | Selectable hierarchy item. |
| Panel | `[data-hierarchy-panel]` | hidden | Detail panel for selected node. |
| Branch | `[data-if-hierarchy-toggle]` | `aria-expanded`, `aria-label` | Expand/collapse branch using the rail-aligned plus/minus disclosure control. Hydration infers branches from child rows and upgrades spacer-only rows to toggles. |
| Leaf/dead end | `.if-hierarchy-row__spacer` | `data-hierarchy-state="leaf|dead-end"` | Non-expandable rows keep the connector rhythm without implying an action. |
| Landscape connector | `[data-if-connector-routing]` with `[data-if-connector-node]` and `[data-if-connector-route]` | label, tone, elbow/direct style | Connects horizontal landscape cards with the shared arrow/label routing layer. |
| Type registry | `registerHierarchyNodeType(type, config)` | `applyHierarchyNodeTypes(root)`, `getHierarchyNodeTypeConfig(type)` | Lets production define hierarchy classes, colors, icons, labels, data defaults, and render hooks. |
| API | `selectHierarchyNode`, `toggleHierarchyBranch`, `applyHierarchyStructure`, `registerHierarchyNodeType`, `applyHierarchyNodeTypes` | none | Programmatic behavior. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Deep tree | Org/policy branch traversal. |
| Landscape map | Law-to-evidence horizontal map. |
| Mini hierarchy | Drawer/detail summary. |
| Rollup grid | Descendant metrics. |
| Sibling comparison | Branch comparison at same depth. |
| Node types | statute, executive, instruction, service, component, baseline, implementation, proof, custom | Semantic styling and type-owned defaults. |

### Copy-Paste

```html
<div class="if-hierarchy" data-if-hierarchy>
  <ol class="if-hierarchy-tree" role="tree">
    <li class="if-hierarchy-row" role="treeitem" tabindex="0" data-hierarchy-node="dow" data-hierarchy-type="authority" data-hierarchy-label="Department of War">
      <button class="if-hierarchy-row__toggle" type="button" data-if-hierarchy-toggle aria-expanded="true"></button>
      <span class="if-hierarchy-row__main"><span class="if-hierarchy-row__title">Department of War</span></span>
    </li>
    <li class="if-hierarchy-row" role="treeitem" tabindex="0" data-hierarchy-node="disa" data-hierarchy-parent="dow" data-hierarchy-type="baseline" data-hierarchy-label="DISA guide or STIG">
      <span class="if-hierarchy-row__spacer"></span>
      <span class="if-hierarchy-row__main"><span class="if-hierarchy-row__title">DISA guide or STIG</span></span>
    </li>
  </ol>
  <article class="if-hierarchy-panel" data-hierarchy-panel="dow">...</article>
</div>
```

```js
InterfaceFramework.registerHierarchyNodeType("baseline", {
  className: "baseline",
  color: "#b45309",
  icon: "checklist",
  label: "Technical Baseline"
});
InterfaceFramework.applyHierarchyStructure(document.querySelector("[data-if-hierarchy]"));
InterfaceFramework.applyHierarchyNodeTypes(document.querySelector("[data-if-hierarchy]"));
```

## Claim Tracking And Status Timelines

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Claim tracker | `.if-claim-tracker[data-if-claims]` | `data-if-claims-source`, `data-if-claims-json` | Workbench layout or structured JSON renderer. |
| Claim row | `.if-claim-row` | status modifiers, `data-if-doc-jump` | Select/jump to source line. |
| Status step | `.if-status-step` | complete/active/pending/blocking modifiers | Completion timeline. |
| API | `renderClaimTracker`, `hydrateClaimTrackers`, `getClaimTrackerState`, `selectClaim` | none | Programmatic rendering, hydration, state reads, and selection. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Extracted claim | Candidate statement. |
| Obligation | Actor/action/deadline. |
| Evidence need | Missing proof. |
| Blocker | Gap or failed requirement. |
| Completion step | Timeline progress. |

### Copy-Paste

```html
<div class="if-claim-tracker if-claim-tracker--rich" data-if-claims data-if-claims-source="#claims"></div>
```

## Item History Viewer

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| List | `.if-history-list` | none | Event timeline. |
| Event | `.if-history-event` | semantic modifiers | Version/review/source events. |
| Marker | `.if-history-event__marker` | none | Visual timeline dot. |
| API | `selectHistoryEvent` | none | Programmatic selection. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Success | Approved/completed. |
| Warning | Review or changed condition. |
| Danger | Failed/degraded. |
| Version | Before/after changes. |
| Agent run | Automated event. |

### Copy-Paste

```html
<ol class="if-history-list">
  <li class="if-history-event if-history-event--success">
    <span class="if-history-event__marker"></span>
    <strong>Decision saved</strong>
    <span>Approved 3 findings</span>
  </li>
</ol>
```

## Document Viewer And Reconstituted Text

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Viewer | `[data-if-doc-viewer]` | mode controls | Document behavior scope. |
| Workspace | `[data-if-doc-workspace]` | `data-if-doc-corpus` | Owns artifact source cards and active artifact state; corpus JSON can hydrate generated artifacts. |
| Source | `[data-if-doc-source]` | source card metadata | Selects a matching `[data-if-doc-artifact]`. |
| Artifact | `[data-if-doc-artifact]` | `data-doc-mode` | Holds one document, mode strip, metadata, and one or more viewers. |
| Search | `[data-if-doc-search]` | none | Full text search. |
| Highlights | `[data-if-doc-highlight]` | claim/org/ref/etc. | Toggle mark categories. |
| Filter | `[data-if-doc-filter]` | all/matches/category | Restricts visible lines by category or query hits. |
| Counts | `[data-if-doc-match-count]`, `[data-if-doc-visible-count]`, `[data-if-doc-query-count]`, `[data-if-doc-total-count]`, `[data-if-doc-active-filter]` | none | Mirrors visible line count, query hits, total lines, and active filter. |
| Lines | `[data-if-doc-lines]` | `.if-doc-line` rows | Reconstituted text. |
| Mark | `.if-doc-mark` | `data-doc-mark`, `data-if-doc-annotation-*` metadata | Click/hover annotations and emits normalized annotation schema. |
| Jump | `[data-if-doc-jump]` | search string | Jumps to source line. |
| API | `getDocumentViewer`, `getDocumentViewerState`, `getDocumentWorkspaceState`, `hydrateDocumentViewers`, `hydrateDocumentCorpus`, `hydrateDocumentAnnotations`, `updateDocumentSearch`, `selectDocumentArtifact`, `selectDocumentAnnotation`, `setDocumentArtifactMode` | none | Production integration and editor state inspection. |
| Events | `if:doc-artifact-select`, `if:doc-search`, `if:doc-filter-change`, `if:doc-highlight-change`, `if:doc-search-clear`, `if:doc-jump`, `if:doc-annotation-select`, `if:doc-annotation-panel`, `if:doc-mode-change` | state detail | Lets hosts persist viewer state, route annotation clicks, and sync controls. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Embedded artifact | PDF/object preview. |
| Reconstituted text | Parsed lines with annotations. |
| Semantic highlights | CLM/ORG/REF/IMP/ENB/REL marks. |
| Authority drilldown | Upstream/downstream context. |
| Parser output | Claims, references, orgs, graph preview. |

### Copy-Paste

```html
<main class="if-panel if-doc-main" data-if-doc-viewer>
  <label class="if-search">
    <input class="if-input" type="search" data-if-doc-search placeholder="Search full text">
  </label>
  <label class="if-checkbox"><input type="checkbox" checked data-if-doc-highlight="claim"> Claims</label>
  <article class="if-doc-reconstitution" data-if-doc-lines>
    <p class="if-doc-line" data-doc-line="1" data-doc-cats="claim org" data-doc-text="DoD will document evidence">
      <span class="if-doc-line__number">1</span>
      <span class="if-doc-line__text"><mark class="if-doc-mark if-doc-mark--claim" data-doc-mark="claim">will document</mark> evidence</span>
    </p>
  </article>
</main>
```

## Policy Diff Review

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Diff root | `.if-policy-diff`, `data-if-policy-diff` | `data-if-policy-diff-source`, `data-if-policy-diff-json` | Side-by-side review with optional structured JSON rendering. |
| Change | `[data-if-diff-change]` | `[data-if-diff-status]`, `data-decision` | Selectable row with roving focus and per-change decision state. |
| Detail panel | `[data-if-diff-panel]` | none | Panel id must match a change id. |
| Lines | `.if-policy-diff__line`, `.if-diff-line` | `--added`, `--removed`, `--changed` | Visual state includes text labels, not color alone. |
| Controls | `[data-if-diff-prev]`, `[data-if-diff-next]`, `[data-if-diff-decision]` | `[data-if-diff-count]`, `[data-if-diff-selected-summary]`, `[data-if-diff-decision-summary]` | Navigation, count, and decision summaries. |
| API | `renderPolicyDiff`, `hydratePolicyDiff`, `getPolicyDiff`, `getPolicyDiffState`, `updatePolicyDiff`, `setPolicyDiffDecision` | none | Structured rendering and programmatic behavior. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Side-by-side | Original/proposed comparison. |
| Unified | Single stream. |
| Compact | Denser line height and toolbar treatment. |
| Obligations | Relationship to extracted findings. |
| Bulk review | Decision actions across findings. |

### Copy-Paste

```html
<section class="if-policy-diff" data-if-policy-diff>
  <div class="if-policy-diff__toolbar">
    <button class="if-btn" type="button" data-if-diff-prev>Previous</button>
    <span data-if-diff-count aria-live="polite">1 of 1</span>
    <button class="if-btn" type="button" data-if-diff-next>Next</button>
    <button class="if-btn if-btn--success" type="button" data-if-diff-decision="Approved" aria-pressed="false">Approve</button>
  </div>
  <button class="if-change-item is-selected" type="button" data-if-diff-change="cloud" aria-selected="true">
    <span class="if-badge">2</span>
    <span><span class="if-change-item__title">Cloud residency expansion</span></span>
    <span class="if-badge if-badge--status-open" data-if-diff-status>Open</span>
  </button>
  <section class="if-policy-diff__detail" data-if-diff-panel="cloud">
    <p>Restricted data storage language changes from approved facilities to FedRAMP High environments.</p>
  </section>
</section>
```

Structured renderers may also provide JSON:

```html
<div class="if-policy-diff" data-if-policy-diff data-if-policy-diff-source="#diff-data"></div>
<script type="application/json" id="diff-data">
{ "changes": [{ "id": "cloud", "line": "2", "title": "Cloud residency expansion", "before": "Approved facilities.", "after": "FedRAMP High environments." }] }
</script>
```

## Architecture Diagrams

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Diagram | `[data-if-diagram]` | focus surface, detail selector | Behavior scope. |
| Item | `[data-if-diagram-item]` | diagram metadata attrs | Selectable box/node. |
| Detail | `[data-if-diagram-detail]` | title/body/status slots | Inspector panel. |
| Search | `[data-if-diagram-search]` | status slot, target selector, results selector | Filters/focuses matching nodes, highlights matched text in-place, renders optional result buttons, syncs multiple inputs targeting the same diagram, directly binds previous/next/clear controls during diagram init, and exposes destroy cleanup. |
| Status slot | `[data-if-diagram-stat="visible|layers|matches|selected|hidden-layers"]` | none | Live count/selection fields for orientation in dense diagrams. |
| Search results | `[data-if-diagram-search-results]` or `data-if-diagram-search-results="selector"` | generated result buttons | Displays ranked node matches; result clicks call the same selection contract as direct node clicks. |
| Asset mark | `.if-asset-slot[data-if-asset]` inside an item | sizing, fit, fallback, export policy | Lets diagram nodes use approved SVG/PNG/JPG/etc. assets while retaining framework layout rules. |
| Tinted region | `.if-diagram-region` | tone helpers, region CSS vars | Lets a lane own a continuous tinted background with inherited child bands. |
| Layer toggle | `[data-if-diagram-layer-toggle]` | layer names | Show/hide layers. |
| Variable control | `[data-if-diagram-var]` | unit/output | Spacing and sizing sliders. |
| Typed node | `[data-diagram-node-type]` | layout, background, icon | Applies registry-owned node color, icon, layout, and background defaults. |
| Node selection | `[data-if-diagram-item]` or registered diagram item selector | `aria-selected`, `aria-pressed`, `is-focused` | Selects a node, opens the detail panel, syncs editor fields, and emits `if:diagram-select`. |
| Style controls | `[data-if-diagram-node-type]`, `[data-if-diagram-node-layout]`, `[data-if-diagram-node-background]`, `[data-if-diagram-node-icon]`, `[data-if-diagram-style-tone]` | inside editor panel | Lets edit mode change semantic type, visual layout, background, icon, and tone. |
| Route controls | `[data-if-diagram-route-label]`, `[data-if-diagram-route-style]`, `[data-if-diagram-route-tone]`, `[data-if-diagram-route-from-anchor]`, `[data-if-diagram-route-to-anchor]`, `[data-if-diagram-route-avoid]`, `[data-if-diagram-route-waypoint-x]`, `[data-if-diagram-route-waypoint-y]`, `[data-if-diagram-route-clear-waypoint]`, `[data-if-diagram-route-delete]` | connect tool or selected route | Sets default label/style/tone for new connectors, then edits selected routes with anchors, node avoidance, manual bend waypoints, and route deletion. |
| Connector selection | `[data-if-connector-label-node]` | generated by framework | Selects a connector route, opens the detail panel, syncs route controls, emits `if:diagram-route-select`, and supports delete-mode route removal. |
| Layout editing | `[data-if-diagram-edit-toggle]`, `[data-if-diagram-edit-field]`, `[data-if-diagram-nudge]`, `[data-if-diagram-add-from-source]`, `[data-if-diagram-duplicate-node]`, `[data-if-diagram-reorder]`, `[data-if-diagram-clear-selection]`, `[data-if-diagram-copy-selected]`, `[data-if-diagram-apply-selected]`, `[data-if-diagram-reset-selected]`, `[data-if-diagram-delete-selected]`, `[data-if-diagram-undo-delete]` | tool buttons, readouts, autosave | Turns on tool-based text, move, connect, style, add, add-from-source, duplicate, reorder, clear-selection, copy-selected, apply-selected, reset-selected, and delete behavior; text updates visible node labels inline or through the panel, add creates editable draft nodes, add-from-source creates a node from source JSON in the selected container, duplicate copies the selected node into its parent container, reorder moves it earlier or later inside that container, clear-selection closes the detail/editor selection state, copy-selected places the active node or route JSON on the clipboard, apply-selected patches the active node or route from the source editor, reset-selected restores the active baseline node or route, delete-selected removes the active route or hides the selected node, move supports drag, keyboard, or button nudging, and undo restores the most recent node/route deletion. |
| Layout persistence | `[data-if-diagram-layout-save]`, `[data-if-diagram-layout-load]`, `[data-if-diagram-layout-reset]` | `data-if-diagram-layout-key`, `data-if-diagram-layout-adapter`, `data-if-diagram-layout-status` | Saves layout snapshots to session storage or a registered production adapter. |
| Source editor | `[data-if-diagram-source]`, `[data-if-diagram-source-refresh]`, `[data-if-diagram-source-validate]`, `[data-if-diagram-source-format]`, `[data-if-diagram-source-apply]`, `[data-if-diagram-source-copy]`, `[data-if-diagram-source-download]`, `[data-if-diagram-source-import]` | optional source target/download filename | Round-trips `DiagramDocument` JSON, accepts fenced Markdown JSON, validates without applying, formats source, applies in place, copies source text, downloads JSON, or imports source from a file input. |
| Export | `data-if-export-target` or export API | png/pdf helpers | Export surfaces. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Architecture board | Azure-like deployment overview. |
| Authority flow | Law to implementation path. |
| Runtime topology | Agent/service graph. |
| Swimlane | Operational pipeline. |
| Boundary board | Trust/security boundaries. |
| Matrix | Dependency intensity. |

### Copy-Paste

```html
<section class="if-architecture-diagram" data-if-diagram data-if-diagram-layout-key="platform-architecture">
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
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-layout-save>Save session</button>
    <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diagram-layout-reset>Reset</button>
    <span class="if-diagram-layout-status" data-if-diagram-layout-status>Session layout ready</span>
  </div>
  <section class="if-diagram-status-bar" aria-live="polite">
    <span><strong data-if-diagram-stat="visible">0</strong> visible nodes</span>
    <span><strong data-if-diagram-stat="layers">0/0</strong> layers active</span>
    <span><strong data-if-diagram-stat="matches">0</strong> matches</span>
    <span><strong data-if-diagram-stat="selected">No selection</strong></span>
  </section>
  <button class="if-diagram-node" type="button"
    data-if-diagram-item
    data-diagram-node-type="service"
    data-diagram-node-layout="media"
    data-diagram-node-background="surface"
    data-diagram-title="Azure Container Apps"
    data-diagram-status="Active"
    data-diagram-owner="Platform">
    <span class="if-icon-slot" data-if-icon="server"></span>
    <span><strong>Azure Container Apps</strong><em>Policy agents</em></span>
  </button>
  <button class="if-diagram-node" type="button" data-if-diagram-item data-diagram-title="Approved Logo Asset">
    <span class="if-asset-slot if-asset-slot--brand"
      data-if-asset="./assets/approved-logo.svg"
      data-if-asset-alt="Approved logo"
      data-if-asset-fit="contain"
      data-if-asset-fallback-icon="artifact"></span>
    <span><strong>Approved Logo Asset</strong><em>SVG/PNG/JPG slot</em></span>
  </button>
  <section class="if-diagram-region if-diagram-region--purple">
    <header>Workflow lane</header>
    <div class="if-diagram-region__band">
      <button class="if-diagram-node" type="button" data-if-diagram-item>Research workflow</button>
    </div>
  </section>
  <aside class="if-diagram-detail-panel" data-if-diagram-detail hidden aria-live="polite">
    <h2 data-if-diagram-detail-title>Selected node</h2>
    <p data-if-diagram-detail-body>Select a box.</p>
    <section class="if-diagram-detail-panel__editor" data-if-diagram-editor>
      <span>Layout Editor</span>
      <dl class="if-diagram-edit-readouts">
        <div><dt>Node id</dt><dd data-if-diagram-edit-readout="id">No selection</dd></div>
        <div><dt>X</dt><dd data-if-diagram-edit-readout="x">-</dd></div>
        <div><dt>Y</dt><dd data-if-diagram-edit-readout="y">-</dd></div>
      </dl>
      <label class="if-field"><span class="if-field__label">Node type</span><select class="if-select" data-if-diagram-node-type disabled><option value="service">Service</option><option value="agent">Agent</option><option value="storage">Storage</option><option value="custom">Custom</option></select></label>
      <label class="if-field"><span class="if-field__label">Layout</span><select class="if-select" data-if-diagram-node-layout disabled><option value="tile">Tile</option><option value="compact">Compact</option><option value="media">Media</option><option value="callout">Callout</option></select></label>
      <label class="if-field"><span class="if-field__label">Background</span><select class="if-select" data-if-diagram-node-background disabled><option value="surface">Surface</option><option value="tint">Tint</option><option value="outline">Outline</option></select></label>
      <label class="if-field"><span class="if-field__label">Title</span><input class="if-input" data-if-diagram-edit-field="title" disabled></label>
      <label class="if-field"><span class="if-field__label">Status</span><input class="if-input" data-if-diagram-edit-field="status" disabled></label>
      <label class="if-field if-diagram-editor__span"><span class="if-field__label">Contract</span><textarea class="if-input" data-if-diagram-edit-field="contract" disabled></textarea></label>
    </section>
  </aside>
</section>
```

Search behavior: matches are computed against visible node text and diagram metadata (`data-diagram-title`, description, status, owner, dependencies, and contract). Matching nodes receive `.is-search-match`, nonmatching nodes receive `.is-search-dimmed`, the first match receives `.is-search-current`, and visible matched text is wrapped in `.if-diagram-search-mark`. Press `Escape` in the search input to clear the query.

Keyboard behavior: diagram items are initialized as focusable button-like controls. `Enter`/`Space` selects the focused item, arrow keys move to the next or previous visible item, `Home`/`End` jump to the first or last visible item, and `Escape` clears the current detail focus.

Layout editing behavior: `setDiagramEditMode(diagram, true)` enables node dragging and selected-node field editing. The built-in fallback persists `collectDiagramLayoutSnapshot(diagram)` into `sessionStorage` under `data-if-diagram-layout-key`; production apps can replace this with a post-back, database, cache, or graph-layout service via `registerDiagramLayoutAdapter(name, { load, save, reset })`.

Typed node behavior: call `registerDiagramNodeType("model-serving", { label: "Model Serving", className: "model-serving", color: "#6d28d9", icon: "bot", layout: "metric", background: "tint" })` to teach the framework a new domain type. Use `applyDiagramNodeTypes(root)` after injecting server-rendered nodes, or `applyDiagramNodeType(item, "model-serving")` for a single node.

```js
InterfaceFramework.registerDiagramLayoutAdapter("diagram-api", {
  async load({ key }) {
    const response = await fetch(`/api/diagram-layouts/${key}`);
    return response.ok ? response.json() : null;
  },
  async save({ key, snapshot, signal }) {
    await fetch(`/api/diagram-layouts/${key}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(snapshot),
      signal
    });
    return snapshot;
  },
  async reset({ key }) {
    await fetch(`/api/diagram-layouts/${key}`, { method: "DELETE" });
  }
});
```

## Governance And Operations Patterns

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Pattern grid | `.if-pattern-grid` | none | Cards for ops/governance. |
| Pattern card | `.if-pattern-card` | semantic modifiers | Provenance, rules, runs. |
| Agent state | `.if-agent-state-card` | healthy/warning/danger | Runtime state. |
| Contract card | `.if-contract-card` | artifact rows | API/export schemas. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Provenance ledger | Extraction/validation/review chain. |
| Alert rule | Watchlist/digest/escalation settings. |
| Degraded state | Access, parser, stale source. |
| Agent run | Runtime, model, eval, progress. |
| Export/API contract | Schema and manifest state. |
| Role-gated action | Permission-sensitive action. |

### Copy-Paste

```html
<section class="if-pattern-grid">
  <article class="if-pattern-card if-agent-run-card">
    <header><h3>Agent Run Evaluation</h3><span class="if-badge if-badge--status-healthy">Healthy</span></header>
    <p>Run health, model/prompt versions, output contract, and eval score.</p>
  </article>
</section>
```

## Public Website Patterns

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Site shell | `.if-site-shell` | public nav/footer | Public website root. |
| Hero | `.if-site-hero` | media, stats, actions | First viewport. |
| Services | `.if-service-card` | icon/action | Consulting service rows/cards. |
| Profile | `.if-profile-media` | stats/actions | Bio/resume/profile module. |
| Publication | `.if-publication-card` | featured/split/compact | Blog, papers, insights. |
| Search | `.if-public-search`, `data-if-public-search` | `data-if-public-search-target`, filters/results | Public-site search and writing-index filtering. |
| Contact | `.if-contact-grid` | form/details | Contact surface. |

### Public Search Behavior

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Root | `.if-public-search` or `[data-if-public-search]` | `data-if-public-search-target="#results"` | Owns query, filters, count, and empty state. |
| Query | `[data-if-public-search-query]` | placeholder text | Filters matching result text as the user types. |
| Filter | `[data-if-public-search-filter="all"]` | any category key | Single-select category buttons sync `aria-pressed`. |
| Result | `[data-if-public-search-result]` | `data-if-public-search-category`, `data-if-public-search-text` | Hidden when it does not match query/filter. |
| Count | `[data-if-public-search-count]` | none | Receives `visible of total`. |
| Empty | `[data-if-public-search-empty]` | none | Revealed when no results match. |
| API | `hydratePublicSearches`, `updatePublicSearch`, `setPublicSearchFilter`, `clearPublicSearch` | none | Programmatic behavior for injected public-site indexes. |
| Event | `if:public-search` | `{ query, filter, visible, total }` | Emitted after user or API filtering. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Homepage hero | Brand/offer first viewport. |
| Service overview | Consulting capabilities. |
| Resume timeline | Experience snapshot. |
| Blog index/post | Publication cards. |
| Reference loop | Architecture/explainer loop. |
| Engagement package | Productized consulting offer. |

### Copy-Paste

```html
<main class="if-site-shell">
  <section class="if-site-hero">
    <div class="if-site-hero__copy">
      <h1>Strategic Counsel. Policy Intelligence. Real-World Impact.</h1>
      <p>Trusted advisory for federal leaders and mission-driven organizations.</p>
      <a class="if-btn if-btn--primary" href="#contact">Work With Us</a>
    </div>
  </section>
</main>
```

## Configuration And Demo Controls

### API

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Generated demo | `[data-if-config-demo]` | `data-if-config-demo-source`, `data-if-config-demo-json` | Renders controls and preview from JSON. |
| Variable control | `[data-if-control-var]` | target, unit, output | Binds range/input to CSS var. |
| Demo state | `[data-if-demo-state]` | target, prefix | Applies state class to preview. |
| Component inventory | `[data-if-component-inventory]`, `[data-if-inventory-id]` | `data-if-component-manifest`, `data-if-component-inventory-deficiency-source`, filter/category/status controls, count/status/gate/risk/deficiency/report/action/evidence/snapshot/detail slots | Filters manifest-aligned component cards, enriches detail panels from the manifest, exposes readiness counts, release gates, risk registers, deficiency assessment, package backlog assessment, category rollups, prioritized action queues, evidence-lens coverage, machine-readable snapshots, and selected-family details. |
| API | `renderConfigurationDemo`, `hydrateConfigurationControls`, `getConfigurationState`, `hydrateComponentInventories`, `getComponentInventoryState`, `getComponentInventoryViewState`, `applyComponentInventoryViewState`, `applyComponentInventoryPreset`, `clearComponentInventoryFilter`, `getComponentInventoryReadinessReport`, `getComponentInventoryReadinessScorecard`, `getComponentInventoryReadinessActions`, `getComponentInventoryDeficiencyBacklog`, `getComponentInventoryDeficiencyAssessment`, `getComponentInventoryEvidenceMatrix`, `getComponentInventoryCapabilityCoverage`, `getComponentInventoryReadinessSnapshot`, `getComponentInventoryReleaseGate`, `getComponentInventoryRiskRegister`, `setComponentInventoryCapabilityFilter`, `setComponentInventoryCategoryFilter`, `applyComponentInventoryFilters`, `selectComponentInventoryCard`, `moveComponentInventorySelection`, `setControlVariable`, `setDemoState` | none | Programmatic behavior. |

### Variant Matrix

| Variant | Use |
| --- | --- |
| Density slider | Adjust padding/gap. |
| Radius slider | Adjust card/control radius. |
| Accent slider | Adjust emphasis rail. |
| Progress slider | Live meter/dataset. |
| State buttons | Operational/review/blocked/etc. |
| Inventory filters | Search, category, and readiness status across component cards. |

Component inventories use these optional controls and slots:

- `[data-if-component-inventory-filter="#inventory"]` for free-text search.
- `[data-if-component-inventory-category="#inventory"]` for category filtering.
- `[data-if-component-inventory-category-set="#inventory"][data-if-component-inventory-category-value="Category"]` for buttons that drill from category reports into the existing category filter.
- `[data-if-component-inventory-capability="#inventory"]` for capability-gap filtering; values such as `scriptability`, `events`, `attributes`, `classes`, `docs`, `examples`, `accessibility`, `recipes`, and `motion` show components missing that capability.
- `[data-if-component-inventory-capability-set="#inventory"][data-if-component-inventory-capability-value="motion"]` for buttons that drill from capability coverage rows into the same capability-gap filter.
- `[data-if-component-inventory-active-filters]` for generated active-filter chips, plus `[data-if-component-inventory-clear-filter="#inventory"][data-if-component-inventory-filter-key="query|category|capability|status|risk"]` for per-filter clearing.
- `[data-if-component-inventory-status="#inventory"]` for readiness filtering.
- `[data-if-component-inventory-risk="#inventory"]` for P0/P1/P2/clear risk filtering.
- `[data-if-component-inventory-sort="#inventory"]` for stable card ordering by manifest order, risk, action count, evidence gaps, evidence coverage, readiness, category, or title.
- `[data-if-component-inventory-preset="#inventory"][data-if-component-inventory-preset-value="most-deficient|release-blockers|readiness-actions|evidence-gaps|motion-gaps|hardening|clean|all"]` for one-click scripted views that set filters and sorting together.
- `[data-if-component-inventory-count]`, `[data-if-component-inventory-total]`, `[data-if-component-inventory-ready]`, `[data-if-component-inventory-hardening]`, and `[data-if-component-inventory-status]` for live summaries.
- `[data-if-component-inventory-motion]` is set transiently during scripted filter updates so cards can animate filter feedback while respecting `prefers-reduced-motion`.
- `[data-if-component-inventory-evidence-average]` and `[data-if-component-inventory-low-evidence]` for manifest evidence rollups.
- `[data-if-component-inventory-card-readiness]` is generated inside each inventory card to show its evidence score, action count, and first gap/action signal.
- `[data-if-component-inventory-scorecard]` for a generated readiness score, production coverage, evidence coverage, risk debt, and active visible context.
- `[data-if-component-inventory-release-gate]` for a release-readiness verdict with blockers and recommended next moves.
- `[data-if-component-inventory-risk-register]` for grouped P0/P1/P2 readiness risks derived from the action queue.
- `[data-if-component-inventory-deficiency-source="#json-script"]` or inline JSON on `[data-if-component-inventory]` for package-level backlog items that should appear alongside component-family debt. The payload accepts `{ status, updated, openItems, closedItems }`, where each item can include `id`, `priority`, `title`, `category`, `status`, `action`, `evidence`, and `closed`.
- `[data-if-component-inventory-deficiency-assessment]` for a generated "what is weakest now" assessment that ranks visible component debt, weak capability lenses, package-level backlog items, closed readiness gates, and recommended focus; generated component rows expose the same select and capability-drilldown controls as the risk and capability panels.
- `[data-if-component-inventory-report]` for a generated category readiness report with visible/total counts, evidence averages, API/event counts, docs, examples, and gap counts.
- `[data-if-component-inventory-actions]` for a prioritized queue of hardening and missing-evidence actions generated from card status plus manifest evidence checks.
- `[data-if-component-inventory-select="#inventory"][data-if-component-inventory-select-id="component-id"]` for buttons or links that select a component card from generated risk/action panels.
- `[data-if-component-inventory-evidence-matrix]` for evidence-lens coverage across use guidance, classes, data attributes, docs, examples, accessibility notes, APIs, and events.
- `[data-if-component-inventory-capability-coverage]` for capability coverage across scriptability, events, data attributes, classes, docs, examples, accessibility notes, recipes, and motion/state hooks; rows with visible gaps render a drilldown button.
- `[data-if-component-inventory-view-state]` for a compact JSON handoff containing only filters, preset, selected id, visible ids, and totals.
- `[data-if-component-inventory-snapshot]` for a generated JSON readiness snapshot containing filters, sort, totals, release gate, risk register, deficiency assessment, categories, evidence lenses, capability coverage, actions, and component contract counts.
- `[data-if-component-inventory-empty]` for the no-match state.
- `[data-if-component-inventory-detail]` plus selected slots: `data-if-component-inventory-selected-title`, `selected-id`, `selected-category`, `selected-status`, `selected-summary`, `selected-tags`, and `selected-link`.
- `data-if-component-manifest="../docs/component-manifest.json"` to enrich selected details with manifest fields.
- Manifest-backed slots: `data-if-component-inventory-selected-classes`, `selected-attributes`, `selected-apis`, `selected-events`, `selected-docs`, `selected-examples`, `selected-a11y`, `selected-use`, `selected-avoid`, and `selected-recipes`.
- Evidence/action slots: `data-if-component-inventory-selected-score`, `selected-scorebar`, `selected-evidence`, `selected-missing`, and `selected-actions` for a generated checklist scoped to the selected component.

Listen for `if:component-inventory-filter` with `{ inventory, state }`. The same state is available from `getComponentInventoryState(inventory)` and includes query, category, capability, status, risk, sort, preset, total, visible, hidden, ready, hardening, categories, statuses, and card metadata. Use `applyComponentInventoryPreset(control)` for one-click scripted views, `clearComponentInventoryFilter(control)` to clear one active filter, `setComponentInventoryCategoryFilter(control)` to apply a category drilldown control, and `setComponentInventoryCapabilityFilter(control)` to apply a capability-gap drilldown control through the same filter path. Use `getComponentInventoryViewState(inventory)` for compact view persistence and `applyComponentInventoryViewState(inventory, viewState)` to replay it. Use `getComponentInventoryReadinessReport(inventory)` when a host needs the structured rollup shape: `{ overall, categories, actions, evidenceMatrix, capabilityCoverage }`; use `getComponentInventoryReadinessScorecard(inventory)` when a host needs a compact decision summary; use `getComponentInventoryReadinessActions(inventory)` when the host only needs the prioritized action queue; use `getComponentInventoryDeficiencyAssessment(inventory)` when the host needs ranked weakest components, weak capability lenses, and recommended focus; use `getComponentInventoryEvidenceMatrix(inventory)` when the host only needs evidence-lens coverage; use `getComponentInventoryCapabilityCoverage(inventory)` when the host needs a scriptability, event, docs, example, accessibility, recipe, class, attribute, and motion/state coverage rollup; use `getComponentInventoryReadinessSnapshot(inventory)` for the serializable handoff object, including release gate, risk register, and deficiency assessment blocks; use `getComponentInventoryReleaseGate(inventory)` for the ship/no-ship verdict; use `getComponentInventoryRiskRegister(inventory)` for grouped risk triage.

Listen for `if:component-inventory-deficiency` when a host needs the same readiness assessment as the visible deficiency panel whenever filters, presets, manifest hydration, or backlog state change. The event detail includes `{ inventory, assessment, totals, focus, topDeficiencies, weakCapabilities, backlog }`, which is the preferred telemetry contract for release dashboards and agent handoff checks.

Manifest entries may include a `stateAndMotion` contract for component families whose motion is produced by shared state rather than a single dedicated animation API. The field lists supported states, hook attributes or functions, transition surfaces, reduced-motion expectations, and the agent instruction for deciding whether the component is motion-ready. Treat that field as the source of truth for the inventory `motion` capability lens before adding new component-specific animation code.

Listen for `if:component-inventory-select` with `{ inventory, card, component, state }`. Cards are hydrated as focusable options with a roving tab stop; clicking the card body, pressing `Enter` / `Space`, pressing arrow keys, `Home`, or `End`, calling `moveComponentInventorySelection(cardOrInventory, direction)`, or activating a `[data-if-component-inventory-select]` control selects it without interfering with its specimen link. Keyboard and scripted movement skips hidden cards and keeps the detail panel in sync. User-triggered selections briefly add `.is-selection-pulse` to the selected card for visible feedback.

Manifest enrichment emits `if:component-inventory-manifest` with `{ inventory, manifest, count }`; failed loads emit `if:component-inventory-manifest-error` while the card-only inventory remains usable.

### Copy-Paste

```html
<label class="if-config-control">
  <span class="if-config-control__label">Density <output id="density">0.7rem</output></span>
  <input class="if-range" type="range" min="0.45" max="1.25" value="0.7" step="0.05"
    data-if-control-var="--showcase-density"
    data-if-control-unit="rem"
    data-if-control-target="#preview"
    data-if-control-output="#density">
</label>
<button class="if-btn" type="button"
  data-if-demo-target="#preview"
  data-if-demo-state-prefix="if-showcase-state--"
  data-if-demo-state="blocked">Blocked</button>
```

Structured demos can be mounted with:

```html
<div data-if-config-demo data-if-config-demo-source="#config-demo"></div>
```

## Upload And Dropzone

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Root | `[data-if-dropzone]` | status/list slots | Drag/drop and click scope. |
| Input | `[data-if-dropzone-input]` | `multiple`, accept | Keep native file input for accessibility. |
| File list | `[data-if-dropzone-list]` | `.if-file-chip` | Shows staged artifacts. |

Variant matrix: compact artifact upload, parser package upload, evidence packet staging, source candidate import.

```html
<section class="if-coverage-card" data-if-dropzone>
  <label class="if-dropzone" tabindex="0">
    <input class="if-sr-only" type="file" multiple data-if-dropzone-input>
    <span class="if-dropzone__icon if-icon-slot" data-if-icon="upload"></span>
    <span><strong>Drop artifacts here</strong><em>PDF, DOCX, CSV, or JSON.</em></span>
  </label>
  <div class="if-dropzone__list" data-if-dropzone-list></div>
</section>
```

## Command Palette

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Palette | `[data-if-command-palette]` | `data-if-command-source`, `data-if-command-json`, floating/embedded mode | Searchable command surface; can render from a structured command document. |
| Toggle | `[data-if-command-palette-toggle]` | `aria-controls` | Opens the target palette. |
| Input | `[data-if-command-input]` | local/remote host data | Filters visible commands. |
| Item | `[data-if-command-item]` | `data-if-command-id`, `data-if-command-label`, `data-if-command-route`, `data-if-command-shortcut`, `data-if-command-group` | Emits selected command. |
| Group | `[data-if-command-group]` | generated from `groups[]` | Hidden automatically when filtering leaves no visible commands in the group. |
| Count | `[data-if-command-count="visible|total"]` | generated by `renderCommandPalette` | Mirrors filtered and total command counts. |
| Empty | `[data-if-command-empty]` | generated by `renderCommandPalette` | Revealed when filtering has no matches. |
| API | `renderCommandPalette`, `hydrateCommandPalettes`, `getCommandPalette`, `getCommandPaletteState`, `openCommandPalette`, `closeCommandPalette`, `filterCommandPalette`, `runCommandPaletteItem` | none | Lets host editors render, inspect, open, close, filter, and execute without rebuilding DOM manually. |
| Events | `if:command-palette-open`, `if:command-palette-filter`, `if:command-palette-action` | state detail | Exposes query, active command, visible counts, id, and route. |

Variant matrix: global Ctrl+K, embedded action finder, reviewer command dialog, route launcher.

## Editable Grid

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Grid root | `[data-if-editable-grid]` | toolbar/status | Owns change events. |
| Editable cell | `[data-if-editable-cell]` | input or contenteditable | Marks dirty and recomputes summaries. |
| Add row | `[data-if-editable-grid-add]` | target id | Demo row insertion. |

Use editable grids for small policy-intelligence worksets. Move to a host spreadsheet/grid library if formulas, clipboard ranges, or thousands of editable rows are required.

## Date And Calendar Picker

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Picker root | `[data-if-date-picker]` | summary slot | Date-picker behavior scope. |
| Date button | `[data-if-date-select]` | ISO date value | Selects one date. |
| Output | `[data-if-date-output]` | readonly input | Mirrors selected date. |
| Month controls | `[data-if-date-nav="prev|next|today"]` | month label slot | Navigates calendar months and today. |
| Generated grid | `[data-if-date-grid]` | dynamic month rendering | Hydrates a 7-column keyboard-ready calendar grid. |
| Native fallback | `[data-if-date-native]` | `type="date"` | Keeps mobile/native date entry available. |
| API | `selectDatePickerDate`, `setDatePickerValue` | none | Selects a date from a button or programmatic ISO value. |
| Events | `if:date-picker-change`, `if:date-picker-month` | none | Separates selected-date changes from visible-month navigation. |

Keyboard contract: date buttons support `ArrowRight`, `ArrowLeft`, `ArrowDown`, `ArrowUp`, `Home`, `End`, `PageUp`, and `PageDown`. Month navigation keeps a roving tab stop in the visible calendar even when the selected date is outside the displayed month.

## Wizard And Stepper

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Wizard root | `[data-if-wizard]` | `data-if-wizard-source`, `data-if-wizard-json` | Owns selected step and can render from structured JSON. |
| Step | `[data-if-wizard-step]` | `data-if-wizard-step-id`, `aria-disabled` | Sets step by index or id. |
| Panel | `[data-if-wizard-panel]` | hidden state | Shows active panel only. |
| Controls | `[data-if-wizard-next]`, `[data-if-wizard-prev]` | validation hooks | Linear movement with disabled first/last states. |
| Status/progress | `[data-if-wizard-status]` | `[data-if-wizard-progress]` | Mirrors current label, count, and completion percentage. |
| API | `renderWizard`, `hydrateWizard`, `getWizard`, `getWizardState`, `setWizardStep` | none | Structured rendering, state reads, and programmatic step selection. |
| Events | `if:wizard-step` | none | Emits `{ wizard, step, total, state }`. |

Stepper visual contracts:

| Variant | Class | State model | Notes |
| --- | --- | --- | --- |
| Interactive | `.if-stepper--interactive` | `.is-active`, `.is-complete` | Baseline wizard step navigation. |
| Semantic | `.if-stepper--semantic` | complete, active, future, blocked, optional | Complete steps render green, active steps blue, future steps red by default. |
| Boxed semantic | `.if-stepper--boxed` | same as semantic | Carded step nodes for command-heavy or high-consequence flows. This is the default semantic presentation. |
| Unboxed semantic | `.if-stepper--unboxed` | same as semantic | Rail-and-dot presentation for lighter summaries when node boxes add too much visual weight. |
| Compact | `.if-stepper--compact` | same as semantic | Dense review strips, command bars, drawer summaries. |
| Vertical | `.if-stepper--vertical` | same as semantic | Route checklists and long workflow paths. |
| Review wrapper | `.if-stepper--review` | host container | Framed variant for workflow summaries and side panels. |

Semantic states use `.is-complete`, `.is-active`, `.is-blocked`, and `.is-optional`; a semantic step with no explicit state is treated as an upcoming/future step. Keep text labels and metadata visible so status is not communicated by color alone.

Configuration demos can swap stepper variants with the generic demo-state contract instead of custom code: set `data-if-demo-target="#stepper-id"`, `data-if-demo-state-prefix="if-stepper--"`, and `data-if-demo-state="boxed"` or `data-if-demo-state="unboxed"`. The behavior updates `aria-pressed`, toggles `is-active`, and emits `if:demo-state`.

Keyboard contract: focused wizard steps support `ArrowRight`, `ArrowDown`, `ArrowLeft`, `ArrowUp`, `Home`, `End`, `Enter`, and `Space`. The active step keeps the roving tab stop, first/last next/previous controls are disabled, and blocked steps use `aria-disabled`.

Structured renderers can keep a wizard as JSON:

```html
<div data-if-wizard data-if-wizard-source="#activation-wizard"></div>
<script type="application/json" id="activation-wizard">
{
  "label": "Rule activation",
  "variant": "boxed",
  "steps": [
    { "id": "objects", "label": "Objects", "panelBody": "Select watched scopes." },
    { "id": "conditions", "label": "Conditions", "panelBody": "Set thresholds." }
  ]
}
</script>
```

## Annotation Toolbar

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Toolbar | `[data-if-annotation-toolbar]` | `data-if-annotation-current`, role toolbar | Owns active tool and roving focus. |
| Tool | `[data-if-annotation-tool]` | `data-if-annotation-label`, `data-if-annotation-short`, `data-if-annotation-description` | CLM/REF/ORG/EVD/IMP/ENB modes with synchronized `aria-pressed`. |
| Preview | `[data-if-annotation-preview]` | `data-if-annotation-label`, `data-if-annotation-current` | Shows semantic styling and short label. |
| Status slots | none | `[data-if-annotation-current]`, `[data-if-annotation-description]`, `[data-if-annotation-count]` | Mirrors active mode for inspectors and live regions. |
| Events | none | `if:annotation-tool-change` | Emits `{ toolbar, control, tool, label, state }`. |

Public APIs: `hydrateAnnotationToolbars(root)`, `getAnnotationToolbar(target)`, `getAnnotationToolbarState(target)`, and `setAnnotationTool(control)`. Keyboard users can move through tools with arrow keys, `Home`, and `End`, then activate with `Enter` or `Space`.

## Empty Loading Success Cancelled And Error States

| Contract | Required | Optional | Notes |
| --- | --- | --- | --- |
| Empty | `.if-empty` | action button | No results or no data. |
| Loading | `.if-loading`, `.if-skeleton` | progress text | Non-blocking loading. |
| Success | `.if-empty` with success icon/copy | status text | Completed adapter or workflow. |
| Cancelled | `.if-empty` with paused/cancelled copy | retry action | Aborted adapter request. |
| Error | `.if-error-state` | retry action | Recoverable failure. |
| Demo state | `[data-if-state-preview]` | variant controls | Switches visible state panel. |
| Adapter state | `[data-if-adapter-state]` | `[data-if-adapter-status]` | Shows panels from the shared adapter lifecycle. |

Reusable adapter task runner:

```js
const task = await InterfaceFramework.runAdapterTask(
  document.querySelector("#source-registry-panel"),
  async ({ signal, query }) => {
    const response = await fetch(`/api/sources?q=${encodeURIComponent(query)}`, { signal });
    const rows = await response.json();
    return rows.length ? { state: "success", rows } : { state: "empty", rows: [], message: "No sources matched." };
  },
  { route: "sources", query: "DoDI" },
  { channel: "source-registry", loadingMessage: "Loading sources..." }
);

console.log(task.state, task.elapsedMs);
InterfaceFramework.cancelAdapterTask(document.querySelector("#source-registry-panel"), "source-registry", "user");
```

`runAdapterTask(target, adapter, context, options)` creates an `AbortController`, cancels a previous task in the same channel, sets `loading`, normalizes arrays and object payloads to `success` or `empty`, converts aborts to `cancelled`, converts thrown errors to `error`, and emits `if:adapter-request/result/cancel/error` plus `if:{channel}-request/result/cancel/error`. Use `getAdapterTaskState(target, channel)` when a host status rail needs to inspect pending request metadata.

## Stable JavaScript API Matrix

| Area | Public functions |
| --- | --- |
| Lifecycle | `init`, `destroy`, `initBehavior`, `destroyBehavior`, `registerBehaviorModule`, `unregisterBehaviorModule`, `getBehaviorModules` |
| Themes | `setTheme`, `getTheme`, `hydrateThemeControls` |
| Icons and assets | `hydrateIcons`, `hydrateAssets` |
| Menus/popovers | `openMenu`, `closeMenu`, `toggleMenu`, `closeMenus`, `togglePopover`, `closePopovers`, `showToast` |
| Modals/drawers | `openModal`, `closeModal`, `openDrawer`, `closeDrawer` |
| Forms/tooltips | `validateField`, `validateForm`, `setFieldState`, `showTooltip`, `hideTooltip`, `computeTooltipPosition` |
| Adapter lifecycle | `normalizeAdapterState`, `setAdapterState`, `getAdapterState`, `runAdapterTask`, `cancelAdapterTask`, `getAdapterTaskState`, `retryAdapterRequest` |
| Coverage controls | `renderDropzoneFiles`, `openCommandPalette`, `closeCommandPalette`, `filterCommandPalette`, `selectDatePickerDate`, `setDatePickerValue`, `setWizardStep`, `hydrateAnnotationToolbars`, `getAnnotationToolbar`, `getAnnotationToolbarState`, `setAnnotationTool`, `setStateVariant` |
| Inventory and configuration | `renderConfigurationDemo`, `hydrateConfigurationControls`, `hydrateComponentInventories`, `getConfigurationState`, `getComponentInventoryState`, `getComponentInventoryViewState`, `applyComponentInventoryViewState`, `applyComponentInventoryPreset`, `clearComponentInventoryFilter`, `getComponentInventoryReadinessScorecard`, `getComponentInventoryCapabilityCoverage`, `setComponentInventoryCapabilityFilter`, `setComponentInventoryCategoryFilter`, `applyComponentInventoryFilters`, `selectComponentInventoryCard`, `moveComponentInventorySelection`, `setControlVariable`, `setDemoState` |
| Autocomplete | `registerAutocompleteAdapter`, `unregisterAutocompleteAdapter`, `cancelAutocomplete`, `renderAutocomplete` |
| Tables | `applyDataTable`, `filterDataTable`, `sortDataTable`, `setDataTablePage`, `setDataTablePageSize`, `setDataTableDensity`, `setDataTableData`, `refreshDataTable`, `registerDataTableAdapter`, `unregisterDataTableAdapter`, `resizeDataTableColumn`, `pinDataTableColumn` |
| Charts | `hydrateCharts`, `setChartDataset`, `setChartHeight`, `setChartThreshold`, `hydrateSparklines`, `renderSparkline`, `startSparklineStream`, `stepSparklineStream`, `stopSparklineStream` |
| Performance | `getPerformanceProfile`, `evaluatePerformanceBudgets`, `hydratePerformanceLabs`, `runPerformanceLab`, `measureOverflow` |
| Graphs | `setGraphMode`, `setGraphLayout`, `setGraphViewport`, `selectGraphNode`, `selectGraphEdge`, `traverseGraph`, `traceGraphFrom`, `toggleGraphCluster`, `applyGraphFilters`, `applyGraphOrganization`, `refreshGraphGeometry`, `registerGraphLayoutEngine`, `runGraphLayoutEngine`, `applyGraphLayoutResult`, `collectGraphLayoutInput`, `registerGraphNodeType`, `unregisterGraphNodeType`, `applyGraphNodeType`, `applyGraphNodeTypes`, `getGraphNodeTypeConfig`, `updateGraphA11yFallback` |
| Documents/diff | `selectDocumentArtifact`, `setDocumentArtifactMode`, `updateDocumentSearch`, `selectDocumentAnnotation`, `getDocumentAnnotationSchema`, `getDocumentAnnotationSchemas`, `updatePolicyDiff`, `setPolicyDiffDecision` |
| Hierarchy/workflow | `selectHierarchyNode`, `toggleHierarchyBranch`, `applyHierarchyStructure`, `registerHierarchyNodeType`, `unregisterHierarchyNodeType`, `applyHierarchyNodeType`, `applyHierarchyNodeTypes`, `getHierarchyNodeTypeConfig`, `selectClaim`, `selectHistoryEvent`, `renderReviewWorkflow`, `getReviewWorkflow`, `getReviewWorkflowState`, `selectReviewWorkflowItem`, `applyReviewWorkflowAction`, `updateReviewWorkflow`, `hydrateReviewWorkflows` |
| Diagrams/connectors | `collectConnectorRoutes`, `computeConnectorRoute`, `applyConnectorRoutes`, `refreshConnectorRoutes`, `hydrateConnectorRoutes`, `createDiagramConnectorRoute`, `selectDiagramConnectorRoute`, `setDiagramConnectorRoute`, `updateSelectedDiagramRoute`, `deleteDiagramConnectorRoute`, `undoDiagramDelete`, `updateDiagramSearch`, `registerExportAdapter`, `unregisterExportAdapter`, `cancelSurfaceExport` |
