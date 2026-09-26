/*
  Spilleregler: vises for alle, og spillverten kan endre dem.
  Reglene lagres i nettleseren til spillverten og sendes med spillet,
  så lagene ser spillvertens regler i spilloversikten.
*/

const RULES_KEY = "kontorJeopardyRulesV1";

const DEFAULT_RULES = [
  { title: "Mål", text: "Få så mange poeng som mulig ved å svare riktig på spørsmål." },
  { title: "60 sekunders tenketid", text: "Alle lag kan diskutere spørsmålet i 60 sekunder. Den røde knappen er låst fram til tiden er ute." },
  { title: "Førstemann til knappen", text: "Etter 60 sekunder får laget som trykker først på den røde knappen, svare. Knappen låses da for alle i 20 sekunder mens laget svarer." },
  { title: "Neste lag får sjansen", text: "Hvis laget svarer feil, åpner knappen igjen etter de 20 sekundene, og laget som trykker først da, får svare. Slik fortsetter det til spillverten lukker spørsmålet." },
  { title: "Én svarkarantene", text: "Et lag som svarer feil, får én svarkarantene og kan ikke svare på neste svarmulighet i samme spørsmål." },
  { title: "Kun ett svar", text: "Når laget har gitt sitt endelige svar, kan det ikke endres etter at spillverten har vurdert det." },
  { title: "Rimelig svartid", text: "Laget som får ordet, må svare innen rimelig tid. Spillverten kan sende turen videre hvis laget bruker for lang tid." },
  { title: "Ingen hjelpemidler", text: "Mobil, nettsøk, KI og andre hjelpemidler er ikke tillatt med mindre spillverten sier noe annet." },
  { title: "Ikke vær en bitch", text: "Vis respekt, ikke ødelegg for andre lag, ikke rop ut svar og ikke krangle med spillverten og generelt: Ikke vær en bitch." },
  { title: "Spillverten bestemmer", text: "Spillvertens vurdering av svar, trykkerekkefølge og poeng er endelig." },
  { title: "Minuspoeng", text: "Regelbrudd, juks, forstyrrelser eller dårlig oppførsel kan gi minuspoeng. Spillverten bestemmer hvor mange." },
  { title: "Poeng", text: "Riktig svar gir spørsmålets poengverdi. Feil svar kan gi null eller minuspoeng etter spillvertens vurdering." },
  { title: "Ha det gøy", text: "Konkurrer hardt, men vær grei med de andre spillerne." },
  { title: "Ikke si i mot", text: "Dersom du sier imot spillederen, kan du bli trukket poeng, helt opp til 300 minuspoeng." },
  { title: "MØ!-bonus", text: "Hvis du roper «MØ!» av full hals, får du 200 ekstra poeng." },
  { title: "Isak-regelen", text: "Dersom Isak gjør det vanskelig for spillmesteren mens reglene forklares, vil laget hans bli holdt ansvarlig. De vil kunne få minuspoeng, måtte stå over neste oppgave og/eller chugge en liter øl, fordelt innad i laget." },
  { title: "Bravida reglen", text: "Ansatte i Bravida-konsernet må drikke tre slurker dersom flertallet stemmer ja under en ekstraordinær avstemning" },
  { title: "Dysleksi-regelen", text: "Dersom en spiller påpeker skrivefeil i spillet, skal spilleren irettesettes av laget sitt og drikke tre slurker." }
];

let rules = [];
let rulesDraft = [];

function cloneRules(list) {
  return list.map(rule => ({ title: String(rule.title || ""), text: String(rule.text || "") }));
}

function isValidRuleList(list) {
  return Array.isArray(list) && list.every(rule => rule && typeof rule.text === "string");
}

function loadRules() {
  const stored = readJsonFromStorage(RULES_KEY);
  rules = isValidRuleList(stored) ? cloneRules(stored) : cloneRules(DEFAULT_RULES);
}

function persistRules() {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch (error) {
    console.warn("Kunne ikke lagre reglene.", error);
  }
}

// Brukes når reglene kommer fra et spill (live-visning eller lastet spill).
function setRulesFromGame(list) {
  if (!isValidRuleList(list)) return;
  rules = cloneRules(list);
  renderRules();
}

function renderRules() {
  const list = document.getElementById("rulesList");
  if (!list) return;

  list.innerHTML = "";
  if (rules.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Ingen regler er lagt inn.";
    list.appendChild(empty);
    return;
  }

  rules.forEach(rule => {
    const item = document.createElement("li");
    if (rule.title) {
      const title = document.createElement("strong");
      title.textContent = `${rule.title}:`;
      item.append(title, " ");
    }
    item.append(rule.text);
    list.appendChild(item);
  });
}

function setRulesEditMode(isEditing) {
  document.getElementById("rulesView").classList.toggle("hidden", isEditing);
  document.getElementById("rulesEditor").classList.toggle("hidden", !isEditing);
}

function openRulesEditor() {
  rulesDraft = cloneRules(rules);
  document.getElementById("rulesEditorStatus").textContent = "";
  renderRulesEditor();
  setRulesEditMode(true);
}

function renderRulesEditor() {
  const container = document.getElementById("rulesEditorList");
  container.innerHTML = "";

  rulesDraft.forEach((rule, index) => {
    const row = document.createElement("div");
    row.className = "rules-editor-row";

    const title = document.createElement("input");
    title.type = "text";
    title.maxLength = 60;
    title.placeholder = "Overskrift (valgfri)";
    title.value = rule.title;
    title.setAttribute("aria-label", `Overskrift for regel ${index + 1}`);
    title.oninput = () => { rulesDraft[index].title = title.value; };

    const text = document.createElement("textarea");
    text.maxLength = 500;
    text.placeholder = "Selve regelen";
    text.value = rule.text;
    text.setAttribute("aria-label", `Tekst for regel ${index + 1}`);
    text.oninput = () => { rulesDraft[index].text = text.value; };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "editor-icon-button";
    remove.textContent = "🗑";
    remove.setAttribute("aria-label", `Slett regel ${index + 1}`);
    remove.onclick = () => {
      rulesDraft.splice(index, 1);
      renderRulesEditor();
    };

    row.append(title, text, remove);
    container.appendChild(row);
  });
}

function addRule() {
  rulesDraft.push({ title: "", text: "" });
  renderRulesEditor();
  const inputs = document.querySelectorAll("#rulesEditorList .rules-editor-row input");
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function resetRulesToDefault() {
  if (!confirm("Vil du erstatte reglene med standardreglene?")) return;
  rulesDraft = cloneRules(DEFAULT_RULES);
  renderRulesEditor();
}

function cancelRulesEdit() {
  setRulesEditMode(false);
}

async function saveRules() {
  const cleaned = rulesDraft
    .map(rule => ({ title: rule.title.trim(), text: rule.text.trim() }))
    .filter(rule => rule.title || rule.text);

  const missingText = cleaned.findIndex(rule => !rule.text);
  if (missingText !== -1) {
    document.getElementById("rulesEditorStatus").textContent =
      `Regelen «${cleaned[missingText].title}» mangler tekst.`;
    return;
  }

  rules = cleaned;
  persistRules();
  renderRules();
  setRulesEditMode(false);

  // Send de nye reglene til lagene hvis et spill er i gang.
  if (currentGameCode && teams.length >= 2 && !isLiveMode) {
    await saveGame(false);
  }
}

loadRules();
