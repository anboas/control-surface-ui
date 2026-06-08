import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = resolve(dirname(scriptPath), "..");
const provenancePath = resolve(root, "release/provenance.json");
const provenanceMarkdownPath = resolve(root, "release/provenance.md");
const generatedBy = "scripts/release-provenance.mjs";

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

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

async function listReleaseTarballs() {
  const releaseDir = resolve(root, "release");
  if (!existsSync(releaseDir)) return [];
  const entries = await readdir(releaseDir, { withFileTypes: true });
  const tarballs = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tgz"))
    .map((entry) => `release/${entry.name}`)
    .sort((left, right) => left.localeCompare(right));

  const artifacts = [];
  for (const tarball of tarballs) artifacts.push(await hashFile(tarball));
  return artifacts;
}

async function readExistingGeneratedAt() {
  try {
    const existing = JSON.parse(await readFile(provenancePath, "utf8"));
    return existing.generatedAt;
  } catch {
    return new Date().toISOString();
  }
}

function publicMetadata(pkg) {
  return {
    main: pkg.main,
    module: pkg.module,
    browser: pkg.browser,
    style: pkg.style,
    unpkg: pkg.unpkg,
    jsdelivr: pkg.jsdelivr,
    exports: Object.keys(pkg.exports || {}).sort(),
    cdn: pkg.cdn || {}
  };
}

function runtimeDependencyNames(pkg) {
  return Object.keys(pkg.dependencies || {}).sort();
}

async function buildProvenance({ generatedAt }) {
  const pkg = await readJson("package.json");
  const checksumManifest = await readJson("dist/interface-framework.checksums.json");
  const sha256sums = await readFile(resolve(root, "dist/SHA256SUMS"), "utf8");
  const releaseTarballs = await listReleaseTarballs();
  const dependencies = runtimeDependencyNames(pkg);
  const checksumArtifacts = (checksumManifest.artifacts || []).map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 }));
  const checksumEvidence = {
    packageName: checksumManifest.packageName,
    packageVersion: checksumManifest.packageVersion,
    algorithm: checksumManifest.algorithm,
    signing: checksumManifest.signing,
    artifacts: checksumArtifacts
  };

  return {
    schemaVersion: "1.0",
    generatedAt,
    generatedBy,
    status: "local-provenance-frozen",
    packageName: pkg.name,
    packageVersion: pkg.version,
    releaseIdentity: {
      localBuildSigned: false,
      trustedPublisherRequired: true,
      npmProvenanceCommand: "npm publish --provenance",
      externalSigningPolicy: "Publish through npm provenance/Sigstore where available, or sign dist/SHA256SUMS and dist/interface-framework.checksums.json in the release pipeline."
    },
    runtime: {
      noReactRuntimeDependency: !dependencies.some((name) => /(^|-)react($|-)/i.test(name)),
      dependencyCount: dependencies.length,
      dependencies
    },
    packageMetadata: publicMetadata(pkg),
    checksumEvidence: {
      manifestPath: "dist/interface-framework.checksums.json",
      sha256SumsPath: "dist/SHA256SUMS",
      manifestComparableSha256: createHash("sha256").update(JSON.stringify(checksumEvidence)).digest("hex"),
      sha256SumsSha256: createHash("sha256").update(sha256sums).digest("hex"),
      artifactCount: checksumArtifacts.length,
      artifacts: checksumArtifacts
    },
    packageArtifacts: releaseTarballs,
    verification: {
      localCommands: [
        "npm run build",
        "npm run checksums -- --check",
        "npm run release:smoke",
        "npm run release:provenance:check",
        "npm run validate"
      ],
      evidenceFiles: [
        "release/provenance.json",
        "release/provenance.md",
        "dist/interface-framework.checksums.json",
        "dist/SHA256SUMS",
        "docs/release-smoke.md",
        "docs/release-governance.md",
        "docs/release-checklist.md"
      ]
    }
  };
}

function renderMarkdown(provenance) {
  const rows = provenance.checksumEvidence.artifacts
    .map((artifact) => `| \`${artifact.path}\` | ${artifact.bytes} | \`${artifact.sha256}\` |`)
    .join("\n");
  const packageRows = provenance.packageArtifacts.length
    ? provenance.packageArtifacts
        .map((artifact) => `| \`${artifact.path}\` | ${artifact.bytes} | \`${artifact.sha256}\` |`)
        .join("\n")
    : "| None generated | 0 | n/a |";

  return `# Release Provenance

Generated by \`${provenance.generatedBy}\` at ${provenance.generatedAt}.

## Status

- Package: \`${provenance.packageName}@${provenance.packageVersion}\`
- Status: \`${provenance.status}\`
- Runtime dependency count: ${provenance.runtime.dependencyCount}
- No React runtime dependency: ${provenance.runtime.noReactRuntimeDependency ? "yes" : "no"}
- Trusted publication command: \`${provenance.releaseIdentity.npmProvenanceCommand}\`

Local builds are not externally signed. Production publication must use npm provenance/Sigstore where available, or sign the generated checksum artifacts in the publishing pipeline.

## Package Artifacts

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
${packageRows}

## Checksum Evidence

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
${rows}

## Verification Commands

${provenance.verification.localCommands.map((command) => `- \`${command}\``).join("\n")}
`;
}

function stableJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

async function main() {
  const check = process.argv.includes("--check");
  const generatedAt = check ? await readExistingGeneratedAt() : new Date().toISOString();
  const provenance = await buildProvenance({ generatedAt });
  const nextJson = stableJson(provenance);
  const nextMarkdown = renderMarkdown(provenance);

  if (check) {
    const existingJson = await readFile(provenancePath, "utf8");
    const existingMarkdown = await readFile(provenanceMarkdownPath, "utf8");
    if (existingJson !== nextJson || existingMarkdown !== nextMarkdown) {
      throw new Error("Release provenance artifacts are stale. Run npm run release:provenance.");
    }
    console.log("OK release provenance artifacts match current package evidence");
    return;
  }

  await mkdir(resolve(root, "release"), { recursive: true });
  await writeFile(provenancePath, nextJson);
  await writeFile(provenanceMarkdownPath, nextMarkdown);
  console.log("Wrote release/provenance.json");
  console.log("Wrote release/provenance.md");
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
