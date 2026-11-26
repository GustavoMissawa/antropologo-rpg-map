'use client';

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { OrbitalDestination } from '../lib/orbital-navigation';
import type { PlatformRoute } from '../lib/platform-navigation';

type Departure = {destination?: OrbitalDestination; bounds: CSSProperties};

/** Keeps the real Home scene mounted over the new route until their visual handoff ends. */
export function useSystemApproach(orbital: boolean) {
  const homeLayer = useRef<HTMLDivElement>(null);
  const [departure,setDeparture] = useState<Departure | null>(null);
  const trackApproach = useCallback((from: PlatformRoute,to: PlatformRoute,animate: boolean) => {
    const el = homeLayer.current;
    if (!animate || from.page!=='home' || to.page!=='rules' || !to.bookId || !el?.animate
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) {
      setDeparture(null);
      return;
    }
    const bounds = el.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      setDeparture(null);
      return;
    }
    const art = el.querySelector('.orbital-art')?.getBoundingClientRect();
    const x = art && art.width ? art.left + art.width/2 - bounds.left : bounds.width/2;
    const y = art && art.height ? art.top + art.height/2 - bounds.top : bounds.height/2;
    setDeparture({destination:from.destination,bounds:{
      left:bounds.left,top:bounds.top,width:bounds.width,height:bounds.height,transformOrigin:`${x}px ${y}px`,
    }});
  },[]);

  useLayoutEffect(()=>{
    const el = homeLayer.current;
    if(!orbital || !departure || !el)return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = el.offsetWidth < 620;
    const duration = compact ? 790 : 960;
    const moving = el.animate([
      {opacity:1,transform:'none'},
      {opacity:.88,transform:'translate(1%, -1%) scale(1.07)',offset:.31},
      {opacity:0,transform:`translate(${compact?4:8}%, -4%) scale(1.24)`},
    ],{duration,easing:'cubic-bezier(.23, 1, .32, 1)',fill:'both'});
    const stars = el.querySelector('.orbital-starfield')?.animate([
      {translate:'none'},
      {translate:'-32px -14px'},
    ],{duration,easing:'cubic-bezier(.23, 1, .32, 1)'});
    const finish = () => {setDeparture(current=>current===departure?null:current);};
    const checkVisibility = () => {if(document.hidden)finish();};
    const checkMotion = () => {if(motion.matches)finish();};
    moving.addEventListener('finish',finish);
    document.addEventListener('visibilitychange',checkVisibility);
    motion.addEventListener('change',checkMotion);
    return()=>{
      moving.removeEventListener('finish',finish);
      moving.cancel();
      stars?.cancel();
      document.removeEventListener('visibilitychange',checkVisibility);
      motion.removeEventListener('change',checkMotion);
    };
  },[orbital,departure]);
  return {homeLayer, departure:orbital?departure:null, trackApproach};
}
