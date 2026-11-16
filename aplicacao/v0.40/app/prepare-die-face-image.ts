'use client';
import { DIE_FACE_IMAGE_EDGE,MAX_DIE_FACE_IMAGE_BYTES,MAX_DIE_FACE_UPLOAD_BYTES,validDieFaceImage } from '../lib/die-face-image';
export async function prepareDieFaceImage(file:File):Promise<string>{
 if(file.size>MAX_DIE_FACE_UPLOAD_BYTES)throw new Error('Escolha uma imagem de até 8 MB.');
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use uma imagem PNG, JPG ou WebP.');
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('Não foi possível abrir esta imagem. Escolha outro arquivo.');}
 try{
  if(!bitmap.width||!bitmap.height)throw new Error('A imagem está vazia.');
  const scale=Math.min(1,DIE_FACE_IMAGE_EDGE/bitmap.width,DIE_FACE_IMAGE_EDGE/bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível preparar a imagem neste navegador.');context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let blob:Blob|null=null;for(const quality of [.88,.76,.62]){blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=100*1024)break;}
  if(!blob||blob.size>MAX_DIE_FACE_IMAGE_BYTES)throw new Error('A imagem otimizada ultrapassou 150 KB. Escolha uma imagem mais simples.');
  const src=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(blob!);});
  if(!validDieFaceImage(src))throw new Error('A imagem não pôde ser preparada. Tente outro PNG, JPG ou WebP.');return src;
 }finally{bitmap.close();}
}
