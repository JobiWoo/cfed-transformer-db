/* Feeder Analysis Report (static) - built from feeder_analysis_table.json
   Simplified foreman view:
   - No Block column
   - No Block breakdown toggle
   - No Min total kVA filter
*/

const state = {
  data: null,
  feeder: "ALL",
  q: "",
};

const fmt0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function n(v){ return Number.isFinite(v) ? v : 0; }
function cleanStr(s){ return (s ?? "").toString().trim(); }

function customers(row){
  return n(row.phase1_cust)+n(row.phase2_cust)+n(row.phase3_cust)+n(row.cust_3ph);
}

function kvaTotal(row){
  return n(row.phase1_kva)+n(row.phase2_kva)+n(row.phase3_kva);
}

function buildAgg(rows){
  const agg = {
    transformers: 0,
    cust: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    total: 0
  };
  for(const r of rows){
    // Access: Count([Feeder]) -> row count
    agg.transformers += 1;

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

function filterRows(all){
  const feeder = state.feeder;
  const q = state.q.trim().toLowerCase();

  return all.filter(r=>{
    if(feeder !== "ALL" && r.feeder !== Number(feeder)) return false;

    if(q){
      const s = `${r.feeder_label}`.toLowerCase();
      if(!s.includes(q)) return false;
    }
    return true;
  });
}

function render(){
  const all = state.data.rows;
  const rows = filterRows(all);

  // Group by feeder
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

    // Feeder row
    const trH = document.createElement("tr");
    trH.className = "group";
    trH.innerHTML = `
      <td><span style="font-weight:900">Feeder ${f}</span></td>
      <td>${fmt2.format(aF.p1)}</td>
      <td>${fmt2.format(aF.p2)}</td>
      <td>${fmt2.format(aF.p3)}</td>
      <td>${fmt2.format(aF.total)}</td>
      <td>${fmt0.format(aF.transformers)}</td>
      <td>${fmt0.format(aF.cust)}</td>
    `;
    tbody.appendChild(trH);

    // Feeder Total row (kept to mirror the legacy feel)
    const trT = document.createElement("tr");
    trT.className = "total";
    trT.innerHTML = `
      <td>${f} Total</td>
      <td>${fmt2.format(aF.p1)}</td>
      <td>${fmt2.format(aF.p2)}</td>
      <td>${fmt2.format(aF.p3)}</td>
      <td>${fmt2.format(aF.total)}</td>
      <td>${fmt0.format(aF.transformers)}</td>
      <td>${fmt0.format(aF.cust)}</td>
    `;
    tbody.appendChild(trT);

    // spacer row
    const spacer = document.createElement("tr");
    spacer.innerHTML = `<td colspan="7" style="height:8px;border-bottom:0;background:#fff"></td>`;
    tbody.appendChild(spacer);
  }

  // System Total
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

  // Summary chips
  document.querySelector("#metaRows").textContent = fmt0.format(rows.length);
  document.querySelector("#metaFeeders").textContent = fmt0.format(feederKeys.length);
}

function fillFeederSelect(){
  const sel = document.querySelector("#feederSelect");
  sel.innerHTML = `<option value="ALL">All Feeders</option>`;
  const feeders = Array.from(new Set(state.data.rows.map(r=>r.feeder))).sort((a,b)=>a-b);
  for(const f of feeders){
    const opt = document.createElement("option");
    opt.value = String(f);
    opt.textContent = `Feeder ${f}`;
    sel.appendChild(opt);
  }
}

function wireUI(){
  const sel = document.querySelector("#feederSelect");
  sel.addEventListener("change", ()=>{
    state.feeder = sel.value;
    render();
  });

  const q = document.querySelector("#q");
  q.addEventListener("input", ()=>{
    state.q = q.value;
    render();
  });

  document.querySelector("#btnPrint").addEventListener("click", ()=>window.print());
  document.querySelector("#btnReset").addEventListener("click", ()=>{
    state.feeder = "ALL";
    state.q = "";
    sel.value = "ALL";
    q.value = "";
    render();
  });
}

async function init(){
  const res = await fetch("./data/feeder_analysis_table.json");
  state.data = await res.json();

  document.querySelector("#printedDate").textContent =
    new Date().toLocaleDateString(undefined, { year:"numeric", month:"2-digit", day:"2-digit" });

  fillFeederSelect();
  wireUI();
  render();
}

init().catch(err=>{
  console.error(err);
  document.querySelector("#loadError").style.display="block";
});
