// iCUE lifecycle hooks. The docs expose no size/orientation API, so app.mjs uses viewport size.
function onInit() { document.documentElement.dataset.icue = "ready"; }
function onData() { /* no widget properties yet */ }
if (typeof icueEvents !== "undefined") {
  icueEvents.onICUEInitialized = onInit;
  icueEvents.onDataUpdated = onData;
  if (typeof iCUE_initialized !== "undefined" && iCUE_initialized) { onInit(); onData(); }
}
