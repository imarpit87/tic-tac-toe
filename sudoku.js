// Minimal Sudoku implementation for XO Duel UI
// Non-invasive: no changes to existing Tic Tac Toe logic

const sudokuSection = document.getElementById('sudokuSection');
const sudokuSetup = document.getElementById('sudokuSetup');
const sudokuPlay = document.getElementById('sudokuPlay');
const sudokuGridEl = document.getElementById('sudokuGrid');
const sudokuDifficulty = document.getElementById('sudokuDifficulty');
const sudokuStartBtn = document.getElementById('sudokuStartBtn');
const sudokuBackBtn = document.getElementById('sudokuBackBtn');
const sudokuBackBtn2 = document.getElementById('sudokuBackBtn2');
const sudokuHintBtn = document.getElementById('sudokuHintBtn');
const sudokuUndoBtn = document.getElementById('sudokuUndoBtn');

let sudokuBoard = []; // 9x9 array
let sudokuFixed = []; // boolean 9x9
let sudokuSelected = null; // {r,c}
let sudokuUndoStack = [];

function openSudoku() {
  document.getElementById('gameSetup').classList.add('hidden');
  document.getElementById('gamePlay').classList.remove('active');
  sudokuSection.classList.remove('hidden');
  sudokuSetup.classList.remove('hidden');
  sudokuPlay.classList.add('hidden');
}

function closeSudoku() {
  sudokuSection.classList.add('hidden');
  sudokuPlay.classList.add('hidden');
  sudokuSetup.classList.remove('hidden');
  document.getElementById('gameSetup').classList.remove('hidden');
}

window.openSudoku = openSudoku;

sudokuBackBtn?.addEventListener('click', closeSudoku);
sudokuBackBtn2?.addEventListener('click', closeSudoku);
sudokuStartBtn?.addEventListener('click', () => {
  startSudoku(sudokuDifficulty.value || 'easy');
});

sudokuHintBtn?.addEventListener('click', () => {
  const hint = findHint();
  if (!hint) return;
  applySudokuMove(hint.r, hint.c, hint.val);
});

sudokuUndoBtn?.addEventListener('click', () => {
  if (sudokuUndoStack.length === 0) return;
  const last = sudokuUndoStack.pop();
  sudokuBoard[last.r][last.c] = last.prev;
  renderSudoku();
});

function startSudoku(diff) {
  const { givens } = difficultyToParams(diff);
  const solved = generateSolvedGrid();
  sudokuBoard = JSON.parse(JSON.stringify(solved));
  sudokuFixed = Array.from({ length: 9 }, () => Array(9).fill(false));
  // Remove cells to match difficulty (givens means keep that many random cells)
  let cellsToRemove = 81 - Math.max(20, Math.min(80, givens));
  while (cellsToRemove > 0) {
    const r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
    if (sudokuBoard[r][c] !== 0) {
      sudokuBoard[r][c] = 0;
      cellsToRemove--;
    }
  }
  // Mark fixed
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (sudokuBoard[r][c] !== 0) sudokuFixed[r][c] = true;
    }
  }
  sudokuUndoStack = [];
  renderSudoku();
  sudokuSetup.classList.add('hidden');
  sudokuPlay.classList.remove('hidden');
}

function difficultyToParams(diff) {
  // Map percentages to approximate givens
  // Easy 30% → ~35 givens, Medium 60% → ~28 givens, Hard 90% → ~24, God 120% → ~22
  switch (diff) {
    case 'easy': return { givens: 35 };
    case 'medium': return { givens: 28 };
    case 'hard': return { givens: 24 };
    case 'god': return { givens: 22 };
    default: return { givens: 30 };
  }
}

function renderSudoku() {
  sudokuGridEl.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('button');
      cell.className = 'sudoku-cell';
      if (sudokuFixed[r][c]) cell.classList.add('fixed');
      if (sudokuSelected && sudokuSelected.r === r && sudokuSelected.c === c) cell.classList.add('selected');
      const val = sudokuBoard[r][c];
      cell.textContent = val === 0 ? '' : String(val);
      cell.setAttribute('data-r', r);
      cell.setAttribute('data-c', c);
      cell.addEventListener('click', () => onSudokuCellClick(r, c));
      sudokuGridEl.appendChild(cell);
    }
  }
  // Keyboard support
  sudokuGridEl.onkeydown = (e) => {
    if (!sudokuSelected) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 9) applySudokuMove(sudokuSelected.r, sudokuSelected.c, n);
    if (e.key === 'Backspace' || e.key === 'Delete') applySudokuMove(sudokuSelected.r, sudokuSelected.c, 0);
  };
}

function onSudokuCellClick(r, c) {
  if (sudokuFixed[r][c]) return;
  sudokuSelected = { r, c };
  renderSudoku();
}

function applySudokuMove(r, c, val) {
  if (sudokuFixed[r][c]) return;
  const prev = sudokuBoard[r][c];
  sudokuBoard[r][c] = val;
  sudokuUndoStack.push({ r, c, prev });
  renderSudoku();
}

// Simple generator: start from a known solved grid and shuffle rows/cols/blocks
function generateSolvedGrid() {
  // Base pattern
  const base = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => ((r*3 + Math.floor(r/3) + c) % 9) + 1));
  // Shuffle helpers
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  // Shuffle rows within bands and columns within stacks
  for (let band = 0; band < 3; band++) {
    const rows = [0,1,2].map(i => band*3 + i);
    const perm = shuffle([...rows]);
    const temp = perm.map(i => base[i]);
    rows.forEach((r, i) => base[r] = temp[i]);
  }
  for (let stack = 0; stack < 3; stack++) {
    const cols = [0,1,2].map(i => stack*3 + i);
    for (let r = 0; r < 9; r++) {
      const row = base[r];
      const perm = shuffle([...cols]);
      const temp = perm.map(i => row[i]);
      cols.forEach((c, i) => row[c] = temp[i]);
    }
  }
  return base;
}