'use client';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { Block,Field } from '../lib/model';
import { canAddBeside,fieldRows } from '../lib/sheet-field-layout';

export function SheetBlockFields({block,preview,renderField,onAddBeside}:{block:Block;preview:boolean;renderField:(field:Field,index:number)=>ReactNode;onAddBeside:(id:string)=>void}){
 return <div className="map-block-field-rows">{fieldRows(block).map((row,index)=><div key={row.fields[0].id} data-field-row={index} className={'map-block-fields map-field-row'+(row.tracks>1?' has-field-grid field-columns-'+row.tracks:'')+(row.fields.length===1?' is-single':'')}>
  {row.fields.map(field=><div key={field.id} className={'map-field-cell field-span-'+Math.min(field.columnSpan||1,row.tracks)}>
   {renderField(field,block.fields.indexOf(field))}
   {!preview&&<button type="button" className="map-field-beside" aria-label={'Adicionar campo ao lado de '+(field.label||'sem nome')+' em '+block.title} title={canAddBeside(block,field.id)?'Adicionar um campo nesta linha':'Até quatro campos por linha. Adicione outra linha abaixo.'} disabled={!canAddBeside(block,field.id)} onClick={()=>onAddBeside(field.id)}><Plus size={16}/><span>Ao lado</span></button>}
  </div>)}
 </div>)}</div>;
}
