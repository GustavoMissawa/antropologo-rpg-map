import type { Field, FieldPart, FieldRoll } from './model';

type Source={fieldId:string;part:FieldPart;label:string};
// Keep field insertion local to the caret, and reuse a binding for the same source.
export function insertRollField(roll:FieldRoll,source:Source,start=roll.formula.length,end=start,selfId?:string,reserved=['valor','modificador']){
 const used=new Set([...roll.formula.matchAll(/@([A-Za-z][A-Za-z0-9_]{0,31})/g)].map(m=>m[1]));
 const self=source.fieldId===selfId,existing=roll.variables.find(v=>v.fieldId===source.fieldId&&v.part===source.part&&(!selfId||!reserved.includes(v.name)));
 let name=self?(source.part==='modifier'?'modificador':source.part==='maximum'?'maximo':reserved.includes('atual')?'atual':'valor'):existing?.name;
 if(!name){
  let alias=(source.label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'')||'campo').slice(0,24);
  if(!/^[a-z]/.test(alias))alias='campo_'+alias;
  if(source.part==='modifier')alias=alias.slice(0,24)+'_mod';if(source.part==='maximum')alias=alias.slice(0,24)+'_max';
  const base=alias.slice(0,28);name=base;let i=2;
  while(used.has(name)||roll.variables.some(v=>v.name===name)||!!selfId&&reserved.includes(name))name=base+'_'+i++;
 }
 const left=roll.formula.slice(0,start),right=roll.formula.slice(end),before=left.trimEnd(),after=right.trimStart();
 const insert=(before&&/[\w).]$/.test(before)?' + ':'')+'@'+name+(after&&/^[\w@(.]/.test(after)?' + ':'');
 const formula=left+insert+right;if(formula.length>500)throw new Error('A fórmula pode ter até 500 caracteres.');
 const names=new Set([...formula.matchAll(/@([A-Za-z][A-Za-z0-9_]{0,31})/g)].map(m=>m[1]));
 if(names.size>20)throw new Error('Use até 20 campos por fórmula.');
 const variables=roll.variables.filter(v=>names.has(v.name)&&(!selfId||!reserved.includes(v.name)));
 if(!self&&!variables.some(v=>v.name===name))variables.push({name,fieldId:source.fieldId,part:source.part});
 return {formula,variables,caret:left.length+insert.length};
}

export type RollPreset='bonus'|'modifier'|'pool'|'current'|'maximum'|'custom';
export const presetFormula=(preset:Exclude<RollPreset,'custom'>,sides=20)=>({bonus:`1d${sides} + @valor`,modifier:`1d${sides} + @modificador`,pool:`(@valor)d${sides}`,current:`1d${sides} + @atual`,maximum:`1d${sides} + @maximo`})[preset];
export const defaultRollPreset=(type:Field['type']):Exclude<RollPreset,'custom'>=>type==='composite'?'modifier':type==='comparison'?'current':'bonus';
export function identifyRollPreset(formula:string,type:Field['type'],sides=20):RollPreset{
 const entries=['bonus','modifier','pool','current','maximum'] as const;
 return entries.find(p=>presetFormula(p,sides)===formula&&(p!=='modifier'||type==='composite')&&(!['current','maximum'].includes(p)||type==='comparison'))||'custom';
}

export function insertRollDie(formula:string,sides:number,start=formula.length,end=start){
 if(!Number.isInteger(sides)||sides<2||sides>1000)throw new Error('Escolha um dado de 2 a 1000 faces.');
 const left=formula.slice(0,start),right=formula.slice(end),before=left.trimEnd(),after=right.trimStart();
 const token=(before&&/[\w).]$/.test(before)?' + ':'')+'1d'+sides+(after&&/^[\w@(.]/.test(after)?' + ':'');
 const next=left+token+right;if(next.length>500)throw new Error('A fórmula pode ter até 500 caracteres.');return {formula:next,caret:left.length+token.length};
}
