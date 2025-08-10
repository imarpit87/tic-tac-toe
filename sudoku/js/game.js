import { isValidPlacement, deepCloneBoard, boardsEqual } from './board.js';
import { generatePuzzle } from './generator.js';

const SAVE_KEY='sudoka:save';

export class SudokuGame{
  constructor(onUpdate){
    this.onUpdate = typeof onUpdate==='function' ? onUpdate : (()=>{});
    this.newGame({ name:'', avatar:null, difficulty:'easy', theme:'light' });
  }
  newGame({ name, avatar, difficulty='easy', theme='light' }){
    const p = generatePuzzle(difficulty);
    this.name=name||''; this.avatar=avatar||null; this.difficulty=difficulty; this.theme=theme;
    this.board = deepCloneBoard(p.board);
    this.solution = deepCloneBoard(p.solution);
    this.fixed = p.fixed;
    this.notesMode = false;
    this.undoStack = []; this.redoStack = [];
    this.selected = null;
    this.startedAt = Date.now(); this.elapsedMs = 0;
    this.commitState('New game');
    this.save(); this.onUpdate('New game');
  }
  save(){
    const data={ name:this.name, avatar:this.avatar, difficulty:this.difficulty, theme:this.theme, board:this.board, fixed:this.fixed, undoStack:this.undoStack, redoStack:this.redoStack, notesMode:this.notesMode, elapsedMs:this.elapsedMs, startedAt:this.startedAt, solution:this.solution };
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(data)); }catch{}
  }
  load(){
    try{
      const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false;
      const s=JSON.parse(raw);
      this.name=s.name; this.avatar=s.avatar; this.difficulty=s.difficulty; this.theme=s.theme;
      this.board=s.board; this.fixed=s.fixed; this.undoStack=s.undoStack||[]; this.redoStack=s.redoStack||[];
      this.notesMode=!!s.notesMode; this.elapsedMs=s.elapsedMs||0; this.startedAt=s.startedAt||Date.now(); this.solution=s.solution;
      this.onUpdate('Loaded'); return true;
    }catch{ return false; }
  }
  continueLast(){ return this.load(); }
  selectCell(r,c){ this.selected={r,c}; this.onUpdate('Select'); }
  commitState(reason){ this.undoStack.push({ board:deepCloneBoard(this.board) }); this.redoStack.length=0; this.onUpdate(reason); }
  placeNumber(r,c,val){ if(this.fixed[r][c]) return false; if(val<0||val>9) return false; if(val!==0 && !isValidPlacement(this.board,r,c,val)) return false; this.board[r][c]=val; this.commitState('Place'); this.save(); return true; }
  undo(){ if(this.undoStack.length<=1) return false; const cur=this.undoStack.pop(); this.redoStack.push(cur); const prev=this.undoStack[this.undoStack.length-1]; this.board=deepCloneBoard(prev.board); this.onUpdate('Undo'); this.save(); return true; }
  redo(){ if(this.redoStack.length===0) return false; const st=this.redoStack.pop(); this.undoStack.push({board:deepCloneBoard(st.board)}); this.board=deepCloneBoard(st.board); this.onUpdate('Redo'); this.save(); return true; }
  hint(){
    // try a logical single: any cell with only one candidate
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(!this.fixed[r][c] && this.board[r][c]===0){
      const cand=[]; for(let n=1;n<=9;n++) if(isValidPlacement(this.board,r,c,n)) cand.push(n);
      if(cand.length===1){ this.board[r][c]=cand[0]; this.commitState('Hint'); this.save(); return { r, c, val:cand[0], logical:true }; }
    }
    // fallback: fill a correct cell from solution that is empty
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(this.board[r][c]===0){ const v=this.solution[r][c]; this.board[r][c]=v; this.commitState('Hint'); this.save(); return { r,c,val:v, logical:false }; }
    return null;
  }
  solved(){ return boardsEqual(this.board, this.solution); }
}