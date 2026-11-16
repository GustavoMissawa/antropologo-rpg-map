import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getSchema,inputRulesPlugin} from '@tiptap/core';
import {EditorState,TextSelection} from '@tiptap/pm/state';
import {history,undo,redo,closeHistory} from '@tiptap/pm/history';
import {DOMSerializer} from '@tiptap/pm/model';
import {ruleEditorExtensions,ruleBlockInputRules,enterRuleBlock,revealRuleBlockMarker,setRuleBlockStyle,activeFormattingRanges,headingAnchorPlugin,cursorSyntaxPlugin} from '../app/rule-editor-extensions.ts';
import {documentFromText,ruleDocumentText,ruleDocumentHeadings,validRuleDocument} from '../lib/rule-document.ts';
import {parseRulebook,serializeRulebook} from '../lib/model.ts';
import {embedSuperPng,extractSuperPng} from '../lib/super-png.ts';

const schema=getSchema(ruleEditorExtensions());
const shortcuts=['#','##','###','####','-#'];
const text=(text,marks)=>({type:'text',text,...(marks?{marks}:{})});
const paragraph=(value='',attrs)=>({type:'paragraph',...(attrs?{attrs}:{}),...(value?{content:[text(value)]}:{})});
const rich=(...content)=>({type:'doc',content});
function createEditor(content=rich(paragraph()),pos=1){
 let state,plugin;const view={composing:false,get state(){return state;},dispatch(tr){state=state.applyTransaction(tr).state;}};
 // Exercise the actual Tiptap typing plugin and transactions, without a DOM shim.
 const editor={view,extensionManager:{commands:{}}};
 plugin=inputRulesPlugin({editor,rules:ruleBlockInputRules(schema)});
 const doc=schema.nodeFromJSON(content);
 state=EditorState.create({schema,doc,selection:TextSelection.create(doc,pos),plugins:[plugin,headingAnchorPlugin(),cursorSyntaxPlugin(),history()]});
 return {view,get state(){return state;},input(value){for(const char of value){const {from,to}=state.selection;if(!plugin.props.handleTextInput(view,from,to,char))view.dispatch(state.tr.insertText(char));}},at(from,to=from){view.dispatch(state.tr.setSelection(TextSelection.create(state.doc,from,to)));},run(command){return command(state,tr=>view.dispatch(tr));},compositionEnd(){return plugin.props.handleDOMEvents.compositionend(view);}};
}
function checkStyle(node,marker){if(marker==='-#'){assert.equal(node.type.name,'paragraph');assert.equal(node.attrs.ruleSize,'small');}else{assert.equal(node.type.name,'heading');assert.equal(node.attrs.level,marker.length);assert.match(node.attrs.id,/^sec-/);}}

for(const marker of shortcuts)test(`${marker}: só o espaço ativa, o cursor continua no texto e Enter cria parágrafo normal`,()=>{
 const e=createEditor();e.input(marker);assert.equal(e.state.doc.firstChild.type.name,'paragraph');assert.equal(e.state.doc.textContent,marker);
 e.input(' ');checkStyle(e.state.doc.firstChild,marker);assert.equal(e.state.selection.from,1);assert.equal(e.state.doc.textContent,'');
 e.input('Introdução');assert.equal(e.state.doc.textContent,'Introdução');assert.equal(e.state.selection.from,11);assert(validRuleDocument(e.state.doc.toJSON()));
 const before=JSON.stringify(e.state.doc.toJSON());assert(e.run(enterRuleBlock));checkStyle(e.state.doc.firstChild,marker);assert.equal(e.state.doc.lastChild.type.name,'paragraph');assert.equal(e.state.doc.lastChild.attrs.ruleSize,null);
 e.input('Texto normal');assert.equal(e.state.doc.lastChild.textContent,'Texto normal');assert.equal(e.state.doc.lastChild.attrs.ruleSize,null);assert.equal(JSON.stringify(e.state.doc.firstChild.toJSON()),JSON.stringify(JSON.parse(before).content[0]));
});

test('Marcadores no meio da frase, com espaço antes, sem espaço final ou fora dos quatro níveis ficam literais',()=>{
 for(const value of ['x # ','x -# ',' # ',' -# ','##### ','-## ','#\t','##\n','-#\u00a0','##x ','-#x ']){const e=createEditor();e.input(value);assert.equal(e.state.doc.firstChild.type.name,'paragraph',value);assert.equal(e.state.doc.firstChild.attrs.ruleSize,null,value);assert.equal(e.state.doc.textContent,value);}
 const e=createEditor(rich({type:'codeBlock',content:[text('')].filter(n=>n.text)}));e.input('# ');assert.equal(e.state.doc.firstChild.type.name,'codeBlock');assert.equal(e.state.doc.textContent,'# ');
});

test('Enter no meio ou sobre uma seleção preserva as duas metades e as marcas inline',()=>{
 for(const marker of shortcuts)for(const selected of [false,true]){const e=createEditor();e.input(marker+' ');e.view.dispatch(e.state.tr.insertText('AlfaBeta'));e.view.dispatch(e.state.tr.addMark(1,9,schema.marks.bold.create()));e.at(5,selected?7:5);assert(e.run(enterRuleBlock));assert.equal(e.state.doc.firstChild.textContent,'Alfa');assert.equal(e.state.doc.lastChild.textContent,selected?'ta':'Beta');assert.equal(e.state.doc.lastChild.type.name,'paragraph');assert.equal(e.state.doc.lastChild.attrs.ruleSize,null);assert.equal(e.state.doc.lastChild.firstChild.marks[0].type.name,'bold');assert.equal(e.state.selection.$from.parentOffset,0);assert(validRuleDocument(e.state.doc.toJSON()));}
});

test('Enter num bloco vazio remove o estilo; no início preserva o conteúdo e a âncora do título',()=>{
 for(const marker of shortcuts){const empty=createEditor();empty.input(marker+' ');assert(empty.run(enterRuleBlock));assert.equal(empty.state.doc.childCount,1);assert.equal(empty.state.doc.firstChild.type.name,'paragraph');assert.equal(empty.state.doc.firstChild.attrs.ruleSize,null);
 const e=createEditor();e.input(marker+' Alfa');const id=e.state.doc.firstChild.attrs.id;e.at(1);assert(e.run(enterRuleBlock));assert.equal(e.state.doc.firstChild.type.name,'paragraph');assert.equal(e.state.doc.firstChild.attrs.ruleSize,null);checkStyle(e.state.doc.lastChild,marker);assert.equal(e.state.doc.lastChild.textContent,'Alfa');assert.equal(e.state.doc.lastChild.attrs.id,id);}
});

test('Live Preview acompanha o caret e não grava, seleciona ou duplica os marcadores',()=>{
 for(const marker of shortcuts){const e=createEditor();e.input(marker+' Alfa');e.run(enterRuleBlock);e.input('Normal');const before=JSON.stringify(e.state.doc.toJSON()),pos=e.state.selection.from;assert.deepEqual(activeFormattingRanges(e.state),[]);e.at(3);const active=activeFormattingRanges(e.state);assert.equal(active.find(r=>r.type===(marker==='-#'?'small':'heading')).open,marker+' ');const decorations=e.state.plugins[2].props.decorations(e.state).find();assert.equal(decorations.length,1);e.at(pos);assert.deepEqual(activeFormattingRanges(e.state),[]);assert.equal(JSON.stringify(e.state.doc.toJSON()),before);assert.equal(e.state.selection.from,pos);}
});

test('Backspace no começo revela sintaxe editável e permite trocar o marcador sem perder o texto',()=>{
 for(const marker of shortcuts){const e=createEditor();e.input(marker+' Alfa');e.at(1);assert(e.run(revealRuleBlockMarker));assert.equal(e.state.doc.firstChild.type.name,'paragraph');assert.equal(e.state.doc.firstChild.attrs.ruleSize,null);assert.equal(e.state.doc.textContent,marker+' Alfa');assert.equal(e.state.selection.from,marker.length+2);
 e.at(1,marker.length+2);e.input('-# ');assert.equal(e.state.doc.firstChild.attrs.ruleSize,'small');assert.equal(e.state.doc.textContent,'Alfa');}
});

test('Controles visuais e atalhos produzem o mesmo estilo; trocar níveis mantém links e âncoras',()=>{
 for(const marker of shortcuts){const a=createEditor();a.input(marker+' Alfa');const b=createEditor(rich(paragraph('Alfa')));assert(b.run(setRuleBlockStyle(marker==='-#'?'small':String(marker.length))));checkStyle(b.state.doc.firstChild,marker);assert.equal(b.state.doc.textContent,a.state.doc.textContent);}
 const e=createEditor(rich({type:'heading',attrs:{level:2,id:'sec-original'},content:[text('Alfa')]},{type:'heading',attrs:{level:3,id:'sec-other'},content:[text('Beta')]}));e.at(1,e.state.doc.content.size-1);e.run(setRuleBlockStyle('1'));assert.deepEqual(ruleDocumentHeadings(e.state.doc.toJSON()).map(h=>[h.level,h.id]),[[1,'sec-original'],[1,'sec-other']]);
 e.at(1);e.input('#### ');assert.equal(e.state.doc.firstChild.attrs.level,4);assert.equal(e.state.doc.firstChild.attrs.id,'sec-original');assert.equal(e.state.doc.firstChild.textContent,'Alfa');
});

test('Texto pequeno em listas continua parágrafo, nunca vira lista pelo prefixo -#',()=>{
 const e=createEditor(rich({type:'bulletList',content:[{type:'listItem',content:[paragraph()]}]}),3);e.input('-# Nota');assert.equal(e.state.doc.firstChild.type.name,'bulletList');assert.equal(e.state.doc.firstChild.firstChild.firstChild.type.name,'paragraph');assert.equal(e.state.doc.firstChild.firstChild.firstChild.attrs.ruleSize,'small');assert.equal(e.run(enterRuleBlock),false);assert(validRuleDocument(e.state.doc.toJSON()));
});

test('Uma seleção começa no fim do bloco anterior ou termina no início do seguinte sem formatar os vizinhos',()=>{
 for(const range of [[7,15],[9,17],[7,17]]){const e=createEditor(rich(paragraph('Before'),{type:'heading',attrs:{level:2,id:'sec-target'},content:[text('Target')]},paragraph('After')));e.at(...range);e.run(setRuleBlockStyle('4'));assert.equal(e.state.doc.firstChild.type.name,'paragraph');assert.equal(e.state.doc.child(1).attrs.level,4);assert.equal(e.state.doc.child(1).attrs.id,'sec-target');assert.equal(e.state.doc.lastChild.type.name,'paragraph');assert.equal(e.state.doc.textContent,'BeforeTargetAfter');}
});

test('Desfazer/refazer recupera sintaxe literal, formato e divisões sem corromper conteúdo',()=>{
 for(const marker of shortcuts){const e=createEditor();e.input(marker+' ');checkStyle(e.state.doc.firstChild,marker);assert(e.run(undo));assert.equal(e.state.doc.firstChild.type.name,'paragraph');assert.equal(e.state.doc.textContent,marker+' ');assert(e.run(redo));checkStyle(e.state.doc.firstChild,marker);
 e.input('AlfaBeta');e.view.dispatch(closeHistory(e.state.tr));e.at(5);e.run(enterRuleBlock);assert(e.run(undo));assert.equal(e.state.doc.firstChild.textContent,'AlfaBeta');assert(e.run(redo));assert.equal(e.state.doc.childCount,2);assert.equal(ruleDocumentText(e.state.doc.toJSON()),'Alfa\n\nBeta');}
});

test('Composição de teclado virtual fica nativa; a conversão ocorre ao finalizar sem caractere duplicado',async()=>{
 for(const marker of shortcuts){const e=createEditor();e.view.composing=true;e.input(marker+' ');assert.equal(e.state.doc.firstChild.type.name,'paragraph');e.view.composing=false;e.compositionEnd();await new Promise(resolve=>setTimeout(resolve,5));checkStyle(e.state.doc.firstChild,marker);assert.equal(e.state.doc.textContent,'');assert.equal(e.state.selection.from,1);}
});

test('JSON e Super PNG reabrem H1, texto pequeno e marcas sem incluir notas no índice',()=>{
 const e=createEditor();e.input('# Introdução');e.run(enterRuleBlock);e.input('-# Nota');e.run(enterRuleBlock);e.input('Texto normal');const doc=JSON.parse(JSON.stringify(e.state.doc.toJSON()));assert.equal(ruleDocumentHeadings(doc).length,1);
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/ruleset-rich-v1.regras',import.meta.url),'utf8'));fixture.chapters[0].document=doc;fixture.chapters[0].content=ruleDocumentText(doc);
 const json=serializeRulebook(fixture),loaded=parseRulebook(JSON.parse(json));assert.deepEqual(loaded.chapters[0].document,doc);
 const png=readFileSync(new URL('./fixtures/system-logo.png',import.meta.url)),embedded=embedSuperPng(png,'ruleset',fixture.name,JSON.parse(json)),again=parseRulebook(extractSuperPng(embedded).payload);assert.deepEqual(again.chapters[0].document,doc);assert.equal(ruleDocumentHeadings(again.chapters[0].document).length,1);
 assert.equal(DOMSerializer.fromSchema(schema).nodes.paragraph(e.state.doc.child(1))[1]['data-rule-size'],'small');assert.equal(DOMSerializer.fromSchema(schema).nodes.heading(e.state.doc.firstChild)[0],'h1');
});

test('Documentos antigos são literais; capítulo longo mantém texto e seleção ao trocar um único bloco',()=>{
 const literal='# Antigo\n\n-# Literal';assert.equal(ruleDocumentText(documentFromText(literal)),literal);
 const content=Array.from({length:400},(_,i)=>paragraph('Parágrafo '+i+' '+('texto '.repeat(10)))),e=createEditor(rich(...content));const lastPos=e.state.doc.content.size-2,before=e.state.doc.textContent;e.at(lastPos);e.run(setRuleBlockStyle('small'));assert.equal(e.state.doc.textContent,before);assert.equal(e.state.selection.from,lastPos);assert.equal(e.state.doc.firstChild.attrs.ruleSize,null);assert.equal(e.state.doc.lastChild.attrs.ruleSize,'small');assert(validRuleDocument(e.state.doc.toJSON()));
 assert(!validRuleDocument(rich(paragraph('Nota',{ruleSize:'large'}))));
});
