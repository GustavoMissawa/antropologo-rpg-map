import type { Field, FieldPart, RollVariable, Sheet } from './model';

export type NumericResult={value:number|null;error?:string};
export const isNumericField=(field:Field)=>['number','calculated','composite','comparison'].includes(field.type);
export const signed=(value:number)=>(value>=0?'+':'')+value;
export function selfRollNames(field:Field){return field.type==='comparison'?['valor','modificador','atual','maximo']:['valor','modificador'];}
export function selfRollPart(field:Field,name:string):FieldPart|undefined{
 if(name==='valor')return 'value';if(name==='modificador')return 'modifier';
 if(field.type==='comparison'){if(name==='atual')return 'value';if(name==='maximo')return 'maximum';}
}
export function resolveRollVariables(sheet:Pick<Sheet,'blocks'>,names:string[],variables:RollVariable[],fieldId?:string){
 const resolve=createFieldResolver(sheet),values:Record<string,number>=Object.create(null),field=fieldId?sheet.blocks.flatMap(b=>b.fields).find(f=>f.id===fieldId):undefined;
 for(const name of names){
  const self=field?selfRollPart(field,name):undefined;
  const variable=self&&fieldId?{fieldId,part:self}:variables.find(v=>v.name===name);
  if(!variable)throw new Error(`Escolha a origem de @${name}.`);
  const result=resolve(variable.fieldId,variable.part);if(result.value===null)throw new Error(`@${name}: ${result.error}`);values[name]=result.value;
 }
 return values;
}
export function createFieldResolver(sheet:Pick<Sheet,'blocks'>){
 const fields=new Map(sheet.blocks.flatMap(b=>b.fields.map(f=>[f.id,f] as const)));
 const cache=new Map<string,NumericResult>(),visiting=new Set<string>();
 function resolve(id:string,part:FieldPart='value',depth=0):NumericResult{
  const key=id+':'+part,cached=cache.get(key);if(cached)return cached;
  if(visiting.has(key))return {value:null,error:'Dependência circular. Escolha outro campo de origem.'};
  if(depth>200)return {value:null,error:'Há vínculos demais em sequência.'};
  const field=fields.get(id);if(!field)return {value:null,error:'Campo de origem removido ou não encontrado. Edite o vínculo.'};
  if(!isNumericField(field))return {value:null,error:'A origem precisa ser um campo numérico.'};
  visiting.add(key);let result:NumericResult;
  if(part==='modifier'){
   if(field.type!=='composite'||!field.composite)result={value:null,error:'A origem não tem modificador. Edite o vínculo.'};
   else if(field.composite.mode==='manual')result={value:field.composite.modifier};
   else {const base=resolve(id,'value',depth+1);result=base.value===null?base:{value:Math.floor((base.value-10)/2)};}
  }else if(part==='maximum'){
   if(field.type!=='comparison'||!field.comparison)result={value:null,error:'A origem não tem valor máximo. Edite o vínculo.'};
   else {const d=field.comparison.dependency,base=d?(d.sourceId?resolve(d.sourceId,d.part,depth+1):{value:null,error:'Escolha a origem do máximo.'}):{value:field.comparison.maximum};result=base.value===null?base:{value:base.value+(d?.offset||0)};if(result.value!==null&&result.value<0)result={value:null,error:'O valor máximo precisa ser zero ou positivo.'};}
  }else if(field.type==='calculated'){
   const d=field.dependency;if(!d||!d.sourceId)result={value:null,error:'Escolha um campo de origem.'};
   else {const base=resolve(d.sourceId,d.part,depth+1);result=base.value===null?base:{value:base.value+d.offset};}
  }else result=typeof field.value==='number'&&Number.isFinite(field.value)?{value:field.value}:{value:null,error:'Preencha o valor do campo de origem.'};
  if(result.value!==null&&(!Number.isFinite(result.value)||Math.abs(result.value)>1e12))result={value:null,error:'O valor ultrapassa o limite de cálculo.'};
  visiting.delete(key);cache.set(key,result);return result;
 }
 return resolve;
}
export function numericOptions(sheet:Sheet,excludeId?:string){
 return sheet.blocks.flatMap(block=>block.fields.filter(f=>f.id!==excludeId&&isNumericField(f)).flatMap(field=>{
  const prefix=`${sheet.tabs.find(t=>t.id===block.tabId)?.title||'Aba'} · ${block.title||'Bloco'} / ${field.label||'Sem nome'}`;
  const base={fieldId:field.id,part:'value' as FieldPart,label:prefix};
  if(field.type==='composite')return [{...base,label:prefix+' (valor base)'},{...base,part:'modifier' as FieldPart,label:prefix+' (modificador)'}];
  if(field.type==='comparison')return [{...base,label:prefix+' (atual)'},{...base,part:'maximum' as FieldPart,label:prefix+' (máximo)'}];
  return [base];
 }));
}
