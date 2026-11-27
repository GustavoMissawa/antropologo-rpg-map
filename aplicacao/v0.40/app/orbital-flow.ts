import {advanceOrbitalFlow, EXPANDED_ORBITAL_SPEED, prepareOrbitalFlow, type OrbitalFlowClock} from '../lib/orbital-flow.ts';
import {sampleOrbitalCritical, type OrbitalCriticalEvent, type OrbitalCriticalFrame} from '../lib/orbital-critical.ts';

type CriticalFlow = {
  event: {current: OrbitalCriticalEvent | null};
  paint: (sample: OrbitalCriticalFrame | null) => void;
};

export function startOrbitalFlow(
  art: HTMLDivElement,
  stream: HTMLCanvasElement,
  dust: HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  clock: OrbitalFlowClock,
  onFrame?: (seconds: number) => void,
  critical?: CriticalFlow,
) {
  const flow = art.dataset.painted === 'false' ? null : prepareOrbitalFlow(stream, dust, canvas);
  if (!flow && !onFrame && !critical) return () => {};
  const compact = matchMedia('(max-width: 740px)');
  let frame = 0;
  let previous = 0;
  let impulse = 0;

  const baseSpeed = () => art.dataset.diskCruising === 'true' ? EXPANDED_ORBITAL_SPEED * (art.dataset.diskBoost === 'true' ? 2 : 1)
    : art.dataset.diskSelected === 'true' ? 0 : 1;
  const targetSpeed = () => baseSpeed() + impulse;
  const running = () => art.dataset.motion === 'running' && !art.dataset.flightPaused && !document.hidden;

  function paintCritical(sample: OrbitalCriticalFrame | null) {
    if (!critical) return;
    if (sample) {
      if (art.dataset.cosmicPhase !== sample.phase) art.dataset.cosmicPhase = sample.phase;
    } else if (art.dataset.cosmicPhase && art.dataset.cosmicPhase !== 'still') {
      delete art.dataset.cosmicPhase;
    }
    critical.paint(sample);
  }

  function status() {
    const target = targetSpeed();
    const next = !running() ? 'paused'
      : clock.speed > target ? 'stopping'
      : clock.speed < target ? 'resuming'
      : target === 0 ? 'stopped' : target === 1 ? 'orbiting' : 'cruising';
    if (art.dataset.diskMotion !== next) art.dataset.diskMotion = next;
  }

  function schedule() {
    if (!frame && running() && (critical?.event.current || targetSpeed() > 0 || clock.speed > 0)) {
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now: number) {
    frame = 0;
    if (!running()) return;
    if (!previous) previous = now;
    const delta = now - previous;
    if (delta >= (compact.matches ? 32 : 15)) {
      const event = critical?.event.current;
      const sample = event ? sampleOrbitalCritical(event, now) : null;
      if (critical && event && !sample) critical.event.current = null;
      impulse = sample?.spin ?? 0;
      advanceOrbitalFlow(clock, Math.min(delta, 60) / 1000, targetSpeed());
      previous = now;
      flow?.paint(clock.seconds, sample?.compression);
      paintCritical(sample);
      onFrame?.(clock.seconds);
    }
    status();
    if (!critical?.event.current && targetSpeed() === 0 && clock.speed === 0) previous = 0;
    schedule();
  }

  function update() {
    if (running()) {
      schedule();
    } else {
      cancelAnimationFrame(frame);
      frame = previous = 0;
      impulse = 0;
      paintCritical(null);
    }
    status();
  }

  flow?.paint(clock.seconds);
  onFrame?.(clock.seconds);
  if (flow) art.dataset.flowReady = 'true';
  const observer = new MutationObserver(update);
  observer.observe(art, {attributeFilter: ['data-motion', 'data-disk-selected', 'data-disk-cruising', 'data-disk-boost', 'data-cosmic-phase', 'data-flight-paused']});
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
