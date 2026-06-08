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

function testPackageScripts() {
  const pkg = JSON.parse(read("package.json"));
  [
    "test:contracts",
    "test:browser",
    "test:visual",
    "test:a11y:browser",
    "playwright:install",
    "checksums",
    "release:provenance",
    "release:provenance:check",
    "release:verify"
  ].forEach((script) => assert(Boolean(pkg.scripts?.[script]), `package.json missing ${script} script`));
  assert(Boolean(pkg.devDependencies?.["@playwright/test"]), "package.json missing @playwright/test dev dependency");
  assert(pkg.unpkg === "./dist/interface-framework.min.js", "package.json missing CDN-ready unpkg path");
  assert(pkg.jsdelivr === "./dist/interface-framework.min.js", "package.json missing CDN-ready jsdelivr path");
  assert(pkg.cdn?.cssMin === "./dist/interface-framework.min.css", "package.json missing CDN CSS metadata");
  assert(pkg.releaseNotes === "./CHANGELOG.md", "package.json missing release notes metadata");
  assert(pkg.releaseGovernance?.checksums === "./dist/interface-framework.checksums.json", "package.json missing release governance checksum metadata");
  assert(pkg.releaseGovernance?.provenance === "./release/provenance.json", "package.json missing release provenance metadata");
  assert(pkg.exports?.["./release-governance"] === "./docs/release-governance.md", "package.json missing release governance export");
  assert(pkg.exports?.["./checksums"] === "./dist/interface-framework.checksums.json", "package.json missing checksum export");
}

function testPlaywrightFiles() {
  [
    "playwright.config.mjs",
    "tests/playwright/helpers.mjs",
    "tests/playwright/visual.spec.mjs",
    "tests/playwright/a11y.spec.mjs",
    "tests/playwright/component-contracts.spec.mjs",
    "docs/testing.md"
  ].forEach((file) => assert(exists(file), `Missing test infrastructure file: ${file}`));

  assertIncludes("playwright.config.mjs", [
    "defineConfig",
    "chromium-desktop",
    "chromium-mobile",
    "snapshotPathTemplate"
  ]);
  assertIncludes("tests/playwright/visual.spec.mjs", [
    "toHaveScreenshot",
    "overview-dashboard-surface",
    "graph-explorer-surface",
    "diagram-architecture-surface",
    "document-reconstitution-surface"
  ]);
  assertIncludes("tests/playwright/a11y.spec.mjs", [
    "visibleElementIssues",
    "account theme controls",
    "aria-current",
    "data-theme"
  ]);
  assertIncludes("tests/playwright/component-contracts.spec.mjs", [
    "window.InterfaceFramework",
    "getBehaviorModules",
    "data-attribute contracts",
    "table contract",
    "diagram details"
  ]);
}

function testFrameworkSurfaceContracts() {
  assertIncludes("src/js/index.js", [
    "function init(",
    "function destroy(",
    "function registerBehaviorModule(",
    "function registerDataTableAdapter(",
    "function registerGraphLayoutEngine(",
    "function registerGraphNodeType(",
    "function applyGraphNodeTypes(",
    "function registerHierarchyNodeType(",
    "function applyHierarchyStructure(",
    "function registerAutocompleteAdapter(",
    "function registerExportAdapter(",
    "function setAdapterState(",
    "function runPerformanceLab(",
    "function measureOverflow(",
    "function getDocumentAnnotationSchema(",
    "function setTheme(",
    "function validateForm("
  ]);
  assertIncludes("examples/components.html", [
    "id=\"themes\"",
    "data-if-theme-control",
    "data-if-autocomplete",
    "data-if-tooltip",
    "data-if-data-table",
    "data-if-chart",
    "id=\"performance-scale\"",
    "data-if-performance-lab",
    "id=\"component-policy-table\"",
    "Utility breadth",
    "Theme generation",
    "Ecosystem adoption",
    "Where Tailwind is still ahead"
  ]);
  assertIncludes("examples/components.html", [
    "id=\"release-governance\"",
    "Release Governance",
    "dist/interface-framework.checksums.json",
    "npm run release:verify"
  ]);
  assertIncludes("examples/graph-view.html", [
    "data-if-graph",
    "data-if-graph-edge",
    "data-if-graph-cluster",
    "data-if-graph-a11y"
  ]);
  assertIncludes("examples/diagrams.html", [
    "data-if-diagram",
    "data-if-diagram-detail",
    "data-if-diagram-item",
    "data-if-diagram-var"
  ]);
  assertIncludes("examples/document-viewer.html", [
    "data-if-doc-viewer",
    "data-if-doc-search",
    "data-if-doc-highlight",
    "data-if-doc-lines"
  ]);
}

function testDocsCoverage() {
  assertIncludes("docs/testing.md", [
    "Playwright Visual Regression",
    "Browser Accessibility",
    "Component Contract Tests",
    "Updating Screenshots",
    "npm run test:visual"
  ]);
  assertIncludes("docs/usage.md", [
    "npm run test:contracts",
    "npm run test:visual",
    "npm run test:a11y:browser",
    "npm run release:verify",
    "release-governance.md"
  ]);
  assertIncludes("README.md", [
    "npm run test:contracts",
    "npm run test:visual",
    "docs/testing.md",
    "docs/next-steps.md",
    "CHANGELOG.md",
    "cdn.jsdelivr.net",
    "docs/release-governance.md",
    "dist/interface-framework.checksums.json"
  ]);
  assertIncludes("docs/next-steps.md", [
    "Release smoke testing",
    "Framework Parity Notes",
    "Where Tailwind Is Still Ahead",
    "Utility breadth",
    "Theme generation",
    "Ecosystem adoption",
    "Graph layout engine integration",
    "Document annotation model",
    "Production adapter contract",
    "Suggested Next Pass"
  ]);
  assertIncludes("CHANGELOG.md", [
    "## 0.1.0 - 2026-05-17",
    "CDN Usage",
    "interface-framework.min.css",
    "interface-framework.min.js",
    "Release Governance",
    "Migration Notes",
    "Checksums"
  ]);
  assertIncludes("docs/release-governance.md", [
    "Release Artifacts",
    "Checksum And Signing Policy",
    "Downstream Upgrade Audit"
  ]);
  assertIncludes("docs/migration.md", [
    "0.1.0",
    "Future Migration Template"
  ]);
  assertIncludes("docs/browser-support.md", [
    "Supported Browsers",
    "Internet Explorer is not supported"
  ]);
  assertIncludes("docs/deprecation-policy.md", [
    "Public Contracts",
    "Deprecation Lifecycle"
  ]);
  assertIncludes("docs/release-checklist.md", [
    "Package Smoke",
    "Signing And Checksums"
  ]);
  assertIncludes("docs/component-api.md", [
    "API table",
    "Variant Matrix",
    "Copy-Paste",
    "## Shell And Layout",
    "## Buttons",
    "## Search And Autocomplete",
    "## Tables",
    "## Graph View",
    "## Document Viewer And Reconstituted Text",
    "## Architecture Diagrams",
    "Stable JavaScript API Matrix"
  ]);
  assertIncludes("docs/usage.md", [
    "component-api.md",
    "API tables",
    "variant matrices",
    "copy-paste"
  ]);
  assertIncludes("docs/design-system.md", [
    "component-api.md",
    "API table",
    "variant matrix",
    "copy-paste example"
  ]);
}

testPackageScripts();
testPlaywrightFiles();
testFrameworkSurfaceContracts();
testDocsCoverage();

if (failures.length) {
  console.error("\nComponent contract tests failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("OK component contract tests pass");
