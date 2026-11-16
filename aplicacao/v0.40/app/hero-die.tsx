'use client';
import {useEffect,useRef} from 'react';
import {heroDieFrame,type Point3} from '../lib/hero-die-geometry';
import {solidDieFrame} from '../lib/decorative-polyhedra';
import {advanceAmbientMotion,emptyAmbientMotion} from '../lib/ambient-interaction';
import {pointInAmbientPolygon} from '../lib/ambient-dice';
const initial:Point3=[.22,.36,.22];
export function HeroDie({faces=20,ambient=false,active=true,onMotionThreshold}:{faces?:number;ambient?:boolean;active?:boolean;onMotionThreshold?:(cursor:{x:number;y:number})=>void}){
 const staticFrame=solidDieFrame(faces,initial),wireFrame=heroDieFrame(initial);
 const ref=useRef<SVGSVGElement>(null),interaction=useRef({active,onMotionThreshold});interaction.current={active,onMotionThreshold};
 useEffect(()=>{
  const svg=ref.current;if(!svg)return;
  const fine=matchMedia('(hover:hover) and (pointer:fine)'),narrow=matchMedia('(max-width:790px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let angles:Point3=[...initial],target:Point3=[...initial],last:{x:number;y:number}|null=null,frame=0,visible=true,previous=0;
  let motion=emptyAmbientMotion();
  const paths=svg.querySelectorAll<SVGPathElement>('.hero-die-edge');let drawn=solidDieFrame(faces,initial);
  function allowed(){return interaction.current.active&&fine.matches&&!narrow.matches&&!reduced.matches&&visible&&document.visibilityState==='visible';}
  function paint(){if(!ambient){const next=heroDieFrame(angles);next.edges.forEach((edge,i)=>{paths[i].setAttribute('d',edge.d);paths[i].setAttribute('opacity',String(edge.opacity));});svg?.querySelector('polygon')?.setAttribute('points',next.hull);return;}drawn=solidDieFrame(faces,angles);drawn.forEach((e,i)=>{paths[i].setAttribute('d',e.d);paths[i].setAttribute('visibility',e.visible?'visible':'hidden');paths[i].style.fill=`color-mix(in srgb,var(--palette-value) ${e.shade}%,var(--bg))`;});}
  function stop(){motion=emptyAmbientMotion();cancelAnimationFrame(frame);frame=0;previous=0;last=null;target=[...angles];}
  function tick(now:number){frame=0;if(!allowed()){stop();return;}const dt=previous?Math.min(40,now-previous):16;previous=now;const amount=1-Math.exp(-dt/65);let difference=0;angles=angles.map((a,i)=>{difference+=Math.abs(target[i]-a);return a+(target[i]-a)*amount;}) as Point3;paint();if(difference>.0003)frame=requestAnimationFrame(tick);else previous=0;}
  function move(e:PointerEvent){if(e.pointerType!=='mouse'||!allowed()){last=null;motion=emptyAmbientMotion();return;}if(ambient){if(e.target instanceof Element&&e.target.closest('button,a,input,textarea,select,[contenteditable],dialog,.discovery-hero,.content-rail-heading,.discovery-card,.discovery-tools,.test-notice,.rule-article,.rules-index,.sheet-map,.calendar-panel,.pdf-card,p,h1,h2,h3,h4,label')){last=null;motion=emptyAmbientMotion();return;}if(!svg?.getScreenCTM||!svg.createSVGPoint)return;const matrix=svg.getScreenCTM();if(!matrix){last=null;motion=emptyAmbientMotion();return;}const point=svg!.createSVGPoint();point.x=e.clientX;point.y=e.clientY;const local=point.matrixTransform(matrix.inverse());if(!drawn.some(f=>f.visible&&pointInAmbientPolygon(local,f.points))){last=null;motion=emptyAmbientMotion();return;}}
   const bounds=svg!.getBoundingClientRect();if(!bounds.width||!bounds.height)return;if(last&&ambient&&interaction.current.onMotionThreshold){const next=advanceAmbientMotion(motion,performance.now(),e.clientX!==last.x||e.clientY!==last.y);motion=next.state;if(next.triggered){stop();interaction.current.onMotionThreshold({x:e.clientX,y:e.clientY});return;}}
   if(last){const dx=(e.clientX-last.x)/bounds.width,dy=(e.clientY-last.y)/bounds.height;target[0]+=Math.max(-.35,Math.min(.35,dy*4));target[1]+=Math.max(-.35,Math.min(.35,dx*4));if(!frame)frame=requestAnimationFrame(tick);}last={x:e.clientX,y:e.clientY};}
  function leave(){last=null;motion=emptyAmbientMotion();}
  function preference(){if(!allowed())stop();}
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;if(!visible)stop();});observer?.observe(svg);
  const source=ambient?document:svg;source.addEventListener('pointermove',move as EventListener);svg.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',preference);
  for(const media of [fine,narrow,reduced])media.addEventListener('change',preference);
  return()=>{stop();observer?.disconnect();source.removeEventListener('pointermove',move as EventListener);svg.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',preference);for(const media of [fine,narrow,reduced])media.removeEventListener('change',preference);};
 },[faces,ambient]);
 return <svg ref={ref} className={'hero-die-3d'+(ambient?' ambient-solid-die':'')} viewBox="0 0 200 200" fill="none" aria-hidden="true" focusable="false">{ambient?staticFrame.map((face,i)=><path key={i} className="hero-die-edge hero-die-face" d={face.d} visibility={face.visible?'visible':'hidden'} style={{fill:`color-mix(in srgb,var(--palette-value) ${face.shade}%,var(--bg))`}}/>):<><polygon className="hero-die-hit" points={wireFrame.hull} fill="transparent" stroke="none"/>{wireFrame.edges.map((edge,i)=><path key={i} className="hero-die-edge" d={edge.d} opacity={edge.opacity}/>)}</>}</svg>;
}
