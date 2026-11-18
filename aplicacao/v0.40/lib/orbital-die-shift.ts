import {chooseOrbitalDie, type OrbitalDieKind} from './orbital-die-geometry.ts';

export const ORBITAL_DIE_SHIFT_SECONDS = 1.04;

export type OrbitalDieShift = {
  next: OrbitalDieKind;
  elapsed: number;
  carry: number;
};

function progress(elapsed: number) {
  return Math.min(1, elapsed / ORBITAL_DIE_SHIFT_SECONDS);
}

export function orbitalDieShiftSpeed(shift: OrbitalDieShift, elapsed = shift.elapsed) {
  const t = progress(elapsed);
  return 26 * Math.sin(Math.PI * t) ** 2 + shift.carry * (1 - t) ** 3;
}

export function beginOrbitalDieShift(current: OrbitalDieKind, previous: OrbitalDieShift | null, random = Math.random): OrbitalDieShift {
  const next = chooseOrbitalDie(current, random);
  // A second selection before the swap redirects the pending model and keeps the momentum.
  if (previous && progress(previous.elapsed) < .5) return {...previous, next};
  return {next, elapsed: 0, carry: previous ? orbitalDieShiftSpeed(previous) : 0};
}

export function advanceOrbitalDieShift(shift: OrbitalDieShift, seconds: number) {
  const end = Math.min(ORBITAL_DIE_SHIFT_SECONDS, shift.elapsed + seconds);
  const before = progress(shift.elapsed), after = progress(end);
  // Integrate the angular speed, so a slow handset produces the same total turn.
  const integral = (t: number) =>
    26 * (t / 2 - Math.sin(2 * Math.PI * t) / (4 * Math.PI)) - shift.carry * (1 - t) ** 4 / 4;
  shift.elapsed = end;
  return {
    turn: ORBITAL_DIE_SHIFT_SECONDS * (integral(after) - integral(before)),
    charge: Math.sin(Math.PI * after) ** 4,
    swap: before < .5 && after >= .5,
    finished: after === 1,
  };
}
