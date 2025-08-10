import { generatePuzzle } from './generator.js';
import { deepClone, isValidMove } from './board.js';

const SAVE_KEY='sudoka:save';

export class SudokuGame{
  constructor(onUpdate){ this.onUpdate=typeof onUpdate==='function'? onUpdate: ()=>{}; this.newGame({name:'', avatar:null, difficulty:'easy', theme:'light'}); }
  newGame({name, avatar, difficulty='easy', theme='light'}){
    const { givens, solution } = generatePuzzle(difficulty);
    this.name=name||''; this.avatar=avatar||null; this.difficulty=difficulty; this.theme=theme;
    this.board=deepClone(givens); this.solution=deepClone(solution);
    this.fixed = Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=> !!givens[r][c]));
    this.notesMode=false; this.selected=null;
    this.undoStack=[]; this.redoStack=[];
    this.commit('New game'); this.save(); this.onUpdate('New game');
  }
  save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify({ name:this.name, avatar:this.avatar, difficulty:this.difficulty, theme:this.theme, board:this.board, fixed:this.fixed, undoStack:this.undoStack, redoStack:this.redoStack, notesMode:this.notesMode })); }catch{} }
  load(){ try{ const raw=localStorage.getItem(SAVE_KEY); if(!raw) return false; const s=JSON.parse(raw); Object.assign(this, { name:s.name, avatar:s.avatar, difficulty:s.difficulty, theme:s.theme, board:s.board, fixed:s.fixed, undoStack:s.undoStack||[], redoStack:s.redoStack||[], notesMode:!!s.notesMode }); this.onUpdate('Loaded'); return true; }catch{ return false; } }
  continueLast(){ return this.load(); }
  commit(reason){ this.undoStack.push({ board:deepClone(this.board) }); this.redoStack.length=0; this.onUpdate(reason); }
  selectCell(r,c){ this.selected={r,c}; this.onUpdate('Select'); }
  placeNumber(r,c,val){ if(this.fixed[r][c]) return false; if(val<0||val>9) return false; if(val!==0 && !isValidMove(this.board,r,c,val)) return false; this.board[r][c]=val; this.commit('Place'); this.save(); return true; }
  undo(){ if(this.undoStack.length<=1) return false; const cur=this.undoStack.pop(); this.redoStack.push(cur); const prev=this.undoStack[this.undoStack.length-1]; this.board=deepClone(prev.board); this.onUpdate('Undo'); this.save(); return true; }
  redo(){ if(this.redoStack.length===0) return false; const st=this.redoStack.pop(); this.undoStack.push({board:deepClone(st.board)}); this.board=deepClone(st.board); this.onUpdate('Redo'); this.save(); return true; }
  hint(){ for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(this.board[r][c]===0){ const v=this.solution[r][c]; this.board[r][c]=v; this.commit('Hint'); this.save(); return {r,c,val:v}; } return null; }
  solved(){ for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(this.board[r][c]!==this.solution[r][c]) return false; return true; }
}