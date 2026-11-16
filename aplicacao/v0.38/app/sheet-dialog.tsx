'use client';
import { useEffect,useRef,type ReactNode } from 'react';
import { X } from 'lucide-react';
export function SheetDialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);
 return <dialog ref={ref} className="modal map-dialog" aria-label={title} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="modal-head"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Fechar janela" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
