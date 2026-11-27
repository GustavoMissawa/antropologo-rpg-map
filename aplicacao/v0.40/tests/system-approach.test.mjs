import assert from 'node:assert/strict';
import test from 'node:test';
import { systemApproachAt, systemApproachDuration } from '../lib/system-approach.ts';

test('A viagem acelera, cobre distância e desacelera até a projeção de repouso', () => {
  const start = systemApproachAt(0);
  const end = systemApproachAt(1);
  assert.equal(start.departureZoom, 1);
  assert.equal(start.departureSweep, 0);
  assert.equal(start.departureUi, 1);
  assert.equal(start.departureSky, 1);
  assert.equal(start.speed, 0);
  assert.equal(end.speed, 0);
  assert.equal(end.distance, 1);
  assert.equal(end.arrivalZoom, 1);
  assert.equal(end.arrivalBearing, 0);
  assert.equal(end.arrivalUi, 1);
  let previous = start;
  for (let i = 1; i <= 200; i++) {
    const frame = systemApproachAt(i / 200);
    assert(frame.distance > previous.distance);
    assert(frame.arrivalZoom >= previous.arrivalZoom);
    assert(Math.abs(frame.arrivalZoom - previous.arrivalZoom) < .025);
    assert(i <= 100 ? frame.speed > previous.speed : frame.speed < previous.speed);
    previous = frame;
  }
});

test('A estrela de destino aparece antes dos planetas e o campo acompanha a passagem pelo disco', () => {
  const crossing = systemApproachAt(.4);
  assert(crossing.departureZoom > 2);
  assert(crossing.departureDisk > 0);
  assert(crossing.particles > .9);
  assert(crossing.arrivalStar > 0);
  assert.equal(crossing.arrivalPlanets, 0);
  const approach = systemApproachAt(.73);
  assert.equal(approach.departureDisk, 0);
  assert(approach.arrivalPlanets > .8);
  assert(approach.arrivalTracks > 0);
  assert.equal(approach.arrivalUi, 0);
  assert(systemApproachAt(.95).arrivalUi > 0);
  assert.equal(systemApproachAt(1).particles, 0);
});

test('Movimento reduzido conserva a posição e usa só uma passagem curta de opacidade', () => {
  for (const time of [0, .2, .6, 1]) {
    const frame = systemApproachAt(time, true);
    assert.equal(frame.departureZoom, 1);
    assert.equal(frame.departureSweep, 0);
    assert.equal(frame.arrivalZoom, 1);
    assert.equal(frame.arrivalBearing, 0);
    assert.equal(frame.arrivalStar, 1);
    assert.equal(frame.arrivalPlanets, 1);
    assert.equal(frame.particles, 0);
  }
  assert.equal(systemApproachDuration(false, true), 180);
  assert(systemApproachDuration(true, false) >= 3000);
  assert(systemApproachDuration(false, false) <= 5000);
});
