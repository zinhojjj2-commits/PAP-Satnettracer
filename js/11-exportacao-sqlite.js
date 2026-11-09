// ===================== Exportação SQLite completa (modelo de dados coerente com o simulador) =====================
(()=>{
const q=v=>v==null||v===''?'NULL':typeof v=='number'?String(v):`'${String(v).replace(/'/g,"''")}'`;
const r6=x=>Math.round(x*1e6)/1e6;
sqlDump=function(){const u=window.ME||'anon',now=new Date().toISOString();
 let t=`-- SatNet Tracer · exportação SQLite da conta ${u} (${now})
PRAGMA foreign_keys=ON;
BEGIN;
CREATE TABLE utilizador(nome TEXT PRIMARY KEY);
CREATE TABLE cenario(id INTEGER PRIMARY KEY,utilizador TEXT NOT NULL REFERENCES utilizador(nome),nome TEXT,guardado TEXT);
CREATE TABLE vlan(id INTEGER NOT NULL CHECK(id BETWEEN 1 AND 4094),cenario INTEGER NOT NULL REFERENCES cenario(id),nome TEXT,estacao INTEGER,PRIMARY KEY(id,cenario,estacao));
CREATE TABLE dispositivo(id INTEGER NOT NULL,cenario INTEGER NOT NULL REFERENCES cenario(id),tipo TEXT NOT NULL,nome TEXT NOT NULL,ip TEXT,prefixo INTEGER CHECK(prefixo BETWEEN 0 AND 32),gateway TEXT,vlan INTEGER,servico TEXT,extensao INTEGER,x REAL,y REAL,PRIMARY KEY(id,cenario));
CREATE TABLE interface(dispositivo INTEGER NOT NULL,cenario INTEGER NOT NULL,nome TEXT NOT NULL,ip TEXT NOT NULL,prefixo INTEGER NOT NULL CHECK(prefixo BETWEEN 0 AND 32),vlan INTEGER,principal INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(dispositivo,cenario,nome),FOREIGN KEY(dispositivo,cenario) REFERENCES dispositivo(id,cenario));
CREATE TABLE ligacao(a INTEGER NOT NULL,b INTEGER NOT NULL,cenario INTEGER NOT NULL,meio TEXT NOT NULL CHECK(meio IN ('utp','fibra','wifi','radio')),atraso_ms REAL,FOREIGN KEY(a,cenario) REFERENCES dispositivo(id,cenario),FOREIGN KEY(b,cenario) REFERENCES dispositivo(id,cenario));
CREATE TABLE regra_acl(firewall INTEGER NOT NULL,cenario INTEGER NOT NULL,ordem INTEGER NOT NULL,acao TEXT NOT NULL CHECK(acao IN ('permit','deny')),protocolo TEXT NOT NULL,origem TEXT NOT NULL,destino TEXT NOT NULL,porta INTEGER,PRIMARY KEY(firewall,cenario,ordem),FOREIGN KEY(firewall,cenario) REFERENCES dispositivo(id,cenario));
CREATE TABLE rota_estatica(router INTEGER NOT NULL,cenario INTEGER NOT NULL,rede TEXT NOT NULL,prefixo INTEGER NOT NULL,next_hop INTEGER,FOREIGN KEY(router,cenario) REFERENCES dispositivo(id,cenario));
`;
 t+=`INSERT INTO utilizador VALUES(${q(u)});\nINSERT INTO cenario VALUES(1,${q(u)},${q('Cenário de '+u)},${q(now)});\n`;
 VL.forEach(v=>t+=`INSERT INTO vlan VALUES(${v.id},1,${q(v.name)},${q(v.g||null)});\n`);
 nodes.forEach(n=>{const l3=n.t=='router'||n.t=='gs',sat=isSat(n);
  t+=`INSERT INTO dispositivo VALUES(${n.id},1,${q(n.t)},${q(n.name)},${sat?'NULL':q(n.ip)},${sat?'NULL':+n.cidr},${l3||sat?'NULL':q(n.gw||null)},${l3||sat?'NULL':q(n.vlan||null)},${q(n.role||(sat?'transponder '+(n.net||''):null))},${q(n.ext||null)},${Math.round(n.x)},${Math.round(n.y)});\n`;
  if(!sat)addrs(n).forEach(a=>t+=`INSERT INTO interface VALUES(${n.id},1,${q(a.nm)},${q(a.ip)},${a.cidr},${q(a.vlan||null)},${a.pri?1:0});\n`);
  if(n.t=='fw')(n.acl||[]).forEach((r,i)=>t+=`INSERT INTO regra_acl VALUES(${n.id},1,${i+1},${q(r.a)},${q(r.pr)},${q(r.s)},${q(r.d)},${q(r.pt?+r.pt:null)});\n`);
  (n.rt||[]).forEach(r=>t+=`INSERT INTO rota_estatica VALUES(${n.id},1,${q(r.net)},${r.p},${r.via?r.via:'NULL'});\n`)});
 links.forEach(l=>{const m=[get(l.a),get(l.b)].some(n=>n&&isSat(n))?'radio':l.c||'utp';t+=`INSERT INTO ligacao VALUES(${l.a},${l.b},1,${q(m)},${r6(delay(l))});\n`});
 return t+'COMMIT;\n'};
})();
