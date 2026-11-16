import React, {useEffect, useRef, useState} from 'react';
import {fetchSharedMap, publishSharedMap, REPOSITORY_URL} from './github-sync.js';
import {canPublish, mapEquals} from './map-state.js';

export default function GitHubSyncDialog({dirty, baseline, draft, toDraft, applyRemote, onSaved, onClose}) {
  const dialog = useRef(null);
  const key = useRef(null);
  const active = useRef(true);
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('');
  const [preview,setPreview] = useState(null);
  const [confirmLoad,setConfirmLoad] = useState(false);
  const [commit,setCommit] = useState(null);

  useEffect(()=>{
    active.current = true;
    dialog.current.showModal();
    return ()=>{active.current = false;};
  },[]);

  async function run(callback) {
    if (busy) return;
    setBusy(true);
    setStatus('');
    setCommit(null);
    setConfirmLoad(false);
    try { await callback(); }
    catch (error) { if (active.current) setStatus(error.message); }
    finally { if (active.current) setBusy(false); }
  }

  function check() {
    return run(async ()=>{
      const {document} = await fetchSharedMap();
      const remote = {revision:document.revision,draft:toDraft(document.draft)};
      if (!active.current) return;
      setPreview(remote);
      setStatus(mapEquals(draft,remote.draft)
        ? 'O mapa aberto coincide com a versão do GitHub.'
        : canPublish(baseline,remote)
          ? 'A versão no GitHub é a base do seu rascunho.'
          : 'Há uma versão diferente no GitHub. Seu rascunho continua disponível.');
    });
  }

  function publish() {
    const token = key.current.value.trim();
    if (!token) {
      key.current.focus();
      setStatus('Informe o token para salvar no GitHub.');
      return;
    }
    key.current.value = '';
    return run(async ()=>{
      const {sha,document} = await fetchSharedMap({token});
      if (!active.current) return;
      const remote = {revision:document.revision,draft:toDraft(document.draft)};
      setPreview(remote);
      if (mapEquals(draft,remote.draft)) {
        onSaved(remote);
        setStatus('Essa versão do mapa já está no GitHub.');
        return;
      }
      if (!canPublish(baseline,remote)) {
        setStatus('O GitHub recebeu outra edição. Exporte seu rascunho antes de carregar a versão remota e conciliar as mudanças.');
        return;
      }
      const saved = await publishSharedMap({token,sha,draft});
      if (!active.current) return;
      const next = {revision:saved.document.revision,draft};
      onSaved(next);
      setPreview(next);
      setCommit(saved.commitUrl);
      setStatus('Edição registrada no GitHub.');
    });
  }

  function loadVersion() {
    if (dirty && !confirmLoad && !mapEquals(draft,preview.draft)) {
      setConfirmLoad(true);
      setStatus('Carregar a versão remota vai substituir seu rascunho local. Use Exportar mapa para guardar uma cópia antes.');
      return;
    }
    applyRemote(preview);
    setConfirmLoad(false);
    setStatus('Versão do GitHub carregada no editor.');
  }

  return <dialog ref={dialog} className="sync-dialog" aria-labelledby="sync-title"
    onCancel={(event)=>{event.preventDefault();if(!busy)onClose();}}>
    <div className="sync-header">
      <h2 id="sync-title">Sincronizar com GitHub</h2>
      <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Fechar</button>
    </div>
    <p>{dirty ? 'Há alterações locais neste mapa.' : 'O mapa aberto coincide com sua versão de referência.'}</p>
    <div className="sync-actions">
      <button type="button" className="btn secondary" onClick={check} disabled={busy}>Verificar versão do GitHub</button>
      {preview&&<button type="button" className="btn secondary" onClick={loadVersion} disabled={busy}>
        {confirmLoad ? 'Confirmar substituição do rascunho' : 'Carregar versão do GitHub'}
      </button>}
    </div>
    <label htmlFor="sync-token">Token de escrita do GitHub</label>
    <p className="sync-help">Use um token fine-grained para <strong>antropologo-rpg-map</strong> com <strong>Contents: Read and write</strong>. O token é usado nesta operação. O botão Salvar cria um commit público com as edições do mapa.</p>
    <input ref={key} id="sync-token" type="password" autoComplete="off" spellCheck={false} />
    <div className="sync-actions">
      <button type="button" className="btn primary" onClick={publish} disabled={busy}>Salvar no GitHub</button>
      <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">Abrir repositório ↗</a>
    </div>
    <p className="sync-status" role="status">{busy?'Consultando o GitHub…':status}</p>
    {commit&&<a href={commit} target="_blank" rel="noreferrer">Ver commit desta edição ↗</a>}
  </dialog>;
}
