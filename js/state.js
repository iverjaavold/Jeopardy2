/*
  Felles tilstand for hele appen.
  Alle skriptfilene leser og endrer disse variablene.
*/

let editorDraftQuestions = [];

let teams = [];
let usedQuestions = new Set();
let currentQuestion = null;
let currentTeamIndex = 0;
let isLiveMode = false;
let questionTimerInterval = null;
let questionTimeLeft = 60;
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
let latestHostBuzzes = [];
let hasCurrentClientBuzz = false;
let isBetaMode = sessionStorage.getItem("jeopardyBetaMode") === "true";

const LOCAL_GAME_PREFIX = "jeopardy-beta-game-";
const LOCAL_BUZZ_PREFIX = "jeopardy-beta-buzzes-";
const buzzerClientId = sessionStorage.getItem("jeopardyBuzzerClientId") ||
  (window.crypto?.randomUUID?.() || `client-${Date.now()}-${Math.random()}`);
sessionStorage.setItem("jeopardyBuzzerClientId", buzzerClientId);
