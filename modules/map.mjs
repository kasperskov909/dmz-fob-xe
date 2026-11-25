import { icon as makeIcon } from "./map-icons.mjs";

const PIN_HIT = 44; // px, invisible touch target around each badge
const BOUNDS = [[0, 0], [2700, 2880]];
const IMG_URL = "https://codcentral.net/assets/library/mw4/dmz/map/hajin-map-2880.webp";
const FALLBACK_URL = "assets/map/hajin-grid.svg";
const FULL_MAP_URL = "https://codcentral.net/blog/mw4-dmz-map/";
const TIMEOUT_MS = 8000;
const ATTRIBUTION = 'Map image: <a href="' + FULL_MAP_URL + '" target="_blank" rel="noopener">CODCentral.net (codcentral.net/blog/mw4-dmz-map)</a> | Markers: FOB widget authors | Call of Duty is a trademark of Activision';

async function loadJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + " " + r.status);
  return r.json();
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Mount the map feature into panelEl. */
export async function init(panelEl) {
  panelEl.dataset.ready = "true";
  const L = window.L;
  if (!L) { panelEl.textContent = "Map library missing."; return; }
  const stage = el("div", "map-stage");
  const viewport = el("div", "map-viewport");
  stage.append(viewport);
  const side = el("div", "map-side");
  const legendEl = el("div", "map-legend");
  legendEl.setAttribute("role", "group");
  legendEl.setAttribute("aria-label", "Map legend");
  const banner = el("div", "map-banner");
  banner.hidden = true;
  banner.setAttribute("role", "status");
  banner.append(document.createTextNode("Offline map: grid view. "));
  const link = el("a", "map-open", "Open full map");
  link.href = FULL_MAP_URL; link.target = "_blank"; link.rel = "noopener";
  banner.append(link, document.createTextNode(" when online."));
  side.append(banner, legendEl);
  panelEl.append(stage, side);

  const map = L.map(viewport, { crs: L.CRS.Simple, minZoom: -3, maxZoom: 2, zoomSnap: 0.25, attributionControl: false, trackResize: false, maxBounds: BOUNDS, maxBoundsViscosity: 1 });
  const attrCtl = L.control.attribution({ prefix: false }).addAttribution(ATTRIBUTION).addTo(map);
  const attrEl = attrCtl.getContainer();
  let sel = null; // selected pin: { m, mk, badge, wrap, colour }

  // Info sheet: sibling of the Leaflet container so its clicks never reach the map.
  const sheet = el("aside", "map-sheet");
  sheet.setAttribute("role", "region");
  sheet.setAttribute("aria-label", "Pin details");
  sheet.setAttribute("aria-hidden", "true");
  const sHead = el("div", "sheet-head");
  const sTitles = el("div", "sheet-titles");
  const sTitle = el("h2", "sheet-title");
  const sTags = el("div", "sheet-tags");
  sTitles.append(sTitle, sTags);
  const sToggle = el("button", "sheet-btn sheet-toggle");
  sToggle.type = "button";
  sToggle.setAttribute("aria-expanded", "true");
  sToggle.setAttribute("aria-label", "Collapse details");
  sToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const sClose = el("button", "sheet-btn sheet-close");
  sClose.type = "button";
  sClose.setAttribute("aria-label", "Close details");
  sClose.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  sHead.append(sTitles, sToggle, sClose);
  const sBody = el("div", "sheet-body");
  sBody.id = "map-sheet-body";
  sToggle.setAttribute("aria-controls", sBody.id);
  sheet.append(sHead, sBody);
  stage.append(sheet);
  const setAttrH = () => stage.style.setProperty("--attr-h", attrEl.offsetHeight + "px");
  let pinBounds = null, touched = false, refitting = false;
  const OVERSCAN = 3; // px of image kept beyond the viewport on every side
  let inset = L.latLngBounds(BOUNDS);
  const FREE = L.latLngBounds([-1e7, -1e7], [1e7, 1e7]);
  // Cover: smallest zoom at which the image (minus overscan) still fills the whole viewport.
  const coverZoom = () => {
    const sz = map.getSize();
    if (!sz.x || !sz.y) return map.getMinZoom();
    const z = Math.log2(Math.max((sz.x + 2 * OVERSCAN) / BOUNDS[1][1], (sz.y + 2 * OVERSCAN) / BOUNDS[1][0]));
    return Math.ceil(z * 4 - 1e-6) / 4;
  };
  const clampCentre = (c, z) => {
    const sz = map.getSize();
    const halfLat = sz.y / 2 / Math.pow(2, z), halfLng = sz.x / 2 / Math.pow(2, z);
    const sw = inset.getSouthWest(), ne = inset.getNorthEast();
    return L.latLng(
      Math.min(Math.max(c.lat, sw.lat + halfLat), ne.lat - halfLat),
      Math.min(Math.max(c.lng, sw.lng + halfLng), ne.lng - halfLng));
  };
  const centroid = () => (pinBounds && pinBounds.isValid() ? pinBounds : L.latLngBounds(BOUNDS)).getCenter();
  const applyCover = (reset) => {
    refitting = true;
    try {
      // Leaflet's own moveend bounds enforcement animates; suspend it while we position explicitly.
      map.options.maxBounds = FREE;
      map.stop();
      map.invalidateSize({ animate: false });
      const min = coverZoom();
      map.options.minZoom = min;
      const d = OVERSCAN / Math.pow(2, min);
      inset = L.latLngBounds([d, d], [BOUNDS[1][0] - d, BOUNDS[1][1] - d]);
      if (reset) {
        const fit = pinBounds && pinBounds.isValid() ? map.getBoundsZoom(pinBounds.pad(0.18), false) : min;
        const z = Math.min(map.getMaxZoom(), Math.max(min, fit));
        map.setView(clampCentre(centroid(), z), z, { animate: false });
      } else {
        if (map.getZoom() < min) map.setZoom(min, { animate: false });
        map.panInsideBounds(inset, { animate: false });
      }
    } finally { map.options.maxBounds = inset; refitting = false; }
  };
  const refit = () => { applyCover(!touched); if (sel && sheet.classList.contains("open")) centreSel(null, false); };
  let pending = 0;
  const scheduleRefit = () => {
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = 0; refit(); });
  };
  map.setView(L.latLngBounds(BOUNDS).getCenter(), 0, { animate: false });
  applyCover(true);
  map.on("dragstart zoomstart", () => { if (!refitting) touched = true; });
  setAttrH();
  if (typeof ResizeObserver !== "undefined") { new ResizeObserver(scheduleRefit).observe(viewport); new ResizeObserver(setAttrH).observe(attrEl); }
  else window.addEventListener("resize", scheduleRefit);
  window.addEventListener("orientationchange", scheduleRefit);
  if (/[?&]debug(&|$|=)/.test(location.search)) window.__fobMap = map;

  // Base image with 8 s timeout and error fallback to the local grid.
  let settled = false;
  let timer = 0;
  let overlay = L.imageOverlay(IMG_URL, BOUNDS).addTo(map);
  const fallback = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    map.removeLayer(overlay);
    overlay = L.imageOverlay(FALLBACK_URL, BOUNDS).addTo(map);
    banner.hidden = false;
    panelEl.dataset.mapMode = "fallback";
  };
  timer = setTimeout(fallback, TIMEOUT_MS);
  overlay.on("load", () => { if (!settled) { settled = true; clearTimeout(timer); panelEl.dataset.mapMode = "remote"; } });
  overlay.on("error", fallback);

  let legend = [], markers = [];
  try { [legend, markers] = await Promise.all([loadJson("data/map-legend.json"), loadJson("data/map-markers.json")]); }
  catch (e) { legendEl.textContent = "Map data unavailable."; return; }

  let markersMeta = null;
  if (!Array.isArray(markers)) { markersMeta = markers; markers = markers.markers || []; }
  const counts = {};
  for (const m of markers) counts[m.category] = (counts[m.category] || 0) + 1;
  pinBounds = L.latLngBounds(markers.map((m) => [2700 * (1 - m.y / 100), 2880 * m.x / 100]));
  const groups = {};
  const colours = {}, icons = {}, labels = {};
  const rarity = (markersMeta && markersMeta.rarityColours) || {};
  for (const c of legend) { groups[c.id] = L.layerGroup().addTo(map); colours[c.id] = c.colour; icons[c.id] = c.icon; labels[c.id] = c.label; }
  const iconFor = (cat) => (cat === "bwlocker" ? "locker1" : icons[cat]);
  const pinColour = (m) => (m.category === "key" ? m.colour || rarity[m.rarity] || rarity.Unknown || colours.key : colours[m.category]);
  const entries = {};
  for (const m of markers) {
    const g = groups[m.category];
    if (!g) continue;
    const isKey = m.category === "key";
    const colour = pinColour(m);
    const wrap = el("button", "map-pin-btn");
    wrap.type = "button";
    wrap.setAttribute("aria-label", m.name + ", grid " + m.grid);
    const badge = el("span", "map-badge" + (isKey ? " map-badge-key" : "") + (isKey && m.verified === false ? " is-unverified" : ""));
    badge.dataset.cat = m.category;
    badge.style.setProperty("--c", colour);
    badge.append(makeIcon(iconFor(m.category)));
    wrap.append(badge);
    const pinIcon = L.divIcon({ className: "map-pin", html: wrap, iconSize: [PIN_HIT, PIN_HIT], iconAnchor: [PIN_HIT / 2, PIN_HIT / 2] });
    const mk = L.marker([2700 * (1 - m.y / 100), 2880 * m.x / 100], { icon: pinIcon, keyboard: false, riseOnHover: false });
    mk.on("click", () => select(m.id));
    g.addLayer(mk);
    entries[m.id] = { m, mk, badge, wrap, colour };
  }

  const portraitMq = window.matchMedia("(orientation: portrait)");
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function visibleCentre() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!sheet.classList.contains("open")) return [w / 2, h / 2];
    if (portraitMq.matches) return [w / 2, Math.max(0, h - sheet.offsetHeight - attrEl.offsetHeight) / 2];
    return [Math.max(0, w - sheet.offsetWidth) / 2, h / 2];
  }
  // Centre the selected pin in the part of the map the sheet leaves visible, honouring the cover clamp.
  function centreSel(zoom, animate) {
    if (!sel) return;
    const z = zoom == null ? map.getZoom() : zoom;
    const [cx, cy] = visibleCentre();
    const sz = map.getSize();
    const pt = map.project(sel.mk.getLatLng(), z).subtract(L.point(cx - sz.x / 2, cy - sz.y / 2));
    const c = clampCentre(map.unproject(pt, z), z);
    map.setView(c, z, animate && !reduced() ? { animate: true, duration: 0.35 } : { animate: false });
  }
  function fillSheet(e) {
    const m = e.m, isKey = m.category === "key";
    sheet.style.setProperty("--c", e.colour);
    sTitle.textContent = m.name;
    sTags.textContent = "";
    const tag = (cls, text) => { sTags.append(el("span", "sheet-tag " + cls, text)); };
    tag("tag-layer", labels[m.category] || m.category);
    tag("tag-grid", "Grid " + m.grid);
    if (isKey && m.rarity) tag("tag-rarity", m.rarity);
    if (isKey) tag(m.verified === false ? "tag-unverified" : "tag-verified", m.verified === false ? "Unverified" : "Verified");
    sBody.textContent = "";
    const text = isKey ? m.info : m.note;
    if (text) sBody.append(el("p", "sheet-info", text));
    if (isKey && m.detail) sBody.append(el("p", "sheet-detail", m.detail));
    if (isKey && m.verified === false) sBody.append(el("p", "sheet-note", "Unverified: position from community reports."));
    sBody.scrollTop = 0;
  }
  function setCollapsed(on) {
    sheet.classList.toggle("collapsed", on);
    sToggle.setAttribute("aria-expanded", on ? "false" : "true");
    sToggle.setAttribute("aria-label", on ? "Expand details" : "Collapse details");
  }
  function select(id) {
    const e = entries[id];
    if (!e) return;
    if (sel && sel !== e) { sel.badge.classList.remove("is-selected"); sel.mk.setZIndexOffset(0); }
    sel = e;
    touched = true;
    fillSheet(e);
    setCollapsed(false);
    e.badge.classList.remove("is-selected");
    void e.badge.offsetWidth;
    e.badge.classList.add("is-selected");
    e.mk.setZIndexOffset(2000);
    sheet.setAttribute("aria-hidden", "false");
    sheet.classList.add("open");
    centreSel(Math.min(map.getMaxZoom(), Math.max(map.getZoom(), map.getMinZoom() + 1)), true);
  }
  function closeSheet(refocus) {
    if (!sel) return;
    const e = sel;
    sel = null;
    e.badge.classList.remove("is-selected");
    e.mk.setZIndexOffset(0);
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    if (refocus && e.wrap.isConnected) e.wrap.focus({ preventScroll: true });
  }
  sToggle.addEventListener("click", () => { setCollapsed(!sheet.classList.contains("collapsed")); centreSel(null, true); });
  sClose.addEventListener("click", () => closeSheet(true));
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && sel) { ev.stopPropagation(); closeSheet(true); } });
  map.on("click", () => closeSheet(false));
  if (window.__fobMap) window.__fobSelect = select;
  { const q = /[?&]debug(&|$|=)/.test(location.search) && /[?&]select=([\w-]+)/.exec(location.search); if (q) setTimeout(() => select(q[1]), 600); }
  const scalePins = () => { const z = map.getZoom() - map.getMinZoom(); map.getContainer().style.setProperty("--pin-scale", String(Math.min(1.08, Math.max(0.9, 0.9 + z * 0.09)))); };
  map.on("zoomend", scalePins);
  refit();
  scalePins();
  function rarityKey() {
    const box = el("div", "map-rarity");
    box.setAttribute("role", "list");
    box.setAttribute("aria-label", "Key rarity colours");
    for (const [name, col] of Object.entries(rarity)) {
      const it = el("span", "map-rarity-item");
      it.setAttribute("role", "listitem");
      const dot = el("span", "map-rarity-dot"); dot.style.setProperty("--c", col);
      it.append(dot, document.createTextNode(name));
      box.append(it);
    }
    const u = el("span", "map-rarity-item");
    u.setAttribute("role", "listitem");
    u.append(el("span", "map-rarity-dot is-dashed"), document.createTextNode("Unverified"));
    box.append(u);
    return box;
  }
  for (const c of legend) {
    const b = el("button", "map-chip");
    b.type = "button";
    b.dataset.category = c.id;
    b.setAttribute("aria-pressed", "true");
    const sw = el("span", "map-swatch"); sw.style.setProperty("--c", c.colour);
    sw.append(makeIcon(iconFor(c.id)));
    b.append(sw, el("span", "map-chip-label", c.label), el("span", "map-chip-count", String(counts[c.id] || 0)));
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) groups[c.id].addTo(map); else { map.removeLayer(groups[c.id]); if (sel && sel.m.category === c.id) closeSheet(false); }
    });
    legendEl.append(b);
    if (c.id === "key") legendEl.append(rarityKey());
  }
}
