import test from 'node:test';import assert from 'node:assert/strict';
import {superPngImageRect} from '../lib/super-png-cover-layout.ts';
import {renderSuperPngCover} from '../app/super-png-cover.ts';
import {makeRulebook,makeSheet} from '../lib/model.ts';
import {assignThemeAsset,emptySystemVisuals,parseSystemVisuals,pruneThemeAssets,THEME_MEDIA_LIMIT,themeUsage} from '../lib/system-visuals.ts';
import {fixture,pngAsset,gifAsset,sixMiBTheme} from './helpers/theme-fixtures.mjs';
import {serializeExportContent,readContentFile} from '../lib/content-file.ts';
import {embedSuperPng} from '../lib/super-png.ts';
test('Enquadramento da capa preserva proporções, recorte, posição e tamanho nativo',()=>{
 assert.deepEqual(superPngImageRect(1200,600,{fit:'contain',x:50,y:50}),{x:0,y:355,width:900,height:450});
 assert.deepEqual(superPngImageRect(100,200,{fit:'native',x:0,y:100}),{x:0,y:960,width:100,height:200});
 const cover=superPngImageRect(1200,600,{fit:'cover',x:100,y:50});assert(Math.abs(cover.x+1420)<1e-6);assert.equal(cover.y,0);assert.equal(cover.height,1160);assert(Math.abs(cover.width-2320)<1e-6);
 for(const size of [[0,300],[100,NaN],[Infinity,100]])assert.throws(()=>superPngImageRect(...size,{fit:'contain',x:50,y:50}));
});
test('Capa aceita imagens estáticas, participa da cota atual e não permite GIF ou fontes executáveis',()=>{
 const asset=pngAsset(),theme=assignThemeAsset(emptySystemVisuals(),'superPngCover',asset);assert.equal(theme.areas.superPngCover.opacity,1);assert.equal(theme.areas.superPngCover.overlayOpacity,0);assert.equal(themeUsage(theme).media,fixture('static.png').length);assert.equal(THEME_MEDIA_LIMIT,6*1024*1024);
 assert.throws(()=>assignThemeAsset(sixMiBTheme(),'superPngCover',asset),/6 mb/);
 assert.throws(()=>assignThemeAsset(theme,'superPngCover',gifAsset()),/estática/);
 for(const src of ['javascript:alert(1)','https://example.com/image.png','data:image/svg+xml;base64,PHN2Zz4='])assert.throws(()=>assignThemeAsset(theme,'superPngCover',{src}));
 const removed=pruneThemeAssets({...theme,areas:{superPngCover:{...theme.areas.superPngCover,assetId:null}}});assert.equal(Object.keys(removed.assets).length,0);assert.doesNotThrow(()=>parseSystemVisuals(removed));
});
test('JSON e Super PNG preservam a capa, enquadramento e regras na exportação e reimportação',async()=>{
 let theme=assignThemeAsset(emptySystemVisuals(),'superPngCover',pngAsset());theme.areas.superPngCover={...theme.areas.superPngCover,fit:'cover',x:28,y:73,opacity:.8,overlayColor:'#123456',overlayOpacity:.1};
 const book={...makeRulebook('Capa temporária'),visuals:theme},before=JSON.stringify(book),json=serializeExportContent(book);
 for(const file of [new File([json],'sistema.json'),new File([embedSuperPng(fixture('static.png'),'ruleset',book.name,JSON.parse(json))],'sistema.png')]){const imported=await readContentFile(file);assert.deepEqual(imported.content.visuals,theme);assert.deepEqual(imported.content.chapters,book.chapters);assert.equal(imported.content.name,book.name);}
 assert.equal(JSON.stringify(book),before);assert.equal(JSON.parse(serializeExportContent(makeRulebook('Anterior'))).visuals,undefined);
});
function fakeCanvas(){
 const calls=[],state={globalAlpha:1},stack=[];
 const ctx=new Proxy(state,{get(target,key){if(key in target)return target[key];if(key==='measureText')return text=>({width:text.length*12});if(key==='createLinearGradient')return ()=>({addColorStop(){}});return (...args)=>{calls.push({key,args,alpha:target.globalAlpha});if(key==='save')stack.push({...target});if(key==='restore')Object.assign(target,stack.pop());};}});
 const canvas={width:0,height:0,getContext:()=>ctx,toBlob:fn=>fn(new Blob([fixture('static.png')],{type:'image/png'}))};
 const originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),originalImage=Object.getOwnPropertyDescriptor(globalThis,'Image');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>canvas}});
 Object.defineProperty(globalThis,'Image',{configurable:true,value:class{naturalWidth=1200;naturalHeight=600;set src(value){this.source=value;queueMicrotask(()=>value?this.onload?.():null);}get src(){return this.source;}}});
 return {calls,canvas,close(){for(const [name,descriptor] of [['document',originalDocument],['Image',originalImage]]){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}}};
}
test('Canvas simulado usa a imagem e os ajustes da capa, sem substituir dados ou escrever textos por cima',async()=>{
 const mock=fakeCanvas();try{
  let theme=assignThemeAsset(emptySystemVisuals(),'superPngCover',pngAsset());theme.areas.superPngCover={...theme.areas.superPngCover,opacity:.7,overlayOpacity:.2};const book={...makeRulebook('Arte de capa'),visuals:theme},before=JSON.stringify(book);
  const blob=await renderSuperPngCover(book,'#43855a');assert.equal(blob.type,'image/png');assert.equal(mock.canvas.width,900);assert.equal(mock.canvas.height,1160);
  const draw=mock.calls.find(c=>c.key==='drawImage');assert.deepEqual(draw.args.slice(1),[0,355,900,450]);assert.equal(draw.alpha,.7);assert.equal(mock.calls.filter(c=>c.key==='fillRect').at(-1).alpha,.2);assert(!mock.calls.some(c=>c.key==='fillText'));assert.equal(JSON.stringify(book),before);
 }finally{mock.close();}
});
test('Canvas simulado mantém a capa automática sem personalização e preserva a capa das fichas',async()=>{
 const mock=fakeCanvas();try{for(const content of [makeRulebook('Sistema anterior'),makeSheet('Personagem anterior','')]){mock.calls.length=0;await renderSuperPngCover(content,'#43855a');assert(mock.calls.some(c=>c.key==='fillText'&&c.args[0]==='ANTROPOLOGO RPG  /  SUPER PNG'));assert(mock.calls.some(c=>c.key==='fillText'&&c.args[0].includes(content.name)));}}finally{mock.close();}
});
