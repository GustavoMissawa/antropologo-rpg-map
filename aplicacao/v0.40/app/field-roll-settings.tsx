'use client';
import { useState } from 'react';
import { Dices } from 'lucide-react';
import type { Field,FieldRoll,Sheet } from '../lib/model';
import { identifyRollPreset,presetFormula,type RollPreset } from '../lib/roll-editor';
import { defaultDieSides } from '../lib/dice-set';
import { RollFormula } from './roll-formula';

export function FieldRollSettings({sheet,fieldId,type,enabled,roll,onEnabled,onChange}:{sheet:Sheet;fieldId:string;type:Field['type'];enabled:boolean;roll:FieldRoll;onEnabled:(enabled:boolean)=>void;onChange:(roll:FieldRoll)=>void}){
 const sides=defaultDieSides(sheet.system?.dice),die='d'+sides;
 const [custom,setCustom]=useState(false),preset=custom?'custom':identifyRollPreset(roll.formula,type,sides),composite=type==='composite',comparison=type==='comparison';
 return <section className="field-roll-settings" aria-label="Rolagem deste campo"><label className="field-roll-toggle"><input type="checkbox" checked={enabled} onChange={e=>onEnabled(e.target.checked)}/><span><strong>Rolar ao clicar no Modo ficha</strong><small>Escolha qual valor entra no cálculo.</small></span><Dices size={21}/></label>{enabled&&<>
  <div className="field-roll-guide">{composite?<><p>Em um campo <strong>16 / +3</strong>, cada parte tem uma função:</p><div><span><code>{'1'+die+' + @modificador'}</code><small>Usa o +3 → <b>{'1'+die+' + 3'}</b></small></span><span><code>{'1'+die+' + @valor'}</code><small>Usa o 16 → <b>{'1'+die+' + 16'}</b></small></span></div></>:comparison?<><p>O atual e o máximo podem participar da fórmula separadamente:</p><div><span><code>@atual</code><small>O valor que muda durante o jogo.</small></span><span><code>@maximo</code><small>O máximo fixo ou vinculado.</small></span></div></>:<><p>Com valor <strong>3</strong>, você escolhe a função dele:</p><div><span><code>{'1'+die+' + @valor'}</code><small>Um dado + bônus → <b>{'1'+die+' + 3'}</b></small></span><span><code>{'(@valor)'+die}</code><small>Quantidade de dados → <b>{'3'+die}</b></small></span></div></>}</div>
  <label className="form-label">Como usar o valor<select aria-label="Como usar o valor" value={preset} onChange={e=>{const next=e.target.value as RollPreset;setCustom(next==='custom');if(next!=='custom')onChange({...roll,formula:presetFormula(next,sides),variables:[]});}}>
   {composite&&<option value="modifier">Somar o modificador a 1{die}</option>}
   {comparison?<><option value="current">Somar o atual a 1{die}</option><option value="maximum">Somar o máximo a 1{die}</option></>:<option value="bonus">{composite?'Somar o valor base a 1'+die:'Somar o valor a 1'+die}</option>}
   {comparison&&preset==='bonus'&&<option value="bonus">Somar o atual a 1{die} (@valor)</option>}
   <option value="pool">{composite?'Usar o valor base como quantidade de '+die:comparison?'Usar o atual como quantidade de '+die:'Usar o valor como quantidade de '+die}</option><option value="custom">Fórmula personalizada</option>
  </select></label>
  <RollFormula sheet={sheet} fieldId={fieldId} roll={roll} onChange={next=>{setCustom(true);onChange(next);}}/>
  <p className="field-help-copy">{composite?<><code>@valor</code> é o valor base; <code>@modificador</code> é a segunda parte, com o sinal. O modificador automático se atualiza quando a base muda.</>:comparison?<><code>@atual</code> (ou <code>@valor</code>) é o atual; <code>@maximo</code> é o máximo. Ex.: <code>@maximo - @atual</code> calcula quanto falta.</>:<><code>@valor</code> acompanha o valor atual deste campo.</>} Você pode combinar dados e outros campos. Quantidades de dados precisam ser inteiras, de 1 a 100.</p>
 </>}</section>;
}
