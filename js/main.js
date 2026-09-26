/*
  Oppstart og globale hendelser.
*/

document.addEventListener("DOMContentLoaded", function() {
  renderQuestionSetPicker();

  // Lukk regler hvis man klikker utenfor modalen
  document.getElementById("rulesBackdrop").addEventListener("click", function(e) {
    if (e.target === this) {
      closeRules();
    }
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    const backdrop = document.getElementById("extraPointsBackdrop");
    if (backdrop && backdrop.classList.contains("show")) {
      closeExtraPoints();
    }
  }
});
