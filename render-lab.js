import * as THREE from 'three';
export function parseHDR(buffer){
 const bytes=new Uint8Array(buffer);let i=0;
 const line=()=>{let a=i;while(i<bytes.length&&bytes[i]!==10)i++;if(i>=bytes.length)throw Error('Truncated HDR header');const s=new TextDecoder().decode(bytes.subarray(a,i));i++;return s.trim();};
 const first=line();if(!/^#\?(RADIANCE|RGBE)/.test(first))throw Error('Not a Radiance RGBE .hdr');
 let l,format=false;while((l=line())!==''){if(l==='FORMAT=32-bit_rle_rgbe')format=true;}if(!format)throw Error('Unsupported HDR encoding');
 const m=/^-Y (\d+) \+X (\d+)$/.exec(line());if(!m)throw Error('Only -Y +X orientation is supported');
 const h=+m[1],w=+m[2];if(w<8||w>8192||h<1||h>4096||w*h>16777216)throw Error('HDR size unsupported');
 const pixels=new Uint16Array(w*h*4),row=new Uint8Array(w*4),hf=THREE.DataUtils.toHalfFloat;
 const read=()=>{if(i>=bytes.length)throw Error('Truncated HDR pixels');return bytes[i++];};
 for(let y=0;y<h;y++){
  const a=read(),b=read(),c=read(),d=read();
  if(a!==2||b!==2||((c<<8)|d)!==w)throw Error('Only modern scanline RLE HDR files are supported');
  for(let k=0;k<4;k++){let x=0;while(x<w){const n=read();if(!n)throw Error('Invalid HDR run');if(n>128){const count=n-128,v=read();if(x+count>w)throw Error('Invalid HDR run length');row.fill(v,k*w+x,k*w+x+count);x+=count;}else{if(x+n>w)throw Error('Invalid HDR literal');for(let j=0;j<n;j++)row[k*w+x++]=read();}}}
  for(let x=0;x<w;x++){const e=row[3*w+x],scale=e?Math.pow(2,e-136):0,j=((h-1-y)*w+x)*4;for(let c=0;c<3;c++)pixels[j+c]=hf(Math.min(65504,row[c*w+x]*scale));pixels[j+3]=hf(1);}
 }
 const tex=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat,THREE.HalfFloatType);tex.mapping=THREE.EquirectangularReflectionMapping;tex.colorSpace=THREE.LinearSRGBColorSpace;tex.minFilter=tex.magFilter=THREE.LinearFilter;tex.needsUpdate=true;return tex;
}
// Optional depth-buffer based blur. Disabled on the main homepage; no extra gamma correction.
export function createDepthBlur(renderer){
 if(!renderer.extensions.has('EXT_color_buffer_float'))throw Error('Floating-point render target unsupported');
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:target.texture},depthMap:{value:target.depthTexture},pixel:{value:new THREE.Vector2(1,1)},focus:{value:12},strength:{value:1},near:{value:.1},far:{value:60}},vertexShader:'varying vec2 p;void main(){p=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`varying vec2 p;uniform sampler2D image,depthMap;uniform vec2 pixel;uniform float focus,strength,near,far;
 void main(){float z=mix(near,far,texture2D(depthMap,p).r);float radius=min(4.,max(0.,abs(z-focus)-.7)*1.2)*strength;vec4 c=texture2D(image,p)*3.;float weight=3.;for(int j=0;j<12;j++){float a=float(j)*2.399963;vec2 q=clamp(p+vec2(cos(a),sin(a))*sqrt((float(j)+.5)/12.)*radius*pixel,0.,1.);float zz=mix(near,far,texture2D(depthMap,q).r);float w=exp(-abs(z-zz)*.45);c+=texture2D(image,q)*w;weight+=w;}gl_FragColor=c/weight;
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
 return {draw(world,cam,strength){const s=renderer.getDrawingBufferSize(new THREE.Vector2());if(target.width!==s.x||target.height!==s.y)target.setSize(s.x,s.y);material.uniforms.pixel.value.set(1/s.x,1/s.y);material.uniforms.strength.value=strength;material.uniforms.near.value=cam.near;material.uniforms.far.value=cam.far;renderer.setRenderTarget(target);try{renderer.render(world,cam);}finally{renderer.setRenderTarget(null);}renderer.render(scene,camera);}};
}
export function mountLab(api){
 if(!new URLSearchParams(location.search).has('lab'))return;
 const panel=document.createElement('section');panel.id='render-lab';panel.style.cssText='position:fixed;top:18%;right:2.5%;width:min(290px,90vw);max-height:65vh;overflow:auto;z-index:1000;background:#171b20f2;border:1px solid #62707d;color:#e9eef2;padding:15px;font:12px/1.6 monospace;box-shadow:0 10px 35px #0004';
 panel.innerHTML=`<strong>V12 / RENDER STUDY</strong><p style="color:#b7c5d2;margin:6px 0">固定模型与相机 · 逐项累加</p><div id="lab-controls"></div><p><label>实拍 HDRI (.hdr)<br><input id="lab-hdr" type="file" accept=".hdr" style="width:100%"></label></p><button id="lab-shot" style="border:1px solid #65798a;padding:5px 12px">保存当前截图</button><pre id="lab-status" style="white-space:pre-wrap;font-size:10px;color:#b7c5d2"></pre>`;
 document.body.append(panel);const status=panel.querySelector('#lab-status');const controls=panel.querySelector('#lab-controls');
 const choices=[['flat','对比 V12.2 统一贴图'],['0','00 / 原始 V12 断面 + 原照明'],['1','01 / HDR 环境强度'],['2','02 / Physical 材质'],['3','03 / 单侧主光 + 阴影'],['4','04 / AgX 色调映射'],['5','05 / 实验性景深']];
 const buttons=[];function choose(step){try{const x=api.step(step);status.textContent=JSON.stringify(x,null,2);buttons.forEach(b=>{b.style.background=b.dataset.step===String(step)?'#465463':'transparent';});}catch(e){status.textContent=e.message;}}
 for(const [step,label] of choices){const b=document.createElement('button');b.dataset.step=step;b.textContent=label;b.style.cssText='display:block;width:100%;text-align:left;padding:6px;border:1px solid #58636e;margin:4px 0';b.onclick=()=>choose(step);controls.append(b);buttons.push(b);}
 panel.querySelector('#lab-hdr').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;await api.hdr(file);status.textContent='HDRI 已载入: '+file.name+'\n'+JSON.stringify(api.step('1'),null,2);}catch(e){status.textContent='HDRI 错误: '+e.message;}};
 panel.querySelector('#lab-shot').onclick=()=>{try{api.shot();}catch(e){status.textContent=e.message;}};choose('0');
}
