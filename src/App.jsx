import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  addEdge, applyNodeChanges, applyEdgeChanges, ReactFlowProvider,
  useReactFlow, Panel, BackgroundVariant,
} from '@xyflow/react';

import GitHubSyncDialog from './GitHubSyncDialog.jsx';
import {openDraftStorage} from './draft-storage.js';
import {fetchSharedMap, REPOSITORY_URL} from './github-sync.js';
import {
  INITIAL_REVISION, MAP_FORMAT, MAX_MAP_BYTES, mapEquals,
  resolveInitialMap, restoreMap, snapshotMap, styleEdge,
} from './map-state.js';
import {DEFAULT_VERSION, VERSIONS, checkMapVersion, readVersionedEdition} from './versions.js';
const asset = (path) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`;
const tagName = (s='') => s.startsWith('PÁGINA') ? 'PÁGINA' : s || 'INFORMAÇÃO';
const baseColors = { overview: '#7b9dff', pending: '#f59e0b', global:'#3fc0a7', system:'#ad8dff', rules:'#6db4ff', sheet:'#ff8a9e', dice:'#ebb978', files:'#70c7e8', account:'#c6a5fc', cross:'#9badbf' };

function makeNodes(model) {
  const lanes = model.lanes.filter(l => l.cardIds?.length);
  const lanePosition = new Map();
  const sectionLaneCounts = new Map();
  for (const lane of lanes) {
    const seq = sectionLaneCounts.get(lane.section) || 0;
    sectionLaneCounts.set(lane.section, seq + 1);
    lanePosition.set(lane.id, seq);
  }
  const caps = new Map(model.screenshots.map(s => [s.code, s]));
  return model.cards.map(c => {
    const firstImage = c.refs.map(r => caps.get(r)).find(s => s?.image);
    const ix = Number(c.order);
    const laneIx = lanePosition.get(c.lane) || 0;
    return {
      id: c.id,
      type: 'screen',
      deletable: false,
      position: { x: 60 + ix * 440, y: 110 + laneIx * 485 },
      data: {
        ...c,
        laneTitle: lanes.find(x => x.id === c.lane)?.title || '',
        image: firstImage?.image || null,
        screenshotCount: c.refs.filter(r => caps.get(r)?.image).length,
        missingRefs: c.refs.filter(r => !caps.get(r)?.image),
      },
    };
  });
}
function makeEdges(model) {
  return model.connections.map(e => styleEdge({
    id:e.id, source:e.source, target:e.target, label:e.label,
    data:{section:e.section,figmaDerived:true},
  },true));
}
function ScreenNode({ data, selected }) {
  const image = data.image;
  const color = baseColors[data.section] || '#72839e';
  return <div className={'flow-node' + (selected ? ' selected' : '')} style={{'--node-accent':color}}>
    <Handle type="target" position={Position.Left} className="flow-handle" />
    <div className="node-head"><span className="node-kind">{tagName(data.kind)}</span>{data.route && <code className="node-route">{data.route}</code>}</div>
    <div className="node-title">{data.title}</div>
    <div className="node-description">{data.description || 'Sem descrição adicional registrada.'}</div>
    {image ? <img className="node-image" src={asset(image)} alt={`Captura da tela ${data.title}`} loading="lazy" draggable="false" /> : <div className="node-image missing">Sem captura associada</div>}
    <div className="node-foot"><span>{data.refs.length ? data.refs.join(' · ') : 'Sem referência'}</span><span>{data.screenshotCount || 0} imagem(ns)</span></div>
    <Handle type="source" position={Position.Right} className="flow-handle" />
  </div>;
}
const nodeTypes = { screen:ScreenNode };

const serializeDraft = (draft, baseline) => JSON.stringify({...draft,sync:baseline});

function VersionPicker({version, onChange}) {
  return (
    <select className="version-picker" aria-label="Versão do projeto" value={version.id} onChange={event=>onChange(event.target.value)}>
      {Object.values(VERSIONS).map(option=><option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  );
}

function AppInner({version, onVersionChange}) {
  const [model,setModel] = useState(null);
  const [sourceAvailable,setSourceAvailable] = useState(false);
  const [nodes,setNodes] = useState([]);
  const [edges,setEdges] = useState([]);
  const [section,setSection] = useState('overview');
  const [view,setView] = useState('map');
  const [filter,setFilter] = useState('');
  const [device,setDevice] = useState('todos');
  const [selected,setSelected] = useState(null);
  const [toast,setToast] = useState('');
  const [loadError,setLoadError] = useState('');
  const [baseline,setBaseline] = useState(null);
  const [storeStatus,setStoreStatus] = useState('shared');
  const [syncOpen,setSyncOpen] = useState(false);
  const [notes,setNotes] = useState('');
  const [editTitle,setEditTitle] = useState('');
  const [editDescription,setEditDescription] = useState('');
  const inputRef=useRef(null);
  const draftStorage=useRef(null);
  const pendingDraft=useRef(null);
  const lastPersisted=useRef(null);
  const flow=useReactFlow();
  const toastTimer=useRef(null);
  const message = useCallback((t)=>{setToast(t);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3500)},[]);

  const original = useMemo(()=>model ? {nodes:makeNodes(model),edges:makeEdges(model)} : null,[model]);
  const draft = useMemo(()=>model ? snapshotMap(nodes,edges) : null,[model,nodes,edges]);
  const serializedDraft = useMemo(()=>draft&&baseline ? serializeDraft(draft,baseline) : null,[draft,baseline]);
  const dirty = !!baseline && !mapEquals(draft,baseline.draft);

  useEffect(()=>{
    const controller = new AbortController();
    const signal = controller.signal;
    const fromSite = (path) => fetch(asset(path),{signal,cache:'no-store'}).then(response=>{
      if(!response.ok)throw Error('Arquivo indisponível: '+path);
      return response.json();
    });
    Promise.all([
      fromSite(version.dataPath+'/map.json'),
      fromSite(version.dataPath+'/edicoes.json').then(document=>readVersionedEdition(document,version.id)).catch(()=>null),
      fromSite('/data/fontes.json').then(sources=>sources?.[version.id]===true).catch(()=>false),
    ]).then(async ([doc,published,source])=>{
      if(signal.aborted)return;
      const defaults = {nodes:makeNodes(doc),edges:makeEdges(doc)};
      const storage = openDraftStorage(window,version.storageKey);
      const {saved} = storage;
      const initial = {revision:INITIAL_REVISION,draft:null};
      let loaded;
      const savedRevision = saved?.sync?.revision;
      if (typeof savedRevision === 'string' && savedRevision && savedRevision !== published?.revision) {
        const request = new AbortController();
        const cancelRequest = ()=>request.abort();
        signal.addEventListener('abort',cancelRequest,{once:true});
        const timeout = setTimeout(cancelRequest,3000);
        try {
          const {document} = await fetchSharedMap({versionId:version.id,signal:request.signal});
          loaded = resolveInitialMap(defaults,document,saved);
        } catch {
          // A previous sync may be newer than the copy served by Pages.
        } finally {
          clearTimeout(timeout);
          signal.removeEventListener('abort',cancelRequest);
        }
      }
      if(signal.aborted)return;
      if(!loaded) {
        try { loaded = resolveInitialMap(defaults,published ?? initial,saved,{preserveConfirmed:true}); }
        catch {
          loaded = resolveInitialMap(defaults,initial,saved,{preserveConfirmed:true});
          message('As edições publicadas estão indisponíveis. Foi aberta a versão disponível do mapa.');
        }
      }
      if(storage.invalid||loaded.invalidLocal)message('O rascunho local está inválido. Foi aberta a versão disponível do mapa.');
      draftStorage.current = storage;
      lastPersisted.current = serializeDraft(snapshotMap(loaded.map.nodes,loaded.map.edges),loaded.baseline);
      setStoreStatus(storage.status);
      setNodes(loaded.map.nodes);
      setEdges(loaded.map.edges);
      setBaseline(loaded.baseline);
      setModel(doc);
      setSourceAvailable(source);
    }).catch(error=>{if(!signal.aborted)setLoadError(error.message);});
    return ()=>controller.abort();
  },[message,version]);

  const persistDraft = useCallback((serialized)=>{
    pendingDraft.current = serialized;
    if(!serialized||serialized===lastPersisted.current)return;
    const status = draftStorage.current.save(serialized);
    if(status!=='unavailable')lastPersisted.current = serialized;
    setStoreStatus(status);
    return status;
  },[]);

  useLayoutEffect(()=>{
    pendingDraft.current = serializedDraft;
    if(!serializedDraft||serializedDraft===lastPersisted.current)return;
    const persist = ()=>persistDraft(pendingDraft.current);
    const timer = setTimeout(persist,400);
    window.addEventListener('pagehide',persist);
    return ()=>{
      clearTimeout(timer);
      window.removeEventListener('pagehide',persist);
    };
  },[serializedDraft,persistDraft]);

  const onNodesChange = useCallback(changes=>setNodes(prev=>applyNodeChanges(changes,prev)),[]);
  const onEdgesChange = useCallback(changes=>setEdges(prev=>applyEdgeChanges(changes,prev)),[]);
  const onConnect = useCallback(connection=>{
    setEdges(prev=>addEdge(styleEdge({
      ...connection,id:`manual-${crypto.randomUUID()}`,label:'Ligação manual',data:{section,figmaDerived:false},
    },false),prev));
    message('Conexão manual adicionada ao rascunho local.');
  },[section,message]);

  const visibleNodes = useMemo(()=>nodes.filter(n=>{
    if(n.data.section!==section)return false;
    if(!filter.trim())return true;
    const q=filter.toLocaleLowerCase('pt-BR');
    return [n.data.title,n.data.description,n.data.kind,n.data.route,n.data.refs.join(' ')].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(q);
  }).map(n=>({ ...n,data:{...n.data,image:device==='todos'?n.data.image:
     (model?.screenshots.find(c=>c.code===n.data.refs.find(r=>model?.screenshots.some(s=>s.code===r&&s.device===device&&s.image)))?.image||n.data.image)}})),[nodes,section,filter,device,model]);
  const visibleIDs=useMemo(()=>new Set(visibleNodes.map(n=>n.id)),[visibleNodes]);
  const visibleEdges=useMemo(()=>edges.filter(e=>visibleIDs.has(e.source)&&visibleIDs.has(e.target)),[edges,visibleIDs]);
  const activeNode=nodes.find(n=>n.id===selected);
  const sections=model?.sections||[];
  const lanes=(model?.lanes||[]).filter(x=>x.section===section);
  const screenshots=useMemo(()=>{
    if(!model)return [];
    return model.screenshots.filter(s=>(device==='todos'||s.device===device)&&(!filter||[s.code,s.formerCode,s.title,s.device].join(' ').toLowerCase().includes(filter.toLowerCase())));
  },[model,device,filter]);

  useEffect(()=>{
    if (!activeNode) return;
    setEditTitle(activeNode.data.title);setEditDescription(activeNode.data.description);setNotes(activeNode.data.notes||'');
  },[selected]);
  useEffect(()=>{
    if(!model||view!=='map')return;
    const t=setTimeout(()=>flow.fitView({padding:0.18,duration:350}),170);
    return ()=>clearTimeout(t);
  },[section,view,model,flow]);

  const exportJSON=()=>{
    const obj={format:MAP_FORMAT,projectVersion:version.id,exportedAt:new Date().toISOString(),source:model.source,...draft};
    const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=`antropologo-mapa-v${version.id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    message('Mapa exportado com posições e conexões.');
  };
  const importJSON=async(evt)=>{
    const file=evt.target.files?.[0];
    if(!file)return;
    try {
      if(file.size>MAX_MAP_BYTES)throw Error('O arquivo excede 900 kB.');
      const content=JSON.parse(await file.text());
      if(content?.format!==MAP_FORMAT)throw Error('Formato de mapa inválido.');
      checkMapVersion(content,version.id);
      const restored=restoreMap(content,original);
      setSelected(null);
      setNodes(restored.nodes);
      setEdges(restored.edges);
      message('Mapa importado no rascunho local.');
    }catch(error){message('Não foi possível importar. '+error.message);}
    finally{evt.target.value='';}
  };
  const reset=()=>{
    if(!window.confirm('Restaurar a base recuperada do mapa? Isso descarta o rascunho aberto.'))return;
    setSelected(null);
    setNodes(original.nodes);
    setEdges(original.edges);
    message('Base restaurada no rascunho local.');
  };
  const toDraft=(snapshot)=>{
    const next=restoreMap(snapshot,original);
    return snapshotMap(next.nodes,next.edges);
  };
  const applyRemote=(remote)=>{
    const next=restoreMap(remote.draft,original);
    setSelected(null);
    setNodes(next.nodes);
    setEdges(next.edges);
    setBaseline(remote);
    persistDraft(serializeDraft(remote.draft,remote));
  };
  const rememberPublished=(remote)=>{
    persistDraft(serializeDraft(remote.draft,remote));
    setBaseline(remote);
  };
  const selectView=(next)=>{
    setSelected(null);
    setView(next);
    if(next==='map'&&device==='extra')setDevice('todos');
  };
  const openCard=(id)=>{
    const target=nodes.find(n=>n.id===id);
    if(!target)return;
    setSection(target.data.section);
    selectView('map');
    setFilter('');
    setSelected(id);
  };
  const relatedPaths=(model?.journeys||[]).filter(path=>path.source===selected||path.target===selected);
  const saveText=()=>{
    if(!activeNode)return;
    setNodes(p=>p.map(n=>n.id===activeNode.id?{...n,data:{...n.data,title:editTitle,description:editDescription,notes}}:n));message('Alterações aplicadas ao rascunho.');
  };
  const switchVersion=(next)=>{
    const unapplied = activeNode && (editTitle!==activeNode.data.title ||
      editDescription!==activeNode.data.description || notes!==(activeNode.data.notes||''));
    if(unapplied && !window.confirm('Há alterações no cartão que ainda não foram aplicadas. Trocar de versão mesmo assim?'))return;
    if(persistDraft(pendingDraft.current)==='unavailable' &&
        !window.confirm('O navegador não conseguiu guardar este rascunho. Trocar de versão mesmo assim?'))return;
    clearTimeout(toastTimer.current);
    onVersionChange(next);
  };

  const draftStatus = storeStatus==='unavailable' ? 'O navegador não está guardando o rascunho. Exporte uma cópia.'
    : storeStatus==='tab'&&dirty ? 'Rascunho guardado nesta aba. Exporte antes de fechá-la.'
    : dirty ? 'Rascunho local · envio manual ao GitHub' : 'Mapa na versão de referência';

  if(loadError)return <div className="loading-screen"><div role="alert">{loadError}<br/>
    <VersionPicker version={version} onChange={onVersionChange}/>
    <button className="btn secondary" onClick={()=>window.location.reload()}>Tentar novamente</button></div></div>;
  if(!model)return <div className="loading-screen"><div className="loading-orb"/>Carregando mapa do ANTROPOLOGO RPG...</div>;
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol">A<span>·</span></div><div><b>ANTROPOLOGO</b><small>ATLAS DO RPG · V{version.id}</small></div></div>
      <div className="sidebar-label">ESPAÇO DE TRABALHO</div>
      <button className={`sidebar-view ${view==='map'?'active':''}`} aria-label="Mapa interativo" onClick={()=>selectView('map')}>◇ <span>Mapa interativo</span><strong>{model.cards.length}</strong></button>
      <button className={`sidebar-view ${view==='gallery'?'active':''}`} aria-label="Galeria de capturas" onClick={()=>selectView('gallery')}>▦ <span>Galeria de capturas</span><strong>{model.summary.screenshotsInFig}</strong></button>
      <div className="sidebar-label sections-label">ÁREAS MAPEADAS</div>
      <nav className="section-nav">{sections.map(s=><button key={s.id} className={'section-nav-item '+(section===s.id&&view==='map'?'on':'')} aria-label={s.label} onClick={()=>{setSection(s.id);selectView('map');setFilter('')}}><span className="section-dot" style={{background:s.color}}/><span>{s.label}</span><span className="section-count">{model.cards.filter(c=>c.section===s.id).length}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="source-bullet"><span className="source-dot"/>Backup Figma importado</div><span>{model.summary.figmaNodes.toLocaleString('pt-BR')} elementos na origem</span><a href={REPOSITORY_URL} rel="noreferrer" target="_blank">Abrir repositório ↗</a></div>
    </aside>
    <main className="main">
      <header className="header">
        <div className="heading">
          <div className="version-controls">
            <VersionPicker version={version} onChange={switchVersion}/>
            {sourceAvailable
              ? <a href={`${REPOSITORY_URL}/${version.sourcePath}`} target="_blank" rel="noreferrer">Código-fonte ↗</a>
              : <span>Código-fonte pendente</span>}
          </div>
          <h1>{view==='gallery'?'Biblioteca de capturas':sections.find(s=>s.id===section)?.label||'Mapa geral'}</h1>
          <p>{view==='gallery'?'Capturas da v0.38 recuperadas da exportação original.':sections.find(s=>s.id===section)?.description || 'Fluxos, páginas, estados e ações mapeados.'}</p>
        </div>
        <div className="header-controls"><button className="btn secondary" onClick={()=>setSyncOpen(true)}>Sincronizar GitHub</button><button className="btn secondary" onClick={reset} title="Voltar à base recuperada">↺ Restaurar</button><button className="btn secondary" onClick={()=>inputRef.current?.click()}>⇧ Importar JSON</button><button className="btn primary" onClick={exportJSON}>↓ Exportar mapa</button><input type="file" ref={inputRef} accept=".json,application/json" hidden onChange={importJSON}/></div>
      </header>
      <div className="toolbar"><div className="search-wrapper"><span>⌕</span><input aria-label="Buscar páginas e capturas" value={filter} onChange={e=>setFilter(e.target.value)} placeholder={view==='map'?'Buscar páginas, funções, rotas ou códigos D/M...':'Buscar códigos e nomes das capturas...'}/></div><div className="segmented"><button className={device==='todos'?'current':''} onClick={()=>setDevice('todos')}>Todos</button><button className={device==='desktop'?'current':''} onClick={()=>setDevice('desktop')}>Desktop</button><button className={device==='mobile'?'current':''} onClick={()=>setDevice('mobile')}>Mobile</button>{view==='gallery'&&<button className={device==='extra'?'current':''} onClick={()=>setDevice('extra')}>Extras</button>}</div><div className="counter">{view==='map'?`${visibleNodes.length} cartões · ${visibleEdges.length} conexões`: `${screenshots.length} referências`}</div></div>
      {view==='map'?<div className="canvas-wrap"><ReactFlow nodeTypes={nodeTypes} nodes={visibleNodes} edges={visibleEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_,node)=>setSelected(node.id)} onPaneClick={()=>setSelected(null)} minZoom={0.06} maxZoom={2} fitView fitViewOptions={{padding:0.18}} nodesDraggable nodesConnectable elementsSelectable deleteKeyCode="Delete" colorMode="dark" connectionLineStyle={{stroke:'#3fc0a7',strokeWidth:2}}><Background variant={BackgroundVariant.Dots} color="#334156" gap={24} size={1}/><Controls position="bottom-left"/><MiniMap pannable zoomable nodeColor={n=>baseColors[n.data.section]||'#888'} maskColor="rgba(8, 12, 20, 0.67)" style={{background:'#111927',border:'1px solid #2b3b50'}}/><Panel position="top-left"><div className="canvas-help">Arraste cartões para reorganizar. Puxe os pontos laterais para conectar. Clique para consultar detalhes.</div></Panel></ReactFlow><div className="lane-legend">{lanes.map(l=><span key={l.id}>{l.title} <b>{l.cardIds.length}</b></span>)}</div></div>:<div className="gallery-scroll"><div className="gallery-intro"><b>{model.summary.catalogedScreenshots} capturas catalogadas</b><span>81 desktop, 68 mobile e uma prancha de referência em Extras.</span></div><div className="gallery-grid">{screenshots.map(s=><button className="gallery-card" key={s.code} onClick={()=>window.open(asset(s.image),'_blank','noopener')}><div className="gallery-img"><img src={asset(s.image)} alt={s.title} loading="lazy"/></div><div className="gallery-caption"><strong>{s.code}</strong><span>{s.title}</span></div></button>)}</div></div>}
      <footer className="statusbar"><div><span className="green-dot"/>{draftStatus}</div><div>Importação do Figma · {model.summary.flowCards} cartões · {model.summary.verifiedLabeledTransitions} conexões rotuladas</div></footer>
    </main>
    {activeNode&&view==='map'&&<aside className="details"><div className="details-top"><span>DETALHES DO ELEMENTO</span><button onClick={()=>setSelected(null)} title="Fechar">✕</button></div><div className="detail-subtitle">{tagName(activeNode.data.kind)} {activeNode.data.route&&<code>{activeNode.data.route}</code>}</div><label>Título<input value={editTitle} onChange={e=>setEditTitle(e.target.value)}/></label><label>Descrição<textarea rows={5} value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></label><label>Suas observações<textarea rows={4} placeholder="Adicione decisões, tarefas ou notas..." value={notes} onChange={e=>setNotes(e.target.value)}/></label><button className="btn primary save-detail" onClick={saveText}>Salvar alterações</button>{relatedPaths.length>0&&<><h3>Caminhos e retornos</h3><ul className="card-journeys">{relatedPaths.map(path=>{
      const outgoing=path.source===selected;
      const related=nodes.find(node=>node.id===(outgoing?path.target:path.source));
      if(!related)return null;
      return <li key={path.source+'-'+path.target+'-'+path.label}><button type="button" onClick={()=>openCard(related.id)}>
        <span>{outgoing?'Ir para':'Chega de'} · {related.data.title}</span><small>{path.label}</small>
      </button></li>;
    })}</ul></>}<h3>Capturas relacionadas</h3>{activeNode.data.refs.length?activeNode.data.refs.map(ref=>{const s=model.screenshots.find(x=>x.code===ref);return <div className="detail-image" key={ref}><div className="detail-image-label"><strong>{ref}</strong> {s?.title||'Referência sem captura individual no arquivo'}</div>{s?.image?<img onClick={()=>window.open(asset(s.image),'_blank','noopener')} src={asset(s.image)} loading="lazy" alt={`Captura ${ref}`}/>:<div className="missing-capture">Sem imagem vinculada no .fig</div>}</div>}):<p className="muted">Nenhuma captura referenciada.</p>}<p className="detail-footer">ID Figma: {activeNode.id}<br/>Seção: {sections.find(s=>s.id===activeNode.data.section)?.label}</p></aside>}
    {syncOpen&&<GitHubSyncDialog version={version} dirty={dirty} baseline={baseline} draft={draft} toDraft={toDraft}
      applyRemote={applyRemote} onSaved={rememberPublished} onClose={()=>setSyncOpen(false)}/>}
    {!!toast&&<div role="status" className="toast">{toast}</div>}
  </div>;
}
export default function App(){
  const [versionId,setVersionId] = useState(()=>{
    const requested = new URLSearchParams(window.location.search).get('versao');
    return Object.hasOwn(VERSIONS,requested) ? requested : DEFAULT_VERSION;
  });
  const changeVersion=(next)=>{
    if(!Object.hasOwn(VERSIONS,next))return;
    const url = new URL(window.location.href);
    url.searchParams.set('versao',next);
    window.history.replaceState(window.history.state,'',url);
    setVersionId(next);
  };
  return <ReactFlowProvider key={versionId}><AppInner version={VERSIONS[versionId]} onVersionChange={changeVersion}/></ReactFlowProvider>;
}
