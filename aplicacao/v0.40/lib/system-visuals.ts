import {imageSize} from 'image-size';
import {parseGIF} from 'gifuct-js';
import {MIB} from './content-limits.ts';
import {crc32} from './super-png.ts';
export {serializedUtf8Size} from './content-limits.ts';

export const THEME_AREAS=['collapsedLogo','collapsedBackground','expandedLogo','expandedBackground','mainBackground','superPngCover'] as const;
export type ThemeArea=typeof THEME_AREAS[number];
export const THEME_AREA_LABELS:Record<ThemeArea,string>={collapsedLogo:'Logo no celular',collapsedBackground:'Fundo do cabeçalho no celular',expandedLogo:'Logo no computador',expandedBackground:'Fundo do cabeçalho no computador',mainBackground:'Fundo da página',superPngCover:'Capa do Super PNG'};
export const THEME_MEDIA_LIMIT=6*MIB,THEME_GIF_LIMIT=3*MIB,THEME_POSTER_LIMIT=128*1024;
export const THEME_LIMITS:Record<ThemeArea,{static:number;gif:number;width:number;height:number}>={
 collapsedLogo:{static:750*1024,gif:600*1024,width:512,height:512},
 expandedLogo:{static:750*1024,gif:600*1024,width:1024,height:512},
 collapsedBackground:{static:1.5*MIB,gif:1.25*MIB,width:512,height:1024},
 expandedBackground:{static:1.5*MIB,gif:1.25*MIB,width:960,height:1280},
 mainBackground:{static:2*MIB,gif:2*MIB,width:1280,height:720},
 superPngCover:{static:2*MIB,gif:0,width:900,height:1160},
};
export type ThemeAsset={src:string;poster?:string};
export type ThemePlacement={assetId:string|null;fit:'cover'|'contain'|'native';x:number;y:number;opacity:number;overlayColor:string;overlayOpacity:number};
export type SystemVisuals={version:1;assets:Record<string,ThemeAsset>;areas:Partial<Record<ThemeArea,ThemePlacement>>};
export type ThemeMediaInfo={bytes:number;mime:'image/png'|'image/jpeg'|'image/webp'|'image/gif';width:number;height:number;frames:number;duration:number;fps:number};
export const emptySystemVisuals=():SystemVisuals=>({version:1,assets:{},areas:{}});
export const defaultThemePlacement=(area:ThemeArea,assetId:string|null):ThemePlacement=>{const foreground=area.endsWith('Logo')||area==='superPngCover';return {assetId,fit:foreground?'contain':'cover',x:50,y:50,opacity:foreground?1:.35,overlayColor:'#152c26',overlayOpacity:foreground?0:.55};};
const dataPattern=/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;
const infoCache=new WeakMap<ThemeAsset,{src:string;poster?:string;info:ThemeMediaInfo}>();
const fail=(message='Imagem inválida. Use PNG, JPG, WebP estático ou GIF válido.'):never=>{throw new Error(message);};
export function themeDataBytes(src:string):number{
 const m=src.match(dataPattern);if(!m||m[2].length%4)return fail();return m[2].length*3/4-(m[2].endsWith('==')?2:m[2].endsWith('=')?1:0);
}
export function decodeThemeData(src:string,maxBytes=2*MIB):Uint8Array<ArrayBuffer>{
 if(typeof src!=='string'||src.length>Math.ceil(maxBytes/3)*4+40||themeDataBytes(src)>maxBytes)return fail('A imagem ultrapassa o limite permitido.');
 const data=src.slice(src.indexOf(',')+1);try{return Uint8Array.from(atob(data),c=>c.charCodeAt(0));}catch{return fail();}
}
export function inspectThemeBytes(bytes:Uint8Array):ThemeMediaInfo{
 if(bytes.length<12||bytes.length>2*MIB)return fail();
 const head=new TextDecoder('ascii').decode(bytes.subarray(0,16));
 const mime=bytes[0]===137&&head.slice(1,4)==='PNG'?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':head.startsWith('RIFF')&&head.slice(8,12)==='WEBP'?'image/webp':/^GIF8[79]a/.test(head)?'image/gif':null;
 if(!mime)return fail();
 let size:ReturnType<typeof imageSize>;try{size=imageSize(bytes);}catch{return fail();}
 if(!size.width||!size.height||size.width>8192||size.height>8192||size.width*size.height>16_000_000)return fail('Use uma imagem de até 16 megapixels e 8192 px por lado.');
 let frames=1,duration=0,fps=0;
 if(mime==='image/gif'){
  if(bytes.at(-1)!==59)return fail('O GIF está incompleto ou corrompido.');
  try{
   const parsed=parseGIF(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer);
   const images=parsed.frames.filter((f):f is Extract<typeof f,{image:unknown}>=>'image' in f);
   frames=images.length;if(!frames||frames>120)return fail('Use GIF com até 120 quadros.');
   for(const f of images){const d=f.image.descriptor;if(!d.width||!d.height||d.left+d.width>size.width||d.top+d.height>size.height||f.image.data.minCodeSize<2||f.image.data.minCodeSize>8||!f.image.data.blocks.length)return fail('O GIF contém quadros inválidos.');const delay=(f.gce?.delay||10)*10;duration+=delay;fps=Math.max(fps,1000/delay);}
   if(duration>8000)return fail('Use GIF com ciclo de até 8 segundos.');
  }catch(e){if(e instanceof Error&&/quadros|segundos/.test(e.message))throw e;return fail('Não foi possível validar os quadros deste GIF.');}
 }else if(mime==='image/png'){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let at=8,idat=false,end=false,count=0;
  while(at+12<=bytes.length&&++count<10000){const n=view.getUint32(at),type=new TextDecoder('ascii').decode(bytes.subarray(at+4,at+8));if(n>bytes.length-at-12||crc32(bytes.subarray(at+4,at+8+n))!==view.getUint32(at+8+n))return fail();if(type==='acTL')return fail('PNG animado não é aceito. Use GIF para animações.');if(type==='IDAT')idat=true;at+=n+12;if(type==='IEND'){end=n===0&&at===bytes.length;break;}}
  if(!idat||!end)return fail('O PNG está incompleto ou corrompido.');
 }else if(mime==='image/webp'){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(view.getUint32(4,true)+8!==bytes.length)return fail();let at=12,count=0;while(at+8<=bytes.length&&++count<4096){const type=new TextDecoder('ascii').decode(bytes.subarray(at,at+4)),n=view.getUint32(at+4,true);if(type==='ANIM'||type==='ANMF')return fail('Use WebP estático ou GIF para animações.');if(n>bytes.length-at-8)return fail();at+=8+n+(n%2);}if(at!==bytes.length)return fail();
 }else if(bytes.at(-2)!==255||bytes.at(-1)!==217)return fail('O JPG está incompleto ou corrompido.');
 return {bytes:bytes.length,mime,width:size.width,height:size.height,frames,duration,fps};
}
export function themeAssetInfo(asset:ThemeAsset):ThemeMediaInfo{
 const old=infoCache.get(asset);if(old&&old.src===asset.src&&old.poster===asset.poster)return old.info;
 const bytes=decodeThemeData(asset.src),info=inspectThemeBytes(bytes);if(!asset.src.startsWith('data:'+info.mime+';'))return fail('O tipo declarado da imagem não corresponde ao arquivo.');
 if(info.mime==='image/gif'){
  if(!asset.poster)return fail('O GIF precisa de uma prévia estática.');const p=inspectThemeBytes(decodeThemeData(asset.poster,THEME_POSTER_LIMIT));if(p.mime==='image/gif'||p.width>512||p.height>512)return fail('A prévia estática do GIF é inválida.');
 }else if(asset.poster!==undefined)return fail('Imagens estáticas não precisam duplicar uma prévia.');
 infoCache.set(asset,{src:asset.src,poster:asset.poster,info});return info;
}
export function validateThemeArea(asset:ThemeAsset,area:ThemeArea):ThemeMediaInfo{
 const info=themeAssetInfo(asset),limit=THEME_LIMITS[area],gif=info.mime==='image/gif';
 if(gif&&area==='superPngCover')return fail('A capa do Super PNG é estática. Use PNG, JPG ou WebP.');
 if(info.bytes>(gif?limit.gif:limit.static))return fail(THEME_AREA_LABELS[area]+': o arquivo ultrapassa o limite individual.');
 if(gif&&(info.width>limit.width||info.height>limit.height))return fail(THEME_AREA_LABELS[area]+': use GIF de até '+limit.width+' × '+limit.height+' px.');
 return info;
}
export function themeUsage(theme:SystemVisuals){let media=0,gifs=0;for(const area of THEME_AREAS){const id=theme.areas[area]?.assetId;if(!id)continue;const asset=theme.assets[id];if(!asset)return fail('Imagem do tema não encontrada.');const n=themeDataBytes(asset.src);media+=n;if(asset.src.startsWith('data:image/gif;'))gifs+=n;}return {media,gifs};}
export function parseSystemVisuals(input:unknown):SystemVisuals{
 if(!input||typeof input!=='object'||Array.isArray(input))return fail('Personalização visual inválida.');const t=input as SystemVisuals;
 if(t.version!==1||!t.assets||typeof t.assets!=='object'||Array.isArray(t.assets)||!t.areas||typeof t.areas!=='object'||Array.isArray(t.areas)||Object.keys(t.assets).length>THEME_AREAS.length||Object.keys(t.areas).some(k=>!THEME_AREAS.includes(k as ThemeArea)))return fail('Estrutura da personalização inválida.');
 const assets:Record<string,ThemeAsset>={},areas:SystemVisuals['areas']={};
 for(const area of THEME_AREAS){const p=t.areas[area];if(p===undefined)continue;if(!p||!['cover','contain','native'].includes(p.fit)||!['x','y'].every(k=>typeof p[k as 'x'|'y']==='number'&&Number.isFinite(p[k as 'x'|'y'])&&p[k as 'x'|'y']>=0&&p[k as 'x'|'y']<=100)||!['opacity','overlayOpacity'].every(k=>typeof p[k as 'opacity'|'overlayOpacity']==='number'&&Number.isFinite(p[k as 'opacity'|'overlayOpacity'])&&p[k as 'opacity'|'overlayOpacity']>=0&&p[k as 'opacity'|'overlayOpacity']<=1)||!/^#[0-9a-f]{6}$/i.test(p.overlayColor)||p.assetId!==null&&(typeof p.assetId!=='string'||!/^media_[a-zA-Z0-9_-]{1,80}$/.test(p.assetId)))return fail('Ajustes visuais inválidos.');
  if(p.assetId){const a=t.assets[p.assetId];if(!a||typeof a.src!=='string')return fail();validateThemeArea(a,area);assets[p.assetId]={src:a.src,...(a.poster?{poster:a.poster}:{})};infoCache.set(assets[p.assetId],{src:a.src,poster:a.poster,info:themeAssetInfo(a)});}areas[area]={assetId:p.assetId,fit:p.fit,x:p.x,y:p.y,opacity:p.opacity,overlayColor:p.overlayColor.toLowerCase(),overlayOpacity:p.overlayOpacity};
 }
 if(Object.keys(t.assets).some(id=>!assets[id]))return fail('Há imagens sem área vinculada na personalização.');
 const result:SystemVisuals={version:1,assets,areas},usage=themeUsage(result);if(usage.media>THEME_MEDIA_LIMIT)return fail('A mídia da personalização ultrapassa 6 mb.');if(usage.gifs>THEME_GIF_LIMIT)return fail('Os GIFs da personalização ultrapassam 3 mb.');return result;
}
export function pruneThemeAssets(theme:SystemVisuals):SystemVisuals{const ids=new Set(Object.values(theme.areas).flatMap(p=>p?.assetId?[p.assetId]:[]));return {...theme,assets:Object.fromEntries(Object.entries(theme.assets).filter(([id])=>ids.has(id)))};}
export function assignThemeAsset(theme:SystemVisuals,area:ThemeArea,asset:ThemeAsset):SystemVisuals{
 const info=validateThemeArea(asset,area),shared=Object.entries(theme.assets).find(([,a])=>a.src===asset.src),id=shared?.[0]||'media_'+crypto.randomUUID();
 const placement=theme.areas[area]||{...defaultThemePlacement(area,id),...(info.mime==='image/gif'?{fit:'native' as const}:{})};
 return parseSystemVisuals(pruneThemeAssets({...theme,assets:{...theme.assets,[id]:asset},areas:{...theme.areas,[area]:{...placement,assetId:id}}}));
}
export function themeMediaSource(theme:SystemVisuals|undefined,area:ThemeArea,animate:boolean):string|undefined{const id=theme?.areas[area]?.assetId,asset=id?theme?.assets[id]:undefined;return asset?(asset.src.startsWith('data:image/gif;')&&!animate?asset.poster:asset.src):undefined;}
