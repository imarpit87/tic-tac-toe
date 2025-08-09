export function getBestMoveMinimax(board, aiPlayer) {
  const human = aiPlayer === 'X' ? 'O' : 'X';

  function checkWinner(b) {
    const wins = [ [0,1,2],[3,4,5],[6,7,8], [0,3,6],[1,4,7],[2,5,8], [0,4,8],[2,4,6] ];
    for (const [a,b1,c] of wins) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    if (b.every(v => v)) return 'draw';
    return null;
  }

  function minimax(b, player) {
    const winner = checkWinner(b);
    if (winner === aiPlayer) return { score: 10 };
    if (winner === human) return { score: -10 };
    if (winner === 'draw') return { score: 0 };

    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = player;
        const { score } = minimax(b, player === aiPlayer ? human : aiPlayer);
        moves.push({ index: i, score });
        b[i] = '';
      }
    }

    if (player === aiPlayer) {
      let best = -Infinity, bestMove = null;
      for (const m of moves) if (m.score > best) { best = m.score; bestMove = m; }
      return bestMove;
    } else {
      let best = Infinity, bestMove = null;
      for (const m of moves) if (m.score < best) { best = m.score; bestMove = m; }
      return bestMove;
    }
  }

  const move = minimax([...board], aiPlayer);
  return move ? move.index : -1;
}

export function getBestMove(board, difficulty, aiPlayer) {
  const empty = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  if (empty.length === 0) return -1;

  let optimalChance = 0.8;
  if (difficulty === 'easy') optimalChance = 0.35;
  else if (difficulty === 'medium') optimalChance = 0.7;
  else if (difficulty === 'hard') optimalChance = 1.0;

  if (Math.random() > optimalChance) {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  return getBestMoveMinimax(board, aiPlayer);
}