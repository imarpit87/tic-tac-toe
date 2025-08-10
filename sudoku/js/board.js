// Board utilities and rules

export function createEmptyBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function cloneBoard(board) {
  return board.map(row => [...row]);
}

export function getBoxIndex(r, c) {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3);
}

export function getPeers(r, c) {
  const peers = new Set();
  for (let i = 0; i < 9; i++) { if (i !== c) peers.add(`${r},${i}`); }
  for (let i = 0; i < 9; i++) { if (i !== r) peers.add(`${i},${c}`); }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if (rr === r && cc === c) continue;
      peers.add(`${rr},${cc}`);
    }
  }
  return [...peers].map(p => p.split(',').map(Number));
}

export function isValidPlacement(board, r, c, val) {
  if (val === 0) return true;
  for (let i = 0; i < 9; i++) { if (i !== c && board[r][i] === val) return false; }
  for (let i = 0; i < 9; i++) { if (i !== r && board[i][c] === val) return false; }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) { if ((rr !== r || cc !== c) && board[rr][cc] === val) return false; }
  }
  return true;
}

export function findConflicts(board, r, c) {
  const val = board[r][c];
  if (val === 0) return [];
  const conflicts = [];
  for (let i = 0; i < 9; i++) {
    if (i !== c && board[r][i] === val) conflicts.push([r, i]);
    if (i !== r && board[i][c] === val) conflicts.push([i, c]);
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++) {
    for (let cc = bc; cc < bc + 3; cc++) {
      if ((rr !== r || cc !== c) && board[rr][cc] === val) conflicts.push([rr, cc]);
    }
  }
  return conflicts;
}

export function computeCandidates(board) {
  const candidates = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      for (let v = 1; v <= 9; v++) {
        if (isValidPlacement(board, r, c, v)) candidates[r][c].add(v);
      }
    }
  }
  return candidates;
}

export function isSolved(board) {
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] === 0) return false;
  // Additionally ensure all placements are valid
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!isValidPlacement(board, r, c, board[r][c])) return false;
  return true;
}