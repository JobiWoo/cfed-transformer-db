// service.js (standalone, robust)
// - Loads ./data/transformers2.json (fallback ./data/transformers.json)
// - Filters to "in service" records
// - Renders table + selection
// - View/Edit opens the existing modal as an iPad-friendly sheet
// - Works with service.html IDs: search, status, grid-body, btn-viewedit, modal...

(function () {
  "use strict";

  // ---------- DOM ----------
  const el = {
    search: document.getElementById("search"),
    status: document.getElementById("status"),
    tbody: document.getElementById("grid-body"),
    btnView: document.getElementById("btn-viewedit"),
    btnPreview: document.getElementById("btn-preview"),
    btnPrint: document.getElementById("btn-print"),
    btnQuit: document.getElementById("btn-quit"),

    modal: document.getElementById("modal"),
    modalBody: document.getElementById("modal-body"),
    modalSubtitle: document.getElementById("modal-subtitle"),
    modalClose: document.getElementById("modal-close"),
    modalBack: document.getElementById("modal-back"),
  };

  function assertEl(name, node) {
    if (!node) throw new Error(`Missing required element: #${name}`);
  }

  // Required hooks
  ["search", "status", "grid-body", "btn-viewedit", "modal", "modal-body", "modal-close", "modal-back"]
    .forEach(id => assertEl(id, document.getElementById(id)));

  // ---------- Helpers ----------
  function norm(v) {
    return (v ?? "").toString().trim();
  }

  function upper(v) {
    return norm(v).toUpperCase();
  }

  function pick(obj, keys, fallback = "") {
    for (const k of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
        const val = obj[k];
        if (val !== null && val !== undefined && String(val).trim() !== "") return val;
      }
    }
    return fallback;
  }

  function feederLabel(v) {
    const n = Number(v);
    if (n === 1203) return "THEISS 3";
    if (n === 1209) return "THEISS 9";
    return norm(v);
  }

  function statusIsInService(status) {
    const s = upper(status);
    // Keep this intentionally broad for field reality:
    // examples: "IN SERVICE", "INSTALLED", "ACTIVE", etc.
    if (s.includes("IN SERVICE")) return true;
    if (s === "SERVICE") return true;
    if (s.includes("INSTALLED")) return true;
    if (s.includes("ACTIVE") && !s.includes("INACTIVE")) return true;
    return false;
  }

  function extractRows(data) {
    // Array
    if (Array.isArray(data)) return data;

    // {rows:[...]}
    if (data && Array.isArray(data.rows)) return data.rows;

    // ArcGIS-style {features:[{attributes:{...}}]}
    if (data && Array.isArray(data.features)) {
      return data.features.map(f => (f && typeof f === "object" && f.attributes) ? f.attributes : f);
    }

    // keyed object {"0":{...},"1":{...}}
    if (data && typeof data === "object") return Object.values(data);

    return [];
  }

  async function fetchJsonWithFallback(paths) {
    let last = "";
    for (const p of paths) {
      const res = await fetch(p, { cache: "no-store" });
      if (res.ok) return { data: await res.json(), used: p };
      last = `${p} (HTTP ${res.status})`;
    }
    throw new Error(`Could not load dataset. Last attempt: ${last}`);
  }

  // ---------- State ----------
  let allRows = [];
  let inServiceRows = [];
  let filteredRows = [];
  let selected = null; // selected record object

  // ---------- Render ----------
  function rowFields(rec) {
    const manufacturer = norm(pick(rec, ["Manufacturer", "MANUFACTURER", "MFR", "Make", "MAKE", "MFG_NAME"]));
    const serial = norm(pick(rec, ["Serial", "SERIAL", "Serial_Number", "SERIAL_NUMBER", "SERIAL_NO"]));
    const status = norm(pick(rec, ["Status", "STATUS", "INV_STATUS", "Inventory_Status"]));
    const feeder = feederLabel(pick(rec, ["Feeder", "FEEDER", "FeederNumberValue", "FEEDER_NO", "FEEDER_ID"]));
    const pole = norm(pick(rec, ["Pole", "POLE", "Pole_Number", "POLE_NO", "POLE#"]));
    return { manufacturer, serial, status, feeder, pole };
  }

  function clearSelection() {
    selected = null;
    el.btnView.disabled = true;
    if (el.btnPreview) el.btnPreview.disabled = true;
    if (el.btnPrint) el.btnPrint.disabled = true;

    // remove highlight
    const trs = el.tbody.querySelectorAll("tr");
    trs.forEach(tr => tr.classList.remove("selected"));
  }

  function renderTable(rows) {
    el.tbody.innerHTML = "";
    clearSelection();

    for (const rec of rows) {
      const f = rowFields(rec);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${f.manufacturer || "—"}</td>
        <td>${f.serial || "—"}</td>
        <td>${f.status || "—"}</td>
        <td>${f.feeder || "—"}</td>
        <td>${f.pole || "—"}</td>
      `;

      tr.addEventListener("click", () => {
        // highlight
        const trs = el.tbody.querySelectorAll("tr");
        trs.forEach(t => t.classList.remove("selected"));
        tr.classList.add("selected");

        selected = rec;
        el.btnView.disabled = false;
        if (el.btnPreview) el.btnPreview.disabled = false;
        if (el.btnPrint) el.btnPrint.disabled = false;

        const sf = rowFields(rec);
        el.status.textContent = `Selected: ${sf.serial || "—"} • ${sf.feeder || "—"} • ${sf.pole || "—"}`;
      });

      el.tbody.appendChild(tr);
    }

    el.status.textContent = `In-service transformers: ${rows.length} (of ${allRows.length} total)`;
  }

  function applySearch() {
    const q = upper(el.search.value);
    if (!q) {
      filteredRows = inServiceRows.slice();
      renderTable(filteredRows);
      return;
    }

    filteredRows = inServiceRows.filter(rec => {
      const f = rowFields(rec);
      const hay = upper(`${f.manufacturer} ${f.serial} ${f.status} ${f.feeder} ${f.pole}`);
      return hay.includes(q);
    });

    renderTable(filteredRows);
  }

  // ---------- Modal ----------
  function openModalWithRecord(rec) {
    if (!rec) return;

    const f = rowFields(rec);
    el.modalSubtitle.textContent = `${f.serial || "—"} • ${f.feeder || "—"} • ${f.pole || "—"}`;

    // Build a clean key/value display (sorted keys)
    const entries = Object.entries(rec)
      .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== "")
      .sort(([a], [b]) => a.localeCompare(b));

    let html = `<div class="form-block">`;
    for (const [k, v] of entries) {
      html += `
        <div class="form-row">
          <div class="form-label">${k}</div>
          <div class="form-value">${String(v)}</div>
        </div>
      `;
    }
    html += `</div>`;

    el.modalBody.innerHTML = html;

    el.modal.classList.remove("hidden");
    el.modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    el.modal.classList.add("hidden");
    el.modal.setAttribute("aria-hidden", "true");
  }

  // Close hooks (top close + bottom back + tap outside)
  el.modalClose.addEventListener("click", closeModal);
  el.modalBack.addEventListener("click", closeModal);
  el.modal.addEventListener("click", (e) => {
    if (e.target === el.modal) closeModal();
  });

  // ---------- Buttons ----------
  el.btnView.addEventListener("click", () => openModalWithRecord(selected));

  if (el.btnPreview) {
    el.btnPreview.addEventListener("click", () => openModalWithRecord(selected));
  }

  if (el.btnPrint) {
    el.btnPrint.addEventListener("click", () => window.print());
  }

  if (el.btnQuit) {
    el.btnQuit.addEventListener("click", () => {
      // “Quit” just returns to main menu (safe for web)
      window.location.href = "./index.html";
    });
  }

  // ---------- Init ----------
  async function init() {
    try {
      el.status.textContent = "Loading…";

      const { data, used } = await fetchJsonWithFallback([
        "./data/transformers2.json",
        "./data/transformers.json"
      ]);

      allRows = extractRows(data);

      // Filter down to in-service
      inServiceRows = allRows.filter(rec => {
        const status = pick(rec, ["Status", "STATUS", "INV_STATUS", "Inventory_Status"], "");
        return statusIsInService(status);
      });

      filteredRows = inServiceRows.slice();

      renderTable(filteredRows);
      el.status.textContent = `Loaded ${inServiceRows.length} in-service records from ${used}`;
    } catch (err) {
      console.error(err);
      el.status.textContent = "Error loading data (see console).";
    }
  }

  // live search
  el.search.addEventListener("input", applySearch);

  init();
})();
