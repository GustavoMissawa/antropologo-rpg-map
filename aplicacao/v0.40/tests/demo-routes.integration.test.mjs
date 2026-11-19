import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,readdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {localRouteDatabase} from './helpers/local-route-database.mjs';

test('Rotas reais de conta e agenda passam pela migração, autenticação, autorização e expiração em SQLite isolado',async t=>{
 const root=fileURLToPath(new URL('../',import.meta.url)),require=createRequire(import.meta.url),wrangler=createRequire(require.resolve('wrangler/package.json')),{build}=wrangler('esbuild');
 mkdirSync(join(root,'.sites-runtime'),{recursive:true});const output=mkdtempSync(join(root,'.sites-runtime/routes-qa-')),database=localRouteDatabase();
 globalThis.__antropologoRouteTestBindings={DB:database};
 try{
  const migrations=join(root,'drizzle');
  for(const name of readdirSync(migrations).filter(file=>file.endsWith('.sql')).sort()){
   for(const sql of readFileSync(join(migrations,name),'utf8').split('--> statement-breakpoint').filter(s=>s.trim()))database.exec(sql);
  }
  const bundled=await build({stdin:{contents:'export {runAuthChecks} from "./tests/demo-auth.integration.ts";',resolveDir:root,sourcefile:'qa-local-routes.ts',loader:'ts'},bundle:true,write:false,format:'esm',platform:'neutral',mainFields:['module','main'],target:'es2022',define:{'import.meta.env.DEV':'false'},conditions:['worker','browser'],logLevel:'silent',plugins:[{name:'isolated-sqlite-bindings',setup(builder){builder.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'qa-bindings'}));builder.onLoad({filter:/.*/,namespace:'qa-bindings'},()=>({contents:'export const env=globalThis.__antropologoRouteTestBindings;',loader:'js'}));}}]});
  const file=join(output,'routes.mjs');writeFileSync(file,bundled.outputFiles[0].text);const {runAuthChecks}=await import(pathToFileURL(file));
  const checks=await runAuthChecks();assert(checks.length>=25);for(const check of checks)t.diagnostic(check);
 }finally{delete globalThis.__antropologoRouteTestBindings;database.close();rmSync(output,{recursive:true,force:true});}
});
