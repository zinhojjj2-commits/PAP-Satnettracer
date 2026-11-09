// ===================== Núcleo de rede: interfaces, camada 2/3, OSPF, ACL, validação e latência física =====================
(()=>{
const C=299792.458,RE=6371,HGEO=35786,HLEO=550;
const isL3=n=>!!n&&(n.t=='router'||n.t=='gs');
const isEnd=n=>!!n&&!isL3(n)&&!isSat(n)&&n.t!='switch'&&n.t!='fw'&&n.t!='ap';   // hosts: não reencaminham tramas
const mask=p=>p?(0xFFFFFFFF<<(32-p))>>>0:0;
const inNet=(ip,net,p)=>{const a=i2n(ip),b=i2n(net);return a!=null&&b!=null&&((a&mask(p))>>>0)==((b&mask(p))>>>0)};
const netOf=(ip,p)=>{const a=i2n(ip);return a==null?null:n2i((a&mask(p))>>>0)};
CAB.radio=['Rádio (satélite)','#ffd166'];CAB.wifi=['Wi-Fi','#7ee0ff'];
window.wifiOf=(A,B)=>{const ap=[A,B].find(n=>n&&n.t=='ap'),o=ap===A?B:A;return ap&&o&&!['switch','router','gs','fw','ap'].includes(o.t)&&!isSat(o)?'wifi':null};

// ---------- endereços privados e NAT ----------
const PRIV=[['10.0.0.0',8],['172.16.0.0',12],['192.168.0.0',16],['100.64.0.0',10]];   // RFC 1918 e RFC 6598: não encaminhados na Internet
window.isPriv=ip=>PRIV.some(([n,p])=>inNet(ip,n,p));

// ---------- endereços de cada equipamento ----------
// a interface principal é n.ip/n.cidr; routers e estações têm interfaces extra em n.ifs
function addrs(n){if(!n||isSat(n))return[];const o=[];if(i2n(n.ip)!=null)o.push({ip:n.ip,cidr:+n.cidr,nm:n.ifn||(isL3(n)?'G0/0':'NIC'),vlan:isL3(n)?n.ifv:n.vlan,pri:1});
 (n.ifs||[]).forEach(f=>{if(i2n(f.ip)!=null&&f.cidr>=1&&f.cidr<=32)o.push({ip:f.ip,cidr:+f.cidr,nm:f.nm||'?',vlan:f.vlan})});return o}
window.addrs=addrs;
const addrIn=(n,net,p)=>addrs(n).find(a=>a.cidr==p&&netOf(a.ip,p)==net);
const owner=ip=>nodes.find(n=>addrs(n).some(a=>a.ip==ip));
window.gwNode=A=>A&&A.gw?nodes.find(n=>isL3(n)&&addrs(n).some(a=>a.ip==A.gw))||null:null;
window.ifOf=(n,ip)=>addrs(n).find(a=>a.ip==ip)||null;
// router de fronteira: primeiro router do caminho com uma interface pública (faz PAT na saída)
window.edgeOf=p=>{for(let i=0;i<p.length;i++){const n=get(p[i]);if(isL3(n)){const a=addrs(n).find(x=>!isPriv(x.ip));if(a)return{R:n,pub:a.ip,ifn:a.nm,i}}}return null};
window.natInfo=(p,A,B)=>{if(!p||!isPriv(A.ip)||isPriv(B.ip))return null;const e=edgeOf(p);return e?{patI:e.i,patIp:e.pub,R:e.R,ifn:e.ifn}:null};
// port forwarding (NAT estático de porta) publicado num router de fronteira
window.pfFor=(B,pr)=>{for(const R of nodes.filter(isL3))for(const f of(R.pf||[])){if(f.to==B.id&&(!pr||f.pr==pr)){const a=addrs(R).find(x=>!isPriv(x.ip));if(a)return{R,pub:a.ip,ifn:a.nm,pf:f}}}return null};

// ---------- validação de endereços ----------
function problems(n){const P=[];if(!n)return P;if(isSat(n))return P;
 addrs(n).concat(i2n(n.ip)==null?[{ip:n.ip,cidr:n.cidr,bad:1}]:[]).forEach(a=>{
  if(a.bad){P.push(`IP inválido «${n.ip}»`);return}
  const r=rng(a.ip,a.cidr);if(!r)return;
  if(a.cidr<31&&a.ip==r.net)P.push(`${a.ip} é o endereço de rede de ${r.net}/${a.cidr}: não pode ser atribuído a uma interface`);
  if(a.cidr<31&&a.ip==r.bc)P.push(`${a.ip} é o endereço de broadcast de ${r.net}/${a.cidr}: não pode ser atribuído a uma interface`);
  const d=nodes.filter(m=>m!==n&&addrs(m).some(b=>b.ip==a.ip));if(d.length)P.push(`conflito de IP: ${a.ip} também está em ${d.map(m=>m.name).join(', ')}`)});
 if(!isL3(n)&&n.gw){const r=rng(n.ip,n.cidr);if(i2n(n.gw)==null)P.push(`gateway «${n.gw}» inválido`);
  else if(r&&!inNet(n.gw,r.net,n.cidr))P.push(`o gateway ${n.gw} está fora da sub-rede ${r.net}/${n.cidr}`);
  else if(n.gw==n.ip)P.push('o gateway não pode ser o próprio IP')}
 return P}
window.ipProblems=problems;

// ---------- latência física ----------
const slant=(h,e)=>Math.sqrt((RE+h)**2-(RE*Math.cos(e*Math.PI/180))**2)-RE*Math.sin(e*Math.PI/180);
window.slant=slant;
function satGeom(l){const a=get(l.a),b=get(l.b),S=isSat(a)?a:isSat(b)?b:null,G=S===a?b:a;if(!S)return null;
 if(S.t=='geo'){const e=CFG.geoEl||45,d=slant(HGEO,e);return{S,G,e,d}}
 const dist=Math.hypot(S.x-G.x,S.y-G.y),e=Math.max(25,90-(dist/(CFG.range||560))*65),d=slant(HLEO,e);return{S,G,e,d}}
window.satGeom=satGeom;
const VEL={utp:.65*C,fibra:.67*C};                 // km/s (NVP do cobre ≈ 0,65; fibra ≈ 0,67)
const LEN=l=>l.len||(l.c=='fibra'?(CFG.fib||500):(CFG.len||30)); // metros
window.WIFI_ACC=1;
window.DLY=l=>{if(!l)return 0;const g=satGeom(l);if(g)return g.d/C*1000;if(l.c=='wifi')return .01/C*1000+WIFI_ACC;return LEN(l)/1000/(VEL[l.c]||VEL.utp)*1000};
const RATE=l=>satGeom(l)?20e6:l.c=='wifi'?300e6:1e9;                  // bit/s: 20 Mbit/s no satélite, 1 Gbit/s em cabo
const PROC={lt:.05,srv:.03,ap:.02,pc:.05,iot:.05,hk:.05,db:.05,bk:.05,ph:.08,pr:.08,cam:.08,ip:.06,ac:.1,sn:.1,switch:.005,router:.05,fw:.08,gs:.5,geo:0,leo:0};
window.PROC=PROC;
const FRAME=78*8;
window.RTTparts=(p,bytes)=>{const L=[],N=[],F=(bytes||78)*8;for(let i=0;i<p.length-1;i++){const l=lk(p[i],p[i+1]),pr=DLY(l),tx=F/RATE(l)*1000;L.push({a:p[i],b:p[i+1],l,pr,tx,len:satGeom(l)?satGeom(l).d*1000:l.c=='wifi'?10:LEN(l)})}
 p.slice(1,-1).forEach(id=>{const n=get(id);N.push({n,ms:PROC[n.t]||0})});const B=get(p.at(-1));
 const ow=L.reduce((s,x)=>s+x.pr+x.tx,0)+N.reduce((s,x)=>s+x.ms,0);return{L,N,dst:PROC[B.t]||.05,ow,rtt:2*ow+(PROC[B.t]||.05)}};
window.RTT=p=>RTTparts(p).rtt;
window.JIT=p=>p.some(i=>isSat(get(i)))?Math.random()*CFG.jitter:Math.random()*.02;
window.fmtD=ms=>ms<.001?(ms*1e6).toFixed(0)+' ns':ms<1?(ms*1000).toLocaleString('pt-PT',{maximumFractionDigits:ms<.01?2:1})+' µs':ms.toLocaleString('pt-PT',{maximumFractionDigits:1})+' ms';
window.fmtT=ms=>ms.toLocaleString('pt-PT',{minimumFractionDigits:ms<10?2:1,maximumFractionDigits:ms<10?2:1})+' ms';

// ---------- portas dos switches: access (uma VLAN, sem etiqueta) ou trunk 802.1Q (várias VLAN, com etiqueta) ----------
// a VLAN de um host é a da porta do switch onde está ligado; os clientes Wi-Fi ficam na VLAN do SSID
const swOf=l=>{const a=get(l.a),b=get(l.b);return a&&a.t=='switch'?a:b&&b.t=='switch'?b:null};
const inList=(v,al)=>!al||String(al).split(',').map(x=>x.trim()).filter(Boolean).some(x=>{if(x.includes('-')){const[i,j]=x.split('-').map(Number);return v>=i&&v<=j}return +x==v});
window.carries=(l,v)=>{if(!swOf(l))return true;return l.pm=='access'?(l.pv||1)==v:inList(v,l.pa)};
window.portName=(sw,l)=>'Gi0/'+(links.filter(k=>k.a==sw.id||k.b==sw.id).indexOf(l)+1);
window.portSync=()=>{links.forEach(l=>{const s=swOf(l);if(!s)return;const o=get(l.a==s.id?l.b:l.a);if(!o)return;
  if(!l.pm){if(isHost(o)){l.pm='access';l.pv=o.vlan||1}else{l.pm='trunk';l.pa=''}}
  if(l.pm=='access'&&isHost(o))o.vlan=l.pv||1})};
window.setHostVlan=(n,v)=>{n.vlan=v;links.forEach(l=>{if((l.a==n.id||l.b==n.id)&&l.pm=='access')l.pv=v})};
// VLAN em que a trama sai do equipamento de origem (subinterface do router, VLAN da porta, VLAN de gestão)
const fvl=(A,net,p)=>{if(isL3(A)){const f=addrIn(A,net,p);return f&&f.vlan?f.vlan:1}return A.vlan||1};

// ---------- camada 2: só switches, access points, firewalls transparentes e satélites reencaminham tramas ----------
const satOK=(S,net,p)=>!S.net||S.net==net+'/'+p;
function l2(a,b,net,p,lf){const A=get(a),B=get(b);if(!A||!B)return null;
 if(CFG.vlanOn&&!isL3(A)&&!isL3(B)&&!isSat(A)&&!isSat(B)&&(A.vlan||1)!=(B.vlan||1))return null;   // VLAN diferentes = domínios de broadcast diferentes
 const v=fvl(A,net,p),L=links.filter(lf||up),q=[[a]],seen=new Set([a]);
 while(q.length){const P=q.shift(),c=P.at(-1);if(c==b)return P;const n=get(c);
  if(c!=a&&(isEnd(n)||isL3(n)))continue;                                   // hosts e routers não reencaminham tramas
  if(c!=a&&isSat(n)&&net&&!satOK(n,net,p))continue;
  L.forEach(k=>{if(k.a!=c&&k.b!=c)return;const o=k.a==c?k.b:k.a;if(seen.has(o)||(CFG.vlanOn&&!carries(k,v)))return;seen.add(o);q.push([...P,o])})}return null}
window.l2=l2;
l2path=(a,b)=>{const A=get(a),r=rng(A&&A.ip,A&&A.cidr);return l2(a,b,r&&r.net,A&&A.cidr)};
gwOf=A=>gwNode(A);

// ---------- OSPF: SPF (Dijkstra) com custo = atraso da ligação em ms (ip ospf cost) ----------
// estado das adjacências: uma ligação nova só entra no SPF depois do hello (10 s); uma falha só é detetada
// pelo BFD (3 × 300 ms) ou, sem BFD, pelo dead timer (40 s). Até lá os pacotes perdem-se.
let G=null,GT=0;const LS=new WeakMap(),HELLO=10000,DEAD=40000,BFD=900;
setInterval(()=>{const t=performance.now();links.forEach(l=>{const u=up(l),s=LS.get(l);if(!s)LS.set(l,{u,t:-1e9});else if(s.u!=u){s.u=u;s.t=t;G=null}})},100);
const ospfUp=l=>{const s=LS.get(l),u=up(l);if(!s)return u;const dt=performance.now()-s.t;return s.u?dt>=HELLO:dt<(CFG.bfd?BFD:DEAD)};
window.ospfPending=()=>links.some(l=>{const s=LS.get(l);return s&&up(l)!=ospfUp(l)});
// usado nas aulas guiadas: dá as adjacências como estáveis (salta a espera dos hellos) e força um novo SPF
window.ospfReset=()=>{links.forEach(l=>LS.set(l,{u:up(l),t:-1e9}));G=null};
function graph(){const t=performance.now();if(G&&t-GT<200)return G;
 const R3=nodes.filter(isL3),adj=new Map(R3.map(n=>[n.id,[]]));
 for(let i=0;i<R3.length;i++)for(let j=i+1;j<R3.length;j++){const X=R3[i],Y=R3[j];
  addrs(X).forEach(ax=>{const ay=addrIn(Y,netOf(ax.ip,ax.cidr),ax.cidr);if(!ay)return;const net=netOf(ax.ip,ax.cidr),P=l2(X.id,Y.id,net,ax.cidr,ospfUp);if(!P)return;
   let d=0;for(let k=0;k<P.length-1;k++)d+=DLY(lk(P[k],P[k+1]));const c=Math.max(1,Math.round(d));
   adj.get(X.id).push({to:Y.id,c,net,p:ax.cidr,ifc:ax.nm});adj.get(Y.id).push({to:X.id,c,net,p:ax.cidr,ifc:ay.nm})})}
 G={R3,adj};GT=t;return G}
function spf(src){const {adj}=graph(),D=new Map([[src,{d:0,f:null}]]),done=new Set();
 while(true){let u=null,best=Infinity;D.forEach((v,k)=>{if(!done.has(k)&&v.d<best){best=v.d;u=k}});if(u==null)break;done.add(u);
  (adj.get(u)||[]).forEach(e=>{const nd=best+e.c,cur=D.get(e.to);if(!cur||nd<cur.d||(nd==cur.d&&(u==src?e.to:D.get(u).f)<cur.f))D.set(e.to,{d:nd,f:u==src?e.to:D.get(u).f})})}
 return D}
subnets=()=>{const m=new Map();nodes.forEach(n=>addrs(n).forEach(a=>{const k=netOf(a.ip,a.cidr)+'/'+a.cidr;if(!m.has(k))m.set(k,{net:netOf(a.ip,a.cidr),p:a.cidr,m:[]});m.get(k).m.push(n.id)}));return[...m.values()]};
const ARc=new Map();let ARt=-1;
autoRoutes=R=>{if(!isL3(R))return[];graph();if(ARt!==GT){ARc.clear();ARt=GT}if(ARc.has(R.id))return ARc.get(R.id);const out=[],S=subnets(),D=spf(R.id),{R3}=graph();
 S.forEach(s=>{const own=addrIn(R,s.net,s.p);if(own)return out.push({net:s.net,p:s.p,via:0,m:0,src:'ligada',ifc:own.nm});
  let b=null;R3.forEach(Q=>{if(Q.id==R.id||!addrIn(Q,s.net,s.p))return;const e=D.get(Q.id);if(!e)return;if(!b||e.d<b.m||(e.d==b.m&&e.f<b.via))b={net:s.net,p:s.p,via:e.f,m:e.d,src:'OSPF'}});if(b)out.push(b)});
 ARc.set(R.id,out);return out};
const AD={ligada:0,'estática':1,OSPF:110};
lookup=(R,ip)=>{const x=i2n(ip);let b=null;
 table(R).forEach(e=>{const n=i2n(e.net);if(n==null||((x&mask(e.p))>>>0)!=((n&mask(e.p))>>>0))return;
  if(!b||e.p>b.p||(e.p==b.p&&((AD[e.src]??120)<(AD[b.src]??120)||((AD[e.src]??120)==(AD[b.src]??120)&&e.m<b.m))))b=e});return b};
window.ospfAdj=()=>graph().adj;

// ---------- encaminhamento completo (o que o ping, o ataque e o IoT usam) ----------
function route0(A,B,o){const P=[A.id],H=[],E_=(err,msg,x={})=>Object.assign({err,P,H,msg},x);
 if(isSat(A))return E_('ip',`${A.name} não tem endereço IP: é um repetidor de camada 1 (bent-pipe), não origina pacotes.`);
 if(isSat(B))return E_('ip',`${B.name} não tem endereço IP: é um repetidor de camada 1 (bent-pipe), não responde a pings.`);
 for(const n of[A,B]){const pb=problems(n).filter(t=>!/^o gateway|gateway «/.test(t)||n===A);if(pb.length)return E_('ip',`${n.name}: ${pb[0]}.`)}
 if(!o.reply&&!o.dnat&&!isPriv(A.ip)&&isPriv(B.ip))return E_('nat',`${B.ip} é um endereço privado (RFC 1918): não é encaminhado na Internet. A partir de ${A.name} (${A.ip}) só se chega a serviços publicados por NAT estático (port forwarding) no router de fronteira.`);
 const ra=rng(A.ip,A.cidr),add=s=>{P.push(...s.slice(1))};
 let cur=A;
 if(!isL3(A)){
  if(inNet(B.ip,ra.net,A.cidr)){const s=l2(A.id,B.id,ra.net,A.cidr);if(s){add(s);return{ok:1,P,H}}
   if(CFG.vlanOn&&!isL3(B)&&(A.vlan||1)!=(B.vlan||1))return E_('vlan',`${A.name} (VLAN ${A.vlan}) e ${B.name} (VLAN ${B.vlan}) estão na mesma sub-rede IP mas em VLAN diferentes, que são domínios de broadcast separados: o ARP Request não chega ao destino.`,{va:A.vlan,vb:B.vlan});
   return E_('l2',`${A.name} e ${B.name} estão na mesma sub-rede mas não há ligação de camada 2 entre eles: o ARP não obtém resposta.`)}
  if(!A.gw)return E_('nogw',`${A.name} não tem gateway predefinido configurado: só consegue comunicar dentro da sua sub-rede (${ra.net}/${A.cidr}).`);
  const g=gwNode(A);if(!g){const o=owner(A.gw);return E_('gw',o?`O gateway de ${A.name} (${A.gw}) pertence a ${o.name}, que não é um router.`:`Nenhum router tem o endereço ${A.gw} (gateway de ${A.name}): o ARP para o gateway não obtém resposta.`)}
  const s=l2(A.id,g.id,ra.net,A.cidr);if(!s)return E_('gw',`${A.name} não chega ao gateway ${A.gw} (${g.name}) na camada 2 (${links.some(l=>l.q&&(l.a==A.id||l.b==A.id))?'a ligação está em quarentena pelo IPS':'VLAN diferente, ligação em falta ou inativa'}).`);
  add(s);cur=g}
 for(let i=0;i<16;i++){if(cur.id==B.id||addrs(cur).some(a=>a.ip==B.ip))return{ok:1,P,H};
  const e=lookup(cur,B.ip);H.push({r:cur,e});
  if(!e)return E_('noroute',`${cur.name} não tem nenhuma rota para ${B.ip}: destino de rede inalcançável (ICMP tipo 3).`,{at:cur});
  if(!e.via){const s=l2(cur.id,B.id,e.net,e.p);if(!s)return E_('l2',`${cur.name} tem a rede ${e.net}/${e.p} ligada, mas ${B.name} não responde ao ARP nessa rede (ligação inativa, em falta ou noutra VLAN).`,{at:cur});add(s);return{ok:1,P,H}}
  const nx=get(e.via);if(!nx)return E_('nexthop',`Next hop inexistente em ${cur.name}.`,{at:cur});
  const opts=(graph().adj.get(cur.id)||[]).filter(x=>x.to==nx.id).sort((a,b)=>a.c-b.c);let s=null;
  // o pacote sai pela adjacência que o SPF escolheu (a de menor custo); se essa ligação caiu e o OSPF ainda não o detetou, perde-se
  if(opts.length)s=l2(cur.id,nx.id,opts[0].net,opts[0].p);
  else{const sh=addrs(cur).map(a=>addrIn(nx,netOf(a.ip,a.cidr),a.cidr)?a:null).find(Boolean);if(sh)s=l2(cur.id,nx.id,netOf(sh.ip,sh.cidr),sh.cidr)}
  if(!s)return E_('nexthop',opts.length?`${cur.name} continua a encaminhar por ${nx.name}, mas essa ligação caiu (LEO fora de cobertura ou ligação inativa). O OSPF ainda não detetou a falha (${CFG.bfd?'BFD: cerca de 0,9 s':'dead timer: até 40 s'}); até reconvergir, os pacotes perdem-se.`:`${cur.name} tem rota via ${nx.name}, mas esse next hop não está alcançável (ligação inativa ou sem sub-rede em comum).`,{at:cur});
  add(s);cur=nx}
 return E_('ttl','TTL expirado: as rotas formam um ciclo (ICMP Time Exceeded, tipo 11).')}
route=(A,B,o={})=>{const r=route0(A,B,o);if(r.ok&&!o.reply&&isPriv(A.ip)&&!isPriv(B.ip)&&!edgeOf(r.P))return Object.assign({},r,{ok:0,err:'nat',msg:`${A.name} tem um endereço privado e nenhum router no caminho faz NAT para um endereço público: os pacotes não podem sair para a Internet.`});return r};
window.rpath=(A,B)=>{const r=route(A,B);return r.ok?r.P:null};

// ---------- filtragem: firewalls transparentes com estado + ACL de entrada nas subinterfaces dos routers ----------
const ruleIn=(ip,x)=>{if(!x||x=='any')return true;if(x.startsWith('host '))return x.slice(5).trim()==ip;const[n,p]=x.split('/');return inNet(ip,n,+p)};
const wc=x=>{if(!x||x=='any')return'any';if(x.startsWith('host '))return x;const[n,p]=x.split('/');if(+p==32)return'host '+n;return`${n} ${n2i((~mask(+p))>>>0)}`};
window.aclTxt=r=>`${r.a} ${r.pr} ${wc(r.s)} ${wc(r.d)}${r.pt&&(r.pr=='tcp'||r.pr=='udp')?' eq '+r.pt:''}${r.e?' '+r.e:''}`;
// «established» só coincide com respostas TCP; «echo-reply» só com respostas ICMP (como nas ACL Cisco)
const match=(r,s,d,pr,pt,rep)=>{if(r.e=='established'&&!(pr=='tcp'&&rep))return false;if(r.e=='echo-reply'&&!(pr=='icmp'&&rep))return false;
 return(r.pr=='ip'||r.pr==pr)&&ruleIn(s,r.s)&&ruleIn(d,r.d)&&(!r.pt||!(pr=='tcp'||pr=='udp')||+r.pt==+pt)};
window.fwOut=f=>{const nb=links.filter(l=>l.a==f.id||l.b==f.id).map(l=>l.a==f.id?l.b:l.a);if(f.out&&nb.includes(f.out))return f.out;
 return nb.find(i=>{const n=get(i);return n&&(n.t=='hk'||n.t=='gs')})??nb[0]};
// o: {reply} resposta de uma sessão; {patI,patIp} PAT na saída; {natI,pubIp} destino publicado por port forwarding
function fwEval(p,A,B,pr,pt,o){o=o||{};const res=[],P=pr.toUpperCase();
 const sAt=i=>o.patI!=null&&i>o.patI?o.patIp:A.ip,dAt=i=>o.natI!=null&&i<=o.natI?o.pubIp:B.ip;
 for(let i=1;i<p.length-1;i++){const n=get(p[i]);if(!n)continue;
  if(n.t=='fw'&&CFG.fwOn){
   if(o.reply){res.push({f:n,ok:1,kind:'fw',txt:`${n.name}: resposta de uma sessão já estabelecida, aceite pela tabela de estado.`});continue}
   if(p[i-1]!=fwOut(n)){res.push({f:n,ok:1,kind:'fw',txt:`${n.name}: tráfego de dentro para fora permitido (firewall com estado: a resposta é aceite automaticamente).`});continue}
   const acl=n.acl||[],s=sAt(i),d=dAt(i),k=acl.findIndex(r=>match(r,s,d,pr,pt,false));
   if(k<0){res.push({f:n,ok:0,kind:'fw',rule:'deny ip any any (implícita)',txt:`${n.name}: ${P} de ${s} para ${d} descartado pela regra implícita «deny ip any any» no fim da ACL de entrada (nenhuma regra o permite).`});return res}
   const r=acl[k];res.push({f:n,ok:r.a=='permit',kind:'fw',rule:aclTxt(r),txt:`${n.name}: ${P} de ${s} para ${d} ${r.a=='permit'?'permitido':'descartado'} pela regra ${k+1} da ACL de entrada «${aclTxt(r)}».`});if(r.a!='permit')return res;continue}
  if(isL3(n)&&CFG.aclOn){const s=sAt(i),f=addrs(n).find(a=>inNet(s,netOf(a.ip,a.cidr),a.cidr)),rules=f&&n.iacl&&n.iacl[f.nm];
   if(!rules||!rules.length)continue;const d=dAt(i),k=rules.findIndex(r=>match(r,s,d,pr,pt,o.reply));
   if(k<0){res.push({f:n,ok:0,kind:'acl',ifn:f.nm,rule:'deny ip any any (implícita)',txt:`${n.name}: ${P} de ${s} para ${d} descartado pela regra implícita «deny ip any any» da ACL de entrada em ${f.nm}.`});return res}
   const r=rules[k];res.push({f:n,ok:r.a=='permit',kind:'acl',ifn:f.nm,rule:aclTxt(r),txt:`${n.name}: ${P} de ${s} para ${d} ${r.a=='permit'?'permitido':'descartado'} pela regra ${k+1} da ACL de entrada em ${f.nm} «${aclTxt(r)}».`});if(r.a!='permit')return res}}
 return res}
window.fwDeny=(p,A,B,pr,pt,o)=>{const r=fwEval(p,A,B,pr,pt,o).find(x=>!x.ok);return r?{fw:r.f,txt:r.txt,rule:r.rule,kind:r.kind,ifn:r.ifn}:null};
window.fwNotes=(p,A,B,pr,pt,o)=>fwEval(p,A,B,pr,pt,o).map(x=>x.txt);
window.ATKP={scan:['tcp',0],ddos:['udp',53],access:['tcp',22],mitm:['ip',0]};

// ---------- migração de cenários antigos e preenchimento do modelo ----------
window.migrate=()=>{let ch=0;
 nodes.forEach(n=>{if(isSat(n)&&n.ip){n.ip='';ch=1}if(isL3(n)&&n.ifv==null&&/\.(\d+)$/.test(n.ifn||'')){n.ifv=+n.ifn.split('.').pop();ch=1}});
 links.forEach(l=>{const s=[get(l.a),get(l.b)].some(n=>n&&isSat(n)),w=wifiOf(get(l.a),get(l.b));if(s&&l.c!='radio'){l.c='radio';ch=1}else if(w&&l.c!='wifi'){l.c='wifi';ch=1}else if(!s&&!w&&(l.c=='tel'||!l.c)){l.c='utp';ch=1}});
 // transporte por satélite: uma sub-rede de trânsito por satélite, com uma interface em cada estação
 const used=new Set(nodes.flatMap(n=>addrs(n).map(a=>a.ip)));let base=0;
 nodes.filter(isSat).forEach(S=>{const st=links.filter(l=>l.a==S.id||l.b==S.id).map(l=>get(l.a==S.id?l.b:l.a)).filter(n=>n&&n.t=='gs');if(!st.length)return;
  if(!S.net){while(nodes.some(m=>m.net=='100.64.0.'+base+'/29'))base+=8;S.net='100.64.0.'+base+'/29';base+=8;ch=1}
  const[net]=S.net.split('/');let k=1;
  st.forEach(g=>{if(addrIn(g,net,29))return;while(used.has(n2i(i2n(net)+k)))k++;const ip=n2i(i2n(net)+k);used.add(ip);(g.ifs=g.ifs||[]).push({nm:`Sat${(g.ifs||[]).filter(f=>/^Sat/.test(f.nm)).length}`,ip,cidr:29});ch=1})});
 // gateways dos hosts: subinterface .1 da VLAN no router que serve a rede
 nodes.forEach(A=>{if(isL3(A)||isSat(A)||A.gw)return;const r=rng(A.ip,A.cidr);if(!r)return;
  const q=[A.id],seen=new Set(q);let g=null;while(q.length&&!g){const c=q.shift();if(c!=A.id&&isL3(get(c))){g=get(c);break}if(c!=A.id&&isEnd(get(c)))continue;
   links.filter(l=>l.a==c||l.b==c).forEach(l=>{const o=l.a==c?l.b:l.a;if(!seen.has(o)&&!isSat(get(o))){seen.add(o);q.push(o)}})}
  if(!g)return;let a=addrIn(g,r.net,A.cidr);
  if(!a&&!used.has(r.first)){(g.ifs=g.ifs||[]).push({nm:`G0/0.${A.vlan||1}`,ip:r.first,cidr:A.cidr,vlan:A.vlan});used.add(r.first);a={ip:r.first}}
  if(a){A.gw=a.ip;ch=1}});
 nodes.filter(n=>n.t=='fw').forEach(f=>{if(!f.acl){f.acl=[{a:'permit',pr:'ip',s:'10.0.0.0/8',d:'any',pt:''}];ch=1}if(!f.out){f.out=fwOut(f);ch=1}});
 if(links.some(l=>swOf(l)&&!l.pm))ch=1;portSync();
 G=null;return ch};
setTimeout(()=>{if(migrate()&&!window.__fresh){log('🔧 Cenário atualizado para o novo modelo: satélites sem IP, sub-redes de trânsito, gateways e ACL nas firewalls.');try{save(true)}catch(e){}}},0);

// ---------- avisos de configuração no mapa ----------
const NS='http://www.w3.org/2000/svg',lay=document.createElementNS(NS,'g');lay.setAttribute('pointer-events','none');document.querySelector('#pk').parentNode.appendChild(lay);
let last='';setInterval(()=>{const h=nodes.map(n=>{const p=problems(n);return p.length?`<g transform="translate(${n.x-30},${n.y-32})"><circle r="10" fill="#e5383b" stroke="#fff" stroke-width="2"/><text y="4.5" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">!</text><title>${p.join('\n')}</title></g>`:''}).join('');if(h!=last){lay.innerHTML=h;last=h}},400);
})();
