import { deepCloneBoard, isValidPlacement, findEmpty, boardsEqual } from './board.js';

function solveBacktrack(board){
  const empty = findEmpty(board); if(!empty) return true;
  const [r,c]=empty;
  for(let n=1;n<=9;n++){
    if(isValidPlacement(board,r,c,n)){
      board[r][c]=n;
      if(solveBacktrack(board)) return true;
      board[r][c]=0;
    }
  }
  return false;
}

function countSolutions(board, cap=2){
  let count=0;
  function backtrack(){
    if(count>=cap) return;
    const empty=findEmpty(board); if(!empty){ count++; return; }
    const [r,c]=empty;
    for(let n=1;n<=9;n++){
      if(isValidPlacement(board,r,c,n)){
        board[r][c]=n; backtrack(); board[r][c]=0; if(count>=cap) return;
      }
    }
  }
  backtrack(); return count;
}

function generateSolved(){
  const board=Array.from({length:9},()=>Array(9).fill(0));
  // seed first row with shuffled 1..9 to add variety
  const nums=[1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5);
  for(let c=0;c<9;c++) board[0][c]=nums[c];
  solveBacktrack(board);
  return board;
}

function removeSymmetric(board, targetGivens){
  const coords=[]; for(let r=0;r<9;r++) for(let c=0;c<9;c++) coords.push([r,c]);
  coords.sort(()=>Math.random()-0.5);
  const puzzle=deepCloneBoard(board);
  const total=81; let removed=0; const toRemove=Math.max(0,total-targetGivens);
  for(const [r,c] of coords){
    if(removed>=toRemove) break;
    const r2=8-r, c2=8-c;
    const prev=puzzle[r][c], prev2=puzzle[r2][c2];
    if(prev===0 && prev2===0) continue;
    const cache1=puzzle[r][c]; const cache2=puzzle[r2][c2];
    puzzle[r][c]=0; puzzle[r2][c2]=0;
    const tmp=deepCloneBoard(puzzle);
    if(countSolutions(tmp,2)===1){ removed += (cache1?1:0) + (cache2?1:0); }
    else { puzzle[r][c]=cache1; puzzle[r2][c2]=cache2; }
  }
  return puzzle;
}

export function generatePuzzle(difficulty){
  const solved=generateSolved();
  let targetGivens=46;
  if(difficulty==='medium') targetGivens=38;
  else if(difficulty==='hard') targetGivens=30;
  else if(difficulty==='god') targetGivens=25;
  const puzzle=removeSymmetric(solved, targetGivens);
  const fixed=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=> puzzle[r][c]!==0));
  return { board: puzzle, solution: solved, fixed };
}