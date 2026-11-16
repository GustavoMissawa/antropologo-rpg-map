export const MAX_DIE_FACE_IMAGE_BYTES=150*1024;
export const MAX_DIE_FACE_UPLOAD_BYTES=8*1024*1024;
export const DIE_FACE_IMAGE_EDGE=256;
export function dieFaceImageBytes(src:string){const data=src.split(',')[1]||'';return data.length*3/4-(data.endsWith('==')?2:data.endsWith('=')?1:0);}
export function validDieFaceImage(value:unknown):value is string{
 if(typeof value!=='string'||value.length>Math.ceil(MAX_DIE_FACE_IMAGE_BYTES/3)*4+40)return false;
 const match=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match||match[2].length%4!==0||dieFaceImageBytes(value)>MAX_DIE_FACE_IMAGE_BYTES)return false;
 try{const head=atob(match[2].slice(0,Math.min(32,match[2].length)));return match[1]==='png'?head.startsWith('\x89PNG\r\n\x1a\n'):match[1]==='jpeg'?head.startsWith('\xff\xd8\xff'):head.startsWith('RIFF')&&head.slice(8,12)==='WEBP';}catch{return false;}
}
