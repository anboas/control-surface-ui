import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");

const checksumTargets = [
  "package.json",
  "README.md",
  "CHANGELOG.md",
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
  "docs/release-checklist.md",
  "docs/release-smoke.md"
];

function normalizePath(path) {
  return path.replace(/\\/g, "/");
}

async function hashFile(path) {
  const absolute = resolve(root, path);
  const buffer = await readFile(absolute);
  return {
    path: normalizePath(path),
    file: basename(path),
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex")
  };
}

async function collectArtifacts() {
  const artifacts = [];
  for (const target of checksumTargets) {
    if (!existsSync(resolve(root, target))) {
      throw new Error(`Missing checksum target: ${target}`);
    }
    artifacts.push(await hashFile(target));
  }
  return artifacts;
}

function comparableArtifacts(artifacts) {
  return artifacts.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }));
}

export async function writeChecksumManifest({ check = false } = {}) {
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const artifacts = await collectArtifacts();
  const manifest = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    packageName: pkg.name,
    packageVersion: pkg.version,
    algorithm: "sha256",
    signing: {
      localBuildSigned: false,
      productionPolicy: "Sign checksum artifacts in the release pipeline or publish with npm provenance/Sigstore where available.",
      checksumArtifacts: [
        "dist/interface-framework.checksums.json",
        "dist/SHA256SUMS"
      ]
    },
    artifacts
  };

  const manifestPath = resolve(root, "dist/interface-framework.checksums.json");
  const sumsPath = resolve(root, "dist/SHA256SUMS");
  const sums = artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join("\n") + "\n";

  if (check) {
    const existingManifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const existingSums = await readFile(sumsPath, "utf8");
    const expected = JSON.stringify(comparableArtifacts(manifest.artifacts));
    const actual = JSON.stringify(comparableArtifacts(existingManifest.artifacts || []));
    if (
      existingManifest.packageName !== manifest.packageName ||
      existingManifest.packageVersion !== manifest.packageVersion ||
      existingManifest.algorithm !== manifest.algorithm ||
      actual !== expected ||
      existingSums !== sums
    ) {
      throw new Error("Checksum artifacts are stale. Run npm run checksums.");
    }
    console.log("OK checksum artifacts match current release files");
    return manifest;
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(sumsPath, sums);
  console.log("Wrote dist/interface-framework.checksums.json");
  console.log("Wrote dist/SHA256SUMS");
  return manifest;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === scriptPath;
if (isDirectRun) {
  try {
    await writeChecksumManifest({ check: process.argv.includes("--check") });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
