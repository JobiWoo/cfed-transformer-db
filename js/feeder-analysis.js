/* Feeder Analysis Report (static) - built from feeder_analysis_table.json */
const state = {
  data: null,
  feeder: "ALL",
  showBlocks: true,
  minKva: "",
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
    agg.transformers += 1; // Count([Feeder]) => row count
    const c = customers(r);
    agg.cust += c;
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
  const minKva = state.minKva === "" ? null : Number(state.minKva);

  return all.filter(r=>{
    if(feeder !== "ALL" && r.feeder !== Number(feeder)) return false;

    if(minKva !== null && kvaTotal(r) < minKva) return false;

    if(q){
      const s = `${r.feeder_label} ${cleanStr(r.block)}`.toLowerCase();
      if(!s.includes(q)) return false;
    }

    return true;
  });
}

function render(){
  const all = state.data.rows;
  const rows = filterRows(all);

  // Group feeder -> (optional) block
  const feederMap = new Map();
  for(const r of rows){
    const fkey = r.feeder;
    byKey(feederMap, fkey).push(r);
  }

  const feederKeys = Array.from(feederMap.keys()).sort((a,b)=>a-b);

  const tbody = document.querySelector("#reportBody");
  tbody.innerHTML = "";

  let systemRows = [];

  for(const f of feederKeys){
    const feederRows = feederMap.get(f);
    systemRows = systemRows.concat(feederRows);

    // Feeder header row (like "Feeder 101")
    const trH = document.createElement("tr");
    trH.className = "group";
    trH.innerHTML = `
      <td colspan="2"><span style="font-weight:900">Feeder ${f}</span></td>
      <td>${fmt2.format(buildAgg(feederRows).p1)}</td>
      <td>${fmt2.format(buildAgg(feederRows).p2)}</td>
      <td>${fmt2.format(buildAgg(feederRows).p3)}</td>
      <td>${fmt2.format(buildAgg(feederRows).total)}</td>
      <td>${fmt0.format(buildAgg(feederRows).transformers)}</td>
      <td>${fmt0.format(buildAgg(feederRows).cust)}</td>
    `;
    tbody.appendChild(trH);

    if(state.showBlocks){
      const blockMap = new Map();
      for(const r of feederRows){
        const b = cleanStr(r.block);
        if(b === "") continue;
        byKey(blockMap, b).push(r);
      }
      const blockKeys = Array.from(blockMap.keys()).sort((a,b)=>a.localeCompare(b));

      for(const b of blockKeys){
        const blockRows = blockMap.get(b);
        const a = buildAgg(blockRows);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td></td>
          <td>${b}</td>
          <td>${fmt2.format(a.p1)}</td>
          <td>${fmt2.format(a.p2)}</td>
          <td>${fmt2.format(a.p3)}</td>
          <td>${fmt2.format(a.total)}</td>
          <td>${fmt0.format(a.transformers)}</td>
          <td>${fmt0.format(a.cust)}</td>
        `;
        tbody.appendChild(tr);
      }
    }

    // Feeder Total row (like "101 Total")
    const aF = buildAgg(feederRows);
    const trT = document.createElement("tr");
    trT.className = "total";
    trT.innerHTML = `
      <td colspan="2">${f} Total</td>
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
    spacer.innerHTML = `<td colspan="8" style="height:8px;border-bottom:0;background:#fff"></td>`;
    tbody.appendChild(spacer);
  }

  // System Total
  const sys = buildAgg(systemRows);
  const sysRow = document.querySelector("#systemTotalRow");
  sysRow.innerHTML = `
    <td colspan="2">System Total</td>
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

  const cb = document.querySelector("#showBlocks");
  cb.addEventListener("change", ()=>{
    state.showBlocks = cb.checked;
    render();
  });

  const minKva = document.querySelector("#minKva");
  minKva.addEventListener("input", ()=>{
    state.minKva = minKva.value;
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
    state.showBlocks = true;
    state.minKva = "";
    state.q = "";
    sel.value = "ALL";
    cb.checked = true;
    minKva.value = "";
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
