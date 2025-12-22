const DATA_URL = "./data/transformers.json";

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

const btnApply = document.getElementById("btn-apply");
const btnViewEdit = document.getElementById("btn-viewedit");
const btnPreview = document.getElementById("btn-preview");
const btnPrint = document.getElementById("btn-print");
const btnQuit = document.getElementById("btn-quit");

const elSearch = document.getElementById("search");
const elStatus = document.getElementById("status");
const tbody = document.getElementById("grid-body");

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalBody = document.getElementById("modal-body");
const modalSubtitle = document.getElementById("modal-subtitle");

// ---------- Helpers (field name flexibility) ----------
function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function getField(row, candidates) {
  for (const key of candidates) {
    if (row && Object.prototype.hasOwnProperty.call(row, key)) {
      const val = safeStr(row[key]);
      if (val !== "") return val;
    }
  }
  // If candidate keys not found, try case-insensitive match
  const keys = Object.keys(row || {});
  for (const cand of candidates) {
    const found = keys.find(k => k.toLowerCase() === cand.toLowerCase());
    if (found) {
      const val = safeStr(row[found]);
      if (val !== "") return val;
    }
  }
  return "";
}

function uniqSorted(values) {
  return Array.from(new Set(values.filter(v => safeStr(v) !== "")))
    .sort((a, b) => safeStr(a).localeCompare(safeStr(b), undefined, { numeric: true }));
}

function populateSelect(selectEl, values, allLabel) {
  const opts = uniqSorted(values);
  selectEl.innerHTML =
    `<option value="">${allLabel}</option>` +
    opts.map(v => `<option value="${String(v)}">${String(v)}</option>`).join("");
}

function setButtonsState() {
  // Mimic Access behavior: Preview/Print enabled once filters applied.
  btnPreview.disabled = !filtersApplied;
  btnPrint.disabled = !filtersApplied;

  // View/Edit enabled only when filters applied AND a row is selected
  btnViewEdit.disabled = !(filtersApplied && selectedRow);
}

// ---------- Filtering logic ----------
function applyFilters() {
  const typeVal = elType.value;
  const kvaVal = elKva.value;
  const priVal = elPri.value;
  const secVal = elSec.value;

  // Base filter (like ApplyFilter in Access)
  filteredRows = allRows.filter(r => {
    const TYPE = getField(r, ["TYPE", "TRANSFORMER_TYPE", "TYPE_NAME", "TYPE_DESC", "TYPE_ID"]);
    const KVA = getField(r, ["KVA", "KVA_RATING", "KVA_SIZE", "KVA_ID"]);
    const PRI = getField(r, ["PRI_VOLT", "PRI_VOLTAGE", "PRIMARY_VOLT", "PRI_ID"]);
    const SEC = getField(r, ["SEC_VOLT", "SEC_VOLTAGE", "SECONDARY_VOLT", "SEC_ID"]);

    if (typeVal && TYPE !== typeVal) return false;
    if (kvaVal && KVA !== kvaVal) return false;
    if (priVal && PRI !== priVal) return false;
    if (secVal && SEC !== secVal) return false;
    return true;
  });

  // After applying filters, we enable report actions, but selection resets
  filtersApplied = true;
  selectedRow = null;
  setButtonsState();

  // Apply search within the current filtered set
  applySearchAndRender();
}

function applySearchAndRender() {
  const q = safeStr(elSearch.value).toLowerCase();

  const rows = (!q)
    ? filteredRows
    : filteredRows.filter(r => {
        const hay = Object.values(r).map(safeStr).join(" ").toLowerCase();
        return hay.includes(q);
      });

  renderGrid(rows);
  elStatus.textContent = `Loaded ${allRows.length} • Showing ${rows.length}`;
}

function renderGrid(rows) {
  tbody.innerHTML = "";
  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" style="color:#5b677a;padding:14px;">No records found.</td>`;
    tbody.appendChild(tr);
    return;
  }

  rows.forEach((r) => {
    const mfg = getField(r, ["MFG", "MANUFACTURER", "MFG_NAME"]);
    const serial = getField(r, ["SERIAL", "SERIAL_NO", "SERIAL_NUMBER"]);
    const imp = getField(r, ["IMP", "IMPEDANCE", "Z_PERCENT"]);
    const status = getField(r, ["STATUS", "STATUS_NAME"]);
    const location = getField(r, ["LOCATION", "LOCATION_NAME", "LOC_DESC"]);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td title="${mfg}">${mfg}</td>
      <td title="${serial}">${serial}</td>
      <td title="${imp}">${imp}</td>
      <td title="${status}">${status}</td>
      <td title="${location}">${location}</td>
    `;

    tr.addEventListener("click", () => {
      // remove old selection highlight
      document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
      tr.classList.add("selected");

      // select this record
      selectedRow = r;
      setButtonsState();
    });

    tbody.appendChild(tr);
  });
}

// ---------- View/Edit modal ----------
function openModalForRow(row) {
  if (!row) return;

  const transId = getField(row, ["TRANS_ID", "Trans_ID", "TRANSFORMER_ID", "ID"]);
  const pole = getField(row, ["POLE_NO", "POLE", "SUPPORT_STRUCTURE_ID"]);
  modalSubtitle.textContent = `Trans_ID: ${transId || "—"} • Pole: ${pole || "—"}`;

  const keys = Object.keys(row);
  modalBody.innerHTML = `
    <div class="kv">
      ${keys.map(k => `
        <div class="field">
          <div class="label">${k}</div>
          <div class="value">${safeStr(row[k]) || "—"}</div>
        </div>
      `).join("")}
    </div>
  `;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

// ---------- Report Preview / Print ----------
function buildReportHtml(rows, title) {
  // Access-report-like listing (simple + printable)
  const now = new Date().toLocaleString();

  // Show more columns in report if present
  const colsPreferred = [
    ["TRANS_ID", ["TRANS_ID", "Trans_ID", "ID"]],
    ["TYPE", ["TYPE", "TRANSFORMER_TYPE", "TYPE_ID"]],
    ["KVA", ["KVA", "KVA_ID"]],
    ["PRI_VOLT", ["PRI_VOLT", "PRI_ID"]],
    ["SEC_VOLT", ["SEC_VOLT", "SEC_ID"]],
    ["FEEDER", ["FEEDER", "FEEDER_ID"]],
    ["STATUS", ["STATUS", "STATUS_ID"]],
    ["LOCATION", ["LOCATION", "LOCATION_ID"]],
    ["MFG", ["MFG", "MANUFACTURER", "MFG_ID"]],
    ["SERIAL", ["SERIAL", "SERIAL_NO"]],
    ["IMP", ["IMP", "IMPEDANCE"]],
    ["STREET", ["STREET", "STREET_ID"]],
    ["POLE_NO", ["POLE_NO", "POLE"]],
  ];

  // Keep only columns that actually exist in at least one row
  const cols = colsPreferred.filter(([label, cands]) =>
    rows.some(r => safeStr(getField(r, cands)) !== "")
  );

  const head = cols.map(([label]) => `<th>${label}</th>`).join("");
  const body = rows.map(r => {
    const tds = cols.map(([, cands]) => `<td>${safeStr(getField(r, cands))}</td>`).join("");
    return `<tr>${tds}</tr>`;
  }).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body{ font-family: Segoe UI, Tahoma, Arial, sans-serif; margin:18px; color:#111827; }
    h1{ margin:0 0 6px 0; font-size:20px; }
    .meta{ color:#6b7280; font-size:12px; margin-bottom:12px; }
    table{ width:100%; border-collapse:collapse; }
    th{ background:#0b2f8a; color:#fff; text-align:left; font-size:12px; padding:8px; position:sticky; top:0; }
    td{ border-bottom:1px solid #e5e7eb; padding:7px 8px; font-size:12px; white-space:nowrap; }
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

  // Use current search-filtered view, not just base filteredRows
  const q = safeStr(elSearch.value).toLowerCase();
  const rows = (!q)
    ? filteredRows
    : filteredRows.filter(r => Object.values(r).map(safeStr).join(" ").toLowerCase().includes(q));

  const html = buildReportHtml(rows, "Transformer Inventory Listing");

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Please allow popups for Preview/Print.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();

  if (doPrint) {
    w.focus();
    // give browser a moment to render
    setTimeout(() => w.print(), 250);
  }
}

// ---------- Access-like enable/disable cues ----------
function markFiltersDirty() {
  // Mimic Access: when user changes a filter control, disable report actions until Search is clicked.
  filtersApplied = false;
  selectedRow = null;
  setButtonsState();

  // Also clear row selection highlight
  document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
}

// ---------- Init ----------
async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    // Populate dropdowns from decoded fields (best-effort)
    populateSelect(elType, allRows.map(r => getField(r, ["TYPE", "TRANSFORMER_TYPE", "TYPE_ID"])), "(All Types)");
    populateSelect(elKva, allRows.map(r => getField(r, ["KVA", "KVA_ID"])), "(All KVA)");
    populateSelect(elPri, allRows.map(r => getField(r, ["PRI_VOLT", "PRI_VOLTAGE", "PRI_ID"])), "(All Primary)");
    populateSelect(elSec, allRows.map(r => getField(r, ["SEC_VOLT", "SEC_VOLTAGE", "SEC_ID"])), "(All Secondary)");

    // Base state: nothing applied yet, so buttons disabled
    filteredRows = allRows.slice();
    filtersApplied = false;
    selectedRow = null;
    setButtonsState();

    renderGrid(filteredRows);
    elStatus.textContent = `Loaded ${allRows.length} • Showing ${filteredRows.length}`;

    // Focus first filter like Access Form_Open
    elType.focus();

  } catch (err) {
    elStatus.textContent = `Failed to load data: ${err.message}`;
  }
}

// ---------- Events ----------
btnApply.addEventListener("click", applyFilters);

elType.addEventListener("change", markFiltersDirty);
elKva.addEventListener("change", markFiltersDirty);
elPri.addEventListener("change", markFiltersDirty);
elSec.addEventListener("change", markFiltersDirty);

elSearch.addEventListener("input", () => {
  // Search within current filteredRows; does not invalidate applied filters
  applySearchAndRender();
});

btnViewEdit.addEventListener("click", () => {
  if (!filtersApplied || !selectedRow) return;
  openModalForRow(selectedRow);
});

btnPreview.addEventListener("click", () => openReportWindow(false));
btnPrint.addEventListener("click", () => openReportWindow(true));

btnQuit.addEventListener("click", () => {
  // For now, mimic closing form by reloading
  // (Later we can route to a home screen)
  if (confirm("Quit this form?")) window.location.reload();
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

init();
