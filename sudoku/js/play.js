import { SudokuGame } from './game.js';
import { isValidPlacement } from './board.js';

// Timer utility
const TIMER_KEY = 'sudoka:timerMs';
const timer = (() => {
  let startTs = 0, pausedAt = 0, running = false, valueMs = 0;
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
let muted = localStorage.getItem(SND_KEY) === '1' ? true : false;
function setMuted(v){ muted = !!v; try{ localStorage.setItem(SND_KEY, muted ? '1' : '0'); }catch{} }
function playSound(type){ if (muted) return; /* hook audio here */ }

// Coaching counters
let actionsSincePlacement = 0;
let lastPlacementAt = Date.now();
let conflictCount = 0;

// Elements
const hintBtn = document.getElementById('hintBtn') || document.getElementById('btn-hint');
const notesToggleBtn = document.getElementById('notesToggleBtn') || document.getElementById('btn-notes');
const undoBtn = document.getElementById('undoBtn') || document.getElementById('btn-undo');
const redoBtn = document.getElementById('redoBtn') || document.getElementById('btn-redo');
const keypad = document.getElementById('sud-keypad') || document.getElementById('sudoku-keypad');
const toast = document.getElementById('toast');
const timerEl = document.getElementById('timer');
const winModal = document.getElementById('winModal');
const winStats = document.getElementById('winStats');
const closeWinBtn = document.getElementById('closeWinBtn');
const currentDifficultyEl = document.getElementById('sud-difficulty') || document.getElementById('difficulty-label');
const playerEl = document.getElementById('sud-player') || document.getElementById('player-info');
const gridEl = document.getElementById('sudoku-grid');
const homeBtn = document.getElementById('btn-home');
const newBtn = document.getElementById('btn-new');
const fabUndo = document.getElementById('fab-undo');
const fabRedo = document.getElementById('fab-redo');
const gridWrap = document.querySelector('.sud-grid-wrap');
const keypadDom = document.getElementById('sudoku-keypad') || document.getElementById('sud-keypad');
const ctrlUndo = document.getElementById('btn-undo');
const ctrlRedo = document.getElementById('btn-redo');

// Setup
const setupRaw = localStorage.getItem('sudoka:setup');
const continueFlag = localStorage.getItem('sudoka:continue') === '1';
if (!setupRaw && !continueFlag) { location.href = '/sudoku/index.html'; }
const setup = setupRaw ? JSON.parse(setupRaw) : null;
if (setup?.theme) document.documentElement.setAttribute('data-theme', setup.theme);

const game = new SudokuGame(onUpdate);

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
  timer.reset();
  buildGrid();
  render();
}

function renderHeader(name = setup?.name || '', avatar = setup?.avatar || null) {
  playerEl.textContent = name ? `${avatar ? avatar + ' ' : ''}${name}` : '';
}

// Focus/blur handling for timer
window.addEventListener('blur', () => timer.pause());
window.addEventListener('focus', () => { if (!game.solved()) timer.resume(); });

// Toolbar buttons (if present)
homeBtn?.addEventListener('click', () => { location.href = '/'; });
newBtn?.addEventListener('click', () => { timer.pause(); location.href = '/sudoku/index.html'; });

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
  if (/^[1-9]$/.test(e.key)) { const ok = placeNumberWithFeedback(r, c, Number(e.key)); e.preventDefault(); }
  else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { const ok = placeNumberWithFeedback(r, c, 0); e.preventDefault(); }
  else if (e.key.toLowerCase() === 'z' && e.shiftKey) { redoBtn?.click(); }
  else if (e.key.toLowerCase() === 'z') { undoBtn?.click(); }
  else if (e.key.toLowerCase() === 'h') { hintBtn?.click(); }
  else if (e.key.toLowerCase() === 'n') { notesToggleBtn?.click(); }
  else if (e.key.toLowerCase() === 'r') { newBtn?.click(); }
});

// Keypad
keypad.addEventListener('click', (e) => {
  const btn = e.target.closest('button'); if (!btn) return;
  if (!game.selected) { showToast('Tap a cell, then choose a number'); return; }
  const { r, c } = game.selected;
  if (btn.hasAttribute('data-clear')) { placeNumberWithFeedback(r, c, 0); return; }
  const n = Number(btn.getAttribute('data-num'));
  if (!n) return;
  placeNumberWithFeedback(r, c, n);
});

function placeNumberWithFeedback(r, c, val){
  const ok = game.placeNumber(r, c, val);
  if (!timer.isRunning) timer.start();
  if (!ok) { conflictCount++; showToast('Conflicts in row'); playSound('error'); const el = gridEl.children[r*9+c]; el.classList.add('error'); setTimeout(()=>el.classList.add('error'), 400); }
  else { actionsSincePlacement = 0; lastPlacementAt = Date.now(); playSound('place'); const el = gridEl.children[r*9+c]; el.classList.remove('error'); el.classList.add('user'); }
  actionsSincePlacement++;
  render();
  return ok;
}

hintBtn.addEventListener('click', () => { const h = game.hint(); if (!h) showToast('No logical hint available'); else { selectCell(h.r, h.c); showToast('Hint used'); playSound('chime'); } });
notesToggleBtn.addEventListener('click', () => { game.toggleNotesMode(); notesToggleBtn.setAttribute('aria-pressed', String(game.notesMode)); showToast(game.notesMode ? 'Notes enabled' : 'Notes disabled'); });
undoBtn.addEventListener('click', () => { if (game.undo()) { showToast('Undone'); playSound('whoosh'); } updateUndoRedo(); render(); });
redoBtn.addEventListener('click', () => { if (game.redo()) { showToast('Redone'); playSound('whoosh'); } updateUndoRedo(); render(); });
closeWinBtn.addEventListener('click', () => winModal.classList.add('hidden'));

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

function selectCell(r, c) { game.selectCell(r, c); console.log('Selected', r, c); render(); }
function onUpdate() { updateUndoRedo(); persistTimer(); }
function updateUndoRedo() { undoBtn.disabled = game.undoStack.length <= 1; redoBtn.disabled = game.redoStack.length === 0; }

let toastTimeout;
function showToast(msg) { clearTimeout(toastTimeout); toast.textContent = msg; toast.classList.add('show'); toastTimeout = setTimeout(() => toast.classList.remove('show'), 1500); }

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
  timerEl.textContent = formatTime(timer.valueMs);
  const sel = game.selected;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = gridEl.children[r * 9 + c];
      const val = game.board[r][c];
      el.classList.remove('given');
      if (game.fixed[r][c]) el.classList.add('given');
      el.textContent = '';
      if (val !== 0) el.textContent = String(val);
      if (val !== 0 && !game.fixed[r][c]) {
        const temp = val; game.board[r][c] = 0; const invalid = !isValidPlacement(game.board, r, c, temp); game.board[r][c] = temp; if (invalid) el.classList.add('error'); else el.classList.remove('error');
      }
    }
  }
  if (sel) highlightPeers(sel);
  if (game.solved()) {
    timer.pause();
    winStats.textContent = `Puzzle solved in ${formatTime(timer.valueMs)}`;
    winModal.classList.remove('hidden');
  }
}

function formatTime(ms){ const s = Math.floor(ms/1000); const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const sec = s%60; return h>0 ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
function persistTimer(){ try{ localStorage.setItem(TIMER_KEY, String(timer.valueMs)); }catch{} }

// Floating buttons -> use existing handlers
fabUndo?.addEventListener('click', () => { undoBtn?.click(); });
fabRedo?.addEventListener('click', () => { redoBtn?.click(); });
// Desktop control-row buttons
ctrlUndo?.addEventListener('click', () => { undoBtn?.click(); });
ctrlRedo?.addEventListener('click', () => { redoBtn?.click(); });

// Optional swipe gestures (mobile)
let touchStartX=null, touchStartY=null;
gridWrap?.addEventListener('touchstart', (e)=>{ const t=e.changedTouches[0]; touchStartX=t.clientX; touchStartY=t.clientY; }, {passive:true});
gridWrap?.addEventListener('touchend', (e)=>{
  const t=e.changedTouches[0]; const dx=t.clientX - touchStartX; const dy=t.clientY - touchStartY;
  if (Math.abs(dx)>40 && Math.abs(dy)<25){ if (dx<0) undoBtn?.click(); if (dx>0) redoBtn?.click(); }
}, {passive:true});

// Keypad pressed feedback
(function(){
  const pad = keypadDom;
  if(!pad) return;
  pad.addEventListener('pointerdown',e=>{ const b=e.target.closest('button'); if(!b) return; b.classList.add('is-pressed'); },{passive:true});
  window.addEventListener('pointerup',()=>document.querySelectorAll('.keypad button.is-pressed').forEach(b=>b.classList.remove('is-pressed')),{passive:true});
})();

// Wire mobile/tablet topbar and desktop side undo/redo to existing handlers
;(['u-undo','d-undo']).forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  el.addEventListener('click', ()=>{ undoBtn?.click(); });
});
;(['u-redo','d-redo']).forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  el.addEventListener('click', ()=>{ redoBtn?.click(); });
});

// Bind both keypads to existing click handler flow
function bindPad(padId){
  const pad=document.getElementById(padId);
  if(!pad) return;
  pad.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.hasAttribute('data-clear')){ const sel=game.selected; if(sel){ placeNumberWithFeedback(sel.r, sel.c, 0); } return; }
    const n=b.getAttribute('data-num');
    if(n){ const sel=game.selected; if(sel){ placeNumberWithFeedback(sel.r, sel.c, Number(n)); } }
  });
}
bindPad('sudoku-keypad');
bindPad('desk-keypad');

// Desktop fit: keep grid within 100vh alongside side panel
(function fitGrid(){
  function resize(){
    if(!window.matchMedia('(min-width:900px)').matches) return;
    const grid=document.getElementById('sudoku-grid');
    const stage=document.querySelector('.stage');
    if(!grid||!stage) return;
    const size=Math.min(stage.clientHeight, stage.clientWidth, 640);
    grid.style.width=size+'px'; grid.style.height=size+'px';
  }
  ['load','resize','orientationchange'].forEach(ev=>window.addEventListener(ev,resize));
  resize();
})();