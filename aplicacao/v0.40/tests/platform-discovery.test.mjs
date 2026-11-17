import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPlatform, clickButton, preferences, waitFor, act} from './helpers/platform-dom.mjs';
import {openPlatformSession} from '../lib/platform-session.ts';
import {makeAB10Rulebook, makeRulebook} from '../lib/model.ts';

async function seed() {
  sessionStorage.clear();
  const cache = await openPlatformSession();
  await cache.save({books: [makeAB10Rulebook(), makeRulebook('Outro universo')], contextId: null, page: 'home'});
  cache.close();
}

test('Home global oferece os atalhos e distingue a biblioteca do contexto AB10', async () => {
  await seed();
  const ui = await mountPlatform();
  try {
    const orbit = ui.host.querySelector('.orbital-home');
    assert(orbit.textContent.includes('Outro universo'));
    assert.equal(ui.host.querySelector('.global-top-nav').getAttribute('aria-label'), 'Áreas da plataforma');
    assert.equal(orbit.querySelector('.orbital-connection').dataset.active, 'false');
    assert.equal(orbit.querySelector('.orbital-connection path'), null);
    await clickButton(orbit, 'Entrar no sistema AB10 — Absolute 10');
    assert.equal(ui.host.querySelector('.app-shell').dataset.systemId, 'ab10');
    await clickButton(ui.host, 'Início');
    assert(ui.host.querySelector('.contextual-hero'));
    assert.equal(ui.host.querySelector('.orbital-home'), null);
    await clickButton(ui.host, 'Trocar sistema');
    assert(ui.host.textContent.includes('Outro universo'));
    assert.equal(ui.host.querySelector('.app-shell').dataset.systemId, 'ab10');
    await clickButton(ui.host, 'Voltar ao ANTROPOLOGO');
    assert.equal(ui.host.querySelector('.app-shell').dataset.context, 'global');
    await clickButton(ui.host.querySelector('.orbital-home'), 'Criar sistema');
    await waitFor(() => ui.host.querySelector('.system-editor[open]'));
    assert.equal(ui.host.querySelector('input[name="name"]').value, '');
    await clickButton(ui.host, 'Fechar editor de sistema');
  } finally {
    await ui.close();
  }
});

test('Os quatro destinos orbitais abrem as áreas existentes e preservam as ações de criação', async () => {
  await seed();
  const ui = await mountPlatform();
  try {
    for (const [label, hash] of [['Sistemas', '#regras'], ['Fichas', '#ficha'], ['PDFs', '#pdfs'], ['Agenda', '#agenda']]) {
      const nav = ui.host.querySelector('nav[aria-label="Navegação orbital"]');
      await clickButton(nav, label);
      assert.equal(window.location.hash, hash);
      assert.equal(ui.host.querySelector('.orbital-home'), null);
      if (label === 'Sistemas') assert(ui.host.textContent.includes('Outro universo'));
      if (label === 'Fichas') {
        assert(ui.host.querySelector('.character-library-grid').firstElementChild.textContent.includes('Criar personagem'));
        assert(ui.host.textContent.includes('Todas as fichas desta página'));
      }
      await clickButton(ui.host, 'Início');
    }
    await clickButton(ui.host.querySelector('.orbital-home'), 'Criar personagem');
    assert(ui.host.querySelector('dialog[open][aria-label="Criar nova ficha"]'));
    await clickButton(ui.host, 'Fechar janela');
    await clickButton(ui.host.querySelector('.orbital-home'), 'Ver suas fichas');
    assert(ui.host.querySelector('.character-library'));
  } finally {
    await ui.close();
  }
});

test('Hover e foco alternam o traçado único e toque abre o destino no primeiro acionamento', async () => {
  await seed();
  const rect = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('orbital-art')) return {left: 0, top: 0, width: 620, height: 620};
    if (this.dataset.orbitalAnchor) {
      const x = this.dataset.orbitalAnchor === 'systems' ? 560 : 610;
      return {left: x, top: 130, width: 22, height: 22};
    }
    return rect.call(this);
  };
  let ui;
  try {
    ui = await mountPlatform();
    const [systems, sheets, pdfs] = ui.host.querySelectorAll('.orbital-node');
    const beam = ui.host.querySelector('.orbital-connection');
    const activeNodes = () => ui.host.querySelectorAll('.orbital-node[data-active="true"]').length;
    const path = () => beam.querySelector('path')?.getAttribute('d');
    const point = async (button, type, pointerType, relatedTarget = null) => {
      const event = new MouseEvent(type, {bubbles: true, relatedTarget});
      Object.defineProperty(event, 'pointerType', {value: pointerType});
      await act(async () => button.dispatchEvent(event));
    };

    await point(systems, 'pointerover', 'mouse');
    assert.equal(beam.dataset.active, 'true');
    assert.equal(activeNodes(), 1);
    const firstPath = path();
    assert(firstPath);
    await act(async () => sheets.focus());
    assert.equal(sheets.dataset.active, 'true', 'O teclado assume mesmo com o ponteiro em Sistemas.');
    assert.equal(activeNodes(), 1);
    await point(pdfs, 'pointerover', 'mouse');
    assert.equal(pdfs.dataset.active, 'true', 'Uma nova entrada do ponteiro pode assumir novamente.');
    await act(async () => sheets.blur());
    await point(pdfs, 'pointerout', 'mouse');
    assert.equal(beam.dataset.active, 'false');
    await point(systems, 'pointerover', 'mouse');
    await point(systems, 'pointerout', 'mouse', sheets);
    assert.equal(activeNodes(), 1);
    assert.notEqual(path(), firstPath);
    assert.equal(new Set([...beam.querySelectorAll('path')].map(p => p.getAttribute('d'))).size, 1);
    await point(sheets, 'pointerout', 'mouse');
    assert.equal(beam.dataset.active, 'false');
    assert.equal(activeNodes(), 0);
    await point(pdfs, 'pointerover', 'touch');
    assert.equal(beam.dataset.active, 'false');
    await act(async () => pdfs.click());
    assert.equal(window.location.hash, '#pdfs');
  } finally {
    HTMLElement.prototype.getBoundingClientRect = rect;
    await ui?.close();
  }
});

test('D20 orbital pausa no estado oculto, fora da área visível e em movimento reduzido', async () => {
  await seed();
  await preferences({motionReduced: true});
  const Observer = globalThis.IntersectionObserver;
  const observers = new Map();
  globalThis.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe(target) { observers.set(target, this.callback); }
    disconnect() {}
  };
  const hidden = Object.getOwnPropertyDescriptor(document, 'hidden');
  let ui;
  try {
    ui = await mountPlatform();
    const art = ui.host.querySelector('.orbital-art');
    const die = art.querySelector('.orbital-d20');
    const surface = () => [...die.querySelectorAll('polygon[visibility="visible"]')]
      .map(face => face.getAttribute('points')).join('|');
    const initial = surface();
    const pause = ms => act(async () => new Promise(resolve => setTimeout(resolve, ms)));
    assert.equal(die.querySelectorAll('polygon').length, 20);
    assert.equal(die.querySelectorAll('path').length, 1);
    assert.ok(die.querySelector('path').getAttribute('d'));
    assert.equal(die.querySelector('marker, circle, [marker-start], [marker-mid]'), null);
    assert.ok(die.querySelector('polygon[visibility="hidden"]'));
    assert.ok(initial.length);
    assert.equal(art.dataset.motion, 'paused');
    await preferences({motionReduced: false});
    await waitFor(() => surface() !== initial);
    await act(async () => observers.get(art)([{target: art, isIntersecting: false}]));
    const offscreen = surface();
    await pause(70);
    assert.equal(art.dataset.motion, 'paused');
    assert.equal(surface(), offscreen);
    await act(async () => observers.get(art)([{target: art, isIntersecting: true}]));
    await waitFor(() => surface() !== offscreen);
    Object.defineProperty(document, 'hidden', {configurable: true, value: true});
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    const background = surface();
    await pause(70);
    assert.equal(art.dataset.motion, 'paused');
    assert.equal(surface(), background);
    Object.defineProperty(document, 'hidden', {configurable: true, value: false});
    await preferences({motionReduced: true});
    assert.equal(art.dataset.motion, 'paused');
    await pause(70);
    assert.equal(surface(), background);
    await clickButton(ui.host.querySelector('.orbital-home'), 'Agenda');
    assert.equal(window.location.hash, '#agenda');
  } finally {
    if (hidden) Object.defineProperty(document, 'hidden', hidden);
    else delete document.hidden;
    globalThis.IntersectionObserver = Observer;
    await ui?.close();
    await preferences({motionReduced: false});
  }
});
