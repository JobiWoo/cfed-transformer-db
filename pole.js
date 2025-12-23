<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Pole Search</title>
  <link rel="stylesheet" href="./styles.css" />
</head>

<body>

  <!-- HEADER -->
  <header class="site-header">
    <div class="site-topbar">
      <div class="brand">
        <div class="brand-title">City of Cuyahoga Falls</div>
        <div class="brand-subtitle">Electric Department • Transformer Inventory</div>
      </div>

      <div class="top-actions">
        <a class="link-btn" href="./index.html">Main Menu</a>
        <a class="link-btn" href="./inventory.html">Inventory</a>
        <a class="link-btn" href="./serial.html">Serial Search</a>
        <a class="link-btn" href="./reports.html">Reports</a>
      </div>
    </div>

    <div class="app-header">
      <div class="app-title-row">
        <h1 class="app-title">Pole Search</h1>
        <div class="app-badge">Locate Transformers by Pole Number • Read-Only Demo</div>
      </div>
    </div>
  </header>

  <!-- MAIN CONTENT -->
  <main class="layout">
    <section class="grid-panel">

      <!-- Search bar -->
      <div class="grid-toolbar">
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; width:100%;">
          <div class="status" style="font-weight:900;">Enter Pole Number For Search</div>

          <input
            id="pole-input"
            class="search"
            type="search"
            placeholder="e.g. M12345 or O75498"
            style="min-width:260px;"
          />

          <button id="pole-search" class="btn btn-primary btn-small" type="button">Search</button>
        </div>

        <div id="status" class="status">Ready.</div>
      </div>

      <!-- Results table -->
      <div class="grid-wrap">
        <table class="grid" id="grid" aria-label="Pole Search Results">
          <thead>
            <tr>
              <th>Manufacturer</th>
              <th>Serial</th>
              <th>Status</th>
              <th>Location</th>
              <th>Pole</th>
            </tr>
          </thead>
          <tbody id="grid-body"></tbody>
        </table>
      </div>

      <div class="hint">
        Tip: Select a row, then use View/Edit to open the transformer details.
      </div>

    </section>

    <!-- RIGHT BUTTON BAR -->
    <aside class="button-bar">
      <button id="btn-viewedit" class="btn btn-icon" disabled type="button">
        <span class="icon">✎</span>
        <span>View/Edit</span>
      </button>

      <button id="btn-preview" class="btn btn-icon" disabled type="button">
        <span class="icon">🔍</span>
        <span>Preview</span>
      </button>

      <button id="btn-print" class="btn btn-icon" disabled type="button">
        <span class="icon">🖨️</span>
        <span>Print</span>
      </button>

      <button id="btn-quit" class="btn btn-icon" type="button">
        <span class="icon">⏻</span>
        <span>Quit</span>
      </button>
    </aside>
  </main>

  <!-- VIEW / EDIT MODAL -->
  <div id="modal" class="modal hidden" aria-hidden="true">
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <div class="modal-title">View / Edit Transformer</div>
          <div id="modal-subtitle" class="modal-subtitle"></div>
        </div>
        <button id="modal-close" class="btn btn-small" type="button">Close</button>
      </div>

      <div id="modal-body" class="modal-body"></div>

      <div class="modal-footer">
        <!-- ✅ NEW: obvious iPad-friendly back button at the bottom -->
        <button id="modal-back" class="btn btn-primary" type="button">
          Back to Results
        </button>

        <div class="note" style="margin-top:10px;">
          GitHub Pages demo is read-only.
          Future versions will connect directly to SQL Server.
        </div>
      </div>
    </div>
  </div>

  <!-- iPad-friendly modal behavior (bottom-sheet style) -->
  <style>
    #modal.hidden{ display:none !important; }

    #modal{
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.46);
      display:flex;
      align-items:center;      /* desktop */
      justify-content:center;  /* desktop */
      padding:18px;
      z-index:9999;
    }

    #modal .modal-card{
      width:min(1020px, 95vw);
      max-height:82vh;
      display:flex;
      flex-direction:column;
      background:var(--panel, #fff);
      border-radius:16px;
      box-shadow: 0 18px 55px rgba(0,0,0,.25);
      border:1px solid var(--line, #d8e0ea);
      overflow:hidden;
    }

    #modal .modal-body{
      overflow:auto;
      padding:14px;
    }

    #modal .modal-footer{
      border-top:1px solid var(--line, #d8e0ea);
      background:#fbfdff;
      padding:12px 14px;
    }

    @media (max-width: 980px){
      #modal{
        align-items:flex-end;
        justify-content:center;
        padding:0;
      }
      #modal .modal-card{
        width:100vw;
        max-height:86vh;
        border-radius:16px 16px 0 0;
      }
    }
  </style>

  <!-- Your existing pole logic -->
  <script src="./pole.js"></script>

  <!-- Wiring: Back button + backdrop close (does not replace pole.js) -->
  <script>
    (function(){
      const modal = document.getElementById("modal");
      const closeBtn = document.getElementById("modal-close");
      const backBtn  = document.getElementById("modal-back");

      if(!modal) return;

      function closeModal(){
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden","true");
      }

      if(closeBtn) closeBtn.addEventListener("click", closeModal);
      if(backBtn)  backBtn.addEventListener("click", closeModal);

      // Tap outside the card closes (iPad-friendly)
      modal.addEventListener("click", (e)=>{
        if(e.target === modal) closeModal();
      });
    })();
  </script>

</body>
</html>
