import { deepClone, isValidMove, findEmpty } from './board.js';

export function solve(board){ const b=deepClone(board); return solveBacktrack(b)? b: null; }
function solveBacktrack(board){ const empty=findEmpty(board); if(!empty) return true; const [r,c]=empty; for(let n=1;n<=9;n++){ if(isValidMove(board,r,c,n)){ board[r][c]=n; if(solveBacktrack(board)) return true; board[r][c]=0; } } return false; }

function countSolutions(board, cap=2){ let count=0; function backtrack(){ if(count>=cap) return; const empty=findEmpty(board); if(!empty){ count++; return; } const [r,c]=empty; for(let n=1;n<=9;n++){ if(isValidMove(board,r,c,n)){ board[r][c]=n; backtrack(); board[r][c]=0; if(count>=cap) return; } } } backtrack(); return count; }

function generateSolved(){ const board=Array.from({length:9},()=>Array(9).fill(0)); const row=[1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5); for(let c=0;c<9;c++) board[0][c]=row[c]; solveBacktrack(board); return board; }

function removeSymmetric(solved, targetGivens){ const puzzle=deepClone(solved); const coords=[]; for(let r=0;r<9;r++) for(let c=0;c<9;c++) coords.push([r,c]); coords.sort(()=>Math.random()-0.5); const needed=81-targetGivens; let removed=0; for(const [r,c] of coords){ if(removed>=needed) break; const r2=8-r, c2=8-c; const a=puzzle[r][c], b=puzzle[r2][c2]; if(a===0 && b===0) continue; puzzle[r][c]=0; puzzle[r2][c2]=0; const tmp=deepClone(puzzle); if(countSolutions(tmp,2)===1){ removed += (a?1:0) + (b?1:0); } else { puzzle[r][c]=a; puzzle[r2][c2]=b; } } return puzzle; }

export function generatePuzzle(difficulty){ 
  const solved=generateSolved(); 
  let givens=65; // Easy: 20% difficulty (65 givens = 16 cells to fill)
  if(difficulty==='medium') givens=57; // Medium: 30% difficulty (57 givens = 24 cells to fill)
  else if(difficulty==='hard') givens=41; // Hard: 50% difficulty (41 givens = 40 cells to fill)
  else if(difficulty==='god') givens=16; // God: 80% difficulty (16 givens = 65 cells to fill)
  const puzzle=removeSymmetric(solved, givens); 
  return { givens:puzzle, solution: solved }; 
}