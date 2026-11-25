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
  const viewport = el("div", "map-viewport");
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
  panelEl.append(viewport, side);

  const map = L.map(viewport, { crs: L.CRS.Simple, minZoom: -3, maxZoom: 2, zoomSnap: 0.25, attributionControl: false, trackResize: false, maxBounds: BOUNDS, maxBoundsViscosity: 1 });
  L.control.attribution({ prefix: false }).addAttribution(ATTRIBUTION).addTo(map);
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
  const refit = () => applyCover(!touched);
  let pending = 0;
  const scheduleRefit = () => {
    if (pending) return;
    pending = requestAnimationFrame(() => { pending = 0; refit(); });
  };
  map.setView(L.latLngBounds(BOUNDS).getCenter(), 0, { animate: false });
  applyCover(true);
  map.on("dragstart zoomstart", () => { if (!refitting) touched = true; });
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(scheduleRefit).observe(viewport);
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

  if (!Array.isArray(markers)) markers = markers.markers || [];
  const counts = {};
  for (const m of markers) counts[m.category] = (counts[m.category] || 0) + 1;
  pinBounds = L.latLngBounds(markers.map((m) => [2700 * (1 - m.y / 100), 2880 * m.x / 100]));
  const groups = {};
  const colours = {};
  for (const c of legend) { groups[c.id] = L.layerGroup().addTo(map); colours[c.id] = c.colour; }
  for (const m of markers) {
    const g = groups[m.category];
    if (!g) continue;
    const isKey = m.category === "key";
    const sz = isKey ? 16 : 22;
    const icon = L.divIcon({
      className: "map-pin" + (isKey ? " map-pin-key" : ""),
      html: '<span data-cat="' + m.category + '" style="background:' + colours[m.category] + '"></span>',
      iconSize: [sz, sz]
    });
    const mk = L.marker([2700 * (1 - m.y / 100), 2880 * m.x / 100], { icon, title: m.name + " (" + m.grid + ")", keyboard: false });
    mk.bindPopup(el("div", "map-popup", m.name + " (" + m.grid + ")" + (m.note ? ": " + m.note : "")));
    g.addLayer(mk);
  }
  const scalePins = () => { const z = map.getZoom() - map.getMinZoom(); map.getContainer().style.setProperty("--pin-scale", String(Math.min(1.2, Math.max(0.6, 0.6 + z * 0.3)))); };
  map.on("zoomend", scalePins);
  refit();
  scalePins();
  for (const c of legend) {
    const b = el("button", "map-chip");
    b.type = "button";
    b.dataset.category = c.id;
    b.setAttribute("aria-pressed", "true");
    const sw = el("span", "map-swatch"); sw.style.background = c.colour;
    b.append(sw, el("span", "map-chip-label", c.label), el("span", "map-chip-count", String(counts[c.id] || 0)));
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) groups[c.id].addTo(map); else map.removeLayer(groups[c.id]);
    });
    legendEl.append(b);
  }
}
