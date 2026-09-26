/*
  Spørsmålssett: navngitte samlinger av kategorier og spørsmål (ett spillebrett per sett).
  Settene lagres i nettleseren og kan eksporteres til / importeres fra en .json-fil.
*/

const QUESTION_SETS_KEY = "kontorJeopardyQuestionSetsV1";
const ACTIVE_SET_KEY = "kontorJeopardyActiveSetV1";
const LEGACY_QUESTIONS_KEY = "kontorJeopardyCustomQuestionsV1";
const SET_FILE_FORMAT = "kontor-jeopardy-sett";

let questionSets = [];
let activeSetId = "";

function createSetId() {
  return `set-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidQuestionList(questions) {
  return Array.isArray(questions) && questions.length > 0 && questions.every(category =>
    category && typeof category.category === "string" && Array.isArray(category.clues)
  );
}

function readJsonFromStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    console.warn(`Kunne ikke lese ${key}.`, error);
    return null;
  }
}

// Returnerer false hvis nettleseren ikke har plass (for eksempel for mange store bilder).
function persistQuestionSets() {
  try {
    localStorage.setItem(QUESTION_SETS_KEY, JSON.stringify(questionSets));
    localStorage.setItem(ACTIVE_SET_KEY, activeSetId);
    return true;
  } catch (error) {
    console.warn("Kunne ikke lagre spørsmålssettene.", error);
    return false;
  }
}

function loadQuestionSets() {
  const stored = readJsonFromStorage(QUESTION_SETS_KEY);
  questionSets = Array.isArray(stored)
    ? stored.filter(set => set && typeof set.id === "string" && isValidQuestionList(set.questions))
    : [];

  if (questionSets.length === 0) {
    questionSets.push({ id: createSetId(), name: "Standard", questions: cloneQuestions(DEFAULT_QUESTIONS) });

    // Spørsmål lagret av den gamle «Endre spørsmål»-versjonen blir et eget sett.
    const legacy = readJsonFromStorage(LEGACY_QUESTIONS_KEY);
    if (isValidQuestionList(legacy)) {
      questionSets.push({ id: createSetId(), name: "Mine spørsmål", questions: legacy });
    }
  }

  let savedActiveId = "";
  try {
    savedActiveId = localStorage.getItem(ACTIVE_SET_KEY) || "";
  } catch (error) {
    savedActiveId = "";
  }

  activeSetId = questionSets.some(set => set.id === savedActiveId)
    ? savedActiveId
    : questionSets[questionSets.length - 1].id;
  QUESTIONS = cloneQuestions(getActiveQuestionSet().questions);
  persistQuestionSets();
}

function getActiveQuestionSet() {
  return questionSets.find(set => set.id === activeSetId) || questionSets[0];
}

function getQuestionSet(id) {
  return questionSets.find(set => set.id === id) || null;
}

function selectQuestionSet(id) {
  if (!getQuestionSet(id)) return;
  activeSetId = id;
  QUESTIONS = cloneQuestions(getActiveQuestionSet().questions);
  persistQuestionSets();
  renderQuestionSetPicker();
}

// Lagrer et sett (nytt hvis id mangler). Returnerer id-en, eller null hvis det ikke var plass.
function storeQuestionSet(id, name, questions) {
  const previousSets = questionSets;
  const previousActiveId = activeSetId;
  const setId = id || createSetId();
  const updatedSet = { id: setId, name, questions: cloneQuestions(questions) };

  questionSets = getQuestionSet(setId)
    ? questionSets.map(set => (set.id === setId ? updatedSet : set))
    : [...questionSets, updatedSet];
  activeSetId = setId;

  if (!persistQuestionSets()) {
    questionSets = previousSets;
    activeSetId = previousActiveId;
    return null;
  }

  QUESTIONS = cloneQuestions(questions);
  renderQuestionSetPicker();
  return setId;
}

function countClues(questions) {
  return questions.reduce((sum, category) => sum + category.clues.length, 0);
}

function countImages(questions) {
  return questions.reduce((sum, category) =>
    sum + category.clues.filter(clue => clue.image).length, 0);
}

function renderQuestionSetPicker() {
  const select = document.getElementById("questionSetSelect");
  const info = document.getElementById("questionSetInfo");
  if (!select) return;

  select.innerHTML = "";
  questionSets.forEach(set => {
    const option = document.createElement("option");
    option.value = set.id;
    option.textContent = set.name;
    option.selected = set.id === activeSetId;
    select.appendChild(option);
  });

  const active = getActiveQuestionSet();
  const categories = active.questions.length;
  const images = countImages(active.questions);
  info.textContent =
    `${categories} ${categories === 1 ? "kategori" : "kategorier"} · ${countClues(active.questions)} spørsmål` +
    (images ? ` · ${images} med bilde` : "");
}

function deleteQuestionSet() {
  const active = getActiveQuestionSet();

  if (questionSets.length <= 1) {
    alert("Du må ha minst ett spørsmålssett.");
    return;
  }
  if (!confirm(`Vil du slette spørsmålssettet «${active.name}»? Dette kan ikke angres.`)) return;

  questionSets = questionSets.filter(set => set.id !== active.id);
  selectQuestionSet(questionSets[0].id);
}

function safeFileName(name) {
  return (name.trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-") || "sporsmalssett").slice(0, 60);
}

function exportQuestionSet() {
  const active = getActiveQuestionSet();
  const data = { format: SET_FILE_FORMAT, version: 1, name: active.name, questions: active.questions };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = `${safeFileName(active.name)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function chooseQuestionSetFile() {
  document.getElementById("questionSetImportInput").click();
}

async function importQuestionSet(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = "";
  if (!file) return;

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch (error) {
    alert("Filen er ikke en gyldig spørsmålssett-fil.");
    return;
  }

  // Godtar både eksporterte sett og en ren liste med kategorier.
  const questions = Array.isArray(data) ? data : data && data.questions;
  if (!isValidQuestionList(questions)) {
    alert("Fant ingen kategorier og spørsmål i filen.");
    return;
  }

  const baseName = String((data && data.name) || file.name.replace(/\.json$/i, "")).trim() || "Importert sett";
  const name = questionSets.some(set => set.name === baseName) ? `${baseName} (importert)` : baseName;

  if (!storeQuestionSet(null, name, questions)) {
    alert("Det er ikke nok lagringsplass i nettleseren til dette settet. Slett et annet sett eller bruk færre/mindre bilder.");
    return;
  }
  alert(`Spørsmålssettet «${name}» er importert og valgt.`);
}

loadQuestionSets();
