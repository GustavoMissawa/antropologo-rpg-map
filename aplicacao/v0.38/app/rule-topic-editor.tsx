'use client';
import { useEffect,useRef,useState,type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent,useEditor,useEditorState } from '@tiptap/react';
import { TextSelection,type SelectionBookmark } from '@tiptap/pm/state';
import { Bold,Italic,Underline,Strikethrough,Highlighter,Heading2,Type,List,ListOrdered,Quote,Code,SquareCode,Link2,Unlink,BookOpen,MoreHorizontal,Undo2,Redo2,Check,X,ExternalLink,Search } from 'lucide-react';
import { getRuleDocument,ruleDocumentText,ruleLinkTargets,safeRuleURL,validRuleDocument,type RuleDocument,type RuleLink,type RuleLinkTarget } from '../lib/rule-document';
import type { Rule,Rulebook } from '../lib/model';
import { cleanPastedRuleHTML,ruleEditorExtensions,setRuleBlockStyle } from './rule-editor-extensions';
import { RuleMobileToolbar,useRuleMobile } from './rule-mobile-toolbar';
import { usesNativeRuleMenu,type RuleMobileViewport } from '../lib/rule-mobile';

export type RuleTopicDraft={id:string;parent?:string;isNew?:boolean;title:string;content:string;document?:RuleDocument;status:Rule['status']};
type Props={initial:RuleTopicDraft;book:Rulebook;onSave:(draft:RuleTopicDraft)=>void;onCancel:()=>void;onDirtyChange:(dirty:boolean)=>void};
const tools=[
 {id:'bold',label:'Negrito',Icon:Bold,key:'Ctrl+B'},
 {id:'italic',label:'Itálico',Icon:Italic,key:'Ctrl+I'},
 {id:'underline',label:'Sublinhado',Icon:Underline,key:'Ctrl+U'},
 {id:'strike',label:'Riscado',Icon:Strikethrough},
 {id:'highlight',label:'Destaque',Icon:Highlighter},
 {id:'heading',label:'Cabeçalho / subseção',Icon:Heading2},
 {id:'small',label:'Texto pequeno',Icon:Type},
 {id:'bulletList',label:'Lista com marcadores',Icon:List},
 {id:'orderedList',label:'Lista numerada',Icon:ListOrdered},
 {id:'blockquote',label:'Citação',Icon:Quote},
 {id:'code',label:'Código inline',Icon:Code},
 {id:'codeBlock',label:'Bloco de código',Icon:SquareCode},
 {id:'internal',label:'Link interno',Icon:BookOpen},
 {id:'external',label:'Link externo',Icon:Link2},
 {id:'unlink',label:'Remover link',Icon:Unlink},
 {id:'undo',label:'Desfazer',Icon:Undo2,key:'Ctrl+Z'},
 {id:'redo',label:'Refazer',Icon:Redo2,key:'Ctrl+Shift+Z'},
] as const;
type Action=(typeof tools)[number]['id'];
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');

export function RuleTopicEditor({initial,book,onSave,onCancel,onDirtyChange}:Props){
 const [title,setTitle]=useState(initial.title),[status,setStatus]=useState(initial.status),[error,setError]=useState(''),[dirty,setDirty]=useState(false),[menu,setMenu]=useState<{x:number;y:number;height:number}|null>(null);
 const [link,setLink]=useState<{kind:'internal'|'external';label:string;href:string;target:RuleLinkTarget|null}|null>(null),[search,setSearch]=useState(''),[linkError,setLinkError]=useState('');
 const savedSelection=useRef<SelectionBookmark|null>(null),menuRef=useRef<HTMLDivElement>(null),lastPointer=useRef('mouse'),mobileFocus=useRef(false),linkPanel=useRef<HTMLElement>(null);
 const mobile=useRuleMobile(),[dockHeight,setDockHeight]=useState(0),[mobileViewport,setMobileViewport]=useState<RuleMobileViewport|null>(null);
 const initialDoc=useRef(getRuleDocument(initial));
 function changed(){setDirty(true);onDirtyChange(true);setError('');}
 const editor=useEditor({
  extensions:ruleEditorExtensions(),content:initialDoc.current,immediatelyRender:false,shouldRerenderOnTransaction:false,
  editorProps:{attributes:{role:'textbox','aria-label':'Conteúdo do tópico','aria-multiline':'true',class:'rule-rich-content rule-editor-surface','aria-placeholder':'Escreva o conteúdo do tópico.'},transformPastedHTML:cleanPastedRuleHTML,
   handleKeyDown(view,event){if(event.key==='F10'&&event.shiftKey){event.preventDefault();const coords=view.coordsAtPos(view.state.selection.from);showMenu(coords.left,coords.bottom);return true;}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openLink('external');return true;}return false;}
  },
  onTransaction({transaction}){if(transaction.docChanged&&savedSelection.current)savedSelection.current=savedSelection.current.map(transaction.mapping);},
  onUpdate(){changed();}
 },[]);
 const viewState=useEditorState({editor,selector:({editor:e})=>({active:Object.fromEntries(['bold','italic','underline','strike','highlight','bulletList','orderedList','blockquote','code','codeBlock','ruleLink'].map(k=>[k,e?.isActive(k)||false])),blockStyle:e?.isActive('heading')?String(e.getAttributes('heading').level):e?.isActive('paragraph',{ruleSize:'small'})?'small':'text',count:e?ruleDocumentText(e.getJSON() as RuleDocument).length:0,empty:e?.isEmpty??true,undo:e?.can().undo()||false,redo:e?.can().redo()||false})});
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{if(!editor||!mobile||mobileFocus.current)return;mobileFocus.current=true;if(document.activeElement?.classList.contains('rule-title-input'))editor.commands.focus(undefined,{scrollIntoView:false});},[editor,mobile]);
 useEffect(()=>{if(!mobile||!link)return;const task=requestAnimationFrame(()=>linkPanel.current?.scrollIntoView({block:'start',behavior:'instant'}));return()=>cancelAnimationFrame(task);},[mobile,!!link,dockHeight,mobileViewport?.height]);
 useEffect(()=>{if(!menu)return;const dismiss=()=>{if(!menuRef.current)return;setMenu(null);savedSelection.current=null;},close=(e:Event)=>{if(!menuRef.current?.contains(e.target as globalThis.Node))dismiss();};document.addEventListener('pointerdown',close,true);window.addEventListener('scroll',close,true);window.addEventListener('resize',dismiss);menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true});return()=>{document.removeEventListener('pointerdown',close,true);window.removeEventListener('scroll',close,true);window.removeEventListener('resize',dismiss);};},[menu]);
 function restore(){if(!editor)return;try{const selection=savedSelection.current?.resolve(editor.state.doc);if(selection)editor.view.dispatch(editor.state.tr.setSelection(selection));}catch{}editor.view.focus();}
 function captureMobileSelection(){
  if(!editor)return;const selection=editor.view.dom.ownerDocument.getSelection();
  if(selection?.anchorNode&&selection.focusNode&&editor.view.dom.contains(selection.anchorNode)&&editor.view.dom.contains(selection.focusNode)){
   try{const anchor=editor.view.posAtDOM(selection.anchorNode,selection.anchorOffset),head=editor.view.posAtDOM(selection.focusNode,selection.focusOffset);savedSelection.current=TextSelection.create(editor.state.doc,anchor,head).getBookmark();return;}catch{}
  }
  savedSelection.current=editor.state.selection.getBookmark();
 }
 function showMenu(x:number,y:number){if(!editor)return;savedSelection.current=editor.state.selection.getBookmark();const viewport=window.visualViewport,w=viewport?.width||window.innerWidth,h=viewport?.height||window.innerHeight,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,height=Math.min(580,h*.8),width=Math.min(324,w-16);setMenu({x:Math.max(left+8,Math.min(x,left+w-width-8)),y:Math.max(top+8,Math.min(y,top+h-height-12)),height});}
 function save(){if(!editor)return;setError('');const doc=editor.getJSON() as RuleDocument;if(!title.trim()){setError('Informe um título para o tópico.');return;}if(!validRuleDocument(doc)){setError('Revise o conteúdo: o limite é de 50.000 caracteres e 250 KB de texto formatado por tópico.');return;}try{onSave({...initial,title:title.trim(),status,content:ruleDocumentText(doc),document:doc});}catch(e){setError((e as Error).message);}}
 function openLink(kind:'internal'|'external'){
  if(!editor)return;restore();if(editor.isActive('ruleLink')&&editor.state.selection.empty)editor.commands.extendMarkRange('ruleLink');savedSelection.current=editor.state.selection.getBookmark();
  const {from,to}=editor.state.selection,label=editor.state.doc.textBetween(from,to,'\n'),attrs=editor.getAttributes('ruleLink');
  const current=ruleLinkTargets(book.chapters,{id:initial.id,title:title||'Novo tópico',document:editor.getJSON() as RuleDocument}).find(t=>t.topicId===attrs.topicId&&(t.anchorId||null)===(attrs.anchorId||null));
  setSearch('');setLinkError('');setLink({kind,label,href:attrs.kind==='external'?attrs.href||'':'',target:kind==='internal'&&attrs.kind==='internal'?current||null:null});setMenu(null);
 }
 function applyStyle(style:string){if(!editor)return;restore();editor.chain().focus().command(({state,dispatch})=>setRuleBlockStyle(style)(state,dispatch)).run();savedSelection.current=null;setMenu(null);}
 function run(id:Action){if(!editor)return;if(id==='internal'||id==='external'){openLink(id);return;}if(id==='heading'||id==='small'){applyStyle(id==='heading'?(editor.isActive('heading')?'text':'2'):(editor.isActive('paragraph',{ruleSize:'small'})?'text':'small'));return;}restore();let chain=editor.chain().focus();switch(id){case 'bold':chain=chain.toggleBold();break;case 'italic':chain=chain.toggleItalic();break;case 'underline':chain=chain.toggleUnderline();break;case 'strike':chain=chain.toggleStrike();break;case 'highlight':chain=chain.toggleMark('highlight');break;case 'bulletList':chain=chain.toggleBulletList();break;case 'orderedList':chain=chain.toggleOrderedList();break;case 'blockquote':chain=chain.toggleBlockquote();break;case 'code':chain=chain.toggleCode();break;case 'codeBlock':chain=chain.toggleCodeBlock();break;case 'unlink':chain=chain.extendMarkRange('ruleLink').unsetMark('ruleLink');break;case 'undo':chain=chain.undo();break;case 'redo':chain=chain.redo();break;}chain.run();savedSelection.current=null;setMenu(null);}
 function applyLink(){
  if(!editor||!link)return;const href=link.kind==='external'?safeRuleURL(link.href.trim()):null;if(link.kind==='external'&&!href){setLinkError('Informe um endereço completo, começando com https://, http:// ou mailto:.');return;}if(link.kind==='internal'&&!link.target){setLinkError('Escolha um tópico ou uma subseção.');return;}
  const attrs:RuleLink=link.kind==='internal'?{kind:'internal',topicId:link.target!.topicId,anchorId:link.target!.anchorId||null,href:null}:{kind:'external',href,topicId:null,anchorId:null};
  restore();const {from,to}=editor.state.selection,selectedText=editor.state.doc.textBetween(from,to,'\n'),label=link.label||link.target?.title||href||'Link';
  if(from!==to&&label===selectedText)editor.chain().focus().setMark('ruleLink',attrs).run();else{const marks=editor.state.selection.$from.marks().filter(m=>m.type.name!=='ruleLink').map(m=>m.toJSON());editor.chain().focus().insertContentAt({from,to},{type:'text',text:label,marks:[...marks,{type:'ruleLink',attrs}]}).run();}
  savedSelection.current=null;setLink(null);setLinkError('');
 }
 const targets=link?.kind==='internal'?ruleLinkTargets(book.chapters,{id:initial.id,title:title||'Novo tópico',document:(editor?.getJSON()||initialDoc.current) as RuleDocument}).filter(t=>normalize(t.path).includes(normalize(search))):[];
 const disabled=(id:Action)=>!editor||id==='undo'&&!viewState?.undo||id==='redo'&&!viewState?.redo||id==='unlink'&&!viewState?.active.ruleLink;
 return <section className={'rule-topic-editor'+(mobile?' is-mobile-editor':'')+(mobile&&mobileViewport&&mobileViewport.height<360?' mobile-compact-editor':'')+(mobile&&link?' mobile-link-open':'')} style={{'--rule-mobile-toolbar-height':dockHeight+'px','--rule-mobile-visible-height':mobileViewport?mobileViewport.height+'px':'100dvh'} as CSSProperties} aria-label="Edição inline do tópico" onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}}}>
  <div className="rule-edit-heading"><label className="rule-status-label"><span className="sr-only">Estado do conteúdo</span><select aria-label="Estado do conteúdo" className={'status rule-status-select '+status} value={status} onChange={e=>{setStatus(e.target.value as Rule['status']);changed();}}><option value="draft">Rascunho</option><option value="test">Em teste</option><option value="canon">Canônico</option></select></label><span className="rule-edit-badge">{initial.isNew?'NOVO TÓPICO':'EDITANDO TÓPICO'}</span></div>
  <input className="rule-title-input" aria-label="Título do tópico" placeholder="Título do tópico" value={title} maxLength={200} autoFocus onChange={e=>{setTitle(e.target.value);changed();}}/>
  <div className="article-divider"/>
  <div className="rule-editor-toolbar" role="toolbar" aria-label="Formatação do tópico">
   <div className="rule-toolbar-tools"><select aria-label="Estilo do parágrafo" value={viewState?.blockStyle||'text'} onChange={e=>applyStyle(e.target.value)}><option value="text">Texto</option><option value="1">Cabeçalho 1</option><option value="2">Cabeçalho 2</option><option value="3">Cabeçalho 3</option><option value="4">Cabeçalho 4</option><option value="small">Texto pequeno</option></select>
   {tools.slice(0,5).map(({id,label,Icon})=><button type="button" key={id} className="icon-button" aria-label={label} title={label} aria-pressed={!!viewState?.active[id]} disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>run(id)}><Icon size={17}/></button>)}
   <button type="button" className="icon-button" aria-label="Criar link interno" title="Criar link interno" disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={()=>openLink('internal')}><Link2 size={17}/></button>
   <button type="button" className="icon-button rule-more-tools" aria-label="Ferramentas do texto" title="Todas as ferramentas · botão direito" aria-haspopup="menu" aria-expanded={!!menu} disabled={!editor} onMouseDown={e=>e.preventDefault()} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();showMenu(r.left,r.bottom+5);}}><MoreHorizontal size={20}/></button></div>
   <div className="rule-save-actions"><button type="button" className="button secondary" onPointerDown={e=>{if(mobile)e.preventDefault();}} onClick={onCancel}>Cancelar</button><button type="button" className="button primary" disabled={!editor} onPointerDown={e=>{if(mobile)e.preventDefault();}} onClick={save}><Check size={16}/> Salvar</button></div>
  </div>

  {link&&<section ref={linkPanel} className="rule-link-panel" aria-label="Adicionar link"><header><strong>{link.kind==='internal'?<><BookOpen size={17}/> Link neste conjunto</>:<><ExternalLink size={17}/> Link externo</>}</strong><button type="button" className="icon-button" aria-label="Fechar criação de link" onClick={()=>{setLink(null);restore();savedSelection.current=null;}}><X size={18}/></button></header>
   <label>Texto do link<input aria-label="Texto do link" value={link.label} maxLength={50000} placeholder={link.target?.title||'Texto que aparece no conteúdo'} onChange={e=>setLink({...link,label:e.target.value})}/></label>
   {link.kind==='external'?<label>Endereço<input aria-label="Endereço do link" value={link.href} maxLength={2048} placeholder="https://…" autoFocus onChange={e=>setLink({...link,href:e.target.value})}/></label>:<><label className="rule-target-search"><Search size={16}/><input aria-label="Buscar destino do link" value={search} placeholder="Buscar tópico ou subseção…" autoFocus onChange={e=>setSearch(e.target.value)}/></label><div className="rule-link-targets" role="group" aria-label="Destinos deste conjunto">{targets.slice(0,100).map(t=><button type="button" key={JSON.stringify([t.topicId,t.anchorId])} aria-pressed={link.target?.topicId===t.topicId&&(link.target?.anchorId||null)===(t.anchorId||null)} onClick={()=>setLink({...link,target:t})}><span>{t.kind==='heading'?'#':'↳'}</span><span><strong>{t.title}</strong><small>{t.path}</small></span>{link.target?.topicId===t.topicId&&(link.target?.anchorId||null)===(t.anchorId||null)&&<Check size={16}/>}</button>)}{!targets.length&&<p>Nenhum destino encontrado.</p>}</div>{targets.length>100&&<p>Mostrando os primeiros 100 resultados. Refine a busca.</p>}{link.target&&<p className="rule-link-picked">Destino: {link.target.path}</p>}</>}
   {linkError&&<p className="form-error" role="alert">{linkError}</p>}<footer><button type="button" className="button secondary" onClick={()=>{setLink(null);restore();savedSelection.current=null;}}>Cancelar link</button><button type="button" className="button primary" onClick={applyLink}>Aplicar link <Check size={15}/></button></footer>
  </section>}
  {!editor&&<p className="muted">Preparando o editor…</p>}
  <EditorContent className={'rule-inline-writing'+(viewState?.empty?' is-empty-doc':'')} data-rule-placeholder={mobile?'Escreva seu conteúdo aqui… Formate na barra acima do teclado.':'Escreva seu conteúdo aqui… Botão direito para formatar. Cabeçalhos criam subseções com link próprio. Os marcadores aparecem só no trecho em que está o cursor.'} editor={editor} onContextMenu={e=>{if(!editor||usesNativeRuleMenu((e.nativeEvent as globalThis.PointerEvent).pointerType,lastPointer.current,window.matchMedia('(pointer:coarse)').matches))return;e.preventDefault();if(editor.state.selection.empty){const pos=editor.view.posAtCoords({left:e.clientX,top:e.clientY});if(pos)editor.view.dispatch(editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(pos.pos))));}showMenu(e.clientX,e.clientY);}} onClick={e=>{if((e.target as HTMLElement).closest('a'))e.preventDefault();}} onPointerDown={e=>{lastPointer.current=e.pointerType||'mouse';savedSelection.current=null;}}/>
  <div className="rule-editor-count"><span>{dirty?'Alterações ainda não aplicadas ao conjunto':'Edite diretamente no tópico'}</span><span>{(editor?ruleDocumentText(editor.getJSON() as RuleDocument).length:ruleDocumentText(initialDoc.current).length).toLocaleString('pt-BR')} / 50.000</span></div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {mobile&&editor&&<RuleMobileToolbar editor={editor} active={viewState?.active||{}} blockStyle={viewState?.blockStyle||'text'} disabled={disabled} onRun={run} onStyle={applyStyle} onCapture={captureMobileSelection} onRelease={()=>{savedSelection.current=null;}} onHeight={setDockHeight} onViewport={setMobileViewport}/>}
  {menu&&createPortal(<div ref={menuRef} className="rule-context-menu" role="menu" aria-label="Ferramentas de edição" style={{left:menu.x,top:menu.y,maxHeight:menu.height}} onContextMenu={e=>e.preventDefault()} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();setMenu(null);restore();savedSelection.current=null;return;}if(e.key==='Tab'){setMenu(null);savedSelection.current=null;return;}if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const buttons=[...e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')],index=buttons.indexOf(document.activeElement as HTMLButtonElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(['ArrowDown','ArrowRight'].includes(e.key)?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}}}><div className="rule-menu-heading">TEXTO E FORMATAÇÃO</div><div className="rule-menu-grid">{tools.map(({id,label,Icon,...rest},i)=><button type="button" role="menuitem" tabIndex={i===0?0:-1} key={id} disabled={disabled(id)} onClick={()=>run(id)}><Icon size={17}/><span>{label}</span>{'key' in rest&&<kbd>{rest.key}</kbd>}</button>)}</div></div>,document.body)}
 </section>;
}
