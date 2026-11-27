import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraAt, makeCameraMotion, overviewCamera, targetCamera } from '../lib/orbital-camera.ts';
import { makeAB10Rulebook } from '../lib/model.ts';
import { arrangeOrbitTracks, lunarOrbit, mapFrame, moonMapLimit, orbitPosition, placeMapLabel, planetMapLimit, solarOrbit, starMapRadius } from '../lib/orbital-layout.ts';
import { createPlanetarySystem, visibleOrbitalBodies } from '../lib/orbital-system.ts';
import { parsePlatformHash, platformHref } from '../lib/platform-navigation.ts';

const system=createPlanetarySystem(makeAB10Rulebook());
const planets=arrangeOrbitTracks(system.planets,'solar');
const at=(id,compact=false)=>{
  const {planet,moon}=system.topics.get(id);
  const parent=orbitPosition(planets.find(item=>item.body===planet).orbit,solarOrbit,0);
  const satellite=moon&&arrangeOrbitTracks(planet.moons,'lunar').find(item=>item.body===moon);
  return targetCamera(parent,satellite&&orbitPosition(satellite.orbit,lunarOrbit,0),
    planet.moons.length>0,mapFrame(compact?360:900,520,78,65));
};

test('Mapa, foco orbital e links legados de leitura têm rotas estáveis',()=>{
  const focus={page:'rules',bookId:'ab10',topicId:'derived',view:'orbit'};
  assert.equal(platformHref(focus),'#regras/ab10/topico/derived/orbita');
  assert.deepEqual(parsePlatformHash(platformHref(focus)),focus);
  assert.deepEqual(parsePlatformHash('#regras/ab10/topico/derived'),{page:'rules',bookId:'ab10',topicId:'derived'});
  assert.equal(parsePlatformHash('#regras/ab10/topico/derived/orbita/invalido'),null);
  assert.equal(platformHref({...focus,anchorId:'resultado'}),'#regras/ab10/topico/derived/secao/resultado');
});

test('Câmera chega ao planeta e às luas usando as posições dos mesmos corpos',()=>{
  const planet=system.topics.get('character').planet;
  const parent=orbitPosition(planets.find(item=>item.body===planet).orbit,solarOrbit,0);
  const first=at('attributes'), second=at('skills');
  assert.equal(at('character').x,parent.x);
  assert.notDeepEqual(first,second);
  assert.notEqual(at('skills',true).x,at('character',true).x);
  const travel=makeCameraMotion(system,'attributes','skills',first,false);
  assert.equal(travel.kind,'orbit');
  const middle=cameraAt(travel,second,.5,parent);
  assert.deepEqual(cameraAt(travel,second,0,parent),first);
  assert.deepEqual(cameraAt(travel,second,1,parent),second);
  assert(Math.hypot(middle.x-parent.x,middle.y-parent.y)>12);
  assert.notDeepEqual(orbitPosition(planet.orbit,solarOrbit,28),parent);
});

test('Câmera distingue viagem próxima e distante e redireciona a partir do quadro atual',()=>{
  const early=at('character'), goal=at('welcome');
  const jump=makeCameraMotion(system,'character','welcome',early,false);
  assert.equal(jump.kind,'jump');
  const between=cameraAt(jump,goal,.4);
  assert(between.zoom<Math.min(early.zoom,goal.zoom));
  assert.deepEqual(cameraAt(jump,goal,1),goal);
  const revised=makeCameraMotion(system,'welcome','magic',between,false);
  assert.deepEqual(cameraAt(revised,at('magic'),0),between);
  assert.equal(makeCameraMotion(system,'dice','magic',at('dice'),false).kind,'lateral');
  assert.equal(makeCameraMotion(system,undefined,undefined,overviewCamera,false),null);
});

test('O mapa distribui trilhas sem alterar os corpos e preserva folga nas duas famílias durante a rotação',()=>{
  const chapter=(id,children=[])=>({id,title:id,content:'',status:'draft',children});
  const chapters=Array.from({length:128},(_,i)=>chapter('cap-'+i,i?[]:Array.from({length:64},(_,j)=>chapter('lua-'+j))));
  for(let seed=0;seed<96;seed++){
    const scene=createPlanetarySystem({id:'plano-'+seed,name:'Plano',chapters});
    const known=structuredClone(scene);
    const starRadius=starMapRadius(scene.star);
    const planets=arrangeOrbitTracks(visibleOrbitalBodies(scene.planets,planetMapLimit,scene.planets.at(-1)),'solar');
    const moons=arrangeOrbitTracks(visibleOrbitalBodies(scene.planets[0].moons,moonMapLimit,scene.planets[0].moons.at(-1)),'lunar');
    assert.deepEqual(scene,known);
    assert(planets.some(item=>item.body.id==='cap-127'));
    assert(moons.some(item=>item.body.id==='lua-63'));
    for(const [placed,plane,minTrack] of [[planets,solarOrbit,9],[moons,lunarOrbit,3]]){
      for(const [i,item] of placed.entries()){
        const minimum=plane===solarOrbit?starRadius:Math.max(...planets.map(p=>p.footprint));
        assert(item.orbit.radius*plane.y-item.footprint>minimum);
        if(i)assert((item.orbit.radius-placed[i-1].orbit.radius)*plane.y>minTrack);
        for(const time of [0,150,450,900]){
          const p=orbitPosition(item.orbit,plane,time);
          for(const other of placed.slice(0,i)){
            const q=orbitPosition(other.orbit,plane,time);
            assert(Math.hypot(p.x-q.x,p.y-q.y)>item.footprint+other.footprint+4);
          }
        }
      }
    }
  }
});

test('O foco em lua mantém o planeta e a órbita lunar dentro do enquadramento em tamanhos distintos',()=>{
  for(const width of [296,358,600,920,1410]){
    const frame=mapFrame(width,width<400?350:580,100,65);
    const parent={x:204,y:-149};
    for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const moon=orbitPosition({radius:.96,angle},lunarOrbit,0);
      const pose=targetCamera(parent,moon,true,frame);
      const scale=frame.scale*pose.zoom;
      for(const dx of [-150,0,150])for(const dy of [-112,0,112]){
        const x=frame.center.x+(parent.x+dx-pose.x)*scale;
        const y=frame.center.y+(parent.y+dy-pose.y)*scale;
        assert(x>=frame.bounds.left&&x<=frame.bounds.right);
        assert(y>=frame.bounds.top&&y<=frame.bounds.bottom);
      }
    }
  }
});

test('Rótulos respeitam bordas, corpos e os nomes com prioridade já colocados',()=>{
  const bounds={left:12,right:360,top:60,bottom:295};
  const body={x:320,y:135,radius:16};
  const other={x:320,y:174,radius:16};
  const label=placeMapLabel(body,108,bounds,[body,other],[]);
  assert.deepEqual(label,{x:306,y:96,width:108});
  assert.equal(placeMapLabel(body,108,bounds,[body,other],[label]),null);
  assert.equal(placeMapLabel(body,400,bounds,[body],[]),null);
});
