import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {INITIAL_REVISION,STORAGE_KEY,canPublish,resolveInitialMap,restoreMap,snapshotMap,styleEdge} from '../src/map-state.js';
import {openDraftStorage,TAB_DRAFT_KEY} from '../src/draft-storage.js';
import {fetchSharedMap,publishSharedMap} from '../src/github-sync.js';

const read = path => readFile(new URL(path,import.meta.url));
const model = JSON.parse(await read('../public/data/map.json'));
const seed = JSON.parse(await read('../public/data/edicoes.json'));
const original = {
  nodes:model.cards.map(c=>({id:c.id,position:c.positionFigma,data:c})),
  edges:model.connections.map(e=>styleEdge({...e,data:{section:e.section,figmaDerived:true}},true)),
};
const baseDraft = snapshotMap(original.nodes,original.edges);
const fileSha = 'f'.repeat(40);

function changed(draft,title) {
  const copy = structuredClone(draft);
  copy.nodes[0].data.title = title;
  return copy;
}
function version(draft,revision='another-revision') {
  return {...seed,revision,draft};
}
function wireFile(document) {
  return {sha:fileSha,encoding:'base64',content:Buffer.from(JSON.stringify(document)).toString('base64')};
}

test('a fonte inclui os 90 cartões, 47 conexões, 37 caminhos e todos os códigos de captura',async ()=>{
  assert.equal(model.cards.length,90);
  assert.equal(model.connections.length,47);
  assert.equal(model.journeys.length,37);
  const ids = new Set(model.cards.map(c=>c.id));
  assert.equal(ids.size,90);
  for (const edge of [...model.connections,...model.journeys]) {
    assert(ids.has(edge.source)&&ids.has(edge.target));
  }
  const files = await readdir(new URL('../public/screens/',import.meta.url));
  assert.equal(files.length,149);
  const byCode = new Map(model.screenshots.map(s=>[s.code,s]));
  assert.equal(byCode.size,150);
  const counts = {desktop:0,mobile:0,extra:0};
  for (const entry of model.screenshots) {
    counts[entry.device] += 1;
    const bytes = await read('../public'+entry.image);
    assert.equal(createHash('sha1').update(bytes).digest('hex'),entry.hash);
  }
  assert.deepEqual(counts,{desktop:81,mobile:68,extra:1});
  for (const card of model.cards) for (const code of card.refs) assert(byCode.has(code),code);
});

test('rascunho da versão anterior preserva posições e conteúdo e recebe as referências atualizadas',()=>{
  const imported = changed(baseDraft,'Ficha de Bárbara');
  imported.nodes[0].position.x = 320;
  imported.nodes[0].data.notes = 'Anotação';
  imported.edges[0].label = 'Relação editada';
  const out = resolveInitialMap(original,seed,imported);
  assert.equal(out.baseline.revision,INITIAL_REVISION);
  assert.equal(out.map.nodes[0].data.title,'Ficha de Bárbara');
  assert.equal(out.map.nodes[0].position.x,320);
  assert.deepEqual(out.map.nodes[0].data.refs,original.nodes[0].data.refs);
  assert.equal(out.map.edges[0].label,'Relação editada');
  assert.throws(()=>restoreMap({...imported,nodes:[{id:imported.nodes[0].id,position:{x:'a',y:10}}]},original),/posição/);
});

test('publicação adota a versão compartilhada quando limpa e conserva rascunho em conflito',()=>{
  const remoteDraft = changed(baseDraft,'Atualizado no GitHub');
  const localDraft = changed(baseDraft,'Rascunho ainda não publicado');
  const clean = resolveInitialMap(original,version(remoteDraft),baseDraft);
  assert.equal(clean.map.nodes[0].data.title,'Atualizado no GitHub');
  const dirty = resolveInitialMap(original,version(remoteDraft),localDraft);
  assert.equal(dirty.map.nodes[0].data.title,'Rascunho ainda não publicado');
  assert(!canPublish(dirty.baseline,version(remoteDraft)));
  assert(!canPublish(dirty.baseline,version(remoteDraft,INITIAL_REVISION)));
  assert(canPublish(dirty.baseline,version(baseDraft,INITIAL_REVISION)));
});

test('versão confirmada permanece ao reabrir durante o deploy e acompanha o GitHub quando acessível',()=>{
  const synced = changed(baseDraft,'Já publicado no GitHub');
  const saved = {...synced,sync:{revision:'edicao-confirmada',draft:synced}};
  const stalePages = version(null,INITIAL_REVISION);
  const fallback = resolveInitialMap(original,stalePages,saved,{preserveConfirmed:true});
  assert.equal(fallback.map.nodes[0].data.title,'Já publicado no GitHub');
  assert.equal(fallback.baseline.revision,'edicao-confirmada');
  assert(!canPublish(fallback.baseline,version(baseDraft,INITIAL_REVISION)));

  const newer = version(changed(synced,'Edição seguinte'),'edicao-seguinte');
  const authoritative = resolveInitialMap(original,newer,saved);
  assert.equal(authoritative.map.nodes[0].data.title,'Edição seguinte');
  assert(canPublish(authoritative.baseline,newer));

  const dirty = {...changed(synced,'Rascunho posterior'),sync:saved.sync};
  const draft = resolveInitialMap(original,newer,dirty);
  assert.equal(draft.map.nodes[0].data.title,'Rascunho posterior');
  assert(!canPublish(draft.baseline,newer));
});

function testStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key,value) => values.set(key,value),
  };
}

test('uma aba desatualizada guarda suas alterações sem sobrescrever o rascunho compartilhado',()=>{
  const localStorage = testStorage();
  const first = openDraftStorage({localStorage,sessionStorage:testStorage()});
  const otherBrowser = {localStorage,sessionStorage:testStorage()};
  const second = openDraftStorage(otherBrowser);
  const firstDraft = changed(baseDraft,'Primeira aba');
  const secondDraft = changed(baseDraft,'Segunda aba');
  assert.equal(first.save(JSON.stringify(firstDraft)),'shared');
  assert.equal(second.save(JSON.stringify(secondDraft)),'tab');
  assert.deepEqual(JSON.parse(localStorage.getItem(STORAGE_KEY)),firstDraft);
  const reopened = openDraftStorage(otherBrowser);
  assert.equal(reopened.status,'tab');
  assert.deepEqual(reopened.saved,secondDraft);
});

test('falha ao escrever no armazenamento compartilhado preserva a cópia da aba ou sinaliza a falha',()=>{
  const invalidLocal = testStorage();
  invalidLocal.setItem(STORAGE_KEY,'rascunho interrompido');
  const sessionStorage = testStorage();
  const stored = openDraftStorage({localStorage:invalidLocal,sessionStorage});
  assert(stored.invalid);
  const json = JSON.stringify(baseDraft);
  assert.equal(stored.save(json),'tab');
  assert.equal(invalidLocal.getItem(STORAGE_KEY),'rascunho interrompido');
  assert.equal(sessionStorage.getItem(TAB_DRAFT_KEY),json);

  const blocked = {getItem:()=>null,setItem:()=>{throw Error('Quota excedida');}};
  assert.equal(openDraftStorage({localStorage:blocked,sessionStorage:blocked}).save(json),'unavailable');
});

test('leitura usa o arquivo fixo em main e escrita exige o SHA da versão consultada',async ()=>{
  const requests = [];
  const draft = changed(baseDraft,'Testando São Paulo 🎲');
  const fake = async (url,options)=>{
    requests.push({url,options});
    if(options.method==='PUT')return Response.json({commit:{html_url:'https://github.com/GustavoMissawa/antropologo-rpg-map/commit/validated'}});
    return Response.json(wireFile(version(draft)));
  };
  const read = await fetchSharedMap({fetcher:fake});
  assert.equal(read.sha,fileSha);
  assert.equal(read.document.draft.nodes[0].data.title,'Testando São Paulo 🎲');
  await assert.rejects(publishSharedMap({token:'test-token',sha:'',draft,fetcher:fake}),/versão remota/);
  const saved = await publishSharedMap({token:'test-token',sha:read.sha,draft,fetcher:fake,newRevision:()=> 'new-revision'});
  assert.equal(requests.length,2);
  assert.match(requests[0].url,/\/public\/data\/edicoes\.json\?ref=main$/);
  assert.equal(requests[0].options.headers.Authorization,undefined);
  assert.equal(requests[1].options.headers.Authorization,'Bearer test-token');
  const body = JSON.parse(requests[1].options.body);
  assert.equal(body.sha,fileSha);
  assert.equal(body.branch,'main');
  const sent = JSON.parse(Buffer.from(body.content,'base64').toString());
  assert.equal(sent.draft.nodes[0].data.title,'Testando São Paulo 🎲');
  assert.equal(sent.revision,'new-revision');
  assert(saved.commitUrl);
});

test('conflito de gravação, credencial inválida e erro de conexão são sinalizados',async ()=>{
  const fail = status => async()=>new Response(null,{status});
  await assert.rejects(fetchSharedMap({fetcher:fail(401)}),/token/i);
  await assert.rejects(fetchSharedMap({fetcher:async()=>{throw Error('offline');}}),/rascunho/);
  await assert.rejects(publishSharedMap({token:'test-token',sha:fileSha,draft:baseDraft,fetcher:fail(409)}),/versão remota/);
});
