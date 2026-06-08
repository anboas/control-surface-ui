# Theme System

The framework uses CSS custom properties for theming. Components read semantic tokens such as `--if-bg-surface`, `--if-text`, `--if-border`, `--if-accent`, `--if-success`, and `--if-danger`; themes override those tokens without duplicating component CSS.

## Built-In Themes

| Theme | Attribute | Use |
| --- | --- | --- |
| Light | no `data-theme`, or `data-theme="light"` | Default enterprise policy interface. |
| System | `data-theme="system"` | Explicit user preference that follows the browser or operating-system color-scheme setting. |
| Dark | `data-theme="dark"` | Low-light operational mode with dark surfaces and bright semantic colors. |
| Midnight | `data-theme="midnight"` | Backward-compatible alias for the dark enterprise palette. |
| High contrast | `data-theme="high-contrast"` | Strong borders, no decorative shadows, yellow focus/action token, and maximum boundary clarity. |
| Calm | `data-theme="calm"` | Light theme with teal accent. |
| Executive | `data-theme="executive"` | Light theme with violet accent. |

The framework also includes a `forced-colors: active` fallback so Windows high-contrast and other forced-color environments map to system colors.

## Compiler And Reports

Themes are checked by the token compiler:

```bash
npm run theme:compile
```

The compiler reads `src/tokens/color.css` and `src/styles/themes.css`, resolves semantic CSS custom properties, and writes:

- `docs/theme-contrast-report.md`
- `docs/theme-contrast-report.json`

`npm run validate` runs the compiler in `--check` mode so stale reports or failing built-in theme contrast ratios break the framework validation gate.

## Plain HTML Usage

Apply a theme at the document level:

```html
<html lang="en" data-theme="dark">
  ...
</html>
```

Apply a scoped theme to a specific surface:

```html
<section class="if-panel" data-theme="high-contrast">
  <h2 class="if-panel__title">Review Escalation</h2>
  <button class="if-btn if-btn--primary">Take action</button>
</section>
```

When no theme is set, the framework uses the light tokens. Use `data-theme="system"` when the user explicitly chooses operating-system color-scheme matching.

## JavaScript Controls

Theme buttons:

```html
<button class="if-btn" type="button" data-if-theme="light">Light</button>
<button class="if-btn" type="button" data-if-theme="dark">Dark</button>
<button class="if-btn" type="button" data-if-theme="high-contrast">High contrast</button>
```

Theme select:

```html
<select class="if-select" data-if-theme-control>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="high-contrast">High contrast</option>
  <option value="system">System</option>
</select>
<span data-if-theme-label>Light</span>
```

The behavior layer updates active states, writes the chosen theme to `localStorage`, and dispatches `if:theme-change`.

```js
InterfaceFramework.setTheme("dark");
InterfaceFramework.getTheme(); // "dark"

document.documentElement.addEventListener("if:theme-change", (event) => {
  console.log(event.detail.theme);
});
```

Use `data-if-theme-target="#surface-id"` to theme a specific preview or embedded product surface instead of the whole document.

## Token Contract

Theme overlays should provide these semantic groups:

- Surfaces: `--if-bg-page`, `--if-bg-surface`, `--if-bg-subtle`, `--if-bg-muted`, `--if-bg-selected`, `--if-bg-inverse`, `--if-bg`
- Text: `--if-text`, `--if-text-strong`, `--if-text-muted`, `--if-text-subtle`, `--if-text-inverse`
- Links and focus: `--if-link`, `--if-link-hover`, `--if-focus`
- Borders: `--if-border`, `--if-border-strong`, `--if-border-selected`
- Brand/action: `--if-accent`, `--if-primary`, `--if-accent-soft`
- Semantics: `--if-info`, `--if-info-soft`, `--if-success`, `--if-success-soft`, `--if-warning`, `--if-warning-soft`, `--if-danger`, `--if-danger-soft`, `--if-purple`, `--if-purple-soft`
- Elevation: `--if-shadow-xs`, `--if-shadow-sm`, `--if-shadow-md`, `--if-shadow-lg`, `--if-shadow-xl`, `--if-shadow-focus`, `--if-focus-ring`

`--if-primary` is an alias for the active accent and exists so older graph, hierarchy, and analytics components have a stable primary color token.

## Creating A Custom Theme

Add a new selector in `src/styles/themes.css`:

```css
[data-theme="operations"] {
  color-scheme: dark;
  --if-bg-page: #050b16;
  --if-bg-surface: #0b1626;
  --if-bg-subtle: #13233a;
  --if-text: #eef5ff;
  --if-text-strong: #ffffff;
  --if-border: #294260;
  --if-accent: #38bdf8;
  --if-primary: var(--if-accent);
  --if-accent-soft: #09243a;
}
```

Then expose it with a control:

```html
<button type="button" class="if-btn if-btn--secondary" data-if-theme="operations">
  Operations
</button>
```

## Accessibility Guidance

Dark mode should not simply invert colors. Keep text contrast high, preserve table borders, and keep semantic colors visually distinct. High contrast should reduce decorative shadows, thicken focus/border tokens, and preserve native forced-color behavior.

Recommended checks:

- Body text should meet WCAG AA contrast against `--if-bg-surface`.
- Muted text should remain readable in dense tables and metadata panels.
- Focus rings should be visible on buttons, table controls, graph nodes, links, and form fields.
- Semantic badges should not rely on hue alone; keep labels explicit.
- Test `data-theme="high-contrast"` and operating-system forced-colors separately.

See `docs/forced-colors.md` for the full forced-colors mapping and authoring checklist.

## Visual Smoke Page

`examples/theme-states.html` renders scoped examples for every built-in theme across buttons, badges, alerts, form controls, tables, KPI cards, metadata, and focus rings. The Playwright visual suite captures each theme section independently so downstream changes can be reviewed by theme rather than only by full page.

## Build

Themes live in source CSS and are compiled into the distributed stylesheet:

```bash
npm run theme:compile
npm run build
npm run validate
```
