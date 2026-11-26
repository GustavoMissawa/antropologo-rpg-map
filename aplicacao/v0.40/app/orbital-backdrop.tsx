'use client';

import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {createOrbitalStars} from '../lib/orbital-sky';

import {pageNebulaComposition, type NebulaFormation} from '../lib/nebula-composition';

import {mountOrbitalNebulae} from './orbital-nebula';

const stars = createOrbitalStars();

export function OrbitalBackdrop() {
  const backdrop = useRef<HTMLDivElement>(null);
  const nebulae = useRef<HTMLDivElement>(null);
  const [composition, setComposition] = useState<readonly NebulaFormation[]>();
  useEffect(() => {setComposition(pageNebulaComposition());}, []);
  useEffect(() => {
    if (composition?.length && nebulae.current) {
      return mountOrbitalNebulae([...nebulae.current.querySelectorAll('canvas')], composition);
    }
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
    data-nebula-count={composition?.length} aria-hidden="true">
    {!!composition?.length && <div ref={nebulae} className="orbital-nebulae">
      {composition.map(formation => <canvas key={formation.seed} className="cosmic-nebula" data-anchor={formation.anchor}
        data-seed={formation.seed} data-family={formation.family} data-accent={formation.accent ?? undefined}
        style={{
          '--nebula-x': `${formation.x}%`, '--nebula-y': `${formation.y}%`,
          '--nebula-tilt': `${formation.tilt}deg`, '--nebula-scale': formation.scale,
          '--nebula-aspect': formation.aspect, '--nebula-strength': formation.opacity,
        } as CSSProperties} />)}
    </div>}
    <svg className="orbital-starfield" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" focusable="false">
      {stars.map((star, index) => <circle key={index} className="orbital-sky-star" cx={star.x} cy={star.y} r={star.radius} opacity={star.opacity} data-tint={star.tint} data-twinkle={star.twinkle} style={star.twinkle ? {'--star-period': `${8 + index % 6}s`, '--star-delay': `${-index % 13}s`} as CSSProperties : undefined}/>)}
    </svg>
  </div>;
}
