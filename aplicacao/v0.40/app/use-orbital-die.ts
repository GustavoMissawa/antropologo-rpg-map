'use client';

import {useEffect, useLayoutEffect, useRef, type RefObject} from 'react';
import {advanceAmbientMotion, AMBIENT_MOTION_IDLE_MS, emptyAmbientMotion} from '../lib/ambient-interaction';
import {projectOrbitalDie} from '../lib/hero-die-geometry';
import {orbitalDieMeshes, type OrbitalDieKind} from '../lib/orbital-die-geometry';
import {
  createOrbitalRoll, ORBITAL_RESULT_AUTO_FADE_MS, ORBITAL_RESULT_DISPLAY_MS, ORBITAL_RESULT_INPUT_FADE_MS,
  ORBITAL_ROLL_ALIGN_SECONDS,
} from '../lib/orbital-die-roll';
import {advanceOrbitalDieShift, beginOrbitalDieShift, type OrbitalDieShift} from '../lib/orbital-die-shift';
import {
  addOrbitalInput, advanceOrbitalDie, beginOrbitalInput, clearOrbitalInput,
  createOrbitalDie, endOrbitalInput, interpolateOrbitalOrientation, rotateOrbitalPoint, turnOrbitalDie, type Quaternion,
} from '../lib/orbital-rotation';

const initial = createOrbitalDie();
export const initialOrbitalFrame = projectOrbitalDie(point => rotateOrbitalPoint(point, initial.orientation));

const keyTurn: Partial<Record<string, [pitch: number, yaw: number]>> = {
  ArrowUp: [.17, 0],
  ArrowDown: [-.17, 0],
  ArrowLeft: [0, -.17],
  ArrowRight: [0, .17],
};

type SettlingRoll = {
  phase: 'settling';
  start: Quaternion;
  elapsed: number;
  fromClick: boolean;
  result: ReturnType<typeof createOrbitalRoll>;
};
type Roll = SettlingRoll | {phase: 'visible' | 'fading'};

export function useOrbitalDie(art: RefObject<HTMLDivElement | null>, slowDie: boolean, activation: number) {
  const die = useRef<SVGSVGElement>(null);
  const control = useRef<HTMLButtonElement>(null);
  const result = useRef<SVGTextElement>(null);
  const announcement = useRef<HTMLDivElement>(null);
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
    const edges = svg?.querySelector('.orbital-d20-edges');
    const vertexGlow = svg?.querySelector<SVGCircleElement>('.orbital-vertex-glow');
    const vertexClip = svg?.querySelector<SVGPathElement>('.orbital-vertex-clip');
    const numberLabel = result.current;
    const liveResult = announcement.current;
    if (!element || !surface || !svg || !edges || !vertexGlow || !vertexClip || !numberLabel || !liveResult) return;

    const hitArea = surface;
    const backdrop = element;
    const outline = edges;
    const model = svg;
    const number = numberLabel;
    const status = liveResult;
    const glow = vertexGlow;
    const clip = vertexClip;
    const faces = svg.querySelectorAll('polygon');
    const criticalEdges = svg.querySelectorAll('.orbital-critical > g');
    const criticalNumbers = svg.querySelectorAll('.orbital-critical-number');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width: 740px)');
    const motion = createOrbitalDie();
    let kind: OrbitalDieKind = 20;
    let shift: OrbitalDieShift | null = null;
    let visible = true;
    let frame = 0;
    let previous = 0;
    let pointer: {id: number; type: string; x: number; y: number; sensitivity: number} | null = null;
    let activity = emptyAmbientMotion();
    let qualified = false;
    let lastMovement = 0;
    let idleTimer = 0;
    let resultTimer = 0;
    let roll: Roll | null = null;
    let fade: Animation | null = null;
    let ignoreKeyRepeat = false;
    let lastPressType = '';
    let nextPulseAt = performance.now() + 1400 + Math.random() * 1600;
    let pulse: {vertex: number; animation: Animation} | null = null;

    function clearVertexPulse() {
      if (!pulse) return;
      pulse.animation.onfinish = null;
      pulse.animation.cancel();
      pulse = null;
      glow.setAttribute('visibility', 'hidden');
    }

    function paintVertexPulse(view: ReturnType<typeof projectOrbitalDie>, now: number, reveal: boolean) {
      if (reduced.matches || shift || !shown() || !glow.animate) return;
      if (reveal || (pulse && !view.visibleVertices.has(pulse.vertex))) clearVertexPulse();
      if (reveal || (now >= nextPulseAt && !roll)) {
        const manual = now - lastMovement <= AMBIENT_MOTION_IDLE_MS;
        nextPulseAt = now + (manual ? 1550 : 3400) + Math.random() * (manual ? 850 : 2400);
        const vertices = [...view.visibleVertices];
        if (!pulse && vertices.length) {
          const vertex = vertices[Math.floor(Math.random() * vertices.length)];
          const peak = reveal ? .72 : manual ? .58 : .46;
          const animation = glow.animate([
            {opacity: 0},
            {opacity: peak, offset: .4},
            {opacity: 0},
          ], {duration: reveal ? 360 : 250 + Math.random() * 140, easing: 'ease-in-out'});
          pulse = {vertex, animation};
          animation.onfinish = () => {
            if (pulse?.animation === animation) clearVertexPulse();
          };
          glow.setAttribute('visibility', 'visible');
        }
      }
      if (!pulse) return;
      const {x, y} = view.projected[pulse.vertex];
      glow.setAttribute('cx', String(x));
      glow.setAttribute('cy', String(y));
      // A single nonzero path fills the union of the front-facing polygons.
      clip.setAttribute('d', view.faces.filter(face => face.visible).map(face => `M${face.points}Z`).join(''));
    }

    function paint(now = performance.now(), reveal = false) {
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
      paintVertexPulse(next, now, reveal);
      return next;
    }

    function showKind(next: OrbitalDieKind) {
      kind = next;
      model.dataset.die = String(kind);
      hitArea.setAttribute('aria-label', `Rolar dado D${kind}`);
    }

    function clearShift() {
      shift = null;
      backdrop.dataset.transforming = 'false';
      model.style.removeProperty('--orbital-die-charge');
      model.style.removeProperty('--orbital-die-scale');
    }

    function startShift() {
      clearVertexPulse();
      clearRoll();
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

    function clearActivity() {
      window.clearTimeout(idleTimer);
      idleTimer = 0;
      activity = emptyAmbientMotion();
      qualified = false;
    }

    function waitForStop() {
      idleTimer = 0;
      if (!qualified) return;
      const remaining = lastMovement + AMBIENT_MOTION_IDLE_MS - performance.now();
      if (remaining > 0) {
        idleTimer = window.setTimeout(waitForStop, remaining);
        return;
      }

      startRoll(false);
    }

    function startRoll(fromClick: boolean) {
      clearActivity();
      if (!shown() || shift || roll) return;
      clearOrbitalInput(motion);
      motion.automatic.speed = 0;
      roll = {phase: 'settling', elapsed: 0, start: motion.orientation, fromClick, result: createOrbitalRoll(kind, motion.orientation)};
      model.dataset.rollPhase = roll.phase;
      if (reduced.matches) revealResult(roll);
      else schedule();
    }

    function trackMovement(now: number, threshold?: number) {
      if (now - lastMovement > AMBIENT_MOTION_IDLE_MS) {
        nextPulseAt = Math.min(nextPulseAt, now + 500 + Math.random() * 400);
      }
      if (qualified && now - lastMovement >= AMBIENT_MOTION_IDLE_MS) {
        window.clearTimeout(idleTimer);
        waitForStop();
        return;
      }
      if (!qualified) {
        const observed = advanceAmbientMotion(activity, now, true, threshold);
        activity = observed.state;
        qualified = observed.triggered;
      }
      lastMovement = now;
      if (qualified && !idleTimer) idleTimer = window.setTimeout(waitForStop, AMBIENT_MOTION_IDLE_MS);
    }

    function clearRoll() {
      delete model.dataset.critical;
      window.clearTimeout(resultTimer);
      resultTimer = 0;
      roll = null;
      model.dataset.rollPhase = 'idle';
      number.textContent = '';
      status.textContent = '';
      if (fade) {
        fade.onfinish = null;
        fade.cancel();
        fade = null;
      }
    }

    function revealResult({result}: SettlingRoll) {
      motion.orientation = result.target;
      const view = paint(performance.now(), true);
      stop();
      number.setAttribute('x', String(result.x));
      number.setAttribute('y', String(result.y));
      number.setAttribute('font-size', String(result.fontSize));
      number.textContent = String(result.value);
      if (result.value === kind) {
        const pairs = new Map<string, [string, string]>();
        const borders = new Set<string>();
        for (const face of view.faces) {
          if (!face.visible) continue;
          const points = face.points.split(' ');
          points.forEach((start, i) => {
            const end = points[(i + 1) % points.length];
            const key = [start, end].sort().join('|');
            if (pairs.has(key)) pairs.delete(key);
            else pairs.set(key, [start, end]);
          });
        }
        const boundary = new Map(pairs.values());
        const first = boundary.keys().next().value;
        const perimeter: string[] = [];
        let point = first;
        while (point !== undefined && boundary.has(point)) {
          const next = boundary.get(point)!;
          boundary.delete(point);
          borders.add([point, next].sort().join('|'));
          perimeter.push(point);
          point = next;
        }
        const segments = (view.edges.match(/M[^M]+/g) ?? [])
          .filter(segment => !borders.has(segment.slice(1).split('L').sort().join('|')));
        const paths = perimeter.length && point === first
          ? [`M${perimeter.join('L')}Z`, ...segments]
          : view.edges.match(/M[^M]+/g) ?? [];
        for (const layer of criticalEdges) {
          layer.replaceChildren(...paths.map((segment, i) => {
            const edge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            edge.setAttribute('class', 'orbital-critical-edge');
            if (i === 0 && segment.endsWith('Z')) edge.classList.add('orbital-critical-perimeter');
            edge.setAttribute('pathLength', '100');
            edge.setAttribute('d', segment);
            return edge;
          }));
        }
        for (const digit of criticalNumbers) {
          digit.setAttribute('x', String(result.x));
          digit.setAttribute('y', String(result.y));
          digit.setAttribute('font-size', String(result.fontSize));
          digit.textContent = number.textContent;
        }
        model.dataset.critical = 'true';
      }
      status.textContent = `Resultado do D${kind}: ${result.value}`;
      const visibleRoll = roll = {phase: 'visible'};
      model.dataset.rollPhase = visibleRoll.phase;
      resultTimer = window.setTimeout(() => {
        if (roll === visibleRoll) dismissResult(ORBITAL_RESULT_AUTO_FADE_MS);
      }, ORBITAL_RESULT_DISPLAY_MS);
    }

    function resumeControl() {
      clearRoll();
      if (pointer) beginOrbitalInput(motion, performance.now() / 1000);
      schedule();
    }

    function dismissResult(duration: number) {
      if (roll?.phase !== 'visible') return;
      window.clearTimeout(resultTimer);
      resultTimer = 0;
      delete model.dataset.critical;
      roll = {phase: 'fading'};
      model.dataset.rollPhase = roll.phase;
      if (!shown() || !number.animate) {
        resumeControl();
        return;
      }
      const animation = number.animate([{opacity: 1}, {opacity: 0}], {
        duration, fill: 'forwards', easing: 'cubic-bezier(.23, 1, .32, 1)',
      });
      fade = animation;
      animation.onfinish = () => {
        if (fade === animation) resumeControl();
      };
    }

    function schedule() {
      if (roll && roll.phase !== 'settling') return;
      if (!frame && shown() && (!reduced.matches || motion.pending.pitch || motion.pending.yaw)) {
        frame = requestAnimationFrame(tick);
      }
    }

    function tick(now: number) {
      frame = 0;
      if (!shown() || (roll && roll.phase !== 'settling')) return;
      if (!previous) previous = now;
      const delta = now - previous;
      if (reduced.matches || delta >= (compact.matches && !pointer ? 32 : 15)) {
        const seconds = Math.min(delta, 60) / 1000;
        if (roll?.phase === 'settling') {
          roll.elapsed += seconds;
          const duration = roll.fromClick ? .95 : ORBITAL_ROLL_ALIGN_SECONDS;
          const progress = Math.min(1, roll.elapsed / duration);
          if (progress === 1) {
            revealResult(roll);
            return;
          }
          // Arranque suave e desaceleração progressiva até o repouso.
          const eased = progress ** 2 * (6 - 8 * progress + 3 * progress ** 2);
          motion.orientation = interpolateOrbitalOrientation(roll.start, roll.result.target, eased);
          if (roll.fromClick) turnOrbitalDie(motion, 2 * Math.PI * eased);
        } else {
          advanceOrbitalDie(motion, seconds, slow.current, reduced.matches);
        }
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
        paint(now);
      }
      schedule();
    }

    function start(event: PointerEvent) {
      if (shift || pointer || !event.isPrimary || !shown()) return;
      pointer = {
        id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY,
        sensitivity: 2.8 / Math.max(84, hitArea.getBoundingClientRect().width),
      };
      if (!roll) beginOrbitalInput(motion, performance.now() / 1000);
    }

    function mouseEnter(event: PointerEvent) {
      if (event.pointerType === 'mouse') start(event);
    }

    function touchStart(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return;
      lastPressType = event.pointerType;
      if (event.pointerType === 'mouse') return;
      if (pointer?.type === 'mouse') resetInput();
      start(event);
      if (pointer?.id === event.pointerId) hitArea.setPointerCapture?.(event.pointerId);
    }

    function move(event: PointerEvent) {
      if (!pointer && event.pointerType === 'mouse') start(event);
      if (pointer?.id !== event.pointerId) return;
      const {x, y, sensitivity} = pointer;
      const dx = event.clientX - x, dy = y - event.clientY;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (!dx && !dy) return;
      if (roll) {
        dismissResult(ORBITAL_RESULT_INPUT_FADE_MS);
        return;
      }
      const now = performance.now();
      trackMovement(now, pointer.type === 'touch' ? 1000 : undefined);
      if (roll) return;
      addOrbitalInput(motion, dy * sensitivity, dx * sensitivity, now / 1000);
      schedule();
    }

    function finish(event: PointerEvent, fling: boolean) {
      if (pointer?.id !== event.pointerId) return;
      pointer = null;
      if (!fling || !qualified) clearActivity();
      if (!roll) endOrbitalInput(motion, performance.now() / 1000, fling && !reduced.matches);
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
      clearActivity();
      clearOrbitalInput(motion);
      if (id !== undefined && hitArea.hasPointerCapture?.(id)) hitArea.releasePointerCapture(id);
    }

    function click(event: PointerEvent) {
      const type = event.pointerType || lastPressType;
      if (event.detail !== 0 && type && type !== 'mouse') return;
      if (roll) dismissResult(ORBITAL_RESULT_INPUT_FADE_MS);
      else startRoll(true);
    }

    function keyboard(event: KeyboardEvent) {
      const turn = keyTurn[event.key];
      if (shift || !turn || event.altKey || event.ctrlKey || event.metaKey || !shown()) return;
      event.preventDefault();
      if (roll) {
        ignoreKeyRepeat = true;
        dismissResult(ORBITAL_RESULT_INPUT_FADE_MS);
        return;
      }
      if (event.repeat && ignoreKeyRepeat) return;
      ignoreKeyRepeat = false;
      const now = performance.now();
      trackMovement(now);
      if (roll) return;
      addOrbitalInput(motion, ...turn, now / 1000);
      schedule();
    }

    function updateMotion() {
      const paused = !shown() || reduced.matches;
      backdrop.dataset.motion = paused ? 'paused' : 'running';
      if (paused) {
        clearVertexPulse();
        stop();
        if (shift) {
          showKind(shift.next);
          clearShift();
          paint();
        }
        if (shown() && roll?.phase === 'settling') revealResult(roll);
        if (shown() && pointer && !roll) {
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
      lostpointercapture: cancel, keydown: keyboard, click,
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
      clearVertexPulse();
      clearRoll();
      resetInput();
      stop();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updateMotion);
      reduced.removeEventListener('change', updateMotion);
      window.removeEventListener('blur', resetInput);
    };
  }, [art]);

  return {die, control, result, announcement};
}
