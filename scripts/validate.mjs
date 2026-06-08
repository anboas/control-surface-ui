import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function ok(message) {
  console.log(`OK ${message}`);
}

async function exists(path) {
  try {
    await stat(resolve(root, path));
    return true;
  } catch {
    return false;
  }
}

async function read(path) {
  return readFile(resolve(root, path), "utf8");
}

async function listFiles(dir, extension) {
  const absolute = resolve(root, dir);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) files.push(...await listFiles(relative, extension));
    else if (!extension || extname(entry.name) === extension) files.push(relative);
  }
  return files;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function parseAttributes(source, name) {
  const values = [];
  const pattern = new RegExp(`(?:^|[\\s<])${name}=["']([^"']+)["']`, "g");
  let match;
  while ((match = pattern.exec(source))) values.push(match[1]);
  return values;
}

async function validateRequiredFiles() {
  const required = [
    "src/tokens/index.css",
    "src/styles/index.css",
    "src/js/index.js",
    "dist/interface-framework.css",
    "dist/interface-framework.min.css",
    "dist/interface-framework.js",
    "dist/interface-framework.min.js",
    "dist/interface-framework.esm.js",
    "dist/interface-framework.esm.min.js",
    "dist/interface-framework.checksums.json",
    "dist/SHA256SUMS",
    "release/provenance.json",
    "release/provenance.md",
    "examples/index.html",
    "examples/components.html",
    "examples/dashboard.html",
    "examples/graph-view.html",
    "docs/usage.md",
    "docs/design-system.md",
    "docs/components.md",
    "docs/component-api.md",
    "docs/component-manifest.json",
    "docs/recipes.md",
    "docs/event-catalog.md",
    "docs/agentic-ergonomics.md",
    "docs/agent-handoff.md",
    "docs/mvp-route-contracts.md",
    "docs/route-component-map.md",
    "docs/adapter-fixture-contracts.md",
    "docs/mvp-acceptance-checklist.md",
    "docs/public-site-handoff.md",
    "docs/github-shipping-work-items.md",
    "docs/graph-diagram-production-path.md",
    "docs/document-intelligence-production-path.md",
    "docs/themes.md",
    "docs/forced-colors.md",
    "docs/theme-contrast-report.md",
    "docs/theme-contrast-report.json",
    "docs/data-schemas.md",
    "docs/accessibility.md",
    "docs/keyboard.md",
    "docs/testing.md",
    "docs/performance-budgets.md",
    "docs/qa-baseline.md",
    "docs/release-smoke.md",
    "docs/release-governance.md",
    "docs/migration.md",
    "docs/browser-support.md",
    "docs/deprecation-policy.md",
    "docs/release-checklist.md",
    "docs/next-steps.md",
    "starters/README.md",
    "starters/policy-plain-html/README.md",
    "starters/policy-plain-html/index.html",
    "starters/policy-vite/README.md",
    "starters/policy-vite/package.json",
    "starters/policy-vite/index.html",
    "starters/policy-vite/src/main.js",
    "starters/adamboas-plain-html/README.md",
    "starters/adamboas-plain-html/index.html",
    "starters/adamboas-vite/README.md",
    "starters/adamboas-vite/package.json",
    "starters/adamboas-vite/index.html",
    "starters/adamboas-vite/src/main.js",
    "CHANGELOG.md",
    "README.md",
    "LICENSE",
    "CONTRIBUTING.md",
    "SECURITY.md",
    ".gitignore",
    ".github/CODEOWNERS",
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    "package.json",
    "scripts/accessibility-tests.mjs",
    "scripts/component-contract-tests.mjs",
    "scripts/checksums.mjs",
    "scripts/release-provenance.mjs",
    "scripts/theme-compiler.mjs",
    "playwright.config.mjs",
    "tests/playwright/helpers.mjs",
    "tests/playwright/visual.spec.mjs",
    "tests/playwright/a11y.spec.mjs",
    "tests/playwright/component-contracts.spec.mjs"
  ];
  for (const file of required) assert(await exists(file), `Missing required file: ${file}`);
  ok("required files are present");
}

async function validateRepoHygiene() {
  const pkg = JSON.parse(await read("package.json"));
  const license = await read("LICENSE");
  const contributing = await read("CONTRIBUTING.md");
  const security = await read("SECURITY.md");
  const gitignore = await read(".gitignore");
  const codeowners = await read(".github/CODEOWNERS");
  const shippingWorkItems = await read("docs/github-shipping-work-items.md");

  assert(pkg.license === "MIT", "package.json should declare the MIT license used by LICENSE");
  assert(license.includes("MIT License"), "LICENSE should contain the MIT License text");
  assert(license.includes("Adam Boas"), "LICENSE should name the framework copyright holder");

  [
    "Development Setup",
    "Generated Artifact Policy",
    "Review Checklist",
    "Branching And Release Notes",
    "npm run validate",
    "npm run release:smoke"
  ].forEach((token) => {
    assert(contributing.includes(token), `CONTRIBUTING.md missing repo hygiene guidance: ${token}`);
  });

  [
    "Supported Versions",
    "Reporting A Vulnerability",
    "Security Scope",
    "Maintainer Response"
  ].forEach((token) => {
    assert(security.includes(token), `SECURITY.md missing security guidance: ${token}`);
  });

  [
    "node_modules/",
    "test-results/",
    "playwright-report/",
    "dist/ is part of the distributable framework contract",
    "release/*.tgz is the handoff package evidence",
    "tests/playwright/__screenshots__/ is the visual baseline contract"
  ].forEach((token) => {
    assert(gitignore.includes(token), `.gitignore missing generated artifact policy: ${token}`);
  });

  [
    "* @anboa",
    "/src/",
    "/docs/",
    "/examples/",
    "/scripts/",
    "/tests/"
  ].forEach((token) => {
    assert(codeowners.includes(token), `.github/CODEOWNERS missing ownership rule: ${token}`);
  });

  assert(shippingWorkItems.includes("LICENSE`, `.gitignore`, `CONTRIBUTING.md`, `SECURITY.md`, and `.github/CODEOWNERS`"), "github shipping work items should document FW-002 repo hygiene evidence");
  ok("repo hygiene metadata and ownership contracts are valid");
}

async function validateCIReleaseGate() {
  const ci = await read(".github/workflows/ci.yml");
  const release = await read(".github/workflows/release.yml");
  const shippingWorkItems = await read("docs/github-shipping-work-items.md");
  const releaseChecklist = await read("docs/release-checklist.md");

  [
    "pull_request:",
    "push:",
    "npm ci",
    "npm run theme:compile",
    "npm run build",
    "npm run checksums -- --check",
    "npm run validate",
    "npm run release:smoke",
    "npx playwright install --with-deps chromium",
    "npm run test:browser",
    "actions/upload-artifact@v4",
    "release/*.tgz",
    "docs/release-smoke.md",
    "dist/interface-framework.checksums.json",
    "dist/SHA256SUMS",
    "test-results/playwright",
    "test-results/playwright-report"
  ].forEach((token) => {
    assert(ci.includes(token), `.github/workflows/ci.yml missing CI release gate token: ${token}`);
  });

  [
    "workflow_dispatch:",
    "release_version",
    "id-token: write",
    "npm ci",
    "npm run release:smoke",
    "npm run checksums -- --check",
    "actions/upload-artifact@v4",
    "release/control-surface-ui-${{ inputs.release_version }}.tgz",
    "dist/interface-framework.checksums.json",
    "dist/SHA256SUMS",
    "docs/release-smoke.md",
    "docs/release-checklist.md",
    "docs/release-governance.md",
    "CHANGELOG.md",
    "provenance"
  ].forEach((token) => {
    assert(release.includes(token), `.github/workflows/release.yml missing manual release token: ${token}`);
  });

  [
    "FW-003 CI Release Gate",
    "**Status evidence**",
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    "scripts/validate.mjs",
    "release-smoke",
    "Playwright",
    "id-token: write"
  ].forEach((token) => {
    assert(shippingWorkItems.includes(token), `docs/github-shipping-work-items.md missing FW-003 evidence: ${token}`);
  });

  [
    "CI Release Gate",
    ".github/workflows/ci.yml",
    ".github/workflows/release.yml",
    "Upload Playwright reports",
    "Upload release package and evidence"
  ].forEach((token) => {
    assert(releaseChecklist.includes(token), `docs/release-checklist.md missing CI release gate checklist token: ${token}`);
  });

  ok("CI release gate workflows and evidence are valid");
}

async function validatePackage() {
  const pkg = JSON.parse(await read("package.json"));
  assert(pkg.type === "module", "package.json should publish ESM semantics with type=module");
  for (const script of ["build", "dev", "validate", "test", "accessibility", "test:contracts", "test:diagrams", "test:browser", "test:visual", "test:a11y:browser", "theme:compile", "checksums", "release:provenance", "release:provenance:check", "release:verify"]) {
    assert(Boolean(pkg.scripts?.[script]), `package.json missing ${script} script`);
  }
  const exportTargets = [
    pkg.main,
    pkg.module,
    pkg.browser,
    pkg.style,
    pkg.unpkg,
    pkg.jsdelivr,
    pkg.releaseNotes,
    pkg.cdn?.css,
    pkg.cdn?.cssMin,
    pkg.cdn?.js,
    pkg.cdn?.jsMin,
    pkg.cdn?.esm,
    pkg.cdn?.esmMin,
    pkg.exports?.["."]?.import,
    pkg.exports?.["."]?.default,
    pkg.exports?.["."]?.style,
    pkg.exports?.["./css"],
    pkg.exports?.["./css/min"],
    pkg.exports?.["./js"]?.import || pkg.exports?.["./js"],
    pkg.exports?.["./js"]?.browser,
    pkg.exports?.["./js"]?.default,
    pkg.exports?.["./js/min"],
    pkg.exports?.["./js/esm"],
    pkg.exports?.["./js/esm/min"],
    pkg.exports?.["./tokens"],
    pkg.exports?.["./component-manifest"],
    pkg.exports?.["./recipes"],
    pkg.exports?.["./event-catalog"],
    pkg.exports?.["./agentic-ergonomics"],
    pkg.exports?.["./agent-handoff"],
    pkg.exports?.["./mvp-route-contracts"],
    pkg.exports?.["./route-component-map"],
    pkg.exports?.["./adapter-fixture-contracts"],
    pkg.exports?.["./mvp-acceptance-checklist"],
    pkg.exports?.["./public-site-handoff"],
    pkg.exports?.["./github-shipping-work-items"],
    pkg.exports?.["./starters"],
    pkg.exports?.["./starters/policy-plain-html"],
    pkg.exports?.["./starters/policy-vite"],
    pkg.exports?.["./starters/adamboas-plain-html"],
    pkg.exports?.["./starters/adamboas-vite"],
    pkg.exports?.["./graph-diagram-production-path"],
    pkg.exports?.["./document-intelligence-production-path"],
    pkg.exports?.["./performance-budgets"],
    pkg.exports?.["./theme-contrast-report"],
    pkg.exports?.["./theme-contrast-report/json"],
    pkg.exports?.["./qa-baseline"],
    pkg.exports?.["./forced-colors"],
    pkg.exports?.["./release-governance"],
    pkg.exports?.["./migration"],
    pkg.exports?.["./browser-support"],
    pkg.exports?.["./deprecation-policy"],
    pkg.exports?.["./release-checklist"],
    pkg.exports?.["./checksums"],
    pkg.exports?.["./sha256sums"],
    pkg.exports?.["./dist/interface-framework.css"],
    pkg.exports?.["./dist/interface-framework.min.css"],
    pkg.exports?.["./dist/interface-framework.js"],
    pkg.exports?.["./dist/interface-framework.min.js"],
    pkg.exports?.["./dist/interface-framework.esm.js"],
    pkg.exports?.["./dist/interface-framework.esm.min.js"]
  ].filter(Boolean);
  for (const target of exportTargets) {
    assert(await exists(target.replace(/^\.\//, "")), `Package export target does not exist: ${target}`);
  }
  assert(pkg.publishConfig?.access === "public", "package.json should declare public publishConfig access for CDN publication");
  assert(pkg.unpkg === "./dist/interface-framework.min.js", "package.json unpkg should point to minified browser JS");
  assert(pkg.jsdelivr === "./dist/interface-framework.min.js", "package.json jsdelivr should point to minified browser JS");
  assert(pkg.releaseGovernance?.checksums === "./dist/interface-framework.checksums.json", "package.json should expose checksum release governance metadata");
  assert(pkg.releaseGovernance?.policy === "./docs/release-governance.md", "package.json should expose release governance policy metadata");
  assert(pkg.releaseGovernance?.provenance === "./release/provenance.json", "package.json should expose release provenance evidence metadata");
  ok("package metadata and export targets are valid");
}

async function validateCssImports(file = "src/styles/index.css", seen = new Set()) {
  const absolute = resolve(root, file);
  if (seen.has(absolute)) return;
  seen.add(absolute);
  const source = await read(file);
  const importPattern = /@import\s+["'](.+?)["'];/g;
  let match;
  while ((match = importPattern.exec(source))) {
    const target = resolve(dirname(absolute), match[1]);
    const relative = target.replace(root, "").replace(/^[/\\]/, "").replace(/\\/g, "/");
    assert(await exists(relative), `CSS import does not resolve: ${file} -> ${match[1]}`);
    await validateCssImports(relative, seen);
  }
}

async function validateExamples() {
  const files = await listFiles("examples", ".html");
  const knownExamples = new Set(files.map((file) => `./${file.split("/").pop()}`));
  for (const file of files) {
    const source = await read(file);
    assert(source.includes("../dist/interface-framework.css"), `${file} must load compiled framework CSS`);
    assert(source.includes("../dist/interface-framework.js"), `${file} must load compiled framework JS`);
    assert(!/(href|src)=["'][^"']*src\//.test(source), `${file} must not load framework source files directly`);

    for (const href of parseAttributes(source, "href").filter((value) => value.startsWith("./") && value.endsWith(".html"))) {
      assert(knownExamples.has(href), `${file} links to missing example: ${href}`);
    }

    const ids = parseAttributes(source, "id");
    const seen = new Set();
    const duplicates = new Set();
    ids.forEach((id) => (seen.has(id) ? duplicates.add(id) : seen.add(id)));
    assert(duplicates.size === 0, `${file} has duplicate id values: ${Array.from(duplicates).join(", ")}`);
  }
  ok("examples load dist artifacts and static links are valid");
}

async function validateIconContracts() {
  const js = await read("src/js/index.js");
  const objectMatch = js.match(/const iconPaths = \{([\s\S]*?)\n\};/);
  assert(Boolean(objectMatch), "Unable to find iconPaths registry");
  const defined = new Set(Array.from(objectMatch?.[1].matchAll(/\n\s*([A-Za-z0-9_]+):/g) || []).map((match) => match[1]));
  const html = (await listFiles("examples", ".html")).map(async (file) => read(file));
  const used = new Set((await Promise.all(html))
    .flatMap((source) => parseAttributes(source, "data-if-icon"))
    .filter((icon) => /^[A-Za-z0-9_]+$/.test(icon)));
  const missing = Array.from(used).filter((icon) => !defined.has(icon));
  assert(missing.length === 0, `Examples reference missing icons: ${missing.join(", ")}`);
  ok("icon registry covers example usage");
}

async function validateChartContracts() {
  const allowed = new Set(["bar", "line", "pie", "heatmap", "grouped-bar", "stacked-bar", "gauge", "bullet", "histogram", "funnel", "scatter", "treemap"]);
  const htmlFiles = await listFiles("examples", ".html");
  for (const file of htmlFiles) {
    const source = await read(file);
    const chartTypes = parseAttributes(source, "data-if-chart");
    const unsupported = chartTypes.filter((type) => !allowed.has(type));
    assert(unsupported.length === 0, `${file} references unsupported chart types: ${unsupported.join(", ")}`);
  }
  ok("chart contracts are valid");
}

async function validateDataSchemaDocs() {
  const docs = await read("docs/data-schemas.md");
  const requiredChartTypes = ["bar", "line", "pie", "heatmap", "grouped-bar", "stacked-bar", "gauge", "bullet", "histogram", "funnel", "scatter", "treemap"];
  requiredChartTypes.forEach((type) => {
    assert(docs.includes(`\`${type}\``) || docs.includes(`="${type}"`), `docs/data-schemas.md missing chart schema coverage for ${type}`);
  });
  [
    "Chart Slot Schema",
    "Chart Data Grammars",
    "Sparkline Schema",
    "Adapter State Schema",
    "Data Table Adapter Schema",
    "Export Adapter Schema",
    "Graph Layout Adapter Schema",
    "Document Annotation Schema",
    "Generated point attributes",
    "GraphLayoutAdapterParams",
    "ExportAdapterParams",
    "DocumentAnnotationSchema",
    "PerformanceRunResult",
    "pairsToChartData"
  ].forEach((token) => {
    assert(docs.includes(token), `docs/data-schemas.md missing required section/token: ${token}`);
  });
  ok("data schema docs cover chart, sparkline, and adapter contracts");
}

async function validateLayoutGuardContracts() {
  const componentsCss = await read("src/styles/components.css");
  const utilitiesCss = await read("src/styles/utilities.css");
  const requiredComponentTokens = [
    "Overflow and height guard layer",
    ".if-specimen:has(.if-popover)",
    ".if-table th > *",
    ".if-chart-card__header > .if-badge",
    ".if-motion-lab__card > .if-badge",
    ".if-framework-table-wrap",
    "Performance and scale guard layer",
    ".if-performance-lab",
    ".if-performance-panel__body"
  ];
  requiredComponentTokens.forEach((token) => {
    assert(componentsCss.includes(token), `Missing layout guard CSS contract: ${token}`);
  });
  const requiredUtilityTokens = [
    ".if-min-h-0",
    ".if-max-w-full",
    ".if-scroll-region",
    ".if-clamp-2",
    ".if-equal-height-grid",
    ".if-grid--auto-md",
    ".if-grid--sidebar",
    ".if-grid--custom",
    ".if-basis-half",
    ".if-contain-inline",
    ".if-scroll-shadow",
    ".if-surface-success",
    ".if-border-warning",
    ".if-sm-stack",
    ".if-lg-grid",
    ".if-print-hidden",
    ".if-print-avoid",
    ".if-motion-safe"
  ];
  requiredUtilityTokens.forEach((token) => {
    assert(utilitiesCss.includes(token), `Missing overflow utility CSS contract: ${token}`);
  });
  ok("layout overflow guard contracts are present");
}

async function validatePerformanceScaleContracts() {
  const source = await read("src/js/index.js");
  const components = await read("examples/components.html");
  const docs = `${await read("docs/components.md")}\n${await read("docs/component-api.md")}\n${await read("docs/event-catalog.md")}\n${await read("docs/recipes.md")}`;
  const performanceBudgets = await read("docs/performance-budgets.md");
  [
    "function getPerformanceProfile",
    "function evaluatePerformanceBudgets",
    "function hydratePerformanceLabs",
    "function measureOverflow",
    "function runPerformanceLab",
    "if:performance-run"
  ].forEach((token) => assert(source.includes(token), `performance behavior missing: ${token}`));
  [
    'id="performance-scale"',
    "data-if-performance-lab",
    "data-if-performance-run",
    "data-if-performance-table",
    "data-if-performance-graph",
    "data-if-performance-diagram",
    "data-if-performance-document",
    "data-if-performance-charts",
    "data-if-overflow-check"
  ].forEach((token) => assert(components.includes(token), `performance scale example missing: ${token}`));
  [
    "Performance And Scale Lab",
    "Performance Events",
    "evaluatePerformanceBudgets",
    "runPerformanceLab",
    "measureOverflow",
    "if:performance-run"
  ].forEach((token) => assert(docs.includes(token), `performance scale docs missing: ${token}`));
  [
    "frozen-for-v0.1-performance-handoff",
    "Section budgets",
    "Result Contract",
    "Release Gate",
    "result.budget.passed === false"
  ].forEach((token) => assert(performanceBudgets.includes(token), `performance budget docs missing: ${token}`));
  ok("performance and scale contracts are present");
}

async function validateDemoContracts() {
  const htmlFiles = await listFiles("examples", ".html");
  for (const file of htmlFiles) {
    const source = await read(file);
    const ids = new Set(parseAttributes(source, "id"));
    for (const target of parseAttributes(source, "data-if-control-target")) {
      assert(target.startsWith("#"), `${file} data-if-control-target should reference an id: ${target}`);
      assert(ids.has(target.slice(1)), `${file} data-if-control-target references missing id: ${target}`);
    }
    for (const output of parseAttributes(source, "data-if-control-output")) {
      assert(output.startsWith("#"), `${file} data-if-control-output should reference an id: ${output}`);
      assert(ids.has(output.slice(1)), `${file} data-if-control-output references missing id: ${output}`);
    }
    for (const target of parseAttributes(source, "data-if-demo-target")) {
      assert(target.startsWith("#"), `${file} data-if-demo-target should reference an id: ${target}`);
      assert(ids.has(target.slice(1)), `${file} data-if-demo-target references missing id: ${target}`);
    }
  }
  const docs = `${await read("docs/usage.md")}\n${await read("docs/components.md")}`;
  assert(docs.includes("data-if-control-var"), "Docs should describe data-if-control-var");
  assert(docs.includes("data-if-demo-state"), "Docs should describe data-if-demo-state");
  ok("demo and customization contracts are valid");
}

async function validateJsonData() {
  const files = await listFiles("examples/data", ".json");
  for (const file of files) {
    try {
      JSON.parse(await read(file));
    } catch (error) {
      fail(`${file} is invalid JSON: ${error.message}`);
    }
  }
  ok("example JSON data parses");
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function validateAgenticDocs() {
  let manifest;
  try {
    manifest = JSON.parse(await read("docs/component-manifest.json"));
  } catch (error) {
    fail(`docs/component-manifest.json is invalid JSON: ${error.message}`);
    return;
  }

  const recipes = await read("docs/recipes.md");
  const events = await read("docs/event-catalog.md");
  const ergonomics = await read("docs/agentic-ergonomics.md");
  const handoff = await read("docs/agent-handoff.md");
  const routeContracts = await read("docs/mvp-route-contracts.md");
  const routeComponentMap = await read("docs/route-component-map.md");
  const adapterFixtures = await read("docs/adapter-fixture-contracts.md");
  const mvpAcceptance = await read("docs/mvp-acceptance-checklist.md");
  const githubShipping = await read("docs/github-shipping-work-items.md");
  const releaseChecklist = await read("docs/release-checklist.md");
  const api = await read("docs/component-api.md");
  const pkg = JSON.parse(await read("package.json"));

  assert(manifest.purpose?.includes("Agent-readable"), "component manifest should describe its agent-readable purpose");
  assert(Array.isArray(manifest.components) && manifest.components.length >= 20, "component manifest should include broad component coverage");
  assert(Array.isArray(manifest.categories) && manifest.categories.includes("intelligence-surfaces"), "component manifest should include categories");
  assert(manifest.contractFreeze?.status === "frozen-for-v0.1-handoff", "component manifest should include the v0.1 contract freeze status");
  assert(manifest.contractFreeze?.sourceOfTruth === "docs/component-manifest.json", "component manifest should identify itself as the contract source of truth");
  [
    "stable",
    "experimental",
    "demo-only"
  ].forEach((tier) => {
    assert(manifest.contractFreeze?.stabilityTiers?.[tier], `component manifest missing stability tier definition: ${tier}`);
  });
  [
    "identity fields",
    "whenToUse and avoidWhen guidance",
    "primary classes",
    "data attributes array",
    "JavaScript API array",
    "emitted events or explicit static event policy",
    "contract evidence metadata"
  ].forEach((token) => {
    assert(manifest.contractFreeze?.stableComponentRequirements?.includes(token), `component manifest missing stable component requirement: ${token}`);
  });

  const requiredComponents = [
    "shell-layout",
    "topbar-utility-cluster",
    "buttons-actions",
    "split-button-menu",
    "form-validation",
    "search-autocomplete",
    "upload-dropzone",
    "command-palette",
    "editable-grid",
    "date-calendar-picker",
    "wizard-stepper",
    "annotation-toolbar",
    "state-variants",
    "data-table",
    "charts-analytics",
    "graph-explorer",
    "hierarchy-explorer",
    "claim-tracking",
    "document-viewer",
    "policy-diff",
    "architecture-diagram",
    "governance-patterns",
    "performance-scale-lab",
    "public-site-patterns"
  ];
  const componentIds = manifest.components.map((component) => component.id);
  const uniqueIds = new Set(componentIds);
  assert(uniqueIds.size === componentIds.length, "component manifest component ids should be unique");
  requiredComponents.forEach((id) => assert(uniqueIds.has(id), `component manifest missing required component id: ${id}`));

  const mvpPlanningFreezeStatus = "frozen-for-v0.1-planning-handoff";
  const mvpRoutes = [
    "Overview",
    "Graph",
    "Documents",
    "Review",
    "Sources",
    "Search",
    "Workspace",
    "Diagrams",
    "Data Model"
  ];
  const routeAdapters = {
    Overview: ["overviewMetrics", "policyRecordsTable", "policyRecordDetail", "globalAutocomplete"],
    Graph: ["policyGraphLayout", "graphTraversal", "graphSearch", "graphNodeDetail"],
    Documents: ["documentCorpus", "artifactFetch", "documentSearch", "annotationSchema"],
    Review: ["reviewQueue", "reviewFindingDetail", "reviewDecision", "assignmentLookup"],
    Sources: ["sourceRegistry", "agentRuns", "sourceHealth", "auditLog"],
    Search: ["searchSuggestions", "searchResults", "relatedEntities", "savedSearches"],
    Workspace: ["workspaceViews", "widgetLayout", "userPreferences"],
    Diagrams: ["diagramLayout", "diagramSearch", "diagramExport", "diagramPersistence"],
    "Data Model": ["entityCatalog", "relationshipOntology", "schemaSearch", "decompositionModel"]
  };

  const recipeAnchors = new Set(Array.from(recipes.matchAll(/^#{2,3}\s+(.+)$/gm)).map((match) => slugifyHeading(match[1])));
  const allEvents = new Set();
  const allowedStability = new Set(["stable", "experimental", "demo-only"]);
  const stabilityCounts = { stable: 0, experimental: 0, "demo-only": 0 };

  for (const component of manifest.components) {
    assert(component.id && component.name && component.category, `component manifest entry missing identity fields: ${component.id || component.name || "unknown"}`);
    assert(allowedStability.has(component.stability), `${component.id} should have stability of stable, experimental, or demo-only`);
    assert(component.contract?.stability === component.stability, `${component.id} contract stability should match component stability`);
    assert(component.contract?.releaseTier, `${component.id} should include contract releaseTier`);
    assert(component.contract?.behavior, `${component.id} should include contract behavior`);
    assert(component.contract?.variantCoverage, `${component.id} should include contract variantCoverage`);
    assert(component.contract?.copyPasteCoverage, `${component.id} should include contract copyPasteCoverage`);
    assert(component.contract?.eventPolicy, `${component.id} should include contract eventPolicy`);
    assert(component.contract?.validation === "scripts/validate.mjs validateAgenticDocs", `${component.id} should identify validation ownership`);
    assert(component.contract?.examplesBacked === true, `${component.id} should mark examplesBacked contract evidence`);
    assert(component.contract?.accessibilityBacked === true, `${component.id} should mark accessibilityBacked contract evidence`);
    stabilityCounts[component.stability] += 1;
    assert(Array.isArray(component.whenToUse) && component.whenToUse.length > 0, `${component.id} should include whenToUse guidance`);
    assert(Array.isArray(component.avoidWhen), `${component.id} should include avoidWhen guidance`);
    assert(Array.isArray(component.primaryClasses) && component.primaryClasses.length > 0, `${component.id} should include primaryClasses`);
    assert(Array.isArray(component.dataAttributes), `${component.id} should include dataAttributes`);
    assert(Array.isArray(component.jsApis), `${component.id} should include jsApis`);
    assert(Array.isArray(component.events), `${component.id} should include events`);
    assert(Array.isArray(component.recipes) && component.recipes.length > 0, `${component.id} should include recipe ids`);
    assert(Array.isArray(component.docs) && component.docs.length > 0, `${component.id} should include docs`);
    assert(Array.isArray(component.examples), `${component.id} should include examples`);
    assert(Array.isArray(component.accessibility) && component.accessibility.length > 0, `${component.id} should include accessibility guidance`);
    if (component.stability === "stable") {
      assert(component.status === "production-ready", `${component.id} cannot be stable unless status is production-ready`);
      assert(component.examples.length > 0, `${component.id} stable component should include at least one example`);
      assert(component.jsApis.length > 0 || component.contract.behavior === "static-display", `${component.id} stable component should include JS API metadata or an explicit static-display behavior`);
      assert(component.events.length > 0 || component.contract.eventPolicy.includes("static display"), `${component.id} stable component should include emitted events or an explicit static event policy`);
    }

    for (const recipe of component.recipes) {
      assert(recipeAnchors.has(recipe), `${component.id} references missing recipe anchor: ${recipe}`);
    }
    for (const doc of component.docs) {
      const docFile = doc.split("#")[0];
      assert(await exists(docFile), `${component.id} references missing doc file: ${doc}`);
    }
    for (const example of component.examples) {
      assert(await exists(example), `${component.id} references missing example: ${example}`);
    }
    component.events.forEach((event) => allEvents.add(event));
  }
  assert(stabilityCounts.stable >= 25, "component manifest should classify most handoff components as stable");
  assert(stabilityCounts.experimental >= 1, "component manifest should explicitly classify at least one experimental component");
  assert(stabilityCounts["demo-only"] >= 1, "component manifest should explicitly classify at least one demo-only component");

  for (const eventName of allEvents) {
    assert(events.includes(eventName), `event catalog missing manifest event: ${eventName}`);
  }

  [
    "component-manifest",
    "recipes",
    "event-catalog",
    "agentic-ergonomics",
    "agent-handoff",
    "mvp-route-contracts",
    "route-component-map",
    "adapter-fixture-contracts",
    "mvp-acceptance-checklist",
    "public-site-handoff",
    "github-shipping-work-items"
  ].forEach((exportName) => {
    assert(Boolean(pkg.exports?.[`./${exportName}`]), `package.json missing agentic export: ./${exportName}`);
  });

  [
    "MVP Route Map",
    "Component Selection Guide",
    "Adapter Expectations",
    "Build Order",
    "Trusted Examples",
    "Known Gaps And Cautions",
    "Handoff Freeze Status",
    "First 30 Minutes",
    "Handoff Freeze Verification Matrix",
    "Do not start real MVP implementation work in this framework repository",
    "Source of truth for route scope",
    "Source of truth for component selection",
    "Source of truth for route wiring",
    "Source of truth for adapter payloads",
    "Source of truth for launch readiness",
    "Source of truth for remaining framework backlog",
    "If these artifacts disagree, prefer the route contract first",
    "MVP Ready Checklist",
    "mvp-acceptance-checklist.md",
    "Overview",
    "Graph",
    "Documents",
    "Review",
    "Sources",
    "Search",
    "Workspace",
    "Diagrams",
    "Data Model"
  ].forEach((token) => {
    assert(handoff.includes(token), `docs/agent-handoff.md missing section/token: ${token}`);
  });
  [
    "Policy MVP Acceptance Checklist",
    "Definition Of Ready",
    "Package install",
    "Route contracts",
    "Route-component mapping",
    "Adapter contracts",
    "Component ownership",
    "Browser QA baseline",
    "No unowned P0/P1 component gaps remain",
    "MVP Route Acceptance",
    "Overview",
    "Graph",
    "Documents",
    "Review",
    "Sources",
    "Search",
    "Workspace",
    "Diagrams",
    "Data Model",
    "npm run release:smoke",
    "npm run test:browser"
  ].forEach((token) => {
    assert(mvpAcceptance.includes(token), `docs/mvp-acceptance-checklist.md missing section/token: ${token}`);
  });
  [
    "GitHub Shipping Work Items",
    "Scope Boundary",
    "Definition Of Buttoned Up",
    "Suggested GitHub Labels",
    "Milestones",
    "P0 Work Items",
    "P1 Work Items",
    "Immediate Next Steps",
    "Handoff Package Index",
    "FW-001 Package Release Smoke",
    "FW-004 Agent Handoff Freeze",
    "FW-005 Component Contract Freeze",
    "FW-006 MVP Planning Freeze",
    "stability",
    "contract evidence",
    "`stable`, `experimental`, or `demo-only`",
    "first-30-minutes operating path",
    "handoff freeze verification matrix",
    "no-real-MVP-work guardrail",
    "non-mvp-planning",
    "npm run release:smoke",
    "release/control-surface-ui-0.1.0.tgz"
  ].forEach((token) => {
    assert(githubShipping.includes(token), `docs/github-shipping-work-items.md missing section/token: ${token}`);
  });
  [
    "Agent Handoff Freeze",
    "docs/agent-handoff.md",
    "first-30-minutes operating path",
    "handoff freeze verification matrix",
    "not to start real MVP implementation work"
  ].forEach((token) => {
    assert(releaseChecklist.includes(token), `docs/release-checklist.md missing handoff freeze checklist token: ${token}`);
  });
  [
    "Component Contract Freeze",
    "contractFreeze",
    "stability tier definitions",
    "every component has `stability` and `contract` metadata",
    "events or explicit static-event policy",
    "Contract Stability Model",
    "FW-005 status evidence",
    "scripts/validate.mjs"
  ].forEach((token) => {
    assert(releaseChecklist.includes(token), `docs/release-checklist.md missing component contract freeze checklist token: ${token}`);
  });
  [
    "MVP Planning Freeze",
    "frozen-for-v0.1-planning-handoff",
    "docs/mvp-route-contracts.md",
    "docs/route-component-map.md",
    "docs/adapter-fixture-contracts.md",
    "docs/mvp-acceptance-checklist.md",
    "FW-006 status evidence",
    "no production MVP route code"
  ].forEach((token) => {
    assert(releaseChecklist.includes(token), `docs/release-checklist.md missing MVP planning freeze checklist token: ${token}`);
  });
  [
    routeContracts,
    routeComponentMap,
    adapterFixtures,
    mvpAcceptance
  ].forEach((source, index) => {
    const names = ["docs/mvp-route-contracts.md", "docs/route-component-map.md", "docs/adapter-fixture-contracts.md", "docs/mvp-acceptance-checklist.md"];
    assert(source.includes(mvpPlanningFreezeStatus), `${names[index]} missing MVP planning freeze status`);
  });
  [
    "MVP Planning Freeze Status",
    "route source of truth",
    "without starting production MVP implementation",
    "Production data, authentication, persistence, deployment, and route implementation work remain out of scope"
  ].forEach((token) => {
    assert(routeContracts.includes(token), `docs/mvp-route-contracts.md missing planning freeze token: ${token}`);
  });
  [
    "MVP Planning Freeze Alignment",
    "implementation-selection companion",
    "Trusted examples are composition references only"
  ].forEach((token) => {
    assert(routeComponentMap.includes(token), `docs/route-component-map.md missing planning freeze token: ${token}`);
  });
  [
    "MVP Planning Freeze Coverage",
    "adapter source of truth",
    "serializable, abortable, stateful"
  ].forEach((token) => {
    assert(adapterFixtures.includes(token), `docs/adapter-fixture-contracts.md missing planning freeze token: ${token}`);
  });
  [
    "MVP Planning Freeze Evidence",
    "Planning freeze source-of-truth order",
    "no-real-MVP-work boundary"
  ].forEach((token) => {
    assert(mvpAcceptance.includes(token), `docs/mvp-acceptance-checklist.md missing planning freeze token: ${token}`);
  });
  [
    "FW-006 MVP Planning Freeze",
    "**Status evidence**",
    "frozen-for-v0.1-planning-handoff",
    "Overview, Graph, Documents, Review, Sources, Search, Workspace, Diagrams, and Data Model",
    "success, empty, loading, error, and cancelled states",
    "No production route code is added"
  ].forEach((token) => {
    assert(githubShipping.includes(token), `docs/github-shipping-work-items.md missing FW-006 status evidence token: ${token}`);
  });
  for (const route of mvpRoutes) {
    const routeTablePattern = new RegExp(`\\|\\s*${route.replace(" ", "\\s+")}\\s*\\|`);
    assert(routeContracts.includes(`## ${route}`), `docs/mvp-route-contracts.md missing route section: ${route}`);
    assert(routeTablePattern.test(routeComponentMap), `docs/route-component-map.md missing route row: ${route}`);
    assert(routeTablePattern.test(adapterFixtures), `docs/adapter-fixture-contracts.md missing adapter ownership row: ${route}`);
    assert(routeTablePattern.test(mvpAcceptance), `docs/mvp-acceptance-checklist.md missing route acceptance row: ${route}`);
    assert(handoff.includes(route), `docs/agent-handoff.md missing route reference: ${route}`);
    for (const adapter of routeAdapters[route]) {
      assert(routeContracts.includes(adapter), `docs/mvp-route-contracts.md missing ${route} adapter: ${adapter}`);
      assert(routeComponentMap.includes(adapter), `docs/route-component-map.md missing ${route} adapter: ${adapter}`);
      assert(adapterFixtures.includes(adapter), `docs/adapter-fixture-contracts.md missing ${route} adapter fixture name: ${adapter}`);
    }
  }
  [
    "Global Route Contract",
    "Overview",
    "Graph",
    "Documents",
    "Review",
    "Sources",
    "Search",
    "Workspace",
    "Diagrams",
    "Data Model",
    "Cross-Route Adapter Names",
    "Route Build Readiness Checklist",
    "Primary user jobs",
    "Layout contract",
    "Required adapters",
    "Core events",
    "State requirements",
    "Acceptance checks",
    "loading",
    "success",
    "empty",
    "error",
    "cancelled"
  ].forEach((token) => {
    assert(routeContracts.includes(token), `docs/mvp-route-contracts.md missing section/token: ${token}`);
  });
  [
    "Route Map Matrix",
    "Primary components",
    "Secondary components",
    "Required JavaScript behavior",
    "Expected events",
    "Example-page references",
    "Overview",
    "Graph",
    "Documents",
    "Review",
    "Sources",
    "Search",
    "Workspace",
    "Diagrams",
    "Data Model",
    "Required modules",
    "Required controllers",
    "Minimum adapters",
    "State panels",
    "Build Handoff Checklist"
  ].forEach((token) => {
    assert(routeComponentMap.includes(token), `docs/route-component-map.md missing section/token: ${token}`);
  });
  [
    "Shared Adapter Envelope",
    "Tables",
    "Autocomplete",
    "Graph Layout",
    "Document Annotations",
    "Source Registry",
    "Search",
    "Review Queues",
    "Exports",
    "Adapter Ownership By Route",
    "Fixture Test Matrix",
    "policyRecordsTable",
    "globalAutocomplete",
    "policyGraphLayout",
    "documentCorpus",
    "annotationSchema",
    "sourceRegistry",
    "searchResults",
    "reviewQueue",
    "diagramExport",
    "loading",
    "success",
    "empty",
    "error",
    "cancelled"
  ].forEach((token) => {
    assert(adapterFixtures.includes(token), `docs/adapter-fixture-contracts.md missing section/token: ${token}`);
  });

  [
    "Metadata-First Workflow",
    "Programmatic Behavior Workflow",
    "Component Selection Guidance",
    "Stable Init And Destroy Contracts",
    "Async Adapter Contracts",
    "Agent Documentation Template"
  ].forEach((token) => {
    assert(ergonomics.includes(token), `docs/agentic-ergonomics.md missing section: ${token}`);
  });

  [
    "Quick Selection Table",
    "Stable Init And Destroy",
    "Enterprise Data Table",
    "Graph Explorer",
    "Document Intelligence Viewer",
    "Architecture Diagram"
  ].forEach((token) => {
    assert(recipes.includes(token), `docs/recipes.md missing section: ${token}`);
  });

  [
    "Lifecycle Events",
    "Autocomplete Events",
    "Data Table Events",
    "Graph Events",
    "Document, Annotation, Diff, And Review Events"
  ].forEach((token) => {
    assert(events.includes(token), `docs/event-catalog.md missing section: ${token}`);
  });

  assert(api.includes("Agent-oriented order of operations"), "component-api.md should point agents to manifest, recipes, and events first");
  [
    "Contract Stability Model",
    "`stable`",
    "`experimental`",
    "`demo-only`",
    "Stable components must have",
    "events or an explicit static-event policy",
    "Programmatic Behavior Contract",
    "getComponentController(target)",
    "setDisclosureState",
    "setPressed",
    "setSelected",
    "setExpanded",
    "runAdapterTask",
    "cancelAdapterTask",
    "getAdapterTaskState"
  ].forEach((token) => {
    assert(api.includes(token), `component-api.md missing programmatic behavior token: ${token}`);
  });
  [
    "Programmatic behavior rule",
    "getComponentController(target)",
    "if:adapter-request",
    "if:adapter-result",
    "if:adapter-cancel",
    "if:adapter-error"
  ].forEach((token) => {
    assert(events.includes(token), `event-catalog.md missing programmatic behavior token: ${token}`);
  });
  [
    "programmaticBehavior",
    "getComponentController(target)",
    "setDisclosureState",
    "setPressed",
    "setSelected",
    "setExpanded",
    "runAdapterTask",
    "cancelAdapterTask",
    "getAdapterTaskState"
  ].forEach((token) => {
    assert(JSON.stringify(manifest).includes(token), `component-manifest.json missing programmatic behavior token: ${token}`);
  });
  ok("agentic ergonomics docs and manifest are valid");
}

async function validateCoverageAudit() {
  const audit = await read("docs/component-coverage-audit.md");
  const requiredGapOwners = [
    "upload-dropzone",
    "command-palette",
    "editable-grid",
    "date-calendar-picker",
    "wizard-stepper",
    "annotation-toolbar",
    "state-variants"
  ];
  requiredGapOwners.forEach((id) => {
    assert(audit.includes(`\`${id}\``), `coverage audit missing P0/P1 owner for ${id}`);
  });
  assert(audit.includes("No unowned P0/P1 component gaps remain"), "coverage audit should explicitly close unowned P0/P1 gaps");
  assert(!/\|\s*P[01]\s*\|[^|\n]*Unowned/i.test(audit), "coverage audit contains an unowned P0/P1 row");
  ok("component coverage audit has no unowned P0/P1 gaps");
}

async function validateReadinessDriftGuards() {
  const manifest = JSON.parse(await read("docs/component-manifest.json"));
  const componentsHtml = await read("examples/components.html");
  const coverageAudit = await read("docs/component-coverage-audit.md");
  const nextSteps = await read("docs/next-steps.md");
  const componentDocs = await read("docs/components.md");
  const publicSiteHandoff = await read("docs/public-site-handoff.md");
  const performanceLab = manifest.components.find((component) => component.id === "performance-scale-lab");

  assert(performanceLab?.status === "production-ready", "performance-scale-lab should not remain a false production-hardening blocker");
  assert(performanceLab?.stability === "demo-only", "performance-scale-lab should remain explicitly classified as demo-only QA tooling");
  assert(manifest.components.every((component) => component.status === "production-ready"), "component manifest should not contain stale hardening statuses after QA baseline freeze");

  [
    "Browser baselines frozen",
    "No P0 release blockers after FW-013 starter handoff closure.",
    "Performance budgets",
    "Release provenance",
    "release/provenance.json",
    "public-site handoff",
    "docs/public-site-handoff.md",
    "backlog clear",
    "data-if-component-inventory-deficiency-source",
    "Production starter"
  ].forEach((token) => {
    assert(componentsHtml.includes(token), `components showcase missing current readiness token: ${token}`);
  });

  [
    "Browser baselines next",
    "Need browser visual baselines",
    "Browser baselines remain the next confidence gate",
    "browser baseline evidence",
    "Performance And Scale Lab: close hardening status with QA evidence",
    "starter kits, adapter hardening, performance budgets, release provenance",
    "starter kits, adapter hardening, release provenance",
    "P0: Browser baselines",
    "The remaining work is public-site handoff planning",
    "one package-level deficiency remains"
  ].forEach((token) => {
    assert(!componentsHtml.includes(token), `components showcase contains stale readiness token: ${token}`);
  });

  assert(coverageAudit.includes("QA baseline freeze current"), "coverage audit should describe the active QA baseline freeze");
  assert(nextSteps.includes("Playwright visual baselines"), "next steps should reflect established Playwright visual baselines");
  assert(nextSteps.includes("performance budget gate, starter kits"), "next steps should close the performance budget gate as evidence-backed");
  assert(nextSteps.includes("adapter lifecycle hardening, performance budget gate"), "next steps should close adapter lifecycle hardening as evidence-backed");
  assert(nextSteps.includes("starter kits, graph/diagram production path, document intelligence production path, public-site handoff, and local release provenance are now evidence-backed"), "next steps should close starter kits, public-site handoff, and release provenance as evidence-backed");
  assert(nextSteps.includes("local release provenance are now evidence-backed"), "next steps should close release provenance as evidence-backed");
  assert(nextSteps.includes("The public-site handoff is now evidence-backed"), "next steps should close public-site handoff as evidence-backed");
  assert(nextSteps.includes("The remaining work is ongoing evidence maintenance"), "next steps should name ongoing evidence maintenance as the remaining work");
  assert(componentDocs.includes("Playwright visual baselines"), "component docs should describe current browser evidence instead of planned baselines");

  [
    "frozen-for-v0.1-public-site-handoff",
    "Homepage",
    "Services",
    "Profile",
    "Resume",
    "Insights",
    "Contact",
    "Attribution",
    "Reference Loop",
    "PublicSiteInsightPost",
    "PublicSiteContactRequest",
    "PublicSiteSearchRecord",
    "publicSearchAdapter",
    "contactSubmitAdapter",
    "examples/consulting.html",
    "starters/adamboas-plain-html",
    "starters/adamboas-vite"
  ].forEach((token) => {
    assert(publicSiteHandoff.includes(token), `public-site handoff missing token: ${token}`);
  });

  const deficiencyMatch = componentsHtml.match(/<script type="application\/json" id="component-deficiency-backlog">\s*([\s\S]*?)\s*<\/script>/);
  assert(deficiencyMatch, "components showcase should include component deficiency backlog JSON");
  if (deficiencyMatch) {
    const deficiency = JSON.parse(deficiencyMatch[1]);
    const openIds = new Set((deficiency.openItems || []).map((item) => item.id));
    const closedIds = new Set((deficiency.closedItems || []).map((item) => item.id));
    assert(openIds.size === 0, "deficiency backlog should have no package-level open items after public-site handoff closure");
    assert(closedIds.has("PUBLIC-HANDOFF"), "deficiency backlog should mark PUBLIC-HANDOFF closed");
    assert(!openIds.has("REL-PROV"), "REL-PROV should not remain open in deficiency backlog");
    assert(closedIds.has("REL-PROV"), "deficiency backlog should mark REL-PROV closed");
  }
  ok("readiness drift guards are current");
}

async function validateThemeContracts() {
  const docs = `${await read("docs/themes.md")}\n${await read("docs/forced-colors.md")}\n${await read("docs/theme-contrast-report.md")}`;
  const githubShipping = await read("docs/github-shipping-work-items.md");
  const releaseChecklist = await read("docs/release-checklist.md");
  const packageHandoff = await read("docs/package-handoff.md");
  const agentHandoff = await read("docs/agent-handoff.md");
  const report = JSON.parse(await read("docs/theme-contrast-report.json"));
  const visualSpec = await read("tests/playwright/visual.spec.mjs");
  const examples = await read("examples/theme-states.html");

  [
    "Token Contract",
    "Compiler And Reports",
    "Visual Smoke Page",
    "Forced Colors Guidance",
    "Canvas",
    "CanvasText",
    "Highlight",
    "HighlightText",
    "LinkText"
  ].forEach((token) => {
    assert(docs.includes(token), `Theme docs missing required guidance: ${token}`);
  });

  const requiredThemes = ["light", "system-light", "system-dark", "dark", "midnight", "high-contrast", "calm", "executive"];
  const themeIds = new Set(report.themes?.map((theme) => theme.id));
  requiredThemes.forEach((id) => {
    assert(themeIds.has(id), `Theme contrast report missing theme: ${id}`);
    assert(examples.includes(`id="theme-${id}"`), `Theme state example missing snapshot section: theme-${id}`);
  });

  [
    "### FW-010 Theme And Contrast Release Evidence",
    "**Status evidence**",
    "`scripts/theme-compiler.mjs`",
    "`docs/theme-contrast-report.md`",
    "`docs/theme-contrast-report.json`",
    "`examples/theme-states.html`",
    "`tests/playwright/visual.spec.mjs`",
    "this FW-010 status evidence"
  ].forEach((token) => {
    assert(githubShipping.includes(token), `FW-010 risk register evidence missing ${token}`);
  });

  [
    "## Theme And Contrast Freeze",
    "docs/themes.md",
    "docs/forced-colors.md",
    "docs/theme-contrast-report.md",
    "docs/theme-contrast-report.json",
    "examples/theme-states.html",
    "FW-010 status evidence"
  ].forEach((token) => {
    assert(releaseChecklist.includes(token), `Release checklist missing theme freeze token: ${token}`);
  });

  [
    "docs/themes.md",
    "docs/forced-colors.md",
    "docs/theme-contrast-report.md",
    "docs/theme-contrast-report.json",
    "theme and contrast release contract"
  ].forEach((token) => {
    assert(packageHandoff.includes(token), `Package handoff missing theme artifact: ${token}`);
    assert(agentHandoff.includes(token) || token === "theme and contrast release contract", `Agent handoff missing theme artifact: ${token}`);
  });

  const failing = report.themes?.flatMap((theme) => (theme.checks || []).filter((check) => !check.passes).map((check) => `${theme.id}:${check.id}`)) || [];
  assert(failing.length === 0, `Theme contrast report contains failing checks: ${failing.join(", ")}`);
  assert(report.forcedColors?.mapped === true, "Theme contrast report should verify forced-colors mappings");
  assert(visualSpec.includes("theme semantic state snapshots"), "Visual spec should include theme semantic state snapshots");
  assert(visualSpec.includes("theme-states.html"), "Visual spec should capture the theme state example page");
  try {
    execFileSync(process.execPath, [resolve(root, "scripts/theme-compiler.mjs"), "--check"], { stdio: "pipe" });
  } catch (error) {
    fail(`Theme compiler check failed: ${error.message}`);
  }
  ok("theme compiler, contrast report, forced-colors guidance, and visual smoke contracts are valid");
}

async function validateQABaselineFreeze() {
  const qaBaseline = await read("docs/qa-baseline.md");
  const testing = await read("docs/testing.md");
  const githubShipping = await read("docs/github-shipping-work-items.md");
  const releaseChecklist = await read("docs/release-checklist.md");
  const config = await read("playwright.config.mjs");
  const visualSpec = await read("tests/playwright/visual.spec.mjs");
  const a11ySpec = await read("tests/playwright/a11y.spec.mjs");
  const componentSpec = await read("tests/playwright/component-contracts.spec.mjs");
  const pkg = JSON.parse(await read("package.json"));

  const expectedScreenshots = [
    "overview-dashboard-surface.png",
    "design-system-theme-surface.png",
    "design-system-table-analytics-surface.png",
    "graph-explorer-surface.png",
    "diagram-architecture-surface.png",
    "document-reconstitution-surface.png",
    "theme-light-semantic-states.png",
    "theme-system-light-semantic-states.png",
    "theme-system-dark-semantic-states.png",
    "theme-dark-semantic-states.png",
    "theme-midnight-semantic-states.png",
    "theme-high-contrast-semantic-states.png",
    "theme-calm-semantic-states.png",
    "theme-executive-semantic-states.png"
  ];

  [
    "frozen-for-v0.1-qa-handoff",
    "Browser QA Scope",
    "Baseline Surface Matrix",
    "Theme Snapshot Matrix",
    "Required screenshot count: 14 desktop PNG files and 14 mobile PNG files",
    "Snapshot Update Policy",
    "Known Acceptable Differences",
    "Definition Of Done",
    "tests/playwright/visual.spec.mjs",
    "tests/playwright/a11y.spec.mjs",
    "tests/playwright/component-contracts.spec.mjs"
  ].forEach((token) => {
    assert(qaBaseline.includes(token), `docs/qa-baseline.md missing QA baseline token: ${token}`);
  });

  [
    "qa-baseline.md",
    "Playwright Visual Regression",
    "Updating Screenshots",
    "Browser Accessibility",
    "Component Contract Tests",
    "Full Browser Pass",
    "28 screenshots"
  ].forEach((token) => {
    assert(testing.includes(token), `docs/testing.md missing QA testing token: ${token}`);
  });

  [
    "FW-007 QA Baseline Freeze",
    "**Status evidence**",
    "docs/qa-baseline.md",
    "frozen-for-v0.1-qa-handoff",
    "14 committed PNG baselines",
    "visual.spec.mjs",
    "a11y.spec.mjs",
    "component-contracts.spec.mjs",
    "playwright.config.mjs"
  ].forEach((token) => {
    assert(githubShipping.includes(token), `docs/github-shipping-work-items.md missing FW-007 evidence token: ${token}`);
  });

  [
    "QA Baseline Freeze",
    "frozen-for-v0.1-qa-handoff",
    "chromium-desktop",
    "chromium-mobile",
    "npm run test:browser",
    "playwright.cmd test",
    "FW-007 status evidence"
  ].forEach((token) => {
    assert(releaseChecklist.includes(token), `docs/release-checklist.md missing QA baseline freeze token: ${token}`);
  });

  [
    "snapshotPathTemplate",
    "chromium-desktop",
    "chromium-mobile",
    "reducedMotion",
    "caret",
    "http://127.0.0.1:4173",
    "scripts/dev-server.mjs"
  ].forEach((token) => {
    assert(config.includes(token), `playwright.config.mjs missing QA baseline config token: ${token}`);
  });

  [
    "overview-dashboard-surface",
    "design-system-theme-surface",
    "design-system-table-analytics-surface",
    "graph-explorer-surface",
    "diagram-architecture-surface",
    "document-reconstitution-surface",
    "theme semantic state snapshots"
  ].forEach((token) => {
    assert(visualSpec.includes(token), `tests/playwright/visual.spec.mjs missing visual baseline token: ${token}`);
  });

  [
    "browser accessibility smoke tests",
    "valid controlled regions",
    "account theme controls are keyboard reachable",
    "topbar navigation remains route-aware"
  ].forEach((token) => {
    assert(a11ySpec.includes(token), `tests/playwright/a11y.spec.mjs missing browser a11y token: ${token}`);
  });

  [
    "component and behavior contracts",
    "browser bundle exposes stable framework APIs",
    "table contract supports filtering and selection state",
    "diagram details follow click, close, and click-away contracts",
    "performance scale lab contains large demos"
  ].forEach((token) => {
    assert(componentSpec.includes(token), `tests/playwright/component-contracts.spec.mjs missing browser contract token: ${token}`);
  });

  for (const project of ["chromium-desktop", "chromium-mobile"]) {
    const files = await listFiles(`tests/playwright/__screenshots__/${project}`, ".png");
    const names = new Set(files.map((file) => file.split("/").pop()));
    assert(files.length === expectedScreenshots.length, `${project} should contain ${expectedScreenshots.length} screenshot baselines`);
    for (const screenshot of expectedScreenshots) {
      assert(names.has(screenshot), `${project} missing screenshot baseline: ${screenshot}`);
      assert(qaBaseline.includes(screenshot), `docs/qa-baseline.md missing screenshot reference: ${screenshot}`);
    }
  }

  assert(pkg.exports?.["./qa-baseline"] === "./docs/qa-baseline.md", "package.json missing ./qa-baseline export");
  ok("QA baseline freeze docs, screenshots, Playwright specs, and package export are valid");
}

async function validateGraphDiagramProductionPath() {
  const productionPath = await read("docs/graph-diagram-production-path.md");
  const githubShipping = await read("docs/github-shipping-work-items.md");
  const releaseChecklist = await read("docs/release-checklist.md");
  const packageHandoff = await read("docs/package-handoff.md");
  const agentHandoff = await read("docs/agent-handoff.md");
  const nextSteps = await read("docs/next-steps.md");
  const mvpAcceptance = await read("docs/mvp-acceptance-checklist.md");
  const componentApi = await read("docs/component-api.md");
  const dataSchemas = await read("docs/data-schemas.md");
  const events = await read("docs/event-catalog.md");
  const recipes = await read("docs/recipes.md");
  const accessibility = await read("docs/accessibility.md");
  const diagramRequirements = await read("docs/diagram-component-requirements.md");
  const graphExample = await read("examples/graph-view.html");
  const diagramsExample = await read("examples/diagrams.html");
  const diagramsStressExample = await read("examples/diagrams2.html");
  const source = await read("src/js/index.js");
  const pkg = JSON.parse(await read("package.json"));

  [
    "frozen-for-v0.1-graph-diagram-handoff",
    "Source Of Truth Map",
    "Graph Production Contract",
    "Node Type Delegation",
    "Edge And Relationship Schema",
    "Layout Engine Adapter",
    "GraphLayoutRequest",
    "GraphLayoutResult",
    "hiddenChildren",
    "Traversal, Expansion, And Focus",
    "Accessible Fallback",
    "Stable For v0.1",
    "Experimental For v0.1",
    "Diagram Production Contract",
    "Diagram Node Types, Groups, And Assets",
    "Connector Routing",
    "Search, Highlight, And Detail Focus",
    "Edit Mode Boundaries",
    "Export Adapter",
    "Storage Adapter",
    "Downstream Agent Checklist",
    "Definition Of Done"
  ].forEach((token) => {
    assert(productionPath.includes(token), `docs/graph-diagram-production-path.md missing production-path token: ${token}`);
  });

  [
    "docs/component-api.md",
    "docs/data-schemas.md",
    "docs/event-catalog.md",
    "docs/recipes.md",
    "docs/accessibility.md",
    "docs/diagram-component-requirements.md",
    "examples/graph-view.html",
    "examples/diagrams.html",
    "examples/diagrams2.html"
  ].forEach((token) => {
    assert(productionPath.includes(token), `docs/graph-diagram-production-path.md missing source-of-truth reference: ${token}`);
  });

  [
    "### FW-011 Diagram And Graph Production Path",
    "**Status evidence**",
    "`docs/graph-diagram-production-path.md`",
    "`registerGraphNodeType`",
    "`registerGraphLayoutEngine`",
    "`GraphLayoutRequest`",
    "`GraphLayoutResult`",
    "hiddenChildren",
    "accessible fallback",
    "connector routing",
    "storage adapter",
    "`scripts/validate.mjs`"
  ].forEach((token) => {
    assert(githubShipping.includes(token), `docs/github-shipping-work-items.md missing FW-011 evidence token: ${token}`);
  });

  [
    "Graph And Diagram Production Path Freeze",
    "docs/graph-diagram-production-path.md",
    "frozen-for-v0.1-graph-diagram-handoff",
    "registerGraphNodeType",
    "registerGraphLayoutEngine",
    "GraphLayoutRequest",
    "GraphLayoutResult",
    "hiddenChildren ownership",
    "diagram node types",
    "connector routing",
    "search/highlight",
    "export adapter",
    "storage adapter",
    "Stable For v0.1",
    "Experimental For v0.1",
    "FW-011 status evidence"
  ].forEach((token) => {
    assert(releaseChecklist.includes(token), `docs/release-checklist.md missing graph/diagram freeze token: ${token}`);
  });

  [
    "docs/graph-diagram-production-path.md",
    "production upgrade contract for graph node/edge delegation",
    "diagram edit/session behavior"
  ].forEach((token) => {
    assert(packageHandoff.includes(token), `docs/package-handoff.md missing graph/diagram handoff token: ${token}`);
    assert(agentHandoff.includes(token), `docs/agent-handoff.md missing graph/diagram handoff token: ${token}`);
  });

  [
    "graph and diagram production path gate is now evidence-backed",
    "Graph and diagram production path maintenance",
    "frozen graph and diagram production path gate"
  ].forEach((token) => {
    assert(nextSteps.includes(token), `docs/next-steps.md missing graph/diagram roadmap token: ${token}`);
  });

  [
    "Graph production path",
    "Diagram production path",
    "docs/graph-diagram-production-path.md",
    "node/edge typing",
    "connector routing"
  ].forEach((token) => {
    assert(mvpAcceptance.includes(token), `docs/mvp-acceptance-checklist.md missing graph/diagram production token: ${token}`);
  });

  [
    "registerGraphNodeType",
    "registerGraphLayoutEngine",
    "runGraphLayoutEngine",
    "applyGraphLayoutResult",
    "data-if-graph-child-count",
    "Architecture Diagrams",
    "registerDiagramNodeType",
    "registerDiagramLayoutAdapter",
    "data-if-diagram-search",
    "setDiagramConnectorRoute",
    "Layout editing behavior"
  ].forEach((token) => {
    assert(componentApi.includes(token), `docs/component-api.md missing graph/diagram API token: ${token}`);
  });

  [
    "Graph Node Type Schema",
    "Graph Layout Adapter Schema",
    "GraphLayoutAdapterParams",
    "GraphLayoutAdapterResult",
    "Diagram Layout Snapshot Schema",
    "DiagramDocument",
    "DiagramLayoutAdapter",
    "data-if-diagram-route-waypoint-x",
    "data-if-diagram-layout-save/load/reset"
  ].forEach((token) => {
    assert(dataSchemas.includes(token), `docs/data-schemas.md missing graph/diagram schema token: ${token}`);
  });

  [
    "Graph Events",
    "Diagram And Connector Events",
    "if:graph-layout-request",
    "if:graph-layout-result",
    "if:diagram-search",
    "if:diagram-route-select",
    "if:surface-export-request"
  ].forEach((token) => {
    assert(events.includes(token), `docs/event-catalog.md missing graph/diagram event token: ${token}`);
  });

  [
    "Graph Explorer",
    "Graph Layout Adapter",
    "Architecture Diagram",
    "Diagram Export",
    "InterfaceFramework.registerGraphLayoutEngine",
    "data-if-diagram-search"
  ].forEach((token) => {
    assert(recipes.includes(token), `docs/recipes.md missing graph/diagram recipe token: ${token}`);
  });

  [
    "Graph And Diagram Fallbacks",
    "data-if-graph-a11y",
    "data-if-diagram",
    "Connector labels should not be the only source of meaning"
  ].forEach((token) => {
    assert(accessibility.includes(token), `docs/accessibility.md missing graph/diagram accessibility token: ${token}`);
  });

  [
    "Diagram Component Production Requirements",
    "Node type delegation",
    "Edge routing API",
    "Adapter persistence",
    "Search and highlighting",
    "Export",
    "Overflow safety"
  ].forEach((token) => {
    assert(diagramRequirements.includes(token), `docs/diagram-component-requirements.md missing production requirement token: ${token}`);
  });

  [
    "data-if-graph",
    "data-if-graph-child-count",
    "data-if-graph-a11y",
    "data-if-graph-layout-engine"
  ].forEach((token) => {
    assert(graphExample.includes(token), `examples/graph-view.html missing graph production token: ${token}`);
  });

  [
    "data-if-diagram",
    "data-if-diagram-search",
    "data-if-export",
    "data-if-connector-routing"
  ].forEach((token) => {
    assert(`${diagramsExample}\n${diagramsStressExample}`.includes(token), `diagram examples missing production token: ${token}`);
  });

  [
    "function registerGraphLayoutEngine",
    "function registerGraphNodeType",
    "function registerDiagramNodeType",
    "function registerDiagramLayoutAdapter",
    "function registerExportAdapter",
    "function updateDiagramSearch",
    "function setDiagramConnectorRoute"
  ].forEach((token) => {
    assert(source.includes(token), `src/js/index.js missing graph/diagram public hook: ${token}`);
  });

  assert(pkg.exports?.["./graph-diagram-production-path"] === "./docs/graph-diagram-production-path.md", "package.json missing ./graph-diagram-production-path export");
  ok("graph and diagram production path freeze docs, APIs, examples, and package export are valid");
}

async function validateDocumentIntelligenceProductionPath() {
  const productionPath = await read("docs/document-intelligence-production-path.md");
  const githubShipping = await read("docs/github-shipping-work-items.md");
  const releaseChecklist = await read("docs/release-checklist.md");
  const packageHandoff = await read("docs/package-handoff.md");
  const agentHandoff = await read("docs/agent-handoff.md");
  const nextSteps = await read("docs/next-steps.md");
  const mvpAcceptance = await read("docs/mvp-acceptance-checklist.md");
  const componentApi = await read("docs/component-api.md");
  const dataSchemas = await read("docs/data-schemas.md");
  const events = await read("docs/event-catalog.md");
  const recipes = await read("docs/recipes.md");
  const accessibility = await read("docs/accessibility.md");
  const keyboard = await read("docs/keyboard.md");
  const documentExample = await read("examples/document-viewer.html");
  const source = await read("src/js/index.js");
  const pkg = JSON.parse(await read("package.json"));

  [
    "frozen-for-v0.1-document-intelligence-handoff",
    "Source Of Truth Map",
    "Document Intelligence Production Contract",
    "DocumentCorpusRecord",
    "DocumentArtifactRecord",
    "DocumentLineRecord",
    "DocumentParserOutput",
    "DocumentAnnotationRecord",
    "DocumentSearchResult",
    "DocumentReferenceRecord",
    "DocumentRelationshipRecord",
    "DocumentReviewFinding",
    "Search And Highlight Contract",
    "References, Relationships, And Authority",
    "Review Workflow Handoff",
    "Adapter Contract",
    "Accessible Fallback",
    "Stable For v0.1",
    "Experimental For v0.1",
    "Downstream Agent Checklist",
    "Definition Of Done"
  ].forEach((token) => {
    assert(productionPath.includes(token), `docs/document-intelligence-production-path.md missing production-path token: ${token}`);
  });

  [
    "claim",
    "organization",
    "reference",
    "obligation",
    "relationship",
    "implementation",
    "evidence",
    "gap",
    "hydrateDocumentCorpus",
    "hydrateDocumentAnnotations",
    "updateDocumentSearch",
    "selectDocumentAnnotation",
    "if:doc-annotation-select",
    "if:doc-annotation-panel",
    "runAdapterTask",
    "cancelAdapterTask",
    "getAdapterTaskState"
  ].forEach((token) => {
    assert(productionPath.includes(token), `docs/document-intelligence-production-path.md missing document intelligence contract token: ${token}`);
  });

  [
    "docs/component-api.md",
    "docs/data-schemas.md",
    "docs/event-catalog.md",
    "docs/recipes.md",
    "docs/accessibility.md",
    "docs/keyboard.md",
    "examples/document-viewer.html",
    "src/js/index.js",
    "docs/route-component-map.md",
    "docs/mvp-acceptance-checklist.md"
  ].forEach((token) => {
    assert(productionPath.includes(token), `docs/document-intelligence-production-path.md missing source-of-truth reference: ${token}`);
  });

  [
    "### FW-017 Document Intelligence Production Path",
    "**Status evidence**",
    "`docs/document-intelligence-production-path.md`",
    "`DocumentParserOutput`",
    "`DocumentAnnotationRecord`",
    "`DocumentReviewFinding`",
    "claim, organization, reference, obligation, relationship, implementation, evidence, and gap",
    "`hydrateDocumentCorpus`",
    "`hydrateDocumentAnnotations`",
    "`updateDocumentSearch`",
    "`selectDocumentAnnotation`",
    "`if:doc-annotation-select`",
    "`if:doc-annotation-panel`",
    "`scripts/validate.mjs`"
  ].forEach((token) => {
    assert(githubShipping.includes(token), `docs/github-shipping-work-items.md missing FW-017 evidence token: ${token}`);
  });

  [
    "Document Intelligence Production Path Freeze",
    "docs/document-intelligence-production-path.md",
    "frozen-for-v0.1-document-intelligence-handoff",
    "DocumentCorpusRecord",
    "DocumentArtifactRecord",
    "DocumentParserOutput",
    "DocumentAnnotationRecord",
    "DocumentReviewFinding",
    "claim, organization, reference, obligation, relationship, implementation, evidence, and gap",
    "loading, success, empty, error, cancelled",
    "runAdapterTask",
    "FW-017 status evidence"
  ].forEach((token) => {
    assert(releaseChecklist.includes(token), `docs/release-checklist.md missing document intelligence freeze token: ${token}`);
  });

  [
    "docs/document-intelligence-production-path.md",
    "document parser output",
    "annotation records",
    "review finding handoff"
  ].forEach((token) => {
    assert(packageHandoff.includes(token), `docs/package-handoff.md missing document intelligence handoff token: ${token}`);
    assert(agentHandoff.includes(token), `docs/agent-handoff.md missing document intelligence handoff token: ${token}`);
  });

  [
    "document intelligence production path gate is now evidence-backed",
    "Document intelligence production path maintenance",
    "frozen document intelligence production path"
  ].forEach((token) => {
    assert(nextSteps.includes(token), `docs/next-steps.md missing document intelligence roadmap token: ${token}`);
  });

  [
    "Document parser path",
    "docs/document-intelligence-production-path.md",
    "parser output",
    "annotation schemas",
    "obligations",
    "relationships",
    "evidence",
    "gaps"
  ].forEach((token) => {
    assert(mvpAcceptance.includes(token), `docs/mvp-acceptance-checklist.md missing document intelligence production token: ${token}`);
  });

  [
    "Document Viewer And Reconstituted Text",
    "hydrateDocumentViewers",
    "hydrateDocumentCorpus",
    "hydrateDocumentAnnotations",
    "updateDocumentSearch",
    "selectDocumentArtifact",
    "selectDocumentAnnotation",
    "setDocumentArtifactMode",
    "getDocumentViewerState",
    "getDocumentWorkspaceState",
    "if:doc-annotation-select",
    "if:doc-annotation-panel"
  ].forEach((token) => {
    assert(componentApi.includes(token), `docs/component-api.md missing document intelligence API token: ${token}`);
  });

  [
    "Document Annotation Schema",
    "DocumentAnnotationSchema",
    "DocumentParserOutput",
    "DocumentReviewFinding",
    "claim",
    "organization",
    "reference",
    "obligation",
    "relationship"
  ].forEach((token) => {
    assert(dataSchemas.includes(token), `docs/data-schemas.md missing document intelligence schema token: ${token}`);
  });

  [
    "if:doc-artifact-select",
    "if:doc-search",
    "if:doc-filter-change",
    "if:doc-highlight-change",
    "if:doc-jump",
    "if:doc-annotation-select",
    "if:doc-annotation-panel",
    "if:doc-mode-change"
  ].forEach((token) => {
    assert(events.includes(token), `docs/event-catalog.md missing document intelligence event token: ${token}`);
  });

  [
    "Document Viewer",
    "data-if-doc-workspace",
    "data-if-doc-corpus",
    "data-if-doc-search",
    "data-if-doc-highlight",
    "data-if-doc-annotation",
    "if:doc-annotation-select"
  ].forEach((token) => {
    assert(recipes.includes(token), `docs/recipes.md missing document intelligence recipe token: ${token}`);
  });

  [
    "document annotation views",
    "Document viewers expose search results",
    "CLM/REF/ORG"
  ].forEach((token) => {
    assert(accessibility.includes(token), `docs/accessibility.md missing document intelligence accessibility token: ${token}`);
  });

  [
    "Document annotations",
    "Enter / Space",
    "Escape"
  ].forEach((token) => {
    assert(keyboard.includes(token), `docs/keyboard.md missing document intelligence keyboard token: ${token}`);
  });

  [
    "data-if-doc-workspace",
    "data-if-doc-viewer",
    "data-if-doc-search",
    "data-if-doc-highlight",
    "data-if-doc-filter",
    "data-if-doc-jump",
    "if-doc-mark",
    "data-if-doc-annotation-panel"
  ].forEach((token) => {
    assert(documentExample.includes(token), `examples/document-viewer.html missing document intelligence example token: ${token}`);
  });

  [
    "function getDocumentWorkspaceState",
    "function getDocumentViewerState",
    "function getDocumentAnnotationSchema",
    "function getDocumentAnnotationSchemas",
    "function selectDocumentAnnotation",
    "function setDocumentArtifactMode",
    "function updateDocumentSearch",
    "async function hydrateDocumentCorpus",
    "function hydrateDocumentViewers"
  ].forEach((token) => {
    assert(source.includes(token), `src/js/index.js missing document intelligence public hook: ${token}`);
  });

  assert(pkg.exports?.["./document-intelligence-production-path"] === "./docs/document-intelligence-production-path.md", "package.json missing ./document-intelligence-production-path export");
  ok("document intelligence production path freeze docs, APIs, examples, and package export are valid");
}

async function validateReleaseGovernanceContracts() {
  const pkg = JSON.parse(await read("package.json"));
  const changelog = await read("CHANGELOG.md");
  const releaseGovernance = await read("docs/release-governance.md");
  const migration = await read("docs/migration.md");
  const browserSupport = await read("docs/browser-support.md");
  const deprecation = await read("docs/deprecation-policy.md");
  const checklist = await read("docs/release-checklist.md");
  const checksumManifest = JSON.parse(await read("dist/interface-framework.checksums.json"));
  const sha256sums = await read("dist/SHA256SUMS");
  const provenance = JSON.parse(await read("release/provenance.json"));
  const provenanceMarkdown = await read("release/provenance.md");

  [
    "Release Artifacts",
    "Release Gates",
    "Checksum And Signing Policy",
    "Local Provenance Evidence",
    "Downstream Upgrade Audit",
    "Definition Of Done"
  ].forEach((token) => assert(releaseGovernance.includes(token), `release governance docs missing: ${token}`));

  [
    "0.1.0",
    "Future Migration Template",
    "Downstream Checklist"
  ].forEach((token) => assert(migration.includes(token), `migration docs missing: ${token}`));

  [
    "Supported Browsers",
    "latest two stable releases",
    "Internet Explorer is not supported",
    "Support Change Policy"
  ].forEach((token) => assert(browserSupport.includes(token), `browser support docs missing: ${token}`));

  [
    "Public Contracts",
    "Deprecation Lifecycle",
    "Emergency Removal"
  ].forEach((token) => assert(deprecation.includes(token), `deprecation docs missing: ${token}`));

  [
    "Build And Static Verification",
    "Package Smoke",
    "Signing And Checksums",
    "npm run release:provenance:check",
    "release/provenance.json"
  ].forEach((token) => assert(checklist.includes(token), `release checklist missing: ${token}`));

  [
    "Release Governance",
    "Migration Notes",
    "Browser Support",
    "Deprecation",
    "Checksums"
  ].forEach((token) => assert(changelog.includes(token), `CHANGELOG.md missing release governance token: ${token}`));

  assert(pkg.releaseGovernance?.migration === "./docs/migration.md", "package releaseGovernance metadata should include migration docs");
  assert(pkg.releaseGovernance?.browserSupport === "./docs/browser-support.md", "package releaseGovernance metadata should include browser support docs");
  assert(pkg.releaseGovernance?.deprecationPolicy === "./docs/deprecation-policy.md", "package releaseGovernance metadata should include deprecation policy docs");
  assert(pkg.releaseGovernance?.provenance === "./release/provenance.json", "package releaseGovernance metadata should include release provenance evidence");
  assert(checksumManifest.packageName === pkg.name, "checksum manifest package name should match package.json");
  assert(checksumManifest.packageVersion === pkg.version, "checksum manifest package version should match package.json");
  assert(checksumManifest.algorithm === "sha256", "checksum manifest should use sha256");
  assert(checksumManifest.signing?.productionPolicy, "checksum manifest should include signing policy metadata");

  const artifactPaths = new Set((checksumManifest.artifacts || []).map((artifact) => artifact.path));
  [
    "dist/interface-framework.css",
    "dist/interface-framework.min.css",
    "dist/interface-framework.js",
    "dist/interface-framework.min.js",
    "dist/interface-framework.esm.js",
    "dist/interface-framework.esm.min.js",
    "docs/release-governance.md",
    "docs/migration.md",
    "docs/browser-support.md",
    "docs/deprecation-policy.md",
    "docs/release-checklist.md"
  ].forEach((path) => assert(artifactPaths.has(path), `checksum manifest missing artifact: ${path}`));

  for (const artifact of checksumManifest.artifacts || []) {
    assert(/^[a-f0-9]{64}$/.test(artifact.sha256), `checksum artifact has invalid SHA-256: ${artifact.path}`);
    assert(sha256sums.includes(`${artifact.sha256}  ${artifact.path}`), `SHA256SUMS missing artifact: ${artifact.path}`);
  }

  assert(provenance.status === "local-provenance-frozen", "release provenance status should be local-provenance-frozen");
  assert(provenance.packageName === pkg.name, "release provenance package name should match package.json");
  assert(provenance.packageVersion === pkg.version, "release provenance package version should match package.json");
  assert(provenance.runtime?.noReactRuntimeDependency === true, "release provenance should prove no React runtime dependency");
  assert(provenance.checksumEvidence?.artifactCount === checksumManifest.artifacts.length, "release provenance checksum evidence should match checksum manifest artifact count");
  assert((provenance.packageArtifacts || []).some((artifact) => artifact.path === `release/${pkg.name}-${pkg.version}.tgz`), "release provenance should include the release tarball hash");
  assert(provenance.releaseIdentity?.npmProvenanceCommand === "npm publish --provenance", "release provenance should document npm provenance publishing command");
  assert(provenanceMarkdown.includes("No React runtime dependency: yes"), "release provenance markdown should summarize no React runtime status");
  assert(provenanceMarkdown.includes("npm publish --provenance"), "release provenance markdown should summarize external publishing policy");

  try {
    execFileSync(process.execPath, [resolve(root, "scripts/checksums.mjs"), "--check"], { stdio: "pipe" });
  } catch (error) {
    fail(`Checksum verification failed: ${error.message}`);
  }

  try {
    execFileSync(process.execPath, [resolve(root, "scripts/release-provenance.mjs"), "--check"], { stdio: "pipe" });
  } catch (error) {
    fail(`Release provenance verification failed: ${error.message}`);
  }

  ok("release governance docs, metadata, checksums, and provenance are valid");
}

function validateJavaScriptSyntax() {
  for (const file of [
    "src/js/index.js",
    "src/js/demo.js",
    "scripts/build.mjs",
    "scripts/dev-server.mjs",
    "scripts/validate.mjs",
    "scripts/checksums.mjs",
    "scripts/release-provenance.mjs",
    "scripts/theme-compiler.mjs",
    "scripts/behavior-tests.mjs",
    "scripts/accessibility-tests.mjs",
    "scripts/component-contract-tests.mjs",
    "scripts/diagram-component-tests.mjs",
    "playwright.config.mjs",
    "tests/playwright/helpers.mjs",
    "tests/playwright/visual.spec.mjs",
    "tests/playwright/a11y.spec.mjs",
    "tests/playwright/component-contracts.spec.mjs"
  ]) {
    execFileSync(process.execPath, ["--check", resolve(root, file)], { stdio: "pipe" });
  }
  ok("JavaScript syntax checks pass");
}

function validateBehaviorContracts() {
  try {
    execFileSync(process.execPath, [resolve(root, "scripts/behavior-tests.mjs")], { stdio: "inherit" });
  } catch (error) {
    fail(`Behavior contract tests failed: ${error.message}`);
  }
}

function validateAccessibilityContracts() {
  try {
    execFileSync(process.execPath, [resolve(root, "scripts/accessibility-tests.mjs")], { stdio: "inherit" });
  } catch (error) {
    fail(`Accessibility contract tests failed: ${error.message}`);
  }
}

function validateComponentContracts() {
  try {
    execFileSync(process.execPath, [resolve(root, "scripts/component-contract-tests.mjs")], { stdio: "inherit" });
  } catch (error) {
    fail(`Component contract tests failed: ${error.message}`);
  }
}

function validateDiagramComponentContracts() {
  try {
    execFileSync(process.execPath, [resolve(root, "scripts/diagram-component-tests.mjs")], { stdio: "inherit" });
  } catch (error) {
    fail(`Diagram component contract tests failed: ${error.message}`);
  }
}

await validateRequiredFiles();
await validateRepoHygiene();
await validateCIReleaseGate();
await validatePackage();
await validateCssImports();
ok("CSS imports resolve");
await validateExamples();
await validateIconContracts();
await validateChartContracts();
await validateDataSchemaDocs();
await validateLayoutGuardContracts();
await validatePerformanceScaleContracts();
await validateDemoContracts();
await validateJsonData();
await validateAgenticDocs();
await validateCoverageAudit();
await validateReadinessDriftGuards();
await validateThemeContracts();
await validateQABaselineFreeze();
await validateGraphDiagramProductionPath();
await validateDocumentIntelligenceProductionPath();
await validateReleaseGovernanceContracts();
validateJavaScriptSyntax();
validateBehaviorContracts();
validateAccessibilityContracts();
validateComponentContracts();
validateDiagramComponentContracts();

if (failures.length) {
  console.error("\nValidation failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("\nInterface framework validation passed.");
