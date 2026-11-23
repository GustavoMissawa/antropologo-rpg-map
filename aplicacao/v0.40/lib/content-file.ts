import {validateImportedThemeMedia} from './theme-media-validation.ts';
import {MAX_JSON_BYTES,SUPER_PNG_FILE_BYTES,contentByteLimit,contentQuotaLabel} from './content-limits.ts';
import {parseSheet,parseRulebook,serializeRulebook,type Sheet,type Rulebook} from './model.ts';
import {isPng} from './png-bytes.ts';
export type ExportContent=Sheet|Rulebook;
export type ImportedContent=({kind:'character';content:Sheet}|{kind:'ruleset';content:Rulebook})&{source:'json'|'super-png';integrity?:'valid'};
export const CONTENT_FILE_ACCEPT='.ab10,.regras,.json,.png,application/json,image/png';
export const SHEET_FILE_ACCEPT='.ab10,.json,.png,application/json,image/png';
export const RULEBOOK_FILE_ACCEPT='.regras,.json,.png,application/json,image/png';
export function serializeExportContent(content:ExportContent):string{
 let text:string;if(content.format==='rpg-ruleset')text=serializeRulebook(content);else{parseSheet(content);text=JSON.stringify(content,null,2);}
 const kind=content.format==='rpg-ruleset'?'ruleset':'character';if(new TextEncoder().encode(text).length>contentByteLimit(kind))throw new Error('O conteúdo ultrapassa a cota de '+contentQuotaLabel(kind)+'. Reduza os textos ou imagens antes de exportar.');return text;
}
export function parseImportedContent(input:unknown,source:'json'|'super-png'='json'):ImportedContent{
 const integrity=source==='super-png'?{integrity:'valid' as const}:{};
 if(input&&typeof input==='object'&&'format' in input){if(input.format==='ab10-character')return {kind:'character',content:parseSheet(input),source,...integrity};if(input.format==='rpg-ruleset')return {kind:'ruleset',content:parseRulebook(input),source,...integrity};}
 throw new Error('O arquivo não contém uma ficha ou conjunto de regras do ANTROPOLOGO RPG.');
}
export async function readContentFile(file:Pick<File,'size'|'name'|'arrayBuffer'>):Promise<ImportedContent>{
 if(file.size>SUPER_PNG_FILE_BYTES)throw new Error('O limite é de 20 MiB para sistemas JSON, 5 MiB para fichas JSON ou 30 MiB para Super PNG.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(isPng(bytes)){
  const {extractSuperPng}=await import('./super-png.ts');
  const decoded=extractSuperPng(bytes);if(!decoded)throw new Error('Este PNG é uma imagem comum: não contém dados do ANTROPOLOGO.');
  const result=parseImportedContent(decoded.payload,'super-png');if(result.kind==='ruleset'&&result.content.visuals)await validateImportedThemeMedia(result.content.visuals.assets);return result;
 }
 if(/\.png$/i.test(file.name))throw new Error('O arquivo PNG parece inválido ou corrompido.');
 if(bytes.length>MAX_JSON_BYTES)throw new Error('O limite de dados JSON é de 20 MiB para sistemas e 5 MiB para fichas.');
 let data:unknown;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw new Error('O arquivo não contém um JSON válido do ANTROPOLOGO RPG.');}const kind=(data as {format?:unknown})?.format==='rpg-ruleset'?'ruleset':'character';if(bytes.length>contentByteLimit(kind))throw new Error('O limite de dados JSON deste conteúdo é de '+contentQuotaLabel(kind)+'.');const result=parseImportedContent(data);if(result.kind==='ruleset'&&result.content.visuals)await validateImportedThemeMedia(result.content.visuals.assets);return result;
}
export function importReceipt(result:ImportedContent):string{
 if(result.source==='super-png')return `Super PNG detectado · Tipo: ${result.kind==='character'?'ficha de personagem':'conjunto de regras'} · Nome: ${result.content.name} · Integridade: válida. Importação concluída.`;
 return result.kind==='character'?'Ficha carregada com sucesso.':'Conjunto carregado e adicionado à sua seleção.';
}
export function exportFilename(name:string,extension:'json'|'png'):string{return (name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,180)||'antropologo')+'.'+extension;}
