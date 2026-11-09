// ===================== Ataques: o tráfego do atacante segue as mesmas regras de NAT, routing, ACL e firewall =====================
(()=>{
const K={scan:'varrimento de portas',ddos:'DDoS (inundação UDP)',mitm:'interceção passiva (MITM) da ligação por satélite',access:'acesso não autorizado (SSH)'};
attack=function(a,b){const A=get(a),B=get(b);if(!A||!B||A===B)return;
 if(A.t!='hk')return log('⚠ A origem do ataque tem de ser um ☠️ Atacante.');
 const L=t=>log('&nbsp;&nbsp;'+t);let r=null,out={scan:'portas abertas expostas',ddos:'serviço indisponível',mitm:'tráfego intercetado em claro',access:'sistema comprometido'}[CFG.atk];
 const done=()=>{if(r){ST.ok++;L(`✅ Bloqueado: ${r}.`)}else{ST.bad++;B.hit=performance.now()+4000;L(`❌ ATAQUE BEM-SUCEDIDO: ${out}.`)}};
 log(`☠️ ${E(A.name)} ataca ${E(B.name)}: ${K[CFG.atk]}`);
 // interceção passiva: o atacante só precisa de estar na área do feixe do satélite; não envia pacotes, não há rota nem firewall
 if(CFG.atk=='mitm'){const z=zones().find(z=>z.m.includes(B)),g=z&&z.g,sat=g&&links.some(l=>(l.a==g.id||l.b==g.id)&&isSat(get(l.a==g.id?l.b:l.a)));
  if(!sat){r=`${B.name} não usa nenhuma ligação por satélite: não há sinal rádio para intercetar`;return done()}
  L(`📡 O atacante aponta uma antena ao satélite e recebe o downlink da ${E(g.name)}. O feixe cobre milhares de km² e qualquer recetor na zona o capta; é um ataque passivo, invisível para o IDS/IPS e para a firewall.`);
  if(CFG.ipsec)r='o tráfego entre estações vai dentro de IPsec ESP (AES-GCM): o sinal é captado, mas os dados estão cifrados e autenticados';
  return done()}
 const[pr,pt0]=ATKP[CFG.atk];let pt=pt0,pub=null;
 // da Internet não se endereça um IP privado; só um serviço publicado por port forwarding
 if(!isPriv(A.ip)&&isPriv(B.ip)){pub=pfFor(B);
  if(!pub){r=`${B.name} (${B.ip}) tem endereço privado (RFC 1918) e não está publicado por NAT estático: a partir da Internet nem sequer é endereçável`;return done()}
  L(`🔁 ${E(B.name)} está publicado na Internet: ${pub.pub}:${pub.pf.port}/${pub.pf.pr} → ${B.ip}:${pub.pf.tport} (port forwarding em ${E(pub.R.name)}). O ataque só pode usar esse serviço.`);
  pt=pub.pf.port;if(CFG.atk=='scan')out=`a porta ${pub.pf.port}/${pub.pf.pr} responde (é o serviço publicado); todas as outras estão fechadas`;if(CFG.atk=='access')out=`acesso ao serviço publicado na porta ${pub.pf.port}`}
 const RT=route(A,B,{dnat:!!pub});if(!RT.ok){r='sem caminho até ao alvo: '+RT.msg;return done()}
 const p=RT.P,o=pub?{natI:p.indexOf(pub.R.id),pubIp:pub.pub}:{},proto=pub&&CFG.atk!='ddos'?pub.pf.pr:pr;
 const den=fwDeny(p,A,B,proto,pt,o);
 if(den){L('🛡️ '+den.txt);r=den.kind=='acl'?'a ACL entre VLAN descartou o tráfego':'a firewall descartou o tráfego antes de chegar ao alvo (ACL de entrada)';return done()}
 fwNotes(p,A,B,proto,pt,o).forEach(t=>L('🛡️ '+t));
 if(CFG.atk=='ddos'&&CFG.rate)r='a limitação de débito (policing) no router de fronteira descartou o excesso de tráfego';
 else if(CFG.atk=='access'&&CFG.auth)r='a autenticação forte (2FA) recusou o acesso';
 if(CFG.ips){L('🔔 IDS/IPS: assinatura de ataque detetada e registada.');r=r||'o IPS bloqueou a sessão do atacante';
  if(CFG.iso){const l=lk(p[0],p[1]);if(l){l.q=true;L(`🔒 Ligação ${E(A.name)} ↔ ${E(get(p[1]).name)} em quarentena.`)}}}
 done()};
})();
