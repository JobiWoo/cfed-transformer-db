// js/pole-locate.js
(() => {
  const DATA_URL = "./data/poles.json";

  const el = {
    input: document.getElementById("poleInput"),
    btnSearch: document.getElementById("btnSearch"),
    btnClear: document.getElementById("btnClear"),
    status: document.getElementById("statusText"),
    match: document.getElementById("matchText"),

    form: document.getElementById("resultForm"),
    empty: document.getElementById("emptyState"),

    vPoleNo: document.getElementById("vPoleNo"),
    vPoleId: document.getElementById("vPoleId"),
    vOwner: document.getElementById("vOwner"),
    vMaterial: document.getElementById("vMaterial"),
    vHeight: document.getElementById("vHeight"),
    vClass: document.getElementById("vClass"),
    vAddress: document.getElementById("vAddress"),
    vStreet: document.getElementById("vStreet"),
    vLocation: document.getElementById("vLocation"),
    vSect: document.getElementById("vSect"),
    vBlk: document.getElementById("vBlk"),
    vSecDist: document.getElementById("vSecDist"),
    vYearSet: document.getElementById("vYearSet"),
    vRemarks: document.getElementById("vRemarks"),

    btnCopyPoleNo: document.getElementById("btnCopyPoleNo"),
    btnCopyPoleId: document.getElementById("btnCopyPoleId"),
  };

  let poleIndex = new Map();
  let lastRecord = null;

  function norm(v) {
    return String(v ?? "").trim().replace(/\s+/g, "").toLowerCase();
  }

  function safe(v) {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return (s === "NaN") ? "" : s;
  }

  function setReady(ready) {
    el.btnSearch.disabled = !ready;
    el.btnClear.disabled = !ready;
  }

  function setActionsEnabled(enabled) {
    el.btnCopyPoleNo.disabled = !enabled;
    el.btnCopyPoleId.disabled = !enabled;
  }

  function showEmpty(msg) {
    el.form.style.display = "none";
    el.empty.style.display = "block";
    el.empty.textContent = msg || "Enter a pole number above to view the pole record.";
    el.match.textContent = "";
    lastRecord = null;
    setActionsEnabled(false);
  }

  function fill(rec) {
    lastRecord = rec;

    el.vPoleNo.textContent = safe(rec.Pole_No) || "—";
    el.vPoleId.textContent = safe(rec.Pole_ID) || "—";
    el.vOwner.textContent = safe(rec.Owner) || "—";
    el.vMaterial.textContent = safe(rec.Material) || "—";
    el.vHeight.textContent = safe(rec.Height) || "—";
    el.vClass.textContent = safe(rec.Class) || "—";
    el.vAddress.textContent = safe(rec.Address) || "—";
    el.vStreet.textContent = safe(rec.Street) || "—";
    el.vLocation.textContent = safe(rec.Location) || "—";
    el.vSect.textContent = safe(rec.Sect_No) || "—";
    el.vBlk.textContent = safe(rec.Blk_No) || "—";
    el.vSecDist.textContent = safe(rec.Sec_Dist) || "—";
    el.vYearSet.textContent = safe(rec.Year_Set) || "—";
    el.vRemarks.textContent = safe(rec.Remarks) || "—";

    el.form.style.display = "block";
    el.empty.style.display = "none";

    el.match.textContent = `Match found`;
    setActionsEnabled(true);
  }

  function search() {
    const raw = el.input.value || "";
    const key = norm(raw);

    if (!key) {
      showEmpty("Enter a pole number (example: O83271).");
      return;
    }

    const rec = poleIndex.get(key);
    if (!rec) {
      showEmpty(`No match found for: ${raw}`);
      return;
    }

    fill(rec);
  }

  function clearAll() {
    el.input.value = "";
    el.input.focus();
    showEmpty();
  }

  async function load() {
    el.status.textContent = "Loading pole data…";
    setReady(false);
    showEmpty("Loading…");

    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${DATA_URL}`);
      const rows = await res.json();

      poleIndex = new Map();
      for (const r of rows) {
        const k = norm(r.Pole_No);
        if (!k) continue;
        if (!poleIndex.has(k)) poleIndex.set(k, r);
      }

      el.status.textContent = `Loaded ${poleIndex.size.toLocaleString()} poles`;
      setReady(true);
      showEmpty();
    } catch (err) {
      console.error(err);
      el.status.textContent = "Error loading poles.json";
      showEmpty("Could not load pole data. Check that data/poles.json exists in the repository.");
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  // Events
  el.btnSearch.addEventListener("click", search);
  el.btnClear.addEventListener("click", clearAll);

  el.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") search();
  });

  el.btnCopyPoleNo.addEventListener("click", async () => {
    if (!lastRecord) return;
    await copyText(safe(lastRecord.Pole_No));
  });

  el.btnCopyPoleId.addEventListener("click", async () => {
    if (!lastRecord) return;
    await copyText(safe(lastRecord.Pole_ID));
  });

  // Boot
  load();
})();
