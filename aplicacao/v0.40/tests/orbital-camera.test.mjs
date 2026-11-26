import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraAt, makeCameraMotion, orbitPosition, overviewCamera, solarOrbit, targetCamera } from '../lib/orbital-camera.ts';
import { makeAB10Rulebook } from '../lib/model.ts';
import { createPlanetarySystem } from '../lib/orbital-system.ts';
import { parsePlatformHash, platformHref } from '../lib/platform-navigation.ts';

const system=createPlanetarySystem(makeAB10Rulebook());
const at=(id,compact=false)=>targetCamera(system.topics.get(id),0,compact);

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
  const parent=orbitPosition(planet.orbit,solarOrbit,0);
  const first=at('attributes'), second=at('skills');
  assert.equal(at('character').x,parent.x);
  assert.notDeepEqual(first,second);
  assert(at('skills',true).zoom>at('character',true).zoom);
  const travel=makeCameraMotion(system,'attributes','skills',first,false,false);
  assert.equal(travel.kind,'orbit');
  const middle=cameraAt(travel,second,.5,parent);
  assert.deepEqual(cameraAt(travel,second,0,parent),first);
  assert.deepEqual(cameraAt(travel,second,1,parent),second);
  assert(Math.hypot(middle.x-parent.x,middle.y-parent.y)>35);
  assert.notDeepEqual(orbitPosition(planet.orbit,solarOrbit,28),parent);
});

test('Câmera distingue viagem próxima, distante e chegada e redireciona a partir do quadro atual',()=>{
  const early=at('character'), goal=at('welcome');
  const jump=makeCameraMotion(system,'character','welcome',early,false,false);
  assert.equal(jump.kind,'jump');
  const between=cameraAt(jump,goal,.4);
  assert(between.zoom<Math.min(early.zoom,goal.zoom));
  assert.deepEqual(cameraAt(jump,goal,1),goal);
  const revised=makeCameraMotion(system,'welcome','magic',between,false,false);
  assert.deepEqual(cameraAt(revised,at('magic'),0),between);
  assert.equal(makeCameraMotion(system,'dice','magic',at('dice'),false,false).kind,'lateral');
  const arriving=makeCameraMotion(system,undefined,undefined,overviewCamera,true,false);
  assert.equal(arriving.kind,'arrival');
  assert(arriving.from.zoom<1);
  assert.equal(makeCameraMotion(system,undefined,undefined,overviewCamera,false,false),null);
});
