import { createEmptyBoard, cloneBoard } from './board.js';
import { solve, countSolutions } from './solver.js';

export function generateSolvedGrid() {
  // Base Latin pattern approach
  const base = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1));
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  // Shuffle rows in bands
  for (let b = 0; b < 3; b++) {
    const rows = [0,1,2].map(i => b*3 + i); const perm = shuffle([...rows]); const copy = perm.map(i => base[i]); rows.forEach((r,i) => base[r] = copy[i]);
  }
  // Shuffle cols in stacks
  for (let s = 0; s < 3; s++) {
    const cols = [0,1,2].map(i => s*3 + i);
    for (let r = 0; r < 9; r++) { const row = base[r]; const perm = shuffle([...cols]); const copy = perm.map(i => row[i]); cols.forEach((c,i) => row[c] = copy[i]); }
  }
  return base;
}

export function generatePuzzle(difficulty) {
  const targetGivens = difficulty === 'easy' ? 36 : difficulty === 'medium' ? 30 : difficulty === 'hard' ? 26 : 22; // god
  const solved = generateSolvedGrid();
  const puzzle = cloneBoard(solved);
  let cells = Array.from({ length: 81 }, (_, i) => i);
  cells.sort(() => Math.random() - 0.5);
  while (cells.length > 0 && countFilled(puzzle) > targetGivens) {
    const idx = cells.pop();
    const r = Math.floor(idx / 9), c = idx % 9;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    // Maintain uniqueness
    const numSolutions = countSolutions(puzzle, 2);
    if (numSolutions !== 1) {
      puzzle[r][c] = backup; // revert
    }
  }
  return { puzzle, solution: solved };
}

function countFilled(board) {
  let n = 0; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] !== 0) n++; return n;
}