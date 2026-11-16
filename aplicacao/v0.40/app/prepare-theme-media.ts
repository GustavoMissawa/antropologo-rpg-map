'use client';
import {inspectThemeBytes,validateThemeArea,THEME_LIMITS,THEME_POSTER_LIMIT,type ThemeArea,type ThemeAsset} from '../lib/system-visuals';

const asDataURL=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));r.readAsDataURL(blob);});
export async function prepareThemeMedia(file:File,area:ThemeArea):Promise<ThemeAsset>{
 const limit=THEME_LIMITS[area];if(file.size>Math.max(limit.static,limit.gif))throw new Error('O arquivo ultrapassa o limite desta área.');
 const raw=new Uint8Array(await file.arrayBuffer()),info=inspectThemeBytes(raw),gif=info.mime==='image/gif';
 if(gif&&area==='superPngCover')throw new Error('A capa do Super PNG é estática. Use PNG, JPG ou WebP.');
 if(info.bytes>(gif?limit.gif:limit.static))throw new Error('O arquivo ultrapassa o limite individual desta área.');
 if(gif&&(info.width>limit.width||info.height>limit.height))throw new Error('Use GIF de até '+limit.width+' × '+limit.height+' px nesta área.');
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(new Blob([raw],{type:info.mime}));}catch{throw new Error('A imagem está inválida ou corrompida. Escolha outro arquivo.');}
 try{
  const src=await asDataURL(new Blob([raw],{type:info.mime}));let poster:string|undefined;
  if(gif){
   const c=document.createElement('canvas'),scale=Math.min(1,256/bitmap.width,256/bitmap.height);c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=c.getContext('2d');if(!ctx)throw new Error('Não foi possível gerar a prévia estática.');ctx.drawImage(bitmap,0,0,c.width,c.height);
   const blob=await new Promise<Blob|null>(resolve=>c.toBlob(resolve,'image/webp',.78));if(!blob||blob.size>THEME_POSTER_LIMIT)throw new Error('A prévia estática ficou grande demais. Use um GIF mais simples.');poster=await asDataURL(blob);
  }
  const asset:ThemeAsset={src,...(poster?{poster}:{})};validateThemeArea(asset,area);return asset;
 }finally{bitmap.close();}
}
