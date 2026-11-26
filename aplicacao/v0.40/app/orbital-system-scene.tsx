'use client';

import { memo, useMemo, useRef, type MouseEvent, type RefObject } from 'react';
import { BookOpen, Orbit } from 'lucide-react';
import type { Rulebook } from '../lib/model';
import { lunarOrbit, solarOrbit, type OrbitalView } from '../lib/orbital-camera';
import { platformHref, type PlatformJourney } from '../lib/platform-navigation';
import { createPlanetarySystem, type CelestialBody, type OrbitalMoon, type OrbitalPlanet } from '../lib/orbital-system';
import { CelestialGlobe, SpaceStars } from './orbital-space';
import { useOrbitalCamera } from './use-orbital-camera';

const limitBodies = 16;
const limitMoons = 12;

function visibleBodies<T extends CelestialBody>(all: T[], limit: number, selected?: T) {
  const bodies = all.slice(0, limit);
  if (selected && !bodies.includes(selected)) bodies[bodies.length - 1] = selected;
  return bodies;
}

const Globe = memo(CelestialGlobe);
const StarLayer = memo(function StarLayer({seed, count}: {seed: number; count: number}) {
  return <svg viewBox="0 0 1000 300" preserveAspectRatio="none" focusable="false"><SpaceStars seed={seed} amount={count}/></svg>;
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
  const planets = useMemo(() => visibleBodies(system.planets,limitBodies,topic?.planet),[system,topic?.planet]);
  const moons = useMemo(() => visibleBodies(topic?.planet.moons ?? [],limitMoons,topic?.moon),[topic?.planet,topic?.moon]);
  const body = topic?.moon ?? topic?.planet;
  const arrival = journey?.from.page === 'home' && journey.to.page === 'rules' && journey.to.bookId === book.id;
  useOrbitalCamera({stage, svg, world, system, topic, topicId, planets, moons, view, arrival});

  function select(event: MouseEvent<Element>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onTopic(id);
  }
  const destination = (item: OrbitalPlanet | OrbitalMoon) => {
    const moon = 'planetId' in item;
    const r = item.appearance.size * (moon ? 45 : 47);
    const active = item === body;
    const local = !topic || topic.planet === item || moon;
    const title = item.title.length > 25 ? item.title.slice(0,24).trimEnd() + '…' : item.title;
    return <a key={item.id} className="orbital-world-body" href={platformHref({page:'rules',bookId:book.id,topicId:item.id,view:'orbit'})}
      data-world-body={item.id} data-body-kind={moon?'moon':'planet'} data-label-priority={active?'selected':local?'local':'remote'}
      aria-label={`${moon?'Lua':'Planeta'} ${item.title}`} aria-current={active?'location':undefined}
      tabIndex={view==='reading'?-1:0} onClick={event=>select(event,item.id)}>
      <title>{item.title}</title>
      <circle className="orbital-body-hit" r={r + (item.appearance.rings ? r * .38 : 3)} vectorEffect="non-scaling-stroke"/>
      <Globe body={item} x={0} y={0} radius={r} detail/>
      <circle className="orbital-body-outline" r={r+4} vectorEffect="non-scaling-stroke"/>
      <g data-world-label data-offset={r} data-label-width={title.length * 7.4} aria-hidden="true">
        <text textAnchor="middle" dominantBaseline="hanging">{title}</text>
      </g>
    </a>;
  };

  return <section className="orbital-system-scene" aria-label="Sistema planetário" aria-hidden={view==='reading'||undefined}
    inert={view==='reading'} data-scene-mode={view} data-celestial-body={body?.id} data-planet-count={system.planets.length}
    data-moon-count={topic?.planet.moons.length ?? system.topics.size - system.planets.length}>
    <div ref={stage} className="orbital-system-viewport">
      <div className="orbital-system-stars" data-star-layer="far" aria-hidden="true"><StarLayer seed={system.star.seed} count={124}/></div>
      <div className="orbital-system-stars" data-star-layer="near" aria-hidden="true"><StarLayer seed={system.star.seed^0x941ca7d0} count={46}/></div>
      <svg ref={svg} className="orbital-world-svg" viewBox="0 0 980 560" role="group" aria-label="Corpos celestes">
        <g ref={world} transform="translate(490 291)">
          <g className="orbital-solar-tracks" aria-hidden="true">
            {planets.map(planet=><ellipse key={planet.id} rx={planet.orbit.radius*solarOrbit.x} ry={planet.orbit.radius*solarOrbit.y}
              data-current={planet===topic?.planet} vectorEffect="non-scaling-stroke"/>)}
          </g>
          {topic && <g className="orbital-moon-tracks" data-moon-tracks={topic.planet.id} aria-hidden="true">
            {moons.map(moon=><ellipse key={moon.id} rx={moon.orbit.radius*lunarOrbit.x} ry={moon.orbit.radius*lunarOrbit.y}
              data-current={moon===topic.moon} vectorEffect="non-scaling-stroke"/>)}
          </g>}
          <g aria-hidden="true"><Globe body={system.star} x={0} y={0} radius={35*system.star.appearance.size} detail/></g>
          {planets.map(destination)}
          {moons.map(destination)}
        </g>
      </svg>
    </div>
    <div className="orbital-system-caption">
      <div aria-live="polite">
        <h2 ref={headingRef} tabIndex={-1}>{body?.title ?? 'Mapa planetário'}</h2>
        {topic&&<p>{topic.moon ? 'Lua de '+topic.planet.title : 'Planeta'}</p>}
        {!system.planets.length&&<p>Adicione um capítulo para criar o primeiro planeta.</p>}
      </div>
      {topic&&<button type="button" className="orbital-map-reset" onClick={onOverview}><Orbit size={17} aria-hidden="true"/> Visão do sistema</button>}
    </div>
    {topic&&<div className="orbital-map-actions">
      <button type="button" className="button primary" onClick={onRead}><BookOpen size={17} aria-hidden="true"/> Ler tópico</button>
    </div>}
  </section>;
}
