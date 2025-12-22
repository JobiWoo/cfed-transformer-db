const DATA_URL = "./data/transformers.json";

/* =========================
   Formatting helpers
   ========================= */
function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}
function trimStr(v) {
  return safeStr(v).trim();
}
function toNumberOrNaN(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}
function fmtFixed(v, decimals) {
  const n = toNumberOrNaN(v);
  if (Number.isNaN(n)) return trimStr(v);
  return n.toFixed(decimals);
}
function fmtEpochMs(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = toNumberOrNaN(v);
  if (Number.isNaN(n)) return trimStr(v);
  if (n > 300000000000) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return trimStr(v);
}
function computeFeeder(row) {
  return trimStr(row.FEEDER) || trimStr(row.Feeder) || "";
}
function normalizeUpper(v) {
  return trimStr(v).toUpperCase();
}

/* =========================
   Status badge helpers
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
  const text = trimStr(status) || "—";
  const cls = statusClass(text);
  return `<span class="status-pill ${cls}">${text}</span>`;
}

/* =========================
   Elements
   ========================= */
const serialInput = document.getElementById("serial-input");
const btnSearch = document.getElementById("btn-serial-search");
const btnPreview = document.getElementById("btn-preview");
const btnNew = document.getElementById("btn-new");
const btnClose = document.getElementById("btn-close");
const btnHelp = document.getElementById("btn-help");
const elStatus = document.getElementById("status");

// tabs
const tabButtons = Array.from(document.querySelectorAll(".tab"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

// record
let allRows = [];
let currentRecord = null;

/* =========================
   UI helpers
   ========================= */
function setValue(elId, value, isMultiline=false) {
  const el = document.getElementById(elId);
  if (!el) return;
  const v = trimStr(value);
  el.textContent = v ? v : "—";
  if (v) el.classList.remove("blank");
  else el.classList.add("blank");
  if (isMultiline) el.classList.add("multiline");
}

function setHtmlValue(elId, html, isBlank=false) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = html;
  if (isBlank) el.classList.add("blank");
  else el.classList.remove("blank");
}

function resetAllFields() {
  currentRecord = null;
  btnPreview.disabled = true;

  // Status & Location
  setValue("s-type", "");
  setValue("s-kva", "");
  setValue("s-pri", "");
  setValue("s-sec", "");
  setValue("s-location", "");
  setValue("s-hse", "");
  setValue("s-street", "");
  setValue("s-install", "");
  setValue("s-pole", "");
  setValue("s-feeder", "");
  setValue("s-phase", "");
  setValue("s-block", "");
  setValue("s-secdist", "");
  setValue("s-nocust", "");
  setValue("s-banked", "");
  setValue("s-custowned", "");
  setValue("s-date-installed", "");
  setValue("s-date-recovered", "");
  setValue("s-remarks", "", true);
  setValue("s-today", "");
  setValue("s-user", "");

  // Status badge field (HTML)
  setHtmlValue("s-status", "—", true);

  // Nameplate
  setValue("n-type", "");
  setValue("n-kva", "");
  setValue("n-pri", "");
  setValue("n-sec", "");
  setValue("n-mfg", "");
  setValue("n-serial", "");
  setValue("n-imp", "");
  setValue("n-year", "");
  setValue("n-today", "");
  setValue("n-user", "");

  // Test
  setValue("t-type", "");
  setValue("t-kva", "");
  setValue("t-pri", "");
  setValue("t-sec", "");
  setValue("t-date-tested", "");
  setValue("t-pcb-sign", "");
  setValue("t-pcb-amt", "");
  setValue("t-weight", "");
  setValue("t-gallons", "");
  setValue("t-megger", "");
  setValue("t-ttr", "", true);
  setValue("t-polarity", "");
  setValue("t-test-remarks", "", true);
  setValue("t-today", "");
  setValue("t-user", "");

  // Inventory
  setValue("i-type", "");
  setValue("i-kva", "");
  setValue("i-pri", "");
  setValue("i-sec", "");
  setValue("i-price", "");
  setValue("i-date-inventoried", "");
  setValue("i-date-delivered", "");
  setValue("i-date-scrapped", "");
  setValue("i-scrap-remarks", "", true);
  setValue("i-today", "");
  setValue("i-user", "");

  elStatus.textContent = "Enter a serial number and click Search.";
}

function activateTab(tabId) {
  tabButtons.forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  tabPanels.forEach(p => p.classList.toggle("active", p.id === tabId));
}

/* =========================
   Robust serial normalization
   ========================= */
function normalizeSerialForMatch(v) {
  let s = trimStr(v);
  s = s.replace(/\s+/g, "");
  s = s.replace(/[-_]/g, "");
  s = s.toUpperCase();
  return s;
}
function normalizeUserSerial(raw) {
  let s = trimStr(raw);
  if (s.slice(0, 2).toUpperCase() === "CP") {
    alert("Do Not Use the CP Prefix When Searching for Cooper Transformers.\n\nCP will be removed automatically.");
    s = s.slice(2);
  }
  return normalizeSerialForMatch(s);
}

/* =========================
   Search
   ========================= */
function findBySerial(serialKey) {
  const key = normalizeSerialForMatch(serialKey);
  if (!key) return null;

  let rec = allRows.find(r => normalizeSerialForMatch(r.SERIAL) === key);
  if (rec) return rec;

  const keyNum = String(Number(key));
  if (keyNum !== "NaN") {
    rec = allRows.find(r => String(Number(normalizeSerialForMatch(r.SERIAL))) === keyNum);
    if (rec) return rec;
  }
  return null;
}

function populateFromRecord(r) {
  const type = trimStr(r.TYPE);
  const kva  = trimStr(r.KVA);
  const pri  = trimStr(r.PRI_VOLT);
  const sec  = trimStr(r.SEC_VOLT);
  const today = fmtEpochMs(r.TODAY);
  const user = trimStr(r.USERNAME);

  // Status & location
  setValue("s-type", type);
  setValue("s-kva", kva);
  setValue("s-pri", pri);
  setValue("s-sec", sec);

  // Status as badge
  const statusText = trimStr(r.STATUS);
  setHtmlValue("s-status", renderStatusBadge(statusText), !statusText);

  setValue("s-location", trimStr(r.LOCATION));
  setValue("s-hse", trimStr(r.HSE_NUM));
  setValue("s-street", trimStr(r.STREET));
  setValue("s-install", trimStr(r.INSTALLATION));
  setValue("s-pole", trimStr(r.POLE_NO));
  setValue("s-feeder", computeFeeder(r));
  setValue("s-phase", trimStr(r.PHASE));
  setValue("s-block", trimStr(r.FEEDER_BLOCK));
  setValue("s-secdist", trimStr(r.SEC_DIST));
  setValue("s-nocust", trimStr(r.NO_CUST));
  setValue("s-banked", trimStr(r["Banked Installation"]) || trimStr(r.Banked) || trimStr(r.BANKED));
  setValue("s-custowned", trimStr(r.CUST_OWNED));
  setValue("s-date-installed", fmtEpochMs(r.DATE_INSTALLED));
  setValue("s-date-recovered", fmtEpochMs(r.DATE_RECOVERED));
  setValue("s-remarks", trimStr(r.REMARKS), true);
  setValue("s-today", today);
  setValue("s-user", user);

  // Nameplate
  setValue("n-type", type);
  setValue("n-kva", kva);
  setValue("n-pri", pri);
  setValue("n-sec", sec);
  setValue("n-mfg", trimStr(r.MFG));
  setValue("n-serial", trimStr(r.SERIAL));
  setValue("n-imp", fmtFixed(r.IMP, 2));
  setValue("n-year", trimStr(r.YEAR_MFG));
  setValue("n-today", today);
  setValue("n-user", user);

  // Test
  setValue("t-type", type);
  setValue("t-kva", kva);
  setValue("t-pri", pri);
  setValue("t-sec", sec);
  setValue("t-date-tested", fmtEpochMs(r.DATE_TESTED));
  setValue("t-pcb-sign", trimStr(r.PCB_SIGN));
  setValue("t-pcb-amt", trimStr(r.PCB_AMNT));
  setValue("t-weight", trimStr(r.WEIGHT));
  setValue("t-gallons", trimStr(r.GALLONS));
  setValue("t-megger", trimStr(r.MEGGER_RESULTS));
  setValue("t-ttr", trimStr(r.TTR_RESULTS), true);
  setValue("t-polarity", trimStr(r.POLARITY));
  setValue("t-test-remarks", trimStr(r.TEST_REMARKS), true);
  setValue("t-today", today);
  setValue("t-user", user);

  // Inventory
  setValue("i-type", type);
  setValue("i-kva", kva);
  setValue("i-pri", pri);
  setValue("i-sec", sec);
  setValue("i-price", trimStr(r.PRICE));
  setValue("i-date-inventoried", fmtEpochMs(r.DATE_INVENTORIED));
  setValue("i-date-delivered", fmtEpochMs(r.DATE_DELIVERED));
  setValue("i-date-scrapped", fmtEpochMs(r.DATE_SCRAPPED));
  setValue("i-scrap-remarks", trimStr(r.SCRAP_REMARKS), true);
  setValue("i-today", today);
  setValue("i-user", user);

  btnPreview.disabled = false;
}

function runSearch() {
  resetAllFields();

  const raw = serialInput.value;
  const key = normalizeUserSerial(raw);

  if (!key) {
    alert("Enter a Serial Number to search.");
    serialInput.focus();
    return;
  }

  const rec = findBySerial(key);
  if (!rec) {
    alert(`No Transformer with Serial Number ${key} exists in the dataset.`);
    serialInput.focus();
    elStatus.textContent = `No match for serial: ${key}`;
    return;
  }

  currentRecord = rec;
  populateFromRecord(rec);

  elStatus.textContent = `Found Serial ${trimStr(rec.SERIAL)} • Trans_ID ${trimStr(rec.TRANS_ID)}`;
  activateTab("tab-status");
}

/* =========================
   Preview (status badge included)
   ========================= */
function buildPreviewHtml(r) {
  const now = new Date().toLocaleString();
  const rows = [
    ["Serial", trimStr(r.SERIAL)],
    ["Manufacturer", trimStr(r.MFG)],
    ["Type", trimStr(r.TYPE)],
    ["KVA", trimStr(r.KVA)],
    ["Primary", trimStr(r.PRI_VOLT)],
    ["Secondary", trimStr(r.SEC_VOLT)],
    ["Imp", fmtFixed(r.IMP, 2)],
    ["Status", renderStatusBadge(trimStr(r.STATUS))],
    ["Location", trimStr(r.LOCATION)],
    ["Pole No", trimStr(r.POLE_NO)],
    ["Feeder", computeFeeder(r)],
    ["Remarks", trimStr(r.REMARKS)]
  ];

  const body = rows.map(([k,v], idx) => `
    <tr>
      <td style="width:220px;font-weight:900;color:#0a2f60;">${k}</td>
      <td style="white-space:pre-wrap;">${v || "—"}</td>
    </tr>
  `).join("");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transformer Record</title>
  <style>
    body{ font-family: Cabin, Segoe UI, Arial, sans-serif; margin:18px; color:#111827; }
    h1{ font-size:20px; margin:0 0 6px 0; font-weight:900; }
    .meta{ font-size:12px; color:#6b7280; margin-bottom:12px; }
    table{ width:100%; border-collapse:collapse; }
    td{ padding:8px 10px; border-bottom:1px solid #e5e7eb; font-size:13px; vertical-align:top; }
    .wrap{ border:1px solid #d8e0ea; border-radius:12px; overflow:hidden; }
    .hdr{ background:#0b3a78; color:#fff; padding:10px 12px; font-weight:900; }
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
    @media print{ body{ margin:10mm; } }
  </style>
</head>
<body>
  <h1>Transformer Record</h1>
  <div class="meta">Generated: ${now}</div>
  <div class="wrap">
    <div class="hdr">Serial: ${trimStr(r.SERIAL)} • Trans_ID: ${trimStr(r.TRANS_ID)}</div>
    <table><tbody>${body}</tbody></table>
  </div>
</body>
</html>`;
}

function openPreview() {
  if (!currentRecord) return;
  const html = buildPreviewHtml(currentRecord);
  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Please allow popups for Preview.");
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
`Search By Serial Number

• Serial matching is tolerant of case and hidden spaces.
• Status is shown as a colored badge to speed scanning.
• Tabs display Status/Location, Nameplate, Test, Inventory.

Read-only for now; later will save to SQL Server.`
  );
}

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    resetAllFields();
    serialInput.focus();
    elStatus.textContent = `Loaded ${allRows.length} transformers • Ready to search.`;

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tab));
    });

  } catch (err) {
    resetAllFields();
    elStatus.textContent = `Failed to load data: ${err.message}`;
  }
}

btnSearch.addEventListener("click", runSearch);
serialInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

btnPreview.addEventListener("click", openPreview);

btnNew.addEventListener("click", () => {
  resetAllFields();
  serialInput.value = "";
  serialInput.focus();
});

btnClose.addEventListener("click", () => {
  window.location.href = "./index.html";
});

if (btnHelp) btnHelp.addEventListener("click", showHelp);

init();
