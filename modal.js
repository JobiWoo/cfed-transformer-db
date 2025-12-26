/* modal.js
   Shared iPad-friendly modal controller for CFED pages.
   Assumes the page contains:
     #modal (overlay), #modal-close (top close button),
     optional #modal-back (footer back button),
     optional #modal-body and #modal-subtitle (content filled by page JS)

   Usage:
     <script src="./modal.js"></script>
     <script>
       Modal.init(); // once on page load
       // ... later, after filling modal content:
       Modal.open();
       // ... can also call Modal.close();
     </script>
*/

(function () {
  "use strict";

  const Modal = {
    _modal: null,
    _closeBtn: null,
    _backBtn: null,
    _prevBodyOverflow: "",
    _inited: false,

    init() {
      if (this._inited) return;
      this._inited = true;

      this._modal = document.getElementById("modal");
      if (!this._modal) {
        // No modal on this page — safe no-op.
        return;
      }

      this._closeBtn = document.getElementById("modal-close");
      this._backBtn = document.getElementById("modal-back");

      // Button wiring
      if (this._closeBtn) this._closeBtn.addEventListener("click", () => this.close());
      if (this._backBtn) this._backBtn.addEventListener("click", () => this.close());

      // Backdrop click closes
      this._modal.addEventListener("click", (e) => {
        if (e.target === this._modal) this.close();
      });

      // ESC closes (desktop convenience)
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (!this._modal || this._modal.classList.contains("hidden")) return;
        this.close();
      });
    },

    open(options = {}) {
      // options: { focusSelector?: string }
      if (!this._modal) return;

      // Lock background scroll (iPad)
      this._prevBodyOverflow = document.body.style.overflow || "";
      document.body.style.overflow = "hidden";

      this._modal.classList.remove("hidden");
      this._modal.setAttribute("aria-hidden", "false");

      // Focus (accessibility)
      const focusSelector =
        typeof options.focusSelector === "string" ? options.focusSelector : null;

      let focusEl = null;
      if (focusSelector) focusEl = this._modal.querySelector(focusSelector);
      if (!focusEl && this._closeBtn) focusEl = this._closeBtn;

      // Ensure focus after layout (helps on some mobile browsers)
      if (focusEl && typeof focusEl.focus === "function") {
        setTimeout(() => {
          try { focusEl.focus(); } catch {}
        }, 0);
      }
    },

    close() {
      if (!this._modal) return;

      this._modal.classList.add("hidden");
      this._modal.setAttribute("aria-hidden", "true");

      // Restore background scroll
      document.body.style.overflow = this._prevBodyOverflow;
    },

    isOpen() {
      if (!this._modal) return false;
      return !this._modal.classList.contains("hidden");
    }
  };

  // Expose globally
  window.Modal = Modal;
})();
