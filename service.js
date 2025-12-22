const DATA_URL = "./data/transformers.json";

/* =========================
   Central helpers / formatting
   ========================= */
function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function normalizeStatus(v) {
  return safeStr(v).toUpperCase();
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

  // heuristic: ms timestamps are large
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
  // prefer FEEDER then Feeder
  return safeStr(row.FEEDER) || safeStr(row.Feeder) || "—";
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
const REQUIRED_STATUS = "IN SERVICE";

let allRows = [];
let baseRows = [];      // all IN SERVICE rows
let filteredRows = [];  // baseRows filtered by dropdowns
let selectedRow = null;
let filtersApplied = false;

/* =========================
   UI State
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
  elStatus.textContent = `In Service records ${rows.length} (of ${allRows.length} total transformers)`;
}

function markFiltersDirty() {
  filtersApplied = false;
  clearSelection();
  setButtonsState();
}

/* =========================
   Modal (read-only record view)
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
   Preview / Print report
   ========================= */
function buildReportHtml(rows, title) {
  const now = new Date().toLocaleString();

  const head = `
    <th>Feeder</th>
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
      <td>${address}</td>
      <td>${dateInstalled || "—"}</td>
      <td>${serial}</td>
    </tr>`;
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
    th{ background:#0b3a78; color:#fff; text-align:left; font-size:12px; padding:8px; position:sticky; top:0; }
    td{ padding:7px 8px; border-bottom:1px solid #e5e7eb; font-size:12px; white-space:nowrap; }
    @media print{ body{ margin:10mm; } th{ position:static; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Status: ${REQUIRED_STATUS} • Generated: ${now} • Records: ${rows.length}</div>
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
  alert(
`Transformers In Service Listing

This page shows ONLY transformers with Status = ${REQUIRED_STATUS}.

Use Type/KVA/Primary/Secondary filters as needed, then click Search.
Preview/Print reflect the current filtered list.`
  );
}

/* =========================
   Init
   ========================= */
async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    // hard filter to IN SERVICE (case/space tolerant)
    baseRows = allRows.filter(r => normalizeStatus(r.STATUS) === REQUIRED_STATUS);

    // Populate dropdowns from baseRows so options reflect in-service dataset
    populateSelect(elType, baseRows.map(r => r.TYPE), "All Types");
    populateSelect(elKva,  baseRows.map(r => r.KVA),  "All KVA");
    populateSelect(elPri,  baseRows.map(r => r.PRI_VOLT), "All Primary");
    populateSelect(elSec,  baseRows.map(r => r.SEC_VOLT), "All Secondary");

    // Access-like: disabled until Search (but we can auto-run once like Inventory)
    filtersApplied = false;
    clearSelection();
    setButtonsState();

    // Auto-apply once so the list loads immediately
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
