(() => {
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

let activeModal = null;
let lastFocus = null;
let initialized = false;
let graphDrag = null;
let graphPan = null;
let graphMinimapPan = null;
let diagramDrag = null;
let erdDrag = null;
let erdPan = null;
let erdMinimapPan = null;
let tableResizeDrag = null;
let activeTooltipControl = null;
let connectorRouteCounter = 0;
let collapsibleSurfaceCounter = 0;
const erdRelaxFrames = new WeakMap();
const sparklineStreams = new WeakMap();
const autocompleteAdapters = new Map();
const autocompleteRequests = new WeakMap();
const dataTableAdapters = new Map();
const dataTableRequests = new WeakMap();
const exportAdapters = new Map();
const exportRequests = new WeakMap();
const adapterTaskRequests = new WeakMap();
const diagramLayoutAdapters = new Map();
const diagramDeletedStacks = new WeakMap();
const graphLayoutEngines = new Map();
const diagramNodeTypes = new Map();
const graphNodeTypes = new Map();
const hierarchyNodeTypes = new Map();
const graphLayoutRequests = new WeakMap();
const componentInventoryManifestRequests = new WeakMap();
const componentInventoryMotionTimers = new WeakMap();
const componentInventorySelectionTimers = new WeakMap();
const adapterStates = new Set(["idle", "loading", "success", "empty", "error", "cancelled"]);
const adapterTaskEvents = {
  request: "if:adapter-request",
  result: "if:adapter-result",
  cancel: "if:adapter-cancel",
  error: "if:adapter-error"
};
const adapterStateAliases = {
  cancel: "cancelled",
  canceled: "cancelled",
  complete: "success",
  done: "success",
  loaded: "success",
  result: "success",
  results: "success",
  resolved: "success"
};
const diagramFocusedSelector = [
  "[data-if-diagram-item].is-focused",
  ".if-arch-service.is-focused",
  ".if-platform-service.is-focused",
  ".if-arch-stage.is-focused"
].join(",");
const diagramItemSelector = [
  "[data-if-diagram-item]",
  ".if-arch-service",
  ".if-platform-service",
  ".if-diagram-node",
  ".if-diagram-step",
  ".if-diagram-zone",
  ".if-diagram-matrix__cell"
].join(",");
const diagramContainerSelector = "[data-if-diagram-container]";
const behaviorModules = new Map();
let coreBehaviorModulesRegistered = false;

function normalizeBehaviorRoot(root = document) {
  if (typeof root === "string") return document.querySelector(root) || document;
  return root || document;
}

function isDocumentBehaviorRoot(root) {
  return root === document || root === document.documentElement || root === document.body;
}

function normalizeBehaviorOptions(options = {}) {
  return options && typeof options === "object" ? options : {};
}

function normalizeBehaviorModuleNames(modules) {
  if (!modules || modules === "all") return null;
  if (typeof modules === "string") return modules.split(",").map((name) => name.trim()).filter(Boolean);
  if (Array.isArray(modules)) return modules.map((name) => String(name).trim()).filter(Boolean);
  return null;
}

function getLifecycleEventTarget(root) {
  return root === document ? document : root;
}

function dispatchBehaviorEvent(root, type, detail, options = {}) {
  if (options.silent || typeof CustomEvent !== "function") return;
  const target = getLifecycleEventTarget(root);
  if (!target?.dispatchEvent) return;
  target.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
}

function getBehaviorModuleList(options = {}) {
  const names = normalizeBehaviorModuleNames(options.modules);
  const modules = Array.from(behaviorModules.values()).sort((a, b) => a.order - b.order);
  return names ? modules.filter((module) => names.includes(module.name)) : modules;
}

function registerBehaviorModule(nameOrModule, initFn, destroyFn, config = {}) {
  const descriptor = typeof nameOrModule === "string"
    ? { ...config, name: nameOrModule, init: initFn, destroy: destroyFn }
    : { ...nameOrModule };
  const name = String(descriptor.name || "").trim();
  if (!name) throw new Error("InterfaceFramework.registerBehaviorModule requires a module name.");
  if (typeof descriptor.init !== "function" && typeof descriptor.destroy !== "function") {
    throw new Error(`InterfaceFramework behavior module "${name}" needs init or destroy.`);
  }
  const existing = behaviorModules.get(name);
  const order = Number.isFinite(descriptor.order) ? descriptor.order : existing?.order ?? behaviorModules.size;
  behaviorModules.set(name, {
    name,
    description: descriptor.description || "",
    selectors: Array.isArray(descriptor.selectors) ? descriptor.selectors.slice() : [],
    init: descriptor.init,
    destroy: descriptor.destroy,
    order,
    stable: descriptor.stable !== false
  });
  return () => unregisterBehaviorModule(name);
}

function unregisterBehaviorModule(name) {
  return behaviorModules.delete(String(name || "").trim());
}

function getBehaviorModules() {
  if (!coreBehaviorModulesRegistered && typeof registerCoreBehaviorModules === "function") registerCoreBehaviorModules();
  return getBehaviorModuleList().map((module) => ({
    name: module.name,
    description: module.description,
    selectors: module.selectors.slice(),
    hasInit: typeof module.init === "function",
    hasDestroy: typeof module.destroy === "function",
    stable: module.stable
  }));
}

function runBehaviorModule(module, phase, root, options = {}) {
  const handler = module?.[phase];
  if (typeof handler !== "function") return null;
  const detail = { phase, module: module.name, root, options };
  dispatchBehaviorEvent(root, `if:behavior-${phase}:before`, detail, options);
  try {
    const result = handler(root, options);
    dispatchBehaviorEvent(root, `if:behavior-${phase}`, { ...detail, result }, options);
    return result;
  } catch (error) {
    dispatchBehaviorEvent(root, `if:behavior-${phase}:error`, { ...detail, error }, options);
    if (!options.continueOnError) throw error;
    console.warn(`InterfaceFramework: behavior module "${module.name}" ${phase} failed`, error);
    return null;
  }
}

function runBehaviorModules(phase, root = document, options = {}) {
  return getBehaviorModuleList(options).map((module) => runBehaviorModule(module, phase, root, options));
}

function initBehavior(name, root = document, options = {}) {
  const module = behaviorModules.get(String(name || "").trim());
  if (!module) throw new Error(`InterfaceFramework behavior module not found: ${name}`);
  return runBehaviorModule(module, "init", normalizeBehaviorRoot(root), normalizeBehaviorOptions(options));
}

function destroyBehavior(name, root = document, options = {}) {
  const module = behaviorModules.get(String(name || "").trim());
  if (!module) throw new Error(`InterfaceFramework behavior module not found: ${name}`);
  return runBehaviorModule(module, "destroy", normalizeBehaviorRoot(root), normalizeBehaviorOptions(options));
}

const mockAutocompleteProviders = {
  "policy-intelligence": [
    { label: "DoDI 5200.01 Information Governance", value: "DoDI 5200.01", type: "Policy", meta: "DoD Issuances Portal - high confidence", id: "DODI-5200.01" },
    { label: "SECNAV Memo 25-104 Cloud Transition Guidance", value: "SECNAV Memo 25-104", type: "Policy", meta: "Navy Directives Library - in review", id: "SECNAV-25-104" },
    { label: "NIST SP 800-207 Zero Trust Architecture", value: "NIST SP 800-207", type: "Source", meta: "NIST Publications Feed - cited by 98 records", id: "NIST-SP-800-207" },
    { label: "NDAA FY2025 Public Law 118-159", value: "NDAA FY2025", type: "Law", meta: "GovInfo / Congress.gov - verified corpus artifact", id: "NDAA-FY2025" },
    { label: "Executive Order 14250", value: "EO 14250", type: "Authority", meta: "Federal Register - executive order corpus artifact", id: "EO-14250" },
    { label: "DoDI 5025.01 DoD Directives Program", value: "DoDI 5025.01", type: "Policy", meta: "References and supersession authority", id: "DODI-5025.01" },
    { label: "DoDI 5200.01 Information Security Program", value: "DoDI 5200.01", type: "Policy", meta: "WHS DoD Issuances - information security corpus artifact", id: "DODI-5200.01" },
    { label: "Executive Order 14250 Secure Government Data", value: "EO 14250", type: "Authority", meta: "Upstream authority - derived from relationship", id: "EO-14250" },
    { label: "OMB M-25-77 FISMA Modernization", value: "OMB M-25-77", type: "Memo", meta: "Synthetic demo corpus artifact - needs verified source", id: "OMB-M-25-77" },
    { label: "DOWI 8320.14 Data Exchange Modernization", value: "DOWI 8320.14", type: "Policy", meta: "Synthetic demo corpus artifact", id: "DOWI-8320.14" },
    { label: "DISA Cloud Access Guide", value: "DISA Cloud Access Guide", type: "Guide", meta: "Synthetic implementation guide corpus artifact", id: "DISA-CLOUD-ACCESS" },
    { label: "DISA Organization", value: "DISA", type: "Organization", meta: "Guided implementation owner", id: "ORG-DISA" },
    { label: "NAVWAR API Gateway Migration Plan", value: "NAVWAR API Gateway Migration Plan", type: "Implementation", meta: "Lowest tracked implementation artifact", id: "NAVWAR-API-PLAN" },
    { label: "Data Classification Obligation", value: "Data Classification Obligation", type: "Obligation", meta: "Has obligation - due FY26 Q2", id: "OBL-DATA-CLASS" },
    { label: "Implementation Evidence: 17 Artifacts", value: "Implementation Evidence", type: "Evidence", meta: "Evidence package linked to DoDI 5200.01", id: "EVID-17" },
    { label: "Records Evidence Gap", value: "Records Evidence Gap", type: "Gap", meta: "Inferred conflict requiring review", id: "GAP-RECORDS" },
    { label: "AI Readiness Platform Opportunity", value: "AI Readiness Platform", type: "Opportunity", meta: "Enabled by information governance policy", id: "OPP-AI-READY" },
    { label: "Federal Register API", value: "Federal Register API", type: "Source", meta: "Source adapter - hourly delta", id: "SRC-FR" }
  ]
};

const documentAnnotationGlossary = {
  org: {
    "agency heads": "Agency heads / Component heads responsible for implementing policy requirements.",
    "cisa": "Cybersecurity and Infrastructure Security Agency.",
    "congress": "United States Congress.",
    "disa": "Defense Information Systems Agency.",
    "dod": "Department of Defense.",
    "don cio": "Department of the Navy Chief Information Officer.",
    "dow": "Department of War.",
    "mission partners": "External or interagency mission partners affected by the policy.",
    "navwar": "Naval Information Warfare Systems Command.",
    "omb": "Office of Management and Budget.",
    "secnav": "Secretary of the Navy.",
    "usd(a&s)": "Under Secretary of Defense for Acquisition and Sustainment.",
    "usd(a&amp;s)": "Under Secretary of Defense for Acquisition and Sustainment."
  },
  reference: {
    "aaf": "Adaptive Acquisition Framework.",
    "eo": "Executive Order.",
    "fisma": "Federal Information Security Modernization Act.",
    "jcids": "Joint Capabilities Integration and Development System.",
    "ndaa fy2025": "National Defense Authorization Act for Fiscal Year 2025.",
    "title 10": "Title 10 of the United States Code."
  },
  claim: {
    "assigns": "Assignment statement: creates a responsibility or ownership claim.",
    "establishes": "Establishment statement: creates policy, process, or governance structure.",
    "must": "Mandatory requirement.",
    "prescribes": "Procedure statement: defines required process or execution details.",
    "required": "Mandatory requirement.",
    "requires": "Mandatory requirement.",
    "shall": "Mandatory obligation or requirement.",
    "should": "Recommended or expected action.",
    "will": "Future-state commitment or required execution statement."
  }
};

const keyboardModel = {
  global: [
    { keys: "Escape", action: "Close topmost layer", details: "Tooltip, autocomplete, menu, popover, modal, drawer, then focused graph or diagram surface." },
    { keys: "Tab / Shift+Tab", action: "Move focus", details: "Native order; modal dialogs trap focus inside the active layer." },
    { keys: "Enter / Space", action: "Activate focused control", details: "Buttons, tabs, rows, graph nodes, document annotations, and hierarchy items." }
  ],
  menus: [
    { keys: "ArrowDown / ArrowUp", action: "Open or move", details: "Split-button and menu controls open the menu, then rove through actionable items." },
    { keys: "Home / End", action: "Jump to first or last item", details: "Keeps keyboard movement predictable in dense command menus." },
    { keys: "Enter / Space", action: "Run selected menu item", details: "Dispatches the same action path as pointer selection." },
    { keys: "Escape / Tab", action: "Close menu", details: "Escape restores focus to the trigger; Tab allows normal focus continuation." }
  ],
  tabs: [
    { keys: "ArrowRight / ArrowLeft", action: "Move active tab", details: "Wraps within the tab list and activates the target tab." },
    { keys: "Home / End", action: "Jump tab", details: "Activates the first or last tab in the group." }
  ],
  tables: [
    { keys: "Enter", action: "Activate row action", details: "Works with sort, expand, pagination, and row-level action controls." },
    { keys: "Arrow keys", action: "Reserved navigation", details: "Recommended production adapter hook for grid-mode virtualized tables." },
    { keys: "Escape", action: "Close overlays", details: "Closes column menus, filter popovers, and active dialogs using the shared escape stack." }
  ],
  graphs: [
    { keys: "Enter / Space", action: "Select node or edge", details: "Focuses the selected graph item and updates detail/traversal panels." },
    { keys: "Arrow keys", action: "Pan minimap", details: "When the minimap is focused, arrow keys pan the graph viewport." },
    { keys: "Home", action: "Reset viewport", details: "Returns the minimap/canvas to the default fitted view." },
    { keys: "Escape", action: "Reset focus", details: "Clears focused graph, diagram, and focus-surface state." }
  ],
  diagrams: [
    { keys: "Enter / Space", action: "Inspect diagram item", details: "Selects the focused node/card and updates the diagram detail panel and status bar." },
    { keys: "ArrowRight / ArrowDown", action: "Next visible item", details: "Moves through visible diagram items in DOM order, skipping hidden layers." },
    { keys: "ArrowLeft / ArrowUp", action: "Previous visible item", details: "Moves backward through visible diagram items." },
    { keys: "Home / End", action: "First or last visible item", details: "Jumps to the beginning or end of the current diagram surface." },
    { keys: "Escape", action: "Clear focus", details: "Closes the detail panel and restores undimmed diagram context." }
  ],
  documents: [
    { keys: "Enter / Space", action: "Inspect annotation", details: "Selects CLM/REF/ORG marks, links matching annotations, and updates the inspector." },
    { keys: "Escape", action: "Close active layer", details: "Keeps annotation inspection compatible with popovers, menus, modals, and drawers." }
  ],
  reviewer: [
    { keys: "ArrowDown / ArrowRight", action: "Next review item", details: "Moves selection in the active reviewer queue." },
    { keys: "ArrowUp / ArrowLeft", action: "Previous review item", details: "Moves selection backward without changing the decision." },
    { keys: "Home / End", action: "First or last item", details: "Supports fast review of long queues." },
    { keys: "A", action: "Approve selected item", details: "Writes approved state, updates counts, appends ledger entry, and emits workflow event." },
    { keys: "R", action: "Reject selected item", details: "Writes rejected state and preserves the decision reason." },
    { keys: "E", action: "Escalate selected item", details: "Writes escalated state for supervisor or policy-owner review." },
    { keys: "N", action: "Focus notes", details: "Moves focus to the workflow notes/reason control." }
  ]
};

const iconPaths = {
  acquisition: "<path d='M4 7h16v13H4z'></path><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path><path d='m8 14 2 2 5-5'></path><path d='M16 15h2'></path>",
  alert: "<path d='M12 3 2.5 20h19L12 3z'></path><path d='M12 9v5'></path><path d='M12 17h.01'></path>",
  anchor: "<circle cx='12' cy='5' r='3'></circle><path d='M12 22V8'></path><path d='M5 12H2a10 10 0 0 0 20 0h-3'></path><path d='m5 12 3 3'></path><path d='m19 12-3 3'></path>",
  api: "<rect x='3' y='5' width='18' height='14' rx='2'></rect><path d='M7 9v6'></path><path d='M7 9h2.5a1.5 1.5 0 0 1 0 3H7'></path><path d='M12 15V9'></path><path d='M15 9v6'></path><path d='M18 9v6'></path>",
  architecture: "<rect x='3' y='4' width='7' height='6' rx='1'></rect><rect x='14' y='4' width='7' height='6' rx='1'></rect><rect x='8.5' y='15' width='7' height='6' rx='1'></rect><path d='M6.5 10v2.5h11V10'></path><path d='M12 12.5V15'></path>",
  artifact: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M9 13h6'></path><path d='M9 17h3'></path><path d='M16 16l3 3'></path><circle cx='15' cy='15' r='2'></circle>",
  archive: "<path d='M4 7h16'></path><path d='M6 7v12h12V7'></path><path d='M9 11h6'></path><path d='M5 4h14v3H5z'></path>",
  airForce: "<path d='M12 4 3 17l6-2 3 5 3-5 6 2-9-13z'></path><path d='M7 14h10'></path><path d='M9 17h6'></path><path d='M12 9v8'></path>",
  audit: "<path d='M7 3h10v4h3v14H4V7h3z'></path><path d='M9 3h6v4H9z'></path><path d='m8 14 2 2 4-5'></path><path d='M15 16h3'></path>",
  arrowDown: "<path d='M12 5v14'></path><path d='m6 13 6 6 6-6'></path>",
  arrowLeft: "<path d='M19 12H5'></path><path d='m12 19-7-7 7-7'></path>",
  arrowRight: "<path d='M5 12h14'></path><path d='m12 5 7 7-7 7'></path>",
  arrowUp: "<path d='M12 19V5'></path><path d='m6 11 6-6 6 6'></path>",
  army: "<path d='M12 3 4 7v6c0 4.8 3.2 7.4 8 9 4.8-1.6 8-4.2 8-9V7l-8-4z'></path><path d='m8 11 4-3 4 3'></path><path d='m8.5 15 3.5-2.5 3.5 2.5'></path><path d='M9 18h6'></path>",
  authorization: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M9.5 14.5 11.5 16.5 15.5 12.5'></path><circle cx='17' cy='17' r='3'></circle>",
  bell: "<path d='M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9'></path><path d='M10 21h4'></path>",
  baseline: "<path d='M4 6h16'></path><path d='M4 12h16'></path><path d='M4 18h10'></path><circle cx='17' cy='18' r='3'></circle><path d='m16 18 1 1 2-2'></path>",
  book: "<path d='M4 19.5A2.5 2.5 0 0 1 6.5 17H20'></path><path d='M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z'></path>",
  bot: "<rect x='5' y='8' width='14' height='10' rx='3'></rect><path d='M12 8V4'></path><circle cx='9' cy='13' r='1'></circle><circle cx='15' cy='13' r='1'></circle><path d='M9 18v2'></path><path d='M15 18v2'></path>",
  briefcase: "<rect x='3' y='7' width='18' height='13' rx='2'></rect><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path><path d='M3 12h18'></path><path d='M12 12v2'></path>",
  calendar: "<path d='M8 2v4'></path><path d='M16 2v4'></path><rect x='3' y='4' width='18' height='18' rx='2'></rect><path d='M3 10h18'></path>",
  certificate: "<circle cx='12' cy='8' r='5'></circle><path d='m8.5 12.5-1.5 8 5-3 5 3-1.5-8'></path><path d='m10 8 1.3 1.3L14 6.5'></path>",
  check: "<path d='m20 6-11 11-5-5'></path>",
  chevron: "<path d='m9 18 6-6-6-6'></path>",
  chevronDown: "<path d='m6 9 6 6 6-6'></path>",
  cisa: "<path d='M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4z'></path><path d='M8 12h8'></path><path d='M12 8v8'></path><circle cx='12' cy='12' r='6'></circle>",
  claim: "<path d='M5 4h14v16H5z'></path><path d='M8 8h8'></path><path d='M8 12h5'></path><path d='m8 16 2 2 5-5'></path>",
  close: "<path d='M18 6 6 18'></path><path d='m6 6 12 12'></path>",
  cloud: "<path d='M17.5 19H8a5 5 0 1 1 1.4-9.8A6 6 0 0 1 21 11.5 3.8 3.8 0 0 1 17.5 19z'></path>",
  columns: "<rect x='3' y='4' width='18' height='16' rx='2'></rect><path d='M9 4v16'></path><path d='M15 4v16'></path>",
  command: "<path d='M4 20V8l8-4 8 4v12'></path><path d='M8 20v-6h8v6'></path><path d='M9 9h6'></path><path d='M12 7v4'></path>",
  combatantCommand: "<path d='M12 3 4 7v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V7l-8-4z'></path><path d='M7 12h10'></path><path d='M12 7v10'></path><path d='m8.5 8.5 7 7'></path><path d='m15.5 8.5-7 7'></path>",
  component: "<rect x='4' y='4' width='7' height='7' rx='1'></rect><rect x='13' y='4' width='7' height='7' rx='1'></rect><rect x='4' y='13' width='7' height='7' rx='1'></rect><rect x='13' y='13' width='7' height='7' rx='1'></rect>",
  congress: "<path d='M3 21h18'></path><path d='M5 21V9l7-5 7 5v12'></path><path d='M8 12h8'></path><path d='M8 16h8'></path><path d='M10 21v-5h4v5'></path>",
  control: "<circle cx='12' cy='12' r='8'></circle><path d='M12 8v8'></path><path d='M8 12h8'></path><path d='M6.5 6.5 9 9'></path><path d='m15 15 2.5 2.5'></path>",
  connector: "<path d='M7 7h4'></path><path d='M13 17h4'></path><rect x='3' y='4' width='4' height='6' rx='1'></rect><rect x='17' y='14' width='4' height='6' rx='1'></rect><path d='M7 7c5 0 5 10 10 10'></path>",
  coastGuard: "<path d='M12 3 5 6v6c0 4.8 3.2 7.4 7 9 3.8-1.6 7-4.2 7-9V6l-7-3z'></path><path d='M8 12h8'></path><path d='M12 8v8'></path><path d='M9 17h6'></path>",
  controlMap: "<rect x='3' y='4' width='18' height='16' rx='2'></rect><path d='M3 10h18'></path><path d='M9 4v16'></path><path d='M15 4v16'></path><path d='M6 15h3'></path><path d='M15 15h3'></path><path d='M9 15h6'></path>",
  copy: "<rect x='9' y='9' width='13' height='13' rx='2'></rect><rect x='2' y='2' width='13' height='13' rx='2'></rect>",
  dashboard: "<rect x='3' y='4' width='18' height='16' rx='2'></rect><path d='M8 16v-4'></path><path d='M12 16V8'></path><path d='M16 16v-6'></path>",
  cyber: "<path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'></path><path d='M8 12h8'></path><path d='M12 8v8'></path>",
  database: "<ellipse cx='12' cy='5' rx='8' ry='3'></ellipse><path d='M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5'></path><path d='M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'></path>",
  dataModel: "<path d='M5 5h5v5H5z'></path><path d='M14 5h5v5h-5z'></path><path d='M9 14h6v5H9z'></path><path d='M10 7h4'></path><path d='M12 10v4'></path>",
  dna: "<path d='M7 3c8 5 8 13 0 18'></path><path d='M17 3c-8 5-8 13 0 18'></path><path d='M8.5 6h7'></path><path d='M6.8 10h10.4'></path><path d='M6.8 14h10.4'></path><path d='M8.5 18h7'></path>",
  defenseAgency: "<rect x='4' y='6' width='16' height='14' rx='2'></rect><path d='M8 6V4h8v2'></path><path d='M8 11h8'></path><path d='M8 15h8'></path><path d='M12 11v8'></path>",
  department: "<path d='M3 21h18'></path><path d='M5 21V9l7-5 7 5v12'></path><path d='M9 21v-7h6v7'></path><path d='M8 10h8'></path>",
  departmentOfWar: "<path d='M3 21h18'></path><path d='M4 9h16'></path><path d='m12 3 9 6H3l9-6z'></path><path d='M6 9v12'></path><path d='M10 9v12'></path><path d='M14 9v12'></path><path d='M18 9v12'></path>",
  dod: "<path d='M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4z'></path><path d='M12 7v10'></path><path d='M8 11h8'></path><path d='M9 16h6'></path>",
  download: "<path d='M12 3v12'></path><path d='m7 10 5 5 5-5'></path><path d='M5 21h14'></path>",
  directive: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M9 13h6'></path><path d='M9 17h6'></path><path d='M5 7h2'></path><path d='M5 11h2'></path>",
  echelon2: "<path d='M6 8h12'></path><path d='M8 13h8'></path><path d='M10 18h4'></path><path d='m12 3 6 5-6 5-6-5 6-5z'></path>",
  echelon3: "<path d='m12 3 7 4-7 4-7-4 7-4z'></path><path d='m5 12 7 4 7-4'></path><path d='m5 17 7 4 7-4'></path>",
  echelon4: "<path d='M4 5h16'></path><path d='M6 10h12'></path><path d='M8 15h8'></path><path d='M10 20h4'></path><circle cx='12' cy='5' r='2'></circle>",
  edit: "<path d='M12 20h9'></path><path d='m16.5 3.5 4 4L8 20H4v-4L16.5 3.5z'></path>",
  evidence: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M9 13h6'></path><path d='M9 17h4'></path><circle cx='17' cy='18' r='2'></circle>",
  eye: "<path d='M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'></path><circle cx='12' cy='12' r='3'></circle>",
  external: "<path d='M14 3h7v7'></path><path d='m10 14 11-11'></path><path d='M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5'></path>",
  expand: "<path d='M8 3H3v5'></path><path d='M16 3h5v5'></path><path d='M21 16v5h-5'></path><path d='M3 16v5h5'></path><path d='m3 3 7 7'></path><path d='m21 3-7 7'></path><path d='m21 21-7-7'></path><path d='m3 21 7-7'></path>",
  fileCode: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='m11 13-2 2 2 2'></path><path d='m15 13 2 2-2 2'></path>",
  fileCsv: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M9 13h6'></path><path d='M9 16h6'></path><path d='M9 19h4'></path>",
  fileJson: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M10 13c-1 0-1.5.7-1.5 2s-.5 2-1.5 2'></path><path d='M14 13c1 0 1.5.7 1.5 2s.5 2 1.5 2'></path>",
  filePdf: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M9 17v-5h2a1.5 1.5 0 0 1 0 3H9'></path><path d='M14 12v5h1.5a2.5 2.5 0 0 0 0-5H14'></path>",
  filter: "<path d='M3 5h18'></path><path d='M6 12h12'></path><path d='M10 19h4'></path>",
  federalRegister: "<path d='M4 20V8l8-5 8 5v12'></path><path d='M7 20v-8h10v8'></path><path d='M9 16h6'></path><path d='M9 12h6'></path><path d='M12 3v5'></path>",
  flag: "<path d='M5 21V4'></path><path d='M5 4h12l-2 4 2 4H5'></path>",
  focus: "<path d='M4 8V4h4'></path><path d='M20 8V4h-4'></path><path d='M4 16v4h4'></path><path d='M20 16v4h-4'></path>",
  folder: "<path d='M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'></path><path d='M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2'></path>",
  gavel: "<path d='m14 4 6 6'></path><path d='m4 14 6 6'></path><path d='m12 6 6 6-6 6-6-6z'></path><path d='M3 21h8'></path>",
  graph: "<circle cx='6' cy='6' r='3'></circle><circle cx='18' cy='6' r='3'></circle><circle cx='12' cy='18' r='3'></circle><path d='m8.5 7.5 7 0'></path><path d='m7.5 8.5 3.5 7'></path><path d='m16.5 8.5-3.5 7'></path>",
  hourglass: "<path d='M6 2h12'></path><path d='M6 22h12'></path><path d='M7 2v6a5 5 0 0 0 10 0V2'></path><path d='M7 22v-6a5 5 0 0 1 10 0v6'></path>",
  home: "<path d='m3 10 9-7 9 7'></path><path d='M5 10v10h14V10'></path><path d='M9 20v-6h6v6'></path>",
  inbox: "<path d='M4 4h16l2 10v6H2v-6z'></path><path d='M22 14h-5l-2 3H9l-2-3H2'></path>",
  implementation: "<path d='M4 18h16'></path><path d='M6 18V9l6-4 6 4v9'></path><path d='M9 18v-5h6v5'></path><path d='m8 8 4 3 4-3'></path>",
  installation: "<path d='M4 20V9l8-6 8 6v11'></path><path d='M8 20v-7h8v7'></path><path d='M9 10h6'></path><path d='M6 20h12'></path>",
  instruction: "<path d='M6 3h12v18H6z'></path><path d='M9 7h6'></path><path d='M9 11h6'></path><path d='M9 15h3'></path><path d='M16 17l2 2 3-4'></path>",
  intelligence: "<circle cx='12' cy='12' r='8'></circle><path d='M8 12h8'></path><path d='M12 8v8'></path><path d='M9 9l6 6'></path><path d='M15 9l-6 6'></path>",
  joint: "<circle cx='12' cy='12' r='8'></circle><path d='M12 4v16'></path><path d='M4 12h16'></path><path d='m7 7 10 10'></path><path d='m17 7-10 10'></path>",
  key: "<circle cx='7' cy='12' r='4'></circle><path d='M11 12h10'></path><path d='M17 12v3'></path><path d='M21 12v3'></path>",
  law: "<path d='M12 3v18'></path><path d='M5 7h14'></path><path d='m6 7-3 6h6L6 7z'></path><path d='m18 7-3 6h6l-3-6z'></path><path d='M7 21h10'></path>",
  layers: "<path d='m12 2 9 5-9 5-9-5 9-5z'></path><path d='m3 12 9 5 9-5'></path><path d='m3 17 9 5 9-5'></path>",
  lineItem: "<path d='M5 6h14'></path><path d='M5 12h14'></path><path d='M5 18h14'></path><circle cx='3' cy='6' r='1'></circle><circle cx='3' cy='12' r='1'></circle><circle cx='3' cy='18' r='1'></circle>",
  link: "<path d='M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2'></path><path d='M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2'></path>",
  lock: "<rect x='5' y='10' width='14' height='11' rx='2'></rect><path d='M8 10V7a4 4 0 0 1 8 0v3'></path>",
  localGov: "<path d='M4 20V9l8-5 8 5v11'></path><path d='M8 20v-7h8v7'></path><path d='M10 16h4'></path><path d='M7 9h10'></path>",
  logistics: "<rect x='3' y='7' width='12' height='10' rx='2'></rect><path d='M15 11h3l3 3v3h-6'></path><circle cx='7' cy='18' r='2'></circle><circle cx='18' cy='18' r='2'></circle><path d='M7 7V5h5v2'></path>",
  mail: "<rect x='3' y='5' width='18' height='14' rx='2'></rect><path d='m3 7 9 6 9-6'></path>",
  mapPin: "<path d='M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z'></path><circle cx='12' cy='10' r='3'></circle>",
  marineCorps: "<circle cx='12' cy='10' r='4'></circle><path d='M12 3v18'></path><path d='M7 17h10'></path><path d='m6 20 6-3 6 3'></path><path d='M8 10h8'></path><path d='M12 6v8'></path>",
  menu: "<path d='M4 6h16'></path><path d='M4 12h16'></path><path d='M4 18h16'></path>",
  message: "<path d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z'></path>",
  memo: "<path d='M5 4h14v16H5z'></path><path d='M8 8h8'></path><path d='M8 12h8'></path><path d='M8 16h5'></path><path d='M17 4v4h-4'></path>",
  mission: "<circle cx='12' cy='12' r='8'></circle><circle cx='12' cy='12' r='3'></circle><path d='M12 2v4'></path><path d='M12 18v4'></path><path d='M2 12h4'></path><path d='M18 12h4'></path>",
  microscope: "<path d='M6 18h12'></path><path d='M9 22h6'></path><path d='M12 18v4'></path><path d='m9 3 6 3-5 10-6-3z'></path><path d='m14 7 3 1.5'></path><path d='M15 13a5 5 0 0 1-5 5'></path>",
  minus: "<path d='M5 12h14'></path>",
  more: "<circle cx='5' cy='12' r='1'></circle><circle cx='12' cy='12' r='1'></circle><circle cx='19' cy='12' r='1'></circle>",
  molecule: "<circle cx='6' cy='12' r='2.5'></circle><circle cx='17' cy='6' r='2.5'></circle><circle cx='18' cy='18' r='2.5'></circle><circle cx='12' cy='13' r='2'></circle><path d='m8.2 10.8 6.6-3.6'></path><path d='m8.4 12.3 1.7.4'></path><path d='m13.6 14.4 2.3 2'></path>",
  nationalGuard: "<path d='M12 3 5 6v6c0 4.8 3.2 7.4 7 9 3.8-1.6 7-4.2 7-9V6l-7-3z'></path><path d='m12 7 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5L12 7z'></path>",
  navy: "<circle cx='12' cy='5' r='3'></circle><path d='M12 8v13'></path><path d='M6 11h12'></path><path d='M4 12c0 5 3.4 8 8 9 4.6-1 8-4 8-9'></path><path d='m7 15 3 3'></path><path d='m17 15-3 3'></path>",
  network: "<circle cx='6' cy='12' r='3'></circle><circle cx='18' cy='6' r='3'></circle><circle cx='18' cy='18' r='3'></circle><path d='m8.7 10.6 6.6-3.2'></path><path d='m8.7 13.4 6.6 3.2'></path>",
  nist: "<rect x='4' y='4' width='16' height='16' rx='2'></rect><path d='M8 16V8l8 8V8'></path><path d='M7 20v2'></path><path d='M17 20v2'></path>",
  obligation: "<rect x='5' y='3' width='14' height='18' rx='2'></rect><path d='M8 8h8'></path><path d='M8 12h5'></path><path d='m8 16 2 2 5-5'></path>",
  omb: "<path d='M4 20V9l8-5 8 5v11'></path><path d='M8 20v-8h8v8'></path><path d='M10 16h4'></path><path d='M8 9h8'></path>",
  org: "<rect x='3' y='8' width='18' height='13' rx='2'></rect><path d='M7 21v-5'></path><path d='M12 21v-5'></path><path d='M17 21v-5'></path><path d='M8 8V4h8v4'></path>",
  outbox: "<path d='M4 4h16l2 10v6H2v-6z'></path><path d='M22 14h-5l-2 3H9l-2-3H2'></path><path d='M12 12V6'></path><path d='m8 10 4-4 4 4'></path>",
  operations: "<path d='M12 2v4'></path><path d='M12 18v4'></path><path d='M2 12h4'></path><path d='M18 12h4'></path><circle cx='12' cy='12' r='4'></circle><path d='m15 9 3-3'></path><path d='m6 18 3-3'></path>",
  personnel: "<circle cx='9' cy='8' r='3'></circle><path d='M3 21a6 6 0 0 1 12 0'></path><path d='M17 8h4'></path><path d='M17 12h4'></path><path d='M17 16h3'></path>",
  parser: "<path d='M4 5h16'></path><path d='M6 5v14h12V5'></path><path d='M8 10h8'></path><path d='M8 14h4'></path><path d='m14 14 2 2 4-4'></path>",
  pause: "<path d='M8 5v14'></path><path d='M16 5v14'></path>",
  play: "<path d='m7 4 13 8-13 8V4z'></path>",
  plus: "<path d='M12 5v14'></path><path d='M5 12h14'></path>",
  policy: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M10 13h6'></path><path d='M10 17h6'></path>",
  program: "<rect x='3' y='7' width='18' height='13' rx='2'></rect><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path><circle cx='8' cy='14' r='1.5'></circle><circle cx='16' cy='14' r='1.5'></circle><path d='M9.5 14h5'></path>",
  quote: "<path d='M8 11H5a4 4 0 0 1 4-4v2a2 2 0 0 0-2 2h3v6H4v-6z'></path><path d='M18 11h-3a4 4 0 0 1 4-4v2a2 2 0 0 0-2 2h3v6h-6v-6z'></path>",
  reference: "<path d='M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2'></path><path d='M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2'></path><path d='M12 8h.01'></path><path d='M12 16h.01'></path>",
  refresh: "<path d='M20 6v6h-6'></path><path d='M4 18v-6h6'></path><path d='M18 12a6 6 0 0 0-10-4.5L4 11'></path><path d='M6 12a6 6 0 0 0 10 4.5L20 13'></path>",
  review: "<path d='M5 4h10l4 4v12H5z'></path><path d='M15 4v5h5'></path><path d='M8 13h5'></path><path d='M8 17h3'></path><circle cx='16.5' cy='16.5' r='3'></circle><path d='m15.2 16.5.9.9 1.7-1.8'></path>",
  rmf: "<path d='M12 3a9 9 0 0 1 8.5 6'></path><path d='M20 4v5h-5'></path><path d='M12 21a9 9 0 0 1-8.5-6'></path><path d='M4 20v-5h5'></path><circle cx='12' cy='12' r='3'></circle>",
  route: "<circle cx='6' cy='6' r='3'></circle><circle cx='18' cy='18' r='3'></circle><path d='M9 6h3a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h6'></path>",
  scale: "<path d='M12 3v18'></path><path d='M5 7h14'></path><path d='m6 7-3 6h6L6 7z'></path><path d='m18 7-3 6h6l-3-6z'></path>",
  search: "<circle cx='11' cy='11' r='7'></circle><path d='m16 16 4 4'></path>",
  secnav: "<path d='M12 3 5 7v5c0 4.7 3 7.4 7 9 4-1.6 7-4.3 7-9V7l-7-4z'></path><path d='M12 7v10'></path><path d='M8 12h8'></path><path d='m9 17 3-2 3 2'></path>",
  sealAirForce: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M12 7 5.5 15l4.2-1.4L12 17l2.3-3.4 4.2 1.4L12 7z'></path><path d='M8.5 16.8h7'></path><path d='M9.5 19h5'></path>",
  sealArmy: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='m12 6.5 1.6 3.2 3.5.5-2.5 2.4.6 3.5-3.2-1.7-3.2 1.7.6-3.5-2.5-2.4 3.5-.5L12 6.5z'></path><path d='M7.5 19h9'></path>",
  sealCisa: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M12 6.5 7.5 8.4v3.2c0 3 2 4.9 4.5 5.9 2.5-1 4.5-2.9 4.5-5.9V8.4L12 6.5z'></path><path d='M8.5 12h7'></path><path d='M12 8.8v6.4'></path>",
  sealCoastGuard: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M12 6.5 8 8.2v3.7c0 2.8 1.8 4.6 4 5.6 2.2-1 4-2.8 4-5.6V8.2l-4-1.7z'></path><path d='M8 13h8'></path><path d='m8.5 16 1.7-1 1.8 1 1.8-1 1.7 1'></path>",
  sealCongress: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M7 17h10'></path><path d='M8 17v-5l4-3 4 3v5'></path><path d='M9 12h6'></path><path d='M10.5 17v-3h3v3'></path>",
  sealDepartmentOfWar: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='m12 6.5 6 4H6l6-4z'></path><path d='M7 17.5h10'></path><path d='M8.5 10.5v7'></path><path d='M12 10.5v7'></path><path d='M15.5 10.5v7'></path>",
  sealDisa: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><rect x='8' y='10' width='8' height='6' rx='1'></rect><path d='M10 10V8h4v2'></path><path d='M10 13h4'></path><path d='M7 18h10'></path>",
  sealDod: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M12 6.5 7.8 8.3v3c0 3 1.8 5 4.2 6 2.4-1 4.2-3 4.2-6v-3L12 6.5z'></path><path d='M12 9v5.5'></path><path d='M9.8 12h4.4'></path>",
  sealFederalRegister: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M8 17V9.5l4-3 4 3V17'></path><path d='M9.5 12h5'></path><path d='M9.5 15h5'></path><path d='M12 6.5v3'></path>",
  sealJoint: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M12 6v12'></path><path d='M6 12h12'></path><path d='m7.8 7.8 8.4 8.4'></path><path d='m16.2 7.8-8.4 8.4'></path>",
  sealMarineCorps: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><circle cx='12' cy='11' r='3.3'></circle><path d='M12 6.7v10.6'></path><path d='M8.2 16.5h7.6'></path><path d='m8 18 4-2 4 2'></path><path d='M9 11h6'></path>",
  sealNationalGuard: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M12 6.5 8 8.2v3.4c0 2.9 1.7 4.7 4 5.8 2.3-1.1 4-2.9 4-5.8V8.2l-4-1.7z'></path><path d='m12 9 1 2.1 2.3.3-1.6 1.6.4 2.2-2.1-1.1-2.1 1.1.4-2.2-1.6-1.6 2.3-.3L12 9z'></path>",
  sealNavy: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><circle cx='12' cy='8' r='1.8'></circle><path d='M12 9.8v7.2'></path><path d='M8.2 12h7.6'></path><path d='M8 13c0 3 2.2 4.3 4 5.2 1.8-.9 4-2.2 4-5.2'></path><path d='m9.3 15 1.4 1.2'></path><path d='m14.7 15-1.4 1.2'></path>",
  sealNist: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M8.5 16V8l7 8V8'></path><path d='M7 18h10'></path><path d='M7.5 6.5h1'></path><path d='M15.5 6.5h1'></path>",
  sealNsa: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M8 16.5V10h8v6.5'></path><path d='M9.5 10V8.5a2.5 2.5 0 0 1 5 0V10'></path><circle cx='12' cy='13.2' r='1'></circle><path d='M12 14.2v1.5'></path>",
  sealOmb: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M8 17V9.5l4-2.7 4 2.7V17'></path><path d='M9.5 12h5'></path><path d='M10 17v-3h4v3'></path><path d='M7 17h10'></path>",
  sealSecnav: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M12 6.5 8.2 8.4v3.1c0 3 1.7 4.9 3.8 5.9 2.1-1 3.8-2.9 3.8-5.9V8.4L12 6.5z'></path><path d='M12 9v6'></path><path d='M9.5 12h5'></path><path d='m10 16 2-1.3 2 1.3'></path>",
  sealSpaceForce: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><path d='M12 5.8 9.5 12 12 18.2 14.5 12 12 5.8z'></path><path d='M7 14c2-3 8-3 10 0'></path><path d='M8.5 17c2-1.6 5-1.6 7 0'></path><circle cx='12' cy='12' r='1'></circle>",
  sealWhs: "<circle cx='12' cy='12' r='9'></circle><circle cx='12' cy='12' r='6.5'></circle><rect x='8' y='8' width='8' height='8' rx='1'></rect><path d='M10 10h4'></path><path d='M10 12.5h4'></path><path d='M10 15h2'></path><path d='M12 8V6.5'></path>",
  serviceBranch: "<path d='m12 3 8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z'></path><path d='M8 12h8'></path><path d='M12 8v8'></path>",
  server: "<rect x='4' y='3' width='16' height='7' rx='2'></rect><rect x='4' y='14' width='16' height='7' rx='2'></rect><path d='M8 7h.01'></path><path d='M8 18h.01'></path>",
  settings: "<circle cx='12' cy='12' r='3'></circle><path d='M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-1.9.3l-.3.2-3.4-2 .1-.3a1.7 1.7 0 0 0-.3-1.9l-.2-.2-3.7 0-.2.2a1.7 1.7 0 0 0-.3 1.9l.1.3-3.4 2-.3-.2a1.7 1.7 0 0 0-1.9-.3l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9l-.1-.3V9.3l.1-.3A1.7 1.7 0 0 0 1.9 7l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 1.9-.3l.3-.2 3.4 2-.1.3a1.7 1.7 0 0 0 .3 1.9l.2.2h3.7l.2-.2a1.7 1.7 0 0 0 .3-1.9l-.1-.3 3.4-2 .3.2a1.7 1.7 0 0 0 1.9.3l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9l.1.3v5.4z'></path>",
  shield: "<path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'></path><path d='m9 12 2 2 4-4'></path>",
  sitemap: "<path d='M12 4v5'></path><rect x='9' y='2' width='6' height='4' rx='1'></rect><rect x='3' y='14' width='6' height='4' rx='1'></rect><rect x='15' y='14' width='6' height='4' rx='1'></rect><path d='M6 14v-3h12v3'></path>",
  sop: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M9 12h6'></path><path d='M9 16h6'></path><path d='M9 20h3'></path>",
  sort: "<path d='M8 7h12'></path><path d='M8 12h8'></path><path d='M8 17h4'></path><path d='M4 6v12'></path><path d='m2 8 2-2 2 2'></path><path d='m2 16 2 2 2-2'></path>",
  source: "<path d='M5 4h14v16H5z'></path><path d='M8 8h8'></path><path d='M8 12h8'></path><path d='M8 16h4'></path><circle cx='17' cy='17' r='3'></circle>",
  sourcePortal: "<rect x='3' y='5' width='18' height='14' rx='2'></rect><path d='M3 9h18'></path><path d='M8 13h3'></path><path d='M13 13h3'></path><path d='M8 16h8'></path>",
  spaceForce: "<path d='M12 2 8.5 11 12 22l3.5-11L12 2z'></path><path d='M4 14c3-5 13-5 16 0'></path><path d='M6 18c3-3 9-3 12 0'></path><circle cx='12' cy='12' r='2'></circle>",
  star: "<path d='m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3z'></path>",
  statute: "<path d='M6 4h12v16H6z'></path><path d='M9 8h6'></path><path d='M9 12h6'></path><path d='M9 16h4'></path><path d='M4 20h16'></path>",
  supersession: "<path d='M7 7h10'></path><path d='m14 4 3 3-3 3'></path><path d='M17 17H7'></path><path d='m10 14-3 3 3 3'></path><path d='M6 4h12'></path><path d='M6 20h12'></path>",
  sync: "<path d='M21 12a9 9 0 0 0-15.5-6.3L3 8'></path><path d='M3 3v5h5'></path><path d='M3 12a9 9 0 0 0 15.5 6.3L21 16'></path><path d='M21 21v-5h-5'></path>",
  table: "<rect x='3' y='4' width='18' height='16' rx='2'></rect><path d='M3 10h18'></path><path d='M9 4v16'></path>",
  task: "<rect x='4' y='4' width='16' height='16' rx='2'></rect><path d='m8 9 1.5 1.5L12 8'></path><path d='M14 9h3'></path><path d='m8 15 1.5 1.5L12 14'></path><path d='M14 15h3'></path>",
  terminal: "<rect x='3' y='4' width='18' height='16' rx='2'></rect><path d='m7 9 3 3-3 3'></path><path d='M12 15h5'></path>",
  timeline: "<path d='M4 5v14'></path><circle cx='4' cy='7' r='2'></circle><circle cx='4' cy='17' r='2'></circle><path d='M8 7h12'></path><path d='M8 17h12'></path><path d='M12 12h8'></path>",
  trash: "<path d='M3 6h18'></path><path d='M8 6V4h8v2'></path><path d='M6 6l1 15h10l1-15'></path><path d='M10 11v6'></path><path d='M14 11v6'></path>",
  trend: "<path d='M3 17 9 11l4 4 8-8'></path><path d='M14 7h7v7'></path>",
  unlock: "<rect x='5' y='10' width='14' height='11' rx='2'></rect><path d='M8 10V7a4 4 0 0 1 7.5-2'></path>",
  upload: "<path d='M12 21V9'></path><path d='m7 14 5-5 5 5'></path><path d='M5 3h14'></path>",
  user: "<circle cx='12' cy='8' r='4'></circle><path d='M4 21a8 8 0 0 1 16 0'></path>",
  users: "<circle cx='9' cy='8' r='3'></circle><path d='M3 21a6 6 0 0 1 12 0'></path><circle cx='17' cy='9' r='2.5'></circle><path d='M14 18a5 5 0 0 1 7 3'></path>",
  waiver: "<path d='M7 3h7l4 4v14H7z'></path><path d='M14 3v5h5'></path><path d='M9 14h6'></path><path d='m10 18 4-4'></path><path d='m14 18-4-4'></path>",
  wand: "<path d='M15 4 4 15'></path><path d='m14 5 5 5'></path><path d='m5 14 5 5'></path><path d='M19 3v4'></path><path d='M21 5h-4'></path><path d='M6 3v3'></path><path d='M7.5 4.5h-3'></path>",
  whs: "<rect x='4' y='5' width='16' height='14' rx='2'></rect><path d='M8 9h8'></path><path d='M8 13h8'></path><path d='M8 17h4'></path><path d='M12 5V3'></path><path d='M9 3h6'></path>",
  workflow: "<rect x='3' y='4' width='6' height='5' rx='1'></rect><rect x='15' y='4' width='6' height='5' rx='1'></rect><rect x='9' y='15' width='6' height='5' rx='1'></rect><path d='M9 6.5h6'></path><path d='M18 9v3a3 3 0 0 1-3 3'></path><path d='M6 9v3a3 3 0 0 0 3 3'></path>",
  zap: "<path d='M13 2 4 14h7l-1 8 10-13h-7z'></path>",
  warning: "<path d='M12 3 2.5 20h19L12 3z'></path><path d='M12 9v5'></path><path d='M12 17h.01'></path>"
};

function qs(selector, root = document) {
  return root?.querySelector?.(selector) || null;
}

function qsa(selector, root = document) {
  return root?.querySelectorAll ? Array.from(root.querySelectorAll(selector)) : [];
}

function getTextContentWithoutFormControls(element) {
  if (!element) return "";
  const clone = element.cloneNode(true);
  clone.querySelectorAll("input, select, textarea, button, output, svg").forEach((child) => child.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

function hasControlAccessibleName(control) {
  if (!control) return true;
  if ((control.getAttribute("aria-label") || "").trim()) return true;
  if ((control.getAttribute("title") || "").trim()) return true;
  const labelledBy = (control.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
  if (labelledBy.some((id) => (document.getElementById(id)?.textContent || "").trim())) return true;
  if ("labels" in control && control.labels?.length) {
    return Array.from(control.labels).some((label) => getTextContentWithoutFormControls(label));
  }
  return false;
}

function inferControlAccessibleName(control) {
  const explicitLabel = control.closest("label");
  const labelText = getTextContentWithoutFormControls(explicitLabel);
  if (labelText) return labelText;

  const field = control.closest(".if-field, .if-config-control, .if-chart-control, .if-customization-control-group, .if-range, .if-filter-group");
  const fieldLabel = field && qs(".if-field__label, .if-config-control__label, .if-chart-control__label, .if-customization-label, .if-filter-group__title", field);
  const fieldLabelText = getTextContentWithoutFormControls(fieldLabel);
  if (fieldLabelText) return fieldLabelText;

  const table = control.closest("table");
  if (table) {
    const cell = control.closest("td, th");
    const row = control.closest("tr");
    const columnIndex = cell ? Array.from(cell.parentElement?.children || []).indexOf(cell) : -1;
    const header = columnIndex >= 0 ? qs(`thead th:nth-child(${columnIndex + 1})`, table) : null;
    const rowTitle = row && (qs("strong, .if-row-title", row)?.textContent || "").trim();
    const headerText = getTextContentWithoutFormControls(header);
    if (headerText && rowTitle) return `${headerText} for ${rowTitle}`;
    if (headerText) return headerText;
  }

  if (control.placeholder) return control.placeholder;
  if (control.matches("[type='range']")) return "Range value";
  if (control.matches("[type='number']")) return "Numeric value";
  if (control.matches("[type='search']")) return "Search";
  if (control.matches("[type='date']")) return "Date";
  if (control.matches("[type='checkbox']")) return "Toggle option";
  if (control.matches("[type='radio']")) return "Select option";
  return "";
}

function hydrateAccessibilityContracts(root = document) {
  qsa("input, select, textarea", root).forEach((control) => {
    if (hasControlAccessibleName(control)) return;
    const name = inferControlAccessibleName(control);
    if (name) control.setAttribute("aria-label", name);
  });
}

function getTarget(control, attr = "target") {
  const selector = control.dataset[attr] || control.getAttribute("href") || control.getAttribute("aria-controls");
  if (!selector) return null;
  if (selector.startsWith("#") || selector.startsWith(".")) return qs(selector);
  return document.getElementById(selector);
}

const themeStorageKey = "interface-framework-theme";
const defaultTheme = "light";
const themeLabels = {
  system: "System",
  light: "Light",
  dark: "Dark",
  midnight: "Midnight",
  "high-contrast": "High contrast",
  calm: "Calm",
  executive: "Executive"
};

function normalizeTheme(theme) {
  const value = String(theme || defaultTheme).trim().toLowerCase();
  if (!value || value === "default") return defaultTheme;
  if (value === "auto") return "system";
  if (value === "contrast" || value === "highcontrast" || value === "high_contrast") return "high-contrast";
  return value;
}

function getStoredTheme() {
  try {
    return normalizeTheme(window.localStorage?.getItem(themeStorageKey) || defaultTheme);
  } catch {
    return defaultTheme;
  }
}

function storeTheme(theme) {
  try {
    if (theme === defaultTheme) window.localStorage?.removeItem(themeStorageKey);
    else window.localStorage?.setItem(themeStorageKey, theme);
  } catch {
    // Storage may be unavailable in embedded or privacy-restricted contexts.
  }
}

function getThemeTarget(control = null) {
  if (control?.dataset?.ifThemeTarget) return getTarget(control, "ifThemeTarget") || document.documentElement;
  return document.documentElement;
}

function applyThemeToTarget(target, theme) {
  const normalized = normalizeTheme(theme);
  if (!target) return normalized;
  target.setAttribute("data-theme", normalized);
  target.dataset.ifThemePreference = normalized;
  return normalized;
}

function getTheme(target = document.documentElement) {
  const attr = target?.getAttribute?.("data-theme");
  return normalizeTheme(attr || target?.dataset?.ifThemePreference || getStoredTheme());
}

function updateThemeControls(root = document, activeTheme = getTheme()) {
  const normalized = normalizeTheme(activeTheme);
  qsa("[data-if-theme], [data-if-theme-control]", root).forEach((control) => {
    const value = normalizeTheme(control.dataset.ifTheme || control.value || "system");
    const active = value === normalized;
    if (control.matches("button, [role='button']")) {
      setPressed(control, active);
    } else if (control.matches("input[type='radio'], input[type='checkbox']")) {
      control.checked = active;
    } else if (control.matches("select")) {
      control.value = normalized;
    }
  });
  qsa("[data-if-theme-label]", root).forEach((label) => {
    label.textContent = themeLabels[normalized] || normalized;
  });
}

function setTheme(theme, options = {}) {
  const target = options.target || document.documentElement;
  const normalized = applyThemeToTarget(target, theme);
  if (options.persist !== false && target === document.documentElement) storeTheme(normalized);
  updateThemeControls(options.root || document, normalized);
  target.dispatchEvent(new CustomEvent("if:theme-change", {
    bubbles: true,
    detail: { theme: normalized, target }
  }));
  return normalized;
}

function hydrateThemeControls(root = document) {
  if (root === document || root === document.documentElement || root === document.body) {
    const hasInlineTheme = document.documentElement.hasAttribute("data-theme");
    const initial = hasInlineTheme
      ? getTheme(document.documentElement)
      : getStoredTheme();
    setTheme(initial, { persist: !hasInlineTheme && initial !== defaultTheme, root });
  }
  qsa("[data-if-theme-control]", root).forEach((control) => {
    if (control.matches("select") && !control.value) control.value = getTheme(getThemeTarget(control));
  });
  updateThemeControls(root, getTheme());
}

function setPressed(control, pressed, activeClass = "is-active") {
  if (!control) return;
  const active = Boolean(pressed);
  control.setAttribute("aria-pressed", String(active));
  control.classList.toggle(activeClass, active);
}

function setSelected(control, selected, options = {}) {
  if (!control) return;
  const active = Boolean(selected);
  control.setAttribute("aria-selected", String(active));
  control.classList.toggle(options.activeClass || "is-active", active);
  control.classList.toggle(options.selectedClass || "is-selected", active);
  if (options.roving) control.tabIndex = active ? 0 : -1;
}

function setExpanded(control, expanded) {
  if (!control) return;
  const active = Boolean(expanded);
  control.setAttribute("aria-expanded", String(active));
  control.classList.toggle("is-expanded", active);
}

function setDisclosureState(control, target, expanded, options = {}) {
  const active = Boolean(expanded);
  setExpanded(control, active);
  if (control) {
    control.classList.toggle(options.activeClass || "is-active", active);
    if (options.pressed) control.setAttribute("aria-pressed", String(active));
  }
  if (target) {
    target.hidden = !active;
    target.classList.toggle(options.openClass || "is-open", active);
    target.setAttribute("aria-hidden", String(!active));
  }
  return active;
}

function closePopover(trigger) {
  const target = getTarget(trigger, "ifPopoverToggle");
  setDisclosureState(trigger, target, false);
}

function closePopovers(except = null) {
  qsa("[data-if-popover-toggle][aria-expanded='true']").forEach((trigger) => {
    if (trigger !== except) closePopover(trigger);
  });
}

function getMenuItems(menu) {
  return qsa("[data-if-menu-item], [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox']", menu)
    .filter((item) => !item.disabled && !item.hidden);
}

function getMenuTrigger(menu) {
  return qsa("[data-if-menu-toggle]").find((trigger) => getTarget(trigger, "ifMenuToggle") === menu);
}

function syncMenuFocus(menu, activeItem = null) {
  const items = getMenuItems(menu);
  const active = activeItem || qs(".is-selected", menu) || items[0];
  items.forEach((item) => {
    item.tabIndex = item === active ? 0 : -1;
  });
  return active;
}

function focusMenuItem(menu, itemOrIndex = 0) {
  const items = getMenuItems(menu);
  if (!items.length) return null;
  const item = typeof itemOrIndex === "number"
    ? items[(itemOrIndex + items.length) % items.length]
    : itemOrIndex;
  if (!item) return null;
  syncMenuFocus(menu, item);
  item.focus();
  return item;
}

function openMenu(trigger, options = {}) {
  const target = getTarget(trigger, "ifMenuToggle");
  if (!target) return;
  closeMenus(trigger);
  setDisclosureState(trigger, target, true);
  const items = getMenuItems(target);
  const index = options.focus === "last" ? items.length - 1 : 0;
  const selected = options.focus === "selected" ? qs(".is-selected", target) : null;
  focusMenuItem(target, selected || index);
}

function closeMenu(trigger, options = {}) {
  const target = getTarget(trigger, "ifMenuToggle");
  setDisclosureState(trigger, target, false);
  if (target) {
    syncMenuFocus(target);
  }
  if (options.restoreFocus) trigger.focus();
}

function closeMenus(except = null) {
  qsa("[data-if-menu-toggle][aria-expanded='true']").forEach((trigger) => {
    if (trigger !== except) closeMenu(trigger);
  });
}

function toggleMenu(trigger) {
  const target = getTarget(trigger, "ifMenuToggle");
  if (!target) return;
  const expanded = trigger.getAttribute("aria-expanded") === "true";
  if (expanded) {
    closeMenu(trigger);
  } else {
    openMenu(trigger, { focus: "selected" });
  }
}

function togglePopover(trigger) {
  const target = getTarget(trigger, "ifPopoverToggle");
  if (!target) return;
  const expanded = trigger.getAttribute("aria-expanded") === "true";
  closePopovers(trigger);
  setDisclosureState(trigger, target, !expanded);
}

function showToast(message, icon = "check") {
  const stack = qs(".if-toast-stack") || (() => {
    const node = document.createElement("div");
    node.className = "if-toast-stack";
    node.setAttribute("aria-live", "polite");
    document.body.append(node);
    return node;
  })();
  const toast = document.createElement("div");
  toast.className = "if-toast";
  toast.innerHTML = `<span class="if-icon-slot" data-if-icon="${icon}" aria-hidden="true"></span><div><strong>${message}</strong><span>Mock interaction completed.</span></div>`;
  stack.append(toast);
  hydrateIcons(toast);
  window.setTimeout(() => {
    toast.remove();
    if (!stack.children.length) stack.remove();
  }, 2600);
}

function dispatchFrameworkEvent(target, name, detail = {}) {
  target?.dispatchEvent?.(new CustomEvent(name, {
    bubbles: true,
    detail
  }));
}

function normalizeAdapterState(state, fallback = "success") {
  const raw = String(state || fallback || "success").trim().toLowerCase().replace(/[_\s]+/g, "-");
  const normalized = adapterStateAliases[raw] || raw;
  if (adapterStates.has(normalized)) return normalized;
  const fallbackRaw = String(fallback || "success").trim().toLowerCase().replace(/[_\s]+/g, "-");
  const fallbackNormalized = adapterStateAliases[fallbackRaw] || fallbackRaw;
  return adapterStates.has(fallbackNormalized) ? fallbackNormalized : "success";
}

function setAdapterState(target, state, detail = {}) {
  if (!target) return normalizeAdapterState(state);
  const normalized = normalizeAdapterState(state);
  target.dataset.ifAdapterState = normalized;
  if (detail.channel) target.dataset.ifAdapterChannel = String(detail.channel);
  if (detail.requestId) target.dataset.ifAdapterRequest = String(detail.requestId);
  adapterStates.forEach((item) => {
    target.classList?.toggle?.(`is-adapter-${item}`, item === normalized);
  });
  qsa("[data-if-adapter-state]", target).forEach((panel) => {
    const states = String(panel.dataset.ifAdapterState || "").split(/\s+/).filter(Boolean);
    panel.hidden = !states.includes(normalized);
  });
  qsa("[data-if-adapter-status]", target).forEach((status) => {
    const channel = status.dataset.ifAdapterStatus;
    if (channel && detail.channel && channel !== detail.channel) return;
    status.textContent = detail.message || normalized;
  });
  dispatchFrameworkEvent(target, "if:adapter-state", {
    ...detail,
    state: normalized,
    target
  });
  return normalized;
}

function getAdapterState(target) {
  return normalizeAdapterState(target?.dataset?.ifAdapterState || "idle", "idle");
}

function normalizeAdapterChannel(channel = "adapter") {
  const normalized = String(channel || "adapter").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || "adapter";
}

function getAdapterTaskStore(target) {
  if (!target) return null;
  if (!adapterTaskRequests.has(target)) adapterTaskRequests.set(target, new Map());
  return adapterTaskRequests.get(target);
}

function createAdapterTaskRequestId(channel = "adapter") {
  return `${normalizeAdapterChannel(channel)}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getAdapterTaskRunner(adapter, method = "") {
  if (typeof adapter === "function") return adapter;
  if (!adapter || typeof adapter !== "object") return null;
  const preferred = method && typeof adapter[method] === "function" ? adapter[method] : null;
  if (preferred) return preferred.bind(adapter);
  return ["run", "request", "load", "search", "fetch", "export", "save"].map((name) => (
    typeof adapter[name] === "function" ? adapter[name].bind(adapter) : null
  )).find(Boolean) || null;
}

function getAdapterResultCount(result) {
  if (Array.isArray(result)) return result.length;
  if (!result || typeof result !== "object") return 0;
  return ["rows", "items", "nodes", "edges", "annotations", "records", "results", "data"].reduce((count, key) => {
    const value = result[key];
    if (Array.isArray(value)) return Math.max(count, value.length);
    if (value && typeof value === "object" && !Array.isArray(value)) return Math.max(count, Object.keys(value).length);
    if (typeof value === "string") return Math.max(count, value.trim() ? 1 : 0);
    return count;
  }, 0);
}

function getAdapterTaskResultState(result, options = {}) {
  if (typeof options.getState === "function") return normalizeAdapterState(options.getState(result), "success");
  if (Array.isArray(result)) return result.length ? "success" : "empty";
  if (result?.state) return normalizeAdapterState(result.state, getAdapterResultCount(result) ? "success" : "empty");
  if (result?.empty === true) return "empty";
  return getAdapterResultCount(result) || result ? "success" : "empty";
}

function dispatchAdapterTaskEvent(target, channel, phase, detail = {}, options = {}) {
  dispatchFrameworkEvent(target, adapterTaskEvents[phase] || `if:adapter-${phase}`, detail);
  const scopedPrefix = options.eventPrefix || channel;
  if (scopedPrefix) dispatchFrameworkEvent(target, `if:${normalizeAdapterChannel(scopedPrefix)}-${phase}`, detail);
}

function getAdapterTaskState(target, channel = "") {
  if (!target) return null;
  const store = adapterTaskRequests.get(target);
  const tasks = store ? Array.from(store.entries()).map(([key, task]) => ({
    channel: key,
    requestId: task.requestId,
    pending: !task.controller.signal.aborted,
    startedAt: task.startedAt
  })) : [];
  if (channel) {
    const normalized = normalizeAdapterChannel(channel);
    return {
      channel: normalized,
      state: getAdapterState(target),
      task: tasks.find((task) => task.channel === normalized) || null,
      target
    };
  }
  return {
    state: getAdapterState(target),
    tasks,
    target
  };
}

function cancelAdapterTask(target, channel = "", reason = "cancelled", options = {}) {
  if (!target) return false;
  const store = adapterTaskRequests.get(target);
  if (!store) return false;
  const channels = channel ? [normalizeAdapterChannel(channel)] : Array.from(store.keys());
  let cancelled = false;
  channels.forEach((key) => {
    const task = store.get(key);
    if (!task) return;
    cancelled = true;
    task.adapter?.cancel?.({
      ...task.context,
      channel: key,
      reason,
      requestId: task.requestId,
      target
    });
    task.controller.abort(reason);
    store.delete(key);
    if (!options.silent) {
      const detail = {
        ...task.context,
        channel: key,
        elapsedMs: Math.round(getPerformanceNow() - task.startedAt),
        message: options.message || "Request cancelled",
        reason,
        requestId: task.requestId,
        target
      };
      setAdapterState(target, "cancelled", detail);
      dispatchAdapterTaskEvent(target, key, "cancel", detail, options);
    }
  });
  if (!store.size) adapterTaskRequests.delete(target);
  return cancelled;
}

function runAdapterTask(target, adapter, context = {}, options = {}) {
  const element = typeof target === "string" ? qs(target) : target;
  if (!element) return Promise.resolve(null);
  const runner = getAdapterTaskRunner(adapter, options.method);
  const channel = normalizeAdapterChannel(options.channel || context.channel || "adapter");
  if (!runner) {
    const error = new TypeError("Adapter task requires a function or an object with run/request/load/search/fetch/export/save.");
    setAdapterState(element, "error", { channel, error, message: error.message, requestId: context.requestId || "" });
    dispatchAdapterTaskEvent(element, channel, "error", { channel, error, requestId: context.requestId || "", target: element }, options);
    return Promise.reject(error);
  }
  cancelAdapterTask(element, channel, "superseded", { ...options, message: options.cancelMessage || "Previous request cancelled" });
  const controller = options.controller || new AbortController();
  const requestId = context.requestId || options.requestId || createAdapterTaskRequestId(channel);
  const startedAt = getPerformanceNow();
  const request = {
    ...context,
    channel,
    requestId,
    signal: controller.signal,
    target: element
  };
  const store = getAdapterTaskStore(element);
  store.set(channel, {
    adapter,
    context,
    controller,
    requestId,
    startedAt
  });
  setAdapterState(element, "loading", {
    ...options.loadingDetail,
    channel,
    message: options.loadingMessage || "Loading...",
    requestId,
    target: element
  });
  dispatchAdapterTaskEvent(element, channel, "request", request, options);
  return Promise.resolve()
    .then(() => runner(request))
    .then(async (result = {}) => {
      const current = adapterTaskRequests.get(element)?.get(channel);
      if (current?.requestId !== requestId || controller.signal.aborted) return null;
      if (typeof options.onResult === "function") await options.onResult(result, request);
      const state = getAdapterTaskResultState(result, options);
      const elapsedMs = Math.round(getPerformanceNow() - startedAt);
      const detail = {
        ...request,
        elapsedMs,
        message: result?.message || options.successMessage || (state === "empty" ? "No results returned" : "Request complete"),
        result,
        state
      };
      setAdapterState(element, state, detail);
      adapterTaskRequests.get(element)?.delete(channel);
      if (!adapterTaskRequests.get(element)?.size) adapterTaskRequests.delete(element);
      dispatchAdapterTaskEvent(element, channel, "result", detail, options);
      return detail;
    })
    .catch((error) => {
      const current = adapterTaskRequests.get(element)?.get(channel);
      if (current?.requestId !== requestId) return null;
      const elapsedMs = Math.round(getPerformanceNow() - startedAt);
      if (isAbortError(error) || controller.signal.aborted) {
        const detail = {
          ...request,
          elapsedMs,
          error,
          message: options.cancelMessage || "Request cancelled",
          reason: controller.signal.reason || "aborted",
          state: "cancelled"
        };
        setAdapterState(element, "cancelled", detail);
        dispatchAdapterTaskEvent(element, channel, "cancel", detail, options);
        return detail;
      }
      const detail = {
        ...request,
        elapsedMs,
        error,
        message: error?.message || options.errorMessage || "Request failed",
        state: "error"
      };
      setAdapterState(element, "error", detail);
      dispatchAdapterTaskEvent(element, channel, "error", detail, options);
      return detail;
    })
    .finally(() => {
      const storeAfter = adapterTaskRequests.get(element);
      if (storeAfter?.get(channel)?.requestId === requestId) storeAfter.delete(channel);
      if (storeAfter && !storeAfter.size) adapterTaskRequests.delete(element);
    });
}

function getPerformanceProfile(name = "balanced") {
  const profiles = {
    mobile: {
      label: "Mobile smoke",
      tableRows: 240,
      graphNodes: 42,
      graphEdges: 68,
      diagramNodes: 30,
      docLines: 220,
      chartPoints: 32,
      budgets: { table: 45, graph: 60, diagram: 55, document: 55, charts: 45, total: 220, overflowFailures: 0, pageOverflowPx: 2 }
    },
    balanced: {
      label: "Balanced",
      tableRows: 520,
      graphNodes: 72,
      graphEdges: 128,
      diagramNodes: 48,
      docLines: 420,
      chartPoints: 56,
      budgets: { table: 70, graph: 85, diagram: 70, document: 75, charts: 60, total: 300, overflowFailures: 0, pageOverflowPx: 2 }
    },
    large: {
      label: "Large data",
      tableRows: 1500,
      graphNodes: 132,
      graphEdges: 264,
      diagramNodes: 84,
      docLines: 980,
      chartPoints: 112,
      budgets: { table: 110, graph: 130, diagram: 105, document: 110, charts: 95, total: 520, overflowFailures: 0, pageOverflowPx: 2 }
    }
  };
  return profiles[name] || profiles.balanced;
}

function getPerformanceNow() {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function evaluatePerformanceBudgets(profile, sections = {}, overflow = {}, totalMs = 0) {
  const profileBudgets = profile?.budgets || {};
  const sectionBudgets = {};
  const failures = [];
  const warnings = [];

  Object.entries(sections).forEach(([key, value]) => {
    const limit = Number.parseFloat(profileBudgets[key] || profileBudgets.total || 0);
    const ms = Number.parseFloat(value?.ms || 0);
    const passed = limit <= 0 || ms <= limit;
    sectionBudgets[key] = {
      count: value?.count || 0,
      ms,
      limit,
      state: passed ? "pass" : "fail"
    };
    if (!passed) failures.push({ type: "section", key, ms, limit });
  });

  const totalLimit = Number.parseFloat(profileBudgets.total || 0);
  const totalPassed = totalLimit <= 0 || totalMs <= totalLimit;
  if (!totalPassed) failures.push({ type: "total", key: "total", ms: totalMs, limit: totalLimit });

  const overflowLimit = Number.parseInt(profileBudgets.overflowFailures ?? 0, 10);
  const overflowFailures = Array.isArray(overflow.failures) ? overflow.failures.length : 0;
  const overflowPassed = overflowFailures <= overflowLimit;
  if (!overflowPassed) {
    failures.push({ type: "overflow", key: "overflow", count: overflowFailures, limit: overflowLimit });
  }

  const pageOverflowLimit = Number.parseInt(profileBudgets.pageOverflowPx ?? 2, 10);
  if (Number.isFinite(pageOverflowLimit) && pageOverflowLimit > 0) {
    warnings.push({ type: "page-overflow", key: "page", limit: pageOverflowLimit });
  }

  return {
    profile: profile?.label || "",
    sections: sectionBudgets,
    total: {
      ms: totalMs,
      limit: totalLimit,
      state: totalPassed ? "pass" : "fail"
    },
    overflow: {
      checked: overflow.checked || 0,
      contained: overflow.contained || 0,
      failures: overflowFailures,
      limit: overflowLimit,
      state: overflowPassed ? "pass" : "fail"
    },
    warnings,
    failures,
    passed: failures.length === 0
  };
}

function measureOverflow(root) {
  const scope = root || document;
  const candidates = scope?.matches?.("[data-if-overflow-check]") ? [scope] : qsa("[data-if-overflow-check]", scope);
  const failures = [];
  const scrollRegions = [];
  candidates.forEach((item) => {
    const overflowX = item.scrollWidth > item.clientWidth + 2;
    const overflowY = item.scrollHeight > item.clientHeight + 2;
    if (!overflowX && !overflowY) return;
    if (["scroll", "clip"].includes(item.dataset.ifOverflowMode)) {
      scrollRegions.push(item);
      return;
    }
    failures.push({
      item,
      axis: overflowX && overflowY ? "both" : overflowX ? "x" : "y",
      scrollWidth: item.scrollWidth,
      clientWidth: item.clientWidth,
      scrollHeight: item.scrollHeight,
      clientHeight: item.clientHeight
    });
  });
  return {
    checked: candidates.length,
    contained: scrollRegions.length,
    failures,
    passed: failures.length === 0
  };
}

function syntheticPerformanceRows(count) {
  const types = ["Instruction", "Memo", "Guide", "Directive", "Evidence", "Source"];
  const authorities = ["DoD", "SECNAV", "OMB", "NIST", "DISA", "NAVWAR", "CISA"];
  const risks = ["Low", "Medium", "High", "Critical"];
  const confidence = ["Low", "Medium", "High"];
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      title: `${authorities[index % authorities.length]} synthetic record ${String(id).padStart(4, "0")}`,
      type: types[index % types.length],
      authority: authorities[(index * 3) % authorities.length],
      updated: `2025-05-${String((index % 27) + 1).padStart(2, "0")}`,
      confidence: confidence[index % confidence.length],
      confidenceScore: (0.54 + ((index % 41) / 100)).toFixed(2),
      risk: risks[(index * 5) % risks.length],
      status: index % 11 === 0 ? "Blocked" : index % 5 === 0 ? "In Review" : "Mapped",
      owner: ["Jane Doe", "Priya Shah", "Alex Kim", "Michael Lee"][index % 4]
    };
  });
}

function renderPerformanceTable(target, profile) {
  if (!target) return;
  const rows = syntheticPerformanceRows(profile.tableRows);
  target.innerHTML = `
    <div class="if-performance-table-wrap" data-if-overflow-check data-if-overflow-mode="scroll">
      <div class="if-table-toolbar">
        <strong>${rows.length.toLocaleString()} synthetic rows</strong>
        <span class="if-badge if-badge--info">virtual window</span>
      </div>
      <div class="if-table-wrap">
        <table class="if-table if-table--dense">
          <thead>
            <tr>
              <th scope="col">Record</th>
              <th scope="col">Type</th>
              <th scope="col">Authority</th>
              <th scope="col">Confidence</th>
              <th scope="col">Risk</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.slice(0, 64).map((row) => `
              <tr data-if-overflow-check>
                <th scope="row">${escapeHtml(row.title)}</th>
                <td>${escapeHtml(row.type)}</td>
                <td>${escapeHtml(row.authority)}</td>
                <td>${renderPolicyTableStatusBadge(row.confidence, "confidence")}</td>
                <td>${renderPolicyTableStatusBadge(row.risk, "risk")}</td>
                <td>${renderPolicyTableStatusBadge(row.status, "status")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPerformanceGraph(target, profile) {
  if (!target) return;
  const nodes = Array.from({ length: profile.graphNodes }, (_, index) => {
    const orbit = Math.floor(index / 12) + 1;
    const angle = (index % 12) / 12 * Math.PI * 2 + orbit * 0.18;
    const radius = 12 + orbit * 7;
    return {
      id: `perf-node-${index}`,
      type: ["policy", "org", "source", "evidence", "gap"][index % 5],
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * Math.min(radius, 34),
      label: index === 0 ? "Seed policy" : `N${index}`
    };
  });
  const edges = Array.from({ length: profile.graphEdges }, (_, index) => ({
    from: nodes[index % nodes.length],
    to: nodes[(index * 7 + 11) % nodes.length],
    type: ["implements", "references", "guides", "derived"][index % 4]
  })).filter((edge) => edge.from !== edge.to);
  target.innerHTML = `
    <div class="if-performance-graph" data-if-overflow-check data-if-overflow-mode="clip">
      <svg class="if-performance-graph__svg" viewBox="0 0 100 100" aria-hidden="true">
        ${edges.map((edge) => `
          <line class="if-performance-link if-performance-link--${escapeHtml(edge.type)}" x1="${edge.from.x.toFixed(2)}" y1="${edge.from.y.toFixed(2)}" x2="${edge.to.x.toFixed(2)}" y2="${edge.to.y.toFixed(2)}"></line>
        `).join("")}
      </svg>
      ${nodes.map((node, index) => `
        <button class="if-performance-node if-performance-node--${escapeHtml(node.type)}${index === 0 ? " is-seed" : ""}" type="button" style="--x:${node.x.toFixed(2)}%;--y:${node.y.toFixed(2)}%;" aria-label="${escapeHtml(node.label)}">
          <span class="if-icon-slot" data-if-icon="${index === 0 ? "instruction" : node.type === "org" ? "department" : node.type === "gap" ? "alert" : node.type === "source" || node.type === "evidence" ? "artifact" : "graph"}" aria-hidden="true"></span>
          <span>${escapeHtml(index < 10 ? node.label : node.type)}</span>
        </button>
      `).join("")}
    </div>
  `;
  hydrateIcons(target);
}

function renderPerformanceDiagram(target, profile) {
  if (!target) return;
  const stages = ["Sources", "Ingest", "Agents", "Knowledge", "Experience"];
  const perStage = Math.ceil(profile.diagramNodes / stages.length);
  target.innerHTML = `
    <div class="if-performance-diagram" data-if-overflow-check data-if-overflow-mode="scroll">
      ${stages.map((stage, stageIndex) => `
        <section class="if-performance-stage">
          <header><span>${stageIndex + 1}</span><strong>${escapeHtml(stage)}</strong></header>
          <div>
            ${Array.from({ length: perStage }, (_, index) => {
              const absolute = stageIndex * perStage + index;
              if (absolute >= profile.diagramNodes) return "";
              return `
                <article class="if-performance-service" data-if-overflow-check>
                  <span class="if-icon-slot" data-if-icon="${["database", "cloud", "bot", "search", "dashboard"][stageIndex]}" aria-hidden="true"></span>
                  <strong>${escapeHtml(stage)} ${index + 1}</strong>
                  <em>${escapeHtml(["verified", "queued", "running", "indexed", "published"][absolute % 5])}</em>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
  hydrateIcons(target);
}

function renderPerformanceDocument(target, profile) {
  if (!target) return;
  const tags = ["CLM", "REF", "ORG", "IMP", "ENB", "EVD"];
  target.innerHTML = `
    <div class="if-performance-document" data-if-overflow-check data-if-overflow-mode="scroll">
      ${Array.from({ length: profile.docLines }, (_, index) => {
        const tag = tags[index % tags.length];
        return `
          <p class="if-performance-doc-line if-performance-doc-line--${tag.toLowerCase()}" data-if-overflow-check>
            <span class="if-performance-doc-line__tags"><span class="if-badge if-badge--info">${tag}</span></span>
            <span class="if-performance-doc-line__number">${String(index + 1).padStart(4, "0")}</span>
            <span class="if-performance-doc-line__text">The responsible organization ${index % 4 === 0 ? "shall" : "will"} maintain evidence package ${String(index + 1).padStart(3, "0")} and map references to implementation owners.</span>
          </p>
        `;
      }).join("")}
    </div>
  `;
}

function renderPerformanceCharts(target, profile) {
  if (!target) return;
  const line = Array.from({ length: profile.chartPoints }, (_, index) => `P${index + 1}:${Math.round(38 + Math.sin(index / 5) * 14 + index * 0.7)}`).join("|");
  const bar = ["Instruction", "Memo", "Guide", "Evidence", "Gap", "Source"].map((label, index) => `${label}:${Math.round(profile.tableRows / (index + 4))}`).join("|");
  const heatRows = ["DoD", "SECNAV", "DISA", "NIST"].map((label, index) => `${label}:${Array.from({ length: 8 }, (_, cell) => Math.round(10 + (index + 1) * cell * 2 + profile.graphNodes / 10)).join(",")}`).join(";");
  const scatter = Array.from({ length: Math.min(72, profile.graphNodes) }, (_, index) => `N${index}:${(index % 12) + 1},${Math.round((index * 7) % 36)},${(index % 5) + 3}`).join("|");
  target.innerHTML = `
    <div class="if-performance-chart-grid" data-if-overflow-check data-if-overflow-mode="scroll">
      <section class="if-chart-card if-chart-card--compact">
        <header class="if-chart-card__header"><h3 class="if-chart-card__title">Trend</h3><span class="if-badge if-badge--info">Line</span></header>
        <div data-if-chart="line" data-if-chart-data="${escapeHtml(line)}" data-if-chart-label="Synthetic trend"></div>
      </section>
      <section class="if-chart-card if-chart-card--compact">
        <header class="if-chart-card__header"><h3 class="if-chart-card__title">Corpus</h3><span class="if-badge if-badge--info">Bar</span></header>
        <div data-if-chart="bar" data-if-chart-data="${escapeHtml(bar)}" data-if-chart-label="Synthetic corpus"></div>
      </section>
      <section class="if-chart-card if-chart-card--compact">
        <header class="if-chart-card__header"><h3 class="if-chart-card__title">Density</h3><span class="if-badge if-badge--info">Heat</span></header>
        <div data-if-chart="heatmap" data-if-chart-data="${escapeHtml(heatRows)}" data-if-chart-label="Synthetic heatmap"></div>
      </section>
      <section class="if-chart-card if-chart-card--compact">
        <header class="if-chart-card__header"><h3 class="if-chart-card__title">Nodes</h3><span class="if-badge if-badge--info">Scatter</span></header>
        <div data-if-chart="scatter" data-if-chart-data="${escapeHtml(scatter)}" data-if-chart-label="Synthetic node scatter"></div>
      </section>
    </div>
  `;
  hydrateCharts(target);
}

function updatePerformanceMetric(lab, key, value, status = "") {
  qsa(`[data-if-performance-metric="${key}"]`, lab).forEach((item) => {
    item.textContent = value;
    if (status) item.dataset.ifPerformanceStatus = status;
  });
}

function renderPerformanceReport(lab, result) {
  const report = qs("[data-if-performance-report]", lab);
  if (!report) return;
  const rows = Object.entries(result.sections).map(([key, value]) => {
    const budget = result.budget?.sections?.[key]?.limit || result.profile.budgets[key] || result.profile.budgets.total;
    const state = result.budget?.sections?.[key]?.state || (value.ms <= budget ? "pass" : "fail");
    return `
      <tr>
        <th scope="row">${escapeHtml(key)}</th>
        <td>${value.count.toLocaleString()}</td>
        <td>${value.ms.toFixed(1)}ms</td>
        <td>${budget}ms</td>
        <td><span class="if-badge ${state === "pass" ? "if-badge--status-approved" : "if-badge--risk-high"}">${state === "pass" ? "Within budget" : "Over budget"}</span></td>
      </tr>
    `;
  }).join("");
  const budgetSummary = result.budget?.passed ? "All budgets passed" : `${result.budget?.failures?.length || 0} budget breach${result.budget?.failures?.length === 1 ? "" : "es"}`;
  report.innerHTML = `
    <div class="if-performance-report__summary">
      <strong>${escapeHtml(budgetSummary)}</strong>
      <span>${escapeHtml(result.profile.label)} / ${result.totalMs.toFixed(1)}ms total / ${result.overflow.failures.length} uncontained overflow</span>
    </div>
    <div class="if-framework-mini-table-wrap" role="region" aria-label="Performance run result" tabindex="0">
      <table class="if-framework-mini-table">
        <thead><tr><th scope="col">Surface</th><th scope="col">Items</th><th scope="col">Render</th><th scope="col">Budget</th><th scope="col">State</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function runPerformanceLab(controlOrLab, profileName) {
  const lab = controlOrLab?.matches?.("[data-if-performance-lab]") ? controlOrLab : controlOrLab?.closest?.("[data-if-performance-lab]") || qs("[data-if-performance-lab]");
  if (!lab) return null;
  const profileKey = profileName || controlOrLab?.dataset?.ifPerformanceRun || lab.dataset.ifPerformanceProfile || "balanced";
  const profile = getPerformanceProfile(profileKey);
  const sections = {};
  const start = getPerformanceNow();

  const renderers = [
    ["table", "[data-if-performance-table]", profile.tableRows, renderPerformanceTable],
    ["graph", "[data-if-performance-graph]", profile.graphNodes + profile.graphEdges, renderPerformanceGraph],
    ["diagram", "[data-if-performance-diagram]", profile.diagramNodes, renderPerformanceDiagram],
    ["document", "[data-if-performance-document]", profile.docLines, renderPerformanceDocument],
    ["charts", "[data-if-performance-charts]", profile.chartPoints, renderPerformanceCharts]
  ];

  lab.dataset.ifPerformanceProfile = profileKey;
  lab.dataset.ifPerformanceState = "running";
  qsa("[data-if-performance-run]", lab).forEach((button) => {
    const active = button.dataset.ifPerformanceRun === profileKey;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  renderers.forEach(([key, selector, count, renderer]) => {
    const sectionStart = getPerformanceNow();
    renderer(qs(selector, lab), profile);
    sections[key] = { count, ms: getPerformanceNow() - sectionStart };
    updatePerformanceMetric(lab, `${key}.count`, count.toLocaleString());
    updatePerformanceMetric(lab, `${key}.ms`, `${sections[key].ms.toFixed(1)}ms`, sections[key].ms <= (profile.budgets[key] || profile.budgets.total) ? "pass" : "warn");
  });

  const overflow = measureOverflow(lab);
  const totalMs = getPerformanceNow() - start;
  const budget = evaluatePerformanceBudgets(profile, sections, overflow, totalMs);
  const state = overflow.passed && budget.passed ? "passed" : "failed";
  lab.dataset.ifPerformanceState = state;
  updatePerformanceMetric(lab, "total.ms", `${totalMs.toFixed(1)}ms`, budget.total.state);
  updatePerformanceMetric(lab, "overflow.failures", `${overflow.failures.length} uncontained`, overflow.passed ? "pass" : "fail");
  updatePerformanceMetric(lab, "overflow.contained", `${overflow.contained} contained scroll regions`);
  updatePerformanceMetric(lab, "profile.label", profile.label);
  qsa("[data-if-performance-summary]", lab).forEach((item) => {
    item.textContent = `${profile.label}: ${profile.tableRows.toLocaleString()} rows, ${profile.graphNodes} nodes, ${profile.diagramNodes} diagram boxes, ${profile.docLines.toLocaleString()} lines, ${overflow.failures.length} uncontained overflows.`;
  });
  const result = { profile, profileKey, sections, overflow, totalMs, budget, state };
  renderPerformanceReport(lab, result);
  dispatchFrameworkEvent(lab, "if:performance-run", result);
  return result;
}

function hydratePerformanceLabs(root) {
  qsa("[data-if-performance-lab]", root).forEach((lab) => {
    const auto = lab.dataset.ifPerformanceAuto;
    if (auto && lab.dataset.ifPerformanceHydrated !== "true") {
      lab.dataset.ifPerformanceHydrated = "true";
      runPerformanceLab(lab, auto === "true" ? lab.dataset.ifPerformanceProfile || "balanced" : auto);
    }
  });
}

function isTextEntryTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function getTooltipSurface() {
  let tooltip = qs("[data-if-tooltip-surface]");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "if-tooltip";
    tooltip.id = "if-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.dataset.ifTooltipSurface = "";
    tooltip.hidden = true;
    document.body.append(tooltip);
  }
  return tooltip;
}

function getTooltipText(control) {
  return control?.dataset?.ifTooltip || control?.getAttribute?.("aria-label") || "";
}

function toFiniteNumber(value, fallback) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function getVisibleArea(box, viewport, margin) {
  const visibleLeft = Math.max(margin, box.left);
  const visibleTop = Math.max(margin, box.top);
  const visibleRight = Math.min(viewport.width - margin, box.left + box.width);
  const visibleBottom = Math.min(viewport.height - margin, box.top + box.height);
  return Math.max(0, visibleRight - visibleLeft) * Math.max(0, visibleBottom - visibleTop);
}

function computeTooltipPosition(anchorRect, tooltipRect, viewport = {}, options = {}) {
  const margin = toFiniteNumber(options.margin, 10);
  const offset = toFiniteNumber(options.offset, 10);
  const preferred = ["top", "bottom", "left", "right", "auto"].includes(options.preferred) ? options.preferred : "top";
  const placements = preferred === "auto"
    ? ["top", "bottom", "right", "left"]
    : [preferred, ...(options.flip === false ? [] : ["top", "bottom", "right", "left"].filter((placement) => placement !== preferred))];
  const viewportBox = {
    width: toFiniteNumber(viewport.width, 0),
    height: toFiniteNumber(viewport.height, 0)
  };
  const anchor = {
    left: toFiniteNumber(anchorRect.left, 0),
    top: toFiniteNumber(anchorRect.top, 0),
    width: toFiniteNumber(anchorRect.width, Math.max(0, toFiniteNumber(anchorRect.right, 0) - toFiniteNumber(anchorRect.left, 0))),
    height: toFiniteNumber(anchorRect.height, Math.max(0, toFiniteNumber(anchorRect.bottom, 0) - toFiniteNumber(anchorRect.top, 0)))
  };
  anchor.right = toFiniteNumber(anchorRect.right, anchor.left + anchor.width);
  anchor.bottom = toFiniteNumber(anchorRect.bottom, anchor.top + anchor.height);
  const tip = {
    width: Math.max(1, toFiniteNumber(tooltipRect.width, 1)),
    height: Math.max(1, toFiniteNumber(tooltipRect.height, 1))
  };
  const anchorCenterX = anchor.left + anchor.width / 2;
  const anchorCenterY = anchor.top + anchor.height / 2;
  const rawCandidates = {
    top: { left: anchorCenterX - tip.width / 2, top: anchor.top - tip.height - offset },
    bottom: { left: anchorCenterX - tip.width / 2, top: anchor.bottom + offset },
    right: { left: anchor.right + offset, top: anchorCenterY - tip.height / 2 },
    left: { left: anchor.left - tip.width - offset, top: anchorCenterY - tip.height / 2 }
  };
  const candidates = placements.map((placement, index) => {
    const raw = rawCandidates[placement] || rawCandidates.top;
    const left = clamp(raw.left, margin, viewportBox.width - tip.width - margin);
    const top = clamp(raw.top, margin, viewportBox.height - tip.height - margin);
    const box = { left, top, width: tip.width, height: tip.height };
    const overflow = Math.max(0, margin - raw.left)
      + Math.max(0, raw.left + tip.width - (viewportBox.width - margin))
      + Math.max(0, margin - raw.top)
      + Math.max(0, raw.top + tip.height - (viewportBox.height - margin));
    const alignmentPenalty = Math.abs(left - raw.left) + Math.abs(top - raw.top);
    const visibleArea = getVisibleArea({ ...raw, width: tip.width, height: tip.height }, viewportBox, margin);
    return {
      placement,
      left,
      top,
      overflow,
      visibleArea,
      score: visibleArea - overflow * 8 - alignmentPenalty * 1.5 - index * 3 + (placement === preferred ? 12 : 0),
      arrowX: clamp(anchorCenterX - box.left, 8, tip.width - 8),
      arrowY: clamp(anchorCenterY - box.top, 8, tip.height - 8)
    };
  });
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || {
    placement: "top",
    left: margin,
    top: margin,
    overflow: 0,
    visibleArea: 0,
    score: 0,
    arrowX: 8,
    arrowY: 8
  };
}

function positionTooltip(control, tooltip) {
  const preferred = control.dataset.ifTooltipPlacement || "top";
  const margin = toFiniteNumber(control.dataset.ifTooltipMargin, 10);
  const offset = toFiniteNumber(control.dataset.ifTooltipOffset, 10);
  const rect = control.getBoundingClientRect();
  tooltip.hidden = false;
  tooltip.dataset.placement = preferred;

  const tip = tooltip.getBoundingClientRect();
  const position = computeTooltipPosition(rect, tip, {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
  }, {
    preferred,
    margin,
    offset,
    flip: control.dataset.ifTooltipFlip !== "false"
  });

  tooltip.dataset.placement = position.placement;
  tooltip.dataset.collision = position.overflow > 0 ? "clamped" : "fit";
  tooltip.style.left = `${position.left}px`;
  tooltip.style.top = `${position.top}px`;
  tooltip.style.setProperty("--if-tooltip-arrow-x", `${position.arrowX}px`);
  tooltip.style.setProperty("--if-tooltip-arrow-y", `${position.arrowY}px`);
  return position;
}

function showTooltip(control) {
  const text = getTooltipText(control);
  if (!text) return;
  const tooltip = getTooltipSurface();
  tooltip.textContent = text;
  activeTooltipControl = control;
  if (!control.getAttribute("aria-describedby")) {
    control.dataset.ifTooltipOwnsDescription = "true";
    control.setAttribute("aria-describedby", tooltip.id);
  }
  const position = positionTooltip(control, tooltip);
  tooltip.classList.add("is-visible");
  dispatchFrameworkEvent(control, "if:tooltip-show", { text, placement: position.placement, collision: tooltip.dataset.collision });
}

function hideTooltip(control = activeTooltipControl) {
  const tooltip = qs("[data-if-tooltip-surface]");
  if (!tooltip) return;
  const wasVisible = !tooltip.hidden || tooltip.classList.contains("is-visible");
  tooltip.classList.remove("is-visible");
  tooltip.hidden = true;
  if (control?.dataset?.ifTooltipOwnsDescription === "true") {
    control.removeAttribute("aria-describedby");
    delete control.dataset.ifTooltipOwnsDescription;
  }
  if (wasVisible && control) dispatchFrameworkEvent(control, "if:tooltip-hide", {});
  activeTooltipControl = null;
}

function isTooltipVisible() {
  const tooltip = qs("[data-if-tooltip-surface]");
  return Boolean(tooltip && !tooltip.hidden && tooltip.classList.contains("is-visible"));
}

function getFieldElement(target) {
  return target?.matches?.(".if-field") ? target : target?.closest?.(".if-field");
}

function getFieldLabel(field, control) {
  return field?.dataset?.ifFieldLabel
    || qs(".if-field__label", field)?.textContent?.replace("*", "").trim()
    || control?.getAttribute?.("aria-label")
    || control?.name
    || "Field";
}

function getFieldControl(fieldOrControl) {
  if (!fieldOrControl) return null;
  if (fieldOrControl.matches?.(".if-input, .if-select, .if-textarea, input, select, textarea")) return fieldOrControl;
  return qs(".if-input, .if-select, .if-textarea, input, select, textarea", fieldOrControl);
}

function getDescribedBy(control) {
  return new Set((control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
}

function setDescribedBy(control, ids) {
  const values = Array.from(ids).filter(Boolean);
  if (values.length) control.setAttribute("aria-describedby", values.join(" "));
  else control.removeAttribute("aria-describedby");
}

function addDescribedBy(control, id) {
  if (!control || !id) return;
  const ids = getDescribedBy(control);
  ids.add(id);
  setDescribedBy(control, ids);
}

function removeDescribedBy(control, id) {
  if (!control || !id) return;
  const ids = getDescribedBy(control);
  ids.delete(id);
  setDescribedBy(control, ids);
}

function ensureFieldContract(fieldOrControl) {
  const control = getFieldControl(fieldOrControl) || getFieldControl(getFieldElement(fieldOrControl));
  const field = getFieldElement(fieldOrControl) || control?.parentElement;
  if (!field || !control) return null;
  if (!control.id) control.id = `if-field-${Math.random().toString(36).slice(2)}`;
  const label = qs(".if-field__label", field);
  if (label && !label.id) label.id = `${control.id}-label`;
  if (label && !control.getAttribute("aria-labelledby")) control.setAttribute("aria-labelledby", label.id);
  qsa("[data-if-field-help], .if-field__hint", field).forEach((hint, index) => {
    if (!hint.id) hint.id = `${control.id}-help-${index + 1}`;
    addDescribedBy(control, hint.id);
  });
  const feedback = qs("[data-if-field-feedback]", field);
  if (feedback) {
    if (!feedback.id) feedback.id = `${control.id}-feedback`;
    if (feedback.textContent.trim()) addDescribedBy(control, feedback.id);
  }
  return { field, control };
}

function getFieldFeedback(field) {
  let feedback = qs("[data-if-field-feedback]", field);
  if (!feedback) {
    feedback = document.createElement("span");
    feedback.className = "if-field__feedback";
    feedback.dataset.ifFieldFeedback = "";
    field.append(feedback);
  }
  return feedback;
}

function setFieldState(fieldOrControl, state = "neutral", message = "") {
  const contract = ensureFieldContract(fieldOrControl);
  const control = contract?.control;
  const field = contract?.field;
  if (!field || !control) return null;
  const normalized = ["valid", "invalid", "warning", "neutral"].includes(state) ? state : "neutral";
  field.classList.toggle("if-field--valid", normalized === "valid");
  field.classList.toggle("if-field--invalid", normalized === "invalid");
  field.classList.toggle("if-field--warning", normalized === "warning");
  field.dataset.ifFieldState = normalized;
  control.setAttribute("aria-invalid", String(normalized === "invalid"));

  const feedback = getFieldFeedback(field);
  feedback.className = `if-field__feedback${normalized === "neutral" ? "" : ` if-field__feedback--${normalized}`}`;
  if (!feedback.id) feedback.id = `if-field-feedback-${Math.random().toString(36).slice(2)}`;
  if (message) {
    feedback.textContent = message;
    addDescribedBy(control, feedback.id);
  } else {
    feedback.textContent = "";
    removeDescribedBy(control, feedback.id);
  }
  dispatchFrameworkEvent(control, "if:field-state", { field, state: normalized, message });
  return normalized;
}

function validateField(fieldOrControl) {
  const field = getFieldElement(fieldOrControl) || fieldOrControl?.closest?.("[data-if-validate]");
  const control = getFieldControl(fieldOrControl) || getFieldControl(field);
  if (!control) return true;
  const host = control.closest("[data-if-validate]") || control;
  const rule = host.dataset.ifValidate || control.dataset.ifValidate || "";
  const value = String(control.value || "").trim();
  const invalidMessage = host.dataset.ifError || control.dataset.ifError || "This field needs attention.";
  const validMessage = host.dataset.ifValid || control.dataset.ifValid || "";
  const warningMessage = host.dataset.ifWarning || control.dataset.ifWarning || "";
  let state = "valid";

  if (rule.includes("required") && !value) state = "invalid";
  if (state === "valid" && rule.includes("email") && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) state = "invalid";
  if (state === "valid" && rule.includes("min:")) {
    const min = Number(rule.match(/min:(\d+)/)?.[1] || 0);
    if (value.length < min) state = value ? "warning" : "invalid";
  }

  const message = state === "invalid" ? invalidMessage : state === "warning" ? warningMessage || invalidMessage : validMessage;
  setFieldState(field || control, state, message);
  dispatchFrameworkEvent(control, "if:field-validate", { rule, state, valid: state === "valid", value });
  return state === "valid";
}

function getValidatedControls(root) {
  const controls = [];
  qsa("[data-if-validate]", root).forEach((host) => {
    const control = getFieldControl(host);
    if (control && !controls.includes(control)) controls.push(control);
  });
  qsa("input[data-if-validate], select[data-if-validate], textarea[data-if-validate]", root).forEach((control) => {
    if (!controls.includes(control)) controls.push(control);
  });
  return controls;
}

function getFormSummary(form) {
  const selector = form.dataset.ifFormSummary;
  return selector ? qs(selector) : qs("[data-if-form-summary]", form);
}

function updateFormSummary(form, results) {
  const summary = getFormSummary(form);
  if (!summary) return;
  const invalid = results.filter((result) => result.state === "invalid");
  const warnings = results.filter((result) => result.state === "warning");
  const hasIssues = invalid.length || warnings.length;
  summary.hidden = false;
  summary.classList.toggle("if-form-summary--invalid", Boolean(invalid.length));
  summary.classList.toggle("if-form-summary--warning", !invalid.length && Boolean(warnings.length));
  summary.classList.toggle("if-form-summary--valid", !hasIssues);
  const icon = invalid.length ? "warning" : warnings.length ? "alert" : "check";
  const title = invalid.length
    ? `${invalid.length} field${invalid.length === 1 ? "" : "s"} need attention`
    : warnings.length
      ? `${warnings.length} field${warnings.length === 1 ? "" : "s"} should be reviewed`
      : form.dataset.ifFormValidTitle || "Ready to submit";
  const body = invalid.length
    ? form.dataset.ifFormInvalidMessage || "Resolve the required items before continuing."
    : warnings.length
      ? form.dataset.ifFormWarningMessage || "Review the warnings, then continue when ready."
      : form.dataset.ifFormValidMessage || "All validation checks passed.";
  const issueList = hasIssues
    ? `<ul>${[...invalid, ...warnings].map((result) => `<li><button class="if-form-summary__link" type="button" data-if-form-focus="${result.control.id}"><strong>${escapeHtml(result.label)}</strong><span>${escapeHtml(result.message || "Needs review")}</span></button></li>`).join("")}</ul>`
    : "";
  summary.innerHTML = `<span class="if-icon-slot" data-if-icon="${icon}" aria-hidden="true"></span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p>${issueList}</div>`;
  hydrateIcons(summary);
}

function validateForm(formOrControl, options = {}) {
  const form = formOrControl?.matches?.("[data-if-form], form") ? formOrControl : formOrControl?.closest?.("[data-if-form], form");
  if (!form) return true;
  const results = getValidatedControls(form).map((control) => {
    validateField(control);
    const field = getFieldElement(control);
    const state = field?.dataset.ifFieldState || "neutral";
    const feedback = qs("[data-if-field-feedback]", field);
    return {
      control,
      field,
      state,
      label: getFieldLabel(field, control),
      message: feedback?.textContent?.trim() || ""
    };
  });
  updateFormSummary(form, results);
  const valid = results.every((result) => result.state === "valid" || result.state === "neutral");
  if (!valid && options.focus !== false) {
    const first = results.find((result) => result.state === "invalid" || result.state === "warning");
    first?.control?.focus();
  }
  dispatchFrameworkEvent(form, "if:form-validate", { valid, results });
  return valid;
}

function selectMenuItem(item) {
  const value = item.dataset.ifMenuItem || item.textContent.trim();
  const labelTarget = item.dataset.ifMenuLabel ? qs(item.dataset.ifMenuLabel) : null;
  const statusTarget = item.dataset.ifMenuTarget ? qs(item.dataset.ifMenuTarget) : null;
  const icon = item.querySelector("[data-if-icon]")?.dataset.ifIcon || "download";
  qsa("[data-if-menu-item]", item.closest(".if-control-demo") || document).forEach((control) => {
    control.classList.toggle("is-selected", control.dataset.ifMenuItem === value);
    if (control.getAttribute("role") === "menuitemradio") control.setAttribute("aria-checked", String(control.dataset.ifMenuItem === value));
    if (control.matches("button")) control.setAttribute("aria-pressed", String(control.dataset.ifMenuItem === value));
  });
  if (labelTarget) labelTarget.textContent = value === "ZIP" ? "Export bundle" : `Export ${value}`;
  if (statusTarget) {
    statusTarget.innerHTML = `<span class="if-icon-slot" data-if-icon="${icon}"></span><span><strong>${value} ready</strong><em>12 selected records, 8 visible columns</em></span>`;
    hydrateIcons(statusTarget);
  }
  const menu = item.closest("[data-if-menu]");
  if (menu) {
    const trigger = getMenuTrigger(menu);
    if (trigger) closeMenu(trigger, { restoreFocus: true });
  }
  dispatchFrameworkEvent(item, "if:menu-select", { value, icon });
  showToast(item.dataset.ifMenuMessage || `${value} selected`, icon);
}

function firstFocusable(root) {
  return qs(focusableSelector, root);
}

function createIcon(name, label = "") {
  const normalizedName = String(name || "");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "if-icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  if (normalizedName.toLowerCase().startsWith("seal")) svg.classList.add("if-icon--seal");
  svg.innerHTML = iconPaths[name] || iconPaths.policy;
  return svg;
}

function hydrateIcons(root) {
  qsa("[data-if-icon]", root).forEach((slot) => {
    if (slot.dataset.ifIconHydrated === "true") return;
    slot.replaceChildren(createIcon(slot.dataset.ifIcon, slot.dataset.ifIconLabel || ""));
    slot.dataset.ifIconHydrated = "true";
  });
}

function normalizeAssetFit(value) {
  const fit = String(value || "contain").trim().toLowerCase();
  return ["contain", "cover", "fill", "none", "scale-down"].includes(fit) ? fit : "contain";
}

function normalizeAssetDimension(value) {
  const dimension = String(value || "").trim();
  if (!dimension) return "";
  if (/^-?\d+(\.\d+)?$/.test(dimension)) return `${dimension}px`;
  if (/^-?\d+(\.\d+)?(px|rem|em|%|vw|vh|ch|ex|cm|mm|in|pt|pc|vmin|vmax)$/i.test(dimension)) return dimension;
  if (/^[^;{}<>]+$/.test(dimension)) return dimension;
  return "";
}

function isDataOrBlobAsset(src) {
  return /^(data:image\/|blob:)/i.test(String(src || ""));
}

function isSameOriginAsset(src) {
  if (!src || isDataOrBlobAsset(src)) return true;
  try {
    const url = new URL(src, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

function inferAssetKind(src, explicitKind = "") {
  const kind = String(explicitKind || "").trim().toLowerCase();
  if (kind) return kind.replace("jpeg", "jpg");
  const source = String(src || "").toLowerCase();
  const dataMatch = source.match(/^data:image\/([a-z0-9.+-]+)/);
  if (dataMatch) return dataMatch[1].replace("svg+xml", "svg").replace("jpeg", "jpg");
  const extensionMatch = source.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/);
  return extensionMatch ? extensionMatch[1].replace("jpeg", "jpg") : "image";
}

function shouldExportAsset(slot, img) {
  const policy = String(slot?.dataset.ifAssetExport || "auto").trim().toLowerCase();
  if (policy === "false" || policy === "none" || policy === "off") return false;
  if (policy === "force") return true;
  return Boolean(img?.src && isSameOriginAsset(img.src));
}

function setAssetSlotFallback(slot) {
  const fallbackIcon = slot.dataset.ifAssetFallbackIcon || "artifact";
  const fallback = document.createElement("span");
  fallback.className = "if-asset-slot__fallback if-icon-slot";
  fallback.dataset.ifIcon = fallbackIcon;
  fallback.setAttribute("aria-hidden", "true");
  slot.replaceChildren(fallback);
  hydrateIcons(slot);
}

function hydrateAssets(root) {
  qsa("[data-if-asset]", root).forEach((slot) => {
    const src = String(slot.dataset.ifAsset || "").trim();
    if (!src) return;
    const size = normalizeAssetDimension(slot.dataset.ifAssetSize);
    const width = normalizeAssetDimension(slot.dataset.ifAssetWidth) || size;
    const height = normalizeAssetDimension(slot.dataset.ifAssetHeight) || size;
    const fit = normalizeAssetFit(slot.dataset.ifAssetFit);
    const position = String(slot.dataset.ifAssetPosition || "center").trim() || "center";
    slot.classList.add("if-asset-slot");
    if (width) slot.style.setProperty("--if-asset-width", width);
    if (height) slot.style.setProperty("--if-asset-height", height);
    slot.style.setProperty("--if-asset-fit", fit);
    slot.style.setProperty("--if-asset-position", position);
    slot.dataset.ifAssetKind = inferAssetKind(src, slot.dataset.ifAssetKind);

    const existing = qs("img.if-asset-slot__image", slot);
    if (slot.dataset.ifAssetHydrated === "true" && existing?.dataset.ifAssetSrc === src) return;

    slot.dataset.ifAssetState = "loading";
    slot.dataset.ifAssetHydrated = "true";
    const img = document.createElement("img");
    img.className = "if-asset-slot__image";
    img.alt = slot.dataset.ifAssetAlt || "";
    img.decoding = "async";
    img.loading = slot.dataset.ifAssetLoading || "lazy";
    img.dataset.ifAssetSrc = src;
    const crossorigin = slot.dataset.ifAssetCrossorigin || slot.dataset.ifAssetCrossOrigin || (isSameOriginAsset(src) ? "" : "anonymous");
    if (crossorigin) img.crossOrigin = crossorigin;
    img.addEventListener("load", () => {
      slot.dataset.ifAssetState = "loaded";
      if (img.naturalWidth && img.naturalHeight) {
        slot.style.setProperty("--if-asset-ratio", `${img.naturalWidth} / ${img.naturalHeight}`);
        slot.dataset.ifAssetOrientation = img.naturalWidth > img.naturalHeight ? "landscape" : img.naturalWidth < img.naturalHeight ? "portrait" : "square";
      }
      dispatchFrameworkEvent(slot, "if:asset-load", { slot, img, src });
    });
    img.addEventListener("error", () => {
      slot.dataset.ifAssetState = "error";
      setAssetSlotFallback(slot);
      dispatchFrameworkEvent(slot, "if:asset-error", { slot, src });
    });
    img.src = src;
    slot.replaceChildren(img);
  });
}

function formatIconName(name) {
  return String(name || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z]+)(\d+)/g, "$1 $2")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getIconCategory(name) {
  const domain = new Set(["acquisition", "airForce", "army", "artifact", "authorization", "baseline", "certificate", "cisa", "claim", "coastGuard", "combatantCommand", "command", "component", "congress", "controlMap", "cyber", "dataModel", "defenseAgency", "department", "departmentOfWar", "directive", "dna", "dod", "echelon2", "echelon3", "echelon4", "evidence", "federalRegister", "gavel", "implementation", "installation", "instruction", "intelligence", "joint", "key", "law", "lineItem", "lock", "logistics", "marineCorps", "memo", "microscope", "mission", "molecule", "nationalGuard", "navy", "nist", "obligation", "omb", "operations", "parser", "personnel", "program", "reference", "rmf", "scale", "secnav", "serviceBranch", "sop", "source", "sourcePortal", "spaceForce", "statute", "supersession", "unlock", "waiver", "whs"]);
  const navigation = new Set(["arrowDown", "arrowLeft", "arrowRight", "arrowUp", "chevron", "chevronDown", "close", "expand", "external", "focus", "folder", "home", "layers", "link", "mapPin", "menu", "more", "route", "search", "sitemap", "timeline"]);
  const operations = new Set(["alert", "api", "archive", "audit", "bell", "bot", "briefcase", "calendar", "check", "cloud", "columns", "connector", "copy", "dashboard", "database", "download", "edit", "eye", "fileCode", "fileCsv", "fileJson", "filePdf", "filter", "flag", "graph", "hourglass", "inbox", "mail", "message", "minus", "network", "outbox", "pause", "play", "plus", "policy", "quote", "refresh", "review", "server", "settings", "shield", "sort", "star", "sync", "table", "task", "terminal", "trash", "trend", "upload", "user", "users", "wand", "warning", "workflow", "zap"]);
  if (String(name).toLowerCase().includes("seal")) return "Domain";
  if (domain.has(name)) return "Domain";
  if (navigation.has(name)) return "Navigation";
  if (operations.has(name)) return "Operations";
  return "General";
}

function hydrateIconCatalog(root) {
  qsa("[data-if-icon-catalog]", root).forEach((catalog) => {
    if (catalog.dataset.ifIconCatalogHydrated === "true") return;
    const names = Object.keys(iconPaths).sort((a, b) => a.localeCompare(b));
    const groups = names.reduce((acc, name) => {
      const category = getIconCategory(name);
      if (!acc[category]) acc[category] = [];
      acc[category].push(name);
      return acc;
    }, {});
    const order = ["Operations", "Navigation", "Domain", "General"];
    const fragment = document.createDocumentFragment();
    order.filter((category) => groups[category]?.length).forEach((category) => {
      const section = document.createElement("section");
      section.className = "if-icon-catalog__section";
      const header = document.createElement("header");
      header.className = "if-icon-catalog__header";
      header.innerHTML = `<h3>${category}</h3><span>${groups[category].length} icons</span>`;
      const grid = document.createElement("div");
      grid.className = "if-icon-catalog__grid";
      groups[category].forEach((name) => {
        const item = document.createElement("button");
        item.className = "if-icon-swatch";
        item.type = "button";
        item.dataset.ifIconName = name;
        item.dataset.ifIconCategory = category;
        item.title = name;
        item.append(createIcon(name, formatIconName(name)));
        const label = document.createElement("span");
        label.textContent = name;
        item.append(label);
        grid.append(item);
      });
      section.append(header, grid);
      fragment.append(section);
    });
    catalog.replaceChildren(fragment);
    catalog.dataset.ifIconCatalogHydrated = "true";
    const scope = catalog.closest(".if-specimen") || document;
    const filter = qs("[data-if-icon-catalog-filter]", scope);
    const output = filter?.dataset.ifIconCatalogFilterOutput ? qs(filter.dataset.ifIconCatalogFilterOutput) : null;
    if (output) output.textContent = `${names.length} total icons`;
  });
}

function filterIconCatalog(input) {
  const scope = input.closest(".if-specimen") || document;
  const query = input.value.trim().toLowerCase();
  const catalog = qs("[data-if-icon-catalog]", scope) || qs("[data-if-icon-catalog]");
  if (!catalog) return;
  qsa(".if-icon-catalog__section", catalog).forEach((section) => {
    let visible = 0;
    const swatches = qsa(".if-icon-swatch", section);
    swatches.forEach((swatch) => {
      const haystack = `${swatch.dataset.ifIconName || ""} ${swatch.dataset.ifIconCategory || ""} ${formatIconName(swatch.dataset.ifIconName || "")}`.toLowerCase();
      const matches = !query || haystack.includes(query);
      swatch.hidden = !matches;
      if (matches) visible += 1;
    });
    section.hidden = visible === 0;
    const count = qs(".if-icon-catalog__header span", section);
    if (count) count.textContent = query ? `${visible} / ${swatches.length} icons` : `${swatches.length} icons`;
  });
  const output = input.dataset.ifIconCatalogFilterOutput ? qs(input.dataset.ifIconCatalogFilterOutput) : null;
  if (output) {
    const visibleTotal = qsa(".if-icon-swatch:not([hidden])", catalog).length;
    output.textContent = query ? `${visibleTotal} matching icons` : `${qsa(".if-icon-swatch", catalog).length} total icons`;
  }
}

function selectIconSwatch(swatch) {
  const name = swatch.dataset.ifIconName || "";
  const snippet = `<span class="if-icon-slot" data-if-icon="${name}" aria-hidden="true"></span>`;
  qsa(".if-icon-swatch.is-selected", swatch.closest("[data-if-icon-catalog]") || document).forEach((item) => {
    item.classList.remove("is-selected");
  });
  swatch.classList.add("is-selected");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(snippet).catch(() => {});
  }
  showToast(`${name} icon selected`, "copy");
}

function parseSparklineData(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

function formatSparklineDelta(delta) {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function getKpiMetricLabel(metric) {
  return qs(".if-metric__label", metric)?.textContent?.trim() || metric?.getAttribute?.("aria-label") || "";
}

function getKpiMetricMeta(metric) {
  return qsa(".if-metric__meta span", metric).map((item) => item.textContent.trim()).filter(Boolean);
}

function dispatchKpiMetricUpdate(slot, values, trend, state) {
  const metric = slot.closest(".if-metric, [data-if-kpi]");
  if (!metric) return;
  const valueNode = qs(".if-metric__value", metric);
  const changeNode = qs(".if-metric__change", metric);
  const metricId = metric.dataset.ifKpi || metric.id || getKpiMetricLabel(metric) || "metric";
  dispatchFrameworkEvent(metric, "if:kpi-metric-update", {
    metric: metricId,
    sparkline: slot,
    label: getKpiMetricLabel(metric),
    value: valueNode?.textContent?.trim() || String(state.last ?? ""),
    change: changeNode?.textContent?.trim() || state.deltaText,
    trend,
    values: values.slice(),
    first: state.first,
    last: state.last,
    delta: state.delta,
    deltaText: state.deltaText,
    metadata: getKpiMetricMeta(metric),
    state: metric.dataset.ifKpiState || trend
  });
}

function syncSparklineOutputs(slot, values, trend) {
  const first = values[0];
  const last = values[values.length - 1];
  const delta = first ? ((last - first) / Math.abs(first)) * 100 : last - first;
  const output = slot.dataset.ifSparklineOutput ? qs(slot.dataset.ifSparklineOutput) : null;
  const valueOutput = slot.dataset.ifSparklineValueOutput ? qs(slot.dataset.ifSparklineValueOutput) : null;
  const sampleOutput = slot.dataset.ifSparklineSampleOutput ? qs(slot.dataset.ifSparklineSampleOutput) : null;
  const deltaText = formatSparklineDelta(delta);
  if (output) {
    output.textContent = deltaText;
    output.classList.toggle("if-text-success", trend === "up");
    output.classList.toggle("if-text-danger", trend === "down");
  }
  if (valueOutput) valueOutput.textContent = last.toFixed(slot.dataset.ifSparklineValuePrecision ? Number(slot.dataset.ifSparklineValuePrecision) : 0);
  if (sampleOutput) sampleOutput.textContent = `${values.length} samples`;
  slot.setAttribute("aria-label", slot.dataset.ifSparklineLabel || `${trend === "up" ? "Increasing" : "Decreasing"} trend, ${deltaText}`);
  return { first, last, delta, deltaText };
}

function renderSparkline(slot, values) {
  if (values.length < 2) return;
  const width = Number(slot.dataset.ifSparklineWidth || 120);
  const height = Number(slot.dataset.ifSparklineHeight || 36);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const [lastX, lastY] = points.split(" ").at(-1).split(",");
  const area = `0,${height} ${points} ${width},${height}`;
  const trend = values[values.length - 1] >= values[0] ? "up" : "down";
  slot.classList.remove("if-sparkline--up", "if-sparkline--down", "is-updating");
  slot.classList.add("if-sparkline", `if-sparkline--${trend}`);
  slot.setAttribute("role", "img");
  slot.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <polygon class="if-sparkline__area" points="${area}"></polygon>
      <polyline class="if-sparkline__line" points="${points}"></polyline>
      <circle class="if-sparkline__point" cx="${lastX}" cy="${lastY}" r="2.6"></circle>
    </svg>
  `;
  const sparklineState = syncSparklineOutputs(slot, values, trend);
  dispatchKpiMetricUpdate(slot, values, trend, sparklineState);
  if (isInterfaceFrameworkTestMode()) return;
  window.requestAnimationFrame(() => {
    slot.classList.add("is-updating");
    window.setTimeout(() => slot.classList.remove("is-updating"), 340);
  });
}

function stepSparklineStream(slot) {
  const values = parseSparklineData(slot.dataset.ifSparkline);
  if (values.length < 2) return;
  const maxPoints = Math.max(3, Number(slot.dataset.ifSparklineMaxPoints || values.length));
  const tick = Number(slot.dataset.ifSparklineTick || 0) + 1;
  const volatility = Number(slot.dataset.ifSparklineVolatility || 4);
  const drift = Number(slot.dataset.ifSparklineDrift || 0.6);
  const minValue = Number(slot.dataset.ifSparklineMin || 0);
  const maxValue = Number(slot.dataset.ifSparklineMax || 1000000);
  const last = values[values.length - 1];
  const wave = Math.sin(tick * 0.85) * volatility;
  const jitter = Math.cos(tick * 1.37) * (volatility * 0.35);
  const next = Math.min(maxValue, Math.max(minValue, last + drift + wave + jitter));
  const nextValues = values.slice(-(maxPoints - 1)).concat(Number(next.toFixed(2)));
  slot.dataset.ifSparkline = nextValues.join(",");
  slot.dataset.ifSparklineTick = String(tick);
  renderSparkline(slot, nextValues);
}

function startSparklineStream(slot) {
  if (sparklineStreams.has(slot)) return;
  if (isInterfaceFrameworkTestMode()) {
    slot.classList.remove("is-streaming");
    return;
  }
  const interval = Math.max(500, Number(slot.dataset.ifSparklineInterval || 1600));
  slot.classList.add("is-streaming");
  const timer = window.setInterval(() => stepSparklineStream(slot), interval);
  sparklineStreams.set(slot, timer);
}

function stopSparklineStream(slot) {
  const timer = sparklineStreams.get(slot);
  if (!timer) return;
  window.clearInterval(timer);
  sparklineStreams.delete(slot);
  slot.classList.remove("is-streaming");
}

function getSparklineTargets(selector) {
  const target = selector ? qs(selector) : null;
  if (!target) return [];
  if (target.matches("[data-if-sparkline]")) return [target];
  return qsa("[data-if-sparkline]", target);
}

function setSparklineControlState(control, running) {
  control.setAttribute("aria-pressed", running ? "true" : "false");
  const label = control.querySelector("[data-if-sparkline-toggle-label]");
  const icon = control.querySelector("[data-if-icon]");
  if (icon) icon.dataset.ifIcon = running ? "pause" : "play";
  if (label) label.textContent = running ? "Pause stream" : "Resume stream";
  hydrateIcons(control);
}

function toggleSparklineStream(control) {
  const targets = getSparklineTargets(control.dataset.ifSparklineToggle);
  if (!targets.length) return;
  const running = targets.some((slot) => sparklineStreams.has(slot));
  targets.forEach((slot) => {
    if (running) stopSparklineStream(slot);
    else startSparklineStream(slot);
  });
  setSparklineControlState(control, !running);
}

function resetSparklineStream(control) {
  getSparklineTargets(control.dataset.ifSparklineReset).forEach((slot) => {
    if (!slot.dataset.ifSparklineInitial) return;
    slot.dataset.ifSparkline = slot.dataset.ifSparklineInitial;
    slot.dataset.ifSparklineTick = "0";
    renderSparkline(slot, parseSparklineData(slot.dataset.ifSparkline));
  });
}

function hydrateSparklines(root) {
  qsa("[data-if-sparkline]", root).forEach((slot) => {
    const values = parseSparklineData(slot.dataset.ifSparkline);
    if (values.length < 2) return;
    if (!slot.dataset.ifSparklineInitial) slot.dataset.ifSparklineInitial = slot.dataset.ifSparkline;
    renderSparkline(slot, values);
    if (slot.dataset.ifSparklineStream === "true") startSparklineStream(slot);
  });
}

function parseChartPairs(value) {
  return String(value || "")
    .split("|")
    .map((item) => {
      const [label, rawValue] = item.split(":");
      const amount = Number.parseFloat(rawValue);
      return label && Number.isFinite(amount) ? { label: label.trim(), value: amount } : null;
    })
    .filter(Boolean);
}

function parseHeatmapData(value) {
  return String(value || "")
    .split(";")
    .map((row) => {
      const [label, rawValues] = row.split(":");
      const values = String(rawValues || "")
        .split(",")
        .map((item) => Number.parseFloat(item.trim()))
        .filter((item) => Number.isFinite(item));
      return label && values.length ? { label: label.trim(), values } : null;
    })
    .filter(Boolean);
}

function parseChartSeries(value) {
  const seriesNames = [];
  const rows = String(value || "")
    .split("|")
    .map((item) => {
      const [label, rawSeries] = item.split(":");
      if (!label || !rawSeries) return null;
      const values = {};
      rawSeries.split(",").forEach((pair) => {
        const [name, rawValue] = pair.split("=");
        const amount = Number.parseFloat(rawValue);
        if (name && Number.isFinite(amount)) {
          const cleanName = name.trim();
          values[cleanName] = amount;
          if (!seriesNames.includes(cleanName)) seriesNames.push(cleanName);
        }
      });
      return Object.keys(values).length ? { label: label.trim(), values } : null;
    })
    .filter(Boolean);
  return { rows, seriesNames };
}

function parseScatterData(value) {
  return String(value || "")
    .split("|")
    .map((item) => {
      const [label, rawCoords] = item.split(":");
      const [rawX, rawY, rawSize] = String(rawCoords || "").split(",");
      const x = Number.parseFloat(rawX);
      const y = Number.parseFloat(rawY);
      const size = Number.parseFloat(rawSize);
      return label && Number.isFinite(x) && Number.isFinite(y)
        ? { label: label.trim(), x, y, size: Number.isFinite(size) ? size : 1 }
        : null;
    })
    .filter(Boolean);
}

function renderBarChart(slot, data) {
  const max = Math.max(...data.map((item) => item.value), 1);
  slot.innerHTML = `
    <div class="if-chart__bars">
      ${data.map((item, index) => {
        const percent = Math.max(2, (item.value / max) * 100);
        return `<div class="if-chart-bar" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(item.label)}" data-if-chart-value="${escapeHtml(String(item.value))}" data-if-chart-share="${percent.toFixed(0)}%" style="--bar:${percent.toFixed(2)}%;--i:${index};"><span class="if-chart-bar__label">${escapeHtml(item.label)}</span><span class="if-chart-bar__track"><span class="if-chart-bar__fill"></span></span><strong>${escapeHtml(item.value.toLocaleString())}</strong></div>`;
      }).join("")}
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderHistogramChart(slot, data) {
  const max = Math.max(...data.map((item) => item.value), 1);
  slot.innerHTML = `
    <div class="if-chart-histogram">
      ${data.map((item, index) => {
        const percent = Math.max(3, (item.value / max) * 100);
        return `<span class="if-chart-histogram__bar" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(item.label)}" data-if-chart-value="${escapeHtml(String(item.value))}" style="--bar:${percent.toFixed(2)}%;--i:${index};"><i></i><strong>${escapeHtml(item.value.toLocaleString())}</strong><em>${escapeHtml(item.label)}</em></span>`;
      }).join("")}
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderGroupedBarChart(slot, rows, seriesNames) {
  const max = Math.max(...rows.flatMap((row) => seriesNames.map((name) => row.values[name] || 0)), 1);
  slot.innerHTML = `
    <div class="if-chart-legend if-chart-legend--buttons">
      ${seriesNames.map((name, index) => `<button type="button" data-if-chart-series-toggle="${escapeHtml(name)}" aria-pressed="true"><i style="--i:${index};"></i>${escapeHtml(name)}</button>`).join("")}
    </div>
    <div class="if-chart-grouped" style="--series-count:${seriesNames.length};">
      ${rows.map((row) => `<div class="if-chart-group"><span class="if-chart-group__label">${escapeHtml(row.label)}</span><div class="if-chart-group__bars">${seriesNames.map((name, index) => {
        const value = row.values[name] || 0;
        const percent = Math.max(2, (value / max) * 100);
        return `<span class="if-chart-group__bar" tabindex="0" data-if-chart-point data-if-chart-series="${escapeHtml(name)}" data-if-chart-label="${escapeHtml(`${row.label} - ${name}`)}" data-if-chart-value="${escapeHtml(String(value))}" style="--bar:${percent.toFixed(2)}%;--i:${index};"></span>`;
      }).join("")}</div></div>`).join("")}
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderStackedBarChart(slot, rows, seriesNames) {
  const totals = rows.map((row) => seriesNames.reduce((sum, name) => sum + (row.values[name] || 0), 0));
  const max = Math.max(...totals, 1);
  slot.innerHTML = `
    <div class="if-chart-legend if-chart-legend--buttons">
      ${seriesNames.map((name, index) => `<button type="button" data-if-chart-series-toggle="${escapeHtml(name)}" aria-pressed="true"><i style="--i:${index};"></i>${escapeHtml(name)}</button>`).join("")}
    </div>
    <div class="if-chart-stacked">
      ${rows.map((row, rowIndex) => {
        const total = totals[rowIndex] || 1;
        const width = Math.max(6, (total / max) * 100);
        return `<div class="if-chart-stack-row"><span class="if-chart-stack-row__label">${escapeHtml(row.label)}</span><span class="if-chart-stack-row__track" style="--bar:${width.toFixed(2)}%">${seriesNames.map((name, index) => {
          const value = row.values[name] || 0;
          const share = total ? (value / total) * 100 : 0;
          return `<span class="if-chart-stack-segment" tabindex="0" data-if-chart-point data-if-chart-series="${escapeHtml(name)}" data-if-chart-label="${escapeHtml(`${row.label} - ${name}`)}" data-if-chart-value="${escapeHtml(String(value))}" data-if-chart-share="${Math.round(share)}%" style="--segment:${share.toFixed(2)}%;--i:${index};"></span>`;
        }).join("")}</span><strong>${escapeHtml(total.toLocaleString())}</strong></div>`;
      }).join("")}
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderFunnelChart(slot, data) {
  const max = Math.max(...data.map((item) => item.value), 1);
  slot.innerHTML = `
    <div class="if-chart-funnel">
      ${data.map((item, index) => {
        const percent = Math.max(18, (item.value / max) * 100);
        const previous = index ? data[index - 1].value : item.value;
        const conversion = previous ? (item.value / previous) * 100 : 100;
        return `<div class="if-chart-funnel__step" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(item.label)}" data-if-chart-value="${escapeHtml(String(item.value))}" data-if-chart-share="${conversion.toFixed(0)}% from previous" style="--bar:${percent.toFixed(2)}%;--i:${index};"><span><strong>${escapeHtml(item.label)}</strong><em>${escapeHtml(item.value.toLocaleString())}</em></span></div>`;
      }).join("")}
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderLineChart(slot, data) {
  const width = 520;
  const height = 180;
  const min = Math.min(...data.map((item) => item.value));
  const max = Math.max(...data.map((item) => item.value));
  const range = max - min || 1;
  const points = data.map((item, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * (width - 32) + 16;
    const y = height - 18 - ((item.value - min) / range) * (height - 42);
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `${path} L ${points[points.length - 1].x.toFixed(2)} ${height - 18} L ${points[0].x.toFixed(2)} ${height - 18} Z`;
  slot.innerHTML = `
    <svg class="if-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(slot.dataset.ifChartLabel || "Line chart")}">
      <path class="if-chart-line__area" d="${area}"></path>
      <path class="if-chart-line__path" d="${path}" pathLength="1"></path>
      ${points.map((point) => `<g class="if-chart-line__point" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(point.label)}" data-if-chart-value="${escapeHtml(String(point.value))}" transform="translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})"><circle r="4"></circle><title>${escapeHtml(point.label)}: ${escapeHtml(point.value.toLocaleString())}</title></g>`).join("")}
      ${points.map((point, index) => index % 2 === 0 || index === points.length - 1 ? `<text class="if-chart-axis-label" x="${point.x.toFixed(2)}" y="${height - 3}" text-anchor="middle">${escapeHtml(point.label)}</text>` : "").join("")}
    </svg>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderScatterChart(slot, data) {
  const width = 520;
  const height = 210;
  const minX = Math.min(...data.map((item) => item.x));
  const maxX = Math.max(...data.map((item) => item.x));
  const minY = Math.min(...data.map((item) => item.y));
  const maxY = Math.max(...data.map((item) => item.y));
  const maxSize = Math.max(...data.map((item) => item.size), 1);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const xLabel = slot.dataset.ifChartXLabel || "X";
  const yLabel = slot.dataset.ifChartYLabel || "Y";
  const points = data.map((item) => {
    const x = 36 + ((item.x - minX) / rangeX) * (width - 62);
    const y = height - 30 - ((item.y - minY) / rangeY) * (height - 58);
    const radius = 4 + (item.size / maxSize) * 6;
    return { ...item, x, y, radius };
  });
  slot.innerHTML = `
    <svg class="if-chart-svg if-chart-scatter" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(slot.dataset.ifChartLabel || "Scatter plot")}">
      <path class="if-chart-scatter__grid" d="M36 16V180M36 180H500M36 139H500M36 98H500M36 57H500"></path>
      <text class="if-chart-axis-label" x="36" y="202">${escapeHtml(minX.toLocaleString())}</text>
      <text class="if-chart-axis-label" x="500" y="202" text-anchor="end">${escapeHtml(maxX.toLocaleString())}</text>
      <text class="if-chart-axis-label" x="270" y="202" text-anchor="middle">${escapeHtml(xLabel)}</text>
      <text class="if-chart-axis-label" x="8" y="24">${escapeHtml(yLabel)}</text>
      ${points.map((point, index) => `<g class="if-chart-scatter__point" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(point.label)}" data-if-chart-value="${escapeHtml(String(point.y))}" data-if-chart-share="${escapeHtml(`${xLabel}: ${point.x.toFixed(1)} | ${yLabel}: ${point.y.toFixed(1)}`)}" transform="translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})" style="--i:${index};"><circle r="${point.radius.toFixed(2)}"></circle><title>${escapeHtml(point.label)}: ${escapeHtml(point.x)}, ${escapeHtml(point.y)}</title></g>`).join("")}
    </svg>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderGaugeChart(slot, data) {
  const value = Math.max(0, Math.min(100, data[0]?.value || 0));
  const label = data[0]?.label || slot.dataset.ifChartLabel || "Score";
  const target = Number.parseFloat(slot.dataset.ifChartTargetValue || "80");
  slot.innerHTML = `
    <div class="if-chart-gauge" style="--gauge:${value};--target:${Math.max(0, Math.min(100, target))};" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(label)}" data-if-chart-value="${escapeHtml(String(value))}" data-if-chart-share="Target ${escapeHtml(String(target))}%">
      <svg viewBox="0 0 120 68" role="img" aria-label="${escapeHtml(label)} gauge">
        <path class="if-chart-gauge__base" d="M12 60a48 48 0 0 1 96 0"></path>
        <path class="if-chart-gauge__value" d="M12 60a48 48 0 0 1 96 0" pathLength="100"></path>
        <line class="if-chart-gauge__target" x1="60" y1="60" x2="60" y2="18"></line>
      </svg>
      <strong>${escapeHtml(value.toFixed(0))}%</strong>
      <span>${escapeHtml(label)}</span>
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderTreemapChart(slot, data) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  slot.innerHTML = `
    <div class="if-chart-treemap">
      ${data.map((item, index) => {
        const share = (item.value / total) * 100;
        return `<span class="if-chart-treemap__tile" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(item.label)}" data-if-chart-value="${escapeHtml(String(item.value))}" data-if-chart-share="${share.toFixed(1)}% of total" style="--tile:${Math.max(16, share * 2.2).toFixed(2)}%;--i:${index};"><strong>${escapeHtml(item.label)}</strong><em>${escapeHtml(item.value.toLocaleString())}</em></span>`;
      }).join("")}
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderBulletChart(slot, data) {
  const max = Number.parseFloat(slot.dataset.ifChartMax || "100") || 100;
  const target = Number.parseFloat(slot.dataset.ifChartTargetValue || "80") || 80;
  slot.innerHTML = `
    <div class="if-chart-bullet-list">
      ${data.map((item, index) => {
        const percent = Math.max(0, Math.min(100, (item.value / max) * 100));
        const targetPercent = Math.max(0, Math.min(100, (target / max) * 100));
        return `<div class="if-chart-bullet" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(item.label)}" data-if-chart-value="${escapeHtml(String(item.value))}" data-if-chart-share="Target ${escapeHtml(String(target))}" style="--value:${percent.toFixed(2)}%;--target:${targetPercent.toFixed(2)}%;--i:${index};"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value.toLocaleString())}</strong><em></em></div>`;
      }).join("")}
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderPieChart(slot, data) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const colors = ["var(--if-accent)", "var(--if-color-cyan-700)", "var(--if-success)", "var(--if-warning)", "var(--if-danger)", "var(--if-color-slate-500)"];
  let offset = 0;
  slot.innerHTML = `
    <div class="if-chart-pie-wrap">
      <svg class="if-chart-pie" viewBox="0 0 42 42" role="img" aria-label="${escapeHtml(slot.dataset.ifChartLabel || "Pie chart")}">
        <circle class="if-chart-pie__base" cx="21" cy="21" r="15.915"></circle>
        ${data.map((item, index) => {
          const portion = (item.value / total) * 100;
          const dash = `${portion.toFixed(2)} ${Math.max(0, 100 - portion).toFixed(2)}`;
          const segment = `<circle class="if-chart-pie__segment" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(item.label)}" data-if-chart-value="${escapeHtml(String(item.value))}" data-if-chart-share="${Math.round(portion)}%" style="--i:${index};--if-chart-color:${colors[index % colors.length]};" cx="21" cy="21" r="15.915" stroke-dasharray="${dash}" stroke-dashoffset="${(-offset).toFixed(2)}"><title>${escapeHtml(item.label)}: ${escapeHtml(item.value.toLocaleString())}</title></circle>`;
          offset += portion;
          return segment;
        }).join("")}
      </svg>
      <div class="if-chart-legend">
        ${data.map((item, index) => `<span><i style="--i:${index};--if-chart-color:${colors[index % colors.length]};"></i>${escapeHtml(item.label)} <strong>${Math.round((item.value / total) * 100)}%</strong></span>`).join("")}
      </div>
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function renderHeatmap(slot, rows) {
  const values = rows.flatMap((row) => row.values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const columns = Math.max(...rows.map((row) => row.values.length), 1);
  slot.innerHTML = `
    <div class="if-chart-heatmap" style="--cols:${columns};">
      ${rows.map((row) => `<div class="if-chart-heatmap__row"><span class="if-chart-heatmap__label">${escapeHtml(row.label)}</span>${row.values.map((value) => {
        const heat = (value - min) / range;
        const mix = Math.round(8 + heat * 44);
        const textMix = Math.round(58 + heat * 22);
        return `<span class="if-chart-heatmap__cell" tabindex="0" data-if-chart-point data-if-chart-label="${escapeHtml(row.label)}" data-if-chart-value="${escapeHtml(String(value))}" style="--heat-bg:color-mix(in srgb, var(--if-accent) ${mix}%, white);--heat-color:color-mix(in srgb, var(--if-accent) ${textMix}%, var(--if-text-strong));" title="${escapeHtml(row.label)}: ${escapeHtml(value.toLocaleString())}">${escapeHtml(value)}</span>`;
      }).join("")}</div>`).join("")}
    </div>
    <div class="if-chart-tooltip" data-if-chart-tooltip hidden></div>
  `;
}

function toggleChartSeries(control) {
  const chart = control.closest("[data-if-chart]");
  if (!chart) return;
  const series = control.dataset.ifChartSeriesToggle;
  const active = control.getAttribute("aria-pressed") !== "true";
  control.setAttribute("aria-pressed", String(active));
  control.classList.toggle("is-muted", !active);
  qsa(`[data-if-chart-series="${escapeCssIdentifier(series)}"]`, chart).forEach((point) => {
    point.classList.toggle("is-muted", !active);
  });
}

function showChartTooltip(point) {
  const chart = point?.closest?.("[data-if-chart]");
  const tooltip = qs("[data-if-chart-tooltip]", chart);
  if (!chart || !tooltip) return;
  const label = point.dataset.ifChartLabel || "Value";
  const value = Number.parseFloat(point.dataset.ifChartValue || "");
  const formatted = Number.isFinite(value) ? value.toLocaleString() : point.dataset.ifChartValue || "";
  const share = point.dataset.ifChartShare ? `<span>${escapeHtml(point.dataset.ifChartShare)}</span>` : "";
  tooltip.innerHTML = `<strong>${escapeHtml(label)}</strong><span>${escapeHtml(formatted)}</span>${share}`;
  tooltip.hidden = false;
  qsa("[data-if-chart-point]", chart).forEach((item) => item.classList.toggle("is-active", item === point));
}

function getChartPointDetail(point) {
  const chart = point?.closest?.("[data-if-chart]");
  const points = chart ? qsa("[data-if-chart-point]", chart) : [];
  const rawValue = point?.dataset?.ifChartValue || "";
  const numericValue = Number.parseFloat(rawValue);
  return {
    chart,
    point,
    type: chart?.dataset?.ifChart || "",
    chartLabel: chart?.dataset?.ifChartLabel || "",
    index: Math.max(0, points.indexOf(point)),
    label: point?.dataset?.ifChartLabel || "",
    value: Number.isFinite(numericValue) ? numericValue : rawValue,
    rawValue,
    share: point?.dataset?.ifChartShare || "",
    series: point?.dataset?.ifChartSeries || "",
    selected: true
  };
}

function selectChartPoint(point, options = {}) {
  const chart = point?.closest?.("[data-if-chart]");
  if (!chart) return null;
  const detail = getChartPointDetail(point);
  qsa("[data-if-chart-point]", chart).forEach((item) => {
    const selected = item === point;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-selected", String(selected));
  });
  chart.dataset.ifChartSelectedIndex = String(detail.index);
  chart.dataset.ifChartSelectedLabel = detail.label;
  if (options.focus) point.focus?.({ preventScroll: true });
  showChartTooltip(point);
  dispatchFrameworkEvent(chart, "if:chart-point-select", detail);
  return detail;
}

function prepareChartPoints(chart) {
  qsa("[data-if-chart-point]", chart).forEach((point, index) => {
    const label = point.dataset.ifChartLabel || `Point ${index + 1}`;
    const rawValue = point.dataset.ifChartValue || "";
    const share = point.dataset.ifChartShare ? `, ${point.dataset.ifChartShare}` : "";
    point.dataset.ifChartIndex = String(index);
    if (!point.hasAttribute("role")) point.setAttribute("role", "button");
    if (!point.hasAttribute("tabindex")) point.setAttribute("tabindex", "0");
    if (!point.hasAttribute("aria-selected")) point.setAttribute("aria-selected", "false");
    if (!point.hasAttribute("aria-label")) point.setAttribute("aria-label", `${label}: ${rawValue}${share}`);
  });
}

function hideChartTooltip(chart) {
  const tooltip = qs("[data-if-chart-tooltip]", chart);
  if (tooltip) tooltip.hidden = true;
  qsa("[data-if-chart-point]", chart).forEach((item) => item.classList.remove("is-active"));
}

function setChartThreshold(control) {
  const target = qs(control.dataset.ifChartTarget || "");
  if (!target) return;
  const threshold = Number.parseFloat(control.value || "0");
  qsa("[data-if-chart-point]", target).forEach((point) => {
    const value = Number.parseFloat(point.dataset.ifChartValue || "0");
    point.classList.toggle("is-muted", Number.isFinite(value) && value < threshold);
  });
  qsa(`[data-if-chart-threshold-value="${control.dataset.ifChartTarget}"]`).forEach((item) => {
    item.textContent = Number.isFinite(threshold) ? threshold.toLocaleString() : "0";
  });
}

function setChartHeight(control) {
  const target = qs(control.dataset.ifChartTarget || "");
  if (!target) return;
  const height = Number.parseFloat(control.value || "11");
  target.style.setProperty("--chart-height", `${height}rem`);
  qsa(`[data-if-chart-height-value="${control.dataset.ifChartTarget}"]`).forEach((item) => {
    item.textContent = `${height.toFixed(0)}rem`;
  });
}

function renderChartSlot(slot) {
  if (!slot) return;
  const type = slot.dataset.ifChart;
  slot.classList.add("if-chart", `if-chart--${type}`);
  slot.innerHTML = "";
  if (type === "heatmap") {
    const rows = parseHeatmapData(slot.dataset.ifChartData);
    if (rows.length) renderHeatmap(slot, rows);
    return;
  }
  if (type === "grouped-bar" || type === "stacked-bar") {
    const { rows, seriesNames } = parseChartSeries(slot.dataset.ifChartData);
    if (rows.length && seriesNames.length) {
      if (type === "grouped-bar") renderGroupedBarChart(slot, rows, seriesNames);
      if (type === "stacked-bar") renderStackedBarChart(slot, rows, seriesNames);
    }
    return;
  }
  if (type === "scatter") {
    const data = parseScatterData(slot.dataset.ifChartData);
    if (data.length) renderScatterChart(slot, data);
    return;
  }
  const data = parseChartPairs(slot.dataset.ifChartData);
  if (!data.length) return;
  if (type === "bar") renderBarChart(slot, data);
  if (type === "histogram") renderHistogramChart(slot, data);
  if (type === "funnel") renderFunnelChart(slot, data);
  if (type === "line") renderLineChart(slot, data);
  if (type === "gauge") renderGaugeChart(slot, data);
  if (type === "bullet") renderBulletChart(slot, data);
  if (type === "pie") renderPieChart(slot, data);
  if (type === "treemap") renderTreemapChart(slot, data);
}

function hydrateCharts(root) {
  const slots = root?.matches?.("[data-if-chart]") ? [root] : qsa("[data-if-chart]", root);
  slots.forEach((slot) => {
    renderChartSlot(slot);
    prepareChartPoints(slot);
  });
}

function getConfigurationTarget(selector = "", scope = document) {
  if (!selector) return null;
  return qs(selector, scope) || qs(selector);
}

function formatConfigurationControlValue(control) {
  const unit = control?.dataset?.ifControlUnit || "";
  return `${control?.value ?? ""}${unit}`;
}

function setControlVariable(control) {
  if (!control?.dataset?.ifControlVar) return null;
  const target = getConfigurationTarget(control.dataset.ifControlTarget || "", control.closest("[data-if-config-demo]") || document);
  if (!target) return null;
  const unit = control.dataset.ifControlUnit || "";
  const value = formatConfigurationControlValue(control);
  target.style.setProperty(control.dataset.ifControlVar, value);
  const outputSelector = control.dataset.ifControlOutput;
  if (outputSelector) {
    qsa(outputSelector).forEach((item) => {
      item.textContent = value;
    });
  }
  target.dispatchEvent(new CustomEvent("if:control-var", {
    bubbles: true,
    detail: {
      control,
      target,
      property: control.dataset.ifControlVar,
      unit,
      value
    }
  }));
  return { control, target, property: control.dataset.ifControlVar, unit, value };
}

function getDiagramControlTarget(control) {
  const diagram = control.closest("[data-if-diagram]");
  const targetSelector = control.dataset.ifDiagramTarget;
  return targetSelector ? qs(targetSelector, diagram || document) : diagram;
}

function setDiagramVariable(control) {
  const target = getDiagramControlTarget(control);
  if (!target || !control.dataset.ifDiagramVar) return;
  const unit = control.dataset.ifDiagramUnit || "";
  const value = `${control.value}${unit}`;
  target.style.setProperty(control.dataset.ifDiagramVar, value);
  const outputSelector = control.dataset.ifDiagramOutput;
  if (outputSelector) {
    qsa(outputSelector, control.closest("[data-if-diagram]") || document).forEach((item) => {
      item.textContent = value;
    });
  }
  target.dispatchEvent(new CustomEvent("if:diagram-var", {
    bubbles: true,
    detail: { control, property: control.dataset.ifDiagramVar, value }
  }));
  qsa("[data-if-connector-routing]", target.matches("[data-if-connector-routing]") ? target : target.closest("[data-if-diagram]") || target).forEach(refreshConnectorRoutes);
}

function getConnectorNode(surface, id) {
  if (!surface || !id) return null;
  const escaped = escapeCssIdentifier(id);
  return qs(`[data-if-connector-node="${escaped}"], #${escaped}`, surface);
}

function collectConnectorRoutes(surface) {
  if (!surface) return { connectors: [], nodes: [] };
  const nodes = qsa("[data-if-connector-node]", surface).map((node) => ({
    element: node,
    id: node.dataset.ifConnectorNode || node.id
  }));
  const connectors = qsa("[data-if-connector-route]", surface).map((connector) => ({
    element: connector,
    id: connector.dataset.ifConnectorRoute || `${connector.dataset.ifConnectorFrom || "from"}-${connector.dataset.ifConnectorTo || "to"}`,
    from: connector.dataset.ifConnectorFrom,
    fromAnchor: connector.dataset.ifConnectorFromAnchor,
    to: connector.dataset.ifConnectorTo,
    toAnchor: connector.dataset.ifConnectorToAnchor,
    label: connector.dataset.ifConnectorLabel || connector.textContent.trim(),
    labelHidden: connector.dataset.ifConnectorLabelHidden === "true",
    style: connector.dataset.ifConnectorStyle || surface.dataset.ifConnectorStyle || "orthogonal",
    tone: connector.dataset.ifConnectorTone || "primary",
    waypoints: connector.dataset.ifConnectorWaypoints || ""
  })).filter((connector) => connector.from && connector.to);
  return { connectors, nodes };
}

function parseConnectorWaypointValue(value, span) {
  const text = String(value || "").trim();
  if (text.endsWith("%")) {
    const percent = Number.parseFloat(text);
    return Number.isFinite(percent) ? span * percent / 100 : Number.NaN;
  }
  return Number.parseFloat(text);
}

function parseConnectorWaypoints(value, surfaceSize = null) {
  return String(value || "")
    .split(";")
    .map((pair) => {
      const [xPart, yPart] = pair.split(",");
      const rawX = parseConnectorWaypointValue(xPart, surfaceSize?.width || 1);
      const rawY = parseConnectorWaypointValue(yPart, surfaceSize?.height || 1);
      if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return null;
      return { x: rawX, y: rawY };
    })
    .filter(Boolean);
}

function serializeConnectorWaypoints(points = []) {
  return points
    .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    .map((point) => `${Math.round(point.x)},${Math.round(point.y)}`)
    .join(";");
}

function serializeConnectorWaypointPercent(x, y) {
  const px = clamp(Number.parseFloat(x) || 50, 0, 100);
  const py = clamp(Number.parseFloat(y) || 50, 0, 100);
  return `${Math.round(px)}%,${Math.round(py)}%`;
}

function getConnectorWaypointPercent(connector, surface) {
  const surfaceRect = surface?.getBoundingClientRect?.();
  const point = parseConnectorWaypoints(connector?.dataset?.ifConnectorWaypoints, surfaceRect)[0];
  if (!point || !surfaceRect?.width || !surfaceRect?.height) return { x: 50, y: 50 };
  return {
    x: Math.round(clamp(point.x / surfaceRect.width * 100, 0, 100)),
    y: Math.round(clamp(point.y / surfaceRect.height * 100, 0, 100))
  };
}

function getConnectorRect(surfaceRect, rect, padding = 0) {
  return {
    left: rect.left - surfaceRect.left - padding,
    right: rect.right - surfaceRect.left + padding,
    top: rect.top - surfaceRect.top - padding,
    bottom: rect.bottom - surfaceRect.top + padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  };
}

function getConnectorObstacleRects(surface, surfaceRect, from, to, padding = 12) {
  return qsa("[data-if-connector-node]", surface)
    .filter((node) => node !== from && node !== to && !node.hidden && !node.closest("[hidden]"))
    .map((node) => getConnectorRect(surfaceRect, node.getBoundingClientRect(), padding))
    .filter((rect) => rect.width > 0 && rect.height > 0);
}

function segmentIntersectsRect(start, end, rect) {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  if (maxX < rect.left || minX > rect.right || maxY < rect.top || minY > rect.bottom) return false;
  if (Math.abs(start.y - end.y) < 0.1) return start.y >= rect.top && start.y <= rect.bottom;
  if (Math.abs(start.x - end.x) < 0.1) return start.x >= rect.left && start.x <= rect.right;
  const samples = 10;
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
  }
  return false;
}

function getConnectorPathLength(points = []) {
  return points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    return sum + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
}

function getConnectorPointAtRatio(points = [], ratio = 0.5) {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  const total = getConnectorPathLength(points);
  if (!total) return points[Math.floor(points.length / 2)];
  const target = total * ratio;
  let travelled = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const length = Math.hypot(point.x - previous.x, point.y - previous.y);
    if (travelled + length >= target) {
      const t = length ? (target - travelled) / length : 0;
      return {
        x: previous.x + (point.x - previous.x) * t,
        y: previous.y + (point.y - previous.y) * t
      };
    }
    travelled += length;
  }
  return points[points.length - 1];
}

function scoreConnectorPoints(points, obstacles, surfaceRect) {
  const length = getConnectorPathLength(points);
  let score = length * 0.01 + Math.max(0, points.length - 2) * 4;
  points.forEach((point) => {
    if (point.x < 0 || point.y < 0 || point.x > surfaceRect.width || point.y > surfaceRect.height) score += 180;
  });
  points.slice(1).forEach((point, index) => {
    const previous = points[index];
    obstacles.forEach((rect) => {
      if (segmentIntersectsRect(previous, point, rect)) score += 900;
    });
  });
  return score;
}

function connectorPointsToPath(points = []) {
  if (!points.length) return "";
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
}

function clampConnectorLane(value, min, max) {
  if (max <= min) return value;
  return clamp(value, min, max);
}

function getSmartConnectorPoints(surfaceRect, start, end, obstacles, style = "orthogonal") {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const clearance = 22;
  const minX = clearance;
  const maxX = Math.max(minX, surfaceRect.width - clearance);
  const minY = clearance;
  const maxY = Math.max(minY, surfaceRect.height - clearance);
  const candidates = [];
  const add = (points) => {
    candidates.push(points.map((point) => ({
      x: clampConnectorLane(point.x, -surfaceRect.width * 0.35, surfaceRect.width * 1.35),
      y: clampConnectorLane(point.y, -surfaceRect.height * 0.35, surfaceRect.height * 1.35)
    })));
  };

  if (style === "elbow") {
    add([start, { x: end.x, y: start.y }, end]);
    add([start, { x: start.x, y: end.y }, end]);
  } else {
    const midX = start.x + dx * 0.5;
    const midY = start.y + dy * 0.5;
    add([start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]);
    add([start, { x: start.x, y: midY }, { x: end.x, y: midY }, end]);
    obstacles.forEach((rect) => {
      [rect.left - clearance, rect.right + clearance].forEach((laneX) => {
        const x = clampConnectorLane(laneX, minX, maxX);
        add([start, { x, y: start.y }, { x, y: end.y }, end]);
      });
      [rect.top - clearance, rect.bottom + clearance].forEach((laneY) => {
        const y = clampConnectorLane(laneY, minY, maxY);
        add([start, { x: start.x, y }, { x: end.x, y }, end]);
      });
    });
  }

  return candidates
    .map((points) => ({ points, score: scoreConnectorPoints(points, obstacles, surfaceRect) }))
    .sort((a, b) => a.score - b.score)[0]?.points || [start, end];
}

function getConnectorAnchorPoint(surfaceRect, rect, anchor) {
  const cx = rect.left - surfaceRect.left + rect.width / 2;
  const cy = rect.top - surfaceRect.top + rect.height / 2;
  if (anchor === "left") return { x: rect.left - surfaceRect.left, y: cy };
  if (anchor === "right") return { x: rect.right - surfaceRect.left, y: cy };
  if (anchor === "top") return { x: cx, y: rect.top - surfaceRect.top };
  if (anchor === "bottom") return { x: cx, y: rect.bottom - surfaceRect.top };
  return { x: cx, y: cy };
}

function inferConnectorAnchors(fromRect, toRect) {
  const fromCx = fromRect.left + fromRect.width / 2;
  const fromCy = fromRect.top + fromRect.height / 2;
  const toCx = toRect.left + toRect.width / 2;
  const toCy = toRect.top + toRect.height / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { from: dx >= 0 ? "right" : "left", to: dx >= 0 ? "left" : "right" };
  }
  return { from: dy >= 0 ? "bottom" : "top", to: dy >= 0 ? "top" : "bottom" };
}

function computeConnectorRoute(surface, connectorOrOptions = {}, options = {}) {
  const connector = connectorOrOptions?.element ? connectorOrOptions.element : connectorOrOptions;
  const fromId = connectorOrOptions.from || connector?.dataset?.ifConnectorFrom || options.from;
  const toId = connectorOrOptions.to || connector?.dataset?.ifConnectorTo || options.to;
  const from = options.fromElement || getConnectorNode(surface, fromId);
  const to = options.toElement || getConnectorNode(surface, toId);
  if (!surface || !from || !to || from.hidden || to.hidden) return null;
  const surfaceRect = surface.getBoundingClientRect();
  const fromRect = from.getBoundingClientRect();
  const toRect = to.getBoundingClientRect();
  if (!surfaceRect.width || !surfaceRect.height || !fromRect.width || !toRect.width) return null;
  const inferred = inferConnectorAnchors(fromRect, toRect);
  const fromAnchor = options.fromAnchor || connectorOrOptions.fromAnchor || connector?.dataset?.ifConnectorFromAnchor || inferred.from;
  const toAnchor = options.toAnchor || connectorOrOptions.toAnchor || connector?.dataset?.ifConnectorToAnchor || inferred.to;
  const start = getConnectorAnchorPoint(surfaceRect, fromRect, fromAnchor);
  const end = getConnectorAnchorPoint(surfaceRect, toRect, toAnchor);
  const style = options.style || connectorOrOptions.style || connector?.dataset?.ifConnectorStyle || surface.dataset.ifConnectorStyle || "orthogonal";
  const waypoints = options.waypoints || parseConnectorWaypoints(connectorOrOptions.waypoints || connector?.dataset?.ifConnectorWaypoints, surfaceRect);
  const defaultAvoid = connector?.dataset?.ifConnectorAvoid !== "false" && surface.dataset.ifConnectorAvoid !== "false";
  const avoid = options.avoid ?? defaultAvoid;
  const obstacles = avoid ? getConnectorObstacleRects(surface, surfaceRect, from, to, toFiniteNumber(surface.dataset.ifConnectorObstaclePadding, 12)) : [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  let label = { x: start.x + dx * 0.5, y: start.y + dy * 0.5 };
  let points = [start, end];
  if (waypoints.length) {
    points = [start, ...waypoints, end];
    d = connectorPointsToPath(points);
    label = getConnectorPointAtRatio(points, 0.5);
  } else if (style === "direct") {
    d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  } else if (style === "curved") {
    const curve = Math.max(28, Math.min(96, Math.hypot(dx, dy) * 0.22));
    const normalX = dy === 0 ? 0 : -Math.sign(dy) * curve;
    const normalY = dx === 0 ? 0 : Math.sign(dx) * curve;
    const c1 = { x: start.x + dx * 0.36 + normalX, y: start.y + dy * 0.18 + normalY };
    const c2 = { x: start.x + dx * 0.64 + normalX, y: start.y + dy * 0.82 + normalY };
    d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)} ${c2.x.toFixed(2)} ${c2.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    label = { x: start.x + dx * 0.5 + normalX * 0.55, y: start.y + dy * 0.5 + normalY * 0.55 };
  } else if (style === "orthogonal" || style === "elbow") {
    points = getSmartConnectorPoints(surfaceRect, start, end, obstacles, style);
    d = connectorPointsToPath(points);
    label = getConnectorPointAtRatio(points, 0.5);
  }
  return {
    d,
    end,
    from,
    label,
    obstacles,
    points,
    start,
    style,
    surfaceSize: { width: surfaceRect.width, height: surfaceRect.height },
    to
  };
}

function ensureConnectorLayer(surface) {
  let layer = qs("[data-if-connector-layer]", surface);
  if (!layer) {
    if (!surface.dataset.ifConnectorMarkerId) {
      connectorRouteCounter += 1;
      surface.dataset.ifConnectorMarkerId = `if-connector-arrow-${connectorRouteCounter}`;
    }
    layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    layer.classList.add("if-connector-route-layer");
    layer.dataset.ifConnectorLayer = "";
    layer.setAttribute("aria-hidden", "true");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const markerColors = {
      primary: "var(--if-link)",
      async: "var(--if-info)",
      guarded: "var(--if-warning)",
      success: "var(--if-success)",
      danger: "var(--if-danger)",
      neutral: "var(--if-text-muted)"
    };
    defs.innerHTML = Object.entries(markerColors).map(([tone, color]) => `
      <marker id="${surface.dataset.ifConnectorMarkerId}-${tone}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"></path>
      </marker>
    `).join("");
    layer.append(defs);
    surface.prepend(layer);
  }
  return layer;
}

function ensureConnectorLabel(surface, id) {
  let label = qs(`[data-if-connector-label-node="${escapeCssIdentifier(id)}"]`, surface);
  if (!label) {
    label = document.createElement("span");
    label.className = "if-connector-route-label";
    label.dataset.ifConnectorLabelNode = id;
    label.setAttribute("role", "button");
    label.setAttribute("tabindex", "0");
    surface.append(label);
  }
  return label;
}

function getDiagramRouteElement(diagram, routeId) {
  if (!diagram || !routeId) return null;
  const surface = getDiagramConnectorSurface(diagram);
  return qs(`[data-if-connector-route="${escapeCssIdentifier(routeId)}"]`, surface || diagram);
}

function getDiagramSelectedRoute(diagram) {
  return getDiagramRouteElement(diagram, diagram?.dataset?.ifDiagramSelectedRoute);
}

function clearDiagramConnectorFocus(diagram) {
  if (!diagram) return;
  const surface = getDiagramConnectorSurface(diagram) || diagram;
  delete diagram.dataset.ifDiagramSelectedRoute;
  qsa("[data-if-connector-label-node], [data-if-connector-path]", surface).forEach((element) => {
    element.classList.remove("is-focused");
    if (element.matches?.("[data-if-connector-label-node]")) element.setAttribute("aria-pressed", "false");
  });
}

function getDiagramRouteSummary(route, diagram) {
  const from = getDiagramLayoutItem(diagram, route?.dataset?.ifConnectorFrom);
  const to = getDiagramLayoutItem(diagram, route?.dataset?.ifConnectorTo);
  const fromTitle = route?.dataset?.diagramFromTitle || (from ? getDiagramItemSummary(from).title : route?.dataset?.ifConnectorFrom || "Source");
  const toTitle = route?.dataset?.diagramToTitle || (to ? getDiagramItemSummary(to).title : route?.dataset?.ifConnectorTo || "Target");
  const label = route?.dataset?.ifConnectorLabel || "Connection";
  const style = route?.dataset?.ifConnectorStyle || "orthogonal";
  const tone = route?.dataset?.ifConnectorTone || "primary";
  return {
    title: route?.dataset?.diagramTitle || `${label}: ${fromTitle} to ${toTitle}`,
    description: route?.dataset?.diagramDescription || `Connector route from ${fromTitle} to ${toTitle}. Style: ${style}. Tone: ${tone}.`,
    stageTitle: route?.dataset?.diagramSection || "Diagram connector",
    status: route?.dataset?.diagramStatus || style,
    owner: route?.dataset?.diagramOwner || fromTitle,
    throughput: route?.dataset?.diagramThroughput || label,
    dependencies: route?.dataset?.diagramDependencies || toTitle,
    contract: route?.dataset?.diagramContract || "Editable connector route. Change label, style, tone, anchor points, and manual bend waypoints while edit mode is enabled."
  };
}

function selectDiagramConnectorRoute(routeOrLabel) {
  const routeId = routeOrLabel?.dataset?.ifConnectorRoute || routeOrLabel?.dataset?.ifConnectorLabelNode;
  const surface = routeOrLabel?.closest?.("[data-if-connector-routing]");
  const diagram = surface?.closest?.("[data-if-diagram]") || routeOrLabel?.closest?.("[data-if-diagram]");
  const route = routeOrLabel?.matches?.("[data-if-connector-route]") ? routeOrLabel : getDiagramRouteElement(diagram, routeId);
  if (!diagram || !surface || !route) return null;
  qsa(diagramFocusedSelector, diagram).forEach((active) => {
    active.classList.remove("is-focused");
    active.setAttribute("aria-pressed", "false");
    active.setAttribute("aria-selected", "false");
  });
  clearDiagramConnectorFocus(diagram);
  const id = route.dataset.ifConnectorRoute;
  diagram.dataset.ifDiagramSelectedRoute = id;
  qs(`[data-if-connector-label-node="${escapeCssIdentifier(id)}"]`, surface)?.classList.add("is-focused");
  qs(`[data-if-connector-label-node="${escapeCssIdentifier(id)}"]`, surface)?.setAttribute("aria-pressed", "true");
  qs(`[data-if-connector-path="${escapeCssIdentifier(id)}"]`, surface)?.classList.add("is-focused");
  diagram.dataset.diagramFocus = "true";
  const panel = qs("[data-if-diagram-detail]", diagram);
  if (panel) {
    const summary = getDiagramRouteSummary(route, diagram);
    const bindings = {
      "[data-if-diagram-detail-title]": summary.title,
      "[data-if-diagram-detail-eyebrow]": summary.stageTitle,
      "[data-if-diagram-detail-body]": summary.description,
      "[data-if-diagram-detail-status]": summary.status,
      "[data-if-diagram-detail-owner]": summary.owner,
      "[data-if-diagram-detail-throughput]": summary.throughput,
      "[data-if-diagram-detail-dependencies]": summary.dependencies,
      "[data-if-diagram-detail-contract]": summary.contract
    };
    Object.entries(bindings).forEach(([selector, value]) => {
      const target = qs(selector, panel);
      if (target) target.textContent = value;
    });
    panel.hidden = false;
  }
  setFocusSurfaceActive(diagram, true, { item: route, kind: "diagram-route", title: route.dataset.ifConnectorLabel || id });
  syncDiagramEditor(diagram, null);
  updateDiagramStats(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-route-select", {
    bubbles: true,
    detail: { connector: route, diagram, routeId: id, surface }
  }));
  return route;
}

function applyConnectorRoutes(surface) {
  if (!surface) return [];
  surface.classList.add("if-connector-route-surface");
  const layer = ensureConnectorLayer(surface);
  const surfaceRect = surface.getBoundingClientRect();
  layer.setAttribute("viewBox", `0 0 ${Math.max(1, surfaceRect.width).toFixed(2)} ${Math.max(1, surfaceRect.height).toFixed(2)}`);
  layer.setAttribute("preserveAspectRatio", "none");
  const { connectors } = collectConnectorRoutes(surface);
  const activeIds = new Set();
  const routes = [];
  connectors.forEach((connector) => {
    const route = computeConnectorRoute(surface, connector);
    const pathId = connector.id;
    activeIds.add(pathId);
    let path = qs(`[data-if-connector-path="${escapeCssIdentifier(pathId)}"]`, layer);
    if (!route) {
      path?.remove();
      qs(`[data-if-connector-label-node="${escapeCssIdentifier(pathId)}"]`, surface)?.remove();
      return;
    }
    if (!path) {
      path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.dataset.ifConnectorPath = pathId;
      layer.append(path);
    }
    path.setAttribute("d", route.d);
    const markerTone = ["async", "guarded", "success", "danger", "neutral"].includes(connector.tone) ? connector.tone : "primary";
    path.setAttribute("marker-end", `url(#${surface.dataset.ifConnectorMarkerId}-${markerTone})`);
    path.className.baseVal = `if-connector-route-path is-${connector.tone} is-${route.style}`;
    if (surface.closest("[data-if-diagram]")?.dataset.ifDiagramSelectedRoute === pathId) path.classList.add("is-focused");
    const label = ensureConnectorLabel(surface, pathId);
    label.textContent = connector.label || connector.id;
    label.hidden = Boolean(connector.labelHidden);
    label.style.left = `${route.label.x}px`;
    label.style.top = `${route.label.y}px`;
    label.className = `if-connector-route-label is-${connector.tone} is-${route.style}`;
    label.classList.toggle("is-focused", surface.closest("[data-if-diagram]")?.dataset.ifDiagramSelectedRoute === pathId);
    label.setAttribute("aria-label", `Edit connector ${connector.label || connector.id}`);
    label.setAttribute("aria-pressed", String(surface.closest("[data-if-diagram]")?.dataset.ifDiagramSelectedRoute === pathId));
    label.title = "Select connector route";
    routes.push({ ...connector, route });
  });
  qsa("[data-if-connector-path]", layer).forEach((path) => {
    if (!activeIds.has(path.dataset.ifConnectorPath)) path.remove();
  });
  qsa("[data-if-connector-label-node]", surface).forEach((label) => {
    if (!activeIds.has(label.dataset.ifConnectorLabelNode)) label.remove();
  });
  surface.dispatchEvent(new CustomEvent("if:connector-routes", {
    bubbles: true,
    detail: { routes, surface }
  }));
  return routes;
}

function refreshConnectorRoutes(surface = document) {
  if (surface.matches?.("[data-if-connector-routing]")) return applyConnectorRoutes(surface);
  const results = [];
  qsa("[data-if-connector-routing]", surface).forEach((target) => {
    results.push(...applyConnectorRoutes(target));
  });
  return results;
}

function hydrateConnectorRoutes(root = document) {
  qsa("[data-if-connector-routing]", root).forEach((surface) => {
    surface.classList.add("if-connector-route-surface");
    applyConnectorRoutes(surface);
  });
}

const balancedGridObservers = new WeakMap();

function getBalancedGridItems(grid) {
  const selector = (grid?.dataset?.ifBalancedGridItems || "").trim();
  const items = selector ? qsa(selector, grid) : Array.from(grid?.children || []);
  return items.filter((item) => !item.hidden && item.getAttribute?.("aria-hidden") !== "true");
}

function readPixelValue(value, fallback) {
  const parsed = Number.parseFloat(String(value || "").replace("px", ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getBalancedGridMinWidth(grid) {
  const explicit = readPixelValue(grid?.dataset?.ifBalancedGridMin, 0);
  if (explicit) return explicit;
  const styles = window.getComputedStyle(grid);
  return readPixelValue(styles.getPropertyValue("--if-balanced-grid-min"), 168);
}

function chooseBalancedGridColumns(count, maxColumns) {
  if (count <= 1) return Math.max(1, count);
  const cappedMax = Math.max(1, Math.min(count, maxColumns));
  if (count <= cappedMax) return count;
  let best = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let columns = cappedMax; columns >= 1; columns -= 1) {
    const rows = Math.ceil(count / columns);
    const lastRow = count % columns || columns;
    const ragged = columns - lastRow;
    const orphanPenalty = rows > 1 && lastRow < Math.ceil(columns / 2) ? 1000 : 0;
    const score = orphanPenalty + ragged * 10 + rows;
    if (score < bestScore) {
      best = columns;
      bestScore = score;
    }
  }
  return best;
}

function balanceGrid(grid) {
  if (!grid) return null;
  const items = getBalancedGridItems(grid);
  const count = items.length;
  const styles = window.getComputedStyle(grid);
  const width = grid.getBoundingClientRect().width || grid.clientWidth || 0;
  const gap = readPixelValue(styles.columnGap || styles.gap, 0);
  const minWidth = getBalancedGridMinWidth(grid);
  const explicitMax = Number.parseInt(grid.dataset.ifBalancedGridMax || "", 10);
  const widthMax = width > 0 ? Math.max(1, Math.floor((width + gap) / (minWidth + gap))) : count || 1;
  const maxColumns = Number.isFinite(explicitMax) && explicitMax > 0 ? Math.min(widthMax, explicitMax) : widthMax;
  const columns = chooseBalancedGridColumns(count, maxColumns);
  grid.style.setProperty("--if-balanced-grid-columns", String(columns));
  grid.dataset.ifBalancedGridColumns = String(columns);
  grid.dataset.ifBalancedGridCount = String(count);
  grid.dispatchEvent(new CustomEvent("if:balanced-grid", {
    bubbles: true,
    detail: { grid, count, columns, maxColumns, minWidth }
  }));
  return { grid, count, columns, maxColumns, minWidth };
}

function refreshBalancedGrids(root = document) {
  const grids = root?.matches?.("[data-if-balanced-grid]") ? [root] : qsa("[data-if-balanced-grid]", root);
  return grids.map(balanceGrid);
}

function hydrateBalancedGrids(root = document) {
  const grids = root?.matches?.("[data-if-balanced-grid]") ? [root] : qsa("[data-if-balanced-grid]", root);
  grids.forEach((grid) => {
    grid.classList.add("if-balanced-grid");
    balanceGrid(grid);
    if (balancedGridObservers.has(grid) || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => balanceGrid(grid));
    observer.observe(grid, { childList: true, subtree: false, attributes: true, attributeFilter: ["hidden", "aria-hidden"] });
    balancedGridObservers.set(grid, observer);
  });
}

function destroyBalancedGrids(root = document) {
  const grids = root?.matches?.("[data-if-balanced-grid]") ? [root] : qsa("[data-if-balanced-grid]", root);
  grids.forEach((grid) => {
    balancedGridObservers.get(grid)?.disconnect();
    balancedGridObservers.delete(grid);
  });
}

function handleResize() {
  refreshConnectorRoutes(document);
  refreshBalancedGrids(document);
}

function getFocusSurface(target) {
  if (!target) return null;
  return target.matches?.("[data-if-focus-surface], [data-if-graph], [data-if-diagram]")
    ? target
    : target.closest?.("[data-if-focus-surface], [data-if-graph], [data-if-diagram]");
}

function getFocusSelectorList(surface, attr, fallback = "") {
  return (surface?.dataset?.[attr] || fallback)
    .split(",")
    .map((selector) => selector.trim())
    .filter(Boolean);
}

function queryFocusSurface(surface, attr, fallback = "") {
  return getFocusSelectorList(surface, attr, fallback).flatMap((selector) => qsa(selector, surface));
}

function setFocusSurfaceActive(surface, active, detail = {}) {
  if (!surface) return;
  surface.dataset.ifFocusActive = String(active);
  surface.dispatchEvent(new CustomEvent(active ? "if:focus-select" : "if:focus-clear", {
    bubbles: true,
    detail: { surface, ...detail }
  }));
}

function resetGenericFocusSurface(surface) {
  queryFocusSurface(surface, "ifFocusDetail").forEach((panel) => {
    panel.hidden = true;
    panel.classList.remove("is-active");
  });
  queryFocusSurface(surface, "ifFocusItem").forEach((item) => {
    item.classList.remove("is-selected", "is-focused", "is-related", "is-muted");
    item.setAttribute("aria-selected", "false");
    if (item.hasAttribute("aria-pressed")) item.setAttribute("aria-pressed", "false");
  });
  setFocusSurfaceActive(surface, false, { kind: surface.dataset.ifFocusSurface || "generic" });
}

function resetFocusSurface(target) {
  const surface = getFocusSurface(target);
  if (!surface) return;
  if (surface.matches("[data-if-graph]")) {
    resetGraphFocus(surface);
    return;
  }
  if (surface.matches("[data-if-diagram]")) {
    resetDiagramFocus(surface);
    return;
  }
  resetGenericFocusSurface(surface);
}

function shouldResetFocusSurfaceFromClick(surface, target) {
  if (!surface || surface.dataset.ifFocusActive !== "true") return false;
  const exclusions = [
    "[data-if-focus-detail]",
    "[data-if-focus-clear]",
    "[data-if-focus-item]"
  ].concat(getFocusSelectorList(surface, "ifFocusExclude"));
  return !exclusions.some((selector) => target.closest?.(selector));
}

function ensureFocusSurfaceCloseControls(root = document) {
  qsa("[data-if-focus-surface], [data-if-graph], [data-if-diagram]", root).forEach((surface) => {
    queryFocusSurface(surface, "ifFocusDetail", "[data-node-panel], [data-edge-panel], [data-if-diagram-detail]").forEach((panel) => {
      const header = qs(".if-panel__header, .if-diagram-detail-panel__summary", panel);
      if (!header || qs("[data-if-focus-clear]", header)) return;
      const close = document.createElement("button");
      close.className = "if-icon-btn if-icon-btn--sm";
      close.type = "button";
      close.dataset.ifFocusClear = "";
      close.setAttribute("aria-label", "Close details");
      close.title = "Close details";
      close.innerHTML = '<span class="if-icon-slot" data-if-icon="close" aria-hidden="true"></span>';
      header.append(close);
      hydrateIcons(close);
    });
  });
}

function getDiagramCardDescription(item) {
  if (!item) return "";
  if (item.dataset.diagramDescription) return item.dataset.diagramDescription;
  if (item.dataset.diagramCardText) return item.dataset.diagramCardText;
  const strong = qs("strong", item);
  const mediaDescription = strong?.parentElement && strong.parentElement !== item
    ? Array.from(strong.parentElement.children).find((child) =>
      child !== strong
      && child.matches?.("span, em, p")
      && !child.matches(".if-icon-slot, .if-asset-slot, .if-diagram-search-badge, .if-arch-service__badge")
    )
    : null;
  if (mediaDescription?.textContent?.trim()) return mediaDescription.textContent.trim();
  const descriptionTarget = getDiagramDescriptionTarget(item);
  if (descriptionTarget?.textContent?.trim()) return descriptionTarget.textContent.trim();
  return "";
}

function getDiagramItemSummary(item) {
  const title = item.dataset.diagramTitle || qs("strong", item)?.textContent?.trim() || "Diagram item";
  const description = getDiagramCardDescription(item) || item.dataset.diagramThroughput || "";
  const stage = item.closest(".if-arch-stage");
  const example = item.closest(".if-diagram-example, .if-architecture-diagram");
  const stageTitle = stage?.dataset.diagramTitle
    || (stage ? qs(".if-arch-stage__title", stage)?.textContent?.trim() : "")
    || item.dataset.diagramSection
    || (example ? qs(".if-diagram-example__header h3, .if-architecture-header__title, [aria-labelledby] h1", example)?.textContent?.trim() : "")
    || "Architecture";
  const status = item.dataset.diagramStatus || (item.classList.contains("if-arch-service--guarded") ? "Guarded" : "Active");
  const owner = item.dataset.diagramOwner || stageTitle;
  const throughput = item.dataset.diagramThroughput || `${Math.max(7, Math.round(title.length * 1.8))} linked artifacts`;
  const dependencies = item.dataset.diagramDependencies || `${Math.max(2, Math.round(description.length / 28))} relationship edges`;
  const contract = item.dataset.diagramContract || "Source-aware events, normalized metadata, provenance, and review-state updates.";
  return { title, description, stageTitle, status, owner, throughput, dependencies, contract };
}

function focusDiagramItem(item) {
  if (!item) return;
  const diagram = item.closest("[data-if-diagram]");
  if (!diagram) return;
  qsa(diagramFocusedSelector, diagram).forEach((active) => {
    active.classList.remove("is-focused");
    active.setAttribute("aria-pressed", "false");
    active.setAttribute("aria-selected", "false");
  });
  clearDiagramConnectorFocus(diagram);
  item.classList.add("is-focused");
  item.setAttribute("aria-pressed", "true");
  item.setAttribute("aria-selected", "true");
  item.focus?.({ preventScroll: true });
  diagram.dataset.diagramFocus = "true";
  const summary = getDiagramItemSummary(item);
  const panel = qs("[data-if-diagram-detail]", diagram);
  if (!panel) return;
  setFocusSurfaceActive(diagram, true, { item, kind: "diagram-item", title: summary.title });
  const bindings = {
    "[data-if-diagram-detail-title]": summary.title,
    "[data-if-diagram-detail-eyebrow]": summary.stageTitle,
    "[data-if-diagram-detail-body]": summary.description,
    "[data-if-diagram-detail-status]": summary.status,
    "[data-if-diagram-detail-owner]": summary.owner,
    "[data-if-diagram-detail-throughput]": summary.throughput,
    "[data-if-diagram-detail-dependencies]": summary.dependencies,
    "[data-if-diagram-detail-contract]": summary.contract
  };
  Object.entries(bindings).forEach(([selector, value]) => {
    const target = qs(selector, panel);
    if (target) target.textContent = value;
  });
  panel.hidden = false;
  syncDiagramEditor(diagram, item);
  updateDiagramStats(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-select", {
    bubbles: true,
    detail: { diagram, item, summary }
  }));
}

function resetDiagramFocus(target) {
  const diagram = target?.matches?.("[data-if-diagram]") ? target : target?.closest?.("[data-if-diagram]");
  if (!diagram) return;
  qsa(diagramFocusedSelector, diagram).forEach((active) => {
    active.classList.remove("is-focused");
    active.setAttribute("aria-pressed", "false");
    active.setAttribute("aria-selected", "false");
  });
  clearDiagramConnectorFocus(diagram);
  delete diagram.dataset.diagramFocus;
  const panel = qs("[data-if-diagram-detail]", diagram);
  if (panel) panel.hidden = true;
  syncDiagramEditor(diagram, null);
  setFocusSurfaceActive(diagram, false, { kind: "diagram" });
  updateDiagramStats(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-clear", {
    bubbles: true,
    detail: { diagram }
  }));
}

function toggleDiagramLayer(control) {
  const diagram = control.closest("[data-if-diagram]");
  if (!diagram) return;
  const layer = control.dataset.ifDiagramLayerToggle;
  if (!layer) return;
  const active = control.getAttribute("aria-pressed") !== "true";
  control.setAttribute("aria-pressed", String(active));
  control.classList.toggle("is-muted", !active);
  qsa(`[data-diagram-layer~="${escapeCssIdentifier(layer)}"]`, diagram).forEach((item) => {
    item.hidden = !active;
  });
  const focused = qs(diagramFocusedSelector, diagram);
  if (focused && (focused.hidden || focused.closest("[hidden]"))) resetDiagramFocus(diagram);
  refreshConnectorRoutes(diagram);
  updateDiagramStats(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-layer", {
    bubbles: true,
    detail: { layer, active }
  }));
}

function getDiagramSearchItems(diagram) {
  return qsa(diagramItemSelector, diagram)
    .filter((item) => !item.hidden && !item.closest("[hidden]"));
}

function getVisibleDiagramItems(diagram) {
  return getDiagramSearchItems(diagram)
    .filter((item) => item.getClientRects().length > 0);
}

function setDiagramStat(diagram, key, value) {
  qsa(`[data-if-diagram-stat="${escapeCssIdentifier(key)}"]`, diagram).forEach((target) => {
    target.textContent = value;
  });
}

function slugifyDiagramId(value) {
  return String(value || "diagram-item")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "diagram-item";
}

function normalizeDiagramExplicitId(value, fallback = "diagram-item") {
  const raw = String(value || "").trim();
  if (!raw) return slugifyDiagramId(fallback);
  return raw
    .replace(/\s+/g, "_")
    .replace(/[^\w:.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96) || slugifyDiagramId(fallback);
}

function canonicalDiagramId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getUniqueDiagramNodeId(diagram, preferred, fallback = "diagram-node") {
  ensureDiagramLayoutIds(diagram);
  const base = normalizeDiagramExplicitId(preferred, fallback);
  const used = new Set(qsa(diagramItemSelector, diagram).flatMap((item) => [
    item.id,
    item.dataset.diagramNodeId,
    item.dataset.ifDiagramLayoutId
  ]).map(canonicalDiagramId).filter(Boolean));
  let candidate = base;
  let index = 2;
  while (used.has(canonicalDiagramId(candidate))) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function ensureDiagramLayoutIds(diagram) {
  if (!diagram) return [];
  const seen = new Map();
  return qsa(diagramItemSelector, diagram).map((item, index) => {
    const base = item.dataset.ifDiagramLayoutId
      || item.dataset.ifDiagramItemId
      || item.id
      || slugifyDiagramId(item.dataset.diagramTitle || qs("strong", item)?.textContent?.trim() || `item-${index + 1}`);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    const id = count ? `${base}-${count + 1}` : base;
    item.dataset.ifDiagramLayoutId = id;
    if (!item.dataset.diagramNodeId) item.dataset.diagramNodeId = id;
    if (item.closest("[data-if-connector-routing]") && !item.dataset.ifConnectorNode) item.dataset.ifConnectorNode = id;
    return item;
  });
}

function getDiagramLayoutItem(diagram, id) {
  if (!diagram || !id) return null;
  return qs(`[data-if-diagram-layout-id="${escapeCssIdentifier(id)}"]`, diagram);
}

function getDiagramLayoutKey(diagram) {
  return diagram?.dataset.ifDiagramLayoutKey || diagram?.id || "interface-framework-diagram";
}

function getDiagramLayoutVersion(diagram) {
  return String(diagram?.dataset.ifDiagramLayoutVersion || "").trim();
}

function getDiagramLayoutStorageKey(diagram) {
  return `if:diagram-layout:${getDiagramLayoutKey(diagram)}`;
}

function isDiagramLayoutSnapshotCompatibleWithBaseline(diagram, snapshot = {}) {
  const baselineItems = diagram?.__ifDiagramBaseline?.items;
  if (!Array.isArray(baselineItems) || !baselineItems.length) return true;
  const snapshotIds = new Set((snapshot.items || []).map((item) => item.id).filter(Boolean));
  if (!snapshotIds.size) return false;
  return baselineItems
    .filter((item) => item?.dynamic !== true)
    .every((item) => item?.id && snapshotIds.has(item.id));
}

function getDiagramSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isInterfaceFrameworkTestMode() {
  return Boolean(window.__IF_TEST_MODE__ || document.body?.dataset.ifTestMode === "true");
}

function shouldRestoreDiagramLayoutOnInit(diagram) {
  return diagram?.dataset.ifDiagramLayoutRestore !== "false" && !isInterfaceFrameworkTestMode();
}

function getDiagramLayerState(diagram) {
  const toggles = qsa("[data-if-diagram-layer-toggle]", diagram);
  const active = toggles.filter((toggle) => toggle.getAttribute("aria-pressed") === "true").length;
  return {
    active,
    total: toggles.length,
    hidden: Math.max(0, toggles.length - active)
  };
}

const diagramEditToolSet = new Set(["inspect", "text", "move", "connect", "style", "add", "delete"]);

const diagramEditToolStatus = {
  inspect: "Edit mode on: inspect nodes or choose Text, Move, Connect, Style, Add, or Delete.",
  text: "Text mode: select a node, then edit fields in the detail panel",
  move: "Move mode: choose a parent container for the selected node; pixel nudges remain available for fine tuning",
  connect: "Connect mode: click a source node, then click a target node",
  style: "Style mode: select a node, then choose a tone",
  add: "Add mode: use Add node, then move and edit the new node",
  delete: "Delete mode: click a node to hide it from the session layout"
};

function getDiagramEditTool(diagram) {
  const tool = diagram?.dataset.diagramEditTool;
  return diagramEditToolSet.has(tool) ? tool : "inspect";
}

function getDiagramSelectedItem(diagram) {
  return diagram ? qs(diagramFocusedSelector, diagram) : null;
}

function getDiagramEditableSelection(diagram) {
  return getDiagramSelectedItem(diagram) || getVisibleDiagramItems(diagram)[0] || null;
}

function getDiagramConnectorSurface(diagram) {
  return qs("[data-if-connector-routing]", diagram) || diagram;
}

function getDiagramContainers(diagram) {
  return qsa(diagramContainerSelector, diagram).filter((container) => !container.hidden && !container.closest("[hidden]"));
}

function ensureDiagramContainerIds(diagram) {
  if (!diagram) return [];
  return getDiagramContainers(diagram).map((container, index) => {
    const id = container.dataset.ifDiagramContainer
      || slugifyDiagramId(container.dataset.ifDiagramContainerLabel || container.getAttribute("aria-label") || qs("h2, h3, header", container)?.textContent?.trim() || `container-${index + 1}`);
    container.dataset.ifDiagramContainer = id;
    if (!container.dataset.ifDiagramContainerLabel) {
      container.dataset.ifDiagramContainerLabel = container.getAttribute("aria-label") || qs("h2, h3, header", container)?.textContent?.trim() || formatDiagramTypeLabel(id);
    }
    return container;
  });
}

function getDiagramContainerById(diagram, id) {
  if (!diagram || !id) return null;
  ensureDiagramContainerIds(diagram);
  return qs(`[data-if-diagram-container="${escapeCssIdentifier(id)}"]`, diagram);
}

function getDiagramContainerForItem(item) {
  return item?.closest?.(diagramContainerSelector) || null;
}

function getSelectedDiagramContainer(diagram) {
  if (!diagram) return null;
  ensureDiagramContainerIds(diagram);
  const stored = getDiagramContainerById(diagram, diagram.dataset.ifDiagramSelectedContainer);
  if (stored) return stored;
  const selected = getDiagramSelectedItem(diagram);
  const selectedContainer = getDiagramContainerForItem(selected);
  if (selectedContainer) {
    diagram.dataset.ifDiagramSelectedContainer = selectedContainer.dataset.ifDiagramContainer;
    return selectedContainer;
  }
  return getDiagramContainers(diagram)[0] || null;
}

function getDiagramContainerTemplate(container = null) {
  return {
    background: container?.dataset.ifDiagramContainerBackground || container?.dataset.diagramNodeBackground || "surface",
    className: container?.dataset.ifDiagramContainerClass || "",
    description: container?.dataset.ifDiagramContainerDescription || "Describe capability, dependency, or interface contract.",
    icon: container?.dataset.ifDiagramContainerIcon || "component",
    layer: container?.dataset.ifDiagramContainerLayer || container?.dataset.diagramLayer || container?.closest("[data-diagram-layer]")?.dataset.diagramLayer || "custom",
    layout: container?.dataset.ifDiagramContainerLayout || "compact",
    owner: container?.dataset.ifDiagramContainerOwner || "Diagram editor",
    section: container?.dataset.ifDiagramContainerSection || container?.closest(".if-arch-stage")?.dataset.diagramTitle || container?.dataset.ifDiagramContainerLabel || "",
    status: container?.dataset.ifDiagramContainerStatus || "Draft",
    tone: container?.dataset.ifDiagramContainerTone || "accent",
    type: container?.dataset.ifDiagramContainerNodeType || "custom"
  };
}

function syncDiagramContainerControls(diagram) {
  if (!diagram) return;
  const containers = ensureDiagramContainerIds(diagram);
  const selected = getSelectedDiagramContainer(diagram);
  const currentId = containers.some((container) => container.dataset.ifDiagramContainer === diagram.dataset.ifDiagramSelectedContainer)
    ? diagram.dataset.ifDiagramSelectedContainer
    : selected?.dataset.ifDiagramContainer || containers[0]?.dataset.ifDiagramContainer || "";
  qsa("[data-if-diagram-container-select]", diagram).forEach((select) => {
    select.innerHTML = "";
    containers.forEach((container) => {
      const option = document.createElement("option");
      option.value = container.dataset.ifDiagramContainer;
      option.textContent = container.dataset.ifDiagramContainerLabel || option.value;
      select.append(option);
    });
    select.value = currentId;
    select.disabled = diagram.dataset.diagramEditing !== "true";
  });
  if (currentId) diagram.dataset.ifDiagramSelectedContainer = currentId;
}

function setDiagramSelectedContainer(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const container = getDiagramContainerById(diagram, control.value);
  if (!container) return null;
  diagram.dataset.ifDiagramSelectedContainer = container.dataset.ifDiagramContainer;
  setDiagramLayoutStatus(diagram, `Target container set to ${container.dataset.ifDiagramContainerLabel || container.dataset.ifDiagramContainer}`, "idle");
  return container;
}

function clearDiagramConnectSource(diagram) {
  if (!diagram) return;
  const sourceId = diagram.dataset.ifDiagramConnectFrom;
  if (sourceId) {
    const source = getDiagramLayoutItem(diagram, sourceId);
    source?.classList.remove("is-diagram-connect-source");
  }
  delete diagram.dataset.ifDiagramConnectFrom;
}

function syncDiagramEditControls(diagram) {
  if (!diagram) return;
  const editing = diagram.dataset.diagramEditing === "true";
  const tool = getDiagramEditTool(diagram);
  const selected = getDiagramSelectedItem(diagram);
  const selectedRoute = getDiagramSelectedRoute(diagram);
  qsa("[data-if-diagram-edit-tool]", diagram).forEach((control) => {
    const active = editing && control.dataset.ifDiagramEditTool === tool;
    control.disabled = !editing;
    control.setAttribute("aria-pressed", String(active));
    control.classList.toggle("is-active", active);
  });
  qsa("[data-if-diagram-add-node]", diagram).forEach((control) => {
    control.disabled = !editing;
    control.classList.toggle("is-active", editing && tool === "add");
    control.setAttribute("aria-pressed", String(editing && tool === "add"));
  });
  qsa("[data-if-diagram-add-from-source]", diagram).forEach((control) => {
    control.disabled = !editing || !getDiagramSourceEditor(control);
  });
  qsa("[data-if-diagram-duplicate-node]", diagram).forEach((control) => {
    control.disabled = !editing || !selected;
  });
  qsa("[data-if-diagram-move-container]", diagram).forEach((control) => {
    control.disabled = !editing || !selected;
  });
  qsa("[data-if-diagram-clear-selection]", diagram).forEach((control) => {
    control.disabled = !selected && !selectedRoute;
  });
  qsa("[data-if-diagram-reorder]", diagram).forEach((control) => {
    const container = getDiagramContainerForItem(selected);
    const siblings = container ? qsa(diagramItemSelector, container).filter((item) => !item.hidden) : [];
    const index = selected ? siblings.indexOf(selected) : -1;
    const direction = control.dataset.ifDiagramReorder;
    const canMove = direction === "up" ? index > 0 : direction === "down" ? index >= 0 && index < siblings.length - 1 : false;
    control.disabled = !editing || !selected || !container || !canMove;
  });
  qsa("[data-if-diagram-edit-switch-copy]", diagram).forEach((target) => {
    target.textContent = editing ? "Authoring tools enabled" : "Turn on authoring tools";
  });
  qsa("[data-if-diagram-nudge]", diagram).forEach((control) => {
    control.disabled = !editing || tool !== "move" || !selected;
  });
  qsa("[data-if-diagram-undo-delete]", diagram).forEach((control) => {
    control.disabled = !editing || !getDiagramDeletedStack(diagram).length;
  });
  qsa("[data-if-diagram-delete-selected]", diagram).forEach((control) => {
    control.disabled = !editing || (!selected && !selectedRoute);
  });
  qsa("[data-if-diagram-reset-selected]", diagram).forEach((control) => {
    control.disabled = !editing || (!selected && !selectedRoute);
  });
  qsa("[data-if-diagram-copy-selected]", diagram).forEach((control) => {
    control.disabled = !selected && !selectedRoute;
  });
  qsa("[data-if-diagram-apply-selected]", diagram).forEach((control) => {
    control.disabled = !editing || (!selected && !selectedRoute) || !getDiagramSourceEditor(control);
  });
  qsa("[data-if-diagram-route-delete]", diagram).forEach((control) => {
    control.disabled = !editing || !selectedRoute;
  });
  qsa("[data-if-diagram-style-tone]", diagram).forEach((control) => {
    control.disabled = !editing || tool !== "style" || !selected;
    control.value = selected?.dataset.diagramTone || "default";
  });
  qsa("[data-if-diagram-node-type]", diagram).forEach((control) => {
    control.disabled = !editing || tool !== "style" || !selected;
    control.value = selected?.dataset.diagramNodeType || (selected ? inferDiagramNodeType(selected) : "custom");
  });
  qsa("[data-if-diagram-node-layout]", diagram).forEach((control) => {
    control.disabled = !editing || tool !== "style" || !selected;
    control.value = selected?.dataset.diagramNodeLayout || "tile";
  });
  qsa("[data-if-diagram-node-background]", diagram).forEach((control) => {
    control.disabled = !editing || tool !== "style" || !selected;
    control.value = selected?.dataset.diagramNodeBackground || "surface";
  });
  qsa("[data-if-diagram-node-icon]", diagram).forEach((control) => {
    control.disabled = !editing || tool !== "style" || !selected;
    control.value = selected?.dataset.diagramNodeIcon || "component";
  });
  qsa("[data-if-diagram-route-label], [data-if-diagram-route-style], [data-if-diagram-route-tone], [data-if-diagram-route-waypoint-x], [data-if-diagram-route-waypoint-y], [data-if-diagram-route-from-anchor], [data-if-diagram-route-to-anchor], [data-if-diagram-route-avoid]", diagram).forEach((control) => {
    const editsSelectedRoute = Boolean(selectedRoute);
    control.disabled = !editing || (!editsSelectedRoute && tool !== "connect") || (control.matches("[data-if-diagram-route-waypoint-x], [data-if-diagram-route-waypoint-y], [data-if-diagram-route-from-anchor], [data-if-diagram-route-to-anchor], [data-if-diagram-route-avoid]") && !editsSelectedRoute);
  });
  qsa("[data-if-diagram-route-clear-waypoint]", diagram).forEach((control) => {
    control.disabled = !editing || !selectedRoute || !selectedRoute.dataset.ifConnectorWaypoints;
  });
  qsa("[data-if-diagram-tool-status]", diagram).forEach((target) => {
    target.textContent = editing ? diagramEditToolStatus[tool] : "Turn on edit mode to modify diagram content or layout.";
  });
  qsa("[data-if-diagram-editor-current-tool]", diagram).forEach((target) => {
    target.textContent = `${formatDiagramTypeLabel(tool)} tool`;
  });
  qsa("[data-if-diagram-editor-selection-state]", diagram).forEach((target) => {
    if (selectedRoute) {
      target.textContent = `Editing connector: ${selectedRoute.dataset.ifConnectorLabel || selectedRoute.dataset.ifConnectorRoute || "selected route"}`;
    } else if (selected) {
      target.textContent = `Selected node: ${getDiagramItemSummary(selected).title}`;
    } else {
      target.textContent = editing ? "Select a node or route to begin." : "Turn on edit mode to modify the diagram.";
    }
  });
  syncDiagramContainerControls(diagram);
}

function updateDiagramStats(diagram) {
  if (!diagram) return;
  const visibleItems = getVisibleDiagramItems(diagram);
  const focused = qs(diagramFocusedSelector, diagram);
  const focusedRoute = getDiagramSelectedRoute(diagram);
  const matches = qsa(".is-search-match", diagram).length;
  const layers = getDiagramLayerState(diagram);
  const selectedLabel = focused
    ? getDiagramItemSummary(focused).title
    : focusedRoute
      ? getDiagramRouteSummary(focusedRoute, diagram).title
      : "No selection";
  setDiagramStat(diagram, "visible", String(visibleItems.length));
  setDiagramStat(diagram, "matches", String(matches));
  setDiagramStat(diagram, "layers", layers.total ? `${layers.active}/${layers.total}` : "All");
  setDiagramStat(diagram, "hidden-layers", String(layers.hidden));
  setDiagramStat(diagram, "selected", selectedLabel);
}

function focusAdjacentDiagramItem(item, direction = 1) {
  const diagram = item?.closest?.("[data-if-diagram]");
  if (!diagram) return;
  const items = getVisibleDiagramItems(diagram);
  if (!items.length) return;
  const index = Math.max(0, items.indexOf(item));
  const target = items[(index + direction + items.length) % items.length];
  target.focus?.({ preventScroll: true });
  focusDiagramItem(target);
  target.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
}

function getDiagramItemOffset(item) {
  return {
    x: Number.parseFloat(item?.dataset.ifDiagramX || "0") || 0,
    y: Number.parseFloat(item?.dataset.ifDiagramY || "0") || 0
  };
}

function setDiagramItemOffset(item, x = 0, y = 0) {
  if (!item) return;
  const nextX = Math.round((Number.parseFloat(x) || 0) * 10) / 10;
  const nextY = Math.round((Number.parseFloat(y) || 0) * 10) / 10;
  item.dataset.ifDiagramX = String(nextX);
  item.dataset.ifDiagramY = String(nextY);
  item.style.translate = `${nextX}px ${nextY}px`;
  item.classList.toggle("is-diagram-positioned", Math.abs(nextX) > 0.1 || Math.abs(nextY) > 0.1);
}

function clearDiagramItemOffset(item) {
  if (!item) return;
  delete item.dataset.ifDiagramX;
  delete item.dataset.ifDiagramY;
  item.style.translate = "";
  item.classList.remove("is-diagram-positioned", "is-diagram-dragging");
}

function setDiagramStrongLabel(item, value) {
  const strong = qs("strong", item);
  if (!strong) return;
  const textNodes = Array.from(strong.childNodes).filter((node) => node.nodeType === 3 && node.nodeValue.trim());
  const target = textNodes[textNodes.length - 1];
  if (target) {
    target.nodeValue = value;
  } else {
    strong.append(document.createTextNode(value));
  }
}

function setDiagramDescriptionLabel(item, value) {
  if (!item) return;
  const label = item.dataset.diagramCardText || value;
  const target = getDiagramDescriptionTarget(item);
  if (target) {
    target.textContent = label;
    return;
  }
  if (qs("strong", item)?.parentElement === item) {
    const description = document.createElement("span");
    description.textContent = label;
    item.append(description);
    return;
  }
  const strong = qs("strong", item);
  if (strong?.parentElement && strong.parentElement !== item) {
    const description = document.createElement("span");
    description.textContent = label;
    strong.parentElement.append(description);
  }
}

function getDiagramDescriptionTarget(item) {
  if (!item) return null;
  const directDescriptions = Array.from(item.children).filter((child) =>
    child.matches?.("p, span, em")
    && !child.matches(".if-icon-slot, .if-asset-slot, .if-diagram-search-badge, .if-arch-service__badge, .if-platform-service__badge")
    && !child.hasAttribute("data-if-diagram-search-ignore")
  );
  if (directDescriptions.length === 1) {
    return directDescriptions[0];
  }
  const strong = qs("strong", item);
  const siblingDescriptions = strong
    ? Array.from(strong.parentElement?.children || []).filter((child) =>
      child !== strong
      && child.matches?.("p, span, em")
      && !child.matches(".if-icon-slot, .if-asset-slot, .if-diagram-search-badge, .if-arch-service__badge, .if-platform-service__badge")
    )
    : [];
  if (siblingDescriptions.length === 1) {
    return siblingDescriptions[0];
  }
  return null;
}

function clearDiagramInlineEditors(diagram) {
  qsa("[data-if-diagram-inline-edit]", diagram).forEach((target) => {
    target.removeAttribute("contenteditable");
    target.removeAttribute("spellcheck");
    target.classList.remove("if-diagram-inline-edit");
    delete target.dataset.ifDiagramInlineEdit;
  });
  qsa(".if-icon-slot, .if-asset-slot", diagram).forEach((slot) => {
    if (slot.dataset.ifDiagramInlineLocked === "true") {
      slot.removeAttribute("contenteditable");
      delete slot.dataset.ifDiagramInlineLocked;
    }
  });
}

function selectDiagramEditableText(target) {
  if (!target || typeof window === "undefined") return;
  const selection = window.getSelection?.();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(target);
  selection.removeAllRanges();
  selection.addRange(range);
}

function focusDiagramInlineEditor(diagram, field = "title") {
  if (!diagram) return false;
  const panel = qs("[data-if-diagram-detail]", diagram);
  const inline = qs(`[data-if-diagram-inline-edit="${escapeCssIdentifier(field)}"]`, diagram)
    || qs("[data-if-diagram-inline-edit]", diagram);
  if (inline) {
    inline.focus?.({ preventScroll: true });
    selectDiagramEditableText(inline);
    return true;
  }
  const control = qs(`[data-if-diagram-edit-field="${escapeCssIdentifier(field)}"]:not(:disabled)`, panel || diagram)
    || qs("[data-if-diagram-edit-field]:not(:disabled)", panel || diagram);
  if (control) {
    control.focus?.({ preventScroll: true });
    control.select?.();
    return true;
  }
  return false;
}

function makeDiagramInlineEditable(target, field) {
  if (!target || !field) return;
  target.dataset.ifDiagramInlineEdit = field;
  target.setAttribute("contenteditable", "true");
  target.setAttribute("spellcheck", "true");
  target.classList.add("if-diagram-inline-edit");
  qsa(".if-icon-slot, .if-asset-slot", target).forEach((slot) => {
    slot.setAttribute("contenteditable", "false");
    slot.dataset.ifDiagramInlineLocked = "true";
  });
}

function syncDiagramInlineEditors(diagram, item) {
  clearDiagramInlineEditors(diagram);
  if (!diagram || !item || diagram.dataset.diagramEditing !== "true" || getDiagramEditTool(diagram) !== "text") return;
  makeDiagramInlineEditable(qs("strong", item), "title");
  makeDiagramInlineEditable(getDiagramDescriptionTarget(item), "description");
}

function updateDiagramInlineEdit(target) {
  const item = target?.closest?.(diagramItemSelector);
  const diagram = item?.closest?.("[data-if-diagram]");
  const field = target?.dataset?.ifDiagramInlineEdit;
  if (!diagram || !item || !field) return;
  const value = target.textContent.trim();
  const datasetKey = `diagram${field[0].toUpperCase()}${field.slice(1)}`;
  item.dataset[datasetKey] = value;
  const panel = qs("[data-if-diagram-detail]", diagram);
  const control = qs(`[data-if-diagram-edit-field="${escapeCssIdentifier(field)}"]`, panel || diagram);
  if (control) control.value = value;
  const bindings = {
    title: "[data-if-diagram-detail-title]",
    description: "[data-if-diagram-detail-body]"
  };
  const bound = bindings[field] ? qs(bindings[field], panel) : null;
  if (bound) bound.textContent = value;
  updateDiagramStats(diagram);
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-inline-edit", {
    bubbles: true,
    detail: { diagram, field, item, value }
  }));
}

function commitDiagramInlineEdit(target, options = {}) {
  updateDiagramInlineEdit(target);
  const item = target?.closest?.(diagramItemSelector);
  const diagram = item?.closest?.("[data-if-diagram]");
  if (diagram && item && options.restoreFocus !== false) {
    focusDiagramItem(item);
    syncDiagramInlineEditors(diagram, item);
  } else if (diagram && item) {
    syncDiagramEditor(diagram, item);
  }
}

function getDiagramEditableFields(item) {
  const summary = getDiagramItemSummary(item);
  return {
    title: summary.title,
    description: summary.description,
    status: summary.status,
    owner: summary.owner,
    throughput: summary.throughput,
    dependencies: summary.dependencies,
    contract: summary.contract
  };
}

function setDiagramItemTone(item, tone = "default") {
  if (!item) return;
  const nextTone = diagramEditToolSet.has(tone) ? "default" : String(tone || "default").trim().toLowerCase();
  const allowed = new Set(["default", "accent", "primary", "success", "warning", "danger", "purple", "green", "neutral"]);
  const normalized = allowed.has(nextTone) ? nextTone : "default";
  Array.from(item.classList).forEach((className) => {
    if (className.startsWith("if-diagram-node-tone--")) item.classList.remove(className);
  });
  if (normalized === "default") {
    delete item.dataset.diagramTone;
  } else {
    item.dataset.diagramTone = normalized;
    item.classList.add(`if-diagram-node-tone--${normalized}`);
  }
}

const defaultDiagramNodeTypes = {
  source: { background: "surface", className: "source", color: "#0f4aa2", icon: "source", label: "Source", layout: "media" },
  workflow: { background: "tint", className: "workflow", color: "#6d28d9", icon: "workflow", label: "Workflow", layout: "capability" },
  agent: { background: "surface", className: "agent", color: "#4f46e5", icon: "bot", label: "Agent", layout: "compact" },
  search: { background: "surface", className: "search", color: "#0369a1", icon: "search", label: "Search", layout: "metric" },
  graph: { background: "tint", className: "graph", color: "#0f766e", icon: "network", label: "Graph", layout: "media" },
  storage: { background: "tint", className: "storage", color: "#15803d", icon: "database", label: "Storage", layout: "pipeline" },
  governance: { background: "surface", className: "governance", color: "#334155", icon: "shield", label: "Governance", layout: "compact" },
  outcome: { background: "surface", className: "outcome", color: "#0f4aa2", icon: "users", label: "Outcome", layout: "media" },
  review: { background: "soft", className: "review", color: "#b45309", icon: "review", label: "Review", layout: "callout" },
  service: { background: "surface", className: "service", color: "#2563eb", icon: "server", label: "Service", layout: "tile" },
  custom: { background: "surface", className: "custom", color: "#64748b", icon: "component", label: "Custom", layout: "tile" }
};

const diagramNodeLayouts = new Set(["tile", "compact", "media", "metric", "capability", "pipeline", "callout"]);
const diagramNodeBackgrounds = new Set(["surface", "subtle", "tint", "soft", "outline", "inverted"]);

function toDiagramTypeKey(value) {
  return String(value || "custom")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "custom";
}

function toDiagramTypeClass(value) {
  return String(value || "custom")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "custom";
}

function formatDiagramTypeLabel(value) {
  return String(value || "Custom")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeDiagramNodeType(type, config = {}) {
  const key = toDiagramTypeKey(type);
  const base = defaultDiagramNodeTypes[key] || {};
  const normalized = {
    background: config.background || base.background || "surface",
    className: toDiagramTypeClass(config.className || base.className || key),
    color: config.color || base.color || "var(--if-accent)",
    icon: config.icon || base.icon || "component",
    label: config.label || base.label || formatDiagramTypeLabel(key),
    layout: config.layout || base.layout || "tile"
  };
  if (!diagramNodeLayouts.has(normalized.layout)) normalized.layout = "tile";
  if (!diagramNodeBackgrounds.has(normalized.background)) normalized.background = "surface";
  return normalized;
}

Object.entries(defaultDiagramNodeTypes).forEach(([type, config]) => {
  diagramNodeTypes.set(type, normalizeDiagramNodeType(type, config));
});

function registerDiagramNodeType(type, config = {}) {
  const key = toDiagramTypeKey(type);
  if (!key) throw new Error("InterfaceFramework.registerDiagramNodeType requires a type name.");
  diagramNodeTypes.set(key, normalizeDiagramNodeType(key, config));
  return () => unregisterDiagramNodeType(key);
}

function unregisterDiagramNodeType(type) {
  return diagramNodeTypes.delete(toDiagramTypeKey(type));
}

function getDiagramNodeTypeConfig(type = "custom") {
  const key = toDiagramTypeKey(type);
  return diagramNodeTypes.get(key) || diagramNodeTypes.get("custom") || normalizeDiagramNodeType("custom");
}

function inferDiagramNodeType(item) {
  if (!item) return "custom";
  if (item.dataset.diagramNodeType) return toDiagramTypeKey(item.dataset.diagramNodeType);
  if (item.classList.contains("if-biotech-source-card")) return "source";
  if (item.classList.contains("if-biotech-outcome-card")) return item.classList.contains("if-biotech-outcome-card--evidence") ? "review" : "outcome";
  if (item.classList.contains("if-biotech-mini-capability")) return "workflow";
  if (item.classList.contains("if-biotech-search-box")) return "search";
  if (item.classList.contains("if-biotech-knowledge-graph")) return "graph";
  if (item.classList.contains("if-biotech-medallion")) return "storage";
  if (item.classList.contains("if-platform-service")) return "governance";
  if (item.closest(".if-biotech-agent-grid")) return "agent";
  if (item.closest(".if-biotech-pipeline")) return "storage";
  if (item.closest(".if-biotech-principles")) return "governance";
  return "custom";
}

function clearDiagramClassPrefix(item, prefix) {
  Array.from(item?.classList || []).forEach((className) => {
    if (className.startsWith(prefix)) item.classList.remove(className);
  });
}

function addDiagramClassList(item, classNames = "") {
  String(classNames || "")
    .split(/\s+/)
    .map((className) => className.trim())
    .filter(Boolean)
    .forEach((className) => item.classList.add(className));
}

function setDiagramItemLayout(item, layout = "tile") {
  if (!item) return;
  const normalized = diagramNodeLayouts.has(String(layout || "").trim()) ? String(layout).trim() : "tile";
  clearDiagramClassPrefix(item, "if-diagram-node-layout--");
  item.dataset.diagramNodeLayout = normalized;
  item.classList.add(`if-diagram-node-layout--${normalized}`);
}

function setDiagramItemBackground(item, background = "surface") {
  if (!item) return;
  const normalized = diagramNodeBackgrounds.has(String(background || "").trim()) ? String(background).trim() : "surface";
  clearDiagramClassPrefix(item, "if-diagram-node-bg--");
  item.dataset.diagramNodeBackground = normalized;
  item.classList.add(`if-diagram-node-bg--${normalized}`);
}

function applyDiagramContainerFormat(item, explicitContainer = null, options = {}) {
  if (!item) return null;
  const container = explicitContainer || getDiagramContainerForItem(item);
  if (!container) {
    return applyDiagramNodeType(item, options.nodeType || item.dataset.diagramNodeType || inferDiagramNodeType(item), {
      background: options.background || item.dataset.diagramNodeBackground,
      icon: options.icon || item.dataset.diagramNodeIcon || getDiagramNodeIconSlot(item)?.dataset.ifIcon,
      layout: options.layout || item.dataset.diagramNodeLayout
    });
  }
  const template = getDiagramContainerTemplate(container);
  const className = container.dataset.ifDiagramContainerClass;
  if (className) addDiagramClassList(item, className);
  const currentIcon = options.icon || item.dataset.diagramNodeIcon || getDiagramNodeIconSlot(item)?.dataset.ifIcon || template.icon;
  const result = applyDiagramNodeType(item, template.type, {
    background: template.background,
    icon: currentIcon,
    layout: template.layout
  });
  renderDiagramContainerItem(item, container);
  return result;
}

function getDiagramNodeIconSlot(item) {
  if (!item) return null;
  return item.querySelector(":scope > .if-icon-slot, :scope > strong > .if-icon-slot")
    || item.querySelector(":scope > .if-asset-slot, :scope > strong > .if-asset-slot")
    || qs(".if-icon-slot", item);
}

function setDiagramItemIcon(item, icon = "component", options = {}) {
  if (!item) return;
  const normalized = String(icon || "component").trim() || "component";
  item.dataset.diagramNodeIcon = normalized;
  let slot = getDiagramNodeIconSlot(item);
  if (slot?.dataset.ifAsset && !slot.classList.contains("if-icon-slot")) return;
  if (!slot && options.force !== false) {
    slot = document.createElement("span");
    slot.className = "if-icon-slot";
    slot.setAttribute("aria-hidden", "true");
    const target = qs("strong", item) || item;
    target.prepend(slot);
  }
  if (!slot) return;
  slot.dataset.ifIcon = normalized;
  delete slot.dataset.ifIconHydrated;
  hydrateIcons(slot.parentElement || item);
}

function applyDiagramNodeType(item, explicitType = null, options = {}) {
  if (!item) return null;
  const type = toDiagramTypeKey(explicitType || inferDiagramNodeType(item));
  const config = getDiagramNodeTypeConfig(type);
  clearDiagramClassPrefix(item, "if-diagram-node--");
  item.dataset.diagramNodeType = type;
  item.dataset.diagramNodeTypeLabel = config.label;
  item.style.setProperty("--node-color", config.color);
  item.classList.add(`if-diagram-node--${config.className}`);
  setDiagramItemLayout(item, options.layout || item.dataset.diagramNodeLayout || config.layout);
  setDiagramItemBackground(item, options.background || item.dataset.diagramNodeBackground || config.background);
  setDiagramItemIcon(item, options.icon || item.dataset.diagramNodeIcon || getDiagramNodeIconSlot(item)?.dataset.ifIcon || config.icon, { force: options.forceIcon !== false });
  return { type, config };
}

function applyDiagramNodeTypes(diagramOrRoot = document) {
  const root = diagramOrRoot || document;
  const diagrams = root.matches?.("[data-if-diagram]") ? [root] : qsa("[data-if-diagram]", root);
  diagrams.forEach((diagram) => {
    qsa(diagramItemSelector, diagram).forEach((item) => applyDiagramContainerFormat(item));
    diagram.dispatchEvent(new CustomEvent("if:diagram-node-types", {
      bubbles: true,
      detail: { diagram, items: qsa(diagramItemSelector, diagram) }
    }));
  });
  return root;
}

function normalizeDiagramSchema(schema = {}) {
  const input = typeof schema === "string" ? JSON.parse(schema || "{}") : schema || {};
  const schemaVersion = Number.isFinite(Number(input.schemaVersion)) ? Number(input.schemaVersion) : 1;
  const id = input.id ? normalizeDiagramExplicitId(input.id, input.title || "diagram") : slugifyDiagramId(input.title || "diagram");
  const normalizeCollection = (collection) => Array.isArray(collection) ? collection : [];
  const regions = normalizeCollection(input.regions).map((region, index) => ({
    id: region.id ? normalizeDiagramExplicitId(region.id, region.title || `region-${index + 1}`) : slugifyDiagramId(region.title || `region-${index + 1}`),
    title: String(region.title || region.id || `Region ${index + 1}`),
    tone: String(region.tone || "default")
  }));
  const groups = normalizeCollection(input.groups).map((group, index) => ({
    id: group.id ? normalizeDiagramExplicitId(group.id, group.title || `group-${index + 1}`) : slugifyDiagramId(group.title || `group-${index + 1}`),
    region: group.region ? normalizeDiagramExplicitId(group.region) : "",
    title: String(group.title || group.id || `Group ${index + 1}`),
    tone: String(group.tone || "default")
  }));
  const nodes = normalizeCollection(input.nodes).map((node, index) => {
    const type = toDiagramTypeKey(node.type || node.nodeType || "custom");
    const config = getDiagramNodeTypeConfig(type);
    const section = String(node.section || node.groupTitle || node.regionTitle || "");
    return {
      id: node.id ? normalizeDiagramExplicitId(node.id, node.title || `node-${index + 1}`) : slugifyDiagramId(node.title || `node-${index + 1}`),
      background: diagramNodeBackgrounds.has(node.background) ? node.background : config.background,
      cardText: String(node.cardText || node.card_text || node.cardLabel || ""),
      container: String(node.container || node.parent || ""),
      contract: String(node.contract || node.operating_contract || node.operatingContract || ""),
      dependencies: String(node.dependencies || ""),
      description: String(node.description || node.body || ""),
      dynamic: node.dynamic === true,
      group: node.group ? normalizeDiagramExplicitId(node.group) : "",
      hidden: node.hidden === true,
      icon: String(node.icon || config.icon || "component"),
      layer: String(node.layer || node.section || node.region || "diagram"),
      layout: diagramNodeLayouts.has(node.layout) ? node.layout : config.layout,
      order: toFiniteNumber(node.order ?? node.containerIndex, index),
      owner: String(node.owner || ""),
      region: node.region ? normalizeDiagramExplicitId(node.region) : "",
      section,
      status: String(node.status || ""),
      title: String(node.title || node.id || `Node ${index + 1}`),
      tone: String(node.tone || "default"),
      throughput: String(node.throughput || ""),
      type,
      x: toFiniteNumber(node.x, 0),
      y: toFiniteNumber(node.y, 0)
    };
  });
  const edges = normalizeCollection(input.edges).map((edge, index) => ({
    id: edge.id ? normalizeDiagramExplicitId(edge.id, `${edge.from || "from"}-${edge.to || "to"}-${index + 1}`) : slugifyDiagramId(`${edge.from || "from"}-${edge.to || "to"}-${index + 1}`),
    avoid: edge.avoid !== false,
    directed: edge.directed !== false,
    from: edge.from || edge.source ? normalizeDiagramExplicitId(edge.from || edge.source) : "",
    fromAnchor: edge.fromAnchor || "",
    label: String(edge.label || edge.type || ""),
    style: String(edge.style || edge.route || "orthogonal"),
    to: edge.to || edge.target ? normalizeDiagramExplicitId(edge.to || edge.target) : "",
    toAnchor: edge.toAnchor || "",
    tone: String(edge.tone || "primary"),
    waypoints: edge.waypoints || ""
  }));
  return {
    schemaVersion,
    id,
    title: String(input.title || id),
    description: String(input.description || ""),
    metadata: input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {},
    layout: input.layout && typeof input.layout === "object" ? { ...input.layout } : {},
    regions,
    groups,
    nodes,
    edges
  };
}

function validateDiagramSchema(schema = {}, options = {}) {
  const errors = [];
  const warnings = [];
  let normalized;
  try {
    normalized = normalizeDiagramSchema(schema);
  } catch (error) {
    return { valid: false, errors: [`invalid schema: ${error.message}`], warnings, schema: null };
  }
  if (!normalized.nodes.length) errors.push("schema must include at least one node");
  const nodeIds = new Set((options.endpointIds || []).map(String).filter(Boolean));
  const declaredNodeIds = new Set();
  normalized.nodes.forEach((node) => {
    if (!node.id) errors.push("node is missing id");
    if (declaredNodeIds.has(node.id)) errors.push(`duplicate node id: ${node.id}`);
    declaredNodeIds.add(node.id);
    nodeIds.add(node.id);
    if (!node.title) warnings.push(`node ${node.id} has no title`);
  });
  normalized.edges.forEach((edge) => {
    if (!edge.from) errors.push(`edge ${edge.id} is missing source node`);
    if (!edge.to) errors.push(`edge ${edge.id} is missing target node`);
    if (edge.from && !nodeIds.has(edge.from)) errors.push(`edge ${edge.id} references unknown source node: ${edge.from}`);
    if (edge.to && !nodeIds.has(edge.to)) errors.push(`edge ${edge.id} references unknown target node: ${edge.to}`);
  });
  const groupIds = new Set(normalized.groups.map((group) => group.id));
  normalized.nodes.forEach((node) => {
    if (node.group && !groupIds.has(node.group)) warnings.push(`node ${node.id} references unknown group: ${node.group}`);
  });
  return { valid: errors.length === 0, errors, warnings, schema: normalized };
}

function getDiagramKnownEndpointIds(diagram) {
  if (!diagram) return [];
  ensureDiagramLayoutIds(diagram);
  return Array.from(new Set(qsa("[data-if-connector-node], [data-diagram-node-id], [data-if-diagram-layout-id], [id]", diagram)
    .flatMap((item) => [
      item.dataset.ifConnectorNode,
      item.dataset.diagramNodeId,
      item.dataset.ifDiagramLayoutId,
      item.id
    ])
    .map((value) => String(value || "").trim())
    .filter(Boolean)));
}

function renderDiagramSchema(diagramOrTarget, schema = {}, options = {}) {
  const target = typeof diagramOrTarget === "string" ? qs(diagramOrTarget) : diagramOrTarget;
  const diagram = target?.matches?.("[data-if-diagram]") ? target : target?.closest?.("[data-if-diagram]");
  if (!diagram) throw new Error("InterfaceFramework.renderDiagramSchema requires a [data-if-diagram] target.");
  const validation = validateDiagramSchema(schema);
  if (!validation.valid && options.allowInvalid !== true) {
    throw new Error(`Invalid diagram schema: ${validation.errors.join("; ")}`);
  }
  const normalized = validation.schema;
  const surface = options.surface
    ? qs(options.surface, diagram)
    : getDiagramConnectorSurface(diagram) || qs("[data-if-diagram-add-target]", diagram) || diagram;
  if (!surface) throw new Error("InterfaceFramework.renderDiagramSchema could not find a render surface.");
  if (options.clear !== false) {
    qsa("[data-if-diagram-schema-node='true']", surface).forEach((item) => item.remove());
    qsa("[data-if-connector-route][data-if-diagram-schema-edge='true']", surface).forEach((route) => route.remove());
  }
  const nodeMap = new Map();
  normalized.nodes.forEach((node) => {
    const item = createDiagramNode(diagram, {
      id: node.id,
      background: node.background,
      fields: {
        contract: node.contract,
        dependencies: node.dependencies || node.group || node.region || node.layer,
        description: node.description,
        owner: node.owner,
        status: node.status,
        throughput: node.throughput,
        title: node.title
      },
      icon: node.icon,
      layer: node.layer,
      layout: node.layout,
      nodeType: node.type,
      silent: true,
      tone: node.tone,
      x: node.x,
      y: node.y
    });
    if (!item) return;
    item.dataset.ifDiagramSchemaNode = "true";
    item.dataset.diagramNodeId = node.id;
    item.dataset.diagramRegion = node.region;
    item.dataset.diagramGroup = node.group;
    item.dataset.diagramSection = node.section;
    if (node.id && !item.id) item.id = node.id;
    nodeMap.set(node.id, item);
  });
  const edges = [];
  normalized.edges.forEach((edge) => {
    const connector = createDiagramConnectorRoute(diagram, edge.from, edge.to, {
      avoid: edge.avoid,
      fromAnchor: edge.fromAnchor,
      id: edge.id,
      label: edge.label,
      silent: true,
      style: edge.style,
      toAnchor: edge.toAnchor,
      tone: edge.tone,
      waypoints: edge.waypoints
    });
    if (connector) {
      connector.dataset.ifDiagramSchemaEdge = "true";
      connector.dataset.ifConnectorDirected = String(edge.directed);
      edges.push(connector);
    }
  });
  refreshConnectorRoutes(diagram);
  updateDiagramStats(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-schema-render", {
    bubbles: true,
    detail: { diagram, edges, nodes: Array.from(nodeMap.values()), schema: normalized, validation }
  }));
  return { diagram, edges, nodes: Array.from(nodeMap.values()), schema: normalized, validation };
}

function syncDiagramEditor(diagram, item = qs(diagramFocusedSelector, diagram)) {
  if (!diagram) return;
  const panel = qs("[data-if-diagram-detail]", diagram);
  const selectedRoute = getDiagramSelectedRoute(diagram);
  const surface = getDiagramConnectorSurface(diagram);
  const fields = item ? getDiagramEditableFields(item) : {};
  const editing = diagram.dataset.diagramEditing === "true";
  const tool = getDiagramEditTool(diagram);
  qsa("[data-if-diagram-edit-field]", panel || diagram).forEach((control) => {
    const key = control.dataset.ifDiagramEditField;
    control.value = fields[key] || "";
    control.disabled = !item || !editing || tool !== "text";
  });
  qsa("[data-if-diagram-style-tone]", panel || diagram).forEach((control) => {
    control.value = item?.dataset.diagramTone || "default";
    control.disabled = !item || !editing || tool !== "style";
  });
  qsa("[data-if-diagram-node-type]", panel || diagram).forEach((control) => {
    control.value = item?.dataset.diagramNodeType || (item ? inferDiagramNodeType(item) : "custom");
    control.disabled = !item || !editing || tool !== "style";
  });
  qsa("[data-if-diagram-node-layout]", panel || diagram).forEach((control) => {
    control.value = item?.dataset.diagramNodeLayout || "tile";
    control.disabled = !item || !editing || tool !== "style";
  });
  qsa("[data-if-diagram-node-background]", panel || diagram).forEach((control) => {
    control.value = item?.dataset.diagramNodeBackground || "surface";
    control.disabled = !item || !editing || tool !== "style";
  });
  qsa("[data-if-diagram-node-icon]", panel || diagram).forEach((control) => {
    control.value = item?.dataset.diagramNodeIcon || "component";
    control.disabled = !item || !editing || tool !== "style";
  });
  qsa("[data-if-diagram-route-label]", panel || diagram).forEach((control) => {
    if (selectedRoute) control.value = selectedRoute.dataset.ifConnectorLabel || "";
    control.disabled = !editing || (!selectedRoute && tool !== "connect");
  });
  qsa("[data-if-diagram-route-style]", panel || diagram).forEach((control) => {
    if (selectedRoute) control.value = selectedRoute.dataset.ifConnectorStyle || surface?.dataset.ifConnectorStyle || "orthogonal";
    control.disabled = !editing || (!selectedRoute && tool !== "connect");
  });
  qsa("[data-if-diagram-route-tone]", panel || diagram).forEach((control) => {
    if (selectedRoute) control.value = selectedRoute.dataset.ifConnectorTone || "primary";
    control.disabled = !editing || (!selectedRoute && tool !== "connect");
  });
  qsa("[data-if-diagram-route-from-anchor]", panel || diagram).forEach((control) => {
    control.value = selectedRoute?.dataset.ifConnectorFromAnchor || "auto";
    control.disabled = !editing || !selectedRoute;
  });
  qsa("[data-if-diagram-route-to-anchor]", panel || diagram).forEach((control) => {
    control.value = selectedRoute?.dataset.ifConnectorToAnchor || "auto";
    control.disabled = !editing || !selectedRoute;
  });
  qsa("[data-if-diagram-route-avoid]", panel || diagram).forEach((control) => {
    control.checked = selectedRoute ? selectedRoute.dataset.ifConnectorAvoid !== "false" : true;
    control.disabled = !editing || !selectedRoute;
  });
  const waypoint = selectedRoute ? getConnectorWaypointPercent(selectedRoute, surface) : { x: 50, y: 50 };
  qsa("[data-if-diagram-route-waypoint-x]", panel || diagram).forEach((control) => {
    control.value = String(waypoint.x);
    control.disabled = !editing || !selectedRoute;
  });
  qsa("[data-if-diagram-route-waypoint-y]", panel || diagram).forEach((control) => {
    control.value = String(waypoint.y);
    control.disabled = !editing || !selectedRoute;
  });
  qsa("[data-if-diagram-route-waypoint-output]", panel || diagram).forEach((output) => {
    output.textContent = selectedRoute ? `${waypoint.x}% / ${waypoint.y}%` : "Auto";
  });
  qsa("[data-if-diagram-route-clear-waypoint]", panel || diagram).forEach((control) => {
    control.disabled = !editing || !selectedRoute || !selectedRoute.dataset.ifConnectorWaypoints;
  });
  const offset = item ? getDiagramItemOffset(item) : { x: 0, y: 0 };
  const readouts = {
    id: item?.dataset.ifDiagramLayoutId || selectedRoute?.dataset.ifConnectorRoute || "No selection",
    layer: item?.dataset.diagramLayer || (selectedRoute ? `${selectedRoute.dataset.ifConnectorFrom} -> ${selectedRoute.dataset.ifConnectorTo}` : "default"),
    type: item?.dataset.diagramNodeType || (item ? inferDiagramNodeType(item) : selectedRoute ? "connector" : "-"),
    x: item ? `${offset.x}px` : selectedRoute ? (selectedRoute.dataset.ifConnectorStyle || "orthogonal") : "-",
    y: item ? `${offset.y}px` : selectedRoute ? (selectedRoute.dataset.ifConnectorTone || "primary") : "-"
  };
  qsa("[data-if-diagram-edit-readout]", panel || diagram).forEach((output) => {
    output.textContent = readouts[output.dataset.ifDiagramEditReadout] || "-";
  });
  syncDiagramInlineEditors(diagram, item);
  syncDiagramEditControls(diagram);
}

function updateDiagramItemField(control) {
  const diagram = control.closest("[data-if-diagram]");
  const item = qs(diagramFocusedSelector, diagram);
  if (!diagram || !item) return;
  const field = control.dataset.ifDiagramEditField;
  const value = control.value;
  if (!field) return;
  const datasetKey = `diagram${field[0].toUpperCase()}${field.slice(1)}`;
  item.dataset[datasetKey] = value;
  if (field === "title") setDiagramStrongLabel(item, value);
  if (field === "description") setDiagramDescriptionLabel(item, value);
  const panel = qs("[data-if-diagram-detail]", diagram);
  const bindings = {
    title: "[data-if-diagram-detail-title]",
    description: "[data-if-diagram-detail-body]",
    status: "[data-if-diagram-detail-status]",
    owner: "[data-if-diagram-detail-owner]",
    throughput: "[data-if-diagram-detail-throughput]",
    dependencies: "[data-if-diagram-detail-dependencies]",
    contract: "[data-if-diagram-detail-contract]"
  };
  const target = bindings[field] ? qs(bindings[field], panel) : null;
  if (target) target.textContent = value;
  updateDiagramStats(diagram);
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-item-edit", {
    bubbles: true,
    detail: { diagram, field, item, value }
  }));
}

function nudgeDiagramItem(item, deltaX = 0, deltaY = 0) {
  const diagram = item?.closest?.("[data-if-diagram]");
  if (!diagram || diagram.dataset.diagramEditing !== "true" || getDiagramEditTool(diagram) !== "move") return false;
  const offset = getDiagramItemOffset(item);
  setDiagramItemOffset(item, offset.x + deltaX, offset.y + deltaY);
  focusDiagramItem(item);
  syncDiagramEditor(diagram, item);
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  setDiagramLayoutStatus(diagram, `Moved ${getDiagramItemSummary(item).title} to ${getDiagramItemOffset(item).x}px, ${getDiagramItemOffset(item).y}px`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-move", {
    bubbles: true,
    detail: { diagram, item, offset: getDiagramItemOffset(item) }
  }));
  return true;
}

function moveDiagramItemToContainer(itemOrControl, containerOrId = null) {
  const item = itemOrControl?.matches?.(diagramItemSelector)
    ? itemOrControl
    : getDiagramSelectedItem(itemOrControl?.closest?.("[data-if-diagram]"));
  const diagram = item?.closest?.("[data-if-diagram]") || itemOrControl?.closest?.("[data-if-diagram]");
  if (!diagram || !item) return null;
  const container = typeof containerOrId === "string"
    ? getDiagramContainerById(diagram, containerOrId)
    : containerOrId || getSelectedDiagramContainer(diagram);
  if (!container) return null;
  const template = getDiagramContainerTemplate(container);
  container.append(item);
  clearDiagramItemOffset(item);
  item.dataset.diagramLayer = template.layer;
  item.dataset.diagramSection = template.section;
  item.dataset.diagramOwner = template.owner;
  item.dataset.diagramStatus = template.status;
  if (template.className) {
    item.className = template.className;
    item.dataset.ifDiagramItem = "";
  }
  renderDiagramContainerItem(item, container);
  applyDiagramNodeType(item, template.type, {
    background: template.background,
    icon: template.icon,
    layout: template.layout
  });
  focusDiagramItem(item);
  syncDiagramEditor(diagram, item);
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  diagram.dataset.ifDiagramSelectedContainer = container.dataset.ifDiagramContainer;
  setDiagramLayoutStatus(diagram, `Moved ${getDiagramItemSummary(item).title} to ${container.dataset.ifDiagramContainerLabel || "selected container"}`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-container-move", {
    bubbles: true,
    detail: { container, diagram, item }
  }));
  return item;
}

function refreshDiagramContainerItems(container) {
  if (!container) return;
  qsa(diagramItemSelector, container).forEach((item) => renderDiagramContainerItem(item, container));
}

function getDiagramItemContainerIndex(item) {
  const container = getDiagramContainerForItem(item);
  if (!container) return 0;
  return Math.max(0, qsa(diagramItemSelector, container).filter((sibling) => !sibling.hidden).indexOf(item));
}

function reorderDiagramItem(itemOrControl, direction = null) {
  const item = itemOrControl?.matches?.(diagramItemSelector)
    ? itemOrControl
    : getDiagramSelectedItem(itemOrControl?.closest?.("[data-if-diagram]"));
  const diagram = item?.closest?.("[data-if-diagram]") || itemOrControl?.closest?.("[data-if-diagram]");
  const container = getDiagramContainerForItem(item);
  const moveDirection = direction || itemOrControl?.dataset?.ifDiagramReorder || "down";
  if (!diagram || !item || !container) return null;
  const siblings = qsa(diagramItemSelector, container).filter((sibling) => !sibling.hidden);
  const index = siblings.indexOf(item);
  if (index < 0) return null;
  const targetIndex = moveDirection === "up" ? index - 1 : moveDirection === "down" ? index + 1 : index;
  const target = siblings[targetIndex];
  if (!target) return null;
  if (moveDirection === "up") {
    container.insertBefore(item, target);
  } else {
    container.insertBefore(target, item);
  }
  refreshDiagramContainerItems(container);
  focusDiagramItem(item);
  syncDiagramEditor(diagram, item);
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  setDiagramLayoutStatus(diagram, `Reordered ${getDiagramItemSummary(item).title} ${moveDirection} in ${container.dataset.ifDiagramContainerLabel || "its container"}`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-reorder", {
    bubbles: true,
    detail: { container, diagram, direction: moveDirection, item }
  }));
  return item;
}

function getDiagramDocumentTitle(diagram) {
  if (!diagram) return "Diagram";
  const labelledBy = diagram.getAttribute("aria-labelledby");
  const labelledTitle = labelledBy ? document.getElementById(labelledBy)?.textContent?.trim() : "";
  return labelledTitle
    || qs(".if-diagram-title-block h1, .if-architecture-header__title, h1", diagram)?.textContent?.trim()
    || getDiagramLayoutKey(diagram);
}

function collectDiagramDocument(diagram) {
  if (!diagram) return null;
  ensureDiagramLayoutIds(diagram);
  const nodes = qsa(diagramItemSelector, diagram).map((item) => {
    const offset = getDiagramItemOffset(item);
    const fields = getDiagramEditableFields(item);
    return {
      id: item.dataset.diagramNodeId || item.dataset.ifDiagramLayoutId || item.id,
      background: item.dataset.diagramNodeBackground || "surface",
      cardText: item.dataset.diagramCardText || "",
      container: getDiagramContainerForItem(item)?.dataset.ifDiagramContainer || "",
      contract: fields.contract,
      dependencies: fields.dependencies,
      description: fields.description,
      dynamic: item.dataset.ifDiagramDynamic === "true",
      hidden: item.hidden,
      icon: item.dataset.diagramNodeIcon || getDiagramNodeIconSlot(item)?.dataset.ifIcon || "",
      layer: item.dataset.diagramLayer || "diagram",
      layout: item.dataset.diagramNodeLayout || "tile",
      order: getDiagramItemContainerIndex(item),
      owner: fields.owner,
      section: item.dataset.diagramSection || item.closest(".if-arch-stage")?.dataset.diagramTitle || "",
      status: fields.status,
      title: fields.title,
      tone: item.dataset.diagramTone || "default",
      throughput: fields.throughput,
      type: item.dataset.diagramNodeType || inferDiagramNodeType(item),
      x: offset.x,
      y: offset.y
    };
  }).filter((node) => node.id);
  const edges = qsa("[data-if-connector-route]", diagram).map((route) => ({
    avoid: route.dataset.ifConnectorAvoid !== "false",
    from: route.dataset.ifConnectorFrom,
    fromAnchor: route.dataset.ifConnectorFromAnchor || "",
    id: route.dataset.ifConnectorRoute,
    label: route.dataset.ifConnectorLabel || "",
    style: route.dataset.ifConnectorStyle || "orthogonal",
    to: route.dataset.ifConnectorTo,
    toAnchor: route.dataset.ifConnectorToAnchor || "",
    tone: route.dataset.ifConnectorTone || "primary",
    waypoints: route.dataset.ifConnectorWaypoints || ""
  })).filter((edge) => edge.from && edge.to);
  return {
    schemaVersion: 1,
    id: getDiagramLayoutKey(diagram),
    title: getDiagramDocumentTitle(diagram),
    description: qs(".if-diagram-title-block p, .if-architecture-header__subtitle", diagram)?.textContent?.trim() || "",
    metadata: {
      format: "interface-framework.diagram",
      updatedAt: new Date().toISOString()
    },
    nodes,
    edges
  };
}

function syncDiagramSourceEditor(diagram, source = null) {
  if (!diagram) return;
  const documentSource = source || collectDiagramDocument(diagram);
  const json = JSON.stringify(documentSource, null, 2);
  qsa("[data-if-diagram-source]", diagram).forEach((target) => {
    if (document.activeElement !== target) target.value = json;
  });
  qsa("[data-if-diagram-source-status]", diagram).forEach((target) => {
    target.textContent = `${documentSource?.nodes?.length || 0} nodes, ${documentSource?.edges?.length || 0} edges`;
  });
}

function collectDiagramLayoutSnapshot(diagram) {
  if (!diagram) return null;
  ensureDiagramLayoutIds(diagram);
  const layers = qsa("[data-if-diagram-layer-toggle]", diagram).map((control) => ({
    active: control.getAttribute("aria-pressed") === "true",
    layer: control.dataset.ifDiagramLayerToggle
  })).filter((layer) => layer.layer);
  const variables = qsa("[data-if-diagram-var]", diagram).map((control) => ({
    property: control.dataset.ifDiagramVar,
    unit: control.dataset.ifDiagramUnit || "",
    value: control.value
  })).filter((variable) => variable.property);
  const items = qsa(diagramItemSelector, diagram).map((item) => {
    const offset = getDiagramItemOffset(item);
    return {
      id: item.dataset.ifDiagramLayoutId,
      background: item.dataset.diagramNodeBackground || "surface",
      container: getDiagramContainerForItem(item)?.dataset.ifDiagramContainer || "",
      dynamic: item.dataset.ifDiagramDynamic === "true",
      hidden: item.hidden,
      icon: item.dataset.diagramNodeIcon || "",
      layout: item.dataset.diagramNodeLayout || "tile",
      nodeType: item.dataset.diagramNodeType || inferDiagramNodeType(item),
      order: getDiagramItemContainerIndex(item),
      tone: item.dataset.diagramTone || "default",
      x: offset.x,
      y: offset.y,
      fields: getDiagramEditableFields(item)
    };
  });
  const routes = qsa("[data-if-connector-route][data-if-diagram-route]", diagram).map((route) => ({
    avoid: route.dataset.ifConnectorAvoid,
    from: route.dataset.ifConnectorFrom,
    fromAnchor: route.dataset.ifConnectorFromAnchor,
    id: route.dataset.ifConnectorRoute,
    label: route.dataset.ifConnectorLabel,
    style: route.dataset.ifConnectorStyle,
    to: route.dataset.ifConnectorTo,
    toAnchor: route.dataset.ifConnectorToAnchor,
    tone: route.dataset.ifConnectorTone,
    waypoints: route.dataset.ifConnectorWaypoints
  })).filter((route) => route.from && route.to);
  return {
    version: 1,
    key: getDiagramLayoutKey(diagram),
    layoutVersion: getDiagramLayoutVersion(diagram),
    updatedAt: new Date().toISOString(),
    document: collectDiagramDocument(diagram),
    layers,
    variables,
    items,
    routes
  };
}

function getDiagramDocumentItem(diagram, nodeId) {
  if (!diagram || !nodeId) return null;
  const escaped = escapeCssIdentifier(nodeId);
  return qs(`[data-diagram-node-id="${escaped}"]`, diagram)
    || qs(`[data-if-diagram-layout-id="${escaped}"]`, diagram)
    || qs(`#${escaped}`, diagram)
    || qsa(diagramItemSelector, diagram).find((item) => {
      const canonical = canonicalDiagramId(nodeId);
      return canonical && [
        item.dataset.diagramNodeId,
        item.dataset.ifDiagramLayoutId,
        item.id
      ].some((value) => canonicalDiagramId(value) === canonical);
    })
    || null;
}

function dedupeDiagramItemsForDocument(diagram, document = {}) {
  if (!diagram) return;
  const nodeKeys = new Set((document.nodes || []).map((node) => canonicalDiagramId(node.id)).filter(Boolean));
  if (!nodeKeys.size) return;
  const kept = new Set();
  qsa(diagramItemSelector, diagram).forEach((item) => {
    const key = [
      item.dataset.diagramNodeId,
      item.dataset.ifDiagramLayoutId,
      item.id
    ].map(canonicalDiagramId).find((value) => nodeKeys.has(value));
    if (!key) return;
    if (!kept.has(key)) {
      kept.add(key);
      return;
    }
    if (item.dataset.ifDiagramDynamic === "true") item.remove();
  });
}

function applyDiagramDocument(diagramOrControl, documentSource = {}) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const validation = validateDiagramSchema(documentSource, { endpointIds: getDiagramKnownEndpointIds(diagram) });
  if (!validation.valid) throw new Error(`Invalid diagram document: ${validation.errors.join("; ")}`);
  const document = validation.schema;
  ensureDiagramLayoutIds(diagram);
  dedupeDiagramItemsForDocument(diagram, document);
  document.nodes.forEach((node) => {
    const fields = {
      cardText: node.cardText,
      contract: node.contract,
      dependencies: node.dependencies,
      description: node.description,
      owner: node.owner,
      status: node.status,
      throughput: node.throughput,
      title: node.title
    };
    const item = getDiagramDocumentItem(diagram, node.id) || createDiagramNode(diagram, {
      id: node.id,
      background: node.background,
      container: node.container,
      fields,
      icon: node.icon,
      layer: node.layer,
      layout: node.layout,
      nodeType: node.type,
      silent: true,
      tone: node.tone,
      x: node.x,
      y: node.y
    });
    if (!item) return;
    if (node.container) {
      const targetContainer = getDiagramContainerById(diagram, node.container);
      if (targetContainer && getDiagramContainerForItem(item) !== targetContainer) targetContainer.append(item);
    }
    item.id = item.id || node.id;
    item.dataset.diagramNodeId = node.id;
    item.dataset.diagramLayer = node.layer || "diagram";
    item.dataset.diagramSection = node.section || "";
    Object.entries(fields).forEach(([field, value]) => {
      const datasetKey = `diagram${field[0].toUpperCase()}${field.slice(1)}`;
      item.dataset[datasetKey] = String(value || "");
      if (field === "title") setDiagramStrongLabel(item, String(value || node.id));
      if (field === "description") setDiagramDescriptionLabel(item, String(value || ""));
    });
    const itemContainer = node.container
      ? getDiagramContainerById(diagram, node.container)
      : getDiagramContainerForItem(item);
    applyDiagramContainerFormat(item, itemContainer, {
      background: node.background,
      icon: node.icon,
      layout: node.layout,
      nodeType: node.type
    });
    setDiagramItemTone(item, node.tone || "default");
    setDiagramItemOffset(item, node.x || 0, node.y || 0);
    item.hidden = node.hidden === true;
  });
  applyDiagramDocumentOrder(diagram, document);
  qsa("[data-if-connector-route][data-if-diagram-route]", diagram).forEach((route) => route.remove());
  document.edges.forEach((edge) => {
    createDiagramConnectorRoute(diagram, edge.from, edge.to, {
      avoid: edge.avoid,
      fromAnchor: edge.fromAnchor,
      id: edge.id,
      label: edge.label,
      silent: true,
      style: edge.style,
      toAnchor: edge.toAnchor,
      tone: edge.tone,
      waypoints: edge.waypoints
    });
  });
  syncDiagramEditor(diagram, getDiagramSelectedItem(diagram));
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  syncDiagramSourceEditor(diagram, document);
  setDiagramLayoutStatus(diagram, "Diagram JSON applied", "success");
  diagram.dispatchEvent(new CustomEvent("if:diagram-document-apply", {
    bubbles: true,
    detail: { diagram, document }
  }));
  return document;
}

function getDiagramSourceEditor(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const selector = control.dataset.ifDiagramSourceTarget;
  return selector ? qs(selector, diagram) : qs("[data-if-diagram-source]", diagram);
}

function extractDiagramSourceText(value = "") {
  const source = String(value || "").trim();
  if (!source) return "{}";
  const fenced = source.match(/```(?:json|diagram|if-diagram)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if ((source.startsWith("#") || source.includes("\n```") || source.includes("DiagramDocument")) && firstBrace >= 0 && lastBrace > firstBrace) {
    return source.slice(firstBrace, lastBrace + 1).trim();
  }
  return source;
}

function parseDiagramSourceValue(value = "") {
  const parsed = JSON.parse(extractDiagramSourceText(value));
  return parsed.document || parsed.schema || parsed;
}

function refreshDiagramSourceEditor(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const document = collectDiagramDocument(diagram);
  syncDiagramSourceEditor(diagram, document);
  setDiagramLayoutStatus(diagram, "Diagram JSON refreshed from live nodes", "success");
  return document;
}

function validateDiagramSourceEditor(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const source = getDiagramSourceEditor(control);
  if (!diagram || !source) return null;
  try {
    const document = parseDiagramSourceValue(source.value || "{}");
    const validation = validateDiagramSchema(document, { endpointIds: getDiagramKnownEndpointIds(diagram) });
    if (!validation.valid) throw new Error(validation.errors.join("; "));
    setDiagramLayoutStatus(diagram, `Diagram JSON valid: ${validation.schema.nodes.length} nodes, ${validation.schema.edges.length} edges`, "success");
    qsa("[data-if-diagram-source-status]", diagram).forEach((target) => {
      target.textContent = `${validation.schema.nodes.length} nodes, ${validation.schema.edges.length} edges`;
    });
    return validation;
  } catch (error) {
    setDiagramLayoutStatus(diagram, `Invalid diagram JSON: ${error.message}`, "error");
    return { valid: false, errors: [error.message], schema: null };
  }
}

function formatDiagramSourceEditor(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const source = getDiagramSourceEditor(control);
  if (!diagram || !source) return null;
  try {
    const document = parseDiagramSourceValue(source.value || "{}");
    const validation = validateDiagramSchema(document, { endpointIds: getDiagramKnownEndpointIds(diagram) });
    if (!validation.valid) throw new Error(validation.errors.join("; "));
    syncDiagramSourceEditor(diagram, validation.schema);
    setDiagramLayoutStatus(diagram, "Diagram JSON formatted", "success");
    return validation.schema;
  } catch (error) {
    setDiagramLayoutStatus(diagram, `Invalid diagram JSON: ${error.message}`, "error");
    return null;
  }
}

function applyDiagramSourceEditor(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const source = getDiagramSourceEditor(control);
  if (!diagram || !source) return null;
  try {
    const document = parseDiagramSourceValue(source.value || "{}");
    return applyDiagramDocument(diagram, document);
  } catch (error) {
    setDiagramLayoutStatus(diagram, `Invalid diagram JSON: ${error.message}`, "error");
    throw error;
  }
}

function markDiagramSourceEdited(source) {
  const diagram = source?.closest?.("[data-if-diagram]");
  if (!diagram) return;
  qsa("[data-if-diagram-source-status]", diagram).forEach((target) => {
    target.textContent = "Edited source";
  });
  setDiagramLayoutStatus(diagram, "Diagram JSON edited; validate or apply to update the diagram", "idle");
}

function getDiagramSourceTextForAction(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const source = getDiagramSourceEditor(control);
  if (!diagram || !source) return "";
  if (!source.value.trim()) syncDiagramSourceEditor(diagram);
  return source.value;
}

function copyDiagramSourceEditor(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const source = getDiagramSourceEditor(control);
  const text = getDiagramSourceTextForAction(control);
  if (!diagram || !source || !text) return null;
  const finish = () => {
    setDiagramLayoutStatus(diagram, "Diagram JSON copied", "success");
    return text;
  };
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(finish).catch(() => {
      source.focus();
      source.select();
      document.execCommand?.("copy");
      return finish();
    });
  }
  source.focus();
  source.select();
  document.execCommand?.("copy");
  return finish();
}

function getSelectedDiagramJsonPayload(diagramOrControl) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const documentSource = collectDiagramDocument(diagram);
  const route = getDiagramSelectedRoute(diagram);
  if (route) {
    const routeId = route.dataset.ifConnectorRoute;
    const edge = documentSource.edges.find((item) => item.id === routeId)
      || documentSource.edges.find((item) => item.from === route.dataset.ifConnectorFrom && item.to === route.dataset.ifConnectorTo);
    return edge ? { data: edge, kind: "edge" } : null;
  }
  const item = getDiagramSelectedItem(diagram);
  if (!item) return null;
  const id = item.dataset.diagramNodeId || item.dataset.ifDiagramLayoutId || item.id;
  const node = documentSource.nodes.find((entry) => entry.id === id)
    || documentSource.nodes.find((entry) => canonicalDiagramId(entry.id) === canonicalDiagramId(id));
  return node ? { data: node, kind: "node" } : null;
}

function copyTextWithTemporaryField(text) {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.inset = "0 auto auto 0";
  field.style.opacity = "0";
  document.body.append(field);
  field.focus();
  field.select();
  document.execCommand?.("copy");
  field.remove();
}

function copySelectedDiagramJson(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const payload = getSelectedDiagramJsonPayload(control);
  if (!diagram || !payload) {
    if (diagram) setDiagramLayoutStatus(diagram, "Select a node or connector to copy JSON", "idle");
    return null;
  }
  const text = JSON.stringify(payload.data, null, 2);
  const finish = () => {
    setDiagramLayoutStatus(diagram, `Selected ${payload.kind} JSON copied`, "success");
    diagram.dispatchEvent(new CustomEvent("if:diagram-selected-copy", {
      bubbles: true,
      detail: { diagram, kind: payload.kind, data: payload.data, text }
    }));
    return text;
  };
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(finish).catch(() => {
      copyTextWithTemporaryField(text);
      return finish();
    });
  }
  copyTextWithTemporaryField(text);
  return finish();
}

function getSelectedDiagramSourcePatch(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const source = getDiagramSourceEditor(control);
  if (!diagram || !source) return null;
  const parsed = parseDiagramSourceValue(source.value || "{}");
  const selectedRoute = getDiagramSelectedRoute(diagram);
  if (selectedRoute) {
    const routeId = selectedRoute.dataset.ifConnectorRoute;
    const edges = Array.isArray(parsed.edges) ? parsed.edges : Array.isArray(parsed.routes) ? parsed.routes : null;
    const edge = edges
      ? edges.find((entry) => entry.id === routeId)
        || edges.find((entry) => (entry.from || entry.source) === selectedRoute.dataset.ifConnectorFrom && (entry.to || entry.target) === selectedRoute.dataset.ifConnectorTo)
        || (edges.length === 1 ? edges[0] : null)
      : parsed.from || parsed.to || parsed.source || parsed.target || parsed.label || parsed.style ? parsed : null;
    return edge ? { data: edge, kind: "edge" } : null;
  }
  const selected = getDiagramSelectedItem(diagram);
  if (!selected) return null;
  const id = selected.dataset.diagramNodeId || selected.dataset.ifDiagramLayoutId || selected.id;
  const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : null;
  const node = nodes
    ? nodes.find((entry) => entry.id === id || canonicalDiagramId(entry.id) === canonicalDiagramId(id))
      || (nodes.length === 1 ? nodes[0] : null)
    : parsed.title || parsed.description || parsed.status || parsed.owner || parsed.container || parsed.type || parsed.nodeType ? parsed : null;
  return node ? { data: node, kind: "node" } : null;
}

function getDiagramSourceNodeForCreate(control) {
  const source = getDiagramSourceEditor(control);
  if (!source) return null;
  const parsed = parseDiagramSourceValue(source.value || "{}");
  if (Array.isArray(parsed.nodes)) return parsed.nodes[0] || null;
  if (parsed.title || parsed.description || parsed.status || parsed.owner || parsed.container || parsed.type || parsed.nodeType) return parsed;
  return null;
}

function applyDiagramNodePatch(diagram, item, patch = {}) {
  if (!diagram || !item || !patch) return null;
  const fieldMap = {
    contract: patch.contract ?? patch.operating_contract ?? patch.operatingContract,
    dependencies: patch.dependencies,
    description: patch.description ?? patch.body,
    owner: patch.owner,
    status: patch.status,
    throughput: patch.throughput,
    title: patch.title
  };
  Object.entries(fieldMap).forEach(([field, value]) => {
    if (value == null) return;
    const datasetKey = `diagram${field[0].toUpperCase()}${field.slice(1)}`;
    item.dataset[datasetKey] = String(value);
    if (field === "title") setDiagramStrongLabel(item, String(value));
    if (field === "description") setDiagramDescriptionLabel(item, String(value));
  });
  if (patch.layer != null) item.dataset.diagramLayer = String(patch.layer);
  if (patch.section != null) item.dataset.diagramSection = String(patch.section);
  const container = patch.container ? getDiagramContainerById(diagram, patch.container) : getDiagramContainerForItem(item);
  if (container && patch.container && getDiagramContainerForItem(item) !== container) container.append(item);
  applyDiagramContainerFormat(item, container, {
    background: patch.background,
    icon: patch.icon,
    layout: patch.layout,
    nodeType: patch.type || patch.nodeType
  });
  if (patch.tone != null) setDiagramItemTone(item, patch.tone || "default");
  if (patch.x != null || patch.y != null) {
    const offset = getDiagramItemOffset(item);
    setDiagramItemOffset(item, patch.x ?? offset.x, patch.y ?? offset.y);
  }
  if (typeof patch.hidden === "boolean") item.hidden = patch.hidden;
  if (container && Number.isFinite(Number(patch.order))) {
    const siblings = qsa(diagramItemSelector, container).filter((sibling) => sibling !== item && !sibling.hidden);
    const before = siblings[Math.max(0, Math.min(siblings.length, Number(patch.order)))];
    if (before) container.insertBefore(item, before);
    else container.append(item);
    refreshDiagramContainerItems(container);
  }
  focusDiagramItem(item);
  syncDiagramEditor(diagram, item);
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  syncDiagramSourceEditor(diagram);
  return item;
}

function applySelectedDiagramJson(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  let payload;
  try {
    payload = getSelectedDiagramSourcePatch(control);
  } catch (error) {
    setDiagramLayoutStatus(diagram, `Invalid selected JSON: ${error.message}`, "error");
    return null;
  }
  if (!payload) {
    setDiagramLayoutStatus(diagram, "Source editor does not contain a matching selected node or edge JSON object", "error");
    return null;
  }
  if (payload.kind === "edge") {
    const route = getDiagramSelectedRoute(diagram);
    if (!route) return null;
    setDiagramConnectorRoute(route, {
      avoid: payload.data.avoid,
      fromAnchor: payload.data.fromAnchor,
      label: payload.data.label,
      style: payload.data.style || payload.data.route,
      toAnchor: payload.data.toAnchor,
      tone: payload.data.tone,
      waypoints: payload.data.waypoints
    });
    setDiagramLayoutStatus(diagram, "Applied selected edge JSON", "success");
  } else {
    const item = getDiagramSelectedItem(diagram);
    if (!item) return null;
    applyDiagramNodePatch(diagram, item, payload.data);
    setDiagramLayoutStatus(diagram, `Applied selected node JSON to ${getDiagramItemSummary(item).title}`, "success");
  }
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-selected-apply", {
    bubbles: true,
    detail: { diagram, kind: payload.kind, data: payload.data }
  }));
  return payload.data;
}

function createDiagramNodeFromSource(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  let node;
  try {
    node = getDiagramSourceNodeForCreate(control);
  } catch (error) {
    setDiagramLayoutStatus(diagram, `Invalid node JSON: ${error.message}`, "error");
    return null;
  }
  if (!node) {
    setDiagramLayoutStatus(diagram, "Source editor does not contain a node JSON object", "error");
    return null;
  }
  const container = node.container
    ? getDiagramContainerById(diagram, node.container) || getSelectedDiagramContainer(diagram)
    : getSelectedDiagramContainer(diagram);
  const fields = {
    contract: node.contract ?? node.operating_contract ?? node.operatingContract,
    dependencies: node.dependencies,
    description: node.description ?? node.body,
    owner: node.owner,
    status: node.status,
    throughput: node.throughput,
    title: node.title
  };
  const title = fields.title || node.id || "New diagram node";
  const id = getUniqueDiagramNodeId(diagram, node.id || title, title);
  const item = createDiagramNode(diagram, {
    background: node.background,
    container,
    fields: { ...fields, title },
    icon: node.icon,
    id,
    layer: node.layer,
    layout: node.layout,
    nodeType: node.type || node.nodeType,
    section: node.section,
    silent: true,
    tone: node.tone,
    x: node.x,
    y: node.y
  });
  if (!item) return null;
  if (typeof node.hidden === "boolean") item.hidden = node.hidden;
  if (Number.isFinite(Number(node.order))) applyDiagramNodePatch(diagram, item, { order: Number(node.order) });
  diagram.dataset.diagramEditTool = "text";
  if (container) diagram.dataset.ifDiagramSelectedContainer = container.dataset.ifDiagramContainer;
  focusDiagramItem(item);
  syncDiagramEditor(diagram, item);
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  syncDiagramSourceEditor(diagram);
  setDiagramLayoutStatus(diagram, `Added ${getDiagramItemSummary(item).title} from source JSON`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-create", {
    bubbles: true,
    detail: { diagram, item, source: node }
  }));
  diagram.dispatchEvent(new CustomEvent("if:diagram-source-node-create", {
    bubbles: true,
    detail: { diagram, item, node }
  }));
  return item;
}

function downloadDiagramSourceEditor(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const text = getDiagramSourceTextForAction(control);
  if (!diagram || !text) return null;
  const name = control.dataset.ifDiagramSourceDownloadName || `${getDiagramLayoutKey(diagram)}.diagram.json`;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  setDiagramLayoutStatus(diagram, `Downloaded ${name}`, "success");
  return { name, text };
}

function importDiagramSourceFile(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const source = getDiagramSourceEditor(control);
  const file = control?.files?.[0];
  if (!diagram || !source || !file) return null;
  return file.text().then((text) => {
    source.value = text;
    markDiagramSourceEdited(source);
    setDiagramLayoutStatus(diagram, `Loaded ${file.name} into the source editor`, "success");
    control.value = "";
    return text;
  }).catch((error) => {
    setDiagramLayoutStatus(diagram, `Unable to import diagram JSON: ${error.message}`, "error");
    throw error;
  });
}

function applyDiagramSnapshotOrder(diagram, snapshot = {}) {
  if (!diagram || !Array.isArray(snapshot.items)) return;
  const groups = new Map();
  snapshot.items.forEach((entry, fallbackOrder) => {
    const containerId = entry.container || (entry.id ? getDiagramContainerForItem(getDiagramLayoutItem(diagram, entry.id))?.dataset.ifDiagramContainer : "");
    if (!containerId) return;
    if (!groups.has(containerId)) groups.set(containerId, []);
    groups.get(containerId).push({ ...entry, fallbackOrder });
  });
  groups.forEach((entries, containerId) => {
    const container = getDiagramContainerById(diagram, containerId);
    if (!container) return;
    entries
      .sort((a, b) => (Number.isFinite(a.order) ? a.order : a.fallbackOrder) - (Number.isFinite(b.order) ? b.order : b.fallbackOrder))
      .forEach((entry) => {
        const item = getDiagramLayoutItem(diagram, entry.id);
        if (item) container.append(item);
      });
    refreshDiagramContainerItems(container);
  });
}

function applyDiagramDocumentOrder(diagram, document = {}) {
  if (!diagram || !Array.isArray(document.nodes)) return;
  const groups = new Map();
  document.nodes.forEach((node, fallbackOrder) => {
    const item = getDiagramDocumentItem(diagram, node.id);
    const containerId = node.container || getDiagramContainerForItem(item)?.dataset.ifDiagramContainer || "";
    if (!containerId) return;
    if (!groups.has(containerId)) groups.set(containerId, []);
    groups.get(containerId).push({ fallbackOrder, node });
  });
  groups.forEach((entries, containerId) => {
    const container = getDiagramContainerById(diagram, containerId);
    if (!container) return;
    entries
      .sort((a, b) => (Number.isFinite(a.node.order) ? a.node.order : a.fallbackOrder) - (Number.isFinite(b.node.order) ? b.node.order : b.fallbackOrder))
      .forEach(({ node }) => {
        const item = getDiagramDocumentItem(diagram, node.id);
        if (item) container.append(item);
      });
    refreshDiagramContainerItems(container);
  });
}

function applyDiagramSnapshotItemEntry(diagram, item, entry = {}) {
  if (!diagram || !item || !entry) return null;
  const entryContainer = getDiagramContainerById(diagram, entry.container)
    || getDiagramContainerForItem(item);
  if (entryContainer && getDiagramContainerForItem(item) !== entryContainer) entryContainer.append(item);
  if (typeof entry.hidden === "boolean") item.hidden = entry.hidden;
  if (entry.nodeType) applyDiagramNodeType(item, entry.nodeType, {
    background: entry.background,
    icon: entry.icon,
    layout: entry.layout
  });
  setDiagramItemTone(item, entry.tone || "default");
  if (entry.layout) setDiagramItemLayout(item, entry.layout);
  if (entry.background) setDiagramItemBackground(item, entry.background);
  if (entry.icon) setDiagramItemIcon(item, entry.icon);
  setDiagramItemOffset(item, entry.x || 0, entry.y || 0);
  if (entry.fields) {
    Object.entries(entry.fields).forEach(([field, value]) => {
      if (value == null) return;
      const datasetKey = `diagram${field[0].toUpperCase()}${field.slice(1)}`;
      item.dataset[datasetKey] = String(value);
      if (field === "title") setDiagramStrongLabel(item, String(value));
      if (field === "description") setDiagramDescriptionLabel(item, String(value));
    });
  }
  applyDiagramContainerFormat(item, entryContainer, {
    background: entry.background,
    icon: entry.icon,
    layout: entry.layout,
    nodeType: entry.nodeType
  });
  return item;
}

function restoreDiagramItemBaselineOrder(diagram, item, entry = {}) {
  const container = getDiagramContainerForItem(item);
  const baseline = diagram?.__ifDiagramBaseline;
  if (!container || !baseline || !entry.container) return;
  const entries = (baseline.items || []).filter((candidate) => candidate.container === entry.container);
  const orderById = new Map(entries.map((candidate, index) => [candidate.id, Number.isFinite(candidate.order) ? candidate.order : index]));
  const targetOrder = orderById.get(entry.id);
  const nextSibling = qsa(diagramItemSelector, container)
    .filter((sibling) => sibling !== item && !sibling.hidden)
    .find((sibling) => {
      const siblingId = sibling.dataset.ifDiagramLayoutId;
      const siblingOrder = orderById.get(siblingId);
      return Number.isFinite(targetOrder) && Number.isFinite(siblingOrder) && siblingOrder > targetOrder;
    });
  if (nextSibling) container.insertBefore(item, nextSibling);
  else container.append(item);
  refreshDiagramContainerItems(container);
}

function applyDiagramLayoutSnapshot(diagram, snapshot = {}) {
  if (!diagram || !snapshot) return null;
  ensureDiagramLayoutIds(diagram);
  qsa("[data-if-diagram-dynamic='true']", diagram).forEach((item) => item.remove());
  qsa("[data-if-connector-route][data-if-diagram-route]", diagram).forEach((route) => route.remove());
  (snapshot.layers || []).forEach((layer) => {
    const control = qs(`[data-if-diagram-layer-toggle="${escapeCssIdentifier(layer.layer)}"]`, diagram);
    if (!control) return;
    const active = layer.active !== false;
    control.setAttribute("aria-pressed", String(active));
    control.classList.toggle("is-muted", !active);
    qsa(`[data-diagram-layer~="${escapeCssIdentifier(layer.layer)}"]`, diagram).forEach((item) => {
      item.hidden = !active;
    });
  });
  (snapshot.variables || []).forEach((variable) => {
    const control = qsa("[data-if-diagram-var]", diagram).find((item) => item.dataset.ifDiagramVar === variable.property);
    if (!control) return;
    control.value = variable.value;
    setDiagramVariable(control);
  });
  (snapshot.items || []).forEach((entry) => {
    const entryContainer = getDiagramContainerById(diagram, entry.container)
      || (entry.id ? getDiagramContainerForItem(getDiagramLayoutItem(diagram, entry.id)) : null);
    const item = getDiagramLayoutItem(diagram, entry.id) || (entry.dynamic ? createDiagramNode(diagram, {
      fields: entry.fields,
      id: entry.id,
      background: entry.background,
      container: entryContainer,
      silent: true,
      icon: entry.icon,
      layout: entry.layout,
      nodeType: entry.nodeType,
      tone: entry.tone
    }) : null);
    if (!item) return;
    applyDiagramSnapshotItemEntry(diagram, item, { ...entry, container: entryContainer?.dataset.ifDiagramContainer || entry.container });
  });
  applyDiagramSnapshotOrder(diagram, snapshot);
  (snapshot.routes || []).forEach((route) => {
    if (route.from && route.to) createDiagramConnectorRoute(diagram, route.from, route.to, {
      id: route.id,
      avoid: route.avoid,
      fromAnchor: route.fromAnchor,
      label: route.label,
      silent: true,
      style: route.style,
      toAnchor: route.toAnchor,
      tone: route.tone,
      waypoints: route.waypoints
    });
  });
  syncDiagramEditor(diagram);
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  syncDiagramSourceEditor(diagram, snapshot.document || collectDiagramDocument(diagram));
  diagram.dispatchEvent(new CustomEvent("if:diagram-layout-apply", {
    bubbles: true,
    detail: { diagram, snapshot }
  }));
  return snapshot;
}

function getDiagramLayoutAdapter(diagram) {
  const name = diagram?.dataset.ifDiagramLayoutAdapter;
  return name ? diagramLayoutAdapters.get(name) : null;
}

function setDiagramLayoutStatus(diagram, copy, state = "idle") {
  qsa("[data-if-diagram-layout-status]", diagram).forEach((target) => {
    target.textContent = copy;
  });
  setAdapterState(diagram, state, { channel: "diagram-layout", message: copy });
}

function getDiagramRouteId(fromId, toId) {
  connectorRouteCounter += 1;
  return `${slugifyDiagramId(fromId)}-${slugifyDiagramId(toId)}-${connectorRouteCounter}`;
}

function createDiagramConnectorRoute(diagramOrControl, fromId, toId, options = {}) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram || !fromId || !toId || fromId === toId) return null;
  const surface = getDiagramConnectorSurface(diagram);
  if (!surface) return null;
  const connector = document.createElement("span");
  connector.hidden = true;
  connector.dataset.ifConnectorRoute = options.id || getDiagramRouteId(fromId, toId);
  connector.dataset.ifConnectorFrom = fromId;
  connector.dataset.ifConnectorTo = toId;
  connector.dataset.ifConnectorLabel = options.label || "Connects";
  connector.dataset.ifConnectorStyle = options.style || surface.dataset.ifConnectorStyle || "orthogonal";
  connector.dataset.ifConnectorTone = options.tone || "async";
  if (options.fromAnchor) connector.dataset.ifConnectorFromAnchor = options.fromAnchor;
  if (options.toAnchor) connector.dataset.ifConnectorToAnchor = options.toAnchor;
  if (options.avoid != null) connector.dataset.ifConnectorAvoid = String(options.avoid);
  if (options.waypoints) connector.dataset.ifConnectorWaypoints = options.waypoints;
  connector.dataset.ifDiagramRoute = "true";
  surface.append(connector);
  refreshConnectorRoutes(surface);
  if (!options.silent) {
    setDiagramLayoutStatus(diagram, `Connected ${fromId} to ${toId}`, "success");
    maybeAutosaveDiagramLayout(diagram);
    diagram.dispatchEvent(new CustomEvent("if:diagram-route-create", {
      bubbles: true,
      detail: { connector, diagram, from: fromId, to: toId }
    }));
  }
  return connector;
}

function getDiagramRouteControlOptions(diagram) {
  const label = qs("[data-if-diagram-route-label]", diagram)?.value?.trim();
  const style = qs("[data-if-diagram-route-style]", diagram)?.value?.trim();
  const tone = qs("[data-if-diagram-route-tone]", diagram)?.value?.trim();
  return {
    label: label || "Connects",
    style: style || getDiagramConnectorSurface(diagram)?.dataset.ifConnectorStyle || "orthogonal",
    tone: tone || "async"
  };
}

function getDiagramDeletedStack(diagram) {
  if (!diagram) return [];
  if (!diagramDeletedStacks.has(diagram)) diagramDeletedStacks.set(diagram, []);
  return diagramDeletedStacks.get(diagram);
}

function pushDiagramDeletedEntry(diagram, entry) {
  if (!diagram || !entry) return;
  const stack = getDiagramDeletedStack(diagram);
  stack.push({ ...entry, deletedAt: Date.now() });
  syncDiagramEditControls(diagram);
}

function getDiagramRouteSnapshot(route) {
  if (!route) return null;
  return {
    avoid: route.dataset.ifConnectorAvoid,
    from: route.dataset.ifConnectorFrom,
    fromAnchor: route.dataset.ifConnectorFromAnchor,
    id: route.dataset.ifConnectorRoute,
    label: route.dataset.ifConnectorLabel,
    style: route.dataset.ifConnectorStyle,
    to: route.dataset.ifConnectorTo,
    toAnchor: route.dataset.ifConnectorToAnchor,
    tone: route.dataset.ifConnectorTone,
    waypoints: route.dataset.ifConnectorWaypoints
  };
}

function undoDiagramDelete(diagramOrControl) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const stack = getDiagramDeletedStack(diagram);
  const entry = stack.pop();
  if (!entry) {
    setDiagramLayoutStatus(diagram, "Nothing to restore in this edit session", "idle");
    syncDiagramEditControls(diagram);
    return null;
  }
  if (entry.kind === "node" && entry.id) {
    const item = getDiagramLayoutItem(diagram, entry.id);
    if (item) {
      item.hidden = false;
      focusDiagramItem(item);
      refreshConnectorRoutes(diagram);
      setDiagramLayoutStatus(diagram, `Restored ${getDiagramItemSummary(item).title}`, "success");
      maybeAutosaveDiagramLayout(diagram);
      syncDiagramEditControls(diagram);
      diagram.dispatchEvent(new CustomEvent("if:diagram-delete-undo", {
        bubbles: true,
        detail: { diagram, entry, item }
      }));
      return item;
    }
  }
  if (entry.kind === "route" && entry.route?.from && entry.route?.to) {
    const route = createDiagramConnectorRoute(diagram, entry.route.from, entry.route.to, {
      ...entry.route,
      silent: true
    });
    if (route) {
      selectDiagramConnectorRoute(route);
      refreshConnectorRoutes(diagram);
      setDiagramLayoutStatus(diagram, `Restored connector ${entry.route.label || entry.route.id || "route"}`, "success");
      maybeAutosaveDiagramLayout(diagram);
      syncDiagramEditControls(diagram);
      diagram.dispatchEvent(new CustomEvent("if:diagram-delete-undo", {
        bubbles: true,
        detail: { diagram, entry, route }
      }));
      return route;
    }
  }
  setDiagramLayoutStatus(diagram, "Unable to restore the last deleted item", "error");
  syncDiagramEditControls(diagram);
  return null;
}

function resolveDiagramConnectorRoute(target) {
  const diagram = target?.matches?.("[data-if-diagram]")
    ? target
    : target?.closest?.("[data-if-diagram]");
  const surface = target?.closest?.("[data-if-connector-routing]") || getDiagramConnectorSurface(diagram);
  const routeId = target?.dataset?.ifConnectorRoute
    || target?.dataset?.ifConnectorLabelNode
    || diagram?.dataset?.ifDiagramSelectedRoute;
  const route = target?.matches?.("[data-if-connector-route]")
    ? target
    : getDiagramRouteElement(diagram, routeId);
  return { diagram, route, surface };
}

function setDiagramConnectorRoute(target, options = {}) {
  const { diagram, route, surface } = resolveDiagramConnectorRoute(target);
  if (!route || !surface) return null;
  if (Object.prototype.hasOwnProperty.call(options, "label")) {
    route.dataset.ifConnectorLabel = options.label == null ? "" : String(options.label || "Connects");
  }
  if (options.style) route.dataset.ifConnectorStyle = String(options.style);
  if (options.tone) route.dataset.ifConnectorTone = String(options.tone);
  if (Object.prototype.hasOwnProperty.call(options, "fromAnchor")) {
    if (options.fromAnchor && options.fromAnchor !== "auto") route.dataset.ifConnectorFromAnchor = String(options.fromAnchor);
    else delete route.dataset.ifConnectorFromAnchor;
  }
  if (Object.prototype.hasOwnProperty.call(options, "toAnchor")) {
    if (options.toAnchor && options.toAnchor !== "auto") route.dataset.ifConnectorToAnchor = String(options.toAnchor);
    else delete route.dataset.ifConnectorToAnchor;
  }
  if (Object.prototype.hasOwnProperty.call(options, "avoid")) {
    route.dataset.ifConnectorAvoid = String(options.avoid !== false);
  }
  if (Object.prototype.hasOwnProperty.call(options, "waypoints")) {
    if (Array.isArray(options.waypoints)) {
      route.dataset.ifConnectorWaypoints = serializeConnectorWaypoints(options.waypoints);
    } else if (options.waypoints) {
      route.dataset.ifConnectorWaypoints = String(options.waypoints);
    } else {
      delete route.dataset.ifConnectorWaypoints;
    }
  }
  if (Object.prototype.hasOwnProperty.call(options, "waypointPercent")) {
    const point = options.waypointPercent || {};
    route.dataset.ifConnectorWaypoints = serializeConnectorWaypointPercent(point.x, point.y);
  }
  refreshConnectorRoutes(surface);
  if (diagram) {
    selectDiagramConnectorRoute(route);
    setDiagramLayoutStatus(diagram, `Connector ${route.dataset.ifConnectorRoute} updated`, "success");
    maybeAutosaveDiagramLayout(diagram);
    diagram.dispatchEvent(new CustomEvent("if:diagram-route-edit", {
      bubbles: true,
      detail: { connector: route, diagram, surface }
    }));
  } else {
    surface.dispatchEvent(new CustomEvent("if:connector-route-edit", {
      bubbles: true,
      detail: { connector: route, surface }
    }));
  }
  return route;
}

function deleteDiagramConnectorRoute(target) {
  const { diagram, route, surface } = resolveDiagramConnectorRoute(target);
  if (!diagram || !route || !surface) return false;
  const routeId = route.dataset.ifConnectorRoute;
  const snapshot = getDiagramRouteSnapshot(route);
  pushDiagramDeletedEntry(diagram, { kind: "route", route: snapshot });
  route.remove();
  delete diagram.dataset.ifDiagramSelectedRoute;
  clearDiagramConnectorFocus(diagram);
  refreshConnectorRoutes(surface);
  syncDiagramEditor(diagram, getDiagramSelectedItem(diagram));
  setDiagramLayoutStatus(diagram, `Connector ${routeId || "route"} removed from this session layout`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-route-delete", {
    bubbles: true,
    detail: { diagram, route: snapshot, routeId, surface }
  }));
  return true;
}

function deleteSelectedDiagramTarget(diagramOrControl) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return false;
  const route = getDiagramSelectedRoute(diagram);
  if (route) return deleteDiagramConnectorRoute(route);
  const item = getDiagramSelectedItem(diagram);
  if (!item) {
    setDiagramLayoutStatus(diagram, "Select a node or connector before deleting", "idle");
    syncDiagramEditControls(diagram);
    return false;
  }
  deleteDiagramItem(item);
  return true;
}

function resetSelectedDiagramTarget(diagramOrControl) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return false;
  const baseline = diagram.__ifDiagramBaseline;
  if (!baseline) {
    setDiagramLayoutStatus(diagram, "No baseline snapshot is available for this diagram", "error");
    return false;
  }
  const route = getDiagramSelectedRoute(diagram);
  if (route) {
    const routeId = route.dataset.ifConnectorRoute;
    const baselineRoute = (baseline.routes || []).find((entry) => entry.id === routeId);
    if (!baselineRoute) {
      const removed = deleteDiagramConnectorRoute(route);
      if (removed) setDiagramLayoutStatus(diagram, `Removed session connector ${routeId || "route"}`, "success");
      return removed;
    }
    setDiagramConnectorRoute(route, {
      avoid: baselineRoute.avoid,
      fromAnchor: baselineRoute.fromAnchor,
      label: baselineRoute.label,
      style: baselineRoute.style,
      toAnchor: baselineRoute.toAnchor,
      tone: baselineRoute.tone,
      waypoints: baselineRoute.waypoints
    });
    setDiagramLayoutStatus(diagram, `Reset connector ${routeId || baselineRoute.label || "route"} to baseline`, "success");
    maybeAutosaveDiagramLayout(diagram);
    diagram.dispatchEvent(new CustomEvent("if:diagram-selected-reset", {
      bubbles: true,
      detail: { diagram, kind: "route", route }
    }));
    return true;
  }
  const item = getDiagramSelectedItem(diagram);
  if (!item) {
    setDiagramLayoutStatus(diagram, "Select a node or connector before resetting", "idle");
    syncDiagramEditControls(diagram);
    return false;
  }
  ensureDiagramLayoutIds(diagram);
  const id = item.dataset.ifDiagramLayoutId;
  const baselineEntry = (baseline.items || []).find((entry) => entry.id === id);
  if (!baselineEntry) {
    if (item.dataset.ifDiagramDynamic === "true") {
      const title = getDiagramItemSummary(item).title;
      item.remove();
      resetDiagramFocus(diagram);
      updateDiagramStats(diagram);
      refreshConnectorRoutes(diagram);
      syncDiagramSourceEditor(diagram);
      setDiagramLayoutStatus(diagram, `Removed session-only node ${title}`, "success");
      maybeAutosaveDiagramLayout(diagram);
      diagram.dispatchEvent(new CustomEvent("if:diagram-selected-reset", {
        bubbles: true,
        detail: { diagram, item: null, kind: "node", removed: true }
      }));
      return true;
    }
    setDiagramLayoutStatus(diagram, "Selected node has no baseline entry to restore", "error");
    return false;
  }
  applyDiagramSnapshotItemEntry(diagram, item, baselineEntry);
  restoreDiagramItemBaselineOrder(diagram, item, baselineEntry);
  focusDiagramItem(item);
  syncDiagramEditor(diagram, item);
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  syncDiagramSourceEditor(diagram);
  setDiagramLayoutStatus(diagram, `Reset ${getDiagramItemSummary(item).title} to baseline`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-selected-reset", {
    bubbles: true,
    detail: { diagram, item, kind: "node" }
  }));
  return true;
}

function updateSelectedDiagramRoute(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const route = getDiagramSelectedRoute(diagram);
  const surface = getDiagramConnectorSurface(diagram);
  if (!diagram || !route || !surface) return null;
  const label = qs("[data-if-diagram-route-label]", diagram)?.value?.trim();
  const style = qs("[data-if-diagram-route-style]", diagram)?.value?.trim();
  const tone = qs("[data-if-diagram-route-tone]", diagram)?.value?.trim();
  const fromAnchor = qs("[data-if-diagram-route-from-anchor]", diagram)?.value?.trim();
  const toAnchor = qs("[data-if-diagram-route-to-anchor]", diagram)?.value?.trim();
  const avoid = qs("[data-if-diagram-route-avoid]", diagram);
  const waypointX = qs("[data-if-diagram-route-waypoint-x]", diagram)?.value;
  const waypointY = qs("[data-if-diagram-route-waypoint-y]", diagram)?.value;
  const manualWaypoint = control.matches("[data-if-diagram-route-waypoint-x], [data-if-diagram-route-waypoint-y]");
  return setDiagramConnectorRoute(route, {
    label: label || "Connects",
    style,
    tone,
    fromAnchor,
    toAnchor,
    avoid: avoid?.checked,
    ...(manualWaypoint || route.dataset.ifConnectorWaypoints ? {
      waypointPercent: { x: waypointX, y: waypointY }
    } : {})
  });
}

function renderDiagramContainerItem(item, container = null) {
  if (!item) return;
  const preserveAuthoredMarkup = item.dataset.ifDiagramPreserveContent === "true"
    || item.classList.contains("if-kbr-rich-node")
    || item.classList.contains("if-kbr-primary-engine-node")
    || item.classList.contains("if-kbr-agent-layer-card")
    || item.classList.contains("if-kbr-agent-function");
  if (preserveAuthoredMarkup && item.dataset.ifDiagramDynamic !== "true") {
    hydrateIcons(item);
    return;
  }
  const title = item.dataset.diagramTitle || qs("strong", item)?.textContent?.trim() || "New diagram node";
  const description = getDiagramCardDescription(item);
  const icon = escapeHtml(item.dataset.diagramNodeIcon || getDiagramContainerTemplate(container).icon || "component");
  const templateName = container?.dataset.ifDiagramContainerTemplate || "";
  const nextIndex = container ? qsa(diagramItemSelector, container).indexOf(item) + 1 || qsa(diagramItemSelector, container).length + 1 : 1;
  const serviceCard = item.classList.contains("if-arch-service") || item.classList.contains("if-platform-service");
  const displayDescription = item.dataset.diagramCardText || description;
  const badgeText = item.dataset.diagramBadge || qs(".if-arch-service__badge, .if-platform-service__badge", item)?.textContent?.trim() || "";
  const compactRow = item.classList.contains("if-growth-list-item")
    || item.classList.contains("if-growth-control-row")
    || (container && !templateName && !serviceCard);
  if (templateName === "agent-card") {
    item.innerHTML = `<span>${nextIndex}</span><span class="if-icon-slot" data-if-icon="${icon}" aria-hidden="true"></span><strong>${escapeHtml(title)}</strong>`;
  } else if (templateName === "guidance-card") {
    item.innerHTML = `<span class="if-icon-slot" data-if-icon="${icon}" aria-hidden="true"></span><div><strong>${escapeHtml(title)}</strong><em>${escapeHtml(description)}</em></div>`;
  } else if (templateName === "measure-card") {
    item.innerHTML = `<span class="if-icon-slot" data-if-icon="${icon}" aria-hidden="true"></span><strong>${escapeHtml(title)}</strong><em>${escapeHtml(description)}</em>`;
  } else if (serviceCard) {
    item.innerHTML = `<span class="if-icon-slot" data-if-icon="${icon}" aria-hidden="true"></span><span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(displayDescription)}</span></span>${badgeText ? `<em class="if-arch-service__badge">${escapeHtml(badgeText)}</em>` : ""}`;
  } else if (compactRow) {
    item.innerHTML = `<span class="if-icon-slot" data-if-icon="${icon}" aria-hidden="true"></span><strong>${escapeHtml(title)}</strong>`;
  } else {
    item.innerHTML = `<span class="if-icon-slot" data-if-icon="${icon}" aria-hidden="true"></span><strong>${escapeHtml(title)}</strong><span>${escapeHtml(displayDescription)}</span>`;
  }
  hydrateIcons(item);
}

function createDiagramNode(diagramOrControl, options = {}) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const surface = getDiagramConnectorSurface(diagram);
  const selectedContainer = options.container
    ? (typeof options.container === "string" ? getDiagramContainerById(diagram, options.container) : options.container)
    : getSelectedDiagramContainer(diagram);
  const target = selectedContainer || qs("[data-if-diagram-add-target]", diagram) || surface || diagram;
  const template = getDiagramContainerTemplate(selectedContainer);
  const fields = options.fields || {};
  const title = fields.title || options.title || "New diagram node";
  const description = fields.description || options.description || template.description;
  const item = document.createElement(options.element || selectedContainer?.dataset.ifDiagramContainerElement || "button");
  item.className = options.className || selectedContainer?.dataset.ifDiagramContainerClass || "if-diagram-step if-diagram-floating-node";
  if (item.tagName === "BUTTON") item.type = "button";
  item.dataset.ifDiagramItem = "";
  item.dataset.ifDiagramDynamic = "true";
  item.dataset.diagramLayer = options.layer || fields.layer || template.layer;
  item.dataset.diagramSection = options.section || fields.section || template.section;
  item.dataset.diagramTitle = title;
  item.dataset.diagramCardText = fields.cardText || options.cardText || "";
  item.dataset.diagramDescription = description;
  item.dataset.diagramStatus = fields.status || options.status || template.status;
  item.dataset.diagramOwner = fields.owner || options.owner || template.owner;
  item.dataset.diagramThroughput = fields.throughput || options.throughput || "New flow";
  item.dataset.diagramDependencies = fields.dependencies || options.dependencies || "0 edges";
  item.dataset.diagramContract = fields.contract || options.contract || "Define the interface contract for this node.";
  if (options.id) {
    item.dataset.ifDiagramLayoutId = options.id;
    item.dataset.diagramNodeId = options.id;
    item.id = options.id;
  }
  item.dataset.diagramNodeType = options.nodeType || options.type || fields.nodeType || template.type;
  item.dataset.diagramNodeLayout = options.layout || fields.layout || template.layout;
  item.dataset.diagramNodeBackground = options.background || fields.background || template.background;
  item.dataset.diagramNodeIcon = options.icon || fields.icon || template.icon;
  item.setAttribute("tabindex", "0");
  item.setAttribute("role", "button");
  item.setAttribute("aria-pressed", "false");
  renderDiagramContainerItem(item, selectedContainer);
  target.append(item);
  applyDiagramNodeType(item, options.nodeType || options.type || fields.nodeType || template.type, {
    background: options.background || fields.background || template.background,
    icon: options.icon || fields.icon || template.icon,
    layout: options.layout || fields.layout || template.layout
  });
  ensureDiagramLayoutIds(diagram);
  setDiagramItemTone(item, options.tone || template.tone);
  const index = qsa("[data-if-diagram-dynamic='true']", diagram).indexOf(item);
  if (options.x != null || options.y != null || !selectedContainer) {
    setDiagramItemOffset(item, options.x ?? (24 + index * 18), options.y ?? (18 + index * 14));
  } else {
    clearDiagramItemOffset(item);
  }
  if (!options.silent) {
    diagram.dataset.diagramEditTool = "text";
    focusDiagramItem(item);
    if (selectedContainer) diagram.dataset.ifDiagramSelectedContainer = selectedContainer.dataset.ifDiagramContainer;
    setDiagramLayoutStatus(diagram, `Added a draft node to ${selectedContainer?.dataset.ifDiagramContainerLabel || "the diagram"}`, "success");
    maybeAutosaveDiagramLayout(diagram);
    diagram.dispatchEvent(new CustomEvent("if:diagram-node-create", {
      bubbles: true,
      detail: { diagram, item }
    }));
  }
  refreshConnectorRoutes(diagram);
  return item;
}

function duplicateDiagramItem(itemOrControl) {
  const item = itemOrControl?.matches?.(diagramItemSelector)
    ? itemOrControl
    : getDiagramSelectedItem(itemOrControl?.closest?.("[data-if-diagram]"));
  const diagram = item?.closest?.("[data-if-diagram]") || itemOrControl?.closest?.("[data-if-diagram]");
  if (!diagram || !item) return null;
  ensureDiagramLayoutIds(diagram);
  const container = getDiagramContainerForItem(item);
  const fields = getDiagramEditableFields(item);
  const title = `${fields.title || "Diagram node"} Copy`;
  const offset = getDiagramItemOffset(item);
  const className = Array.from(item.classList)
    .filter((className) => ![
      "is-focused",
      "is-search-match",
      "is-diagram-connect-source"
    ].includes(className))
    .join(" ");
  const duplicate = createDiagramNode(diagram, {
    background: item.dataset.diagramNodeBackground,
    className: container ? undefined : className,
    container,
    fields: { ...fields, title },
    icon: item.dataset.diagramNodeIcon || getDiagramNodeIconSlot(item)?.dataset.ifIcon,
    layout: item.dataset.diagramNodeLayout,
    layer: item.dataset.diagramLayer,
    nodeType: item.dataset.diagramNodeType || inferDiagramNodeType(item),
    section: item.dataset.diagramSection,
    silent: true,
    tone: item.dataset.diagramTone,
    x: container ? undefined : offset.x + 18,
    y: container ? undefined : offset.y + 18
  });
  if (!duplicate) return null;
  diagram.dataset.diagramEditTool = "text";
  if (container) diagram.dataset.ifDiagramSelectedContainer = container.dataset.ifDiagramContainer;
  focusDiagramItem(duplicate);
  syncDiagramEditor(diagram, duplicate);
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  setDiagramLayoutStatus(diagram, `Duplicated ${fields.title || "node"} into ${container?.dataset.ifDiagramContainerLabel || "the diagram"}`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-duplicate", {
    bubbles: true,
    detail: { diagram, item: duplicate, source: item }
  }));
  return duplicate;
}

function deleteDiagramItem(itemOrControl) {
  const item = itemOrControl?.matches?.(diagramItemSelector)
    ? itemOrControl
    : getDiagramSelectedItem(itemOrControl?.closest?.("[data-if-diagram]"));
  const diagram = item?.closest?.("[data-if-diagram]");
  if (!item || !diagram) return;
  ensureDiagramLayoutIds(diagram);
  pushDiagramDeletedEntry(diagram, { id: item.dataset.ifDiagramLayoutId, kind: "node" });
  item.hidden = true;
  clearDiagramConnectSource(diagram);
  resetDiagramFocus(diagram);
  setDiagramLayoutStatus(diagram, "Node hidden from this session layout", "success");
  maybeAutosaveDiagramLayout(diagram);
  refreshConnectorRoutes(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-delete", {
    bubbles: true,
    detail: { diagram, item }
  }));
}

function handleDiagramConnectSelection(item) {
  const diagram = item?.closest?.("[data-if-diagram]");
  if (!diagram) return;
  ensureDiagramLayoutIds(diagram);
  const itemId = item.dataset.ifDiagramLayoutId;
  const itemTitle = getDiagramItemSummary(item).title;
  const sourceId = diagram.dataset.ifDiagramConnectFrom;
  if (!sourceId) {
    clearDiagramConnectSource(diagram);
    diagram.dataset.ifDiagramConnectFrom = itemId;
    item.classList.add("is-diagram-connect-source");
    focusDiagramItem(item);
    setDiagramLayoutStatus(diagram, `Source selected: ${itemTitle}. Click a target node to connect.`, "idle");
    return;
  }
  if (sourceId === itemId) {
    clearDiagramConnectSource(diagram);
    setDiagramLayoutStatus(diagram, "Connection source cleared", "idle");
    return;
  }
  const source = getDiagramLayoutItem(diagram, sourceId);
  const sourceTitle = source ? getDiagramItemSummary(source).title : sourceId;
  source?.classList.remove("is-diagram-connect-source");
  const connector = createDiagramConnectorRoute(diagram, sourceId, itemId, getDiagramRouteControlOptions(diagram));
  clearDiagramConnectSource(diagram);
  if (connector) {
    selectDiagramConnectorRoute(connector);
    setDiagramLayoutStatus(diagram, `Connected ${sourceTitle} to ${itemTitle}`, "success");
  }
  else focusDiagramItem(item);
}

function handleDiagramEditItemAction(item) {
  const diagram = item?.closest?.("[data-if-diagram]");
  if (!diagram || diagram.dataset.diagramEditing !== "true") return false;
  const tool = getDiagramEditTool(diagram);
  if (tool === "connect") {
    handleDiagramConnectSelection(item);
    return true;
  }
  if (tool === "delete") {
    deleteDiagramItem(item);
    return true;
  }
  focusDiagramItem(item);
  if (tool === "inspect") setDiagramLayoutStatus(diagram, `Inspecting ${getDiagramItemSummary(item).title}`, "idle");
  if (tool === "text") setDiagramLayoutStatus(diagram, "Text fields are enabled for the selected node", "idle");
  if (tool === "style") setDiagramLayoutStatus(diagram, "Choose a tone for the selected node", "idle");
  if (tool === "move") setDiagramLayoutStatus(diagram, "Choose a target container, then move this node into it", "idle");
  return true;
}

function setSelectedDiagramItemTone(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const item = getDiagramSelectedItem(diagram);
  if (!diagram || !item) return;
  setDiagramItemTone(item, control.value || "default");
  focusDiagramItem(item);
  setDiagramLayoutStatus(diagram, `Node tone set to ${control.value || "default"}`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-style", {
    bubbles: true,
    detail: { diagram, item, tone: item.dataset.diagramTone || "default" }
  }));
}

function setSelectedDiagramItemType(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const item = getDiagramSelectedItem(diagram);
  if (!diagram || !item) return;
  const result = applyDiagramNodeType(item, control.value || "custom");
  focusDiagramItem(item);
  setDiagramLayoutStatus(diagram, `Node type set to ${result?.config?.label || control.value || "Custom"}`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-style", {
    bubbles: true,
    detail: { diagram, item, nodeType: item.dataset.diagramNodeType }
  }));
  syncDiagramEditor(diagram, item);
}

function setSelectedDiagramItemLayout(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const item = getDiagramSelectedItem(diagram);
  if (!diagram || !item) return;
  setDiagramItemLayout(item, control.value || "tile");
  focusDiagramItem(item);
  setDiagramLayoutStatus(diagram, `Node layout set to ${item.dataset.diagramNodeLayout || "tile"}`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-style", {
    bubbles: true,
    detail: { diagram, item, layout: item.dataset.diagramNodeLayout }
  }));
}

function setSelectedDiagramItemBackground(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const item = getDiagramSelectedItem(diagram);
  if (!diagram || !item) return;
  setDiagramItemBackground(item, control.value || "surface");
  focusDiagramItem(item);
  setDiagramLayoutStatus(diagram, `Node background set to ${item.dataset.diagramNodeBackground || "surface"}`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-style", {
    bubbles: true,
    detail: { background: item.dataset.diagramNodeBackground, diagram, item }
  }));
}

function setSelectedDiagramItemIcon(control) {
  const diagram = control?.closest?.("[data-if-diagram]");
  const item = getDiagramSelectedItem(diagram);
  if (!diagram || !item) return;
  setDiagramItemIcon(item, control.value || "component");
  focusDiagramItem(item);
  setDiagramLayoutStatus(diagram, `Node icon set to ${item.dataset.diagramNodeIcon || "component"}`, "success");
  maybeAutosaveDiagramLayout(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-node-style", {
    bubbles: true,
    detail: { diagram, icon: item.dataset.diagramNodeIcon, item }
  }));
}

function setDiagramEditTool(diagramOrControl, toolOverride = null) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return "inspect";
  const requested = toolOverride || diagramOrControl?.dataset?.ifDiagramEditTool || "inspect";
  const tool = diagramEditToolSet.has(requested) ? requested : "inspect";
  if (diagram.dataset.diagramEditing !== "true") {
    diagram.dataset.diagramEditing = "true";
    syncDiagramEditToggleLabels(diagram, true);
  }
  if (tool !== "connect") clearDiagramConnectSource(diagram);
  clearDiagramInlineEditors(diagram);
  diagram.dataset.diagramEditTool = tool;
  if (["text", "style", "move", "delete"].includes(tool) && !getDiagramSelectedItem(diagram)) {
    const next = getDiagramEditableSelection(diagram);
    if (next) focusDiagramItem(next);
  }
  syncDiagramEditor(diagram);
  if (tool === "text") focusDiagramInlineEditor(diagram, "title");
  setDiagramLayoutStatus(diagram, diagramEditToolStatus[tool], "idle");
  diagram.dispatchEvent(new CustomEvent("if:diagram-edit-tool", {
    bubbles: true,
    detail: { active: true, diagram, tool }
  }));
  return tool;
}

function registerDiagramLayoutAdapter(name, adapter) {
  const key = String(name || "").trim();
  if (!key) throw new Error("InterfaceFramework.registerDiagramLayoutAdapter requires a name.");
  if (!adapter || typeof adapter !== "object") throw new Error("Diagram layout adapter must be an object.");
  diagramLayoutAdapters.set(key, adapter);
  return () => unregisterDiagramLayoutAdapter(key);
}

function unregisterDiagramLayoutAdapter(name) {
  return diagramLayoutAdapters.delete(String(name || "").trim());
}

function saveDiagramLayout(diagramOrControl, options = {}) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const snapshot = collectDiagramLayoutSnapshot(diagram);
  const adapter = getDiagramLayoutAdapter(diagram);
  const finish = (result = snapshot) => {
    syncDiagramSourceEditor(diagram, result?.document || snapshot.document);
    if (!options.silent) setDiagramLayoutStatus(diagram, "Diagram JSON saved for this session", "success");
    diagram.dispatchEvent(new CustomEvent("if:diagram-layout-save", {
      bubbles: true,
      detail: { diagram, silent: Boolean(options.silent), snapshot: result }
    }));
    return result;
  };
  if (adapter?.save) {
    if (!options.silent) setDiagramLayoutStatus(diagram, "Saving layout...", "loading");
    return Promise.resolve(adapter.save({ diagram, key: getDiagramLayoutKey(diagram), snapshot, signal: options.signal })).then(finish).catch((error) => {
      if (!options.silent) setDiagramLayoutStatus(diagram, "Unable to save layout", "error");
      throw error;
    });
  }
  const storage = getDiagramSessionStorage();
  if (storage) storage.setItem(getDiagramLayoutStorageKey(diagram), JSON.stringify(snapshot));
  return finish(snapshot);
}

function loadDiagramLayout(diagramOrControl) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return null;
  const adapter = getDiagramLayoutAdapter(diagram);
  const apply = (snapshot) => {
    if (!snapshot) {
      updateDiagramStats(diagram);
      return null;
    }
    const expectedVersion = getDiagramLayoutVersion(diagram);
    if (expectedVersion && snapshot.layoutVersion !== expectedVersion) {
      if (!adapter?.load) getDiagramSessionStorage()?.removeItem(getDiagramLayoutStorageKey(diagram));
      updateDiagramStats(diagram);
      syncDiagramSourceEditor(diagram);
      setDiagramLayoutStatus(diagram, "Skipped saved layout from an older diagram version", "idle");
      return null;
    }
    if (!isDiagramLayoutSnapshotCompatibleWithBaseline(diagram, snapshot)) {
      if (!adapter?.load) getDiagramSessionStorage()?.removeItem(getDiagramLayoutStorageKey(diagram));
      updateDiagramStats(diagram);
      syncDiagramSourceEditor(diagram);
      setDiagramLayoutStatus(diagram, "Skipped saved layout that no longer matches this diagram", "idle");
      return null;
    }
    setDiagramLayoutStatus(diagram, "Loaded saved layout", "success");
    return applyDiagramLayoutSnapshot(diagram, snapshot);
  };
  if (adapter?.load) {
    setDiagramLayoutStatus(diagram, "Loading layout...", "loading");
    return Promise.resolve(adapter.load({ diagram, key: getDiagramLayoutKey(diagram) })).then(apply).catch((error) => {
      setDiagramLayoutStatus(diagram, "Unable to load layout", "error");
      throw error;
    });
  }
  const storage = getDiagramSessionStorage();
  const raw = storage?.getItem(getDiagramLayoutStorageKey(diagram));
  if (!raw) return apply(null);
  try {
    return apply(JSON.parse(raw));
  } catch {
    return apply(null);
  }
}

function resetDiagramLayout(diagramOrControl) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return;
  const adapter = getDiagramLayoutAdapter(diagram);
  if (adapter?.reset) {
    Promise.resolve(adapter.reset({ diagram, key: getDiagramLayoutKey(diagram) })).catch(() => {});
  } else {
    getDiagramSessionStorage()?.removeItem(getDiagramLayoutStorageKey(diagram));
  }
  qsa("[data-if-diagram-dynamic='true']", diagram).forEach((item) => item.remove());
  qsa("[data-if-connector-route][data-if-diagram-route]", diagram).forEach((route) => route.remove());
  if (diagram.__ifDiagramBaseline) {
    applyDiagramLayoutSnapshot(diagram, diagram.__ifDiagramBaseline);
  } else {
    qsa(diagramItemSelector, diagram).forEach(clearDiagramItemOffset);
  }
  setDiagramLayoutStatus(diagram, "Layout reset", "success");
  updateDiagramStats(diagram);
  refreshConnectorRoutes(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-layout-reset", {
    bubbles: true,
    detail: { diagram }
  }));
}

function maybeAutosaveDiagramLayout(diagram) {
  if (!diagram) return;
  syncDiagramSourceEditor(diagram);
  if (isInterfaceFrameworkTestMode()) return;
  if (diagram.dataset.ifDiagramLayoutAutosave === "true") saveDiagramLayout(diagram, { silent: true });
}

function bindDiagramEditToggle(control) {
  if (!control || control.__ifDiagramEditToggleHandler) return;
  control.__ifDiagramEditToggleHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDiagramEditMode(control);
  };
  control.addEventListener("click", control.__ifDiagramEditToggleHandler);
}

function unbindDiagramEditToggle(control) {
  if (!control?.__ifDiagramEditToggleHandler) return;
  control.removeEventListener("click", control.__ifDiagramEditToggleHandler);
  delete control.__ifDiagramEditToggleHandler;
}

function syncDiagramEditToggleLabels(diagram, active) {
  qsa("[data-if-diagram-edit-toggle]", diagram).forEach((control) => {
    control.setAttribute("aria-pressed", String(active));
    control.classList.toggle("is-active", active);
    control.setAttribute("title", active ? "Exit diagram edit mode" : "Edit diagram layout");
    const label = qs("[data-if-diagram-edit-toggle-label]", control);
    if (label) label.textContent = active ? "Exit edit" : "Edit layout";
  });
}

function setDiagramEditMode(diagramOrControl, force = null) {
  const diagram = diagramOrControl?.matches?.("[data-if-diagram]")
    ? diagramOrControl
    : diagramOrControl?.closest?.("[data-if-diagram]");
  if (!diagram) return false;
  const active = force == null ? diagram.dataset.diagramEditing !== "true" : Boolean(force);
  diagram.dataset.diagramEditing = String(active);
  if (active && !diagram.dataset.diagramEditTool) diagram.dataset.diagramEditTool = "inspect";
  if (!active) clearDiagramConnectSource(diagram);
  if (!active) clearDiagramInlineEditors(diagram);
  syncDiagramEditToggleLabels(diagram, active);
  if (active && !getDiagramSelectedItem(diagram)) {
    const next = getDiagramEditableSelection(diagram);
    if (next) focusDiagramItem(next);
  }
  syncDiagramEditor(diagram);
  setDiagramLayoutStatus(diagram, active ? diagramEditToolStatus[getDiagramEditTool(diagram)] : "Edit mode off", "idle");
  diagram.dispatchEvent(new CustomEvent("if:diagram-edit-mode", {
    bubbles: true,
    detail: { active, diagram, tool: getDiagramEditTool(diagram) }
  }));
  return active;
}

function getDiagramSearchTarget(control) {
  if (!control) return null;
  if (control.matches?.("[data-if-diagram]")) return control;
  const selector = control.dataset?.ifDiagramSearchTarget;
  if (selector) return qs(selector) || control.closest?.("[data-if-diagram]");
  return control.closest?.("[data-if-diagram]");
}

function getDiagramSearchTerms(query) {
  return String(query || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length >= 2);
}

function getDiagramSearchHaystack(item) {
  const summary = getDiagramItemSummary(item);
  return [
    item.textContent,
    summary.title,
    summary.description,
    summary.stageTitle,
    summary.status,
    summary.owner,
    summary.throughput,
    summary.dependencies,
    summary.contract
  ].join(" ").replace(/\s+/g, " ").toLowerCase();
}

function clearDiagramSearchMarks(root) {
  qsa(".if-diagram-search-mark", root).forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
  qsa(".if-diagram-search-badge", root).forEach((badge) => badge.remove());
}

function clearDiagramSearch(diagram, options = {}) {
  if (!diagram) return;
  clearDiagramSearchMarks(diagram);
  getDiagramSearchItems(diagram).forEach((item) => {
    item.classList.remove("is-search-match", "is-search-dimmed", "is-search-current");
    item.removeAttribute("data-if-diagram-search-rank");
    item.removeAttribute("data-if-diagram-search-kind");
  });
  delete diagram.dataset.diagramSearchActive;
  delete diagram.dataset.diagramSearchQuery;
  if (options.resetFocus) resetDiagramFocus(diagram);
}

function setDiagramSearchStatus(input, diagram, count, query) {
  const copy = query
    ? count
      ? `${count} matching diagram node${count === 1 ? "" : "s"}`
      : "No matching diagram nodes"
    : "Search diagram nodes, services, owners, and contracts";
  const selector = input?.dataset?.ifDiagramSearchStatus;
  const outputs = selector ? qsa(selector, diagram || document) : qsa("[data-if-diagram-search-status]", diagram || document);
  outputs.forEach((output) => {
    output.textContent = copy;
  });
}

function getDiagramSearchInput(diagram, control = null) {
  if (control?.matches?.("[data-if-diagram-search]")) return control;
  const localInput = qs("[data-if-diagram-search]", diagram);
  if (localInput) return localInput;
  return qsa("[data-if-diagram-search]").find((input) => getDiagramSearchTarget(input) === diagram) || null;
}

function getDiagramSearchInputsForDiagram(diagram) {
  if (!diagram) return [];
  return qsa("[data-if-diagram-search]").filter((input) => getDiagramSearchTarget(input) === diagram);
}

function syncDiagramSearchInputs(diagram, sourceInput, query) {
  getDiagramSearchInputsForDiagram(diagram).forEach((input) => {
    if (input !== sourceInput && input.value !== query) input.value = query;
  });
}

function clearDiagramSearchFromControl(control) {
  const diagram = control?.closest?.("[data-if-diagram]") || getDiagramSearchTarget(control);
  if (!diagram) return;
  const input = getDiagramSearchInput(diagram, control);
  getDiagramSearchInputsForDiagram(diagram).forEach((searchInput) => {
    searchInput.value = "";
  });
  clearDiagramSearch(diagram, { resetFocus: true });
  clearDiagramSearchResults(input, diagram);
  setDiagramSearchStatus(input, diagram, 0, "");
  updateDiagramStats(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-search", {
    bubbles: true,
    detail: { diagram, input, query: "", matches: [] }
  }));
}

function getDiagramSearchResultsTargets(input, diagram) {
  const selector = input?.dataset?.ifDiagramSearchResults;
  return selector ? qsa(selector, diagram || document) : qsa("[data-if-diagram-search-results]", diagram || document);
}

function clearDiagramSearchResults(input, diagram) {
  getDiagramSearchResultsTargets(input, diagram).forEach((target) => {
    target.hidden = true;
    target.innerHTML = "";
  });
}

function renderDiagramSearchResults(input, diagram, matches, query) {
  const targets = getDiagramSearchResultsTargets(input, diagram);
  if (!targets.length) return;
  targets.forEach((target) => {
    target.innerHTML = "";
    target.hidden = !query;
    target.setAttribute("aria-label", query ? `Diagram search results for ${query}` : "Diagram search results");
    if (!query) return;
    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "if-diagram-search-results__empty";
      empty.textContent = "No diagram nodes matched that search.";
      target.append(empty);
      return;
    }
    matches.slice(0, 12).forEach((match, index) => {
      const summary = getDiagramItemSummary(match.item);
      const button = document.createElement("button");
      button.className = `if-diagram-search-result${index === 0 ? " is-current" : ""}`;
      button.type = "button";
      button.dataset.ifDiagramSearchResult = match.item.dataset.ifDiagramLayoutId || String(index + 1);
      button.setAttribute("aria-current", index === 0 ? "true" : "false");
      button.innerHTML = `
        <span class="if-diagram-search-result__rank">${index + 1}</span>
        <span class="if-diagram-search-result__copy">
          <strong>${escapeHtml(summary.title)}</strong>
          <span>${escapeHtml(summary.stageTitle)} · ${match.marks ? `${match.marks} text hit${match.marks === 1 ? "" : "s"}` : "metadata match"}</span>
        </span>
      `;
      target.append(button);
    });
  });
}

function selectDiagramSearchMatch(diagram, itemOrId, options = {}) {
  if (!diagram) return null;
  const item = typeof itemOrId === "string"
    ? getDiagramLayoutItem(diagram, itemOrId)
    : itemOrId;
  if (!item) return null;
  qsa(".is-search-current", diagram).forEach((match) => match.classList.remove("is-search-current"));
  item.classList.add("is-search-current");
  if (options.focus !== false) focusDiagramItem(item);
  if (options.scroll !== false) item.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
  qsa("[data-if-diagram-search-result]", diagram).forEach((control) => {
    const selected = control.dataset.ifDiagramSearchResult === item.dataset.ifDiagramLayoutId;
    control.classList.toggle("is-current", selected);
    control.setAttribute("aria-current", selected ? "true" : "false");
  });
  return item;
}

function stepDiagramSearch(control, direction = 1) {
  const diagram = control?.closest?.("[data-if-diagram]") || getDiagramSearchTarget(control);
  if (!diagram) return;
  const matches = qsa(".is-search-match", diagram);
  if (!matches.length) return;
  const current = qs(".is-search-current", diagram);
  const index = Math.max(0, matches.indexOf(current));
  selectDiagramSearchMatch(diagram, matches[(index + direction + matches.length) % matches.length]);
}

function bindDiagramSearchInput(input) {
  if (!input || input.__ifDiagramSearchHandlers) return;
  const onInput = (event) => {
    event.__ifDiagramSearchHandled = true;
    updateDiagramSearch(input);
  };
  const onSearch = (event) => {
    event.__ifDiagramSearchHandled = true;
    updateDiagramSearch(input);
  };
  const onKeydown = (event) => {
    if (event.key !== "Escape") return;
    event.__ifDiagramSearchHandled = true;
    event.preventDefault();
    if (input.value) clearDiagramSearchFromControl(input);
    else resetDiagramFocus(input);
  };
  input.addEventListener("input", onInput);
  input.addEventListener("search", onSearch);
  input.addEventListener("keydown", onKeydown);
  input.__ifDiagramSearchHandlers = { onInput, onSearch, onKeydown };
}

function unbindDiagramSearchInput(input) {
  const handlers = input?.__ifDiagramSearchHandlers;
  if (!input || !handlers) return;
  input.removeEventListener("input", handlers.onInput);
  input.removeEventListener("search", handlers.onSearch);
  input.removeEventListener("keydown", handlers.onKeydown);
  delete input.__ifDiagramSearchHandlers;
}

function bindDiagramSearchButton(control, callback, key) {
  if (!control || control[key]) return;
  const onClick = (event) => {
    event.__ifDiagramSearchHandled = true;
    event.preventDefault();
    callback(control);
  };
  control.addEventListener("click", onClick);
  control[key] = { onClick };
}

function unbindDiagramSearchButton(control, key) {
  const handlers = control?.[key];
  if (!control || !handlers) return;
  control.removeEventListener("click", handlers.onClick);
  delete control[key];
}

function bindDiagramSearchResultsTarget(target, diagram) {
  if (!target || target.__ifDiagramSearchResultsHandlers) return;
  const onClick = (event) => {
    const result = event.target.closest("[data-if-diagram-search-result]");
    if (!result) return;
    event.__ifDiagramSearchHandled = true;
    event.preventDefault();
    selectDiagramSearchMatch(diagram, result.dataset.ifDiagramSearchResult);
  };
  target.addEventListener("click", onClick);
  target.__ifDiagramSearchResultsHandlers = { onClick };
}

function unbindDiagramSearchResultsTarget(target) {
  const handlers = target?.__ifDiagramSearchResultsHandlers;
  if (!target || !handlers) return;
  target.removeEventListener("click", handlers.onClick);
  delete target.__ifDiagramSearchResultsHandlers;
}

function bindDiagramSearchControls(diagram) {
  if (!diagram) return;
  qsa("[data-if-diagram-search]", diagram).forEach((input) => {
    bindDiagramSearchInput(input);
    getDiagramSearchResultsTargets(input, diagram).forEach((target) => bindDiagramSearchResultsTarget(target, diagram));
  });
  qsa("[data-if-diagram-search-step]", diagram).forEach((control) => {
    bindDiagramSearchButton(control, (target) => {
      stepDiagramSearch(target, Number.parseInt(target.dataset.ifDiagramSearchStep || "1", 10) || 1);
    }, "__ifDiagramSearchStepHandlers");
  });
  qsa("[data-if-diagram-search-clear]", diagram).forEach((control) => {
    bindDiagramSearchButton(control, clearDiagramSearchFromControl, "__ifDiagramSearchClearHandlers");
  });
  qsa("[data-if-diagram-search-results]", diagram).forEach((target) => bindDiagramSearchResultsTarget(target, diagram));
}

function unbindDiagramSearchControls(diagram) {
  if (!diagram) return;
  qsa("[data-if-diagram-search]", diagram).forEach((input) => {
    getDiagramSearchResultsTargets(input, diagram).forEach(unbindDiagramSearchResultsTarget);
    unbindDiagramSearchInput(input);
  });
  qsa("[data-if-diagram-search-step]", diagram).forEach((control) => {
    unbindDiagramSearchButton(control, "__ifDiagramSearchStepHandlers");
  });
  qsa("[data-if-diagram-search-clear]", diagram).forEach((control) => {
    unbindDiagramSearchButton(control, "__ifDiagramSearchClearHandlers");
  });
  qsa("[data-if-diagram-search-results]", diagram).forEach(unbindDiagramSearchResultsTarget);
}

function highlightDiagramItemText(item, terms) {
  if (!item || !terms.length) return 0;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const textNodes = [];
  const nodeFilterApi = typeof window !== "undefined" ? window.NodeFilter : null;
  const showText = nodeFilterApi?.SHOW_TEXT || 4;
  const textFilter = nodeFilterApi || { FILTER_ACCEPT: 1, FILTER_REJECT: 2 };
  const walker = document.createTreeWalker(item, showText, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue?.trim()) return textFilter.FILTER_REJECT;
      if (parent.closest(".if-icon-slot, svg, script, style, .if-diagram-search-mark, [data-if-diagram-search-ignore]")) return textFilter.FILTER_REJECT;
      pattern.lastIndex = 0;
      return pattern.test(node.nodeValue) ? textFilter.FILTER_ACCEPT : textFilter.FILTER_REJECT;
    }
  });
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  let count = 0;
  textNodes.forEach((node) => {
    const text = node.nodeValue || "";
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    pattern.lastIndex = 0;
    text.replace(pattern, (match, _term, offset) => {
      if (offset > cursor) fragment.append(document.createTextNode(text.slice(cursor, offset)));
      const mark = document.createElement("mark");
      mark.className = "if-diagram-search-mark";
      mark.textContent = match;
      fragment.append(mark);
      cursor = offset + match.length;
      count += 1;
      return match;
    });
    if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
    node.parentNode?.replaceChild(fragment, node);
  });
  return count;
}

function updateDiagramSearch(controlOrDiagram, queryOverride = null) {
  const diagram = getDiagramSearchTarget(controlOrDiagram);
  if (!diagram) return [];
  ensureDiagramLayoutIds(diagram);
  const input = controlOrDiagram?.matches?.("[data-if-diagram-search]")
    ? controlOrDiagram
    : qs("[data-if-diagram-search]", diagram);
  const query = queryOverride ?? input?.value ?? "";
  syncDiagramSearchInputs(diagram, input, query);
  const terms = getDiagramSearchTerms(query);
  const wasActive = diagram.dataset.diagramSearchActive === "true";
  clearDiagramSearch(diagram, { resetFocus: false });
  if (!terms.length) {
    setDiagramSearchStatus(input, diagram, 0, "");
    clearDiagramSearchResults(input, diagram);
    if (wasActive) resetDiagramFocus(diagram);
    updateDiagramStats(diagram);
    diagram.dispatchEvent(new CustomEvent("if:diagram-search", {
      bubbles: true,
      detail: { diagram, input, query: "", matches: [] }
    }));
    return [];
  }

  const matches = [];
  getDiagramSearchItems(diagram).forEach((item) => {
    const haystack = getDiagramSearchHaystack(item);
    const matched = terms.every((term) => haystack.includes(term));
    item.classList.toggle("is-search-dimmed", !matched);
    if (!matched) return;
    const marks = highlightDiagramItemText(item, terms);
    item.classList.add("is-search-match");
    item.dataset.ifDiagramSearchRank = String(matches.length + 1);
    item.dataset.ifDiagramSearchKind = marks ? "text" : "metadata";
    const badge = document.createElement("span");
    badge.className = "if-diagram-search-badge";
    badge.textContent = marks ? String(matches.length + 1) : `${matches.length + 1} meta`;
    badge.setAttribute("aria-hidden", "true");
    item.append(badge);
    matches.push({ item, marks, title: getDiagramItemSummary(item).title });
  });

  if (matches.length) {
    selectDiagramSearchMatch(diagram, matches[0].item, { focus: false, scroll: false });
  } else {
    resetDiagramFocus(diagram);
  }
  diagram.dataset.diagramSearchActive = "true";
  diagram.dataset.diagramSearchQuery = query;
  setDiagramSearchStatus(input, diagram, matches.length, query);
  renderDiagramSearchResults(input, diagram, matches, query);
  updateDiagramStats(diagram);
  diagram.dispatchEvent(new CustomEvent("if:diagram-search", {
    bubbles: true,
    detail: { diagram, input, query, matches }
  }));
  return matches;
}

function setDemoState(control) {
  if (!control?.hasAttribute?.("data-if-demo-state")) return null;
  const targetRoot = getConfigurationTarget(control.dataset.ifDemoTarget || "", control.closest("[data-if-config-demo]") || document);
  if (!targetRoot) return null;
  const prefix = control.dataset.ifDemoStatePrefix || "is-demo-state-";
  const target = targetRoot.matches?.("[data-if-wizard]") && prefix === "if-stepper--"
    ? qs(".if-stepper", targetRoot) || targetRoot
    : targetRoot;
  const controls = qsa(`[data-if-demo-target="${control.dataset.ifDemoTarget}"][data-if-demo-state]`);
  controls.forEach((item) => {
    target.classList.remove(`${prefix}${item.dataset.ifDemoState}`);
    setPressed(item, item === control);
  });
  if (control.dataset.ifDemoState) target.classList.add(`${prefix}${control.dataset.ifDemoState}`);
  target.dispatchEvent(new CustomEvent("if:demo-state", {
    bubbles: true,
    detail: {
      control,
      prefix,
      target,
      state: control.dataset.ifDemoState
    }
  }));
  return { control, prefix, state: control.dataset.ifDemoState, target };
}

function getConfigurationState(root = document) {
  const scope = typeof root === "string" ? qs(root) : root || document;
  if (!scope) return { controls: [], states: [] };
  const controlScope = scope.matches?.("[data-if-control-var], [data-if-demo-state]") ? scope.parentElement || document : scope;
  const controls = qsa("[data-if-control-var]", controlScope)
    .filter((control) => scope === document || scope.contains?.(control) || control === scope)
    .map((control) => ({
      output: control.dataset.ifControlOutput || "",
      property: control.dataset.ifControlVar || "",
      target: control.dataset.ifControlTarget || "",
      unit: control.dataset.ifControlUnit || "",
      value: formatConfigurationControlValue(control)
    }));
  const states = qsa("[data-if-demo-state]", controlScope)
    .filter((control) => scope === document || scope.contains?.(control) || control === scope)
    .map((control) => ({
      active: control.getAttribute("aria-pressed") === "true" || control.classList.contains("is-active"),
      prefix: control.dataset.ifDemoStatePrefix || "is-demo-state-",
      state: control.dataset.ifDemoState || "",
      target: control.dataset.ifDemoTarget || ""
    }));
  return { controls, states };
}

function normalizeConfigurationDemoDocument(config = {}) {
  const targetId = config.targetId || "if-config-demo-preview";
  const targetSelector = config.target || `#${targetId}`;
  return {
    controls: config.controls || [],
    description: config.description || "Generated configuration demo surface.",
    preview: config.preview || {},
    states: config.states || [],
    targetId,
    targetSelector,
    title: config.title || "Configurable demo"
  };
}

function renderConfigurationDemo(demoOrSelector, config = {}) {
  const demo = typeof demoOrSelector === "string" ? qs(demoOrSelector) : demoOrSelector;
  if (!demo) return null;
  const doc = normalizeConfigurationDemoDocument(config);
  const activeState = doc.states.find((state) => state.active) || doc.states[0] || {};
  const statePrefix = activeState.prefix || config.statePrefix || "if-showcase-state--";
  const previewClass = [
    "if-showcase-preview",
    activeState.state ? `${statePrefix}${activeState.state}` : "",
    doc.preview.className || ""
  ].filter(Boolean).join(" ");
  demo.dataset.ifConfigDemoRendered = "true";
  demo.replaceChildren();
  demo.innerHTML = `
    <div class="if-showcase-lab">
      <section class="if-showcase-controls" aria-label="${escapeHtml(doc.title)} controls">
        <div><span class="if-showcase-controls__eyebrow">${escapeHtml(doc.preview.eyebrow || "Structured configuration")}</span><h3>${escapeHtml(doc.title)}</h3><p>${escapeHtml(doc.description)}</p></div>
        ${doc.controls.map((control, index) => {
          const outputId = control.outputId || `${doc.targetId}-control-${index + 1}-output`;
          const value = `${control.value ?? control.min ?? 0}${control.unit || ""}`;
          const controlLabel = control.label || control.property || `Control ${index + 1}`;
          return `<label class="if-config-control"><span class="if-config-control__label">${escapeHtml(controlLabel)} <output id="${escapeHtml(outputId)}">${escapeHtml(value)}</output></span><input class="if-range" type="range" aria-label="${escapeHtml(controlLabel)}" min="${escapeHtml(control.min ?? 0)}" max="${escapeHtml(control.max ?? 100)}" value="${escapeHtml(control.value ?? control.min ?? 0)}" step="${escapeHtml(control.step ?? 1)}" data-if-control-var="${escapeHtml(control.property || "")}" data-if-control-unit="${escapeHtml(control.unit || "")}" data-if-control-target="${escapeHtml(doc.targetSelector)}" data-if-control-output="#${escapeHtml(outputId)}"></label>`;
        }).join("")}
        ${doc.states.length ? `<div class="if-showcase-state-grid" role="group" aria-label="${escapeHtml(doc.title)} states">${doc.states.map((state) => `<button class="if-btn ${escapeHtml(state.variant || "if-btn--secondary")} if-btn--sm${state === activeState ? " is-active" : ""}" type="button" aria-pressed="${state === activeState ? "true" : "false"}" data-if-demo-target="${escapeHtml(doc.targetSelector)}" data-if-demo-state-prefix="${escapeHtml(state.prefix || statePrefix)}" data-if-demo-state="${escapeHtml(state.state || "")}">${escapeHtml(state.label || state.state || "Default")}</button>`).join("")}</div>` : ""}
      </section>
      <section class="${escapeHtml(previewClass)}" id="${escapeHtml(doc.targetId)}" aria-label="${escapeHtml(doc.preview.label || `${doc.title} preview`)}">
        <header class="if-showcase-hero"><span class="if-showcase-hero__icon if-icon-slot" data-if-icon="${escapeHtml(doc.preview.icon || "settings")}" aria-hidden="true"></span><div><span class="if-showcase-eyebrow">${escapeHtml(doc.preview.eyebrow || "Generated preview")}</span><h3>${escapeHtml(doc.preview.title || doc.title)}</h3><p>${escapeHtml(doc.preview.body || "Token controls update this preview without page-specific scripts.")}</p></div><span class="if-badge ${escapeHtml(doc.preview.badgeClass || "if-badge--info")}">${escapeHtml(doc.preview.badge || "Live")}</span></header>
        <div class="if-showcase-component-grid">
          <article class="if-showcase-panel if-showcase-panel--accent"><header><span class="if-icon-slot" data-if-icon="settings"></span><strong>${escapeHtml(doc.preview.panelTitle || "Token contract")}</strong><span class="if-badge if-badge--status-approved">Ready</span></header><p>${escapeHtml(doc.preview.panelBody || "Controls, outputs, target variables, and state presets are all generated from one JSON document.")}</p><div class="if-showcase-progress"><span></span></div></article>
          <article class="if-showcase-panel"><header><span class="if-icon-slot" data-if-icon="workflow"></span><strong>State surface</strong><span class="if-badge if-badge--info">${escapeHtml(activeState.label || activeState.state || "Default")}</span></header><dl class="if-showcase-metrics"><div><dt>Controls</dt><dd>${doc.controls.length}</dd></div><div><dt>States</dt><dd>${doc.states.length}</dd></div><div><dt>Events</dt><dd>2</dd></div></dl></article>
        </div>
      </section>
    </div>
  `;
  hydrateIcons(demo);
  hydrateConfigurationControls(demo);
  return demo;
}

function getConfigurationDemoConfig(demo) {
  const sourceSelector = demo?.getAttribute?.("data-if-config-demo-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || demo?.getAttribute?.("data-if-config-demo-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid configuration demo JSON", error);
    return null;
  }
}

function hydrateConfigurationControls(root = document) {
  const demos = root?.matches?.("[data-if-config-demo]") ? [root, ...qsa("[data-if-config-demo]", root)] : qsa("[data-if-config-demo]", root);
  demos.forEach((demo) => {
    const config = demo.dataset.ifConfigDemoRendered === "true" ? null : getConfigurationDemoConfig(demo);
    if (config) renderConfigurationDemo(demo, config);
  });
  qsa("[data-if-control-var]", root).forEach(setControlVariable);
  qsa("[data-if-demo-state][aria-pressed='true']", root).forEach(setDemoState);
}

function getComponentInventory(target = null) {
  if (!target) return qs("[data-if-component-inventory]");
  if (typeof target === "string") return qs(target);
  if (target.matches?.("[data-if-component-inventory]")) return target;
  if (target.matches?.("[data-if-inventory-id]")) return target.closest("[data-if-component-inventory]");
  const selector = target.dataset?.ifComponentInventoryFilter
    || target.dataset?.ifComponentInventoryCategory
    || target.dataset?.ifComponentInventoryCategorySet
    || target.dataset?.ifComponentInventoryCapability
    || target.dataset?.ifComponentInventoryCapabilitySet
    || target.dataset?.ifComponentInventoryStatus
    || target.dataset?.ifComponentInventoryRisk
    || target.dataset?.ifComponentInventorySort
    || target.dataset?.ifComponentInventoryPreset
    || target.dataset?.ifComponentInventoryClearFilter
    || target.dataset?.ifComponentInventoryClear
    || target.dataset?.ifComponentInventorySelect;
  if (selector) return qs(selector);
  return target.closest?.("[data-if-component-inventory]");
}

function getComponentInventoryCards(inventory) {
  return qsa("[data-if-inventory-id]", inventory);
}

function getVisibleComponentInventoryCards(inventory) {
  return getComponentInventoryCards(inventory).filter((card) => !card.hidden);
}

function normalizeComponentInventoryManifest(manifest) {
  const components = Array.isArray(manifest?.components) ? manifest.components : [];
  return new Map(components.filter((component) => component?.id).map((component) => [component.id, component]));
}

function getComponentInventoryManifestEntry(inventory, id) {
  return inventory?.__ifComponentManifestMap?.get?.(id) || null;
}

function getComponentInventoryManifestSource(inventory) {
  return inventory?.dataset?.ifComponentManifest || "";
}

function isComponentInventoryManifestPending(inventory) {
  const state = inventory?.dataset?.ifComponentManifestLoaded || "";
  return Boolean(getComponentInventoryManifestSource(inventory) && state !== "true" && state !== "false" && !inventory?.__ifComponentManifestMap);
}

function getComponentInventoryDeficiencySource(inventory) {
  if (!inventory) return "";
  return inventory.dataset?.ifComponentInventoryDeficiencySource
    || inventory.closest?.("[data-if-component-inventory-scope]")?.dataset?.ifComponentInventoryDeficiencySource
    || "";
}

function normalizeComponentInventoryDeficiencyItem(item = {}, fallbackPriority = "P2") {
  const priority = String(item.priority || fallbackPriority || "P2").trim().toUpperCase();
  return {
    id: String(item.id || "").trim(),
    title: String(item.title || "Untitled deficiency").trim(),
    category: String(item.category || "Framework readiness").trim(),
    status: String(item.status || "Open").trim(),
    priority: ["P0", "P1", "P2", "P3", "CLEAR"].includes(priority) ? priority : "P2",
    action: String(item.action || item.summary || "Define the next owner action.").trim(),
    evidence: Array.isArray(item.evidence) ? item.evidence.filter(Boolean).map(String) : (item.evidence ? [String(item.evidence)] : []),
    closed: String(item.closed || item.resolution || "").trim()
  };
}

function parseComponentInventoryDeficiencyBacklog(source = "") {
  const rawSource = String(source || "").trim();
  if (!rawSource) return null;
  let json = rawSource;
  if (rawSource.startsWith("#")) {
    const node = qs(rawSource);
    if (!node) return null;
    json = node.textContent || "";
  }
  if (!json.trim()) return null;
  try {
    const backlog = JSON.parse(json);
    const openItems = Array.isArray(backlog?.openItems) ? backlog.openItems.map((item) => normalizeComponentInventoryDeficiencyItem(item)) : [];
    const closedItems = Array.isArray(backlog?.closedItems) ? backlog.closedItems.map((item) => normalizeComponentInventoryDeficiencyItem(item, "CLEAR")) : [];
    const priorityCounts = openItems.reduce((counts, item) => {
      counts[item.priority.toLowerCase()] = (counts[item.priority.toLowerCase()] || 0) + 1;
      return counts;
    }, {});
    return {
      status: String(backlog?.status || "Backlog linked").trim(),
      updated: String(backlog?.updated || "").trim(),
      openItems,
      closedItems,
      priorityCounts,
      source: rawSource
    };
  } catch (error) {
    console.warn("Invalid component inventory deficiency backlog JSON", error);
    return {
      status: "Backlog parse error",
      updated: "",
      openItems: [normalizeComponentInventoryDeficiencyItem({
        id: "BACKLOG-PARSE",
        priority: "P1",
        title: "Deficiency backlog source could not be parsed",
        category: "Component inventory",
        status: "Error",
        action: "Validate JSON in data-if-component-inventory-deficiency-source before relying on package-level readiness output."
      }, "P1")],
      closedItems: [],
      priorityCounts: { p1: 1 },
      source: rawSource
    };
  }
}

function getComponentInventoryDeficiencyBacklog(inventoryOrControl = null) {
  const inventory = getComponentInventory(inventoryOrControl);
  return parseComponentInventoryDeficiencyBacklog(getComponentInventoryDeficiencySource(inventory));
}

function formatComponentInventoryStatus(status = "") {
  const value = String(status || "").trim();
  if (!value) return "Unknown";
  if (value === "production-ready") return "Ready";
  if (value === "in-review" || value === "hardening") return "Hardening";
  return value.split(/[-_]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatComponentInventoryCategory(category = "") {
  const value = String(category || "").trim();
  if (!value) return "Uncategorized";
  return value.split(/[-_]/).map((part, index) => index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part).join(" ");
}

function setComponentInventoryManifestStatus(inventory, message, state = "idle") {
  const scope = inventory?.closest?.("[data-if-component-inventory-scope]") || inventory?.parentElement || document;
  qsa("[data-if-component-inventory-manifest-status]", scope).forEach((target) => {
    target.textContent = message;
    target.dataset.ifComponentInventoryManifestState = state;
  });
}

function getComponentInventoryEvidence(data = {}) {
  const checks = [
    { id: "purpose", label: "Use guidance", passed: Boolean(data.whenToUse?.length || data.summary) },
    { id: "classes", label: "Classes", passed: Boolean(data.primaryClasses?.length) },
    { id: "attributes", label: "Data attributes", passed: Boolean(data.dataAttributes?.length) },
    { id: "docs", label: "Docs", passed: Boolean(data.docs?.length) },
    { id: "examples", label: "Examples", passed: Boolean(data.examples?.length || data.href) },
    { id: "accessibility", label: "A11y notes", passed: Boolean(data.accessibility?.length) },
    { id: "apis", label: "APIs", passed: Boolean(data.jsApis?.length) },
    { id: "events", label: "Events", passed: Boolean(data.events?.length) }
  ];
  const passed = checks.filter((check) => check.passed).length;
  return {
    checks,
    missing: checks.filter((check) => !check.passed).map((check) => check.label),
    passed,
    total: checks.length,
    score: checks.length ? Math.round((passed / checks.length) * 100) : 0
  };
}

function getComponentInventoryCapabilityDefinitions() {
  return [
    { id: "scriptability", label: "Scriptability", detail: "Public JavaScript APIs are listed.", test: (card) => card.jsApis.length > 0 },
    { id: "events", label: "Events", detail: "Host integration events are listed.", test: (card) => card.events.length > 0 },
    { id: "attributes", label: "Data attributes", detail: "Declarative data-if hooks are listed.", test: (card) => card.dataAttributes.length > 0 },
    { id: "classes", label: "Classes", detail: "Primary CSS classes are listed.", test: (card) => card.primaryClasses.length > 0 },
    { id: "docs", label: "Docs", detail: "Documentation links are listed.", test: (card) => card.docs.length > 0 },
    { id: "examples", label: "Examples", detail: "Runnable example surfaces are listed.", test: (card) => card.examples.length > 0 || Boolean(card.href) },
    { id: "accessibility", label: "Accessibility", detail: "Accessibility notes are listed.", test: (card) => card.accessibility.length > 0 },
    { id: "recipes", label: "Recipes", detail: "Implementation recipes are listed.", test: (card) => card.recipes.length > 0 },
    { id: "motion", label: "Motion/state hooks", detail: "Motion, transition, or state-control hooks are discoverable.", test: (card) => Boolean(card.stateAndMotion) || /motion|transition|animation|state|demo-state|control-var/.test(card.searchText) }
  ];
}

function getComponentInventoryCapabilityDefinition(id = "") {
  const normalized = String(id || "").trim().toLowerCase();
  return getComponentInventoryCapabilityDefinitions().find((capability) => capability.id === normalized) || null;
}

function getComponentInventoryPresetDefinitions() {
  return [
    { id: "all", label: "All components", values: { query: "", category: "all", capability: "all", status: "all", risk: "all", sort: "manifest" } },
    { id: "most-deficient", label: "Most deficient", values: { query: "", category: "all", capability: "all", status: "all", risk: "all", sort: "risk" } },
    { id: "release-blockers", label: "Release blockers", values: { query: "", category: "all", capability: "all", status: "all", risk: "p0", sort: "risk" } },
    { id: "readiness-actions", label: "Readiness actions", values: { query: "", category: "all", capability: "all", status: "all", risk: "all", sort: "actions" } },
    { id: "evidence-gaps", label: "Evidence gaps", values: { query: "", category: "all", capability: "all", status: "all", risk: "all", sort: "evidence-asc" } },
    { id: "motion-gaps", label: "Motion gaps", values: { query: "", category: "all", capability: "motion", status: "all", risk: "all", sort: "title" } },
    { id: "hardening", label: "Hardening", values: { query: "", category: "all", capability: "all", status: "Hardening", risk: "all", sort: "risk" } },
    { id: "clean", label: "Clean components", values: { query: "", category: "all", capability: "all", status: "all", risk: "clear", sort: "category" } }
  ];
}

function getComponentInventoryPresetDefinition(id = "") {
  const normalized = String(id || "").trim().toLowerCase();
  return getComponentInventoryPresetDefinitions().find((preset) => preset.id === normalized) || null;
}

function readComponentInventoryManifestSource(source) {
  if (!source) return Promise.resolve(null);
  if (source.startsWith("#")) {
    const node = qs(source);
    if (!node) return Promise.reject(new Error(`Component manifest source not found: ${source}`));
    return Promise.resolve(JSON.parse(node.textContent || "{}"));
  }
  return fetch(source).then((response) => {
    if (!response.ok) throw new Error(`Component manifest request failed: ${response.status}`);
    return response.json();
  });
}

function hydrateComponentInventoryManifest(inventory) {
  const source = getComponentInventoryManifestSource(inventory);
  if (!source || typeof Promise !== "function") return null;
  if (componentInventoryManifestRequests.has(inventory)) return componentInventoryManifestRequests.get(inventory);
  setComponentInventoryManifestStatus(inventory, "Loading manifest metadata", "loading");
  const request = readComponentInventoryManifestSource(source)
    .then((manifest) => {
      inventory.__ifComponentManifestMap = normalizeComponentInventoryManifest(manifest);
      inventory.dataset.ifComponentManifestLoaded = "true";
      setComponentInventoryManifestStatus(inventory, `${inventory.__ifComponentManifestMap.size} manifest entries loaded`, "success");
      applyComponentInventoryFilters(inventory, { emit: false });
      dispatchFrameworkEvent(inventory, "if:component-inventory-manifest", { inventory, manifest, count: inventory.__ifComponentManifestMap.size });
      return manifest;
    })
    .catch((error) => {
      inventory.dataset.ifComponentManifestLoaded = "false";
      setComponentInventoryManifestStatus(inventory, "Manifest metadata unavailable", "error");
      applyComponentInventoryFilters(inventory, { emit: false });
      dispatchFrameworkEvent(inventory, "if:component-inventory-manifest-error", { inventory, error });
      return null;
    });
  componentInventoryManifestRequests.set(inventory, request);
  return request;
}

function getComponentInventoryCardData(card) {
  const title = qs("h3", card)?.textContent?.trim() || "";
  const category = qs("header div > span", card)?.textContent?.trim() || card.dataset.ifInventoryCategory || "Uncategorized";
  const status = qs(".if-badge", card)?.textContent?.trim() || card.dataset.ifInventoryStatus || "Unknown";
  const tags = qsa(":scope > div span", card).map((tag) => tag.textContent.trim()).filter(Boolean);
  const summary = qs("p", card)?.textContent?.trim() || "";
  const id = card.dataset.ifInventoryId || "";
  const manifest = getComponentInventoryManifestEntry(card.closest("[data-if-component-inventory]"), id);
  const data = {
    id,
    title: manifest?.name || title,
    category: formatComponentInventoryCategory(manifest?.category || category),
    status: formatComponentInventoryStatus(manifest?.status || status),
    tags,
    summary: manifest?.whenToUse?.[0] || summary,
    href: qs("a[href]", card)?.getAttribute("href") || "",
    manifest,
    primaryClasses: manifest?.primaryClasses || [],
    dataAttributes: manifest?.dataAttributes || [],
    jsApis: manifest?.jsApis || [],
    events: manifest?.events || [],
    docs: manifest?.docs || [],
    examples: manifest?.examples || [],
    accessibility: manifest?.accessibility || [],
    whenToUse: manifest?.whenToUse || [],
    avoidWhen: manifest?.avoidWhen || [],
    recipes: manifest?.recipes || [],
    stateAndMotion: manifest?.stateAndMotion || null,
    selected: card.classList.contains("is-selected") || card.getAttribute("aria-selected") === "true",
    visible: !card.hidden,
    searchText: [
      manifest?.name || title,
      manifest?.category || category,
      manifest?.status || status,
      manifest?.whenToUse?.join(" ") || summary,
      manifest?.avoidWhen?.join(" ") || "",
      manifest?.recipes?.join(" ") || "",
      tags.join(" "),
      manifest?.primaryClasses?.join(" ") || "",
      manifest?.dataAttributes?.join(" ") || "",
      manifest?.jsApis?.join(" ") || "",
      manifest?.events?.join(" ") || "",
      id
    ].join(" ").toLowerCase()
  };
  data.evidence = getComponentInventoryEvidence(data);
  data.riskPriority = getComponentInventoryCardRiskPriority(data);
  return data;
}

function getComponentInventoryControls(inventory, attr) {
  return qsa(`[${attr}]`).filter((control) => getComponentInventory(control) === inventory);
}

function getComponentInventoryControlValue(inventory, attr, fallback = "") {
  return (getComponentInventoryControls(inventory, attr)[0]?.value || fallback).trim();
}

function setComponentInventoryControlValue(inventory, attr, value = "") {
  getComponentInventoryControls(inventory, attr).forEach((item) => {
    item.value = value;
  });
}

function getComponentInventoryFilterValues(inventory) {
  return {
    query: getComponentInventoryControlValue(inventory, "data-if-component-inventory-filter"),
    category: getComponentInventoryControlValue(inventory, "data-if-component-inventory-category", "all"),
    capability: getComponentInventoryControlValue(inventory, "data-if-component-inventory-capability", "all"),
    status: getComponentInventoryControlValue(inventory, "data-if-component-inventory-status", "all"),
    risk: getComponentInventoryControlValue(inventory, "data-if-component-inventory-risk", "all"),
    sort: getComponentInventoryControlValue(inventory, "data-if-component-inventory-sort", "manifest") || "manifest"
  };
}

function getComponentInventoryMatchingPreset(values = {}) {
  const normalize = (value) => String(value ?? "").trim().toLowerCase();
  return getComponentInventoryPresetDefinitions().find((preset) => Object.entries(preset.values).every(([key, value]) => normalize(values[key]) === normalize(value))) || null;
}

function syncComponentInventoryPresetControls(inventory) {
  if (!inventory) return null;
  const preset = getComponentInventoryMatchingPreset(getComponentInventoryFilterValues(inventory));
  inventory.dataset.ifComponentInventoryPreset = preset?.id || "custom";
  getComponentInventoryControls(inventory, "data-if-component-inventory-preset").forEach((control) => {
    const value = control.getAttribute("data-if-component-inventory-preset-value") || "";
    setPressed(control, Boolean(preset && value === preset.id));
  });
  return preset;
}

function getComponentInventorySortLabel(sort = "manifest") {
  return {
    manifest: "Manifest order",
    title: "Title",
    category: "Category",
    readiness: "Readiness",
    risk: "Risk priority",
    "evidence-asc": "Evidence gaps",
    "evidence-desc": "Evidence coverage",
    actions: "Action count"
  }[sort] || "Manifest order";
}

function getComponentInventorySortComparator(sort = "manifest") {
  const riskOrder = { p0: 0, p1: 1, p2: 2, clear: 3 };
  const fallback = (a, b) => Number(a.card.dataset.ifInventoryOrder || 0) - Number(b.card.dataset.ifInventoryOrder || 0);
  const byTitle = (a, b) => a.data.title.localeCompare(b.data.title) || fallback(a, b);
  if (sort === "title") return byTitle;
  if (sort === "category") return (a, b) => a.data.category.localeCompare(b.data.category) || byTitle(a, b);
  if (sort === "readiness") return (a, b) => Number(a.data.status.toLowerCase() === "ready") - Number(b.data.status.toLowerCase() === "ready") || byTitle(a, b);
  if (sort === "risk") return (a, b) => (riskOrder[a.data.riskPriority] ?? 4) - (riskOrder[b.data.riskPriority] ?? 4) || byTitle(a, b);
  if (sort === "evidence-asc") return (a, b) => (a.data.evidence?.score || 0) - (b.data.evidence?.score || 0) || byTitle(a, b);
  if (sort === "evidence-desc") return (a, b) => (b.data.evidence?.score || 0) - (a.data.evidence?.score || 0) || byTitle(a, b);
  if (sort === "actions") return (a, b) => getComponentInventoryReadinessActionLabels(b.data).length - getComponentInventoryReadinessActionLabels(a.data).length || byTitle(a, b);
  return fallback;
}

function sortComponentInventoryCards(inventory, sort = "manifest") {
  if (!inventory) return [];
  const pairs = getComponentInventoryCards(inventory).map((card, index) => {
    if (!card.dataset.ifInventoryOrder) card.dataset.ifInventoryOrder = String(index);
    return { card, data: getComponentInventoryCardData(card) };
  });
  pairs.sort(getComponentInventorySortComparator(sort));
  pairs.forEach(({ card }) => inventory.appendChild(card));
  return pairs.map(({ card }) => card);
}

function getComponentInventoryState(inventoryOrControl = null) {
  const inventory = getComponentInventory(inventoryOrControl);
  const cards = getComponentInventoryCards(inventory).map(getComponentInventoryCardData);
  const query = getComponentInventoryControlValue(inventory, "data-if-component-inventory-filter").toLowerCase();
  const category = getComponentInventoryControlValue(inventory, "data-if-component-inventory-category", "all");
  const capability = getComponentInventoryControlValue(inventory, "data-if-component-inventory-capability", "all");
  const status = getComponentInventoryControlValue(inventory, "data-if-component-inventory-status", "all");
  const risk = getComponentInventoryControlValue(inventory, "data-if-component-inventory-risk", "all");
  const sort = getComponentInventoryControlValue(inventory, "data-if-component-inventory-sort", "manifest") || "manifest";
  const preset = inventory?.dataset?.ifComponentInventoryPreset || "custom";
  const visible = cards.filter((card) => card.visible);
  const selected = visible.find((card) => card.selected) || visible[0] || cards.find((card) => card.selected) || cards[0] || null;
  const categories = Array.from(new Set(cards.map((card) => card.category))).sort();
  const statuses = Array.from(new Set(cards.map((card) => card.status))).sort();
  return {
    query,
    category,
    capability,
    status,
    risk,
    sort,
    preset,
    total: cards.length,
    visible: visible.length,
    hidden: Math.max(0, cards.length - visible.length),
    ready: cards.filter((card) => card.status.toLowerCase() === "ready").length,
    hardening: cards.filter((card) => card.status.toLowerCase() !== "ready").length,
    evidenceAverage: cards.length ? Math.round(cards.reduce((sum, card) => sum + (card.evidence?.score || 0), 0) / cards.length) : 0,
    lowEvidence: cards.filter((card) => (card.evidence?.score || 0) < 75).length,
    categories,
    statuses,
    selected,
    cards
  };
}

function getComponentInventoryReadinessActionLabels(card = {}) {
  const actions = [];
  if ((card.status || "").toLowerCase() !== "ready") actions.push("Close hardening status with QA evidence");
  (card.evidence?.missing || []).forEach((label) => {
    actions.push(`Add ${label.toLowerCase()} evidence`);
  });
  if (!card.docs?.length) actions.push("Link API or component documentation");
  if (!card.examples?.length) actions.push("Add a runnable example surface");
  if (!card.accessibility?.length) actions.push("Document accessibility behavior");
  return Array.from(new Set(actions)).slice(0, 4);
}

function getComponentInventoryCardRiskPriority(card = {}) {
  const actions = getComponentInventoryReadinessActionLabels(card);
  if (!actions.length) return "clear";
  if ((card.status || "").toLowerCase() !== "ready") return "p0";
  if ((card.evidence?.score || 0) < 75) return "p1";
  return "p2";
}

function getComponentInventoryReadinessActions(inventoryOrControl = null) {
  const state = getComponentInventoryState(inventoryOrControl);
  return state.cards
    .map((card) => {
      const actions = getComponentInventoryReadinessActionLabels(card);
      const evidenceScore = card.evidence?.score || 0;
      const priority = getComponentInventoryCardRiskPriority(card).toUpperCase();
      return {
        id: card.id,
        title: card.title,
        category: card.category,
        status: card.status,
        summary: card.summary,
        visible: card.visible,
        evidenceScore,
        missing: card.evidence?.missing || [],
        priority,
        actions
      };
    })
    .filter((item) => item.actions.length)
    .sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2 };
      return (priorityOrder[a.priority] - priorityOrder[b.priority]) || (a.evidenceScore - b.evidenceScore) || a.title.localeCompare(b.title);
    });
}

function getComponentInventoryEvidenceMatrix(inventoryOrControl = null) {
  const state = getComponentInventoryState(inventoryOrControl);
  const checks = new Map();
  state.cards.forEach((card) => {
    (card.evidence?.checks || []).forEach((check) => {
      if (!checks.has(check.id)) {
        checks.set(check.id, {
          id: check.id,
          label: check.label,
          total: 0,
          visible: 0,
          passed: 0,
          missing: 0,
          visiblePassed: 0,
          visibleMissing: 0,
          affected: []
        });
      }
      const item = checks.get(check.id);
      item.total += 1;
      if (card.visible) item.visible += 1;
      if (check.passed) {
        item.passed += 1;
        if (card.visible) item.visiblePassed += 1;
      } else {
        item.missing += 1;
        if (card.visible) item.visibleMissing += 1;
        item.affected.push({
          id: card.id,
          title: card.title,
          category: card.category,
          status: card.status,
          visible: card.visible
        });
      }
    });
  });
  const rows = Array.from(checks.values())
    .map((item) => ({
      ...item,
      percentage: item.total ? Math.round((item.passed / item.total) * 100) : 0,
      visiblePercentage: item.visible ? Math.round((item.visiblePassed / item.visible) * 100) : 0
    }))
    .sort((a, b) => (a.percentage - b.percentage) || a.label.localeCompare(b.label));
  return {
    inventory: getComponentInventory(inventoryOrControl),
    query: state.query,
    activeCategory: state.category,
    activeCapability: state.capability,
    activeStatus: state.status,
    activeRisk: state.risk,
    activeSort: state.sort,
    activePreset: state.preset,
    total: state.total,
    visible: state.visible,
    rows
  };
}

function getComponentInventoryCapabilityCoverage(inventoryOrControl = null) {
  const state = getComponentInventoryState(inventoryOrControl);
  const rows = getComponentInventoryCapabilityDefinitions().map((capability) => {
    const coveredCards = state.cards.filter(capability.test);
    const visibleCoveredCards = coveredCards.filter((card) => card.visible);
    const missingCards = state.cards.filter((card) => !capability.test(card));
    return {
      id: capability.id,
      label: capability.label,
      detail: capability.detail,
      total: state.total,
      visible: state.visible,
      covered: coveredCards.length,
      visibleCovered: visibleCoveredCards.length,
      missing: Math.max(0, state.total - coveredCards.length),
      visibleMissing: Math.max(0, state.visible - visibleCoveredCards.length),
      percentage: state.total ? Math.round((coveredCards.length / state.total) * 100) : 0,
      visiblePercentage: state.visible ? Math.round((visibleCoveredCards.length / state.visible) * 100) : 0,
      affected: missingCards.slice(0, 8).map((card) => ({
        id: card.id,
        title: card.title,
        category: card.category,
        visible: card.visible
      }))
    };
  }).sort((a, b) => (a.visiblePercentage - b.visiblePercentage) || (a.percentage - b.percentage) || a.label.localeCompare(b.label));
  return {
    inventory: getComponentInventory(inventoryOrControl),
    query: state.query,
    activeCategory: state.category,
    activeCapability: state.capability,
    activeStatus: state.status,
    activeRisk: state.risk,
    activeSort: state.sort,
    activePreset: state.preset,
    total: state.total,
    visible: state.visible,
    complete: rows.filter((row) => row.visibleMissing === 0).length,
    attention: rows.filter((row) => row.visibleMissing > 0).length,
    rows
  };
}

function getComponentInventoryReadinessReport(inventoryOrControl = null) {
  const state = getComponentInventoryState(inventoryOrControl);
  const actions = getComponentInventoryReadinessActions(inventoryOrControl);
  const evidenceMatrix = getComponentInventoryEvidenceMatrix(inventoryOrControl);
  const capabilityCoverage = getComponentInventoryCapabilityCoverage(inventoryOrControl);
  const actionIds = new Set(actions.map((action) => action.id));
  const categoryMap = new Map();
  state.cards.forEach((card) => {
    const key = card.category || "Uncategorized";
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        category: key,
        total: 0,
        visible: 0,
        ready: 0,
        hardening: 0,
        evidenceTotal: 0,
        apis: 0,
        events: 0,
        docs: 0,
        examples: 0,
        actionCount: 0,
        lowEvidence: 0
      });
    }
    const item = categoryMap.get(key);
    item.total += 1;
    if (card.visible) item.visible += 1;
    if (card.status.toLowerCase() === "ready") item.ready += 1;
    else item.hardening += 1;
    item.evidenceTotal += card.evidence?.score || 0;
    item.apis += card.jsApis?.length || 0;
    item.events += card.events?.length || 0;
    item.docs += card.docs?.length || 0;
    item.examples += card.examples?.length || 0;
    if (actionIds.has(card.id)) item.actionCount += 1;
    if ((card.evidence?.score || 0) < 75) item.lowEvidence += 1;
  });
  const categories = Array.from(categoryMap.values())
    .map((item) => ({
      category: item.category,
      total: item.total,
      visible: item.visible,
      ready: item.ready,
      hardening: item.hardening,
      lowEvidence: item.lowEvidence,
      apiCount: item.apis,
      eventCount: item.events,
      docsCount: item.docs,
      exampleCount: item.examples,
      actionCount: item.actionCount,
      evidenceAverage: item.total ? Math.round(item.evidenceTotal / item.total) : 0
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
  return {
    inventory: getComponentInventory(inventoryOrControl),
    query: state.query,
    activeCategory: state.category,
    activeCapability: state.capability,
    activeStatus: state.status,
    activeRisk: state.risk,
    overall: {
      total: state.total,
      visible: state.visible,
      hidden: state.hidden,
      ready: state.ready,
      hardening: state.hardening,
      evidenceAverage: state.evidenceAverage,
      lowEvidence: state.lowEvidence,
      actionCount: actions.length
    },
    categories,
    actions,
    evidenceMatrix,
    capabilityCoverage
  };
}

function getComponentInventoryDeficiencyAssessment(inventoryOrControl = null) {
  const inventory = getComponentInventory(inventoryOrControl);
  const state = getComponentInventoryState(inventoryOrControl);
  const actions = getComponentInventoryReadinessActions(inventoryOrControl);
  const actionMap = new Map(actions.map((item) => [item.id, item]));
  const capabilities = getComponentInventoryCapabilityDefinitions();
  const capabilityCoverage = getComponentInventoryCapabilityCoverage(inventoryOrControl);
  const backlog = getComponentInventoryDeficiencyBacklog(inventory);
  const riskWeight = { p0: 100, p1: 70, p2: 40, clear: 0 };
  const visibleCards = state.cards.filter((card) => card.visible);
  const assessedCards = (visibleCards.length ? visibleCards : state.cards).map((card) => {
    const missingCapabilities = capabilities.filter((capability) => !capability.test(card)).map((capability) => ({
      id: capability.id,
      label: capability.label
    }));
    const action = actionMap.get(card.id);
    const actionsForCard = action?.actions || getComponentInventoryReadinessActionLabels(card);
    const evidenceScore = card.evidence?.score || 0;
    const priority = getComponentInventoryCardRiskPriority(card);
    const deficiencyScore = Math.min(100, Math.round(
      (riskWeight[priority] || 0)
      + Math.min(20, actionsForCard.length * 6)
      + Math.min(18, missingCapabilities.length * 3)
      + Math.max(0, 100 - evidenceScore) * 0.25
    ));
    return {
      id: card.id,
      title: card.title,
      category: card.category,
      status: card.status,
      visible: card.visible,
      evidenceScore,
      priority: priority.toUpperCase(),
      deficiencyScore,
      actions: actionsForCard,
      missingEvidence: card.evidence?.missing || [],
      missingCapabilities
    };
  }).sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, CLEAR: 3 };
    return (priorityOrder[a.priority] - priorityOrder[b.priority])
      || (b.deficiencyScore - a.deficiencyScore)
      || (b.missingCapabilities.length - a.missingCapabilities.length)
      || (a.evidenceScore - b.evidenceScore)
      || a.title.localeCompare(b.title);
  });
  const topDeficiencies = assessedCards.filter((card) => card.deficiencyScore > 0 || card.priority !== "CLEAR").slice(0, 5);
  const weakCapabilities = capabilityCoverage.rows.filter((row) => row.visibleMissing > 0).slice(0, 5);
  const focus = [];
  const p0 = topDeficiencies.filter((card) => card.priority === "P0");
  const p1 = topDeficiencies.filter((card) => card.priority === "P1");
  const backlogOpen = backlog?.openItems || [];
  const backlogP0 = backlog?.priorityCounts?.p0 || 0;
  const backlogP1 = backlog?.priorityCounts?.p1 || 0;
  const closedGates = backlog?.closedItems || [];
  if (p0.length) focus.push(`Resolve ${p0.length} visible P0 readiness blocker${p0.length === 1 ? "" : "s"} first.`);
  if (!p0.length && p1.length) focus.push(`Close ${p1.length} visible P1 evidence risk${p1.length === 1 ? "" : "s"} next.`);
  if (!p0.length && !p1.length && backlogOpen.length) {
    const backlogVerb = backlogOpen.length === 1 ? "remains" : "remain";
    focus.push(`Component manifest coverage is clear; ${backlogOpen.length} package-level shipping item${backlogOpen.length === 1 ? "" : "s"} ${backlogVerb}${backlogP0 ? `, including ${backlogP0} P0` : backlogP1 ? `, including ${backlogP1} P1` : ""}.`);
  }
  if (weakCapabilities[0]) {
    const weakCapabilityLabel = weakCapabilities[0].label;
    const weakCapabilityVerb = /s$/i.test(weakCapabilityLabel) ? "are" : "is";
    focus.push(`${weakCapabilityLabel} ${weakCapabilityVerb} the weakest capability lens with ${weakCapabilities[0].visibleMissing} visible gap${weakCapabilities[0].visibleMissing === 1 ? "" : "s"}.`);
  }
  if (closedGates.length) focus.push(`Recently closed gates: ${closedGates.slice(0, 2).map((item) => item.id || item.title).join(", ")}${closedGates.length > 2 ? ` +${closedGates.length - 2} more` : ""}.`);
  if (!focus.length) focus.push("No visible component or package deficiencies are detected in the current inventory view.");
  return {
    inventory,
    activeFilters: {
      query: state.query,
      category: state.category,
      capability: state.capability,
      status: state.status,
      risk: state.risk,
      sort: state.sort,
      preset: state.preset
    },
    totals: {
      total: state.total,
      visible: state.visible,
      assessed: assessedCards.length,
      deficient: assessedCards.filter((card) => card.deficiencyScore > 0 || card.priority !== "CLEAR").length,
      p0: assessedCards.filter((card) => card.priority === "P0").length,
      p1: assessedCards.filter((card) => card.priority === "P1").length,
      p2: assessedCards.filter((card) => card.priority === "P2").length,
      weakCapabilities: weakCapabilities.length,
      backlogOpen: backlogOpen.length,
      backlogP0,
      backlogP1,
      backlogP2: backlog?.priorityCounts?.p2 || 0,
      closedGates: closedGates.length
    },
    backlog,
    topDeficiencies,
    weakCapabilities,
    focus
  };
}

function getComponentInventoryReleaseGate(inventoryOrControl = null) {
  const report = getComponentInventoryReadinessReport(inventoryOrControl);
  const p0Actions = report.actions.filter((item) => item.priority === "P0");
  const p1Actions = report.actions.filter((item) => item.priority === "P1");
  const missingEvidence = report.evidenceMatrix.rows.filter((item) => item.missing > 0);
  const blockers = [
    ...p0Actions.map((item) => `${item.title}: ${item.actions[0] || "Resolve P0 readiness action"}`),
    ...missingEvidence.filter((item) => item.percentage < 95).map((item) => `${item.label}: ${item.missing} missing`),
    ...(report.overall.lowEvidence ? [`${report.overall.lowEvidence} component families below 75% evidence`] : [])
  ];
  const recommendations = [
    p0Actions.length ? "Resolve P0 hardening items before release." : "",
    p1Actions.length ? "Clear P1 evidence gaps or document accepted risk." : "",
    missingEvidence.length ? "Close incomplete evidence lenses in the manifest." : "",
    report.overall.evidenceAverage < 95 ? "Raise average evidence coverage to at least 95%." : ""
  ].filter(Boolean);
  const status = blockers.length ? "Blocked" : report.actions.length ? "Attention" : "Ready";
  return {
    status,
    label: status === "Ready" ? "Release ready" : status === "Attention" ? "Release attention" : "Release blocked",
    totals: report.overall,
    blockerCount: blockers.length,
    recommendationCount: recommendations.length,
    blockers,
    recommendations: recommendations.length ? recommendations : ["Maintain current evidence and manifest coverage."],
    p0Actions: p0Actions.length,
    p1Actions: p1Actions.length,
    missingEvidenceLenses: missingEvidence.length
  };
}

function getComponentInventoryReadinessScorecard(inventoryOrControl = null) {
  const report = getComponentInventoryReadinessReport(inventoryOrControl);
  const gate = getComponentInventoryReleaseGate(inventoryOrControl);
  const riskRegister = getComponentInventoryRiskRegister(inventoryOrControl);
  const total = report.overall.total || 0;
  const readyPercent = total ? Math.round((report.overall.ready / total) * 100) : 0;
  const clearPercent = total ? Math.round(((total - report.overall.actionCount) / total) * 100) : 0;
  const gateBonus = gate.status === "Ready" ? 10 : gate.status === "Attention" ? 5 : 0;
  const score = Math.min(100, Math.max(0, Math.round((readyPercent * 0.35) + (report.overall.evidenceAverage * 0.35) + (clearPercent * 0.2) + gateBonus)));
  const label = score >= 95 && gate.status === "Ready" ? "Production ready" : score >= 90 ? "Release attention" : "Hardening needed";
  return {
    inventory: report.inventory,
    score,
    label,
    gateStatus: gate.status,
    activeFilters: {
      query: report.query,
      category: report.activeCategory,
      capability: report.activeCapability,
      status: report.activeStatus,
      risk: report.activeRisk,
      sort: report.activeSort,
      preset: report.activePreset
    },
    metrics: [
      { id: "ready", label: "Production-ready families", value: `${report.overall.ready}/${total}`, detail: `${readyPercent}% ready`, tone: report.overall.hardening ? "warning" : "success" },
      { id: "evidence", label: "Evidence coverage", value: `${report.overall.evidenceAverage}%`, detail: `${report.overall.lowEvidence} low-evidence families`, tone: report.overall.lowEvidence ? "warning" : "success" },
      { id: "risk", label: "Risk debt", value: `${report.overall.actionCount}`, detail: `${riskRegister.p0} P0 / ${riskRegister.p1} P1 / ${riskRegister.p2} P2`, tone: riskRegister.p0 ? "danger" : report.overall.actionCount ? "warning" : "success" },
      { id: "visible", label: "Visible context", value: `${report.overall.visible}/${total}`, detail: report.query || report.activeCategory !== "all" || report.activeStatus !== "all" || report.activeRisk !== "all" ? "Filtered view" : "Full inventory", tone: "neutral" }
    ]
  };
}

function getComponentInventoryRiskRegister(inventoryOrControl = null) {
  const actions = getComponentInventoryReadinessActions(inventoryOrControl);
  const priorities = [
    { priority: "P0", label: "Release blockers" },
    { priority: "P1", label: "Evidence risks" },
    { priority: "P2", label: "Readiness polish" }
  ];
  const groups = priorities.map((group) => {
    const items = actions.filter((item) => item.priority === group.priority);
    return {
      ...group,
      count: items.length,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        evidenceScore: item.evidenceScore,
        actions: item.actions
      }))
    };
  });
  const categoryMap = new Map();
  actions.forEach((item) => {
    const key = item.category || "Uncategorized";
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { category: key, total: 0, p0: 0, p1: 0, p2: 0 });
    }
    const category = categoryMap.get(key);
    category.total += 1;
    category[item.priority.toLowerCase()] += 1;
  });
  return {
    total: actions.length,
    p0: groups.find((group) => group.priority === "P0")?.count || 0,
    p1: groups.find((group) => group.priority === "P1")?.count || 0,
    p2: groups.find((group) => group.priority === "P2")?.count || 0,
    groups,
    categories: Array.from(categoryMap.values()).sort((a, b) => (b.total - a.total) || a.category.localeCompare(b.category))
  };
}

function getComponentInventoryReadinessSnapshot(inventoryOrControl = null) {
  const state = getComponentInventoryState(inventoryOrControl);
  const report = getComponentInventoryReadinessReport(inventoryOrControl);
  const releaseGate = getComponentInventoryReleaseGate(inventoryOrControl);
  const riskRegister = getComponentInventoryRiskRegister(inventoryOrControl);
  const capabilityCoverage = getComponentInventoryCapabilityCoverage(inventoryOrControl);
  const deficiencyAssessment = getComponentInventoryDeficiencyAssessment(inventoryOrControl);
  return {
    releaseGate,
    riskRegister,
    deficiencyAssessment: {
      activeFilters: deficiencyAssessment.activeFilters,
      totals: deficiencyAssessment.totals,
      backlog: deficiencyAssessment.backlog,
      topDeficiencies: deficiencyAssessment.topDeficiencies,
      weakCapabilities: deficiencyAssessment.weakCapabilities,
      focus: deficiencyAssessment.focus
    },
    filters: {
      query: state.query,
      category: state.category,
      capability: state.capability,
      status: state.status,
      risk: state.risk,
      sort: state.sort,
      preset: state.preset
    },
    totals: report.overall,
    categories: report.categories.map((category) => ({
      category: category.category,
      total: category.total,
      visible: category.visible,
      ready: category.ready,
      hardening: category.hardening,
      evidenceAverage: category.evidenceAverage,
      actionCount: category.actionCount
    })),
    evidence: report.evidenceMatrix.rows.map((item) => ({
      id: item.id,
      label: item.label,
      complete: item.passed,
      total: item.total,
      missing: item.missing,
      percentage: item.percentage,
      affected: item.affected.map((card) => card.id)
    })),
    capabilities: capabilityCoverage.rows.map((item) => ({
      id: item.id,
      label: item.label,
      covered: item.covered,
      total: item.total,
      missing: item.missing,
      percentage: item.percentage,
      visibleCovered: item.visibleCovered,
      visible: item.visible,
      visibleMissing: item.visibleMissing,
      visiblePercentage: item.visiblePercentage,
      affected: item.affected.map((card) => card.id)
    })),
    actions: report.actions.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      priority: item.priority,
      evidenceScore: item.evidenceScore,
      actions: item.actions
    })),
    components: state.cards.map((card) => ({
      id: card.id,
      title: card.title,
      category: card.category,
      status: card.status,
      visible: card.visible,
      evidenceScore: card.evidence?.score || 0,
      riskPriority: card.riskPriority,
      missing: card.evidence?.missing || [],
      actions: getComponentInventoryReadinessActionLabels(card),
      contractCounts: {
        classes: card.primaryClasses.length,
        attributes: card.dataAttributes.length,
        apis: card.jsApis.length,
        events: card.events.length,
        docs: card.docs.length,
        examples: card.examples.length,
        accessibility: card.accessibility.length,
        recipes: card.recipes.length
      }
    }))
  };
}

function getComponentInventoryViewState(inventoryOrControl = null) {
  const inventory = getComponentInventory(inventoryOrControl);
  const state = getComponentInventoryState(inventory);
  return {
    filters: getComponentInventoryFilterValues(inventory),
    preset: state.preset,
    selectedId: state.selected?.id || "",
    visibleIds: getVisibleComponentInventoryCards(inventory).map((card) => card.dataset.ifInventoryId || "").filter(Boolean),
    totals: {
      total: state.total,
      visible: state.visible,
      hidden: state.hidden
    }
  };
}

function applyComponentInventoryViewState(inventoryOrControl = null, viewState = {}) {
  const inventory = getComponentInventory(inventoryOrControl);
  if (!inventory) return null;
  const filters = viewState.filters || viewState;
  applyComponentInventoryPresetValues(inventory, filters);
  const state = applyComponentInventoryFilters(inventory);
  if (viewState.selectedId) {
    const card = getComponentInventoryCard(inventory, viewState.selectedId);
    if (card && !card.hidden) selectComponentInventoryCard(card);
  }
  return state;
}

function renderComponentInventoryReadinessReport(report, inventory = null) {
  if (!report.categories.length) return `<p>No component families are available for readiness reporting.</p>`;
  const inventorySelector = inventory?.id ? `#${inventory.id}` : "";
  return `
    <div class="if-component-inventory-report__summary">
      <span>${report.overall.visible}/${report.overall.total} visible</span>
      <span>${report.overall.evidenceAverage}% avg evidence</span>
      <span>${report.overall.lowEvidence} gaps</span>
      <span>${report.overall.actionCount} actions</span>
    </div>
    <div class="if-component-inventory-report__rows" role="list">
      ${report.categories.map((category) => `
        <article class="if-component-inventory-report__row" role="listitem">
          <div>
            <strong>${escapeHtml(category.category)}</strong>
            <span>${category.visible}/${category.total} visible / ${category.ready} ready / ${category.hardening} hardening</span>
            <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-component-inventory-category-set="${escapeHtml(inventorySelector)}" data-if-component-inventory-category-value="${escapeHtml(category.category)}">View</button>
          </div>
          <div class="if-component-inventory-report__meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${category.evidenceAverage}" aria-label="${escapeHtml(category.category)} evidence coverage">
            <span style="--if-component-report-score: ${category.evidenceAverage}%"></span>
          </div>
          <div class="if-component-inventory-report__meta">
            <span>${category.evidenceAverage}% evidence</span>
            <span>${category.actionCount} actions</span>
            <span>${category.apiCount} APIs</span>
            <span>${category.eventCount} events</span>
            <span>${category.docsCount} docs</span>
            <span>${category.exampleCount} examples</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderComponentInventoryReadinessSnapshot(snapshot) {
  return `
    <div class="if-component-inventory-snapshot__header">
      <span class="if-customization-label">Readiness snapshot</span>
      <strong>${snapshot.totals.visible}/${snapshot.totals.total} visible</strong>
    </div>
    <pre><code>${escapeHtml(JSON.stringify(snapshot, null, 2))}</code></pre>
  `;
}

function renderComponentInventoryViewState(viewState) {
  return `
    <div class="if-component-inventory-view-state__header">
      <span class="if-customization-label">View state</span>
      <strong>${viewState.totals.visible}/${viewState.totals.total} visible</strong>
    </div>
    <pre><code>${escapeHtml(JSON.stringify(viewState, null, 2))}</code></pre>
  `;
}

function renderComponentInventoryCapabilityCoverage(coverage) {
  if (!coverage.rows.length) return `<p>No capability coverage rows are available for this inventory.</p>`;
  const inventorySelector = coverage.inventory?.id ? `#${coverage.inventory.id}` : "";
  return `
    <div class="if-component-inventory-capability-coverage__header">
      <span class="if-customization-label">Capability coverage</span>
      <strong>${coverage.complete}/${coverage.rows.length} complete</strong>
    </div>
    <div class="if-component-inventory-capability-coverage__rows" role="list">
      ${coverage.rows.map((item) => `
        <article class="if-component-inventory-capability-coverage__row" role="listitem" data-if-capability-coverage="${escapeHtml(item.id)}">
          <div>
            <strong>${escapeHtml(item.label)}</strong>
            <span>${item.visibleCovered}/${item.visible} visible / ${item.covered}/${item.total} total</span>
          </div>
          <div class="if-component-inventory-capability-coverage__meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.visiblePercentage}" aria-label="${escapeHtml(item.label)} visible capability coverage">
            <span style="--if-component-capability-score: ${item.visiblePercentage}%"></span>
          </div>
          <p>${escapeHtml(item.detail)} ${item.visibleMissing ? `${item.visibleMissing} visible gap${item.visibleMissing === 1 ? "" : "s"}.` : "Visible context covered."}</p>
          ${item.visibleMissing ? `<button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-component-inventory-capability-set="${escapeHtml(inventorySelector)}" data-if-component-inventory-capability-value="${escapeHtml(item.id)}">View gaps</button>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function renderComponentInventoryDeficiencyAssessment(assessment, inventory = null) {
  const inventorySelector = inventory?.id ? `#${inventory.id}` : "";
  if (isComponentInventoryManifestPending(inventory)) {
    return `
      <div class="if-component-inventory-deficiency__header">
        <span class="if-customization-label">Deficiency assessment</span>
        <strong>Manifest evidence loading</strong>
      </div>
      <div class="if-component-inventory-deficiency__summary">
        <span>Component metadata pending</span>
        <span>Backlog queued</span>
        <span>Capability lenses paused</span>
      </div>
      <div class="if-component-inventory-deficiency__focus">
        <p>Waiting for <code>${escapeHtml(getComponentInventoryManifestSource(inventory))}</code> before scoring component evidence.</p>
      </div>
    `;
  }
  const hasDeficiencies = assessment.topDeficiencies.length > 0;
  const backlog = assessment.backlog;
  const backlogOpen = backlog?.openItems || [];
  const closedGates = backlog?.closedItems || [];
  const componentIssueLabel = `${assessment.totals.deficient} component issue${assessment.totals.deficient === 1 ? "" : "s"}`;
  const backlogLabel = backlogOpen.length ? `${backlogOpen.length} backlog item${backlogOpen.length === 1 ? "" : "s"}` : "backlog clear";
  const weakLensLabel = `${assessment.totals.weakCapabilities} weak lens${assessment.totals.weakCapabilities === 1 ? "" : "es"}`;
  const closedGateLabel = `${assessment.totals.closedGates} closed gate${assessment.totals.closedGates === 1 ? "" : "s"}`;
  return `
    <div class="if-component-inventory-deficiency__header">
      <span class="if-customization-label">Deficiency assessment</span>
      <strong>${escapeHtml(componentIssueLabel)} / ${escapeHtml(backlogLabel)}</strong>
    </div>
    <div class="if-component-inventory-deficiency__summary">
      <span>${assessment.totals.p0} component P0</span>
      <span>${assessment.totals.p1} component P1</span>
      <span>${assessment.totals.backlogP0} backlog P0</span>
      <span>${assessment.totals.backlogP1 + assessment.totals.backlogP2} backlog P1/P2</span>
      <span>${escapeHtml(weakLensLabel)}</span>
      <span>${escapeHtml(closedGateLabel)}</span>
    </div>
    <div class="if-component-inventory-deficiency__focus">
      ${assessment.focus.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
    </div>
    <div class="if-component-inventory-deficiency__list" role="list" aria-label="Most deficient visible component families">
      ${(hasDeficiencies ? assessment.topDeficiencies : [{ title: "Current view is clear", category: "No component issues", evidenceScore: 100, priority: "CLEAR", deficiencyScore: 0, actions: ["No visible readiness actions or capability gaps."], missingCapabilities: [] }]).map((item) => `
        <article class="if-component-inventory-deficiency__item" role="listitem" data-if-deficiency-priority="${escapeHtml(item.priority.toLowerCase())}">
          <div>
            <span class="if-badge ${item.priority === "P0" ? "if-badge--risk-high" : item.priority === "P1" ? "if-badge--status-in-review" : item.priority === "P2" ? "if-badge--confidence-medium" : "if-badge--status-approved"}">${escapeHtml(item.priority)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <em>${escapeHtml(item.category)} / ${item.evidenceScore}% evidence / ${item.deficiencyScore} debt</em>
            ${item.id ? `<button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-component-inventory-select="${escapeHtml(inventorySelector)}" data-if-component-inventory-select-id="${escapeHtml(item.id)}">Select</button>` : ""}
          </div>
          <p>${escapeHtml(item.actions?.[0] || item.missingCapabilities?.[0]?.label || "No action queued.")}</p>
          ${item.missingCapabilities?.length ? `<small>Missing: ${escapeHtml(item.missingCapabilities.slice(0, 3).map((capability) => capability.label).join(", "))}${item.missingCapabilities.length > 3 ? ` +${item.missingCapabilities.length - 3} more` : ""}</small>` : ""}
        </article>
      `).join("")}
    </div>
    ${backlogOpen.length ? `
      <div class="if-component-inventory-deficiency__backlog" role="list" aria-label="Package-level deficiency backlog">
        ${backlogOpen.slice(0, 5).map((item) => `
          <article class="if-component-inventory-deficiency__item" role="listitem" data-if-deficiency-priority="${escapeHtml(item.priority.toLowerCase())}">
            <div>
              <span class="if-badge ${item.priority === "P0" ? "if-badge--risk-high" : item.priority === "P1" ? "if-badge--status-in-review" : "if-badge--confidence-medium"}">${escapeHtml(item.priority)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <em>${escapeHtml(item.category)} / ${escapeHtml(item.status)}${item.id ? ` / ${escapeHtml(item.id)}` : ""}</em>
            </div>
            <p>${escapeHtml(item.action)}</p>
            ${item.evidence.length ? `<small>Evidence: ${item.evidence.slice(0, 3).map((entry) => `<code>${escapeHtml(entry)}</code>`).join(" ")}${item.evidence.length > 3 ? ` +${item.evidence.length - 3} more` : ""}</small>` : ""}
          </article>
        `).join("")}
      </div>
    ` : ""}
    ${closedGates.length ? `
      <div class="if-component-inventory-deficiency__closed" role="list" aria-label="Recently closed readiness gates">
        ${closedGates.slice(0, 4).map((item) => `
          <article role="listitem">
            <span class="if-badge if-badge--status-approved">Closed</span>
            <div><strong>${escapeHtml(item.id || item.title)}</strong><p>${escapeHtml(item.closed || item.title)}</p></div>
            ${item.evidence.length ? `<code>${escapeHtml(item.evidence[0])}</code>` : ""}
          </article>
        `).join("")}
      </div>
    ` : ""}
    <div class="if-component-inventory-deficiency__capabilities" role="list" aria-label="Weakest capability lenses">
      ${assessment.weakCapabilities.slice(0, 3).map((item) => `
        <article role="listitem">
          <div><strong>${escapeHtml(item.label)}</strong><span>${item.visibleMissing} visible gap${item.visibleMissing === 1 ? "" : "s"}</span></div>
          <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-component-inventory-capability-set="${escapeHtml(inventorySelector)}" data-if-component-inventory-capability-value="${escapeHtml(item.id)}">View gaps</button>
        </article>
      `).join("") || `<p>No weak capability lenses in the current view.</p>`}
    </div>
  `;
}

function renderComponentInventoryReadinessScorecard(scorecard) {
  return `
    <div class="if-component-inventory-scorecard__header">
      <span class="if-customization-label">Readiness scorecard</span>
      <strong>${scorecard.score}%</strong>
      <em>${escapeHtml(scorecard.label)} / ${escapeHtml(scorecard.gateStatus)}</em>
    </div>
    <div class="if-component-inventory-scorecard__meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${scorecard.score}" aria-label="Component inventory readiness score">
      <span style="--if-component-scorecard-score: ${scorecard.score}%"></span>
    </div>
    <div class="if-component-inventory-scorecard__grid">
      ${scorecard.metrics.map((metric) => `
        <article data-if-scorecard-tone="${escapeHtml(metric.tone)}">
          <span>${escapeHtml(metric.label)}</span>
          <strong>${escapeHtml(metric.value)}</strong>
          <em>${escapeHtml(metric.detail)}</em>
        </article>
      `).join("")}
    </div>
  `;
}

function renderComponentInventoryReleaseGate(gate) {
  return `
    <div class="if-component-inventory-release-gate__header">
      <span class="if-customization-label">Release gate</span>
      <strong>${escapeHtml(gate.label)}</strong>
    </div>
    <div class="if-component-inventory-release-gate__meter" data-if-release-gate-status="${escapeHtml(gate.status.toLowerCase())}">
      <span>${escapeHtml(gate.status)}</span>
      <em>${gate.totals.ready}/${gate.totals.total} ready / ${gate.totals.actionCount} actions</em>
    </div>
    <div class="if-component-inventory-release-gate__lists">
      <div><strong>Blockers</strong><ul>${(gate.blockers.length ? gate.blockers : ["No release blockers detected."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <div><strong>Next moves</strong><ul>${gate.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </div>
  `;
}

function renderComponentInventoryRiskRegister(register, inventory = null) {
  const inventorySelector = inventory?.id ? `#${inventory.id}` : "";
  return `
    <div class="if-component-inventory-risk-register__header">
      <span class="if-customization-label">Risk register</span>
      <strong>${register.total} risk${register.total === 1 ? "" : "s"}</strong>
    </div>
    <div class="if-component-inventory-risk-register__summary">
      <span>${register.p0} P0</span>
      <span>${register.p1} P1</span>
      <span>${register.p2} P2</span>
    </div>
    <div class="if-component-inventory-risk-register__groups" role="list">
      ${register.groups.map((group) => `
        <article class="if-component-inventory-risk-register__group" role="listitem" data-if-risk-priority="${escapeHtml(group.priority.toLowerCase())}">
          <div><strong>${escapeHtml(group.priority)}</strong><span>${escapeHtml(group.label)} / ${group.count}</span></div>
          <ul>
            ${(group.items.length ? group.items.slice(0, 4) : [{ title: "No items queued", category: "Clear", evidenceScore: 100, actions: ["No readiness risks detected."] }]).map((item) => `
              <li><span>${escapeHtml(item.title)}</span><em>${escapeHtml(item.category)} / ${item.evidenceScore}%</em><small>${escapeHtml(item.actions?.[0] || "")}</small>${item.id ? `<button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-component-inventory-select="${escapeHtml(inventorySelector)}" data-if-component-inventory-select-id="${escapeHtml(item.id)}">Select</button>` : ""}</li>
            `).join("")}
          </ul>
        </article>
      `).join("")}
    </div>
  `;
}

function renderComponentInventoryReadinessActions(actions = [], inventory = null) {
  if (!actions.length) return `<p>No readiness actions are currently queued.</p>`;
  const inventorySelector = inventory?.id ? `#${inventory.id}` : "";
  return `
    <div class="if-component-inventory-actions__header">
      <span class="if-customization-label">Readiness action queue</span>
      <strong>${actions.length} item${actions.length === 1 ? "" : "s"}</strong>
    </div>
    <div class="if-component-inventory-actions__list" role="list">
      ${actions.slice(0, 8).map((item) => `
        <article class="if-component-inventory-actions__item" role="listitem">
          <div>
            <span class="if-badge ${item.priority === "P0" ? "if-badge--risk-high" : item.priority === "P1" ? "if-badge--status-in-review" : "if-badge--confidence-medium"}">${escapeHtml(item.priority)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.category)} / ${escapeHtml(item.status)} / ${item.evidenceScore}% evidence</span>
            <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-component-inventory-select="${escapeHtml(inventorySelector)}" data-if-component-inventory-select-id="${escapeHtml(item.id)}">Select</button>
          </div>
          <ul>
            ${item.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("")}
          </ul>
        </article>
      `).join("")}
    </div>
  `;
}

function renderComponentInventoryEvidenceMatrix(matrix) {
  if (!matrix.rows.length) return `<p>No evidence lenses are available for this inventory.</p>`;
  return `
    <div class="if-component-inventory-evidence-matrix__header">
      <span class="if-customization-label">Evidence lens matrix</span>
      <strong>${matrix.visible}/${matrix.total} families</strong>
    </div>
    <div class="if-component-inventory-evidence-matrix__rows" role="list">
      ${matrix.rows.map((item) => `
        <article class="if-component-inventory-evidence-matrix__row" role="listitem">
          <div>
            <strong>${escapeHtml(item.label)}</strong>
            <span>${item.passed}/${item.total} complete / ${item.missing} missing</span>
          </div>
          <div class="if-component-inventory-evidence-matrix__meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.percentage}" aria-label="${escapeHtml(item.label)} evidence completeness">
            <span style="--if-component-evidence-matrix-score: ${item.percentage}%"></span>
          </div>
          <p>${item.missing ? `${item.affected.slice(0, 3).map((card) => escapeHtml(card.title)).join(", ")}${item.affected.length > 3 ? ` +${item.affected.length - 3} more` : ""}` : "No missing evidence for this lens."}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderComponentInventoryCardReadiness(data = {}) {
  const actions = getComponentInventoryReadinessActionLabels(data);
  const missing = data.evidence?.missing || [];
  const score = data.evidence?.score || 0;
  const status = (data.status || "").toLowerCase() === "ready" ? "Ready" : "Hardening";
  const riskLabel = data.riskPriority === "clear" ? "Clear" : data.riskPriority.toUpperCase();
  return `
    <div class="if-component-family-card__readiness-summary">
      <strong>${score}% evidence</strong>
      <span>${actions.length} action${actions.length === 1 ? "" : "s"}</span>
    </div>
    <div class="if-component-family-card__readiness-meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}" aria-label="${escapeHtml(data.title || "Component")} evidence readiness">
      <i style="--if-component-card-score: ${score}%"></i>
    </div>
    <div class="if-component-family-card__readiness-chips">
      <span>${escapeHtml(status)}</span>
      <span>${escapeHtml(riskLabel)}</span>
      <span>${missing.length ? `${missing.length} gaps` : "Complete"}</span>
      ${actions.length ? `<span>${escapeHtml(actions[0])}</span>` : ""}
    </div>
  `;
}

function updateComponentInventoryCardReadiness(inventory) {
  getComponentInventoryCards(inventory).forEach((card) => {
    const data = getComponentInventoryCardData(card);
    let target = qs("[data-if-component-inventory-card-readiness]", card);
    if (!target) {
      target = document.createElement("div");
      target.className = "if-component-family-card__readiness";
      target.setAttribute("data-if-component-inventory-card-readiness", "");
      const link = qs("a[href]", card);
      if (link) card.insertBefore(target, link);
      else card.appendChild(target);
    }
    target.innerHTML = renderComponentInventoryCardReadiness(data);
  });
}

function updateComponentInventoryReadinessReport(inventory, state = getComponentInventoryState(inventory)) {
  const scope = inventory?.closest?.("[data-if-component-inventory-scope]") || inventory?.parentElement || document;
  const report = getComponentInventoryReadinessReport(inventory);
  const deficiencyAssessment = getComponentInventoryDeficiencyAssessment(inventory);
  qsa("[data-if-component-inventory-report]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryReadinessReport(report, inventory);
  });
  qsa("[data-if-component-inventory-scorecard]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryReadinessScorecard(getComponentInventoryReadinessScorecard(inventory));
  });
  qsa("[data-if-component-inventory-release-gate]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryReleaseGate(getComponentInventoryReleaseGate(inventory));
  });
  qsa("[data-if-component-inventory-risk-register]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryRiskRegister(getComponentInventoryRiskRegister(inventory), inventory);
  });
  qsa("[data-if-component-inventory-actions]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryReadinessActions(report.actions, inventory);
  });
  qsa("[data-if-component-inventory-evidence-matrix]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryEvidenceMatrix(report.evidenceMatrix);
  });
  qsa("[data-if-component-inventory-capability-coverage]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryCapabilityCoverage(report.capabilityCoverage);
  });
  qsa("[data-if-component-inventory-deficiency-assessment]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryDeficiencyAssessment(deficiencyAssessment, inventory);
  });
  qsa("[data-if-component-inventory-snapshot]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryReadinessSnapshot(getComponentInventoryReadinessSnapshot(inventory));
  });
  qsa("[data-if-component-inventory-view-state]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryViewState(getComponentInventoryViewState(inventory));
  });
  dispatchFrameworkEvent(inventory, "if:component-inventory-deficiency", {
    inventory,
    assessment: deficiencyAssessment,
    totals: deficiencyAssessment.totals,
    focus: deficiencyAssessment.focus,
    topDeficiencies: deficiencyAssessment.topDeficiencies,
    weakCapabilities: deficiencyAssessment.weakCapabilities,
    backlog: deficiencyAssessment.backlog
  });
  return report;
}

function updateComponentInventoryOutputs(inventory, state) {
  const scope = inventory.closest("[data-if-component-inventory-scope]") || inventory.parentElement || document;
  qsa("[data-if-component-inventory-count]", scope).forEach((target) => {
    target.textContent = String(state.visible);
  });
  qsa("[data-if-component-inventory-total]", scope).forEach((target) => {
    target.textContent = String(state.total);
  });
  qsa("[data-if-component-inventory-ready]", scope).forEach((target) => {
    target.textContent = String(state.ready);
  });
  qsa("[data-if-component-inventory-hardening]", scope).forEach((target) => {
    target.textContent = String(state.hardening);
  });
  qsa("[data-if-component-inventory-evidence-average]", scope).forEach((target) => {
    target.textContent = `${state.evidenceAverage}%`;
  });
  qsa("[data-if-component-inventory-low-evidence]", scope).forEach((target) => {
    target.textContent = String(state.lowEvidence);
  });
  qsa("[data-if-component-inventory-active-filters]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryActiveFilters(state, inventory);
  });
  qsa("[data-if-component-inventory-status]", scope).filter((target) => !target.matches("select, input, textarea")).forEach((target) => {
    const filters = [
      state.query ? `query "${state.query}"` : "",
      state.category && state.category !== "all" ? state.category : "",
      state.capability && state.capability !== "all" ? `missing ${getComponentInventoryCapabilityDefinition(state.capability)?.label || state.capability}` : "",
      state.status && state.status !== "all" ? state.status : "",
      state.risk && state.risk !== "all" ? `risk ${state.risk}` : "",
      state.sort && state.sort !== "manifest" ? `sorted by ${getComponentInventorySortLabel(state.sort)}` : ""
    ].filter(Boolean).join(", ");
    target.textContent = filters ? `${state.visible} of ${state.total} families match ${filters}.` : `${state.total} component families shown.`;
  });
  qsa("[data-if-component-inventory-empty]", scope).forEach((target) => {
    target.hidden = state.visible > 0;
  });
  updateComponentInventoryCardReadiness(inventory);
  updateComponentInventoryReadinessReport(inventory, state);
  updateComponentInventoryDetail(inventory, state.selected);
}

function getComponentInventoryCard(inventoryOrControl, cardOrId = null) {
  const inventory = getComponentInventory(inventoryOrControl);
  if (!inventory) return null;
  if (cardOrId?.matches?.("[data-if-inventory-id]")) return cardOrId;
  const id = String(cardOrId || inventory.dataset.ifComponentInventorySelected || "").trim();
  if (id) {
    const match = getComponentInventoryCards(inventory).find((card) => card.dataset.ifInventoryId === id);
    if (match) return match;
  }
  return getComponentInventoryCards(inventory).find((card) => card.classList.contains("is-selected") || card.getAttribute("aria-selected") === "true")
    || getComponentInventoryCards(inventory).find((card) => !card.hidden)
    || getComponentInventoryCards(inventory)[0]
    || null;
}

function renderComponentInventoryTags(tags = []) {
  return tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
}

function renderComponentInventoryList(items = [], empty = "None listed") {
  const values = items.map((item) => String(item || "").trim()).filter(Boolean);
  if (!values.length) return `<span>${escapeHtml(empty)}</span>`;
  return values.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
}

function renderComponentInventoryEvidence(checks = []) {
  return checks.map((check) => `<span class="${check.passed ? "is-complete" : "is-missing"}">${escapeHtml(check.label)}</span>`).join("");
}

function getComponentInventoryActiveFilters(state = {}) {
  const capability = getComponentInventoryCapabilityDefinition(state.capability);
  return [
    state.query ? { id: "query", label: "Search", value: state.query } : null,
    state.category && state.category !== "all" ? { id: "category", label: "Category", value: state.category } : null,
    state.capability && state.capability !== "all" ? { id: "capability", label: "Capability gap", value: capability?.label || state.capability } : null,
    state.status && state.status !== "all" ? { id: "status", label: "Readiness", value: state.status } : null,
    state.risk && state.risk !== "all" ? { id: "risk", label: "Risk", value: state.risk.toUpperCase() } : null
  ].filter(Boolean);
}

function renderComponentInventoryActiveFilters(state = {}, inventory = null) {
  const filters = getComponentInventoryActiveFilters(state);
  if (!filters.length) return `<span>No active filters</span>`;
  const inventorySelector = inventory?.id ? `#${inventory.id}` : "";
  return filters.map((filter) => `
    <button class="if-component-inventory-filter-chip" type="button" data-if-component-inventory-clear-filter="${escapeHtml(inventorySelector)}" data-if-component-inventory-filter-key="${escapeHtml(filter.id)}">
      <span>${escapeHtml(filter.label)}</span>
      <strong>${escapeHtml(filter.value)}</strong>
      <em>Clear</em>
    </button>
  `).join("");
}

function setComponentInventoryMotionState(inventory, state = "idle", duration = 320) {
  if (!inventory || typeof window === "undefined") return;
  const existing = componentInventoryMotionTimers.get(inventory);
  if (existing) window.clearTimeout(existing);
  if (!state || state === "idle") {
    inventory.removeAttribute("data-if-component-inventory-motion");
    componentInventoryMotionTimers.delete(inventory);
    return;
  }
  inventory.setAttribute("data-if-component-inventory-motion", state);
  componentInventoryMotionTimers.set(inventory, window.setTimeout(() => {
    if (inventory.getAttribute("data-if-component-inventory-motion") === state) inventory.removeAttribute("data-if-component-inventory-motion");
    componentInventoryMotionTimers.delete(inventory);
  }, duration));
}

function pulseComponentInventorySelection(card, duration = 900) {
  if (!card || typeof window === "undefined") return;
  const existing = componentInventorySelectionTimers.get(card);
  if (existing) window.clearTimeout(existing);
  card.classList.remove("is-selection-pulse");
  card.offsetWidth;
  card.classList.add("is-selection-pulse");
  componentInventorySelectionTimers.set(card, window.setTimeout(() => {
    card.classList.remove("is-selection-pulse");
    componentInventorySelectionTimers.delete(card);
  }, duration));
}

function renderComponentInventorySelectedActions(data = {}) {
  const actions = getComponentInventoryReadinessActionLabels(data);
  if (!actions.length) {
    return `<span class="is-complete">No selected-component readiness actions queued.</span>`;
  }
  return actions.map((action) => `<span class="is-missing">${escapeHtml(action)}</span>`).join("");
}

function updateComponentInventoryDetail(inventory, selected) {
  const scope = inventory?.closest?.("[data-if-component-inventory-scope]") || inventory?.parentElement || document;
  const card = selected?.id ? getComponentInventoryCard(inventory, selected.id) : getComponentInventoryCard(inventory);
  const data = card ? getComponentInventoryCardData(card) : null;
  qsa("[data-if-component-inventory-detail]", scope).forEach((detail) => {
    detail.hidden = !data;
  });
  if (!data) return;
  qsa("[data-if-component-inventory-selected-id]", scope).forEach((target) => {
    target.textContent = data.id;
  });
  qsa("[data-if-component-inventory-selected-title]", scope).forEach((target) => {
    target.textContent = data.title;
  });
  qsa("[data-if-component-inventory-selected-category]", scope).forEach((target) => {
    target.textContent = data.category;
  });
  qsa("[data-if-component-inventory-selected-status]", scope).forEach((target) => {
    target.textContent = data.status;
  });
  qsa("[data-if-component-inventory-selected-summary]", scope).forEach((target) => {
    target.textContent = data.summary;
  });
  qsa("[data-if-component-inventory-selected-tags]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryTags(data.tags);
  });
  qsa("[data-if-component-inventory-selected-classes]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.primaryClasses);
  });
  qsa("[data-if-component-inventory-selected-attributes]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.dataAttributes);
  });
  qsa("[data-if-component-inventory-selected-apis]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.jsApis);
  });
  qsa("[data-if-component-inventory-selected-events]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.events);
  });
  qsa("[data-if-component-inventory-selected-docs]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.docs);
  });
  qsa("[data-if-component-inventory-selected-examples]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.examples);
  });
  qsa("[data-if-component-inventory-selected-a11y]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.accessibility, "No accessibility notes listed");
  });
  qsa("[data-if-component-inventory-selected-use]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.whenToUse, "No use guidance listed");
  });
  qsa("[data-if-component-inventory-selected-avoid]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.avoidWhen, "No avoid guidance listed");
  });
  qsa("[data-if-component-inventory-selected-recipes]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryList(data.recipes, "No recipes listed");
  });
  qsa("[data-if-component-inventory-selected-score]", scope).forEach((target) => {
    target.textContent = `${data.evidence.score}%`;
  });
  qsa("[data-if-component-inventory-selected-scorebar]", scope).forEach((target) => {
    target.style.setProperty("--if-component-evidence-score", `${data.evidence.score}%`);
    target.setAttribute("aria-valuenow", String(data.evidence.score));
  });
  qsa("[data-if-component-inventory-selected-evidence]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventoryEvidence(data.evidence.checks);
  });
  qsa("[data-if-component-inventory-selected-missing]", scope).forEach((target) => {
    target.textContent = data.evidence.missing.length ? data.evidence.missing.join(", ") : "No evidence gaps detected.";
  });
  qsa("[data-if-component-inventory-selected-actions]", scope).forEach((target) => {
    target.innerHTML = renderComponentInventorySelectedActions(data);
  });
  qsa("[data-if-component-inventory-selected-link]", scope).forEach((target) => {
    if (data.href) {
      target.hidden = false;
      target.setAttribute("href", data.href);
    } else {
      target.hidden = true;
      target.removeAttribute("href");
    }
  });
}

function selectComponentInventoryCard(inventoryOrCard, cardOrId = null, options = {}) {
  if (cardOrId && typeof cardOrId === "object" && !cardOrId.matches) {
    options = cardOrId;
    cardOrId = null;
  }
  const inventory = getComponentInventory(inventoryOrCard);
  if (!inventory) return null;
  const card = getComponentInventoryCard(
    inventory,
    inventoryOrCard?.matches?.("[data-if-inventory-id]")
      ? inventoryOrCard
      : cardOrId
        || inventoryOrCard?.dataset?.ifComponentInventorySelectId
        || (!String(inventoryOrCard?.dataset?.ifComponentInventorySelect || "").startsWith("#") ? inventoryOrCard?.dataset?.ifComponentInventorySelect : null)
  );
  if (!card) return null;
  getComponentInventoryCards(inventory).forEach((item) => {
    const active = item === card;
    item.classList.toggle("is-selected", active);
    item.setAttribute("aria-selected", String(active));
    item.setAttribute("tabindex", active ? "0" : "-1");
  });
  inventory.dataset.ifComponentInventorySelected = card.dataset.ifInventoryId || "";
  const state = getComponentInventoryState(inventory);
  updateComponentInventoryDetail(inventory, state.selected);
  if (options.emit !== false) {
    pulseComponentInventorySelection(card);
    dispatchFrameworkEvent(inventory, "if:component-inventory-select", { inventory, card, component: state.selected, state });
  }
  return state.selected;
}

function moveComponentInventorySelection(inventoryOrCard, direction = 1) {
  const inventory = getComponentInventory(inventoryOrCard);
  if (!inventory) return null;
  const cards = getVisibleComponentInventoryCards(inventory);
  if (!cards.length) return null;
  const current = inventoryOrCard?.matches?.("[data-if-inventory-id]")
    ? inventoryOrCard
    : getComponentInventoryCard(inventory);
  const currentIndex = Math.max(0, cards.indexOf(current));
  const nextIndex = direction === "first" ? 0
    : direction === "last" ? cards.length - 1
      : (currentIndex + direction + cards.length) % cards.length;
  const next = cards[nextIndex];
  const component = selectComponentInventoryCard(next);
  next.scrollIntoView({ block: "nearest", inline: "nearest" });
  next.focus({ preventScroll: true });
  return component;
}

function handleComponentInventoryKeydown(event, inventoryOrCard) {
  const inventory = getComponentInventory(inventoryOrCard);
  const card = event.target.closest("[data-if-inventory-id]");
  if (!card || !inventory) return false;
  if (event.target !== card && event.target.closest("a, button, input, select, textarea")) return false;
  if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End", "Enter", " "].includes(event.key)) return false;
  event.preventDefault();
  if (event.key === "ArrowDown" || event.key === "ArrowRight") moveComponentInventorySelection(card, 1);
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") moveComponentInventorySelection(card, -1);
  if (event.key === "Home") moveComponentInventorySelection(card, "first");
  if (event.key === "End") moveComponentInventorySelection(card, "last");
  if (event.key === "Enter" || event.key === " ") selectComponentInventoryCard(card);
  return true;
}

function applyComponentInventoryFilters(inventoryOrControl = null, options = {}) {
  const inventory = getComponentInventory(inventoryOrControl);
  if (!inventory) return null;
  const query = getComponentInventoryControlValue(inventory, "data-if-component-inventory-filter").toLowerCase();
  const category = getComponentInventoryControlValue(inventory, "data-if-component-inventory-category", "all").toLowerCase();
  const capability = getComponentInventoryControlValue(inventory, "data-if-component-inventory-capability", "all").toLowerCase();
  const capabilityDefinition = getComponentInventoryCapabilityDefinition(capability);
  const status = getComponentInventoryControlValue(inventory, "data-if-component-inventory-status", "all").toLowerCase();
  const risk = getComponentInventoryControlValue(inventory, "data-if-component-inventory-risk", "all").toLowerCase();
  const sort = getComponentInventoryControlValue(inventory, "data-if-component-inventory-sort", "manifest") || "manifest";
  if (options.emit !== false) setComponentInventoryMotionState(inventory, "filtering");
  getComponentInventoryCards(inventory).forEach((card) => {
    const data = getComponentInventoryCardData(card);
    card.dataset.ifInventoryRisk = data.riskPriority;
    const matchesQuery = !query || data.searchText.includes(query);
    const matchesCategory = category === "all" || data.category.toLowerCase() === category;
    const matchesCapability = capability === "all" || (capabilityDefinition ? !capabilityDefinition.test(data) : true);
    const matchesStatus = status === "all" || data.status.toLowerCase() === status;
    const matchesRisk = risk === "all" || data.riskPriority === risk;
    const visible = matchesQuery && matchesCategory && matchesCapability && matchesStatus && matchesRisk;
    card.hidden = !visible;
    card.classList.toggle("is-filtered-out", !visible);
  });
  sortComponentInventoryCards(inventory, sort);
  const selectedCard = getComponentInventoryCard(inventory);
  if (!selectedCard || selectedCard.hidden) {
    const firstVisible = getComponentInventoryCards(inventory).find((card) => !card.hidden);
    if (firstVisible) selectComponentInventoryCard(firstVisible, { emit: false });
  }
  syncComponentInventoryPresetControls(inventory);
  const state = getComponentInventoryState(inventory);
  updateComponentInventoryOutputs(inventory, state);
  if (options.emit !== false) dispatchFrameworkEvent(inventory, "if:component-inventory-filter", { inventory, state });
  return state;
}

function resetComponentInventoryFilters(control) {
  const inventory = getComponentInventory(control);
  if (!inventory) return null;
  applyComponentInventoryPresetValues(inventory, getComponentInventoryPresetDefinition("all").values);
  return applyComponentInventoryFilters(inventory);
}

function clearComponentInventoryFilter(control) {
  const inventory = getComponentInventory(control);
  if (!inventory) return null;
  const key = control?.dataset?.ifComponentInventoryFilterKey || "";
  const filterMap = {
    query: ["data-if-component-inventory-filter", ""],
    category: ["data-if-component-inventory-category", "all"],
    capability: ["data-if-component-inventory-capability", "all"],
    status: ["data-if-component-inventory-status", "all"],
    risk: ["data-if-component-inventory-risk", "all"]
  };
  const [attr, value] = filterMap[key] || [];
  if (!attr) return applyComponentInventoryFilters(inventory);
  getComponentInventoryControls(inventory, attr).forEach((item) => {
    item.value = value;
  });
  return applyComponentInventoryFilters(inventory);
}

function applyComponentInventoryPresetValues(inventory, values = {}) {
  setComponentInventoryControlValue(inventory, "data-if-component-inventory-filter", values.query || "");
  setComponentInventoryControlValue(inventory, "data-if-component-inventory-category", values.category || "all");
  setComponentInventoryControlValue(inventory, "data-if-component-inventory-capability", values.capability || "all");
  setComponentInventoryControlValue(inventory, "data-if-component-inventory-status", values.status || "all");
  setComponentInventoryControlValue(inventory, "data-if-component-inventory-risk", values.risk || "all");
  setComponentInventoryControlValue(inventory, "data-if-component-inventory-sort", values.sort || "manifest");
}

function applyComponentInventoryPreset(control) {
  const inventory = getComponentInventory(control);
  if (!inventory) return null;
  const id = control?.getAttribute?.("data-if-component-inventory-preset-value") || (!String(control?.dataset?.ifComponentInventoryPreset || "").startsWith("#") ? control?.dataset?.ifComponentInventoryPreset : "all");
  const preset = getComponentInventoryPresetDefinition(id) || getComponentInventoryPresetDefinition("all");
  applyComponentInventoryPresetValues(inventory, preset.values);
  return applyComponentInventoryFilters(inventory);
}

function setComponentInventoryCategoryFilter(control) {
  const inventory = getComponentInventory(control);
  if (!inventory) return null;
  const category = control?.dataset?.ifComponentInventoryCategoryValue || "all";
  getComponentInventoryControls(inventory, "data-if-component-inventory-category").forEach((item) => {
    item.value = category;
  });
  return applyComponentInventoryFilters(inventory);
}

function setComponentInventoryCapabilityFilter(control) {
  const inventory = getComponentInventory(control);
  if (!inventory) return null;
  const capability = control?.dataset?.ifComponentInventoryCapabilityValue || "all";
  getComponentInventoryControls(inventory, "data-if-component-inventory-capability").forEach((item) => {
    item.value = capability;
  });
  return applyComponentInventoryFilters(inventory);
}

function hydrateComponentInventories(root = document) {
  const inventories = root?.matches?.("[data-if-component-inventory]") ? [root, ...qsa("[data-if-component-inventory]", root)] : qsa("[data-if-component-inventory]", root);
  inventories.forEach((inventory) => {
    getComponentInventoryCards(inventory).forEach((card, index) => {
      const data = getComponentInventoryCardData(card);
      card.dataset.ifInventoryCategory = data.category;
      card.dataset.ifInventoryStatus = data.status;
      card.dataset.ifInventoryRisk = data.riskPriority;
      if (!card.dataset.ifInventoryOrder) card.dataset.ifInventoryOrder = String(index);
      if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
      if (!card.hasAttribute("role")) card.setAttribute("role", "option");
    });
    selectComponentInventoryCard(getComponentInventoryCard(inventory), { emit: false });
    applyComponentInventoryFilters(inventory, { emit: false });
    hydrateComponentInventoryManifest(inventory);
  });
}

function setChartDataset(control) {
  const target = qs(control.dataset.ifChartTarget || "");
  if (!target || !control.dataset.ifChartData) return;
  target.dataset.ifChartData = control.dataset.ifChartData;
  if (control.dataset.ifChartLabel) target.dataset.ifChartLabel = control.dataset.ifChartLabel;
  qsa(`[data-if-chart-target="${control.dataset.ifChartTarget}"][data-if-chart-dataset]`).forEach((item) => {
    setPressed(item, item === control);
  });
  hydrateCharts(target);
  qsa(`[data-if-chart-threshold][data-if-chart-target="${control.dataset.ifChartTarget}"]`).forEach(setChartThreshold);
  qsa(`[data-if-chart-height][data-if-chart-target="${control.dataset.ifChartTarget}"]`).forEach(setChartHeight);
  target.dispatchEvent(new CustomEvent("if:chart-dataset", {
    bubbles: true,
    detail: {
      control,
      label: target.dataset.ifChartLabel,
      data: target.dataset.ifChartData
    }
  }));
}

function getDataTable(control) {
  if (!control) return null;
  if (typeof control === "string") return qs(control);
  if (control.matches?.("[data-if-data-table]")) return control;
  const targetSelector = control.dataset?.ifTableTarget || control.dataset?.ifTableFilter;
  if (targetSelector && (targetSelector.startsWith("#") || targetSelector.startsWith("."))) return qs(targetSelector);
  return control.closest?.("[data-if-data-table]");
}

function getDataTableElement(table) {
  return qs("table", table);
}

function getDataTableBody(table) {
  const element = getDataTableElement(table);
  return element ? qs("tbody", element) : null;
}

function getDataTableHeaderCells(table) {
  const element = getDataTableElement(table);
  return element ? qsa("thead th", element) : [];
}

function getDataTablePairs(table) {
  return qsa("tbody tr[data-if-table-row]", table).map((row) => ({
    row,
    detail: row.nextElementSibling?.matches?.("[data-if-table-detail]") ? row.nextElementSibling : null
  }));
}

function getDataTableRows(table, scope = "visible") {
  const rows = qsa("tbody tr[data-if-table-row]", table);
  if (scope === "all") return rows;
  if (scope === "filtered") return rows.filter((row) => row.dataset.ifTableFiltered !== "false");
  return rows.filter((row) => !row.hidden);
}

function getDataTablePageSize(table) {
  const control = qs("[data-if-table-page-size]", table);
  const raw = control?.value || table.dataset.ifTablePageSize || "10";
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function isServerDataTable(table) {
  return Boolean(table?.dataset?.ifTableAdapter);
}

function isVirtualDataTable(table) {
  return table?.dataset?.ifTableVirtual === "true";
}

function getDataTableSearchText(row) {
  return row.dataset.ifTableSearch || row.textContent || "";
}

function getDataTableFieldValue(row, key) {
  const dataKey = `filter${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  if (row.dataset[dataKey] !== undefined) return row.dataset[dataKey];
  const cell = qs(`[data-if-table-cell="${key}"]`, row);
  return cell?.textContent?.trim() || "";
}

function getDataTableFilters(table) {
  const filters = new Map();
  qsa("[data-if-table-column-filter]", table).forEach((control) => {
    const key = control.dataset.ifTableColumnFilter;
    if (!key) return;
    const value = control.type === "checkbox"
      ? (control.checked ? control.value : "")
      : control.value;
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || normalized === "all" || normalized === "*") return;
    if (!filters.has(key)) filters.set(key, []);
    filters.get(key).push(normalized);
  });
  return filters;
}

function getDataTableFilterObject(table) {
  return Array.from(getDataTableFilters(table).entries()).reduce((next, [key, values]) => {
    next[key] = values;
    return next;
  }, {});
}

function rowMatchesDataTableFilters(row, filters) {
  if (!filters.size) return true;
  return Array.from(filters.entries()).every(([key, values]) => {
    const fieldValue = getDataTableFieldValue(row, key).toLowerCase();
    return values.some((value) => fieldValue === value || fieldValue.includes(value));
  });
}

function getDataTableSortState(table) {
  const active = qsa("[data-if-table-sort]", table).find((control) => ["ascending", "descending"].includes(control.getAttribute("aria-sort")));
  return active ? { key: active.dataset.ifTableSort, direction: active.getAttribute("aria-sort") } : null;
}

function renderDataTablePages(table, page, pages) {
  qsa("[data-if-table-pages]", table).forEach((target) => {
    const windowSize = 5;
    const start = Math.max(1, Math.min(page - 2, Math.max(1, pages - windowSize + 1)));
    const end = Math.min(pages, start + windowSize - 1);
    target.innerHTML = Array.from({ length: end - start + 1 }, (_, index) => {
      const value = start + index;
      return `<button class="if-page-btn${value === page ? " is-active" : ""}" type="button" data-if-table-page="${value}" ${value === page ? 'aria-current="page"' : ""}>${value}</button>`;
    }).join("");
  });
}

function ensureDataTableVirtualSpacers(table) {
  const body = getDataTableBody(table);
  if (!body) return {};
  let top = qs("[data-if-table-virtual-spacer='top']", body);
  let bottom = qs("[data-if-table-virtual-spacer='bottom']", body);
  const colSpan = String(Math.max(1, getDataTableHeaderCells(table).length));
  if (!top) {
    top = document.createElement("tr");
    top.dataset.ifTableVirtualSpacer = "top";
    top.className = "if-table-virtual-spacer";
    top.innerHTML = `<td colspan="${colSpan}"></td>`;
    body.prepend(top);
  }
  if (!bottom) {
    bottom = document.createElement("tr");
    bottom.dataset.ifTableVirtualSpacer = "bottom";
    bottom.className = "if-table-virtual-spacer";
    bottom.innerHTML = `<td colspan="${colSpan}"></td>`;
    body.append(bottom);
  }
  qsa("td", top).forEach((cell) => { cell.colSpan = Number(colSpan); });
  qsa("td", bottom).forEach((cell) => { cell.colSpan = Number(colSpan); });
  return { top, bottom };
}

function applyDataTableVirtualWindow(table, pairs) {
  const wrap = qs(".if-table-wrap", table) || table;
  const rowHeight = Math.max(24, toFiniteNumber(table.dataset.ifTableVirtualRowHeight, 42));
  const overscan = Math.max(0, Number.parseInt(table.dataset.ifTableVirtualOverscan || "4", 10) || 0);
  const viewportRows = Math.max(1, Math.ceil((wrap.clientHeight || rowHeight * 8) / rowHeight));
  const first = Math.max(0, Math.floor((wrap.scrollTop || 0) / rowHeight) - overscan);
  const end = Math.min(pairs.length, first + viewportRows + overscan * 2);
  const { top, bottom } = ensureDataTableVirtualSpacers(table);

  pairs.forEach(({ row, detail }, index) => {
    const visible = index >= first && index < end;
    row.hidden = !visible;
    if (detail) detail.hidden = !visible || row.dataset.ifTableExpanded !== "true";
  });

  if (top) top.firstElementChild.style.height = `${first * rowHeight}px`;
  if (bottom) bottom.firstElementChild.style.height = `${Math.max(0, pairs.length - end) * rowHeight}px`;
  table.dataset.ifTableWindowStart = String(pairs.length ? first + 1 : 0);
  table.dataset.ifTableWindowEnd = String(end);
  table.dataset.ifTableVisible = String(Math.max(0, end - first));
}

function clearDataTableVirtualSpacers(table) {
  qsa("[data-if-table-virtual-spacer]", table).forEach((row) => row.remove());
  delete table.dataset.ifTableWindowStart;
  delete table.dataset.ifTableWindowEnd;
  delete table.dataset.ifTableVisible;
}

function applyDataTable(table, options = {}) {
  if (!table) return;
  if (isServerDataTable(table) && options.local !== true) {
    requestDataTableAdapter(table);
    return;
  }
  const query = (table.dataset.ifTableQuery || "").trim().toLowerCase();
  const filters = getDataTableFilters(table);
  const pageSize = getDataTablePageSize(table);
  const pairs = getDataTablePairs(table);
  const serverMode = isServerDataTable(table) && table.dataset.ifTableServerMode === "true";
  const filteredPairs = pairs.filter(({ row }) => {
    const matchesQuery = serverMode || !query || getDataTableSearchText(row).toLowerCase().includes(query);
    const matches = serverMode || (matchesQuery && rowMatchesDataTableFilters(row, filters));
    row.dataset.ifTableFiltered = String(matches);
    return matches;
  });
  const serverFiltered = Number.parseInt(table.dataset.ifTableServerFiltered || "", 10);
  const pages = Math.max(1, serverMode && Number.isFinite(serverFiltered) ? Math.ceil(serverFiltered / pageSize) : Math.ceil(filteredPairs.length / pageSize));
  const page = Math.min(Math.max(Number.parseInt(table.dataset.ifTablePage || "1", 10) || 1, 1), pages);
  table.dataset.ifTablePage = String(page);

  pairs.forEach(({ row, detail }) => {
    row.hidden = true;
    if (detail) detail.hidden = true;
  });

  if (isVirtualDataTable(table) && !serverMode) {
    applyDataTableVirtualWindow(table, filteredPairs);
  } else {
    clearDataTableVirtualSpacers(table);
    filteredPairs.forEach(({ row, detail }, index) => {
      const visible = serverMode || (index >= (page - 1) * pageSize && index < page * pageSize);
      row.hidden = !visible;
      if (detail) detail.hidden = !visible || row.dataset.ifTableExpanded !== "true";
    });
    delete table.dataset.ifTableVisible;
  }

  renderDataTablePages(table, page, pages);
  updateDataTableStatus(table);
  applyDataTableColumnWidths(table);
  applyDataTablePinnedColumns(table);
}

function updateDataTableStatus(table) {
  if (!table) return;
  const rows = getDataTableRows(table);
  const filteredRows = getDataTableRows(table, "filtered");
  const allRows = getDataTableRows(table, "all");
  const selectedRows = rows.filter((row) => qs("[data-if-table-select]", row)?.checked);
  const selectedAllRows = allRows.filter((row) => qs("[data-if-table-select]", row)?.checked);
  const pageSize = getDataTablePageSize(table);
  const page = Number.parseInt(table.dataset.ifTablePage || "1", 10) || 1;
  const serverTotal = Number.parseInt(table.dataset.ifTableServerTotal || "", 10);
  const serverFiltered = Number.parseInt(table.dataset.ifTableServerFiltered || "", 10);
  const totalCount = Number.isFinite(serverTotal) ? serverTotal : allRows.length;
  const filteredCount = Number.isFinite(serverFiltered) ? serverFiltered : filteredRows.length;
  const pages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const start = isVirtualDataTable(table) && table.dataset.ifTableWindowStart
    ? Number.parseInt(table.dataset.ifTableWindowStart, 10)
    : filteredCount ? (page - 1) * pageSize + 1 : 0;
  const end = isVirtualDataTable(table) && table.dataset.ifTableWindowEnd
    ? Number.parseInt(table.dataset.ifTableWindowEnd, 10)
    : Math.min(page * pageSize, filteredCount);
  const visibleCount = Number.parseInt(table.dataset.ifTableVisible || "", 10);
  qsa("[data-if-table-status]", table).forEach((target) => {
    const key = target.dataset.ifTableStatus;
    if (key === "rows" || key === "filtered") target.textContent = String(filteredCount);
    if (key === "visible") target.textContent = String(Number.isFinite(visibleCount) ? visibleCount : rows.length);
    if (key === "selected") target.textContent = String(selectedRows.length);
    if (key === "selectedTotal") target.textContent = String(selectedAllRows.length);
    if (key === "total") target.textContent = String(totalCount);
    if (key === "page") target.textContent = String(page);
    if (key === "pages") target.textContent = String(pages);
    if (key === "start") target.textContent = String(start);
    if (key === "end") target.textContent = String(end);
  });
  qsa("[data-if-table-selected-count]", table).forEach((target) => {
    target.textContent = String(selectedAllRows.length);
  });
  qsa("[data-if-table-bulk]", table).forEach((target) => {
    target.hidden = selectedAllRows.length === 0;
  });
  qsa("[data-if-table-empty]", table).forEach((target) => {
    target.hidden = filteredCount > 0 || table.dataset.ifTableState === "loading";
  });
  qsa("[data-if-table-prev]", table).forEach((control) => { control.disabled = page <= 1; });
  qsa("[data-if-table-next]", table).forEach((control) => { control.disabled = page >= pages; });
  const selectAll = qs("[data-if-table-select-all]", table);
  if (selectAll) {
    selectAll.checked = rows.length > 0 && selectedRows.length === rows.length;
    selectAll.indeterminate = selectedRows.length > 0 && selectedRows.length < rows.length;
  }
}

function getDataTableColumnCells(table, index) {
  const tableElement = getDataTableElement(table);
  if (!tableElement) return [];
  return qsa("thead tr, tbody tr", tableElement).map((row) => row.children[index]).filter(Boolean);
}

function applyDataTableColumnWidths(table) {
  getDataTableHeaderCells(table).forEach((th, index) => {
    const width = table.style.getPropertyValue(`--if-table-col-${index}-width`) || th.dataset.ifTableWidth || "";
    getDataTableColumnCells(table, index).forEach((cell) => {
      if (width) {
        cell.style.width = width;
        cell.style.minWidth = width;
      } else {
        cell.style.removeProperty("width");
        cell.style.removeProperty("min-width");
      }
    });
  });
}

function applyDataTablePinnedColumns(table) {
  const tableElement = getDataTableElement(table);
  if (!tableElement) return;
  const headerCells = getDataTableHeaderCells(table);
  const pinnedFromDataset = new Set(String(table.dataset.ifTablePinnedColumns || "").split(",").map((item) => item.trim()).filter(Boolean));

  qsa("[data-if-pinned]", tableElement).forEach((cell) => {
    cell.classList.remove("is-pinned-left", "is-pinned-right");
    cell.removeAttribute("data-if-pinned");
    cell.style.removeProperty("--if-table-pin-left");
    cell.style.removeProperty("--if-table-pin-right");
  });

  let leftOffset = 0;
  headerCells.forEach((th, index) => {
    const pinned = th.dataset.ifTablePin || (pinnedFromDataset.has(String(index)) || pinnedFromDataset.has(th.dataset.ifTableColumn || "") ? "left" : "");
    if (pinned !== "left") return;
    const width = th.getBoundingClientRect().width || toFiniteNumber(th.dataset.ifTableWidth, 120);
    getDataTableColumnCells(table, index).forEach((cell) => {
      cell.dataset.ifPinned = "left";
      cell.classList.add("is-pinned-left");
      cell.style.setProperty("--if-table-pin-left", `${leftOffset}px`);
    });
    leftOffset += width;
  });

  let rightOffset = 0;
  [...headerCells].reverse().forEach((th, reverseIndex) => {
    const index = headerCells.length - reverseIndex - 1;
    if (th.dataset.ifTablePin !== "right") return;
    const width = th.getBoundingClientRect().width || toFiniteNumber(th.dataset.ifTableWidth, 120);
    getDataTableColumnCells(table, index).forEach((cell) => {
      cell.dataset.ifPinned = "right";
      cell.classList.add("is-pinned-right");
      cell.style.setProperty("--if-table-pin-right", `${rightOffset}px`);
    });
    rightOffset += width;
  });
}

function resizeDataTableColumn(tableOrControl, columnIndex, width) {
  const table = getDataTable(tableOrControl);
  if (!table) return;
  const index = Number.parseInt(columnIndex, 10);
  const nextWidth = Math.max(48, Number.parseFloat(width) || 48);
  table.style.setProperty(`--if-table-col-${index}-width`, `${nextWidth}px`);
  applyDataTableColumnWidths(table);
  applyDataTablePinnedColumns(table);
  table.dispatchEvent(new CustomEvent("if:table-column-resize", {
    bubbles: true,
    detail: { columnIndex: index, width: nextWidth }
  }));
}

function pinDataTableColumn(tableOrControl, columnIndex, side = "left") {
  const table = getDataTable(tableOrControl);
  if (!table) return;
  const index = Number.parseInt(columnIndex, 10);
  const th = getDataTableHeaderCells(table)[index];
  if (!th) return;
  const nextSide = side === "right" ? "right" : side === "none" || side === "false" ? "" : "left";
  const columnKey = th.dataset.ifTableColumn || th.dataset.ifTableSort || "";
  const pinTokens = new Set(String(table.dataset.ifTablePinnedColumns || "").split(",").map((token) => token.trim()).filter(Boolean));
  if (nextSide) th.dataset.ifTablePin = nextSide;
  else delete th.dataset.ifTablePin;
  pinTokens.delete(String(index));
  if (columnKey) pinTokens.delete(columnKey);
  if (nextSide) pinTokens.add(String(index));
  table.dataset.ifTablePinnedColumns = Array.from(pinTokens).join(",");
  applyDataTablePinnedColumns(table);
  table.dispatchEvent(new CustomEvent("if:table-column-pin", {
    bubbles: true,
    detail: { columnIndex: index, side: nextSide || "none" }
  }));
}

function setupDataTableColumns(table) {
  const resizable = table.dataset.ifTableResizable === "true";
  getDataTableHeaderCells(table).forEach((th, index) => {
    th.dataset.ifTableColumnIndex = String(index);
    if (!th.dataset.ifTableColumn) th.dataset.ifTableColumn = qs("[data-if-table-sort]", th)?.dataset.ifTableSort || String(index);
    if ((resizable || th.dataset.ifTableResizable === "true") && !qs("[data-if-table-resize-handle]", th)) {
      const handle = document.createElement("button");
      handle.type = "button";
      handle.className = "if-table-resize-handle";
      handle.dataset.ifTableResizeHandle = "";
      handle.setAttribute("aria-label", `Resize ${th.textContent.trim() || `column ${index + 1}`}`);
      th.append(handle);
    }
  });
  applyDataTableColumnWidths(table);
  applyDataTablePinnedColumns(table);
}

function setupDataTableVirtualization(table) {
  const wrap = qs(".if-table-wrap", table);
  if (!wrap || wrap.dataset.ifTableVirtualBound === "true") return;
  wrap.dataset.ifTableVirtualBound = "true";
  wrap.addEventListener("scroll", () => {
    if (isVirtualDataTable(table) && !isServerDataTable(table)) applyDataTable(table, { local: true, scroll: true });
  }, { passive: true });
}

function setupDataTable(table) {
  setupDataTableColumns(table);
  setupDataTableVirtualization(table);
}

function getSortableCellValue(row, key) {
  const explicit = row.dataset[`sort${key.charAt(0).toUpperCase()}${key.slice(1)}`];
  if (explicit !== undefined) return explicit;
  const cell = qs(`[data-if-table-cell="${key}"]`, row);
  return cell?.textContent?.trim() || "";
}

function sortDataTable(control) {
  const shell = getDataTable(control);
  const table = qs("table", shell);
  const body = qs("tbody", table);
  if (!shell || !table || !body) return;
  const key = control.dataset.ifTableSort;
  const current = control.getAttribute("aria-sort");
  const direction = current === "ascending" ? "descending" : "ascending";

  qsa("[data-if-table-sort]", shell).forEach((item) => {
    item.setAttribute("aria-sort", item === control ? direction : "none");
    item.classList.toggle("is-active", item === control);
  });

  const pairs = getDataTablePairs(shell);

  pairs.sort((a, b) => {
    const left = getSortableCellValue(a.row, key);
    const right = getSortableCellValue(b.row, key);
    const numericLeft = Number(left.replace?.(/[^0-9.-]/g, ""));
    const numericRight = Number(right.replace?.(/[^0-9.-]/g, ""));
    const result = Number.isFinite(numericLeft) && Number.isFinite(numericRight)
      ? numericLeft - numericRight
      : left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
    return direction === "ascending" ? result : -result;
  });

  pairs.forEach(({ row, detail }) => {
    body.append(row);
    if (detail) body.append(detail);
  });
  shell.dispatchEvent(new CustomEvent("if:table-sort", {
    bubbles: true,
    detail: { key, direction }
  }));
  if (isServerDataTable(shell)) requestDataTableAdapter(shell);
  else applyDataTable(shell);
}

function toggleDataTableRow(control) {
  const row = control.closest("[data-if-table-row]");
  const detail = row?.nextElementSibling?.matches?.("[data-if-table-detail]") ? row.nextElementSibling : null;
  if (!row || !detail) return;
  const expanded = control.getAttribute("aria-expanded") === "true";
  control.setAttribute("aria-expanded", String(!expanded));
  row.dataset.ifTableExpanded = String(!expanded);
  row.classList.toggle("is-expanded", !expanded);
  detail.hidden = expanded || row.hidden;
}

function updateDataTableSelection(control) {
  const table = getDataTable(control);
  if (!table) return;
  if (control.matches("[data-if-table-select-all]")) {
    getDataTableRows(table).forEach((row) => {
      const checkbox = qs("[data-if-table-select]", row);
      if (checkbox) {
        checkbox.checked = control.checked;
        row.classList.toggle("is-selected", control.checked);
      }
    });
  } else {
    const row = control.closest("[data-if-table-row]");
    row?.classList.toggle("is-selected", control.checked);
  }
  updateDataTableStatus(table);
  table.dispatchEvent(new CustomEvent("if:table-select", {
    bubbles: true,
    detail: {
      selected: getDataTableRows(table).filter((row) => qs("[data-if-table-select]", row)?.checked)
    }
  }));
}

function filterDataTable(control) {
  const table = getDataTable(control);
  if (!table) return;
  table.dataset.ifTableQuery = control.value || "";
  table.dataset.ifTablePage = "1";
  if (isServerDataTable(table)) requestDataTableAdapter(table);
  else applyDataTable(table);
  table.dispatchEvent(new CustomEvent("if:table-filter", {
    bubbles: true,
    detail: { query: table.dataset.ifTableQuery }
  }));
}

function clearDataTableFilters(control) {
  const table = getDataTable(control);
  if (!table) return;
  table.dataset.ifTableQuery = "";
  table.dataset.ifTablePage = "1";
  qsa("[data-if-table-filter]", table).forEach((item) => { item.value = ""; });
  qsa("[data-if-table-column-filter]", table).forEach((item) => {
    if (item.type === "checkbox") item.checked = false;
    else item.value = "";
  });
  if (isServerDataTable(table)) requestDataTableAdapter(table);
  else applyDataTable(table);
  table.dispatchEvent(new CustomEvent("if:table-filter", {
    bubbles: true,
    detail: { query: "", filters: {} }
  }));
}

function setDataTableDensity(control) {
  const table = getDataTable(control);
  if (!table) return;
  const density = control.dataset.ifTableDensity || "comfortable";
  table.dataset.tableDensity = density;
  qsa("[data-if-table-density]", table).forEach((item) => {
    const active = item === control;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  table.dispatchEvent(new CustomEvent("if:table-density", {
    bubbles: true,
    detail: { density }
  }));
}

function setDataTablePage(control) {
  const table = getDataTable(control);
  if (!table) return;
  const current = Number.parseInt(table.dataset.ifTablePage || "1", 10) || 1;
  if (control.matches("[data-if-table-prev]")) table.dataset.ifTablePage = String(Math.max(1, current - 1));
  else if (control.matches("[data-if-table-next]")) table.dataset.ifTablePage = String(current + 1);
  else table.dataset.ifTablePage = String(Number.parseInt(control.dataset.ifTablePage || "1", 10) || 1);
  if (isServerDataTable(table)) requestDataTableAdapter(table);
  else applyDataTable(table);
}

function setDataTablePageSize(control) {
  const table = getDataTable(control);
  if (!table) return;
  table.dataset.ifTablePageSize = control.value;
  table.dataset.ifTablePage = "1";
  if (isServerDataTable(table)) requestDataTableAdapter(table);
  else applyDataTable(table);
}

function setDataTableState(table, state, detail = {}) {
  const normalized = setAdapterState(table, state, {
    channel: "table",
    ...detail
  });
  table.dataset.ifTableState = normalized;
  qsa("[data-if-table-server-status]", table).forEach((target) => {
    target.textContent = detail.message || normalized;
  });
  qsa("[data-if-table-loading]", table).forEach((target) => {
    target.hidden = normalized !== "loading";
  });
  qsa("[data-if-table-error]", table).forEach((target) => {
    target.hidden = normalized !== "error";
    if (normalized === "error" && detail.message) target.textContent = detail.message;
  });
  qsa("[data-if-table-empty]", table).forEach((target) => {
    target.hidden = normalized !== "empty";
  });
  return normalized;
}

function renderPolicyTableStatusBadge(value, semantic = "status") {
  const lower = String(value || "").toLowerCase().replace(/\s+/g, "-");
  if (semantic === "confidence") return `<span class="if-badge if-badge--confidence-${lower.includes("low") ? "low" : lower.includes("medium") ? "medium" : "high"}">${escapeHtml(value)}</span>`;
  if (semantic === "risk") return `<span class="if-badge if-badge--risk-${lower.includes("low") ? "low" : lower.includes("medium") ? "medium" : "high"}">${escapeHtml(value)}</span>`;
  const status = ["open", "active", "healthy", "blocked", "needs-review", "in-review"].includes(lower) ? lower : "open";
  return `<span class="if-badge if-badge--status-${status}">${escapeHtml(value)}</span>`;
}

function renderPolicyRecordTableRows(records) {
  return records.map((record) => `
    <tr data-if-table-row data-if-table-search="${escapeHtml([record.title, record.type, record.authority, record.status, record.owner].join(" "))}" data-sort-title="${escapeHtml(record.title)}" data-sort-type="${escapeHtml(record.type)}" data-sort-authority="${escapeHtml(record.authority)}" data-sort-updated="${escapeHtml(record.updated)}" data-sort-confidence="${escapeHtml(record.confidenceScore)}" data-sort-risk="${escapeHtml(record.risk)}" data-filter-type="${escapeHtml(record.type)}" data-filter-authority="${escapeHtml(record.authority)}" data-filter-confidence="${escapeHtml(record.confidence)}" data-filter-risk="${escapeHtml(record.risk)}">
      <td class="if-table__check"><input type="checkbox" data-if-table-select aria-label="Select ${escapeHtml(record.title)}"></td>
      <td><span class="if-icon-slot" data-if-icon="${escapeHtml(record.icon)}"></span></td>
      <td data-if-table-cell="title"><span class="if-table-cell-main"><strong>${escapeHtml(record.title)}</strong><span class="if-table-cell-meta">${escapeHtml(record.subtitle)}</span></span></td>
      <td data-if-table-cell="type">${escapeHtml(record.type)}</td>
      <td data-if-table-cell="authority">${escapeHtml(record.authority)}</td>
      <td>${escapeHtml(record.updatedLabel)}</td>
      <td data-if-table-cell="confidence">${renderPolicyTableStatusBadge(`${record.confidence} ${record.confidenceScore}`, "confidence")}</td>
      <td data-if-table-cell="risk">${renderPolicyTableStatusBadge(record.risk, "risk")}</td>
      <td>${renderPolicyTableStatusBadge(record.status)}</td>
      <td class="is-numeric">${escapeHtml(record.links)}</td>
      <td><span class="if-table-actions"><button class="if-icon-btn" type="button" title="View"><span class="if-icon-slot" data-if-icon="eye"></span></button><button class="if-icon-btn" type="button" title="Open graph"><span class="if-icon-slot" data-if-icon="graph"></span></button><button class="if-icon-btn" type="button" title="More"><span class="if-icon-slot" data-if-icon="more"></span></button></span></td>
    </tr>
  `).join("");
}

function createMockPolicyRecords() {
  const titles = [
    ["DoDI 5200.01 Information Governance", "Canonical policy record - DoD Issuances Portal", "Instruction", "DoD", "policy"],
    ["SECNAV Memo 25-104 Cloud Transition Guidance", "Navy cloud implementation guidance", "Memo", "SECNAV", "memo"],
    ["DISA Cloud Access Guide", "Implementation document with linked obligations", "Guide", "DISA", "cloud"],
    ["OMB M-25-77 AI Governance Practices", "Crosswalk candidate for AI controls", "Memo", "OMB", "omb"],
    ["NIST SP 800-207 Zero Trust Architecture", "Reference source cited by implementation plans", "Source", "NIST", "nist"],
    ["Records Retention Evidence Gap", "Conflict candidate missing implementation evidence", "Finding", "DoD", "warning"],
    ["DOWI 8320.14 Data Exchange Modernization", "API exchange requirement decomposition", "Instruction", "DoD", "directive"],
    ["FISMA Modernization Implementation Memo", "External authority bridge for cyber controls", "Memo", "OMB", "shield"]
  ];
  const risks = ["Low", "Medium", "High"];
  const statuses = ["Open", "In Review", "Needs Review", "Active", "Blocked", "Healthy"];
  return Array.from({ length: 128 }, (_, index) => {
    const base = titles[index % titles.length];
    const confidenceScore = Math.max(0.52, Math.min(0.98, 0.98 - (index % 9) * 0.045));
    const confidence = confidenceScore >= 0.8 ? "High" : confidenceScore >= 0.65 ? "Medium" : "Low";
    const day = 12 - (index % 21);
    return {
      title: `${base[0]}${index < titles.length ? "" : ` ${Math.floor(index / titles.length) + 1}`}`,
      subtitle: base[1],
      type: base[2],
      authority: base[3],
      icon: base[4],
      updated: `2026-05-${String(Math.max(1, day)).padStart(2, "0")}`,
      updatedLabel: `May ${Math.max(1, day)}, 2026`,
      confidence,
      confidenceScore: confidenceScore.toFixed(2),
      risk: risks[(index + 1) % risks.length],
      status: statuses[index % statuses.length],
      owner: ["Jane Doe", "Priya Shah", "Michael Lee", "Alex Kim"][index % 4],
      links: 3 + (index * 7) % 126
    };
  });
}

const mockPolicyRecords = createMockPolicyRecords();

function waitForTableAdapterDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timerHost = typeof window !== "undefined" ? window : globalThis;
    const timeout = timerHost.setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      timerHost.clearTimeout(timeout);
      reject(Object.assign(new Error("Request cancelled"), { name: "AbortError" }));
    }, { once: true });
  });
}

async function mockPolicyRecordsAdapter(params) {
  await waitForTableAdapterDelay(260, params.signal);
  let rows = [...mockPolicyRecords];
  const query = String(params.query || "").toLowerCase();
  if (query) {
    rows = rows.filter((record) => [record.title, record.subtitle, record.type, record.authority, record.status, record.owner].join(" ").toLowerCase().includes(query));
  }
  Object.entries(params.filters || {}).forEach(([key, values]) => {
    const normalized = values.map((value) => String(value).toLowerCase());
    rows = rows.filter((record) => normalized.some((value) => String(record[key] || "").toLowerCase().includes(value)));
  });
  if (params.sort?.key) {
    const direction = params.sort.direction === "descending" ? -1 : 1;
    rows.sort((a, b) => String(a[params.sort.key] ?? "").localeCompare(String(b[params.sort.key] ?? ""), undefined, { numeric: true, sensitivity: "base" }) * direction);
  }
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const pageSize = Math.max(1, Number.parseInt(params.pageSize || "10", 10) || 10);
  const start = (page - 1) * pageSize;
  return {
    filtered: rows.length,
    page,
    pageSize,
    rows: rows.slice(start, start + pageSize),
    total: mockPolicyRecords.length
  };
}

function getDataTableAdapter(name) {
  return dataTableAdapters.get(name) || (name === "policy-records-mock" ? mockPolicyRecordsAdapter : null);
}

function renderDataTableAdapterResult(table, result) {
  const body = getDataTableBody(table);
  if (!body) return;
  if (typeof result.rowsHtml === "string") body.innerHTML = result.rowsHtml;
  else if (Array.isArray(result.rows)) body.innerHTML = renderPolicyRecordTableRows(result.rows);
  table.dataset.ifTableServerTotal = String(result.total ?? result.filtered ?? result.rows?.length ?? 0);
  table.dataset.ifTableServerFiltered = String(result.filtered ?? result.total ?? result.rows?.length ?? 0);
  table.dataset.ifTableServerMode = "true";
  table.dataset.ifTablePage = String(result.page || table.dataset.ifTablePage || "1");
  if (result.pageSize) table.dataset.ifTablePageSize = String(result.pageSize);
  hydrateIcons(body);
  hydrateSparklines(body);
  setupDataTable(table);
  applyDataTable(table, { local: true });
}

function getDataTableResultCount(result = {}) {
  const rowsLength = Array.isArray(result.rows)
    ? result.rows.length
    : typeof result.rowsHtml === "string"
      ? result.rowsHtml.match(/<tr\b/gi)?.length || 0
      : 0;
  const filtered = Number.parseInt(result.filtered ?? result.total ?? rowsLength, 10);
  return Number.isFinite(filtered) ? filtered : rowsLength;
}

function requestDataTableAdapter(tableOrControl, options = {}) {
  const table = getDataTable(tableOrControl);
  if (!table) return Promise.resolve(null);
  const adapter = getDataTableAdapter(table.dataset.ifTableAdapter);
  if (!adapter) {
    setDataTableState(table, "error", { message: `Missing table adapter: ${table.dataset.ifTableAdapter}` });
    return Promise.resolve(null);
  }
  const previous = dataTableRequests.get(table);
  previous?.controller?.abort();
  if (options.resetPage) table.dataset.ifTablePage = "1";
  const controller = new AbortController();
  const requestId = `table-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const params = {
    filters: getDataTableFilterObject(table),
    page: Number.parseInt(table.dataset.ifTablePage || "1", 10) || 1,
    pageSize: getDataTablePageSize(table),
    query: table.dataset.ifTableQuery || "",
    requestId,
    signal: controller.signal,
    sort: getDataTableSortState(table),
    table
  };
  dataTableRequests.set(table, { controller, requestId });
  setDataTableState(table, "loading", { message: "Loading rows...", requestId });
  table.dispatchEvent(new CustomEvent("if:table-request", { bubbles: true, detail: params }));
  return Promise.resolve()
    .then(() => adapter(params))
    .then((result = {}) => {
      const current = dataTableRequests.get(table);
      if (current?.requestId !== requestId || controller.signal.aborted) return null;
      renderDataTableAdapterResult(table, result);
      const count = getDataTableResultCount(result);
      const state = normalizeAdapterState(result.state, count === 0 ? "empty" : "success");
      setDataTableState(table, state, {
        message: result.message || (state === "empty" ? "No matching rows" : `${count} matching rows`),
        requestId
      });
      dataTableRequests.delete(table);
      table.dispatchEvent(new CustomEvent("if:table-results", { bubbles: true, detail: { ...params, result } }));
      return result;
    })
    .catch((error) => {
      if (error?.name === "AbortError") {
        setDataTableState(table, "cancelled", { message: "Table request cancelled", requestId });
        table.dispatchEvent(new CustomEvent("if:table-cancel", { bubbles: true, detail: params }));
        return null;
      }
      setDataTableState(table, "error", { message: error?.message || "Unable to load table rows.", requestId });
      table.dispatchEvent(new CustomEvent("if:table-error", { bubbles: true, detail: { ...params, error } }));
      return null;
    });
}

function refreshDataTable(tableOrControl, options = {}) {
  const table = getDataTable(tableOrControl);
  if (!table) return null;
  return isServerDataTable(table) ? requestDataTableAdapter(table, options) : applyDataTable(table, { local: true });
}

function registerDataTableAdapter(name, adapter) {
  if (!name || typeof adapter !== "function") return;
  dataTableAdapters.set(name, adapter);
}

function unregisterDataTableAdapter(name) {
  dataTableAdapters.delete(name);
}

function setDataTableData(tableOrControl, rows, options = {}) {
  const table = getDataTable(tableOrControl);
  const body = table ? getDataTableBody(table) : null;
  if (!table || !body) return;
  body.innerHTML = typeof rows === "string" ? rows : renderPolicyRecordTableRows(Array.isArray(rows) ? rows : []);
  if (options.total !== undefined) table.dataset.ifTableServerTotal = String(options.total);
  if (options.filtered !== undefined) table.dataset.ifTableServerFiltered = String(options.filtered);
  hydrateIcons(body);
  hydrateSparklines(body);
  setupDataTable(table);
  applyDataTable(table, { local: true });
}

function openDrawer(drawer) {
  if (!drawer) return;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  reconcileBodyScrollLock();
  const backdrop = qs("[data-if-backdrop]");
  if (backdrop) backdrop.hidden = false;
  firstFocusable(drawer)?.focus();
}

function closeDrawer(drawer) {
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  reconcileBodyScrollLock();
  const backdrop = qs("[data-if-backdrop]");
  if (backdrop) backdrop.hidden = true;
}

function openModal(modal) {
  if (!modal) return;
  lastFocus = document.activeElement;
  activeModal = modal;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  reconcileBodyScrollLock();
  firstFocusable(modal)?.focus();
}

function closeModal(modal = activeModal) {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  activeModal = null;
  reconcileBodyScrollLock();
  if (lastFocus && typeof lastFocus.focus === "function") {
    lastFocus.focus();
  }
}

function reconcileBodyScrollLock() {
  const locked = Boolean(
    activeModal?.classList?.contains("is-open")
    || qs(".if-modal.is-open, .if-drawer.is-open, .if-expandable-surface.is-expanded:not(.if-expandable-surface--inline)")
  );
  document.body.classList.toggle("if-scroll-lock", locked);
}

function hydrateLazyEmbeds(root) {
  qsa("iframe[data-src]:not([src])", root).forEach((frame) => {
    frame.setAttribute("src", frame.dataset.src);
  });
}

function getTabs(tabOrSelector) {
  if (typeof tabOrSelector === "string") return qs(tabOrSelector);
  return tabOrSelector?.matches?.("[data-if-tabs]") ? tabOrSelector : tabOrSelector?.closest?.("[data-if-tabs]");
}

function getTabsState(tabsetOrSelector) {
  const tabset = getTabs(tabsetOrSelector);
  if (!tabset) return null;
  const tabs = qsa("[role='tab']", tabset);
  const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0] || null;
  return {
    active: selected?.getAttribute("aria-controls") || selected?.dataset.target?.replace("#", "") || "",
    index: selected ? tabs.indexOf(selected) : -1,
    tabs: tabs.map((tab) => ({
      controls: tab.getAttribute("aria-controls") || tab.dataset.target?.replace("#", "") || "",
      id: tab.id || "",
      selected: tab.getAttribute("aria-selected") === "true",
      title: tab.textContent?.trim() || ""
    })),
    total: tabs.length
  };
}

function normalizeTabsDocument(config = {}) {
  const tabs = (config.tabs || config.items || []).map((item, index) => {
    const id = item.id || item.key || `tab-${index + 1}`;
    return {
      accordions: item.accordions || item.sections || [],
      badge: item.badge || "",
      body: item.body || item.description || "",
      id,
      meta: item.meta || "",
      selected: Boolean(item.selected),
      title: item.title || item.label || id
    };
  });
  return {
    label: config.label || config.title || "Tabbed content",
    selected: config.selected || tabs.find((tab) => tab.selected)?.id || tabs[0]?.id || "",
    tabs
  };
}

function renderAccordionItems(items = [], options = {}) {
  const groupId = options.groupId || "accordion";
  return `
    <div class="if-accordion" data-if-accordion-group>
      ${items.map((item, index) => {
        const id = item.id || `${groupId}-section-${index + 1}`;
        const panelId = `${id}-panel`;
        const expanded = item.expanded !== false && index === 0;
        return `
          <div class="if-accordion__item">
            <button class="if-accordion__trigger" type="button" id="${escapeHtml(id)}" data-if-accordion-trigger aria-expanded="${expanded ? "true" : "false"}" aria-controls="${escapeHtml(panelId)}">
              <span>${escapeHtml(item.title || item.label || `Section ${index + 1}`)}</span>
              ${item.badge ? `<span class="if-badge">${escapeHtml(item.badge)}</span>` : ""}
            </button>
            <div class="if-accordion__panel" id="${escapeHtml(panelId)}" role="region" aria-labelledby="${escapeHtml(id)}"${expanded ? "" : " hidden"}>${escapeHtml(item.body || item.description || "")}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderTabs(tabsetOrSelector, config = {}) {
  const tabset = getTabs(tabsetOrSelector) || qs(tabsetOrSelector);
  if (!tabset) return null;
  const doc = normalizeTabsDocument(config);
  if (!doc.tabs.length) return tabset;
  tabset.dataset.ifTabsRendered = "true";
  tabset.replaceChildren();
  tabset.innerHTML = `
    <div class="if-tab-list if-tabs__list" role="tablist" aria-label="${escapeHtml(doc.label)}">
      ${doc.tabs.map((tab) => {
        const selected = tab.id === doc.selected;
        return `<button class="if-tab${selected ? " is-active is-selected" : ""}" type="button" role="tab" id="${escapeHtml(tab.id)}-tab" aria-selected="${selected ? "true" : "false"}" aria-controls="${escapeHtml(tab.id)}-panel" tabindex="${selected ? "0" : "-1"}"><span>${escapeHtml(tab.title)}</span>${tab.badge ? `<span class="if-badge">${escapeHtml(tab.badge)}</span>` : ""}</button>`;
      }).join("")}
    </div>
    ${doc.tabs.map((tab) => {
      const selected = tab.id === doc.selected;
      return `<section class="if-tab-panel if-tabs__panel${selected ? " is-active" : ""}" id="${escapeHtml(tab.id)}-panel" role="tabpanel" aria-labelledby="${escapeHtml(tab.id)}-tab"${selected ? "" : " hidden"}><div class="if-stack"><p class="if-text-sm if-m-0">${escapeHtml(tab.body)}</p>${tab.meta ? `<p class="if-text-xs if-text-muted if-m-0">${escapeHtml(tab.meta)}</p>` : ""}${tab.accordions.length ? renderAccordionItems(tab.accordions, { groupId: tab.id }) : ""}</div></section>`;
    }).join("")}
  `;
  hydrateTabs(tabset);
  hydrateAccordions(tabset);
  return tabset;
}

function getTabsConfig(tabset) {
  const sourceSelector = tabset?.getAttribute?.("data-if-tabs-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || tabset?.getAttribute?.("data-if-tabs-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid tabs JSON", error);
    return null;
  }
}

function activateTab(tab, options = {}) {
  const tabset = tab.closest("[data-if-tabs]");
  if (!tabset) return;

  const tabs = qsa("[role='tab']", tabset);
  const panels = qsa("[role='tabpanel']", tabset);
  const targetId = tab.dataset.target?.replace("#", "") || tab.getAttribute("aria-controls");

  tabs.forEach((item) => {
    const selected = item === tab;
    setSelected(item, selected, { roving: true });
  });

  panels.forEach((panel) => {
    const selected = panel.id === targetId || panel.dataset.panel === targetId;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
    if (selected) hydrateLazyEmbeds(panel);
  });
  tabset.dataset.ifTabsActive = targetId || "";
  if (options.emit !== false) {
    tabset.dispatchEvent(new CustomEvent("if:tab-change", {
      bubbles: true,
      detail: { tab, target: qs(`#${escapeCssIdentifier(targetId)}`, tabset) || null, state: getTabsState(tabset) }
    }));
  }
}

function getAccordionState(root = document) {
  const scope = typeof root === "string" ? qs(root) : root || document;
  const triggers = qsa("[data-if-accordion-trigger], [data-if-accordion]", scope);
  return {
    items: triggers.map((trigger) => ({
      controls: trigger.getAttribute("aria-controls") || "",
      expanded: trigger.getAttribute("aria-expanded") === "true",
      title: trigger.textContent?.trim() || ""
    })),
    open: triggers.filter((trigger) => trigger.getAttribute("aria-expanded") === "true").length,
    total: triggers.length
  };
}

function renderAccordion(accordionOrSelector, config = {}) {
  const accordion = typeof accordionOrSelector === "string" ? qs(accordionOrSelector) : accordionOrSelector;
  if (!accordion) return null;
  const items = config.items || config.sections || [];
  accordion.dataset.ifAccordionRendered = "true";
  accordion.replaceChildren();
  const template = document.createElement("template");
  template.innerHTML = renderAccordionItems(items, { groupId: accordion.id || "accordion" });
  const group = template.content.firstElementChild;
  if (group) accordion.append(...Array.from(group.children));
  hydrateAccordions(accordion);
  return accordion;
}

function getAccordionConfig(accordion) {
  const sourceSelector = accordion?.getAttribute?.("data-if-accordion-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || accordion?.getAttribute?.("data-if-accordion-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid accordion JSON", error);
    return null;
  }
}

function toggleAccordion(trigger, options = {}) {
  const target = getTarget(trigger) || trigger.closest(".if-accordion__item")?.querySelector(".if-accordion__panel");
  if (!target) return;
  const expanded = trigger.getAttribute("aria-expanded") === "true";
  const next = setDisclosureState(trigger, target, !expanded, { activeClass: "is-expanded", openClass: "is-active" });
  if (options.emit !== false) {
    trigger.dispatchEvent(new CustomEvent("if:disclosure-toggle", {
      bubbles: true,
      detail: { expanded: next, trigger, target, state: getAccordionState(trigger.closest(".if-accordion") || document) }
    }));
  }
}

function toggleExpanded(trigger) {
  const target = getTarget(trigger);
  if (!target) return;
  const expanded = trigger.getAttribute("aria-expanded") === "true";
  setDisclosureState(trigger, target, !expanded, { activeClass: "is-expanded", openClass: "is-active" });
}

function getCollapsibleSurface(controlOrSurface) {
  if (!controlOrSurface) return null;
  if (controlOrSurface.matches?.("[data-if-collapsible]")) return controlOrSurface;
  const explicit = getTarget(controlOrSurface, "ifCollapsibleSurface");
  if (explicit?.matches?.("[data-if-collapsible]")) return explicit;
  const target = getTarget(controlOrSurface, "ifCollapsibleToggle");
  return controlOrSurface.closest?.("[data-if-collapsible]") || target?.closest?.("[data-if-collapsible]") || null;
}

function getCollapsibleRegion(surface, control = null) {
  if (!surface) return null;
  const explicit = control ? getTarget(control, "ifCollapsibleToggle") : null;
  if (explicit) return explicit;
  const selector = surface.dataset.ifCollapsibleRegion;
  if (selector) return qs(selector, surface) || qs(selector);
  return qs("[data-if-collapsible-region]", surface);
}

function updateCollapsibleToggleIcon(toggle, expanded) {
  qsa("[data-if-collapsible-icon]", toggle).forEach((icon) => {
    icon.dataset.ifIcon = expanded ? icon.dataset.ifExpandedIcon || "minus" : icon.dataset.ifCollapsedIcon || "plus";
    icon.innerHTML = "";
  });
  hydrateIcons(toggle);
}

function syncCollapsibleSurface(surface, expanded, options = {}) {
  const region = getCollapsibleRegion(surface, options.control);
  if (!region) return false;
  if (!region.id) {
    collapsibleSurfaceCounter += 1;
    region.id = `if-collapsible-region-${collapsibleSurfaceCounter}`;
  }
  region.hidden = !expanded;
  surface.classList.toggle("is-collapsed", !expanded);
  surface.dataset.ifCollapsed = String(!expanded);
  const surfaceLabel = surface.dataset.ifCollapsibleLabel
    || qs("[data-if-collapsible-title], .if-specimen__title, .if-panel__title, .if-coverage-card__header h3, .if-pattern-card__header h3, h2, h3", surface)?.textContent?.trim()
    || "section";
  qsa("[data-if-collapsible-toggle]", surface).forEach((toggle) => {
    const toggleTarget = getCollapsibleRegion(surface, toggle);
    if (toggleTarget && toggleTarget !== region) return;
    setDisclosureState(toggle, region, expanded);
    toggle.setAttribute("aria-controls", region.id);
    toggle.title = expanded ? "Collapse section" : "Expand section";
    if (!toggle.dataset.ifPreserveLabel) {
      toggle.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} ${surfaceLabel}`);
    }
    const label = qs("[data-if-collapsible-toggle-label]", toggle);
    if (label) label.textContent = expanded
      ? toggle.dataset.ifExpandedLabel || "Collapse"
      : toggle.dataset.ifCollapsedLabel || "Expand";
    updateCollapsibleToggleIcon(toggle, expanded);
  });
  qsa("[data-if-collapsible-status]", surface).forEach((status) => {
    status.textContent = expanded ? status.dataset.ifExpandedText || "Expanded" : status.dataset.ifCollapsedText || "Collapsed";
  });
  if (options.emit !== false) {
    surface.dispatchEvent(new CustomEvent("if:collapsible-toggle", {
      bubbles: true,
      detail: { expanded, region, surface, control: options.control || null }
    }));
  }
  return true;
}

function toggleCollapsibleSurface(control) {
  const surface = getCollapsibleSurface(control);
  if (!surface) return false;
  const expanded = control.getAttribute("aria-expanded") !== "true";
  return syncCollapsibleSurface(surface, expanded, { control });
}

function hydrateCollapsibleSurfaces(root = document) {
  qsa("[data-if-collapsible]", root).forEach((surface) => {
    const region = getCollapsibleRegion(surface);
    if (!region) return;
    const collapsed = surface.dataset.ifCollapsed === "true" || surface.classList.contains("is-collapsed") || region.hidden;
    syncCollapsibleSurface(surface, !collapsed, { emit: false });
  });
}

function filterItems(control) {
  const targetSelector = control.dataset.ifFilterTarget;
  const target = targetSelector ? qs(targetSelector) : control.closest("[data-if-filter-scope]");
  if (!target) return;

  const query = String(control.value || control.dataset.ifFilterValue || "").trim().toLowerCase();
  const rows = qsa("[data-if-filter-text]", target);

  rows.forEach((row) => {
    const value = row.dataset.ifFilterText?.toLowerCase() || row.textContent.toLowerCase();
    row.hidden = query.length > 0 && !value.includes(query);
  });
}

function getPublicSearch(control) {
  if (!control) return null;
  return control.matches?.("[data-if-public-search], .if-public-search")
    ? control
    : control.closest?.("[data-if-public-search], .if-public-search");
}

function getPublicSearchResultRoot(search) {
  const selector = search?.dataset.ifPublicSearchTarget;
  return selector ? qs(selector) : search;
}

function getPublicSearchResults(search) {
  const root = getPublicSearchResultRoot(search);
  return qsa("[data-if-public-search-result], .if-public-search__result", root);
}

function getPublicSearchFilter(search) {
  const active = qs("[data-if-public-search-filter][aria-pressed='true']", search)
    || qs("[data-if-public-search-filter].is-active", search);
  return String(active?.dataset.ifPublicSearchFilter || "all").trim().toLowerCase() || "all";
}

function getPublicSearchText(item) {
  return String(item.dataset.ifPublicSearchText || item.textContent || "").toLowerCase();
}

function getPublicSearchCategories(item) {
  return String(item.dataset.ifPublicSearchCategory || item.dataset.ifPublicSearchType || item.dataset.ifPublicSearchTags || "all")
    .split(/[,\s|]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function setPublicSearchFilter(control, options = {}) {
  const search = getPublicSearch(control);
  if (!search) return null;
  qsa("[data-if-public-search-filter]", search).forEach((button) => {
    const active = button === control;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  return updatePublicSearch(search, options);
}

function clearPublicSearch(control) {
  const search = getPublicSearch(control);
  if (!search) return null;
  const query = qs("[data-if-public-search-query]", search);
  if (query) query.value = "";
  const all = qs("[data-if-public-search-filter='all']", search) || qs("[data-if-public-search-filter]", search);
  if (all) return setPublicSearchFilter(all);
  return updatePublicSearch(search);
}

function updatePublicSearch(searchOrControl, options = {}) {
  const search = getPublicSearch(searchOrControl);
  if (!search) return null;
  const queryControl = qs("[data-if-public-search-query]", search);
  const query = String(queryControl?.value || "").trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const filter = getPublicSearchFilter(search);
  const results = getPublicSearchResults(search);
  let visible = 0;

  results.forEach((item) => {
    const text = getPublicSearchText(item);
    const categories = getPublicSearchCategories(item);
    const matchesQuery = !terms.length || terms.every((term) => text.includes(term));
    const matchesFilter = filter === "all" || categories.includes(filter);
    const shown = matchesQuery && matchesFilter;
    item.hidden = !shown;
    item.classList.toggle("is-filtered-out", !shown);
    if (shown) visible += 1;
  });

  qsa("[data-if-public-search-count]", search).forEach((target) => {
    target.textContent = `${visible} of ${results.length}`;
  });
  qsa("[data-if-public-search-empty]", search).concat(qsa("[data-if-public-search-empty]", getPublicSearchResultRoot(search))).forEach((target) => {
    target.hidden = visible > 0;
  });
  if (queryControl) queryControl.setAttribute("aria-label", queryControl.getAttribute("aria-label") || "Search public site content");
  if (options.emit !== false) {
    search.dispatchEvent(new CustomEvent("if:public-search", {
      bubbles: true,
      detail: { search, query, filter, visible, total: results.length }
    }));
  }
  return { search, query, filter, visible, total: results.length };
}

function hydratePublicSearches(root = document) {
  qsa("[data-if-public-search], .if-public-search", root).forEach((search) => {
    const query = qs("[data-if-public-search-query]", search);
    if (query) {
      query.setAttribute("type", query.getAttribute("type") || "search");
      query.setAttribute("autocomplete", query.getAttribute("autocomplete") || "off");
    }
    const filters = qsa("[data-if-public-search-filter]", search);
    if (filters.length && !filters.some((button) => button.getAttribute("aria-pressed") === "true")) {
      filters[0].setAttribute("aria-pressed", "true");
      filters[0].classList.add("is-active");
    }
    filters.forEach((button) => {
      if (!button.hasAttribute("aria-pressed")) button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
    });
    qsa("[data-if-public-search-empty]", search).forEach((target) => {
      target.hidden = true;
    });
    updatePublicSearch(search, { emit: false });
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeCssIdentifier(value) {
  const text = String(value ?? "");
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(text);
  return text.replace(/[\0-\x1f\x7f]|^-?\d|^-$|[^\w-]/g, (char, offset) => {
    if (char === "\0") return "\uFFFD";
    const hex = char.charCodeAt(0).toString(16).toUpperCase();
    return offset === 0 || /[\0-\x1f\x7f]/.test(char) ? `\\${hex} ` : `\\${char}`;
  });
}

function highlightAutocompleteMatch(value, query) {
  const safe = escapeHtml(value);
  const terms = String(query || "").trim().split(/\s+/).filter((term) => term.length > 1).slice(0, 4);
  if (!terms.length) return safe;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  return safe.replace(pattern, "<mark>$1</mark>");
}

function isAutocompleteInput(target) {
  return target?.matches?.("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]");
}

function getAutocompleteInput(root) {
  return qs("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]", root);
}

function getAutocompleteState(inputOrSelector = null) {
  const input = typeof inputOrSelector === "string"
    ? qs(inputOrSelector)
    : isAutocompleteInput(inputOrSelector)
      ? inputOrSelector
      : getAutocompleteInput(inputOrSelector || document);
  if (!input) return null;
  const menu = getAutocompleteMenu(input);
  const options = menu ? qsa("[data-if-autocomplete-option]", menu) : [];
  const active = options.find((option) => option.classList.contains("is-active")) || null;
  const adapterState = getAdapterState(input);
  return {
    activeId: active?.dataset.id || "",
    activeIndex: active ? options.indexOf(active) : -1,
    activeLabel: active?.dataset.label || "",
    adapterState,
    items: options.map((option) => ({
      id: option.dataset.id || "",
      label: option.dataset.label || option.textContent?.trim() || "",
      meta: option.dataset.meta || "",
      type: option.dataset.type || "",
      value: option.dataset.value || ""
    })),
    limit: Number(input.dataset.ifAutocompleteLimit || 0) || null,
    open: input.getAttribute("aria-expanded") === "true" && !menu?.hidden,
    provider: getAutocompleteProvider(input),
    query: input.value || "",
    requestId: input.dataset.ifAutocompleteRequest || "",
    resultState: input.dataset.ifAutocompleteResultState || adapterState || "idle",
    selected: input.dataset.ifAutocompleteSelected || "",
    total: options.length
  };
}

function getAutocompleteItems(input) {
  const raw = input.dataset.ifAutocomplete || "";
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((item) => typeof item === "string" ? { label: item, value: item } : item);
  } catch {
    // Fall through to simple delimited values.
  }
  return raw.split("|").map((item) => item.trim()).filter(Boolean).map((item) => ({ label: item, value: item }));
}

function getMockAutocompleteItems(input, query, providerOverride = "") {
  const provider = providerOverride || input.dataset.ifAutocompleteRemote || input.dataset.ifAutocompleteMock;
  const source = mockAutocompleteProviders[provider] || [];
  const normalized = query.trim().toLowerCase();
  return source
    .map((item) => {
      const haystack = `${item.label} ${item.meta || ""} ${item.type || ""} ${item.id || ""}`.toLowerCase();
      const starts = item.label.toLowerCase().startsWith(normalized);
      const includes = !normalized || haystack.includes(normalized);
      const score = starts ? 2 : includes ? 1 : 0;
      return { ...item, score };
    })
    .filter((item) => item.score > 0 || !normalized)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

function getAutocompleteProvider(input) {
  return input.dataset.ifAutocompleteRemote || input.dataset.ifAutocompleteMock || "";
}

function createAbortError(reason = "Request cancelled") {
  if (typeof DOMException === "function") return new DOMException(reason, "AbortError");
  const error = new Error(reason);
  error.name = "AbortError";
  return error;
}

function isAbortError(error) {
  return error?.name === "AbortError" || String(error?.message || "").toLowerCase().includes("abort");
}

function waitForAutocompleteDelay(delay, signal) {
  const ms = Math.max(0, Number(delay) || 0);
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError("Request cancelled before it started"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    const abort = () => {
      window.clearTimeout(timer);
      reject(createAbortError("Request cancelled"));
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function normalizeAutocompleteItem(item) {
  if (typeof item === "string") return { label: item, value: item };
  return {
    label: item?.label || item?.value || "",
    value: item?.value || item?.label || "",
    type: item?.type || "",
    meta: item?.meta || "",
    id: item?.id || ""
  };
}

function normalizeAutocompleteResult(result, limit = 8) {
  if (Array.isArray(result)) {
    const items = result.map(normalizeAutocompleteItem).filter((item) => item.label).slice(0, limit);
    return { items, state: items.length ? "results" : "empty" };
  }
  const rawItems = Array.isArray(result?.items) ? result.items : [];
  const items = rawItems.map(normalizeAutocompleteItem).filter((item) => item.label).slice(0, limit);
  return {
    items,
    state: result?.state || (items.length ? "results" : "empty"),
    title: result?.title || "",
    message: result?.message || "",
    meta: result?.meta || {}
  };
}

function registerAutocompleteAdapter(name, adapter) {
  if (!name || !adapter) return null;
  const normalized = typeof adapter === "function" ? { search: adapter } : adapter;
  if (typeof normalized.search !== "function") {
    throw new TypeError("Autocomplete adapters must expose a search(context) function.");
  }
  autocompleteAdapters.set(name, normalized);
  return normalized;
}

function unregisterAutocompleteAdapter(name) {
  return autocompleteAdapters.delete(name);
}

function getAutocompleteAdapter(provider) {
  return autocompleteAdapters.get(provider);
}

function createMockAutocompleteAdapter(sourceProvider = "policy-intelligence") {
  return {
    async search({ input, query, limit, signal }) {
      const delay = Number(input.dataset.ifAutocompleteDelay || 180);
      await waitForAutocompleteDelay(delay, signal);
      const forcedState = String(input.dataset.ifAutocompleteMockState || "").toLowerCase();
      const normalizedQuery = query.trim().toLowerCase();
      if (forcedState === "error" || normalizedQuery === "error" || normalizedQuery.includes("adapter:error")) {
        throw new Error(input.dataset.ifAutocompleteError || "Search adapter returned a recoverable service error.");
      }
      if (forcedState === "empty" || normalizedQuery === "empty" || normalizedQuery.includes("adapter:empty")) {
        return {
          items: [],
          state: "empty",
          title: input.dataset.ifAutocompleteEmptyTitle || "No adapter results",
          message: input.dataset.ifAutocompleteEmptyMessage || "The adapter completed successfully but returned an empty result set."
        };
      }
      const items = getMockAutocompleteItems(input, query, sourceProvider).slice(0, limit);
      return {
        items,
        state: items.length ? "results" : "empty",
        title: "No matches found",
        message: "Try a policy ID, source, organization, claim, or obligation."
      };
    }
  };
}

registerAutocompleteAdapter("policy-intelligence", createMockAutocompleteAdapter("policy-intelligence"));
registerAutocompleteAdapter("policy-intelligence-lifecycle", createMockAutocompleteAdapter("policy-intelligence"));

function getAutocompleteMenu(input) {
  const wrapper = input.closest(".if-autocomplete") || input.closest(".if-search") || input.parentElement;
  if (!wrapper) return null;
  let menu = qs("[data-if-autocomplete-menu]", wrapper);
  if (!menu) {
    menu = document.createElement("div");
    menu.className = "if-autocomplete__menu";
    menu.setAttribute("role", "listbox");
    menu.dataset.ifAutocompleteMenu = "";
    wrapper.append(menu);
  }
  return menu;
}

function isAutocompleteEventTarget(input, target) {
  if (!input || !target) return false;
  const wrapper = input.closest(".if-autocomplete") || input.closest(".if-search") || input.parentElement;
  const menu = getAutocompleteMenu(input);
  return input === target || input.contains?.(target) || wrapper?.contains?.(target) || menu?.contains?.(target);
}

function closeAutocompletesOutsideTarget(target) {
  qsa("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]").forEach((input) => {
    const menu = getAutocompleteMenu(input);
    if (!menu || menu.hidden || isAutocompleteEventTarget(input, target)) return;
    closeAutocomplete(input);
  });
}

function handleAutocompleteCaptureClick(event) {
  const autocompleteOption = event.target.closest?.("[data-if-autocomplete-option]");
  if (autocompleteOption) {
    event.preventDefault();
    event.__ifAutocompleteHandled = true;
    selectAutocompleteOption(autocompleteOption);
    return;
  }
  closeAutocompletesOutsideTarget(event.target);
}

function cancelAutocomplete(input, reason = "cancelled", options = {}) {
  const request = autocompleteRequests.get(input);
  if (!request) return false;
  autocompleteRequests.delete(input);
  request.controller.abort(reason);
  request.adapter?.cancel?.({
    input,
    provider: request.provider,
    query: request.query,
    reason,
    requestId: request.requestId
  });
  setAdapterState(input, "cancelled", {
    channel: "autocomplete",
    message: "Search cancelled",
    provider: request.provider,
    query: request.query,
    reason,
    requestId: request.requestId
  });
  dispatchFrameworkEvent(input, "if:autocomplete-cancel", {
    provider: request.provider,
    query: request.query,
    reason,
    requestId: request.requestId,
    autocomplete: getAutocompleteState(input)
  });
  if (options.render) {
    renderAutocompleteItems(input, [], request.query, "cancelled", {
      title: "Search cancelled",
      message: "The pending adapter request was aborted before it returned."
    });
  }
  return true;
}

function closeAutocomplete(input, options = {}) {
  if (options.cancel !== false) cancelAutocomplete(input, "dismissed");
  const menu = getAutocompleteMenu(input);
  if (!menu) return;
  menu.hidden = true;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
  input.dataset.ifAutocompleteResultState = "closed";
}

function getAutocompleteStateCopy(state, options = {}) {
  const defaults = {
    loading: {
      icon: "sync",
      title: "Searching policy intelligence...",
      message: "Adapter request in progress. New input will cancel this request."
    },
    empty: {
      icon: "search",
      title: "No matches found",
      message: "Try a policy ID, source, organization, claim, or obligation."
    },
    error: {
      icon: "warning",
      title: "Search unavailable",
      message: "The adapter returned an error. Try again or inspect the source service."
    },
    cancelled: {
      icon: "pause",
      title: "Search cancelled",
      message: "The pending adapter request was aborted before it returned."
    }
  };
  return { ...(defaults[state] || defaults.empty), ...options };
}

function renderAutocompleteItems(input, items, query, state = "", options = {}) {
  const menu = getAutocompleteMenu(input);
  if (!menu) return;
  const adapterState = state
    ? normalizeAdapterState(state, state === "results" ? "success" : state)
    : normalizeAdapterState(items.length ? "success" : "empty");
  setAdapterState(input, adapterState, {
    channel: "autocomplete",
    items,
    message: options.message || options.title || "",
    provider: getAutocompleteProvider(input),
    query
  });
  const inputId = input.id || `if-autocomplete-${Math.random().toString(36).slice(2)}`;
  input.id = inputId;
  menu.id = `${inputId}-menu`;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", menu.id);
  input.setAttribute("aria-expanded", "true");
  menu.hidden = false;

  if (state && state !== "results") {
    const copy = getAutocompleteStateCopy(state, options);
    const role = state === "error" ? "alert" : "status";
    const media = state === "loading"
      ? `<span class="if-loading-dot" aria-hidden="true"></span>`
      : `<span class="if-autocomplete__state-icon if-icon-slot" data-if-icon="${escapeHtml(copy.icon)}" aria-hidden="true"></span>`;
    menu.innerHTML = `
      <div class="if-autocomplete__state if-autocomplete__state--${escapeHtml(state)}" role="${role}">
        ${media}
        <span><strong>${escapeHtml(copy.title)}</strong><span>${escapeHtml(copy.message)}</span></span>
      </div>
    `;
    hydrateIcons(menu);
    input.removeAttribute("aria-activedescendant");
    input.dataset.ifAutocompleteResultState = state;
    dispatchFrameworkEvent(input, "if:autocomplete-state", {
      state,
      adapterState,
      query,
      provider: getAutocompleteProvider(input),
      items: [],
      autocomplete: getAutocompleteState(input)
    });
    return getAutocompleteState(input);
  }

  if (!items.length) {
    renderAutocompleteItems(input, [], query, "empty", options);
    return;
  }

  menu.innerHTML = items.map((item, index) => {
    const value = escapeHtml(item.value || item.label);
    const label = highlightAutocompleteMatch(item.label, query);
    const meta = item.meta ? highlightAutocompleteMatch(item.meta, query) : "";
    return `
      <button class="if-autocomplete__option${index === 0 ? " is-active" : ""}" type="button" role="option" id="${inputId}-option-${index}" data-if-autocomplete-option data-value="${value}" data-label="${escapeHtml(item.label)}" data-meta="${escapeHtml(item.meta || "")}" data-type="${escapeHtml(item.type || "")}" data-id="${escapeHtml(item.id || "")}">
        <span class="if-autocomplete__option-main">
          <span class="if-autocomplete__label">${label}</span>
          ${item.type ? `<span class="if-badge">${escapeHtml(item.type)}</span>` : ""}
        </span>
        ${meta || item.id ? `<small>${meta}${item.id ? ` <span>${escapeHtml(item.id)}</span>` : ""}</small>` : ""}
      </button>
    `;
  }).join("");
  input.setAttribute("aria-activedescendant", `${inputId}-option-0`);
  input.dataset.ifAutocompleteResultState = "results";
  dispatchFrameworkEvent(input, "if:autocomplete-state", {
    state: "results",
    adapterState: "success",
    query,
    provider: getAutocompleteProvider(input),
    items,
    autocomplete: getAutocompleteState(input)
  });
  return getAutocompleteState(input);
}

function renderAutocomplete(input) {
  const menu = getAutocompleteMenu(input);
  if (!menu) return null;
  const query = input.value.trim();
  const normalizedQuery = query.toLowerCase();
  const remoteProvider = getAutocompleteProvider(input);
  if (remoteProvider) {
    const minLength = Number(input.dataset.ifAutocompleteMin || 1);
    if (query.length < minLength) {
      closeAutocomplete(input);
      return getAutocompleteState(input);
    }
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const limit = Number(input.dataset.ifAutocompleteLimit || 8);
    const adapter = getAutocompleteAdapter(remoteProvider);
    cancelAutocomplete(input, "superseded");
    if (!adapter) {
      renderAutocompleteItems(input, [], query, "error", {
        title: "Adapter not registered",
        message: `No autocomplete adapter is registered for "${remoteProvider}".`
      });
      dispatchFrameworkEvent(input, "if:autocomplete-error", {
        provider: remoteProvider,
        query,
        error: "Adapter not registered",
        autocomplete: getAutocompleteState(input)
      });
      return getAutocompleteState(input);
    }
    const controller = new AbortController();
    autocompleteRequests.set(input, {
      adapter,
      controller,
      provider: remoteProvider,
      query,
      requestId
    });
    input.dataset.ifAutocompleteRequest = requestId;
    renderAutocompleteItems(input, [], query, "loading");
    dispatchFrameworkEvent(input, "if:autocomplete-request", {
      provider: remoteProvider,
      query,
      limit,
      requestId,
      signal: controller.signal,
      autocomplete: getAutocompleteState(input)
    });
    Promise.resolve(adapter.search({
      input,
      provider: remoteProvider,
      query,
      limit,
      requestId,
      signal: controller.signal
    })).then((result) => {
      const current = autocompleteRequests.get(input);
      if (!current || current.requestId !== requestId || controller.signal.aborted) return;
      autocompleteRequests.delete(input);
      const normalized = normalizeAutocompleteResult(result, limit);
      renderAutocompleteItems(input, normalized.items, query, normalized.state, {
        title: normalized.title,
        message: normalized.message
      });
      input.dispatchEvent(new CustomEvent("if:autocomplete-results", {
        bubbles: true,
        detail: {
          query,
          provider: remoteProvider,
          items: normalized.items,
          state: normalized.state,
          meta: normalized.meta,
          requestId,
          autocomplete: getAutocompleteState(input)
        }
      }));
    }).catch((error) => {
      const current = autocompleteRequests.get(input);
      if (!current || current.requestId !== requestId) return;
      autocompleteRequests.delete(input);
      if (isAbortError(error) || controller.signal.aborted) {
        setAdapterState(input, "cancelled", {
          channel: "autocomplete",
          message: "Search request cancelled",
          provider: remoteProvider,
          query,
          requestId
        });
        dispatchFrameworkEvent(input, "if:autocomplete-cancel", {
          provider: remoteProvider,
          query,
          reason: "aborted",
          requestId,
          autocomplete: getAutocompleteState(input)
        });
        return;
      }
      renderAutocompleteItems(input, [], query, "error", {
        title: input.dataset.ifAutocompleteErrorTitle || "Search adapter failed",
        message: error?.message || "The remote search adapter returned an error."
      });
      dispatchFrameworkEvent(input, "if:autocomplete-error", {
        provider: remoteProvider,
        query,
        requestId,
        error,
        autocomplete: getAutocompleteState(input)
      });
    });
    return getAutocompleteState(input);
  }
  cancelAutocomplete(input, "local");
  const items = getAutocompleteItems(input)
    .filter((item) => !normalizedQuery || `${item.label} ${item.meta || ""}`.toLowerCase().includes(normalizedQuery))
    .slice(0, Number(input.dataset.ifAutocompleteLimit || 6));

  if (!items.length) {
    closeAutocomplete(input);
    return getAutocompleteState(input);
  }
  return renderAutocompleteItems(input, items, query);
}

function selectAutocompleteOption(option) {
  const wrapper = option.closest(".if-autocomplete") || option.closest(".if-search") || option.parentElement;
  const input = getAutocompleteInput(wrapper);
  if (!input) return null;
  input.value = option.dataset.value || option.textContent.trim();
  input.dataset.ifAutocompleteSelected = option.dataset.id || option.dataset.value || option.dataset.label || input.value;
  const outputSelector = input.dataset.ifAutocompleteOutput;
  if (outputSelector) {
    const output = qs(outputSelector);
    if (output) {
      output.innerHTML = `
        <span class="if-autocomplete-summary__eyebrow">Selected suggestion</span>
        <strong>${escapeHtml(option.dataset.label || input.value)}</strong>
        <span>${escapeHtml([option.dataset.type, option.dataset.meta, option.dataset.id].filter(Boolean).join(" - "))}</span>
      `;
    }
  }
  const selectionInputEvent = new Event("input", { bubbles: true });
  selectionInputEvent.__ifAutocompleteSelection = true;
  input.dispatchEvent(selectionInputEvent);
  input.dispatchEvent(new CustomEvent("if:autocomplete-select", {
    bubbles: true,
    detail: {
      value: input.value,
      label: option.dataset.label || input.value,
      meta: option.dataset.meta || "",
      type: option.dataset.type || "",
      id: option.dataset.id || "",
      autocomplete: getAutocompleteState(input)
    }
  }));
  closeAutocomplete(input, { cancel: false });
  input.focus({ preventScroll: true });
  return getAutocompleteState(input);
}

function moveAutocomplete(input, direction) {
  const menu = getAutocompleteMenu(input);
  const options = menu ? qsa("[data-if-autocomplete-option]", menu) : [];
  if (!options.length || menu.hidden) {
    renderAutocomplete(input);
    return;
  }
  const current = options.findIndex((option) => option.classList.contains("is-active"));
  const nextIndex = (current + direction + options.length) % options.length;
  options.forEach((option, index) => option.classList.toggle("is-active", index === nextIndex));
  input.setAttribute("aria-activedescendant", options[nextIndex].id);
  return getAutocompleteState(input);
}

function hydrateAutocompleteInputs(root = document) {
  const inputs = root?.matches?.("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]")
    ? [root, ...qsa("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]", root)]
    : qsa("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]", root);
  inputs.forEach((input) => {
    input.setAttribute("autocomplete", "off");
    if (!input.hasAttribute("aria-expanded")) input.setAttribute("aria-expanded", "false");
    if (!input.hasAttribute("role")) input.setAttribute("role", "combobox");
    if (!input.hasAttribute("aria-autocomplete")) input.setAttribute("aria-autocomplete", "list");
  });
  return inputs;
}

function selectGraphNode(node) {
  const graph = node.closest("[data-if-graph]");
  if (!graph) return;
  const id = node.dataset.nodeId;
  graph.dataset.graphSelection = "node";
  setFocusSurfaceActive(graph, true, { id, item: node, kind: "graph-node" });
  qsa(".if-graph-node", graph).forEach((item) => {
    const selected = item === node;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-selected", String(selected));
  });
  qsa("[data-edge-label-from][data-edge-label-to]", graph).forEach((label) => {
    label.classList.remove("is-selected");
    label.setAttribute("aria-pressed", "false");
  });

  qsa("[data-node-panel]", graph).forEach((panel) => {
    const selected = panel.dataset.nodePanel === id;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
  qsa("[data-edge-panel]", graph).forEach((panel) => {
    panel.hidden = true;
    panel.classList.remove("is-active");
  });

  qsa("[data-edge-from][data-edge-to]", graph).forEach((edge) => {
    const related = edge.dataset.edgeFrom === id || edge.dataset.edgeTo === id;
    edge.classList.toggle("is-related", related);
    edge.classList.toggle("is-muted", !related);
  });

  qsa("[data-edge-label-from][data-edge-label-to]", graph).forEach((label) => {
    const related = label.dataset.edgeLabelFrom === id || label.dataset.edgeLabelTo === id;
    label.classList.toggle("is-related", related);
    label.classList.toggle("is-muted", !related);
  });

  qsa(".if-graph-node[data-node-id]", graph).forEach((item) => {
    const itemId = item.dataset.nodeId;
    const related = itemId === id || qsa("[data-edge-from][data-edge-to]", graph).some((edge) => {
      if (edge.hidden) return false;
      return (edge.dataset.edgeFrom === id && edge.dataset.edgeTo === itemId) || (edge.dataset.edgeTo === id && edge.dataset.edgeFrom === itemId);
    });
    item.classList.toggle("is-related", related);
    item.classList.toggle("is-muted", !related);
  });

  updateGraphSvgEdgeLabels(graph);
  graph.dispatchEvent(new CustomEvent("if:graph-node-select", {
    bubbles: true,
    detail: { id, node }
  }));
  updateGraphStatus(graph);
  updateGraphMinimap(graph);
}

function resetGraphFocus(graph) {
  if (!graph) return;
  const seed = qs(".if-graph-node--primary[data-node-id], .if-graph-node[data-node-id='seed'], .if-graph-node[data-node-id]", graph);
  graph.dataset.graphSelection = "reset";
  qsa(".if-graph-node[data-node-id]", graph).forEach((node) => {
    const selected = node === seed;
    node.classList.toggle("is-selected", selected);
    node.classList.remove("is-muted", "is-related");
    node.setAttribute("aria-selected", String(selected));
  });
  qsa("[data-edge-from][data-edge-to]", graph).forEach((edge) => {
    edge.classList.remove("is-selected", "is-muted", "is-related");
  });
  qsa("[data-edge-label-from][data-edge-label-to]", graph).forEach((label) => {
    label.classList.remove("is-selected", "is-muted", "is-related");
    label.setAttribute("aria-pressed", "false");
  });
  qsa("[data-edge-panel]", graph).forEach((panel) => {
    panel.hidden = true;
    panel.classList.remove("is-active");
  });
  qsa("[data-node-panel]", graph).forEach((panel) => {
    const selected = seed && panel.dataset.nodePanel === seed.dataset.nodeId;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
  if (seed) setGraphPath(graph, seed);
  hideGraphPeek(graph);
  hideGraphContextMenu(graph);
  setFocusSurfaceActive(graph, false, { kind: "graph", seed });
  updateGraphSvgEdgeLabels(graph);
  graph.dispatchEvent(new CustomEvent("if:graph-focus-reset", {
    bubbles: true,
    detail: { seed }
  }));
  updateGraphStatus(graph);
  updateGraphMinimap(graph);
}

function getGraphMode(graph) {
  return graph?.dataset.graphMode || "unified";
}

function setGraphMode(control) {
  const graph = control.closest("[data-if-graph]");
  if (!graph) return;
  const mode = control.dataset.ifGraphMode || "explore";
  graph.dataset.graphMode = mode;
  qsa("[data-if-graph-mode]", graph).forEach((button) => {
    const selected = button === control;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  qsa("[data-if-graph-mode-label]", graph).forEach((label) => {
    label.textContent = formatGraphLabel(mode);
  });
  graph.dispatchEvent(new CustomEvent("if:graph-mode", {
    bubbles: true,
    detail: { mode }
  }));
  updateGraphStatus(graph);
}

function updateGraphStatus(graph) {
  if (!graph) return;
  const visibleNodes = qsa(".if-graph-node[data-node-id]", graph).filter((node) => !node.hidden).length;
  const visibleEdges = qsa("[data-edge-from][data-edge-to]", graph).filter((edge) => !edge.hidden && !isInsideGraphA11y(edge)).length;
  const selectedNode = qs(".if-graph-node.is-selected[data-node-id]", graph);
  const selectedEdge = qsa("[data-if-graph-edge].is-selected, .if-edge-label.is-selected", graph)[0];
  const emptyLabel = graph.dataset.ifGraphEmptyLabel || "Seed context";
  const selectedLabel = selectedNode
    ? (selectedNode.dataset.nodeLabel || selectedNode.querySelector(".if-graph-node__title")?.textContent?.replace(/\s+/g, " ").trim())
    : selectedEdge
      ? `${formatGraphLabel(selectedEdge.dataset.edgeType)} edge`
      : emptyLabel;
  const statusScope = graph.closest(".if-graph-lab") || graph;
  qsa("[data-if-graph-status]", statusScope).forEach((item) => {
    const key = item.dataset.ifGraphStatus;
    if (key === "nodes") item.textContent = String(visibleNodes);
    if (key === "edges") item.textContent = String(visibleEdges);
    if (key === "selected") item.textContent = selectedLabel || emptyLabel;
    if (key === "mode") item.textContent = formatGraphLabel(getGraphMode(graph));
    if (key === "layout") item.textContent = formatGraphLabel(graph.dataset.graphLayout || "radial");
  });
  updateGraphA11yFallback(graph);
}

function formatGraphLabel(value) {
  return String(value || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setGraphPath(graph, node) {
  const target = qs("[data-if-graph-path]", graph);
  if (!target || !node) return;
  const label = node.dataset.nodeLabel || node.querySelector(".if-graph-node__title")?.textContent?.trim() || node.dataset.nodeId;
  const relation = node.dataset.nodeRelation ? formatGraphLabel(node.dataset.nodeRelation) : "Seed";
  const path = JSON.parse(graph.dataset.graphPath || "[]");
  const next = { id: node.dataset.nodeId, label, relation };
  const existingIndex = path.findIndex((item) => item.id === next.id);
  const compact = existingIndex >= 0 ? path.slice(0, existingIndex + 1) : [...path, next].slice(-5);
  graph.dataset.graphPath = JSON.stringify(compact);
  target.innerHTML = compact.map((item, index) => `
    <button class="if-graph-path__step${index === compact.length - 1 ? " is-current" : ""}" type="button" data-if-graph-traverse="${item.id}">
      <span>${formatGraphLabel(item.relation)}</span>
      <strong>${item.label}</strong>
    </button>
  `).join("");
}

function getGraphNodeLabel(graph, id) {
  const node = qs(`.if-graph-node[data-node-id="${id}"]`, graph);
  return node?.dataset.nodeLabel || node?.querySelector(".if-graph-node__title")?.textContent?.trim() || id;
}

function getGraphSurface(graphOrControl) {
  if (!graphOrControl) return null;
  if (typeof graphOrControl === "string") return qs(graphOrControl);
  if (graphOrControl.matches?.("[data-if-graph]")) return graphOrControl;
  return graphOrControl.closest?.("[data-if-graph]") || null;
}

function isInsideGraphA11y(element) {
  return Boolean(element?.closest?.("[data-if-graph-a11y]"));
}

function isGraphItemHidden(element) {
  return Boolean(element?.hidden || element?.getAttribute?.("aria-hidden") === "true" || element?.closest?.("[hidden]"));
}

function registerGraphLayoutEngine(name, engine) {
  if (!name || typeof engine !== "function") return false;
  graphLayoutEngines.set(String(name), engine);
  return true;
}

function unregisterGraphLayoutEngine(name) {
  return graphLayoutEngines.delete(String(name));
}

function builtInGraphLayoutEngine({ layout = "radial", options = {} } = {}) {
  const preset = graphLayouts[layout] || graphLayouts.radial;
  const transformed = transformGraphLayout(preset, options);
  return {
    coordinateSpace: "percent",
    layout,
    nodes: Object.entries(transformed).map(([id, [x, y]]) => ({ id, x, y }))
  };
}

function getGraphLayoutEngine(name = "built-in") {
  if (name === "built-in" || name === "preset" || name === "dom-preset") return builtInGraphLayoutEngine;
  return graphLayoutEngines.get(String(name));
}

function collectGraphLayoutInput(graphOrControl) {
  const graph = getGraphSurface(graphOrControl);
  if (!graph) return null;
  const nodes = qsa(".if-graph-node[data-node-id]", graph).map((node) => {
    const [x, y] = getGraphNodePosition(node);
    return {
      element: node,
      height: node.offsetHeight || 0,
      hidden: isGraphItemHidden(node),
      id: node.dataset.nodeId,
      kind: getGraphNodeKind(node),
      label: getGraphNodeLabel(graph, node.dataset.nodeId),
      relation: node.dataset.nodeRelation || "",
      width: node.offsetWidth || 0,
      x,
      y
    };
  });
  const seen = new Set();
  const edgeElements = [
    ...qsa("[data-if-graph-edge][data-edge-label-from][data-edge-label-to]", graph).filter((edge) => !isInsideGraphA11y(edge)),
    ...qsa(".if-graph-lines [data-edge-from][data-edge-to]", graph)
  ];
  const edges = edgeElements.reduce((items, edge) => {
    if (isInsideGraphA11y(edge)) return items;
    const from = edge.dataset.edgeLabelFrom || edge.dataset.edgeFrom;
    const to = edge.dataset.edgeLabelTo || edge.dataset.edgeTo;
    if (!from || !to) return items;
    const type = edge.dataset.edgeType || "relationship";
    const key = `${from}->${to}:${type}:${edge.dataset.clusterMember || ""}`;
    if (seen.has(key)) return items;
    seen.add(key);
    items.push({
      cluster: edge.dataset.clusterMember || "",
      confidence: edge.dataset.edgeConfidence || "",
      element: edge,
      from,
      hidden: isGraphItemHidden(edge),
      inferred: edge.dataset.edgeInferred === "true",
      label: edge.textContent?.replace(/\s+/g, " ").trim() || formatGraphLabel(type),
      to,
      type
    });
    return items;
  }, []);
  return {
    canvas: getGraphCanvas(graph),
    edges,
    graph,
    layout: graph.dataset.graphLayout || "radial",
    nodes,
    options: getGraphOrganizationOptions(graph)
  };
}

function getGraphState(graphOrControl) {
  const graph = getGraphSurface(graphOrControl);
  const input = collectGraphLayoutInput(graph);
  if (!input) return null;
  const selectedNode = qs(".if-graph-node.is-selected[data-node-id], .if-graph-node[aria-selected='true'][data-node-id]", graph);
  const selectedEdge = qs("[data-if-graph-edge].is-selected, .if-edge-label.is-selected", graph);
  return {
    edges: input.edges.length,
    hiddenEdges: input.edges.filter((edge) => edge.hidden).length,
    hiddenNodes: input.nodes.filter((node) => node.hidden).length,
    layout: graph.dataset.graphLayout || input.layout || "custom",
    mode: graph.dataset.graphMode || "explore",
    nodes: input.nodes.length,
    selectedEdge: selectedEdge ? {
      from: selectedEdge.dataset.edgeLabelFrom || selectedEdge.dataset.edgeFrom || "",
      to: selectedEdge.dataset.edgeLabelTo || selectedEdge.dataset.edgeTo || "",
      type: selectedEdge.dataset.edgeType || "relationship"
    } : null,
    selectedNode: selectedNode?.dataset.nodeId || "",
    visibleEdges: input.edges.filter((edge) => !edge.hidden).length,
    visibleNodes: input.nodes.filter((node) => !node.hidden).length
  };
}

function normalizeGraphDocument(config = {}) {
  const nodes = Array.isArray(config.nodes) ? config.nodes : [];
  const edges = Array.isArray(config.edges) ? config.edges : [];
  return {
    a11yLabel: config.a11yLabel || "Accessible graph fallback",
    canvasLabel: config.canvasLabel || "Graph canvas",
    edgeLabelMode: config.edgeLabelMode || "pill",
    emptyLabel: config.emptyLabel || "Graph",
    layout: config.layout || "custom",
    mode: config.mode || "unified",
    nodes: nodes.map((node, index) => ({
      id: node.id || `node-${index + 1}`,
      kind: node.kind || node.type || "policy",
      label: node.label || node.title || `Node ${index + 1}`,
      meta: node.meta || node.description || formatGraphLabel(node.kind || node.type || "node"),
      primary: Boolean(node.primary),
      relation: node.relation || "",
      x: Number.isFinite(Number(node.x)) ? Number(node.x) : 50,
      y: Number.isFinite(Number(node.y)) ? Number(node.y) : 50
    })),
    edges: edges.map((edge, index) => ({
      confidence: edge.confidence || "",
      evidence: edge.evidence || "",
      from: edge.from || edge.source || "",
      inferred: Boolean(edge.inferred),
      label: edge.label || formatGraphLabel(edge.type || "relationship"),
      to: edge.to || edge.target || "",
      type: edge.type || "relationship",
      id: edge.id || `edge-${index + 1}`
    })).filter((edge) => edge.from && edge.to),
    selected: config.selected || config.selectedNode || nodes.find((node) => node.selected)?.id || nodes[0]?.id || "",
    title: config.title || "Graph Explorer"
  };
}

function renderGraphNode(node) {
  return `
    <button class="if-graph-node${node.primary ? " if-graph-node--primary" : ""}" type="button"
      data-node-id="${escapeHtml(node.id)}"
      data-node-type="${escapeHtml(node.kind)}"
      data-node-kind="${escapeHtml(node.kind)}"
      data-node-label="${escapeHtml(node.label)}"
      ${node.relation ? `data-node-relation="${escapeHtml(node.relation)}"` : ""}
      style="--x:${escapeHtml(node.x)}%; --y:${escapeHtml(node.y)}%;">
      <span class="if-graph-node__icon if-icon-slot" data-if-icon="${escapeHtml(getGraphNodeTypeConfig(node.kind)?.icon || "graph")}" aria-hidden="true"></span>
      <span class="if-graph-node__title">${escapeHtml(node.label)}</span>
      <span class="if-graph-node__meta">${escapeHtml(node.meta)}</span>
    </button>
  `;
}

function renderGraphEdge(edge) {
  return `
    <path data-edge-from="${escapeHtml(edge.from)}" data-edge-to="${escapeHtml(edge.to)}" data-edge-type="${escapeHtml(edge.type)}" data-edge-confidence="${escapeHtml(edge.confidence)}" data-edge-inferred="${edge.inferred ? "true" : "false"}"></path>
  `;
}

function renderGraphEdgeLabel(edge) {
  return `
    <button class="if-edge-label" type="button"
      data-if-graph-edge
      data-edge-label-from="${escapeHtml(edge.from)}"
      data-edge-label-to="${escapeHtml(edge.to)}"
      data-edge-type="${escapeHtml(edge.type)}"
      data-edge-confidence="${escapeHtml(edge.confidence)}"
      data-edge-evidence="${escapeHtml(edge.evidence)}">
      ${escapeHtml(edge.label)}
    </button>
  `;
}

function renderGraphPanel(node) {
  return `
    <section class="if-panel" data-node-panel="${escapeHtml(node.id)}" hidden>
      <div class="if-panel__header">
        <div><h3 class="if-panel__title">${escapeHtml(node.label)}</h3><p class="if-panel__subtitle">${escapeHtml(node.meta)}</p></div>
        <span class="if-badge">${escapeHtml(formatGraphLabel(node.kind))}</span>
      </div>
      <div class="if-panel__body"><p class="if-text-sm if-m-0">Node id: <code>${escapeHtml(node.id)}</code></p></div>
    </section>
  `;
}

function renderGraph(graphOrSelector, config = {}) {
  const graph = getGraphSurface(graphOrSelector) || (typeof graphOrSelector === "string" ? qs(graphOrSelector) : graphOrSelector);
  if (!graph) return null;
  const model = normalizeGraphDocument(config);
  graph.dataset.ifGraphRendered = "true";
  graph.dataset.graphLayout = model.layout;
  graph.dataset.graphMode = model.mode;
  graph.dataset.graphEdgeLabelMode = model.edgeLabelMode;
  graph.dataset.ifGraphEmptyLabel = model.emptyLabel;
  graph.replaceChildren();
  graph.innerHTML = `
    <div class="if-graph-toolbar">
      <div class="if-toolbar__group">
        <button class="if-btn if-btn--secondary if-btn--sm is-active" type="button" data-if-graph-mode="${escapeHtml(model.mode)}" aria-pressed="true">${escapeHtml(formatGraphLabel(model.mode))}</button>
        <span class="if-badge">Nodes <strong data-if-graph-status="nodes">${model.nodes.length}</strong></span>
        <span class="if-badge">Edges <strong data-if-graph-status="edges">${model.edges.length}</strong></span>
      </div>
      <div class="if-toolbar__group">
        <button class="if-icon-btn if-icon-btn--sm" type="button" title="Zoom out" data-if-graph-viewport="out"><span aria-hidden="true">-</span></button>
        <span class="if-badge" data-if-graph-zoom-label>100%</span>
        <button class="if-icon-btn if-icon-btn--sm" type="button" title="Zoom in" data-if-graph-viewport="in"><span aria-hidden="true">+</span></button>
        <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-graph-viewport="fit">Fit</button>
      </div>
    </div>
    <div class="if-graph-path" data-if-graph-path aria-label="Traversal path"></div>
    <div class="if-graph-canvas" aria-label="${escapeHtml(model.canvasLabel)}">
      <div class="if-graph-viewport" data-if-graph-viewport>
        <svg class="if-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${model.edges.map(renderGraphEdge).join("")}
        </svg>
        ${model.edges.map(renderGraphEdgeLabel).join("")}
        ${model.nodes.map(renderGraphNode).join("")}
      </div>
    </div>
    <section class="if-panel if-graph-a11y" data-if-graph-a11y aria-label="${escapeHtml(model.a11yLabel)}">
      <p class="if-graph-a11y__summary" data-if-graph-a11y-summary></p>
      <div class="if-graph-a11y__grid">
        <section class="if-graph-a11y__section"><h3>Nodes</h3><ol class="if-graph-a11y__list" data-if-graph-a11y-nodes></ol></section>
        <section class="if-graph-a11y__section"><h3>Relationships</h3><ol class="if-graph-a11y__list" data-if-graph-a11y-edges></ol></section>
      </div>
    </section>
    <div class="if-grid if-grid--auto-md if-gap-3">
      ${model.nodes.map(renderGraphPanel).join("")}
      <section class="if-panel" data-edge-panel hidden></section>
    </div>
  `;
  hydrateIcons(graph);
  applyGraphNodeTypes(graph);
  refreshGraphGeometry(graph);
  updateGraphA11yFallback(graph);
  const selected = model.selected ? qs(`.if-graph-node[data-node-id="${escapeCssIdentifier(model.selected)}"]`, graph) : qs(".if-graph-node[data-node-id]", graph);
  if (selected) selectGraphNode(selected);
  updateGraphStatus(graph);
  return graph;
}

function getGraphConfig(graph) {
  const sourceSelector = graph?.getAttribute?.("data-if-graph-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || graph?.getAttribute?.("data-if-graph-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid graph JSON", error);
    return null;
  }
}

function hydrateGraph(graph) {
  if (!graph) return;
  const config = graph.dataset.ifGraphRendered === "true" ? null : getGraphConfig(graph);
  if (config) renderGraph(graph, config);
}

function normalizeGraphLayoutNodes(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.nodes)) return result.nodes;
  const source = result?.positions || result?.nodes;
  if (!source || typeof source !== "object") return [];
  return Object.entries(source).map(([id, value]) => {
    if (Array.isArray(value)) return { id, x: value[0], y: value[1] };
    return { id, ...value };
  });
}

function normalizeGraphLayoutCoordinate(value, axis, result, graph) {
  const numeric = Number.parseFloat(String(value).replace("%", ""));
  if (!Number.isFinite(numeric)) return null;
  if (result?.coordinateSpace === "unit") return numeric * 100;
  if (result?.coordinateSpace === "pixel") {
    const rect = getGraphCanvas(graph)?.getBoundingClientRect?.();
    const size = axis === "x" ? rect?.width : rect?.height;
    return size ? numeric / size * 100 : numeric;
  }
  return numeric;
}

function applyGraphLayoutResult(graphOrControl, result = {}, options = {}) {
  const graph = getGraphSurface(graphOrControl);
  if (!graph || !result) return null;
  const nodes = normalizeGraphLayoutNodes(result);
  nodes.forEach((item) => {
    const id = item.id || item.nodeId;
    if (!id) return;
    const x = normalizeGraphLayoutCoordinate(item.x, "x", result, graph);
    const y = normalizeGraphLayoutCoordinate(item.y, "y", result, graph);
    if (x === null || y === null) return;
    const node = qs(`.if-graph-node[data-node-id="${id}"]`, graph);
    if (node) setGraphNodePosition(node, x, y);
  });
  if (options.deconflict !== false) {
    deconflictGraphNodes(graph, null, {
      passes: Number(options.deconflictPasses || 7),
      strength: Number(options.deconflictStrength || 0.48)
    });
  }
  if (result.view) applyGraphView(getGraphCanvas(graph), result.view);
  refreshGraphGeometry(graph);
  if (!options.preserveView && !result.view) resetGraphView(getGraphCanvas(graph));
  updateGraphStatus(graph);
  dispatchFrameworkEvent(graph, "if:graph-layout-apply", {
    engine: options.engine || result.engine || graph.dataset.ifGraphLayoutEngine || "built-in",
    layout: options.layout || result.layout || graph.dataset.graphLayout || "radial",
    nodes: nodes.length,
    result
  });
  return result;
}

function runGraphLayoutEngine(graphOrControl, engineOrOptions = {}, maybeOptions = {}) {
  const graph = getGraphSurface(graphOrControl);
  if (!graph) return Promise.resolve(null);
  const runOptions = typeof engineOrOptions === "string" ? maybeOptions : (engineOrOptions || {});
  const engineName = typeof engineOrOptions === "string"
    ? engineOrOptions
    : (runOptions.engine || graph.dataset.ifGraphLayoutEngine || "built-in");
  const engine = getGraphLayoutEngine(engineName);
  if (!engine) {
    graph.dataset.ifGraphLayoutState = "error";
    setAdapterState(graph, "error", {
      channel: "graph-layout",
      engine: engineName,
      message: `Unknown graph layout engine: ${engineName}`
    });
    dispatchFrameworkEvent(graph, "if:graph-layout-error", { engine: engineName, error: `Unknown graph layout engine: ${engineName}` });
    return Promise.resolve(null);
  }
  const previous = graphLayoutRequests.get(graph);
  if (previous?.controller) {
    previous.controller.abort();
    dispatchFrameworkEvent(graph, "if:graph-layout-cancel", { engine: previous.engine, requestId: previous.requestId, reason: "replaced" });
  }
  const controller = new AbortController();
  const requestId = `${engineName}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
  graphLayoutRequests.set(graph, { controller, engine: engineName, requestId });
  graph.dataset.ifGraphLayoutState = "loading";
  setAdapterState(graph, "loading", {
    channel: "graph-layout",
    engine: engineName,
    message: "Running graph layout...",
    requestId
  });
  const input = collectGraphLayoutInput(graph);
  const params = {
    ...input,
    engine: engineName,
    layout: runOptions.layout || input?.layout || "radial",
    options: { ...(input?.options || {}), ...(runOptions.options || {}) },
    requestId,
    signal: controller.signal
  };
  dispatchFrameworkEvent(graph, "if:graph-layout-request", {
    engine: engineName,
    layout: params.layout,
    nodes: params.nodes?.length || 0,
    edges: params.edges?.length || 0,
    requestId
  });
  return Promise.resolve()
    .then(() => engine(params))
    .then((result) => {
      if (controller.signal.aborted) {
        graph.dataset.ifGraphLayoutState = "cancelled";
        setAdapterState(graph, "cancelled", {
          channel: "graph-layout",
          engine: engineName,
          message: "Graph layout cancelled",
          requestId
        });
        return null;
      }
      const applied = applyGraphLayoutResult(graph, result, {
        ...runOptions,
        engine: engineName,
        layout: params.layout,
        preserveView: runOptions.preserveView
      });
      const appliedNodes = normalizeGraphLayoutNodes(applied || result || {});
      const state = normalizeAdapterState(result?.state, appliedNodes.length ? "success" : "empty");
      graph.dataset.ifGraphLayoutState = state;
      setAdapterState(graph, state, {
        channel: "graph-layout",
        engine: engineName,
        message: state === "empty" ? "Layout returned no nodes" : `${appliedNodes.length} nodes positioned`,
        requestId
      });
      dispatchFrameworkEvent(graph, "if:graph-layout-result", {
        engine: engineName,
        layout: params.layout,
        requestId,
        result: applied
      });
      return applied;
    })
    .catch((error) => {
      if (controller.signal.aborted) {
        graph.dataset.ifGraphLayoutState = "cancelled";
        setAdapterState(graph, "cancelled", {
          channel: "graph-layout",
          engine: engineName,
          message: "Graph layout cancelled",
          requestId
        });
        dispatchFrameworkEvent(graph, "if:graph-layout-cancel", { engine: engineName, requestId, reason: "aborted" });
        return null;
      }
      graph.dataset.ifGraphLayoutState = "error";
      setAdapterState(graph, "error", {
        channel: "graph-layout",
        engine: engineName,
        message: error?.message || "Graph layout failed",
        requestId
      });
      dispatchFrameworkEvent(graph, "if:graph-layout-error", { engine: engineName, requestId, error });
      return null;
    })
    .finally(() => {
      if (graphLayoutRequests.get(graph)?.requestId === requestId) graphLayoutRequests.delete(graph);
    });
}

function updateGraphA11yFallback(graphOrControl) {
  const graph = getGraphSurface(graphOrControl);
  if (!graph) return;
  const fallback = qs("[data-if-graph-a11y]", graph);
  if (!fallback) return;
  const input = collectGraphLayoutInput(graph);
  if (!input) return;
  const visibleNodeIds = new Set(input.nodes.filter((node) => !node.hidden).map((node) => node.id));
  const visibleEdges = input.edges.filter((edge) => !edge.hidden && visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));
  const visibleNodes = input.nodes.filter((node) => !node.hidden);
  const summary = qs("[data-if-graph-a11y-summary]", fallback);
  if (summary) {
    summary.textContent = `${visibleNodes.length} visible nodes, ${visibleEdges.length} visible relationships. Keyboard users can traverse nodes or inspect relationship evidence from this index.`;
  }
  const nodeList = qs("[data-if-graph-a11y-nodes]", fallback);
  if (nodeList) {
    nodeList.innerHTML = visibleNodes.map((node) => `
      <li class="if-graph-a11y__item">
        <button class="if-graph-a11y__action" type="button" data-if-graph-traverse="${escapeHtml(node.id)}">
          <strong>${escapeHtml(node.label)}</strong>
          <span>${escapeHtml(formatGraphLabel(node.kind))}${node.relation ? ` - ${escapeHtml(formatGraphLabel(node.relation))}` : ""}</span>
        </button>
      </li>
    `).join("");
  }
  const edgeList = qs("[data-if-graph-a11y-edges]", fallback);
  if (edgeList) {
    edgeList.innerHTML = visibleEdges.map((edge) => `
      <li class="if-graph-a11y__item">
        <button class="if-graph-a11y__action" type="button"
          data-if-graph-edge
          data-edge-label-from="${escapeHtml(edge.from)}"
          data-edge-label-to="${escapeHtml(edge.to)}"
          data-edge-type="${escapeHtml(edge.type)}"
          data-edge-confidence="${escapeHtml(edge.confidence || "")}">
          <strong>${escapeHtml(formatGraphLabel(edge.type))}</strong>
          <span>${escapeHtml(getGraphNodeLabel(graph, edge.from))} to ${escapeHtml(getGraphNodeLabel(graph, edge.to))}${edge.inferred ? " - inferred" : ""}</span>
        </button>
      </li>
    `).join("");
  }
}

function selectGraphEdge(control) {
  const graph = control.closest("[data-if-graph]");
  if (!graph) return;
  graph.dataset.graphSelection = "edge";
  const from = control.dataset.edgeLabelFrom || control.dataset.edgeFrom;
  const to = control.dataset.edgeLabelTo || control.dataset.edgeTo;
  const type = control.dataset.edgeType || "relationship";
  const edgeKey = `${from}:${to}:${type}`;
  setFocusSurfaceActive(graph, true, { edgeKey, item: control, kind: "graph-edge" });

  qsa(".if-graph-node", graph).forEach((node) => {
    const related = node.dataset.nodeId === from || node.dataset.nodeId === to;
    node.classList.toggle("is-related", related);
    node.classList.toggle("is-muted", !related);
    node.classList.remove("is-selected");
    node.setAttribute("aria-selected", "false");
  });

  qsa("[data-edge-from][data-edge-to]", graph).forEach((edge) => {
    const selected = edge.dataset.edgeFrom === from && edge.dataset.edgeTo === to && edge.dataset.edgeType === type;
    const related = edge.dataset.edgeFrom === from || edge.dataset.edgeTo === from || edge.dataset.edgeFrom === to || edge.dataset.edgeTo === to;
    edge.classList.toggle("is-selected", selected);
    edge.classList.toggle("is-related", selected || related);
    edge.classList.toggle("is-muted", !selected && !related);
  });

  qsa("[data-edge-label-from][data-edge-label-to]", graph).forEach((label) => {
    const matchesEdge = label.dataset.edgeLabelFrom === from && label.dataset.edgeLabelTo === to && label.dataset.edgeType === type;
    const selected = label === control || (matchesEdge && !isInsideGraphA11y(label));
    const related = label.dataset.edgeLabelFrom === from || label.dataset.edgeLabelTo === from || label.dataset.edgeLabelFrom === to || label.dataset.edgeLabelTo === to;
    label.classList.toggle("is-selected", selected);
    label.classList.toggle("is-related", selected || related);
    label.classList.toggle("is-muted", !selected && !related);
    label.setAttribute("aria-pressed", String(selected));
  });

  qsa("[data-node-panel]", graph).forEach((panel) => {
    panel.hidden = true;
    panel.classList.remove("is-active");
  });

  const panel = qs("[data-edge-panel]", graph);
  if (panel) {
    panel.hidden = false;
    panel.classList.add("is-active");
    const confidence = control.dataset.edgeConfidence || "0.79";
    const evidence = control.dataset.edgeEvidence || "Relationship generated from source metadata, citation proximity, and agent review signals.";
    const rule = control.dataset.edgeRule;
    const review = control.dataset.edgeReview;
    const storage = control.dataset.edgeStorage;
    panel.innerHTML = `
      <div class="if-panel__header">
        <div>
          <h2 class="if-panel__title">${formatGraphLabel(type)} Connection</h2>
          <p class="if-panel__subtitle">${getGraphNodeLabel(graph, from)} to ${getGraphNodeLabel(graph, to)}</p>
        </div>
        <span class="if-badge if-badge--info">Edge</span>
        <button class="if-icon-btn if-icon-btn--sm" type="button" data-if-focus-clear aria-label="Close details" title="Close details"><span class="if-icon-slot" data-if-icon="close" aria-hidden="true"></span></button>
      </div>
      <div class="if-panel__body if-stack">
        <div class="if-graph-edge-summary">
          <div><span>From</span><strong>${getGraphNodeLabel(graph, from)}</strong></div>
          <span class="if-graph-edge-summary__arrow" aria-hidden="true"></span>
          <div><span>To</span><strong>${getGraphNodeLabel(graph, to)}</strong></div>
        </div>
        <div class="if-confidence">
          <div class="if-confidence__label"><span>Relationship confidence</span><strong>${confidence}</strong></div>
          <div class="if-confidence__bar" style="--value: ${Math.round(Number(confidence) * 100) || 79}%;"></div>
        </div>
        <div class="if-evidence-panel"><h3 class="if-card__title">Evidence</h3><p>${evidence}</p></div>
        ${rule || review || storage ? `
          <dl class="if-meta-grid if-meta-grid--dense">
            ${rule ? `<div class="if-kv"><dt>Evidence rule</dt><dd>${rule}</dd></div>` : ""}
            ${review ? `<div class="if-kv"><dt>Review rule</dt><dd>${review}</dd></div>` : ""}
            ${storage ? `<div class="if-kv"><dt>Canonical storage</dt><dd>${storage}</dd></div>` : ""}
          </dl>
        ` : ""}
        <div class="if-toolbar">
          <button class="if-btn if-btn--secondary" type="button" data-if-graph-traverse="${from}">Go to source</button>
          <button class="if-btn if-btn--primary" type="button" data-if-graph-traverse="${to}">Traverse target</button>
        </div>
      </div>
    `;
    hydrateIcons(panel);
  }

  updateGraphSvgEdgeLabels(graph);
  graph.dispatchEvent(new CustomEvent("if:graph-edge-select", {
    bubbles: true,
    detail: { from, to, type, edgeKey }
  }));
  updateGraphStatus(graph);
}

function collectGraphTrace(graph, seedId, direction = "both") {
  const edges = qsa("[data-edge-from][data-edge-to]", graph).filter((edge) => !edge.hidden);
  const nodeIds = new Set([seedId]);
  const edgeKeys = new Set();
  const queue = [seedId];

  while (queue.length) {
    const current = queue.shift();
    edges.forEach((edge) => {
      const from = edge.dataset.edgeFrom;
      const to = edge.dataset.edgeTo;
      const edgeKey = `${from}:${to}:${edge.dataset.edgeType || "relationship"}`;
      let next = null;
      if ((direction === "downstream" || direction === "both") && from === current) next = to;
      if ((direction === "upstream" || direction === "both") && to === current) next = from;
      if (!next) return;
      edgeKeys.add(edgeKey);
      if (!nodeIds.has(next)) {
        nodeIds.add(next);
        queue.push(next);
      }
    });
  }

  return { edgeKeys, nodeIds };
}

function traceGraphFrom(control) {
  const graph = control.closest("[data-if-graph]");
  if (!graph) return;
  const id = control.dataset.ifGraphTraceNode || control.dataset.ifGraphTraverse;
  const direction = control.dataset.ifGraphTrace || "both";
  const seed = qs(`.if-graph-node[data-node-id="${id}"]`, graph);
  if (!seed) return;
  selectGraphNode(seed);
  const trace = collectGraphTrace(graph, id, direction);
  graph.dataset.graphSelection = `trace-${direction}`;

  qsa(".if-graph-node[data-node-id]", graph).forEach((node) => {
    const selected = node.dataset.nodeId === id;
    const related = trace.nodeIds.has(node.dataset.nodeId);
    node.classList.toggle("is-selected", selected);
    node.classList.toggle("is-related", related);
    node.classList.toggle("is-muted", !related);
    node.setAttribute("aria-selected", String(selected));
  });

  qsa("[data-edge-from][data-edge-to]", graph).forEach((edge) => {
    const key = `${edge.dataset.edgeFrom}:${edge.dataset.edgeTo}:${edge.dataset.edgeType || "relationship"}`;
    const traced = trace.edgeKeys.has(key);
    edge.classList.toggle("is-selected", traced);
    edge.classList.toggle("is-related", traced);
    edge.classList.toggle("is-muted", !traced);
  });

  qsa("[data-edge-label-from][data-edge-label-to]", graph).forEach((label) => {
    const key = `${label.dataset.edgeLabelFrom}:${label.dataset.edgeLabelTo}:${label.dataset.edgeType || "relationship"}`;
    const traced = trace.edgeKeys.has(key);
    label.classList.toggle("is-selected", traced);
    label.classList.toggle("is-related", traced);
    label.classList.toggle("is-muted", !traced);
    label.setAttribute("aria-pressed", String(traced));
  });

  graph.dispatchEvent(new CustomEvent("if:graph-trace", {
    bubbles: true,
    detail: { direction, edgeCount: trace.edgeKeys.size, id, nodeCount: trace.nodeIds.size }
  }));
  updateGraphStatus(graph);
}

function getPolicyDiff(diff) {
  return typeof diff === "string" ? qs(diff) : diff;
}

function getPolicyDiffChanges(diff) {
  return qsa("[data-if-diff-change]", getPolicyDiff(diff));
}

function getSelectedPolicyDiffChange(diff) {
  const root = getPolicyDiff(diff);
  return qs("[data-if-diff-change].is-selected", root) || qs("[data-if-diff-change][aria-selected='true']", root) || getPolicyDiffChanges(root)[0] || null;
}

function getPolicyDiffStatusClass(status = "Open") {
  const normalized = String(status).trim().toLowerCase();
  if (["approved", "accepted"].includes(normalized)) return "if-badge--status-approved";
  if (["rejected", "blocked", "conflict"].includes(normalized)) return "if-badge--risk-high";
  if (["needs evidence", "needs-evidence", "review", "in review"].includes(normalized)) return "if-badge--status-in-review";
  return "if-badge--status-open";
}

function setPolicyDiffStatus(change, status = "Open") {
  if (!change) return;
  const target = qs("[data-if-diff-status]", change);
  if (!target) return;
  target.textContent = status;
  target.className = `if-badge ${getPolicyDiffStatusClass(status)}`;
}

function getPolicyDiffState(diff) {
  const root = getPolicyDiff(diff);
  const changes = getPolicyDiffChanges(root);
  const selected = getSelectedPolicyDiffChange(root);
  return {
    count: changes.length,
    decision: selected?.dataset.decision || "",
    decisions: changes.reduce((state, change) => {
      state[change.dataset.ifDiffChange] = change.dataset.decision || "";
      return state;
    }, {}),
    index: selected ? changes.indexOf(selected) : -1,
    selectedChange: selected?.dataset.ifDiffChange || ""
  };
}

function getPolicyDiffLineHtml(line = {}, fallbackKind = "") {
  const value = typeof line === "string" ? { text: line } : line;
  const kind = value.kind || fallbackKind;
  const kindClass = kind ? ` if-policy-diff__line--${escapeHtml(kind)}` : "";
  const label = kind ? `<span class="if-policy-diff__line-state">${escapeHtml(kind)}</span>` : "";
  return `
    <div class="if-policy-diff__line${kindClass}">
      <span class="if-policy-diff__line-number">${escapeHtml(value.line || "")}</span>
      <span>${label}${escapeHtml(value.text || "")}</span>
    </div>
  `;
}

function normalizePolicyDiffChange(change, index) {
  return {
    current: change.current || { line: change.line || index + 1, text: change.before || "", kind: change.kind === "removed" ? "removed" : "" },
    detail: change.detail || change.description || "",
    id: change.id || change.change || `change-${index + 1}`,
    line: change.line || index + 1,
    meta: change.meta || change.section || "",
    proposed: change.proposed || { line: change.line || index + 1, text: change.after || "", kind: change.kind === "added" ? "added" : "added" },
    reason: change.reason || "",
    selected: Boolean(change.selected),
    status: change.status || "Open",
    title: change.title || `Change ${index + 1}`,
    tone: change.tone || change.impact || "medium"
  };
}

function renderPolicyDiff(diffOrSelector, config = {}) {
  const diff = getPolicyDiff(diffOrSelector);
  if (!diff) return null;
  const changes = (config.changes || []).map(normalizePolicyDiffChange);
  if (!changes.length) return diff;
  const selectedId = config.selectedChange || changes.find((change) => change.selected)?.id || changes[0].id;
  diff.dataset.ifPolicyDiffRendered = "true";
  diff.replaceChildren();
  diff.innerHTML = `
    <div class="if-policy-diff__toolbar">
      <div class="if-toolbar__group">
        <button class="if-btn if-btn--sm" type="button" data-if-diff-prev aria-label="Previous change">Previous</button>
        <span class="if-badge if-badge--info" data-if-diff-count aria-live="polite">1 of ${changes.length}</span>
        <button class="if-btn if-btn--sm" type="button" data-if-diff-next aria-label="Next change">Next</button>
      </div>
      <div class="if-toolbar__group" role="group" aria-label="Decision controls">
        ${(config.decisions || ["Approved", "Rejected", "Needs evidence"]).map((decision) => `<button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-diff-decision="${escapeHtml(decision)}" aria-pressed="false">${escapeHtml(decision)}</button>`).join("")}
      </div>
    </div>
    <div class="if-policy-diff__grid">
      <div class="if-change-list" role="listbox" aria-label="${escapeHtml(config.changeListLabel || "Policy changes")}">
        ${changes.map((change) => `
          <button class="if-change-item${change.id === selectedId ? " is-selected" : ""}" type="button" data-if-diff-change="${escapeHtml(change.id)}" aria-selected="${change.id === selectedId ? "true" : "false"}">
            <span class="if-badge if-badge--${escapeHtml(change.tone)}">${escapeHtml(change.line)}</span>
            <span><span class="if-change-item__title">${escapeHtml(change.title)}</span><span class="if-change-item__meta">${escapeHtml(change.meta)}</span></span>
            <span class="if-badge ${getPolicyDiffStatusClass(change.status)}" data-if-diff-status>${escapeHtml(change.status)}</span>
          </button>
        `).join("")}
      </div>
      <div class="if-stack">
        <div class="if-policy-diff__compare">
          <section class="if-policy-diff__pane" aria-label="${escapeHtml(config.leftTitle || "Current policy text")}">
            <div class="if-policy-diff__pane-header"><span>${escapeHtml(config.leftTitle || "Current")}</span><span class="if-badge">${escapeHtml(config.leftVersion || "Before")}</span></div>
            <div class="if-policy-diff__lines">${changes.map((change) => getPolicyDiffLineHtml(change.current, "removed")).join("")}</div>
          </section>
          <section class="if-policy-diff__pane" aria-label="${escapeHtml(config.rightTitle || "Proposed policy text")}">
            <div class="if-policy-diff__pane-header"><span>${escapeHtml(config.rightTitle || "Proposed")}</span><span class="if-badge if-badge--info">${escapeHtml(config.rightVersion || "After")}</span></div>
            <div class="if-policy-diff__lines">${changes.map((change) => getPolicyDiffLineHtml(change.proposed, "added")).join("")}</div>
          </section>
        </div>
        ${changes.map((change) => `
          <section class="if-policy-diff__detail" data-if-diff-panel="${escapeHtml(change.id)}"${change.id === selectedId ? "" : " hidden"}>
            <div class="if-cluster if-cluster--between"><h3 class="if-card__title">${escapeHtml(change.title)}</h3><span class="if-badge if-badge--${escapeHtml(change.tone)}">${escapeHtml(change.tone)}</span></div>
            <p class="if-text-sm if-m-0">${escapeHtml(change.detail)}</p>
            <label class="if-field"><span class="if-field__label">Decision reason</span><textarea class="if-textarea" placeholder="Explain decision...">${escapeHtml(change.reason)}</textarea></label>
          </section>
        `).join("")}
      </div>
    </div>
  `;
  hydrateIcons(diff);
  updatePolicyDiff(diff, selectedId, { emit: false });
  return diff;
}

function getPolicyDiffConfig(diff) {
  const sourceSelector = diff?.getAttribute?.("data-if-policy-diff-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || diff?.getAttribute?.("data-if-policy-diff-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid policy diff JSON", error);
    return null;
  }
}

function hydratePolicyDiff(diff) {
  if (!diff) return;
  const config = diff.dataset.ifPolicyDiffRendered === "true" ? null : getPolicyDiffConfig(diff);
  if (config) renderPolicyDiff(diff, config);
  const changes = getPolicyDiffChanges(diff);
  changes.forEach((change) => {
    change.setAttribute("role", change.getAttribute("role") || "option");
    if (!change.hasAttribute("aria-selected")) change.setAttribute("aria-selected", "false");
    if (!change.hasAttribute("tabindex")) change.tabIndex = -1;
    if (change.dataset.decision) setPolicyDiffStatus(change, change.dataset.decision);
  });
  const selected = getSelectedPolicyDiffChange(diff);
  if (selected) updatePolicyDiff(diff, selected, { emit: false });
}

function updatePolicyDiff(diffOrSelector, selectedChangeOrId, options = {}) {
  const diff = getPolicyDiff(diffOrSelector);
  if (!diff) return;
  const changes = getPolicyDiffChanges(diff);
  const selectedChange = typeof selectedChangeOrId === "string"
    ? changes.find((change) => change.dataset.ifDiffChange === selectedChangeOrId)
    : selectedChangeOrId || changes[0];
  if (!selectedChange) return;
  const changeId = selectedChange.dataset.ifDiffChange;
  changes.forEach((change) => {
    const selected = change === selectedChange;
    change.classList.toggle("is-selected", selected);
    change.setAttribute("aria-selected", String(selected));
    change.tabIndex = selected ? 0 : -1;
  });

  qsa("[data-if-diff-panel]", diff).forEach((panel) => {
    const selected = panel.dataset.ifDiffPanel === changeId;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });

  const index = changes.indexOf(selectedChange);
  const count = qs("[data-if-diff-count]", diff);
  if (count) count.textContent = `${index + 1} of ${changes.length}`;
  const summaryScope = diff.closest(".if-policy-diff-lab") || diff;
  qsa("[data-if-diff-selected-summary]", summaryScope).forEach((target) => {
    target.textContent = `${selectedChange.querySelector(".if-change-item__title")?.textContent?.trim() || changeId} (${index + 1} of ${changes.length})`;
  });
  qsa("[data-if-diff-decision]", diff).forEach((button) => {
    const active = Boolean(selectedChange.dataset.decision) && button.dataset.ifDiffDecision === selectedChange.dataset.decision;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (options.emit !== false) {
    dispatchFrameworkEvent(diff, "if:diff-select", {
      change: changeId,
      index,
      item: selectedChange,
      state: getPolicyDiffState(diff)
    });
  }
}

function movePolicyDiff(control, direction) {
  const diff = control?.closest?.("[data-if-policy-diff]") || getPolicyDiff(control);
  if (!diff) return;
  const changes = getPolicyDiffChanges(diff);
  if (!changes.length) return;
  const current = getSelectedPolicyDiffChange(diff) || changes[0];
  const index = changes.indexOf(current);
  const next = changes[(index + direction + changes.length) % changes.length];
  updatePolicyDiff(diff, next);
  next.focus({ preventScroll: true });
}

function setPolicyDiffDecision(controlOrDiff, decisionValue) {
  const isControl = controlOrDiff?.matches?.("[data-if-diff-decision]");
  const diff = isControl ? controlOrDiff.closest("[data-if-policy-diff]") : getPolicyDiff(controlOrDiff);
  const selected = getSelectedPolicyDiffChange(diff);
  if (!diff || !selected) return;
  const decision = decisionValue || controlOrDiff?.dataset?.ifDiffDecision || "";
  if (!decision) return;
  selected.dataset.decision = decision;
  setPolicyDiffStatus(selected, decision);
  const summaryScope = diff.closest(".if-policy-diff-lab") || diff;
  qsa("[data-if-diff-decision-summary]", summaryScope).forEach((target) => {
    target.textContent = `${decision} saved for ${selected.querySelector(".if-change-item__title")?.textContent?.trim() || selected.dataset.ifDiffChange}`;
  });
  qsa("[data-if-diff-decision]", diff).forEach((button) => {
    const active = button.dataset.ifDiffDecision === decision;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  dispatchFrameworkEvent(diff, "if:diff-decision", {
    change: selected.dataset.ifDiffChange,
    decision,
    item: selected,
    state: getPolicyDiffState(diff)
  });
}

function handlePolicyDiffKeydown(event, diff) {
  const change = event.target.closest("[data-if-diff-change]");
  if (!change || !diff) return false;
  const changes = getPolicyDiffChanges(diff);
  const index = changes.indexOf(change);
  if (!changes.length || index < 0) return false;
  if (!["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Home", "End", "Enter", " "].includes(event.key)) return false;
  event.preventDefault();
  if (event.key === "ArrowDown" || event.key === "ArrowRight") movePolicyDiff(diff, 1);
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") movePolicyDiff(diff, -1);
  if (event.key === "Home") {
    updatePolicyDiff(diff, changes[0]);
    changes[0].focus({ preventScroll: true });
  }
  if (event.key === "End") {
    updatePolicyDiff(diff, changes[changes.length - 1]);
    changes[changes.length - 1].focus({ preventScroll: true });
  }
  if (event.key === "Enter" || event.key === " ") updatePolicyDiff(diff, change);
  return true;
}

function getKeyboardModel(scope = "all") {
  if (!scope || scope === "all") return JSON.parse(JSON.stringify(keyboardModel));
  return JSON.parse(JSON.stringify(keyboardModel[scope] || []));
}

function renderKeyboardModel(target) {
  const scopes = (target.dataset.ifKeyboardModel || "all")
    .split(/[\s,|]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  const selectedScopes = scopes.includes("all") ? Object.keys(keyboardModel) : scopes;
  target.replaceChildren();
  selectedScopes.forEach((scope) => {
    const rows = keyboardModel[scope];
    if (!rows?.length) return;
    const group = document.createElement("section");
    group.className = "if-keyboard-model__group";
    group.innerHTML = `<h4>${escapeHtml(scope)}</h4>`;
    const list = document.createElement("div");
    list.className = "if-keyboard-model__list";
    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "if-keyboard-model__item";
      item.innerHTML = `
        <kbd>${escapeHtml(row.keys)}</kbd>
        <span><strong>${escapeHtml(row.action)}</strong><em>${escapeHtml(row.details)}</em></span>
      `;
      list.append(item);
    });
    group.append(list);
    target.append(group);
  });
}

function hydrateKeyboardModel(root = document) {
  qsa("[data-if-keyboard-model]", root).forEach(renderKeyboardModel);
}

function getReviewWorkflow(control) {
  return control?.matches?.("[data-if-review-workflow]") ? control : control?.closest?.("[data-if-review-workflow]");
}

function getReviewItems(workflow) {
  return qsa("[data-if-review-item]", workflow).filter((item) => !item.hidden && item.getAttribute("aria-disabled") !== "true");
}

function getSelectedReviewItem(workflow) {
  return qs("[data-if-review-item].is-selected", workflow) || getReviewItems(workflow)[0] || null;
}

function normalizeReviewWorkflowItem(item = {}, index = 0) {
  const id = item.id || item.key || item.finding || `review-${index + 1}`;
  return {
    assignee: item.assignee || item.owner || "Unassigned",
    body: item.body || item.description || item.detail || "",
    evidence: item.evidence || item.source || "",
    id,
    meta: item.meta || item.section || item.kind || "",
    reason: item.reason || item.note || "",
    severity: item.severity || item.priority || "medium",
    status: item.status || "open",
    tags: Array.isArray(item.tags) ? item.tags : [],
    title: item.title || item.label || id
  };
}

function normalizeReviewWorkflowDocument(config = {}) {
  const items = (config.items || config.queue || []).map(normalizeReviewWorkflowItem);
  return {
    actions: config.actions || ["approve", "reject", "escalate", "assign", "snooze", "reopen"],
    counts: config.counts || ["open", "approved", "rejected", "escalated"],
    emptyText: config.emptyText || "No review items.",
    items,
    label: config.label || config.title || "Reviewer workflow",
    reasonLabel: config.reasonLabel || "Decision reason",
    reasonPlaceholder: config.reasonPlaceholder || "Explain the decision or next action...",
    selected: config.selected || config.current || items.find((item) => item.selected)?.id || items[0]?.id || "",
    shortcuts: config.shortcuts || [
      { keys: "A", label: "Approve" },
      { keys: "R", label: "Reject" },
      { keys: "E", label: "Escalate" },
      { keys: "N", label: "Notes" }
    ]
  };
}

function formatReviewAction(action) {
  const labels = {
    approve: "Approved",
    reject: "Rejected",
    escalate: "Escalated",
    assign: "Assigned",
    snooze: "Snoozed",
    reopen: "Open",
    open: "Open"
  };
  return labels[action] || action.replace(/[-_]/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function getReviewStatusClass(status) {
  return `is-${String(status || "open").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getReviewWorkflowState(workflowOrSelector) {
  const workflow = getReviewWorkflow(workflowOrSelector) || qs(workflowOrSelector);
  if (!workflow) return null;
  const items = getReviewItems(workflow);
  const selected = getSelectedReviewItem(workflow);
  const counts = items.reduce((acc, item) => {
    const status = item.dataset.ifReviewStatus || "open";
    acc[status] = (acc[status] || 0) + 1;
    if (status === "needs-review") acc.open = (acc.open || 0) + 1;
    return acc;
  }, {});
  return {
    counts,
    current: selected?.dataset.ifReviewItem || "",
    index: selected ? items.indexOf(selected) : -1,
    items: items.map((item) => ({
      id: item.dataset.ifReviewItem || "",
      status: item.dataset.ifReviewStatus || "open",
      title: item.dataset.ifReviewTitle || item.textContent?.trim() || ""
    })),
    selectedItem: selected || null,
    total: items.length
  };
}

function updateReviewWorkflow(workflow) {
  if (!workflow) return;
  const items = getReviewItems(workflow);
  const selected = getSelectedReviewItem(workflow);
  const counts = items.reduce((acc, item) => {
    const status = item.dataset.ifReviewStatus || "open";
    acc[status] = (acc[status] || 0) + 1;
    if (status === "needs-review") acc.open = (acc.open || 0) + 1;
    return acc;
  }, { selected: selected ? 1 : 0 });

  qsa("[data-if-review-count]", workflow).forEach((target) => {
    const key = target.dataset.ifReviewCount;
    target.textContent = String(counts[key] || 0);
  });

  qsa("[data-if-review-current-id]", workflow).forEach((target) => {
    target.textContent = selected?.dataset.ifReviewItem || "None";
  });
  qsa("[data-if-review-current-title]", workflow).forEach((target) => {
    target.textContent = selected?.dataset.ifReviewTitle || selected?.textContent?.trim() || "No item selected";
  });
  qsa("[data-if-review-current-status]", workflow).forEach((target) => {
    const status = selected?.dataset.ifReviewStatus || "open";
    target.textContent = formatReviewAction(status);
    target.className = `if-badge if-badge--review-status ${getReviewStatusClass(status)}`;
  });
}

function renderReviewWorkflow(workflowOrSelector, config = {}) {
  const workflow = getReviewWorkflow(workflowOrSelector) || qs(workflowOrSelector);
  if (!workflow) return null;
  const doc = normalizeReviewWorkflowDocument(config);
  workflow.dataset.ifReviewWorkflowRendered = "true";
  workflow.replaceChildren();
  if (!doc.items.length) {
    workflow.innerHTML = `<p class="if-empty">${escapeHtml(doc.emptyText)}</p>`;
    return workflow;
  }
  const selectedId = doc.selected || doc.items[0].id;
  workflow.innerHTML = `
    <div class="if-review-workflow__main">
      <div class="if-review-workflow__toolbar" role="toolbar" aria-label="${escapeHtml(doc.label)} actions">
        ${doc.actions.map((action) => `<button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-review-action="${escapeHtml(action)}" aria-pressed="false">${escapeHtml(formatReviewAction(action))}</button>`).join("")}
      </div>
      <div class="if-review-workflow__summary" aria-label="${escapeHtml(doc.label)} status counts">
        ${doc.counts.map((count) => `<span><strong data-if-review-count="${escapeHtml(count)}">0</strong><em>${escapeHtml(formatReviewAction(count))}</em></span>`).join("")}
      </div>
      <div class="if-review-workflow__queue" role="listbox" aria-label="${escapeHtml(doc.label)} queue">
        ${doc.items.map((item) => `
          <button class="if-review-workflow__item${item.id === selectedId ? " is-selected" : ""}" type="button" data-if-review-item="${escapeHtml(item.id)}" data-if-review-title="${escapeHtml(item.title)}" data-if-review-status="${escapeHtml(item.status)}" data-if-review-reason="${escapeHtml(item.reason)}" data-if-review-severity="${escapeHtml(item.severity)}">
            <span><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml([item.id, item.meta, item.assignee].filter(Boolean).join(" - "))}</em></span>
            <span class="if-badge if-badge--review-status ${getReviewStatusClass(item.status)}" data-if-review-item-status>${escapeHtml(formatReviewAction(item.status))}</span>
          </button>
        `).join("")}
      </div>
    </div>
    <aside class="if-review-workflow__detail" aria-live="polite">
      <div class="if-review-workflow__detail-header">
        <div>
          <p data-if-review-current-id>${escapeHtml(selectedId)}</p>
          <h4 data-if-review-current-title>${escapeHtml(doc.items.find((item) => item.id === selectedId)?.title || doc.items[0].title)}</h4>
        </div>
        <span class="if-badge if-badge--review-status" data-if-review-current-status>Open</span>
      </div>
      ${doc.items.map((item) => `
        <section class="if-review-workflow__panel" data-if-review-panel="${escapeHtml(item.id)}"${item.id === selectedId ? "" : " hidden"}>
          <p class="if-text-sm if-m-0">${escapeHtml(item.body)}</p>
          <dl class="if-metadata-list if-metadata-list--compact">
            <div><dt>Owner</dt><dd>${escapeHtml(item.assignee)}</dd></div>
            <div><dt>Evidence</dt><dd>${escapeHtml(item.evidence || "Not supplied")}</dd></div>
            <div><dt>Severity</dt><dd>${escapeHtml(item.severity)}</dd></div>
          </dl>
          ${item.tags.length ? `<div class="if-chip-row">${item.tags.map((tag) => `<span class="if-chip">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        </section>
      `).join("")}
      <label class="if-field"><span class="if-field__label">${escapeHtml(doc.reasonLabel)}</span><textarea class="if-textarea" data-if-review-reason placeholder="${escapeHtml(doc.reasonPlaceholder)}"></textarea></label>
      <div class="if-review-workflow__shortcuts" aria-label="Keyboard shortcuts">
        ${doc.shortcuts.map((shortcut) => `<span><kbd>${escapeHtml(shortcut.keys)}</kbd> ${escapeHtml(shortcut.label)}</span>`).join("")}
      </div>
      <ol class="if-review-workflow__ledger" data-if-review-ledger aria-label="Review action ledger"></ol>
    </aside>
  `;
  hydrateIcons(workflow);
  hydrateReviewWorkflows(workflow);
  return workflow;
}

function getReviewWorkflowConfig(workflow) {
  const sourceSelector = workflow?.getAttribute?.("data-if-review-workflow-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || workflow?.getAttribute?.("data-if-review-workflow-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid review workflow JSON", error);
    return null;
  }
}

function selectReviewWorkflowItem(item) {
  const workflow = getReviewWorkflow(item);
  if (!workflow || !item) return;
  const itemId = item.dataset.ifReviewItem;
  getReviewItems(workflow).forEach((candidate) => {
    const selected = candidate === item;
    candidate.classList.toggle("is-selected", selected);
    candidate.setAttribute("aria-selected", String(selected));
    candidate.tabIndex = selected ? 0 : -1;
  });
  qsa("[data-if-review-panel]", workflow).forEach((panel) => {
    const selected = panel.dataset.ifReviewPanel === itemId;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
  workflow.dataset.ifReviewCurrent = itemId || "";
  updateReviewWorkflow(workflow);
  dispatchFrameworkEvent(workflow, "if:review-workflow-select", { id: itemId, item, state: getReviewWorkflowState(workflow) });
}

function appendReviewLedger(workflow, item, action, reason) {
  const ledger = qs("[data-if-review-ledger]", workflow);
  if (!ledger) return;
  const entry = document.createElement("li");
  entry.innerHTML = `
    <span>${escapeHtml(formatReviewAction(action))} ${escapeHtml(item.dataset.ifReviewItem || "item")}</span>
    <strong>${escapeHtml(reason || "No reason supplied")}</strong>
  `;
  ledger.prepend(entry);
  while (ledger.children.length > 5) ledger.lastElementChild?.remove();
}

function applyReviewWorkflowAction(control, actionOverride = "") {
  const workflow = getReviewWorkflow(control);
  if (!workflow) return null;
  const action = actionOverride || control.dataset?.ifReviewAction || "approve";
  const selected = getSelectedReviewItem(workflow);
  if (!selected) return null;
  const status = {
    approve: "approved",
    reject: "rejected",
    escalate: "escalated",
    assign: "assigned",
    snooze: "snoozed",
    reopen: "open",
    open: "open"
  }[action] || action;
  const reasonControl = qs("[data-if-review-reason]", workflow);
  const reason = reasonControl?.value?.trim() || control.dataset?.ifReviewReason || selected.dataset.ifReviewReason || "";
  const previousStatus = selected.dataset.ifReviewStatus || "open";
  selected.dataset.ifReviewStatus = status;
  selected.classList.remove(
    "is-open",
    "is-needs-review",
    "is-approved",
    "is-rejected",
    "is-escalated",
    "is-assigned",
    "is-snoozed"
  );
  selected.classList.add(getReviewStatusClass(status));
  selected.querySelector("[data-if-review-item-status]")?.replaceChildren(formatReviewAction(status));
  qsa("[data-if-review-action]", workflow).forEach((button) => {
    const active = button === control || button.dataset.ifReviewAction === action;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  appendReviewLedger(workflow, selected, action, reason);
  updateReviewWorkflow(workflow);
  dispatchFrameworkEvent(workflow, "if:review-workflow-action", {
    action,
    id: selected.dataset.ifReviewItem,
    item: selected,
    previousStatus,
    reason,
    state: getReviewWorkflowState(workflow),
    status
  });
  showToast(`${formatReviewAction(status)} ${selected.dataset.ifReviewItem || "review item"}`, action === "reject" ? "close" : action === "escalate" ? "alert" : "check");
  return { action, id: selected.dataset.ifReviewItem, item: selected, previousStatus, reason, status };
}

function moveReviewWorkflowSelection(workflow, direction) {
  const items = getReviewItems(workflow);
  if (!items.length) return null;
  const current = getSelectedReviewItem(workflow) || items[0];
  const currentIndex = Math.max(0, items.indexOf(current));
  const nextIndex = direction === "first" ? 0
    : direction === "last" ? items.length - 1
      : (currentIndex + direction + items.length) % items.length;
  const next = items[nextIndex];
  selectReviewWorkflowItem(next);
  next.focus({ preventScroll: true });
  return next;
}

function handleReviewWorkflowKeydown(event, workflow) {
  if (!workflow || isTextEntryTarget(event.target)) return false;
  const navKeys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
  if (navKeys.includes(event.key)) {
    event.preventDefault();
    const direction = event.key === "Home" ? "first"
      : event.key === "End" ? "last"
        : (event.key === "ArrowDown" || event.key === "ArrowRight") ? 1 : -1;
    moveReviewWorkflowSelection(workflow, direction);
    return true;
  }
  if (event.key === "Enter" || event.key === " ") {
    const item = event.target.closest("[data-if-review-item]");
    if (item) {
      event.preventDefault();
      selectReviewWorkflowItem(item);
      return true;
    }
  }
  if (event.altKey || event.ctrlKey || event.metaKey) return false;
  const actionByKey = { a: "approve", r: "reject", e: "escalate" };
  const shortcut = actionByKey[event.key.toLowerCase()];
  if (shortcut) {
    event.preventDefault();
    applyReviewWorkflowAction(workflow, shortcut);
    return true;
  }
  if (event.key.toLowerCase() === "n") {
    const reason = qs("[data-if-review-reason]", workflow);
    if (reason) {
      event.preventDefault();
      reason.focus();
      return true;
    }
  }
  return false;
}

function hydrateReviewWorkflows(root = document) {
  const workflows = root?.matches?.("[data-if-review-workflow]")
    ? [root, ...qsa("[data-if-review-workflow]", root)]
    : qsa("[data-if-review-workflow]", root);
  workflows.forEach((workflow) => {
    const config = workflow.dataset.ifReviewWorkflowRendered === "true" ? null : getReviewWorkflowConfig(workflow);
    if (config) {
      renderReviewWorkflow(workflow, config);
      return;
    }
    const items = getReviewItems(workflow);
    items.forEach((item) => {
      if (!item.hasAttribute("role")) item.setAttribute("role", "option");
      if (!item.hasAttribute("tabindex")) item.tabIndex = item.classList.contains("is-selected") ? 0 : -1;
      item.setAttribute("aria-selected", String(item.classList.contains("is-selected")));
      const status = item.dataset.ifReviewStatus || "open";
      item.classList.add(getReviewStatusClass(status));
    });
    const selected = qs("[data-if-review-item].is-selected", workflow) || items[0];
    if (selected) selectReviewWorkflowItem(selected);
    updateReviewWorkflow(workflow);
  });
}

const graphLayouts = {
  radial: {
    seed: [50, 50], eo: [50, 15], directive: [75, 25], disa: [82, 48], obligation: [77, 72],
    evidence: [52, 82], opportunity: [28, 72], cybercom: [22, 42], "eo-ai": [32, 22],
    navwar: [18, 62], event: [70, 86], gap: [88, 64], "disa-cloud": [91, 38],
    "disa-zero": [93, 52], "directive-manual": [83, 15], "directive-forms": [88, 25]
  },
  authority: {
    seed: [50, 48], eo: [18, 16], directive: [38, 16], "eo-ai": [62, 16], cybercom: [24, 48],
    disa: [76, 48], obligation: [38, 78], evidence: [54, 78], opportunity: [72, 78],
    navwar: [12, 78], event: [88, 78], gap: [88, 28], "disa-cloud": [88, 42],
    "disa-zero": [88, 55], "directive-manual": [38, 5], "directive-forms": [52, 16]
  },
  impact: {
    seed: [15, 45], eo: [15, 16], "eo-ai": [34, 14], directive: [34, 32], cybercom: [34, 60],
    disa: [55, 34], obligation: [55, 62], evidence: [75, 46], opportunity: [88, 26],
    event: [88, 62], gap: [75, 78], navwar: [55, 84], "disa-cloud": [70, 24],
    "disa-zero": [70, 34], "directive-manual": [50, 20], "directive-forms": [50, 30]
  }
};

const graphEdgeColors = {
  derived: "#334155",
  evidence: "#15803d",
  gap: "#b42318",
  guides: "#0369a1",
  implements: "#0f4aa2",
  implements_policy: "#0f4aa2",
  incorporates: "#0f4aa2",
  echelon2_executes: "#0f766e",
  component_executes: "#0f766e",
  delegates: "#b45309",
  delegates_task: "#b45309",
  localizes: "#b45309",
  governs_work: "#b45309",
  tailors: "#b45309",
  verifies: "#15803d",
  cites_authority: "#4f46e5",
  amends: "#4f46e5",
  codifies: "#334155",
  authorizes: "#334155",
  drives_rule: "#0369a1",
  constrains: "#b45309",
  delegates_procedure: "#6d28d9",
  service_adopts: "#0f766e",
  obligation: "#b45309",
  opportunity: "#0f766e",
  references: "#4f46e5",
  related: "#64748b"
};

const defaultGraphNodeTypes = {
  policy: { className: "policy", color: "#0f4aa2", icon: "policy", label: "Policy" },
  directive: { className: "policy", color: "#0f4aa2", icon: "directive", label: "Directive" },
  instruction: { className: "policy", color: "#0f4aa2", icon: "instruction", label: "Instruction" },
  law: { className: "law", color: "#334155", icon: "law", label: "Law" },
  statute: { className: "statute", color: "#334155", icon: "statute", label: "Statute" },
  authority: { className: "govwide", color: "#4f46e5", icon: "gavel", label: "Authority" },
  govwide: { className: "govwide", color: "#4f46e5", icon: "federalRegister", label: "Government-wide" },
  dod: { className: "dod", color: "#0f4aa2", icon: "dod", label: "DoD" },
  department: { className: "dod", color: "#0f4aa2", icon: "departmentOfWar", label: "Department" },
  service: { className: "service", color: "#0369a1", icon: "serviceBranch", label: "Service" },
  component: { className: "component", color: "#0f766e", icon: "component", label: "Component" },
  echelon2: { className: "echelon2", color: "#0f766e", icon: "echelon2", label: "Echelon 2" },
  echelon3: { className: "echelon3", color: "#0f766e", icon: "echelon3", label: "Echelon 3" },
  echelon4: { className: "echelon4", color: "#0f766e", icon: "echelon4", label: "Echelon 4" },
  org: { className: "org", color: "#0369a1", icon: "department", label: "Organization" },
  organization: { className: "org", color: "#0369a1", icon: "department", label: "Organization" },
  source: { className: "policy", color: "#4f46e5", icon: "source", label: "Source" },
  opportunity: { className: "opportunity", color: "#0f766e", icon: "star", label: "Opportunity" },
  obligation: { className: "obligation", color: "#b45309", icon: "warning", label: "Obligation" },
  evidence: { className: "evidence", color: "#15803d", icon: "check", label: "Evidence" },
  event: { className: "event", color: "#b45309", icon: "calendar", label: "Event" },
  gap: { className: "gap", color: "#b42318", icon: "warning", label: "Gap" },
  claim: { className: "evidence", color: "#15803d", icon: "claim", label: "Claim" },
  implementation: { className: "component", color: "#0f766e", icon: "implementation", label: "Implementation" }
};

function toGraphTypeKey(type) {
  return String(type || "").trim().toLowerCase();
}

function toGraphTypeClass(value) {
  return String(value || "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function normalizeGraphNodeType(type, config = {}) {
  const key = toGraphTypeKey(type || config.type);
  if (!key) throw new Error("InterfaceFramework.registerGraphNodeType requires a node type.");
  const next = {
    type: key,
    className: toGraphTypeClass(config.className || type),
    color: config.color || "",
    icon: config.icon || "",
    label: config.label || formatGraphLabel(type),
    data: config.data && typeof config.data === "object" ? { ...config.data } : {}
  };
  if (typeof config.render === "function") next.render = config.render;
  return next;
}

function registerGraphNodeType(type, config = {}) {
  const next = normalizeGraphNodeType(type, config);
  graphNodeTypes.set(next.type, next);
  return () => unregisterGraphNodeType(next.type);
}

function unregisterGraphNodeType(type) {
  return graphNodeTypes.delete(toGraphTypeKey(type));
}

function getGraphNodeTypeConfig(type) {
  const key = toGraphTypeKey(type);
  return graphNodeTypes.get(key) || defaultGraphNodeTypes[key] || null;
}

function getGraphNodeTypeFromClass(node) {
  const typeClass = Array.from(node?.classList || []).find((className) => className.startsWith("if-graph-node--") && className !== "if-graph-node--primary");
  if (!typeClass) return "";
  const className = typeClass.replace("if-graph-node--", "");
  const match = Object.entries(defaultGraphNodeTypes).find(([, config]) => config.className === className);
  return match?.[0] || className;
}

function applyGraphNodeType(node, explicitType) {
  if (!node?.matches?.(".if-graph-node[data-node-id]")) return null;
  const type = explicitType || node.dataset.nodeType || node.dataset.nodeKind || getGraphNodeTypeFromClass(node);
  const config = getGraphNodeTypeConfig(type);
  if (!config) return null;
  node.dataset.nodeType = config.type;
  node.dataset.nodeTypeLabel = config.label || formatGraphLabel(config.type);
  const managedClasses = new Set([
    ...Object.values(defaultGraphNodeTypes).map((item) => item.className),
    ...Array.from(graphNodeTypes.values()).map((item) => item.className)
  ].filter(Boolean).map((className) => `if-graph-node--${className}`));
  managedClasses.forEach((className) => {
    if (className !== `if-graph-node--${config.className}`) node.classList.remove(className);
  });
  if (config.className) node.classList.add(`if-graph-node--${config.className}`);
  if (config.color) node.style.setProperty("--node-color", config.color);
  Object.entries(config.data || {}).forEach(([key, value]) => {
    if (value == null) return;
    node.dataset[key] = String(value);
  });
  const icon = qs(".if-graph-node__icon[data-if-icon], .if-graph-node__icon.if-icon-slot, [data-if-graph-node-icon]", node);
  if (icon && config.icon) {
    icon.dataset.ifIcon = config.icon;
    delete icon.dataset.ifIconHydrated;
    hydrateIcons(node);
  }
  if (typeof config.render === "function") config.render(node, { config, type: config.type });
  return config;
}

function applyGraphNodeTypes(graphOrRoot = document) {
  const root = typeof graphOrRoot === "string" ? qs(graphOrRoot) || document : graphOrRoot || document;
  const nodes = root.matches?.(".if-graph-node[data-node-id]") ? [root] : qsa(".if-graph-node[data-node-id]", root);
  const applied = nodes.map((node) => ({ node, config: applyGraphNodeType(node) })).filter((item) => item.config);
  const graph = root.closest?.("[data-if-graph]") || (root.matches?.("[data-if-graph]") ? root : null);
  if (graph) {
    graph.dispatchEvent(new CustomEvent("if:graph-node-types", {
      bubbles: true,
      detail: { applied, graph }
    }));
  }
  return applied;
}

function getAuthorityEdgeBias(type = "related") {
  return {
    amends: -1.6,
    authorizes: -0.8,
    cites_authority: 1.8,
    codifies: 1.6,
    constrains: -2.2,
    delegates: -1.1,
    delegates_procedure: 1.4,
    delegates_task: 2.1,
    drives_rule: 0.9,
    echelon2_executes: 0,
    governs_work: -1.5,
    implements: -0.6,
    implements_policy: 0,
    incorporates: 1.1,
    localizes: 1.6,
    service_adopts: -0.4,
    tailors: 2.2,
    verifies: 0.6
  }[type] || 0;
}

function getGraphLabelAngle(tangentX, tangentY, options = {}) {
  const scaleX = Number(options.coordinateScaleX) || 1;
  const scaleY = Number(options.coordinateScaleY) || 1;
  let angle = Math.atan2(tangentY * scaleY, tangentX * scaleX) * 180 / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return angle;
}

function getGraphNodeMetrics(graph, id) {
  const node = graph && id ? qs(`.if-graph-node[data-node-id="${escapeCssIdentifier(id)}"]`, graph) : null;
  const canvas = graph ? getGraphCanvas(graph) : null;
  const viewport = getGraphViewport(canvas);
  const width = viewport?.offsetWidth || canvas?.clientWidth || Number(graph?.dataset.graphCoordinateWidth) || 1000;
  const height = viewport?.offsetHeight || canvas?.clientHeight || Number(graph?.dataset.graphCoordinateHeight) || 700;
  const nodeWidth = node?.offsetWidth || node?.getBoundingClientRect?.().width || 126;
  const nodeHeight = node?.offsetHeight || node?.getBoundingClientRect?.().height || 92;
  return {
    halfHeightPct: (nodeHeight / Math.max(height, 1)) * 50,
    halfWidthPct: (nodeWidth / Math.max(width, 1)) * 50
  };
}

function getGraphNodeBoundaryOffset(graph, id, ux, uy, fallback = 4.5) {
  const metrics = getGraphNodeMetrics(graph, id);
  if (!metrics.halfWidthPct || !metrics.halfHeightPct) return fallback;
  const xDistance = Math.abs(ux) > 0.001 ? metrics.halfWidthPct / Math.abs(ux) : Number.POSITIVE_INFINITY;
  const yDistance = Math.abs(uy) > 0.001 ? metrics.halfHeightPct / Math.abs(uy) : Number.POSITIVE_INFINITY;
  const edgeDistance = Math.min(xDistance, yDistance);
  if (!Number.isFinite(edgeDistance)) return fallback;
  return Math.max(0.65, edgeDistance - 0.16);
}

function getAuthorityEdgeRoute(edge, from, to) {
  const [fx, fy] = from;
  const [tx, ty] = to;
  const type = edge.dataset.edgeType || "related";
  const forward = tx >= fx;
  const horizontalGap = Math.abs(tx - fx);
  const sameLane = horizontalGap < 5.5;
  const side = sameLane ? (fx < 50 ? 1 : -1) : (forward ? 1 : -1);
  const startOffsetX = sameLane ? side * 5.7 : side * 5.2;
  const endOffsetX = sameLane ? side * 5.7 : -side * 5.8;
  const sx = clampGraphPercent(fx + startOffsetX, 2.5, 97.5);
  const sy = clampGraphPercent(fy, 5, 95);
  const ex = clampGraphPercent(tx + endOffsetX, 2.5, 97.5);
  const ey = clampGraphPercent(ty, 5, 95);
  const bias = getAuthorityEdgeBias(type);
  if (!sameLane && Math.abs(ey - sy) < 1.2) {
    return {
      d: `M ${sx.toFixed(2)} ${sy.toFixed(2)} L ${ex.toFixed(2)} ${ey.toFixed(2)}`,
      end: [ex, ey],
      label: [clampGraphPercent((sx + ex) / 2, 8, 92), clampGraphPercent(sy - 1.6, 8, 92)],
      labelAngle: 0,
      start: [sx, sy]
    };
  }

  let routeX = sameLane
    ? clampGraphPercent(fx + side * (5.85 + Math.min(Math.abs(bias), 0.75)), 3.5, 96.5)
    : clampGraphPercent((sx + ex) / 2 + bias, 3.5, 96.5);
  if (sameLane) {
    return {
      d: [
        `M ${sx.toFixed(2)} ${sy.toFixed(2)}`,
        `L ${routeX.toFixed(2)} ${sy.toFixed(2)}`,
        `L ${routeX.toFixed(2)} ${ey.toFixed(2)}`,
        `L ${ex.toFixed(2)} ${ey.toFixed(2)}`
      ].join(" "),
      end: [ex, ey],
      label: [clampGraphPercent(routeX, 8, 92), clampGraphPercent((sy + ey) / 2 - 1.6, 8, 92)],
      labelAngle: 0,
      start: [sx, sy]
    };
  }
  if (!sameLane) {
    const edgeGap = Math.abs(ex - sx);
    const routeInset = Math.min(1, edgeGap / 3);
    const routeMin = Math.min(sx, ex) + routeInset;
    const routeMax = Math.max(sx, ex) - routeInset;
    routeX = clampGraphPercent(routeX, routeMin, routeMax);
  }
  const baseCornerRadius = Math.min(1.15, Math.max(0.55, horizontalGap / 18));
  const cornerClearance = Math.min(Math.abs(routeX - sx), Math.abs(ex - routeX)) * 0.72;
  const cornerRadius = sameLane ? baseCornerRadius : Math.max(0.12, Math.min(baseCornerRadius, cornerClearance));
  const verticalDirection = Math.sign(ey - sy) || 1;
  const approachDirection = Math.sign(ex - routeX) || side;
  const bendOutX = clampGraphPercent(routeX - approachDirection * cornerRadius, 3, 97);
  const bendInY = clampGraphPercent(sy + verticalDirection * cornerRadius, 5, 95);
  const bendOutY = clampGraphPercent(ey - verticalDirection * cornerRadius, 5, 95);

  const d = [
    `M ${sx.toFixed(2)} ${sy.toFixed(2)}`,
    `L ${bendOutX.toFixed(2)} ${sy.toFixed(2)}`,
    `Q ${routeX.toFixed(2)} ${sy.toFixed(2)} ${routeX.toFixed(2)} ${bendInY.toFixed(2)}`,
    `L ${routeX.toFixed(2)} ${bendOutY.toFixed(2)}`,
    `Q ${routeX.toFixed(2)} ${ey.toFixed(2)} ${clampGraphPercent(routeX + approachDirection * cornerRadius, 3, 97).toFixed(2)} ${ey.toFixed(2)}`,
    `L ${ex.toFixed(2)} ${ey.toFixed(2)}`
  ].join(" ");
  const labelX = clampGraphPercent(routeX, 8, 92);
  const labelY = clampGraphPercent((sy + ey) / 2 - 1.6, 8, 92);
  return {
    d,
    end: [ex, ey],
    label: [labelX, labelY],
    labelAngle: 0,
    start: [sx, sy]
  };
}

function getGraphEdgeRoute(edge, from, to, options = {}) {
  if (options.layout === "authority-chain" || options.layout === "authority") {
    return getAuthorityEdgeRoute(edge, from, to, options);
  }
  const [fx, fy] = from;
  const [tx, ty] = to;
  const dx = tx - fx;
  const dy = ty - fy;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const startOffset = getGraphNodeBoundaryOffset(options.graph, edge.dataset.edgeFrom, ux, uy, edge.dataset.edgeFrom === "seed" ? 4.8 : 3.8);
  const endOffset = getGraphNodeBoundaryOffset(options.graph, edge.dataset.edgeTo, -ux, -uy, edge.dataset.edgeTo === "seed" ? 4.8 : 3.8);
  const sx = fx + ux * startOffset;
  const sy = fy + uy * startOffset;
  const ex = tx - ux * endOffset;
  const ey = ty - uy * endOffset;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const route = options.edgeStyle === "routed" || edge.dataset.edgeRoute === "routed";
  const inferred = edge.dataset.edgeInferred === "true";
  const type = edge.dataset.edgeType || "related";
  const routeBias = {
    derived: 0,
    references: -4.5,
    guides: -1.8,
    obligation: 3.2,
    evidence: 5.2,
    opportunity: 2.4,
    implements: -2.8,
    gap: -6.2
  }[type] || 0;
  const bend = route ? routeBias + (inferred ? 2.2 : 0) : 0;
  const px = -uy;
  const py = ux;
  const cx = mx + px * bend;
  const cy = my + py * bend;
  const labelT = route ? (type === "derived" ? 0.47 : type === "references" ? 0.54 : type === "guides" ? 0.58 : 0.5) : 0.5;
  const qx = route ? ((1 - labelT) * (1 - labelT) * sx) + (2 * (1 - labelT) * labelT * cx) + (labelT * labelT * ex) : sx + (ex - sx) * labelT;
  const qy = route ? ((1 - labelT) * (1 - labelT) * sy) + (2 * (1 - labelT) * labelT * cy) + (labelT * labelT * ey) : sy + (ey - sy) * labelT;
  const tangentX = route ? (2 * (1 - labelT) * (cx - sx)) + (2 * labelT * (ex - cx)) : ex - sx;
  const tangentY = route ? (2 * (1 - labelT) * (cy - sy)) + (2 * labelT * (ey - cy)) : ey - sy;
  const labelNormalOffset = route ? (inferred ? 2.35 : 1.85) : 0;
  const angle = getGraphLabelAngle(tangentX, tangentY, options);

  return {
    control: [cx, cy],
    d: route ? `M ${sx.toFixed(2)} ${sy.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}` : `M ${sx.toFixed(2)} ${sy.toFixed(2)} L ${ex.toFixed(2)} ${ey.toFixed(2)}`,
    end: [ex, ey],
    label: [clampGraphPercent(qx + px * labelNormalOffset, 8, 92), clampGraphPercent(qy + py * labelNormalOffset, 8, 92)],
    labelAngle: angle,
    start: [sx, sy]
  };
}

function ensureGraphSvgEdgeLabelLayer(svg) {
  let layer = qs(".if-graph-svg-labels", svg);
  if (!layer) {
    layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    layer.classList.add("if-graph-svg-labels");
    svg.append(layer);
  }
  return layer;
}

function ensureGraphEdgePathId(edge) {
  if (!edge.id) {
    connectorRouteCounter += 1;
    edge.id = `if-graph-edge-path-${connectorRouteCounter}`;
  }
  return edge.id;
}

function getGraphEdgeVisualLabel(graph, edge) {
  const selector = [
    `[data-edge-label-from="${escapeCssIdentifier(edge.dataset.edgeFrom || "")}"]`,
    `[data-edge-label-to="${escapeCssIdentifier(edge.dataset.edgeTo || "")}"]`,
    edge.dataset.edgeType ? `[data-edge-type="${escapeCssIdentifier(edge.dataset.edgeType)}"]` : "",
    edge.dataset.clusterMember ? `[data-cluster-member="${escapeCssIdentifier(edge.dataset.clusterMember)}"]` : ""
  ].join("");
  const label = selector ? qs(selector, graph) : null;
  return label?.textContent?.replace(/\s+/g, " ").trim() || formatGraphLabel(edge.dataset.edgeType || "related");
}

function getGraphEdgeKey(edge) {
  return [
    edge.dataset.edgeFrom || edge.dataset.edgeLabelFrom || "",
    edge.dataset.edgeTo || edge.dataset.edgeLabelTo || "",
    edge.dataset.edgeType || "relationship",
    edge.dataset.clusterMember || ""
  ].join("::");
}

function getGraphEdgeLabelSelector(edge) {
  return [
    `[data-edge-label-from="${escapeCssIdentifier(edge.dataset.edgeFrom || "")}"]`,
    `[data-edge-label-to="${escapeCssIdentifier(edge.dataset.edgeTo || "")}"]`,
    edge.dataset.edgeType ? `[data-edge-type="${escapeCssIdentifier(edge.dataset.edgeType)}"]` : "",
    edge.dataset.clusterMember ? `[data-cluster-member="${escapeCssIdentifier(edge.dataset.clusterMember)}"]` : ":not([data-cluster-member])"
  ].join("");
}

function ensureGraphPillEdgeLabels(graph) {
  if (!graph) return;
  const viewport = getGraphViewport(graph);
  if (!viewport) return;
  if (graph.dataset.graphEdgeLabelMode !== "pill") {
    qsa("[data-if-generated-edge-label]", graph).forEach((label) => label.remove());
    return;
  }
  const active = new Set();
  qsa(".if-graph-lines [data-edge-from][data-edge-to]", graph).forEach((edge) => {
    const key = getGraphEdgeKey(edge);
    active.add(key);
    const selector = getGraphEdgeLabelSelector(edge);
    const explicitLabel = qsa(selector, graph).find((label) => !label.matches("[data-if-generated-edge-label]") && !isInsideGraphA11y(label));
    const generatedLabels = qsa(`[data-if-generated-edge-label][data-edge-key="${escapeCssIdentifier(key)}"]`, graph);
    if (explicitLabel) {
      generatedLabels.forEach((label) => label.remove());
      return;
    }
    let label = generatedLabels.find((item) => item.parentElement === viewport);
    generatedLabels.filter((item) => item !== label).forEach((extra) => extra.remove());
    if (!label) {
      label = document.createElement("button");
      label.className = "if-edge-label if-edge-label--blank if-edge-label--generated";
      label.type = "button";
      label.dataset.ifGraphEdge = "";
      label.dataset.ifGeneratedEdgeLabel = "true";
      viewport.append(label);
    }
    label.dataset.edgeKey = key;
    label.dataset.edgeLabelFrom = edge.dataset.edgeFrom || "";
    label.dataset.edgeLabelTo = edge.dataset.edgeTo || "";
    label.dataset.edgeType = edge.dataset.edgeType || "relationship";
    if (edge.dataset.clusterMember) label.dataset.clusterMember = edge.dataset.clusterMember;
    else delete label.dataset.clusterMember;
    if (edge.dataset.edgeInferred) label.dataset.edgeInferred = edge.dataset.edgeInferred;
    else delete label.dataset.edgeInferred;
    const edgeHidden = edge.hidden || edge.hasAttribute("hidden") || edge.classList.contains("is-hidden");
    label.hidden = edgeHidden;
    label.toggleAttribute("hidden", edgeHidden);
    label.classList.toggle("if-edge-label--inferred", edge.dataset.edgeInferred === "true");
    label.classList.toggle("is-hidden", edgeHidden);
    label.classList.toggle("is-muted", edge.classList.contains("is-muted"));
    label.classList.toggle("is-related", edge.classList.contains("is-related"));
    label.classList.toggle("is-selected", edge.classList.contains("is-selected"));
    label.setAttribute("aria-label", `${formatGraphLabel(label.dataset.edgeType)} relationship: ${getGraphNodeLabel(graph, label.dataset.edgeLabelFrom)} to ${getGraphNodeLabel(graph, label.dataset.edgeLabelTo)}`);
  });
  qsa("[data-if-generated-edge-label]", graph).forEach((label) => {
    if (!active.has(label.dataset.edgeKey)) label.remove();
  });
}

function updateGraphSvgEdgeLabels(graph) {
  if (!graph) return;
  const svg = qs(".if-graph-lines", graph);
  if (!svg) return;
  if (graph.dataset.graphEdgeLabelMode !== "integrated") {
    qs(".if-graph-svg-labels", svg)?.remove();
    return;
  }
  const layer = ensureGraphSvgEdgeLabelLayer(svg);
  const active = new Set();
  qsa(".if-graph-lines [data-edge-from][data-edge-to]", graph).forEach((edge) => {
    if (edge.tagName.toLowerCase() !== "path") return;
    const id = ensureGraphEdgePathId(edge);
    active.add(id);
    let label = qs(`.if-graph-svg-label[data-edge-path="${escapeCssIdentifier(id)}"]`, layer);
    if (!label) {
      label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.classList.add("if-graph-svg-label");
      label.dataset.edgePath = id;
      const textPath = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
      textPath.setAttribute("startOffset", "50%");
      textPath.setAttribute("text-anchor", "middle");
      label.append(textPath);
      layer.append(label);
    }
    const textPath = label.querySelector("textPath");
    textPath.setAttribute("href", `#${id}`);
    textPath.setAttributeNS("http://www.w3.org/1999/xlink", "href", `#${id}`);
    textPath.textContent = getGraphEdgeVisualLabel(graph, edge);
    label.dataset.edgeLabelFrom = edge.dataset.edgeFrom || "";
    label.dataset.edgeLabelTo = edge.dataset.edgeTo || "";
    label.dataset.edgeType = edge.dataset.edgeType || "";
    label.style.setProperty("--edge-color", graphEdgeColors[edge.dataset.edgeType] || graphEdgeColors.related);
    label.classList.toggle("is-hidden", edge.hidden || edge.classList.contains("is-hidden"));
    label.classList.toggle("is-muted", edge.classList.contains("is-muted"));
    label.classList.toggle("is-related", edge.classList.contains("is-related"));
    label.classList.toggle("is-selected", edge.classList.contains("is-selected"));
  });
  qsa(".if-graph-svg-label", layer).forEach((label) => {
    if (!active.has(label.dataset.edgePath)) label.remove();
  });
}

function getGraphEdgeLabelArm(graph, route, label) {
  const canvas = getGraphCanvas(graph);
  const viewport = getGraphViewport(canvas);
  const width = viewport?.offsetWidth || canvas?.clientWidth || 1000;
  const height = viewport?.offsetHeight || canvas?.clientHeight || 700;
  const labelWidth = label?.offsetWidth || label?.getBoundingClientRect?.().width || 84;
  const start = route.start || route.label || [0, 0];
  const end = route.end || route.label || [0, 0];
  const lengthPx = Math.hypot(((end[0] - start[0]) / 100) * width, ((end[1] - start[1]) / 100) * height);
  const maxArm = Math.min(420, Math.max(120, width * 0.42));
  return Math.max(12, Math.min(maxArm, (lengthPx - labelWidth) / 2 - 5));
}

function updateGraphEdges(graph, layout) {
  const options = {
    graph,
    ...getGraphOrganizationOptions(graph),
    ...getGraphCoordinateScale(graph)
  };
  const labelMode = graph?.dataset.graphEdgeLabelMode || "";
  qsa("[data-edge-from][data-edge-to]", graph).forEach((edge) => {
    const from = layout[edge.dataset.edgeFrom];
    const to = layout[edge.dataset.edgeTo];
    if (!from || !to) return;
    const route = getGraphEdgeRoute(edge, from, to, options);
    const inlineEdge = options.edgeStyle === "direct" && edge.dataset.edgeRoute !== "routed";
    if (edge.tagName.toLowerCase() === "path") {
      edge.setAttribute("d", route.d);
      edge.setAttribute("pathLength", "100");
    } else {
      edge.setAttribute("x1", route.start[0]);
      edge.setAttribute("y1", route.start[1]);
      edge.setAttribute("x2", route.end[0]);
      edge.setAttribute("y2", route.end[1]);
      edge.setAttribute("pathLength", "100");
    }
    edge.style.setProperty("--edge-color", graphEdgeColors[edge.dataset.edgeType] || graphEdgeColors.related);
    if (inlineEdge) {
      edge.dataset.edgeLabelPlacement = "inline";
    } else {
      delete edge.dataset.edgeLabelPlacement;
    }
  });
  ensureGraphPillEdgeLabels(graph);

  qsa("[data-edge-label-from][data-edge-label-to]", graph).forEach((label) => {
    const from = layout[label.dataset.edgeLabelFrom];
    const to = layout[label.dataset.edgeLabelTo];
    if (!from || !to) return;
    const proxy = {
      dataset: {
        edgeFrom: label.dataset.edgeLabelFrom,
        edgeInferred: label.dataset.edgeInferred,
        edgeRoute: label.dataset.edgeRoute,
        edgeTo: label.dataset.edgeLabelTo,
        edgeType: label.dataset.edgeType
      }
    };
    const route = getGraphEdgeRoute(proxy, from, to, options);
    const inlineLabel = labelMode === "pill" || (options.edgeStyle === "direct" && label.dataset.edgeRoute !== "routed");
    label.style.setProperty("--x", `${route.label[0]}%`);
    label.style.setProperty("--y", `${route.label[1]}%`);
    label.style.setProperty("--edge-angle", inlineLabel ? `${route.labelAngle.toFixed(2)}deg` : "0deg");
    label.style.setProperty("--edge-color", graphEdgeColors[label.dataset.edgeType] || graphEdgeColors.related);
    label.style.setProperty("--edge-arm", `${getGraphEdgeLabelArm(graph, route, label).toFixed(1)}px`);
    label.dataset.edgeLabelPlacement = inlineLabel ? "inline" : "offset";
  });
  updateGraphSvgEdgeLabels(graph);
}

function getGraphOrganizationOptions(graph) {
  const options = {
    direction: graph?.dataset.graphDirection || "directed",
    edgeStyle: graph?.dataset.graphEdgeStyle || "routed",
    labelDensity: graph?.dataset.graphLabelDensity || "full",
    layout: graph?.dataset.graphLayout || "radial",
    nodeDensity: graph?.dataset.graphNodeDensity || "comfortable",
    orientation: graph?.dataset.graphOrientation || "standard",
    spacing: Number.parseFloat(graph?.dataset.graphSpacing || "1") || 1
  };
  qsa("[data-if-graph-option]", graph).forEach((control) => {
    const key = control.dataset.ifGraphOption;
    if (!key) return;
    if (control.type === "checkbox") {
      options[key] = control.checked;
    } else if (control.type === "range" || control.type === "number") {
      options[key] = Number.parseFloat(control.value);
    } else {
      options[key] = control.value;
    }
  });
  if (!Number.isFinite(options.spacing)) options.spacing = 1;
  options.spacing = Math.max(0.5, Math.min(1.28, options.spacing));
  return options;
}

function transformGraphLayout(layout, options = {}) {
  const spacing = options.spacing || 1;
  return Object.entries(layout).reduce((next, [id, position]) => {
    let [x, y] = position;
    x = 50 + (x - 50) * spacing;
    y = 50 + (y - 50) * spacing;
    if (options.orientation === "top-down") {
      [x, y] = [y, x];
    } else if (options.orientation === "right-left") {
      x = 100 - x;
    } else if (options.orientation === "bottom-up") {
      y = 100 - y;
    }
    next[id] = [clampGraphPercent(x), clampGraphPercent(y)];
    return next;
  }, {});
}

function applyGraphOrganization(graph) {
  if (!graph) return;
  const options = getGraphOrganizationOptions(graph);
  graph.dataset.graphLabelDensity = options.labelDensity;
  graph.dataset.graphNodeDensity = options.nodeDensity;
  graph.dataset.graphEdgeStyle = options.edgeStyle;
  graph.dataset.graphDirection = options.direction;
  graph.dataset.graphOrientation = options.orientation;
  graph.dataset.graphSpacing = String(options.spacing);
  qsa("[data-if-graph-option-value]", graph).forEach((target) => {
    const key = target.dataset.ifGraphOptionValue;
    const value = options[key];
    target.textContent = key === "spacing" ? `${Math.round(value * 100)}%` : formatGraphLabel(value);
  });
  const activeLayout = qs("[data-if-graph-layout][aria-pressed='true']", graph) || qs("[data-if-graph-layout]", graph);
  if (activeLayout) setGraphLayout(activeLayout, { preserveView: true });
  graph.dispatchEvent(new CustomEvent("if:graph-organization", {
    bubbles: true,
    detail: options
  }));
}

function clampGraphPercent(value, min = 7, max = 93) {
  return Math.max(min, Math.min(max, value));
}

function getGraphPositionBounds(target) {
  const graph = target?.closest?.("[data-if-graph]") || (target?.matches?.("[data-if-graph]") ? target : null);
  return {
    maxX: toFiniteNumber(graph?.dataset.graphMaxX, 93),
    maxY: toFiniteNumber(graph?.dataset.graphMaxY, 93),
    minX: toFiniteNumber(graph?.dataset.graphMinX, 7),
    minY: toFiniteNumber(graph?.dataset.graphMinY, 7)
  };
}

function getGraphNodePosition(node) {
  const styles = getComputedStyle(node);
  return [
    Number.parseFloat(styles.getPropertyValue("--x")) || 50,
    Number.parseFloat(styles.getPropertyValue("--y")) || 50
  ];
}

function setGraphNodePosition(node, x, y) {
  const bounds = getGraphPositionBounds(node);
  node.style.setProperty("--x", `${clampGraphPercent(x, bounds.minX, bounds.maxX).toFixed(2)}%`);
  node.style.setProperty("--y", `${clampGraphPercent(y, bounds.minY, bounds.maxY).toFixed(2)}%`);
}

function updateGraphClusterAnchor(control) {
  const graph = control?.closest?.("[data-if-graph]");
  const parent = graph ? getGraphClusterParentNode(control, graph) : null;
  if (!control || !parent) return;
  const [cx, cy] = getGraphNodePosition(control);
  const [px, py] = getGraphNodePosition(parent);
  control.dataset.clusterAnchorX = (cx - px).toFixed(2);
  control.dataset.clusterAnchorY = (cy - py).toFixed(2);
}

function ensureGraphClusterAnchor(control, graph) {
  const parent = getGraphClusterParentNode(control, graph);
  if (!control || !parent) return null;
  if (control.dataset.clusterAnchorX === undefined || control.dataset.clusterAnchorY === undefined) {
    const [cx, cy] = getGraphNodePosition(control);
    const [px, py] = getGraphNodePosition(parent);
    control.dataset.clusterAnchorX = (cx - px).toFixed(2);
    control.dataset.clusterAnchorY = (cy - py).toFixed(2);
  }
  return parent;
}

function updateAnchoredGraphClusters(graph, parentNode = null) {
  if (!graph) return;
  const parentId = parentNode?.dataset?.nodeId || "";
  qsa("[data-if-graph-cluster][data-cluster-parent]", graph).forEach((control) => {
    if (control.classList.contains("is-dragging")) return;
    if (parentId && control.dataset.clusterParent !== parentId) return;
    const parent = ensureGraphClusterAnchor(control, graph);
    if (!parent) return;
    const [px, py] = getGraphNodePosition(parent);
    setGraphNodePosition(
      control,
      px + toFiniteNumber(control.dataset.clusterAnchorX, 0),
      py + toFiniteNumber(control.dataset.clusterAnchorY, 0)
    );
    if (graph.getAttribute(`data-cluster-${control.dataset.ifGraphCluster}`) === "open") {
      layoutGraphClusterMembers(control, { force: true });
    }
  });
}

function getGraphLayoutFromDom(graph) {
  return qsa(".if-graph-node[data-node-id]", graph).reduce((layout, node) => {
    layout[node.dataset.nodeId] = getGraphNodePosition(node);
    return layout;
  }, {});
}

function getGraphNodeKind(node) {
  if (!node) return "default";
  const match = Array.from(node.classList).find((className) => className.startsWith("if-graph-node--") && !["if-graph-node--primary"].includes(className));
  return match ? match.replace("if-graph-node--", "") : "default";
}

function getGraphCoordinateScale(graph) {
  const rect = getGraphCanvas(graph)?.getBoundingClientRect?.();
  return {
    coordinateScaleX: rect?.width || 1,
    coordinateScaleY: rect?.height || 1
  };
}

function getGraphViewportBounds(canvas) {
  const view = getGraphView(canvas);
  const rect = canvas?.getBoundingClientRect?.();
  const width = rect?.width || 1000;
  const height = rect?.height || 700;
  const zoom = clampGraphZoom(view.zoom || 1);
  const minimapPad = 2;
  const viewWidth = Math.min(100 - minimapPad * 2, 100 / zoom);
  const viewHeight = Math.min(100 - minimapPad * 2, 100 / zoom);
  const left = 50 + (-50 - (view.panX / width) * 100) / zoom;
  const top = 50 + (-50 - (view.panY / height) * 100) / zoom;
  return {
    left: Math.max(minimapPad, Math.min(100 - minimapPad - viewWidth, left)),
    top: Math.max(minimapPad, Math.min(100 - minimapPad - viewHeight, top)),
    width: viewWidth,
    height: viewHeight
  };
}

function updateGraphMinimap(graph) {
  if (!graph) return;
  const canvas = qs(".if-graph-canvas", graph);
  const minimap = qs(".if-graph-minimap", graph);
  if (!canvas || !minimap) return;
  const nodes = qsa(".if-graph-node[data-node-id]", graph).filter((node) => !node.hidden);
  const nodeLookup = new Map(nodes.map((node) => [node.dataset.nodeId, node]));
  const layout = getGraphLayoutFromDom(graph);
  const edges = qsa("[data-edge-from][data-edge-to]", graph).filter((edge) => {
    return !edge.hidden && nodeLookup.has(edge.dataset.edgeFrom) && nodeLookup.has(edge.dataset.edgeTo);
  });
  const bounds = getGraphViewportBounds(canvas);
  const selected = qs(".if-graph-node.is-selected[data-node-id]", graph);
  const edgeMarkup = edges.map((edge) => {
    const from = layout[edge.dataset.edgeFrom] || [50, 50];
    const to = layout[edge.dataset.edgeTo] || [50, 50];
    const inferred = edge.dataset.edgeInferred === "true" ? " if-minimap-edge--inferred" : "";
    return `<line class="if-minimap-edge if-minimap-edge--${escapeHtml(edge.dataset.edgeType || "default")}${inferred}" x1="${from[0].toFixed(2)}" y1="${from[1].toFixed(2)}" x2="${to[0].toFixed(2)}" y2="${to[1].toFixed(2)}"></line>`;
  }).join("");
  const nodeMarkup = nodes.map((node) => {
    const [x, y] = layout[node.dataset.nodeId] || [50, 50];
    const selectedClass = node === selected ? " is-selected" : "";
    const primaryClass = node.classList.contains("if-graph-node--primary") ? " is-primary" : "";
    return `<circle class="if-minimap-node if-minimap-node--${escapeHtml(getGraphNodeKind(node))}${selectedClass}${primaryClass}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${node === selected ? "2.4" : "1.65"}"><title>${escapeHtml(node.dataset.nodeLabel || node.textContent.trim())}</title></circle>`;
  }).join("");
  minimap.innerHTML = `
    <div class="if-minimap__header">
      <strong>Map</strong>
      <span>${nodes.length} nodes / ${edges.length} links</span>
    </div>
    <svg class="if-minimap__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g class="if-minimap__edges">${edgeMarkup}</g>
      <g class="if-minimap__nodes">${nodeMarkup}</g>
      <rect class="if-minimap-window" x="${bounds.left.toFixed(2)}" y="${bounds.top.toFixed(2)}" width="${bounds.width.toFixed(2)}" height="${bounds.height.toFixed(2)}" rx="2"></rect>
    </svg>
    <div class="if-minimap__legend" aria-hidden="true">
      <span><i class="if-minimap-key if-minimap-key--policy"></i>Policy</span>
      <span><i class="if-minimap-key if-minimap-key--org"></i>Org</span>
      <span><i class="if-minimap-key if-minimap-key--gap"></i>Gap</span>
    </div>
  `;
}

function refreshGraphGeometry(graph) {
  if (!graph) return;
  updateAnchoredGraphClusters(graph);
  updateGraphEdges(graph, getGraphLayoutFromDom(graph));
  updateGraphMinimap(graph);
  const contextNodeId = qs(".if-graph-context-menu:not([hidden])", graph)?.dataset.nodeId;
  if (contextNodeId) {
    const contextNode = qs(`.if-graph-node[data-node-id="${escapeCssIdentifier(contextNodeId)}"]`, graph);
    if (contextNode && !contextNode.hidden) positionGraphContextMenu(graph, contextNode);
  }
}

function getGraphCanvas(graphOrControl) {
  const graph = graphOrControl?.closest?.("[data-if-graph]") || graphOrControl;
  return qs(".if-graph-canvas", graph);
}

function getGraphViewport(graphOrCanvas) {
  const canvas = graphOrCanvas?.classList?.contains?.("if-graph-canvas")
    ? graphOrCanvas
    : getGraphCanvas(graphOrCanvas);
  return canvas ? qs(".if-graph-viewport[data-if-graph-viewport]", canvas) : null;
}

function getGraphView(canvas) {
  return {
    panX: Number.parseFloat(canvas?.dataset.graphPanX || "0") || 0,
    panY: Number.parseFloat(canvas?.dataset.graphPanY || "0") || 0,
    zoom: Number.parseFloat(canvas?.dataset.graphZoom || "1") || 1
  };
}

function clampGraphZoom(value) {
  return Math.max(0.55, Math.min(2.4, value));
}

function applyGraphView(canvas, view) {
  if (!canvas) return;
  const next = {
    panX: Math.round(view.panX || 0),
    panY: Math.round(view.panY || 0),
    zoom: clampGraphZoom(view.zoom || 1)
  };
  canvas.dataset.graphPanX = String(next.panX);
  canvas.dataset.graphPanY = String(next.panY);
  canvas.dataset.graphZoom = next.zoom.toFixed(2);
  const viewport = getGraphViewport(canvas);
  if (viewport) {
    viewport.style.setProperty("--graph-pan-x", `${next.panX}px`);
    viewport.style.setProperty("--graph-pan-y", `${next.panY}px`);
    viewport.style.setProperty("--graph-zoom", next.zoom.toFixed(2));
  }
  qsa("[data-if-graph-zoom-label]", canvas.closest("[data-if-graph]") || document).forEach((label) => {
    label.textContent = `${Math.round(next.zoom * 100)}%`;
  });
  updateGraphMinimap(canvas.closest("[data-if-graph]"));
}

function resetGraphView(canvas) {
  applyGraphView(canvas, { panX: 0, panY: 0, zoom: 1 });
}

function zoomGraphCanvas(canvas, factor, origin) {
  if (!canvas) return;
  const current = getGraphView(canvas);
  const nextZoom = clampGraphZoom(current.zoom * factor);
  if (nextZoom === current.zoom) return;
  const rect = canvas.getBoundingClientRect();
  const ox = origin ? origin.x - rect.left - rect.width / 2 : 0;
  const oy = origin ? origin.y - rect.top - rect.height / 2 : 0;
  const scaleDelta = nextZoom / current.zoom;
  applyGraphView(canvas, {
    panX: ox - (ox - current.panX) * scaleDelta,
    panY: oy - (oy - current.panY) * scaleDelta,
    zoom: nextZoom
  });
}

function setGraphViewport(control) {
  const canvas = getGraphCanvas(control);
  if (!canvas) return;
  const action = control.dataset.ifGraphViewport;
  if (action === "reset" || action === "fit") {
    resetGraphView(canvas);
  } else if (action === "in") {
    zoomGraphCanvas(canvas, 1.18);
  } else if (action === "out") {
    zoomGraphCanvas(canvas, 1 / 1.18);
  }
  canvas.dispatchEvent(new CustomEvent("if:graph-viewport", {
    bubbles: true,
    detail: getGraphView(canvas)
  }));
}

function panGraphToMinimapPoint(minimap, event) {
  const canvas = minimap.closest(".if-graph-canvas");
  if (!canvas) return;
  const svg = qs(".if-minimap__svg", minimap);
  const rect = (svg || minimap).getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const targetX = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
  const targetY = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
  const canvasRect = canvas.getBoundingClientRect();
  const current = getGraphView(canvas);
  applyGraphView(canvas, {
    zoom: current.zoom,
    panX: (50 - targetX) * canvasRect.width / 100 * current.zoom,
    panY: (50 - targetY) * canvasRect.height / 100 * current.zoom
  });
  canvas.dispatchEvent(new CustomEvent("if:graph-viewport", {
    bubbles: true,
    detail: getGraphView(canvas)
  }));
}

function startGraphMinimapPan(event, minimap) {
  if (graphDrag || graphPan || graphMinimapPan || erdDrag || erdPan || erdMinimapPan) return;
  if (!minimap || event.button !== 0) return;
  graphMinimapPan = {
    minimap,
    moved: false,
    pointerId: event.pointerId ?? "mouse",
    startClientX: event.clientX,
    startClientY: event.clientY
  };
  minimap.dataset.minimapPanning = "true";
  panGraphToMinimapPoint(minimap, event);
  if (event.pointerId !== undefined) minimap.setPointerCapture?.(event.pointerId);
}

function getErdMode(erd) {
  return erd?.dataset.erdMode || "explore";
}

function getErdCanvas(erdOrControl) {
  const erd = erdOrControl?.closest?.("[data-if-erd]") || erdOrControl;
  return qs(".if-erd-canvas", erd);
}

function getErdView(canvas) {
  return {
    panX: Number.parseFloat(canvas?.dataset.erdPanX || "0") || 0,
    panY: Number.parseFloat(canvas?.dataset.erdPanY || "0") || 0,
    zoom: Number.parseFloat(canvas?.dataset.erdZoom || "1") || 1
  };
}

function clampErdZoom(value) {
  return Math.max(0.36, Math.min(2.4, value));
}

function getErdStageMetrics(canvas) {
  const viewport = qs("[data-if-erd-surface]", canvas);
  const stage = qs(".if-erd-stage", canvas);
  const stageRect = stage?.getBoundingClientRect();
  const canvasRect = canvas?.getBoundingClientRect();
  const zoom = getErdView(canvas).zoom || 1;
  const savedWidth = Number.parseFloat(canvas.dataset.erdBaseWidth || "");
  const savedHeight = Number.parseFloat(canvas.dataset.erdBaseHeight || "");
  const measuredWidth = Math.max(canvasRect?.width || 0, (stageRect?.width || 2200) / zoom, 2200);
  const measuredHeight = Math.max(canvasRect?.height || 0, (stageRect?.height || 1500) / zoom, 1500);
  const baseWidth = Number.isFinite(savedWidth) ? Math.max(savedWidth, measuredWidth) : measuredWidth;
  const baseHeight = Number.isFinite(savedHeight) ? Math.max(savedHeight, measuredHeight) : measuredHeight;
  canvas.dataset.erdBaseWidth = String(baseWidth);
  canvas.dataset.erdBaseHeight = String(baseHeight);
  if (viewport) {
    viewport.style.setProperty("--erd-stage-width", `${baseWidth}px`);
    viewport.style.setProperty("--erd-stage-height", `${baseHeight}px`);
  }
  return { baseHeight, baseWidth };
}

function clampErdPan(canvas, view) {
  getErdStageMetrics(canvas);
  const softLimit = 24000;
  return {
    panX: Math.round(Math.max(-softLimit, Math.min(softLimit, view.panX || 0))),
    panY: Math.round(Math.max(-softLimit, Math.min(softLimit, view.panY || 0)))
  };
}

function getErdContentBounds(canvas) {
  const erd = canvas.closest("[data-if-erd]");
  const metrics = getErdStageMetrics(canvas);
  const nodes = qsa("[data-erd-node]", erd);
  if (!nodes.length) return { minX: 0, maxX: metrics.baseWidth, minY: 0, maxY: metrics.baseHeight };
  const boxes = nodes.map((node) => {
    const position = getErdNodePosition(node);
    const x = (position[0] / 100) * metrics.baseWidth;
    const y = (position[1] / 100) * metrics.baseHeight;
    const halfWidth = (node.offsetWidth || 228) / 2;
    const halfHeight = (node.offsetHeight || 220) / 2;
    return {
      minX: x - halfWidth,
      maxX: x + halfWidth,
      minY: y - halfHeight,
      maxY: y + halfHeight
    };
  });
  const padX = 20;
  const padY = 20;
  return {
    minX: Math.min(...boxes.map((box) => box.minX)) - padX,
    maxX: Math.max(...boxes.map((box) => box.maxX)) + padX,
    minY: Math.min(...boxes.map((box) => box.minY)) - padY,
    maxY: Math.max(...boxes.map((box) => box.maxY)) + padY
  };
}

function getErdFitView(canvas, zoomLimit = 1) {
  const rect = canvas.getBoundingClientRect();
  const bounds = getErdContentBounds(canvas);
  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const pad = 32;
  const fitZoom = Math.min(
    zoomLimit,
    (rect.width - pad * 2) / contentWidth,
    (rect.height - pad * 2) / contentHeight
  );
  const zoom = clampErdZoom(fitZoom);
  return {
    panX: Math.round((rect.width - contentWidth * zoom) / 2 - bounds.minX * zoom),
    panY: Math.round((rect.height - contentHeight * zoom) / 2 - bounds.minY * zoom),
    zoom
  };
}

function getErdBoundsView(canvas, bounds, zoomLimit = 1.15) {
  const rect = canvas.getBoundingClientRect();
  const metrics = getErdStageMetrics(canvas);
  const x1 = clampGraphPercent(Number.parseFloat(bounds.x1 ?? "0"), 0, 100);
  const y1 = clampGraphPercent(Number.parseFloat(bounds.y1 ?? "0"), 0, 100);
  const x2 = clampGraphPercent(Number.parseFloat(bounds.x2 ?? "100"), 0, 100);
  const y2 = clampGraphPercent(Number.parseFloat(bounds.y2 ?? "100"), 0, 100);
  const minX = Math.min(x1, x2) / 100 * metrics.baseWidth;
  const maxX = Math.max(x1, x2) / 100 * metrics.baseWidth;
  const minY = Math.min(y1, y2) / 100 * metrics.baseHeight;
  const maxY = Math.max(y1, y2) / 100 * metrics.baseHeight;
  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const pad = 42;
  const fitZoom = Math.min(
    zoomLimit,
    (rect.width - pad * 2) / contentWidth,
    (rect.height - pad * 2) / contentHeight
  );
  const zoom = clampErdZoom(fitZoom);
  return {
    panX: Math.round((rect.width - contentWidth * zoom) / 2 - minX * zoom),
    panY: Math.round((rect.height - contentHeight * zoom) / 2 - minY * zoom),
    zoom
  };
}

function applyErdView(canvas, view) {
  if (!canvas) return;
  const incomingZoom = clampErdZoom(view.zoom || 1);
  const metrics = getErdStageMetrics(canvas);
  const rect = canvas.getBoundingClientRect();
  const fittedHeight = Math.max(38, Math.min(metrics.baseHeight / 16, (metrics.baseHeight * incomingZoom) / 16 + 1.5));
  canvas.style.setProperty("--erd-canvas-height", `${fittedHeight.toFixed(2)}rem`);
  const next = {
    panX: Math.round(view.panX || 0),
    panY: Math.round(view.panY || 0),
    zoom: incomingZoom
  };
  if (next.zoom <= 1.02 && Math.abs(next.panY) < 24) next.panY = 0;
  if (view.autoFit) {
    const fitted = getErdFitView(canvas, view.zoomLimit ?? 1);
    next.panX = fitted.panX;
    next.panY = fitted.panY;
    next.zoom = fitted.zoom;
  }
  const clamped = clampErdPan(canvas, next);
  next.panX = clamped.panX;
  next.panY = clamped.panY;
  canvas.dataset.erdPanX = String(next.panX);
  canvas.dataset.erdPanY = String(next.panY);
  canvas.dataset.erdZoom = next.zoom.toFixed(2);
  canvas.dataset.erdDensity = canvas.dataset.erdDensityOverride || (next.zoom < 0.62 ? "map" : next.zoom < 0.86 ? "compact" : "detail");
  const viewport = qs("[data-if-erd-surface]", canvas);
  canvas.style.setProperty("--erd-grid-x", `${next.panX}px`);
  canvas.style.setProperty("--erd-grid-y", `${next.panY}px`);
  if (viewport) {
    viewport.style.setProperty("--erd-pan-x", `${next.panX}px`);
    viewport.style.setProperty("--erd-pan-y", `${next.panY}px`);
    viewport.style.setProperty("--erd-zoom", next.zoom.toFixed(2));
  }
  qsa("[data-if-erd-zoom-label]", canvas.closest("[data-if-erd]") || document).forEach((label) => {
    label.textContent = `${Math.round(next.zoom * 100)}%`;
  });
  const minimapWindow = qs(".if-erd-minimap .if-minimap-window", canvas);
  if (minimapWindow) {
    const windowWidth = clampGraphPercent((rect.width / Math.max(metrics.baseWidth * next.zoom, 1)) * 100, 8, 100);
    const windowHeight = clampGraphPercent((rect.height / Math.max(metrics.baseHeight * next.zoom, 1)) * 100, 8, 100);
    const windowLeft = clampGraphPercent((-next.panX / Math.max(metrics.baseWidth * next.zoom, 1)) * 100, 0, 100 - windowWidth);
    const windowTop = clampGraphPercent((-next.panY / Math.max(metrics.baseHeight * next.zoom, 1)) * 100, 0, 100 - windowHeight);
    minimapWindow.style.width = `${windowWidth}%`;
    minimapWindow.style.height = `${windowHeight}%`;
    minimapWindow.style.left = `${windowLeft}%`;
    minimapWindow.style.top = `${windowTop}%`;
    minimapWindow.style.right = "auto";
    minimapWindow.style.bottom = "auto";
  }
}

function resetErdView(canvas) {
  applyErdView(canvas, { panX: 0, panY: 0, zoom: 1 });
}

function fitErdView(canvas) {
  applyErdView(canvas, { autoFit: true, zoom: 1, zoomLimit: 0.9 });
}

function zoomErdCanvas(canvas, factor, origin) {
  if (!canvas) return;
  const current = getErdView(canvas);
  const nextZoom = clampErdZoom(current.zoom * factor);
  if (nextZoom === current.zoom) return;
  const rect = canvas.getBoundingClientRect();
  const originX = origin ? origin.x - rect.left : rect.width / 2;
  const originY = origin ? origin.y - rect.top : rect.height / 2;
  const contentX = (originX - current.panX) / current.zoom;
  const contentY = (originY - current.panY) / current.zoom;
  applyErdView(canvas, {
    panX: originX - contentX * nextZoom,
    panY: originY - contentY * nextZoom,
    zoom: nextZoom
  });
}

function setErdMode(control) {
  const erd = control.closest("[data-if-erd]");
  if (!erd) return;
  const mode = control.dataset.ifErdMode || "explore";
  erd.dataset.erdMode = mode;
  qsa("[data-if-erd-mode]", erd).forEach((button) => {
    const selected = button === control;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  qsa("[data-if-erd-status='mode']", erd).forEach((status) => {
    status.textContent = formatGraphLabel(mode);
  });
  erd.dispatchEvent(new CustomEvent("if:erd-mode", {
    bubbles: true,
    detail: { mode }
  }));
}

function setErdViewport(control) {
  const canvas = getErdCanvas(control);
  if (!canvas) return;
  const action = control.dataset.ifErdViewport;
  if (action === "reset") {
    resetErdView(canvas);
  } else if (action === "fit") {
    fitErdView(canvas);
  } else if (action === "in") {
    zoomErdCanvas(canvas, 1.18);
  } else if (action === "out") {
    zoomErdCanvas(canvas, 1 / 1.18);
  }
  canvas.dispatchEvent(new CustomEvent("if:erd-viewport", {
    bubbles: true,
    detail: getErdView(canvas)
  }));
}

function setErdZone(control) {
  const canvas = getErdCanvas(control);
  if (!canvas) return;
  const zone = control.dataset.ifErdZone || "all";
  if (zone === "all") {
    fitErdView(canvas);
  } else {
    applyErdView(canvas, getErdBoundsView(canvas, control.dataset, Number.parseFloat(control.dataset.zoomLimit || "1.15")));
  }
  qsa("[data-if-erd-zone]", control.closest("[data-if-erd]") || document).forEach((button) => {
    const selected = button === control;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  canvas.dispatchEvent(new CustomEvent("if:erd-zone", {
    bubbles: true,
    detail: { zone, view: getErdView(canvas) }
  }));
}

function panErdToMinimapPoint(minimap, event) {
  const canvas = minimap.closest(".if-erd-canvas");
  if (!canvas) return;
  const rect = minimap.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const targetX = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
  const targetY = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
  const metrics = getErdStageMetrics(canvas);
  const canvasRect = canvas.getBoundingClientRect();
  const current = getErdView(canvas);
  applyErdView(canvas, {
    zoom: current.zoom,
    panX: Math.round(canvasRect.width / 2 - (targetX / 100) * metrics.baseWidth * current.zoom),
    panY: Math.round(canvasRect.height / 2 - (targetY / 100) * metrics.baseHeight * current.zoom)
  });
  canvas.dispatchEvent(new CustomEvent("if:erd-viewport", {
    bubbles: true,
    detail: getErdView(canvas)
  }));
}

function startErdMinimapPan(event, minimap) {
  if (graphDrag || graphPan || graphMinimapPan || erdDrag || erdPan || erdMinimapPan) return;
  if (!minimap || event.button !== 0) return;
  erdMinimapPan = {
    minimap,
    moved: false,
    pointerId: event.pointerId ?? "mouse",
    startClientX: event.clientX,
    startClientY: event.clientY
  };
  minimap.dataset.minimapPanning = "true";
  panErdToMinimapPoint(minimap, event);
  if (event.pointerId !== undefined) minimap.setPointerCapture?.(event.pointerId);
}

function setErdDensity(control) {
  const erd = control.closest("[data-if-erd]");
  const canvas = getErdCanvas(control);
  if (!erd || !canvas) return;
  const density = control.dataset.ifErdDensity || "auto";
  if (density === "auto") {
    delete canvas.dataset.erdDensityOverride;
  } else {
    canvas.dataset.erdDensityOverride = density;
  }
  qsa("[data-if-erd-density]", erd).forEach((button) => {
    const selected = button === control;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  applyErdView(canvas, getErdView(canvas));
  erd.dispatchEvent(new CustomEvent("if:erd-density", {
    bubbles: true,
    detail: { density }
  }));
}

function getErdNodePosition(node) {
  const styles = getComputedStyle(node);
  return [
    Number.parseFloat(styles.getPropertyValue("--x")) || 50,
    Number.parseFloat(styles.getPropertyValue("--y")) || 50
  ];
}

function setErdNodePosition(node, x, y) {
  node.style.setProperty("--x", `${clampGraphPercent(x, 4, 96).toFixed(2)}%`);
  node.style.setProperty("--y", `${clampGraphPercent(y, 5, 95).toFixed(2)}%`);
}

function getErdLayoutFromDom(erd) {
  return qsa("[data-erd-node]", erd).reduce((layout, node) => {
    layout[node.dataset.erdNode] = getErdNodePosition(node);
    return layout;
  }, {});
}

function getErdStorageKey(erd) {
  return erd?.dataset.erdStorageKey ? `if:erd:${erd.dataset.erdStorageKey}` : "";
}

function storeErdLayout(erd) {
  const key = getErdStorageKey(erd);
  if (!key || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(getErdLayoutFromDom(erd)));
  } catch {
    // Ignore storage errors; interactive layout still works for the active session.
  }
}

function restoreErdLayout(erd) {
  const key = getErdStorageKey(erd);
  if (!key || !window.localStorage) return false;
  try {
    const layout = JSON.parse(window.localStorage.getItem(key) || "{}");
    Object.entries(layout).forEach(([id, position]) => {
      const node = qs(`[data-erd-node="${escapeCssIdentifier(id)}"]`, erd);
      if (node && Array.isArray(position)) setErdNodePosition(node, position[0], position[1]);
    });
    return Object.keys(layout).length > 0;
  } catch {
    return false;
  }
}

function routeErdConnection(edge, layout) {
  const from = layout[edge.dataset.erdEdgeFrom];
  const to = layout[edge.dataset.erdEdgeTo];
  if (!from || !to) return "";
  const [fx, fy] = from;
  const [tx, ty] = to;
  const dx = tx - fx;
  const sameColumn = Math.abs(dx) < 7;
  const side = dx >= 0 ? 1 : -1;
  const sourceX = clampGraphPercent(fx + side * 6.7, 2, 98);
  const targetX = clampGraphPercent(tx - side * 6.7, 2, 98);
  if (sameColumn) {
    const railX = clampGraphPercent(fx + (fx < 50 ? 9 : -9), 4, 96);
    return `M ${sourceX.toFixed(2)} ${fy.toFixed(2)} C ${railX.toFixed(2)} ${fy.toFixed(2)}, ${railX.toFixed(2)} ${ty.toFixed(2)}, ${targetX.toFixed(2)} ${ty.toFixed(2)}`;
  }
  const midX = (sourceX + targetX) / 2;
  return `M ${sourceX.toFixed(2)} ${fy.toFixed(2)} C ${midX.toFixed(2)} ${fy.toFixed(2)}, ${midX.toFixed(2)} ${ty.toFixed(2)}, ${targetX.toFixed(2)} ${ty.toFixed(2)}`;
}

function refreshErdGeometry(erd) {
  if (!erd) return;
  const layout = getErdLayoutFromDom(erd);
  qsa("[data-erd-edge-from][data-erd-edge-to]", erd).forEach((edge) => {
    edge.setAttribute("d", routeErdConnection(edge, layout));
  });
  updateErdMinimap(erd, layout);
}

function updateErdMinimap(erd, layout = getErdLayoutFromDom(erd)) {
  qsa("[data-erd-minimap-node]", erd).forEach((item) => {
    const position = layout[item.dataset.erdMinimapNode];
    if (!position) return;
    item.style.setProperty("--x", `${position[0]}%`);
    item.style.setProperty("--y", `${position[1]}%`);
  });
}

function getErdNodeCollisionBox(node, canvas) {
  const metrics = getErdStageMetrics(canvas);
  const [x, y] = getErdNodePosition(node);
  const width = ((node.offsetWidth || 228) / Math.max(metrics.baseWidth, 1)) * 100;
  const height = ((node.offsetHeight || 220) / Math.max(metrics.baseHeight, 1)) * 100;
  return {
    height,
    node,
    width,
    x,
    y
  };
}

function deconflictErdNodes(erd, anchor = null, options = {}) {
  if (!erd) return false;
  const canvas = getErdCanvas(erd);
  if (!canvas) return false;
  const nodes = qsa("[data-erd-node]", erd);
  if (nodes.length < 2) return false;
  const margin = options.margin ?? 0.9;
  const passes = options.passes ?? 4;
  const strength = options.strength ?? 0.32;
  const laneGravity = options.laneGravity ?? 0.08;
  const centerBias = options.centerBias ?? 0.025;
  let changed = false;
  const boxes = nodes.map((node) => getErdNodeCollisionBox(node, canvas));

  for (let pass = 0; pass < passes; pass += 1) {
    let movedThisPass = false;
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = ((a.width + b.width) / 2) + margin - Math.abs(dx);
        const overlapY = ((a.height + b.height) / 2) + margin - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        const separateOnX = overlapX < overlapY;
        const direction = separateOnX ? (dx === 0 ? (i % 2 ? -1 : 1) : Math.sign(dx)) : (dy === 0 ? (j % 2 ? -1 : 1) : Math.sign(dy));
        const push = (separateOnX ? overlapX : overlapY) * strength;
        const moveA = anchor && a.node === anchor ? 0 : anchor && b.node === anchor ? 1 : 0.5;
        const moveB = anchor && b.node === anchor ? 0 : anchor && a.node === anchor ? 1 : 0.5;

        if (separateOnX) {
          if (moveA) a.x -= direction * push * moveA;
          if (moveB) b.x += direction * push * moveB;
        } else {
          if (moveA) a.y -= direction * push * moveA;
          if (moveB) b.y += direction * push * moveB;
        }

        a.x = clampGraphPercent(a.x, 4, 96);
        b.x = clampGraphPercent(b.x, 4, 96);
        a.y = clampGraphPercent(a.y, 5, 95);
        b.y = clampGraphPercent(b.y, 5, 95);
        setErdNodePosition(a.node, a.x, a.y);
        setErdNodePosition(b.node, b.x, b.y);
        movedThisPass = true;
        changed = true;
      }
    }
    boxes.forEach((box) => {
      if (box.node === anchor) return;
      const initialX = Number.parseFloat(box.node.dataset.erdInitialX || "");
      const initialY = Number.parseFloat(box.node.dataset.erdInitialY || "");
      if (Number.isFinite(initialX) && laneGravity > 0) {
        const nextX = box.x + (initialX - box.x) * laneGravity;
        if (Math.abs(nextX - box.x) > 0.01) {
          box.x = nextX;
          movedThisPass = true;
          changed = true;
        }
      }
      if (Number.isFinite(initialY) && centerBias > 0) {
        const nextY = box.y + (initialY - box.y) * centerBias;
        if (Math.abs(nextY - box.y) > 0.01) {
          box.y = nextY;
          movedThisPass = true;
          changed = true;
        }
      }
      box.x = clampGraphPercent(box.x, 4, 96);
      box.y = clampGraphPercent(box.y, 5, 95);
      setErdNodePosition(box.node, box.x, box.y);
    });
    if (!movedThisPass) break;
  }

  if (changed) {
    erd.dispatchEvent(new CustomEvent("if:erd-deconflict", {
      bubbles: true,
      detail: { anchor, nodes: nodes.length }
    }));
  }
  return changed;
}

function animateErdDeconflict(erd, anchor = null, options = {}) {
  if (!erd || typeof window === "undefined") return;
  const existingFrame = erdRelaxFrames.get(erd);
  if (existingFrame) window.cancelAnimationFrame(existingFrame);
  const frames = options.frames ?? 10;
  let remaining = frames;
  const step = () => {
    const changed = deconflictErdNodes(erd, anchor, {
      centerBias: options.centerBias ?? 0.02,
      laneGravity: options.laneGravity ?? 0.08,
      margin: options.margin ?? 1.05,
      passes: 1,
      strength: options.strength ?? 0.2
    });
    refreshErdGeometry(erd);
    remaining -= 1;
    if (remaining > 0 && changed) {
      erdRelaxFrames.set(erd, window.requestAnimationFrame(step));
      return;
    }
    erdRelaxFrames.delete(erd);
    if (options.store) storeErdLayout(erd);
    updateErdStatus(erd);
  };
  erdRelaxFrames.set(erd, window.requestAnimationFrame(step));
}

function nudgeErdNode(node, dx, dy) {
  const erd = node?.closest?.("[data-if-erd]");
  if (!erd || !node) return;
  const [x, y] = getErdNodePosition(node);
  setErdNodePosition(node, x + dx, y + dy);
  deconflictErdNodes(erd, node, { margin: 0.9, passes: 2, strength: 0.24 });
  animateErdDeconflict(erd, node, { frames: 8, margin: 0.95, strength: 0.16, store: true });
  refreshErdGeometry(erd);
  storeErdLayout(erd);
  updateErdStatus(erd);
}

function organizeErd(control) {
  const erd = control.closest("[data-if-erd]");
  if (!erd) return;
  const action = control.dataset.ifErdOrganize || "tidy";
  const selected = qs("[data-erd-node][aria-selected='true']", erd);
  if (action === "reset") {
    resetErdLayout(erd);
    resetErdView(getErdCanvas(erd));
    return;
  }
  const changed = deconflictErdNodes(erd, selected, {
    centerBias: action === "nudge" ? 0.02 : 0.045,
    laneGravity: action === "nudge" ? 0.06 : 0.12,
    margin: action === "nudge" ? 0.9 : 1.65,
    passes: action === "nudge" ? 8 : 18,
    strength: action === "nudge" ? 0.28 : 0.62
  });
  animateErdDeconflict(erd, selected, {
    centerBias: action === "nudge" ? 0.015 : 0.035,
    frames: action === "nudge" ? 10 : 16,
    laneGravity: action === "nudge" ? 0.05 : 0.1,
    margin: action === "nudge" ? 1 : 1.45,
    store: true,
    strength: action === "nudge" ? 0.16 : 0.24
  });
  refreshErdGeometry(erd);
  if (changed) storeErdLayout(erd);
  updateErdStatus(erd);
}

function resetErdLayout(erd) {
  if (!erd) return;
  const key = getErdStorageKey(erd);
  if (key && window.localStorage) window.localStorage.removeItem(key);
  qsa("[data-erd-node]", erd).forEach((node) => {
    if (node.dataset.erdInitialX) node.style.setProperty("--x", `${node.dataset.erdInitialX}%`);
    if (node.dataset.erdInitialY) node.style.setProperty("--y", `${node.dataset.erdInitialY}%`);
  });
  refreshErdGeometry(erd);
  erd.dispatchEvent(new CustomEvent("if:erd-layout-reset", { bubbles: true }));
}

function updateErdStatus(erd) {
  if (!erd) return;
  const selected = qs("[data-erd-node][aria-selected='true']", erd);
  const focusId = erd.dataset.erdFocusId;
  const focusDirection = erd.dataset.erdFocusDirection || "neighborhood";
  const activeEdgeClasses = getErdActiveEdgeClasses(erd);
  const edgeFilterText = activeEdgeClasses
    ? (activeEdgeClasses.size ? Array.from(activeEdgeClasses).map(formatGraphLabel).join(" + ") : "No relationships")
    : "All relationships";
  qsa("[data-if-erd-status]", erd).forEach((item) => {
    const key = item.dataset.ifErdStatus;
    if (key === "mode") item.textContent = formatGraphLabel(getErdMode(erd));
    if (key === "nodes") item.textContent = String(qsa("[data-erd-node]:not(.is-hidden)", erd).length);
    if (key === "edges") item.textContent = String(qsa("[data-erd-edge-from][data-erd-edge-to]:not(.is-hidden)", erd).length);
    if (key === "selected") item.textContent = focusId ? `${focusId} ${focusDirection}` : selected?.dataset.erdNode || "Full ERD";
    if (key === "edgeFilters") item.textContent = edgeFilterText;
  });
}

function getErdRelatedIds(erd, id, direction = "neighborhood") {
  const related = new Set([id]);
  qsa("[data-erd-edge-from][data-erd-edge-to]", erd).forEach((edge) => {
    if (direction !== "upstream" && edge.dataset.erdEdgeFrom === id) related.add(edge.dataset.erdEdgeTo);
    if (direction !== "downstream" && edge.dataset.erdEdgeTo === id) related.add(edge.dataset.erdEdgeFrom);
  });
  return related;
}

function getErdActiveEdgeClasses(erd) {
  const filters = qsa("[data-if-erd-edge-filter]", erd);
  if (!filters.length) return null;
  return new Set(filters
    .filter((button) => button.getAttribute("aria-pressed") !== "false")
    .map((button) => button.dataset.ifErdEdgeFilter)
    .filter(Boolean));
}

function applyErdFocus(erd) {
  if (!erd) return;
  const focusId = erd.dataset.erdFocusId;
  const focusDirection = erd.dataset.erdFocusDirection || "neighborhood";
  const selectedNode = qs("[data-erd-node][aria-selected='true']", erd);
  const canFocusSelection = Boolean(selectedNode);
  const relatedIds = focusId ? getErdRelatedIds(erd, focusId, focusDirection) : null;
  const activeEdgeClasses = getErdActiveEdgeClasses(erd);
  qsa("[data-erd-node]", erd).forEach((node) => {
    const visible = !relatedIds || relatedIds.has(node.dataset.erdNode);
    node.classList.toggle("is-hidden", !visible);
  });
  qsa("[data-erd-edge-from][data-erd-edge-to]", erd).forEach((edge) => {
    const classVisible = !activeEdgeClasses || activeEdgeClasses.has(edge.dataset.edgeClass || "canonical");
    const upstreamVisible = edge.dataset.erdEdgeTo === focusId;
    const downstreamVisible = edge.dataset.erdEdgeFrom === focusId;
    const focusVisible = !focusId || (focusDirection === "upstream" ? upstreamVisible : focusDirection === "downstream" ? downstreamVisible : upstreamVisible || downstreamVisible);
    const visible = classVisible && focusVisible;
    edge.classList.toggle("is-hidden", !visible);
  });
  qsa("[data-erd-minimap-node]", erd).forEach((node) => {
    const visible = !relatedIds || relatedIds.has(node.dataset.erdMinimapNode);
    node.classList.toggle("is-hidden", !visible);
  });
  qsa("[data-if-erd-focus='clear']", erd).forEach((button) => {
    button.disabled = !focusId;
  });
  qsa("[data-if-erd-focus]:not([data-if-erd-focus='clear'])", erd).forEach((button) => {
    const active = Boolean(focusId) && (button.dataset.ifErdFocus || "neighborhood") === focusDirection;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
    button.disabled = !canFocusSelection;
  });
  updateErdStatus(erd);
}

function setErdEdgeFilter(control) {
  const erd = control.closest("[data-if-erd]");
  if (!erd) return;
  const pressed = control.getAttribute("aria-pressed") !== "true";
  control.classList.toggle("is-active", pressed);
  control.setAttribute("aria-pressed", String(pressed));
  applyErdFocus(erd);
  erd.dispatchEvent(new CustomEvent("if:erd-edge-filter", {
    bubbles: true,
    detail: { edgeClass: control.dataset.ifErdEdgeFilter, active: pressed }
  }));
}

function setErdFocus(control) {
  const erd = control.closest("[data-if-erd]");
  if (!erd || control.disabled) return;
  const action = control.dataset.ifErdFocus || "neighborhood";
  if (action === "clear") {
    delete erd.dataset.erdFocusId;
    delete erd.dataset.erdFocusDirection;
    applyErdFocus(erd);
    return;
  }
  const selected = qs("[data-erd-node][aria-selected='true']", erd);
  if (selected) {
    erd.dataset.erdFocusId = selected.dataset.erdNode;
    erd.dataset.erdFocusDirection = action === "selection" ? "neighborhood" : action;
    applyErdFocus(erd);
  }
}

function selectErdNode(node) {
  const erd = node.closest("[data-if-erd]");
  if (!erd) return;
  const id = node.dataset.erdNode;
  qsa("[data-erd-node]", erd).forEach((item) => {
    const selected = item === node;
    const related = selected || qsa("[data-erd-edge-from][data-erd-edge-to]", erd).some((edge) => {
      return (edge.dataset.erdEdgeFrom === id && edge.dataset.erdEdgeTo === item.dataset.erdNode) || (edge.dataset.erdEdgeTo === id && edge.dataset.erdEdgeFrom === item.dataset.erdNode);
    });
    item.classList.toggle("is-related", related);
    item.classList.toggle("is-muted", !related);
    item.setAttribute("aria-selected", String(selected));
  });
  qsa("[data-erd-edge-from][data-erd-edge-to]", erd).forEach((edge) => {
    const related = edge.dataset.erdEdgeFrom === id || edge.dataset.erdEdgeTo === id;
    edge.classList.toggle("is-related", related);
    edge.classList.toggle("is-muted", !related);
  });
  if (erd.dataset.erdFocusId) {
    erd.dataset.erdFocusId = id;
    erd.dataset.erdFocusDirection = erd.dataset.erdFocusDirection || "neighborhood";
    applyErdFocus(erd);
  } else {
    applyErdFocus(erd);
  }
}

function positionGraphPeek(graph, node) {
  const peek = qs(".if-graph-peek", graph);
  if (!peek || !node) return;
  const [x, y] = getGraphNodePosition(node);
  peek.style.setProperty("--x", `${clampGraphPercent(x + 8, 10, 82)}%`);
  peek.style.setProperty("--y", `${clampGraphPercent(y - 10, 12, 88)}%`);
}

function showGraphPeek(node) {
  const graph = node.closest("[data-if-graph]");
  if (!graph || graph.dataset.graphDragging === "true") return;
  let peek = qs(".if-graph-peek", graph);
  if (!peek) {
    peek = document.createElement("div");
    peek.className = "if-graph-peek";
    peek.setAttribute("role", "status");
    peek.setAttribute("aria-live", "polite");
    qs(".if-graph-viewport", graph)?.append(peek);
  }
  const title = node.dataset.nodeLabel || node.querySelector(".if-graph-node__title")?.textContent?.trim() || node.dataset.nodeId;
  const relation = node.dataset.nodeRelation ? formatGraphLabel(node.dataset.nodeRelation) : "Seed entity";
  const meta = node.dataset.nodePeek || node.querySelector(".if-graph-node__meta")?.textContent?.trim() || "Click for details";
  const hiddenEdges = qsa(`[data-edge-from="${node.dataset.nodeId}"], [data-edge-to="${node.dataset.nodeId}"]`, graph).filter((edge) => edge.hidden).length;
  const visibleEdges = qsa(`[data-edge-from="${node.dataset.nodeId}"], [data-edge-to="${node.dataset.nodeId}"]`, graph).filter((edge) => !edge.hidden).length;
  peek.innerHTML = `
    <div class="if-graph-peek__eyebrow">${relation}</div>
    <strong>${title}</strong>
    <span>${meta}</span>
    <div class="if-graph-peek__footer">
      <span>${visibleEdges} visible links</span>
      ${hiddenEdges ? `<span>${hiddenEdges} clustered</span>` : "<span>Drag to reposition</span>"}
    </div>
  `;
  peek.hidden = false;
  positionGraphPeek(graph, node);
}

function hideGraphPeek(graph) {
  const peek = graph ? qs(".if-graph-peek", graph) : null;
  if (peek) peek.hidden = true;
}

function getOpenGraphContextMenu() {
  const menus = qsa(".if-graph-context-menu:not([hidden])");
  return menus[menus.length - 1] || null;
}

function hideGraphContextMenu(graph) {
  const scope = graph || document;
  qsa(".if-graph-context-menu", scope).forEach((menu) => {
    menu.hidden = true;
    delete menu.dataset.nodeId;
  });
}

function positionGraphContextMenu(graph, node) {
  const menu = qs(".if-graph-context-menu", graph);
  if (!menu || !node) return;
  const canvas = getGraphCanvas(graph);
  const nodeRect = node.getBoundingClientRect?.();
  const canvasRect = canvas?.getBoundingClientRect?.();
  if (!canvas || !nodeRect || !canvasRect) return;
  const nodeCenterX = nodeRect.left + nodeRect.width / 2;
  const menuRect = menu.getBoundingClientRect?.();
  const menuWidth = Math.min(menuRect?.width || 288, Math.max(160, canvasRect.width - 16));
  const offset = 6;
  const availableRight = canvasRect.right - nodeRect.right;
  const availableLeft = nodeRect.left - canvasRect.left;
  const side = availableRight >= menuWidth + offset
    ? "right"
    : availableLeft >= menuWidth + offset
      ? "left"
      : nodeCenterX > canvasRect.left + canvasRect.width / 2 ? "left" : "right";
  const x = side === "right"
    ? nodeRect.right - canvasRect.left + offset
    : nodeRect.left - canvasRect.left - offset;
  const y = nodeRect.top + nodeRect.height / 2 - canvasRect.top;
  const minX = side === "left" ? menuWidth + 8 : 8;
  const maxX = side === "left" ? canvasRect.width - 8 : Math.max(8, canvasRect.width - menuWidth - 8);
  menu.dataset.side = side;
  menu.style.setProperty("--x", `${Math.max(minX, Math.min(maxX, x)).toFixed(1)}px`);
  menu.style.setProperty("--y", `${Math.max(28, Math.min(canvasRect.height - 28, y)).toFixed(1)}px`);
}

function showGraphContextMenu(node) {
  const graph = node?.closest?.("[data-if-graph]");
  const canvas = graph ? getGraphCanvas(graph) : null;
  if (!graph || !canvas || graph.dataset.graphDragging === "true") return;
  hideGraphPeek(graph);
  hideGraphContextMenu(graph);
  let menu = qs(".if-graph-context-menu", graph);
  if (!menu) {
    menu = document.createElement("div");
    menu.className = "if-graph-context-menu";
    menu.setAttribute("role", "menu");
    canvas.append(menu);
  }
  const id = node.dataset.nodeId || "";
  const title = node.dataset.nodeLabel || node.querySelector(".if-graph-node__title")?.textContent?.replace(/\s+/g, " ").trim() || id || "Graph node";
  const relation = node.dataset.nodeRelation ? formatGraphLabel(node.dataset.nodeRelation) : (node.classList.contains("if-graph-node--primary") ? "Seed node" : "Graph node");
  const cluster = node.dataset.ifGraphCluster || "";
  const isCluster = Boolean(cluster);
  const open = isCluster && graph.getAttribute(`data-cluster-${cluster}`) === "open";
  const count = node.dataset.clusterCount || String(isCluster ? getGraphClusterMemberNodes(graph, cluster).length : 0);
  menu.dataset.nodeId = id;
  menu.innerHTML = `
    <div class="if-graph-context-menu__header">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(relation)}</span>
    </div>
    <div class="if-graph-context-menu__actions" aria-label="Node actions">
      <button class="if-icon-btn if-icon-btn--sm" type="button" role="menuitem" title="Focus node" data-if-graph-context-action="focus" data-node-id="${escapeHtml(id)}"><span class="if-icon-slot" data-if-icon="focus" aria-hidden="true"></span></button>
      ${isCluster ? `<button class="if-btn if-btn--sm" type="button" role="menuitem" data-if-graph-context-action="toggle-children" data-node-id="${escapeHtml(id)}">${open ? "Hide" : "Show"} ${escapeHtml(count)} children</button>` : ""}
      <button class="if-btn if-btn--sm" type="button" role="menuitem" data-if-graph-context-action="arrange" data-node-id="${escapeHtml(id)}">Arrange around</button>
      <button class="if-btn if-btn--sm" type="button" role="menuitem" data-if-graph-context-action="depth" data-node-id="${escapeHtml(id)}">Traverse +1</button>
    </div>
  `;
  hydrateIcons(menu);
  menu.hidden = false;
  positionGraphContextMenu(graph, node);
}

function runGraphContextAction(control) {
  const graph = control.closest("[data-if-graph]");
  if (!graph) return;
  const nodeId = control.dataset.nodeId || qs(".if-graph-context-menu", graph)?.dataset.nodeId || "";
  const node = nodeId ? qs(`.if-graph-node[data-node-id="${escapeCssIdentifier(nodeId)}"]`, graph) : null;
  if (!node) return;
  const action = control.dataset.ifGraphContextAction;
  if (action === "toggle-children" && node.matches("[data-if-graph-cluster]")) {
    toggleGraphCluster(node);
    selectGraphNode(node);
    setGraphPath(graph, node);
    showGraphContextMenu(node);
    return;
  }
  if (action === "arrange") {
    if (node.matches("[data-if-graph-cluster]") && graph.getAttribute(`data-cluster-${node.dataset.ifGraphCluster}`) === "open") {
      layoutGraphClusterMembers(node, { force: true });
    }
    deconflictGraphNodes(graph, node, { passes: 8, strength: 0.52, margin: graph.dataset.graphNodeDensity === "compact" ? 1.1 : 1.85 });
    updateAnchoredGraphClusters(graph, node);
    refreshGraphGeometry(graph);
    showToast("Graph neighborhood rearranged", "graph");
  }
  if (action === "depth") {
    if (node.matches("[data-if-graph-cluster]") && graph.getAttribute(`data-cluster-${node.dataset.ifGraphCluster}`) !== "open") {
      toggleGraphCluster(node);
    }
    selectGraphNode(node);
    setGraphPath(graph, node);
    showToast("Traversal depth expanded", "layers");
  }
  if (action === "focus") {
    selectGraphNode(node);
    setGraphPath(graph, node);
  }
  showGraphContextMenu(node);
}

function getGraphNodeCollisionBox(node, canvas, zoom = 1) {
  const nodeRect = node.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const [x, y] = getGraphNodePosition(node);
  const scale = zoom || 1;
  return {
    height: (nodeRect.height / Math.max(canvasRect.height, 1)) * 100 / scale,
    node,
    width: (nodeRect.width / Math.max(canvasRect.width, 1)) * 100 / scale,
    x,
    y
  };
}

function deconflictGraphNodes(graph, anchor = null, options = {}) {
  if (!graph) return false;
  const canvas = getGraphCanvas(graph);
  if (!canvas) return false;
  const nodes = qsa(".if-graph-node[data-node-id]", graph).filter((node) => !node.hidden);
  if (nodes.length < 2) return false;
  const zoom = getGraphView(canvas).zoom || 1;
  const margin = options.margin ?? (graph.dataset.graphNodeDensity === "compact" ? 1.2 : 2.1);
  const strength = options.strength ?? 0.72;
  let changed = false;

  for (let pass = 0; pass < (options.passes ?? 5); pass += 1) {
    let movedThisPass = false;
    const boxes = nodes.map((node) => getGraphNodeCollisionBox(node, canvas, zoom));

    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = ((a.width + b.width) / 2) + margin - Math.abs(dx);
        const overlapY = ((a.height + b.height) / 2) + margin - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        const separateOnX = overlapX < overlapY;
        const direction = separateOnX ? (dx === 0 ? (i % 2 ? -1 : 1) : Math.sign(dx)) : (dy === 0 ? (j % 2 ? -1 : 1) : Math.sign(dy));
        const push = (separateOnX ? overlapX : overlapY) * strength;
        const moveA = anchor && a.node === anchor ? 0 : anchor && b.node === anchor ? 1 : 0.5;
        const moveB = anchor && b.node === anchor ? 0 : anchor && a.node === anchor ? 1 : 0.5;

        if (separateOnX) {
          if (moveA) a.x -= direction * push * moveA;
          if (moveB) b.x += direction * push * moveB;
        } else {
          if (moveA) a.y -= direction * push * moveA;
          if (moveB) b.y += direction * push * moveB;
        }

        setGraphNodePosition(a.node, a.x, a.y);
        setGraphNodePosition(b.node, b.x, b.y);
        movedThisPass = true;
        changed = true;
      }
    }

    if (!movedThisPass) break;
  }

  if (changed) {
    graph.dispatchEvent(new CustomEvent("if:graph-deconflict", {
      bubbles: true,
      detail: { anchor, nodes: nodes.length }
    }));
  }
  return changed;
}

function startGraphDrag(event, node) {
  if (graphDrag || graphPan || erdMinimapPan) return;
  if (event.button !== 0) return;
  const graph = node.closest("[data-if-graph]");
  const canvas = node.closest(".if-graph-canvas");
  if (!graph || !canvas) return;
  const viewport = getGraphViewport(canvas);
  const rect = viewport?.getBoundingClientRect?.() || canvas.getBoundingClientRect();
  const [startX, startY] = getGraphNodePosition(node);
  graphDrag = {
    canvas,
    graph,
    moved: false,
    node,
    pointerId: event.pointerId ?? "mouse",
    rect,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX,
    startY
  };
  graph.dataset.graphDragging = "true";
  node.classList.add("is-dragging");
  hideGraphPeek(graph);
  hideGraphContextMenu(graph);
  if (event.pointerId !== undefined) node.setPointerCapture?.(event.pointerId);
}

function startGraphPan(event, canvas) {
  if (graphDrag || graphPan || erdMinimapPan) return;
  if (!canvas || event.button !== 0) return;
  const view = getGraphView(canvas);
  graphPan = {
    canvas,
    moved: false,
    pointerId: event.pointerId ?? "mouse",
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPanX: view.panX,
    startPanY: view.panY
  };
  canvas.dataset.graphPanning = "true";
  hideGraphContextMenu(canvas.closest("[data-if-graph]"));
  if (event.pointerId !== undefined) canvas.setPointerCapture?.(event.pointerId);
}

function startErdDrag(event, node) {
  if (erdDrag || erdPan || erdMinimapPan || graphDrag || graphPan) return;
  if (event.button !== 0) return;
  const erd = node.closest("[data-if-erd]");
  const canvas = node.closest(".if-erd-canvas");
  if (!erd || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const view = getErdView(canvas);
  const [startX, startY] = getErdNodePosition(node);
  erdDrag = {
    canvas,
    erd,
    moved: false,
    node,
    pointerId: event.pointerId ?? "mouse",
    rect,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX,
    startY,
    zoom: view.zoom || 1
  };
  erd.dataset.erdDragging = "true";
  node.classList.add("is-dragging");
  if (event.pointerId !== undefined) node.setPointerCapture?.(event.pointerId);
}

function startErdPan(event, canvas) {
  if (erdDrag || erdPan || erdMinimapPan || graphDrag || graphPan) return;
  if (!canvas || event.button !== 0) return;
  const view = getErdView(canvas);
  erdPan = {
    canvas,
    moved: false,
    pointerId: event.pointerId ?? "mouse",
    startClientX: event.clientX,
    startClientY: event.clientY,
    startPanX: view.panX,
    startPanY: view.panY
  };
  canvas.dataset.erdPanning = "true";
  if (event.pointerId !== undefined) canvas.setPointerCapture?.(event.pointerId);
}

function startDataTableColumnResize(event, handle) {
  if (tableResizeDrag || event.button !== 0) return;
  const th = handle.closest("th");
  const table = handle.closest("[data-if-data-table]");
  if (!th || !table) return;
  event.preventDefault();
  tableResizeDrag = {
    handle,
    pointerId: event.pointerId ?? "mouse",
    startClientX: event.clientX,
    startWidth: th.getBoundingClientRect().width,
    table,
    columnIndex: Number.parseInt(th.dataset.ifTableColumnIndex || "0", 10) || 0
  };
  table.dataset.ifTableResizing = "true";
  handle.setAttribute("aria-pressed", "true");
  if (event.pointerId !== undefined) handle.setPointerCapture?.(event.pointerId);
}

function startDiagramItemDrag(event, item) {
  if (diagramDrag || event.button !== 0) return;
  const diagram = item.closest("[data-if-diagram]");
  if (!diagram || diagram.dataset.diagramEditing !== "true") return;
  if (getDiagramEditTool(diagram) !== "move") return;
  if (event.target.closest("button, a, input, select, textarea, [contenteditable], [data-if-diagram-edit-field]")) return;
  const offset = getDiagramItemOffset(item);
  focusDiagramItem(item);
  diagramDrag = {
    diagram,
    item,
    moved: false,
    pointerId: event.pointerId ?? "mouse",
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: offset.x,
    startY: offset.y
  };
  event.preventDefault();
  item.classList.add("is-diagram-dragging");
  diagram.dataset.diagramDragging = "true";
  if (event.pointerId !== undefined) item.setPointerCapture?.(event.pointerId);
}

function handlePointerDown(event) {
  const tableResize = event.target.closest("[data-if-table-resize-handle]");
  if (tableResize) {
    startDataTableColumnResize(event, tableResize);
    return;
  }
  if (graphDrag || graphPan || graphMinimapPan || diagramDrag || erdDrag || erdPan || erdMinimapPan || tableResizeDrag) return;
  const diagramItem = event.target.closest(diagramItemSelector);
  const diagramForItem = diagramItem?.closest("[data-if-diagram]");
  if (diagramItem && diagramForItem?.dataset.diagramEditing === "true" && getDiagramEditTool(diagramForItem) === "move") {
    startDiagramItemDrag(event, diagramItem);
    return;
  }
  const graphMinimap = event.target.closest(".if-graph-minimap");
  if (graphMinimap) {
    event.preventDefault();
    startGraphMinimapPan(event, graphMinimap);
    return;
  }
  const erdMinimap = event.target.closest(".if-erd-minimap");
  if (erdMinimap) {
    event.preventDefault();
    startErdMinimapPan(event, erdMinimap);
    return;
  }
  const erdNode = event.target.closest("[data-erd-node]");
  if (erdNode) {
    const erd = erdNode.closest("[data-if-erd]");
    const mode = getErdMode(erd);
    if (mode === "arrange") {
      startErdDrag(event, erdNode);
    } else if (mode === "pan") {
      startErdPan(event, erdNode.closest(".if-erd-canvas"));
    }
    return;
  }
  const erdCanvas = event.target.closest(".if-erd-canvas");
  if (erdCanvas && event.button === 0 && !event.target.closest("button, a, input, select, textarea")) {
    startErdPan(event, erdCanvas);
    return;
  }
  const graphNode = event.target.closest(".if-graph-node[data-node-id]");
  if (graphNode) {
    startGraphDrag(event, graphNode);
    return;
  }
  const graphCluster = event.target.closest("[data-if-graph-cluster]");
  if (graphCluster) {
    startGraphDrag(event, graphCluster);
    return;
  }
  const canvas = event.target.closest(".if-graph-canvas");
  if (!canvas || event.button !== 0) return;
  if (event.target.closest("button, a, input, select, textarea, .if-graph-minimap")) return;
  startGraphPan(event, canvas);
}

function handlePointerMove(event) {
  const pointerId = event.pointerId ?? "mouse";
  if (tableResizeDrag && pointerId === tableResizeDrag.pointerId) {
    const delta = event.clientX - tableResizeDrag.startClientX;
    resizeDataTableColumn(tableResizeDrag.table, tableResizeDrag.columnIndex, tableResizeDrag.startWidth + delta);
    return;
  }
  if (graphMinimapPan && pointerId === graphMinimapPan.pointerId) {
    if (Math.abs(event.clientX - graphMinimapPan.startClientX) > 2 || Math.abs(event.clientY - graphMinimapPan.startClientY) > 2) {
      graphMinimapPan.moved = true;
    }
    panGraphToMinimapPoint(graphMinimapPan.minimap, event);
    return;
  }
  if (erdMinimapPan && pointerId === erdMinimapPan.pointerId) {
    if (Math.abs(event.clientX - erdMinimapPan.startClientX) > 2 || Math.abs(event.clientY - erdMinimapPan.startClientY) > 2) {
      erdMinimapPan.moved = true;
    }
    panErdToMinimapPoint(erdMinimapPan.minimap, event);
    return;
  }
  if (diagramDrag && pointerId === diagramDrag.pointerId) {
    const dx = event.clientX - diagramDrag.startClientX;
    const dy = event.clientY - diagramDrag.startClientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) diagramDrag.moved = true;
    setDiagramItemOffset(diagramDrag.item, diagramDrag.startX + dx, diagramDrag.startY + dy);
    syncDiagramEditor(diagramDrag.diagram, diagramDrag.item);
    updateDiagramStats(diagramDrag.diagram);
    refreshConnectorRoutes(diagramDrag.diagram);
    return;
  }
  if (erdPan) {
    const dx = event.clientX - erdPan.startClientX;
    const dy = event.clientY - erdPan.startClientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) erdPan.moved = true;
    applyErdView(erdPan.canvas, {
      panX: erdPan.startPanX + dx,
      panY: erdPan.startPanY + dy,
      zoom: getErdView(erdPan.canvas).zoom
    });
    return;
  }
  if (erdDrag && pointerId === erdDrag.pointerId) {
    const dx = ((event.clientX - erdDrag.startClientX) / erdDrag.rect.width) * 100 / erdDrag.zoom;
    const dy = ((event.clientY - erdDrag.startClientY) / erdDrag.rect.height) * 100 / erdDrag.zoom;
    if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35) erdDrag.moved = true;
    setErdNodePosition(erdDrag.node, erdDrag.startX + dx, erdDrag.startY + dy);
    deconflictErdNodes(erdDrag.erd, erdDrag.node, {
      margin: 0.7,
      passes: 2,
      strength: 0.2
    });
    refreshErdGeometry(erdDrag.erd);
    return;
  }
  if (graphPan) {
    const dx = event.clientX - graphPan.startClientX;
    const dy = event.clientY - graphPan.startClientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) graphPan.moved = true;
    applyGraphView(graphPan.canvas, {
      panX: graphPan.startPanX + dx,
      panY: graphPan.startPanY + dy,
      zoom: getGraphView(graphPan.canvas).zoom
    });
    return;
  }
  if (!graphDrag || pointerId !== graphDrag.pointerId) return;
  const dx = ((event.clientX - graphDrag.startClientX) / graphDrag.rect.width) * 100;
  const dy = ((event.clientY - graphDrag.startClientY) / graphDrag.rect.height) * 100;
  if (Math.abs(dx) > 0.35 || Math.abs(dy) > 0.35) graphDrag.moved = true;
  setGraphNodePosition(graphDrag.node, graphDrag.startX + dx, graphDrag.startY + dy);
  if (graphDrag.node.matches?.("[data-if-graph-cluster]")) {
    updateGraphClusterAnchor(graphDrag.node);
    layoutGraphClusterMembers(graphDrag.node);
  } else {
    deconflictGraphNodes(graphDrag.graph, graphDrag.node, {
      margin: graphDrag.graph.dataset.graphNodeDensity === "compact" ? 0.85 : 1.35,
      passes: 2,
      strength: 0.22
    });
    updateAnchoredGraphClusters(graphDrag.graph, graphDrag.node);
  }
  refreshGraphGeometry(graphDrag.graph);
}

function handlePointerUp(event) {
  const currentPointerId = event.pointerId ?? "mouse";
  if (tableResizeDrag && currentPointerId === tableResizeDrag.pointerId) {
    const { handle, pointerId, table, columnIndex } = tableResizeDrag;
    if (event.pointerId !== undefined) handle.releasePointerCapture?.(pointerId);
    handle.setAttribute("aria-pressed", "false");
    delete table.dataset.ifTableResizing;
    table.dispatchEvent(new CustomEvent("if:table-column-resize-end", {
      bubbles: true,
      detail: { columnIndex, table }
    }));
    tableResizeDrag = null;
    return;
  }
  if (graphMinimapPan && currentPointerId === graphMinimapPan.pointerId) {
    const { minimap, pointerId, moved } = graphMinimapPan;
    if (event.pointerId !== undefined) minimap.releasePointerCapture?.(pointerId);
    delete minimap.dataset.minimapPanning;
    if (moved) {
      const graph = minimap.closest("[data-if-graph]");
      if (graph) {
        graph.dataset.graphSuppressClick = "true";
        window.setTimeout(() => {
          if (graph.dataset.graphSuppressClick === "true") delete graph.dataset.graphSuppressClick;
        }, 120);
      }
    }
    graphMinimapPan = null;
    return;
  }
  if (erdMinimapPan && currentPointerId === erdMinimapPan.pointerId) {
    const { minimap, pointerId, moved } = erdMinimapPan;
    if (event.pointerId !== undefined) minimap.releasePointerCapture?.(pointerId);
    delete minimap.dataset.minimapPanning;
    if (moved) {
      const erd = minimap.closest("[data-if-erd]");
      if (erd) {
        erd.dataset.erdSuppressClick = "true";
        window.setTimeout(() => {
          if (erd.dataset.erdSuppressClick === "true") delete erd.dataset.erdSuppressClick;
        }, 120);
      }
    }
    erdMinimapPan = null;
    return;
  }
  if (diagramDrag && currentPointerId === diagramDrag.pointerId) {
    const { diagram, item, moved, pointerId } = diagramDrag;
    if (event.pointerId !== undefined) item.releasePointerCapture?.(pointerId);
    item.classList.remove("is-diagram-dragging");
    delete diagram.dataset.diagramDragging;
    if (moved) {
      diagram.dataset.diagramSuppressClick = "true";
      window.setTimeout(() => {
        if (diagram.dataset.diagramSuppressClick === "true") delete diagram.dataset.diagramSuppressClick;
      }, 120);
      maybeAutosaveDiagramLayout(diagram);
      diagram.dispatchEvent(new CustomEvent("if:diagram-node-move", {
        bubbles: true,
        detail: { diagram, item, offset: getDiagramItemOffset(item) }
      }));
    } else {
      focusDiagramItem(item);
    }
    updateDiagramStats(diagram);
    diagramDrag = null;
    return;
  }
  if (erdPan) {
    const { canvas, pointerId, moved } = erdPan;
    if (event.pointerId !== undefined) canvas.releasePointerCapture?.(pointerId);
    delete canvas.dataset.erdPanning;
    if (moved) {
      const erd = canvas.closest("[data-if-erd]");
      if (erd) {
        erd.dataset.erdSuppressClick = "true";
        window.setTimeout(() => {
          if (erd.dataset.erdSuppressClick === "true") delete erd.dataset.erdSuppressClick;
        }, 120);
      }
    }
    canvas.dispatchEvent(new CustomEvent("if:erd-pan", {
      bubbles: true,
      detail: getErdView(canvas)
    }));
    erdPan = null;
    return;
  }
  if (erdDrag && currentPointerId === erdDrag.pointerId) {
    const { erd, node, moved, pointerId } = erdDrag;
    if (event.pointerId !== undefined) node.releasePointerCapture?.(pointerId);
    node.classList.remove("is-dragging");
    if (moved) {
      deconflictErdNodes(erd, node, { margin: 1.05, passes: 4, strength: 0.32 });
      animateErdDeconflict(erd, node, { frames: 10, margin: 1.05, strength: 0.18, store: true });
      refreshErdGeometry(erd);
      storeErdLayout(erd);
      erd.dataset.erdSuppressClick = "true";
      window.setTimeout(() => {
        if (erd.dataset.erdSuppressClick === "true") delete erd.dataset.erdSuppressClick;
      }, 120);
    }
    delete erd.dataset.erdDragging;
    erd.dispatchEvent(new CustomEvent("if:erd-node-move", {
      bubbles: true,
      detail: { id: node.dataset.erdNode, node, position: getErdNodePosition(node) }
    }));
    updateErdStatus(erd);
    erdDrag = null;
    return;
  }
  if (graphPan) {
    const { canvas, pointerId, moved } = graphPan;
    if (event.pointerId !== undefined) canvas.releasePointerCapture?.(pointerId);
    delete canvas.dataset.graphPanning;
    if (moved) {
      const graph = canvas.closest("[data-if-graph]");
      if (graph) {
        graph.dataset.graphSuppressClick = "true";
        window.setTimeout(() => {
          if (graph.dataset.graphSuppressClick === "true") delete graph.dataset.graphSuppressClick;
        }, 120);
      }
    }
    canvas.dispatchEvent(new CustomEvent("if:graph-pan", {
      bubbles: true,
      detail: getGraphView(canvas)
    }));
    graphPan = null;
    return;
  }
  if (!graphDrag || currentPointerId !== graphDrag.pointerId) return;
  const { graph, node, moved, pointerId } = graphDrag;
  if (event.pointerId !== undefined) node.releasePointerCapture?.(pointerId);
  node.classList.remove("is-dragging");
  if (moved) {
    const cluster = node.matches?.("[data-if-graph-cluster]");
    if (cluster) {
      updateGraphClusterAnchor(node);
      layoutGraphClusterMembers(node);
    } else {
      deconflictGraphNodes(graph, node);
      updateAnchoredGraphClusters(graph, node);
    }
    refreshGraphGeometry(graph);
    graph.dataset.graphSuppressClick = "true";
    window.setTimeout(() => {
      if (graph.dataset.graphSuppressClick === "true") delete graph.dataset.graphSuppressClick;
    }, 120);
  }
  delete graph.dataset.graphDragging;
  const movedCluster = node.matches?.("[data-if-graph-cluster]");
  graph.dispatchEvent(new CustomEvent(movedCluster ? "if:graph-cluster-move" : "if:graph-node-move", {
    bubbles: true,
    detail: { id: node.dataset.nodeId || node.dataset.ifGraphCluster, node, position: getGraphNodePosition(node) }
  }));
  updateGraphStatus(graph);
  graphDrag = null;
}

function setGraphLayout(control, options = {}) {
  const graph = control.closest("[data-if-graph]");
  if (!graph) return;
  const canvas = qs(".if-graph-canvas", graph);
  const layoutName = control.dataset.ifGraphLayout || "radial";
  const layout = graphLayouts[layoutName];
  if (!graph || !canvas || !layout) return;
  graph.dataset.graphLayout = layoutName;
  qsa("[data-if-graph-layout]", graph).forEach((button) => {
    const selected = button === control;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const engineName = control.dataset.ifGraphLayoutEngine || graph.dataset.ifGraphLayoutEngine;
  if (engineName) {
    runGraphLayoutEngine(graph, engineName, { layout: layoutName, preserveView: options.preserveView });
    return;
  }
  const organizedLayout = transformGraphLayout(layout, getGraphOrganizationOptions(graph));
  Object.entries(organizedLayout).forEach(([id, [x, y]]) => {
    const node = qs(`.if-graph-node[data-node-id="${id}"]`, graph);
    if (node) {
      node.style.setProperty("--x", `${x}%`);
      node.style.setProperty("--y", `${y}%`);
    }
  });
  deconflictGraphNodes(graph, null, { passes: 7, strength: 0.58 });
  refreshGraphGeometry(graph);
  if (!options.preserveView) resetGraphView(canvas);
  updateGraphStatus(graph);
}

function getVisibleGraphRelations(graph) {
  const controls = qsa("[data-if-graph-relation]", graph.closest(".if-shell") || document);
  if (!controls.length) return null;
  return new Set(controls.filter((control) => control.checked).map((control) => control.dataset.ifGraphRelation));
}

function setGraphVisibility(item, hidden) {
  item.hidden = hidden;
  item.toggleAttribute("hidden", hidden);
  item.toggleAttribute("aria-hidden", hidden);
  item.classList.toggle("is-hidden", hidden);
  if (item instanceof SVGElement) {
    item.style.display = hidden ? "none" : "";
  }
}

function getGraphClusterRelation(control) {
  return control.dataset.clusterType || control.dataset.nodeRelation || control.dataset.edgeType || "";
}

function getGraphClusterMembers(graph, cluster) {
  if (!graph || !cluster) return [];
  return qsa(`[data-cluster-member="${escapeCssIdentifier(cluster)}"]`, graph);
}

function getGraphClusterParentNode(control, graph) {
  const parentId = control.dataset.clusterParent || control.dataset.clusterSource || "";
  return parentId ? qs(`.if-graph-node[data-node-id="${escapeCssIdentifier(parentId)}"]`, graph) : null;
}

function getGraphClusterMemberNodes(graph, cluster) {
  return getGraphClusterMembers(graph, cluster).filter((item) => item.matches?.(".if-graph-node[data-node-id]"));
}

function getGraphClusterVector(control, graph) {
  const parent = getGraphClusterParentNode(control, graph);
  const [cx, cy] = getGraphNodePosition(control);
  const [px, py] = parent ? getGraphNodePosition(parent) : [cx - 1, cy];
  const dx = cx - px;
  const dy = cy - py;
  const length = Math.hypot(dx, dy) || 1;
  return [dx / length, dy / length];
}

function layoutGraphClusterMembers(control, options = {}) {
  const graph = control?.closest?.("[data-if-graph]");
  const cluster = control?.dataset?.ifGraphCluster;
  if (!graph || !cluster) return [];
  const open = graph.getAttribute(`data-cluster-${cluster}`) === "open";
  if (!open && !options.force) return [];
  const members = getGraphClusterMemberNodes(graph, cluster);
  if (!members.length) return [];
  const [cx, cy] = getGraphNodePosition(control);
  const [vx, vy] = getGraphClusterVector(control, graph);
  const spacing = toFiniteNumber(control.dataset.clusterSpacing, 12);
  members.forEach((node, index) => {
    const offsetX = toFiniteNumber(node.dataset.clusterOffsetX, Number.NaN);
    const offsetY = toFiniteNumber(node.dataset.clusterOffsetY, Number.NaN);
    const x = Number.isFinite(offsetX) ? cx + offsetX : cx + vx * spacing * (index + 1);
    const y = Number.isFinite(offsetY) ? cy + offsetY : cy + vy * spacing * (index + 1);
    setGraphNodePosition(node, x, y);
  });
  graph.dispatchEvent(new CustomEvent("if:graph-cluster-layout", {
    bubbles: true,
    detail: { cluster, control, members }
  }));
  return members;
}

function prepareGraphClusterControl(control, graph) {
  const cluster = control.dataset.ifGraphCluster;
  if (!cluster || !graph) return [];
  ensureGraphClusterAnchor(control, graph);
  const members = getGraphClusterMembers(graph, cluster);
  const safeCluster = cluster.replace(/[^a-zA-Z0-9_-]/g, "-");
  const ids = members.map((member, index) => {
    if (!member.id) member.id = `if-graph-cluster-${safeCluster}-${index + 1}`;
    return member.id;
  });
  if (ids.length) control.setAttribute("aria-controls", ids.join(" "));
  control.dataset.clusterState = graph.getAttribute(`data-cluster-${cluster}`) === "open" ? "open" : "closed";
  return members;
}

function setGraphClusterState(control, open) {
  const count = control.dataset.clusterCount || "";
  const label = control.dataset.clusterLabel || "related links";
  const context = control.dataset.clusterContext || "";
  const state = qs("[data-if-graph-cluster-state]", control);
  const type = qs("[data-if-graph-cluster-type]", control);
  const action = qs("[data-if-graph-cluster-action]", control);
  const contextTarget = qs("[data-if-graph-cluster-context]", control);
  const indicator = qs("[data-if-graph-cluster-indicator]", control);
  const childCount = qs("[data-if-graph-child-count]", control);
  const icon = qs("[data-if-icon]", control);
  const countLabel = `${count || "More"} ${label}`.trim();
  if (state) state.textContent = open ? `${countLabel} shown` : countLabel;
  if (type) type.textContent = label;
  if (action) action.textContent = open ? "Collapse" : "Expand";
  if (contextTarget) contextTarget.textContent = context;
  if (childCount) {
    childCount.textContent = count || String(getGraphClusterMembers(control.closest("[data-if-graph]"), control.dataset.ifGraphCluster).length || "");
    childCount.dataset.ifGraphChildState = open ? "open" : "closed";
    childCount.title = open ? `${countLabel} shown` : `Show ${countLabel}`;
  }
  if (!state && !type && !childCount && !control.classList.contains("if-graph-node")) {
    control.textContent = open ? `Collapse ${countLabel}` : `Expand ${countLabel}`;
  }
  if (indicator) indicator.textContent = open ? "-" : "+";
  if (icon && control.dataset.clusterIcon) {
    icon.dataset.ifIcon = control.dataset.clusterIcon;
    hydrateIcons(control);
  }
  const accessibleContext = context ? ` ${context}` : "";
  const ownerLabel = control.dataset.nodeLabel ? `${control.dataset.nodeLabel}. ` : "";
  control.setAttribute("aria-expanded", String(open));
  control.setAttribute("aria-pressed", String(open));
  control.dataset.clusterState = open ? "open" : "closed";
  control.setAttribute("aria-label", ownerLabel + (open ? `Collapse ${countLabel}${accessibleContext}` : `Expand ${countLabel}${accessibleContext}`));
  control.title = open ? `Collapse ${countLabel}${accessibleContext}` : `Expand ${countLabel}${accessibleContext}`;
}

function setGraphClusterExpanded(control, open, options = {}) {
  const graph = control.closest("[data-if-graph]");
  if (!graph) return;
  const cluster = control.dataset.ifGraphCluster;
  if (!cluster) return;
  const key = `data-cluster-${cluster}`;
  const members = prepareGraphClusterControl(control, graph);
  graph.setAttribute(key, open ? "open" : "closed");
  control.classList.toggle("is-open", open);
  control.classList.toggle("has-open-children", open);
  setGraphClusterState(control, open);
  if (open) layoutGraphClusterMembers(control, { force: true });
  members.forEach((item) => {
    item.classList.toggle("is-cluster-open", open);
    item.dataset.clusterExpanded = String(open);
  });
  if (!options.skipFilters) applyGraphFilters(graph);
}

function applyGraphFilters(graph) {
  const visibleRelations = getVisibleGraphRelations(graph);
  const inferredControl = qs("[data-if-graph-inferred]", graph.closest(".if-shell") || document);
  const showInferred = !inferredControl || inferredControl.checked;
  qsa("[data-edge-from][data-edge-to]", graph).forEach((edge) => {
    const type = edge.dataset.edgeType;
    const clusterName = edge.dataset.clusterMember;
    const clustered = clusterName && graph.getAttribute(`data-cluster-${clusterName}`) !== "open";
    const inferred = edge.dataset.edgeInferred === "true";
    setGraphVisibility(edge, Boolean(clustered || (!showInferred && inferred) || (visibleRelations && type && !visibleRelations.has(type))));
  });
  qsa("[data-edge-label-from][data-edge-label-to]", graph).forEach((label) => {
    const type = label.dataset.edgeType;
    const clusterName = label.dataset.clusterMember;
    const clustered = clusterName && graph.getAttribute(`data-cluster-${clusterName}`) !== "open";
    const inferred = label.dataset.edgeInferred === "true";
    setGraphVisibility(label, Boolean(clustered || (!showInferred && inferred) || (visibleRelations && type && !visibleRelations.has(type))));
  });
  qsa(".if-graph-node[data-node-relation]", graph).forEach((node) => {
    const relation = node.dataset.nodeRelation;
    const clusterName = node.dataset.clusterMember;
    const clustered = clusterName && graph.getAttribute(`data-cluster-${clusterName}`) !== "open";
    setGraphVisibility(node, Boolean(clustered || (visibleRelations && relation && !visibleRelations.has(relation))));
  });
  qsa("[data-if-graph-cluster]", graph).forEach((control) => {
    const relation = getGraphClusterRelation(control);
    const hidden = Boolean(visibleRelations && relation && !visibleRelations.has(relation));
    const cluster = control.dataset.ifGraphCluster;
    prepareGraphClusterControl(control, graph);
    if (hidden && cluster) graph.setAttribute(`data-cluster-${cluster}`, "closed");
    const open = !hidden && cluster && graph.getAttribute(`data-cluster-${cluster}`) === "open";
    control.classList.toggle("is-open", Boolean(open));
    setGraphClusterState(control, Boolean(open));
    if (open) layoutGraphClusterMembers(control, { force: true });
    setGraphVisibility(control, hidden);
  });
  const explicitSelection = qs(".if-graph-node.is-selected", graph);
  if (explicitSelection?.hidden) {
    explicitSelection.classList.remove("is-selected", "is-related");
    explicitSelection.setAttribute("aria-selected", "false");
  }
  const selected = explicitSelection && !explicitSelection.hidden
    ? explicitSelection
    : (graph.dataset.ifGraphInitialSelection === "none" ? null : qs(".if-graph-node[data-node-id]:not([hidden])", graph));
  if (selected && !selected.hidden) selectGraphNode(selected);
  deconflictGraphNodes(graph, selected && !selected.hidden ? selected : null, { passes: 5, strength: 0.45 });
  qsa("[data-if-graph-cluster][data-cluster-state='open']", graph).forEach((control) => layoutGraphClusterMembers(control, { force: true }));
  refreshGraphGeometry(graph);
  updateGraphStatus(graph);
}

function toggleGraphCluster(control) {
  const graph = control.closest("[data-if-graph]");
  if (!graph) return;
  const cluster = control.dataset.ifGraphCluster;
  if (!cluster) return;
  const members = getGraphClusterMembers(graph, cluster);
  const selectedMember = members.find((item) => item.matches?.(".if-graph-node.is-selected, .if-graph-node[aria-selected='true']"));
  const open = graph.getAttribute(`data-cluster-${cluster}`) !== "open";
  setGraphClusterExpanded(control, open, { skipFilters: true });
  applyGraphFilters(graph);
  const ownerNode = getGraphClusterParentNode(control, graph) || (control.matches?.(".if-graph-node[data-node-id]") ? control : null);
  if (ownerNode && !ownerNode.hidden) {
    selectGraphNode(ownerNode);
    setGraphPath(graph, ownerNode);
    if (!open && selectedMember) ownerNode.focus({ preventScroll: true });
  } else if (!open && selectedMember) {
    resetGraphFocus(graph);
    control.focus({ preventScroll: true });
  }
  refreshGraphGeometry(graph);
  graph.dispatchEvent(new CustomEvent("if:graph-cluster", {
    bubbles: true,
    detail: {
      cluster,
      control,
      memberCount: members.length,
      members,
      open,
      parent: ownerNode,
      relation: getGraphClusterRelation(control)
    }
  }));
}

function traverseGraph(control) {
  const graph = control.closest("[data-if-graph]");
  if (!graph) return;
  const targetId = control.dataset.ifGraphTraverse;
  const node = qs(`.if-graph-node[data-node-id="${targetId}"]`, graph);
  if (!node) return;
  if (node.dataset.clusterMember && node.hidden) {
    const cluster = node.dataset.clusterMember;
    const clusterControl = qs(`[data-if-graph-cluster="${cluster}"]`, graph);
    if (clusterControl) toggleGraphCluster(clusterControl);
  }
  selectGraphNode(node);
  setGraphPath(graph, node);
  node.focus({ preventScroll: true });
}

function selectTraversalStep(control) {
  const step = control.closest("[data-traversal-step]");
  const explorer = control.closest("[data-if-traversal]");
  if (!step || !explorer) return;
  const id = step.dataset.traversalStep;
  const label = step.dataset.traversalLabel || step.textContent.trim();
  qsa("[data-traversal-step]", explorer).forEach((item) => {
    const selected = item === step;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-selected", String(selected));
    if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "0");
  });
  qsa("[data-traversal-panel]", explorer).forEach((panel) => {
    const selected = panel.dataset.traversalPanel === id;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
  qsa("[data-if-traversal-current]", explorer).forEach((target) => {
    target.textContent = label;
  });
  explorer.dispatchEvent(new CustomEvent("if:traversal-select", {
    bubbles: true,
    detail: { id, label }
  }));
}

const defaultHierarchyNodeTypes = {
  law: { className: "law", color: "#334155", icon: "law", label: "Law" },
  statute: { className: "law", color: "#334155", icon: "statute", label: "Statute" },
  authority: { className: "authority", color: "#4f46e5", icon: "gavel", label: "Authority" },
  executive: { className: "authority", color: "#4f46e5", icon: "federalRegister", label: "Executive" },
  policy: { className: "policy", color: "#0f4aa2", icon: "policy", label: "Policy" },
  instruction: { className: "policy", color: "#0f4aa2", icon: "instruction", label: "Instruction" },
  directive: { className: "policy", color: "#0f4aa2", icon: "directive", label: "Directive" },
  service: { className: "service", color: "#0369a1", icon: "serviceBranch", label: "Service" },
  component: { className: "component", color: "#0f766e", icon: "component", label: "Component" },
  organization: { className: "component", color: "#0f766e", icon: "department", label: "Organization" },
  baseline: { className: "baseline", color: "#b45309", icon: "checklist", label: "Baseline" },
  implementation: { className: "implementation", color: "#0f766e", icon: "implementation", label: "Implementation" },
  evidence: { className: "evidence", color: "#15803d", icon: "evidence", label: "Evidence" },
  proof: { className: "evidence", color: "#15803d", icon: "artifact", label: "Proof" },
  claim: { className: "claim", color: "#15803d", icon: "claim", label: "Claim" },
  gap: { className: "gap", color: "#b42318", icon: "warning", label: "Gap" },
  deadend: { className: "dead-end", color: "#64748b", icon: "minus", label: "Dead end" }
};

function normalizeHierarchyNodeType(type, config = {}) {
  const key = toGraphTypeKey(type || config.type);
  if (!key) throw new Error("InterfaceFramework.registerHierarchyNodeType requires a node type.");
  const next = {
    type: key,
    className: toGraphTypeClass(config.className || type),
    color: config.color || "",
    icon: config.icon || "",
    label: config.label || formatGraphLabel(type),
    data: config.data && typeof config.data === "object" ? { ...config.data } : {}
  };
  if (typeof config.render === "function") next.render = config.render;
  return next;
}

function registerHierarchyNodeType(type, config = {}) {
  const next = normalizeHierarchyNodeType(type, config);
  hierarchyNodeTypes.set(next.type, next);
  return () => unregisterHierarchyNodeType(next.type);
}

function unregisterHierarchyNodeType(type) {
  return hierarchyNodeTypes.delete(toGraphTypeKey(type));
}

function getHierarchyNodeTypeConfig(type) {
  const key = toGraphTypeKey(type);
  return hierarchyNodeTypes.get(key) || defaultHierarchyNodeTypes[key] || null;
}

function getHierarchyNodeTypeFromClass(row) {
  const typeClass = Array.from(row?.classList || []).find((className) => className.startsWith("if-hierarchy-row--"));
  if (!typeClass) return "";
  const className = typeClass.replace("if-hierarchy-row--", "");
  const match = Object.entries(defaultHierarchyNodeTypes).find(([, config]) => config.className === className);
  return match?.[0] || className;
}

function applyHierarchyNodeType(row, explicitType) {
  if (!row?.matches?.("[data-hierarchy-node]")) return null;
  const type = explicitType || row.dataset.hierarchyType || row.dataset.hierarchyKind || getHierarchyNodeTypeFromClass(row);
  const config = getHierarchyNodeTypeConfig(type);
  if (!config) return null;
  row.dataset.hierarchyType = config.type;
  row.dataset.hierarchyTypeLabel = config.label || formatGraphLabel(config.type);
  const classPrefix = row.classList.contains("if-landscape-node") ? "if-landscape-node--" : "if-hierarchy-row--";
  const managedClasses = new Set([
    ...Object.values(defaultHierarchyNodeTypes).map((item) => item.className),
    ...Array.from(hierarchyNodeTypes.values()).map((item) => item.className)
  ].filter(Boolean).flatMap((className) => [`if-hierarchy-row--${className}`, `if-landscape-node--${className}`]));
  managedClasses.forEach((className) => {
    if (className !== `${classPrefix}${config.className}`) row.classList.remove(className);
  });
  if (config.className) row.classList.add(`${classPrefix}${config.className}`);
  if (config.color) {
    row.style.setProperty("--hierarchy-type-color", config.color);
    row.style.setProperty("--hierarchy-edge-color", `color-mix(in srgb, ${config.color} 68%, var(--if-border-strong))`);
  }
  Object.entries(config.data || {}).forEach(([key, value]) => {
    if (value == null) return;
    row.dataset[key] = String(value);
  });
  const icon = qs("[data-if-hierarchy-icon], .if-hierarchy-row__icon[data-if-icon]", row);
  if (icon && config.icon) {
    icon.dataset.ifIcon = config.icon;
    delete icon.dataset.ifIconHydrated;
    hydrateIcons(row);
  }
  if (typeof config.render === "function") config.render(row, { config, type: config.type });
  return config;
}

function applyHierarchyNodeTypes(hierarchyOrRoot = document) {
  const root = typeof hierarchyOrRoot === "string" ? qs(hierarchyOrRoot) || document : hierarchyOrRoot || document;
  const rows = root.matches?.("[data-hierarchy-node]") ? [root] : qsa("[data-hierarchy-node]", root);
  const applied = rows.map((row) => ({ row, config: applyHierarchyNodeType(row) })).filter((item) => item.config);
  const explorer = root.closest?.("[data-if-hierarchy]") || (root.matches?.("[data-if-hierarchy]") ? root : null);
  if (explorer) {
    explorer.dispatchEvent(new CustomEvent("if:hierarchy-node-types", {
      bubbles: true,
      detail: { applied, hierarchy: explorer }
    }));
  }
  return applied;
}

function getHierarchyChildren(explorer, parentId) {
  if (!explorer || !parentId) return [];
  return qsa(`[data-hierarchy-parent="${escapeCssIdentifier(parentId)}"]`, explorer);
}

function getHierarchyExplicitChildCount(row) {
  const raw = row?.dataset?.hierarchyChildCount || row?.dataset?.childCount || "";
  const count = Number.parseInt(raw, 10);
  return Number.isFinite(count) ? count : null;
}

function getHierarchyLevel(row, explorer) {
  const explicit = Number.parseInt(row?.dataset?.hierarchyLevel || "", 10);
  if (Number.isFinite(explicit)) return explicit;
  const styleLevel = Number.parseInt(String(row?.style?.getPropertyValue("--level") || "").trim(), 10);
  if (Number.isFinite(styleLevel)) return styleLevel;
  let level = 0;
  let parentId = row?.dataset?.hierarchyParent;
  const seen = new Set([row?.dataset?.hierarchyNode]);
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = qs(`[data-hierarchy-node="${escapeCssIdentifier(parentId)}"]`, explorer);
    if (!parent) break;
    level += 1;
    parentId = parent.dataset.hierarchyParent;
  }
  return level;
}

function ensureHierarchySpacer(row) {
  const existing = qs(":scope > .if-hierarchy-row__spacer", row);
  if (existing) return existing;
  const spacer = document.createElement("span");
  spacer.className = "if-hierarchy-row__spacer";
  const first = row.firstElementChild;
  if (first) row.insertBefore(spacer, first);
  else row.append(spacer);
  return spacer;
}

function ensureHierarchyToggle(row, expanded = true) {
  let toggle = qs(":scope > [data-if-hierarchy-toggle]", row);
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.className = "if-hierarchy-row__toggle";
    toggle.type = "button";
    toggle.dataset.ifHierarchyToggle = "";
    toggle.setAttribute("aria-expanded", String(expanded));
    const spacer = qs(":scope > .if-hierarchy-row__spacer", row);
    if (spacer) spacer.replaceWith(toggle);
    else row.insertBefore(toggle, row.firstElementChild);
  } else if (!toggle.hasAttribute("aria-expanded")) {
    toggle.setAttribute("aria-expanded", String(expanded));
  }
  syncHierarchyToggle(toggle, toggle.getAttribute("aria-expanded") !== "false");
  return toggle;
}

function removeHierarchyToggleForLeaf(row) {
  const toggle = qs(":scope > [data-if-hierarchy-toggle]", row);
  if (!toggle) {
    ensureHierarchySpacer(row);
    return null;
  }
  const spacer = document.createElement("span");
  spacer.className = "if-hierarchy-row__spacer";
  toggle.replaceWith(spacer);
  return spacer;
}

function applyHierarchyStructure(explorer) {
  if (!explorer) return [];
  const rows = qsa("[data-hierarchy-node]", explorer);
  const changed = [];
  rows.forEach((row) => {
    const id = row.dataset.hierarchyNode;
    if (!id) return;
    const treeRow = row.classList.contains("if-hierarchy-row");
    const children = getHierarchyChildren(explorer, id);
    const explicitChildCount = getHierarchyExplicitChildCount(row);
    const declaredState = (row.dataset.hierarchyState || "").toLowerCase();
    const hasKnownChildren = children.length > 0;
    const hasDeclaredChildren = explicitChildCount !== null && explicitChildCount > 0;
    const lazyBranch = row.dataset.hierarchyLoad === "lazy" || row.dataset.hierarchyLazy === "true";
    const branch = declaredState === "branch" || hasKnownChildren || hasDeclaredChildren || lazyBranch;
    const deadEnd = declaredState === "dead-end" || declaredState === "deadend" || row.dataset.hierarchyDeadEnd === "true";
    const level = getHierarchyLevel(row, explorer);
    row.style.setProperty("--level", String(level));
    row.dataset.hierarchyChildCount = String(explicitChildCount ?? children.length);
    row.dataset.hierarchyState = branch ? "branch" : deadEnd ? "dead-end" : "leaf";
    row.classList.toggle("has-children", branch);
    row.classList.toggle("is-leaf", !branch);
    row.classList.toggle("is-dead-end", deadEnd || (!branch && row.dataset.hierarchyTerminal === "true"));
    row.setAttribute("aria-level", String(level + 1));
    row.setAttribute("aria-setsize", String(getHierarchyChildren(explorer, row.dataset.hierarchyParent || "").length || rows.filter((item) => !item.dataset.hierarchyParent).length || 1));
    if (!treeRow) {
      changed.push({ row, state: row.dataset.hierarchyState, children });
      return;
    }
    if (branch) {
      const toggle = ensureHierarchyToggle(row, row.classList.contains("is-collapsed") ? false : true);
      const expanded = toggle.getAttribute("aria-expanded") !== "false";
      const childIds = children.map((child, index) => {
        if (!child.id) child.id = `if-hierarchy-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}-${index + 1}`;
        return child.id;
      });
      if (childIds.length) toggle.setAttribute("aria-controls", childIds.join(" "));
      else toggle.removeAttribute("aria-controls");
      row.setAttribute("aria-expanded", String(expanded));
      row.classList.toggle("is-collapsed", !expanded);
      syncHierarchyToggle(toggle, expanded);
      changed.push({ row, state: "branch", children });
    } else {
      removeHierarchyToggleForLeaf(row);
      row.removeAttribute("aria-expanded");
      changed.push({ row, state: row.dataset.hierarchyState, children });
    }
  });
  explorer.dispatchEvent(new CustomEvent("if:hierarchy-structure", {
    bubbles: true,
    detail: { hierarchy: explorer, rows: changed }
  }));
  return changed;
}

function setHierarchyDescendants(explorer, parentId, hidden) {
  getHierarchyChildren(explorer, parentId).forEach((row) => {
    row.hidden = hidden;
    row.toggleAttribute("aria-hidden", hidden);
    const childId = row.dataset.hierarchyNode;
    const toggle = qs("[data-if-hierarchy-toggle]", row);
    const childCollapsed = toggle?.getAttribute("aria-expanded") === "false";
    if (childId) setHierarchyDescendants(explorer, childId, hidden || childCollapsed);
  });
}

function getHierarchyRowLabel(row) {
  return row?.dataset.hierarchyLabel
    || qs(".if-hierarchy-row__title", row)?.textContent?.trim()
    || "hierarchy branch";
}

function syncHierarchyToggle(control, expanded = control.getAttribute("aria-expanded") !== "false") {
  const row = control.closest("[data-hierarchy-node]");
  const label = getHierarchyRowLabel(row);
  const action = expanded ? "Collapse" : "Expand";
  setExpanded(control, expanded);
  control.setAttribute("aria-label", `${action} ${label}`);
  control.title = `${action} branch`;
}

function toggleHierarchyBranch(control) {
  const row = control.closest("[data-hierarchy-node]");
  const explorer = control.closest("[data-if-hierarchy]");
  if (!row || !explorer) return;
  applyHierarchyStructure(explorer);
  if (row.dataset.hierarchyState !== "branch") {
    explorer.dispatchEvent(new CustomEvent("if:hierarchy-dead-end", {
      bubbles: true,
      detail: { id: row.dataset.hierarchyNode, row }
    }));
    return;
  }
  const expanded = control.getAttribute("aria-expanded") !== "true";
  syncHierarchyToggle(control, expanded);
  row.setAttribute("aria-expanded", String(expanded));
  row.classList.toggle("is-collapsed", !expanded);
  setHierarchyDescendants(explorer, row.dataset.hierarchyNode, !expanded);
  const children = getHierarchyChildren(explorer, row.dataset.hierarchyNode);
  if (expanded && !children.length && (row.dataset.hierarchyLoad === "lazy" || row.dataset.hierarchyLazy === "true")) {
    explorer.dispatchEvent(new CustomEvent("if:hierarchy-load", {
      bubbles: true,
      detail: { id: row.dataset.hierarchyNode, row }
    }));
  }
  explorer.dispatchEvent(new CustomEvent("if:hierarchy-toggle", {
    bubbles: true,
    detail: { id: row.dataset.hierarchyNode, expanded, childCount: getHierarchyChildren(explorer, row.dataset.hierarchyNode).length, row }
  }));
}

function selectHierarchyNode(control) {
  const row = control.closest("[data-hierarchy-node]");
  const explorer = control.closest("[data-if-hierarchy]");
  if (!row || !explorer || row.hidden) return;
  const id = row.dataset.hierarchyNode;
  const label = row.dataset.hierarchyLabel || qs(".if-hierarchy-row__title", row)?.textContent?.trim() || row.textContent.trim();
  const meta = qs(".if-hierarchy-row__meta", row)?.textContent?.trim() || "Hierarchy node";
  let matchedPanel = false;
  qsa("[data-hierarchy-node]", explorer).forEach((item) => {
    const selected = item === row;
    setSelected(item, selected, { activeClass: "is-selected", selectedClass: "is-selected" });
  });
  qsa("[data-hierarchy-panel]", explorer).forEach((panel) => {
    const selected = panel.dataset.hierarchyPanel === id;
    if (selected) matchedPanel = true;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
  if (!matchedPanel) {
    const detail = qs(".if-hierarchy__detail, .if-landscape-hierarchy__detail", explorer);
    let panel = qs("[data-hierarchy-panel='__generated']", explorer);
    if (detail) {
      if (!panel) {
        panel = document.createElement("article");
        panel.className = "if-hierarchy-panel";
        panel.dataset.hierarchyPanel = "__generated";
        detail.append(panel);
      }
      qsa("[data-hierarchy-panel]", explorer).forEach((item) => {
        item.hidden = item !== panel;
        item.classList.toggle("is-active", item === panel);
      });
      const childCount = qsa(`[data-hierarchy-parent="${id}"]`, explorer).length;
      const level = Number.parseInt(getComputedStyle(row).getPropertyValue("--level"), 10) || 0;
      panel.innerHTML = `
        <div class="if-hierarchy-panel__header">
          <div>
            <h3 class="if-hierarchy-panel__title">${escapeHtml(label)}</h3>
            <p class="if-hierarchy-panel__subtitle">${escapeHtml(meta)}</p>
          </div>
          <span class="if-badge">Level ${level}</span>
        </div>
        <div class="if-hierarchy-metrics">
          <div class="if-hierarchy-metric"><span>Direct children</span><strong>${childCount}</strong></div>
          <div class="if-hierarchy-metric"><span>Node id</span><strong>${escapeHtml(id.split("-").pop() || id)}</strong></div>
          <div class="if-hierarchy-metric"><span>State</span><strong>${childCount ? "Branch" : "Leaf"}</strong></div>
        </div>
      `;
    }
  }
  qsa("[data-if-hierarchy-current]", explorer).forEach((target) => {
    target.textContent = label;
  });
  explorer.dispatchEvent(new CustomEvent("if:hierarchy-select", {
    bubbles: true,
    detail: { id, row }
  }));
}

function toggleSurfaceExpansion(control) {
  const explicitTarget = getTarget(control, "ifSurfaceExpand");
  const target = explicitTarget || control.closest(".if-expandable-surface, .if-panel");
  if (!target) return;
  const expanded = !target.classList.contains("is-expanded");
  const requestedMode = control.dataset.ifSurfaceMode || target.dataset.ifSurfaceMode || "";
  const fullscreen = requestedMode === "fullscreen" || (target.matches(".if-expandable-surface") && requestedMode !== "inline");
  const managesVisibility = explicitTarget && (target.hidden || control.hasAttribute("aria-controls") || target.dataset.ifSurfaceMode === "inline");
  target.classList.toggle("is-expanded", expanded);
  target.classList.toggle("is-active", expanded);
  if (managesVisibility) target.hidden = !expanded;
  target.classList.toggle("if-expandable-surface--inline", expanded && !fullscreen);
  reconcileBodyScrollLock();
  setExpanded(control, expanded);
  if (control.hasAttribute("aria-pressed")) setPressed(control, expanded);
  control.setAttribute("title", expanded ? (fullscreen ? "Collapse" : "Hide") : (fullscreen ? "Expand" : "Show"));
  target.dispatchEvent(new CustomEvent("if:surface-expand", {
    bubbles: true,
    detail: { expanded, target, mode: fullscreen ? "fullscreen" : "inline" }
  }));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function serializeSurfaceForExport(target) {
  const rect = target.getBoundingClientRect();
  const clone = target.cloneNode(true);
  qsa("button, input, select, textarea", clone).forEach((control) => {
    control.setAttribute("disabled", "true");
  });
  clone.style.width = `${Math.ceil(rect.width)}px`;
  clone.style.minHeight = `${Math.ceil(rect.height)}px`;
  clone.style.margin = "0";
  const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("");
  return {
    height: Math.ceil(rect.height),
    html: `${styles}<div xmlns="http://www.w3.org/1999/xhtml" style="background:#fff;padding:16px;">${clone.outerHTML}</div>`,
    width: Math.ceil(rect.width)
  };
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((item, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    context.fillText(`${item}${suffix}`, x, y + index * lineHeight);
  });
  return Math.min(lines.length, maxLines) * lineHeight;
}

function fitCanvasText(context, text, maxWidth) {
  const value = String(text || "").trim();
  if (!value || context.measureText(value).width <= maxWidth) return value;
  let next = value;
  while (next.length > 1 && context.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next.trim()}...`;
}

function getExportSurfaceTitle(target) {
  return qs(".if-architecture-header__title, .if-panel__title, .if-diagram-example__header h3", target)?.textContent?.trim()
    || target.getAttribute("aria-label")
    || "Interface export";
}

function getExportSurfaceSubtitle(target) {
  return qs(".if-architecture-header__subtitle, .if-panel__subtitle, .if-diagram-example__header p", target)?.textContent?.trim()
    || "Generated from Interface Framework";
}

function getArchitectureAccent(stage, index = 0) {
  if (stage?.classList?.contains("if-arch-stage--ingest")) return "#256fff";
  if (stage?.classList?.contains("if-arch-stage--agent")) return "#6d28d9";
  if (stage?.classList?.contains("if-arch-stage--data")) return "#0f766e";
  if (stage?.classList?.contains("if-arch-stage--experience")) return "#b45309";
  return ["#0d47a1", "#256fff", "#6d28d9", "#0f766e", "#b45309"][index % 5];
}

function drawCanvasArrow(context, x1, y1, x2, y2, options = {}) {
  const color = options.color || "#07152f";
  const dashed = Boolean(options.dashed);
  const head = options.head ?? 8;
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = options.width || 2;
  context.setLineDash(dashed ? [8, 6] : []);
  context.beginPath();
  context.moveTo(x1, y1);
  if (options.elbow) {
    const midX = options.midX ?? (x1 + x2) / 2;
    context.lineTo(midX, y1);
    context.lineTo(midX, y2);
  }
  context.lineTo(x2, y2);
  context.stroke();
  context.setLineDash([]);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.restore();
}

function drawCanvasIconTile(context, icon, x, y, size, accent, options = {}) {
  const glyphs = {
    anchor: "A",
    archive: "C",
    bell: "!",
    calendar: "D",
    database: "DB",
    external: "W",
    graph: "G",
    home: "H",
    link: "L",
    message: "Q",
    policy: "P",
    search: "S",
    shield: "S",
    star: "*",
    trend: "^",
    user: "U",
    warning: "!"
  };
  context.save();
  context.fillStyle = options.fill || "#ffffff";
  context.strokeStyle = accent;
  context.lineWidth = 1.5;
  context.beginPath();
  context.roundRect(x, y, size, size, Math.max(6, size * 0.18));
  context.fill();
  context.stroke();
  context.fillStyle = accent;
  context.font = `800 ${Math.max(11, size * 0.32)}px Inter, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(glyphs[icon] || "PI", x + size / 2, y + size / 2 + 0.5);
  context.restore();
}

function getCanvasAsset(item) {
  const slot = qs(".if-asset-slot[data-if-asset], [data-if-asset]", item);
  const img = slot ? qs("img.if-asset-slot__image", slot) : null;
  if (!slot || !img || !img.complete || !img.naturalWidth || !shouldExportAsset(slot, img)) return null;
  return {
    fit: normalizeAssetFit(slot.dataset.ifAssetFit),
    img,
    slot
  };
}

function drawCanvasAsset(context, asset, x, y, width, height, options = {}) {
  if (!asset?.img) return false;
  const fit = normalizeAssetFit(options.fit || asset.fit);
  const sourceWidth = asset.img.naturalWidth;
  const sourceHeight = asset.img.naturalHeight;
  if (!sourceWidth || !sourceHeight || !width || !height) return false;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;
  let dx = x;
  let dy = y;
  let dw = width;
  let dh = height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  if (fit === "cover") {
    if (sourceRatio > targetRatio) {
      sw = sourceHeight * targetRatio;
      sx = (sourceWidth - sw) / 2;
    } else {
      sh = sourceWidth / targetRatio;
      sy = (sourceHeight - sh) / 2;
    }
  } else if (fit === "contain" || fit === "scale-down") {
    const ratio = Math.min(width / sourceWidth, height / sourceHeight, fit === "scale-down" ? 1 : Number.POSITIVE_INFINITY);
    dw = sourceWidth * ratio;
    dh = sourceHeight * ratio;
    dx = x + (width - dw) / 2;
    dy = y + (height - dh) / 2;
  }
  context.save();
  try {
    context.drawImage(asset.img, sx, sy, sw, sh, dx, dy, dw, dh);
    context.restore();
    return true;
  } catch {
    context.restore();
    return false;
  }
}

function drawArchitectureServiceCard(context, service, rect, accent, options = {}) {
  const guarded = service.classList?.contains("if-arch-service--guarded") || service.classList?.contains("if-arch-flow-note");
  const focused = service.classList?.contains("is-focused");
  const icon = qs("[data-if-icon]", service)?.dataset.ifIcon || "policy";
  const title = qs("strong", service)?.textContent?.trim() || service.textContent.trim();
  const meta = qs("strong", service)?.nextElementSibling?.textContent?.trim() || "";
  const badge = qs(".if-arch-service__badge", service)?.textContent?.trim() || "";
  context.save();
  context.fillStyle = guarded ? "#fbfdff" : "#ffffff";
  context.strokeStyle = focused ? "#256fff" : guarded ? "#6d28d9" : accent;
  context.lineWidth = focused ? 3 : guarded ? 1.7 : 1.2;
  context.setLineDash(guarded ? [6, 5] : []);
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.w, rect.h, 9);
  context.fill();
  context.stroke();
  context.setLineDash([]);
  const iconSize = Math.min(34, Math.max(26, rect.h - 22));
  const asset = getCanvasAsset(service);
  if (asset) {
    context.fillStyle = guarded ? "#f7f2ff" : "#f3f7ff";
    context.strokeStyle = accent;
    context.lineWidth = 1.2;
    context.beginPath();
    context.roundRect(rect.x + 10, rect.y + 10, iconSize, iconSize, Math.max(6, iconSize * 0.18));
    context.fill();
    context.stroke();
    if (!drawCanvasAsset(context, asset, rect.x + 14, rect.y + 14, iconSize - 8, iconSize - 8)) {
      drawCanvasIconTile(context, icon, rect.x + 10, rect.y + 10, iconSize, accent, {
        fill: guarded ? "#f7f2ff" : "#f3f7ff"
      });
    }
  } else {
    drawCanvasIconTile(context, icon, rect.x + 10, rect.y + 10, iconSize, accent, {
      fill: guarded ? "#f7f2ff" : "#f3f7ff"
    });
  }
  const textX = rect.x + 18 + iconSize;
  const textWidth = rect.w - iconSize - (badge ? 72 : 36);
  context.fillStyle = accent;
  context.font = `${options.small ? "700 11px" : "700 12px"} Inter, Arial, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText(fitCanvasText(context, title, textWidth), textX, rect.y + 24);
  context.fillStyle = "#34445f";
  context.font = `${options.small ? "10px" : "11px"} Inter, Arial, sans-serif`;
  wrapCanvasText(context, meta, textX, rect.y + 40, textWidth, 12, rect.h > 58 ? 2 : 1);
  if (badge) {
    const badgeWidth = Math.max(36, Math.min(70, context.measureText(badge).width + 14));
    const badgeX = rect.x + rect.w - badgeWidth - 10;
    const badgeY = rect.y + rect.h - 24;
    context.fillStyle = "#ffffff";
    context.strokeStyle = accent;
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(badgeX, badgeY, badgeWidth, 16, 8);
    context.fill();
    context.stroke();
    context.fillStyle = accent;
    context.font = "700 9px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(fitCanvasText(context, badge, badgeWidth - 8), badgeX + badgeWidth / 2, badgeY + 11.5);
  }
  context.restore();
}

function isVisibleForExport(item) {
  return !item.hidden && item.getClientRects().length > 0;
}

function exportGenericDiagramSurfaceAsPng(target, context) {
  const board = qs(".if-diagram-flow-board, .if-diagram-topology-board, .if-diagram-swimlane-board, .if-diagram-boundary-board, .if-diagram-matrix, .if-biotech-board", target);
  if (!board) return false;
  const boardRect = board.getBoundingClientRect();
  if (!boardRect.width || !boardRect.height) return false;
  const plot = { x: 48, y: 118, width: 1504, height: 780 };
  const scale = Math.min(plot.width / boardRect.width, plot.height / boardRect.height, 1.7);
  const drawWidth = boardRect.width * scale;
  const drawHeight = boardRect.height * scale;
  const offsetX = plot.x + (plot.width - drawWidth) / 2;
  const offsetY = plot.y + (plot.height - drawHeight) / 2;

  context.fillStyle = "#f8fafc";
  context.fillRect(plot.x, plot.y, plot.width, plot.height);
  context.strokeStyle = "#d7e0ea";
  context.lineWidth = 1.5;
  context.strokeRect(plot.x, plot.y, plot.width, plot.height);
  context.strokeStyle = "#e3e8ef";
  context.lineWidth = 1;
  for (let x = plot.x; x <= plot.x + plot.width; x += 36) {
    context.beginPath();
    context.moveTo(x, plot.y);
    context.lineTo(x, plot.y + plot.height);
    context.stroke();
  }
  for (let y = plot.y; y <= plot.y + plot.height; y += 36) {
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(plot.x + plot.width, y);
    context.stroke();
  }

  const rectToCanvas = (rect) => ({
    h: Math.max(18, rect.height * scale),
    w: Math.max(18, rect.width * scale),
    x: offsetX + (rect.left - boardRect.left) * scale,
    y: offsetY + (rect.top - boardRect.top) * scale
  });

  qsa(".if-diagram-connector, .if-topology-edge, .if-boundary-link", board).filter(isVisibleForExport).forEach((connector) => {
    const rect = rectToCanvas(connector.getBoundingClientRect());
    const horizontal = rect.w >= rect.h;
    const x1 = horizontal ? rect.x : rect.x + rect.w / 2;
    const y1 = horizontal ? rect.y + rect.h / 2 : rect.y;
    const x2 = horizontal ? rect.x + rect.w : rect.x + rect.w / 2;
    const y2 = horizontal ? rect.y + rect.h / 2 : rect.y + rect.h;
    context.setLineDash(connector.className.includes("guarded") || connector.className.includes("diagonal") ? [8, 6] : []);
    context.strokeStyle = connector.className.includes("guarded") ? "#6d28d9" : "#0d47a1";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.setLineDash([]);
  });

  qsa("[data-if-diagram-item], .if-diagram-node, .if-diagram-step, .if-diagram-zone, .if-diagram-matrix__cell", board)
    .filter(isVisibleForExport)
    .slice(0, 48)
    .forEach((item) => {
      const rect = rectToCanvas(item.getBoundingClientRect());
      const selected = item.classList.contains("is-focused");
      const danger = item.className.includes("danger") || item.className.includes("high");
      const warning = item.className.includes("warning") || item.className.includes("medium");
      const success = item.className.includes("success") || item.className.includes("low") || item.className.includes("evidence");
      const accent = danger ? "#dc2626" : warning ? "#b45309" : success ? "#168a4a" : "#0d47a1";
      context.fillStyle = selected ? "#eef5ff" : "#ffffff";
      context.strokeStyle = accent;
      context.lineWidth = selected ? 3 : 1.5;
      context.beginPath();
      context.roundRect(rect.x, rect.y, rect.w, rect.h, Math.min(10, rect.h / 5));
      context.fill();
      context.stroke();
      context.fillStyle = "#07152f";
      context.font = `${Math.max(10, Math.min(14, rect.h / 4))}px Inter, Arial, sans-serif`;
      context.textAlign = "left";
      const title = item.dataset.diagramTitle || qs("strong", item)?.textContent?.trim() || item.textContent.trim();
      const asset = getCanvasAsset(item);
      const assetSize = asset ? Math.min(32, Math.max(18, rect.h - 18)) : 0;
      let textX = rect.x + 10;
      let textWidth = rect.w - 20;
      if (asset) {
        context.fillStyle = "#f3f7ff";
        context.strokeStyle = accent;
        context.lineWidth = 1;
        context.beginPath();
        context.roundRect(rect.x + 8, rect.y + 8, assetSize, assetSize, Math.max(5, assetSize * 0.18));
        context.fill();
        context.stroke();
        drawCanvasAsset(context, asset, rect.x + 11, rect.y + 11, assetSize - 6, assetSize - 6);
        textX += assetSize + 8;
        textWidth -= assetSize + 8;
      }
      wrapCanvasText(context, title, textX, rect.y + Math.min(22, rect.h * 0.38), textWidth, 14, rect.h > 44 ? 2 : 1);
    });

  context.textAlign = "left";
  return true;
}

function exportDiagramSurfaceAsPng(target, context) {
  const board = qs(".if-architecture-board", target);
  if (!board) return exportGenericDiagramSurfaceAsPng(target, context);
  const stages = qsa(".if-arch-stage", board).filter((stage) => !stage.hidden);
  const platform = qsa(".if-platform-service", target).filter((service) => !service.hidden);
  const canvas = context.canvas;
  const margin = 48;
  const headerTop = 38;
  const boardTop = 132;
  const footerTop = canvas.height - 178;
  const boardHeight = footerTop - boardTop - 28;
  const plot = { x: margin, y: boardTop, width: canvas.width - margin * 2, height: boardHeight };
  const identity = qs(".if-architecture-identity", target);

  context.fillStyle = "#07152f";
  context.font = "800 32px Inter, Arial, sans-serif";
  context.fillText(fitCanvasText(context, getExportSurfaceTitle(target), 1140), margin, headerTop + 10);
  context.fillStyle = "#4e5c73";
  context.font = "italic 17px Inter, Arial, sans-serif";
  context.fillText(fitCanvasText(context, getExportSurfaceSubtitle(target), 1080), margin, headerTop + 42);

  if (identity) {
    const ix = canvas.width - margin - 390;
    const iy = headerTop - 12;
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#0d47a1";
    context.lineWidth = 1.8;
    context.beginPath();
    context.roundRect(ix, iy, 390, 60, 10);
    context.fill();
    context.stroke();
    drawCanvasIconTile(context, "shield", ix + 16, iy + 10, 40, "#0d47a1", { fill: "#eef5ff" });
    context.fillStyle = "#07152f";
    context.font = "800 16px Inter, Arial, sans-serif";
    context.fillText(qs("strong", identity)?.textContent?.trim() || "Identity & Access", ix + 68, iy + 24);
    context.fillStyle = "#34445f";
    context.font = "600 12px Inter, Arial, sans-serif";
    const identityMeta = Array.from(identity.querySelectorAll("span span")).map((item) => item.textContent.trim()).filter(Boolean).join(" / ");
    context.fillText(fitCanvasText(context, identityMeta || "SSO / RBAC / role-aware control surfaces", 295), ix + 68, iy + 42);
  }

  context.fillStyle = "#f8fbff";
  context.strokeStyle = "#d7e0ea";
  context.lineWidth = 1.5;
  context.beginPath();
  context.roundRect(plot.x, plot.y, plot.width, plot.height, 4);
  context.fill();
  context.stroke();
  context.strokeStyle = "#e3e8ef";
  context.lineWidth = 1;
  for (let x = plot.x; x <= plot.x + plot.width; x += 42) {
    context.beginPath();
    context.moveTo(x, plot.y);
    context.lineTo(x, plot.y + plot.height);
    context.stroke();
  }
  for (let y = plot.y; y <= plot.y + plot.height; y += 42) {
    context.beginPath();
    context.moveTo(plot.x, y);
    context.lineTo(plot.x + plot.width, y);
    context.stroke();
  }

  const ratios = [0.82, 1.02, 1.34, 1.02, 1.16];
  const gap = 20;
  const ratioTotal = stages.reduce((total, _stage, index) => total + (ratios[index] || 1), 0);
  const usableWidth = plot.width - gap * Math.max(0, stages.length - 1) - 30;
  let cursorX = plot.x + 15;

  stages.forEach((stage, index) => {
    const ratio = ratios[index] || 1;
    const stageWidth = usableWidth * ratio / Math.max(ratioTotal, 1);
    const x = cursorX;
    const y = plot.y + 18;
    const h = plot.height - 36;
    const accent = getArchitectureAccent(stage, index);
    context.fillStyle = index === 2 ? "#fcfaff" : index === 3 ? "#fbfffd" : index === 4 ? "#fffaf5" : "#ffffff";
    context.strokeStyle = accent;
    context.lineWidth = 2.2;
    context.beginPath();
    context.roundRect(x, y, stageWidth, h, 12);
    context.fill();
    context.stroke();
    context.fillStyle = accent;
    context.beginPath();
    context.arc(x + 27, y + 28, 17, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "800 17px Inter, Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(qs(".if-arch-stage__num", stage)?.textContent?.trim() || String(index + 1), x + 27, y + 34);
    context.textAlign = "left";
    context.fillStyle = "#07152f";
    context.font = "800 17px Inter, Arial, sans-serif";
    wrapCanvasText(context, qs(".if-arch-stage__title", stage)?.textContent || `Stage ${index + 1}`, x + 56, y + 21, stageWidth - 66, 18, 2);

    const services = qsa(".if-arch-service, .if-arch-flow-note", stage).filter((service) => !service.hidden);
    const serviceGap = 12;
    const contentTop = y + 76;
    const contentBottom = y + h - 20;
    const contentHeight = contentBottom - contentTop;
    if (stage.classList.contains("if-arch-stage--agent")) {
      const cellGap = 10;
      const cellW = (stageWidth - 28 - cellGap) / 2;
      const rowH = Math.min(54, Math.max(42, (contentHeight - cellGap * 5) / 6));
      let row = 0;
      let column = 0;
      services.slice(0, 10).forEach((service) => {
        const wide = service.classList.contains("if-arch-service--wide");
        const cardW = wide ? stageWidth - 28 : cellW;
        if (wide && column === 1) {
          row += 1;
          column = 0;
        }
        const cardX = x + 14 + (wide ? 0 : column * (cellW + cellGap));
        const cardY = contentTop + row * (rowH + serviceGap);
        drawArchitectureServiceCard(context, service, { x: cardX, y: cardY, w: cardW, h: rowH }, accent, { small: !wide });
        if (wide || column === 1) {
          row += 1;
          column = 0;
        } else {
          column += 1;
        }
      });
    } else {
      const serviceHeight = Math.min(58, Math.max(46, (contentHeight - serviceGap * Math.max(0, services.length - 1)) / Math.max(1, services.length)));
      services.slice(0, 7).forEach((service, serviceIndex) => {
        const sy = contentTop + serviceIndex * (serviceHeight + serviceGap);
        drawArchitectureServiceCard(context, service, { x: x + 14, y: sy, w: stageWidth - 28, h: serviceHeight }, accent);
      });
    }

    if (index < stages.length - 1) {
      const arrowY = y + h / 2;
      drawCanvasArrow(context, x + stageWidth + 2, arrowY, x + stageWidth + gap - 6, arrowY, {
        color: "#07152f",
        width: 2.2,
        head: 8
      });
    }
    cursorX += stageWidth + gap;
  });

  const footerY = footerTop;
  const legendWidth = 300;
  const bandWidth = canvas.width - margin * 2 - legendWidth - 24;
  context.fillStyle = "#f8fbff";
  context.strokeStyle = "#0d47a1";
  context.lineWidth = 1.8;
  context.beginPath();
  context.roundRect(margin, footerY, bandWidth, 112, 11);
  context.fill();
  context.stroke();
  context.fillStyle = "#0d47a1";
  context.font = "800 18px Inter, Arial, sans-serif";
  context.fillText("Cross-Cutting Platform Services", margin + 20, footerY + 28);
  const platformGap = 12;
  const serviceW = (bandWidth - 40 - platformGap * Math.max(0, platform.slice(0, 6).length - 1)) / Math.max(1, platform.slice(0, 6).length);
  platform.slice(0, 6).forEach((service, index) => {
    const serviceX = margin + 20 + index * (serviceW + platformGap);
    drawArchitectureServiceCard(context, service, { x: serviceX, y: footerY + 46, w: serviceW, h: 48 }, "#0d47a1", { small: true });
  });

  const legendX = margin + bandWidth + 24;
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#9aa7b8";
  context.lineWidth = 1.4;
  context.beginPath();
  context.roundRect(legendX, footerY, legendWidth, 112, 11);
  context.fill();
  context.stroke();
  context.fillStyle = "#07152f";
  context.font = "800 16px Inter, Arial, sans-serif";
  context.fillText("Legend", legendX + 18, footerY + 24);
  drawCanvasArrow(context, legendX + 18, footerY + 46, legendX + 78, footerY + 46, { color: "#07152f", width: 2, head: 7 });
  context.fillStyle = "#34445f";
  context.font = "11px Inter, Arial, sans-serif";
  context.fillText("Solid arrows: primary data flow", legendX + 92, footerY + 50);
  drawCanvasArrow(context, legendX + 18, footerY + 72, legendX + 78, footerY + 72, { color: "#07152f", width: 2, head: 7, dashed: true });
  context.fillText("Dashed: optional / guarded flow", legendX + 92, footerY + 76);
  drawCanvasIconTile(context, "shield", legendX + 18, footerY + 84, 22, "#0d47a1", { fill: "#eef5ff" });
  context.fillText("Shield: controlled / reviewed", legendX + 52, footerY + 100);
  context.textAlign = "left";
  return true;
}

function renderSurfaceToCanvas(target) {
  const canvas = document.createElement("canvas");
  const isArchitecture = Boolean(qs(".if-architecture-board", target));
  canvas.width = isArchitecture ? 1920 : 1600;
  canvas.height = isArchitecture ? 1080 : 1000;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#07152f";
  context.font = "700 26px Inter, Arial, sans-serif";
  if (!isArchitecture) context.fillText(getExportSurfaceTitle(target), 48, 58);
  context.fillStyle = "#566174";
  context.font = "16px Inter, Arial, sans-serif";
  if (!isArchitecture) context.fillText(getExportSurfaceSubtitle(target), 48, 86);

  const graph = qs(".if-graph-canvas", target);
  if (graph) {
    const plot = { x: 48, y: 118, width: 1504, height: 780 };
    context.fillStyle = "#f8fafc";
    context.fillRect(plot.x, plot.y, plot.width, plot.height);
    context.strokeStyle = "#e3e8ef";
    context.lineWidth = 1;
    for (let x = plot.x; x <= plot.x + plot.width; x += 40) {
      context.beginPath();
      context.moveTo(x, plot.y);
      context.lineTo(x, plot.y + plot.height);
      context.stroke();
    }
    for (let y = plot.y; y <= plot.y + plot.height; y += 40) {
      context.beginPath();
      context.moveTo(plot.x, y);
      context.lineTo(plot.x + plot.width, y);
      context.stroke();
    }
    const point = ([x, y]) => [plot.x + (x / 100) * plot.width, plot.y + (y / 100) * plot.height];
    context.lineWidth = 3;
    qsa("[data-edge-from][data-edge-to]", target).forEach((edge) => {
      if (edge.hidden) return;
      const from = qs(`.if-graph-node[data-node-id="${edge.dataset.edgeFrom}"]`, target);
      const to = qs(`.if-graph-node[data-node-id="${edge.dataset.edgeTo}"]`, target);
      if (!from || !to || from.hidden || to.hidden) return;
      const [x1, y1] = point(getGraphNodePosition(from));
      const [x2, y2] = point(getGraphNodePosition(to));
      context.setLineDash(edge.dataset.edgeInferred === "true" ? [10, 10] : []);
      context.strokeStyle = "#0d47a1";
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    });
    context.setLineDash([]);
    qsa(".if-graph-node[data-node-id]", target).forEach((node) => {
      if (node.hidden) return;
      const [x, y] = point(getGraphNodePosition(node));
      const selected = node.classList.contains("is-selected");
      const title = node.dataset.nodeLabel || node.querySelector(".if-graph-node__title")?.textContent?.replace(/\s+/g, " ").trim() || node.dataset.nodeId;
      context.fillStyle = selected ? "#f3f7ff" : "#ffffff";
      context.strokeStyle = selected ? "#256fff" : "#8a95a6";
      context.lineWidth = selected ? 4 : 2;
      context.beginPath();
      context.roundRect(x - 82, y - 42, 164, 84, 8);
      context.fill();
      context.stroke();
      context.fillStyle = "#07152f";
      context.font = "700 14px Inter, Arial, sans-serif";
      const words = title.split(" ");
      const lineOne = words.slice(0, 3).join(" ");
      const lineTwo = words.slice(3, 7).join(" ");
      context.textAlign = "center";
      context.fillText(lineOne, x, y - 6);
      if (lineTwo) context.fillText(lineTwo, x, y + 14);
      context.fillStyle = "#566174";
      context.font = "12px Inter, Arial, sans-serif";
      context.fillText(node.querySelector(".if-graph-node__meta")?.textContent?.trim() || "", x, y + 32);
    });
    context.textAlign = "left";
  } else if (exportDiagramSurfaceAsPng(target, context)) {
    context.textAlign = "left";
  } else {
    context.fillStyle = "#f8fafc";
    context.fillRect(48, 118, 1504, 780);
    context.fillStyle = "#07152f";
    context.font = "18px Inter, Arial, sans-serif";
    context.fillText(target.textContent.trim().replace(/\s+/g, " ").slice(0, 180), 72, 160);
  }

  context.fillStyle = "#758195";
  context.font = "13px Inter, Arial, sans-serif";
  context.fillText(`Exported ${new Date().toLocaleString()}`, 48, canvas.height - 48);
  return canvas;
}

function exportSurfaceAsPng(target, filename) {
  const canvas = renderSurfaceToCanvas(target);
  const blob = new Blob([dataUrlToBytes(canvas.toDataURL("image/png"))], { type: "image/png" });
  downloadBlob(blob, normalizeExportFilename(filename, "png"));
  return Promise.resolve(blob);
}

function normalizeExportFilename(filename, extension) {
  const base = String(filename || `interface-export.${extension}`).replace(/\.[a-z0-9]+$/i, "");
  return `${base}.${extension}`;
}

function pdfEscape(value) {
  return String(value || "").replace(/[\\()]/g, "\\$&");
}

function encodePdfText(value) {
  return new TextEncoder().encode(String(value || ""));
}

function concatPdfBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function dataUrlToBytes(dataUrl) {
  const binary = atob(String(dataUrl || "").split(",")[1] || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildPdfFromCanvas(canvas, title = "Interface export") {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const imageData = dataUrlToBytes(dataUrl);
  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 24;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const imageRatio = canvas.width / canvas.height;
  let drawWidth = maxWidth;
  let drawHeight = drawWidth / imageRatio;
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight;
    drawWidth = drawHeight * imageRatio;
  }
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;
  const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;
  const contentBytes = encodePdfText(content);
  const objects = [
    encodePdfText("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    encodePdfText("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
    encodePdfText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`),
    concatPdfBytes([
      encodePdfText(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageData.length} >>\nstream\n`),
      imageData,
      encodePdfText("\nendstream\nendobj\n")
    ]),
    concatPdfBytes([
      encodePdfText(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`),
      contentBytes,
      encodePdfText("endstream\nendobj\n")
    ]),
    encodePdfText(`6 0 obj\n<< /Title (${pdfEscape(title)}) /Producer (Interface Framework) >>\nendobj\n`)
  ];
  const headerText = "%PDF-1.4\n";
  const header = concatPdfBytes([encodePdfText(headerText), new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])]);
  const offsets = [];
  let cursor = header.length;
  objects.forEach((object) => {
    offsets.push(cursor);
    cursor += object.length;
  });
  const xref = cursor;
  let xrefText = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    xrefText += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  xrefText += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([concatPdfBytes([header, ...objects, encodePdfText(xrefText)])], { type: "application/pdf" });
}

function exportSurfaceAsPdf(target, filename) {
  const canvas = renderSurfaceToCanvas(target);
  const title = getExportSurfaceTitle(target);
  const blob = buildPdfFromCanvas(canvas, title);
  downloadBlob(blob, normalizeExportFilename(filename, "pdf"));
  return Promise.resolve(blob);
}

function registerExportAdapter(name, adapter) {
  if (!name || typeof adapter !== "function") return false;
  exportAdapters.set(String(name), adapter);
  return true;
}

function unregisterExportAdapter(name) {
  return exportAdapters.delete(String(name));
}

function getExportAdapter(name = "built-in") {
  if (!name || name === "built-in" || name === "default") return defaultSurfaceExportAdapter;
  return exportAdapters.get(String(name));
}

async function defaultSurfaceExportAdapter({ target, format, filename, signal }) {
  if (signal?.aborted) throw createAbortError("Export cancelled");
  const blob = format === "pdf"
    ? await exportSurfaceAsPdf(target, filename)
    : await exportSurfaceAsPng(target, filename);
  if (signal?.aborted) throw createAbortError("Export cancelled");
  return {
    blob,
    filename,
    format,
    state: blob ? "success" : "empty"
  };
}

function exportSurface(control) {
  const target = getTarget(control, "ifExport");
  if (!target) return Promise.resolve(null);
  const format = control.dataset.ifExportFormat || "png";
  const filename = normalizeExportFilename(control.dataset.ifExportName || `interface-export.${format}`, format);
  const adapterName = control.dataset.ifExportAdapter || target.dataset.ifExportAdapter || "built-in";
  const adapter = getExportAdapter(adapterName);
  if (!adapter) {
    setAdapterState(target, "error", {
      channel: "export",
      format,
      message: `Missing export adapter: ${adapterName}`
    });
    dispatchFrameworkEvent(target, "if:surface-export-error", { adapter: adapterName, format, filename, target });
    return Promise.resolve(null);
  }
  const previous = exportRequests.get(target);
  previous?.controller?.abort();
  const controller = new AbortController();
  const requestId = `export-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const params = {
    adapter: adapterName,
    control,
    filename,
    format,
    requestId,
    signal: controller.signal,
    target
  };
  exportRequests.set(target, { controller, requestId });
  setAdapterState(target, "loading", {
    channel: "export",
    format,
    message: `Exporting ${format.toUpperCase()}...`,
    requestId
  });
  dispatchFrameworkEvent(target, "if:surface-export-request", params);
  return Promise.resolve()
    .then(() => adapter(params))
    .then((result = {}) => {
      if (controller.signal.aborted) {
        setAdapterState(target, "cancelled", {
          channel: "export",
          format,
          message: "Export cancelled",
          requestId
        });
        dispatchFrameworkEvent(target, "if:surface-export-cancel", { ...params, reason: "aborted" });
        return null;
      }
      const state = normalizeAdapterState(result.state, "success");
      setAdapterState(target, state, {
        channel: "export",
        format,
        message: result.message || (state === "empty" ? "Nothing to export" : `Exported ${filename}`),
        requestId
      });
      exportRequests.delete(target);
      dispatchFrameworkEvent(target, "if:surface-export-result", { ...params, result });
      dispatchFrameworkEvent(target, "if:surface-export", { format, filename, target, adapter: adapterName, result });
      return result;
    })
    .catch((error) => {
      if (isAbortError(error) || controller.signal.aborted) {
        setAdapterState(target, "cancelled", {
          channel: "export",
          format,
          message: "Export cancelled",
          requestId
        });
        dispatchFrameworkEvent(target, "if:surface-export-cancel", { ...params, error, reason: "aborted" });
        return null;
      }
      setAdapterState(target, "error", {
        channel: "export",
        format,
        message: error?.message || "Export failed",
        requestId
      });
      dispatchFrameworkEvent(target, "if:surface-export-error", { ...params, error });
      return null;
    })
    .finally(() => {
      if (exportRequests.get(target)?.requestId === requestId) exportRequests.delete(target);
    });
}

function cancelSurfaceExport(targetOrControl, reason = "cancelled") {
  const target = getTarget(targetOrControl, "ifExport") || targetOrControl?.closest?.("[data-if-diagram], [data-if-graph], [data-if-connector-routing]") || targetOrControl;
  const request = target ? exportRequests.get(target) : null;
  if (!request) return false;
  request.controller.abort(reason);
  setAdapterState(target, "cancelled", {
    channel: "export",
    message: "Export cancelled",
    reason,
    requestId: request.requestId
  });
  dispatchFrameworkEvent(target, "if:surface-export-cancel", { reason, requestId: request.requestId, target });
  exportRequests.delete(target);
  return true;
}

function retryAdapterRequest(control) {
  const target = getTarget(control, "ifAdapterRetry") || getTarget(control, "ifAdapterTarget") || getTarget(control);
  dispatchFrameworkEvent(control, "if:adapter-retry", {
    target,
    kind: control.dataset.ifAdapterKind || target?.dataset?.ifAdapterChannel || ""
  });
  if (!target) return null;
  if (isAutocompleteInput(target)) {
    renderAutocomplete(target);
    return target;
  }
  if (target.matches?.("[data-if-data-table]")) return refreshDataTable(target);
  if (target.matches?.("[data-if-graph]")) return runGraphLayoutEngine(target);
  if (control.dataset.ifExport || control.dataset.ifAdapterKind === "export") return exportSurface(control);
  return null;
}

function getDocumentWorkspace(control) {
  return control?.closest?.("[data-if-doc-workspace]") || control?.closest?.(".if-shell") || (control?.matches?.("[data-if-doc-workspace]") ? control : null) || document;
}

function getDocumentArtifact(control) {
  return control?.closest?.("[data-if-doc-artifact]") || control?.closest?.("[data-if-doc-workspace]") || (control?.matches?.("[data-if-doc-artifact]") ? control : null) || document;
}

function getDocumentViewer(control = null) {
  if (typeof control === "string") return qs(control);
  if (control?.matches?.("[data-if-doc-viewer]")) return control;
  return control?.closest?.("[data-if-doc-viewer]") || qs("[data-if-doc-viewer]", getDocumentArtifact(control || document)) || qs("[data-if-doc-viewer]");
}

function getDocumentWorkspaceState(workspaceOrSelector = document) {
  const workspace = typeof workspaceOrSelector === "string" ? qs(workspaceOrSelector) : getDocumentWorkspace(workspaceOrSelector || document);
  if (!workspace) return null;
  const artifacts = qsa("[data-if-doc-artifact]", workspace);
  const sources = qsa("[data-if-doc-source]", workspace);
  const selectedArtifact = artifacts.find((artifact) => !artifact.hidden && artifact.classList.contains("is-active")) || artifacts.find((artifact) => !artifact.hidden) || artifacts[0] || null;
  return {
    artifactCount: artifacts.length,
    artifacts: artifacts.map((artifact) => ({
      hidden: artifact.hidden,
      id: artifact.dataset.ifDocArtifact || "",
      mode: artifact.dataset.docMode || "reconstituted",
      selected: artifact === selectedArtifact,
      title: artifact.querySelector(".if-page-header__title")?.textContent?.trim() || artifact.getAttribute("aria-label") || ""
    })),
    sourceCount: sources.length,
    selectedArtifact: selectedArtifact?.dataset.ifDocArtifact || "",
    selectedSource: sources.find((source) => source.classList.contains("is-selected") || source.getAttribute("aria-selected") === "true")?.dataset.ifDocSource || "",
    workspace
  };
}

function getDocumentViewerState(viewerOrSelector = null) {
  const viewer = getDocumentViewer(viewerOrSelector);
  if (!viewer) return null;
  const artifact = getDocumentArtifact(viewer);
  const input = qs("[data-if-doc-search]", viewer);
  const activeFilter = qs("[data-if-doc-filter][aria-pressed='true']", viewer);
  const lines = qsa(".if-doc-line", viewer);
  const visibleLines = lines.filter((line) => !line.hidden);
  const annotations = getDocumentAnnotationSchemas(viewer);
  const selectedAnnotation = qs(".if-doc-mark.is-selected[data-if-doc-annotation], .if-doc-mark.is-selected[data-doc-mark]", viewer);
  return {
    activeFilter: activeFilter?.dataset.ifDocFilter || "all",
    annotationCount: annotations.length,
    artifactId: artifact?.dataset.ifDocArtifact || "",
    highlights: qsa("[data-if-doc-highlight]", viewer).reduce((acc, control) => {
      acc[control.dataset.ifDocHighlight] = Boolean(control.checked);
      return acc;
    }, {}),
    lineCount: lines.length,
    mode: artifact?.dataset.docMode || "reconstituted",
    query: input?.value || "",
    queryMatches: Number.parseInt(qs("[data-if-doc-query-count]", viewer)?.textContent?.replace(/[^\d]/g, "") || "0", 10) || 0,
    selectedAnnotation: selectedAnnotation ? getDocumentAnnotationSchema(selectedAnnotation) : null,
    visibleCount: visibleLines.length,
    viewer
  };
}

function normalizeDocumentAnnotation(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getDocumentAnnotationExpansion(type, value) {
  const normalized = normalizeDocumentAnnotation(value);
  return documentAnnotationGlossary[type]?.[normalized]
    || documentAnnotationGlossary[type]?.[normalized.replace(/&/g, "&amp;")]
    || (type === "org" ? `${value} organization/entity candidate.` : `${value} ${type} candidate.`);
}

function enrichDocumentAnnotation(mark) {
  if (!mark) return;
  const type = mark.dataset.ifDocAnnotation || mark.dataset.docMark;
  if (!["org", "claim", "reference"].includes(type)) return;
  const value = mark.dataset.ifDocAnnotationValue || mark.textContent?.trim() || "";
  mark.dataset.ifDocAnnotation = type;
  mark.dataset.ifDocAnnotationValue = value;
  mark.dataset.ifDocAnnotationExpansion = getDocumentAnnotationExpansion(type, value);
  mark.setAttribute("tabindex", "0");
  mark.setAttribute("role", "button");
  mark.setAttribute("aria-label", `${formatGraphLabel(type)}: ${value}. ${mark.dataset.ifDocAnnotationExpansion}`);
  mark.setAttribute("title", mark.dataset.ifDocAnnotationExpansion);
}

function hydrateDocumentAnnotations(root = document) {
  qsa(".if-doc-mark[data-doc-mark], .if-doc-mark[data-if-doc-annotation]", root).forEach(enrichDocumentAnnotation);
}

function getDocumentAnnotationMatches(artifact, type, value) {
  const normalized = normalizeDocumentAnnotation(value);
  if (!normalized) return [];
  return qsa(".if-doc-mark[data-if-doc-annotation], .if-doc-mark[data-doc-mark]", artifact).filter((mark) => {
    enrichDocumentAnnotation(mark);
    return mark.dataset.ifDocAnnotation === type
      && normalizeDocumentAnnotation(mark.dataset.ifDocAnnotationValue || mark.textContent) === normalized;
  });
}

function getDocumentAnnotationLine(mark) {
  return mark.closest(".if-doc-line");
}

function getDocumentAnnotationSchema(mark) {
  if (!mark) return null;
  enrichDocumentAnnotation(mark);
  const line = getDocumentAnnotationLine(mark);
  const artifact = getDocumentArtifact(mark);
  const type = mark.dataset.ifDocAnnotation || "";
  const value = mark.dataset.ifDocAnnotationValue || mark.textContent?.trim() || "";
  return {
    artifactId: artifact?.dataset?.ifDocArtifact || artifact?.id || "",
    confidence: mark.dataset.ifDocAnnotationConfidence || mark.dataset.docConfidence || "",
    expansion: mark.dataset.ifDocAnnotationExpansion || getDocumentAnnotationExpansion(type, value),
    id: mark.dataset.ifDocAnnotationId || mark.id || `${type}:${normalizeDocumentAnnotation(value)}`,
    line: line?.dataset?.docLine ? Number.parseInt(line.dataset.docLine, 10) : null,
    lineId: line?.id || "",
    lineText: line?.querySelector?.(".if-doc-line__text")?.textContent?.trim().replace(/\s+/g, " ") || "",
    range: mark.dataset.ifDocAnnotationRange || mark.dataset.docRange || "",
    source: mark.dataset.ifDocAnnotationSource || mark.dataset.docSource || "",
    text: mark.textContent?.trim() || value,
    type,
    value
  };
}

function getDocumentAnnotationSchemas(root = document) {
  return qsa(".if-doc-mark[data-if-doc-annotation], .if-doc-mark[data-doc-mark]", root)
    .map(getDocumentAnnotationSchema)
    .filter(Boolean);
}

function updateDocumentAnnotationPanel(mark, target = null, matches = []) {
  const artifact = getDocumentArtifact(mark);
  const panel = qs("[data-if-doc-annotation-panel]", artifact);
  if (!panel) return;

  const annotation = getDocumentAnnotationSchema(mark);
  const type = mark.dataset.ifDocAnnotation;
  const value = mark.dataset.ifDocAnnotationValue || mark.textContent?.trim() || "";
  const expansion = mark.dataset.ifDocAnnotationExpansion || getDocumentAnnotationExpansion(type, value);
  const activeLine = getDocumentAnnotationLine(mark);
  const targetText = target
    ? target.querySelector("strong")?.textContent?.trim() || target.textContent?.trim() || "Matched extracted object"
    : "No mapped extracted object yet";

  panel.hidden = false;
  panel.classList.add("is-active");
  qsa("[data-if-doc-annotation-type]", panel).forEach((item) => {
    item.textContent = formatGraphLabel(type);
    item.dataset.annotationType = type;
  });
  qsa("[data-if-doc-annotation-value]", panel).forEach((item) => {
    item.textContent = value;
  });
  qsa("[data-if-doc-annotation-expansion]", panel).forEach((item) => {
    item.textContent = expansion;
  });
  qsa("[data-if-doc-annotation-count]", panel).forEach((item) => {
    item.textContent = String(matches.length || 1);
  });
  qsa("[data-if-doc-annotation-line]", panel).forEach((item) => {
    item.textContent = activeLine?.dataset.docLine ? `Line ${activeLine.dataset.docLine}` : "Current line";
  });
  qsa("[data-if-doc-annotation-target]", panel).forEach((item) => {
    item.textContent = targetText;
  });

  const list = qs("[data-if-doc-annotation-matches]", panel);
  if (list) {
    const matchButtons = matches.slice(0, 6).map((match) => {
      const line = getDocumentAnnotationLine(match);
      const lineNumber = line?.dataset.docLine || "line";
      const preview = (line?.querySelector(".if-doc-line__text")?.textContent || match.textContent || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 130);
      const jump = line?.dataset.docText || preview || value;
      return `<button type="button" class="if-doc-annotation-match" data-if-doc-jump="${escapeHtml(jump)}"><span>${escapeHtml(`Line ${lineNumber}`)}</span><strong>${escapeHtml(preview || value)}</strong></button>`;
    }).join("");
    list.innerHTML = matchButtons || `<span class="if-doc-annotation-empty">No duplicate marks in this artifact.</span>`;
  }

  panel.dispatchEvent(new CustomEvent("if:doc-annotation-panel", {
    bubbles: true,
    detail: { type, value, expansion, mark, target, matches, annotation, annotations: matches.map(getDocumentAnnotationSchema).filter(Boolean), state: getDocumentViewerState(qs("[data-if-doc-viewer]", artifact)) }
  }));
}

function getDocumentAnnotationTooltip() {
  let tooltip = qs("[data-if-doc-annotation-tooltip]");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "if-doc-annotation-tooltip";
    tooltip.dataset.ifDocAnnotationTooltip = "";
    tooltip.hidden = true;
    document.body.append(tooltip);
  }
  return tooltip;
}

function showDocumentAnnotationTooltip(mark) {
  enrichDocumentAnnotation(mark);
  const tooltip = getDocumentAnnotationTooltip();
  const type = mark.dataset.ifDocAnnotation;
  const value = mark.dataset.ifDocAnnotationValue || mark.textContent?.trim() || "";
  const expansion = mark.dataset.ifDocAnnotationExpansion || getDocumentAnnotationExpansion(type, value);
  tooltip.innerHTML = `<span>${escapeHtml(formatGraphLabel(type))}</span><strong>${escapeHtml(value)}</strong><em>${escapeHtml(expansion)}</em><small>Click to inspect in extracted ${type === "org" ? "organizations" : type === "claim" ? "claims" : "references"}.</small>`;
  const rect = mark.getBoundingClientRect();
  tooltip.style.left = `${Math.min(window.innerWidth - 280, Math.max(12, rect.left))}px`;
  tooltip.style.top = `${Math.max(12, rect.bottom + 8)}px`;
  tooltip.hidden = false;
  mark.classList.add("is-active");
}

function hideDocumentAnnotationTooltip(mark) {
  const tooltip = qs("[data-if-doc-annotation-tooltip]");
  if (tooltip) tooltip.hidden = true;
  mark?.classList?.remove("is-active");
}

function revealDocumentAnnotationTarget(target) {
  const panel = target.closest("[role='tabpanel'][hidden]");
  if (panel?.id) {
    const tab = qs(`[role='tab'][aria-controls="${escapeCssIdentifier(panel.id)}"]`, panel.closest("[data-if-tabs]") || document);
    if (tab) activateTab(tab);
  }
  qsa(".is-annotation-target", target.closest("[data-if-doc-artifact]") || document).forEach((item) => {
    item.classList.remove("is-annotation-target");
  });
  target.classList.add("is-annotation-target");
  target.scrollIntoView({ block: "center", behavior: "smooth" });
  window.setTimeout(() => target.classList.remove("is-annotation-target"), 2400);
}

function findDocumentAnnotationTarget(mark) {
  const artifact = mark.closest("[data-if-doc-artifact]") || document;
  const type = mark.dataset.ifDocAnnotation;
  const value = normalizeDocumentAnnotation(mark.dataset.ifDocAnnotationValue || mark.textContent);
  const selector = type === "org"
    ? ".if-doc-entity-cloud button"
    : type === "reference"
      ? ".if-doc-reference-list button, .if-parser-row, .if-parser-node"
      : ".if-claim-row, .if-obligation-list button";
  const candidates = qsa(selector, artifact);
  return candidates.find((item) => {
    const text = normalizeDocumentAnnotation(item.textContent);
    const jump = normalizeDocumentAnnotation(item.dataset.ifDocJump);
    return text === value || text.includes(value) || value.includes(text) || jump.includes(value);
  }) || null;
}

function selectDocumentAnnotation(mark, target = null) {
  enrichDocumentAnnotation(mark);
  const artifact = getDocumentArtifact(mark);
  const type = mark.dataset.ifDocAnnotation;
  const value = mark.dataset.ifDocAnnotationValue || mark.textContent?.trim() || "";
  const matches = getDocumentAnnotationMatches(artifact, type, value);

  qsa(".if-doc-mark.is-selected, .if-doc-mark.is-linked", artifact).forEach((item) => {
    item.classList.remove("is-selected", "is-linked");
    item.removeAttribute("aria-current");
  });
  qsa(".if-doc-line.is-annotation-sibling", artifact).forEach((line) => {
    line.classList.remove("is-annotation-sibling");
  });

  matches.forEach((match) => {
    match.classList.add(match === mark ? "is-selected" : "is-linked");
    if (match === mark) match.setAttribute("aria-current", "true");
    getDocumentAnnotationLine(match)?.classList.add("is-annotation-sibling");
  });

  updateDocumentAnnotationPanel(mark, target, matches);
  artifact.dispatchEvent(new CustomEvent("if:doc-annotation-select", {
    bubbles: true,
    detail: {
      type,
      value,
      mark,
      target,
      matches,
      annotation: getDocumentAnnotationSchema(mark),
      annotations: matches.map(getDocumentAnnotationSchema).filter(Boolean),
      state: getDocumentViewerState(qs("[data-if-doc-viewer]", artifact))
    }
  }));
  return matches;
}

function inspectDocumentAnnotation(mark) {
  enrichDocumentAnnotation(mark);
  const target = findDocumentAnnotationTarget(mark);
  selectDocumentAnnotation(mark, target);
  if (target) {
    revealDocumentAnnotationTarget(target);
    return;
  }
  const artifact = mark.closest("[data-if-doc-artifact]");
  const viewer = qs("[data-if-doc-viewer]", artifact);
  const input = qs("[data-if-doc-search]", viewer);
  if (input) input.value = mark.dataset.ifDocAnnotationValue || mark.textContent || "";
  updateDocumentSearch(viewer);
}

function getDocumentModeTab(artifact, mode) {
  const keysByMode = {
    reconstituted: ["reconstituted", "text"],
    embedded: ["embedded", "source", "artifact", "pdf"],
    source: ["embedded", "source", "artifact", "pdf"],
    claims: ["claims", "line"],
    metadata: ["metadata"]
  };
  const keys = keysByMode[mode] || [mode];
  return qsa("[role='tab']", artifact).find((tab) => {
    const id = `${tab.dataset.target || ""} ${tab.getAttribute("aria-controls") || ""} ${tab.textContent || ""}`.toLowerCase();
    return keys.some((key) => id.includes(key));
  }) || null;
}

function setDocumentArtifactMode(control) {
  const artifact = getDocumentArtifact(control);
  const mode = control.dataset.ifDocMode || "reconstituted";
  artifact.dataset.docMode = mode;

  qsa("[data-if-doc-mode]", artifact).forEach((button) => {
    const selected = button.dataset.ifDocMode === mode;
    button.classList.toggle("is-active", selected);
    button.classList.toggle("if-btn--secondary", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  qsa("[data-if-doc-mode-current]", artifact).forEach((target) => {
    target.textContent = formatGraphLabel(mode);
  });

  const tabsRoot = qs("[data-if-tabs]", artifact);
  if (mode === "split" && tabsRoot) {
    const reconstitutedTab = getDocumentModeTab(artifact, "reconstituted");
    const embeddedTab = getDocumentModeTab(artifact, "embedded");
    const activeIds = [reconstitutedTab, embeddedTab]
      .map((tab) => tab?.getAttribute("aria-controls") || tab?.dataset.target?.replace("#", ""))
      .filter(Boolean);
    qsa("[role='tab']", tabsRoot).forEach((tab) => {
      const id = tab.getAttribute("aria-controls") || tab.dataset.target?.replace("#", "");
      const selected = activeIds.includes(id);
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    qsa("[role='tabpanel']", tabsRoot).forEach((panel) => {
      const selected = activeIds.includes(panel.id);
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
      if (selected) hydrateLazyEmbeds(panel);
    });
  } else if (mode === "metadata") {
    const metadata = qs(".if-doc-left-rail", artifact);
    metadata?.scrollIntoView({ block: "center", behavior: "smooth" });
  } else {
    const tab = getDocumentModeTab(artifact, mode);
    if (tab) activateTab(tab);
  }

  artifact.dispatchEvent(new CustomEvent("if:doc-mode-change", {
    bubbles: true,
    detail: { mode, artifact, control, state: getDocumentViewerState(qs("[data-if-doc-viewer]", artifact)) }
  }));
}

function selectDocumentArtifact(control) {
  const workspace = getDocumentWorkspace(control);
  const id = control.dataset.ifDocSource;
  if (!id) return null;
  let selectedArtifact = null;

  qsa("[data-if-doc-source]", workspace).forEach((item) => {
    const selected = item.dataset.ifDocSource === id;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-selected", String(selected));
  });

  qsa("[data-if-doc-artifact]", workspace).forEach((artifact) => {
    const selected = artifact.dataset.ifDocArtifact === id;
    artifact.hidden = !selected;
    artifact.classList.toggle("is-active", selected);
    if (selected) {
      selectedArtifact = artifact;
      qsa("[data-if-doc-viewer]", artifact).forEach((viewer) => updateDocumentSearch(viewer, { emit: false }));
    }
  });
  dispatchFrameworkEvent(selectedArtifact || workspace, "if:doc-artifact-select", {
    artifact: selectedArtifact,
    artifactId: id,
    source: control,
    state: getDocumentWorkspaceState(workspace)
  });
  return selectedArtifact;
}

function setDocumentLineHtml(line, query) {
  const text = qs(".if-doc-line__text", line);
  if (!text) return;
  if (!text.dataset.originalHtml) text.dataset.originalHtml = text.innerHTML;
  if (!text.dataset.originalText) text.dataset.originalText = text.textContent || "";

  const originalHtml = text.dataset.originalHtml;
  const terms = String(query || "")
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 1)
    .slice(0, 4);

  if (!terms.length) {
    text.innerHTML = originalHtml;
    hydrateDocumentAnnotations(text);
    return;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  text.innerHTML = originalHtml
    .split(/(<[^>]+>)/g)
    .map((part) => part.startsWith("<") ? part : part.replace(pattern, '<mark class="if-doc-mark if-doc-mark--search" data-doc-mark="search">$1</mark>'))
    .join("");
  hydrateDocumentAnnotations(text);
}

function updateDocumentSearch(viewer, options = {}) {
  if (!viewer) return;
  const input = qs("[data-if-doc-search]", viewer);
  const query = String(input?.value || "").trim().toLowerCase();
  const activeFilter = qs("[data-if-doc-filter][aria-pressed='true']", viewer)?.dataset.ifDocFilter || "all";
  let matches = 0;
  let queryMatches = 0;
  const total = qsa(".if-doc-line", viewer).length;

  qsa(".if-doc-line", viewer).forEach((line) => {
    const haystack = line.dataset.docText || line.textContent.toLowerCase();
    const cats = String(line.dataset.docCats || "").split(/\s+/);
    const queryMatched = !query || haystack.includes(query);
    const filterMatched = activeFilter === "all" || (activeFilter === "matches" ? Boolean(query && queryMatched) : cats.includes(activeFilter));
    const visible = queryMatched && filterMatched;
    line.hidden = !visible;
    line.classList.toggle("is-search-match", Boolean(query && queryMatched));
    setDocumentLineHtml(line, query);
    if (queryMatched) queryMatches += 1;
    if (visible) matches += 1;
  });

  qsa("[data-if-doc-match-count]", viewer).forEach((target) => {
    target.textContent = matches.toLocaleString();
  });
  qsa("[data-if-doc-visible-count]", viewer).forEach((target) => {
    target.textContent = matches.toLocaleString();
  });
  qsa("[data-if-doc-query-count]", viewer).forEach((target) => {
    target.textContent = queryMatches.toLocaleString();
  });
  qsa("[data-if-doc-total-count]", viewer).forEach((target) => {
    target.textContent = total.toLocaleString();
  });
  qsa("[data-if-doc-active-filter]", viewer).forEach((target) => {
    target.textContent = formatGraphLabel(activeFilter);
  });
  const state = getDocumentViewerState(viewer);
  if (options.emit !== false) {
    dispatchFrameworkEvent(viewer, "if:doc-search", { query, filter: activeFilter, state, viewer });
  }
  return state;
}

function updateDocumentHighlight(control, options = {}) {
  const viewer = control.closest("[data-if-doc-viewer]");
  if (!viewer) return;
  const kind = control.dataset.ifDocHighlight;
  if (!kind) return;
  viewer.dataset[`highlight${kind.charAt(0).toUpperCase()}${kind.slice(1)}`] = String(control.checked);
  const state = getDocumentViewerState(viewer);
  if (options.emit !== false) {
    dispatchFrameworkEvent(viewer, "if:doc-highlight-change", { highlight: kind, checked: control.checked, control, state });
  }
  return state;
}

function clearDocumentSearch(control) {
  const artifact = control.closest("[data-if-doc-artifact]");
  const viewer = qs("[data-if-doc-viewer]", artifact);
  const input = qs("[data-if-doc-search]", viewer);
  if (input) input.value = "";
  const state = updateDocumentSearch(viewer, { emit: false });
  dispatchFrameworkEvent(viewer || artifact, "if:doc-search-clear", { artifact, control, state });
  return state;
}

function setDocumentFilter(control) {
  const viewer = control.closest("[data-if-doc-viewer]");
  if (!viewer) return;
  qsa("[data-if-doc-filter]", viewer).forEach((button) => {
    const selected = button === control;
    button.classList.toggle("is-active", selected);
    button.classList.toggle("if-btn--secondary", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const state = updateDocumentSearch(viewer, { emit: false });
  dispatchFrameworkEvent(viewer, "if:doc-filter-change", { filter: control.dataset.ifDocFilter || "all", control, state });
  return state;
}

function jumpToDocumentText(control) {
  const artifact = control.closest("[data-if-doc-artifact]");
  const viewer = qs("[data-if-doc-viewer]", artifact);
  const query = String(control.dataset.ifDocJump || "").toLowerCase().slice(0, 70);
  if (!viewer || !query) return;

  const input = qs("[data-if-doc-search]", viewer);
  if (input?.value) input.value = "";
  qsa("[data-if-doc-filter]", viewer).forEach((button) => {
    const selected = button.dataset.ifDocFilter === "all";
    button.classList.toggle("is-active", selected);
    button.classList.toggle("if-btn--secondary", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  updateDocumentSearch(viewer);

  const lines = qsa(".if-doc-line", viewer);
  const match = lines.find((line) => (line.dataset.docText || "").includes(query));
  if (!match) return;

  lines.forEach((line) => line.classList.remove("is-focused", "is-context"));
  const matchIndex = lines.indexOf(match);
  lines.slice(Math.max(0, matchIndex - 2), matchIndex).forEach((line) => line.classList.add("is-context"));
  lines.slice(matchIndex + 1, matchIndex + 3).forEach((line) => line.classList.add("is-context"));
  match.scrollIntoView({ block: "center", behavior: "smooth" });
  match.classList.add("is-focused");
  dispatchFrameworkEvent(viewer, "if:doc-jump", { control, line: match, query, state: getDocumentViewerState(viewer) });
  window.setTimeout(() => {
    match.classList.remove("is-focused");
    lines.forEach((line) => line.classList.remove("is-context"));
  }, 2200);
}

function markDocumentLine(text, cats = "") {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\b(shall|will|must|should|required|requires|establishes|assigns|prescribes)\b/gi, '<mark class="if-doc-mark if-doc-mark--claim" data-doc-mark="claim" data-if-doc-annotation="claim" data-if-doc-annotation-value="$1">$1</mark>')
    .replace(/\b(DoDI\s+\d{4}\.\d{2}|DoDD\s+\d{4}\.\d{2}|DOWI\s+\d{4}\.\d{2}|NDAA\s+FY2025|Public Law\s+\d+-\d+|Title\s+\d+|FISMA|OMB\s+M-\d{2}-\d{2}|Executive Order\s+\d+|EO\s+\d+|JCIDS|AAF)\b/g, '<mark class="if-doc-mark if-doc-mark--reference" data-doc-mark="reference" data-if-doc-annotation="reference" data-if-doc-annotation-value="$1">$1</mark>')
    .replace(/\b(DoD|DoW|DISA|OMB|CISA|SECNAV|NAVWAR|DON CIO|USD\(A&amp;S\)|Congress|Agency heads|Mission partners)\b/g, '<mark class="if-doc-mark if-doc-mark--org" data-doc-mark="org" data-if-doc-annotation="org" data-if-doc-annotation-value="$1">$1</mark>');
}

function renderDocumentLines(lines = []) {
  return lines.map((line, index) => {
    const n = line.n || index + 1;
    const text = line.text || "";
    const cats = line.cats || "text";
    return `<p class="if-doc-line" data-doc-line="${n}" data-doc-cats="${escapeHtml(cats)}" data-doc-text="${escapeHtml(text.toLowerCase())}"><span class="if-doc-line__number">${n}</span><span class="if-doc-line__text">${markDocumentLine(text, cats)}</span></p>`;
  }).join("");
}

function renderCorpusAuthority(record) {
  const nodes = (record.authority || []).map((node) => {
    const tone = node.tone ? ` if-authority-stage--${escapeHtml(node.tone)}` : "";
    const current = node.tone === "current" ? " is-current" : "";
    return `<article class="if-authority-stage${tone}"><div class="if-authority-stage__label">${escapeHtml(node.label)}</div><button class="if-authority-node${current}" type="button" data-if-doc-jump="${escapeHtml(node.jump || node.title)}"><span class="if-authority-node__type">${escapeHtml(node.type)}</span><strong>${escapeHtml(node.title)}</strong><span>${escapeHtml(node.text)}</span></button></article>`;
  }).join("");
  return `<section class="if-panel if-authority-drilldown" aria-labelledby="authority-${escapeHtml(record.id)}-title"><div class="if-panel__header"><div class="if-section-heading"><span class="if-section-heading__icon if-icon-slot" data-if-icon="layers" aria-hidden="true"></span><div><h2 class="if-panel__title" id="authority-${escapeHtml(record.id)}-title">Authority Drilldown</h2><p class="if-panel__subtitle">Law, policy, relationship, and implementation layers generated from the corpus record.</p></div></div><span class="if-badge if-badge--confidence-high">${escapeHtml(record.confidence)} extraction</span></div><div class="if-panel__body"><div class="if-authority-summary"><span><strong>${(record.authority || []).length} layers</strong><em>authority path</em></span><span><strong>${(record.refs || []).length} linked refs</strong><em>relationships</em></span><span><strong>${(record.claims || []).length} claims</strong><em>sampled</em></span></div><div class="if-authority-stack">${nodes}</div></div></section>`;
}

function renderCorpusMapCard(record) {
  const orgs = (record.orgs || []).map((org) => `<button class="if-chip" type="button" data-if-doc-jump="${escapeHtml(org)}">${escapeHtml(org)}</button>`).join("");
  const refs = (record.refs || []).map((ref) => `<button type="button" data-if-doc-jump="${escapeHtml(ref.jump || ref.title)}"><strong>${escapeHtml(ref.title)}</strong><span>${escapeHtml(ref.relation)}</span><em>Link</em></button>`).join("");
  const sections = (record.sections || []).map((section) => `<li><button type="button" data-if-doc-jump="${escapeHtml(section.jump || section.title)}"><span>${escapeHtml(section.ref)}</span><strong>${escapeHtml(section.title)}</strong><em>${escapeHtml(section.meta)}</em></button></li>`).join("");
  return `<section class="if-doc-map-card"><div class="if-doc-map-card__header"><h3 class="if-card__title">Detected Organizations</h3><span class="if-badge if-badge--info">${(record.orgs || []).length}</span></div><div class="if-doc-entity-cloud">${orgs}</div></section><section class="if-doc-map-card"><div class="if-doc-map-card__header"><h3 class="if-card__title">References / Relationships</h3><span class="if-badge if-badge--confidence-high">${(record.refs || []).length} linked</span></div><div class="if-doc-reference-list">${refs}</div></section><section class="if-doc-map-card"><div class="if-doc-map-card__header"><h3 class="if-card__title">Section Map</h3><span class="if-badge">${escapeHtml(record.pages)} pages</span></div><ol class="if-doc-section-list if-doc-section-list--nav">${sections}</ol></section>`;
}

function renderCorpusParser(record) {
  const refs = (record.refs || []).slice(0, 4).map((ref) => `<button type="button" class="if-parser-row" data-if-doc-jump="${escapeHtml(ref.jump || ref.title)}"><strong>${escapeHtml(ref.title)}</strong><span>${escapeHtml(ref.relation)}</span><em>${escapeHtml(record.type)}</em></button>`).join("");
  const graphNodes = (record.refs || []).slice(0, 3).map((ref) => `<span class="if-parser-edge">links</span><button type="button" class="if-parser-node" data-if-doc-jump="${escapeHtml(ref.jump || ref.title)}">${escapeHtml(ref.title)}<br><span>${escapeHtml(ref.relation)}</span></button>`).join("");
  const claims = (record.claims || []).slice(0, 5).map((claim, index) => `<li><button type="button" data-if-doc-jump="${escapeHtml(claim.split(" ").slice(0, 7).join(" "))}"><span class="if-obligation-list__ref">${index + 1}</span><strong>${escapeHtml(claim)}</strong><em>Extraction candidate - promote to claim, obligation, or evidence target</em></button></li>`).join("");
  return `<section class="if-panel if-parser-results" aria-labelledby="parser-${escapeHtml(record.id)}-title"><div class="if-panel__header"><div class="if-section-heading"><span class="if-section-heading__icon if-icon-slot" data-if-icon="filter" aria-hidden="true"></span><div><h2 class="if-panel__title" id="parser-${escapeHtml(record.id)}-title">Parser Engine Output</h2><p class="if-panel__subtitle">Stored decomposition preview for citations, external authorities, relationship graphing, and modal statement extraction.</p></div></div><span class="if-badge if-badge--confidence-high">${escapeHtml(record.confidence)}</span></div><div class="if-panel__body"><div class="if-parser-grid"><article class="if-parser-card"><header class="if-parser-card__header"><span class="if-icon-slot" data-if-icon="policy" aria-hidden="true"></span><div><h3>Extracted References</h3><p>Normalized objects ready for relationship review.</p></div></header><div class="if-parser-list">${refs}</div></article><article class="if-parser-card if-parser-card--wide"><header class="if-parser-card__header"><span class="if-icon-slot" data-if-icon="graph" aria-hidden="true"></span><div><h3>Reference Graph Preview</h3><p>Compact graph bundle emitted by citation extraction.</p></div></header><div class="if-parser-graph"><button type="button" class="if-parser-node if-parser-node--current" data-if-doc-jump="${escapeHtml(record.shortTitle || record.title)}">${escapeHtml(record.shortTitle || record.title)}<br><span>${escapeHtml(record.type)}</span></button>${graphNodes}</div></article><article class="if-parser-card if-parser-card--wide"><header class="if-parser-card__header"><span class="if-icon-slot" data-if-icon="check" aria-hidden="true"></span><div><h3>Enumerated Modal Statements</h3><p>Representative shall/will/must/should statements.</p></div></header><ol class="if-obligation-list">${claims}</ol></article></div></div></section>`;
}

function renderDocumentModeStrip() {
  return `<section class="if-panel if-doc-mode-strip" aria-label="Artifact interaction modes"><div class="if-panel__body"><div class="if-doc-mode-strip__header"><div><h2>Artifact Modes & Annotation Inspector</h2><p>Reusable controls for embedded source artifacts, reconstituted text, split review, metadata focus, and persistent annotation inspection.</p></div><div class="if-doc-mode-actions" role="toolbar" aria-label="Document artifact modes"><button class="if-btn if-btn--secondary is-active" type="button" data-if-doc-mode="reconstituted" aria-pressed="true"><span class="if-icon-slot" data-if-icon="artifact" aria-hidden="true"></span> Reconstituted</button><button class="if-btn" type="button" data-if-doc-mode="embedded" aria-pressed="false"><span class="if-icon-slot" data-if-icon="filePdf" aria-hidden="true"></span> Embedded</button><button class="if-btn" type="button" data-if-doc-mode="split" aria-pressed="false"><span class="if-icon-slot" data-if-icon="columns" aria-hidden="true"></span> Split</button><button class="if-btn" type="button" data-if-doc-mode="metadata" aria-pressed="false"><span class="if-icon-slot" data-if-icon="database" aria-hidden="true"></span> Metadata</button></div></div><div class="if-doc-mode-grid"><article class="if-doc-mode-card"><span class="if-icon-slot" data-if-icon="search" aria-hidden="true"></span><div><strong>Current mode: <span data-if-doc-mode-current>Reconstituted</span></strong><span>Mode controls update the artifact panels and emit document mode events.</span></div></article><article class="if-doc-mode-card"><span class="if-icon-slot" data-if-icon="evidence" aria-hidden="true"></span><div><strong>Interactive marks</strong><span>Hover for expansion; click to pin an annotation, linked occurrences, and extracted targets.</span></div></article><section class="if-doc-annotation-inspector" data-if-doc-annotation-panel hidden><div class="if-doc-annotation-inspector__header"><div class="if-doc-annotation-inspector__title"><span class="if-badge if-badge--info" data-if-doc-annotation-type>Annotation</span><strong data-if-doc-annotation-value>Selected mark</strong></div><span class="if-badge if-badge--confidence-high" data-if-doc-annotation-line>Current line</span></div><p data-if-doc-annotation-expansion>Select an annotation to inspect extracted context.</p><dl class="if-doc-annotation-inspector__meta"><div><dt>Occurrences</dt><dd data-if-doc-annotation-count>0</dd></div><div><dt>Mapped Target</dt><dd data-if-doc-annotation-target>None</dd></div><div><dt>Behavior</dt><dd>Hover, click, jump</dd></div></dl><div class="if-doc-annotation-matches" data-if-doc-annotation-matches></div></section></div></div></section>`;
}

function renderCorpusArtifact(record) {
  const safeId = escapeHtml(record.id);
  const external = record.sourceUrl
    ? `<a class="if-btn" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noreferrer">Open Source</a>`
    : `<span class="if-badge if-badge--warning">Synthetic only</span>`;
  const pdfPanel = record.sourceUrl
    ? `<article class="if-doc-source-placeholder"><h3>Source Artifact</h3><p>This corpus record stores the source URL and extracted sample decomposition. Production ingestion can cache the PDF/HTML, parser output, hash, and page text.</p><a class="if-btn if-btn--secondary" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noreferrer">Open original source</a></article>`
    : `<article class="if-doc-source-placeholder"><h3>Synthetic Demo Artifact</h3><p>This named record is included to complete the overview storyline. It is explicitly marked synthetic until a verified source artifact is attached.</p></article>`;
  return `<section class="if-doc-artifact" data-if-doc-artifact="${safeId}" hidden><div class="if-page-header"><div><p class="if-page-header__eyebrow">${escapeHtml(record.status)}</p><h1 class="if-page-header__title">${escapeHtml(record.title)}</h1><div class="if-page-header__meta if-mt-2"><span class="if-badge if-badge--info">${escapeHtml(record.source)}</span><span class="if-badge if-badge--confidence-high">Parsed sample</span><span class="if-chip">${escapeHtml(record.pages)} pages</span><span class="if-chip">${escapeHtml(record.lineCount)} text lines</span></div></div><div class="if-page-header__actions">${external}<button class="if-btn if-btn--secondary" type="button" data-if-doc-clear>Clear Search</button></div></div>${renderDocumentModeStrip()}${renderCorpusAuthority(record)}${renderCorpusParser(record)}<section class="if-document-workbench"><aside class="if-panel if-doc-left-rail"><div class="if-panel__header"><h2 class="if-panel__title">Artifact Metadata</h2></div><div class="if-panel__body if-stack"><dl class="if-meta-grid if-meta-grid--dense"><div class="if-kv"><dt>Title</dt><dd>${escapeHtml(record.title)}</dd></div><div class="if-kv"><dt>Type</dt><dd>${escapeHtml(record.type)}</dd></div><div class="if-kv"><dt>Source</dt><dd>${escapeHtml(record.source)}</dd></div><div class="if-kv"><dt>Status</dt><dd>${escapeHtml(record.status)}</dd></div><div class="if-kv"><dt>Confidence</dt><dd>${escapeHtml(record.confidence)}</dd></div><div class="if-kv"><dt>Stored</dt><dd>examples/data/policy-corpus.json</dd></div></dl>${renderCorpusMapCard(record)}</div></aside><main class="if-panel if-doc-main" data-if-doc-viewer><div class="if-panel__header if-doc-toolbar"><div class="if-section-heading"><span class="if-section-heading__icon if-icon-slot" data-if-icon="search" aria-hidden="true"></span><div><h2 class="if-panel__title">Reconstituted Sample</h2><p class="if-panel__subtitle">Stored extracted lines with semantic highlights and context-preserving jump targets.</p></div></div><span class="if-badge if-badge--info"><span data-if-doc-match-count>${escapeHtml(record.lineCount)}</span> visible lines</span></div><div class="if-panel__body if-stack"><div class="if-doc-search-row"><label class="if-search if-w-full"><span class="if-search__icon if-icon-slot" data-if-icon="search" aria-hidden="true"></span><span class="if-sr-only">Search full text</span><input class="if-input" type="search" data-if-doc-search placeholder="Search extracted sample text"></label><div class="if-doc-filterbar" role="toolbar" aria-label="Filter reconstituted text by extraction category"><button class="if-btn if-btn--secondary if-btn--sm is-active" type="button" data-if-doc-filter="all" aria-pressed="true">All lines</button><button class="if-btn if-btn--sm" type="button" data-if-doc-filter="matches" aria-pressed="false">Query hits</button><button class="if-btn if-btn--sm" type="button" data-if-doc-filter="claim" aria-pressed="false">Claims</button><button class="if-btn if-btn--sm" type="button" data-if-doc-filter="org" aria-pressed="false">Organizations</button><button class="if-btn if-btn--sm" type="button" data-if-doc-filter="reference" aria-pressed="false">References</button></div></div><div class="if-tabs" data-if-tabs><div class="if-tab-list" role="tablist" aria-label="Artifact views"><button class="if-tab" role="tab" aria-selected="true" aria-controls="${safeId}-reconstituted">Reconstituted Text</button><button class="if-tab" role="tab" aria-selected="false" aria-controls="${safeId}-source">Source Artifact</button><button class="if-tab" role="tab" aria-selected="false" aria-controls="${safeId}-claims">Claims & Line Items</button></div><section class="if-tab-panel" id="${safeId}-reconstituted" role="tabpanel"><article class="if-doc-reconstitution" data-if-doc-lines>${renderDocumentLines(record.lines)}</article></section><section class="if-tab-panel" id="${safeId}-source" role="tabpanel" hidden>${pdfPanel}</section><section class="if-tab-panel" id="${safeId}-claims" role="tabpanel" hidden><div class="if-claim-tracker"><div class="if-claim-list">${(record.claims || []).map((claim) => `<button class="if-claim-row if-claim-row--active" type="button" data-if-doc-jump="${escapeHtml(claim.split(" ").slice(0, 8).join(" "))}"><span class="if-claim-row__status"></span><span><span class="if-claim-row__title">${escapeHtml(claim)}</span><span class="if-claim-row__meta">Extracted obligation / claim candidate</span></span><span class="if-badge if-badge--confidence-medium">Candidate</span></button>`).join("")}</div></div></section></div></div></main></section></section>`;
}

async function hydrateDocumentCorpus(root) {
  const workspaces = qsa("[data-if-doc-corpus]", root);
  await Promise.all(workspaces.map(async (workspace) => {
    if (workspace.dataset.ifDocCorpusLoaded === "true") return;
    workspace.dataset.ifDocCorpusLoaded = "true";
    try {
      const response = await fetch(workspace.dataset.ifDocCorpus, { cache: "no-store" });
      if (!response.ok) throw new Error(`Corpus request failed: ${response.status}`);
      const records = await response.json();
      const list = qs("[data-if-doc-source-list]", getDocumentWorkspace(workspace)) || qs("[data-if-doc-source-list]");
      records.forEach((record) => {
        if (qs(`[data-if-doc-source="${escapeCssIdentifier(record.id)}"]`, workspace) || qs(`[data-if-doc-artifact="${escapeCssIdentifier(record.id)}"]`, workspace)) return;
        const button = document.createElement("button");
        button.className = "if-doc-source-card";
        button.type = "button";
        button.dataset.ifDocSource = record.id;
        button.setAttribute("aria-selected", "false");
        button.innerHTML = `<span class="if-doc-source-card__type">${escapeHtml(record.type)}</span><strong>${escapeHtml(record.title)}</strong><span>${escapeHtml(record.pages)} pages • ${escapeHtml(record.lineCount)} text lines • ${escapeHtml(record.status)}</span>`;
        list?.append(button);
        workspace.insertAdjacentHTML("beforeend", renderCorpusArtifact(record));
      });
      const count = qsa("[data-if-doc-source]", getDocumentWorkspace(workspace)).length;
      qsa(".if-sidebar__count", getDocumentWorkspace(workspace)).forEach((target) => {
        target.textContent = String(count);
      });
      hydrateIcons(workspace);
      hydrateTabs(workspace);
      qsa("[data-if-doc-viewer]", workspace).forEach((viewer) => {
        qsa("[data-if-doc-highlight]", viewer).forEach((control) => updateDocumentHighlight(control, { emit: false }));
        updateDocumentSearch(viewer, { emit: false });
      });
      hydrateDocumentAnnotations(workspace);
    } catch (error) {
      console.warn("InterfaceFramework: document corpus could not be loaded", error);
    }
  }));
}

function hydrateDocumentViewers(root = document) {
  const viewers = root?.matches?.("[data-if-doc-viewer]") ? [root, ...qsa("[data-if-doc-viewer]", root)] : qsa("[data-if-doc-viewer]", root);
  viewers.forEach((viewer) => {
    qsa("[data-if-doc-highlight]", viewer).forEach((control) => updateDocumentHighlight(control, { emit: false }));
    updateDocumentSearch(viewer, { emit: false });
  });
  hydrateDocumentAnnotations(root);
  return hydrateDocumentCorpus(root);
}

function getClaimTracker(claimOrSelector) {
  if (typeof claimOrSelector === "string") return qs(claimOrSelector);
  return claimOrSelector?.matches?.("[data-if-claims]") ? claimOrSelector : claimOrSelector?.closest?.("[data-if-claims]");
}

function getClaimItems(tracker) {
  return qsa("[data-claim-id]", tracker).filter((item) => !item.hidden && item.getAttribute("aria-disabled") !== "true");
}

function getSelectedClaim(tracker) {
  return qs("[data-claim-id].is-selected", tracker) || getClaimItems(tracker)[0] || null;
}

function getClaimStatusClass(status) {
  const key = String(status || "active").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (["complete", "completed", "validated", "approved"].includes(key)) return "if-claim-row--complete";
  if (["blocked", "failed", "gap"].includes(key)) return "if-claim-row--blocked";
  if (["pending", "waiting", "needs-review"].includes(key)) return "if-claim-row--pending";
  return "if-claim-row--active";
}

function normalizeClaimItem(item = {}, index = 0) {
  const id = item.id || item.claimId || item.key || `claim-${index + 1}`;
  return {
    actor: item.actor || item.owner || "",
    body: item.body || item.description || item.statement || "",
    confidence: item.confidence || item.score || "",
    due: item.due || item.dueDate || "",
    evidence: Array.isArray(item.evidence) ? item.evidence : [],
    id,
    line: item.line || item.source || "",
    modal: item.modal || item.type || "Claim",
    object: item.object || "",
    predicate: item.predicate || item.verb || "",
    quote: item.quote || item.statement || item.title || "",
    relationships: Array.isArray(item.relationships) ? item.relationships : [],
    selected: Boolean(item.selected),
    status: item.status || "active",
    tags: Array.isArray(item.tags) ? item.tags : [],
    title: item.title || item.label || id
  };
}

function normalizeClaimTrackerDocument(config = {}) {
  const claims = (config.claims || config.items || []).map(normalizeClaimItem);
  return {
    claims,
    label: config.label || config.title || "Claim tracker",
    selected: config.selected || claims.find((claim) => claim.selected)?.id || claims[0]?.id || "",
    summaries: config.summaries || ["total", "complete", "blocked"]
  };
}

function getClaimTrackerState(trackerOrSelector) {
  const tracker = getClaimTracker(trackerOrSelector);
  if (!tracker) return null;
  const claims = getClaimItems(tracker);
  const selected = getSelectedClaim(tracker);
  const counts = claims.reduce((acc, claim) => {
    const status = claim.dataset.claimStatus || "active";
    acc.total = (acc.total || 0) + 1;
    acc[status] = (acc[status] || 0) + 1;
    if (["completed", "validated", "approved"].includes(status)) acc.complete = (acc.complete || 0) + 1;
    if (["failed", "gap"].includes(status)) acc.blocked = (acc.blocked || 0) + 1;
    return acc;
  }, {});
  return {
    claims: claims.map((claim) => ({
      id: claim.dataset.claimId || "",
      status: claim.dataset.claimStatus || "active",
      title: claim.querySelector(".if-claim-row__title")?.textContent?.trim() || claim.textContent?.trim() || ""
    })),
    counts,
    current: selected?.dataset.claimId || "",
    index: selected ? claims.indexOf(selected) : -1,
    selectedClaim: selected,
    total: claims.length
  };
}

function updateClaimTracker(tracker) {
  if (!tracker) return;
  const state = getClaimTrackerState(tracker);
  qsa("[data-if-claim-count]", tracker).forEach((target) => {
    target.textContent = String(state?.counts?.[target.dataset.ifClaimCount] || 0);
  });
  qsa("[data-if-claim-current]", tracker).forEach((target) => {
    target.textContent = state?.current || "None";
  });
}

function renderClaimTracker(trackerOrSelector, config = {}) {
  const tracker = getClaimTracker(trackerOrSelector) || qs(trackerOrSelector);
  if (!tracker) return null;
  const doc = normalizeClaimTrackerDocument(config);
  if (!doc.claims.length) return tracker;
  tracker.dataset.ifClaimsRendered = "true";
  tracker.classList.add("if-claim-tracker", "if-claim-tracker--rich");
  tracker.replaceChildren();
  tracker.innerHTML = `
    <div class="if-claim-toolbar" aria-label="${escapeHtml(doc.label)} summary">
      ${doc.summaries.map((summary) => `<div class="if-claim-summary-card"><span class="if-icon-slot" data-if-icon="${summary === "blocked" ? "alert" : summary === "complete" ? "check" : "task"}"></span><span><strong data-if-claim-count="${escapeHtml(summary)}">0</strong><em>${escapeHtml(formatReviewAction(summary))}</em></span></div>`).join("")}
    </div>
    <div class="if-claim-list" role="listbox" aria-label="${escapeHtml(doc.label)} claims">
      <div class="if-claim-list__header"><strong>Extracted claims</strong><span><span data-if-claim-count="total">0</span> tracked</span></div>
      ${doc.claims.map((claim) => {
        const selected = claim.id === doc.selected;
        return `
          <button class="if-claim-row ${getClaimStatusClass(claim.status)}${selected ? " is-selected" : ""}" type="button" data-if-claim-select data-claim-id="${escapeHtml(claim.id)}" data-claim-status="${escapeHtml(claim.status)}" aria-selected="${selected ? "true" : "false"}">
            <span class="if-claim-row__status" aria-hidden="true"></span>
            <span>
              <span class="if-claim-row__eyebrow">${escapeHtml([claim.id, claim.modal, claim.line].filter(Boolean).join(" - "))}</span>
              <span class="if-claim-row__title">${escapeHtml(claim.title)}</span>
              <span class="if-claim-row__meta">${escapeHtml(claim.body || claim.quote)}</span>
              ${claim.tags.length ? `<span class="if-claim-row__tags">${claim.tags.map((tag) => `<span class="if-chip">${escapeHtml(tag)}</span>`).join("")}</span>` : ""}
            </span>
            <span class="if-badge ${claim.status === "blocked" ? "if-badge--status-blocked" : claim.status === "complete" ? "if-badge--status-approved" : "if-badge--status-in-review"}">${escapeHtml(formatReviewAction(claim.status))}</span>
          </button>
        `;
      }).join("")}
    </div>
    <div class="if-claim-detail">
      ${doc.claims.map((claim) => {
        const selected = claim.id === doc.selected;
        return `
          <article class="if-claim-panel${selected ? " is-active" : ""}" data-claim-panel="${escapeHtml(claim.id)}"${selected ? "" : " hidden"}>
            <div class="if-claim-panel__header"><div><span class="if-claim-panel__eyebrow">Selected Claim</span><h3>${escapeHtml(claim.title)}</h3><p>${escapeHtml(claim.body)}</p></div><span class="if-badge if-badge--confidence-${String(claim.confidence).toLowerCase().includes("low") ? "low" : String(claim.confidence).toLowerCase().includes("medium") ? "medium" : "high"}">${escapeHtml(claim.confidence || "Tracked")}</span></div>
            <blockquote class="if-claim-quote">${escapeHtml(claim.quote || claim.title)}</blockquote>
            <dl class="if-claim-parse-grid">
              <div><dt>Actor</dt><dd>${escapeHtml(claim.actor || "Not parsed")}</dd></div>
              <div><dt>Predicate</dt><dd>${escapeHtml(claim.predicate || "Not parsed")}</dd></div>
              <div><dt>Object</dt><dd>${escapeHtml(claim.object || "Not parsed")}</dd></div>
              <div><dt>Due</dt><dd>${escapeHtml(claim.due || "Not scheduled")}</dd></div>
            </dl>
            <section class="if-claim-evidence"><h4>Evidence</h4><ul class="if-claim-mini-list">${(claim.evidence.length ? claim.evidence : ["No evidence linked"]).map((item) => `<li><strong>${escapeHtml(typeof item === "string" ? item : item.title || "Evidence")}</strong><span>${escapeHtml(typeof item === "string" ? "" : item.meta || item.status || "")}</span></li>`).join("")}</ul></section>
            ${claim.relationships.length ? `<div class="if-claim-link-cloud">${claim.relationships.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
  hydrateIcons(tracker);
  hydrateClaimTracker(tracker);
  return tracker;
}

function getClaimTrackerConfig(tracker) {
  const sourceSelector = tracker?.getAttribute?.("data-if-claims-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || tracker?.getAttribute?.("data-if-claims-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid claim tracker JSON", error);
    return null;
  }
}

function hydrateClaimTracker(tracker) {
  getClaimItems(tracker).forEach((claim) => {
    if (!claim.hasAttribute("role")) claim.setAttribute("role", "option");
    if (!claim.hasAttribute("tabindex")) claim.tabIndex = claim.classList.contains("is-selected") ? 0 : -1;
    claim.setAttribute("aria-selected", String(claim.classList.contains("is-selected")));
  });
  const selected = getSelectedClaim(tracker);
  if (selected) selectClaim(selected, { emit: false });
  updateClaimTracker(tracker);
}

function hydrateClaimTrackers(root = document) {
  const trackers = root?.matches?.("[data-if-claims]") ? [root, ...qsa("[data-if-claims]", root)] : qsa("[data-if-claims]", root);
  trackers.forEach((tracker) => {
    const config = tracker.dataset.ifClaimsRendered === "true" ? null : getClaimTrackerConfig(tracker);
    if (config) renderClaimTracker(tracker, config);
    else hydrateClaimTracker(tracker);
  });
}

function moveClaimSelection(tracker, direction) {
  const claims = getClaimItems(tracker);
  if (!claims.length) return null;
  const selected = getSelectedClaim(tracker) || claims[0];
  const index = claims.indexOf(selected);
  const next = claims[direction === "first" ? 0 : direction === "last" ? claims.length - 1 : (index + direction + claims.length) % claims.length];
  selectClaim(next);
  next.focus({ preventScroll: true });
  return next;
}

function handleClaimTrackerKeydown(event, tracker) {
  const claim = event.target.closest("[data-claim-id]");
  if (!claim || !tracker) return false;
  if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End", "Enter", " "].includes(event.key)) return false;
  event.preventDefault();
  if (event.key === "ArrowDown" || event.key === "ArrowRight") moveClaimSelection(tracker, 1);
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") moveClaimSelection(tracker, -1);
  if (event.key === "Home") moveClaimSelection(tracker, "first");
  if (event.key === "End") moveClaimSelection(tracker, "last");
  if (event.key === "Enter" || event.key === " ") selectClaim(claim);
  return true;
}

function selectClaim(control, options = {}) {
  const claim = control.closest("[data-claim-id]");
  const tracker = control.closest("[data-if-claims]");
  if (!claim || !tracker) return;
  const id = claim.dataset.claimId;
  qsa("[data-claim-id]", tracker).forEach((item) => {
    const selected = item === claim;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  qsa("[data-claim-panel]", tracker).forEach((panel) => {
    const selected = panel.dataset.claimPanel === id;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
  updateClaimTracker(tracker);
  if (options.emit !== false) {
    tracker.dispatchEvent(new CustomEvent("if:claim-select", {
      bubbles: true,
      detail: { claim, claimId: id, id, panel: qs(`[data-claim-panel="${escapeCssIdentifier(id)}"]`, tracker), state: getClaimTrackerState(tracker) }
    }));
  }
}

function selectHistoryEvent(control) {
  const eventItem = control.closest("[data-history-event]");
  const viewer = control.closest("[data-if-history]");
  if (!eventItem || !viewer) return;
  const id = eventItem.dataset.historyEvent;
  qsa("[data-history-event]", viewer).forEach((item) => {
    const selected = item === eventItem;
    item.classList.toggle("is-selected", selected);
    item.setAttribute("aria-selected", String(selected));
  });
  qsa("[data-history-panel]", viewer).forEach((panel) => {
    const selected = panel.dataset.historyPanel === id;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
  qsa("[data-if-history-current]", viewer).forEach((target) => {
    target.textContent = eventItem.dataset.historyLabel || eventItem.querySelector(".if-history-event__title")?.textContent?.trim() || id;
  });
  viewer.dispatchEvent(new CustomEvent("if:history-select", {
    bubbles: true,
    detail: { id, event: eventItem }
  }));
}

function toggleNavigation(control) {
  const shell = control.closest(".if-shell") || document.body;
  const target = getTarget(control) || qs(".if-sidebar", shell);
  const open = shell.dataset.navOpen !== "true";
  shell.dataset.navOpen = String(open);
  setExpanded(control, open);
  target?.classList.toggle("is-open", open);
}

function parseRoute(value, base = location.href) {
  try {
    const url = new URL(value || location.href, base);
    const path = url.pathname.replace(/\/index\.html$/i, "/").replace(/\/$/, "") || "/";
    return {
      path,
      hash: url.hash,
      full: `${path}${url.hash}`
    };
  } catch {
    const raw = String(value || "").trim();
    return {
      path: raw.split("#")[0].replace(/\/$/, "") || "/",
      hash: raw.includes("#") ? `#${raw.split("#").slice(1).join("#")}` : "",
      full: raw
    };
  }
}

function getCurrentRoute(nav = null) {
  return parseRoute(nav?.dataset.ifRouteCurrent || location.href);
}

function getLinkRoute(link) {
  return parseRoute(link.dataset.ifRoute || link.getAttribute("href") || "", location.href);
}

function routeMatches(link, currentRoute, nav = null) {
  const route = getLinkRoute(link);
  const matchMode = link.dataset.ifRouteMatch || nav?.dataset.ifRouteMatch || "exact";
  if (matchMode === "prefix") return currentRoute.path === route.path || currentRoute.path.startsWith(`${route.path}/`);
  if (matchMode === "hash") return currentRoute.path === route.path && (!route.hash || currentRoute.hash === route.hash);
  if (route.hash) return currentRoute.full === route.full;
  return currentRoute.path === route.path;
}

function setRouteNavigation(nav, routeValue = "") {
  if (!nav) return null;
  const currentRoute = parseRoute(routeValue || nav.dataset.ifRouteCurrent || location.href);
  nav.dataset.ifRouteCurrent = currentRoute.full;
  let activeLink = null;
  qsa("a[href], button[data-if-route]", nav).forEach((link) => {
    const active = routeMatches(link, currentRoute, nav);
    link.classList.toggle("is-active", active);
    if (active) {
      activeLink = link;
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  qsa("[data-if-route-current]", nav).forEach((target) => {
    target.textContent = activeLink?.dataset.ifRouteLabel || activeLink?.textContent?.trim() || currentRoute.full;
  });
  nav.dispatchEvent(new CustomEvent("if:route-change", {
    bubbles: true,
    detail: { route: currentRoute.full, activeLink }
  }));
  return activeLink;
}

function getRouteLabel(activeLink, routeValue = "") {
  return activeLink?.dataset.ifRouteLabel || activeLink?.textContent?.trim() || parseRoute(routeValue || location.href).full;
}

function updateRouteCurrentTargets(root, label) {
  qsa("[data-if-route-current]", root).forEach((target) => {
    target.textContent = label;
  });
}

function hydrateRouteNavigation(root) {
  qsa("[data-if-route-nav], .if-topbar__nav", root).forEach((nav) => setRouteNavigation(nav));
}

function updateSectionNavLink(link) {
  const nav = link.closest("[data-if-section-nav], .if-sidebar__nav");
  if (!nav) return;
  qsa("a[href^='#']", nav).forEach((item) => {
    const active = item === link;
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  });
}

function scrollToSectionLink(link, options = {}) {
  const hash = link.getAttribute("href");
  if (!hash || !hash.startsWith("#") || hash.length < 2) return false;
  const target = qs(hash);
  if (!target) return false;
  updateSectionNavLink(link);
  target.scrollIntoView({ block: "start", behavior: options.instant ? "auto" : "smooth" });
  if (!options.skipHistory) {
    history.pushState(null, "", hash);
  }
  const shell = link.closest(".if-shell");
  if (shell?.dataset.navOpen === "true") {
    shell.dataset.navOpen = "false";
    qs("[data-if-nav-toggle]", shell)?.setAttribute("aria-expanded", "false");
    qs(".if-sidebar", shell)?.classList.remove("is-open");
  }
  return true;
}

function hydrateSectionNav(root) {
  qsa(".if-sidebar__nav a[href^='#'], [data-if-section-nav] a[href^='#']", root).forEach((link) => {
    link.dataset.ifSectionLink = "";
  });
  if (location.hash) {
    const active = qsa("[data-if-section-link]", root).find((link) => link.getAttribute("href") === location.hash);
    if (active) {
      updateSectionNavLink(active);
      window.setTimeout(() => scrollToSectionLink(active, { instant: true, skipHistory: true }), 0);
    }
  }
}

const dropzoneHandlers = new WeakMap();

function getCommandPalette(control = null) {
  if (typeof control === "string") return qs(control);
  if (control?.matches?.("[data-if-command-palette]")) return control;
  if (control?.closest) {
    const local = control.closest("[data-if-command-palette]");
    if (local) return local;
  }
  if (control?.dataset?.ifCommandPaletteToggle) return getTarget(control, "ifCommandPaletteToggle");
  return qs("[data-if-command-palette]");
}

function getCommandItems(palette) {
  return qsa("[data-if-command-item]", palette).filter((item) => !item.hidden);
}

function getAllCommandItems(palette) {
  return qsa("[data-if-command-item]", palette);
}

function getCommandPaletteState(paletteOrSelector = null) {
  const palette = typeof paletteOrSelector === "string" ? qs(paletteOrSelector) : getCommandPalette(paletteOrSelector);
  if (!palette) return null;
  const allItems = getAllCommandItems(palette);
  const visibleItems = getCommandItems(palette);
  const active = qs("[data-if-command-item].is-active", palette) || visibleItems[0] || null;
  const input = qs("[data-if-command-input]", palette);
  return {
    activeCommand: active?.dataset.ifCommandId || active?.dataset.ifCommandLabel || "",
    activeIndex: active ? visibleItems.indexOf(active) : -1,
    commands: allItems.map((item) => ({
      group: item.dataset.ifCommandGroup || "",
      hidden: item.hidden,
      id: item.dataset.ifCommandId || "",
      label: item.dataset.ifCommandLabel || item.textContent?.trim() || "",
      route: item.dataset.ifCommandRoute || "",
      shortcut: item.dataset.ifCommandShortcut || ""
    })),
    open: palette.dataset.ifCommandOpen === "true",
    query: input?.value || "",
    total: allItems.length,
    visible: visibleItems.length
  };
}

function setCommandActiveItem(palette, index) {
  const items = getCommandItems(palette);
  if (!items.length) return;
  const nextIndex = ((index % items.length) + items.length) % items.length;
  items.forEach((item, itemIndex) => {
    const active = itemIndex === nextIndex;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
    if (active) item.focus({ preventScroll: true });
  });
}

function normalizeCommandPaletteDocument(config = {}) {
  const rawGroups = Array.isArray(config.groups) ? config.groups : [{ label: config.groupLabel || "Commands", commands: config.commands || config.items || [] }];
  return {
    emptyText: config.emptyText || "No commands match.",
    groups: rawGroups.map((group, groupIndex) => ({
      id: group.id || `group-${groupIndex + 1}`,
      label: group.label || group.title || `Group ${groupIndex + 1}`,
      commands: (group.commands || group.items || []).map((command, commandIndex) => ({
        description: command.description || command.meta || "",
        icon: command.icon || "workflow",
        id: command.id || `${group.id || `group-${groupIndex + 1}`}-command-${commandIndex + 1}`,
        label: command.label || command.title || `Command ${commandIndex + 1}`,
        route: command.route || command.href || "",
        selected: Boolean(command.selected),
        shortcut: command.shortcut || command.key || ""
      }))
    })).filter((group) => group.commands.length),
    label: config.label || config.title || "Command palette",
    placeholder: config.placeholder || "Search commands..."
  };
}

function renderCommandPalette(paletteOrSelector, config = {}) {
  const palette = typeof paletteOrSelector === "string" ? qs(paletteOrSelector) : getCommandPalette(paletteOrSelector);
  if (!palette) return null;
  const doc = normalizeCommandPaletteDocument(config);
  palette.dataset.ifCommandPaletteRendered = "true";
  palette.replaceChildren();
  palette.innerHTML = `
    <label class="if-search if-search--compact"><span class="if-search__icon if-icon-slot" data-if-icon="search"></span><input class="if-input" type="search" data-if-command-input placeholder="${escapeHtml(doc.placeholder)}" aria-label="${escapeHtml(doc.placeholder)}"></label>
    <div class="if-command-palette__list" role="listbox" aria-label="${escapeHtml(doc.label)}">
      ${doc.groups.map((group) => `
        <section class="if-command-palette__group" data-if-command-group="${escapeHtml(group.id)}" aria-label="${escapeHtml(group.label)}">
          <h4>${escapeHtml(group.label)}</h4>
          ${group.commands.map((command) => `
            <button class="if-command-palette__item${command.selected ? " is-active" : ""}" type="button" data-if-command-item data-if-command-id="${escapeHtml(command.id)}" data-if-command-label="${escapeHtml(command.label)}" data-if-command-group="${escapeHtml(group.id)}" data-if-command-route="${escapeHtml(command.route)}" data-if-command-shortcut="${escapeHtml(command.shortcut)}">
              <span class="if-icon-slot" data-if-icon="${escapeHtml(command.icon)}"></span>
              <span><strong>${escapeHtml(command.label)}</strong><em>${escapeHtml(command.description)}</em></span>
              ${command.shortcut ? `<kbd>${escapeHtml(command.shortcut)}</kbd>` : ""}
            </button>
          `).join("")}
        </section>
      `).join("")}
      <p class="if-empty if-empty--compact" data-if-command-empty hidden>${escapeHtml(doc.emptyText)}</p>
    </div>
    <p class="if-command-palette__meta"><span data-if-command-count="visible">0</span> of <span data-if-command-count="total">0</span> commands</p>
  `;
  hydrateIcons(palette);
  hydrateCommandPalette(palette);
  return palette;
}

function getCommandPaletteConfig(palette) {
  const sourceSelector = palette?.getAttribute?.("data-if-command-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || palette?.getAttribute?.("data-if-command-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid command palette JSON", error);
    return null;
  }
}

function hydrateCommandPalette(palette) {
  if (!palette.hasAttribute("role")) palette.setAttribute("role", "region");
  if (!palette.hasAttribute("aria-label")) palette.setAttribute("aria-label", "Command palette");
  qsa("[data-if-command-item]", palette).forEach((item) => {
    if (!item.hasAttribute("role")) item.setAttribute("role", "option");
    if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "-1");
  });
  filterCommandPalette(palette, { emit: false });
}

function hydrateCommandPalettes(root = document) {
  const palettes = root?.matches?.("[data-if-command-palette]") ? [root, ...qsa("[data-if-command-palette]", root)] : qsa("[data-if-command-palette]", root);
  palettes.forEach((palette) => {
    const config = palette.dataset.ifCommandPaletteRendered === "true" ? null : getCommandPaletteConfig(palette);
    if (config) renderCommandPalette(palette, config);
    else hydrateCommandPalette(palette);
  });
}

function getOpenCommandPalette() {
  return qsa("[data-if-command-palette]").find((palette) => palette.dataset.ifCommandOpen === "true");
}

function openCommandPalette(control = null) {
  const palette = getCommandPalette(control);
  if (!palette) return null;
  palette.hidden = false;
  palette.dataset.ifCommandOpen = "true";
  palette.classList.add("is-open");
  qsa("[data-if-command-palette-toggle]").forEach((trigger) => {
    if (getTarget(trigger, "ifCommandPaletteToggle") === palette) trigger.setAttribute("aria-expanded", "true");
  });
  filterCommandPalette(qs("[data-if-command-input]", palette) || palette);
  const input = qs("[data-if-command-input]", palette);
  input?.focus?.({ preventScroll: true });
  dispatchFrameworkEvent(palette, "if:command-palette-open", { palette, trigger: control || null, state: getCommandPaletteState(palette) });
  return palette;
}

function closeCommandPalette(palette = getOpenCommandPalette(), options = {}) {
  if (!palette) return;
  palette.dataset.ifCommandOpen = "false";
  palette.classList.remove("is-open");
  if (palette.dataset.ifCommandFloating === "true") palette.hidden = true;
  qsa("[data-if-command-palette-toggle]").forEach((trigger) => {
    if (getTarget(trigger, "ifCommandPaletteToggle") === palette) {
      trigger.setAttribute("aria-expanded", "false");
      if (options.restoreFocus) trigger.focus?.({ preventScroll: true });
    }
  });
}

function filterCommandPalette(inputOrPalette, options = {}) {
  const palette = getCommandPalette(inputOrPalette);
  if (!palette) return null;
  const input = inputOrPalette?.matches?.("[data-if-command-input]") ? inputOrPalette : qs("[data-if-command-input]", palette);
  const query = String(input?.value || "").trim().toLowerCase();
  let firstVisible = null;
  let visibleCount = 0;

  qsa("[data-if-command-item]", palette).forEach((item) => {
    const label = item.dataset.ifCommandLabel || item.textContent || "";
    const visible = !query || label.toLowerCase().includes(query);
    item.hidden = !visible;
    if (visible && !firstVisible) firstVisible = item;
    if (visible) visibleCount += 1;

    const labelEl = qs("strong", item);
    if (labelEl) {
      if (!labelEl.dataset.originalText) labelEl.dataset.originalText = labelEl.textContent || "";
      const original = labelEl.dataset.originalText;
      labelEl.innerHTML = query
        ? escapeHtml(original).replace(new RegExp(`(${escapeRegExp(query)})`, "ig"), "<mark>$1</mark>")
        : escapeHtml(original);
    }
  });

  qsa("[data-if-command-item]", palette).forEach((item) => {
    const active = item === firstVisible;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
  });
  qsa(".if-command-palette__group", palette).forEach((group) => {
    group.hidden = !qsa("[data-if-command-item]", group).some((item) => !item.hidden);
  });
  qsa("[data-if-command-empty]", palette).forEach((empty) => {
    empty.hidden = visibleCount > 0;
  });
  qsa("[data-if-command-count]", palette).forEach((target) => {
    target.textContent = String(target.dataset.ifCommandCount === "total" ? getAllCommandItems(palette).length : visibleCount);
  });
  if (options.emit !== false) {
    dispatchFrameworkEvent(palette, "if:command-palette-filter", { palette, query, state: getCommandPaletteState(palette) });
  }
  return getCommandPaletteState(palette);
}

function runCommandPaletteItem(item) {
  if (!item) return null;
  const palette = getCommandPalette(item);
  const label = item.dataset.ifCommandLabel || qs("strong", item)?.textContent?.trim() || item.textContent.trim();
  const status = qs("[data-if-command-status]", palette?.closest(".if-coverage-card") || document);
  if (status) status.textContent = `Command executed: ${label}`;
  dispatchFrameworkEvent(palette || item, "if:command-palette-action", {
    command: label,
    id: item.dataset.ifCommandId || "",
    item,
    route: item.dataset.ifCommandRoute || "",
    state: getCommandPaletteState(palette)
  });
  showToast(label, "command");
  closeCommandPalette(palette);
  return getCommandPaletteState(palette);
}

function renderDropzoneFiles(zone, files = []) {
  const list = qs("[data-if-dropzone-list]", zone);
  const status = qs("[data-if-dropzone-status]", zone);
  const normalized = Array.from(files).map((file) => ({
    name: file.name || String(file),
    size: file.size || 0,
    type: file.type || ""
  }));
  if (list) {
    list.innerHTML = normalized.length
      ? normalized.map((file) => `<span class="if-file-chip"><span class="if-icon-slot" data-if-icon="${file.name.toLowerCase().endsWith(".pdf") ? "filePdf" : file.name.toLowerCase().endsWith(".json") ? "fileJson" : file.name.toLowerCase().endsWith(".csv") ? "fileCsv" : "artifact"}"></span>${escapeHtml(file.name)}</span>`).join("")
      : `<span class="if-file-chip"><span class="if-icon-slot" data-if-icon="artifact"></span>No files staged</span>`;
    hydrateIcons(list);
  }
  if (status) {
    status.textContent = normalized.length
      ? `${normalized.length} staged artifact${normalized.length === 1 ? "" : "s"} ready for parsing.`
      : "No files staged yet.";
  }
  dispatchFrameworkEvent(zone, "if:dropzone-change", { files: normalized, zone });
}

function hydrateDropzone(zone) {
  if (dropzoneHandlers.has(zone)) return;
  const input = qs("[data-if-dropzone-input]", zone);
  const label = qs(".if-dropzone", zone) || zone;
  const handlers = {
    dragover(event) {
      event.preventDefault();
      label.classList.add("is-dragover");
    },
    dragleave(event) {
      if (!label.contains(event.relatedTarget)) label.classList.remove("is-dragover");
    },
    drop(event) {
      event.preventDefault();
      label.classList.remove("is-dragover");
      renderDropzoneFiles(zone, event.dataTransfer?.files || []);
    },
    keydown(event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input?.click?.();
      }
    }
  };
  label.addEventListener("dragover", handlers.dragover);
  label.addEventListener("dragleave", handlers.dragleave);
  label.addEventListener("drop", handlers.drop);
  label.addEventListener("keydown", handlers.keydown);
  dropzoneHandlers.set(zone, handlers);
}

function destroyDropzone(zone) {
  const handlers = dropzoneHandlers.get(zone);
  if (!handlers) return;
  const label = qs(".if-dropzone", zone) || zone;
  label.removeEventListener("dragover", handlers.dragover);
  label.removeEventListener("dragleave", handlers.dragleave);
  label.removeEventListener("drop", handlers.drop);
  label.removeEventListener("keydown", handlers.keydown);
  dropzoneHandlers.delete(zone);
}

function updateEditableGrid(grid) {
  if (!grid) return;
  const values = qsa("input[type='number'][data-if-editable-cell]", grid)
    .map((input) => Number(input.value))
    .filter((value) => Number.isFinite(value));
  const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  qsa("[data-if-editable-grid-total]", grid).forEach((target) => {
    target.textContent = String(average);
  });
  const rowCount = qsa("tbody tr", grid).length;
  qsa("[data-if-editable-grid-status]", grid).forEach((target) => {
    target.innerHTML = `${rowCount} rows, average confidence <strong data-if-editable-grid-total>${average}</strong>%.`;
  });
  dispatchFrameworkEvent(grid, "if:editable-grid-change", { grid, rows: rowCount, averageConfidence: average });
}

function markEditableGridCell(cell) {
  const grid = cell.closest("[data-if-editable-grid]");
  cell.classList.add("is-dirty");
  updateEditableGrid(grid);
}

function addEditableGridRow(control) {
  const grid = getTarget(control, "ifEditableGridAdd") || control.closest("[data-if-editable-grid]");
  const tbody = qs("tbody", grid);
  if (!tbody) return;
  const row = document.createElement("tr");
  row.innerHTML = `<td contenteditable="true" data-if-editable-cell>New extracted obligation pending review.</td><td contenteditable="true" data-if-editable-cell>Policy Owner</td><td><input class="if-input if-input--compact" type="number" min="0" max="100" value="70" data-if-editable-cell></td><td><span class="if-badge if-badge--status-needs-review">Needs review</span></td>`;
  tbody.append(row);
  hydrateIcons(row);
  updateEditableGrid(grid);
}

function formatIsoDateLabel(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function normalizeIsoDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getTodayIsoDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDatePickerSelectedValue(picker) {
  return normalizeIsoDate(picker?.dataset.ifDateValue)
    || normalizeIsoDate(qs("[data-if-date-select].is-selected", picker)?.dataset.ifDateSelect)
    || normalizeIsoDate(qs("[data-if-date-native]", picker)?.value)
    || getTodayIsoDate();
}

function getDatePickerMonthValue(picker) {
  const selected = getDatePickerSelectedValue(picker);
  const month = String(picker?.dataset.ifDateMonth || selected.slice(0, 7) || "").match(/^(\d{4})-(\d{2})$/);
  return month ? `${month[1]}-${month[2]}` : selected.slice(0, 7);
}

function getDatePickerMonthDate(picker) {
  const month = getDatePickerMonthValue(picker);
  const date = new Date(`${month}-01T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(`${getTodayIsoDate().slice(0, 7)}-01T00:00:00`) : date;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function offsetIsoDate(value, days) {
  const date = new Date(`${normalizeIsoDate(value) || getTodayIsoDate()}T00:00:00`);
  date.setDate(date.getDate() + days);
  return normalizeIsoDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
}

function setDatePickerMonth(picker, monthDate, options = {}) {
  if (!picker) return;
  const date = monthDate instanceof Date ? monthDate : getDatePickerMonthDate(picker);
  picker.dataset.ifDateMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  qsa("[data-if-date-month-label]", picker).forEach((target) => {
    target.textContent = formatMonthLabel(date);
  });
  if (options.render !== false) renderDatePickerGrid(picker);
}

function updateDatePickerSelection(picker, value) {
  const normalized = normalizeIsoDate(value);
  if (!picker || !normalized) return;
  picker.dataset.ifDateValue = normalized;
  let hasSelectedButton = false;
  qsa("[data-if-date-select]", picker).forEach((button) => {
    const selected = normalizeIsoDate(button.dataset.ifDateSelect) === normalized;
    if (selected) hasSelectedButton = true;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("tabindex", selected ? "0" : "-1");
    if (selected) button.setAttribute("aria-current", "date");
    else button.removeAttribute("aria-current");
  });
  if (!hasSelectedButton) {
    const month = getDatePickerMonthValue(picker);
    const fallback = qs(`[data-if-date-select^="${month}"]`, picker) || qs("[data-if-date-select]", picker);
    fallback?.setAttribute("tabindex", "0");
  }
  qsa("[data-if-date-native]", picker).forEach((target) => {
    target.value = normalized;
  });
  const label = formatIsoDateLabel(normalized);
  qsa("[data-if-date-output]", picker).forEach((target) => {
    target.value = label;
  });
  qsa("[data-if-date-summary]", picker).forEach((target) => {
    target.innerHTML = `Due ${escapeHtml(label)}. Emits <code>if:date-picker-change</code>.`;
  });
}

function renderDatePickerGrid(picker) {
  const grid = qs("[data-if-date-grid]", picker);
  if (!grid) return;
  const selected = getDatePickerSelectedValue(picker);
  const today = getTodayIsoDate();
  const monthDate = getDatePickerMonthDate(picker);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const currentMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells = weekdays.map((day) => `<span class="if-calendar-grid__weekday" aria-hidden="true">${day}</span>`);
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const iso = normalizeIsoDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
    const selectedClass = iso === selected ? " is-selected" : "";
    const outsideClass = iso.slice(0, 7) !== currentMonth ? " is-outside-month" : "";
    const todayClass = iso === today ? " is-today" : "";
    cells.push(`<button class="${`${selectedClass}${outsideClass}${todayClass}`.trim()}" type="button" data-if-date-select="${iso}" aria-label="${escapeHtml(formatIsoDateLabel(iso))}" aria-pressed="${iso === selected}" tabindex="${iso === selected ? "0" : "-1"}"${iso === selected ? " aria-current=\"date\"" : ""}>${date.getDate()}</button>`);
  }
  grid.setAttribute("aria-label", formatMonthLabel(monthDate));
  grid.innerHTML = cells.join("");
}

function setDatePickerValue(picker, value, options = {}) {
  const normalized = normalizeIsoDate(value);
  if (!picker || !normalized) return;
  const previousMonth = getDatePickerMonthValue(picker);
  const nextMonth = normalized.slice(0, 7);
  picker.dataset.ifDateValue = normalized;
  if (options.syncMonth !== false && previousMonth !== nextMonth) {
    const nextMonthDate = new Date(`${nextMonth}-01T00:00:00`);
    setDatePickerMonth(picker, nextMonthDate, { render: false });
  }
  if (options.render !== false) renderDatePickerGrid(picker);
  updateDatePickerSelection(picker, normalized);
  const label = formatIsoDateLabel(normalized);
  dispatchFrameworkEvent(picker, "if:date-picker-change", { picker, value: normalized, label });
}

function selectDatePickerDate(control) {
  const picker = control.closest("[data-if-date-picker]");
  if (!picker) return;
  setDatePickerValue(picker, control.dataset.ifDateSelect);
}

function moveDatePickerMonth(control) {
  const picker = control.closest("[data-if-date-picker]");
  if (!picker) return;
  const action = control.dataset.ifDateNav;
  if (action === "today") {
    setDatePickerValue(picker, getTodayIsoDate());
    return;
  }
  const monthDate = getDatePickerMonthDate(picker);
  monthDate.setMonth(monthDate.getMonth() + (action === "prev" ? -1 : 1));
  setDatePickerMonth(picker, monthDate);
  updateDatePickerSelection(picker, getDatePickerSelectedValue(picker));
  dispatchFrameworkEvent(picker, "if:date-picker-month", { picker, month: picker.dataset.ifDateMonth });
}

function hydrateDatePicker(picker) {
  const selected = getDatePickerSelectedValue(picker);
  picker.dataset.ifDateValue = selected;
  if (!picker.dataset.ifDateMonth) picker.dataset.ifDateMonth = selected.slice(0, 7);
  qsa("[data-if-date-select]", picker).forEach((button) => {
    if (!button.hasAttribute("type")) button.setAttribute("type", "button");
  });
  setDatePickerMonth(picker, getDatePickerMonthDate(picker));
  updateDatePickerSelection(picker, selected);
}

function getWizard(wizard) {
  return typeof wizard === "string" ? qs(wizard) : wizard;
}

function getWizardSteps(wizard) {
  return qsa("[data-if-wizard-step]", getWizard(wizard));
}

function getWizardPanels(wizard) {
  return qsa("[data-if-wizard-panel]", getWizard(wizard));
}

function getWizardStepIndex(wizard, step) {
  const root = getWizard(wizard);
  const steps = getWizardSteps(root);
  if (typeof step === "number") return step;
  const text = String(step ?? "").trim();
  if (!text) return Number(root?.dataset.ifWizardCurrent || 0);
  const numeric = Number(text);
  if (Number.isFinite(numeric) && text.match(/^-?\d+$/)) return numeric;
  return Math.max(0, steps.findIndex((button) => button.dataset.ifWizardStep === text || button.dataset.ifWizardStepId === text));
}

function getWizardState(wizard) {
  const root = getWizard(wizard);
  const steps = getWizardSteps(root);
  const panels = getWizardPanels(root);
  const index = Number(root?.dataset.ifWizardCurrent || 0);
  const selected = steps[index] || null;
  return {
    current: index,
    id: selected?.dataset.ifWizardStepId || selected?.dataset.ifWizardStep || "",
    label: selected?.querySelector(".if-stepper__label")?.textContent?.trim() || selected?.textContent?.trim() || "",
    total: Math.max(steps.length, panels.length),
    canNext: index < Math.max(steps.length, panels.length) - 1,
    canPrev: index > 0
  };
}

function getWizardStepStatus(index, current, step = {}) {
  if (step.status) return step.status;
  if (step.blocked) return "blocked";
  if (step.optional) return "optional";
  if (index < current) return "complete";
  if (index === current) return "active";
  return "future";
}

function getWizardStepClass(status) {
  if (status === "complete") return "is-complete";
  if (status === "active") return "is-active";
  if (status === "blocked") return "is-blocked";
  if (status === "optional") return "is-optional";
  return "";
}

function renderWizardStep(step = {}, index, selectedIndex) {
  const status = getWizardStepStatus(index, selectedIndex, step);
  const stepClass = getWizardStepClass(status);
  const id = step.id || String(index);
  const label = step.label || step.title || `Step ${index + 1}`;
  const meta = step.meta || status;
  const disabled = status === "blocked" || step.disabled;
  const dot = step.dot || (status === "complete" ? "ok" : status === "blocked" ? "!" : index + 1);
  return `
    <li class="if-stepper__step ${stepClass}" data-if-wizard-state="${escapeHtml(status)}">
      <button type="button" data-if-wizard-step="${index}" data-if-wizard-step-id="${escapeHtml(id)}" aria-current="${index === selectedIndex ? "step" : "false"}" aria-disabled="${disabled ? "true" : "false"}">
        <span class="if-stepper__dot">${escapeHtml(dot)}</span>
        <span class="if-stepper__label">${escapeHtml(label)}</span>
        <span class="if-stepper__meta">${escapeHtml(meta)}</span>
      </button>
    </li>
  `;
}

function renderWizard(wizardOrSelector, config = {}) {
  const wizard = getWizard(wizardOrSelector);
  if (!wizard) return null;
  const steps = Array.isArray(config.steps) ? config.steps : [];
  if (!steps.length) return wizard;
  const selectedIndex = Math.max(0, Math.min(Number(config.current ?? steps.findIndex((step) => step.active)) || 0, steps.length - 1));
  const classes = ["if-stepper", "if-stepper--interactive"];
  if (config.semantic !== false) classes.push("if-stepper--semantic");
  classes.push(`if-stepper--${config.variant || "boxed"}`);
  wizard.dataset.ifWizardRendered = "true";
  wizard.replaceChildren();
  wizard.innerHTML = `
    <ol class="${classes.map(escapeHtml).join(" ")}"${config.stepperId ? ` id="${escapeHtml(config.stepperId)}"` : ""} style="--step-count:${steps.length}" aria-label="${escapeHtml(config.label || "Wizard steps")}">
      ${steps.map((step, index) => renderWizardStep(step, index, selectedIndex)).join("")}
    </ol>
    <div class="if-wizard__progress" aria-hidden="true"><span data-if-wizard-progress></span></div>
    <div class="if-wizard__panels">
      ${steps.map((step, index) => `
        <section class="if-wizard__panel" data-if-wizard-panel="${index}"${index === selectedIndex ? "" : " hidden"}>
          <strong>${escapeHtml(step.panelTitle || step.title || step.label || `Step ${index + 1}`)}</strong>
          <p>${escapeHtml(step.panelBody || step.description || "")}</p>
        </section>
      `).join("")}
    </div>
    <div class="if-command-strip">
      <button class="if-btn if-btn--secondary if-btn--sm" type="button" data-if-wizard-prev>Previous</button>
      <button class="if-btn if-btn--primary if-btn--sm" type="button" data-if-wizard-next>Next</button>
      <span class="if-state-note" data-if-wizard-status aria-live="polite">Step ${selectedIndex + 1} of ${steps.length}</span>
    </div>
  `;
  hydrateWizard(wizard);
  setWizardStep(wizard, selectedIndex, { emit: false });
  return wizard;
}

function getWizardConfig(wizard) {
  const sourceSelector = wizard?.getAttribute?.("data-if-wizard-source");
  const source = sourceSelector ? qs(sourceSelector) : null;
  const json = source?.textContent || wizard?.getAttribute?.("data-if-wizard-json") || "";
  if (!json.trim()) return null;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("Invalid wizard JSON", error);
    return null;
  }
}

function syncWizardControls(wizard, index, total) {
  qsa("[data-if-wizard-prev]", wizard).forEach((control) => {
    control.disabled = index <= 0;
    control.setAttribute("aria-disabled", String(index <= 0));
  });
  qsa("[data-if-wizard-next]", wizard).forEach((control) => {
    control.disabled = index >= total - 1;
    control.setAttribute("aria-disabled", String(index >= total - 1));
  });
  qsa("[data-if-wizard-progress]", wizard).forEach((target) => {
    target.style.inlineSize = `${total ? ((index + 1) / total) * 100 : 0}%`;
  });
}

function setWizardStep(wizardOrSelector, stepIndex, options = {}) {
  const wizard = getWizard(wizardOrSelector);
  if (!wizard) return;
  const panels = getWizardPanels(wizard);
  const steps = getWizardSteps(wizard);
  const total = Math.max(panels.length, steps.length);
  const max = Math.max(0, total - 1);
  const index = Math.max(0, Math.min(getWizardStepIndex(wizard, stepIndex), max));
  const nextButton = steps[index];
  if (nextButton?.getAttribute("aria-disabled") === "true" && options.force !== true) return;
  panels.forEach((panel) => {
    const selected = Number(panel.dataset.ifWizardPanel) === index;
    panel.hidden = !selected;
  });
  steps.forEach((button) => {
    const item = button.closest(".if-stepper__step") || button;
    const buttonIndex = Number(button.dataset.ifWizardStep);
    const presetState = item.dataset.ifWizardState;
    const status = presetState === "blocked" || presetState === "optional" ? presetState : getWizardStepStatus(buttonIndex, index);
    item.classList.toggle("is-complete", status === "complete");
    item.classList.toggle("is-active", status === "active");
    item.classList.toggle("is-blocked", status === "blocked");
    item.classList.toggle("is-optional", status === "optional");
    button.setAttribute("aria-current", buttonIndex === index ? "step" : "false");
    button.tabIndex = buttonIndex === index ? 0 : -1;
  });
  const statusScope = wizard.closest(".if-wizard-lab, .if-coverage-card") || wizard;
  qsa("[data-if-wizard-status]", statusScope).forEach((target) => {
    const label = nextButton?.querySelector(".if-stepper__label")?.textContent?.trim();
    target.textContent = `${label ? `${label} - ` : ""}Step ${index + 1} of ${total}`;
  });
  syncWizardControls(wizard, index, total);
  wizard.dataset.ifWizardCurrent = String(index);
  if (options.emit !== false) dispatchFrameworkEvent(wizard, "if:wizard-step", { wizard, step: index, total, state: getWizardState(wizard) });
}

function moveWizardStep(control, direction) {
  const wizard = control?.closest?.("[data-if-wizard]") || getWizard(control);
  const current = Number(wizard?.dataset.ifWizardCurrent || 0);
  setWizardStep(wizard, current + direction);
}

function hydrateWizard(wizard) {
  if (!wizard) return;
  const config = wizard.dataset.ifWizardRendered === "true" ? null : getWizardConfig(wizard);
  if (config) {
    renderWizard(wizard, config);
    return;
  }
  getWizardSteps(wizard).forEach((button, index) => {
    if (!button.hasAttribute("type")) button.setAttribute("type", "button");
    if (!button.hasAttribute("data-if-wizard-step")) button.dataset.ifWizardStep = String(index);
    if (!button.hasAttribute("aria-disabled")) button.setAttribute("aria-disabled", "false");
    button.tabIndex = -1;
  });
  const active = qs(".if-stepper__step.is-active [data-if-wizard-step]", wizard) || getWizardSteps(wizard)[0];
  setWizardStep(wizard, Number(active?.dataset.ifWizardStep || 0), { emit: false });
}

function handleWizardKeydown(event, wizard) {
  const step = event.target.closest("[data-if-wizard-step]");
  if (!step || !wizard) return false;
  if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) return false;
  event.preventDefault();
  const steps = getWizardSteps(wizard);
  if (event.key === "ArrowRight" || event.key === "ArrowDown") moveWizardStep(wizard, 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") moveWizardStep(wizard, -1);
  if (event.key === "Home") setWizardStep(wizard, 0);
  if (event.key === "End") setWizardStep(wizard, steps.length - 1);
  if (event.key === "Enter" || event.key === " ") setWizardStep(wizard, Number(step.dataset.ifWizardStep));
  getWizardSteps(wizard)[Number(wizard.dataset.ifWizardCurrent || 0)]?.focus({ preventScroll: true });
  return true;
}

const annotationToolLabels = {
  claim: "Claim",
  reference: "Reference",
  organization: "Organization",
  evidence: "Evidence",
  implementation: "Implementation",
  enablement: "Enablement"
};

const annotationToolShortLabels = {
  claim: "CLM",
  reference: "REF",
  organization: "ORG",
  evidence: "EVD",
  implementation: "IMP",
  enablement: "ENB"
};

function getAnnotationToolbar(toolbarOrControl = null) {
  if (!toolbarOrControl) return qs("[data-if-annotation-toolbar]");
  if (typeof toolbarOrControl === "string") return qs(toolbarOrControl);
  if (toolbarOrControl.matches?.("[data-if-annotation-toolbar]")) return toolbarOrControl;
  const target = toolbarOrControl.dataset?.ifAnnotationTarget ? getTarget(toolbarOrControl, "ifAnnotationTarget") : null;
  return target?.matches?.("[data-if-annotation-toolbar]") ? target : toolbarOrControl.closest?.("[data-if-annotation-toolbar]");
}

function getAnnotationToolbarScope(toolbar) {
  return toolbar?.closest?.("[data-if-annotation-scope]") || toolbar?.closest?.(".if-coverage-card") || toolbar?.parentElement || document;
}

function getAnnotationToolId(control) {
  return control?.dataset?.ifAnnotationTool || "claim";
}

function getAnnotationToolLabel(control, tool = getAnnotationToolId(control)) {
  return control?.dataset?.ifAnnotationLabel || annotationToolLabels[tool] || control?.textContent?.trim() || tool;
}

function getAnnotationToolShortLabel(control, tool = getAnnotationToolId(control)) {
  return control?.dataset?.ifAnnotationShort || annotationToolShortLabels[tool] || getAnnotationToolLabel(control, tool).slice(0, 3).toUpperCase();
}

function getAnnotationToolbarState(toolbarOrControl = null) {
  const toolbar = getAnnotationToolbar(toolbarOrControl);
  const tools = qsa("[data-if-annotation-tool]", toolbar);
  const active = tools.find((button) => button.classList.contains("is-active") || button.getAttribute("aria-pressed") === "true") || tools[0] || null;
  const tool = getAnnotationToolId(active);
  const label = getAnnotationToolLabel(active, tool);
  const shortLabel = getAnnotationToolShortLabel(active, tool);
  const scope = getAnnotationToolbarScope(toolbar);
  const preview = qs("[data-if-annotation-preview]", scope);
  return {
    tool,
    label,
    shortLabel,
    description: active?.dataset?.ifAnnotationDescription || "",
    preview: {
      label: qs("[data-if-annotation-label]", preview)?.textContent?.trim() || "",
      text: preview?.textContent?.replace(/\s+/g, " ").trim() || "",
      className: preview?.className || ""
    },
    tools: tools.map((button) => {
      const id = getAnnotationToolId(button);
      return {
        id,
        label: getAnnotationToolLabel(button, id),
        shortLabel: getAnnotationToolShortLabel(button, id),
        description: button.dataset.ifAnnotationDescription || "",
        active: button === active,
        disabled: button.disabled || button.getAttribute("aria-disabled") === "true",
        pressed: button.getAttribute("aria-pressed") === "true"
      };
    })
  };
}

function syncAnnotationToolbarOutputs(toolbar, state) {
  const scope = getAnnotationToolbarScope(toolbar);
  const preview = qs("[data-if-annotation-preview]", scope);
  qsa("[data-if-annotation-current]", scope).filter((target) => target !== toolbar && !target.matches("[data-if-annotation-preview]")).forEach((target) => {
    target.textContent = state.label;
  });
  qsa("[data-if-annotation-description]", scope).filter((target) => !target.matches("[data-if-annotation-tool]")).forEach((target) => {
    target.textContent = state.description || `${state.label} annotation mode`;
  });
  qsa("[data-if-annotation-count]", scope).forEach((target) => {
    target.textContent = String(state.tools.length);
  });
  if (!preview) return;
  preview.dataset.ifAnnotationCurrent = state.tool;
  qsa("[data-if-annotation-label]", preview).forEach((target) => {
    target.textContent = state.shortLabel;
  });
  Array.from(preview.classList)
    .filter((className) => className.startsWith("if-annotation-preview--"))
    .forEach((className) => preview.classList.remove(className));
  preview.classList.add(`if-annotation-preview--${state.tool}`);
}

function setAnnotationTool(control, options = {}) {
  const toolbar = getAnnotationToolbar(control);
  if (!toolbar || !control) return null;
  const tools = qsa("[data-if-annotation-tool]", toolbar);
  tools.forEach((button) => {
    const active = button === control;
    setPressed(button, active);
    button.tabIndex = active ? 0 : -1;
  });
  toolbar.dataset.ifAnnotationCurrent = getAnnotationToolId(control);
  const state = getAnnotationToolbarState(toolbar);
  syncAnnotationToolbarOutputs(toolbar, state);
  if (options.emit !== false) {
    dispatchFrameworkEvent(toolbar, "if:annotation-tool-change", { toolbar, control, tool: state.tool, label: state.label, state });
  }
  return state;
}

function hydrateAnnotationToolbar(toolbar) {
  if (!toolbar) return null;
  if (!toolbar.hasAttribute("role")) toolbar.setAttribute("role", "toolbar");
  if (!toolbar.hasAttribute("aria-label")) toolbar.setAttribute("aria-label", "Annotation tools");
  const tools = qsa("[data-if-annotation-tool]", toolbar);
  tools.forEach((button) => {
    if (!button.hasAttribute("type")) button.setAttribute("type", "button");
    const tool = getAnnotationToolId(button);
    if (!button.hasAttribute("aria-label")) button.setAttribute("aria-label", getAnnotationToolLabel(button, tool));
    if (!button.dataset.ifAnnotationShort) button.dataset.ifAnnotationShort = getAnnotationToolShortLabel(button, tool);
  });
  const active = tools.find((button) => button.dataset.ifAnnotationTool === toolbar.dataset.ifAnnotationCurrent)
    || tools.find((button) => button.classList.contains("is-active") || button.getAttribute("aria-pressed") === "true")
    || tools[0]
    || null;
  return active ? setAnnotationTool(active, { emit: false }) : getAnnotationToolbarState(toolbar);
}

function hydrateAnnotationToolbars(root = document) {
  qsa("[data-if-annotation-toolbar]", root).forEach(hydrateAnnotationToolbar);
}

function handleAnnotationToolbarKeydown(event, toolbar) {
  const current = event.target.closest("[data-if-annotation-tool]");
  if (!current || !toolbar) return false;
  if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) return false;
  const tools = qsa("[data-if-annotation-tool]", toolbar).filter((button) => !button.disabled && button.getAttribute("aria-disabled") !== "true");
  if (!tools.length) return false;
  const index = Math.max(0, tools.indexOf(current));
  let nextIndex = index;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tools.length;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tools.length) % tools.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tools.length - 1;
  event.preventDefault();
  const next = event.key === "Enter" || event.key === " " ? current : tools[nextIndex];
  if (next) {
    setAnnotationTool(next);
    next.focus({ preventScroll: true });
  }
  return true;
}

function setStateVariant(control) {
  const target = getTarget(control, "ifStateTarget");
  if (!target) return;
  const variant = control.dataset.ifStateVariant || "empty";
  const group = control.closest(".if-state-toggle") || control.parentElement;
  qsa("[data-if-state-variant]", group).forEach((button) => {
    const active = button === control;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  qsa("[data-if-state-panel]", target).forEach((panel) => {
    panel.hidden = panel.dataset.ifStatePanel !== variant;
  });
  target.dataset.ifStateCurrent = variant;
  dispatchFrameworkEvent(target, "if:state-variant-change", { target, variant });
}

function hydrateCoverageComponents(root) {
  qsa("[data-if-dropzone]", root).forEach(hydrateDropzone);
  hydrateCommandPalettes(root);
  qsa("[data-if-command-palette-toggle]", root).forEach((trigger) => {
    if (!trigger.hasAttribute("aria-expanded")) trigger.setAttribute("aria-expanded", "false");
    if (!trigger.hasAttribute("aria-haspopup")) trigger.setAttribute("aria-haspopup", "dialog");
    const target = getTarget(trigger, "ifCommandPaletteToggle");
    if (target?.id && !trigger.hasAttribute("aria-controls")) trigger.setAttribute("aria-controls", target.id);
  });
  qsa("[data-if-editable-grid]", root).forEach(updateEditableGrid);
  qsa("[data-if-date-picker]", root).forEach(hydrateDatePicker);
  qsa("[data-if-wizard]", root).forEach(hydrateWizard);
  hydrateAnnotationToolbars(root);
}

function destroyCoverageComponents(root) {
  qsa("[data-if-dropzone]", root).forEach(destroyDropzone);
  qsa("[data-if-command-palette]", root).forEach((palette) => closeCommandPalette(palette));
}

function getOperationsWorkspace(target) {
  if (!target) return null;
  if (target.matches?.("[data-if-operations-workspace]")) return target;
  return target.closest?.("[data-if-operations-workspace]") || null;
}

function getOperationsSignals(workspace) {
  if (!workspace) return [];
  return qsa("[data-if-operations-signal]", workspace).filter((control) => getOperationsWorkspace(control) === workspace);
}

function getOperationsPanels(workspace) {
  if (!workspace) return [];
  return qsa("[data-if-operations-panel]", workspace).filter((panel) => getOperationsWorkspace(panel) === workspace);
}

function getOperationsSignalValue(control) {
  return control?.dataset?.ifOperationsSignal || control?.getAttribute?.("aria-controls") || "";
}

function getOperationsPanelValue(panel) {
  return panel?.dataset?.ifOperationsPanel || panel?.id || "";
}

function getOperationsWorkspaceState(workspace) {
  if (!workspace) return { selected: "", activeSignal: "", activeLabel: "", signals: [], panels: [] };
  const selected = workspace.dataset.ifOperationsCurrent || "";
  const selectedControl = getOperationsSignals(workspace).find((control) => getOperationsSignalValue(control) === selected) || null;
  const activeLabel = selectedControl?.dataset.ifOperationsLabel
    || selectedControl?.querySelector?.(".if-metric__label")?.textContent?.trim()
    || selectedControl?.textContent?.trim()?.replace(/\s+/g, " ")
    || "";
  return {
    selected,
    activeSignal: selected,
    activeLabel,
    signals: getOperationsSignals(workspace).map((control) => ({
      value: getOperationsSignalValue(control),
      label: control.textContent.trim().replace(/\s+/g, " "),
      selected: control.classList.contains("is-selected") || control.getAttribute("aria-pressed") === "true"
    })),
    panels: getOperationsPanels(workspace).map((panel) => ({
      value: getOperationsPanelValue(panel),
      id: panel.id || "",
      hidden: panel.hidden
    }))
  };
}

function setOperationsSignal(target, value, options = {}) {
  const workspace = getOperationsWorkspace(target);
  if (!workspace) return null;
  const signals = getOperationsSignals(workspace);
  const selectedValue = String(value || "");
  const control = signals.find((candidate) => getOperationsSignalValue(candidate) === selectedValue) || null;
  const panels = getOperationsPanels(workspace);
  let activePanel = null;

  signals.forEach((candidate) => {
    const active = Boolean(selectedValue) && getOperationsSignalValue(candidate) === selectedValue;
    candidate.classList.toggle("is-selected", active);
    candidate.setAttribute("aria-pressed", String(active));
    if (!candidate.hasAttribute("type") && candidate.tagName === "BUTTON") candidate.setAttribute("type", "button");
  });

  panels.forEach((panel) => {
    const active = Boolean(selectedValue) && getOperationsPanelValue(panel) === selectedValue;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
    if (active) activePanel = panel;
  });

  workspace.dataset.ifOperationsCurrent = selectedValue;
  const label = control?.dataset.ifOperationsLabel || control?.querySelector?.(".if-metric__label")?.textContent?.trim() || selectedValue || "";
  qsa("[data-if-operations-current-label]", workspace).forEach((slot) => {
    slot.textContent = label || slot.dataset.ifOperationsEmpty || "None";
  });

  if (activePanel && options.focusPanel) {
    if (!activePanel.hasAttribute("tabindex")) activePanel.setAttribute("tabindex", "-1");
    activePanel.focus({ preventScroll: true });
  }

  if (options.emit !== false) {
    dispatchFrameworkEvent(workspace, "if:operations-signal-change", {
      workspace,
      value: selectedValue,
      signal: selectedValue,
      label,
      control,
      panel: activePanel,
      state: getOperationsWorkspaceState(workspace)
    });
  }

  return activePanel;
}

function resetOperationsSignal(target, options = {}) {
  const workspace = getOperationsWorkspace(target);
  if (!workspace) return false;
  const previous = workspace.dataset.ifOperationsCurrent || "";
  setOperationsSignal(workspace, "", { emit: false });
  if (options.focus && workspace.focus) {
    if (!workspace.hasAttribute("tabindex")) workspace.setAttribute("tabindex", "-1");
    workspace.focus({ preventScroll: true });
  }
  if (options.emit !== false) {
    dispatchFrameworkEvent(workspace, "if:operations-signal-reset", {
      workspace,
      previous,
      state: getOperationsWorkspaceState(workspace)
    });
  }
  return true;
}

function hydrateOperationsWorkspaces(root = document) {
  qsa("[data-if-operations-workspace]", root).forEach((workspace) => {
    const signals = getOperationsSignals(workspace);
    const panels = getOperationsPanels(workspace);
    signals.forEach((control) => {
      if (control.tagName === "BUTTON" && !control.hasAttribute("type")) control.setAttribute("type", "button");
      if (!control.hasAttribute("aria-pressed")) control.setAttribute("aria-pressed", "false");
      const value = getOperationsSignalValue(control);
      const panel = panels.find((candidate) => getOperationsPanelValue(candidate) === value);
      if (panel?.id && !control.hasAttribute("aria-controls")) control.setAttribute("aria-controls", panel.id);
    });

    const current = workspace.dataset.ifOperationsCurrent
      || signals.find((control) => control.classList.contains("is-selected") || control.getAttribute("aria-pressed") === "true")?.dataset.ifOperationsSignal
      || panels.find((panel) => !panel.hidden)?.dataset.ifOperationsPanel
      || "";
    if (current) {
      setOperationsSignal(workspace, current, { emit: false });
    } else {
      resetOperationsSignal(workspace, { emit: false });
    }
  });
}

function handleOperationsSignalKeydown(event, control) {
  const workspace = getOperationsWorkspace(control);
  if (!workspace) return false;
  if (event.key === "Escape") {
    event.preventDefault();
    resetOperationsSignal(workspace);
    control.focus({ preventScroll: true });
    return true;
  }
  if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return false;
  const signals = getOperationsSignals(workspace).filter((candidate) => !candidate.disabled && candidate.getAttribute("aria-disabled") !== "true");
  if (!signals.length) return false;
  const index = Math.max(0, signals.indexOf(control));
  let nextIndex = index;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % signals.length;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + signals.length) % signals.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = signals.length - 1;
  event.preventDefault();
  const next = signals[nextIndex];
  setOperationsSignal(next, getOperationsSignalValue(next));
  next.focus({ preventScroll: true });
  return true;
}

function handleClick(event) {
  const themeButton = event.target.closest("[data-if-theme]");
  if (themeButton) {
    event.preventDefault();
    setTheme(themeButton.dataset.ifTheme, { target: getThemeTarget(themeButton) });
    return;
  }

  const performanceRun = event.target.closest("[data-if-performance-run]");
  if (performanceRun) {
    event.preventDefault();
    runPerformanceLab(performanceRun, performanceRun.dataset.ifPerformanceRun);
    return;
  }

  const publicSearchFilter = event.target.closest("[data-if-public-search-filter]");
  if (publicSearchFilter) {
    event.preventDefault();
    setPublicSearchFilter(publicSearchFilter);
    return;
  }

  const publicSearchClear = event.target.closest("[data-if-public-search-clear]");
  if (publicSearchClear) {
    event.preventDefault();
    clearPublicSearch(publicSearchClear);
    return;
  }

  const publicSearchSubmit = event.target.closest("[data-if-public-search-submit]");
  if (publicSearchSubmit) {
    event.preventDefault();
    updatePublicSearch(publicSearchSubmit);
    return;
  }

  const navToggle = event.target.closest("[data-if-nav-toggle]");
  if (navToggle) {
    event.preventDefault();
    toggleNavigation(navToggle);
    return;
  }

  const routeDemo = event.target.closest("[data-if-route-demo]");
  if (routeDemo) {
    event.preventDefault();
    const navs = qsa(routeDemo.dataset.ifRouteDemo);
    const route = routeDemo.dataset.ifRouteValue || routeDemo.getAttribute("href") || "";
    if (navs.length) {
      let activeLink = null;
      navs.forEach((nav) => {
        activeLink = setRouteNavigation(nav, route) || activeLink;
      });
      updateRouteCurrentTargets(routeDemo.closest(".if-specimen, .if-behavior-card") || document, getRouteLabel(activeLink, route));
      qsa("[data-if-route-demo]", routeDemo.closest(".if-specimen, .if-behavior-card") || document).forEach((control) => {
        const active = control === routeDemo;
        control.classList.toggle("is-active", active);
        control.setAttribute("aria-pressed", String(active));
      });
    }
    return;
  }

  const routeDemoLink = event.target.closest("[data-if-route-demo-link]");
  if (routeDemoLink) {
    const nav = routeDemoLink.closest("[data-if-route-nav]");
    if (nav) {
      event.preventDefault();
      const route = routeDemoLink.dataset.ifRoute || routeDemoLink.getAttribute("href") || "";
      const activeLink = setRouteNavigation(nav, route);
      updateRouteCurrentTargets(routeDemoLink.closest(".if-mobile-frame, .if-specimen") || nav, getRouteLabel(activeLink, route));
      return;
    }
  }

  const operationsSignal = event.target.closest("[data-if-operations-signal]");
  if (operationsSignal) {
    event.preventDefault();
    setOperationsSignal(operationsSignal, getOperationsSignalValue(operationsSignal), { focusPanel: operationsSignal.dataset.ifOperationsFocusPanel === "true" });
    return;
  }

  const operationsReset = event.target.closest("[data-if-operations-reset]");
  if (operationsReset) {
    event.preventDefault();
    resetOperationsSignal(operationsReset);
    return;
  }

  const graphMinimap = event.target.closest(".if-graph-minimap");
  if (graphMinimap) {
    event.preventDefault();
    panGraphToMinimapPoint(graphMinimap, event);
    return;
  }

  const sectionLink = event.target.closest("[data-if-section-link]");
  if (sectionLink) {
    if (scrollToSectionLink(sectionLink)) {
      event.preventDefault();
      return;
    }
  }

  const drawerOpen = event.target.closest("[data-if-drawer-open]");
  if (drawerOpen) {
    event.preventDefault();
    openDrawer(getTarget(drawerOpen, "ifDrawerOpen"));
    return;
  }

  const drawerClose = event.target.closest("[data-if-drawer-close]");
  if (drawerClose) {
    event.preventDefault();
    closeDrawer(getTarget(drawerClose, "ifDrawerClose") || drawerClose.closest(".if-drawer"));
    return;
  }

  const modalOpen = event.target.closest("[data-if-modal-open]");
  if (modalOpen) {
    event.preventDefault();
    openModal(getTarget(modalOpen, "ifModalOpen"));
    return;
  }

  const modalClose = event.target.closest("[data-if-modal-close]");
  if (modalClose) {
    event.preventDefault();
    closeModal(modalClose.closest(".if-modal"));
    return;
  }

  if (event.target.classList.contains("if-modal")) {
    closeModal(event.target);
    return;
  }

  if (event.target.matches("[data-if-backdrop]")) {
    qsa(".if-drawer.is-open").forEach(closeDrawer);
    return;
  }

  const autocompleteOption = event.target.closest("[data-if-autocomplete-option]");
  if (autocompleteOption) {
    if (event.__ifAutocompleteHandled) return;
    event.preventDefault();
    selectAutocompleteOption(autocompleteOption);
    return;
  }

  const autocompleteDemo = event.target.closest("[data-if-autocomplete-demo]");
  if (autocompleteDemo) {
    event.preventDefault();
    const input = qs(autocompleteDemo.dataset.ifAutocompleteDemo);
    if (input) {
      input.dataset.ifAutocompleteMockState = autocompleteDemo.dataset.ifAutocompleteDemoState || "";
      input.value = autocompleteDemo.dataset.ifAutocompleteDemoQuery || input.value || "DoDI";
      qsa("[data-if-autocomplete-demo]", autocompleteDemo.closest(".if-behavior-card") || document).forEach((control) => {
        const selected = control === autocompleteDemo;
        control.classList.toggle("is-active", selected);
        control.setAttribute("aria-pressed", String(selected));
      });
      input.focus({ preventScroll: true });
      renderAutocomplete(input);
    }
    return;
  }

  const autocompleteCancel = event.target.closest("[data-if-autocomplete-cancel]");
  if (autocompleteCancel) {
    event.preventDefault();
    const input = qs(autocompleteCancel.dataset.ifAutocompleteCancel);
    if (input && !cancelAutocomplete(input, "user", { render: true })) closeAutocomplete(input, { cancel: false });
    return;
  }

  const iconSwatch = event.target.closest(".if-icon-swatch[data-if-icon-name]");
  if (iconSwatch) {
    event.preventDefault();
    selectIconSwatch(iconSwatch);
    return;
  }

  if (!event.target.closest(".if-autocomplete, .if-search")) {
    qsa("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]").forEach(closeAutocomplete);
  }

  const popoverToggle = event.target.closest("[data-if-popover-toggle]");
  if (popoverToggle) {
    event.preventDefault();
    togglePopover(popoverToggle);
    return;
  }

  if (!event.target.closest("[data-if-popover]")) {
    closePopovers();
  }

  const focusClear = event.target.closest("[data-if-focus-clear]");
  if (focusClear) {
    event.preventDefault();
    resetFocusSurface(focusClear);
    return;
  }

  const menuToggle = event.target.closest("[data-if-menu-toggle]");
  if (menuToggle) {
    event.preventDefault();
    toggleMenu(menuToggle);
    return;
  }

  const menuItem = event.target.closest("[data-if-menu-item]");
  if (menuItem) {
    event.preventDefault();
    selectMenuItem(menuItem);
    return;
  }

  const menuAction = event.target.closest("[data-if-menu-action]");
  if (menuAction) {
    event.preventDefault();
    const message = menuAction.dataset.ifMenuAction || menuAction.textContent.trim();
    dispatchFrameworkEvent(menuAction, "if:menu-action", { message });
    showToast(message, "download");
    return;
  }

  if (!event.target.closest("[data-if-menu], [data-if-menu-toggle]")) {
    closeMenus();
  }

  const commandPaletteToggle = event.target.closest("[data-if-command-palette-toggle]");
  if (commandPaletteToggle) {
    event.preventDefault();
    openCommandPalette(commandPaletteToggle);
    return;
  }

  const commandPaletteItem = event.target.closest("[data-if-command-item]");
  if (commandPaletteItem) {
    event.preventDefault();
    runCommandPaletteItem(commandPaletteItem);
    return;
  }

  const editableGridAdd = event.target.closest("[data-if-editable-grid-add]");
  if (editableGridAdd) {
    event.preventDefault();
    addEditableGridRow(editableGridAdd);
    return;
  }

  const dateSelect = event.target.closest("[data-if-date-select]");
  if (dateSelect) {
    event.preventDefault();
    selectDatePickerDate(dateSelect);
    return;
  }

  const dateNav = event.target.closest("[data-if-date-nav]");
  if (dateNav) {
    event.preventDefault();
    moveDatePickerMonth(dateNav);
    return;
  }

  const wizardStep = event.target.closest("[data-if-wizard-step]");
  if (wizardStep) {
    event.preventDefault();
    setWizardStep(wizardStep.closest("[data-if-wizard]"), Number(wizardStep.dataset.ifWizardStep));
    return;
  }

  const wizardPrev = event.target.closest("[data-if-wizard-prev]");
  if (wizardPrev) {
    event.preventDefault();
    moveWizardStep(wizardPrev, -1);
    return;
  }

  const wizardNext = event.target.closest("[data-if-wizard-next]");
  if (wizardNext) {
    event.preventDefault();
    moveWizardStep(wizardNext, 1);
    return;
  }

  const annotationTool = event.target.closest("[data-if-annotation-tool]");
  if (annotationTool) {
    event.preventDefault();
    setAnnotationTool(annotationTool);
    return;
  }

  const stateVariant = event.target.closest("[data-if-state-variant]");
  if (stateVariant) {
    event.preventDefault();
    setStateVariant(stateVariant);
    return;
  }

  const formFocus = event.target.closest("[data-if-form-focus]");
  if (formFocus) {
    event.preventDefault();
    const target = document.getElementById(formFocus.dataset.ifFormFocus);
    if (target) {
      target.focus();
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    return;
  }

  const formReset = event.target.closest("[data-if-form-reset]");
  if (formReset) {
    event.preventDefault();
    const form = formReset.closest("[data-if-form], form");
    if (form) {
      form.reset();
      validateForm(form, { focus: false });
    }
    return;
  }

  const notificationRead = event.target.closest("[data-if-notification-read]");
  if (notificationRead) {
    event.preventDefault();
    const popover = notificationRead.closest("[data-if-popover]");
    qsa(".if-notification-item--unread", popover).forEach((item) => {
      item.classList.remove("if-notification-item--unread");
    });
    qsa(".if-notification-btn__badge", popover).forEach((badge) => {
      badge.textContent = "0";
      badge.hidden = true;
    });
    return;
  }

  const demoState = event.target.closest("[data-if-demo-state]");
  if (demoState) {
    event.preventDefault();
    setDemoState(demoState);
    return;
  }

  const componentInventoryClear = event.target.closest("[data-if-component-inventory-clear]");
  if (componentInventoryClear) {
    event.preventDefault();
    resetComponentInventoryFilters(componentInventoryClear);
    return;
  }

  const componentInventoryClearFilter = event.target.closest("[data-if-component-inventory-clear-filter]");
  if (componentInventoryClearFilter) {
    event.preventDefault();
    clearComponentInventoryFilter(componentInventoryClearFilter);
    return;
  }

  const componentInventoryPreset = event.target.closest("[data-if-component-inventory-preset]");
  if (componentInventoryPreset) {
    event.preventDefault();
    applyComponentInventoryPreset(componentInventoryPreset);
    return;
  }

  const componentInventoryCategorySet = event.target.closest("[data-if-component-inventory-category-set]");
  if (componentInventoryCategorySet) {
    event.preventDefault();
    setComponentInventoryCategoryFilter(componentInventoryCategorySet);
    return;
  }

  const componentInventoryCapabilitySet = event.target.closest("[data-if-component-inventory-capability-set]");
  if (componentInventoryCapabilitySet) {
    event.preventDefault();
    setComponentInventoryCapabilityFilter(componentInventoryCapabilitySet);
    return;
  }

  const componentInventorySelect = event.target.closest("[data-if-component-inventory-select]");
  if (componentInventorySelect) {
    event.preventDefault();
    const component = selectComponentInventoryCard(componentInventorySelect);
    const inventory = getComponentInventory(componentInventorySelect);
    const card = component?.id ? getComponentInventoryCard(inventory, component.id) : null;
    if (card && !card.hidden) {
      card.scrollIntoView({ block: "nearest", inline: "nearest" });
      card.focus({ preventScroll: true });
    }
    return;
  }

  const componentInventoryCard = event.target.closest("[data-if-inventory-id]");
  if (componentInventoryCard && componentInventoryCard.closest("[data-if-component-inventory]") && !event.target.closest("a, button, input, select, textarea")) {
    event.preventDefault();
    selectComponentInventoryCard(componentInventoryCard);
    return;
  }

  const chartDataset = event.target.closest("[data-if-chart-dataset]");
  if (chartDataset) {
    event.preventDefault();
    setChartDataset(chartDataset);
    return;
  }

  const sparklineToggle = event.target.closest("[data-if-sparkline-toggle]");
  if (sparklineToggle) {
    event.preventDefault();
    toggleSparklineStream(sparklineToggle);
    return;
  }

  const sparklineStep = event.target.closest("[data-if-sparkline-step]");
  if (sparklineStep) {
    event.preventDefault();
    getSparklineTargets(sparklineStep.dataset.ifSparklineStep).forEach(stepSparklineStream);
    return;
  }

  const sparklineReset = event.target.closest("[data-if-sparkline-reset]");
  if (sparklineReset) {
    event.preventDefault();
    resetSparklineStream(sparklineReset);
    return;
  }

  const chartSeriesToggle = event.target.closest("[data-if-chart-series-toggle]");
  if (chartSeriesToggle) {
    event.preventDefault();
    toggleChartSeries(chartSeriesToggle);
    return;
  }

  const chartPoint = event.target.closest("[data-if-chart-point]");
  if (chartPoint && chartPoint.closest("[data-if-chart]")) {
    event.preventDefault();
    selectChartPoint(chartPoint);
    return;
  }

  const tab = event.target.closest("[role='tab']");
  if (tab && tab.closest("[data-if-tabs]")) {
    event.preventDefault();
    activateTab(tab);
    return;
  }

  const accordion = event.target.closest("[data-if-accordion-trigger], [data-if-accordion]");
  if (accordion) {
    event.preventDefault();
    toggleAccordion(accordion);
    return;
  }

  const expand = event.target.closest("[data-if-expand]");
  if (expand) {
    event.preventDefault();
    toggleExpanded(expand);
    return;
  }

  const collapsibleToggle = event.target.closest("[data-if-collapsible-toggle]");
  if (collapsibleToggle) {
    event.preventDefault();
    toggleCollapsibleSurface(collapsibleToggle);
    return;
  }

  const surfaceExpand = event.target.closest("[data-if-surface-expand]");
  if (surfaceExpand) {
    event.preventDefault();
    toggleSurfaceExpansion(surfaceExpand);
    return;
  }

  const surfaceExport = event.target.closest("[data-if-export]");
  if (surfaceExport) {
    event.preventDefault();
    exportSurface(surfaceExport);
    return;
  }

  const surfaceExportCancel = event.target.closest("[data-if-export-cancel]");
  if (surfaceExportCancel) {
    event.preventDefault();
    cancelSurfaceExport(surfaceExportCancel);
    return;
  }

  const adapterRetry = event.target.closest("[data-if-adapter-retry]");
  if (adapterRetry) {
    event.preventDefault();
    retryAdapterRequest(adapterRetry);
    return;
  }

  const docSource = event.target.closest("[data-if-doc-source]");
  if (docSource) {
    event.preventDefault();
    selectDocumentArtifact(docSource);
    return;
  }

  const docMode = event.target.closest("[data-if-doc-mode]");
  if (docMode) {
    event.preventDefault();
    setDocumentArtifactMode(docMode);
    return;
  }

  const docClear = event.target.closest("[data-if-doc-clear]");
  if (docClear) {
    event.preventDefault();
    clearDocumentSearch(docClear);
    return;
  }

  const docJump = event.target.closest("[data-if-doc-jump]");
  if (docJump) {
    event.preventDefault();
    jumpToDocumentText(docJump);
    return;
  }

  const docAnnotation = event.target.closest("[data-if-doc-annotation]");
  if (docAnnotation) {
    event.preventDefault();
    inspectDocumentAnnotation(docAnnotation);
    return;
  }

  const docFilter = event.target.closest("[data-if-doc-filter]");
  if (docFilter) {
    event.preventDefault();
    setDocumentFilter(docFilter);
    return;
  }

  const tableSort = event.target.closest("[data-if-table-sort]");
  if (tableSort) {
    event.preventDefault();
    sortDataTable(tableSort);
    return;
  }

  const tableExpand = event.target.closest("[data-if-table-expand]");
  if (tableExpand) {
    event.preventDefault();
    toggleDataTableRow(tableExpand);
    return;
  }

  const tablePage = event.target.closest("[data-if-table-page], [data-if-table-prev], [data-if-table-next]");
  if (tablePage) {
    event.preventDefault();
    setDataTablePage(tablePage);
    return;
  }

  const tableClear = event.target.closest("[data-if-table-clear]");
  if (tableClear) {
    event.preventDefault();
    clearDataTableFilters(tableClear);
    return;
  }

  const tableDensity = event.target.closest("[data-if-table-density]");
  if (tableDensity) {
    event.preventDefault();
    setDataTableDensity(tableDensity);
    return;
  }

  const tablePin = event.target.closest("[data-if-table-pin-column]");
  if (tablePin) {
    event.preventDefault();
    pinDataTableColumn(tablePin, tablePin.dataset.ifTablePinColumn, tablePin.dataset.ifTablePinSide || "left");
    return;
  }

  const tableRefresh = event.target.closest("[data-if-table-refresh]");
  if (tableRefresh) {
    event.preventDefault();
    refreshDataTable(tableRefresh, { resetPage: tableRefresh.dataset.ifTableRefresh === "reset" });
    return;
  }

  const claim = event.target.closest("[data-if-claim-select], [data-claim-id]");
  if (claim && claim.closest("[data-if-claims]")) {
    event.preventDefault();
    selectClaim(claim);
    return;
  }

  const historyEvent = event.target.closest("[data-if-history-event], [data-history-event]");
  if (historyEvent && historyEvent.closest("[data-if-history]")) {
    event.preventDefault();
    selectHistoryEvent(historyEvent);
    return;
  }

  const reviewAction = event.target.closest("[data-if-review-action]");
  if (reviewAction && reviewAction.closest("[data-if-review-workflow]")) {
    event.preventDefault();
    applyReviewWorkflowAction(reviewAction);
    return;
  }

  const reviewItem = event.target.closest("[data-if-review-item]");
  if (reviewItem && reviewItem.closest("[data-if-review-workflow]")) {
    event.preventDefault();
    selectReviewWorkflowItem(reviewItem);
    return;
  }

  const erdMode = event.target.closest("[data-if-erd-mode]");
  if (erdMode) {
    event.preventDefault();
    setErdMode(erdMode);
    return;
  }

  const erdViewport = event.target.closest("[data-if-erd-viewport]");
  if (erdViewport) {
    event.preventDefault();
    setErdViewport(erdViewport);
    return;
  }

  const erdZone = event.target.closest("[data-if-erd-zone]");
  if (erdZone) {
    event.preventDefault();
    setErdZone(erdZone);
    return;
  }

  const erdDensity = event.target.closest("[data-if-erd-density]");
  if (erdDensity) {
    event.preventDefault();
    setErdDensity(erdDensity);
    return;
  }

  const erdFocus = event.target.closest("[data-if-erd-focus]");
  if (erdFocus) {
    event.preventDefault();
    setErdFocus(erdFocus);
    return;
  }

  const erdEdgeFilter = event.target.closest("[data-if-erd-edge-filter]");
  if (erdEdgeFilter) {
    event.preventDefault();
    setErdEdgeFilter(erdEdgeFilter);
    return;
  }

  const erdOrganize = event.target.closest("[data-if-erd-organize]");
  if (erdOrganize) {
    event.preventDefault();
    organizeErd(erdOrganize);
    return;
  }

  const erdReset = event.target.closest("[data-if-erd-reset]");
  if (erdReset) {
    event.preventDefault();
    const erd = erdReset.closest("[data-if-erd]");
    resetErdLayout(erd);
    resetErdView(getErdCanvas(erd));
    return;
  }

  const erdNode = event.target.closest("[data-erd-node]");
  if (erdNode) {
    const erd = erdNode.closest("[data-if-erd]");
    if (erd?.dataset.erdSuppressClick === "true") return;
    selectErdNode(erdNode);
  }

  const erdCanvas = event.target.closest(".if-erd-canvas");
  if (erdCanvas && !event.target.closest("button, a, input, select, textarea")) {
    const erd = erdCanvas.closest("[data-if-erd]");
    if (erd?.dataset.erdSuppressClick === "true") return;
    qsa("[data-erd-node]", erd).forEach((node) => {
      node.classList.remove("is-related", "is-muted");
      node.setAttribute("aria-selected", "false");
    });
    qsa("[data-erd-edge-from][data-erd-edge-to]", erd).forEach((edge) => {
      edge.classList.remove("is-related", "is-muted");
    });
    delete erd.dataset.erdFocusId;
    applyErdFocus(erd);
    updateErdStatus(erd);
    return;
  }

  const graphContextAction = event.target.closest("[data-if-graph-context-action]");
  if (graphContextAction) {
    event.preventDefault();
    runGraphContextAction(graphContextAction);
    return;
  }

  const graphNode = event.target.closest(".if-graph-node[data-node-id]");
  if (graphNode) {
    event.preventDefault();
    const graph = graphNode.closest("[data-if-graph]");
    if (graph?.dataset.graphSuppressClick === "true") return;
    selectGraphNode(graphNode);
    setGraphPath(graph, graphNode);
    if (graphNode.matches("[data-if-graph-cluster]")) toggleGraphCluster(graphNode);
    showGraphContextMenu(graphNode);
    return;
  }

  const graphCluster = event.target.closest("[data-if-graph-cluster]");
  if (graphCluster) {
    event.preventDefault();
    const graph = graphCluster.closest("[data-if-graph]");
    if (graph?.dataset.graphSuppressClick === "true") return;
    toggleGraphCluster(graphCluster);
    return;
  }

  const graphLayout = event.target.closest("[data-if-graph-layout]");
  if (graphLayout) {
    event.preventDefault();
    setGraphLayout(graphLayout);
    return;
  }

  const graphMode = event.target.closest("[data-if-graph-mode]");
  if (graphMode) {
    event.preventDefault();
    setGraphMode(graphMode);
    return;
  }

  const graphViewport = event.target.closest("[data-if-graph-viewport='in'], [data-if-graph-viewport='out'], [data-if-graph-viewport='fit'], [data-if-graph-viewport='reset']");
  if (graphViewport) {
    event.preventDefault();
    setGraphViewport(graphViewport);
    return;
  }

  const graphOrganize = event.target.closest("[data-if-graph-organize]");
  if (graphOrganize) {
    event.preventDefault();
    const graph = graphOrganize.closest("[data-if-graph]");
    if (graphOrganize.dataset.ifGraphOrganize === "reset") {
      qsa("[data-if-graph-option]", graph).forEach((control) => {
        if (control.dataset.defaultValue !== undefined) control.value = control.dataset.defaultValue;
        if (control.dataset.defaultChecked !== undefined) control.checked = control.dataset.defaultChecked === "true";
      });
    }
    applyGraphOrganization(graph);
    return;
  }

  const graphEdge = event.target.closest("[data-if-graph-edge]");
  if (graphEdge) {
    event.preventDefault();
    selectGraphEdge(graphEdge);
    return;
  }

  const graphTraverse = event.target.closest("[data-if-graph-traverse]");
  if (graphTraverse) {
    event.preventDefault();
    traverseGraph(graphTraverse);
    return;
  }

  const traversalStep = event.target.closest("[data-traversal-step], [data-if-traversal-target]");
  if (traversalStep) {
    event.preventDefault();
    const explorer = traversalStep.closest("[data-if-traversal]");
    const targetId = traversalStep.dataset.ifTraversalTarget;
    const target = targetId ? qs(`[data-traversal-step="${targetId}"]`, explorer) : traversalStep;
    if (target) selectTraversalStep(target);
    return;
  }

  const graphTrace = event.target.closest("[data-if-graph-trace]");
  if (graphTrace) {
    event.preventDefault();
    traceGraphFrom(graphTrace);
    return;
  }

  const graphCanvas = event.target.closest(".if-graph-canvas");
  if (graphCanvas) {
    const graph = graphCanvas.closest("[data-if-graph]");
    if (graph?.dataset.graphSuppressClick === "true") return;
    if (!event.target.closest("button, a, input, select, textarea, .if-graph-minimap")) {
      event.preventDefault();
      resetGraphFocus(graph);
      return;
    }
  }

  const hierarchyToggle = event.target.closest("[data-if-hierarchy-toggle]");
  if (hierarchyToggle) {
    event.preventDefault();
    toggleHierarchyBranch(hierarchyToggle);
    selectHierarchyNode(hierarchyToggle);
    return;
  }

  const hierarchyNode = event.target.closest("[data-if-hierarchy-select], [data-hierarchy-node]");
  if (hierarchyNode && hierarchyNode.closest("[data-if-hierarchy]")) {
    event.preventDefault();
    selectHierarchyNode(hierarchyNode);
    return;
  }

  const diffChange = event.target.closest("[data-if-diff-change]");
  if (diffChange) {
    event.preventDefault();
    updatePolicyDiff(diffChange.closest("[data-if-policy-diff]"), diffChange);
    return;
  }

  const diffNext = event.target.closest("[data-if-diff-next]");
  if (diffNext) {
    event.preventDefault();
    movePolicyDiff(diffNext, 1);
    return;
  }

  const diffPrev = event.target.closest("[data-if-diff-prev]");
  if (diffPrev) {
    event.preventDefault();
    movePolicyDiff(diffPrev, -1);
    return;
  }

  const diffDecision = event.target.closest("[data-if-diff-decision]");
  if (diffDecision) {
    event.preventDefault();
    setPolicyDiffDecision(diffDecision);
  }

  const diagramSearchResult = event.target.closest("[data-if-diagram-search-result]");
  if (diagramSearchResult && !event.__ifDiagramSearchHandled) {
    event.preventDefault();
    const diagram = diagramSearchResult.closest("[data-if-diagram]");
    selectDiagramSearchMatch(diagram, diagramSearchResult.dataset.ifDiagramSearchResult);
    return;
  }

  const diagramSearchStep = event.target.closest("[data-if-diagram-search-step]");
  if (diagramSearchStep && !event.__ifDiagramSearchHandled) {
    event.preventDefault();
    stepDiagramSearch(diagramSearchStep, Number.parseInt(diagramSearchStep.dataset.ifDiagramSearchStep || "1", 10) || 1);
    return;
  }

  const diagramSearchClear = event.target.closest("[data-if-diagram-search-clear]");
  if (diagramSearchClear && !event.__ifDiagramSearchHandled) {
    event.preventDefault();
    clearDiagramSearchFromControl(diagramSearchClear);
    return;
  }

  const diagramReset = event.target.closest("[data-if-diagram-reset]");
  if (diagramReset) {
    event.preventDefault();
    resetDiagramFocus(diagramReset);
    return;
  }

  const diagramClearSelection = event.target.closest("[data-if-diagram-clear-selection]");
  if (diagramClearSelection) {
    event.preventDefault();
    resetDiagramFocus(diagramClearSelection);
    return;
  }

  const diagramDetailClose = event.target.closest("[data-if-diagram-detail-close]");
  if (diagramDetailClose) {
    event.preventDefault();
    resetDiagramFocus(diagramDetailClose);
    return;
  }

  const diagramLayerToggle = event.target.closest("[data-if-diagram-layer-toggle]");
  if (diagramLayerToggle) {
    event.preventDefault();
    toggleDiagramLayer(diagramLayerToggle);
    return;
  }

  const connectorRouteLabel = event.target.closest("[data-if-connector-label-node]");
  if (connectorRouteLabel && connectorRouteLabel.closest("[data-if-diagram]")) {
    event.preventDefault();
    const diagram = connectorRouteLabel.closest("[data-if-diagram]");
    if (diagram?.dataset.diagramEditing === "true" && getDiagramEditTool(diagram) === "delete") {
      deleteDiagramConnectorRoute(connectorRouteLabel);
      return;
    }
    selectDiagramConnectorRoute(connectorRouteLabel);
    return;
  }

  const diagramEditToggle = event.target.closest("[data-if-diagram-edit-toggle]");
  if (diagramEditToggle) {
    event.preventDefault();
    setDiagramEditMode(diagramEditToggle);
    return;
  }

  const diagramEditTool = event.target.closest("[data-if-diagram-edit-tool]");
  if (diagramEditTool) {
    event.preventDefault();
    setDiagramEditTool(diagramEditTool);
    return;
  }

  const diagramAddNode = event.target.closest("[data-if-diagram-add-node]");
  if (diagramAddNode) {
    event.preventDefault();
    setDiagramEditTool(diagramAddNode, "add");
    createDiagramNode(diagramAddNode);
    return;
  }

  const diagramAddFromSource = event.target.closest("[data-if-diagram-add-from-source]");
  if (diagramAddFromSource) {
    event.preventDefault();
    setDiagramEditTool(diagramAddFromSource, "add");
    createDiagramNodeFromSource(diagramAddFromSource);
    return;
  }

  const diagramDuplicateNode = event.target.closest("[data-if-diagram-duplicate-node]");
  if (diagramDuplicateNode) {
    event.preventDefault();
    duplicateDiagramItem(diagramDuplicateNode);
    return;
  }

  const diagramMoveContainer = event.target.closest("[data-if-diagram-move-container]");
  if (diagramMoveContainer) {
    event.preventDefault();
    const diagram = diagramMoveContainer.closest("[data-if-diagram]");
    const select = qs("[data-if-diagram-container-select]", diagram);
    moveDiagramItemToContainer(diagramMoveContainer, select?.value || diagram?.dataset.ifDiagramSelectedContainer);
    return;
  }

  const diagramReorder = event.target.closest("[data-if-diagram-reorder]");
  if (diagramReorder) {
    event.preventDefault();
    reorderDiagramItem(diagramReorder);
    return;
  }

  const diagramNudge = event.target.closest("[data-if-diagram-nudge]");
  if (diagramNudge) {
    event.preventDefault();
    const diagram = diagramNudge.closest("[data-if-diagram]");
    const item = getDiagramSelectedItem(diagram);
    const step = Number.parseFloat(diagramNudge.dataset.ifDiagramNudgeStep || "8") || 8;
    const direction = diagramNudge.dataset.ifDiagramNudge;
    const deltaX = direction === "right" ? step : direction === "left" ? -step : 0;
    const deltaY = direction === "down" ? step : direction === "up" ? -step : 0;
    if (item) nudgeDiagramItem(item, deltaX, deltaY);
    return;
  }

  const diagramUndoDelete = event.target.closest("[data-if-diagram-undo-delete]");
  if (diagramUndoDelete) {
    event.preventDefault();
    undoDiagramDelete(diagramUndoDelete);
    return;
  }

  const diagramDeleteSelected = event.target.closest("[data-if-diagram-delete-selected]");
  if (diagramDeleteSelected) {
    event.preventDefault();
    deleteSelectedDiagramTarget(diagramDeleteSelected);
    return;
  }

  const diagramCopySelected = event.target.closest("[data-if-diagram-copy-selected]");
  if (diagramCopySelected) {
    event.preventDefault();
    copySelectedDiagramJson(diagramCopySelected);
    return;
  }

  const diagramResetSelected = event.target.closest("[data-if-diagram-reset-selected]");
  if (diagramResetSelected) {
    event.preventDefault();
    resetSelectedDiagramTarget(diagramResetSelected);
    return;
  }

  const diagramApplySelected = event.target.closest("[data-if-diagram-apply-selected]");
  if (diagramApplySelected) {
    event.preventDefault();
    applySelectedDiagramJson(diagramApplySelected);
    return;
  }

  const diagramSourceRefresh = event.target.closest("[data-if-diagram-source-refresh]");
  if (diagramSourceRefresh) {
    event.preventDefault();
    refreshDiagramSourceEditor(diagramSourceRefresh);
    return;
  }

  const diagramSourceValidate = event.target.closest("[data-if-diagram-source-validate]");
  if (diagramSourceValidate) {
    event.preventDefault();
    validateDiagramSourceEditor(diagramSourceValidate);
    return;
  }

  const diagramSourceFormat = event.target.closest("[data-if-diagram-source-format]");
  if (diagramSourceFormat) {
    event.preventDefault();
    formatDiagramSourceEditor(diagramSourceFormat);
    return;
  }

  const diagramSourceApply = event.target.closest("[data-if-diagram-source-apply]");
  if (diagramSourceApply) {
    event.preventDefault();
    applyDiagramSourceEditor(diagramSourceApply);
    return;
  }

  const diagramSourceCopy = event.target.closest("[data-if-diagram-source-copy]");
  if (diagramSourceCopy) {
    event.preventDefault();
    copyDiagramSourceEditor(diagramSourceCopy);
    return;
  }

  const diagramSourceDownload = event.target.closest("[data-if-diagram-source-download]");
  if (diagramSourceDownload) {
    event.preventDefault();
    downloadDiagramSourceEditor(diagramSourceDownload);
    return;
  }

  const diagramRouteDelete = event.target.closest("[data-if-diagram-route-delete]");
  if (diagramRouteDelete) {
    event.preventDefault();
    const route = getDiagramSelectedRoute(diagramRouteDelete.closest("[data-if-diagram]"));
    if (route) deleteDiagramConnectorRoute(route);
    return;
  }

  const diagramLayoutSave = event.target.closest("[data-if-diagram-layout-save]");
  if (diagramLayoutSave) {
    event.preventDefault();
    saveDiagramLayout(diagramLayoutSave);
    return;
  }

  const diagramLayoutLoad = event.target.closest("[data-if-diagram-layout-load]");
  if (diagramLayoutLoad) {
    event.preventDefault();
    loadDiagramLayout(diagramLayoutLoad);
    return;
  }

  const diagramLayoutReset = event.target.closest("[data-if-diagram-layout-reset]");
  if (diagramLayoutReset) {
    event.preventDefault();
    resetDiagramLayout(diagramLayoutReset);
    return;
  }

  const diagramRouteClearWaypoint = event.target.closest("[data-if-diagram-route-clear-waypoint]");
  if (diagramRouteClearWaypoint) {
    event.preventDefault();
    const diagram = diagramRouteClearWaypoint.closest("[data-if-diagram]");
    const route = getDiagramSelectedRoute(diagram);
    if (route) {
      delete route.dataset.ifConnectorWaypoints;
      refreshConnectorRoutes(getDiagramConnectorSurface(diagram));
      selectDiagramConnectorRoute(route);
      setDiagramLayoutStatus(diagram, "Connector waypoint reset to automatic routing", "success");
      maybeAutosaveDiagramLayout(diagram);
    }
    return;
  }

  if (event.target.closest("[data-if-diagram-inline-edit]")) {
    return;
  }

  const diagramItem = event.target.closest(diagramItemSelector);
  if (diagramItem && diagramItem.closest("[data-if-diagram]")) {
    event.preventDefault();
    const diagram = diagramItem.closest("[data-if-diagram]");
    if (diagram?.dataset.diagramSuppressClick === "true") return;
    if (handleDiagramEditItemAction(diagramItem)) return;
    focusDiagramItem(diagramItem);
    return;
  }

  const focusSurface = getFocusSurface(event.target);
  if (shouldResetFocusSurfaceFromClick(focusSurface, event.target)) {
    resetFocusSurface(focusSurface);
  }
}

function handleMouseover(event) {
  const tooltipControl = event.target.closest("[data-if-tooltip]");
  if (tooltipControl) showTooltip(tooltipControl);

  const docAnnotation = event.target.closest("[data-if-doc-annotation]");
  if (docAnnotation) showDocumentAnnotationTooltip(docAnnotation);

  const chartPoint = event.target.closest("[data-if-chart-point]");
  if (chartPoint) showChartTooltip(chartPoint);

  const graphNode = event.target.closest(".if-graph-node[data-node-id]");
  if (graphNode) showGraphPeek(graphNode);
}

function handleMouseout(event) {
  const tooltipControl = event.target.closest("[data-if-tooltip]");
  if (tooltipControl && !tooltipControl.contains(event.relatedTarget)) {
    hideTooltip(tooltipControl);
  }

  const docAnnotation = event.target.closest("[data-if-doc-annotation]");
  if (docAnnotation && !docAnnotation.contains(event.relatedTarget)) {
    hideDocumentAnnotationTooltip(docAnnotation);
  }

  const chartPoint = event.target.closest("[data-if-chart-point]");
  if (chartPoint && !chartPoint.contains(event.relatedTarget)) {
    hideChartTooltip(chartPoint.closest("[data-if-chart]"));
  }

  const graphNode = event.target.closest(".if-graph-node[data-node-id]");
  if (!graphNode || graphNode.contains(event.relatedTarget)) return;
  hideGraphPeek(graphNode.closest("[data-if-graph]"));
}

function handleFocusIn(event) {
  closeAutocompletesOutsideTarget(event.target);

  const tooltipControl = event.target.closest("[data-if-tooltip]");
  if (tooltipControl) showTooltip(tooltipControl);

  const docAnnotation = event.target.closest("[data-if-doc-annotation]");
  if (docAnnotation) showDocumentAnnotationTooltip(docAnnotation);

  const chartPoint = event.target.closest("[data-if-chart-point]");
  if (chartPoint) showChartTooltip(chartPoint);

  const graphNode = event.target.closest(".if-graph-node[data-node-id]");
  if (graphNode) showGraphPeek(graphNode);
}

function handleFocusOut(event) {
  const diagramInlineEdit = event.target.closest("[data-if-diagram-inline-edit]");
  if (diagramInlineEdit) commitDiagramInlineEdit(diagramInlineEdit, { restoreFocus: false });

  const tooltipControl = event.target.closest("[data-if-tooltip]");
  if (tooltipControl) hideTooltip(tooltipControl);

  const docAnnotation = event.target.closest("[data-if-doc-annotation]");
  if (docAnnotation) hideDocumentAnnotationTooltip(docAnnotation);

  const chartPoint = event.target.closest("[data-if-chart-point]");
  if (chartPoint) hideChartTooltip(chartPoint.closest("[data-if-chart]"));

  const graphNode = event.target.closest(".if-graph-node[data-node-id]");
  if (graphNode) hideGraphPeek(graphNode.closest("[data-if-graph]"));
}

function handleInput(event) {
  const filterControl = event.target.closest("[data-if-filter]");
  if (filterControl) {
    filterItems(filterControl);
  }

  const iconCatalogFilter = event.target.closest("[data-if-icon-catalog-filter]");
  if (iconCatalogFilter) {
    filterIconCatalog(iconCatalogFilter);
  }

  const publicSearchQuery = event.target.closest("[data-if-public-search-query]");
  if (publicSearchQuery) {
    updatePublicSearch(publicSearchQuery);
  }

  const graphRelation = event.target.closest("[data-if-graph-relation], [data-if-graph-inferred]");
  if (graphRelation) {
    const shell = graphRelation.closest(".if-shell") || document;
    qsa("[data-if-graph]", shell).forEach(applyGraphFilters);
  }

  const graphOption = event.target.closest("[data-if-graph-option]");
  if (graphOption) {
    const graph = graphOption.closest("[data-if-graph]");
    applyGraphOrganization(graph);
  }

  const autocomplete = isAutocompleteInput(event.target) ? event.target : event.target.closest("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]");
  if (autocomplete) {
    if (event.__ifAutocompleteSelection) {
      closeAutocomplete(autocomplete, { cancel: false });
    } else {
      renderAutocomplete(autocomplete);
    }
  }

  const commandInput = event.target.closest("[data-if-command-input]");
  if (commandInput) {
    filterCommandPalette(commandInput);
  }

  const editableCell = event.target.closest("[data-if-editable-cell]");
  if (editableCell) {
    markEditableGridCell(editableCell);
  }

  const chartThreshold = event.target.closest("[data-if-chart-threshold]");
  if (chartThreshold) {
    setChartThreshold(chartThreshold);
  }

  const chartHeight = event.target.closest("[data-if-chart-height]");
  if (chartHeight) {
    setChartHeight(chartHeight);
  }

  const controlVar = event.target.closest("[data-if-control-var]");
  if (controlVar) {
    setControlVariable(controlVar);
  }

  const componentInventoryFilter = event.target.closest("[data-if-component-inventory-filter]");
  if (componentInventoryFilter) {
    applyComponentInventoryFilters(componentInventoryFilter);
  }

  const diagramVar = event.target.closest("[data-if-diagram-var]");
  if (diagramVar) {
    setDiagramVariable(diagramVar);
  }

  const diagramSearch = event.target.closest("[data-if-diagram-search]");
  if (diagramSearch && !event.__ifDiagramSearchHandled) {
    updateDiagramSearch(diagramSearch);
  }

  const diagramInlineEdit = event.target.closest("[data-if-diagram-inline-edit]");
  if (diagramInlineEdit) {
    updateDiagramInlineEdit(diagramInlineEdit);
  }

  const diagramEditField = event.target.closest("[data-if-diagram-edit-field]");
  if (diagramEditField) {
    updateDiagramItemField(diagramEditField);
  }

  const diagramSource = event.target.closest("[data-if-diagram-source]");
  if (diagramSource) {
    markDiagramSourceEdited(diagramSource);
  }

  const diagramRouteEditInput = event.target.closest("[data-if-diagram-route-label], [data-if-diagram-route-waypoint-x], [data-if-diagram-route-waypoint-y]");
  if (diagramRouteEditInput && getDiagramSelectedRoute(diagramRouteEditInput.closest("[data-if-diagram]"))) {
    updateSelectedDiagramRoute(diagramRouteEditInput);
  }

  const tableFilter = event.target.closest("[data-if-table-filter]");
  if (tableFilter) {
    filterDataTable(tableFilter);
  }

  const tableColumnFilter = event.target.closest("[data-if-table-column-filter]");
  if (tableColumnFilter) {
    const table = getDataTable(tableColumnFilter);
    if (table) {
      table.dataset.ifTablePage = "1";
      if (isServerDataTable(table)) requestDataTableAdapter(table);
      else applyDataTable(table);
    }
  }

  const docSearch = event.target.closest("[data-if-doc-search]");
  if (docSearch) {
    updateDocumentSearch(docSearch.closest("[data-if-doc-viewer]"));
  }

  const validationControl = event.target.closest("[data-if-validate], .if-field[data-if-validate] input, .if-field[data-if-validate] select, .if-field[data-if-validate] textarea");
  if (validationControl && event.target.matches("input, select, textarea")) {
    validateField(event.target);
    const form = event.target.closest("[data-if-form]");
    if (form && form.dataset.ifFormLiveSummary === "true") validateForm(form, { focus: false });
  }
}

function handleChange(event) {
  const diagramSourceImport = event.target.closest("[data-if-diagram-source-import]");
  if (diagramSourceImport) {
    importDiagramSourceFile(diagramSourceImport);
    return;
  }

  const themeControl = event.target.closest("[data-if-theme-control]");
  if (themeControl) {
    const theme = themeControl.dataset.ifTheme || themeControl.value;
    setTheme(theme, { target: getThemeTarget(themeControl) });
  }

  const componentInventoryControl = event.target.closest("[data-if-component-inventory-category], [data-if-component-inventory-capability], [data-if-component-inventory-status], [data-if-component-inventory-risk], [data-if-component-inventory-sort]");
  if (componentInventoryControl) {
    applyComponentInventoryFilters(componentInventoryControl);
  }

  const diagramStyleTone = event.target.closest("[data-if-diagram-style-tone]");
  if (diagramStyleTone) {
    setSelectedDiagramItemTone(diagramStyleTone);
  }

  const diagramNodeType = event.target.closest("[data-if-diagram-node-type]");
  if (diagramNodeType) {
    setSelectedDiagramItemType(diagramNodeType);
  }

  const diagramNodeLayout = event.target.closest("[data-if-diagram-node-layout]");
  if (diagramNodeLayout) {
    setSelectedDiagramItemLayout(diagramNodeLayout);
  }

  const diagramNodeBackground = event.target.closest("[data-if-diagram-node-background]");
  if (diagramNodeBackground) {
    setSelectedDiagramItemBackground(diagramNodeBackground);
  }

  const diagramNodeIcon = event.target.closest("[data-if-diagram-node-icon]");
  if (diagramNodeIcon) {
    setSelectedDiagramItemIcon(diagramNodeIcon);
  }

  const diagramContainerSelect = event.target.closest("[data-if-diagram-container-select]");
  if (diagramContainerSelect) {
    setDiagramSelectedContainer(diagramContainerSelect);
  }

  const diagramRouteEdit = event.target.closest("[data-if-diagram-route-style], [data-if-diagram-route-tone], [data-if-diagram-route-from-anchor], [data-if-diagram-route-to-anchor], [data-if-diagram-route-avoid]");
  if (diagramRouteEdit && getDiagramSelectedRoute(diagramRouteEdit.closest("[data-if-diagram]"))) {
    updateSelectedDiagramRoute(diagramRouteEdit);
  }

  const validationControl = event.target.closest("[data-if-validate], .if-field[data-if-validate] input, .if-field[data-if-validate] select, .if-field[data-if-validate] textarea");
  if (validationControl && event.target.matches("input, select, textarea")) {
    validateField(event.target);
    const form = event.target.closest("[data-if-form]");
    if (form && form.dataset.ifFormLiveSummary === "true") validateForm(form, { focus: false });
  }

  const dropzoneInput = event.target.closest("[data-if-dropzone-input]");
  if (dropzoneInput) {
    renderDropzoneFiles(dropzoneInput.closest("[data-if-dropzone]"), dropzoneInput.files || []);
  }

  const editableCell = event.target.closest("[data-if-editable-cell]");
  if (editableCell) {
    markEditableGridCell(editableCell);
  }

  const dateNative = event.target.closest("[data-if-date-native]");
  if (dateNative) {
    setDatePickerValue(dateNative.closest("[data-if-date-picker]"), dateNative.value);
  }

  const tableSelect = event.target.closest("[data-if-table-select], [data-if-table-select-all]");
  if (tableSelect) {
    updateDataTableSelection(tableSelect);
  }

  const tablePageSize = event.target.closest("[data-if-table-page-size]");
  if (tablePageSize) {
    setDataTablePageSize(tablePageSize);
  }

  const tableColumnFilter = event.target.closest("[data-if-table-column-filter]");
  if (tableColumnFilter) {
    const table = getDataTable(tableColumnFilter);
    if (table) {
      table.dataset.ifTablePage = "1";
      if (isServerDataTable(table)) requestDataTableAdapter(table);
      else applyDataTable(table);
    }
  }

  const docHighlight = event.target.closest("[data-if-doc-highlight]");
  if (docHighlight) {
    updateDocumentHighlight(docHighlight);
  }

  const graphRelation = event.target.closest("[data-if-graph-relation], [data-if-graph-inferred]");
  if (graphRelation) {
    const shell = graphRelation.closest(".if-shell") || document;
    qsa("[data-if-graph]", shell).forEach(applyGraphFilters);
  }
}

function handleSubmit(event) {
  const form = event.target.closest?.("[data-if-form], form");
  if (!form || !getValidatedControls(form).length) return;
  const valid = validateForm(form, { focus: true });
  const prevent = form.matches("[data-if-form]") || form.dataset.ifFormPreventSubmit === "true" || !form.getAttribute("action");
  if (!valid || prevent) event.preventDefault();
  if (valid) showToast(form.dataset.ifFormSuccess || "Validation checks passed", "check");
}

function getWheelDeltaPixels(event) {
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
  return {
    x: event.deltaX * scale,
    y: event.deltaY * scale
  };
}

function handleDiagramSourceWheel(event) {
  const source = event.target.closest?.("[data-if-diagram-source]");
  if (!source || document.activeElement === source) return false;
  const delta = getWheelDeltaPixels(event);
  if (!delta.x && !delta.y) return false;
  const scrollRoot = document.scrollingElement || document.documentElement;
  if (!scrollRoot) return false;
  event.preventDefault();
  scrollRoot.scrollBy({ left: delta.x, top: delta.y, behavior: "auto" });
  return true;
}

function handleDiagramPageWheel(event) {
  if (event.ctrlKey || event.metaKey) return false;
  const diagram = event.target.closest?.("[data-if-diagram]");
  if (!diagram) return false;
  if (event.target.closest?.("[data-if-diagram-detail], .if-diagram-search-results")) return false;
  const focusedScrollableControl = event.target.closest?.("textarea, select, input[type='range'], input[type='number'], [contenteditable='true']");
  if (focusedScrollableControl && document.activeElement === focusedScrollableControl) return false;
  const delta = getWheelDeltaPixels(event);
  if (Math.abs(delta.y) < 1 || Math.abs(delta.x) > Math.abs(delta.y)) return false;
  const scrollRoot = document.scrollingElement || document.documentElement;
  const currentTop = scrollRoot?.scrollTop ?? window.scrollY;
  const maxTop = Math.max(0, (scrollRoot?.scrollHeight || document.documentElement.scrollHeight) - window.innerHeight);
  if ((delta.y < 0 && currentTop <= 0) || (delta.y > 0 && currentTop >= maxTop)) return false;
  event.preventDefault();
  window.scrollBy({ top: delta.y, left: 0, behavior: "auto" });
  return true;
}

function canElementScrollVertically(element, deltaY) {
  if (!element || element === document.body || element === document.documentElement) return false;
  const style = getComputedStyle(element);
  if (!/(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`)) return false;
  const maxTop = element.scrollHeight - element.clientHeight;
  if (maxTop <= 1) return false;
  return deltaY < 0 ? element.scrollTop > 0 : element.scrollTop < maxTop - 1;
}

function hasScrollableWheelTarget(target, deltaY) {
  for (let element = target; element && element !== document; element = element.parentElement) {
    if (canElementScrollVertically(element, deltaY)) return true;
  }
  return false;
}

function handleLibraryPageWheel(event) {
  if (event.ctrlKey || event.metaKey || event.defaultPrevented) return false;
  const shell = event.target.closest?.(".if-shell--library");
  if (!shell) return false;
  if (event.target.closest?.("textarea, select, input[type='range'], input[type='number'], [contenteditable='true'], [data-if-diagram-source], .if-graph-canvas, .if-erd-canvas")) return false;
  const delta = getWheelDeltaPixels(event);
  if (Math.abs(delta.y) < 1 || Math.abs(delta.x) > Math.abs(delta.y)) return false;
  if (hasScrollableWheelTarget(event.target, delta.y)) return false;
  const scrollRoot = document.scrollingElement || document.documentElement;
  const currentTop = scrollRoot?.scrollTop ?? window.scrollY;
  const maxTop = Math.max(0, (scrollRoot?.scrollHeight || document.documentElement.scrollHeight) - window.innerHeight);
  if ((delta.y < 0 && currentTop <= 0) || (delta.y > 0 && currentTop >= maxTop)) return false;
  event.preventDefault();
  window.scrollBy({ top: delta.y, left: 0, behavior: "auto" });
  return true;
}

function handleWheel(event) {
  if (handleDiagramSourceWheel(event)) return;
  if (handleDiagramPageWheel(event)) return;
  const erdCanvas = event.target.closest?.(".if-erd-canvas");
  if (erdCanvas) {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      zoomErdCanvas(erdCanvas, factor, { x: event.clientX, y: event.clientY });
      return;
    }
    return;
  }
  const canvas = event.target.closest?.(".if-graph-canvas");
  if (!canvas) {
    handleLibraryPageWheel(event);
    return;
  }
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
  zoomGraphCanvas(canvas, factor, { x: event.clientX, y: event.clientY });
}

function getOpenAutocompleteInput() {
  return qsa("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]").find((input) => {
    const menu = getAutocompleteMenu(input);
    return menu && !menu.hidden;
  });
}

function getOpenMenuTrigger() {
  const triggers = qsa("[data-if-menu-toggle][aria-expanded='true']");
  return triggers[triggers.length - 1] || null;
}

function getOpenPopoverTrigger() {
  const triggers = qsa("[data-if-popover-toggle][aria-expanded='true']");
  return triggers[triggers.length - 1] || null;
}

function getOpenDrawer() {
  const drawers = qsa(".if-drawer.is-open");
  return drawers[drawers.length - 1] || null;
}

function closeTopEscapeLayer(event) {
  if (isTooltipVisible()) {
    hideTooltip();
    event?.preventDefault?.();
    return true;
  }

  const graphContextMenu = getOpenGraphContextMenu();
  if (graphContextMenu) {
    hideGraphContextMenu(graphContextMenu.closest("[data-if-graph]"));
    event?.preventDefault?.();
    return true;
  }

  const autocomplete = getOpenAutocompleteInput();
  if (autocomplete) {
    closeAutocomplete(autocomplete);
    event?.preventDefault?.();
    return true;
  }

  const commandPalette = getOpenCommandPalette();
  if (commandPalette) {
    closeCommandPalette(commandPalette, { restoreFocus: true });
    event?.preventDefault?.();
    return true;
  }

  const openMenuTrigger = getOpenMenuTrigger();
  if (openMenuTrigger) {
    closeMenu(openMenuTrigger, { restoreFocus: true });
    event?.preventDefault?.();
    return true;
  }

  const openPopoverTrigger = getOpenPopoverTrigger();
  if (openPopoverTrigger) {
    closePopover(openPopoverTrigger);
    openPopoverTrigger.focus?.();
    event?.preventDefault?.();
    return true;
  }

  if (activeModal) {
    closeModal(activeModal);
    event?.preventDefault?.();
    return true;
  }

  const openDrawer = getOpenDrawer();
  if (openDrawer) {
    closeDrawer(openDrawer);
    event?.preventDefault?.();
    return true;
  }

  return false;
}

function handleKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    const palette = getCommandPalette();
    if (palette) {
      event.preventDefault();
      openCommandPalette(palette);
      return;
    }
  }

  if (event.key === "Escape" && closeTopEscapeLayer(event)) return;

  const diagramSearch = event.target.closest("[data-if-diagram-search]");
  if (diagramSearch && event.key === "Escape" && diagramSearch.value && !event.__ifDiagramSearchHandled) {
    event.preventDefault();
    diagramSearch.value = "";
    clearDiagramSearchFromControl(diagramSearch);
    return;
  }

  const commandPalette = event.target.closest("[data-if-command-palette]");
  if (commandPalette && ["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(event.key)) {
    const items = getCommandItems(commandPalette);
    const active = qs("[data-if-command-item].is-active", commandPalette) || items[0];
    const currentIndex = Math.max(0, items.indexOf(active));
    if (!items.length) return;
    event.preventDefault();
    if (event.key === "ArrowDown") setCommandActiveItem(commandPalette, currentIndex + 1);
    if (event.key === "ArrowUp") setCommandActiveItem(commandPalette, currentIndex - 1);
    if (event.key === "Home") setCommandActiveItem(commandPalette, 0);
    if (event.key === "End") setCommandActiveItem(commandPalette, items.length - 1);
    if (event.key === "Enter") runCommandPaletteItem(qs("[data-if-command-item].is-active", commandPalette) || items[0]);
    return;
  }

  const menuToggle = event.target.closest("[data-if-menu-toggle]");
  if (menuToggle && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    openMenu(menuToggle, { focus: event.key === "ArrowUp" || event.key === "End" ? "last" : "selected" });
    return;
  }

  const activeMenu = event.target.closest("[data-if-menu]");
  if (activeMenu && ["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape", "Tab"].includes(event.key)) {
    const items = getMenuItems(activeMenu);
    const currentIndex = Math.max(0, items.indexOf(event.target.closest("[data-if-menu-item], [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox']")));
    const trigger = getMenuTrigger(activeMenu);

    if (event.key === "Tab") {
      if (trigger) closeMenu(trigger);
      return;
    }

    event.preventDefault();
    if (event.key === "ArrowDown") focusMenuItem(activeMenu, currentIndex + 1);
    if (event.key === "ArrowUp") focusMenuItem(activeMenu, currentIndex - 1);
    if (event.key === "Home") focusMenuItem(activeMenu, 0);
    if (event.key === "End") focusMenuItem(activeMenu, items.length - 1);
    if ((event.key === "Enter" || event.key === " ") && items[currentIndex]) items[currentIndex].click();
    if (event.key === "Escape" && trigger) closeMenu(trigger, { restoreFocus: true });
    return;
  }

  if (event.key === "Tab" && activeModal) {
    const focusable = qsa(focusableSelector, activeModal);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const currentTab = event.target.closest("[role='tab']");
  if (currentTab && currentTab.closest("[data-if-tabs]") && ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    const tabs = qsa("[role='tab']", currentTab.closest("[data-if-tabs]"));
    const index = tabs.indexOf(currentTab);
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    tabs[nextIndex].focus();
    activateTab(tabs[nextIndex]);
  }

  const claimTracker = event.target.closest("[data-if-claims]");
  if (claimTracker && handleClaimTrackerKeydown(event, claimTracker)) return;

  const autocomplete = isAutocompleteInput(event.target) ? event.target : event.target.closest("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]");
  if (autocomplete && ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) {
    const menu = getAutocompleteMenu(autocomplete);
    const active = menu ? qs(".if-autocomplete__option.is-active", menu) : null;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveAutocomplete(autocomplete, 1);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveAutocomplete(autocomplete, -1);
    }
    if (event.key === "Enter" && active && menu && !menu.hidden) {
      event.preventDefault();
      selectAutocompleteOption(active);
    }
    if (event.key === "Escape") {
      closeAutocomplete(autocomplete);
    }
  }

  const reviewWorkflow = event.target.closest("[data-if-review-workflow]");
  if (reviewWorkflow && handleReviewWorkflowKeydown(event, reviewWorkflow)) return;

  const annotationToolbar = event.target.closest("[data-if-annotation-toolbar]");
  if (annotationToolbar && handleAnnotationToolbarKeydown(event, annotationToolbar)) return;

  const componentInventoryCard = event.target.closest("[data-if-inventory-id]");
  if (componentInventoryCard && handleComponentInventoryKeydown(event, componentInventoryCard)) return;

  const operationsSignal = event.target.closest("[data-if-operations-signal]");
  if (operationsSignal && handleOperationsSignalKeydown(event, operationsSignal)) return;

  const chartPoint = event.target.closest("[data-if-chart-point]");
  if (chartPoint && chartPoint.closest("[data-if-chart]") && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    selectChartPoint(chartPoint, { focus: true });
    return;
  }

  const wizard = event.target.closest("[data-if-wizard]");
  if (wizard && handleWizardKeydown(event, wizard)) return;

  const policyDiff = event.target.closest("[data-if-policy-diff]");
  if (policyDiff && handlePolicyDiffKeydown(event, policyDiff)) return;

  const docAnnotation = event.target.closest("[data-if-doc-annotation]");
  if (docAnnotation && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    inspectDocumentAnnotation(docAnnotation);
  }

  const erdNode = event.target.closest("[data-erd-node]");
  if (erdNode && erdNode.closest("[data-if-erd]") && ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) {
    const erd = erdNode.closest("[data-if-erd]");
    if (getErdMode(erd) === "arrange") {
      event.preventDefault();
      const amount = event.shiftKey ? 3 : 1;
      const dx = event.key === "ArrowRight" ? amount : event.key === "ArrowLeft" ? -amount : 0;
      const dy = event.key === "ArrowDown" ? amount : event.key === "ArrowUp" ? -amount : 0;
      nudgeErdNode(erdNode, dx, dy);
    }
  }

  const graphMinimap = event.target.closest(".if-graph-minimap");
  if (graphMinimap && ["Enter", " ", "Home", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) {
    const canvas = graphMinimap.closest(".if-graph-canvas");
    if (canvas) {
      event.preventDefault();
      const view = getGraphView(canvas);
      const step = event.shiftKey ? 64 : 32;
      if (event.key === "Home" || event.key === "Enter" || event.key === " ") {
        resetGraphView(canvas);
      } else {
        applyGraphView(canvas, {
          zoom: view.zoom,
          panX: view.panX + (event.key === "ArrowRight" ? -step : event.key === "ArrowLeft" ? step : 0),
          panY: view.panY + (event.key === "ArrowDown" ? -step : event.key === "ArrowUp" ? step : 0)
        });
      }
      canvas.dispatchEvent(new CustomEvent("if:graph-viewport", {
        bubbles: true,
        detail: getGraphView(canvas)
      }));
    }
  }

  const erdMinimap = event.target.closest(".if-erd-minimap");
  if (erdMinimap && ["Enter", " ", "Home", "ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) {
    const canvas = erdMinimap.closest(".if-erd-canvas");
    if (canvas) {
      event.preventDefault();
      const view = getErdView(canvas);
      const step = event.shiftKey ? 96 : 48;
      if (event.key === "Home" || event.key === "Enter" || event.key === " ") {
        fitErdView(canvas);
      } else {
        applyErdView(canvas, {
          zoom: view.zoom,
          panX: view.panX + (event.key === "ArrowRight" ? -step : event.key === "ArrowLeft" ? step : 0),
          panY: view.panY + (event.key === "ArrowDown" ? -step : event.key === "ArrowUp" ? step : 0)
        });
      }
      canvas.dispatchEvent(new CustomEvent("if:erd-viewport", {
        bubbles: true,
        detail: getErdView(canvas)
      }));
    }
  }

  if (event.key === "Escape") {
    closePopovers();
    qsa("[data-if-focus-surface][data-if-focus-active='true'], [data-if-graph][data-if-focus-active='true'], [data-if-diagram][data-if-focus-active='true'], [data-if-diagram][data-diagram-focus='true']").forEach(resetFocusSurface);
  }

  const dateButton = event.target.closest("[data-if-date-select]");
  if (dateButton && dateButton.closest("[data-if-date-picker]") && ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
    event.preventDefault();
    const picker = dateButton.closest("[data-if-date-picker]");
    const current = normalizeIsoDate(dateButton.dataset.ifDateSelect) || getDatePickerSelectedValue(picker);
    const offsets = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 };
    if (event.key in offsets) setDatePickerValue(picker, offsetIsoDate(current, offsets[event.key]), { render: true });
    if (event.key === "Home" || event.key === "End") {
      const monthDate = getDatePickerMonthDate(picker);
      const target = new Date(monthDate.getFullYear(), monthDate.getMonth() + (event.key === "End" ? 1 : 0), event.key === "End" ? 0 : 1);
      setDatePickerValue(picker, normalizeIsoDate(`${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`), { render: true });
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      const target = new Date(`${current}T00:00:00`);
      target.setMonth(target.getMonth() + (event.key === "PageUp" ? -1 : 1));
      setDatePickerValue(picker, normalizeIsoDate(`${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`), { render: true });
    }
    qs(`[data-if-date-select="${getDatePickerSelectedValue(picker)}"]`, picker)?.focus?.({ preventScroll: true });
  }

  const hierarchyRow = event.target.closest("[data-hierarchy-node]");
  if (hierarchyRow && hierarchyRow.closest("[data-if-hierarchy]") && ["Enter", " ", "ArrowRight", "ArrowLeft"].includes(event.key)) {
    const toggle = qs("[data-if-hierarchy-toggle]", hierarchyRow);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectHierarchyNode(hierarchyRow);
    }
    if (event.key === "ArrowRight" && toggle?.getAttribute("aria-expanded") === "false") {
      event.preventDefault();
      toggleHierarchyBranch(toggle);
    }
    if (event.key === "ArrowLeft" && toggle?.getAttribute("aria-expanded") === "true") {
      event.preventDefault();
      toggleHierarchyBranch(toggle);
    }
  }

  const connectorRouteLabel = event.target.closest("[data-if-connector-label-node]");
  if (connectorRouteLabel && connectorRouteLabel.closest("[data-if-diagram]")) {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      selectDiagramConnectorRoute(connectorRouteLabel);
    }
    if (["Delete", "Backspace"].includes(event.key)) {
      const diagram = connectorRouteLabel.closest("[data-if-diagram]");
      if (diagram?.dataset.diagramEditing === "true") {
        event.preventDefault();
        deleteDiagramConnectorRoute(connectorRouteLabel);
      }
    }
  }

  const diagramInlineEdit = event.target.closest("[data-if-diagram-inline-edit]");
  if (diagramInlineEdit) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commitDiagramInlineEdit(diagramInlineEdit);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      commitDiagramInlineEdit(diagramInlineEdit);
    }
    return;
  }

  const diagramItem = event.target.closest(diagramItemSelector);
  if (diagramItem && diagramItem.closest("[data-if-diagram]")) {
    const diagram = diagramItem.closest("[data-if-diagram]");
    if (
      diagram?.dataset.diagramEditing === "true"
      && getDiagramEditTool(diagram) === "move"
      && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)
    ) {
      event.preventDefault();
      const amount = event.shiftKey ? 24 : 8;
      const deltaX = event.key === "ArrowRight" ? amount : event.key === "ArrowLeft" ? -amount : 0;
      const deltaY = event.key === "ArrowDown" ? amount : event.key === "ArrowUp" ? -amount : 0;
      nudgeDiagramItem(diagramItem, deltaX, deltaY);
      return;
    }
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (handleDiagramEditItemAction(diagramItem)) return;
      focusDiagramItem(diagramItem);
    }
    if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Home") {
        const first = getVisibleDiagramItems(diagramItem.closest("[data-if-diagram]"))[0];
        if (first) {
          first.focus?.({ preventScroll: true });
          focusDiagramItem(first);
        }
      } else if (event.key === "End") {
        const items = getVisibleDiagramItems(diagramItem.closest("[data-if-diagram]"));
        const last = items[items.length - 1];
        if (last) {
          last.focus?.({ preventScroll: true });
          focusDiagramItem(last);
        }
      } else {
        focusAdjacentDiagramItem(diagramItem, ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1);
      }
    }
  }
}

function hydrateTabs(root) {
  const tabsets = root?.matches?.("[data-if-tabs]") ? [root, ...qsa("[data-if-tabs]", root)] : qsa("[data-if-tabs]", root);
  tabsets.forEach((tabset) => {
    const config = tabset.dataset.ifTabsRendered === "true" ? null : getTabsConfig(tabset);
    if (config) {
      renderTabs(tabset, config);
      return;
    }
    const active = qs("[role='tab'][aria-selected='true']", tabset) || qs("[role='tab']", tabset);
    if (active) activateTab(active, { emit: false });
  });
}

function hydrateAccordions(root) {
  const accordions = root?.matches?.("[data-if-accordion-source], [data-if-accordion-json]") ? [root, ...qsa("[data-if-accordion-source], [data-if-accordion-json]", root)] : qsa("[data-if-accordion-source], [data-if-accordion-json]", root);
  accordions.forEach((accordion) => {
    const config = accordion.dataset.ifAccordionRendered === "true" ? null : getAccordionConfig(accordion);
    if (config) renderAccordion(accordion, config);
  });
  const triggers = root?.matches?.("[data-if-accordion-trigger], [data-if-accordion]") ? [root, ...qsa("[data-if-accordion-trigger], [data-if-accordion]", root)] : qsa("[data-if-accordion-trigger], [data-if-accordion]", root);
  triggers.forEach((trigger) => {
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    const target = getTarget(trigger) || trigger.closest(".if-accordion__item")?.querySelector(".if-accordion__panel");
    if (target) target.hidden = !expanded;
  });
}

function hydrateModals(root) {
  qsa(".if-modal", root).forEach((modal) => {
    if (!modal.hasAttribute("aria-hidden")) modal.setAttribute("aria-hidden", "true");
  });
  qsa(".if-drawer", root).forEach((drawer) => {
    if (!drawer.hasAttribute("aria-hidden")) drawer.setAttribute("aria-hidden", "true");
  });
}

function registerCoreBehaviorModules() {
  if (coreBehaviorModulesRegistered) return getBehaviorModules();
  coreBehaviorModulesRegistered = true;

  registerBehaviorModule({
    name: "themes",
    description: "Theme controls, theme labels, and persisted theme state.",
    selectors: ["[data-if-theme]", "[data-if-theme-control]", "[data-if-theme-label]"],
    init: (root) => hydrateThemeControls(root)
  });

  registerBehaviorModule({
    name: "accessibility-contracts",
    description: "Default accessible-name hydration for framework field, slider, table, and search controls.",
    selectors: ["input", "select", "textarea"],
    order: -900,
    init: (root) => hydrateAccessibilityContracts(root)
  });

  registerBehaviorModule({
    name: "icons",
    description: "Inline SVG icon slots and generated icon catalogs.",
    selectors: ["[data-if-icon]", "[data-if-icon-catalog]"],
    init: (root) => {
      hydrateIcons(root);
      hydrateIconCatalog(root);
    }
  });

  registerBehaviorModule({
    name: "assets",
    description: "Image asset slots for SVG, PNG, JPG, WebP, AVIF, GIF, and data URI marks used in diagrams and dense cards.",
    selectors: ["[data-if-asset]"],
    init: (root) => hydrateAssets(root)
  });

  registerBehaviorModule({
    name: "visualization",
    description: "Sparklines, charts, chart sliders, and live chart controls.",
    selectors: ["[data-if-sparkline]", "[data-if-chart]", "[data-if-chart-threshold]", "[data-if-chart-height]"],
    init: (root) => {
      hydrateSparklines(root);
      hydrateCharts(root);
      qsa("[data-if-chart-threshold]", root).forEach(setChartThreshold);
      qsa("[data-if-chart-height]", root).forEach(setChartHeight);
    },
    destroy: (root) => {
      qsa("[data-if-sparkline]", root).forEach(stopSparklineStream);
    }
  });

  registerBehaviorModule({
    name: "keyboard",
    description: "Rendered keyboard model documentation and shared keyboard contracts.",
    selectors: ["[data-if-keyboard-model]"],
    init: (root) => hydrateKeyboardModel(root)
  });

  registerBehaviorModule({
    name: "navigation",
    description: "Route-aware navigation, section navigation, tabs, accordions, drawers, and modals.",
    selectors: ["[data-if-section-nav]", "[data-if-route-nav]", "[data-if-tabs]", "[data-if-accordion-trigger]", ".if-modal", ".if-drawer"],
    init: (root) => {
      hydrateSectionNav(root);
      hydrateRouteNavigation(root);
      hydrateTabs(root);
      hydrateAccordions(root);
      hydrateModals(root);
    }
  });

  registerBehaviorModule({
    name: "overlays",
    description: "Autocomplete, menus, popovers, tooltips, and escape-stack cleanup.",
    selectors: ["[data-if-autocomplete]", "[data-if-autocomplete-remote]", "[data-if-autocomplete-mock]", "[data-if-menu]", "[data-if-menu-toggle]", "[data-if-popover-toggle]", "[data-if-tooltip]"],
    init: (root) => {
      hydrateAutocompleteInputs(root);
      qsa("[data-if-menu]", root).forEach((menu) => {
        if (!menu.hasAttribute("role")) menu.setAttribute("role", "menu");
        getMenuItems(menu).forEach((item) => {
          if (!item.hasAttribute("role")) item.setAttribute("role", item.dataset.ifMenuItem ? "menuitemradio" : "menuitem");
          if (item.dataset.ifMenuItem) item.setAttribute("aria-checked", String(item.classList.contains("is-selected")));
        });
        syncMenuFocus(menu);
      });
      qsa("[data-if-menu-toggle]", root).forEach((trigger) => {
        if (!trigger.hasAttribute("aria-expanded")) trigger.setAttribute("aria-expanded", "false");
        if (!trigger.hasAttribute("aria-haspopup")) trigger.setAttribute("aria-haspopup", "menu");
        const target = getTarget(trigger, "ifMenuToggle");
        if (target?.id && !trigger.hasAttribute("aria-controls")) trigger.setAttribute("aria-controls", target.id);
        if (target && trigger.getAttribute("aria-expanded") !== "true") target.hidden = true;
      });
      qsa("[data-if-popover-toggle]", root).forEach((trigger) => {
        if (!trigger.hasAttribute("aria-expanded")) trigger.setAttribute("aria-expanded", "false");
        const target = getTarget(trigger, "ifPopoverToggle");
        if (target && trigger.getAttribute("aria-expanded") !== "true") target.hidden = true;
      });
    },
    destroy: (root) => {
      qsa("[data-if-autocomplete], [data-if-autocomplete-remote], [data-if-autocomplete-mock]", root).forEach(closeAutocomplete);
      hideTooltip();
      closePopovers();
      closeMenus();
    }
  });

  registerBehaviorModule({
    name: "public-site",
    description: "Public website search, writing index filters, and editorial discovery surfaces.",
    selectors: ["[data-if-public-search]", ".if-public-search"],
    init: (root) => hydratePublicSearches(root)
  });

  registerBehaviorModule({
    name: "forms",
    description: "Validation states, help text contracts, feedback, and form summaries.",
    selectors: ["[data-if-form]", "[data-if-validate]", ".if-field"],
    init: (root) => {
      qsa("[data-if-validate], .if-field", root).forEach(ensureFieldContract);
      qsa("[data-if-form][data-if-validate-on-init='true']", root).forEach((form) => validateForm(form, { focus: false }));
      qsa("[data-if-validate][data-if-validate-on-init='true'], .if-field[data-if-validate][data-if-validate-on-init='true'] input, .if-field[data-if-validate][data-if-validate-on-init='true'] select, .if-field[data-if-validate][data-if-validate-on-init='true'] textarea", root).forEach(validateField);
    }
  });

  registerBehaviorModule({
    name: "coverage-components",
    description: "Upload/dropzone, command palette, editable grid, date picker, wizard, annotation toolbar, and state variants.",
    selectors: ["[data-if-dropzone]", "[data-if-command-palette]", "[data-if-editable-grid]", "[data-if-date-picker]", "[data-if-wizard]", "[data-if-annotation-toolbar]", "[data-if-state-preview]"],
    init: (root) => hydrateCoverageComponents(root),
    destroy: (root) => destroyCoverageComponents(root)
  });

  registerBehaviorModule({
    name: "configuration",
    description: "Token sliders, component state demos, inventory readiness filters, collapsible cards/panels, and surface expand/collapse controls.",
    selectors: ["[data-if-config-demo]", "[data-if-control-var]", "[data-if-demo-state]", "[data-if-component-inventory]", "[data-if-component-inventory-filter]", "[data-if-collapsible]", "[data-if-collapsible-toggle]", "[data-if-surface-expand]"],
    init: (root) => {
      hydrateConfigurationControls(root);
      hydrateComponentInventories(root);
      hydrateCollapsibleSurfaces(root);
    }
  });

  registerBehaviorModule({
    name: "operations-workspace",
    description: "Generic analytics workspace signals, balanced widget grids, drilldown panels, record detail posture, and table preference clusters.",
    selectors: ["[data-if-operations-workspace]", "[data-if-operations-signal]", "[data-if-operations-panel]", "[data-if-balanced-grid]"],
    init: (root) => {
      hydrateOperationsWorkspaces(root);
      hydrateBalancedGrids(root);
    },
    destroy: (root) => destroyBalancedGrids(root)
  });

  registerBehaviorModule({
    name: "performance",
    description: "Synthetic scale labs, performance budgets, and overflow checks for large table, graph, diagram, document, and chart surfaces.",
    selectors: ["[data-if-performance-lab]", "[data-if-overflow-check]"],
    init: (root) => hydratePerformanceLabs(root)
  });

  registerBehaviorModule({
    name: "diagrams",
    description: "Architecture diagram details, connector routing, search highlighting, edit-mode layout snapshots, and diagram CSS variable controls.",
    selectors: ["[data-if-diagram]", "[data-if-diagram-var]", "[data-if-diagram-search]", "[data-if-diagram-edit-toggle]", "[data-if-diagram-edit-tool]", "[data-if-diagram-node-type]", "[data-if-diagram-layout-save]", "[data-if-diagram-source]", "[data-if-connector-routing]"],
    init: (root) => {
      hydrateAssets(root);
      qsa("[data-if-diagram-var]", root).forEach(setDiagramVariable);
      qsa("[data-if-diagram-search]", root).forEach((input) => {
        bindDiagramSearchInput(input);
        updateDiagramSearch(input);
      });
      qsa("[data-if-diagram-edit-toggle]", root).forEach(bindDiagramEditToggle);
      qsa("[data-if-diagram]", root).forEach((diagram) => {
        ensureDiagramLayoutIds(diagram);
        ensureDiagramContainerIds(diagram);
        applyDiagramNodeTypes(diagram);
        syncDiagramContainerControls(diagram);
        bindDiagramSearchControls(diagram);
        qsa(diagramItemSelector, diagram).forEach((item) => {
          if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "0");
          if (!item.hasAttribute("role")) item.setAttribute("role", "button");
          if (!item.hasAttribute("aria-pressed")) item.setAttribute("aria-pressed", "false");
          if (!item.hasAttribute("aria-selected")) item.setAttribute("aria-selected", "false");
        });
        if (!diagram.__ifDiagramBaseline) diagram.__ifDiagramBaseline = collectDiagramLayoutSnapshot(diagram);
        if (shouldRestoreDiagramLayoutOnInit(diagram)) loadDiagramLayout(diagram);
        syncDiagramEditor(diagram);
        syncDiagramSourceEditor(diagram);
        updateDiagramStats(diagram);
      });
      hydrateConnectorRoutes(root);
      ensureFocusSurfaceCloseControls(root);
    },
    destroy: (root) => {
      qsa("[data-if-diagram-edit-toggle]", root).forEach(unbindDiagramEditToggle);
      qsa("[data-if-diagram]", root).forEach((diagram) => {
        unbindDiagramSearchControls(diagram);
        clearDiagramSearch(diagram, { resetFocus: false });
      });
      qsa("[data-if-diagram-search]", root).forEach(unbindDiagramSearchInput);
    }
  });

  registerBehaviorModule({
    name: "tables",
    description: "Data table sorting, filters, selection, pagination, adapters, virtualization, pinning, and resizing.",
    selectors: ["[data-if-data-table]"],
    init: (root) => {
      qsa("[data-if-data-table]", root).forEach((table) => {
        setupDataTable(table);
        applyDataTable(table);
      });
    },
    destroy: (root) => {
      qsa("[data-if-data-table]", root).forEach((table) => {
        dataTableRequests.get(table)?.controller?.abort();
        dataTableRequests.delete(table);
      });
    }
  });

  registerBehaviorModule({
    name: "policy-diff",
    description: "Policy line-change diff navigation and decision state.",
    selectors: ["[data-if-policy-diff]"],
    init: (root) => {
      qsa("[data-if-policy-diff]", root).forEach(hydratePolicyDiff);
    }
  });

  registerBehaviorModule({
    name: "hierarchy",
    description: "Authority trees, organization hierarchies, and landscape hierarchy panels.",
    selectors: ["[data-if-hierarchy]", ".if-landscape-hierarchy"],
    init: (root) => {
      qsa("[data-if-hierarchy]", root).forEach((explorer) => {
        applyHierarchyNodeTypes(explorer);
        applyHierarchyStructure(explorer);
        qsa("[data-if-hierarchy-toggle]", explorer).forEach((toggle) => {
          syncHierarchyToggle(toggle);
        });
        qsa("[data-if-hierarchy-toggle][aria-expanded='false']", explorer).forEach((toggle) => {
          const row = toggle.closest("[data-hierarchy-node]");
          if (row) setHierarchyDescendants(explorer, row.dataset.hierarchyNode, true);
        });
        const selected = qs("[data-hierarchy-node].is-selected", explorer) || qs("[data-hierarchy-node]:not([hidden])", explorer);
        if (selected) selectHierarchyNode(selected);
      });
    }
  });

  registerBehaviorModule({
    name: "claims-history",
    description: "Claim trackers, item history viewers, and traversal path selectors.",
    selectors: ["[data-if-claims]", "[data-if-history]", "[data-if-traversal]"],
    init: (root) => {
      hydrateClaimTrackers(root);
      qsa("[data-if-history]", root).forEach((viewer) => {
        const selected = qs("[data-history-event].is-selected", viewer) || qs("[data-history-event]", viewer);
        if (selected) selectHistoryEvent(selected);
      });
      qsa("[data-if-traversal]", root).forEach((explorer) => {
        const selected = qs("[data-traversal-step].is-selected", explorer) || qs("[data-traversal-step]", explorer);
        if (selected) selectTraversalStep(selected);
      });
    }
  });

  registerBehaviorModule({
    name: "review-workflows",
    description: "Reviewer queue roving selection, shortcut actions, counts, and event ledgers.",
    selectors: ["[data-if-review-workflow]"],
    init: (root) => hydrateReviewWorkflows(root)
  });

  registerBehaviorModule({
    name: "documents",
    description: "Document corpus loading, artifact selection, search, highlights, and annotation inspection.",
    selectors: ["[data-if-doc-workspace]", "[data-if-doc-viewer]", "[data-if-doc-annotation]"],
    init: (root) => hydrateDocumentViewers(root)
  });

  registerBehaviorModule({
    name: "erd",
    description: "Entity relationship diagrams, ERD pan/zoom, layout restore, and geometry refresh.",
    selectors: ["[data-if-erd]"],
    init: (root) => {
      qsa("[data-if-erd]", root).forEach((erd) => {
        const canvas = getErdCanvas(erd);
        if (canvas) applyErdView(canvas, getErdView(canvas));
        const activeMode = qs("[data-if-erd-mode][aria-pressed='true']", erd) || qs("[data-if-erd-mode]", erd);
        if (activeMode) setErdMode(activeMode);
        const activeDensity = qs("[data-if-erd-density][aria-pressed='true']", erd) || qs("[data-if-erd-density='auto']", erd);
        if (activeDensity) setErdDensity(activeDensity);
        qsa("[data-erd-node]", erd).forEach((node) => {
          if (!node.dataset.erdInitialX) node.dataset.erdInitialX = String(getErdNodePosition(node)[0]);
          if (!node.dataset.erdInitialY) node.dataset.erdInitialY = String(getErdNodePosition(node)[1]);
        });
        restoreErdLayout(erd);
        deconflictErdNodes(erd, null, { centerBias: 0.04, laneGravity: 0.1, margin: 1.2, passes: 8, strength: 0.34 });
        refreshErdGeometry(erd);
        applyErdFocus(erd);
        fitErdView(canvas);
        updateErdStatus(erd);
      });
    }
  });

  registerBehaviorModule({
    name: "graph",
    description: "Graph organization, traversal, layout engines, node/edge selection, and accessible fallback indexes.",
    selectors: ["[data-if-graph]"],
    init: (root) => {
      qsa("[data-if-graph]", root).forEach((graph) => {
        hydrateGraph(graph);
        const canvas = qs(".if-graph-canvas", graph);
        if (canvas) applyGraphView(canvas, getGraphView(canvas));
        applyGraphNodeTypes(graph);
        const activeMode = qs("[data-if-graph-mode][aria-pressed='true']", graph) || qs("[data-if-graph-mode]", graph);
        if (activeMode) setGraphMode(activeMode);
        applyGraphOrganization(graph);
        const activeLayout = qs("[data-if-graph-layout][aria-pressed='true']", graph) || qs("[data-if-graph-layout]", graph);
        if (activeLayout) setGraphLayout(activeLayout);
        qsa("[data-if-graph-cluster]", graph).forEach((control) => {
          prepareGraphClusterControl(control, graph);
          const cluster = control.dataset.ifGraphCluster;
          const open = control.getAttribute("aria-expanded") === "true" || (cluster && graph.getAttribute(`data-cluster-${cluster}`) === "open");
          if (cluster) graph.setAttribute(`data-cluster-${cluster}`, open ? "open" : "closed");
          setGraphClusterState(control, Boolean(open));
        });
        qsa("[data-cluster-member]", graph).forEach((item) => {
          const cluster = item.dataset.clusterMember;
          const open = cluster && graph.getAttribute(`data-cluster-${cluster}`) === "open";
          if (!open) item.hidden = true;
        });
        applyGraphFilters(graph);
        const selected = qs(".if-graph-node.is-selected", graph) || qs(".if-graph-node[data-node-id]", graph);
        if (selected) setGraphPath(graph, selected);
        updateGraphStatus(graph);
      });
    }
  });

  registerBehaviorModule({
    name: "events",
    description: "Document-level delegated event listeners for the behavior layer.",
    order: -1000,
    selectors: ["document"],
    init: (root) => {
      if (!isDocumentBehaviorRoot(root) || initialized) return;
      document.addEventListener("click", handleAutocompleteCaptureClick, true);
      document.addEventListener("click", handleClick);
      document.addEventListener("input", handleInput);
      document.addEventListener("change", handleChange);
      document.addEventListener("submit", handleSubmit);
      document.addEventListener("keydown", handleKeydown);
      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
      document.addEventListener("pointercancel", handlePointerUp);
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("mousemove", handlePointerMove);
      document.addEventListener("mouseup", handlePointerUp);
      document.addEventListener("wheel", handleWheel, { passive: false });
      window.addEventListener("resize", handleResize);
      document.addEventListener("mouseover", handleMouseover);
      document.addEventListener("mouseout", handleMouseout);
      document.addEventListener("focusin", handleFocusIn);
      document.addEventListener("focusout", handleFocusOut);
      initialized = true;
    },
    destroy: (root) => {
      if (!isDocumentBehaviorRoot(root)) return;
      document.removeEventListener("click", handleAutocompleteCaptureClick, true);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("input", handleInput);
      document.removeEventListener("change", handleChange);
      document.removeEventListener("submit", handleSubmit);
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseup", handlePointerUp);
      document.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mouseover", handleMouseover);
      document.removeEventListener("mouseout", handleMouseout);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      initialized = false;
    }
  });

  return getBehaviorModules();
}

function init(root = document, options = {}) {
  registerCoreBehaviorModules();
  const normalizedRoot = normalizeBehaviorRoot(root);
  const normalizedOptions = { continueOnError: true, ...normalizeBehaviorOptions(options) };
  const modules = getBehaviorModuleList(normalizedOptions).map((module) => module.name);
  dispatchBehaviorEvent(normalizedRoot, "if:framework-init:before", { root: normalizedRoot, modules, options: normalizedOptions }, normalizedOptions);
  runBehaviorModules("init", normalizedRoot, normalizedOptions);
  dispatchBehaviorEvent(normalizedRoot, "if:framework-init", { root: normalizedRoot, modules, options: normalizedOptions }, normalizedOptions);
  return normalizedRoot;
}

function destroy(root = document, options = {}) {
  registerCoreBehaviorModules();
  const normalizedRoot = normalizeBehaviorRoot(root);
  const normalizedOptions = { continueOnError: true, ...normalizeBehaviorOptions(options) };
  const modules = getBehaviorModuleList(normalizedOptions).map((module) => module.name);
  dispatchBehaviorEvent(normalizedRoot, "if:framework-destroy:before", { root: normalizedRoot, modules, options: normalizedOptions }, normalizedOptions);
  runBehaviorModules("destroy", normalizedRoot, normalizedOptions);
  dispatchBehaviorEvent(normalizedRoot, "if:framework-destroy", { root: normalizedRoot, modules, options: normalizedOptions }, normalizedOptions);
  return normalizedRoot;
}

function resolveComponentElement(target) {
  if (typeof target === "string") return qs(target);
  return target || null;
}

function getComponentKind(element) {
  if (!element?.matches) return "unknown";
  if (element.matches("[data-if-menu-toggle]")) return "menu-toggle";
  if (element.matches("[data-if-popover-toggle]")) return "popover-toggle";
  if (element.matches("[data-if-collapsible], [data-if-collapsible-toggle]")) return "collapsible";
  if (element.matches("[data-if-surface-expand]")) return "expandable-surface-toggle";
  if (element.matches("[data-if-tabs]")) return "tabs";
  if (element.matches("[role='tab']")) return "tab";
  if (element.matches("[data-if-data-table]")) return "data-table";
  if (element.matches("[data-if-graph]")) return "graph";
  if (element.matches(".if-graph-node[data-node-id]")) return "graph-node";
  if (element.matches("[data-if-diagram]")) return "diagram";
  if (element.matches(diagramItemSelector)) return "diagram-item";
  if (element.matches("[data-if-hierarchy]")) return "hierarchy";
  if (element.matches("[data-hierarchy-node]")) return "hierarchy-node";
  if (element.matches("[data-if-date-picker]")) return "date-picker";
  if (element.matches("[data-if-wizard]")) return "wizard";
  if (element.matches("[data-if-operations-workspace]")) return "operations-workspace";
  if (element.matches("[data-if-operations-signal]")) return "operations-signal";
  if (element.matches("[data-if-annotation-toolbar]")) return "annotation-toolbar";
  if (element.matches("[data-if-command-palette]")) return "command-palette";
  if (element.matches("[data-if-state-preview]")) return "state-preview";
  return element.dataset?.ifComponent || "generic";
}

function getComponentController(target) {
  const element = resolveComponentElement(target);
  const kind = getComponentKind(element);
  const controller = {
    element,
    kind,
    open(options = {}) {
      if (!element) return false;
      if (kind === "menu-toggle") {
        openMenu(element, options);
        return true;
      }
      if (kind === "popover-toggle") {
        setDisclosureState(element, getTarget(element, "ifPopoverToggle"), true);
        return true;
      }
      if (kind === "collapsible") {
        const surface = getCollapsibleSurface(element);
        return surface ? syncCollapsibleSurface(surface, true, { control: element }) : false;
      }
      if (kind === "command-palette") {
        openCommandPalette(options.trigger || null);
        return true;
      }
      return false;
    },
    close(options = {}) {
      if (!element) return false;
      if (kind === "menu-toggle") {
        closeMenu(element, options);
        return true;
      }
      if (kind === "popover-toggle") {
        closePopover(element);
        return true;
      }
      if (kind === "collapsible") {
        const surface = getCollapsibleSurface(element);
        return surface ? syncCollapsibleSurface(surface, false, { control: element }) : false;
      }
      if (kind === "command-palette") {
        closeCommandPalette(element, options);
        return true;
      }
      return false;
    },
    toggle(options = {}) {
      if (!element) return false;
      if (kind === "menu-toggle") {
        toggleMenu(element);
        return true;
      }
      if (kind === "popover-toggle") {
        togglePopover(element);
        return true;
      }
      if (kind === "collapsible") return toggleCollapsibleSurface(element);
      if (kind === "expandable-surface-toggle") {
        toggleSurfaceExpansion(element);
        return true;
      }
      if (typeof options.pressed !== "undefined") {
        setPressed(element, options.pressed);
        return true;
      }
      return false;
    },
    select(value, options = {}) {
      if (!element) return false;
      if (kind === "tab") {
        activateTab(element);
        return true;
      }
      if (kind === "tabs") {
        const tab = typeof value === "number"
          ? qsa("[role='tab']", element)[value]
          : qs(`[role='tab'][aria-controls="${escapeCssIdentifier(String(value))}"], [role='tab'][data-target="#${escapeCssIdentifier(String(value))}"], [role='tab'][data-target="${escapeCssIdentifier(String(value))}"]`, element);
        if (!tab) return false;
        activateTab(tab);
        return true;
      }
      if (kind === "graph-node") {
        selectGraphNode(element);
        return true;
      }
      if (kind === "graph") {
        const node = qs(`.if-graph-node[data-node-id="${escapeCssIdentifier(String(value))}"]`, element);
        if (!node) return false;
        selectGraphNode(node);
        return true;
      }
      if (kind === "diagram-item") {
        selectDiagramSearchMatch(element.closest("[data-if-diagram]"), element, options);
        return true;
      }
      if (kind === "diagram") {
        return Boolean(selectDiagramSearchMatch(element, value, options));
      }
      if (kind === "hierarchy-node") {
        selectHierarchyNode(element);
        return true;
      }
      if (kind === "hierarchy") {
        const row = qs(`[data-hierarchy-node="${escapeCssIdentifier(String(value))}"]`, element);
        if (!row) return false;
        selectHierarchyNode(row);
        return true;
      }
      if (kind === "date-picker") {
        setDatePickerValue(element, value, options);
        return true;
      }
      if (kind === "wizard") {
        setWizardStep(element, value);
        return true;
      }
      if (kind === "operations-workspace") {
        setOperationsSignal(element, value, options);
        return true;
      }
      if (kind === "operations-signal") {
        setOperationsSignal(element, value || getOperationsSignalValue(element), options);
        return true;
      }
      if (kind === "annotation-toolbar") {
        const tool = qsa("[data-if-annotation-tool]", element).find((button) => button.dataset.ifAnnotationTool === String(value));
        if (!tool) return false;
        setAnnotationTool(tool);
        return true;
      }
      return false;
    },
    setState(state, options = {}) {
      if (!element) return false;
      if (kind === "data-table" && state === "refresh") {
        refreshDataTable(element);
        return true;
      }
      if (kind === "graph" && state === "viewport") {
        setGraphViewport({ dataset: { ifGraphViewport: options.action || "fit" }, closest: () => element });
        return true;
      }
      if (kind === "diagram" && state === "edit") {
        setDiagramEditMode(element, options.active);
        if (options.tool) setDiagramEditTool(element, options.tool);
        return true;
      }
      if (kind === "state-preview") {
        element.dataset.ifStateVariant = String(options.variant || state);
        return true;
      }
      if ("pressed" in options) {
        setPressed(element, options.pressed);
        return true;
      }
      return false;
    },
    reset(options = {}) {
      if (!element) return false;
      if (kind === "data-table") {
        clearDataTableFilters(element);
        refreshDataTable(element);
        return true;
      }
      if (kind === "graph") {
        resetGraphFocus(element);
        return true;
      }
      if (kind === "diagram") {
        resetDiagramFocus(element);
        return true;
      }
      if (kind === "hierarchy") {
        applyHierarchyStructure(element);
        return true;
      }
      if (kind === "date-picker") {
        setDatePickerValue(element, options.value || getTodayIsoDate());
        return true;
      }
      if (kind === "operations-workspace" || kind === "operations-signal") {
        return resetOperationsSignal(element, options);
      }
      return false;
    },
    refresh(options = {}) {
      if (!element) return false;
      init(element, options);
      if (kind === "data-table") refreshDataTable(element);
      if (kind === "graph") refreshGraphGeometry(element);
      if (kind === "diagram") refreshConnectorRoutes(element);
      return true;
    },
    destroy(options = {}) {
      if (!element) return false;
      destroy(element, options);
      return true;
    }
  };
  return controller;
}

window.InterfaceFramework = { activateTab, closeCommandPalette, closeDrawer, closeMenu, closeModal, closeMenus, closePopovers, cancelAdapterTask, cancelAutocomplete, cancelSurfaceExport, balanceGrid, applyConnectorRoutes, applyDiagramContainerFormat, applyDiagramLayoutSnapshot, applyDiagramNodeType, applyDiagramNodeTypes, applyGraphNodeType, applyGraphNodeTypes, applyHierarchyNodeType, applyHierarchyNodeTypes, applyHierarchyStructure, collectConnectorRoutes, collectDiagramDocument, computeConnectorRoute, computeTooltipPosition, createDiagramConnectorRoute, createDiagramNode, createDiagramNodeFromSource, duplicateDiagramItem, clearComponentInventoryFilter, clearPublicSearch, clearDataTableFilters, applyReviewWorkflowAction, applyGraphLayoutResult, collectDiagramLayoutSnapshot, collectGraphLayoutInput, destroy, destroyBehavior, filterCommandPalette, filterItems, getCommandPalette, getCommandPaletteState, getAutocompleteState, getBehaviorModules, getAdapterState, getDocumentViewer, getDocumentViewerState, getDocumentWorkspaceState, getDocumentAnnotationSchema, getDocumentAnnotationSchemas, getComponentController, getComponentInventory, getComponentInventoryCapabilityCoverage, getComponentInventoryDeficiencyBacklog, getComponentInventoryDeficiencyAssessment, getComponentInventoryEvidenceMatrix, getComponentInventoryReadinessActions, getComponentInventoryReadinessReport, getComponentInventoryReadinessScorecard, getComponentInventoryReadinessSnapshot, getComponentInventoryReleaseGate, getComponentInventoryRiskRegister, getComponentInventoryState, getComponentInventoryViewState, getConfigurationState, getOperationsWorkspaceState, evaluatePerformanceBudgets, getPerformanceProfile, getPolicyDiff, getPublicSearch, getClaimTrackerState, getReviewWorkflow, getReviewWorkflowState, getTabs, getTabsState, getAccordionState, getAnnotationToolbar, getAnnotationToolbarState, getAdapterTaskState, getWizard, getWizardState, getTheme, hydrateAssets, hydrateAutocompleteInputs, hydrateCharts, hydrateConfigurationControls, hydrateComponentInventories, hydrateComponentInventoryManifest, hydrateBalancedGrids, hydrateConnectorRoutes, hydrateClaimTrackers, hydrateCommandPalettes, hydrateDocumentViewers, hydrateIcons, hydrateKeyboardModel, hydrateOperationsWorkspaces, hydratePerformanceLabs, hydrateReviewWorkflows, hydrateAnnotationToolbars, hydrateSparklines, hydrateThemeControls, loadDiagramLayout, getKeyboardModel, getDiagramNodeTypeConfig, getGraphNodeTypeConfig, getGraphState, getGraphSurface, getHierarchyNodeTypeConfig, normalizeDiagramSchema, resetFocusSurface, deleteDiagramConnectorRoute, deleteDiagramItem, deleteSelectedDiagramTarget, resetSelectedDiagramTarget, resetDiagramFocus, resetDiagramLayout, renderCommandPalette, runCommandPaletteItem, init, initBehavior, normalizeAdapterState, nudgeDiagramItem, openCommandPalette, openDrawer, openMenu, openModal, applyGraphFilters, applyComponentInventoryPreset, applyComponentInventoryViewState, applyComponentInventoryFilters, applyDiagramDocument, applySelectedDiagramJson, applyGraphOrganization, copyDiagramSourceEditor, copySelectedDiagramJson, downloadDiagramSourceEditor, extractDiagramSourceText, formatDiagramSourceEditor, importDiagramSourceFile, pinDataTableColumn, parseDiagramSourceValue, registerAutocompleteAdapter, registerBehaviorModule, registerCoreBehaviorModules, registerDataTableAdapter, registerDiagramLayoutAdapter, registerDiagramNodeType, registerExportAdapter, registerGraphLayoutEngine, registerGraphNodeType, registerHierarchyNodeType, measureOverflow, moveDiagramItemToContainer, moveComponentInventorySelection, renderAutocomplete, renderConfigurationDemo, renderClaimTracker, renderDropzoneFiles, renderAccordion, renderDiagramSchema, renderGraph, renderReviewWorkflow, renderTabs, renderWizard, reorderDiagramItem, refreshBalancedGrids, refreshDiagramSourceEditor, refreshConnectorRoutes, refreshDataTable, refreshGraphGeometry, resizeDataTableColumn, retryAdapterRequest, runAdapterTask, runPerformanceLab, saveDiagramLayout, setOperationsSignal, selectGraphEdge, selectComponentInventoryCard, selectDiagramConnectorRoute, setDiagramEditMode, setDiagramEditTool, setDiagramConnectorRoute, setDiagramItemBackground, setDiagramItemIcon, setDiagramItemLayout, selectChartPoint, setChartDataset, setChartHeight, setChartThreshold, setComponentInventoryCapabilityFilter, setComponentInventoryCategoryFilter, setControlVariable, setDataTableData, setDemoState, setAnnotationTool, setAdapterState, renderSparkline, renderPolicyDiff, selectDatePickerDate, setDatePickerValue, selectClaim, resetOperationsSignal, selectDocumentAnnotation, selectDocumentArtifact, selectHistoryEvent, selectHierarchyNode, selectReviewWorkflowItem, resetGraphFocus, runGraphLayoutEngine, setDocumentArtifactMode, setStateVariant, setWizardStep, setPolicyDiffDecision, selectGraphNode, setGraphMode, setGraphLayout, setGraphViewport, setRouteNavigation, setTheme, showToast, startSparklineStream, stepSparklineStream, stopSparklineStream, toggleMenu, togglePopover, applyDataTable, filterDataTable, setDataTablePage, setDataTablePageSize, setDataTableDensity, setDisclosureState, setFieldState, setExpanded, sortDataTable, setPublicSearchFilter, getPolicyDiffState, hydratePolicyDiff, hydrateGraph, hydrateWizard, setPressed, setSelected, hideTooltip, showTooltip, hydrateCollapsibleSurfaces, hydratePublicSearches, toggleCollapsibleSurface, toggleSurfaceExpansion, toggleHierarchyBranch, toggleGraphCluster, traceGraphFrom, traverseGraph, hydrateDocumentCorpus, hydrateDocumentAnnotations, unregisterAutocompleteAdapter, unregisterBehaviorModule, unregisterDataTableAdapter, unregisterDiagramLayoutAdapter, unregisterDiagramNodeType, unregisterExportAdapter, unregisterGraphLayoutEngine, unregisterGraphNodeType, unregisterHierarchyNodeType, undoDiagramDelete, updateDataTableStatus, updateDocumentSearch, updateDiagramStats, updateDiagramSearch, updatePublicSearch, updateSelectedDiagramRoute, updateGraphA11yFallback, updatePolicyDiff, updateReviewWorkflow, validateField, validateForm, validateDiagramSourceEditor, validateDiagramSchema };

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
}

window.InterfaceFramework = { activateTab, closeCommandPalette, closeDrawer, closeMenu, closeModal, closeMenus, closePopovers, cancelAdapterTask, cancelAutocomplete, cancelSurfaceExport, balanceGrid, applyConnectorRoutes, applyDiagramContainerFormat, applyDiagramLayoutSnapshot, applyDiagramNodeType, applyDiagramNodeTypes, applyGraphNodeType, applyGraphNodeTypes, applyHierarchyNodeType, applyHierarchyNodeTypes, applyHierarchyStructure, collectConnectorRoutes, collectDiagramDocument, computeConnectorRoute, computeTooltipPosition, createDiagramConnectorRoute, createDiagramNode, createDiagramNodeFromSource, duplicateDiagramItem, clearComponentInventoryFilter, clearPublicSearch, clearDataTableFilters, applyReviewWorkflowAction, applyGraphLayoutResult, collectDiagramLayoutSnapshot, collectGraphLayoutInput, destroy, destroyBehavior, filterCommandPalette, filterItems, getCommandPalette, getCommandPaletteState, getAutocompleteState, getBehaviorModules, getAdapterState, getDocumentViewer, getDocumentViewerState, getDocumentWorkspaceState, getDocumentAnnotationSchema, getDocumentAnnotationSchemas, getComponentController, getComponentInventory, getComponentInventoryCapabilityCoverage, getComponentInventoryDeficiencyBacklog, getComponentInventoryDeficiencyAssessment, getComponentInventoryEvidenceMatrix, getComponentInventoryReadinessActions, getComponentInventoryReadinessReport, getComponentInventoryReadinessScorecard, getComponentInventoryReadinessSnapshot, getComponentInventoryReleaseGate, getComponentInventoryRiskRegister, getComponentInventoryState, getComponentInventoryViewState, getConfigurationState, getOperationsWorkspaceState, evaluatePerformanceBudgets, getPerformanceProfile, getPolicyDiff, getPublicSearch, getClaimTrackerState, getReviewWorkflow, getReviewWorkflowState, getTabs, getTabsState, getAccordionState, getAnnotationToolbar, getAnnotationToolbarState, getAdapterTaskState, getWizard, getWizardState, getTheme, hydrateAssets, hydrateAutocompleteInputs, hydrateCharts, hydrateConfigurationControls, hydrateComponentInventories, hydrateComponentInventoryManifest, hydrateBalancedGrids, hydrateConnectorRoutes, hydrateClaimTrackers, hydrateCommandPalettes, hydrateDocumentViewers, hydrateIcons, hydrateKeyboardModel, hydrateOperationsWorkspaces, hydratePerformanceLabs, hydrateReviewWorkflows, hydrateAnnotationToolbars, hydrateSparklines, hydrateThemeControls, loadDiagramLayout, getKeyboardModel, getDiagramNodeTypeConfig, getGraphNodeTypeConfig, getGraphState, getGraphSurface, getHierarchyNodeTypeConfig, normalizeDiagramSchema, resetFocusSurface, deleteDiagramConnectorRoute, deleteDiagramItem, deleteSelectedDiagramTarget, resetSelectedDiagramTarget, resetDiagramFocus, resetDiagramLayout, renderCommandPalette, runCommandPaletteItem, init, initBehavior, normalizeAdapterState, nudgeDiagramItem, openCommandPalette, openDrawer, openMenu, openModal, applyGraphFilters, applyComponentInventoryPreset, applyComponentInventoryViewState, applyComponentInventoryFilters, applyDiagramDocument, applySelectedDiagramJson, applyGraphOrganization, copyDiagramSourceEditor, copySelectedDiagramJson, downloadDiagramSourceEditor, extractDiagramSourceText, formatDiagramSourceEditor, importDiagramSourceFile, pinDataTableColumn, parseDiagramSourceValue, registerAutocompleteAdapter, registerBehaviorModule, registerCoreBehaviorModules, registerDataTableAdapter, registerDiagramLayoutAdapter, registerDiagramNodeType, registerExportAdapter, registerGraphLayoutEngine, registerGraphNodeType, registerHierarchyNodeType, measureOverflow, moveDiagramItemToContainer, moveComponentInventorySelection, renderAutocomplete, renderConfigurationDemo, renderClaimTracker, renderDropzoneFiles, renderAccordion, renderDiagramSchema, renderGraph, renderReviewWorkflow, renderTabs, renderWizard, reorderDiagramItem, refreshBalancedGrids, refreshDiagramSourceEditor, refreshConnectorRoutes, refreshDataTable, refreshGraphGeometry, resizeDataTableColumn, retryAdapterRequest, runAdapterTask, runPerformanceLab, saveDiagramLayout, setOperationsSignal, selectGraphEdge, selectComponentInventoryCard, selectDiagramConnectorRoute, setDiagramEditMode, setDiagramEditTool, setDiagramConnectorRoute, setDiagramItemBackground, setDiagramItemIcon, setDiagramItemLayout, selectChartPoint, setChartDataset, setChartHeight, setChartThreshold, setComponentInventoryCapabilityFilter, setComponentInventoryCategoryFilter, setControlVariable, setDataTableData, setDemoState, setAnnotationTool, setAdapterState, renderSparkline, renderPolicyDiff, selectDatePickerDate, setDatePickerValue, selectClaim, resetOperationsSignal, selectDocumentAnnotation, selectDocumentArtifact, selectHistoryEvent, selectHierarchyNode, selectReviewWorkflowItem, resetGraphFocus, runGraphLayoutEngine, setDocumentArtifactMode, setStateVariant, setWizardStep, setPolicyDiffDecision, selectGraphNode, setGraphMode, setGraphLayout, setGraphViewport, setRouteNavigation, setTheme, showToast, startSparklineStream, stepSparklineStream, stopSparklineStream, toggleMenu, togglePopover, applyDataTable, filterDataTable, setDataTablePage, setDataTablePageSize, setDataTableDensity, setDisclosureState, setFieldState, setExpanded, sortDataTable, setPublicSearchFilter, getPolicyDiffState, hydratePolicyDiff, hydrateGraph, hydrateWizard, setPressed, setSelected, hideTooltip, showTooltip, hydrateCollapsibleSurfaces, hydratePublicSearches, toggleCollapsibleSurface, toggleSurfaceExpansion, toggleHierarchyBranch, toggleGraphCluster, traceGraphFrom, traverseGraph, hydrateDocumentCorpus, hydrateDocumentAnnotations, unregisterAutocompleteAdapter, unregisterBehaviorModule, unregisterDataTableAdapter, unregisterDiagramLayoutAdapter, unregisterDiagramNodeType, unregisterExportAdapter, unregisterGraphLayoutEngine, unregisterGraphNodeType, unregisterHierarchyNodeType, undoDiagramDelete, updateDataTableStatus, updateDocumentSearch, updateDiagramStats, updateDiagramSearch, updatePublicSearch, updateSelectedDiagramRoute, updateGraphA11yFallback, updatePolicyDiff, updateReviewWorkflow, validateField, validateForm, validateDiagramSourceEditor, validateDiagramSchema };
const demoState = {
  widgets: [
    { id: "policy", icon: "policy", title: "Policy Changes", description: "Summary of recent and upcoming policy changes", value: 27, note: "New & Upcoming", change: "Up 18% vs last 7 days", meta: ["DoD + SECNAV", "Last 7 days"], tone: "success", size: "Medium", visible: true },
    { id: "deadlines", icon: "calendar", title: "Key Deadlines", description: "List of important upcoming deadlines", value: 6, note: "Due in next 30 days", change: "Up 2 vs last 7 days", meta: ["Obligation index", "Next 30 days"], tone: "danger", size: "Medium", visible: true },
    { id: "gaps", icon: "warning", title: "Implementation Gaps", description: "Tracking of gaps and at-risk items", value: 22, note: "Open Gaps", change: "Up 10% vs last week", meta: ["Gap Agent v2.1", "Open branches"], tone: "success", size: "Medium", visible: true },
    { id: "review", icon: "check", title: "Review Queue", description: "Items awaiting review and action", value: 128, note: "Items in queue", change: "Up 18% vs last 7 days", meta: ["Review console", "Assigned team"], tone: "success", size: "Large", visible: true },
    { id: "sources", icon: "database", title: "Source Health", description: "Health and freshness of sources", value: 124, note: "Active Sources", change: "Active sources", meta: ["Source Monitor", "Synced 10:22 AM"], tone: "success", size: "Large", visible: true },
    { id: "opportunities", icon: "link", title: "Linked Opportunities", description: "Opportunities related to this policy", value: 63, note: "Open Opportunities", change: "Up 12% vs Apr 1 - Apr 30", meta: ["Impact Analyzer", "Apr 1 - May 12"], tone: "success", size: "Medium", visible: true }
  ],
  sources: [
    { id: "src-federal-register", source: "Federal Register API", tier: "Tier 1", family: "Public rulemaking", adapter: "REST + daily delta", access: "API", owner: "Source Monitor", cadence: "Hourly delta", sync: "May 12, 2025 9:22 AM", freshness: "18 min", health: "Healthy", trust: 94, coverage: 91, docs: "21,637", change: "+12.7%", parser: "OK", trend: "up", artifacts: 184, queue: 12, published: 28, failed: 0, issues: "None", latest: ["Cyber Incident Reporting Harmonization", "Acquisition Threshold Update", "Cloud service reporting rule"] },
    { id: "src-govinfo", source: "GovInfo / Congress.gov", tier: "Tier 1", family: "Legislation", adapter: "Bulk XML + API", access: "API + bulk", owner: "Citation Graph", cadence: "Daily bulk", sync: "May 12, 2025 9:33 AM", freshness: "29 min", health: "Healthy", trust: 92, coverage: 88, docs: "18,044", change: "+6.8%", parser: "OK", trend: "up", artifacts: 121, queue: 9, published: 17, failed: 0, issues: "None", latest: ["Defense Modernization Authorization", "Cyber workforce amendments", "Committee report language"] },
    { id: "src-dod-issuances", source: "DoD Issuances Portal", tier: "Tier 1", family: "Defense policy", adapter: "HTML/PDF crawler", access: "Crawler", owner: "Metadata Extractor", cadence: "Every 30 min", sync: "May 12, 2025 10:21 AM", freshness: "6 min", health: "Healthy", trust: 96, coverage: 94, docs: "12,845", change: "+8.4%", parser: "OK", trend: "up", artifacts: 96, queue: 6, published: 31, failed: 0, issues: "2 records pending provenance confirmation", latest: ["DoDI 5200.01 Information Governance", "DoDI 5025.01 Directives Program", "DOD 5230.24 Data Access"] },
    { id: "src-navy-directives", source: "Navy Directives Library", tier: "Tier 1", family: "Service directives", adapter: "Watchlist + parser", access: "Watchlist", owner: "Impact Analyzer", cadence: "Every 2 hours", sync: "May 12, 2025 9:58 AM", freshness: "24 min", health: "Healthy", trust: 89, coverage: 84, docs: "8,317", change: "+5.2%", parser: "OK", trend: "up", artifacts: 63, queue: 5, published: 14, failed: 0, issues: "1 supersession awaiting analyst review", latest: ["SECNAV Memo 25-104", "NAVADMIN 105/25", "N4/N6 Cloud Migration Plan"] },
    { id: "src-omb", source: "OMB Memoranda Feed", tier: "Tier 2", family: "Executive policy", adapter: "RSS + PDF parser", access: "RSS", owner: "Review Triage", cadence: "Daily", sync: "May 12, 2025 9:41 AM", freshness: "41 min", health: "Degraded", trust: 76, coverage: 72, docs: "3,214", change: "-1.3%", parser: "Warnings", trend: "down", artifacts: 38, queue: 11, published: 6, failed: 2, issues: "PDF tables produced low-confidence headings", latest: ["M-25-77 AI Governance Practices", "Budget execution memo", "Zero Trust reporting update"] },
    { id: "src-nist", source: "NIST Publications Feed", tier: "Tier 2", family: "Standards", adapter: "Publication index", access: "Index", owner: "Confidence Calibrator", cadence: "Daily", sync: "May 12, 2025 8:57 AM", freshness: "85 min", health: "Healthy", trust: 87, coverage: 90, docs: "5,496", change: "+3.1%", parser: "OK", trend: "up", artifacts: 49, queue: 2, published: 9, failed: 0, issues: "None", latest: ["NIST SP 800-207", "Cloud controls crosswalk", "Identity assurance draft"] },
    { id: "src-cisa", source: "CISA Directives & Alerts", tier: "Tier 2", family: "Cyber alerts", adapter: "Alert feed + pages", access: "Feed", owner: "Gap Agent", cadence: "Every 15 min", sync: "May 12, 2025 8:46 AM", freshness: "96 min", health: "Healthy", trust: 84, coverage: 79, docs: "2,920", change: "+9.5%", parser: "OK", trend: "up", artifacts: 72, queue: 8, published: 12, failed: 0, issues: "Some alert pages lack stable section anchors", latest: ["Identity Security Baseline", "Known exploited vulnerability update", "Cloud hardening directive"] },
    { id: "src-restricted", source: "Internal Restricted Repository", tier: "Tier 3", family: "Access gated", adapter: "Guarded blob import", access: "Gated", owner: "Source Discovery", cadence: "Manual release", sync: "May 12, 2025 8:12 AM", freshness: "130 min", health: "Degraded", trust: 68, coverage: 61, docs: "1,104", change: "-2.1%", parser: "Warnings", trend: "down", artifacts: 27, queue: 14, published: 3, failed: 1, issues: "Access token rotation required", latest: ["Restricted implementation evidence", "Program milestone ledger", "Internal control memo"] },
    { id: "src-service-watchlist", source: "Service Memo Watchlist", tier: "Tier 3", family: "Service watchlists", adapter: "Analyst-curated", access: "Manual", owner: "Source Monitor", cadence: "Analyst update", sync: "May 12, 2025 8:31 AM", freshness: "112 min", health: "Degraded", trust: 62, coverage: 58, docs: "742", change: "-4.8%", parser: "Errors", trend: "down", artifacts: 19, queue: 17, published: 1, failed: 4, issues: "Two source URLs failed checksum validation", latest: ["Service cloud transition memo", "Readiness status note", "Obligation exception report"] }
  ],
  ingestStages: [
    { stage: "External Sources", count: 9, status: "Healthy", note: "Public, service, standards, alert, and restricted repositories" },
    { stage: "Ingestion & Extraction", count: 244, status: "Warnings", note: "Adapters, queue events, raw artifacts, document parsing" },
    { stage: "Core Agent Layer", count: 8, status: "Healthy", note: "Monitor, discovery, metadata, citations, relationships, obligations" },
    { stage: "Data / Search / Knowledge", count: 4812, status: "Healthy", note: "Canonical store, semantic index, blob exports, graph views" },
    { stage: "Experience Surfaces", count: 5, status: "Healthy", note: "Portal, APIs, alerts, events, opportunities, review console" }
  ],
  syntheticRecords: [
    { id: "FR-2025-09124", source: "Federal Register API", title: "Cyber Incident Reporting Harmonization", type: "Proposed Rule", extracted: "3 obligations, 5 citations", agent: "Obligation Extractor", confidence: "Medium" },
    { id: "PLAW-119-42", source: "GovInfo / Congress.gov", title: "Defense Modernization Authorization", type: "Public Law", extracted: "8 authorities, 12 deadlines", agent: "Citation Extractor", confidence: "High" },
    { id: "DODI-5200.01", source: "DoD Issuances Portal", title: "Information Governance", type: "Instruction", extracted: "11 relationships, 4 obligations", agent: "Relationship Linker", confidence: "High" },
    { id: "SECNAV-25-104", source: "Navy Directives Library", title: "Cloud Transition Guidance", type: "Memo", extracted: "6 milestones, 4 owners", agent: "Impact Analyzer", confidence: "High" },
    { id: "M-25-77", source: "OMB Memoranda Feed", title: "AI Governance Practices", type: "Memorandum", extracted: "5 review gates, 7 citations", agent: "Review Triage", confidence: "Medium" },
    { id: "NIST-SP-800-207", source: "NIST Publications Feed", title: "Zero Trust Architecture", type: "Standard", extracted: "9 mappings, 18 controls", agent: "Metadata Extractor", confidence: "High" },
    { id: "CISA-BOD-25-02", source: "CISA Directives & Alerts", title: "Identity Security Baseline", type: "Directive", extracted: "4 deadlines, 3 conflicts", agent: "Gap Agent", confidence: "Medium" }
  ],
  relationshipBundles: [
    { relation: "Derived From", count: 18, examples: "EOs, public laws, OMB memos", confidence: "High" },
    { relation: "References", count: 73, examples: "NIST, CISA, DoD manuals", confidence: "High" },
    { relation: "Implements", count: 41, examples: "Service owners, organizations", confidence: "Medium" },
    { relation: "Guides", count: 29, examples: "Playbooks, directives, baselines", confidence: "Medium" },
    { relation: "Has Obligation", count: 52, examples: "Deadlines, actions, review gates", confidence: "High" },
    { relation: "Enables Opportunity", count: 17, examples: "Modernization, API, AI platform", confidence: "Medium" }
  ],
  agents: [
    ["Source Monitor", "Healthy", "May 12, 10:21 AM", "May 12, 11:00 AM"],
    ["Source Discovery", "Healthy", "May 12, 9:45 AM", "May 12, 10:45 AM"],
    ["Citation Graph", "Healthy", "May 12, 10:05 AM", "May 12, 11:05 AM"],
    ["Relationship Linker", "Healthy", "May 12, 9:58 AM", "May 12, 10:58 AM"],
    ["Confidence Calibrator", "Healthy", "May 12, 10:12 AM", "May 12, 11:12 AM"],
    ["Implementation Gap Agent", "Paused", "May 12, 8:30 AM", "Paused"],
    ["Review Triage", "Healthy", "May 12, 10:18 AM", "May 12, 11:18 AM"]
  ],
  audit: [
    ["Run Now executed", "All agents", "May 12, 2025 10:21 AM"],
    ["Promoted candidate source", "DOE Rulemaking Watch", "May 12, 2025 9:48 AM"],
    ["Paused agent", "Implementation Gap Agent", "May 12, 2025 8:30 AM"],
    ["Published metadata", "DoD Issuances Portal", "May 12, 2025 7:58 AM"]
  ],
  findings: [
    { id: "CF-2025-1187-001", title: "Supplier Data Residency Obligation Missing", type: "Implementation Gap Candidate", source: "Global Privacy Policy v2.1", confidence: "High", risk: "High", assigned: "Jane Doe", due: "May 12, 2025", status: "Needs Review", summary: "The policy does not specify a required data residency or geographic location constraint for personal data stored or processed by the supplier." },
    { id: "CF-2025-1187-002", title: "Acme Corp. Relationship Candidate", type: "Relationship Candidate", source: "Third-Party Risk Register", confidence: "Medium", risk: "Medium", assigned: "Michael Lee", due: "May 13, 2025", status: "Needs Review", summary: "A supplier relationship appears in risk records but is not yet linked to the policy obligation." },
    { id: "CF-2025-1187-003", title: "CloudTrail Logging Requirement Gap", type: "Implementation Gap Candidate", source: "Cloud Security Standard 1.4", confidence: "High", risk: "High", assigned: "Priya Shah", due: "May 11, 2025", status: "Open", summary: "Indexed control text does not show logging coverage for privileged data access events." },
    { id: "CF-2025-1187-004", title: "New Source Onboarding: ISO/IEC 27018:2019", type: "Source Onboarding Candidate", source: "ISO/IEC 27018:2019", confidence: "Medium", risk: "Low", assigned: "Alex Kim", due: "May 15, 2025", status: "Open", summary: "A candidate source may improve privacy obligation coverage for cloud processing controls." }
  ],
  searchResults: [
    ["Zero Trust Architecture Implementation Guide for Cloud Environments", "Policy / Guidance", "CISA", "May 12, 2025", "High", "8 fields"],
    ["Cloud Migration Playbook: Zero Trust Design Patterns", "Guidance", "DoD", "May 9, 2025", "High", "6 fields"],
    ["Implementing Zero Trust per NIST 800-207 for Federal Workloads", "Instruction", "OMB", "May 5, 2025", "Medium", "7 fields"],
    ["Zero Trust Reference Architecture for Cloud Services", "Standard / Framework", "NIST", "Apr 28, 2025", "High", "10 fields"],
    ["Zero Trust Controls Mapping: NIST 800-207 to FedRAMP", "Report / Study", "GSA", "Apr 26, 2025", "Medium", "5 fields"]
  ],
  clauses: [
    ["CONTAINS", "\"zero trust architecture\"", "Any Field"],
    ["CONTAINS", "cloud migration", "Title or Abstract"],
    ["CITED BY", "NIST SP 800-207", "Document"],
    ["RELATIONSHIP TYPE", "Implements", "Policy / Guidance"],
    ["SEMANTIC SIMILARITY", "At least 0.70 to NIST SP 800-207", "Semantic"]
  ]
};

function demoEscape(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function demoBadge(value, semantic = "") {
  const lower = String(value).toLowerCase();
  let tone = "";
  if (semantic === "confidence" && ["high", "medium", "low"].includes(lower)) tone = ` if-badge--confidence-${lower}`;
  else if (semantic === "risk" && ["high", "medium", "low"].includes(lower)) tone = ` if-badge--risk-${lower}`;
  else if (semantic === "severity") {
    if (lower === "critical") tone = " if-badge--severity-critical";
    else if (["high", "medium", "low"].includes(lower)) tone = ` if-badge--severity-${lower}`;
  } else if (semantic === "status") {
    const normalized = lower.replace(/\s+/g, "-");
    tone = ` if-badge--status-${normalized}`;
  } else {
    if (["active", "clean", "complete", "done", "healthy", "ok", "approved", "on track", "on-track", "low"].includes(lower)) tone = " if-badge--status-healthy";
    if (["degraded", "pending", "warnings", "medium", "paused"].includes(lower)) tone = " if-badge--status-warnings";
    if (["errors", "failed", "blocked", "rejected"].includes(lower)) tone = " if-badge--status-failed";
    if (lower === "high") tone = " if-badge--confidence-high";
  }
  if (["tier 1", "tier 2", "tier 3"].includes(lower)) tone = " if-badge--info";
  return `<span class="if-badge${tone}">${demoEscape(value)}</span>`;
}

function demoToast(message, type = "info") {
  let stack = document.querySelector("[data-demo-toasts]");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "if-toast-stack";
    stack.dataset.demoToasts = "";
    document.body.append(stack);
  }
  const toast = document.createElement("div");
  toast.className = `if-toast if-alert--${type}`;
  toast.innerHTML = `<strong>${demoEscape(message)}</strong><button class="if-icon-btn if-btn--sm" type="button" aria-label="Dismiss">x</button>`;
  toast.querySelector("button").addEventListener("click", () => toast.remove());
  stack.append(toast);
  setTimeout(() => toast.remove(), 3500);
}

function renderWorkspace() {
  const list = document.querySelector("[data-demo-widgets-list]");
  const canvas = document.querySelector("[data-demo-dashboard-canvas]");
  const settings = document.querySelector("[data-demo-settings-list]");
  if (!list || !canvas || !settings) return;

  list.innerHTML = demoState.widgets.map((widget) => `
    <button class="if-list-item" type="button" data-demo-toggle-widget="${widget.id}">
      <span class="if-list-item__icon if-icon-slot" data-if-icon="${demoEscape(widget.icon)}"></span>
      <span class="if-list-item__body"><span class="if-list-item__title">${demoEscape(widget.title)}</span><span class="if-list-item__meta">${demoEscape(widget.description)}</span></span>
      <span class="if-badge${widget.visible ? " if-badge--info" : ""}">${widget.visible ? "On" : "Off"}</span>
    </button>
  `).join("");

  canvas.innerHTML = demoState.widgets.filter((widget) => widget.visible).map((widget) => `
    <article class="if-card if-metric" data-widget="${widget.id}">
      <div class="if-metric__top">
        <span class="if-metric__icon if-icon-slot" data-if-icon="${demoEscape(widget.icon)}" aria-hidden="true"></span>
        <p class="if-metric__label">${demoEscape(widget.title)}</p>
        <button class="if-icon-btn" type="button" title="More actions" data-demo-action="widget-menu">...</button>
      </div>
      <div class="if-metric__main"><p class="if-metric__value">${demoEscape(widget.value)}</p><span data-if-sparkline="${widget.tone === "danger" ? "6,7,6,8,7,8,9" : "12,14,16,15,19,21,24"}"></span></div>
      <span class="if-metric__change if-text-${widget.tone}">${demoEscape(widget.change)}</span>
      <div class="if-metric__meta">${widget.meta.map((item) => `<span>${demoEscape(item)}</span>`).join("")}</div>
      <select class="if-select" data-demo-widget-size="${widget.id}">
        ${["Small", "Medium", "Large"].map((size) => `<option${widget.size === size ? " selected" : ""}>${size}</option>`).join("")}
      </select>
    </article>
  `).join("") + `<button class="if-btn if-btn--secondary if-btn--block" type="button" data-demo-action="add-widget">Add widget here</button>`;

  settings.innerHTML = demoState.widgets.map((widget, index) => `
    <div class="if-setting-row">
      <span class="if-text-sm">${demoEscape(widget.title)}</span>
      <span class="if-cluster">
        <select class="if-select" data-demo-widget-size="${widget.id}" aria-label="${demoEscape(widget.title)} size">
          ${["Small", "Medium", "Large"].map((size) => `<option${widget.size === size ? " selected" : ""}>${size}</option>`).join("")}
        </select>
        <label class="if-switch">
          <input type="checkbox" data-demo-toggle-widget="${widget.id}" ${widget.visible ? "checked" : ""}>
          <span class="if-switch__track" aria-hidden="true"></span>
        </label>
        <span class="if-badge">${index + 1}</span>
      </span>
    </div>
  `).join("");

  hydrateIcons(list);
  hydrateIcons(canvas);
  hydrateSparklines(canvas);
}

function miniChart(trend) {
  const danger = trend === "down";
  return `<span class="if-mini-chart" data-if-sparkline="${danger ? "28,24,25,19,21,15,16" : "12,16,15,22,20,27,30"}" data-if-sparkline-label="${danger ? "Decreasing source trend" : "Increasing source trend"}"></span>`;
}

function sourceSignal(label, value, tone = "") {
  return `
    <span class="if-source-signal ${tone ? `if-source-signal--${tone}` : ""}">
      <span class="if-cluster if-cluster--between"><span class="if-text-xs if-text-muted">${demoEscape(label)}</span><strong>${value}%</strong></span>
      <span class="if-source-signal__bar" aria-hidden="true"><span style="--value:${value}%"></span></span>
    </span>
  `;
}

function renderSourceDetail(source) {
  return `
    <tr class="if-table-detail" data-if-table-detail hidden>
      <td colspan="10">
        <div class="if-table-detail__content">
          <div class="if-source-detail">
            <div class="if-source-detail__heading">
              <div>
                <h3 class="if-source-detail__title">${demoEscape(source.source)} ingest profile</h3>
                <p class="if-source-detail__subtitle">${demoEscape(source.family)} via ${demoEscape(source.adapter)}. Owned by ${demoEscape(source.owner)}.</p>
              </div>
              <div class="if-chip-list">${demoBadge(source.health)} ${demoBadge(source.parser)} <span class="if-badge">${demoEscape(source.access)}</span></div>
            </div>
            <div class="if-table-detail__grid">
              <dl class="if-meta-grid if-meta-grid--dense">
                <div class="if-kv"><dt>Cadence</dt><dd>${demoEscape(source.cadence)}</dd></div>
                <div class="if-kv"><dt>Freshness</dt><dd>${demoEscape(source.freshness)}</dd></div>
                <div class="if-kv"><dt>Published</dt><dd>${demoEscape(source.published)} intelligence objects</dd></div>
                <div class="if-kv"><dt>Failed Runs</dt><dd>${demoEscape(source.failed)}</dd></div>
              </dl>
              <div class="if-stack">
                ${sourceSignal("Trust", source.trust, source.trust < 70 ? "danger" : source.trust < 82 ? "warning" : "")}
                ${sourceSignal("Coverage", source.coverage, source.coverage < 70 ? "danger" : source.coverage < 82 ? "warning" : "")}
              </div>
              <div class="if-source-detail__events">
                ${source.latest.map((item, index) => `<div class="if-source-event"><span class="if-badge">${index + 1}</span><span>${demoEscape(item)}</span><span class="if-text-muted">${index === 0 ? "latest" : "indexed"}</span></div>`).join("")}
              </div>
              <div class="if-alert ${source.health === "Healthy" ? "if-alert--success" : source.parser === "Errors" ? "if-alert--danger" : "if-alert--warning"}">
                <strong>${demoEscape(source.issues)}</strong>
                <span>${demoEscape(source.queue)} queued artifacts will be processed by ${demoEscape(source.owner)}.</span>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  `;
}

function renderSources(filter = "") {
  const body = document.querySelector("[data-demo-sources-body]");
  const agents = document.querySelector("[data-demo-agents-body]");
  const audit = document.querySelector("[data-demo-audit]");
  if (!body) return;

  const query = filter.trim().toLowerCase();
  const rows = demoState.sources.filter((source) => !query || [
    source.source,
    source.health,
    source.parser,
    source.tier,
    source.family,
    source.owner,
    source.access
  ].join(" ").toLowerCase().includes(query));
  body.innerHTML = rows.map((source, index) => `
    <tr class="${index === 0 ? "is-selected" : ""}" data-if-table-row data-demo-source="${demoEscape(source.source)}" data-if-table-search="${demoEscape(`${source.source} ${source.health} ${source.parser} ${source.tier} ${source.family} ${source.owner} ${source.access} ${source.issues} ${source.latest.join(" ")}`)}" data-sort-source="${demoEscape(source.source)}" data-sort-health="${demoEscape(source.health)}" data-sort-docs="${demoEscape(source.docs)}" data-sort-trust="${source.trust}" data-sort-queue="${source.queue}">
      <td><input type="checkbox" data-if-table-select aria-label="Select ${demoEscape(source.source)}" ${index === 0 ? "checked" : ""}></td>
      <td><button class="if-icon-btn if-table-expand" type="button" data-if-table-expand aria-expanded="false" title="Show source details"><span data-if-icon="chevronDown"></span></button></td>
      <td data-if-table-cell="source"><span class="if-row-title"><strong>${demoEscape(source.source)}</strong><span>${demoEscape(source.family)} - ${demoEscape(source.adapter)}</span></span></td>
      <td>${demoBadge(source.tier)} <span class="if-badge">${demoEscape(source.access)}</span></td>
      <td><span class="if-row-title"><strong>${demoEscape(source.freshness)}</strong><span>${demoEscape(source.sync)}</span></span></td>
      <td data-if-table-cell="health">${demoBadge(source.health)} ${demoBadge(source.parser)}</td>
      <td data-if-table-cell="docs"><span class="if-row-title"><strong>${demoEscape(source.docs)}</strong><span class="${source.trend === "down" ? "if-text-danger" : "if-text-success"}">${demoEscape(source.change)}</span></span></td>
      <td>${sourceSignal("Trust", source.trust, source.trust < 70 ? "danger" : source.trust < 82 ? "warning" : "")}</td>
      <td data-if-table-cell="queue"><span class="if-row-title"><strong>${demoEscape(source.queue)} queued</strong><span>${demoEscape(source.artifacts)} artifacts</span></span></td>
      <td><span class="if-cluster"><button class="if-icon-btn" type="button" data-demo-action="run-source" title="Run"><span data-if-icon="play"></span></button><button class="if-icon-btn" type="button" data-demo-action="edit-source" title="Edit"><span data-if-icon="edit"></span></button><button class="if-icon-btn" type="button" title="More"><span data-if-icon="more"></span></button></span></td>
    </tr>
    ${renderSourceDetail(source)}
  `).join("");
  hydrateSparklines(body);
  hydrateIcons(body);
  applyDataTable(body.closest("[data-if-data-table]"));

  if (agents) {
    agents.innerHTML = demoState.agents.map((agent) => `
      <tr><td>${demoEscape(agent[0])}</td><td>${demoBadge(agent[1])}</td><td>${demoEscape(agent[2])}</td><td>${demoEscape(agent[3])}</td></tr>
    `).join("");
  }

  if (audit) {
    audit.innerHTML = demoState.audit.map((item) => `
      <div class="if-audit-item"><span class="if-audit-item__icon">i</span><div><strong>${demoEscape(item[0])}</strong><p class="if-list-item__meta">${demoEscape(item[1])}<br>${demoEscape(item[2])}</p></div></div>
    `).join("");
  }
}

function renderVirtualPolicyTable() {
  const body = document.querySelector("[data-demo-virtual-table-body]");
  if (!body) return;
  const types = ["Instruction", "Memo", "Guide", "Source", "Finding"];
  const risks = ["Low", "Medium", "High"];
  const statuses = ["Open", "In Review", "Needs Review", "Active", "Blocked"];
  body.innerHTML = Array.from({ length: 240 }, (_, index) => {
    const type = types[index % types.length];
    const risk = risks[(index + 1) % risks.length];
    const status = statuses[index % statuses.length];
    return `
      <tr data-if-table-row data-if-table-search="Virtual policy row ${index + 1} ${type} ${risk} ${status}" data-filter-type="${demoEscape(type)}" data-filter-risk="${demoEscape(risk)}" data-sort-title="Virtual policy row ${String(index + 1).padStart(3, "0")}">
        <td><span class="if-table-cell-main"><strong>Virtual policy row ${index + 1}</strong><span class="if-table-cell-meta">Synthetic record window item</span></span></td>
        <td>${demoEscape(type)}</td>
        <td>${demoBadge(risk, "risk")}</td>
        <td>${demoBadge(status, "status")}</td>
        <td class="is-numeric">${3 + (index * 11) % 91}</td>
      </tr>
    `;
  }).join("");
  hydrateIcons(body);
  applyDataTable(body.closest("[data-if-data-table]"), { local: true });
}

function renderIngestIntelligence() {
  const stages = document.querySelector("[data-demo-ingest-stages]");
  const records = document.querySelector("[data-demo-synthetic-records]");
  const sourceCards = document.querySelector("[data-demo-source-cards]");
  const bundles = document.querySelector("[data-demo-relationship-bundles]");

  if (stages) {
    stages.innerHTML = demoState.ingestStages.map((stage, index) => `
      <article class="if-ingest-stage">
        <span class="if-ingest-stage__index">${index + 1}</span>
        <div>
          <h3>${demoEscape(stage.stage)}</h3>
          <p>${demoEscape(stage.note)}</p>
        </div>
        <div class="if-ingest-stage__metric"><strong>${demoEscape(stage.count)}</strong>${demoBadge(stage.status)}</div>
      </article>
    `).join("");
  }

  if (sourceCards) {
    sourceCards.innerHTML = demoState.sources.slice(0, 8).map((source) => `
      <article class="if-source-card">
        <span class="if-source-card__icon if-icon-slot" data-if-icon="${source.source.includes("Navy") ? "anchor" : source.source.includes("Federal") ? "policy" : source.source.includes("NIST") || source.source.includes("CISA") ? "shield" : source.source.includes("Internal") ? "database" : "book"}"></span>
        <div>
          <h3>${demoEscape(source.source)}</h3>
          <p>${demoEscape(source.family)} - ${demoEscape(source.adapter)}</p>
          <div class="if-chip-list">${demoBadge(source.tier)} ${demoBadge(source.health)} <span class="if-badge">${demoEscape(source.artifacts)} artifacts</span></div>
        </div>
      </article>
    `).join("");
    hydrateIcons(sourceCards);
  }

  if (records) {
    records.innerHTML = demoState.syntheticRecords.map((record) => `
      <tr>
        <td><span class="if-row-title"><strong>${demoEscape(record.title)}</strong><span>${demoEscape(record.id)} - ${demoEscape(record.source)}</span></span></td>
        <td>${demoEscape(record.type)}</td>
        <td>${demoEscape(record.extracted)}</td>
        <td>${demoEscape(record.agent)}</td>
        <td>${demoBadge(record.confidence, "confidence")}</td>
      </tr>
    `).join("");
  }

  if (bundles) {
    bundles.innerHTML = demoState.relationshipBundles.map((bundle) => `
      <article class="if-relationship-bundle">
        <div class="if-cluster if-cluster--between"><h3>${demoEscape(bundle.relation)}</h3>${demoBadge(bundle.confidence, "confidence")}</div>
        <p class="if-metric__value">${demoEscape(bundle.count)}</p>
        <p>${demoEscape(bundle.examples)}</p>
      </article>
    `).join("");
  }
}

function renderReview() {
  const body = document.querySelector("[data-demo-review-body]");
  const detail = document.querySelector("[data-demo-review-detail]");
  if (!body || !detail) return;
  const selected = demoState.findings.find((finding) => finding.selected) || demoState.findings[0];
  selected.selected = true;

  body.innerHTML = demoState.findings.map((finding) => `
    <tr class="${finding.selected ? "is-selected" : ""}" data-demo-finding="${demoEscape(finding.id)}" data-if-filter-text="${demoEscape(`${finding.id} ${finding.title} ${finding.type} ${finding.source} ${finding.confidence} ${finding.risk} ${finding.assigned} ${finding.status}`)}">
      <td><input type="radio" name="finding" ${finding.selected ? "checked" : ""} aria-label="Select finding"></td>
      <td><span class="if-row-title"><strong>${demoEscape(finding.title)}</strong><span>${demoEscape(finding.id)}</span></span></td>
      <td>${demoBadge(finding.type.replace(" Candidate", ""))}</td>
      <td>${demoEscape(finding.source)}</td>
      <td>${demoBadge(finding.confidence, "confidence")}</td>
      <td>${demoBadge(finding.risk, "risk")}</td>
      <td>${demoEscape(finding.assigned)}</td>
      <td>${demoEscape(finding.due)}</td>
      <td>${demoBadge(finding.status, "status")}</td>
    </tr>
  `).join("");

  detail.innerHTML = `
    <div class="if-panel__header">
      <div><h2 class="if-panel__title">${demoEscape(selected.title)}</h2><div class="if-page-header__meta if-mt-2">${demoBadge(selected.type)} ${demoBadge(selected.status, "status")}</div></div>
      <button class="if-icon-btn" type="button" title="Close detail">x</button>
    </div>
    <div class="if-panel__body if-stack">
      <div class="if-toolbar">
        <button class="if-btn if-btn--success" type="button" data-demo-review-action="Approved">Approve</button>
        <button class="if-btn if-btn--danger" type="button" data-demo-review-action="Rejected">Reject</button>
        <button class="if-btn" type="button" data-demo-review-action="In Review">Edit</button>
        <button class="if-btn" type="button" data-demo-review-action="Escalated">Escalate</button>
        <button class="if-btn" type="button" data-demo-review-action="Assigned">Assign</button>
      </div>
      <label class="if-field"><span class="if-field__label">Decision Reason</span><select class="if-select"><option>Select reason...</option><option>Evidence supports finding</option><option>Insufficient provenance</option><option>Duplicate or superseded</option></select></label>
      <div data-if-tabs class="if-tabs">
        <div class="if-tab-list" role="tablist">
          <button class="if-tab" role="tab" aria-selected="true" aria-controls="review-evidence">Evidence</button>
          <button class="if-tab" role="tab" aria-selected="false" aria-controls="review-diff">Diff</button>
          <button class="if-tab" role="tab" aria-selected="false" aria-controls="review-history">History</button>
        </div>
        <section id="review-evidence" role="tabpanel" class="if-tab-panel if-grid if-grid--2">
          <div class="if-card"><h3 class="if-card__title">Finding Summary</h3><p>${demoEscape(selected.summary)}</p><div class="if-meta-grid"><div class="if-kv"><span class="if-kv__label">Confidence</span><span class="if-kv__value">${demoEscape(selected.confidence)}</span></div><div class="if-kv"><span class="if-kv__label">Risk</span><span class="if-kv__value">${demoEscape(selected.risk)}</span></div></div></div>
          <div class="if-evidence-panel"><h3 class="if-card__title">Evidence Snippet</h3><blockquote class="if-source-quote">Indexed source text requires residency controls when customer data is processed by a supplier.</blockquote><span class="if-text-xs if-text-muted">Source: ${demoEscape(selected.source)}, Section 4.2</span></div>
        </section>
        <section id="review-diff" role="tabpanel" class="if-tab-panel" hidden><div class="if-diff"><div class="if-diff-line if-diff-line--removed"><span>-</span><span>No geographic handling requirement found in prior record.</span></div><div class="if-diff-line if-diff-line--added"><span>+</span><span>Supplier data residency requirement proposed for review.</span></div></div></section>
        <section id="review-history" role="tabpanel" class="if-tab-panel" hidden><ol class="if-timeline"><li class="if-timeline__item"><strong>Extracted</strong><span>Extraction Agent v2.3</span></li><li class="if-timeline__item"><strong>Validated</strong><span>Relationship Agent v1.7</span></li></ol></section>
      </div>
      <label class="if-field"><span class="if-field__label">Reviewer Notes</span><textarea class="if-textarea" placeholder="Add notes for your decision..."></textarea></label>
    </div>
  `;
  init(detail);
}

function renderSearch() {
  const clauses = document.querySelector("[data-demo-clauses]");
  const results = document.querySelector("[data-demo-search-results]");
  const count = document.querySelector("[data-demo-result-count]");
  if (!clauses || !results) return;
  clauses.innerHTML = demoState.clauses.map((clause, index) => `
    <div class="if-list-item">
      <span class="if-badge">${index + 1}</span>
      <select class="if-select"><option>${demoEscape(clause[0])}</option><option>CONTAINS</option><option>CITED BY</option><option>RELATIONSHIP TYPE</option></select>
      <input class="if-input" value="${demoEscape(clause[1])}">
      <select class="if-select"><option>${demoEscape(clause[2])}</option></select>
      <button class="if-icon-btn" type="button" data-demo-remove-clause="${index}" title="Remove clause">-</button>
    </div>
  `).join("");
  results.innerHTML = demoState.searchResults.map((row) => `
    <tr><td><input type="checkbox" aria-label="Select result"></td><td><span class="if-row-title"><strong>${demoEscape(row[0])}</strong><span>Matched snippets include zero trust and cloud migration terms.</span></span></td><td>${demoEscape(row[1])}</td><td>${demoEscape(row[2])}</td><td>${demoEscape(row[3])}</td><td>${demoBadge(row[4], "confidence")}</td><td>${demoEscape(row[5])}</td><td><button class="if-icon-btn" title="Open">></button></td></tr>
  `).join("");
  if (count) count.textContent = `${demoState.searchResults.length.toLocaleString()} Results`;
}

function handleDemoClick(event) {
  const toggle = event.target.closest("[data-demo-toggle-widget]");
  if (toggle) {
    const id = toggle.dataset.demoToggleWidget;
    const widget = demoState.widgets.find((item) => item.id === id);
    if (widget) {
      widget.visible = toggle.matches("input") ? toggle.checked : !widget.visible;
      renderWorkspace();
    }
    return;
  }

  const action = event.target.closest("[data-demo-action]")?.dataset.demoAction;
  if (!action) return;
  if (action === "add-widget") {
    const hidden = demoState.widgets.find((widget) => !widget.visible);
    if (hidden) hidden.visible = true;
    demoToast(hidden ? `${hidden.title} added` : "All widgets are already on the canvas", hidden ? "success" : "info");
    renderWorkspace();
  }
  if (action === "reset-layout") {
    demoState.widgets.forEach((widget) => { widget.visible = true; widget.size = widget.id === "review" || widget.id === "sources" ? "Large" : "Medium"; });
    demoToast("Workspace layout restored", "success");
    renderWorkspace();
  }
  if (action === "save-settings") demoToast("Workspace settings saved", "success");
  if (action === "run-all") demoToast("All agents started. Audit log updated.", "success");
  if (action === "pause-agent") demoToast("Implementation Gap Agent paused", "warning");
  if (action === "promote-source") demoToast("Candidate source promoted for review", "success");
  if (action === "run-source") demoToast("Source refresh queued", "success");
  if (action === "edit-source") demoToast("Source editor opened", "info");
  if (action === "add-clause") {
    demoState.clauses.push(["CONTAINS", "new policy term", "Any Field"]);
    renderSearch();
    demoToast("Clause added", "success");
  }
  if (action === "run-search") {
    demoToast("Search executed against indexed policy intelligence", "success");
  }
}

function handleDemoInput(event) {
  if (event.target.matches("[data-demo-widget-size]")) {
    const widget = demoState.widgets.find((item) => item.id === event.target.dataset.demoWidgetSize);
    if (widget) {
      widget.size = event.target.value;
      renderWorkspace();
    }
  }
  if (event.target.matches("[data-demo-density]")) {
    document.querySelector(".if-shell")?.setAttribute("data-density", event.target.value);
  }
  if (event.target.matches("[data-demo-theme]")) {
    const shell = document.querySelector(".if-shell");
    if (window.InterfaceFramework?.setTheme) {
      window.InterfaceFramework.setTheme(event.target.value || "system");
    } else if (shell) {
      if (event.target.value) document.documentElement.setAttribute("data-theme", event.target.value);
      else document.documentElement.removeAttribute("data-theme");
    }
  }
  if (event.target.matches("[data-demo-threshold]")) {
    const label = document.querySelector("[data-demo-threshold-label]");
    if (label) label.textContent = `${event.target.value}%`;
  }
}

function handleDemoChange(event) {
  const row = event.target.closest("[data-demo-finding]");
  if (row) {
    demoState.findings.forEach((finding) => { finding.selected = finding.id === row.dataset.demoFinding; });
    renderReview();
  }
}

function handleDemoReviewAction(event) {
  const button = event.target.closest("[data-demo-review-action]");
  if (!button) return;
  const selected = demoState.findings.find((finding) => finding.selected) || demoState.findings[0];
  selected.status = button.dataset.demoReviewAction;
  demoToast(`${selected.id} marked ${selected.status}`, selected.status === "Rejected" ? "warning" : "success");
  renderReview();
}

function initDemo() {
  renderWorkspace();
  renderSources();
  renderVirtualPolicyTable();
  renderIngestIntelligence();
  renderReview();
  renderSearch();
  document.addEventListener("click", handleDemoClick);
  document.addEventListener("click", handleDemoReviewAction);
  document.addEventListener("input", handleDemoInput);
  document.addEventListener("change", handleDemoChange);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDemo);
  } else {
    initDemo();
  }
}

})();
