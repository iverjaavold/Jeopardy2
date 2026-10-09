/*
  Oppstart og globale hendelser.
*/

const CLOCK_SYNC_INTERVAL_MS = 5 * 60 * 1000;

document.addEventListener("DOMContentLoaded", function() {
  renderQuestionSetPicker();
  renderRules();

  // Kom man hit via QR-koden (/?kode=1234), kobles man rett til spillet.
  const params = new URLSearchParams(location.search);
  const kode = params.get("kode");
  if (kode) history.replaceState(null, "", location.pathname);
  if (/^\d{4}$/.test(kode || "")) {
    joinGameFromLanding();
    document.getElementById("joinCodeInput").value = kode;
    joinGameWithCode();
  }

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
    closeJoinQr();

    const backdrop = document.getElementById("extraPointsBackdrop");
    if (backdrop && backdrop.classList.contains("show")) {
      closeExtraPoints();
    }
  }
});
