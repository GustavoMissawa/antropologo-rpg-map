'use client';

import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { orbitalRandom } from '../lib/orbital-noise';
import type { CelestialBody, OrbitalFlight } from '../lib/orbital-system';

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
  body: CelestialBody; x: number; y: number; radius: number; detail?: boolean;
}) {
  const id = useId();
  const {type, light, base, shade, tilt, rings, atmosphere, cratering, storm} = body.appearance;
  const star = type === 'star';
  const texture = useMemo(() => {
    if (star) {
      const random = orbitalRandom(body.seed ^ 0x5bd5213b);
      return Array.from({length: detail ? 42 : 12}, (_, i) => {
        const x = random() * 195 - 97.5, y = random() * 195 - 97.5;
        const span = 3 + random() * 27;
        return <path key={i} d={`M${x} ${y} q${span*.4} ${-span*.66} ${span} ${span*.17}`}
          stroke={i % 4 === 0 ? shade : light} strokeWidth={1 + random() * 3.2} strokeLinecap="round"
          opacity={.10 + random() * .24} fill="none"/>;
      });
    }
    if (type === 'gas-giant' || type === 'ice-giant') {
      const ice = type === 'ice-giant';
      const stormRandom = orbitalRandom(body.seed ^ 0x598e5bed);
      const x = stormRandom() * 82 - 41, y = stormRandom() * 70 - 35;
      const bands = Array.from({length: detail ? 13 : 6}, (_, layer) => {
        const i = layer < 6 ? layer * 2 + 1 : (layer - 6) * 2;
        const random = orbitalRandom(body.seed ^ (0x5bd5213b + i * 997));
        const y = -104 + (i + random()) * 16;
        const bend = random() * 30 - 15;
        return <path key={i} d={`M-112 ${y} C-53 ${y+bend} 47 ${y-bend*.4} 112 ${y-6}`}
          stroke={i % 3 === 0 ? shade : light} strokeWidth={3 + random() * (layer < 6 ? 14 : 5)}
          opacity={.16 + random() * (ice ? .19 : .34)} fill="none"/>;
      });
      return storm ? [...bands, <g key="storm" transform={`translate(${x} ${y})`} opacity={ice ? .69 : .86}>
        <ellipse rx="26" ry="10" fill={light} opacity=".52"/>
        <ellipse rx="19" ry="6.7" fill={shade}/>
        <path d="M-17 1 C-4 -7 16 -4 14 0 S-1 6 -7 1" fill="none" stroke={base} strokeWidth="2.8" strokeLinecap="round"/>
      </g>] : bands;
    }
    const random = orbitalRandom(body.seed ^ 0x5bd5213b);
    const terrain = Array.from({length: detail ? 8 : 3}, (_, i) => {
      const x = random() * 184 - 92;
      const y = random() * 184 - 92;
      const size = 13 + random() * 57;
      const continental = type === 'oceanic';
      return <path key={'terrain-' + i} fill={i % 2 === 0 ? light : shade}
        opacity={continental ? .34 + random() * .33 : .12 + random() * .28}
        d={`M${x-size} ${y} q${size*.24} ${-size*.29} ${size*.73} ${-size*.42}
          t${size*.75} ${-size*.18} q${size*.72} ${size*.36} ${size*.4} ${size*.67}
          t${-size*1.2} ${size*.3} q${-size*.52} ${-size*.33} ${-size*.68} ${-size*.37}Z`}/>;
    });
    const fracture = type === 'icy' || type === 'volcanic';
    const bands = type === 'desert';
    const count = fracture || bands ? (detail ? 10 : 4) : Math.round((detail ? 17 : 6) * cratering);
    const mark = orbitalRandom(body.seed ^ 0x6d6cea33);
    const markings = Array.from({length: count}, (_, i) => {
      const x = mark() * 176 - 88, y = mark() * 176 - 88, r = 2 + mark() ** 2 * 13;
      return fracture
        ? <path key={'mark-' + i} d={`M${x} ${y} l${r * 2} ${-r} ${r} ${r / 2} ${r * 2.2} ${-r}`}
            stroke={type === 'volcanic' ? light : shade} strokeWidth={type === 'volcanic' ? 1.7 : 1.35}
            opacity={type === 'volcanic' ? .68 : .42} fill="none"/>
        : bands
          ? <path key={'mark-' + i} d={`M${x-28} ${y} q19 ${-r*2} 38 ${-r} t49 ${r/2}`}
              stroke={i%2 ? light : shade} strokeWidth={1 + r*.19} opacity=".30" fill="none"/>
        : <ellipse key={'mark-' + i} cx={x} cy={y} rx={r} ry={r * .72} fill={shade}
            stroke={light} strokeWidth={r * .09} opacity={.14 + mark() * .22}/>;
    });
    return [...terrain, ...markings];
  }, [body.seed, detail, base, light, shade, star, storm, type, cratering]);

  const ringColor = rings === 'ice' ? '#d8e8eb' : base;
  const ringWidth = rings === 'ice' ? 17 : 11;

  return <g transform={`translate(${x} ${y}) scale(${radius / 100})`}>
    <defs>
      <clipPath id={id + '-disc'}><circle r="100"/></clipPath>
      <radialGradient id={id + '-ground'} cx={star ? '.43' : '.32'} cy={star ? '.39' : '.24'} r=".84">
        <stop stopColor={star ? '#fffaf1' : light}/>
        <stop offset={star ? '.49' : '.58'} stopColor={star ? light : base}/>
        <stop offset="1" stopColor={star ? base : shade}/>
      </radialGradient>
      <radialGradient id={id + '-limb'} cx=".3" cy=".28" r=".78">
        <stop offset=".4" stopColor={shade} stopOpacity="0"/>
        <stop offset="1" stopColor={shade} stopOpacity={star ? .16 : .88}/>
      </radialGradient>
      {star && <radialGradient id={id + '-corona'}>
        <stop offset=".38" stopColor={light} stopOpacity=".88"/>
        <stop offset=".5" stopColor={base} stopOpacity=".38"/>
        <stop offset=".69" stopColor={base} stopOpacity=".12"/>
        <stop offset="1" stopColor={base} stopOpacity="0"/>
      </radialGradient>}
    </defs>
    {star && <circle r="212" fill={`url(#${id}-corona)`}/>}
    {rings && <g transform={`rotate(${tilt})`} fill="none">
      <ellipse rx="166" ry="39" stroke={ringColor} strokeWidth={ringWidth} opacity=".63"/>
      <ellipse rx="151" ry="34" stroke={light} strokeWidth="4" opacity=".65"/>
      <ellipse rx="181" ry="43" stroke={light} strokeWidth="4" opacity=".31"/>
    </g>}
    <circle r="100" fill={`url(#${id}-ground)`}/>
    <g clipPath={`url(#${id}-disc)`}>
      <g transform={`rotate(${tilt})`}>{texture}</g>
      <circle r="100" fill={`url(#${id}-limb)`}/>
      <circle r="99" stroke={light} strokeWidth={atmosphere === 'dense' ? 5 : 2.1}
        opacity={atmosphere === 'dense' ? .47 : .31} fill="none"/>
      {atmosphere !== 'none' && <path d="M-88 -43 A98 98 0 0 1 42 -88" fill="none" stroke={light}
        strokeWidth={atmosphere === 'dense' ? 3 : 1.6} strokeLinecap="round" opacity=".59"/>}
    </g>
    {rings && <g transform={`rotate(${tilt})`} fill="none">
      <path d="M-166 0 A166 39 0 0 0 166 0" stroke={ringColor} strokeWidth={ringWidth} opacity=".84"/>
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
