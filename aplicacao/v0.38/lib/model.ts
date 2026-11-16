import {parseSystemVisuals,type SystemVisuals} from './system-visuals.ts';
import {CONTENT_QUOTAS,contentQuotaLabel} from './content-limits.ts';
import { availableDice,parseDiceSet,parseSheetSystem,parseKeepOverride,type KeepOverride,type DiceSet,type SheetSystem } from './dice-set.ts';
import { validRuleDocument,remapRuleDocument,ruleDocumentText,type RuleDocument } from './rule-document.ts';
import { validBlockColor,validFieldColumns,validSheetImage,type BlockImage } from './sheet-visual.ts';
import { parseBlockConnections,type BlockConnection } from './sheet-connections.ts';
export type FieldPart = 'value'|'modifier'|'maximum';
export type Dependency = { sourceId:string; part:FieldPart; offset:number };
export type Field = { id: string; label: string; details?:string; columnSpan?:number; row?:number; rowSize?:number; type: 'number'|'text'|'longtext'|'checkbox'|'calculated'|'composite'|'comparison'; value: string|number|boolean; dependency?:Dependency; roll?:FieldRoll; composite?:{mode:'manual'|'ability';modifier:number}; comparison?:{maximum:number;dependency?:Dependency} };
export type RollVariable = { name:string; fieldId:string; part:FieldPart };
export type FieldRoll = { formula:string; variables:RollVariable[]; keep?:KeepOverride; systemActionId?:string };
export type RollTemplate = FieldRoll & { id:string; name:string };
export type BlockLayout = { x:number; y:number; width:number; height?:number };
export type Block = { id: string; title: string; description: string; kind: string; fields: Field[]; tabId:string; layout:BlockLayout; color?:string; columns?:number; image?:BlockImage };
export type SheetTab = { id:string; title:string };
export type PositionMode='free'|'grid';
export type Sheet = { format: 'ab10-character'; version: 13; portrait?:string; connections?:BlockConnection[]; system?:SheetSystem; id: string; name: string; player: string; description: string; updatedAt: string; blocks: Block[]; tabs:SheetTab[]; activeTabId:string; rolls:RollTemplate[]; positionMode:PositionMode };
export const MAP_LIMIT=16000;
export const GRID_SIZE=24,MAX_FIELD_DETAILS=10000;
export const layoutForIndex=(index:number):BlockLayout=>({x:48+(index%4)*408,y:48+Math.floor(index/4)*560,width:368});
export function limitLayout(layout:BlockLayout):BlockLayout{return {x:Math.round(Math.min(MAP_LIMIT,Math.max(0,layout.x))),y:Math.round(Math.min(MAP_LIMIT,Math.max(0,layout.y))),width:Math.round(Math.min(960,Math.max(300,layout.width))),...(layout.height!==undefined?{height:Math.round(Math.min(1200,Math.max(120,layout.height)))}:{})};}
export function positionLayout(layout:BlockLayout,mode:PositionMode):BlockLayout{
 const limited=limitLayout(layout);if(mode==='free')return limited;
 const snap=(value:number,min:number,max:number)=>Math.min(Math.floor(max/GRID_SIZE)*GRID_SIZE,Math.max(Math.ceil(min/GRID_SIZE)*GRID_SIZE,Math.round(value/GRID_SIZE)*GRID_SIZE));
 return {x:snap(limited.x,0,MAP_LIMIT),y:snap(limited.y,0,MAP_LIMIT),width:snap(limited.width,300,960),...(limited.height!==undefined?{height:snap(limited.height,120,1200)}:{})};
}
export function setPositionMode(sheet:Sheet,mode:PositionMode):Sheet{return {...sheet,positionMode:mode,blocks:mode==='grid'?sheet.blocks.map(b=>({...b,layout:positionLayout(b.layout,mode)})):sheet.blocks};}
export function mapBounds(blocks:{id:string;layout:BlockLayout}[],heights:Record<string,number>={}){if(!blocks.length)return {left:0,top:0,right:1000,bottom:650};return {left:Math.min(...blocks.map(b=>b.layout.x)),top:Math.min(...blocks.map(b=>b.layout.y)),right:Math.max(...blocks.map(b=>b.layout.x+b.layout.width)),bottom:Math.max(...blocks.map(b=>b.layout.y+(heights[b.id]||260)))};}
export function fitMapView(bounds:ReturnType<typeof mapBounds>,width:number,height:number){const zoom=Math.max(.1,Math.min(1,(width-64)/Math.max(1,bounds.right-bounds.left),(height-64)/Math.max(1,bounds.bottom-bounds.top)));return {zoom,left:Math.max(0,(bounds.left+bounds.right)/2*zoom-width/2),top:Math.max(0,(bounds.top+bounds.bottom)/2*zoom-height/2)};}
export type Rule = { id: string; title: string; content: string; document?:RuleDocument; status: 'draft'|'test'|'canon'; children: Rule[] };
export type PDF = { url?: string; id: string; title: string; category: string; description: string; filename: string; size: number; createdAt: string };
export const uid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
export const makeSheet = (name: string, player: string): Sheet => ({format:'ab10-character',version:13,id:uid(),name:name.trim()||'Novo personagem',player,description:'',updatedAt:new Date().toISOString(),blocks:[],tabs:[{id:'main',title:'Principal'}],activeTabId:'main',rolls:[],positionMode:'free'});
export const makeBlock = (kind: string,tabId='main',index=0): Block => ({id:uid(),title:({attributes:'Atributos',skills:'Perícias',resources:'Recursos',notes:'Anotações',custom:'Novo bloco',image:'Imagem'} as Record<string,string>)[kind]||'Novo bloco',description:'',kind,tabId,layout:{...layoutForIndex(index),...(kind==='image'?{height:260}:{})},fields:kind==='notes'?[{id:uid(),label:'Anotações',type:'longtext',value:''}]:[]});
export function parseSheet(input: unknown): Sheet {
  const fail = (): never => { throw new Error('Arquivo inválido. Escolha uma ficha .ab10 ou .json exportada pelo ANTROPOLOGO RPG ou AB10.'); };
  if (!input || typeof input !== 'object') return fail();
  const s = input as Record<string, any>;
  if (s.format !== 'ab10-character' || ![1,2,3,4,5,6,7,8,9,10,11,12,13].includes(s.version) || typeof s.name !== 'string' || s.name.length > 200 || typeof s.player !== 'string' || s.player.length > 200 || typeof s.description !== 'string' || s.description.length > 20000 || !Array.isArray(s.blocks) || s.blocks.length > 100) return fail();
  if(s.portrait!==undefined&&!validSheetImage(s.portrait))return fail();
  const positionMode:PositionMode=s.version<5?'free':s.positionMode;if(!['free','grid'].includes(positionMode))return fail();
  const fieldIds=new Map<string,string>(),blockIds=new Map<string,string>();
  const reference=(id:unknown):id is string=>typeof id==='string'&&id.length<=100;
  const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e12;
  const part=(v:unknown):v is FieldPart=>v==='value'||v==='modifier'||s.version>=6&&v==='maximum';
  function parseVariables(input:any):RollVariable[]{
    if(!Array.isArray(input)||input.length>20)return fail();
    const names=new Set<string>();return input.map((v:any)=>{if(!v||typeof v.name!=='string'||!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(v.name)||names.has(v.name)||!reference(v.fieldId)||!part(v.part))return fail();names.add(v.name);return {name:v.name,fieldId:v.fieldId,part:v.part};});
  }
  function parseRoll(input:any):FieldRoll{if(!input||typeof input.formula!=='string'||!input.formula.trim()||input.formula.length>500)return fail();if(s.version>=13&&input.systemActionId!==undefined&&(typeof input.systemActionId!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(input.systemActionId)))return fail();return {formula:input.formula,variables:parseVariables(input.variables),...(s.version>=12&&input.keep!==undefined?{keep:parseKeepOverride(input.keep)}:{}),...(s.version>=13&&input.systemActionId!==undefined?{systemActionId:input.systemActionId}:{})};}
  const remapVariables=(variables:RollVariable[])=>variables.map(v=>({...v,fieldId:fieldIds.get(v.fieldId)||v.fieldId}));
  const tabIds=new Map<string,string>();
  const tabs:SheetTab[]=s.version===1?[{id:uid(),title:'Principal'}]:(()=>{
    if(!Array.isArray(s.tabs)||s.tabs.length<1||s.tabs.length>20)return fail();
    return s.tabs.map((t:any)=>{if(!t||typeof t.id!=='string'||!t.id||t.id.length>100||tabIds.has(t.id)||typeof t.title!=='string'||!t.title.trim()||t.title.length>60)return fail();const id=uid();tabIds.set(t.id,id);return {id,title:t.title};});
  })();
  const activeTabId=s.version===1?tabs[0].id:tabIds.get(s.activeTabId);if(!activeTabId)return fail();
  const blocks: Block[] = s.blocks.map((b:any,index:number) => {
    if(!b || typeof b.title!=='string' || b.title.length>200 || typeof b.description!=='string' || b.description.length>20000 || !Array.isArray(b.fields) || b.fields.length>200) return fail();
    const blockId=uid();if(s.version>=11){if(typeof b.id!=='string'||!b.id||b.id.length>100||blockIds.has(b.id))return fail();blockIds.set(b.id,blockId);}
    const tabId=s.version===1?tabs[0].id:tabIds.get(b.tabId);if(!tabId)return fail();
    const layout=s.version===1?layoutForIndex(index):b.layout;
    if(!layout||!['x','y','width'].every(k=>typeof layout[k]==='number'&&Number.isFinite(layout[k]))||layout.x<0||layout.x>MAP_LIMIT||layout.y<0||layout.y>MAP_LIMIT||layout.width<300||layout.width>960)return fail();
    const visual:Pick<Block,'color'|'columns'|'image'>={};
    if(s.version>=7){
      if(b.color!==undefined){if(!validBlockColor(b.color))return fail();visual.color=b.color;}
      if(b.columns!==undefined){if(!validFieldColumns(b.columns))return fail();visual.columns=b.columns;}
      if(layout.height!==undefined&&(!Number.isFinite(layout.height)||typeof layout.height!=='number'||layout.height<120||layout.height>1200))return fail();
      if(b.image!==undefined){if(b.kind!=='image'||!b.image||!validSheetImage(b.image.src)||!['contain','cover','center'].includes(b.image.fit))return fail();visual.image={src:b.image.src,fit:b.image.fit};}
    }
    const parsed:Block={id:blockId,title:b.title,description:b.description,kind:(s.version>=7?['attributes','skills','resources','notes','custom','image']:['attributes','skills','resources','notes','custom']).includes(b.kind)?b.kind:'custom',tabId,layout:{x:layout.x,y:layout.y,width:layout.width,...(s.version>=7&&layout.height!==undefined?{height:layout.height}:{})},...visual,fields:b.fields.map((f:any)=>{
      if(!f || typeof f.label!=='string' || f.label.length>200 || !(s.version>=6?['number','text','longtext','checkbox','calculated','composite','comparison']:s.version>=3?['number','text','longtext','checkbox','calculated','composite']:['number','text','longtext','checkbox']).includes(f.type)) return fail();
      if(['number','composite','comparison'].includes(f.type) && !(typeof f.value==='number' && Number.isFinite(f.value) || f.value==='')) return fail();
      if(f.type==='comparison'&&f.value!==''&&!finite(f.value))return fail();
      if(f.type==='checkbox' && typeof f.value!=='boolean') return fail();
      if(['text','longtext'].includes(f.type) && (typeof f.value!=='string' || f.value.length>20000)) return fail();
      const id=uid();
      if(s.version>=3){if(!reference(f.id)||!f.id||fieldIds.has(f.id))return fail();fieldIds.set(f.id,id);}
      const field:Field={id,label:f.label,type:f.type,value:f.type==='calculated'?'':f.value};
      if(s.version>=7&&f.columnSpan!==undefined){if(!validFieldColumns(f.columnSpan))return fail();field.columnSpan=f.columnSpan;}
      if(s.version>=8&&f.row!==undefined){if(!Number.isInteger(f.row)||f.row<0||f.row>199)return fail();field.row=f.row;}
      if(s.version>=8&&f.rowSize!==undefined){if(f.row===undefined||!validFieldColumns(f.rowSize))return fail();field.rowSize=f.rowSize;}
      if(s.version>=5&&f.details!==undefined){if(typeof f.details!=='string'||f.details.length>MAX_FIELD_DETAILS)return fail();field.details=f.details;}
      if(f.type==='calculated'){if(!f.dependency||!reference(f.dependency.sourceId)||!part(f.dependency.part)||!finite(f.dependency.offset))return fail();field.dependency={sourceId:f.dependency.sourceId,part:f.dependency.part,offset:f.dependency.offset};}
      if(f.type==='composite'){if(!f.composite||!['manual','ability'].includes(f.composite.mode)||!finite(f.composite.modifier))return fail();field.composite={mode:f.composite.mode,modifier:f.composite.modifier};}
      if(f.type==='comparison'){
        if(!f.comparison||!finite(f.comparison.maximum)||f.comparison.maximum<0)return fail();field.comparison={maximum:f.comparison.maximum};
        if(f.comparison.dependency!==undefined){const d=f.comparison.dependency;if(!d||!reference(d.sourceId)||!part(d.part)||!finite(d.offset))return fail();field.comparison.dependency={sourceId:d.sourceId,part:d.part,offset:d.offset};}
      }
      if(s.version>=4&&f.roll!==undefined){if(!['number','composite','calculated','comparison'].includes(f.type))return fail();field.roll=parseRoll(f.roll);}
      return field;
    })};
    if(s.version>=8){const rows=new Map<number,number>();for(const f of parsed.fields)if(f.row!==undefined){const total=(rows.get(f.row)||0)+(f.columnSpan||1);if(total>4)return fail();rows.set(f.row,total);}}
    return parsed;
  });
  for(const block of blocks)for(const field of block.fields){if(field.dependency)field.dependency.sourceId=fieldIds.get(field.dependency.sourceId)||field.dependency.sourceId;if(field.comparison?.dependency)field.comparison.dependency.sourceId=fieldIds.get(field.comparison.dependency.sourceId)||field.comparison.dependency.sourceId;if(field.roll)field.roll.variables=remapVariables(field.roll.variables);}
  const rollIds=new Set<string>();
  const rolls:RollTemplate[]=s.version<3?[]:(()=>{
    if(!Array.isArray(s.rolls)||s.rolls.length>50)return fail();
    return s.rolls.map((r:any)=>{
      if(!r||!reference(r.id)||!r.id||rollIds.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>100||typeof r.formula!=='string'||r.formula.length>500||!Array.isArray(r.variables)||r.variables.length>20)return fail();rollIds.add(r.id);
      const roll=parseRoll(r);
      return {id:uid(),name:r.name,...roll,variables:remapVariables(roll.variables)};
    });
  })();
  const connections=s.version>=11?parseBlockConnections(s.connections,blocks,blockIds):undefined;
  return {format:'ab10-character',version:13,id:typeof s.id==='string'&&s.id.length<100?s.id:uid(),name:s.name,player:s.player,description:s.description,updatedAt:typeof s.updatedAt==='string'&&!Number.isNaN(Date.parse(s.updatedAt))?s.updatedAt:new Date().toISOString(),blocks,tabs,activeTabId,rolls,positionMode,...(s.portrait?{portrait:s.portrait}:{}),...(connections?{connections}:{}),...(s.version>=9&&s.system!==undefined?{system:parseSheetSystem(s.system)}:{})};
}
export function copyBlock(block:Block):Block {
  const ids=new Map(block.fields.map(f=>[f.id,uid()]));
  return {...block,id:uid(),title:(block.title+' (cópia)').slice(0,200),...(block.image?{image:{...block.image}}:{}),layout:limitLayout({...block.layout,x:block.layout.x+40,y:block.layout.y+40}),fields:block.fields.map(f=>({...f,id:ids.get(f.id)!,...(f.roll?{roll:{...f.roll,variables:f.roll.variables.map(v=>({...v,fieldId:ids.get(v.fieldId)||v.fieldId}))}}:{}),...(f.composite?{composite:{...f.composite}}:{}),...(f.comparison?{comparison:{...f.comparison,...(f.comparison.dependency?{dependency:{...f.comparison.dependency,sourceId:ids.get(f.comparison.dependency.sourceId)||f.comparison.dependency.sourceId}}:{})}}:{}),...(f.dependency?{dependency:{...f.dependency,sourceId:ids.get(f.dependency.sourceId)||f.dependency.sourceId}}:{})}))};
}
export const initialRules: Rule[] = [
  {id:'welcome',title:'Bem-vindo ao AB10',content:'Este é o espaço de consulta do Absolute 10. Use o índice ao lado para explorar os capítulos do sistema.\n\nA estrutura já está preparada para receber o conteúdo oficial. Os capítulos reservados não contêm mecânicas inventadas: o AB10 é um conjunto fixo do site e pode ser consultado por aqui. Para escrever suas próprias regras, volte aos conjuntos e escolha Suas regras.\n\nPara começar a jogar com uma ficha personalizada, acesse Ficha e escolha Criar ficha. Adicione apenas os blocos e campos de que seu personagem precisa.',status:'draft',children:[]},
  {id:'character',title:'Criação de personagem',content:'',status:'draft',children:[{id:'attributes',title:'Atributos',content:'',status:'draft',children:[]},{id:'skills',title:'Perícias',content:'',status:'draft',children:[]},{id:'derived',title:'Valores derivados',content:'',status:'draft',children:[]}]},
  {id:'dice',title:'Sistema de dados',content:'',status:'draft',children:[]},
  {id:'combat',title:'Combate e turnos',content:'',status:'draft',children:[]},
  {id:'magic',title:'Magia e mana',content:'',status:'draft',children:[]}
];
export function findRule(tree:Rule[],id:string):Rule|undefined { for(const r of tree){if(r.id===id)return r;const c=findRule(r.children,id);if(c)return c;} }
export function mapRules(tree:Rule[],id:string,fn:(r:Rule)=>Rule):Rule[] {return tree.map(r=>r.id===id?fn(r):{...r,children:mapRules(r.children,id,fn)});}
export const countRules=(tree:Rule[]):number=>tree.reduce((n,r)=>n+1+countRules(r.children),0);
export const MAX_RULE_TOPICS=300,MAX_RULE_DEPTH=12,MAX_RULEBOOKS=50,MAX_RULEBOOK_BYTES=CONTENT_QUOTAS.ruleset;
export const AB10_RULEBOOK_ID='ab10';
export type Rulebook={format:'rpg-ruleset';version:1;themeKey?:string;visuals?:SystemVisuals;id:string;name:string;description:string;logo?:string;dice?:DiceSet;sheetTemplate?:Sheet;updatedAt:string;chapters:Rule[]};
export const MAX_RULE_LOGO_BYTES=512*1024,MAX_RULE_LOGO_UPLOAD_BYTES=2*1024*1024;
export function validRulebookLogo(value:unknown):value is string{
 if(typeof value!=='string'||value.length>Math.ceil(MAX_RULE_LOGO_BYTES/3)*4+40)return false;
 const match=value.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);if(!match)return false;
 const data=match[2];if(data.length%4!==0||data.length*3/4-(data.endsWith('==')?2:data.endsWith('=')?1:0)>MAX_RULE_LOGO_BYTES)return false;
 try{const head=atob(data.slice(0,Math.min(32,data.length)));return match[1]==='png'?head.startsWith('\x89PNG\r\n\x1a\n'):match[1]==='jpeg'?head.startsWith('\xff\xd8\xff'):head.startsWith('RIFF')&&head.slice(8,12)==='WEBP';}catch{return false;}
}
export function validRules(value:unknown):value is Rule[]{
 let count=0;const ids=new Set<string>();
 function check(items:any,depth:number):boolean{
  if(!Array.isArray(items))return false;if(!items.length)return true;if(depth>=MAX_RULE_DEPTH)return false;
  return items.every(r=>{count++;if(count>MAX_RULE_TOPICS||!r||typeof r.id!=='string'||!r.id||r.id.length>100||ids.has(r.id)||typeof r.title!=='string'||!r.title.trim()||r.title.length>200||typeof r.content!=='string'||r.content.length>50000||r.document!==undefined&&!validRuleDocument(r.document)||!['draft','test','canon'].includes(r.status))return false;ids.add(r.id);return check(r.children,depth+1);});
 }
 return check(value,0);
}
export function makeRulebook(name:string,description='',logo?:string):Rulebook{return {format:'rpg-ruleset',version:1,id:uid(),name:name.trim(),description,...(logo?{logo}:{}),updatedAt:new Date().toISOString(),chapters:[]};}
export function makeAB10Rulebook():Rulebook{return {...makeRulebook('AB10 — Absolute 10','O conjunto fixo do site. Consulte os capítulos e fundamentos do Absolute 10.'),id:AB10_RULEBOOK_ID,themeKey:'absolute10',chapters:JSON.parse(JSON.stringify(initialRules))};}
function validateRulebook(input:unknown):asserts input is Rulebook{
 if(!input||typeof input!=='object')throw new Error('Arquivo inválido. Escolha um conjunto .regras ou .json salvo pelo site.');
 const b=input as Rulebook;if(b.format!=='rpg-ruleset'||b.version!==1||typeof b.name!=='string'||!b.name.trim()||b.name.length>200||typeof b.description!=='string'||b.description.length>2000||!validRules(b.chapters))throw new Error('Conjunto inválido. Confira o nome, os capítulos e o formato do arquivo .regras.');
 if(b.dice!==undefined)parseDiceSet(b.dice);
 if(b.visuals!==undefined)parseSystemVisuals(b.visuals);
 if(b.logo!==undefined&&!validRulebookLogo(b.logo))throw new Error('Logo inválida. Use uma imagem PNG, JPG ou WebP enviada pelo editor do sistema.');
 if(b.sheetTemplate!==undefined){try{parseSheet(b.sheetTemplate);}catch{throw new Error('A ficha-modelo do conjunto é inválida. Use uma ficha .ab10 compatível com o editor.');}}
 if(b.id!==undefined&&(typeof b.id!=='string'||!b.id||b.id.length>100)||b.updatedAt!==undefined&&(typeof b.updatedAt!=='string'||b.updatedAt.length>100))throw new Error('Os dados de identificação do conjunto são inválidos.');
}
/** Promote only official template overrides into system-owned action limits.
 * Standalone character overrides remain losslessly readable, but are inert.
 * Stable references survive field/roll ID remapping and later formula edits. */
function normalizeSystemRollPolicy(book:Rulebook):Rulebook{
 const source=book.sheetTemplate;if(!source||source.version<12)return book;
 const actions={...book.dice?.resolution?.actionLimits};let changed=false;
 const namespace=Array.from(book.id||book.name).reduce((hash,c)=>Math.imul(hash^c.charCodeAt(0),16777619)>>>0,2166136261).toString(36);
 function promote(roll:FieldRoll,key:string):FieldRoll{
  if(roll.keep===undefined||roll.systemActionId)return roll;
  const stem='legacy_'+namespace+'_'+key;let id=stem,n=2;while(Object.hasOwn(actions,id))id=stem+'_'+n++;
  actions[id]=parseKeepOverride(roll.keep);changed=true;return {...roll,systemActionId:id};
 }
 const blocks=source.blocks.map((b,bi)=>({...b,fields:b.fields.map((f,fi)=>f.roll?{...f,roll:promote(f.roll,`field_${bi}_${fi}`)}:f)}));
 const rolls=source.rolls.map((r,i)=>({...r,...promote(r,`roll_${i}`)}));if(!changed)return book;
 // A legacy template without a custom catalog uses the traditional dice.
 const catalog=book.dice||parseDiceSet({version:5,dice:availableDice()});
 return {...book,dice:{...catalog,resolution:{method:'numeric',...book.dice?.resolution,actionLimits:actions}},sheetTemplate:{...source,version:13,blocks,rolls}};
}
export function serializeRulebook(book:Rulebook):string{
 validateRulebook(book);book=normalizeSystemRollPolicy(book);const output=JSON.stringify({format:'rpg-ruleset',version:1,id:book.id,name:book.name,description:book.description,...(book.logo?{logo:book.logo}:{}),...(book.dice!==undefined?{dice:parseDiceSet(book.dice)}:{}),...(book.sheetTemplate?{sheetTemplate:bindSheetToRulebook(book.sheetTemplate,book)}:{}),updatedAt:book.updatedAt,chapters:book.chapters,...(book.visuals!==undefined?{visuals:parseSystemVisuals(book.visuals)}:{})},null,2);
 if(new TextEncoder().encode(output).byteLength>MAX_RULEBOOK_BYTES)throw new Error('O conjunto ultrapassa a cota de '+contentQuotaLabel('ruleset')+', incluindo regras, imagens, personalização e ficha-modelo. Remova conteúdo ou use imagens menores.');return output;
}
export function parseRulebook(input:unknown):Rulebook{
 validateRulebook(input);serializeRulebook(input);const normalized=normalizeSystemRollPolicy(input);
 const topicIds=new Map<string,string>();const collect=(tree:Rule[])=>{for(const r of tree){topicIds.set(r.id,uid());collect(r.children);}};collect(normalized.chapters);
 const clone=(tree:Rule[]):Rule[]=>tree.map(r=>({id:topicIds.get(r.id)!,title:r.title,content:r.document?ruleDocumentText(r.document):r.content,...(r.document?{document:remapRuleDocument(r.document,topicIds)}:{}),status:r.status,children:clone(r.children)}));
 const book={...makeRulebook(normalized.name,normalized.description,normalized.logo),...(normalized.visuals!==undefined?{visuals:parseSystemVisuals(normalized.visuals)}:{}),...(normalized.dice!==undefined?{dice:parseDiceSet(normalized.dice)}:{}),updatedAt:typeof normalized.updatedAt==='string'&&!Number.isNaN(Date.parse(normalized.updatedAt))?normalized.updatedAt:new Date().toISOString(),chapters:clone(normalized.chapters)};
 return {...book,...(normalized.sheetTemplate?{sheetTemplate:bindSheetToRulebook(copySheet(normalized.sheetTemplate),book)}:{})};
}
// Reuse the complete sheet importer so all field, dice and tab references are
// remapped together. Neither a model draft nor a character shares mutable data.
export function copySheet(source:Sheet):Sheet{return {...parseSheet(source),id:uid(),updatedAt:new Date().toISOString()};}
export function withRulebookSheetTemplate(book:Rulebook,source:Sheet|undefined):Rulebook{
 if(book.id===AB10_RULEBOOK_ID)throw new Error('O AB10 é um conjunto fixo do site e permanece somente para consulta.');
 const {sheetTemplate:previous,...rest}=book;
 let next:Rulebook=normalizeSystemRollPolicy({...rest,...(source?{sheetTemplate:copySheet(source)}:{}),updatedAt:new Date().toISOString()});
 if(next.sheetTemplate)next={...next,sheetTemplate:bindSheetToRulebook(next.sheetTemplate,next)};
 serializeRulebook(next);return next;
}
export function characterFromRulebook(book:Rulebook,name:string,player=''):Sheet{
 if(!book.sheetTemplate)throw new Error('Este conjunto ainda não possui uma ficha-modelo.');
 book=normalizeSystemRollPolicy(book);
 return bindSheetToRulebook({...copySheet(book.sheetTemplate!),name:name.trim()||'Novo personagem',player},book);
}
/** Only the dice context follows the system; character structure and values stay independent. */
export function bindSheetToRulebook(sheet:Sheet,book:Pick<Rulebook,'id'|'name'|'dice'>):Sheet{
 const system:SheetSystem={id:book.id,name:book.name,...(book.dice!==undefined?{dice:parseDiceSet(book.dice)}:{})};
 if(JSON.stringify(sheet.system)===JSON.stringify(system))return sheet;
 return {...sheet,system};
}
export function syncSheetSystem(sheet:Sheet,books:Rulebook[]):Sheet{
 const book=sheet.system&&books.find(b=>b.id===sheet.system!.id);return book?bindSheetToRulebook(sheet,book):sheet;
}
export function addRulebook(library:Rulebook[],book:Rulebook):Rulebook[]{
 if(library.filter(b=>b.id!==AB10_RULEBOOK_ID).length>=MAX_RULEBOOKS)throw new Error('Você já tem 50 conjuntos nesta página. Salve e remova um para criar outro.');
 if(book.id===AB10_RULEBOOK_ID||library.some(b=>b.id===book.id))throw new Error('Este conjunto já existe na seleção.');serializeRulebook(book);return [...library,book];
}
export function updateCustomRulebook(library:Rulebook[],book:Rulebook):Rulebook[]{
 if(book.id===AB10_RULEBOOK_ID)return library;serializeRulebook(book);return library.map(b=>b.id===book.id?book:b);
}
export function removeCustomRulebook(library:Rulebook[],id:string):Rulebook[]{return id===AB10_RULEBOOK_ID?library:library.filter(b=>b.id!==id);}
export function ruleLocation(tree:Rule[],id:string,depth=0,trail:{id:string;title:string}[]=[]):{index:number;count:number;depth:number;trail:{id:string;title:string}[]}|undefined{
 for(let i=0;i<tree.length;i++){const r=tree[i],path=[...trail,{id:r.id,title:r.title}];if(r.id===id)return {index:i,count:tree.length,depth,trail:path};const nested=ruleLocation(r.children,id,depth+1,path);if(nested)return nested;}
}
export function moveRule(tree:Rule[],id:string,delta:-1|1):Rule[]{
 const index=tree.findIndex(r=>r.id===id);if(index>=0){const to=index+delta;if(to<0||to>=tree.length)return tree;const next=[...tree];next.splice(to,0,next.splice(index,1)[0]);return next;}
 return tree.map(r=>({...r,children:moveRule(r.children,id,delta)}));
}
export function filterRules(tree:Rule[],query:string):Rule[]{
 const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR'),search=normalize(query.trim());if(!search)return tree;
 return tree.flatMap(r=>{const children=filterRules(r.children,query),matches=normalize(r.title+' '+r.content).includes(search);return matches||children.length?[{...r,children:matches?r.children:children}]:[];});
}
