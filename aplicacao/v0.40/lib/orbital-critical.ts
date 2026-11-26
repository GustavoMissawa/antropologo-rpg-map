import {smoothUnit} from './orbital-noise.ts';

export const ORBITAL_CRITICAL_DURATION_MS = 4700;
export const ORBITAL_CRITICAL_RELEASE_MS = 180;

export type OrbitalCriticalEvent = {startedAt: number; releasedAt?: number};
export type OrbitalCriticalFrame = {
  phase: 'overload' | 'focus' | 'dissipating';
  spin: number;
  light: number;
  compression: number;
  core: number;
};

function rise(time: number, from: number, to: number) {
  return smoothUnit((time - from) / (to - from));
}

/** Interruption keeps its current envelope and lets the existing energy dissipate. */
export function sampleOrbitalCritical(event: OrbitalCriticalEvent, now: number): OrbitalCriticalFrame | null {
  const elapsed = Math.max(0, now - event.startedAt);
  const release = event.releasedAt ?? now;
  const time = Math.max(0, Math.min(elapsed, release - event.startedAt));
  const remaining = 1 - smoothUnit((now - release) / ORBITAL_CRITICAL_RELEASE_MS);
  if (elapsed >= ORBITAL_CRITICAL_DURATION_MS || remaining <= 0) return null;

  const charge = rise(time, 0, 1540) * (1 - rise(time, 2130, ORBITAL_CRITICAL_DURATION_MS));
  const collapse = rise(time, 450, 1550) * (1 - rise(time, 1710, 2560));
  const afterglow = rise(time, 1490, 2020) * (1 - rise(time, 2310, ORBITAL_CRITICAL_DURATION_MS));
  const phase = event.releasedAt !== undefined || time >= 2960 ? 'dissipating'
    : time >= 760 ? 'focus' : 'overload';

  return {
    phase,
    spin: 3.15 * charge * remaining,
    light: .48 * charge * remaining,
    compression: (.067 * collapse + .013 * afterglow) * remaining,
    core: (.72 * collapse + .56 * afterglow) * remaining,
  };
}
