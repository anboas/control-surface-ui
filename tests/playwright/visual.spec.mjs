import { expect, test } from "@playwright/test";
import { captureConsoleErrors, gotoExample } from "./helpers.mjs";

const surfaces = [
  {
    name: "overview-dashboard-surface",
    route: "index.html",
    selector: ".if-content"
  },
  {
    name: "design-system-theme-surface",
    route: "components.html#themes",
    selector: "#themes",
    mobileStableHeight: 1551,
    screenshotTimeout: 15000
  },
  {
    name: "design-system-table-analytics-surface",
    route: "components.html#data",
    selector: "#data",
    mobileStableHeight: 471
  },
  {
    name: "graph-explorer-surface",
    route: "graph-view.html",
    selector: ".if-graph-shell"
  },
  {
    name: "diagram-architecture-surface",
    route: "diagrams.html",
    selector: "#azure-deployment-diagram .if-architecture-board"
  },
  {
    name: "document-reconstitution-surface",
    route: "document-viewer.html",
    selector: ".if-doc-main"
  }
];

const themeStateSurfaces = [
  "light",
  "system-light",
  "system-dark",
  "dark",
  "midnight",
  "high-contrast",
  "calm",
  "executive"
];

test.describe("visual regression surfaces", () => {
  for (const surface of surfaces) {
    test(surface.name, async ({ page }, testInfo) => {
      const consoleErrors = captureConsoleErrors(page);
      await gotoExample(page, surface.route);

      const target = page.locator(surface.selector).first();
      await expect(target, `${surface.selector} should render`).toBeVisible();
      if (testInfo.project.name.includes("mobile") && surface.mobileStableHeight) {
        await target.evaluate((element, height) => {
          element.style.boxSizing = "border-box";
          element.style.minHeight = `${height}px`;
        }, surface.mobileStableHeight);
      }
      await expect(target).toHaveScreenshot(`${surface.name}.png`, {
        timeout: surface.screenshotTimeout || 5000,
        maxDiffPixelRatio: testInfo.project.name.includes("mobile") ? 0.018 : 0.012
      });
      expect(consoleErrors).toEqual([]);
    });
  }
});

test.describe("theme semantic state snapshots", () => {
  for (const theme of themeStateSurfaces) {
    test(`theme-${theme}`, async ({ page }, testInfo) => {
      const consoleErrors = captureConsoleErrors(page);
      await gotoExample(page, "theme-states.html");

      const target = page.locator(`#theme-${theme}`).first();
      await expect(target, `#theme-${theme} should render`).toBeVisible();
      await expect(target).toHaveScreenshot(`theme-${theme}-semantic-states.png`, {
        maxDiffPixelRatio: testInfo.project.name.includes("mobile") ? 0.02 : 0.014
      });
      expect(consoleErrors).toEqual([]);
    });
  }
});
