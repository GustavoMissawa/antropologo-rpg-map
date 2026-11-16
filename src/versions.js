import {STORAGE_KEY, readSharedDocument} from './map-state.js';

export const ALPHA_VERSION = '0.38';
export const DEFAULT_VERSION = '0.40';

export const VERSIONS = {
  [ALPHA_VERSION]: {
    id: ALPHA_VERSION,
    label: 'v0.38 — Alpha',
    dataPath: '/data',
    storageKey: STORAGE_KEY,
    sourcePath: 'tree/v0.38-alpha/aplicacao/v0.38',
  },
  [DEFAULT_VERSION]: {
    id: DEFAULT_VERSION,
    label: 'v0.40 — Desenvolvimento',
    dataPath: '/data/v0.40',
    storageKey: `${STORAGE_KEY}:v0.40`,
    sourcePath: 'tree/main/aplicacao/v0.40',
  },
};

export function editionFile(versionId) {
  if (!Object.hasOwn(VERSIONS,versionId)) throw Error('Versão do projeto desconhecida.');
  return `public${VERSIONS[versionId].dataPath}/edicoes.json`;
}

export function checkMapVersion(document,versionId) {
  if (document.projectVersion !== undefined && document.projectVersion !== versionId) {
    throw Error(`Este mapa pertence à v${document.projectVersion}. Abra a versão correspondente.`);
  }
}

export function readVersionedEdition(document,versionId) {
  readSharedDocument(document);
  if (versionId !== ALPHA_VERSION && document.projectVersion === undefined) {
    throw Error('O arquivo de edições não identifica a versão do projeto.');
  }
  checkMapVersion(document,versionId);
  return document;
}
