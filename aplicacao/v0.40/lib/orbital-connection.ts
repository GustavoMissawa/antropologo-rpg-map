export type OrbitalPoint = {x: number; y: number};

/** Project onto the same inclined plane used by .orbital-plane. */
export function orbitalConnection(center: OrbitalPoint, target: OrbitalPoint, width: number, activation: number) {
  const tilt = 37 * Math.PI / 180;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const dx = target.x - center.x, dy = target.y - center.y;
  const localX = dx * cos + dy * sin;
  const localY = (-dx * sin + dy * cos) / .74;
  const variation = Math.sin(activation * 2.399963);
  const angle = Math.atan2(localY, localX) + variation * .105;
  const radius = Math.min(width * .481 * (.78 + .025 * Math.cos(activation * 1.7)), Math.hypot(localX, localY) * .82);
  const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius * .74;
  const origin = {x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos};
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
    path: `M ${origin.x} ${origin.y} C ${first.x} ${first.y} ${second.x} ${second.y} ${target.x} ${target.y}`,
  };
}
