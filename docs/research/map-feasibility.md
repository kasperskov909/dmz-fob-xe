# MW4 DMZ map: feasibility study for the MAP tab (task R2)

Probed on 2026-11-25 (UTC), from Denmark (Cloudflare edge CPH), with curl and a desktop User-Agent.
Source page: https://codcentral.net/blog/mw4-dmz-map/ (the user's link adds the fragment
`#map-key-gun-store-weapons-locker-2`).

This doc lists only URLs, response headers, structure and category names. No text or art from
the site has been copied into this repo.

## 1. Observed response headers

`curl -I https://codcentral.net/blog/mw4-dmz-map/` returned HTTP/1.1 200 (Cloudflare in front of a
Hostinger/LiteSpeed origin):

| Header | Value |
|---|---|
| X-Frame-Options | `DENY` |
| Content-Security-Policy | `upgrade-insecure-requests` (it has no `frame-ancestors` directive, but X-Frame-Options DENY blocks framing on its own) |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| Access-Control-Allow-Origin | absent, even when the request is sent with `Origin: https://example.com` |
| Cache-Control | `public, max-age=0, must-revalidate` |
| Server | `cloudflare` (also `platform: hostinger`, `x-turbo-charged-by: LiteSpeed`) |

Map image assets (`/assets/library/mw4/dmz/map/*.webp`):

| Header | Value |
|---|---|
| Status | 200, `Content-Type: image/webp` |
| Cache-Control | `public, max-age=31536000, immutable` |
| X-Frame-Options | `DENY` (this has no effect on `<img>` loads) |
| Access-Control-Allow-Origin | absent |
| Hotlink protection | none seen. The image returns 200 with a foreign Referer (`https://example.com/`), with `Origin: null` (what a file:// page sends), and with no User-Agent |

What this means:

- An iframe embed is blocked. Chromium-based hosts refuse to render the page in a frame because of
  X-Frame-Options DENY.
- A cross-origin `fetch()` of the page HTML is blocked. The response has no ACAO header, so a
  browser-like host cannot read the body.
- A plain `<img src>` / Leaflet `imageOverlay` of the map images works. Displaying a cross-origin
  image needs no CORS. Reading its pixels into a canvas would need CORS, and we do not need that.
- `robots.txt` contains `User-agent: * / Allow: /`.

## 2. Map implementation and data sources

- Library: none. The site does not use Leaflet, MapLibre, OpenLayers or Mapbox. The map is a
  custom vanilla JS pan/zoom built with Astro:
  `https://codcentral.net/_astro/dmz-map.astro_astro_type_script_index_0_lang.B-C3nzYy.js` (about 15.5 KB).
  It moves a "stage" div with CSS `translate()` and swaps the image for a higher resolution one as
  the zoom level rises.
- Tiles: none. There is no `{z}/{x}/{y}` template. Each map is a single image in up to three resolutions:
  - Hajin (main map, ratio 2880/2700 = 1.066667, grid columns A-J and rows 1-9):
    - `https://codcentral.net/assets/library/mw4/dmz/map/hajin-map-1440.webp` (338,324 bytes)
    - `https://codcentral.net/assets/library/mw4/dmz/map/hajin-map-2880.webp` (1,189,156 bytes)
    - `https://codcentral.net/assets/library/mw4/dmz/map/hajin-map-5760.webp` (2,679,632 bytes)
  - X01 (interior, 2 floors, ratio 1.111111, grid A-J and 0-8):
    - `https://codcentral.net/assets/library/mw4/dmz/map/x01-floor-1-v4.webp` and `...-v4-hi.webp`
    - `https://codcentral.net/assets/library/mw4/dmz/map/x01-floor-2-v4.webp` and `...-v4-hi.webp`
- Markers: there is no JSON endpoint. All 486 pins are server-rendered into the page HTML as
  `<button class="dmzm-pin">` elements. Each pin carries `data-slug`, `data-layer`, `data-name`,
  `data-grid`, a description, and `style="left:<pct>%;top:<pct>%"`, a position given as a
  percentage of the image size.
  Probes for `/api/` and `index.json` returned 404 and 301.
  Pins per layer: key 78, ammo 40, safe 36, poi 29, exfil 28, bwlocker 28, chem 27, wlocker 25,
  gas 24, spawn 23, hcache 20, uav 14, sam 14, conn 13, drop 11, lt 10, clinic 9, fort 8, hunt 7,
  fire 6, compound 6, bounty 6, drone 6, police 5, bank 5, hidden 3, encoder 2, x01 1, stash 1, printer 1.
- Deep links: the script reads `#map-<slug>` and focuses that pin. The user's fragment
  `#map-key-gun-store-weapons-locker-2` is pin slug `key-gun-store-weapons-locker-2` in layer
  `key`, at grid I6 (north Songdo Wharf). Its sibling `key-gun-store-weapons-locker-1` is at E4
  (west Cheongun Village). "Gun Store" is therefore not a legend layer of its own. It shows up as
  key pins plus the `wlocker` (Weapons Lockers) layer.
- Legend categories on the site (layer id, label, colour). Hajin map:
  poi Major POIs #FFD000; fort Strongholds #FF5A36; compound Compounds #C9B48A; bank Banks #4FB37E;
  police Police Stations #4B7BE5; clinic Clinics #3DBE7A; fire Fire Stations #E8642C; x01 X01 #FFD000;
  exfil Exfils #39C7E6; spawn Spawns #5FD37A; lt Lieutenants #E0473F; hunt Hunt Towers #B07CFF;
  uav UAV Towers #3FA9F5; sam SAM Sites #F2994A; bounty Bounty Stations #D6C34A; ammo Ammo Caches #9AA5B1;
  gas Gas Stations #7FB2A0; safe Safes #F2B544; chem Chemical Storage #DDA60A; wlocker Weapons Lockers #2E6B3C;
  bwlocker Basic Weapons Lockers #C9935E; hcache Hidden Caches #A06A5E; drop Lost Supply Drops #FF8A1F;
  drone Crashed Drones #7FD1E8; key Keys #e8c15a.
  X01 map: Areas, Floor connectors, Exfils, Spawn, Bounty Stations, Ammo Caches, 3D Printer,
  Keycard Encoder Stations, Hidden stash, Keys, Locked doors, Hidden Rooms.

## 3. Terms and copyright

- The footer reads "(c) CODCentral.net. All rights reserved." It also carries a trademark notice
  that Call of Duty and Modern Warfare are Activision trademarks and that the site is not
  affiliated with Activision.
- The footer links only to About, Contact and Privacy. `/terms/`, `/terms-of-service/`,
  `/terms-of-use/`, `/legal/` and `/disclaimer/` all return 404. There is no published licence
  for the map art or the pin data, so no reuse permission is granted.
- Conclusion: do not vendor their images, pin coordinates or descriptions into the repo. Showing
  their image by remote reference, with visible credit and a link back, is the least invasive
  use. If the owner objects, the offline fallback below removes the dependency entirely. Asking
  the site through `/contact/` for explicit permission is advisable before any public release.

## 4. Widget host constraints (iCUE)

From https://docs.elgato.com/icue/widgets/references/permissions:

- Network access must be declared in `manifest.json` `permissions`, e.g.
  `{ "type": "url", "domain": "codcentral.net", "port": 443 }`.
- `data:` and `blob:` URL schemes are always blocked, so inline SVG and local files must be used
  for icons, never data URIs.
- A denied permission fails silently, so the widget must detect the failure (image `error` event,
  plus a timeout) and fall back.
- The docs do not say anything about iframes or CSP (could not verify). This is moot because the
  target page itself forbids framing.

## 5. Options compared

| Option | Works in host? | Offline? | Copyright risk | Verdict |
|---|---|---|---|---|
| (a) iframe embed | No. X-Frame-Options DENY | No | Low | Rejected |
| (b) Remote data via Leaflet | Image only. No tiles, no marker JSON; fetching the page HTML is blocked by missing CORS (and scraping it would be copying) | No | Medium for the image (remote reference with credit) | Partially usable: the base image only |
| (c) Open-in-browser link | Yes, if the host can open external URLs (could not verify an iCUE API for this; a plain `<a target="_blank">` may be ignored) | No | None | Keep as a secondary action |
| (d) Self-authored marker set | Yes | Yes | None if we author names and positions ourselves from grid refs (game facts) | Required for markers |

## 6. Recommendation

Primary approach, a hybrid of (b) and (d):

- Use Leaflet 1.9.4, vendored (npm `latest` is 1.9.4; 2.0 is only alpha/beta).
- Show the remote Hajin image as a single `L.imageOverlay` on `L.CRS.Simple`.
- Put a self-authored local marker set on top of it, with an "Open full map" deep link to codcentral.

Specification for T5:

1. Library: vendor `leaflet.js`, `leaflet.css` and `LICENSE` (BSD-2-Clause) from
   `https://unpkg.com/leaflet@1.9.4/dist/` into `vendor/leaflet/`. Do not load them from a CDN at
   runtime, so the widget still works offline. Use only `L.divIcon` markers with inline SVG or CSS,
   because Leaflet's default PNG marker icons are not needed and `data:` URIs are blocked.
2. Map setup: `L.map(el, { crs: L.CRS.Simple, minZoom: -2, maxZoom: 2, zoomSnap: 0.25, attributionControl: true })`
   with bounds `[[0,0],[2700,2880]]` (height x width of the 2880 image, ratio 1.066667).
   Base image URLs:
   - normal: `https://codcentral.net/assets/library/mw4/dmz/map/hajin-map-2880.webp`
   - optional: swap to `hajin-map-5760.webp` at the highest zoom level, and use `hajin-map-1440.webp` for the first paint.
3. Manifest: add a `url` permission for domain `codcentral.net`, port 443. Follow the R1 manifest
   conventions for the exact schema.
4. Markers: `data/map-markers.json`, authored by us. Schema per entry:
   `{ "id", "category", "name", "grid", "x", "y", "note"? }`.
   - `x` and `y` are percentages (0 to 100) of the image width and height, so the same data drives
     both the remote image and the fallback.
   - Seed entries at the centre of their grid cell. Hajin is a 10x9 grid, A-J left to right and
     1-9 top to bottom, so cell centre x = (colIndex + 0.5) * 10 and y = (row - 0.5) * 100 / 9.
   - Names and notes must be written in our own words. Do not scrape coordinates or descriptions
     from the site.
   - Minimum seed: two Gun Store entries at E4 (west Cheongun Village) and I6 (north Songdo Wharf).
     These grid refs are facts observed on the source and are not copied text.
5. Legend (widget categories, ids, colours, icon shapes as inline SVG):

   | id | Label | Colour | Icon |
   |---|---|---|---|
   | gunstore | Gun Store | #4AA3FF | shop/bag square |
   | wlocker | Weapons Locker | #2E6B3C (draw a light outline for contrast) | locker rectangle |
   | bwlocker | Basic Weapons Locker | #C9935E | small locker |
   | key | Key / Locked loot | #E8C15A | key |
   | exfil | Exfil | #39C7E6 | upward chevron |
   | printer | 3D Printer | #D9DEE4 | cube |
   | bounty | Bounty Station | #D6C34A | target |
   | safe | Safe | #F2B544 | square with dial |
   | poi | Major POI | #FFD000 | diamond |
   | fort | Stronghold | #FF5A36 | shield |
   | lt | Lieutenant | #E0473F | skull/star |
   | uav | UAV Tower | #3FA9F5 | antenna |
   | ammo | Ammo Cache | #9AA5B1 | crate |
   | hcache | Hidden Cache | #A06A5E | dashed box |

   - Legend chips are touch toggles of at least 44 px each, with no hover-only UI.
   - In portrait the legend sits at the bottom. In landscape it is a side column or overlay.
6. Attribution: put a visible line in the Leaflet attribution control and a matching credit in the README.
   - Map attribution text:
     `Map image: CODCentral.net (codcentral.net/blog/mw4-dmz-map) | Markers: FOB widget authors | Call of Duty is a trademark of Activision`
   - Leaflet's own attribution stays on.
7. "Open full map" button: link to `https://codcentral.net/blog/mw4-dmz-map/` (append
   `#map-<slug>` only for slugs we verified, e.g. `#map-key-gun-store-weapons-locker-2`).

## 7. Fallback (offline or blocked)

- Trigger: the image `error` event, or no `load` event within 8 s. This also covers a denied
  `url` permission, because iCUE fails silently.
- Swap the overlay to a local `assets/map/hajin-grid.svg` that we draw ourselves:
  - dark tactical background
  - 10x9 grid with column labels A-J and row labels 1-9, using the same bounds `[[0,0],[2700,2880]]`
- Keep all local markers and the legend working on top of the grid, because their positions are
  in percentages.
- Show a small banner: "Offline map: grid view. Open full map when online", which links to the
  same URL as in step 7 of the recommendation.
- The fallback uses no remote asset at all.

## Sources

- https://codcentral.net/blog/mw4-dmz-map/ (headers via curl -I; HTML structure inspected locally, nothing copied)
- https://codcentral.net/_astro/dmz-map.astro_astro_type_script_index_0_lang.B-C3nzYy.js (custom pan/zoom, no map library)
- https://codcentral.net/assets/library/mw4/dmz/map/hajin-map-1440.webp (and -2880, -5760: headers, hotlink probes)
- https://codcentral.net/robots.txt
- https://codcentral.net/about/ (fan site, not affiliated with Activision)
- https://docs.elgato.com/icue/widgets/references/permissions (url permission, data:/blob: blocked, silent failure)
- https://registry.npmjs.org/leaflet (dist-tags: latest 1.9.4)
- https://unpkg.com/leaflet@1.9.4/dist/leaflet.js (200, ACAO *)
