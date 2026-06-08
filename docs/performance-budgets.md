# Performance Budgets

Status: `frozen-for-v0.1-performance-handoff`

This document is the source of truth for the framework's built-in scale smoke budgets. The goal is not statistically perfect benchmarking. The goal is a practical release gate that catches slow render paths, page-breaking overflow, and oversized demos before downstream product agents inherit them.

## Budget Profiles

The behavior layer exposes three profiles through `InterfaceFramework.getPerformanceProfile(profile)` and `InterfaceFramework.runPerformanceLab(lab, profile)`.

| Profile | Table rows | Graph nodes | Graph edges | Diagram nodes | Document lines | Chart points | Total budget |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `mobile` | 240 | 42 | 68 | 30 | 220 | 32 | 220ms |
| `balanced` | 520 | 72 | 128 | 48 | 420 | 56 | 300ms |
| `large` | 1,500 | 132 | 264 | 84 | 980 | 112 | 520ms |

Section budgets:

| Profile | Table | Graph | Diagram | Document | Charts | Uncontained overflow | Page overflow |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `mobile` | 45ms | 60ms | 55ms | 55ms | 45ms | 0 | <= 2px |
| `balanced` | 70ms | 85ms | 70ms | 75ms | 60ms | 0 | <= 2px |
| `large` | 110ms | 130ms | 105ms | 110ms | 95ms | 0 | <= 2px |

## Result Contract

`runPerformanceLab()` returns a normalized budget result:

```js
const result = InterfaceFramework.runPerformanceLab(lab, "large");

result.budget = {
  passed: true,
  sections: {
    table: { count: 1500, ms: 42.1, limit: 110, state: "pass" }
  },
  total: { ms: 184.8, limit: 520, state: "pass" },
  overflow: { checked: 96, contained: 7, failures: 0, limit: 0, state: "pass" },
  failures: [],
  warnings: []
};
```

`result.state` must be `passed` when every section is within budget, total render is within budget, and uncontained overflow is below the profile limit.

## Release Gate

The browser component-contract suite runs the `large` profile at desktop and mobile widths. It fails when:

- any section exceeds its budget,
- the total render time exceeds its budget,
- uncontained overflow is present,
- page-level horizontal overflow exceeds 2px, or
- the performance lab fails to return `state: "passed"`.

Command:

```bash
npm run test:browser -- tests/playwright/component-contracts.spec.mjs
```

## Host App Guidance

Downstream products can use the same contract without adopting the design-system page:

1. Render a hidden or QA-only lab with `data-if-performance-lab`.
2. Register the same surface slots used by the component showcase.
3. Call `runPerformanceLab(lab, "large")` after route hydration.
4. Record `if:performance-run` telemetry into the host's release report.
5. Treat `result.budget.passed === false` as a release blocker unless an owner explicitly accepts the regression.

Scrollable subregions are allowed when they declare `data-if-overflow-mode="scroll"` or `clip`. Undeclared overflow is treated as page-breaking overflow.
