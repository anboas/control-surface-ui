# Release Notes

All notable framework releases are documented here. Dates use ISO format.

## Unreleased

## 0.3.34 - 2026-09-20

### Added

- React `ControlCommandPalette` with grouped search, keyboard navigation, focus restoration, and responsive modal containment.
- React `ControlRecordHeader` for consistent record identity, status, metadata, and actions across drawers and profile surfaces.
- React `ControlTableSelectionBar` for shared selected-row feedback and bulk actions.

## 0.3.33 - 2026-09-20

### Changed

- Workbench summary metrics now wrap into the framework's two-column mobile grid by default instead of hiding additional metrics in an unmarked horizontal rail.
- Condensed mobile product branding now preserves the shared 44 px interaction target.

## 0.3.28 - 2026-09-18

### Added

- React `ControlDrawer` for contextual record detail with a shared header/body/footer anatomy, focus containment, Escape and backdrop dismissal, focus restoration, background scroll locking, and default, wide, and detail widths.

### Changed

- Accounted for strip borders in compact mobile metric geometry so the complete summary rail remains within a 56 px product density budget.

### Added

- React `ControlWorkbenchHeader` for consolidating route identity, summary metrics, tabs, filters, and actions into one bounded command surface.
- React `ControlActivityInspector` for keeping an ordered task/provider chain visible while rendering one selected request/response stage at a time, with keyboard navigation and a contained mobile stage rail.
- React `ControlCollectionEditor` for compact, progressively disclosed repeated-field editing with one active item, automatic expansion of newly added items, and touch-safe mobile actions.
- A flat analytics-panel modifier for nested analytical sections that need shared heading anatomy without another border, surface fill, or shadow.
- Opt-in compact mobile metric strips that retain helper copy for assistive technology while keeping dense dashboards within a single short summary rail.
- React `ControlDisclosure` for consistent progressive disclosure of secondary analysis, diagnostics, and evidence without duplicating summary/body anatomy in each product.
- React `ControlFactGrid` for compact, semantic record facts in one divided surface, including opt-in two-column mobile layouts and deliberate full-width facts.

## 0.3.19 - 2026-09-16

### Changed

- Reduced compact `ControlIdentityEditor` block padding while retaining full-size interactive controls.

## 0.3.18 - 2026-09-16

### Changed

- Tightened compact `ControlIdentityEditor` avatars to 48 px so utility forms preserve established above-the-fold density budgets.

## 0.3.17 - 2026-09-16

### Added

- Compact `ControlIdentityEditor` density for utility forms with established above-the-fold geometry budgets.

## 0.3.16 - 2026-09-16

### Added

- React `ControlIdentityEditor` for consistent profile, member, and workspace identity editing with compact mobile actions.

## 0.3.15 - 2026-09-16

### Added

- Opt-in mobile scroll rails for ingest-stage sequences and relationship-bundle grids.

## 0.3.14 - 2026-09-16

### Added

- `ControlMetricStrip` can opt into a compact, touch-scrollable mobile row with `mobileScroll`.

## 0.3.13 - 2026-09-16

### Added

- React `ControlProgressRail` for short workflow status that stays horizontal and compact on mobile.
- React `ControlChangeList` for unified field-level before/after review without duplicated comparison panels.

### Changed

- Mobile workflow descriptions collapse to stage labels while retaining accessible ordered-state semantics.
- Field changes use one contained responsive row per changed field.

## 0.3.12 - 2026-09-16

### Added

- React `ControlMetricStrip` for consistent responsive KPI and management summaries.
- Compact `ControlActivityTrail` density for task review and provider exchange histories.

### Changed

- `ToastProvider` now caps visible transient notifications with `maxVisible` so mutation bursts cannot obscure the application surface.
- Mobile toasts use a compact action layout that preserves readable content width.

## 0.3.11 - 2026-09-16

### Changed

- Divided page headers now apply a complete framework gutter so headings, summaries, metadata, and actions never touch an enclosing management surface.

## 0.3.10 - 2026-09-16

### Added

- React `ControlPageBody` for consistent interior gutters and section rhythm below route and management headers.
- React `ControlActivityTrail` for flat, ordered task and provider activity with optional bounded request/response content.

## 0.3.9 - 2026-09-16

### Added

- React `ControlAsyncState` and `ControlErrorBoundary` adapters for consistent loading, empty, cancelled, retry, and contained render-failure behavior.
- CI dependency auditing, CycloneDX SBOM evidence, CodeQL analysis, immutable action pins, and automated dependency updates.

### Security

- Framework workflows now use least-privilege job permissions and commit-pinned third-party actions.

## 0.3.8 - 2026-09-16

### Added

- A reusable React page-header adapter for route and section ownership, with compact and divided variants.

### Changed

- Page-header summaries, metadata, and actions now share one documented responsive anatomy across consuming products.

## 0.3.7 - 2026-09-16

### Added

- Flat metric and chart bands for compact observability dashboards without nested card chrome.
- Pointer and keyboard sample tooltips for the React sparkline adapter.

### Changed

- React sparklines preserve their plotted aspect ratio by default and provide a compact summary-strip variant.
- Framework bar rows can be rendered as accessible filter buttons with selected, hover, and focus states.

## 0.3.6 - 2026-09-15

### Added

- Optional `ControlSparkline` React adapter for accessible framework-native trend lines without the plain-HTML behavior hydrator.
- Reusable `.if-touch-target` utility for standalone controls that must retain a 44px pointer target outside components with built-in touch behavior.

### Compatibility

- Existing plain HTML sparkline and control contracts remain unchanged. React remains optional.

## 0.3.5 - 2026-09-15

### Added

- Flat purple `.if-btn--ai` and `.if-icon-btn--ai` variants for AI-assisted commands, with shared tokens, dark/high-contrast behavior, and no gradients.

## 0.3.4 - 2026-09-15

### Fixed

- Mobile-sheet dialogs now preserve 44px touch targets for actions placed inside the scrollable dialog body, covering progressive workflows without downstream overrides.

## 0.3.3 - 2026-09-15

### Fixed

- Mobile-sheet dialogs now preserve 44px input and select controls alongside their existing 44px actions, keeping credential and settings forms touch-safe without downstream overrides.

## 0.3.2 - 2026-09-15

### Fixed

- React detail dialogs now contain forward and reverse keyboard focus at their first and last controls while preserving consumer key handlers and focus restoration.

## 0.3.1 - 2026-09-15

### Added

- React picker trigger and portal-menu prop passthrough for product-specific test hooks and semantics without duplicating the primitive.
- React dialog ref and element-prop passthrough so contained picker portals, forms, and product-specific semantics can compose with the shared native-dialog lifecycle.

## 0.3.0 - 2026-09-15

### Added

- Optional React adapters at `control-surface-ui/react`: `ControlPicker`, `ControlMultiSelect`, `ControlDialog`, `ToastProvider`, and `useToast`.
- One tokenized rich-picker family for searchable single and multiple selection, icon and avatar options, descriptions, metadata, async states, portal collision handling, keyboard navigation, and mobile containment.
- A native detail-dialog family with title/action grids, sticky body/footer regions, focus restoration, wide factual layouts, and a mobile bottom-sheet variant.
- Structured success, info, warning, and error toasts with title/body copy, optional actions, dismissal, expiry, stacking, and masthead-safe placement.

### Changed

- `showToast` now accepts a structured options object while preserving the legacy string signature.

### Compatibility

- React remains optional. Plain HTML and vanilla JavaScript consumers do not install or load React.
- Existing `.if-modal`, `.if-select`, and legacy `showToast(message, icon)` contracts remain supported.

## 0.2.0 - 2026-09-05

### Added

- Native SVG intelligence viewport with same-origin DOM embedding, safe SVG sanitization, responsive fit, pointer and keyboard pan/zoom, node discovery, search highlighting, selection details, and lifecycle events.
- Reusable `.if-loading-dots` and `.if-loading-inline` loading contracts with small, large, and orbit variants, reduced-motion handling, and examples for state panels, action buttons, notification loading, and autocomplete.

## 0.1.0 - 2026-05-17

Initial distributable framework release.

### Added

- Design-token package with CSS custom properties for color, typography, spacing, radius, shadow, border, z-index, motion, density, and themes.
- Compiled distribution artifacts for plain HTML usage:
  - `dist/interface-framework.css`
  - `dist/interface-framework.min.css`
  - `dist/interface-framework.js`
  - `dist/interface-framework.min.js`
  - `dist/interface-framework.esm.js`
  - `dist/interface-framework.esm.min.js`
- Dual browser/global and ESM package entries so plain HTML consumers can use `window.InterfaceFramework` while Vite and other bundlers can import named JavaScript APIs.
- CDN-ready package metadata for jsDelivr and unpkg consumers, including explicit minified CSS and JavaScript paths.
- Vanilla JavaScript behavior layer with stable `init`, `destroy`, module lifecycle, overlays, menus, tabs, drawers, modals, validation, autocomplete, tables, charts, graph, hierarchy, document, diff, and diagram helpers.
- Component API reference with API tables, variant matrices, and copy-paste examples across the full component inventory.
- Agentic ergonomics layer with machine-readable component manifest, recipe index, event catalog, stable lifecycle examples, package metadata exports, and component-selection guidance.
- Theme compiler, generated contrast reports, forced-colors guidance, scoped theme snapshots, and visual smoke targets for every built-in theme.
- Example applications for overview, workspace, graph exploration, review, sources, search, documents, diagrams, data model, design system, consulting, and AdamBoas.com surfaces.
- Accessibility, keyboard, data-schema, theme, testing, and framework-quality documentation.
- Dependency-free validation, behavior, accessibility, and component contract tests, plus optional Playwright visual/browser accessibility test scaffolding.
- Release governance documentation for migration notes, browser support, deprecation rules, release checklist, and downstream audit workflow.
- Checksum generation through `npm run checksums`, including `dist/interface-framework.checksums.json` and `dist/SHA256SUMS` for package artifact verification.
- Local release provenance through `npm run release:provenance`, including `release/provenance.json` and `release/provenance.md` for package metadata, CDN/export metadata, tarball hashes, checksum evidence, and no-React runtime verification.

### Release Governance

- Migration Notes: `docs/migration.md` records version-specific upgrade actions. `0.1.0` is the initial release and has no prior-version migration.
- Browser Support: `docs/browser-support.md` defines evergreen browser support, forced-colors expectations, and the policy for dropping browser support.
- Deprecation: `docs/deprecation-policy.md` defines public contracts, deprecation lifecycle, replacement guidance, and emergency removal rules.
- Checksums: `dist/interface-framework.checksums.json` and `dist/SHA256SUMS` are generated from the release artifacts with SHA-256.
- Local Provenance: `release/provenance.json` and `release/provenance.md` summarize package metadata, CDN/export paths, release tarball hashes, checksum evidence, and no-React runtime status.
- Release Checklist: `docs/release-checklist.md` captures build, validation, browser, package smoke, signing/checksum, and post-release gates.

### Migration Notes

- No breaking changes; this is the first packaged release.
- Plain HTML consumers should load compiled files from `dist/`.
- Bundler consumers should use `control-surface-ui/css` and ESM imports from `control-surface-ui`.
- Customization should prefer public CSS variables, documented classes, and documented data attributes.

### Browser Support

- Supports current evergreen Chrome, Edge, Firefox, Safari, iOS Safari, and Android Chrome.
- Internet Explorer is not supported.
- Forced-colors and high-contrast behavior are documented in `docs/forced-colors.md` and `docs/browser-support.md`.

### Deprecation

- No deprecated public contracts in `0.1.0`.
- Future deprecations must include changelog notes, migration guidance, replacement contracts, and earliest removal version.

### CDN Usage

Pinned version:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/control-surface-ui@0.1.0/dist/interface-framework.min.css">
<script src="https://cdn.jsdelivr.net/npm/control-surface-ui@0.1.0/dist/interface-framework.min.js"></script>
```

Equivalent unpkg paths:

```html
<link rel="stylesheet" href="https://unpkg.com/control-surface-ui@0.1.0/dist/interface-framework.min.css">
<script src="https://unpkg.com/control-surface-ui@0.1.0/dist/interface-framework.min.js"></script>
```

### Notes

- The framework has no React runtime dependency.
- Examples load only compiled files from `dist/`.
- Browser tests require Playwright browsers to be installed separately with `npm run playwright:install`.
# 0.3.30

- Added `ControlIdentityLink` for consistent, accessible person and team links across tables, calendars, activity, and administration surfaces.
- Added `ControlStatusBadge` with one shared status vocabulary and semantic tone mapping.

# 0.3.31

- Enforced 44 px mobile targets for shared text and icon buttons across every control surface, including compact variants outside workbench headers.
# 0.3.32

- Add a composed operational month-calendar family for surface containment, calendar headers, month navigation, overlay rails, and six-week grids.
- Keep event placement, permissions, busy-day aggregation, and domain inspection in consuming applications.
