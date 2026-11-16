'use client';
import { useEffect,useState } from 'react';
import { Dices,Minus,Pencil,Plus } from 'lucide-react';
import type { Field } from '../lib/model';
import type { createFieldResolver } from '../lib/sheet-engine';
import type { useFieldDetails } from './field-details';

function CurrentValue({field,onChange}:{field:Field;onChange:(value:Field['value'])=>void}){
 const [draft,setDraft]=useState(String(field.value));useEffect(()=>setDraft(String(field.value)),[field.value]);
 return <input id={'map-field-'+field.id} aria-label={field.label+' · atual'} type="number" inputMode="decimal" step="any" min={-1e12} max={1e12} value={draft} onChange={e=>{const text=e.target.value;setDraft(text);const value=Number(text);if(text!==''&&Number.isFinite(value)&&Math.abs(value)<=1e12)onChange(value);}} onBlur={()=>{if(draft===''||!Number.isFinite(Number(draft))||Math.abs(Number(draft))>1e12)setDraft(String(field.value));}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){e.preventDefault();setDraft(String(field.value));}}}/>;
}
export function ComparisonField({field,preview,resolve,onChange,onEdit,onRoll,rolling,editLabel,formula,details}:{field:Field;preview:boolean;resolve:ReturnType<typeof createFieldResolver>;onChange:(value:Field['value'])=>void;onEdit:()=>void;onRoll:()=>void;rolling:boolean;editLabel:string;formula:string;details:ReturnType<typeof useFieldDetails>}){
 const current=resolve(field.id),maximum=resolve(field.id,'maximum'),error=current.error||maximum.error;
 const state=current.value!==null&&maximum.value!==null?(current.value<0?'Abaixo de zero':current.value>maximum.value?'Acima do máximo':null):null;
 return <><div {...details.events} role="group" aria-label={'Campo '+field.label} tabIndex={details.active?0:undefined} className={'map-field map-comparison-field '+(error?'field-has-error ':'')+(details.active?'has-field-details':'')}>
  <div className="comparison-heading"><label htmlFor={'map-field-'+field.id}><span className="map-field-type" aria-hidden="true">↔</span><strong>{field.label||'Sem nome'}</strong></label>{!preview&&<button className="icon-button" type="button" aria-label={editLabel} onClick={onEdit}><Pencil size={15}/></button>}</div>
  <div className="comparison-values"><div className="comparison-current"><span>Atual</span><div className="comparison-current-controls"><button type="button" aria-label={'Diminuir '+field.label+' atual'} disabled={current.value===null||current.value<=-1e12} onClick={()=>{if(current.value!==null)onChange(current.value-1);}}><Minus size={15}/></button><CurrentValue field={field} onChange={onChange}/><button type="button" aria-label={'Aumentar '+field.label+' atual'} disabled={current.value===null||current.value>=1e12} onClick={()=>{if(current.value!==null)onChange(current.value+1);}}><Plus size={15}/></button></div></div><span className="comparison-slash" aria-hidden="true">/</span><div className="comparison-maximum"><span>Máximo</span><output aria-label={field.label+' · máximo'}>{maximum.value??'—'}</output></div></div>
  {state&&<small className="comparison-state" role="status">{state}</small>}
  {field.comparison?.dependency&&<small className="map-field-link">ƒ Máximo vinculado · acompanha o campo de origem</small>}
  {preview&&field.roll&&<button type="button" className="comparison-roll" aria-label={'Rolar '+field.label} disabled={rolling} onClick={onRoll}><Dices size={18}/><span>Rolar <code>{formula}</code></span></button>}
  {!preview&&field.roll&&<small className="map-field-link field-roll-configured"><Dices size={13}/> No Modo ficha: {formula}</small>}
  {error&&<small className="map-field-error" role="status">{error}</small>}
 </div>{details.panel}</>;
}
