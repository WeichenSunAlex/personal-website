// V12.5 — browse the original vertical gallery, then move the covers into a
// left-side index while the selected portfolio/research article scrolls on the right.
function initGallery(gallery){
 const stage=gallery.querySelector('.gallery-stage'), browse=gallery.querySelector('.gallery-browse');
 const projects=[...stage.querySelectorAll('.project')], covers=projects.map(p=>p.querySelector('.project-cover'));
 const details=gallery.querySelector('.case-layout'), reader=gallery.querySelector('.case-reader'), articles=[...reader.querySelectorAll('.case-article')], thumbs=[...details.querySelectorAll('.case-thumb')];
 const prev=gallery.querySelector('.gallery-prev'),next=gallery.querySelector('.gallery-next'),counter=gallery.querySelector('.gallery-counter'),hint=gallery.querySelector('.gallery-hint');
 const mobileLayout=matchMedia('(max-width: 700px), (hover: none) and (pointer: coarse) and (max-width: 1024px)');
 const scrollHost=()=>mobileLayout.matches?document.getElementById('content'):reader;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let index=0,position=0,drag=null,lastStep=0,wheel=0,blockedClick=false,raf=0,opened=false;
 const rail=details.querySelector('.case-thumbs');let railStep=0,railWheel=0;
 rail.tabIndex=0;rail.setAttribute('aria-label','Project carousel. Scroll or use arrow keys to select another project.');
 function layoutRail(){
  const mobile=mobileLayout.matches;
  if(mobile){thumbs.forEach(b=>{b.style.opacity="";b.style.visibility="";b.style.pointerEvents="";b.tabIndex=0;});return;}
  thumbs.forEach((b,j)=>{const d=j-index,dist=Math.abs(d),scale=dist===0?1:.72;
   b.style.setProperty('--rail-offset',`${d*(mobile?85:64)}%`);b.style.setProperty('--rail-scale',scale);
   b.style.opacity=dist===0?'1':dist===1?'.52':'0';b.style.visibility=dist>1?'hidden':'visible';b.style.pointerEvents=dist>1?'none':'auto';b.tabIndex=dist>1?-1:0;
  });
 }
 rail.addEventListener('wheel',e=>{if(!opened||mobileLayout.matches)return;e.preventDefault();e.stopPropagation();const now=performance.now();if(now-railStep<320)return;railWheel+=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;if(Math.abs(railWheel)>28){select(index+Math.sign(railWheel));railStep=now;railWheel=0;}},{passive:false});
 rail.addEventListener('keydown',e=>{if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();select(e.key==='Home'?0:e.key==='End'?projects.length-1:index+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1));}});
 new ResizeObserver(layoutRail).observe(rail);
 function layout(){
  if(mobileLayout.matches){covers.forEach(c=>{c.style.transform="";c.style.opacity="";c.style.zIndex="";c.style.visibility="";c.style.pointerEvents="";});return;}
  const box=stage.getBoundingClientRect();if(!box.height||opened)return;
  const mobile=innerWidth<701,base=covers[0].offsetHeight,gap=base*(mobile?.72:.83);
  covers.forEach((c,i)=>{const d=i-position,dist=Math.abs(d),scale=1-Math.min(dist,1)*.35;c.style.transform=`translate(-50%,-50%) translateY(${d*gap}px) scale(${scale})`;c.style.opacity=String(Math.max(0,1-dist*.40));c.style.zIndex=String(i===index?3:Math.max(0,2-Math.round(dist)));c.style.visibility=dist>1.65?'hidden':'visible';c.style.pointerEvents=dist>1.65?'none':'auto';});
 }
 function animate(){raf=0;if(opened)return;position=reduced?index:position+(index-position)*.16;if(Math.abs(index-position)<.002)position=index;layout();if(position!==index)raf=requestAnimationFrame(animate);}
 function schedule(){if(!raf&&!opened)raf=requestAnimationFrame(animate);}
 function select(i,{scroll=true}={}){
  const old=index;index=Math.max(0,Math.min(projects.length-1,i));
  projects.forEach((p,j)=>{p.classList.toggle('active',j===index);p.querySelector('.project-info').inert=!mobileLayout.matches&&j!==index;covers[j].setAttribute('aria-label',(mobileLayout.matches||j===index?'Open ':'Select ')+p.querySelector('h3').textContent);covers[j].setAttribute('aria-pressed',String(j===index));});
  thumbs.forEach((b,j)=>{b.classList.toggle('active',j===index);if(j===index)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');});
  articles.forEach((a,j)=>{a.hidden=j!==index;if(j!==index)a.querySelectorAll('video').forEach(v=>v.pause());else if(opened){// Keep full-size page images lazy; only the browser's near-viewport loader requests them.
  a.querySelectorAll('video').forEach(v=>{if(v.error)v.load();});}});
  counter.textContent=String(index+1).padStart(2,'0')+' / '+String(projects.length).padStart(2,'0');prev.disabled=index===0;next.disabled=index===projects.length-1;
  if(opened){if(scroll&&old!==index)scrollHost().scrollTop=0;layoutRail();}
  else schedule();
 }
 function open(i=index){opened=true;gallery.classList.add('case-open');gallery.closest('.archive-room').classList.add('case-mode');browse.hidden=true;details.hidden=false;hint.textContent='SCROLL TO READ · SELECT ANOTHER ITEM ON THE LEFT';select(i);scrollHost().scrollTop=0;if(!mobileLayout.matches)reader.focus({preventScroll:true});}
 function close({focus=true}={}){if(!opened)return;opened=false;articles.forEach(a=>a.querySelectorAll('video').forEach(v=>v.pause()));gallery.classList.remove('case-open');gallery.closest('.archive-room').classList.remove('case-mode');details.hidden=true;browse.hidden=false;hint.textContent='SCROLL OR DRAG TO EXPLORE';position=index;select(index);if(focus){if(mobileLayout.matches){requestAnimationFrame(()=>{const host=scrollHost();host.scrollTop+=covers[index].getBoundingClientRect().top-host.getBoundingClientRect().top-178;});}else covers[index].focus({preventScroll:true});}}
 prev.onclick=()=>select(index-1);next.onclick=()=>select(index+1);
 covers.forEach((c,i)=>c.addEventListener('click',e=>{if(blockedClick){e.preventDefault();return;}if(mobileLayout.matches)open(i);else if(index!==i)select(i);else open(i);}));
 projects.forEach((p,i)=>p.querySelector('.open-case').onclick=()=>open(i));thumbs.forEach((b,i)=>b.onclick=()=>open(i));details.querySelector('.case-back').onclick=()=>close();
 details.addEventListener('click',e=>{const jump=e.target.closest('[data-case-jump]');if(jump){e.preventDefault();document.getElementById(jump.dataset.caseJump)?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});}});
 details.querySelectorAll('.page-jump select').forEach(el=>el.addEventListener('change',()=>{const target=document.getElementById(el.value);if(target){const host=scrollHost();host.scrollTo({top:host.scrollTop+target.getBoundingClientRect().top-host.getBoundingClientRect().top-(mobileLayout.matches?178:8),behavior:'instant'});}}));
 gallery.addEventListener('wheel',e=>{if(mobileLayout.matches||opened||e.target.closest('video,details,.project-info'))return;e.preventDefault();const now=performance.now();if(now-lastStep<350)return;wheel+=e.deltaY;if(Math.abs(wheel)>36){select(index+Math.sign(wheel));lastStep=now;wheel=0;}},{passive:false});
 gallery.addEventListener('keydown',e=>{if(opened){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}return;}if(e.target.closest('video,details'))return;if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();select(e.key==='Home'?0:e.key==='End'?projects.length-1:index+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1));}});
 stage.addEventListener('pointerdown',e=>{if(mobileLayout.matches||e.target.closest('.project-info')||e.button!==0)return;drag={y:e.clientY,x:e.clientX,id:e.pointerId};blockedClick=false;stage.classList.add('dragging');});
 stage.addEventListener('pointermove',e=>{if(drag&&Math.hypot(e.clientY-drag.y,e.clientX-drag.x)>8){blockedClick=true;stage.setPointerCapture(e.pointerId);}});
 stage.addEventListener('pointerup',e=>{if(!drag)return;const dy=drag.y-e.clientY,dx=drag.x-e.clientX;if(Math.max(Math.abs(dx),Math.abs(dy))>45)select(index+Math.sign(Math.abs(dy)>Math.abs(dx)?dy:dx));if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);drag=null;stage.classList.remove('dragging');setTimeout(()=>blockedClick=false,0);});
 stage.addEventListener('pointercancel',()=>{drag=null;blockedClick=false;stage.classList.remove('dragging');});
 mobileLayout.addEventListener("change",()=>{select(index,{scroll:false});layoutRail();layout();});
 new ResizeObserver(schedule).observe(stage);document.addEventListener('archive:entered',e=>{if(gallery.closest('.content-section').id==='section-'+e.detail.toLowerCase())schedule();else close({focus:false});});
 document.addEventListener('html:before-export',e=>{const c=e.detail.clone;c.querySelectorAll('.gallery-stage.dragging').forEach(n=>n.classList.remove('dragging'));c.querySelectorAll('.project-cover').forEach(n=>n.removeAttribute('style'));c.querySelectorAll('.project-info').forEach(n=>n.removeAttribute('inert'));c.querySelector('body').classList.remove('work-view');});
 select(0);layoutRail();return {select,open,close,state:()=>({index,position,opened,webgl:false})};
}
window.archiveGalleries=Object.fromEntries([...document.querySelectorAll('.project-gallery')].map(g=>[g.closest('.content-section').id,initGallery(g)]));window.archiveGallery=window.archiveGalleries['section-obj'];
