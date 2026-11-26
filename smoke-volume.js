import * as T from 'three';
import {performancePreset as perf,createQualityBudget} from './performance-config.js';
export const smokePreset=Object.freeze({absorption:7,scatter:1.1,cloudScale:1.19,roughness:.22,ior:1.47,haze:.27,exposure:1.17,steps:44,fractureDark:.75,multipleScatter:.5,causticStrength:3,lightSize:.54,ggxMix:0});
const base=new URL('./assets/smoke-volume/',import.meta.url);
const get=async(name,text=false)=>{const r=await fetch(new URL(name,base));if(!r.ok)throw Error(name+' '+r.status);return text?r.text():r.arrayBuffer()};
function floatTexture(buf){const a=new Float32Array(buf),h=Math.ceil(a.length/4096),p=new Float32Array(h*4096);p.set(a);const t=new T.DataTexture(p,1024,h,T.RGBAFormat,T.FloatType);t.minFilter=t.magFilter=T.NearestFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;}
function bytesTexture(buf){const t=new T.DataTexture(new Uint8Array(buf),256,256,T.RedFormat,T.UnsignedByteType);t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;}
export async function createSmokeVolume(renderer,progress=()=>{}){
 let loaded=0;const names=['volume.vert','volume.frag','nodes-threaded.bin','triangles.bin','density.bin','caustic-a.bin','caustic-b.bin'];const [vert,frag,nb,tb,db,ca,cb]=await Promise.all(names.map((name,i)=>get(name,i<2).then(data=>{progress(24+Math.round(++loaded/7*32),'LOADING VOLUME DATA',`${loaded} / 7 resources received`);return data;})));progress(60,'PREPARING GPU DATA','Preparing BVH, geometry and density textures.');
 const density=new T.Data3DTexture(new Uint8Array(db),96,96,96);density.format=T.RedFormat;density.type=T.UnsignedByteType;density.minFilter=density.magFilter=T.LinearFilter;density.wrapS=density.wrapT=density.wrapR=T.RepeatWrapping;density.unpackAlignment=1;density.needsUpdate=true;
 const A=bytesTexture(ca),B=bytesTexture(cb),settings={...smokePreset};const uniforms={nodes:{value:floatTexture(nb)},triangles:{value:floatTexture(tb)},density:{value:density},causticMap:{value:A},causticB:{value:B},inverseModel:{value:Array.from({length:11},()=>new T.Matrix4())},visibleLetter:{value:new Float32Array(11)},form:{value:0},causticFade:{value:1},innerGlow:{value:0},resolution:{value:new T.Vector2()},eye:{value:new T.Vector3()},rightDir:{value:new T.Vector3()},upDir:{value:new T.Vector3()},viewDir:{value:new T.Vector3()},center:{value:new T.Vector3()},extent:{value:4.05},worldMin:{value:new T.Vector3()},worldMax:{value:new T.Vector3()},useWorldBounds:{value:1},earlyExit:{value:perf.earlyExit}};for(const [k,v] of Object.entries(settings))uniforms[k]={value:v};
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));const camera=new T.Camera();
 function makeScene(material){const s=new T.Scene(),m=new T.Mesh(geo,material);m.frustumCulled=false;s.add(m);return s;}
 const linearTarget=renderer.extensions.has('EXT_color_buffer_float');
 const material=new T.RawShaderMaterial({vertexShader:vert,fragmentShader:frag,defines:linearTarget?{LINEAR_TARGET:1}:{},glslVersion:T.GLSL3,uniforms,depthTest:false,depthWrite:false,toneMapped:false});const volumeScene=makeScene(material);
 const canAccumulate=false;const target=new T.WebGLRenderTarget(2,2,{type:linearTarget?T.HalfFloatType:T.UnsignedByteType,depthBuffer:false,stencilBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 const displayMat=new T.RawShaderMaterial({vertexShader:vert,fragmentShader:`precision highp float;uniform sampler2D image;uniform vec2 outputSize;uniform int linearInput;out vec4 fragColor;void main(){vec3 c=texture(image,gl_FragCoord.xy/outputSize).rgb;if(linearInput==1){c=c/(1.+c*.48);c=pow(max(c,vec3(0)),vec3(1./2.2));}fragColor=vec4(c,1.);}`,glslVersion:T.GLSL3,uniforms:{image:{value:target.texture},outputSize:{value:new T.Vector2()},linearInput:{value:linearTarget?1:0}},depthTest:false,depthWrite:false,toneMapped:false});const displayScene=makeScene(displayMat);
 const depthMaterial=new T.MeshBasicMaterial({colorWrite:false,depthWrite:true,side:T.FrontSide});let signature='',samples=0,lastDraw=0,rendered=false,drawSize=new T.Vector2(),count=0;
 const gl=renderer.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),budget=createQualityBudget();
 let pending=null,gpuMs=null,cpuMs=null,mode='initializing',actualSteps=0,actualSize=[0,0],lastMoving=0,forcePreview=true;
 const worldBox=new T.Box3(),localBox=new T.Box3(),modelMatrix=new T.Matrix4();
 function poll(){if(!pending)return false;if(gl.isContextLost()){pending=null;return false;}if(!gl.getQueryParameter(pending.q,gl.QUERY_RESULT_AVAILABLE)){if(performance.now()-pending.started<2500)return true;gl.deleteQuery(pending.q);pending=null;return false;}const q=pending;pending=null;if(!gl.getParameter(timer.GPU_DISJOINT_EXT)){gpuMs=gl.getQueryParameter(q.q,gl.QUERY_RESULT)/1e6;if(q.interactive)budget.observe(gpuMs);}gl.deleteQuery(q.q);return false;}
 function begin(interactive){if(!timer||pending||gl.isContextLost())return null;const q=gl.createQuery();if(!q)return null;gl.beginQuery(timer.TIME_ELAPSED_EXT,q);return {q,interactive,started:performance.now()};}
 function end(q){if(q){gl.endQuery(timer.TIME_ELAPSED_EXT);pending=q;}}
 
 // Compile before replacing the working renderer. Capture real driver compile errors.
 const compileStart=performance.now();progress(70,'COMPILING SHADERS','Waiting for the GPU shader compiler.');const previousHandler=renderer.debug.onShaderError;let shaderError=null;renderer.debug.onShaderError=(gl,p,v,f)=>{shaderError=Error([gl.getProgramInfoLog(p),gl.getShaderInfoLog(v),gl.getShaderInfoLog(f)].join('\n'));};try{await Promise.all([renderer.compileAsync(volumeScene,camera),renderer.compileAsync(displayScene,camera)]);if(shaderError)throw shaderError;}finally{renderer.debug.onShaderError=previousHandler;}const compileMs=Math.round(performance.now()-compileStart);progress(86,'SHADERS READY','Preparing the first complete frame.');
 function draw({objects,center,view,right,up,size,progress,moving,glow,quality,reading,scene,cam,hidePlanes}){
  const now=performance.now(),u=uniforms;poll();renderer.getDrawingBufferSize(drawSize);
  if(moving)lastMoving=now;const interactive=moving||now-lastMoving<perf.settleMs;
  const initial=!rendered||forcePreview;const b=budget.state();
  const maxEdge=quality===1?perf.stableHighEdge:quality===2?perf.stableFastEdge:perf.stableEdge;
  const scale=Math.min(1,maxEdge/Math.max(drawSize.x,drawSize.y));const w=Math.max(2,Math.round(drawSize.x*scale)),h=Math.max(2,Math.round(drawSize.y*scale));
  const stepCount=settings.steps;
  const fast=false;const limit=1; // Complete deterministic frame, no progressive batches. Same optical quality in every state.
  const sig=[w,h,stepCount,fast?0:1,...center,...view,size,progress,glow,...objects.flatMap(g=>[g.fade>.5?1:0,...g.m.M]),...Object.values(settings)].map(x=>Math.round(x*10000)).join(',');
  if(sig!==signature){samples=0;signature=sig;}
  const update=!rendered||samples<limit;
  if(update){if(target.width!==w||target.height!==h){target.setSize(w,h);samples=0;}
   worldBox.makeEmpty();for(const g of objects){const id=g.m.id;modelMatrix.fromArray(g.m.M);u.inverseModel.value[id].copy(modelMatrix).invert();u.visibleLetter.value[id]=(g.fade??1)>.5?1:0;
    if(u.visibleLetter.value[id]){localBox.min.fromArray(g.m.min);localBox.max.fromArray(g.m.max);worldBox.union(localBox.applyMatrix4(modelMatrix));}}
   u.useWorldBounds.value=worldBox.isEmpty()?0:1;if(!worldBox.isEmpty()){worldBox.expandByScalar(.002);u.worldMin.value.copy(worldBox.min);u.worldMax.value.copy(worldBox.max);}
   u.resolution.value.set(w,h);u.center.value.fromArray(center);u.eye.value.fromArray(center).addScaledVector(new T.Vector3(...view),12);u.viewDir.value.fromArray(view).negate();u.rightDir.value.fromArray(right);u.upDir.value.fromArray(up);u.extent.value=size;u.form.value=progress;u.causticFade.value=(1-Math.sin(Math.PI*progress))*(1-glow*.8);u.innerGlow.value=glow;for(const [k,v] of Object.entries(settings))u[k].value=k==='steps'?stepCount:v;
   const dst=target;
   const q=begin(interactive&&!initial&&!reading),start=performance.now();try{renderer.setRenderTarget(dst);renderer.render(volumeScene,camera);}finally{renderer.setRenderTarget(null);end(q);}cpuMs=performance.now()-start;
   if(!timer&&interactive&&!initial&&!reading&&cpuMs>perf.targetMs)budget.observe(cpuMs);
   if(!rendered){const error=gl.getError();if(error!==gl.NO_ERROR)throw Error(`Smoke volume GL error 0x${error.toString(16)}`);}
   displayMat.uniforms.image.value=dst.texture;samples++;lastDraw=now;rendered=true;forcePreview=false;count++;mode=reading?'reading snapshot':interactive?'continuous':'settled';actualSteps=stepCount;actualSize=[w,h];}
  if(!interactive&&!reading&&samples>=limit)mode='settled';
  renderer.setRenderTarget(null);displayMat.uniforms.outputSize.value.copy(drawSize);renderer.render(displayScene,camera);
  // Use the original geometry as a depth-only occluder, preserving the surface ripple, wire guides and glow sprites.
  const saved=objects.map(g=>[g,g.mesh.material,g.mesh.visible]);const bg=scene.background,auto=renderer.autoClear,shadow=renderer.shadowMap.enabled;const planes=hidePlanes.map(o=>[o,o.visible]);try{scene.background=null;renderer.autoClear=false;renderer.shadowMap.enabled=false;renderer.clearDepth();for(const [o] of planes)o.visible=false;for(const [g] of saved){g.mesh.material=depthMaterial;g.mesh.visible=(g.fade??1)>.5;}renderer.render(scene,cam);}finally{for(const [g,m,v] of saved){g.mesh.material=m;g.mesh.visible=v;}for(const [o,v] of planes)o.visible=v;scene.background=bg;renderer.autoClear=auto;renderer.shadowMap.enabled=shadow;}
 }
 return {draw,settings,busy:poll,needsFrame:()=>!rendered||samples===0,set(p){for(const [k,v] of Object.entries(p)){if(k in settings&&Number.isFinite(v))settings[k]=v;}settings.steps=Math.max(8,Math.min(64,Math.round(settings.steps)));settings.ior=Math.max(1.01,Math.min(1.65,settings.ior));signature='';samples=0;mode='dirty';},state:()=>({settings:{...settings},samples,rendered,count,canAccumulate,performance:{mode,compileMs,renderSize:actualSize,steps:actualSteps,gpuMs:gpuMs===null?null:Math.round(gpuMs*10)/10,cpuSubmitMs:cpuMs===null?null:Math.round(cpuMs*10)/10,timerSupported:!!timer,adaptive:budget.state()}})};
}
