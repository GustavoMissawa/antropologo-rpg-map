import {ORBITAL_MARKER_BAND, orbitalFlowBand} from './orbital-flow.ts';

export type OrbitalPoint = {x: number; y: number};

const tilt = 37 * Math.PI / 180;
const cosine = Math.cos(tilt);
const sine = Math.sin(tilt);
const flattening = .74;
const markerBand = orbitalFlowBand(ORBITAL_MARKER_BAND);
// The inner part of this band keeps the marker clear of the destination nodes.
const attachmentRadius = .75;
const fullTurn = Math.PI * 2;

export function advanceOrbitalMarker(angle: number, diskSeconds: number) {
  return (angle - (diskSeconds * markerBand.velocity) % fullTurn + fullTurn) % fullTurn;
}

export function orbitalMarkerStart(center: OrbitalPoint, target: OrbitalPoint, activation: number) {
  const dx = target.x - center.x, dy = target.y - center.y;
  const localX = dx * cosine + dy * sine;
  const localY = (-dx * sine + dy * cosine) / flattening;
  return Math.atan2(localY, localX) + Math.sin(activation * 2.399963) * .105;
}

/** Follow the same band, tilt and foreshortening as the canvas filaments. */
export function orbitalConnection(center: OrbitalPoint, target: OrbitalPoint, width: number, activation: number, angle = orbitalMarkerStart(center, target, activation)) {
  const radius = width * .481 * attachmentRadius;
  const depth = Math.sin(angle);
  const x = Math.cos(angle) * radius, y = depth * radius * flattening;
  const origin = {x: center.x + x * cosine - y * sine, y: center.y + x * sine + y * cosine};
  const variation = Math.sin(activation * 2.399963);
  const vx = target.x - origin.x, vy = target.y - origin.y;
  const distance = Math.hypot(vx, vy);
  const bend = Math.min(30, distance * .20) * variation;
  const clampX = (value: number) => Math.max(Math.min(origin.x, target.x), Math.min(Math.max(origin.x, target.x), value));
  const padding = Math.min(18, distance * .14);
  // Compact destinations sit below the disk. Keep the curve above their cards.
  const bottom = target.y - center.y > width * .48 ? target.y : Math.max(origin.y, target.y) + padding;
  const clampY = (value: number) => Math.max(Math.min(origin.y, target.y) - padding, Math.min(bottom, value));
  const perpendicularX = distance ? -vy / distance * bend : 0;
  const perpendicularY = distance ? vx / distance * bend : 0;
  const first = {x: clampX(origin.x + vx * .32 + perpendicularX), y: clampY(origin.y + vy * .22 + perpendicularY)};
  const second = {x: clampX(origin.x + vx * .76 - perpendicularX * .6), y: clampY(origin.y + vy * .72 - perpendicularY * .6)};
  return {
    origin,
    depth,
    path: `M ${origin.x} ${origin.y} C ${first.x} ${first.y} ${second.x} ${second.y} ${target.x} ${target.y}`,
  };
}
