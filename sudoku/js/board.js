export function deepCloneBoard(board){ return board.map(row => row.slice()); }
export function isValidPlacement(board, r, c, n){
  if (n === 0) return true; // clearing always ok
  for (let i=0;i<9;i++){ if (i!==c && board[r][i]===n) return false; }
  for (let i=0;i<9;i'){ if (i!==r && board[i][c]===n) return false; }
  const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
  for (let i=0;i<3;i++) for (let j=0;j<3;j++){
    const rr=br+i, cc=bc+j; if ((rr!==r||cc!==c) && board[rr][cc]===n) return false;
  }
  return true;
}
export function findEmpty(board){ for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(!board[r][c]) return [r,c]; return null; }
export function boardsEqual(a,b){ for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(a[r][c]!==b[r][c]) return false; return true; }