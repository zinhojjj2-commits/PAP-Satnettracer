// ===================== Configuração dos equipamentos: gateway, interfaces, satélites, ACL e avisos =====================
(()=>{
const isL3=n=>!!n&&(n.t=='router'||n.t=='gs');
// avisos de validação por baixo da gama de IP
const _ipUI=ipUI;ipUI=function(n){_ipUI(n);const ipi=$('#ipi');if(!ipi)return;let v=$('#ipv');if(!v){v=document.createElement('div');v.id='ipv';ipi.after(v)}
 const P=ipProblems(n);v.innerHTML=P.map(t=>`<div class="ipw">⚠ ${E(t)}</div>`).join('')};
const lbl=id=>{const e=$(id);return e?e.closest('label'):null};
const vlOpts=(n,sel)=>VL.filter(v=>!v.g||v.g==zoneG(n)).map(v=>`<option value="${v.id}" ${v.id==sel?'selected':''}>VLAN ${v.id} · ${E(v.name)}</option>`).join('');

function ifUI(n){const b=$('#ifb');if(!b)return;const F=n.ifs=n.ifs||[];
 b.innerHTML=`<h3>Interfaces</h3><table class="xt ift"><tr><th>Nome</th><th>IP/prefixo</th><th>VLAN</th><th></th></tr>
  <tr><td><input data-k="ifn" value="${E(n.ifn||'G0/0')}"></td><td><small>${E(n.ip)}/${n.cidr}<br>(campos acima)</small></td><td><input data-k="ifv" value="${n.ifv||''}" placeholder="—"></td><td></td></tr>
  ${F.map((f,i)=>`<tr><td><input data-i="${i}" data-k="nm" value="${E(f.nm||'')}"></td><td><input data-i="${i}" data-k="a" value="${E(f.ip||'')}/${f.cidr||24}"></td><td><input data-i="${i}" data-k="vlan" value="${f.vlan||''}" placeholder="—"></td><td><button data-x="${i}" title="Apagar">✕</button></td></tr>`).join('')}</table>
  <button id="ifa">+ Interface ou subinterface</button>
  <small class="inote">Num router-on-a-stick, cria uma subinterface por VLAN (ex.: G0/0.11, VLAN 11, ${E((rng(n.ip,n.cidr)||{}).net||'10.1.11.0')}…) e usa o seu IP como gateway dos hosts dessa VLAN. As interfaces Sat0/Sat1 das estações ficam nas sub-redes de trânsito dos satélites.</small>`;
 b.querySelectorAll('input').forEach(e=>e.oninput=()=>{const k=e.dataset.k;if(k=='ifn'){n.ifn=e.value;return}if(k=='ifv'){n.ifv=e.value?+e.value:undefined;ipUI(n);return}const f=F[+e.dataset.i];
  if(k=='nm')f.nm=e.value;if(k=='vlan')f.vlan=e.value?+e.value:undefined;if(k=='a'){const[ip,c]=e.value.split('/');f.ip=(ip||'').trim();f.cidr=+(c||24)}ipUI(n)});
 b.querySelectorAll('[data-x]').forEach(e=>e.onclick=()=>{F.splice(+e.dataset.x,1);ifUI(n);ipUI(n)});
 $('#ifa').onclick=()=>{F.push({nm:'G0/0.'+(F.length+1),ip:'',cidr:24});ifUI(n)}}

// editor de regras ACL reutilizado nas firewalls e nas subinterfaces dos routers
const okAddr=x=>x=='any'||/^host \d+\.\d+\.\d+\.\d+$/.test(x)&&i2n(x.slice(5))!=null||(/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(x)&&i2n(x.split('/')[0])!=null&&+x.split('/')[1]<=32);
function rulesUI(box,rules,who,redraw){const id=Math.random().toString(36).slice(2,7);
 box.insertAdjacentHTML('beforeend',`<div class="acl">${rules.map((r,i)=>`<div><code>${i+1}  ${E(aclTxt(r))}</code><button data-r${id}="${i}" title="Apagar">✕</button></div>`).join('')}<div class="imp"><code>${rules.length+1}  deny ip any any</code><small>implícita</small></div></div>
  <div class="aclf" data-af${id}><select data-f="a"><option>permit</option><option>deny</option></select><select data-f="pr"><option>ip</option><option>icmp</option><option>tcp</option><option>udp</option></select>
   <input data-f="s" placeholder="origem: any, 10.0.0.0/8 ou host 1.2.3.4"><input data-f="d" placeholder="destino" value="any"><input data-f="pt" placeholder="porta" type="number" min="1" max="65535">
   <select data-f="e"><option value="">—</option><option value="established">established</option><option value="echo-reply">echo-reply</option></select></div>
  <button data-add${id}>+ Acrescentar regra</button><span class="ipw" data-err${id}></span>`);
 box.querySelectorAll(`[data-r${id}]`).forEach(e=>e.onclick=()=>{rules.splice(+e.getAttribute('data-r'+id),1);redraw()});
 box.querySelector(`[data-add${id}]`).onclick=()=>{if(!box.querySelector(`[data-af${id}]`))return;const g=k=>box.querySelector(`[data-af${id}] [data-f="${k}"]`).value,r={a:g('a'),pr:g('pr'),s:g('s').trim()||'any',d:g('d').trim()||'any',pt:g('pt'),e:g('e')},er=box.querySelector(`[data-err${id}]`);
  if(!okAddr(r.s)||!okAddr(r.d))return er.textContent='Origem ou destino inválido. Usa any, rede/prefixo ou host IP.';
  if(r.pt&&!(r.pr=='tcp'||r.pr=='udp'))return er.textContent='A porta só se aplica a TCP ou UDP.';
  if(r.e=='established'&&r.pr!='tcp'||r.e=='echo-reply'&&r.pr!='icmp')return er.textContent='«established» só existe em TCP e «echo-reply» só em ICMP.';
  if(!r.e)delete r.e;rules.push(r);log(`🛡️ ${E(who)}: regra acrescentada «${E(aclTxt(r))}»`);redraw()}}

function aclUI(f){const b=$('#aclb');if(!b)return;f.acl=f.acl||[];const nb=links.filter(l=>l.a==f.id||l.b==f.id).map(l=>get(l.a==f.id?l.b:l.a)).filter(Boolean),out=fwOut(f);
 b.innerHTML=`<h3>Firewall com estado</h3><small class="inote">Modo transparente (camada 2): não é gateway de ninguém. O que sai de dentro para fora passa e a resposta é aceite pela tabela de estado; o que entra pela interface externa só passa se uma regra da ACL o permitir.</small>
  <label>Interface externa (outside)<select id="fwo">${nb.map(n=>`<option value="${n.id}" ${n.id==out?'selected':''}>ligação a ${E(n.name)}</option>`).join('')}</select></label>`;
 $('#fwo').onchange=e=>{f.out=+e.target.value};rulesUI(b,f.acl,f.name,()=>aclUI(f))}

// ACL de entrada por subinterface (filtra o routing entre VLAN) e port forwarding no router de fronteira
function raclUI(n){const b=$('#raclb');if(!b)return;n.iacl=n.iacl||{};const F=addrs(n),sel=b.dataset.ifn&&F.some(f=>f.nm==b.dataset.ifn)?b.dataset.ifn:(F.find(f=>(n.iacl[f.nm]||[]).length)||F[0]||{}).nm;
 b.innerHTML=`<h3>ACL entre VLAN (entrada)</h3><small class="inote">Aplicada ao tráfego que entra no router pela subinterface escolhida, ou seja, ao que sai dessa VLAN. Sem regras, tudo passa. Com regras, o que nenhuma permite é descartado pelo «deny ip any any» implícito. As respostas a ligações iniciadas noutra VLAN só passam com «established» (TCP) ou «echo-reply» (ICMP).</small>
  <label>Subinterface<select id="rif">${F.map(f=>`<option ${f.nm==sel?'selected':''}>${E(f.nm)}</option>`).join('')}</select></label>`;
 if(!sel)return;$('#rif').onchange=e=>{b.dataset.ifn=e.target.value;raclUI(n)};n.iacl[sel]=n.iacl[sel]||[];rulesUI(b,n.iacl[sel],`${n.name} ${sel}`,()=>{b.dataset.ifn=sel;raclUI(n)})}
function pfUI(n){const b=$('#pfb');if(!b)return;const pub=addrs(n).find(a=>!isPriv(a.ip));if(!pub){b.innerHTML='';return}n.pf=n.pf||[];
 const H=nodes.filter(m=>isHost(m)&&isPriv(m.ip));
 b.innerHTML=`<h3>NAT na saída para a Internet</h3><div class="ib">PAT (NAT overload) na interface <b>${E(pub.nm)}</b> (${E(pub.ip)}): todos os endereços privados saem com este IP público, cada sessão com uma porta de origem diferente.<code>access-list 1 permit 10.0.0.0 0.255.255.255
ip nat inside source list 1 interface ${E(pub.nm)} overload</code></div>
  <h3>Port forwarding (NAT estático)</h3>${n.pf.map((f,i)=>{const t=get(f.to);return`<div class="acl"><div><code>${E(pub.ip)}:${f.port}/${f.pr} → ${t?E(t.ip):'?'}:${f.tport}</code><button data-pf="${i}">✕</button></div></div>`}).join('')||'<small class="inote">Nenhum serviço publicado: da Internet não se chega a nenhum endereço interno.</small>'}
  <div class="aclf"><select id="pfp"><option>tcp</option><option>udp</option></select><input id="pfo" type="number" placeholder="porta pública" min="1" max="65535"><select id="pft">${H.map(m=>`<option value="${m.id}">${E(m.name)} (${E(m.ip)})</option>`).join('')}</select><input id="pfi" type="number" placeholder="porta interna" min="1" max="65535"></div>
  <button id="pfa">+ Publicar serviço</button>`;
 b.querySelectorAll('[data-pf]').forEach(e=>e.onclick=()=>{n.pf.splice(+e.dataset.pf,1);pfUI(n)});
 $('#pfa').onclick=()=>{const port=+$('#pfo').value,tport=+$('#pfi').value||port;if(!(port>0&&port<65536))return;n.pf.push({pr:$('#pfp').value,port,to:+$('#pft').value,tport});log(`🔁 ${E(n.name)}: ${pub.ip}:${port} publicado.`);pfUI(n)}}
// portas do switch: access ou trunk, com a configuração Cisco equivalente
function portUI(sw){const b=$('#portb');if(!b)return;const L=links.filter(l=>l.a==sw.id||l.b==sw.id);
 b.innerHTML=`<h3>Portas</h3><table class="xt ift"><tr><th>Porta</th><th>Ligado a</th><th>Modo</th><th>VLAN</th></tr>${L.map((l,i)=>{const o=get(l.a==sw.id?l.b:l.a);return`<tr><td>${portName(sw,l)}</td><td>${E(o.name)}</td><td><select data-pm="${i}"><option value="access" ${l.pm=='access'?'selected':''}>access</option><option value="trunk" ${l.pm=='trunk'?'selected':''}>trunk</option></select></td><td><input data-pv="${i}" value="${l.pm=='access'?l.pv||1:E(l.pa||'')}" placeholder="${l.pm=='trunk'?'todas':''}"></td></tr>`}).join('')}</table>
  <small class="inote">Numa porta <b>access</b>, o host pertence à VLAN da porta (a trama não leva etiqueta). Numa porta <b>trunk</b> passam várias VLAN com etiqueta 802.1Q; deixa vazio para permitir todas, ou indica uma lista (ex.: 10-14,99).</small>
  <code class="cfgc">${L.map(l=>l.pm=='access'?`interface ${portName(sw,l)}\n switchport mode access\n switchport access vlan ${l.pv||1}`:`interface ${portName(sw,l)}\n switchport mode trunk${l.pa?`\n switchport trunk allowed vlan ${E(l.pa)}`:''}`).join('\n!\n')}</code>`;
 b.querySelectorAll('[data-pm]').forEach(e=>e.onchange=()=>{const l=L[+e.dataset.pm];l.pm=e.value;if(l.pm=='access')l.pv=l.pv||1;portSync();portUI(sw)});
 b.querySelectorAll('[data-pv]').forEach(e=>e.onchange=()=>{const l=L[+e.dataset.pv];if(l.pm=='access'){const v=parseInt(e.value);if(v>=1&&v<=4094){l.pv=v;portSync()}}else l.pa=e.value.replace(/[^0-9,\-]/g,'');portUI(sw)})}

function satUI(S){const box=$('#node');[lbl('#ni'),lbl('#np'),$('#ipi'),$('#ipv')].forEach(e=>e&&e.remove());
 const L=links.filter(l=>l.a==S.id||l.b==S.id),rows=L.map(l=>{const g=satGeom(l),G=get(l.a==S.id?l.b:l.a);return`<tr><td>${E(G.name)}</td><td>${up(l)?`${Math.round(g.e)}°`:'—'}</td><td>${up(l)?Math.round(g.d).toLocaleString('pt-PT')+' km':'fora de cobertura'}</td><td>${up(l)?fmtD(g.d/299792.458*1000):'—'}</td></tr>`}).join('');
 const d=document.createElement('div');d.id='satb';d.innerHTML=`<div class="ib"><b>Sem endereço IP.</b> Repetidor transparente de camada 1 (bent-pipe): recebe, amplifica, muda a frequência e retransmite. Não lê IP nem MAC e não baixa o TTL.</div>
  <label>Sub-rede de trânsito que transporta<input type="text" id="snet" value="${E(S.net||'')}" placeholder="ex.: 100.64.0.0/29"></label>
  <h3>Ligações rádio agora</h3><table class="xt"><tr><th>Estação</th><th>Elevação</th><th>Distância</th><th>Atraso</th></tr>${rows||'<tr><td colspan="4">Sem estações ligadas</td></tr>'}</table>
  <small class="inote">${S.t=='geo'?`Atraso = distância oblíqua / c, com a elevação da antena configurada (${CFG.geoEl}°).`:'A elevação muda com a posição do satélite na órbita: quanto mais longe da estação, menor a elevação e maior a distância. Abaixo de 25° deixa de haver ligação.'}</small>`;
 box.insertBefore(d,$('#rtb'));$('#snet').oninput=e=>{S.net=e.target.value.trim()}}

const _f=focusNode;focusNode=function(i){_f(i);const n=get(i);if(!n)return;
 if(isSat(n))return satUI(n);
 const nv=$('#nv');if(nv){const sw=links.some(l=>(l.a==n.id||l.b==n.id)&&l.pm=='access');nv.onchange=e=>{setHostVlan(n,+e.target.value);focusNode(n.id)};
  if(sw)nv.closest('label').insertAdjacentHTML('beforeend','<small class="inote">Altera a VLAN da porta access do switch onde este equipamento está ligado.</small>');else if(n.t!='hk')nv.closest('label').insertAdjacentHTML('beforeend','<small class="inote">Cliente Wi-Fi: a VLAN é a do SSID a que se associa.</small>')}
 const np=lbl('#np');
 if(!isL3(n)){const l=document.createElement('label');l.innerHTML=`Gateway predefinido<input type="text" id="ngw" placeholder="ex.: 10.1.11.1">`;np.after(l);
  $('#ngw').value=n.gw||'';$('#ngw').oninput=e=>{n.gw=e.target.value.trim();ipUI(n)}}
 if(n.t=='switch'||n.t=='fw'){const l=document.createElement('label');l.innerHTML=`VLAN de gestão<select id="nmv">${vlOpts(n,n.vlan)}</select>`;np.after(l);$('#nmv').onchange=e=>n.vlan=+e.target.value}
 const ipi=$('#ipi');
 if(isL3(n)){const d=document.createElement('div');d.id='ifb';$('#rtb').before(d);ifUI(n)}
 if(n.t=='fw'){const d=document.createElement('div');d.id='aclb';$('#rtb').before(d);aclUI(n)}
 if(isL3(n)){const d=document.createElement('div');d.id='raclb';$('#rtb').before(d);raclUI(n);const e=document.createElement('div');e.id='pfb';$('#rtb').before(e);pfUI(n)}
 if(n.t=='switch'){const d=document.createElement('div');d.id='portb';$('#rtb').before(d);portUI(n)}
 ipUI(n)};
})();
