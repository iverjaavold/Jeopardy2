/*
  Oppstart og globale hendelser.
*/

const CLOCK_SYNC_INTERVAL_MS = 5 * 60 * 1000;

document.addEventListener("DOMContentLoaded", function() {
  renderQuestionSetPicker();
  renderRules();

  // Hold klokka i takt med serveren, også etter at en telefon har vært i dvale.
  syncServerClock();
  setInterval(syncServerClock, CLOCK_SYNC_INTERVAL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncServerClock();
  });

  // Lukk regler hvis man klikker utenfor modalen
  document.getElementById("rulesBackdrop").addEventListener("click", function(e) {
    if (e.target === this) {
      closeRules();
    }
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeImageZoom();

    const backdrop = document.getElementById("extraPointsBackdrop");
    if (backdrop && backdrop.classList.contains("show")) {
      closeExtraPoints();
    }
  }
});
