# Release Smoke

Last run: 2026-06-08.

## Scope

The release smoke verifies that the framework works from package artifacts only:

- Run the framework build and validation suite.
- Run `npm pack`.
- Install the packed tarball into a clean plain HTML sample.
- Install the packed tarball into a clean Vite sample.
- Verify dist CSS/JS artifacts, package exports, CDN metadata, and no React runtime dependency.
- Verify release-governance metadata and checksum artifacts.

## 2026-06-08 Result

Status: passed.

Environment:

- Node: `v24.14.0`
- npm CLI used for smoke: `10.9.2`
- npm source: `temporary`

Checks completed:

- `node scripts/build.mjs`: passed.
- `node scripts/validate.mjs`: passed.
- `node scripts/checksums.mjs --check`: passed.
- `npm pack`: produced `control-surface-ui-0.1.0.tgz`.
- Final handoff tarball copied to `release/control-surface-ui-0.1.0.tgz`.
- Packed tarball included required `dist`, `src`, `docs`, release, and package metadata files.
- Plain HTML clean sample installed from the packed tarball and resolved package `dist` CSS/JS.
- Vite clean sample installed from the packed tarball, imported `control-surface-ui/css`, imported named JavaScript APIs from `control-surface-ui`, and ran `vite build`.
- Package export map exposed CSS, browser JS, ESM JS, manifest, recipe, event, release-governance, checksum, and handoff entries.
- CDN fields were present: `unpkg`, `jsdelivr`, `cdn.cssMin`, and `cdn.jsMin`.
- Installed package runtime dependencies did not include `react` or `react-dom`.
- Clean Vite sample `package-lock.json` did not contain `react` or `react-dom`.

## Repeat The Smoke

Run either command from the repository root:

```bash
node scripts/release-smoke.mjs
npm run release:smoke
```

The script downloads a temporary npm CLI when npm is unavailable on PATH, then runs the same package-consumer checks in isolated temporary directories.
