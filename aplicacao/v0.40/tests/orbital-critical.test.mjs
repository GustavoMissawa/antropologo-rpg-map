import assert from 'node:assert/strict';
import test from 'node:test';
import {ORBITAL_CRITICAL_DURATION_MS, ORBITAL_CRITICAL_RELEASE_MS, sampleOrbitalCritical} from '../lib/orbital-critical.ts';
import {ORBITAL_RESULT_DISPLAY_MS} from '../lib/orbital-die-roll.ts';

test('O evento cresce da sobrecarga ao jato, projeta uma única onda e termina durante o resultado', () => {
  const event = {startedAt: 230};
  const frame = t => sampleOrbitalCritical(event, event.startedAt + t);
  assert.deepEqual([0, 1020, 1780, 2260, 3850].map(t => frame(t).phase),
    ['overload', 'focus', 'jet', 'shock', 'dissipating']);
  assert.equal(frame(0).spin, 0);
  assert.ok(frame(1440).spin > frame(800).spin);
  assert.ok(frame(1440).light > frame(800).light);
  assert.ok(frame(1400).compression > frame(700).compression);
  assert.equal(frame(1400).jet, 0);
  assert.ok(frame(2110).jet > frame(1780).jet);
  assert.equal(frame(2020).shock, 0);
  assert.ok(frame(2260).shock > .5);
  assert.ok(frame(2500).wave > frame(2260).wave);
  assert.equal(frame(3400).shock, 0);
  assert.ok(frame(4000).spin < frame(2100).spin);
  assert.ok(frame(ORBITAL_CRITICAL_DURATION_MS - 1).jet < .001);
  assert.equal(frame(ORBITAL_CRITICAL_DURATION_MS), null);
  assert.ok(ORBITAL_CRITICAL_DURATION_MS < ORBITAL_RESULT_DISPLAY_MS);
});

test('A interrupção dissipa a intensidade atual sem acionar uma nova fase', () => {
  for (const time of [720, 1770, 2230, 4600]) {
    const event = {startedAt: 315};
    const at = event.startedAt + time;
    const last = sampleOrbitalCritical(event, at);
    const interrupted = {...event, releasedAt: at};
    const current = sampleOrbitalCritical(interrupted, at);
    for (const prop of ['spin', 'light', 'core', 'jet', 'shock', 'compression', 'reach']) {
      assert.equal(current[prop], last[prop]);
    }
    assert.equal(current.phase, 'dissipating');
    const after = sampleOrbitalCritical(interrupted, at + ORBITAL_CRITICAL_RELEASE_MS / 2);
    assert.equal(after.jet, last.jet / 2);
    assert.equal(after.shock, last.shock / 2);
    assert.equal(sampleOrbitalCritical(interrupted, at + ORBITAL_CRITICAL_RELEASE_MS), null);
  }
});
