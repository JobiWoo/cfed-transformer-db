const DATA_URL = "./data/transformers.json";

/* =========================
   Helpers / formatting
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
function fmtEpochMs(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = toNumberOrNaN(v);
  if (Number.isNaN(n)) return safeStr(v);
  if (n > 300000000000) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return safeStr(v);
}
function uniqSorted(values) {
  return Array.from(new Set(values.map(safeStr).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
function populateSelect(selectEl, values, allLabel) {
  const opts = uniqSorted(values);
  selectEl.innerHTML =
    `<option value="">${allLabel}</option>` +
    opts.map(v => `<option value="${v}">${v}</option>`).join("");
}
function computeAddress(row) {
  const hse = safeStr(row.HSE_NUM);
  const street = safeStr(row.STREET);
  const both = [hse, street].filter(Boolean).join(" ");
  return both || "—";
}
function computeFeeder(row) {
  return safeStr(row.FEEDER) || safeStr(row.Feeder) || "—";
}

/* =========================
   Robust status normalization
   ========================= */
function normalizeStatus(v) {
  return safeStr(v)
    .toUpperCase()
    .replace(/[-_]/g, " ")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================
   Status badge helpers
   ========================= */
function statusClass(status) {
  const s = normalizeStatus(status);
  if (s === "IN SERVICE") return "status-blue";
  return "status-gray";
}
function renderStatusBadge(status) {
  const text = safeStr(status) || "—";
  const cls = statusClass(text);
  return `<span class="status-pill ${cls}">${text}</span>`;
}

/* =========================
   Elements
   ========================= */
const elType = document.getElementById("filter-type");
const elKva  = document.getElementById("filter-kva");
const elPri  = document.getElementById("filter-pri");
const elSec  = document.getElementById("filter-sec");

const btnApply   = document.getElementById("btn-apply");
const btnViewEdit= document.getElementById("btn-viewedit");
const btnPreview = document.getElementById("btn-preview");
const btnPrint   = document.getElementById("btn-print");
const btnQuit    = document.getElementById("btn-quit");
const btnHelp    = document.getElementById("btn-help");

const elSearch = document.getElementById("search");
const elStatus = document.getElementById("status");
const tbody    = document.getElementById("grid-body");

const modal        = document.getElementById("modal");
const modalClose   = document.getElementById("modal-close");
const modalBody    = document.getElementById("modal-body");
const modalSubtitle= document.getElementById("modal-subtitle");

/* =========================
   State
   ========================= */
const REQUIRED_STATUS_NORM = "IN SERVICE";

let allRows = [];
let baseRows = [];
let filteredRows = [];
let selectedRow = null;
let filtersApplied = false;

/* =========================
   UI state
   ========================= */
function setButtonsState() {
  btnPreview.disabled = !filtersApplied;
  btnPrint.disabled = !filtersApplied;
  btnViewEdit.disabled = !(filtersApplied && selectedRow);
}
function clearSelection() {
  selectedRow = null;
  btnViewEdit.disabled = true;
  document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
}

/* =========================
   Grid
   ========================= */
function renderGrid(rows) {
  tbody.innerHTML = "";
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:14px;color:#5b677a;">No records found.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    const feeder = computeFeeder(r);
    const address = computeAddress(r);
    const dateInstalled = fmtEpochMs(r.DATE_INSTALLED);
    const serial = safeStr(r.SERIAL);

    tr.innerHTML = `
      <td title="${feeder}">${feeder}</td>
      <td title="${address}">${address}</td>
      <td title="${dateInstalled}">${dateInstalled || "—"}</td>
      <td title="${serial}">${serial}</td>
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
   Filtering
   ========================= */
function applyFilters() {
  const typeVal = elType.value;
  const kvaVal  = elKva.value;
  const priVal  = elPri.value;
  const secVal  = elSec.value;

  filteredRows = baseRows.filter(r => {
    if (typeVal && safeStr(r.TYPE) !== typeVal) return false;
    if (kvaVal  && safeStr(r.KVA) !== kvaVal) return false;
    if (priVal  && safeStr(r.PRI_VOLT) !== priVal) return false;
    if (secVal  && safeStr(r.SEC_VOLT) !== secVal) return false;
    return true;
  });

  filtersApplied = true;
  clearSelection();
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
  elStatus.textContent = `In Service records ${rows.length} (base: ${baseRows.length} • total: ${allRows.length})`;
}

function markFiltersDirty() {
  filtersApplied = false;
  clearSelection();
  setButtonsState();
}

/* =========================
   Modal
   ========================= */
function openModalForRow(row) {
  if (!row) return;

  modalSubtitle.textContent =
    `Trans_ID: ${safeStr(row.TRANS_ID) || "—"} • Serial: ${safeStr(row.SERIAL) || "—"} • Status: ${safeStr(row.STATUS) || "—"}`;

  modalBody.innerHTML = `
    <div class="kv">
      ${Object.keys(row).map(k => `
        <div class="field">
          <div class="label">${k}</div>
          <div class="value">${safeStr(row[k]) || "—"}</div>
        </div>
      `).join("")}
    </div>
  `;
  modal.classList.remove("hidden");
}
function closeModal() {
  modal.classList.add("hidden");
}

/* =========================
   Branded report header (Option B)
   ========================= */
function getCriteriaObject() {
  return {
    Type: elType.value || "Any",
    KVA: elKva.value || "Any",
    Primary: elPri.value || "Any",
    Secondary: elSec.value || "Any",
    Status: "IN SERVICE"
  };
}

function buildReportHtml(rows, title) {
  const now = new Date().toLocaleString();
  const criteria = getCriteriaObject();

  const head = `
    <th>Feeder</th>
    <th>Status</th>
    <th>Address</th>
    <th>Date Installed</th>
    <th>Serial</th>
  `;

  const body = rows.map(r => {
    const feeder = computeFeeder(r);
    const address = computeAddress(r);
    const dateInstalled = fmtEpochMs(r.DATE_INSTALLED);
    const serial = safeStr(r.SERIAL);
    return `<tr>
      <td>${feeder}</td>
      <td>${renderStatusBadge(r.STATUS)}</td>
      <td>${address}</td>
      <td>${dateInstalled || "—"}</td>
      <td>${serial}</td>
    </tr>`;
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
    .brand{ font-weight:900; letter-spacing:.2px; font-size:14px; opacity:.95; }
    .dept{ font-size:12px; opacity:.9; margin-top:2px; }
    .report-title{
      background:#fff;
      padding:12px 14px 10px;
      border-top:1px solid rgba(255,255,255,.18);
    }
    h1{ margin:0; font-size:20px; font-weight:900; color:#0b1220; }
    .meta{ margin-top:6px; color:var(--muted); font-size:12px; display:flex; gap:14px; flex-wrap:wrap; }

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
      white-space:nowrap;
    }

    .status-pill{
      display:inline-flex; align-items:center; justify-content:center;
      padding:6px 10px; border-radius:999px;
      font-weight:900; font-size:12px; letter-spacing:.02em;
      border:1px solid #d8e0ea; background:#f7f9fc; color:#1f2937;
    }
    .status-blue{  background:#e8f1ff; border-color:#c9dcff; color:#0b3a78; }
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
      ${renderStatusBadge("IN SERVICE")}
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

  const html = buildReportHtml(rows, "Transformers In Service Listing");
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
   Help
   ========================= */
function showHelp() {
  alert(`In Service reports now use a branded header + criteria card.`);
}

/* =========================
   Init
   ========================= */
async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    baseRows = allRows.filter(r => normalizeStatus(r.STATUS) === REQUIRED_STATUS_NORM);

    populateSelect(elType, baseRows.map(r => r.TYPE), "All Types");
    populateSelect(elKva,  baseRows.map(r => r.KVA),  "All KVA");
    populateSelect(elPri,  baseRows.map(r => r.PRI_VOLT), "All Primary");
    populateSelect(elSec,  baseRows.map(r => r.SEC_VOLT), "All Secondary");

    filtersApplied = false;
    clearSelection();
    setButtonsState();

    applyFilters();

  } catch (err) {
    elStatus.textContent = `Failed to load data: ${err.message}`;
  }
}

/* =========================
   Events
   ========================= */
btnApply.addEventListener("click", applyFilters);

elType.addEventListener("change", markFiltersDirty);
elKva.addEventListener("change", markFiltersDirty);
elPri.addEventListener("change", markFiltersDirty);
elSec.addEventListener("change", markFiltersDirty);

elSearch.addEventListener("input", applySearchAndRender);

btnViewEdit.addEventListener("click", () => {
  if (selectedRow) openModalForRow(selectedRow);
});

btnPreview.addEventListener("click", () => openReportWindow(false));
btnPrint.addEventListener("click", () => openReportWindow(true));

btnQuit.addEventListener("click", () => {
  window.location.href = "./index.html";
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

if (btnHelp) btnHelp.addEventListener("click", showHelp);

init();
