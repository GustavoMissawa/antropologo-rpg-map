import {readFileSync} from 'node:fs';
import {crc32} from '../../lib/super-png.ts';
import {assignThemeAsset,emptySystemVisuals} from '../../lib/system-visuals.ts';
export const fixture=(name)=>readFileSync(new URL('../fixtures/theme/'+name,import.meta.url));
export const dataURL=(bytes,mime)=>'data:'+mime+';base64,'+Buffer.from(bytes).toString('base64');
export const poster=dataURL(fixture('poster.png'),'image/png');
export function pngAtSize(target,seed=65){
 const base=fixture('static.png'),data=Buffer.alloc(target-base.length-12,seed);data.write('pad\0');const chunk=Buffer.alloc(data.length+12);chunk.writeUInt32BE(data.length);chunk.write('tEXt',4);data.copy(chunk,8);chunk.writeUInt32BE(crc32(chunk.subarray(4,-4)),chunk.length-4);return Buffer.concat([base.subarray(0,-12),chunk,base.subarray(-12)]);
}
export function gifAtSize(target,seed=65){
 const base=fixture('animated.gif');let payload=target-base.length-4;while(payload+Math.ceil(payload/255)+3>target-base.length)payload--;
 const parts=[base.subarray(0,-1),Buffer.from([33,254])];for(let at=0;at<payload;at+=255){const n=Math.min(255,payload-at);parts.push(Buffer.from([n]),Buffer.alloc(n,seed));}parts.push(Buffer.from([0,59]));return Buffer.concat(parts);
}
export const pngAsset=(n,seed)=>({src:dataURL(n?pngAtSize(n,seed):fixture('static.png'),'image/png')});
export const gifAsset=(n,seed)=>({src:dataURL(n?gifAtSize(n,seed):fixture('animated.gif'),'image/gif'),poster});
export function sixMiBTheme(){let t=emptySystemVisuals();for(const [area,bytes,seed] of [['collapsedLogo',750*1024,65],['expandedLogo',750*1024,66],['collapsedBackground',1024*1024+36*1024,67],['expandedBackground',1.5*1024*1024,68],['mainBackground',2*1024*1024,69]])t=assignThemeAsset(t,area,pngAsset(bytes,seed));return t;}
