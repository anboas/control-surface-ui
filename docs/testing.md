# Testing

The framework has two test layers:

- Dependency-free contract tests that run in any Node environment.
- Optional Playwright browser tests for visual regression, browser accessibility smoke coverage, and hydrated component behavior.

## Core Validation

```bash
npm run validate
npm run accessibility
npm run test:contracts
```

`npm run validate` runs the existing build/package/example checks plus behavior, accessibility, and component contract suites. These tests do not require browser binaries.

## Playwright Setup

Install package dependencies and browser binaries before running browser tests:

```bash
npm install
npm run playwright:install
npm run build
```

The Playwright suites load the example pages from `examples/` and assert that those pages use the compiled `dist/` assets.
`playwright.config.mjs` starts the framework dev server at `http://127.0.0.1:4173` so browser QA exercises HTTP-loaded examples, JSON fixtures, and packaged assets instead of `file://` behavior.

## Playwright Visual Regression

```bash
npm run test:visual
```

The formal QA freeze artifact is [`qa-baseline.md`](./qa-baseline.md). It names the required screenshot count, baseline surface matrix, theme snapshot matrix, acceptable differences, and handoff definition of done.

Visual coverage includes:

- Overview dashboard surface
- Design-system theme controls
- Theme semantic state snapshots for every built-in theme
- Design-system table and analytics surface
- Graph explorer surface
- Architecture diagram surface
- Document reconstitution surface

Baseline screenshots are checked in under `tests/playwright/__screenshots__/` for desktop and mobile Chromium. The current MVP-critical baseline contains 28 screenshots: six primary product surfaces plus eight theme semantic-state surfaces across both viewport projects.

The visual suite captures stable component surfaces rather than entire long pages. Motion is reduced, caret rendering is hidden, and the document theme is forced to light so diffs are meaningful. Theme snapshots are scoped surfaces on `examples/theme-states.html`, so each built-in theme can be reviewed without changing the global test page theme.

## Updating Screenshots

When a visual change is intentional:

```bash
npm run test:visual -- --update-snapshots
```

Review the generated snapshots under `tests/playwright/__screenshots__/` before committing them. Treat changed screenshots as reviewed artifacts, not disposable output.

## Browser Accessibility

```bash
npm run test:a11y:browser
```

The browser accessibility suite checks example pages for:

- Named interactive controls
- Dialog naming
- Valid `aria-controls` targets
- Route-aware active navigation
- Keyboard-openable account controls
- Theme switching through the Jane Doe account menu

The dependency-free `npm run accessibility` suite remains the source of truth for static ARIA, keyboard, and documentation contracts. The Playwright suite proves those contracts after hydration.

## Component Contract Tests

```bash
npm run test:contracts
```

The Node component contract suite verifies that:

- Package scripts and Playwright infrastructure are present.
- The browser bundle exposes stable framework APIs.
- Component examples carry required `data-if-*` behavior hooks.
- Docs explain visual regression, browser accessibility, and component contract workflows.

The Playwright component-contract spec repeats the most important checks in a hydrated browser context, including table filtering/selection, diagram detail open/close behavior, reusable adapter task success/empty/error/cancelled states, superseded-request cancellation, generic/channel-scoped adapter events, and the performance budget gate from [`performance-budgets.md`](./performance-budgets.md).

## Full Browser Pass

```bash
npm run test:browser
```

This runs every Playwright spec in `tests/playwright/` across desktop and mobile Chromium projects. Use it before large design-system or behavior-layer changes. The component-contract suite runs the large performance profile at desktop and mobile widths and fails when a section budget, total budget, uncontained overflow, or page-overflow limit is breached.
