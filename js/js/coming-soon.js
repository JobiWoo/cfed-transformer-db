// js/coming-soon.js
(() => {
  const modal = document.getElementById("csModal");
  const gif = document.getElementById("csGif");
  const title = document.getElementById("csTitle");
  const closeBtn = document.getElementById("csCloseBtn");

  function openModal(gifUrl, modalTitle) {
    gif.src = gifUrl || "";
    title.textContent = modalTitle || "Coming soon";
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
    gif.src = "";
  }

  // Open from any coming-soon button
  document.querySelectorAll(".comingsoon-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openModal(btn.dataset.gif, btn.dataset.title);
    });
  });

  // Close controls
  closeBtn.addEventListener("click", closeModal);

  // Close on backdrop click
  modal.addEventListener("click", (e) => {
    if (e.target && e.target.dataset && e.target.dataset.close) {
      closeModal();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
})();
