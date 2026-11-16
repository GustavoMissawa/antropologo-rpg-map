/** Portable, allow-listed rich text. The old `content` string remains the plain-text fallback. */
export type RuleDocMark={type:string;attrs?:Record<string,any>};
export type RuleDocNode={type:string;attrs?:Record<string,any>;text?:string;marks?:RuleDocMark[];content?:RuleDocNode[]};
export type RuleDocument=RuleDocNode&{type:'doc'};
export type RuleLink={kind:'internal'|'external';href?:string|null;topicId?:string|null;anchorId?:string|null};
export type RuleHeading={id:string;title:string;level:number};
export type RuleLinkTarget={topicId:string;anchorId?:string;title:string;path:string;kind:'topic'|'heading'};
type Topic={id:string;title:string;content:string;document?:RuleDocument;children:Topic[]};
export const MAX_RULE_DOCUMENT_BYTES=250000;
const blockTypes=new Set(['paragraph','heading','blockquote','bulletList','orderedList','codeBlock','horizontalRule']);
const simpleMarks=new Set(['bold','italic','underline','strike','code','highlight']);
const identifier=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=100&&!/[\s\u0000-\u001f]/u.test(v);
export function safeRuleURL(input:unknown):string|null{
 if(typeof input!=='string'||input.length>2048||/[\u0000-\u0020\u007f]/u.test(input))return null;
 try{const url=new URL(input);return ['https:','http:','mailto:'].includes(url.protocol)?url.href:null;}catch{return null;}
}
export function validRuleLink(input:unknown):input is RuleLink{
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const a=input as RuleLink;if(Object.keys(a).some(k=>!['kind','href','topicId','anchorId'].includes(k)))return false;
 return a.kind==='internal'?identifier(a.topicId)&&(a.anchorId==null||identifier(a.anchorId))&&a.href==null:a.kind==='external'&&!!safeRuleURL(a.href)&&a.topicId==null&&a.anchorId==null;
}
export function validRuleDocument(input:unknown):input is RuleDocument{
 let nodes=0,characters=0;const ancestors=new Set<object>(),anchors=new Set<string>();
 function check(value:any,parent:string,depth:number):boolean{
  if(!value||typeof value!=='object'||Array.isArray(value)||ancestors.has(value)||depth>24||++nodes>12000)return false;
  const n=value as RuleDocNode;if(Object.keys(n).some(k=>!['type','attrs','text','marks','content'].includes(k)))return false;
  if(typeof n.type!=='string')return false;
  if(parent==='root'&&n.type!=='doc'||parent==='doc'&&!blockTypes.has(n.type)||['paragraph','heading'].includes(parent)&&!['text','hardBreak'].includes(n.type)||parent==='codeBlock'&&n.type!=='text'||['bulletList','orderedList'].includes(parent)&&n.type!=='listItem'||['blockquote','listItem'].includes(parent)&&!blockTypes.has(n.type))return false;
  if(!['doc','listItem','text','hardBreak',...blockTypes].includes(n.type))return false;
  if(n.attrs!==undefined&&(!n.attrs||typeof n.attrs!=='object'||Array.isArray(n.attrs)))return false;
  const a=n.attrs||{},allowed=n.type==='heading'?['level','id']:n.type==='paragraph'?['ruleSize']:n.type==='orderedList'?['start','type']:n.type==='codeBlock'?['language']:[];
  if(Object.keys(a).some(k=>!allowed.includes(k)))return false;
  if(n.type==='heading'&&(![1,2,3,4].includes(a.level)||!identifier(a.id)||anchors.has(a.id)))return false;
  if(n.type==='paragraph'&&a.ruleSize!=null&&a.ruleSize!=='small')return false;
  if(n.type==='heading')anchors.add(a.id);
  if(n.type==='orderedList'&&(a.start!==undefined&&(!Number.isInteger(a.start)||a.start<1||a.start>1000000)||a.type!=null&&!['1','a','A','i','I'].includes(a.type)))return false;
  if(n.type==='codeBlock'&&a.language!=null&&(typeof a.language!=='string'||a.language.length>50||!/^[-\w#+.]*$/.test(a.language)))return false;
  if(n.type==='text'){if(typeof n.text!=='string'||!n.text||n.content!==undefined)return false;characters+=n.text.length;if(characters>50000)return false;}
  else if(n.text!==undefined)return false;
  if(n.marks!==undefined){if(n.type!=='text'||!Array.isArray(n.marks)||n.marks.length>7)return false;const seen=new Set<string>();for(const m of n.marks){if(!m||typeof m!=='object'||Object.keys(m).some(k=>!['type','attrs'].includes(k))||seen.has(m.type))return false;seen.add(m.type);if(m.type==='ruleLink'){if(!validRuleLink(m.attrs))return false;}else if(!simpleMarks.has(m.type)||m.attrs!==undefined&&Object.keys(m.attrs).length>0)return false;}}
  if(['text','hardBreak','horizontalRule'].includes(n.type))return n.content===undefined;
  if(n.content!==undefined&&!Array.isArray(n.content))return false;const children=n.content||[];
  if(['doc','blockquote','bulletList','orderedList','listItem'].includes(n.type)&&!children.length)return false;
  if(n.type==='listItem'&&children[0]?.type!=='paragraph')return false;
  ancestors.add(value);const ok=children.every(c=>check(c,n.type,depth+1));ancestors.delete(value);return ok;
 }
 try{return check(input,'root',0)&&ruleDocumentText(input as RuleDocument).length<=50000&&new TextEncoder().encode(JSON.stringify(input)).byteLength<=MAX_RULE_DOCUMENT_BYTES;}catch{return false;}
}
export function ruleDocumentText(node:RuleDocNode):string{
 if(node.type==='text')return node.text||'';if(node.type==='hardBreak')return '\n';
 const children=node.content||[],separator=['paragraph','heading','codeBlock'].includes(node.type)?'':['bulletList','orderedList','listItem'].includes(node.type)?'\n':'\n\n';return children.map(ruleDocumentText).join(separator);
}
export function documentFromText(content:string):RuleDocument{
 return {type:'doc',content:(content?content.split('\n\n'):['']).map(paragraph=>({type:'paragraph',...(paragraph?{content:paragraph.split('\n').flatMap((text,i)=>[...(i?[{type:'hardBreak'}]:[]),...(text?[{type:'text',text}]:[])])}:{})}))};
}
export function getRuleDocument(topic:{content:string;document?:RuleDocument}):RuleDocument{return topic.document?structuredClone(topic.document):documentFromText(topic.content);}
export function ruleDocumentHeadings(doc?:RuleDocument):RuleHeading[]{
 const result:RuleHeading[]=[];function visit(n:RuleDocNode){if(n.type==='heading'&&n.attrs?.id)result.push({id:n.attrs.id,title:ruleDocumentText(n).trim()||'Subseção sem título',level:n.attrs.level});n.content?.forEach(visit);}if(doc)visit(doc);return result;
}
export function ruleLinkTargets(tree:Topic[],override?:{id:string;title:string;document:RuleDocument}):RuleLinkTarget[]{
 const out:RuleLinkTarget[]=[];let found=false;
 function visit(items:Topic[],parents:string[]){for(const item of items){const current=item.id===override?.id?(found=true,{...item,...override}):item,path=[...parents,current.title];out.push({topicId:current.id,title:current.title,path:path.join(' › '),kind:'topic'});for(const heading of ruleDocumentHeadings(current.document))out.push({topicId:current.id,anchorId:heading.id,title:heading.title,path:[...path,heading.title].join(' › '),kind:'heading'});visit(item.children,path);}}
 visit(tree,[]);if(override&&!found){out.push({topicId:override.id,title:override.title||'Novo tópico',path:override.title||'Novo tópico',kind:'topic'});for(const h of ruleDocumentHeadings(override.document))out.push({topicId:override.id,anchorId:h.id,title:h.title,path:(override.title||'Novo tópico')+' › '+h.title,kind:'heading'});}return out;
}
export function remapRuleDocument(doc:RuleDocument,topicIds:Map<string,string>):RuleDocument{
 const clone=(n:RuleDocNode):RuleDocNode=>({...n,...(n.attrs?{attrs:{...n.attrs}}:{}),...(n.marks?{marks:n.marks.map(m=>({...m,...(m.attrs?{attrs:{...m.attrs,...(m.type==='ruleLink'&&m.attrs.kind==='internal'?{topicId:topicIds.get(m.attrs.topicId)||m.attrs.topicId}:{})}}:{})}))}:{}),...(n.content?{content:n.content.map(clone)}:{})});return clone(doc) as RuleDocument;
}
export const ruleAnchorId=(topicId:string,anchorId?:string)=>'rule-'+encodeURIComponent(topicId)+(anchorId?'--'+encodeURIComponent(anchorId):'');
export const newRuleHeadingId=()=> 'sec-'+(typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''));
