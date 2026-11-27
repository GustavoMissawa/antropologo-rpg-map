'use client';

import { useId, useMemo } from 'react';
import { centralProfiles } from '../lib/orbital-astronomy';
import { createOrbitalNoise, orbitalRandom } from '../lib/orbital-noise';
import type { OrbitalPrimary } from '../lib/orbital-system';
import { globeTexture, orbitalPatch, type SurfaceMark } from '../lib/orbital-texture';

export function OrbitalCentralBody({body, radius}: {body: OrbitalPrimary; radius: number}) {
  const id = useId();
  const {archetype,axis} = body.central;
  const {light,base,shade} = body.appearance;
  const {corona,glow} = centralProfiles[archetype];
  const blackHole = archetype === 'black-hole';
  const compact = archetype === 'white-dwarf' || archetype === 'pulsar' || archetype === 'magnetar';
  const plasma = useMemo(() => {
    const random = orbitalRandom(body.seed ^ 0xcba1e12d);
    if (blackHole) {
      return Array.from({length: 7}, (_, i) => {
        const x = 106 + i * 10 + 4 * random(), y=23 + i * 2.2 + 4 * random();
        const front = `M-${x.toFixed(1)} 0A${x.toFixed(1)} ${y.toFixed(1)} 0 0 0 ${x.toFixed(1)} 0`;
        return {x,y,front,opacity:.27 + .50 * (1-i/7) * random(),width:i===1?7:2+5*random()};
      });
    }
    return [];
  }, [body.seed,blackHole]);
  const texture = useMemo<SurfaceMark[]>(() => {
    if (blackHole) return [];
    if (archetype === 'brown-dwarf') return globeTexture(body.seed,'gas-giant',false,0,false,false);
    const random = orbitalRandom(body.seed ^ 0x294be91f);
    const noise = createOrbitalNoise(body.seed ^ 0xb87143ac);
    const giant = archetype === 'red-giant';
    const count = compact?5:giant?18:25;
    let warm='',cool='';
    for (let i=0;i<count;i++) {
      const x=(random()-.5)*194,y=(random()-.5)*193;
      const size= (giant ? 18 : 5) + random()*(giant ? 36 : 15);
      const patch=orbitalPatch(x,y,size,size*(.54+random()*.43),4+i*1.72,noise);
      if (i%3===0) cool+=patch;
      else warm+=patch;
    }
    return [
      {d:warm,tone:'light' as const,opacity:giant?.38:compact?.31:.36},
      {d:cool,tone:'shade' as const,opacity:giant?.32:compact?.23:.28},
    ];
  },[body.seed,archetype,blackHole,compact]);
  const tones = {light,base,shade};

  return <g transform={`scale(${radius/100})`} data-central-archetype={archetype}>
    <defs>
      <clipPath id={id+'-surface'}><circle r="100"/></clipPath>
      <radialGradient id={id+'-corona'}>
        <stop offset=".18" stopColor={light} stopOpacity={glow}/>
        <stop offset=".44" stopColor={base} stopOpacity={glow*.50}/>
        <stop offset=".69" stopColor={base} stopOpacity={glow*.16}/>
        <stop offset="1" stopColor={shade} stopOpacity="0"/>
      </radialGradient>
      <radialGradient id={id+'-photosphere'} cx=".34" cy=".27" r=".85">
        <stop stopColor={light}/>
        <stop offset={compact?.58:.34} stopColor={light}/>
        <stop offset=".72" stopColor={base}/>
        <stop offset="1" stopColor={shade}/>
      </radialGradient>
      {archetype==='pulsar'&&<linearGradient id={id+'-beam'} x1="0" x2="1">
        <stop stopColor={light} stopOpacity=".82"/><stop offset=".38" stopColor={base} stopOpacity=".55"/>
        <stop offset="1" stopColor={base} stopOpacity="0"/>
      </linearGradient>}
      {blackHole&&<linearGradient id={id+'-accretion'} x1="0" x2="1">
        <stop stopColor="#a4c5ff"/><stop offset=".27" stopColor={light}/>
        <stop offset=".65" stopColor={base}/><stop offset="1" stopColor={shade}/>
      </linearGradient>}
    </defs>
    <circle r={corona*100} fill={`url(#${id}-corona)`}/>
    {archetype==='pulsar'&&<g transform={`rotate(${axis-16})`}>
      <g className="orbital-pulsar-beams" style={{animationDelay:`${-(body.seed%700)/100}s`}}>
        {[0,180].map(rotation=><g key={rotation} transform={`rotate(${rotation})`}>
          <path d="M38 -13L406 -36L406 40L38 13Z" fill={`url(#${id}-beam)`}/>
          <path d="M46 0Q243 -10 398 1" fill="none" stroke={`url(#${id}-beam)`} strokeWidth="9"/>
        </g>)}
      </g>
    </g>}
    {archetype==='magnetar'&&<g transform={`rotate(${axis})`}>
      <g className="orbital-magnetar-field" fill="none" stroke={base} style={{animationDelay:`${-(body.seed%610)/100}s`}}>
        {[0,180].map(rotation=><g key={rotation} transform={`rotate(${rotation})`}>
          <path d="M-30 -69C-334 -199 -327 186 26 69" strokeWidth="7" opacity=".55"/>
          <path d="M-39 -66C-213 -133 -236 137 24 74" strokeWidth="6" opacity=".71"/>
          <path d="M-26 -74C-144 -82 -159 89 14 76" strokeWidth="5" opacity=".78"/>
        </g>)}
      </g>
    </g>}
    {blackHole ? <g transform={`rotate(${axis*.59-13})`}>
      <g fill="none" stroke={`url(#${id}-accretion)`}>
        <path d="M-153 3C-145 -42 -104 -118 -51 -124Q0 -145 53 -123C110 -100 147 -41 153 3" strokeWidth="9" opacity=".60"/>
        <path d="M-138 3C-114 -43 -89 -99 -53 -109Q-1 -129 51 -108C106 -87 134 -30 138 3" strokeWidth="5" opacity=".67"/>
        {plasma.map(band=><ellipse key={band.x} rx={band.x} ry={band.y} strokeWidth={band.width} opacity={band.opacity}/>)}
      </g>
      <ellipse rx="93" ry="88" fill="#090814"/>
      <path d="M-94 3C-99 -56 -56 -96 1 -96C53 -98 88 -57 94 3" fill="none" stroke={light} strokeWidth="4.6" opacity=".88"/>
      <g fill="none" stroke={`url(#${id}-accretion)`}>
        {plasma.map(band=><path key={band.x} d={band.front} strokeWidth={band.width+1.8} opacity={band.opacity+.16}/>)}
        <path d="M-159 0C-120 29 -42 37 14 36C77 37 145 24 170 0" strokeWidth="5" opacity=".75"/>
      </g>
    </g> : <>
      <circle r="100" fill={`url(#${id}-photosphere)`}/>
      <g clipPath={`url(#${id}-surface)`}>
        <g transform={`rotate(${axis})`}>
          {texture.map(({d,tone,opacity,width},i)=><path key={i} d={d} opacity={opacity}
            fill={width?'none':tones[tone]} stroke={width?tones[tone]:undefined} strokeWidth={width}/>)}
        </g>
        <circle r="98" stroke={light} strokeWidth={compact?4.5:2.3} strokeOpacity={compact?.65:.27} fill="none"/>
      </g>
      {archetype==='red-dwarf'&&<path d="M-80 -58C-123 -134 -28 -147 -32 -94" fill="none" stroke={base} strokeWidth="4" opacity=".69"/>}
    </>}
  </g>;
}
