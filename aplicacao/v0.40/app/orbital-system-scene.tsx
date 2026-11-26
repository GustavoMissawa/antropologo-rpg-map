'use client';

import { memo, useMemo, useRef, type MouseEvent } from 'react';
import { ArrowDown, Orbit } from 'lucide-react';
import type { Rulebook } from '../lib/model';
import { platformHref, type PlatformJourney, type PlatformRoute } from '../lib/platform-navigation';
import {
  createPlanetarySystem, planetaryLocation, planOrbitalFlight, pointOnOrbit, spaceOrigin,
  type CelestialBody, type OrbitalTopic, type PlanetarySystem,
} from '../lib/orbital-system';
import { CelestialGlobe, OrbitalSpace, SpaceStars } from './orbital-space';

const visualBodyLimit = 16;
const solarTrack = { x: 424, y: 126 };

function visibleBodies<T extends CelestialBody>(bodies: T[], selected?: T) {
  const visible = bodies.slice(0, visualBodyLimit);
  if (selected && !visible.includes(selected)) visible[visible.length - 1] = selected;
  return visible;
}

const SystemSky = memo(function SystemSky({system, topic}: {system: PlanetarySystem; topic?: OrbitalTopic}) {
  const {star, planets} = system;
  const planet = topic?.planet;
  const moon = topic?.moon;
  const x = planet ? 537 : 500;
  const y = 150;
  const orbits = planet ? visibleBodies(planet.moons, moon) : visibleBodies(planets);
  const trackWidth = planet ? 214 : solarTrack.x;
  const trackHeight = planet ? 105 : solarTrack.y;
  return <svg className="orbital-space-view" viewBox="0 0 1000 300" preserveAspectRatio={planet ? 'xMidYMid slice' : 'xMidYMid meet'} focusable="false">
    <SpaceStars seed={star.seed}/>
    <g fill="none" stroke="#a4b6d6" strokeWidth=".8">
      {orbits.map(body => <ellipse key={body.id} cx={x} cy={y} rx={trackWidth * body.orbit.radius}
        ry={trackHeight * body.orbit.radius} opacity={body === moon ? .65 : .23}/>)}
    </g>
    {planet
      ? <CelestialGlobe body={planet} x={x} y={y} radius={69 * planet.appearance.size + 19} detail/>
      : <CelestialGlobe body={star} x={x} y={y} radius={star.appearance.size * 23} detail/>}
    {orbits.map(body => {
      const point = pointOnOrbit(body.orbit);
      return <CelestialGlobe key={body.id} body={body} x={x + point.x * trackWidth} y={y + point.y * trackHeight}
        radius={body.appearance.size * (planet ? 39 : 29) + (body === moon ? 7 : 0)} detail={body === moon}/>;
    })}
  </svg>;
});

export function OrbitalSystemScene({book, books, topicId, journey, onTopic, onOverview, onRead}: {
  book: Rulebook; books: Rulebook[]; topicId?: string; journey: PlatformJourney | null;
  onTopic: (id: string) => void; onOverview: () => void; onRead: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const system = useMemo(() => createPlanetarySystem(book), [book.id, book.name, book.chapters]);
  const topic = topicId === undefined ? undefined : system.topics.get(topicId);
  const {travel, departure} = useMemo(() => {
    const from = journey?.from;
    const to = journey?.to;
    if (!from || to?.page !== 'rules' || to.bookId !== system.id || to.topicId !== topicId) {
      return {travel: null, departure: null};
    }
    const sourceBook = from.page === 'rules' && from.bookId && from.bookId !== system.id
      ? books.find(item => item.id === from.bookId) : undefined;
    const origin = from.page === 'rules' && from.bookId === system.id ? system
      : sourceBook ? createPlanetarySystem(sourceBook) : undefined;
    const sourceTopic = from.page === 'rules' ? from.topicId : undefined;
    const source = origin ? planetaryLocation(origin, sourceTopic) : {scene: from.page, point: spaceOrigin};
    const travel = planOrbitalFlight(source, planetaryLocation(system, topicId));
    return {
      travel,
      departure: travel && (origin
        ? <SystemSky system={origin} topic={sourceTopic === undefined ? undefined : origin.topics.get(sourceTopic)}/>
        : <svg className="orbital-space-view" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" focusable="false">
          <SpaceStars seed={system.star.seed ^ 0x941ca7d0} amount={68}/>
        </svg>),
    };
  }, [journey, books, system, topicId]);

  const focusedBody = topic?.moon ?? topic?.planet;
  const select = (event: MouseEvent<SVGAElement | HTMLAnchorElement>, id: string, fromMap = false) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onTopic(id);
    if (fromMap) {
      const href = event.currentTarget.getAttribute('href');
      requestAnimationFrame(() => {
        const links = root.current?.querySelectorAll<HTMLAnchorElement>('.planetary-destinations a');
        Array.from(links ?? []).find(link => link.getAttribute('href') === href)?.focus({preventScroll: true});
      });
    }
  };
  const overview: PlatformRoute = {page: 'rules', bookId: book.id};
  const destinations = (label: string, bodies: CelestialBody[], current?: string) => bodies.length > 0 &&
    <nav className="planetary-destinations" aria-label={label}>
      <span>{label}</span>
      <ul>{bodies.map(body => <li key={body.id}>
        <a href={platformHref({...overview, topicId: body.id})} aria-current={current === body.id ? 'location' : undefined}
          onClick={event => select(event, body.id)}>
          <span className="planetary-marker" aria-hidden="true" style={{background: body.appearance.light}}/>
          {body.title}
        </a>
      </li>)}</ul>
    </nav>;

  return <section ref={root} className="planetary-scene" data-scene-mode={topic ? 'reading' : 'overview'}
    data-planet-count={system.planets.length} data-moon-count={topic?.planet.moons.length ?? system.topics.size - system.planets.length}
    data-celestial-body={focusedBody?.id} aria-label="Sistema planetário">
    <div className="planetary-scene-heading">
      <div aria-live="polite">
        <h2>{focusedBody?.title ?? 'Mapa planetário'}</h2>
        {topic?.moon && <p>Lua de {topic.planet.title}</p>}
      </div>
      {topic && <div className="planetary-scene-actions">
        <button type="button" className="text-button" onClick={onOverview}><Orbit size={16} aria-hidden="true"/> Mapa do sistema</button>
        <button type="button" className="text-button" onClick={onRead}>Ler tópico <ArrowDown size={16} aria-hidden="true"/></button>
      </div>}
    </div>
    <div className="planetary-viewport">
      <OrbitalSpace className="planetary-sky" flight={travel} departure={departure}>
        <SystemSky system={system} topic={topic}/>
      </OrbitalSpace>
      {!topic && system.planets.length > 0 && <svg className="planetary-hit-map orbital-space-view" viewBox="0 0 1000 300"
        preserveAspectRatio="xMidYMid meet" role="group" aria-label="Planetas no mapa">
        {visibleBodies(system.planets).map(body => {
          const point = pointOnOrbit(body.orbit);
          return <a key={body.id} href={platformHref({...overview, topicId: body.id})} tabIndex={-1}
            aria-label={'Abrir capítulo ' + body.title} onClick={event => select(event, body.id, true)}>
            <title>{body.title}</title>
            <circle cx={500 + point.x * solarTrack.x} cy={150 + point.y * solarTrack.y} r={Math.max(27, body.appearance.size * 36)}/>
          </a>;
        })}
      </svg>}
    </div>
    {destinations('Planetas', system.planets, topic?.planet.id)}
    {topic && destinations('Luas', topic.planet.moons, topic.moon?.id)}
  </section>;
}
