// Package only the runtime files into an .icuewidget archive.
// Usage: node tools/package.mjs [output-path]   (default dist/dmz-fob.icuewidget)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] || path.join(root, "dist", "dmz-fob.icuewidget"));
const items = ["index.html", "manifest.json", "translation.json", "modules", "scripts", "styles", "resources", "assets", "data", "vendor"];
const stage = fs.mkdtempSync(path.join(os.tmpdir(), "dmz-fob-stage-"));
function run(args) {
  const r = spawnSync("npx", ["--yes", "icuewidget-cli", ...args], { stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error(`icuewidget-cli ${args[0]} failed (${r.status})`);
}
try {
  for (const it of items) {
    const src = path.join(root, it);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(stage, it), { recursive: true });
    else console.warn(`skip missing: ${it}`);
  }
  run(["validate", `"${stage}"`]);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  run(["package", `"${stage}"`, "-o", `"${out}"`]);
  console.log(`${out}: ${fs.statSync(out).size} bytes`);
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
