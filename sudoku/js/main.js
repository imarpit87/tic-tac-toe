import { SudokuGame } from './game.js';
import { loadState } from './storage.js';
import { isValidPlacement } from './board.js';

// Elements
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const startGameBtn = document.getElementById('startGameBtn');
const continueLink = document.getElementById('continueLink');
const newGameBtn = document.getElementById('newGameBtn');
const hintBtn = document.getElementById('hintBtn');
const notesToggleBtn = document.getElementById('notesToggleBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const keypad = document.getElementById('sud-keypad');
const toast = document.getElementById('toast');
const timerEl = document.getElementById('timer');
const winModal = document.getElementById('winModal');
const winStats = document.getElementById('winStats');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeWinBtn = document.getElementById('closeWinBtn');
const currentDifficultyEl = document.getElementById('sud-difficulty');
const gridEl = document.getElementById('sudoku-grid');

// Start inputs
const playerNameInput = document.getElementById('playerName');
const avatarPicker = document.getElementById('avatarPicker');
const difficultyGroup = document.getElementById('difficultyGroup');
const themeGroup = document.getElementById('themeGroup');

let selectedAvatar = null; // allow null when none chosen
let selectedDifficulty = 'easy';
let selectedTheme = 'light';

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  selectedTheme = theme;
}

;(() => {
  console.log('Grid ready');
  const saved = loadState();
  if (saved?.theme) setTheme(saved.theme);
  document.documentElement.style.setProperty('--keypad-h', '220px');
})();

const game = new SudokuGame(onUpdate);

const hasSave = !!loadState();
if (!hasSave) continueLink.style.display = 'none';
continueLink?.addEventListener('click', (e) => { e.preventDefault(); if (game.continueLast()) { setTheme(game.theme); enterGameUI(game.player.name, game.player.avatar, game.difficulty); } });

startGameBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  const avatar = selectedAvatar; // may be null
  setTheme(selectedTheme);
  game.newGame({ name, avatar, difficulty: selectedDifficulty, theme: selectedTheme });
  enterGameUI(name, avatar, selectedDifficulty);
});

newGameBtn.addEventListener('click', () => { startScreen.classList.remove('hidden'); gameScreen.classList.add('hidden'); });

avatarPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('.avatar-option'); if (!btn) return;
  [...avatarPicker.querySelectorAll('.avatar-option')].forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAvatar = btn.getAttribute('data-avatar');
});

difficultyGroup.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill'); if (!pill) return;
  [...difficultyGroup.querySelectorAll('.pill')].forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  selectedDifficulty = pill.getAttribute('data-diff') || 'easy';
});

themeGroup.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill'); if (!pill) return;
  [...themeGroup.querySelectorAll('.pill')].forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  setTheme(pill.getAttribute('data-theme') || 'light');
});

// Delegated grid input
gridEl.addEventListener('pointerdown', (e) => {
  const target = e.target.closest('.cell');
  if (!target || !gridEl.contains(target)) return;
  const r = Number(target.getAttribute('data-row'));
  const c = Number(target.getAttribute('data-col'));
  if (Number.isNaN(r) || Number.isNaN(c)) return;
  if (target.classList.contains('given')) return;
  selectCell(r, c);
}, { passive: true });

document.addEventListener('keydown', (e) => {
  if (!game.selected) return;
  const { r, c } = game.selected;
  if (/^[1-9]$/.test(e.key)) { const ok = game.placeNumber(r, c, Number(e.key)); showToast(ok ? 'Nice move!' : 'Conflicts in row'); render(); e.preventDefault(); }
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { const ok = game.placeNumber(r, c, 0); if (!ok) showToast('Conflicts in row'); render(); e.preventDefault(); }
});

// Keypad input
keypad.addEventListener('click', (e) => {
  const btn = e.target.closest('button'); if (!btn) return;
  if (!game.selected) { showToast('Tap a cell, then choose a number'); return; }
  const { r, c } = game.selected;
  if (btn.hasAttribute('data-clear')) { const ok = game.placeNumber(r, c, 0); if (!ok) showToast('Conflicts in row'); render(); return; }
  const n = Number(btn.getAttribute('data-num'));
  if (!n) return;
  const ok = game.placeNumber(r, c, n);
  showToast(ok ? 'Nice move!' : 'Conflicts in row');
  render();
});

hintBtn.addEventListener('click', () => { const h = game.hint(); if (!h) showToast('No logical hint available'); else { selectCell(h.r, h.c); showToast('Hint used'); } });
notesToggleBtn.addEventListener('click', () => { game.toggleNotesMode(); notesToggleBtn.setAttribute('aria-pressed', String(game.notesMode)); showToast(game.notesMode ? 'Notes enabled' : 'Notes disabled'); });
undoBtn.addEventListener('click', () => { if (game.undo()) showToast('Undone'); updateUndoRedo(); render(); });
redoBtn.addEventListener('click', () => { if (game.redo()) showToast('Redone'); updateUndoRedo(); render(); });

function buildGrid() {
  const frag = document.createDocumentFragment();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('data-row', String(r));
      cell.setAttribute('data-col', String(c));
      cell.setAttribute('aria-label', `Row ${r+1}, Column ${c+1}`);
      cell.setAttribute('data-r', String(r));
      cell.setAttribute('data-c', String(c));
      frag.appendChild(cell);
    }
  }
  gridEl.innerHTML = '';
  gridEl.appendChild(frag);
}

function selectCell(r, c) { game.selectCell(r, c); console.log('Selected', r, c); render(); }

function onUpdate(message) { updateUndoRedo(); }

function updateUndoRedo() { undoBtn.disabled = game.undoStack.length <= 1; redoBtn.disabled = game.redoStack.length === 0; }

function enterGameUI(name, avatar, difficulty) {
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  currentDifficultyEl.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  buildGrid();
  render();
}

let toastTimeout;
function showToast(msg) { clearTimeout(toastTimeout); toast.textContent = msg; toast.classList.add('show'); toastTimeout = setTimeout(() => toast.classList.remove('show'), 2000); }

function highlightPeers(selected) {
  const { r, c } = selected;
  for (let rr = 0; rr < 9; rr++) {
    for (let cc = 0; cc < 9; cc++) {
      const el = gridEl.children[rr * 9 + cc];
      el.classList.remove('peer');
      if (selected && (rr === r || cc === c || (Math.floor(rr/3) === Math.floor(r/3) && Math.floor(cc/3) === Math.floor(c/3)))) el.classList.add('peer');
    }
  }
}

function render() {
  timerEl.textContent = formatTime(game.elapsedMs);
  const sel = game.selected;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = gridEl.children[r * 9 + c];
      const val = game.board[r][c];
      el.className = 'cell';
      if (game.fixed[r][c]) el.classList.add('given');
      if (sel && sel.r === r && sel.c === c) el.classList.add('selected');
      el.textContent = val === 0 ? '' : String(val);
      if (val !== 0 && !game.fixed[r][c]) {
        const temp = val; game.board[r][c] = 0; const invalid = !isValidPlacement(game.board, r, c, temp); game.board[r][c] = temp; if (invalid) el.classList.add('conflict');
      }
    }
  }
  if (sel) highlightPeers(sel);
  if (game.solved()) { winStats.textContent = `Puzzle solved! Great job 🎉\nTime: ${formatTime(game.elapsedMs)}`; winModal.classList.remove('hidden'); }
}

function formatTime(ms) { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const sec = s % 60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

playAgainBtn.addEventListener('click', () => { winModal.classList.add('hidden'); newGameBtn.click(); });
closeWinBtn.addEventListener('click', () => winModal.classList.add('hidden'));

(function wrapPlace() {
  const orig = game.placeNumber.bind(game);
  game.placeNumber = (r, c, val) => { const res = orig(r, c, val); if (val === 0) console.log('Cleared', r, c); else console.log('Placed', val, 'at', r, c); return res; };
})();