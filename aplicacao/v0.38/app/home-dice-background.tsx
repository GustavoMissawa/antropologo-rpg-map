'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {HeroDie} from './hero-die';
import {createAmbientDice,relocateAmbientDie,type AmbientDie} from '../lib/ambient-dice';

const blockedSelector='button,a,input,textarea,select,[contenteditable],dialog,.discovery-hero,.content-rail-heading,.discovery-card,.discovery-tools,.test-notice,.rule-article,.rules-index,.sheet-map,.calendar-panel,.selected-day-panel,.pdf-card,p,h1,h2,h3,h4,label';
/** Fixed decorative instances rotate first, then fade and reuse a safe position. */
export function HomeDiceBackground(){
 const layer=useRef<HTMLDivElement>(null),current=useRef<AmbientDie[]>([]),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const [dice,setDice]=useState<AmbientDie[]>([]),[environment,setEnvironment]=useState({mobile:false,reduced:true,visible:true});current.current=dice;
 const clearPending=useCallback(()=>{for(const timer of timers.current)clearTimeout(timer);timers.current.clear();},[]);
 useEffect(()=>{const narrow=matchMedia('(max-width:790px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');const update=()=>{const next={mobile:narrow.matches,reduced:reduced.matches,visible:document.visibilityState==='visible'};setEnvironment(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);};update();narrow.addEventListener('change',update);reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);return()=>{narrow.removeEventListener('change',update);reduced.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};},[]);
 useEffect(()=>{
  const el=layer.current;if(!el)return;
  let measuredWidth=0,measuredHeight=0;
  const resize=()=>{
   const bounds=el.getBoundingClientRect(),width=Math.round(bounds.width||window.innerWidth),height=Math.round(bounds.height||Math.max(100,window.innerHeight-78));
   // Browser chrome changes mobile height during scrolling; keep the scene intact.
   // A width change (including orientation) still lays out the dice again.
   if(width===measuredWidth&&(environment.mobile||height===measuredHeight))return;
   measuredWidth=width;measuredHeight=height;clearPending();
   setDice(createAmbientDice(width,height,environment.mobile));
  };
  resize();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;ro?.observe(el);window.addEventListener('resize',resize);
  return()=>{ro?.disconnect();window.removeEventListener('resize',resize);};
 },[environment.mobile,clearPending]);
 useEffect(()=>{if(environment.mobile||environment.reduced||!environment.visible)setDice(old=>old.some(d=>d.phase!=='visible')?old.map(d=>({...d,phase:'visible'})):old);return clearPending;},[environment.mobile,environment.reduced,environment.visible,clearPending]);
 const relocate=useCallback((id:number,cursor:{x:number;y:number})=>{
  const root=layer.current,die=current.current.find(d=>d.id===id);if(!root||!die||die.phase!=='visible'||environment.mobile||environment.reduced||!environment.visible||document.visibilityState!=='visible'||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  const bounds=root.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
  const blocked=[...document.querySelectorAll(blockedSelector)].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height&&r.bottom>bounds.top&&r.top<bounds.bottom).map(r=>({x:r.left-bounds.left,y:r.top-bounds.top,width:r.width,height:r.height}));
  const next=relocateAmbientDie(die,bounds.width,bounds.height,current.current,blocked,{x:cursor.x-bounds.left,y:cursor.y-bounds.top});if(!next)return;
  const later=(action:()=>void,delay:number)=>{const timer=setTimeout(()=>{timers.current.delete(timer);action();},delay);timers.current.add(timer);};
  setDice(old=>old.map(d=>d.id===id?{...d,phase:'fading'}:d));
  later(()=>{setDice(old=>old.map(d=>d.id===id?{...d,...next,phase:'waiting'}:d));later(()=>setDice(old=>old.map(d=>d.id===id?{...d,phase:'visible'}:d)),220);},280);
 },[environment.mobile,environment.reduced,environment.visible]);
 return <div ref={layer} className="ambient-backdrop home-dice-background" aria-hidden="true" data-paused={!environment.visible} data-reduced={environment.reduced}><div className="ambient-dot-edges"/>{dice.map(d=><div key={d.id} className="ambient-die" data-ambient-id={d.id} data-phase={d.phase} style={{left:d.x,top:d.y,width:d.size,height:d.size}}><HeroDie faces={d.faces} ambient active={d.phase==='visible'} onMotionThreshold={cursor=>relocate(d.id,cursor)}/></div>)}</div>;
}
