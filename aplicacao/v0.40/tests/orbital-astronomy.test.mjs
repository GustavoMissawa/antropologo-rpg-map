import assert from 'node:assert/strict';
import test from 'node:test';
import { centralProfiles, describeCentralObject } from '../lib/orbital-astronomy.ts';
import { cometDepths, cometSkyTile } from '../lib/comet-parallax.ts';
import { asteroidBelt, arrangeOrbitTracks, planetMapLimit, solarOrbit, starMapRadius } from '../lib/orbital-layout.ts';
import { celestialSeed, createPlanetarySystem, visibleOrbitalBodies } from '../lib/orbital-system.ts';
import { globeTexture } from '../lib/orbital-texture.ts';

const chapter = (id, children=[]) => ({id,title:id,content:'',status:'draft',children});
const book = (id,count) => ({id,name:id,chapters:Array.from({length:count},(_,i)=>chapter('p'+i,[chapter('l'+i)]))});

test('Os nove perfis centrais seguem pesos, temperaturas e tamanhos definidos no mapa',()=>{
  const sample = Object.fromEntries(Object.keys(centralProfiles).map(kind=>[kind,0]));
  for(let i=0;i<12000;i++){
    const {archetype,mapRadius,temperatureK}=describeCentralObject(celestialSeed('central-'+i,'star'));
    const rules=centralProfiles[archetype];
    sample[archetype]++;
    assert.ok(mapRadius>=rules.radius*.96&&mapRadius<=rules.radius*1.04);
    if(rules.temperature) assert.ok(temperatureK>=rules.temperature[0]&&temperatureK<=rules.temperature[1]);
    else assert.equal(temperatureK,null);
  }
  for(const [kind,count] of Object.entries(sample)){
    assert(Math.abs(count/120-centralProfiles[kind].weight)<1.6);
  }
  const giant=centralProfiles['red-giant'].radius;
  assert(giant>centralProfiles['sun-like'].radius);
  assert(centralProfiles['white-dwarf'].radius<centralProfiles['red-dwarf'].radius);
  assert.equal(describeCentralObject(celestialSeed('ab10','star')).archetype,'sun-like');
});

test('Renomear e editar capítulos preservam o centro e a identidade física de planetas e luas',()=>{
  const original=book('identidade',4);
  const before=createPlanetarySystem(original);
  const unchanged=original.chapters[1], newChapter=chapter('novo');
  const after=createPlanetarySystem({...original,name:'Outro nome',chapters:[newChapter,unchanged,original.chapters[0]]});
  assert.equal(before.star.seed,after.star.seed);
  assert.deepEqual(before.star.central,after.star.central);
  assert.deepEqual(before.topics.get(unchanged.id),after.topics.get(unchanged.id));
  assert.deepEqual(before.topics.get('l1'),after.topics.get('l1'));
});

test('Os cinturões usam a folga real entre silhuetas e surgem em mapas grandes e pequenos',()=>{
  const counts={2:0,8:0,128:0};
  for(const count of Object.keys(counts).map(Number)){
    for(let i=0;i<80;i++){
      const scene=createPlanetarySystem(book('belt-'+i,count));
      const planets=arrangeOrbitTracks(visibleOrbitalBodies(scene.planets,planetMapLimit),'solar');
      const belt=asteroidBelt(scene.star,planets);
      if(!belt)continue;
      counts[count]++;
      assert.deepEqual(belt,asteroidBelt(scene.star,planets));
      assert(belt.inner*solarOrbit.y>starMapRadius(scene.star));
      assert(belt.particles.length>40&&belt.particles.length<120);
      const sectors=new Array(8).fill(0);
      for(const {x,y,size} of belt.particles){
        const angle=Math.atan2(y/solarOrbit.y,x/solarOrbit.x);
        const distance=Math.hypot(x/solarOrbit.x,y/solarOrbit.y);
        sectors[Math.min(7,Math.floor((angle+Math.PI)/Math.PI*4))]++;
        assert(distance>belt.inner&&distance<belt.outer);
        for(const p of planets) assert(Math.abs(distance-p.orbit.radius)*solarOrbit.y>p.footprint+size);
      }
      assert(Math.max(...sectors)>Math.min(...sectors));
    }
  }
  assert(Object.values(counts).every(value=>value>0&&value<80));
});

test('Materiais procedurais são distintos, determinísticos e usam marcas estáveis com detalhe extra',()=>{
  const surfaces=['rocky','desert','oceanic','volcanic','icy','gas-giant','ice-giant'];
  const features=new Set();
  for(const type of surfaces){
    const surface=globeTexture(31217,type,false,.76,true,false);
    const detailed=globeTexture(31217,type,false,.76,true,true);
    assert.deepEqual(surface,globeTexture(31217,type,false,.76,true,false));
    assert(detailed.some(mark=>mark.d===surface[0].d));
    assert(!surface.some(mark=>/NaN|Infinity/.test(mark.d)));
    features.add(JSON.stringify(surface));
  }
  assert.equal(features.size,surfaces.length);
  assert.notDeepEqual(globeTexture(31217,'rocky',true,.76,false,false),globeTexture(31217,'rocky',false,.76,false,false));
});

test('O cometa usa três planos independentes, progressivamente mais rápidos e com densidade móvel limitada',()=>{
  const tiles=cometDepths.map((depth,i)=>cometSkyTile(0x26838727,depth,i));
  assert.equal(new Set(tiles.map(tile=>tile[0].points)).size,3);
  for(const [i, depth] of cometDepths.entries()){
    assert.deepEqual(tiles[i],cometSkyTile(0x26838727,depth,i));
    assert.equal(tiles[i][0].points.split('M').length-1,depth.stars);
    assert.equal(tiles[i][1].points.split('M').length-1,depth.desktopExtra);
    if(i){
      assert(depth.period<cometDepths[i-1].period);
      assert(depth.compactPeriod<cometDepths[i-1].compactPeriod);
      assert(depth.trail>cometDepths[i-1].trail);
    }
  }
});
