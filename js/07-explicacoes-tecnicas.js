// ===================== Explicações técnicas: camada 2/3, ICMP + ARP, satélite =====================
(()=>{
const C=299792.458,RE=6371,HGEO=35786,HLEO=550,LAT=38.7;
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
// distância oblíqua estação → satélite, para uma altitude h e um ângulo de elevação e
const slant=(h,e)=>Math.sqrt((RE+h)**2-(RE*Math.cos(rad(e)))**2)-RE*Math.sin(rad(e));
// elevação de um satélite GEO visto de uma latitude, na mesma longitude
const elGEO=lat=>deg(Math.atan((Math.cos(rad(lat))-RE/(RE+HGEO))/Math.sin(rad(lat))));
const ms=km=>km/C*1000,fx=(n,d=1)=>n.toLocaleString('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d}),km=n=>Math.round(n).toLocaleString('pt-PT');
window.SATMATH={slant,elGEO,ms,C,RE,HGEO,HLEO,LAT};

// ---------- endereços MAC de exemplo (determinísticos) ----------
const hx=n=>(n&255).toString(16).toUpperCase().padStart(2,'0');
// endereços administrados localmente (bit U/L = 1): não se fazem passar por MAC de nenhum fabricante real
const mac=n=>{if(!n)return'?';const h=Math.imul(n.id+7,2654435761)>>>0;return`02:53:4E:${hx(h>>16)}:${hx(h>>8)}:${hx(h)}`};
window.macOf=mac;
const isL3=n=>n&&(n.t=='router'||n.t=='gs');
// IP do gateway visto pelo host: se o router não está na sub-rede do host, é a subinterface .1 da VLAN
function gwIP(A,g){return A&&A.gw?A.gw:null}
const sub=(A,g)=>{const f=g&&A&&A.gw?ifOf(g,A.gw):null;return f?f.nm:null};

// ---------- etiquetas das zonas (terminologia correta) ----------
window.zlab=z=>{const M=z.m.filter(n=>n&&(isHost(n)||n.t=='switch')&&n.t!='hk'&&i2n(n.ip)!=null);let agg='';
 if(M.length){const v=M.map(n=>i2n(n.ip)),lo=Math.min(...v),hi=Math.max(...v),x=(lo^hi)>>>0,b=x?32-Math.clz32(x):0,p=32-b,m=p?(0xFFFFFFFF<<(32-p))>>>0:0;agg=` · ${n2i((lo&m)>>>0)}/${p}`}
 const vl=[...new Set(z.m.filter(n=>n&&isHost(n)).map(n=>n.vlan))].sort((a,b)=>a-b);
 return`LAN ${z.g.name}${agg}${vl.length?` · VLAN ${vl.join(', ')}`:''}`};

// ---------- papel de cada equipamento ----------
Object.assign(ROLE,{
 lt:'Host (portátil): cria o pedido e mede o RTT; pode estar ligado por cabo ou por Wi-Fi',srv:'Servidor: responde aos pedidos (o papel concreto depende do serviço instalado)',ap:'Access point (camada 2): faz a ponte entre Wi-Fi (802.11) e Ethernet; cada SSID corresponde a uma VLAN no trunk para o switch',ph:'Telemóvel (host em Wi-Fi): para o IP é um host como os outros',
 pc:'Host (camadas 1 a 7): cria o Echo Request, mede o RTT quando chega o Echo Reply',
 router:'Router (camada 3): retira a trama, lê o IP de destino, consulta a tabela de routing (prefixo mais longo), decrementa o TTL, recalcula o checksum IP e cria uma nova trama com novos MAC',
 switch:'Switch (camada 2): comuta a trama pelo MAC de destino (tabela MAC) apenas dentro da mesma VLAN; não lê o IP nem altera o TTL',
 gs:'Estação terrestre (camada 3): router com interfaces Sat0/Sat1 nas sub-redes de trânsito dos satélites; encaminha pelo IP, decrementa o TTL e converte a trama para o rádio (modem DVB-S2)',
 geo:'Satélite GEO (camada 1): transponder transparente ("bent-pipe"); recebe, amplifica, muda a frequência e retransmite; não lê IP nem MAC',
 leo:'Satélite LEO (camada 1 neste modelo): transponder em órbita baixa; só retransmite o sinal rádio',
 fw:'Firewall transparente com estado (modo bridge): não é um salto IP e não baixa o TTL; aplica a ACL de entrada (IP, protocolo e porta) ao que chega pela interface externa',
 db:'Servidor: recebe o Echo Request e devolve o Echo Reply',bk:'Servidor: recebe o Echo Request e devolve o Echo Reply',hk:'Host atacante: origem do tráfego'});

// ---------- blocos reutilizáveis ----------
const pkt=(vlan)=>`<div class="pkt"><span style="flex:14">Ethernet<i>14 B</i></span>${vlan?'<span class="q" style="flex:5">802.1Q<i>4 B</i></span>':''}<span class="ip" style="flex:20">IP<i>20 B</i></span><span class="ic" style="flex:9">ICMP<i>8 B</i></span><span class="dt" style="flex:24">Dados<i>32 B</i></span><span style="flex:5">FCS<i>4 B</i></span></div>`;

function stepICMP(R,stp){const A=get(R.ida),B=get(R.idb);
 return stp(0,'O protocolo do ping: ICMP',`O ping usa o <b>ICMP</b> (Internet Control Message Protocol, RFC 792). É um protocolo de controlo da <b>camada 3</b> que vai diretamente dentro do pacote IP (campo <i>Protocolo</i> = 1). Não usa TCP nem UDP, por isso não tem portas.
 <table class="xt"><tr><th>Mensagem</th><th>Tipo</th><th>Código</th><th>Quem envia</th></tr>
 <tr><td>Echo Request</td><td>8</td><td>0</td><td>${E(A.name)}</td></tr><tr><td>Echo Reply</td><td>0</td><td>0</td><td>${E(B.name)}</td></tr>
 <tr><td>Destination Unreachable</td><td>3</td><td>0 a 15</td><td>Router sem rota</td></tr><tr><td>Time Exceeded</td><td>11</td><td>0</td><td>Router com TTL a 0</td></tr></table>
 O cabeçalho ICMP tem 8 bytes: <b>tipo</b>, <b>código</b>, <b>checksum</b>, <b>identificador</b> (identifica o processo ping) e <b>número de sequência</b> (1, 2, 3, 4…). A origem associa cada resposta ao pedido pelo par identificador + sequência; um número em falta é um pacote perdido. Seguem-se 32 bytes de dados (Windows; o Linux usa 56).
 <br><br><b>Encapsulamento</b> do Echo Request numa trama Ethernet:${pkt(false)}
 Total: 78 bytes na rede local. Numa ligação <i>trunk</i> entre switch e router, leva mais 4 bytes de etiqueta 802.1Q.
 <br>Ao enviar, ${E(A.name)} arranca um temporizador. Quando chega o Echo Reply com o mesmo identificador e sequência, para o temporizador: esse valor é o <b>RTT</b>. Se não chegar em 4 s (predefinição do Windows), mostra <i>Request timed out</i>.`)}

function stepIP(R,stp){const A=get(R.ida),B=get(R.idb),ra=rng(A.ip,A.cidr),rb=rng(B.ip,B.cidr);
 if(!ra||!rb)return stp(0,'Endereços IP','Um dos IP é inválido, por isso não é possível calcular as sub-redes.');
 const dn=rng(B.ip,A.cidr).net,same=dn==ra.net,g=gwNode(A),gip=gwIP(A,g);
 const row=(n,r)=>`<tr><td><b>${E(n.name)}</b></td><td>${E(n.ip)}/${n.cidr}</td><td>${r.mask}</td><td>${r.net}</td><td>${isHost(n)?n.vlan:'—'}</td></tr>`;
 return stp(0,'Decisão de entrega: mesma sub-rede ou sub-rede remota?',`Cada interface tem um <b>endereço IP</b> e uma <b>máscara de sub-rede</b>. A máscara diz quantos bits identificam a rede (o prefixo /${A.cidr}) e quantos identificam o host.
 <table class="xt"><tr><th>Dispositivo</th><th>IP/prefixo</th><th>Máscara</th><th>Sub-rede</th><th>VLAN</th></tr>${row(A,ra)}${row(B,rb)}</table>
 ${E(A.name)} faz um <b>E lógico (AND) bit a bit</b> entre o IP de destino e a sua própria máscara:
 <code>${E(B.ip)} AND ${ra.mask} = ${dn}</code>
 ${same?`O resultado é igual à sua sub-rede (${ra.net}/${A.cidr}): o destino é <b>local</b>. A entrega é direta na camada 2, sem router; o MAC procurado por ARP é o do próprio ${E(B.name)}.`
 :`O resultado (${dn}) é diferente da sua sub-rede (${ra.net}/${A.cidr}): o destino é <b>remoto</b>. ${E(A.name)} não pode entregar diretamente; envia a trama ao seu <b>gateway predefinido</b>${g?` (${E(g.name)}, ${E(gip)}${sub(A,g)?`, subinterface ${sub(A,g)}`:''})`:''}. O IP de destino no pacote continua a ser ${E(B.ip)}; só o MAC de destino é o do gateway.`}`)}

function stepL2L3(R,stp){const A=get(R.ida),B=get(R.idb),ra=rng(A.ip,A.cidr),rb=rng(B.ip,B.cidr);if(!ra||!rb)return'';
 const same=rng(B.ip,A.cidr).net==ra.net,hostA=isHost(A),hostB=isHost(B),va=A.vlan,vb=B.vlan,p=R.p||[],g=gwNode(A),gip=gwIP(A,g),gB=gwNode(B),gipB=gwIP(B,gB);
 const L2=`<b>Camada 2 (ligação de dados).</b> O switch comuta <b>tramas</b> Ethernet pelo <b>endereço MAC</b> de destino (48 bits). Aprende sozinho em que porta está cada MAC (tabela MAC/CAM) a partir do MAC de origem das tramas que recebe. Uma <b>VLAN</b> (norma IEEE 802.1Q) divide o switch em vários <b>domínios de broadcast</b> separados: uma porta <i>access</i> pertence a uma só VLAN e o switch só entrega uma trama a portas da mesma VLAN. Numa porta <i>trunk</i> passam várias VLAN e cada trama leva uma etiqueta de 4 bytes (TPID 0x8100 + VLAN ID de 12 bits, de 1 a 4094).`;
 const L3t=`<b>Camada 3 (rede).</b> O router encaminha <b>pacotes</b> pelo <b>endereço IP</b> de destino, usando a tabela de routing. Liga sub-redes diferentes e é o único equipamento que deixa o tráfego passar de uma VLAN para outra.`;
 if(same&&(!hostA||!hostB||va==vb))return stp(0,'Camada 2 contra camada 3: aqui basta a camada 2',`${L2}<br><br>${E(A.name)} e ${E(B.name)} estão na <b>mesma sub-rede</b> (${ra.net}/${A.cidr})${hostA&&hostB?` e na <b>mesma VLAN ${va}</b>`:''}, ou seja, no mesmo domínio de broadcast. A comunicação é resolvida inteiramente na camada 2: ARP para obter o MAC e comutação pelo switch. <b>Não é preciso routing.</b><br><br>${L3t}`);
 return stp(0,'Camada 2 contra camada 3: porque é preciso routing',`${L2}<br><br>${L3t}<br><br>
 <b>Neste ping:</b> ${E(A.name)} está ${hostA?`na <b>VLAN ${va}</b>, `:''}sub-rede <b>${ra.net}/${A.cidr}</b>; ${E(B.name)} está ${hostB?`na <b>VLAN ${vb}</b>, `:''}sub-rede <b>${rb.net}/${B.cidr}</b>. ${hostA&&hostB&&va!=vb?'São VLAN diferentes, logo domínios de broadcast diferentes: nem o ARP nem as tramas atravessam de uma para a outra. ':''}Como as sub-redes IP são diferentes, a comunicação tem de subir à camada 3. A isto chama-se <b>routing${hostA&&hostB&&va!=vb?' entre VLANs (inter-VLAN routing)':''}</b>.
 ${g&&hostA?`<br><br><b>Como o router está configurado (router-on-a-stick):</b> ${E(g.name)} liga ao switch por uma única ligação <i>trunk</i>, dividida em subinterfaces lógicas, uma por VLAN. Cada subinterface é o gateway da sua VLAN:
 <code>interface ${sub(A,g)||'G0/0.'+va}
 encapsulation dot1Q ${va}
 ip address ${gip} ${ra.mask}</code>${gB&&hostB&&gB.id==g.id&&vb!=va?`<code>interface ${sub(B,gB)||'G0/0.'+vb}
 encapsulation dot1Q ${vb}
 ip address ${gipB} ${rb.mask}</code>`:''}
 Alternativa usada em redes maiores: um <b>switch multicamada</b> com interfaces virtuais (SVI, <code style="display:inline;padding:0 4px">interface vlan ${va}</code>) que faz o routing dentro do próprio switch.`:''}
 <br><br><b>O que o router faz ao pacote:</b> recebe a trama${hostA?` com etiqueta VLAN ${va}`:''}, descarta o cabeçalho Ethernet, lê o IP de destino, escolhe a rota com o prefixo mais longo, <b>decrementa o TTL</b>, recalcula o checksum do cabeçalho IP e cria uma <b>trama nova</b>: MAC de origem = o seu, MAC de destino = o do próximo salto (obtido por ARP)${hostB&&gB&&g&&gB.id==g.id&&vb!=va?`, enviada com etiqueta VLAN ${vb}`:''}. Os endereços IP de origem e destino nunca mudam; os MAC mudam em cada salto.`)}

function stepARP(R,stp){const A=get(R.ida),B=get(R.idb),ra=rng(A.ip,A.cidr);if(!ra)return'';
 const same=rng(B.ip,A.cidr).net==ra.net,p=R.p||[],g=gwNode(A),nh=same?B:g,nip=same?B.ip:gwIP(A,g);
 if(!nh)return'';
 return stp(0,'ARP: descobrir o MAC antes de enviar',`O IP diz <i>para onde</i> vai o pacote, mas dentro de uma rede local a trama só chega se tiver o <b>MAC</b> correto. O <b>ARP</b> (Address Resolution Protocol, RFC 826) traduz IP → MAC.
 <br><b>1.</b> ${E(A.name)} procura ${E(nip)} na sua <b>cache ARP</b> (comando <code style="display:inline;padding:0 4px">arp -a</code>). Se não estiver lá, guarda o Echo Request em espera.
 <br><b>2. ARP Request</b> (EtherType 0x0806, opcode 1), enviado em <b>broadcast</b>:
 <code>MAC destino FF:FF:FF:FF:FF:FF · MAC origem ${mac(A)}
"Quem tem ${E(nip)}? Responde a ${E(A.ip)}"</code>
 <b>3.</b> O switch inunda (<i>flooding</i>) o broadcast por todas as portas${isHost(A)?` <b>da VLAN ${A.vlan}</b> e só dessa VLAN`:''}. Ao mesmo tempo aprende em que porta está o MAC ${mac(A)}.
 <br><b>4. ARP Reply</b> (opcode 2), em <b>unicast</b>: só ${E(nh.name)} reconhece o IP e responde
 <code>"${E(nip)} está em ${mac(nh)}"</code>
 <b>5.</b> ${E(A.name)} guarda o par ${E(nip)} ↔ ${mac(nh)} na cache e envia finalmente o Echo Request.
 ${same?'':`<br><br>Cada router no caminho repete o ARP para o seu próximo salto. Por isso, no Packet Tracer, o <b>primeiro</b> pacote de um ping às vezes dá <i>Request timed out</i>: o tempo gasto a resolver o ARP faz expirar esse pedido. Os seguintes já usam a cache.`}`)}

// segmentos de camada 2 (entre equipamentos de camada 3 / hosts)
function segs(p){const out=[];let cur=[p[0]];for(let i=1;i<p.length;i++){cur.push(p[i]);const n=get(p[i]);if(i==p.length-1||isL3(n)){out.push(cur);cur=[p[i]]}}return out}
function stepFrames(R,stp){const p=R.p,A=get(R.ida),B=get(R.idb);if(!p||p.length<2)return'';
 let ttl=128;const S=segs(p),rows=S.map((s,k)=>{const a=get(s[0]),b=get(s.at(-1)),mid=s.slice(1,-1).map(get),sat=mid.find(isSat),h=[a,b].find(n=>n&&isHost(n)),vt=h&&mid.some(n=>n&&n.t=='switch')&&[a,b].some(isL3);
  const r=`<tr><td>${E(a.name)} → ${E(b.name)}${mid.length?`<br><small>via ${mid.map(n=>E(n.name)).join(', ')}</small>`:''}</td><td>${sat?'<small>ligação rádio ponto a ponto (DVB-S2), sem MAC Ethernet</small>':`${mac(a)}<br>${mac(b)}`}</td><td>${E(A.ip)} → ${E(B.ip)}</td><td>${ttl}</td><td>${sat?'—':h?(vt?`${h.vlan} <small>(tag no trunk)</small>`:h.vlan):'—'}</td></tr>`;
  if(k<S.length-1)ttl--;return r}).join('');
 const wf=p.some((id,i)=>i<p.length-1&&(lk(id,p[i+1])||{}).c=='wifi');
 return stp(0,'Trama a trama: o que muda em cada salto',`O pacote IP é sempre o mesmo, mas em cada salto de camada 3 é metido numa trama nova.${wf?' <b>No troço Wi-Fi</b> a trama é 802.11 (com três endereços MAC: origem, destino e BSSID do access point) e o AP converte-a para Ethernet 802.3 do lado do cabo; os MAC de origem e destino mantêm-se.':''}
 <table class="xt"><tr><th>Segmento</th><th>MAC origem / destino</th><th>IP origem → destino</th><th>TTL</th><th>VLAN</th></tr>${rows}</table>
 <small>MAC de exemplo, gerados pelo simulador como endereços administrados localmente (02:…, bit U/L = 1). O TTL começa em 128 (Windows) e cada router ou estação baixa-o em 1 (${S.length-1} ${S.length-1==1?'vez':'vezes'}). Se chegasse a 0, o router descartava o pacote e devolvia um ICMP Time Exceeded (tipo 11): é assim que funciona o <code style="display:inline;padding:0 4px">tracert</code>.</small>`)}

function satInfo(p){const H=[];for(let i=1;i<p.length-1;i++){const n=get(p[i]);if(n&&isSat(n))H.push({s:n,up:get(p[i-1]),dn:get(p[i+1])})}return H}
function stepSat(R,stp){const p=R.p;if(!p)return'';const H=satInfo(p);if(!H.length)return'';
 const eg=CFG.geoEl||45,dg=slant(HGEO,eg),el=40,dl=slant(HLEO,el),dl25=slant(HLEO,25);
 const tr=H.map(h=>`<b>${E(h.up.name)}</b> <small>(uplink${h.s.t=='geo'?', banda Ku ≈ 14 GHz':', banda Ku/Ka'})</small> ⟶ <b>${E(h.s.name)}</b> <small>a ${km(h.s.t=='geo'?HGEO:HLEO)} km</small> ⟶ <b>${E(h.dn.name)}</b> <small>(downlink${h.s.t=='geo'?' ≈ 11–12 GHz':''})</small>`).join('<br>');
 const RD=[];for(let i=0;i<p.length-1;i++){const l=lk(p[i],p[i+1]),g=satGeom(l);if(g)RD.push({l,g,a:get(p[i]),b:get(p[i+1])})}const ida=RD.reduce((s,x)=>s+delay(x.l),0);
 return stp(0,'Rota e trajetória do sinal via satélite',`<b>Rota:</b> as tabelas de routing mandam o pacote para a <b>estação terrestre</b>, que é o gateway da ligação por satélite. A estação converte a trama Ethernet para o formato rádio (modem DVB-S2) e transmite-a por uma antena parabólica apontada ao satélite.
 <br>${tr}
 <br><br><b>O satélite é um repetidor de camada 1</b> ("bent-pipe"): recebe o sinal na frequência de subida, amplifica-o, converte-o para a frequência de descida (para não interferir com a subida) e retransmite-o. Não lê o IP nem o MAC e não baixa o TTL. As estações formam uma rede de satélite <b>em malha (mesh)</b>: cada uma fala diretamente com as outras através do satélite. Numa rede VSAT em estrela, o tráfego entre duas estações remotas teria de passar pelo hub central e subiria ao satélite duas vezes, duplicando o atraso. Para o IP, as duas estações estão ligadas por <b>um único salto</b>: as suas interfaces Sat0/Sat1 estão na mesma <b>sub-rede de trânsito</b> do satélite (${H.map(h=>E(h.s.net||'?')).join(', ')}), e é por isso que são vizinhas no OSPF. O satélite não tem endereço IP.
 <br><br><b>Trajetória:</b> cada travessia do satélite obriga o sinal a <b>subir e descer</b>. Um ping completo faz isto duas vezes (Echo Request e Echo Reply), ou seja, <b>4 trajetos</b> entre a Terra e o satélite${H.length>1?' por cada satélite':''}.`)
 +stp(0,'Impacto matemático da distância na latência',`O sinal rádio propaga-se no vazio à velocidade da luz, <b>c ≈ 299 792 km/s</b>. O tempo de propagação de um trajeto é:
 <code>t = d / c</code>
 <table class="xt"><tr><th></th><th>GEO</th><th>LEO</th></tr>
 <tr><td>Altitude</td><td>${km(HGEO)} km</td><td>${km(HLEO)} km</td></tr>
 <tr><td>Satélite na vertical (elevação 90°)</td><td>${km(HGEO)} km → <b>${fx(ms(HGEO))} ms</b></td><td>${km(HLEO)} km → <b>${fx(ms(HLEO),2)} ms</b></td></tr>
 <tr><td>Vista da estação <small>(elevação configurada, ≈ Lisboa)</small></td><td>elevação ${fx(eg,0)}° → ${km(dg)} km → <b>${fx(ms(dg))} ms</b></td><td>elevação ${el}° → ${km(dl)} km → <b>${fx(ms(dl),2)} ms</b></td></tr>
 <tr><td>Ida (subir + descer)</td><td>2 × ${fx(ms(HGEO))} = <b>${fx(2*ms(HGEO))} ms</b></td><td>2 × ${fx(ms(HLEO),2)} = <b>${fx(2*ms(HLEO),2)} ms</b></td></tr>
 <tr><td><b>RTT mínimo</b> (4 trajetos)</td><td><b>${fx(4*ms(HGEO))} ms</b></td><td><b>${fx(4*ms(HLEO),1)} ms</b></td></tr></table>
 <small>Distância oblíqua: d = √((R+h)² − (R·cos e)²) − R·sin e, com R = 6371 km (raio da Terra), h = altitude e e = ângulo de elevação. Quanto mais baixo o satélite está no horizonte, maior a distância. Com a elevação mínima de 25° usada nas constelações LEO, a distância sobe para ${km(dl25)} km (${fx(ms(dl25),2)} ms).</small>
 <br><br><b>Como isto entra no simulador:</b> o atraso de cada ligação rádio é calculado com esta fórmula. No GEO usa-se a elevação da antena configurada (${CFG.geoEl}°); no LEO, a elevação resulta da posição atual do satélite (entre 90° por cima da estação e 25° no limite da cobertura).
 <table class="xt"><tr><th>Ligação rádio</th><th>Elevação</th><th>Distância</th><th>Atraso</th></tr>${RD.map(x=>`<tr><td>${E(x.a.name)} → ${E(x.b.name)}</td><td>${fx(x.g.e,0)}°</td><td>${km(x.g.d)} km</td><td>${fmtD(delay(x.l))}</td></tr>`).join('')}</table>
 Só a parte de satélite soma <b>${fmtD(ida)} na ida</b> e <b>${fmtD(2*ida)} no RTT</b>.
 <br><br><b>Na prática</b>, um ping real por GEO dá 550 a 650 ms, porque à propagação se juntam a codificação e modulação, o acesso partilhado ao canal (MF-TDMA), as filas de espera e o percurso terrestre até ao centro de dados. Um LEO (ex.: Starlink) dá 25 a 40 ms. É por isso que o GEO é mau para jogos e videochamadas, mas cobre um continente inteiro com um só satélite. Os LEO estão a ~7,6 km/s e só são visíveis alguns minutos: a estação tem de fazer <b>handover</b> para outro satélite. No simulador, quando o LEO sai do alcance, a ligação aparece como <i>sem sinal</i>.`)}

function stepRTT(R,stp){const p=R.p,T=RTTparts(p),sat=p.some(i=>isSat(get(i)));
 const prop=T.L.reduce((s,x)=>s+x.pr,0),tx=T.L.reduce((s,x)=>s+x.tx,0),pr=T.N.reduce((s,x)=>s+x.ms,0);
 const rows=T.L.map(x=>{const a=get(x.a),b=get(x.b),g=satGeom(x.l),v=g?'c (vazio)':x.l.c=='wifi'?'c + 1 ms de acesso ao meio (CSMA/CA)':x.l.c=='fibra'?'0,67 c':'0,65 c';
  return`<tr><td>${E(a.name)} → ${E(b.name)}</td><td>${g?'Rádio':CAB[x.l.c||'utp'][0]}</td><td>${g?km(g.d)+' km':Math.round(x.len)+' m'}</td><td>${v}</td><td>${fmtD(x.pr)}</td><td>${fmtD(x.tx)}</td></tr>`}).join('');
 return stp(0,'Atraso de cada ligação (só ida)',`<b>Propagação</b> = distância / velocidade do sinal. No cobre o sinal anda a cerca de 0,65 c e na fibra a 0,67 c (≈ 200 000 km/s, ou seja, 5 µs por km). <b>Transmissão</b> = tamanho / débito: 78 bytes a 1 Gbit/s no cabo, a 20 Mbit/s no satélite.
 <table class="xt"><tr><th>Ligação</th><th>Meio</th><th>Distância</th><th>Velocidade</th><th>Propagação</th><th>Transmissão</th></tr>${rows}
 <tr><td colspan="4"><b>Soma</b></td><td><b>${fmtD(prop)}</b></td><td><b>${fmtD(tx)}</b></td></tr></table>
 <b>Processamento</b> em cada equipamento intermédio (ordem de grandeza típica): ${T.N.map(x=>`${E(x.n.name)} ${fmtD(x.ms)}`).join(' · ')||'nenhum'}. A estação terrestre é a mais lenta porque o modem codifica e modula a trama (DVB-S2).`)
 +stp(0,'Cálculo do RTT',`<code>RTT = 2 × (Σ propagação + Σ transmissão + Σ processamento) + resposta no destino</code>
 2 × (${fmtD(prop)} + ${fmtD(tx)} + ${fmtD(pr)}) + ${fmtD(T.dst)} = <b>${fmtT(T.rtt)}</b>
 <br><b>Jitter</b> (variação de fila e de acesso ao canal): 0 a ${sat?CFG.jitter+' ms, porque o canal de satélite é partilhado':'0,02 ms numa rede local'}.
 <br><b>RTT esperado = ${fmtT(T.rtt)} a ${fmtT(T.rtt+(sat?CFG.jitter:.02))}</b>${sat?`<br><small>${Math.round(100*T.L.filter(x=>satGeom(x.l)).reduce((s,x)=>s+x.pr,0)/(T.ow))}% do atraso de ida vem só da propagação até ao satélite e de volta à Terra.</small>`:`<br><small>Numa rede local o RTT fica abaixo de 1 ms: o Windows mostra <i>tempo&lt;1ms</i>.</small>`}`)}

function stepNAT(R,stp){const A=get(R.ida),B=get(R.idb),N=natInfo(R.p,A,B);if(!N)return'';
 return stp(0,'NAT na saída para a Internet (PAT)',`${E(A.name)} tem um endereço <b>privado</b> (${E(A.ip)}, RFC 1918), que não é encaminhado na Internet. Ao sair pela interface ${E(N.ifn)} de ${E(N.R.name)}, o router substitui o IP de origem pelo seu IP público <b>${E(N.patIp)}</b> e regista a sessão na tabela de tradução:
 <table class="xt"><tr><th>Dentro (local)</th><th>Fora (global)</th><th>Destino</th></tr><tr><td>${E(A.ip)}</td><td>${E(N.patIp)}</td><td>${E(B.ip)}</td></tr></table>
 No ICMP, o identificador do Echo Request faz o papel da porta e distingue as várias sessões que partilham o mesmo IP público (é por isso que se chama PAT, ou NAT overload). A resposta chega a ${E(N.patIp)}, o router procura a sessão na tabela e devolve-a a ${E(A.ip)}.
 <code>access-list 1 permit 10.0.0.0 0.255.255.255
ip nat inside source list 1 interface ${E(N.ifn)} overload</code>
 O caminho inverso não existe: da Internet não se consegue iniciar uma ligação para um endereço privado, a não ser para um serviço publicado com NAT estático (port forwarding).`)}
window.explain=explain=function(R){XN++;
 const nm=id=>{const n=get(id);return n?`<b>${E(n.name)}</b> <small>${E(n.ip)}</small>`:'?'};
 let sc=0;const stp=(n,t,b)=>`<div class="xs"><b>${++sc}. ${t}</b><div>${b}</div></div>`;
 const chain=p=>`<div class="xch">${p.map(nm).join('<span>→</span>')}</div>`;
 const A=get(R.ida),B=get(R.idb);
 let h=`<div class="xc"><h4>📶 Ping #${XN}: ${E(R.A)} → ${E(R.B)}</h4>`+stp(0,'Objetivo do ping',`${E(R.A)} (${E(R.Ai)}) testa se consegue chegar a ${E(R.B)} (${E(R.Bi)}) na <b>camada 3</b> e quanto tempo demora a ida e volta (RTT). Não testa aplicações nem portas: só a conectividade IP.`)
  +stepICMP(R,stp)+stepIP(R,stp);
 if(R.k=='noroute'){const er=R.rt.err,d=links.filter(l=>!up(l)).map(l=>`${E(get(l.a).name)} ↔ ${E(get(l.b).name)} (${l.q?'em quarentena':'satélite LEO fora de cobertura'})`),at=R.rt&&R.rt.at;
  if(er=='nat')h+=stp(0,'Endereço privado: não é alcançável a partir da Internet',`${E(R.rt.msg)}<br><br>Os blocos 10.0.0.0/8, 172.16.0.0/12 e 192.168.0.0/16 (RFC 1918) e 100.64.0.0/10 (RFC 6598) são privados: os routers da Internet descartam-nos. Os equipamentos internos só saem através do <b>PAT</b> no router de fronteira, e só se entra quando há uma regra de <b>NAT estático</b> (port forwarding) para um serviço concreto.`);
  else if(er=='ip')h+=stp(0,'Configuração IP inválida',`${E(R.rt.msg)}<br><br>Um endereço tem de ser <b>único</b> na rede (um conflito faz com que o ARP receba duas respostas e o tráfego vá para o equipamento errado; o Windows deteta-o e desativa o IP). Também não pode ser o <b>endereço de rede</b> (todos os bits de host a 0) nem o de <b>broadcast</b> (todos a 1), que estão reservados. Os satélites não têm IP porque não são equipamentos de camada 3.`);
  else if(er=='vlan')h+=stp(0,'Mesma sub-rede, VLAN diferentes',`${E(R.rt.msg)}<br><br>Uma VLAN é um domínio de broadcast separado: o switch nunca entrega uma trama da VLAN ${R.rt.va} numa porta da VLAN ${R.rt.vb}. O ARP Request (broadcast) fica dentro da VLAN ${R.rt.va} e ninguém responde, por isso o ping dá <i>Request timed out</i>. Como o host acha que o destino é local, nem sequer o envia ao gateway.`)+stp(0,'Como resolver',`Cada VLAN deve ter a sua própria sub-rede IP. Põe o destino na sub-rede da VLAN ${R.rt.vb} e configura em cada host o gateway da sua VLAN; o router (subinterfaces 802.1Q) faz o routing entre elas.`);
  else if(er=='nogw'||er=='gw')h+=stp(0,'Gateway predefinido',`${E(R.rt.msg)}<br><br>Para enviar para outra sub-rede, um host precisa de um <b>gateway predefinido</b>: um IP da sua própria sub-rede que pertença a um router. É configurado à mão (ou por DHCP) junto com o IP e a máscara, por exemplo:<code>IP 10.1.11.11 · Máscara 255.255.255.0 · Gateway 10.1.11.1</code>`);
  else h+=stp(0,'Consulta das tabelas de routing: falhou',`${E(R.rt.msg)}${rtTable(R)}${at?`${E(at.name)} descarta o pacote e devolve a ${E(R.A)} uma mensagem <b>ICMP Destination Unreachable</b> (tipo 3, código 0 = rede inalcançável). No Windows aparece <i>Reply from ${E(at.ip)}: Destination net unreachable</i>.`:''}${d.length?'<br>Ligações inativas agora: '+d.join('; ')+'.':''}`);
  h+=stp(0,'Resultado','<b>O ping falha</b>: 100% de perda.')}
 else if(R.k=='noret')h+=stp(0,'Caminho de ida',chain(R.p))+stp(0,'A resposta não tem caminho de volta',`O Echo Request chega a ${E(R.B)}, mas o Echo Reply não consegue voltar: ${E(R.rb.msg)}<br><br>Um ping só funciona se houver caminho <b>nos dois sentidos</b>: o destino precisa do seu próprio gateway e os routers do caminho de volta precisam de rota para a rede de ${E(R.A)}. Do lado da origem, o resultado é <i>Request timed out</i>.`)+stp(0,'Resultado','<b>O ping falha</b>: 100% de perda.');
 else if(R.k=='vlan')h+=stp(0,'Caminho físico',chain(R.p))+stepL2L3(R,stp)
  +stp(0,'Bloqueado: falta routing entre VLANs',`${E(R.A)} está na <b>VLAN ${R.va}</b> e ${E(R.B)} na <b>VLAN ${R.vb}</b>. Cada VLAN é um domínio de broadcast próprio e uma sub-rede IP própria. O switch nunca entrega uma trama da VLAN ${R.va} numa porta da VLAN ${R.vb}, e não há nenhum equipamento de camada 3 no caminho para fazer o routing. Resultado: o ARP não obtém resposta e o Echo Request não sai da VLAN ${R.va} (<i>Request timed out</i>).`)
  +stp(0,'Como resolver','Colocar um 🌐 Router no caminho com uma subinterface 802.1Q por VLAN (router-on-a-stick) ou usar um switch multicamada com SVI. Em alternativa, pôr os dois dispositivos na mesma VLAN e sub-rede.');
 else if(R.k=='fw'&&R.fwd.kind=='acl'){const F=R.fwd.fw,rules=(F.iacl||{})[R.fwd.ifn]||[];h+=stp(0,'Caminho encontrado',chain(R.p))+stepL2L3(R,stp)+stp(0,'Bloqueado pela ACL entre VLAN',`${E(R.fwd.txt)}<br><br>As VLAN separam os domínios de broadcast, mas o routing entre elas deixaria passar tudo. Por isso ${E(F.name)} tem uma <b>ACL de entrada</b> na subinterface ${E(R.fwd.ifn)}: filtra o que sai dessa VLAN, regra a regra, de cima para baixo.<code>interface ${E(R.fwd.ifn)}
 ip access-group ACL-${E(R.fwd.ifn.replace(/[^0-9A-Za-z]/g,''))} in
!
${rules.map((r,i)=>`${(i+1)*10} ${aclTxt(r)}`).join('\n')}
(implícita) deny ip any any</code>Assim, um equipamento IoT comprometido não chega às bases de dados nem às outras VLAN. As regras «established» e «echo-reply» deixam passar só as <b>respostas</b> a ligações iniciadas noutras VLAN: a rede de gestão consegue fazer ping às câmaras, mas uma câmara não consegue iniciar nada.`)
  +stp(0,'Conclusão','O Echo Request é descartado no router e a origem vê <i>Request timed out</i> (ou, se o router estiver configurado para isso, um ICMP tipo 3, código 13: <i>administratively prohibited</i>).')}
 else if(R.k=='fw'){const F=R.fwd.fw;h+=stp(0,'Caminho encontrado',chain(R.p))+stp(0,'Bloqueado pela firewall (ACL)',`${E(R.fwd.txt)}<br><br>${E(F.name)} é uma firewall <b>com estado</b> em modo transparente. O tráfego que vem de dentro sai e as respostas voltam automaticamente; o que chega pela <b>interface externa</b> é comparado com a ACL de entrada, regra a regra, de cima para baixo. A primeira regra que coincide decide. Se nenhuma coincidir, aplica-se o <b>deny ip any any implícito</b>.<code>${(F.acl||[]).map((r,i)=>`${i+1}  ${aclTxt(r)}`).join('\n')}${(F.acl||[]).length?'\n':''}${(F.acl||[]).length+1}  deny ip any any   (implícita)</code>A firewall não sabe quem é «atacante»: decide só pelo IP de origem e destino, o protocolo e a porta. Na interface virada para a Internet, as primeiras regras negam origens privadas (anti-spoofing, BCP 38): um pacote da Internet com origem 10.x.x.x só pode ser falsificado.`)
  +stp(0,'Conclusão',`O Echo Request é descartado em silêncio, por isso a origem vê <i>Request timed out</i>. Esconder a rede de quem a sonda é exatamente o objetivo.`)}
 else h+=stepL2L3(R,stp)+stepARP(R,stp)
  +stp(0,'Escolha do caminho (tabelas de routing)',`O pacote não conhece o caminho completo. Em cada router ou estação, a <b>tabela de routing</b> escolhe o próximo salto: entre as rotas que contêm o IP de destino, ganha a de <b>prefixo mais longo</b> (mais específica). As rotas automáticas vêm do <b>OSPF</b>: cada router conhece a topologia e calcula o caminho de menor custo com o algoritmo SPF (Dijkstra). Aqui o custo de cada ligação é o seu atraso em milissegundos (como configurar <code style="display:inline;padding:0 4px">ip ospf cost</code>), por isso o OSPF prefere o LEO ao GEO quando o LEO está visível. Uma ligação nova só entra no cálculo depois de os routers trocarem hellos (10 s); uma falha é detetada pelo <b>BFD</b> em cerca de 0,9 s (ou, sem BFD, pelo dead timer de 40 s).${rtTable(R)}Resultado: ${R.p.length-1} ligações.${chain(R.p)}`)
  +stepFrames(R,stp)+stepNAT(R,stp)
  +stp(0,'O que faz cada equipamento',R.p.map(id=>{const n=get(id);return n?`<b>${E(n.name)}</b>: ${ROLE[n.t]||''}`:''}).join('<br>')+`<br><br>${E(R.B)} troca os IP de origem e destino, muda o tipo ICMP de 8 para 0 (<b>Echo Reply</b>), mantém o identificador e a sequência e devolve o pacote. A resposta é encaminhada da mesma forma, pelas tabelas de routing, até ${E(R.A)}.`)
  +stepSat(R,stp)+stepRTT(R,stp)
  +(()=>{const ok=R.res.filter(Boolean),ts=ok.map(x=>x.tm),loss=Math.round(100*(R.res.length-ok.length)/R.res.length),base=RTT(R.p);
   return stp(0,`Cada pacote (${R.res.length})`,R.res.map((x,i)=>x?`seq=${i+1} ✅ Echo Reply em <b>${fmtT(x.tm)}</b> <small>(${fmtT(base)} + jitter ${fmtT(x.jt)})</small>`:`seq=${i+1} ⏱ <b>Request timed out</b>: o pedido ou a resposta perdeu-se (perda configurada: ${CFG.loss}%)`).join('<br>'))
   +stp(0,'Conclusão',`Enviados: ${R.res.length} · Recebidos: ${ok.length} · Perda: ${loss}%${ts.length?`<br>RTT mínimo / médio / máximo: ${fmtT(Math.min(...ts))} / ${fmtT(ts.reduce((a,b)=>a+b)/ts.length)} / ${fmtT(Math.max(...ts))}`:''}<br><small>A bolinha no mapa mostra o percurso: Echo Request até ao destino e Echo Reply de volta pelo mesmo caminho.</small>`)})();
 XH.unshift(h+'</div>');XH=XH.slice(0,20);xpShow();
 try{window.animPing&&animPing(R)}catch(e){console.warn(e)}};

// ---------- diapositivos técnicos na apresentação ----------
const cd=(t,b)=>`<div class="pc"><h4>${t}</h4><div>${b}</div></div>`;
const EGf=()=>CFG.geoEl||45;
const S3=['3 · Camadas 2 e 3',()=>`<h2>Como comunicam as VLAN: camada 2 contra camada 3</h2><div class="pg">
 ${cd('Camada 2 · switch','Comuta <b>tramas</b> pelo <b>MAC</b> (tabela MAC aprendida).<br>Cada <b>VLAN</b> (IEEE 802.1Q) é um <b>domínio de broadcast</b> separado.<br>Porta <i>access</i>: 1 VLAN. Porta <i>trunk</i>: várias, com etiqueta de 4 B.')}
 ${cd('Camada 3 · router','Encaminha <b>pacotes</b> pelo <b>IP</b> de destino (tabela de routing, prefixo mais longo).<br>Decrementa o TTL.<br>O IP mantém-se; os MAC mudam a cada salto.')}
 ${cd('Routing entre VLANs','VLAN diferente = sub-rede diferente ⇒ <b>é obrigatório routing</b>.<br>Router-on-a-stick: uma subinterface por VLAN, que é o gateway dos hosts.<code>interface G0/0.11\n encapsulation dot1Q 11\n ip address 10.1.11.1 255.255.255.0</code>A segurança vem da <b>ACL entre VLAN</b>, não da VLAN sozinha.')}</div>`];
const S4=['4 · Ping',()=>`<h2>O que acontece num ping, passo a passo</h2><div class="pg">
 ${cd('1 · Decisão','IP destino <b>AND</b> máscara.<br>Mesma sub-rede → entrega direta.<br>Outra sub-rede → envia ao <b>gateway</b>.')}
 ${cd('2 · ARP','<b>Request</b> em broadcast (FF:FF:FF:FF:FF:FF): "quem tem o IP X?"<br><b>Reply</b> em unicast com o MAC.<br>Guardado na cache ARP. Repetido em cada salto.')}
 ${cd('3 · ICMP','<b>Echo Request</b>: tipo 8, código 0.<br><b>Echo Reply</b>: tipo 0, código 0.<br>Protocolo IP = 1 (sem TCP/UDP, sem portas).<br>Identificador + sequência; TTL 128; RTT medido na origem.')}</div>`];
const S5=['5 · Satélite',()=>`<h2>Porque é que o satélite aumenta o RTT</h2><div class="pg">
 ${cd('Trajetória','Host → router → <b>estação terrestre</b> → uplink → <b>satélite</b> (repetidor de camada 1) → downlink → estação remota → router → destino.<br>Ping = ida + volta = <b>4 trajetos</b> Terra–satélite.')}
 ${cd('Cálculo','<code>t = d / c   (c ≈ 299 792 km/s)</code>GEO: '+km(HGEO)+' km → '+fx(ms(HGEO))+' ms por trajeto<br><b>RTT mín. = 4 × '+fx(ms(HGEO))+' ≈ '+fx(4*ms(HGEO),0)+' ms</b><br>LEO: '+km(HLEO)+' km → '+fx(ms(HLEO),2)+' ms<br><b>RTT mín. ≈ '+fx(4*ms(HLEO),1)+' ms</b>')}
 ${cd('Na realidade','Com a antena a '+fx(EGf(),0)+'° de elevação (≈ Lisboa), a distância é '+km(slant(HGEO,EGf()))+' km.<br>Somam-se processamento, filas e acesso ao canal.<br>Ping real: GEO 550–650 ms; LEO 25–40 ms.')}</div>`];
const S6=['6 · Segurança',()=>`<h2>Segurança em camadas</h2><div class="pg">
 ${cd('Fronteira com a Internet','<b>PAT</b> na Estação 2: os endereços privados (RFC 1918) saem com um só IP público.<br>Só entra o que está publicado:<code>ip nat inside source static\n tcp 10.3.31.10 443\n 203.0.113.1 443</code>')}
 ${cd('Firewall com estado','ACL de entrada na interface externa, com <b>anti-spoofing</b> (BCP 38): nega origens privadas vindas de fora.<br>Permite só HTTPS para o servidor publicado.<br>As respostas a ligações internas passam pela tabela de estado.')}
 ${cd('Entre VLAN','ACL de entrada nas subinterfaces IoT e Clima: os equipamentos IoT só falam com o broker MQTT (TLS 8883).<br>Uma câmara comprometida não chega às bases de dados.<br>IPsec nas ligações de satélite contra a escuta do sinal.')}</div>`];
const S7=['7 · Limitações',()=>`<h2>Limitações e trabalho futuro</h2><div class="pg">${cd('Limitações','• OSPF sem áreas nem troca de LSA visível (SPF com custo, hello 10 s, BFD/dead)<br>• ARP, tabelas MAC e DHCP explicados, não simulados trama a trama<br>• Wi-Fi com atraso de acesso fixo; voz pelo modelo E simplificado<br>• Sem IPv6; satélites sem ligações entre si (ISL)')}${cd('Trabalho futuro','• Áreas OSPF e LSA visíveis<br>• DHCP e DNS<br>• IPv6 e NAT64<br>• Ligações entre satélites (ISL) e handover entre vários LEO')}${cd('Validação com a realidade','• <b>ping</b> e <b>tracert</b> reais<br>• Wireshark: ver o ICMP, o ARP e o 802.1Q verdadeiros<br>• Topologia equivalente no Packet Tracer<br>• Comparar os resultados com o simulador')}</div>`];
if(SL.length==2)SL.push(S3,S4,S5,S6,S7);
})();
