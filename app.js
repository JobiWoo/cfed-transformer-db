const DATA_URL = "./data/transformers.json";

// --- Status defaults / ordering (foreman-friendly) ---
const DEFAULT_STATUS = "IN STOCK";
const STATUS_ORDER = [
  "RECOVERED T.B.T.",
  "SCRAPPED",
  "IN SERVICE",
  "IN STOCK",
  "UNKNOWN",
  "TO BE SCRAPPED",
  "NEW T.B.T.",
  "NEEDS TESTED",
  "ON HOLD",
  "NEEDS PAINTED",
  "TO BE REFURBISHED"
];

// State
let allRows = [];
let filteredRows = [];
let selectedRow = null;
let filtersApplied = false;

// Elements
const elType = document.getElementById("filter-type");
const elKva = document.getElementById("filter-kva");
const elPri = document.getElementById("filter-pri");
const elSec = document.getElementById("filter-sec");
const elStatusFilter = document.getElementById("filter-status");

const btnApply = document.getElementById("btn-apply");
const btnViewEdit = document.getElementById("btn-viewedit");
const btnPreview = document.getElementById("btn-preview");
const btnPrint = document.getElementById("btn-print");
const btnQuit = document.getElementById("btn-quit");
const btnHelp = document.getElementById("btn-help");

const elSearch = document.getElementById("search");
const elStatus = document.getElementById("status");
const tbody = document.getElementById("grid-body");

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalBody = document.getElementById("modal-body");
const modalSubtitle = document.getElementById("modal-subtitle");

// ---------- Helpers ----------
function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function uniqSorted(values) {
  return Array.from(new Set(values.filter(v => safeStr(v) !== "")))
    .sort((a, b) => safeStr(a).localeCompare(safeStr(b)));
}

function normalizeStatus(s) {
  return safeStr(s).toUpperCase();
}

function populateSelect(selectEl, values, allLabel, preferredOrder = null) {
  const present = uniqSorted(values);

  let opts = present;
  if (preferredOrder && Array.isArray(preferredOrder)) {
    const presentSet = new Set(present.map(v => normalizeStatus(v)));
    const ordered = preferredOrder.filter(v => presentSet.has(normalizeStatus(v)));
    const leftovers = present.filter(v => !ordered.includes(v));
    opts = [...ordered, ...leftovers];
  }

  selectEl.innerHTML =
    `<option value="">${allLabel}</option>` +
    opts.map(v => `<option value="${v}">${v}</option>`).join("");
}

function setButtonsState() {
  btnPreview.disabled = !filtersApplied;
  btnPrint.disabled = !filtersApplied;
  btnViewEdit.disabled = !(filtersApplied && selectedRow);
}

// ---------- Filtering ----------
function applyFilters() {
  const typeVal = elType.value;
  const kvaVal = elKva.value;
  const priVal = elPri.value;
  const secVal = elSec.value;
  const statusVal = elStatusFilter.value;

  filteredRows = allRows.filter(r => {
    if (typeVal && safeStr(r.TYPE) !== typeVal) return false;
    if (kvaVal && String(r.KVA) !== kvaVal) return false;
    if (priVal && safeStr(r.PRI_VOLT) !== priVal) return false;
    if (secVal && safeStr(r.SEC_VOLT) !== secVal) return false;
    if (statusVal && safeStr(r.STATUS) !== statusVal) return false;
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
  elStatus.textContent = `Loaded ${allRows.length} • Showing ${rows.length}`;
}

// ---------- Grid ----------
function renderGrid(rows) {
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" style="padding:14px;color:#5b677a;">No records found.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${safeStr(r.MFG)}</td>
      <td>${safeStr(r.SERIAL)}</td>
      <td>${safeStr(r.IMP)}</td>
      <td>${safeStr(r.STATUS)}</td>
      <td>${safeStr(r.LOCATION)}</td>
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

// ---------- Modal ----------
function openModalForRow(row) {
  modalSubtitle.textContent = `Trans_ID: ${row.TRANS_ID || "—"}`;

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

// ---------- Reports ----------
function openReportWindow(doPrint) {
  if (!filtersApplied) return;

  const rows = filteredRows;
  const now = new Date().toLocaleString();

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transformer Inventory Listing</title>
  <style>
    body{ font-family: Cabin, Segoe UI, Arial; margin:18px; }
    h1{ font-size:20px; margin-bottom:6px; }
    .meta{ font-size:12px; color:#666; margin-bottom:12px; }
    table{ width:100%; border-collapse:collapse; }
    th{ background:#0b3a78; color:#fff; padding:8px; font-size:12px; }
    td{ padding:7px 8px; border-bottom:1px solid #ddd; font-size:12px; }
  </style>
</head>
<body>
  <h1>Transformer Inventory Listing</h1>
  <div class="meta">Generated ${now} • Records ${rows.length}</div>
  <table>
    <thead>
      <tr>
        <th>ID</th><th>Type</th><th>KVA</th><th>Status</th><th>Location</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map(r => `
        <tr>
          <td>${r.TRANS_ID}</td>
          <td>${safeStr(r.TYPE)}</td>
          <td>${safeStr(r.KVA)}</td>
          <td>${safeStr(r.STATUS)}</td>
          <td>${safeStr(r.LOCATION)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>
</body>
</html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();

  if (doPrint) setTimeout(() => w.print(), 250);
}

// ---------- Help ----------
function showHelp() {
  alert(
`Transformer Inventory Listing

Default view: ${DEFAULT_STATUS}

• Change filters, then click Search
• Click a row to View/Edit
• Preview / Print generate reports

(Read-only demo)`
  );
}

// ---------- Init ----------
async function init() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  allRows = await res.json();

  populateSelect(elType, allRows.map(r => r.TYPE), "All Types");
  populateSelect(elKva, allRows.map(r => String(r.KVA)), "All KVA");
  populateSelect(elPri, allRows.map(r => r.PRI_VOLT), "All Primary");
  populateSelect(elSec, allRows.map(r => r.SEC_VOLT), "All Secondary");

  populateSelect(
    elStatusFilter,
    allRows.map(r => r.STATUS),
    "All Status",
    STATUS_ORDER
  );

  // Default to IN STOCK
  const exact = Array.from(elStatusFilter.options)
    .map(o => o.value)
    .find(v => normalizeStatus(v) === normalizeStatus(DEFAULT_STATUS));

  if (exact) elStatusFilter.value = exact;

  filtersApplied = false;
  selectedRow = null;
  setButtonsState();

  elType.focus();
  applyFilters();
}

// ---------- Events ----------
btnApply.addEventListener("click", applyFilters);
elType.addEventListener("change", () => filtersApplied = false);
elKva.addEventListener("change", () => filtersApplied = false);
elPri.addEventListener("change", () => filtersApplied = false);
elSec.addEventListener("change", () => filtersApplied = false);
elStatusFilter.addEventListener("change", () => filtersApplied = false);

elSearch.addEventListener("input", applySearchAndRender);
btnViewEdit.addEventListener("click", () => selectedRow && openModalForRow(selectedRow));
btnPreview.addEventListener("click", () => openReportWindow(false));
btnPrint.addEventListener("click", () => openReportWindow(true));
btnQuit.addEventListener("click", () => location.reload());
if (btnHelp) btnHelp.addEventListener("click", showHelp);
modalClose.addEventListener("click", closeModal);

init();
