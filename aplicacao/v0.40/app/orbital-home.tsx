'use client';

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {ArrowLeft, ArrowUpRight, CalendarDays, CirclePlus, FileText, Layers3, UserRound} from 'lucide-react';
import {countRules, type Rulebook, type Sheet, type PDF} from '../lib/model';
import {OrbitalArt} from './orbital-art';
import {OrbitalBackdrop} from './orbital-backdrop';
import {orbitalConnection} from '../lib/orbital-connection';
import {orbitalHref, type OrbitalDestination} from '../lib/orbital-navigation';
import {useOrbitalNavigation} from './use-orbital-navigation';

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
  pdfs?: PDF[];
  pdfLoading?: boolean;
  pdfError?: string;
  onAddPdf?: () => void;
};

const DESTINATIONS = [
  {id: 'systems', label: 'Sistemas', icon: Layers3, angle: -0.90, action: 'onAllSystems'},
  {id: 'sheets', label: 'Fichas', icon: UserRound, angle: -0.30, action: 'onAllCharacters'},
  {id: 'pdfs', label: 'PDFs', icon: FileText, angle: 0.31, action: 'onPdfs'},
  {id: 'agenda', label: 'Agenda', icon: CalendarDays, angle: 0.92, action: 'onAgenda'},
] as const;

type Destination = OrbitalDestination;
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

function OrbitalScene({destination, phase, onSelect}: {destination: Destination | null; phase: string; onSelect: (id: Destination) => void}) {
  const scene = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{center: Point; width: number; targets: Partial<Record<Destination, Point>>}>();
  const [beam, setBeam] = useState<(ReturnType<typeof orbitalConnection> & {id: Destination; activation: number}) | null>(null);
  const [beamVisible, setBeamVisible] = useState(false);
  const activation = useRef<{id: Destination | null; count: number; displayed: Destination | null}>({id: null, count: 0, displayed: null});
  const [interaction, setInteraction] = useState<NodeInteraction>({pointer: null, focus: null, last: null});
  const selected = destination;
  const active = selected ?? activeNode(interaction);

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
      // A camera transform affects both rects; convert back to scene coordinates.
      const scale = root.offsetWidth ? rootRect.width / root.offsetWidth : 1;
      const center = {
        x: (artRect.left - rootRect.left + artRect.width / 2) / scale,
        y: (artRect.top - rootRect.top + artRect.height / 2) / scale,
      };
      const targets: Partial<Record<Destination, Point>> = {};
      for (const {id} of DESTINATIONS) {
        const anchor = root.querySelector(`[data-orbital-anchor="${id}"]`);
        if (!anchor) continue;
        const target = anchor.getBoundingClientRect();
        targets[id] = {
          x: (target.left - rootRect.left + target.width / 2) / scale,
          y: (target.top - rootRect.top + target.height / 2) / scale,
        };
      }
      setLayout({center, width: artRect.width / scale, targets});
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

  useLayoutEffect(() => {
    const state = activation.current;
    if (!active || !layout?.targets[active]) {
      state.id = null;
      setBeamVisible(false);
      return;
    }
    const fresh = state.id !== active;
    if (fresh) {
      state.id = active;
      state.count++;
    }
    const next = {...orbitalConnection(layout.center, layout.targets[active], layout.width, state.count), id: active, activation: state.count};
    const show = () => {
      state.displayed = active;
      setBeam(next);
      setBeamVisible(true);
    };
    if ((!fresh && state.displayed === active) || !state.displayed || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      show();
      return;
    }
    setBeamVisible(false);
    const timer = setTimeout(show, 120);
    return () => clearTimeout(timer);
  }, [active, layout]);

  const arcStart = orbitPoint(-1.50);
  const arcEnd = orbitPoint(1.52);

  return (
    <div ref={scene} className="orbital-scene" data-observing={active !== null}>
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
      <svg className="orbital-connection" aria-hidden="true" focusable="false" data-active={beamVisible} data-selecting={(phase === 'entering' || phase === 'switching') && beam?.id === selected && beamVisible} data-destination={beam?.id}>
        <defs>
          <radialGradient id="orbit-source-halo">
            <stop offset="0" className="orbital-source-light" stopOpacity=".85" />
            <stop offset=".24" className="orbital-source-light" stopOpacity=".38" />
            <stop offset="1" className="orbital-source-light" stopOpacity="0" />
          </radialGradient>
        </defs>
        {beam && (
          <g key={beam.activation} className="orbital-connection-shape">
            <path d={beam.path} className="orbital-connection-track" pathLength="1" />
            <path d={beam.path} className="orbital-connection-pulse" pathLength="1" />
            <g className="orbital-source-star" transform={`translate(${beam.origin.x} ${beam.origin.y})`}>
              <circle r="19" fill="url(#orbit-source-halo)" className="orbital-source-halo" />
              <g className="orbital-source-flare">
                <path d="M -8 0 L -1.8 -1.2 L 0 -6 L 1.8 -1.2 L 8 0 L 1.8 1.2 L 0 6 L -1.8 1.2 Z" />
                <circle r="1.5" />
              </g>
            </g>
          </g>
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
              data-selected={selected === id}
              aria-expanded={selected === id}
              aria-controls="orbital-destination-panel"
              aria-hidden={!!selected && selected !== id || undefined}
              tabIndex={selected && selected !== id ? -1 : undefined}
              style={{'--node-x': `${point.x / 10}%`, '--node-y': `${point.y / 10}%`} as CSSProperties}
              onPointerEnter={event => { if (event.pointerType !== 'touch') interact('pointer', id); }}
              onPointerLeave={() => interact('pointer', null)}
              onPointerCancel={() => interact('pointer', null)}
              onFocus={event => {
                if (event.currentTarget.matches(':focus-visible')) interact('focus', id);
              }}
              onBlur={() => interact('focus', null)}
              onClick={() => onSelect(id)}
            >
              <span className="orbital-node-dot" data-orbital-anchor={id} aria-hidden="true">
                <span className="orbital-star-ring" />
                <span className="orbital-star-glint" />
              </span>
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
  const navigation = useOrbitalNavigation();
  const root = useRef<HTMLDivElement>(null);
  const lastDestination = useRef<Destination | null>(null);
  const expanded = navigation.destination !== null && navigation.phase !== 'returning';
  useEffect(() => {
    if (navigation.destination) lastDestination.current = navigation.destination;
    if (navigation.phase === 'destination' && !document.querySelector('dialog[open]') && !document.activeElement?.matches('.orbital-d20-control')) root.current?.querySelector<HTMLElement>('#orbital-destination-title')?.focus({preventScroll: true});
    if (navigation.phase === 'exploration' && lastDestination.current) {
      if (!document.querySelector('dialog[open]')) root.current?.querySelector<HTMLElement>(`[data-orbital-anchor="${lastDestination.current}"]`)?.closest('button')?.focus({preventScroll: true});
      lastDestination.current = null;
    }
  }, [navigation.phase, navigation.destination]);
  useEffect(() => {
    if (!expanded) return;
    let press: {id: number; x: number; y: number} | null = null;
    const outside = (target: EventTarget | null) => target instanceof Element && !target.closest(
      '.orbital-destination-panel, .orbital-d20-control, .topbar, dialog, button, a, input, select, textarea, [role="button"], [contenteditable="true"]'
    );
    const down = (event: PointerEvent) => {
      press = event.button === 0 && event.isPrimary !== false && outside(event.target)
        ? {id: event.pointerId, x: event.clientX, y: event.clientY} : null;
    };
    const cancel = () => {press = null;};
    const up = (event: PointerEvent) => {
      const start = press; press = null;
      if (start && start.id === event.pointerId && !event.defaultPrevented && outside(event.target)
        && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 8
        && !document.querySelector('dialog[open]')) navigation.select(null);
    };
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    return () => {
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
    };
  }, [expanded, navigation.select]);
  return (
    <div ref={root} className="orbital-home" data-phase={navigation.phase} data-destination={navigation.destination ?? undefined} data-expanded={expanded} onKeyDown={event => {
      if (event.key === 'Escape' && navigation.destination && !event.defaultPrevented && !document.querySelector('dialog[open]')) {
        event.preventDefault(); navigation.select(null);
      }
    }}>
      <OrbitalBackdrop />
      <h1 className="orbital-visually-hidden">Início do ANTROPOLOGO RPG</h1>
      <OrbitalScene destination={expanded ? navigation.destination : null} phase={navigation.phase} onSelect={navigation.select} />
      {navigation.destination && <OrbitalDestinationPanel {...props} destination={navigation.destination} ready={navigation.phase === 'destination'} returning={navigation.phase === 'returning'} onSelect={navigation.select} onReturn={() => navigation.select(null)} />}
      <div className="orbital-workspace" inert={navigation.phase !== 'exploration'} aria-hidden={navigation.phase !== 'exploration' || undefined}>
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
      </div>
    </div>
  );
}


function OrbitalDestinationPanel(props: OrbitalHomeProps & {destination: Destination; ready: boolean; returning: boolean; onSelect: (id: Destination) => void; onReturn: () => void}) {
  const {destination, ready, books, sheets, pdfs = []} = props;
  const current = DESTINATIONS.find(item => item.id === destination)!;
  const Icon = current.icon;
  return <section className="orbital-destination-panel" id="orbital-destination-panel" inert={props.returning} aria-hidden={props.returning || undefined} aria-label={`Destino ${current.label}`}>
    <button type="button" className="orbital-map-return" onClick={props.onReturn}><ArrowLeft size={16} aria-hidden="true" /> Voltar ao mapa orbital</button>
    <nav className="orbital-destination-switcher" aria-label="Trocar destino">
      {DESTINATIONS.map(item => <a key={item.id} href={orbitalHref(item.id)} aria-current={item.id === destination ? 'location' : undefined} onClick={event => {
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {event.preventDefault(); props.onSelect(item.id);}
      }}>{item.label}</a>)}
    </nav>
    <div className="orbital-destination-content" data-ready={ready} inert={!ready} aria-hidden={!ready || undefined}>
      <h2 tabIndex={-1} id="orbital-destination-title"><Icon size={26} strokeWidth={1.4} aria-hidden="true" />{current.label}</h2>
      {destination === 'systems' && <>
        <p>Escolha o universo da sua próxima história.</p>
        <ul>{books.map(book => <li key={book.id}><button className="orbital-context-item" onClick={() => props.onSystem(book.id)}><Layers3 size={19} aria-hidden="true" /><span><strong>{book.name}</strong><small>{countRules(book.chapters)} tópicos</small></span><ArrowUpRight size={17} aria-hidden="true" /></button></li>)}</ul>
        <button className="orbital-context-action" onClick={props.onCreateSystem}><CirclePlus size={18} aria-hidden="true" />Criar sistema</button>
        <button className="orbital-context-action" onClick={props.onAllSystems}>Ver todos os sistemas<ArrowUpRight size={16} aria-hidden="true" /></button>
      </>}
      {destination === 'sheets' && <>
        <p>{sheets.length ? 'Personagens disponíveis nesta sessão.' : 'Sua próxima história começa com um personagem.'}</p>
        <ul>{sheets.map(sheet => <li key={sheet.id}><button className="orbital-context-item" onClick={() => props.onOpenCharacter(sheet)}><UserRound size={19} aria-hidden="true" /><span><strong>{sheet.name || 'Sem nome'}</strong><small>{sheet.system?.name || 'Sem sistema vinculado'}</small></span><ArrowUpRight size={17} aria-hidden="true" /></button></li>)}</ul>
        {!sheets.length && <p className="orbital-context-empty">Nenhuma ficha aberta nesta página.</p>}
        <button className="orbital-context-action" onClick={props.onCreateCharacter}><CirclePlus size={18} aria-hidden="true" />Criar personagem</button>
        <button className="orbital-context-action" onClick={props.onAllCharacters}>Ver todas as fichas<ArrowUpRight size={16} aria-hidden="true" /></button>
      </>}
      {destination === 'pdfs' && <>
        <p>Seus manuais, aventuras e referências.</p>
        {props.pdfLoading && !pdfs.length ? <p role="status">Carregando biblioteca…</p> : props.pdfError ? <p role="status">{props.pdfError}</p> : !pdfs.length ? <p className="orbital-context-empty">Nenhum PDF disponível nesta página.</p> : null}
        <ul>{pdfs.map(pdf => <li key={pdf.id}><a className="orbital-context-item" href={pdf.url} target="_blank" rel="noreferrer"><FileText size={19} aria-hidden="true" /><span><strong>{pdf.title}</strong><small>{pdf.category}</small></span><ArrowUpRight size={17} aria-hidden="true" /></a></li>)}</ul>
        {props.onAddPdf && <button className="orbital-context-action" onClick={props.onAddPdf}><CirclePlus size={18} aria-hidden="true" />Adicionar PDF</button>}
        <button className="orbital-context-action" onClick={props.onPdfs}>Abrir biblioteca de PDFs<ArrowUpRight size={16} aria-hidden="true" /></button>
      </>}
      {destination === 'agenda' && <>
        <p>Um lugar para a sua mesa se encontrar.</p>
        <ul className="orbital-agenda-summary"><li><CalendarDays size={19} aria-hidden="true" /><span>Sessões únicas e recorrentes</span></li><li><UserRound size={19} aria-hidden="true" /><span>Sua agenda vinculada à conta de teste</span></li></ul>
        <p className="orbital-context-empty">Consulte as sessões e organize os próximos encontros na Agenda.</p>
        <button className="orbital-context-action" onClick={props.onAgenda}>Abrir Agenda<ArrowUpRight size={16} aria-hidden="true" /></button>
      </>}
    </div>
  </section>;
}
