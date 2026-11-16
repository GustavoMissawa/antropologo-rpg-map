import {AB10_RULEBOOK_ID,MAX_RULEBOOKS,makeAB10Rulebook,serializeRulebook,type Rulebook} from './model.ts';

export const PLATFORM_PAGES=['home','rules','sheet','pdfs','agenda'] as const;
export type PlatformPage=typeof PLATFORM_PAGES[number];
export type PlatformWorkspace={books:Rulebook[];contextId:string|null;page:PlatformPage};
export function resolveSystemContext(books:Rulebook[],id:string|null):Rulebook|undefined{return id?books.find(b=>b.id===id):undefined;}
/** Validate cached data without remapping IDs: internal links and sheet bindings stay intact. */
export function restoreSessionBook(value:unknown):Rulebook|null{
 try{if(!value||typeof value!=='object'||(value as Rulebook).id===AB10_RULEBOOK_ID)return null;return JSON.parse(serializeRulebook(value as Rulebook));}catch{return null;}
}
export function restoreWorkspace(value:unknown):PlatformWorkspace{
 const raw=value as {version?:unknown;books?:unknown;contextId?:unknown;page?:unknown}|null;
 const books=[makeAB10Rulebook()];
 if(raw?.version!==1||!Array.isArray(raw.books)||raw.books.length>MAX_RULEBOOKS)return {books,contextId:null,page:'home'};
 for(const input of raw.books){const book=restoreSessionBook(input);if(book&&!books.some(b=>b.id===book.id))books.push(book);}
 const contextId=typeof raw.contextId==='string'&&books.some(b=>b.id===raw.contextId)?raw.contextId:null;
 const page=PLATFORM_PAGES.includes(raw.page as PlatformPage)?raw.page as PlatformPage:'home';
 return {books,contextId,page:raw.contextId&&!contextId?'home':page};
}
