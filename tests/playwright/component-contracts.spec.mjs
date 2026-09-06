import { expect, test } from "@playwright/test";
import { gotoExample } from "./helpers.mjs";

const publicApi = [
  "init",
  "destroy",
  "initBehavior",
  "destroyBehavior",
  "getBehaviorModules",
  "setTheme",
  "getTheme",
  "hydrateThemeControls",
  "registerDataTableAdapter",
  "setDataTableData",
  "refreshDataTable",
  "registerGraphLayoutEngine",
  "runGraphLayoutEngine",
  "applyGraphLayoutResult",
  "registerGraphNodeType",
  "applyGraphNodeTypes",
  "getGraphNodeTypeConfig",
  "applyHierarchyStructure",
  "registerHierarchyNodeType",
  "applyHierarchyNodeTypes",
  "getHierarchyNodeTypeConfig",
  "registerAutocompleteAdapter",
  "runAdapterTask",
  "cancelAdapterTask",
  "getAdapterTaskState",
  "evaluatePerformanceBudgets",
  "runPerformanceLab",
  "measureOverflow",
  "validateForm",
  "validateField",
  "hydrateNativeSvgViewer",
  "hydrateNativeSvgViewers",
  "destroyNativeSvgViewer",
  "getNativeSvgState",
  "setNativeSvgViewport",
  "updateNativeSvgSearch",
  "selectNativeSvgNode",
  "resetNativeSvgSelection"
];

const behaviorModules = [
  "themes",
  "icons",
  "visualization",
  "keyboard",
  "navigation",
  "overlays",
  "forms",
  "configuration",
  "performance",
  "diagrams",
  "tables",
  "graph",
  "documents"
];

const pageContracts = [
  {
    route: "components.html",
    selectors: [
      "[data-if-theme-control]",
      "[data-if-autocomplete]",
      "[data-if-tooltip]",
      "[data-if-tabs]",
      "[data-if-data-table]",
      "[data-if-chart]",
      "[data-if-performance-lab]"
    ]
  },
  {
    route: "graph-view.html",
    selectors: [
      "[data-if-graph]",
      "[data-node-type]",
      "[data-if-graph-edge]",
      "[data-if-graph-cluster]",
      "[data-if-graph-a11y]"
    ]
  },
  {
    route: "diagrams.html",
    selectors: [
      "[data-if-diagram]",
      "[data-if-diagram-item]",
      "[data-if-diagram-detail]",
      "[data-if-diagram-var]"
    ]
  },
  {
    route: "document-viewer.html",
    selectors: [
      "[data-if-doc-viewer]",
      "[data-if-doc-search]",
      "[data-if-doc-highlight]",
      "[data-if-doc-lines]",
      "[data-if-doc-filter]"
    ]
  }
];

test.describe("component and behavior contracts", () => {
  test("browser bundle exposes stable framework APIs", async ({ page }) => {
    await gotoExample(page, "components.html");

    const api = await page.evaluate(() => Object.keys(window.InterfaceFramework || {}));
    for (const name of publicApi) expect(api).toContain(name);

    const modules = await page.evaluate(() => window.InterfaceFramework.getBehaviorModules().map((module) => module.name));
    for (const name of behaviorModules) expect(modules).toContain(name);
  });

  for (const contract of pageContracts) {
    test(`${contract.route} carries required data-attribute contracts`, async ({ page }) => {
      await gotoExample(page, contract.route);
      for (const selector of contract.selectors) {
        await expect(page.locator(selector).first(), `${contract.route} missing ${selector}`).toBeAttached();
      }
    });
  }

  test("table contract supports filtering and selection state", async ({ page }) => {
    await gotoExample(page, "components.html#data");

    const table = page.locator("#component-policy-table");
    await expect(table).toBeVisible();
    await table.locator("[data-if-table-filter]").fill("SECNAV");
    await expect(table.locator("[data-if-table-status='filtered']").first()).toHaveText("1");

    await table.locator("[data-if-table-row]:not([hidden]) [data-if-table-select]").first().click();
    await expect(table.locator("[data-if-table-status='selected']").first()).toHaveText("1");
  });

  test("autocomplete closes inside stopped-propagation control surfaces", async ({ page }) => {
    await gotoExample(page, "components.html");

    await page.evaluate(() => {
      const host = document.createElement("section");
      host.id = "stopped-propagation-autocomplete";
      host.innerHTML = `
        <div class="if-search if-autocomplete">
          <input
            id="stopped-autocomplete-input"
            class="if-input"
            type="search"
            data-if-autocomplete='[{"label":"Department of the Navy","value":"NAVY","type":"Organization","meta":"Navy / DON"}]'
            data-if-autocomplete-limit="8"
            placeholder="Search organizations"
          >
        </div>
        <button id="outside-autocomplete-control" type="button" style="margin-top: 16rem;">Outside control</button>
      `;
      host.addEventListener("click", (event) => event.stopPropagation());
      document.body.append(host);
      window.InterfaceFramework.hydrateAutocompleteInputs(host);
    });

    const host = page.locator("#stopped-propagation-autocomplete");
    const input = page.locator("#stopped-autocomplete-input");
    const menu = host.locator("[data-if-autocomplete-menu]");

    await input.fill("nav");
    await expect(menu).toBeVisible();
    await host.locator("[data-if-autocomplete-option]").first().click();
    await expect(input).toHaveValue("NAVY");
    await expect(menu).toBeHidden();

    await input.fill("nav");
    await expect(menu).toBeVisible();
    await page.locator("#outside-autocomplete-control").click();
    await expect(menu).toBeHidden();
  });

  test("diagram details follow click, close, and click-away contracts", async ({ page }) => {
    await gotoExample(page, "diagrams.html");

    const diagram = page.locator("#azure-deployment-diagram");
    const detail = diagram.locator("[data-if-diagram-detail]").first();
    await expect(detail).toBeHidden();

    await diagram.locator("[data-if-diagram-item], .if-arch-service, .if-platform-service").first().click();
    await expect(detail).toBeVisible();

    await diagram.locator("[data-if-diagram-detail-close]").first().click({ force: true });
    await expect(detail).toBeHidden();
  });

  test("native SVG viewport supports navigation, search, and node selection", async ({ page }) => {
    await gotoExample(page, "components.html");
    await page.evaluate(async () => {
      const viewer = document.createElement("section");
      viewer.id = "native-svg-contract";
      viewer.className = "if-native-svg";
      viewer.dataset.ifNativeSvg = "";
      viewer.dataset.ifNativeSvgSrc = "/examples/assets/native-svg-contract.svg";
      viewer.innerHTML = `
        <input data-if-native-svg-search aria-label="Search diagram nodes">
        <button type="button" data-if-native-svg-action="in">Zoom in</button>
        <span data-if-native-svg-zoom-label></span>
        <span data-if-native-svg-node-count></span>
        <span data-if-native-svg-search-status></span>
        <div data-if-native-svg-search-results hidden></div>
        <div class="if-native-svg__stage" data-if-native-svg-stage tabindex="0">
          <div class="if-native-svg__viewport" data-if-native-svg-viewport></div>
        </div>
        <aside data-if-native-svg-detail hidden>
          <strong data-if-native-svg-detail-title></strong>
          <span data-if-native-svg-detail-body></span>
          <code data-if-native-svg-detail-id></code>
        </aside>
      `;
      document.body.append(viewer);
      await window.InterfaceFramework.hydrateNativeSvgViewer(viewer);
    });

    const viewer = page.locator("#native-svg-contract");
    await expect(viewer).toHaveAttribute("data-if-native-svg-state", "ready");
    await expect(viewer.locator("[data-if-native-svg-node]")).toHaveCount(3);
    await expect(viewer.locator("[data-if-native-svg-node-count]")).toHaveText("3");

    const before = await page.evaluate(() => window.InterfaceFramework.getNativeSvgState(document.querySelector("#native-svg-contract")));
    await viewer.getByRole("button", { name: "Zoom in" }).click();
    const zoomed = await page.evaluate(() => window.InterfaceFramework.getNativeSvgState(document.querySelector("#native-svg-contract")));
    expect(zoomed.zoom).toBeGreaterThan(before.zoom);

    await viewer.getByRole("textbox", { name: "Search diagram nodes" }).fill("Bravo");
    await expect(viewer.locator(".is-search-match")).toHaveCount(1);
    await expect(viewer.locator(".is-search-dimmed")).toHaveCount(2);
    await viewer.locator("[data-if-native-svg-search-result]").click();
    await expect(viewer.locator("[data-if-native-svg-detail]")).toBeVisible();
    await expect(viewer.locator(".is-selected")).toHaveCount(1);
    await expect(viewer.locator("[data-if-native-svg-detail-title]")).toContainText("Bravo");

    const centered = await page.evaluate(() => window.InterfaceFramework.getNativeSvgState(document.querySelector("#native-svg-contract")));
    await viewer.locator("[data-if-native-svg-stage]").press("ArrowRight");
    const panned = await page.evaluate(() => window.InterfaceFramework.getNativeSvgState(document.querySelector("#native-svg-contract")));
    expect(panned.panX).toBeLessThan(centered.panX);
  });

  test("adapter task runner normalizes success, empty, error, and cancellation states", async ({ page }) => {
    await gotoExample(page, "components.html#coverage-components");

    const result = await page.evaluate(async () => {
      const target = document.createElement("section");
      target.id = "adapter-task-contract-target";
      target.innerHTML = `
        <span data-if-adapter-status></span>
        <div data-if-adapter-state="loading">Loading</div>
        <div data-if-adapter-state="success">Success</div>
        <div data-if-adapter-state="empty">Empty</div>
        <div data-if-adapter-state="error">Error</div>
        <div data-if-adapter-state="cancelled">Cancelled</div>
      `;
      document.body.append(target);

      const events = [];
      ["if:adapter-request", "if:adapter-result", "if:adapter-cancel", "if:adapter-error", "if:source-registry-request", "if:source-registry-result", "if:source-registry-cancel", "if:source-registry-error"].forEach((name) => {
        target.addEventListener(name, (event) => {
          events.push({
            name,
            channel: event.detail.channel,
            state: event.detail.state || "",
            requestId: event.detail.requestId || ""
          });
        });
      });

      const delayAdapter = {
        run({ signal }) {
          return new Promise((resolve, reject) => {
            const timer = window.setTimeout(() => resolve({ state: "success", rows: [{ id: "stale" }] }), 120);
            signal.addEventListener("abort", () => {
              window.clearTimeout(timer);
              reject(new DOMException("superseded", "AbortError"));
            }, { once: true });
          });
        }
      };

      const first = window.InterfaceFramework.runAdapterTask(target, delayAdapter, { route: "sources" }, { channel: "source-registry" });
      const empty = await window.InterfaceFramework.runAdapterTask(target, async () => ({ state: "empty", rows: [], message: "No sources" }), { route: "sources" }, { channel: "source-registry" });
      const firstSettled = await first;
      const error = await window.InterfaceFramework.runAdapterTask(target, async () => {
        throw new Error("adapter failed");
      }, { route: "sources" }, { channel: "source-registry" });
      const long = window.InterfaceFramework.runAdapterTask(target, delayAdapter, { route: "sources" }, { channel: "source-registry" });
      const cancelled = window.InterfaceFramework.cancelAdapterTask(target, "source-registry", "user");
      const longSettled = await long;

      return {
        cancelled,
        emptyState: empty.state,
        errorState: error.state,
        firstSettled,
        finalState: window.InterfaceFramework.getAdapterState(target),
        hiddenPanels: Array.from(target.querySelectorAll("[data-if-adapter-state]")).filter((panel) => panel.hidden).length,
        longSettled,
        taskState: window.InterfaceFramework.getAdapterTaskState(target, "source-registry"),
        events
      };
    });

    expect(result.emptyState).toBe("empty");
    expect(result.errorState).toBe("error");
    expect(result.cancelled).toBe(true);
    expect(result.finalState).toBe("cancelled");
    expect(result.taskState.task).toBeNull();
    expect(result.hiddenPanels).toBeGreaterThanOrEqual(4);
    expect(result.firstSettled).toBeNull();
    expect(result.longSettled).toBeNull();
    expect(result.events.map((event) => event.name)).toContain("if:adapter-request");
    expect(result.events.map((event) => event.name)).toContain("if:adapter-result");
    expect(result.events.map((event) => event.name)).toContain("if:adapter-error");
    expect(result.events.map((event) => event.name)).toContain("if:adapter-cancel");
    expect(result.events.map((event) => event.name)).toContain("if:source-registry-result");
  });

  test("state variants expose the reusable loading dots contract", async ({ page }) => {
    await gotoExample(page, "components.html#coverage-components");

    await page.locator("[data-if-state-variant='loading'][data-if-state-target='#coverage-state-preview']").click();

    const loadingPanel = page.locator("[data-if-state-panel='loading']");
    await expect(loadingPanel).toBeVisible();
    await expect(loadingPanel.locator(".if-loading-dots")).toBeVisible();
    await expect(loadingPanel.locator(".if-loading-dots > span")).toHaveCount(3);
    await expect(loadingPanel).toContainText("Loading source results");
  });

  test("performance scale lab contains large demos at desktop and mobile widths", async ({ page }) => {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 900 }
    ]) {
      await page.setViewportSize(viewport);
      await gotoExample(page, "components.html#performance-scale");

      const result = await page.evaluate(async () => {
        const lab = document.querySelector("#performance-scale");
        const run = window.InterfaceFramework.runPerformanceLab(lab, "large");
        await new Promise((resolve) => requestAnimationFrame(resolve));
        return {
          state: run.state,
          budgetPassed: run.budget.passed,
          budgetFailures: run.budget.failures,
          budgetSections: run.budget.sections,
          totalMs: run.totalMs,
          totalLimit: run.budget.total.limit,
          overflowBudget: run.budget.overflow,
          failures: run.overflow.failures.length,
          tableRows: run.sections.table.count,
          graphItems: run.sections.graph.count,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
        };
      });

      expect(result.tableRows).toBe(1500);
      expect(result.graphItems).toBeGreaterThan(300);
      expect(result.state).toBe("passed");
      expect(result.budgetPassed, JSON.stringify(result.budgetFailures)).toBe(true);
      expect(result.totalMs).toBeLessThanOrEqual(result.totalLimit);
      for (const section of Object.values(result.budgetSections)) {
        expect(section.ms).toBeLessThanOrEqual(section.limit);
        expect(section.state).toBe("pass");
      }
      expect(result.overflowBudget.failures).toBeLessThanOrEqual(result.overflowBudget.limit);
      expect(result.failures).toBe(0);
      expect(result.pageOverflow).toBeLessThanOrEqual(2);
    }
  });
});
