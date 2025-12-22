const DATA_URL = "./data/transformers.json";

/* =========================
   CENTRALIZED FORMAT HELPERS
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

const FIELD_RULES = {
  IMP: { label: "Imp", format: (v) => fmtFixed(v, 2) },
};

function formatField(key, value) {
  const rule = FIELD_RULES[key];
  return rule ? rule.format(value) : safeStr(value);
}

/* =========================
   ELEMENTS / STATE
   ========================= */

let allRows = [];
let selectedRow = null;

const poleInput = document.getElementById("pole-input");
const btnPoleSearch = document.getElementById("btn-pole-search");

const btnViewEdit = document.getElementById("btn-viewedit");
const btnPreview = document.getElementById("btn-preview");
const btnQuit = document.getElementById("btn-quit");
const btnHelp = document.getElementById("btn-help");

const elStatus = document.getElementById("status");
const tbody = document.getElementById("grid-body");

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalBody = document.getElementById("modal-body");
const modalSubtitle = document.getElementById("modal-subtitle");

/* =========================
   HELPERS
   ========================= */

function normalizePole(v) {
  // Normalize for case + spacing, so "m 13929" matches "M13929"
  return safeStr(v).toUpperCase().replace(/\s+/g, "");
}

function beep() {
  // best-effort beep without breaking anything
  try { window.navigator.vibrate?.(80); } catch {}
}

function setButtonsInitial() {
  btnViewEdit.disabled = true;
  btnPreview.disabled = true;
}

function clearSelection() {
  selectedRow = null;
  btnViewEdit.disabled = true;
  document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
}

function computeAddress(row) {
  const hse = safeStr(row.HSE_NUM);
  const street = safeStr(row.STREET);
  const both = [hse, street].filter(Boolean).join(" ");
  return both || "—";
}

function computeFeeder(row) {
  // prefer FEEDER then Feeder (your JSON has both patterns)
  const f1 = safeStr(row.FEEDER);
  const f2 = safeStr(row.Feeder);
  return f1 || f2 || "—";
}

/* =========================
   GRID
   ========================= */

function renderGrid(rows) {
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="6" style="padding:14px;color:#5b677a;">No results.</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");

    const address = computeAddress(r);
    const kva = safeStr(r.KVA);
    const serial = safeStr(r.SERIAL);
    const pri = safeStr(r.PRI_VOLT);
    const sec = safeStr(r.SEC_VOLT);
    const feeder = computeFeeder(r);

    tr.innerHTML = `
      <td title="${address}">${address}</td>
      <td title="${kva}">${kva}</td>
      <td title="${serial}">${serial}</td>
      <td title="${pri}">${pri}</td>
      <td title="${sec}">${sec}</td>
      <td title="${feeder}">${feeder}</td>
    `;

    tr.addEventListener("click", () => {
      document.querySelectorAll("tr.selected").forEach(x => x.classList.remove("selected"));
      tr.classList.add("selected");
      selectedRow = r;
      btnViewEdit.disabled = false;
    });

    tbody.appendChild(tr);
  });
}

/* =========================
   SEARCH (POLE)
   ========================= */

function runPoleSearch() {
  const inputRaw = poleInput.value;
  const poleKey = normalizePole(inputRaw);

  clearSelection();
  btnPreview.disabled = true;

  if (!poleKey) {
    beep();
    alert("Enter a Pole Number to search.");
    poleInput.focus();
    return;
  }

  // IMPORTANT: match against POLE_NO field in JSON
  const matches = allRows.filter(r => normalizePole(r.POLE_NO) === poleKey);

  if (!matches.length) {
    beep();

    // Helpful debug info: if there are any poles in the dataset at all
    const poleCount = allRows.filter(r => safeStr(r.POLE_NO) !== "").length;

    alert(
      poleCount
        ? "There is no such pole number in the database."
        : "No POLE_NO values were found in the dataset. (Check transformers.json includes POLE_NO.)"
    );

    renderGrid([]);
    elStatus.textContent = `No matches for: ${inputRaw}`;
    poleInput.focus();
    return;
  }

  // Success: enable preview like Access
  btnPreview.disabled = false;

  renderGrid(matches);
  elStatus.textContent = `Pole ${inputRaw} • Matches: ${matches.length}`;
}

/* =========================
   VIEW/EDIT MODAL
   ========================= */

function openModalForRow(row) {
  if (!row) return;

  modalSubtitle.textContent =
    `Trans_ID: ${safeStr(row.TRANS_ID) || "—"} • Pole: ${safeStr(row.POLE_NO) || "—"}`;

  modalBody.innerHTML = `
    <div class="kv">
      ${Object.keys(row).map(k => {
        const label = k;
        const val = (k === "IMP") ? formatField("IMP", row[k]) : safeStr(row[k]);
        return `
          <div class="field">
            <div class="label">${label}</div>
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
   PREVIEW REPORT
   ========================= */

function buildReportHtml(rows, poleLabel) {
  const now = new Date().toLocaleString();

  const head = `
    <th>Address</th>
    <th>KVA</th>
    <th>Serial</th>
    <th>Pri</th>
    <th>Sec</th>
    <th>Feeder</th>
  `;

  const body = rows.map(r => {
    const address = computeAddress(r);
    const kva = safeStr(r.KVA);
    const serial = safeStr(r.SERIAL);
    const pri = safeStr(r.PRI_VOLT);
    const sec = safeStr(r.SEC_VOLT);
    const feeder = computeFeeder(r);

    return `<tr>
      <td>${address}</td>
      <td>${kva}</td>
      <td>${serial}</td>
      <td>${pri}</td>
      <td>${sec}</td>
      <td>${feeder}</td>
    </tr>`;
  }).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transformers By Pole Number</title>
  <style>
    body{ font-family: Cabin, Segoe UI, Arial, sans-serif; margin:18px; color:#111827; }
    h1{ font-size:20px; margin:0 0 6px 0; font-weight:900; }
    .meta{ font-size:12px; color:#6b7280; margin-bottom:12px; }
    table{ width:100%; border-collapse:collapse; }
    th{ background:#0b3a78; color:#fff; text-align:left; font-size:12px; padding:8px; }
    td{ padding:7px 8px; border-bottom:1px solid #e5e7eb; font-size:12px; white-space:nowrap; }
    @media print{ body{ margin:10mm; } }
  </style>
</head>
<body>
  <h1>Transformers By Pole Number</h1>
  <div class="meta">Pole: ${poleLabel} • Generated: ${now} • Records: ${rows.length}</div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;
}

function openPreview() {
  if (btnPreview.disabled) return;

  const poleLabel = safeStr(poleInput.value) || "—";
  const poleKey = normalizePole(poleInput.value);

  const rows = allRows.filter(r => normalizePole(r.POLE_NO) === poleKey);
  const html = buildReportHtml(rows, poleLabel);

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Please allow popups.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/* =========================
   HELP / INIT / EVENTS
   ========================= */

function showHelp() {
  alert(
`Transformers By Pole Number

1) Enter a Pole Number (ex: M13929, CF1586)
2) Click Search (or press Enter)
3) If matches exist, Preview is enabled
4) Click a row to enable View/Edit (read-only)

This page is read-only for now.`
  );
}

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    allRows = await res.json();

    const withPoles = allRows.filter(r => safeStr(r.POLE_NO) !== "").length;
    elStatus.textContent = `Loaded ${allRows.length} transformers • ${withPoles} have pole numbers`;

    setButtonsInitial();
    poleInput.focus();
  } catch (err) {
    elStatus.textContent = `Failed to load data: ${err.message}`;
    setButtonsInitial();
  }
}

btnPoleSearch.addEventListener("click", runPoleSearch);
poleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runPoleSearch();
});

btnViewEdit.addEventListener("click", () => {
  if (selectedRow) openModalForRow(selectedRow);
});

btnPreview.addEventListener("click", openPreview);

btnQuit.addEventListener("click", () => {
  window.location.href = "./index.html";
});

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

if (btnHelp) btnHelp.addEventListener("click", showHelp);

init();
