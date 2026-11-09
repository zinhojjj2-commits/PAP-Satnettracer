// ===================== Gráficos realistas: céu + Terra em WebGL =====================
(()=>{
const wrap=document.querySelector('#wrap'),sky=document.querySelector('#sky'),gc=document.querySelector('#globe'),hud=document.querySelector('#ehud');
let gl=null;try{gl=gc.getContext('webgl',{premultipliedAlpha:true,antialias:false,alpha:true})}catch(e){}
const theme=()=>document.documentElement.dataset.theme;

// ---------- Céu: Via Láctea e estrelas com cor real (temperatura) ----------
function rng(s){return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let skyKey='';
function drawSky(){
 const r=wrap.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),W=Math.max(1,Math.round(r.width*dpr)),H=Math.max(1,Math.round(r.height*dpr)),th=theme(),key=W+'x'+H+th+CFG.stars;
 if(key==skyKey)return;skyKey=key;
 if(th=='light'){sky.style.display='none';return}
 sky.style.display='';sky.width=W;sky.height=H;const x=sky.getContext('2d');
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,th=='neon'?'#06000d':'#010207');g.addColorStop(1,th=='neon'?'#10021c':'#040814');x.fillStyle=g;x.fillRect(0,0,W,H);
 if(!CFG.stars)return;
 const R=rng(20261027),gs=()=>{let u=0;for(let i=0;i<6;i++)u+=R();return u/6-.5};
 const ax=-.15*W,ay=.8*H,bx=1.15*W,by=-.25*H,len=Math.hypot(bx-ax,by-ay),ux=(bx-ax)/len,uy=(by-ay)/len,vx=-uy,vy=ux,bw=Math.min(W,H)*.2;
 const band=(t,o)=>[ax+ux*len*t+vx*o,ay+uy*len*t+vy*o];
 const mw=document.createElement('canvas'),mW=mw.width=Math.ceil(W/5),mH=mw.height=Math.ceil(H/5),id=mw.getContext('2d').createImageData(mW,mH),D=id.data;
 const hh=(i,j)=>{let n=i*374761393+j*668265263;n=(n^n>>>13)*1274126177;return((n^n>>>16)>>>0)/4294967296},
  vn=(x,y)=>{const i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j,s=u*u*(3-2*u),t=v*v*(3-2*v);return(hh(i,j)*(1-s)+hh(i+1,j)*s)*(1-t)+(hh(i,j+1)*(1-s)+hh(i+1,j+1)*s)*t},
  fb=(x,y)=>{let r=0,a=.5;for(let k=0;k<5;k++){r+=a*vn(x,y);x*=2.1;y*=2.1;a*=.5}return r/.97};
 for(let j=0;j<mH;j++)for(let i=0;i<mW;i++){const X=i*5,Y=j*5,o=((X-ax)*vx+(Y-ay)*vy)/bw,t=((X-ax)*ux+(Y-ay)*uy)/len,sc=bw/90;
  const n=fb(X/sc/18,Y/sc/18),dust=fb(X/sc/9+40,Y/sc/9),core=Math.exp(-o*o*1.6)*(.55+.45*Math.sin(t*7+1)**2),glow=Math.exp(-o*o*.35)*.35;
  let d=(core*Math.pow(n,1.6)*1.15+glow*n*.7)*(1-.75*Math.exp(-o*o*5)*Math.max(0,dust-.45)*2.2);d=Math.max(0,d);
  const w=Math.max(0,Math.min(1,.5+o*.6)),k=(j*mW+i)*4;
  D[k]=Math.min(255,d*(58+20*w));D[k+1]=Math.min(255,d*(54+14*w));D[k+2]=Math.min(255,d*(66-6*w));D[k+3]=255}
 mw.getContext('2d').putImageData(id,0,0);
 x.imageSmoothingQuality='high';x.globalCompositeOperation='lighter';x.drawImage(mw,0,0,W,H);
 const COL=['155,176,255','170,191,255','202,215,255','248,247,255','255,244,234','255,229,200','255,210,161','255,190,120'],N=Math.round(W*H/420);
 for(let i=0;i<N;i++){let px,py;if(R()<.45){[px,py]=band(R(),gs()*bw*1.5)}else{px=R()*W;py=R()*H}
  const m=Math.pow(R(),12),rad=(.28+m*1.3)*dpr,a=Math.min(1,.12+m*3+R()*.4),c=COL[Math.min(7,Math.floor(Math.pow(R(),1.4)*8))];
  x.fillStyle=`rgba(${c},${a})`;x.beginPath();x.arc(px,py,rad,0,6.3);x.fill();
  if(m>.4){const rr=rad*5,q=x.createRadialGradient(px,py,0,px,py,rr);q.addColorStop(0,`rgba(${c},${.28*a})`);q.addColorStop(1,`rgba(${c},0)`);x.fillStyle=q;x.fillRect(px-rr,py-rr,rr*2,rr*2)}
  if(m>.85){x.strokeStyle=`rgba(${c},${.15*a})`;x.lineWidth=.6*dpr;const L=rad*16;x.beginPath();x.moveTo(px-L,py);x.lineTo(px+L,py);x.moveTo(px,py-L);x.lineTo(px,py+L);x.stroke()}}
 x.globalCompositeOperation='source-over'}

if(!gl){const t=()=>{drawSky();requestAnimationFrame(t)};document.body.classList.add('sky');t();return}

// ---------- Shaders ----------
const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uC;uniform float uR,uTilt,uLon0,uTime,uDayT,uNightT,uWaterT,uTopoT,uExp;uniform vec3 uSun;
uniform sampler2D uDay,uNight,uWater,uTopo,uMask;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm7(vec3 p){float s=0.,a=.5;for(int i=0;i<7;i++){s+=a*noise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}
float fbm4(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s/.9375;}
vec3 toW(vec3 v){float c=cos(uTilt),s=sin(uTilt);vec3 a=vec3(v.x,v.y*c-v.z*s,v.y*s+v.z*c);float cl=cos(uLon0),sl=sin(uLon0);return vec3(a.x*cl+a.z*sl,a.y,-a.x*sl+a.z*cl);}
vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x*c+v.z*s,v.y,-v.x*s+v.z*c);}
vec3 tone(vec3 x){x=max(x,0.);x=(x*(2.51*x+.03))/(x*(2.43*x+.59)+.14);return pow(clamp(x,0.,1.),vec3(1./2.2));}
float thr(float lat){float la=abs(lat);return .53-.1*exp(-pow(lat/.13,2.))+.1*exp(-pow((la-.45)/.15,2.))-.07*smoothstep(.75,1.1,la);}
float cloud(vec3 q,float lat){vec3 w=q*2.3+vec3(0.,0.,uTime*.003);w+=.6*vec3(noise(w*1.4),noise(w*1.4+7.3),noise(w*1.4+13.1));float c=fbm7(w*1.6);float t=thr(lat);return smoothstep(t,t+.2,c);}
float cloudLo(vec3 q,float lat){vec3 w=q*2.3+vec3(0.,0.,uTime*.003);w+=.6*vec3(noise(w*1.4),noise(w*1.4+7.3),noise(w*1.4+13.1));float c=fbm4(w*1.6);float t=thr(lat);return smoothstep(t,t+.25,c);}
void main(){
 vec2 p=(gl_FragCoord.xy-uC)/uR;float r=length(p),px=1.2/uR;vec3 S=normalize(uSun);
 vec4 halo=vec4(0.);
 if(r>1.-px){
  float h=max(r-1.,0.);vec3 ne=toW(vec3(p/r,0.));float d=dot(ne,S),lit=smoothstep(-.3,.3,d);
  float g=exp(-h/.006)+exp(-h/.03)*.22;
  vec3 c=mix(vec3(.22,.48,1.),vec3(1.,.5,.22),exp(-pow(d/.16,2.))*.7)*g*(.04+lit*1.6);
  c=tone(c*uExp);float a=clamp(max(c.r,max(c.g,c.b))*1.1,0.,1.);
  halo=vec4(c,a);if(r>1.+px){gl_FragColor=halo;return;}
 }
 float z=sqrt(max(0.,1.-r*r));vec3 N=toW(vec3(p,z)),V=toW(vec3(0.,0.,1.));
 float lat=asin(clamp(N.y,-1.,1.)),lon=atan(N.x,N.z);vec2 uv=vec2(lon/6.2831853+.5,.5-lat/3.1415927);
 vec3 E=normalize(vec3(cos(lon),0.,-sin(lon))),Nn=cross(N,E);
 vec3 alb,night=vec3(0.);float water,landv;
 if(uDayT>.5){alb=pow(texture2D(uDay,uv).rgb,vec3(2.2));
  water=uWaterT>.5?texture2D(uWater,uv).r:clamp((alb.b-max(alb.r,alb.g))*12.,0.,1.);landv=1.-water;}
 else{float m=texture2D(uMask,uv).r;landv=m+(fbm4(N*4.)-.5)*.55+(fbm4(N*26.)-.5)*.16;
  float la=abs(lat)*57.3,moist=fbm4(N*3.+9.),relief=fbm4(N*14.+3.);
  if(landv>.5){float dry=clamp((.55-moist)*3.5,0.,1.)*(1.-smoothstep(36.,48.,la))*smoothstep(8.,16.,la);
   alb=mix(mix(vec3(.025,.06,.02),vec3(.07,.09,.03),moist),vec3(.52,.37,.17),dry);
   alb=mix(alb,vec3(.16,.13,.1),smoothstep(.55,.75,relief)*.7);
   if(la>66.)alb=mix(alb,vec3(.85,.88,.92),smoothstep(66.,72.,la));water=0.;}
  else{float sh=smoothstep(.2,.5,landv);alb=mix(vec3(.003,.012,.04),vec3(.012,.05,.075),sh);if(la>74.)alb=vec3(.8,.84,.9);water=la>74.?0.:1.;}
  landv=step(.5,landv);}
 if(uNightT>.5)night=pow(texture2D(uNight,uv).rgb,vec3(2.2));
 else{float cl2=fbm4(N*14.)*fbm4(N*4.5+2.),k=noise(N*900.)*.6+noise(N*260.)*.4;
  night=vec3(smoothstep(.62,.9,k)*smoothstep(.2,.4,cl2)*.9+smoothstep(.22,.5,cl2)*.035)*landv*(1.-smoothstep(55.,65.,abs(lat)*57.3));}
 vec3 Nb=N;
 if(uTopoT>.5){vec2 e=vec2(1./2048.,1./1024.);float hx=texture2D(uTopo,uv+vec2(e.x,0.)).r-texture2D(uTopo,uv-vec2(e.x,0.)).r,hy=texture2D(uTopo,uv-vec2(0.,e.y)).r-texture2D(uTopo,uv+vec2(0.,e.y)).r;Nb=normalize(N-(hx*E+hy*Nn)*3.5*landv);}
 else if(uDayT<.5){float b=fbm4(N*40.),bx=fbm4(N*40.+E*.02)-b,by=fbm4(N*40.+Nn*.02)-b;Nb=normalize(N-(bx*E+by*Nn)*6.*landv);}
 float nl0=dot(N,S),nl=dot(Nb,S),diff=clamp(nl,0.,1.),tw=smoothstep(-.12,.1,nl0);
 vec3 sun=vec3(1.,.97,.92)*mix(vec3(1.,.5,.25),vec3(1.),smoothstep(0.,.3,nl0));
 vec3 col=alb*diff*sun*2.3+alb*.003;
 vec3 Hh=normalize(S+V);float nh=max(dot(N,Hh),0.);
 col+=water*sun*(pow(nh,220.)*3.+pow(nh,24.)*.07)*smoothstep(0.,.12,nl0);
 vec3 cq=rotY(N,uTime*.0012);float cl=cloud(cq,lat),sh=cloudLo(rotY(N-S*.008,uTime*.0012),lat);
 col*=1.-.6*sh*tw;
 vec3 cc=vec3(1.)*(clamp(nl0,0.,1.)*2.5+.006)*sun;
 col=mix(col,cc,cl*.97);
 col+=night*vec3(1.,.7,.38)*3.*(1.-tw)*(1.-cl*.9);
 float rim=pow(1.-z,5.);
 vec3 atm=vec3(.16,.4,1.)*smoothstep(-.25,.45,nl0)*1.1+vec3(1.,.42,.16)*exp(-pow(nl0/.14,2.))*.5;
 col=mix(col,atm*.8,clamp(rim*.75+.02,0.,.9));
 col+=vec3(.05,.12,.3)*.02*smoothstep(-.2,.6,nl0);
 col=tone(col*uExp);
 float a=smoothstep(1.+px,1.-px,r);
 gl_FragColor=vec4(col*a,a)+halo*(1.-a);
}`;
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o}
let pr;try{pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr))}
catch(e){console.warn('Terra WebGL indisponível:',e);document.body.classList.add('sky');const t=()=>{drawSky();requestAnimationFrame(t)};t();return}
gl.useProgram(pr);
const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
const ap=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,2,gl.FLOAT,false,0,0);
const U={};['uC','uR','uTilt','uLon0','uTime','uDayT','uNightT','uWaterT','uTopoT','uExp','uSun','uDay','uNight','uWater','uTopo','uMask'].forEach(k=>U[k]=gl.getUniformLocation(pr,k));
const maxT=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE)),aniso=gl.getExtension('EXT_texture_filter_anisotropic');
const TX={},have={day:0,night:0,water:0,topo:0};
function mkTex(unit,name,src){gl.activeTexture(gl.TEXTURE0+unit);let t=TX[name];if(!t){t=TX[name]=gl.createTexture()}gl.bindTexture(gl.TEXTURE_2D,t);
 if(!src){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);return}
 const w=Math.min(name=='day'?maxT:2048,maxT,1<<Math.round(Math.log2(Math.max(2,src.width)))),c=document.createElement('canvas');c.width=w;c.height=w/2;c.getContext('2d').drawImage(src,0,0,w,w/2);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.generateMipmap(gl.TEXTURE_2D);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 if(aniso)gl.texParameterf(gl.TEXTURE_2D,aniso.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))}
const SLOT={day:0,night:1,water:2,topo:3,mask:4};
Object.keys(SLOT).forEach(k=>mkTex(SLOT[k],k,null));
// máscara de continentes (para a Terra gerada sem fotografias)
{const c=document.createElement('canvas');c.width=1024;c.height=512;const o=c.getContext('2d');o.fillStyle='#000';o.fillRect(0,0,1024,512);o.filter='blur(3px)';o.fillStyle='#fff';
 LAND.forEach(p=>{o.beginPath();for(let i=0;i<p.length;i+=2){const x=(p[i]+180)/360*1024,y=(90-p[i+1])/180*512;i?o.lineTo(x,y):o.moveTo(x,y)}o.closePath();o.fill()});mkTex(SLOT.mask,'mask',c)}

// ---------- Fotografias de satélite reais (NASA), guardadas no navegador para uso offline ----------
const BASE=['https://unpkg.com/three-globe/example/img/','https://cdn.jsdelivr.net/npm/three-globe/example/img/'];
const FILES={day:'earth-blue-marble.jpg',night:'earth-night.jpg',water:'earth-water.png',topo:'earth-topology.png'};
const idb=new Promise(res=>{try{const q=indexedDB.open('satnet-terra',1);q.onupgradeneeded=()=>q.result.createObjectStore('t');q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)}catch(e){res(null)}});
const iget=async k=>{const d=await idb;if(!d)return null;return new Promise(r=>{try{const q=d.transaction('t').objectStore('t').get(k);q.onsuccess=()=>r(q.result||null);q.onerror=()=>r(null)}catch(e){r(null)}})};
const iput=async(k,v)=>{const d=await idb;if(d)try{d.transaction('t','readwrite').objectStore('t').put(v,k)}catch(e){}};
async function getImg(f){let b=await iget(f),fresh=false;
 if(!b)for(const B of BASE){try{const r=await fetch(B+f,{mode:'cors'});if(r.ok){b=await r.blob();fresh=true;break}}catch(e){}}
 if(!b)return null;try{const im=await createImageBitmap(b);if(fresh)iput(f,b);return im}catch(e){return null}}
(async()=>{const ims=await Promise.all(Object.keys(FILES).map(async k=>[k,await getImg(FILES[k])]));let n=0;
 ims.forEach(([k,im])=>{if(im){mkTex(SLOT[k],k,im);have[k]=1;n++}});
 if(have.day)log('🌍 Terra com imagens de satélite reais da NASA (Blue Marble, luzes noturnas e relevo). Ficam guardadas para funcionar sem internet.');
 else log('🌍 Sem acesso às imagens da NASA: a Terra é gerada pelo simulador. Abre uma vez com internet para descarregar as fotografias reais.');})();
// textura escolhida pelo utilizador (Configuração)
document.querySelector('#tx').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const im=await createImageBitmap(f);mkTex(SLOT.day,'day',im);have.day=1;have.water=0;log('🌍 Textura da Terra carregada.')}catch(x){log('⚠ Não foi possível ler essa imagem.')}};

// ---------- Posição real do Sol ----------
function sunVec(ms){const d=new Date(ms),doy=(ms-Date.UTC(d.getUTCFullYear(),0,0))/864e5,dec=-23.44*Math.PI/180*Math.cos(2*Math.PI/365*(doy+10)),
 h=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600,lo=-(h-12)*15*Math.PI/180;return[Math.cos(dec)*Math.sin(lo),Math.sin(dec),Math.cos(dec)*Math.cos(lo)]}

document.body.classList.add('gl');
let sim=Date.now(),last=performance.now(),acc=0,frames=0,scale=Math.min(devicePixelRatio||1,1)*.8,lastDraw=0,hudT='';
function frame(now){requestAnimationFrame(frame);
 const dt=Math.min(.1,(now-last)/1000);last=now;
 sim=CFG.timeLapse?sim+dt*720*1000:(window.__fix?sim:Date.now());
 drawSky();
 if(now-lastDraw<80||document.hidden)return;
 acc+=now-lastDraw;frames++;lastDraw=now;
 if(frames==30){if(acc/frames>140&&scale>.5){scale=Math.max(.5,scale-.15)}frames=0;acc=0}
 const r=wrap.getBoundingClientRect(),W=Math.max(1,Math.round(r.width*scale)),H=Math.max(1,Math.round(r.height*scale));
 if(gc.width!=W||gc.height!=H){gc.width=W;gc.height=H}
 gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 const R=W*1.1,top=.645*H;
 gl.uniform2f(U.uC,W/2,H-top-R);gl.uniform1f(U.uR,R);gl.uniform1f(U.uTilt,.5);gl.uniform1f(U.uLon0,-8.6*Math.PI/180);
 gl.uniform1f(U.uTime,now/1000);gl.uniform1f(U.uExp,theme()=='light'?1.25:1.05);gl.uniform3fv(U.uSun,sunVec(sim));
 gl.uniform1f(U.uDayT,have.day);gl.uniform1f(U.uNightT,have.night);gl.uniform1f(U.uWaterT,have.water);gl.uniform1f(U.uTopoT,have.topo);
 gl.uniform1i(U.uDay,0);gl.uniform1i(U.uNight,1);gl.uniform1i(U.uWater,2);gl.uniform1i(U.uTopo,3);gl.uniform1i(U.uMask,4);
 gl.drawArrays(gl.TRIANGLES,0,3);
 const d=new Date(sim),t=(CFG.timeLapse?'Tempo acelerado ×720':'Iluminação solar real')+' · '+d.toISOString().slice(11,16)+' UTC';
 if(t!=hudT){hudT=t;hud.textContent='☀ '+t}}
earthDraw=function(){};window.earthTime=ms=>{sim=ms};
requestAnimationFrame(frame);
})();
