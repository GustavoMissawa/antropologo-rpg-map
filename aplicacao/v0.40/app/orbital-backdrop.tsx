'use client';

import {useEffect, useRef, type CSSProperties} from 'react';
import {createOrbitalStars} from '../lib/orbital-sky';

const stars = createOrbitalStars();
const formations = ['north', 'east', 'southwest', 'south'] as const;

export function OrbitalBackdrop() {
  const backdrop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = backdrop.current;
    if (!element) return;
    let visible = true;
    const update = () => {element.dataset.motion = visible && !document.hidden ? 'running' : 'paused';};
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer?.observe(element);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <div ref={backdrop} className="orbital-backdrop" data-motion="paused" aria-hidden="true">
    <div className="orbital-nebulae">
      <svg className="orbital-nebula-filters" width="0" height="0" focusable="false">
        <defs>
          <filter id="orbital-nebula-grain" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency=".018 .028" numOctaves="3" seed="27" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .7 .7 .7 0 -.5" result="density" />
            <feComposite in="SourceGraphic" in2="density" operator="in" result="gas" />
            <feDisplacementMap in="gas" in2="noise" scale="24" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation=".6" />
          </filter>
        </defs>
      </svg>
      {formations.map(formation => <div key={formation} className={`cosmic-nebula cosmic-nebula-${formation}`}>
        <div className="cosmic-nebula-material">
          <div className="cosmic-nebula-gas" />
          <div className="cosmic-nebula-filaments" />
          <div className="cosmic-nebula-dust" />
        </div>
      </div>)}
    </div>
    <svg className="orbital-starfield" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
      {stars.map((star, index) => <circle key={index} className="orbital-sky-star" cx={star.x} cy={star.y} r={star.radius} opacity={star.opacity} data-tint={star.tint} data-twinkle={star.twinkle} style={star.twinkle ? {'--star-period': `${8 + index % 6}s`, '--star-delay': `${-index % 13}s`} as CSSProperties : undefined}/>)}
    </svg>
  </div>;
}
