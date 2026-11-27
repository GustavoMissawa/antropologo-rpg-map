'use client';

import { memo, useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';
import { orbitalRandom } from '../lib/orbital-noise';
import { cometDepths, cometSkyTile, cometTile } from '../lib/comet-parallax';
import { planOrbitalFlight, spaceOrigin } from '../lib/orbital-system';
import type { PlatformJourney } from '../lib/platform-navigation';
import { OrbitalSpace } from './orbital-space';

const cometSeed = 0x26838727;

const CometSky = memo(function CometSky() {
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const tiles = useMemo(() => cometDepths.map((depth,i)=>cometSkyTile(cometSeed,depth,i)),[]);
  const filaments = useMemo(() => {
    const random = orbitalRandom(cometSeed);
    return Array.from({length: 17}, (_, i) => {
      const spread = (random() - .5) * 165, length = 175 + random() * 303;
      const d = `M496 ${144 + random() * 12} C442 ${149 + spread * .14} 310 ${153 + spread * .67} ${500 - length} ${166 + spread}`;
      return <path key={i} d={d} strokeWidth={.45 + random() * 5} opacity={.12 + random() * .45}/>;
    });
  }, []);
  const dust = useMemo(() => {
    const random = orbitalRandom(cometSeed ^ 0x1664bc34);
    return [0,1].map(stream=>Array.from({length:9},(_,i)=>{
      const reach = 30 + 182 * random();
      return <circle key={i} cx={484-reach} cy={152 + (random()-.5)*reach*.25 + stream*5}
        r={.40+1.28*random()**2} opacity={.29+.53*random()}/>;
    }));
  },[]);
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
    {cometDepths.map((depth,i)=>{
      const tileId=id+'-depth-'+depth.name;
      const {width,height}=cometTile;
      return <svg key={depth.name} className="comet-depth-plane" data-comet-depth={depth.name}
        style={{'--comet-period':depth.period+'s','--comet-compact-period':depth.compactPeriod+'s',
          animationDelay:`${-depth.period*(.19+.13*i)}s`,color:depth.color,opacity:depth.opacity} as CSSProperties}
        viewBox={`0 0 ${2*width} ${2*height}`} preserveAspectRatio="none" focusable="false">
        <defs><g id={tileId}>{tiles[i].map(({points,trails},layer)=><g key={layer} className={layer===1?'comet-extra-stars':undefined}>
          {trails&&<path d={trails} fill="none" stroke="currentColor" strokeOpacity={i===2?.30:.24} strokeWidth={i===2?1.18:.65}/>}
          <path d={points} fill="currentColor"/>
        </g>)}</g></defs>
        {[0,width].flatMap(x=>[0,height].map(y=><use key={`${x}-${y}`} href={`#${tileId}`} x={x} y={y}/>))}
      </svg>;
    })}
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
      <circle cx="498" cy="150" r="64" fill={`url(#${id}-coma)`}/>
      <g className="comet-tail-flow">
        <path fill={`url(#${id}-tail)`} opacity=".36"
          d="M18 206C205 176 356 127 486 133Q508 136 513 150Q504 173 477 163C320 150 205 242 18 206Z"/>
        <path fill={`url(#${id}-tail)`} opacity=".30"
          d="M69 106C215 108 354 124 495 139L507 154C341 149 187 132 69 106Z"/>
        <g transform="rotate(-4 500 150)" stroke={`url(#${id}-tail)`} fill="none">{filaments}</g>
      </g>
      {dust.map((stream,i)=><g key={i} className="comet-dust-flow" fill="#c6e1ed" style={{animationDelay:`${-i*2.3}s`}}>{stream}</g>)}
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
