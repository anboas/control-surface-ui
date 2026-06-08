import { expect, test } from "@playwright/test";
import { captureConsoleErrors, gotoExample, visibleElementIssues } from "./helpers.mjs";

const pages = [
  "index.html",
  "components.html",
  "graph-view.html",
  "diagrams.html",
  "document-viewer.html",
  "review.html",
  "sources.html"
];

test.describe("browser accessibility smoke tests", () => {
  for (const route of pages) {
    test(`${route} exposes named controls and valid controlled regions`, async ({ page }) => {
      const consoleErrors = captureConsoleErrors(page);
      await gotoExample(page, route);

      await expect(page.locator(".if-topbar")).toBeVisible();
      expect(await visibleElementIssues(page)).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }

  test("account theme controls are keyboard reachable and update document theme", async ({ page }) => {
    await gotoExample(page, "components.html");

    const accountButton = page.getByRole("button", { name: /account menu/i });
    await accountButton.focus();
    await page.keyboard.press("Enter");

    const accountDialog = page.getByRole("dialog", { name: /account controls/i });
    await expect(accountDialog).toBeVisible();

    await accountDialog.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(accountDialog.getByText(/Current:\s*Dark/i)).toBeVisible();

    await accountDialog.getByRole("button", { name: /High contrast/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "high-contrast");
    await expect(accountDialog.getByText(/Current:\s*High contrast/i)).toBeVisible();

    await accountDialog.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.keyboard.press("Escape");
    await expect(accountDialog).toBeHidden();
    await expect(accountButton).toHaveAttribute("aria-expanded", "false");
  });

  test("topbar navigation remains route-aware and focusable", async ({ page }) => {
    await gotoExample(page, "components.html");

    await page.keyboard.press("Tab");
    const activeTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON", "INPUT", "SELECT"]).toContain(activeTag);

    const activeNav = page.locator(".if-topbar__nav .is-active");
    await expect(activeNav).toHaveAttribute("aria-current", "page");
    await expect(activeNav).toHaveText(/Design System/);
  });
});
