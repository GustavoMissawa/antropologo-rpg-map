'use client';

import { useEffect,useRef,useState } from 'react';
import { ArrowRight,CheckCircle2,ChevronDown,FilePlus2,Layers3,Link2,Trash2,Upload,UserRound,X } from 'lucide-react';
import { readContentFile,importReceipt,SHEET_FILE_ACCEPT } from '../lib/content-file';
import { AB10_RULEBOOK_ID,type Rulebook,type Sheet } from '../lib/model';

type Props={book:Rulebook;characters:Sheet[];onCreate:()=>void;onOpen:()=>void;onCharacter:()=>void;onLink:(sheet:Sheet)=>void;onUnlink:()=>void;notify:(message:string)=>void};

export function RulebookSheetLink({book,characters,onCreate,onOpen,onCharacter,onLink,onUnlink,notify}:Props){
 const [expanded,setExpanded]=useState(false),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[removing,setRemoving]=useState(false);
 const root=useRef<HTMLElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const fileInput=useRef<HTMLInputElement>(null),model=book.sheetTemplate,fixed=book.id===AB10_RULEBOOK_ID;
 useEffect(()=>{if(!expanded)return;const outside=(e:PointerEvent)=>{if(e.target instanceof Node&&!root.current?.contains(e.target)){setExpanded(false);setRemoving(false);}};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[expanded]);
 if(fixed&&!model)return null;
 function dismiss(){setExpanded(false);setRemoving(false);trigger.current?.focus();}
 function route(action:()=>void){setExpanded(false);setRemoving(false);action();}
 function link(source:Sheet){try{onLink(source);setExpanded(false);setError('');setRemoving(false);}catch(e){setError((e as Error).message);}}
 async function load(file?:File){if(!file)return;setBusy(true);setError('');try{const result=await readContentFile(file);if(result.kind!=='character')throw new Error('Este arquivo contém um sistema. Escolha uma ficha para vincular como modelo.');onLink(result.content);setExpanded(false);setRemoving(false);if(result.source==='super-png')notify(importReceipt(result)+' Modelo vinculado ao sistema.');}catch(e){setError((e as Error).message);}finally{setBusy(false);if(fileInput.current)fileInput.current.value='';}}
 return <section ref={root} className="ruleset-sheet-link compact-sheet-link" aria-label="Ficha do sistema" onKeyDown={e=>{if(e.key==='Escape'&&expanded){e.stopPropagation();dismiss();}}}>
  <div className="system-sheet-summary"><span className="system-sheet-icon"><Layers3 size={20}/></span><div className="system-sheet-label"><strong>Ficha-modelo {model&&<CheckCircle2 size={13} aria-label="Vinculada"/>}</strong><p title={model?.name||undefined}>{model?model.name||'Modelo sem nome':'Nenhuma ficha vinculada'}</p></div><button ref={trigger} type="button" className="button secondary system-sheet-trigger" aria-label={model?'Gerenciar ficha-modelo':'Criar ou vincular ficha'} aria-expanded={expanded} aria-controls="system-sheet-options" onClick={()=>{setExpanded(!expanded);setRemoving(false);}}>{model?'Gerenciar':'Vincular'}<ChevronDown size={15}/></button></div>
  <input ref={fileInput} type="file" accept={SHEET_FILE_ACCEPT} hidden aria-label="Arquivo de ficha-modelo do sistema" onChange={e=>load(e.target.files?.[0])}/>
  {expanded&&<div id="system-sheet-options" className="system-sheet-options"><header><strong>{model?'Gerenciar ficha-modelo':'Criar ou vincular ficha'}</strong><button type="button" className="icon-button" aria-label="Fechar opções da ficha-modelo" onClick={dismiss}><X size={18}/></button></header>
   {model&&<><p>{model.name||'Modelo sem nome'} · {model.blocks.length} {model.blocks.length===1?'bloco':'blocos'} · {model.tabs.length} {model.tabs.length===1?'aba':'abas'}. Personagens recebem cópias independentes do modelo.</p><div className="action-group wrap">{!fixed&&<button type="button" className="button secondary" onClick={()=>route(onOpen)}>Abrir ficha do sistema no editor <ArrowRight size={16}/></button>}<button type="button" className="button primary" onClick={()=>route(onCharacter)}><UserRound size={16}/> Criar personagem</button></div></>}
   {!fixed&&<>
   <p>{model?'O novo vínculo substitui somente o modelo deste sistema.':'Comece no editor atual ou use uma ficha que você já possui.'} Fichas de personagens existentes continuam independentes.</p>
   <div className="action-group wrap"><button type="button" className="button primary" onClick={()=>route(onCreate)}><FilePlus2 size={16}/>{model?'Criar novo modelo':'Criar modelo no editor'}</button><button type="button" className="button secondary" disabled={busy} onClick={()=>fileInput.current?.click()}><Upload size={16}/>{busy?'Carregando…':'Vincular arquivo de ficha'}</button></div>
   {!!characters.length&&<div className="system-sheet-existing"><label className="form-label">Usar uma ficha desta página<select aria-label="Ficha existente para vincular ao sistema" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Selecione uma ficha…</option>{characters.map(s=><option key={s.id} value={s.id}>{s.name||'Sem nome'} · {s.blocks.length} blocos</option>)}</select></label><button type="button" className="button secondary" disabled={!characters.some(s=>s.id===selected)} onClick={()=>{const source=characters.find(s=>s.id===selected);if(source)link(source);}}><Link2 size={16}/> Vincular cópia</button></div>}
   {model&&(removing?<div className="system-sheet-remove" role="alert"><p>Desvincular a ficha-modelo deste conjunto? Personagens já criados serão mantidos.</p><div className="action-group wrap"><button type="button" className="button secondary" onClick={()=>setRemoving(false)}>Cancelar</button><button type="button" className="button danger" onClick={()=>{try{onUnlink();setExpanded(false);setRemoving(false);setError('');}catch(e){setError((e as Error).message);}}}>Desvincular modelo</button></div></div>:<button type="button" className="text-button system-sheet-manage" onClick={()=>setRemoving(true)}><Trash2 size={14}/> Desvincular modelo</button>)}
   {error&&<p className="ruleset-import-error" role="alert">{error}</p>}
   </>}
  </div>}
 </section>;
}
