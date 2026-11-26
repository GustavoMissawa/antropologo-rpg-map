'use client';

import { memo, useMemo, useRef, type MouseEvent, type RefObject } from 'react';
import { BookOpen, Orbit } from 'lucide-react';
import type { Rulebook } from '../lib/model';
import type { OrbitalView } from '../lib/orbital-camera';
import { arrangeOrbitTracks, lunarOrbit, moonMapLimit, planetMapLimit, solarOrbit, starMapRadius, type MapBody } from '../lib/orbital-layout';
import { platformHref, type PlatformJourney } from '../lib/platform-navigation';
import { createPlanetarySystem, visibleOrbitalBodies } from '../lib/orbital-system';
import type { PlanetaryArchitecture, Surface } from '../lib/planetary-architecture';
import { CelestialGlobe, SpaceStars } from './orbital-space';
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
const StarLayer = memo(function StarLayer({seed, count}: {seed: number; count: number}) {
  return <svg viewBox="0 0 1000 300" preserveAspectRatio="none" focusable="false">
    <SpaceStars seed={seed} amount={count} color="currentColor"/>
  </svg>;
});

export function OrbitalSystemScene({book, topicId, journey, view, headingRef, onTopic, onOverview, onRead}: {
  book: Rulebook; topicId?: string; journey: PlatformJourney | null; view: OrbitalView;
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
  const body = topic?.moon ?? topic?.planet;
  const arrival = journey?.from.page === 'home' && journey.to.page === 'rules' && journey.to.bookId === book.id;
  useOrbitalCamera({stage, svg, world, system, topic, topicId, planets, moons, view, arrival});

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
      <div className="orbital-system-stars" data-star-layer="far" aria-hidden="true"><StarLayer seed={system.star.seed} count={124}/></div>
      <div className="orbital-system-stars" data-star-layer="near" aria-hidden="true"><StarLayer seed={system.star.seed^0x941ca7d0} count={46}/></div>
      <svg ref={svg} className="orbital-world-svg" viewBox="0 0 980 560" role="group" aria-label="Corpos celestes">
        <g ref={world} transform="translate(490 291)">
          <g className="orbital-solar-tracks" aria-hidden="true">
            {planets.map(({body,orbit})=><ellipse key={body.id} rx={orbit.radius*solarOrbit.x} ry={orbit.radius*solarOrbit.y}
              data-current={body===topic?.planet} vectorEffect="non-scaling-stroke"/>)}
          </g>
          {topic && <g className="orbital-moon-tracks" data-moon-tracks={topic.planet.id} aria-hidden="true">
            {moons.map(({body,orbit})=><ellipse key={body.id} rx={orbit.radius*lunarOrbit.x} ry={orbit.radius*lunarOrbit.y}
              data-current={body===topic.moon} vectorEffect="non-scaling-stroke"/>)}
          </g>}
          <g className="orbital-map-star" aria-hidden="true"><Globe body={system.star} x={0} y={0} radius={starMapRadius(system.star)} detail/></g>
          {planets.map(destination)}
          {moons.map(destination)}
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
        {!topic&&system.planets.length>0&&<p>{architectureNotes[system.architecture]}</p>}
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
