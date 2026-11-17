'use client';

import {useCallback, useEffect, useReducer} from 'react';
import {initialOrbitalNavigation, orbitalDestinationFromHash, orbitalHref, orbitalNavigationReducer, type OrbitalDestination} from '../lib/orbital-navigation';

export function useOrbitalNavigation() {
  const [state, dispatch] = useReducer(orbitalNavigationReducer, initialOrbitalNavigation);
  useEffect(() => {
    const sync = () => dispatch({type: 'select', destination: orbitalDestinationFromHash(window.location.hash)});
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    if (state.phase === 'exploration' || state.phase === 'destination') return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => dispatch({type: 'settle'});
    const timer = setTimeout(finish, reduced.matches || document.hidden ? 0 : state.phase === 'returning' ? 850 : state.phase === 'switching' ? 350 : 1100);
    const finishWhenPaused = () => {if (reduced.matches || document.hidden) finish();};
    reduced.addEventListener('change', finishWhenPaused);
    document.addEventListener('visibilitychange', finishWhenPaused);
    return () => {
      clearTimeout(timer);
      reduced.removeEventListener('change', finishWhenPaused);
      document.removeEventListener('visibilitychange', finishWhenPaused);
    };
  }, [state]);
  const select = useCallback((destination: OrbitalDestination | null) => {
    dispatch({type: 'select', destination});
    const hash = destination ? orbitalHref(destination) : '#inicio';
    if (window.location.hash !== hash) window.location.hash = hash;
  }, []);
  return {...state, select};
}
