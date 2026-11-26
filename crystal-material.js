import * as THREE from 'three';

// Material-only study. Geometry and fracture attributes are supplied by V12.8.
// The interior density is a bounded procedural approximation, not path tracing.
export const crystalParameters={color:0xb8c0cb,roughness:.19,transmission:.86,thickness:.62,ior:1.48,attenuationDistance:.95,envMapIntensity:.8,cloudStrength:.62};
export function createCrystalMaterial(){
 const p=crystalParameters;
 const mat=new THREE.MeshPhysicalMaterial({color:p.color,roughness:p.roughness,metalness:0,transmission:p.transmission,thickness:p.thickness,ior:p.ior,attenuationColor:0x9caab9,attenuationDistance:p.attenuationDistance,envMapIntensity:p.envMapIntensity,clearcoat:.08,clearcoatRoughness:.18,specularIntensity:1,opacity:1,transparent:false});
 mat.name='Smoky crystal / material study';
 mat.onBeforeCompile=shader=>{
  shader.uniforms.cloudStrength={value:p.cloudStrength};mat.userData.shader=shader;
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   attribute float fracture;varying vec3 crystalP;varying vec3 crystalRay;varying float crystalFracture;`)
  .replace('#include <begin_vertex>',`#include <begin_vertex>
   crystalP=position;crystalFracture=fracture;
   crystalRay=normalize(position-(inverse(modelMatrix)*vec4(cameraPosition,1.0)).xyz);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 crystalP;varying vec3 crystalRay;varying float crystalFracture;uniform float cloudStrength;
   float crystalHash(vec3 p){p=fract(p*.3183099+vec3(.13,.71,.37));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
   float crystalNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(crystalHash(i),crystalHash(i+vec3(1,0,0)),f.x),mix(crystalHash(i+vec3(0,1,0)),crystalHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(crystalHash(i+vec3(0,0,1)),crystalHash(i+vec3(1,0,1)),f.x),mix(crystalHash(i+vec3(0,1,1)),crystalHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   float crystalFbm(vec3 p){float sum=0.,amp=.55;for(int i=0;i<4;i++){sum+=amp*crystalNoise(p);p=p*2.07+vec3(7.3,1.9,4.1);amp*=.48;}return sum;}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec3 cp=crystalP*4.8;float density=0.;
   for(int i=0;i<7;i++){vec3 q=cp+normalize(crystalRay)*float(i)*.24;float warp=crystalFbm(q*.72);float fog=crystalFbm(q+vec3(warp*2.8));density+=smoothstep(.43,.74,fog)/7.;}
   float filaments=smoothstep(.50,.72,crystalFbm(cp*1.8+crystalFbm(cp)*2.));
   float broken=smoothstep(.12,.72,crystalFracture);
   float cloud=clamp(density*1.5+filaments*.5,0.,1.);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.62,.7),cloud*cloudStrength);
   diffuseColor.rgb*=mix(1.,.68,broken);
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(roughnessFactor+broken*.24+cloud*.065,.07,.5);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 crystalFace=normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition)));if(dot(crystalFace,normal)<0.)crystalFace=-crystalFace;
   normal=normalize(mix(normal,crystalFace,.94));
  `).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   totalEmissiveRadiance+=vec3(.38,.43,.5)*(density*.35+filaments*.55)*cloudStrength*.4;
  `);
 };
 mat.customProgramCacheKey=()=> 'smoky-crystal-study-v2';return mat;
}
