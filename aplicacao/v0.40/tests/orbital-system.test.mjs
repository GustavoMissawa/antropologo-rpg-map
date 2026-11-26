import assert from 'node:assert/strict';
import test from 'node:test';
import { makeAB10Rulebook, makeRulebook } from '../lib/model.ts';
import { orbitalEntryRoute, parsePlatformHash, platformHref, routeForStyle, sectionRoute } from '../lib/platform-navigation.ts';
import { createPlanetarySystem, planetaryLocation, planOrbitalFlight, visibleOrbitalBodies } from '../lib/orbital-system.ts';
import { planetaryArchitectures } from '../lib/planetary-architecture.ts';

const chapter = (id, children = []) => ({id, title: id, content: '', status: 'draft', children});
const sampleBook = (id, size) => ({
  id, name: 'Catálogo de teste', chapters: Array.from({length:size}, (_, i) => chapter('chapter-' + i)),
});
const sum = values => values.reduce((total, value) => total + value, 0);
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));

function correlation(x, y) {
  const meanX = sum(x) / x.length;
  const meanY = sum(y) / y.length;
  const varianceX = sum(x.map(value => (value - meanX) ** 2));
  const varianceY = sum(y.map(value => (value - meanY) ** 2));
  return sum(x.map((value, i) => (value - meanX) * (y[i] - meanY))) / Math.sqrt(varianceX * varianceY);
}

test('AB10 tem cinco planetas e três luas do capítulo de criação', () => {
  const system = createPlanetarySystem(makeAB10Rulebook());
  assert.equal(system.planets.length, 5);
  assert.equal(system.topics.size, 8);
  assert.deepEqual(system.topics.get('character').planet.moons.map(moon => moon.id), ['attributes', 'skills', 'derived']);
  assert.equal(system.topics.get('attributes').moon.planetId, 'character');
  assert.equal(system.star.appearance.type, 'star');
});

test('Subseções profundas pertencem à órbita do capítulo raiz e mantêm sua identidade', () => {
  const apo = chapter('apo', [chapter('delta', [chapter('echo', [chapter('foxtrot')])])]);
  const zen = chapter('zen');
  const book = {...makeRulebook('Sistema independente'), chapters: [apo, zen]};
  const before = createPlanetarySystem(book);
  assert.deepEqual(before.planets[0].moons.map(moon => moon.id), ['delta','echo','foxtrot']);
  assert.equal(before.topics.get('foxtrot').planet.id, 'apo');
  assert.equal(before.topics.get('zen').moon, undefined);
  assert.notEqual(before.star.seed, createPlanetarySystem({...book, id:'outro-sistema'}).star.seed);
  assert.deepEqual(createPlanetarySystem(structuredClone(book)), before);

  const edited = createPlanetarySystem({...book, name:'Novo título', chapters:[chapter('nova'), {...apo, title:'Renomeado'}]});
  assert.deepEqual(edited.star.appearance, before.star.appearance);
  assert.deepEqual(edited.topics.get('apo').planet.orbit, before.topics.get('apo').planet.orbit);
  assert.deepEqual(edited.topics.get('apo').planet.appearance, before.topics.get('apo').planet.appearance);
  assert.deepEqual(edited.topics.get('foxtrot').moon, before.topics.get('foxtrot').moon);
});

test('As quatro arquiteturas têm proporções equilibradas e tendências de massa com tolerância', () => {
  const samples = Object.fromEntries(planetaryArchitectures.map(architecture => [architecture, []]));
  for (let i=0; i<320; i++) {
    const scene = createPlanetarySystem(sampleBook('planet-fixture-' + i, 128));
    const bodies = [...scene.planets].sort((a,b) => a.physics.distanceAU - b.physics.distanceAU);
    const distance = bodies.map(body => Math.log(body.physics.distanceAU));
    const masses = bodies.map(body => body.physics.massEarth);
    const r = correlation(distance, masses.map(Math.log));
    samples[scene.architecture].push(r);
    if (scene.architecture === 'ordered' || scene.architecture === 'anti-ordered') {
      const sign = scene.architecture === 'ordered' ? 1 : -1;
      assert.ok(sign * r > .90);
      assert.ok(masses.some((mass,j) => j>0 && sign * (mass - masses[j-1]) < 0));
    } else if (scene.architecture === 'similar') {
      assert.ok(Math.max(...masses) / Math.min(...masses) < 1.48);
      assert.ok(new Set(bodies.map(body => body.appearance.type)).size > 1);
    } else {
      assert.ok(Math.max(...masses) / Math.min(...masses) > 40);
    }
  }
  for (const values of Object.values(samples)) assert.ok(values.length >= 56 && values.length <= 104);
  assert.ok(Math.abs(sum(samples.mixed) / samples.mixed.length) < .08);
  assert.ok(samples.mixed.filter(r => Math.abs(r) < .23).length / samples.mixed.length > .85);
});

test('Propriedades estelares e planetárias coerentes geram sete superfícies, anéis e tempestades', () => {
  const surfaces = new Set(), spectra = new Set(), rings = new Set();
  let hotGiant = false, storm = false;
  for (let i=0; i<96; i++) {
    const {star, planets} = createPlanetarySystem(sampleBook('physics-sample-' + i, 20));
    const {massSolar, luminositySolar, spectrum} = star.physics;
    spectra.add(spectrum);
    assert.ok(close(luminositySolar, massSolar ** 3.6));
    for (const {physics:p, appearance} of planets) {
      assert.ok(p.distanceAU >= .12 && p.distanceAU <= 22);
      assert.ok(p.densityGcm3 > 0 && p.albedo >= 0 && p.albedo <= 1);
      assert.ok(close(p.massEarth, p.radiusEarth ** 3 * p.densityGcm3 / 5.514));
      assert.ok(close(p.temperatureK, 278.3 * (luminositySolar * (1 - p.albedo)) ** .25 / Math.sqrt(p.distanceAU)));
      assert.equal(appearance.type, p.surface);
      assert.equal(appearance.rings, p.rings);
      assert.equal(appearance.storm, p.storm);
      assert.equal(appearance.cratering, p.cratering);
      if (p.surface.endsWith('giant')) {
        assert.equal(p.atmosphere, 'dense');
        assert.equal(p.cratering, 0);
        if (p.distanceAU < .25 && p.surface === 'gas-giant') hotGiant = true;
      }
      if (p.storm) {
        assert.ok(p.surface.endsWith('giant'));
        storm = true;
      }
      rings.add(p.rings);
      surfaces.add(p.surface);
    }
  }
  assert.equal(surfaces.size, 7);
  assert.equal(spectra.size, 3);
  assert.deepEqual(rings, new Set([null, 'ice', 'dust']));
  assert.ok(hotGiant && storm);
});

test('Visões de 1 a 128 capítulos preservam todos os destinos e mantêm a identidade durante edições', () => {
  const book = sampleBook('planet-fixture-8', 128);
  for (const n of [1, 4, 8, 20, 128]) {
    const scene = createPlanetarySystem({...book, chapters:book.chapters.slice(0,n)});
    assert.equal(scene.planets.length, n);
    assert.equal(scene.topics.size, n);
    for (const body of scene.planets) {
      const href = platformHref({page:'rules',bookId:book.id,topicId:body.id,view:'orbit'});
      assert.equal(parsePlatformHash(href).topicId, body.id);
      assert.equal(planetaryLocation(scene,body.id).target,body.id);
    }
    const visible = visibleOrbitalBodies(scene.planets,16);
    const hidden = scene.planets.find(body=>!visible.includes(body));
    assert.equal(visible.length,Math.min(16,n));
    if (hidden) {
      const selected = visibleOrbitalBodies(scene.planets,16,hidden);
      assert.equal(new Set(selected).size,16);
      assert.ok(selected.includes(hidden));
    }
  }
  const before = createPlanetarySystem(book);
  const changed = {
    ...book, themeKey:'sol', name:'Novo nome', chapters:[chapter('chapter-new'),...book.chapters.slice(0,20).reverse()],
  };
  const after = createPlanetarySystem(changed);
  assert.equal(after.architecture,before.architecture);
  assert.deepEqual(after.star.physics,before.star.physics);
  assert.deepEqual(after.star.appearance,before.star.appearance);
  assert.deepEqual(after.planets.slice(1), before.planets.slice(0,20).reverse());
});

test('Luas distantes e aninhadas conservam geometria, propriedades e acesso pelo índice', () => {
  const book = sampleBook('lunar-fixture', 1);
  const deep = Array.from({length:30}, (_,i)=>chapter('deep-'+i)).reduceRight((children, item) => [{...item,children}], []);
  const branch = [...deep, ...Array.from({length:78}, (_,i)=>chapter('moon-'+i))];
  const scene = createPlanetarySystem({...book, chapters:[{...book.chapters[0],children:branch}]});
  const planet = scene.planets[0];
  const moons = planet.moons;
  assert.equal(moons.length, 108);
  assert.equal(scene.topics.size, 109);
  assert.equal(scene.topics.get('deep-29').planet, planet);
  assert.ok(visibleOrbitalBodies(moons,12,scene.topics.get('deep-29').moon).includes(scene.topics.get('deep-29').moon));
  assert.equal(new Set(moons.map(moon=>moon.physics.radiusEarth)).size,108);
  for (const moon of moons) {
    assert.equal(moon.planetId,planet.id);
    assert.ok(moon.physics.massEarth < planet.physics.massEarth * .023);
    assert.ok(close(moon.physics.massEarth, moon.physics.radiusEarth ** 3 * moon.physics.densityGcm3 / 5.514));
    assert.ok(moon.physics.distanceKm >= planet.physics.radiusEarth * 6371 * 3);
  }
  const edited = createPlanetarySystem({...book, chapters:[{...book.chapters[0],children:branch.slice().reverse()}]});
  for (const moon of moons) assert.deepEqual(edited.topics.get(moon.id).moon,moon);
});

test('Viagem adapta a trajetória à posição e aos vínculos dos destinos', () => {
  const scene = createPlanetarySystem(makeAB10Rulebook());
  const from = planetaryLocation(scene, 'attributes');
  const to = planetaryLocation(scene, 'skills');
  const arc = planOrbitalFlight(from, to);
  assert.equal(arc.kind, 'orbit');
  assert.equal(arc.frames.length, 7);
  assert.deepEqual(arc.frames.at(-1), {x: 0, y: 0});
  assert.equal(planOrbitalFlight(from, from), null);
  assert.equal(planOrbitalFlight(from, planetaryLocation(scene, 'character')).kind, 'lateral');
  assert.equal(planOrbitalFlight({scene: 'workshop', point:{x: 0,y: 0}}, to).kind, 'jump');
  assert.equal(planOrbitalFlight({...from, target:'other', point:{x: -.9,y: 0}, moonOrbit: undefined}, {...to, point:{x: .9,y: 0}}).kind, 'jump');
});

test('URLs diretas resolvem sistema, capítulo e âncora nos dois estilos', () => {
  const route = {page:'rules', bookId:'sistema/azul', topicId:'parte ~ 2', anchorId:'escudo/01'};
  const url = platformHref(route);
  assert.equal(url,'#regras/sistema%2Fazul/topico/parte%20~%202/secao/escudo%2F01');
  assert.deepEqual(parsePlatformHash(url), route);
  assert.deepEqual(routeForStyle(parsePlatformHash(url), 'classic'), route);
  assert.deepEqual(parsePlatformHash('#regras/ab10'), {page:'rules', bookId:'ab10'});
  assert.equal(parsePlatformHash('#regras/ab10/topico/magia/secao'), null);
  assert.equal(parsePlatformHash('#regras/ab10/topico/%ZZ'), null);
  assert.equal(parsePlatformHash('#ficha/personagem/id/extra'), null);
  assert.equal(platformHref(orbitalEntryRoute('agenda')), '#agenda');
  assert.equal(platformHref(sectionRoute('pdfs','orbital')), '#pdfs');
  assert.equal(platformHref(sectionRoute('sheet','orbital')), '#ficha');
  assert.deepEqual(parsePlatformHash('#inicio/pdfs'), {page:'home', destination:'pdfs'});
});
