import {positionLayout, type BlockLayout, type PositionMode} from './model.ts';

export type MapPoint = {x: number; y: number};
export type MapView = {zoom: number; left: number; top: number};

export const MIN_MAP_ZOOM = .01;
export const MAX_MAP_ZOOM = 1.75;
export const TOUCH_MOVE_THRESHOLD = 8;

export function clampMapZoom(zoom: number): number {
  return Math.min(MAX_MAP_ZOOM, Math.max(MIN_MAP_ZOOM, zoom));
}

export function zoomMapAt(view: MapView, zoom: number, anchor: MapPoint, destination = anchor): MapView {
  const next = clampMapZoom(zoom);
  const ratio = next / view.zoom;
  return {
    zoom: next,
    left: Math.max(0, (view.left + anchor.x) * ratio - destination.x),
    top: Math.max(0, (view.top + anchor.y) * ratio - destination.y),
  };
}

export function touchPair(first: MapPoint, second: MapPoint) {
  return {
    midpoint: {x: (first.x + second.x) / 2, y: (first.y + second.y) / 2},
    distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
  };
}

export function dragMapBlock(
  layout: BlockLayout, kind: 'move' | 'resize', delta: MapPoint, mode: PositionMode, blockHeight: number,
): BlockLayout {
  if (kind === 'move') return positionLayout({...layout, x: layout.x + delta.x, y: layout.y + delta.y}, mode);
  const height = layout.height === undefined && Math.abs(delta.y) < 12
    ? undefined
    : (layout.height ?? blockHeight) + delta.y;
  return positionLayout({...layout, width: layout.width + delta.x, height}, mode);
}

export function sameBlockLayout(a: BlockLayout, b: BlockLayout): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
