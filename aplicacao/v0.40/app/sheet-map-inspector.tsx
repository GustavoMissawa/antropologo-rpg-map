'use client';

import {useState} from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, Dices, FileText, Hand, ImagePlus, Layers3, Move,
  Pencil, Plus, Search, Shield, Sparkles, Trash2, X,
} from 'lucide-react';
import {GRID_SIZE, MAP_LIMIT, type Block, type BlockLayout, type Sheet} from '../lib/model';
import type {BlockConnection} from '../lib/sheet-connections';
import {BlockConnectionControls} from './sheet-block-connections';
import {BlockVisualControls} from './sheet-block-visuals';

export const blockKinds = [
  {kind:'attributes', title:'Atributos', description:'Valores que definem o personagem.', Icon:Dices},
  {kind:'skills', title:'Perícias', description:'Conhecimentos e especialidades.', Icon:Sparkles},
  {kind:'resources', title:'Recursos', description:'Vida, mana e o que mais precisar.', Icon:Shield},
  {kind:'notes', title:'Texto livre', description:'História, inventário ou anotações.', Icon:FileText},
  {kind:'image', title:'Imagem', description:'Retrato, símbolo, mapa ou ilustração.', Icon:ImagePlus},
  {kind:'custom', title:'Bloco vazio', description:'Um espaço inteiramente seu.', Icon:Layers3},
];
export const blockIcons = Object.fromEntries(blockKinds.map(({kind, Icon})=>[kind, Icon]));

function PositionInput({label,value,min,max,step,onCommit}: {
  label: string; value: number; min: number; max: number; step: number; onCommit: (value: number) => void;
}) {
  const [draft,setDraft] = useState<string | null>(null);
  return <input type="number" aria-label={label} min={min} max={max} step={step} value={draft??String(value)}
    onChange={e=>setDraft(e.target.value)}
    onBlur={()=>{
      const entered = Number(draft);
      if (draft?.trim() && Number.isFinite(entered) && entered !== value) onCommit(entered);
      setDraft(null);
    }}
    onKeyDown={e=>{
      if (e.key==='Enter') {e.preventDefault();e.currentTarget.blur();}
      if (e.key==='Escape' && draft!==null) {e.preventDefault();e.stopPropagation();setDraft(null);}
    }}/>;
}

export function MapBlockIndex({title, blocks, compact, preview, isTemplate, onFocus}: {
  title: string; blocks: Block[]; compact: boolean; preview: boolean; isTemplate: boolean; onFocus: (block: Block) => void;
}) {
  return <>
    {!compact&&<div className="map-inspector-heading"><h3>{title}</h3><Layers3 size={17}/></div>}
    <div className="map-block-index">
      {blocks.map((block,i)=>{
        const Icon = blockIcons[block.kind] ?? Layers3;
        return <button key={block.id} type="button" onClick={()=>onFocus(block)}>
          <span>{String(i+1).padStart(2,'0')}</span><Icon size={15}/><strong>{block.title || 'Sem título'}</strong><Search size={14}/>
        </button>;
      })}
      {!blocks.length&&<p>Os blocos desta aba aparecerão aqui.</p>}
    </div>
    {!compact&&<p className="map-index-help">Clique em um bloco para encontrá-lo no mapa{preview?'.':' e ajustar seus detalhes.'}</p>}
    {!compact&&!blocks.length&&<div className="map-tip">
      <Hand size={22}/><h4>{isTemplate?'Abas do modelo':'Abas do personagem'}</h4><p>Crie abas para separar atributos, combate ou inventário.</p>
    </div>}
  </>;
}

type InspectorProps = {
  sheet: Sheet; block: Block; compact: boolean; measuredHeight?: number; busy: boolean; error: string;
  onClose: () => void; onUpdate: (update: (block: Block) => Block, field?: string) => void;
  onMoveTab: (id: string) => void; onPlace: (layout: BlockLayout) => void; onUpload: (file: File) => void;
  onConnect: () => void; onDisconnect: (edge: BlockConnection) => void; onDuplicate: () => void; onRemove: () => void;
  onField: (id?: string) => void;
};

export function MapBlockInspector({
  sheet, block, compact, measuredHeight, busy, error, onClose, onUpdate, onMoveTab, onPlace,
  onUpload, onConnect, onDisconnect, onDuplicate, onRemove, onField,
}: InspectorProps) {
  const grid = sheet.positionMode==='grid';
  const isImage = block.kind==='image';
  return <>
    {!compact&&<div className="map-inspector-heading">
      <h3>Propriedades do bloco</h3>
      <button type="button" className="icon-button" aria-label="Fechar propriedades do bloco" onClick={onClose}><X size={16}/></button>
    </div>}
    <label className="form-label">Título<input aria-label="Título do bloco selecionado" value={block.title} maxLength={200}
      onChange={e=>onUpdate(b=>({...b,title:e.target.value}),'title')}/></label>
    <label className="form-label">Descrição<textarea aria-label="Descrição do bloco selecionado" rows={3} value={block.description}
      maxLength={20000} placeholder="O que este bloco reúne?" onChange={e=>onUpdate(b=>({...b,description:e.target.value}),'description')}/></label>
    <label className="form-label">Aba<select aria-label="Aba do bloco selecionado" value={block.tabId} onChange={e=>onMoveTab(e.target.value)}>
      {sheet.tabs.map(tab=><option key={tab.id} value={tab.id}>{tab.title}</option>)}
    </select></label>
    {compact&&!isImage&&<div className="map-drawer-section map-field-actions">
      <h3>Campos</h3>
      {block.fields.map(field=><button type="button" key={field.id} className="button secondary" onClick={()=>onField(field.id)}>
        <Pencil size={16}/>{field.label || 'Sem nome'}
      </button>)}
      <button type="button" className="button secondary" disabled={block.fields.length>=200} onClick={()=>onField()}><Plus size={17}/> Adicionar campo</button>
    </div>}
    <BlockVisualControls key={block.id} block={block} onChange={onUpdate} busy={busy} error={error} onUpload={onUpload}/>
    <div className="map-position-heading"><Move size={14}/><span>Posição e tamanho{grid?' · encaixe em grade':''}</span></div>
    <div className="map-position-inputs">
      {([
        {key:'x', caption:'Horizontal', label:'Posição horizontal do bloco', min:0, max:MAP_LIMIT},
        {key:'y', caption:'Vertical', label:'Posição vertical do bloco', min:0, max:MAP_LIMIT},
        {key:'width', caption:'Largura', label:'Largura do bloco', min:grid?312:300, max:960},
      ] as const).map(({key,caption,label,min,max})=><label key={key}>{caption}
        <PositionInput label={label} min={min} max={max} step={grid?GRID_SIZE:1} value={block.layout[key]}
          onCommit={value=>onPlace({...block.layout,[key]:value})}/>
      </label>)}
    </div>
    <label className="form-label block-image-height">{isImage?'Altura da imagem':'Altura mínima do bloco'}
      <PositionInput label={isImage?'Altura da imagem':'Altura mínima do bloco'} min={120} max={1200}
        step={grid?GRID_SIZE:1} value={block.layout.height??(isImage?260:Math.max(120,Math.min(1200,measuredHeight??260)))}
        onCommit={height=>onPlace({...block.layout,height})}/>
    </label>
    {!isImage&&block.layout.height!==undefined&&<button type="button" className="text-button"
      onClick={()=>onPlace({x:block.layout.x,y:block.layout.y,width:block.layout.width})}>Ajustar altura ao conteúdo</button>}
    <div className="map-direction-buttons">
      <span>Mover bloco</span>
      {[
        {label:'Mover bloco para esquerda',Icon:ArrowLeft,x:-24,y:0},
        {label:'Mover bloco para cima',Icon:ArrowUp,x:0,y:-24},
        {label:'Mover bloco para baixo',Icon:ArrowDown,x:0,y:24},
        {label:'Mover bloco para direita',Icon:ArrowRight,x:24,y:0},
      ].map(({label,Icon,x,y})=><button key={label} type="button" className="icon-button" aria-label={label}
        onClick={()=>onPlace({...block.layout,x:block.layout.x+x,y:block.layout.y+y})}><Icon size={15}/></button>)}
    </div>
    <BlockConnectionControls sheet={sheet} block={block} onStart={onConnect} onRemove={onDisconnect}/>
    <div className="map-inspector-actions">
      <button type="button" className="button secondary full" disabled={sheet.blocks.length>=100} onClick={onDuplicate}><Copy size={15}/> Duplicar bloco</button>
      <button type="button" className="button danger full" onClick={onRemove}><Trash2 size={15}/> Remover bloco</button>
    </div>
  </>;
}
