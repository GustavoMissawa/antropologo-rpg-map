'use client';
import { useEffect,useId,useLayoutEffect,useMemo,useReducer,useRef,useState,type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { DesktopDiceArena } from '../lib/desktop-dice-placement';
import type { MobileDiceArena } from '../lib/mobile-dice-placement';
import { SHEET_DIE_PATHS,decorativeDieSurface } from '../lib/sheet-die-paths';
import { diceSceneReducer,emptyDiceScene,diceMotionStyle,PILE_EXIT_MS,IMPACT_EXIT_MS,type MotionOptions,type VisualDie,type VisualRoll } from '../lib/sheet-dice-motion';

export function SheetRollBackground({roll,clearKey}:{roll:VisualRoll|null;clearKey:number}){
 const clipId=useId().replace(/:/g,'')+'-dice-sides';
 const exitTimers=useRef(new Map<string,ReturnType<typeof setTimeout>>());
 const [options,setOptions]=useState<MotionOptions>({mobile:false,reduced:false}),[ready,setReady]=useState(false),[host,setHost]=useState<HTMLElement|null>(null);
 const [arena,setArena]=useState<DesktopDiceArena|undefined>(undefined),[mobileArena,setMobileArena]=useState<MobileDiceArena|undefined>(undefined);
 const motionOptions=useMemo(()=>({...options,...(options.mobile&&mobileArena?{mobileArena}:!options.mobile&&arena?{desktop:arena}:{})}),[options,arena,mobileArena]);
 const [dimensions,setDimensions]=useState({height:1000,bottom:0});
 const [scene,dispatch]=useReducer(diceSceneReducer,undefined,emptyDiceScene);
 const lastRoll=useRef<string|null>(null),lastClear=useRef(clearKey),nodes=useRef(new Map<string,SVGSVGElement>()),timers=useRef(new Map<string,ReturnType<typeof setTimeout>>()),currentOptions=useRef(motionOptions);currentOptions.current=motionOptions;
 useEffect(()=>{const mobile=window.matchMedia('(max-width:790px)'),reduced=window.matchMedia('(prefers-reduced-motion:reduce)'),update=()=>{setOptions({mobile:mobile.matches,reduced:reduced.matches});setReady(true);};update();mobile.addEventListener('change',update);reduced.addEventListener('change',update);return()=>{mobile.removeEventListener('change',update);reduced.removeEventListener('change',update);};},[]);
 useEffect(()=>{if(!ready)return;setHost(options.mobile?document.body:document.getElementById('sheet-page-background'));},[ready,options.mobile]);
 useEffect(()=>{if(ready)dispatch({type:'configure',options:motionOptions});},[ready,motionOptions]);
 useLayoutEffect(()=>{if(!host)return;
  const sheet=document.querySelector<HTMLElement>('.sheet-map');
  const measure=()=>{const viewport=window.visualViewport,height=options.mobile?(viewport?.height||window.innerHeight)*.13:host.getBoundingClientRect().height,bottom=options.mobile?Math.max(0,window.innerHeight-(viewport?.height||window.innerHeight)-(viewport?.offsetTop||0)):0;
   setDimensions(old=>old.height===height&&old.bottom===bottom?old:{height:Math.max(1,height),bottom});
   if(options.mobile){const next={width:document.documentElement.clientWidth,height:Math.max(1,Math.round(height))};setMobileArena(old=>old?.width===next.width&&old.height===next.height?old:next);}
   if(!options.mobile&&sheet&&getComputedStyle(sheet).position!=='fixed'){const root=host.getBoundingClientRect(),card=sheet.getBoundingClientRect(),round=Math.round;const next:DesktopDiceArena={width:round(root.width),height:round(root.height),sheet:{left:round(card.left-root.left),right:round(card.right-root.left),top:round(card.top-root.top),bottom:round(card.bottom-root.top)}};if(next.width>0&&next.height>0)setArena(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);}
  };
  measure();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;if(!options.mobile){observer?.observe(host);if(sheet)observer?.observe(sheet);}window.addEventListener('resize',measure);window.visualViewport?.addEventListener('resize',measure);window.visualViewport?.addEventListener('scroll',measure);
  return()=>{observer?.disconnect();window.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('scroll',measure);};
 },[host,options.mobile]);
 useEffect(()=>{if(!ready||!roll||lastRoll.current===roll.id)return;lastRoll.current=roll.id;dispatch({type:'roll',roll,options:motionOptions});},[ready,roll,motionOptions]);
 useLayoutEffect(()=>{if(lastClear.current===clearKey)return;lastClear.current=clearKey;const departure:Record<string,VisualDie['departure']>={};for(const [id,node] of nodes.current){const transform=getComputedStyle(node).transform;try{const m=new DOMMatrixReadOnly(transform==='none'?undefined:transform),matrix=(y:number)=>`matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${y})`;departure[id]={from:matrix(m.f),lift:matrix(m.f-14),to:matrix(m.f+dimensions.height+180)};}catch{/* A missing matrix uses the CSS fallback. */}}dispatch({type:'clear',reduced:options.reduced,departure});},[clearKey,options.reduced,dimensions.height]);
 useEffect(()=>{
  const active=new Set(scene.falling.map(d=>d.id));for(const [id,timer] of timers.current)if(!active.has(id)){clearTimeout(timer);timers.current.delete(id);}
  for(const die of scene.falling)if(!timers.current.has(die.id)){const style=diceMotionStyle(die,options.mobile);timers.current.set(die.id,setTimeout(()=>{timers.current.delete(die.id);dispatch({type:'land',id:die.id,options:currentOptions.current});},style.duration+style.delay+80));}
 },[scene.falling,options.mobile]);
 useEffect(()=>{const active=new Set(scene.departing.map(d=>d.id));for(const [id,timer] of exitTimers.current)if(!active.has(id)){clearTimeout(timer);exitTimers.current.delete(id);}for(const die of scene.departing)if(!exitTimers.current.has(die.id))exitTimers.current.set(die.id,setTimeout(()=>{exitTimers.current.delete(die.id);dispatch({type:'remove-departing',ids:[die.id]});},options.reduced?0:(die.exitKind==='impact'?IMPACT_EXIT_MS:PILE_EXIT_MS)+60));},[scene.departing,options.reduced]);
 useEffect(()=>()=>{for(const timer of timers.current.values())clearTimeout(timer);timers.current.clear();for(const timer of exitTimers.current.values())clearTimeout(timer);exitTimers.current.clear();},[]);
 if(!ready||!host)return null;
 const visible=[...scene.resting.map(d=>({die:d,phase:'is-settled'})),...scene.falling.map(d=>({die:d,phase:'is-falling'})),...scene.departing.map(d=>({die:d,phase:d.exitKind==='impact'?'is-impacted':'is-leaving'}))];
 return createPortal(<div className={'sheet-roll-background '+(options.mobile?'mobile-dice-pile':'desktop-dice-pile')} aria-hidden="true" style={{'--scene-height':dimensions.height+'px','--pile-bottom':dimensions.bottom+'px',...(!options.mobile&&arena?{clipPath:'url(#'+clipId+')'}:{})} as CSSProperties}>
  <svg className="sheet-dice-definitions" width="0" height="0" focusable="false"><defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse">{arena&&<><rect x="0" y="0" width={Math.max(0,arena.sheet.left)} height={arena.height}/><rect x={arena.sheet.right} y="0" width={Math.max(0,arena.width-arena.sheet.right)} height={arena.height}/></>}</clipPath></defs></svg>
  {visible.map(({die,phase})=>{const s=diceMotionStyle(die,options.mobile);return <svg ref={node=>{if(node)nodes.current.set(die.id,node);else nodes.current.delete(die.id);}} key={die.id} data-backdrop-id={die.id} data-persistent={die.persistent} className={'sheet-background-die '+phase+(!die.persistent?' is-transient':'')} viewBox="0 0 200 200" fill="none" focusable="false" onAnimationEnd={e=>{if(e.animationName==='sheet-die-impact'||e.animationName==='sheet-die-depart')dispatch({type:'remove-departing',ids:[die.id]});if(e.animationName==='sheet-die-fall')dispatch({type:'land',id:die.id,options:currentOptions.current});}} style={{left:s.left+'%',bottom:s.bottom+'px',zIndex:die.slot+1,'--die-size':s.size+'px','--die-angle':s.angle+'deg','--die-opacity':s.opacity,'--fall-duration':s.duration+'ms','--fall-delay':s.delay+'ms','--fall-drift':s.drift+'px','--fall-turn':s.turn+'deg',...(die.departure?{'--leave-from':die.departure.from,'--leave-lift':die.departure.lift,'--leave-to':die.departure.to}:{})} as CSSProperties}><path className="sheet-die-surface" d={decorativeDieSurface(die.faces)}/><path className="sheet-die-edges" d={SHEET_DIE_PATHS[die.faces]||decorativeDieSurface(die.faces)} vectorEffect="non-scaling-stroke"/>{!SHEET_DIE_PATHS[die.faces]&&<text className="sheet-die-custom-label" x="100" y="112" textAnchor="middle">d{die.faces}</text>}</svg>;})}
 </div>,host);
}
