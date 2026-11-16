'use client';
import { useEffect,useRef,useState } from 'react';
import { BookOpen,Check,Dices,ImagePlus,Settings2,Trash2,X } from 'lucide-react';
import { MAX_RULE_LOGO_BYTES,MAX_RULE_LOGO_UPLOAD_BYTES,validRulebookLogo,makeRulebook,serializeRulebook,MAX_RULEBOOK_BYTES,type Rulebook } from '../lib/model';
import { parseDiceSet,parseDiceResolution,type DiceSet } from '../lib/dice-set';
import {SystemVisualEditor} from './system-visual-editor';
import {systemThemeDefinition} from '../lib/system-identity';
import type {SystemVisuals} from '../lib/system-visuals';
import { RulebookDiceEditor } from './rulebook-dice';
import { useSystemEditorViewport } from './use-system-editor-viewport';
export type RulebookMetadata={id?:string;name:string;description:string;logo?:string;dice?:DiceSet;visuals?:SystemVisuals};

async function prepareLogo(file:File){
 if(file.size>MAX_RULE_LOGO_UPLOAD_BYTES)throw new Error('Escolha uma logo de até 2 MB.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use uma imagem PNG, JPG ou WebP.');
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('Não foi possível abrir esta imagem. Escolha outro arquivo.');}
 try{
  if(!bitmap.width||!bitmap.height)throw new Error('A imagem está vazia.');
  const scale=Math.min(1,1024/bitmap.width,512/bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível preparar a logo neste navegador.');context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.9));if(!blob||blob.size>MAX_RULE_LOGO_BYTES)throw new Error('A logo ficou muito grande. Use uma imagem menor ou mais simples.');
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a logo.'));reader.readAsDataURL(blob);});
  if(!validRulebookLogo(data))throw new Error('A imagem não pôde ser preparada. Tente um PNG, JPG ou WebP diferente.');return data;
 }finally{bitmap.close();}
}
export function RulebookMetadataDialog({initial,book,onSave,onClose,initialCustomizing}:{initial:RulebookMetadata;book?:Rulebook;initialCustomizing?:boolean;onSave:(value:RulebookMetadata,customizing:boolean)=>void;onClose:()=>void}){
 const [personalizing,setPersonalizing]=useState(false);
 const [faceBusy,setFaceBusy]=useState(false),[category,setCategory]=useState<'general'|'dice'|'configuration'>('general'),[customizing,setCustomizing]=useState(initialCustomizing??initial.dice!==undefined),[confirmClose,setConfirmClose]=useState(false);
 const [name,setName]=useState(initial.name),[description,setDescription]=useState(initial.description),[logo,setLogo]=useState(initial.logo),[dice,setDice]=useState(initial.dice),[busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef(0);
 const dialog=useRef<HTMLDialogElement>(null),content=useRef<HTMLDivElement>(null),nameInput=useRef<HTMLInputElement>(null),compact=useSystemEditorViewport(dialog,content);
 const baseline=useRef(JSON.stringify({name:initial.name,description:initial.description,logo:initial.logo,dice:initial.dice})),dirty=JSON.stringify({name,description,logo,dice})!==baseline.current;
 const categories=[{id:'general' as const,label:'Geral',short:'Geral',Icon:BookOpen},{id:'dice' as const,label:'Regras de Dados',short:'Dados',Icon:Dices},...(customizing?[{id:'configuration' as const,label:'Configurações de Dados',short:'Configurações',Icon:Settings2}]:[])];
 useEffect(()=>{dialog.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{request.current++;document.body.style.overflow=previous;};},[]);
 useEffect(()=>{if(!customizing&&category==='configuration')setCategory('dice');},[customizing,category]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function close(){if(dirty||busy||faceBusy)setConfirmClose(true);else onClose();}
 function choose(next:typeof category){setCategory(next);setConfirmClose(false);if(content.current)content.current.scrollTop=0;}
 function submit(options?:{visuals:SystemVisuals|undefined}){
  const overrideVisuals=options?options.visuals:initial.visuals;
  if(busy||faceBusy)return;setConfirmClose(false);
  if(!name.trim()){setCategory('general');setError('Dê um nome ao seu conjunto.');requestAnimationFrame(()=>nameInput.current?.focus());return;}
  if(dice)try{if(dice.resolution)parseDiceResolution(dice.resolution);}catch(e){choose('dice');setError((e as Error).message);return;}
  let parsed:DiceSet|undefined;try{parsed=dice===undefined?undefined:parseDiceSet(dice);}catch(e){setCustomizing(true);choose('configuration');setError((e as Error).message);return;}
  try{onSave({...initial,name:name.trim(),description,logo,dice:parsed,visuals:overrideVisuals},customizing);}catch(e){setError((e as Error).message);}
 }
 function validateDiceStorage(next:DiceSet){serializeRulebook({...book||makeRulebook('Novo sistema'),name:name.trim()||'Novo sistema',description,logo,dice:next,visuals:initial.visuals});}
 const storageBytes=(()=>{try{return new TextEncoder().encode(serializeRulebook({...book||makeRulebook('Novo sistema'),name:name.trim()||'Novo sistema',description,logo,dice,visuals:initial.visuals})).byteLength;}catch{return null;}})();
 async function upload(file?:File){if(!file)return;const current=++request.current;setBusy(true);setError('');try{const next=await prepareLogo(file);if(current===request.current)setLogo(next);}catch(e){if(current===request.current)setError((e as Error).message);}finally{if(current===request.current)setBusy(false);}}
 return <><dialog ref={dialog} className="modal system-editor" aria-label={initial.id?'Editar conjunto de regras':'Criar conjunto de regras'} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}}><form noValidate onChange={()=>setError('')} onSubmit={e=>{e.preventDefault();submit();}}>
  <header className="system-editor-header"><div><span className="subtle-label">EDITOR DE SISTEMA</span><h2>{initial.id?'Editar conjunto de regras':'Criar conjunto de regras'}</h2></div><button type="button" className="icon-button" aria-label="Fechar editor de sistema" onClick={close}><X size={21}/></button></header>
  <nav className="system-editor-nav" role="tablist" aria-label="Categorias do editor de sistema" aria-orientation={compact?'horizontal':'vertical'} onKeyDown={e=>{const step=e.key==='ArrowRight'||e.key==='ArrowDown'?1:e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:0;if(!step&&e.key!=='Home'&&e.key!=='End')return;e.preventDefault();const index=categories.findIndex(item=>item.id===category),next=categories[e.key==='Home'?0:e.key==='End'?categories.length-1:(index+step+categories.length)%categories.length];choose(next.id);dialog.current?.querySelector<HTMLButtonElement>('#system-tab-'+next.id)?.focus();}}>{categories.map(({id,label,short,Icon})=><button type="button" key={id} role="tab" id={'system-tab-'+id} aria-controls={'system-panel-'+id} aria-label={label} aria-selected={category===id} tabIndex={category===id?0:-1} onClick={()=>choose(id)}><Icon size={19}/><span className="system-category-full">{label}</span><span className="system-category-short">{short}</span></button>)}</nav>
  <div ref={content} className="system-editor-content">
  <section role="tabpanel" id="system-panel-general" aria-labelledby="system-tab-general" hidden={category!=='general'}><h3>Geral</h3><p className="modal-intro">Nome, descrição e identidade visual do seu sistema.</p>
  <label className="form-label">Nome do sistema<input ref={nameInput} name="name" aria-label="Nome do sistema" required maxLength={200} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Reinos de Cinza"/></label>
  <label className="form-label">Descrição <span>opcional</span><textarea name="description" aria-label="Descrição do sistema" rows={3} maxLength={2000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Uma breve apresentação do seu universo ou das suas regras."/></label>
  <section className="ruleset-logo-editor" aria-label="Logo do sistema"><header><strong>Logo do sistema <small>opcional</small></strong>{logo&&<button className="text-button" type="button" disabled={busy||faceBusy} onClick={()=>{setLogo(undefined);setError('');}}><Trash2 size={14}/> Remover logo</button>}</header><div className="ruleset-logo-preview">{logo?<img src={logo} alt={'Prévia da logo de '+(name||'seu sistema')}/>:<span>{name||'Nome do sistema'}</span>}</div><label className="button secondary ruleset-logo-upload"><ImagePlus size={17}/>{busy?'Preparando logo…':logo?'Trocar logo':'Enviar logo'}<input aria-label="Escolher logo do sistema" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" disabled={busy||faceBusy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void upload(file);}}/></label><p>PNG, JPG ou WebP · até 2 MB. A logo acompanha o arquivo .regras. Sem imagem, o nome completo aparece no card.</p></section>
  <div className="system-personalize-entry"><div><strong>Personalização visual</strong><p>Aparência no computador, no celular e capa de exportação em Super PNG.</p></div><button type="button" className="button secondary" disabled={busy||faceBusy||!name.trim()} onClick={()=>{setError('');setPersonalizing(true);}}><ImagePlus size={17}/> Personalizar</button></div>
  </section>
  <RulebookDiceEditor value={dice} onChange={setDice} validate={validateDiceStorage} onBusy={setFaceBusy} category={category} customizing={customizing} onCustomize={setCustomizing}/>
  </div>
  <footer className="system-editor-footer"><p className="ruleset-storage-note">{storageBytes!==null?Math.ceil(storageBytes/1024).toLocaleString('pt-BR')+' KB de '+(MAX_RULEBOOK_BYTES/1024).toLocaleString('pt-BR')+' KB usados. ':''}<span>A cota inclui regras, dados, imagens, personalização e ficha-modelo.</span></p>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {confirmClose?<div className="system-editor-unsaved" role="alert"><p>Há alterações não salvas. Deseja continuar editando?</p><div><button className="button secondary" type="button" onClick={()=>setConfirmClose(false)}>Continuar editando</button><button className="button danger" type="button" onClick={onClose}>Descartar alterações</button></div></div>:<div className="system-editor-actions"><button className="button secondary" type="button" onClick={close}>Cancelar</button><button className="button primary" type="submit" disabled={busy||faceBusy}>{busy||faceBusy?'Preparando imagem…':initial.id?'Salvar alterações':'Criar conjunto'}<Check size={16}/></button></div>}
  </footer>
 </form></dialog>{personalizing&&<SystemVisualEditor previewBook={{...book||makeRulebook(name),name,description,logo,dice}} initial={initial.visuals} name={name} defaultLogo={logo} builtInLogo={systemThemeDefinition(book)?.builtInLogo==='ab10'} baseBytes={(()=>{try{return new TextEncoder().encode(serializeRulebook({...book||makeRulebook(name),name,description,logo,dice,visuals:undefined})).length;}catch{return null;}})()} validate={visuals=>{serializeRulebook({...book||makeRulebook(name),name,description,logo,dice,visuals});}} onSave={visuals=>submit({visuals})} onClose={()=>setPersonalizing(false)} externalError={error}/>}</>;
}
