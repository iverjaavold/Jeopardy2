/*
  Den røde knappen: spillerside, vertens trykkeliste og låsing.
  Knappen er låst de første 60 sekundene av et spørsmål. Hvert trykk låser den
  for alle i nye 20 sekunder (BUZZ_LOCK_MS), helt til verten lukker spørsmålet.
*/

function getQuestionBuzzes() {
  return (latestBuzzes || [])
    .filter(buzz => buzz.questionId === activeQuestionId && typeof buzz.pressedAt === "number")
    .sort((a, b) => a.pressedAt - b.pressedAt);
}

// Tilstanden til knappen akkurat nå:
//   waiting   – ingen spørsmål er åpent
//   thinking  – de første 60 sekundene
//   answering – noen har trykket, knappen er låst i 20 sekunder
//   open      – knappen kan trykkes
function getBuzzerGate() {
  if (!activeQuestionId || !buzzerUnlockAt) return { state: "waiting", presses: [] };

  const presses = getQuestionBuzzes();
  const lastPress = presses[presses.length - 1] || null;
  const openAt = Math.max(buzzerUnlockAt, lastPress ? lastPress.pressedAt + BUZZ_LOCK_MS : 0);
  const secondsLeft = Math.ceil((openAt - serverNow()) / 1000);

  if (secondsLeft <= 0) return { state: "open", presses, lastPress };
  return { state: lastPress ? "answering" : "thinking", secondsLeft, presses, lastPress };
}

function openRedButtonSetup() {
  const select = document.getElementById("buzzerTeamSelect");
  select.innerHTML = '<option value="">Velg lag...</option>';

  const availableTeams = joinedGameState?.teams || teams || [];
  availableTeams.forEach(team => {
    const option = document.createElement("option");
    option.value = team.name;
    option.textContent = team.name;
    select.appendChild(option);
  });

  document.getElementById("buzzerSetupError").textContent = "";
  hideJoinSubPanels();
  document.getElementById("buzzerSetupPanel").classList.remove("hidden");
}

function showBigRedButton() {
  const select = document.getElementById("buzzerTeamSelect");
  const error = document.getElementById("buzzerSetupError");
  selectedBuzzerTeam = select.value;

  if (!selectedBuzzerTeam) {
    error.textContent = "Velg hvilket lag du er med på.";
    return;
  }

  error.textContent = "";
  document.getElementById("buzzerSetupPanel").classList.add("hidden");
  document.getElementById("buzzerPanel").classList.remove("hidden");
  document.getElementById("buzzerTeamHeading").textContent = `Lag: ${selectedBuzzerTeam}`;
  isSendingBuzz = false;
  document.getElementById("bigRedButton").disabled = true;
  document.getElementById("buzzerStatus").textContent =
    "Venter på at spillverten åpner et spørsmål.";
  startBuzzListening(false);
  startBuzzerGateListening();
}

async function pressBuzzer() {
  if (!selectedBuzzerTeam || !currentGameCode) return;

  const button = document.getElementById("bigRedButton");
  const status = document.getElementById("buzzerStatus");

  if (isSendingBuzz || getBuzzerGate().state !== "open") {
    updateBuzzerAvailability();
    return;
  }

  isSendingBuzz = true;
  button.disabled = true;
  status.textContent = "Sender …";

  try {
    await backendSendBuzz(currentGameCode, {
      team: selectedBuzzerTeam,
      clientId: buzzerClientId,
      questionId: activeQuestionId
    });
    isSendingBuzz = false;
    updateBuzzerAvailability();
  } catch (error) {
    isSendingBuzz = false;
    if (error.status === 409) {
      updateBuzzerAvailability();
      status.textContent = "For sent – et annet lag rakk å trykke først.";
      return;
    }
    console.error(error);
    button.disabled = false;
    status.textContent = "Kunne ikke sende. Trykk på nytt.";
  }
}

function leaveBuzzer() {
  selectedBuzzerTeam = "";
  isSendingBuzz = false;
  stopBuzzListening();
  stopBuzzerGateListening();
  showJoinChoices();
}

function startBuzzListening(mode) {
  stopBuzzListening();
  if (!currentGameCode) return;

  const isHost = mode === true || mode === "host";
  const isOverview = mode === "overview";

  try {
    unsubscribeBuzzes = backendListenToBuzzes(currentGameCode, buzzes => {
      const sortedBuzzes = Object.entries(buzzes || {})
        .map(([key, buzz]) => ({ key, ...buzz }))
        .sort((a, b) => {
          const timeA = typeof a.pressedAt === "number" ? a.pressedAt : Number.MAX_SAFE_INTEGER;
          const timeB = typeof b.pressedAt === "number" ? b.pressedAt : Number.MAX_SAFE_INTEGER;
          return timeA - timeB || a.key.localeCompare(b.key);
        });

      latestBuzzes = sortedBuzzes;

      if (isHost || isOverview) {
        if (isHost) renderHostBuzzes(sortedBuzzes);
        renderQuestionBuzzResult();
        updateHostBuzzerGateStatus();
      } else {
        updateBuzzerAvailability();
      }
    });
  } catch (error) {
    console.error(error);
  }
}

function startBuzzerGateListening() {
  stopBuzzerGateListening();
  if (!currentGameCode) return;

  try {
    unsubscribeBuzzerGame = backendListenToGameState(currentGameCode, state => {
      buzzerUnlockAt = Number(state?.buzzerUnlockAt) || 0;
      activeQuestionId = state?.activeQuestionId || "";
      updateBuzzerAvailability();
    });

    buzzerGateInterval = setInterval(updateBuzzerAvailability, 100);
  } catch (error) {
    console.error(error);
    const status = document.getElementById("buzzerStatus");
    if (status) status.textContent = "Kunne ikke hente spørsmålsstatus.";
  }
}

function stopBuzzerGateListening() {
  if (unsubscribeBuzzerGame) {
    unsubscribeBuzzerGame();
    unsubscribeBuzzerGame = null;
  }
  if (buzzerGateInterval) {
    clearInterval(buzzerGateInterval);
    buzzerGateInterval = null;
  }
}

function updateBuzzerAvailability() {
  const button = document.getElementById("bigRedButton");
  const status = document.getElementById("buzzerStatus");
  if (!button || !status || isSendingBuzz) return;

  const gate = getBuzzerGate();

  if (gate.state === "waiting") {
    button.disabled = true;
    button.textContent = "VENT";
    status.textContent = "Venter på at spillverten åpner et spørsmål.";
    return;
  }

  if (gate.state === "thinking") {
    button.disabled = true;
    button.textContent = gate.secondsLeft;
    status.textContent = `Knappen er låst – åpner om ${gate.secondsLeft} sekunder.`;
    return;
  }

  if (gate.state === "answering") {
    button.disabled = true;
    button.textContent = gate.secondsLeft;
    status.textContent = gate.lastPress.clientId === buzzerClientId
      ? `Registrert! Dere har ordet. Knappen åpner igjen om ${gate.secondsLeft} sek.`
      : `${gate.lastPress.team} trykket – knappen åpner igjen om ${gate.secondsLeft} sek.`;
    return;
  }

  button.disabled = false;
  button.textContent = "TRYKK!";
  status.textContent = gate.presses.length
    ? "Knappen er åpen igjen – trykk nå!"
    : "Knappen er åpen – trykk nå!";
}

function updateHostBuzzerGateStatus() {
  const status = document.getElementById("hostBuzzerGateStatus");
  if (!status) return;

  const gate = getBuzzerGate();
  status.classList.remove("waiting", "locked", "open");

  if (gate.state === "waiting") {
    status.classList.add("waiting");
    status.textContent = "Venter på at et spørsmål åpnes.";
  } else if (gate.state === "thinking") {
    status.classList.add("locked");
    status.textContent = `Rød knapp låst – åpner om ${gate.secondsLeft} sek`;
  } else if (gate.state === "answering") {
    status.classList.add("locked");
    status.textContent = `${gate.lastPress.team} har ordet – knappen åpner igjen om ${gate.secondsLeft} sek`;
  } else {
    status.classList.add("open");
    status.textContent = "Den røde knappen er åpen!";
  }
}

function stopBuzzListening() {
  if (unsubscribeBuzzes) {
    unsubscribeBuzzes();
    unsubscribeBuzzes = null;
  }
}

function renderQuestionBuzzResult() {
  const panel = document.getElementById("questionBuzzResult");
  if (!panel) return;

  const gate = getBuzzerGate();
  panel.classList.remove("open", "winner");

  if (gate.state === "waiting") {
    panel.textContent = "Resultatet vises her når den røde knappen åpner.";
    return;
  }

  if (gate.state === "thinking") {
    panel.textContent = "Den røde knappen er fortsatt låst.";
    return;
  }

  if (gate.state === "open") {
    panel.classList.add("open");
    panel.textContent = gate.presses.length
      ? "Knappen er åpen igjen – venter på neste trykk …"
      : "Knappen er åpen – venter på første trykk …";
    return;
  }

  // Reaksjonstid regnes fra da knappen sist åpnet.
  const previousPress = gate.presses[gate.presses.length - 2];
  const openedAt = previousPress
    ? Math.max(buzzerUnlockAt, previousPress.pressedAt + BUZZ_LOCK_MS)
    : buzzerUnlockAt;
  const elapsedSeconds = (Math.max(0, gate.lastPress.pressedAt - openedAt) / 1000).toLocaleString("no-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  panel.classList.add("winner");
  panel.replaceChildren();

  const winner = document.createElement("strong");
  winner.textContent = `🏆 ${gate.lastPress.team} trykket${previousPress ? "" : " først"}!`;

  const details = document.createElement("span");
  details.textContent =
    `${elapsedSeconds} sekunder etter at knappen åpnet · åpner igjen om ${gate.secondsLeft} sek`;

  panel.append(winner, details);
}

function renderHostBuzzes(buzzes) {
  const list = document.getElementById("hostBuzzList");
  const emptyMessage = document.getElementById("noBuzzesMessage");
  if (!list || !emptyMessage) return;

  list.innerHTML = "";
  emptyMessage.classList.toggle("hidden", buzzes.length > 0);

  buzzes.forEach((buzz, index) => {
    const item = document.createElement("li");
    item.textContent = `${buzz.team}${index === 0 ? " – FØRST!" : ""}`;
    list.appendChild(item);
  });
}

async function resetBuzzers(showError = true) {
  if (!currentGameCode) return;
  try {
    await backendResetBuzzes(currentGameCode);
  } catch (error) {
    console.error(error);
    if (showError) alert("Kunne ikke nullstille den røde knappen.");
  }
}
