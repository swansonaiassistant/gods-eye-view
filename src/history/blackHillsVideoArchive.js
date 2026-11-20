import { BLACK_HILLS_DRONE_VIDEOS, youtubeWatchUrl } from './blackHillsVideoCatalog.js';

/**
 * Minimal independent research archive. Does not require PR #2, add false
 * location pins, embed unlicensed footage or alter the existing map layers.
 * Source-verified geospatial markers will be added only with actual coordinates.
 */
export function initBlackHillsVideoArchive({ documentRef = document } = {}) {
  if (documentRef.getElementById('gev-black-hills-video-archive')) return;
  const toggle = documentRef.createElement('button');
  toggle.type = 'button';
  toggle.textContent = 'HISTORIC RAIL VIDEOS';
  toggle.setAttribute('aria-controls', 'gev-black-hills-video-archive');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.style.cssText = 'position:fixed;right:16px;bottom:70px;z-index:1100;background:#14232c;color:#fff;border:1px solid #b89155;border-radius:6px;padding:9px 12px;font:12px monospace;cursor:pointer';

  const panel = documentRef.createElement('aside');
  panel.id = 'gev-black-hills-video-archive';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Black Hills historic railroad drone video research archive');
  panel.style.cssText = 'position:fixed;right:16px;bottom:112px;z-index:1100;width:min(390px,calc(100vw - 32px));max-height:55vh;overflow:auto;background:#10202beF;color:#fff;border:1px solid #b89155;border-radius:8px;padding:14px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 10px 35px #0009';

  const heading = documentRef.createElement('h2');
  heading.textContent = 'Black Hills Railroad Drone Archive';
  heading.style.cssText = 'font-size:16px;margin:0 0 6px';
  const notice = documentRef.createElement('p');
  notice.textContent = 'Research candidates only. Videos and locations are not yet independently verified or geotagged.';
  notice.style.cssText = 'opacity:.8;margin:0 0 12px';
  panel.append(heading, notice);

  for (const video of BLACK_HILLS_DRONE_VIDEOS) {
    const item = documentRef.createElement('div');
    item.style.cssText = 'padding:10px 0;border-top:1px solid #5e6c7280';
    const title = documentRef.createElement('strong');
    title.textContent = video.place;
    const description = documentRef.createElement('div');
    description.textContent = video.corridor + ' · ' + (video.youtubeId ? 'Candidate link — verify' : 'Video link needed');
    description.style.opacity = '.75';
    item.append(title, description);
    const url = youtubeWatchUrl(video.youtubeId);
    if (url) {
      const link = documentRef.createElement('a');
      link.href = url;
      link.textContent = 'Open candidate on YouTube';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.cssText = 'color:#f6b75c;text-decoration:underline';
      item.append(link);
    }
    panel.append(item);
  }

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
  });
  documentRef.body.append(toggle, panel);
  return () => { toggle.remove(); panel.remove(); };
}
