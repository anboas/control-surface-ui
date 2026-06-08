import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function listFiles(dir, extension) {
  const absolute = resolve(root, dir);
  const files = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const relative = join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) files.push(...listFiles(relative, extension));
    else if (!extension || extname(entry.name) === extension) files.push(relative);
  }
  return files;
}

function exists(path) {
  try {
    statSync(resolve(root, path));
    return true;
  } catch {
    return false;
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTags(source, predicate = () => true) {
  return Array.from(source.matchAll(/<([a-zA-Z][\w:-]*)\b[^>]*>/g))
    .map((match) => match[0])
    .filter(predicate);
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`\\s${escapeRegex(name)}=["']([^"']*)["']`, "i"));
  return match?.[1] || "";
}

function hasAttr(tag, name) {
  return new RegExp(`\\s${escapeRegex(name)}(?:\\s|=|>|$)`, "i").test(tag);
}

function getIds(source) {
  return new Set(Array.from(source.matchAll(/\sid=["']([^"']+)["']/g)).map((match) => match[1]));
}

function hasStaticId(value) {
  return Boolean(value) && !/[${}()[\]]/.test(value);
}

function splitIdRefs(value) {
  return value.split(/\s+/).filter(hasStaticId);
}

function hasAccessibleName(tag) {
  return Boolean(getAttr(tag, "aria-label") || getAttr(tag, "aria-labelledby") || getAttr(tag, "title"));
}

function validateDocs() {
  const requiredFiles = ["docs/accessibility.md", "docs/keyboard.md"];
  requiredFiles.forEach((file) => assert(exists(file), `Missing accessibility documentation file: ${file}`));

  const accessibility = read("docs/accessibility.md");
  [
    "Accessibility Contract",
    "ARIA Patterns",
    "Component Requirements",
    "Testing Checklist",
    "Known Manual Checks",
    "Graph And Diagram Fallbacks"
  ].forEach((section) => {
    assert(accessibility.includes(section), `docs/accessibility.md missing section: ${section}`);
  });

  [
    "Button",
    "Split button",
    "Search / autocomplete",
    "Tabs",
    "Accordion",
    "Modal",
    "Data table",
    "Graph / network",
    "Hierarchy / tree",
    "Document viewer",
    "Review workflow",
    "Architecture diagrams"
  ].forEach((component) => {
    assert(accessibility.includes(component), `docs/accessibility.md missing ARIA coverage for ${component}`);
  });

  const keyboard = read("docs/keyboard.md");
  [
    "Keyboard Behavior Matrix",
    "Buttons And Menus",
    "Tabs",
    "Accordions",
    "Modals And Drawers",
    "Tables",
    "Graphs",
    "Documents",
    "Reviewer Workflows",
    "Escape Stack"
  ].forEach((section) => {
    assert(keyboard.includes(section), `docs/keyboard.md missing section: ${section}`);
  });

  const docsIndex = `${read("README.md")}\n${read("docs/usage.md")}\n${read("docs/components.md")}`;
  assert(docsIndex.includes("accessibility.md"), "README/docs should link to docs/accessibility.md");
  assert(docsIndex.includes("keyboard.md"), "README/docs should link to docs/keyboard.md");
  assert(docsIndex.includes("npm run accessibility"), "README/docs should document npm run accessibility");
}

function validateSourceContracts() {
  const js = read("src/js/index.js");
  [
    "const keyboardModel =",
    "function getKeyboardModel",
    "function hydrateKeyboardModel",
    "function handleKeydown",
    "function handleReviewWorkflowKeydown",
    "function updateGraphA11yFallback",
    "function computeTooltipPosition",
    "closeTopEscapeLayer"
  ].forEach((token) => {
    assert(js.includes(token), `src/js/index.js missing accessibility/keyboard source contract: ${token}`);
  });

  ["global", "menus", "tabs", "tables", "graphs", "documents", "reviewer"].forEach((scope) => {
    assert(js.includes(`${scope}: [`), `keyboardModel missing scope: ${scope}`);
  });
}

function validateExampleReferences(file, source, ids) {
  for (const tag of getTags(source, (value) => hasAttr(value, "aria-controls"))) {
    for (const id of splitIdRefs(getAttr(tag, "aria-controls"))) {
      assert(ids.has(id), `${file} aria-controls references missing id: ${id}`);
    }
  }

  for (const attr of ["aria-labelledby", "aria-describedby"]) {
    for (const tag of getTags(source, (value) => hasAttr(value, attr))) {
      for (const id of splitIdRefs(getAttr(tag, attr))) {
        assert(ids.has(id), `${file} ${attr} references missing id: ${id}`);
      }
    }
  }
}

function validateTabs(file, source, ids) {
  const panels = new Map();
  for (const tag of getTags(source, (value) => getAttr(value, "role") === "tabpanel")) {
    const id = getAttr(tag, "id");
    assert(Boolean(id), `${file} tabpanel is missing id`);
    if (id) panels.set(id, tag);
  }

  for (const tag of getTags(source, (value) => getAttr(value, "role") === "tab")) {
    const controls = getAttr(tag, "aria-controls");
    assert(Boolean(controls), `${file} role=tab missing aria-controls`);
    assert(hasAttr(tag, "aria-selected"), `${file} role=tab missing aria-selected`);
    splitIdRefs(controls).forEach((id) => {
      assert(ids.has(id), `${file} tab aria-controls references missing panel id: ${id}`);
      assert(panels.has(id), `${file} tab controls ${id}, but target is not role=tabpanel`);
    });
  }
}

function validateDialogs(file, source) {
  for (const tag of getTags(source, (value) => getAttr(value, "role") === "dialog")) {
    assert(hasAccessibleName(tag), `${file} role=dialog missing accessible name`);
  }
}

function validateInteractiveStates(file, source) {
  const contracts = [
    ["data-if-menu-toggle", "aria-expanded"],
    ["data-if-popover-toggle", "aria-expanded"],
    ["data-if-accordion-trigger", "aria-expanded"],
    ["data-if-hierarchy-toggle", "aria-expanded"]
  ];

  contracts.forEach(([dataAttr, ariaAttr]) => {
    for (const tag of getTags(source, (value) => hasAttr(value, dataAttr))) {
      assert(hasAttr(tag, ariaAttr), `${file} ${dataAttr} missing ${ariaAttr}`);
    }
  });

  for (const tag of getTags(source, (value) => hasAttr(value, "data-if-popover-toggle"))) {
    assert(hasAttr(tag, "aria-controls"), `${file} data-if-popover-toggle missing aria-controls`);
  }

  for (const tag of getTags(source, (value) => hasAttr(value, "data-if-hierarchy-toggle"))) {
    assert(hasAccessibleName(tag), `${file} data-if-hierarchy-toggle missing accessible name`);
  }

  for (const tag of getTags(source, (value) => hasAttr(value, "data-if-surface-expand"))) {
    assert(
      hasAttr(tag, "aria-expanded") || hasAttr(tag, "aria-pressed"),
      `${file} data-if-surface-expand should expose aria-expanded or aria-pressed`
    );
  }
}

function validateTableSelection(file, source) {
  for (const tag of getTags(source, (value) => {
    return /<input\b/i.test(value) && (hasAttr(value, "data-if-table-select") || hasAttr(value, "data-if-table-select-all"));
  })) {
    assert(hasAccessibleName(tag), `${file} table selection checkbox missing aria-label/title`);
  }
}

function validateIconButtons(file, source) {
  for (const tag of getTags(source, (value) => /<button\b/i.test(value) && /\bif-icon-btn\b/.test(getAttr(value, "class")))) {
    assert(hasAccessibleName(tag), `${file} icon button missing aria-label or title`);
  }
}

function validateExamples() {
  for (const file of listFiles("examples", ".html")) {
    const source = read(file);
    const ids = getIds(source);
    validateExampleReferences(file, source, ids);
    validateTabs(file, source, ids);
    validateDialogs(file, source);
    validateInteractiveStates(file, source);
    validateTableSelection(file, source);
    validateIconButtons(file, source);
  }
}

function validateDesignSystemShowcase() {
  const source = read("examples/components.html");
  assert(source.includes("id=\"accessibility\""), "components.html should include an accessibility and keyboard specimen");
  assert(source.includes("data-if-keyboard-model"), "components.html should demonstrate data-if-keyboard-model");
  assert(source.includes("Accessibility & Keyboard"), "components.html should label the accessibility specimen");
}

validateDocs();
validateSourceContracts();
validateExamples();
validateDesignSystemShowcase();

if (failures.length) {
  console.error("\nAccessibility contract tests failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("OK accessibility contract tests pass");

