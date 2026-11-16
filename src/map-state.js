export const MAP_FORMAT = 'antropologo-reactflow';
export const INITIAL_REVISION = 'v038-original';
export const STORAGE_KEY = 'antropologo-rpg-map-v1';
export const MAX_MAP_BYTES = 900_000;

const edgeColors = {
  recovered: '#7183aa',
  manual: '#39baa4',
};

export function styleEdge(edge, recovered) {
  const color = recovered ? edgeColors.recovered : edgeColors.manual;
  return {
    ...edge,
    type: 'smoothstep',
    animated: false,
    markerEnd: {type:'arrowclosed', color, width:15, height:15},
    style: {stroke:color, strokeWidth:recovered ? 1.8 : 2},
    labelBgPadding: [9,5],
    labelBgBorderRadius: 6,
    labelBgStyle: {fill:'#172335', fillOpacity:0.94},
    labelStyle: {fill:'#cbd4e4',fontWeight:500,fontSize:10},
  };
}

export function snapshotMap(nodes, edges) {
  return {
    version: 1,
    nodes: nodes.map(({id, position, data}) => ({
      id,
      position: {x:position.x, y:position.y},
      data: {title:data.title, description:data.description ?? '', notes:data.notes ?? ''},
    })),
    edges: edges.map(({id, source, target, sourceHandle, targetHandle, label}) => ({
      id, source, target,
      ...(sourceHandle != null && {sourceHandle}),
      ...(targetHandle != null && {targetHandle}),
      label: label ?? '',
    })),
  };
}

export function isSnapshot(value) {
  return value?.version === 1 && Array.isArray(value.nodes) && Array.isArray(value.edges);
}

function readText(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value !== 'string') throw Error('O mapa contém um campo de texto inválido.');
  return value;
}

export function restoreMap(snapshot, original) {
  if (snapshot === null) return original;
  if (!isSnapshot(snapshot)) throw Error('Formato de mapa incompatível.');
  const knownNodes = new Map(original.nodes.map(node => [node.id, node]));
  const fromDisk = new Map();
  for (const item of snapshot.nodes) {
    if (!item || typeof item.id !== 'string') throw Error('O mapa contém um cartão inválido.');
    if (!knownNodes.has(item.id)) continue;
    if (fromDisk.has(item.id)) throw Error('O mapa contém cartões duplicados.');
    if (item.position && (!Number.isFinite(item.position.x) || !Number.isFinite(item.position.y))) {
      throw Error('O mapa contém uma posição inválida.');
    }
    fromDisk.set(item.id,item);
  }
  if (!fromDisk.size) throw Error('Nenhum cartão compatível.');
  const nodes = original.nodes.map(node => {
    const incoming = fromDisk.get(node.id);
    if (!incoming) return node;
    return {
      ...node,
      position: incoming.position ?? node.position,
      data: {
        ...node.data,
        title: readText(incoming.data?.title,node.data.title),
        description: readText(incoming.data?.description,node.data.description),
        notes: readText(incoming.data?.notes),
      },
    };
  });
  const recovered = new Map(original.edges.map(edge => [edge.id,edge]));
  const seen = new Set();
  const edges = [];
  for (const item of snapshot.edges) {
    if (typeof item?.id !== 'string' || typeof item.source !== 'string' || typeof item.target !== 'string') {
      throw Error('O mapa contém uma conexão inválida.');
    }
    if (!knownNodes.has(item.source) || !knownNodes.has(item.target)) continue;
    if (seen.has(item.id)) throw Error('O mapa contém conexões duplicadas.');
    seen.add(item.id);
    const initial = recovered.get(item.id);
    const edge = {
      id:item.id,source:item.source,target:item.target,
      label:readText(item.label,initial?.label ?? 'Ligação manual'),
      data:{section:knownNodes.get(item.source).data.section,figmaDerived:!!initial?.data.figmaDerived},
    };
    if (typeof item.sourceHandle === 'string') edge.sourceHandle = item.sourceHandle;
    if (typeof item.targetHandle === 'string') edge.targetHandle = item.targetHandle;
    edges.push(styleEdge(edge,!!initial));
  }
  return {nodes, edges};
}

export function mapEquals(left,right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function readSharedDocument(doc) {
  if (doc?.format !== MAP_FORMAT || doc.version !== 1 ||
      typeof doc.revision !== 'string' || !doc.revision ||
      (doc.draft !== null && !isSnapshot(doc.draft))) {
    throw Error('O arquivo de edições do GitHub tem formato incompatível.');
  }
  return doc;
}

export function resolveInitialMap(original, published, saved) {
  const originalDraft = snapshotMap(original.nodes,original.edges);
  const remoteMap = restoreMap(published.draft,original);
  const remoteDraft = snapshotMap(remoteMap.nodes,remoteMap.edges);
  const current = {map:remoteMap,baseline:{revision:published.revision,draft:remoteDraft}};
  if (!isSnapshot(saved)) return current;
  let localMap;
  try {
    localMap = restoreMap(saved,original);
  } catch {
    return {...current, invalidLocal:true};
  }
  const localDraft = snapshotMap(localMap.nodes,localMap.edges);
  const storedBaseline = saved.sync;
  let localBaseline = originalDraft;
  if (isSnapshot(storedBaseline?.draft)) {
    try {
      const baselineMap = restoreMap(storedBaseline.draft,original);
      localBaseline = snapshotMap(baselineMap.nodes,baselineMap.edges);
    } catch {
      // Keep the original baseline for a recoverable local draft.
    }
  }
  if (mapEquals(localDraft,localBaseline) || mapEquals(localDraft,remoteDraft)) return current;
  const localRevision = typeof storedBaseline?.revision === 'string' ? storedBaseline.revision : INITIAL_REVISION;
  return {map:localMap, baseline:{revision:localRevision,draft:localBaseline}};
}

export function canPublish(baseline, remote) {
  return baseline.revision === remote.revision && mapEquals(baseline.draft,remote.draft);
}
