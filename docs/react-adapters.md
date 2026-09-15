# React Adapters

Control Surface UI remains a dependency-free CSS and vanilla JavaScript framework. React support is an optional peer entrypoint for interaction-heavy primitives whose accessibility and portal behavior should not be reimplemented by each product.

```jsx
import {
  ControlDialog,
  ControlMultiSelect,
  ControlPicker,
  ToastProvider,
  useToast,
} from "control-surface-ui/react";
import "control-surface-ui/css";
```

## Ownership

The adapters own DOM anatomy, ARIA state, keyboard behavior, portal placement, viewport collision handling, mobile containment, native-dialog lifecycle, focus restoration, toast stacking, dismissal, and reduced-motion presentation.

Consumers own option data, domain labels, persistence, authorization, async requests, and application routing.

## Picker

`ControlPicker` supports single selection. `ControlMultiSelect` is the same primitive with multiple selection enabled. Both accept array tuples, strings, or objects with `value`, `label`, `description`, `meta`, `icon`, `searchText`, and `disabled`.

Menus render in a portal, remain at least 12 px from viewport edges, flip above the trigger when needed, and support Arrow keys, Home, End, Enter, pointer selection, outside dismissal, and Escape with focus restoration.

## Dialog

`ControlDialog` wraps the native `dialog` element. Sizes are `default`, `wide`, and `detail`. `mobileSheet` defaults to true. The header uses a two-column title/action grid so long titles never collide with actions. The body owns scrolling; header and footer remain stable.

## Toasts

Wrap the application once in `ToastProvider`, then call `useToast()` from descendants. Toast options include `tone`, `title`, `message`, `duration`, `action`, and stable `id`. A duration of `0` disables automatic expiry.

Toasts expose only transient feedback. Validation errors that block task completion must also remain adjacent to the relevant field or form.
