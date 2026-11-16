import test from 'node:test';import assert from 'node:assert/strict';
import {mountPlatform,preferences,act,waitFor,clickButton} from './helpers/platform-dom.mjs';
async function move(svg,x,y,type='mouse'){const e=new Event('pointermove',{bubbles:true});Object.defineProperties(e,{pointerType:{value:type},clientX:{value:x},clientY:{value:y}});await act(async()=>svg.dispatchEvent(e));}
async function mountContextualHome(){
 sessionStorage.clear();
 const ui=await mountPlatform();
 try{
  await clickButton(ui.host,'Entrar no sistema AB10 — Absolute 10');
  await clickButton(ui.host,'Início');
  return ui;
 }catch(error){await ui.close();throw error;}
}
const pause=ms=>act(async()=>{await new Promise(r=>setTimeout(r,ms));});
test('Dado principal gira a geometria, conserva o centro e retoma a orientação; sem quadros contínuos após estabilizar',async()=>{
 await preferences({narrow:false,motionReduced:false});const ui=await mountContextualHome();try{const svg=ui.host.querySelector('.discovery-hero-art .hero-die-3d');svg.getBoundingClientRect=()=>({width:200,height:200});const path=svg.querySelector('.hero-die-edge'),original=path.getAttribute('d');assert.equal(svg.querySelectorAll('.hero-die-edge').length,30);assert.equal(svg.querySelectorAll('.hero-die-face').length,0);assert.equal(svg.getAttribute('fill'),'none');await move(svg,90,90);await move(svg,130,110);await waitFor(()=>path.getAttribute('d')!==original);await pause(700);const settled=path.getAttribute('d');await pause(100);assert.equal(path.getAttribute('d'),settled);await act(async()=>svg.dispatchEvent(new Event('pointerleave')));await move(svg,50,70);assert.equal(path.getAttribute('d'),settled);await move(svg,70,100);await waitFor(()=>path.getAttribute('d')!==settled);assert.equal(svg.getAttribute('viewBox'),'0 0 200 200');assert.equal(svg.style.transform,'');assert.equal(svg.style.left,'');}finally{await ui.close();}
});
test('Toque, mobile, movimento reduzido e página oculta preservam a orientação estática',async()=>{
 await preferences({narrow:false,motionReduced:false});const ui=await mountContextualHome();try{const svg=ui.host.querySelector('.discovery-hero-art .hero-die-3d');svg.getBoundingClientRect=()=>({width:200,height:200});const path=svg.querySelector('.hero-die-edge'),original=path.getAttribute('d');for(const mode of ['touch','mobile','reduced','hidden']){await preferences({narrow:mode==='mobile',motionReduced:mode==='reduced'});Object.defineProperty(document,'visibilityState',{configurable:true,value:mode==='hidden'?'hidden':'visible'});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));await move(svg,70,70,mode==='touch'?'touch':'mouse');await move(svg,130,120,mode==='touch'?'touch':'mouse');await pause(40);assert.equal(path.getAttribute('d'),original,mode);}}finally{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});await ui.close();await preferences({narrow:false,motionReduced:false});}
});
