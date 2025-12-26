// js/pole-locate.js
(() => {
  const DATA_URL = "./data/poles.json";

  const els = {
    statusWrapper: document.getElementById("dataStatusWrapper"),
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
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function fieldVal(v) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return s === "NaN" ? "" : s;
  }

  function renderNotFound(query) {
    els.result.innerHTML = `
      <div class="error-card">
        <div class="error-title">
          <span>⚠️</span> No Match Found
        </div>
        <div class="error-message">
          No pole record matched: <strong>${escHtml(query)}</strong><br/>
          Please check the pole number and try again.
        </div>
      </div>
    `;
  }

  function renderPrompt() {
    els.result.innerHTML = `
      <div class="prompt-card">
        <div class="prompt-icon">🔌</div>
        <div class="prompt-text">Enter a pole number to search</div>
        <div class="prompt-example">Example: <code>O83271</code></div>
      </div>
    `;
  }

  function renderRecord(rec) {
    // Organize fields into logical groups
    const identificationFields = [
      ["Pole_No", rec.Pole_No, true],  // true = highlight
      ["Pole_ID", rec.Pole_ID, false],
      ["Owner", rec.Owner, false],
    ];

    const specificationFields = [
      ["Material", rec.Material, false],
      ["Height", rec.Height, false],
      ["Class", rec.Class, false],
      ["Year_Set", rec.Year_Set, false],
    ];

    const locationFields = [
      ["Address", rec.Address, false],
      ["Street", rec.Street, false],
      ["Location", rec.Location, false],
      ["Sect_No", rec.Sect_No, false],
      ["Blk_No", rec.Blk_No, false],
      ["Sec_Dist", rec.Sec_Dist, false],
    ];

    const otherFields = [
      ["Remarks", rec.Remarks, false],
    ];

    const renderField = ([label, value, highlight]) => {
      const val = fieldVal(value);
      const isEmpty = !val;
      return `
        <div class="kv-item${highlight ? ' highlight' : ''}">
          <div class="kv-label">${escHtml(label)}</div>
          <div class="kv-value${isEmpty ? ' empty' : ''}">${escHtml(val || '—')}</div>
        </div>
      `;
    };

    const renderSection = (title, icon, fields) => {
      // Only render section if at least one field has a value
      const hasValues = fields.some(([, v]) => fieldVal(v));
      if (!hasValues && title !== "Identification") return '';
      
      return `
        <div class="kv-section">
          <div class="kv-section-title">
            <span>${icon}</span> ${title}
          </div>
          <div class="kv-grid">
            ${fields.map(renderField).join('')}
          </div>
        </div>
      `;
    };

    const poleNo = fieldVal(rec.Pole_No);
    const title = poleNo ? `Pole ${poleNo}` : "Pole Record";

    els.result.innerHTML = `
      <div class="result-card">
        <div class="result-header">
          <div class="result-title">
            <span>📍</span> ${escHtml(title)}
          </div>
          <div class="result-subtitle">
            Matched on <code>Pole_No</code> (case-insensitive)
          </div>
        </div>
        <div class="result-body">
          ${renderSection("Identification", "🏷️", identificationFields)}
          ${renderSection("Specifications", "📐", specificationFields)}
          ${renderSection("Location", "📍", locationFields)}
          ${renderSection("Notes", "📝", otherFields)}
        </div>
      </div>
    `;
  }

  function setReady(ready) {
    els.btnSearch.disabled = !ready;
    els.btnClear.disabled = !ready;
  }

  function setStatus(state, message) {
    els.statusWrapper.className = `data-status ${state}`;
    els.status.textContent = message;
  }

  async function loadData() {
    setStatus("loading", "Loading pole data…");
    setReady(false);

    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${DATA_URL}`);
      const rows = await res.json();

      poleIndex = new Map();
      for (const r of rows) {
        const key = normPoleNo(r.Pole_No);
        if (!key) continue;
        poleIndex.set(key, r);
      }

      setStatus("success", `${poleIndex.size.toLocaleString()} poles loaded`);
      setReady(true);
    } catch (err) {
      console.error(err);
      setStatus("error", "Failed to load data");
      els.result.innerHTML = `
        <div class="error-card">
          <div class="error-title">
            <span>❌</span> Data Load Error
          </div>
          <div class="error-message">
            Could not load <strong>${escHtml(DATA_URL)}</strong>.<br/>
            Check that the file exists and the path is correct.
          </div>
        </div>
      `;
    }
  }

  function doSearch() {
    const raw = els.input.value || "";
    const key = normPoleNo(raw);

    if (!key) {
      renderPrompt();
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
