'use client';

import { memo, useEffect, useId, useMemo, useRef } from 'react';
import { orbitalRandom } from '../lib/orbital-noise';
import { planOrbitalFlight, spaceOrigin } from '../lib/orbital-system';
import type { PlatformJourney } from '../lib/platform-navigation';
import { OrbitalSpace, SpaceStars } from './orbital-space';

const cometSeed = 0x26838727;

const CometSky = memo(function CometSky() {
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const filaments = useMemo(() => {
    const random = orbitalRandom(cometSeed);
    return Array.from({length: 17}, (_, i) => {
      const spread = (random() - .5) * 165, length = 175 + random() * 303;
      const d = `M496 ${144 + random() * 12} C442 ${149 + spread * .14} 310 ${153 + spread * .67} ${500 - length} ${166 + spread}`;
      return <path key={i} d={d} strokeWidth={.45 + random() * 5} opacity={.12 + random() * .45}/>;
    });
  }, []);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const frame = el.closest('.comet-scene');
    if (!frame) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = typeof IntersectionObserver === 'undefined';
    const update = () => { frame.setAttribute('data-running', String(visible && !document.hidden && !motion.matches)); };
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }) : null;
    observer?.observe(frame);
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
      motion.removeEventListener('change', update);
      frame.removeAttribute('data-running');
    };
  }, []);
  return <div ref={root}>
    <div className="comet-sky-track">
      {[0,1].map(i => <svg key={i} viewBox="0 0 1000 300" preserveAspectRatio="none" focusable="false">
        <SpaceStars seed={cometSeed} amount={122}/>
      </svg>)}
    </div>
    <div className="comet-vignette"/>
    <svg className="orbital-space-view comet-nucleus" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id={id + '-tail'}>
          <stop stopColor="#5482b5" stopOpacity="0"/>
          <stop offset=".36" stopColor="#729fce" stopOpacity=".16"/>
          <stop offset=".73" stopColor="#93c8da" stopOpacity=".54"/>
          <stop offset="1" stopColor="#f1f8f5" stopOpacity=".97"/>
        </linearGradient>
        <radialGradient id={id + '-coma'}>
          <stop stopColor="#e9f8ff" stopOpacity=".93"/>
          <stop offset=".28" stopColor="#89c4e0" stopOpacity=".53"/>
          <stop offset=".62" stopColor="#6087c0" stopOpacity=".18"/>
          <stop offset="1" stopColor="#29496a" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={id + '-core'} cx=".73" cy=".35" r=".8">
          <stop stopColor="#f7faf5"/><stop offset=".39" stopColor="#bfdae2"/><stop offset="1" stopColor="#4f697d"/>
        </radialGradient>
      </defs>
      <path fill={`url(#${id}-tail)`} opacity=".32"
        d="M18 204C213 176 356 126 486 133Q508 136 513 150Q504 173 477 163C320 149 204 249 18 204Z"/>
      <path fill={`url(#${id}-tail)`} opacity=".29"
        d="M84 99C222 104 406 126 495 139L508 155C357 162 180 107 84 99Z"/>
      <circle cx="498" cy="150" r="64" fill={`url(#${id}-coma)`}/>
      <g transform="rotate(-4 500 150)" stroke={`url(#${id}-tail)`} fill="none">{filaments}</g>
      <path d="M488 150q2-6 7-8l8 2 6 6-5 8-9 2-6-4Z" fill={`url(#${id}-core)`}/>
      <path d="M495 144l6 1 5 4-5 2-7-3Z" opacity=".4" fill="#fcfff6"/>
    </svg>
  </div>;
});

export function OrbitalComet({journey}: {journey: PlatformJourney | null}) {
  const flight = useMemo(() => {
    if (journey?.to.page !== 'pdfs' || journey.from.page === 'pdfs') return null;
    return planOrbitalFlight({scene: journey.from.page, point: spaceOrigin}, {scene: 'comet', point: spaceOrigin});
  }, [journey]);
  return <OrbitalSpace className="comet-scene" flight={flight}><CometSky/></OrbitalSpace>;
}
