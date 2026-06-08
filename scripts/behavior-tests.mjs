import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = readFileSync(resolve(root, "src/js/index.js"), "utf8");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function extractFunction(name) {
  const start = source.search(new RegExp(`\\bfunction\\s+${name}\\s*\\(`));
  assert(start >= 0, `Missing function ${name}`);
  if (start < 0) return "";
  const headerEnd = source.indexOf(") {", start);
  const braceStart = headerEnd >= 0 ? headerEnd + 2 : source.indexOf("{", start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  assert(false, `Unable to extract function ${name}`);
  return "";
}

const tooltipHarness = [
  "toFiniteNumber",
  "clamp",
  "getVisibleArea",
  "computeTooltipPosition"
].map(extractFunction).join("\n");
const computeTooltipPosition = Function(`${tooltipHarness}\nreturn computeTooltipPosition;`)();

function rect(left, top, width, height) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

function testTooltipPositioning() {
  const viewport = { width: 800, height: 600 };
  const tip = { width: 160, height: 48 };

  const top = computeTooltipPosition(rect(320, 240, 44, 32), tip, viewport, { preferred: "top", offset: 12, margin: 10 });
  assert(top.placement === "top", "Tooltip should keep preferred top placement when it fits.");
  assert(top.top >= 10 && top.left >= 10, "Top placement should remain inside viewport margins.");

  const flippedBottom = computeTooltipPosition(rect(320, 8, 44, 32), tip, viewport, { preferred: "top", offset: 12, margin: 10 });
  assert(flippedBottom.placement === "bottom", "Tooltip should flip from top to bottom when top collides.");

  const flippedLeft = computeTooltipPosition(rect(760, 240, 32, 32), tip, viewport, { preferred: "right", offset: 12, margin: 10 });
  assert(flippedLeft.placement === "left", "Tooltip should flip from right to left near the right viewport edge.");

  const autoTop = computeTooltipPosition(rect(320, 552, 44, 32), tip, viewport, { preferred: "auto", offset: 12, margin: 10 });
  assert(autoTop.placement === "top", "Auto tooltip should choose top near the lower viewport edge.");

  const clamped = computeTooltipPosition(rect(4, 120, 20, 20), { width: 220, height: 44 }, { width: 180, height: 220 }, { preferred: "left", offset: 12, margin: 10 });
  assert(clamped.left === 10, "Oversized tooltip should clamp to the viewport margin.");
  assert(clamped.arrowX >= 8 && clamped.arrowY >= 8, "Tooltip arrow coordinates should stay inside the tooltip body.");
}

function testEscapeStackContracts() {
  const escapeBody = extractFunction("closeTopEscapeLayer");
  const expectedOrder = [
    "isTooltipVisible",
    "getOpenAutocompleteInput",
    "getOpenMenuTrigger",
    "getOpenPopoverTrigger",
    "activeModal",
    "getOpenDrawer"
  ];
  let previousIndex = -1;
  expectedOrder.forEach((token) => {
    const index = escapeBody.indexOf(token);
    assert(index > previousIndex, `Escape stack should check ${token} after the previous layer.`);
    previousIndex = index;
  });

  [
    "hideTooltip()",
    "closeAutocomplete(autocomplete)",
    "closeMenu(openMenuTrigger, { restoreFocus: true })",
    "closePopover(openPopoverTrigger)",
    "closeModal(activeModal)",
    "closeDrawer(openDrawer)"
  ].forEach((token) => {
    assert(escapeBody.includes(token), `Escape stack missing close action: ${token}`);
  });

  const preventDefaultCount = Array.from(escapeBody.matchAll(/preventDefault/g)).length;
  assert(preventDefaultCount >= 6, "Each handled Escape layer should prevent the browser default.");

  const keydownBody = extractFunction("handleKeydown");
  assert(
    keydownBody.includes('event.key === "Escape" && closeTopEscapeLayer(event)) return'),
    "handleKeydown should delegate Escape to the top-layer stack before component keyboard handlers."
  );
}

function testDataTableApiContracts() {
  const publicTableApi = [
    "registerDataTableAdapter",
    "unregisterDataTableAdapter",
    "refreshDataTable",
    "setDataTableData",
    "resizeDataTableColumn",
    "pinDataTableColumn"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicTableApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public table function ${name}.`);
    assert(exportBlock.includes(name), `Table API ${name} should be exported from src/js/index.js.`);
  });

  const requestBody = extractFunction("requestDataTableAdapter");
  [
    "previous?.controller?.abort()",
    "new AbortController()",
    "signal: controller.signal",
    "setDataTableState(table, \"loading\"",
    "setDataTableState(table, \"error\""
  ].forEach((token) => {
    assert(requestBody.includes(token), `Server table adapter contract missing ${token}.`);
  });

  const renderBody = extractFunction("renderDataTableAdapterResult");
  assert(renderBody.includes("table.dataset.ifTableServerMode = \"true\""), "Server-rendered tables should opt into server-mode status handling.");
  assert(renderBody.includes("applyDataTable(table, { local: true })"), "Server adapter results should re-run the table renderer locally after rows are injected.");

  const virtualSpacerBody = extractFunction("ensureDataTableVirtualSpacers");
  assert(virtualSpacerBody.includes("data-if-table-virtual-spacer"), "Virtual tables should use explicit top and bottom spacer rows.");
  const virtualBody = extractFunction("applyDataTableVirtualWindow");
  [
    "ifTableWindowStart",
    "ifTableWindowEnd",
    "row.hidden = !visible"
  ].forEach((token) => {
    assert(virtualBody.includes(token), `Virtual table window contract missing ${token}.`);
  });

  const resizeBody = extractFunction("resizeDataTableColumn");
  assert(resizeBody.includes("if:table-column-resize"), "Column resizing should emit a reusable resize event.");

  const pinBody = extractFunction("pinDataTableColumn");
  assert(pinBody.includes("if:table-column-pin"), "Column pinning should emit a reusable pin event.");
  assert(pinBody.includes("ifTablePinnedColumns"), "Column pinning should keep the declarative pinned-column registry in sync.");
}

function testProductionAdapterContracts() {
  const publicAdapterApi = [
    "normalizeAdapterState",
    "setAdapterState",
    "getAdapterState",
    "runAdapterTask",
    "cancelAdapterTask",
    "getAdapterTaskState",
    "retryAdapterRequest",
    "registerExportAdapter",
    "unregisterExportAdapter",
    "cancelSurfaceExport",
    "getDocumentAnnotationSchema",
    "getDocumentAnnotationSchemas"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicAdapterApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public production adapter function ${name}.`);
    assert(exportBlock.includes(name), `Production adapter API ${name} should be exported from src/js/index.js.`);
  });

  [
    "const adapterStates = new Set",
    "\"loading\"",
    "\"success\"",
    "\"empty\"",
    "\"error\"",
    "\"cancelled\"",
    "if:adapter-state",
    "if:adapter-request",
    "if:adapter-result",
    "if:adapter-cancel",
    "if:adapter-error",
    "data-if-adapter-state",
    "data-if-adapter-status"
  ].forEach((token) => {
    assert(source.includes(token), `Shared adapter state contract missing ${token}.`);
  });

  const adapterTaskBody = extractFunction("runAdapterTask");
  [
    "new AbortController()",
    "cancelAdapterTask(element, channel, \"superseded\"",
    "setAdapterState(element, \"loading\"",
    "dispatchAdapterTaskEvent(element, channel, \"request\"",
    "getAdapterTaskResultState(result, options)",
    "setAdapterState(element, state",
    "dispatchAdapterTaskEvent(element, channel, \"result\"",
    "setAdapterState(element, \"cancelled\"",
    "dispatchAdapterTaskEvent(element, channel, \"cancel\"",
    "setAdapterState(element, \"error\"",
    "dispatchAdapterTaskEvent(element, channel, \"error\""
  ].forEach((token) => {
    assert(adapterTaskBody.includes(token), `Reusable adapter task runner missing ${token}.`);
  });

  const tableRequestBody = extractFunction("requestDataTableAdapter");
  [
    "setDataTableState(table, \"loading\"",
    "normalizeAdapterState(result.state",
    "setDataTableState(table, state",
    "setDataTableState(table, \"cancelled\"",
    "setDataTableState(table, \"error\""
  ].forEach((token) => {
    assert(tableRequestBody.includes(token), `Server table adapter states missing ${token}.`);
  });

  const autocompleteRenderBody = extractFunction("renderAutocompleteItems");
  [
    "normalizeAdapterState(state",
    "setAdapterState(input, adapterState",
    "channel: \"autocomplete\"",
    "adapterState: \"success\""
  ].forEach((token) => {
    assert(autocompleteRenderBody.includes(token), `Autocomplete adapter state contract missing ${token}.`);
  });

  const graphLayoutBody = extractFunction("runGraphLayoutEngine");
  [
    "setAdapterState(graph, \"loading\"",
    "setAdapterState(graph, \"cancelled\"",
    "setAdapterState(graph, state",
    "setAdapterState(graph, \"error\"",
    "channel: \"graph-layout\""
  ].forEach((token) => {
    assert(graphLayoutBody.includes(token), `Graph layout adapter state contract missing ${token}.`);
  });

  const exportBody = extractFunction("exportSurface");
  [
    "getExportAdapter(adapterName)",
    "new AbortController()",
    "setAdapterState(target, \"loading\"",
    "if:surface-export-request",
    "if:surface-export-result",
    "if:surface-export-cancel",
    "if:surface-export-error",
    "normalizeAdapterState(result.state"
  ].forEach((token) => {
    assert(exportBody.includes(token), `Diagram export adapter routing missing ${token}.`);
  });

  const annotationSchemaBody = extractFunction("getDocumentAnnotationSchema");
  [
    "artifactId",
    "confidence",
    "expansion",
    "lineText",
    "range",
    "source",
    "type",
    "value"
  ].forEach((token) => {
    assert(annotationSchemaBody.includes(token), `Document annotation schema missing ${token}.`);
  });

  const clickBody = extractFunction("handleClick");
  assert(clickBody.includes("[data-if-adapter-retry]"), "Click handler should route generic adapter retry controls.");
  assert(clickBody.includes("[data-if-export-cancel]"), "Click handler should route cancellable export controls.");
}

function testSearchAutocompleteCompletenessContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "getAutocompleteState",
    "hydrateAutocompleteInputs",
    "registerAutocompleteAdapter",
    "unregisterAutocompleteAdapter",
    "cancelAutocomplete",
    "renderAutocomplete"
  ].forEach((token) => {
    assert(source.includes(`function ${token}`), `Search autocomplete function missing ${token}.`);
    assert(exportBlock.includes(token), `Search autocomplete API export missing ${token}.`);
  });

  [
    "ifAutocompleteOutput",
    "data-if-autocomplete-cancel",
    "closeAutocomplete(input, { cancel: false })",
    "data-if-autocomplete-demo",
    "ifAutocompleteSelecting",
    "autocomplete: getAutocompleteState",
    "if:autocomplete-state",
    "if:autocomplete-select"
  ].forEach((token) => {
    assert(source.includes(token), `Search autocomplete behavior missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'id="component-autocomplete"',
    'if-autocomplete--reserve',
    'data-if-autocomplete-output="#component-autocomplete-output"',
    'data-if-autocomplete-demo="#component-autocomplete"',
    'data-if-autocomplete-cancel="#component-autocomplete"',
    "interface-framework.js?v="
  ].forEach((token) => {
    assert(components.includes(token), `Search autocomplete specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "AutocompleteAdapterContext",
    "AutocompleteAdapterResult",
    "AutocompleteState",
    "getAutocompleteState",
    "hydrateAutocompleteInputs",
    "data-if-autocomplete-output",
    "detail.autocomplete"
  ].forEach((token) => {
    assert(docs.includes(token), `Search autocomplete docs or manifest missing ${token}.`);
  });
}

function testDatePickerContracts() {
  const publicDateApi = [
    "selectDatePickerDate",
    "setDatePickerValue"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicDateApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public date picker function ${name}.`);
    assert(exportBlock.includes(name), `Date picker API ${name} should be exported from src/js/index.js.`);
  });

  [
    "function hydrateDatePicker",
    "function renderDatePickerGrid",
    "function moveDatePickerMonth",
    "function updateDatePickerSelection",
    "data-if-date-grid",
    "data-if-date-nav",
    "data-if-date-native",
    "data-if-date-month-label",
    "if:date-picker-change",
    "if:date-picker-month",
    "aria-current",
    "aria-label=\"${escapeHtml(formatIsoDateLabel(iso))}\"",
    "ArrowRight",
    "ArrowLeft",
    "ArrowDown",
    "ArrowUp",
    "PageUp",
    "PageDown"
  ].forEach((token) => {
    assert(source.includes(token), `Date picker contract missing ${token}.`);
  });

  const updateBody = extractFunction("updateDatePickerSelection");
  [
    "hasSelectedButton",
    "data-if-date-select^=",
    "fallback?.setAttribute(\"tabindex\", \"0\")"
  ].forEach((token) => {
    assert(updateBody.includes(token), `Date picker roving focus contract missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    "data-if-date-picker",
    "data-if-date-grid",
    "data-if-date-nav=\"prev\"",
    "data-if-date-nav=\"next\"",
    "data-if-date-nav=\"today\"",
    "data-if-date-native",
    "data-if-date-month-label",
    "data-if-date-output",
    "data-if-date-summary"
  ].forEach((token) => {
    assert(components.includes(token), `Date picker example missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/usage.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "data-if-date-grid",
    "data-if-date-nav",
    "data-if-date-native",
    "InterfaceFramework.setDatePickerValue",
    "if:date-picker-month",
    "PageUp",
    "PageDown"
  ].forEach((token) => {
    assert(docs.includes(token), `Date picker docs missing ${token}.`);
  });
}

function testGraphLayoutAdapterContracts() {
  const publicGraphApi = [
    "registerGraphLayoutEngine",
    "unregisterGraphLayoutEngine",
    "runGraphLayoutEngine",
    "collectGraphLayoutInput",
    "applyGraphLayoutResult",
    "registerGraphNodeType",
    "unregisterGraphNodeType",
    "applyGraphNodeType",
    "applyGraphNodeTypes",
    "getGraphNodeTypeConfig",
    "updateGraphA11yFallback"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicGraphApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public graph function ${name}.`);
    assert(exportBlock.includes(name), `Graph API ${name} should be exported from src/js/index.js.`);
  });

  const requestBody = extractFunction("runGraphLayoutEngine");
  [
    "previous.controller.abort()",
    "new AbortController()",
    "signal: controller.signal",
    "if:graph-layout-request",
    "if:graph-layout-cancel",
    "if:graph-layout-result",
    "if:graph-layout-error"
  ].forEach((token) => {
    assert(requestBody.includes(token), `Graph layout adapter contract missing ${token}.`);
  });

  const inputBody = extractFunction("collectGraphLayoutInput");
  [
    "nodes",
    "edges",
    "getGraphOrganizationOptions(graph)",
    "isInsideGraphA11y(edge)"
  ].forEach((token) => {
    assert(inputBody.includes(token), `Graph layout input contract missing ${token}.`);
  });

  const applyBody = extractFunction("applyGraphLayoutResult");
  [
    "normalizeGraphLayoutCoordinate",
    "deconflictGraphNodes",
    "refreshGraphGeometry",
    "if:graph-layout-apply"
  ].forEach((token) => {
    assert(applyBody.includes(token), `Graph layout result contract missing ${token}.`);
  });

  const fallbackBody = extractFunction("updateGraphA11yFallback");
  [
    "data-if-graph-a11y-summary",
    "data-if-graph-a11y-nodes",
    "data-if-graph-a11y-edges",
    "data-if-graph-traverse",
    "data-if-graph-edge"
  ].forEach((token) => {
    assert(fallbackBody.includes(token), `Graph accessibility fallback missing ${token}.`);
  });

  const geometryBody = extractFunction("updateGraphEdges");
  assert(geometryBody.includes("getGraphCoordinateScale"), "Graph edge geometry should account for rendered canvas aspect ratio.");
  const routeBody = extractFunction("getGraphEdgeRoute");
  assert(routeBody.includes("getGraphLabelAngle"), "Graph edge labels should use rendered-angle alignment.");
}

function testHierarchyStructureContracts() {
  const publicHierarchyApi = [
    "selectHierarchyNode",
    "toggleHierarchyBranch",
    "applyHierarchyStructure",
    "registerHierarchyNodeType",
    "unregisterHierarchyNodeType",
    "applyHierarchyNodeType",
    "applyHierarchyNodeTypes",
    "getHierarchyNodeTypeConfig"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicHierarchyApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public hierarchy function ${name}.`);
    assert(exportBlock.includes(name), `Hierarchy API ${name} should be exported from src/js/index.js.`);
  });

  const structureBody = extractFunction("applyHierarchyStructure");
  [
    "hierarchyParent",
    "hierarchyChildCount",
    "hierarchyLoad",
    "ensureHierarchyToggle",
    "removeHierarchyToggleForLeaf",
    "if:hierarchy-structure"
  ].forEach((token) => {
    assert(structureBody.includes(token), `Hierarchy structure contract missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/usage.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "data-hierarchy-type",
    "data-hierarchy-state",
    "if:hierarchy-structure",
    "if:hierarchy-load",
    "registerHierarchyNodeType"
  ].forEach((token) => {
    assert(docs.includes(token), `Hierarchy docs missing ${token}.`);
  });
}

function testDocumentArtifactContracts() {
  const publicDocumentApi = [
    "selectDocumentAnnotation",
    "selectDocumentArtifact",
    "setDocumentArtifactMode",
    "updateDocumentSearch"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicDocumentApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public document function ${name}.`);
    assert(exportBlock.includes(name), `Document API ${name} should be exported from src/js/index.js.`);
  });

  const annotationBody = extractFunction("selectDocumentAnnotation");
  [
    "if:doc-annotation-select",
    "is-selected",
    "is-linked",
    "is-annotation-sibling",
    "updateDocumentAnnotationPanel"
  ].forEach((token) => {
    assert(annotationBody.includes(token), `Document annotation selection missing ${token}.`);
  });

  const panelBody = extractFunction("updateDocumentAnnotationPanel");
  [
    "data-if-doc-annotation-panel",
    "data-if-doc-annotation-type",
    "data-if-doc-annotation-matches",
    "if:doc-annotation-panel"
  ].forEach((token) => {
    assert(panelBody.includes(token), `Document annotation inspector missing ${token}.`);
  });

  const modeBody = extractFunction("setDocumentArtifactMode");
  [
    "data-if-doc-mode",
    "data-if-doc-mode-current",
    "if:doc-mode-change",
    "split",
    "hydrateLazyEmbeds"
  ].forEach((token) => {
    assert(modeBody.includes(token), `Document artifact mode contract missing ${token}.`);
  });
}

function testKeyboardAndReviewerWorkflowContracts() {
  const publicWorkflowApi = [
    "getKeyboardModel",
    "hydrateKeyboardModel",
    "renderReviewWorkflow",
    "getReviewWorkflow",
    "getReviewWorkflowState",
    "selectReviewWorkflowItem",
    "applyReviewWorkflowAction",
    "updateReviewWorkflow",
    "hydrateReviewWorkflows"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicWorkflowApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public keyboard/reviewer function ${name}.`);
    assert(exportBlock.includes(name), `Keyboard/reviewer API ${name} should be exported from src/js/index.js.`);
  });

  assert(source.includes("const keyboardModel = {"), "Framework should define a formal keyboard model.");
  [
    "global",
    "menus",
    "tabs",
    "tables",
    "graphs",
    "documents",
    "reviewer",
    "Escape",
    "ArrowDown / ArrowRight",
    "Approve selected item"
  ].forEach((token) => {
    assert(source.includes(token), `Keyboard model missing ${token}.`);
  });

  const keyboardRenderBody = extractFunction("renderKeyboardModel");
  [
    "ifKeyboardModel",
    "if-keyboard-model__group",
    "if-keyboard-model__item",
    "escapeHtml(row.keys)"
  ].forEach((token) => {
    assert(keyboardRenderBody.includes(token), `Keyboard renderer missing ${token}.`);
  });

  const workflowActionBody = extractFunction("applyReviewWorkflowAction");
  [
    "data-if-review-reason",
    "data-if-review-item-status",
    "appendReviewLedger",
    "updateReviewWorkflow(workflow)",
    "if:review-workflow-action",
    "previousStatus",
    "state: getReviewWorkflowState(workflow)",
    "showToast"
  ].forEach((token) => {
    assert(workflowActionBody.includes(token), `Reviewer workflow action contract missing ${token}.`);
  });

  const workflowKeydownBody = extractFunction("handleReviewWorkflowKeydown");
  [
    "ArrowDown",
    "ArrowRight",
    "ArrowUp",
    "ArrowLeft",
    "Home",
    "End",
    "approve",
    "reject",
    "escalate",
    "data-if-review-reason"
  ].forEach((token) => {
    assert(workflowKeydownBody.includes(token), `Reviewer keyboard contract missing ${token}.`);
  });

  assert(source.includes('name: "keyboard"'), "Behavior registry should expose a keyboard module.");
  assert(source.includes("hydrateKeyboardModel(root)"), "Keyboard behavior module should hydrate keyboard model render targets.");
  assert(source.includes('name: "review-workflows"'), "Behavior registry should expose a review-workflows module.");
  assert(source.includes("hydrateReviewWorkflows(root)"), "Review workflow behavior module should hydrate reviewer workflow roots.");

  const clickBody = extractFunction("handleClick");
  assert(clickBody.includes("[data-if-review-action]"), "Click handler should route review action controls.");
  assert(clickBody.includes("[data-if-review-item]"), "Click handler should route review item selection.");
}

function testReviewWorkflowStructuredContracts() {
  [
    "function renderReviewWorkflow",
    "function normalizeReviewWorkflowDocument",
    "function getReviewWorkflowConfig",
    "function getReviewWorkflowState",
    "data-if-review-workflow-source",
    "data-if-review-workflow-json",
    "if-review-workflow__summary",
    "if-review-workflow__ledger"
  ].forEach((token) => {
    assert(source.includes(token), `Review workflow structured behavior missing ${token}.`);
  });

  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "renderReviewWorkflow",
    "getReviewWorkflow",
    "getReviewWorkflowState",
    "hydrateReviewWorkflows"
  ].forEach((token) => {
    assert(exportBlock.includes(token), `Review workflow API export missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    "id=\"review-workflow\"",
    "id=\"component-review-workflow\"",
    "data-if-review-workflow-source=\"#component-review-workflow-data\"",
    "\"CF-2025-1187-001\"",
    "\"actions\"",
    "\"items\""
  ].forEach((token) => {
    assert(components.includes(token), `Review workflow specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}`;
  [
    "renderReviewWorkflow",
    "getReviewWorkflowState",
    "data-if-review-workflow-source",
    "ReviewWorkflowDocument",
    "{ id, item, state }",
    "{ action, id, item, previousStatus, reason, state, status }"
  ].forEach((token) => {
    assert(docs.includes(token), `Review workflow docs/manifest missing ${token}.`);
  });
}

function testExportAndConnectorRoutingContracts() {
  const publicConnectorApi = [
    "collectConnectorRoutes",
    "computeConnectorRoute",
    "applyConnectorRoutes",
    "refreshConnectorRoutes",
    "hydrateConnectorRoutes",
    "selectDiagramConnectorRoute",
    "setDiagramConnectorRoute",
    "updateSelectedDiagramRoute"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicConnectorApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing connector routing function ${name}.`);
    assert(exportBlock.includes(name), `Connector routing API ${name} should be exported from src/js/index.js.`);
  });

  const collectBody = extractFunction("collectConnectorRoutes");
  [
    "data-if-connector-node",
    "data-if-connector-route",
    "ifConnectorFrom",
    "ifConnectorTo",
    "ifConnectorStyle",
    "ifConnectorTone",
    "ifConnectorFromAnchor",
    "ifConnectorToAnchor",
    "ifConnectorWaypoints"
  ].forEach((token) => {
    assert(collectBody.includes(token), `Connector collection contract missing ${token}.`);
  });

  const computeBody = extractFunction("computeConnectorRoute");
  [
    "direct",
    "orthogonal",
    "elbow",
    "curved",
    "getConnectorObstacleRects",
    "parseConnectorWaypoints",
    "inferConnectorAnchors",
    "surfaceSize"
  ].forEach((token) => {
    assert(computeBody.includes(token), `Connector routing geometry missing ${token}.`);
  });

  const applyBody = extractFunction("applyConnectorRoutes");
  [
    "ensureConnectorLayer",
    "marker-end",
    "if-connector-route-label",
    "data-if-connector-label-node",
    "if:connector-routes"
  ].forEach((token) => {
    assert(applyBody.includes(token), `Connector route renderer missing ${token}.`);
  });

  const routeEditBody = extractFunction("setDiagramConnectorRoute");
  [
    "ifConnectorLabel",
    "ifConnectorStyle",
    "ifConnectorTone",
    "ifConnectorFromAnchor",
    "ifConnectorToAnchor",
    "ifConnectorAvoid",
    "ifConnectorWaypoints",
    "if:diagram-route-edit",
    "if:connector-route-edit"
  ].forEach((token) => {
    assert(routeEditBody.includes(token), `Connector route editing contract missing ${token}.`);
  });

  const pdfBody = extractFunction("buildPdfFromCanvas");
  [
    "%PDF-1.4",
    "DCTDecode",
    "/Subtype /Image",
    "/MediaBox",
    "startxref"
  ].forEach((token) => {
    assert(pdfBody.includes(token), `PDF export builder missing ${token}.`);
  });

  const surfacePdfBody = extractFunction("exportSurfaceAsPdf");
  assert(surfacePdfBody.includes("buildPdfFromCanvas"), "PDF export should generate a downloadable PDF artifact.");
  assert(!surfacePdfBody.includes("window.print"), "PDF export should not rely on the browser print dialog.");

  assert(source.includes('name: "diagrams"'), "Behavior registry should expose a diagrams module.");
  assert(source.includes("hydrateConnectorRoutes(root)"), "Diagrams behavior module should hydrate connector routing surfaces.");
  assert(source.includes("window.removeEventListener(\"resize\", handleResize)"), "Events behavior module should remove the connector resize listener.");
}

function testDomainSealIconContracts() {
  const sealIcons = [
    "sealDod",
    "sealDepartmentOfWar",
    "sealArmy",
    "sealNavy",
    "sealMarineCorps",
    "sealAirForce",
    "sealSpaceForce",
    "sealCoastGuard",
    "sealNationalGuard",
    "sealCisa",
    "sealDisa",
    "sealNsa",
    "sealNist",
    "sealFederalRegister",
    "sealCongress",
    "sealSecnav"
  ];
  sealIcons.forEach((name) => {
    assert(source.includes(`${name}:`), `Missing seal-style domain icon ${name}.`);
  });

  const categoryBody = extractFunction("getIconCategory");
  assert(categoryBody.includes("toLowerCase().includes(\"seal\")"), "Seal-style icons should be grouped under the Domain icon category.");

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  sealIcons.forEach((name) => {
    assert(components.includes(`data-if-icon="${name}"`), `Design system should showcase ${name}.`);
  });
}

function testThemeContracts() {
  const publicThemeApi = [
    "setTheme",
    "getTheme",
    "hydrateThemeControls"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicThemeApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public theme function ${name}.`);
    assert(exportBlock.includes(name), `Theme API ${name} should be exported from src/js/index.js.`);
  });

  const setThemeBody = extractFunction("setTheme");
  [
    "storeTheme(normalized)",
    "if:theme-change",
    "updateThemeControls"
  ].forEach((token) => {
    assert(setThemeBody.includes(token), `Theme setter contract missing ${token}.`);
  });

  const hydrateBody = extractFunction("hydrateThemeControls");
  [
    "getStoredTheme()",
    "defaultTheme",
    "data-if-theme-control",
    "updateThemeControls"
  ].forEach((token) => {
    assert(hydrateBody.includes(token), `Theme hydration contract missing ${token}.`);
  });

  const normalizeThemeBody = extractFunction("normalizeTheme");
  const applyThemeBody = extractFunction("applyThemeToTarget");
  assert(source.includes('const defaultTheme = "light";'), "Theme default should be explicitly light.");
  assert(normalizeThemeBody.includes("return defaultTheme"), "Theme normalization should fall back to the light default.");
  assert(applyThemeBody.includes('setAttribute("data-theme", normalized)'), "Theme application should make system/light choices explicit.");

  const themesCss = readFileSync(resolve(root, "src/styles/themes.css"), "utf8");
  [
    '[data-theme="dark"]',
    '[data-theme="midnight"]',
    '[data-theme="high-contrast"]',
    '@media (prefers-color-scheme: dark)',
    '@media (forced-colors: active)'
  ].forEach((token) => {
    assert(themesCss.includes(token), `Theme CSS missing ${token}.`);
  });
  assert(!themesCss.includes(":root:not([data-theme])"), "No-theme CSS should remain light by default instead of following OS dark mode.");

  const themeDocs = readFileSync(resolve(root, "docs/themes.md"), "utf8");
  [
    "Built-In Themes",
    "Default enterprise policy interface",
    "High contrast",
    "JavaScript Controls",
    "Token Contract",
    "Creating A Custom Theme",
    "Accessibility Guidance"
  ].forEach((token) => {
    assert(themeDocs.includes(token), `Theme docs missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'data-if-theme="light"',
    'data-if-theme="high-contrast"',
    "if-account-theme-control",
    "Current: <strong data-if-theme-label>Light</strong>"
  ].forEach((token) => {
    assert(components.includes(token), `Theme showcase/account surface missing ${token}.`);
  });
}

function testConfigurableShowcaseContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "renderConfigurationDemo",
    "hydrateConfigurationControls",
    "hydrateComponentInventories",
    "hydrateComponentInventoryManifest",
    "getConfigurationState",
    "getComponentInventoryState",
    "getComponentInventoryViewState",
    "applyComponentInventoryViewState",
    "applyComponentInventoryPreset",
    "clearComponentInventoryFilter",
    "getComponentInventoryReadinessReport",
    "getComponentInventoryReadinessScorecard",
    "getComponentInventoryReadinessActions",
    "getComponentInventoryEvidenceMatrix",
    "getComponentInventoryCapabilityCoverage",
    "getComponentInventoryReadinessSnapshot",
    "getComponentInventoryReleaseGate",
    "getComponentInventoryRiskRegister",
    "setComponentInventoryCapabilityFilter",
    "setComponentInventoryCategoryFilter",
    "applyComponentInventoryFilters",
    "selectComponentInventoryCard",
    "moveComponentInventorySelection",
    "setControlVariable",
    "setDemoState"
  ].forEach((token) => {
    assert(source.includes(`function ${token}`), `Configuration demo function missing ${token}.`);
    assert(exportBlock.includes(token), `Configuration demo API export missing ${token}.`);
  });

  [
    "data-if-component-inventory-filter",
    "data-if-component-inventory-active-filters",
    "data-if-component-inventory-clear-filter",
    "data-if-component-inventory-category",
    "data-if-component-inventory-category-set",
    "data-if-component-inventory-category-value",
    "data-if-component-inventory-capability",
    "data-if-component-inventory-capability-set",
    "data-if-component-inventory-capability-value",
    "data-if-component-inventory-status",
    "data-if-component-inventory-risk",
    "data-if-component-inventory-sort",
    "data-if-component-inventory-preset",
    "data-if-component-inventory-preset-value",
    "data-if-component-inventory-motion",
    "data-if-component-inventory-select",
    "data-if-component-inventory-select-id",
    "data-if-component-inventory-detail",
    "data-if-component-inventory-selected-title",
    "ifComponentManifest",
    "getComponentInventoryActiveFilters",
    "renderComponentInventoryActiveFilters",
    "if:component-inventory-manifest",
    "if:component-inventory-manifest-error",
    "getComponentInventoryEvidence",
    "data-if-component-inventory-evidence-average",
    "data-if-component-inventory-report",
    "data-if-component-inventory-release-gate",
    "data-if-component-inventory-risk-register",
    "data-if-component-inventory-scorecard",
    "data-if-component-inventory-actions",
    "data-if-component-inventory-deficiency-source",
    "data-if-component-inventory-deficiency-assessment",
    "data-if-component-inventory-evidence-matrix",
    "data-if-component-inventory-capability-coverage",
    "data-if-component-inventory-view-state",
    "data-if-component-inventory-snapshot",
    "data-if-component-inventory-card-readiness",
    "data-if-component-inventory-selected-use",
    "data-if-component-inventory-selected-avoid",
    "data-if-component-inventory-selected-recipes",
    "data-if-component-inventory-selected-actions",
    "data-if-component-inventory-selected-score",
    "renderComponentInventorySelectedActions",
    "renderComponentInventoryReadinessReport",
    "setComponentInventoryCategoryFilter",
    "setComponentInventoryCapabilityFilter",
    "applyComponentInventoryPreset",
    "getComponentInventoryPresetDefinitions",
    "syncComponentInventoryPresetControls",
    "sortComponentInventoryCards",
    "getComponentInventorySortComparator",
    "getComponentInventorySortLabel",
    "setComponentInventoryMotionState",
    "pulseComponentInventorySelection",
    "getVisibleComponentInventoryCards",
    "handleComponentInventoryKeydown",
    "moveComponentInventorySelection",
    "renderComponentInventoryReadinessScorecard",
    "renderComponentInventoryReadinessActions",
    "getComponentInventoryDeficiencyBacklog",
    "getComponentInventoryDeficiencyAssessment",
    "renderComponentInventoryDeficiencyAssessment",
    "renderComponentInventoryEvidenceMatrix",
    "renderComponentInventoryCapabilityCoverage",
    "renderComponentInventoryViewState",
    "renderComponentInventoryReadinessSnapshot",
    "renderComponentInventoryReleaseGate",
    "renderComponentInventoryRiskRegister",
    "renderComponentInventoryCardReadiness",
    "updateComponentInventoryCardReadiness",
    "renderComponentInventoryList",
    "if:component-inventory-filter",
    "if:component-inventory-select",
    "getComponentInventoryCardData(card)"
  ].forEach((token) => {
    assert(source.includes(token), `Component inventory readiness behavior missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'id="component-showcases"',
    'data-if-component-inventory-scope',
    'data-if-component-inventory-filter="#component-matrix-preview"',
    'data-if-component-inventory-active-filters',
    'data-if-component-inventory-category="#component-matrix-preview"',
    'data-if-component-inventory-category-set="#component-matrix-preview"',
    'data-if-component-inventory-category-value="Layout"',
    'data-if-component-inventory-capability="#component-matrix-preview"',
    'data-if-component-inventory-capability-set="#component-matrix-preview"',
    'data-if-component-inventory-capability-value="scriptability"',
    'data-if-component-inventory-status="#component-matrix-preview"',
    'data-if-component-inventory-risk="#component-matrix-preview"',
    'data-if-component-inventory-sort="#component-matrix-preview"',
    'data-if-component-inventory-preset="#component-matrix-preview"',
    'data-if-component-inventory-preset-value="most-deficient"',
    'data-if-component-inventory-preset-value="release-blockers"',
    'data-if-component-inventory-select="#component-matrix-preview"',
    'data-if-component-inventory-select-id="performance-scale-lab"',
    'data-if-component-inventory-count',
    'data-if-component-inventory-detail',
    'data-if-component-manifest="../docs/component-manifest.json"',
    'data-if-component-inventory-selected-title',
    'data-if-component-inventory-selected-classes',
    'data-if-component-inventory-selected-attributes',
    'data-if-component-inventory-selected-apis',
    'data-if-component-inventory-selected-events',
    'data-if-component-inventory-selected-a11y',
    'data-if-component-inventory-selected-use',
    'data-if-component-inventory-selected-avoid',
    'data-if-component-inventory-selected-recipes',
    'data-if-component-inventory-selected-actions',
    'data-if-component-inventory-evidence-average',
    'data-if-component-inventory-report',
    'data-if-component-inventory-release-gate',
    'data-if-component-inventory-risk-register',
    'data-if-component-inventory-scorecard',
    'data-if-component-inventory-actions',
    'data-if-component-inventory-deficiency-source="#component-deficiency-backlog"',
    'data-if-component-inventory-deficiency-assessment',
    'data-if-component-inventory-evidence-matrix',
    'data-if-component-inventory-capability-coverage',
    'data-if-component-inventory-view-state',
    'data-if-component-inventory-snapshot',
    'data-if-component-inventory-selected-score',
    'data-if-component-inventory-selected-evidence',
    'data-if-component-inventory-selected-missing',
    'data-if-component-inventory-selected-link',
    'data-if-component-inventory-empty',
    'if-readiness-ledger',
    'id="configurable-showcase-preview"',
    'id="configuration-contract-demo"',
    'data-if-config-demo-source="#configuration-contract-demo-data"',
    '"Generated configuration contract"',
    'data-if-control-target="#configurable-showcase-preview"',
    'data-if-control-output="#showcase-density-output"',
    'data-if-demo-target="#configurable-showcase-preview"',
    'data-if-demo-state-prefix="if-showcase-state--"',
    'data-if-demo-state="operational"',
    'data-if-demo-state="review"',
    'data-if-demo-state="blocked"',
    'data-if-demo-state="executive"'
  ].forEach((token) => {
    assert(components.includes(token), `Configurable showcase markup missing ${token}.`);
  });

  [
    'class="if-input" type="search" placeholder="Search tables, diagrams, docs..." data-if-component-inventory-filter="#component-matrix-preview"',
    'class="if-select" data-if-component-inventory-category="#component-matrix-preview"',
    'class="if-select" data-if-component-inventory-capability="#component-matrix-preview"',
    'class="if-select" data-if-component-inventory-status="#component-matrix-preview"',
    'class="if-select" data-if-component-inventory-risk="#component-matrix-preview"',
    'class="if-select" data-if-component-inventory-sort="#component-matrix-preview"'
  ].forEach((token) => {
    assert(components.includes(token), `Inventory live coverage control should use shared form primitive: ${token}.`);
  });

  [
    "--showcase-density",
    "--showcase-radius",
    "--showcase-accent-width",
    "--showcase-elevation",
    "--showcase-progress"
  ].forEach((token) => {
    assert(components.includes(`data-if-control-var="${token}"`), `Configurable showcase missing control for ${token}.`);
  });

  const styles = readFileSync(resolve(root, "src/styles/components.css"), "utf8");
  [
    ".if-config-demo",
    ".if-showcase-lab",
    ".if-showcase-preview",
    ".if-showcase-preview.if-showcase-state--operational",
    ".if-showcase-preview.if-showcase-state--review",
    ".if-showcase-preview.if-showcase-state--blocked",
    ".if-showcase-preview.if-showcase-state--executive",
    ".if-component-inventory-filter",
    ".if-component-inventory-active-filters",
    ".if-component-inventory-filter-chip",
    ".if-component-inventory-detail",
    ".if-component-inventory-detail__contract",
    "p[data-if-component-inventory-selected-actions]",
    ".if-component-inventory-evidence",
    ".if-component-inventory-evidence__bar",
    ".if-component-inventory-report",
    ".if-component-inventory-report__row",
    ".if-component-inventory-report__row > div:first-child .if-btn",
    ".if-component-inventory-release-gate",
    ".if-component-inventory-release-gate__meter",
    ".if-component-inventory-risk-register",
    ".if-component-inventory-risk-register__group",
    ".if-component-inventory-risk-register__group li .if-btn",
    ".if-component-inventory-scorecard",
    ".if-component-inventory-scorecard__meter",
    ".if-component-inventory-actions",
    ".if-component-inventory-actions__item",
    ".if-component-inventory-actions__item > div .if-btn",
    ".if-component-inventory-deficiency",
    ".if-component-inventory-deficiency__item",
    ".if-component-inventory-deficiency__capabilities",
    ".if-component-inventory-evidence-matrix",
    ".if-component-inventory-evidence-matrix__row",
    ".if-component-inventory-capability-coverage",
    ".if-component-inventory-capability-coverage__row",
    ".if-component-inventory-capability-coverage__row > .if-btn",
    ".if-component-inventory-capability-coverage__meter",
    ".if-component-inventory-view-state",
    ".if-component-inventory-view-state__header",
    ".if-component-inventory-snapshot",
    ".if-component-inventory-snapshot__header",
    ".if-component-family-card__readiness",
    ".if-component-family-card__readiness-meter",
    ".if-component-family-card.is-selected",
    ".if-component-family-card.is-selection-pulse",
    "if-component-inventory-filter-in",
    "if-component-inventory-selection-pulse",
    "prefers-reduced-motion: reduce",
    ".if-component-inventory-empty",
    ".if-readiness-ledger",
    "width: var(--showcase-progress)"
  ].forEach((token) => {
    assert(styles.includes(token), `Configurable showcase CSS missing ${token}.`);
  });

  const componentDocs = readFileSync(resolve(root, "docs/components.md"), "utf8");
  const designDocs = readFileSync(resolve(root, "docs/design-system.md"), "utf8");
  const usageDocs = readFileSync(resolve(root, "docs/usage.md"), "utf8");
  const apiDocs = readFileSync(resolve(root, "docs/component-api.md"), "utf8");
  const schemaDocs = readFileSync(resolve(root, "docs/data-schemas.md"), "utf8");
  const manifestDocs = readFileSync(resolve(root, "docs/component-manifest.json"), "utf8");
  assert(componentDocs.includes(".if-showcase-lab"), "Component docs should document configurable showcase classes.");
  assert(componentDocs.includes('data-if-demo-state-prefix="if-showcase-state--"'), "Component docs should document showcase state prefix usage.");
  assert(componentDocs.includes("renderConfigurationDemo"), "Component docs should document generated configuration demos.");
  assert(componentDocs.includes("getComponentInventoryState"), "Component docs should document inventory readiness state.");
  assert(componentDocs.includes("getComponentInventoryViewState"), "Component docs should document inventory compact view state.");
  assert(componentDocs.includes("applyComponentInventoryViewState"), "Component docs should document inventory view state replay.");
  assert(componentDocs.includes("applyComponentInventoryPreset"), "Component docs should document inventory presets.");
  assert(componentDocs.includes("clearComponentInventoryFilter"), "Component docs should document inventory filter chip helpers.");
  assert(componentDocs.includes("getComponentInventoryReadinessReport"), "Component docs should document inventory readiness reports.");
  assert(componentDocs.includes("setComponentInventoryCategoryFilter"), "Component docs should document inventory category drilldown helpers.");
  assert(componentDocs.includes("setComponentInventoryCapabilityFilter"), "Component docs should document inventory capability drilldown helpers.");
  assert(componentDocs.includes("getComponentInventoryReadinessScorecard"), "Component docs should document inventory readiness scorecards.");
  assert(componentDocs.includes("getComponentInventoryReadinessActions"), "Component docs should document inventory readiness actions.");
  assert(componentDocs.includes("getComponentInventoryDeficiencyAssessment"), "Component docs should document inventory deficiency assessments.");
  assert(componentDocs.includes("getComponentInventoryDeficiencyBacklog"), "Component docs should document inventory deficiency backlog helpers.");
  assert(componentDocs.includes("getComponentInventoryEvidenceMatrix"), "Component docs should document inventory evidence matrix.");
  assert(componentDocs.includes("getComponentInventoryCapabilityCoverage"), "Component docs should document inventory capability coverage.");
  assert(componentDocs.includes("getComponentInventoryReadinessSnapshot"), "Component docs should document inventory readiness snapshots.");
  assert(componentDocs.includes("getComponentInventoryReleaseGate"), "Component docs should document inventory release gates.");
  assert(componentDocs.includes("getComponentInventoryRiskRegister"), "Component docs should document inventory risk registers.");
  assert(componentDocs.includes("selectComponentInventoryCard"), "Component docs should document inventory selection API.");
  assert(componentDocs.includes("moveComponentInventorySelection"), "Component docs should document inventory keyboard movement API.");
  assert(componentDocs.includes("data-if-component-manifest"), "Component docs should document manifest-backed inventory enrichment.");
  assert(apiDocs.includes("getConfigurationState"), "Component API docs should list configuration state API.");
  assert(apiDocs.includes("if:component-inventory-filter"), "Component API docs should list inventory filter event.");
  assert(apiDocs.includes("data-if-component-inventory-active-filters"), "Component API docs should list active filter chip slots.");
  assert(apiDocs.includes("clearComponentInventoryFilter"), "Component API docs should list active filter clear helper.");
  assert(apiDocs.includes("if:component-inventory-select"), "Component API docs should list inventory selection event.");
  assert(apiDocs.includes("data-if-component-inventory-evidence-average"), "Component API docs should list inventory evidence rollups.");
  assert(apiDocs.includes("data-if-component-inventory-report"), "Component API docs should list inventory report slots.");
  assert(apiDocs.includes("data-if-component-inventory-release-gate"), "Component API docs should list inventory release gate slots.");
  assert(apiDocs.includes("data-if-component-inventory-scorecard"), "Component API docs should list inventory scorecard slots.");
  assert(apiDocs.includes("getComponentInventoryReadinessScorecard"), "Component API docs should list inventory scorecard helper.");
  assert(apiDocs.includes("data-if-component-inventory-deficiency-assessment"), "Component API docs should list inventory deficiency assessment slots.");
  assert(apiDocs.includes("data-if-component-inventory-deficiency-source"), "Component API docs should list inventory deficiency backlog sources.");
  assert(apiDocs.includes("getComponentInventoryDeficiencyAssessment"), "Component API docs should list inventory deficiency assessment helper.");
  assert(apiDocs.includes("getComponentInventoryDeficiencyBacklog"), "Component API docs should list inventory deficiency backlog helper.");
  assert(apiDocs.includes("getComponentInventoryCapabilityCoverage"), "Component API docs should list inventory capability coverage helper.");
  assert(apiDocs.includes("moveComponentInventorySelection"), "Component API docs should list inventory movement helper.");
  assert(apiDocs.includes("data-if-component-inventory-risk-register"), "Component API docs should list inventory risk register slots.");
  assert(apiDocs.includes("data-if-component-inventory-risk"), "Component API docs should list inventory risk filters.");
  assert(apiDocs.includes("data-if-component-inventory-sort"), "Component API docs should list inventory sort controls.");
  assert(apiDocs.includes("data-if-component-inventory-preset"), "Component API docs should list inventory preset controls.");
  assert(apiDocs.includes("applyComponentInventoryPreset"), "Component API docs should list inventory preset helper.");
  assert(apiDocs.includes("data-if-component-inventory-motion"), "Component API docs should list inventory motion state.");
  assert(apiDocs.includes("data-if-component-inventory-category-set"), "Component API docs should list category drilldown controls.");
  assert(apiDocs.includes("setComponentInventoryCategoryFilter"), "Component API docs should list category drilldown helper.");
  assert(apiDocs.includes("data-if-component-inventory-capability"), "Component API docs should list capability gap filters.");
  assert(apiDocs.includes("setComponentInventoryCapabilityFilter"), "Component API docs should list capability drilldown helper.");
  assert(apiDocs.includes("data-if-component-inventory-select-id"), "Component API docs should list inventory select controls.");
  assert(apiDocs.includes("data-if-component-inventory-actions"), "Component API docs should list inventory action slots.");
  assert(apiDocs.includes("data-if-component-inventory-evidence-matrix"), "Component API docs should list inventory evidence matrix slots.");
  assert(apiDocs.includes("data-if-component-inventory-capability-coverage"), "Component API docs should list inventory capability coverage slots.");
  assert(apiDocs.includes("data-if-component-inventory-snapshot"), "Component API docs should list inventory snapshot slots.");
  assert(apiDocs.includes("data-if-component-inventory-view-state"), "Component API docs should list inventory view state slots.");
  assert(apiDocs.includes("getComponentInventoryViewState"), "Component API docs should list inventory view state helper.");
  assert(apiDocs.includes("applyComponentInventoryViewState"), "Component API docs should list inventory view state replay helper.");
  assert(apiDocs.includes("data-if-component-inventory-card-readiness"), "Component API docs should list card readiness slots.");
  assert(apiDocs.includes("selected-use"), "Component API docs should list selected use guidance slots.");
  assert(apiDocs.includes("selected-avoid"), "Component API docs should list selected avoid guidance slots.");
  assert(apiDocs.includes("selected-recipes"), "Component API docs should list selected recipe slots.");
  assert(apiDocs.includes("selected-actions"), "Component API docs should list selected action slots.");
  assert(schemaDocs.includes("ConfigurationDemoDocument"), "Data schema docs should include configuration demo JSON.");
  assert(manifestDocs.includes("data-if-config-demo-source"), "Manifest should list structured config demo source.");
  assert(manifestDocs.includes("readinessModel"), "Manifest should include the component readiness model.");
  assert(manifestDocs.includes("data-if-component-manifest"), "Manifest should include manifest-backed inventory source.");
  assert(manifestDocs.includes("data-if-component-inventory-selected-evidence"), "Manifest should include selected evidence slots.");
  assert(manifestDocs.includes("data-if-component-inventory-active-filters"), "Manifest should include active filter chip slots.");
  assert(manifestDocs.includes("clearComponentInventoryFilter"), "Manifest should include filter clear helper.");
  assert(manifestDocs.includes("data-if-component-inventory-report"), "Manifest should include category report slots.");
  assert(manifestDocs.includes("data-if-component-inventory-release-gate"), "Manifest should include release gate slots.");
  assert(manifestDocs.includes("data-if-component-inventory-scorecard"), "Manifest should include scorecard slots.");
  assert(manifestDocs.includes("data-if-component-inventory-risk-register"), "Manifest should include risk register slots.");
  assert(manifestDocs.includes("data-if-component-inventory-deficiency-assessment"), "Manifest should include deficiency assessment slots.");
  assert(manifestDocs.includes("data-if-component-inventory-deficiency-source"), "Manifest should include deficiency backlog source slots.");
  assert(manifestDocs.includes("data-if-component-inventory-risk"), "Manifest should include risk filter controls.");
  assert(manifestDocs.includes("data-if-component-inventory-sort"), "Manifest should include sort controls.");
  assert(manifestDocs.includes("data-if-component-inventory-preset"), "Manifest should include preset controls.");
  assert(manifestDocs.includes("applyComponentInventoryPreset"), "Manifest should include preset helper.");
  assert(manifestDocs.includes("data-if-component-inventory-motion"), "Manifest should include inventory motion state.");
  assert(manifestDocs.includes("data-if-component-inventory-category-set"), "Manifest should include category drilldown controls.");
  assert(manifestDocs.includes("setComponentInventoryCategoryFilter"), "Manifest should include category drilldown helper.");
  assert(manifestDocs.includes("data-if-component-inventory-capability"), "Manifest should include capability filters.");
  assert(manifestDocs.includes("setComponentInventoryCapabilityFilter"), "Manifest should include capability drilldown helper.");
  assert(manifestDocs.includes("data-if-component-inventory-select-id"), "Manifest should include inventory select id controls.");
  assert(manifestDocs.includes("data-if-component-inventory-actions"), "Manifest should include action queue slots.");
  assert(manifestDocs.includes("data-if-component-inventory-evidence-matrix"), "Manifest should include evidence matrix slots.");
  assert(manifestDocs.includes("data-if-component-inventory-capability-coverage"), "Manifest should include capability coverage slots.");
  assert(manifestDocs.includes("data-if-component-inventory-snapshot"), "Manifest should include readiness snapshot slots.");
  assert(manifestDocs.includes("data-if-component-inventory-view-state"), "Manifest should include view state slots.");
  assert(manifestDocs.includes("data-if-component-inventory-card-readiness"), "Manifest should include card readiness slots.");
  assert(manifestDocs.includes("data-if-component-inventory-selected-use"), "Manifest should include selected use guidance slots.");
  assert(manifestDocs.includes("data-if-component-inventory-selected-avoid"), "Manifest should include selected avoid guidance slots.");
  assert(manifestDocs.includes("data-if-component-inventory-selected-recipes"), "Manifest should include selected recipe slots.");
  assert(manifestDocs.includes("data-if-component-inventory-selected-actions"), "Manifest should include selected action slots.");
  assert(manifestDocs.includes("getComponentInventoryState"), "Manifest should include inventory state helper.");
  assert(manifestDocs.includes("getComponentInventoryViewState"), "Manifest should include inventory view state helper.");
  assert(manifestDocs.includes("applyComponentInventoryViewState"), "Manifest should include inventory view state replay helper.");
  assert(manifestDocs.includes("getComponentInventoryReadinessReport"), "Manifest should include inventory report helper.");
  assert(manifestDocs.includes("getComponentInventoryReadinessScorecard"), "Manifest should include inventory scorecard helper.");
  assert(manifestDocs.includes("getComponentInventoryReadinessActions"), "Manifest should include inventory action helper.");
  assert(manifestDocs.includes("getComponentInventoryEvidenceMatrix"), "Manifest should include inventory evidence matrix helper.");
  assert(manifestDocs.includes("getComponentInventoryCapabilityCoverage"), "Manifest should include inventory capability coverage helper.");
  assert(manifestDocs.includes("getComponentInventoryReadinessSnapshot"), "Manifest should include inventory readiness snapshot helper.");
  assert(manifestDocs.includes("getComponentInventoryReleaseGate"), "Manifest should include inventory release gate helper.");
  assert(manifestDocs.includes("getComponentInventoryRiskRegister"), "Manifest should include inventory risk register helper.");
  assert(manifestDocs.includes("getComponentInventoryDeficiencyAssessment"), "Manifest should include inventory deficiency assessment helper.");
  assert(manifestDocs.includes("getComponentInventoryDeficiencyBacklog"), "Manifest should include inventory deficiency backlog helper.");
  assert(manifestDocs.includes("selectComponentInventoryCard"), "Manifest should include inventory selection helper.");
  assert(manifestDocs.includes("moveComponentInventorySelection"), "Manifest should include inventory movement helper.");
  assert(designDocs.includes("Configurable showcases should combine"), "Design system docs should explain configurable showcase expectations.");
  assert(usageDocs.includes("#configurable-showcase-preview"), "Usage docs should mention the configurable showcase preview contract.");

  const eventDocs = readFileSync(resolve(root, "docs/event-catalog.md"), "utf8");
  const recipeDocs = readFileSync(resolve(root, "docs/recipes.md"), "utf8");
  assert(eventDocs.includes("if:component-inventory-filter"), "Event catalog should include inventory filter event.");
  assert(eventDocs.includes("if:component-inventory-select"), "Event catalog should include inventory selection event.");
  assert(eventDocs.includes("if:component-inventory-manifest"), "Event catalog should include inventory manifest event.");
  assert(recipeDocs.includes("Component Inventory Readiness"), "Recipes should include component inventory readiness guidance.");
  assert(recipeDocs.includes("data-if-component-inventory-detail"), "Recipes should include inventory detail slots.");
  assert(recipeDocs.includes("data-if-component-inventory-active-filters"), "Recipes should include active filter slots.");
  assert(recipeDocs.includes("clearComponentInventoryFilter"), "Recipes should include active filter clear helper.");
  assert(recipeDocs.includes("data-if-component-inventory-report"), "Recipes should include inventory report slots.");
  assert(recipeDocs.includes("data-if-component-inventory-release-gate"), "Recipes should include inventory release gate slots.");
  assert(recipeDocs.includes("data-if-component-inventory-scorecard"), "Recipes should include inventory scorecard slots.");
  assert(recipeDocs.includes("data-if-component-inventory-risk-register"), "Recipes should include inventory risk register slots.");
  assert(recipeDocs.includes("data-if-component-inventory-deficiency-assessment"), "Recipes should include inventory deficiency assessment slots.");
  assert(recipeDocs.includes("data-if-component-inventory-deficiency-source"), "Recipes should include inventory deficiency backlog source guidance.");
  assert(recipeDocs.includes("data-if-component-inventory-risk"), "Recipes should include inventory risk filter controls.");
  assert(recipeDocs.includes("data-if-component-inventory-sort"), "Recipes should include inventory sort controls.");
  assert(recipeDocs.includes("data-if-component-inventory-preset"), "Recipes should include inventory preset controls.");
  assert(recipeDocs.includes("data-if-component-inventory-motion"), "Recipes should include inventory motion state guidance.");
  assert(recipeDocs.includes("data-if-component-inventory-category-set"), "Recipes should include inventory category drilldown controls.");
  assert(recipeDocs.includes("data-if-component-inventory-capability"), "Recipes should include inventory capability gap controls.");
  assert(recipeDocs.includes("data-if-component-inventory-select-id"), "Recipes should include inventory select controls.");
  assert(recipeDocs.includes("data-if-component-inventory-actions"), "Recipes should include inventory action slots.");
  assert(recipeDocs.includes("data-if-component-inventory-evidence-matrix"), "Recipes should include inventory evidence matrix slots.");
  assert(recipeDocs.includes("data-if-component-inventory-capability-coverage"), "Recipes should include inventory capability coverage slots.");
  assert(recipeDocs.includes("data-if-component-inventory-snapshot"), "Recipes should include inventory snapshot slots.");
  assert(recipeDocs.includes("data-if-component-inventory-view-state"), "Recipes should include inventory view state slots.");
  assert(recipeDocs.includes("data-if-component-inventory-card-readiness"), "Recipes should include card readiness slots.");
  assert(recipeDocs.includes("data-if-component-inventory-selected-use"), "Recipes should include selected use guidance slots.");
  assert(recipeDocs.includes("data-if-component-inventory-selected-avoid"), "Recipes should include selected avoid guidance slots.");
  assert(recipeDocs.includes("data-if-component-inventory-selected-recipes"), "Recipes should include selected recipe slots.");
  assert(recipeDocs.includes("data-if-component-inventory-selected-actions"), "Recipes should include selected action slots.");
  assert(recipeDocs.includes("moveComponentInventorySelection"), "Recipes should include inventory movement helper.");
  assert(recipeDocs.includes("data-if-component-manifest"), "Recipes should include inventory manifest source.");
}

function testTabsAccordionContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "renderTabs",
    "getTabs",
    "getTabsState",
    "activateTab",
    "renderAccordion",
    "getAccordionState",
    "setDisclosureState"
  ].forEach((token) => {
    assert(source.includes(`function ${token}`), `Tabs/accordion function missing ${token}.`);
    assert(exportBlock.includes(token), `Tabs/accordion API export missing ${token}.`);
  });

  [
    "data-if-tabs-source",
    "data-if-tabs-json",
    "if:tab-change",
    "data-if-accordion-source",
    "data-if-accordion-json",
    "if:disclosure-toggle"
  ].forEach((token) => {
    assert(source.includes(token), `Tabs/accordion behavior missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'id="navigation-tabs-demo"',
    'data-if-tabs-source="#navigation-tabs-data"',
    '"nav-overview"',
    '"accordions"'
  ].forEach((token) => {
    assert(components.includes(token), `Tabs/accordion specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/usage.md"), "utf8")}`;
  [
    "TabsDocument",
    "renderTabs",
    "getTabsState",
    "renderAccordion",
    "getAccordionState",
    "data-if-tabs-source",
    "data-if-accordion-trigger",
    "if:tab-change",
    "if:disclosure-toggle"
  ].forEach((token) => {
    assert(docs.includes(token), `Tabs/accordion docs or manifest missing ${token}.`);
  });
}

function testClaimTrackingStructuredContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "renderClaimTracker",
    "hydrateClaimTrackers",
    "getClaimTrackerState",
    "selectClaim"
  ].forEach((token) => {
    assert(source.includes(`function ${token}`), `Claim tracking function missing ${token}.`);
    assert(exportBlock.includes(token), `Claim tracking API export missing ${token}.`);
  });

  [
    "data-if-claims-source",
    "data-if-claims-json",
    "data-if-claim-count",
    "if:claim-select",
    "handleClaimTrackerKeydown",
    "ArrowDown",
    "state: getClaimTrackerState"
  ].forEach((token) => {
    assert(source.includes(token), `Claim tracking behavior missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'id="component-claim-tracker"',
    'data-if-claims-source="#component-claim-tracker-data"',
    '"claim-standards"',
    '"claim-access-review"'
  ].forEach((token) => {
    assert(components.includes(token), `Claim tracking specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "ClaimTrackerDocument",
    "renderClaimTracker",
    "hydrateClaimTrackers",
    "getClaimTrackerState",
    "data-if-claims-source",
    "{ claim, claimId, id, panel, state }"
  ].forEach((token) => {
    assert(docs.includes(token), `Claim tracking docs or manifest missing ${token}.`);
  });
}

function testCommandPaletteStructuredContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "renderCommandPalette",
    "hydrateCommandPalettes",
    "getCommandPalette",
    "getCommandPaletteState",
    "filterCommandPalette",
    "runCommandPaletteItem"
  ].forEach((token) => {
    assert(source.includes(`function ${token}`), `Command palette function missing ${token}.`);
    assert(exportBlock.includes(token), `Command palette API export missing ${token}.`);
  });

  [
    "data-if-command-source",
    "data-if-command-json",
    "data-if-command-id",
    "data-if-command-route",
    "data-if-command-count",
    "data-if-command-empty",
    "if:command-palette-filter",
    "state: getCommandPaletteState"
  ].forEach((token) => {
    assert(source.includes(token), `Command palette behavior missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'id="coverage-command-palette"',
    'data-if-command-source="#coverage-command-palette-data"',
    '"open-graph"',
    '"create-review-task"',
    '"export-parser"',
    '"export-parser"'
  ].forEach((token) => {
    assert(components.includes(token), `Command palette specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "CommandPaletteDocument",
    "renderCommandPalette",
    "hydrateCommandPalettes",
    "getCommandPaletteState",
    "data-if-command-source",
    "if:command-palette-filter",
    "{ command, id, item, route, state }"
  ].forEach((token) => {
    assert(docs.includes(token), `Command palette docs or manifest missing ${token}.`);
  });
}

function testDocumentViewerStateContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "getDocumentViewer",
    "getDocumentViewerState",
    "getDocumentWorkspaceState",
    "hydrateDocumentViewers",
    "hydrateDocumentCorpus",
    "hydrateDocumentAnnotations",
    "selectDocumentArtifact",
    "setDocumentArtifactMode",
    "updateDocumentSearch"
  ].forEach((token) => {
    assert(source.includes(`function ${token}`), `Document viewer function missing ${token}.`);
    assert(exportBlock.includes(token), `Document viewer API export missing ${token}.`);
  });

  [
    "if:doc-artifact-select",
    "if:doc-search",
    "if:doc-filter-change",
    "if:doc-highlight-change",
    "if:doc-search-clear",
    "if:doc-jump",
    "state: getDocumentViewerState",
    "data-if-doc-active-filter"
  ].forEach((token) => {
    assert(source.includes(token), `Document viewer behavior missing ${token}.`);
  });

  const example = readFileSync(resolve(root, "examples/document-viewer.html"), "utf8");
  [
    'data-if-doc-workspace',
    'data-if-doc-corpus="./data/policy-corpus.json"',
    'data-if-doc-viewer',
    'data-if-doc-search',
    'data-if-doc-filter',
    'data-if-doc-highlight',
    "document-viewer-pass-20260601"
  ].forEach((token) => {
    assert(example.includes(token), `Document viewer example missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "DocumentViewerState",
    "DocumentWorkspaceState",
    "getDocumentViewerState",
    "getDocumentWorkspaceState",
    "hydrateDocumentViewers",
    "if:doc-artifact-select",
    "{ query, filter, state, viewer }",
    "data-if-doc-match-count"
  ].forEach((token) => {
    assert(docs.includes(token), `Document viewer docs or manifest missing ${token}.`);
  });
}

function testUtilityLayerContracts() {
  const utilitiesCss = readFileSync(resolve(root, "src/styles/utilities.css"), "utf8");
  [
    ".if-grid--auto-xs",
    ".if-grid--auto-sm",
    ".if-grid--auto-md",
    ".if-grid--auto-lg",
    ".if-grid--sidebar",
    ".if-grid--detail",
    ".if-grid--custom",
    ".if-basis-half",
    ".if-contain-inline",
    ".if-scroll-shadow",
    ".if-surface-success",
    ".if-surface-info",
    ".if-border-success",
    ".if-border-warning",
    ".if-focus-ring:focus-visible",
    ".if-print-hidden",
    ".if-print-only",
    ".if-print-avoid",
    ".if-motion-safe",
    ".if-sm-stack",
    ".if-md-grid",
    ".if-lg-grid"
  ].forEach((token) => {
    assert(utilitiesCss.includes(token), `Utility layer missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'id="utilities"',
    "if-grid--auto-md",
    "if-contain-inline",
    "if-scroll-shadow",
    "if-sm-stack",
    "Utility Layer Coverage",
    "Tailwind ahead"
  ].forEach((token) => {
    assert(components.includes(token), `Design system utility showcase missing ${token}.`);
  });

  const usageDocs = readFileSync(resolve(root, "docs/usage.md"), "utf8");
  const componentDocs = readFileSync(resolve(root, "docs/components.md"), "utf8");
  const designDocs = readFileSync(resolve(root, "docs/design-system.md"), "utf8");
  assert(usageDocs.includes(".if-grid--sidebar"), "Usage docs should cover sidebar/detail utility grids.");
  assert(usageDocs.includes(".if-print-hidden"), "Usage docs should cover print visibility utilities.");
  assert(componentDocs.includes("Utility Composition"), "Component docs should include utility composition guidance.");
  assert(designDocs.includes("Utility additions should meet"), "Design-system docs should include utility addition criteria.");
}

function testGraphClusterContracts() {
  const source = readFileSync(resolve(root, "src/js/index.js"), "utf8");
  [
    "function prepareGraphClusterControl",
    "function updateAnchoredGraphClusters",
    "function updateGraphClusterAnchor",
    "function layoutGraphClusterMembers",
    "function setGraphClusterExpanded",
    "aria-controls",
    "aria-pressed",
    "data-cluster-${cluster}",
    "clusterAnchorX",
    "clusterOffsetX",
    "if:graph-cluster-layout",
    "if:graph-cluster-move",
    "data-if-graph-child-count",
    "has-open-children",
    "ownerNode",
    "if:graph-cluster",
    "memberCount"
  ].forEach((token) => {
    assert(source.includes(token), `Graph cluster behavior missing ${token}.`);
  });
  const clickBody = extractFunction("handleClick");
  assert(
    clickBody.includes('if (graphNode.matches("[data-if-graph-cluster]")) toggleGraphCluster(graphNode);') &&
      clickBody.includes("showGraphContextMenu(graphNode)"),
    "Graph node clicks should select normal nodes, toggle clustered owner nodes, and open context actions."
  );

  const styles = readFileSync(resolve(root, "src/styles/components.css"), "utf8");
  [
    ".if-graph-node__child-count",
    ".if-graph-node.has-open-children",
    '[data-graph-node-density="compact"] .if-graph-node__child-count',
    "var(--node-color, var(--if-accent))",
    'data-if-graph-child-state="open"'
  ].forEach((token) => {
    assert(styles.includes(token), `Graph child-count styling missing ${token}.`);
  });

  const graph = readFileSync(resolve(root, "examples/graph-view.html"), "utf8");
  [
    'data-node-id="directive"',
    'data-if-graph-cluster="directive-references"',
    'data-if-graph-child-count',
    'data-cluster-label="reference children"',
    'data-cluster-layout="branch"',
    'data-cluster-offset-x="9"',
    'data-edge-from="directive-manual" data-edge-to="directive-forms"',
    'data-cluster-member="directive-references"',
    'data-node-id="disa"',
    'data-if-graph-cluster="disa-guides"',
    'data-cluster-label="guide children"',
    'data-cluster-member="disa-guides"',
    'data-graph-world="expanded"',
    'data-graph-mode="unified"',
    'data-graph-min-x="-35"',
    '--graph-world-width: 220%'
  ].forEach((token) => {
    assert(graph.includes(token), `Graph cluster example missing ${token}.`);
  });
  assert(!graph.includes('data-node-id="cluster-directive-references"'), "Graph example should not use standalone reference cluster nodes.");
  assert(!graph.includes('data-node-id="cluster-disa-guides"'), "Graph example should not use standalone guide cluster nodes.");
  assert(!graph.includes('if-graph-node--cluster'), "Graph example should model child clusters on normal graph nodes.");

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}`;
  assert(docs.includes("data-if-graph-child-count"), "Graph cluster docs should cover node child-count badges.");
  assert(docs.includes("existing graph node"), "Graph cluster docs should describe ownership on existing nodes.");
  assert(docs.includes("data-cluster-offset-x"), "Graph cluster docs should cover branch offsets.");
  assert(docs.includes("data-graph-world"), "Graph docs should cover expanded graph worlds.");
  assert(docs.includes("node context menu"), "Graph docs should cover node context menus.");
  assert(docs.includes("unified"), "Graph docs should cover unified graph gestures.");
  assert(docs.includes("expand/collapse"), "Graph cluster docs should describe expand/collapse behavior.");
}

function testBehaviorLifecycleContracts() {
  const publicLifecycleApi = [
    "init",
    "destroy",
    "initBehavior",
    "destroyBehavior",
    "getComponentController",
    "registerBehaviorModule",
    "unregisterBehaviorModule",
    "registerCoreBehaviorModules",
    "getBehaviorModules"
  ];
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  publicLifecycleApi.forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing behavior lifecycle function ${name}.`);
    assert(exportBlock.includes(name), `Behavior lifecycle API ${name} should be exported from src/js/index.js.`);
  });

  const registryBody = extractFunction("registerCoreBehaviorModules");
  [
    'name: "themes"',
    'name: "icons"',
    'name: "assets"',
    'name: "visualization"',
    'name: "keyboard"',
    'name: "navigation"',
    'name: "overlays"',
    'name: "forms"',
    'name: "configuration"',
    'name: "performance"',
    'name: "diagrams"',
    'name: "tables"',
    'name: "policy-diff"',
    'name: "hierarchy"',
    'name: "claims-history"',
    'name: "review-workflows"',
    'name: "documents"',
    'name: "erd"',
    'name: "graph"',
    'name: "events"'
  ].forEach((token) => {
    assert(registryBody.includes(token), `Core behavior registry missing module ${token}.`);
  });

  const initBody = extractFunction("init");
  [
    "registerCoreBehaviorModules()",
    "normalizeBehaviorRoot(root)",
    "continueOnError: true",
    "runBehaviorModules(\"init\"",
    "if:framework-init:before",
    "if:framework-init",
    "return normalizedRoot"
  ].forEach((token) => {
    assert(initBody.includes(token), `Stable init contract missing ${token}.`);
  });

  const destroyBody = extractFunction("destroy");
  [
    "registerCoreBehaviorModules()",
    "normalizeBehaviorRoot(root)",
    "continueOnError: true",
    "runBehaviorModules(\"destroy\"",
    "if:framework-destroy:before",
    "if:framework-destroy",
    "return normalizedRoot"
  ].forEach((token) => {
    assert(destroyBody.includes(token), `Stable destroy contract missing ${token}.`);
  });

  const moduleRunnerBody = extractFunction("runBehaviorModule");
  [
    "if:behavior-${phase}:before",
    "if:behavior-${phase}",
    "if:behavior-${phase}:error",
    "continueOnError"
  ].forEach((token) => {
    assert(moduleRunnerBody.includes(token), `Behavior module runner missing ${token}.`);
  });

  const registerBody = extractFunction("registerBehaviorModule");
  assert(registerBody.includes("descriptor.order"), "Behavior modules should support explicit ordering.");
  assert(registryBody.includes("order: -1000"), "Document event listeners should register before heavier component hydration.");

  const scrollLockBody = extractFunction("reconcileBodyScrollLock");
  assert(
    scrollLockBody.includes(".if-expandable-surface.is-expanded:not(.if-expandable-surface--inline)"),
    "Body scroll lock should ignore inline expanded surfaces."
  );

  const surfaceExpansionBody = extractFunction("toggleSurfaceExpansion");
  [
    "requestedMode",
    'requestedMode === "fullscreen"',
    'requestedMode !== "inline"',
    "if-expandable-surface--inline",
    "mode: fullscreen ? \"fullscreen\" : \"inline\""
  ].forEach((token) => {
    assert(surfaceExpansionBody.includes(token), `Surface expansion scroll contract missing ${token}.`);
  });

  const wheelBody = extractFunction("handleWheel");
  assert(
    wheelBody.includes("if (!event.ctrlKey && !event.metaKey) return;"),
    "Graph canvas should not consume normal page wheel scrolling; zoom requires Ctrl/Meta."
  );

  const controllerBody = extractFunction("getComponentController");
  [
    "open(options = {})",
    "close(options = {})",
    "toggle(options = {})",
    "select(value, options = {})",
    "setState(state, options = {})",
    "reset(options = {})",
    "refresh(options = {})",
    "destroy(options = {})",
    "openMenu(element",
    "selectGraphNode",
    "setWizardStep",
    "setDatePickerValue"
  ].forEach((token) => {
    assert(controllerBody.includes(token), `Programmatic component controller missing ${token}.`);
  });

  [
    "setDisclosureState",
    "setPressed",
    "setSelected",
    "setExpanded"
  ].forEach((name) => {
    assert(exportBlock.includes(name), `Shared state helper ${name} should be exported from src/js/index.js.`);
  });

  const build = readFileSync(resolve(root, "scripts/build.mjs"), "utf8");
  assert(build.includes("function getExportNames"), "Build should derive browser global from the ESM export block.");
  assert(build.includes("window.InterfaceFramework = { ${exportNames.join(\", \")} }"), "Browser global should publish the same stable API as ESM exports.");

  const usageDocs = readFileSync(resolve(root, "docs/usage.md"), "utf8");
  assert(usageDocs.includes("Behavior Lifecycle API"), "Usage docs should document behavior lifecycle APIs.");
  assert(usageDocs.includes("InterfaceFramework.init(document, { modules:"), "Usage docs should show module-scoped init.");
  assert(usageDocs.includes("InterfaceFramework.destroy(document, { modules:"), "Usage docs should show module-scoped destroy.");
  const apiDocs = readFileSync(resolve(root, "docs/component-api.md"), "utf8");
  assert(apiDocs.includes("Programmatic Behavior Contract"), "Component API docs should document programmatic behavior.");
  assert(apiDocs.includes("getComponentController(target)"), "Component API docs should document the controller facade.");
}

function testPerformanceScaleContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "getPerformanceProfile",
    "evaluatePerformanceBudgets",
    "hydratePerformanceLabs",
    "measureOverflow",
    "runPerformanceLab"
  ].forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing performance API function ${name}.`);
    assert(exportBlock.includes(name), `Performance API ${name} should be exported from src/js/index.js.`);
  });

  [
    "data-if-performance-lab",
    "data-if-performance-run",
    "data-if-overflow-check",
    "evaluatePerformanceBudgets",
    "if:performance-run",
    "renderPerformanceTable",
    "renderPerformanceGraph",
    "renderPerformanceDiagram",
    "renderPerformanceDocument",
    "renderPerformanceCharts"
  ].forEach((token) => {
    assert(source.includes(token), `Performance behavior missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'id="performance-scale"',
    'data-if-performance-lab',
    'data-if-performance-auto="balanced"',
    'data-if-performance-run="large"',
    'data-if-performance-table',
    'data-if-performance-graph',
    'data-if-performance-diagram',
    'data-if-performance-document',
    'data-if-performance-charts'
  ].forEach((token) => {
    assert(components.includes(token), `Performance scale demo missing ${token}.`);
  });

  const css = readFileSync(resolve(root, "src/styles/components.css"), "utf8");
  [
    "Performance and scale guard layer",
    ".if-performance-lab",
    ".if-performance-preview-grid",
    ".if-performance-panel__body",
    ".if-performance-graph",
    ".if-performance-document"
  ].forEach((token) => {
    assert(css.includes(token), `Performance scale CSS missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "Performance And Scale Lab",
    "if:performance-run",
    "measureOverflow",
    "runPerformanceLab"
  ].forEach((token) => {
    assert(docs.includes(token), `Performance scale docs missing ${token}.`);
  });
}

function testCollapsibleSurfaceContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "getCollapsibleSurface",
    "getCollapsibleRegion",
    "syncCollapsibleSurface",
    "hydrateCollapsibleSurfaces",
    "toggleCollapsibleSurface",
    "reconcileBodyScrollLock",
    "toggleSurfaceExpansion"
  ].forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing surface behavior function ${name}.`);
  });
  [
    "hydrateCollapsibleSurfaces",
    "toggleCollapsibleSurface"
  ].forEach((name) => {
    assert(exportBlock.includes(name), `Collapsible surface API ${name} should be exported from src/js/index.js.`);
  });
  [
    "data-if-collapsible",
    "data-if-collapsible-toggle",
    "data-if-collapsible-region",
    "if:collapsible-toggle",
    "aria-expanded",
    "aria-controls",
    "if-expandable-surface.is-expanded",
    "if-expandable-surface--inline",
    "mode: fullscreen ? \"fullscreen\" : \"inline\""
  ].forEach((token) => {
    assert(source.includes(token), `Collapsible behavior missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    'id="component-inventory" data-if-collapsible',
    'id="actions" data-if-collapsible',
    'id="coverage-components" data-if-collapsible',
    "data-if-collapsed=\"true\"",
    "data-if-collapsible-status"
  ].forEach((token) => {
    assert(components.includes(token), `Collapsible demo missing ${token}.`);
  });
  assert(components.includes('data-if-surface-expand="#behavior-panel"'), "Inline surface expansion demo should remain covered.");

  const docs = `${readFileSync(resolve(root, "docs/usage.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}`;
  [
    "collapsible-surface",
    "Collapsible Surfaces",
    "if:collapsible-toggle",
    "hydrateCollapsibleSurfaces",
    "toggleCollapsibleSurface"
  ].forEach((token) => {
    assert(docs.includes(token), `Collapsible docs/manifest missing ${token}.`);
  });
}

function testBundleGlobalExposureContracts() {
  const build = readFileSync(resolve(root, "scripts/build.mjs"), "utf8");
  [
    "interfaceAssignment",
    "autoInitPattern",
    "sourceWithEarlyGlobal",
    "withGlobalBeforeDemos",
    "source.replace(autoInitPattern",
    "sourceWithEarlyGlobal.replace(exportBlockPattern, interfaceAssignment)"
  ].forEach((token) => {
    assert(build.includes(token), `Build bundle should expose InterfaceFramework before demo startup (${token}).`);
  });
  [
    "return root?.querySelector?.(selector) || null",
    "return root?.querySelectorAll ? Array.from(root.querySelectorAll(selector)) : []"
  ].forEach((token) => {
    assert(source.includes(token), `Selector helpers should tolerate null roots (${token}).`);
  });
}

function testPublicSiteSearchContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "getPublicSearch",
    "hydratePublicSearches",
    "updatePublicSearch",
    "setPublicSearchFilter",
    "clearPublicSearch"
  ].forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public-site search function ${name}.`);
    assert(exportBlock.includes(name), `Public-site search API ${name} should be exported.`);
  });
  [
    "data-if-public-search",
    "data-if-public-search-query",
    "data-if-public-search-filter",
    "data-if-public-search-result",
    "data-if-public-search-count",
    "data-if-public-search-empty",
    "if:public-search",
    "name: \"public-site\""
  ].forEach((token) => {
    assert(source.includes(token), `Public-site search behavior missing ${token}.`);
  });

  const adam = readFileSync(resolve(root, "examples/adamboas.html"), "utf8");
  [
    "data-if-public-search",
    "data-if-public-search-target=\"#writing-results\"",
    "data-if-public-search-query",
    "data-if-public-search-filter=\"paper\"",
    "data-if-public-search-result",
    "data-if-public-search-category",
    "data-if-public-search-empty"
  ].forEach((token) => {
    assert(adam.includes(token), `AdamBoas public-site example missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}`;
  [
    "hydratePublicSearches",
    "updatePublicSearch",
    "setPublicSearchFilter",
    "clearPublicSearch",
    "if:public-search",
    "data-if-public-search-result"
  ].forEach((token) => {
    assert(docs.includes(token), `Public-site docs/manifest missing ${token}.`);
  });
}

function testDiagramUxContracts() {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "diagramItemSelector",
    "getVisibleDiagramItems",
    "updateDiagramStats",
    "focusAdjacentDiagramItem",
    "renderDiagramSearchResults",
    "selectDiagramSearchMatch",
    "stepDiagramSearch",
    "bindDiagramSearchInput",
    "unbindDiagramSearchInput",
    "bindDiagramSearchControls",
    "unbindDiagramSearchControls",
    "getDiagramSearchInputsForDiagram",
    "syncDiagramSearchInputs",
    "collectDiagramLayoutSnapshot",
    "applyDiagramLayoutSnapshot",
    "setDiagramEditMode",
    "bindDiagramEditToggle",
    "unbindDiagramEditToggle",
    "syncDiagramEditToggleLabels",
    "getDiagramEditableSelection",
    "clearDiagramInlineEditors",
    "focusDiagramInlineEditor",
    "updateDiagramInlineEdit",
    "commitDiagramInlineEdit",
    "setDiagramDescriptionLabel",
    "nudgeDiagramItem",
    "selectDiagramConnectorRoute",
    "setDiagramConnectorRoute",
    "deleteDiagramConnectorRoute",
    "undoDiagramDelete",
    "updateSelectedDiagramRoute",
    "registerDiagramLayoutAdapter"
  ].forEach((name) => {
    assert(source.includes(name), `Diagram UX contract missing ${name}.`);
  });
  const focusBody = extractFunction("focusDiagramItem");
  [
    "aria-selected",
    "focus?.({ preventScroll: true })",
    "if:diagram-select"
  ].forEach((token) => {
    assert(focusBody.includes(token), `Diagram node selection should expose ${token}.`);
  });
  const searchBody = extractFunction("updateDiagramSearch");
  [
    "renderDiagramSearchResults",
    "selectDiagramSearchMatch",
    "bindDiagramSearchControls",
    "clearDiagramSearchFromControl",
    "syncDiagramSearchInputs",
    "if-diagram-search-badge",
    "data-if-diagram-search-kind"
  ].forEach((token) => {
    assert(searchBody.includes(token) || source.includes(token), `Diagram search should expose ${token}.`);
  });
  [
    "updateDiagramStats",
    "collectDiagramLayoutSnapshot",
    "applyDiagramLayoutSnapshot",
    "setDiagramEditMode",
    "saveDiagramLayout",
    "loadDiagramLayout",
    "resetDiagramLayout",
    "nudgeDiagramItem",
    "selectDiagramConnectorRoute",
    "setDiagramConnectorRoute",
    "deleteDiagramConnectorRoute",
    "undoDiagramDelete",
    "updateSelectedDiagramRoute",
    "registerDiagramLayoutAdapter",
    "unregisterDiagramLayoutAdapter"
  ].forEach((name) => {
    assert(exportBlock.includes(name), `Diagram API ${name} should be exported from src/js/index.js.`);
  });

  const keydownBody = extractFunction("handleKeydown");
  [
    "ArrowRight",
    "ArrowDown",
    "ArrowLeft",
    "ArrowUp",
    "Home",
    "End",
    "focusAdjacentDiagramItem"
  ].forEach((token) => {
    assert(keydownBody.includes(token), `Diagram keyboard traversal missing ${token}.`);
  });

  const statsBody = extractFunction("updateDiagramStats");
  [
    "visible",
    "matches",
    "layers",
    "hidden-layers",
    "selected"
  ].forEach((token) => {
    assert(statsBody.includes(token), `Diagram stats should update ${token}.`);
  });

  const snapshotBody = extractFunction("collectDiagramLayoutSnapshot");
  [
    "layers",
    "variables",
    "items",
    "getDiagramEditableFields",
    "getDiagramLayoutKey"
  ].forEach((token) => {
    assert(snapshotBody.includes(token), `Diagram layout snapshot missing ${token}.`);
  });

  const adapterBody = extractFunction("saveDiagramLayout");
  [
    "getDiagramLayoutAdapter",
    "getDiagramSessionStorage",
    "if:diagram-layout-save",
    "signal"
  ].forEach((token) => {
    assert(adapterBody.includes(token), `Diagram layout adapter contract missing ${token}.`);
  });

  const editToggleBody = extractFunction("bindDiagramEditToggle");
  [
    "event.stopPropagation()",
    "setDiagramEditMode(control)",
    "addEventListener(\"click\""
  ].forEach((token) => {
    assert(editToggleBody.includes(token), `Diagram edit toggle direct binding missing ${token}.`);
  });

  const editLabelBody = extractFunction("syncDiagramEditToggleLabels");
  [
    "aria-pressed",
    "Exit diagram edit mode",
    "Exit edit",
    "Edit layout"
  ].forEach((token) => {
    assert(editLabelBody.includes(token), `Diagram edit toggle label sync missing ${token}.`);
  });

  const editDragBody = extractFunction("startDiagramItemDrag");
  assert(editDragBody.includes("focusDiagramItem(item)"), "Diagram edit drag should select the node before movement so the editor opens reliably.");
  const pointerUpBody = extractFunction("handlePointerUp");
  assert(pointerUpBody.includes("} else {\n      focusDiagramItem(item);"), "Diagram edit click without movement should still select the node after pointer-up.");

  const diagrams = readFileSync(resolve(root, "examples/diagrams2.html"), "utf8");
  [
    "if-diagram-status-bar",
    "data-if-diagram-stat=\"visible\"",
    "data-if-diagram-stat=\"layers\"",
    "data-if-diagram-stat=\"matches\"",
    "data-if-diagram-stat=\"selected\"",
    "data-if-diagram-layout-key",
    "data-if-diagram-edit-toggle",
    "data-if-diagram-edit-toggle-label",
    "data-if-diagram-layout-save",
    "data-if-diagram-layout-reset",
    "data-if-diagram-nudge=\"up\"",
    "data-if-diagram-undo-delete",
    "data-if-diagram-edit-field=\"title\"",
    "data-if-diagram-edit-readout=\"id\"",
    "data-if-diagram-route-from-anchor",
    "data-if-diagram-route-to-anchor",
    "data-if-diagram-route-avoid",
    "data-if-diagram-route-waypoint-x",
    "data-if-diagram-route-clear-waypoint",
    "data-if-diagram-route-delete",
    "data-if-diagram-search-results",
    "data-if-diagram-search-step",
    "data-if-diagram-search-clear",
    "data-if-diagram-search-target=\"#biotech-research-diagram\"",
    "data-if-biotech-search-results",
    "if-diagram-detail-panel--floating"
  ].forEach((token) => {
    assert(diagrams.includes(token), `Diagrams2 demo missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}`;
  [
    "if-diagram-status-bar",
    "data-if-diagram-stat",
    "updateDiagramStats",
    "Keyboard behavior",
    "DiagramLayoutSnapshot",
    "registerDiagramLayoutAdapter",
    "data-if-connector-waypoints",
    "data-if-diagram-route-waypoint-x",
    "selectDiagramConnectorRoute",
    "setDiagramConnectorRoute",
    "if:diagram-route-select",
    "if:diagram-route-edit",
    "if:diagram-route-delete",
    "if:diagram-delete-undo",
    "if:diagram-inline-edit",
    "if:diagram-node-move",
    "if:diagram-layout-save"
  ].forEach((token) => {
    assert(docs.includes(token), `Diagram UX docs/manifest missing ${token}.`);
  });
}

function testDiagram4KbrOv1Contracts() {
  const page = readFileSync(resolve(root, "examples/diagram4.html"), "utf8");
  const styles = readFileSync(resolve(root, "src/styles/components.css"), "utf8");

  [
    "data-if-diagram",
    "data-if-diagram-layout-key=\"kbr-opportunity-intelligence-ov1\"",
    "data-if-diagram-search",
    "data-if-diagram-layer-toggle=\"sources\"",
    "data-if-diagram-layer-toggle=\"engine\"",
    "data-if-diagram-layer-toggle=\"ops\"",
    "data-if-diagram-layer-toggle=\"learning\"",
    "data-if-diagram-item",
    "data-if-diagram-container=\"opportunity-signal-sources\"",
    "data-if-diagram-container=\"mvp-engine\"",
    "data-if-diagram-container=\"bd-tech-ops-flow\"",
    "data-if-diagram-container=\"measurement-learning-loop\"",
    "data-if-connector-routing",
    "data-if-connector-route=\"kbr-sources-to-classifier\"",
    "data-if-diagram-route=\"true\"",
    "data-if-diagram-source",
    "data-if-diagram-source-apply",
    "data-if-diagram-edit-toggle",
    "data-if-diagram-edit-tool=\"connect\"",
    "data-if-diagram-route-label",
    "data-if-diagram-detail",
    "data-if-diagram-stat=\"visible\"",
    "KBR Opportunity Intelligence Engine - MVP OV-1",
    "Tool-agnostic capability to identify, score, track, and operationalize opportunities",
    "Opportunity Signal Sources",
    "Opportunity Spectrum Classifier",
    "Autonomous Agent Layer",
    "BD + Tech Ops Operating Flow",
    "MVP Product Views",
    "Two-Week RFI Cadence",
    "Funnel + Lifecycle Metrics",
    "Missed Response Analytics",
    "Tool-Agnostic Architecture",
    "Measurement + Learning Loop",
    "MVP Success Metric",
    "Closed-loop opportunity intelligence from signal to response to award"
  ].forEach((token) => {
    assert(page.includes(token), `Diagram4 KBR page missing ${token}.`);
  });

  [
    ".if-diagram4-page",
    ".if-kbr-ov1-slide",
    ".if-kbr-logo",
    ".if-kbr-metric-pill",
    ".if-kbr-source-card",
    ".if-kbr-engine-grid",
    ".if-kbr-stage-card",
    ".if-kbr-operating-flow",
    ".if-kbr-flow-card",
    ".if-kbr-learning-loop",
    ".if-kbr-loop-card",
    ".if-kbr-footer",
    ".if-kbr-controls",
    ".if-kbr-authoring-surface",
    ".if-kbr-json-panel",
    ".if-kbr-status-bar",
    ".if-kbr-arrow--engine-flow",
    ".if-kbr-loop-line--c"
  ].forEach((token) => {
    assert(styles.includes(token), `Diagram4 KBR CSS missing ${token}.`);
  });

  [
    "examples/diagrams.html",
    "examples/diagrams2.html",
    "examples/diagram3.html",
    "examples/diagram4.html",
    "examples/components.html",
    "examples/index.html"
  ].forEach((relativePath) => {
    const navPage = readFileSync(resolve(root, relativePath), "utf8");
    assert(navPage.includes('href="./diagram4.html"'), `${relativePath} nav should link to diagram4.`);
  });
}

function testPolicyDiffContracts() {
  [
    "function renderPolicyDiff",
    "function hydratePolicyDiff",
    "function getPolicyDiffState",
    "function getSelectedPolicyDiffChange",
    "function handlePolicyDiffKeydown",
    "data-if-policy-diff-source",
    "data-if-diff-selected-summary",
    "if:diff-select",
    "if:diff-decision"
  ].forEach((token) => {
    assert(source.includes(token), `Policy diff behavior missing ${token}.`);
  });

  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "renderPolicyDiff",
    "hydratePolicyDiff",
    "getPolicyDiff",
    "getPolicyDiffState",
    "updatePolicyDiff",
    "setPolicyDiffDecision"
  ].forEach((token) => {
    assert(exportBlock.includes(token), `Policy diff API export missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    "id=\"policy-diff\"",
    "data-if-policy-diff-source=\"#policy-diff-demo-data\"",
    "data-if-control-var=\"--policy-diff-density\"",
    "data-if-demo-state-prefix=\"if-policy-diff--\"",
    "data-if-diff-selected-summary",
    "data-if-diff-decision-summary",
    "\"changes\""
  ].forEach((token) => {
    assert(components.includes(token), `Policy diff component specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "renderPolicyDiff",
    "getPolicyDiffState",
    "data-if-policy-diff-source",
    "data-if-diff-selected-summary",
    "if:diff-select",
    "roving focus"
  ].forEach((token) => {
    assert(docs.includes(token), `Policy diff docs/manifest missing ${token}.`);
  });
}

function testWizardStepperContracts() {
  [
    "function renderWizard",
    "function hydrateWizard",
    "function getWizardState",
    "function handleWizardKeydown",
    "data-if-wizard-source",
    "data-if-wizard-progress",
    "if:wizard-step"
  ].forEach((token) => {
    assert(source.includes(token), `Wizard stepper behavior missing ${token}.`);
  });

  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "renderWizard",
    "hydrateWizard",
    "getWizard",
    "getWizardState",
    "setWizardStep"
  ].forEach((token) => {
    assert(exportBlock.includes(token), `Wizard stepper API export missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    "data-if-wizard-source=\"#coverage-wizard-data\"",
    "\"stepperId\": \"coverage-wizard-stepper\"",
    "if-wizard-lab__controls",
    "data-if-wizard-status",
    "data-if-demo-target=\"#coverage-wizard\""
  ].forEach((token) => {
    assert(components.includes(token), `Wizard component specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}`;
  [
    "renderWizard",
    "getWizardState",
    "data-if-wizard-source",
    "data-if-wizard-progress",
    "ArrowRight",
    "{ wizard, step, total, state }"
  ].forEach((token) => {
    assert(docs.includes(token), `Wizard docs/manifest missing ${token}.`);
  });
}

function testAnnotationToolbarContracts() {
  [
    "function hydrateAnnotationToolbars",
    "function getAnnotationToolbar",
    "function getAnnotationToolbarState",
    "function handleAnnotationToolbarKeydown",
    "data-if-annotation-current",
    "ifAnnotationShort",
    "data-if-annotation-description",
    "if:annotation-tool-change"
  ].forEach((token) => {
    assert(source.includes(token), `Annotation toolbar behavior missing ${token}.`);
  });

  const setBody = extractFunction("setAnnotationTool");
  [
    "setPressed(button, active)",
    "toolbar.dataset.ifAnnotationCurrent",
    "syncAnnotationToolbarOutputs(toolbar, state)",
    "{ toolbar, control, tool: state.tool, label: state.label, state }"
  ].forEach((token) => {
    assert(setBody.includes(token), `Annotation toolbar setter missing ${token}.`);
  });

  const syncBody = extractFunction("syncAnnotationToolbarOutputs");
  [
    "target !== toolbar",
    "!target.matches(\"[data-if-annotation-tool]\")"
  ].forEach((token) => {
    assert(syncBody.includes(token), `Annotation toolbar sync should not overwrite metadata controls: ${token}.`);
  });

  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "hydrateAnnotationToolbars",
    "getAnnotationToolbar",
    "getAnnotationToolbarState",
    "setAnnotationTool"
  ].forEach((token) => {
    assert(exportBlock.includes(token), `Annotation toolbar API export missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    "id=\"coverage-annotation-toolbar\"",
    "data-if-annotation-current=\"claim\"",
    "data-if-annotation-short=\"IMP\"",
    "data-if-annotation-description=\"Training, tooling, guidance, or support path.\"",
    "data-if-annotation-count"
  ].forEach((token) => {
    assert(components.includes(token), `Annotation toolbar component specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/data-schemas.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}\n${readFileSync(resolve(root, "docs/event-catalog.md"), "utf8")}`;
  [
    "AnnotationToolbarState",
    "getAnnotationToolbarState",
    "data-if-annotation-current",
    "data-if-annotation-short",
    "{ toolbar, control, tool, label, state }",
    "Arrow keys, Home, End, Enter, and Space"
  ].forEach((token) => {
    assert(docs.includes(token), `Annotation toolbar docs/manifest missing ${token}.`);
  });
}

function testGraphExplorerStructuredContracts() {
  [
    "function renderGraph",
    "function hydrateGraph",
    "function getGraphState",
    "function normalizeGraphDocument",
    "data-if-graph-source",
    "data-if-graph-a11y-summary"
  ].forEach((token) => {
    assert(source.includes(token), `Graph explorer structured behavior missing ${token}.`);
  });

  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "renderGraph",
    "hydrateGraph",
    "getGraphState",
    "getGraphSurface",
    "collectGraphLayoutInput",
    "updateGraphA11yFallback"
  ].forEach((token) => {
    assert(exportBlock.includes(token), `Graph explorer API export missing ${token}.`);
  });

  const components = readFileSync(resolve(root, "examples/components.html"), "utf8");
  [
    "id=\"component-graph-demo\"",
    "data-if-graph-source=\"#component-graph-data\"",
    "\"nodes\"",
    "\"edges\"",
    "if-graph-lab__controls",
    "data-if-graph-relation=\"implements\""
  ].forEach((token) => {
    assert(components.includes(token), `Graph explorer component specimen missing ${token}.`);
  });

  const docs = `${readFileSync(resolve(root, "docs/components.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-api.md"), "utf8")}\n${readFileSync(resolve(root, "docs/component-manifest.json"), "utf8")}\n${readFileSync(resolve(root, "docs/recipes.md"), "utf8")}`;
  [
    "renderGraph",
    "hydrateGraph",
    "getGraphState",
    "data-if-graph-source",
    "{ nodes, edges, selected, mode, layout }"
  ].forEach((token) => {
    assert(docs.includes(token), `Graph explorer docs/manifest missing ${token}.`);
  });
}

function testProfilePatternPageContracts() {
  const profilePage = readFileSync(resolve(root, "examples/profile-patterns.html"), "utf8");
  const componentsPage = readFileSync(resolve(root, "examples/components.html"), "utf8");
  const overviewPage = readFileSync(resolve(root, "examples/index.html"), "utf8");
  const styles = [
    readFileSync(resolve(root, "src/styles/components.css"), "utf8"),
    readFileSync(resolve(root, "src/styles/layout.css"), "utf8")
  ].join("\n");

  [
    "User Profile Area Patterns",
    "if-profile-showcase",
    "if-profile-pattern-grid",
    "if-profile-pattern-card",
    "if-profile-demo-topbar",
    "if-account-menu",
    "if-account-surface",
    "if-profile-avatar",
    "if-profile-presence",
    "if-profile-account-option",
    "if-profile-session-row",
    "if-profile-mobile-frame",
    "data-if-popover-toggle",
    "data-if-menu-toggle",
    "data-if-theme=\"dark\"",
    "data-if-theme-label"
  ].forEach((token) => {
    assert(profilePage.includes(token), `Profile patterns page missing ${token}.`);
  });

  const patternCount = Array.from(profilePage.matchAll(/if-profile-pattern-card/g)).length;
  assert(patternCount >= 12, "Profile patterns page should include at least twelve pattern cards.");
  const popoverCount = Array.from(profilePage.matchAll(/data-if-popover-toggle/g)).length;
  assert(popoverCount >= 10, "Profile patterns page should include many live popover examples.");

  [
    ".if-profile-showcase",
    ".if-profile-pattern-grid",
    ".if-profile-pattern-card",
    ".if-profile-demo-topbar",
    ".if-profile-demo-topbar .if-account-menu:has(.if-profile-identity__copy)",
    ".if-profile-demo-topbar .if-account-menu > .if-profile-avatar",
    ".if-profile-demo-topbar .if-account-menu > .if-profile-avatar-stack",
    "min-width: min(100%, 11.5rem)",
    "flex: 1 1 6.25rem",
    "flex: 0 0 1rem",
    "grid-template-columns: auto minmax(min(100%, 8rem), 1fr) auto",
    "grid-template-columns: minmax(min(100%, 9rem), 1fr) auto",
    ".if-profile-avatar",
    ".if-profile-presence",
    ".if-profile-account-option",
    ".if-profile-mobile-frame"
  ].forEach((token) => {
    assert(styles.includes(token), `Profile pattern CSS missing ${token}.`);
  });

  assert(componentsPage.includes('href="./profile-patterns.html"'), "Design system nav should link to profile patterns.");
  assert(overviewPage.includes('href="./profile-patterns.html"'), "Overview nav should link to profile patterns.");
}

function testNotificationPatternPageContracts() {
  const notificationPage = readFileSync(resolve(root, "examples/notification-patterns.html"), "utf8");
  const componentsPage = readFileSync(resolve(root, "examples/components.html"), "utf8");
  const overviewPage = readFileSync(resolve(root, "examples/index.html"), "utf8");
  const profilePage = readFileSync(resolve(root, "examples/profile-patterns.html"), "utf8");
  const styles = readFileSync(resolve(root, "src/styles/components.css"), "utf8");

  [
    "Notification Control Surface Patterns",
    "if-notification-showcase",
    "if-notification-pattern-grid",
    "if-notification-pattern-card",
    "if-notification-demo-topbar",
    "if-notification-feed",
    "if-notification-digest",
    "if-notification-mobile-frame",
    "if-notification-contract-list",
    "if-notification-btn__badge",
    "if-notification-item--unread",
    "if-notification-item--warning",
    "if-notification-item--danger",
    "data-if-popover-toggle",
    "data-if-notification-read",
    "if-toast"
  ].forEach((token) => {
    assert(notificationPage.includes(token), `Notification patterns page missing ${token}.`);
  });

  const patternCount = Array.from(notificationPage.matchAll(/if-notification-pattern-card/g)).length;
  assert(patternCount >= 13, "Notification patterns page should include at least thirteen pattern cards.");
  const popoverCount = Array.from(notificationPage.matchAll(/data-if-popover-toggle/g)).length;
  assert(popoverCount >= 2, "Notification patterns page should include live popover examples.");

  [
    ".if-notification-showcase",
    ".if-notification-pattern-grid",
    ".if-notification-pattern-card",
    ".if-notification-demo-topbar",
    ".if-notification-demo-topbar .if-notification-menu",
    ".if-notification-status-strip > span",
    ".if-notification-channel-strip > span",
    "flex: 0 0 var(--if-switch-width)",
    "min-width: max-content",
    "grid-template-columns: 1.75rem minmax(8rem, 1fr) auto",
    "grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr))",
    ".if-notification-feed",
    ".if-notification-digest-row",
    ".if-notification-mobile-frame",
    ".if-notification-contract-list"
  ].forEach((token) => {
    assert(styles.includes(token), `Notification pattern CSS missing ${token}.`);
  });

  assert(componentsPage.includes('href="./notification-patterns.html"'), "Design system nav should link to notification patterns.");
  assert(overviewPage.includes('href="./notification-patterns.html"'), "Overview nav should link to notification patterns.");
  assert(profilePage.includes('href="./notification-patterns.html"'), "Profile patterns nav should link to notification patterns.");
}

function testActionPatternPageContracts() {
  const actionPage = readFileSync(resolve(root, "examples/action-patterns.html"), "utf8");
  const componentsPage = readFileSync(resolve(root, "examples/components.html"), "utf8");
  const overviewPage = readFileSync(resolve(root, "examples/index.html"), "utf8");
  const profilePage = readFileSync(resolve(root, "examples/profile-patterns.html"), "utf8");
  const notificationPage = readFileSync(resolve(root, "examples/notification-patterns.html"), "utf8");
  const styles = readFileSync(resolve(root, "src/styles/components.css"), "utf8");

  [
    "Command & Action Surface Patterns",
    "if-action-showcase",
    "if-action-pattern-grid",
    "if-action-pattern-card",
    "if-action-command-bar",
    "if-action-icon-strip",
    "if-action-selection-bar",
    "if-action-filter-bar",
    "if-action-split-demo",
    "if-action-danger-box",
    "if-action-row-list",
    "if-action-segmented",
    "if-action-palette",
    "if-action-mobile-frame",
    "if-action-contract-list",
    "data-if-popover-toggle",
    "data-if-action-demo",
    "data-if-action-sort",
    "data-if-action-view-mode",
    "data-if-action-feedback",
    "action-patterns.js"
  ].forEach((token) => {
    assert(actionPage.includes(token), `Action patterns page missing ${token}.`);
  });

  const patternCount = Array.from(actionPage.matchAll(/if-action-pattern-card/g)).length;
  assert(patternCount >= 12, "Action patterns page should include at least twelve pattern cards.");

  [
    ".if-action-showcase",
    ".if-action-pattern-grid",
    ".if-action-pattern-card",
    ".if-action-command-bar",
    ".if-action-selection-bar",
    ".if-action-filter-bar .if-search",
    ".if-action-danger-box",
    ".if-action-row",
    ".if-action-segmented",
    ".if-action-palette",
    ".if-action-mobile-frame",
    ".if-action-contract-list",
    ".if-action-feedback",
    ".if-action-filter-bar [data-if-action-sort].is-sort-desc .if-icon-slot",
    ".if-action-view-shell[data-if-action-view=\"board\"] .if-action-preview-grid",
    ".if-action-danger-box.is-confirmed",
    "@keyframes if-action-pulse"
  ].forEach((token) => {
    assert(styles.includes(token), `Action pattern CSS missing ${token}.`);
  });

  const actionScript = readFileSync(resolve(root, "examples/action-patterns.js"), "utf8");
  [
    "updateSort",
    "updateViewMode",
    "updateSelection",
    "updateDanger",
    "data-if-action-demo",
    "data-if-action-sort"
  ].forEach((token) => {
    assert(actionScript.includes(token), `Action pattern script missing ${token}.`);
  });

  assert(componentsPage.includes('href="./action-patterns.html"'), "Design system nav should link to action patterns.");
  assert(overviewPage.includes('href="./action-patterns.html"'), "Overview nav should link to action patterns.");
  assert(profilePage.includes('href="./action-patterns.html"'), "Profile patterns nav should link to action patterns.");
  assert(notificationPage.includes('href="./action-patterns.html"'), "Notification patterns nav should link to action patterns.");
}

testTooltipPositioning();
testEscapeStackContracts();
testBehaviorLifecycleContracts();
testProductionAdapterContracts();
testSearchAutocompleteCompletenessContracts();
testDatePickerContracts();
testDataTableApiContracts();
testGraphLayoutAdapterContracts();
testHierarchyStructureContracts();
testDocumentArtifactContracts();
testKeyboardAndReviewerWorkflowContracts();
testExportAndConnectorRoutingContracts();
testDomainSealIconContracts();
testThemeContracts();
testConfigurableShowcaseContracts();
testUtilityLayerContracts();
testGraphClusterContracts();
testPerformanceScaleContracts();
testCollapsibleSurfaceContracts();
testBundleGlobalExposureContracts();
testPublicSiteSearchContracts();
testDiagramUxContracts();
testDiagram4KbrOv1Contracts();
testPolicyDiffContracts();
testWizardStepperContracts();
testAnnotationToolbarContracts();
testGraphExplorerStructuredContracts();
testReviewWorkflowStructuredContracts();
testTabsAccordionContracts();
testClaimTrackingStructuredContracts();
testCommandPaletteStructuredContracts();
testDocumentViewerStateContracts();
testProfilePatternPageContracts();
testNotificationPatternPageContracts();
testActionPatternPageContracts();

if (failures.length) {
  console.error("\nBehavior contract tests failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("OK behavior contract tests pass");
