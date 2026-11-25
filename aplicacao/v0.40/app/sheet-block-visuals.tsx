'use client';
import { useEffect,useRef,useState,type CSSProperties } from 'react';
import { ImagePlus,RotateCcw,Trash2 } from 'lucide-react';
import type { Block } from '../lib/model';
import { palettes } from '../lib/appearance';
import { MAX_SHEET_IMAGE_BYTES,MAX_SHEET_IMAGE_UPLOAD_BYTES,validSheetImage,validBlockColor,normalizeBlockHex,blockHexToRGB,blockRGBToHex } from '../lib/sheet-visual';

export async function prepareSheetImage(file:File,options:{maxBytes?:number;edge?:number}={}):Promise<string>{
 if(file.size>MAX_SHEET_IMAGE_UPLOAD_BYTES)throw new Error('Escolha uma imagem de até 8 MB.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use uma imagem PNG, JPG ou WebP.');
 let bitmap:ImageBitmap;
 try{bitmap=await createImageBitmap(file);}catch{throw new Error('Não foi possível abrir esta imagem. Escolha outro arquivo.');}
 try{
  if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>40_000_000)throw new Error('A imagem é grande demais. Use uma versão com até 40 megapixels.');
  let edge=options.edge||1600;
  for(let attempt=0;attempt<3;attempt++,edge=Math.round(edge*.72)){
   const scale=Math.min(1,edge/bitmap.width,edge/bitmap.height),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível preparar a imagem neste navegador.');
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.86-attempt*.08));
   if(!blob||blob.size>(options.maxBytes||MAX_SHEET_IMAGE_BYTES))continue;
   const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(blob);});
   if(validSheetImage(data))return data;
  }
  throw new Error('Não foi possível reduzir a imagem para caber na ficha. Escolha um arquivo menor.');
 }finally{bitmap.close();}
}

function ImageUpload({block,busy,onUpload}:{block:Block;busy:boolean;onUpload:(file:File)=>void}){
 return <label className="button secondary block-image-upload"><ImagePlus size={17}/>{busy?'Preparando imagem…':block.image?'Substituir imagem':'Adicionar imagem'}<input type="file" aria-label={'Escolher imagem de '+block.title} accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)onUpload(file);}}/></label>;
}
export function BlockImageContent({block,preview,busy,onUpload}:{block:Block;preview:boolean;busy:boolean;onUpload:(file:File)=>void}){
 const [failedSrc,setFailedSrc]=useState('');const failed=!!block.image&&failedSrc===block.image.src;
 return <div className={'block-image-frame '+(block.image?'has-image':'')} style={{height:`var(--map-drag-height, ${block.layout.height??260}px)`}}>
  {block.image&&!failed?<img src={block.image.src} alt={block.title||'Imagem da ficha'} draggable={false} onError={()=>setFailedSrc(block.image!.src)} style={{objectFit:block.image.fit==='center'?'scale-down':block.image.fit}}/>:<div className="block-image-empty"><ImagePlus size={32}/><p>{failed?'Não foi possível exibir esta imagem. Substitua o arquivo no Modo edição.':preview?'Este bloco ainda não tem imagem.':'Retrato, mapa ou ilustração. O espaço é seu.'}</p>{!preview&&<ImageUpload block={block} busy={busy} onUpload={onUpload}/>}</div>}
 </div>;
}
function BlockColorControls({block,themeColor,onChange}:{block:Block;themeColor:string;onChange:(fn:(b:Block)=>Block)=>void}){
 const color=block.color||themeColor,last=useRef(color),[hex,setHex]=useState(color),[rgb,setRGB]=useState(()=>blockHexToRGB(color)),[error,setError]=useState('');
 useEffect(()=>{if(color!==last.current){last.current=color;setHex(color);setRGB(blockHexToRGB(color));setError('');}},[color]);
 function apply(value:string,source:'hex'|'rgb'|'picker'){last.current=value;if(source!=='hex')setHex(value);if(source!=='rgb')setRGB(blockHexToRGB(value));setError('');onChange(b=>({...b,color:value}));}
 return <fieldset><legend>Cor do bloco</legend><div className="block-color-control"><input type="color" aria-label="Cor personalizada do bloco" value={color} onChange={e=>apply(e.target.value,'picker')}/><span>{block.color?'Cor personalizada':'Usando o tema atual'}<small>Toque na amostra para abrir o seletor completo.</small></span></div>
  <div className="block-color-values"><label>HEX<input aria-label="Cor do bloco em HEX" spellCheck={false} autoComplete="off" value={hex} maxLength={7} placeholder="#7828C8" onChange={e=>{setHex(e.target.value);const next=normalizeBlockHex(e.target.value);if(next)apply(next,'hex');}} onBlur={()=>{const next=normalizeBlockHex(hex);if(next){setHex(next);setError('');}else setError('Use HEX como #7828C8 ou #abc. A última cor válida foi mantida.');}}/></label><label>RGB<input aria-label="Cor do bloco em RGB" spellCheck={false} autoComplete="off" value={rgb} maxLength={24} placeholder="120, 40, 200" onChange={e=>{setRGB(e.target.value);const next=blockRGBToHex(e.target.value);if(next)apply(next,'rgb');}} onBlur={()=>{const next=blockRGBToHex(rgb);if(next){setRGB(blockHexToRGB(next));setError('');}else setError('Use três valores RGB de 0 a 255, como 120, 40, 200. A última cor válida foi mantida.');}}/></label></div>
  {error&&<p className="sheet-inline-error" role="alert">{error}</p>}
  <div className="block-color-presets">{palettes.map(p=><button type="button" key={p.id} title={p.name} aria-label={'Cor do bloco: '+p.name} aria-pressed={block.color?.toLowerCase()===p.swatch.toLowerCase()} style={{'--swatch-color':p.swatch} as CSSProperties} onClick={()=>apply(p.swatch,'picker')}><span/></button>)}</div><button type="button" className="text-button" disabled={!block.color} onClick={()=>{last.current=themeColor;setHex(themeColor);setRGB(blockHexToRGB(themeColor));setError('');onChange(({color,...b})=>b);}}><RotateCcw size={14}/> Usar cor do tema</button>
 </fieldset>;
}
export function BlockVisualControls({block,onChange,busy,error,onUpload}:{block:Block;onChange:(fn:(b:Block)=>Block)=>void;busy:boolean;error:string;onUpload:(file:File)=>void}){
 const [themeColor,setThemeColor]=useState('#43855a');
 useEffect(()=>{const root=document.documentElement,update=()=>{const value=getComputedStyle(root).getPropertyValue('--palette-value').trim();if(validBlockColor(value))setThemeColor(value);};update();const observer=new MutationObserver(update);observer.observe(root,{attributes:true,attributeFilter:['data-palette']});return()=>observer.disconnect();},[]);
 return <div className="block-visual-controls">
  <BlockColorControls key={block.id} block={block} themeColor={themeColor} onChange={onChange}/>

  {block.kind==='image'&&<fieldset><legend>Imagem do bloco</legend><ImageUpload block={block} busy={busy} onUpload={onUpload}/><p className="block-visual-help">PNG, JPG ou WebP · até 8 MB. A imagem é otimizada e acompanha o arquivo da ficha.</p>{block.image&&<><label className="form-label">Ajuste da imagem<select aria-label="Ajuste da imagem" value={block.image.fit} onChange={e=>onChange(b=>b.image?{...b,image:{...b.image,fit:e.target.value as NonNullable<Block['image']>['fit']}}:b)}><option value="contain">Ajustar · mostrar inteira</option><option value="cover">Preencher · recortar bordas</option><option value="center">Centralizar · sem ampliar</option></select></label><button type="button" className="text-button" disabled={busy} onClick={()=>onChange(({image,...b})=>b)}><Trash2 size={14}/> Remover imagem</button></>}{error&&<p className="sheet-inline-error" role="alert">{error}</p>}</fieldset>}
 </div>;
}
