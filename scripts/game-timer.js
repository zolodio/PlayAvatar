// ============================================================
//  AVATAR TCG — GAME TIMER & CLOCK SYSTEM
//  Loaded after choice-modal.js
//
//  Features:
//  · Setup screen: host sets per-turn limit & total game limit
//  · Visible game clock + turn counter shown during game
//  · 10-second warning: single 1ms white screen flash
//  · Missed-turn popup: discard (forfeit turn) or auto-play
//  · 2 consecutive auto-turns allowed; 3rd = auto-loss
// ============================================================

(function () {
'use strict';

// ────────────────────────────────────────────────────────────
//  STATE
// ────────────────────────────────────────────────────────────
const TIMER = {
  turnLimitSec:  0,   // 0 = unlimited; set by host in setup
  gameLimitSec:  0,   // 0 = unlimited; set by host in setup
  gameElapsed:   0,   // total seconds elapsed
  turnElapsed:   0,   // seconds elapsed in current turn
  _gameInterval: null,
  _turnInterval: null,
  _warned10:     false,     // whether 10-sec flash already fired this turn
  autoTurnCounts: [0, 0],   // consecutive auto-turns per player idx
  active: false,
};

// ────────────────────────────────────────────────────────────
//  CSS INJECTION
// ────────────────────────────────────────────────────────────
const TIMER_CSS = `
/* ── Game Clock Bar ── */
#game-clock-bar {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: rgba(10,7,4,0.92);
  border-bottom: 1px solid rgba(212,168,67,0.2);
  padding: 3px 14px;
  font-family: 'Cinzel', serif;
  flex-shrink: 0;
  z-index: 30;
}
#game-clock-bar.active { display: flex; }
.clock-seg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.62rem;
  letter-spacing: 1px;
  color: rgba(200,160,80,0.7);
}
.clock-val {
  font-family: 'Courier New', monospace;
  font-size: 0.82rem;
  font-weight: 700;
  color: #d4a843;
  min-width: 40px;
  text-align: center;
}
.clock-val.warning { color: #ff6040; animation: clockPulse 0.5s infinite; }
.clock-val.urgent  { color: #ff2020; animation: clockPulse 0.25s infinite; }
@keyframes clockPulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

.clock-sep {
  color: rgba(212,168,67,0.25);
  font-size: 0.75rem;
}

/* ── White-flash overlay ── */
#timer-flash {
  position: fixed;
  inset: 0;
  background: #fff;
  pointer-events: none;
  opacity: 0;
  z-index: 9999;
  transition: opacity 0s;
}

/* ── Timeout modal ── */
#timeout-modal {
  position: fixed;
  inset: 0;
  z-index: 1150;
  background: rgba(0,0,0,0.88);
  display: none;
  align-items: center;
  justify-content: center;
  animation: cmFadeIn 0.2s ease-out;
}
#timeout-modal.active { display: flex; }
#timeout-modal-box {
  background: linear-gradient(135deg, #1a0e00, #0e0900);
  border: 2px solid #cc4040;
  border-radius: 14px;
  padding: 28px 24px 22px;
  max-width: 400px;
  width: 92%;
  text-align: center;
}
#timeout-modal-box h2 {
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  color: #ff6040;
  letter-spacing: 3px;
  margin-bottom: 8px;
}
#timeout-modal-box p {
  font-family: 'Crimson Pro', serif;
  font-size: 0.88rem;
  color: rgba(200,160,80,0.8);
  margin-bottom: 18px;
  line-height: 1.5;
}
.timeout-streak {
  font-family: 'Cinzel', serif;
  font-size: 0.65rem;
  color: rgba(255,100,60,0.7);
  letter-spacing: 2px;
  margin-bottom: 14px;
}
.timeout-btn-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}
.timeout-btn {
  background: rgba(44,26,12,0.8);
  border: 1px solid rgba(212,168,67,0.4);
  border-radius: 8px;
  padding: 10px 20px;
  font-family: 'Cinzel', serif;
  font-size: 0.72rem;
  letter-spacing: 1px;
  color: #d4a843;
  cursor: pointer;
  transition: all 0.15s;
}
.timeout-btn:hover { background: rgba(212,168,67,0.15); border-color: #d4a843; }
.timeout-btn.danger {
  border-color: rgba(200,60,60,0.5);
  color: #cc6060;
}
.timeout-btn.danger:hover { background: rgba(154,32,32,0.3); border-color: #cc4040; }

/* ── Setup timer section ── */
.timer-setup-section {
  margin-top: 18px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(212,168,67,0.2);
  border-radius: 8px;
  padding: 12px 14px;
}
.timer-setup-title {
  font-family: 'Cinzel', serif;
  font-size: 0.65rem;
  letter-spacing: 2px;
  color: rgba(212,168,67,0.6);
  margin-bottom: 10px;
  text-transform: uppercase;
}
.timer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.timer-row:last-child { margin-bottom: 0; }
.timer-label {
  font-family: 'Cinzel', serif;
  font-size: 0.6rem;
  color: rgba(200,160,80,0.55);
  letter-spacing: 1px;
  flex: 1;
  min-width: 120px;
}
.timer-select {
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(212,168,67,0.3);
  border-radius: 5px;
  padding: 4px 8px;
  color: #d4a843;
  font-family: 'Cinzel', serif;
  font-size: 0.65rem;
  cursor: pointer;
  outline: none;
}
.timer-select:focus { border-color: #d4a843; }
.timer-select option { background: #1a0e00; color: #d4a843; }
`;

function injectStyles() {
  if (document.getElementById('game-timer-css')) return;
  const s = document.createElement('style');
  s.id = 'game-timer-css';
  s.textContent = TIMER_CSS;
  document.head.appendChild(s);
}

// ────────────────────────────────────────────────────────────
//  DOM INJECTION
// ────────────────────────────────────────────────────────────
function injectClockBar() {
  if (document.getElementById('game-clock-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'game-clock-bar';
  bar.innerHTML = `
    <div class="clock-seg">
      <span>TURN</span>
      <span class="clock-val" id="clock-turn-num">1</span>
    </div>
    <div class="clock-sep">|</div>
    <div class="clock-seg">
      <span>TURN TIME</span>
      <span class="clock-val" id="clock-turn-time">—</span>
    </div>
    <div class="clock-sep">|</div>
    <div class="clock-seg">
      <span>GAME TIME</span>
      <span class="clock-val" id="clock-game-time">—</span>
    </div>
  `;
  // Insert at the top of #game-layout, before #header
  const gameLayout = document.getElementById('game-layout');
  if (gameLayout) {
    const header = document.getElementById('header');
    gameLayout.insertBefore(bar, header || gameLayout.firstChild);
  }
}

function injectFlash() {
  if (document.getElementById('timer-flash')) return;
  const el = document.createElement('div');
  el.id = 'timer-flash';
  document.body.appendChild(el);
}

function injectTimeoutModal() {
  if (document.getElementById('timeout-modal')) return;
  const el = document.createElement('div');
  el.id = 'timeout-modal';
  el.innerHTML = `
    <div id="timeout-modal-box">
      <h2>⏰ TIME'S UP</h2>
      <p id="timeout-modal-msg">Your turn timer has expired.</p>
      <div class="timeout-streak" id="timeout-streak"></div>
      <div class="timeout-btn-row">
        <button class="timeout-btn danger" id="timeout-discard-btn">
          🗑 Discard a Card<br>
          <span style="font-size:0.6rem;opacity:0.7;">Forfeit this turn</span>
        </button>
        <button class="timeout-btn" id="timeout-auto-btn">
          🤖 Auto-Play Turn<br>
          <span style="font-size:0.6rem;opacity:0.7;">Game plays for you</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  document.getElementById('timeout-discard-btn').onclick = handleTimeoutDiscard;
  document.getElementById('timeout-auto-btn').onclick = handleTimeoutAuto;
}

// ────────────────────────────────────────────────────────────
//  SETUP SCREEN TIMER CONTROLS (host sets limits)
// ────────────────────────────────────────────────────────────
function injectSetupTimerControls() {
  // Inject into local setup screen
  _injectTimerControlsInto('setup-screen', 'local');
  // Inject into online host lobby — target the host panel
  _injectTimerControlsInto('olp-host', 'online');
}

function _injectTimerControlsInto(screenId, mode) {
  const screen = document.getElementById(screenId);
  if (!screen || screen.querySelector('.timer-setup-section')) return;

  const section = document.createElement('div');
  section.className = 'timer-setup-section';
  section.innerHTML = `
    <div class="timer-setup-title">⏱ TIME LIMITS (HOST)</div>
    <div class="timer-row">
      <span class="timer-label">Per-Turn Time Limit</span>
      <select class="timer-select" id="${mode}-turn-limit">
        <option value="0">Unlimited</option>
        <option value="30">30 seconds</option>
        <option value="45">45 seconds</option>
        <option value="60">1 minute</option>
        <option value="90">1 min 30 sec</option>
        <option value="120">2 minutes</option>
        <option value="180">3 minutes</option>
        <option value="300">5 minutes</option>
      </select>
    </div>
    <div class="timer-row">
      <span class="timer-label">Total Game Time Limit</span>
      <select class="timer-select" id="${mode}-game-limit">
        <option value="0">Unlimited</option>
        <option value="600">10 minutes</option>
        <option value="900">15 minutes</option>
        <option value="1200">20 minutes</option>
        <option value="1800">30 minutes</option>
        <option value="2700">45 minutes</option>
        <option value="3600">1 hour</option>
      </select>
    </div>
  `;

  // For local setup: insert before the start button
  if (mode === 'local') {
    const startBtn = screen.querySelector('.start-btn');
    if (startBtn) screen.insertBefore(section, startBtn);
    else screen.appendChild(section);
  } else {
    // For online host: append at the end of olp-host panel
    screen.appendChild(section);
  }

  // Sync selections to TIMER state on change
  const turnSel = document.getElementById(`${mode}-turn-limit`);
  const gameSel = document.getElementById(`${mode}-game-limit`);
  if (turnSel) turnSel.onchange = () => { TIMER.turnLimitSec = parseInt(turnSel.value) || 0; };
  if (gameSel) gameSel.onchange = () => { TIMER.gameLimitSec = parseInt(gameSel.value) || 0; };
}

// ────────────────────────────────────────────────────────────
//  CLOCK HELPERS
// ────────────────────────────────────────────────────────────
function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function updateClockDisplay() {
  const turnEl = document.getElementById('clock-turn-time');
  const gameEl = document.getElementById('clock-game-time');
  const turnNumEl = document.getElementById('clock-turn-num');

  if (turnNumEl && window.G) turnNumEl.textContent = (G.roundNum || 0) + 1;

  if (turnEl) {
    if (TIMER.turnLimitSec > 0) {
      const remaining = Math.max(0, TIMER.turnLimitSec - TIMER.turnElapsed);
      turnEl.textContent = fmt(remaining);
      turnEl.className = 'clock-val' + (remaining <= 5 ? ' urgent' : remaining <= 10 ? ' warning' : '');
    } else {
      turnEl.textContent = fmt(TIMER.turnElapsed);
      turnEl.className = 'clock-val';
    }
  }

  if (gameEl) {
    if (TIMER.gameLimitSec > 0) {
      const remaining = Math.max(0, TIMER.gameLimitSec - TIMER.gameElapsed);
      gameEl.textContent = fmt(remaining);
      gameEl.className = 'clock-val' + (remaining <= 30 ? ' warning' : '');
    } else {
      gameEl.textContent = fmt(TIMER.gameElapsed);
      gameEl.className = 'clock-val';
    }
  }
}

// ────────────────────────────────────────────────────────────
//  FLASH
// ────────────────────────────────────────────────────────────
function doWarningFlash() {
  const el = document.getElementById('timer-flash');
  if (!el) return;
  el.style.transition = 'opacity 0s';
  el.style.opacity = '1';
  // 1ms visible, then fade to zero
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 80ms ease-out';
      el.style.opacity = '0';
    });
  });
}

// ────────────────────────────────────────────────────────────
//  TIMER CONTROL
// ────────────────────────────────────────────────────────────
function startGameTimers() {
  // Read settings from UI selectors if present
  const localTurn = document.getElementById('local-turn-limit');
  const localGame = document.getElementById('local-game-limit');
  if (localTurn) TIMER.turnLimitSec = parseInt(localTurn.value) || 0;
  if (localGame) TIMER.gameLimitSec = parseInt(localGame.value) || 0;

  const onlineTurn = document.getElementById('online-turn-limit');
  const onlineGame = document.getElementById('online-game-limit');
  if (onlineTurn) TIMER.turnLimitSec = parseInt(onlineTurn.value) || 0;
  if (onlineGame) TIMER.gameLimitSec = parseInt(onlineGame.value) || 0;

  TIMER.gameElapsed = 0;
  TIMER.turnElapsed = 0;
  TIMER._warned10   = false;
  TIMER.autoTurnCounts = [0, 0];
  TIMER.active = true;

  const bar = document.getElementById('game-clock-bar');
  if (bar) bar.classList.add('active');

  // Game-wide tick (every second)
  clearInterval(TIMER._gameInterval);
  TIMER._gameInterval = setInterval(() => {
    if (!TIMER.active) return;
    TIMER.gameElapsed++;

    // Game time expiry check
    if (TIMER.gameLimitSec > 0 && TIMER.gameElapsed >= TIMER.gameLimitSec) {
      clearInterval(TIMER._gameInterval);
      clearInterval(TIMER._turnInterval);
      TIMER.active = false;
      handleGameTimeExpiry();
      return;
    }

    updateClockDisplay();
  }, 1000);

  startTurnTimer();
}

function stopTimers() {
  TIMER.active = false;
  clearInterval(TIMER._gameInterval);
  clearInterval(TIMER._turnInterval);
  const bar = document.getElementById('game-clock-bar');
  if (bar) bar.classList.remove('active');
}

function resetTurnTimer() {
  TIMER.turnElapsed = 0;
  TIMER._warned10   = false;
  clearInterval(TIMER._turnInterval);
  if (TIMER.active) startTurnTimer();
  updateClockDisplay();
}

function startTurnTimer() {
  clearInterval(TIMER._turnInterval);
  TIMER._turnInterval = setInterval(() => {
    if (!TIMER.active) return;
    TIMER.turnElapsed++;

    // 10-second warning flash
    if (TIMER.turnLimitSec > 0) {
      const remaining = TIMER.turnLimitSec - TIMER.turnElapsed;
      if (remaining === 10 && !TIMER._warned10) {
        TIMER._warned10 = true;
        doWarningFlash();
      }
      if (remaining <= 0) {
        clearInterval(TIMER._turnInterval);
        handleTurnTimeout();
        return;
      }
    }

    updateClockDisplay();
  }, 1000);
}

// ────────────────────────────────────────────────────────────
//  TIMEOUT HANDLERS
// ────────────────────────────────────────────────────────────
function handleGameTimeExpiry() {
  if (!window.G) return;
  // Declare winner by score; if tied, current attacker wins
  const p0 = G.players[0], p1 = G.players[1];
  let winnerIdx = 0;
  if (p1.score > p0.score) winnerIdx = 1;
  else if (p0.score === p1.score) winnerIdx = G.attacker || 0;

  addLog('⏰ GAME TIME EXPIRED — winner determined by score!');
  // Trigger game over using existing logic
  if (typeof checkGameOver === 'function') {
    G.players[winnerIdx].score = 3; // force win
    checkGameOver();
  } else {
    const winner = G.players[winnerIdx];
    document.getElementById('winner-text').textContent = `${winner.name} WINS (TIME)!`;
    document.getElementById('gameover-screen').style.display = 'flex';
  }
}

function handleTurnTimeout() {
  if (!window.G) return;
  // Determine whose turn it is
  const playerIdx = G.defender;
  const player = G.players[playerIdx];

  const consecutiveAuto = TIMER.autoTurnCounts[playerIdx];

  // Show the timeout modal
  const modal = document.getElementById('timeout-modal');
  const msgEl  = document.getElementById('timeout-modal-msg');
  const streakEl = document.getElementById('timeout-streak');

  if (msgEl) msgEl.textContent = `${player.name} ran out of time for this turn.`;
  if (streakEl) {
    if (consecutiveAuto > 0) {
      streakEl.textContent = `AUTO-TURN STREAK: ${consecutiveAuto}/2 — a 3rd will end the game.`;
    } else {
      streakEl.textContent = '';
    }
  }

  if (modal) modal.classList.add('active');

  // Auto-close countdown: if no response in 15 seconds, auto-play
  let autoCountdown = 15;
  const autoBtn = document.getElementById('timeout-auto-btn');
  function tickCountdown() {
    if (!modal.classList.contains('active')) return;
    autoCountdown--;
    if (autoBtn) {
      autoBtn.querySelector('span').textContent = `Game plays for you (${autoCountdown}s)`;
    }
    if (autoCountdown <= 0) {
      handleTimeoutAuto();
    } else {
      setTimeout(tickCountdown, 1000);
    }
  }
  setTimeout(tickCountdown, 1000);
}

function closeTimeoutModal() {
  const modal = document.getElementById('timeout-modal');
  if (modal) modal.classList.remove('active');
}

function handleTimeoutDiscard() {
  closeTimeoutModal();
  if (!window.G) return;

  const playerIdx = G.defender;
  const player = G.players[playerIdx];

  // Reset auto-turn count (they responded)
  TIMER.autoTurnCounts[playerIdx] = 0;

  // Discard the current flip card or top deck card
  const zone = G.currentZone ? player.zones[G.currentZone] : null;
  if (zone && zone.flipCard) {
    player.discard.push(zone.flipCard);
    zone.flipCard = null;
    addLog(`${player.name} timed out — discarded ${zone.flipCard ? zone.flipCard.name : 'flip card'} and forfeits turn.`);
  } else if (player.deck.length > 0) {
    const card = player.deck.shift();
    player.discard.push(card);
    addLog(`${player.name} timed out — discarded ${card.name} from deck and forfeits turn.`);
  } else {
    addLog(`${player.name} timed out — forfeits turn.`);
  }

  // Skip to next turn
  _advanceTurnAfterTimeout(playerIdx);
}

function handleTimeoutAuto() {
  closeTimeoutModal();
  if (!window.G) return;

  const playerIdx = G.defender;
  const player = G.players[playerIdx];

  TIMER.autoTurnCounts[playerIdx]++;

  if (TIMER.autoTurnCounts[playerIdx] >= 3) {
    // 3 consecutive auto-turns → auto-loss
    addLog(`${player.name} timed out 3 times in a row — automatic loss!`);
    stopTimers();
    const winnerIdx = 1 - playerIdx;
    const winner = G.players[winnerIdx];
    if (document.getElementById('winner-text')) {
      document.getElementById('winner-text').textContent = `${winner.name} WINS (Timeout)!`;
      document.getElementById('gameover-screen').style.display = 'flex';
    }
    return;
  }

  addLog(`${player.name} timed out — auto-playing turn (${TIMER.autoTurnCounts[playerIdx]}/2).`);

  // Auto-play: flip and discard (simplest safe action)
  _autoPlayTurn(playerIdx);
}

function _autoPlayTurn(playerIdx) {
  if (!window.G) return;
  const player = G.players[playerIdx];

  // If we're in FLIP step: flip the card then discard it (pass zone)
  if (G.phase === 'DEFENSE' && G.step === 'FLIP') {
    if (player.deck.length === 0 && typeof reshuffleDeck === 'function') reshuffleDeck(player);
    if (player.deck.length > 0) {
      const zone = player.zones[G.currentZone];
      zone.flipCard = player.deck.shift();
      addLog(`[AUTO] ${player.name} flips: ${zone.flipCard.name}`);
      // Discard the flipped card and move to next zone
      player.discard.push(zone.flipCard);
      zone.flipCard = null;
      addLog(`[AUTO] ${player.name} discards flipped card.`);
    }
    if (typeof moveToNextZone === 'function') moveToNextZone();
    else _advanceTurnAfterTimeout(playerIdx);
  } else if (G.phase === 'DEFENSE' && G.step === 'CHOOSING') {
    // Discard the flip card
    const zone = player.zones[G.currentZone];
    if (zone && zone.flipCard) {
      player.discard.push(zone.flipCard);
      addLog(`[AUTO] ${player.name} discards ${zone.flipCard.name}.`);
      zone.flipCard = null;
    }
    if (typeof moveToNextZone === 'function') moveToNextZone();
    else _advanceTurnAfterTimeout(playerIdx);
  } else {
    _advanceTurnAfterTimeout(playerIdx);
  }

  if (typeof renderAll === 'function') renderAll();
}

function _advanceTurnAfterTimeout(playerIdx) {
  if (!window.G) return;
  // Jump to the next turn if possible
  if (typeof moveToNextZone === 'function') {
    // Move through remaining zones and finish turn
    const zones = ['green','yellow','red'];
    const ci = zones.indexOf(G.currentZone);
    for (let i = ci; i < zones.length; i++) {
      const zone = G.players[playerIdx].zones[zones[i]];
      if (zone.flipCard) {
        G.players[playerIdx].discard.push(zone.flipCard);
        zone.flipCard = null;
      }
    }
  }
  // Attempt to advance game state
  if (typeof endDefenderTurn === 'function') endDefenderTurn();
  else if (typeof renderAll === 'function') renderAll();
}

// ────────────────────────────────────────────────────────────
//  HOOK INTO GAME FLOW — patch key functions
// ────────────────────────────────────────────────────────────
function patchGameFunctions() {
  // Patch initGame to start timers
  const origInitGame = window.initGame;
  if (typeof origInitGame === 'function') {
    window.initGame = function () {
      origInitGame.apply(this, arguments);
      // Small delay to let game layout render before starting
      setTimeout(() => {
        startGameTimers();
        updateClockDisplay();
      }, 200);
    };
  }

  // Patch renderAll to sync turn counter
  const origRenderAll = window.renderAll;
  if (typeof origRenderAll === 'function') {
    window.renderAll = function () {
      origRenderAll.apply(this, arguments);
      updateClockDisplay();
    };
  }

  // Patch startTurn to reset per-turn timer
  const origStartTurn = window.startTurn;
  if (typeof origStartTurn === 'function') {
    window.startTurn = function (playerIdx) {
      resetTurnTimer();
      origStartTurn.apply(this, arguments);
    };
  }

  // Patch setOpeningAttackDefender to reset timer at game start
  const origSetOpening = window.setOpeningAttackDefender;
  if (typeof origSetOpening === 'function') {
    window.setOpeningAttackDefender = function () {
      resetTurnTimer();
      origSetOpening.apply(this, arguments);
    };
  }

  // Stop timers when game ends
  const origCheckGameOver = window.checkGameOver;
  if (typeof origCheckGameOver === 'function') {
    window.checkGameOver = function () {
      const result = origCheckGameOver.apply(this, arguments);
      // If game is over, stop timers
      if (window.G && (G.phase === 'GAME_OVER' ||
          document.getElementById('gameover-screen').style.display !== 'none' ||
          document.getElementById('online-gameover-screen').style.display !== 'none')) {
        stopTimers();
      }
      return result;
    };
  }
}

// ────────────────────────────────────────────────────────────
//  EXPOSE TIMER STATE TO ONLINE SYNC
// ────────────────────────────────────────────────────────────
// When online mode syncs game state, broadcast timer settings
// so guest receives the same limits.
function patchOnlineSync() {
  const origBegin = window.beginOnlineGame;
  if (typeof origBegin === 'function') {
    window.beginOnlineGame = function () {
      // Read the online timer controls
      const onlineTurn = document.getElementById('online-turn-limit');
      const onlineGame = document.getElementById('online-game-limit');
      if (onlineTurn) TIMER.turnLimitSec = parseInt(onlineTurn.value) || 0;
      if (onlineGame) TIMER.gameLimitSec = parseInt(onlineGame.value) || 0;
      origBegin.apply(this, arguments);
    };
  }
}

// ────────────────────────────────────────────────────────────
//  INIT
// ────────────────────────────────────────────────────────────
function init() {
  injectStyles();
  injectClockBar();
  injectFlash();
  injectTimeoutModal();

  // Inject timer controls after DOM is ready
  // Use MutationObserver to wait for setup screen to be populated
  const tryInject = () => {
    const setup = document.getElementById('setup-screen');
    const host  = document.getElementById('olp-host');
    if (setup) injectSetupTimerControls();
    else setTimeout(tryInject, 300);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(tryInject, 500);
      patchGameFunctions();
      patchOnlineSync();
    });
  } else {
    setTimeout(tryInject, 500);
    patchGameFunctions();
    patchOnlineSync();
  }
}

init();

// ── Expose to global scope for debugging ──────────────────
window.GAME_TIMER = TIMER;
window.resetTurnTimer = resetTurnTimer;
window.stopGameTimers = stopTimers;

})();
