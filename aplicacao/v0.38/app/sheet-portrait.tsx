'use client';
import {useEffect,useRef,useState} from 'react';
import {ImagePlus,Trash2,UserRound} from 'lucide-react';
import type {Sheet} from '../lib/model';
import {MAX_SHEET_BYTES} from '../lib/sheet-visual';
import {prepareSheetImage} from './sheet-block-visuals';
import {SheetDialog} from './sheet-dialog';

export function SheetPortrait({sheet,onChange,readOnly=false}:{sheet:Sheet;onChange:(fn:(s:Sheet)=>Sheet)=>void;readOnly?:boolean}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useRef(sheet),request=useRef(0);current.current=sheet;
 useEffect(()=>()=>{request.current++;},[]);
 async function upload(file:File){
  const id=++request.current;setBusy(true);setError('');
  try{
   const portrait=await prepareSheetImage(file);if(id!==request.current)return;
   const next={...current.current,portrait};
   if(new TextEncoder().encode(JSON.stringify(next,null,2)).length>MAX_SHEET_BYTES)throw new Error('A ficha ultrapassaria 5 MB. Escolha uma imagem menor ou remova conteúdo.');
   onChange(s=>({...s,portrait}));
  }catch(e){if(id===request.current)setError((e as Error).message);}
  finally{if(id===request.current)setBusy(false);}
 }
 return <>
  <button type="button" className="sheet-portrait-trigger" aria-label={sheet.portrait?'Ver retrato de '+(sheet.name||'personagem'):readOnly?'Personagem sem retrato':'Adicionar retrato do personagem'} disabled={readOnly&&!sheet.portrait} onClick={()=>{setError('');setOpen(true);}}>
   {sheet.portrait?<img src={sheet.portrait} alt=""/>:<UserRound size={30}/>}
   {!readOnly&&<span>{sheet.portrait?'Retrato':'Adicionar'}</span>}
  </button>
  {open&&<SheetDialog title="Retrato do personagem" onClose={()=>setOpen(false)}>
   <div className="sheet-portrait-preview">{sheet.portrait?<img src={sheet.portrait} alt={'Retrato de '+(sheet.name||'personagem')}/>:<div><UserRound size={56}/><p>Seu personagem ainda não tem retrato.</p></div>}</div>
   {!readOnly&&<><p className="field-help">PNG, JPG ou WebP · até 8 MB. O retrato é otimizado e acompanha a ficha e o Super PNG.</p>
    <div className="action-group wrap"><label className="button secondary portrait-upload"><ImagePlus size={17}/>{busy?'Preparando…':sheet.portrait?'Substituir retrato':'Adicionar retrato'}<input aria-label="Escolher retrato do personagem" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/></label>
     {sheet.portrait&&<button type="button" className="button secondary" disabled={busy} onClick={()=>{onChange(({portrait,...s})=>s);setError('');}}><Trash2 size={16}/> Remover retrato</button>}
    </div>
   </>}
   {error&&<p className="sheet-inline-error" role="alert">{error}</p>}
   <div className="modal-footer"><button type="button" className="button primary" onClick={()=>setOpen(false)}>Concluir</button></div>
  </SheetDialog>}
 </>;
}
