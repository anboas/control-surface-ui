# Framework Quality Guide

This framework is intended to ship as reusable interface infrastructure, not a one-off mockup. New components should satisfy the contracts below before they are considered complete.

## Quality Gates

Run the full validation suite before handing off changes:

```bash
npm run build
npm run validate
```

`npm test` is an alias for `npm run validate`.

The validation script checks:

- Required source, documentation, example, and compiled artifact files exist.
- Package export targets resolve.
- CSS `@import` paths resolve from the source entrypoint.
- Example pages load only compiled `/dist` CSS and JS.
- Static example links resolve to existing examples.
- Static example `id` values are unique within each page.
- Static `data-if-icon` values are covered by the icon registry.
- Static `data-if-chart` values use supported chart primitives, and chart/sparkline/table data contracts are covered in `docs/data-schemas.md`.
- JSON data files parse.
- JavaScript source and scripts pass Node syntax checks.

## Component Completion Checklist

For every substantial component or behavior:

- Provide source CSS in the appropriate layer: tokens, base, layout, components, utilities, or themes.
- Prefer CSS custom properties for values that product teams may tune.
- Use `data-if-*` attributes for optional JavaScript behavior.
- Keep the plain HTML contract readable and copyable.
- Add keyboard and focus behavior when the component is interactive.
- Include selected, hover, focus, disabled, empty, loading, and error states where relevant.
- Add a representative specimen to `examples/components.html`.
- Add usage notes and sample markup to `docs/components.md` or `docs/usage.md`.
- Rebuild `/dist` artifacts.
- Run `npm run validate`.

## Example Page Contract

Examples are product-quality demos, but they must behave like downstream consumers:

- They must load `../dist/interface-framework.css`.
- They must load `../dist/interface-framework.js`.
- They must not load files from `src/`.
- Page-specific demo data may live inline or in `examples/data/`.
- Example pages should demonstrate real composition of primitives, not bespoke one-off styling.

## JavaScript Behavior Contract

The JavaScript layer should stay optional and progressive:

- Static HTML should remain meaningful without JavaScript.
- Behavior should initialize automatically through `InterfaceFramework.init()`.
- Reusable behavior should be exposed through `window.InterfaceFramework` in the compiled browser bundle.
- Events should be dispatched for meaningful state changes when downstream applications may need to listen.
- Avoid framework runtime dependencies.

## Design-System Contract

`examples/components.html` is the canonical showcase. It should include:

- Core controls and form elements.
- Semantic badges, chips, status, confidence, and risk treatments.
- Tables, charts, metadata panels, and data-density controls.
- Graph, hierarchy, relationship, and landscape patterns.
- Workflow, claim, history, diff, alert, provenance, and governance patterns.
- State patterns: empty, loading, error, degraded, blocked, healthy, paused, selected, active.

When a component exists in a product page but not in the design system, add a specimen.
