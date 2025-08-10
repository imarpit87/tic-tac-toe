import { SudokuGame } from './game.js';
import { isValidPlacement } from './board.js';

const setupRaw = localStorage.getItem('sudoka:setup');
const continueFlag = localStorage.getItem('sudoka:continue') === '1';
if (!setupRaw && !continueFlag) { location.href = '/sudoku/index.html'; }
const setup = setupRaw ? JSON.parse(setupRaw) : null;

// Apply theme from setup
if (setup?.theme) document.documentElement.setAttribute('data-theme', setup.theme);
document.documentElement.style.setProperty('--keypad-h', '220px');

// Elements
const hintBtn = document.getElementById('hintBtn');
const notesToggleBtn = document.getElementById('notesToggleBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const keypad = document.getElementById('sud-keypad');
const toast = document.getElementById('toast');
const timerEl = document.getElementById('timer');
const winModal = document.getElementById('winModal');
const winStats = document.getElementById('winStats');
const closeWinBtn = document.getElementById('closeWinBtn');
const currentDifficultyEl = document.getElementById('sud-difficulty');
const playerEl = document.getElementById('sud-player');
const gridEl = document.getElementById('sudoku-grid');

const game = new SudokuGame(onUpdate);

// Initialize game according to setup or continue
if (continueFlag && game.continueLast()) {
  localStorage.removeItem('sudoka:continue');
  currentDifficultyEl.textContent = game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1);
  renderHeader();
  buildGrid();
  render();
} else {
  const name = setup?.name || '';
  const avatar = setup?.avatar || null;
  const difficulty = setup?.difficulty || 'easy';
  const theme = setup?.theme || 'light';
  currentDifficultyEl.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  renderHeader(name, avatar);
  game.newGame({ name, avatar, difficulty, theme });
  buildGrid();
  render();
}

function renderHeader(name = setup?.name || '', avatar = setup?.avatar || null) {
  playerEl.textContent = name ? `${avatar ? avatar + ' ' : ''}${name}` : '';
}

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

// Keypad
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
closeWinBtn.addEventListener('click', () => winModal.classList.add('hidden'));

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
function onUpdate() { updateUndoRedo(); }
function updateUndoRedo() { undoBtn.disabled = game.undoStack.length <= 1; redoBtn.disabled = game.redoStack.length === 0; }

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