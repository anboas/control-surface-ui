# Policy Intelligence Vite Starter

Use this starter when the downstream Policy MVP needs a bundler-based shell that imports packaged framework CSS and ESM JavaScript.

## Setup

```bash
npm install
npm run dev
```

For local tarball handoff, replace the `control-surface-ui` dependency in `package.json` with the tarball path and run `npm install`.

## Buildout Order

1. Keep the shell and route list.
2. Register mock adapters for each route.
3. Expand one route at a time using `docs/route-component-map.md`.
4. Replace mock adapters with service-backed adapters only after loading, empty, error, cancel, retry, and success states are proven.
