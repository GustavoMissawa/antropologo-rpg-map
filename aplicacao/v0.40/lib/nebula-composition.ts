export type NebulaFormation = {anchor: string; tilt: number; scale: number; x: number; y: number; strength: number; stretch: number; blend: number; phase: number};
const anchors = ['north', 'east', 'southwest', 'south', 'northeast'];
/** Pure seeded generator, bounded to the established edge corridors. */
export function createNebulaComposition(seed: number): NebulaFormation[] {
  let state = seed >>> 0;
  const random = () => ((state = (Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const count = 2 + Math.floor(random()*4);
  const chosen = [random()<.5?0:2, [1,3,4][Math.floor(random()*3)]];
  const rest = anchors.map((_,i)=>i).filter(i=>!chosen.includes(i));
  while (chosen.length<count) chosen.push(rest.splice(Math.floor(random()*rest.length),1)[0]);
  return chosen.map(i=>({
    anchor: anchors[i], tilt: -24+random()*48, scale: .82+random()*.30,
    x: -4+random()*8, y: -5+random()*10, strength: .72+random()*.28,
    stretch: .8+random()*.4, blend: .35+random()*.4, phase: -random()*26,
  }));
}
let composition: NebulaFormation[] | undefined;
/** Called only after hydration. The module lives for this document, including SPA navigation. */
export function pageNebulaComposition() {
  if (typeof window === 'undefined') return [];
  return composition ??= createNebulaComposition(crypto.getRandomValues(new Uint32Array(1))[0]);
}
