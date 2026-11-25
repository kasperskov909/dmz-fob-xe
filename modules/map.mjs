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

  const map = L.map(viewport, { crs: L.CRS.Simple, minZoom: -2, maxZoom: 2, zoomSnap: 0.25, attributionControl: false });
  L.control.attribution({ prefix: false }).addAttribution(ATTRIBUTION).addTo(map);
  let pinBounds = null, touched = false;
  const refit = () => {
    if (touched) return;
    const b = pinBounds ? pinBounds.pad(0.18) : L.latLngBounds(BOUNDS);
    map._refitting = true;
    map.fitBounds(b.intersects(BOUNDS) ? b : BOUNDS, { animate: false });
    map._refitting = false;
  };
  map.fitBounds(BOUNDS);
  map.on("dragstart zoomstart", (e) => { if (!map._refitting) touched = true; });
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => { map.invalidateSize(); refit(); }).observe(viewport);
  }

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

  pinBounds = L.latLngBounds(markers.map((m) => [2700 * (1 - m.y / 100), 2880 * m.x / 100]));
  const groups = {};
  const colours = {};
  for (const c of legend) { groups[c.id] = L.layerGroup().addTo(map); colours[c.id] = c.colour; }
  for (const m of markers) {
    const g = groups[m.category];
    if (!g) continue;
    const icon = L.divIcon({
      className: "map-pin",
      html: '<span style="background:' + colours[m.category] + '"></span>',
      iconSize: [22, 22]
    });
    const mk = L.marker([2700 * (1 - m.y / 100), 2880 * m.x / 100], { icon, title: m.name + " (" + m.grid + ")", keyboard: false });
    mk.bindPopup(el("div", "map-popup", m.name + " (" + m.grid + ")" + (m.note ? ": " + m.note : "")));
    g.addLayer(mk);
  }
  refit();
  for (const c of legend) {
    const b = el("button", "map-chip");
    b.type = "button";
    b.dataset.category = c.id;
    b.setAttribute("aria-pressed", "true");
    const sw = el("span", "map-swatch"); sw.style.background = c.colour;
    b.append(sw, el("span", "map-chip-label", c.label));
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) groups[c.id].addTo(map); else map.removeLayer(groups[c.id]);
    });
    legendEl.append(b);
  }
}
