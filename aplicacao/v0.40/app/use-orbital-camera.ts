'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import {
  cameraAt, lunarOrbit, makeCameraMotion, orbitPosition, overviewCamera, solarOrbit, targetCamera,
  type Camera, type CameraMotion, type OrbitalView,
} from '../lib/orbital-camera';
import type { OrbitalMoon, OrbitalPlanet, OrbitalTopic, PlanetarySystem } from '../lib/orbital-system';

type Rendering = {
  stage: RefObject<HTMLDivElement | null>;
  svg: RefObject<SVGSVGElement | null>;
  world: RefObject<SVGGElement | null>;
  system: PlanetarySystem;
  topic?: OrbitalTopic;
  topicId?: string;
  planets: OrbitalPlanet[];
  moons: OrbitalMoon[];
  view: OrbitalView;
  arrival: boolean;
};

const bounded = (value: number, limit: number) => Math.max(-limit,Math.min(limit,value));
const position = (x: number, y: number) => `translate(${x.toFixed(2)} ${y.toFixed(2)})`;

export function useOrbitalCamera({stage, svg, world, system, topic, topicId, planets, moons, view, arrival}: Rendering) {
  const camera = useRef<Camera>(overviewCamera);
  const previous = useRef<{id?: string} | null>(null);
  const clock = useRef(0);
  useLayoutEffect(() => {
    const frame = stage.current, viewport = svg.current, layer = world.current;
    if (!frame || !viewport || !layer) return;
    const starLayers = Array.from(frame.querySelectorAll<HTMLElement>('[data-star-layer]'));
    const track = layer.querySelector('[data-moon-tracks]');
    const byId = new Map(planets.map(item => [item.id,item] as const));
    const byMoonId = new Map(moons.map(item => [item.id,item] as const));
    const nodes = Array.from(layer.querySelectorAll<SVGAElement>('[data-world-body]'), link => {
      const id = link.dataset.worldBody!;
      const planet = byId.get(id);
      const moon = byMoonId.get(id);
      const label = link.querySelector<SVGGElement>('[data-world-label]')!;
      return {link,planet,moon,label,offset:Number(label.dataset.offset),length:Number(label.dataset.labelWidth),
        priority:link.dataset.labelPriority,visible:undefined as boolean | undefined,labelVisible:undefined as boolean | undefined};
    }).sort((a,b) => Number(b.priority==='selected')-Number(a.priority==='selected'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = frame.clientWidth || 980;
    let height = frame.clientHeight || 560;
    let compact = width < 610;
    let visible = true;
    let raf = 0, lastFrame = 0, lastPaint = 0;
    const arriving = arrival && previous.current===null;
    const navigating = arriving || previous.current!==null;
    let flight: CameraMotion | null = navigating && view!=='reading' && !reduced.matches && frame.clientWidth && !document.hidden
      ? makeCameraMotion(system,previous.current?.id,topicId,camera.current,arriving,compact) : null;
    let flightStart = 0;
    if (flight) frame.dataset.cameraMotion = flight.kind;
    previous.current = {id:topicId};

    function measure() {
      width = frame!.clientWidth || 980;
      height = frame!.clientHeight || 560;
      compact = width < 610;
      viewport!.setAttribute('viewBox',`0 0 ${width} ${height}`);
    }

    function paint(now: number) {
      const target = targetCamera(topic,clock.current,compact);
      const parent = topic ? orbitPosition(topic.planet.orbit,solarOrbit,clock.current) : undefined;
      if (flight) {
        flightStart ||= now;
        const progress = Math.min(1,(now-flightStart)/flight.duration);
        camera.current = cameraAt(flight,target,progress,parent);
        if (progress === 1) {
          flight = null;
          delete frame!.dataset.cameraMotion;
        }
      } else {
        camera.current = target;
      }
      const pose = camera.current;
      const scale = Math.min(width/978,height/(compact ? 530 : 545))*pose.zoom;
      const origin = {x:width*.50,y:height*(compact?.53:.54)};
      layer!.setAttribute('transform', `${position(origin.x,origin.y)} scale(${scale.toFixed(4)}) ${position(-pose.x,-pose.y)}`);
      if (track && parent) track.setAttribute('transform',position(parent.x,parent.y));
      starLayers.forEach((stars,i) => {
        const strength = i===0?.10:.29;
        const shiftX = bounded(-pose.x*scale*strength, width*.14);
        const shiftY = bounded(-pose.y*scale*strength, height*.14);
        stars.style.transform = `translate3d(${shiftX.toFixed(1)}px,${shiftY.toFixed(1)}px,0)`;
      });

      const occupied: {x:number;y:number;width:number}[] = [];
      for (const node of nodes) {
        const {link,planet,moon,label,offset,length,priority} = node;
        const point = planet ? orbitPosition(planet.orbit,solarOrbit,clock.current)
          : moon ? orbitPosition(moon.orbit,lunarOrbit,clock.current) : {x:0,y:0};
        const x = point.x + (moon && parent ? parent.x : 0);
        const y = point.y + (moon && parent ? parent.y : 0);
        link.setAttribute('transform',position(x,y));
        const screenX = origin.x+(x-pose.x)*scale;
        const screenY = origin.y+(y-pose.y)*scale;
        const inFrame = screenX>=15&&screenX<=width-15&&screenY>=15&&screenY<=height-15;
        if (node.visible!==inFrame) {
          node.visible=inFrame;
          link.setAttribute('tabindex',inFrame&&view!=='reading'?'0':'-1');
          if(inFrame)link.removeAttribute('aria-hidden');
          else if(document.activeElement!==link)link.setAttribute('aria-hidden','true');
        }
        const below=offset*scale+11;
        const offsetY=screenY+below>height-47 ? -offset*scale-19 : below;
        const labelY=screenY+offsetY;
        const labelX=Math.max(length/2+5,Math.min(width-length/2-5,screenX));
        const show = inFrame&&priority!=='remote'
          && labelY>69&&labelY<height-47
          && !occupied.some(other=>Math.abs(other.y-labelY)<19&&Math.abs(other.x-labelX)<(other.width+length)/2+7);
        if (show) occupied.push({x:labelX,y:labelY,width:length});
        if (node.labelVisible!==show) {
          label.dataset.display=String(show);
          node.labelVisible=show;
        }
        label.setAttribute('transform',`${position((labelX-screenX)/scale,offsetY/scale)} scale(${(1/scale).toFixed(4)})`);
      }
    }

    const playing = () => view!=='reading'&&!reduced.matches&&!document.hidden&&visible&&!!frame.clientWidth;
    function tick(now: number) {
      raf = 0;
      if (!playing()) return;
      clock.current += lastFrame ? Math.min(68,now-lastFrame)/1000 : 0;
      lastFrame = now;
      if (flight || now-lastPaint >= (compact ? 40 : 31)) {
        lastPaint = now;
        paint(now);
      }
      raf = requestAnimationFrame(tick);
    }
    function refresh() {
      if (!playing()) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        lastFrame = 0;
        flight = null;
        delete frame!.dataset.cameraMotion;
      }
      paint(window.performance.now());
      if (playing() && !raf) raf = requestAnimationFrame(tick);
    }
    function resize() { measure(); refresh(); }
    measure();
    refresh();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(frame);
    const visibilityObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry])=>{
      visible=entry.isIntersecting;
      refresh();
    });
    visibilityObserver?.observe(frame);
    if (!resizeObserver) window.addEventListener('resize',resize,{passive:true});
    reduced.addEventListener('change',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{
      if (raf) cancelAnimationFrame(raf);
      delete frame.dataset.cameraMotion;
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      window.removeEventListener('resize',resize);
      reduced.removeEventListener('change',refresh);
      document.removeEventListener('visibilitychange',refresh);
    };
  },[stage,svg,world,system,topic,topicId,planets,moons,view,arrival]);
}
