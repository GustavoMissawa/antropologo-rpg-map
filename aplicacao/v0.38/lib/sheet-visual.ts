import {CONTENT_QUOTAS} from './content-limits.ts';
export const MAX_SHEET_IMAGE_BYTES=768*1024;
export const MAX_SHEET_IMAGE_UPLOAD_BYTES=8*1024*1024;
export const MAX_SHEET_BYTES=CONTENT_QUOTAS.character;
export type BlockImage={src:string;fit:'contain'|'cover'|'center'};
export const validBlockColor=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
export const validFieldColumns=(value:unknown):value is number=>Number.isInteger(value)&&Number(value)>=1&&Number(value)<=4;
export function validSheetImage(value:unknown):value is string {
 if(typeof value!=='string'||value.length>Math.ceil(MAX_SHEET_IMAGE_BYTES/3)*4+40)return false;
 const match=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match)return false;
 const data=match[2],bytes=data.length*3/4-(data.endsWith('==')?2:data.endsWith('=')?1:0);
 if(data.length%4!==0||bytes>MAX_SHEET_IMAGE_BYTES)return false;
 try{const head=atob(data.slice(0,Math.min(32,data.length)));return match[1]==='png'?head.startsWith('\x89PNG\r\n\x1a\n'):match[1]==='jpeg'?head.startsWith('\xff\xd8\xff'):head.startsWith('RIFF')&&head.slice(8,12)==='WEBP';}catch{return false;}
}
export const dieOutline=(faces:number)=>[4,6,8,10,12,20].includes(faces)?faces:20;

export function normalizeBlockHex(value:string):string|null{
 const match=value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);if(!match)return null;
 const raw=match[1];return '#'+(raw.length===3?[...raw].map(c=>c+c).join(''):raw).toLowerCase();
}
export function blockHexToRGB(value:string):string{
 const hex=normalizeBlockHex(value);if(!hex)throw new Error('Cor HEX inválida.');return [1,3,5].map(at=>parseInt(hex.slice(at,at+2),16)).join(', ');
}
export function blockRGBToHex(value:string):string|null{
 const match=value.trim().match(/^(?:rgb\(\s*)?(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*\))?$/i);
 if(!match||/rgb/i.test(value)&&!value.trim().endsWith(')')||!/^rgb/i.test(value.trim())&&value.includes(')'))return null;
 const values=match.slice(1).map(Number);if(values.some(n=>n>255))return null;return '#'+values.map(n=>n.toString(16).padStart(2,'0')).join('');
}
