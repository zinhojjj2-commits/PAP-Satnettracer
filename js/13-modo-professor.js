// ===================== 12. Modo professor: início, laboratório Satélite–Terra, aulas guiadas, desafio e glossário =====================
// Objetivo: dar aos professores uma ferramenta para explicarem, com números reais, a ligação entre a Terra e um satélite.
// Os cálculos usam as mesmas constantes do resto do simulador (R = 6371 km, c = 299 792,458 km/s).
(()=>{
const $$=s=>[...document.querySelectorAll(s)];
const C=299792.458,RE=6371,MU=398600.4418,HGEO=35786;
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI,lg=Math.log10;
const fx=(v,d=1)=>Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
const km=v=>Math.round(v).toLocaleString('pt-PT');
const ms=v=>v<10?fx(v,2)+' ms':v<100?fx(v,1)+' ms':fx(v,0)+' ms';
const SUP={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
const sci=x=>{if(!isFinite(x)||x<=0)return'—';const e=Math.floor(lg(x)),m=x/10**e;return`${fx(m,1)} × 10${String(e).split('').map(c=>SUP[c]).join('')}`};
const dur=s=>!isFinite(s)?'permanente':s<90?fx(s,0)+' s':s<7200?fx(s/60,1)+' min':Math.floor(s/3600)+' h '+String(Math.round(s%3600/60)).padStart(2,'0')+' min';
const cd=(t,b)=>`<div class="pc"><h4>${t}</h4><div>${b}</div></div>`;

// ---------- física da ligação ----------
// distância oblíqua estação → satélite e ângulo ao centro da Terra entre a estação e o ponto subsatélite
const slantD=(h,e)=>Math.sqrt((RE+h)**2-(RE*Math.cos(rad(e)))**2)-RE*Math.sin(rad(e));
const cAng=(h,e)=>Math.max(0,deg(Math.acos(Math.min(1,RE*Math.cos(rad(e))/(RE+h))))-e);
const BANDS={L:{n:'Banda L',dn:1.5,up:1.6,use:'GPS e Galileo, telefones por satélite (Iridium, Inmarsat).'},S:{n:'Banda S',dn:2.2,up:2.0,use:'Telemetria e controlo de satélites, rádio por satélite.'},C:{n:'Banda C',dn:4,up:6,use:'TV profissional e regiões tropicais: quase não sofre com a chuva, mas exige antenas grandes.'},Ku:{n:'Banda Ku',dn:12,up:14,use:'TV por satélite, VSAT e Starlink: antenas pequenas, alguma sensibilidade à chuva.'},Ka:{n:'Banda Ka',dn:20,up:30,use:'Internet de alto débito: muita capacidade, mas muito sensível à chuva.'}};
// ITU-R P.838-3: coeficientes k e α da atenuação específica da chuva (polarização horizontal)
const KR=[[1,.0000259,.9691],[2,.0000847,1.0664],[4,.0001071,1.6009],[6,.0007056,1.59],[8,.004115,1.3905],[10,.01217,1.2571],[12,.02386,1.1825],[15,.04481,1.1233],[20,.09164,1.0568],[25,.1571,.9991],[30,.2403,.9485]];
function kAlpha(f){let i=KR.findIndex(r=>r[0]>=f);if(i<0)i=KR.length-1;if(i==0)i=1;const[f1,k1,a1]=KR[i-1],[f2,k2,a2]=KR[i],t=(lg(f)-lg(f1))/(lg(f2)-lg(f1));return{k:10**(lg(k1)+t*(lg(k2)-lg(k1))),a:a1+t*(a2-a1)}}
const gasZ=f=>f<3?.035:f<8?.05:f<16?.1:f<24?.45:.35;   // absorção típica por oxigénio e vapor de água, na vertical (dB)
// DVB-S2 (ETSI EN 302 307): Es/N0 mínimo (dB) e eficiência espectral (bit/símbolo)
const MC=[['QPSK 1/4',-2.35,.490],['QPSK 1/2',1.00,.989],['QPSK 3/4',4.03,1.487],['8PSK 2/3',6.62,1.981],['8PSK 3/4',7.91,2.228],['8PSK 5/6',9.35,2.479],['16APSK 3/4',10.21,2.967],['16APSK 5/6',11.61,3.300],['32APSK 3/4',12.73,3.703],['32APSK 9/10',16.05,4.453]];
const MARGIN=1;   // folga de implementação exigida acima do limiar (dB)

function calc(s){const h=s.h,e=s.e,d=slantD(h,e),g=cAng(h,e),a=RE+h,T=2*Math.PI*Math.sqrt(a**3/MU),v=Math.sqrt(MU/a),geo=Math.abs(h-HGEO)<60;
 const l0=cAng(h,s.emin),cov=(1-Math.cos(rad(l0)))/2,nmin=Math.ceil(2/(1-Math.cos(rad(l0))));
 const t1=d/C*1000,ground=RE*rad(2*g),fib=2*ground/(.67*C)*1000,pass=geo?Infinity:(2*l0/360)*T,vr=geo?0:v*RE*Math.cos(rad(s.emin))/a;
 const B=BANDS[s.band],f=B.dn,lam=.299792458/f,fspl=92.45+20*lg(d)+20*lg(f);
 const G=Math.max(0,10*lg(.65*(Math.PI*s.D/lam)**2)),bw=70*lam/s.D;
 const ka=kAlpha(f),gam=s.rain>0?ka.k*s.rain**ka.a:0,Ls=(3.4-.1)/Math.sin(rad(Math.max(5,e))),LG=Ls*Math.cos(rad(e)),r=1/(1+LG/(35*Math.exp(-.015*s.rain))),arain=gam*Ls*r;
 const agas=gasZ(f)/Math.sin(rad(Math.max(5,e))),lo=.8,Ltot=fspl+arain+agas+lo,Pr=s.eirp-Ltot+G,GT=G-10*lg(s.T),CN0=s.eirp-Ltot+GT+228.6,Rs=s.B*1e6/1.2,EsN0=CN0-10*lg(Rs);
 const mc=[...MC].reverse().find(m=>EsN0>=m[1]+MARGIN)||null,rate=mc?Rs*mc[2]/1e6:0;
 return{h,e,d,g,a,T,v,geo,l0,cov,nmin,t1,ground,fib,pass,vr,dop:f*1e9*vr/C,f,fu:B.up,lam,fspl,G,bw,k:ka.k,al:ka.a,gam,Ls,r,arain,agas,lo,Ltot,Pr,GT,CN0,Rs,EsN0,mc,rate}}
window.SATLAB={calc,slantD,cAng};

// ---------- estado e exemplos ----------
const P0={h:HGEO,e:45,band:'Ku',D:.9,eirp:52,T:150,B:36,rain:0,emin:10,view:'auto',showF:true,pre:null};
const S={...P0};
const PRE={
 tv:{n:'📺 TV por satélite (GEO · Ku)',h:35786,e:42,band:'Ku',D:.8,eirp:52,T:150,B:36,rain:0,emin:10,txt:'Uma parabólica de 80 cm em Portugal a receber um satélite de televisão geoestacionário.'},
 leo:{n:'🌐 Internet LEO (tipo Starlink)',h:550,e:40,band:'Ku',D:.5,eirp:36,T:200,B:240,rain:0,emin:25,txt:'Um terminal de internet a comunicar com um satélite em órbita baixa. O satélite move-se depressa e o terminal tem de passar de um satélite para outro (handover).'},
 gps:{n:'📍 GPS (MEO · banda L)',h:20200,e:45,band:'L',D:.1,eirp:27,T:300,B:2,rain:0,emin:10,txt:'Um recetor GPS com uma antena minúscula. O sinal chega abaixo do ruído e só é recuperado graças ao espalhamento de espectro.'},
 ka:{n:'⛈️ Tempestade em banda Ka (GEO)',h:35786,e:42,band:'Ka',D:.75,eirp:56,T:200,B:36,rain:40,emin:10,txt:'Internet por satélite em banda Ka durante uma tempestade de 40 mm/h: as gotas de chuva absorvem o sinal.'},
 low:{n:'🧭 Antena quase no horizonte (GEO · 10°)',h:35786,e:10,band:'Ku',D:.8,eirp:52,T:150,B:36,rain:0,emin:10,txt:'Uma estação muito a norte (ou longe da longitude do satélite) vê o GEO quase no horizonte: o sinal percorre mais distância e mais atmosfera.'}};
const ORB=[[550,'LEO 550 km'],[1200,'LEO 1 200 km'],[8062,'MEO 8 062 km'],[20200,'MEO 20 200 km'],[35786,'GEO 35 786 km']];
const LI=[['h','Altitude do satélite',0,1000,1,v=>km(v)+' km'],['e','Ângulo de elevação da antena',5,90,1,v=>fx(v,0)+'°'],['emin','Elevação mínima de serviço',0,40,1,v=>fx(v,0)+'°'],
 ['D','Diâmetro da antena recetora',.1,4.5,.05,v=>fx(v,2)+' m'],['eirp','Potência irradiada pelo satélite (EIRP)',20,65,.5,v=>fx(v,1)+' dBW'],['T','Temperatura de ruído do recetor',50,600,10,v=>fx(v,0)+' K'],
 ['B','Largura de banda do canal',1,500,1,v=>fx(v,0)+' MHz'],['rain','Intensidade da chuva',0,100,1,v=>v==0?'sem chuva':fx(v,0)+' mm/h'+(v<5?' · fraca':v<20?' · moderada':v<50?' · forte':' · tempestade')]];
const toSl=h=>1000*lg(h/300)/lg(120),fromSl=x=>300*120**(x/1000);
const snap=h=>{for(const[o]of ORB)if(Math.abs(h-o)/o<.015)return o;return h<2000?Math.round(h/10)*10:Math.round(h/50)*50};
const satImg=h=>window.REAL&&REAL[h<2000?'leo':'geo']||'',gsImg=()=>window.REAL&&REAL.gs||'';
const kind=h=>h<2000?'LEO':Math.abs(h-HGEO)<60?'GEO':h<HGEO?'MEO':'acima do GEO';

// ---------- sobreposições ----------
const OV=['hub','lab','qz','gloss'];
function syncBtns(){[['labb','lab'],['aulb','aul'],['qzb','qz'],['hmb','hub']].forEach(([b,o])=>{const B=$('#'+b),O=$('#'+o);if(B&&O)B.classList.toggle('on',!O.hidden)})}
function showOv(id){OV.forEach(o=>{const e=$('#'+o);if(e)e.hidden=o!=id});closeMnu();syncBtns()}
function hideOv(id){const e=$('#'+id);if(e)e.hidden=true;if(id=='lab')stopAnim();syncBtns()}

// ---------- HTML ----------
const sl=([k,l,a,b,s])=>`<label><span>${l} <b id="lv_${k}"></b></span><input type="range" data-l="${k}" min="${a}" max="${b}" step="${s}"></label>`;
document.body.insertAdjacentHTML('beforeend',`
<div id="hub" class="ov" hidden><div class="ovb"><div class="hubw">
 <div class="hubt"><img src="${satImg(HGEO)}" alt=""><div><div class="hubk">PAP · Comunicação com Satélites</div><h1>SatNet Tracer</h1><p>Uma ferramenta para os professores explicarem, na sala de aula, como a Terra comunica com os satélites: o caminho do sinal, a distância, o atraso, as órbitas, as frequências e a segurança, sempre com números reais e as contas à vista.</p></div></div>
 <div class="hubg">
  <button class="hubc main" data-go="lab"><i>🔬</i><b>Laboratório Satélite–Terra</b><span>Escolhe a órbita, o ângulo da antena, a banda de frequências e a chuva. A turma vê o sinal a subir e a descer, e o simulador calcula a distância, o atraso, a cobertura e a potência que chega à antena.</span></button>
  <button class="hubc" data-go="aul"><i>📚</i><b>Aulas guiadas</b><span id="hubaul"></span></button>
  <button class="hubc" data-go="net"><i>🗺️</i><b>Simulador de rede</b><span>Estações terrestres, satélites GEO e LEO, VLAN, routing OSPF, VoIP, IoT e ataques. Cada ping é explicado passo a passo.</span></button>
  <button class="hubc" data-go="qz"><i>🏆</i><b>Desafio para os alunos</b><span id="hubqz"></span></button>
  <button class="hubc" data-go="gl"><i>📖</i><b>Glossário</b><span>Os termos essenciais, de «uplink» a «MODCOD», explicados em linguagem simples.</span></button>
  <button class="hubc" data-go="pr"><i>🎓</i><b>Apresentação da PAP</b><span>Os diapositivos do projeto, para a defesa perante o júri.</span></button>
 </div>
 <div class="hubs">
  <div><h4>Como usar numa aula de 45 minutos</h4><ol><li>Abre o <b>Laboratório</b> no exemplo «TV por satélite» e envia um ping: a turma vê o sinal a viajar e o relógio a contar.</li><li>Segue uma <b>aula guiada</b>: carrega em ▶ em cada passo, lê a explicação e faz a pergunta à turma.</li><li>Termina com o <b>Desafio</b> projetado, com a turma a responder em conjunto.</li></ol></div>
  <div><h4>O que os alunos ficam a saber</h4><ul><li>Distinguir subida (uplink), descida (downlink), estação terrestre e transponder</li><li>Calcular o atraso com t = d / c e o RTT de um ping</li><li>Comparar as órbitas GEO, MEO e LEO</li><li>Explicar o efeito da elevação, da frequência e da chuva</li><li>Perceber porque é que o sinal tem de ser cifrado</li></ul></div>
  <div><h4>Rigor técnico</h4>Fórmulas e valores de referência: ITU-R P.618, P.676 e P.838 (propagação e chuva), ITU-T G.114 e G.107 (voz), ETSI EN 302 307 (DVB-S2), RFC 792 e 826 (ICMP e ARP) e IEEE 802.1Q (VLAN). Os modelos estão simplificados para fins didáticos e essa simplificação é indicada onde se aplica.</div>
 </div>
 <div class="hubf"><span>PAP de <b>Hugo Leonel Ferreira Augusto</b> · 12.º IIGR · Escola Profissional de Gaia · versão 2.0 · funciona sem internet e sem instalação</span><label><input type="checkbox" id="hubk"> Mostrar esta página sempre que abrir</label><button class="pri" data-x>Começar →</button></div>
</div></div></div>

<div id="lab" class="ov" hidden>
 <div class="ovh"><b>🔬 Laboratório Satélite–Terra</b><span class="ovs">O que acontece entre a antena e o satélite, com as contas à vista</span><div class="sp" style="flex:1"></div><button id="lfs">⛶ Ecrã inteiro</button><button data-x>✕ Fechar</button></div>
 <div class="labg">
  <aside class="labc">
   <h5>Exemplos prontos para a aula</h5><div class="lpre">${Object.entries(PRE).map(([k,p])=>`<button data-pre="${k}">${p.n}</button>`).join('')}</div><p class="lnote" id="lptx"></p>
   <h5>Órbita e geometria</h5><div class="lseg" id="lorb">${ORB.map(([h,n])=>`<button data-h="${h}">${n}</button>`).join('')}</div>
   ${LI.slice(0,3).map(sl).join('')}
   <h5>Sinal rádio (descida até à antena)</h5>
   <label><span>Banda de frequências</span><select data-l="band">${Object.entries(BANDS).map(([k,b])=>`<option value="${k}">${b.n} · ↓ ${b.dn.toLocaleString('pt-PT')} / ↑ ${b.up.toLocaleString('pt-PT')} GHz</option>`).join('')}</select></label><p class="lnote" id="lbtx"></p>
   ${LI.slice(3).map(sl).join('')}
   <label class="chk"><input type="checkbox" data-l="showF"> Mostrar as fórmulas com os valores</label>
   <button id="lrst">↺ Repor os valores iniciais</button>
  </aside>
  <section class="labv">
   <div class="lvbar"><button id="lsend" class="pri">▶ Enviar um ping</button><span id="lclock"></span><div class="lseg" id="lview"><button data-v="auto">Automático</button><button data-v="earth">Terra inteira</button><button data-v="zoom">Aproximar</button></div></div>
   <svg id="lsvg" viewBox="0 0 900 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Geometria da ligação entre as estações terrestres e o satélite, à escala"></svg>
   <div class="lins" id="lins"></div>
   <div class="lres" id="lres"></div>
   <div class="lsec" id="lform"></div>
   <div class="lsec" id="lcmp"></div>
  </section>
 </div>
</div>

<div id="qz" class="ov" hidden><div class="ovh"><b>🏆 Desafio para os alunos</b><span class="ovs">Projeta e responde em turma</span><div style="flex:1"></div><button data-qrst>↺ Recomeçar</button><button data-x>✕ Fechar</button></div><div class="ovb"><div class="qzw" id="qzc"></div></div></div>

<div id="gloss" class="ov" hidden><div class="ovh"><b>📖 Glossário</b><span class="ovs">Termos essenciais das comunicações por satélite</span><div style="flex:1"></div><button data-x>✕ Fechar</button></div><div class="ovb"><div class="glw"><input id="gls" type="search" placeholder="Procurar um termo (ex.: elevação, Doppler, Ka)…" aria-label="Procurar no glossário"><div class="glg" id="glg"></div></div></div></div>`);
$('#wrap').insertAdjacentHTML('beforeend',`<div id="aul" hidden><div class="auh"><b>📚 Aulas guiadas</b><button data-x title="Fechar as aulas">✕</button></div><div id="aulx"></div></div>`);

// ---------- laboratório: controlos ----------
function applyPre(k){Object.assign(S,P0,PRE[k],{view:'auto',showF:S.showF,pre:k})}
function syncUI(){LI.forEach(([k,,,,,f])=>{const i=$(`#lab [data-l="${k}"]`);if(i)i.value=k=='h'?toSl(S.h):S[k];const b=$('#lv_'+k);if(b)b.textContent=f(S[k])});
 $('#lab [data-l="band"]').value=S.band;$('#lab [data-l="showF"]').checked=!!S.showF;
 $$('#lab [data-pre]').forEach(b=>b.classList.toggle('on',b.dataset.pre==S.pre));
 $$('#lorb [data-h]').forEach(b=>b.classList.toggle('on',+b.dataset.h==S.h));
 $$('#lview [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v==S.view));
 $('#lptx').textContent=S.pre?PRE[S.pre].txt:'';$('#lbtx').textContent=BANDS[S.band].use}
$('#lab .labc').addEventListener('input',e=>{const k=e.target.dataset.l;if(!k)return;
 if(k=='band')S.band=e.target.value;else if(k=='showF')S.showF=e.target.checked;else{let v=+e.target.value;if(k=='h')v=snap(fromSl(v));S[k]=v}
 if(k!='showF')S.pre=null;update()});
$('#lab .labc').addEventListener('click',e=>{const p=e.target.closest('[data-pre]'),o=e.target.closest('[data-h]');
 if(p){applyPre(p.dataset.pre);update()}else if(o){S.h=+o.dataset.h;S.pre=null;update()}});
$('#lview').onclick=e=>{const b=e.target.closest('[data-v]');if(b){S.view=b.dataset.v;update()}};
$('#lrst').onclick=()=>{Object.assign(S,P0);update()};
$('#lsend').onclick=()=>send();
$('#lfs').onclick=()=>{try{document.fullscreenElement?document.exitFullscreen():$('#lab').requestFullscreen()}catch(x){}};

// ---------- laboratório: desenho à escala ----------
const STARS=(()=>{let s='',x=7;const r=()=>(x=(x*16807)%2147483647)/2147483647;for(let i=0;i<140;i++)s+=`<circle cx="${(r()*900).toFixed(1)}" cy="${(r()*560).toFixed(1)}" r="${(.4+r()*1.1).toFixed(2)}" fill="#fff" opacity="${(.2+r()*.6).toFixed(2)}"/>`;return s})();
let GEOM=null,anim=0;
const tx=(x,y,t,o='')=>`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#e6ebff" font-size="13" paint-order="stroke" stroke="#02040c" stroke-width="4" stroke-linejoin="round" ${o}>${t}</text>`;
function img(href,x,y,w,rot){return href?`<image href="${href}" x="${(x-w/2).toFixed(1)}" y="${(y-w/2).toFixed(1)}" width="${w}" height="${w}"${rot?` transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"`:''}/>`:`<circle cx="${x}" cy="${y}" r="${w/4}" fill="#ffb84d"/>`}
function draw(R){const W=900,H=560,g=rad(R.g),h=S.h,A=[0,RE],P=[(RE+h)*Math.sin(g),(RE+h)*Math.cos(g)],B=[RE*Math.sin(2*g),RE*Math.cos(2*g)];
 const v=S.view=='auto'?(h<6000?'zoom':'earth'):S.view;let x0,x1,y0,y1;
 if(v=='earth'){x0=Math.min(-RE,P[0]);x1=Math.max(RE,P[0]);y0=Math.min(-RE,P[1]);y1=Math.max(RE,P[1])}
 else{x0=Math.min(A[0],P[0],B[0]);x1=Math.max(A[0],P[0],B[0]);y1=Math.max(A[1],P[1]);y0=Math.min(A[1],B[1]);const sp=Math.max(x1-x0,y1-y0,400);y0-=sp*.32;x0-=sp*.14;x1+=sp*.14;y1+=sp*.06}
 const k=Math.min(W/((x1-x0)*1.14),H/((y1-y0)*1.2)),cx=(x0+x1)/2,cy=(y0+y1)/2,T=([x,y])=>[W/2+(x-cx)*k,H/2-(y-cy)*k];
 const O=T([0,0]),a=T(A),p=T(P),b=T(B),rE=RE*k;
 let s=`<defs><radialGradient id="lEg" cx="42%" cy="30%" r="75%"><stop offset="0" stop-color="#4d9be6"/><stop offset=".55" stop-color="#1d5aa8"/><stop offset="1" stop-color="#071a40"/></radialGradient><radialGradient id="lPk" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#ffe7b0"/><stop offset="1" stop-color="#ff7a3c" stop-opacity="0"/></radialGradient><filter id="lBl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>${STARS}`;
 // Terra e atmosfera (à escala: a camada de 100 km é desenhada com pelo menos 3 px)
 s+=`<circle cx="${O[0]}" cy="${O[1]}" r="${Math.max(rE+3,(RE+100)*k)}" fill="rgba(110,180,255,.28)" filter="url(#lBl)"/><circle cx="${O[0]}" cy="${O[1]}" r="${rE}" fill="${v=='earth'?'url(#lEg)':'#1b56a3'}" stroke="#8fd0ff" stroke-width="1.5"/>`;
 // órbita
 s+=`<circle cx="${O[0]}" cy="${O[1]}" r="${((RE+h)*k).toFixed(1)}" fill="none" stroke="#ffb84d" stroke-width="1.4" stroke-dasharray="5 7" opacity=".6"/>`;
 // zona de cobertura do satélite (elevação ≥ e_min)
 const pts=[];for(let i=0;i<=60;i++){const f=rad(R.g-R.l0+2*R.l0*i/60);pts.push(T([RE*Math.sin(f),RE*Math.cos(f)]))}const pl=pts.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join('L');
 s+=`<path d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${pl}Z" fill="rgba(255,184,77,.09)"/><path d="M${pl}" fill="none" stroke="#ffb84d" stroke-width="5" stroke-linecap="round" opacity=".8"/>`;
  // horizonte local e ângulo de elevação na estação A
 s+=`<line x1="${a[0]-120}" y1="${a[1]}" x2="${a[0]+170}" y2="${a[1]}" stroke="#fff" stroke-dasharray="3 5" opacity=".45"/>`+tx(a[0]+174,a[1]+4,'horizonte','font-size="11" opacity=".75"');
 const r0=62,e=rad(S.e);s+=`<path d="M${a[0]+r0} ${a[1]} A${r0} ${r0} 0 0 0 ${(a[0]+r0*Math.cos(e)).toFixed(1)} ${(a[1]-r0*Math.sin(e)).toFixed(1)}" fill="none" stroke="#3ddc97" stroke-width="2.5"/>`+tx(a[0]+(r0+12)*Math.cos(e/2),a[1]-(r0+12)*Math.sin(e/2)+4,`e = ${fx(S.e,0)}°`,'fill="#3ddc97" font-weight="700"');
 // trajetos rádio: subida A → satélite e descida satélite → B
 s+=`<line x1="${a[0]}" y1="${a[1]}" x2="${p[0]}" y2="${p[1]}" stroke="#7fd4ff" stroke-width="2.6" stroke-dasharray="10 6"/><line x1="${p[0]}" y1="${p[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ffb84d" stroke-width="2.6" stroke-dasharray="10 6"/>`;
 const lab=(q1,q2,t,side,col)=>{const mx=(q1[0]+q2[0])/2,my=(q1[1]+q2[1])/2,dx=q2[0]-q1[0],dy=q2[1]-q1[1],L=Math.hypot(dx,dy)||1,ox=-dy/L*side,oy=dx/L*side;return tx(mx+ox,my+oy,t,`fill="${col}" font-weight="600" text-anchor="middle"`)};
 s+=lab(a,p,`↑ subida · ${fx(R.fu,1)} GHz`,-22,'#7fd4ff')+lab(a,p,`d = ${km(R.d)} km`,24,'#e6ebff')+lab(p,b,`↓ descida · ${fx(R.f,1)} GHz`,-22,'#ffb84d');
 // chuva perto da estação A
 if(S.rain>0){const L=Math.hypot(p[0]-a[0],p[1]-a[1])||1,ux=(p[0]-a[0])/L,uy=(p[1]-a[1])/L,c=[a[0]+ux*Math.min(80,L*.4),a[1]+uy*Math.min(80,L*.4)],nd=Math.min(14,2+Math.round(S.rain/6));let dr='';for(let i=0;i<nd;i++){const x=c[0]-26+i*52/Math.max(1,nd-1),y=c[1]+14+(i%3)*5;dr+=`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x-4).toFixed(1)}" y2="${(y+11).toFixed(1)}" stroke="#7fc8ff" stroke-width="2" stroke-linecap="round"/>`}
  s+=`<g opacity=".95">${dr}<circle cx="${c[0]-14}" cy="${c[1]+2}" r="12" fill="#9aa6b8"/><circle cx="${c[0]+2}" cy="${c[1]-6}" r="15" fill="#aeb9ca"/><circle cx="${c[0]+18}" cy="${c[1]+3}" r="11" fill="#9aa6b8"/><rect x="${c[0]-26}" y="${c[1]+2}" width="56" height="11" rx="5" fill="#9aa6b8"/></g>`+tx(c[0]+36,c[1]+4,`${fx(S.rain,0)} mm/h`,'font-size="12" fill="#bfe3ff"')}
 // equipamentos
 s+=img(gsImg(),a[0],a[1]-14,48,0)+img(gsImg(),b[0]+14*Math.sin(2*g),b[1]-14*Math.cos(2*g),48,2*R.g)+img(satImg(h),p[0],p[1],h<2000?60:72,0);
 s+=tx(a[0],a[1]+26,'Estação A','text-anchor="middle" font-weight="700"')+tx(b[0]+4,b[1]+26,'Estação B','text-anchor="middle" font-weight="700"');
 {const ly=p[1]-44<22?p[1]+56:p[1]-44,lx=Math.max(150,Math.min(W-150,p[0]));s+=tx(lx,ly,`Satélite ${kind(h)} · ${km(h)} km de altitude`,'text-anchor="middle" font-weight="700" fill="#ffd9a0"')}
 s+=`<line x1="${W-372}" y1="${H-22}" x2="${W-348}" y2="${H-22}" stroke="#ffb84d" stroke-width="5" stroke-linecap="round"/>`+tx(W-20,H-18,`cobertura com elevação ≥ ${S.emin}°: ${fx(100*R.cov,1)} % da Terra`,'text-anchor="end" font-size="12" fill="#ffd9a0"')+`<line x1="${W-372}" y1="${H-42}" x2="${W-348}" y2="${H-42}" stroke="#3ddc97" stroke-width="3"/>`+tx(W-20,H-38,'ângulo de elevação da antena','text-anchor="end" font-size="12" fill="#a6f0cf"');
 if(v=='earth'&&rE>40)s+=tx(O[0],O[1]+rE*.45,`Terra · raio ${km(RE)} km`,'text-anchor="middle" font-size="12" opacity=".85"');
 // barra de escala
 const tg=110/k,e10=10**Math.floor(lg(tg)),sc=[1,2,5,10].map(m=>m*e10).reduce((q,m)=>Math.abs(m-tg)<Math.abs(q-tg)?m:q),px=sc*k;
 s+=`<g transform="translate(20 ${H-22})"><line x1="0" y1="0" x2="${px.toFixed(1)}" y2="0" stroke="#fff" stroke-width="2"/><line x1="0" y1="-5" x2="0" y2="5" stroke="#fff" stroke-width="2"/><line x1="${px.toFixed(1)}" y1="-5" x2="${px.toFixed(1)}" y2="5" stroke="#fff" stroke-width="2"/></g>`+tx(20,H-30,`${km(sc)} km · desenho à escala real`,'font-size="11" opacity=".85"');
 s+=`<g id="lpk"></g>`;
 $('#lsvg').innerHTML=s;GEOM={a,p,b}}

// ---------- laboratório: sinal animado em câmara lenta ----------
const CLK0='Carrega em ▶ para ver o sinal a viajar. A animação é em câmara lenta e o relógio mostra o tempo real.';
function stopAnim(){cancelAnimationFrame(anim);anim=0}
function send(){const R=calc(S);if(!GEOM)return;stopAnim();const g=$('#lpk');if(!g)return;g.innerHTML='';
 const leg=R.t1,F=[1,2,5,10,20,50,100,200,500,1000,2000].find(f=>leg*f>=850)||2000,pts=[GEOM.a,GEOM.p,GEOM.b,GEOM.p,GEOM.a];
 const PH=['1.º trajeto · subida: Echo Request da Estação A para o satélite','2.º trajeto · descida: do satélite para a Estação B','3.º trajeto · subida: Echo Reply da Estação B para o satélite','4.º trajeto · descida: do satélite de volta à Estação A'];
 const NS='http://www.w3.org/2000/svg',c=document.createElementNS(NS,'circle'),tr=document.createElementNS(NS,'polyline');
 tr.setAttribute('fill','none');tr.setAttribute('stroke','#ffe7b0');tr.setAttribute('stroke-width','3');tr.setAttribute('opacity','.55');tr.setAttribute('stroke-linecap','round');c.setAttribute('r','13');c.setAttribute('fill','url(#lPk)');g.append(tr,c);
 const t0=performance.now(),tot=leg*F*4,ck=$('#lclock'),hist=[];
 (function f(now){const el=Math.max(0,now-t0),u=Math.min(1,el/tot),q=u*4,i=Math.min(3,Math.floor(q)),w=q-i,A=pts[i],B=pts[i+1],x=A[0]+(B[0]-A[0])*w,y=A[1]+(B[1]-A[1])*w;
  c.setAttribute('cx',x);c.setAttribute('cy',y);hist.push(x.toFixed(1)+','+y.toFixed(1));if(hist.length>14)hist.shift();tr.setAttribute('points',hist.join(' '));
  ck.innerHTML=`<b>t = ${ms(Math.min(el/F,leg*4))}</b> · ${PH[i]} <small style="opacity:.7">(câmara lenta ×${F})</small>`;
  if(u<1)anim=requestAnimationFrame(f);else{anim=0;tr.remove();ck.innerHTML=`✅ <b>RTT mínimo = ${ms(leg*4)}</b> · 4 trajetos de ${ms(leg)} cada <small style="opacity:.7">(na realidade, ${F} ${F==1?'vez':'vezes'} mais depressa do que a animação)</small>`;setTimeout(()=>c.remove(),500)}})(t0)}

// ---------- laboratório: resultados, ideias para explicar, fórmulas e comparação ----------
function results(R){const geo=R.geo,mc=R.mc,card=(t,big,rows,extra='')=>`<div class="lcard"><h4>${t}</h4>${big?`<div class="lbig">${big}</div>`:''}<div class="lkv">${rows.map(([k,v])=>`<span>${k}</span><b>${v}</b>`).join('')}</div>${extra}</div>`;
 let h=card('⏱️ Distância e atraso',`${ms(4*R.t1)} <small>RTT mínimo de um ping</small>`,[['Distância antena → satélite',km(R.d)+' km'],['Um trajeto (d / c)',ms(R.t1)],['Ida: subir e descer',ms(2*R.t1)],['Ping: 4 trajetos',ms(4*R.t1)],['Distância em terra entre A e B',km(R.ground)+' km'],['O mesmo percurso por fibra (RTT)',ms(R.fib)]]);
 h+=card('🌍 Geometria e cobertura',`${fx(100*R.cov,1)} % <small>da superfície da Terra</small>`,[geo?['Latitude da estação (na longitude do satélite)','≈ '+fx(R.g,1)+'°']:['Ângulo ao centro da Terra (A → ponto subsatélite)',fx(R.g,1)+'°'],['Raio da zona coberta',km(RE*rad(R.l0))+' km'],['Mínimo teórico de satélites para cobrir a Terra',R.nmin+(geo?' (sem os polos)':'')],['Largura do feixe da antena (−3 dB)',fx(R.bw,R.bw<1?2:1)+'°']]);
 h+=card('🛰️ Movimento do satélite',`${dur(R.T)} <small>por volta à Terra</small>`,[['Velocidade orbital',`${fx(R.v,2)} km/s · ${km(R.v*3600)} km/h`],['Tempo visível numa passagem',geo?'sempre (parece parado)':'≈ '+dur(R.pass)],['Desvio Doppler máximo',geo?'≈ 0 Hz':'± '+(R.dop>=1e6?fx(R.dop/1e6,2)+' MHz':fx(R.dop/1e3,0)+' kHz')],['A antena tem de seguir o satélite?',geo?'não: fica fixa':'sim, e há handover']]);
 const thr=mc?mc[1]:MC[0][1],mar=R.EsN0-thr,col=!mc?'var(--bad)':mar>4?'var(--ok)':'var(--sat)';
 h+=card('📡 Balanço da ligação (descida)',`${fx(R.EsN0,1)} dB <small>Es/N0 recebido</small>`,[['Perda em espaço livre',fx(R.fspl,1)+' dB'],['Atenuação da chuva',fx(R.arain,1)+' dB'],['Gases da atmosfera',fx(R.agas,2)+' dB'],['Apontamento e polarização',fx(R.lo,1)+' dB'],['Ganho da antena recetora',fx(R.G,1)+' dBi'],['Potência que chega à antena',sci(10**(R.Pr/10))+' W'],['G/T do recetor',fx(R.GT,1)+' dB/K'],['C/N0',fx(R.CN0,1)+' dBHz'],['Modulação DVB-S2 possível',mc?mc[0]:'nenhuma'],['Débito útil',mc?fx(R.rate,R.rate<10?1:0)+' Mbit/s':'0 Mbit/s']],
  `<div class="lmar"><i style="width:${Math.max(4,Math.min(100,45+mar*4)).toFixed(0)}%;background:${col}"></i></div><small style="opacity:.75">${mc?`Margem de ${fx(mar,1)} dB acima do limiar de ${mc[0]} (${fx(thr,2)} dB); exige-se uma folga de ${MARGIN} dB.`:`Abaixo do limiar da modulação mais robusta (QPSK 1/4: ${fx(MC[0][1],2)} dB, mais ${MARGIN} dB de folga).`}</small>`);
 $('#lres').innerHTML=h;
 // ideias para explicar à turma
 const I=[`O sinal percorre <b>${km(R.d)} km</b> entre a antena e o satélite. À velocidade da luz são <b>${ms(R.t1)}</b> por trajeto. Um ping sobe e desce duas vezes, por isso nunca demora menos de <b>${ms(4*R.t1)}</b>.`];
 I.push(R.fib>4*R.t1?`Curiosidade: entre duas cidades a ${km(R.ground)} km, este satélite chega a ser <b>mais rápido do que a fibra ótica</b> (${ms(4*R.t1)} contra ${ms(R.fib)}): no vácuo a luz viaja a c, mas no vidro da fibra só a cerca de 0,67 c.`:`Por fibra, as mesmas duas estações (a ${km(R.ground)} km em terra) teriam um RTT de cerca de ${ms(R.fib)}. O satélite é ${fx(4*R.t1/R.fib,1)} vezes mais lento, mas não precisa de cabos e cobre oceanos, montanhas e zonas isoladas.`);
 I.push(`Só por causa da distância, o sinal chega <b>${sci(10**(R.fspl/10))} vezes</b> mais fraco (perda em espaço livre de ${fx(R.fspl,1)} dB). A antena recebe apenas <b>${sci(10**(R.Pr/10))} W</b>, e mesmo assim consegue recuperar os dados.`);
 if(R.arain>=.5)I.push(`A chuva de ${fx(S.rain,0)} mm/h retira <b>${fx(R.arain,1)} dB</b>: o sinal fica ${fx(10**(R.arain/10),R.arain<10?1:0)} vezes mais fraco. ${S.band=='Ka'?'A banda Ka sofre muito porque o comprimento de onda (cerca de 1,5 cm) é próximo do tamanho das gotas.':S.band=='Ku'?'Em banda Ka seria bastante pior; em banda C quase não se notaria.':'A esta frequência, a chuva quase não afeta o sinal.'}`);
 if(!mc)I.push(`<b>Não há ligação DVB-S2 possível</b>: o sinal fica abaixo do ruído. ${S.band=='L'&&S.D<.3?'O GPS funciona assim mesmo, porque usa espalhamento de espectro (CDMA) e acumula a energia de muitos bits.':'Soluções: antena maior, mais potência no satélite, uma banda menos sensível à chuva ou modulação adaptativa (ACM).'}`);
 if(S.e<S.emin)I.push(`⚠ A elevação (${S.e}°) está abaixo da elevação mínima de serviço (${S.emin}°): na prática, prédios, árvores e montes tapariam o satélite.`);
 I.push(R.geo?`Um satélite GEO dá uma volta em ${dur(R.T)}, o mesmo tempo que a Terra demora a rodar sobre si mesma. Visto da Terra parece parado, por isso a parabólica fica fixa.`:`A ${km(S.h)} km, o satélite dá uma volta em ${dur(R.T)} a ${fx(R.v,1)} km/s. Só fica visível cerca de ${dur(R.pass)} de cada vez, por isso o terminal tem de passar para outro satélite (handover).`);
 $('#lins').innerHTML=`<h4>💬 Para explicar à turma</h4><ul>${I.map(x=>`<li>${x}</li>`).join('')}</ul>`;
 // fórmulas com os valores substituídos
 const F=[['Distância oblíqua','d = √((R + h)² − (R·cos e)²) − R·sin e',`d = √((${km(RE)} + ${km(S.h)})² − (${km(RE)}·cos ${S.e}°)²) − ${km(RE)}·sin ${S.e}° = ${km(R.d)} km`],
  ['Tempo de propagação','t = d / c',`t = ${km(R.d)} km ÷ 299 792 km/s = ${ms(R.t1)}`],['RTT mínimo de um ping','RTT = 4 × t',`RTT = 4 × ${ms(R.t1)} = ${ms(4*R.t1)}`],
  ['Período orbital (3.ª lei de Kepler)','T = 2π·√(a³ / μ), com a = R + h e μ = 398 600 km³/s²',`T = 2π·√(${km(R.a)}³ / 398 600) = ${dur(R.T)}`],['Velocidade orbital','v = √(μ / a)',`v = √(398 600 / ${km(R.a)}) = ${fx(R.v,2)} km/s`],
  ['Zona de cobertura','λ = arccos(R·cos e_min / (R + h)) − e_min; fração = (1 − cos λ) / 2',`λ = ${fx(R.l0,2)}° → ${fx(100*R.cov,2)} % da superfície`],
  ['Comprimento de onda','λ = c / f',`λ = 3 × 10⁸ m/s ÷ ${fx(R.f,1)} × 10⁹ Hz = ${fx(R.lam*100,2)} cm`],
  ['Perda em espaço livre','FSPL = 92,45 + 20·log d[km] + 20·log f[GHz]',`FSPL = 92,45 + ${fx(20*lg(R.d),1)} + ${fx(20*lg(R.f),1)} = ${fx(R.fspl,1)} dB`],
  ['Ganho da antena','G = 10·log(η·(π·D / λ)²), com η = 0,65',`G = 10·log(0,65·(π·${fx(S.D,2)} / ${fx(R.lam,4)})²) = ${fx(R.G,1)} dBi`],
  ['Atenuação da chuva (ITU-R P.838 e P.618 simplificado)','A = k·R^α·L_ef',S.rain>0?`A = ${fx(R.k,5)}·${S.rain}^${fx(R.al,3)}·${fx(R.Ls*R.r,2)} km = ${fx(R.arain,2)} dB`:'Sem chuva: A = 0 dB'],
  ['Relação portadora/ruído','C/N0 = EIRP − L + G/T + 228,6',`C/N0 = ${fx(S.eirp,1)} − ${fx(R.Ltot,1)} + ${fx(R.GT,1)} + 228,6 = ${fx(R.CN0,1)} dBHz`],
  ['Energia por símbolo','Es/N0 = C/N0 − 10·log Rs, com Rs = B / 1,2',`Es/N0 = ${fx(R.CN0,1)} − ${fx(10*lg(R.Rs),1)} = ${fx(R.EsN0,1)} dB`],
  ['Débito útil','débito = Rs × eficiência espectral',R.mc?`${fx(R.Rs/1e6,1)} Mbaud × ${fx(R.mc[2],3)} bit/símbolo = ${fx(R.rate,1)} Mbit/s`:'Nenhuma modulação DVB-S2 é possível']];
 $('#lform').hidden=!S.showF;$('#lform').innerHTML=`<h4>🧮 As contas, passo a passo</h4>${F.map(([n,f,v])=>`<div class="lfr"><span>${n}</span><code>${f}</code><code class="v">${v}</code></div>`).join('')}<small style="opacity:.65">R = 6 371 km (raio da Terra) · c = 299 792 km/s · μ = constante gravitacional da Terra. Gases da atmosfera: valores típicos (ITU-R P.676). Chuva: altura de 3,4 km, típica de Portugal.</small>`;
 // comparação de órbitas
 const L=[[550,'LEO','Starlink'],[1200,'LEO','OneWeb'],[8062,'MEO','O3b mPOWER'],[20200,'MEO','GPS'],[35786,'GEO','TV, Meteosat']];
 $('#lcmp').innerHTML=`<h4>📊 Comparação de órbitas (elevação de ${S.e}°, ${BANDS[S.band].n.replace('Banda','banda')} a ${fx(R.f,1)} GHz, e_min = ${S.emin}°)</h4><div class="lcmpw"><table class="lcmp"><tr><th>Órbita</th><th>Exemplo</th><th>Altitude</th><th>Distância</th><th>Um trajeto</th><th>RTT mínimo</th><th>Perda</th><th>Período</th><th>Cobertura</th><th>Mín. de satélites</th></tr>${L.map(([hh,t,ex])=>{const Q=calc({...S,h:hh});return`<tr class="${Math.abs(hh-S.h)<1?'on':''}"><td><b>${t}</b></td><td>${ex}</td><td>${km(hh)} km</td><td>${km(Q.d)} km</td><td>${ms(Q.t1)}</td><td>${ms(4*Q.t1)}</td><td>${fx(Q.fspl,1)} dB</td><td>${dur(Q.T)}</td><td>${fx(100*Q.cov,1)} %</td><td>${Q.nmin}</td></tr>`}).join('')}</table></div><small style="opacity:.65">O «mínimo de satélites» é o teórico, sem sobreposição: as constelações reais usam muitos mais, por causa da sobreposição, dos planos orbitais e da capacidade.</small>`}
function update(){stopAnim();const R=calc(S);syncUI();draw(R);results(R);$('#lclock').innerHTML=CLK0}
function labOpen(o={}){if(o.pre)applyPre(o.pre);if(o.set)Object.assign(S,o.set);if(o.pre||o.set)S.pre=o.set?null:S.pre;showOv('lab');update();
 if(o.to)setTimeout(()=>{const e=$('#'+o.to);if(e)e.scrollIntoView({behavior:'smooth',block:'start'})},80);else $('#lab .labv').scrollTop=0;
 if(o.send)setTimeout(send,400)}
window.labOpen=labOpen;

// ---------- auxiliares para as aulas ----------
const HL=document.createElementNS('http://www.w3.org/2000/svg','g');HL.setAttribute('pointer-events','none');$('#pk').parentNode.insertBefore(HL,$('#pk'));
let hlL=[],hlT=0;const hl=(ids,t=5000)=>{hlL=ids.filter(Boolean);hlT=performance.now()+t};
setInterval(()=>{const t=performance.now();if(t>hlT){if(HL.innerHTML)HL.innerHTML='';return}const r=46+6*Math.sin(t/170);HL.innerHTML=hlL.map(get).filter(Boolean).map(n=>`<circle cx="${n.x}" cy="${n.y}" r="${r.toFixed(1)}" fill="none" stroke="#ffd166" stroke-width="4"/><circle cx="${n.x}" cy="${n.y}" r="${(r+11).toFixed(1)}" fill="none" stroke="#ffd166" stroke-width="2" opacity=".35"/>`).join('')},50);
function setCfg(k,v){CFG[k]=v;$$(`#cfg [data-k="${k}"],#sec [data-k="${k}"]`).forEach(e=>{if(e.type=='checkbox')e.checked=!!v;else e.value=v});const b=$('#v_'+k);if(b)b.textContent=v;if(k=='stars')st.style.display=v?'':'none'}
const N=nm=>nodes.find(n=>n.name==nm);
let AUcur=null,AUmsg='';const AUdone=new Set(),AUshow=new Set();
function need(...names){const r=names.map(N);if(r.every(Boolean))return r;
 AUmsg=`Esta demonstração usa o cenário de exemplo e não encontrei: <b>${names.filter((n,i)=>!r[i]).map(E).join(', ')}</b>.<div class="aubt"><button class="go" data-demo>Carregar o cenário de exemplo</button></div><small style="opacity:.7">O mapa atual é substituído.</small>`;return null}
const showPanel=()=>{$('#panel').classList.remove('h')};
function doPing(a,b){const r=need(a,b);if(!r)return;hl(r.map(n=>n.id),4500);ping(r[0].id,r[1].id)}
function leoOver(){const r=need('Sat LEO 1','Estação 2','Estação 3');if(!r)return false;const[L,g2,g3]=r;setCfg('orbit',false);setCfg('bfd',true);
 L.y=vbox().height*.31;L.x=(g2.x+g3.x)/2;const dm=Math.max(Math.hypot(L.x-g2.x,L.y-g2.y),Math.hypot(L.x-g3.x,L.y-g3.y));
 if(dm>CFG.range){if(dm>700){AUmsg='Neste ecrã, as estações 2 e 3 ficam demasiado longe do LEO. Aproxima-as do satélite com ✋ Mover e repete o passo.';return false}setCfg('range',Math.ceil((dm+20)/10)*10)}
 ospfReset();hl([L.id,g2.id,g3.id],5000);log('🎓 Sat LEO 1 posicionado por cima das estações 2 e 3 (órbita pausada).');return true}
function leoAway(){const r=need('Sat LEO 1','Estação 2','Estação 3');if(!r)return false;const[L,g2,g3]=r;setCfg('orbit',false);setCfg('bfd',true);
 const y=vbox().height*.31,dy=Math.max(Math.abs(y-g2.y),Math.abs(y-g3.y)),dx=Math.sqrt(Math.max(0,CFG.range**2-dy**2))+90;let x=Math.min(g2.x,g3.x)-dx;if(x<30)x=Math.max(g2.x,g3.x)+dx;
 L.x=x;hl([L.id],4000);log('🎓 Sat LEO 1 saiu da cobertura das estações 2 e 3. O BFD vai detetar a falha em cerca de 0,9 s.');return true}
const leoCalc=()=>calc({...P0,...PRE.leo});

// ---------- aulas guiadas ----------
const AU=[
 {t:'A ligação Satélite–Terra',d:'10 min',o:['Identificar a estação terrestre, a subida (uplink), a descida (downlink) e o satélite.','Perceber que o satélite é um repetidor que não lê endereços IP.','Relacionar a distância com o tempo que o sinal demora.'],s:[
  {t:'Apresentar os intervenientes',btn:'Destacar no mapa',act:()=>{const r=need('Estação 1','Sat GEO 1','Estação 2');if(r)hl(r.map(n=>n.id),7000)},
   say:'Mostra a <b>Estação 1</b> (antena parabólica com modem e router), o <b>satélite GEO</b> e a <b>Estação 2</b>. A estação envia o sinal para cima, na <b>subida</b> (<i>uplink</i>, cerca de 14 GHz em banda Ku), e o satélite devolve-o para baixo, na <b>descida</b> (<i>downlink</i>, cerca de 12 GHz). As frequências são diferentes para que o sinal forte que o satélite emite não abafe o sinal fraquíssimo que recebe.'},
  {t:'Abrir o satélite',btn:'Selecionar o satélite',act:()=>{const r=need('Sat GEO 1');if(r){focusNode(r[0].id);showPanel();hl([r[0].id])}},
   say:'O painel do satélite mostra que <b>não tem endereço IP</b>: é um transponder transparente («bent-pipe») que recebe, amplifica, muda a frequência e retransmite. A tabela indica a elevação, a distância e o atraso de cada ligação rádio.',
   q:'Porque é que o satélite não precisa de endereço IP?',a:'Porque trabalha na camada 1 (física): só repete o sinal rádio. Quem lê os endereços IP e decide o caminho são as estações terrestres e os routers.'},
  {t:'Ver o sinal a subir e a descer',btn:'Abrir o laboratório',act:()=>labOpen({pre:'tv',send:true}),
   say:'No laboratório, o sinal sobe da Estação A ao satélite, desce à Estação B e a resposta faz o mesmo caminho ao contrário. A animação é em câmara lenta; o relógio mostra o tempo real. Fecha o laboratório para voltar a esta aula.',
   q:'Num ping por satélite, quantas vezes o sinal percorre o trajeto entre a Terra e o satélite?',a:'Quatro: sobe e desce com o pedido (Echo Request) e sobe e desce com a resposta (Echo Reply).'},
  {t:'Um ping verdadeiro na rede',btn:'Fazer o ping',act:()=>doPing('PC 1','PC 3'),
   say:'Ping do <b>PC 1</b> (Estação 1) para o <b>PC 3</b> (Estação 3). O pacote vai por cabo até à Estação 1, sobe ao GEO e desce na Estação 3. A explicação abre à esquerda, passo a passo, com os cálculos do próprio cenário.',
   q:'O comando tracert mostra o satélite como um dos saltos? Porquê?',a:'Não. O tracert lista os equipamentos que baixam o TTL (routers e estações terrestres). O satélite não lê o pacote IP nem baixa o TTL, por isso é invisível para o tracert, embora seja responsável pela maior parte do atraso.'}]},
 {t:'Latência: GEO contra LEO',d:'15 min',o:['Comparar a distância e o atraso de um satélite geoestacionário (35 786 km) e de um em órbita baixa (550 km).','Calcular o RTT mínimo com t = d / c.','Ver o routing a mudar de caminho quando o LEO desaparece.'],s:[
  {t:'Pôr o LEO por cima das estações 2 e 3',btn:'Posicionar o LEO',act:()=>leoOver(),
   say:'O satélite LEO fica parado (órbita pausada) entre a Estação 2 e a Estação 3, dentro da cobertura das duas. Para a demonstração, o simulador dispensa a espera de 10 s pelos hellos do OSPF.'},
  {t:'Ping pelo LEO',btn:'Fazer o ping',act:()=>{if(leoOver())doPing('PC 2','PC 3')},
   say:'Ping do <b>PC 2</b> para o <b>PC 3</b>. O OSPF usa como custo o atraso de cada ligação e por isso escolhe o LEO. Repara no RTT: poucos milissegundos.'},
  {t:'Tirar o LEO da cobertura',btn:'Afastar o LEO e repetir o ping',act:()=>{if(leoAway())setTimeout(()=>doPing('PC 2','PC 3'),1300)},
   say:'O LEO afasta-se e a ligação fica «sem sinal». O <b>BFD</b> deteta a falha em cerca de 0,9 s, o OSPF recalcula as rotas e o tráfego passa a ir pelo GEO. Um segundo depois, o simulador repete o ping.',
   q:'Calcula o RTT mínimo através do GEO, com o satélite na vertical.',a:'t = 35 786 km ÷ 299 792 km/s ≈ 119,4 ms por trajeto. Um ping faz 4 trajetos: 4 × 119,4 ≈ 477 ms. Com a antena a 45°, a distância sobe para cerca de 37 400 km e o RTT passa os 500 ms.'},
  {t:'Comparar todas as órbitas',btn:'Abrir a comparação',act:()=>labOpen({pre:'leo',to:'lcmp'}),
   say:'No laboratório, a tabela «Comparação de órbitas» mostra lado a lado a distância, o atraso, o período e a cobertura de cada tipo de órbita.',
   q:'Se o LEO é muito mais rápido, porque é que ainda se usam satélites GEO?',a:'Porque três satélites GEO cobrem quase toda a Terra e parecem parados no céu: a antena fica fixa e não há handovers, o que é ideal para televisão. Com LEO são precisos centenas ou milhares de satélites e terminais capazes de os seguir.'}]},
 {t:'O ângulo de elevação',d:'10 min',o:['Definir ângulo de elevação e horizonte local.','Ver como a elevação muda a distância, o atraso e a atenuação.','Relacionar a elevação com a latitude da estação.'],s:[
  {t:'Antena na vertical (90°)',btn:'Pôr a 90° e fazer o ping',act:()=>{setCfg('geoEl',90);doPing('PC 1','PC 3')},
   say:'A antena do GEO fica a 90°: o satélite está mesmo por cima, o que só acontece no equador. Faz um ping do PC 1 para o PC 3 e toma nota do RTT.'},
  {t:'Antena quase no horizonte (10°)',btn:'Pôr a 10° e fazer o ping',act:()=>{setCfg('geoEl',10);doPing('PC 1','PC 3')},
   say:'Agora a antena aponta a 10°: o satélite está baixo no céu. Repete o ping e compara os dois valores.',
   q:'Porque é que o RTT aumentou, se o satélite continua à mesma altitude?',a:'Porque o sinal deixa de ir na vertical e percorre uma linha inclinada: a distância passa de 35 786 km para cerca de 40 600 km. Além disso atravessa muito mais atmosfera (e chuva), por isso também chega mais fraco.'},
  {t:'Explorar no laboratório',btn:'Abrir o laboratório',act:()=>labOpen({pre:'low'}),
   say:'Arrasta o controlo «Ângulo de elevação da antena» e mostra como mudam a distância, o atraso e as perdas. Para um GEO, o cartão «Geometria» indica também a latitude a que a estação estaria.',
   q:'Onde é que um satélite GEO aparece mais alto no céu? E onde deixa de se ver?',a:'Mais alto no equador, na mesma longitude do satélite (90°). Quanto mais perto dos polos, mais baixo aparece; acima de cerca de 81° de latitude fica abaixo do horizonte. Em Lisboa (38,7° N) aparece a cerca de 45°.'},
  {t:'Repor os 45°',btn:'Repor',act:()=>{setCfg('geoEl',45);log('🎓 Elevação da antena GEO reposta em 45°.')},
   say:'Volta a pôr a elevação típica de Portugal continental, para as outras aulas.'}]},
 {t:'Órbitas, cobertura e handover',d:'15 min',o:['Relacionar a altitude com o período e a velocidade (3.ª lei de Kepler).','Perceber porque é que um LEO só se vê durante alguns minutos.','Explicar o handover e a necessidade de constelações.'],s:[
  {t:'Pôr o LEO em movimento',btn:'Ligar a órbita',act:()=>{const r=need('Sat LEO 1');if(!r)return;setCfg('orbit',true);setCfg('speed',2.5);focusNode(r[0].id);showPanel();hl([r[0].id],6000)},
   say:'A órbita fica ligada e a animação acelerada. O LEO atravessa o céu e, quando sai do círculo de cobertura, as ligações ficam «sem sinal». No painel do satélite, a elevação e a distância mudam em tempo real.'},
  {t:'Quanto tempo fica visível?',btn:'Abrir o laboratório',act:()=>labOpen({pre:'leo'}),
   say:'No exemplo «Internet LEO», o cartão «Movimento do satélite» mostra a velocidade (cerca de 7,6 km/s), o período (cerca de 95 minutos) e o tempo de uma passagem: poucos minutos.',
   q:'Quantos satélites a 550 km seriam precisos, no mínimo, para cobrir toda a Terra?',a:()=>{const R=leoCalc();return`Cada satélite cobre apenas ${fx(100*R.cov,2)} % da superfície (com elevação mínima de 25°). O mínimo teórico é de ${R.nmin} satélites; na prática são precisos muitos mais por causa da sobreposição, dos planos orbitais e da capacidade. A Starlink tem milhares.`}},
  {t:'Handover e falhas',btn:'Fazer o ping agora',act:()=>doPing('PC 2','PC 3'),
   say:'Faz pings do PC 2 para o PC 3 em momentos diferentes da órbita. Com o LEO visível, o caminho é rápido; quando sai, o OSPF passa para o GEO e o RTT dispara. Numa constelação real, outro LEO entra em vista antes de o anterior sair: é o <b>handover</b>.',
   q:'O que acontece a uma videochamada quando o LEO sai de vista e só resta o GEO?',a:'Continua, mas o atraso salta de dezenas para mais de 500 ms: a conversa fica com pausas e as pessoas falam por cima umas das outras. Sem um satélite de reserva, a chamada cai.'},
  {t:'Repor a órbita normal',btn:'Repor',act:()=>{setCfg('orbit',true);setCfg('speed',1);log('🎓 Órbita e velocidade da animação repostas.')},
   say:'Repõe a velocidade normal da animação.'}]},
 {t:'Frequências, chuva e potência do sinal',d:'15 min',o:['Conhecer as bandas L, C, Ku e Ka e onde se usam.','Perceber a perda em espaço livre e o papel do ganho da antena.','Explicar porque é que a chuva afeta mais as frequências altas.'],s:[
  {t:'Céu limpo em banda Ku',btn:'Abrir o exemplo',act:()=>labOpen({pre:'tv'}),
   say:'Exemplo «TV por satélite». O sinal perde mais de 200 dB pelo caminho e chega à parabólica com uma potência ínfima (o valor em watts está no cartão do balanço). Mesmo assim, com uma antena de 80 cm, há margem para uma modulação rápida.'},
  {t:'Uma tempestade em banda Ku',btn:'Pôr a chover',act:()=>labOpen({pre:'tv',set:{rain:40}}),
   say:'A mesma ligação com 40 mm/h de chuva. Observa a atenuação e a modulação, que desce para uma mais robusta e mais lenta.'},
  {t:'A mesma tempestade em banda Ka',btn:'Abrir o exemplo',act:()=>labOpen({pre:'ka'}),
   say:'Exemplo «Tempestade em banda Ka». A atenuação é várias vezes maior e a ligação fica no limite.',
   q:'Porque é que a banda Ka sofre muito mais com a chuva do que a banda C?',a:'Porque o comprimento de onda em Ka (cerca de 1,5 cm a 20 GHz) é próximo do tamanho das gotas, que absorvem e espalham a energia. Em banda C (7,5 cm) as gotas são pequenas comparadas com a onda e quase não a afetam. Soluções: margem de potência, modulação adaptativa (ACM) e estações de reserva noutro local.'},
  {t:'Uma antena maior compensa?',btn:'Antena de 1,5 m',act:()=>labOpen({pre:'ka',set:{D:1.5}}),
   say:'Ainda com chuva, a antena passa de 75 cm para 1,5 m. Vê o ganho, a margem e o débito a subir.',
   q:'Quantos decibéis se ganham ao duplicar o diâmetro da antena?',a:'Cerca de 6 dB: o ganho cresce com a área, ou seja, com o quadrado do diâmetro. Duas vezes o diâmetro dá 4 vezes a área, e 10·log 4 ≈ 6 dB. Em contrapartida, o feixe fica duas vezes mais estreito e a antena tem de ser apontada com mais precisão.'}]},
 {t:'Voz por satélite (VoIP)',d:'10 min',o:['Distinguir a sinalização (SIP) da voz (RTP).','Medir o atraso boca-ouvido e compará-lo com a recomendação ITU-T G.114 (150 ms).','Comparar uma chamada por GEO com uma chamada por LEO.'],s:[
  {t:'Chamada pelo GEO',btn:'Fazer a chamada',act:()=>{const r=need('Telemóvel 1','Tel. VoIP 1');if(!r)return;voipHangAll();hl(r.map(n=>n.id),6000);voipCall(r[0].id,r[1].id)},
   say:'O <b>Telemóvel 1</b> (Estação 1) liga para o <b>Tel. VoIP 1</b> (Estação 2). A única ligação da Estação 1 é o GEO. Quando a chamada é atendida, a explicação mostra a sinalização SIP, o atraso boca-ouvido e a nota de qualidade (MOS).'},
  {t:'Chamada pelo LEO',btn:'Fazer a chamada',act:()=>{const r=need('Telemóvel 2','Telemóvel 3');if(!r||!leoOver())return;voipHangAll();hl(r.map(n=>n.id),6000);voipCall(r[0].id,r[1].id)},
   say:'O LEO é posto por cima das estações 2 e 3 e o <b>Telemóvel 2</b> liga para o <b>Telemóvel 3</b>. Compara o atraso e o MOS com os da chamada anterior.',
   q:'Porque é que, numa chamada por GEO, as pessoas tendem a falar ao mesmo tempo?',a:'Porque cada sentido demora mais de 250 ms só em propagação e o atraso boca-ouvido total ultrapassa largamente os 150 ms recomendados pela ITU-T G.114. Quem fala ouve a resposta tarde, julga que o outro não respondeu e volta a falar.'},
  {t:'Desligar as chamadas',btn:'Desligar',act:()=>{voipHangAll();log('🎓 Chamadas terminadas (SIP BYE).')},say:'Termina as chamadas com a mensagem SIP <b>BYE</b>.'}]},
 {t:'Segurança: quem mais ouve o satélite?',d:'10 min',o:['Perceber que o feixe do satélite cobre uma área enorme e que qualquer pessoa o pode captar.','Mostrar o efeito da cifra IPsec.','Ver as várias camadas de defesa de uma rede.'],s:[
  {t:'Escuta sem cifra',btn:'Simular a escuta',act:()=>{const r=need('Atacante 1','PC 3');if(!r)return;setCfg('atk','mitm');setCfg('ipsec',false);hl(r.map(n=>n.id),5000);attack(r[0].id,r[1].id)},
   say:'Com o IPsec desligado, o atacante aponta uma antena ao satélite e capta o sinal que desce para a Estação 3. Sem cifra, lê tudo. O resultado aparece no registo, em baixo.'},
  {t:'Com IPsec',btn:'Ligar o IPsec e repetir',act:()=>{const r=need('Atacante 1','PC 3');if(!r)return;setCfg('atk','mitm');setCfg('ipsec',true);hl(r.map(n=>n.id),5000);attack(r[0].id,r[1].id)},
   say:'Com o IPsec ligado, o sinal continua a ser captado (isso não se pode impedir), mas os dados vão cifrados com AES-GCM: o atacante só vê dados ilegíveis.',
   q:'Se qualquer pessoa na zona do feixe pode captar o sinal, como é que a TV paga e a internet por satélite protegem os dados?',a:'Com cifra. A TV paga usa acesso condicional: o sinal vai baralhado e só o cartão do assinante tem a chave. A internet usa IPsec, TLS ou VPN. A segurança não vem de esconder o sinal, mas de o tornar ilegível.'},
  {t:'Defesa em profundidade',btn:'Simular o ataque',act:()=>{const r=need('Atacante 1','Servidor Web');if(!r)return;setCfg('atk','scan');hl(r.map(n=>n.id),5000);attack(r[0].id,r[1].id)},
   say:'A partir da Internet, o atacante faz um varrimento de portas ao <b>Servidor Web</b>. O NAT só expõe a porta 443, a firewall confirma a regra da ACL e o IPS deteta o ataque e põe o atacante em quarentena.'},
  {t:'Libertar a quarentena',btn:'Libertar',act:()=>{links.forEach(l=>delete l.q);log('🔓 Quarentenas removidas.')},say:'Liberta a ligação do atacante, para repetir a aula ou passar à seguinte.'}]}];

function auPaint(){const b=$('#aulx');if(!b)return;
 if(AUcur==null){b.innerHTML=`<p class="lnote" style="margin-bottom:10px">Escolhe uma aula. Em cada passo, carrega em <b>▶</b> para o simulador fazer a demonstração e lê o texto à turma. As perguntas têm a resposta escondida.</p><div class="aul-l">${AU.map((a,i)=>`<button data-au="${i}"><b>${i+1}. ${a.t}</b><small>⏱ ${a.d} · ${a.s.length} passos</small><small>${a.o[0]}</small></button>`).join('')}</div>`;return}
 const A=AU[AUcur];
 b.innerHTML=`<button class="aubk" data-back>← Todas as aulas</button><h4 class="aut">${AUcur+1}. ${A.t}</h4><small style="opacity:.65">⏱ ${A.d}</small><b class="aus">Objetivos</b><ul class="auobj">${A.o.map(x=>`<li>${x}</li>`).join('')}</ul>${AUmsg?`<div class="aumsg">${AUmsg}</div>`:''}
 ${A.s.map((s,j)=>{const k=AUcur+'-'+j,ans=typeof s.a=='function'?s.a():s.a;return`<div class="aust ${AUdone.has(k)?'done':''}"><h5><i>${j+1}</i>${s.t}${AUdone.has(k)?' <small>✓</small>':''}</h5><div class="ausay">${s.say}</div>${s.act?`<div class="aubt"><button class="go" data-run="${j}">▶ ${s.btn||'Demonstrar'}</button></div>`:''}${s.q?`<div class="auq"><b>❓ Pergunta à turma:</b> ${s.q}${AUshow.has(k)?`<div class="aua">💡 ${ans}</div>`:`<div class="aubt"><button data-ans="${j}">Mostrar a resposta</button></div>`}</div>`:''}</div>`}).join('')}
 <div class="aunav">${AUcur>0?`<button data-au="${AUcur-1}">← Aula anterior</button>`:'<span></span>'}${AUcur<AU.length-1?`<button data-au="${AUcur+1}">Aula seguinte →</button>`:''}</div>`}
$('#aul').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
 if(t.dataset.x!=null){$('#aul').hidden=true;syncBtns();return}
 if(t.dataset.au!=null){AUcur=+t.dataset.au;AUmsg='';auPaint();$('#aul').scrollTop=0;return}
 if(t.dataset.back!=null){AUcur=null;AUmsg='';auPaint();return}
 if(t.dataset.ans!=null){AUshow.add(AUcur+'-'+t.dataset.ans);auPaint();return}
 if(t.dataset.demo!=null){demo();AUmsg='';log('🎓 Cenário de exemplo carregado para a aula.');auPaint();return}
 if(t.dataset.run!=null){const j=+t.dataset.run,s=AU[AUcur].s[j];AUmsg='';try{s.act()}catch(x){console.warn(x);AUmsg='Não foi possível fazer esta demonstração: '+E(x.message)}if(!AUmsg)AUdone.add(AUcur+'-'+j);auPaint()}});
function aulOpen(i){const a=$('#aul');a.hidden=false;if(i!=null){AUcur=i;AUmsg=''}auPaint();OV.forEach(o=>$('#'+o).hidden=true);syncBtns()}

// ---------- desafio ----------
const QZ=[
 {q:'A que altitude fica a órbita geoestacionária (GEO)?',o:['550 km','8 062 km','20 200 km','35 786 km'],c:3,x:'A 35 786 km de altitude, um satélite demora 23 h 56 min a dar uma volta: exatamente o tempo que a Terra demora a rodar sobre si mesma. Visto da Terra, parece parado.'},
 {q:'Num ping através de um satélite, quantas vezes o sinal percorre o trajeto entre a Terra e o satélite?',o:['1','2','4','8'],c:2,x:'Sobe e desce com o pedido (Echo Request) e sobe e desce com a resposta (Echo Reply): 4 trajetos.'},
 {q:'Qual é o RTT mínimo, só de propagação, de um ping por um satélite GEO na vertical?',o:['≈ 30 ms','≈ 120 ms','≈ 240 ms','≈ 480 ms'],c:3,x:'t = 35 786 km ÷ 299 792 km/s ≈ 119 ms por trajeto. Com 4 trajetos, o RTT nunca é inferior a cerca de 477 ms.'},
 {q:'O que faz um satélite transparente («bent-pipe»)?',o:['Lê o endereço IP e escolhe a rota','Recebe, amplifica, muda a frequência e retransmite o sinal','Atribui endereços IP aos terminais','Baixa o TTL dos pacotes em 1'],c:1,x:'É um repetidor de camada 1: não lê IP nem MAC. Por isso não aparece no tracert, embora cause a maior parte do atraso.'},
 {q:'Porque é que a subida (uplink) e a descida (downlink) usam frequências diferentes?',o:['Para o satélite gastar menos energia','Para o sinal forte que o satélite emite não interferir com o sinal fraco que recebe','Porque a chuva só afeta a subida','Por causa do efeito Doppler'],c:1,x:'O satélite recebe um sinal fraquíssimo e, ao mesmo tempo, emite um sinal forte. Em frequências diferentes (por exemplo, 14 GHz a subir e 12 GHz a descer, em banda Ku), um não abafa o outro.'},
 {q:'O que acontece quando a antena aponta mais perto do horizonte (menor elevação)?',o:['A distância diminui','Nada muda, porque a altitude do satélite é a mesma','A distância e a atenuação aumentam','O satélite passa a ser LEO'],c:2,x:'O sinal percorre uma linha inclinada mais longa e atravessa mais atmosfera. Para um GEO, a distância passa de 35 786 km (a 90°) para cerca de 40 600 km (a 10°).'},
 {q:'Qual destas bandas é a mais afetada pela chuva?',o:['Banda L (1,5 GHz)','Banda C (4 GHz)','Banda Ku (12 GHz)','Banda Ka (20 GHz)'],c:3,x:'Quanto mais alta a frequência, mais curto o comprimento de onda e maior a absorção pelas gotas. A banda Ka (≈ 1,5 cm) pode perder dezenas de dB numa tempestade.'},
 {q:'Porque é que um terminal LEO precisa de fazer handover?',o:['Porque o satélite LEO muda de frequência','Porque o satélite se move a cerca de 7,6 km/s e só fica visível durante alguns minutos','Porque o LEO não tem energia à noite','Porque o OSPF o obriga'],c:1,x:'A 550 km, um satélite dá uma volta em cerca de 95 minutos. Antes de desaparecer no horizonte, o terminal tem de passar para outro satélite da constelação.'},
 {q:'Segundo a ITU-T G.114, até que atraso boca-ouvido uma chamada de voz é confortável?',o:['50 ms','150 ms','400 ms','600 ms'],c:1,x:'Até 150 ms a maioria dos utilizadores não nota o atraso; acima de 400 ms a conversa torna-se difícil. Por GEO, só a propagação já ultrapassa os 250 ms por sentido.'},
 {q:'Qualquer pessoa na zona do feixe consegue captar o sinal de um satélite. O que impede que leia os dados?',o:['As VLAN','O NAT','A cifra (por exemplo, IPsec)','O routing OSPF'],c:2,x:'Não se pode impedir a receção do sinal rádio. A proteção consiste em torná-lo ilegível com cifra: IPsec, TLS ou, na TV paga, o acesso condicional.'},
 {q:'Se a distância duplicar, quanto aumenta a perda em espaço livre?',o:['3 dB','6 dB','10 dB','20 dB'],c:1,x:'A perda cresce com o quadrado da distância: 2² = 4 vezes, ou seja, 10·log 4 ≈ 6 dB.'},
 {q:'O que é o «footprint» de um satélite?',o:['O peso do satélite','A zona da superfície terrestre coberta pelo feixe','O rasto que deixa na órbita','O consumo de energia'],c:1,x:'É a área onde o sinal chega com força suficiente. Com elevação mínima de 10°, um GEO cobre cerca de um terço da Terra; um LEO a 550 km (elevação mínima de 25°) cobre menos de 1 %.'}];
let qi=0,qs=0,qord=[],qans=null;
function qzStart(){qord=QZ.map((_,i)=>i);for(let i=qord.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[qord[i],qord[j]]=[qord[j],qord[i]]}qi=0;qs=0;qans=null;qzPaint()}
function qzPaint(){const b=$('#qzc');if(qi>=qord.length){const p=Math.round(100*qs/qord.length);
  b.innerHTML=`<div class="qzend"><div class="ovs">Resultado da turma</div><div class="big">${qs} / ${qord.length}</div><p>${p>=90?'Excelente! A ligação Satélite–Terra já não tem segredos.':p>=70?'Muito bem! Revejam só as perguntas que falharam.':p>=50?'Bom começo. Vale a pena repetir o laboratório.':'Ainda há caminho a fazer: experimentem as aulas guiadas e voltem a tentar.'}</p><button class="pri" data-qrst>↺ Recomeçar</button></div>`;return}
 const Q=QZ[qord[qi]];
 b.innerHTML=`<div class="qzp"><span>Pergunta ${qi+1} de ${qord.length}</span><span>✅ ${qs} ${qs==1?'certa':'certas'}</span></div><div class="qzbar"><i style="width:${(100*qi/qord.length).toFixed(1)}%"></i></div><p class="qzq">${Q.q}</p>
 <div class="qzo">${Q.o.map((t,i)=>`<button data-qo="${i}" ${qans!=null?'disabled':''} class="${qans==null?'':i==Q.c?'ok':i==qans?'no':''}"><i>${'ABCD'[i]}</i>${t}</button>`).join('')}</div>
 ${qans!=null?`<div class="qzx">${qans==Q.c?'✅ <b>Certo!</b> ':'❌ <b>Não é bem assim.</b> '}${Q.x}</div><div class="qzn"><button class="pri" data-qn>${qi<qord.length-1?'Pergunta seguinte →':'Ver o resultado'}</button></div>`:''}`}
$('#qz').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
 if(t.dataset.qo!=null&&qans==null){qans=+t.dataset.qo;if(qans==QZ[qord[qi]].c)qs++;qzPaint()}
 else if(t.dataset.qn!=null){qi++;qans=null;qzPaint();$('#qz .ovb').scrollTop=0}
 else if(t.dataset.qrst!=null)qzStart()});

// ---------- glossário ----------
const GL=[['Altitude orbital','Distância entre o satélite e a superfície da Terra. Define o tipo de órbita: LEO (até cerca de 2 000 km), MEO (entre o LEO e o GEO) e GEO (35 786 km).'],
 ['Ângulo de elevação','Ângulo entre o horizonte local e a direção do satélite. A 90° o satélite está na vertical; quanto mais baixo, maior a distância e mais atmosfera o sinal atravessa.'],
 ['Azimute','Direção horizontal para onde a antena aponta, medida a partir do norte (0°) no sentido dos ponteiros do relógio. Em Portugal, os satélites GEO veem-se para sul.'],
 ['Banda de frequências','Gama de frequências usada pela ligação. Valores típicos em satélite (descida/subida): L ≈ 1,5 GHz, S ≈ 2,2 GHz, C ≈ 4/6 GHz, Ku ≈ 12/14 GHz e Ka ≈ 20/30 GHz. Frequências mais altas permitem antenas menores e mais débito, mas sofrem mais com a chuva.'],
 ['Bent-pipe (transponder transparente)','Satélite que funciona como repetidor: recebe o sinal, amplifica-o, muda-lhe a frequência e devolve-o à Terra, sem ler o conteúdo.'],
 ['BFD','Bidirectional Forwarding Detection: protocolo que deteta a falha de uma ligação em menos de um segundo, para que o routing mude logo de caminho.'],
 ['Constelação','Conjunto de satélites que trabalham em conjunto para dar cobertura contínua, como a Starlink, a OneWeb, o GPS ou o Galileo.'],
 ['Decibel (dB)','Unidade logarítmica para comparar potências: +3 dB é o dobro, +10 dB é dez vezes mais e −20 dB é cem vezes menos. Permite somar ganhos e perdas em vez de os multiplicar.'],
 ['Desvio Doppler','Variação da frequência recebida quando o emissor se aproxima ou se afasta. Nos LEO chega a centenas de kHz e o recetor tem de o compensar.'],
 ['Downlink (descida)','Sentido satélite → Terra. Usa a frequência mais baixa do par (por exemplo, 12 GHz em banda Ku).'],
 ['DVB-S2 e MODCOD','Norma de transmissão digital por satélite. O MODCOD é a combinação de modulação (QPSK, 8PSK, 16APSK ou 32APSK) e taxa de código: quanto melhor o sinal, mais bits por símbolo e mais débito.'],
 ['EIRP','Potência isotrópica radiada equivalente: a potência do emissor somada ao ganho da antena, em dBW. Indica com que força o satélite «ilumina» uma zona.'],
 ['Estação terrestre','Instalação na Terra com antena, modem e router, que faz a ponte entre a rede terrestre (cabo) e o satélite (rádio).'],
 ['Footprint (zona de cobertura)','Área da superfície terrestre onde o sinal do satélite chega com força suficiente.'],
 ['FSPL (perda em espaço livre)','Enfraquecimento do sinal apenas por se espalhar com a distância. Cresce com o quadrado da distância e da frequência; num GEO ultrapassa os 200 dB.'],
 ['G/T','Figura de mérito do recetor: ganho da antena a dividir pela temperatura de ruído do sistema. Quanto maior, melhor recebe sinais fracos.'],
 ['GEO','Órbita geoestacionária, a 35 786 km sobre o equador. O satélite acompanha a rotação da Terra e parece parado no céu.'],
 ['Handover','Passagem de uma ligação de um satélite para outro (ou de um feixe para outro) sem a interromper. É essencial nas constelações LEO.'],
 ['IPsec','Conjunto de protocolos que cifra e autentica os pacotes IP. Impede que quem capta o sinal do satélite leia ou altere os dados.'],
 ['ISL (ligação entre satélites)','Ligação direta, por laser ou rádio, entre dois satélites. Permite levar o tráfego pelo espaço sem descer a uma estação intermédia.'],
 ['Jitter','Variação do atraso entre pacotes consecutivos. Prejudica a voz e o vídeo e é compensado com um buffer no recetor.'],
 ['LEO','Órbita terrestre baixa, entre cerca de 300 e 2 000 km. Tem pouco atraso, mas cada satélite só se vê durante alguns minutos.'],
 ['MEO','Órbita terrestre média, entre o LEO e o GEO. É onde estão o GPS e o Galileo (entre 20 000 e 23 000 km) e a constelação O3b (8 062 km).'],
 ['MOS','Mean Opinion Score: nota de 1 a 5 para a qualidade de uma chamada de voz. Acima de 4 é boa; abaixo de 3,1 a maioria dos utilizadores fica insatisfeita.'],
 ['RTT','Round-Trip Time: tempo que um pacote demora a chegar ao destino e a resposta a voltar. É o valor que o comando ping mostra.'],
 ['Transponder','Equipamento a bordo do satélite que recebe uma gama de frequências, a amplifica e a retransmite noutra gama. Um satélite tem dezenas de transponders.'],
 ['Uplink (subida)','Sentido Terra → satélite. Usa a frequência mais alta do par (por exemplo, 14 GHz em banda Ku).'],
 ['Velocidade da luz (c)','299 792 km/s no vácuo. Nos cabos de cobre e na fibra ótica, o sinal viaja a cerca de 0,65 a 0,67 c (≈ 200 000 km/s).'],
 ['VSAT','Very Small Aperture Terminal: pequena estação terrestre (antena de 0,7 a 2,4 m) usada para internet e redes empresariais por satélite.']].sort((a,b)=>a[0].localeCompare(b[0],'pt'));
const nrm=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function glPaint(){const q=nrm($('#gls').value.trim()),L=GL.filter(([t,d])=>!q||nrm(t+' '+d).includes(q));$('#glg').innerHTML=L.map(([t,d])=>`<div><b>${t}</b>${d}</div>`).join('')||'<p>Nenhum termo encontrado.</p>'}
$('#gls').oninput=glPaint;

// ---------- página inicial ----------
$('#hubaul').textContent=`${AU.length} demonstrações prontas a projetar, com o que explicar e perguntas para a turma.`;
$('#hubqz').textContent=`${QZ.length} perguntas de escolha múltipla, com a explicação de cada resposta.`;
function go(w){if(w=='lab')labOpen();else if(w=='aul')aulOpen();else if(w=='qz'){showOv('qz');qzStart()}else if(w=='gl'){showOv('gloss');$('#gls').value='';glPaint();setTimeout(()=>$('#gls').focus(),50)}else if(w=='pr'){hideOv('hub');$('#prb').click()}else{hideOv('hub');log('🗺️ Simulador de rede: escolhe uma ferramenta na barra (Ligar, Ping, Chamar…) e clica nos dispositivos.')}}
$('#hub').addEventListener('click',e=>{const c=e.target.closest('[data-go]');if(c)go(c.dataset.go)});
let hubAuto=true;try{hubAuto=localStorage.getItem('satnet-hub')!=='0'}catch(e){}
$('#hubk').checked=hubAuto;$('#hubk').onchange=e=>{try{localStorage.setItem('satnet-hub',e.target.checked?'1':'0')}catch(x){}};

// ---------- botões, menu e teclado ----------
$('#hmb').onclick=()=>$('#hub').hidden?showOv('hub'):hideOv('hub');
$('#labb').onclick=()=>$('#lab').hidden?labOpen():hideOv('lab');
$('#aulb').onclick=()=>{if($('#aul').hidden)aulOpen();else{$('#aul').hidden=true;syncBtns()}};
$('#qzb').onclick=()=>{if($('#qz').hidden){showOv('qz');qzStart()}else hideOv('qz')};
$('#glb').onclick=()=>go('gl');
document.addEventListener('click',e=>{const x=e.target.closest('.ov [data-x]');if(x)hideOv(x.closest('.ov').id)});
const mnu=$('#mnu'),mrb=$('#mrb');
function closeMnu(){mnu.hidden=true;mrb.setAttribute('aria-expanded','false')}
mrb.onclick=e=>{e.stopPropagation();if(!mnu.hidden)return closeMnu();const r=mrb.getBoundingClientRect();mnu.hidden=false;mnu.style.top=(r.bottom+6)+'px';mnu.style.right=Math.max(8,innerWidth-r.right)+'px';mrb.setAttribute('aria-expanded','true')};
document.addEventListener('pointerdown',e=>{if(!mnu.hidden&&!mnu.contains(e.target)&&e.target!==mrb)closeMnu()});
// ações que apagam o mapa pedem um segundo clique (sem janelas do navegador, que podem estar bloqueadas)
function arm(btn,txt){const h=btn.onclick;btn.onclick=e=>{if(btn.dataset.arm){delete btn.dataset.arm;btn.textContent=txt;h&&h.call(btn,e);closeMnu()}else{btn.dataset.arm='1';btn.textContent='Clica outra vez para confirmar';setTimeout(()=>{if(btn.dataset.arm){delete btn.dataset.arm;btn.textContent=txt}},3500)}}}
arm($('#demo'),'↺ Repor o cenário de exemplo');arm($('#clear'),'🗑 Limpar o mapa');
['#rtv','#sqb'].forEach(s=>$(s).addEventListener('click',closeMnu));
addEventListener('keydown',e=>{if(e.key!='Escape'||$('#pr').style.display=='block')return;if(!mnu.hidden)return closeMnu();const o=['qz','gloss','lab','hub'].find(id=>!$('#'+id).hidden);if(o)hideOv(o)});

// ---------- painel do satélite: abrir no laboratório ----------
const _fn=focusNode;focusNode=function(i){_fn(i);const n=get(i);if(!n||!isSat(n))return;
 const b=document.createElement('button');b.textContent='🔬 Explicar este satélite no laboratório';b.style.cssText='width:100%;margin:2px 0 6px';
 b.onclick=()=>{let e=40;if(n.t=='geo')e=CFG.geoEl;else{const l=links.find(l=>(l.a==n.id||l.b==n.id)&&up(l)),g=l&&satGeom(l);if(g)e=Math.round(g.e)}labOpen({pre:n.t=='geo'?'tv':'leo',set:{e:Math.max(5,Math.min(90,e))}})};
 const sb=$('#satb');sb?sb.prepend(b):$('#node').appendChild(b)};

// ---------- apresentação: objetivo e diapositivos novos ----------
SL[1]=['Objetivo',()=>`<h2>Uma ferramenta para os professores explicarem a ligação entre a Terra e os satélites</h2><div class="pg">${cd('Problema','Distâncias de 35 786 km, atrasos de meio segundo e perdas de 200 dB são difíceis de imaginar. As ferramentas habituais, como o Packet Tracer, não mostram o satélite nem explicam o que acontece em cada passo.')}${cd('Objetivos','• Mostrar o caminho do sinal: estação, subida, satélite e descida<br>• Calcular a distância, o atraso, a cobertura e a potência com números reais<br>• Comparar as órbitas GEO, MEO e LEO<br>• Dar aulas prontas a projetar, com perguntas para a turma<br>• Ligar tudo a uma rede real: IP, VLAN, routing, VoIP e segurança')}${cd('Solução',`O SatNet Tracer: um laboratório Satélite–Terra interativo, ${AU.length} aulas guiadas, um desafio para os alunos e um simulador de redes que explica cada ping com as contas do próprio cenário.`)}</div>`];
const SUSE=['Utilização em aula',()=>`<h2>Como os professores usam o SatNet Tracer</h2><div class="pg">${cd('🔬 Laboratório Satélite–Terra','Órbita, elevação, banda, antena e chuva ajustáveis.<br>Desenho à escala real, com o sinal animado em câmara lenta e um relógio com o tempo verdadeiro.<br>Fórmulas com os valores substituídos.<br>Comparação lado a lado de LEO, MEO e GEO.')}${cd(`📚 ${AU.length} aulas guiadas`,AU.map((a,i)=>`${i+1}. ${a.t}`).join('<br>'))}${cd('🏆 Desafio e glossário',`${QZ.length} perguntas com explicação, para projetar e responder em turma.<br>${GL.length} termos explicados em linguagem simples.<br>Um único ficheiro HTML: funciona sem instalação e sem internet.`)}</div>`];
const SLAB=['Laboratório',()=>{const g=calc({...P0,...PRE.tv}),l=calc({...P0,...PRE.leo}),k=calc({...P0,...PRE.ka}),k0=calc({...P0,...PRE.ka,rain:0}),m=x=>x.mc?`${x.mc[0]} · ${fx(x.rate,0)} Mbit/s`:'sem ligação';
 return`<h2>O laboratório faz as contas da ligação Satélite–Terra</h2><div class="pg">${cd('Distância e atraso',`<code>d = √((R+h)² − (R·cos e)²) − R·sin e\nt = d / c</code>GEO a ${PRE.tv.e}°: ${km(g.d)} km → <b>${ms(g.t1)}</b> por trajeto, RTT ≥ <b>${ms(4*g.t1)}</b><br>LEO a ${PRE.leo.e}°: ${km(l.d)} km → <b>${ms(l.t1)}</b>, RTT ≥ <b>${ms(4*l.t1)}</b>`)}${cd('Potência que chega à antena',`<code>FSPL = 92,45 + 20·log d + 20·log f</code>GEO em banda Ku: perda de <b>${fx(g.fspl,1)} dB</b><br>A parabólica recebe ≈ <b>${sci(10**(g.Pr/10))} W</b><br>Mesmo assim: ${m(g)}`)}${cd('Chuva em banda Ka',`<code>A = k·R^α·L   (ITU-R P.838)</code>Céu limpo: ${m(k0)}<br>Tempestade de 40 mm/h: <b>−${fx(k.arain,1)} dB</b><br>Passa a: ${m(k)}`)}</div>`}];
const SLIM=['Limitações',()=>`<h2>Limitações e trabalho futuro</h2><div class="pg">${cd('Limitações','• Balanço de ligação simplificado: chuva pelo modelo ITU-R P.618 reduzido e gases com valores típicos<br>• OSPF sem áreas nem LSA visíveis; ARP e DHCP explicados, não simulados trama a trama<br>• Um único LEO no cenário e sem ligações entre satélites (ISL)<br>• Sem IPv6')}${cd('Trabalho futuro','• Constelação LEO com vários satélites e handover automático<br>• Mapa-mundo com a cobertura real dos satélites<br>• Balanço da subida (uplink)<br>• Fichas de trabalho para imprimir')}${cd('Validação com a realidade','• <b>ping</b> e <b>tracert</b> reais por Starlink e por GEO<br>• Wireshark: ver o ICMP, o ARP e o 802.1Q verdadeiros<br>• Comparar o laboratório com calculadoras de balanço de ligação<br>• Topologia equivalente no Packet Tracer')}</div>`];
{const i=SL.findIndex(s=>/Limita/.test(s[0]));if(i>=0)SL.splice(i,1,SUSE,SLAB,SLIM);else SL.push(SUSE,SLAB,SLIM);
 SL.forEach((s,j)=>{s[0]=`${j+1} · ${s[0].replace(/^\d+\s*·\s*/,'')}`})}

// ---------- arranque ----------
update();hideOv('lab');syncBtns();
if(hubAuto)showOv('hub');
})();
