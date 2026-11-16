import {MAP_FORMAT, MAX_MAP_BYTES, readSharedDocument} from './map-state.js';

export const REPOSITORY = 'GustavoMissawa/antropologo-rpg-map';
export const REPOSITORY_URL = `https://github.com/${REPOSITORY}`;
const BRANCH = 'main';
const EDITIONS_FILE = 'public/data/edicoes.json';
const EDITIONS_API = `https://api.github.com/repos/${REPOSITORY}/contents/${EDITIONS_FILE}`;

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token && {Authorization:`Bearer ${token}`}),
  };
}

function encodeContent(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_MAP_BYTES) throw Error('Este mapa excede o limite de 900 kB por versão.');
  let binary = '';
  for (let offset=0; offset<bytes.length; offset+=8192) {
    binary += String.fromCharCode(...bytes.subarray(offset,offset+8192));
  }
  return btoa(binary);
}

function decodeContent(content) {
  const binary = atob(content.replace(/\s/g,''));
  const data = Uint8Array.from(binary,c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
}

async function send(url, options, fetcher) {
  let response;
  try { response = await fetcher(url,options); }
  catch { throw Error('Falha de conexão com o GitHub. O rascunho continua disponível neste navegador.'); }
  if (response.ok) return response.json();
  if (response.status === 401) throw Error('O token expirou ou é inválido.');
  if (response.status === 403 || response.status === 429) {
    if (response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0') {
      throw Error('O GitHub atingiu seu limite de requisições. Tente novamente mais tarde.');
    }
    throw Error('Confira o acesso e a permissão Contents: Read and write do token neste repositório.');
  }
  if (response.status === 404) throw Error('Arquivo de edições indisponível no GitHub. Confira o acesso ao repositório.');
  if (response.status === 409 || response.status === 422) {
    throw Error('O GitHub recusou a atualização. Verifique a versão remota antes de tentar de novo.');
  }
  throw Error(`O GitHub devolveu o erro ${response.status}.`);
}

export async function fetchSharedMap({token='',fetcher=fetch}={}) {
  const file = await send(`${EDITIONS_API}?ref=${BRANCH}`,{
    headers:headers(token),cache:'no-store',redirect:'error',
  },fetcher);
  if (file?.encoding !== 'base64' || typeof file.content !== 'string' ||
      typeof file.sha !== 'string' || !/^[0-9a-f]{40}$/.test(file.sha)) {
    throw Error('O GitHub devolveu um arquivo de edições inválido.');
  }
  return {sha:file.sha, document:readSharedDocument(decodeContent(file.content))};
}

export async function publishSharedMap({token,sha,draft,fetcher=fetch,newRevision=()=>crypto.randomUUID()}) {
  if (!token?.trim()) throw Error('Informe o token de escrita do GitHub.');
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) {
    throw Error('Verifique a versão remota antes de salvar.');
  }
  const document = readSharedDocument({format:MAP_FORMAT,version:1,revision:newRevision(),draft});
  const reply = await send(EDITIONS_API,{
    method:'PUT',redirect:'error',
    headers:{...headers(token.trim()),'Content-Type':'application/json'},
    body:JSON.stringify({
      branch:BRANCH,
      sha,
      message:'Atualiza mapa visual pelo editor',
      content:encodeContent(JSON.stringify(document,null,2)+'\n'),
    }),
  },fetcher);
  const commitUrl = reply.commit?.html_url;
  return {document,commitUrl:typeof commitUrl === 'string' && commitUrl.startsWith(REPOSITORY_URL+'/commit/') ? commitUrl : null};
}
