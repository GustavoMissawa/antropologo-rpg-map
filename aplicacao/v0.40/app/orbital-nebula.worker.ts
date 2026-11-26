import {createNebulaMaterial} from '../lib/nebula-material';
import type {NebulaComposition} from '../lib/nebula-composition';

self.addEventListener('message', ({data}: MessageEvent<{composition: NebulaComposition; width: number}>) => {
  const material = createNebulaMaterial(data.composition, data.width);
  self.postMessage(material, {transfer: [material.channels.buffer]});
});
