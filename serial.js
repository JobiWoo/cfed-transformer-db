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

function resetAllFields() {
  currentRecord = null;
  btnPreview.disabled = true;

  // Status & Location
  setValue("s-type", "");
  setValue("s-kva", "");
  setValue("s-pri", "");
  setValue("s-sec", "");
  setValue("s-status", "");
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

/**
 * Normalize a serial string for matching:
 * - trim spaces
 * - remove internal spaces and common separators
 * - uppercase for case-insensitive matching
 */
function normalizeSerialForMatch(v) {
  let s = trimStr(v);
  s = s.replace(/\s+/g, "");        // remove all whitespace
  s = s.replace(/[-_]/g, "");       // remove separators
  s = s.toUpperCase();
  return s;
}

/**
 * Normalize user input:
 * - CP prefix warning + remove CP
 * - normalize for matching
 */
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

  // 1) Case-insensitive exact match after normalization
  let rec = allRows.find(r => normalizeSerialForMatch(r.SERIAL) === key);
  if (rec) return rec;

  // 2) Numeric equivalence (handles leading zeros in input)
  const keyNum = String(Number(key));
  if (keyNum !== "NaN") {
    rec = allRows.find(r => {
      const n = String(Number(normalizeSerialForMatch(r.SERIAL)));
      return n === keyNum;
    });
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
  setValue("s-status", trimStr(r.STATUS));
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
   Preview
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
    ["Status", trimStr(r.STATUS)],
    ["Location", trimStr(r.LOCATION)],
    ["Pole No", trimStr(r.POLE_NO)],
    ["Feeder", computeFeeder(r)],
    ["Remarks", trimStr(r.REMARKS)]
  ];

  const body = rows.map(([k,v]) => `
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

This search is tolerant of:
• Upper/lowercase differences (m17g16021 = M17G16021)
• Hidden trailing spaces
• Extra spaces or separators in the middle (m 17 g 16021)
• CP prefix (warns + removes CP)

Tabs show different sections of the transformer record.
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
