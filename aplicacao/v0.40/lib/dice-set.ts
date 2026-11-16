import { validDieFaceImage } from './die-face-image.ts';
export const DIE_FACE_ICONS={skull:'Caveira',flame:'Chama',heart:'Coração',shield:'Escudo',swords:'Espadas',bolt:'Raio',sun:'Sol',moon:'Lua',leaf:'Folha',target:'Alvo',check:'Sucesso',cross:'Falha'} as const;
export type DieFaceIcon=keyof typeof DIE_FACE_ICONS;
export type FaceDisplay={kind:'text'|'symbol';text:string}|{kind:'icon';icon:DieFaceIcon;label:string}|{kind:'image';src:string;label:string};
export type SymbolAmount={symbolId:string;count:number};
export type FaceOutcome={kind:'empty'}|{kind:'number';value:number}|{kind:'symbols';symbols:SymbolAmount[]};
export type DieFace=(FaceDisplay|{kind:'blank'}|{kind:'number';value:number}|{kind:'symbols';symbols:SymbolAmount[]})&{outcome?:FaceOutcome;priority?:number};
export type DiceSymbol={id:string;name:string;display:FaceDisplay};
export type RollOrder='original'|'best'|'worst';
export type KeepOverride=number|'all';
export type DiceResolution={method:'numeric'|'symbols';order?:RollOrder;keep?:{count:number};actionLimits?:Record<string,KeepOverride>};
export type NumericDie={id:string;kind:'numeric';name:string;sides:number;faces?:Record<string,DieFace>};
export type DiceSet={version:5;dice:NumericDie[];symbols?:DiceSymbol[];resolution?:DiceResolution};
export type SheetSystem={id:string;name:string;dice?:DiceSet};
export const MAX_SYSTEM_DICE=24,MAX_DICE_SYMBOLS=32,MAX_FACE_SYMBOLS=100;
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e12;
const identifier=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(v);
export function parseSymbolAmounts(input:unknown):SymbolAmount[]{
 if(!Array.isArray(input)||!input.length||input.length>MAX_DICE_SYMBOLS)throw new Error('Escolha ao menos um símbolo para a combinação. Para uma face vazia, use Vazia.');
 let total=0;const used=new Set<string>();return input.map(v=>{if(!v||!identifier(v.symbolId)||used.has(v.symbolId)||!Number.isInteger(v.count)||v.count<1||v.count>MAX_FACE_SYMBOLS||(total+=v.count)>MAX_FACE_SYMBOLS)throw new Error('Combinação inválida. Use até 100 ocorrências por face, sem repetir a categoria na lista.');used.add(v.symbolId);return {symbolId:v.symbolId,count:v.count};});
}
export function parseFaceOutcome(input:unknown):FaceOutcome{
 if(!input||typeof input!=='object')throw new Error('O resultado da face é inválido.');const o=input as FaceOutcome;
 if(o.kind==='empty')return {kind:'empty'};if(o.kind==='number'&&finite(o.value))return {kind:'number',value:o.value};if(o.kind==='symbols')return {kind:'symbols',symbols:parseSymbolAmounts(o.symbols)};throw new Error('O resultado da face deve ser numérico, simbólico ou vazio.');
}
export function parseDieFace(input:unknown):DieFace{
 const fail=():never=>{throw new Error('Face inválida. Escolha número, face vazia, texto, símbolos, ícone ou imagem.');};
 if(!input||typeof input!=='object')return fail();const face=input as DieFace;let visual:DieFace;
 if(face.kind==='blank')visual={kind:'blank'};
 else if(face.kind==='number'&&finite(face.value))visual={kind:'number',value:face.value};
 else if(face.kind==='symbols')visual={kind:'symbols',symbols:parseSymbolAmounts(face.symbols)};
 else if(face.kind==='text'||face.kind==='symbol'){if(typeof face.text!=='string'||!face.text.trim()||face.text.length>(face.kind==='text'?80:32))return fail();visual={kind:face.kind,text:face.text.trim()};}
 else if(face.kind==='icon'&&Object.hasOwn(DIE_FACE_ICONS,face.icon)&&typeof face.label==='string'&&face.label.trim()&&face.label.length<=80)visual={kind:'icon',icon:face.icon,label:face.label.trim()};
 else if(face.kind==='image'){if(!validDieFaceImage(face.src)||typeof face.label!=='string'||!face.label.trim()||face.label.length>80)throw new Error('Imagem de face inválida. Use PNG, JPG ou WebP de até 150 KB e um nome de até 80 caracteres.');visual={kind:'image',src:face.src,label:face.label.trim()};}
 else return fail();
 if(face.outcome!==undefined){const outcome=parseFaceOutcome(face.outcome);if((face.kind==='blank'&&outcome.kind!=='empty')||face.kind==='symbols'||face.kind==='number')throw new Error('O resultado desta face já é definido pelo seu conteúdo.');visual.outcome=outcome;}
 if(face.priority!==undefined){if(!finite(face.priority))throw new Error('A prioridade da face deve ser um número válido.');visual.priority=face.priority;}
 return visual;
}
export function parseKeepOverride(input:unknown):KeepOverride{if(input==='all')return 'all';if(!Number.isInteger(input)||Number(input)<1||Number(input)>100)throw new Error('A quantidade de dados mantidos deve ser um inteiro de 1 a 100.');return Number(input);}
export function parseDiceResolution(input:unknown):DiceResolution{
 if(!input||typeof input!=='object')throw new Error('A interpretação dos dados é inválida.');const r=input as DiceResolution;
 if(!['numeric','symbols'].includes(r.method)||r.order!==undefined&&!['original','best','worst'].includes(r.order))throw new Error('Escolha interpretação numérica ou simbólica e uma ordem válida.');
 const result:DiceResolution={method:r.method,...(r.order!==undefined?{order:r.order}:{})};
 // v4's manual/auto flags are deliberately ignored. Keeping dice is always manual.
 if(r.keep!==undefined){const k=r.keep;if(!k||typeof k!=='object')throw new Error('Defina o máximo de dados mantidos.');const count=parseKeepOverride(k.count);if(count==='all')throw new Error('Defina o máximo de dados mantidos.');result.keep={count};}
 if(r.actionLimits!==undefined){if(!r.actionLimits||typeof r.actionLimits!=='object'||Array.isArray(r.actionLimits)||Object.keys(r.actionLimits).length>20050)throw new Error('Os limites de ações do sistema são inválidos.');const entries=Object.entries(r.actionLimits);if(entries.some(([id])=>!identifier(id)))throw new Error('O identificador da ação do sistema é inválido.');result.actionLimits=Object.fromEntries(entries.map(([id,limit])=>[id,parseKeepOverride(limit)]));}return result;
}
export function faceOutcome(face:DieFace|undefined,index:number,method:'numeric'|'symbols'='numeric'):FaceOutcome{
 if(face?.kind==='blank')return {kind:'empty'};if(face?.kind==='number')return {kind:'number',value:face.value};if(face?.kind==='symbols')return {kind:'symbols',symbols:face.symbols.map(v=>({...v}))};if(face?.outcome)return structuredClone(face.outcome);
 // Old catalogs deliberately retain their former numeric presentation behavior.
 // Symbolic systems never infer results from a face index or a picture/text.
 return method==='numeric'?{kind:'number',value:index}:{kind:'empty'};
}
export const dieFaceLabel=(face:DieFace,symbols:DiceSymbol[]=[])=>face.kind==='blank'?'Vazio':face.kind==='number'?String(face.value):face.kind==='symbols'?face.symbols.map(v=>(symbols.find(s=>s.id===v.symbolId)?.name||'Símbolo')+(v.count>1?' ×'+v.count:'')).join(', '):face.kind==='icon'||face.kind==='image'?face.label:face.text;
export const DEFAULT_DICE:NumericDie[]=[4,6,8,10,12,20,100].map(sides=>({id:'d'+sides,kind:'numeric',name:'d'+sides,sides}));
export const availableDice=(set?:DiceSet)=>set?.dice??DEFAULT_DICE;
export const defaultDieSides=(set?:DiceSet)=>availableDice(set).find(d=>d.sides===20)?.sides??availableDice(set)[0].sides;
export function parseDiceSet(input:unknown):DiceSet{
 const fail=():never=>{throw new Error('Dados inválidos. Defina de 1 a 24 tipos, cada um com nome e uma quantidade de faces única entre 2 e 1000.');};
 if(!input||typeof input!=='object')return fail();const set=input as DiceSet;
 if(![1,2,3,4,5].includes(set.version)||!Array.isArray(set.dice)||!set.dice.length||set.dice.length>MAX_SYSTEM_DICE)return fail();
 const symbolIds=new Set<string>();let symbols:DiceSymbol[]|undefined;
 if(set.symbols!==undefined){if(!Array.isArray(set.symbols)||set.symbols.length>MAX_DICE_SYMBOLS)throw new Error('Defina até 32 símbolos por sistema.');symbols=set.symbols.map(s=>{if(!s||!identifier(s.id)||symbolIds.has(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>80)throw new Error('Cada símbolo precisa de ID único e nome de até 80 caracteres.');const display=parseDieFace(s.display);if(!['text','symbol','icon','image'].includes(display.kind)||display.outcome!==undefined||display.priority!==undefined)throw new Error('Escolha texto, emoji, ícone ou imagem para representar o símbolo.');symbolIds.add(s.id);return {id:s.id,name:s.name.trim(),display:display as FaceDisplay};});}
 const ids=new Set<string>(),sides=new Set<number>();
 const dice=set.dice.map(d=>{
  if(!d||d.kind!=='numeric'||!identifier(d.id)||ids.has(d.id)||typeof d.name!=='string'||!d.name.trim()||d.name.length>40||!Number.isInteger(d.sides)||d.sides<2||d.sides>1000||sides.has(d.sides))return fail();
  const faces:Record<string,DieFace>={};
  if(d.faces!==undefined){if(!d.faces||typeof d.faces!=='object'||Array.isArray(d.faces)||Object.keys(d.faces).length>d.sides)throw new Error('A lista de faces deste dado é inválida.');for(const [index,face] of Object.entries(d.faces)){if(!/^[1-9]\d{0,3}$/.test(index)||Number(index)>d.sides)throw new Error('A face personalizada não pertence a este dado.');const parsed=parseDieFace(face),amounts=parsed.kind==='symbols'?parsed.symbols:parsed.outcome?.kind==='symbols'?parsed.outcome.symbols:[];if(amounts.some(v=>!symbolIds.has(v.symbolId)))throw new Error('Uma face faz referência a um símbolo que não existe neste sistema.');faces[index]=parsed;}}
  ids.add(d.id);sides.add(d.sides);return {id:d.id,kind:'numeric' as const,name:d.name.trim(),sides:d.sides,...(Object.keys(faces).length?{faces}:{})};
 });
 return {version:5,dice,...(symbols?.length?{symbols}:{}),...(set.resolution!==undefined?{resolution:parseDiceResolution(set.resolution)}:{})};
}
export function parseSheetSystem(input:unknown):SheetSystem{
 if(!input||typeof input!=='object')throw new Error('O vínculo de dados da ficha é inválido.');const system=input as SheetSystem;
 if(typeof system.id!=='string'||!system.id||system.id.length>100||typeof system.name!=='string'||!system.name.trim()||system.name.length>200)throw new Error('O vínculo de dados da ficha é inválido.');
 return {id:system.id,name:system.name,...(system.dice!==undefined?{dice:parseDiceSet(system.dice)}:{})};
}
export function assertAllowedDice(sides:Iterable<number>,set?:DiceSet){
 if(!set)return;const allowed=new Set(set.dice.map(d=>d.sides));
 for(const value of sides)if(!allowed.has(value))throw new Error('d'+value+' não está disponível neste sistema. Use '+set.dice.map(d=>'d'+d.sides).join(', ')+'. A fórmula foi mantida para você ajustar.');
}
