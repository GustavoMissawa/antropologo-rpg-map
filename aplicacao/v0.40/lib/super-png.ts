import {deflate,Inflate} from 'pako';
import {CONTENT_QUOTAS,contentByteLimit,contentQuotaLabel,SUPER_PNG_FILE_BYTES,MAX_SUPER_PNG_METADATA_BYTES,serializedUtf8Size} from './content-limits.ts';
import {crc32,isPng,PNG_SIGNATURE} from './png-bytes.ts';
export {crc32,isPng} from './png-bytes.ts';
// PNG iTXt follows the W3C PNG specification. The image remains a regular PNG;
// a single UTF-8 text chunk, after IDAT, carries a versioned application payload.
export const SUPER_PNG_FORMAT='antropologo-super-png';
export const SUPER_PNG_VERSION=2;
export const SUPER_PNG_KEYWORD='ANTROPOLOGO RPG';
export const MAX_EXPORT_DATA_BYTES=CONTENT_QUOTAS.character;
export const MAX_SUPER_PNG_BYTES=SUPER_PNG_FILE_BYTES;
const MAX_METADATA_BYTES=MAX_SUPER_PNG_METADATA_BYTES;
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
export type SuperPngKind='character'|'ruleset';
export type SuperPngData={kind:SuperPngKind;name:string;payload:unknown;integrity:'valid'};
type Chunk={type:string;start:number;dataStart:number;dataEnd:number;end:number};
const checksum=(text:string)=>crc32(encoder.encode(text)).toString(16).padStart(8,'0');
const corrupt=():never=>{throw new Error('O PNG parece alterado ou corrompido. A integridade não pôde ser validada.');};
function chunks(bytes:Uint8Array):Chunk[]{
 if(!isPng(bytes))throw new Error('Este arquivo não é um PNG válido.');
 if(bytes.length>MAX_SUPER_PNG_BYTES)throw new Error('O limite para Super PNG é de 30 MiB.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),result:Chunk[]=[];
 let at=8,sawImage=false,sawEnd=false;
 while(at<bytes.length){
  if(at+12>bytes.length||result.length>=10000)return corrupt();
  const length=view.getUint32(at),dataStart=at+8,dataEnd=dataStart+length,end=dataEnd+4;
  if(end>bytes.length)return corrupt();
  const type=String.fromCharCode(...bytes.subarray(at+4,at+8));
  if(!/^[A-Za-z]{4}$/.test(type)||crc32(bytes.subarray(at+4,dataEnd))!==view.getUint32(dataEnd))return corrupt();
  if(!result.length&&(type!=='IHDR'||length!==13||!view.getUint32(dataStart)||!view.getUint32(dataStart+4)))return corrupt();
  if(type==='IHDR'&&result.length)return corrupt();
  if(type==='IDAT')sawImage=true;
  result.push({type,start:at,dataStart,dataEnd,end});at=end;
  if(type==='IEND'){if(length||at!==bytes.length)return corrupt();sawEnd=true;break;}
 }
 if(!sawImage||!sawEnd)return corrupt();return result;
}
function metadataText(bytes:Uint8Array,chunk:Chunk):string|undefined{
 if(chunk.type!=='iTXt')return;
 const data=bytes.subarray(chunk.dataStart,chunk.dataEnd),keywordEnd=data.indexOf(0);
 if(keywordEnd<0||keywordEnd>79)return;
 if(String.fromCharCode(...data.subarray(0,keywordEnd))!==SUPER_PNG_KEYWORD)return;
 if(data.length>MAX_METADATA_BYTES)throw new Error('Os dados do Super PNG ultrapassam o limite permitido.');
 const compressed=data[keywordEnd+1];
 if(![0,1].includes(compressed)||data[keywordEnd+2]!==0)throw new Error('Esta versão dos dados do Super PNG não é compatível.');
 const languageEnd=data.indexOf(0,keywordEnd+3),translatedEnd=languageEnd>=0?data.indexOf(0,languageEnd+1):-1;
 if(translatedEnd<0)return corrupt();
 const encoded=data.subarray(translatedEnd+1);let decoded=encoded;
 if(compressed){
  const parts:Uint8Array[]=[],inflate=new Inflate({windowBits:15,chunkSize:64*1024});let total=0,stream:{avail_in:number}|undefined;
  inflate.onStart=s=>{stream=s;};
  inflate.onData=part=>{total+=part.length;if(total>MAX_METADATA_BYTES)throw new Error('O conteúdo descompactado ultrapassa o limite permitido.');parts.push(part);};
  try{inflate.push(encoded,true);}catch(e){if(e instanceof Error&&e.message.includes('descompactado'))throw e;return corrupt();}
  if(inflate.err||!inflate.ended||stream?.avail_in!==0)return corrupt();
  decoded=new Uint8Array(total);let offset=0;for(const part of parts){decoded.set(part,offset);offset+=part.length;}
 }
 if(decoded.length>MAX_METADATA_BYTES)throw new Error('O conteúdo descompactado ultrapassa o limite permitido.');
 try{return decoder.decode(decoded);}catch{return corrupt();}
}
function makeChunk(type:string,data:Uint8Array):Uint8Array{
 const output=new Uint8Array(data.length+12),view=new DataView(output.buffer);view.setUint32(0,data.length);output.set(encoder.encode(type),4);output.set(data,8);view.setUint32(data.length+8,crc32(output.subarray(4,data.length+8)));return output;
}
export function embedSuperPng(image:Uint8Array,kind:SuperPngKind,name:string,payload:unknown):Uint8Array<ArrayBuffer>{
 if(!['character','ruleset'].includes(kind)||typeof name!=='string'||name.length>200)throw new Error('Identificação inválida para exportação.');
 const parsed=chunks(image),serialized=JSON.stringify(payload);
 if(typeof serialized!=='string'||serializedUtf8Size(payload)>contentByteLimit(kind))throw new Error('O conteúdo ultrapassa a cota de '+contentQuotaLabel(kind)+'. Reduza os textos ou imagens antes de exportar.');
 const identity={kind,name,payload:serialized};
 const envelope=JSON.stringify({format:SUPER_PNG_FORMAT,version:SUPER_PNG_VERSION,kind,name,payload,integrity:{algorithm:'CRC32',checksum:checksum(JSON.stringify(identity))}});
 const keyword=encoder.encode(SUPER_PNG_KEYWORD),raw=encoder.encode(envelope);
 if(raw.length>MAX_METADATA_BYTES)throw new Error('Os dados do Super PNG ultrapassam o limite permitido.');
 const text=deflate(raw,{level:1}),data=new Uint8Array(keyword.length+5+text.length);
 data.set(keyword);data[keyword.length+1]=1;data.set(text,keyword.length+5);
 const metadata=makeChunk('iTXt',data),pieces:Uint8Array[]=[PNG_SIGNATURE];
 for(const chunk of parsed){if(metadataText(image,chunk)!==undefined)continue;if(chunk.type==='IEND')pieces.push(metadata);pieces.push(image.subarray(chunk.start,chunk.end));}
 const size=pieces.reduce((n,p)=>n+p.length,0);if(size>MAX_SUPER_PNG_BYTES)throw new Error('O Super PNG ultrapassa 30 MiB. Use uma imagem menor.');
 const output=new Uint8Array(size);let at=0;for(const part of pieces){output.set(part,at);at+=part.length;}return output;
}
export function extractSuperPng(bytes:Uint8Array):SuperPngData|null{
 const found=chunks(bytes).flatMap(chunk=>{const text=metadataText(bytes,chunk);return text===undefined?[]:[text];});
 if(!found.length)return null;if(found.length!==1)throw new Error('O PNG contém dados duplicados ou ambíguos do ANTROPOLOGO.');
 let envelope:any;try{envelope=JSON.parse(found[0]);}catch{return corrupt();}
 if(!envelope||envelope.format!==SUPER_PNG_FORMAT||![1,SUPER_PNG_VERSION].includes(envelope.version))throw new Error('O formato ou a versão deste Super PNG não é compatível.');
 if(!['character','ruleset'].includes(envelope.kind)||typeof envelope.name!=='string'||envelope.name.length>200||envelope.integrity?.algorithm!=='CRC32'||!/^[0-9a-f]{8}$/.test(envelope.integrity.checksum))return corrupt();
 let payload:any;try{payload=envelope.version===1?JSON.parse(envelope.payload):envelope.payload;}catch{return corrupt();}
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||envelope.version===1&&typeof envelope.payload!=='string')return corrupt();
 const serialized=envelope.version===1?envelope.payload:JSON.stringify(payload);
 if(serializedUtf8Size(payload)>contentByteLimit(envelope.kind))throw new Error('O conteúdo embutido ultrapassa a cota de '+contentQuotaLabel(envelope.kind)+'.');
 const actual=checksum(JSON.stringify({kind:envelope.kind,name:envelope.name,payload:serialized}));if(actual!==envelope.integrity.checksum)return corrupt();
 if(!payload||payload.name!==envelope.name||payload.format!==(envelope.kind==='character'?'ab10-character':'rpg-ruleset'))throw new Error('O tipo ou o nome do conteúdo não corresponde aos dados do Super PNG.');
 return {kind:envelope.kind,name:envelope.name,payload,integrity:'valid'};
}
