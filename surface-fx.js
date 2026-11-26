import * as THREE from 'three';
// Independent visual layer: never replaces the concrete PBR shader or its maps.
export function createSurfaceFX(geometry){
 const uniforms={uTime:{value:0},uHover:{value:0},uFade:{value:1},uTouch:{value:new THREE.Vector3()},uWake:{value:Array.from({length:12},()=>new THREE.Vector4(0,0,0,-100))},uDir:{value:Array.from({length:12},()=>new THREE.Vector3(1,0,0))}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:THREE.FrontSide,blending:THREE.NormalBlending,
 vertexShader:`varying vec3 vP,vN; void main(){vP=position;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 vP,vN;uniform float uTime,uHover,uFade;uniform vec3 uTouch;uniform vec4 uWake[12];uniform vec3 uDir[12];
 float wake(vec3 p){float w=0.;for(int i=0;i<12;i++){float age=uTime-uWake[i].w;if(age<0.||age>1.5)continue;vec3 q=p-uWake[i].xyz;float along=dot(q,uDir[i]);float side=length(q-uDir[i]*along);float behind=-along+age*.10;float v=side-behind*.48;float envelope=exp(-dot(q,q)*22.)*smoothstep(-.04,.05,behind)*exp(-age*2.8);w+=sin(v*95.-age*5.)*exp(-v*v*320.)*envelope;}return w;}
 void main(){vec3 gn=abs(normalize(vN));vec2 gp=(gn.y>gn.x&&gn.y>gn.z?vP.xz:(gn.x>gn.z?vP.yz:vP.xy))*22.;vec3 grid=vec3(gp.x,gp.y*.866+gp.x*.5,gp.y*.866-gp.x*.5);vec3 cell=abs(fract(grid+.5)-.5);vec3 fw=max(fwidth(grid),vec3(.015));vec3 lines=1.-smoothstep(fw*.25,fw*.8,cell);float lattice=max(max(lines.x,lines.y),lines.z);float footprint=exp(-dot(vP-uTouch,vP-uTouch)*10.)*uHover;float trail=abs(wake(vP));float a=clamp(lattice*footprint*.62+trail*.24,0.,.75)*uFade;if(a<.003)discard;gl_FragColor=vec4(.81,.89,.98,a);
 #include <colorspace_fragment>
 }`});
 const overlay=new THREE.Mesh(geometry,material);overlay.visible=false;overlay.renderOrder=2;overlay.userData.wake=[];overlay.userData.last=null;return overlay;
}
export function updateSurfaceFX(fx,m,time,hit,reduced,fade){
 const data=fx.userData,u=fx.material.uniforms;
 if(reduced){fx.visible=false;data.wake.length=0;data.last=null;u.uHover.value=0;return;}
 const active=hit?.m===m;
 if(active){const pos=new THREE.Vector3(...hit.local);u.uTouch.value.copy(pos);if(data.last){const delta=pos.clone().sub(data.last);if(delta.length()>.014){data.wake.push({p:pos.clone(),d:delta.normalize(),time});if(data.wake.length>12)data.wake.shift();data.last=pos;}}else data.last=pos;}
 else data.last=null;
 data.wake=data.wake.filter(w=>time-w.time<1.5);
 u.uTime.value=time;u.uHover.value+=((active?1:0)-u.uHover.value)*.18;u.uFade.value=fade;
 for(let i=0;i<12;i++){const w=data.wake[i];if(w){u.uWake.value[i].set(w.p.x,w.p.y,w.p.z,w.time);u.uDir.value[i].copy(w.d);}else{u.uWake.value[i].set(0,0,0,-100);u.uDir.value[i].set(1,0,0);}}
 fx.visible=fade>.01&&(u.uHover.value>.005||data.wake.length>0);
}
