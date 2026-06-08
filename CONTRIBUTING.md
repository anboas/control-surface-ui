# Contributing

This repository ships a reusable UI framework, not a production Policy Intelligence app. Keep framework changes reusable, documented, and backed by examples or tests.

## Development Setup

Use Node.js 20 or newer and npm 10 or newer.

```bash
npm install
npm run build
npm run validate
```

For browser checks:

```bash
npm run playwright:install
npm run test:browser
```

## Contribution Rules

- Prefer CSS custom properties and existing `if-` conventions before adding new styling patterns.
- Use `data-if-*` attributes for optional behavior hooks.
- Keep examples on compiled `../dist/` assets only.
- Update `docs/component-manifest.json`, `docs/component-api.md`, `docs/recipes.md`, `docs/event-catalog.md`, or `docs/data-schemas.md` when public behavior changes.
- Rebuild `dist/` after source CSS or JavaScript changes.
- Do not start production Policy MVP or AdamBoas.com implementation work from this repository unless explicitly requested.

## Generated Artifact Policy

Commit these artifacts intentionally because they are part of the framework handoff:

- `dist/`
- `release/*.tgz`
- `tests/playwright/__screenshots__/`
- `docs/theme-contrast-report.json`

Do not commit local runtime output:

- `node_modules/`
- `test-results/`
- `playwright-report/`
- temporary release-smoke consumer folders

## Review Checklist

Before opening a pull request or handing work to another agent:

```bash
npm run build
npm run validate
npm run release:smoke
```

When a change affects browser behavior or layout, also run the relevant Playwright suite:

```bash
npm run test:browser
```

## Branching And Release Notes

- Use focused branches for framework hardening work.
- Keep unrelated refactors out of component fixes.
- Record public API, token, behavior, package, or migration changes in `CHANGELOG.md`.
- Follow `docs/release-checklist.md` before publishing or handing off a tarball.
