/*
  Felles tilstand for hele appen.
  Alle skriptfilene leser og endrer disse variablene.
*/

let editorDraftQuestions = [];
let editorSetId = null; // null = nytt spørsmålssett

let teams = [];
let usedQuestions = new Set();
let currentQuestion = null;
let currentTeamIndex = 0;
let isLiveMode = false;
let questionTimerInterval = null;
let pendingScoreAction = null;
let currentGameCode = "";
let joinedGameState = null;
let selectedBuzzerTeam = "";
let unsubscribeBuzzes = null;
let unsubscribeBuzzerGame = null;
let unsubscribeLiveGame = null;
let buzzerGateInterval = null;
let buzzerUnlockAt = 0;
let activeQuestionId = "";
let latestBuzzes = [];
let isSendingBuzz = false;
let activeSpecial = ""; // spesialrunde som vises på alle skjermer (se special.js)

const BUZZ_LOCK_MS = 20000; // knappen er låst for alle så lenge etter hvert trykk

const buzzerClientId = sessionStorage.getItem("jeopardyBuzzerClientId") ||
  (window.crypto?.randomUUID?.() || `client-${Date.now()}-${Math.random()}`);
sessionStorage.setItem("jeopardyBuzzerClientId", buzzerClientId);
