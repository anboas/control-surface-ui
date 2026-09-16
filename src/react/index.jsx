import {
  Component,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

function normalizeOptions(options = []) {
  return options.map((option) => {
    if (Array.isArray(option)) return { value: String(option[0]), label: String(option[1]) };
    if (typeof option === "string" || typeof option === "number") {
      return { value: String(option), label: String(option) };
    }
    return { ...option, value: String(option.value), label: String(option.label ?? option.value) };
  });
}

function selectedValues(value, multiple) {
  if (multiple) return Array.isArray(value) ? value.map(String) : [];
  return value === null || value === undefined ? [] : [String(value)];
}

function PickerChevron() {
  return <svg className="if-picker__chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PickerCheck() {
  return <svg className="if-picker__check" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m3 8.2 3 3L13 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m10.25 10.25 3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

export function ControlPageHeader({
  title,
  eyebrow,
  summary,
  meta,
  actions,
  headingLevel = 1,
  compact = false,
  divided = false,
  className = "",
  titleId,
  children,
  ...props
}) {
  const Heading = `h${Math.min(6, Math.max(1, Number(headingLevel) || 1))}`;
  return <header
    {...props}
    className={`if-page-header${compact ? " if-page-header--compact" : ""}${divided ? " if-page-header--divided" : ""} ${className}`.trim()}
  >
    <div className="if-page-header__heading">
      {eyebrow ? <span className="if-page-header__eyebrow">{eyebrow}</span> : null}
      <Heading id={titleId} className="if-page-header__title">{title}</Heading>
      {summary ? <p className="if-page-header__summary">{summary}</p> : null}
      {meta ? <div className="if-page-header__meta">{meta}</div> : null}
      {children}
    </div>
    {actions ? <div className="if-page-header__actions">{actions}</div> : null}
  </header>;
}

export function ControlPageBody({
  compact = false,
  className = "",
  children,
  ...props
}) {
  return <div
    {...props}
    className={`if-page-body${compact ? " if-page-body--compact" : ""} ${className}`.trim()}
  >
    {children}
  </div>;
}

export function ControlMetricStrip({
  items = [],
  label = "Summary",
  mobileScroll = false,
  className = "",
  ...props
}) {
  return <div {...props} className={`if-management-grid if-management-grid--strip${mobileScroll ? " if-management-grid--mobile-scroll" : ""} ${className}`.trim()} aria-label={label}>
    {items.map((item, index) => {
      const tone = ["neutral", "success", "warning", "danger", "info", "purple", "gold"].includes(item.tone) ? item.tone : "neutral";
      return <article className={`if-management-card if-tone-${tone}`} key={item.id ?? `${item.label}-${index}`}>
        <span className="if-management-card__label">{item.label}</span>
        <strong className="if-management-card__value">{item.value}</strong>
        {item.visual || null}
        {item.meta ? <small className="if-management-card__meta">{item.meta}</small> : null}
      </article>;
    })}
  </div>;
}

export function ControlProgressRail({
  items = [],
  label = "Progress",
  className = "",
  ...props
}) {
  return <ol {...props} className={`if-progress-rail ${className}`.trim()} aria-label={label} style={{ "--progress-count": Math.max(1, items.length) }}>
    {items.map((item, index) => {
      const state = ["complete", "active", "blocked", "pending"].includes(item.state) ? item.state : "pending";
      return <li className={`if-progress-rail__step is-${state}`} key={item.id ?? `${item.label}-${index}`} aria-current={state === "active" ? "step" : undefined}>
        <span className="if-progress-rail__marker" aria-hidden="true">{item.icon || index + 1}</span>
        <span className="if-progress-rail__copy">
          <strong>{item.label}</strong>
          {item.meta ? <small>{item.meta}</small> : null}
        </span>
      </li>;
    })}
  </ol>;
}

export function ControlChangeList({
  items = [],
  label = "Changes",
  beforeLabel = "Before",
  afterLabel = "Verified draft",
  empty,
  className = "",
  ...props
}) {
  if (!items.length && empty) return empty;
  return <div {...props} className={`if-change-list ${className}`.trim()} role="list" aria-label={label}>
    {items.map((item, index) => <article className="if-change-list__item" role="listitem" key={item.id ?? item.field ?? `${item.label}-${index}`}>
      <strong className="if-change-list__label">{item.label}</strong>
      <div className="if-change-list__value if-change-list__value--before">
        <span>{beforeLabel}</span>
        <p>{item.before}</p>
      </div>
      <span className="if-change-list__arrow" aria-hidden="true">→</span>
      <div className="if-change-list__value if-change-list__value--after">
        <span>{afterLabel}</span>
        <p>{item.after}</p>
      </div>
    </article>)}
  </div>;
}

export function ControlActivityTrail({
  items = [],
  label = "Activity",
  compact = false,
  className = "",
  ...props
}) {
  return <ol {...props} className={`if-activity-trail${compact ? " if-activity-trail--compact" : ""} ${className}`.trim()} aria-label={label}>
    {items.map((item, index) => {
      const tone = ["success", "warning", "danger", "muted", "info"].includes(item.tone) ? item.tone : "info";
      return <li className={`if-activity-trail__item is-${tone}`} key={item.id ?? `${item.title}-${index}`}>
        <span className="if-activity-trail__marker" aria-hidden="true">{item.icon || index + 1}</span>
        <div className="if-activity-trail__body">
          <header className="if-activity-trail__header">
            <strong className="if-activity-trail__title">{item.title}</strong>
            {item.status ? <span className={`if-status-pill if-status-pill--compact${tone === "danger" ? " is-error" : ` is-${tone}`}`}>{item.status}</span> : null}
          </header>
          {item.meta ? <span className="if-activity-trail__meta">{item.meta}</span> : null}
          {item.detail ? <p className="if-activity-trail__detail">{item.detail}</p> : null}
          {item.content ? <div className="if-activity-trail__content">{item.content}</div> : null}
        </div>
      </li>;
    })}
  </ol>;
}

export function ControlAsyncState({
  state = "loading",
  title,
  message,
  icon,
  action,
  compact = false,
  className = "",
  children,
  ...props
}) {
  const normalizedState = ["loading", "empty", "error", "cancelled"].includes(state) ? state : "loading";
  const defaultTitle = {
    loading: "Loading",
    empty: "Nothing to show",
    error: "Something went wrong",
    cancelled: "Request cancelled",
  }[normalizedState];
  const stateClass = normalizedState === "error" ? "if-error-state" : normalizedState === "empty" ? "if-empty" : "if-loading";
  const role = normalizedState === "error" ? "alert" : "status";
  return <section
    {...props}
    className={`${stateClass}${compact ? " if-async-state--compact" : ""} ${className}`.trim()}
    data-if-async-state={normalizedState}
    role={role}
    aria-live={normalizedState === "error" ? "assertive" : "polite"}
  >
    {icon ? <span className={normalizedState === "error" ? "if-error-state__icon" : "if-empty__icon"} aria-hidden="true">{icon}</span> : null}
    <div className="if-async-state__copy">
      <strong>{title || defaultTitle}</strong>
      {message ? <p>{message}</p> : null}
      {children}
    </div>
    {action ? <div className="if-async-state__action">{action}</div> : null}
  </section>;
}

export class ControlErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) this.reset();
  }

  reset() {
    this.setState({ error: null });
    this.props.onReset?.();
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (typeof this.props.fallback === "function") return this.props.fallback({ error: this.state.error, reset: this.reset });
    if (this.props.fallback) return this.props.fallback;
    return <ControlAsyncState
      state="error"
      title={this.props.title || "This surface could not be displayed"}
      message={this.props.message || "Retry the surface. If the problem continues, use the trace or support details provided by the application."}
      action={<button type="button" className="if-btn if-btn--secondary" onClick={this.reset}>{this.props.retryLabel || "Retry"}</button>}
      data-if-error-boundary
    />;
  }
}

export function ControlPicker({
  value,
  options = [],
  onChange,
  label = "Select",
  placeholder = "Select an option",
  className = "",
  disabled = false,
  searchable,
  searchPlaceholder,
  multiple = false,
  maxSelected = null,
  clearable = false,
  compact = false,
  loading = false,
  error = "",
  emptyMessage = "No matching options",
  portalTarget = null,
  align = "start",
  triggerProps = {},
  menuProps = {},
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [geometry, setGeometry] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const menuId = `if-picker-${useId().replaceAll(":", "")}`;
  const rows = useMemo(() => normalizeOptions(options), [options]);
  const chosen = selectedValues(value, multiple);
  const chosenSet = useMemo(() => new Set(chosen), [chosen]);
  const selectedRows = rows.filter((option) => chosenSet.has(option.value));
  const showSearch = searchable ?? rows.length > 7;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRows = rows.filter((option) => {
    const text = [option.label, option.description, option.meta, option.searchText].filter(Boolean).join(" ").toLowerCase();
    return !normalizedQuery || text.includes(normalizedQuery);
  });

  const close = useCallback(({ restoreFocus = false } = {}) => {
    setOpen(false);
    setQuery("");
    setGeometry(null);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    function updateGeometry() {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const gutter = 12;
      const width = Math.min(Math.max(bounds.width, showSearch ? 280 : 220), window.innerWidth - gutter * 2);
      const maxHeight = Math.min(390, window.innerHeight - gutter * 2);
      const availableBelow = window.innerHeight - bounds.bottom - gutter;
      const placeBelow = availableBelow >= Math.min(maxHeight, 220);
      const top = placeBelow ? bounds.bottom + 5 : Math.max(gutter, bounds.top - maxHeight - 5);
      const preferredLeft = align === "end" ? bounds.right - width : bounds.left;
      setGeometry({
        left: Math.max(gutter, Math.min(preferredLeft, window.innerWidth - width - gutter)),
        top,
        width,
        maxHeight,
      });
    }
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) close();
    }
    updateGeometry();
    const focusFrame = window.requestAnimationFrame(() => {
      if (showSearch) searchRef.current?.focus();
      else menuRef.current?.querySelector('[role="option"][aria-selected="true"], [role="option"]')?.focus();
    });
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("resize", updateGeometry);
    window.addEventListener("scroll", updateGeometry, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", updateGeometry);
      window.removeEventListener("scroll", updateGeometry, true);
    };
  }, [align, close, open, rows.length, showSearch]);

  function optionsInMenu() {
    return [...(menuRef.current?.querySelectorAll('[role="option"]:not(:disabled)') || [])];
  }

  function focusOption(index) {
    const buttons = optionsInMenu();
    if (!buttons.length) return;
    buttons[(index + buttons.length) % buttons.length]?.focus();
  }

  function handleMenuKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close({ restoreFocus: true });
      return;
    }
    const buttons = optionsInMenu();
    const index = buttons.indexOf(event.target);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(index < 0 ? 0 : index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(index < 0 ? buttons.length - 1 : index - 1);
    } else if (index >= 0 && event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    } else if (index >= 0 && event.key === "End") {
      event.preventDefault();
      focusOption(buttons.length - 1);
    }
  }

  function choose(option) {
    if (option.disabled) return;
    if (!multiple) {
      onChange?.(option.value, option);
      close({ restoreFocus: true });
      return;
    }
    const next = chosenSet.has(option.value)
      ? chosen.filter((item) => item !== option.value)
      : [...chosen, option.value];
    if (maxSelected && next.length > maxSelected) return;
    onChange?.(next, option);
  }

  function clearSelection() {
    onChange?.(multiple ? [] : "", null);
  }

  const triggerLabel = multiple
    ? selectedRows.length ? `${label} (${selectedRows.length})` : placeholder
    : selectedRows[0]?.label || placeholder;
  const selected = selectedRows[0] || null;

  const menu = open ? createPortal(
    <section
      {...menuProps}
      ref={menuRef}
      id={menuId}
      className={`if-picker__menu ${multiple ? "if-picker__menu--multiple" : ""}`.trim()}
      data-if-picker-menu
      style={{ ...geometry, visibility: geometry ? "visible" : "hidden" }}
      onKeyDown={handleMenuKeyDown}
    >
      <header className="if-picker__menu-header">
        <span><strong>{label}</strong><small>{loading ? "Loading" : multiple && chosen.length ? `${chosen.length} selected` : `${rows.length} option${rows.length === 1 ? "" : "s"}`}</small></span>
        {clearable || multiple ? <button type="button" className="if-picker__clear" disabled={!chosen.length} onClick={clearSelection}>Clear</button> : null}
      </header>
      {showSearch ? <label className="if-picker__search"><SearchIcon /><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder || `Search ${label.toLowerCase()}`} aria-label={`Search ${label}`} /></label> : null}
      <div className="if-picker__options" role="listbox" aria-label={`${label} options`} aria-multiselectable={multiple || undefined}>
        {loading ? <div className="if-picker__state" role="status"><span className="if-picker__spinner" aria-hidden="true" />Loading options</div> : error ? <div className="if-picker__state if-picker__state--error" role="alert">{error}</div> : visibleRows.length ? visibleRows.map((option) => {
          const active = chosenSet.has(option.value);
          const selectionLimitReached = Boolean(multiple && maxSelected && !active && chosen.length >= maxSelected);
          return <button key={option.value} type="button" role="option" aria-selected={active} disabled={option.disabled || selectionLimitReached} className={active ? "is-selected" : ""} onClick={() => choose(option)}>
            {option.icon ? <span className="if-picker__option-icon">{option.icon}</span> : null}
            <span className="if-picker__option-copy"><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}</span>
            {option.meta ? <small className="if-picker__option-meta">{option.meta}</small> : null}
            <span className="if-picker__selection" aria-hidden="true">{multiple ? <span className="if-picker__checkbox"><PickerCheck /></span> : <PickerCheck />}</span>
          </button>;
        }) : <div className="if-picker__state">{emptyMessage}</div>}
      </div>
    </section>,
    portalTarget?.current || document.body,
  ) : null;

  return <div ref={rootRef} className={`if-picker ${compact ? "if-picker--compact" : ""} ${className}`.trim()}>
    <button
      {...triggerProps}
      ref={triggerRef}
      type="button"
      className="if-picker__trigger"
      aria-label={`${label}: ${triggerLabel}`}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          setOpen(true);
        }
      }}
    >
      {!multiple && selected?.icon ? <span className="if-picker__trigger-icon">{selected.icon}</span> : null}
      <span className="if-picker__trigger-copy"><strong>{triggerLabel}</strong>{!multiple && selected?.description ? <small>{selected.description}</small> : null}</span>
      <PickerChevron />
    </button>
    {menu}
  </div>;
}

export function ControlMultiSelect(props) {
  return <ControlPicker {...props} multiple />;
}

export function ControlSparkline({
  values = [],
  labels = [],
  label = "Trend",
  trend = "auto",
  streaming = false,
  updating = false,
  className = "",
  width = 120,
  height = 32,
  formatValue = (value) => String(value),
  preserveAspectRatio = "xMidYMid meet",
  ...props
}) {
  const [activeIndex, setActiveIndex] = useState(null);
  const samples = values
    .map((value, index) => ({ value: Number(value), label: labels[index] || `Sample ${index + 1}` }))
    .filter((sample) => Number.isFinite(sample.value));
  const plotted = samples.length === 1 ? [samples[0], { ...samples[0], label: samples[0].label }] : samples;
  const minimum = Math.min(...plotted.map((sample) => sample.value), 0);
  const maximum = Math.max(...plotted.map((sample) => sample.value), 0);
  const range = maximum - minimum || 1;
  const padding = 3;
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);
  const points = plotted.map((sample, index) => ({
    ...sample,
    x: padding + (plotted.length > 1 ? (index / (plotted.length - 1)) * innerWidth : innerWidth / 2),
    y: padding + ((maximum - sample.value) / range) * innerHeight,
  }));
  const resolvedTrend = trend === "auto"
    ? points.length > 1 && points.at(-1).value < points[0].value ? "down" : "up"
    : trend;
  const pointList = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const baseline = height - padding;
  const area = points.length ? `${padding},${baseline} ${pointList} ${width - padding},${baseline}` : "";
  const accessibleLabel = points.length
    ? `${label}: ${points.map((point) => `${point.label} ${formatValue(point.value)}`).join(", ")}`
    : `${label}: no data`;
  const activePoint = activeIndex === null ? null : points[activeIndex];

  return <span
    {...props}
    className={`if-sparkline if-sparkline--${resolvedTrend}${streaming ? " is-streaming" : ""}${updating ? " is-updating" : ""} ${className}`.trim()}
    role="group"
    aria-label={props["aria-label"] || accessibleLabel}
    onPointerLeave={() => setActiveIndex(null)}
  >
    {points.length ? <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio={preserveAspectRatio} aria-label={label} role="img">
      <polygon className="if-sparkline__area" points={area} />
      <polyline className="if-sparkline__line" points={pointList} />
      {points.map((point, index) => <g
        key={`${point.label}-${index}`}
        className={`if-sparkline__sample${activeIndex === index ? " is-active" : ""}`}
        transform={`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`}
        tabIndex="0"
        aria-label={`${point.label}: ${formatValue(point.value)}`}
        onPointerEnter={() => setActiveIndex(index)}
        onFocus={() => setActiveIndex(index)}
        onBlur={() => setActiveIndex(null)}
      >
        <circle className="if-sparkline__hit" r="7" />
        <circle className={`if-sparkline__point${index === points.length - 1 ? " if-sparkline__point--latest" : ""}`} r={index === points.length - 1 ? 2.8 : 2.35} />
        <title>{point.label}: {formatValue(point.value)}</title>
      </g>)}
    </svg> : null}
    {activePoint ? <span className="if-sparkline__tooltip" role="tooltip"><strong>{formatValue(activePoint.value)}</strong><span>{activePoint.label}</span></span> : null}
  </span>;
}

export function ControlDialog({
  open,
  onClose,
  title,
  eyebrow,
  summary,
  actions,
  children,
  footer,
  size = "default",
  mobileSheet = true,
  className = "",
  portalTarget = null,
  closeLabel = "Close dialog",
  dialogRef = null,
  dialogProps = {},
  surfaceProps = {},
  bodyProps = {},
}) {
  const internalDialogRef = useRef(null);
  const resolvedDialogRef = dialogRef || internalDialogRef;
  const restoreFocusRef = useRef(null);
  const titleId = `if-dialog-title-${useId().replaceAll(":", "")}`;

  useEffect(() => {
    const dialog = resolvedDialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      restoreFocusRef.current = document.activeElement;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, resolvedDialogRef]);

  function requestClose() {
    onClose?.();
    window.requestAnimationFrame(() => restoreFocusRef.current?.focus?.());
  }

  function containDialogFocus(event) {
    dialogProps.onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Tab") return;
    const dialog = resolvedDialogRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = [...(dialog?.querySelectorAll(focusableSelector) || [])]
      .filter((node) => !node.hidden && node.getClientRects().length > 0);
    if (!focusables.length) {
      event.preventDefault();
      dialog?.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const content = <dialog
    {...dialogProps}
    ref={resolvedDialogRef}
    className={`if-dialog if-dialog--${size} ${mobileSheet ? "if-dialog--mobile-sheet" : ""} ${className}`.trim()}
    aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); requestClose(); }}
    onClose={() => {
      if (open) onClose?.();
      window.requestAnimationFrame(() => restoreFocusRef.current?.focus?.());
    }}
    onKeyDown={containDialogFocus}
    onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}
  >
    <div {...surfaceProps} className={`if-dialog__surface ${surfaceProps.className || ""}`.trim()}>
      <header className="if-dialog__header">
        <div className="if-dialog__heading">
          {eyebrow ? <span className="if-dialog__eyebrow">{eyebrow}</span> : null}
          <h2 id={titleId} className="if-dialog__title">{title}</h2>
          {summary ? <p className="if-dialog__summary">{summary}</p> : null}
        </div>
        <div className="if-dialog__actions">{actions}<button type="button" className="if-icon-btn if-dialog__close" aria-label={closeLabel} onClick={requestClose}><span aria-hidden="true">×</span></button></div>
      </header>
      <div {...bodyProps} className={`if-dialog__body ${bodyProps.className || ""}`.trim()}>{children}</div>
      {footer ? <footer className="if-dialog__footer">{footer}</footer> : null}
    </div>
  </dialog>;

  return createPortal(content, portalTarget?.current || document.body);
}

const ToastContext = createContext(null);

export function ToastProvider({ children, placement = "masthead", defaultDuration = 4500, maxVisible = 3 }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const visibleLimit = Math.max(1, Math.floor(Number(maxVisible) || 3));

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) window.clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input) => {
    const toast = typeof input === "string" ? { message: input } : input;
    const id = toast.id || `if-toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const normalized = { tone: "info", title: "Update", duration: defaultDuration, ...toast, id };
    setToasts((current) => [...current.filter((item) => item.id !== id), normalized].slice(-visibleLimit));
    if (normalized.duration !== 0) {
      const timer = window.setTimeout(() => dismiss(id), normalized.duration);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [defaultDuration, dismiss, visibleLimit]);

  useEffect(() => {
    const visibleIds = new Set(toasts.map((toast) => toast.id));
    timersRef.current.forEach((timer, id) => {
      if (visibleIds.has(id)) return;
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    });
  }, [toasts]);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const value = useMemo(() => ({ showToast, dismissToast: dismiss }), [dismiss, showToast]);
  return <ToastContext.Provider value={value}>{children}<div className={`if-toast-stack if-toast-stack--${placement}`} aria-live="polite" aria-relevant="additions removals">
    {toasts.map((toast) => <article key={toast.id} className={`if-toast if-toast--${toast.tone}`} role={toast.tone === "danger" || toast.tone === "error" ? "alert" : "status"}>
      <span className="if-toast__tone" aria-hidden="true" />
      <div className="if-toast__copy"><strong>{toast.title}</strong>{toast.message ? <p>{toast.message}</p> : null}</div>
      {toast.action ? <button type="button" className="if-toast__action" onClick={() => toast.action.onClick?.(toast)}>{toast.action.label}</button> : null}
      <button type="button" className="if-toast__dismiss" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>×</button>
    </article>)}
  </div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
