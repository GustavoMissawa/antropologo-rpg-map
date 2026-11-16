import { Extension,InputRule,Mark,Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Plugin,PluginKey,TextSelection,type Command,type EditorState } from '@tiptap/pm/state';
import { splitBlockAs } from '@tiptap/pm/commands';
import type { Mark as ProseMirrorMark,Schema } from '@tiptap/pm/model';
import { Decoration,DecorationSet,type EditorView } from '@tiptap/pm/view';
import { newRuleHeadingId,ruleAnchorId,safeRuleURL,validRuleLink } from '../lib/rule-document.ts';

const RuleHeading=Node.create({
 name:'heading',group:'block',content:'inline*',defining:true,
 addAttributes(){return {level:{default:2,rendered:false},id:{default:null,parseHTML:el=>el.getAttribute('data-section-id'),rendered:false}};},
 parseHTML(){return [1,2,3,4].map(level=>({tag:'h'+level,attrs:{level}}));},
 renderHTML({node}){return ['h'+node.attrs.level,{'data-section-id':node.attrs.id},0];},
 addKeyboardShortcuts(){return Object.fromEntries([1,2,3,4].map(level=>['Mod-Alt-'+level,()=>this.editor.commands.command(({state,dispatch})=>setRuleBlockStyle(String(level))(state,dispatch))]));}
});
/** A paragraph attribute, never another heading level or a list node. */
const SmallRuleText=Extension.create({name:'ruleSmallText',addGlobalAttributes(){return [{types:['paragraph'],attributes:{ruleSize:{default:null,keepOnSplit:false,parseHTML:el=>el.getAttribute('data-rule-size')==='small'?'small':null,renderHTML:attrs=>attrs.ruleSize==='small'?{'data-rule-size':'small'}:{}}}}];}});
export function ruleBlockInputRules(schema:Schema){return [new InputRule({find:/^(#{1,4}|-#) $/,handler({state,range,match}){
 const parent=state.doc.resolve(range.from),small=match[1]==='-#',type=small?schema.nodes.paragraph:schema.nodes.heading;
 if(!parent.node(-1).canReplaceWith(parent.index(-1),parent.indexAfter(-1),type))return null;
 const attrs=small?{ruleSize:'small'}:{level:match[1].length,id:parent.parent.type.name==='heading'?parent.parent.attrs.id:null};
 state.tr.delete(range.from,range.to).setBlockType(range.from,range.from,type,attrs);
}})];}
/** Keep each selected heading's anchor when changing its level from a control. */
export const setRuleBlockStyle=(style:string):Command=>(state,dispatch)=>{
 const level=Number(style),type=[1,2,3,4].includes(level)?state.schema.nodes.heading:state.schema.nodes.paragraph,tr=state.tr,{from,to}=state.selection;
 state.doc.nodesBetween(from,to,(node,pos)=>{if(!node.isTextblock)return;if(from!==to&&(from>=pos+1+node.content.size||to<=pos+1))return false;const attrs=type.name==='heading'?{level,id:node.type.name==='heading'?node.attrs.id:null}:{ruleSize:style==='small'?'small':null};tr.setBlockType(pos,pos+node.nodeSize,type,attrs);return false;});
 if(!tr.docChanged)return false;if(dispatch)dispatch(tr.scrollIntoView());return true;
};
const formattedRuleBlock=(state:EditorState)=>state.selection.$from.parent.type.name==='heading'||state.selection.$from.parent.type.name==='paragraph'&&state.selection.$from.parent.attrs.ruleSize==='small';
/** Split the existing block transactionally; the next paragraph has normal size. */
export const enterRuleBlock:Command=(state,dispatch)=>{
 const {$from,$to}=state.selection;if(!$from.sameParent($to)||!formattedRuleBlock(state))return false;
 // Let the existing list commands split/exit list items and reset non-splittable size.
 for(let depth=$from.depth-1;depth>0;depth--)if($from.node(depth).type.name==='listItem')return false;
 if(!$from.parent.content.size){if(dispatch)dispatch(state.tr.setNodeMarkup($from.before(),state.schema.nodes.paragraph,{ruleSize:null}).setStoredMarks([]).scrollIntoView());return true;}
 const atStart=$from.parentOffset===0&&$to.parentOffset<$to.parent.content.size;
 return splitBlockAs((node)=>atStart?{type:node.type,attrs:node.attrs}:{type:state.schema.nodes.paragraph,attrs:{ruleSize:null}})(state,dispatch?tr=>{if(atStart)tr.setNodeMarkup($from.before(),state.schema.nodes.paragraph,{ruleSize:null});dispatch(tr.setStoredMarks([]));}:undefined);
};
/** At the block's beginning, Backspace exposes editable literal syntax in place. */
export const revealRuleBlockMarker:Command=(state,dispatch)=>{
 const {$from,empty}=state.selection;if(!empty||$from.parentOffset!==0||!formattedRuleBlock(state))return false;
 const prefix=$from.parent.type.name==='heading'?'#'.repeat($from.parent.attrs.level)+' ':'-# ';
 if(dispatch){const tr=state.tr.setNodeMarkup($from.before(),state.schema.nodes.paragraph,{ruleSize:null}).insertText(prefix,$from.pos);dispatch(tr.setSelection(TextSelection.create(tr.doc,$from.pos+prefix.length)).setStoredMarks([]).scrollIntoView());}return true;
};
const RuleBlockWriting=Extension.create({name:'ruleBlockWriting',priority:1100,
 addInputRules(){return ruleBlockInputRules(this.editor.schema);},
 addKeyboardShortcuts(){return {Enter:()=>enterRuleBlock(this.editor.state,tr=>this.editor.view.dispatch(tr)),Backspace:()=>revealRuleBlockMarker(this.editor.state,tr=>this.editor.view.dispatch(tr))};}
});
const Highlight=Mark.create({name:'highlight',parseHTML(){return [{tag:'mark'}];},renderHTML(){return ['mark',0];},addKeyboardShortcuts(){return {'Mod-Shift-h':()=>this.editor.commands.toggleMark('highlight')};}});
const RuleLink=Mark.create({
 name:'ruleLink',inclusive:false,
 addAttributes(){return {kind:{default:'external'},href:{default:null},topicId:{default:null},anchorId:{default:null}};},
 parseHTML(){return [{tag:'a[data-rule-topic]',getAttrs:element=>{const a={kind:'internal',topicId:element.getAttribute('data-rule-topic'),anchorId:element.getAttribute('data-rule-anchor'),href:null};return validRuleLink(a)?a:false;}},{tag:'a[href]',getAttrs:element=>{const href=safeRuleURL(element.getAttribute('href'));return href?{kind:'external',href,topicId:null,anchorId:null}:false;}}];},
 renderHTML({mark}){const a=mark.attrs;return a.kind==='internal'?['a',{href:'#'+ruleAnchorId(a.topicId,a.anchorId),'data-rule-topic':a.topicId,'data-rule-anchor':a.anchorId,class:'rule-internal-link'},0]:['a',{href:safeRuleURL(a.href)||undefined,target:'_blank',rel:'noopener noreferrer',class:'rule-external-link'},0];}
});
export type FormattingRange={from:number;to:number;open:string;close:string;type:string};
const inlineTokens:Record<string,[string,string]>={bold:['**','**'],italic:['*','*'],underline:['<u>','</u>'],strike:['~~','~~'],highlight:['==','=='],code:['`','`']};
/** Read the document on both sides of the caret, independently of typing marks. */
function inlineFormattingAtCaret(state:EditorState):(FormattingRange&{mark:ProseMirrorMark})[]{
 const {selection}=state;if(!selection.empty||!selection.$from.parent.isTextblock)return [];
 const {$from}=selection,parent=$from.parent,ranges:(FormattingRange&{mark:ProseMirrorMark})[]=[];
 for(const seed of [parent.childBefore($from.parentOffset),parent.childAfter($from.parentOffset)]){
  if(!seed.node)continue;
  for(const mark of seed.node.marks){
   const pair=mark.type.name==='ruleLink'?(mark.attrs.kind==='internal'?['[[',']]']:['[',']('+mark.attrs.href+')']):inlineTokens[mark.type.name];
   if(!pair)continue;
   let from=$from.start()+seed.offset,to=from+seed.node.nodeSize,start=seed.index,end=start+1;
   while(start>0&&mark.isInSet(parent.child(start-1).marks)){start--;from-=parent.child(start).nodeSize;}
   while(end<parent.childCount&&mark.isInSet(parent.child(end).marks)){to+=parent.child(end).nodeSize;end++;}
   if(from<=$from.pos&&$from.pos<=to&&!ranges.some(r=>r.from===from&&r.to===to&&r.mark.eq(mark)))ranges.push({from,to,open:pair[0],close:pair[1],type:mark.type.name,mark});
  }
 }
 return ranges;
}
/** Derived only from the actual collapsed text selection. No hover state participates. */
export function activeFormattingRanges(state:EditorState):FormattingRange[]{
 if(!state.selection.empty||!state.selection.$from.parent.isTextblock)return [];
 const {$from}=state.selection,ranges:FormattingRange[]=inlineFormattingAtCaret(state).map(({mark,...range})=>range);
 for(let depth=$from.depth;depth>0;depth--){const n=$from.node(depth),from=$from.start(depth),to=$from.end(depth);if(n.type.name==='heading')ranges.push({from,to,open:'#'.repeat(n.attrs.level)+' ',close:'',type:'heading'});if(n.type.name==='paragraph'&&n.attrs.ruleSize==='small')ranges.push({from,to,open:'-# ',close:'',type:'small'});if(n.type.name==='codeBlock')ranges.push({from,to,open:'```\n',close:'\n```',type:'codeBlock'});if(n.type.name==='blockquote'){ranges.push({from:$from.start(),to:$from.end(),open:'> ',close:'',type:'blockquote'});break;}}
 return ranges;
}
/** A separator at a right boundary ends only the marks that finish there. */
function insertBoundarySeparator(view:EditorView,from:number,to:number,text:string):boolean{
 const {state}=view;if(view.composing||from!==to||!state.selection.empty||state.selection.from!==from||!/^[ \u00a0]/u.test(text))return false;
 const ending=inlineFormattingAtCaret(state).filter(range=>range.to===from);
 if(!ending.length)return false;
 const typing=state.storedMarks??state.selection.$from.marks(),outside=typing.filter(mark=>!ending.some(range=>range.mark.eq(mark)));
 view.dispatch(state.tr.setStoredMarks(outside).insertText(text,from,to).setStoredMarks(outside).scrollIntoView());return true;
}
export function formattingBoundaryPlugin(){return new Plugin({key:new PluginKey('ruleFormattingBoundary'),props:{
 handleKeyDown(view,event){if(event.key!==' '||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return false;return insertBoundarySeparator(view,view.state.selection.from,view.state.selection.to,' ');},
 handleTextInput(view,from,to,text){return insertBoundarySeparator(view,from,to,text);}
}});}
export function cursorSyntaxPlugin(){return new Plugin({key:new PluginKey('ruleCursorSyntax'),props:{decorations(state){
 const widgets:Decoration[]=[];
 for(const [i,range] of activeFormattingRanges(state).entries()){
  const inline=range.type in inlineTokens||range.type==='ruleLink';
  for(const [pos,text,edge,side] of [[range.from,range.open,'open',inline?-500+i:-1],[range.to,range.close,'close',inline?-1000-i:1]] as const){
   if(!text)continue;
   widgets.push(Decoration.widget(pos,()=>{const el=document.createElement('span');el.className='rule-syntax-marker';el.textContent=text;el.contentEditable='false';el.setAttribute('aria-hidden','true');el.dataset.format=range.type;return el;},{side,key:JSON.stringify([range.type,pos,edge,text]),marks:[],relaxedSide:true,ignoreSelection:true}));
  }
 }
 return DecorationSet.create(state.doc,widgets);
}}});}
const CursorSyntax=Extension.create({name:'ruleCursorSyntax',addProseMirrorPlugins(){return [formattingBoundaryPlugin(),cursorSyntaxPlugin()];}});
export function headingAnchorPlugin(){return new Plugin({key:new PluginKey('ruleHeadingAnchors'),appendTransaction(transactions,old,state){if(!transactions.some(t=>t.docChanged))return null;const ids=new Set<string>(),tr=state.tr;state.doc.descendants((node,pos)=>{if(node.type.name!=='heading')return;let id=node.attrs.id;if(typeof id!=='string'||!id||id.length>100||/[\s\u0000-\u001f]/u.test(id)||ids.has(id)){id=newRuleHeadingId();tr.setNodeMarkup(pos,undefined,{...node.attrs,id});}ids.add(id);});return tr.docChanged?tr.setMeta('addToHistory',false):null;}});}
const HeadingAnchors=Extension.create({name:'ruleHeadingAnchors',addProseMirrorPlugins(){return [headingAnchorPlugin()];}});
export const ruleEditorExtensions=()=>[StarterKit.configure({heading:false,link:false,trailingNode:false}),RuleHeading,SmallRuleText,RuleBlockWriting,Highlight,RuleLink,CursorSyntax,HeadingAnchors];
/** Keep pasted content within the editor schema; active content and event handlers never enter it. */
export function cleanPastedRuleHTML(html:string){
 const parsed=new DOMParser().parseFromString(html,'text/html');parsed.querySelectorAll('script,style,iframe,object,embed,svg,math,form,input,textarea,button,video,audio').forEach(el=>el.remove());
 // Tables are unsupported: keep cell text separated instead of merging words.
 for(const cell of parsed.body.querySelectorAll<HTMLTableCellElement>('td,th'))if(!cell.querySelector('p,h1,h2,h3,h4,ul,ol,blockquote,pre')){const paragraph=parsed.createElement('p');while(cell.firstChild)paragraph.appendChild(cell.firstChild);cell.appendChild(paragraph);}
 for(const el of parsed.body.querySelectorAll<HTMLElement>('*')){
  // Preserve only finite typography tokens understood by the existing schema.
  // Docs' <b style="font-weight:normal"> wrapper must stay normal during parsing.
  const weight=el.style.fontWeight.toLowerCase(),italic=el.style.fontStyle.toLowerCase(),decoration=(el.style.textDecorationLine||el.style.textDecoration).toLowerCase().split(/\s+/).filter(value=>['underline','line-through'].includes(value));
  for(const a of [...el.attributes])if(a.name.startsWith('on')||a.name==='style'||a.name==='srcdoc')el.removeAttribute(a.name);
  if(/^(normal|bold|bolder|[1-9]00)$/.test(weight))el.style.fontWeight=weight;
  if(['normal','italic'].includes(italic))el.style.fontStyle=italic;
  if(decoration.length)el.style.textDecoration=decoration.join(' ');
 }
 return parsed.body.innerHTML;
}
