import { assertAllowedDice,faceOutcome,parseKeepOverride,type DiceSet,type DieFace,type DiceSymbol,type FaceOutcome,type DiceResolution,type KeepOverride,type RollOrder } from './dice-set.ts';
// Restricted arithmetic grammar: formulas are parsed, never executed as code.
type Node={kind:'number';value:number}|{kind:'variable';name:string}|{kind:'dice';count:Node;sides:number}|{kind:'negate';child:Node}|{kind:'binary';op:string;left:Node;right:Node};
export type DiceGroup={notation:string;results:number[];total:number|null;label?:string;representations?:(DieFace|null)[]};
export type ResolvedDie={id:string;group:number;index:number;faceIndex:number;sides:number;label:string;display:DieFace|null;outcome:FaceOutcome;priority?:number;control:boolean};
export type RollResolutionState={formula:string;settings:DiceResolution;dice:ResolvedDie[];keptIds:string[];symbols:DiceSymbol[];symbolTotals:{symbolId:string;count:number}[];error?:string};
export type DiceResult={total:number|null;groups:DiceGroup[];variables:{name:string;value:number}[];resolution?:RollResolutionState};
// Legacy per-sheet overrides remain readable but never control the system policy.
// Only an action registered in this system's catalog can have a special limit.
export type RollOptions={keep?:KeepOverride;systemActionId?:string};
export function rollSettings(set?:DiceSet,options:RollOptions={}):DiceResolution{
 const base=set?.resolution||{method:'numeric' as const},actions=base.actionLimits;
 const special=options.systemActionId&&actions&&Object.hasOwn(actions,options.systemActionId)?parseKeepOverride(actions[options.systemActionId]):undefined;
 const keep=base.keep?{count:special===undefined?base.keep.count:special==='all'?100:special}:undefined;
 return {method:base.method,order:base.order||'original',...(keep?{keep}:{})};
}
function checkResolutionFormula(root:Node,set?:DiceSet){
 const method=set?.resolution?.method||'numeric';
 function visit(n:Node,countContext=false):boolean{
  if(n.kind==='number'||n.kind==='variable')return false;
  if(n.kind==='dice'){visit(n.count,true);const def=set?.dice.find(d=>d.sides===n.sides),symbolic=method==='symbols'||Object.values(def?.faces||{}).some(f=>f.kind==='symbols'||f.outcome?.kind==='symbols');if(countContext&&symbolic)throw new Error('Um resultado simbólico não pode definir a quantidade de dados. Use um número ou campo numérico.');return symbolic;}
  if(n.kind==='negate'){const symbolic=visit(n.child,countContext);if(symbolic)throw new Error('Resultados simbólicos formam uma reserva de dados: combine grupos com +, sem multiplicar, dividir ou subtrair símbolos.');return false;}
  const left=visit(n.left,countContext),right=visit(n.right,countContext);if(n.op!=='+'&&(left||right))throw new Error('Resultados simbólicos formam uma reserva de dados: combine grupos com +. Use números e cálculos na quantidade dos dados.');return left||right;
 }
 visit(root);
}

export const normalizeDiceFormula=(formula:string)=>formula.replace(/[−–]/g,'-').replace(/[×✕]/g,'*').replace(/÷/g,'/').replace(/(\d),(?=\d)/g,'$1.');
export function compileDice(formula:string){
 if(typeof formula!=='string'||!formula.trim()||formula.length>500)throw new Error('Escreva uma fórmula de até 500 caracteres.');
 formula=normalizeDiceFormula(formula);
 let at=0,nodes=0,staticDiceCount=0;const variables=new Set<string>(),diceSides=new Set<number>();
 const whitespace=()=>{while(at<formula.length&&/\s/.test(formula[at]))at++;};
 const node=<T extends Node>(value:T):T=>{if(++nodes>200)throw new Error('A fórmula é longa demais.');return value;};
 function dice(count:Node,sides:number):Node{
  if(!Number.isSafeInteger(sides)||sides<2||sides>1000)throw new Error('Use dados com 2 a 1000 faces.');
  if(count.kind==='number'){staticDiceCount+=count.value;if(!Number.isSafeInteger(count.value)||count.value<1||count.value>100||staticDiceCount>100)throw new Error('Use no máximo 100 dados por rolagem, com quantidade inteira de 1 a 100.');}
  diceSides.add(sides);return node({kind:'dice',count,sides});
 }
 function postfix(value:Node):Node{whitespace();const match=formula.slice(at).match(/^[dD]\s*(\d+)/);if(!match)return value;at+=match[0].length;return dice(value,Number(match[1]));}
 function primary(depth:number):Node{
  if(depth>24)throw new Error('Use menos parênteses e sinais em sequência.');whitespace();const char=formula[at];
  if(char==='+'||char==='-'){at++;const child=primary(depth+1);return char==='-'?node({kind:'negate',child}):child;}
  if(char==='('){at++;const inner=expression(depth+1);whitespace();if(formula[at++]!==')')throw new Error('Feche os parênteses da fórmula.');return postfix(inner);}
  const rest=formula.slice(at),variable=rest.match(/^@([A-Za-z][A-Za-z0-9_]{0,31})/);
  if(variable){at+=variable[0].length;variables.add(variable[1]);if(variables.size>20)throw new Error('Use até 20 campos por fórmula.');return postfix(node({kind:'variable',name:variable[1]}));}
  const single=rest.match(/^[dD]\s*(\d+)/);if(single){at+=single[0].length;return dice(node({kind:'number',value:1}),Number(single[1]));}
  const number=rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);if(number){at+=number[0].length;const value=Number(number[0]);if(!Number.isFinite(value)||value>1e12)throw new Error('O número é grande demais.');return postfix(node({kind:'number',value}));}
  throw new Error('Use dados (1d20), números, @campos, +, −, *, / e parênteses.');
 }
 function product(depth:number):Node{let left=primary(depth);whitespace();while(formula[at]==='*'||formula[at]==='/'){const op=formula[at++];left=node({kind:'binary',op,left,right:primary(depth)});whitespace();}return left;}
 function expression(depth:number):Node{let left=product(depth);whitespace();while(formula[at]==='+'||formula[at]==='-'){const op=formula[at++];left=node({kind:'binary',op,left,right:product(depth)});whitespace();}return left;}
 const root=expression(0);whitespace();if(at!==formula.length)throw new Error('Há um trecho inválido na fórmula. Confira os sinais e os campos.');
 return {root,variables:[...variables],diceSides:[...diceSides]};
}
// Validate only known values. Never invent die outcomes while configuring a roll.
// Random denominators/counts are checked again against actual results at launch.
export function validateDice(formula:string,values:Record<string,number>={},set?:DiceSet,options:RollOptions={}){
 const {root,variables,diceSides}=compileDice(formula);assertAllowedDice(diceSides,set);rollSettings(set,options);checkResolutionFormula(root,set);for(const name of variables)if(!Object.hasOwn(values,name)||!Number.isFinite(values[name]))throw new Error(`Vincule @${name} a um campo numérico válido.`);
 let diceCount=0;
 function visit(n:Node):number|null{
  let value:number|null;
  if(n.kind==='number')value=n.value;
  else if(n.kind==='variable')value=values[n.name];
  else if(n.kind==='negate'){const child=visit(n.child);value=child===null?null:-child;}
  else if(n.kind==='dice'){
   const count=visit(n.count);if(count!==null){if(!Number.isSafeInteger(count)||count<1||count>100)throw new Error('A quantidade de dados precisa ser um número inteiro de 1 a 100. Confira o valor do campo.');diceCount+=count;if(diceCount>100)throw new Error('O lançamento ultrapassa o limite de 100 dados.');}value=null;
  }else{const left=visit(n.left),right=visit(n.right);if(n.op==='/'&&right===0)throw new Error('A fórmula tenta dividir por zero.');value=left===null||right===null?null:n.op==='+'?left+right:n.op==='-'?left-right:n.op==='*'?left*right:left/right;}
  if(value!==null&&(!Number.isFinite(value)||Math.abs(value)>1e12))throw new Error('O resultado ultrapassa o limite de cálculo.');return value;
 }
 visit(root);return {variables};
}
export function randomDie(sides:number){
 if(!Number.isInteger(sides)||sides<2||sides>1000)throw new Error('Escolha um dado de 2 a 1000 faces.');
 const ceiling=Math.floor(0x100000000/sides)*sides,buffer=new Uint32Array(1);do{crypto.getRandomValues(buffer);}while(buffer[0]>=ceiling);return buffer[0]%sides+1;
}
export function rollDice(formula:string,values:Record<string,number>={},die:(sides:number)=>number=randomDie,set?:DiceSet,options:RollOptions={}):DiceResult{
 const {root,variables,diceSides}=compileDice(formula);assertAllowedDice(diceSides,set);checkResolutionFormula(root,set);const settings=rollSettings(set,options);
 for(const name of variables)if(!Object.hasOwn(values,name)||!Number.isFinite(values[name]))throw new Error(`Vincule @${name} a um campo numérico válido.`);
 const advanced=!!set?.resolution||!!set?.symbols?.length||!!set?.dice.some(d=>Object.values(d.faces||{}).some(f=>['blank','number','symbols'].includes(f.kind)||f.outcome!==undefined||f.priority!==undefined));
 const groups:DiceGroup[]=[],rolled:ResolvedDie[]=[];let diceCount=0;
 function evaluate(n:Node,control=false):number{
  let value:number;
  if(n.kind==='number')value=n.value;
  else if(n.kind==='variable')value=values[n.name];
  else if(n.kind==='negate')value=-evaluate(n.child,control);
  else if(n.kind==='dice'){
   const count=evaluate(n.count,true);if(!Number.isSafeInteger(count)||count<1||count>100)throw new Error('A quantidade de dados precisa ser um número inteiro de 1 a 100. Confira o valor do campo.');diceCount+=count;if(diceCount>100)throw new Error('O lançamento ultrapassa o limite de 100 dados.');
   const definition=set?.dice.find(d=>d.sides===n.sides),group=groups.length;
   const results=Array.from({length:count},(_,index)=>{const faceIndex=die(n.sides);if(!Number.isInteger(faceIndex)||faceIndex<1||faceIndex>n.sides)throw new Error('Não foi possível gerar o dado. Tente novamente.');
    if(advanced){const face=definition?.faces?.[faceIndex],outcome=faceOutcome(face,faceIndex,settings.method);if(control&&outcome.kind!=='number')throw new Error('O dado usado como quantidade não produziu um número. Use um campo ou quantidade fixa.');rolled.push({id:`g${group}-d${index}`,group,index,faceIndex,sides:n.sides,label:definition?.name||'d'+n.sides,display:face?structuredClone(face):null,outcome,...(face?.priority!==undefined?{priority:face.priority}:{}),control});}return faceIndex;});
   value=advanced?rolled.filter(d=>d.group===group).reduce((sum,d)=>sum+(d.outcome.kind==='number'?d.outcome.value:0),0):results.reduce((a,b)=>a+b,0);
   groups.push({notation:`${count}d${n.sides}`,results,total:value,...(definition?{label:definition.name}:{}),...(definition?.faces?{representations:results.map(index=>definition.faces![index]?structuredClone(definition.faces![index]):null)}:{})});
  }else {const left=evaluate(n.left,control),right=evaluate(n.right,control);if(n.op==='/'&&right===0)throw new Error('A fórmula tenta dividir por zero.');value=n.op==='+'?left+right:n.op==='-'?left-right:n.op==='*'?left*right:left/right;}
  if(!Number.isFinite(value)||Math.abs(value)>1e12)throw new Error('O resultado ultrapassa o limite de cálculo.');return value;
 }
 const total=evaluate(root),result:DiceResult={total,groups,variables:variables.map(name=>({name,value:values[name]}))};if(!advanced)return result;
 const eligible=rolled.filter(d=>!d.control),effective={...settings};if(effective.keep&&!eligible.length)delete effective.keep;
 const resolution:RollResolutionState={formula,settings:effective,dice:rolled,keptIds:[],symbols:(set?.symbols||[]).map(s=>({...s,display:structuredClone(s.display)})),symbolTotals:[]};
 return resolveDiceSelection({...result,resolution},effective.keep?[]:eligible.map(d=>d.id));
}
// Recompute from immutable, already rolled face content. Selection never rolls again,
// looks up a mutable catalog, or substitutes a priority for an outcome.
export function resolveDiceSelection(result:DiceResult,ids:string[]):DiceResult{
 const r=result.resolution;if(!r)return result;const eligible=r.dice.filter(d=>!d.control),allowed=new Set(eligible.map(d=>d.id)),selected=new Set(ids);
 if(ids.length!==selected.size||ids.some(id=>!allowed.has(id)))throw new Error('A seleção contém dados inválidos ou repetidos.');
 if(r.settings.keep&&ids.length>r.settings.keep.count)throw new Error(`Mantenha no máximo ${r.settings.keep.count} dados nesta rolagem.`);
 if(!r.settings.keep&&ids.length!==eligible.length)throw new Error('Esta rolagem usa todos os dados.');
 const keptIds=eligible.filter(d=>selected.has(d.id)).map(d=>d.id),totals=new Map<string,number>();
 for(const d of eligible)if(selected.has(d.id)&&d.outcome.kind==='symbols')for(const s of d.outcome.symbols)totals.set(s.symbolId,(totals.get(s.symbolId)||0)+s.count);
 const symbolTotals=r.symbols.filter(s=>totals.has(s.id)).map(s=>({symbolId:s.id,count:totals.get(s.id)!}));
 const groups=result.groups.map((g,index)=>{const numbers=r.dice.filter(d=>d.group===index&&(d.control||selected.has(d.id))&&d.outcome.kind==='number');return {...g,total:numbers.length?numbers.reduce((sum,d)=>sum+(d.outcome.kind==='number'?d.outcome.value:0),0):null};});
 let at=0;
 function replay(n:Node):{value:number;numeric:boolean}{
  if(n.kind==='number')return {value:n.value,numeric:true};if(n.kind==='variable')return {value:result.variables.find(v=>v.name===n.name)!.value,numeric:true};
  if(n.kind==='dice'){replay(n.count);const group=groups[at++];if(!group)throw new Error('Os dados desta rolagem estão inconsistentes.');return {value:group.total??0,numeric:group.total!==null};}
  if(n.kind==='negate'){const inner=replay(n.child);return {value:-inner.value,numeric:inner.numeric};}
  const left=replay(n.left),right=replay(n.right);if(n.op==='/'&&right.value===0)throw new Error('A seleção deixa uma divisão por zero. Mantenha os dados necessários ou ajuste a fórmula.');const value=n.op==='+'?left.value+right.value:n.op==='-'?left.value-right.value:n.op==='*'?left.value*right.value:left.value/right.value;if(!Number.isFinite(value)||Math.abs(value)>1e12)throw new Error('A seleção ultrapassa o limite de cálculo.');return {value,numeric:left.numeric||right.numeric};
 }
 let total:number|null=null,error:string|undefined;
 if(!r.settings.keep||keptIds.length)try{const value=replay(compileDice(r.formula).root);total=value.numeric?value.value:null;}catch(e){error=(e as Error).message;}
 const {error:previous,...rest}=r;return {...result,total,groups,resolution:{...rest,keptIds,symbolTotals,...(error?{error}:{})}};
}
export function orderedRollDice(result:DiceResult,order:RollOrder=result.resolution?.settings.order||'original'):ResolvedDie[]{
 const dice=[...(result.resolution?.dice||[])];if(order==='original')return dice;
 return dice.sort((a,b)=>a.priority===undefined&&b.priority===undefined?0:a.priority===undefined?1:b.priority===undefined?-1:order==='best'?b.priority-a.priority:a.priority-b.priority);
}
export function toggleKeptDie(result:DiceResult,id:string):DiceResult{
 const r=result.resolution;if(!r?.settings.keep)throw new Error('Roll and Keep não está ativo nesta rolagem.');return resolveDiceSelection(result,r.keptIds.includes(id)?r.keptIds.filter(x=>x!==id):[...r.keptIds,id]);
}
export function orderDiceResult(result:DiceResult,order:RollOrder):DiceResult{
 if(!['original','best','worst'].includes(order))throw new Error('Escolha uma ordem válida.');if(!result.resolution)return result;return {...result,resolution:{...result.resolution,settings:{...result.resolution.settings,order}}};
}
export function displayRollFormula(formula:string,values:Record<string,number>){
 return normalizeDiceFormula(formula).replace(/@([A-Za-z][A-Za-z0-9_]{0,31})/g,(token,name)=>Object.hasOwn(values,name)?(values[name]<0?'('+values[name]+')':String(values[name])):token).replace(/\((\d+)\)\s*[dD]\s*(\d+)/g,'$1d$2');
}
