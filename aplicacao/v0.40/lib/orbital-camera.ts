import { planOrbitalFlight, planetaryLocation, pointOnOrbit, type CelestialOrbit, type OrbitalTopic, type PlanetarySystem, type SpacePoint } from './orbital-system.ts';
import { clampUnit, smoothUnit } from './orbital-noise.ts';

export const solarOrbit = { x: 450, y: 224 };
export const lunarOrbit = { x: 137, y: 85 };
export type OrbitalView = 'exploration' | 'focus' | 'reading';
export type Camera = SpacePoint & { zoom: number };
export type CameraMotion = {
  kind: 'arrival' | 'orbit' | 'lateral' | 'jump';
  from: Camera;
  duration: number;
};

export const overviewCamera: Camera = { x: 0, y: 0, zoom: 1 };
export const arrivalCamera: Camera = { x: -186, y: -115, zoom: .72 };

export function orbitPosition(orbit: CelestialOrbit, plane: SpacePoint, seconds: number) {
  const angularSpeed = (plane === lunarOrbit ? .008 : .0028) / Math.sqrt(orbit.radius);
  const point = pointOnOrbit({ radius: orbit.radius, angle: orbit.angle + seconds * angularSpeed });
  return { x: point.x * plane.x, y: point.y * plane.y };
}

export function targetCamera(topic: OrbitalTopic | undefined, seconds: number, compact: boolean): Camera {
  if (!topic) return overviewCamera;
  const center = orbitPosition(topic.planet.orbit, solarOrbit, seconds);
  if (!topic.moon) return { ...center, zoom: compact ? 2.75 : 2.12 };
  const moon = orbitPosition(topic.moon.orbit, lunarOrbit, seconds);
  return { x: center.x + moon.x, y: center.y + moon.y, zoom: compact ? 5.55 : 4.28 };
}

export function makeCameraMotion(system: PlanetarySystem, previous: string | undefined, destination: string | undefined,
  camera: Camera, arrival: boolean, compact: boolean): CameraMotion | null {
  if (arrival) return { kind: 'arrival', from: arrivalCamera, duration: compact ? 970 : 1160 };
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
  const t = kind === 'arrival' ? 1 - (1 - progress) ** 3 : kind === 'jump' ? smoothUnit((progress - .12) / .71) : time;
  let zoom = mix(from.zoom, target.zoom, t);
  if (kind === 'jump') {
    const wide = Math.min(.78, from.zoom, target.zoom);
    zoom = progress < .40
      ? mix(from.zoom, wide, smoothUnit(progress / .40))
      : mix(wide, target.zoom, smoothUnit(clampUnit((progress - .40) / .60)));
  }
  return { x: mix(from.x,target.x,t), y: mix(from.y,target.y,t), zoom };
}
