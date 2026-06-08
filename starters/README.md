# Starter Kits

These starter kits are copyable downstream project shells for teams or agents consuming the packaged Control Surface UI. They are not demo pages from `examples/`; they are minimal buildout starting points that consume package artifacts only.

## Included Starters

| Starter | Use when | Runtime |
| --- | --- | --- |
| `policy-plain-html` | You need a no-build Policy Intelligence shell with route placeholders and synthetic adapter hooks. | Plain HTML from `node_modules` dist assets. |
| `policy-vite` | You need a Vite Policy Intelligence app shell with module imports and adapter stubs. | Vite plus packaged CSS/ESM JS. |
| `adamboas-plain-html` | You need a no-build AdamBoas.com public-site shell. | Plain HTML from `node_modules` dist assets. |
| `adamboas-vite` | You need a Vite AdamBoas.com shell with public-route placeholders and theme controls. | Vite plus packaged CSS/ESM JS. |

## Install Source

For registry installs:

```bash
npm install control-surface-ui
```

For local tarball handoff:

```bash
npm install ./control-surface-ui-0.1.0.tgz
```

For workspace testing from this repository:

```bash
npm pack
npm install ../control-surface-ui-0.1.0.tgz
```

## Agent Handoff Contract

Each starter:

- Loads compiled framework CSS and JavaScript from the package.
- Avoids React and other UI runtime dependencies.
- Includes topbar, navigation, theme/account controls, and route placeholders.
- Names adapter placeholders before service integration.
- Uses framework classes and data attributes as the public integration surface.
- Points back to `docs/agent-handoff.md`, `docs/route-component-map.md`, and `docs/adapter-fixture-contracts.md`.

When building a production app, keep route-specific data and service calls outside the framework. Register adapters and use `InterfaceFramework.init(root)` / `InterfaceFramework.destroy(root)` on route lifecycle changes.
