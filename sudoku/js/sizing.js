// sizing.js – run after DOM ready
(function() {
  const page = document.querySelector('.sudoku-page');
  const header = document.querySelector('.sudoku-header');
  const board = document.querySelector('#sudoku-grid');
  const actions = document.querySelector('.action-row');
  const keypad = document.querySelector('.keypad');

  function fitBoard() {
    if (!page || !board) return;
    
    const svh = window.innerHeight;       // dynamic viewport px
    const top = header?.offsetHeight || 0;
    const act = actions?.offsetHeight || 0;
    const pad = keypad?.offsetHeight || 0;
    const gaps = 3 * 8 + 16;              // rows gaps + page padding approx
    const availH = svh - top - act - pad - gaps;

    const availW = page.clientWidth - 16; // page padding
    const size = Math.max(320, Math.min(availH, availW)); // never below 320
    board.style.width = size + 'px';
    board.style.height = size + 'px';
  }

  window.addEventListener('resize', fitBoard);
  window.addEventListener('orientationchange', fitBoard);
  setTimeout(fitBoard, 0);
})();
