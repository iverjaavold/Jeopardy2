/*
  Ekstra poeng / minuspoeng som verten kan gi når som helst.
*/

function openExtraPoints() {
  if (!Array.isArray(teams) || teams.length === 0) {
    alert("Det finnes ingen lag å gi poeng til.");
    return;
  }

  const teamSelect = document.getElementById("extraPointsTeam");
  const operationSelect = document.getElementById("extraPointsOperation");
  const amountInput = document.getElementById("extraPointsAmount");
  const backdrop = document.getElementById("extraPointsBackdrop");

  teamSelect.innerHTML = '<option value="">Velg lag...</option>';

  teams.forEach((team, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${team.name} (${team.score} poeng)`;
    teamSelect.appendChild(option);
  });

  operationSelect.value = "add";
  amountInput.value = "";
  updateExtraPointsPreview();
  backdrop.classList.add("show");

  setTimeout(() => teamSelect.focus(), 0);
}

function closeExtraPoints() {
  const backdrop = document.getElementById("extraPointsBackdrop");
  if (backdrop) backdrop.classList.remove("show");
}

function closeExtraPointsFromBackdrop(event) {
  if (event.target && event.target.id === "extraPointsBackdrop") {
    closeExtraPoints();
  }
}

function updateExtraPointsPreview() {
  const teamSelect = document.getElementById("extraPointsTeam");
  const operation = document.getElementById("extraPointsOperation").value;
  const amount = Number(document.getElementById("extraPointsAmount").value);
  const preview = document.getElementById("extraPointsPreview");
  const applyButton = document.getElementById("applyExtraPointsButton");
  const teamIndex = Number(teamSelect.value);
  const validTeam = teamSelect.value !== "" && teams[teamIndex];
  const validAmount = Number.isInteger(amount) && amount > 0;

  if (!validTeam || !validAmount) {
    preview.textContent = "Velg lag og skriv inn et helt poengbeløp over 0.";
    applyButton.disabled = true;
    applyButton.className = "btn-secondary";
    return;
  }

  const change = operation === "subtract" ? -amount : amount;
  const newScore = teams[teamIndex].score + change;

  preview.textContent = operation === "subtract"
    ? `${teams[teamIndex].name} trekkes ${amount} poeng: ${teams[teamIndex].score} → ${newScore}`
    : `${teams[teamIndex].name} får ${amount} poeng: ${teams[teamIndex].score} → ${newScore}`;

  applyButton.disabled = false;
  applyButton.className = operation === "subtract" ? "btn-red" : "btn-green";
  applyButton.textContent = operation === "subtract" ? "Trekk poeng" : "Gi poeng";
}

async function applyExtraPoints() {
  const teamSelect = document.getElementById("extraPointsTeam");
  const operation = document.getElementById("extraPointsOperation").value;
  const amount = Number(document.getElementById("extraPointsAmount").value);
  const teamIndex = Number(teamSelect.value);

  if (teamSelect.value === "" || !teams[teamIndex]) {
    alert("Velg et lag.");
    return;
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    alert("Skriv inn et helt poengbeløp over 0.");
    return;
  }

  const change = operation === "subtract" ? -amount : amount;
  teams[teamIndex].score += change;
  currentTeamIndex = teamIndex;

  renderScoreBoard();
  closeExtraPoints();
  await saveGame(false);
}
