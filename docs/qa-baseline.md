# QA Baseline Freeze

Status: frozen-for-v0.1-qa-handoff.

This document defines the browser QA evidence that must exist before the UI Framework is handed to a downstream Policy MVP or AdamBoas.com buildout agent. It pairs with `docs/testing.md`, `playwright.config.mjs`, `tests/playwright/visual.spec.mjs`, `tests/playwright/a11y.spec.mjs`, and `tests/playwright/component-contracts.spec.mjs`.

## Browser QA Scope

The browser baseline is intentionally focused on MVP-critical framework surfaces rather than every full page. The suite verifies:

- Visual regression snapshots for core product and framework surfaces.
- Theme semantic-state snapshots across every built-in theme.
- Browser accessibility smoke checks after framework hydration.
- Hydrated component contracts for public APIs, data attributes, table behavior, diagram details, and performance/overflow.
- Desktop and mobile Chromium coverage.

## Baseline Surface Matrix

| Surface | Example route | Selector | Desktop baseline | Mobile baseline |
| --- | --- | --- | --- | --- |
| Overview dashboard | `examples/index.html` | `.if-content` | `overview-dashboard-surface.png` | `overview-dashboard-surface.png` |
| Design-system themes | `examples/components.html#themes` | `#themes` | `design-system-theme-surface.png` | `design-system-theme-surface.png` |
| Data tables and analytics | `examples/components.html#data` | `#data` | `design-system-table-analytics-surface.png` | `design-system-table-analytics-surface.png` |
| Graph explorer | `examples/graph-view.html` | `.if-graph-shell` | `graph-explorer-surface.png` | `graph-explorer-surface.png` |
| Architecture diagram | `examples/diagrams.html` | `#azure-deployment-diagram .if-architecture-board` | `diagram-architecture-surface.png` | `diagram-architecture-surface.png` |
| Document reconstitution | `examples/document-viewer.html` | `.if-doc-main` | `document-reconstitution-surface.png` | `document-reconstitution-surface.png` |

## Theme Snapshot Matrix

| Theme | Desktop baseline | Mobile baseline |
| --- | --- | --- |
| Light | `theme-light-semantic-states.png` | `theme-light-semantic-states.png` |
| System light | `theme-system-light-semantic-states.png` | `theme-system-light-semantic-states.png` |
| System dark | `theme-system-dark-semantic-states.png` | `theme-system-dark-semantic-states.png` |
| Dark | `theme-dark-semantic-states.png` | `theme-dark-semantic-states.png` |
| Midnight | `theme-midnight-semantic-states.png` | `theme-midnight-semantic-states.png` |
| High contrast | `theme-high-contrast-semantic-states.png` | `theme-high-contrast-semantic-states.png` |
| Calm | `theme-calm-semantic-states.png` | `theme-calm-semantic-states.png` |
| Executive | `theme-executive-semantic-states.png` | `theme-executive-semantic-states.png` |

Required screenshot count: 14 desktop PNG files and 14 mobile PNG files under `tests/playwright/__screenshots__/`.

## Browser Test Commands

```bash
npm run test:visual
npm run test:a11y:browser
npm run test:browser
```

When `npm` is unavailable on PATH, run the same Playwright entrypoint through the local package binary:

```powershell
.\node_modules\.bin\playwright.cmd test
```

## Snapshot Update Policy

- Update snapshots only for intentional visual changes.
- Review desktop and mobile diffs before accepting them.
- Keep `playwright.config.mjs` using reduced motion, hidden caret rendering, and the checked-in `tests/playwright/__screenshots__/` snapshot path.
- Do not replace browser QA with `file://` screenshots; the Playwright server must exercise HTTP-loaded examples, JSON fixtures, compiled `dist` assets, and hydrated JavaScript behavior.

## Known Acceptable Differences

- The Vite consumer used by release smoke may emit a large chunk warning; it is not a browser QA failure.
- Visual baselines are scoped to stable component surfaces and semantic-state regions, not entire long scrolling pages.
- Screenshots are Chromium-only for v0.1. Additional browsers can be added as P1/P2 release hardening.

## Definition Of Done

- `tests/playwright/visual.spec.mjs`, `tests/playwright/a11y.spec.mjs`, and `tests/playwright/component-contracts.spec.mjs` are present.
- `playwright.config.mjs` defines desktop and mobile Chromium projects.
- `tests/playwright/__screenshots__/chromium-desktop` contains 14 PNG baselines.
- `tests/playwright/__screenshots__/chromium-mobile` contains 14 PNG baselines.
- `docs/testing.md` documents visual regression, browser accessibility, screenshot update policy, and full browser pass commands.
- `docs/github-shipping-work-items.md` records FW-007 status evidence.
- `docs/release-checklist.md` includes a QA Baseline Freeze gate.
- `npm run validate` enforces this QA baseline freeze.
