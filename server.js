/*
  Server for Kontor-Jeopardy.
  Serverer selve appen og holder spilltilstand og knappetrykk i minnet.
  Endringer sendes live til alle tilkoblede med Server-Sent Events.

  Statiske filer leses og gzippes én gang ved oppstart, så start serveren
  på nytt etter at du har endret HTML/CSS/JS lokalt.

  Start lokalt:  node server.js   (åpne http://localhost:3000)
*/

const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_PATHS = ["index.html", "css/", "js/", "assets/"];
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const HEARTBEAT_MS = 25000;
const IDLE_GAME_MS = 12 * 60 * 60 * 1000; // spill uten aktivitet så lenge ryddes bort
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const BUZZ_LOCK_MS = 20000; // knappen er låst for alle så lenge etter hvert trykk
const COMPRESSIBLE =new Set([".html", ".css", ".js", ".json", ".svg"]);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const games = new Map();     // spillkode -> spilltilstand
const buzzers = new Map();   // spillkode -> { id: trykk }
const listeners = new Map(); // "games/1234" eller "buzzers/1234" -> Set med svar-strømmer
const lastActivity = new Map(); // spillkode -> tidspunkt for siste endring
const buzzLockedUntil = new Map(); // spillkode -> tidspunkt da knappen åpner igjen etter et trykk
let buzzSequence = 0;

function touch(code) {
  lastActivity.set(code, Date.now());
}

function cleanupIdleGames() {
  const cutoff = Date.now() - IDLE_GAME_MS;
  lastActivity.forEach((time, code) => {
    if (time > cutoff) return;
    if (listeners.has(`games/${code}`) || listeners.has(`buzzers/${code}`)) return;
    games.delete(code);
    buzzers.delete(code);
    buzzLockedUntil.delete(code);
    lastActivity.delete(code);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("For stor forespørsel."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "null"));
      } catch (error) {
        reject(new Error("Ugyldig JSON."));
      }
    });

    req.on("error", reject);
  });
}

function currentValue(channel) {
  const [kind, code] = channel.split("/");
  if (kind === "games") return games.has(code) ? games.get(code) : null;
  return buzzers.get(code) || {};
}

function broadcast(channel) {
  const subscribers = listeners.get(channel);
  if (!subscribers) return;

  const message = `data: ${JSON.stringify(currentValue(channel))}\n\n`;
  subscribers.forEach(res => res.write(message));
}

function subscribe(req, res, channel) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });

  if (!listeners.has(channel)) listeners.set(channel, new Set());
  listeners.get(channel).add(res);

  res.write(`data: ${JSON.stringify(currentValue(channel))}\n\n`);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    const subscribers = listeners.get(channel);
    subscribers.delete(res);
    if (subscribers.size === 0) listeners.delete(channel);
  });
}

async function handleApi(req, res, kind, code, isEvents) {
  const channel = `${kind}/${code}`;

  if (isEvents) {
    if (req.method !== "GET") return sendJson(res, 405, { error: "Metoden er ikke tillatt." });
    return subscribe(req, res, channel);
  }

  if (kind === "games") {
    if (req.method === "GET") {
      if (!games.has(code)) return sendJson(res, 404, { error: "Fant ikke spillet." });
      return sendJson(res, 200, games.get(code));
    }

    if (req.method === "PUT") {
      const state = await readJsonBody(req);
      if (!state || typeof state !== "object") return sendJson(res, 400, { error: "Mangler spilltilstand." });
      games.set(code, state);
      touch(code);
      broadcast(channel);
      return sendJson(res, 200, { ok: true });
    }
  }

  if (kind === "buzzers") {
    if (req.method === "GET") {
      return sendJson(res, 200, buzzers.get(code) || {});
    }

    if (req.method === "POST") {
      const buzz = await readJsonBody(req);
      if (!buzz || typeof buzz.team !== "string" || typeof buzz.clientId !== "string") {
        return sendJson(res, 400, { error: "Ugyldig knappetrykk." });
      }

      const pressedAt = Date.now();
      if (pressedAt < (buzzLockedUntil.get(code) || 0)) {
        return sendJson(res, 409, { error: "Et annet lag rakk å trykke først." });
      }
      buzzLockedUntil.set(code, pressedAt + BUZZ_LOCK_MS);

      buzzSequence += 1;
      const buzzId = `${pressedAt}-${String(buzzSequence).padStart(6, "0")}`;

      if (!buzzers.has(code)) buzzers.set(code, {});
      buzzers.get(code)[buzzId] = {
        team: buzz.team,
        clientId: buzz.clientId,
        questionId: typeof buzz.questionId === "string" ? buzz.questionId : "",
        pressedAt
      };

      touch(code);
      broadcast(channel);
      return sendJson(res, 200, { ok: true, id: buzzId });
    }

    if (req.method === "DELETE") {
      buzzers.delete(code);
      buzzLockedUntil.delete(code);
      broadcast(channel);
      return sendJson(res, 200, { ok: true });
    }
  }

  return sendJson(res, 405, { error: "Metoden er ikke tillatt." });
}

// Leser alle offentlige filer inn i minnet ved oppstart, ferdig gzippet.
function loadStaticFiles() {
  const files = new Map();

  function addFile(relativePath) {
    const ext = path.extname(relativePath).toLowerCase();
    const raw = fs.readFileSync(path.join(ROOT, relativePath));
    files.set(relativePath, {
      type: MIME_TYPES[ext] || "application/octet-stream",
      raw,
      gzip: COMPRESSIBLE.has(ext) ? zlib.gzipSync(raw, { level: 9 }) : null,
      etag: `"${crypto.createHash("sha1").update(raw).digest("base64url")}"`
    });
  }

  function addDir(dir) {
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).forEach(entry => {
      const relativePath = `${dir}${entry.name}`;
      if (entry.isDirectory()) addDir(`${relativePath}/`);
      else addFile(relativePath);
    });
  }

  PUBLIC_PATHS.forEach(publicPath => {
    if (publicPath.endsWith("/")) addDir(publicPath);
    else addFile(publicPath);
  });

  return files;
}

const staticFiles = loadStaticFiles();

function serveStatic(req, res, urlPath) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }

  let relativePath;
  try {
    relativePath = decodeURIComponent(urlPath).replace(/^\/+/, "") || "index.html";
  } catch (error) {
    res.writeHead(400);
    res.end();
    return;
  }

  const file = staticFiles.get(relativePath);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Fant ikke siden.");
    return;
  }

  const headers = {
    "Content-Type": file.type,
    "Cache-Control": "no-cache",
    "ETag": file.etag,
    "Vary": "Accept-Encoding"
  };

  if (req.headers["if-none-match"] === file.etag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }

  const useGzip = file.gzip && /\bgzip\b/.test(req.headers["accept-encoding"] || "");
  if (useGzip) headers["Content-Encoding"] = "gzip";

  res.writeHead(200, headers);
  res.end(req.method === "HEAD" ? undefined : (useGzip ? file.gzip : file.raw));
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  // Serverklokka er felles referanse, så alle enheter viser samme nedtelling.
  if (pathname === "/api/time") {
    sendJson(res, 200, { now: Date.now() });
    return;
  }

  const apiMatch = pathname.match(/^\/api\/(games|buzzers)\/(\d{4})(\/events)?$/);

  if (!apiMatch) {
    serveStatic(req, res, pathname);
    return;
  }

  try {
    await handleApi(req, res, apiMatch[1], apiMatch[2], Boolean(apiMatch[3]));
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 400, { error: error.message });
  }
});

setInterval(cleanupIdleGames, CLEANUP_INTERVAL_MS).unref();

server.listen(PORT, () => {
  console.log(`Kontor-Jeopardy kjører på http://localhost:${PORT}`);
});
