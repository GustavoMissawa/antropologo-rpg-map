import {paintOrbitalBitmaps, type OrbitalLightRequest} from '../lib/orbital-light';

self.addEventListener('message', ({data}: MessageEvent<OrbitalLightRequest>) => {
  const bitmaps = paintOrbitalBitmaps(data);
  self.postMessage(bitmaps, {transfer: bitmaps ?? []});
});
