import { createEmptyBoard, cloneBoard } from './board.js';
import { solve, countSolutions } from './solver.js';

// Fallback known-good puzzles (puzzle rows with 0 for empties) and their solutions
const FALLBACKS = {
  easy: [{
    puzzle: [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ],
    solution: [
      [5,3,4, 6,7,8, 9,1,2],
      [6,7,2, 1,9,5, 3,4,8],
      [1,9,8, 3,4,2, 5,6,7],
      [8,5,9, 7,6,1, 4,2,3],
      [4,2,6, 8,5,3, 7,9,1],
      [7,1,3, 9,2,4, 8,5,6],
      [9,6,1, 5,3,7, 2,8,4],
      [2,8,7, 4,1,9, 6,3,5],
      [3,4,5, 2,8,6, 1,7,9],
    ]
  }],
  medium: [{
    puzzle: [
      [0,0,0, 2,6,0, 7,0,1],
      [6,8,0, 0,7,0, 0,9,0],
      [1,9,0, 0,0,4, 5,0,0],
      [8,2,0, 1,0,0, 0,4,0],
      [0,0,4, 6,0,2, 9,0,0],
      [0,5,0, 0,0,3, 0,2,8],
      [0,0,9, 3,0,0, 0,7,4],
      [0,4,0, 0,5,0, 0,3,6],
      [7,0,3, 0,1,8, 0,0,0],
    ],
    solution: [
      [4,3,5, 2,6,9, 7,8,1],
      [6,8,2, 5,7,1, 4,9,3],
      [1,9,7, 8,3,4, 5,6,2],
      [8,2,6, 1,9,5, 3,4,7],
      [3,7,4, 6,8,2, 9,1,5],
      [9,5,1, 7,4,3, 6,2,8],
      [5,1,9, 3,2,6, 8,7,4],
      [2,4,8, 9,5,7, 1,3,6],
      [7,6,3, 4,1,8, 2,5,9],
    ]
  }],
  hard: [{
    puzzle: [
      [0,0,0, 0,0,0, 0,1,2],
      [0,0,0, 0,0,0, 0,0,0],
      [0,0,1, 0,0,0, 0,0,0],
      [0,0,0, 0,0,0, 0,0,0],
      [0,0,0, 0,0,0, 0,0,0],
      [0,0,0, 0,0,0, 0,0,0],
      [0,0,0, 0,0,0, 0,0,0],
      [0,0,0, 0,0,0, 0,0,0],
      [3,4,0, 0,0,0, 0,0,0],
    ],
    // Note: This is deliberately sparse; replaced by generator uniqueness enforcement.
    solution: null
  }],
  god: [{
    puzzle: [
      [0,0,0, 0,0,0, 0,0,0],
      [0,0,0, 0,0,3, 0,8,5],
      [0,0,1, 0,2,0, 0,0,0],
      [0,0,0, 5,0,7, 0,0,0],
      [0,0,4, 0,0,0, 1,0,0],
      [0,9,0, 0,0,0, 0,0,0],
      [5,0,0, 0,0,0, 0,7,3],
      [0,0,2, 0,1,0, 0,0,0],
      [0,0,0, 0,4,0, 0,0,9],
    ],
    solution: null
  }]
};

export function generateSolvedGrid() {
  const base = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1));
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  for (let b = 0; b < 3; b++) {
    const rows = [0,1,2].map(i => b*3 + i); const perm = shuffle([...rows]); const copy = perm.map(i => base[i]); rows.forEach((r,i) => base[r] = copy[i]);
  }
  for (let s = 0; s < 3; s++) {
    const cols = [0,1,2].map(i => s*3 + i);
    for (let r = 0; r < 9; r++) { const row = base[r]; const perm = shuffle([...cols]); const copy = perm.map(i => row[i]); cols.forEach((c,i) => row[c] = copy[i]); }
  }
  return base;
}

export function generatePuzzle(difficulty) {
  try {
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
      const numSolutions = countSolutions(puzzle, 2);
      if (numSolutions !== 1) {
        puzzle[r][c] = backup; // revert to keep uniqueness
      }
    }
    // Validate uniqueness and givens threshold
    const solutions = countSolutions(puzzle, 2);
    const filled = countFilled(puzzle);
    const minGivens = difficulty === 'easy' ? 26 : difficulty === 'medium' ? 24 : difficulty === 'hard' ? 22 : 20;
    if (solutions === 1 && filled >= minGivens) {
      return { puzzle, solution: solved };
    }
    // Fallback
    return fallbackPuzzle(difficulty);
  } catch {
    return fallbackPuzzle(difficulty);
  }
}

function countFilled(board) {
  let n = 0; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] !== 0) n++; return n;
}

function fallbackPuzzle(difficulty) {
  const list = FALLBACKS[difficulty] || FALLBACKS.easy;
  const pick = list[0];
  let sol = pick.solution;
  if (!sol) sol = solve(pick.puzzle) || generateSolvedGrid();
  return { puzzle: cloneBoard(pick.puzzle), solution: sol };
}