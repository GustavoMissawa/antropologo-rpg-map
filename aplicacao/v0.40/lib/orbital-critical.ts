import {clampUnit, smoothUnit} from './orbital-noise.ts';

export const ORBITAL_CRITICAL_DURATION_MS = 4700;
export const ORBITAL_CRITICAL_RELEASE_MS = 180;

export type OrbitalCriticalEvent = {startedAt: number; releasedAt?: number};
export type OrbitalCriticalFrame = {
  phase: 'overload' | 'focus' | 'jet' | 'shock' | 'dissipating';
  seconds: number;
  spin: number;
  light: number;
  compression: number;
  core: number;
  jet: number;
  reach: number;
  shock: number;
  wave: number;
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
  const jet = rise(time, 1490, 2020) * (1 - rise(time, 2310, ORBITAL_CRITICAL_DURATION_MS));
  const wave = clampUnit((time - 2050) / 1340);
  const phase = event.releasedAt !== undefined || time >= 2960 ? 'dissipating'
    : time >= 2050 ? 'shock'
    : time >= 1490 ? 'jet'
    : time >= 760 ? 'focus' : 'overload';

  return {
    phase,
    seconds: elapsed / 1000,
    spin: 3.15 * charge * remaining,
    light: .48 * charge * remaining,
    compression: (.067 * collapse + .013 * jet) * remaining,
    core: (.72 * collapse + .56 * jet) * remaining,
    jet: jet * remaining,
    reach: .20 + .40 * (1 - (1 - clampUnit((time - 1490) / 1050)) ** 3),
    shock: rise(wave, 0, .17) * (1 - rise(wave, .12, 1)) * remaining,
    wave: 1 - (1 - wave) ** 1.65,
  };
}
