export type OrbitalStar = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  tint: 'neutral' | 'primary' | 'secondary';
  twinkle: boolean;
};

/** Stable during SSR, hydration and preference changes; no per-frame sampling. */
export function createOrbitalStars(count = 290, seed = 2041): OrbitalStar[] {
  let state = seed >>> 0;
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  return Array.from({length: count}, (_, index) => {
    let x = random(), y = random();
    if (random() < .37) {
      const cluster = random() < .58 ? [.80, .19] : [.14, .77];
      x = cluster[0] + (random() + random() + random() - 1.5) * .24;
      y = cluster[1] + (random() + random() + random() - 1.5) * .25;
    }
    x = Math.max(.005, Math.min(.995, x));
    y = Math.max(.005, Math.min(.995, y));
    const central = ((x - .53) / .23) ** 2 + ((y - .50) / .31) ** 2 < 1;
    const large = index === 37 || index === 149 || index === 238;
    const medium = !large && index % 13 === 0;
    return {
      x: x * 1440, y: y * 900,
      radius: large ? 1.7 : medium ? 1.05 : .38 + random() * .4,
      opacity: (.22 + random() * .65) * (central ? .22 : 1),
      tint: index % 7 === 0 ? 'secondary' : index % 11 === 0 ? 'primary' : 'neutral',
      twinkle: !central && index % 47 === 0,
    };
  });
}
