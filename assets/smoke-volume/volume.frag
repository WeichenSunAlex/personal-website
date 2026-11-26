precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;
uniform sampler2D nodes, triangles, causticMap;
uniform float fractureDark, multipleScatter, causticStrength, lightSize;

uniform sampler3D density;
uniform vec2 resolution;
uniform vec3 eye, rightDir, upDir, viewDir, center;
uniform float extent, absorption, scatter, cloudScale, roughness, ior, haze, exposure;
uniform int steps;
out vec4 fragColor;
const int W=1024;
vec4 fetch(sampler2D s,int k){return texelFetch(s,ivec2(k%W,k/W),0);}
struct Hit{float t;vec3 n;int id;float damage;};
bool boxHit(vec3 ro,vec3 inv,vec3 mn,vec3 mx,float limit){vec3 a=(mn-ro)*inv,b=(mx-ro)*inv;vec3 l=min(a,b),h=max(a,b);return max(max(l.x,l.y),max(l.z,0.0))<=min(min(h.x,h.y),min(h.z,limit));}
uniform mat4 inverseModel[11];
uniform float visibleLetter[11];
uniform float causticFade, innerGlow, ggxMix;
uniform vec3 worldMin, worldMax;
uniform int useWorldBounds;
uniform float earlyExit;
uniform sampler2D causticB;
uniform float form;
const int ROOTS[11]=int[11](0,2047,4094,6141,8188,10235,12282,14329,16376,18423,20470);
Hit trace(vec3 worldRo,vec3 worldRd,int filterId,float maxT){
 Hit hit=Hit(maxT,vec3(0),-1,0.);
 if(useWorldBounds==1&&!boxHit(worldRo,1./(worldRd+vec3(1e-10)),worldMin,worldMax,maxT))return hit;
 int firstObj=filterId<0?0:filterId;int lastObj=filterId<0?11:filterId+1;
 for(int obj=firstObj;obj<lastObj;obj++){
  if((filterId>=0&&obj!=filterId)||visibleLetter[obj]<.5)continue;
  mat4 invM=inverseModel[obj];vec3 ro=(invM*vec4(worldRo,1.)).xyz,rd=(invM*vec4(worldRd,0.)).xyz;vec3 inv=1./(rd+vec3(1e-10));
  int ni=ROOTS[obj],endNode=ni+2047;
  for(int it=0;it<400;it++){
   if(ni>=endNode)break;
   vec4 mn=fetch(nodes,ni*2),mx=fetch(nodes,ni*2+1);
   bool leaf=mn.w<0.;int nextNode=leaf?ni+1:int(mx.w);
   if(!boxHit(ro,inv,mn.xyz,mx.xyz,hit.t)){ni=nextNode;continue;}
   ni++;
   if(leaf){int start=int(-mn.w)-1;int count=int(mx.w);for(int j=0;j<8;j++){if(j>=count)break;int ti=(start+j)*3;vec4 a=fetch(triangles,ti),b=fetch(triangles,ti+1),c=fetch(triangles,ti+2);
    vec3 e1=b.xyz-a.xyz,e2=c.xyz-a.xyz,p=cross(rd,e2);float det=dot(e1,p);if(abs(det)<1e-9)continue;float idet=1./det;vec3 s=ro-a.xyz;float u=dot(s,p)*idet;if(u<0.||u>1.)continue;vec3 q=cross(s,e1);float v=dot(rd,q)*idet;if(v<0.||u+v>1.)continue;float t=dot(e2,q)*idet;if(t>.00005&&t<hit.t){if(filterId==-2)return Hit(t,vec3(0),obj,0.);hit=Hit(t,normalize(transpose(mat3(invM))*cross(e1,e2)),obj,b.w);}
   }}
  }
 }return hit;
}
float cloud(vec3 p){return texture(density,p*cloudScale+vec3(.17,.23,.41)).r;}

vec3 roughNormal(vec3 n,vec3 p,float rough,float seed){vec3 t=normalize(cross(n,abs(n.y)<.9?vec3(0,1,0):vec3(1,0,0)));vec3 b=cross(n,t);float a=6.2831853*cloud(p*6.3+vec3(seed*.031,.17,.43));float xi=clamp(cloud(p*8.1+vec3(.59,seed*.023,.27)),.001,.97);float r=mix(sqrt(xi)*rough*rough*.65,rough*rough*sqrt(xi/(1.-xi)),ggxMix);return normalize(n+r*(cos(a)*t+sin(a)*b));}
vec3 keyDir=normalize(vec3(-.65,.78,-.65));
vec3 sky(vec3 d){float y=max(d.y,0.);vec3 c=mix(vec3(.073,.085,.106),vec3(.18,.21,.25),y);float key=pow(max(dot(d,keyDir),0.),18.);float strip=pow(max(dot(d,normalize(vec3(.8,.55,.1))),0.),45.);return c+vec3(1.45,1.51,1.65)*key+vec3(.28,.33,.40)*strip;}
vec3 floorColor(vec3 p){float s=0.;float phase=6.2831*cloud(p*.27+vec3(.2,.7,.5));for(int i=0;i<5;i++){float a=float(i)*2.399963+phase;vec3 ld=normalize(keyDir+vec3(cos(a)*lightSize,0.,sin(a)*lightSize));Hit h=trace(p+vec3(0,.003,0),ld,-2,15.);s+=h.id<0?1.:.12;}s*=.2;float d=length(p.xz-vec2(0,.15));float ao=1.-.28*exp(-d*d*.65);float mist=cloud(p*.15+vec3(0,1.9,0));vec2 cuv=p.xz/10.+.5;float ca=0.;if(all(greaterThanEqual(cuv,vec2(0)))&&all(lessThanEqual(cuv,vec2(1))))ca=mix(texture(causticMap,cuv).r,texture(causticB,cuv).r,form)*causticFade;return vec3(.052,.063,.085)*(.20+.80*s)*ao+vec3(.012,.015,.020)*mist+vec3(.13,.16,.21)*ca*causticStrength;}
vec3 background(vec3 ro,vec3 rd){if(rd.y<-.0001){float t=(-.055-ro.y)/rd.y;if(t>0.)return mix(floorColor(ro+rd*t),vec3(.105,.122,.15),1.-exp(-t*.018));}return sky(rd)*.55;}
void integrate(vec3 p,vec3 d,float len,inout vec3 throughput,inout vec3 light){float dt=len/float(steps);for(int i=0;i<64;i++){if(i>=steps)break;vec3 q=p+d*((float(i)+.5)*dt);float n=cloud(q);float detail=cloud(q*3.7+vec3(.7,.2,1.));float w=smoothstep(.29,.84,n*.77+detail*.23);float den=.025+3.5*w*w*w;vec3 sigA=vec3(1.27,1.04,.86)*absorption*(.75+.28*n);float sigS=den*scatter;vec3 sig=sigA+sigS;vec3 tr=exp(-sig*dt);float illum=.45+.55*cloud(q+keyDir*.11);float albedo=sigS/(sigS+dot(sigA,vec3(.333)));float higher=multipleScatter*albedo*.42/(1.-.48*albedo);vec3 incident=vec3(.30,.35,.43)*illum+vec3(.16,.20,.27)*higher+innerGlow*vec3(.62,.72,.86)*exp(-dot(q-vec3(0,.93,.25),q-vec3(0,.93,.25))*2.);light+=throughput*(vec3(1.)-tr)*(sigS/sig)*incident;throughput*=tr;if(max(max(throughput.r,throughput.g),throughput.b)<earlyExit)break;}}
void main(){vec2 uv=(gl_FragCoord.xy-resolution*.5)/resolution.y;vec3 ro=eye+extent*(uv.x*rightDir+uv.y*upDir);vec3 rd=viewDir;vec3 accum=vec3(0),throughput=vec3(1);float first=0.;bool touched=false;
 for(int layer=0;layer<3;layer++){
  Hit h=trace(ro,rd,-1,30.);if(h.id<0){accum+=throughput*background(ro,rd);throughput=vec3(0);break;}
  vec3 p=ro+rd*h.t;if(p.y<-.052){accum+=throughput*floorColor(p);throughput=vec3(0);break;}if(!touched){first=h.t;touched=true;}
  vec3 n=faceforward(h.n,rd,h.n);float NoV=clamp(dot(n,-rd),0.,1.);float f0=pow((ior-1.)/(ior+1.),2.);float F=f0+(1.-f0)*pow(1.-NoV,5.);float broken=smoothstep(.17,.78,h.damage);float c=cloud(p*1.1);float upper=max(dot(n,keyDir),0.);
  // Independent dark fracture lobe. Never add intact-surface cloud or specular to fully damaged faces.
  vec3 micro=roughNormal(n,p,roughness,float(layer)*41.);if(dot(micro,rd)>-.025)micro=n;
  vec3 reflected=reflect(rd,micro);vec3 refl=sky(reflected);float glint=pow(max(dot(reflected,keyDir),0.),mix(180.,18.,roughness));refl+=vec3(.30,.34,.40)*glint;
  float damage=smoothstep(.10,.58,h.damage);float surface=damage*fractureDark;
  vec3 fractureColor=mix(vec3(.006,.010,.017),vec3(.055,.068,.088),c)*(.55+.75*upper);
  fractureColor+=vec3(.015,.018,.024)*pow(max(dot(reflect(rd,n),keyDir),0.),16.);
  float frost=.20+roughness*.28;vec3 body=mix(vec3(.024,.035,.055),vec3(.125,.146,.178),upper);
  float fine=cloud(p*4.2+vec3(.8,.2,.6));float icePatch=smoothstep(.48,.84,cloud(p+vec3(.03,.06,.02))*.62+fine*.38);
  vec3 topSpec=vec3(.42,.48,.58)*upper*upper*icePatch*.78;
  accum+=throughput*((1.-surface)*(F*refl*1.6+frost*body+topSpec)+surface*fractureColor);
  throughput*=(1.-F)*(1.-surface)*(1.-frost);
  if(max(max(throughput.r,throughput.g),throughput.b)<.007)break;
  vec3 inside=refract(rd,micro,1./ior);if(length(inside)<.01){accum+=throughput*refl;throughput=vec3(0);break;}inside=normalize(inside);
  vec3 start=p+inside*.00015;Hit exitH=trace(start,inside,h.id,15.);float len=exitH.id>=0?exitH.t:.055;
  integrate(start,inside,len,throughput,accum);
  if(max(max(throughput.r,throughput.g),throughput.b)<earlyExit){throughput=vec3(0);break;}
  vec3 ep=start+inside*len;vec3 en=exitH.id>=0?faceforward(exitH.n,inside,exitH.n):-n;
  vec3 em=roughNormal(en,ep,roughness,float(layer)*73.);if(dot(em,inside)>-.025)em=en;vec3 outDir=refract(inside,em,ior);
  if(length(outDir)<.001){vec3 bounce=reflect(inside,en);Hit bh=trace(ep+bounce*.00015,bounce,h.id,15.);if(bh.id>=0){integrate(ep+bounce*.00015,bounce,bh.t,throughput,accum);ep+=bounce*(bh.t+.00015);outDir=refract(bounce,faceforward(bh.n,bounce,bh.n),ior);}if(length(outDir)<.001){accum+=throughput*sky(bounce)*.45;throughput=vec3(0);break;}}
  rd=normalize(mix(outDir,rd,roughness*.05));ro=ep+rd*.00045;
  if(max(max(throughput.r,throughput.g),throughput.b)<.008)break;
 }
 accum+=throughput*sky(rd)*.35;
 // Camera-space atmospheric haze, in addition to actual internal volume integral.
 float fog=clamp(haze*(.18+.82*cloud((center+uv.x*rightDir*extent+uv.y*upDir*extent)*.32))+.04*exp(-pow((uv.x+.46)*2.,2.))+.018*cloud(vec3(uv*2.5,1.9)),0.,.65);accum=mix(accum,vec3(.10,.125,.16),fog);float vignette=1.-.19*dot(uv,uv);accum*=vignette*exposure;
 // Filmic shoulder with restrained contrast, then linear-to-display conversion.
 #ifdef LINEAR_TARGET
 fragColor=vec4(accum,1.);
 #else
 accum=accum/(1.+accum*.48);fragColor=vec4(pow(max(accum,vec3(0)),vec3(1./2.2)),1.);
 #endif
}
