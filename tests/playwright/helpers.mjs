import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export function exampleUrl(route) {
  const [file, hash] = route.split("#");
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
  const url = new URL(`/examples/${file}`, base);
  if (hash) url.hash = hash;
  return url.href;
}

export async function gotoExample(page, route) {
  await page.addInitScript(() => {
    try {
      window.localStorage?.setItem("interface-framework-theme", "light");
    } catch {
      // File URL storage can be restricted in some browser policies.
    }
    window.__IF_TEST_MODE__ = true;
  });
  await page.goto(exampleUrl(route), { waitUntil: "domcontentloaded" });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0.001s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
        transition-delay: 0s !important;
        transition-duration: 0.001s !important;
      }

      .if-loading-dot,
      .if-skeleton,
      [data-if-visual-test-stable] {
        animation: none !important;
      }
    `
  });
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body?.setAttribute("data-if-test-mode", "true");
  });
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(100);
}

export function captureConsoleErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

export async function visibleElementIssues(page) {
  return page.evaluate(() => {
    const isElementVisible = (element) => {
      if (element.closest("[hidden], [aria-hidden='true']")) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };

    const labelledByText = (element) => {
      const ids = (element.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
      return ids.map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
    };

    const accessibleName = (element) => {
      const direct = element.getAttribute("aria-label") || element.getAttribute("title") || labelledByText(element);
      if (direct?.trim()) return direct.trim();
      if ("labels" in element && element.labels?.length) {
        const labelText = Array.from(element.labels).map((label) => label.textContent || "").join(" ").trim();
        if (labelText) return labelText;
      }
      if (element.matches("input, textarea")) return element.getAttribute("placeholder") || "";
      if (element.matches("select")) return element.closest("label")?.textContent || "";
      return (element.textContent || "").trim();
    };

    const controls = Array.from(document.querySelectorAll([
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[role='tab']",
      "[role='menuitem']",
      "[role='menuitemcheckbox']",
      "[role='menuitemradio']"
    ].join(",")));

    const unnamedControls = controls
      .filter((element) => !element.disabled && isElementVisible(element) && !accessibleName(element))
      .map((element) => ({
        issue: "interactive control has no accessible name",
        selector: element.tagName.toLowerCase(),
        classes: element.getAttribute("class") || "",
        text: (element.textContent || "").trim().slice(0, 80)
      }));

    const dialogs = Array.from(document.querySelectorAll("[role='dialog']"))
      .filter((element) => !element.hidden)
      .filter((element) => !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby"))
      .map((element) => ({
        issue: "dialog has no accessible name",
        selector: element.id ? `#${element.id}` : element.tagName.toLowerCase()
      }));

    const brokenControls = Array.from(document.querySelectorAll("[aria-controls]"))
      .filter((element) => isElementVisible(element))
      .flatMap((element) => {
        const targets = (element.getAttribute("aria-controls") || "").split(/\s+/).filter(Boolean);
        return targets
          .filter((target) => !document.getElementById(target))
          .map((target) => ({
            issue: "aria-controls target is missing",
            selector: element.tagName.toLowerCase(),
            target
          }));
      });

    return [...unnamedControls, ...dialogs, ...brokenControls];
  });
}
