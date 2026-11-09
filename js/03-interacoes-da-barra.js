(()=>{const th=document.querySelector('#th'),setH=t=>th.textContent=HINT[t]||'';setH('move');
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setH(b.dataset.tool)));
document.querySelector('#lgc').onclick=()=>{document.querySelector('#log').innerHTML='Registo limpo.'};
const sync=()=>{document.querySelector('#tp').classList.toggle('on',!document.querySelector('#panel').classList.contains('h'));document.querySelector('#xpb').classList.toggle('on',!document.querySelector('#xp').classList.contains('h'))};
new MutationObserver(sync).observe(document.querySelector('#panel'),{attributes:true});new MutationObserver(sync).observe(document.querySelector('#xp'),{attributes:true});sync();})();
