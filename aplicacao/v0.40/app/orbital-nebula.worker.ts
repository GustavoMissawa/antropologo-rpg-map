import {createNebulaMaterial} from '../lib/nebula-material';
import type {NebulaFormation} from '../lib/nebula-composition';

self.addEventListener('message', ({data}: MessageEvent<{composition: NebulaFormation[]; width: number}>) => {
  const batch = data.composition.map(formation => createNebulaMaterial(formation, data.width));
  self.postMessage(batch, {transfer: batch.map(material => material.channels.buffer)});
});
