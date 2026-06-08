# Policy Intelligence Data Definition

This definition turns the product/design documents, deployment architecture, and full ERD into a buildable storage and visualization contract for policy and governance intelligence.

## North Star

Policy Intelligence should store policy as an authority graph, not as a pile of documents. The canonical system separates source, raw artifact, logical governance artifact, version, section, citation, relationship, obligation, deadline, finding, review decision, and export. The UI, search index, graph view, alerts, and APIs are all derived from the same canonical data contracts.

Core rules:

- PostgreSQL is the canonical store for governed entities, relationships, review state, agent runs, and exports.
- Blob storage keeps immutable raw artifacts, parsed text, locator maps, snapshots, and generated export files.
- Azure AI Search stores rebuildable keyword, semantic, vector, facet, and retrieval fields.
- Graph views are derived from canonical relationships in MVP. A dedicated graph database is a later benchmark decision.
- Every inferred relationship, obligation, impact claim, gap, or risk must carry evidence, confidence, trust label, creator, and review state.

## Source Hierarchy

| Layer | Source families | What they contain | Canonical objects |
| --- | --- | --- | --- |
| Statutory and legal | GovInfo, Congress.gov | Public laws, bills, committee reports, Congressional Record, U.S. Code packages | `GovernanceArtifact`, `ArtifactVersion`, `Citation`, `ArtifactLifecycleEvent`, `Organization` |
| Presidential and executive | Federal Register, White House Presidential Actions | Executive orders, presidential memoranda, proclamations, official publication metadata | `GovernanceArtifact`, `Obligation`, `Deadline`, `ArtifactLifecycleEvent` |
| Government-wide policy and regulation | eCFR, OMB, NIST CSRC, CISA, FAR, DFARS, FedRAMP | Regulations, memoranda, standards, directives, acquisition rules, authorization package guidance | `GovernanceArtifact`, `ArtifactSection`, `TaxonomyTerm`, `CapabilityArea`, `Obligation` |
| Department-level defense | DoD/WHS issuances | Directives, instructions, manuals, DTMs, administrative instructions, secretary memoranda | `GovernanceArtifact`, `PolicyRoleAssignment`, `ArtifactApplicability`, `Citation` |
| Service and component | Navy, Army, Air Force, Space Force, Marine Corps, DISA, DHA, DCSA, DCMA, CJCS | Service/component implementation policy and procedural guidance | `GovernanceArtifact`, `Organization`, `Program`, `ArtifactApplicability` |
| Program and implementation | RMF authorization packages, SSP control narratives, SARs, POA&Ms, ADDs, STIG checklists, configuration baselines, connection packages, SOPs, reference architectures, internal repositories | Evidence, implementation plans, review packages, local operating procedures, accepted risk records | `ImplementationEvidence`, `Finding`, `ReviewTask`, `AccessGrant` |
| Downstream intelligence | SAM.gov, Grants.gov, Events Intelligence, Opportunities Intelligence | Contract opportunities, grants, awards, events, agenda signals, market movement | `Opportunity`, `Event`, `CrossSurfaceLink`, `TrendMetric`, `Insight` |

## Source Expansion Notes

- GovInfo provides machine-readable package and granule structures, plus content and metadata files such as PDF, HTM, XML, MODS, PREMIS, and ZIP. This maps cleanly to `RawArtifact`, `ArtifactVersion`, `ArtifactSection`, and `EvidenceLocator`. Source: [GovInfo API](https://www.govinfo.gov/features/api).
- Congress.gov API exposes bill/law identifiers, actions, sponsors, committees, related bills, text versions, and update dates. Use it for legislative lifecycle and identity resolution, then reconcile authenticated packages through GovInfo when available. Source: [Library of Congress API docs](https://github.com/LibraryOfCongress/api.congress.gov/blob/main/Documentation/BillEndpoint.md).
- Federal Register is the official publication bridge for rules, proposed rules, notices, and presidential documents. Use document number, citation, publication date, docket IDs, RINs, CFR references, effective dates, comment deadlines, and EO numbers. Source: [FederalRegister.gov API](https://www.federalregister.gov/developers/api/v1).
- Regulations.gov connects rulemaking documents to dockets, comments, supporting materials, and attachments through document/comment/docket APIs. Source: [GSA Regulations.gov API](https://open.gsa.gov/api/regulationsgov/).
- OMB memoranda are high-value implementation guidance, often connecting executive direction to agency action, acquisition policy, technology governance, and deadlines. Source: [OMB Memoranda](https://www.whitehouse.gov/omb/information-resources/guidance/memoranda/).
- FAR and DFARS on Acquisition.gov provide downloadable regulation parts/subparts in multiple formats and are important for clause, requirement, and opportunity crosswalks. Sources: [FAR](https://www.acquisition.gov/browse/index/far?frame=0), [DFARS](https://login.acquisition.gov/dfars).
- FedRAMP guidance provides implementation evidence structures such as SSP, SAP, SAR, POA&M, and ATO package expectations. Source: [FedRAMP authorization package guidance](https://www.fedramp.gov/docs/rev5/playbook/csp/authorization/what/).
- DoD RMF and DISA implementation sources suggest the lower layer should be modeled as an artifact bundle rather than a generic "network statement": security plan/control narratives, security assessment reports, POA&Ms, authorization decisions, STIG/configuration artifacts, topology/connection records, and local SOPs.
- SAM.gov and Grants.gov are downstream intelligence sources, not authority sources. They validate market movement and implementation demand. Sources: [SAM.gov opportunities](https://sam.gov/content/opportunities), [Grants.gov API](https://www.grants.gov/api/api-guide).

## Decomposition Contract

| Stage | Outputs | Extracted fields | Gate |
| --- | --- | --- | --- |
| Monitor | `SourceRun`, `FreshnessSnapshot` | Source listing status, added/changed/removed links, health, freshness lag | Endpoint reachable and source cadence recorded |
| Fetch | `FetchJob`, `RawArtifact` | Raw bytes, URI, hash, MIME type, size, retrieval time | Immutable blob stored and hash present |
| Parse | `ParsedArtifact`, `ArtifactSection`, `ReferenceEntry` | Text, tables, sections, metadata, dates, citations, page/paragraph/line locators | Parser confidence above threshold or review task created |
| Normalize | `GovernanceArtifact`, `Organization`, `ArtifactIdentifier`, `TaxonomyTerm` | Document type, canonical ID, publisher, status, authority layer, topic tags | Required canonical fields valid |
| Resolve identity | `GovernanceArtifact`, `ArtifactVersion`, `ArtifactAlias` | Logical family, version, duplicates, aliases, current version | Ambiguous identity held for review |
| Link | `Citation`, `CitationResolution`, `EntityRelationship`, `Obligation`, `Deadline`, `CrossSurfaceLink` | Citations, lifecycle statements, authority edges, actor/action/object, deadlines, market links | Every edge has evidence, score, trust label, creator, review state |
| Score | `ConfidenceAssessment`, `ReviewState`, `ImpactAssessment` | Source, identity, parser, citation, relationship, freshness, and review confidence | Composite dimensions stored |
| Review gate | `ReviewTask`, `ReviewDecision`, `WorkItem`, `AuditLog` | Reason, assignee, decision, rationale, correction, publishability | High-impact or inferred output reviewed or held |
| Index/publish | `SearchDocument`, `GraphSnapshot`, `ExportJob`, `Notification` | Facets, embeddings, graph neighborhood, export manifest, watchlist event | Schema version, provenance, freshness, deterministic order included |

## Core Entity Definitions

### `SourceRegistry`

Registered source family or candidate source.

Key fields: `source_id`, `tenant_id`, `name`, `owner_org_id`, `source_tier`, `access_mode`, `legal_status`, `update_frequency`, `freshness_sla`, `health_state`, `parser_strategy`, `onboarding_state`.

Stores: source trust, cadence, ownership, parser expectations, and publication rules.

### `RawArtifact`

Immutable payload exactly as received from a source.

Key fields: `raw_artifact_id`, `fetch_job_id`, `source_id`, `blob_uri`, `source_uri`, `content_hash`, `mime_type`, `size_bytes`, `retrieved_at`, `classification_hint`.

Stores: reproducible source material and provenance anchor.

### `GovernanceArtifact`

Logical policy/directive/guidance item independent of a specific issue or file.

Key fields: `artifact_id`, `object_id`, `canonical_id`, `artifact_kind`, `title`, `short_title`, `status`, `authority_level`, `publisher_org_id`, `current_version_id`, `source_of_truth_id`, `summary`, `first_seen_at`.

Stores: canonical identity, authority placement, current status, publisher, and summary.

### `ArtifactVersion`

Specific issue, revision, change package, or publication of a governance artifact.

Key fields: `version_id`, `artifact_id`, `version_label`, `issue_date`, `effective_date`, `expiration_date`, `publication_date`, `content_hash`, `source_url`, `artifact_url`, `parser_version`, `is_current`.

Stores: version history, date semantics, source file identity, and current-state logic.

### `ArtifactSection`

Addressable section, paragraph, table, appendix, or clause.

Key fields: `section_id`, `version_id`, `section_path`, `heading`, `level`, `ordinal`, `locator`, `page_start`, `page_end`, `text_hash`, `token_count`, `extraction_confidence`.

Stores: retrieval unit, citation target, obligation source, and evidence locator target.

### `Citation` and `CitationResolution`

`Citation` stores raw and normalized citation text. `CitationResolution` stores one or more target candidates.

Key fields: `citation_id`, `section_id`, `raw_text`, `citation_scheme`, `normalized_value`, `target_object_id`, `match_method`, `confidence_score`, `review_state`.

Stores: exact references, authority links, crosswalks, and relationship candidates.

### `EntityRelationship`

Canonical graph edge between any two graphable objects.

Key fields: `relationship_id`, `source_object_id`, `target_object_id`, `relationship_type_id`, `direction`, `trust_label`, `confidence_score`, `review_state`, `created_by_actor`, `evidence_locator_id`, `valid_from`, `valid_to`.

Stores: direct, inferred, and reviewed edges used by graph, lineage, impact, search, and exports.

### `Obligation`

Extracted actor/action/object/modal statement.

Key fields: `obligation_id`, `object_id`, `section_id`, `actor`, `action`, `object`, `modality`, `condition_text`, `applicability_scope`, `confidence_score`, `review_state`.

Stores: actionable requirement candidates and compliance/implementation work.

### `Deadline`

Absolute or relative timing constraint.

Key fields: `deadline_id`, `object_id`, `obligation_id`, `due_date`, `relative_rule`, `anchor_event`, `status`, `severity`, `evidence_id`, `review_state`.

Stores: calendarable commitments, expiration windows, review cycles, comment windows, response deadlines, and remediation deadlines.

### `Finding`

Reviewable gap, risk, conflict, stale-reference, lifecycle, or impact finding.

Key fields: `finding_id`, `object_id`, `finding_type`, `severity`, `status`, `bounded_claim_text`, `confidence_score`, `risk_score`, `assigned_reviewer`, `decision_state`.

Stores: safe, bounded intelligence claims that can be approved, rejected, edited, escalated, or converted into work.

### `CrossSurfaceLink`

Policy-to-event, policy-to-opportunity, policy-to-program, or evidence-to-policy link.

Key fields: `cross_link_id`, `source_object_id`, `target_object_id`, `link_reason`, `relationship_type_id`, `confidence_score`, `trust_label`, `evidence_id`, `review_state`.

Stores: bridge from Policy Intelligence to Events Intelligence and Opportunities Intelligence.

### `ReviewTask` and `ReviewDecision`

Human validation workflow.

Key fields: `review_task_id`, `object_id`, `relationship_id`, `reason`, `assigned_to`, `due_at`, `priority`, `status`, `decision`, `rationale`, `decision_at`.

Stores: human-in-the-loop governance, reviewer accountability, and auditability.

### `AgentDefinition` and `AgentRun`

Controlled automation declaration and execution records.

Key fields: `agent_id`, `mission`, `inputs`, `outputs`, `publication_rules`, `guardrails`, `agent_run_id`, `input_scope`, `status`, `cost`, `latency_ms`, `metrics_json`, `output_hash`.

Stores: reproducible automation with model/rule/prompt versioning, budgets, and evaluation hooks.

## Relationship Ontology

| Class | Edge types | Publish rule |
| --- | --- | --- |
| Authority | `derives_authority_from`, `implements`, `interprets`, `delegates_authority_to`, `establishes_policy_for` | Direct evidence may publish after checks; inferred authority requires review |
| Lifecycle | `supersedes`, `cancels`, `rescinds`, `reissues`, `amends`, `extends`, `expires_on`, `replaces` | Always high-review priority |
| Citation | `cites`, `references`, `incorporates_by_reference`, `uses_definition_from`, `crosswalks_to` | Exact unambiguous citations may auto-publish |
| Scope and responsibility | `applies_to`, `assigns_responsibility_to`, `requires_action_by`, `sets_deadline_for`, `targets_role` | Requires confidence, locator, and review threshold |
| Market and impact | `drives_event`, `drives_opportunity`, `signals_capability_demand`, `maps_to_program`, `supports_budget_priority` | Default inferred unless the downstream object explicitly cites the policy |
| Risk and gap | `conflicts_with`, `overlaps_with`, `missing_implementation_evidence`, `obsolete_reference`, `stale_downstream_guidance` | Always reviewable before trusted publication |

## Confidence Dimensions

Do not store only a single model score. Store component dimensions:

- Source confidence: officiality, trust tier, legal status, freshness.
- Identity confidence: identifier, title, publisher, version, duplicate/alias quality.
- Parser confidence: text extraction, section detection, OCR, date extraction, locator quality.
- Citation confidence: exact match, reference-list match, inline citation, semantic match.
- Relationship confidence: direct evidence, evidence specificity, rule/model version, review status.
- Freshness confidence: last successful source check, update cadence, run failures.
- Review confidence: human-confirmed decision, reviewer role, rationale, decision date.

## API and Export Contract

Every API response and export should include:

- `schema_version`
- `generated_at`
- `freshness`
- `source_provenance`
- `classification`
- `trust_label`
- deterministic ordering
- evidence locators for claims, edges, obligations, gaps, and insights

MVP endpoints:

- `GET /policy/documents`
- `GET /policy/documents/{id}`
- `GET /policy/documents/{id}/versions`
- `GET /policy/documents/{id}/lineage`
- `GET /policy/documents/{id}/graph`
- `GET /policy/relationships`
- `GET /policy/obligations`
- `GET /policy/freshness`
- `GET /policy/health`
- `GET /policy/export/{kind}`
- `GET /events/{id}/policy`
- `GET /opportunities/{id}/policy`

## MVP Storage Shape

Use relational tables for identity and governance:

- `source_registry`, `source_endpoint`, `source_run`, `fetch_job`, `raw_artifact`, `parsed_artifact`, `parser_profile`
- `intelligence_object`, `governance_artifact`, `artifact_version`, `artifact_section`, `artifact_identifier`, `artifact_alias`, `artifact_lifecycle_event`
- `organization`, `organization_alias`, `policy_role_assignment`, `artifact_applicability`, `capability_area`, `taxonomy_term`
- `citation`, `citation_resolution`, `relationship_type`, `entity_relationship`, `relationship_evidence`, `evidence_locator`
- `obligation`, `obligation_party`, `obligation_condition`, `deadline`, `implementation_evidence`
- `finding`, `finding_evidence`, `insight`, `impact_assessment`, `confidence_assessment`
- `event`, `event_session`, `opportunity`, `opportunity_version`, `opportunity_requirement`, `cross_surface_link`
- `review_task`, `review_decision`, `work_item`, `agent_definition`, `agent_version`, `agent_run`, `agent_output`, `api_contract`, `export_job`, `export_manifest`

## Guarded Content

Restricted/CUI candidate flows must be separated from public flows:

- Store source metadata and access classification even if content is not publishable.
- Preserve raw artifacts only in guarded storage with role-aware access grants.
- Never export restricted text unless compliance/releasability gates pass.
- Allow metadata-only graph nodes when content is not releasable.
- Audit every restricted access, parse, review, export, and permission change.

## UI Representation

The example page at `examples/policy-data-model.html` visualizes the same definition as:

- source hierarchy
- canonical entity groups
- relationship ontology
- decomposition pipeline
- source-to-object mapping table
- storage mapping
- sample graph

The source of truth for that page is `examples/data/policy-data-model.json`.
