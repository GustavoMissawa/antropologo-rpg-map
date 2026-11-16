import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(join(process.env.RUNNER_TEMP, 'orbital-browser/node_modules/playwright/index.mjs')).href);
const output = join(process.env.RUNNER_TEMP, 'orbital-capturas');
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const url = 'http://127.0.0.1:8787/#inicio';
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });

const cases = [
  { name: 'home-claro-floresta-dourado.jpg', mode: 'Claro', modeId: 'light', primary: 'Floresta', palette: 'green', secondary: 'Dourado' },
  { name: 'home-claro-ametista-rosa.jpg', mode: 'Claro', modeId: 'light', primary: 'Ametista', palette: 'purple', secondary: 'Rosa' },
  { name: 'home-escuro-floresta-dourado.jpg', mode: 'Escuro', modeId: 'dark', primary: 'Floresta', palette: 'green', secondary: 'Dourado' },
  { name: 'home-escuro-safira-ciano.jpg', mode: 'Escuro', modeId: 'dark', primary: 'Safira', palette: 'blue', secondary: 'Ciano' },
];

const dialog = page.getByRole('dialog');
const start = page.getByRole('button', { name: 'Voltar ao ANTROPOLOGO', exact: true });
const settings = page.getByRole('button', { name: 'Configurações', exact: true });

function faceState() {
  return [...document.querySelectorAll('.orbital-d20 polygon[visibility="visible"]')]
    .map(face => face.getAttribute('points')).join('|');
}

async function rendered() {
  await page.waitForSelector('.orbital-art[data-painted="true"]', { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
}

try {
  await page.goto(url);
  await rendered();
  const backgrounds = new Map();
  for (const sample of cases) {
    await settings.click();
    for (const label of [sample.mode, sample.primary, sample.secondary]) {
      await dialog.getByText(label, { exact: true }).click();
    }
    await dialog.getByRole('button', { name: 'Pronto' }).click();
    await page.reload();
    await rendered();
    const scene = await page.evaluate(() => {
      const shape = document.querySelector('.orbital-d20');
      const visible = [...shape.querySelectorAll('polygon[visibility="visible"]')];
      const pixel = document.createElement('canvas').getContext('2d');
      function opaque(face) {
        const style = getComputedStyle(face);
        pixel.clearRect(0, 0, 1, 1);
        pixel.fillStyle = 'transparent';
        pixel.fillStyle = style.fill;
        pixel.fillRect(0, 0, 1, 1);
        return pixel.getImageData(0, 0, 1, 1).data[3] === 255 && style.opacity === '1' && style.fillOpacity === '1';
      }
      const shell = document.querySelector('.orbital-home-mode');
      return {
        mode: document.documentElement.dataset.mode,
        palette: document.documentElement.dataset.palette,
        header: getComputedStyle(shell.querySelector('.topbar')).backgroundImage,
        atmosphere: getComputedStyle(shell.querySelector('.main-wrap'), '::before').backgroundImage,
        inverse: getComputedStyle(shell.querySelector('.main-wrap'), '::after').filter,
        faces: shape.querySelectorAll('polygon').length,
        visible: visible.length,
        opaque: visible.every(opaque),
        edgesThroughBody: shape.querySelectorAll('path').length,
      };
    });
    assert.equal(scene.mode, sample.modeId);
    assert.equal(scene.palette, sample.palette);
    assert.match(scene.header, /linear-gradient/);
    assert.equal(scene.faces, 20);
    assert.ok(scene.visible > 0 && scene.visible < scene.faces);
    assert.ok(scene.opaque);
    assert.equal(scene.edgesThroughBody, 0);
    if (sample.modeId === 'light') {
      assert.ok(!scene.atmosphere.includes('orbital-nebula.webp'));
      assert.equal(scene.inverse, 'none');
    }
    assert.notEqual(scene.header, backgrounds.get(sample.modeId));
    backgrounds.set(sample.modeId, scene.header);
    await page.screenshot({ path: join(output, sample.name), type: 'jpeg', quality: 92 });
    console.log('Cena validada', sample.name, scene.visible + ' faces visíveis');
  }

  await settings.click();
  for (const [group, expected] of [['Modo de exibição', 'Escuro'], ['Paleta primária', 'Safira'], ['Paleta secundária', 'Ciano']]) {
    assert.equal(await dialog.getByRole('group', { name: group }).locator('label.chosen').innerText(), expected);
  }
  await dialog.screenshot({ path: join(output, 'aparencia.jpg'), type: 'jpeg', quality: 92 });
  await dialog.getByRole('tab', { name: 'Sobre' }).click();
  assert.match(await dialog.getByRole('tabpanel', { name: 'Sobre' }).innerText(), /0\.40/);
  await dialog.screenshot({ path: join(output, 'sobre.jpg'), type: 'jpeg', quality: 92 });
  await dialog.getByRole('button', { name: 'Pronto' }).click();

  const die = page.locator('.orbital-d20');
  const initial = await die.boundingBox();
  const frames = [];
  for (let i = 1; i <= 4; i++) {
    if (i > 1) await page.waitForTimeout(520);
    const frame = await page.evaluate(faceState);
    assert.ok(frame && !frames.includes(frame));
    frames.push(frame);
    assert.deepEqual(await die.boundingBox(), initial);
    await die.screenshot({ path: join(output, 'd20-0' + i + '.jpg'), type: 'jpeg', quality: 95 });
  }

  const tilt = page.locator('.orbital-stream');
  const before = await tilt.evaluate(el => getComputedStyle(el).transform);
  await page.waitForFunction(value => getComputedStyle(document.querySelector('.orbital-stream')).transform !== value, before);

  const orbital = page.getByRole('navigation', { name: 'Navegação orbital' });
  const beam = page.locator('.orbital-connection');
  assert.equal(await beam.getAttribute('data-active'), 'false');
  await orbital.getByRole('button', { name: 'Sistemas', exact: true }).hover();
  assert.equal(await beam.getAttribute('data-active'), 'true');
  await page.mouse.move(10, 10);
  assert.equal(await beam.getAttribute('data-active'), 'false');
  for (const [label, hash] of [['Sistemas', 'regras'], ['Fichas', 'ficha'], ['PDFs', 'pdfs'], ['Agenda', 'agenda']]) {
    await orbital.getByRole('button', { name: label, exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#' + hash);
    await start.click();
    await rendered();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForSelector('.orbital-art[data-motion="paused"]');
  const reduced = await page.evaluate(faceState);
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(faceState), reduced);

  await writeFile(join(output, 'README.md'), [
    '# Home Orbital v0.40',
    '',
    'Capturas da prévia isolada em Chromium a 1440 × 900, com sessão de visitante e dados locais de teste. O site público segue identificado pela publicação 89.',
    '',
    '| Modo e par de paletas | Captura |',
    '| --- | --- |',
    '| Claro · Floresta e Dourado | [Abrir](home-claro-floresta-dourado.jpg) |',
    '| Claro · Ametista e Rosa | [Abrir](home-claro-ametista-rosa.jpg) |',
    '| Escuro · Floresta e Dourado | [Abrir](home-escuro-floresta-dourado.jpg) |',
    '| Escuro · Safira e Ciano | [Abrir](home-escuro-safira-ciano.jpg) |',
    '',
    '## D20 em rotação',
    '',
    '| Quadro 1 | Quadro 2 | Quadro 3 | Quadro 4 |',
    '| --- | --- | --- | --- |',
    '| ![D20 no quadro 1](d20-01.jpg) | ![D20 no quadro 2](d20-02.jpg) | ![D20 no quadro 3](d20-03.jpg) | ![D20 no quadro 4](d20-04.jpg) |',
    '',
    'Os quatro quadros mostram o mesmo dado no centro da espiral. A malha tem 20 faces opacas. A projeção omite as faces traseiras.',
    '',
    '[Configurações → Aparência](aparencia.jpg) · [Configurações → Sobre](sobre.jpg)',
    '',
    'A validação no navegador conferiu os dois modos, a troca de paletas, a recarga, a opacidade, a animação, os atalhos orbitais e o movimento reduzido.',
    '',
    '[Implementação da Home Orbital](../../aplicacao/v0.40/docs/home-orbital-v040.md)',
    '',
  ].join('\n'));
  console.log('Capturadas quatro combinações e quatro orientações; recarga, animações e navegação verificadas.');
} finally {
  await browser.close();
}
