import { cloneBoard, isValidPlacement, computeCandidates, getPeers } from './board.js';

export function solve(board) {
  const b = cloneBoard(board);
  if (solveBacktrack(b)) return b;
  return null;
}

function solveBacktrack(board) {
  let rMin = -1, cMin = -1, minCount = 10, opts = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const cand = [];
        for (let v = 1; v <= 9; v++) if (isValidPlacement(board, r, c, v)) cand.push(v);
        if (cand.length === 0) return false;
        if (cand.length < minCount) { minCount = cand.length; rMin = r; cMin = c; opts = cand; if (minCount === 1) break; }
      }
    }
    if (minCount === 1) break;
  }
  if (rMin === -1) return true;
  for (const v of opts) {
    board[rMin][cMin] = v;
    if (solveBacktrack(board)) return true;
    board[rMin][cMin] = 0;
  }
  return false;
}

export function countSolutions(board, limit = 2) {
  let count = 0;
  const b = cloneBoard(board);
  function backtrack() {
    if (count >= limit) return;
    let rMin = -1, cMin = -1, minCount = 10, opts = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (b[r][c] === 0) {
          const cand = [];
          for (let v = 1; v <= 9; v++) if (isValidPlacement(b, r, c, v)) cand.push(v);
          if (cand.length === 0) return;
          if (cand.length < minCount) { minCount = cand.length; rMin = r; cMin = c; opts = cand; if (minCount === 1) break; }
        }
      }
      if (minCount === 1) break;
    }
    if (rMin === -1) { count++; return; }
    for (const v of opts) {
      b[rMin][cMin] = v;
      backtrack();
      if (count >= limit) return;
      b[rMin][cMin] = 0;
    }
  }
  backtrack();
  return count;
}

// Returns { r, c, val, reason } or null
export function logicalHint(board) {
  const candidates = computeCandidates(board);
  // Naked single: a cell with only one candidate
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      if (candidates[r][c].size === 1) {
        const val = [...candidates[r][c]][0];
        return { r, c, val, reason: 'Single candidate' };
      }
    }
  }
  // Hidden single: a candidate that appears only once in a unit (row/col/box)
  // Rows
  for (let r = 0; r < 9; r++) {
    const counts = new Map();
    for (let c = 0; c < 9; c++) if (board[r][c] === 0) for (const v of candidates[r][c]) counts.set(v, (counts.get(v) || 0) + 1);
    for (const [v, n] of counts) if (n === 1) {
      for (let c = 0; c < 9; c++) if (board[r][c] === 0 && candidates[r][c].has(v)) return { r, c, val: v, reason: 'Only place in row' };
    }
  }
  // Cols
  for (let c = 0; c < 9; c++) {
    const counts = new Map();
    for (let r = 0; r < 9; r++) if (board[r][c] === 0) for (const v of candidates[r][c]) counts.set(v, (counts.get(v) || 0) + 1);
    for (const [v, n] of counts) if (n === 1) {
      for (let r = 0; r < 9; r++) if (board[r][c] === 0 && candidates[r][c].has(v)) return { r, c, val: v, reason: 'Only place in column' };
    }
  }
  // Boxes
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const counts = new Map();
      for (let r = br*3; r < br*3+3; r++) for (let c = bc*3; c < bc*3+3; c++) if (board[r][c] === 0) for (const v of candidates[r][c]) counts.set(v, (counts.get(v) || 0) + 1);
      for (const [v, n] of counts) if (n === 1) {
        for (let r = br*3; r < br*3+3; r++) for (let c = bc*3; c < bc*3+3; c++) if (board[r][c] === 0 && candidates[r][c].has(v)) return { r, c, val: v, reason: 'Only place in box' };
      }
    }
  }
  return null;
}