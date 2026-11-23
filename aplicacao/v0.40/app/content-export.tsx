'use client';
import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,Download,FileJson,Image as ImageIcon} from 'lucide-react';
import {SheetDialog} from './sheet-dialog';
import {currentExportAccent,renderSuperPngCover} from './super-png-cover';
import {serializeExportContent,exportFilename,type ExportContent} from '../lib/content-file';

export function ContentExportDialog({content,onClose,notify}:{content:ExportContent;onClose:()=>void;notify:(message:string)=>void}){
 const [format,setFormat]=useState<'json'|'png'>('json'),[preview,setPreview]=useState(''),[png,setPng]=useState<Blob|null>(null),[error,setError]=useState(''),[working,setWorking]=useState(false);
 const previewUrl=useRef('');
 const [snapshot]=useState(()=>{
  try{return {json:serializeExportContent(content),error:''};}
  catch(e){return {json:'',error:(e as Error).message};}
 });
 const [accent]=useState(currentExportAccent);
 useEffect(()=>{
  if(format!=='png'||snapshot.error||png)return;
  let cancelled=false;
  async function preparePng(){
   try{
    const {embedSuperPng,extractSuperPng}=await import('../lib/super-png.ts');
    if(cancelled)return;
    const data=JSON.parse(snapshot.json);
    const cover=await renderSuperPngCover(data,accent);
    if(cancelled)return;
    const image=new Uint8Array(await cover.arrayBuffer());
    if(cancelled)return;
    const bytes=embedSuperPng(image,content.format==='ab10-character'?'character':'ruleset',content.name,data);
    extractSuperPng(bytes);
    const blob=new Blob([bytes],{type:'image/png'});
    const url=URL.createObjectURL(blob);
    previewUrl.current=url;
    setPng(blob);
    setPreview(url);
   }catch(e){if(!cancelled)setError((e as Error).message);}
   finally{if(!cancelled)setWorking(false);}
  }
  void preparePng();
  return()=>{cancelled=true;};
 },[format,png,snapshot,accent,content.format,content.name]);
 useEffect(()=>()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);},[]);
 function selectPng(){
  setFormat('png');
  if(!snapshot.error&&!png){setWorking(true);setError('');}
 }
 function download(){try{
  if(snapshot.error)throw new Error(snapshot.error);const blob=format==='png'?png:new Blob([snapshot.json],{type:'application/json;charset=utf-8'});if(!blob)return;
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=exportFilename(content.name,format);document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  notify(format==='png'?'Super PNG preparado com capa, dados completos e integridade verificada.':'JSON preparado com todos os dados. Guarde o arquivo para importar depois.');onClose();
 }catch(e){setError((e as Error).message);}}
 return <SheetDialog title={content.format==='ab10-character'?'Salvar ficha':'Salvar regras'} onClose={onClose}>
  <p className="modal-intro">{content.name} · escolha como baixar sua cópia completa.</p>
  <fieldset className="export-formats"><legend>Formato do arquivo</legend>
   <label className={format==='json'?'selected':''}><input type="radio" name="export-format" value="json" checked={format==='json'} onChange={()=>setFormat('json')}/><FileJson size={24}/><span><strong>JSON</strong><small>Backup técnico · .json</small></span></label>
   <label className={format==='png'?'selected':''}><input type="radio" name="export-format" value="png" checked={format==='png'} onChange={selectPng}/><ImageIcon size={24}/><span><strong>Super PNG</strong><small>Capa visual + dados · .png</small></span></label>
  </fieldset>
  {format==='png'&&<div className="super-png-preview" aria-busy={working}>{preview?<img src={preview} alt={'Prévia do Super PNG de '+content.name}/>:<p role="status">{error?'Prévia indisponível.':'Preparando capa e dados…'}</p>}<div><strong>Uma imagem que também é editável.</strong><p>Carregue ou arraste o PNG original em Regras ou Ficha para recuperar o conteúdo.</p><p>Envie o arquivo original: capturas de tela e editores de imagem podem remover os dados.</p>{png&&<small><CheckCircle2 size={14}/> Integridade verificada · dados completos · {(png.size/1024/1024).toFixed(2)} MB</small>}</div></div>}
  {format==='json'&&<p className="export-note">Inclui os mesmos dados editáveis do Super PNG. Arquivos anteriores .ab10 e .regras continuam compatíveis para carregar.</p>}
  {(error||snapshot.error)&&<p className="ruleset-import-error" role="alert">{error||snapshot.error}</p>}
  <div className="modal-footer"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="button" className="button primary" disabled={!!snapshot.error||format==='png'&&!png} onClick={download}><Download size={17}/>{working&&format==='png'?'Preparando…':format==='png'?'Baixar Super PNG':'Baixar JSON'}</button></div>
 </SheetDialog>;
}
