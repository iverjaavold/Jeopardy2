/*
  Lagring, lasting og live-synkronisering av spilltilstanden.
*/

// Bildene holdes utenfor brettet som synkes, så hver lagring blir liten.
// Bare bildet til det åpne spørsmålet sendes med (i activeQuestion).
function questionsWithoutImages(questions) {
  return questions.map(category => ({
    category: category.category,
    clues: category.clues.map(({ image, ...clue }) => clue)
  }));
}

// Henter bildene fra det lokale spørsmålssettet når et lagret spill lastes inn igjen.
function restoreImagesFromSet(setId) {
  const set = setId ? getQuestionSet(setId) : null;
  if (!set) return;

  QUESTIONS.forEach((category, categoryIndex) => {
    category.clues.forEach((clue, clueIndex) => {
      const localClue = set.questions[categoryIndex]?.clues[clueIndex];
      if (localClue?.image && localClue.question === clue.question) {
        clue.image = localClue.image;
      }
    });
  });
}

function getGameState() {
  return {
    gameCode: currentGameCode,
    setId: activeSetId,
    teams: teams,
    questions: questionsWithoutImages(QUESTIONS),
    usedQuestions: Array.from(usedQuestions),
    currentTeamIndex: currentTeamIndex,
    activeQuestionId: activeQuestionId,
    activeQuestion: currentQuestion ? {
      id: currentQuestion.id,
      category: currentQuestion.category,
      value: currentQuestion.value,
      question: currentQuestion.question,
      image: currentQuestion.image || ""
    } : null,
    buzzerUnlockAt: buzzerUnlockAt,
    updatedAt: new Date().toISOString()
  };
}

function applyGameState(state) {
  if (!state) {
    alert("Fant ikke noe lagret spill.");
    return;
  }

  teams = state.teams || [];
  if (Array.isArray(state.questions) && state.questions.length > 0) {
    QUESTIONS = cloneQuestions(state.questions);
    restoreImagesFromSet(state.setId);
  }
  usedQuestions = new Set(state.usedQuestions || []);
  currentTeamIndex = state.currentTeamIndex || 0;
  activeQuestionId = state.activeQuestionId || "";
  buzzerUnlockAt = Number(state.buzzerUnlockAt) || 0;
  currentGameCode = state.gameCode || currentGameCode;
  updateGameCodeDisplay();
  updateHostBuzzerGateStatus();

  if (teams.length < 2) {
    alert("Det lagrede spillet har ikke nok lag.");
    return;
  }

  document.getElementById("setupPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.remove("hidden");
  setHostMode(true);
  startBuzzListening(true);

  renderScoreBoard();
  renderBoard();
}

async function saveGame(showConfirmation = true) {
  if (!currentGameCode) {
    if (showConfirmation) alert("Spillet har ingen spillkode.");
    return;
  }

  try {
    await backendSaveGameState(currentGameCode, getGameState());
    if (showConfirmation) {
      alert(`Spillet med kode ${currentGameCode} er lagret!`);
    }
  } catch (error) {
    console.error(error);
    if (showConfirmation) alert("Kunne ikke lagre spill: " + error.message);
  }
}

async function loadGame() {
  const code = prompt("Skriv inn den firesifrede spillkoden:", currentGameCode);

  if (code === null) return;

  if (!/^\d{4}$/.test(code.trim())) {
    alert("Skriv inn en gyldig firesifret kode.");
    return;
  }

  try {
    currentGameCode = code.trim();
    const state = await backendLoadGameState(currentGameCode);
    applyGameState(state);
  } catch (error) {
    console.error(error);
    alert("Kunne ikke laste spill: " + error.message);
  }
}

function startLiveUpdates(showConfirmation = true, code = currentGameCode) {
  if (!code) {
    alert("Skriv inn en spillkode først.");
    return;
  }

  if (unsubscribeLiveGame) {
    unsubscribeLiveGame();
  }

  currentGameCode = code;
  isLiveMode = true;
  stopBuzzListening();
  hideJoinSubPanels();
  setHostMode(false);
  startBuzzListening("overview");

  unsubscribeLiveGame = backendListenToGameState(code, function (state) {
    if (!state) {
      document.getElementById("joinError").textContent =
        "Spillet finnes ikke lenger eller er avsluttet.";
      return;
    }

    applyGameStateLive(state);
  });

  if (showConfirmation) {
    alert("Live-visning er startet! Du kan ikke trykke på spørsmålene i live-modus.");
  }
}

function syncLiveQuestion(activeQuestion) {
  const backdrop = document.getElementById("modalBackdrop");

  if (!activeQuestion || !activeQuestion.id || (!activeQuestion.question && !activeQuestion.image)) {
    stopQuestionTimer();
    currentQuestion = null;
    showQuestionImage("");
    if (backdrop) backdrop.style.display = "none";
    return;
  }

  currentQuestion = {
    id: activeQuestion.id,
    category: activeQuestion.category || "Spørsmål",
    value: activeQuestion.value || "",
    question: activeQuestion.question || "",
    answer: "",
    image: activeQuestion.image || ""
  };

  document.getElementById("modalCategory").textContent =
    `${currentQuestion.category}${currentQuestion.value !== "" ? ` - ${currentQuestion.value} poeng` : ""}`;
  document.getElementById("modalQuestion").textContent = currentQuestion.question;
  showQuestionImage(currentQuestion.image);

  const answerBox = document.getElementById("modalAnswer");
  answerBox.style.display = "none";
  answerBox.textContent = "";

  cancelScoreAction();
  setHostMode(false);
  if (backdrop) backdrop.style.display = "flex";
  renderQuestionBuzzResult(latestBuzzes);
  startQuestionTimer();
}

function applyGameStateLive(state) {
  teams = state.teams || [];
  if (Array.isArray(state.questions) && state.questions.length > 0) {
    QUESTIONS = cloneQuestions(state.questions);
  }
  usedQuestions = new Set(state.usedQuestions || []);
  currentTeamIndex = state.currentTeamIndex || 0;
  activeQuestionId = state.activeQuestionId || "";
  buzzerUnlockAt = Number(state.buzzerUnlockAt) || 0;
  currentGameCode = state.gameCode || currentGameCode;
  updateGameCodeDisplay();
  updateHostBuzzerGateStatus();
  syncLiveQuestion(state.activeQuestion || null);

  if (teams.length < 2) {
    console.log("Live-spillet har ikke nok lag ennå.");
    return;
  }

  document.getElementById("joinPanel").classList.add("hidden");
  document.getElementById("setupPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.remove("hidden");

  renderScoreBoard();
  renderBoard();
}
