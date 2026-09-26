/*
  Lagringslag: snakker med serveren på Render.
*/

const API_BASE = "/api";
const HOST_PASSWORD_KEY = "jeopardyHostPassword";

function getHostPassword() {
  return sessionStorage.getItem(HOST_PASSWORD_KEY) || "";
}

async function apiRequest(path, { method = "GET", body, allowMissing = false, password = getHostPassword() } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  // Serveren krever vertens passord for å lagre spill og nullstille knappen.
  if (password) headers["X-Host-Password"] = encodeURIComponent(password);

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
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

// Serverens klokke minus denne enhetens klokke, i millisekunder.
let serverClockOffset = 0;

// Nåtid etter serverklokka. Brukes til alle nedtellinger, så alle enheter viser det samme.
function serverNow() {
  return Date.now() + serverClockOffset;
}

// Måler avviket mot serverklokka flere ganger og bruker målingen med kortest svartid,
// siden den er mest presis (samme prinsipp som NTP).
async function syncServerClock(samples = 5) {
  let best = null;

  for (let i = 0; i < samples; i += 1) {
    try {
      const sentAt = Date.now();
      const { now } = await apiRequest("/time");
      const receivedAt = Date.now();
      const roundTrip = receivedAt - sentAt;

      if (!best || roundTrip < best.roundTrip) {
        best = { roundTrip, offset: now + roundTrip / 2 - receivedAt };
      }
    } catch (error) {
      console.warn("Kunne ikke hente servertid.", error);
    }
  }

  if (best) serverClockOffset = best.offset;
}

// Returnerer true hvis serveren godtar passordet.
async function backendCheckHostPassword(password) {
  try {
    await apiRequest("/host/login", { method: "POST", password });
    return true;
  } catch (error) {
    if (error.status === 401) return false;
    throw error;
  }
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
