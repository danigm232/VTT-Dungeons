const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

/** Register original files/hashes in the report before calling this helper.
 * Supply only equally framed captures with matching pixel dimensions. */
export function visualComparison({before,after,title,width,height}){
 if(!before||!after||!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw Error('Incomplete visual comparison');
 return `<figure class="vtt-comparison" data-vtt-comparison data-title="${escape(title)}"><figcaption>${escape(title)}</figcaption><button type="button" class="vtt-comparison-stage" data-compare-toggle aria-pressed="false" aria-label="Mostrar después: ${escape(title)}"><img src="${escape(before)}" alt="Antes: ${escape(title)}" width="${width}" height="${height}" loading="lazy" decoding="async"><img class="vtt-comparison-after" src="${escape(after)}" alt="Después: ${escape(title)}" width="${width}" height="${height}" loading="lazy" decoding="async" aria-hidden="true"><span class="vtt-comparison-badge" aria-hidden="true">ANTES</span></button><div class="vtt-comparison-controls"><button type="button" data-compare-toggle aria-pressed="false">Ver después</button><button type="button" data-compare-enlarge>Ampliar</button><a href="${escape(before)}" target="_blank" rel="noopener">Original antes</a><a href="${escape(after)}" target="_blank" rel="noopener">Original después</a></div><p class="vtt-comparison-help" data-compare-status role="status">Mostrando antes. Pulsa la imagen para superponer el después; vuelve a pulsar para regresar.</p></figure>`;
}

const css=`
.vtt-comparison{margin:18px 0;min-width:0}.vtt-comparison figcaption{font-weight:600;margin:0 0 10px}
.vtt-comparison-stage{box-sizing:border-box;display:block;position:relative;padding:0;border:1px solid #70817e;background:#101c22;cursor:pointer;width:100%;overflow:hidden;border-radius:4px;color:#fff;touch-action:manipulation}
.vtt-comparison-stage img{display:block;width:100%;height:auto;max-width:none;border-radius:0}
.vtt-comparison-stage .vtt-comparison-after{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:0;pointer-events:none}
.vtt-comparison[data-after="true"] .vtt-comparison-after{opacity:1}.vtt-comparison-badge{position:absolute;right:12px;bottom:12px;background:#08141be8;color:#fff;font:700 13px/1.4 system-ui;padding:6px 12px;border:1px solid #a3b9af;border-radius:3px}
.vtt-comparison-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px}.vtt-comparison-controls button,.vtt-comparison-modal button:not(.vtt-comparison-stage){font:inherit;background:#29434a;color:#f0e8d5;border:1px solid #819991;border-radius:4px;padding:8px 14px;cursor:pointer;min-height:44px}
.vtt-comparison-controls a{font-size:13px}.vtt-comparison-help{font-size:13px;color:#c6d5d0;margin:8px 0}
.vtt-comparison button:focus-visible,.vtt-comparison-modal button:focus-visible{outline:3px solid #f3ce91;outline-offset:3px}
.vtt-comparison-modal{width:min(96vw,1800px);max-width:none;padding:16px;background:#14272e;color:#ececdf;border:1px solid #80928d;border-radius:7px}
.vtt-comparison-modal::backdrop{background:#050c12e8}.vtt-comparison-modal header{display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:none;padding:0;margin:0 0 10px}
.vtt-comparison-modal h2{font:600 18px/1.4 system-ui;margin:0;flex:1}.vtt-comparison-modal label{display:flex;align-items:center;gap:8px}.vtt-comparison-modal input{max-width:160px}
.vtt-comparison-pan{overflow:auto;max-height:72vh;overscroll-behavior:contain}.vtt-comparison-pan .vtt-comparison{margin:0}.vtt-comparison-pan .vtt-comparison-stage{border-radius:0}.vtt-comparison-pan .vtt-comparison-stage:focus-visible{outline-offset:-4px}
`;

function installVisualComparisons(){
 let modal;
 function update(figure,after){
  figure.dataset.after=String(after);
  const title=figure.dataset.title||'Comparativa';
  for(const toggle of figure.querySelectorAll('[data-compare-toggle]')){
   toggle.setAttribute('aria-pressed',String(after));
   toggle.setAttribute('aria-label',`Mostrar ${after?'antes':'después'}: ${title}`);
   if(!toggle.classList.contains('vtt-comparison-stage'))toggle.textContent=after?'Ver antes':'Ver después';
  }
  const images=figure.querySelectorAll('.vtt-comparison-stage img');
  images[0].setAttribute('aria-hidden',String(after));images[1].setAttribute('aria-hidden',String(!after));
  figure.querySelector('.vtt-comparison-badge').textContent=after?'DESPUÉS':'ANTES';
  const status=figure.querySelector('[data-compare-status]');
  if(status)status.textContent=`Mostrando ${after?'después':'antes'}. Pulsa la imagen para alternar sin mover el encuadre.`;
 }
 function enlarge(source){
  if(!modal){
   modal=document.createElement('dialog');modal.className='vtt-comparison-modal';
   modal.innerHTML='<header><h2></h2><label>Zoom <input type="range" min="100" max="300" step="25" value="100" aria-label="Ampliación de la comparativa"><output>100 %</output></label><button type="button" data-close-comparison>Cerrar</button></header><div class="vtt-comparison-pan"></div>';
   document.body.append(modal);
   modal.querySelector('[data-close-comparison]').onclick=()=>modal.close();
   modal.querySelector('input').oninput=event=>{const value=event.target.value;modal.querySelector('output').textContent=value+' %';modal.querySelector('.vtt-comparison').style.width=value+'%';};
  }
  modal.querySelector('h2').textContent=source.dataset.title;
  const clone=source.cloneNode(true);clone.style.width='100%';clone.querySelector('[data-compare-enlarge]').remove();
  for(const img of clone.querySelectorAll('img'))img.loading='eager';
  modal.querySelector('.vtt-comparison-pan').replaceChildren(clone);modal.querySelector('input').value='100';modal.querySelector('output').textContent='100 %';
  modal.showModal();modal.querySelector('.vtt-comparison-stage').focus();
 }
 document.addEventListener('click',event=>{
  const target=event.target.closest('[data-compare-toggle], [data-compare-enlarge]');if(!target)return;
  const figure=target.closest('[data-vtt-comparison]');if(!figure)return;
  if(target.hasAttribute('data-compare-enlarge'))enlarge(figure);else update(figure,figure.dataset.after!=='true');
 });
}

/** Inline assets work when the report is opened directly from Windows files.
 * No server, CDN, libraries or fetch() are needed for the comparison itself. */
export function visualComparisonAssets(){return `<style>${css}</style><script>(${installVisualComparisons.toString()})();</script>`;}
