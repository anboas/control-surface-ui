# Errors

## [ERR-20260916-001] release-verification-order

**Logged**: 2026-09-16T12:02:00Z
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
Framework validation retained mutable-action tokens and provenance was generated before the current release tarball existed.

### Error
```
.github/workflows/ci.yml missing CI release gate token: actions/upload-artifact@v4
.github/workflows/release.yml missing manual release token: actions/upload-artifact@v4
release provenance should include the release tarball hash
```

### Context
- The release workflows were hardened to immutable action SHAs.
- The local command generated provenance before package smoke created the 0.3.9 tarball.

### Suggested Fix
Validate immutable action pins, run package smoke before provenance generation, and make `release:verify` encode that order.

### Metadata
- Reproducible: yes
- Related Files: scripts/validate.mjs, package.json, .github/workflows/ci.yml, .github/workflows/release.yml

### Resolution
- **Resolved**: 2026-09-16T12:04:00Z
- **Notes**: Validator tokens now enforce immutable pins. Release smoke validates after packing and provenance generation, and `release:verify` encodes the complete order.

---

## [ERR-20260916-005] cross-repo-search-context

**Logged**: 2026-09-16T18:14:00Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
Searched DBI application paths while the command working directory was the Control Surface repository.

### Resolution
Use the explicit repository root for every cross-repository command and resolve immutable framework SHAs separately from consumer searches.

---

## [ERR-20260916-004] framework-component-script-alias

**Logged**: 2026-09-16T18:12:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Used the nonexistent `test:components` npm alias instead of the repository's canonical `test:contracts` script.

### Resolution
Run `npm run test:contracts` for framework component contracts, then `npm run validate` for the complete release gate.

---

## [ERR-20260916-002] playwright-visual-baseline-environment-drift

**Logged**: 2026-09-16T12:09:00Z
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
All visual snapshots differed even though the changed CSS selectors were absent from every captured fixture.

### Error
```
28 visual snapshot failures across both projects; 48 behavior and accessibility tests passed.
```

### Context
- The same representative snapshot failure reproduced in a detached worktree at unchanged commit `69f3ad8`.
- The received dimensions and pixels were identical between the changed tree and unchanged commit.

### Suggested Fix
Treat a cross-suite visual shift as environment drift until a clean unchanged worktree proves otherwise. Do not accept new baselines without a reviewed visual change.

### Metadata
- Reproducible: yes
- Related Files: tests/playwright/visual.spec.mjs, tests/playwright/__screenshots__

### Resolution
- **Resolved**: 2026-09-16T12:11:00Z
- **Notes**: Detached unchanged-commit reproduction isolated the failure to the local rendering environment. No baselines were changed.

---

## [ERR-20260916-003] ci-theme-baseline-staleness

**Logged**: 2026-09-16T12:38:00Z
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
Framework CI retained two stale Theme System screenshots after all behavioral, accessibility, component, and other visual contracts passed.

### Error
```
2 failed: design-system-theme-surface on chromium-desktop and chromium-mobile; 74 passed.
```

### Context
- CI actual images were byte-identical across retries, proving stable rendering in the canonical environment.
- The expected and actual surfaces were visually reviewed; the only geometry drift was one pixel in the specimen height.
- Local full-suite visual drift remained broader, so local screenshots were not used as the source of truth.

### Suggested Fix
When local rendering is known to drift, refresh only the proven stale baseline from deterministic canonical-CI artifacts after visual review. Keep behavior and accessibility contracts blocking.

### Metadata
- Reproducible: yes
- Related Files: tests/playwright/__screenshots__/chromium-desktop/design-system-theme-surface.png, tests/playwright/__screenshots__/chromium-mobile/design-system-theme-surface.png

### Resolution
- **Resolved**: 2026-09-16T12:40:00Z
- **Notes**: Refreshed the two reviewed canonical-CI baselines and upgraded CI actions/test Node runtime to supported Node 24-compatible action releases and Node 22.

---
