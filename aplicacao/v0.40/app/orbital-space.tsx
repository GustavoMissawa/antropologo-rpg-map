'use client';

import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { orbitalRandom } from '../lib/orbital-noise';
import type { CelestialBody, OrbitalFlight } from '../lib/orbital-system';

export function SpaceStars({seed, amount = 92}: {seed: number; amount?: number}) {
  const stars = useMemo(() => {
    const random = orbitalRandom(seed);
    return Array.from({length: amount}, () => ({
      x: random() * 1000,
      y: random() * 300,
      r: .38 + random() ** 4 * 1.2,
      alpha: .13 + random() ** 1.5 * .63,
    }));
  }, [seed, amount]);
  return <g fill="#e5eeff">
    {stars.map(({x, y, r, alpha}, i) => <circle key={i} cx={x} cy={y} r={r} opacity={alpha}/>)}
  </g>;
}

export function CelestialGlobe({body, x, y, radius, detail = false}: {
  body: CelestialBody; x: number; y: number; radius: number; detail?: boolean;
}) {
  const id = useId();
  const {type, light, base, shade, tilt, rings} = body.appearance;
  const star = type === 'star';
  const texture = useMemo(() => {
    const random = orbitalRandom(body.seed ^ 0x5bd5213b);
    if (type === 'gas') {
      return Array.from({length: detail ? 13 : 6}, (_, i) => {
        const y = -94 + (i + random()) * (detail ? 14 : 31);
        const bend = random() * 30 - 15;
        return <path key={i} d={`M-112 ${y} Q -22 ${y + bend} 112 ${y - 6}`}
          stroke={i % 3 === 0 ? shade : light} strokeWidth={4 + random() * 15} opacity={.15 + random() * .28} fill="none"/>;
      });
    }
    const terrain = Array.from({length: detail ? 8 : 3}, (_, i) => {
      const x = random() * 184 - 92;
      const y = random() * 184 - 92;
      const size = 13 + random() * 57;
      return <path key={'terrain-' + i} fill={i % 2 === 0 ? light : shade} opacity={.12 + random() * .23}
        d={`M${x-size} ${y} q${size*.24} ${-size*.29} ${size*.73} ${-size*.42}
          t${size*.75} ${-size*.18} q${size*.72} ${size*.36} ${size*.4} ${size*.67}
          t${-size*1.2} ${size*.3} q${-size*.52} ${-size*.33} ${-size*.68} ${-size*.37}Z`}/>;
    });
    if (star) {
      const filaments = Array.from({length: detail ? 40 : 12}, (_, i) => {
        const x = random() * 192 - 96, y = random() * 192 - 96;
        const span = 3 + random() * 16;
        return <path key={'filament-' + i} d={`M${x} ${y} q${span*.6} ${-span*.55} ${span} ${span*.1}`}
          stroke={i%3===0 ? shade : light} strokeWidth={1 + random()*2.3} strokeLinecap="round"
          opacity={.20 + random()*.30} fill="none"/>;
      });
      return [...terrain,...filaments];
    }
    const markings = Array.from({length: detail ? 17 : 4}, (_, i) => {
      const x = random() * 176 - 88, y = random() * 176 - 88, r = 2 + random() ** 2 * 13;
      return type === 'ice'
        ? <path key={'mark-' + i} d={`M${x} ${y} l${r * 2} ${-r} ${r} ${r / 2} ${r * 2.2} ${-r}`}
            stroke={shade} strokeWidth=".9" opacity=".36" fill="none"/>
        : <ellipse key={'mark-' + i} cx={x} cy={y} rx={r} ry={r * .72} fill={shade}
            stroke={light} strokeWidth={r * .09} opacity={.14 + random() * .22}/>;
    });
    return [...terrain, ...markings];
  }, [body.seed, detail, light, shade, star, type]);

  return <g transform={`translate(${x} ${y}) scale(${radius / 100})`}>
    <defs>
      <clipPath id={id + '-disc'}><circle r="100"/></clipPath>
      <radialGradient id={id + '-ground'} cx=".32" cy=".24" r=".84">
        <stop stopColor={light}/><stop offset=".58" stopColor={base}/><stop offset="1" stopColor={shade}/>
      </radialGradient>
      <radialGradient id={id + '-limb'} cx=".3" cy=".28" r=".78">
        <stop offset=".4" stopColor={shade} stopOpacity="0"/>
        <stop offset="1" stopColor={shade} stopOpacity={star ? .45 : .88}/>
      </radialGradient>
      {star && <radialGradient id={id + '-corona'}>
        <stop offset=".3" stopColor={base} stopOpacity=".62"/>
        <stop offset=".54" stopColor={base} stopOpacity=".19"/>
        <stop offset="1" stopColor={base} stopOpacity="0"/>
      </radialGradient>}
    </defs>
    {star && <circle r="212" fill={`url(#${id}-corona)`}/>}
    {rings && <g transform={`rotate(${tilt})`} fill="none">
      <ellipse rx="166" ry="39" stroke={base} strokeWidth="16" opacity=".63"/>
      <ellipse rx="151" ry="34" stroke={light} strokeWidth="4" opacity=".65"/>
      <ellipse rx="181" ry="43" stroke={light} strokeWidth="4" opacity=".31"/>
    </g>}
    <circle r="100" fill={`url(#${id}-ground)`}/>
    <g clipPath={`url(#${id}-disc)`}>
      <g transform={`rotate(${tilt})`}>{texture}</g>
      <circle r="100" fill={`url(#${id}-limb)`}/>
      <circle r="99" stroke={light} strokeWidth="2.1" opacity=".31" fill="none"/>
    </g>
    {rings && <g transform={`rotate(${tilt})`} fill="none">
      <path d="M-166 0 A166 39 0 0 0 166 0" stroke={base} strokeWidth="16" opacity=".84"/>
      <path d="M-151 0 A151 34 0 0 0 151 0" stroke={light} strokeWidth="4" opacity=".75"/>
      <path d="M-181 0 A181 43 0 0 0 181 0" stroke={light} strokeWidth="4" opacity=".41"/>
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
