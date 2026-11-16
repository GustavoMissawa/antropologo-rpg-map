import {decodeThemeData,inspectThemeBytes,type ThemeAsset} from './system-visuals.ts';
/** Native decoding supplements the bounded binary metadata checks on imported themes. */
export async function validateImportedThemeMedia(assets:Record<string,ThemeAsset>):Promise<void>{
 if(typeof createImageBitmap!=='function')return;
 for(const asset of Object.values(assets))for(const src of [asset.src,...(asset.poster?[asset.poster]:[])]){
  const raw=decodeThemeData(src),info=inspectThemeBytes(raw);let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(new Blob([raw],{type:info.mime}));}catch{throw new Error('Uma imagem da personalização está inválida ou corrompida.');}
  try{if(!bitmap.width||!bitmap.height||bitmap.width*bitmap.height>16_000_000)throw new Error('Uma imagem da personalização excede a resolução permitida.');}finally{bitmap.close();}
 }
}
