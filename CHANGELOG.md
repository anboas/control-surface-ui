# Release Notes

All notable framework releases are documented here. Dates use ISO format.

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
