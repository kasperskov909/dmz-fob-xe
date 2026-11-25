# iCUE widget conventions (research R1)

Primary source: official docs at https://docs.elgato.com/icue/widgets/ (Widget API 1.9.0). Pages were read via a summarizing fetch tool, so wording is paraphrase. Gap-fill sources are marked (secondary).

## 1. Build tool required?

- No bundler or compiler is required. A widget is plain HTML/CSS/JS files. Source: https://docs.elgato.com/icue/widgets/ ("Option 2 (manual)": make a folder with manifest.json, index.html, resources/icon.svg).
- The CLI `icuewidget-cli` (npm) is recommended, and the getting-started page says it is required for packaging into `.icuewidget`. Install: `npm install -g icuewidget-cli`. Commands: `icuewidget init <Name>`, `icuewidget validate <dir>`, `icuewidget package <dir>`. Source: https://docs.elgato.com/icue/widgets/
- So project.json build=none stays valid for authoring; the CLI is only a validate/package step (needs Node/npm). The npm page returned 403, so CLI flags beyond the three commands are unverified.
- Prerequisites: iCUE 5.47 or later per getting-started (https://docs.elgato.com/icue/widgets/); a Corsair article says 5.44 or later (secondary: https://www.corsair.com/se/en/explorer/diy-builder/accessories/how-to-create-a-custom-widget-for-the-xeneon-edge/). Use 5.47 to be safe.

## 2. Folder structure

Source: https://docs.elgato.com/icue/widgets/specification

```
mywidget/
  index.html          (required)
  manifest.json       (required)
  translation.json    (optional, needed for tr())
  modules/*.mjs       (optional, listed in manifest "modules")
  scripts/widget.js
  styles/style.css
  resources/icon.svg or icon.png  (icon required)
  resources/preview.png (optional, 128x56)
```

- `index.html` must start with uppercase `<!DOCTYPE html>`; iCUE parses the head as strict XML (keep the head well-formed, self-close meta/link). Source: specification page.
- All manifest paths are relative to the manifest file.

## 3. manifest.json fields

Source: https://docs.elgato.com/icue/widgets/specification

Required: `author` (string), `id` (reverse-DNS), `name`, `description`, `version` (semver string), `preview_icon` (path), `min_framework_version` (min Widget API version), `os` (array of `{platform}`; only `windows` supported), `supported_devices` (array of `{type, features?}`), `min_app_version` (e.g. "5.47").

Optional: `interactive` (bool, click handling on touch devices, default false), `required_plugins` (strings `namespace:Name:version`), `modules` (JS module paths), `permissions` (objects).

- `id` rule: only lowercase a-z, 0-9, hyphen, period (https://docs.elgato.com/icue/widgets/).
- Device types: `dashboard_lcd` (XENEON EDGE), `keyboard_lcd` (VANGUARD 96 / PRO 96), `pump_lcd` (iCUE LINK XC7/XD5 ELITE LCD). Feature `sensor-screen` optional.
- The docs table marks `min_app_version` required but the getting-started example omits it; include it.
- Touch widgets: set `"interactive": true`.

## 4. HTML meta tags and settings

Sources: https://docs.elgato.com/icue/widgets/specification and https://docs.elgato.com/icue/widgets/references/controls/

- Required in head: `<title>`, `<link rel="icon" href="resources/icon.svg">` (SVG, PNG or ICO).
- Optional: `<meta name="x-icue-widget-group" content="...">`, `<meta name="x-icue-widget-preview" content="resources/preview.png">` (128x56 px, PNG preferred).
- Settings: `<meta name="x-icue-property" content="varName" data-label="Label" data-type="color" data-default="'#FFFFFF'" />`. `content` is alphanumeric/underscore and becomes a global JS variable. `data-type` is one of slider, switch, textfield, color, combobox, search-combobox, tab-buttons, media-selector, sensors-combobox, sensors-factory, stream-deck-virtual-device. Other data-* attrs (default, min, max, step, values, unit-label) accept JS expressions (https://docs.elgato.com/icue/widgets/references/javascript-expressions), so string defaults need inner quotes.
- Groups: `<script type="application/json" id="x-icue-groups">[{"title":"...","properties":["varName"],"info":"..."}]</script>`. The docs sample has JSON syntax errors; write valid JSON.
- Translations: `tr('Key')` with translation.json (https://docs.elgato.com/icue/widgets/references/translations, not read in detail).

## 5. iCUE JS API

Sources: specification, https://docs.elgato.com/icue/widgets/references/icue-global-object, https://docs.elgato.com/icue/widgets/references/device-object

- Lifecycle: `icueEvents.onICUEInitialized` (once, API and data ready), `icueEvents.onDataUpdated` (any property changed). Globals injected before widget scripts run: one per property, `iCUE`, `iCUE_initialized`, `device`, `window.plugins`. If scripts load late: `if (iCUE_initialized) { onInit(); onData(); }`.
- `iCUE.iCUELanguage` (string), `iCUE.fpsLimit` (number, default 30), `iCUE.isPreview` (true in preview/mimic, false on device), `iCUE.defaultTemperatureUnit()` returns "°C" or "°F".
- `device.deviceId` (UUID string) is the only documented device field.
- Data access: properties as globals; plugins via `required_plugins` (sensors, media, fps, file system, notifications, link, device action, stream deck: https://docs.elgato.com/icue/widgets/references/plugins/). Plugin events `plugin<Module>Events.onInitialized`, flag `plugin<Module>_initialized`.
- Persistence: `localStorage` keyed by global `uniqueId`, about 5-10 MB (https://docs.elgato.com/icue/widgets/references/local-storage).
- Theming: on XENEON EDGE only, a property group containing `textColor`, `accentColor` or `backgroundColor` gets a "Custom Style" toggle; when off, device default colors replace custom values (specification page). No general theme API found.

## 6. Sizes and orientation

- NOT FOUND in the official docs: the specification, iCUE global object and device object pages say nothing about widget sizes, 2560x720 / 720x2560, or any size/orientation change event. Could not verify how resize or rotation is signaled. No resize callback is documented; treat it as unknown, design with CSS (media queries, `resize` event, viewport units), and verify on hardware or iCUE preview.
- Secondary: Corsair says XENEON EDGE slots run from Small 840x344 to Extra Large 2536x696 (horizontal); it advises responsive layouts and "Don't just scale everything up" (https://www.corsair.com/se/en/explorer/diy-builder/accessories/how-to-create-a-custom-widget-for-the-xeneon-edge/). A Corsair SimHub guide gives vertical equivalents such as 696x840 and 696x2536 for that widget (search summary only, page not opened: https://www.corsair.com/explorer/gamer/monitors/how-to-use-xeneon-edge-as-a-dashboard-for-sim-racing/).
- 2560x720 is a full-panel figure not confirmed by any fetched source (XL slot 2536x696 suggests padding inside a 2560x720 panel; inference). Plan: layout must be fluid from about 696 to 2560 px on both axes.

## 7. Web platform limits

Source: https://docs.elgato.com/icue/widgets/references/permissions

- Network: `fetch`, WebSocket and any request to a host need a manifest `permissions` entry `{"type":"url","domain":"api.example.com"}` (optional `port`; subdomains covered; `"any"` = all non-localhost; localhost requires a port). Schemes http/https/ws/wss. `data:` and `blob:` URLs are always blocked. Denied requests fail silently; show a fallback. Undeclared access triggers a runtime Allow/Deny dialog; users can revoke any time.
- Self-signed TLS: `{"type":"self_signed_certificate","host":"localhost"}`.
- Local files: `{"type":"file","path":"<Documents>/x/config.json"}` and `folder`; macros `<Documents>`, `<AppData>`, `<Temp>`.
- Other: microphone, camera, speaker, screen, clipboard_read_write, local_fonts_access, download, application (Stream Deck).
- Iframes, CSP, CORS: the docs do not mention them; could not verify. Assume iframes and cross-origin fetches may be restricted and prefer declared url permissions.
- Local images/video: MediaViewer helper copied from `<iCUE install dir>/widgets/common/` (https://docs.elgato.com/icue/widgets/references/common-tools).

## 8. Packaging and install

Source: https://docs.elgato.com/icue/widgets/ and (secondary) the Corsair article above.

- `icuewidget package MyWidget` validates then writes `MyWidget.icuewidget`.
- Install: iCUE Widgets panel, click "+", select the `.icuewidget` file (or double-click it); the widget appears for supported devices. Test on real hardware.

## 9. Scaffold checklist (files the scaffold must contain)

- [ ] `<widget>/manifest.json` with all required fields (section 3), `interactive` if touch
- [ ] `<widget>/index.html` starting `<!DOCTYPE html>`, with title, icon link, optional preview meta, x-icue-property metas, valid x-icue-groups JSON
- [ ] `<widget>/resources/icon.svg` (or png) and `resources/preview.png` (128x56)
- [ ] `<widget>/scripts/widget.js` and `<widget>/styles/style.css` (fluid layout, no fixed 2560x720)
- [ ] `icueEvents.onICUEInitialized` and `onDataUpdated` handlers plus `iCUE_initialized` late-load guard
- [ ] Permissions declared for every fetch host
- [ ] Optional `translation.json` if `tr()` is used
- [ ] A local preview harness (plain HTML page stubbing `iCUE`, `icueEvents`, property globals), since no official preview tool was found

## 10. Minimal valid manifest (our own words)

```json
{
  "author": "Example Author",
  "id": "com.example.fob-widget",
  "name": "Fob Widget",
  "description": "Demo dashboard widget",
  "version": "1.0.0",
  "preview_icon": "resources/icon.svg",
  "min_framework_version": "1.0.0",
  "min_app_version": "5.47",
  "os": [{ "platform": "windows" }],
  "supported_devices": [{ "type": "dashboard_lcd" }],
  "interactive": false
}
```

`min_framework_version` value format is a guess; docs say only "minimum Widget API version". Confirm with `icuewidget init` output.

## 11. Commands for T4 and T9

- Preview locally (no official tool found): `npx serve <widget-dir>` or `python -m http.server 8080 --directory <widget-dir>` with a stub script defining `iCUE`, `icueEvents`, `iCUE_initialized`, `device`; resize the browser to 2560x720 and 720x2560. Corsair warns browser preview can differ from the device.
- Install CLI: `npm install -g icuewidget-cli`
- Scaffold reference: `icuewidget init Reference` (inspect generated manifest, discard)
- Validate: `icuewidget validate <widget-dir>`
- Package: `icuewidget package <widget-dir>` produces `<name>.icuewidget`
- Install: iCUE Widgets, "+", pick file.

## Sources

- https://docs.elgato.com/icue/widgets/
- https://docs.elgato.com/icue/widgets/specification
- https://docs.elgato.com/icue/widgets/references/icue-global-object
- https://docs.elgato.com/icue/widgets/references/device-object
- https://docs.elgato.com/icue/widgets/references/permissions
- https://docs.elgato.com/icue/widgets/references/controls/
- https://docs.elgato.com/icue/widgets/references/javascript-expressions
- https://docs.elgato.com/icue/widgets/references/local-storage
- https://docs.elgato.com/icue/widgets/references/common-tools
- https://www.corsair.com/se/en/explorer/diy-builder/accessories/how-to-create-a-custom-widget-for-the-xeneon-edge/
- https://www.corsair.com/explorer/gamer/monitors/how-to-use-xeneon-edge-as-a-dashboard-for-sim-racing/
