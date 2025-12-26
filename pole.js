const DATA_URL = "./data/transformers.json";

/* =========================
   Helpers / formatting
   ========================= */
function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function normalizePole(v) {
  return safeStr(v).toUpperCase().replace(/\s+/g, "");
}
function normalizeStatus(v) {
  return safeStr(v).toUpperCase();
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

/* =========================
   Status badge helpers
   ========================= */
function statusClass(status) {
  const s = normalizeStatus(status);
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
  const text = safeStr(status) || "—";
  const cls = statusClass(text);
  return `<span class="status-pill ${cls}">${text}</span>`;
}

/* =========================
   Elements / State
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
const modalBack = document.getElementById("modal-back"); // ✅ new back button
const modalBody = document.getElementById("modal-body");
const modalSubtitle = document.getElementById("modal-subtitle");

/* =========================
   UI helpers
   ========================= */
function beep() {
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
  return safeStr(row.FEEDER) || safeStr(row.Feeder) || "—";
}

/* =========================
   Grid
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

    // Status badge shown next to feeder (no extra column needed)
    const feederCell = `${feeder} <span style="margin-left:8px;">${renderStatusBadge(r.STATUS)}</span>`;

    tr.innerHTML = `
      <td title="${address}">${address}</td>
      <td title="${kva}">${kva}</td>
      <td title="${serial}">${serial}</td>
      <td title="${pri}">${pri}</td>
      <td title="${sec}">${sec}</td>
      <td title="${feeder}">${feederCell}</td>
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
   Search (Pole)
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

  const matches = allRows.filter(r => normalizePole(r.POLE_NO) === poleKey);

  if (!matches.length) {
    beep();
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

  btnPreview.disabled = false;
  renderGrid(matches);
  elStatus.textContent = `Pole ${inputRaw} • Matches: ${matches.length}`;
}

/* =========================
   Modal helpers (improved)
   ========================= */
let prevBodyOverflow = "";

function openModal() {
  if (!modal) return;

  // Prevent background scroll (iPad win)
  prevBodyOverflow = document.body.style.overflow || "";
  document.body.style.overflow = "hidden";

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  // Focus close for accessibility / keyboard
  if (modalClose) modalClose.focus();
}

function closeModal() {
  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");

  // Restore background scroll
  document.body.style.overflow = prevBodyOverflow;
}

/* =========================
   View/Edit modal (read-only)
   ========================= */
function openModalForRow(row) {
  if (!row) return;

  modalSubtitle.textContent =
    `Trans_ID: ${safeStr(row.TRANS_ID) || "—"} • Pole: ${safeStr(row.POLE_NO) || "—"} • Status: ${safeStr(row.STATUS) || "—"}`;

  modalBody.innerHTML = `
    <div class="kv">
      ${Object.keys(row).map(k => {
        let val = safeStr(row[k]);
        if (k === "IMP") val = fmtFixed(row[k], 2);
        return `
          <div class="field">
            <div class="label">${k}</div>
            <div class="value">${val || "—"}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  openModal();
}

/* =========================
   Preview report
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
    <th>Status</th>
  `;

  const body = rows.map(r => {
    const address = computeAddress(r);
    const kva = safeStr(r.KVA);
    const serial = safeStr(r.SERIAL);
    const pri = safeStr(r.PRI_VOLT);
    const sec = safeStr(r.SEC_VOLT);
    const feeder = computeFeeder(r);
    const status = renderStatusBadge(r.STATUS);

    return `<tr>
      <td>${address}</td>
      <td>${kva}</td>
      <td>${serial}</td>
      <td>${pri}</td>
      <td>${sec}</td>
      <td>${feeder}</td>
      <td>${status}</td>
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
    th{ background:#0b3a78; color:#fff; text-align:left; font-size:12px; padding:8px; position:sticky; top:0; }
    td{ padding:7px 8px; border-bottom:1px solid #e5e7eb; font-size:12px; white-space:nowrap; }

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

    @media print{ body{ margin:10mm; } th{ position:static; } }
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
   Help / init / events
   ========================= */
function showHelp() {
  alert(
`Transformers By Pole Number

• Enter a pole number and click Search (or press Enter)
• Status is shown as a color badge next to the feeder
• Preview includes Status as well

Read-only for now; later will save to SQL Server.`
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

btnPoleSearch?.addEventListener("click", runPoleSearch);
poleInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runPoleSearch();
});

btnViewEdit?.addEventListener("click", () => {
  if (selectedRow) openModalForRow(selectedRow);
});

btnPreview?.addEventListener("click", openPreview);

btnQuit?.addEventListener("click", () => {
  window.location.href = "./index.html";
});

// Modal controls
modalClose?.addEventListener("click", closeModal);
modalBack?.addEventListener("click", closeModal); // ✅ Back to Results works

modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// ESC closes modal (desktop convenience)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
    closeModal();
  }
});

btnHelp?.addEventListener("click", showHelp);

init();
