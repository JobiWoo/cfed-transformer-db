const DATA_URL = "./data/transformers.json";

/* =========================
   CENTRALIZED FIELD RULES
   ========================= */
function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function toNumberOrNaN(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}
function fmtFixed(v, decimals) {
  const n = toNumberOrNaN(v);
  if (Number.isNaN(n)) return safeStr(v);
  return n.toFixed(decimals);
}
function normalizeUpper(v) {
  return safeStr(v).toUpperCase();
}

const FIELD_RULES = {
  MFG:      { label: "Manufacturer", format: (v) => safeStr(v) },
  SERIAL:   { label: "Serial Number", format: (v) => safeStr(v) },
  IMP:      { label: "Imp", format: (v) => fmtFixed(v, 2) },
  LOCATION: { label: "Location", format: (v) => safeStr(v) },
  STATUS:   { label: "Status", format: (v) => safeStr(v) },
  REMARKS:  { label: "Remarks", format: (v) => safeStr(v) },

  TRANS_ID: { label: "Trans_ID", format: (v) => safeStr(v) },
  KVA:      { label: "KVA", format: (v) => safeStr(v) },
  TYPE:     { label: "Type", format: (v) => safeStr(v) },
  PRI_VOLT: { label: "Primary", format: (v) => safeStr(v) },
  SEC_VOLT: { label: "Secondary", format: (v) => safeStr(v) },
};

function formatField(key, value) {
  const rule = FIELD_RULES[key];
  return rule ? rule.format(value) : safeStr(value);
}

/* =========================
   STATUS BADGE HELPERS
   ========================= */
function statusClass(status) {
  const s = normalizeUpper(status);

  if (s === "IN STOCK") return "status-green";
  if (s === "IN SERVICE") return "status-blue";
  if (s === "ON HOLD") return "status-amber";
  if (s === "NEEDS TESTED") return "status-orange";
  if (s === "SCRAPPED") return "status-red";

  if (s === "NEEDS PAINTED") return "status-orange";
  if (s === "RECOVERED T.B.T." || s === "NEW T.B.T.") return "status-green";

  return "status-gray";
}

function renderStatusBadge(status) {
  const text = formatField("STATUS", status) || "—";
  const cls = statusClass(text);
  return `<span class="status-pill ${cls}">${text}</span>`;
}

/* =========================
   INVENTORY PAGE BEHAVIOR
   ========================= */
const INVENTORY_STATUSES = [
  "IN STOCK",
  "NEW T.B.T.",
  "RECOVERED T.B.T.",
  "NEEDS TESTED",
  "ON HOLD",
  "NEEDS PAINTED"
].map(normalizeUpper);

let allRows = [];
let filteredRows = [];
let selectedRow = null;
let filtersApplied = false;

// Elements
const elType = document.getElementById("filter-type");
const elKva  = document.getElementById("filter-kva");
const elPri  = document.getElementById("filter-pri");
const elSec  = document.getElementById("filter-sec");

const btnApply    = document.getElementById("btn-apply");
const btnViewEdit = document.getElementById("btn-viewedit");
const btnPreview  = document.getElementById("btn-preview");
const btnPrint    = document.getElementById("btn-print");
const btnQuit     = document.getElementById("btn-quit");
const btnHelp     = document.getElementById("btn-help");

const elSearch = document.getElementById("search");
const elStatus = document.getElementById("status");
const tbody    = document.getElementById("grid-body");

const modal        = document.getElementById("modal");
const modalClose   = document.getElementById("modal-close");
const modalBody    = document.getElementById("modal-body");
const modalSubtitle= document.getElementById("modal-subtitle");

/* =========================
   UI HELPERS
   ========================= */
function uniqSorted(values) {
  return Array.from(new Set(values.map(safeStr).filter(v => v !== "")))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
function populateSelect(selectEl, values, allLabel) {
  const opts = uniqSorted(values);
  selectEl.innerHTML =
    `<option value="">${allLabel}</option>` +
    opts.map(v => `<option value="${v}">${v}</option>`).join("");
}
function setButtonsState() {
  btnPreview.disabled = !filtersApplied;
  btnPrint.disabled = !filtersApplied;
  btnViewEdit.disabled = !(filtersApplied && selectedRow);
}
function isInventoryRow(row) {
  return INVENTORY_STATUSES.includes(normalizeUpper(row.STATUS));
}

/* =========================
   FILTERING
   ========================= */
function applyFilters() {
  const typeVal = elType.value;
  const kvaVal  = elKva.value;
  const priVal  = elPri.value;
  const secVal  = elSec.value;

  const inv = allRows.filter(isInventoryRow);

  filteredRows = inv.filter(r => {
    if (typeVal && safeStr(r.TYPE) !== typeVal) return false;
    if (kvaVal  && safeStr(r.KVA) !== kvaVal) return false;
    if (priVal  && safeStr(r.PRI_VOLT) !== priVal) return false;
    if (secVal  && safeStr(r.SEC_VOLT) !== secVal) return false;
    return true;
  });

  filtersApplied = true;
  selectedRow = null;
  setButtonsState();
  applySearchAndRender();
}

function applySearchAndRender() {
  const q = safeStr(elSearch.value).toLowerCase();

  const rows = (!q)
    ? filteredRows
    : filteredRows.filter(r =>
        Object.values(r).map(safeStr).join(" ").toLowerCase().includes(q)
      );

  renderGrid(rows);
  elStatus.textContent = `Inventory records ${rows.length} (of ${allRows.length} total transformers)`;
}

/* =========================
   GRID
   ========================= */
function renderGrid(rows) {
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" style="padding:14px;color:#5b677a;">No inventory records found.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatField("MFG", r.MFG)}</td>
      <td>${formatField("SERIAL", r.SERIAL)}</td>
      <td>${formatField("IMP", r.IMP)}</td>
      <td>${renderStatusBadge(r.STATUS)}</td>
      <td>${formatField("LOCATION", r.LOCATION)}</td>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
      tr.classList.add("selected");
      selectedRow = r;
      setButtonsState();
    });

    tbody.appendChild(tr);
  });
}

/* =========================
   MODAL
   ========================= */
function openModalForRow(row) {
  modalSubtitle.textContent =
    `Trans_ID: ${formatField("TRANS_ID", row.TRANS_ID) || "—"} • Status: ${formatField("STATUS", row.STATUS) || "—"}`;

  modalBody.innerHTML = `
    <div class="kv">
      ${Object.keys(row).map(k => {
        const val = formatField(k, row[k]);
        return `
          <div class="field">
            <div class="label">${FIELD_RULES[k]?.label || k}</div>
            <div class="value">${val || "—"}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
  modal.classList.remove("hidden");
}
function closeModal() {
  modal.classList.add("hidden");
}

/* =========================
   REPORT (PREVIEW/PRINT)
   ========================= */
const REPORT_KEYS = ["MFG", "SERIAL", "IMP", "LOCATION", "STATUS", "REMARKS"];

function getCriteriaObject() {
  return {
    Type: elType.value || "Any",
    KVA: elKva.value || "Any",
    Primary: elPri.value || "Any",
    Secondary: elSec.value || "Any",
    Statuses: "Inventory (Available)"
  };
}

function buildReportHtml(rows, title) {
  const now = new Date().toLocaleString();
  const criteria = getCriteriaObject();

  const head = REPORT_KEYS.map(k => `<th>${FIELD_RULES[k]?.label || k}</th>`).join("");
  const body = rows.map(r => {
    const tds = REPORT_KEYS.map(k => {
      if (k === "STATUS") return `<td>${renderStatusBadge(r.STATUS)}</td>`;
      return `<td>${formatField(k, r[k])}</td>`;
    }).join("");
    return `<tr>${tds}</tr>`;
  }).join("");

  const criteriaRows = Object.entries(criteria).map(([k,v]) => `
    <div class="crit-row"><div class="crit-k">${k}</div><div class="crit-v">${v}</div></div>
  `).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    :root{
      --blue:#0b3a78;
      --blue2:#0a2f60;
      --line:#d8e0ea;
      --muted:#6b7280;
      --bg:#f5f7fb;
    }
    body{ font-family: Cabin, Segoe UI, Arial, sans-serif; margin:18px; color:#111827; background:#fff; }
    .report-header{
      border:1px solid var(--line);
      border-radius:14px;
      overflow:hidden;
      margin-bottom:14px;
    }
    .report-topbar{
      background:linear-gradient(180deg, var(--blue) 0%, var(--blue2) 100%);
      color:#fff;
      padding:12px 14px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
    }
    .brand{
      font-weight:900;
      letter-spacing:.2px;
      font-size:14px;
      opacity:.95;
    }
    .dept{
      font-size:12px;
      opacity:.9;
      margin-top:2px;
    }
    .report-title{
      background:#fff;
      padding:12px 14px 10px;
      border-top:1px solid rgba(255,255,255,.18);
    }
    h1{ margin:0; font-size:20px; font-weight:900; color:#0b1220; }
    .meta{ margin-top:6px; color:var(--muted); font-size:12px; display:flex; gap:14px; flex-wrap:wrap; }
    .pill{
      display:inline-flex; align-items:center; justify-content:center;
      padding:6px 10px; border-radius:999px;
      font-weight:900; font-size:12px;
      border:1px solid var(--line);
      background:var(--bg);
      color:#111827;
    }

    .criteria-card{
      margin:12px 14px 14px;
      border:1px solid #d6e4ff;
      background:#f3f7ff;
      border-radius:12px;
      padding:10px 12px;
    }
    .criteria-title{
      font-weight:900;
      color:#0a2f60;
      margin-bottom:8px;
      font-size:13px;
    }
    .crit-grid{
      display:grid;
      grid-template-columns: repeat(2, minmax(240px, 1fr));
      gap:6px 12px;
    }
    .crit-row{ display:flex; gap:10px; align-items:baseline; }
    .crit-k{ width:96px; font-weight:900; color:#0a2f60; font-size:12px; }
    .crit-v{ font-size:12px; color:#111827; }

    table{ width:100%; border-collapse:collapse; }
    th{
      background:var(--blue);
      color:#fff;
      text-align:left;
      font-size:12px;
      padding:8px;
      position:sticky;
      top:0;
    }
    td{
      padding:7px 8px;
      border-bottom:1px solid #e5e7eb;
      font-size:12px;
      vertical-align:top;
      white-space:nowrap;
    }
    td:last-child{
      white-space:normal;
      max-width:520px;
      word-wrap:break-word;
    }

    /* Status pills (match site) */
    .status-pill{
      display:inline-flex; align-items:center; justify-content:center;
      padding:6px 10px; border-radius:999px;
      font-weight:900; font-size:12px; letter-spacing:.02em;
      border:1px solid #d8e0ea; background:#f7f9fc; color:#1f2937;
    }
    .status-green{ background:#e8f7ee; border-color:#bfe7cd; color:#0f5132; }
    .status-blue{  background:#e8f1ff; border-color:#c9dcff; color:#0b3a78; }
    .status-amber{ background:#fff4d6; border-color:#ffe1a6; color:#7a4a00; }
    .status-orange{background:#ffedd5; border-color:#ffd6a1; color:#7a2f00; }
    .status-red{   background:#fde8e8; border-color:#f5bebe; color:#7a1111; }
    .status-gray{  background:#f1f5f9; border-color:#d5dde7; color:#334155; }

    @media print{
      body{ margin:10mm; }
      th{ position:static; }
      .report-header{ break-inside:avoid; }
    }
  </style>
</head>
<body>

  <div class="report-header">
    <div class="report-topbar">
      <div>
        <div class="brand">City of Cuyahoga Falls</div>
        <div class="dept">Electric Department • Transformer Inventory</div>
      </div>
      <div class="pill">Inventory Listing</div>
    </div>

    <div class="report-title">
      <h1>${title}</h1>
      <div class="meta">
        <div><strong>Generated:</strong> ${now}</div>
        <div><strong>Records:</strong> ${rows.length}</div>
      </div>
    </div>

    <div class="criteria-card">
      <div class="criteria-title">Selection Criteria</div>
      <div class="crit-grid">
        ${criteriaRows}
      </div>
    </div>
  </div>

  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>

</body>
</html>`;
}

function openReportWindow(doPrint) {
  if (!filtersApplied) return;

  const q = safeStr(elSearch.value).toLowerCase();
  const rows = (!q)
    ? filteredRows
    : filteredRows.filter(r =>
        Object.values(r).map(safeStr).join(" ").toLowerCase().includes(q)
      );

  const html = buildReportHtml(rows, "Transformer Inventory Listing");

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Please allow popups for Preview/Print.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();

  if (doPrint) setTimeout(() => w.print(), 250);
}

/* =========================
   HELP
   ========================= */
function showHelp() {
  alert(
`Transformer Inventory Listing (Inventory Only)

Preview/Print now use a branded header + a structured criteria card.`
  );
}

/* =========================
   INIT + EVENTS
   ========================= */
async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    const inv = allRows.filter(isInventoryRow);

    populateSelect(elType, inv.map(r => r.TYPE), "All Types");
    populateSelect(elKva,  inv.map(r => r.KVA),  "All KVA");
    populateSelect(elPri,  inv.map(r => r.PRI_VOLT), "All Primary");
    populateSelect(elSec,  inv.map(r => r.SEC_VOLT), "All Secondary");

    filtersApplied = false;
    selectedRow = null;
    setButtonsState();

    elType.focus();
    applyFilters();

  } catch (err) {
    elStatus.textContent = `Failed to load data: ${err.message}`;
  }
}

btnApply.addEventListener("click", applyFilters);

function markFiltersDirty() {
  filtersApplied = false;
  selectedRow = null;
  setButtonsState();
  document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
}

elType.addEventListener("change", markFiltersDirty);
elKva.addEventListener("change", markFiltersDirty);
elPri.addEventListener("change", markFiltersDirty);
elSec.addEventListener("change", markFiltersDirty);

elSearch.addEventListener("input", applySearchAndRender);

btnViewEdit.addEventListener("click", () => {
  if (selectedRow) openModalForRow(selectedRow);
});

btnPreview.addEventListener("click", () => openReportWindow(false));
btnPrintbtnPrint && btnPrint.addEventListener("click", () => openReportWindow(true));

btnQuit.addEventListener("click", () => {
  window.location.href = "./index.html";
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

if (btnHelp) btnHelp.addEventListener("click", showHelp);

init();
