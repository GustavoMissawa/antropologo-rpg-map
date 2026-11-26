'use client';

import { useState } from 'react';
import { ArrowUpRight, UserRound } from 'lucide-react';
import type { Sheet } from '../lib/model';

export function OrbitalCharacterRecord({sheet, onOpen}: {sheet: Sheet; onOpen: () => void}) {
  const [broken, setBroken] = useState<string>();
  const name = sheet.name || 'Sem nome';
  return <button type="button" className="orbital-character-record" aria-label={'Abrir ficha de ' + name} onClick={onOpen}>
    <span className="orbital-record-portrait" aria-hidden="true">
      {sheet.portrait && sheet.portrait !== broken
        ? <img src={sheet.portrait} alt="" loading="lazy" width="44" height="44" onError={() => setBroken(sheet.portrait)}/>
        : <UserRound size={22} strokeWidth={1.4}/>}
    </span>
    <span className="orbital-record-copy">
      <strong>{name}</strong>
      <span>{sheet.system?.name || 'Sem sistema vinculado'}</span>
    </span>
    <ArrowUpRight size={16} aria-hidden="true"/>
  </button>;
}
