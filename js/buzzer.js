/*
  Den røde knappen: spillerside, vertens trykkeliste og låsing i 60 sekunder.
*/

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
  hasCurrentClientBuzz = false;
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

  if (!activeQuestionId || !buzzerUnlockAt || Date.now() < buzzerUnlockAt) {
    updateBuzzerAvailability();
    return;
  }

  if (hasCurrentClientBuzz) return;

  button.disabled = true;
  status.textContent = "Sender …";

  try {
    await backendSendBuzz(currentGameCode, {
      team: selectedBuzzerTeam,
      clientId: buzzerClientId,
      questionId: activeQuestionId
    });
    status.textContent = "Registrert! Vent til spillverten nullstiller knappen.";
  } catch (error) {
    console.error(error);
    button.disabled = false;
    status.textContent = "Kunne ikke sende. Trykk på nytt.";
  }
}

function leaveBuzzer() {
  selectedBuzzerTeam = "";
  hasCurrentClientBuzz = false;
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

      if (isHost || isOverview) {
        latestHostBuzzes = sortedBuzzes;
        if (isHost) renderHostBuzzes(sortedBuzzes);
        renderQuestionBuzzResult(sortedBuzzes);
      } else {
        const myBuzz = sortedBuzzes.find(buzz => buzz.clientId === buzzerClientId);
        const button = document.getElementById("bigRedButton");
        const status = document.getElementById("buzzerStatus");

        hasCurrentClientBuzz = Boolean(myBuzz);

        if (!myBuzz) {
          updateBuzzerAvailability();
        } else {
          if (button) button.disabled = true;
          const place = sortedBuzzes.findIndex(buzz => buzz.key === myBuzz.key) + 1;
          if (status) status.textContent = `Registrert som nummer ${place}! Vent på neste runde.`;
        }
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

    buzzerGateInterval = setInterval(updateBuzzerAvailability, 250);
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
  if (!button || !status || hasCurrentClientBuzz) return;

  if (!activeQuestionId || !buzzerUnlockAt) {
    button.disabled = true;
    button.textContent = "VENT";
    status.textContent = "Venter på at spillverten åpner et spørsmål.";
    return;
  }

  const millisecondsLeft = buzzerUnlockAt - Date.now();

  if (millisecondsLeft > 0) {
    const secondsLeft = Math.ceil(millisecondsLeft / 1000);
    button.disabled = true;
    button.textContent = secondsLeft;
    status.textContent = `Knappen er låst – åpner om ${secondsLeft} sekunder.`;
    return;
  }

  button.disabled = false;
  button.textContent = "TRYKK!";
  status.textContent = "Knappen er åpen – trykk nå!";
}

function updateHostBuzzerGateStatus() {
  const status = document.getElementById("hostBuzzerGateStatus");
  if (!status) return;

  status.classList.remove("waiting", "locked", "open");

  if (!activeQuestionId || !buzzerUnlockAt) {
    status.classList.add("waiting");
    status.textContent = "Venter på at et spørsmål åpnes.";
    return;
  }

  const millisecondsLeft = buzzerUnlockAt - Date.now();

  if (millisecondsLeft > 0) {
    const secondsLeft = Math.ceil(millisecondsLeft / 1000);
    status.classList.add("locked");
    status.textContent = `Rød knapp låst – åpner om ${secondsLeft} sek`;
    return;
  }

  status.classList.add("open");
  status.textContent = "Den røde knappen er åpen!";
}

function stopBuzzListening() {
  if (unsubscribeBuzzes) {
    unsubscribeBuzzes();
    unsubscribeBuzzes = null;
  }
}

function renderQuestionBuzzResult(buzzes = latestHostBuzzes) {
  const panel = document.getElementById("questionBuzzResult");
  if (!panel) return;

  panel.classList.remove("open", "winner");

  if (!activeQuestionId || !buzzerUnlockAt) {
    panel.textContent = "Resultatet vises her når den røde knappen åpner.";
    return;
  }

  if (Date.now() < buzzerUnlockAt) {
    panel.textContent = "Den røde knappen er fortsatt låst.";
    return;
  }

  const validBuzzes = (buzzes || [])
    .filter(buzz =>
      buzz.questionId === activeQuestionId &&
      typeof buzz.pressedAt === "number"
    )
    .sort((a, b) => a.pressedAt - b.pressedAt);

  const firstBuzz = validBuzzes[0];

  if (!firstBuzz) {
    panel.classList.add("open");
    panel.textContent = "Knappen er åpen – venter på første trykk …";
    return;
  }

  const elapsedMilliseconds = Math.max(0, firstBuzz.pressedAt - buzzerUnlockAt);
  const elapsedSeconds = (elapsedMilliseconds / 1000).toLocaleString("no-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  panel.classList.add("winner");
  panel.replaceChildren();

  const winner = document.createElement("strong");
  winner.textContent = `🏆 ${firstBuzz.team} trykket først!`;

  const reactionTime = document.createElement("span");
  reactionTime.textContent = `${elapsedSeconds} sekunder etter at knappen åpnet`;

  panel.append(winner, reactionTime);
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
