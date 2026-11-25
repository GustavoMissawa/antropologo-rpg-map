'use client';

import {useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent} from 'react';
import {
  ArrowDown, Check, Dices, Download, FolderOpen, GripVertical, Grid3X3, Hand, Layers3, Link2,
  Maximize2, Minimize2, Minus, MousePointer2, Move, MoveDiagonal2, Pencil, Plus, Scan, Trash2, UserRound,
} from 'lucide-react';
import {
  copyBlock, fitMapView, positionLayout, setPositionMode, makeBlock, mapBounds, uid, GRID_SIZE,
  type Block, type BlockLayout, type Field, type Sheet, type Rulebook,
} from '../lib/model';
import {createFieldResolver} from '../lib/sheet-engine';
import {connectSheetBlocks, connectedBlockLayouts, connectedSides, pruneBlockConnections, refreshBlockConnections} from '../lib/sheet-connections';
import {fieldSpanOptions, insertBlockField, moveBlockField} from '../lib/sheet-field-layout';
import {clampMapZoom, MAX_MAP_ZOOM, MIN_MAP_ZOOM, sameBlockLayout} from '../lib/sheet-map-gestures';
import {MAX_SHEET_BYTES} from '../lib/sheet-visual';
import {SheetDialog as MapDialog} from './sheet-dialog';
import {FieldForm, SheetField} from './sheet-fields';
import {SheetDice} from './sheet-dice';
import {SheetPortrait} from './sheet-portrait';
import {RollFeedback, useSheetRoller} from './sheet-rolls';
import {BlockImageContent, prepareSheetImage} from './sheet-block-visuals';
import {SheetRollBackground} from './sheet-roll-background';
import {SheetBlockFields} from './sheet-block-fields';
import {CompactMapHeader, CompactMapTools, MapHistoryButtons, MapSelectionActions, useCompactSheetMap} from './sheet-map-chrome';
import {blockIcons, blockKinds, MapBlockIndex, MapBlockInspector} from './sheet-map-inspector';
import {useSheetEditHistory} from './use-sheet-edit-history';
import {useSheetMapGestures} from './use-sheet-map-gestures';
import {useSheetInlineKeyboard} from './use-sheet-inline-keyboard';

type Props = {
  sheet: Sheet;
  onChange: (fn: (sheet: Sheet) => Sheet) => void;
  onExport: () => void;
  onBack: () => void;
  onImport: () => void;
  onExportCopy?: () => void;
  onDiscardTemplate?: () => void;
  preview: boolean;
  onPreviewChange: (value: boolean) => void;
  isTemplate?: boolean;
  systems?: Rulebook[];
  receipt?: string;
};
type Panel = 'options' | 'identity' | 'inspect' | 'index' | null;
type FieldEditor = {blockId: string; fieldId?: string; besideId?: string; fromInspector?: boolean};
type Confirmation = {title: string; text: string; action: () => void};

export function SheetMap({
  sheet, onChange: applySheet, onExport, onBack, onImport, onExportCopy, onDiscardTemplate,
  preview, onPreviewChange, isTemplate = false, systems = [], receipt,
}: Props) {
  const compact = useCompactSheetMap();
  const {edit: onChange, activateTab, step: stepHistory, current: sheetRef, available} = useSheetEditHistory(sheet, applySheet);
  const roller = useSheetRoller(sheet);
  const cardNodes = useRef(new Map<string, HTMLElement>());
  const heightsRef = useRef<Record<string, number>>({});
  const imageRequest = useRef(0);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [imageBusy, setImageBusy] = useState<string | null>(null);
  const [imageError, setImageError] = useState<{id: string; message: string} | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [tabEditor, setTabEditor] = useState<'new' | 'rename' | null>(null);
  const [fieldEditor, setFieldEditor] = useState<FieldEditor | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [diceOpen, setDiceOpen] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [hand, setHand] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(()=>()=>{imageRequest.current++;},[]);

  const grid = sheet.positionMode === 'grid', step = grid ? GRID_SIZE : 24;
  const allBlocks = sheet.blocks, connections = sheet.connections;
  const activeTab = sheet.tabs.find(tab=>tab.id===sheet.activeTabId) ?? sheet.tabs[0];
  const activeTabId = activeTab.id;
  const blocks = useMemo(()=>allBlocks.filter(block=>block.tabId===activeTabId),[allBlocks,activeTabId]);
  const blockCounts = useMemo(()=>{
    const counts = new Map<string, number>();
    for (const block of allBlocks) counts.set(block.tabId,(counts.get(block.tabId)??0)+1);
    return counts;
  },[allBlocks]);
  const fieldLabels = useMemo(()=>new Map(allBlocks.flatMap(block=>block.fields.map(field=>[field.id,field.label] as const))),[allBlocks]);
  const resolve = createFieldResolver(sheet);
  const liveBlocks = useMemo(()=>preview ? connectedBlockLayouts(blocks,connections,heights) : blocks,[blocks,connections,heights,preview]);
  const byId = useMemo(()=>new Map(liveBlocks.map(block=>[block.id,block])),[liveBlocks]);
  const bounds = useMemo(()=>mapBounds(liveBlocks,heights),[liveBlocks,heights]);
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const connecting = !preview && connectionId && byId.has(connectionId) ? connectionId : null;
  const editedBlock = fieldEditor ? byId.get(fieldEditor.blockId) : undefined;
  const editedField = editedBlock?.fields.find(field=>field.id===fieldEditor?.fieldId);
  const expandedView = compact || expanded;

  function updateBlock(id: string, fn: (block: Block) => Block, field?: string) {
    onChange(value=>{
      const before = value.blocks.find(block=>block.id===id);
      if (!before) return value;
      const after = fn(before);
      if (before===after) return value;
      const next = {...value, blocks:value.blocks.map(block=>block.id===id?after:block)};
      return before.layout!==after.layout || before.tabId!==after.tabId
        ? refreshBlockConnections(next,id,heightsRef.current)
        : next;
    },field ? id+':'+field : undefined);
  }

  function rememberHeight(id: string, height: number) {
    if (!height || heightsRef.current[id]===height) return;
    const next = {...heightsRef.current,[id]:height};
    heightsRef.current = next;
    setHeights(next);
  }

  function commitLayout(id: string, layout: BlockLayout, kind: 'move' | 'resize', height?: number) {
    if (height!==undefined) rememberHeight(id,height);
    updateBlock(id,block=>sameBlockLayout(layout,block.layout)?block:{...block,layout});
    setStatus(kind==='move'?'Bloco posicionado.':'Tamanho ajustado.');
  }

  function openInspector(id: string) {
    setSelectedId(id);
    setPanel('inspect');
  }

  const {viewport, zoom, resizing, readView, scrollToView, changeZoom, pointerHandlers} = useSheetMapGestures({
    blocks:byId, mode:sheet.positionMode, preview, hand:!compact&&hand, compact,
    workspaceKey:sheet.id+':'+activeTabId+':'+preview, select:setSelectedId, inspect:openInspector, commit:commitLayout,
  });
  useSheetInlineKeyboard(viewport,compact);

  const firstBlock = blocks[0];
  const initialAnchor = useRef(firstBlock?.layout);
  useEffect(()=>{initialAnchor.current=firstBlock?.layout;},[firstBlock]);
  useEffect(()=>{
    const task = requestAnimationFrame(()=>{
      const first = initialAnchor.current;
      const node = viewport.current;
      if (!node) return;
      const initialZoom = compact&&first ? clampMapZoom(Math.min(1,(node.clientWidth-56)/first.width)) : 1;
      scrollToView({zoom:initialZoom,left:Math.max(0,(first?.x??0)*initialZoom-18),top:Math.max(0,(first?.y??0)*initialZoom-18)});
    });
    return ()=>cancelAnimationFrame(task);
  },[activeTabId,compact,scrollToView,viewport]);

  const visibleIds = blocks.map(block=>block.id).join('|');
  useEffect(()=>{
    const nodes = cardNodes.current;
    const current = visibleIds ? visibleIds.split('|').flatMap(id=>nodes.get(id)??[]) : [];
    function applyMeasurements(entries: {id: string; height: number}[]) {
      if (resizing.current) return;
      const before = heightsRef.current;
      let next = before;
      for (const {id,height} of entries) {
        if (!height || before[id]===height) continue;
        if (next===before) next = {...before};
        next[id] = height;
      }
      if (next!==before) {heightsRef.current=next;setHeights(next);}
    }
    const measure = ()=>applyMeasurements(current.map(node=>({id:node.dataset.blockId!,height:node.offsetHeight})));
    if (typeof ResizeObserver==='undefined') {
      const task = requestAnimationFrame(measure);
      window.addEventListener('resize',measure);
      return ()=>{cancelAnimationFrame(task);window.removeEventListener('resize',measure);};
    }
    const observer = new ResizeObserver(entries=>applyMeasurements(entries.map(({target,borderBoxSize})=>({
      id:(target as HTMLElement).dataset.blockId!,
      height:borderBoxSize?.[0]?.blockSize || (target as HTMLElement).offsetHeight,
    }))));
    for (const node of current) observer.observe(node);
    return ()=>observer.disconnect();
  },[visibleIds,preview,resizing]);

  useEffect(()=>{
    if (!expandedView) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onEscape = (event: globalThis.KeyboardEvent)=>{
      if (event.key==='Escape' && !compact && !document.querySelector('dialog[open]')) setExpanded(false);
    };
    window.addEventListener('keydown',onEscape);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onEscape);};
  },[expandedView,compact]);

  useEffect(()=>{
    if (!connecting) return;
    const cancel = (event: globalThis.KeyboardEvent)=>{if (event.key==='Escape') setConnectionId(null);};
    window.addEventListener('keydown',cancel);
    return ()=>window.removeEventListener('keydown',cancel);
  },[connecting]);

  function choseTab(id: string) {
    if (id===activeTabId) return;
    setSelectedId(null);
    setConnectionId(null);
    activateTab(id);
  }

  function choseMode(next: boolean) {
    onPreviewChange(next);
    setHand(false);
    setConnectionId(null);
    if (next) setSelectedId(null);
    else setFeedback(false);
    setPanel(null);
  }

  function handleHistory(direction: 'undo' | 'redo') {
    if (!stepHistory(direction)) return;
    imageRequest.current++;
    setImageBusy(null);
    setImageError(null);
    setConnectionId(null);
    setStatus(direction==='undo'?'Alteração desfeita.':'Alteração refeita.');
  }

  function historyKeys(event: KeyboardEvent<HTMLElement>) {
    if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.defaultPrevented) return;
    if (!(event.target instanceof Element) || event.target.closest('input, textarea, select, [contenteditable], dialog')) return;
    const key = event.key.toLowerCase();
    if (key==='z' || key==='y') {
      event.preventDefault();
      handleHistory(key==='y' || event.shiftKey ? 'redo' : 'undo');
    }
  }

  function viewportKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target!==event.currentTarget) return;
    const node=event.currentTarget;
    const movement = {ArrowLeft:[-100,0],ArrowRight:[100,0],ArrowUp:[0,-100],ArrowDown:[0,100]}[event.key];
    if (movement) {event.preventDefault();node.scrollBy({left:movement[0],top:movement[1]});}
    if (event.key==='+' || event.key==='=') {event.preventDefault();changeZoom(zoom+.1);}
    if (event.key==='-') {event.preventDefault();changeZoom(zoom-.1);}
  }

  function stepBlock(event: KeyboardEvent<HTMLButtonElement>, block: Block, kind: 'move' | 'resize') {
    const delta = kind==='resize' ? step : grid ? GRID_SIZE*(event.shiftKey?4:1) : event.shiftKey?80:16;
    const x=event.key==='ArrowLeft'?-delta:event.key==='ArrowRight'?delta:0;
    const y=event.key==='ArrowUp'?-delta:event.key==='ArrowDown'?delta:0;
    if (!x && !y) return;
    event.preventDefault();
    setSelectedId(block.id);
    const original = block.layout;
    const layout=kind==='move'?{...original,x:original.x+x,y:original.y+y}:{
      ...original, width:original.width+x,
      ...(y?{height:(original.height??heights[block.id]??260)+y}:{}),
    };
    commitLayout(block.id,positionLayout(layout,sheet.positionMode),kind);
  }

  function setGrid(next: 'free' | 'grid') {
    if (sheet.positionMode!==next) onChange(value=>setPositionMode(value,next));
    setStatus(next==='free'?'Posicionamento livre ativado.':'Encaixe na grade ativado.');
  }

  function fitAll() {
    const node=viewport.current;
    if (node) scrollToView(fitMapView(bounds,node.clientWidth,node.clientHeight-(compact?28:0),MIN_MAP_ZOOM));
  }

  function focusBlock(block: Block) {
    const current=byId.get(block.id)??block, node=viewport.current;
    if (!node) return;
    const width=node.clientWidth, height=node.clientHeight-(compact?42:0);
    const next=compact ? clampMapZoom(Math.min(1,(width-64)/current.layout.width)) : Math.max(1,readView().zoom);
    setSelectedId(current.id);
    scrollToView({
      zoom:next,
      left:Math.max(0,(current.layout.x+current.layout.width/2)*next-width/2),
      top:Math.max(0,(current.layout.y+(heightsRef.current[current.id]??260)/2)*next-height/2),
    });
  }

  function positionBlock(id: string, layout: BlockLayout) {
    const next=positionLayout(layout,sheet.positionMode);
    updateBlock(id,block=>sameBlockLayout(next,block.layout)?block:{...block,layout:next});
  }

  function startConnection(id: string) {
    setSelectedId(id);
    setHand(false);
    setPanel(null);
    setConnectionId(current=>current===id?null:id);
  }

  function finishConnection(id: string) {
    if (!connecting) return;
    try {
      const next=connectSheetBlocks(sheetRef.current,connecting,id,heightsRef.current);
      onChange(()=>next);
      setSelectedId(connecting);
      setConnectionId(null);
      setStatus('Blocos conectados. Eles aparecem juntos no Modo ficha.');
    } catch(e) {setStatus((e as Error).message);}
  }

  async function uploadImage(blockId: string, file: File) {
    const request=++imageRequest.current;
    setImageBusy(blockId);
    setImageError(null);
    try {
      const src=await prepareSheetImage(file);
      if (request!==imageRequest.current) return;
      const current=sheetRef.current, block=current.blocks.find(item=>item.id===blockId);
      if (!block) return;
      const image={src,fit:block.image?.fit??'contain' as const};
      const next={...current,blocks:current.blocks.map(item=>item.id===blockId?{...item,image}:item)};
      if (new TextEncoder().encode(JSON.stringify(next,null,2)).byteLength>MAX_SHEET_BYTES)
        throw new Error('A ficha ultrapassaria 5 MB. Remova outra imagem ou escolha uma imagem menor.');
      updateBlock(blockId,item=>({...item,image}));
      setStatus('Imagem adicionada. Ela será incluída ao salvar a ficha.');
    } catch(e) {
      if (request===imageRequest.current) setImageError({id:blockId,message:(e as Error).message});
    } finally {
      if (request===imageRequest.current) setImageBusy(null);
    }
  }

  function updateValue(block: Block, field: Field, value: Field['value']) {
    const typing=field.type==='text'||field.type==='longtext'?'field:'+field.id:undefined;
    updateBlock(block.id,item=>({...item,fields:item.fields.map(f=>f.id===field.id?{...f,value}:f)}),typing);
  }

  function duplicateBlock(block: Block) {
    if (sheet.blocks.length>=100) return;
    const copy=copyBlock(block);
    copy.layout=positionLayout(copy.layout,sheet.positionMode);
    onChange(value=>({...value,blocks:[...value.blocks,copy]}));
    setPanel(null);
    focusBlock(copy);
    setStatus('Bloco duplicado.');
  }

  function removeBlock(block: Block) {
    setPanel(null);
    setConfirmation({
      title:'Remover bloco?',
      text:'“'+(block.title||'Sem título')+'” e seus '+block.fields.length+' campos serão removidos. Campos e rolagens vinculados precisarão de uma nova origem.',
      action:()=>{
        onChange(value=>pruneBlockConnections({...value,blocks:value.blocks.filter(item=>item.id!==block.id)}));
        setSelectedId(null);
        setConnectionId(null);
        setStatus('Bloco removido.');
      },
    });
  }

  function addBlock(kind: string) {
    if (sheet.blocks.length>=100) return;
    const {zoom:level,left,top}=readView();
    const block=makeBlock(kind,activeTabId);
    const base={x:Math.max(32,left/level+32),y:Math.max(32,top/level+32),width:368};
    let layout=base;
    for (let index=0;index<24;index++) {
      const candidate={...base,x:base.x+index%3*408,y:base.y+Math.floor(index/3)*360};
      if (blocks.some(item=>candidate.x<item.layout.x+item.layout.width+16 && candidate.x+candidate.width+16>item.layout.x
          && candidate.y<item.layout.y+(heights[item.id]??260)+16 && candidate.y+250>item.layout.y)) continue;
      layout=candidate;
      break;
    }
    block.layout=positionLayout({...block.layout,...layout},sheet.positionMode);
    onChange(value=>({...value,blocks:[...value.blocks,block]}));
    setAddOpen(false);
    setStatus(grid?'Bloco adicionado na grade.':'Bloco adicionado.');
    requestAnimationFrame(()=>focusBlock(block));
  }

  function editTab(next: 'new' | 'rename') {setPanel(null);setTabEditor(next);}

  function removeTab() {
    setPanel(null);
    setConfirmation({
      title:'Remover aba?',
      text:'A aba “'+activeTab.title+'” e seus '+blocks.length+' blocos serão removidos. Os vínculos com campos removidos precisarão de uma nova origem.',
      action:()=>{
        setConnectionId(null);
        setSelectedId(null);
        onChange(value=>pruneBlockConnections({
          ...value,tabs:value.tabs.filter(tab=>tab.id!==activeTabId),
          blocks:value.blocks.filter(block=>block.tabId!==activeTabId),
          activeTabId:value.tabs.find(tab=>tab.id!==activeTabId)!.id,
        }));
      },
    });
  }

  function closeField() {
    if (fieldEditor?.fromInspector) setPanel('inspect');
    setFieldEditor(null);
  }

  const identity = <div className="map-identity">
    <SheetPortrait sheet={sheet} onChange={onChange} readOnly={preview}/>
    <div className="map-character-name">
      {!compact&&<span className="subtle-label">{isTemplate?'FICHA-MODELO DO SISTEMA':'FICHA DE PERSONAGEM'}</span>}
      {preview?<h2>{sheet.name||'Sem nome'}</h2>:<input aria-label={isTemplate?'Nome do modelo':'Nome do personagem'} value={sheet.name}
        maxLength={200} placeholder={isTemplate?'Nome da ficha-modelo':'Nome do personagem'}
        onChange={e=>onChange(value=>({...value,name:e.target.value}),'name')}/>}
    </div>
    <label className="map-player-label">{isTemplate?'Jogador padrão':'Jogador'}{preview?<span>{sheet.player||'Não informado'}</span>:
      <input aria-label="Nome do jogador" value={sheet.player} maxLength={200} placeholder="Seu nome ou apelido"
        onChange={e=>onChange(value=>({...value,player:e.target.value}),'player')}/>}</label>
    {!compact&&<div className="map-file-actions">
      <button type="button" className="button secondary" aria-expanded={diceOpen} aria-controls="sheet-dice" onClick={()=>setDiceOpen(!diceOpen)}><Dices size={18}/> Rolagem avulsa</button>
      <button type="button" className="button primary" onClick={onExport}>{isTemplate?'Salvar modelo':'Salvar'} <ArrowDown size={15}/></button>
    </div>}
    <div className="map-character-description">{preview?sheet.description&&<p>{sheet.description}</p>:
      <input aria-label={isTemplate?'Descrição do modelo':'Descrição do personagem'} value={sheet.description} maxLength={20000}
        placeholder={isTemplate?'Descreva a estrutura deste modelo':'Uma breve descrição do seu personagem…'}
        onChange={e=>onChange(value=>({...value,description:e.target.value}),'description')}/>}</div>
  </div>;
  const modes = <div className="sheet-mode-switch" role="group" aria-label="Modo da ficha">
    <button type="button" aria-pressed={!preview} onClick={()=>choseMode(false)}><Pencil size={16}/> Modo edição</button>
    <button type="button" aria-pressed={preview} onClick={()=>choseMode(true)}><UserRound size={17}/> Modo ficha</button>
  </div>;
  const positionModes = <div className="map-position-mode" role="group" aria-label="Posicionamento dos blocos">
    <button type="button" aria-pressed={!grid} onClick={()=>setGrid('free')}><Move size={15}/> Livre</button>
    <button type="button" aria-pressed={grid} onClick={()=>setGrid('grid')}><Grid3X3 size={15}/> Grade</button>
  </div>;
  const history = {...available,onStep:handleHistory};
  const dice = <SheetDice sheet={sheet} onChange={onChange} open={diceOpen} onClose={()=>setDiceOpen(false)}
    preview={preview} roller={roller} isTemplate={isTemplate} systems={systems}/>;
  const index = <MapBlockIndex title={activeTab.title} blocks={blocks} compact={compact} preview={preview} isTemplate={isTemplate}
    onFocus={block=>{setPanel(null);focusBlock(block);}}/>;
  const properties = selected&&!preview&&<MapBlockInspector sheet={sheet} block={selected} compact={compact}
    measuredHeight={heights[selected.id]} busy={imageBusy!==null} error={imageError?.id===selected.id?imageError.message:''}
    onClose={()=>setSelectedId(null)} onUpdate={(fn,field)=>updateBlock(selected.id,fn,field)} onPlace={layout=>positionBlock(selected.id,layout)}
    onMoveTab={id=>{
      if (id===selected.tabId) return;
      updateBlock(selected.id,block=>({...block,tabId:id}));
      setSelectedId(null);setConnectionId(null);setPanel(null);setStatus('Bloco movido para outra aba.');
    }}
    onUpload={file=>void uploadImage(selected.id,file)} onConnect={()=>startConnection(selected.id)}
    onDisconnect={edge=>{
      onChange(value=>pruneBlockConnections({...value,connections:value.connections?.filter(link=>link.from!==edge.from||link.to!==edge.to)}));
      setStatus('Conexão removida.');
    }}
    onDuplicate={()=>duplicateBlock(selected)} onRemove={()=>removeBlock(selected)}
    onField={fieldId=>{setPanel(null);setFieldEditor({blockId:selected.id,fieldId,fromInspector:true});}}/>;

  return <section className={'sheet-map'+(compact?' map-compact':expanded?' map-expanded':'')+(preview?' map-preview':'')}
    aria-label="Editor de ficha em mapa" onKeyDown={historyKeys}>
    <SheetRollBackground roll={roller.visualRoll} clearKey={roller.visualClear}/>
    {compact?<CompactMapHeader name={sheet.name} preview={preview} backLabel={isTemplate?'Voltar às regras':'Voltar para Fichas'}
      onBack={onBack} onInfo={()=>setPanel('identity')} onOptions={()=>setPanel('options')}/>:<>
      {identity}
      <div className="sheet-mode-bar">{modes}<p>{preview?'Toque em um campo com dado para rolar. Segure um campo para ver detalhes.':
        'Edite os blocos e use o lápis de cada campo para configurar valores e rolagens.'}</p></div>
      {dice}
    </>}

    <div className="map-tabbar">
      <div className="map-tabs" role="tablist" aria-label="Abas da ficha">
        {sheet.tabs.map((tab,i)=><button key={tab.id} id={'map-tab-'+tab.id} type="button" role="tab"
          aria-selected={tab.id===activeTabId} aria-controls="sheet-map-panel" tabIndex={tab.id===activeTabId?0:-1}
          onClick={()=>choseTab(tab.id)} onKeyDown={e=>{
            const next=e.key==='ArrowRight'?(i+1)%sheet.tabs.length:e.key==='ArrowLeft'?(i-1+sheet.tabs.length)%sheet.tabs.length:
              e.key==='Home'?0:e.key==='End'?sheet.tabs.length-1:-1;
            if (next<0) return;
            e.preventDefault();
            const id=sheet.tabs[next].id;
            choseTab(id);
            requestAnimationFrame(()=>document.getElementById('map-tab-'+id)?.focus());
          }}><Layers3 size={14}/><span>{tab.title}</span><small>{blockCounts.get(tab.id)??0}</small></button>)}
      </div>
      {!preview&&<div className="map-tab-actions">
        <button type="button" className="icon-button" aria-label="Criar aba" title="Criar aba" disabled={sheet.tabs.length>=20} onClick={()=>editTab('new')}><Plus size={17}/></button>
        {!compact&&<>
          <button type="button" className="icon-button" aria-label="Renomear aba atual" title="Renomear aba" onClick={()=>editTab('rename')}><Pencil size={14}/></button>
          <button type="button" className="icon-button" aria-label="Remover aba atual" title="Remover aba" disabled={sheet.tabs.length===1} onClick={removeTab}><Trash2 size={14}/></button>
        </>}
      </div>}
    </div>

    <div id="sheet-map-panel" role="tabpanel" aria-labelledby={'map-tab-'+activeTabId}>
      {!compact&&<div className="map-toolbar">
        <div className="map-tools-left">
          {!preview&&positionModes}
          <div className="map-tool-pair">
            <button type="button" className={!hand?'active':''} aria-label="Modo selecionar e editar" aria-pressed={!hand}
              title="Selecionar e editar" onClick={()=>setHand(false)}><MousePointer2 size={16}/></button>
            <button type="button" className={hand?'active':''} aria-label="Modo mover mapa" aria-pressed={hand}
              title="Arrastar o mapa" onClick={()=>setHand(true)}><Hand size={16}/></button>
          </div>
          {!preview&&<button className="button primary map-add" disabled={sheet.blocks.length>=100} onClick={()=>setAddOpen(true)}><Plus size={15}/> Adicionar bloco</button>}
          <MapHistoryButtons {...history}/>
        </div>
        <div className="map-zoom-tools">
          <button type="button" className="icon-button" aria-label="Diminuir zoom" disabled={zoom<=MIN_MAP_ZOOM} onClick={()=>changeZoom(zoom-.1)}><Minus size={16}/></button>
          <button type="button" className="map-zoom-value" aria-label="Restaurar zoom em 100%" title="Restaurar 100%" onClick={()=>changeZoom(1)}>{Math.round(zoom*100)}%</button>
          <button type="button" className="icon-button" aria-label="Aumentar zoom" disabled={zoom>=MAX_MAP_ZOOM} onClick={()=>changeZoom(zoom+.1)}><Plus size={16}/></button>
          <span className="map-tools-divider"/>
          <button type="button" className="icon-button" aria-label="Enquadrar todos os blocos" title="Enquadrar todos" onClick={fitAll}><Scan size={18}/></button>
          <button type="button" className="icon-button" aria-label={expanded?'Sair da tela ampliada':'Ampliar editor'} onClick={()=>setExpanded(!expanded)}>
            {expanded?<Minimize2 size={17}/>:<Maximize2 size={17}/>}
          </button>
        </div>
      </div>}

      <div className="map-workspace">
        <div className="map-viewport-wrap">
          {connecting&&<div className="map-connection-prompt" role="status">
            <span>Selecione outro bloco para conectar a <strong>{byId.get(connecting)?.title||'este bloco'}</strong>.</span>
            <button type="button" className="text-button" onClick={()=>setConnectionId(null)}>Cancelar conexão</button>
          </div>}
          <div ref={viewport} className={'map-viewport'+(!compact&&hand?' hand-mode':'')+(grid?' grid-mode':'')}
            aria-label={'Mapa da aba '+activeTab.title} tabIndex={0} onKeyDown={viewportKeys} {...pointerHandlers}
            onContextMenu={e=>{
              if (compact && e.target instanceof Element && !e.target.closest('input, textarea, [contenteditable], a'))
                e.preventDefault();
            }}
            style={{'--map-world-width':Math.max(1450,bounds.right+220)+'px','--map-world-height':Math.max(1000,bounds.bottom+220)+'px'} as CSSProperties}>
            <div className="map-spacer"><div className={'map-world'+(grid?' grid-world':'')}>
              {liveBlocks.map((block,i)=>{
                const Icon=blockIcons[block.kind]??Layers3;
                const active=selectedId===block.id&&!preview;
                const isImage=block.kind==='image';
                const showHandles=!preview&&(!compact||active);
                const title=block.title||'Sem título';
                return <article key={block.id} data-block-id={block.id}
                  ref={node=>{if (node) cardNodes.current.set(block.id,node);else cardNodes.current.delete(block.id);}}
                  className={'map-block'+(block.color?' has-custom-color':'')+(active?' is-selected':'')+(isImage?' map-image-block':'')}
                  data-connected-sides={preview?connectedSides(block.id,connections):undefined} aria-label={'Bloco '+title}
                  style={{
                    left:block.layout.x,top:block.layout.y,zIndex:active?3:1,
                    '--map-block-width':block.layout.width+'px',
                    '--map-block-min-height':!isImage&&block.layout.height!==undefined?block.layout.height+'px':undefined,
                    ...(block.color?{'--block-color':block.color}:{}),
                  } as CSSProperties}>
                  <div className="map-block-header">
                    <span className="map-block-kind"><Icon size={17}/></span>
                    {preview?<h3>{title}</h3>:<button type="button" className="map-block-drag"
                      aria-label={showHandles?'Mover bloco '+title:'Selecionar bloco '+title} data-map-gesture={showHandles?'move':undefined}
                      title="Arraste pela alça ou use as setas" onClick={()=>setSelectedId(block.id)}
                      onKeyDown={e=>{if (showHandles) stepBlock(e,block,'move');}}>
                      <span>{title}</span>{showHandles&&<GripVertical size={18}/>}
                    </button>}
                    {!preview&&!compact&&<button type="button" className="icon-button map-connect-button" aria-label={'Conectar bloco '+title}
                      aria-pressed={connecting===block.id} onClick={()=>startConnection(block.id)}><Link2 size={17}/></button>}
                    {!compact&&<span className="map-block-count">{String(i+1).padStart(2,'0')}</span>}
                  </div>
                  {block.description&&<p className="map-block-description">{block.description}</p>}
                  {isImage&&<BlockImageContent block={block} preview={preview} busy={imageBusy!==null} onUpload={file=>void uploadImage(block.id,file)}/>}
                  <SheetBlockFields block={block} preview={preview} onAddBeside={id=>setFieldEditor({blockId:block.id,besideId:id})}
                    renderField={(field,index)=><SheetField key={field.id} field={field} preview={preview} resolve={resolve}
                      sourceLabel={fieldLabels.get(field.dependency?.sourceId??'')} onChange={value=>updateValue(block,field,value)}
                      rolling={roller.busy} onRoll={()=>{if(field.roll){roller.launch({name:field.label||'Campo',...field.roll,fieldId:field.id});setFeedback(true);}}}
                      onEdit={()=>setFieldEditor({blockId:block.id,fieldId:field.id})}
                      editLabel={'Editar campo '+(field.label||index+1)+' de '+title}/>}/>
                  {!isImage&&!block.fields.length&&<div className="map-block-empty"><Icon size={22}/><p>Nenhum campo neste bloco.</p></div>}
                  {!preview&&!isImage&&<button type="button" className="map-add-field" disabled={block.fields.length>=200}
                    onClick={()=>setFieldEditor({blockId:block.id})}><Plus size={14}/> Adicionar campo abaixo</button>}
                  {showHandles&&<button type="button" className={'map-resize'+(isImage?' image-resize':'')}
                    aria-label={'Ajustar tamanho de '+title} title="Arraste ou use as setas para ajustar o tamanho"
                    data-map-gesture="resize" onKeyDown={e=>stepBlock(e,block,'resize')}><MoveDiagonal2 size={17}/></button>}
                  {connecting&&connecting!==block.id&&<button type="button" className="map-connect-target" aria-label={'Conectar a '+title}
                    onClick={()=>finishConnection(block.id)}><span><Link2 size={17}/> Conectar a {title}</span></button>}
                </article>;
              })}
            </div></div>
            {!blocks.length&&<div className="map-empty">
              <span className="map-empty-icon"><Layers3 size={30}/></span>
              <h3>Esta aba está vazia</h3>
              {!preview&&<><p>Adicione um bloco para começar a ficha.</p><button type="button" className="button primary"
                disabled={sheet.blocks.length>=100} onClick={()=>setAddOpen(true)}><Plus size={16}/> Adicionar primeiro bloco</button></>}
            </div>}
          </div>
          {compact?<><CompactMapTools zoom={zoom} preview={preview} full={sheet.blocks.length>=100} history={history}
            onAdd={()=>setAddOpen(true)} onZoom={changeZoom} onFit={fitAll}/>
            {selected&&!preview&&!connecting&&<MapSelectionActions title={selected.title} onInspect={()=>openInspector(selected.id)}
              onFit={()=>focusBlock(selected)} onClear={()=>setSelectedId(null)}/>}</>:
            <div className="map-statusbar"><span><span className="online-dot"/>{blocks.length} {blocks.length===1?'bloco':'blocos'} nesta aba</span>
              <span className="map-status-hint">{grid?'Encaixe na grade':'Arraste o fundo para navegar · + / − para zoom'}</span></div>}
        </div>
        {!compact&&<aside className="map-inspector" aria-label={properties?'Propriedades do bloco':'Índice da aba'}>{properties||index}</aside>}
      </div>
    </div>

    <div className="map-bottom-note">
      {!compact&&<span>{isTemplate?'Salvar modelo atualiza o sistema. Salvar regras baixa o pacote completo.':
        'Rascunho temporário · use Salvar para guardar a ficha.'}</span>}
      <span className="map-announcement" role="status" aria-live="polite">{status||(compact?receipt:'')}</span>
    </div>

    {compact&&panel==='options'&&<MapDialog drawer title="Opções do Canvas" onClose={()=>setPanel(null)}>
      <div className="map-drawer-section">{modes}{!preview&&positionModes}</div>
      <div className="map-drawer-section map-option-list">
        <button type="button" className="button primary" onClick={()=>{setPanel(null);onExport();}}><Download size={17}/> {isTemplate?'Salvar modelo':'Salvar'}</button>
        {onExportCopy&&<button type="button" className="button secondary" onClick={()=>{setPanel(null);onExportCopy();}}><Download size={17}/> Exportar ficha</button>}
        <button type="button" className="button secondary" onClick={()=>{setPanel(null);setDiceOpen(true);}}><Dices size={17}/> Rolagem avulsa</button>
        <button type="button" className="button secondary" onClick={()=>setPanel('index')}><Layers3 size={17}/> Blocos desta aba</button>
        <button type="button" className="button secondary" onClick={()=>{setPanel(null);changeZoom(1);}}><Scan size={17}/> Restaurar zoom</button>
        {!isTemplate&&<button type="button" className="button secondary" onClick={()=>{setPanel(null);onImport();}}><FolderOpen size={17}/> Carregar ficha</button>}
      </div>
      {!preview&&<div className="map-drawer-section map-option-list">
        <h3>Aba atual</h3>
        <button type="button" className="button secondary" onClick={()=>editTab('rename')}><Pencil size={16}/> Renomear aba atual</button>
        <button type="button" className="button secondary" disabled={sheet.tabs.length===1} onClick={removeTab}><Trash2 size={16}/> Remover aba atual</button>
      </div>}
      {onDiscardTemplate&&<div className="map-drawer-section"><button type="button" className="text-button"
        onClick={()=>{setPanel(null);onDiscardTemplate();}}>Descartar alterações do modelo</button></div>}
    </MapDialog>}
    {compact&&panel==='identity'&&<MapDialog drawer title={isTemplate?'Dados da ficha-modelo':'Dados da ficha'} onClose={()=>setPanel(null)}>
      {identity}<div className="modal-footer"><button type="button" className="button primary" onClick={()=>setPanel(null)}>Concluir</button></div>
    </MapDialog>}
    {compact&&panel==='inspect'&&properties&&<MapDialog drawer title="Propriedades do bloco" onClose={()=>setPanel(null)}>{properties}</MapDialog>}
    {compact&&panel==='index'&&<MapDialog drawer title={'Blocos de '+activeTab.title} onClose={()=>setPanel(null)}>{index}</MapDialog>}
    {compact&&diceOpen&&<MapDialog drawer title="Rolagens da ficha" onClose={()=>setDiceOpen(false)}>{dice}</MapDialog>}

    {addOpen&&<MapDialog drawer={compact} title="O que vamos colocar no mapa?" onClose={()=>setAddOpen(false)}>
      <div className="block-options">{blockKinds.map(({kind,title,description,Icon})=><button type="button" key={kind} onClick={()=>addBlock(kind)}>
        <span className="block-option-icon"><Icon size={22}/></span><span><strong>{title}</strong><small>{description}</small></span><Plus size={18}/>
      </button>)}</div>
    </MapDialog>}
    {tabEditor&&<MapDialog drawer={compact} title={tabEditor==='new'?'Criar aba':'Renomear aba'} onClose={()=>setTabEditor(null)}>
      <form onSubmit={e=>{
        e.preventDefault();
        const title=String(new FormData(e.currentTarget).get('title')??'').trim();
        if (!title) return;
        if (tabEditor==='new') {
          if (sheet.tabs.length>=20) return;
          const tab={id:uid(),title};
          onChange(value=>({...value,tabs:[...value.tabs,tab],activeTabId:tab.id}));
          setSelectedId(null);setConnectionId(null);setStatus('Nova aba criada.');
        } else onChange(value=>({...value,tabs:value.tabs.map(tab=>tab.id===activeTabId?{...tab,title}:tab)}));
        setTabEditor(null);
      }}>
        <label className="form-label">Nome da aba<input name="title" autoFocus required maxLength={60} defaultValue={tabEditor==='rename'?activeTab.title:''}
          placeholder="Ex.: Combate, Inventário, História"/></label>
        <div className="modal-footer"><button className="button secondary" type="button" onClick={()=>setTabEditor(null)}>Cancelar</button>
          <button className="button primary" type="submit">{tabEditor==='new'?'Criar aba':'Aplicar'}<Check size={15}/></button></div>
      </form>
    </MapDialog>}
    {fieldEditor&&editedBlock&&<FieldForm drawer={compact} sheet={sheet} blockId={editedBlock.id}
      besideLabel={editedBlock.fields.find(field=>field.id===fieldEditor.besideId)?.label}
      columns={editedField?fieldSpanOptions(editedBlock,editedField.id):1}
      key={fieldEditor.blockId+':'+(fieldEditor.fieldId||fieldEditor.besideId||'new')} field={editedField}
      index={editedBlock.fields.findIndex(field=>field.id===editedField?.id)} count={editedBlock.fields.length}
      onClose={closeField}
      onMove={delta=>{if (editedField) updateBlock(editedBlock.id,block=>moveBlockField(block,editedField.id,delta));}}
      onSave={field=>{
        updateBlock(editedBlock.id,block=>{
          if (editedField) return {...block,fields:block.fields.map(item=>item.id===field.id?field:item)};
          const next=insertBlockField(block,field,fieldEditor.besideId);
          return {...next,layout:positionLayout(next.layout,sheet.positionMode)};
        });
        closeField();
        setStatus(editedField?'Campo atualizado.':fieldEditor.besideId?'Campo adicionado ao lado.':'Campo adicionado.');
      }}
      onDelete={()=>{
        setFieldEditor(null);
        setConfirmation({title:'Remover campo?',text:'O campo “'+(editedField?.label||'Sem nome')+'” e seu valor serão removidos.',
          action:()=>updateBlock(editedBlock.id,block=>({...block,fields:block.fields.filter(field=>field.id!==editedField?.id)}))});
      }}/>}
    {confirmation&&<MapDialog drawer={compact} title={confirmation.title} onClose={()=>setConfirmation(null)}>
      <p className="modal-intro">{confirmation.text}</p>
      <div className="modal-footer">
        <button type="button" className="button secondary" onClick={()=>setConfirmation(null)}>Cancelar</button>
        <button type="button" className="button danger" onClick={()=>{confirmation.action();setConfirmation(null);}}>Remover <Trash2 size={15}/></button>
      </div>
    </MapDialog>}
    <RollFeedback roller={roller} visible={feedback} onClose={()=>setFeedback(false)}
      onHistory={()=>{setDiceOpen(true);setFeedback(false);if (!compact) requestAnimationFrame(()=>document.getElementById('sheet-dice')?.scrollIntoView({block:'start'}));}}/>
  </section>;
}
