# Icon System

The framework ships a dependency-free SVG icon registry hydrated by the JavaScript behavior layer. Use it for controls, entity markers, graph nodes, source records, policy artifacts, architecture diagrams, and review states.

When a surface needs an approved image mark instead of a registry glyph, use the adjacent asset-slot contract. Asset slots hydrate SVG, PNG, JPG, WebP, AVIF, GIF, blob URLs, and `data:image` URIs with framework-managed sizing, object-fit, load/error state, and fallback icons.

## Usage

```html
<span class="if-icon-slot" data-if-icon="search" aria-hidden="true"></span>
<span class="if-icon-slot" data-if-icon="departmentOfWar" aria-hidden="true"></span>
<span class="if-icon-slot" data-if-icon="obligation" aria-hidden="true"></span>
<span class="if-asset-slot if-asset-slot--brand"
  data-if-asset="/approved-assets/service-mark.svg"
  data-if-asset-alt="Service mark"
  data-if-asset-fallback-icon="shield"></span>
```

Icons inherit `currentColor`, use a `24x24` viewbox, and are designed to fit in buttons, badges, graph nodes, metadata rows, and dense tables.

## First-Party Glyphs

Prefer first-party framework glyphs for policy-intelligence concepts:

- Federal and policy sources: `federalRegister`, `congress`, `omb`, `nist`, `cisa`, `whs`
- Defense and organization entities: `departmentOfWar`, `dod`, `department`, `defenseAgency`, `combatantCommand`, `army`, `navy`, `marineCorps`, `airForce`, `spaceForce`, `coastGuard`, `nationalGuard`
- Seal-style authority marks: `sealDod`, `sealDepartmentOfWar`, `sealArmy`, `sealNavy`, `sealMarineCorps`, `sealAirForce`, `sealSpaceForce`, `sealCoastGuard`, `sealNationalGuard`, `sealCisa`, `sealDisa`, `sealNsa`, `sealNist`, `sealFederalRegister`, `sealCongress`, `sealSecnav`
- Issuance and artifact types: `law`, `statute`, `directive`, `instruction`, `memo`, `policy`, `artifact`, `source`
- Decomposition outputs: `claim`, `lineItem`, `obligation`, `implementation`, `reference`, `supersession`, `parser`, `evidence`
- Operational concepts: `authorization`, `baseline`, `controlMap`, `rmf`, `waiver`, `mission`, `cyber`, `logistics`, `operations`, `personnel`

These are first-party framework glyphs, including a seal-style domain family for official-feeling authority cues. They are suitable for product UI, provenance, graph nodes, hierarchy branches, and architecture diagrams.

## Creating Custom Glyphs

Create framework glyphs as tiny SVG path fragments in `src/js/index.js`. Each glyph should fit a `24x24` viewBox, use outline geometry, inherit `currentColor`, and avoid fills unless the component explicitly needs a filled mark.

Recommended process:

1. Pick a symbolic concept and draw it at framework scale. For example, the Navy glyph uses an anchor and hull arc; the Space Force glyph uses a delta and orbit arcs; seal-style variants add a double circular ring around the same domain cue.
2. Draw with a small number of primitives: `path`, `circle`, `rect`, `polyline`, and `line`.
3. Keep visual weight consistent with the registry: 2px stroke, rounded line caps and joins, no tiny decorative details.
4. Test at 16px, 20px, 24px, and inside dense table cells and graph nodes.
5. Add the icon name to any relevant catalog category helper, then show it in `examples/components.html`.

Example:

```js
iconPaths.navy = "<circle cx='12' cy='5' r='3'></circle><path d='M12 8v13'></path>...";
```

Use this approach for defense-domain glyphs such as `army`, `navy`, `marineCorps`, `airForce`, `spaceForce`, and their `seal*` variants. Seal-style marks carry more internal detail than normal toolbar icons, so render them at a larger optical size when identity matters. Prefer `.if-domain-seal-card`, `.if-seal-glyph-card__icon`, or an equivalent 2.25rem+ icon slot; avoid using seal marks in the smallest icon-button footprint unless the label is already obvious. If a project needs exact official source artwork, load those approved image assets through the official-mark slot while keeping the registry API consistent.

## Open-Source Packs

Good candidates for extension:

- Lucide: ISC license, close visual match to the framework's 24px outline style.
- Tabler Icons: MIT license, very large outline set with strong coverage.
- Heroicons: MIT license, polished but less domain-specific.
- Bootstrap Icons: MIT license, broad utility set with a slightly different visual voice.

Adopt open-source icons selectively. Normalize stroke width, corner radius, and optical size before adding them to the registry so the UI does not drift into mixed icon styles.

## Official Marks

The framework includes seal-style first-party glyphs for common defense and policy sources. Exact official seals and insignia can also be loaded as project assets when the implementation has the right approval, attribution, and context.

Recommended pattern:

```html
<span class="if-asset-slot if-asset-slot--xl"
  data-if-asset="/approved-assets/navy-seal.svg"
  data-if-asset-alt="Department of the Navy"
  data-if-asset-fit="contain"
  data-if-asset-fallback-icon="sealNavy"></span>
```

Use `.if-icon-slot` for registry glyphs and `.if-asset-slot[data-if-asset]` for exact image assets. Both occupy the same optical footprint, so a surface can start with `sealNavy` and later swap to an approved seal asset without redesigning the surrounding component. For PNG/PDF export, prefer same-origin, blob, or data URI assets; cross-origin assets need CORS or `data-if-asset-export="false"` so the fallback icon is used safely.

## Catalog

The design-system page includes:

```html
<input data-if-icon-catalog-filter>
<div class="if-icon-catalog" data-if-icon-catalog></div>
```

The catalog is generated from the real registry, can be filtered by name or category, and clicking a swatch copies the recommended markup snippet.
