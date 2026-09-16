# Migration Notes

Use this file with `CHANGELOG.md` when upgrading the framework. It records version-specific migration work, compatibility notes, and downstream verification steps.

## Upgrade Process

1. Pin the new package version in the consuming project.
2. Read the changelog entry for the target version.
3. Read the migration entry below.
4. Search the consuming codebase for deprecated classes, data attributes, JavaScript APIs, events, and tokens.
5. Load the consuming app using only compiled package assets.
6. Run local visual, keyboard, accessibility, and adapter smoke tests.
7. Verify artifacts against `dist/interface-framework.checksums.json` when using packaged files directly.

## 0.3.6

### Summary

Adds a React sparkline adapter and a reusable 44px touch-target utility. Existing markup remains compatible.

### Breaking Changes

- None.

### Required Actions

1. Import `ControlSparkline` from `control-surface-ui/react` when a React surface needs the existing framework sparkline without behavior hydration.
2. Add `.if-touch-target` only to standalone controls that are not already covered by a component-specific mobile touch contract.

### Verification

- Run `npm run release:verify` and the consuming application's responsive browser contracts.
- Confirm sparkline accessible labels and 44px standalone control geometry.

## 0.3.5

### Summary

Adds framework-owned full and icon AI action variants. Existing button markup remains compatible.

### Breaking Changes

- None.

### Required Actions

1. Use `.if-btn--ai` only for actions that invoke or configure an AI workflow.
2. Use `.if-icon-btn--ai` for compact AI commands and keep an accessible name.
3. Remove downstream purple button overrides when adopting these variants.

### Verification

- Run `npm run release:verify` and the button browser contract.
- Verify the variants in light, dark, and high-contrast themes.

## 0.3.4

### Summary

Extends the mobile-sheet touch-target contract to actions placed inside the scrollable dialog body. Existing dialog markup remains compatible.

### Breaking Changes

- None.

### Required Actions

1. Upgrade the package and compiled CSS together.
2. Remove downstream minimum-height overrides for body actions inside `.if-dialog--mobile-sheet` where they are no longer needed.
3. Re-run authenticated mobile dialog geometry checks at 390 px or narrower.

### Verification

- Run `npm run release:verify` and `npm run test:browser` here.
- Confirm every actionable control in the consuming mobile-sheet dialog measures at least 44 px.

## 0.3.0

### Summary

Adds optional React adapters for rich pickers, native dialogs, and structured toast feedback. Existing plain HTML contracts remain compatible.

### Breaking Changes

- None.

### Required Actions

1. Import optional adapters from `control-surface-ui/react`; continue importing CSS from `control-surface-ui/css`.
2. Replace app-owned picker, dialog, and toast styling with `.if-picker`, `.if-dialog`, and `.if-toast` contracts.
3. Keep domain labels, options, persistence, and permission checks in the consuming app.
4. Verify portal containment at 12 px viewport gutters, 44 px mobile controls, focus restoration, and reduced-motion behavior.

### Verification

- Run `npm run release:verify` and `npm run test:browser` here.
- Run the consuming application's authenticated desktop/mobile browser suite.

## 0.2.0

### Summary

Adds the native SVG intelligence viewport and its public JavaScript lifecycle APIs. Existing contracts remain compatible.

### Breaking Changes

- None.

### Required Actions

1. Upgrade the package and compiled CSS/JavaScript together.
2. Replace static diagram images with the documented native SVG viewport markup where interactive navigation is needed.
3. Run pointer, keyboard, search, selection, and same-origin SVG loading checks in the consuming application.

### Verification

- Run `npm run release:verify` in this repository.
- Run the consuming application's production build and browser regression suite.

## 0.1.0

Initial release. There is no prior framework version to migrate from.

### Compatibility Notes

- No React runtime dependency is required for the core package. React adapters are optional peer entrypoints.
- Plain HTML consumers should load `dist/interface-framework.css` and `dist/interface-framework.js`.
- Bundler consumers should import `control-surface-ui/css` and named APIs from `control-surface-ui`.
- CSS customization should prefer public tokens and component classes over internal selectors.
- Optional behavior is activated through data attributes and the stable `InterfaceFramework.init()` lifecycle.

### Downstream Checklist

- Replace ad hoc page CSS with framework classes only where the framework owns the pattern.
- Keep product-specific visual tweaks in scoped overrides or theme tokens.
- Confirm no example page depends on `src/` files directly.
- Confirm the application works with minified CSS/JS for CDN-like usage.
- Run `npm run release:verify` in the framework repo before adopting a local build.

## Future Migration Template

Use this template for every new version:

```md
## x.y.z

### Summary

Short description of upgrade impact.

### Breaking Changes

- None, or list each breaking change with replacement.

### Deprecated Contracts

- Contract: replacement, warning behavior, planned removal version.

### Required Actions

1. Update markup/API usage.
2. Rebuild and smoke test.
3. Verify checksums.

### Verification

- Package smoke:
- Browser visual:
- Accessibility:
- Adapter states:
```
