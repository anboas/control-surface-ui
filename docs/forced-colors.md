# Forced Colors Guidance

The framework supports operating-system forced-color environments with an explicit `@media (forced-colors: active)` token mapping in `src/styles/themes.css`. These colors are resolved by the browser and user settings, so the framework treats them as a runtime accessibility contract rather than a static palette.

## System Color Mapping

| Framework token group | Forced-colors value |
| --- | --- |
| Surfaces | `Canvas` |
| Text | `CanvasText` |
| Links | `LinkText` |
| Primary action, focus, selected border | `Highlight` |
| Text on primary or selected fills | `HighlightText` |
| Borders | `CanvasText` |
| Shadows | `none` |

The token compiler verifies that the required forced-color mappings are present. Browser visual smoke tests should still be run because exact colors are chosen by the user agent and user theme.

## Authoring Rules

- Use framework semantic tokens for colors; do not hard-code decorative colors inside components.
- Keep visible borders, outlines, labels, and icons. Do not rely on box shadow, transparency, or hue alone.
- Avoid `forced-color-adjust: none` unless preserving a critical non-text asset. Most framework components should allow the browser to remap colors.
- Prefer native controls, real text, and explicit labels for state: `Approved`, `Blocked`, `High`, `Needs review`.
- Focus rings must use `--if-focus` or `--if-focus-ring`.
- If a component has a custom SVG or canvas visualization, provide a text/table fallback or an adjacent index.

## Verification

Run the token compiler and visual smoke targets:

```bash
npm run theme:compile
npm run validate
npm run test:visual
```

The dedicated visual target is `examples/theme-states.html`. For forced-colors-specific browser checks, run Playwright with forced-colors emulation or use Windows high contrast mode and inspect buttons, badges, tables, graph controls, document highlights, and diagram connectors.

## Component Checklist

- Buttons keep a visible boundary, text label, and focus ring.
- Badges and status indicators include explicit state text.
- Alerts expose icon, border, and readable copy.
- Tables preserve row and column boundaries.
- Graph, hierarchy, and diagram surfaces provide keyboard-readable node/edge summaries.
- Document annotations expose tooltips or inspector content with text labels such as `ORG`, `CLM`, and `REF`.
