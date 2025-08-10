import { SudokuGame } from './game.js';
import { isValidPlacement } from './board.js';

// Timer utility
const TIMER_KEY = 'sudoka:timerMs';
const timer = (() => {
  let startTs = 0, running = false, valueMs = 0;
  function load() { try { const v = Number(localStorage.getItem(TIMER_KEY)); if (!Number.isNaN(v)) valueMs = v; } catch {} }
  function save() { try { localStorage.setItem(TIMER_KEY, String(valueMs)); } catch {} }
  function start() { if (running) return; running = true; startTs = performance.now(); }
  function pause() { if (!running) return; running = false; valueMs += performance.now() - startTs; save(); }
  function resume() { if (running) return; running = true; startTs = performance.now(); }
  function reset() { running = false; startTs = 0; valueMs = 0; save(); }
  function nowMs() { return running ? valueMs + (performance.now() - startTs) : valueMs; }
  load();
  return { start, pause, resume, reset, nowMs, get isRunning(){return running;}, get valueMs(){return nowMs();} };
})();

// Sounds (lightweight placeholders)
const SND_KEY = 'sudoka:mute';
let muted = localStorage.getItem(SND_KEY) === '1';
function playSound(type){ if (muted) return; }

// Coaching counters
let actionsSincePlacement = 0;
let lastPlacementAt = Date.now();
let conflictCount = 0;

// Elements (use new clean-reset selectors with fallbacks)
const hintBtn = document.getElementById('hintBtn');
const notesToggleBtn = document.getElementById('notesToggleBtn');
const mUndoBtn = document.getElementById('m-undo');
const mRedoBtn = document.getElementById('m-redo');
const dUndoBtn = document.getElementById('d-undo');
const dRedoBtn = document.getElementById('d-redo');
const keypadMobile = document.getElementById('sudoku-keypad');
const keypadDesk = document.querySelector('.keypad--desk');
const toast = document.getElementById('toast');
const timerEl = document.getElementById('m-timer') || document.getElementById('timer');
const winModal = document.getElementById('winModal');
const winStats = document.getElementById('winStats');
const closeWinBtn = document.getElementById('closeWinBtn');
const gridEl = document.getElementById('sudoku-grid');
const gridWrap = document.querySelector('.grid-wrap');

// Setup
const setupRaw = localStorage.getItem('sudoka:setup');
const continueFlag = localStorage.getItem('sudoka:continue') === '1';
if (!setupRaw && !continueFlag) { location.href = '/sudoku/index.html'; }
const setup = setupRaw ? JSON.parse(setupRaw) : null;
if (setup?.theme) document.documentElement.setAttribute('data-theme', setup.theme);

const game = new SudokuGame(onUpdate);

if (continueFlag && game.continueLast()) {
  localStorage.removeItem('sudoka:continue');
  buildGrid();
  render();
} else {
  const name = setup?.name || '';
  const avatar = setup?.avatar || null;
  const difficulty = setup?.difficulty || 'easy';
  const theme = setup?.theme || 'light';
  game.newGame({ name, avatar, difficulty, theme });
  timer.reset();
  buildGrid();
  render();
}

// Timer focus/blur
window.addEventListener('blur', () => timer.pause());
window.addEventListener('focus', () => { if (!game.solved()) timer.resume(); });

// Delegated grid input
gridEl.addEventListener('pointerdown', (e) => {
  const target = e.target.closest('.cell');
  if (!target || !gridEl.contains(target)) return;
  const r = Number(target.getAttribute('data-row'));
  const c = Number(target.getAttribute('data-col'));
  if (Number.isNaN(r) || Number.isNaN(c)) return;
  if (target.classList.contains('given')) return;
  selectCell(r, c);
  if (!timer.isRunning) timer.start();
}, { passive: true });

document.addEventListener('keydown', (e) => {
  if (!game.selected) return;
  const { r, c } = game.selected;
  if (/^[1-9]$/.test(e.key)) { placeNumberWithFeedback(r, c, Number(e.key)); e.preventDefault(); }
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { placeNumberWithFeedback(r, c, 0); e.preventDefault(); }
  else if (e.key.toLowerCase() === 'z' && e.shiftKey) { redo(); }
  else if (e.key.toLowerCase() === 'z') { undo(); }
});

// Keypad handlers (mobile and desktop)
function bindPad(el){
  if(!el) return;
  el.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.hasAttribute('data-clear')){ const sel=game.selected; if(sel){ placeNumberWithFeedback(sel.r, sel.c, 0); } return; }
    const n=b.getAttribute('data-num'); if(n){ const sel=game.selected; if(sel){ placeNumberWithFeedback(sel.r, sel.c, Number(n)); } }
  });
}
bindPad(keypadMobile); bindPad(keypadDesk);

// Undo/Redo wrappers
function undo(){ if (game.undo()) { showToast('Undone'); playSound('whoosh'); } updateUndoRedo(); render(); }
function redo(){ if (game.redo()) { showToast('Redone'); playSound('whoosh'); } updateUndoRedo(); render(); }

mUndoBtn?.addEventListener('click', undo);
mRedoBtn?.addEventListener('click', redo);
dUndoBtn?.addEventListener('click', undo);
dRedoBtn?.addEventListener('click', redo);

// Place number
function placeNumberWithFeedback(r, c, val){
  const ok = game.placeNumber(r, c, val);
  if (!timer.isRunning) timer.start();
  if (!ok) { conflictCount++; showToast('Conflicts in row'); playSound('error'); const el = gridEl.children[r*9+c]; el.classList.add('error'); setTimeout(()=>el.classList.add('error'), 400); }
  else { actionsSincePlacement = 0; lastPlacementAt = Date.now(); playSound('place'); const el = gridEl.children[r*9+c]; el.classList.remove('error'); el.classList.add('user'); }
  actionsSincePlacement++;
  render();
  return ok;
}

// Optional hint/notes (guarded)
hintBtn?.addEventListener('click', () => { const h = game.hint(); if (!h) showToast('No logical hint available'); else { selectCell(h.r, h.c); showToast('Hint used'); playSound('chime'); } });
notesToggleBtn?.addEventListener('click', () => { game.toggleNotesMode(); notesToggleBtn.setAttribute('aria-pressed', String(game.notesMode)); showToast(game.notesMode ? 'Notes enabled' : 'Notes disabled'); });
closeWinBtn?.addEventListener('click', () => winModal.classList.add('hidden'));

function buildGrid() {
  const frag = document.createDocumentFragment();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (r % 3 === 0) cell.classList.add('box-top');
      if (c % 3 === 0) cell.classList.add('box-left');
      if (c % 3 === 2) cell.classList.add('box-right');
      if (r % 3 === 2) cell.classList.add('box-bottom');
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

function selectCell(r, c) { game.selectCell(r, c); render(); }
function onUpdate() { updateUndoRedo(); persistTimer(); }
function updateUndoRedo() {
  const canUndo = game.undoStack.length > 1;
  const canRedo = game.redoStack.length > 0;
  if (mUndoBtn) mUndoBtn.disabled = !canUndo;
  if (mRedoBtn) mRedoBtn.disabled = !canRedo;
  if (dUndoBtn) dUndoBtn.disabled = !canUndo;
  if (dRedoBtn) dRedoBtn.disabled = !canRedo;
}

let toastTimeout; function showToast(msg) { clearTimeout(toastTimeout); toast.textContent = msg; toast.classList.add('show'); toastTimeout = setTimeout(() => toast.classList.remove('show'), 1500); }

function highlightPeers(selected) {
  const { r, c } = selected;
  for (let rr = 0; rr < 9; rr++) {
    for (let cc = 0; cc < 9; cc++) {
      const el = gridEl.children[rr * 9 + cc];
      el.classList.remove('peer','selected');
      if (selected && rr === r && cc === c) el.classList.add('selected');
      if (selected && (rr === r || cc === c || (Math.floor(rr/3) === Math.floor(r/3) && Math.floor(cc/3) === Math.floor(c/3)))) el.classList.add('peer');
    }
  }
}

function render() {
  if (timerEl) timerEl.textContent = formatTime(timer.valueMs);
  const sel = game.selected;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = gridEl.children[r * 9 + c];
      const val = game.board[r][c];
      el.classList.remove('given','user','error');
      if (game.fixed[r][c]) el.classList.add('given');
      el.textContent = val ? String(val) : '';
      if (val && !game.fixed[r][c]) {
        el.classList.add('user');
        const temp = val; game.board[r][c] = 0; const invalid = !isValidPlacement(game.board, r, c, temp); game.board[r][c] = temp; if (invalid) el.classList.add('error');
      }
    }
  }
  if (sel) highlightPeers(sel);
  if (game.solved()) {
    timer.pause();
    if (winStats) winStats.textContent = `Puzzle solved in ${formatTime(timer.valueMs)}`;
    winModal?.classList.remove('hidden');
  }
}

function formatTime(ms){ const s = Math.floor(ms/1000); const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60; return h>0 ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
function persistTimer(){ try{ localStorage.setItem(TIMER_KEY, String(timer.valueMs)); }catch{} }

// Desktop fit to new class and breakpoint
(function fitGrid(){
  function resize(){
    if(!window.matchMedia('(min-width:1024px)').matches) return;
    const grid=document.getElementById('sudoku-grid');
    const stage=document.querySelector('.play-stage');
    if(!grid||!stage) return;
    const size=Math.min(stage.clientHeight, stage.clientWidth, 640);
    grid.style.width=size+'px'; grid.style.height=size+'px';
  }
  window.addEventListener('load',resize);
  window.addEventListener('resize',resize);
  window.addEventListener('orientationchange',resize);
  resize();
})();