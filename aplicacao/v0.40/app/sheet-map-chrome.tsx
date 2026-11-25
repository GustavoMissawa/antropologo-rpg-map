'use client';

import {useSyncExternalStore} from 'react';
import {ArrowLeft, ChevronDown, Ellipsis, Minus, Plus, Redo2, Scan, SlidersHorizontal, Undo2, X} from 'lucide-react';
import {MAX_MAP_ZOOM, MIN_MAP_ZOOM} from '../lib/sheet-map-gestures';

const compactQuery = '(max-width: 760px), (pointer: coarse) and (max-height: 560px)';
function subscribeCompact(notify: () => void) {
  if (!window.matchMedia) return () => {};
  const media = window.matchMedia(compactQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
export function useCompactSheetMap() {
  return useSyncExternalStore(subscribeCompact, () => window.matchMedia?.(compactQuery).matches ?? false, () => false);
}

type HistoryControls = {
  undo: boolean;
  redo: boolean;
  onStep: (direction: 'undo' | 'redo') => void;
};

export function MapHistoryButtons({undo, redo, onStep}: HistoryControls) {
  return <div className="map-history-buttons" role="group" aria-label="Histórico de edição">
    <button type="button" className="icon-button" aria-label="Desfazer" title="Desfazer (Ctrl ou ⌘ + Z)" disabled={!undo} onClick={()=>onStep('undo')}><Undo2 size={19}/></button>
    <button type="button" className="icon-button" aria-label="Refazer" title="Refazer (Ctrl ou ⌘ + Shift + Z)" disabled={!redo} onClick={()=>onStep('redo')}><Redo2 size={19}/></button>
  </div>;
}

export function CompactMapHeader({name, preview, backLabel, onBack, onInfo, onOptions}: {
  name: string; preview: boolean; backLabel: string; onBack: () => void; onInfo: () => void; onOptions: () => void;
}) {
  return <header className="map-compact-header">
    <button type="button" className="icon-button" aria-label={backLabel} onClick={onBack}><ArrowLeft size={21}/></button>
    <h1><button type="button" className="map-compact-name" aria-label={`Dados da ficha de ${name || 'Sem nome'}`} aria-haspopup="dialog" onClick={onInfo}>
      <span>{name || 'Sem nome'}{preview&&<small>Modo ficha</small>}</span><ChevronDown size={15}/>
    </button></h1>
    <button type="button" className="icon-button" aria-label="Opções do Canvas" aria-haspopup="dialog" onClick={onOptions}><Ellipsis size={23}/></button>
  </header>;
}

export function CompactMapTools({zoom, preview, full, history, onAdd, onZoom, onFit}: {
  zoom: number; preview: boolean; full: boolean; history: HistoryControls; onAdd: () => void;
  onZoom: (level: number) => void; onFit: () => void;
}) {
  return <div className="map-floating-dock" role="group" aria-label="Ferramentas do Canvas">
    {!preview&&<button type="button" className="button primary map-dock-add" aria-label="Adicionar bloco" aria-haspopup="dialog" disabled={full} onClick={onAdd}><Plus size={23}/></button>}
    <div className="map-dock-zoom" role="group" aria-label="Zoom do mapa">
      <button type="button" className="icon-button" aria-label="Aumentar zoom" disabled={zoom>=MAX_MAP_ZOOM} onClick={()=>onZoom(zoom+.1)}><Plus size={18}/></button>
      <button type="button" className="map-zoom-value" aria-label="Restaurar zoom em 100%" onClick={()=>onZoom(1)}>{Math.round(zoom*100)}%</button>
      <button type="button" className="icon-button" aria-label="Diminuir zoom" disabled={zoom<=MIN_MAP_ZOOM} onClick={()=>onZoom(zoom-.1)}><Minus size={18}/></button>
      <button type="button" className="icon-button map-dock-fit" aria-label="Enquadrar todos os blocos" onClick={onFit}><Scan size={20}/></button>
    </div>
    <MapHistoryButtons {...history}/>
  </div>;
}

export function MapSelectionActions({title, onInspect, onFit, onClear}: {
  title: string; onInspect: () => void; onFit: () => void; onClear: () => void;
}) {
  return <div className="map-selection-actions" role="group" aria-label={`Ações de ${title || 'Sem título'}`}>
    <button type="button" className="button secondary" aria-haspopup="dialog" onClick={onInspect}><SlidersHorizontal size={16}/> Ajustes do bloco</button>
    <button type="button" className="icon-button" aria-label="Enquadrar bloco selecionado" onClick={onFit}><Scan size={18}/></button>
    <button type="button" className="icon-button" aria-label="Desmarcar bloco" onClick={onClear}><X size={18}/></button>
  </div>;
}
