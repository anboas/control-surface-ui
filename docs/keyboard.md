# Keyboard Behavior

The optional JavaScript layer exposes the framework keyboard contract through `InterfaceFramework.getKeyboardModel(scope)` and renders it into any element with `data-if-keyboard-model`. Use this document as the source of truth for component behavior specs.

```html
<section data-if-keyboard-model="global,menus,tabs,tables,graphs,documents,reviewer"></section>
```

## Keyboard Behavior Matrix

| Component | Keys | Expected Behavior |
| --- | --- | --- |
| Global shell | Tab / Shift+Tab | Move through visible, enabled controls in DOM order. |
| Global shell | Escape | Close the topmost open layer: tooltip, autocomplete, menu, popover, modal, drawer, then focused graph/diagram surface. |
| Button | Enter / Space | Activate the button. Toggle buttons update `aria-pressed`. |
| Split button | ArrowDown / ArrowUp | Open the menu and focus selected, first, or last item. |
| Menu | ArrowDown / ArrowUp | Move through enabled menu items with roving focus. |
| Menu | Home / End | Move to first or last item. |
| Menu | Enter / Space | Activate the focused item. |
| Menu | Escape | Close and restore focus to the menu toggle. |
| Menu | Tab | Close and allow normal focus movement. |
| Tabs | ArrowRight / ArrowLeft | Move and activate the next or previous tab, wrapping at boundaries. |
| Tabs | Home / End | Activate the first or last tab. |
| Accordion | Enter / Space | Toggle the current panel and update `aria-expanded`. |
| Modal | Tab / Shift+Tab | Trap focus within the active modal dialog. |
| Modal / drawer | Escape | Close the active layer and restore focus when possible. |
| Autocomplete | ArrowDown / ArrowUp | Open suggestions and move the active option. |
| Autocomplete | Enter | Select the active suggestion. |
| Autocomplete | Escape | Close suggestions without changing the field. |
| Data table | Enter / Space | Activate focused sort, pagination, expand, resize, or row action controls. |
| Data table | Escape | Close open table menus or filter popovers through the shared escape stack. |
| Graph | Enter / Space | Select focused node or edge and update detail/traversal panels. |
| Graph minimap | Arrow keys | Pan the graph viewport. Shift increases the pan step. |
| Graph minimap | Home / Enter / Space | Reset or fit the graph viewport. |
| Graph / diagram | Escape | Clear node/edge/item focus and return to seed context. |
| Hierarchy | Enter / Space | Select the focused hierarchy row. |
| Hierarchy | ArrowRight | Expand a collapsed branch. |
| Hierarchy | ArrowLeft | Collapse an expanded branch. |
| Document annotations | Enter / Space | Inspect the focused CLM/REF/ORG mark and update linked panels. |
| Review workflow | ArrowDown / ArrowRight | Move to the next review item. |
| Review workflow | ArrowUp / ArrowLeft | Move to the previous review item. |
| Review workflow | Home / End | Move to first or last item. |
| Review workflow | A / R / E | Approve, reject, or escalate the selected item when the workflow allows shortcuts. |
| Review workflow | N | Move focus to notes or decision reason. |

## Buttons And Menus

Split buttons are two controls: the primary action and the menu toggle. The menu toggle must have `aria-expanded` and an accessible name. The menu surface uses `data-if-menu`; hydrated menus receive menu roles and roving focus.

Keyboard requirements:

- Arrow keys open from the toggle.
- Escape closes and restores focus.
- Tab closes without trapping the user.
- Menu item activation follows the same action path as pointer activation.

## Tabs

Tabs use automatic activation. When a tab receives Arrow, Home, or End movement, the target tab becomes active, receives `aria-selected="true"`, and reveals its `role="tabpanel"` target.

## Accordions

Accordion triggers are real buttons. They toggle `aria-expanded` and the associated panel’s `hidden` state. A collapsed panel must not contain reachable controls.

## Modals And Drawers

Modals trap focus. Drawers use the same close and Escape semantics, but may be configured as non-modal when the page requires persistent side context. Every modal or drawer needs an accessible name and a visible close action.

## Tables

Table keyboard behavior is control-first. Sort headers, resize handles, row expanders, pagination, density controls, and selection checkboxes are individually reachable. Server-adapter and virtualized tables must expose loading, empty, error, and cancelled states as visible text outside the virtual row window.

Production table adapters should preserve these events:

- `if:data-table-sort`
- `if:data-table-filter`
- `if:data-table-page`
- `if:data-table-selection`
- `if:data-table-adapter-state`

## Graphs

Graph nodes and edge labels are keyboard-operable controls. The graph canvas may support pointer dragging, pan, zoom, and layout engines, but the same relationships must be traversable through nodes, edge labels, detail panels, and the accessible fallback index.

Graph requirements:

- Enter or Space selects a focused node or edge.
- Escape clears focused graph state.
- Minimap Arrow keys pan the viewport.
- Home or Enter on the minimap resets or fits the viewport.
- Graph fallback lists expose visible nodes and visible relationships after filtering and traversal.

## Documents

Document annotations are selectable marks. A focused CLM/REF/ORG mark activates with Enter or Space, shows the expansion or normalized value, and links to matching extracted claims, organizations, references, or parser rows.

## Reviewer Workflows

Reviewer workflows use roving selection for queues and explicit controls for high-impact actions. Single-key shortcuts are allowed only when the selected item, decision reason, and status are visible. Destructive or irreversible actions should require a confirm control, modal, or clearly reversible state.

## Escape Stack

Escape closes one layer at a time in this order:

1. Tooltip
2. Autocomplete
3. Menu
4. Popover
5. Modal
6. Drawer
7. Focused graph, diagram, or custom focus surface

This order keeps dense control surfaces predictable. New components should join the stack rather than adding page-specific Escape handlers.

## Consistent State Contract

Every interactive component should use the same state vocabulary so host applications, tests, and agent-authored pages can reason about behavior without reading visual CSS.

| State | Required DOM Contract | Applies To |
| --- | --- | --- |
| Open / closed | Toggle has `aria-expanded`; controlled surface uses `hidden` and `aria-hidden`; both receive the active/open classes. | Menus, popovers, accordions, collapsible panels, drawers. |
| Pressed | Toggle has `aria-pressed`; active styling follows the same class as pointer state. | Theme choices, chart datasets, demo configuration buttons, expand controls. |
| Selected | Item has `aria-selected`; roving-focus items use `tabIndex=0` only on the active item. | Tabs, hierarchy rows, queues, segmented controls. |
| Focused item | Focus can be cleared with Escape or click-off and emits the matching clear event. | Graphs, diagrams, document annotations, focus surfaces. |
| Disabled / unavailable | Use the native `disabled` attribute when possible; otherwise `aria-disabled="true"` and remove from roving focus. | Toolbar actions, menu items, wizard steps, table actions. |

When adding a component, prefer the framework disclosure, pressed, and selected helpers rather than component-specific class toggles. This keeps visual state, accessibility state, and integration events synchronized.
