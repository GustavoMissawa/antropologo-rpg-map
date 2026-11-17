import {prepareOrbitalFlow} from '../lib/orbital-flow.ts';

export function startOrbitalFlow(
  art: HTMLDivElement,
  stream: HTMLCanvasElement,
  dust: HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  clock: {seconds: number},
) {
  const flow = prepareOrbitalFlow(stream, dust, canvas);
  if (!flow) return () => {};
  const compact = matchMedia('(max-width: 740px)');
  let frame = 0;
  let previous = 0;

  function tick(now: number) {
    frame = 0;
    if (art.dataset.motion !== 'running' || document.hidden) return;
    if (!previous) previous = now;
    const delta = now - previous;
    if (delta >= (compact.matches ? 32 : 15)) {
      clock.seconds += Math.min(delta, 60) / 1000;
      previous = now;
      flow?.paint(clock.seconds);
    }
    frame = requestAnimationFrame(tick);
  }

  function update() {
    if (art.dataset.motion === 'running' && !document.hidden) {
      if (!frame) frame = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(frame);
      frame = previous = 0;
    }
  }

  flow.paint(clock.seconds);
  art.dataset.flowReady = 'true';
  const observer = new MutationObserver(update);
  observer.observe(art, {attributeFilter: ['data-motion']});
  document.addEventListener('visibilitychange', update);
  update();

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', update);
    flow.dispose();
    delete art.dataset.flowReady;
  };
}
