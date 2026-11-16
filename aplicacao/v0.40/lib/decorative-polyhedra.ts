import {HERO_VERTICES,rotateHeroPoint,type Point3} from './hero-die-geometry.ts';
const dot=(a:Point3,b:Point3)=>a.reduce((n,c,i)=>n+c*b[i],0);
const sub=(a:Point3,b:Point3)=>a.map((c,i)=>c-b[i]) as Point3;
const cross=(a:Point3,b:Point3):Point3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(a:Point3)=>a.map(c=>c/Math.hypot(...a)) as Point3;
function facesOf(v:Point3[]){const found=new Map<string,number[]>();for(let a=0;a<v.length;a++)for(let b=a+1;b<v.length;b++)for(let c=b+1;c<v.length;c++){
 let n=cross(sub(v[b],v[a]),sub(v[c],v[a]));if(Math.hypot(...n)<1e-7)continue;n=unit(n);let d=dot(n,v[a]);const distances=v.map(p=>dot(n,p)-d);if(distances.some(x=>x>1e-6)&&distances.some(x=>x< -1e-6))continue;if(d<0){n=n.map(x=>-x) as Point3;d=-d;}
 const ids=v.map((p,i)=>Math.abs(dot(n,p)-d)<1e-6?i:-1).filter(i=>i>=0),key=ids.join(',');if(found.has(key))continue;const center=ids.reduce((p,i)=>p.map((x,k)=>x+v[i][k]/ids.length) as Point3,[0,0,0] as Point3),u=unit(sub(v[ids[0]],center)),w=cross(n,u);ids.sort((i,j)=>Math.atan2(dot(sub(v[i],center),w),dot(sub(v[i],center),u))-Math.atan2(dot(sub(v[j],center),w),dot(sub(v[j],center),u)));found.set(key,ids);
 }return [...found.values()];}
function dual(v:Point3[]){return facesOf(v).map(ids=>{const n=unit(cross(sub(v[ids[1]],v[ids[0]]),sub(v[ids[2]],v[ids[0]]))),d=dot(n,v[ids[0]]);return n.map(c=>c/d) as Point3;});}
function model(v:Point3[]){const r=Math.max(...v.map(p=>Math.hypot(...p)));const vertices=v.map(p=>p.map(x=>x/r) as Point3);return {vertices,faces:facesOf(vertices)};}
const cube:Point3[]=[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x,y,z] as Point3)));
const antiprism:Point3[]=Array.from({length:10},(_,i)=>{const angle=(i%5)*Math.PI*2/5+(i<5?0:Math.PI/5);return [Math.cos(angle),Math.sin(angle),i<5?.5:-.5];});
export const DECORATIVE_MODELS:Record<number,ReturnType<typeof model>>={4:model([[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]]),6:model(cube),8:model([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]),10:model(dual(antiprism).map(([x,y,z])=>[x,z,-y])),12:model(dual(HERO_VERTICES)),20:model(HERO_VERTICES)};
export function solidDieFrame(faces:number,angles:Point3){const m=DECORATIVE_MODELS[faces]||DECORATIVE_MODELS[20],v=m.vertices.map(p=>rotateHeroPoint(p,angles));const p=v.map(([x,y,z])=>({x:100+x*77/(1-z*.13),y:100+y*77/(1-z*.13)}));return m.faces.map(ids=>{const n=unit(cross(sub(v[ids[1]],v[ids[0]]),sub(v[ids[2]],v[ids[0]])));return {visible:dot(n,sub([0,0,1/.13],v[ids[0]]))>1e-7,points:ids.map(i=>p[i]),d:ids.map((i,k)=>`${k?'L':'M'}${p[i].x} ${p[i].y}`).join('')+'Z',depth:ids.reduce((s,i)=>s+v[i][2]/ids.length,0),shade:Math.round(3+Math.max(0,dot(n,unit([-.4,-.6,1])))*9)};}).sort((a,b)=>a.depth-b.depth);}
