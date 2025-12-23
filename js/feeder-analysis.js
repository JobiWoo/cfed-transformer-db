/* Feeder Analysis Report (static) - built from feeder_analysis_table.json
   Foreman view:
   - No Block column
   - Substation filter (auto-generated)
   - Fixes THEISS feeder labels (1203/1209 -> THEISS 3/THEISS 9)
   - Substation rule:
       - Theiss = feeders 1203, 1209
       - Otherwise Substation = floor(feeder / 100)
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
  // Works for 101->1, 401->4, 1001->10, 1302->13, 323->3, etc.
  return String(Math.floor(feederNum / 100));
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

function allowedFeedersForSubstation(){
  if (state.substation === "ALL") return null;
  return state.substationToFeeders.get(state.substation) ?? null;
}

function filterRows(all){
  const feeder = state.feeder;
  const q = state.q.trim().toLowerCase();
  const allowed = allowedFeedersForSubstation();

  return all.filter(r=>{
    if (allowed && !allowed.has(r.feeder)) return false;

    if(feeder !== "ALL" && r.feeder !== Number(feeder)) return false;

    if(q){
      // Match against the displayed label (includes THEISS names)
      const s = feederLabel(r.feeder).toLowerCase();
      if(!s.includes(q)) return false;
    }

    return true;
  });
}

function render(){
  const all = state.data.rows;
  const rows = filterRows(all);

  // group by feeder
  const feederMap = new Map();
  for(const r of rows){
    byKey(feederMap, r.feeder).push(r);
  }

  const feederKeys = Array.from(feederMap.keys()).sort((a,b)=>a-b);
  const tbody = document.querySelector("#reportBody");
  tbody.innerHTML = "";

  let systemRows = [];

  for(const f of feederKeys){
    const feederRows = feederMap.get(f);
    systemRows = systemRows.concat(feederRows);
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

    // total row (kept for legacy feel)
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

  // system total
  const sys = buildAgg(systemRows);
  const sysRow = document.querySelector("#systemTotalRow");
  sysRow.innerHTML = `
    <td>System Total</td>
    <td>${fmt2.format(sys.p1)}</td>
    <td>${fmt2.format(sys.p2)}</td>
    <td>${fmt2.format(sys.p3)}</td>
    <td>${fmt2.format(sys.total)}</td>
    <td>${fmt0.format(sys.transformers)}</td>
    <td>${fmt0.format(sys.cust)}</td>
  `;

  // chips
  document.querySelector("#metaRows").textContent = fmt0.format(rows.length);
  document.querySelector("#metaFeeders").textContent = fmt0.format(feederKeys.length);
}

function buildSubstationIndex(){
  // Build feeder sets per substation from the dataset
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

  // Always include All
  const optAll = document.createElement("option");
  optAll.value = "ALL";
  optAll.textContent = "All Substations";
  sel.appendChild(optAll);

  // Build a sorted list of keys: numeric substations first, then THEISS if present
  const keys = Array.from(state.substationToFeeders.keys());

  const numericKeys = keys
    .filter(k => k !== "THEISS")
    .map(k => Number(k))
    .filter(Number.isFinite)
    .sort((a,b)=>a-b)
    .map(k => String(k));

  const hasTheiss = state.substationToFeeders.has("THEISS");

  for(const k of numericKeys){
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = substationLabel(k);
    sel.appendChild(opt);
  }

  if(hasTheiss){
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

  const allowed = allowedFeedersForSubstation();
  const feeders = allowed ? Array.from(allowed).sort((a,b)=>a-b) : state.feedersAll;

  for(const f of feeders){
    const opt = document.createElement("option");
    opt.value = String(f);
    opt.textContent = feederLabel(f);
    sel.appendChild(opt);
  }

  // If current feeder no longer allowed under selected substation, reset to ALL
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
