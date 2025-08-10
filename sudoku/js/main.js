const nameEl=document.getElementById('playerName');
const nameHelp=document.getElementById('nameHelp');
const form=document.getElementById('startForm');
const continueLink=document.getElementById('continueLink');
const avatarPicker=document.getElementById('avatarPicker');
const diffPicker=document.getElementById('difficultyPicker');

function validate(){ const ok=!!nameEl.value.trim(); nameHelp.hidden=ok; return ok; }
nameEl.addEventListener('input', validate);

let selectedAvatar=null; avatarPicker?.addEventListener('click', (e)=>{ const b=e.target.closest('button.avatar'); if(!b) return; avatarPicker.querySelectorAll('.avatar').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); selectedAvatar=b.dataset.avatar||null; });
let selectedDifficulty='easy'; diffPicker?.addEventListener('click',(e)=>{ const b=e.target.closest('.pill'); if(!b) return; diffPicker.querySelectorAll('.pill').forEach(x=>x.classList.remove('active')); b.classList.add('active'); selectedDifficulty=b.dataset.diff; });

try{ const saved=localStorage.getItem('sudoka:save'); if(saved) continueLink.hidden=false; }catch{}
continueLink?.addEventListener('click',(e)=>{ e.preventDefault(); localStorage.setItem('sudoka:continue','1'); location.href='play.html'; });

form.addEventListener('submit',(e)=>{
  e.preventDefault(); if(!validate()){ nameEl.focus(); return; }
  const setup={ name:nameEl.value.trim(), avatar:selectedAvatar, difficulty:selectedDifficulty, theme:'light' };
  try{ localStorage.setItem('sudoka:setup', JSON.stringify(setup)); }catch{}
  location.href='play.html';
});