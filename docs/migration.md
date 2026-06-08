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

## 0.1.0

Initial release. There is no prior framework version to migrate from.

### Compatibility Notes

- No React runtime dependency is required.
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
