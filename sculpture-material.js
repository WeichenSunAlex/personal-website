import * as THREE from 'three';
export const CONCRETE={name:'Weathered cast concrete',roughness:.88,metalness:0,exposure:1.02};
const noise=`
varying vec3 vStoneP; varying float vFracture;
float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float n3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
export function createConcreteMaterial(physical=false){
 const mat=new (physical?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial)({color:0xffffff,metalness:0,roughness:.88,envMapIntensity:.48,transparent:true});
 if(physical){mat.ior=1.46;mat.specularIntensity=.65;mat.clearcoat=0;mat.transmission=0;}
 mat.onBeforeCompile=s=>{
 s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float fracture; varying vec3 vStoneP; varying float vFracture;').replace('#include <begin_vertex>','#include <begin_vertex>\nvStoneP=position;vFracture=fracture;');
 s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\n'+noise).replace('#include <color_fragment>',`#include <color_fragment>
 float broken=smoothstep(.15,.65,vFracture);
 float cloud=n3(vStoneP*7.);float grit=n3(vStoneP*72.);float micro=n3(vStoneP*210.);
 float aggregate=smoothstep(.43,.66,n3(vStoneP*29.+n3(vStoneP*13.)*2.));
 float pores=smoothstep(.69,.85,n3(vStoneP*135.));
 vec3 skin=mix(vec3(.48,.47,.445),vec3(.68,.665,.635),cloud)+vec3((grit-.5)*.055-pores*.07);
 vec3 core=mix(vec3(.19,.175,.15),vec3(.55,.525,.48),aggregate)*(.82+grit*.35)+vec3((micro-.5)*.06);
 diffuseColor.rgb*=mix(skin,core,broken);`)
 .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.81+grit*.12,.92+micro*.075,broken);')
 .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float relief=mix((grit-.5)*.00045+(micro-.5)*.00022-pores*.0012,(aggregate-.5)*.006+(grit-.5)*.003+(micro-.5)*.0013,broken);
 vec3 dx=dFdx(-vViewPosition),dy=dFdy(-vViewPosition),a=cross(dy,normal),b=cross(normal,dx);float det=dot(dx,a);
 normal=normalize(normal-sign(det)*(dFdx(relief)*a+dFdy(relief)*b)/max(abs(det),.000001));`);
 };mat.customProgramCacheKey=()=> physical?'cast-concrete-v12-physical':'cast-concrete-v12';return mat;
}
function decode(s,Type){return new Type(Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer);}
export function concreteGeometry(m){const d=m.concrete,g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(Float32Array.from(decode(d.v,Int16Array),x=>x/24000),3));g.setAttribute('normal',new THREE.BufferAttribute(Float32Array.from(decode(d.n,Int8Array),x=>x/127),3));g.setAttribute('fracture',new THREE.BufferAttribute(decode(d.d,Uint8Array),1,true));g.setIndex(new THREE.BufferAttribute(decode(d.f,Uint16Array),1));g.computeBoundingSphere();return g;}
