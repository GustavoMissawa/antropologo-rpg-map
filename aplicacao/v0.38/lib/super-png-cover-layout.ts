import type {ThemePlacement} from './system-visuals.ts';
export const SUPER_PNG_COVER_WIDTH=900,SUPER_PNG_COVER_HEIGHT=1160;
/** Canvas placement matches CSS object-fit/object-position used by the theme editor. */
export function superPngImageRect(width:number,height:number,placement:Pick<ThemePlacement,'fit'|'x'|'y'>){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('A imagem da capa tem dimensões inválidas.');
 const contain=Math.min(SUPER_PNG_COVER_WIDTH/width,SUPER_PNG_COVER_HEIGHT/height),scale=placement.fit==='cover'?Math.max(SUPER_PNG_COVER_WIDTH/width,SUPER_PNG_COVER_HEIGHT/height):placement.fit==='native'?Math.min(1,contain):contain;
 const w=width*scale,h=height*scale;
 return {x:(SUPER_PNG_COVER_WIDTH-w)*placement.x/100,y:(SUPER_PNG_COVER_HEIGHT-h)*placement.y/100,width:w,height:h};
}
