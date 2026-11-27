'use client';

import { useCallback,useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AppearanceControls, useAppearance } from './appearance';
import {useSystemVisualState,hasSystemIdentity,SystemHeaderIdentity,SystemHeaderBackground,SystemMainBackground} from './system-identity';
import {ContextHelp} from './context-help';
import { ContentExportDialog } from './content-export';
import { ContentImportReceipt,contentDragOver,contentDrop } from './content-import';
import { readContentFile,importReceipt,SHEET_FILE_ACCEPT,type ImportedContent } from '../lib/content-file';
import type {OrbitalDestination} from '../lib/orbital-navigation';
import {orbitalEntryRoute, parsePlatformHash, platformHistoryEntry, platformHref, routeArea, routeForStyle, sectionRoute, type PlatformJourney, type PlatformRoute} from '../lib/platform-navigation';
import { SITE_VERSION } from '../lib/site-version';
import {requestJson} from '../lib/browser-request';
import {pdfsResponse,mergePdfCatalog} from '../lib/api-responses';
import { HomeDiceBackground } from './home-dice-background';
import {PlatformHome,CharacterLibrary} from './platform-home';
import {OrbitalHome} from './orbital-home';
import {useSystemApproach} from './use-system-approach';
import {OrbitalComet} from './orbital-comet';
import {useOrbitalFirstSteps} from './use-orbital-first-steps';
import type {FirstStepsZone} from '../lib/orbital-first-steps';
import {WorkspaceHeading, WorkspaceTrail} from './orbital-workspace';
import {useContentReveal} from './use-content-reveal';
import {openPlatformSession} from '../lib/platform-session';
import {resolveSystemContext,type PlatformPage} from '../lib/platform-context';
import { PlatformLogo } from './platform-brand';
import { SHEET_DIE_PATHS } from '../lib/sheet-die-paths';
import { deferEditor } from './deferred-editor';
import { RulesLibrary } from './rules-library';
import { PlayerSpaceProvider, ProfileControl, RPGCalendar, TestNotice, usePlayer } from './player-space';
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, Copy, Dices, Download, ExternalLink, FilePlus2, FileText, FolderOpen, GripVertical, Home, Layers3, LockKeyhole, Menu, MoreHorizontal, Pencil, Plus, Search, Shield, Sparkles, Trash2, Upload, UserRound, X, Eye, Settings2, CheckCircle2, CalendarDays, Compass } from 'lucide-react';
import { makeSheet, parseSheet, copySheet, bindSheetToRulebook, syncSheetSystem, characterFromRulebook, withRulebookSheetTemplate, AB10_RULEBOOK_ID, uid, makeAB10Rulebook, addRulebook, type Rulebook, type Sheet, type PDF } from '../lib/model';

type Page=PlatformPage;
type TemplateWorkspace={bookId:string;bookName:string;sheet:Sheet;baseline:string|null};
const names={home:'Início',rules:'Sistema',pdfs:'PDFs',sheet:'Ficha',agenda:'Agenda'};
const areaNames={home:'Início',rules:'Sistemas',pdfs:'PDFs',sheet:'Fichas',agenda:'Agenda'};
const editorWarning='Há alterações no tópico. Salve ou cancele a edição antes de sair de Sistema.';
const categories=['Manuais','Personagens','Aventuras','Referências','Outros'];
const SheetMap = deferEditor(() => import('./sheet-map.tsx').then(module => module.SheetMap), 'o editor de ficha');

const date=(v:string)=>new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
const size=(bytes:number)=>bytes<1048576?`${Math.ceil(bytes/1024)} KB`:`${(bytes/1048576).toFixed(1)} MB`;
function IconButton({label,children,...props}:{label:string;children:ReactNode;[k:string]:any}){return <button type="button" title={label} aria-label={label} className="icon-button" {...props}>{children}</button>;}
function Modal({title,children,onClose,wide=false,className=''}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean;className?:string}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);return <dialog ref={ref} className={'modal '+(wide?'wide ':'')+className} aria-label={title} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="modal-head"><h2>{title}</h2><IconButton label="Fechar janela" onClick={onClose}><X size={20}/></IconButton></div>{children}</dialog>;}
function Die({small=false}:{small?:boolean}){return <svg className={small?'die small':'die'} viewBox="0 0 200 200" fill="none" aria-hidden="true"><path d={SHEET_DIE_PATHS[20]}/><text x="97" y="121" textAnchor="middle" style={{fontSize:20}}>20</text></svg>;}

export default function App(){
  return <PlayerSpaceProvider><PlatformApp/></PlayerSpaceProvider>;
}

function PlatformApp(){
  const {user,authLoading,authError,profileOpen:profileGlobal}=usePlayer();
  const appearance=useAppearance();
  const style=appearance.value.interfaceStyle;
  const orbital=style==='orbital';
  const {homeLayer,flightLayer,skipRef,systemApproach,departure,trackApproach,skipApproach}=useSystemApproach(orbital);
  const [route,setRoute]=useState<PlatformRoute>({page:'home'});
  const locationRoute=useRef<PlatformRoute>(route);
  const [journey,setJourney]=useState<PlatformJourney|null>(null);
  const displayedRoute=routeForStyle(route,style);
  const page=displayedRoute.page;
  const area=routeArea(displayedRoute);
  const activeRulebookId=displayedRoute.page==='rules'?displayedRoute.bookId??null:null;
  const topicId=displayedRoute.page==='rules'?displayedRoute.topicId:undefined;
  const anchorId=displayedRoute.page==='rules'?displayedRoute.anchorId:undefined;
  const ruleView=displayedRoute.page==='rules'?displayedRoute.view:undefined;
  const sheetView=displayedRoute.page==='sheet'?displayedRoute.editor:undefined;
  const historyHash=useRef<string|null>(null);
  const historyDocument=useRef('');
  const historyIndex=useRef(0);
  const restoringHistory=useRef(false);
  const [dieActivation,setDieActivation]=useState(0);
  const activationCount=useRef(0);
  const [createSystemRequested,setCreateSystemRequested]=useState(false);
  const [sheet,setSheet]=useState<Sheet|null>(null);const [recent,setRecent]=useState<Sheet[]>([]);
  const [templateDraft,setTemplateDraft]=useState<TemplateWorkspace|null>(null),[pendingEditorAction,setPendingEditorAction]=useState<(()=>void)|null>(null),[newSystemId,setNewSystemId]=useState('');
  const ruleEditorDirty=useRef(false);
  const [rulesHaveDraft,setRulesHaveDraft]=useState(false);
  const reportRuleEditorDirty=useCallback((dirty:boolean)=>{ruleEditorDirty.current=dirty;setRulesHaveDraft(dirty);},[]);
  const [rulebooks,setRulebooks]=useState<Rulebook[]>(()=>[makeAB10Rulebook()]);
  const [contextId,setContextId]=useState<string|null>(null),[sessionReady,setSessionReady]=useState(false),[sessionError,setSessionError]=useState('');
  const sessionCache=useRef<Awaited<ReturnType<typeof openPlatformSession>>|null>(null);
  const [pdfs,setPdfs]=useState<PDF[]>([]);const [pdfLoading,setPdfLoading]=useState(true);const [pdfError,setPdfError]=useState('');
  const [viewingPdf,setViewingPdf]=useState<PDF|null>(null);
  const [exporting,setExporting]=useState<Sheet|null>(null),[receipt,setReceipt]=useState('');
  const [toast,setToast]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [modal,setModal]=useState<'new'|'pdf'|'help'|null>(null);const [confirm,setConfirm]=useState<{title:string;text:string;action:()=>void}|null>(null);
  const [settings,setSettings]=useState<'orbital'|'classic'|'registration'|null>(null);
  const [firstStepsZone,setFirstStepsZone]=useState<FirstStepsZone|null>(null);
  const [busy,setBusy]=useState(false);const [formError,setFormError]=useState('');
  const [query,setQuery]=useState('');const [category,setCategory]=useState('Todos');const [preview,setPreview]=useState(false);
  const importRef=useRef<HTMLInputElement>(null),importRequest=useRef(0);const [pdfFile,setPdfFile]=useState<File|null>(null);const [pdfTitle,setPdfTitle]=useState('');
  useEffect(()=>()=>{importRequest.current++;},[]);
  const templateDirty=useMemo(()=>!!templateDraft&&(templateDraft.baseline===null||templateDraft.baseline!==JSON.stringify(templateDraft.sheet)),[templateDraft]);
  const templateBook=templateDraft?rulebooks.find(b=>b.id===templateDraft.bookId):undefined;
  const visibleTemplate=sheetView?.kind==='template'&&templateDraft?.bookId===sheetView.id?templateDraft:null;
  const currentCharacter=sheetView?.kind==='character'?(sheet?.id===sheetView.id?sheet:recent.find(item=>item.id===sheetView.id)):null;
  const rawEditorSheet=visibleTemplate?.sheet||currentCharacter;
  const editorSheet=useMemo(()=>rawEditorSheet?syncSheetSystem(rawEditorSheet,rulebooks):null,[rawEditorSheet,rulebooks]);
  const sheetLibrary=!editorSheet&&(orbital||recent.length>0);
  const notify=useCallback((message:string)=>{
    setToast(message);
    if(timer.current)clearTimeout(timer.current);
    timer.current=setTimeout(()=>setToast(''),4500);
  },[]);
  const applyRoute=useCallback((next:PlatformRoute, animate:boolean, activate=false, travel=false)=>{
    trackApproach(locationRoute.current,next,travel);
    setJourney(animate?{from:locationRoute.current,to:next}:null);
    locationRoute.current=next;
    setReceipt('');
    setViewingPdf(null);
    setDieActivation(activate?++activationCount.current:0);
    setRoute(next);
  },[trackApproach]);
  const navigate=useCallback((next:PlatformRoute, activate=false, replace=false, travel=false)=>{
    const hash=platformHref(next);
    if(hash===historyHash.current)return true;
    if(ruleEditorDirty.current){notify(editorWarning);return false;}
    historyDocument.current ||= uid();
    const index=replace?historyIndex.current:++historyIndex.current;
    const state={...window.history.state,antropologoRoute:{document:historyDocument.current,index}};
    if(replace)window.history.replaceState(state,'',hash);
    else window.history.pushState(state,'',hash);
    historyHash.current=hash;
    const previous=locationRoute.current;
    applyRoute(next,!replace,activate,travel);
    const inBook=previous.page==='rules'&&next.page==='rules'&&previous.bookId&&previous.bookId===next.bookId;
    if(!replace&&!inBook)window.scrollTo({top:0,behavior:'instant'});
    return true;
  },[applyRoute,notify]);
  const selectDestination=useCallback((destination:OrbitalDestination|null)=>{
    const target=orbitalEntryRoute(destination);
    navigate(target,target.page==='home'&&!!target.destination);
  },[navigate]);
  function selectSection(next:Page){
    if(!orbital&&next==='rules'){selectSystem(contextId);return;}
    if(!orbital&&next==='sheet'){
      const editor=templateDraft?{kind:'template' as const,id:templateDraft.bookId}:sheet?{kind:'character' as const,id:sheet.id}:undefined;
      navigate({page:next,editor});
      return;
    }
    const target=sectionRoute(next,style);
    navigate(target,target.page==='home'&&!!target.destination);
  }
  useEffect(()=>{
    let alive=true;
    async function restore(){
      let cache:Awaited<ReturnType<typeof openPlatformSession>>|undefined;
      let fallback:PlatformRoute={page:'home'};
      try {
        cache=await openPlatformSession();
        if(!alive){cache.close();return;}
        const stored=await cache.load();
        if(!alive){cache.close();return;}
        sessionCache.current=cache;
        setRulebooks(stored.books);
        setContextId(stored.contextId);
        fallback=stored.page==='rules'?{page:'rules',bookId:stored.contextId??undefined}:{page:stored.page};
      } catch {
        cache?.close();
        if(!alive)return;
        setSessionError('O navegador não permitiu recuperar o contexto da sessão. O cache existente foi preservado. Exporte novas alterações antes de recarregar.');
      }
      navigate(parsePlatformHash(window.location.hash)??fallback,false,true);
      setSessionReady(true);
    }
    void restore();
    return()=>{alive=false;sessionCache.current?.close();sessionCache.current=null;};
  },[navigate]);
  useEffect(()=>{if(!sessionReady||!sessionCache.current)return;sessionCache.current.save({books:rulebooks,contextId,page}).then(()=>setSessionError('')).catch(()=>setSessionError('O contexto está ativo, mas não pôde ser guardado para recarregar esta aba. Exporte seus sistemas.'));},[sessionReady,rulebooks,contextId,page]);
  useEffect(()=>{
    if(!sessionReady)return;
    if(activeRulebookId&&rulebooks.some(book=>book.id===activeRulebookId))setContextId(activeRulebookId);
    else if(contextId&&!rulebooks.some(book=>book.id===contextId))setContextId(null);
  },[sessionReady,activeRulebookId,rulebooks,contextId]);
  useEffect(()=>{
    if(sessionReady&&route!==displayedRoute)navigate(displayedRoute,false,true);
  },[sessionReady,route,displayedRoute,navigate]);
  useEffect(()=>{
    const sync=()=>{
      const hash=window.location.hash;
      if(restoringHistory.current){
        if(hash===historyHash.current)restoringHistory.current=false;
        return;
      }
      if(historyHash.current===null)return;
      const entry=platformHistoryEntry(window.history.state,historyDocument.current);
      if(hash===historyHash.current){
        if(entry)historyIndex.current=entry.index;
        return;
      }
      if(ruleEditorDirty.current){
        if(entry&&entry.index!==historyIndex.current){
          restoringHistory.current=true;
          window.history.go(historyIndex.current-entry.index);
        }else{
          const index=entry?.index??++historyIndex.current;
          window.history.replaceState({...window.history.state,antropologoRoute:{document:historyDocument.current,index}},'',historyHash.current);
        }
        notify(editorWarning);
        return;
      }
      historyHash.current=hash;
      if(entry)historyIndex.current=entry.index;
      else window.history.replaceState({...window.history.state,antropologoRoute:{document:historyDocument.current,index:++historyIndex.current}},'',hash);
      applyRoute(parsePlatformHash(hash)??{page:'home'},false);
    };
    window.addEventListener('hashchange',sync);
    window.addEventListener('popstate',sync);
    return()=>{
      window.removeEventListener('hashchange',sync);
      window.removeEventListener('popstate',sync);
      if(timer.current)clearTimeout(timer.current);
    };
  },[applyRoute,notify]);
  useEffect(()=>{
    if(!rulesHaveDraft&&!templateDirty)return;
    const warn=(event:BeforeUnloadEvent)=>{
      if(!ruleEditorDirty.current&&!templateDirty)return;
      event.preventDefault();
      event.returnValue='';
    };
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[rulesHaveDraft,templateDirty]);
  function selectSystem(id:string|null,travel=false){return navigate({page:'rules',bookId:id??undefined},false,false,travel);}
  function selectTopic(topicId?:string,anchorId?:string,replace=false,view?:'orbit'){
    if(activeRulebookId===null)return false;
    return navigate({page:'rules',bookId:activeRulebookId,topicId,anchorId,view},false,replace);
  }
  function browseSystems(create=false){if(selectSystem(null)&&create)setCreateSystemRequested(true);}
  function openCharacter(value:Sheet){
    replaceTemplateWorkspace(()=>{
      if(!navigate({page:'sheet',editor:{kind:'character',id:value.id}}))return;
      setTemplateDraft(null);
      setSheet(value);
      setPreview(false);
    });
  }
  function returnToPlatform(){if(navigate({page:'home'}))setContextId(null);}
  useEffect(()=>{if(sheet)setRecent(old=>[sheet,...old.filter(s=>s.id!==sheet.id)]);},[sheet]);
  useEffect(()=>{
    if(templateDraft||sheetView?.kind!=='template')return;
    const book=rulebooks.find(item=>item.id===sheetView.id);
    if(!book?.sheetTemplate)return;
    const draft=bindSheetToRulebook(copySheet(book.sheetTemplate),book);
    setTemplateDraft({bookId:book.id,bookName:book.name,sheet:draft,baseline:JSON.stringify(draft)});
  },[templateDraft,sheetView,rulebooks]);
  async function loadPdfs(){setPdfLoading(true);setPdfError('');try{const remote=pdfsResponse(await requestJson('/api/library'));setPdfs(current=>mergePdfCatalog(remote,current));}catch{setPdfError('Não foi possível carregar a biblioteca. Tente novamente.');}finally{setPdfLoading(false);}}
  useEffect(()=>{loadPdfs();},[]);
  function updateEditorSheet(fn:(s:Sheet)=>Sheet){
    const update=(value:Sheet)=>({...fn(syncSheetSystem(value,rulebooks)),updatedAt:new Date().toISOString()});
    if(visibleTemplate)setTemplateDraft(current=>current?{...current,sheet:update(current.sheet)}:current);
    else if(currentCharacter)setSheet(current=>update(current?.id===currentCharacter.id?current:currentCharacter));
  }
  function replaceTemplateWorkspace(action:()=>void){if(templateDirty){setPendingEditorAction(()=>action);return;}action();}
  function editTemplate(book:Rulebook,createNew=false){
    if(book.id===AB10_RULEBOOK_ID)return;
    const target:PlatformRoute={page:'sheet',editor:{kind:'template',id:book.id}};
    if(templateDraft?.bookId===book.id&&(!createNew||!book.sheetTemplate)){
      if(navigate(target))setPreview(false);
      return;
    }
    replaceTemplateWorkspace(()=>{
      if(!navigate(target))return;
      const draft=bindSheetToRulebook(!createNew&&book.sheetTemplate?copySheet(book.sheetTemplate):makeSheet(('Modelo — '+book.name).slice(0,200),''),book);
      setContextId(book.id);
      setTemplateDraft({bookId:book.id,bookName:book.name,sheet:draft,baseline:!createNew&&book.sheetTemplate?JSON.stringify(draft):null});
      setPreview(false);
    });
  }
  function linkTemplate(book:Rulebook,source:Sheet|undefined){if(templateDraft?.bookId===book.id&&templateDirty)throw new Error('Há alterações no modelo abertas no editor. Salve ou descarte essas alterações antes de trocar o vínculo.');const current=rulebooks.find(b=>b.id===book.id);if(!current)throw new Error('Este conjunto não está mais nesta página.');const next=withRulebookSheetTemplate(current,source);setRulebooks(all=>all.map(b=>b.id===next.id?next:b));if(templateDraft?.bookId===book.id)setTemplateDraft(null);notify(source?'Ficha-modelo vinculada. Use Salvar regras para baixar o sistema completo.':'Ficha-modelo desvinculada. Os personagens foram mantidos.');}
  function saveTemplate(){if(!templateDraft)return;try{const current=rulebooks.find(b=>b.id===templateDraft.bookId);if(!current)throw new Error('O conjunto foi removido desta página. Você ainda pode exportar a ficha como JSON ou Super PNG.');const next=withRulebookSheetTemplate(current,templateDraft.sheet);setRulebooks(all=>all.map(b=>b.id===next.id?next:b));setTemplateDraft({...templateDraft,baseline:JSON.stringify(templateDraft.sheet)});notify('Modelo atualizado no sistema. Use Salvar regras para baixar regras e modelo juntos.');}catch(e){notify((e as Error).message);}}
  function backToTemplateRules(){if(templateDraft)selectSystem(templateBook?.id??null);}
  function discardTemplate(){if(!templateDraft)return;if(templateBook?.sheetTemplate){const draft=bindSheetToRulebook(copySheet(templateBook.sheetTemplate),templateBook);setTemplateDraft({...templateDraft,sheet:draft,baseline:JSON.stringify(draft)});notify('Alterações descartadas. O modelo salvo foi restaurado.');}else{backToTemplateRules();setTemplateDraft(null);notify('Criação do modelo cancelada.');}}
  function exportSheet(source:Sheet|null=currentCharacter??null){if(source)setExporting(syncSheetSystem(source,rulebooks));}
  function acceptImported(result:ImportedContent){
   replaceTemplateWorkspace(()=>{
    const message=importReceipt(result);
    if(result.kind==='character'){
      if(!navigate({page:'sheet',editor:{kind:'character',id:result.content.id}}))return;
      setTemplateDraft(null);setSheet(result.content);setPreview(true);
    }else{
      addRulebook(rulebooks,result.content);
      if(!selectSystem(result.content.id))return;
      setRulebooks(all=>addRulebook(all,result.content));
    }
    setReceipt(result.source==='super-png'?message:'');notify(message);
   });
  }
  async function importSheet(file?:File){if(!file)return;const request=++importRequest.current;try{const result=await readContentFile(file);if(request!==importRequest.current)return;if(result.kind==='ruleset')addRulebook(rulebooks,result.content);acceptImported(result);}catch(e){if(request===importRequest.current)notify((e as Error).message);}finally{if(request===importRequest.current&&importRef.current)importRef.current.value='';}}
  function openModal(m:typeof modal){setFormError('');setPdfFile(null);setPdfTitle('');if(m==='new')setNewSystemId(contextId||'');setModal(m);}
  function newCharacter(book?:Rulebook){openModal('new');if(book){setNewSystemId(book.id);setContextId(book.id);}}
  function createCharacter(e:React.FormEvent<HTMLFormElement>){e.preventDefault();try{const data=new FormData(e.currentTarget),name=String(data.get('name')),player=String(data.get('player')),system=newSystemId?rulebooks.find(b=>b.id===newSystemId):undefined;if(newSystemId&&!system)throw new Error('O sistema selecionado não está disponível. Escolha outro.');const next=system?(system.sheetTemplate?characterFromRulebook(system,name,player):bindSheetToRulebook(makeSheet(name,player),system)):makeSheet(name,player);setModal(null);replaceTemplateWorkspace(()=>{if(!navigate({page:'sheet',editor:{kind:'character',id:next.id}}))return;setTemplateDraft(null);setSheet(next);setPreview(false);if(system)setContextId(system.id);notify(system?.sheetTemplate?'Personagem criado com uma cópia independente do modelo.':system?'Ficha criada com os dados de '+system.name+'.':'Ficha criada. Adicione seu primeiro bloco.');});}catch(e){setFormError((e as Error).message);}}
  async function uploadPdf(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(!pdfFile){setFormError('Selecione um arquivo PDF.');return;}if(pdfFile.size>20*1024*1024){setFormError('O limite é de 20 MB por PDF.');return;}const data=new FormData(e.currentTarget);setBusy(true);setFormError('');try{if(await pdfFile.slice(0,5).text()!=='%PDF-')throw new Error('O arquivo selecionado não é um PDF válido.');const title=String(data.get('title')||'').trim();if(!title)throw new Error('Informe o título do material.');const pdf:PDF={id:uid(),title,category:String(data.get('category')||'Outros'),description:String(data.get('description')||''),filename:pdfFile.name,size:pdfFile.size,createdAt:new Date().toISOString(),url:URL.createObjectURL(pdfFile)};setPdfs(old=>[pdf,...old]);setModal(null);setQuery('');setCategory('Todos');notify('PDF disponível apenas nesta página de teste.');}catch(e){setFormError((e as Error).message);}finally{setBusy(false);}}
  function removePdf(pdf:PDF){if(pdf.url)URL.revokeObjectURL(pdf.url);setPdfs(old=>old.filter(p=>p.id!==pdf.id));notify('PDF removido desta página.');}
  const visiblePdfs=pdfs.filter(p=>(category==='Todos'||p.category===category)&&`${p.title} ${p.description} ${p.filename}`.toLowerCase().includes(query.toLowerCase()));

  const mainRef=useRef<HTMLElement|null>(null);
  useContentReveal(mainRef,sessionReady&&(page==='home'||page==='pdfs'||page==='rules'&&!activeRulebookId||page==='sheet'&&sheetLibrary),[page,style,contextId,rulebooks.length,recent.length,pdfs.length,sheetLibrary].join(':'));
  const visualState=useSystemVisualState();
  const selectedContext=resolveSystemContext(rulebooks,contextId);
  const contextBook=profileGlobal?undefined:orbital?resolveSystemContext(rulebooks,activeRulebookId??editorSheet?.system?.id??null):selectedContext;
  const orbitalHome=page==='home'&&orbital;
  const destination=displayedRoute.page==='home'?displayedRoute.destination??null:null;
  const firstSteps=useOrbitalFirstSteps({
    user,
    ready: orbital && sessionReady && !authLoading && (!!user || !authError),
    zone: orbitalHome && (firstStepsZone==='home' && destination===null || firstStepsZone==='systems' && destination==='systems') ? firstStepsZone : null,
    blocked: !!(settings || profileGlobal || modal || viewingPdf || exporting || confirm || pendingEditorAction),
    systemsSelected: orbitalHome && destination==='systems',
    registrationSettings: settings==='registration',
  });
  const hasIdentity=hasSystemIdentity(contextBook);
  const homeActions={
    books:rulebooks,sheets:recent,pdfs,pdfLoading,pdfError,
    onAddPdf:()=>openModal('pdf'),onSystem:(id:string)=>selectSystem(id,orbitalHome),
    onAllSystems:()=>browseSystems(),onCreateSystem:()=>browseSystems(true),
    onCreateCharacter:()=>newCharacter(selectedContext),onOpenCharacter:openCharacter,
    onAllCharacters:()=>navigate({page:'sheet'}),
    onPdfs:()=>navigate({page:'pdfs'}),onAgenda:()=>navigate({page:'agenda'}),
  };
  const pdfSearch=<label className="search"><Search size={18}/><input aria-label="Buscar PDFs" placeholder="Buscar por título ou descrição..." value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<IconButton label="Limpar busca" onClick={()=>setQuery('')}><X size={15}/></IconButton>}</label>;
  const pdfCategories=<div className="filter-row" aria-label="Categorias de PDFs">{['Todos',...categories].map(c=><button key={c} aria-pressed={category===c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}{c==='Todos'&&<span>{pdfs.length}</span>}</button>)}</div>;
  const addPdfButton=<button className="button primary" onClick={()=>openModal('pdf')}><Upload size={16}/> Adicionar PDF</button>;
  const pdfCount=<span className="library-count">{visiblePdfs.length} {visiblePdfs.length===1?'arquivo':'arquivos'}{visiblePdfs.length!==pdfs.length?' de '+pdfs.length:''}</span>;
  const sheetActions=<><button className="button secondary" onClick={()=>importRef.current?.click()}><Upload size={16}/> Carregar ficha</button><button className="button primary" onClick={()=>openModal('new')}><Plus size={16}/> Criar ficha</button></>;
  return <>{!sessionReady&&<div className="session-restore-status" role="status">Preparando sua sessão…</div>}<div inert={!sessionReady} data-session-ready={sessionReady} data-interface={style} data-attention-cue={firstSteps.cue==='entry'||firstSteps.cue==='systems'?firstSteps.cue:undefined} data-context={contextBook?'system':'global'} data-system-id={contextBook?.id||undefined} className={'app-shell'+(hasIdentity?' has-system-identity':'')+(contextBook?' system-mode':' global-mode')+(orbital?' orbital-chrome':'')+(orbitalHome?' orbital-home-mode':'')}>
    <a className="skip-link" href="#main" onClick={event=>{event.preventDefault();mainRef.current?.focus();}}>Pular para o conteúdo</a>
    <div className={'main-wrap'+(page==='home'?' is-home':page==='sheet'?' is-sheet':'')+(contextBook?.visuals?.areas.mainBackground?.assetId?' has-system-main-background':'')}>
      {contextBook&&<SystemMainBackground book={contextBook} state={visualState}/>}
      {!orbital&&!contextBook?.visuals?.areas.mainBackground?.assetId&&<HomeDiceBackground/>}
      {page==='sheet'&&<div id="sheet-page-background" className="sheet-page-background" aria-hidden="true"/>}
      <header className="topbar">
        {contextBook&&<SystemHeaderBackground book={contextBook} state={visualState}/>}
        <div className="topbar-left">
          <button type="button" className="header-platform-brand" aria-label="Voltar ao ANTROPOLOGO" title="Voltar ao ANTROPOLOGO" onClick={returnToPlatform}><PlatformLogo/></button>
          {contextBook&&<><span className="header-context-separator" aria-hidden="true">×</span><SystemHeaderIdentity book={contextBook} state={visualState} onSwitch={()=>browseSystems()}/></>}
        </div>
        <nav className="global-top-nav" aria-label="Áreas da plataforma">{(['home','rules','sheet','pdfs','agenda'] as Page[]).map(id=><button type="button" key={id} aria-current={area===id?'page':undefined} onClick={()=>selectSection(id)}>{names[id]}</button>)}</nav>
        <div className="header-right"><IconButton label={'Ajuda de '+names[area]} className="icon-button contextual-help-trigger" aria-haspopup="dialog" onClick={()=>openModal('help')}><CircleHelp size={19}/></IconButton><AppearanceControls {...appearance} open={!!settings} onOpen={()=>setSettings(style)} onClose={()=>{
          if (settings!=='classic' || orbital) firstSteps.settingsClosed();
          setSettings(null);
        }}/><span className="private-badge"><Sparkles size={12}/> VERSÃO DE TESTE · v{SITE_VERSION}</span><ProfileControl entrySignal={firstSteps.cue==='entry'} onRegistered={orbital?()=>setSettings('registration'):undefined} onOpenAgenda={()=>navigate({page:'agenda'})}/></div>
      </header>
      <main ref={mainRef} id="main" tabIndex={-1} data-workspace={page} onDragOver={page==='sheet'?contentDragOver:undefined} onDrop={page==='sheet'?e=>contentDrop(e,file=>{void importSheet(file);},notify):undefined}>
      {orbital&&page!=='home'&&!(page==='rules'&&activeRulebookId)&&<WorkspaceTrail section={areaNames[area]} onMap={()=>selectDestination(null)} onSection={()=>selectSection(area)}/>}
      {page==='home'&&!orbitalHome&&<TestNotice/>}{sessionError&&<p className="session-context-warning" role="status">{sessionError}</p>}{page==='rules'&&receipt&&<ContentImportReceipt message={receipt} onClose={()=>setReceipt('')}/>}

      {(orbitalHome||departure)&&<div ref={flightLayer} className={departure?'orbital-flight':undefined}>
        {departure&&<div className="orbital-flight-sky" aria-hidden="true" style={{'--flight-scroll-y': `${departure.scrollY}px`} as CSSProperties}/>}
        <div ref={homeLayer} className={departure?'orbital-home-departure':undefined}
          inert={!!departure} aria-hidden={!!departure||undefined} style={departure?.bounds}>
          <OrbitalHome {...homeActions} departing={!!departure} destination={departure?departure.destination??null:destination} dieActivation={dieActivation}
            onSelectDestination={selectDestination} firstStepsCue={departure?null:firstSteps.cue} onFirstStepsZone={setFirstStepsZone} onDiskReturn={firstSteps.diskUsed}/>
          <TestNotice/>
        </div>
        {departure&&!departure.reduced&&<>
          <div className="orbital-flight-haze" aria-hidden="true"/>
          <canvas className="orbital-flight-stars" aria-hidden="true"/>
          <button ref={skipRef} className="orbital-flight-skip" type="button" aria-keyshortcuts="Escape" onClick={skipApproach}>Pular viagem</button>
        </>}
      </div>}
      {page==='home'&&!orbitalHome&&<PlatformHome {...homeActions} context={selectedContext}/>}

      {page==='rules'&&<RulesLibrary orbital={orbital} systemApproach={systemApproach} approaching={!!departure} createRequested={createSystemRequested} onCreateRequestHandled={()=>setCreateSystemRequested(false)} onEditorDirtyChange={reportRuleEditorDirty} books={rulebooks} onChange={setRulebooks} activeId={activeRulebookId} onActiveChange={selectSystem} topicId={topicId} anchorId={anchorId} view={ruleView} onTopicChange={selectTopic} notify={notify} characters={recent} onEditTemplate={editTemplate} onLinkTemplate={linkTemplate} onCreateCharacter={newCharacter} onImportCharacter={acceptImported} unsavedTemplateBookId={templateDirty?templateDraft?.bookId:undefined}/>}

      {page==='pdfs'&&<>
        {orbital?<WorkspaceHeading area="pdfs" title="Biblioteca de PDFs" description="Organize manuais, aventuras e referências da sua mesa." actions={addPdfButton}/>:<>
          <div className="page-eyebrow">SEUS MATERIAIS DE JOGO</div><div className="page-title-row"><div><h1>Biblioteca de PDFs<span className="accent">.</span></h1><p>Manuais, referências e aventuras sempre à mão.</p></div>{addPdfButton}</div>
        </>}
        {orbital&&<OrbitalComet journey={journey}/>}
        <div className={orbital?'orbital-pdf-layout':undefined}>
        {orbital?<aside className="orbital-collection-sidebar"><h2>Filtrar biblioteca</h2>{pdfSearch}{pdfCategories}</aside>:<><div className="library-toolbar">{pdfSearch}{pdfCount}</div>{pdfCategories}</>}
        <section className="pdf-results" aria-label="Documentos">
        {orbital&&<div className="orbital-collection-heading"><h2>Documentos</h2>{pdfCount}</div>}
        {pdfError&&<div className="error-banner" role="alert">{pdfError}<button onClick={loadPdfs}>Tentar novamente</button></div>}
        {pdfLoading&&!pdfs.length?<div className="loading-state" role="status"><span className="spinner"/> Carregando biblioteca...</div>:
          visiblePdfs.length?<div className="pdf-grid">{visiblePdfs.map(pdf=><article className="pdf-card" key={pdf.id}>
            <div className="pdf-cover" aria-hidden="true">{!orbital&&<span className="pdf-cover-label">ANTROPOLOGO RPG</span>}<FileText size={orbital?27:53} strokeWidth={1.4}/><span className="pdf-type">{orbital?'PDF':'PDF / '+pdf.category.toUpperCase()}</span></div>
            <div className="pdf-info"><span className="subtle-label">{pdf.category} · {size(pdf.size)}</span><h3>{pdf.title}</h3><p>{pdf.description||pdf.filename}</p>
              <div className="pdf-actions">{orbital?<button type="button" className="text-button" onClick={()=>setViewingPdf(pdf)}>Abrir PDF <Eye size={16}/></button>:<a href={pdf.url} target="_blank" rel="noreferrer" className="text-button">Abrir PDF <ExternalLink size={14}/></a>}
                <a className="icon-button" href={pdf.url} download={pdf.filename} title={'Baixar '+pdf.title} aria-label={'Baixar '+pdf.title}><Download size={17}/></a>
                <IconButton label={'Remover '+pdf.title} onClick={()=>setConfirm({title:'Remover PDF?',text:`“${pdf.title}” será removido da biblioteca desta página.`,action:()=>removePdf(pdf)})}><Trash2 size={16}/></IconButton>
              </div>
            </div>
          </article>)}</div>:
          <div className={orbital?'orbital-collection-empty':'library-empty'}>
            {orbital?<FolderOpen size={34} strokeWidth={1.4} aria-hidden="true"/>:<><div className="empty-file-art"><span/><FolderOpen size={56} strokeWidth={1.2}/><span/></div><span className="page-eyebrow">UM LUGAR PARA SUAS REFERÊNCIAS</span></>}
            <h2>{pdfs.length?'Nenhum PDF por aqui.':'Sua biblioteca começa aqui.'}</h2><p>{pdfs.length?'Tente outro termo ou escolha uma categoria diferente.':'Adicione materiais dos seus sistemas e organize cada arquivo por categoria. Os PDFs ficam só nesta página durante o teste.'}</p>
            <button className="button primary" onClick={()=>pdfs.length?(setQuery(''),setCategory('Todos')):openModal('pdf')}>{pdfs.length?<><Search size={16}/> Limpar filtros</>:<><Plus size={16}/> Adicionar primeiro PDF</>}</button><span className="empty-hint">Arquivos PDF · Até 20 MB por arquivo</span>
          </div>}
        </section>
        </div>
        <div className="info-strip"><Shield size={18}/><p>Biblioteca de teste: os PDFs adicionados ficam nesta página e se perdem ao recarregar. Eles não são enviados ao site.</p></div>
      </>}

      {page==='sheet'&&<>
        {orbital?<WorkspaceHeading area="sheet" title={visibleTemplate?'Ficha-modelo':editorSheet?'Ficha de personagem':'Suas fichas'} description={visibleTemplate?visibleTemplate.bookName:editorSheet?.system?.name??(!editorSheet?'Abra uma ficha ou crie um personagem para jogar.':undefined)} actions={editorSheet?<button className="button secondary" onClick={()=>navigate({page:'sheet'})}><Layers3 size={16}/> Biblioteca de fichas</button>:sheetActions}/>:
        <><div className="page-eyebrow">{visibleTemplate?'ESTRUTURA OFICIAL DO SEU SISTEMA':'UM PERSONAGEM. A SUA MANEIRA.'}</div><div className="page-title-row"><div><h1>{visibleTemplate?'Ficha-modelo do sistema':sheetLibrary?'Suas fichas':'Ficha de personagem'}<span className="accent">.</span></h1><p>{visibleTemplate?'Você está editando o modelo. Personagens já criados continuam independentes.':'Comece do zero. Adicione o que importa. Faça sua própria construção.'}</p></div><div className="action-group wrap">{sheetActions}</div></div></>}

        {visibleTemplate&&<section className="template-workspace-context" aria-label="Vínculo do modelo ao sistema"><div><span className="subtle-label">FICHA-MODELO · {templateDirty?'ALTERAÇÕES PENDENTES':'MODELO SALVO'}</span><strong>{templateBook?.name||visibleTemplate.bookName}</strong><p>{templateBook?'Salvar modelo atualiza o conjunto nesta página. Depois, use Salvar regras para baixar o sistema completo.':'Este conjunto foi removido. Exporte a ficha como JSON ou Super PNG para conservar seu trabalho.'}</p></div><div className="action-group wrap"><button type="button" className="button secondary" onClick={backToTemplateRules}><ArrowLeft size={16}/> Voltar às regras</button><button type="button" className="button secondary" onClick={()=>exportSheet(visibleTemplate.sheet)}><Download size={16}/> Exportar ficha</button>{templateDirty&&<button type="button" className="text-button" onClick={discardTemplate}>{templateBook?.sheetTemplate?'Descartar alterações':'Cancelar criação'}</button>}</div></section>}
        {(!orbital||!editorSheet)&&<p className="content-drop-hint">Carregue ou arraste um JSON ou Super PNG. Arquivos .ab10 e .regras continuam compatíveis.</p>}
        {receipt&&<ContentImportReceipt message={receipt} onClose={()=>setReceipt('')}/>}
        {!editorSheet&&(sheetLibrary?<CharacterLibrary sheets={recent} onCreate={()=>newCharacter(selectedContext)} onOpen={openCharacter} orbital={orbital}/>:<div className="sheet-welcome"><div className="sheet-welcome-copy"><span className="round-icon"><UserRound size={28}/></span><h2>Uma folha em branco.<br/>Um mundo de possibilidades.</h2><p>Sua ficha pode usar posição livre ou encaixe em grade. Crie abas e espalhe blocos de atributos, perícias ou história pelo espaço, na posição que fizer sentido para você.</p><div className="hero-actions"><button className="button primary" onClick={()=>openModal('new')}><Plus size={17}/> Criar ficha</button><button className="button secondary" onClick={()=>importRef.current?.click()}><FolderOpen size={17}/> Carregar ficha</button></div><span className="muted small-text">Já tem uma ficha? Importe JSON, Super PNG ou .ab10.</span></div><div className="sheet-illustration"><div className="mock-paper"><span className="mock-badge">SEU PRÓXIMO PERSONAGEM</span><div className="mock-head"><span/><div><i/><i/></div></div><div className="mock-block"><span>ATRIBUTOS</span><div><i/><i/><i/></div></div><div className="mock-block"><span>PERÍCIAS</span><p/><p/><p/></div><div className="mock-dash"><Plus size={15}/> Seu próximo bloco</div></div><span className="illustration-label">Sua ficha, do seu jeito.</span></div></div>)}
        {editorSheet&&<SheetMap key={editorSheet.id} sheet={editorSheet} onChange={updateEditorSheet}
          onExport={visibleTemplate?saveTemplate:()=>exportSheet()}
          onBack={visibleTemplate?backToTemplateRules:()=>navigate({page:'sheet'})}
          onImport={()=>requestAnimationFrame(()=>importRef.current?.click())}
          onExportCopy={visibleTemplate?()=>exportSheet(visibleTemplate.sheet):undefined}
          onDiscardTemplate={visibleTemplate&&templateDirty?discardTemplate:undefined}
          preview={preview} onPreviewChange={setPreview} isTemplate={!!visibleTemplate} systems={rulebooks} receipt={receipt}/>}
        {!orbital&&editorSheet&&recent.length>(visibleTemplate?0:1)&&<section className="recent-sheets"><div className="section-heading"><h2>Fichas nesta página</h2><span>{recent.length} {recent.length===1?'PERSONAGEM':'PERSONAGENS'}</span></div><div className="recent-grid">{recent.filter(s=>visibleTemplate||s.id!==currentCharacter?.id).map(s=><button key={s.id} className="recent-sheet" onClick={()=>openCharacter(s)}><UserRound size={22}/><div><strong>{s.name||'Sem nome'}</strong><span>{s.blocks.length} blocos · {date(s.updatedAt)}</span></div><ArrowRight size={16}/></button>)}</div></section>}
      </>}
      {page==='agenda'&&<RPGCalendar orbital={orbital}/>}
      </main>
    </div>
    {exporting&&<ContentExportDialog content={exporting} onClose={()=>setExporting(null)} notify={notify}/>}
    <input ref={importRef} type="file" accept={SHEET_FILE_ACCEPT} hidden aria-label="Selecionar arquivo de ficha" onChange={e=>importSheet(e.target.files?.[0])}/>
    <div className={'toast '+(toast?'show':'')} role="status" aria-live="polite"><CheckCircle2 size={18}/>{toast}</div>
    {modal==='new'&&<Modal title="Criar nova ficha" onClose={()=>setModal(null)}><p className="modal-intro">Toda história precisa de um protagonista. O resto você constrói, bloco por bloco.</p><form onSubmit={createCharacter}><label className="form-label">Nome do personagem<input name="name" autoFocus placeholder="Como seu personagem se chama?" maxLength={200} required/></label><label className="form-label">Jogador <span>opcional</span><input name="player" maxLength={200} placeholder="Seu nome ou apelido"/></label><label className="form-label">Sistema e estrutura inicial<select aria-label="Modelo de sistema para nova ficha" value={newSystemId} onChange={e=>setNewSystemId(e.target.value)}><option value="">Ficha em branco · sem sistema</option>{rulebooks.map(b=><option key={b.id} value={b.id}>{b.name}{b.sheetTemplate?' · com modelo':' · ficha em branco'}</option>)}</select></label><div className="form-note"><Layers3 size={17}/>{newSystemId?(rulebooks.find(b=>b.id===newSystemId)?.sheetTemplate?'Você recebe uma cópia independente do modelo e os dados deste sistema.':'Você começa em branco usando os dados deste sistema.'):'Você começa com uma ficha em branco, sem atributos obrigatórios.'}</div>{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="modal-footer"><button type="button" className="button secondary" onClick={()=>setModal(null)}>Cancelar</button><button className="button primary" type="submit">Criar ficha <ArrowRight size={16}/></button></div></form></Modal>}
    {pendingEditorAction&&<Modal title="Modelo com alterações pendentes" onClose={()=>setPendingEditorAction(null)}><p className="modal-intro">Salve o modelo antes de trocar de ficha, ou descarte as alterações para seguir. O modelo salvo e os personagens existentes serão mantidos.</p><div className="modal-footer"><button type="button" className="button secondary" onClick={()=>setPendingEditorAction(null)}>Continuar edição</button><button type="button" className="button danger" onClick={()=>{const action=pendingEditorAction;setPendingEditorAction(null);action();}}>Descartar e seguir</button></div></Modal>}
    {modal==='pdf'&&<Modal title="Adicionar à biblioteca" onClose={()=>{if(!busy)setModal(null);}}><p className="modal-intro">Teste a organização da biblioteca. O arquivo fica só nesta página e se perde ao recarregar.</p><form onSubmit={uploadPdf}><label className="upload-zone"><Upload size={27}/><strong>{pdfFile?pdfFile.name:'Escolher arquivo PDF'}</strong><span>{pdfFile?size(pdfFile.size):'Até 20 MB · Clique para selecionar'}</span><input type="file" accept="application/pdf,.pdf" aria-label="Arquivo PDF" disabled={busy} onChange={e=>{const file=e.target.files?.[0]||null;setPdfFile(file);if(file&&!pdfTitle)setPdfTitle(file.name.replace(/\.pdf$/i,''));}}/></label><label className="form-label">Título<input name="title" maxLength={200} required value={pdfTitle} onChange={e=>setPdfTitle(e.target.value)} placeholder="Título do material"/></label><label className="form-label">Categoria<select name="category">{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="form-label">Descrição <span>opcional</span><textarea name="description" maxLength={1000} rows={2} placeholder="O que encontramos neste material?"/></label>{formError&&<p className="form-error" role="alert">{formError}</p>}<div className="modal-footer"><button className="button secondary" type="button" disabled={busy} onClick={()=>setModal(null)}>Cancelar</button><button className="button primary" disabled={busy} type="submit">{busy?<><span className="spinner"/> Enviando...</>:<><Plus size={16}/> Adicionar PDF</>}</button></div></form></Modal>}
    {confirm&&<Modal title={confirm.title} onClose={()=>setConfirm(null)}><p className="modal-intro">{confirm.text}</p><div className="modal-footer"><button className="button secondary" onClick={()=>setConfirm(null)}>Cancelar</button><button className="button danger" onClick={()=>{confirm.action();setConfirm(null);}}>Remover <Trash2 size={15}/></button></div></Modal>}
    {modal==='help'&&<Modal title={'Ajuda de '+names[area]} onClose={()=>setModal(null)}><ContextHelp initialArea={area}/><button className="button primary full" onClick={()=>setModal(null)}>Concluir <Check size={15}/></button></Modal>}
    {viewingPdf&&<Modal title={viewingPdf.title} className="orbital-pdf-viewer" wide onClose={()=>setViewingPdf(null)}>
      <div className="orbital-pdf-viewer-tools"><span>{viewingPdf.category} · {size(viewingPdf.size)}</span><a className="button secondary" href={viewingPdf.url} download={viewingPdf.filename}><Download size={16}/> Baixar</a><a className="text-button" href={viewingPdf.url} target="_blank" rel="noreferrer">Abrir em outra aba <ExternalLink size={15}/></a></div>
      <iframe src={viewingPdf.url} title={'Documento PDF '+viewingPdf.title}/>
    </Modal>}
  </div></>;
}
