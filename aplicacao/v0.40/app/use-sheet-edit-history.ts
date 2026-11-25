'use client';

import {useLayoutEffect, useRef, useState} from 'react';
import type {Sheet} from '../lib/model';
import {recordSheetEdit, stepSheetEdit, type SheetEditHistory} from '../lib/sheet-edit-history';

export function useSheetEditHistory(sheet: Sheet, apply: (update: (current: Sheet) => Sheet) => void) {
  const current = useRef(sheet);
  const timeline = useRef<SheetEditHistory<Sheet>>({past: [], future: []});
  const [available, setAvailable] = useState({undo: false, redo: false});
  useLayoutEffect(() => { current.current = sheet; }, [sheet]);

  function setHistory(next: SheetEditHistory<Sheet>) {
    timeline.current = next;
    const undo = next.past.length > 0, redo = next.future.length > 0;
    setAvailable(old => old.undo === undo && old.redo === redo ? old : {undo, redo});
  }

  function commit(value: Sheet) {
    current.current = value;
    apply(() => value);
  }

  function edit(update: (value: Sheet) => Sheet, field?: string) {
    const previous = current.current;
    const next = update(previous);
    if (next === previous) return;
    setHistory(recordSheetEdit(timeline.current, previous, field));
    commit(next);
  }

  function activateTab(id: string) {
    if (current.current.activeTabId === id) return;
    timeline.current = {...timeline.current, typing: undefined};
    commit({...current.current, activeTabId: id});
  }

  function step(direction: 'undo' | 'redo') {
    const next = stepSheetEdit(timeline.current, current.current, direction);
    if (!next) return false;
    setHistory(next.history);
    commit(next.value);
    return true;
  }

  return {edit, activateTab, step, current, available};
}
