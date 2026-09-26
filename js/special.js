/*
  Spesialrunder som verten kan starte når som helst: vises stort på alle skjermer.
    stemming   – «Ekstraordinær stemming!»
    forstemann – den røde knappen åpner med en gang; hvert lag kan trykke én gang,
                 og rekkefølgen vises live
    skal       – «SKÅL!»
*/

const SPECIALS = {
  stemming: { icon: "🗳️", title: "Ekstraordinær stemming!" },
  forstemann: { icon: "🔴", title: "Førstemann!" },
  skal: { icon: "🍻", title: "SKÅL!" }
};

function isPlayerView() {
  return !document.getElementById("buzzerPanel").classList.contains("hidden");
}

function isHostView() {
  return !isLiveMode && !isPlayerView() &&
    !document.getElementById("gamePanel").classList.contains("hidden");
}

function openSpecialMenu() {
  if (currentQuestion) {
    alert("Lukk spørsmålet før du starter en spesialrunde.");
    return;
  }
  document.getElementById("specialMenuBackdrop").style.display = "flex";
}

function closeSpecialMenu() {
  document.getElementById("specialMenuBackdrop").style.display = "none";
}

async function startSpecial(kind) {
  if (!SPECIALS[kind]) return;
  closeSpecialMenu();

  activeSpecial = kind;

  if (kind === "forstemann") {
    // Egen «spørsmåls-id», så trykk fra før ikke telles med.
    buzzerUnlockAt = serverNow();
    activeQuestionId = `forstemann-${Math.round(buzzerUnlockAt)}`;
    latestBuzzes = [];
    await resetBuzzers(false);
  }

  renderSpecial();
  updateHostBuzzerGateStatus();
  await saveGame(false);
}

async function endSpecial() {
  if (activeSpecial === "forstemann") {
    activeQuestionId = "";
    buzzerUnlockAt = 0;
  }
  activeSpecial = "";
  renderSpecial();
  updateHostBuzzerGateStatus();
  await saveGame(false);
}

// Kalles når tilstanden endres (hos verten, seerne og spillerne).
function renderSpecial() {
  const backdrop = document.getElementById("specialBackdrop");
  const special = SPECIALS[activeSpecial];

  // Spillerne trenger knappen sin under «Førstemann», så de får ikke vinduet over den.
  if (!special || (activeSpecial === "forstemann" && isPlayerView())) {
    backdrop.style.display = "none";
    return;
  }

  backdrop.dataset.special = activeSpecial;
  document.getElementById("specialIcon").textContent = special.icon;
  document.getElementById("specialTitle").textContent = special.title;
  document.getElementById("specialRace").classList.toggle("hidden", activeSpecial !== "forstemann");
  document.getElementById("specialCloseButton").classList.toggle("hidden", !isHostView());
  renderRaceResults();
  backdrop.style.display = "flex";
}

function renderRaceResults() {
  const list = document.getElementById("specialRaceList");
  const status = document.getElementById("specialRaceStatus");
  if (!list || activeSpecial !== "forstemann") return;

  const presses = getQuestionBuzzes();
  status.textContent = presses.length
    ? "Rekkefølge:"
    : "Den røde knappen er åpen – trykk!";

  list.innerHTML = "";
  presses.forEach((press, index) => {
    const item = document.createElement("li");
    if (index === 0) item.classList.add("first");

    const team = document.createElement("strong");
    team.textContent = `${index + 1}. ${press.team}`;

    const time = document.createElement("span");
    time.textContent = `+${(Math.max(0, press.pressedAt - buzzerUnlockAt) / 1000).toLocaleString("no-NO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} s`;

    item.append(team, time);
    list.appendChild(item);
  });
}
