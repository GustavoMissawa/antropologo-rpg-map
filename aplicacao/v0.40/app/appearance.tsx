'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Info, Moon, Palette, RotateCcw, Settings, Sun, X } from 'lucide-react';
import { applyOrbitalColors, defaultAppearance, palettes, secondaryPalettes, recommendedSecondary, parseAppearance, paletteFaviconURL, type Appearance } from '../lib/appearance';
import { SITE_RELEASE } from '../lib/site-version';

const settingsSections = [
  { id: 'appearance', label: 'Aparência', Icon: Palette },
  { id: 'about', label: 'Sobre', Icon: Info },
] as const;

type SettingsSection = (typeof settingsSections)[number]['id'];
type AppearancePreferencesProps = {
  value: Appearance;
  onChange: (value: Appearance) => void;
  saveError: boolean;
};

function PaletteChoices<Id extends string>({name, options, value, onSelect}: {
  name: string;
  options: readonly {id: Id; name: string; swatch: string}[];
  value: Id;
  onSelect: (id: Id) => void;
}) {
  return <div className="palette-options">
    {options.map(({id, name: label, swatch}) => {
      const selected = id === value;
      return <label key={id} className={'palette-choice ' + (selected ? 'chosen' : '')}>
        <input className="appearance-radio" type="radio" name={name} value={id} checked={selected} onChange={() => onSelect(id)}/>
        <span className="palette-swatch" style={{backgroundColor: swatch}} aria-hidden="true"/>
        <span>{label}</span>
        {selected && <Check className="palette-check" size={14} aria-hidden="true"/>}
      </label>;
    })}
  </div>;
}

function AppearancePreferences({value,onChange,saveError}: AppearancePreferencesProps) {
  const hintId = useId();
  const nebulaHintId = useId();
  const recommended = recommendedSecondary[value.palette];
  const secondary = value.secondaryPalette ?? recommended;
  const recommendation = secondaryPalettes.find(option => option.id === recommended)?.name;
  return <>
    <fieldset className="appearance-fieldset">
      <legend>Modo de exibição</legend>
      <div className="mode-options">
        {([{id: 'light', name: 'Claro', Icon: Sun}, {id: 'dark', name: 'Escuro', Icon: Moon}] as const).map(({id, name, Icon}) =>
          <label key={id} className={'mode-choice ' + (value.mode === id ? 'chosen' : '')}>
            <input className="appearance-radio" type="radio" name="appearance-mode" value={id} checked={value.mode === id} onChange={() => onChange({...value, mode: id})}/>
            <span className={'mode-thumbnail ' + id} aria-hidden="true"><span/></span>
            <span className="mode-choice-caption"><Icon size={16} aria-hidden="true"/>{name}{value.mode === id && <Check size={15} aria-hidden="true"/>}</span>
          </label>
        )}
      </div>
    </fieldset>
    <fieldset className="appearance-fieldset">
      <legend>Paleta primária</legend>
      <PaletteChoices name="appearance-palette" options={palettes} value={value.palette} onSelect={palette => onChange({...value, palette, secondaryPalette: undefined})}/>
    </fieldset>
    <fieldset className="appearance-fieldset appearance-secondaries" aria-describedby={hintId}>
      <legend>Paleta secundária</legend>
      <PaletteChoices name="appearance-secondary" options={secondaryPalettes} value={secondary} onSelect={secondaryPalette => onChange({...value, secondaryPalette})}/>
      <p className="appearance-hint" id={hintId}>{recommendation} é a combinação recomendada para a primária atual. Trocar a primária redefine a secundária.</p>
    </fieldset>
    <label className="appearance-effect">
      <span>
        <strong>Nebulosas cósmicas</strong>
        <small id={nebulaHintId}>Exibe formações de gás e poeira estelar ao redor da Home Orbital.</small>
      </span>
      <input className="appearance-effect-toggle" type="checkbox" role="switch" aria-label="Nebulosas cósmicas" aria-describedby={nebulaHintId} checked={value.nebulae} onChange={event => onChange({...value, nebulae: event.currentTarget.checked})}/>
    </label>
    <p className={'appearance-save '+(saveError?'failed':'')} role="status">{saveError?'A aparência foi aplicada, mas este navegador não permitiu salvar a preferência.':'Sua preferência fica salva neste navegador.'}</p>
  </>;
}

function SettingsDialog({ value, onChange, onClose, saveError }: AppearancePreferencesProps & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const tabRefs = useRef<Partial<Record<SettingsSection, HTMLButtonElement | null>>>({});
  const [section, setSection] = useState<SettingsSection>('appearance');
  const id = useId();

  useEffect(() => { dialog.current?.showModal(); }, []);

  function close() {
    dialog.current?.close();
    onClose();
  }

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>) {
    let next: SettingsSection;
    switch (event.key) {
      case 'Home':
        next = 'appearance';
        break;
      case 'End':
        next = 'about';
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        next = section === 'appearance' ? 'about' : 'appearance';
        break;
      default:
        return;
    }
    event.preventDefault();
    setSection(next);
    tabRefs.current[next]?.focus();
  }

  return <dialog
    ref={dialog}
    className="modal appearance-dialog"
    aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === dialog.current) close(); }}
  >
    <div className="modal-head">
      <h2 id={`${id}-title`}>Configurações</h2>
      <button className="icon-button settings-close" type="button" aria-label="Fechar configurações" onClick={close}><X size={20}/></button>
    </div>
    <div className="context-help-tabs settings-tabs" role="tablist" aria-label="Seções das configurações">
      {settingsSections.map(({ id: key, label, Icon }) => <button
        key={key}
        ref={element => { tabRefs.current[key] = element; }}
        type="button"
        role="tab"
        id={`${id}-tab-${key}`}
        aria-controls={`${id}-panel-${key}`}
        aria-selected={section === key}
        tabIndex={section === key ? 0 : -1}
        onClick={() => setSection(key)}
        onKeyDown={navigateTabs}
      ><Icon size={16} aria-hidden="true"/>{label}</button>)}
    </div>
    <section id={`${id}-panel-appearance`} role="tabpanel" aria-labelledby={`${id}-tab-appearance`} hidden={section !== 'appearance'}>
      <AppearancePreferences value={value} onChange={onChange} saveError={saveError}/>
    </section>
    <section id={`${id}-panel-about`} role="tabpanel" aria-labelledby={`${id}-tab-about`} hidden={section !== 'about'} tabIndex={0}>
      <h3 className="settings-about-title">Sobre o ANTROPOLOGO RPG</h3>
      <dl className="settings-release">
        <div className="settings-release-version">
          <dt>Versão atual</dt>
          <dd>{SITE_RELEASE.version}</dd>
        </div>
        <div>
          <dt>Estágio</dt>
          <dd>{SITE_RELEASE.stage}</dd>
        </div>
        <div>
          <dt>Identificação da versão</dt>
          <dd>{SITE_RELEASE.name}</dd>
        </div>
        {SITE_RELEASE.commit && <div className="settings-release-build">
          <dt>Commit</dt>
          <dd><code>{SITE_RELEASE.commit}</code></dd>
        </div>}
      </dl>
      <section className="settings-history" aria-labelledby={`${id}-history`}>
        <h4 id={`${id}-history`}>Histórico de atualizações</h4>
        <p>As notas de versão serão exibidas aqui.</p>
      </section>
    </section>
    <div className="modal-footer appearance-footer">
      {section === 'appearance' && <button className="button ghost" type="button" title="Voltar para Claro, Floresta e Dourado" onClick={() => onChange(defaultAppearance)}><RotateCcw size={14} aria-hidden="true"/> Restaurar aparência padrão</button>}
      <button className="button primary" type="button" onClick={close}>Pronto <Check size={15}/></button>
    </div>
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
    document.documentElement.dataset.nebulae=String(safe.nebulae);
    applyOrbitalColors(document.documentElement, safe);
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
  return <>
    <div className="appearance-controls">
      <span className="header-language" lang="pt-BR" aria-label="Idioma: português" title="Português (Brasil)">PT</span>
      <button type="button" className="appearance-trigger" aria-label="Configurações" aria-haspopup="dialog" title="Configurações" onClick={()=>setOpen(true)}><Settings size={17} aria-hidden="true"/><span>Configurações</span></button>
    </div>
    {open && <SettingsDialog value={value} onChange={apply} onClose={()=>setOpen(false)} saveError={saveError}/>}
  </>;
}
