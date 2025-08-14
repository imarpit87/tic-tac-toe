import { SudokuGame } from './game.js';
import { isValidMove } from './board.js';

const toast = document.getElementById('toast');
const errorBar = document.getElementById('errorBar');
function showToast(msg){ try{ if(!toast) return; toast.textContent=msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),1600);}catch{} }
function showError(msg){ if(!errorBar) return; errorBar.textContent = msg; errorBar.hidden = false; }

// Sound system for Sudoku
let audioContext = null;
let soundEnabled = true;

function initAudioContext() {
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  } catch (e) {
    console.warn('Audio context not supported:', e);
    return null;
  }
}

function createSound(frequency, duration, type = 'sine', volume = 0.25) {
  if (!soundEnabled) return;
  const ctx = initAudioContext();
  if (!ctx) return;
  
  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn('Sound creation failed:', e);
  }
}

// Sudoku-specific sound functions
function playCellSelectSound() { createSound(800, 0.06, 'sine', 0.15); }
function playNumberPlaceSound() { createSound(600, 0.08, 'sine', 0.2); }
function playErrorSound() { createSound(300, 0.15, 'square', 0.25); }
function playSuccessSound() { createSound(800, 0.1, 'sine', 0.2); }
function playHintSound() { createSound(1000, 0.12, 'triangle', 0.25); }
function playUndoSound() { createSound(400, 0.08, 'sine', 0.18); }
function playRedoSound() { createSound(500, 0.08, 'sine', 0.18); }
function playButtonClickSound() { createSound(700, 0.05, 'sine', 0.15); }
function playWinSound() {
  createSound(523, 0.2, 'sine', 0.3); // C
  setTimeout(() => createSound(659, 0.2, 'sine', 0.3), 100); // E
  setTimeout(() => createSound(784, 0.3, 'sine', 0.3), 200); // G
  setTimeout(() => createSound(1047, 0.4, 'sine', 0.3), 300); // C (high)
}

const TIMER_KEY='sudoka:timerMs';
const timer=(()=>{ let start=0, running=false, value=0; function load(){ try{ const v=Number(localStorage.getItem(TIMER_KEY)); if(!Number.isNaN(v)) value=v; }catch{} } function save(){ try{ localStorage.setItem(TIMER_KEY,String(value)); }catch{} } function startRun(){ if(running) return; running=true; start=performance.now(); } function pause(){ if(!running) return; running=false; value+=performance.now()-start; save(); } function resume(){ if(running) return; running=true; start=performance.now(); } function reset(){ running=false; start=0; value=0; save(); } function now(){ return running? value+(performance.now()-start): value; } load(); return { start:startRun, pause, resume, reset, get isRunning(){return running;}, get valueMs(){return now();} }; })();

let setup=null; try{ const raw=localStorage.getItem('sudoka:setup'); setup = raw? JSON.parse(raw): null; }catch(e){ showError('Failed to read setup: ' + e.message); }
const cont = localStorage.getItem('sudoka:continue')==='1';
if(!setup && !cont){ showError('Missing setup. Please go back and start a new game.'); }

const gridEl=document.getElementById('sudoku-grid');
const undoBtn=document.getElementById('undoBtn');
const redoBtn=document.getElementById('redoBtn');
const keypadEl=document.querySelector('.sudoky__pad');
const timerEl=document.getElementById('m-timer');
const notesBtn=document.getElementById('notesBtn');
const hintBtn=document.getElementById('hintBtn');
const newBtn=document.getElementById('newBtn');
const diffBtn=document.getElementById('difficultyBtn');
const diffMenu=document.getElementById('difficultyMenu');
const playAgainBtn=document.getElementById('playAgainBtn');
const winModal=document.getElementById('winModal');
const winStats=document.getElementById('winStats');
const themeSelect=document.getElementById('themeSelect');
const soundToggle=document.getElementById('soundToggle');

let game;

try{
  game=new SudokuGame(()=>{}); game.onUpdate=onUpdate;
  if(cont && game.continueLast()){ localStorage.removeItem('sudoka:continue'); buildGrid(); render(); }
  else if(setup){ const name=setup?.name||''; const avatar=setup?.avatar||null; const difficulty=setup?.difficulty||'easy'; const theme=setup?.theme||'light'; document.documentElement.setAttribute('data-theme', theme); game.newGame({name, avatar, difficulty, theme}); timer.reset(); buildGrid(); render(); }
  else { // fallback demo board to avoid blank UI
    buildGrid(); showError('No setup found. Use Home > Play Sudoku to start.');
  }
  
  // Load saved theme and sound settings
  try {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeSelect) themeSelect.value = savedTheme;
    
    // Load sound settings
    const savedSound = localStorage.getItem('sudoku:soundEnabled');
    if (savedSound !== null) {
      soundEnabled = savedSound === 'true';
      if (soundToggle) soundToggle.checked = soundEnabled;
    }
  } catch {}
  
  wire();
}catch(err){ console.error('Sudoku init error', err); showError('Init error: ' + (err?.message||'see console')); }

export function focusCellNoJump(el){
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch { el.focus(); }
}

function buildGrid(){ const frag=document.createDocumentFragment(); for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const cell=document.createElement('div'); cell.className='cell'; if(r%3===0) cell.classList.add('box-top'); if(c%3===0) cell.classList.add('box-left'); if(c%3===2) cell.classList.add('box-right'); if(r%3===2) cell.classList.add('box-bottom'); cell.setAttribute('role','gridcell'); cell.setAttribute('tabindex','0'); cell.setAttribute('aria-label',`Row ${r+1}, Column ${c+1}`); cell.dataset.row=String(r); cell.dataset.col=String(c); frag.appendChild(cell);} gridEl.innerHTML=''; gridEl.appendChild(frag); }

function wire(){
  gridEl.addEventListener('pointerdown',(e)=>{ const t=e.target.closest('.cell'); if(!t) return; const r=Number(t.dataset.row), c=Number(t.dataset.col); if(Number.isNaN(r)||Number.isNaN(c)) return; if(!game){ showError('Game not initialized'); return; } selectCell(r,c); if(!timer.isRunning) timer.start(); }, {passive:true});
  document.addEventListener('keydown',(e)=>{ if(!game) return; const sel=game.selected; if(!sel) return; const {r,c}=sel; if(/^[1-9]$/.test(e.key)){ place(r,c,Number(e.key)); e.preventDefault(); } else if(['Backspace','Delete','0'].includes(e.key)){ place(r,c,0); e.preventDefault(); } else if(e.key==='ArrowUp'){ selectCell(Math.max(0,r-1),c); } else if(e.key==='ArrowDown'){ selectCell(Math.min(8,r+1),c); } else if(e.key==='ArrowLeft'){ selectCell(r,Math.max(0,c-1)); } else if(e.key==='ArrowRight'){ selectCell(r,Math.min(8,c+1)); } else if(e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey) && e.shiftKey){ redo(); } else if(e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey)){ undo(); } else if(e.key.toLowerCase()==='h'){ doHint(); } else if(e.key.toLowerCase()==='n'){ toggleNotes(); } });
  bindPad(keypadEl);
  undoBtn?.addEventListener('click', () => { playButtonClickSound(); undo(); });
  redoBtn?.addEventListener('click', () => { playButtonClickSound(); redo(); });
  hintBtn?.addEventListener('click', () => { playButtonClickSound(); doHint(); });
  notesBtn?.addEventListener('click', () => { playButtonClickSound(); toggleNotes(); });
  newBtn?.addEventListener('click', ()=>{ 
    playButtonClickSound();
    if(confirm('Start a new puzzle? Your current progress will be lost.')){ 
      const s=setup||{}; 
      try{ 
        game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:s.difficulty||'easy', theme:s.theme||'light' }); 
        timer.reset(); 
        buildGrid(); 
        render(); 
        showToast('New game'); 
      }catch(e){ showError('New game error: ' + e.message); } 
    } 
  });
  // Difficulty button click handler removed - handled by dedicated listener below
  playAgainBtn?.addEventListener('click', ()=>{ 
    playButtonClickSound();
    const s=setup||{}; 
    try{ 
      game.newGame({ name:s.name||'', avatar:s.avatar||null, difficulty:s.difficulty||'easy', theme:s.theme||'light' }); 
      timer.reset(); 
      buildGrid(); 
      render(); 
      winModal?.classList.add('hidden'); 
    }catch(e){ showError('Play again error: ' + e.message); } 
  });
  
  // Theme functionality
  themeSelect?.addEventListener('change', () => {
    const theme = themeSelect.value;
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch {}
  });
  
  // Sound toggle functionality
  soundToggle?.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    try { localStorage.setItem('sudoku:soundEnabled', soundEnabled.toString()); } catch {}
    playButtonClickSound(); // Play sound when toggling
  });
}

function selectCell(r,c){ 
  game.selectCell(r,c); 
  playCellSelectSound();
  render(); 
}
function bindPad(el){ 
  if(!el) return; 
  el.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); 
    if(!b) return; 
    b.classList.add('flash'); 
    setTimeout(()=>b.classList.remove('flash'),140); 
    playButtonClickSound();
    const sel=game?.selected; 
    if(!sel) return; 
    if(b.hasAttribute('data-clear')){ 
      place(sel.r, sel.c, 0); 
      return; 
    } 
    const n=b.getAttribute('data-num'); 
    if(n){ 
      place(sel.r, sel.c, Number(n)); 
    } 
  }); 
}
function place(r,c,val){ 
  try{ 
    const ok=game.placeNumber(r,c,val); 
    const el=gridEl.children[r*9+c]; 
    if(!timer.isRunning) timer.start(); 
    if(!ok){ 
      showToast('That conflicts with this row/column/box'); 
      el.classList.add('error'); 
      setTimeout(()=>el.classList.remove('error'),180); 
      playErrorSound();
    } else { 
      el.classList.remove('error'); 
      playNumberPlaceSound();
      
      // Check if puzzle is solved
      if (game.solved()) {
        setTimeout(() => playWinSound(), 300);
      }
    } 
    render(); 
  }catch(e){ showError('Place error: ' + e.message); } 
}
function undo(){ 
  try{ 
    if(game.undo()){
      showToast('Undone'); 
      playUndoSound();
      render(); 
    } 
  }catch(e){ showError('Undo error: ' + e.message); } 
}
function redo(){ 
  try{ 
    if(game.redo()){
      showToast('Redone'); 
      playRedoSound();
      render(); 
    } 
  }catch(e){ showError('Redo error: ' + e.message); } 
}
function doHint(){ 
  try{ 
    const h=game.hint(); 
    if(h){ 
      showToast('Hint used'); 
      playHintSound();
      selectCell(h.r,h.c); 
    } else {
      showToast('No hint available'); 
      playErrorSound();
    } 
  }catch(e){ showError('Hint error: ' + e.message); } 
}
function toggleNotes(){ 
  try{ 
    game.notesMode=!game.notesMode; 
    notesBtn?.setAttribute('aria-pressed', String(game.notesMode)); 
    showToast(game.notesMode?'Notes on':'Notes off'); 
    playButtonClickSound();
  }catch(e){ showError('Notes toggle error: ' + e.message); } 
}

function highlightPeers(sel){ 
  const {r,c}=sel; 
  const selectedValue = game.board[r][c]; // Get the value of selected cell
  
  for(let rr=0;rr<9;rr++) for(let cc=0;cc<9;cc++){ 
    const el=gridEl.children[rr*9+cc]; 
    el.classList.remove('peer','selected','same-number'); 
    
    if(rr===r&&cc===c) el.classList.add('selected'); 
    if(rr===r||cc===c|| (Math.floor(rr/3)===Math.floor(r/3) && Math.floor(cc/3)===Math.floor(c/3))) el.classList.add('peer'); 
    
    // Highlight cells with the same number as selected cell
    if(selectedValue && selectedValue !== 0 && game.board[rr][cc] === selectedValue) {
      el.classList.add('same-number');
    }
  } 
}
function render(){ if(!game){ return; } if(timerEl) timerEl.textContent = formatTime(timer.valueMs); const sel=game.selected; for(let r=0;r<9;r++) for(let c=0;c<9;c++){ const el=gridEl.children[r*9+c]; const val=game.board[r][c]; el.classList.remove('given','user'); if(game.fixed[r][c]) el.classList.add('given'); el.textContent = val? String(val): ''; if(val && !game.fixed[r][c]){ el.classList.add('user'); const tmp=val; game.board[r][c]=0; const invalid=!isValidMove(game.board,r,c,tmp); game.board[r][c]=tmp; if(invalid) el.classList.add('error'); } } if(sel) highlightPeers(sel); if(game.solved()){ timer.pause(); if(winStats) winStats.textContent = `Puzzle solved in ${formatTime(timer.valueMs)}`; winModal?.classList.remove('hidden'); } }
function onUpdate(){ updateUndoRedo(); try{ localStorage.setItem(TIMER_KEY, String(timer.valueMs)); }catch{} }
function updateUndoRedo(){ 
  const canUndo=(game?.undoStack?.length||0)>1; 
  const canRedo=(game?.redoStack?.length||0)>0; 
  if(undoBtn) undoBtn.disabled=!canUndo; 
  if(redoBtn) redoBtn.disabled=!canRedo; 
  
  // Update notes button states
  if(notesBtn) notesBtn.setAttribute('aria-pressed', String(game?.notesMode||false));
}
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

// Duplicate difficulty listener removed - handled by main listener below

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

// Enhanced difficulty button functionality with comprehensive debugging
function setupDifficultyButton() {
  console.log('Setting up difficulty button...');
  
  const diffBtn = document.getElementById('difficultyBtn');
  const diffMenu = document.getElementById('difficultyMenu');
  
  console.log('Difficulty button found:', !!diffBtn);
  console.log('Difficulty menu found:', !!diffMenu);
  
  if (!diffBtn || !diffMenu) {
    console.error('Difficulty elements not found');
    return;
  }

  // Remove any existing listeners by cloning the button
  const newDiffBtn = diffBtn.cloneNode(true);
  diffBtn.parentNode.replaceChild(newDiffBtn, diffBtn);
  
  // Update reference to the new button
  const freshDiffBtn = document.getElementById('difficultyBtn');
  
  // Add click handler with comprehensive debugging
  freshDiffBtn.addEventListener('click', function(e) {
    console.log('Difficulty button clicked!', e);
    e.preventDefault();
    e.stopPropagation();
    
    const isHidden = diffMenu.classList.contains('hidden');
    console.log('Menu currently hidden:', isHidden);
    
    if (isHidden) {
      diffMenu.classList.remove('hidden');
      freshDiffBtn.setAttribute('aria-expanded', 'true');
      console.log('Menu opened');
      layoutMenu();
    } else {
      diffMenu.classList.add('hidden');
      freshDiffBtn.setAttribute('aria-expanded', 'false');
      console.log('Menu closed');
    }
  }, { passive: false });

  // Position menu below button on desktop/tablet
  function layoutMenu(){
    const vw = window.innerWidth;
    const rect = freshDiffBtn.getBoundingClientRect();
    if(vw >= 1024){ // desktop
      diffMenu.style.position = 'fixed';
      diffMenu.style.left = rect.left + 'px';
      diffMenu.style.top  = (rect.bottom + 4) + 'px';
      diffMenu.style.transform = 'none';
    } else if(vw >= 768){ // tablet
      diffMenu.style.position = 'fixed';
      diffMenu.style.left = rect.left + 'px';
      diffMenu.style.top  = (rect.bottom + 4) + 'px';
      diffMenu.style.transform = 'none';
    } else { // mobile retains centered fixed styling via CSS
      diffMenu.style.position = 'fixed';
      diffMenu.style.left = '50%';
      diffMenu.style.top  = 'calc(var(--topbar-h, 56px) + 4px)';
      diffMenu.style.transform = 'translateX(-50%)';
    }
  }

  // Re-position on viewport changes when menu is open
  ['resize','orientationchange'].forEach(evt => window.addEventListener(evt, ()=>{
    if(!diffMenu.classList.contains('hidden')) layoutMenu();
  }));

  // Add additional event types for better compatibility
  ['mousedown', 'touchstart'].forEach(eventType => {
    freshDiffBtn.addEventListener(eventType, function(e) {
      console.log(`${eventType} on difficulty button`);
    }, { passive: true });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (diffMenu.classList.contains('hidden')) return;
    if (!e.target.closest('#difficultyMenu') && !e.target.closest('#difficultyBtn')) {
      diffMenu.classList.add('hidden');
      freshDiffBtn.setAttribute('aria-expanded', 'false');
      console.log('Menu closed by outside click');
    }
  }, { passive: true });

  console.log('Difficulty button setup complete');
}

// Call setup after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDifficultyButton);
} else {
  setupDifficultyButton();
}

