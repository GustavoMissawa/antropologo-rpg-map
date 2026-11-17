'use client';

import {useEffect, useLayoutEffect, useRef, type CSSProperties} from 'react';
import {originalOrbitalColors, parseHexColor} from '../lib/appearance-colors';
import {orbitalDieFrame, type Point3} from '../lib/hero-die-geometry';
import {advanceOrbitalRotation} from '../lib/orbital-rotation';
import {paintOrbitalBitmaps, paintOrbitalLight, type OrbitalBitmaps, type OrbitalLightRequest} from '../lib/orbital-light';

const INITIAL_ANGLES: Point3 = [0.51, 0.68, 0.26];
const initial = orbitalDieFrame(INITIAL_ANGLES);

function presentBitmap(canvas: HTMLCanvasElement, bitmap: ImageBitmap) {
  const renderer = canvas.getContext('bitmaprenderer');
  if (renderer) {
    renderer.transferFromImageBitmap(bitmap);
    return true;
  }
  const context = canvas.getContext('2d');
  context?.drawImage(bitmap, 0, 0);
  return !!context;
}

function renderTextures(
  light: HTMLCanvasElement,
  dust: HTMLCanvasElement,
  request: OrbitalLightRequest,
  useWorker: boolean,
  onPaint: (painted: boolean) => void,
) {
  const {size, colors, mode} = request;
  let worker: Worker | undefined;
  let frame = 0;

  function stopWorker() {
    if (!worker) return;
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
    worker = undefined;
  }

  function setSize() {
    light.width = light.height = size;
    dust.width = dust.height = size;
  }

  function showBitmaps(bitmaps: OrbitalBitmaps) {
    try {
      const lit = presentBitmap(light, bitmaps[0]);
      const dusted = presentBitmap(dust, bitmaps[1]);
      onPaint(lit && dusted);
    } finally {
      bitmaps[0].close();
      bitmaps[1].close();
    }
  }

  function drawOnMainThread() {
    stopWorker();
    if (typeof window.CanvasRenderingContext2D === 'undefined') return;
    frame = requestAnimationFrame(() => {
      setSize();
      if (paintOrbitalLight(light, dust, colors, mode)) {
        onPaint(true);
        return;
      }
      // A canvas that already presents bitmaps keeps that context after resizing.
      const usesBitmaps = light.getContext('bitmaprenderer');
      const bitmaps = usesBitmaps && typeof OffscreenCanvas !== 'undefined' ? paintOrbitalBitmaps(request) : null;
      if (bitmaps) showBitmaps(bitmaps);
      else onPaint(false);
    });
  }

  if (useWorker && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    try {
      worker = new Worker(new URL('./orbital-light.worker.ts', import.meta.url), {type: 'module'});
      worker.onerror = event => {
        event.preventDefault();
        drawOnMainThread();
      };
      worker.onmessageerror = drawOnMainThread;
      worker.onmessage = ({data: bitmaps}: MessageEvent<OrbitalBitmaps | null>) => {
        stopWorker();
        if (!bitmaps) {
          drawOnMainThread();
          return;
        }
        setSize();
        showBitmaps(bitmaps);
      };
      worker.postMessage(request);
    } catch {
      drawOnMainThread();
    }
  } else {
    drawOnMainThread();
  }

  return () => {
    stopWorker();
    cancelAnimationFrame(frame);
  };
}

export function OrbitalArt({slowDie}: {slowDie: boolean}) {
  const art = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLCanvasElement>(null);
  const dust = useRef<HTMLCanvasElement>(null);
  const die = useRef<SVGSVGElement>(null);
  const dieEdges = useRef<SVGPathElement>(null);
  const slow = useRef(slowDie);

  useLayoutEffect(() => {
    slow.current = slowDie;
  }, [slowDie]);

  useEffect(() => {
    const element = art.current;
    const lightCanvas = stream.current;
    const dustCanvas = dust.current;
    if (!element || !lightCanvas || !dustCanvas) return;

    const compact = matchMedia('(max-width: 740px)');
    const root = document.documentElement;
    const readRequest = (): OrbitalLightRequest => ({
      size: compact.matches ? 640 : 1024,
      mode: root.dataset.mode === 'dark' ? 'dark' : 'light',
      colors: {
        primary: parseHexColor(root.dataset.orbitPrimary) ?? originalOrbitalColors.primary,
        secondary: parseHexColor(root.dataset.orbitSecondary) ?? originalOrbitalColors.secondary,
      },
    });
    const onPaint = (painted: boolean) => { element.dataset.painted = String(painted); };
    let current = readRequest();
    let cancelTextures = renderTextures(lightCanvas, dustCanvas, current, compact.matches, onPaint);
    let updateFrame = 0;

    const scheduleTextures = () => {
      if (updateFrame) return;
      updateFrame = requestAnimationFrame(() => {
        updateFrame = 0;
        const next = readRequest();
        if (current.size === next.size && current.mode === next.mode && current.colors.primary === next.colors.primary
          && current.colors.secondary === next.colors.secondary) return;
        cancelTextures();
        current = next;
        cancelTextures = renderTextures(lightCanvas, dustCanvas, next, true, onPaint);
      });
    };

    const observer = new MutationObserver(scheduleTextures);
    observer.observe(root, {attributeFilter: ['data-mode', 'data-orbit-primary', 'data-orbit-secondary']});
    compact.addEventListener('change', scheduleTextures);
    return () => {
      observer.disconnect();
      compact.removeEventListener('change', scheduleTextures);
      cancelAnimationFrame(updateFrame);
      cancelTextures();
    };
  }, []);

  useEffect(() => {
    const element = art.current;
    const dieSvg = die.current;
    const edges = dieEdges.current;
    if (!element || !dieSvg || !edges) return;

    const faces = dieSvg.querySelectorAll('polygon');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width: 740px)');
    let visible = true;
    let frame = 0;
    let previous = 0;
    let rotation = {phase: 0, speed: 1};

    function paintDie(time: number) {
      const next = orbitalDieFrame([
        INITIAL_ANGLES[0] + Math.sin(time * 0.42) * 0.47,
        INITIAL_ANGLES[1] + time * 0.57,
        INITIAL_ANGLES[2] + time * 0.21,
      ]);
      for (let i = 0; i < faces.length; i++) {
        const face = faces[i];
        const {visible, points, light} = next.faces[i];
        const visibility = visible ? 'visible' : 'hidden';
        if (visible) {
          face.setAttribute('points', points);
          face.style.setProperty('--orbital-face-light', light);
        }
        if (face.getAttribute('visibility') !== visibility) face.setAttribute('visibility', visibility);
      }
      edges?.setAttribute('d', next.edges);
    }

    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
    }

    function allowed() {
      return visible && !document.hidden && !reduced.matches;
    }

    function tick(now: number) {
      frame = 0;
      if (!allowed()) return;
      if (!previous) previous = now;
      const delta = now - previous;
      if (delta >= (compact.matches ? 32 : 15)) {
        rotation = advanceOrbitalRotation(rotation, Math.min(delta, 60) / 1000, slow.current);
        previous = now;
        paintDie(rotation.phase);
      }
      frame = requestAnimationFrame(tick);
    }

    function updateMotion() {
      if (!element) return;
      element.dataset.motion = allowed() ? 'running' : 'paused';
      if (allowed()) {
        if (!frame) frame = requestAnimationFrame(tick);
      } else {
        stop();
      }
    }

    const observer = typeof IntersectionObserver === 'undefined' ? null
      : new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        updateMotion();
      });
    observer?.observe(element);
    document.addEventListener('visibilitychange', updateMotion);
    reduced.addEventListener('change', updateMotion);
    updateMotion();

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updateMotion);
      reduced.removeEventListener('change', updateMotion);
    };
  }, []);

  return (
    <div className="orbital-art" ref={art} aria-hidden="true" data-motion="paused">
      <div className="orbital-disk-fallback" />
      <div className="orbital-plane">
        <canvas ref={dust} className="orbital-dust" />
        <canvas ref={stream} className="orbital-stream" />
      </div>
      <svg ref={die} className="orbital-d20" viewBox="0 0 200 200" focusable="false">
        {initial.faces.map(({visible, points, light}, i) => (
          <polygon
            key={i}
            points={points}
            visibility={visible ? 'visible' : 'hidden'}
            style={{'--orbital-face-light': light} as CSSProperties}
          />
        ))}
        <path ref={dieEdges} className="orbital-d20-edges" d={initial.edges} />
      </svg>
    </div>
  );
}
