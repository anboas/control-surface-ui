import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function read(file) {
  return readFileSync(resolve(root, file), "utf8");
}

function exists(file) {
  try {
    statSync(resolve(root, file));
    return true;
  } catch {
    return false;
  }
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(file, tokens) {
  const source = read(file);
  tokens.forEach((token) => assert(source.includes(token), `${file} missing ${token}`));
}

function testRequirementsScope() {
  assert(exists("docs/diagram-component-requirements.md"), "Missing diagram component requirements document.");
  assertIncludes("docs/diagram-component-requirements.md", [
    "Definition Of Finished",
    "R-DIAG-001",
    "R-DIAG-010",
    "R-DIAG-018",
    "Schema-first rendering",
    "Mode-scoped editor",
    "Connector collision avoidance",
    "TDD Path To Completion",
    "Current Gap Diagnosis"
  ]);
}

function testPackageAndValidationHooks() {
  const pkg = JSON.parse(read("package.json"));
  assert(pkg.scripts?.["test:diagrams"] === "node scripts/diagram-component-tests.mjs", "package.json missing test:diagrams script.");
  assertIncludes("scripts/validate.mjs", [
    "scripts/diagram-component-tests.mjs",
    "validateDiagramComponentContracts",
    "Diagram component contract tests failed"
  ]);
}

function testDiagramSchemaApi() {
  const source = read("src/js/index.js");
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  [
    "validateDiagramSchema",
    "normalizeDiagramSchema",
    "renderDiagramSchema",
    "collectDiagramDocument",
    "applyDiagramDocument",
    "applySelectedDiagramJson",
    "refreshDiagramSourceEditor",
    "validateDiagramSourceEditor",
    "formatDiagramSourceEditor",
    "copyDiagramSourceEditor",
    "copySelectedDiagramJson",
    "downloadDiagramSourceEditor",
    "importDiagramSourceFile",
    "extractDiagramSourceText",
    "parseDiagramSourceValue",
    "applyDiagramContainerFormat",
    "moveDiagramItemToContainer",
    "createDiagramNodeFromSource",
    "duplicateDiagramItem",
    "reorderDiagramItem",
    "resetDiagramFocus",
    "deleteSelectedDiagramTarget",
    "resetSelectedDiagramTarget"
  ].forEach((name) => {
    assert(source.includes(`function ${name}`), `Missing public diagram schema function ${name}.`);
    assert(exportBlock.includes(name), `Diagram schema API ${name} should be exported.`);
  });
  [
    "schemaVersion",
    "regions",
    "groups",
    "nodes",
    "edges",
    "operating_contract",
    "operatingContract",
    "data-if-diagram-source",
    "extractDiagramSourceText",
    "parseDiagramSourceValue",
    "validateDiagramSourceEditor",
    "formatDiagramSourceEditor",
    "copyDiagramSourceEditor",
    "downloadDiagramSourceEditor",
    "importDiagramSourceFile",
    "if:diagram-document-apply",
    "data-if-diagram-container",
    "data-if-diagram-container-select",
    "if:diagram-node-container-move",
    "data-if-diagram-add-from-source",
    "if:diagram-source-node-create",
    "getUniqueDiagramNodeId",
    "getDiagramSourceNodeForCreate",
    "data-if-diagram-duplicate-node",
    "if:diagram-node-duplicate",
    "data-if-diagram-reorder",
    "if:diagram-node-reorder",
    "data-if-diagram-clear-selection",
    "data-if-diagram-copy-selected",
    "data-if-diagram-apply-selected",
    "data-if-diagram-reset-selected",
    "data-if-diagram-delete-selected",
    "if:diagram-selected-copy",
    "if:diagram-selected-apply",
    "if:diagram-selected-reset",
    "getSelectedDiagramSourcePatch",
    "applyDiagramNodePatch",
    "applyDiagramSnapshotItemEntry",
    "restoreDiagramItemBaselineOrder",
    "copyTextWithTemporaryField",
    "aria-selected\", \"false\"",
    "applyDiagramSnapshotOrder",
    "applyDiagramDocumentOrder",
    "order: getDiagramItemContainerIndex",
    "handleDiagramSourceWheel",
    "handleDiagramPageWheel",
    "handleLibraryPageWheel",
    "hasScrollableWheelTarget",
    "canElementScrollVertically",
    "renderDiagramContainerItem(item, container)",
    "addDiagramClassList",
    "normalizeDiagramExplicitId",
    "canonicalDiagramId",
    "dedupeDiagramItemsForDocument",
    "getDiagramKnownEndpointIds",
    "surface.classList.add(\"if-connector-route-surface\")",
    "dataset.diagramNodeId",
    "dataset.diagramSection",
    "duplicate node id",
    "unknown source node",
    "unknown target node",
    "data-if-diagram-schema-node",
    "createDiagramConnectorRoute",
    "silent: Boolean(options.silent)",
    "selectDiagramSearchMatch(diagram, matches[0].item, { focus: false, scroll: false })"
  ].forEach((token) => assert(source.includes(token), `Diagram schema implementation missing ${token}.`));
}

function testEditorModeContracts() {
  assertIncludes("examples/diagrams.html", [
    "data-if-diagram-layout-key=\"azure-deployment-architecture\"",
    "data-if-diagram-layout-autosave=\"true\"",
    "data-if-diagram-source",
    "data-if-diagram-source-refresh",
    "data-if-diagram-source-validate",
    "data-if-diagram-source-format",
    "data-if-diagram-source-apply",
    "data-if-diagram-source-copy",
    "data-if-diagram-source-download",
    "data-if-diagram-source-import",
    "data-if-diagram-container=\"external-sources\"",
    "data-if-diagram-container=\"core-processing-agents\"",
    "data-if-diagram-container=\"platform-services\"",
    "data-if-diagram-container-select",
    "data-if-diagram-move-container",
    "data-if-diagram-add-from-source",
    "data-if-diagram-duplicate-node",
    "data-if-diagram-reorder",
    "data-if-diagram-clear-selection",
    "data-if-diagram-copy-selected",
    "data-if-diagram-apply-selected",
    "data-if-diagram-reset-selected",
    "data-if-diagram-delete-selected",
    "data-if-diagram-edit-tool=\"connect\"",
    "data-if-diagram-route-label",
    "data-if-diagram-route-delete",
    "data-if-connector-routing",
    "data-if-diagram-editor-group=\"inspect\"",
    "data-if-diagram-editor-group=\"text\"",
    "data-if-diagram-editor-group=\"move\"",
    "data-if-diagram-editor-group=\"connect delete\"",
    "data-if-diagram-editor-group=\"style\"",
    ".if-diagram-authoring-surface, .if-diagram-source-panel",
    "if-diagram-source-panel"
  ]);
  assertIncludes("examples/diagrams2.html", [
    "data-if-diagram-layout-autosave=\"true\"",
    "data-if-diagram-source",
    "data-if-diagram-source-refresh",
    "data-if-diagram-source-validate",
    "data-if-diagram-source-format",
    "data-if-diagram-source-apply",
    "data-if-diagram-source-copy",
    "data-if-diagram-source-download",
    "data-if-diagram-source-import",
    "data-if-diagram-container=\"source-data\"",
    "data-if-diagram-container=\"research-workflows\"",
    "data-if-diagram-container=\"agent-orchestration\"",
    "data-if-diagram-container-select",
    "data-if-diagram-move-container",
    "data-if-diagram-add-from-source",
    "data-if-diagram-duplicate-node",
    "data-if-diagram-reorder",
    "data-if-diagram-clear-selection",
    "data-if-diagram-copy-selected",
    "data-if-diagram-apply-selected",
    "data-if-diagram-reset-selected",
    "data-if-diagram-delete-selected",
    "data-if-diagram-editor-group=\"inspect\"",
    "data-if-diagram-editor-group=\"text\"",
    "data-if-diagram-editor-group=\"move\"",
    "data-if-diagram-editor-group=\"connect delete\"",
    "data-if-diagram-editor-group=\"style\"",
    "data-if-diagram-edit-switch-copy",
    "data-if-diagram-editor-current-tool",
    "data-if-diagram-editor-selection-state",
    ".if-diagram-authoring-surface, .if-diagram-source-panel",
    "if-diagram-source-panel",
    "Inspect mode",
    "Add mode"
  ]);
  assertIncludes("examples/diagram3.html", [
    "data-if-diagram-layout-autosave=\"true\"",
    "data-if-diagram-source",
    "data-if-diagram-source-refresh",
    "data-if-diagram-source-validate",
    "data-if-diagram-source-format",
    "data-if-diagram-source-apply",
    "data-if-diagram-source-copy",
    "data-if-diagram-source-download",
    "data-if-diagram-source-import",
    "data-if-diagram-container=\"target-audiences\"",
    "data-if-diagram-container-select",
    "data-if-diagram-move-container",
    "data-if-diagram-add-from-source",
    "data-if-diagram-duplicate-node",
    "data-if-diagram-reorder",
    "data-if-diagram-clear-selection",
    "data-if-diagram-copy-selected",
    "data-if-diagram-apply-selected",
    "data-if-diagram-reset-selected",
    "data-if-diagram-delete-selected",
    "data-if-diagram-edit-tool=\"connect\"",
    "data-if-diagram-route-label",
    "data-if-diagram-route-delete",
    "data-if-connector-routing",
    "data-if-diagram-edit-toggle",
    "data-if-diagram-edit-field=\"title\"",
    "data-if-diagram-node-layout",
    ".if-diagram-authoring-surface, .if-diagram-source-panel",
    "if-diagram-source-panel"
  ]);
  assertIncludes("src/styles/components.css", [
    ".if-diagram-edit-switch",
    ".if-diagram-tool-stack",
    ".if-diagram-source-panel",
    ".if-biotech-diagram .if-diagram-detail-panel--floating",
    ".if-growth-diagram .if-diagram-detail-panel--floating",
    ".if-diagram-editor-head",
    ".if-diagram-editor-tool-group",
    "[data-diagram-edit-tool=\"inspect\"]",
    "[data-diagram-edit-tool=\"connect\"]",
    "[data-diagram-edit-tool=\"delete\"]",
    ".if-diagram-editor-tool-group--help"
  ]);
  assertIncludes("docs/data-schemas.md", [
    "data-if-diagram-source-validate",
    "data-if-diagram-source-format",
    "data-if-diagram-source-copy",
    "data-if-diagram-source-download",
    "data-if-diagram-source-import",
    "data-if-diagram-add-from-source",
    "data-if-diagram-duplicate-node",
    "data-if-diagram-reorder",
    "data-if-diagram-clear-selection",
    "data-if-diagram-copy-selected",
    "data-if-diagram-apply-selected",
    "data-if-diagram-reset-selected",
    "data-if-diagram-delete-selected"
  ]);
  assertIncludes("docs/component-manifest.json", [
    "data-if-diagram-source-format",
    "data-if-diagram-source-import",
    "formatDiagramSourceEditor",
    "applySelectedDiagramJson",
    "importDiagramSourceFile",
    "copySelectedDiagramJson",
    "createDiagramNodeFromSource",
    "duplicateDiagramItem",
    "reorderDiagramItem",
    "resetDiagramFocus",
    "deleteSelectedDiagramTarget",
    "resetSelectedDiagramTarget",
    "if:diagram-node-duplicate",
    "if:diagram-source-node-create",
    "if:diagram-node-reorder",
    "if:diagram-selected-copy",
    "if:diagram-selected-apply",
    "if:diagram-selected-reset"
  ]);
}

function testOverflowAndNestedNodeContracts() {
  assertIncludes("src/styles/components.css", [
    ".if-biotech-medallion",
    "repeat(auto-fit, minmax(min(100%, 7.25rem), 1fr))",
    "overflow-wrap: anywhere",
    "white-space: normal"
  ]);
}

function testDiagramExampleUsesContracts() {
  assertIncludes("examples/diagrams2.html", [
    "data-if-diagram",
    "data-if-diagram-layout-key",
    "data-if-diagram-search",
    "data-if-diagram-layer-toggle",
    "data-if-diagram-edit-toggle",
    "data-if-diagram-edit-tool=\"connect\"",
    "data-if-diagram-route-label",
    "data-if-export-format=\"png\"",
    "data-if-export-format=\"pdf\""
  ]);
}

testRequirementsScope();
testPackageAndValidationHooks();
testDiagramSchemaApi();
testEditorModeContracts();
testOverflowAndNestedNodeContracts();
testDiagramExampleUsesContracts();

if (failures.length) {
  console.error("\nDiagram component contract tests failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("OK diagram component contract tests pass");
