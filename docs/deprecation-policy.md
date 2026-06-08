# Deprecation Policy

Deprecation rules protect downstream teams from surprising class, token, data-attribute, event, and JavaScript API removals.

## Versioning Model

The framework follows semantic versioning:

- Patch releases fix bugs without changing public contracts.
- Minor releases may add components, variants, events, tokens, and optional behavior.
- Major releases may remove previously deprecated public contracts or make breaking behavioral changes.

## Public Contracts

These are considered public once documented or used in examples:

- component classes
- CSS custom properties and theme tokens
- data attributes
- JavaScript APIs exported from `window.InterfaceFramework` or the ESM entry
- custom event names and payload shapes
- package export paths
- documented data schemas

## Deprecation Lifecycle

| Stage | Requirement |
| --- | --- |
| Announce | Add changelog, migration note, and replacement guidance. |
| Warn | Add documentation warnings and non-breaking runtime notices where practical. |
| Support | Keep the deprecated contract working through at least one minor release. |
| Remove | Remove only in a major release unless the contract is unsafe or broken by platform changes. |

## Replacement Guidance

Every deprecation must include:

- deprecated contract name
- replacement contract
- reason
- first deprecated version
- earliest removal version
- example before/after markup or API usage when applicable

## Runtime Warnings

Runtime warnings should be low-noise and development-oriented. They should not spam production users during normal interaction. Prefer validation scripts and docs for broad migration guidance; reserve runtime notices for contracts that are likely to silently fail.

## Emergency Removal

A public contract may be removed faster only when it creates a security, privacy, data-loss, or accessibility risk. Emergency removals still require a changelog entry, migration note, and release-checklist explanation.
