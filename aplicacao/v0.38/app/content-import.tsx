'use client';
import type {DragEvent} from 'react';
import {CheckCircle2,X} from 'lucide-react';
export function contentDragOver(event:DragEvent){
 if(event.dataTransfer.types.includes('Files')&&!(event.target as HTMLElement).closest('dialog,[contenteditable="true"]')){event.preventDefault();event.dataTransfer.dropEffect='copy';}
}
export function contentDrop(event:DragEvent,onFile:(file:File)=>void,onError:(message:string)=>void){
 if((event.target as HTMLElement).closest('dialog,[contenteditable="true"]')||!event.dataTransfer.files.length)return;
 event.preventDefault();event.stopPropagation();if(event.dataTransfer.files.length!==1){onError('Carregue um arquivo de cada vez.');return;}onFile(event.dataTransfer.files[0]);
}
export function ContentImportReceipt({message,onClose}:{message:string;onClose:()=>void}){
 return <aside className="content-import-receipt" role="status"><CheckCircle2 size={19}/><p>{message}</p><button type="button" className="icon-button" aria-label="Fechar confirmação de importação" onClick={onClose}><X size={16}/></button></aside>;
}
