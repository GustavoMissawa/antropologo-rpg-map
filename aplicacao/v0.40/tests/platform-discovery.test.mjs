import test from 'node:test';
import assert from 'node:assert/strict';
import {mountPlatform, clickButton, preferences, waitFor, act} from './helpers/platform-dom.mjs';
import {openPlatformSession} from '../lib/platform-session.ts';
import {makeAB10Rulebook, makeRulebook} from '../lib/model.ts';

async function seed() {
  window.history.replaceState(null, '', '#inicio');
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
    assert(ui.host.querySelector('.orbital-home'));
    assert.equal(ui.host.querySelector('.app-shell').dataset.context, 'global');
    assert(ui.host.querySelector('.orbital-home').textContent.includes('Outro universo'));
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
    for (const [label, hash, action] of [['Sistemas', '#regras', 'Ver todos os sistemas'], ['Fichas', '#ficha', 'Ver todas as fichas'], ['PDFs', '#pdfs', 'Abrir biblioteca de PDFs'], ['Agenda', '#agenda']]) {
      const nav = ui.host.querySelector('nav[aria-label="Navegação orbital"]');
      await clickButton(nav, label);
      if (action) {
        await waitFor(() => ui.host.querySelector('.orbital-home').dataset.phase === 'destination');
        assert(ui.host.querySelector('.orbital-workspace').hasAttribute('inert'));
        await clickButton(ui.host.querySelector('.orbital-destination-panel'), action);
      }
      await waitFor(() => window.location.hash === hash);
      assert.equal(window.location.hash, hash);
      assert.equal(ui.host.querySelector('.orbital-home'), null);
      if (label === 'Sistemas') assert(ui.host.textContent.includes('Outro universo'));
      if (label === 'Fichas') {
        assert(ui.host.querySelector('.orbital-character-index'));
        assert(ui.host.textContent.includes('Nenhum personagem nesta sessão'));
      }
      await clickButton(ui.host, 'Início');
    }
    await clickButton(ui.host.querySelector('.orbital-home'), 'Criar personagem');
    assert(ui.host.querySelector('dialog[open][aria-label="Criar nova ficha"]'));
    await clickButton(ui.host, 'Fechar janela');
    await clickButton(ui.host.querySelector('.orbital-home'), 'Ver suas fichas');
    assert(ui.host.querySelector('.orbital-character-index'));
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
    await waitFor(() => beam.dataset.active === 'true' && beam.dataset.destination === 'sheets');
    assert.notEqual(path(), firstPath);
    assert.equal(beam.querySelectorAll('.orbital-source-star').length, 1);
    assert.equal(ui.host.querySelector('.orbital-art').dataset.diskSelected, 'true');
    const initialPath = path();
    const marker = beam.querySelector('.orbital-source-star');
    const initialPosition = marker.getAttribute('transform');
    await waitFor(() => marker.getAttribute('transform') !== initialPosition);
    assert.notEqual(path(), initialPath, 'o fio acompanha a origem móvel');
    assert.equal(path().split(' ').slice(-2).join(' '), initialPath.split(' ').slice(-2).join(' '), 'o fio continua preso ao destino');
    assert.equal(new Set([...beam.querySelectorAll('.orbital-connection-track, .orbital-connection-pulse')].map(p => p.getAttribute('d'))).size, 1);
    await point(sheets, 'pointerout', 'mouse');
    assert.equal(beam.dataset.active, 'false');
    assert.equal(activeNodes(), 0);
    assert.equal(ui.host.querySelector('.orbital-art').dataset.diskSelected, 'false');
    const previousActivation = path();
    await point(sheets, 'pointerover', 'mouse');
    await waitFor(() => beam.dataset.active === 'true' && beam.dataset.destination === 'sheets');
    assert.notEqual(path(), previousActivation, 'reativar o mesmo destino cria outra curva estável');
    const control = ui.host.querySelector('.orbital-d20-control');
    const diePath = () => ui.host.querySelector('.orbital-d20-edges').getAttribute('d');
    const beforeInput = diePath();
    await act(async () => control.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', cancelable: true})));
    await waitFor(() => diePath() !== beforeInput);
    assert.equal(ui.host.querySelector('.orbital-art').dataset.diskSelected, 'true', 'controle manual não libera a seleção orbital');
    await point(sheets, 'pointerout', 'mouse');
    await point(pdfs, 'pointerover', 'touch');
    assert.equal(beam.dataset.active, 'false');
    await act(async () => pdfs.click());
    assert.equal(pdfs.dataset.selected, 'true');
    await waitFor(() => ui.host.querySelector('.orbital-home').dataset.phase === 'destination');
    assert.equal(window.location.hash, '#inicio/pdfs');
    assert(ui.host.querySelector('.orbital-destination-panel').textContent.includes('Abrir biblioteca de PDFs'));
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
    assert.equal(die.querySelectorAll('.orbital-d20-edges').length, 1);
    assert.ok(die.querySelector('.orbital-d20-edges').getAttribute('d'));
    assert.equal(die.querySelector('marker, [marker-start], [marker-mid]'), null);
    assert.equal(die.querySelectorAll('circle').length, 1);
    assert.equal(die.querySelector('.orbital-vertex-glow').getAttribute('visibility'), 'hidden');
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

test('O D20 responde a mouse, toque capturado e teclado com movimento reduzido', async () => {
  await seed();
  await preferences({motionReduced: true, narrow: true});
  const ui = await mountPlatform();
  try {
    const art = ui.host.querySelector('.orbital-art');
    const control = art.querySelector('.orbital-d20-control');
    const path = () => art.querySelector('.orbital-d20-edges').getAttribute('d');
    const start = path();
    let capture = null;
    control.setPointerCapture = id => {capture = id;};
    control.hasPointerCapture = id => capture === id;
    control.releasePointerCapture = () => {capture = null;};
    const pointer = async (type, id, pointerType, x, y, isPrimary = true) => {
      const event = new MouseEvent(type, {clientX: x, clientY: y, button: 0});
      for (const [key, value] of Object.entries({pointerId: id, pointerType, isPrimary})) {
        Object.defineProperty(event, key, {value});
      }
      await act(async () => control.dispatchEvent(event));
    };

    assert.equal(ui.host.querySelector('.orbital-edition'), null);
    await pointer('pointerenter', 1, 'mouse', 12, 17);
    await pointer('pointermove', 1, 'mouse', 46, 17);
    await waitFor(() => path() !== start);
    const horizontal = path();

    await pointer('pointerdown', 2, 'touch', 46, 17);
    assert.equal(capture, 2, 'toque assume mesmo se o mouse ficou parado no dado');
    await pointer('pointerdown', 3, 'touch', 1, 1, false);
    await pointer('pointermove', 3, 'touch', 66, 66, false);
    assert.equal(path(), horizontal);
    await pointer('pointermove', 2, 'touch', 46, 96);
    await waitFor(() => path() !== horizontal);
    const vertical = path();
    capture = null;
    await pointer('lostpointercapture', 2, 'touch', 46, 96);
    await pointer('pointermove', 2, 'touch', 77, 133);
    assert.equal(path(), vertical);
    const key = new KeyboardEvent('keydown', {key: 'ArrowRight', cancelable: true});
    await act(async () => control.dispatchEvent(key));
    assert.ok(key.defaultPrevented);
    await waitFor(() => path() !== vertical);
    const keyboard = path();
    await act(async () => new Promise(r => setTimeout(r, 70)));
    assert.equal(path(), keyboard, 'sem inércia após o comando direto em movimento reduzido');
    assert.equal(art.dataset.motion, 'paused');
  } finally {
    await ui.close();
    await preferences({motionReduced: false, narrow: false});
  }
});

test('A confirmação de estrela cancela o destino anterior e não sobrevive à saída da Home', async () => {
  await seed();
  await preferences({motionReduced: false});
  const ui = await mountPlatform();
  try {
    const [systems, sheets, pdfs] = ui.host.querySelectorAll('.orbital-node');
    await act(async () => systems.click());
    assert.equal(systems.dataset.selected, 'true');
    assert.equal(ui.host.querySelector('.orbital-connection').dataset.selecting, 'true');
    await act(async () => sheets.click());
    assert.equal(systems.dataset.selected, 'false');
    assert.equal(sheets.dataset.selected, 'true');
    assert.equal(ui.host.querySelectorAll('.orbital-node[data-active="true"]').length, 1);
    await waitFor(() => window.location.hash === '#inicio/fichas');
    await act(async () => new Promise(resolve => setTimeout(resolve, 170)));
    assert.equal(window.location.hash, '#inicio/fichas');
    await clickButton(ui.host, 'Início');
    await clickButton(ui.host.querySelector('.orbital-navigation'), 'PDFs');
    await clickButton(ui.host.querySelector('.global-top-nav'), 'Agenda');
    await act(async () => new Promise(resolve => setTimeout(resolve, 180)));
    assert.equal(window.location.hash, '#agenda', 'a confirmação antiga acompanha a seleção mais recente');
    assert.equal(ui.host.querySelector('.orbital-home'), null);
  } finally {
    await ui.close();
  }
});

test('Movimento reduzido confirma a estrela sem esperar o efeito, inclusive ao trocar a preferência', async () => {
  await seed();
  await preferences({motionReduced: true});
  const ui = await mountPlatform();
  try {
    await clickButton(ui.host.querySelector('.orbital-navigation'), 'Sistemas');
    assert.equal(window.location.hash, '#inicio/sistemas');
    await waitFor(() => ui.host.querySelector('.orbital-home').dataset.phase === 'destination');
    await clickButton(ui.host, 'Início');
    await preferences({motionReduced: false});
    await clickButton(ui.host.querySelector('.orbital-navigation'), 'Fichas');
    assert.equal(ui.host.querySelector('.orbital-node[data-selected="true"]').textContent, 'Fichas');
    await preferences({motionReduced: true});
    assert.equal(window.location.hash, '#inicio/fichas');
  } finally {
    await ui.close();
    await preferences({motionReduced: false});
  }
});
