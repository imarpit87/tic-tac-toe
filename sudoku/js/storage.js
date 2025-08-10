// Simple storage wrapper for Sudoku state
const STORAGE_KEY = 'sudoku_v1';

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}