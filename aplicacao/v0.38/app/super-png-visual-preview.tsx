'use client';
import {useEffect,useRef,useState} from 'react';
import type {Rulebook} from '../lib/model';
import type {SystemVisuals} from '../lib/system-visuals';
import {currentExportAccent,renderSuperPngCover} from './super-png-cover';

/** Uses the export renderer so framing and the downloaded image agree. */
export function SuperPngVisualPreview({book,theme}:{book:Rulebook;theme:SystemVisuals}){
 const [src,setSrc]=useState(''),[error,setError]=useState(''),[working,setWorking]=useState(true),url=useRef('');
 useEffect(()=>{
  let cancelled=false;setWorking(true);setError('');
  const timer=setTimeout(async()=>{try{
   const blob=await renderSuperPngCover({...book,visuals:theme},currentExportAccent());if(cancelled)return;
   const next=URL.createObjectURL(blob),previous=url.current;url.current=next;setSrc(next);if(previous)URL.revokeObjectURL(previous);
  }catch(e){if(!cancelled){setSrc('');setError((e as Error).message);}}finally{if(!cancelled)setWorking(false);}},120);
  return()=>{cancelled=true;clearTimeout(timer);};
 },[book,theme]);
 useEffect(()=>()=>{if(url.current)URL.revokeObjectURL(url.current);},[]);
 return <div className="super-png-theme-preview" aria-busy={working}>{src?<img src={src} alt={'Prévia da capa do Super PNG de '+book.name}/>:<p role={error?'alert':'status'}>{error||'Preparando prévia da capa…'}</p>}</div>;
}
