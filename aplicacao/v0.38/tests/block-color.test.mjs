import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBlockHex,blockHexToRGB,blockRGBToHex} from '../lib/sheet-visual.ts';
import {SHEET_DIE_PATHS} from '../lib/sheet-die-paths.ts';
test('HEX e RGB representam exatamente a mesma cor, incluindo extremos e HEX abreviado',()=>{
 for(const [hex,rgb] of [['#7828c8','120, 40, 200'],['#000000','0, 0, 0'],['#ffffff','255, 255, 255'],['#12abef','18, 171, 239']]){assert.equal(blockHexToRGB(hex),rgb);assert.equal(blockRGBToHex(rgb),hex);assert.equal(blockRGBToHex('rgb('+rgb+')'),hex);assert.equal(normalizeBlockHex(hex.toUpperCase()),hex);}
 assert.equal(normalizeBlockHex('#abc'),'#aabbcc');assert.equal(normalizeBlockHex('7828C8'),'#7828c8');
});
test('Cores inválidas ou CSS ativo são recusados sem produzir uma sobrescrita',()=>{
 for(const value of ['','12, 40','256, 0, 1','-1, 2, 3','3.5, 4, 5','rgb(1,2,3','1,2,3)','1,2,3,4','url(javascript:alert(1))'])assert.equal(blockRGBToHex(value),null,value);
 for(const value of ['#abcd','#12345','#zzffff','transparent','url(x)'])assert.equal(normalizeBlockHex(value),null,value);
});
test('As geometrias aprovadas de d4, d6 e d8 permanecem exatamente iguais',()=>{
 assert.equal(SHEET_DIE_PATHS[4],'m100 13 85 153-164 18Z M100 13l9 115 76 38 M109 128l-88 56');
 assert.equal(SHEET_DIE_PATHS[6],'m100 12 77 44v89l-77 44-77-44V56Z M23 56l77 44 77-44 M100 100v89');
 assert.equal(SHEET_DIE_PATHS[8],'m100 8 79 92-79 92-79-92Z M100 8v112l79-20 M21 100l79 20v72');
});
