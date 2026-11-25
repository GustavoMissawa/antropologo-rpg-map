const HISTORY_LIMIT = 40;
const TYPING_PAUSE = 650;

export type SheetEditHistory<T> = {
  past: T[];
  future: T[];
  typing?: {field: string; time: number};
};

export function recordSheetEdit<T>(
  history: SheetEditHistory<T>, previous: T, field?: string, time = Date.now(),
): SheetEditHistory<T> {
  const merged = field && history.typing?.field === field && time - history.typing.time < TYPING_PAUSE;
  return {
    past: merged ? history.past : [...history.past.slice(1 - HISTORY_LIMIT), previous],
    future: [],
    typing: field ? {field, time} : undefined,
  };
}

export function stepSheetEdit<T>(history: SheetEditHistory<T>, current: T, direction: 'undo' | 'redo') {
  if (direction === 'undo' && history.past.length) {
    return {value: history.past.at(-1)!, history: {past: history.past.slice(0, -1), future: [current, ...history.future]}};
  }
  if (direction === 'redo' && history.future.length) {
    return {value: history.future[0], history: {past: [...history.past, current], future: history.future.slice(1)}};
  }
  return null;
}
