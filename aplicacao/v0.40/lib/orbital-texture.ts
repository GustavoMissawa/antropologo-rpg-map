import { createOrbitalNoise, orbitalRandom } from './orbital-noise.ts';
import type { Surface } from './planetary-architecture.ts';

const turn = Math.PI * 2;
const fixed = (value: number) => value.toFixed(1);
const xy = (x: number, y: number) => `${fixed(x)} ${fixed(y)}`;
type Tone = 'light' | 'base' | 'shade';
export type SurfaceMark = {d: string; tone: Tone; opacity: number; width?: number};

/** A coherent contour. Adjacent samples share the same noise instead of spiking independently. */
export function orbitalPatch(x: number, y: number, width: number, height: number,
  phase: number, noise: ReturnType<typeof createOrbitalNoise>) {
  const points = Array.from({length: 9}, (_, i) => {
    const angle = i * turn / 9;
    const sx = Math.cos(angle), sy = Math.sin(angle);
    const scale = .62 + .72 * noise(phase + sx * 1.28, phase * .37 + sy * 1.28);
    return {x:x + sx * width * scale,y:y + sy * height * scale};
  });
  const segment = (point: typeof points[number], next: typeof points[number]) =>
    xy((point.x + next.x) / 2, (point.y + next.y) / 2);
  return 'M' + segment(points[8], points[0]) + points.map((point, i) =>
    'Q' + xy(point.x,point.y) + ' ' + segment(point, points[(i + 1) % points.length])).join('') + 'Z';
}

function craterMarks(seed: number, amount: number, moon: boolean): SurfaceMark[] {
  const random = orbitalRandom(seed);
  let floors = '', shade = '', rim = '';
  for (let i = 0; i < amount; i++) {
    const angle = random() * turn;
    const latitude = Math.sqrt(random()) * 82;
    const x = Math.cos(angle) * latitude, y = Math.sin(angle) * latitude;
    const radius = 2.6 + random() ** 2.2 * (moon ? 17 : 13) + (moon && i === 0 ? 7 : 0);
    const height = radius * (.84 - .26 * (latitude / 82));
    const ellipse = `${fixed(radius)} ${fixed(height)} 0 0`;
    const left = xy(x-radius,y), right = xy(x+radius,y);
    floors += `M${left}a${ellipse} 1 ${fixed(radius*2)} 0a${ellipse} 1 ${fixed(-radius*2)} 0Z`;
    shade += `M${left}A${ellipse} 1 ${right}`;
    rim += `M${right}A${ellipse} 1 ${left}`;
  }
  return [
    {d:floors,tone:'shade',opacity:.38},
    {d:shade,tone:'shade',opacity:.60,width:2.0},
    {d:rim,tone:'light',opacity:.48,width:1.5},
  ];
}

function gasMarks(seed: number, icy: boolean, storm: boolean, detail: boolean): SurfaceMark[] {
  const random = orbitalRandom(seed ^ 0x598e5bed);
  const marks: SurfaceMark[] = [];
  const bands = icy ? 8 : 11;
  for (let i = 0; i < bands; i++) {
    const y = -95 + (i + .25 * random()) * 188 / (bands - 1);
    const bend = random() * 21 - 10.5;
    const width = (icy ? 9 : 12) + random() * 12;
    const tone = i % 3 === 0 ? 'shade' : 'light';
    const d = `M-108 ${fixed(y)}C-76 ${fixed(y+bend)} -44 ${fixed(y-bend)} -10 ${fixed(y-2)}S62 ${fixed(y+bend*.4)} 108 ${fixed(y+bend*.18)}`;
    marks.push({d,tone,opacity:tone==='shade'?.38:.26,width});
    if (detail) marks.push({d,tone,opacity:.16,width:width*.22});
  }
  if (storm) {
    const x = -42 + 84 * random(), y = -40 + 80 * random(), w = 20 + 13 * random(), h = w * .34;
    marks.push(
      {d:`M${xy(x-w,y)}a${xy(w,h)} 0 1 0 ${xy(2*w,0)}a${xy(w,h)} 0 1 0 ${xy(-2*w,0)}Z`,tone:'light',opacity:.58},
      {d:`M${xy(x-w*.65,y+1)}q${xy(w*.6,-h*1.20)} ${xy(w*1.36,-1)}q${xy(-w*.64,h*.83)} ${xy(-w*.95,1)}t${xy(w*.63,-h*.18)}`,
        tone:'shade',opacity:.66,width:3.3},
      {d:`M${xy(x-w*1.17,y+h)}q${xy(w*.9,h*.62)} ${xy(w*2.31,-h*.39)}`,tone:'light',opacity:.48,width:2.0},
    );
  }
  return marks;
}

export function globeTexture(seed: number, type: Surface, moon: boolean,
  cratering: number, storm: boolean, detail: boolean): SurfaceMark[] {
  if (type === 'gas-giant' || type === 'ice-giant') return gasMarks(seed,type==='ice-giant',storm,detail);
  const noise = createOrbitalNoise(seed ^ 0x28a41c23);
  const random = orbitalRandom(seed ^ 0x768d05a1);
  const marks: SurfaceMark[] = [];
  const ocean = type === 'oceanic';
  const frost = type === 'icy';
  const lava = type === 'volcanic';
  const dunes = type === 'desert';
  for (let i = 0; i < (detail ? 10 : 6); i++) {
    const x = (random() - .5) * 174, y = (random() - .5) * 184;
    const radius = 17 + random() * (moon || ocean ? 55 : 42);
    const tone = lava || moon && i % 3 !== 0 ? 'shade' : i % 2 === 0 ? 'light' : 'shade';
    marks.push({d:orbitalPatch(x,y,radius,radius*(.47+.47*random()),3+i*2.8,noise),
      tone,opacity:ocean?.47:lava?.69:moon?.41:.29});
  }
  if (frost) marks.push({d:orbitalPatch(-12,-83,87,37,61,noise),tone:'light',opacity:.61});
  if (lava || frost) {
    const veins = orbitalRandom(seed ^ 0x34b57ab1);
    let fissures = '', branches = '';
    for (let i=0; i<(detail?8:5); i++) {
      const x = (veins()-.5)*163, y = (veins()-.5)*158;
      const w = 14 + veins()*27, h = 14 + veins()*24;
      fissures += `M${xy(x-w,y-h)}l${xy(w*.61,h*.24)} ${xy(w*.39,h*.76)} ${xy(w*.54,h*.29)} ${xy(w*.46,h*.71)}`;
      branches += `M${xy(x,y)}l${xy(w*.12,-h*.52)} ${xy(w*.54,-h*.32)}`;
    }
    marks.push({d:fissures,tone:lava?'light':'shade',opacity:lava?.69:.54,width:lava?2.5:1.45},
      {d:branches,tone:lava?'light':'shade',opacity:.39,width:lava?1.05:.8});
  }
  if (dunes || ocean) {
    const currents = orbitalRandom(seed ^ 0x62e8ac9f);
    let d = '';
    for (let i=0;i<(detail?9:5);i++) {
      const x = (currents()-.5)*120, y=(currents()-.5)*163;
      const span=23+currents()*46, bend=currents()*12;
      d += `M${xy(x-span/2,y)}q${xy(span*.30,-bend)} ${xy(span*.62,-bend*.26)}t${xy(span*.38,bend*.07)}`;
    }
    marks.push({d,tone:'light',opacity:ocean?.39:.57,width:ocean?3.7:2.2});
  }
  if (cratering>0) marks.push(...craterMarks(seed ^ 0x6d6cea33,
    Math.ceil(cratering * (moon ? (detail?15:9) : (detail?10:6))),moon));
  return marks;
}
