(() => {
'use strict';
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !motion.matches) {
 const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if(entry.isIntersecting){entry.target.classList.remove('is-awaiting');observer.unobserve(entry.target)}
 }), {threshold:0.06});
 revealItems.forEach(item => {item.classList.add('is-awaiting');observer.observe(item)});
 motion.addEventListener('change', () => {if(motion.matches){revealItems.forEach(item=>item.classList.remove('is-awaiting'));observer.disconnect()}});
}
const experience = document.querySelector('.energy-experience');
if(experience) {
 const products = {
  solar:{category:'Generate / Solar',name:'Solar Roof',image:'/assets/tesla-solar.jpg',description:'Roofing and solar generation in one surface. Explore a roof that produces electricity for your home.',link:'/tesla-energy/tesla-solar-roof'},
  battery:{category:'Store / Battery',name:'Powerwall 3',image:'/assets/tesla-powerwall-product.png',description:'Store energy for use later, including backup power during an outage. Explore how Powerwall can fit into your home energy setup.',link:'/tesla-energy/tesla-powerwall-3'},
  charger:{category:'Charge / Electric vehicle',name:'Wall Connector',image:'/assets/tesla-wall-connector.jpg',description:'Charge where you park. Explore a dedicated home charging installation with Tesla Wall Connector.',link:'/tesla-energy/tesla-wall-connector'}
 };
 const controls = [...experience.querySelectorAll('[data-product]')];
 function selectProduct(key) {
  const product = products[key]; if(!product) return;
  experience.dataset.energy = key;
  controls.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.product===key)));
  experience.querySelector('.energy-category').textContent=product.category;
  experience.querySelector('.energy-name').textContent=product.name;
  const image=experience.querySelector('.energy-product');
  image.classList.remove('is-changing');
  image.removeAttribute('srcset');image.removeAttribute('sizes');image.src=product.image;image.alt='Tesla '+product.name;
  if(!motion.matches){void image.offsetWidth;image.classList.add('is-changing')}
  image.style.objectFit=key==='battery'?'contain':'cover';
  experience.querySelector('.energy-description').textContent=product.description;
  const link=experience.querySelector('.energy-link');
  link.href=product.link;
  link.replaceChildren(document.createTextNode('Explore '+product.name+' '));
  const arrow=document.createElement('span');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');link.append(arrow);
 }
 controls.forEach(button=>button.addEventListener('click',()=>selectProduct(button.dataset.product)));
 const dayToggle=experience.querySelector('.day-toggle');
 function updateSceneStatus(){
  const night=experience.dataset.time==='night';
  const key=experience.dataset.energy;
  const labels={solar:'Daylight / Solar generation',battery:'Energy storage / Powerwall',charger:'Home charging / Wall Connector'};
  experience.querySelector('.scene-state').textContent=night?'Night / Stored energy':labels[key];
 }
 controls.forEach(button=>button.addEventListener('click',updateSceneStatus));
 dayToggle.addEventListener('click',()=>{
  const night=experience.dataset.time!=='night';
  experience.dataset.time=night?'night':'day';
  dayToggle.setAttribute('aria-pressed',String(night));
  dayToggle.textContent=night?'Day view ☀':'Night view ◐';
  updateSceneStatus();
 });
}
const motionButton=document.querySelector('.hero-motion');
function syncMotion(){document.documentElement.classList.toggle('motion-paused',motion.matches||motionButton?.getAttribute('aria-label')==='Play hero animation')}
if(motionButton)new MutationObserver(syncMotion).observe(motionButton,{attributes:true,attributeFilter:['aria-label']});
motion.addEventListener('change',syncMotion);syncMotion();
})();

/* The embedded provider is cross-origin: load indicates document arrival,
   not that its application has finished. Keep the fallback available. */
(() => {
 const frame=document.querySelector('[data-estimator-frame]');
 const status=document.querySelector('.estimator-status');
 if(!frame||!status)return;
 let timer;
 let loaded=false;
 const settle=()=>{loaded=true;clearTimeout(timer);status.textContent='Use the calculator below, or open it in a new tab.'};
 frame.addEventListener('load',settle,{once:true});
 const start=()=>{if(loaded)return;timer=setTimeout(()=>{status.textContent='The calculator is taking longer to load. You can open it in a new tab below.'},15000)};
 if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){start();observer.disconnect()}
  },{rootMargin:'200px'});
  observer.observe(frame);
 }else start();
})();
