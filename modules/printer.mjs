/** Mount the printer feature into panelEl. */
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export async function init(panelEl) {
  panelEl.classList.add("printer");
  const root = el("div", "pr-root");
  panelEl.appendChild(root);
  let data;
  try {
    const res = await fetch("data/printer-items.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
    if (!data || !Array.isArray(data.items)) throw new Error("bad data");
  } catch (err) {
    const box = el("div", "pr-error", "Could not load printer data.");
    box.setAttribute("role", "alert");
    root.appendChild(box);
    panelEl.dataset.ready = "error";
    return;
  }
  const items = data.items;
  const sources = new Map((data.sources || []).map((s) => [s.id, s]));
  const search = el("input", "pr-search");
  search.type = "search";
  search.placeholder = "Search name or location";
  search.setAttribute("aria-label", "Search printer items");
  const chips = el("div", "pr-chips");
  chips.setAttribute("role", "group");
  chips.setAttribute("aria-label", "Category filter");
  const count = el("div", "pr-count");
  const list = el("ul", "pr-list");
  root.append(search, chips, count, list);

  let category = "";
  const cats = [""].concat(Array.from(new Set(items.map((i) => i.category))));
  for (const c of cats) {
    const b = el("button", "pr-chip", c || "All");
    b.type = "button";
    b.dataset.category = c;
    b.setAttribute("aria-pressed", c === "" ? "true" : "false");
    b.addEventListener("click", () => {
      category = c;
      for (const x of chips.children) x.setAttribute("aria-pressed", x === b ? "true" : "false");
      render();
    });
    chips.appendChild(b);
  }

  function card(it) {
    const li = el("li", "pr-item");
    li.dataset.id = it.id;
    li.dataset.confidence = it.confidence || "";
    const head = el("div", "pr-head");
    head.appendChild(el("span", "pr-name", it.name));
    if (it.confidence === "low") {
      const m = el("span", "pr-low", "Low confidence");
      m.title = "Low confidence: weak or generic sources";
      head.appendChild(m);
    }
    li.appendChild(head);
    li.appendChild(el("div", "pr-meta", [it.category, it.rarity].filter(Boolean).join(" / ")));
    const locs = el("ul", "pr-locs");
    for (const l of it.locations || []) {
      locs.appendChild(el("li", "pr-loc", l.detail ? l.area + ": " + l.detail : l.area));
    }
    li.appendChild(locs);
    if (it.used_in && it.used_in.length) li.appendChild(el("div", "pr-used", "Used in: " + it.used_in.join(", ")));
    const src = el("div", "pr-sources");
    for (const id of it.source_ids || []) {
      const s = sources.get(id);
      if (!s) continue;
      const a = el("a", "pr-source", id);
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = s.title;
      src.appendChild(a);
    }
    li.appendChild(src);
    return li;
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const shown = items.filter((it) => {
      if (category && it.category !== category) return false;
      if (!q) return true;
      if (it.name.toLowerCase().includes(q)) return true;
      return (it.locations || []).some((l) => ((l.area || "") + " " + (l.detail || "")).toLowerCase().includes(q));
    });
    list.replaceChildren(...shown.map(card));
    count.textContent = shown.length + " of " + items.length + " items";
    if (!shown.length) list.appendChild(el("li", "pr-empty", "No matching items."));
  }
  search.addEventListener("input", render);
  render();
  panelEl.dataset.ready = "true";
}
