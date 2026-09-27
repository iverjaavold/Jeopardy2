/*
  Redigering av spørsmålssett: navn, kategorier, spørsmål og bilder.
*/

const MAX_IMAGE_SIDE = 1280;
const IMAGE_QUALITY = 0.8;

function createBlankClues() {
  return [100, 200, 300, 400, 500].map(value => ({ value, question: "", answer: "" }));
}

// isNewSet = true lager et nytt, tomt sett. Ellers redigeres settet som er valgt.
function openQuestionEditor(isNewSet = false) {
  if (currentQuestion) {
    alert("Lukk det aktive spørsmålet før du endrer spørsmålene.");
    return;
  }

  const nameInput = document.getElementById("questionSetNameInput");

  if (isNewSet) {
    editorSetId = null;
    editorDraftQuestions = [{ category: "Kategori 1", clues: createBlankClues() }];
    nameInput.value = "";
  } else {
    editorSetId = activeSetId;
    editorDraftQuestions = cloneQuestions(QUESTIONS);
    nameInput.value = getActiveQuestionSet().name;
  }

  document.getElementById("questionEditorTitle").textContent =
    isNewSet ? "＋ Nytt spørsmålssett" : "✏️ Rediger spørsmålssett";
  document.getElementById("questionEditorStatus").textContent = "";
  renderQuestionEditor();
  document.getElementById("questionEditorBackdrop").style.display = "flex";
  document.body.style.overflow = "hidden";
  if (isNewSet) nameInput.focus();
}

function createQuestionSet() {
  openQuestionEditor(true);
}

function closeQuestionEditor() {
  document.getElementById("questionEditorBackdrop").style.display = "none";
  document.body.style.overflow = "";
  editorDraftQuestions = [];
  editorSetId = null;
}

// Krymper bildet og gjør det om til en data-URL, så det kan lagres sammen med settet.
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff"; // gjennomsiktige PNG-er får hvit bakgrunn i stedet for svart
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Kunne ikke lese bildet."));
    };

    image.src = url;
  });
}

async function attachImageFile(categoryIndex, clueIndex, file) {
  if (!file) return;

  const status = document.getElementById("questionEditorStatus");
  try {
    editorDraftQuestions[categoryIndex].clues[clueIndex].image = await readImageFile(file);
    status.textContent = "";
  } catch (error) {
    status.textContent = "Kunne ikke lese bildet. Prøv et JPG- eller PNG-bilde.";
    return;
  }
  renderQuestionEditor();
}

function attachImageLink(categoryIndex, clueIndex) {
  const clue = editorDraftQuestions[categoryIndex].clues[clueIndex];
  const current = clue.image && !clue.image.startsWith("data:") ? clue.image : "";
  const link = prompt("Lim inn lenken til bildet (må starte med https://):", current);

  if (link === null) return;

  const trimmed = link.trim();
  if (!/^https?:\/\/\S+$/i.test(trimmed)) {
    document.getElementById("questionEditorStatus").textContent =
      "Bildelenken må starte med http:// eller https://.";
    return;
  }

  clue.image = trimmed;
  document.getElementById("questionEditorStatus").textContent = "";
  renderQuestionEditor();
}

function removeClueImage(categoryIndex, clueIndex) {
  delete editorDraftQuestions[categoryIndex].clues[clueIndex].image;
  renderQuestionEditor();
}

function createImageField(categoryIndex, clueIndex, clue) {
  const wrapper = document.createElement("div");
  wrapper.className = "editor-image-field";

  if (clue.image) {
    const preview = document.createElement("img");
    preview.className = "editor-image-preview";
    preview.src = clue.image;
    preview.alt = `Bilde til spørsmål ${clueIndex + 1}`;
    wrapper.appendChild(preview);
  }

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.hidden = true;
  fileInput.addEventListener("change", event =>
    attachImageFile(categoryIndex, clueIndex, event.target.files[0])
  );

  const uploadButton = document.createElement("button");
  uploadButton.type = "button";
  uploadButton.className = "btn-secondary editor-image-button";
  uploadButton.textContent = clue.image ? "📷 Bytt bilde" : "📷 Last opp bilde";
  uploadButton.onclick = () => fileInput.click();

  const linkButton = document.createElement("button");
  linkButton.type = "button";
  linkButton.className = "btn-secondary editor-image-button";
  linkButton.textContent = "🔗 Bildelenke";
  linkButton.onclick = () => attachImageLink(categoryIndex, clueIndex);

  wrapper.append(fileInput, uploadButton, linkButton);

  if (clue.image) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "btn-secondary editor-image-button";
    removeButton.textContent = "Fjern bilde";
    removeButton.onclick = () => removeClueImage(categoryIndex, clueIndex);
    wrapper.appendChild(removeButton);
  }

  return wrapper;
}

function createEditorField(labelText, element) {
  const wrapper = document.createElement("div");
  wrapper.className = "editor-field";
  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.appendChild(label);
  wrapper.appendChild(element);
  return wrapper;
}

function renderQuestionEditor() {
  const container = document.getElementById("questionEditorCategories");
  container.innerHTML = "";

  editorDraftQuestions.forEach((category, categoryIndex) => {
    const card = document.createElement("section");
    card.className = "editor-category-card";

    const header = document.createElement("div");
    header.className = "editor-category-header";

    const number = document.createElement("span");
    number.className = "editor-category-number";
    number.textContent = categoryIndex + 1;

    const categoryInput = document.createElement("input");
    categoryInput.type = "text";
    categoryInput.value = category.category || "";
    categoryInput.placeholder = "Navn på kategori";
    categoryInput.setAttribute("aria-label", `Navn på kategori ${categoryIndex + 1}`);
    categoryInput.addEventListener("input", event => {
      editorDraftQuestions[categoryIndex].category = event.target.value;
    });

    const removeCategoryButton = document.createElement("button");
    removeCategoryButton.className = "editor-icon-button editor-remove-category";
    removeCategoryButton.type = "button";
    removeCategoryButton.textContent = "🗑 Fjern kategori";
    removeCategoryButton.onclick = () => removeEditorCategory(categoryIndex);

    header.append(number, categoryInput, removeCategoryButton);
    card.appendChild(header);

    const clues = document.createElement("div");
    clues.className = "editor-clues";

    category.clues.forEach((clue, clueIndex) => {
      const row = document.createElement("div");
      row.className = "editor-clue-row";

      const valueInput = document.createElement("input");
      valueInput.type = "number";
      valueInput.min = "1";
      valueInput.step = "50";
      valueInput.value = clue.value;
      valueInput.addEventListener("input", event => {
        editorDraftQuestions[categoryIndex].clues[clueIndex].value = Number(event.target.value);
      });

      const questionInput = document.createElement("textarea");
      questionInput.value = clue.question || "";
      questionInput.placeholder = "Skriv spørsmålet her";
      questionInput.addEventListener("input", event => {
        editorDraftQuestions[categoryIndex].clues[clueIndex].question = event.target.value;
      });

      const answerInput = document.createElement("textarea");
      answerInput.value = clue.answer || "";
      answerInput.placeholder = "Skriv riktig svar her";
      answerInput.addEventListener("input", event => {
        editorDraftQuestions[categoryIndex].clues[clueIndex].answer = event.target.value;
      });

      const removeClueButton = document.createElement("button");
      removeClueButton.className = "editor-icon-button";
      removeClueButton.type = "button";
      removeClueButton.textContent = "🗑";
      removeClueButton.title = "Fjern spørsmålet";
      removeClueButton.setAttribute("aria-label", `Fjern spørsmål ${clueIndex + 1}`);
      removeClueButton.onclick = () => removeEditorClue(categoryIndex, clueIndex);

      row.append(
        createEditorField("Poeng", valueInput),
        createEditorField(`Spørsmål ${clueIndex + 1}`, questionInput),
        createEditorField("Riktig svar", answerInput),
        removeClueButton,
        createImageField(categoryIndex, clueIndex, clue)
      );
      clues.appendChild(row);
    });

    card.appendChild(clues);

    const actions = document.createElement("div");
    actions.className = "editor-card-actions";
    const addButton = document.createElement("button");
    addButton.className = "btn-secondary";
    addButton.type = "button";
    addButton.textContent = "＋ Legg til spørsmål";
    addButton.onclick = () => addEditorClue(categoryIndex);
    actions.appendChild(addButton);
    card.appendChild(actions);

    container.appendChild(card);
  });
}

function addEditorCategory() {
  editorDraftQuestions.push({
    category: `Ny kategori ${editorDraftQuestions.length + 1}`,
    clues: [
      { value: 100, question: "", answer: "" }
    ]
  });
  renderQuestionEditor();
  const content = document.querySelector(".question-editor-content");
  if (content) content.scrollTop = content.scrollHeight;
}

function removeEditorCategory(categoryIndex) {
  if (editorDraftQuestions.length <= 1) {
    document.getElementById("questionEditorStatus").textContent =
      "Spillet må ha minst én kategori.";
    return;
  }
  editorDraftQuestions.splice(categoryIndex, 1);
  document.getElementById("questionEditorStatus").textContent = "";
  renderQuestionEditor();
}

function addEditorClue(categoryIndex) {
  const clues = editorDraftQuestions[categoryIndex].clues;
  const lastValue = clues.length ? Number(clues[clues.length - 1].value) || 0 : 0;
  clues.push({
    value: lastValue ? lastValue + 100 : 100,
    question: "",
    answer: ""
  });
  renderQuestionEditor();
}

function removeEditorClue(categoryIndex, clueIndex) {
  const clues = editorDraftQuestions[categoryIndex].clues;
  if (clues.length <= 1) {
    document.getElementById("questionEditorStatus").textContent =
      "Hver kategori må ha minst ett spørsmål.";
    return;
  }
  clues.splice(clueIndex, 1);
  document.getElementById("questionEditorStatus").textContent = "";
  renderQuestionEditor();
}

function resetEditorQuestions() {
  if (!confirm("Vil du erstatte alle spørsmålene i dette settet med standardspørsmålene?")) return;
  editorDraftQuestions = cloneQuestions(DEFAULT_QUESTIONS);
  document.getElementById("questionEditorStatus").textContent = "";
  renderQuestionEditor();
}

async function saveQuestionChanges() {
  const status = document.getElementById("questionEditorStatus");
  const setName = document.getElementById("questionSetNameInput").value.trim();

  if (!setName) {
    status.textContent = "Gi spørsmålssettet et navn.";
    document.getElementById("questionSetNameInput").focus();
    return;
  }

  if (!editorDraftQuestions.length) {
    status.textContent = "Legg til minst én kategori.";
    return;
  }

  for (let categoryIndex = 0; categoryIndex < editorDraftQuestions.length; categoryIndex += 1) {
    const category = editorDraftQuestions[categoryIndex];
    category.category = String(category.category || "").trim();

    if (!category.category) {
      status.textContent = `Kategori ${categoryIndex + 1} mangler navn.`;
      return;
    }

    if (!Array.isArray(category.clues) || category.clues.length === 0) {
      status.textContent = `Kategorien «${category.category}» må ha minst ett spørsmål.`;
      return;
    }

    for (let clueIndex = 0; clueIndex < category.clues.length; clueIndex += 1) {
      const clue = category.clues[clueIndex];
      clue.question = String(clue.question || "").trim();
      clue.answer = String(clue.answer || "").trim();
      clue.value = Number(clue.value);

      if (!Number.isFinite(clue.value) || clue.value <= 0) {
        status.textContent = `Spørsmål ${clueIndex + 1} i «${category.category}» må ha en gyldig poengsum.`;
        return;
      }
      if (!clue.image) delete clue.image;
      if (!clue.question && !clue.image) {
        status.textContent = `Spørsmål ${clueIndex + 1} i «${category.category}» mangler spørsmålstekst eller bilde.`;
        return;
      }
      if (!clue.answer) {
        status.textContent = `Spørsmål ${clueIndex + 1} i «${category.category}» mangler riktig svar.`;
        return;
      }
    }
  }

  if (usedQuestions.size > 0 &&
      !confirm("Når spørsmålene endres, blir alle brukte spørsmål åpnet igjen. Vil du fortsette?")) {
    return;
  }

  if (!storeQuestionSet(editorSetId, setName, editorDraftQuestions)) {
    status.textContent =
      "Det er ikke nok lagringsplass i nettleseren. Bruk færre eller mindre bilder, bildelenker, eller slett et annet sett.";
    return;
  }

  usedQuestions = new Set();
  questionHistory = [];

  const gamePanel = document.getElementById("gamePanel");
  if (gamePanel && !gamePanel.classList.contains("hidden")) {
    renderBoard();
  }

  if (currentGameCode && teams.length >= 2 && !isLiveMode) {
    await saveGame(false);
  }

  closeQuestionEditor();
}
