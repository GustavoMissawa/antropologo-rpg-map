'use client';

import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {createOrbitalStars} from '../lib/orbital-sky';

import {pageNebulaComposition, type NebulaComposition} from '../lib/nebula-composition';

import {mountOrbitalNebula} from './orbital-nebula';

const stars = createOrbitalStars();

export function OrbitalBackdrop() {
  const backdrop = useRef<HTMLDivElement>(null);
  const nebula = useRef<HTMLCanvasElement>(null);
  const [composition, setComposition] = useState<NebulaComposition | null>();
  useEffect(() => {setComposition(pageNebulaComposition());}, []);
  useEffect(() => {
    if (composition && nebula.current) return mountOrbitalNebula(nebula.current, composition);
  }, [composition]);
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

  return <div ref={backdrop} className="orbital-backdrop" data-motion="paused"
    data-nebula={composition?.family ?? (composition === null ? 'none' : undefined)} aria-hidden="true">
    <svg className="orbital-starfield" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
      {stars.map((star, index) => <circle key={index} className="orbital-sky-star" cx={star.x} cy={star.y} r={star.radius} opacity={star.opacity} data-tint={star.tint} data-twinkle={star.twinkle} style={star.twinkle ? {'--star-period': `${8 + index % 6}s`, '--star-delay': `${-index % 13}s`} as CSSProperties : undefined}/>)}
    </svg>
    {composition && <div className="orbital-nebulae">
      <canvas ref={nebula} className="cosmic-nebula" data-anchor={composition.anchor}
        data-seed={composition.seed} data-family={composition.family} data-accent={composition.accent ?? undefined}
        style={{
          '--nebula-x': `${composition.x}%`, '--nebula-y': `${composition.y}%`,
          '--nebula-tilt': `${composition.tilt}deg`, '--nebula-scale': composition.scale,
          '--nebula-aspect': composition.aspect, '--nebula-strength': composition.opacity,
        } as CSSProperties} />
    </div>}
  </div>;
}
