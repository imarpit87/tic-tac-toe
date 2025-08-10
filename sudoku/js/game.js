import { cloneBoard, computeCandidates, findConflicts, isValidPlacement, isSolved } from './board.js';
import { generatePuzzle } from './generator.js';
import { logicalHint } from './solver.js';
import { saveState, loadState, clearState } from './storage.js';

export class SudokuGame {
  constructor(onUpdate) {
    this.onUpdate = onUpdate; // called after any state change
    this.reset();
  }

  reset() {
    this.board = Array.from({ length: 9 }, () => Array(9).fill(0));
    this.fixed = Array.from({ length: 9 }, () => Array(9).fill(false));
    this.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    this.autoNotes = true;
    this.notesMode = false;
    this.undoStack = [];
    this.redoStack = [];
    this.startedAt = 0; // timestamp
    this.elapsedMs = 0;
    this.player = { name: '', avatar: '🧑' };
    this.difficulty = 'easy';
    this.solution = null;
    this.selected = null; // { r, c }
    this.theme = 'light';
  }

  newGame({ name, avatar, difficulty, theme }) {
    this.reset();
    this.player.name = name || '';
    this.player.avatar = avatar || '🧑';
    this.difficulty = difficulty || 'easy';
    this.theme = theme || this.theme;
    const { puzzle, solution } = generatePuzzle(this.difficulty);
    this.board = puzzle;
    this.solution = solution;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) this.fixed[r][c] = this.board[r][c] !== 0;
    this.startedAt = Date.now();
    this.elapsedMs = 0;
    this.commitState('New game');
  }

  continueLast() {
    const s = loadState();
    if (!s) return false;
    this.reset();
    Object.assign(this, {
      board: s.board,
      fixed: s.fixed,
      notes: s.notes.map(row => row.map(setArr => new Set(setArr))),
      autoNotes: s.autoNotes,
      notesMode: s.notesMode,
      undoStack: s.undoStack || [],
      redoStack: s.redoStack || [],
      startedAt: s.startedAt || Date.now(),
      elapsedMs: s.elapsedMs || 0,
      player: s.player || { name: '', avatar: '🧑' },
      difficulty: s.difficulty || 'easy',
      solution: s.solution || null,
      selected: s.selected || null,
      theme: s.theme || 'light',
    });
    this.onUpdate('Loaded saved game');
    return true;
  }

  commitState(actionLabel) {
    const snapshot = this.snapshot();
    this.undoStack.push(snapshot);
    this.redoStack = [];
    this.persist('Game saved');
    this.onUpdate(actionLabel);
  }

  snapshot() {
    return {
      board: this.board.map(r => [...r]),
      fixed: this.fixed.map(r => [...r]),
      notes: this.notes.map(row => row.map(set => [...set])),
      autoNotes: this.autoNotes,
      notesMode: this.notesMode,
      startedAt: this.startedAt,
      elapsedMs: this.elapsedMs,
      player: { ...this.player },
      difficulty: this.difficulty,
      solution: this.solution ? this.solution.map(r => [...r]) : null,
      selected: this.selected ? { ...this.selected } : null,
      theme: this.theme,
    };
  }

  persist(message) {
    saveState(this.snapshot());
    this.onUpdate(message || 'Saved');
  }

  selectCell(r, c) {
    if (r < 0 || c < 0) { this.selected = null; this.onUpdate('Cell unselected'); return; }
    this.selected = { r, c };
    this.onUpdate('Cell selected');
  }

  placeNumber(r, c, val) {
    if (this.fixed[r][c]) return false;
    const prev = this.board[r][c];
    if (this.notesMode) {
      if (val === 0) return false;
      if (this.notes[r][c].has(val)) this.notes[r][c].delete(val); else this.notes[r][c].add(val);
      this.commitState('Notes updated');
      return true;
    }
    if (prev === val) return false;
    if (!isValidPlacement(this.board, r, c, val) && val !== 0) {
      // reject invalid without changing state
      this.onUpdate('Invalid move');
      return false;
    }
    this.board[r][c] = val;
    if (this.autoNotes && val !== 0) this.removeNoteFromPeers(r, c, val);
    this.commitState(val === 0 ? 'Cleared' : 'Number placed');
    return true;
  }

  isReadonly(r, c) { return this.fixed[r][c]; }

  removeNoteFromPeers(r, c, val) {
    for (let rr = 0; rr < 9; rr++) if (rr !== r) this.notes[rr][c].delete(val);
    for (let cc = 0; cc < 9; cc++) if (cc !== c) this.notes[r][cc].delete(val);
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) if (rr !== r || cc !== c) this.notes[rr][cc].delete(val);
  }

  toggleNotesMode() {
    this.notesMode = !this.notesMode;
    this.onUpdate(this.notesMode ? 'Notes mode on' : 'Notes mode off');
  }

  toggleAutoNotes() {
    this.autoNotes = !this.autoNotes;
    this.onUpdate('Auto Notes ' + (this.autoNotes ? 'on' : 'off'));
  }

  hint() {
    const h = logicalHint(this.board);
    if (!h) { this.onUpdate('No logical hint available right now—try another area'); return null; }
    this.board[h.r][h.c] = h.val;
    if (this.autoNotes) this.removeNoteFromPeers(h.r, h.c, h.val);
    this.commitState('Hint applied');
    return h;
  }

  undo() {
    if (this.undoStack.length <= 1) return false;
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.loadFromSnapshot(prev);
    this.onUpdate('Undone');
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const snap = this.redoStack.pop();
    this.undoStack.push(snap);
    this.loadFromSnapshot(snap);
    this.onUpdate('Redone');
    return true;
  }

  loadFromSnapshot(s) {
    this.board = s.board.map(r => [...r]);
    this.fixed = s.fixed.map(r => [...r]);
    this.notes = s.notes.map(row => row.map(arr => new Set(arr)));
    this.autoNotes = s.autoNotes;
    this.notesMode = s.notesMode;
    this.startedAt = s.startedAt;
    this.elapsedMs = s.elapsedMs;
    this.player = { ...s.player };
    this.difficulty = s.difficulty;
    this.solution = s.solution ? s.solution.map(r => [...r]) : null;
    this.selected = s.selected ? { ...s.selected } : null;
    this.theme = s.theme || 'light';
  }

  tick(nowMs) {
    if (this.startedAt) this.elapsedMs = nowMs - this.startedAt;
  }

  solved() { return isSolved(this.board); }
}