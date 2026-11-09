// ===================== IoT: servidor (broker MQTT), câmaras, ar condicionado e sensores =====================
(()=>{
const IOT=['cam','ac','sn'],isIot=n=>n&&IOT.includes(n.t),now=()=>Date.now();
const fmt=(v,d=1)=>Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
function ensure(n){if(!n)return n;if(n.on===undefined)n.on=true;
 if(n.t=='ac'){if(n.set==null)n.set=22;if(!n.mode)n.mode='frio';if(n.amb==null)n.amb=26.5}
 if(n.t=='cam'){if(n.rec==null)n.rec=true;if(n.md==null)n.md=true}
 if(n.t=='sn'){if(n.temp==null)n.temp=22.4;if(n.hum==null)n.hum=48;if(!n.ts)n.ts=now()}
 return n}
const devs=()=>nodes.filter(isIot).map(ensure),servers=()=>nodes.filter(n=>n.t=='iot');
Object.assign(ROLE,{iot:'Servidor IoT (broker MQTT sobre TLS, porta 8883): recebe a telemetria dos dispositivos e envia-lhes comandos',
 cam:'Câmara IP (host IoT): envia vídeo e alertas de movimento',ac:'Ar condicionado (host IoT): recebe comandos e envia a temperatura da sala',sn:'Sensor (host IoT): publica temperatura e humidade'});

// ---------- caminho entre o servidor e o dispositivo (as mesmas regras do ping) ----------
const LC=new Map();function link(S,D){if(!S||!D)return{ok:0,why:'?'};const k=S.id+'>'+D.id,c=LC.get(k),t=performance.now();if(c&&t-c.t<500)return c.v;const v=link0(S,D);LC.set(k,{t,v});return v}
// MQTT: é o dispositivo que abre a sessão TLS com o broker (TCP 8883); o comando do broker chega por essa sessão já estabelecida
function link0(S,D){if(!S||!D)return{ok:0,why:'?'};const up_=route(D,S);if(!up_.ok)return{ok:0,why:`${D.name} não chega ao broker: ${up_.msg}`};
 const den=fwDeny(up_.P,D,S,'tcp',8883);if(den)return{ok:0,why:`a sessão MQTT de ${D.name} para o broker é bloqueada. ${den.txt}`};
 const RT=route(S,D,{reply:1});if(!RT.ok)return{ok:0,why:'a resposta não volta: '+RT.msg};const p=RT.P;
 const den2=fwDeny(p,S,D,'tcp',8883,{reply:true});if(den2)return{ok:0,why:den2.txt};
 const ow=RTT(p)/2,sat=p.map(get).filter(isSat);return{ok:1,p,ow,sat,notes:fwNotes(up_.P,D,S,'tcp',8883)}}
const slug=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,''),topic=D=>`satnet/${slug((zones().find(z=>z.m.includes(D))||{g:{name:'rede'}}).g.name)}/${slug(D.name)}`;

// ---------- enviar um comando MQTT ----------
const pend={};
function cmd(S,D,ch,label){ensure(D);LC.clear();const L=link(S,D);
 if(!L.ok){log(`❌ ${S.name} → ${D.name}: comando não entregue. ${L.why}`);return}
 const msg=JSON.stringify(ch);
 log(`📡 MQTT PUBLISH ${S.name} (${S.ip}) → ${D.name} (${D.ip}) · tópico <b>${topic(D)}/set</b> · ${E(msg)} · pela sessão TLS que ${D.name} abriu para o broker (TCP 8883)${L.sat.length?` · via ${L.sat.map(n=>n.name).join(', ')}`:''}`);
 (L.notes||[]).forEach(t=>log('&nbsp;&nbsp;🛡️ '+t));
 pend[D.id]=label;paint();
 setTimeout(()=>{Object.assign(D,ch);if(D.t=='sn'&&ch.on)D.ts=now();pulse(D);
  setTimeout(()=>{delete pend[D.id];log(`&nbsp;&nbsp;✅ ${D.name} confirmou (PUBACK): ${label} · RTT ${fmtT(2*L.ow)}`);paint();save&&save(true)},L.ow)},L.ow)}
function pulse(D){const g=document.querySelector('#iotl');if(!g)return;const c=document.createElementNS('http://www.w3.org/2000/svg','circle'),t0=performance.now();
 c.setAttribute('fill','none');c.setAttribute('stroke','#5be0ff');c.setAttribute('stroke-width','3');g.appendChild(c);
 (function f(t){const k=Math.min(1,(t-t0)/700);c.setAttribute('cx',D.x);c.setAttribute('cy',D.y);c.setAttribute('r',30+30*k);c.setAttribute('opacity',1-k);k<1?requestAnimationFrame(f):c.remove()})(t0)}

// ---------- simulação física (1 vez por segundo) ----------
setInterval(()=>{devs().forEach(n=>{
 if(n.t=='ac'){const out=27.5;if(n.on){const d=n.set-n.amb,okDir=n.mode=='auto'||(n.mode=='frio'&&d<0)||(n.mode=='calor'&&d>0);n.amb+=okDir?d*.06:(out-n.amb)*.01}else n.amb+=(out-n.amb)*.012}
 if(n.t=='sn'&&n.on&&now()-n.ts>=5000){n.temp=Math.max(17,Math.min(30,n.temp+(Math.random()-.5)*.35));n.hum=Math.max(30,Math.min(70,n.hum+(Math.random()-.5)*1.2));n.ts=now()}})},1000);

// ---------- câmara: imagem de vídeo vigilância ----------
function seed(n){return(n.id*9301+49297)%233280/233280}
function feed(cv,n,state){const x=cv.getContext('2d'),w=cv.width,h=cv.height,t=performance.now()/1000;
 if(state!='ok'){const im=x.createImageData(w,h);for(let i=0;i<im.data.length;i+=4){const v=Math.random()*90|0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}x.putImageData(im,0,0);
  x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,h/2-14,w,28);x.fillStyle='#fff';x.font='600 12px Sora,system-ui';x.textAlign='center';x.fillText(state=='off'?'CÂMARA DESLIGADA':state=='pend'?'A LIGAR…':'SEM LIGAÇÃO',w/2,h/2+4);x.textAlign='left';return}
 const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#3a4148');g.addColorStop(.55,'#2a3036');g.addColorStop(.56,'#1b1f23');g.addColorStop(1,'#2b2f33');x.fillStyle=g;x.fillRect(0,0,w,h);
 x.fillStyle='#22272c';x.beginPath();x.moveTo(0,h);x.lineTo(w*.18,h*.56);x.lineTo(w*.82,h*.56);x.lineTo(w,h);x.fill();
 x.strokeStyle='rgba(255,255,255,.05)';for(let i=1;i<6;i++){x.beginPath();x.moveTo(w*.18+i*w*.64/6,h*.56);x.lineTo(i*w/6,h);x.stroke()}
 for(let k=0;k<3;k++){const rx=w*(.22+k*.15),ry=h*.16,rw=w*.11,rh=h*.4;x.fillStyle='#15181b';x.fillRect(rx,ry,rw,rh);x.strokeStyle='#4a5158';x.strokeRect(rx+.5,ry+.5,rw-1,rh-1);
  for(let j=0;j<7;j++){x.fillStyle='#262b30';x.fillRect(rx+3,ry+4+j*rh/7.4,rw-6,rh/9);if(Math.sin(t*6+k*3+j*1.7)>.2){x.fillStyle=j%3?'#7dff9a':'#ffd166';x.fillRect(rx+rw-7,ry+6+j*rh/7.4,2,2)}}}
 x.fillStyle='#3d454c';x.fillRect(w*.74,h*.2,w*.1,h*.36);x.fillStyle='#596169';x.fillRect(w*.825,h*.38,3,3);
 const per=22,ph=((t+seed(n)*per)%per)/per,mov=n.md&&ph<.32;
 if(ph<.32){const px=-20+(w+40)*(ph/.32),py=h*.52,sc=1;x.fillStyle='#0e1012';x.beginPath();x.arc(px,py-30*sc,7*sc,0,7);x.fill();x.beginPath();x.roundRect?x.roundRect(px-9,py-22,18,34,6):x.rect(px-9,py-22,18,34);x.fill();x.fillRect(px-7,py+10,5,16);x.fillRect(px+2,py+10,5,16);
  if(mov){x.strokeStyle='#ffd23f';x.lineWidth=1.5;x.strokeRect(px-16,py-42,32,72);x.fillStyle='#ffd23f';x.font='600 9px Sora,system-ui';x.fillText('MOVIMENTO',px-16,py-46)}}
 const im=x.getImageData(0,0,w,h),d=im.data;for(let i=0;i<d.length;i+=4){const l=(d[i]*.3+d[i+1]*.59+d[i+2]*.11),nz=(Math.random()-.5)*22;d[i]=l*.92+nz;d[i+1]=l*1.02+nz;d[i+2]=l*.95+nz}x.putImageData(im,0,0);
 x.fillStyle='rgba(0,0,0,.12)';for(let y=0;y<h;y+=3)x.fillRect(0,y,w,1);
 x.font='500 10px "IBM Plex Mono",monospace';x.fillStyle='#fff';x.fillText(`${n.name.toUpperCase()}  ${new Date().toLocaleString('pt-PT').replace(',','')}`,6,13);
 if(n.rec&&Math.sin(t*4)>-.2){x.fillStyle='#ff3b3b';x.beginPath();x.arc(w-34,9,3.5,0,7);x.fill();x.fillStyle='#fff';x.fillText('REC',w-27,13)}
 n.mov=mov}

// ---------- painel ----------
const img=t=>window.REAL&&REAL[t]?`<img src="${REAL[t]}" alt="">`:`<svg viewBox="0 0 64 64"><use href="#s-${t}"/></svg>`;
const sw=(on,a,dis)=>`<button class="tg ${on?'on':''}" data-a="${a}" ${dis?'disabled':''} aria-pressed="${on}" title="${on?'Desligar':'Ligar'}"><i></i></button>`;
let cur=null;
function stLine(n,L){if(pend[n.id])return`<span class="st pd">● a enviar: ${pend[n.id]}…</span>`;if(!L.ok)return`<span class="st bad" title="${E(L.why)}">● sem ligação</span>`;
 return`<span class="st ${n.on?'ok':'off'}">● ${n.on?'ligado':'desligado'} · ${fmtT(2*L.ow)}${L.sat.length?' · via satélite':''}</span>`}
function card(S,n){ensure(n);const L=S?link(S,n):{ok:1,ow:0,sat:[]},dis=!L.ok||!!pend[n.id];
 let b='';
 if(n.t=='ac')b=`<div class="ir"><span>Temperatura</span><span class="stp"><button data-a="t-" ${dis||!n.on?'disabled':''}>−</button><b>${n.set} °C</b><button data-a="t+" ${dis||!n.on?'disabled':''}>+</button></span></div>
  <div class="ir"><span>Modo</span><select data-a="mode" ${dis||!n.on?'disabled':''}>${['frio','calor','auto'].map(m=>`<option ${m==n.mode?'selected':''} value="${m}">${{frio:'❄ Frio',calor:'☀ Calor',auto:'⟳ Automático'}[m]}</option>`).join('')}</select></div>
  <div class="ir"><span>Sala</span><b data-live="amb">${fmt(n.amb)} °C</b></div><div class="ir"><span>Consumo</span><b data-live="kw">${n.on?(Math.abs(n.amb-n.set)>.5?'1,2':'0,4'):'0,0'} kW</b></div>`;
 if(n.t=='cam')b=`<canvas class="cv" width="236" height="133" data-cam="${n.id}"></canvas>
  <div class="ir"><span>Gravação</span>${sw(n.rec,'rec',dis||!n.on)}</div><div class="ir"><span>Deteção de movimento</span>${sw(n.md,'md',dis||!n.on)}</div>`;
 if(n.t=='sn')b=`<div class="ir"><span>Temperatura</span><b data-live="temp">${n.on?fmt(n.temp)+' °C':'—'}</b></div><div class="ir"><span>Humidade</span><b data-live="hum">${n.on?fmt(n.hum,0)+' %':'—'}</b></div><div class="ir"><span>Última leitura</span><b data-live="ts">—</b></div>`;
 return`<div class="ic ${n.on?'':'is-off'}" data-dev="${n.id}"><div class="ih">${img(n.t)}<div><b>${E(n.name)}</b><small>${E(n.ip)} · VLAN ${n.vlan}</small>${stLine(n,L)}</div>${sw(n.on,'on',dis)}</div>${b}</div>`}
function paint(){const e=$('#iotb');if(!e||cur==null)return;const n=get(cur);if(!n){e.innerHTML='';return}
 if(n.t=='iot'){const D=devs(),on=D.filter(d=>d.on).length,re=D.filter(d=>link(n,d).ok).length;
  e.innerHTML=`<h3>Painel IoT</h3><div class="ib"><b>Broker MQTT</b> em ${E(n.ip)}:8883 <small>(TLS)</small><br><small>${D.length} dispositivos · ${re} alcançáveis · ${on} ligados</small></div>
  <div class="ia"><button data-all="1">Ligar todos</button><button data-all="0">Desligar todos</button></div>
  ${D.length?D.map(d=>card(n,d)).join(''):'<small>Ainda não há câmaras, ar condicionados ou sensores no mapa.</small>'}
  <small class="inote">Cada dispositivo abre uma sessão MQTT sobre TLS para o broker (TCP 8883) e subscreve o tópico <code>…/set</code>; os comandos chegam por essa sessão. Por isso as ACL têm de permitir o dispositivo → broker na porta 8883, e as respostas passam como «established». <b>Recomendado, mas não simulado:</b> autenticação mútua com certificados de cliente e ACL por tópico no broker.</small>`}
 else if(isIot(n)){const S=servers()[0];e.innerHTML=`<h3>Dispositivo IoT</h3>${card(S||null,n)}<small class="inote">${S?`Controlado por <a href="#" data-srv="${S.id}">${E(S.name)}</a> através de MQTT.`:'Acrescenta um 🏠 Servidor IoT para controlar este dispositivo pela rede.'}</small>`}
 else{e.innerHTML='';return}
 bind(e,n);live()}
function bind(e,n){const S=n.t=='iot'?n:servers()[0];
 e.querySelectorAll('[data-dev]').forEach(c=>{const D=get(+c.dataset.dev),go=(ch,l)=>S?cmd(S,D,ch,l):(Object.assign(D,ch),log(`🔘 ${D.name}: ${l} (botão local)`),paint());
  c.querySelectorAll('[data-a]').forEach(b=>{const a=b.dataset.a,ev=b.tagName=='SELECT'?'onchange':'onclick';b[ev]=()=>{
   if(a=='on')go({on:!D.on},D.on?'desligado':'ligado');
   if(a=='rec')go({rec:!D.rec},D.rec?'gravação parada':'a gravar');
   if(a=='md')go({md:!D.md},D.md?'deteção de movimento desativada':'deteção de movimento ativada');
   if(a=='t+'&&D.set<30)go({set:D.set+1},`temperatura ${D.set+1} °C`);
   if(a=='t-'&&D.set>16)go({set:D.set-1},`temperatura ${D.set-1} °C`);
   if(a=='mode')go({mode:b.value},`modo ${b.value}`)}})});
 e.querySelectorAll('[data-all]').forEach(b=>b.onclick=()=>{const v=b.dataset.all=='1';devs().filter(d=>d.on!=v&&link(n,d).ok).forEach(d=>cmd(n,d,{on:v},v?'ligado':'desligado'))});
 const a=e.querySelector('[data-srv]');if(a)a.onclick=ev=>{ev.preventDefault();focusNode(+a.dataset.srv)}}
function live(){const e=$('#iotb');if(!e||cur==null)return;const n=get(cur);if(!n)return;const S=n.t=='iot'?n:servers()[0];
 e.querySelectorAll('[data-dev]').forEach(c=>{const D=get(+c.dataset.dev);if(!D)return;const ok=!S||link(S,D).ok,show=v=>ok?v:'—';
  const q=k=>c.querySelector(`[data-live="${k}"]`);
  if(q('amb'))q('amb').textContent=show(fmt(D.amb)+' °C');if(q('kw'))q('kw').textContent=show((D.on?(Math.abs(D.amb-D.set)>.5?'1,2':'0,4'):'0,0')+' kW');
  if(q('temp'))q('temp').textContent=D.on?show(fmt(D.temp)+' °C'):'—';if(q('hum'))q('hum').textContent=D.on?show(fmt(D.hum,0)+' %'):'—';
  if(q('ts'))q('ts').textContent=D.on&&ok?`há ${Math.round((now()-D.ts)/1000)} s`:'—';
  const cv=c.querySelector('canvas[data-cam]');if(cv)feed(cv,D,pend[D.id]?'pend':!ok?'nolink':D.on?'ok':'off')})}
setInterval(live,1000/8);

// ligar o painel à seleção de dispositivos
const _fn=focusNode;window.focusNode=focusNode=function(i){_fn(i);cur=i;const n=get(i);
 const box=$('#node');if(box&&n&&!$('#iotb')){const d=document.createElement('div');d.id='iotb';box.appendChild(d)}
 if(n&&(n.t=='iot'||isIot(n)))$('#panel').classList.remove('h');paint()};

// ---------- efeitos no mapa ----------
const svgNS='http://www.w3.org/2000/svg',layer=document.createElementNS(svgNS,'g');layer.id='iotl';layer.setAttribute('pointer-events','none');
const pk=document.querySelector('#pk');pk.parentNode.insertBefore(layer,pk);
const fx=document.createElementNS(svgNS,'g');layer.appendChild(fx);
const stl=document.createElement('style');document.head.appendChild(stl);let lastCss='';
const pill=(x,y,t,c)=>{const w=t.length*6+16;return`<rect x="${x-w/2}" y="${y-10}" width="${w}" height="19" rx="9.5" fill="rgba(6,10,22,.85)" stroke="${c}" stroke-opacity=".7"/><text x="${x}" y="${y+3.5}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${c}">${t}</text>`};
function draw(){const t=performance.now()/1000;let h='',css='';
 nodes.forEach(n=>{if(n.t=='iot'){const D=devs(),on=D.filter(d=>d.on&&link(n,d).ok).length;h+=pill(n.x,n.y+72,`MQTT · ${on}/${D.length} ligados`,'#5be0ff');return}
  if(!isIot(n))return;ensure(n);
  if(!n.on){css+=`g[data-id="${n.id}"] image,g[data-id="${n.id}"] use{filter:grayscale(1) brightness(.42)}`;h+=`<g transform="translate(${n.x+27},${n.y-30})"><circle r="9" fill="#1b2233" stroke="#8a93a6"/><path d="M0 -4.5 V0 M-3.6 -2.6 A4.5 4.5 0 1 0 3.6 -2.6" stroke="#c9d1e0" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;return}
  if(n.t=='ac'){const c=n.mode=='calor'?'#ffb36b':'#9fd8ff';for(let k=0;k<3;k++){const o=((t*22+k*9)%27),a=1-o/27;
    h+=`<path d="M${n.x-22+k*22} ${n.y+12+o} q5 4 0 8 q-5 4 0 8" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity="${(a*.85).toFixed(2)}"/>`}
   h+=pill(n.x,n.y+72,`${n.mode=='calor'?'☀':n.mode=='auto'?'⟳':'❄'} ${n.set} °C · sala ${fmt(n.amb)} °C`,c)}
  if(n.t=='cam'){if(n.rec&&Math.sin(t*4)>-.2)h+=`<g transform="translate(${n.x+26},${n.y-32})"><circle r="8" fill="rgba(6,10,22,.85)"/><circle r="4.2" fill="#ff3b3b"/></g>`;
   if(n.mov)h+=pill(n.x,n.y+72,'⚠ movimento detetado','#ffd23f')}
  if(n.t=='sn')h+=pill(n.x,n.y+72,`🌡 ${fmt(n.temp)} °C · 💧 ${fmt(n.hum,0)} %`,'#7dffb0')});
 // a câmara deteta movimento mesmo com o painel fechado
 devs().forEach(n=>{if(n.t=='cam'&&n.on&&n.md){const per=22,ph=((t+seed(n)*per)%per)/per;n.mov=ph<.32}else if(n.t=='cam')n.mov=false});
 fx.innerHTML=h;if(css!=lastCss){stl.textContent=css;lastCss=css}}draw();setInterval(()=>{if(!document.hidden)draw()},66);
window.iotPaint=paint;
})();
