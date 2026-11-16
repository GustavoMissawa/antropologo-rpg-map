'use client';
import {useEffect,useState,type RefObject} from 'react';
import {systemEditorViewport} from '../lib/system-editor-layout';
export function useSystemEditorViewport(dialog:RefObject<HTMLDialogElement|null>,content:RefObject<HTMLDivElement|null>){
 const [compact,setCompact]=useState(false);
 useEffect(()=>{
  let frame=0,width=window.innerWidth,baseline=window.innerHeight;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const root=dialog.current;if(!root)return;
   if(Math.abs(window.innerWidth-width)>80){width=window.innerWidth;baseline=window.innerHeight;}else baseline=Math.max(baseline,window.innerHeight);
   const el=document.activeElement,focused=!!el&&root.contains(el)&&el.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]),textarea');
   const box=systemEditorViewport(window.innerWidth,baseline,window.visualViewport,focused);
   root.style.setProperty('--system-editor-height',box.height+'px');root.style.setProperty('--system-editor-top',box.top+'px');root.style.setProperty('--system-editor-left',box.left+'px');root.style.setProperty('--system-editor-width',box.width+'px');root.dataset.keyboard=String(box.keyboard);setCompact(box.compact);
   // Scroll only the editor's content, and only if the focused field is clipped.
   const pane=content.current;if(box.fullscreen&&focused&&pane&&el instanceof HTMLElement){const field=el.getBoundingClientRect(),bounds=pane.getBoundingClientRect();if(field.bottom>bounds.bottom-12)pane.scrollTop+=field.bottom-bounds.bottom+12;else if(field.top<bounds.top+12)pane.scrollTop+=field.top-bounds.top-12;}
  });};
  schedule();window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);};
 },[dialog,content]);return compact;
}
