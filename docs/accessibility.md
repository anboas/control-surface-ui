# Accessibility

The framework treats accessibility as a component contract, not a final audit pass. Components should remain usable in plain HTML, with the optional JavaScript layer adding state synchronization, focus management, keyboard behavior, and live status updates.

## Accessibility Contract

- Start with native elements: `button`, `a`, `input`, `select`, `table`, `ol`, `ul`, and heading structure before adding ARIA.
- Every interactive control needs an accessible name from visible text, `aria-label`, or `aria-labelledby`.
- Use ARIA to expose state, not to replace semantics: `aria-expanded`, `aria-selected`, `aria-pressed`, `aria-current`, `aria-invalid`, `aria-describedby`, and `aria-controls` should point to real state and real ids.
- Keep focus visible with `.if-focus-ring`, native `:focus-visible`, or component focus styles.
- Use `aria-live="polite"` for non-blocking status changes such as table counts, export state, autocomplete status, graph fallback summaries, and validation summaries.
- Provide a non-visual fallback for canvas-like or spatial surfaces. Graphs, diagrams, and document annotation views should expose lists, tables, or detail panels that describe the same records.
- Respect reduced motion. Animated demos and live charts should use tokenized motion and preserve readable static states.

## ARIA Patterns

| Component | Required ARIA / Semantics | Notes |
| --- | --- | --- |
| Button | Native `button`; icon-only controls use `aria-label` or `title` | Use `aria-pressed` only for toggles. |
| Split button / menu | Toggle has `aria-expanded`; menu uses `role="menu"`; items use buttons or menuitem roles | Escape closes and returns focus to the toggle. |
| Search / autocomplete | Native search input; hydrated combobox/listbox state; suggestions expose highlighted text visually | Remote providers must expose loading, empty, error, and cancelled states. |
| Tabs | `role="tablist"`, each tab has `role="tab"`, `aria-selected`, and `aria-controls`; panels use `role="tabpanel"` | The controlled panel id must exist in the same document. |
| Accordion | Trigger has `aria-expanded`; panel is hidden when collapsed | Prefer visible section headings plus a real button. |
| Modal | Dialog has `role="dialog"` and an accessible name | Modal focus is trapped until closed. |
| Drawer | Drawer uses dialog-like focus and an accessible close control | Keep background navigation out of the active focus path when modal. |
| Tooltip | Trigger has a real label; tooltip is supplemental | Do not put required instructions only in a tooltip. |
| Data table | Native `table`, `th`, sortable buttons, labeled selection checkboxes, live count/status text | Column resizing and pinning must preserve keyboard access to headers. |
| Graph / network | Nodes and edge labels are focusable controls; fallback list uses `data-if-graph-a11y` | Spatial layout cannot be the only way to traverse relationships. |
| Hierarchy / tree | Rows are focusable; toggles expose `aria-expanded`; selected row is visually and programmatically clear | Use `role="tree"` and `role="treeitem"` when the surface behaves like a tree. |
| Document viewer | Original artifact and reconstituted text have distinct landmarks; marks are focusable when interactive | Annotation marks need hover/focus tooltips and click targets in extracted lists. |
| Review workflow | Queue items expose selected state and decision results through text, badges, and live ledger updates | Keyboard shortcuts must never hide irreversible actions behind a single key. |
| Charts | SVG/HTML charts expose titles, values, legends, and keyboard-focusable points where interactive | Include table or summary text when a chart is the source of truth. |
| Architecture diagrams | Diagram items are buttons or `role="button"` with detail panels and click-off reset | Connector labels should not be the only source of meaning. |

## Component Requirements

Buttons and icon buttons must have stable dimensions, visible labels or accessible labels, and a disabled state that remains perceivable. Destructive buttons use color plus text, never color alone.

Menus and split buttons use the behavior layer for roving focus. Menu items should be real buttons unless navigation is intended, in which case use anchors.

Forms use `.if-field__label`, `.if-field__help`, and `.if-field__feedback`. Validation updates `aria-invalid`, connects help and feedback through `aria-describedby`, and renders `.if-form-summary` with `role="alert"` or `aria-live="polite"`.

Tables use sortable button controls inside headers, labeled row selection checkboxes, and live status regions for filtered/visible/selected counts. Virtualized or server-adapter tables must expose loading, empty, error, and cancelled states outside the scroll-only region.

Graphs and diagrams use focusable node controls, click-off reset, Escape reset, detail panels, and accessible fallback indexes. A production layout engine can own geometry, but the framework owns keyboard reachability and state reporting.

Document viewers expose search results, semantic highlights, line numbers, annotation details, and source metadata as text. Clicking a CLM/REF/ORG mark should update the inspector or reveal the corresponding extracted-list record without erasing surrounding context.

## Testing Checklist

- Run `npm run accessibility` after changing examples, component docs, or behavior-layer focus logic.
- Run `npm run validate` before shipping; validation executes the accessibility suite.
- Keyboard-test the active page with Tab, Shift+Tab, Enter, Space, Escape, Arrow keys, Home, and End.
- Confirm every popover, menu, modal, drawer, graph detail, diagram detail, autocomplete, and tooltip can close with Escape or an equivalent close control.
- Confirm every `aria-controls`, `aria-labelledby`, and `aria-describedby` reference points to an existing id.
- Confirm table selection checkboxes, icon-only buttons, and graph/diagram controls have accessible names.
- Confirm charts and visual-only summaries have adjacent text, table, or aria-label equivalents.

## Known Manual Checks

The static suite cannot prove color contrast, screen-reader announcement quality, pointer target comfort, or browser-specific focus order by itself. Use a browser accessibility inspector and at least one screen reader pass on production pages that use graphs, diagrams, document annotations, review queues, or virtualized tables.

## Graph And Diagram Fallbacks

Primary graph and diagram surfaces should include a fallback panel or generated summary. For graph views, add:

```html
<section class="if-panel if-graph-a11y" data-if-graph-a11y aria-label="Accessible graph fallback">
  <p data-if-graph-a11y-summary></p>
  <ol data-if-graph-a11y-nodes></ol>
  <ol data-if-graph-a11y-edges></ol>
</section>
```

For diagrams, use focusable diagram items and a detail panel with a close control:

```html
<article data-if-diagram data-if-focus-surface="diagram" data-if-focus-detail="[data-if-diagram-detail]">
  <button type="button" data-if-diagram-item data-diagram-title="Source Monitor">Source Monitor</button>
  <aside data-if-diagram-detail hidden aria-live="polite">
    <button type="button" data-if-focus-clear aria-label="Close diagram details">Close</button>
  </aside>
</article>
```

