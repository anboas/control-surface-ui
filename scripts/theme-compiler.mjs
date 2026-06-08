import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const checkOnly = process.argv.includes("--check");

const colorPath = resolve(root, "src/tokens/color.css");
const themesPath = resolve(root, "src/styles/themes.css");
const reportPath = resolve(root, "docs/theme-contrast-report.md");
const jsonPath = resolve(root, "docs/theme-contrast-report.json");

const semanticTokenNames = [
  "--if-bg-page",
  "--if-bg-surface",
  "--if-bg-subtle",
  "--if-bg-muted",
  "--if-bg-selected",
  "--if-bg-inverse",
  "--if-bg",
  "--if-text",
  "--if-text-strong",
  "--if-text-muted",
  "--if-text-subtle",
  "--if-text-inverse",
  "--if-link",
  "--if-link-hover",
  "--if-border",
  "--if-border-strong",
  "--if-border-selected",
  "--if-focus",
  "--if-accent",
  "--if-primary",
  "--if-accent-soft",
  "--if-info",
  "--if-info-soft",
  "--if-success",
  "--if-success-soft",
  "--if-warning",
  "--if-warning-soft",
  "--if-danger",
  "--if-danger-soft",
  "--if-purple",
  "--if-purple-soft"
];

const contrastChecks = [
  ["body-text", "Body text", "--if-text", "--if-bg-surface", 4.5],
  ["strong-text", "Strong text", "--if-text-strong", "--if-bg-surface", 4.5],
  ["muted-text", "Muted text", "--if-text-muted", "--if-bg-surface", 4.5],
  ["subtle-text", "Subtle text", "--if-text-subtle", "--if-bg-surface", 4.5],
  ["link-text", "Link text", "--if-link", "--if-bg-surface", 4.5],
  ["inverse-text", "Inverse text", "--if-text-inverse", "--if-bg-inverse", 4.5],
  ["primary-action", "Primary action text", "--if-text-inverse", "--if-primary", 4.5],
  ["selected-accent", "Selected/accent text", "--if-accent", "--if-accent-soft", 4.5],
  ["info-badge", "Info semantic text", "--if-info", "--if-info-soft", 4.5],
  ["success-badge", "Success semantic text", "--if-success", "--if-success-soft", 4.5],
  ["warning-badge", "Warning semantic text", "--if-warning", "--if-warning-soft", 4.5],
  ["danger-badge", "Danger semantic text", "--if-danger", "--if-danger-soft", 4.5],
  ["purple-badge", "Purple semantic text", "--if-purple", "--if-purple-soft", 4.5]
].map(([id, label, foreground, background, minimum]) => ({ id, label, foreground, background, minimum }));

function extractBlock(source, selectorRegex) {
  const match = selectorRegex.exec(source);
  if (!match) return "";
  const start = source.indexOf("{", match.index + match[0].length);
  if (start === -1) return "";
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, index);
    }
  }
  return "";
}

function parseDeclarations(block) {
  const declarations = {};
  const pattern = /(--if-[\w-]+)\s*:\s*([^;]+);/g;
  let match;
  while ((match = pattern.exec(block))) {
    declarations[match[1]] = match[2].trim();
  }
  return declarations;
}

function resolveValue(value, tokens, seen = new Set()) {
  if (!value) return value;
  return value.replace(/var\((--if-[\w-]+)(?:,\s*([^)]+))?\)/g, (_, token, fallback = "") => {
    if (seen.has(token)) return fallback.trim() || `var(${token})`;
    const next = tokens[token];
    if (!next) return fallback.trim() || `var(${token})`;
    return resolveValue(next, tokens, new Set([...seen, token]));
  }).trim();
}

function compileTheme(baseTokens, overrides) {
  const merged = { ...baseTokens, ...overrides };
  const resolved = {};
  for (const [name, value] of Object.entries(merged)) {
    resolved[name] = resolveValue(value, merged);
  }
  return resolved;
}

function parseHex(value) {
  const hex = value?.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || "");
  if (!match) throw new Error(`Unsupported color value for contrast check: ${value}`);
  const normalized = match[1].length === 3
    ? match[1].split("").map((char) => `${char}${char}`).join("")
    : match[1];
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
}

function channelToLinear(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color) {
  const [red, green, blue] = parseHex(color).map(channelToLinear);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const front = luminance(foreground);
  const back = luminance(background);
  return (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05);
}

function evaluateTheme(definition, baseTokens) {
  const tokens = compileTheme(baseTokens, definition.overrides);
  const checks = contrastChecks.map((check) => {
    const foreground = tokens[check.foreground];
    const background = tokens[check.background];
    const ratio = contrastRatio(foreground, background);
    return {
      ...check,
      foregroundValue: foreground,
      backgroundValue: background,
      ratio: Number(ratio.toFixed(2)),
      passes: ratio >= check.minimum
    };
  });

  return {
    id: definition.id,
    label: definition.label,
    attribute: definition.attribute,
    colorScheme: definition.colorScheme,
    source: definition.source,
    passed: checks.every((check) => check.passes),
    tokens: Object.fromEntries(semanticTokenNames.map((name) => [name, tokens[name]])),
    checks
  };
}

function reportStatus(value) {
  return value ? "Pass" : "Fail";
}

function formatMarkdown(results) {
  const failedChecks = results.themes.flatMap((theme) => theme.checks.filter((check) => !check.passes).map((check) => `${theme.id}:${check.id}`));
  const summaryRows = results.themes
    .map((theme) => `| ${theme.label} | \`${theme.attribute}\` | ${theme.colorScheme} | ${reportStatus(theme.passed)} | ${theme.checks.length} |`)
    .join("\n");
  const detailSections = results.themes.map((theme) => {
    const rows = theme.checks
      .map((check) => `| ${check.label} | \`${check.foreground}\` ${check.foregroundValue} | \`${check.background}\` ${check.backgroundValue} | ${check.ratio.toFixed(2)} | ${check.minimum.toFixed(1)} | ${reportStatus(check.passes)} |`)
      .join("\n");
    return `### ${theme.label}\n\n| Pair | Foreground | Background | Ratio | Minimum | Result |\n| --- | --- | --- | ---: | ---: | --- |\n${rows}`;
  }).join("\n\n");

  return `# Theme Contrast Report

Generated by \`scripts/theme-compiler.mjs\`. Do not hand edit this file; update tokens or theme overlays and rerun \`npm run theme:compile\`.

## Summary

| Theme | Scope | Scheme | Result | Checks |
| --- | --- | --- | --- | ---: |
${summaryRows}

## Forced Colors

Forced-colors mode is mapped in \`src/styles/themes.css\` with system colors: \`Canvas\`, \`CanvasText\`, \`Highlight\`, \`HighlightText\`, and \`LinkText\`. These values are user-agent resolved, so the compiler verifies the mapping contract and the browser smoke suite owns visual confirmation.

## Semantic Visual Smoke Targets

The Playwright visual suite captures \`examples/theme-states.html\` for each built-in theme across buttons, badges, alerts, form fields, tables, KPI cards, and metadata surfaces.

## Details

${detailSections}

## Build Gate

${failedChecks.length ? `Failing checks: ${failedChecks.join(", ")}` : "All built-in theme contrast checks pass at WCAG AA normal-text thresholds."}
`;
}

async function main() {
  const [colorSource, themeSource] = await Promise.all([
    readFile(colorPath, "utf8"),
    readFile(themesPath, "utf8")
  ]);
  const baseTokens = parseDeclarations(extractBlock(colorSource, /:root\s*/));
  const systemDark = parseDeclarations(extractBlock(themeSource, /\[data-theme="system"\]/));
  const dark = parseDeclarations(extractBlock(themeSource, /\[data-theme="dark"\]\s*,\s*\[data-theme="midnight"\]/));
  const highContrast = parseDeclarations(extractBlock(themeSource, /\[data-theme="high-contrast"\]/));
  const calm = parseDeclarations(extractBlock(themeSource, /\[data-theme="calm"\]/));
  const executive = parseDeclarations(extractBlock(themeSource, /\[data-theme="executive"\]/));
  const forcedColors = parseDeclarations(extractBlock(themeSource, /:root\s*,\s*\[data-theme\]/));

  const definitions = [
    { id: "light", label: "Light", attribute: "data-theme=\"light\" or unset", colorScheme: "light", source: "src/tokens/color.css", overrides: {} },
    { id: "system-light", label: "System Light", attribute: "data-theme=\"system\"", colorScheme: "light", source: "base tokens when system is light", overrides: {} },
    { id: "system-dark", label: "System Dark", attribute: "data-theme=\"system\"", colorScheme: "dark", source: "@media prefers-color-scheme: dark", overrides: systemDark },
    { id: "dark", label: "Dark", attribute: "data-theme=\"dark\"", colorScheme: "dark", source: "src/styles/themes.css", overrides: dark },
    { id: "midnight", label: "Midnight", attribute: "data-theme=\"midnight\"", colorScheme: "dark", source: "src/styles/themes.css alias", overrides: dark },
    { id: "high-contrast", label: "High Contrast", attribute: "data-theme=\"high-contrast\"", colorScheme: "dark", source: "src/styles/themes.css", overrides: highContrast },
    { id: "calm", label: "Calm", attribute: "data-theme=\"calm\"", colorScheme: "light", source: "src/styles/themes.css", overrides: calm },
    { id: "executive", label: "Executive", attribute: "data-theme=\"executive\"", colorScheme: "light", source: "src/styles/themes.css", overrides: executive }
  ];

  const themes = definitions.map((definition) => evaluateTheme(definition, baseTokens));
  const requiredForcedTokens = ["--if-bg-surface", "--if-text", "--if-link", "--if-focus", "--if-primary", "--if-text-inverse"];
  const missingForcedTokens = requiredForcedTokens.filter((token) => !forcedColors[token]);
  const results = {
    schemaVersion: 1,
    compiler: "scripts/theme-compiler.mjs",
    semanticTokens: semanticTokenNames,
    checks: contrastChecks,
    forcedColors: {
      mapped: missingForcedTokens.length === 0,
      requiredTokens: requiredForcedTokens,
      missingTokens: missingForcedTokens,
      tokens: forcedColors
    },
    visualSmoke: {
      example: "examples/theme-states.html",
      selectors: definitions.map((definition) => `#theme-${definition.id}`),
      components: ["buttons", "badges", "alerts", "forms", "tables", "kpi-cards", "metadata", "focus"]
    },
    themes
  };

  const markdown = formatMarkdown(results);
  const json = `${JSON.stringify(results, null, 2)}\n`;

  if (!results.forcedColors.mapped) {
    console.error(`Forced-colors mapping is missing: ${missingForcedTokens.join(", ")}`);
    process.exitCode = 1;
  }
  const failed = themes.flatMap((theme) => theme.checks.filter((check) => !check.passes).map((check) => `${theme.id}:${check.id} (${check.ratio})`));
  if (failed.length) {
    console.error(`Theme contrast checks failed: ${failed.join(", ")}`);
    process.exitCode = 1;
  }

  if (checkOnly) {
    const [currentMarkdown, currentJson] = await Promise.all([
      readFile(reportPath, "utf8").catch(() => ""),
      readFile(jsonPath, "utf8").catch(() => "")
    ]);
    if (currentMarkdown !== markdown || currentJson !== json) {
      console.error("Theme contrast reports are stale. Run `npm run theme:compile`.");
      process.exitCode = 1;
    }
    return;
  }

  await Promise.all([
    writeFile(reportPath, markdown),
    writeFile(jsonPath, json)
  ]);
  if (!process.exitCode) console.log("Theme contrast reports generated.");
}

await main();
