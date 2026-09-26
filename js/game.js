/*
  Selve spillet: lag, poengtavle, spillebrett, spørsmål og poenggivning.
*/

function addTeamInput() {
  const container = document.getElementById("teamInputs");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = `Lag ${container.children.length + 1}`;
  container.appendChild(input);
}

async function startGame() {
  const inputs = document.querySelectorAll("#teamInputs input");

  teams = [];

  inputs.forEach(input => {
    const name = input.value.trim();

    if (name) {
      teams.push({
        name: name,
        score: 0
      });
    }
  });

  if (teams.length < 2) {
    alert("Legg inn minst to lag.");
    return;
  }

  try {
    currentGameCode = await generateUniqueGameCode();
  } catch (error) {
    console.error(error);
    alert("Kunne ikke opprette en spillkode. Kontroller nettilkoblingen og prøv igjen.");
    return;
  }

  usedQuestions = new Set();
  currentTeamIndex = 0;
  isLiveMode = false;

  document.getElementById("setupPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.remove("hidden");

  updateGameCodeDisplay();
  setHostMode(true);
  renderScoreBoard();
  renderBoard();
  await saveGame(false);
  startBuzzListening(true);
  alert(`Spillet er opprettet! Spillkoden er ${currentGameCode}.`);
}

async function generateUniqueGameCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const exists = await backendGameExists(code);

    if (!exists) return code;
  }

  throw new Error("Fant ingen ledig spillkode.");
}

function updateGameCodeDisplay() {
  const box = document.getElementById("gameCodeBox");
  const display = document.getElementById("gameCodeDisplay");

  if (!box || !display) return;

  display.textContent = currentGameCode || "----";
  box.classList.toggle("hidden", !currentGameCode);
}

function renderScoreBoard() {
  const scoreBoard = document.getElementById("scoreBoard");
  scoreBoard.innerHTML = "";

  teams.forEach(team => {
    const div = document.createElement("div");
    div.className = "team-card";

    div.innerHTML = `
      <h3>${escapeHtml(team.name)}</h3>
      <div class="score">${team.score}</div>
    `;

    scoreBoard.appendChild(div);
  });
}

function renderBoard() {
  const board = document.getElementById("jeopardyBoard");
  board.innerHTML = "";

  const columnCount = QUESTIONS.length;
  board.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;

  const categoryRow = document.createElement("div");
  categoryRow.className = "category-row";
  categoryRow.style.gridColumn = `1 / span ${columnCount}`;
  categoryRow.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;

  QUESTIONS.forEach(category => {
    const div = document.createElement("div");
    div.className = "category";
    div.textContent = category.category;
    categoryRow.appendChild(div);
  });

  board.appendChild(categoryRow);

  const maxRows = Math.max(...QUESTIONS.map(category => category.clues.length));

  for (let row = 0; row < maxRows; row++) {
    const questionRow = document.createElement("div");
    questionRow.className = "question-row";
    questionRow.style.gridColumn = `1 / span ${columnCount}`;
    questionRow.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;

    QUESTIONS.forEach((category, categoryIndex) => {
      const clue = category.clues[row];
      const div = document.createElement("div");

      if (!clue) {
        div.className = "question-cell used";
        div.textContent = "";
        questionRow.appendChild(div);
        return;
      }

      const id = `${categoryIndex}-${row}`;
      div.className = "question-cell";

      if (usedQuestions.has(id)) {
        div.classList.add("used");
        div.textContent = "";
      } else {
        div.textContent = clue.value;
        if (!isLiveMode) {
          div.onclick = () => openQuestion(categoryIndex, row);
        }
      }

      questionRow.appendChild(div);
    });

    board.appendChild(questionRow);
  }
}

async function openQuestion(categoryIndex, clueIndex) {
  const category = QUESTIONS[categoryIndex];
  const clue = category.clues[clueIndex];

  currentQuestion = {
    id: `${categoryIndex}-${clueIndex}`,
    category: category.category,
    value: clue.value,
    question: clue.question,
    answer: clue.answer,
    image: clue.image || ""
  };

  document.getElementById("modalCategory").textContent =
    `${currentQuestion.category} - ${currentQuestion.value} poeng`;

  document.getElementById("modalQuestion").textContent = currentQuestion.question;
  showQuestionImage(currentQuestion.image);

  const answerBox = document.getElementById("modalAnswer");
  answerBox.style.display = "none";
  answerBox.textContent = `Svar: ${currentQuestion.answer}`;

  renderTeamDropdown();
  cancelScoreAction();

  document.getElementById("modalBackdrop").style.display = "flex";

  activeQuestionId = currentQuestion.id;
  buzzerUnlockAt = Date.now() + 60000;
  latestHostBuzzes = [];
  renderQuestionBuzzResult([]);
  startQuestionTimer();
  await saveGame(false);
  await resetBuzzers(false);
}

function showQuestionImage(src) {
  const image = document.getElementById("modalImage");
  if (src) {
    image.src = src;
  } else {
    image.removeAttribute("src");
  }
  image.classList.toggle("hidden", !src);
}

function startQuestionTimer() {
  stopQuestionTimer();

  const timerElement = document.getElementById("questionTimer");
  timerElement.classList.remove("time-up");

  const updateTimer = () => {
    const millisecondsLeft = buzzerUnlockAt - Date.now();
    questionTimeLeft = Math.max(0, Math.ceil(millisecondsLeft / 1000));
    updateHostBuzzerGateStatus();
    renderQuestionBuzzResult();

    if (questionTimeLeft > 0) {
      timerElement.textContent = `Tid igjen: ${questionTimeLeft} sek`;
      return;
    }

    stopQuestionTimer();
    timerElement.textContent = "Den røde knappen er åpen!";
    timerElement.classList.add("time-up");
  };

  updateTimer();
  if (questionTimeLeft > 0) {
    questionTimerInterval = setInterval(updateTimer, 250);
  }
}

function stopQuestionTimer() {
  if (questionTimerInterval) {
    clearInterval(questionTimerInterval);
    questionTimerInterval = null;
  }
}

function renderTeamDropdown() {
  const select = document.getElementById("answeringTeam");
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Velg lag...";
  placeholder.selected = true;
  placeholder.disabled = true;
  select.appendChild(placeholder);

  teams.forEach((team, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = team.name;
    select.appendChild(option);
  });
}

function showAnswer() {
  document.getElementById("modalAnswer").style.display = "block";
}

function markCorrect() {
  chooseScoreAction("correct");
}

function markWrong() {
  chooseScoreAction("wrong");
}

function chooseScoreAction(action) {
  if (!currentQuestion) return;

  pendingScoreAction = action;

  const panel = document.getElementById("scoreActionPanel");
  const title = document.getElementById("scoreActionTitle");
  const label = document.getElementById("answeringTeamLabel");
  const confirmButton = document.getElementById("confirmScoreButton");
  const select = document.getElementById("answeringTeam");

  select.value = "";

  if (action === "correct") {
    title.textContent = `Riktig svar – velg laget som får ${currentQuestion.value} poeng`;
    label.textContent = "Hvilket lag skal få poengene?";
    confirmButton.textContent = `Gi ${currentQuestion.value} poeng`;
    confirmButton.className = "btn-green";
  } else {
    title.textContent = `Feil svar – velg laget som mister ${currentQuestion.value} poeng`;
    label.textContent = "Hvilket lag skal trekkes i poeng?";
    confirmButton.textContent = `Trekk ${currentQuestion.value} poeng`;
    confirmButton.className = "btn-red";
  }

  panel.style.display = "block";
  select.focus();
}

function confirmScoreAction() {
  if (!currentQuestion || !pendingScoreAction) return;

  const selectedValue = document.getElementById("answeringTeam").value;

  if (selectedValue === "") {
    alert("Du må velge et lag.");
    return;
  }

  const teamIndex = Number(selectedValue);

  if (!teams[teamIndex]) {
    alert("Ugyldig lag. Velg et lag fra listen.");
    return;
  }

  if (pendingScoreAction === "correct") {
    teams[teamIndex].score += currentQuestion.value;
  } else {
    teams[teamIndex].score -= currentQuestion.value;
  }

  currentTeamIndex = teamIndex;
  finishQuestion();
}

function cancelScoreAction() {
  pendingScoreAction = null;

  const panel = document.getElementById("scoreActionPanel");
  const select = document.getElementById("answeringTeam");

  if (panel) panel.style.display = "none";
  if (select) select.value = "";
}

function closeQuestion() {
  finishQuestion();
}

function finishQuestion() {
  if (!currentQuestion) return;

  stopQuestionTimer();
  usedQuestions.add(currentQuestion.id);
  currentQuestion = null;
  activeQuestionId = "";
  buzzerUnlockAt = 0;
  updateHostBuzzerGateStatus();
  renderQuestionBuzzResult([]);
  pendingScoreAction = null;
  document.getElementById("scoreActionPanel").style.display = "none";

  // Gå til neste lag
  currentTeamIndex = (currentTeamIndex + 1) % teams.length;

  document.getElementById("modalBackdrop").style.display = "none";

  renderScoreBoard();
  renderBoard();
  saveGame(false);
}

function resetGame() {
  const confirmed = confirm("Vil du nullstille poeng og brukte spørsmål?");

  if (!confirmed) return;

  stopQuestionTimer();
  activeQuestionId = "";
  buzzerUnlockAt = 0;
  updateHostBuzzerGateStatus();

  teams = teams.map(team => ({
    name: team.name,
    score: 0
  }));

  usedQuestions = new Set();
  currentTeamIndex = 0;

  renderScoreBoard();
  renderBoard();
  saveGame(false);
}

function goBackToSetup() {
  const confirmed = confirm("Vil du gå tilbake og endre lag? Spillet nullstilles.");

  if (!confirmed) return;

  stopQuestionTimer();

  teams = [];
  usedQuestions = new Set();
  currentTeamIndex = 0;

  document.getElementById("setupPanel").classList.remove("hidden");
  document.getElementById("gamePanel").classList.add("hidden");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
