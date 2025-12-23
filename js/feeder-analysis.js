/* Feeder Analysis Report (static) - built from feeder_analysis_table.json
   Foreman view:
   - No Block column
   - Adds Substation filter
   - Fixes THEISS feeder labels (1203/1209 -> THEISS 3/THEISS 9)
*/

const SUBSTATIONS = {
  "All Substations": null,
  "Substation 1": [101, 102, 103, 104],
  "Substation 3": [301, 302, 303, 304, 323],
  // Add more anytime:
  // "Substation X": [ ... feeder numbers ... ],
};

const FEEDER_LABEL_OVERRIDES = {
  1203: "THEISS 3",
  1209: "THEISS 9",
};

const state = {
  data: null,
  substation: "All Substations",
  feeder: "ALL",
  q: "",
};

const fmt0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function n(v){ return Number.isFinite(v) ? v : 0; }

function feederLabel(feederNum){
  return FEEDER_LABEL_OVERRIDES[feederNum] ?? `Feeder ${feederNum}`;
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
    agg.transformers += 1; // Access: Count([Feeder]) -> row count
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
  const list = SUBSTATIONS[state.substation];
  return Array.isArray(list) ? new Set(list) : null; // null = allow all
}

function filterRows(all){
  const feeder = state.feeder;
  const q = state.q.trim().toLowerCase();
  const allowed = allowedFeedersForSubstation();

  return all.filter(r=>{
    // substation filter
    if(allowed && !allowed.has(r.feeder)) return false;

    // feeder filter
    if(feeder !== "ALL" && r.feeder !== Number(feeder)) return false;

    // search filter (matches display label, including THEISS names)
    if(q){
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

function fillSubstationSelect(){
  const sel = document.querySelector("#substationSelect");
  sel.innerHTML = "";
  Object.keys(SUBSTATIONS).forEach(name=>{
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
  sel.value = state.substation;
}

function fillFeederSelect(){
  const sel = document.querySelector("#feederSelect");
  sel.innerHTML = `<option value="ALL">All Feeders</option>`;

  const allowed = allowedFeedersForSubstation();
  const feedersAll = Array.from(new Set(state.data.rows.map(r=>r.feeder))).sort((a,b)=>a-b);
  const feeders = allowed ? feedersAll.filter(f=>allowed.has(f)) : feedersAll;

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
    q.value = "";
    state.q = "";
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
    state.substation = "All Substations";
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

  fillSubstationSelect();
  fillFeederSelect();
  wireUI();
  render();
}

init().catch(err=>{
  console.error(err);
  document.querySelector("#loadError").style.display="block";
});
