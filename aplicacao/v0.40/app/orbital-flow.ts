import {advanceOrbitalFlow, prepareOrbitalFlow, type OrbitalFlowClock} from '../lib/orbital-flow.ts';

export function startOrbitalFlow(
  art: HTMLDivElement,
  stream: HTMLCanvasElement,
  dust: HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  clock: OrbitalFlowClock,
) {
  const flow = prepareOrbitalFlow(stream, dust, canvas);
  if (!flow) return () => {};
  const compact = matchMedia('(max-width: 740px)');
  let frame = 0;
  let previous = 0;

  const selected = () => art.dataset.diskSelected === 'true';
  const running = () => art.dataset.motion === 'running' && !document.hidden;

  function status() {
    const next = !running() ? 'paused' : selected()
      ? (clock.speed === 0 ? 'stopped' : 'stopping')
      : (clock.speed === 1 ? 'orbiting' : 'resuming');
    if (art.dataset.diskMotion !== next) art.dataset.diskMotion = next;
  }

  function schedule() {
    if (!frame && running() && (!selected() || clock.speed > 0)) frame = requestAnimationFrame(tick);
  }

  function tick(now: number) {
    frame = 0;
    if (!running()) return;
    if (!previous) previous = now;
    const delta = now - previous;
    if (delta >= (compact.matches ? 32 : 15)) {
      advanceOrbitalFlow(clock, Math.min(delta, 60) / 1000, selected());
      previous = now;
      flow?.paint(clock.seconds);
    }
    status();
    if (selected() && clock.speed === 0) previous = 0;
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

  flow.paint(clock.seconds);
  art.dataset.flowReady = 'true';
  const observer = new MutationObserver(update);
  observer.observe(art, {attributeFilter: ['data-motion', 'data-disk-selected']});
  document.addEventListener('visibilitychange', update);
  update();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', update);
    flow.dispose();
    delete art.dataset.flowReady;
    delete art.dataset.diskMotion;
  };
}
