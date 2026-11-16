'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
/** One index, presented as an ordinary sidebar or a native modal drawer. */
export function RulesIndex({mobile,open,total,onClose,children}:{mobile:boolean;open:boolean;total:number;onClose:()=>void;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),start=useRef<number|null>(null);
 useEffect(()=>{
  if(!mobile||!open)return;const el=dialog.current;if(!el)return;el.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{el.close();document.body.style.overflow=overflow;};
 },[mobile,open]);
 if(!mobile)return <aside className="rule-index">{children}</aside>;
 if(!open)return null;
 return <dialog ref={dialog} className="rules-index-drawer" aria-label="Índice do sistema" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target!==dialog.current)return;const box=e.currentTarget.getBoundingClientRect();if(e.clientY<box.top||e.clientY>box.bottom||e.clientX<box.left||e.clientX>box.right)onClose();}}>
  <div className="rules-index-handle" aria-hidden="true" onPointerDown={e=>{start.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{if(start.current!==null&&e.clientY-start.current>70)onClose();start.current=null;}} onPointerCancel={()=>{start.current=null;}}><span/></div>
  <header><h2>Índice do sistema <span>{total} tópicos</span></h2><button type="button" className="icon-button" aria-label="Fechar índice" onClick={onClose}><X size={21}/></button></header>
  <div className="rules-index-content">{children}</div>
 </dialog>;
}
