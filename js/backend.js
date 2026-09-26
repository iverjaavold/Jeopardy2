/*
  Lagringslag: velger mellom serveren på Render (vanlig modus)
  og localStorage (B-test / lokal beta-modus).
*/

const API_BASE = "/api";

async function apiRequest(path, { method = "GET", body, allowMissing = false } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (allowMissing && response.status === 404) return null;
  if (!response.ok) throw new Error(`Serveren svarte med feil ${response.status}.`);
  return response.json();
}

function apiListen(path, callback) {
  const source = new EventSource(`${API_BASE}${path}`);
  source.onmessage = event => callback(JSON.parse(event.data));
  source.onerror = () => console.warn("Mistet kontakten med serveren. Prøver igjen …");
  return () => source.close();
}

function enableBetaTestMode() {
  isBetaMode = true;
  sessionStorage.setItem("jeopardyBetaMode", "true");
  updateBetaModeUI();

  const notice = document.getElementById("betaModeNotice");
  notice.classList.remove("hidden");
  setTimeout(() => notice.classList.add("hidden"), 4500);
}

function updateBetaModeUI() {
  document.body.classList.toggle("beta-mode", isBetaMode);

  const button = document.getElementById("betaTestButton");
  if (button) {
    button.classList.toggle("active", isBetaMode);
    button.textContent = isBetaMode ? "✓ B-test lokal" : "B-test";
  }

  const codeLabel = document.getElementById("gameCodeLabel");
  if (codeLabel) {
    codeLabel.textContent = isBetaMode
      ? "B-testkode:"
      : "Spillkode:";
  }

  const saveButton = document.getElementById("saveGameButton");
  const loadButton = document.getElementById("loadGameButton");
  if (saveButton) saveButton.textContent = isBetaMode ? "Lagre lokalt" : "Lagre spill";
  if (loadButton) loadButton.textContent = isBetaMode ? "Last lokalt" : "Last spill";
}

function localGameKey(code) {
  return `${LOCAL_GAME_PREFIX}${code}`;
}

function localBuzzKey(code) {
  return `${LOCAL_BUZZ_PREFIX}${code}`;
}

function dispatchLocalUpdate(key) {
  window.dispatchEvent(new CustomEvent("jeopardyLocalUpdate", { detail: { key } }));
}

async function backendGameExists(code) {
  if (isBetaMode) return localStorage.getItem(localGameKey(code)) !== null;
  return (await apiRequest(`/games/${code}`, { allowMissing: true })) !== null;
}

async function backendSaveGameState(code, state) {
  if (isBetaMode) {
    localStorage.setItem(localGameKey(code), JSON.stringify(state));
    dispatchLocalUpdate(localGameKey(code));
    return;
  }
  await apiRequest(`/games/${code}`, { method: "PUT", body: state });
}

async function backendLoadGameState(code) {
  if (isBetaMode) {
    const saved = localStorage.getItem(localGameKey(code));
    return saved ? JSON.parse(saved) : null;
  }
  return apiRequest(`/games/${code}`, { allowMissing: true });
}

function backendListenToGameState(code, callback) {
  if (!isBetaMode) {
    return apiListen(`/games/${code}/events`, callback);
  }

  const key = localGameKey(code);
  const notify = () => {
    const saved = localStorage.getItem(key);
    callback(saved ? JSON.parse(saved) : null);
  };
  const onStorage = event => {
    if (event.key === key) notify();
  };
  const onLocalUpdate = event => {
    if (event.detail?.key === key) notify();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("jeopardyLocalUpdate", onLocalUpdate);
  notify();

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("jeopardyLocalUpdate", onLocalUpdate);
  };
}

async function backendSendBuzz(code, buzz) {
  if (!isBetaMode) {
    await apiRequest(`/buzzers/${code}`, {
      method: "POST",
      body: { team: buzz.team, clientId: buzz.clientId, questionId: buzz.questionId || "" }
    });
    return;
  }

  const key = localBuzzKey(code);
  const buzzes = JSON.parse(localStorage.getItem(key) || "{}");
  const buzzId = `buzz-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  buzzes[buzzId] = {
    team: buzz.team,
    clientId: buzz.clientId,
    questionId: buzz.questionId || "",
    pressedAt: Date.now()
  };
  localStorage.setItem(key, JSON.stringify(buzzes));
  dispatchLocalUpdate(key);
}

function backendListenToBuzzes(code, callback) {
  if (!isBetaMode) {
    return apiListen(`/buzzers/${code}/events`, callback);
  }

  const key = localBuzzKey(code);
  const notify = () => callback(JSON.parse(localStorage.getItem(key) || "{}"));
  const onStorage = event => {
    if (event.key === key) notify();
  };
  const onLocalUpdate = event => {
    if (event.detail?.key === key) notify();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("jeopardyLocalUpdate", onLocalUpdate);
  notify();

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("jeopardyLocalUpdate", onLocalUpdate);
  };
}

async function backendResetBuzzes(code) {
  if (isBetaMode) {
    const key = localBuzzKey(code);
    localStorage.removeItem(key);
    dispatchLocalUpdate(key);
    return;
  }
  await apiRequest(`/buzzers/${code}`, { method: "DELETE" });
}
