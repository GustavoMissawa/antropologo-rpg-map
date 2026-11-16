import {JSDOM} from 'jsdom';
import ts from 'typescript';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';
import React,{act} from 'react';
import 'fake-indexeddb/auto';

// React + simulated DOM/IndexedDB integration. No browser layout or phone is emulated.
const rootDir=fileURLToPath(new URL('../../',import.meta.url));mkdirSync(join(rootDir,'.sites-runtime'),{recursive:true});
const output=mkdtempSync(join(rootDir,'.sites-runtime/platform-dom-')),modules=new Map();
function compile(file){if(modules.has(file))return modules.get(file);const dest=join(output,modules.size+'.mjs');modules.set(file,dest);let js=ts.transpileModule(readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;js=js.replace(/(from\s*|import\s*)(['"])(\.[^'"]+)\2/g,(whole,start,quote,name)=>{let next=resolve(dirname(file),name);if(!existsSync(next))next=['.ts','.tsx','.mjs'].map(ext=>next+ext).find(existsSync);if(!next)throw Error('Import não resolvido: '+name);return start+quote+pathToFileURL(/\.tsx?$/.test(next)?compile(next):next).href+quote;});writeFileSync(dest,js);return dest;}
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://platform-test.invalid',pretendToBeVisual:true});
for(const key of ['window','document','navigator','Element','HTMLElement','HTMLDialogElement','HTMLInputElement','Event','MouseEvent','KeyboardEvent','MutationObserver','sessionStorage','FormData','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,key,{configurable:true,value:['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?dom.window[key].bind(dom.window):dom.window[key]});
// React DOM detects input-event support during import, after the simulated DOM is available.
const {createRoot}=await import('react-dom/client');
const nativeTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>{const timer=nativeTimeout(fn,ms,...args);if(ms>5000)timer.unref?.();return timer;};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.scrollTo=()=>{};HTMLElement.prototype.scrollIntoView=()=>{};HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
const medias=new Map();let mobile=false,reduced=false;
globalThis.matchMedia=window.matchMedia=query=>{if(!medias.has(query)){const listeners=new Set();medias.set(query,{media:query,get matches(){return query.includes('reduced-motion')?reduced:query.includes('max-width')?mobile:query.includes('pointer:fine')||query.includes('hover:hover');},addEventListener:(_event,fn)=>listeners.add(fn),removeEventListener:(_event,fn)=>listeners.delete(fn),notify(){for(const fn of listeners)fn();}});}return medias.get(query);};
export const calls=[];
globalThis.fetch=async url=>{calls.push(String(url));return {ok:true,json:async()=>String(url)==='/api/auth/session'?{user:{handle:'teste_simulado',expiresAt:Date.now()+7200000}}:[]};};
const {default:App}=await import(pathToFileURL(compile(join(rootDir,'app/page.tsx'))));
export async function waitFor(condition){for(let i=0;i<100;i++){if(condition())return;await act(async()=>{await new Promise(r=>setTimeout(r,10));});}throw Error('Estado esperado não apareceu.');}
export async function mountPlatform(){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>root.render(React.createElement(App)));await waitFor(()=>host.querySelector('[data-session-ready="true"]')&&!host.textContent.includes('Aguarde…'));return {host,async close(){await act(async()=>root.unmount());host.remove();}};}
export async function clickButton(host,label){const el=[...host.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label||b.textContent.trim()===label);if(!el||el.disabled)throw Error('Botão indisponível: '+label);await act(async()=>el.click());}
export async function preferences({narrow=mobile,motionReduced=reduced}={}){mobile=narrow;reduced=motionReduced;await act(async()=>{for(const m of medias.values())m.notify();});}
export {act};

export async function mountAmbient(){const {HomeDiceBackground}=await import(pathToFileURL(compile(join(rootDir,'app/home-dice-background.tsx'))));const host=document.createElement('div');document.body.append(host);const root=createRoot(host);await act(async()=>root.render(React.createElement(HomeDiceBackground)));await waitFor(()=>host.querySelector('.ambient-die'));return {host,async close(){await act(async()=>root.unmount());host.remove();}};}
