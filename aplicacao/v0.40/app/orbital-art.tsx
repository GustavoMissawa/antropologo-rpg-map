'use client';

import {useEffect, useId, useRef, type CSSProperties} from 'react';
import {originalOrbitalColors, parseHexColor} from '../lib/appearance-colors';
import {paintOrbitalBitmaps, paintOrbitalLight, type OrbitalBitmaps, type OrbitalLightRequest} from '../lib/orbital-light';

import {startOrbitalFlow} from './orbital-flow';
import {initialOrbitalFrame, useOrbitalDie} from './use-orbital-die';

function presentBitmap(canvas: HTMLCanvasElement, bitmap: ImageBitmap) {
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
    if (typeof window.CanvasRenderingContext2D === 'undefined') {
      onPaint(false);
      return;
    }
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

export function OrbitalArt({slowDie, cruising, activation, onDiskFrame, boostDisk, onDiskReturn}: {
  slowDie: boolean;
  cruising: boolean;
  activation: number;
  onDiskFrame: (seconds: number) => void;
  boostDisk: boolean;
  onDiskReturn?: () => void;
}) {
  const art = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLCanvasElement>(null);
  const dust = useRef<HTMLCanvasElement>(null);
  const flow = useRef<HTMLCanvasElement>(null);
  const diskPress = useRef<{x: number; y: number} | null>(null);
  const {die, control, result, announcement} = useOrbitalDie(art, slowDie, activation);
  const vertexEffectId = useId();

  useEffect(() => {
    const element = art.current;
    const lightCanvas = stream.current;
    const dustCanvas = dust.current;
    const flowCanvas = flow.current;
    if (!element || !lightCanvas || !dustCanvas || !flowCanvas) return;

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
    const clock = {seconds: 0, speed: 1};
    let cancelFlow: (() => void) | undefined;
    const onPaint = (painted: boolean) => {
      cancelFlow?.();
      element.dataset.painted = String(painted);
      cancelFlow = startOrbitalFlow(element, lightCanvas, dustCanvas, flowCanvas, clock, onDiskFrame);
    };
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
      cancelFlow?.();
    };
  }, [onDiskFrame]);

  return (
    <div className="orbital-art" ref={art} data-motion="paused" data-disk-selected={slowDie} data-disk-cruising={cruising} data-disk-boost={boostDisk} data-transforming="false">
      <div className="orbital-disk-fallback" aria-hidden="true" />
      <div className="orbital-plane" aria-hidden="true">
        <canvas ref={dust} className="orbital-dust" />
        <canvas ref={stream} className="orbital-stream" />
        <canvas ref={flow} className="orbital-flow" />
      </div>
      {onDiskReturn && <button className="orbital-disk-return" type="button" aria-label="Voltar à Home Orbital"
        onPointerDown={event => {diskPress.current = {x: event.clientX, y: event.clientY};}}
        onPointerCancel={() => {diskPress.current = null;}}
        onClick={event => {
          const press = diskPress.current;
          diskPress.current = null;
          if (event.detail === 0 || !press || Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 8) onDiskReturn();
        }} />}
      <svg ref={die} className="orbital-d20" data-die="20" data-roll-phase="idle" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        {initialOrbitalFrame.faces.map(({visible, points, light}, i) => (
          <polygon
            key={i}
            points={points}
            visibility={visible ? 'visible' : 'hidden'}
            style={{'--orbital-face-light': light} as CSSProperties}
          />
        ))}
        <path className="orbital-d20-edges" d={initialOrbitalFrame.edges} />
        <defs>
          <clipPath id={`${vertexEffectId}-silhouette`}>
            <path className="orbital-vertex-clip" />
          </clipPath>
          <radialGradient id={`${vertexEffectId}-glow`} className="orbital-vertex-gradient">
            <stop offset="0" stopOpacity=".92" />
            <stop offset=".34" stopOpacity=".42" />
            <stop offset="1" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g clipPath={`url(#${vertexEffectId}-silhouette)`}>
          <circle className="orbital-vertex-glow" r="7" visibility="hidden" fill={`url(#${vertexEffectId}-glow)`} />
        </g>
        <g className="orbital-critical">
          <g className="orbital-critical-primary" />
          <g className="orbital-critical-secondary" />
          <text className="orbital-critical-number orbital-critical-primary" textAnchor="middle" dominantBaseline="central" />
          <text className="orbital-critical-number orbital-critical-secondary" textAnchor="middle" dominantBaseline="central" />
        </g>
        <text ref={result} className="orbital-die-result" textAnchor="middle" dominantBaseline="central" />
      </svg>
      <button ref={control} className="orbital-d20-control" type="button" aria-label="Rolar dado D20" aria-description="Clique, pressione Enter ou arraste por 1 segundo com o dedo para rolar. As setas giram o dado." />
      <div ref={announcement} className="orbital-visually-hidden" role="status" />
    </div>
  );
}
