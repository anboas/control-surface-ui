# Design System

## Design Language

The system is built for operational intelligence products where users scan dense records, compare evidence, inspect provenance, and make review decisions. The visual style is calm, structured, and trustworthy.

Core qualities:

- White and near-white surfaces with crisp borders
- Deep navy as the primary action and selection color
- Compact typography with strong labels and muted support text
- High-signal status colors for confidence, risk, source health, and review state
- 24px outline glyphs for controls, data types, graph nodes, and workflow actions
- Multi-panel layouts for filters, tables, graph canvases, and detail drawers
- Explicit hierarchy explorers for command structures, organization relationships, authority trees, and affected-organization rollups
- Governance cards for provenance, watchlists, degraded states, agent runs, export contracts, and role-gated actions
- Clear active, selected, loading, success, empty, error, and cancelled states

## Icon Language

Use `.if-icon-slot` with `data-if-icon` for common controls and entity markers. The bundled icon registry is intentionally local so sites can run without a font, CDN, or framework dependency. Its stroke geometry is compatible with open-source outline systems such as Lucide; teams can replace or extend the registry while keeping the same slots and sizing.

Defense-domain glyphs cover policy landscapes, services, combatant commands, echelons, defense agencies, installations, mission functions, evidence/control artifacts, and seal-style authority marks. Exact official marks can be loaded as customer-provided assets when the project has the right approval and attribution context.

See `docs/icons.md` for icon extension rules, open-source pack candidates, official-mark guidance, and the searchable catalog pattern.

## Tokens

Token files live in `src/tokens/`.

- `color.css`: semantic colors, surface colors, status colors, focus color
- `typography.css`: font stacks, sizes, line heights, weights
- `spacing.css`: spacing scale, page gutter, shell widths
- `radius.css`: control, card, and pill radii
- `shadow.css`: elevation and focus shadows
- `border.css`: border widths and dividers
- `z-index.css`: layering for sticky bars, drawers, modals, and toasts
- `motion.css`: durations and easing
- `density.css`: compact, comfortable, and spacious density modes

Theme overlays live in `src/styles/themes.css`. The framework ships light, system, dark, midnight, high-contrast, calm, and executive themes. See `docs/themes.md` for the complete token contract and extension rules, `docs/forced-colors.md` for operating-system high-contrast guidance, and `docs/theme-contrast-report.md` for the generated contrast gate.

## Token Usage

Use semantic tokens in product CSS:

```css
.product-summary {
  color: var(--if-text);
  background: var(--if-bg-surface);
  border: var(--if-outline);
  border-radius: var(--if-card-radius);
}
```

Avoid binding product styles directly to raw palette tokens unless the color meaning is specific.

## Layout Principles

Use `.if-shell` as the outer application wrapper. Use `.if-topbar` for global navigation and `.if-main--with-sidebar` when a page has persistent filters or workspace navigation.

Desktop pages may combine:

- left sidebar for filters or saved views
- central content region for tables, dashboards, graph canvases, or editors
- detail region for selected records and metadata

Mobile pages collapse to one content column. Sidebars become off-canvas panels controlled by `data-if-nav-toggle`.

## Utility Principles

The utility layer closes the baseline composition gap against general-purpose frameworks without trying to become a full atomic CSS system. Use utilities for small, repeatable layout and safety needs: stack/flow rhythm, clusters, responsive grids, text truncation, overflow containment, sticky side panels, tokenized surfaces, semantic borders, responsive display, print visibility, focus rings, pointer control, and reduced-motion guards. Prefer component classes for named product patterns such as graph nodes, metadata panels, source records, claim timelines, and document viewers.

Utility additions should meet at least one of three tests: they prevent overflow in dense enterprise screens, they express a repeated layout relationship without new component CSS, or they make examples safer across mobile, print, high-contrast, and reduced-motion contexts. Avoid adding arbitrary one-off atomic classes when a component variant would communicate intent better.

## Demonstration Principles

Design-system examples should prove components under real pressure: compact density, long labels, mixed semantic states, loading/progress changes, and role-specific scenarios. Use `data-if-control-var` for live token controls and `data-if-demo-state` for reusable state presets so customization demos stay framework-level instead of one-off page scripts. A good specimen shows the component, its variants, the knobs a consuming team can adjust, and the data/behavior contract behind it.

Configurable showcases should combine several framework pieces on one surface: command rows, metadata panels, status chips, table-like records, progress indicators, and state messaging. Prefer specimen-scoped CSS variables such as `--showcase-density` over global token mutation, and use a custom state prefix like `if-showcase-state--` so operational, review, blocked, and executive examples can coexist with other demos on the same page.

Every component family should also have a reference entry in [`component-api.md`](./component-api.md) with an API table, variant matrix, and copy-paste example. When adding a component, update the design-system specimen and the API reference together so implementation, behavior, documentation, and examples stay aligned.

## Information Density

Use `data-density="compact"` for highly operational review queues and source control consoles. Use `comfortable` for default policy browsing. Use `spacious` when the interface is more presentation-oriented.

## Public Website Language

Adam Boas Consulting pages use the same navy, blue, green, and neutral token family as the policy product, but with a clearer editorial hierarchy: large first-screen statements, service rows, engagement packages, public-site search, attribution strips, resume timelines, profile media modules, publication cards, reference architecture loops, contact forms, and stats bands. Use `.if-site-shell`, `.if-site-container`, `.if-site-nav`, `.if-site-hero`, `.if-profile-media`, `.if-publication-card`, `.if-reference-loop`, `.if-engagement-package`, `.if-public-search`, `.if-attribution-strip`, `.if-service-card`, `.if-resume-timeline`, `.if-insight-card`, and `.if-contact-grid` when building the public site.

Keep the public-site side restrained and direct: strong headline, concise body copy, small badges, crisp borders, limited shadow, and consistent button/action placement. The consulting patterns are intended for homepage, services, experience/resume, profile, blog index/post, and contact pages.

## Source-Aware Data Language

The policy product examples include synthetic ingest data modeled on the Azure deployment architecture: external source adapters, ingestion and extraction, agent processing, data/search/knowledge stores, and experience surfaces. Use `.if-ingest-flow`, `.if-ingest-stage`, `.if-source-card`, and `.if-relationship-bundle` to explain how source records become extracted intelligence, graph links, obligations, events, opportunities, and review findings.

Synthetic source examples cover Federal Register, GovInfo/Congress.gov, DoD Issuances, Navy directives, OMB memoranda, NIST publications, CISA alerts, and restricted repositories. These examples are illustrative and designed to exercise the UI framework; replace them with real adapter outputs in production.

## Governance And Operations Language

The framework treats operational trust as visible UI, not hidden metadata. Use provenance ledgers to show who or what produced a result; alert-rule cards for watchlists, digest fatigue, quiet hours, and escalation; state stacks for access denied, stale, degraded, and parser failure conditions; agent run cards for model/prompt/evaluation metadata; impact chains for policy-to-action context; and contract cards for API or export schema guarantees.

## Accessibility

The framework uses native controls, ARIA tabs, keyboard-accessible modals, focus-visible outlines, and semantic table markup. When extending components, preserve labels, button text or `aria-label`, and visible focus states.
