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
