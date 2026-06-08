# AdamBoas.com Vite Starter

Use this starter when the downstream AdamBoas.com rebuild needs a bundler-based public-site shell with framework imports.

## Setup

```bash
npm install
npm run dev
```

For local tarball handoff, replace the `control-surface-ui` dependency in `package.json` with the tarball path and run `npm install`.

## Buildout Order

1. Expand public routes: home, services, experience, insights, profile, resume, contact, attribution, and reference loop.
2. Create content fixtures and a content adapter.
3. Replace starter copy with public-site source content.
4. Keep framework behavior initialized through `init(document)`.
