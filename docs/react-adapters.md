# React Adapters

Control Surface UI remains a dependency-free CSS and vanilla JavaScript framework. React support is an optional peer entrypoint for interaction-heavy primitives whose accessibility and portal behavior should not be reimplemented by each product.

```jsx
import {
  ControlDialog,
  ControlAsyncState,
  ControlActivityTrail,
  ControlErrorBoundary,
  ControlMultiSelect,
  ControlPageBody,
  ControlPageHeader,
  ControlPicker,
  ControlSparkline,
  ToastProvider,
  useToast,
} from "control-surface-ui/react";
import "control-surface-ui/css";
```

## Ownership

The adapters own DOM anatomy, ARIA state, keyboard behavior, portal placement, viewport collision handling, mobile containment, native-dialog lifecycle, focus restoration, toast stacking, dismissal, and reduced-motion presentation.

Consumers own option data, domain labels, persistence, authorization, async requests, and application routing.

## Page header

`ControlPageHeader` provides one consistent route or section heading with an optional eyebrow, summary, metadata, and action group. Use `compact` for embedded management sections and `divided` when the heading needs a quiet boundary from the work surface below. Set `headingLevel` when nesting the adapter below a route-level heading.

```jsx
<ControlPageHeader
  eyebrow="Workspace administration"
  title="Agent access"
  summary="Create and revoke machine credentials for this workspace."
  actions={<button className="if-btn if-btn--primary">Add credential</button>}
/>
```

Pair route and management headers with `ControlPageBody`. It provides the shared interior gutter and vertical rhythm between bordered work surfaces so tables, alerts, metadata, and inspector copy never sit against a page boundary. Use `compact` for embedded management surfaces.

```jsx
<section className="if-panel">
  <ControlPageHeader compact divided title="Task Center" />
  <ControlPageBody compact>
    <TaskSummary />
    <TaskTable />
  </ControlPageBody>
</section>
```

## Activity trail

`ControlActivityTrail` presents ordered task, provider, audit, and workflow activity as one divided surface instead of a stack of nested cards. Each item accepts `title`, `status`, `tone`, `meta`, `detail`, and optional `content` for bounded request/response inspectors.

```jsx
<ControlActivityTrail
  label="Task activity"
  items={[
    { id: "submitted", title: "Task submitted", status: "Accepted", tone: "info", meta: "09:42", detail: "Research request created." },
    { id: "verified", title: "Verification completed", status: "Succeeded", tone: "success", meta: "09:44" },
  ]}
/>
```

## Async states and error boundaries

`ControlAsyncState` renders the framework loading, empty, cancelled, and error contracts with one accessible anatomy. Pass visible `title` and `message` copy, an optional decorative `icon`, and a retry or recovery `action`. Use `compact` for embedded panels.

`ControlErrorBoundary` contains render failures to the owned surface instead of blanking the application. It reports through `onError`, resets when `resetKey` changes, accepts a custom `fallback`, and otherwise renders a framework error state with a retry action.

```jsx
<ControlErrorBoundary resetKey={routeId} onError={reportUiFailure}>
  {loading ? (
    <ControlAsyncState state="loading" title="Loading request ledger" message="Reading the current workspace ledger." />
  ) : <RequestLedger />}
</ControlErrorBoundary>
```

Keep domain traces and sensitive diagnostics in the consuming application. Do not place credentials, request bodies, or raw provider output in boundary copy or `onError` telemetry.

## Picker

`ControlPicker` supports single selection. `ControlMultiSelect` is the same primitive with multiple selection enabled. Both accept array tuples, strings, or objects with `value`, `label`, `description`, `meta`, `icon`, `searchText`, and `disabled`.

## Sparkline

`ControlSparkline` renders the framework sparkline contract directly in React without requiring the plain-HTML behavior hydrator. Pass numeric `values`, optional point `labels`, and an accessible series `label`. The component derives an up/down tone automatically, supports the framework's streaming and updating states, preserves the plot aspect ratio by default, and exposes every sample through pointer and keyboard tooltips. Use `className="if-sparkline--summary"` for compact metric strips.

```jsx
<ControlSparkline
  label="Requests by day"
  values={[18, 22, 19, 31, 28, 36, 41]}
  labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
  formatValue={(value) => `${value} requests`}
/>
```

Use `triggerProps` and `menuProps` for product-specific semantics or stable test hooks. These props extend the shared elements without replacing their framework classes, ARIA state, or behavior.

Menus render in a portal, remain at least 12 px from viewport edges, flip above the trigger when needed, and support Arrow keys, Home, End, Enter, pointer selection, outside dismissal, and Escape with focus restoration.

## Dialog

`ControlDialog` wraps the native `dialog` element. Sizes are `default`, `wide`, and `detail`. `mobileSheet` defaults to true. The header uses a two-column title/action grid so long titles never collide with actions. The body owns scrolling; header and footer remain stable.

Pass a React ref through `dialogRef` when a contained picker needs the dialog as its portal target. `dialogProps`, `surfaceProps`, and `bodyProps` add product semantics without replacing the shared lifecycle or anatomy.

## Toasts

Wrap the application once in `ToastProvider`, then call `useToast()` from descendants. Toast options include `tone`, `title`, `message`, `duration`, `action`, and stable `id`. A duration of `0` disables automatic expiry.

Toasts expose only transient feedback. Validation errors that block task completion must also remain adjacent to the relevant field or form.
