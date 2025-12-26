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
   Status helpers
   ========================= */
function normalizeStatus(v) {
  return safeStr(v)
    .toUpperCase()
    .replace(/[-_]/g, " ")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function statusClass(status) {
  return normalizeStatus(status) === "IN SERVICE"
    ? "status-blue"
    : "status-gray";
}
function renderStatusBadge(status) {
  const text = safeStr(status) || "—";
  return `<span class="status-pill ${statusClass(text)}">${text}</span>`;
}

/* =========================
   Elements
   ========================= */
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

const modal         = document.getElementById("modal");
const modalClose    = document.getElementById("modal-close");
const modalBack     = document.getElementById("modal-back"); // ✅ new
const modalBody     = document.getElementById("modal-body");
const modalSubtitle = document.getElementById("modal-subtitle");

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
  btnPreview.disabled  = !filtersApplied;
  btnPrint.disabled    = !filtersApplied;
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
    tbody.innerHTML =
      `<tr><td colspan="4" style="padding:14px;color:#5b677a;">No records found.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${computeFeeder(r)}</td>
      <td>${computeAddress(r)}</td>
      <td>${fmtEpochMs(r.DATE_INSTALLED) || "—"}</td>
      <td>${safeStr(r.SERIAL)}</td>
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
  filteredRows = baseRows.filter(r => {
    if (elType.value && safeStr(r.TYPE) !== elType.value) return false;
    if (elKva.value  && safeStr(r.KVA) !== elKva.value) return false;
    if (elPri.value  && safeStr(r.PRI_VOLT) !== elPri.value) return false;
    if (elSec.value  && safeStr(r.SEC_VOLT) !== elSec.value) return false;
    return true;
  });

  filtersApplied = true;
  clearSelection();
  setButtonsState();
  applySearchAndRender();
}

function applySearchAndRender() {
  const q = safeStr(elSearch.value).toLowerCase();
  const rows = !q
    ? filteredRows
    : filteredRows.filter(r =>
        Object.values(r).map(safeStr).join(" ").toLowerCase().includes(q)
      );
  renderGrid(rows);
  elStatus.textContent =
    `In Service records ${rows.length} (base: ${baseRows.length} • total: ${allRows.length})`;
}

function markFiltersDirty() {
  filtersApplied = false;
  clearSelection();
  setButtonsState();
}

/* =========================
   Modal helpers (standardized)
   ========================= */
let prevBodyOverflow = "";

function openModal() {
  if (!modal) return;

  prevBodyOverflow = document.body.style.overflow || "";
  document.body.style.overflow = "hidden";

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  if (modalClose) modalClose.focus();
}

function closeModal() {
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = prevBodyOverflow;
}

/* =========================
   View/Edit modal
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

  openModal();
}

/* =========================
   Reports / Help (unchanged)
   ========================= */
function showHelp() {
  alert(`In Service reports use a branded header + criteria card.`);
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

modalClose?.addEventListener("click", closeModal);
modalBack?.addEventListener("click", closeModal);

modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

if (btnHelp) btnHelp.addEventListener("click", showHelp);

init();
