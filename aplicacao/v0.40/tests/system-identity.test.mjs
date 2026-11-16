import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {makeAB10Rulebook,makeRulebook,parseRulebook,serializeRulebook} from '../lib/model.ts';
import {systemThemeDefinition,parseSystemTheme,validSystemGif,systemSidebarSource,MAX_SYSTEM_GIF_BYTES} from '../lib/system-identity.ts';
const image='data:image/png;base64,'+readFileSync(new URL('./fixtures/system-logo.png',import.meta.url)).toString('base64');
const gif='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
test('Tema depende de capacidade do catálogo, nunca do nome ou de um campo importado',()=>{
 const official=makeAB10Rulebook();official.name='Outro nome de exibição';assert.equal(systemThemeDefinition(official).key,'absolute10');
 const common={...makeRulebook('AB10 — Absolute 10'),themeKey:'absolute10'};const imported=parseRulebook(common);assert.equal(systemThemeDefinition(imported),null);assert.equal(systemThemeDefinition(makeRulebook('Assimilação RPG')),null);assert.equal(systemThemeDefinition({themeKey:'__proto__'}),null);
 assert.equal(JSON.parse(serializeRulebook(official)).themeKey,undefined);
});
test('Alternar para nenhum sistema ou sistema comum não reaproveita o tema anterior',()=>{
 assert(systemThemeDefinition(makeAB10Rulebook()));for(const b of [null,undefined,makeRulebook('Comum'),{themeKey:'not-authorized'}])assert.equal(systemThemeDefinition(b),null);
});
test('Imagem, logo e GIF válidos preservam transparência e geram fonte estática em movimento reduzido',()=>{
 assert(validSystemGif(gif));const config=parseSystemTheme({logo:image,accent:'#AABBCC',sidebar:{src:gif,poster:image}});assert.equal(config.accent,'#aabbcc');assert.equal(systemSidebarSource(config,false),gif);assert.equal(systemSidebarSource(config,true),image);assert.equal(parseSystemTheme({}).sidebar,undefined);
});
test('Fundos recusam protocolos ativos, SVG, GIF pesado, dimensões grandes e poster ausente',()=>{
 for(const src of ['javascript:alert(1)','https://example.com/a.gif','data:image/svg+xml;base64,PHN2Zz4=',gif+'!'])assert.throws(()=>parseSystemTheme({sidebar:{src,poster:image}}));
 const bytes=Buffer.alloc(MAX_SYSTEM_GIF_BYTES+1);bytes.write('GIF89a');bytes.writeUInt16LE(1,6);bytes.writeUInt16LE(1,8);assert(!validSystemGif('data:image/gif;base64,'+bytes.toString('base64')));bytes.writeUInt16LE(1025,6);assert(!validSystemGif('data:image/gif;base64,'+bytes.subarray(0,100).toString('base64')));
 assert.throws(()=>parseSystemTheme({sidebar:{src:gif}}));assert.throws(()=>parseSystemTheme({accent:'red;display:none'}));
});
