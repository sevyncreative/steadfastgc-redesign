const menuButton=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){navigation.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.querySelector('span').textContent='＋'}
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';menuButton.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open);menuButton.querySelector('span').textContent=open?'−':'＋'});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeMenu();document.querySelectorAll('details[open]').forEach(d=>d.open=false)}});
document.addEventListener('click',event=>{document.querySelectorAll('.nav-services[open]').forEach(d=>{if(!d.contains(event.target))d.open=false})});
window.addEventListener('message',event=>{document.querySelectorAll('.gallery-embed').forEach(frame=>{if(event.source!==frame.contentWindow)return;const height=event.data?.embedHeight;if(typeof height==='number'&&Number.isFinite(height)&&height>200)frame.style.height=Math.min(height,20000)+'px'})});

const heroVideo=document.querySelector('.hero-video');
if(heroVideo){
 const words=[...document.querySelectorAll('.hero-word')];
 const cycle=document.querySelector('.hero-cycle');
 const reel=document.createElement('span');
 reel.className='hero-reel';
 // Invisible copies reserve the tallest phrase at every screen width.
 words.forEach(word=>{
  const sizer=document.createElement('span');
  sizer.className='hero-sizer';
  sizer.textContent=word.textContent;
  cycle.append(sizer);
  word.classList.remove('is-active');
  reel.append(word);
 });
 reel.append(words[0].cloneNode(true));
 cycle.append(reel);
 const toggle=document.querySelector('.hero-motion');
 const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let activeWord=0,paused=reduceMotion.matches||Boolean(navigator.connection?.saveData),timer;
 let mediaReady=false,heroVisible=true;
 function loadVideo(){const source=heroVideo.querySelector('source[data-src]');if(source){source.src=source.dataset.src;source.removeAttribute('data-src');heroVideo.load()}}
 function settleReel(){
  reel.classList.add('is-resetting');
  activeWord%=words.length;
  reel.style.transform=`translateY(-${activeWord*100}%)`;
  void reel.offsetHeight;
  reel.classList.remove('is-resetting');
 }
 reel.addEventListener('transitionend',event=>{
  if(event.target===reel&&event.propertyName==='transform'&&activeWord===words.length)settleReel();
 });
 function syncHeroMotion(){
  clearInterval(timer);
  toggle.setAttribute('aria-label',paused?'Play hero animation':'Pause hero animation');
  toggle.innerHTML=paused?'Play animation <span aria-hidden="true">▶</span>':'Pause animation <span aria-hidden="true">Ⅱ</span>';
  if(paused||document.hidden||!heroVisible||!mediaReady){heroVideo.pause();settleReel();return}
  loadVideo();
  heroVideo.play().catch(()=>{});
  timer=setInterval(()=>{
   if(activeWord===words.length)settleReel();
   activeWord++;
   reel.style.transform=`translateY(-${activeWord*100}%)`;
  },3400);
 }
 toggle.addEventListener('click',()=>{paused=!paused;mediaReady=true;syncHeroMotion()});
 reduceMotion.addEventListener('change',event=>{paused=event.matches;syncHeroMotion()});
 document.addEventListener('visibilitychange',syncHeroMotion);
 if('IntersectionObserver' in window){new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;syncHeroMotion()}).observe(heroVideo)}
 const begin=()=>{const ready=()=>{mediaReady=true;syncHeroMotion()};if('requestIdleCallback' in window)requestIdleCallback(ready,{timeout:1500});else setTimeout(ready,100)};
 if(document.readyState==='complete')begin();else window.addEventListener('load',begin,{once:true});
 syncHeroMotion();
}
