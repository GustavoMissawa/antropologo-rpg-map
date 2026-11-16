'use client';

import { useEffect,useRef,useState,type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { Bold,Italic,Underline,Strikethrough,Highlighter,List,ListOrdered,Link2,MoreHorizontal,Code,SquareCode,Quote,BookOpen,ExternalLink,Unlink,Undo2,Redo2,X } from 'lucide-react';
import { RULE_MOBILE_QUERY,ruleMobileViewport,type RuleKeyboardRect,type RuleMobileViewport } from '../lib/rule-mobile';

export type RuleMobileAction='bold'|'italic'|'underline'|'strike'|'highlight'|'bulletList'|'orderedList'|'blockquote'|'code'|'codeBlock'|'internal'|'external'|'unlink'|'undo'|'redo';
type Props={editor:Editor;active:Record<string,boolean>;blockStyle:string;disabled:(id:RuleMobileAction)=>boolean;onRun:(id:RuleMobileAction)=>void;onStyle:(style:string)=>void;onCapture:()=>void;onRelease:()=>void;onHeight:(height:number)=>void;onViewport:(viewport:RuleMobileViewport)=>void};
type VirtualKeyboard=EventTarget&{boundingRect:RuleKeyboardRect};
const primary=[{id:'bold',label:'Negrito',Icon:Bold},{id:'italic',label:'Itálico',Icon:Italic},{id:'underline',label:'Sublinhado',Icon:Underline},{id:'strike',label:'Riscado',Icon:Strikethrough},{id:'highlight',label:'Destaque',Icon:Highlighter},{id:'bulletList',label:'Lista com marcadores',Icon:List},{id:'orderedList',label:'Lista numerada',Icon:ListOrdered}] as const;
const secondary=[{id:'blockquote',label:'Citação',Icon:Quote},{id:'code',label:'Código inline',Icon:Code},{id:'codeBlock',label:'Bloco de código',Icon:SquareCode},{id:'internal',label:'Link interno',Icon:BookOpen},{id:'external',label:'Link externo',Icon:ExternalLink},{id:'unlink',label:'Remover link',Icon:Unlink},{id:'undo',label:'Desfazer',Icon:Undo2},{id:'redo',label:'Refazer',Icon:Redo2}] as const;

export function useRuleMobile(){
 const [mobile,setMobile]=useState(false);
 useEffect(()=>{const media=window.matchMedia(RULE_MOBILE_QUERY),update=()=>setMobile(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 return mobile;
}

export function RuleMobileToolbar({editor,active,blockStyle,disabled,onRun,onStyle,onCapture,onRelease,onHeight,onViewport}:Props){
 const root=useRef<HTMLDivElement>(null),bar=useRef<HTMLDivElement>(null),frame=useRef(0),focusFrame=useRef(0),lastViewport=useRef<RuleMobileViewport|null>(null);
 const [focused,setFocused]=useState(editor.isFocused),[viewport,setViewport]=useState<RuleMobileViewport|null>(null),[more,setMore]=useState(false);
 useEffect(()=>{
  const measure=()=>{
   const keyboard=(navigator as Navigator&{virtualKeyboard?:VirtualKeyboard}).virtualKeyboard;
   const next=ruleMobileViewport(document.documentElement.clientWidth,document.documentElement.clientHeight||window.innerHeight,window.visualViewport,keyboard?.boundingRect);
   const old=lastViewport.current;if(old&&Object.keys(next).every(key=>old[key as keyof RuleMobileViewport]===next[key as keyof RuleMobileViewport]))return;
   lastViewport.current=next;setViewport(next);onViewport(next);
  };
  const schedule=()=>{cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(measure);};
  const syncFocus=()=>{cancelAnimationFrame(focusFrame.current);focusFrame.current=requestAnimationFrame(()=>{const target=document.activeElement;setFocused(target===editor.view.dom||!!target&&!!root.current?.contains(target));});};
  measure();syncFocus();const keyboard=(navigator as Navigator&{virtualKeyboard?:VirtualKeyboard}).virtualKeyboard;
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);window.addEventListener('resize',schedule);window.addEventListener('orientationchange',schedule);keyboard?.addEventListener('geometrychange',schedule);
  document.addEventListener('focusin',syncFocus);document.addEventListener('focusout',syncFocus);editor.on('focus',syncFocus);editor.on('blur',syncFocus);
  return()=>{cancelAnimationFrame(frame.current);cancelAnimationFrame(focusFrame.current);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);window.removeEventListener('orientationchange',schedule);keyboard?.removeEventListener('geometrychange',schedule);document.removeEventListener('focusin',syncFocus);document.removeEventListener('focusout',syncFocus);editor.off('focus',syncFocus);editor.off('blur',syncFocus);};
 },[editor,onViewport]);
 useEffect(()=>{if(!focused||!bar.current)return;const node=bar.current,measure=()=>onHeight(node.offsetHeight),observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;measure();observer?.observe(node);if(!observer)window.addEventListener('resize',measure);return()=>{observer?.disconnect();if(!observer)window.removeEventListener('resize',measure);};},[focused,onHeight]);
 useEffect(()=>{
  if(!focused)return;let task=0,viewportCheck=false;
  const keepCaretVisible=(includeSelection=false)=>{viewportCheck=viewportCheck||includeSelection;cancelAnimationFrame(task);task=requestAnimationFrame(()=>{
   const checkSelection=viewportCheck;viewportCheck=false;
   if(!editor.isFocused||!checkSelection&&!editor.state.selection.empty||!bar.current)return;
   const caret=editor.view.coordsAtPos(editor.state.selection.head),limit=bar.current.getBoundingClientRect().top-12,header=document.querySelector('.topbar')?.getBoundingClientRect().bottom||0,controls=editor.view.dom.closest('.rule-topic-editor')?.querySelector('.rule-editor-toolbar'),controlRect=controls?.getBoundingClientRect();
   const pinnedControls=controls&&controlRect&&getComputedStyle(controls).position==='sticky'&&controlRect.top<=Math.max(viewport?.top||0,header)+16?controlRect.bottom:0,top=Math.max(viewport?.top||0,header,pinnedControls)+12;
   if(limit-top<Math.max(24,caret.bottom-caret.top))return;
   if(caret.bottom>limit+1)window.scrollBy({top:Math.ceil(caret.bottom-limit),behavior:'instant'});
   else if(caret.top<top-1)window.scrollBy({top:Math.floor(caret.top-top),behavior:'instant'});
  });};
  const selecting=()=>keepCaretVisible(),updated=()=>keepCaretVisible(true);keepCaretVisible(true);editor.on('selectionUpdate',selecting);editor.on('update',updated);
  return()=>{cancelAnimationFrame(task);editor.off('selectionUpdate',selecting);editor.off('update',updated);};
 },[editor,focused,viewport]);
 useEffect(()=>{if(!focused)setMore(false);},[focused]);
 function preserve(e:ReactPointerEvent){if(e.button!==0)return;onCapture();e.preventDefault();}
 function run(id:RuleMobileAction){onRun(id);setMore(false);}
 if(!focused||!viewport)return null;
 return createPortal(<div ref={root} className={'rule-mobile-dock '+(viewport.keyboard?'has-keyboard':'')} data-rule-mobile-tools style={{left:viewport.left,top:viewport.bottom,width:viewport.width}}>
  {more&&<section className="rule-mobile-more" aria-label="Mais ferramentas de formatação" style={{maxHeight:Math.max(48,Math.min(320,viewport.height-80))}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();onRelease();setMore(false);editor.view.focus();}}}>
   <header><strong>Texto e blocos</strong><button type="button" aria-label="Fechar mais ferramentas" onPointerDown={preserve} onPointerCancel={onRelease} onClick={()=>{onRelease();setMore(false);}}><X size={20}/></button></header>
   <label>Estilo do parágrafo<select aria-label="Estilo do parágrafo no celular" value={blockStyle} onPointerDown={onCapture} onChange={e=>{onStyle(e.target.value);setMore(false);}}><option value="text">Texto</option><option value="1">Cabeçalho 1</option><option value="2">Cabeçalho 2</option><option value="3">Cabeçalho 3</option><option value="4">Cabeçalho 4</option><option value="small">Texto pequeno</option></select></label>
   <div className="rule-mobile-more-grid">{secondary.map(({id,label,Icon})=><button key={id} type="button" disabled={disabled(id)} aria-pressed={id in active?active[id]:undefined} onPointerDown={preserve} onPointerCancel={onRelease} onClick={()=>run(id)}><Icon size={19}/><span>{label}</span></button>)}</div>
  </section>}
  <div ref={bar} className="rule-mobile-toolbar" role="toolbar" aria-label="Formatação do conteúdo no celular">
   <div className="rule-mobile-primary" aria-label="Formatações rápidas, deslize para ver mais">{primary.map(({id,label,Icon})=><button key={id} type="button" aria-label={label} title={label} aria-pressed={!!active[id]} disabled={disabled(id)} onPointerDown={preserve} onPointerCancel={onRelease} onClick={()=>run(id)}><Icon size={20}/></button>)}<button type="button" aria-label="Adicionar link" title="Adicionar link" aria-expanded={more} onPointerDown={preserve} onPointerCancel={onRelease} onClick={()=>setMore(!more)}><Link2 size={20}/></button></div>
   <button type="button" className="rule-mobile-overflow" aria-label="Mais opções de formatação" aria-expanded={more} onPointerDown={preserve} onPointerCancel={onRelease} onClick={()=>setMore(!more)}><MoreHorizontal size={23}/></button>
  </div>
 </div>,document.body);
}
