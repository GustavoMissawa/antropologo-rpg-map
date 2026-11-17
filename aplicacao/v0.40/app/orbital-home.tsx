'use client';

import {useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {CalendarDays, CirclePlus, FileText, Layers3, UserRound} from 'lucide-react';
import {countRules, type Rulebook, type Sheet} from '../lib/model';
import {SITE_VERSION} from '../lib/site-version';
import {OrbitalArt} from './orbital-art';

export type OrbitalHomeProps = {
  books: Rulebook[];
  sheets: Sheet[];
  onSystem: (id: string) => void;
  onAllSystems: () => void;
  onCreateSystem: () => void;
  onCreateCharacter: () => void;
  onOpenCharacter: (sheet: Sheet) => void;
  onAllCharacters: () => void;
  onPdfs: () => void;
  onAgenda: () => void;
};

const DESTINATIONS = [
  {id: 'systems', label: 'Sistemas', icon: Layers3, angle: -0.90, action: 'onAllSystems'},
  {id: 'sheets', label: 'Fichas', icon: UserRound, angle: -0.30, action: 'onAllCharacters'},
  {id: 'pdfs', label: 'PDFs', icon: FileText, angle: 0.31, action: 'onPdfs'},
  {id: 'agenda', label: 'Agenda', icon: CalendarDays, angle: 0.92, action: 'onAgenda'},
] as const;

type Destination = typeof DESTINATIONS[number]['id'];
type Point = {x: number; y: number};
type NodeInteraction = {
  pointer: Destination | null;
  focus: Destination | null;
  last: Destination | null;
};

function activeNode({pointer, focus, last}: NodeInteraction) {
  if (last && (last === pointer || last === focus)) return last;
  return focus ?? pointer;
}

function orbitPoint(angle: number): Point {
  return {x: 418 + 365 * Math.cos(angle), y: 510 + 425 * Math.sin(angle)};
}

function beamBetween(center: Point, target: Point, diskWidth: number) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (!distance) return '';
  const ux = dx / distance;
  const uy = dy / distance;
  const gap = Math.min(diskWidth * 0.166, distance * 0.48);
  const bend = Math.min(72, distance * 0.22);
  const start = {x: center.x + ux * gap, y: center.y + uy * gap};
  const first = {x: start.x + dx * 0.21 - uy * bend, y: start.y + dy * 0.21 + ux * bend};
  const second = {x: target.x - dx * 0.20 - uy * bend * 0.34, y: target.y - dy * 0.20 + ux * bend * 0.34};
  return `M ${start.x} ${start.y} C ${first.x} ${first.y} ${second.x} ${second.y} ${target.x} ${target.y}`;
}

function OrbitalScene(props: OrbitalHomeProps) {
  const scene = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<Partial<Record<Destination, string>>>({});
  const [interaction, setInteraction] = useState<NodeInteraction>({pointer: null, focus: null, last: null});
  const active = activeNode(interaction);
  const last = active ?? interaction.last;
  const path = last ? paths[last] : undefined;

  function interact(source: 'pointer' | 'focus', id: Destination | null) {
    setInteraction(previous => {
      const next = {...previous, [source]: id};
      return {...next, last: id ?? activeNode(next) ?? previous.last};
    });
  }

  useLayoutEffect(() => {
    const root = scene.current;
    const art = root?.querySelector('.orbital-art');
    if (!root || !art) return;

    const updateGeometry = () => {
      const rootRect = root.getBoundingClientRect();
      const artRect = art.getBoundingClientRect();
      const center = {
        x: artRect.left - rootRect.left + artRect.width / 2,
        y: artRect.top - rootRect.top + artRect.height / 2,
      };
      const next: Partial<Record<Destination, string>> = {};
      for (const {id} of DESTINATIONS) {
        const anchor = root.querySelector(`[data-orbital-anchor="${id}"]`);
        if (!anchor) continue;
        const target = anchor.getBoundingClientRect();
        next[id] = beamBetween(center, {
          x: target.left - rootRect.left + target.width / 2,
          y: target.top - rootRect.top + target.height / 2,
        }, artRect.width);
      }
      setPaths(next);
    };
    updateGeometry();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateGeometry);
    observer?.observe(root);
    observer?.observe(art);
    window.addEventListener('resize', updateGeometry, {passive: true});
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateGeometry);
    };
  }, []);

  const arcStart = orbitPoint(-1.50);
  const arcEnd = orbitPoint(1.52);

  return (
    <div ref={scene} className="orbital-scene">
      <OrbitalArt slowDie={active !== null} />
      <svg className="orbital-rail" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="orbit-rail-light" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className="orbital-rail-edge" stopOpacity="0" />
            <stop offset=".28" className="orbital-rail-warm" stopOpacity=".68" />
            <stop offset=".71" className="orbital-rail-cool" stopOpacity=".65" />
            <stop offset="1" className="orbital-rail-edge" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`M ${arcStart.x} ${arcStart.y} A 365 425 0 0 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke="url(#orbit-rail-light)"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <svg className="orbital-connection" aria-hidden="true" focusable="false" data-active={!!active && !!path}>
        {path && (
          <>
            <path d={path} className="orbital-connection-track" />
            <path d={path} className="orbital-connection-pulse" pathLength="1" />
          </>
        )}
      </svg>
      <nav className="orbital-navigation" aria-label="Navegação orbital">
        {DESTINATIONS.map(({id, label, icon: Icon, angle, action}) => {
          const point = orbitPoint(angle);
          return (
            <button
              key={id}
              type="button"
              className="orbital-node"
              data-active={active === id}
              style={{'--node-x': `${point.x / 10}%`, '--node-y': `${point.y / 10}%`} as CSSProperties}
              onPointerEnter={event => { if (event.pointerType !== 'touch') interact('pointer', id); }}
              onPointerLeave={() => interact('pointer', null)}
              onPointerCancel={() => interact('pointer', null)}
              onFocus={event => {
                if (event.currentTarget.matches(':focus-visible')) interact('focus', id);
              }}
              onBlur={() => interact('focus', null)}
              onClick={props[action]}
            >
              <span className="orbital-node-dot" data-orbital-anchor={id} aria-hidden="true" />
              <Icon className="orbital-node-icon" size={21} strokeWidth={1.6} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export function OrbitalHome(props: OrbitalHomeProps) {
  const {books, sheets, onSystem, onAllSystems, onCreateSystem, onCreateCharacter, onOpenCharacter, onAllCharacters} = props;
  return (
    <div className="orbital-home">
      <h1 className="orbital-visually-hidden">Início do ANTROPOLOGO RPG</h1>
      <OrbitalScene {...props} />
      <div className="orbital-workspace">
        <section className="orbital-list" aria-labelledby="orbital-systems-heading">
          <h2 id="orbital-systems-heading">Seus sistemas</h2>
          <ul>
            {books.slice(0, 3).map(book => {
              const topics = countRules(book.chapters);
              return (
                <li key={book.id}>
                  <button type="button" className="orbital-shortcut" aria-label={`Entrar no sistema ${book.name}`} onClick={() => onSystem(book.id)}>
                    <Layers3 size={20} strokeWidth={1.5} aria-hidden="true" />
                    <span><strong>{book.name}</strong><small>{topics} {topics === 1 ? 'tópico' : 'tópicos'}</small></span>
                  </button>
                </li>
              );
            })}
            {books.length > 3 && (
              <li><button type="button" className="orbital-shortcut" onClick={onAllSystems}><Layers3 size={20} aria-hidden="true" /><span>Ver todos os sistemas</span></button></li>
            )}
            <li><button type="button" className="orbital-shortcut" onClick={onCreateSystem}><CirclePlus size={20} strokeWidth={1.5} aria-hidden="true" /><span>Criar sistema</span></button></li>
          </ul>
        </section>
        <section className="orbital-list" aria-labelledby="orbital-characters-heading">
          <h2 id="orbital-characters-heading">Seus personagens</h2>
          <ul>
            <li>
              <button type="button" className="orbital-shortcut" aria-label="Ver suas fichas" onClick={onAllCharacters}>
                <UserRound size={20} strokeWidth={1.5} aria-hidden="true" />
                <span>{sheets.length} {sheets.length === 1 ? 'personagem' : 'personagens'}</span>
              </button>
            </li>
            {sheets.slice(0, 2).map(sheet => (
              <li key={sheet.id}>
                <button type="button" className="orbital-shortcut" aria-label={`Abrir ficha de ${sheet.name}`} onClick={() => onOpenCharacter(sheet)}>
                  <UserRound size={20} strokeWidth={1.5} aria-hidden="true" /><span>{sheet.name}</span>
                </button>
              </li>
            ))}
            <li><button type="button" className="orbital-shortcut" onClick={onCreateCharacter}><CirclePlus size={20} strokeWidth={1.5} aria-hidden="true" /><span>Criar personagem</span></button></li>
          </ul>
        </section>
        <p className="orbital-edition">v{SITE_VERSION} <span aria-hidden="true">·</span> Versão de teste</p>
      </div>
    </div>
  );
}
