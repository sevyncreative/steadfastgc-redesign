const menuButton=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){navigation.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.querySelector('span').textContent='＋'}
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open);menuButton.querySelector('span').textContent=open?'−':'＋'});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();document.querySelectorAll('details[open]').forEach(d=>d.open=false)}});
document.addEventListener('click',event=>{document.querySelectorAll('.nav-services[open]').forEach(d=>{if(!d.contains(event.target))d.open=false})});
window.addEventListener('message',event=>{document.querySelectorAll('.gallery-embed').forEach(frame=>{if(event.source!==frame.contentWindow)return;const height=event.data?.embedHeight;if(typeof height==='number'&&Number.isFinite(height)&&height>200)frame.style.height=Math.min(height,20000)+'px'})});
