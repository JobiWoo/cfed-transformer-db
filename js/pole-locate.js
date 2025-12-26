// js/pole-locate.js
(() => {
  const DATA_URL = "./data/poles.json";

  const els = {
    status: document.getElementById("dataStatus"),
    input: document.getElementById("poleInput"),
    btnSearch: document.getElementById("btnSearch"),
    btnClear: document.getElementById("btnClear"),
    result: document.getElementById("resultArea"),
  };

  let poleIndex = new Map(); // key: normalized Pole_No, value: record

  function normPoleNo(v) {
    return String(v ?? "")
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      "\"": "&quot;", "'": "&#39;"
    }[c]));
  }

  function fieldVal(v) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s === "NaN" ? "" : s;
  }

  function renderNotFound(query) {
    els.result.innerHTML = `
      <div class="kv" style="border-color:#f1c0c0;background:#fff7f7;">
        <div class="k error">No match found</div>
        <div class="v">No pole record matched: <b>${escHtml(query)}</b></div>
      </div>
    `;
  }

  function renderRecord(rec) {
    // You can reorder or hide fields here if you want
    const fields = [
      ["Pole_No", rec.Pole_No],
      ["Pole_ID", rec.Pole_ID],
      ["Owner", rec.Owner],
      ["Material", rec.Material],
      ["Height", rec.Height],
      ["Class", rec.Class],
      ["Address", rec.Address],
      ["Street", rec.Street],
      ["Location", rec.Location],
      ["Sect_No", rec.Sect_No],
      ["Blk_No", rec.Blk_No],
      ["Sec_Dist", rec.Sec_Dist],
      ["Year_Set", rec.Year_Set],
      ["Remarks", rec.Remarks],
    ];

    const title = fieldVal(rec.Pole_No) ? `Pole ${fieldVal(rec.Pole_No)}` : "Pole Record";

    els.result.innerHTML = `
      <div class="card" style="margin-top:12px;">
        <div class="card-hd">
          <div>
            <div class="result-title">${escHtml(title)}</div>
            <div class="result-sub">Matched on <span class="muted">Pole_No</span> (case-insensitive)</div>
          </div>
        </div>
        <div class="card-bd">
          <div class="kv-grid">
            ${fields.map(([k, v]) => `
              <div class="kv">
                <div class="k">${escHtml(k)}</div>
                <div class="v">${escHtml(fieldVal(v) || "—")}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function setReady(ready) {
    els.btnSearch.disabled = !ready;
    els.btnClear.disabled = !ready;
  }

  async function loadData() {
    els.status.textContent = "Loading pole data…";
    setReady(false);

    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${DATA_URL}`);
      const rows = await res.json();

      poleIndex = new Map();
      for (const r of rows) {
        const key = normPoleNo(r.Pole_No);
        if (!key) continue;
        // If duplicates ever exist, you could store an array here instead.
        poleIndex.set(key, r);
      }

      els.status.textContent = `Loaded ${poleIndex.size.toLocaleString()} poles`;
      setReady(true);
    } catch (err) {
      console.error(err);
      els.status.innerHTML = `<span class="error">Failed to load poles.json</span>`;
      els.result.innerHTML = `
        <div class="kv" style="border-color:#f1c0c0;background:#fff7f7;">
          <div class="k error">Data load error</div>
          <div class="v">
            Could not load <b>${escHtml(DATA_URL)}</b>.<br/>
            Check that the file exists in your repo and the path is correct.
          </div>
        </div>
      `;
    }
  }

  function doSearch() {
    const raw = els.input.value || "";
    const key = normPoleNo(raw);

    if (!key) {
      els.result.innerHTML = `
        <div class="kv" style="border-color:#e4e8f0;background:#fafbfe;">
          <div class="k">Enter a pole number</div>
          <div class="v">Example: <b>O83271</b></div>
        </div>
      `;
      return;
    }

    const rec = poleIndex.get(key);
    if (!rec) return renderNotFound(raw);
    renderRecord(rec);
  }

  function clearAll() {
    els.input.value = "";
    els.result.innerHTML = "";
    els.input.focus();
  }

  // Events
  els.btnSearch.addEventListener("click", doSearch);
  els.btnClear.addEventListener("click", clearAll);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });

  // Boot
  loadData();
})();
