import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {openDraftStorage} from '../src/draft-storage.js';
import {fetchSharedMap,publishSharedMap} from '../src/github-sync.js';
import {ALPHA_VERSION,DEFAULT_VERSION,VERSIONS,checkMapVersion,editionFile,readVersionedEdition} from '../src/versions.js';

const read = async path => JSON.parse(await readFile(new URL('../'+path,import.meta.url)));
const sha = 'c'.repeat(40);

test('as versões abrem arquivos de mapa válidos em caminhos diferentes',async()=>{
  assert.equal(DEFAULT_VERSION,'0.40');
  for(const version of Object.values(VERSIONS)) {
    const [map,edition] = await Promise.all([
      read(`public${version.dataPath}/map.json`),
      read(editionFile(version.id)),
    ]);
    assert(map.cards.length>0);
    assert.equal(readVersionedEdition(edition,version.id),edition);
  }
  assert.notEqual(editionFile(ALPHA_VERSION),editionFile(DEFAULT_VERSION));
  assert.throws(()=>editionFile('toString'),/desconhecida/);
});

function memoryStorage() {
  const data = new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
}

test('a versão Alpha recupera o rascunho anterior e as duas versões gravam separadamente',()=>{
  const browser = {localStorage:memoryStorage(),sessionStorage:memoryStorage()};
  openDraftStorage(browser).save('{"origem":"editor anterior"}');
  const alpha = VERSIONS[ALPHA_VERSION];
  const development = VERSIONS[DEFAULT_VERSION];
  const devStorage = openDraftStorage(browser,development.storageKey);
  assert.equal(devStorage.saved,null);
  devStorage.save('{"origem":"desenvolvimento"}');
  assert.equal(openDraftStorage(browser,alpha.storageKey).saved.origem,'editor anterior');
  assert.equal(openDraftStorage(browser,development.storageKey).saved.origem,'desenvolvimento');
});

test('a sincronização de desenvolvimento só lê e grava seu próprio arquivo',async()=>{
  const edition = await read(editionFile(DEFAULT_VERSION));
  const draft = edition.draft ?? {version:1,nodes:[],edges:[]};
  const requests = [];
  const fetcher = async (url,options)=>{
    requests.push({url,options});
    if(options.method==='PUT')return Response.json({commit:{}});
    return Response.json({sha,encoding:'base64',content:Buffer.from(JSON.stringify(edition)).toString('base64')});
  };
  const remote = await fetchSharedMap({versionId:DEFAULT_VERSION,fetcher});
  await publishSharedMap({versionId:DEFAULT_VERSION,sha:remote.sha,token:'teste',draft,fetcher});
  assert(requests[0].url.endsWith('/public/data/v0.40/edicoes.json?ref=main'));
  assert(requests[1].url.endsWith('/public/data/v0.40/edicoes.json'));
  const request = JSON.parse(requests[1].options.body);
  assert.equal(request.sha,sha);
  assert.equal(JSON.parse(Buffer.from(request.content,'base64')).projectVersion,DEFAULT_VERSION);
  assert.throws(()=>checkMapVersion({projectVersion:ALPHA_VERSION},DEFAULT_VERSION),/0\.38/);
  checkMapVersion({},ALPHA_VERSION);
  assert.throws(()=>readVersionedEdition(edition,ALPHA_VERSION),/0\.40/);
});
