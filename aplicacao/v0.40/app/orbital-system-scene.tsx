'use client';

import { memo, useEffect, useMemo, useRef, type MouseEvent, type RefObject } from 'react';
import { BookOpen, Orbit } from 'lucide-react';
import type { Rulebook } from '../lib/model';
import type { OrbitalView } from '../lib/orbital-camera';
import { arrangeOrbitTracks, asteroidBelt, lunarOrbit, moonMapLimit, planetMapLimit, solarOrbit, starMapRadius, type MapBody } from '../lib/orbital-layout';
import { platformHref } from '../lib/platform-navigation';
import { createPlanetarySystem, visibleOrbitalBodies } from '../lib/orbital-system';
import type { PlanetaryArchitecture, Surface } from '../lib/planetary-architecture';
import { centralProfiles } from '../lib/orbital-astronomy';
import type { SystemApproach } from '../lib/system-approach';
import { CelestialGlobe, SpaceStars } from './orbital-space';
import { OrbitalCentralBody } from './orbital-central-body';
import { useOrbitalCamera } from './use-orbital-camera';

const architectureNotes: Record<PlanetaryArchitecture, string> = {
  ordered: 'Ordenado · A massa tende a aumentar com a distância',
  'anti-ordered': 'Antiordenado · A massa tende a diminuir com a distância',
  mixed: 'Misto · Massas variadas ao longo das órbitas',
  similar: 'Semelhante · Massas próximas entre os planetas',
};
const surfaceLabels: Record<Surface, string> = {
  rocky: 'Rochoso', desert: 'Desértico', oceanic: 'Oceânico', volcanic: 'Vulcânico',
  icy: 'Gelado', 'gas-giant': 'Gigante gasoso', 'ice-giant': 'Gigante de gelo',
};
const formatQuantity = new Intl.NumberFormat('pt-BR', {maximumSignificantDigits: 3});

const Globe = memo(CelestialGlobe);
const Primary = memo(OrbitalCentralBody);
const StarLayer = memo(function StarLayer({seed, count}: {seed: number; count: number}) {
  return <svg viewBox="0 0 1000 300" preserveAspectRatio="none" focusable="false">
    <SpaceStars seed={seed} amount={count} color="currentColor"/>
  </svg>;
});

const Asteroids = memo(function Asteroids({belt}: {belt: NonNullable<ReturnType<typeof asteroidBelt>>}) {
  const paths = ['','',''];
  for (const {x,y,size,tone} of belt.particles) {
    const d = (n:number) => n.toFixed(1);
    paths[tone] += `M${d(x)} ${d(y-size)}l${d(size*.87)} ${d(size*.77)} ${d(-size*.52)} ${d(size*.85)} ${d(-size*1.08)} ${d(-size*.57)}Z`;
  }
  const tones = ['#ab8a71','#b9a8ab','#827d84'];
  return <g className="orbital-asteroid-belt" data-asteroid-count={belt.particles.length} stroke="none" opacity=".69">
    {paths.map((d,i)=><path key={i} d={d} fill={tones[i]}/>)}
  </g>;
});

export function OrbitalSystemScene({book, topicId, approachRef, view, headingRef, onTopic, onOverview, onRead}: {
  book: Rulebook; topicId?: string; approachRef: RefObject<SystemApproach | null>; view: OrbitalView;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onTopic: (id: string) => void; onOverview: () => void; onRead: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const world = useRef<SVGGElement>(null);
  const system = useMemo(() => createPlanetarySystem(book), [book]);
  const topic = topicId === undefined ? undefined : system.topics.get(topicId);
  const planets = useMemo(() => arrangeOrbitTracks(visibleOrbitalBodies(system.planets,planetMapLimit,topic?.planet), 'solar'),[system,topic?.planet]);
  const moons = useMemo(() => arrangeOrbitTracks(visibleOrbitalBodies(topic?.planet.moons ?? [],moonMapLimit,topic?.moon), 'lunar'),[topic?.planet,topic?.moon]);
  const belt = useMemo(() => topic ? null : asteroidBelt(system.star,planets),[topic,system.star,planets]);
  const centralLabel = centralProfiles[system.star.central.archetype].label;
  const body = topic?.moon ?? topic?.planet;
  useOrbitalCamera({stage, svg, world, system, topic, topicId, planets, moons, view, approachRef});

  useEffect(() => {
    if (!body || view !== 'focus') return;
    const viewport = stage.current;
    const sky = svg.current;
    if (!viewport || !sky) return;
    const isBackground = (target: EventTarget | null) => target === sky || target === viewport;
    const isPlainPress = (event: PointerEvent) =>
      event.button === 0 && event.isPrimary !== false && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
    let press: {id: number; x: number; y: number} | null = null;
    const cancel = () => { press = null; };
    const moved = (event: PointerEvent, start: NonNullable<typeof press>) =>
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8;
    const down = (event: PointerEvent) => {
      press = !press && isPlainPress(event) && isBackground(event.target)
        ? {id: event.pointerId, x: event.clientX, y: event.clientY} : null;
    };
    const move = (event: PointerEvent) => {
      if (press?.id === event.pointerId && moved(event, press)) cancel();
    };
    const up = (event: PointerEvent) => {
      if (!press || press.id !== event.pointerId) return;
      const start = press;
      cancel();
      // A touch can implicitly capture its target even after leaving the background.
      if (event.defaultPrevented || !isPlainPress(event) || moved(event, start) ||
        !isBackground(event.target) || document.querySelector('dialog[open]')) return;
      if (event.pointerType !== 'mouse' && typeof document.elementFromPoint === 'function' &&
        !isBackground(document.elementFromPoint(event.clientX, event.clientY))) return;
      onOverview();
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', cancel);
    };
  }, [body, view, onOverview]);

  function select(event: MouseEvent<Element>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onTopic(id);
  }
  const destination = ({body:item, radius:r}: MapBody) => {
    const moon = 'planetId' in item;
    const active = item === body;
    const host = topic?.planet === item;
    const title = item.title.length > 25 ? item.title.slice(0,24).trimEnd() + '…' : item.title;
    return <a key={item.id} className="orbital-world-body" href={platformHref({page:'rules',bookId:book.id,topicId:item.id,view:'orbit'})}
      data-world-body={item.id} data-body-kind={moon?'moon':'planet'} data-label-priority={active?'selected':host?'host':!topic||moon?'local':'remote'}
      aria-label={`${moon?'Lua':'Planeta'} ${item.title}`} aria-current={active?'location':undefined}
      tabIndex={view==='reading'?-1:0} onClick={event=>select(event,item.id)}>
      <title>{item.title}</title>
      <circle className="orbital-body-hit" r={r + (item.appearance.rings ? r * .38 : 3)} vectorEffect="non-scaling-stroke"/>
      <Globe body={item} x={0} y={0} radius={r} detail={active}/>
      <circle className="orbital-body-outline" r={r+4} vectorEffect="non-scaling-stroke"/>
      <g data-world-label data-label-width={title.length * 7.4} aria-hidden="true">
        <text textAnchor="middle" dominantBaseline="hanging">{title}</text>
      </g>
    </a>;
  };

  return <section className="orbital-system-scene" aria-label="Sistema planetário" aria-hidden={view==='reading'||undefined}
    inert={view==='reading'} data-scene-mode={view} data-has-local-orbits={moons.length>0} data-celestial-body={body?.id} data-architecture={system.architecture}
    data-planet-count={system.planets.length}
    data-moon-count={topic?.planet.moons.length ?? system.topics.size - system.planets.length}>
    <div ref={stage} className="orbital-system-viewport">
      <div className="orbital-system-sky" aria-hidden="true">
        <div className="orbital-system-stars" data-star-layer="far"><StarLayer seed={system.star.seed} count={124}/></div>
        <div className="orbital-system-stars" data-star-layer="near"><StarLayer seed={system.star.seed^0x941ca7d0} count={46}/></div>
      </div>
      <svg ref={svg} className="orbital-world-svg" viewBox="0 0 980 560" role="group" aria-label="Corpos celestes">
        <g ref={world} transform="translate(490 291)">
          <g className="orbital-solar-tracks" aria-hidden="true">
            {planets.map(({body,orbit})=><ellipse key={body.id} rx={orbit.radius*solarOrbit.x} ry={orbit.radius*solarOrbit.y}
              data-current={body===topic?.planet} vectorEffect="non-scaling-stroke"/>)}
            {belt&&<Asteroids belt={belt}/>}
          </g>
          {topic && <g className="orbital-moon-tracks" data-moon-tracks={topic.planet.id} aria-hidden="true">
            {moons.map(({body,orbit})=><ellipse key={body.id} rx={orbit.radius*lunarOrbit.x} ry={orbit.radius*lunarOrbit.y}
              data-current={body===topic.moon} vectorEffect="non-scaling-stroke"/>)}
          </g>}
          <g className="orbital-map-star" aria-hidden="true"><Primary body={system.star} radius={starMapRadius(system.star)}/></g>
          <g className="orbital-map-bodies">
            {planets.map(destination)}
            {moons.map(destination)}
          </g>
        </g>
      </svg>
    </div>
    <div className="orbital-system-caption">
      <div aria-live="polite">
        <h2 ref={headingRef} tabIndex={-1}>{body?.title ?? 'Mapa planetário'}</h2>
        {topic?.moon && <p>{'Lua de '+topic.planet.title} · {Math.round(topic.moon.physics.temperatureK)} K</p>}
        {topic&&!topic.moon&&<p>{surfaceLabels[topic.planet.physics.surface]} · {formatQuantity.format(topic.planet.physics.massEarth)}
          {' '}<abbr title="massa da Terra">M⊕</abbr> · {formatQuantity.format(topic.planet.physics.distanceAU)}
          {' '}<abbr title="unidade astronômica">UA</abbr> · {Math.round(topic.planet.physics.temperatureK)} K</p>}
        {!topic&&<p>{centralLabel}{system.planets.length>0&&' · '+architectureNotes[system.architecture]}</p>}
        {!topic && system.planets.length > planets.length && <p>{planets.length} de {system.planets.length} no mapa · todos no índice</p>}
        {topic && topic.planet.moons.length > moons.length && <p>{moons.length} de {topic.planet.moons.length} luas no mapa · todas no índice</p>}
        {!system.planets.length&&<p>Adicione um capítulo para criar o primeiro planeta.</p>}
      </div>
      {topic&&<button type="button" className="orbital-map-reset" onClick={onOverview}><Orbit size={17} aria-hidden="true"/> Visão do sistema</button>}
    </div>
    {topic&&<div className="orbital-map-actions">
      <button type="button" className="button primary" onClick={onRead}><BookOpen size={17} aria-hidden="true"/> Ler tópico</button>
    </div>}
  </section>;
}
