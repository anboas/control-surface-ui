# Document Intelligence Production Path

Status: frozen-for-v0.1-document-intelligence-handoff.

This document freezes the framework contract for document ingestion, parser output, annotation rendering, artifact viewing, search, and reviewer handoff. It is planning and framework-package evidence only. It does not implement production parser services or production Policy MVP routes.

## Scope Boundary

| In scope | Out of scope |
| --- | --- |
| Parser-output shape, annotation shape, viewer state, adapter states, events, accessibility fallback, and downstream build guidance. | Real OCR, PDF parsing, claims models, document storage, review decisions, or live source ingestion. |
| How production services hydrate the existing `document-viewer`, `claim-tracking`, `metadata-panel`, `relationship-map`, and `search-autocomplete` components. | Replacing synthetic examples with authoritative policy facts. |
| Stable v0.1 framework behavior and experimental production-extension boundaries. | Locking the downstream product's final data model. |

## Source Of Truth Map

| Contract | Source |
| --- | --- |
| Markup, classes, data attributes, and public APIs | `docs/component-api.md` |
| Data records and adapter shapes | `docs/data-schemas.md` |
| Runtime events and telemetry | `docs/event-catalog.md` |
| Composition recipes | `docs/recipes.md` |
| Accessibility and keyboard model | `docs/accessibility.md`, `docs/keyboard.md` |
| Trusted example surface | `examples/document-viewer.html` |
| Behavior implementation | `src/js/index.js` |
| Route and MVP readiness mapping | `docs/route-component-map.md`, `docs/mvp-acceptance-checklist.md` |

## Document Intelligence Production Contract

Production parsers should normalize their output into a stable handoff object before the viewer renders. The downstream app may keep richer source-specific payloads, but the framework boundary should receive these records.

```ts
type DocumentCorpusRecord = {
  id: string;
  title: string;
  authority: string;
  source: string;
  version: string;
  publishedAt?: string;
  updatedAt?: string;
  status?: "parsed" | "review" | "stale" | "error" | string;
  artifacts: DocumentArtifactRecord[];
  parserOutput?: DocumentParserOutput;
  metadata?: Record<string, unknown>;
};

type DocumentArtifactRecord = {
  id: string;
  documentId: string;
  kind: "pdf" | "docx" | "html" | "xml" | "text" | "reconstituted" | string;
  title: string;
  url?: string;
  mimeType?: string;
  checksum?: string;
  pageCount?: number;
  lineCount?: number;
  lines?: DocumentLineRecord[];
  extractedAt?: string;
};

type DocumentLineRecord = {
  id: string;
  line: number;
  text: string;
  sectionId?: string;
  page?: number;
  categories?: Array<"claim" | "organization" | "reference" | "obligation" | "relationship" | "implementation" | "evidence" | "gap" | string>;
};

type DocumentParserOutput = {
  documentId: string;
  parserRunId: string;
  parserVersion: string;
  extractedAt: string;
  sections: DocumentSectionRecord[];
  annotations: DocumentAnnotationRecord[];
  references: DocumentReferenceRecord[];
  relationships: DocumentRelationshipRecord[];
  claims: DocumentClaimRecord[];
  obligations: DocumentObligationRecord[];
  organizations: DocumentOrganizationRecord[];
  confidence: number;
  provenance: DocumentProvenanceRecord[];
};
```

## Annotation Records

`DocumentAnnotationRecord` is the production counterpart to the existing `DocumentAnnotationSchema` emitted by `InterfaceFramework.getDocumentAnnotationSchema(mark)`.

```ts
type DocumentAnnotationRecord = {
  id: string;
  documentId: string;
  artifactId?: string;
  type: "claim" | "organization" | "reference" | "obligation" | "relationship" | "implementation" | "evidence" | "gap" | string;
  label: string;
  value: string;
  normalizedValue?: string;
  lineStart: number;
  lineEnd?: number;
  charStart?: number;
  charEnd?: number;
  confidence?: number;
  status?: "candidate" | "validated" | "rejected" | "needs-review" | string;
  sourceText?: string;
  targetId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};
```

Use these annotation types consistently:

- `claim`: extracted assertion, shall/will/must statement, finding, or candidate policy statement.
- `organization`: detected organization, office, component, or acronym expansion target.
- `reference`: external document, statute, policy, memorandum, instruction, directive, guide, or artifact reference.
- `obligation`: actor-bound requirement with due date, owner, status, or evidence expectation.
- `relationship`: implements, enables, derived from, guides, cites, supersedes, or related-to link.
- `implementation`: downstream implementation document, package, standard, control, procedure, or plan.
- `evidence`: proof source, artifact, file, source snippet, system record, or review package.
- `gap`: missing evidence, conflict, incomplete implementation, stale source, or parser uncertainty.

## Search And Highlight Contract

The viewer must preserve context. Search, authority drilldown, or annotation selection should jump to the relevant line while keeping surrounding lines visible unless the user explicitly filters to matches.

Stable behavior:

- `data-if-doc-search` updates full-text query state and emits `if:doc-search`.
- `data-if-doc-filter` switches line visibility and emits `if:doc-filter-change`.
- `data-if-doc-highlight` toggles semantic mark categories and emits `if:doc-highlight-change`.
- `data-if-doc-jump` scrolls to the nearest matching line and emits `if:doc-jump`.
- `.if-doc-mark` with `data-if-doc-annotation` selects an annotation and emits `if:doc-annotation-select`.
- `selectDocumentAnnotation(mark)` programmatically selects an annotation mark, updates sibling context, and opens the annotation inspector.
- `if:doc-annotation-panel` fires when the annotation panel is populated with type, value, expansion, mapped target, occurrences, and viewer state.

Search results should carry:

```ts
type DocumentSearchResult = {
  documentId: string;
  artifactId?: string;
  query: string;
  hits: Array<{
    line: number;
    lineId: string;
    text: string;
    ranges: Array<{ start: number; end: number }>;
    annotationIds?: string[];
  }>;
  total: number;
};
```

## References, Relationships, And Authority

Document parsing should populate references and relationships separately. A reference is a cited object. A relationship explains how the object connects.

```ts
type DocumentReferenceRecord = {
  id: string;
  documentId: string;
  citedTitle: string;
  citedId?: string;
  citedType?: "law" | "executive-order" | "directive" | "instruction" | "memo" | "guide" | "standard" | "source" | string;
  lineStart: number;
  lineEnd?: number;
  confidence?: number;
};

type DocumentRelationshipRecord = {
  id: string;
  sourceId: string;
  targetId: string;
  type: "implements" | "enables" | "derived-from" | "guides" | "references" | "supersedes" | "related-to" | string;
  evidenceAnnotationIds?: string[];
  confidence?: number;
};
```

The graph, hierarchy, and relationship-map components should consume the relationship records. The document viewer should show the citation and jump context.

## Review Workflow Handoff

Document parser output should support human review without losing extraction context.

```ts
type DocumentReviewFinding = {
  id: string;
  documentId: string;
  annotationIds: string[];
  findingType: "claim" | "obligation" | "gap" | "reference" | "organization" | string;
  title: string;
  status: "open" | "in-review" | "approved" | "rejected" | "blocked" | string;
  assignedTo?: string;
  reason?: string;
  sourceLine?: number;
  confidence?: number;
};
```

Downstream review routes should use the review-workflow, policy-diff, metadata-panel, data-table, and document-viewer components together. The framework does not own reviewer permissions, final decisions, or audit persistence.

## Adapter Contract

Document intelligence adapters should use the shared adapter lifecycle through `runAdapterTask`, `cancelAdapterTask`, and `getAdapterTaskState`.

Required states:

- `loading`: parser output or artifact data is in flight.
- `success`: corpus, artifact, annotations, and viewer state are ready.
- `empty`: no artifact, no extracted text, no search hits, or no annotations.
- `error`: parser, fetch, storage, or hydration failure.
- `cancelled`: stale query, route teardown, or user cancellation.

Recommended adapter channels:

- `documentCorpus`
- `artifactFetch`
- `documentSearch`
- `annotationSchema`
- `documentReviewFindings`

The adapter result should include enough information to hydrate `hydrateDocumentCorpus(root)`, `hydrateDocumentAnnotations(root)`, `updateDocumentSearch(viewer)`, and extracted-list panels without page-only JavaScript.

## Accessible Fallback

Spatial and annotated document surfaces must have a text-first fallback:

- Original artifact metadata is available without the embedded artifact.
- Reconstituted text is readable as lines with stable line numbers.
- CLM/ORG/REF/IMP/ENB/REL marks are keyboard focusable when interactive.
- Annotation selection updates a visible inspector or extracted-list row.
- Search result counts are available in text.
- Graph/reference previews have list equivalents.
- Escape or click-off clears focused annotation state without erasing document context.

## Stable For v0.1

- Corpus and artifact selection with `data-if-doc-workspace`, `data-if-doc-source`, and `data-if-doc-artifact`.
- Embedded, reconstituted, split, and metadata artifact modes.
- Search, filter, highlight toggles, line counts, and jump behavior.
- Annotation schema extraction through `getDocumentAnnotationSchema` and `getDocumentAnnotationSchemas`.
- Annotation select and panel events.
- Corpus and annotation hydration from static or adapter-provided fixtures.
- Accessibility guidance for annotation marks, context-preserving jumps, and extracted-list routing.

## Experimental For v0.1

- Production OCR/parser execution.
- PDF text-layer synchronization.
- Multi-artifact diffing across parser versions.
- Server-backed annotation editing.
- Automated claim validation.
- Permission-aware review queues.
- Long-document virtualization with screen-reader optimized paging.

## Downstream Agent Checklist

1. Normalize parser output to `DocumentParserOutput`.
2. Store source artifacts as `DocumentArtifactRecord` objects.
3. Normalize parser marks to `DocumentAnnotationRecord`.
4. Hydrate viewer markup or corpus fixtures before calling `InterfaceFramework.init`.
5. Register adapter channels for corpus, artifact fetch, search, annotation schema, and review findings.
6. Listen to `if:doc-*` events from `docs/event-catalog.md`.
7. Preserve context on jumps and annotation selection.
8. Provide empty, loading, error, cancelled, and success states.
9. Use extracted-list panels for claims, organizations, references, obligations, evidence, and gaps.
10. Record new gaps in `docs/github-shipping-work-items.md` instead of adding page-only behavior.

## Definition Of Done

- A production-shaped `DocumentParserOutput` can hydrate the document viewer without changing component markup.
- Search and annotation selection preserve surrounding text context.
- Review queues can link findings back to annotation ids and source lines.
- Adapter states use the shared lifecycle vocabulary.
- Accessibility fallback describes the same corpus, annotations, references, and relationships as the visual surface.
- `scripts/validate.mjs` verifies this production path and supporting handoff docs.
