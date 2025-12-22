const DATA_URL = "./data/transformers.json";

/* =========================
   CENTRALIZED FORMAT RULES
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
   ELEMENTS
   ========================= */

const serialInput = document.getElementById("serial-input");
const btnSearch = document.getElementById("btn-serial-search");
const btnPreview = document.getElementById("btn-preview");
const btnQuit = document.getElementById("btn-quit");
const btnHelp = document.getElementById("btn-help");
const elStatus = document.getElementById("status");

// Form fields (divs)
const fTransId  = document.getElementById("f-transid");
const fSerial   = document.getElementById("f-serial");
const fMfg      = document.getElementById("f-mfg");
const fType     = document.getElementById("f-type");
const fKva      = document.getElementById("f-kva");
const fImp      = document.getElementById("f-imp");
const fPri      = document.getElementById("f-pri");
const fSec      = document.getElementById("f-sec");
const fStatus   = document.getElementById("f-status");
const fLocation = document.getElementById("f-location");
const fPole     = document.getElementById("f-pole");
const fFeeder   = document.getElementById("f-feeder");
const fRemarks  = document.getElementById("f-remarks");

// Data
let allRows = [];
let currentRecord = null;

/* =========================
   HELPERS
   ========================= */

function setBlank(el) {
  el.textContent = "—";
  el.classList.add("blank");
}

function setValue(el, value) {
  const v = safeStr(value);
  el.textContent = v ? v : "—";
  if (v) el.classList.remove("blank");
  else el.classList.add("blank");
}

function resetForm() {
  currentRecord = null;
  btnPreview.disabled = true;

  [
    fTransId, fSerial, fMfg, fType, fKva, fImp, fPri, fSec,
    fStatus, fLocation, fPole, fFeeder, fRemarks
  ].forEach(setBlank);

  elStatus.textContent = "Enter a serial number and click Search.";
}

function normalizeSerialInput(raw) {
  let s = safeStr(raw);

  // VBA warning: If user types CP prefix, strip it and warn.
  if (s.length >= 2 && s.slice(0, 2).toUpperCase() === "CP") {
    alert("Do Not Use the CP Prefix When Searching for Cooper Transformers.\n\nCP will be removed automatically.");
    s = s.slice(2);
  }

  // Remove spaces and common separators
  s = s.replace(/\s+/g, "").replace(/[-_]/g, "");

  return s;
}

function computeFeeder(row) {
  // Your dataset has FEEDER and sometimes Feeder
  const f1 = safeStr(row.FEEDER);
  const f2 = safeStr(row.Feeder);
  return f1 || f2 || "";
}

/* =========================
   SEARCH
   ========================= */

function findBySerial(serialKey) {
  // Most of your JSON SERIAL values appear numeric; safe match by string.
  // Also handle cases where SERIAL may include leading zeros in input (rare).
  const key = safeStr(serialKey);
  if (!key) return null;

  // 1) Exact string match
  let rec = allRows.find(r => safeStr(r.SERIAL).replace(/\s+/g, "") === key);
  if (rec) return rec;

  // 2) Numeric-equivalent match (e.g., input "02246025" vs stored 2246025)
  const keyNum = String(Number(key));
  if (keyNum !== "NaN") {
    rec = allRows.find(r => String(Number(safeStr(r.SERIAL))) === keyNum);
    if (rec) return rec;
  }

  return null;
}

function runSerialSearch() {
  resetForm(); // clears + disables preview

  const raw = serialInput.value;
  const serialKey = normalizeSerialInput(raw);

  if (!serialKey) {
    alert("Enter a Serial Number to search.");
    serialInput.focus();
    return;
  }

  const rec = findBySerial(serialKey);

  if (!rec) {
    alert(`No Transformer with Serial Number ${serialKey} exists in the dataset.`);
    serialInput.focus();
    elStatus.textContent = `No match for serial: ${serialKey}`;
    return;
  }

  currentRecord = rec;

  // Populate the form (read-only)
  setValue(fTransId, rec.TRANS_ID);
  setValue(fSerial, rec.SERIAL);
  setValue(fMfg, rec.MFG);
  setValue(fType, rec.TYPE);
  setValue(fKva, rec.KVA);
  setValue(fImp, formatField("IMP", rec.IMP));
  setValue(fPri, rec.PRI_VOLT);
  setValue(fSec, rec.SEC_VOLT);
  setValue(fStatus, rec.STATUS);
  setValue(fLocation, rec.LOCATION);
  setValue(fPole, rec.POLE_NO);
  setValue(fFeeder, computeFeeder(rec));
  setValue(fRemarks, rec.REMARKS);

  btnPreview.disabled = false;
  elStatus.textContent = `Found serial ${safeStr(rec.SERIAL)} (Trans_ID ${safeStr(rec.TRANS_ID)})`;
}

/* =========================
   PREVIEW (single record)
   ========================= */

function buildRecordPreviewHtml(rec) {
  const now = new Date().toLocaleString();

  const rows = [
    ["Trans_ID", safeStr(rec.TRANS_ID)],
    ["Serial", safeStr(rec.SERIAL)],
    ["Manufacturer", safeStr(rec.MFG)],
    ["Type", safeStr(rec.TYPE)],
    ["KVA", safeStr(rec.KVA)],
    ["Imp", formatField("IMP", rec.IMP)],
    ["Primary", safeStr(rec.PRI_VOLT)],
    ["Secondary", safeStr(rec.SEC_VOLT)],
    ["Status", safeStr(rec.STATUS)],
    ["Location", safeStr(rec.LOCATION)],
    ["Pole No", safeStr(rec.POLE_NO)],
    ["Feeder", computeFeeder(rec)],
    ["Remarks", safeStr(rec.REMARKS)]
  ];

  const body = rows.map(([k, v]) => `
    <tr>
      <td style="width:220px; font-weight:800; color:#0a2f60;">${k}</td>
      <td>${v ? v : "—"}</td>
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
    tr:hover td{ background:#f7f9fc; }
    .wrap{ border:1px solid #d8e0ea; border-radius:12px; overflow:hidden; }
    .hdr{ background:#0b3a78; color:#fff; padding:10px 12px; font-weight:900; }
    @media print{ body{ margin:10mm; } }
  </style>
</head>
<body>
  <h1>Transformer Record</h1>
  <div class="meta">Generated: ${now}</div>

  <div class="wrap">
    <div class="hdr">Serial: ${safeStr(rec.SERIAL)} • Trans_ID: ${safeStr(rec.TRANS_ID)}</div>
    <table>
      <tbody>
        ${body}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function openPreview() {
  if (!currentRecord) return;
  const html = buildRecordPreviewHtml(currentRecord);

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
   HELP / INIT / EVENTS
   ========================= */

function showHelp() {
  alert(
`Search By Serial Number

1) Enter a serial number and click Search (or press Enter).
2) The record form will populate if found.
3) Preview prints a single-record sheet.

Notes:
• Do not include the "CP" prefix — if you do, it will be removed automatically.
• This version is read-only. Later, this page will save changes to SQL Server.`
  );
}

async function init() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allRows = await res.json();

    resetForm();
    serialInput.focus();
    elStatus.textContent = `Loaded ${allRows.length} transformers • Ready to search.`;
  } catch (err) {
    resetForm();
    elStatus.textContent = `Failed to load data: ${err.message}`;
  }
}

// Events
btnSearch.addEventListener("click", runSerialSearch);
serialInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSerialSearch();
});

btnPreview.addEventListener("click", openPreview);

btnQuit.addEventListener("click", () => {
  window.location.href = "./index.html";
});

if (btnHelp) btnHelp.addEventListener("click", showHelp);

init();
