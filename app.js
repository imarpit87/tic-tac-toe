import { Confetti } from './confetti.js';
import { getBestMove } from './ai.js';

// App State
let currentPlayer = 'X';
let gameBoard = Array(9).fill('');
let gameActive = true;
let gameMode = '';
let difficulty = 'easy';
let scores = { player1: 0, player2: 0 };
let isAIThinking = false;
let bestOf = 1;
let moveHistory = [];
let online = { roomId: null, isHost: false, mySide: null, myName: '', myAvatar: '🧑‍🚀', suppressNextSound: false, clientId: null };
online.lastResetAt = 0;
online.prevJoined = { X: false, O: false };

// DOM
const boardEl = document.getElementById('board');
const gameInfoEl = document.getElementById('gameInfo');
const gamePlayEl = document.getElementById('gamePlay');
const gameSetupEl = document.getElementById('gameSetup');
const startBtn = document.getElementById('startBtn');
const difficultyDiv = document.getElementById('difficultySelection');
const roundsDiv = document.getElementById('roundsSelection');
const roundsSelect = document.getElementById('roundsSelect');
const soundToggle = document.getElementById('soundToggle');
const themeSelect = document.getElementById('themeSelect');
const undoBtn = document.getElementById('undoBtn');
const player1NameEl = document.getElementById('player1Name');
const player2NameEl = document.getElementById('player2Name');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');
const turnIndicatorEl = document.getElementById('turnIndicator');
const confetti = new Confetti(document.getElementById('confettiCanvas'));
const appVersionEl = document.getElementById('appVersion');
let appVersion = '';

// Online elements
const onlineSetupEl = document.getElementById('onlineSetup');
const playerNameInput = document.getElementById('playerNameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomStatusEl = document.getElementById('roomStatus');
const avatarPickerEl = document.getElementById('avatarPicker');
const shareRoomBtn = document.getElementById('shareRoomBtn');
const roomCodeWrap = document.getElementById('roomCodeWrap');
const roomCodeText = document.getElementById('roomCodeText');
const copyCodeBtn = document.getElementById('copyCodeBtn');

// Audio
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let soundEnabled = true;

function createSound(frequency, duration, type = 'sine', volume = 0.25) {
  if (!soundEnabled) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playClickSound() { createSound(820, 0.08, 'sine', 0.18); }
function playXSound() { createSound(740, 0.12, 'triangle', 0.22); }
function playOSound() { createSound(540, 0.12, 'square', 0.22); }
function playWinSound() {
  createSound(523, 0.22, 'sine', 0.28); // C
  setTimeout(() => createSound(659, 0.22, 'sine', 0.28), 80); // E
  setTimeout(() => createSound(784, 0.35, 'sine', 0.28), 160); // G
}
function playClapSound() {
  if (!soundEnabled) return;
  const bufferSize = audioContext.sampleRate * 0.1;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3 * Math.exp(-i / (bufferSize * 0.1));
  }
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
}

// Haptics
function vibrate(pattern) { if (navigator.vibrate) navigator.vibrate(pattern); }

// Persistence
const STORAGE_KEY = 'ttt_settings_v1';
function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: document.documentElement.getAttribute('data-theme') || 'light', soundEnabled, difficulty, bestOf }));
}
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!s) return;
    if (s.theme) setTheme(s.theme);
    if (typeof s.soundEnabled === 'boolean') { soundEnabled = s.soundEnabled; soundToggle.checked = soundEnabled; }
    if (s.difficulty) difficulty = s.difficulty;
    if (s.bestOf) bestOf = Number(s.bestOf);
  } catch {}
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeSelect.value = theme;
  saveSettings();
}

// UI setup
soundToggle.addEventListener('change', () => { soundEnabled = soundToggle.checked; saveSettings(); playClickSound(); });
themeSelect.addEventListener('change', () => setTheme(themeSelect.value));
roundsSelect.addEventListener('change', () => { bestOf = Number(roundsSelect.value); saveSettings(); });
undoBtn.addEventListener('click', () => undoMove());

// Keyboard controls
boardEl.addEventListener('keydown', (e) => {
  const focused = document.activeElement;
  if (!focused.classList.contains('cell')) return;
  const idx = Number(focused.getAttribute('data-cell'));
  if (['Enter', ' '].includes(e.key)) { makeMove(idx); e.preventDefault(); }
  const row = Math.floor(idx / 3), col = idx % 3;
  if (e.key === 'ArrowRight') focusCell(row, (col + 1) % 3);
  if (e.key === 'ArrowLeft') focusCell(row, (col + 2) % 3);
  if (e.key === 'ArrowDown') focusCell((row + 1) % 3, col);
  if (e.key === 'ArrowUp') focusCell((row + 2) % 3, col);
});
function focusCell(r, c) { const i = r * 3 + c; const el = boardEl.querySelector(`[data-cell="${i}"]`); if (el) el.focus(); }

// Exposed for buttons
window.selectMode = (mode) => {
  gameMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
  const evTarget = (window.event && window.event.target);
  if (evTarget && evTarget.classList.contains('mode-btn')) evTarget.classList.add('active');

  difficultyDiv.classList.toggle('show', mode === 'ai');
  roundsDiv.classList.add('show');
  onlineSetupEl.style.display = mode === 'online' ? 'block' : 'none';
  startBtn.style.display = 'inline-block';
  // Show undo only for AI mode
  undoBtn.style.display = mode === 'ai' ? 'inline-block' : 'none';
  playClickSound();
};

window.setDifficulty = (level) => {
  difficulty = level;
  document.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
  const evTarget = (window.event && window.event.target);
  if (evTarget && evTarget.classList.contains('difficulty-btn')) evTarget.classList.add('active');
  saveSettings();
  playClickSound();
};

window.startGame = () => {
  gameSetupEl.classList.add('hidden');
  gamePlayEl.classList.add('active');

  if (gameMode === 'ai') {
    player1NameEl.textContent = 'You (X)';
    player2NameEl.textContent = 'AI (O)';
  } else if (gameMode === 'human') {
    player1NameEl.textContent = 'Player 1 (X)';
    player2NameEl.textContent = 'Player 2 (O)';
  } else if (gameMode === 'online') {
    player1NameEl.textContent = `${online.myName || 'You'} (X)`;
    player2NameEl.textContent = 'Friend (O)';
  }

  scores = { player1: 0, player2: 0 };
  updateScores();
  resetBoard();
  // Show undo only for AI mode
  undoBtn.style.display = gameMode === 'ai' ? 'inline-block' : 'none';
  playClickSound();
};

function resetBoard() {
  gameBoard = Array(9).fill('');
  currentPlayer = 'X';
  gameActive = true;
  isAIThinking = false;
  moveHistory = [];

  document.querySelectorAll('.cell').forEach((cell, i) => {
    cell.textContent = '';
    cell.className = 'cell';
    cell.setAttribute('aria-label', `Row ${Math.floor(i/3)+1}, Column ${i%3+1}, empty`);
    cell.classList.remove('winner', 'disabled', 'x', 'o');
  });
  // ensure board is interactive after reset
  boardEl.classList.remove('ai-thinking');
  updateGameInfo();
}

function updateTurnIndicator() {
  if (!gameActive) { turnIndicatorEl.textContent = ''; return; }
  if (gameMode === 'ai') {
    turnIndicatorEl.textContent = currentPlayer === 'X' ? 'Your move' : 'AI thinking…';
  } else if (gameMode === 'human' || gameMode === 'online') {
    turnIndicatorEl.textContent = `Turn: ${currentPlayer}`;
  }
}

function updateGameInfo() {
  if (!gameActive) return;
  if (gameMode === 'ai') gameInfoEl.textContent = currentPlayer === 'X' ? 'Your turn' : 'AI is thinking…';
  else if (gameMode === 'online') {
    const name = currentPlayer === 'X' ? (player1NameEl.textContent || 'Player X') : (player2NameEl.textContent || 'Player O');
    gameInfoEl.textContent = `${name}'s turn`;
  } else gameInfoEl.textContent = `Player ${currentPlayer}'s turn`;
  updateTurnIndicator();
}

window.makeMove = (cellIndex) => {
  if (!gameActive || gameBoard[cellIndex] !== '' || isAIThinking) return;
  if (gameMode === 'online') {
    // Enforce turn ownership
    const myTurn = online.mySide === currentPlayer;
    if (!myTurn) return;
  }
  if (audioContext.state === 'suspended') audioContext.resume();

  gameBoard[cellIndex] = currentPlayer;
  const cell = document.querySelector(`[data-cell="${cellIndex}"]`);
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());
  cell.setAttribute('aria-label', `Row ${Math.floor(cellIndex/3)+1}, Column ${cellIndex%3+1}, ${currentPlayer}`);
  moveHistory.push({ index: cellIndex, player: currentPlayer });

  if (currentPlayer === 'X') playXSound(); else playOSound();
  vibrate(10);

  if (checkWinner()) { endGame(currentPlayer); if (gameMode === 'online') pushOnlineState(true); return; }
  if (checkDraw()) { endGame('draw'); if (gameMode === 'online') pushOnlineState(true); return; }

  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateGameInfo();

  if (gameMode === 'ai' && currentPlayer === 'O' && gameActive) {
    makeAIMove();
  }

  if (gameMode === 'online') {
    pushOnlineState();
  }
};

function undoMove() {
  if (gameMode !== 'ai') return;
  if (!gameActive) return;
  if (moveHistory.length === 0) return;
  const last = moveHistory.pop();
  gameBoard[last.index] = '';
  let cell = document.querySelector(`[data-cell="${last.index}"]`);
  cell.textContent = '';
  cell.classList.remove('x', 'o', 'winner', 'disabled');
  if (moveHistory.length > 0) {
    const prev = moveHistory[moveHistory.length - 1];
    if (prev.player !== last.player) {
      moveHistory.pop();
      gameBoard[prev.index] = '';
      cell = document.querySelector(`[data-cell="${prev.index}"]`);
      cell.textContent = '';
      cell.classList.remove('x', 'o', 'winner', 'disabled');
    }
  }
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('winner', 'disabled'));
  currentPlayer = 'X';
  updateGameInfo();
}

function makeAIMove() {
  isAIThinking = true;
  boardEl.classList.add('ai-thinking');
  gameInfoEl.classList.add('pulse');

  setTimeout(() => {
    const move = getBestMove(gameBoard, difficulty, 'O');
    if (move !== -1) {
      gameBoard[move] = 'O';
      const cell = document.querySelector(`[data-cell="${move}"]`);
      cell.textContent = 'O';
      cell.classList.add('o');
      createSound(600, 0.15, 'square', 0.2);

      if (checkWinner()) endGame('O');
      else if (checkDraw()) endGame('draw');
      else { currentPlayer = 'X'; updateGameInfo(); }
    }
    isAIThinking = false;
    boardEl.classList.remove('ai-thinking');
    gameInfoEl.classList.remove('pulse');
  }, 600 + Math.random() * 600);
}

function checkWinner() {
  const winPatterns = [ [0,1,2],[3,4,5],[6,7,8], [0,3,6],[1,4,7],[2,5,8], [0,4,8],[2,4,6] ];
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('winner'));
  for (const pattern of winPatterns) {
    const [a,b,c] = pattern;
    if (gameBoard[a] && gameBoard[a] === gameBoard[b] && gameBoard[a] === gameBoard[c]) {
      pattern.forEach(i => document.querySelector(`[data-cell="${i}"]`).classList.add('winner'));
      return true;
    }
  }
  return false;
}

function checkDraw() { return gameBoard.every(cell => cell !== ''); }

function endGame(winner) {
  gameActive = false;
  if (winner === 'draw') {
    gameInfoEl.textContent = "It's a draw! 🤝";
  } else {
    if (gameMode === 'ai') {
      if (winner === 'X') { gameInfoEl.textContent = 'You win! 🎉'; scores.player1++; confetti.emitBurst(160); setTimeout(() => { playWinSound(); playClapSound(); }, 300); }
      else { gameInfoEl.textContent = 'AI wins! 🤖'; scores.player2++; }
    } else if (gameMode === 'online') {
      const name = winner === 'X' ? (player1NameEl.textContent || 'Player X') : (player2NameEl.textContent || 'Player O');
      gameInfoEl.textContent = `${name} wins! 🎉`;
      confetti.emitBurst(200);
      setTimeout(() => { playWinSound(); playClapSound(); }, 300);
    } else {
      gameInfoEl.textContent = `Player ${winner} wins! 🎉`;
      if (winner === 'X') scores.player1++; else scores.player2++;
      confetti.emitBurst(160);
      setTimeout(() => { playWinSound(); playClapSound(); }, 300);
    }
  }
  updateScores();
  document.querySelectorAll('.cell').forEach(cell => cell.classList.add('disabled'));

  // Do not auto-reset in any mode; wait for New Game button
}

function shouldContinueMatch() {
  if (bestOf === 1) return false;
  const needed = Math.ceil(bestOf / 2);
  return scores.player1 < needed && scores.player2 < needed;
}

function updateScores() {
  score1El.textContent = scores.player1;
  score2El.textContent = scores.player2;
}

window.resetGame = () => {
  if (gameMode === 'online' && online.roomId) {
    requestOnlineNewGame();
  } else {
    resetBoard();
  }
  playClickSound();
};
window.backToMenu = () => {
  gameSetupEl.classList.remove('hidden');
  gamePlayEl.classList.remove('active');
  scores = { player1: 0, player2: 0 };
  updateScores();
  playClickSound();
};

// Online (enhanced)
function initOnline() {
  if (!window.database) { roomStatusEl.textContent = 'Online mode unavailable: Firebase not configured.'; return; }
  roomStatusEl.textContent = 'Ready. Pick name and avatar, then create or join a room.';
  // Generate a simple clientId for presence tracking
  online.clientId = Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// avatar selection
avatarPickerEl?.addEventListener('click', (e) => {
  const btn = e.target.closest('.avatar-option');
  if (!btn) return;
  avatarPickerEl.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  online.myAvatar = btn.dataset.avatar;
});

async function createRoom() {
  try {
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    online.myName = (playerNameInput.value || '');
    await window.database.ref(`rooms/${code}`).set({
      status: 'waiting',
      board: Array(9).fill(''),
      currentPlayer: 'X',
      scores: { player1: 0, player2: 0 },
      players: {
        X: { name: online.myName || 'Player X', avatar: online.myAvatar, joined: true, clientId: online.clientId },
        O: { name: '', avatar: '', joined: false, clientId: null }
      },
      updatedAt: Date.now()
    });
    online.roomId = code; online.isHost = true; online.mySide = 'X';
    // onDisconnect: free up X seat if host disconnects
    window.database.ref(`rooms/${code}/players/X`).onDisconnect().update({ joined: false, clientId: null });
    roomStatusEl.textContent = `Room created: ${code} (share link or code)`;
    // Enable share button with deep link and show code
    if (shareRoomBtn) {
      shareRoomBtn.style.display = 'inline-block';
      shareRoomBtn.onclick = () => shareInviteLink(code);
    }
    if (roomCodeWrap && roomCodeText && copyCodeBtn) {
      roomCodeWrap.style.display = 'flex';
      roomCodeText.textContent = code;
      copyCodeBtn.onclick = () => copyToClipboard(code);
    }
    listenRoom(code);
  } catch (e) { roomStatusEl.textContent = `Error creating room: ${e.message}`; }
}

async function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) { roomStatusEl.textContent = 'Enter room code'; return; }
  const snap = await window.database.ref(`rooms/${code}`).once('value');
  if (!snap.exists()) { roomStatusEl.textContent = 'Room not found'; return; }
  const data = snap.val();
  online.myName = (playerNameInput.value || '').trim();
  const players = data.players || {};
  const xJoined = !!(players.X && players.X.joined === true);
  const oJoined = !!(players.O && players.O.joined === true);
  let side = null;
  if (!oJoined) side = 'O'; else if (!xJoined) side = 'X'; else { roomStatusEl.textContent = 'Room full'; return; }

  await window.database.ref(`rooms/${code}/players/${side}`).update({ name: online.myName || (side === 'X' ? 'Player X' : 'Player O'), avatar: online.myAvatar, joined: true, clientId: online.clientId });
  // onDisconnect: free seat when this client disconnects
  window.database.ref(`rooms/${code}/players/${side}`).onDisconnect().update({ joined: false, clientId: null });
  await window.database.ref(`rooms/${code}`).update({ updatedAt: Date.now() });
  online.roomId = code; online.isHost = false; online.mySide = side;
  roomStatusEl.textContent = `Joined room: ${code} as ${side}`;
  listenRoom(code);
}

function listenRoom(code) {
  window.database.ref(`rooms/${code}`).on('value', (snap) => {
    const data = snap.val(); if (!data) return;
    gameBoard = data.board || Array(9).fill('');
    currentPlayer = data.currentPlayer || 'X';
    scores = data.scores || scores;

    // Players & names/avatars
    const pX = data.players?.X || { name: 'X', avatar: '❌', joined: false };
    const pO = data.players?.O || { name: 'O', avatar: '⭕', joined: false };
    // Join/leave messages and status
    if (!pO.joined || !pX.joined) {
      roomStatusEl.textContent = 'Waiting for player to join…';
    }
    if (pX.joined !== online.prevJoined.X) {
      roomStatusEl.textContent = pX.joined ? `${pX.name || 'Player X'} joined as X` : `Player X left`;
      online.prevJoined.X = pX.joined;
    }
    if (pO.joined !== online.prevJoined.O) {
      roomStatusEl.textContent = pO.joined ? `${pO.name || 'Player O'} joined as O` : `Player O left`;
      online.prevJoined.O = pO.joined;
    }
    player1NameEl.textContent = `${pX.name || 'Player X'} (X)`;
    player2NameEl.textContent = `${pO.name || 'Player O'} (O)`;
    document.getElementById('player1Avatar').textContent = pX.avatar || '❌';
    document.getElementById('player2Avatar').textContent = pO.avatar || '⭕';

    updateScores();
    renderBoard();

    const bothJoined = pX.joined && pO.joined;
    if (bothJoined) {
      if (!gameSetupEl.classList.contains('hidden')) {
        gameSetupEl.classList.add('hidden');
        gamePlayEl.classList.add('active');
      }
      // Hide undo in online always
      undoBtn.style.display = 'none';

      // State-driven behavior
      const status = data.status || 'waiting';
      if (status === 'waiting') {
        // First time both joined: start playing
        const resetAt = Date.now();
        window.database.ref(`rooms/${code}`).update({ status: 'playing', currentPlayer: 'X', board: Array(9).fill(''), resetAt, updatedAt: Date.now() });
        online.lastResetAt = resetAt;
        roomStatusEl.textContent = 'Both players joined. Starting… X to move';
      } else if (status === 'playing') {
        const turnName = currentPlayer === 'X' ? (pX.name || 'X') : (pO.name || 'O');
        roomStatusEl.textContent = `${turnName}'s turn`;
      } else if (status === 'ended') {
        roomStatusEl.textContent = 'Game over. Click New Game to play again';
      }
    }

    // React to server-initiated reset
    if (data.resetAt && data.resetAt !== online.lastResetAt) {
      online.lastResetAt = data.resetAt;
      resetBoard();
      roomStatusEl.textContent = 'New game started';
    }

    // Disable input if not my turn
    const myTurn = online.mySide === currentPlayer;
    boardEl.classList.toggle('ai-thinking', !myTurn);

    gameActive = !checkWinner() && !checkDraw();
    updateGameInfo();
  });
}

function pushOnlineState(end = false) {
  if (!online.roomId) return;
  window.database.ref(`rooms/${online.roomId}`).update({
    board: gameBoard,
    currentPlayer,
    scores,
    updatedAt: Date.now(),
    status: end ? 'ended' : 'playing',
    lastMoveBy: online.clientId
  });
}

function requestOnlineNewGame() {
  if (!online.roomId) return;
  const resetAt = Date.now();
  window.database.ref(`rooms/${online.roomId}`).update({
    board: Array(9).fill(''),
    currentPlayer: 'X',
    status: 'playing',
    resetAt,
    updatedAt: Date.now()
  });
}

function renderBoard() {
  document.querySelectorAll('.cell').forEach((cell, i) => {
    const val = gameBoard[i];
    cell.textContent = val;
    cell.classList.toggle('x', val === 'X');
    cell.classList.toggle('o', val === 'O');
  });
}

createRoomBtn?.addEventListener('click', () => { if (!window.database) { roomStatusEl.textContent = 'Firebase not configured'; return; } createRoom(); });
joinRoomBtn?.addEventListener('click', () => { if (!window.database) { roomStatusEl.textContent = 'Firebase not configured'; return; } joinRoom(); });

function shareInviteLink(code) {
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  const link = url.toString();
  if (navigator.share) {
    navigator.share({ title: 'Join my Tic Tac Toe game', text: 'Tap to join my game', url: link }).catch(() => copyToClipboard(link));
  } else {
    copyToClipboard(link);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => roomStatusEl.textContent = 'Invite link copied to clipboard').catch(() => fallbackCopy(text));
  } else fallbackCopy(text);
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); roomStatusEl.textContent = 'Invite link copied to clipboard'; } finally { ta.remove(); }
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  updateScores();
  setTheme(themeSelect.value || 'light');
  // Reflect saved difficulty selection button
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    if (btn.dataset.difficulty === difficulty) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  initOnline();
  // Fetch and show version; trigger SW update if changed
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    const data = await res.json();
    appVersion = data.version || '';
    if (appVersionEl) appVersionEl.textContent = `v${appVersion}`;
  } catch {}
  // PWA service worker
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('./service-worker.js');
      if (reg.waiting) { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); }
    } catch {}
  }
  // Deep link behavior: prefill code but do not auto-join so user can set name/avatar
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  if (roomParam) {
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    gameMode = 'online';
    onlineSetupEl.style.display = 'block';
    roomCodeInput.value = roomParam.toUpperCase();
    // Hide undo in online always
    undoBtn.style.display = 'none';
    // Wait for user to optionally set name/avatar, then click Join
  }
});