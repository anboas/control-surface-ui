# AdamBoas.com Public-Site Handoff

Status: `frozen-for-v0.1-public-site-handoff`

This document is the public-site buildout contract for a downstream agent rebuilding AdamBoas.com with the Control Surface UI. It is planning and handoff scope only. Do not implement the production public site in this framework repository.

## Source Of Truth

Use these artifacts in order:

1. `docs/public-site-handoff.md` for AdamBoas.com route, content, adapter, and acceptance contracts.
2. `starters/adamboas-plain-html` or `starters/adamboas-vite` for package-only starter wiring.
3. `examples/adamboas.html` for current public-site composition using the framework.
4. `examples/consulting.html` for consulting, services, profile, resume, insights, contact, and public search patterns.
5. `docs/recipes.md#public-consulting-page` and `docs/recipes.md#public-site-search` for component recipes.
6. `docs/component-manifest.json` for stable component ids.
7. `docs/component-api.md` and `docs/event-catalog.md` for classes, data attributes, JavaScript APIs, and events.

## Route Contracts

| Route | Job | Primary components | Data contracts | Required states | Trusted examples |
| --- | --- | --- | --- | --- | --- |
| Homepage `/` | Introduce Adam Boas, primary offer, proof points, recent work, and contact path. | `public-site-patterns`, `topbar-utility-cluster`, `kpi-metrics`, `cards-panels`, `attribution-strip` | `PublicSiteProfile`, `PublicSiteService[]`, `PublicSiteInsightPost[]`, `PublicSiteAttributionRecord[]` | hero ready, insights loading/empty/error/success, contact CTA ready | `examples/adamboas.html`, `examples/consulting.html` |
| Services `/services` | Explain service lines, engagement packages, differentiators, and conversion actions. | `public-site-patterns`, `service-card`, `engagement-package`, `cards-panels`, `wizard-stepper` | `PublicSiteService[]`, `PublicSiteEngagementPackage[]` | category filter, selected package, empty package set | `examples/consulting.html` |
| Profile `/profile` | Present professional biography, focus areas, credentials, public links, and media attribution. | `profile-media`, `metadata-panel`, `chips-badges`, `attribution-strip`, `cards-panels` | `PublicSiteProfile`, `PublicSiteCredential[]`, `PublicSiteAttributionRecord[]` | image loaded/fallback, credential empty, attribution ready | `examples/adamboas.html`, `examples/profile-patterns.html` |
| Resume `/resume` or `/experience` | Show role timeline, education, certifications, downloadable artifact slot, and capability tags. | `resume-timeline`, `timeline`, `metadata-panel`, `upload-download-action`, `attribution-strip` | `PublicSiteResumeRole[]`, `PublicSiteCredential[]`, `PublicSiteArtifactRef` | timeline filter, artifact unavailable, downloadable artifact ready | `examples/adamboas.html`, `examples/consulting.html` |
| Insights `/insights` | List posts, papers, reference architectures, and articles with filters and search. | `publication-card`, `public-site-search`, `search-autocomplete`, `chips-badges`, `empty-loading-error` | `PublicSiteInsightPost[]`, `PublicSiteSearchRecord[]` | search loading/empty/error/success, filter selected | `examples/adamboas.html`, `examples/consulting.html` |
| Insight detail `/insights/:slug` | Render a single article with source notes, related posts, canonical links, and reference loop. | `publication-card`, `reference-loop`, `attribution-strip`, `metadata-panel`, `cards-panels` | `PublicSiteInsightPost`, `PublicSiteReferenceLoopStep[]`, `PublicSiteAttributionRecord[]` | article found, article missing, references empty | `examples/adamboas.html` |
| Contact `/contact` | Capture a contact request and show alternate channels and availability context. | `contact-grid`, `form-validation`, `alerts`, `metadata-panel`, `state-variants` | `PublicSiteContactRequest`, `PublicSiteContactChannel[]` | invalid, submitting, success, error, cancelled | `examples/consulting.html` |
| Attribution `/attribution` | Disclose sources, media credits, licenses, version dates, and editorial review status. | `attribution-strip`, `metadata-panel`, `data-table`, `cards-panels` | `PublicSiteAttributionRecord[]` | no credits, filtered results, external link | `examples/adamboas.html`, `examples/consulting.html` |
| Reference Loop `/reference-loop` | Explain authority, evidence, review, publication, and learning loops for public-facing artifacts. | `reference-loop`, `relationship-map`, `architecture-diagram`, `metadata-panel` | `PublicSiteReferenceLoopStep[]`, `PublicSiteSearchRecord[]` | step selected, loop empty, diagram fallback | `examples/adamboas.html`, `examples/diagrams.html` |
| Public Search `/search` | Search public posts, services, profile facts, and reference-loop artifacts. | `public-site-search`, `search-autocomplete`, `data-table`, `empty-loading-error` | `PublicSiteSearchRecord[]`, `PublicSearchAdapterRequest`, `PublicSearchAdapterResult` | loading, empty, error, cancelled, success | `examples/consulting.html`, `docs/recipes.md#public-site-search` |

## Component Selection Guide

| Need | Choose this | Notes |
| --- | --- | --- |
| Public shell and navigation | `public-site-patterns`, `.if-site-shell`, `.if-site-container` | Use the site shell, not the internal `.if-shell`, unless embedding a product demo. |
| Hero and offer framing | `.if-site-hero`, `.if-site-heading`, `.if-site-eyebrow` | Keep first viewport direct and product/person specific. |
| Services | `.if-service-card`, `.if-engagement-package` | Use cards for repeated service/package units only. |
| Profile and media | `.if-profile-media`, `.if-profile-card`, `.if-profile-grid` | Include image fallback and attribution. |
| Resume and experience | `.if-resume-timeline`, `.if-resume-item` | Roles should include organization, date range, title, summary, and tags. |
| Writing and insights | `.if-publication-card`, `.if-insight-card` | Cards should expose title, date, category, excerpt, tags, and canonical link. |
| Public search | `.if-public-search`, `data-if-public-search`, `data-if-autocomplete` | Use adapter-backed suggestions for large indexes. |
| Contact | `.if-contact-grid`, `.if-form-field`, `.if-alert`, `.if-error-summary` | Contact submission must use validation and adapter states. |
| Attribution and source notes | `.if-attribution-strip`, `.if-metadata-panel` | Every third-party or customer-provided image/source gets a record. |
| Reference architecture loops | `.if-reference-loop`, `.if-relationship-map`, `.if-diagram-*` | Use diagram components only when nodes/details/search/export are needed. |

## Content Schemas

Use these shapes for mock fixtures and production adapters. Additional fields are allowed when namespaced by the app, but these fields should not be renamed.

```ts
type PublicSiteProfile = {
  id: string;
  name: string;
  headline: string;
  summary: string;
  location?: string;
  focusAreas: string[];
  links: Array<{ label: string; href: string; type: "email" | "linkedin" | "website" | "download" | string }>;
  image?: PublicSiteArtifactRef;
  attributionIds?: string[];
};

type PublicSiteService = {
  id: string;
  title: string;
  summary: string;
  outcomes: string[];
  category: "policy" | "strategy" | "governance" | "architecture" | "delivery" | string;
  cta?: { label: string; href: string };
};

type PublicSiteEngagementPackage = {
  id: string;
  title: string;
  duration: string;
  audience: string;
  deliverables: string[];
  entryCriteria?: string[];
};

type PublicSiteInsightPost = {
  id: string;
  slug: string;
  title: string;
  deck?: string;
  summary: string;
  publishedAt: string;
  updatedAt?: string;
  category: "article" | "reference-architecture" | "brief" | "case-study" | string;
  tags: string[];
  href: string;
  attributionIds?: string[];
  relatedIds?: string[];
};

type PublicSiteResumeRole = {
  id: string;
  organization: string;
  title: string;
  start: string;
  end?: string;
  summary: string;
  tags: string[];
  publicSafe: boolean;
};

type PublicSiteContactRequest = {
  name: string;
  email: string;
  organization?: string;
  topic?: string;
  message: string;
  consent: boolean;
};

type PublicSiteAttributionRecord = {
  id: string;
  label: string;
  source: string;
  href?: string;
  license?: string;
  owner?: string;
  verifiedAt?: string;
  usage: "image" | "quote" | "data" | "link" | "resume" | string;
};

type PublicSiteSearchRecord = {
  id: string;
  title: string;
  summary: string;
  category: "profile" | "service" | "insight" | "resume" | "reference-loop" | "contact" | string;
  href: string;
  tags: string[];
  body?: string;
  updatedAt?: string;
};

type PublicSiteArtifactRef = {
  id: string;
  src: string;
  alt: string;
  mimeType: string;
  width?: number;
  height?: number;
  attributionId?: string;
};
```

## Adapter Contracts

All public-site adapters follow the shared adapter lifecycle: `loading`, `success`, `empty`, `error`, and `cancelled`. Async adapters must accept an `AbortSignal`.

| Adapter | Request | Result | Events |
| --- | --- | --- | --- |
| `profileContentAdapter` | `{ route: "homepage" | "profile" | "resume", signal }` | `{ profile, roles, credentials, attribution }` | `if:adapter-state`, `if:public-content-load` |
| `servicesContentAdapter` | `{ category?, signal }` | `{ services, packages }` | `if:adapter-state`, `if:public-services-load` |
| `insightIndexAdapter` | `{ query?, category?, tags?, limit?, signal }` | `{ records, total, facets }` | `if:public-search`, `if:autocomplete-results`, `if:adapter-state` |
| `publicSearchAdapter` | `{ query, filters, limit, signal }` | `{ records, total, highlights, suggestions }` | `if:autocomplete-request`, `if:autocomplete-results`, `if:public-search` |
| `contactSubmitAdapter` | `{ request: PublicSiteContactRequest, signal }` | `{ id, status: "received" | "queued", message }` | `if:field-validate`, `if:adapter-state`, `if:form-submit` |
| `attributionAdapter` | `{ ids?, usage?, signal }` | `{ records }` | `if:adapter-state` |

### Public Search Example

```js
InterfaceFramework.registerAutocompleteAdapter("publicSearchAdapter", async (request) => {
  const response = await fetch(`/api/public-search?q=${encodeURIComponent(request.query)}`, {
    signal: request.signal
  });
  if (!response.ok) throw new Error("Search failed");
  return response.json();
});
```

## Build Order For The Next Agent

1. Start from `starters/adamboas-vite` for a routed app or `starters/adamboas-plain-html` for a no-build site.
2. Add the site shell, route navigation, footer, account/theme controls if needed, and attribution policy.
3. Build Homepage from `PublicSiteProfile`, `PublicSiteService[]`, and latest `PublicSiteInsightPost[]`.
4. Build Services and Engagement Packages.
5. Build Profile and Resume from profile, credential, and role fixtures.
6. Build Insights list, then Insight detail pages.
7. Build Contact with `contactSubmitAdapter`, validation states, and error summaries.
8. Build Attribution and Reference Loop pages.
9. Add Public Search once content fixtures exist.
10. Run downstream visual, accessibility, and package smoke checks before replacing fixtures with CMS or API data.

## Acceptance Checklist

- AdamBoas.com buildout can start from `starters/adamboas-plain-html` or `starters/adamboas-vite` without copying framework source files.
- Each public route above has a route job, primary components, content schema, adapter expectation, and trusted example.
- `PublicSiteInsightPost`, `PublicSiteContactRequest`, `PublicSiteSearchRecord`, and attribution records are represented before production CMS integration.
- `publicSearchAdapter` and `contactSubmitAdapter` support loading, empty, error, cancelled, retry where applicable, and success states.
- Examples load from package `dist` assets or package imports, not from React or a heavy UI framework.
- Accessibility checks cover navigation landmarks, forms, search suggestions, focus order, skip links, and mobile nav.
- Any official seal, headshot, image, or third-party media has an attribution record or downstream legal approval note.

## Known Downstream Gaps

- Production CMS, content storage, email routing, spam defense, analytics, and deployment rules are app-owned.
- Legal review for official seals, customer marks, and public profile facts is app-owned.
- SEO metadata, sitemap generation, RSS feeds, and social preview images are app-owned, though the framework provides layout and attribution primitives.
- Any private resume data must be filtered before it enters `PublicSiteResumeRole` fixtures.
