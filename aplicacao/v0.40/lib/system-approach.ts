import { clampUnit, smoothUnit } from './orbital-noise.ts';
import type { SpacePoint } from './orbital-system.ts';

export function systemApproachDuration(compact: boolean, reduced: boolean) {
  return reduced ? 180 : compact ? 3800 : 4250;
}

/** Integrate a smooth takeoff and braking profile. All scene layers use this clock. */
export function systemApproachAt(progress: number, reduced = false) {
  const time = clampUnit(progress);
  const complete = time === 1;
  const ramp = (start: number, end: number) => smoothUnit((time - start) / (end - start));
  const distance = time - Math.sin(2 * Math.PI * time) / (2 * Math.PI);
  const speed = complete ? 0 : Math.sin(Math.PI * time) ** 2;
  const approach = reduced ? 1 : ramp(.36, 1);
  const reveal = reduced ? 1 : ramp(.35, .47);
  return {
    complete,
    distance,
    speed,
    departureZoom: reduced ? 1 : 1 / (1 - .71 * smoothUnit(distance / .35)),
    departureSweep: reduced ? 0 : ramp(.16, .49),
    departureDisk: 1 - ramp(.35, .52),
    departureSky: reduced ? 1 - ramp(0, .95) : 1 - ramp(.38, .70),
    departureUi: reduced ? 1 - ramp(0, .95) : 1 - ramp(0, .19),
    particles: reduced ? 0 : ramp(.11, .34) * (1 - ramp(.69, .98)),
    arrivalZoom: .035 + .965 * approach ** 1.4,
    arrivalBearing: (1 - approach) ** 2,
    arrivalStar: reveal,
    arrivalPlanets: reduced ? 1 : ramp(.52, .77),
    arrivalTracks: reduced ? 1 : ramp(.68, .92),
    arrivalSky: reduced ? 1 : ramp(.50, .89),
    arrivalLabels: reduced ? 1 : ramp(.82, .98),
    arrivalUi: reduced ? ramp(.25, 1) : ramp(.90, 1),
  };
}

export type ApproachFrame = ReturnType<typeof systemApproachAt>;

/** The planetarium paints its own bodies on the same frames as the departure sky. */
export type SystemApproach = {
  bookId: string;
  active: boolean;
  frame: ApproachFrame;
  paintSystem?: (seconds: number) => SpacePoint;
  resumeSystem?: () => void;
};
