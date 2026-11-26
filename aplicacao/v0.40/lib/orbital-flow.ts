const TAU = Math.PI * 2;
const firstRadius = .245;
const bandWidth = .071;
const feather = .022;
const bands = Array.from({length: 11}, (_, index) => {
  const inner = firstRadius + index * bandWidth;
  const outer = inner + bandWidth;
  const radius = (inner + outer) / 2;
  return {inner, outer, radius, velocity: .62 * Math.pow(.3 / radius, 1.35)};
});
export const EXPANDED_ORBITAL_SPEED = .18;
export const ORBITAL_DISK_SCALE = .481;
export const ORBITAL_DISK_TILT_DEGREES = 37;

export type OrbitalFlowClock = {seconds: number; speed: number};

/** Integrate an interruptible speed envelope without losing orbital phase. */
export function advanceOrbitalFlow(clock: OrbitalFlowClock, seconds: number, target: number) {
  const decay = Math.exp(-seconds / .18);
  clock.seconds += target * seconds + (clock.speed - target) * .18 * (1 - decay);
  const speed = target + (clock.speed - target) * decay;
  clock.speed = Math.abs(speed - target) < .004 ? target : speed;
}

/** Radii use the same unit disk as the procedural filament textures. */
export function orbitalFlowBand(index: number) {
  return bands[index];
}

export function orbitalFlowAngle(index: number, seconds: number) {
  return ((-seconds * bands[index].velocity) % TAU + TAU) % TAU;
}

export function orbitalFlowPose(index: number, seconds: number) {
  return {
    angle: orbitalFlowAngle(index, seconds),
    intensity: .96 + .04 * Math.sin(seconds * .53 + index * 1.71),
  };
}

/** Reuse the prepared filaments and their dust, with feathered radial shear. */
export function prepareOrbitalFlow(
  stream: HTMLCanvasElement,
  dust: HTMLCanvasElement,
  output: HTMLCanvasElement,
) {
  const context = output.getContext('2d');
  if (!context) return null;
  output.width = output.height = Math.min(stream.width, 768);
  const sourceRadius = stream.width * ORBITAL_DISK_SCALE;
  const radius = output.width * ORBITAL_DISK_SCALE;
  const textures: HTMLCanvasElement[] = [];

  for (const {inner, outer} of bands) {
    const extent = (outer + feather) * radius;
    const texture = document.createElement('canvas');
    texture.width = texture.height = Math.ceil(extent * 2);
    const layer = texture.getContext('2d');
    if (!layer) {
      texture.width = texture.height = 0;
      for (const allocated of textures) allocated.width = allocated.height = 0;
      return null;
    }
    const sourceExtent = (outer + feather) * sourceRadius;
    const origin = stream.width / 2 - sourceExtent;
    const sourceSize = sourceExtent * 2;
    layer.drawImage(stream, origin, origin, sourceSize, sourceSize, 0, 0, texture.width, texture.height);
    layer.globalAlpha = .72;
    layer.drawImage(dust, origin, origin, sourceSize, sourceSize, 0, 0, texture.width, texture.height);
    layer.globalAlpha = 1;
    layer.globalCompositeOperation = 'destination-in';
    const half = texture.width / 2;
    const mask = layer.createRadialGradient(half, half, 0, half, half, half);
    const edge = outer + feather;
    for (const [stop, color] of [
      [0, 'transparent'], [(inner - feather) / edge, 'transparent'],
      [(inner + feather) / edge, '#fff'], [(outer - feather) / edge, '#fff'], [1, 'transparent'],
    ] as const) mask.addColorStop(stop, color);
    layer.fillStyle = mask;
    layer.fillRect(0, 0, texture.width, texture.height);
    textures.push(texture);
  }

  function paint(seconds: number, compression = 0) {
    if (!context) return;
    context.clearRect(0, 0, output.width, output.height);
    context.save();
    context.translate(output.width / 2, output.height / 2);
    for (let i = 0; i < textures.length; i++) {
      const {angle, intensity} = orbitalFlowPose(i, seconds);
      const texture = textures[i];
      context.save();
      context.rotate(angle);
      // The anchor stars live in bands 6 and 7. Keep their projection exact.
      if (compression > 0 && i < 5) {
        const scale = 1 - compression * (1 - i / 5);
        context.scale(scale, scale);
      }
      context.globalAlpha = intensity;
      context.drawImage(texture, -texture.width / 2, -texture.height / 2);
      context.restore();
    }
    context.restore();
  }

  function dispose() {
    for (const texture of textures) texture.width = texture.height = 0;
  }

  return {paint, dispose};
}
