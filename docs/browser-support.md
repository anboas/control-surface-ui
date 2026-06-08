# Browser Support

The framework targets modern evergreen browsers and standards-based assistive technology. In general, support means the latest two stable releases for each listed evergreen browser. It is built for plain HTML, CSS custom properties, native form controls, SVG, and standard DOM APIs.

## Supported Browsers

| Environment | Support policy |
| --- | --- |
| Chrome | Latest two stable releases. |
| Edge | Latest two stable releases. |
| Firefox | Latest two stable releases. |
| Safari | Latest two stable desktop releases. |
| iOS Safari | Latest two stable iOS releases. |
| Android Chrome | Latest two stable releases. |
| Chromium-based WebViews | Supported when they match current Chromium CSS/DOM behavior. |

Internet Explorer is not supported.

## Required Platform Features

- CSS custom properties
- CSS grid and flexbox
- `:focus-visible` or acceptable fallback behavior
- `ResizeObserver` when host pages use advanced layout adapters
- SVG rendering
- Pointer, keyboard, and standard form events
- ES modules for bundler imports, or classic script support for `dist/interface-framework.js`

## Accessibility And Forced Colors

The framework includes high-contrast and forced-colors guidance in `docs/forced-colors.md`. Components should preserve:

- visible focus indicators
- semantic HTML controls before custom behavior
- ARIA only where native semantics are insufficient
- keyboard alternatives for pointer-heavy surfaces such as graphs and diagrams
- accessible fallback indexes for dense graph and document views

## Support Change Policy

Dropping browser support requires:

1. a changelog entry,
2. a migration note,
3. an updated browser-support table,
4. evidence that the removed target blocks maintainability or required platform behavior,
5. at least one minor release of notice unless the browser is already end-of-life or security-unsafe.

## Testing Expectations

Before release, run the dependency-free validation suite and, when available, Playwright browser suites across desktop and mobile viewports. Visual and a11y baselines should cover light, dark, high-contrast, graph, table, document, diagram, and design-system pages.
