'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { OrbitalDestination } from '../lib/orbital-navigation';
import { orbitalSeed, smoothUnit } from '../lib/orbital-noise';
import type { PlatformRoute } from '../lib/platform-navigation';
import { systemApproachAt, systemApproachDuration, type SystemApproach } from '../lib/system-approach';
import { flightStars } from './orbital-flight-stars';

type Departure = {
  approach: SystemApproach;
  destination?: OrbitalDestination;
  bounds: {left: number; top: number; width: number; height: number};
  disk: DOMRect;
  scrollY: number;
  reduced: boolean;
};

type Visual = HTMLElement | SVGElement;
const beforeApproach = '.orbital-navigation,.orbital-workspace,.orbital-destination-panel,.orbital-rail,.orbital-connection,.orbital-d20,.test-notice';
const afterApproach = '.ruleset-reader-top,.rules-layout > .rule-index,.orbital-system-caption,.ruleset-draft-note';
const translate = (x: number, y: number) => `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;

function originalTransform(element: Visual) {
  const value = getComputedStyle(element).transform;
  return value === 'none' ? '' : value;
}

export function useSystemApproach(orbital: boolean) {
  const homeLayer = useRef<HTMLDivElement>(null);
  const flightLayer = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const systemApproach = useRef<SystemApproach | null>(null);
  const finishRef = useRef<(() => void) | null>(null);
  const [departure,setDeparture] = useState<Departure | null>(null);

  const trackApproach = useCallback((from: PlatformRoute, to: PlatformRoute, travel: boolean) => {
    const source = homeLayer.current;
    const art = source?.querySelector('.orbital-art');
    if (!travel || from.page !== 'home' || to.page !== 'rules' || to.bookId === undefined ||
        to.topicId !== undefined || !source?.animate || !art || document.hidden) {
      systemApproach.current = null;
      setDeparture(null);
      return;
    }
    const {left, top, width, height} = source.getBoundingClientRect();
    if (!width || !height) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)').matches;
    const approach: SystemApproach = {bookId: to.bookId, active: true, frame: systemApproachAt(0, reduced)};
    systemApproach.current = approach;
    setDeparture({approach, destination: from.destination, bounds: {left, top, width, height},
      disk: art.getBoundingClientRect(), scrollY: window.scrollY, reduced});
  }, []);

  useLayoutEffect(() => {
    if (orbital || !departure) return;
    systemApproach.current = null;
    setDeparture(null);
  }, [orbital, departure]);

  useLayoutEffect(() => {
    const home = homeLayer.current;
    const layer = flightLayer.current;
    if (!orbital || !departure || !home || !layer) return;
    const {approach, reduced, disk} = departure;
    const width = layer.clientWidth;
    const height = layer.clientHeight;
    const compact = width < 790;
    const duration = systemApproachDuration(compact, reduced);
    const sky = layer.querySelector<HTMLElement>('.orbital-flight-sky')!;
    const haze = layer.querySelector<HTMLElement>('.orbital-flight-haze');
    const canvas = layer.querySelector<HTMLCanvasElement>('canvas.orbital-flight-stars');
    const art = home.querySelector<HTMLElement>('.orbital-art')!;
    const destination = layer.parentElement?.querySelector<HTMLElement>('.rules-orbital');
    const incoming = [...(destination?.querySelectorAll<HTMLElement>(afterApproach) ?? [])];
    const focusTarget = destination?.querySelector<HTMLElement>('.orbital-system-caption h2');
    const skip = skipRef.current;
    const motion = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)');
    const drawStars = canvas && width && height ?
      flightStars(canvas, orbitalSeed(Number(art.dataset.diskSeed) || 1), width, height) : undefined;
    const origin = {
      x: Math.max(width * .18, Math.min(width * .78, disk.left + disk.width * .61)),
      y: Math.max(height * .25, Math.min(height * .75, disk.top + disk.height * .43)),
    };
    const sweep = Math.max(Math.min(width, height) * .78, disk.width * .98);
    const path = Array.from({length: 51}, (_, i) => ({
      offset: i / 50, frame: systemApproachAt(i / 50, reduced),
    }));
    const animations: Animation[] = [];
    function animate(element: Visual, keys: (frame: SystemApproach['frame']) => Keyframe) {
      const animation = element.animate(path.map(({offset, frame}) => ({offset, ...keys(frame)})), {duration, fill:'both'});
      animation.pause();
      animation.currentTime = 0;
      animations.push(animation);
    }
    animate(sky, frame => ({opacity: frame.departureSky}));
    incoming.forEach(element => animate(element, frame => ({opacity: frame.arrivalUi})));
    if (reduced) {
      animate(home, frame => ({opacity: frame.departureUi}));
    } else {
      const base = originalTransform(art);
      const sceneScale = disk.width / art.offsetWidth || 1;
      animate(art, frame => {
        const shift = frame.departureSweep / sceneScale;
        return {
          transform: `${translate(-sweep * shift, height * .26 * shift)} ${base} rotate(${-6 * frame.departureSweep}deg) scale(${frame.departureZoom})`,
          opacity: frame.departureDisk,
        };
      });
      home.querySelectorAll<Visual>(beforeApproach).forEach(element => {
        const opacity = Number(getComputedStyle(element).opacity);
        animate(element, frame => ({opacity: opacity * frame.departureUi}));
      });
      home.querySelectorAll<Visual>('.orbital-nebulae,.orbital-starfield').forEach((element, index) => {
        const transform = originalTransform(element);
        const opacity = Number(getComputedStyle(element).opacity);
        animate(element, frame => {
          const travel = frame.distance * (index + 1);
          return {
            transform: `${translate(-width * .082 * travel, height * .034 * travel)} ${transform} scale(${1 + .11 * travel})`,
            opacity: opacity * frame.departureSky,
          };
        });
      });
      if (haze) animate(haze, frame => ({
        transform: `${translate(width * (.10 - frame.distance * .25), height * frame.distance * .09)} scale(${1 + .28 * frame.distance})`,
        opacity: frame.particles * .72,
      }));
    }
    let id = 0;
    let elapsed = 0;
    let start = 0;
    let lastTime = 0;
    let lastPaint = 0;
    let slowFrames = 0;
    let simple = false;
    let diskPaused = false;

    function paint(progress: number, seconds: number) {
      const frame = systemApproachAt(progress, reduced);
      approach.frame = frame;
      const aim = approach.paintSystem?.(seconds) ?? origin;
      if (!reduced && !diskPaused && progress >= .15) {
        art.dataset.flightPaused = 'true';
        diskPaused = true;
      }
      const turn = smoothUnit((progress - .17) / .30);
      drawStars?.(frame, {x: origin.x + (aim.x - origin.x) * turn, y: origin.y + (aim.y - origin.y) * turn}, simple);
    }

    const finish = () => {
      if (!approach.active) return;
      if (id) cancelAnimationFrame(id);
      paint(1, 0);
      animations.forEach(animation => animation.finish());
      approach.active = false;
      approach.resumeSystem?.();
      systemApproach.current = null;
      setDeparture(current => current === departure ? null : current);
      if (focusTarget && (document.activeElement === skip || document.activeElement === document.body)) {
        requestAnimationFrame(() => {
          if (focusTarget.isConnected && !document.querySelector('dialog[open]') && document.activeElement === document.body) {
            focusTarget.focus({preventScroll: true});
          }
        });
      }
    };
    function tick(now: number) {
      id = 0;
      if (document.hidden || !approach.active) return;
      const delta = lastTime ? Math.max(0, now - lastTime) : 0;
      lastTime = now;
      elapsed = Math.max(0, now - start);
      slowFrames = delta > 38 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      simple ||= slowFrames >= 5;
      if (elapsed >= duration) {
        finish();
        return;
      }
      const paintDelta = elapsed - lastPaint;
      if (paintDelta >= (simple ? 31 : 14)) {
        paint(elapsed / duration, Math.min(paintDelta, 68) / 1000);
        lastPaint = elapsed;
      }
      id = requestAnimationFrame(tick);
    }
    const syncVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(id);
        id = 0;
        lastTime = 0;
        animations.forEach(animation => {
          animation.pause();
          animation.currentTime = elapsed;
        });
      } else if (!id && approach.active) {
        start = Number(document.timeline?.currentTime ?? performance.now()) - elapsed;
        animations.forEach(animation => {
          animation.play();
          animation.startTime = start;
        });
        id = requestAnimationFrame(tick);
      }
    };
    const syncMotion = () => { if (motion.matches && !reduced) finish(); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        finish();
      }
    };
    // On extremely short viewports or with lengthy book descriptions, land where the star can be seen.
    const viewport = destination?.querySelector('.orbital-system-viewport')?.getBoundingClientRect();
    if (!reduced && height && viewport && viewport.top + viewport.height * .55 > height - 36) {
      window.scrollBy({top: viewport.top + viewport.height * .55 - height * .70, behavior: 'instant'});
    }
    if (!reduced) skip?.focus({preventScroll: true});
    paint(0, 0);
    finishRef.current = finish;
    document.addEventListener('keydown', keyboard);
    document.addEventListener('visibilitychange', syncVisibility);
    motion.addEventListener('change', syncMotion);
    const stopOnResize = () => {
      if (Math.abs(layer.clientWidth - width) > 2 || Math.abs(layer.clientHeight - height) > 80) finish();
    };
    window.addEventListener('resize', stopOnResize, {passive: true});
    syncVisibility();
    return () => {
      approach.active = false;
      finishRef.current = null;
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', keyboard);
      document.removeEventListener('visibilitychange', syncVisibility);
      motion.removeEventListener('change', syncMotion);
      window.removeEventListener('resize', stopOnResize);
      delete art.dataset.flightPaused;
      animations.forEach(animation => animation.cancel());
    };
  }, [orbital, departure]);

  const skipApproach = useCallback(() => finishRef.current?.(), []);
  return {homeLayer, flightLayer, skipRef, systemApproach, departure: orbital ? departure : null, trackApproach, skipApproach};
}
