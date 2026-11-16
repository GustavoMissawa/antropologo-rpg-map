import { test } from 'node:test';
import assert from 'node:assert/strict';
import { palettes } from '../lib/appearance.ts';
const luminance = hex => {
 const rgb = hex.slice(1).match(/../g).map(v => parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
};
test('As oito paletas mantêm contraste legível nos botões dos dois modos',()=>{
 for(const p of palettes)for(const mode of ['light','dark']){
  const a=luminance(p[mode]),b=luminance(p[mode==='light'?'onLight':'onDark']);
  assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${p.name} / ${mode}`);
 }
});

test('Rubi e Âmbar mantêm texto legível nas superfícies dos dois modos',async()=>{
 const {readFileSync}=await import('node:fs');const css=readFileSync(new URL('../app/appearance.css',import.meta.url),'utf8');
 const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 for(const id of ['red','orange'])for(const mode of ['light','dark']){
  const selector=mode==='dark'?`:root[data-mode="dark"][data-palette="${id}"]`:`:root[data-palette="${id}"]`,start=css.lastIndexOf(selector+'{');assert(start>=0);const block=css.slice(start+selector.length+1,css.indexOf('}',start));const vars=Object.fromEntries([...block.matchAll(/--([\w-]+):([^;]+)/g)].map(m=>[m[1],m[2]]));
  for(const surface of ['bg','paper','surface-soft','accent-soft'])for(const text of ['ink','muted'])assert(contrast(vars[text],vars[surface])>=4.5,`${id} ${mode}: ${text}/${surface}`);
  assert(contrast(vars['accent-ink'],vars.paper)>=4.5,`${id} ${mode}: destaque`);
 }
});
