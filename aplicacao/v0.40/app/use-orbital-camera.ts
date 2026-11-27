'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import {
  cameraAt, makeCameraMotion, overviewCamera, targetCamera,
  type Camera, type CameraMotion, type OrbitalView,
} from '../lib/orbital-camera';
import { lunarOrbit, mapFrame, orbitPosition, placeMapLabel, solarOrbit, starMapRadius, type MapBody } from '../lib/orbital-layout';
import type { OrbitalMoon, OrbitalPlanet, OrbitalTopic, PlanetarySystem } from '../lib/orbital-system';
import type { SystemApproach } from '../lib/system-approach';

type Rendering = {
  stage: RefObject<HTMLDivElement | null>;
  svg: RefObject<SVGSVGElement | null>;
  world: RefObject<SVGGElement | null>;
  system: PlanetarySystem;
  topic?: OrbitalTopic;
  topicId?: string;
  planets: MapBody<OrbitalPlanet>[];
  moons: MapBody<OrbitalMoon>[];
  view: OrbitalView;
  approachRef: RefObject<SystemApproach | null>;
};

const bounded = (value: number, limit: number) => Math.max(-limit,Math.min(limit,value));
const position = (x: number, y: number) => `translate(${x.toFixed(2)} ${y.toFixed(2)})`;

export function useOrbitalCamera({stage, svg, world, system, topic, topicId, planets, moons, view, approachRef}: Rendering) {
  const camera = useRef<Camera>(overviewCamera);
  const previous = useRef<{id?: string} | null>(null);
  const clock = useRef(0);
  useLayoutEffect(() => {
    const frame = stage.current, viewport = svg.current, layer = world.current;
    if (!frame || !viewport || !layer) return;
    const pendingApproach = approachRef.current;
    const approach = pendingApproach?.bookId === system.id && view === 'exploration' ? pendingApproach : null;
    const starLayers = Array.from(frame.querySelectorAll<HTMLElement>('[data-star-layer]'));
    const sky = frame.querySelector<HTMLElement>('.orbital-system-sky')!;
    const track = layer.querySelector('[data-moon-tracks]');
    const star = layer.querySelector<SVGGElement>('.orbital-map-star')!;
    const bodies = layer.querySelector<SVGGElement>('.orbital-map-bodies')!;
    const solarTracks = layer.querySelector<SVGGElement>('.orbital-solar-tracks')!;
    const caption = frame.parentElement?.querySelector<HTMLElement>('.orbital-system-caption');
    const actions = frame.parentElement?.querySelector<HTMLElement>('.orbital-map-actions');
    const byId = new Map([...planets,...moons].map(item => [item.body.id,item] as const));
    const host = topic && byId.get(topic.planet.id);
    const satellite = topic?.moon && byId.get(topic.moon.id);
    const nodes = Array.from(layer.querySelectorAll<SVGAElement>('[data-world-body]'), link => {
      const item = byId.get(link.dataset.worldBody!)!;
      const label = link.querySelector<SVGGElement>('[data-world-label]')!;
      const priority = link.dataset.labelPriority;
      return {link,item,label, moon:'planetId' in item.body,length:Number(label.dataset.labelWidth),
        priority,visible:undefined as boolean | undefined,labelVisible:undefined as boolean | undefined};
    });
    const priorities = new Map([['selected',0],['host',1],['local',2],['remote',3]]);
    nodes.sort((a,b)=>priorities.get(a.priority!)! - priorities.get(b.priority!)!);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = frame.clientWidth || 980;
    let height = frame.clientHeight || 560;
    let compact = width < 610;
    let framing = mapFrame(width,height,85,46);
    let left = 0, top = 0;
    let lastArrivalAim = {x: 0, y: 0};
    let visible = true;
    let raf = 0, lastFrame = 0, lastPaint = 0;
    const arriving = () => !!approach?.active;
    let fadedForArrival = false;
    let flight: CameraMotion | null = previous.current !== null && !arriving() && view!=='reading' && !reduced.matches && frame.clientWidth && !document.hidden
      ? makeCameraMotion(system,previous.current.id,topicId,camera.current,compact) : null;
    let flightStart = 0;
    if (flight) frame.dataset.cameraMotion = flight.kind;
    if (arriving()) frame.dataset.cameraMotion = 'arrival';
    previous.current = {id:topicId};

    function measure() {
      width = frame!.clientWidth || 980;
      height = frame!.clientHeight || 560;
      compact = width < 610;
      viewport!.setAttribute('viewBox',`0 0 ${width} ${height}`);
      framing = mapFrame(width, height, (caption?.offsetHeight || 80) + 4, actions ? actions.offsetHeight + (compact ? 19 : 28) : 23);
      if (approach) {
        const rect = frame!.getBoundingClientRect();
        left = rect.left;
        top = rect.top + window.scrollY;
      }
      for (const node of nodes) {
        const labelText = node.label.querySelector('text');
        node.length = (labelText?.getComputedTextLength?.() || Number(node.label.dataset.labelWidth)) + 5;
      }
    }

    function paint(now: number) {
      const incoming = approach?.active && !approach.frame.complete ? approach.frame : null;
      const parent = host && orbitPosition(host.orbit,solarOrbit,clock.current);
      const moonPoint = satellite && orbitPosition(satellite.orbit,lunarOrbit,clock.current);
      const target = targetCamera(parent,moonPoint,moons.length>0,framing);
      if (incoming) {
        const zoom = incoming.arrivalZoom;
        const scale = framing.scale * zoom;
        camera.current = {
          x: width * (compact ? .025 : .072) * incoming.arrivalBearing / scale,
          y: height * .19 * incoming.arrivalBearing / scale,
          zoom,
        };
        sky.style.opacity = String(incoming.arrivalSky);
        star.style.opacity = String(incoming.arrivalStar);
        bodies.style.opacity = String(incoming.arrivalPlanets);
        solarTracks.style.opacity = String(incoming.arrivalTracks);
        fadedForArrival = true;
      } else if (flight) {
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
      if (!incoming && fadedForArrival) {
        [sky, star, bodies, solarTracks, ...nodes.map(node => node.label)]
          .forEach(element => element.style.removeProperty('opacity'));
        fadedForArrival = false;
      }
      const pose = camera.current;
      const {center:origin,bounds} = framing;
      const scale = framing.scale * pose.zoom;
      const project = (x: number,y: number,radius: number) => ({
        x: origin.x + (x-pose.x)*scale, y: origin.y + (y-pose.y)*scale, radius:radius*scale,
      });
      const projectionFits = ({x,y,radius}: {x:number;y:number;radius:number}) =>
        x-radius>=bounds.left && x+radius<=bounds.right && y-radius>=bounds.top && y+radius<=bounds.bottom;
      const inLocalField = (x:number,y:number,radius:number) => !!parent &&
        Math.hypot((x-parent.x)*.81,y-parent.y) < (moons.length ? 119 : (host?.footprint ?? 0)+15) + radius;
      const starRadius = starMapRadius(system.star) * (system.star.central.archetype === 'black-hole' ? 1.8 : 1);
      const projectedStar = project(0,0,starRadius);
      const showStar = !parent || (!inLocalField(0,0,starRadius) && projectionFits(projectedStar));
      const starState = String(showStar);
      if (star.dataset.inFrame!==starState) star.dataset.inFrame = starState;
      layer!.setAttribute('transform', `${position(origin.x,origin.y)} scale(${scale.toFixed(4)}) ${position(-pose.x,-pose.y)}`);
      if (track && parent) track.setAttribute('transform',position(parent.x,parent.y));
      starLayers.forEach((stars,i) => {
        const strength = i===0?.10:.29;
        const shiftX = bounded(-pose.x*scale*strength, width*.14);
        const shiftY = bounded(-pose.y*scale*strength, height*.14);
        const depth = incoming ? 1 + incoming.arrivalBearing * (i === 0 ? .16 : .36) : 1;
        stars.style.transform = `translate3d(${shiftX.toFixed(1)}px,${shiftY.toFixed(1)}px,0)${depth === 1 ? '' : ` scale(${depth})`}`;
      });

      const disks = showStar ? [projectedStar] : [];
      const visibleNodes = [];
      for (const node of nodes) {
        const {item,moon,link,priority} = node;
        const point = orbitPosition(item.orbit,moon ? lunarOrbit : solarOrbit,clock.current);
        const x = point.x + (moon && parent ? parent.x : 0);
        const y = point.y + (moon && parent ? parent.y : 0);
        const growth = item===host ? 1 + .30 * Math.max(0,Math.min(1,pose.zoom-1)) : 1;
        const bodyScale = scale * growth;
        link.setAttribute('transform',growth===1 ? position(x,y) : `${position(x,y)} scale(${growth.toFixed(4)})`);
        const disk = project(x,y,item.radius * growth * (item.body.appearance.rings ? 1.12 : 1));
        const footprint = project(x,y,item.footprint * growth);
        const remote = priority==='remote';
        const inFrame = projectionFits(footprint) && (!remote || !inLocalField(x,y,item.footprint));
        if (node.visible!==inFrame) {
          node.visible=inFrame;
          link.dataset.inFrame=String(inFrame);
          link.setAttribute('tabindex',inFrame&&view!=='reading'?'0':'-1');
          if(inFrame)link.removeAttribute('aria-hidden');
          else if(document.activeElement!==link)link.setAttribute('aria-hidden','true');
        }
        if (inFrame) {
          disks.push(disk);
          visibleNodes.push({node,disk,bodyScale});
        } else if (node.labelVisible) {
          node.labelVisible=false;
          node.label.dataset.display='false';
        }
      }
      const labels: NonNullable<ReturnType<typeof placeMapLabel>>[] = [];
      for (const {node,disk,bodyScale} of visibleNodes) {
        const label = (!incoming || incoming.arrivalLabels > 0) && (node.priority!=='remote' || node.link===document.activeElement)
          ? placeMapLabel(disk,node.length,bounds,disks,labels) : null;
        if (node.labelVisible!==!!label) {
          node.labelVisible=!!label;
          node.label.dataset.display=String(!!label);
        }
        if (incoming) node.label.style.opacity = String(label ? incoming.arrivalLabels : 0);
        if (!label) continue;
        labels.push(label);
        node.label.setAttribute('transform',`${position((label.x-disk.x)/bodyScale,(label.y-disk.y)/bodyScale)} scale(${(1/bodyScale).toFixed(4)})`);
      }
      if (approach?.active) lastArrivalAim = {x: left + projectedStar.x, y: top + projectedStar.y};
    }

    const playing = () => !arriving()&&view!=='reading'&&!reduced.matches&&!document.hidden&&visible&&!!frame.clientWidth;
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
      const running = playing();
      frame!.dataset.celestialMotion = running ? 'running' : 'paused';
      if (!running) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        lastFrame = 0;
        flight = null;
        if (!arriving()) delete frame!.dataset.cameraMotion;
      }
      paint(window.performance.now());
      if (running && !raf) raf = requestAnimationFrame(tick);
    }
    function resize() { measure(); refresh(); }
    if (approach) {
      approach.paintSystem = (seconds) => {
        const scrollTop = window.scrollY;
        if (!reduced.matches) clock.current += seconds;
        // Until the destination becomes visible, its bearing is constant.
        if (approach.frame.arrivalStar > 0) paint(performance.now());
        return {x: lastArrivalAim.x, y: lastArrivalAim.y - scrollTop};
      };
      approach.resumeSystem = refresh;
    }
    measure();
    refresh();
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    resizeObserver?.observe(frame);
    if (caption) resizeObserver?.observe(caption);
    if (actions) resizeObserver?.observe(actions);
    frame.addEventListener('focusin',refresh);
    frame.addEventListener('focusout',refresh);
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
      delete frame.dataset.celestialMotion;
      if (approach) {
        delete approach.paintSystem;
        delete approach.resumeSystem;
      }
      if (fadedForArrival) [sky, star, bodies, solarTracks, ...nodes.map(node => node.label)]
        .forEach(element => element.style.removeProperty('opacity'));
      resizeObserver?.disconnect();
      frame.removeEventListener('focusin',refresh);
      frame.removeEventListener('focusout',refresh);
      visibilityObserver?.disconnect();
      window.removeEventListener('resize',resize);
      reduced.removeEventListener('change',refresh);
      document.removeEventListener('visibilitychange',refresh);
    };
  },[stage,svg,world,system,topic,topicId,planets,moons,view,approachRef]);
}
