import {advanceOrbitalFlow, EXPANDED_ORBITAL_SPEED, prepareOrbitalFlow, type OrbitalFlowClock} from '../lib/orbital-flow.ts';

export function startOrbitalFlow(
  art: HTMLDivElement,
  stream: HTMLCanvasElement,
  dust: HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  clock: OrbitalFlowClock,
  onFrame?: (seconds: number) => void,
) {
  const flow = art.dataset.painted === 'false' ? null : prepareOrbitalFlow(stream, dust, canvas);
  if (!flow && !onFrame) return () => {};
  const compact = matchMedia('(max-width: 740px)');
  let frame = 0;
  let previous = 0;

  const targetSpeed = () => art.dataset.diskCruising === 'true' ? EXPANDED_ORBITAL_SPEED * (art.dataset.diskBoost === 'true' ? 2 : 1)
    : art.dataset.diskSelected === 'true' ? 0 : 1;
  const running = () => art.dataset.motion === 'running' && !document.hidden;

  function status() {
    const target = targetSpeed();
    const next = !running() ? 'paused'
      : clock.speed > target ? 'stopping'
      : clock.speed < target ? 'resuming'
      : target === 0 ? 'stopped' : target === 1 ? 'orbiting' : 'cruising';
    if (art.dataset.diskMotion !== next) art.dataset.diskMotion = next;
  }

  function schedule() {
    if (!frame && running() && (targetSpeed() > 0 || clock.speed > 0)) frame = requestAnimationFrame(tick);
  }

  function tick(now: number) {
    frame = 0;
    if (!running()) return;
    if (!previous) previous = now;
    const delta = now - previous;
    if (delta >= (compact.matches ? 32 : 15)) {
      advanceOrbitalFlow(clock, Math.min(delta, 60) / 1000, targetSpeed());
      previous = now;
      flow?.paint(clock.seconds);
      onFrame?.(clock.seconds);
    }
    status();
    if (targetSpeed() === 0 && clock.speed === 0) previous = 0;
    schedule();
  }

  function update() {
    if (running()) {
      schedule();
    } else {
      cancelAnimationFrame(frame);
      frame = previous = 0;
    }
    status();
  }

  flow?.paint(clock.seconds);
  onFrame?.(clock.seconds);
  if (flow) art.dataset.flowReady = 'true';
  const observer = new MutationObserver(update);
  observer.observe(art, {attributeFilter: ['data-motion', 'data-disk-selected', 'data-disk-cruising', 'data-disk-boost']});
  document.addEventListener('visibilitychange', update);
  update();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', update);
    flow?.dispose();
    delete art.dataset.flowReady;
    delete art.dataset.diskMotion;
  };
}
