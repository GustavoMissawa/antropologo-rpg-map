import {parseDiceSet} from '../../lib/dice-set.ts';
export const tinyImage='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
// Table supplied in the request. Priorities below are test data, not game rules.
export const conversion=['','','C','C','BC','A','AA','AB','ABC','AAC','ABBC','CC'];
export function symbolicSet(keep,priorities={}){
 return parseDiceSet({version:4,symbols:[{id:'A',name:'Sucessos',display:{kind:'icon',icon:'check',label:'Sucesso'}},{id:'B',name:'Adaptações',display:{kind:'symbol',text:'🌿'}},{id:'C',name:'Pressões',display:{kind:'image',src:tinyImage,label:'Pressão'}}],resolution:{method:'symbols',order:'original',...(keep?{keep:{count:keep,manual:true,auto:true}}:{})},dice:[{id:'d12',kind:'numeric',name:'Escolha',sides:12,faces:Object.fromEntries(conversion.map((text,i)=>[i+1,{...(text?{kind:'symbols',symbols:['A','B','C'].flatMap(id=>{const count=[...text].filter(c=>c===id).length;return count?[{symbolId:id,count}]:[];})}:{kind:'blank'}),...(priorities[i+1]!==undefined?{priority:priorities[i+1]}:{})}]))}]});
}
export function force(values){let at=0;const die=()=>values[at++];die.count=()=>at;return die;}
export const totals=r=>Object.fromEntries(r.resolution.symbolTotals.map(t=>[t.symbolId,t.count]));
