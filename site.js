const routes=['CV','OBJ','PUB','SVC','CONTACT'];
function route(){const id=location.hash.slice(1).toUpperCase();if(routes.includes(id)){if(id!=='CONTACT')window.archive3D.setProgress(1);window.archive3D.select(id);}else if(window.archive3D.state().selected)window.archive3D.close();}
document.querySelectorAll('[data-route]').forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.route.toLowerCase();if(window.archive3D.state().selected===b.dataset.route)route();}));
document.querySelectorAll('.section-nav a').forEach(a=>a.addEventListener('click',e=>{if(a.hash===location.hash){e.preventDefault();route();}}));
addEventListener('hashchange',route);
document.querySelectorAll('details.film').forEach(d=>d.addEventListener('toggle',()=>{if(!d.open)d.querySelector('video').pause();}));
// Navigation selects a room; scrolling within one never changes the route.
const panel=document.querySelector('#panel');
document.addEventListener('archive:entered',e=>{document.body.classList.toggle('work-view',['OBJ','PUB'].includes(e.detail));document.querySelectorAll('.section-nav a').forEach(a=>{if(a.hash==='#'+e.detail.toLowerCase())a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});});
new MutationObserver(()=>{if(!panel.classList.contains('open')){document.body.classList.remove('work-view');Object.values(window.archiveGalleries||{}).forEach(g=>g.close({focus:false}));}}).observe(panel,{attributes:true,attributeFilter:['class']});
panel.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusable=[...panel.querySelectorAll('a[href],button,summary,video[controls],[tabindex="0"],[contenteditable="true"]')].filter(n=>n.getClientRects().length&&!n.closest('[inert]')&&!n.disabled);const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}});
document.addEventListener('html:before-export',e=>{const clone=e.detail.clone;clone.querySelector('#labels').replaceChildren();clone.querySelector('#leaders').replaceChildren();clone.querySelector('#probeNodes').replaceChildren();clone.querySelector('#probeHud').classList.remove('on');clone.querySelector('#probeLinks').setAttribute('d','');clone.querySelector('#panel').classList.remove('open');clone.querySelector('#panel').setAttribute('inert','');clone.querySelector('body').classList.remove('reading');clone.querySelector('#hoverCaption').classList.remove('on');});
route();
if(new URLSearchParams(location.search).get('edit')==='1')window.HtmlTools?.setActive(true);

// Report errors without removing the source or blocking direct original-paper links.
for(const v of document.querySelectorAll('video')){
 v.addEventListener('error',()=>{const section=v.closest('section');if(!section||section.querySelector('.video-error'))return;const msg=document.createElement('p');msg.className='video-error';msg.textContent='Video could not be played here. Use the direct video link below, or check that the MP4 is present in assets/content.';v.after(msg);});
}
