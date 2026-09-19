# React Adapters

Control Surface UI remains a dependency-free CSS and vanilla JavaScript framework. React support is an optional peer entrypoint for interaction-heavy primitives whose accessibility and portal behavior should not be reimplemented by each product.

```jsx
import {
  ControlDialog,
  ControlDisclosure,
  ControlAsyncState,
  ControlActivityTrail,
  ControlCollectionEditor,
  ControlMetricStrip,
  ControlErrorBoundary,
  ControlIdentityEditor,
  ControlMultiSelect,
  ControlPageBody,
  ControlPageHeader,
  ControlWorkbenchHeader,
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

## Disclosure

`ControlDisclosure` keeps secondary analysis, evidence, diagnostics, and advanced controls behind one native, keyboard-accessible summary row. It owns the icon, title, supporting copy, chevron state, border, touch target, and body gutter. Use it when the content must remain available but should not compete with the route's primary work surface.

```jsx
<ControlDisclosure
  icon={<ChartIcon />}
  title="Detailed request history"
  summary="Largest changes, appropriation vintages, and signal movement"
>
  <DetailedHistory />
</ControlDisclosure>
```

## Identity editor

`ControlIdentityEditor` provides the shared anatomy for an account avatar or organization mark, explanatory copy, and image-management actions. Use it inside profile, member, and workspace settings forms instead of rebuilding bordered avatar rows and mobile action wrapping in each product. Pass `compact` inside dense utility forms.

```jsx
<ControlIdentityEditor
  compact
  avatar={<UserAvatar user={user} />}
  title="Profile picture"
  summary="Square crop, optimized before upload."
  actions={<><button className="if-btn">Replace</button><button className="if-btn">Remove</button></>}
/>
```

## Activity trail

`ControlActivityTrail` presents ordered task, provider, audit, and workflow activity as one divided surface instead of a stack of nested cards. Each item accepts `title`, `status`, `tone`, `meta`, `detail`, and optional `content` for bounded request/response inspectors.

Pass `compact` when the trail sits beside a review surface or contains several provider exchanges. The compact variant keeps the same ordered semantics and touch-safe expandable content while reducing repeated chrome.

```jsx
<ControlActivityTrail
  label="Task activity"
  items={[
    { id: "submitted", title: "Task submitted", status: "Accepted", tone: "info", meta: "09:42", detail: "Research request created." },
    { id: "verified", title: "Verification completed", status: "Succeeded", tone: "success", meta: "09:44" },
  ]}
/>
```

`ControlActivityInspector` is the scan-first alternative for workflows whose stages contain substantial request, response, evidence, or diagnostic payloads. It keeps the complete chain visible as one keyboard-navigable stage rail and renders only the selected stage detail. On phones, the rail becomes a contained horizontal selector instead of a tall timeline.

```jsx
<ControlActivityInspector
  label="Provider stages"
  items={[
    { id: "submitted", title: "Submitted", status: "Accepted", tone: "info", content: <RequestResponse /> },
    { id: "verified", title: "Verification", status: "Completed", tone: "success", content: <Verification /> },
  ]}
/>
```

## Progress rail and change review

`ControlProgressRail` presents a short, ordered process without turning mobile layouts into a tall vertical stepper. Pass `complete`, `active`, `blocked`, or `pending` through each item's `state`; compact descriptions remain available on desktop while mobile retains the stage label and state marker.

`ControlChangeList` presents field-level before/after values in one row per change. It replaces duplicated side-by-side lists that force operators to match rows by position. On mobile, each row keeps its field label and a contained before-to-after comparison.

```jsx
<ControlProgressRail
  label="Enrichment progress"
  items={[
    { label: "Research", state: "complete", meta: "Cited public details" },
    { label: "Verify", state: "complete", meta: "Independent evidence check" },
    { label: "Review", state: "active", meta: "Human decision" },
  ]}
/>

<ControlChangeList
  label="Verified event changes"
  items={[{ field: "notes", label: "Notes", before: "Not set", after: "Verified public summary" }]}
/>
```

## Collection editor

`ControlCollectionEditor` turns repeated structured fields into one divided list with a single active editor. Use it for links, milestones, contacts, rules, or other collections that become visually overwhelming when every item stays expanded. Each item keeps a compact summary row, new items open automatically, and removal remains adjacent to the item it affects.

```jsx
<ControlCollectionEditor
  label="Event links"
  items={links}
  getKey={(link) => link.id}
  renderSummary={(link, index) => <><strong>{link.label || `Link ${index + 1}`}</strong><small>{link.url || "URL not entered"}</small></>}
  renderEditor={(link, index) => <><LinkLabelField index={index} /><LinkUrlField index={index} /></>}
  onRemove={(_, index) => removeLink(index)}
  removeLabel="Remove link"
/>
```

The consumer owns collection state, validation, add controls, and persistence. The adapter owns disclosure state, focusable summary rows, divided-item anatomy, mobile field stacking, and automatic expansion when a new stable key appears.

## Metric strip

`ControlMetricStrip` renders a flat responsive summary band from `items`. Each item accepts `label`, `value`, `meta`, `tone`, and an optional `visual` such as `ControlSparkline`. Use `mobileScroll` for longer operational summaries that should remain one compact, touch-scrollable row on small screens instead of becoming a tall card wall. Use it instead of recreating management-card markup in every route.

```jsx
<ControlMetricStrip
  label="User access summary"
  items={[
    { label: "Active", value: 18, tone: "success" },
    { label: "Suspended", value: 2, tone: "warning" },
  ]}
/>
```

## Workbench header

`ControlWorkbenchHeader` consolidates route identity, summary metrics, tabs, filters, search, and actions into one bounded command surface. Use it when a data-heavy workspace would otherwise stack a page introduction, KPI cards, filter panel, and section header. Keep results and visualizations outside the header.

```jsx
<ControlWorkbenchHeader
  eyebrow="Portfolio"
  title="Awards"
  summary="Search, filter, inspect, and export the complete matched award set."
  metrics={summaryItems}
  tabs={<ViewTabs />}
  controls={<><SearchField data-if-workbench-primary /><FilterPicker /></>}
  secondaryControls={<ActiveFilters />}
  actions={<ExportButton />}
/>
```

## Operational month calendar

The calendar family owns the reusable shell for a six-week operational month view. `ControlCalendarSurface` owns containment, `ControlCalendarHeader` owns identity/filter/navigation composition, `ControlMonthNavigator` provides the shared previous/today/next controls, `ControlCalendarOverlayRail` owns horizontally scrollable schedule overlays, and `ControlCalendarGrid` owns the weekday and six-week frame. Consumers retain event placement, permissions, busy-day aggregation, hover content, and record-specific detail.

```jsx
<ControlCalendarSurface>
  <ControlCalendarHeader
    eyebrow="Workspace calendar"
    title={<span>September 2026</span>}
    compactTitle="Sep 2026"
    filters={<EventTypePicker />}
    navigation={<ControlMonthNavigator onPrevious={previous} onToday={today} onNext={next} />}
    summary="8 events"
  />
  <ControlCalendarOverlayRail summary="Toggle visible schedules">
    <TeamOverlayButtons />
  </ControlCalendarOverlayRail>
  <ControlCalendarGrid label="September 2026 event calendar">
    {weeks.map(renderWeek)}
  </ControlCalendarGrid>
</ControlCalendarSurface>
```

The framework intentionally does not infer dates or event lanes. This keeps source calendars, authorization, time zones, and crowded-day rules in the owning product while standardizing the visual and interaction shell.

## Fact grid

`ControlFactGrid` presents record facts as a semantic description list inside one divided surface. Use `mobileTwoColumn` for compact inspection panels and mark selected items with `wide: true` when a long identity or narrative should span both mobile columns. It replaces stacks of individually bordered fact cards.

```jsx
<ControlFactGrid
  label="Record facts"
  mobileTwoColumn
  items={[
    { id: "owner", label: "Owner", value: "Mission systems", wide: true },
    { id: "status", label: "Status", value: "Active" },
    { id: "value", label: "Value", value: "$24.8M", meta: "Reported ceiling" },
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

Wrap the application once in `ToastProvider`, then call `useToast()` from descendants. Toast options include `tone`, `title`, `message`, `duration`, `action`, and stable `id`. A duration of `0` disables automatic expiry. `maxVisible` defaults to three and evicts the oldest transient toast, preventing mutation bursts from obscuring the owned work surface. Products with a durable notification center may use a lower limit.

Toasts expose only transient feedback. Validation errors that block task completion must also remain adjacent to the relevant field or form.
# Identity links and status badges

Use `ControlIdentityLink` anywhere a person or team identity opens a public detail route. Use `ControlStatusBadge` for lifecycle state instead of route-local badge mappings. Identity links preserve a compact avatar/copy hierarchy, keyboard focus, coarse-pointer targets, and truncation.
