import test from 'node:test';import assert from 'node:assert/strict';
import {makeRulebook,parseRulebook,serializeRulebook} from '../lib/model.ts';
import {MIB,serializedUtf8Size} from '../lib/content-limits.ts';
import {inspectThemeBytes,THEME_AREAS,THEME_LIMITS,THEME_MEDIA_LIMIT,THEME_GIF_LIMIT,emptySystemVisuals,assignThemeAsset,parseSystemVisuals,pruneThemeAssets,themeUsage,themeMediaSource,defaultThemePlacement} from '../lib/system-visuals.ts';
import {fixture,dataURL,pngAsset,gifAsset,sixMiBTheme,poster} from './helpers/theme-fixtures.mjs';
import {readContentFile,serializeExportContent} from '../lib/content-file.ts';
import {embedSuperPng} from '../lib/super-png.ts';
test('Os quatro formatos são identificados pelos bytes, independentemente da extensão',()=>{
 for(const [name,mime] of [['static.png','image/png'],['static.jpg','image/jpeg'],['static.webp','image/webp'],['animated.gif','image/gif']]){const info=inspectThemeBytes(fixture(name));assert.equal(info.mime,mime);assert(info.width>0&&info.height>0);}
 assert.throws(()=>inspectThemeBytes(new TextEncoder().encode('<svg onload="alert(1)"></svg>')));assert.throws(()=>parseSystemVisuals({version:1,assets:{media_x:{src:'data:image/svg+xml;base64,PHN2Zz4='}},areas:{mainBackground:defaultThemePlacement('mainBackground','media_x')}}));
});
test('As áreas de personalização são independentes e alterações do rascunho não mutam a configuração anterior',()=>{
 let t=emptySystemVisuals();for(const [i,area] of THEME_AREAS.entries())t=assignThemeAsset(t,area,pngAsset(1200+i*30,65+i));const previous=JSON.stringify(t),copy=assignThemeAsset(t,'collapsedLogo',pngAsset(1600,77));assert.equal(JSON.stringify(t),previous);assert.notEqual(copy.areas.collapsedLogo.assetId,t.areas.collapsedLogo.assetId);assert.deepEqual(copy.areas.expandedLogo,t.areas.expandedLogo);
 const areas={...copy.areas};delete areas.collapsedLogo;const restored=pruneThemeAssets({...copy,areas});assert.equal(restored.areas.collapsedLogo,undefined);assert.equal(Object.keys(restored.assets).length,THEME_AREAS.length-1);
});
test('Reutilizar arquivo compartilha os dados, mas o orçamento é somado por área',()=>{
 const asset=pngAsset();let t=assignThemeAsset(emptySystemVisuals(),'collapsedLogo',asset);t=assignThemeAsset(t,'expandedLogo',asset);assert.equal(Object.keys(t.assets).length,1);assert.equal(themeUsage(t).media,inspectThemeBytes(fixture('static.png')).bytes*2);const json=serializeRulebook({...makeRulebook('Compartilhado'),visuals:t});assert.equal(json.split(asset.src).length-1,1);assert.equal(serializedUtf8Size(JSON.parse(json)),new TextEncoder().encode(json).length);
});
test('Limites estáticos individuais aceitam o byte final e recusam o seguinte',()=>{
 for(const area of THEME_AREAS){assert.doesNotThrow(()=>assignThemeAsset(emptySystemVisuals(),area,pngAsset(THEME_LIMITS[area].static)));assert.throws(()=>assignThemeAsset(emptySystemVisuals(),area,pngAsset(THEME_LIMITS[area].static+1)),/limite|ultrapassa|inválida/);}
});
test('Cota visual aceita exatamente 6 MiB e recusa excesso, sem orçamento adicional ao sistema',()=>{
 const theme=sixMiBTheme();assert.equal(themeUsage(theme).media,THEME_MEDIA_LIMIT);assert.throws(()=>assignThemeAsset(theme,'collapsedBackground',pngAsset(1024*1024+36*1024+1,80)),/6 mb/);const book={...makeRulebook('Imagens'),visuals:theme};assert(new TextEncoder().encode(serializeRulebook(book)).length>6*MIB);
});
test('Cota agregada de GIFs é aplicada além da cota visual e dos limites por área',()=>{
 let t=assignThemeAsset(emptySystemVisuals(),'mainBackground',gifAsset(Math.floor(1.6*MIB),65));t=assignThemeAsset(t,'expandedBackground',gifAsset(Math.floor(1.2*MIB),66));assert(themeUsage(t).media<THEME_MEDIA_LIMIT);assert.throws(()=>assignThemeAsset(t,'collapsedLogo',gifAsset(Math.floor(.4*MIB),67)),/3 mb/);assert(THEME_GIF_LIMIT===3*MIB);
 for(const area of THEME_AREAS){assert.throws(()=>assignThemeAsset(emptySystemVisuals(),area,gifAsset(area==='superPngCover'?undefined:THEME_LIMITS[area].gif+20)),/limite|ultrapassa|inválida|estática/);}
});
test('GIFs têm duração, quadros, resolução e alternativa estática validados sem decodificar todos os pixels',()=>{
 const info=inspectThemeBytes(fixture('animated.gif'));assert.equal(info.frames,3);assert.equal(info.duration,300);assert.throws(()=>inspectThemeBytes(fixture('long.gif')),/8 segundos/);assert.throws(()=>inspectThemeBytes(fixture('many.gif')),/120 quadros/);assert(inspectThemeBytes(fixture('fast.gif')).fps>15);
 const oversized=fixture('animated.gif');oversized.writeUInt16LE(513,6);assert.throws(()=>assignThemeAsset(emptySystemVisuals(),'collapsedLogo',{src:dataURL(oversized,'image/gif'),poster}),/512/);assert.throws(()=>assignThemeAsset(emptySystemVisuals(),'mainBackground',{src:gifAsset().src}),/prévia/);
});
test('Arquivos truncados, CRC inválido, MIME falso e referências externas são recusados',()=>{
 for(const file of ['static.png','static.jpg','static.webp','animated.gif'])assert.throws(()=>inspectThemeBytes(fixture(file).subarray(0,-2)));
 const png=fixture('static.png');png[40]^=1;assert.throws(()=>inspectThemeBytes(png));for(const src of ['javascript:alert(1)','https://example.com/a.png',dataURL(fixture('animated.gif'),'image/png')])assert.throws(()=>assignThemeAsset(emptySystemVisuals(),'mainBackground',{src,poster}));
});
test('JSON e Super PNG preservam GIF original, cinco ajustes e sistemas comuns editáveis',async()=>{
 let theme=emptySystemVisuals();for(const [i,area] of THEME_AREAS.entries())theme=assignThemeAsset(theme,area,i===4?gifAsset():pngAsset(1200+i*10,65+i));theme.areas.mainBackground={...theme.areas.mainBackground,fit:'native',x:23,y:77,opacity:.41,overlayColor:'#123456',overlayOpacity:.62};const book={...makeRulebook('Criado pelo usuário'),visuals:theme},before=JSON.stringify(book),json=serializeExportContent(book);
 for(const file of [new File([json],'sistema.json'),new File([embedSuperPng(fixture('static.png'),'ruleset',book.name,JSON.parse(json))],'sistema.png')]){const r=await readContentFile(file);assert.deepEqual(r.content.visuals,theme);assert.equal(r.content.visuals.assets[theme.areas.mainBackground.assetId].src,gifAsset().src);}
 assert.equal(JSON.stringify(book),before);assert.equal(parseRulebook(makeRulebook('Anterior')).visuals,undefined);
});
test('Fontes animadas são distintas por estado e movimento reduzido retorna apenas o poster',()=>{
 let t=assignThemeAsset(emptySystemVisuals(),'collapsedLogo',gifAsset(3000,65));t=assignThemeAsset(t,'expandedLogo',gifAsset(3100,66));assert.notEqual(themeMediaSource(t,'collapsedLogo',true),themeMediaSource(t,'expandedLogo',true));assert.equal(themeMediaSource(t,'collapsedLogo',false),poster);assert.equal(themeMediaSource(undefined,'mainBackground',true),undefined);
});
