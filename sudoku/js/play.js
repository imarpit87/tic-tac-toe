import { SudokuGame } from './game.js';
import { isValidPlacement } from './board.js';

/* Timer */
const TIMER_KEY = 'sudoka:timerMs';
const timer = (() => {
  let startTs = 0, running = false, valueMs = 0;
  function load(){ try{ const v=Number(localStorage.getItem(TIMER_KEY)); if(!Number.isNaN(v)) valueMs=v; }catch{} }
  function save(){ try{ localStorage.setItem(TIMER_KEY, String(valueMs)); }catch{} }
  function start(){ if(running) return; running=true; startTs=performance.now(); }
  function pause(){ if(!running) return; running=false; valueMs += performance.now()-startTs; save(); }
  function resume(){ if(running) return; running=true; startTs=performance.now(); }
  function reset(){ running=false; startTs=0; valueMs=0; save(); }
  function nowMs(){ return running ? valueMs + (performance.now()-startTs) : valueMs; }
  load(); return { start, pause, resume, reset, nowMs, get isRunning(){return running;}, get valueMs(){return nowMs();} };
})();

/* Elements */
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
const newBtn = document.getElementById('newBtn');
const homeLink = document.getElementById('homeLink');
const notesBtn = document.getElementById('notesToggleBtn');
const hintBtn = document.getElementById('hintBtn');

// Declare after element lookups
let actionsSincePlacement = 0;
let lastPlacementAt = Date.now();
let conflictCount = 0;

/* Setup */
const setupRaw = localStorage.getItem('sudoka:setup');
const continueFlag = localStorage.getItem('sudoka:continue') === '1';
if (!setupRaw && !continueFlag) { location.href = '/sudoku/index.html'; }
const setup = setupRaw ? JSON.parse(setupRaw) : null;
if (setup?.theme) document.documentElement.setAttribute('data-theme', setup.theme);

/* Game */
const game = new SudokuGame(onUpdate);
if (continueFlag && game.continueLast()) {
  localStorage.removeItem('sudoka:continue');
  buildGrid(); render();
} else {
  const name = setup?.name || '', avatar = setup?.avatar || null, difficulty = setup?.difficulty || 'easy', theme = setup?.theme || 'light';
  game.newGame({ name, avatar, difficulty, theme });
  timer.reset(); buildGrid(); render();
}

/* Timer focus/blur */
window.addEventListener('blur', () => timer.pause());
window.addEventListener('focus', () => { if (!game.solved()) timer.resume(); });

/* Action buttons */
function startNewFromSetup(){
  const sraw = localStorage.getItem('sudoka:setup');
  const s = sraw ? JSON.parse(sraw) : {};
  const name = s?.name || '';
  const avatar = s?.avatar || null;
  const difficulty = s?.difficulty || 'easy';
  const theme = s?.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  game.newGame({ name, avatar, difficulty, theme });
  timer.reset();
  buildGrid();
  render();
}
newBtn?.addEventListener('click', () => {
  if (confirm('Start a new puzzle? Your current progress will be lost.')) {
    startNewFromSetup();
    showToast('New puzzle');
  }
});
if (notesBtn) notesBtn.setAttribute('aria-pressed', String(game.notesMode));
notesBtn?.addEventListener('click', () => {
  if (typeof game.toggleNotesMode === 'function') {
    game.toggleNotesMode();
    notesBtn.setAttribute('aria-pressed', String(game.notesMode));
  }
});
hintBtn?.addEventListener('click', () => {
  if (typeof game.hint === 'function') {
    const h = game.hint();
    if (h) { showToast('Hint used'); render(); }
  }
});

/* Grid input */
gridEl.addEventListener('pointerdown', (e) => {
  const target = e.target.closest('.cell'); if (!target || !gridEl.contains(target)) return;
  const r = Number(target.getAttribute('data-row')), c = Number(target.getAttribute('data-col'));
  if (Number.isNaN(r) || Number.isNaN(c)) return;
  // Allow selecting even given cells for highlight; editing is prevented by game logic
  selectCell(r, c); if (!timer.isRunning) timer.start();
}, { passive: true });

/* Keyboard */
document.addEventListener('keydown', (e) => {
  if (!game.selected) return; const { r, c } = game.selected;
  if (/^[1-9]$/.test(e.key)) { placeNumberWithFeedback(r, c, Number(e.key)); e.preventDefault(); }
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { placeNumberWithFeedback(r, c, 0); e.preventDefault(); }
  else if (e.key.toLowerCase() === 'z' && e.shiftKey) { redo(); }
  else if (e.key.toLowerCase() === 'z') { undo(); }
});

/* Keypad binding (mobile + desktop) */
function bindPad(el){
  if(!el) return;
  el.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); if(!b) return;
    b.classList.add('flash'); setTimeout(()=>b.classList.remove('flash'), 140);
    if(b.hasAttribute('data-clear')){ const sel=game.selected; if(sel){ placeNumberWithFeedback(sel.r, sel.c, 0); } return; }
    const n=b.getAttribute('data-num'); if(n){ const sel=game.selected; if(sel){ placeNumberWithFeedback(sel.r, sel.c, Number(n)); } }
  });
}
bindPad(keypadMobile); bindPad(keypadDesk);

/* Undo/Redo */
function undo(){ if (game.undo()) { showToast('Undone'); } updateUndoRedo(); render(); }
function redo(){ if (game.redo()) { showToast('Redone'); } updateUndoRedo(); render(); }
[mUndoBtn, mRedoBtn, dUndoBtn, dRedoBtn].forEach((el, idx) => {
  if(!el) return; el.addEventListener('click', ()=> idx%2===0 ? undo() : redo());
});

/* Placement */
function placeNumberWithFeedback(r, c, val){
  const ok = game.placeNumber(r, c, val);
  if (!timer.isRunning) timer.start();
  const el = gridEl.children[r*9+c];
  if (!ok) {
    showToast('That conflicts with this row/column/box');
    el.classList.add('error');
    setTimeout(()=>el.classList.remove('error'), 400);
  } else {
    actionsSincePlacement = 0;
    el.classList.remove('error');
    el.classList.add('user');
  }
  actionsSincePlacement++; render(); return ok;
}
closeWinBtn?.addEventListener('click', () => winModal.classList.add('hidden'));

/* Grid build */
function buildGrid() {
  const frag = document.createDocumentFragment();
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (r % 3 === 0) cell.classList.add('box-top');
    if (c % 3 === 0) cell.classList.add('box-left');
    if (c % 3 === 2) cell.classList.add('box-right');
    if (r % 3 === 2) cell.classList.add('box-bottom');
    cell.setAttribute('role', 'gridcell'); cell.setAttribute('tabindex', '0');
    cell.setAttribute('data-row', String(r)); cell.setAttribute('data-col', String(c));
    cell.setAttribute('aria-label', `Row ${r+1}, Column ${c+1}`);
    cell.setAttribute('data-r', String(r)); cell.setAttribute('data-c', String(c));
    frag.appendChild(cell);
  }
  gridEl.innerHTML = ''; gridEl.appendChild(frag);
}

/* Render + helpers */
function selectCell(r, c) { game.selectCell(r, c); render(); }
function onUpdate() { updateUndoRedo(); persistTimer(); }
function updateUndoRedo() {
  const canUndo = game.undoStack.length > 1, canRedo = game.redoStack.length > 0;
  if (mUndoBtn) mUndoBtn.disabled = !canUndo; if (mRedoBtn) mRedoBtn.disabled = !canRedo;
  if (dUndoBtn) dUndoBtn.disabled = !canUndo; if (dRedoBtn) dRedoBtn.disabled = !canRedo;
}

let toastTimeout; function showToast(msg) { clearTimeout(toastTimeout); toast.textContent = msg; toast.classList.add('show'); toastTimeout = setTimeout(() => toast.classList.remove('show'), 1500); }

function highlightPeers(selected) {
  const { r, c } = selected;
  for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) {
    const el = gridEl.children[rr * 9 + cc];
    el.classList.remove('peer','selected');
    if (selected && rr === r && cc === c) el.classList.add('selected');
    if (selected && (rr === r || cc === c || (Math.floor(rr/3) === Math.floor(r/3) && Math.floor(cc/3) === Math.floor(c/3)))) el.classList.add('peer');
  }
}

function render() {
  if (timerEl) timerEl.textContent = formatTime(timer.valueMs);
  const sel = game.selected;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    const el = gridEl.children[r * 9 + c], val = game.board[r][c];
    el.classList.remove('given','user','error');
    if (game.fixed[r][c]) el.classList.add('given');
    el.textContent = val ? String(val) : '';
    if (val && !game.fixed[r][c]) {
      el.classList.add('user');
      const temp = val; game.board[r][c] = 0; const invalid = !isValidPlacement(game.board, r, c, temp); game.board[r][c] = temp;
      if (invalid) el.classList.add('error');
    }
  }
  if (sel) highlightPeers(sel);
  if (game.solved()) { timer.pause(); if (winStats) winStats.textContent = `Puzzle solved in ${formatTime(timer.valueMs)}`; winModal?.classList.remove('hidden'); }
}

function formatTime(ms){ const s=Math.floor(ms/1000); const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=s%60; return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
function persistTimer(){ try{ localStorage.setItem(TIMER_KEY, String(timer.valueMs)); }catch{} }

/* Fit grid on desktop to fill available height and stay square */
(function fitGrid(){
  function resize(){
    if(!window.matchMedia('(min-width:1024px)').matches) return;
    const grid=document.getElementById('sudoku-grid');
    const stage=document.querySelector('.play-stage'); if(!grid||!stage) return;
    // CSS handles width via calc; ensure height remains square when container changes
    const rect = stage.getBoundingClientRect();
    const size = Math.min(Math.min(window.innerWidth*0.72, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--grid-cap')) || 720), rect.height - 16);
    grid.style.width = size + 'px';
    grid.style.height = size + 'px';
  }
  window.addEventListener('load',resize);
  window.addEventListener('resize',resize);
  window.addEventListener('orientationchange',resize);
  resize();
})();

/* Mobile keypad height sync to keep grid above it */
(function(){
  const mobilePad = document.getElementById('sudoku-keypad');
  if(!mobilePad) return;
  function syncKeypadPadding(){
    const h = Math.round(mobilePad.getBoundingClientRect().height || 240);
    document.documentElement.style.setProperty('--keypad-h', h + 'px');
  }
  window.addEventListener('load', syncKeypadPadding);
  window.addEventListener('resize', syncKeypadPadding);
  window.addEventListener('orientationchange', syncKeypadPadding);
  try { new ResizeObserver(syncKeypadPadding).observe(mobilePad); } catch {}
  syncKeypadPadding();
})();