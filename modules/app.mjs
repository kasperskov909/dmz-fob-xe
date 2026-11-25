import { init as initMap } from "./map.mjs";
import { init as initPrinter } from "./printer.mjs";
import { init as initGuides } from "./guides.mjs";

const uid = typeof uniqueId !== "undefined" && uniqueId ? String(uniqueId) : "local-preview";
const KEY = "fob.lastTab." + uid;
const app = document.getElementById("app");
const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

function load() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
function save(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* ignore */ } }

function select(tab, focus) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", on ? "true" : "false");
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  }
  if (focus) tab.focus();
  save(tab.id);
}

tabs.forEach((t, i) => {
  t.addEventListener("click", () => select(t, false));
  t.addEventListener("keydown", (e) => {
    let n = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = tabs.length - 1;
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(t, false); return; }
    if (n >= 0) { e.preventDefault(); select(tabs[n], true); }
  });
});

// Orientation: the iCUE docs expose no size/orientation API, so use the viewport.
function updateOrientation() {
  app.dataset.orientation = window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
}
window.addEventListener("resize", updateOrientation);
updateOrientation();

const saved = tabs.find((t) => t.id === load());
select(saved || tabs[0], false);

initMap(document.getElementById("panel-map"));
initPrinter(document.getElementById("panel-printer"));
initGuides(document.getElementById("panel-guides"));
