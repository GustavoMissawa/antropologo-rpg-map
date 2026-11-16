'use client';
import {useEffect,useState} from 'react';
import type {Rulebook} from '../lib/model';
import {themeMediaSource,type ThemeArea} from '../lib/system-visuals';
import {themeImageStyle,ThemeBackground} from './system-visual-editor';
export type SystemVisualState={expanded:boolean;visible:boolean;mobile:boolean;animate:boolean};
/** Existing compact/expanded assets follow header size, without changing saved themes. */
export function useSystemVisualState():SystemVisualState{
 const [state,setState]=useState<SystemVisualState>({expanded:true,visible:true,mobile:false,animate:false});
 useEffect(()=>{
  const narrow=matchMedia('(max-width:790px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  function update(){const saving=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData;const visible=document.visibilityState==='visible';const next={expanded:!narrow.matches,visible,mobile:narrow.matches,animate:visible&&!reduced.matches&&!saving};setState(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);}
  update();for(const media of [narrow,reduced])media.addEventListener('change',update);document.addEventListener('visibilitychange',update);
  return()=>{for(const media of [narrow,reduced])media.removeEventListener('change',update);document.removeEventListener('visibilitychange',update);};
 },[]);return state;
}
export function hasSystemIdentity(book:Rulebook|undefined){return !!book;}
export function SystemHeaderIdentity({book,state,onSwitch}:{book:Rulebook;state:SystemVisualState;onSwitch:()=>void}){
 const area:ThemeArea=state.mobile?'collapsedLogo':'expandedLogo',setting=book.visuals?.areas[area],src=themeMediaSource(book.visuals,area,state.animate),fallback=setting===undefined?book.logo:undefined;
 const [failedSource,setFailedSource]=useState<string>(),imageSource=src||fallback,showLogo=!!imageSource&&imageSource!==failedSource;
 return <button type="button" className={'header-system-identity'+(showLogo?' has-logo':'')} aria-label="Trocar sistema" aria-describedby="active-system-name" title={'Sistema ativo: '+book.name+' — Trocar sistema'} onClick={onSwitch}>
  {showLogo&&<img src={imageSource} alt="" style={setting?themeImageStyle(setting):undefined} onError={()=>setFailedSource(imageSource)}/>}
  <span id="active-system-name" className="header-system-name" aria-label={'Sistema selecionado: '+book.name}>{book.name}</span>
 </button>;
}
export function SystemHeaderBackground({book,state}:{book:Rulebook;state:SystemVisualState}){return <ThemeBackground theme={book.visuals} area={state.mobile?'collapsedBackground':'expandedBackground'} animate={state.animate} className="system-header-ambient"/>;}
export function SystemMainBackground({book,state}:{book:Rulebook;state:SystemVisualState}){return <ThemeBackground theme={book.visuals} area="mainBackground" animate={state.animate} className="system-main-ambient"/>;}
