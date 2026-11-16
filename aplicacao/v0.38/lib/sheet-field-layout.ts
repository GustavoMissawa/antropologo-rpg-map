import type { Block,Field } from './model.ts';

export type FieldRow={fields:Field[];tracks:number};
const span=(field:Field,columns=4)=>Math.min(columns,Math.max(1,field.columnSpan||1));
/** Read explicit rows, or reconstruct exactly the rows of an older column grid. */
export function fieldRows(block:Block):FieldRow[]{
 if(block.fields.some(f=>f.row!==undefined)){
  const groups=new Map<string,Field[]>();
  for(const field of block.fields){const key=field.row===undefined?'field:'+field.id:'row:'+field.row;const row=groups.get(key)||[];row.push(field);groups.set(key,row);}
  return [...groups.values()].map(fields=>({fields,tracks:Math.max(fields.reduce((n,f)=>n+span(f),0),...fields.map(f=>f.rowSize||1))}));
 }
 const columns=block.columns||1,rows:FieldRow[]=[];let fields:Field[]=[],used=0;
 const flush=()=>{if(fields.length)rows.push({fields,tracks:columns});fields=[];used=0;};
 for(const field of block.fields){const width=span(field,columns);if(used+width>columns)flush();fields.push(field);used+=width;if(used===columns)flush();}
 flush();return rows;
}
export const canAddBeside=(block:Block,id:string)=>block.fields.length<200&&(fieldRows(block).find(row=>row.fields.some(f=>f.id===id))?.fields.length??4)<4;

function explicitFields(rows:FieldRow[]):Field[]{
 return rows.flatMap((row,index)=>row.fields.map(f=>({...f,row:index,rowSize:row.tracks,columnSpan:span(f,row.tracks)})));
}
export function insertBlockField(block:Block,field:Field,besideId?:string):Block{
 if(block.fields.length>=200)throw new Error('O limite é de 200 campos por bloco.');
 const rows=fieldRows(block).map(row=>({...row,fields:[...row.fields]}));
 if(besideId){
  const row=rows.find(row=>row.fields.some(f=>f.id===besideId));
  if(!row)throw new Error('O campo de origem foi removido. Escolha outro campo.');
  if(row.fields.length>=4)throw new Error('Esta linha já possui quatro campos. Adicione uma nova linha abaixo.');
  const index=row.fields.findIndex(f=>f.id===besideId);row.fields.splice(index+1,0,field);
  row.fields=row.fields.map(f=>({...f,columnSpan:1}));row.tracks=row.fields.length;
 }else rows.push({fields:[{...field,columnSpan:1}],tracks:1});
 const required=besideId?({2:384,3:576,4:768} as Record<number,number>)[rows.find(row=>row.fields.some(f=>f.id===field.id))!.fields.length]||300:block.layout.width;
 return {...block,fields:explicitFields(rows),layout:{...block.layout,width:Math.max(block.layout.width,required)}};
}
/** Move between neighboring cells while keeping the other row boundaries. */
export function moveBlockField(block:Block,id:string,delta:number):Block{
 const rows=fieldRows(block),slots=explicitFields(rows),index=slots.findIndex(f=>f.id===id),to=index+delta;
 if(index<0||to<0||to>=slots.length)return block;
 const fields=[...slots],moved=fields.splice(index,1)[0];fields.splice(to,0,moved);
 return {...block,fields:fields.map((f,i)=>({...f,row:slots[i].row,rowSize:slots[i].rowSize,columnSpan:slots[i].columnSpan}))};
}
export function fieldSpanOptions(block:Block,id:string):number{
 const row=fieldRows(block).find(row=>row.fields.some(f=>f.id===id));
 if(!row)return 1;if(row.fields.length===1)return row.fields[0].columnSpan||1;
 return Math.max(1,4-row.fields.filter(f=>f.id!==id).reduce((n,f)=>n+span(f,row.tracks),0));
}
