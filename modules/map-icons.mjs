// Our own inline SVG icons for the map and legend. 24x24 viewBox, single colour via currentColor.
const NS = "http://www.w3.org/2000/svg";
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor"';

const PATHS = {
  // round bow with a shaft and two teeth
  key: `<circle cx="7.5" cy="7.5" r="4" ${S}/><path ${S} d="M10.6 10.6 20.5 20.5M16.5 16.5l2.8-2.8M19.5 19.5l2-2"/>`,
  // pistol: slide, barrel and grip
  gun: `<path ${F} d="M2.5 6.5h17.2a1.8 1.8 0 0 1 1.8 1.8v3.2h-8.2l-1.1 2.3v5a1 1 0 0 1-1 1H8.1a1 1 0 0 1-1-1.2l1.3-7.1H4.3a1.8 1.8 0 0 1-1.8-1.8z"/>`,
  // tall two-door locker (weapons locker)
  locker: `<rect x="4.5" y="2.5" width="15" height="19" rx="1.5" ${S}/><path ${S} d="M12 2.5v19"/><circle cx="9.5" cy="12" r="1" ${F}/><circle cx="14.5" cy="12" r="1" ${F}/>`,
  // single-door locker (basic weapons locker)
  locker1: `<rect x="6.5" y="2.5" width="11" height="19" rx="1.5" ${S}/><path ${S} d="M9.5 6.5h5M9.5 8.8h5"/><circle cx="14.5" cy="14" r="1.1" ${F}/>`,
  // arrow up onto a landing pad
  exfil: `<path ${F} d="M12 2.5 19.5 10.5h-4.8v6.5H9.3v-6.5H4.5z"/><path ${S} d="M5 21h14"/>`,
  // cube
  printer: `<path ${S} d="M12 2.8l8 4.5v9.4l-8 4.5-8-4.5V7.3zM4 7.3l8 4.5 8-4.5M12 11.8v9.4"/>`,
  // target
  bounty: `<circle cx="12" cy="12" r="9" ${S}/><circle cx="12" cy="12" r="5" ${S}/><circle cx="12" cy="12" r="1.8" ${F}/>`,
  // square safe with a dial
  safe: `<rect x="3.5" y="3.5" width="17" height="16" rx="2" ${S}/><circle cx="11" cy="11.5" r="3.4" ${S}/><path ${S} d="M11 11.5l1.6-1.6M17.2 9v5M7 19.5v2M17 19.5v2"/>`,
  // five point star
  poi: `<path ${F} d="M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.1 1.2-6.5L2.5 9.3l6.6-.9z"/>`,
  // castle tower with battlements and a door
  fort: `<path ${F} fill-rule="evenodd" d="M5.5 21.5V7.5h2.8v-3h2.2v3h3V4.5h2.2v3h2.8v14zM10.2 21.5h3.6v-4.2a1.8 1.8 0 0 0-3.6 0z"/>`,
  // crosshair reticle
  lt: `<circle cx="12" cy="12" r="6.5" ${S}/><path ${S} d="M12 2v6M12 16v6M2 12h6M16 12h6"/><circle cx="12" cy="12" r="1.3" ${F}/>`,
  // quad drone
  uav: `<circle cx="12" cy="12" r="2.2" ${F}/><path ${S} d="M10.4 10.4 6.6 6.6M13.6 10.4l3.8-3.8M10.4 13.6l-3.8 3.8M13.6 13.6l3.8 3.8"/><circle cx="5" cy="5" r="2.6" ${S}/><circle cx="19" cy="5" r="2.6" ${S}/><circle cx="5" cy="19" r="2.6" ${S}/><circle cx="19" cy="19" r="2.6" ${S}/>`,
  // bullet on a base
  ammo: `<path ${F} d="M12 2.4c2.6 2 3.7 4.6 3.7 7.1V16H8.3V9.5c0-2.5 1.1-5.1 3.7-7.1zM7.5 18h9v3.4h-9z"/>`,
  // chest with arched lid and latch
  cache: `<path ${S} d="M3.5 11V10a6 6 0 0 1 6-6h5a6 6 0 0 1 6 6v1M3.5 11h17M3.5 11v9.5h17V11"/><rect x="10.4" y="9.6" width="3.2" height="5" rx="0.8" ${F}/>`
};

/** Build a decorative svg element for an icon name. */
export function icon(name) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("class", "map-ico");
  s.setAttribute("aria-hidden", "true");
  s.setAttribute("focusable", "false");
  s.innerHTML = PATHS[name] || PATHS.poi;
  return s;
}

export const ICON_NAMES = Object.keys(PATHS);
