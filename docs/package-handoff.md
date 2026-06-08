# Package Handoff

Use this guide when handing the UI framework to another project or another agent.

## What To Hand Off

- `release/control-surface-ui-<version>.tgz` from `node scripts/release-smoke.mjs`
- `release/provenance.json`
- `release/provenance.md`
- `README.md`
- `docs/usage.md`
- `docs/component-manifest.json`
- `docs/recipes.md`
- `docs/event-catalog.md`
- `docs/agent-handoff.md`
- `docs/mvp-route-contracts.md`
- `docs/route-component-map.md`
- `docs/adapter-fixture-contracts.md`
- `docs/mvp-acceptance-checklist.md`
- `docs/public-site-handoff.md`
- `docs/github-shipping-work-items.md`
- `docs/graph-diagram-production-path.md`
- `docs/document-intelligence-production-path.md`
- `docs/component-api.md`
- `docs/data-schemas.md`
- `docs/testing.md`
- `docs/themes.md`
- `docs/forced-colors.md`
- `docs/theme-contrast-report.md`
- `docs/theme-contrast-report.json`
- `docs/performance-budgets.md`
- `docs/release-smoke.md`
- `docs/release-governance.md`
- `CHANGELOG.md`
- `starters/README.md`
- `starters/policy-plain-html/`
- `starters/policy-vite/`
- `starters/adamboas-plain-html/`
- `starters/adamboas-vite/`

The package itself includes `dist`, `src`, `docs`, `examples`, `starters`, release notes, package metadata, and checksum artifacts.

## Consumer Install

For a local handoff tarball:

```bash
npm install ./control-surface-ui-0.1.0.tgz
```

For plain HTML:

```html
<link rel="stylesheet" href="./node_modules/control-surface-ui/dist/interface-framework.css">
<script src="./node_modules/control-surface-ui/dist/interface-framework.js"></script>
```

For Vite or another bundler:

```js
import "control-surface-ui/css";
import { init, destroy, registerDataTableAdapter } from "control-surface-ui";

init(document);
```

The framework has no React runtime dependency.

## Starter Kits

The packaged starter kits are the durable starting points for downstream buildout:

- `starters/policy-plain-html`: no-build Policy Intelligence shell using `node_modules/control-surface-ui/dist/*`.
- `starters/policy-vite`: Vite Policy Intelligence shell importing `control-surface-ui/css` and the ESM behavior APIs.
- `starters/adamboas-plain-html`: no-build AdamBoas.com public-site shell using `node_modules/control-surface-ui/dist/*`.
- `starters/adamboas-vite`: Vite AdamBoas.com public-site shell importing packaged CSS and ESM behavior APIs.

Use the starter kits to begin a downstream app, then follow `docs/agent-handoff.md`, `docs/route-component-map.md`, `docs/adapter-fixture-contracts.md`, and `docs/public-site-handoff.md` to expand routes and replace mock adapters with production services.

## Agent Starting Path

1. Read `docs/github-shipping-work-items.md` when the task is to package, harden, or move the framework into a real GitHub repo.
2. Choose a starter kit from `starters/` before copying example markup.
3. Read `docs/agent-handoff.md` for the MVP route map, trusted examples, adapter expectations, build order, and known gaps.
4. Read `docs/mvp-route-contracts.md` for the detailed route contract before building a page.
5. Read `docs/route-component-map.md` to map the route to framework components, JavaScript behavior, expected events, and trusted examples.
6. Read `docs/adapter-fixture-contracts.md` before creating mocks or service-backed adapters.
7. Read `docs/mvp-acceptance-checklist.md` before starting downstream Policy MVP buildout.
8. Read `docs/component-manifest.json` to identify the right component family.
9. Read `docs/recipes.md` for "choose this component when..." guidance.
10. Read `docs/component-api.md` for classes, data attributes, JavaScript APIs, and events.
11. Read `docs/graph-diagram-production-path.md` before building graph traversal, architecture diagrams, connector routing, exports, or diagram edit/session behavior.
12. Read `docs/document-intelligence-production-path.md` before wiring parser output, artifact fetches, annotation schemas, line highlighting, search, or document review handoff.
13. Read `docs/public-site-handoff.md` before building AdamBoas.com homepage, services, profile, resume, insights, public search, attribution, reference loop, or contact flows.
14. Read `docs/data-schemas.md` before wiring tables, graphs, documents, charts, annotations, and adapters.
15. Copy markup from `examples/` only after selecting a component from the manifest.
16. Initialize only the required modules with `InterfaceFramework.init(root, { modules: [...] })`.
17. Destroy behaviors on route changes with `InterfaceFramework.destroy(root, { modules: [...] })`.
18. Use `InterfaceFramework.getComponentController(target)` for host-driven `open`, `close`, `toggle`, `select`, `reset`, `refresh`, and `destroy` behavior instead of dispatching synthetic clicks.

## Release Gate

Before handing the package to a production buildout agent, run:

```bash
node scripts/release-smoke.mjs
npm run release:provenance
npm run release:provenance:check
```

or, when npm is available:

```bash
npm run release:smoke
npm run release:provenance
npm run release:provenance:check
```

The smoke script builds, validates, packs the package, installs the tarball into clean plain HTML and Vite consumers, verifies package exports and CDN metadata, confirms the installed package does not pull React, and copies the final handoff tarball to `release/`. The provenance script records package metadata, CDN/export metadata, checksum evidence, release tarball hashes, runtime dependencies, no-React status, and external signing/provenance policy.

## Production Buildout Notes

- Use compiled `dist` assets in downstream sites; use `src` only for framework development.
- Treat `docs/component-manifest.json`, `docs/event-catalog.md`, and `docs/data-schemas.md` as contracts.
- Treat `docs/themes.md`, `docs/forced-colors.md`, and `docs/theme-contrast-report.md` as the theme and contrast release contract; rerun `npm run theme:compile` and visual theme snapshots after theme token changes.
- Treat `docs/graph-diagram-production-path.md` as the production upgrade contract for graph node/edge delegation, layout-engine adapters, traversal, accessible fallback, diagram node types, connector routing, export adapters, and storage adapters.
- Treat `docs/document-intelligence-production-path.md` as the production upgrade contract for document parser output, artifact records, annotation records, search/highlight behavior, review finding handoff, and accessible fallbacks.
- Treat `docs/public-site-handoff.md` as the AdamBoas.com public route, content schema, adapter, and acceptance contract.
- Register production adapters for tables, autocomplete, graph layout, diagram export, and document annotations rather than modifying demo data. For new adapter families, use `runAdapterTask`, `cancelAdapterTask`, and `getAdapterTaskState` to inherit shared loading, empty, error, success, cancellation, and telemetry behavior.
- Keep programmatic behavior aligned with `docs/component-api.md#programmatic-behavior-contract`; if a host needs a new action, add it to the controller and event docs rather than creating page-only JavaScript.
- Keep product-specific visuals in application code unless they are reusable framework primitives.
- Run downstream visual and accessibility checks after applying the framework theme to a real product.
