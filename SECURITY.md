# Security Policy

## Supported Versions

The current supported version is the latest tagged or packaged release documented in `CHANGELOG.md`.

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| Earlier local prototypes | No |

## Reporting A Vulnerability

Do not report suspected vulnerabilities in public issues until the project is hosted and a disclosure path is confirmed.

For a GitHub-hosted repository, use GitHub Security Advisories when available. For a local handoff, report privately to the framework owner with:

- Affected version or commit.
- Affected package artifact or example page.
- Reproduction steps.
- Expected impact.
- Any known workaround.

## Security Scope

In scope:

- Package integrity, exports, CDN metadata, checksums, and release artifacts.
- Browser behavior that could leak data, break focus isolation, or bypass user intent.
- Unsafe document, diagram, graph, autocomplete, table, or export adapter behavior.
- Accessibility failures that could trap keyboard users in overlays or menus.

Out of scope for this framework repository:

- Production Policy Intelligence authorization, identity, tenant, or CUI enforcement.
- Real service credentials, accounts, or deployment infrastructure.
- Live data ingestion, parser, OCR, or AI extraction services.

## Maintainer Response

Maintainers should acknowledge a report, reproduce the issue, classify severity, and ship a fix or mitigation note. Security fixes that remove or change a public contract still require `CHANGELOG.md`, `docs/migration.md`, and `docs/deprecation-policy.md` updates when relevant.
