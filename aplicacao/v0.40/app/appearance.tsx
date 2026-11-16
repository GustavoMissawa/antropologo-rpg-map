'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Moon, Palette, RotateCcw, Sun, X } from 'lucide-react';
import { defaultAppearance, palettes, parseAppearance, paletteFaviconURL, type Appearance } from '../lib/appearance';

function AppearanceDialog({value,onChange,onClose,saveError}:{value:Appearance;onChange:(value:Appearance)=>void;onClose:()=>void;saveError:boolean}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="modal appearance-dialog" aria-labelledby="appearance-title" onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose();}}>
    <div className="modal-head"><div><span className="page-eyebrow">SEU UNIVERSO, SUAS CORES</span><h2 id="appearance-title">Aparência</h2></div><button className="icon-button" type="button" aria-label="Fechar aparência" onClick={onClose}><X size={20}/></button></div>
    <p className="modal-intro">Uma nova atmosfera para a sua aventura. As mudanças aparecem na hora.</p>
    <fieldset className="appearance-fieldset"><legend>Modo de exibição</legend><div className="mode-options">{([{id:'light',name:'Claro',Icon:Sun},{id:'dark',name:'Escuro',Icon:Moon}] as const).map(({id,name,Icon})=><label key={id} className={'mode-choice '+(value.mode===id?'chosen':'')}><input className="appearance-radio" type="radio" name="appearance-mode" value={id} checked={value.mode===id} onChange={()=>onChange({...value,mode:id})}/><span className={'mode-thumbnail '+id}><span/><i/><i/><i/></span><span className="mode-choice-caption"><Icon size={16}/>{name}{value.mode===id&&<Check size={15}/>}</span></label>)}</div></fieldset>
    <fieldset className="appearance-fieldset"><legend>Paleta principal <span>{palettes.find(p=>p.id===value.palette)?.name}</span></legend><div className="palette-options">{palettes.map(p=><label key={p.id} className={'palette-choice '+(value.palette===p.id?'chosen':'')}><input className="appearance-radio" type="radio" name="appearance-palette" value={p.id} checked={value.palette===p.id} onChange={()=>onChange({...value,palette:p.id})}/><span className="palette-swatch" style={{background:p.swatch,color:p.id==='silver'||p.id==='yellow'?'#26303c':'#fff'}}>{value.palette===p.id&&<Check size={17}/>}</span><span>{p.name}</span></label>)}</div><p className="appearance-hint">Prata traz tons claros e metálicos. Grafite usa um cinza profundo, distinto do preto.</p></fieldset>
    <div className="appearance-preview"><span className="appearance-preview-icon"><Palette size={20}/></span><div><strong>Sua próxima história, em novas cores.</strong><span>{value.mode==='light'?'Modo claro':'Modo escuro'} · {palettes.find(p=>p.id===value.palette)?.name}</span></div><span className="appearance-preview-dot"/></div>
    <p className={'appearance-save '+(saveError?'failed':'')} role="status">{saveError?'A aparência foi aplicada, mas este navegador não permitiu salvar a preferência.':'Sua preferência fica salva neste navegador.'}</p>
    <div className="modal-footer appearance-footer"><button className="button ghost" type="button" onClick={()=>onChange(defaultAppearance)}><RotateCcw size={14}/> Restaurar padrão</button><button className="button primary" type="button" onClick={onClose}>Pronto <Check size={15}/></button></div>
  </dialog>;
}

export function AppearanceControls() {
  const [value,setValue] = useState<Appearance>(defaultAppearance);
  const [open,setOpen] = useState(false);
  const [saveError,setSaveError] = useState(false);
  function apply(next:Appearance,save=true) {
    const safe=parseAppearance(next);
    document.documentElement.dataset.mode=safe.mode;
    document.documentElement.dataset.palette=safe.palette;
    const icon=document.getElementById('platform-favicon');
    if(icon)icon.setAttribute('href',paletteFaviconURL(safe.palette));
    setValue(safe);
    if(save)try{localStorage.setItem('ab10-appearance',JSON.stringify(safe));setSaveError(false);}catch{setSaveError(true);}
  }
  useEffect(()=>{
    try{apply(parseAppearance(JSON.parse(localStorage.getItem('ab10-appearance')||'null')),false);}catch{apply(defaultAppearance,false);}
    const sync=(event:StorageEvent)=>{if(event.key==='ab10-appearance'){try{apply(parseAppearance(JSON.parse(event.newValue||'null')),false);}catch{apply(defaultAppearance,false);}}};
    window.addEventListener('storage',sync);
    return ()=>window.removeEventListener('storage',sync);
  },[]);
  return <><div className="appearance-controls"><span className="header-language" lang="pt-BR" aria-label="Idioma: português" title="Português (Brasil)">PT</span><button type="button" className="appearance-trigger" aria-label="Personalizar aparência" aria-haspopup="dialog" title="Personalizar aparência" onClick={()=>setOpen(true)}><Palette size={17}/><span>Aparência</span></button></div>{open&&<AppearanceDialog value={value} onChange={apply} onClose={()=>setOpen(false)} saveError={saveError}/>}</>;
}
