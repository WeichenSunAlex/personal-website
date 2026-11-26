import * as THREE from 'three';
export const CONCRETE={name:'V12 Studio / mineral concrete',roughness:1,metalness:0,exposure:1.04};
const textures={};
export function loadConcreteTextures(renderer,onChange){
 const loader=new THREE.TextureLoader();
 const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 for(const [key,file,color] of [['map','albedo.webp',true],['bumpMap','bump.webp',false],['roughnessMap','roughness.webp',false]]){
  const tex=loader.load('./assets/concrete/'+file,()=>onChange?.(),undefined,e=>console.warn('Concrete texture failed:',file,e));
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=maxAniso;tex.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;textures[key]=tex;
 }
}
export function createConcreteMaterial(){
 return new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:0,roughness:1,envMapIntensity:.64,bumpScale:.009,...textures});
}
function decode(s,Type){return new Type(Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer);}
export function flatGeometry(m){
 const d=m.concrete,g=new THREE.BufferGeometry();const v=Float32Array.from(decode(d.v,Int16Array),x=>x/24000),n=Float32Array.from(decode(d.n,Int8Array),x=>x/127),f=decode(d.f,Uint16Array),fracture=decode(d.d,Uint8Array);
 // Face-projected UVs. Split triangle corners so each face can select a projection independently.
 const pos=new Float32Array(f.length*3),norm=new Float32Array(f.length*3),col=new Float32Array(f.length*3),uv=new Float32Array(f.length*2);const scale=2.6;
 for(let k=0;k<f.length;k+=3){
  const a=f[k]*3,b=f[k+1]*3,c=f[k+2]*3;
  const ax=v[b]-v[a],ay=v[b+1]-v[a+1],az=v[b+2]-v[a+2],bx=v[c]-v[a],by=v[c+1]-v[a+1],bz=v[c+2]-v[a+2];
  const x=Math.abs(ay*bz-az*by),y=Math.abs(az*bx-ax*bz),z=Math.abs(ax*by-ay*bx);const axes=x>=y&&x>=z?[1,2]:y>=z?[0,2]:[0,1];
  for(let j=k;j<k+3;j++){const i=f[j],o=i*3,p=j*3;pos.set(v.subarray(o,o+3),p);norm.set(n.subarray(o,o+3),p);
   uv[j*2]=v[o+axes[0]]*scale;uv[j*2+1]=v[o+axes[1]]*scale;
   const fr=fracture[i]/255,contrast=fr*fr*(3-2*fr),grain=.94+.06*Math.sin(i*78.23);
   col[p]=(1-.34*contrast)*grain;col[p+1]=(1-.38*contrast)*grain;col[p+2]=(1-.43*contrast)*grain;
  }
 }
 g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(norm,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.computeBoundingSphere();return g;
}
