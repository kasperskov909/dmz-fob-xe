/** Mount the guides feature into panelEl (empty-state placeholder). */
export function init(panelEl) {
  panelEl.textContent = "";
  const wrap = document.createElement("div");
  wrap.className = "guides-empty";
  wrap.innerHTML =
    '<svg class="guides-empty__icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">' +
    '<circle cx="32" cy="32" r="18"/><circle cx="32" cy="32" r="3" fill="currentColor" stroke="none"/>' +
    '<path d="M32 4v14M32 46v14M4 32h14M46 32h14"/></svg>' +
    '<h2 class="guides-empty__title">Guides coming soon</h2>' +
    '<p class="guides-empty__text">Field guides and loadout notes will land here.</p>';
  panelEl.appendChild(wrap);
  panelEl.dataset.ready = "true";
}
