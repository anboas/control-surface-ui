import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { writeChecksumManifest } from "./checksums.mjs";

const root = process.cwd();
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

async function bundleCss(file, seen = new Set()) {
  const absolute = resolve(file);
  if (seen.has(absolute)) return "";
  seen.add(absolute);

  const source = await readFile(absolute, "utf8");
  const base = dirname(absolute);
  const parts = [];
  const importPattern = /@import\s+["'](.+?)["'];/g;
  let cursor = 0;
  let match;

  while ((match = importPattern.exec(source))) {
    parts.push(source.slice(cursor, match.index));
    parts.push(await bundleCss(resolve(base, match[1]), seen));
    cursor = importPattern.lastIndex;
  }

  parts.push(source.slice(cursor));
  return parts.join("\n");
}

function minifyCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function getExportNames(source) {
  const exportBlock = (source.match(/export\s*\{([\s\S]*?)\};/) || [null, ""])[1];
  return exportBlock
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => name.replace(/\s+as\s+\w+$/i, ""));
}

function bundleJs(source) {
  const exportBlockPattern = /export\s*\{[\s\S]*?\};?\s*$/m;
  const autoInitPattern = /if \(typeof document !== "undefined"\) \{\n  if \(document\.readyState === "loading"\) \{\n    document\.addEventListener\("DOMContentLoaded", \(\) => init\(\)\);/;
  const exportNames = getExportNames(source);
  const interfaceAssignment = `window.InterfaceFramework = { ${exportNames.join(", ")} };`;
  const sourceWithEarlyGlobal = source.replace(autoInitPattern, `${interfaceAssignment}\n\n$&`);
  const withGlobalBeforeDemos = sourceWithEarlyGlobal.replace(exportBlockPattern, interfaceAssignment);
  return `(() => {\n${withGlobalBeforeDemos}\n})();\n`;
}

function minifyJs(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()[\];,:])\s*/g, "$1")
    .trim();
}

const css = await bundleCss(resolve(root, "src/styles/index.css"));
const jsSource = [
  await readFile(resolve(root, "src/js/index.js"), "utf8"),
  await readFile(resolve(root, "src/js/demo.js"), "utf8")
].join("\n");
const js = bundleJs(jsSource);

await writeFile(resolve(dist, "interface-framework.css"), css);
await writeFile(resolve(dist, "interface-framework.min.css"), minifyCss(css));
await writeFile(resolve(dist, "interface-framework.js"), js);
await writeFile(resolve(dist, "interface-framework.min.js"), minifyJs(js));
await writeFile(resolve(dist, "interface-framework.esm.js"), jsSource);
await writeFile(resolve(dist, "interface-framework.esm.min.js"), minifyJs(jsSource));

console.log("Built dist/interface-framework.css");
console.log("Built dist/interface-framework.min.css");
console.log("Built dist/interface-framework.js");
console.log("Built dist/interface-framework.min.js");
console.log("Built dist/interface-framework.esm.js");
console.log("Built dist/interface-framework.esm.min.js");

await writeChecksumManifest();
