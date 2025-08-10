import { SudokuGame } from './game.js';
import { loadState } from './storage.js';

const gridEl = document.getElementById('sudokuGrid');
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const startGameBtn = document.getElementById('startGameBtn');
const continueBtn = document.getElementById('continueBtn');
const difficultySelect = document.getElementById('difficultySelect');
const playerNameInput = document.getElementById('playerName');
const avatarPicker = document.getElementById('avatarPicker');
const avatarSkipBtn = document.getElementById('avatarSkipBtn');
const playerAvatar = document.getElementById('playerAvatar');
const playerLabel = document.getElementById('playerLabel');
const currentDifficulty = document.getElementById('currentDifficulty');
const hintBtn = document.getElementById('hintBtn');
const notesToggleBtn = document.getElementById('notesToggleBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const newGameBtn = document.getElementById('newGameBtn');
const keypad = document.getElementById('keypad');
const toast = document.getElementById('toast');
const statusText = document.getElementById('statusText');
const timerEl = document.getElementById('timer');
const winModal = document.getElementById('winModal');
const winStats = document.getElementById('winStats');
const playAgainBtn = document.getElementById('playAgainBtn');
const closeWinBtn = document.getElementById('closeWinBtn');
const themeSelectTop = document.getElementById('sudokuThemeSelectTop');
const themeSelectHeader = document.getElementById('sudokuThemeSelect');
const themeSelectInline = document.getElementById('themeSelectInline');

let selectedAvatar = '';

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeSelectTop.value = theme;
  themeSelectHeader.value = theme;
  themeSelectInline.value = theme;
}

;(() => { // initialize theme from saved or default
  const saved = (loadState() && loadState().theme) || 'light';
  setTheme(saved);
})();

themeSelectTop.addEventListener('change', () => setTheme(themeSelectTop.value));
themeSelectHeader.addEventListener('change', () => setTheme(themeSelectHeader.value));
themeSelectInline.addEventListener('change', () => setTheme(themeSelectInline.value));

const game = new SudokuGame(onUpdate);

// Continue last game prompt
if (loadState()) continueBtn.style.display = '';

startGameBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  const avatar = selectedAvatar || '🧑';
  const difficulty = difficultySelect.value;
  game.newGame({ name, avatar, difficulty });
  enterGameUI(name, avatar, difficulty);
});

continueBtn.addEventListener('click', () => {
  if (game.continueLast()) enterGameUI(game.player.name, game.player.avatar, game.difficulty);
});

newGameBtn.addEventListener('click', () => {
  startScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
});

avatarPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('.avatar-option');
  if (!btn) return;
  [...avatarPicker.querySelectorAll('.avatar-option')].forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAvatar = btn.getAttribute('data-avatar');
});
avatarSkipBtn.addEventListener('click', () => { selectedAvatar = ''; [...avatarPicker.querySelectorAll('.avatar-option')].forEach(b => b.classList.remove('selected')); });

hintBtn.addEventListener('click', () => { const h = game.hint(); if (!h) showToast('No logical hint available right now—try another area'); else { selectCell(h.r, h.c); showToast('Hint applied'); } });
notesToggleBtn.addEventListener('click', () => { game.toggleNotesMode(); notesToggleBtn.textContent = game.notesMode ? 'Notes On' : 'Notes Off'; notesToggleBtn.setAttribute('aria-pressed', String(game.notesMode)); showToast('Notes ' + (game.notesMode ? 'enabled' : 'disabled')); });
undoBtn.addEventListener('click', () => { if (game.undo()) showToast('Undone'); updateUndoRedo(); render(); });
redoBtn.addEventListener('click', () => { if (game.redo()) showToast('Redone'); updateUndoRedo(); render(); });

keypad.addEventListener('click', (e) => {
  const key = e.target.closest('.key'); if (!key) return;
  if (!game.selected) { showToast('Tap a cell, then choose a number'); return; }
  const val = Number(key.getAttribute('data-num'));
  const { r, c } = game.selected;
  game.placeNumber(r, c, val);
  render();
});

// Build grid buttons once
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
  if (/^[1-9]$/.test(key)) { game.placeNumber(r, c, Number(key)); render(); e.preventDefault(); }
  else if (key === 'Backspace' || key === 'Delete' || key === '0') { game.placeNumber(r, c, 0); render(); e.preventDefault(); }
  else if (key === 'ArrowUp') { r = (r + 8) % 9; selectCell(r, c); e.preventDefault(); }
  else if (key === 'ArrowDown') { r = (r + 1) % 9; selectCell(r, c); e.preventDefault(); }
  else if (key === 'ArrowLeft') { c = (c + 8) % 9; selectCell(r, c); e.preventDefault(); }
  else if (key === 'ArrowRight') { c = (c + 1) % 9; selectCell(r, c); e.preventDefault(); }
}

function onUpdate(message) {
  if (!message) return;
  statusText.textContent = message;
  if (message.includes('Invalid')) showToast('That conflicts with this row/column/box');
  if (message === 'Hint applied') showToast('Hint applied');
  if (message === 'Game saved') showToast('Game saved');
  updateUndoRedo();
}

function updateUndoRedo() {
  undoBtn.disabled = game.undoStack.length <= 1;
  redoBtn.disabled = game.redoStack.length === 0;
}

function enterGameUI(name, avatar, difficulty) {
  startScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  playerAvatar.textContent = avatar || '🧑';
  playerLabel.textContent = name ? name : 'Player';
  currentDifficulty.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  render();
}

function showToast(msg) { toast.textContent = msg; }

function render() {
  // timer
  game.tick(Date.now());
  timerEl.textContent = formatTime(game.elapsedMs);

  // update grid
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const btn = gridEl.children[r * 9 + c];
      const val = game.board[r][c];
      btn.className = 'cell';
      if (game.fixed[r][c]) btn.classList.add('fixed');
      if (game.selected && game.selected.r === r && game.selected.c === c) btn.classList.add('selected');
      if (game.selected && (game.selected.r === r || game.selected.c === c || (Math.floor(game.selected.r/3) === Math.floor(r/3) && Math.floor(game.selected.c/3) === Math.floor(c/3)))) btn.classList.add('highlight');
      // conflicts
      if (val !== 0) {
        // check conflicts by temporarily clearing and testing
        const temp = game.board[r][c];
        game.board[r][c] = 0;
        const invalid = !isValidPlacement(game.board, r, c, temp);
        game.board[r][c] = temp;
        if (invalid) btn.classList.add('conflict');
      }
      btn.textContent = val === 0 ? '' : String(val);
      // notes
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
    winStats.textContent = `Well done—puzzle solved in ${formatTime(game.elapsedMs)}!`;
    winModal.classList.remove('hidden');
  }
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const sec = s % 60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

buildGrid();
render();

playAgainBtn.addEventListener('click', () => { winModal.classList.add('hidden'); newGameBtn.click(); });
closeWinBtn.addEventListener('click', () => winModal.classList.add('hidden'));