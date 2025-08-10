import { loadState } from './storage.js';

// Start elements
const startGameBtn = document.getElementById('startGameBtn');
const continueLink = document.getElementById('continueLink');
const playerNameInput = document.getElementById('playerName');
const avatarPicker = document.getElementById('avatarPicker');
const difficultyGroup = document.getElementById('difficultyGroup');
const themeGroup = document.getElementById('themeGroup');

let selectedAvatar = null;
let selectedDifficulty = 'easy';
let selectedTheme = 'light';

function setTheme(theme) { document.documentElement.setAttribute('data-theme', theme); selectedTheme = theme; }

(() => { const saved = loadState(); if (saved?.theme) setTheme(saved.theme); })();

// Continue link only if a saved game exists
const hasSave = !!loadState();
if (!hasSave && continueLink) continueLink.style.display = 'none';
continueLink?.addEventListener('click', (e) => { e.preventDefault(); localStorage.setItem('sudoka:continue', '1'); location.href = '/sudoku/play.html'; });

startGameBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  const setup = { name: name || '', avatar: selectedAvatar || null, difficulty: selectedDifficulty, theme: selectedTheme };
  localStorage.setItem('sudoka:setup', JSON.stringify(setup));
  location.href = '/sudoku/play.html';
});

avatarPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('.avatar-option'); if (!btn) return;
  [...avatarPicker.querySelectorAll('.avatar-option')].forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedAvatar = btn.getAttribute('data-avatar');
});

difficultyGroup.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill'); if (!pill) return;
  [...difficultyGroup.querySelectorAll('.pill')].forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  selectedDifficulty = pill.getAttribute('data-diff') || 'easy';
});

themeGroup.addEventListener('click', (e) => {
  const pill = e.target.closest('.pill'); if (!pill) return;
  [...themeGroup.querySelectorAll('.pill')].forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  setTheme(pill.getAttribute('data-theme') || 'light');
});