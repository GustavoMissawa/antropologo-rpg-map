'use client';
import { useEffect,useRef,useState } from 'react';
import { ImagePlus,Trash2 } from 'lucide-react';
import type { DieFace } from '../lib/dice-set';
import { dieFaceImageBytes } from '../lib/die-face-image';
import { prepareDieFaceImage } from './prepare-die-face-image';
export function DieFaceImageControl({index,face,onSave,onRemove,onBusy,contextLabel}:{index:number;contextLabel?:string;face?:Extract<DieFace,{kind:'image'}>;onSave:(face:Extract<DieFace,{kind:'image'}>)=>void;onRemove:()=>void;onBusy:(busy:boolean)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef(0),save=useRef(onSave);save.current=onSave;
 useEffect(()=>()=>{request.current++;},[]);
 async function upload(file?:File){if(!file)return;const token=++request.current;setBusy(true);onBusy(true);setError('');try{const src=await prepareDieFaceImage(file);if(token===request.current)save.current({kind:'image',src,label:face?.label||(contextLabel?'Imagem '+contextLabel:'Imagem da face '+index).slice(0,80)});}catch(e){if(token===request.current)setError((e as Error).message);}finally{if(token===request.current){setBusy(false);onBusy(false);}}}
 return <div className="die-face-image-control"><label className="button secondary die-face-image-upload"><ImagePlus size={16}/>{busy?'Otimizando…':face?'Substituir imagem':'Enviar imagem'}<input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" aria-label={contextLabel?'Imagem '+contextLabel:'Imagem da face '+index} disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void upload(file);}}/></label>
  {face?<><small>{Math.ceil(dieFaceImageBytes(face.src)/1024)} KB · proporção preservada</small><label>Descrição da imagem<input aria-label={contextLabel?'Descrição da imagem '+contextLabel:'Descrição da imagem da face '+index} maxLength={80} value={face.label} onChange={e=>onSave({...face,label:e.target.value})}/></label><button type="button" className="text-button" disabled={busy} onClick={onRemove}><Trash2 size={14}/> Remover imagem</button></>:<small>PNG, JPG ou WebP · até 8 MB. Otimizada para até 256 × 256 px, com transparência quando disponível. Máximo de 150 KB após preparo.</small>}
  {error&&<p role="alert" className="form-error">{error}</p>}
 </div>;
}
