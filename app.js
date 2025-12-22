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
    .sort((a, b) => safeStr(a).localeCompare(safeStr(b), undefined, { numeric: true }));
}

function normalizeStatus(s) {
  return safeStr(s).toUpperCase();
}

function populateSelect(selectEl, values, allLabel, preferredOrder = null) {
  const present = uniqSorted(values);

  let opts = present;
  if (preferredOrder && Array.isArray(preferredOrder)) {
    const presentSet = new Set(present.map(v => normalizeStatus(v)));
    const preferredUpper = preferredOrder.map(v => normalizeStatus(v));

    const ordered = preferredOrder.filter(v => presentSet.has(normalizeStatus(v)));
    const leftovers = present.filter(v => !preferredUpper.includes(normalizeStatus(v)));

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
    if (kvaVal && safeStr(r.KVA) !== kvaVal) return false;          // KVA can be numeric or string; safeStr handles both
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

// ---------- Grid (on-screen list) ----------
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
  modalSubtitle.textContent = `Trans_ID: ${safeStr(row.TRANS_ID) || "—"}`;

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

// ---------- Report (Preview / Print) ----------
// We will show ONLY these columns, in this order:
const REPORT_COLUMNS = [
  { key: "MFG",     label: "Manufacturer" },
  { key: "SERIAL",  label: "Serial Number" },
  { key: "IMP",     label: "Imp" },
  { key: "LOCATION",label: "Location" },
  { key: "STATUS",  label: "Status" },
  { key: "REMARKS", label: "Remarks" }
];

function buildReportHtml(rows, title) {
  const now = new Date().toLocaleString();

  const head = REPORT_COLUMNS.map(c => `<th>${c.label}</th>`).join("");

  const body = rows.map(r => {
    const tds = REPORT_COLUMNS.map(c => `<td>${safeStr(r[c.key])}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body{ font-family: Cabin, Segoe UI, Arial, sans-serif; margin:18px; color:#111827; }
    h1{ font-size:20px; margin:0 0 6px 0; font-weight:900; }
    .meta{ font-size:12px; color:#6b7280; margin-bottom:12px; }
    table{ width:100%; border-collapse:collapse; }
    th{
      background:#0b3a78; color:#fff; text-align:left;
      font-size:12px; padding:8px; position:sticky; top:0;
    }
    td{
      padding:7px 8px;
      border-bottom:1px solid #e5e7eb;
      font-size:12px;
      vertical-align:top;
    }
    /* Make Remarks readable */
    td:last-child{
      white-space:normal;
      max-width:520px;
      word-wrap:break-word;
    }
    @media print{
      body{ margin:10mm; }
      th{ position:static; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Generated: ${now} • Records: ${rows.length}</div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}

function openReportWindow(doPrint) {
  if (!filtersApplied) return;

  // Use current filtered rows + current search text
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

// ---------- Help ----------
function showHelp() {
  alert(
`Transformer Inventory Listing

Default view: ${DEFAULT_STATUS}

• Change filters, then click Search
• Click a row to View/Edit
• Preview / Print generate a report of the current filtered list

Report columns:
Manufacturer, Serial Number, Imp, Location, Status, Remarks

(Read-only demo)`
  );
}

// ---------- Init ----------
async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    // Populate dropdowns
    populateSelect(elType, allRows.map(r => safeStr(r.TYPE)), "All Types");
    populateSelect(elKva, allRows.map(r => safeStr(r.KVA)), "All KVA");
    populateSelect(elPri, allRows.map(r => safeStr(r.PRI_VOLT)), "All Primary");
    populateSelect(elSec, allRows.map(r => safeStr(r.SEC_VOLT)), "All Secondary");

    populateSelect(
      elStatusFilter,
      allRows.map(r => safeStr(r.STATUS)),
      "All Status",
      STATUS_ORDER
    );

    // Default to IN STOCK if present
    const optionValues = Array.from(elStatusFilter.options).map(o => o.value);
    const exact = optionValues.find(v => normalizeStatus(v) === normalizeStatus(DEFAULT_STATUS));
    if (exact) elStatusFilter.value = exact;

    // Initial state like Access
    filtersApplied = false;
    selectedRow = null;
    setButtonsState();

    // Focus first filter + auto-apply default
    elType.focus();
    applyFilters();

  } catch (err) {
    elStatus.textContent = `Failed to load data: ${err.message}`;
  }
}

// ---------- Events ----------
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
elStatusFilter.addEventListener("change", markFiltersDirty);

elSearch.addEventListener("input", applySearchAndRender);

btnViewEdit.addEventListener("click", () => {
  if (selectedRow) openModalForRow(selectedRow);
});

btnPreview.addEventListener("click", () => openReportWindow(false));
btnPrint.addEventListener("click", () => openReportWindow(true));

btnQuit.addEventListener("click", () => location.reload());

if (btnHelp) btnHelp.addEventListener("click", showHelp);
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

init();
