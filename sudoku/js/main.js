import { SudokuGame } from './game.js';
import { loadState } from './storage.js';

const gridEl = document.getElementById('sudokuGrid');
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const startGameBtn = document.getElementById('startGameBtn');
const continueLink = document.getElementById('continueLink');
const newGameBtn = document.getElementById('newGameBtn');
const hintBtn = document.getElementById('hintBtn');
const notesToggleBtn = document.getElementById('notesToggleBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const keypad = document.getElementById('keypad');
const toast = document.getElementById('toast');
const timerEl = document.getElementById('timer');
const winModal = document.getElementById('winModal');
const winStats = document.getElementById('winStats');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeWinBtn = document.getElementById('closeWinBtn');
const playerAvatar = document.getElementById('playerAvatar');
const playerLabel = document.getElementById('playerLabel');
const currentDifficulty = document.getElementById('currentDifficulty');

const playerNameInput = document.getElementById('playerName');
const avatarPicker = document.getElementById('avatarPicker');
const avatarSkipBtn = document.getElementById('avatarSkipBtn');
const difficultyGroup = document.getElementById('difficultyGroup');
const themeGroup = document.getElementById('themeGroup');

let selectedAvatar = '';
let selectedDifficulty = 'easy';
let selectedTheme = 'light';

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  selectedTheme = theme;
}

;(() => {
  const saved = loadState();
  if (saved?.theme) setTheme(saved.theme);
})();

const game = new SudokuGame(onUpdate);

const hasSave = !!loadState();
if (!hasSave) continueLink.style.display = 'none';
continueLink?.addEventListener('click', (e) => { e.preventDefault(); if (game.continueLast()) { setTheme(game.theme); enterGameUI(game.player.name, game.player.avatar, game.difficulty); } });

startGameBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  const avatar = selectedAvatar || '🧑';
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
avatarSkipBtn.addEventListener('click', () => { selectedAvatar = ''; [...avatarPicker.querySelectorAll('.avatar-option')].forEach(b => b.classList.remove('selected')); });

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

hintBtn.addEventListener('click', () => { const h = game.hint(); if (!h) showToast('No logical hint available right now—try another area'); else { selectCell(h.r, h.c); showToast('Hint used'); } });
notesToggleBtn.addEventListener('click', () => { game.toggleNotesMode(); notesToggleBtn.setAttribute('aria-pressed', String(game.notesMode)); showToast(game.notesMode ? 'Notes enabled' : 'Notes disabled'); });
undoBtn.addEventListener('click', () => { if (game.undo()) showToast('Undone'); updateUndoRedo(); render(); });
redoBtn.addEventListener('click', () => { if (game.redo()) showToast('Redone'); updateUndoRedo(); render(); });

keypad.addEventListener('click', (e) => {
  const key = e.target.closest('.key'); if (!key) return;
  if (!game.selected) { showToast('Tap a cell, then choose a number'); return; }
  const val = Number(key.getAttribute('data-num'));
  const { r, c } = game.selected;
  const ok = game.placeNumber(r, c, val);
  if (!ok) showToast('That conflicts with this row/column/box'); else showToast('Nice move!');
  render();
});

function buildGrid() {
  const frag = document.createDocumentFragment();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const btn = document.createElement('button');
      btn.className = 'cell';
      btn.setAttribute('data-r', String(r));
      btn.setAttribute('data-c', String(c));
      btn.setAttribute('role', 'gridcell');
      btn.addEventListener('click', () => selectCell(r, c));
      btn.addEventListener('keydown', (e) => onCellKeyDown(e, r, c));
      frag.appendChild(btn);
    }
  }
  gridEl.appendChild(frag);
}

function selectCell(r, c) { game.selectCell(r, c); render(); }

function onCellKeyDown(e, r, c) {
  const key = e.key;
  if (/^[1-9]$/.test(key)) { const ok = game.placeNumber(r, c, Number(key)); showToast(ok ? 'Nice move!' : 'That conflicts with this row/column/box'); render(); e.preventDefault(); }
  else if (key === 'Backspace' || key === 'Delete' || key === '0') { const ok = game.placeNumber(r, c, 0); if (!ok) showToast('That conflicts with this row/column/box'); render(); e.preventDefault(); }
  else if (key === 'ArrowUp') { r = (r + 8) % 9; selectCell(r, c); e.preventDefault(); }
  else if (key === 'ArrowDown') { r = (r + 1) % 9; selectCell(r, c); e.preventDefault(); }
  else if (key === 'ArrowLeft') { c = (c + 8) % 9; selectCell(r, c); e.preventDefault(); }
  else if (key === 'ArrowRight') { c = (c + 1) % 9; selectCell(r, c); e.preventDefault(); }
}

function onUpdate(message) {
  if (!message) return;
  updateUndoRedo();
}

function updateUndoRedo() { undoBtn.disabled = game.undoStack.length <= 1; redoBtn.disabled = game.redoStack.length === 0; }

function enterGameUI(name, avatar, difficulty) {
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  playerAvatar.textContent = avatar || '🧑';
  playerLabel.textContent = name ? name : 'Player';
  currentDifficulty.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  render();
}

let toastTimeout;
function showToast(msg) {
  clearTimeout(toastTimeout);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

function render() {
  timerEl.textContent = formatTime(game.elapsedMs);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const btn = gridEl.children[r * 9 + c];
      const val = game.board[r][c];
      btn.className = 'cell';
      if (game.fixed[r][c]) { btn.classList.add('fixed'); btn.setAttribute('data-given', 'true'); btn.setAttribute('aria-disabled', 'true'); }
      else { btn.removeAttribute('data-given'); btn.removeAttribute('aria-disabled'); }
      if (game.selected && game.selected.r === r && game.selected.c === c) btn.classList.add('selected');
      if (game.selected && (game.selected.r === r || game.selected.c === c || (Math.floor(game.selected.r/3) === Math.floor(r/3) && Math.floor(game.selected.c/3) === Math.floor(c/3)))) btn.classList.add('highlight');
      if (val !== 0) {
        const temp = game.board[r][c];
        game.board[r][c] = 0;
        const invalid = !game.isReadonly(r, c) && !isValidPlacement(game.board, r, c, temp);
        game.board[r][c] = temp;
        if (invalid) btn.classList.add('conflict');
      }
      btn.textContent = val === 0 ? '' : String(val);
      if (val === 0) {
        let notesEl = btn.querySelector('.notes');
        if (!notesEl) { notesEl = document.createElement('div'); notesEl.className = 'notes'; btn.appendChild(notesEl); }
        notesEl.innerHTML = '';
        for (let n = 1; n <= 9; n++) {
          const d = document.createElement('div'); d.className = 'note'; d.textContent = game.notes[r][c].has(n) ? n : '';
          notesEl.appendChild(d);
        }
      } else {
        const notesEl = btn.querySelector('.notes'); if (notesEl) notesEl.remove();
      }
    }
  }

  if (game.solved()) {
    winStats.textContent = `Puzzle solved! Great job 🎉\nTime: ${formatTime(game.elapsedMs)}`;
    winModal.classList.remove('hidden');
  }
}

function formatTime(ms) { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const sec = s % 60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

buildGrid();
render();

playAgainBtn.addEventListener('click', () => { winModal.classList.add('hidden'); newGameBtn.click(); });
closeWinBtn.addEventListener('click', () => winModal.classList.add('hidden'));