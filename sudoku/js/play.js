import { SudokuGame } from './game.js';
import { isValidMove } from './board.js';

const toast = document.getElementById('toast');
const errorBar = document.getElementById('errorBar');
function showToast(msg){ try{ if(!toast) return; toast.textContent=msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1600);}catch{} }
function showError(msg){ if(!errorBar) return; errorBar.textContent = msg; errorBar.hidden = false; }

const TIMER_KEY='sudoka:timerMs';
const timer=(()=>{ let start=0, running=false, value=0; function load(){ try{ const v=Number(localStorage.getItem(TIMER_KEY)); if(!Number.isNaN(v)) value=v; }catch{} } function save(){ try{ localStorage.setItem(TIMER_KEY,String(value)); }catch{} } function startRun(){ if(running) return; running=true; start=performance.now(); } function pause(){ if(!running) return; running=false; value+=performance.now()-start; save(); } function resume(){ if(running) return; running=true; start=performance.now(); } function reset(){ running=false; start=0; value=0; save(); } function now(){ return running? value+(performance.now()-start): value; } load(); return { start:startRun, pause, resume, reset, get isRunning(){return running;}, get valueMs(){return now();} }; })();

let setup=null; try{ const raw=localStorage.getItem('sudoka:setup'); setup = raw? JSON.parse(raw): null; }catch(e){ showError('Failed to read setup: ' + e.message); }
const cont = localStorage.getItem('sudoka:continue')==='1';
if(!setup && !cont){ showError('Missing setup. Please go back and start a new game.'); }

const gridEl=document.getElementById('sudoku-grid');
const mUndo=document.getElementById('m-undo');
const mRedo=document.getElementById('m-redo');
const dUndo=document.getElementById('d-undo');
const dRedo=document.getElementById('d-redo');
const keypadMobile=document.getElementById('sudoku-keypad');
const keypadDesk=document.querySelector('.keypad--desk');
const timerEl=document.getElementById('m-timer');
const notesBtn=document.getElementById('notesToggleBtn');
const hintBtn=document.getElementById('hintBtn');
const newBtn=document.getElementById('newBtn');
const diffBtn=document.getElementById('difficultyBtn');
const diffMenu=document.getElementById('difficultyMenu');
const playAgainBtn=document.getElementById('playAgainBtn');
const winModal=document.getElementById('winModal');
const winStats=document.getElementById('winStats');

let game;

try{
  game=new SudokuGame(()=>{}); game.onUpdate=onUpdate;
  if(cont && game.continueLast()){ localStorage.removeItem('sudoka:continue'); buildGrid(); render(); }
  else if(setup){ const name=setup?.name||''; const avatar=setup?.avatar||null; const difficulty=setup?.difficulty||'easy'; const theme=setup?.theme||'light'; document.documentElement.setAttribute('data-theme', theme); game.newGame({name, avatar, difficulty, theme}); timer.reset(); buildGrid(); render(); }
  else { // fallback demo board to avoid blank UI
    buildGrid(); showError('No setup found. Use Home > Play Sudoku to start.');
  }
  wire();
}catch(err){ console.error('Sudoku init error', err); showError('Init error: ' + (err?.message||'see console')); }

// Simplified mobile padding: only sync keypad height; remove viewport height coupling
(function(){
  const m = document.getElementById('sudoku-keypad'); if(!m) return;
  function sync(){ const h = Math.round(m.getBoundingClientRect().height || 220); document.documentElement.style.setProperty('--keypad-h', h+'px'); }
  ['DOMContentLoaded','load','resize','orientationchange'].forEach(e=>window.addEventListener(e,sync));
  try{ new ResizeObserver(sync).observe(m);}catch{}
  sync();
})();

export function focusCellNoJump(el){
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch { el.focus(); }
}

(function(){ const m=keypadMobile; if(!m) return; function sync(){ const h=Math.round(m.getBoundingClientRect().height||260); document.documentElement.style.setProperty('--keypad-h', h+'px'); } window.addEventListener('load',sync); window.addEventListener('resize',sync); window.addEventListener('orientationchange',sync); try{ new ResizeObserver(sync).observe(m);}catch{} sync(); })();

function buildGrid(){ const frag=document.createDocumentFragment(); for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const cell=document.createElement('div'); cell.className='cell'; if(r%3===0) cell.classList.add('box-top'); if(c%3===0) cell.classList.add('box-left'); if(c%3===2) cell.classList.add('box-right'); if(r%3===2) cell.classList.add('box-bottom'); cell.setAttribute('role','gridcell'); cell.setAttribute('tabindex','0'); cell.setAttribute('aria-label',`Row ${r+1}, Column ${c+1}`); cell.dataset.row=String(r); cell.dataset.col=String(c); frag.appendChild(cell);} gridEl.innerHTML=''; gridEl.appendChild(frag); }

function wire(){
  gridEl.addEventListener('pointerdown',(e)=>{ const t=e.target.closest('.cell'); if(!t) return; const r=Number(t.dataset.row), c=Number(t.dataset.col); if(Number.isNaN(r)||Number.isNaN(c)) return; if(!game){ showError('Game not initialized'); return; } selectCell(r,c); if(!timer.isRunning) timer.start(); }, {passive:true});
  document.addEventListener('keydown',(e)=>{ if(!game) return; const sel=game.selected; if(!sel) return; const {r,c}=sel; if(/^[1-9]$/.test(e.key)){ place(r,c,Number(e.key)); e.preventDefault(); } else if(['Backspace','Delete','0'].includes(e.key)){ place(r,c,0); e.preventDefault(); } else if(e.key==='ArrowUp'){ selectCell(Math.max(0,r-1),c); } else if(e.key==='ArrowDown'){ selectCell(Math.min(8,r+1),c); } else if(e.key==='ArrowLeft'){ selectCell(r,Math.max(0,c-1)); } else if(e.key==='ArrowRight'){ selectCell(r,Math.min(8,c+1)); } else if(e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey) && e.shiftKey){ redo(); } else if(e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey)){ undo(); } else if(e.key.toLowerCase()==='h'){ doHint(); } else if(e.key.toLowerCase()==='n'){ toggleNotes(); } });
  bindPad(keypadMobile); bindPad(keypadDesk);
  [mUndo,mRedo,dUndo,dRedo].forEach((el,idx)=>{ if(!el) return; el.addEventListener('click', ()=> idx%2===0? undo(): redo()); });
  hintBtn?.addEventListener('click', doHint);
  notesBtn?.addEventListener('click', toggleNotes);
  newBtn?.addEventListener('click', ()=>{ if(confirm('Start a new puzzle? Your current progress will be lost.')){ const s=setup||{}; try{ game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:s.difficulty||'easy', theme:s.theme||'light' }); timer.reset(); buildGrid(); render(); showToast('New game'); }catch(e){ showError('New game error: ' + e.message); } } });
  diffBtn?.addEventListener('click', ()=>{ const open=diffMenu.classList.toggle('hidden'); diffBtn.setAttribute('aria-expanded', String(!open)); const onClick=(e)=>{ const item=e.target.closest('[data-diff]'); if(item){ if(confirm('Start a new game at this difficulty?')){ const d=item.dataset.diff; const s=setup||{}; try{ s.difficulty=d; localStorage.setItem('sudoka:setup', JSON.stringify(s)); game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:d, theme:s.theme||'light' }); timer.reset(); buildGrid(); render(); }catch(err){ showError('Difficulty error: ' + err.message); } } diffMenu.classList.add('hidden'); diffBtn.setAttribute('aria-expanded','false'); document.removeEventListener('click',onClick); } }; setTimeout(()=>document.addEventListener('click', onClick),0); });
  playAgainBtn?.addEventListener('click', ()=>{ const s=setup||{}; try{ game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:s.difficulty||'easy', theme:s.theme||'light' }); timer.reset(); buildGrid(); render(); winModal?.classList.add('hidden'); }catch(e){ showError('Play again error: ' + e.message); } });
}

function selectCell(r,c){ game.selectCell(r,c); render(); }
function bindPad(el){ if(!el) return; el.addEventListener('click',(e)=>{ const b=e.target.closest('button'); if(!b) return; b.classList.add('flash'); setTimeout(()=>b.classList.remove('flash'),140); const sel=game?.selected; if(!sel) return; if(b.hasAttribute('data-clear')){ place(sel.r, sel.c, 0); return; } const n=b.getAttribute('data-num'); if(n){ place(sel.r, sel.c, Number(n)); } }); }
function place(r,c,val){ try{ const ok=game.placeNumber(r,c,val); const el=gridEl.children[r*9+c]; if(!timer.isRunning) timer.start(); if(!ok){ showToast('That conflicts with this row/column/box'); el.classList.add('error'); setTimeout(()=>el.classList.remove('error'),180); } else { el.classList.remove('error'); } render(); }catch(e){ showError('Place error: ' + e.message); } }
function undo(){ try{ if(game.undo()){ showToast('Undone'); render(); } }catch(e){ showError('Undo error: ' + e.message); } }
function redo(){ try{ if(game.redo()){ showToast('Redone'); render(); } }catch(e){ showError('Redo error: ' + e.message); } }
function doHint(){ try{ const h=game.hint(); if(h){ showToast('Hint used'); selectCell(h.r,h.c); } else showToast('No hint available'); }catch(e){ showError('Hint error: ' + e.message); } }
function toggleNotes(){ try{ game.notesMode=!game.notesMode; notesBtn?.setAttribute('aria-pressed', String(game.notesMode)); showToast(game.notesMode?'Notes on':'Notes off'); }catch(e){ showError('Notes toggle error: ' + e.message); } }

function highlightPeers(sel){ const {r,c}=sel; for(let rr=0;rr<9;rr++) for(let cc=0;cc<9;cc++){ const el=gridEl.children[rr*9+cc]; el.classList.remove('peer','selected'); if(rr===r&&cc===c) el.classList.add('selected'); if(rr===r||cc===c|| (Math.floor(rr/3)===Math.floor(r/3) && Math.floor(cc/3)===Math.floor(c/3))) el.classList.add('peer'); } }
function render(){ if(!game){ return; } if(timerEl) timerEl.textContent = formatTime(timer.valueMs); const sel=game.selected; for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const el=gridEl.children[r*9+c]; const val=game.board[r][c]; el.classList.remove('given','user'); if(game.fixed[r][c]) el.classList.add('given'); el.textContent = val? String(val): ''; if(val && !game.fixed[r][c]){ el.classList.add('user'); const tmp=val; game.board[r][c]=0; const invalid=!isValidMove(game.board,r,c,tmp); game.board[r][c]=tmp; if(invalid) el.classList.add('error'); } } if(sel) highlightPeers(sel); if(game.solved()){ timer.pause(); if(winStats) winStats.textContent = `Puzzle solved in ${formatTime(timer.valueMs)}`; winModal?.classList.remove('hidden'); } }
function onUpdate(){ updateUndoRedo(); try{ localStorage.setItem(TIMER_KEY, String(timer.valueMs)); }catch{} }
function updateUndoRedo(){ const canUndo=(game?.undoStack?.length||0)>1; const canRedo=(game?.redoStack?.length||0)>0; if(mUndo) mUndo.disabled=!canUndo; if(mRedo) mRedo.disabled=!canRedo; if(dUndo) dUndo.disabled=!canUndo; if(dRedo) dRedo.disabled=!canRedo; }
function formatTime(ms){ const s=Math.floor(ms/1000); const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=s%60; return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

// Show current difficulty label on the button after starting/changes
function updateDifficultyLabel(){
  const btn = document.getElementById('difficultyBtn');
  if(!btn || !game) return;
  const label = (game.difficulty||'easy');
  btn.textContent = `Difficulty: ${label.charAt(0).toUpperCase()+label.slice(1)} ▾`;
}

// Call after init render
try{ updateDifficultyLabel(); }catch{}

// Ensure difficulty menu toggles and applies correctly
if (diffBtn){
  diffBtn.addEventListener('click', ()=>{
    const open = diffMenu.classList.toggle('hidden');
    diffBtn.setAttribute('aria-expanded', String(!open));
  });
}

// Delegate menu clicks
if (diffMenu){
  diffMenu.addEventListener('click', (e)=>{
    const item = e.target.closest('[data-diff]'); if(!item) return;
    const d = item.getAttribute('data-diff'); if(!d) return;
    if (confirm('Start a new game at this difficulty?')){
      const s = setup || {};
      s.difficulty = d; try{ localStorage.setItem('sudoka:setup', JSON.stringify(s)); }catch{}
      try{
        game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:d, theme:s.theme||'light' });
        updateDifficultyLabel();
        timer.reset(); buildGrid(); render();
      }catch(err){ showError('Difficulty error: ' + err.message); }
    }
    diffMenu.classList.add('hidden');
    diffBtn?.setAttribute('aria-expanded','false');
  });
}

// Toggle difficulty menu visibility safely on mobile
if (diffBtn && diffMenu){
  diffBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    const isHidden = diffMenu.classList.contains('hidden');
    diffMenu.classList.toggle('hidden', !isHidden);
    diffBtn.setAttribute('aria-expanded', String(isHidden));
  });
  // Close when tapping outside
  document.addEventListener('click', (e)=>{
    if (diffMenu.classList.contains('hidden')) return;
    if (!e.target.closest('#difficultyMenu') && !e.target.closest('#difficultyBtn')){
      diffMenu.classList.add('hidden');
      diffBtn?.setAttribute('aria-expanded','false');
    }
  }, { passive: true });
}

// Mobile portrait: reserve bottom space equal to keypad height
(function syncKeypadPadding(){
  const root = document.documentElement;
  const pad = document.getElementById('sudoku-keypad');
  if (!pad) return;
  function apply() {
    const h = pad.offsetHeight || 260;
    root.style.setProperty('--kb', h + 'px');
  }
  window.addEventListener('load', apply, { once: true });
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  try { new ResizeObserver(apply).observe(pad); } catch {}
})();

// Mobile portrait: safe viewport unit and header/keypad measurement
function setVHVar(){
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
function setHeaderAndKeypadVars(){
  const hdr = document.querySelector('.play-topbar, .controls-row');
  const kb  = document.querySelector('.keypad:not(.keypad--desk)');
  const hdrH = hdr ? hdr.getBoundingClientRect().height : 0;
  const kbH  = kb  ? kb.getBoundingClientRect().height  : 260;
  document.documentElement.style.setProperty('--hdr-h', `${Math.ceil(hdrH)}px`);
  document.documentElement.style.setProperty('--kb-h',  `${Math.ceil(kbH)}px`);
}
const __recalc = () => { setVHVar(); setHeaderAndKeypadVars(); };
window.addEventListener('load', __recalc, { once:true });
window.addEventListener('resize', __recalc);
window.addEventListener('orientationchange', __recalc);
setTimeout(__recalc, 50);

// Mobile portrait sizing helpers (no game logic changed)
(function(){
  const pad = document.getElementById('sudoku-keypad'); if(!pad) return;
  const root = document.documentElement;
  function measure(){ const h = pad.offsetHeight || 210; root.style.setProperty('--keypad-h', h+'px'); }
  window.addEventListener('load', measure, { once:true });
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', measure);
  try { new ResizeObserver(measure).observe(pad); } catch {}
})();