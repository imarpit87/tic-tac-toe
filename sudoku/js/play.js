import { SudokuGame } from './game.js';
import { isValidPlacement } from './board.js';

/* Timer */
const TIMER_KEY='sudoka:timerMs';
const timer=(()=>{ let start=0, running=false, value=0; function load(){ try{ const v=Number(localStorage.getItem(TIMER_KEY)); if(!Number.isNaN(v)) value=v; }catch{} } function save(){ try{ localStorage.setItem(TIMER_KEY,String(value)); }catch{} } function startRun(){ if(running) return; running=true; start=performance.now(); } function pause(){ if(!running) return; running=false; value+=performance.now()-start; save(); } function resume(){ if(running) return; running=true; start=performance.now(); } function reset(){ running=false; start=0; value=0; save(); } function now(){ return running? value+(performance.now()-start): value; } load(); return { start:startRun, pause, resume, reset, get isRunning(){return running;}, get valueMs(){return now();} }; })();

console.log('[Sudoku] init play.js');

/* Setup guard */
const setupRaw=localStorage.getItem('sudoka:setup');
const cont=localStorage.getItem('sudoka:continue')==='1';
if(!setupRaw && !cont){ location.replace('/sudoku/index.html'); }
const setup=setupRaw? JSON.parse(setupRaw): null;

/* Elements */
const gridEl=document.getElementById('sudoku-grid');
if(gridEl) gridEl.style.pointerEvents = 'auto';
const toast=document.getElementById('toast');
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

/* Game */
const game=new SudokuGame(onUpdate);
if(cont && game.continueLast()){ localStorage.removeItem('sudoka:continue'); buildGrid(); render(); }
else { const name=setup?.name||''; const avatar=setup?.avatar||null; const difficulty=setup?.difficulty||'easy'; const theme=setup?.theme||'light'; document.documentElement.setAttribute('data-theme', theme); game.newGame({name, avatar, difficulty, theme}); timer.reset(); buildGrid(); render(); }

/* Keypad height sync */
(function(){ if(!keypadMobile) return; function sync(){ const h=Math.round(keypadMobile.getBoundingClientRect().height||260); document.documentElement.style.setProperty('--keypad-h', h+'px'); } window.addEventListener('load',sync); window.addEventListener('resize',sync); window.addEventListener('orientationchange',sync); try{ new ResizeObserver(sync).observe(keypadMobile);}catch{} sync(); })();

/* Build grid */
function buildGrid(){ const frag=document.createDocumentFragment(); for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const cell=document.createElement('div'); cell.className='cell'; if(r%3===0) cell.classList.add('box-top'); if(c%3===0) cell.classList.add('box-left'); if(c%3===2) cell.classList.add('box-right'); if(r%3===2) cell.classList.add('box-bottom'); cell.setAttribute('role','gridcell'); cell.setAttribute('tabindex','0'); cell.setAttribute('aria-label',`Row ${r+1}, Column ${c+1}`); cell.dataset.row=String(r); cell.dataset.col=String(c); frag.appendChild(cell);} gridEl.innerHTML=''; gridEl.appendChild(frag); console.log('[Sudoku] grid built with 81 cells'); } 

/* Selection + input */
function selectCell(r,c){ game.selectCell(r,c); render(); }

gridEl.addEventListener('pointerdown',(e)=>{ const t=e.target.closest('.cell'); if(!t) return; const r=Number(t.dataset.row), c=Number(t.dataset.col); if(Number.isNaN(r)||Number.isNaN(c)) return; console.log('[Sudoku] cell click', r, c); selectCell(r,c); if(!timer.isRunning) timer.start(); }, {passive:true});

document.addEventListener('keydown',(e)=>{ const sel=game.selected; if(!sel) return; const {r,c}=sel; if(/^[1-9]$/.test(e.key)){ place(r,c,Number(e.key)); e.preventDefault(); } else if(['Backspace','Delete','0'].includes(e.key)){ place(r,c,0); e.preventDefault(); } else if(e.key==='ArrowUp'){ selectCell(Math.max(0,r-1),c); } else if(e.key==='ArrowDown'){ selectCell(Math.min(8,r+1),c); } else if(e.key==='ArrowLeft'){ selectCell(r,Math.max(0,c-1)); } else if(e.key==='ArrowRight'){ selectCell(r,Math.min(8,c+1)); } else if(e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey) && e.shiftKey){ redo(); } else if(e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey)){ undo(); } else if(e.key.toLowerCase()==='h'){ doHint(); } else if(e.key.toLowerCase()==='n'){ toggleNotes(); } });

/* Keypad binding with flash */
function bindPad(el){ if(!el) return; el.addEventListener('click',(e)=>{ const b=e.target.closest('button'); if(!b) return; b.classList.add('flash'); setTimeout(()=>b.classList.remove('flash'),150); const sel=game.selected; if(!sel) return; if(b.hasAttribute('data-clear')){ place(sel.r, sel.c, 0); return; } const n=b.getAttribute('data-num'); if(n){ place(sel.r, sel.c, Number(n)); } }); }
bindPad(keypadMobile); bindPad(keypadDesk);

/* Place number with feedback */
function place(r,c,val){ const ok=game.placeNumber(r,c,val); const el=gridEl.children[r*9+c]; if(!timer.isRunning) timer.start(); if(!ok){ showToast('That conflicts with this row/column/box'); el.classList.add('error'); setTimeout(()=>el.classList.remove('error'),180); } else { el.classList.remove('error'); } render(); }

/* Undo/redo */
function undo(){ if(game.undo()){ showToast('Undone'); render(); } }
function redo(){ if(game.redo()){ showToast('Redone'); render(); } }
[mUndo,mRedo,dUndo,dRedo].forEach((el,idx)=>{ if(!el) return; el.addEventListener('click', ()=> idx%2===0? undo(): redo()); });

/* Hint / Notes / New / Difficulty */
function doHint(){ const h=game.hint(); if(h){ showToast('Hint used'); selectCell(h.r,h.c); } else showToast('No hint available'); }
hintBtn?.addEventListener('click', doHint);
function toggleNotes(){ game.notesMode=!game.notesMode; notesBtn?.setAttribute('aria-pressed', String(game.notesMode)); showToast(game.notesMode?'Notes on':'Notes off'); }
notesBtn?.addEventListener('click', toggleNotes);
newBtn?.addEventListener('click', ()=>{ if(confirm('Start a new puzzle? Your current progress will be lost.')){ const s=setup||{}; game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:s.difficulty||'easy', theme:s.theme||'light' }); timer.reset(); buildGrid(); render(); showToast('New game'); } });
diffBtn?.addEventListener('click', ()=>{ const open=diffMenu.classList.toggle('hidden'); diffBtn.setAttribute('aria-expanded', String(!open)); const onClick=(e)=>{ const item=e.target.closest('[data-diff]'); if(item){ if(confirm('Start a new game at this difficulty?')){ const d=item.dataset.diff; const s=setup||{}; s.difficulty=d; localStorage.setItem('sudoka:setup', JSON.stringify(s)); game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:d, theme:s.theme||'light' }); timer.reset(); buildGrid(); render(); } diffMenu.classList.add('hidden'); diffBtn.setAttribute('aria-expanded','false'); document.removeEventListener('click',onClick); } }; setTimeout(()=>document.addEventListener('click', onClick),0); });
playAgainBtn?.addEventListener('click', ()=>{ const s=setup||{}; game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:s.difficulty||'easy', theme:s.theme||'light' }); timer.reset(); buildGrid(); render(); document.getElementById('winModal')?.classList.add('hidden'); });

/* Focus/blur timer */
window.addEventListener('blur', ()=>timer.pause());
window.addEventListener('focus', ()=>{ if(!game.solved()) timer.resume(); });

/* Render */
function highlightPeers(sel){ const {r,c}=sel; for(let rr=0;rr<9;rr++) for(let cc=0;cc<9;cc++){ const el=gridEl.children[rr*9+cc]; el.classList.remove('peer','selected'); if(rr===r&&cc===c) el.classList.add('selected'); if(rr===r||cc===c|| (Math.floor(rr/3)===Math.floor(r/3) && Math.floor(cc/3)===Math.floor(c/3))) el.classList.add('peer'); } }
function render(){ if(timerEl) timerEl.textContent = formatTime(timer.valueMs); const sel=game.selected; for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const el=gridEl.children[r*9+c]; const val=game.board[r][c]; el.classList.remove('given','user'); if(game.fixed[r][c]) el.classList.add('given'); el.textContent = val? String(val): ''; if(val && !game.fixed[r][c]){ el.classList.add('user'); const tmp=val; game.board[r][c]=0; const invalid=!isValidPlacement(game.board,r,c,tmp); game.board[r][c]=tmp; if(invalid) el.classList.add('error'); } } if(sel) highlightPeers(sel); if(game.solved()){ timer.pause(); const m=document.getElementById('winModal'); const stats=document.getElementById('winStats'); if(stats) stats.textContent = `Puzzle solved in ${formatTime(timer.valueMs)}`; m?.classList.remove('hidden'); } }
function onUpdate(){ updateUndoRedo(); try{ localStorage.setItem(TIMER_KEY, String(timer.valueMs)); }catch{} }
function updateUndoRedo(){ const canUndo=(game.undoStack?.length||0)>1; const canRedo=(game.redoStack?.length||0)>0; if(mUndo) mUndo.disabled=!canUndo; if(mRedo) mRedo.disabled=!canRedo; if(dUndo) dUndo.disabled=!canUndo; if(dRedo) dRedo.disabled=!canRedo; }
function formatTime(ms){ const s=Math.floor(ms/1000); const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=s%60; return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

/* Toast */
let toastT; function showToast(msg){ clearTimeout(toastT); if(!toast) return; toast.textContent=msg; toast.classList.add('show'); toastT=setTimeout(()=>toast.classList.remove('show'),1500); }