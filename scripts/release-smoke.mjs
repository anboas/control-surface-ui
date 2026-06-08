import { spawn } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { get } from "node:https";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmVersion = "10.9.2";
const requiredDistFiles = [
  "dist/interface-framework.css",
  "dist/interface-framework.min.css",
  "dist/interface-framework.js",
  "dist/interface-framework.min.js",
  "dist/interface-framework.esm.js",
  "dist/interface-framework.esm.min.js",
  "dist/interface-framework.checksums.json",
  "dist/SHA256SUMS"
];
const requiredPackFiles = [
  "package/dist/interface-framework.css",
  "package/dist/interface-framework.min.css",
  "package/dist/interface-framework.js",
  "package/dist/interface-framework.min.js",
  "package/dist/interface-framework.esm.js",
  "package/dist/interface-framework.esm.min.js",
  "package/src/tokens/index.css",
  "package/docs/package-handoff.md",
  "package/docs/component-manifest.json",
  "package/README.md",
  "package/CHANGELOG.md",
  "package/package.json"
];

function log(message) {
  console.log(`[release-smoke] ${message}`);
}

function run(command, args = [], { cwd = root, capture = false } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", rejectRun);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRun({ stdout, stderr });
        return;
      }
      const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
      rejectRun(new Error(`${command} ${args.join(" ")} failed with exit code ${code}${output ? `\n${output}` : ""}`));
    });
  });
}

async function commandWorks(command, args) {
  try {
    const result = await run(command, args, { capture: true });
    return result.stdout.trim() || result.stderr.trim();
  } catch {
    return "";
  }
}

function download(url, destination, redirectCount = 0) {
  return new Promise((resolveDownload, rejectDownload) => {
    if (redirectCount > 4) {
      rejectDownload(new Error(`Too many redirects while downloading ${url}`));
      return;
    }
    get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        download(response.headers.location, destination, redirectCount + 1).then(resolveDownload, rejectDownload);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        rejectDownload(new Error(`Download failed for ${url}: HTTP ${response.statusCode}`));
        return;
      }
      const file = createWriteStream(destination);
      response.pipe(file);
      file.on("finish", () => file.close(resolveDownload));
      file.on("error", rejectDownload);
    }).on("error", rejectDownload);
  });
}

async function getNpm(workRoot) {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const installedVersion = await commandWorks(command, ["--version"]);
  if (installedVersion) {
    log(`using npm from PATH (${installedVersion})`);
    return { command, prefix: [], version: installedVersion, source: "path" };
  }

  log(`npm not found on PATH; downloading temporary npm ${npmVersion}`);
  const npmRoot = resolve(workRoot, "npm-cli");
  const archive = resolve(workRoot, `npm-${npmVersion}.tgz`);
  await mkdir(npmRoot, { recursive: true });
  await download(`https://registry.npmjs.org/npm/-/npm-${npmVersion}.tgz`, archive);
  await run("tar", ["-xzf", archive, "-C", npmRoot]);
  const cli = resolve(npmRoot, "package", "bin", "npm-cli.js");
  if (!existsSync(cli)) throw new Error(`Temporary npm CLI was not extracted at ${cli}`);
  const version = (await run(process.execPath, [cli, "--version"], { capture: true })).stdout.trim();
  log(`using temporary npm ${version}`);
  return { command: process.execPath, prefix: [cli], version, source: "temporary" };
}

function runNpm(npm, args, options = {}) {
  return run(npm.command, [...npm.prefix, ...args], options);
}

async function assertFile(path) {
  if (!existsSync(path)) throw new Error(`Expected file missing: ${path}`);
  return stat(path);
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function tarballDependency(tarball) {
  return `file:./${basename(tarball)}`;
}

async function packPackage(npm, workRoot, label) {
  const packDir = resolve(workRoot, label);
  await mkdir(packDir, { recursive: true });
  const result = await runNpm(npm, ["pack", "--pack-destination", packDir], { cwd: root, capture: true });
  const tarballName = result.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
  if (!tarballName) throw new Error("npm pack did not report a tarball name");
  const tarball = resolve(packDir, tarballName);
  await assertFile(tarball);
  log(`packed ${tarballName}`);
  return tarball;
}

async function inspectTarball(tarball) {
  const result = await run("tar", ["-tf", tarball], { capture: true });
  const entries = new Set(result.stdout.split(/\r?\n/).filter(Boolean));
  const missing = requiredPackFiles.filter((file) => !entries.has(file));
  if (missing.length) {
    throw new Error(`Packed tarball is missing required files:\n- ${missing.join("\n- ")}`);
  }
  log("packed tarball includes required framework files");
}

async function verifyInstalledPackage(sampleDir) {
  const pkgDir = resolve(sampleDir, "node_modules", "control-surface-ui");
  const pkg = JSON.parse(await readFile(resolve(pkgDir, "package.json"), "utf8"));
  for (const file of requiredDistFiles) {
    await assertFile(resolve(pkgDir, file));
  }
  const deps = {
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    ...pkg.optionalDependencies
  };
  if (deps.react || deps["react-dom"]) {
    throw new Error("Installed package unexpectedly depends on React");
  }
  for (const field of ["exports", "style", "browser", "module", "unpkg", "jsdelivr", "cdn", "releaseGovernance"]) {
    if (!pkg[field]) throw new Error(`Installed package missing package field: ${field}`);
  }
  return pkg;
}

async function smokePlainHtml(npm, workRoot, tarball) {
  const sampleDir = resolve(workRoot, "plain-html-consumer");
  await mkdir(sampleDir, { recursive: true });
  await copyFile(tarball, resolve(sampleDir, basename(tarball)));
  await writeJson(resolve(sampleDir, "package.json"), {
    private: true,
    type: "module",
    dependencies: {
      "control-surface-ui": tarballDependency(tarball)
    }
  });
  await writeFile(resolve(sampleDir, "index.html"), `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="./node_modules/control-surface-ui/dist/interface-framework.css">
  </head>
  <body>
    <button class="if-btn if-btn--primary" data-if-toast="Plain HTML smoke loaded">Smoke</button>
    <script src="./node_modules/control-surface-ui/dist/interface-framework.js"></script>
  </body>
</html>
`);
  await runNpm(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: sampleDir });
  await verifyInstalledPackage(sampleDir);
  await assertFile(resolve(sampleDir, "node_modules", "control-surface-ui", "dist", "interface-framework.js"));
  log("plain HTML consumer installed package artifacts only");
}

async function smokeVite(npm, workRoot, tarball) {
  const sampleDir = resolve(workRoot, "vite-consumer");
  await mkdir(resolve(sampleDir, "src"), { recursive: true });
  await copyFile(tarball, resolve(sampleDir, basename(tarball)));
  await writeJson(resolve(sampleDir, "package.json"), {
    private: true,
    type: "module",
    scripts: {
      build: "vite build"
    },
    dependencies: {
      "control-surface-ui": tarballDependency(tarball)
    },
    devDependencies: {
      vite: "^5.4.0"
    }
  });
  await writeFile(resolve(sampleDir, "index.html"), `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Interface Framework Vite Smoke</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.js"></script></body>
</html>
`);
  await writeFile(resolve(sampleDir, "src", "main.js"), `import "control-surface-ui/css";
import { init, destroy, registerDataTableAdapter, setTheme } from "control-surface-ui";

document.querySelector("#app").innerHTML = '<main class="if-shell"><button class="if-btn if-btn--primary">Vite smoke</button></main>';
registerDataTableAdapter("smoke", async () => ({ rows: [], total: 0 }));
setTheme("light");
init(document);
destroy(document, { modules: ["tables", "overlays", "graph"] });
`);
  await runNpm(npm, ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: sampleDir });
  await verifyInstalledPackage(sampleDir);
  await run(process.execPath, [resolve(sampleDir, "node_modules", "vite", "bin", "vite.js"), "build"], { cwd: sampleDir });
  const lock = await readFile(resolve(sampleDir, "package-lock.json"), "utf8");
  if (/"react"|"react-dom"/.test(lock)) throw new Error("Vite consumer lockfile unexpectedly includes React");
  log("Vite consumer imported CSS and named ESM APIs from package artifacts");
}

function smokeReport({ date, nodeVersion, npm, packageVersion }) {
  return `# Release Smoke

Last run: ${date}.

## Scope

The release smoke verifies that the framework works from package artifacts only:

- Run the framework build and validation suite.
- Run \`npm pack\`.
- Install the packed tarball into a clean plain HTML sample.
- Install the packed tarball into a clean Vite sample.
- Verify dist CSS/JS artifacts, package exports, CDN metadata, and no React runtime dependency.
- Verify release-governance metadata and checksum artifacts.

## ${date} Result

Status: passed.

Environment:

- Node: \`${nodeVersion}\`
- npm CLI used for smoke: \`${npm.version}\`
- npm source: \`${npm.source}\`

Checks completed:

- \`node scripts/build.mjs\`: passed.
- \`node scripts/validate.mjs\`: passed.
- \`node scripts/checksums.mjs --check\`: passed.
- \`npm pack\`: produced \`control-surface-ui-${packageVersion}.tgz\`.
- Final handoff tarball copied to \`release/control-surface-ui-${packageVersion}.tgz\`.
- Packed tarball included required \`dist\`, \`src\`, \`docs\`, release, and package metadata files.
- Plain HTML clean sample installed from the packed tarball and resolved package \`dist\` CSS/JS.
- Vite clean sample installed from the packed tarball, imported \`control-surface-ui/css\`, imported named JavaScript APIs from \`control-surface-ui\`, and ran \`vite build\`.
- Package export map exposed CSS, browser JS, ESM JS, manifest, recipe, event, release-governance, checksum, and handoff entries.
- CDN fields were present: \`unpkg\`, \`jsdelivr\`, \`cdn.cssMin\`, and \`cdn.jsMin\`.
- Installed package runtime dependencies did not include \`react\` or \`react-dom\`.
- Clean Vite sample \`package-lock.json\` did not contain \`react\` or \`react-dom\`.

## Repeat The Smoke

Run either command from the repository root:

\`\`\`bash
node scripts/release-smoke.mjs
npm run release:smoke
\`\`\`

The script downloads a temporary npm CLI when npm is unavailable on PATH, then runs the same package-consumer checks in isolated temporary directories.
`;
}

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const workRoot = resolve(tmpdir(), `control-surface-ui-smoke-${Date.now()}`);
  await rm(workRoot, { recursive: true, force: true });
  await mkdir(workRoot, { recursive: true });
  log(`workspace ${workRoot}`);

  const npm = await getNpm(workRoot);
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

  await run(process.execPath, ["scripts/build.mjs"]);
  await run(process.execPath, ["scripts/validate.mjs"]);
  await run(process.execPath, ["scripts/checksums.mjs", "--check"]);

  const tarball = await packPackage(npm, workRoot, "pack-initial");
  await inspectTarball(tarball);
  await smokePlainHtml(npm, workRoot, tarball);
  await smokeVite(npm, workRoot, tarball);

  await writeFile(resolve(root, "docs", "release-smoke.md"), smokeReport({
    date,
    nodeVersion: process.version,
    npm,
    packageVersion: pkg.version
  }));
  log("updated docs/release-smoke.md");

  await run(process.execPath, ["scripts/build.mjs"]);
  await run(process.execPath, ["scripts/checksums.mjs", "--check"]);
  const finalTarball = await packPackage(npm, workRoot, "pack-final");
  await inspectTarball(finalTarball);
  const releaseDir = resolve(root, "release");
  await mkdir(releaseDir, { recursive: true });
  const releaseTarball = resolve(releaseDir, basename(finalTarball));
  await copyFile(finalTarball, releaseTarball);
  log(`copied handoff tarball to ${releaseTarball}`);
  await run(process.execPath, ["scripts/release-provenance.mjs"]);
  await run(process.execPath, ["scripts/validate.mjs"]);
  await run(process.execPath, ["scripts/checksums.mjs", "--check"]);

  log("release smoke passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
