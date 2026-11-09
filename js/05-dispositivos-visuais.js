// Dispositivos 3D: imagens pré-renderizadas (raymarching físico) embutidas no ficheiro
(()=>{function apply(){document.querySelectorAll('#dock [data-add]').forEach(b=>{const u=REAL[b.dataset.add],s=b.querySelector('svg');if(u&&s){const im=new Image();im.src=u;im.alt='';im.className='di';im.decoding='async';s.replaceWith(im)}});
 const br=document.querySelector('.brand>svg');if(br&&REAL.geo){const im=new Image();im.src=REAL.geo;im.alt='';im.className='bi';br.replaceWith(im)}}apply()})();
