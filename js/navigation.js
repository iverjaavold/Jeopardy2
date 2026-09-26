/*
  Navigasjon mellom skjermer: forside, bli med, valg, regler og vert/seer-modus.
*/

function showRules() {
  document.getElementById("rulesBackdrop").classList.add("show");
}

function closeRules() {
  document.getElementById("rulesBackdrop").classList.remove("show");
}

function showAppShell() {
  document.getElementById("landingScreen").classList.add("hidden");
  document.getElementById("appHeader").classList.remove("hidden");
  document.getElementById("appMain").classList.remove("hidden");
}

function createGameFromLanding() {
  showAppShell();
  isLiveMode = false;
  currentGameCode = "";
  joinedGameState = null;
  stopBuzzListening();
  updateGameCodeDisplay();
  setHostMode(true);

  document.getElementById("joinPanel").classList.add("hidden");
  hideJoinSubPanels();
  document.getElementById("gamePanel").classList.add("hidden");
  document.getElementById("setupPanel").classList.remove("hidden");
}

function joinGameFromLanding() {
  showAppShell();
  stopBuzzListening();
  hideJoinSubPanels();

  document.getElementById("setupPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.add("hidden");
  document.getElementById("joinPanel").classList.remove("hidden");
  document.getElementById("joinError").textContent = "";
  document.getElementById("joinCodeInput").value = "";
  document.getElementById("joinCodeInput").focus();
}

async function joinGameWithCode() {
  const input = document.getElementById("joinCodeInput");
  const error = document.getElementById("joinError");
  const code = input.value.trim();

  error.textContent = "";

  if (!/^\d{4}$/.test(code)) {
    error.textContent = "Skriv inn en gyldig firesifret kode.";
    input.focus();
    return;
  }

  try {
    const exists = await backendGameExists(code);

    if (!exists) {
      error.textContent = "Fant ikke et aktivt spill med denne koden.";
      return;
    }

    joinedGameState = await backendLoadGameState(code);
    if (!joinedGameState || !Array.isArray(joinedGameState.teams)) {
      error.textContent = "Spillet har ingen lag ennå.";
      return;
    }

    currentGameCode = code;
    updateGameCodeDisplay();
    document.getElementById("selectedGameCode").textContent = code;
    showJoinChoices();
  } catch (connectionError) {
    console.error(connectionError);
    error.textContent = "Kunne ikke koble til spillet. Prøv igjen.";
  }
}

function hideJoinSubPanels() {
  ["joinChoicePanel", "buzzerSetupPanel", "buzzerPanel"].forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.classList.add("hidden");
  });
}

function showJoinCodePanel() {
  stopBuzzListening();
  stopBuzzerGateListening();
  if (unsubscribeLiveGame) {
    unsubscribeLiveGame();
    unsubscribeLiveGame = null;
  }
  hideJoinSubPanels();
  document.getElementById("gamePanel").classList.add("hidden");
  document.getElementById("joinPanel").classList.remove("hidden");
  document.getElementById("joinError").textContent = "";
  document.getElementById("joinCodeInput").focus();
}

function showJoinChoices() {
  if (!currentGameCode) {
    showJoinCodePanel();
    return;
  }

  stopBuzzListening();
  if (unsubscribeLiveGame) {
    unsubscribeLiveGame();
    unsubscribeLiveGame = null;
  }
  isLiveMode = false;
  document.getElementById("joinPanel").classList.add("hidden");
  document.getElementById("setupPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.add("hidden");
  hideJoinSubPanels();
  document.getElementById("selectedGameCode").textContent = currentGameCode;
  document.getElementById("joinChoicePanel").classList.remove("hidden");
}

function openGameOverview() {
  hideJoinSubPanels();
  setHostMode(false);
  startLiveUpdates(false, currentGameCode);
}

function setHostMode(isHost) {
  document.querySelectorAll(".host-only").forEach(element => {
    element.classList.toggle("hidden", !isHost);
  });
  document.querySelectorAll(".viewer-only").forEach(element => {
    element.classList.toggle("hidden", isHost);
  });
  const viewerActions = document.getElementById("viewerActions");
  if (viewerActions) viewerActions.classList.toggle("hidden", isHost);
}

function backToLanding() {
  stopQuestionTimer();

  if (unsubscribeLiveGame) {
    unsubscribeLiveGame();
    unsubscribeLiveGame = null;
  }
  stopBuzzListening();
  stopBuzzerGateListening();

  isLiveMode = false;
  currentGameCode = "";
  updateGameCodeDisplay();

  document.getElementById("appHeader").classList.add("hidden");
  document.getElementById("appMain").classList.add("hidden");
  document.getElementById("setupPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.add("hidden");
  document.getElementById("joinPanel").classList.add("hidden");
  hideJoinSubPanels();
  setHostMode(true);

  document.getElementById("landingScreen").classList.remove("hidden");
}
