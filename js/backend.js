/*
  Lagringslag: snakker med serveren på Render.
*/

const API_BASE = "/api";

async function apiRequest(path, { method = "GET", body, allowMissing = false } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (allowMissing && response.status === 404) return null;
  if (!response.ok) {
    const error = new Error(`Serveren svarte med feil ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function apiListen(path, callback) {
  const source = new EventSource(`${API_BASE}${path}`);
  source.onmessage = event => callback(JSON.parse(event.data));
  source.onerror = () => console.warn("Mistet kontakten med serveren. Prøver igjen …");
  return () => source.close();
}

async function backendGameExists(code) {
  return (await apiRequest(`/games/${code}`, { allowMissing: true })) !== null;
}

async function backendSaveGameState(code, state) {
  await apiRequest(`/games/${code}`, { method: "PUT", body: state });
}

async function backendLoadGameState(code) {
  return apiRequest(`/games/${code}`, { allowMissing: true });
}

function backendListenToGameState(code, callback) {
  return apiListen(`/games/${code}/events`, callback);
}

async function backendSendBuzz(code, buzz) {
  await apiRequest(`/buzzers/${code}`, {
    method: "POST",
    body: { team: buzz.team, clientId: buzz.clientId, questionId: buzz.questionId || "" }
  });
}

function backendListenToBuzzes(code, callback) {
  return apiListen(`/buzzers/${code}/events`, callback);
}

async function backendResetBuzzes(code) {
  await apiRequest(`/buzzers/${code}`, { method: "DELETE" });
}
