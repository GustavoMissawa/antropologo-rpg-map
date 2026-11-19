'use client';

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {requestJson} from '../lib/browser-request';
import type {DemoUser} from '../lib/demo-auth';
import {
  FIRST_STEPS_ATTENTION_MS, FIRST_STEPS_IDLE_MS, pendingFirstStepsCue,
  type FirstStepsAction, type FirstStepsCue, type FirstStepsProgress, type FirstStepsZone,
} from '../lib/orbital-first-steps';

const endpoint = '/api/auth/first-steps';
const entryKey = 'antropologo-orbital-entry-seen';
type ProgressResponse = {progress: FirstStepsProgress | null; changed?: boolean};
type AccountKey = Pick<DemoUser, 'handle' | 'expiresAt'>;
type AccountQueue = AccountKey & {pending: Promise<unknown>};

function useAccountProgress(user: DemoUser | null) {
  const handle = user?.handle;
  const expiresAt = user?.expiresAt;
  const queue = useRef<AccountQueue | null>(null);
  const [snapshot, setSnapshot] = useState<(AccountKey & {progress: FirstStepsProgress | null}) | null>(null);

  useLayoutEffect(() => {
    if (!handle || expiresAt === undefined) return;
    const account = {handle, expiresAt, pending: Promise.resolve()};
    queue.current = account;
    const read = requestJson<ProgressResponse>(endpoint, {timeoutMs: 5000}).then(({progress}) => {
      if (queue.current === account) setSnapshot({handle, expiresAt, progress});
    }).catch(() => {});
    queue.current.pending = read;
    return () => {queue.current = null;};
  }, [handle, expiresAt]);

  const record = useCallback((action: FirstStepsAction, onResult?: (result: ProgressResponse) => void) => {
    const account = queue.current;
    if (!account) return Promise.resolve(null);
    const task = account.pending.then(async () => {
      if (queue.current !== account) return null;
      const result = await requestJson<ProgressResponse>(endpoint, {
        method: 'POST', value: {handle: account.handle, expiresAt: account.expiresAt, action}, timeoutMs: 5000,
      });
      if (queue.current !== account) return null;
      onResult?.(result);
      setSnapshot({handle: account.handle, expiresAt: account.expiresAt, progress: result.progress});
      return result;
    }).catch(() => null);
    account.pending = task;
    return task;
  }, []);

  const progress = snapshot && snapshot.handle === handle && snapshot.expiresAt === expiresAt ? snapshot.progress : null;
  return {progress, record};
}

function foreground() {
  return !document.hidden && document.hasFocus();
}

function useIdleCue(
  scope: string | null,
  candidate: FirstStepsCue | null,
  claim: (candidate: FirstStepsCue, present: () => void) => void,
  dismissEntry: () => void,
) {
  const [active, setActive] = useState<{scope: string; cue: FirstStepsCue} | null>(null);
  const cue = active?.scope === scope ? active.cue : null;
  const listening = !!(candidate || cue);
  useLayoutEffect(() => {setActive(null);}, [scope]);

  useEffect(() => {
    if (cue !== 'entry' && cue !== 'systems') return;
    const restore = setTimeout(() => setActive(current => current === active ? null : current), FIRST_STEPS_ATTENTION_MS);
    return () => clearTimeout(restore);
  }, [active, cue]);

  useEffect(() => {
    if (!scope || !listening) return;
    const currentScope = scope;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let epoch = 0;
    let pointer: {x: number; y: number} | null = null;
    function stop() {
      clearTimeout(timeout);
      epoch++;
    }
    function arm() {
      stop();
      if (!candidate || !foreground() || document.querySelector('dialog[open]')) return;
      const attempt = epoch;
      timeout = setTimeout(() => {
        if (!foreground() || document.querySelector('dialog[open]')) return;
        claim(candidate, () => {
          if (epoch === attempt && foreground() && !document.querySelector('dialog[open]')) {
            setActive({scope: currentScope, cue: candidate});
          }
        });
      }, FIRST_STEPS_IDLE_MS[candidate]);
    }
    function activity() {
      setActive(null);
      if (candidate === 'entry') {
        stop();
        dismissEntry();
      } else {
        arm();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) activity();
    }
    function onMove(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('.orbital-d20-control')) {
        pointer = null;
        return;
      }
      if (!pointer || Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >= 12) {
        if (pointer) activity();
        pointer = {x: event.clientX, y: event.clientY};
      }
    }
    function onHover(event: PointerEvent) {
      if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
      const node = event.target.closest('.orbital-node');
      if (node && !(event.relatedTarget instanceof Node && node.contains(event.relatedTarget))) activity();
    }
    function onVisibility() {
      pointer = null;
      if (!foreground()) setActive(null);
      arm();
    }
    arm();
    document.addEventListener('pointerdown', activity, true);
    document.addEventListener('click', activity, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('input', activity, true);
    document.addEventListener('wheel', activity, {capture: true, passive: true});
    document.addEventListener('pointermove', onMove, {passive: true});
    document.addEventListener('pointerover', onHover, {passive: true});
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      stop();
      document.removeEventListener('pointerdown', activity, true);
      document.removeEventListener('click', activity, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('input', activity, true);
      document.removeEventListener('wheel', activity, true);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onHover);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [scope, candidate, claim, dismissEntry, listening]);

  return cue;
}

export function useOrbitalFirstSteps({user, ready, zone, blocked, systemsSelected, registrationSettings}: {
  user: DemoUser | null;
  ready: boolean;
  zone: FirstStepsZone | null;
  blocked: boolean;
  systemsSelected: boolean;
  registrationSettings: boolean;
}) {
  const {progress, record} = useAccountProgress(user);
  const [entrySeen, setEntrySeen] = useState<boolean | null>(null);
  const explored = useRef({systems: false, disk: false});
  const handle = user?.handle;
  const expiresAt = user?.expiresAt;

  useEffect(() => {
    try {setEntrySeen(localStorage.getItem(entryKey) === '1');}
    catch {setEntrySeen(false);}
    const sync = (event: StorageEvent) => {if (event.key === entryKey && event.newValue === '1') setEntrySeen(true);};
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const dismissEntry = useCallback(() => {
    setEntrySeen(true);
    try {localStorage.setItem(entryKey, '1');} catch { /* The cue remains dismissed in this tab. */ }
  }, []);

  useLayoutEffect(() => {
    if (!handle) return;
    if (registrationSettings) {
      void record('settings-opened');
      if (explored.current.systems) void record('systems-visited');
      if (explored.current.disk) void record('disk-used');
    }
    explored.current = {systems: false, disk: false};
  }, [handle, expiresAt, registrationSettings, record]);

  useEffect(() => {
    if (!ready || !systemsSelected) return;
    if (handle) void record('systems-visited');
    else explored.current.systems = true;
  }, [ready, systemsSelected, handle, expiresAt, record]);

  const diskUsed = useCallback(() => {
    if (handle) void record('disk-used');
    else if (ready) explored.current.disk = true;
  }, [handle, ready, record]);

  const claim = useCallback((candidate: FirstStepsCue, present: () => void) => {
    if (candidate === 'entry') {
      try {if (localStorage.getItem(entryKey) === '1') return;} catch { /* No cross-tab storage. */ }
      present();
      dismissEntry();
      return;
    }
    void record(candidate === 'systems' ? 'systems-presented' : 'disk-presented', result => {
      if (result.changed) present();
    });
  }, [dismissEntry, record]);

  const scope = ready && !blocked && zone ? `${handle ?? 'guest'}:${expiresAt ?? ''}:${zone}` : null;
  const candidate = scope && zone
    ? handle ? pendingFirstStepsCue(progress, zone) : zone === 'home' && entrySeen === false ? 'entry' : null
    : null;
  const cue = useIdleCue(scope, candidate, claim, dismissEntry);
  return {cue, diskUsed, settingsClosed: () => {void record('settings-closed');}};
}
