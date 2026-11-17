export const ORBITAL_DESTINATIONS = ['systems', 'sheets', 'pdfs', 'agenda'] as const;
export type OrbitalDestination = typeof ORBITAL_DESTINATIONS[number];
const slugs = {systems: 'sistemas', sheets: 'fichas', pdfs: 'pdfs', agenda: 'agenda'};
export const orbitalHref = (id: OrbitalDestination) => `#inicio/${slugs[id]}`;
export function orbitalDestinationFromHash(hash: string): OrbitalDestination | null {
  return ORBITAL_DESTINATIONS.find(id => orbitalHref(id) === hash) ?? null;
}
export type OrbitalNavigation = {
  phase: 'exploration' | 'entering' | 'destination' | 'switching' | 'returning';
  destination: OrbitalDestination | null;
};
export type OrbitalNavigationEvent = {type: 'select'; destination: OrbitalDestination | null} | {type: 'settle'};
export const initialOrbitalNavigation: OrbitalNavigation = {phase: 'exploration', destination: null};
/** State changes never depend on animationend, which may not fire after interruption. */
export function orbitalNavigationReducer(state: OrbitalNavigation, event: OrbitalNavigationEvent): OrbitalNavigation {
  if (event.type === 'settle') return state.phase === 'returning' ? initialOrbitalNavigation :
    state.destination ? {...state, phase: 'destination'} : state;
  if (!event.destination) return state.phase === 'returning' ? state : state.destination ? {...state, phase: 'returning'} : state;
  if (event.destination === state.destination && state.phase !== 'returning') return state;
  return {destination: event.destination, phase: state.destination ? 'switching' : 'entering'};
}
