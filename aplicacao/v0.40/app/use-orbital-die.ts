'use client';

import {useEffect, useLayoutEffect, useRef, type RefObject} from 'react';
import {projectOrbitalDie} from '../lib/hero-die-geometry';
import {orbitalDieMeshes, type OrbitalDieKind} from '../lib/orbital-die-geometry';
import {advanceOrbitalDieShift, beginOrbitalDieShift, type OrbitalDieShift} from '../lib/orbital-die-shift';
import {
  addOrbitalInput, advanceOrbitalDie, beginOrbitalInput, clearOrbitalInput,
  createOrbitalDie, endOrbitalInput, rotateOrbitalPoint, turnOrbitalDie,
} from '../lib/orbital-rotation';

const initial = createOrbitalDie();
export const initialOrbitalFrame = projectOrbitalDie(point => rotateOrbitalPoint(point, initial.orientation));

const keyTurn: Partial<Record<string, [pitch: number, yaw: number]>> = {
  ArrowUp: [.17, 0],
  ArrowDown: [-.17, 0],
  ArrowLeft: [0, -.17],
  ArrowRight: [0, .17],
};

export function useOrbitalDie(art: RefObject<HTMLDivElement | null>, slowDie: boolean, activation: number) {
  const die = useRef<SVGSVGElement>(null);
  const control = useRef<HTMLDivElement>(null);
  const slow = useRef(slowDie);
  const requestShift = useRef<(() => void) | null>(null);
  const handled = useRef(0);

  useLayoutEffect(() => {
    if (!activation || activation === handled.current || !requestShift.current) return;
    handled.current = activation;
    requestShift.current();
  }, [activation]);

  useLayoutEffect(() => {
    slow.current = slowDie;
  }, [slowDie]);

  useEffect(() => {
    const element = art.current;
    const surface = control.current;
    const svg = die.current;
    const edges = svg?.querySelector('path');
    if (!element || !surface || !svg || !edges) return;

    const hitArea = surface;
    const backdrop = element;
    const outline = edges;
    const model = svg;
    const faces = svg.querySelectorAll('polygon');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width: 740px)');
    const motion = createOrbitalDie();
    let kind: OrbitalDieKind = 20;
    let shift: OrbitalDieShift | null = null;
    let visible = true;
    let frame = 0;
    let previous = 0;
    let pointer: {id: number; type: string; x: number; y: number; sensitivity: number} | null = null;

    function paint() {
      const next = projectOrbitalDie(point => rotateOrbitalPoint(point, motion.orientation), orbitalDieMeshes[kind]);
      for (let i = 0; i < faces.length; i++) {
        const face = faces[i];
        const projected = next.faces[i];
        const visibility = projected?.visible ? 'visible' : 'hidden';
        if (projected?.visible) {
          face.setAttribute('points', projected.points);
          face.style.setProperty('--orbital-face-light', projected.light);
        }
        if (face.getAttribute('visibility') !== visibility) face.setAttribute('visibility', visibility);
      }
      outline.setAttribute('d', next.edges);
    }

    function showKind(next: OrbitalDieKind) {
      kind = next;
      model.dataset.die = String(kind);
      hitArea.setAttribute('aria-label', `Girar o dado D${kind} com as setas do teclado`);
    }

    function clearShift() {
      shift = null;
      backdrop.dataset.transforming = 'false';
      model.style.removeProperty('--orbital-die-charge');
      model.style.removeProperty('--orbital-die-scale');
    }

    function startShift() {
      resetInput();
      shift = beginOrbitalDieShift(kind, shift);
      if (reduced.matches || !shown()) {
        showKind(shift.next);
        clearShift();
        paint();
      } else {
        backdrop.dataset.transforming = 'true';
        schedule();
      }
    }

    function shown() {
      return visible && !document.hidden;
    }

    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = previous = 0;
    }

    function schedule() {
      if (!frame && shown() && (!reduced.matches || motion.pending.pitch || motion.pending.yaw)) {
        frame = requestAnimationFrame(tick);
      }
    }

    function tick(now: number) {
      frame = 0;
      if (!shown()) return;
      if (!previous) previous = now;
      const delta = now - previous;
      if (reduced.matches || delta >= (compact.matches && !pointer ? 32 : 15)) {
        const seconds = Math.min(delta, 60) / 1000;
        advanceOrbitalDie(motion, seconds, slow.current, reduced.matches);
        if (shift) {
          const impulse = advanceOrbitalDieShift(shift, seconds);
          turnOrbitalDie(motion, impulse.turn);
          if (impulse.swap) showKind(shift.next);
          if (impulse.finished) clearShift();
          else {
            model.style.setProperty('--orbital-die-charge', (impulse.charge * 45).toFixed(1) + '%');
            model.style.setProperty('--orbital-die-scale', (1 - .045 * impulse.charge).toFixed(4));
          }
        }
        previous = now;
        paint();
      }
      schedule();
    }

    function start(event: PointerEvent) {
      if (shift || pointer || !event.isPrimary || !shown()) return;
      pointer = {
        id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY,
        sensitivity: 2.8 / Math.max(84, hitArea.getBoundingClientRect().width),
      };
      beginOrbitalInput(motion, performance.now() / 1000);
    }

    function mouseEnter(event: PointerEvent) {
      if (event.pointerType === 'mouse') start(event);
    }

    function touchStart(event: PointerEvent) {
      if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0) return;
      if (pointer?.type === 'mouse') resetInput();
      start(event);
      if (pointer?.id === event.pointerId) hitArea.setPointerCapture?.(event.pointerId);
    }

    function move(event: PointerEvent) {
      if (!pointer && event.pointerType === 'mouse') start(event);
      if (pointer?.id !== event.pointerId) return;
      const {x, y, sensitivity} = pointer;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      addOrbitalInput(motion, (y - event.clientY) * sensitivity, (event.clientX - x) * sensitivity, performance.now() / 1000);
      schedule();
    }

    function finish(event: PointerEvent, fling: boolean) {
      if (pointer?.id !== event.pointerId) return;
      pointer = null;
      endOrbitalInput(motion, performance.now() / 1000, fling && !reduced.matches);
    }

    function leave(event: PointerEvent) {
      if (pointer?.type === 'mouse' || !hitArea.hasPointerCapture?.(event.pointerId)) finish(event, true);
    }

    function release(event: PointerEvent) {
      if (pointer?.id === event.pointerId && pointer.type !== 'mouse') {
        move(event);
        finish(event, true);
      }
    }

    function cancel(event: PointerEvent) {
      finish(event, false);
    }

    function resetInput() {
      const id = pointer?.id;
      pointer = null;
      clearOrbitalInput(motion);
      if (id !== undefined && hitArea.hasPointerCapture?.(id)) hitArea.releasePointerCapture(id);
    }

    function keyboard(event: KeyboardEvent) {
      const turn = keyTurn[event.key];
      if (shift || !turn || event.altKey || event.ctrlKey || event.metaKey || !shown()) return;
      event.preventDefault();
      addOrbitalInput(motion, ...turn, performance.now() / 1000);
      schedule();
    }

    function updateMotion() {
      const paused = !shown() || reduced.matches;
      backdrop.dataset.motion = paused ? 'paused' : 'running';
      if (paused) {
        stop();
        if (shift) {
          showKind(shift.next);
          clearShift();
          paint();
        }
        if (shown() && pointer) {
          clearOrbitalInput(motion);
          beginOrbitalInput(motion, performance.now() / 1000);
        } else {
          resetInput();
        }
      }
      schedule();
    }

    const listeners = {
      pointerenter: mouseEnter, pointerleave: leave, pointerdown: touchStart,
      pointermove: move, pointerup: release, pointercancel: cancel,
      lostpointercapture: cancel, keydown: keyboard,
    };
    const abort = new window.AbortController();
    for (const [name, callback] of Object.entries(listeners)) {
      hitArea.addEventListener(name, callback as EventListener, {signal: abort.signal});
    }
    const observer = typeof IntersectionObserver === 'undefined' ? null
      : new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        updateMotion();
      });
    observer?.observe(element);
    document.addEventListener('visibilitychange', updateMotion);
    reduced.addEventListener('change', updateMotion);
    window.addEventListener('blur', resetInput);
    requestShift.current = startShift;
    updateMotion();
    if (activation && activation !== handled.current) {
      handled.current = activation;
      startShift();
    }

    return () => {
      requestShift.current = null;
      abort.abort();
      resetInput();
      stop();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updateMotion);
      reduced.removeEventListener('change', updateMotion);
      window.removeEventListener('blur', resetInput);
    };
  }, [art]);

  return {die, control};
}
