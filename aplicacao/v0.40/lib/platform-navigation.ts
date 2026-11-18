import type {InterfaceStyle} from './appearance.ts';
import type {PlatformPage} from './platform-context.ts';
import {orbitalDestinationFromHash, orbitalHref, type OrbitalDestination} from './orbital-navigation.ts';

export type SheetRoute = {kind: 'character' | 'template'; id: string};
export type PlatformRoute =
  | {page: 'home'; destination?: OrbitalDestination}
  | {page: 'rules'; bookId?: string}
  | {page: 'sheet'; editor?: SheetRoute}
  | {page: 'pdfs' | 'agenda'};

const slugs: Record<PlatformPage, string> = {
  home: 'inicio', rules: 'regras', sheet: 'ficha', pdfs: 'pdfs', agenda: 'agenda',
};
const destinationPages = {systems: 'rules', sheets: 'sheet', pdfs: 'pdfs', agenda: 'agenda'} as const;
const pageDestinations = {rules: 'systems', sheet: 'sheets', pdfs: 'pdfs', agenda: 'agenda'} as const;

export function platformHref(route: PlatformRoute): string {
  if (route.page === 'home' && route.destination) return orbitalHref(route.destination);
  if (route.page === 'rules' && route.bookId !== undefined) return '#regras/' + encodeId(route.bookId);
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
  const [slug, detail, item, ...rest] = hash.slice(1).split('/');
  if (hash[0] !== '#' || rest.length) return null;
  const page = (Object.keys(slugs) as PlatformPage[]).find(key => slugs[key] === slug);
  if (!page) return null;
  if (page === 'rules' && detail && !item) {
    const bookId = readId(detail);
    return bookId !== undefined ? {page, bookId} : {page};
  }
  if (page === 'sheet' && (detail === 'modelo' || detail === 'personagem') && item) {
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
  return style === 'orbital' && page !== 'home' ? {page: 'home', destination: pageDestinations[page]} : {page};
}
