import { orbitalRandom, smoothUnit } from '../lib/orbital-noise';
import type { SpacePoint } from '../lib/orbital-system';
import type { ApproachFrame } from '../lib/system-approach';

const depthRange = 6.8;
const nearPlane = .24;

export function flightStars(canvas: HTMLCanvasElement, seed: number, width: number, height: number) {
  const context = canvas.getContext('2d');
  if (!context) return;
  // CSS pixels suffice for motion. Cap the backing store on large displays.
  const resolution = Math.min(1, 1060 / width, 740 / height);
  canvas.width = Math.ceil(width * resolution);
  canvas.height = Math.ceil(height * resolution);
  context.scale(resolution, resolution);
  const random = orbitalRandom(seed);
  const compact = width < 790;
  const stars = Array.from({length: compact ? 105 : 180}, () => ({
    x: (random() - .5) * 5.4,
    y: (random() - .5) * 4.6,
    depth: random() * depthRange,
    brightness: .39 + random() ** 2 * .55,
    size: .61 + random() ** 3 * 1.12,
  }));
  const tint = getComputedStyle(canvas).color;
  context.fillStyle = tint;
  context.strokeStyle = tint;
  context.lineCap = 'round';
  let painted = false;

  return (frame: ApproachFrame, aim: SpacePoint, simple: boolean) => {
    if (painted) context.clearRect(0, 0, width, height);
    painted = frame.particles > 0;
    if (frame.particles <= 0) return;
    const count = simple ? Math.floor(stars.length * .52) : stars.length;
    const motion = frame.distance * 12;
    const tail = frame.speed * (compact ? .13 : .23);
    for (let i = 0; i < count; i++) {
      const star = stars[i];
      const depth = nearPlane + ((star.depth - motion) % depthRange + depthRange) % depthRange;
      const dx = star.x * width / depth;
      const dy = star.y * height / depth;
      const x = aim.x + dx;
      const y = aim.y + dy;
      if (x < -18 || x > width + 18 || y < -18 || y > height + 18) continue;
      const size = star.size * Math.min(2.1, .64 + .70 / depth);
      const depthFade = smoothUnit((depth - nearPlane) / .7) * smoothUnit((depthRange + nearPlane - depth) / 1.25);
      const alpha = star.brightness * depthFade * frame.particles;
      if (alpha < .02) continue;
      const trail = simple ? 0 : Math.min(tail / (depth + tail), (compact ? 13 : 24) / Math.max(1, Math.hypot(dx, dy)));
      if (trail > .004 && depth < 4.3) {
        context.globalAlpha = alpha * .66;
        context.lineWidth = size * .82;
        context.beginPath();
        context.moveTo(x - dx * trail, y - dy * trail);
        context.lineTo(x, y);
        context.stroke();
      }
      context.globalAlpha = alpha;
      context.fillRect(x - size / 2, y - size / 2, size, size);
    }
  };
}
