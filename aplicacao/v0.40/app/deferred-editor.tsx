'use client';

import {useEffect, useState, type ComponentType} from 'react';

/** Share each successful module load while keeping failures inside the editor area. */
export function deferEditor<Props extends object>(load: () => Promise<ComponentType<Props>>, label: string) {
  let editor: ComponentType<Props> | undefined;
  let pending: Promise<ComponentType<Props>> | undefined;

  return function DeferredEditor(props: Props) {
    const [Editor, setEditor] = useState(() => editor);
    const [attempt, setAttempt] = useState(0);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
      if (Editor) return;
      let mounted = true;
      pending ??= load().then(component => {
        editor = component;
        return component;
      }).finally(() => { pending = undefined; });
      void pending.then(
        component => { if (mounted) setEditor(() => component); },
        () => { if (mounted) setFailed(true); },
      );
      return () => { mounted = false; };
    }, [Editor, attempt]);

    if (Editor) return <Editor {...props} />;
    if (failed) return <div className="error-banner" role="alert">
      Não foi possível carregar {label}.
      <button type="button" onClick={() => { setFailed(false); setAttempt(current => current + 1); }}>Tentar novamente</button>
    </div>;
    return <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" /> Carregando {label}…
    </div>;
  };
}
