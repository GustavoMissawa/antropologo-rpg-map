import type {ReactNode} from 'react';
import {CalendarDays, Compass, FileText, Layers3, UserRound} from 'lucide-react';
import type {PlatformPage} from '../lib/platform-context';

const sectionIcons = {rules:Layers3, sheet:UserRound, pdfs:FileText, agenda:CalendarDays};

export function WorkspaceTrail({section, onMap, onSection}: {
  section: string;
  onMap: () => void;
  onSection: () => void;
}) {
  return <nav className="orbital-workspace-trail" aria-label="Localização na plataforma">
    <button type="button" onClick={onMap}><Compass size={15} aria-hidden="true"/> Mapa orbital</button>
    <span className="workspace-trail-line" aria-hidden="true"/>
    <button type="button" onClick={onSection}>{section}</button>
  </nav>;
}

export function WorkspaceHeading({area, title, description, actions}: {
  area: Exclude<PlatformPage, 'home'>;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  const Icon=sectionIcons[area];
  return <header className="orbital-workspace-heading">
    <span className="orbital-heading-icon"><Icon size={24} strokeWidth={1.55} aria-hidden="true"/></span>
    <div className="orbital-heading-copy">
      <h1>{title}</h1>
      {description&&<p>{description}</p>}
    </div>
    {actions&&<div className="orbital-heading-actions">{actions}</div>}
  </header>;
}
