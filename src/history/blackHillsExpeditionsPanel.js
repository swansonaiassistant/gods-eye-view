import { EXPEDITIONS, ENGAGEMENTS, HISTORICAL_CONTEXT } from './blackHillsExpeditionsCatalog.js';

// Independent research browser; later GIS PR will add sourced route vectors.
export function initBlackHillsExpeditionsPanel(doc = document) {
  if (doc.getElementById('gev-historic-expeditions')) return;
  const button = doc.createElement('button');
  button.type='button';
  button.textContent='BLACK HILLS 1800s';
  button.setAttribute('aria-controls','gev-historic-expeditions');
  button.setAttribute('aria-expanded','false');
  button.style.cssText='position:fixed;right:16px;bottom:114px;z-index:1099;background:#14232c;color:#fff;border:1px solid #b89155;border-radius:6px;padding:9px 12px;font:12px monospace;cursor:pointer';
  const panel=doc.createElement('aside');
  panel.id='gev-historic-expeditions';
  panel.hidden=true;
  panel.setAttribute('aria-label','Historical Black Hills expeditions and conflicts');
  panel.style.cssText='position:fixed;right:16px;bottom:156px;z-index:1099;width:min(420px,calc(100vw - 32px));max-height:55vh;overflow:auto;background:#10202bef;color:#fff;border:1px solid #b89155;border-radius:8px;padding:14px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 10px 35px #0009';
  const h=doc.createElement('h2');h.textContent='Black Hills Expeditions, 1857–1877';h.style.cssText='font-size:16px;margin:0 0 6px';panel.append(h);
  const notice=doc.createElement('p');notice.textContent='Research timeline — geographic routes and camp positions await source-map georeferencing. Includes events beyond the Black Hills.';panel.append(notice);
  for(const [heading,items] of [['Expeditions and surveys',EXPEDITIONS],['Engagements',ENGAGEMENTS],['Historical context',HISTORICAL_CONTEXT]]){
    const section=doc.createElement('section'),title=doc.createElement('h3');
    title.textContent=heading;title.style.cssText='font-size:14px;margin:12px 0 4px';section.append(title);
    for(const item of items){
      const row=doc.createElement('div');row.style.cssText='padding:8px 0;border-top:1px solid #5e6c7280';
      const bold=doc.createElement('strong');bold.textContent=item.title;
      const subtitle=doc.createElement('div');subtitle.style.opacity='.8';
      subtitle.textContent=[item.date||[item.start,item.end].filter(Boolean).join('–'),item.area||item.region].filter(Boolean).join(' · ');
      const desc=doc.createElement('p');desc.textContent=item.summary||'';desc.style.margin='3px 0';
      const link=doc.createElement('a');link.href=item.sources[0];link.target='_blank';link.rel='noopener noreferrer';
      link.textContent='Historical source';link.style.color='#f6b75c';
      row.append(bold,subtitle,desc,link);section.append(row);
    }
    panel.append(section);
  }
  button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));});
  doc.body.append(button,panel);
  return ()=>{button.remove();panel.remove();};
}
