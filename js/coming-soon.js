// js/coming-soon.js
(() => {
  const modal = document.getElementById("csModal");
  const gif = document.getElementById("csGif");
  const title = document.getElementById("csTitle");
  const closeBtn = document.getElementById("csCloseBtn");

  // One audio element reused for every open
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";

  function openModal(gifUrl, modalTitle, audioUrl) {
    gif.src = gifUrl || "";
    title.textContent = modalTitle || "Coming soon";
    modal.classList.remove("hidden");

    // Start audio (must be triggered by the click gesture)
    if (audioUrl) {
      audio.src = audioUrl;
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          // If a browser blocks autoplay for any reason, we just fail silently.
          // (Still shows the GIF; user can close normally.)
        });
      }
    }
  }

  function closeModal() {
    modal.classList.add("hidden");
    gif.src = "";

    // Stop audio
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    } catch {
      // ignore
    }
  }

  // Open from any coming-soon button
  document.querySelectorAll(".comingsoon-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openModal(btn.dataset.gif, btn.dataset.title, btn.dataset.audio);
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
