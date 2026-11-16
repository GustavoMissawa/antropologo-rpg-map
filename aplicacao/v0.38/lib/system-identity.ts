import {validRulebookLogo,type Rulebook} from './model.ts';
import {validBlockColor} from './sheet-visual.ts';
export const MAX_SYSTEM_GIF_BYTES=1024*1024;
export type SystemThemeDefinition={key:string;name:string;builtInLogo?:'ab10'};
export type SystemTheme={logo?:string;sidebar?:{src:string;poster:string};accent?:string};
// This is an authorization catalog owned by the Site, never by imported JSON.
export const SYSTEM_THEME_DEFINITIONS:Readonly<Record<string,SystemThemeDefinition>>=Object.freeze({
 absolute10:Object.freeze({key:'absolute10',name:'AB10 — Absolute 10',builtInLogo:'ab10'}),
});
export function systemThemeDefinition(book:Pick<Rulebook,'themeKey'>|undefined|null):SystemThemeDefinition|null{
 return book?.themeKey&&Object.hasOwn(SYSTEM_THEME_DEFINITIONS,book.themeKey)?SYSTEM_THEME_DEFINITIONS[book.themeKey]:null;
}
export function validSystemGif(value:unknown):value is string{
 if(typeof value!=='string'||value.length>Math.ceil(MAX_SYSTEM_GIF_BYTES/3)*4+40)return false;
 const match=value.match(/^data:image\/gif;base64,([A-Za-z0-9+/]+={0,2})$/);if(!match||match[1].length%4)return false;
 const bytes=match[1].length*3/4-(match[1].endsWith('==')?2:match[1].endsWith('=')?1:0);if(bytes>MAX_SYSTEM_GIF_BYTES)return false;
 try{const head=atob(match[1].slice(0,32)),width=head.charCodeAt(6)+head.charCodeAt(7)*256,height=head.charCodeAt(8)+head.charCodeAt(9)*256;return /^GIF8[79]a/.test(head)&&width>0&&height>0&&width<=1024&&height<=1024;}catch{return false;}
}
export function parseSystemTheme(input:unknown):SystemTheme{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Tema visual inválido.');
 const t=input as SystemTheme;
 if(t.logo!==undefined&&!validRulebookLogo(t.logo))throw new Error('Logo inválida. Use PNG, JPG ou WebP otimizado de até 512 KB.');
 if(t.accent!==undefined&&!validBlockColor(t.accent))throw new Error('Cor de destaque inválida.');
 if(t.sidebar!==undefined&&(!t.sidebar||!validRulebookLogo(t.sidebar.poster)||!validRulebookLogo(t.sidebar.src)&&!validSystemGif(t.sidebar.src)))throw new Error('Fundo inválido. Use imagem otimizada ou GIF de até 1 MB e 1024 × 1024 pixels.');
 return {...(t.logo?{logo:t.logo}:{}),...(t.accent?{accent:t.accent.toLowerCase()}:{}),...(t.sidebar?{sidebar:{src:t.sidebar.src,poster:t.sidebar.poster}}:{})};
}
export function systemSidebarSource(theme:SystemTheme,reduced:boolean):string|undefined{return theme.sidebar?(reduced?theme.sidebar.poster:theme.sidebar.src):undefined;}
