/*
  Redigering av kategorier og spørsmål.
*/

function openQuestionEditor() {
  if (currentQuestion) {
    alert("Lukk det aktive spørsmålet før du endrer spørsmålene.");
    return;
  }

  editorDraftQuestions = cloneQuestions(QUESTIONS);
  document.getElementById("questionEditorStatus").textContent = "";
  renderQuestionEditor();
  document.getElementById("questionEditorBackdrop").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeQuestionEditor() {
  document.getElementById("questionEditorBackdrop").style.display = "none";
  document.body.style.overflow = "";
  editorDraftQuestions = [];
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
        removeClueButton
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
  if (!confirm("Vil du hente tilbake alle standardkategoriene og standardspørsmålene?")) return;
  editorDraftQuestions = cloneQuestions(DEFAULT_QUESTIONS);
  document.getElementById("questionEditorStatus").textContent = "";
  renderQuestionEditor();
}

async function saveQuestionChanges() {
  const status = document.getElementById("questionEditorStatus");

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
      if (!clue.question) {
        status.textContent = `Spørsmål ${clueIndex + 1} i «${category.category}» mangler spørsmålstekst.`;
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

  QUESTIONS = cloneQuestions(editorDraftQuestions);
  usedQuestions = new Set();

  try {
    localStorage.setItem(QUESTION_STORAGE_KEY, JSON.stringify(QUESTIONS));
  } catch (error) {
    console.warn("Kunne ikke lagre spørsmål lokalt.", error);
  }

  const gamePanel = document.getElementById("gamePanel");
  if (gamePanel && !gamePanel.classList.contains("hidden")) {
    renderBoard();
  }

  if (currentGameCode && teams.length >= 2 && !isLiveMode) {
    await saveGame(false);
  }

  closeQuestionEditor();
}
