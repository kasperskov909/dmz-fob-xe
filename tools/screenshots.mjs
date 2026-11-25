// Acceptance screenshot pass. Serves the repo root, captures each tab at each viewport
// into docs/screenshots/<tab>-<w>x<h>.png.
// Run: npx --yes -p playwright node tools/screenshots.mjs
//   (or: npm i -D playwright && npx playwright install chromium && node tools/screenshots.mjs)
// Playwright is resolved from the local node_modules, else from NODE_PATH / the npx cache.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "docs", "screenshots");
const require = createRequire(import.meta.url);

function loadPlaywright() {
  try { return require("playwright"); } catch {}
  const paths = (process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean);
  const npx = path.join(process.env.LOCALAPPDATA || path.join(process.env.HOME || "", ".npm"), "npm-cache", "_npx");
  if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) paths.push(path.join(npx, d, "node_modules"));
  for (const p of paths) { try { return require(path.join(p, "playwright")); } catch {} }
  throw new Error("playwright not found. Run: npx --yes -p playwright node tools/screenshots.mjs");
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  fs.readFile(p, (e, buf) => {
    if (e) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

fs.mkdirSync(out, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const modes = {};
try {
  for (const [w, h] of [[2560, 720], [720, 2560], [1280, 720]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(url, { waitUntil: "load" });
    for (const tab of ["map", "printer", "guides"]) {
      await page.click(`#tab-${tab}`);
      await page.waitForSelector(`#panel-${tab}:not([hidden])`, { timeout: 5000 }).catch(() => {});
      let mode = "";
      if (tab === "map") {
        // Real image loaded = overlay <img> with the remote src complete; else wait out fallback.
        mode = await page.waitForFunction(() => {
          const img = [...document.querySelectorAll("img.leaflet-image-layer")].find((i) => /^https?:/.test(i.src));
          if (img && img.complete && img.naturalWidth > 0) return "remote";
          const m = document.querySelector("#panel-map")?.dataset.mapMode;
          return m === "fallback" ? "fallback" : false;
        }, null, { timeout: 15000 }).then((x) => x.jsonValue()).catch(() => "timeout-unknown");
        modes[`${w}x${h}`] = mode;
      }
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(out, `${tab}-${w}x${h}.png`) });
      console.log(`${tab}-${w}x${h}.png${tab === "map" ? " (map mode: " + mode + ")" : ""}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
