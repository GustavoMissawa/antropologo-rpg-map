'use client';

import {useCallback, useEffect, useRef, useState, type PointerEvent} from 'react';
import type {Block, BlockLayout, PositionMode} from '../lib/model';
import {
  dragMapBlock, sameBlockLayout, touchPair, zoomMapAt, TOUCH_MOVE_THRESHOLD,
  type MapPoint, type MapView,
} from '../lib/sheet-map-gestures';

type SingleGesture = {
  pointer: number;
  kind: 'pan' | 'select' | 'move' | 'resize';
  origin: MapPoint;
  point: MapPoint;
  view: MapView;
  threshold: number;
  started: boolean;
  node?: HTMLElement;
  block?: Block;
  draft?: BlockLayout;
  height: number;
};
type Pinch = {view: MapView; midpoint: MapPoint; distance: number};
type Options = {
  blocks: ReadonlyMap<string, Block>;
  mode: PositionMode;
  preview: boolean;
  hand: boolean;
  compact: boolean;
  workspaceKey: string;
  select: (id: string | null) => void;
  inspect: (id: string) => void;
  commit: (id: string, value: BlockLayout, kind: 'move' | 'resize', height?: number) => void;
};

const interactive = 'button, input, textarea, select, a, label, [role="button"], [contenteditable], .map-field';
const pointOf = (event: PointerEvent): MapPoint => ({x: event.clientX, y: event.clientY});

function edgeScroll(point: number, first: number, last: number): number {
  const margin = 32;
  if (point < first + margin) return -Math.min(20, (first + margin - point) / 3);
  if (point > last - margin) return Math.min(20, (point - last + margin) / 3);
  return 0;
}

export function useSheetMapGestures(options: Options) {
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const liveZoom = useRef(1);
  const pointers = useRef(new Map<number, MapPoint>());
  const single = useRef<SingleGesture | null>(null);
  const pinch = useRef<Pinch | null>(null);
  const pinching = useRef(false);
  const frame = useRef(0);
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resizing = useRef(false);

  const clearDrawing = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    clearTimeout(hold.current);
    const node = single.current?.node;
    if (node) {
      node.style.removeProperty('translate');
      node.style.removeProperty('--map-drag-width');
      node.style.removeProperty('--map-drag-height');
      delete node.dataset.dragging;
    }
    viewport.current?.style.removeProperty('--map-gesture-width');
    viewport.current?.style.removeProperty('--map-gesture-height');
    single.current = null;
    resizing.current = false;
  }, []);

  useEffect(() => () => {
    clearDrawing();
    pointers.current.clear();
    pinch.current = null;
    pinching.current = false;
  }, [clearDrawing, options.workspaceKey]);

  function readView(): MapView {
    const node = viewport.current;
    return {zoom: liveZoom.current, left: node?.scrollLeft ?? 0, top: node?.scrollTop ?? 0};
  }

  const paintView = useCallback((view: MapView) => {
    const node = viewport.current;
    if (!node) return;
    liveZoom.current = view.zoom;
    node.style.setProperty('--map-zoom', String(view.zoom));
    node.scrollLeft = view.left;
    node.scrollTop = view.top;
  }, []);

  const scrollToView = useCallback((view: MapView) => {
    paintView(view);
    setZoom(view.zoom);
  }, [paintView]);

  function changeZoom(value: number) {
    const node = viewport.current;
    if (!node) return;
    scrollToView(zoomMapAt(readView(), Math.round(value * 100) / 100, {x: node.clientWidth / 2, y: node.clientHeight / 2}));
  }

  function currentPair(node: HTMLElement) {
    const [first, second] = pointers.current.values();
    if (!first || !second) return null;
    const bounds = node.getBoundingClientRect();
    const pair = touchPair(first, second);
    return {distance: pair.distance, midpoint: {x: pair.midpoint.x - bounds.left, y: pair.midpoint.y - bounds.top}};
  }

  function startPinch(node: HTMLElement) {
    clearDrawing();
    const pair = currentPair(node);
    if (!pair) return;
    pinching.current = true;
    pinch.current = {...pair, view: readView()};
  }

  function draw(fromFrame = true) {
    frame.current = 0;
    const node = viewport.current;
    if (!node) return;
    const scale = pinch.current;
    if (scale) {
      const pair = currentPair(node);
      if (pair) paintView(zoomMapAt(scale.view, scale.view.zoom * pair.distance / scale.distance, scale.midpoint, pair.midpoint));
      return;
    }

    const gesture = single.current;
    if (!gesture) return;
    const {origin, point, view, kind, block, node: card} = gesture;
    const dx = point.x - origin.x, dy = point.y - origin.y;
    if (!gesture.started) {
      if (Math.hypot(dx, dy) < gesture.threshold) return;
      clearTimeout(hold.current);
      gesture.started = true;
    }
    if (kind === 'select') return;
    if (kind === 'pan') {
      node.scrollLeft = view.left - dx;
      node.scrollTop = view.top - dy;
      return;
    }
    if (!block || !card) return;

    resizing.current = kind === 'resize';
    const box = node.getBoundingClientRect();
    const oldLeft = node.scrollLeft, oldTop = node.scrollTop;
    if (fromFrame) {
      node.scrollLeft += edgeScroll(point.x, box.left, box.right);
      node.scrollTop += edgeScroll(point.y, box.top, box.bottom);
    }
    const layout = dragMapBlock(block.layout, kind, {
      x: (dx + node.scrollLeft - view.left) / view.zoom,
      y: (dy + node.scrollTop - view.top) / view.zoom,
    }, options.mode, gesture.height);
    if (!gesture.draft || !sameBlockLayout(gesture.draft, layout)) {
      gesture.draft = layout;
      card.dataset.dragging = kind;
      if (kind === 'move') {
        card.style.translate = `${layout.x - block.layout.x}px ${layout.y - block.layout.y}px`;
      } else {
        card.style.setProperty('--map-drag-width', `${layout.width}px`);
        if (layout.height !== undefined) card.style.setProperty('--map-drag-height', `${layout.height}px`);
        else card.style.removeProperty('--map-drag-height');
      }
      node.style.setProperty('--map-gesture-width', `${layout.x + layout.width + 220}px`);
      node.style.setProperty('--map-gesture-height', `${layout.y + Math.max(gesture.height, layout.height ?? 0) + 220}px`);
    }
    if (fromFrame && (node.scrollLeft !== oldLeft || node.scrollTop !== oldTop)) queueDraw();
  }

  function queueDraw() {
    if (!frame.current) frame.current = requestAnimationFrame(() => draw());
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || event.button !== 0 && event.button !== 1) return;
    const node = event.currentTarget;
    const touch = event.pointerType === 'touch';
    if (touch && pointers.current.size) {
      pointers.current.set(event.pointerId, pointOf(event));
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
      if (pointers.current.size === 2) startPinch(node);
      return;
    }
    if (single.current || pinching.current) return;
    const card = target.closest<HTMLElement>('[data-block-id]');
    const block = options.blocks.get(card?.dataset.blockId ?? '');
    const handle = target.closest<HTMLElement>('[data-map-gesture]')?.dataset.mapGesture;
    const dragHandle = !options.preview && (handle === 'move' || handle === 'resize') ? handle : undefined;
    if (!dragHandle && target.closest(interactive)) {
      if (block && !options.preview) options.select(block.id);
      return;
    }
    const kind = dragHandle ?? (!block || options.hand || event.button === 1 ? 'pan' : 'select');
    const point = pointOf(event);
    const gesture: SingleGesture = {
      kind, pointer: event.pointerId, origin: point, point, view: readView(),
      threshold: touch ? TOUCH_MOVE_THRESHOLD : 3,
      started: false, node: card ?? undefined, block,
      height: card?.offsetHeight || block?.layout.height || 260,
    };
    if (touch) pointers.current.set(event.pointerId, point);
    if (kind !== 'select' || touch) {
      event.preventDefault();
      node.setPointerCapture(event.pointerId);
    }
    if (block && (dragHandle || !touch && kind === 'select') && !options.preview) options.select(block.id);
    single.current = gesture;
    if (touch && block && kind === 'select' && options.compact && !options.preview) {
      hold.current = setTimeout(() => {
        if (single.current !== gesture || gesture.started || pinching.current) return;
        clearDrawing();
        pointers.current.delete(gesture.pointer);
        if (node.hasPointerCapture(gesture.pointer)) node.releasePointerCapture(gesture.pointer);
        options.select(block.id);
        options.inspect(block.id);
      }, 480);
    }
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const point = pointOf(event);
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, point);
    if (pinch.current) { queueDraw(); return; }
    const gesture = single.current;
    if (gesture?.pointer !== event.pointerId) return;
    gesture.point = point;
    if (Math.hypot(point.x - gesture.origin.x, point.y - gesture.origin.y) >= gesture.threshold) clearTimeout(hold.current);
    queueDraw();
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>, cancel = false) {
    if (pointers.current.has(event.pointerId)) {
      if (pinch.current && !cancel) {
        pointers.current.set(event.pointerId, pointOf(event));
        cancelAnimationFrame(frame.current);
        draw(false);
      }
      pointers.current.delete(event.pointerId);
    }
    if (pinching.current) {
      if (pointers.current.size >= 2) startPinch(event.currentTarget);
      else {
        pinch.current = null;
        setZoom(liveZoom.current);
        if (!pointers.current.size) pinching.current = false;
      }
      return;
    }
    const gesture = single.current;
    if (gesture?.pointer !== event.pointerId) return;
    cancelAnimationFrame(frame.current);
    if (!cancel) {
      gesture.point = pointOf(event);
      draw(false);
    }
    const height = !cancel && gesture.kind==='resize' && gesture.draft ? gesture.node?.offsetHeight : undefined;
    clearDrawing();
    if (cancel) return;
    const {kind, block, draft, started} = gesture;
    if (block && draft && (kind === 'move' || kind === 'resize') && !sameBlockLayout(block.layout, draft)) {
      options.commit(block.id, draft, kind, height);
    } else if (!started && !options.preview) {
      if (kind === 'pan') options.select(null);
      if (kind === 'select' && block) options.select(block.id);
    }
  }

  return {
    viewport, zoom, resizing, readView, scrollToView, changeZoom,
    pointerHandlers: {
      onPointerDown: pointerDown,
      onPointerMove: pointerMove,
      onPointerUp: pointerEnd,
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => pointerEnd(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => pointerEnd(event, true),
    },
  };
}
