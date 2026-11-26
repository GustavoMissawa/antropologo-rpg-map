import {orbitalAngleDistance, type OrbitalAnchor} from './orbital-disk.ts';
import {ORBITAL_DISK_SCALE, orbitalFlowAngle} from './orbital-flow.ts';

export type OrbitalPoint = {x: number; y: number};

const tilt = 37 * Math.PI / 180;
const cosine = Math.cos(tilt);
const sine = Math.sin(tilt);
const flattening = .74;

export function orbitalAnchorAngle(anchor: OrbitalAnchor, seconds: number) {
  return anchor.angle + orbitalFlowAngle(anchor.band, seconds);
}

/** Select among painted stars on the destination side, with positive weight even in the dark. */
export function chooseOrbitalAnchor(
  anchors: readonly OrbitalAnchor[],
  center: OrbitalPoint,
  target: OrbitalPoint,
  width: number,
  seconds: number,
  random = Math.random,
) {
  const dx = target.x - center.x, dy = target.y - center.y;
  const targetX = dx * cosine + dy * sine;
  const targetY = -dx * sine + dy * cosine;
  const bearing = Math.atan2(targetY / flattening, targetX);
  const separation = Math.min(42, width * .09);
  const choices: {anchor: OrbitalAnchor; cumulative: number}[] = [];
  let nearest = anchors[0];
  let nearestAngle = Infinity;
  let total = 0;
  for (const anchor of anchors) {
    const angle = orbitalAnchorAngle(anchor, seconds);
    const radius = width * ORBITAL_DISK_SCALE * anchor.radius;
    // Leave room for the connection when a destination nearly touches an outer band.
    if ((targetX - Math.cos(angle) * radius) ** 2 + (targetY - Math.sin(angle) * radius * flattening) ** 2 < separation ** 2) continue;
    const offset = orbitalAngleDistance(bearing, angle);
    if (offset < nearestAngle) {
      nearest = anchor;
      nearestAngle = offset;
    }
    if (offset > Math.PI / 4) continue;
    total += .14 + .86 * anchor.density;
    choices.push({anchor, cumulative: total});
  }
  const draw = total * random();
  return choices.find(choice => draw < choice.cumulative)?.anchor ?? nearest;
}

/** The source follows the exact band and projection used to render its star. */
export function orbitalConnection(center: OrbitalPoint, target: OrbitalPoint, width: number, activation: number, anchor: OrbitalAnchor, seconds: number) {
  const angle = orbitalAnchorAngle(anchor, seconds);
  const radius = width * ORBITAL_DISK_SCALE * anchor.radius;
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
