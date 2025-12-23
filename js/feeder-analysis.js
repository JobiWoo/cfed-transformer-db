/* Feeder Analysis Report (static) - built from feeder_analysis_table.json
   Foreman view:
   - No Block column
   - Substation filter (auto-generated)
   - THEISS feeder labels (1203/1209 -> THEISS 3/THEISS 9)
   - Bottom total row behavior:
       - If All Substations: show System Total (all feeders)
       - If a Substation selected: show Substation Total (all feeders in that substation)
         This ignores feeder dropdown + search so the total stays "true" to the substation.
*/

const THEISS_FEEDERS = new Set([1203, 1209]);

const FEEDER_LABEL_OVERRIDES = {
  1203: "THEISS 3",
  1209: "THEISS 9",
};

const state = {
  data: null,
  substation: "ALL", // "ALL" | "THEISS" | number as string e.g. "1", "10", "13"
  feeder: "ALL",
  q: "",
  // built at runtime from data:
  substationToFeeders: new Map(), // key: "1"/"10"/"THEISS" -> Set(feeders)
  feedersAll: [],
};

const fmt0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function n(v){ return Number.isFinite(v) ? v : 0; }

function feederLabel(feederNum){
  return FEEDER_LABEL_OVERRIDES[feederNum] ?? `Feeder ${feederNum}`;
}

function substationKeyForFeeder(feederNum){
  if (THEISS_FEEDERS.has(feederNum)) return "THEISS";
  return String(Math.floor(feederNum / 100)); // 101->1, 402->4, 1002->10, etc.
}

function substationLabel(key){
  if (key === "THEISS") return "Theiss Substation";
  return `Substation ${key}`;
}

function customers(row){
  return n(row.phase1_cust)+n(row.phase2_cust)+n(row.phase3_cust)+n(row.cust_3ph);
}

function kvaTotal(row){
  return n(row.phase1_kva)+n(row.phase2_kva)+n(row.phase3_kva);
}

function buildAgg(rows){
  const agg = { transformers: 0, cust: 0, p1: 0, p2: 0, p3: 0, total: 0 };
  for(const r of rows){
    agg.transformers += 1; // Access Count([Feeder]) => row count
    agg.cust += customers(r);
    agg.p1 += n(r.phase1_kva);
    agg.p2 += n(r.phase2_kva);
    agg.p3 += n(r.phase3_kva);
    agg.total += kvaTotal(r);
  }
  return agg;
}

function byKey(map, key){
  if(!map.has(key)) map.set(key, []);
  return map.get(key);
}

function allowedFeedersForSubstation(key){
  if (key === "ALL") return null;
  return state.substationToFeeders.get(key) ?? null;
}

/**
 * Filter rows for what is DISPLAYED on screen:
 * - respects substation dropdown
 * - respects feeder dropdown
 * - respects search box
 */
function filterRowsForDisplay(all){
  const feeder = state.feeder;
  const q = state.q.trim().toLowerCase();
  const allowed = allowedFeedersForSubstation(state.substation);

  return all.filter(r=>{
    if (allowed && !allowed.has(r.feeder)) return false;

    if(feeder !== "ALL" && r.feeder !== Number(feeder)) return false;

    if(q){
      const s = feederLabel(r.feeder).toLowerCase();
      if(!s.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Rows used for the BOTTOM TOTAL:
 * - If substation == ALL: uses all rows (System Total)
 * - If substation selected: uses all rows in that substation (Substation Total)
 *   and ignores feeder + search so it behaves like Access.
 */
function rowsForBottomTotal(all){
  const allowed = allowedFeedersForSubstation(state.substation);
  if (!allowed) return all; // System total across all feeders
  return all.filter(r => allowed.has(r.feeder)); // total for that substation
}

function render(){
  const all = state.data.rows;

  // What we DISPLAY (can be narrowed further by feeder/search)
  const displayRows = filterRowsForDisplay(all);

  // Group displayed rows by feeder
  const feederMap = new Map();
  for(const r of displayRows){
    byKey(feederMap, r.feeder).push(r);
  }

  const feederKeys = Array.from(feederMap.keys()).sort((a,b)=>a-b);
  const tbody = document.querySelector("#reportBody");
  tbody.innerHTML = "";

  for(const f of feederKeys){
    const feederRows = feederMap.get(f);
    const aF = buildAgg(feederRows);

    // feeder row
    const trH = document.createElement("tr");
    trH.className = "group";
    trH.innerHTML = `
      <td><span style="font-weight:900">${feederLabel(f)}</span></td>
      <td>${fmt2.format(aF.p1)}</td>
      <td>${fmt2.format(aF.p2)}</td>
      <td>${fmt2.format(aF.p3)}</td>
      <td>${fmt2.format(aF.total)}</td>
      <td>${fmt0.format(aF.transformers)}</td>
      <td>${fmt0.format(aF.cust)}</td>
    `;
    tbody.appendChild(trH);

    // feeder total row (legacy feel)
    const trT = document.createElement("tr");
    trT.className = "total";
    trT.innerHTML = `
      <td>${feederLabel(f)} Total</td>
      <td>${fmt2.format(aF.p1)}</td>
      <td>${fmt2.format(aF.p2)}</td>
      <td>${fmt2.format(aF.p3)}</td>
      <td>${fmt2.format(aF.total)}</td>
      <td>${fmt0.format(aF.transformers)}</td>
      <td>${fmt0.format(aF.cust)}</td>
    `;
    tbody.appendChild(trT);

    const spacer = document.createElement("tr");
    spacer.innerHTML = `<td colspan="7" style="height:8px;border-bottom:0;background:#fff"></td>`;
    tbody.appendChild(spacer);
  }

  // Bottom total row (System or Substation)
  const totalRows = rowsForBottomTotal(all);
  const agg = buildAgg(totalRows);

  const sysRow = document.querySelector("#systemTotalRow");
  const label = (state.substation === "ALL")
    ? "System Total"
    : `${substationLabel(state.substation)} Total`;

  sysRow.innerHTML = `
    <td>${label}</td>
    <td>${fmt2.format(agg.p1)}</td>
    <td>${fmt2.format(agg.p2)}</td>
    <td>${fmt2.format(agg.p3)}</td>
    <td>${fmt2.format(agg.total)}</td>
    <td>${fmt0.format(agg.transformers)}</td>
    <td>${fmt0.format(agg.cust)}</td>
  `;

  // Chips reflect what's displayed (not the bottom total scope)
  document.querySelector("#metaRows").textContent = fmt0.format(displayRows.length);
  document.querySelector("#metaFeeders").textContent = fmt0.format(feederKeys.length);
}

function buildSubstationIndex(){
  state.substationToFeeders = new Map();

  const feeders = Array.from(new Set(state.data.rows.map(r=>r.feeder))).sort((a,b)=>a-b);
  state.feedersAll = feeders;

  for(const f of feeders){
    const key = substationKeyForFeeder(f);
    if(!state.substationToFeeders.has(key)) state.substationToFeeders.set(key, new Set());
    state.substationToFeeders.get(key).add(f);
  }
}

function fillSubstationSelect(){
  const sel = document.querySelector("#substationSelect");
  sel.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "ALL";
  optAll.textContent = "All Substations";
  sel.appendChild(optAll);

  const keys = Array.from(state.substationToFeeders.keys());

  const numericKeys = keys
    .filter(k => k !== "THEISS")
    .map(k => Number(k))
    .filter(Number.isFinite)
    .sort((a,b)=>a-b)
    .map(k => String(k));

  for(const k of numericKeys){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = substationLabel(k);
    sel.appendChild(opt);
  }

  if(state.substationToFeeders.has("THEISS")){
    const opt = document.createElement("option");
    opt.value = "THEISS";
    opt.textContent = substationLabel("THEISS");
    sel.appendChild(opt);
  }

  sel.value = state.substation;
}

function fillFeederSelect(){
  const sel = document.querySelector("#feederSelect");
  sel.innerHTML = `<option value="ALL">All Feeders</option>`;

  const allowed = allowedFeedersForSubstation(state.substation);
  const feeders = allowed ? Array.from(allowed).sort((a,b)=>a-b) : state.feedersAll;

  for(const f of feeders){
    const opt = document.createElement("option");
    opt.value = String(f);
    opt.textContent = feederLabel(f);
    sel.appendChild(opt);
  }

  // If current feeder no longer allowed under selected substation, reset
  if(state.feeder !== "ALL" && allowed && !allowed.has(Number(state.feeder))){
    state.feeder = "ALL";
  }
  sel.value = state.feeder;
}

function wireUI(){
  const subSel = document.querySelector("#substationSelect");
  const feederSel = document.querySelector("#feederSelect");
  const q = document.querySelector("#q");

  subSel.addEventListener("change", ()=>{
    state.substation = subSel.value;
    state.feeder = "ALL";
    state.q = "";
    q.value = "";
    fillFeederSelect();
    render();
  });

  feederSel.addEventListener("change", ()=>{
    state.feeder = feederSel.value;
    render();
  });

  q.addEventListener("input", ()=>{
    state.q = q.value;
    render();
  });

  document.querySelector("#btnPrint").addEventListener("click", ()=>window.print());

  document.querySelector("#btnReset").addEventListener("click", ()=>{
    state.substation = "ALL";
    state.feeder = "ALL";
    state.q = "";

    subSel.value = state.substation;
    feederSel.value = state.feeder;
    q.value = "";

    fillFeederSelect();
    render();
  });
}

async function init(){
  const res = await fetch("./data/feeder_analysis_table.json");
  state.data = await res.json();

  document.querySelector("#printedDate").textContent =
    new Date().toLocaleDateString(undefined, { year:"numeric", month:"2-digit", day:"2-digit" });

  buildSubstationIndex();
  fillSubstationSelect();
  fillFeederSelect();
  wireUI();
  render();
}

init().catch(err=>{
  console.error(err);
  document.querySelector("#loadError").style.display="block";
});
