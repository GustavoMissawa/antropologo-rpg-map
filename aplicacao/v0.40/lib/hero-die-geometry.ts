/** A centered, unit-radius icosahedron, independent of the rolling dice engine. */
export type Point3 = [number,number,number];
const phi=(1+Math.sqrt(5))/2, radius=Math.hypot(1,phi);
export const HERO_VERTICES:Point3[]=[...[1,-1].flatMap(a=>[1,-1].map(b=>[0,a,b*phi] as Point3)),...[1,-1].flatMap(a=>[1,-1].map(b=>[a,b*phi,0] as Point3)),...[1,-1].flatMap(a=>[1,-1].map(b=>[b*phi,0,a] as Point3))].map(v=>v.map(c=>c/radius) as Point3);
export const HERO_EDGES:[number,number][]=[];
for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)if(Math.abs(Math.hypot(...HERO_VERTICES[i].map((c,k)=>c-HERO_VERTICES[j][k]) as Point3)-2/radius)<1e-6)HERO_EDGES.push([i,j]);
export function rotateHeroPoint([x,y,z]:Point3,[rx,ry,rz]:Point3):Point3{
 const y1=y*Math.cos(rx)-z*Math.sin(rx),z1=y*Math.sin(rx)+z*Math.cos(rx);
 const x2=x*Math.cos(ry)+z1*Math.sin(ry),z2=-x*Math.sin(ry)+z1*Math.cos(ry);
 return [x2*Math.cos(rz)-y1*Math.sin(rz),x2*Math.sin(rz)+y1*Math.cos(rz),z2];
}
export function heroDieFrame(angles:Point3){
 const vertices=HERO_VERTICES.map(p=>rotateHeroPoint(p,angles));
 const projected=vertices.map(([x,y,z])=>({x:100+x*77/(1-z*.13),y:100+y*77/(1-z*.13),z}));
 const sorted=[...projected].sort((a,b)=>a.x-b.x||a.y-b.y);
 const cross=(a:typeof sorted[number],b:typeof sorted[number],c:typeof sorted[number])=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=(ps:typeof sorted)=>{const h:typeof sorted=[];for(const p of ps){while(h.length>1&&cross(h[h.length-2],h[h.length-1],p)<=0)h.pop();h.push(p);}return h.slice(0,-1);};
 return {hull:[...half(sorted),...half([...sorted].reverse())].map(p=>`${p.x},${p.y}`).join(' '),edges:HERO_EDGES.map(([i,j])=>({d:`M${projected[i].x} ${projected[i].y}L${projected[j].x} ${projected[j].y}`,opacity:(projected[i].z+projected[j].z)/2<-.12?.2:.85}))};
}
