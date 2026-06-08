# Next Steps

This note separates the framework's current reusable surface from the remaining work needed before treating it as production-grade infrastructure for multiple sites or applications.

## Current Position

The framework now has the core shape of a distributable UI system:

- CDN-ready package metadata and compiled CSS/JS artifacts.
- Design tokens, themes, utilities, component styles, and a vanilla JavaScript behavior layer.
- API tables, variant matrices, copy-paste examples, component manifest, recipes, event catalog, data schemas, accessibility docs, keyboard docs, and testing docs.
- Programmatic component control through `InterfaceFramework.getComponentController(target)` plus shared state helpers for disclosure, pressed, selected, and expanded state.
- Example pages for policy intelligence, graph exploration, documents, diagrams, data model, review, sources, consulting, and AdamBoas.com patterns.
- Release smoke testing, dependency-free validation, behavior tests, accessibility checks, component contract tests, Playwright visual baselines, browser accessibility checks, mobile snapshots, adapter lifecycle task contracts, and release-smoke evidence.
- Release governance docs, migration notes, browser support policy, deprecation policy, release checklist, and generated SHA-256 checksum artifacts.
- Local release provenance evidence covering package metadata, CDN/export fields, no-React runtime status, checksum artifacts, release tarball hashes, and external publish-provenance policy.
- Packaged starter kits for Policy Intelligence and AdamBoas.com in plain HTML and Vite variants.
- A frozen graph and diagram production path gate covering node/edge delegation, layout adapters, traversal, accessible fallback, connector routing, search/highlight, export, storage adapters, and v0.1 stability boundaries.
- A frozen document intelligence production path gate covering parser output, artifact records, annotation records, search/highlight behavior, review finding handoff, adapter states, accessible fallback, and v0.1 stability boundaries.
- A frozen AdamBoas.com public-site handoff covering homepage, services, profile, resume, insights, attribution, reference loop, public search, contact flows, content schemas, starter selection, and adapter states.

## Priority Workstreams

| Priority | Workstream | Outcome |
| --- | --- | --- |
| P1 | Component API maintenance | Keep owned components synchronized across screenshots, API tables, variant matrices, host-adapter recipes, manifest entries, and events. |
| P1 | Production adapter contract maintenance | Keep server-side table, autocomplete, graph layout, export, document annotation, source registry, and search adapters aligned with the shared task lifecycle, cancellation telemetry, retry budgets, empty/error states, and success payloads. |
| P1 | Performance budget maintenance | Keep the frozen performance and scale budget gate current, add trend reporting, and preserve desktop/mobile checks for large tables, graphs, diagrams, documents, charts, and source registries. |
| P1 | Graph and diagram production path maintenance | Keep the frozen production-path contract aligned with graph layout engine adapters, traversal, connector routing, export, storage, accessible fallbacks, examples, and browser checks. |
| P1 | Document intelligence production path maintenance | Keep the frozen document intelligence production path aligned with parser output, artifact records, annotation records, full-text search, semantic highlights, review finding handoff, adapter states, and accessible fallback. |
| P2 | Icon pipeline | Decide how customer-provided official seals, custom glyphs, and open-source icon packs are registered, attributed, themed, and tested. |
| P2 | Downstream enablement | Keep migration recipes, downstream smoke harnesses, and public-site handoff evidence synchronized with starter and component changes. |

## Framework Parity Notes

The goal is not to clone Bootstrap, Tailwind, Material, or Radix. The framework should cover the common baseline users expect from those systems, then go beyond them in policy-intelligence-specific surfaces.

## Critical Assessment For Agentic Development

The framework is now useful to an agentic developer, but not yet effortless. It has strong declarative hooks, plain HTML examples, stable behavior modules, a programmatic controller facade, no React runtime dependency, and visible design-system specimens. The remaining friction is keeping the manifest, recipes, examples, API docs, event catalog, and tests synchronized as component behavior evolves.

| Lens | What works now | Friction | Production-grade action |
| --- | --- | --- | --- |
| Component discovery | Examples, API docs, design-system specimens, validation scripts, and `docs/component-manifest.json` exist. | Manifest entries must stay synchronized with component API tables, events, schemas, examples, and controller coverage. | Add a manifest consistency check that compares component ids, public APIs, events, docs, and example links. |
| Composition | Shells, tri-pane layouts, graph workspaces, document viewers, diagrams, dashboards, sources, review, consulting, public-site examples, and `docs/recipes.md` exist. | Some recipes still need smaller copy-paste variants and route-specific acceptance criteria. | Add route-level recipes for common product surfaces and "choose this when..." guidance. |
| Customization | CSS tokens, themes, density, component variables, `data-if-control-var`, and `data-if-demo-state` are working. | Public/customizable variables are not formally separated from implementation variables. | Publish a public token and component-variable contract. |
| Behavior layer | Init/destroy modules, adapters, events, keyboard docs, controller facade, shared state helpers, reusable adapter task runner, and behavior tests exist. | Ongoing work is keeping new adapter families on the shared lifecycle instead of reintroducing bespoke loading/cancel code. | Maintain adapter fixtures and browser contract tests for async, empty, error, retry, cancellation, controller, and Escape-stack states. |
| Component coverage | Upload/dropzone, command palette, editable grid, date/calendar picker, wizard/stepper, annotation toolbar, empty/loading/error variants, and starter kits are now owned components or package artifacts with examples and evidence. | Remaining work is depth: host-adapter examples, migration recipes, and route-specific acceptance notes. | Keep the coverage audit free of unowned P0/P1 gaps. |
| Release confidence | Build, validation, behavior, accessibility, component contract tests, Playwright baselines, performance budgets, release smoke, release governance docs, checksum artifacts, and local provenance evidence are in place. | Clean package install should be repeated for each release; external signing and performance trend reporting still need publishing-pipeline hardening. | Treat release smoke, QA baselines, performance budgets, local provenance evidence, and external signing/provenance policy as recurring release gates. |

| Area | Current parity | Remaining work |
| --- | --- | --- |
| Distribution | Strong: package metadata, exports, compiled assets, CDN fields, release notes, release governance docs, and checksum artifacts. | Repeat clean-project install smoke tests and published-package dry runs for every release. |
| Tokens and themes | Strong: CSS variables, density, light/dark/high-contrast themes, account-level switching. | Add theme visual regression snapshots and theme authoring examples. |
| Utilities | Strong baseline: layout, spacing, overflow, text safety, responsive, print, focus, surfaces. | Add examples for the most common composition recipes. |
| Controls | Strong: buttons, inputs, search, menus, tabs, accordions, popovers, modals, drawers, validation. | Browser keyboard tests for split menus, popovers, stacked overlays, and route-aware mobile nav. |
| Tables | Strong but still needs stress testing. | Large-data demo, editable-cell rules, pinned column edge cases, virtualization a11y. |
| Charts | Strong demo range: bar, line, pie, heatmap, gauge, bullet, histogram, funnel, scatter, treemap, sparkline. | Richer legends, keyboard data tables, live-stream examples, tooltip collision tests. |
| Graphs and hierarchies | Domain-differentiated: traversal, clustering, zoom/pan, hierarchy, authority paths, detail panels, node type delegation, accessible fallback, and a frozen production path. | Service-backed layout examples, denser edge deconfliction evidence, and graph export regression coverage. |
| Documents and annotations | Domain-differentiated: reconstituted text, line numbers, highlights, PDF/artifact context, claim/reference/org views, parser output handoff, annotation records, search/highlight contracts, review finding handoff, and a frozen production path. | Parser adapter examples, PDF text-layer sync, search-result grouping depth, and browser regression coverage for long-document review workflows. |
| Diagrams | Strong primitive set: stages, typed nodes, regions, connectors, search/highlight, details, edit/session controls, sliders, export contracts, and a frozen production path. | More production storage examples, connector-route regression coverage, and PDF export smoke evidence. |
| Testing | Strong: release smoke, validation, behavior tests, accessibility tests, component contracts, Playwright visual baselines, browser a11y checks, performance budget checks, and CI wiring are present. | Add trend reporting and intentional snapshot-review workflow. |

## Where Tailwind Is Still Ahead

| Tailwind advantage | Current framework response | Next action |
| --- | --- | --- |
| Utility breadth | The framework now covers common enterprise layout, spacing, text-safety, overflow, surface, border, responsive, print, focus, and motion utilities, but it is intentionally smaller than Tailwind. | Add utilities only when they reduce repeated product CSS or prevent real overflow/responsive issues. |
| Theme generation | The framework has semantic CSS tokens and theme docs, but it does not yet have a Tailwind-style config compiler that generates palettes, scales, and variants. | Add a small token-build script that reads a theme JSON file and emits a scoped CSS theme plus docs metadata. |
| Ecosystem adoption | Tailwind has a massive community, examples, editor plugins, and muscle memory. This framework is domain-specific and local-first. | Publish package docs, CDN snippets, migration examples, and downstream smoke recipes to reduce adoption friction. |
| Print/responsive variants | The framework has responsive and print utilities for common enterprise screens, but not Tailwind's variant matrix. | Keep expanding practical `if-sm-*`, `if-md-*`, `if-lg-*`, and `if-print-*` variants around real examples and tests. |
| Fast custom layout prototyping | Tailwind is faster for arbitrary one-off layouts. This framework is faster once a product pattern exists. | Provide copy-paste layout recipes for tri-pane apps, dashboards, source consoles, graph workspaces, document viewers, diagrams, and public pages. |

## Suggested Next Pass

The remaining roadmap should be managed as agent-handoff user stories. The goal is for another agent to build the production Policy Intelligence site and AdamBoas.com competently from framework metadata, recipes, examples, and docs.

| Story | Priority | User story | Deliverable | Acceptance criteria |
| --- | --- | --- | --- | --- |
| US-01 | P0 | As a buildout agent, I need a single handoff brief that tells me what to build first, which examples to trust, and which components to use. | Maintain `docs/agent-handoff.md` with route map, framework conventions, component selection map, build order, trusted examples, adapter expectations, and known gaps. | A new agent can start Policy Intelligence or AdamBoas.com buildout from the brief without reading every example file. |
| US-02 | P0 | As a Policy Intelligence app agent, I need a production route inventory for overview, graph, documents, review, sources, search, diagrams, workspace, and data model. | Define page contracts with primary components, data needs, adapter names, empty/loading/error states, and acceptance screenshots. | Each production route has a build recipe and maps back to one or more framework examples. |
| US-03 | Done | As an AdamBoas.com agent, I need a public-site content model for homepage, profile, resume, services, blog posts, insights, contact, attribution, and reference loops. | `docs/public-site-handoff.md` freezes route contracts, content schemas, adapter expectations, trusted examples, starter selection, and acceptance checks. | The public site can be assembled from framework components without custom one-off layout decisions. |
| US-04 | P1 | As an integration agent, I need production adapter contract fixtures for tables, autocomplete, graph layout, document annotations, diagrams, exports, and search. | Maintain adapter fixtures, request/response schemas, `runAdapterTask` examples, cancellation behavior, retries, telemetry events, and error states. | Adapters can be swapped from mock data to service calls without changing component markup. |
| US-05 | P1 | As a graph-heavy app agent, I need layout-engine and traversal guidance for law-to-implementation, organization hierarchy, references, derived-from, implements, guides, and evidence relationships. | Document graph presets, node/edge schemas, clustering behavior, line-label rules, keyboard fallback, and Graph layout engine integration. | The production graph can support traversal and hierarchy views without bespoke UI behavior. |
| US-06 | P1 | As a document-intelligence agent, I need annotation and artifact-viewer contracts for claims, organizations, references, obligations, full-text search, PDF/embed modes, and line highlighting. | Maintain `docs/document-intelligence-production-path.md`, parser output schemas, viewer recipes, adapter states, and review handoff guidance for original artifact, reconstituted text, split view, metadata, and extracted entities. | A production parser output can hydrate the viewer and preserve reviewer workflow context. |
| US-06a | P1 | As a document-intelligence agent, I need a Document annotation model that can be shared across parser output, review findings, highlights, comments, and source evidence. | Keep annotation record shape, target locators, evidence refs, lifecycle status, reviewer ownership, and adapter payload examples aligned across docs and examples. | A parser or review adapter can create, update, search, and hand off annotations without inventing page-specific fields. |
| US-07 | P1 | As a QA agent, I need committed visual, accessibility, keyboard, mobile, print, dark, high-contrast, table, graph, document, and diagram baselines to remain intentional as the framework changes. | Maintain Playwright suites, snapshot policy, and CI gates for visual/a11y/keyboard regressions. | Production buildout agents get fast feedback when they break framework contracts. |
| US-08 | P1 | As a performance agent, I need scale budgets for large tables, graphs, diagrams, documents, charts, and source registries. | Maintain `if:performance-run` metrics, browser/mobile budget checks, and documented release thresholds. | Large production demos remain responsive and fail CI when budget or overflow thresholds are exceeded. |
| US-09 | P1 | As a release agent, I need package smoke, versioning, migration, checksum, local provenance, signing policy, and downstream upgrade evidence. | Run clean `npm pack` installs, refresh local provenance evidence, publish with npm provenance or signed checksum evidence, and keep migration/release docs current. | Downstream agents can install, verify, and upgrade the framework intentionally. |
| US-10 | Done | As a downstream product agent, I need starter repositories for the Policy site and AdamBoas.com with framework wiring already in place. | Packaged plain HTML/Vite starter kits with routing, shell, theme/account controls, data adapter placeholders, and example content. | A new site can start from starter artifacts instead of copying from the design-system page. |

Immediate focus: use `docs/github-shipping-work-items.md` as the repo-ready execution backlog. Package smoke, repo hygiene, CI release gate, agent handoff freeze, component contract freeze, MVP planning freeze, QA baseline freeze, adapter lifecycle hardening, performance budget gate, starter kits, graph/diagram production path, document intelligence production path, public-site handoff, and local release provenance are now evidence-backed. The graph and diagram production path gate is now evidence-backed. The document intelligence production path gate is now evidence-backed. The public-site handoff is now evidence-backed. The remaining work is ongoing evidence maintenance for frozen starter, graph, diagram, document, public-site, adapter, performance, QA, and release provenance contracts.
