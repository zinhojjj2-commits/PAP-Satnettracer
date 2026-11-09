// ===================== VoIP: registo SIP, sinalização, RTP e qualidade (ITU-T G.114 / G.107) =====================
(()=>{
const isTel=n=>!!n&&(n.t=='ph'||n.t=='ip'),pbxs=()=>nodes.filter(n=>n.t=='srv'&&n.role=='sip');
const fx=(v,d=1)=>Number(v).toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
const RTP_PORT=16384,SIP_PORT=5060,PAY=160,IPB=PAY+12+8+20,ETH=IPB+18;   // G.711 a 20 ms: 160 B de voz + RTP + UDP + IP
function ensure(n){if(!isTel(n))return n;if(!n.ext){const z=(zones().findIndex(z=>z.m.includes(n))+1)||9;let e=z*100+1;while(nodes.some(m=>m!==n&&m.ext==e))e++;n.ext=e}return n}
function leg(A,B,pr,pt){const R=route(A,B);if(!R.ok)return{ok:0,why:R.msg};const d=fwDeny(R.P,A,B,pr,pt);if(d)return{ok:0,why:d.txt};
 const T=RTTparts(R.P,ETH);return{ok:1,P:R.P,ow:T.ow,sat:R.P.some(i=>isSat(get(i))),wifi:R.P.some((id,i)=>i<R.P.length-1&&(lk(id,R.P[i+1])||{}).c=='wifi'),notes:fwNotes(R.P,A,B,pr,pt)}}
function reg(n){const S=pbxs();if(!S.length)return{ok:0,why:'Não há nenhum servidor SIP (PBX) na rede. Acrescenta um 🖥️ Servidor e escolhe o papel «Servidor SIP (PBX)».'};
 let first=null;for(const s of S){const a=leg(n,s,'udp',SIP_PORT),b=leg(s,n,'udp',SIP_PORT);if(a.ok&&b.ok)return{ok:1,pbx:s,up:a,dn:b};first=first||(a.ok?{ok:0,why:'o servidor SIP recebe o REGISTER mas a resposta não volta: '+b.why,pbx:s}:{ok:0,why:a.why,pbx:s})}
 return first}
window.voipReg=reg;

// ---------- qualidade: modelo E simplificado (ITU-T G.107) ----------
function quality(m,loss){const jm=m.sat?CFG.jitter:m.wifi?2:.5,jb=Math.max(20,Math.ceil(2*jm)),Ta=m.ow+20+jb;
 const Id=.024*Ta+(Ta>177.3?.11*(Ta-177.3):0),Ie=95*loss/(loss+25.1),R=Math.max(0,Math.min(100,93.2-Id-Ie));
 const MOS=R<=0?1:R>=100?4.5:1+.035*R+7e-6*R*(R-60)*(100-R);
 const cls=R>=90?'Excelente':R>=80?'Boa':R>=70?'Razoável':R>=60?'Fraca':'Má',g114=Ta<=150?'aceitável para a maioria dos utilizadores':Ta<=400?'aceitável, mas a conversa nota o atraso':'inaceitável para planeamento de redes';
 return{jm,jb,Ta,Id,Ie,R,MOS,cls,g114}}

// ---------- chamadas ----------
const CALLS=[];let CN=0;
const busy=n=>CALLS.find(c=>c.st!='end'&&(c.A===n||c.B===n));
const stamp=t=>`<span class="vt">+${t<1000?fx(t,1)+' ms':fx(t/1000,2)+' s'}</span>`;
window.voipCall=(a,b)=>{const A=ensure(get(a)),B=ensure(get(b));if(!A||!B||A===B)return;
 if(!isTel(A)||!isTel(B))return log('⚠ As chamadas VoIP são feitas entre 📱 telemóveis e ☎️ telefones VoIP. Escolhe dois desses equipamentos.');
 if(busy(A))return log(`⚠ ${E(A.name)} já está numa chamada. Desliga primeiro.`);const bB=busy(B);
 const C={id:++CN,A,B,t0:performance.now(),st:'setup',msgs:[],log:[]};CALLS.push(C);
 const say=(t,m)=>{C.msgs.push([t,m]);log(`&nbsp;&nbsp;${stamp(t)} ${m}`)};
 log(`📞 ${E(A.name)} (ext. ${A.ext}) liga para ${E(B.name)} (ext. ${B.ext})`);
 const rA=reg(A);if(!rA.ok){C.st='end';C.fail=`${A.name} não está registado no servidor SIP: ${rA.why}`;log('&nbsp;&nbsp;❌ '+E(C.fail));return done(C)}
 const P=rA.pbx,rB=reg(B),tA=rA.up.ow,tAb=rA.dn.ow;
 say(0,`${E(A.name)} → ${E(P.name)}: <b>INVITE</b> sip:${B.ext}@${P.ip} <small>(SDP: G.711 A-law, RTP ${A.ip}:${RTP_PORT})</small>`);
 say(tA,`${E(P.name)} → ${E(A.name)}: <b>100 Trying</b>`);
 if(!rB.ok){setTimeout(()=>{C.st='end';C.fail=`${B.name} não está registado: ${rB.why}`;say(tA+tAb,`${E(P.name)} → ${E(A.name)}: <b>480 Temporarily Unavailable</b>`);done(C)},tA+tAb);return}
 if(bB){setTimeout(()=>{C.st='end';C.fail=`${B.name} já está numa chamada.`;say(tA+tAb,`${E(P.name)} → ${E(A.name)}: <b>486 Busy Here</b>`);done(C)},tA+tAb);return}
 const tB=leg(P,B,'udp',SIP_PORT).ow,tBb=rB.up.ow,RING=2500;
 C.pdd=tA+tB+tBb+tAb;C.pbx=P;C.sig={tA,tAb,tB,tBb};
 say(tA,`${E(P.name)} → ${E(B.name)}: <b>INVITE</b>`);
 setTimeout(()=>{C.st='ring';say(tA+tB,`${E(B.name)} → ${E(P.name)}: <b>180 Ringing</b> <small>(o telefone toca)</small>`);
  say(C.pdd,`${E(P.name)} → ${E(A.name)}: <b>180 Ringing</b> <small>(${E(A.name)} ouve o sinal de chamada)</small>`);paint()},tA+tB);
 const ans=tA+tB+RING;
 setTimeout(()=>{say(ans,`${E(B.name)} atende → ${E(P.name)}: <b>200 OK</b> <small>(SDP: G.711 A-law, RTP ${B.ip}:${RTP_PORT})</small>`)},ans);
 setTimeout(()=>{const t=ans+tBb+tAb;say(t,`${E(P.name)} → ${E(A.name)}: <b>200 OK</b>`);say(t,`${E(A.name)} → ${E(B.name)}: <b>ACK</b>`);
  C.m=leg(A,B,'udp',RTP_PORT);C.mb=leg(B,A,'udp',RTP_PORT);C.st='talk';C.ts=performance.now();
  if(!C.m.ok||!C.mb.ok){C.oneway=!C.m.ok?`${A.name} → ${B.name}: ${C.m.why}`:`${B.name} → ${A.name}: ${C.mb.why}`;log(`&nbsp;&nbsp;⚠ A chamada foi estabelecida, mas o RTP não passa num dos sentidos (${E(C.oneway)}): <b>áudio só num sentido ou sem áudio</b>.`)}
  else{C.q=quality(C.m,CFG.loss);log(`&nbsp;&nbsp;🔊 RTP direto ${E(A.name)} ↔ ${E(B.name)}${C.m.sat?' via satélite':''}: atraso boca-ouvido ${fx(C.q.Ta,0)} ms · R = ${fx(C.q.R,0)} · MOS ${fx(C.q.MOS,2)} (${C.q.cls})`)}
  explainCall(C);paint()},ans+tBb+tAb)};
window.voipHang=(id,who)=>{const C=CALLS.find(c=>c.id==id);if(!C||C.st=='end')return;const X=who||C.A,Y=X===C.A?C.B:C.A,dur=C.ts?(performance.now()-C.ts)/1000:0;
 C.st='end';log(`📴 ${E(X.name)} → ${E(Y.name)}: <b>BYE</b> · ${E(Y.name)}: <b>200 OK</b> · duração ${Math.floor(dur/60)}:${String(Math.floor(dur%60)).padStart(2,'0')}`);paint()};
function done(C){explainCall(C);paint()}
window.voipHangAll=()=>CALLS.filter(c=>c.st!='end').forEach(c=>voipHang(c.id));

// ---------- explicação ----------
function explainCall(C){XN++;let sc=0;const stp=(t,b)=>`<div class="xs"><b>${++sc}. ${t}</b><div>${b}</div></div>`,A=C.A,B=C.B;
 let h=`<div class="xc"><h4>📞 Chamada VoIP #${XN}: ${E(A.name)} → ${E(B.name)}</h4>`;
 h+=stp('Como funciona uma chamada VoIP',`A voz é transportada em pacotes IP. Há dois tipos de tráfego separados:<br><b>Sinalização SIP</b> (Session Initiation Protocol, RFC 3261, UDP 5060): estabelece e termina a chamada através do <b>servidor SIP (PBX)</b>, onde cada telefone se regista com a sua extensão.<br><b>Media RTP</b> (Real-time Transport Protocol, RFC 3550, UDP ${RTP_PORT}+): a voz propriamente dita, que segue <b>diretamente</b> entre os dois telefones, sem passar pelo PBX.<br>O telemóvel usa uma aplicação softphone sobre Wi-Fi; para a rede IP é um host como o telefone de secretária.`);
 if(C.fail&&!C.sig){h+=stp('Registo SIP falhou',`${E(C.fail)}<br><br>Antes de fazer ou receber chamadas, cada telefone envia um <b>REGISTER</b> ao PBX ("a extensão ${A.ext} está no IP ${E(A.ip)}") e recebe <b>200 OK</b>. Sem registo, o PBX não sabe onde está o telefone. O REGISTER precisa de caminho IP até ao PBX nos dois sentidos e de a firewall permitir UDP 5060.`)}
 else{const s=C.sig||{};h+=stp('Registo SIP',`${E(A.name)} (ext. ${A.ext}, ${E(A.ip)}) e ${E(B.name)} (ext. ${B.ext}, ${E(B.ip)}) registaram-se em <b>${E((C.pbx||{}).name||'?')}</b> (${E((C.pbx||{}).ip||'?')}:5060). O PBX guarda a tabela extensão → IP e é por ela que encaminha o INVITE.`);
  h+=stp('Sinalização SIP, mensagem a mensagem',`<table class="xt"><tr><th>Tempo</th><th>Mensagem</th></tr>${C.msgs.map(([t,m])=>`<tr><td>${stamp(t)}</td><td>${m}</td></tr>`).join('')}</table>
   O <b>SDP</b> dentro do INVITE e do 200 OK é a «negociação»: cada lado diz que codec aceita (G.711) e em que IP e porta quer receber a voz.${C.pdd!=null?`<br><b>Atraso de estabelecimento</b> (até ouvir o sinal de chamada): 2 × (${fx(s.tA,1)} + ${fx(s.tB,1)}) ms ≈ <b>${fx(C.pdd,0)} ms</b>. Cada mensagem sofre o atraso do caminho até ao PBX e do PBX ao destino.`:''}${C.fail?`<br><br><b>Resultado:</b> ${E(C.fail)}`:''}`)}
 if(C.st=='talk'||C.m){if(C.oneway)h+=stp('Áudio num só sentido',`A sinalização passou (SIP via PBX), mas o RTP vai diretamente entre os telefones por outro caminho, e esse caminho falhou: ${E(C.oneway)}<br>É um problema clássico do VoIP: a firewall ou o routing deixam passar a porta 5060 mas não as portas RTP, ou não há rota de volta. Solução: permitir UDP ${RTP_PORT}–32767 entre as redes de voz e garantir rota nos dois sentidos.`);
  else{const q=C.q,m=C.m;
   h+=stp('Fluxo de voz (RTP)',`Codec <b>G.711 A-law</b> (64 kbit/s), amostrado a 8 kHz. A cada <b>20 ms</b> o telefone envia um pacote com 160 bytes de voz, ou seja, <b>50 pacotes por segundo em cada sentido</b>.<table class="xt"><tr><th>Camada</th><th>Bytes</th></tr><tr><td>Voz G.711 (20 ms)</td><td>160</td></tr><tr><td>Cabeçalho RTP</td><td>12</td></tr><tr><td>Cabeçalho UDP</td><td>8</td></tr><tr><td>Cabeçalho IP</td><td>20</td></tr><tr><td><b>Pacote IP</b></td><td><b>${IPB}</b></td></tr><tr><td>Ethernet (14 + FCS 4)</td><td>18</td></tr></table>
    Débito por sentido: ${IPB} B × 8 × 50 = <b>${fx(IPB*8*50/1000,0)} kbit/s</b> em IP, <b>${fx(ETH*8*50/1000,1)} kbit/s</b> em Ethernet. Os cabeçalhos pesam ${fx(100*(IPB-PAY)/IPB,0)}% de cada pacote: é por isso que o VoIP usa pacotes pequenos mas frequentes.${m.sat&&CFG.ipsec?`<br><b>No troço de satélite</b> o RTP vai dentro de <b>IPsec ESP em modo túnel</b> (AES-GCM): novo cabeçalho IP 20 B + ESP 8 B + IV 8 B + trailer 2 a 5 B + ICV 16 B ≈ 56 B por pacote. O débito nesse troço sobe para ≈ <b>${fx((IPB+56)*8*50/1000,0)} kbit/s</b> por sentido.`:''}
    <br>Caminho da voz: ${m.P.map(i=>E(get(i).name)).join(' → ')}.${m.sat?` Uma ligação de satélite de 20 Mbit/s aguentaria, só em débito, cerca de <b>${Math.floor(20e6/(IPB*8*50))} chamadas</b> em simultâneo.`:''}`);
   h+=stp('Atraso boca-ouvido (ITU-T G.114)',`<code>atraso = rede + empacotamento + buffer de jitter</code>
    Rede (só ida, propagação + transmissão + processamento): <b>${fx(m.ow,1)} ms</b>${m.wifi?' <small>(inclui o acesso ao meio no Wi-Fi)</small>':''}<br>Empacotamento G.711: <b>20 ms</b> (o telefone espera juntar 20 ms de voz antes de enviar)<br>Buffer de jitter: <b>${q.jb} ms</b> (absorve a variação de até ${fx(q.jm,1)} ms na chegada dos pacotes)<br><b>Total: ${fx(q.Ta,0)} ms</b>, ${q.g114}. <small>A G.114 recomenda até 150 ms; acima de 400 ms a conversa torna-se difícil (as pessoas falam ao mesmo tempo).</small>`);
   h+=stp('Qualidade: modelo E simplificado (ITU-T G.107)',`Usa-se a forma simplificada do modelo E (aproximação de Cole e Rosenbluth), que considera só o atraso e as perdas. Os restantes fatores (ruído, eco, terminais) ficam nos valores por omissão da G.107.<code>R = 93,2 − Id − Ie,ef</code>
    <b>Id</b> (atraso) = 0,024 × ${fx(q.Ta,0)}${q.Ta>177.3?` + 0,11 × (${fx(q.Ta,0)} − 177,3)`:''} = <b>${fx(q.Id,1)}</b><br><b>Ie,ef</b> (codec e perdas) = 95 × ${CFG.loss} / (${CFG.loss} + 25,1) = <b>${fx(q.Ie,1)}</b> <small>(G.711 com ocultação de perdas: Ie = 0 e Bpl = 25,1, valores da ITU-T G.113; sem perdas é 0)</small><br><b>R = ${fx(q.R,1)}</b> → <b>MOS = ${fx(q.MOS,2)}</b> (escala de 1 a 5) · qualidade <b>${q.cls}</b>
    <table class="xt"><tr><th>R</th><th>MOS</th><th>Utilizadores</th></tr><tr><td>90–100</td><td>4,3–4,5</td><td>muito satisfeitos</td></tr><tr><td>80–90</td><td>4,0–4,3</td><td>satisfeitos</td></tr><tr><td>70–80</td><td>3,6–4,0</td><td>alguns insatisfeitos</td></tr><tr><td>60–70</td><td>3,1–3,6</td><td>muitos insatisfeitos</td></tr><tr><td>&lt; 60</td><td>&lt; 3,1</td><td>quase todos insatisfeitos</td></tr></table>`);
   h+=stp('Conclusão',`${m.sat?`O satélite domina o atraso. ${m.P.some(i=>get(i).t=='geo')?'Por GEO, cada sentido demora cerca de 250 ms só de propagação: a voz funciona, mas nota-se a pausa antes da resposta. É o caso típico em que se prefere o LEO.':'Por LEO o atraso fica dentro do recomendado e a chamada é praticamente igual a uma chamada local.'}`:'Chamada local: o atraso é quase todo empacotamento e buffer; a rede quase não conta.'}<br><b>Aplicado neste cenário:</b> VLAN de voz separada (${A.vlan==B.vlan?`VLAN ${A.vlan}`:`VLAN ${A.vlan} e ${B.vlan}`}).<br><b>Recomendado numa rede real (não simulado aqui):</b> marcação DSCP EF (46) no RTP e CS3 na sinalização, e fila de prioridade (LLQ) na ligação de satélite, para a voz passar à frente dos dados quando a ligação está cheia.`)}}
 XH.unshift(h+'</div>');XH=XH.slice(0,20);xpShow()}

// ---------- painel do telefone e do servidor ----------
const _f=focusNode;focusNode=function(i){_f(i);const n=get(i);if(!n)return;const box=$('#node');if(!box)return;
 let d=$('#vpb');if(!d){d=document.createElement('div');d.id='vpb';const r=$('#rtb');r?r.before(d):box.appendChild(d)}cur=n.id;paint()};
let cur=null;
function paint(){const d=$('#vpb');if(!d)return;const n=get(cur);if(!n){d.innerHTML='';return}
 if(n.t=='srv'){d.innerHTML=`<label>Serviço instalado<select id="srole"><option value="">Servidor genérico</option><option value="sip">Servidor SIP (PBX) — VoIP</option><option value="web">Servidor Web (HTTP/HTTPS)</option><option value="fich">Servidor de ficheiros (SMB)</option></select></label>${n.role=='sip'?`<h3>Telefones registados</h3><table class="xt"><tr><th>Ext.</th><th>Telefone</th><th>Estado</th></tr>${nodes.filter(isTel).map(ensure).map(t=>{const r=reg(t);return`<tr><td>${t.ext}</td><td>${E(t.name)}<br><small>${E(t.ip)}</small></td><td>${r.ok&&r.pbx===n?'✅ registado':r.ok?'noutro PBX':'❌ '+E(r.why).slice(0,70)}</td></tr>`}).join('')}</table><small class="inote">O PBX recebe o REGISTER de cada telefone (UDP 5060) e guarda a relação extensão → IP. Encaminha a sinalização das chamadas; a voz (RTP) segue diretamente entre os telefones.</small>`:''}`;
  $('#srole').value=n.role||'';$('#srole').onchange=e=>{n.role=e.target.value;paint()};return}
 if(!isTel(n)){d.innerHTML='';return}ensure(n);const r=reg(n),c=busy(n),others=nodes.filter(m=>isTel(m)&&m!==n).map(ensure);
 const q=c&&c.q,dur=c&&c.ts?(performance.now()-c.ts)/1000:0;
 d.innerHTML=`<h3>Telefone VoIP</h3><label>Extensão<input type="text" id="vext" value="${n.ext}"></label>
  <div class="ib">${r.ok?`✅ Registado em <b>${E(r.pbx.name)}</b> (${E(r.pbx.ip)}:5060)`:`❌ Não registado: ${E(r.why)}`}</div>
  ${c?`<div class="ic vcall"><b>${c.st=='talk'?'📞 Em chamada':c.st=='ring'?'🔔 A tocar…':'📞 A ligar…'}</b><span>${E((c.A===n?c.B:c.A).name)} · ext. ${(c.A===n?c.B:c.A).ext}</span>
   ${c.st=='talk'?`<span class="vtm">${Math.floor(dur/60)}:${String(Math.floor(dur%60)).padStart(2,'0')}</span>${q?`<div class="vq"><span>Boca-ouvido <b>${fx(q.Ta,0)} ms</b></span><span>R <b>${fx(q.R,0)}</b></span><span>MOS <b>${fx(q.MOS,2)}</b></span><span>${q.cls}</span></div><small>G.711 · ${fx(IPB*8*50/1000,0)} kbit/s por sentido · ${c.m.sat?'via satélite':'local'}</small>`:`<small class="ipw">Sem áudio num dos sentidos.</small>`}`:''}
   <button id="vhang" class="vh">Desligar</button></div>`
  :`<div class="vcl">${others.length?others.map(m=>`<div><span>${E(m.name)}<small>ext. ${m.ext}</small></span><button data-call="${m.id}" ${r.ok&&!busy(m)?'':'disabled'}>${busy(m)?'Ocupado':'Ligar'}</button></div>`).join(''):'<small>Não há outros telefones na rede.</small>'}</div>`}`;
 $('#vext').onchange=e=>{const v=+e.target.value;if(v>0&&!nodes.some(m=>m!==n&&m.ext==v))n.ext=v;else e.target.value=n.ext};
 d.querySelectorAll('[data-call]').forEach(b=>b.onclick=()=>voipCall(n.id,+b.dataset.call));
 const h=$('#vhang');if(h)h.onclick=()=>voipHang(c.id,n)}
setInterval(()=>{const n=get(cur);if(n&&isTel(n)&&busy(n)){const t=$('.vtm'),c=busy(n);if(t&&c.ts){const s=(performance.now()-c.ts)/1000;t.textContent=`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`}if(c.st=='talk'&&!t)paint()}},500);

// ---------- no mapa: caminho da voz e estado dos telefones ----------
const NS='http://www.w3.org/2000/svg',lay=document.createElementNS(NS,'g');lay.setAttribute('pointer-events','none');document.querySelector('#pk').parentNode.insertBefore(lay,document.querySelector('#pk'));
setInterval(()=>{if(document.hidden)return;const t=performance.now()/1000;let h='';
 CALLS.filter(c=>c.st!='end').forEach(c=>{const pts=(c.m&&c.m.ok?c.m.P:[c.A.id,c.B.id]).map(get).filter(Boolean),on=c.st=='talk'&&c.q;
  h+=`<polyline points="${pts.map(n=>n.x+','+n.y).join(' ')}" fill="none" stroke="${on?'#5dffa0':'#ffd166'}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${on?'2 10':'10 8'}" stroke-dashoffset="${(-t*40).toFixed(0)}" opacity=".85"/>`;
  [c.A,c.B].forEach(n=>{const lab=c.st=='talk'?(c.q?`📞 MOS ${fx(c.q.MOS,1)}`:'📞 sem áudio'):c.st=='ring'?(n===c.B?'🔔 a tocar':'📞 a chamar'):'📞 a ligar';const w=lab.length*6.4+18;
   h+=`<g transform="translate(${n.x},${n.y-54})"><rect x="${-w/2}" y="-10" width="${w}" height="20" rx="10" fill="rgba(6,10,22,.88)" stroke="${on?'#5dffa0':'#ffd166'}"/><text y="4" text-anchor="middle" font-size="11" font-weight="600" fill="${on?'#5dffa0':'#ffd166'}">${lab}</text></g>`})});
 if(h!==lay._h){lay.innerHTML=h;lay._h=h}},100);
})();
