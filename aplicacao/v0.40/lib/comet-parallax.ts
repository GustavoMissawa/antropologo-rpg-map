import { orbitalRandom, orbitalSeed } from './orbital-noise.ts';

export const cometTile = {width:1000,height:150} as const;
export const cometDepths = [
  {name:'far', stars:44, desktopExtra:20, period:68, compactPeriod:49, radius:.60, trail:0, color:'#a4b9ce', opacity:.62},
  {name:'middle', stars:32, desktopExtra:12, period:19, compactPeriod:14, radius:.87, trail:6, color:'#bcd5ea', opacity:.69},
  {name:'near', stars:11, desktopExtra:9, period:6.8, compactPeriod:5.3, radius:1.19, trail:31, color:'#d3e8f9', opacity:.61},
] as const;

const fixed = (n: number) => n.toFixed(2);

/** Each plane occupies its own seeded slice of space and wraps on both axes. */
export function cometSkyTile(seed: number, depth: typeof cometDepths[number], index: number) {
  const random = orbitalRandom(orbitalSeed(seed ^ ((index+1)*0x27ad85d7)));
  const paths = [{points:'',trails:''},{points:'',trails:''}];
  const {width,height} = cometTile;
  for (let i=0; i<depth.stars+depth.desktopExtra; i++) {
    const x = 6 + random()*(width-66), y = 3 + random()*(height-13);
    const radius = depth.radius * (.42 + .86 * random()**2);
    const length = depth.trail * (.30+.70*random()**1.45);
    const bucket = paths[i<depth.stars?0:1];
    const r = fixed(radius), d = fixed(radius*2);
    bucket.points += `M${fixed(x-radius)} ${fixed(y)}a${r} ${r} 0 1 0 ${d} 0a${r} ${r} 0 1 0 -${d} 0Z`;
    if (length>0) bucket.trails += `M${fixed(x)} ${fixed(y)}l${fixed(length)} ${fixed(length*height/width)}`;
  }
  return paths;
}
