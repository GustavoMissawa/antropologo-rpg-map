import {SHEET_DIE_SURFACES} from './sheet-die-paths.ts';
export type AmbientRect={x:number;y:number;width:number;height:number};
export type AmbientDie={id:number;faces:number;x:number;y:number;size:number;angle:number;duration:number;delay:number;dx:number;dy:number;phase:'visible'|'fading'|'waiting'};
export type AmbientPoint={x:number;y:number};
const shapes=[20,8,12,6,10,4,20,8,12,6];
export function ambientPolygon(faces:number):AmbientPoint[]{return [...SHEET_DIE_SURFACES[faces].matchAll(/[ML]([\d.]+)\s+([\d.]+)/g)].map(m=>({x:Number(m[1]),y:Number(m[2])}));}
export function pointInAmbientPolygon(point:AmbientPoint,polygon:AmbientPoint[]):boolean{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
export function createAmbientDice(width:number,height:number,mobile:boolean):AmbientDie[]{
 const positions=mobile?[[.08,.08],[.64,.31],[.31,.6],[.82,.88]]:[[.04,.08],[.39,.13],[.83,.04],[.17,.39],[.61,.36],[.94,.49],[.33,.67],[.74,.72],[.08,.89],[.52,.94]],count=mobile?(height<350?3:4):height<420?6:10;
 return Array.from({length:count},(_,id)=>{const size=Math.max(28,Math.min(mobile?92+id%3*9:108+id%4*16,width*.3,height*.28));return {id,faces:shapes[id],x:4+positions[id][0]*Math.max(0,width-size-8),y:4+positions[id][1]*Math.max(0,height-size-8),size,angle:(id*37)%43-21,duration:14+id%11,delay:-id*3.7,dx:2+id%5,dy:4+id%7,phase:'visible'};});
}
function overlap(a:AmbientRect,b:AmbientRect){return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));}
/** Bounded candidates, no physics loop and no new decorative object. */
export function relocateAmbientDie(die:AmbientDie,width:number,height:number,others:AmbientDie[],blocked:AmbientRect[],cursor:AmbientPoint,random:()=>number=Math.random):AmbientPoint|null{
 const size=die.size,margin=8,maxX=width-size-margin,maxY=height-size-margin;if(maxX<margin||maxY<margin)return null;
 const rows=[maxY,margin,...blocked.flatMap(b=>[b.y+b.height+margin,b.y-size-margin])].filter(y=>y>=margin&&y<=maxY);
 for(let i=0;i<64;i++){const slot=i-16,fraction=i<16?random():(slot%5)/4,x=margin+fraction*(maxX-margin),y=i<16?margin+random()*(maxY-margin):rows[Math.floor(slot/5)%rows.length],r={x,y,width:size,height:size};if(Math.hypot(x-die.x,y-die.y)<size*1.2||Math.hypot(x+size/2-cursor.x,y+size/2-cursor.y)<size+75)continue;if(blocked.some(b=>overlap(r,b)>0))continue;if(others.some(other=>other.id!==die.id&&Math.hypot(x+size/2-other.x-other.size/2,y+size/2-other.y-other.size/2)<(size+other.size)*.65))continue;return {x,y};}return null;
}
