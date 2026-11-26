export function orbitalRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function orbitalSeed(seed: number) {
  seed = Math.imul(seed ^ (seed >>> 16), 0x7feb352d);
  seed = Math.imul(seed ^ (seed >>> 15), 0x846ca68b);
  return (seed ^ (seed >>> 16)) >>> 0;
}

export function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function smoothUnit(value: number) {
  const t = clampUnit(value);
  return t * t * (3 - 2 * t);
}

/** Interpolate a small, seeded lattice rather than hashing each octave at every sample. */
export function createOrbitalNoise(seed: number) {
  const random = orbitalRandom(orbitalSeed(seed));
  const grid = Float32Array.from({length: 32 * 32}, random);
  return (x: number, y: number) => {
    const column = Math.floor(x), row = Math.floor(y);
    const dx = x - column, dy = y - row;
    const u = dx * dx * (3 - 2 * dx), v = dy * dy * (3 - 2 * dy);
    const first = column & 31, next = (column + 1) & 31;
    const low = (row & 31) * 32, high = ((row + 1) & 31) * 32;
    const a = grid[low + first] + (grid[low + next] - grid[low + first]) * u;
    const b = grid[high + first] + (grid[high + next] - grid[high + first]) * u;
    return a + (b - a) * v;
  };
}
