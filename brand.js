const brand=document.querySelector('#home');
let copy=brand?.querySelector('.brand-copy');
if(brand&&!copy){brand.textContent='';copy=document.createElement('span');copy.className='brand-copy';brand.append(copy);}
let layer=brand?.querySelector('.brand-mosaic');
if(brand&&!layer){layer=document.createElement('span');layer.className='brand-mosaic';layer.setAttribute('aria-hidden','true');layer.dataset.runtimeGenerated='';brand.append(layer);}
const words=['WEICHEN SUN','2D & 3D DESIGNER','HCI & AI RESEARCHER'];
let idx=0,busy=false;
if(brand&&copy&&layer){brand.setAttribute('aria-label','Weichen Sun — home');copy.textContent=words[0];
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 Array.from({length:72},(_,i)=>{const p=document.createElement('i');p.style.setProperty('--delay',`${(i*17)%110}ms`);layer.append(p);return p;});
 document.addEventListener("archive:entered",()=>{copy.textContent=words[0];idx=0;});
 setInterval(()=>{if(document.hidden||document.body.classList.contains('reading')||document.body.classList.contains('editing')||busy)return;busy=true;brand.classList.add('pixel-switch');setTimeout(()=>{if(!document.body.classList.contains("reading")){idx=(idx+1)%words.length;copy.textContent=words[idx];}},215);setTimeout(()=>{brand.classList.remove('pixel-switch');busy=false;},440);},3000);
 }
}
