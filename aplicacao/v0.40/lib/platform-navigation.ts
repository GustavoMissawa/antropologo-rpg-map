import type {InterfaceStyle} from './appearance.ts';
import type {PlatformPage} from './platform-context.ts';
import {orbitalDestinationFromHash, orbitalHref, type OrbitalDestination} from './orbital-navigation.ts';

export type SheetRoute = {kind: 'character' | 'template'; id: string};
export type RulesRoute = {page: 'rules'; bookId?: string; topicId?: string; anchorId?: string};
export type PlatformRoute =
  | {page: 'home'; destination?: OrbitalDestination}
  | RulesRoute
  | {page: 'sheet'; editor?: SheetRoute}
  | {page: 'pdfs' | 'agenda'};
export type PlatformJourney = {from: PlatformRoute; to: PlatformRoute};

const slugs: Record<PlatformPage, string> = {
  home: 'inicio', rules: 'regras', sheet: 'ficha', pdfs: 'pdfs', agenda: 'agenda',
};
const destinationPages = {systems: 'rules', sheets: 'sheet', pdfs: 'pdfs', agenda: 'agenda'} as const;

export function platformHref(route: PlatformRoute): string {
  if (route.page === 'home' && route.destination) return orbitalHref(route.destination);
  if (route.page === 'rules' && route.bookId !== undefined) {
    const book = '#regras/' + encodeId(route.bookId);
    if (route.topicId === undefined) return book;
    const topic = book + '/topico/' + encodeId(route.topicId);
    return route.anchorId === undefined ? topic : topic + '/secao/' + encodeId(route.anchorId);
  }
  if (route.page === 'sheet' && route.editor) {
    const kind = route.editor.kind === 'template' ? 'modelo' : 'personagem';
    return '#ficha/' + kind + '/' + encodeId(route.editor.id);
  }
  return '#' + slugs[route.page];
}

function encodeId(id: string): string {
  // Older imported sheets can have an empty ID or UTF-16 that cannot be written as a URL.
  if (id && !id.startsWith('~')) {
    try { return encodeURIComponent(id); } catch {}
  }
  return '~' + encodeURIComponent(JSON.stringify(id));
}

function readId(value: string): string | undefined {
  try {
    const id: unknown = value.startsWith('~') ? JSON.parse(decodeURIComponent(value.slice(1))) : decodeURIComponent(value);
    return typeof id === 'string' && id.length <= 100 ? id : undefined;
  } catch {
    return undefined;
  }
}

export function parsePlatformHash(hash: string): PlatformRoute | null {
  const destination = orbitalDestinationFromHash(hash);
  if (destination) return {page: 'home', destination};
  const [slug, detail, item, topic, sectionMarker, section, ...rest] = hash.slice(1).split('/');
  if (hash[0] !== '#' || rest.length) return null;
  const page = (Object.keys(slugs) as PlatformPage[]).find(key => slugs[key] === slug);
  if (!page) return null;
  if (page === 'rules' && detail) {
    const bookId = readId(detail);
    if (bookId === undefined) return {page};
    if (item === undefined) return {page, bookId};
    if (item !== 'topico' || !topic) return null;
    const topicId = readId(topic);
    if (topicId === undefined) return null;
    if (sectionMarker === undefined) return {page, bookId, topicId};
    if (sectionMarker !== 'secao' || !section) return null;
    const anchorId = readId(section);
    return anchorId === undefined ? null : {page, bookId, topicId, anchorId};
  }
  if (page === 'sheet' && (detail === 'modelo' || detail === 'personagem') && item && topic === undefined) {
    const id = readId(item);
    return id !== undefined ? {page, editor: {kind: detail === 'modelo' ? 'template' : 'character', id}} : {page};
  }
  return detail === undefined ? {page} : null;
}

export function routeArea(route: PlatformRoute): PlatformPage {
  return route.page === 'home' && route.destination ? destinationPages[route.destination] : route.page;
}

export function routeForStyle(route: PlatformRoute, style: InterfaceStyle): PlatformRoute {
  return style === 'classic' && route.page === 'home' && route.destination ? {page: routeArea(route)} : route;
}

export function sectionRoute(page: PlatformPage, style: InterfaceStyle): PlatformRoute {
  return style === 'orbital' && page === 'rules' ? {page: 'home', destination: 'systems'} : {page};
}

export function orbitalEntryRoute(destination: OrbitalDestination | null): PlatformRoute {
  return destination === 'agenda' ? {page: 'agenda'} : {page: 'home', destination: destination ?? undefined};
}

// Positions belong only to entries written by this router in this document.
// A new document gets a different token even when restored in the same tab.
export type PlatformHistoryEntry = {document: string; index: number};
export function platformHistoryEntry(state: unknown, document: string): PlatformHistoryEntry | undefined {
  if (!state || typeof state !== 'object' || !('antropologoRoute' in state)) return;
  const entry = state.antropologoRoute as Partial<PlatformHistoryEntry> | undefined;
  if (entry?.document === document && Number.isSafeInteger(entry.index)) return entry as PlatformHistoryEntry;
}
