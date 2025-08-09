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
let online = { roomId: null, isHost: false };

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

// Online elements
const onlineSetupEl = document.getElementById('onlineSetup');
const playerNameInput = document.getElementById('playerNameInput');
const roomCodeInput = document.getElementById('roomCodeInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomStatusEl = document.getElementById('roomStatus');

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
    player1NameEl.textContent = 'You (X)';
    player2NameEl.textContent = 'Friend (O)';
  }

  scores = { player1: 0, player2: 0 };
  updateScores();
  resetBoard();
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
  else gameInfoEl.textContent = `Player ${currentPlayer}'s turn`;
  updateTurnIndicator();
}

window.makeMove = (cellIndex) => {
  if (!gameActive || gameBoard[cellIndex] !== '' || isAIThinking) return;
  if (audioContext.state === 'suspended') audioContext.resume();

  gameBoard[cellIndex] = currentPlayer;
  const cell = document.querySelector(`[data-cell="${cellIndex}"]`);
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());
  cell.setAttribute('aria-label', `Row ${Math.floor(cellIndex/3)+1}, Column ${cellIndex%3+1}, ${currentPlayer}`);
  moveHistory.push({ index: cellIndex, player: currentPlayer });

  playClickSound();
  vibrate(10);

  if (checkWinner()) { endGame(currentPlayer); return; }
  if (checkDraw()) { endGame('draw'); return; }

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
  if (gameMode !== 'human') return; // limit to local human vs human for now
  if (moveHistory.length === 0 || !gameActive) return;
  const last = moveHistory.pop();
  gameBoard[last.index] = '';
  const cell = document.querySelector(`[data-cell="${last.index}"]`);
  cell.textContent = '';
  cell.classList.remove('x', 'o');
  currentPlayer = last.player;
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
    } else {
      gameInfoEl.textContent = `Player ${winner} wins! 🎉`;
      if (winner === 'X') scores.player1++; else scores.player2++;
      confetti.emitBurst(160);
      setTimeout(() => { playWinSound(); playClapSound(); }, 300);
    }
  }
  updateScores();
  document.querySelectorAll('.cell').forEach(cell => cell.classList.add('disabled'));

  if (shouldContinueMatch()) {
    setTimeout(() => { resetBoard(); }, 1200);
  }
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

window.resetGame = () => { resetBoard(); playClickSound(); };
window.backToMenu = () => {
  gameSetupEl.classList.remove('hidden');
  gamePlayEl.classList.remove('active');
  scores = { player1: 0, player2: 0 };
  updateScores();
  playClickSound();
};

// Online (basic)
function initOnline() {
  if (!window.database) { roomStatusEl.textContent = 'Online mode unavailable: Firebase not configured.'; return; }
  roomStatusEl.textContent = 'Ready.';
}

async function createRoom() {
  try {
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    await window.database.ref(`rooms/${code}`).set({
      status: 'waiting',
      board: Array(9).fill(''),
      currentPlayer: 'X',
      scores: { player1: 0, player2: 0 },
      updatedAt: Date.now()
    });
    online.roomId = code; online.isHost = true;
    roomStatusEl.textContent = `Room created: ${code}`;
    listenRoom(code);
  } catch (e) { roomStatusEl.textContent = `Error creating room: ${e.message}`; }
}

async function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) { roomStatusEl.textContent = 'Enter room code'; return; }
  const snap = await window.database.ref(`rooms/${code}`).once('value');
  if (!snap.exists()) { roomStatusEl.textContent = 'Room not found'; return; }
  online.roomId = code; online.isHost = false;
  roomStatusEl.textContent = `Joined room: ${code}`;
  listenRoom(code);
}

function listenRoom(code) {
  window.database.ref(`rooms/${code}`).on('value', (snap) => {
    const data = snap.val(); if (!data) return;
    gameBoard = data.board || Array(9).fill('');
    currentPlayer = data.currentPlayer || 'X';
    scores = data.scores || scores;
    updateScores();
    renderBoard();
    gameActive = !checkWinner() && !checkDraw();
    updateGameInfo();
  });
}

function pushOnlineState() {
  if (!online.roomId) return;
  window.database.ref(`rooms/${online.roomId}`).update({
    board: gameBoard,
    currentPlayer,
    scores,
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

// Init
window.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  updateScores();
  setTheme(themeSelect.value || 'light');
  initOnline();
  // PWA service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
});