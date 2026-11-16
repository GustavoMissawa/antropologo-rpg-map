'use client';
import {useEffect,useRef,type RefObject} from 'react';

/** Content is visible by default. Observer/animation failures always degrade to static content. */
export function useContentReveal(root:RefObject<HTMLElement|null>,enabled:boolean,revision:string){
 const seen=useRef(new WeakSet<Element>());
 useEffect(()=>{
  const el=root.current;if(!enabled||!el)return;
  const reduced=matchMedia('(prefers-reduced-motion:reduce)'),animations=new Set<Animation>();let observer:IntersectionObserver|null=null,disposed=false;
  function stop(){observer?.disconnect();observer=null;for(const animation of animations)animation.cancel();animations.clear();}
  function start(){stop();if(reduced.matches||typeof IntersectionObserver==='undefined')return;
   observer=new IntersectionObserver(entries=>{if(disposed)return;let stagger=0;for(const entry of entries){if(!entry.isIntersecting||seen.current.has(entry.target))continue;seen.current.add(entry.target);observer?.unobserve(entry.target);const node=entry.target as HTMLElement;if(document.visibilityState!=='visible'||typeof node.animate!=='function')continue;try{const animation=node.animate([{opacity:0,transform:'translateY(20px)'},{opacity:Number(getComputedStyle(node).opacity),transform:'translateY(0)'}],{duration:620,delay:(stagger++%4)*80,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});animations.add(animation);animation.onfinish=()=>animations.delete(animation);animation.oncancel=()=>animations.delete(animation);}catch{/* Default styles remain visible. */}}},{threshold:.08});
   for(const node of el!.querySelectorAll('[data-reveal],.ruleset-card,.pdf-card,.character-library-grid>.discovery-card'))if(!seen.current.has(node))observer.observe(node);
  }
  start();reduced.addEventListener('change',start);return()=>{disposed=true;stop();reduced.removeEventListener('change',start);};
 },[root,enabled,revision]);
}
