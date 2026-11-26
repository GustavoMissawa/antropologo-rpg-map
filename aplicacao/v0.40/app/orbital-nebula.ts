import {readOrbitalColors} from '../lib/appearance-colors';
import type {NebulaComposition} from '../lib/nebula-composition';
import {
  COMPACT_NEBULA_WIDTH, createNebulaMaterial, paintNebula, WIDE_NEBULA_WIDTH, type NebulaMaterial,
} from '../lib/nebula-material';

let cachedSeed: number | undefined;
const materials = new Map<number, NebulaMaterial>();

/** Render at most two resolutions for this document and recolor the same material. */
export function mountOrbitalNebula(canvas: HTMLCanvasElement, composition: NebulaComposition) {
  if (typeof CanvasRenderingContext2D === 'undefined') return;
  if (cachedSeed !== composition.seed) {
    materials.clear();
    cachedSeed = composition.seed;
  }

  const root = document.documentElement;
  const compact = matchMedia('(max-width: 740px)');
  const contrast = matchMedia('(forced-colors: active)');
  let pending: {width: number; stop: () => void} | undefined;
  let painted = '';
  let frame = 0;

  function prepare(width: number) {
    let worker: Worker | undefined;
    let idle = 0;
    let timer = 0;
    const stop = () => {
      if (worker) {
        worker.onmessage = worker.onerror = worker.onmessageerror = null;
        worker.terminate();
        worker = undefined;
      }
      if (idle) cancelIdleCallback(idle);
      if (timer) window.clearTimeout(timer);
      idle = timer = 0;
    };
    const job = {width, stop};
    pending = job;
    const finish = (material: NebulaMaterial) => {
      if (pending !== job) return;
      stop();
      pending = undefined;
      materials.set(width, material);
      refresh();
    };
    const fallback = () => {
      if (pending !== job) return;
      stop();
      const draw = () => {
        if (pending === job) finish(createNebulaMaterial(composition, width));
      };
      if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(draw, {timeout: 250});
      else timer = window.setTimeout(draw, 0);
    };
    if (typeof Worker === 'undefined') {
      fallback();
      return;
    }
    try {
      worker = new Worker(new URL('./orbital-nebula.worker.ts', import.meta.url), {type: 'module'});
      worker.onmessage = (event: MessageEvent<NebulaMaterial>) => finish(event.data);
      worker.onerror = event => {
        event.preventDefault();
        fallback();
      };
      worker.onmessageerror = fallback;
      worker.postMessage({composition, width});
    } catch {
      fallback();
    }
  }

  function refresh() {
    if (root.dataset.nebulae === 'false' || contrast.matches) {
      pending?.stop();
      pending = undefined;
      return;
    }
    const width = compact.matches ? COMPACT_NEBULA_WIDTH : WIDE_NEBULA_WIDTH;
    if (pending && pending.width !== width) {
      pending.stop();
      pending = undefined;
    }
    const material = materials.get(width);
    if (!material) {
      if (!pending) prepare(width);
      return;
    }
    const colors = readOrbitalColors(root);
    const mode = root.dataset.mode === 'dark' ? 'dark' : 'light';
    const key = `${width}/${mode}/${colors.primary}/${colors.secondary}`;
    if (painted !== key && paintNebula(canvas, material, colors, mode)) {
      painted = key;
      canvas.dataset.ready = 'true';
    }
  }

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      refresh();
    });
  };
  const observer = new MutationObserver(schedule);
  observer.observe(root, {attributeFilter: ['data-mode', 'data-orbit-primary', 'data-orbit-secondary', 'data-nebulae']});
  compact.addEventListener('change', schedule);
  contrast.addEventListener('change', schedule);
  schedule();
  return () => {
    pending?.stop();
    pending = undefined;
    cancelAnimationFrame(frame);
    observer.disconnect();
    compact.removeEventListener('change', schedule);
    contrast.removeEventListener('change', schedule);
  };
}
