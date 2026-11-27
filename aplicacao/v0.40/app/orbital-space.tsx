'use client';

import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { orbitalRandom } from '../lib/orbital-noise';
import type { OrbitalPlanet, OrbitalMoon, OrbitalFlight } from '../lib/orbital-system';
import { globeTexture } from '../lib/orbital-texture';

export function SpaceStars({seed, amount = 92, color = '#e5eeff'}: {seed: number; amount?: number; color?: string}) {
  const stars = useMemo(() => {
    const random = orbitalRandom(seed);
    return Array.from({length: amount}, () => ({
      x: random() * 1000,
      y: random() * 300,
      r: .38 + random() ** 4 * 1.2,
      alpha: .13 + random() ** 1.5 * .63,
    }));
  }, [seed, amount]);
  return <g fill={color}>
    {stars.map(({x, y, r, alpha}, i) => <circle key={i} cx={x} cy={y} r={r} opacity={alpha}/>)}
  </g>;
}

export function CelestialGlobe({body, x, y, radius, detail = false}: {
  body: OrbitalPlanet | OrbitalMoon; x: number; y: number; radius: number; detail?: boolean;
}) {
  const id = useId();
  const {type, light, base, shade, tilt, rings, atmosphere, cratering, storm} = body.appearance;
  const moon = 'planetId' in body;
  const texture = useMemo(() => globeTexture(body.seed,type,moon,cratering,storm,detail),
    [body.seed,type,moon,cratering,storm,detail]);
  const tones = {light,base,shade};
  const ringBands = useMemo(() => {
    if (!rings) return [];
    const random = orbitalRandom(body.seed ^ 0x17b92ce3);
    return [128,143,159,174].map((length,i) => ({
      x:length + random()*2.5, y:length*(.18 + .006*i) + random()*2.8,
      width: (i === 2 ? 8 : 2.2) + (rings==='ice' ? 3.8 : 1.5)*random(),
      ink:i % 2 === 0 ? (rings==='ice' ? '#d8e8eb' : base) : light,
      opacity:.47+.38*random(),
    }));
  },[body.seed,rings,light,base]);
  const atmosphereOpacity = atmosphere === 'dense' ? .58 : .30;
  return <g transform={`translate(${x} ${y}) scale(${radius / 100})`} data-globe-surface={type}>
    <defs>
      <clipPath id={id + '-disc'}><circle r="100"/></clipPath>
      <radialGradient id={id + '-ground'} cx=".30" cy=".25" r=".88">
        <stop stopColor={light}/>
        <stop offset=".52" stopColor={base}/>
        <stop offset="1" stopColor={shade}/>
      </radialGradient>
      <radialGradient id={id + '-limb'} cx=".27" cy=".24" r=".82">
        <stop offset=".36" stopColor={shade} stopOpacity="0"/>
        <stop offset=".77" stopColor={shade} stopOpacity=".38"/>
        <stop offset="1" stopColor={shade} stopOpacity=".94"/>
      </radialGradient>
      {atmosphere!=='none'&&<radialGradient id={id+'-air'}>
        <stop offset=".81" stopColor={base} stopOpacity="0"/>
        <stop offset=".91" stopColor={light} stopOpacity={atmosphereOpacity}/>
        <stop offset="1" stopColor={base} stopOpacity="0"/>
      </radialGradient>}
    </defs>
    {!!ringBands.length&&<g transform={`rotate(${tilt})`} fill="none" data-globe-rings={rings}>
      {ringBands.map(band=><ellipse key={band.x} rx={band.x} ry={band.y}
        stroke={band.ink} strokeWidth={band.width} opacity={band.opacity*.67}/>)}
    </g>}
    {atmosphere!=='none'&&<circle r={atmosphere==='dense'?113:107} fill={`url(#${id}-air)`}/>}
    <circle r="100" fill={`url(#${id}-ground)`}/>
    <g clipPath={`url(#${id}-disc)`}>
      <g transform={`rotate(${tilt})`}>
        {texture.map(({d,tone,opacity,width},i)=><path key={i} d={d} opacity={opacity}
          fill={width?'none':tones[tone]} stroke={width?tones[tone]:undefined} strokeWidth={width}
          strokeLinejoin="round" strokeLinecap="round"/>)}
      </g>
      <circle r="100" fill={`url(#${id}-limb)`}/>
      <path d="M-93 -29A97 97 0 0 1 36 -90" fill="none" stroke={light}
        strokeWidth={atmosphere==='dense'?3.2:moon?2.7:1.5} strokeOpacity={atmosphere==='none'?.28:atmosphereOpacity}/>
    </g>
    {!!ringBands.length&&<g transform={`rotate(${tilt})`} fill="none">
      {ringBands.map(band=><path key={band.x} d={`M-${band.x} 0A${band.x} ${band.y} 0 0 0 ${band.x} 0`}
        stroke={band.ink} strokeWidth={band.width} opacity={band.opacity}/>)}
    </g>}
  </g>;
}

const easeOut = 'cubic-bezier(.23, 1, .32, 1)';

/** Only scenery is animated. The resolved route and both sets of controls are available immediately. */
export function OrbitalSpace({flight, departure, children, className = ''}: {
  flight: OrbitalFlight | null; departure?: ReactNode; children: ReactNode; className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const outgoing = useRef<HTMLDivElement>(null);
  const streaks = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState<OrbitalFlight | null>(null);
  const activeFlight = flight && flight !== settled ? flight : null;
  useLayoutEffect(() => {
    const flight = activeFlight;
    const root = frame.current, layer = camera.current;
    if (!flight || !root || !layer?.animate) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || document.hidden) {
      setSettled(flight);
      return;
    }
    const small = matchMedia('(max-width: 640px)').matches;
    const direction = flight.direction;
    const previous = outgoing.current;
    const animations: Animation[] = [];
    const duration = flight.kind === 'jump' ? (small ? 510 : 690) : flight.kind === 'orbit' ? 420 : 310;
    if (flight.kind === 'jump') {
      if (previous) animations.push(previous.animate([
        {transform: 'scale(1)', opacity: 1},
        {transform: `translateX(${direction * 5}%) scale(.62)`, opacity: .32, offset: .28, easing: easeOut},
        {transform: `translateX(${direction * 13}%) scale(.5)`, opacity: 0, offset: .48},
        {opacity: 0},
      ], {duration, fill: 'both'}));
      if (streaks.current) animations.push(streaks.current.animate([
        {transform: 'scaleX(.9)', opacity: 0},
        {transform: `translateX(${direction * 12}%) scaleX(2.35)`, opacity: .72, offset: .42},
        {transform: `translateX(${direction * 26}%) scaleX(1.24)`, opacity: 0},
      ], {duration}));
      animations.push(layer.animate([
        {transform: `translateX(${-direction * 9}%) scale(.59)`, opacity: 0},
        {transform: `translateX(${-direction * 5}%) scale(.71)`, opacity: .16, offset: .45, easing: easeOut},
        {transform: 'none', opacity: 1},
      ], {duration}));
    } else {
      const arc = flight.kind === 'orbit';
      const width = small ? (arc ? 8 : 24) : (arc ? 12 : 35);
      const height = arc ? 18 : 10;
      if (previous) animations.push(previous.animate([
        {transform: 'none', opacity: 1},
        {transform: `translateX(${-direction * (arc ? 4 : 13)}%)`, opacity: 0},
      ], {duration: duration * .72, easing: easeOut}));
      animations.push(layer.animate(flight.frames.map(({x,y}, i) => ({
        transform: `translate(${x * width}%, ${y * height}%)`,
        opacity: i === 0 && previous ? .2 : 1,
      })), {duration, easing: easeOut}));
    }
    root.dataset.flight = flight.kind;
    function stop() {
      animations.forEach(animation => animation.cancel());
      if (root) delete root.dataset.flight;
    }
    function finish() { stop(); setSettled(flight); }
    function visibility() { if (document.hidden) finish(); }
    function preference() { if (motion.matches) finish(); }
    const main = animations[animations.length - 1];
    main.onfinish = finish;
    motion.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      main.onfinish = null;
      stop();
      motion.removeEventListener('change', preference);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [activeFlight]);

  return <div ref={frame} className={`orbital-space ${className}`} aria-hidden="true">
    {departure && activeFlight && <div ref={outgoing} className="orbital-space-departure">{departure}</div>}
    <div ref={camera} className="orbital-space-camera">{children}</div>
    {activeFlight?.kind === 'jump' && <div ref={streaks} className="orbital-space-streaks"/>}
  </div>;
}
