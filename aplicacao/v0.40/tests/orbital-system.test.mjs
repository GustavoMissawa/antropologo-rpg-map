import assert from 'node:assert/strict';
import test from 'node:test';
import { makeAB10Rulebook, makeRulebook } from '../lib/model.ts';
import { orbitalEntryRoute, parsePlatformHash, platformHref, routeForStyle, sectionRoute } from '../lib/platform-navigation.ts';
import { createPlanetarySystem, planetaryLocation, planOrbitalFlight } from '../lib/orbital-system.ts';

const chapter = (id, children = []) => ({id, title: id, content: '', status: 'draft', children});

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
