'use client';
import { useEffect,useRef,type ReactNode } from 'react';
import { X } from 'lucide-react';
export function SheetDialog({title,children,onClose,drawer=false}:{title:string;children:ReactNode;onClose:()=>void;drawer?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),body=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const dialog=ref.current;
  if(!dialog)return;
  dialog.showModal();
  return ()=>dialog.close();
 },[]);
 useEffect(()=>{
  if(!drawer)return;
  const dialog=ref.current,pane=body.current;
  if(!dialog||!pane)return;
  const visual=window.visualViewport;
  let frame=0;
  const schedule=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const layoutHeight=document.documentElement.clientHeight||window.innerHeight;
    const height=visual?.height??window.innerHeight;
    const bottom=Math.max(0,layoutHeight-height-(visual?.offsetTop??0));
    dialog.style.setProperty('--map-dialog-visible-height',height+'px');
    dialog.style.setProperty('--map-dialog-bottom',bottom+'px');
    if(getComputedStyle(dialog).getPropertyValue('--map-drawer-active').trim()!=='1')return;
    const focus=document.activeElement;
    if(!(focus instanceof HTMLElement)||!pane.contains(focus)||!focus.matches('input:not([type=file]), textarea, select, [contenteditable="true"]'))return;
    const field=focus.getBoundingClientRect(),bounds=pane.getBoundingClientRect();
    const footer=pane.querySelector('.modal-footer')?.getBoundingClientRect();
    const bottomEdge=footer&&!focus.closest('.modal-footer')?Math.min(bounds.bottom,footer.top):bounds.bottom;
    const inset=12;
    if(field.bottom>bottomEdge-inset)pane.scrollTop+=field.bottom-bottomEdge+inset;
    else if(field.top<bounds.top+inset)pane.scrollTop+=field.top-bounds.top-inset;
   });
  };
  schedule();
  visual?.addEventListener('resize',schedule);
  visual?.addEventListener('scroll',schedule);
  window.addEventListener('resize',schedule);
  dialog.addEventListener('focusin',schedule);
  return ()=>{
   cancelAnimationFrame(frame);
   visual?.removeEventListener('resize',schedule);
   visual?.removeEventListener('scroll',schedule);
   window.removeEventListener('resize',schedule);
   dialog.removeEventListener('focusin',schedule);
  };
 },[drawer]);
 return <dialog ref={ref} className={'modal map-dialog'+(drawer?' map-drawer':'')} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}>
  <div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Fechar janela" onClick={onClose}><X size={20}/></button></div>
  {drawer?<div className="map-dialog-body" ref={body}>{children}</div>:children}
 </dialog>;
}
