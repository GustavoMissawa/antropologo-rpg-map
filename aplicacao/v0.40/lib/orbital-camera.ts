import { planOrbitalFlight, planetaryLocation, type PlanetarySystem, type SpacePoint } from './orbital-system.ts';
import { clampUnit, smoothUnit } from './orbital-noise.ts';

import { lunarOrbit, type mapFrame } from './orbital-layout.ts';
export type OrbitalView = 'exploration' | 'focus' | 'reading';
export type Camera = SpacePoint & { zoom: number };
export type CameraMotion = {
  kind: 'orbit' | 'lateral' | 'jump';
  from: Camera;
  duration: number;
};

export const overviewCamera: Camera = { x: 0, y: 0, zoom: 1 };

export function targetCamera(parent: SpacePoint | undefined, moon: SpacePoint | undefined,
  hasMoons: boolean, frame: ReturnType<typeof mapFrame>): Camera {
  if (!parent) return overviewCamera;
  const {bounds, scale} = frame;
  const offset = moon ? {x: moon.x * .22, y: moon.y * .22} : {x: 0, y: 0};
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const extentX = (hasMoons ? 162 : 100) + Math.abs(offset.x);
  const extentY = (hasMoons ? 125 : 100) + Math.abs(offset.y);
  const magnification = Math.min((width < 560 ? 1.50 : 2.38) + (moon ? .12 : 0),
    width / (2 * extentX), height / (2 * extentY));
  return {x: parent.x + offset.x, y: parent.y + offset.y, zoom: magnification / scale};
}

export function makeCameraMotion(system: PlanetarySystem, previous: string | undefined, destination: string | undefined,
  camera: Camera, compact: boolean): CameraMotion | null {
  const flight = planOrbitalFlight(planetaryLocation(system, previous), planetaryLocation(system, destination));
  if (!flight) return null;
  const {kind} = flight;
  return { kind, from: camera, duration: kind === 'orbit' ? 480 : kind === 'lateral' ? 720 : compact ? 1030 : 1280 };
}

const mix = (from: number, to: number, time: number) => from + (to - from) * time;

/** Both endpoints refer to the same world. Retargeting uses the last painted camera. */
export function cameraAt(motion: CameraMotion, target: Camera, progress: number, parent?: SpacePoint): Camera {
  const {from, kind} = motion;
  if (progress <= 0) return from;
  if (progress >= 1) return target;
  const time = smoothUnit(progress);
  if (kind === 'orbit' && parent) {
    const yRatio = lunarOrbit.y / lunarOrbit.x;
    const startX = from.x - parent.x, startY = (from.y - parent.y) / yRatio;
    const endX = target.x - parent.x, endY = (target.y - parent.y) / yRatio;
    const startRadius = Math.hypot(startX, startY);
    if (startRadius <= lunarOrbit.x * 1.32) {
      const first = Math.atan2(startY,startX), last = Math.atan2(endY,endX);
      const turn = Math.atan2(Math.sin(last - first),Math.cos(last - first));
      const angle = first + turn * time;
      const radius = mix(startRadius,Math.hypot(endX,endY),time);
      return { x: parent.x + radius * Math.cos(angle), y: parent.y + radius * Math.sin(angle) * yRatio, zoom: mix(from.zoom,target.zoom,time) };
    }
  }
  const t = kind === 'jump' ? smoothUnit((progress - .12) / .71) : time;
  let zoom = mix(from.zoom, target.zoom, t);
  if (kind === 'jump') {
    const wide = Math.min(.78, from.zoom, target.zoom);
    zoom = progress < .40
      ? mix(from.zoom, wide, smoothUnit(progress / .40))
      : mix(wide, target.zoom, smoothUnit(clampUnit((progress - .40) / .60)));
  }
  return { x: mix(from.x,target.x,t), y: mix(from.y,target.y,t), zoom };
}
