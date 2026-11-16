import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getSchema} from '@tiptap/core';
import {EditorState,TextSelection} from '@tiptap/pm/state';
import {ruleEditorExtensions,activeFormattingRanges,headingAnchorPlugin} from '../app/rule-editor-extensions.ts';
import {documentFromText,getRuleDocument,ruleDocumentText,ruleDocumentHeadings,ruleLinkTargets,validRuleDocument,validRuleLink,safeRuleURL,ruleAnchorId} from '../lib/rule-document.ts';
import {parseRulebook,serializeRulebook,findRule,makeAB10Rulebook,updateCustomRulebook} from '../lib/model.ts';
const fixture=()=>JSON.parse(readFileSync(new URL('./fixtures/ruleset-rich-v1.regras',import.meta.url),'utf8'));
const schema=getSchema(ruleEditorExtensions());
const text=(text,marks)=>({type:'text',text,...(marks?{marks}:{} )});
const para=(...content)=>({type:'paragraph',...(content.length?{content}:{})});
const doc=(...content)=>({type:'doc',content});

test('Textos antigos conservam literalmente linhas, símbolos, espaços e texto semelhante a HTML',()=>{
 for(const source of ['', 'Primeiro parágrafo.\n\nSegundo\ncom quebra.', '**literal** e [[literal]]', '<script>alert(1)</script>\n\n  Espaços e acentuação: ação.\n']){const rich=documentFromText(source);assert(validRuleDocument(rich));assert.equal(ruleDocumentText(rich),source);}
 const old=JSON.parse(readFileSync(new URL('./fixtures/ruleset-v1.regras',import.meta.url),'utf8'));const imported=parseRulebook(old);assert.equal(imported.chapters[0].content,old.chapters[0].content);assert.equal(imported.chapters[0].document,undefined);
});
test('O esquema do editor aceita todas as formatações e seus atributos padrão são portáveis',()=>{
 const rich=doc(para(text('Formatado',['bold','italic','underline','strike','highlight'].map(type=>({type}))),text(' código',[{type:'code'}]),text(' site',[{type:'ruleLink',attrs:{kind:'external',href:'https://example.com',topicId:null,anchorId:null}}])),{type:'heading',attrs:{level:2,id:'sec-a'},content:[text('Uma subseção')]},{type:'orderedList',content:[{type:'listItem',content:[para(text('Primeiro item'))]}]},{type:'bulletList',content:[{type:'listItem',content:[para(text('Um item'))]}]},{type:'blockquote',content:[para(text('Citação'))]},{type:'codeBlock',content:[text('a + b\nlinha 2')]},{type:'horizontalRule'});
 const parsed=schema.nodeFromJSON(rich);assert(validRuleDocument(parsed.toJSON()));assert.equal(parsed.textContent.includes('Citação'),true);assert.equal(parsed.toJSON().content[2].attrs.start,1);
});
test('Salvar/carregar preserva a formatação, remapeia links entre tópicos e mantém âncoras',()=>{
 const source=fixture(),before=JSON.stringify(source),loaded=parseRulebook(JSON.parse(serializeRulebook(source))),main=loaded.chapters[0],child=main.children[0],link=main.document.content[0].content.find(n=>n.marks?.some(m=>m.type==='ruleLink')).marks.find(m=>m.type==='ruleLink');
 assert.notEqual(main.id,'test-topic');assert.notEqual(child.id,'details-topic');assert.equal(link.attrs.topicId,child.id);assert.equal(link.attrs.anchorId,'sec-special');assert.equal(ruleDocumentHeadings(child.document)[1].id,'sec-special');assert.equal(main.content,ruleDocumentText(main.document));assert.equal(JSON.stringify(source),before);
 const twice=parseRulebook(JSON.parse(serializeRulebook(loaded)));assert.notEqual(twice.chapters[0].children[0].id,child.id);assert.equal(twice.chapters[0].document.content[0].content.find(n=>n.marks?.some(m=>m.type==='ruleLink')).marks.find(m=>m.type==='ruleLink').attrs.topicId,twice.chapters[0].children[0].id);
});
test('Links internos para o próprio tópico e referências removidas continuam distintos',()=>{
 const source=fixture();source.chapters[0].document.content.push(para(text('Mesmo tópico',[{type:'ruleLink',attrs:{kind:'internal',topicId:'test-topic',anchorId:'sec-local',href:null}}]),text('Removido',[{type:'ruleLink',attrs:{kind:'internal',topicId:'deleted-topic',anchorId:null,href:null}}])));
 const loaded=parseRulebook(source),last=loaded.chapters[0].document.content.at(-1).content;assert.equal(last[0].marks[0].attrs.topicId,loaded.chapters[0].id);assert.equal(last[1].marks[0].attrs.topicId,'deleted-topic');assert(serializeRulebook(loaded));
});
test('Busca de destinos inclui os tópicos da árvore e as subseções do conteúdo, sem outro sistema',()=>{
 const own=parseRulebook(fixture()),targets=ruleLinkTargets(own.chapters);assert(targets.some(t=>t.title==='Aplicação detalhada'&&t.kind==='heading'&&t.path.includes('Teste › Informações detalhadas de teste')));assert(targets.some(t=>t.title==='Capítulo vazio'&&t.kind==='topic'));assert(!targets.some(t=>t.title==='Bem-vindo ao AB10'));
 const newTargets=ruleLinkTargets(own.chapters,{id:'new',title:'Em criação',document:doc({type:'heading',attrs:{level:2,id:'sec-new'},content:[text('Nova seção')]})});assert(newTargets.some(t=>t.topicId==='new'&&t.anchorId==='sec-new'));
});
test('Editar o nome de uma subseção conserva o identificador de destino',()=>{
 const source=fixture(),topic=source.chapters[0].children[0],before=ruleAnchorId(topic.id,'sec-special');topic.document.content.find(n=>n.attrs?.id==='sec-special').content=[text('Título alterado')];assert.equal(ruleDocumentHeadings(topic.document).find(h=>h.id==='sec-special').title,'Título alterado');assert.equal(ruleAnchorId(topic.id,'sec-special'),before);
});
test('Cancelar pode descartar uma cópia de edição sem modificar o tópico original',()=>{
 const source=fixture().chapters[0],before=JSON.stringify(source),draft=getRuleDocument(source);draft.content[0].content[0].text='Outro texto';assert.equal(JSON.stringify(source),before);assert.notEqual(ruleDocumentText(draft),source.content);
});
test('O AB10 fixo não ganha permissões de edição pelo novo documento',()=>{
 const fixed=makeAB10Rulebook(),before=JSON.stringify(fixed);assert.equal(updateCustomRulebook([fixed],{...fixed,chapters:fixture().chapters})[0],fixed);assert.equal(JSON.stringify(fixed),before);
});
test('Conteúdo rico recusa HTML ativo, atributos arbitrários, protocolos perigosos e estrutura inválida',()=>{
 const bad=[doc({type:'script',content:[text('alert(1)')]}),doc({...para(text('x')),attrs:{onclick:'alert(1)'}}),doc(para(text('x',[{type:'bold',attrs:{style:'color:red'}}]))),doc(para(text('x',[{type:'ruleLink',attrs:{kind:'external',href:'javascript:alert(1)'}}]))),doc(para(text('x',[{type:'ruleLink',attrs:{kind:'external',href:'data:text/html,evil'}}]))),doc({type:'heading',attrs:{level:2,id:'dup'},content:[text('A')]},{type:'heading',attrs:{level:3,id:'dup'},content:[text('B')]}),doc({type:'heading',attrs:{level:5,id:'sec'},content:[text('A')]}),doc({type:'bulletList',content:[para(text('Fora de item'))]}),doc({type:'listItem',content:[para(text('Item fora da lista'))]}),doc(para(text('a'.repeat(50001)))),doc(para(text('x',[{type:'bold'},{type:'bold'}])))];
 for(const rich of bad){assert.equal(validRuleDocument(rich),false);const source=fixture();source.chapters[0].document=rich;assert.throws(()=>parseRulebook(source));}
 const cyclic=doc(para());cyclic.content[0].content=[cyclic];assert.equal(validRuleDocument(cyclic),false);
});
test('Links externos aceitam apenas endereços explícitos e links internos não recebem URLs',()=>{
 for(const url of ['https://example.com','http://example.com/path','mailto:mesa@example.com'])assert(safeRuleURL(url));for(const url of ['//example.com','javascript:alert(1)','data:text/html,x','https://example.com\n/x'])assert.equal(safeRuleURL(url),null);assert.equal(validRuleLink({kind:'internal',topicId:'x',href:'https://example.com'}),false);assert.equal(validRuleLink({kind:'internal',topicId:'x',anchorId:'sec-ok',href:null}),true);
});
test('O limite de tamanho também considera a estrutura de formatação, não só o texto',()=>{const manyMarks=doc(para(...Array.from({length:6000},()=>text('x',[{type:'bold'}]))));assert.equal(ruleDocumentText(manyMarks).length,6000);assert.equal(validRuleDocument(manyMarks),false);});
test('Marcadores dependem do cursor real, aparecem apenas no trecho ativo e somem em outro parágrafo',()=>{
 const content=doc(para(text('Texto '),text('Teste',[{type:'bold'}]),text(' e '),text('outro',[{type:'italic'}])),para(text('Sem formatação'))),pm=schema.nodeFromJSON(content),stateAt=pos=>EditorState.create({schema,doc:pm,selection:TextSelection.create(pm,pos)});
 const bold=activeFormattingRanges(stateAt(9));assert.equal(bold.length,1);assert.equal(bold[0].type,'bold');assert.equal(bold[0].open,'**');assert.equal(bold[0].from,7);assert.equal(bold[0].to,12);
 assert.equal(activeFormattingRanges(stateAt(3)).length,0);assert.equal(activeFormattingRanges(stateAt(pm.content.size-3)).length,0);
 const selected=EditorState.create({schema,doc:pm,selection:TextSelection.create(pm,7,12)});assert.equal(activeFormattingRanges(selected).length,0);assert.equal(pm.textContent,'Texto Teste e outroSem formatação');
});
test('Marcas sobrepostas e blocos ativos mostram suas próprias pistas sem transformar o documento',()=>{
 const pm=schema.nodeFromJSON(doc(para(text('Um '),text('trecho',[{type:'bold'},{type:'italic'}]),text(' normal')),{type:'codeBlock',content:[text('x + y')]})),before=JSON.stringify(pm.toJSON()),at=pos=>EditorState.create({schema,doc:pm,selection:TextSelection.create(pm,pos)});
 assert.deepEqual(activeFormattingRanges(at(7)).map(r=>r.type).sort(),['bold','italic']);const position=pm.content.size-3;assert.equal(activeFormattingRanges(at(position))[0].type,'codeBlock');assert.equal(JSON.stringify(pm.toJSON()),before);
});
test('Cabeçalhos novos ganham âncoras únicas; editar texto e colar um identificador duplicado não quebra o original',()=>{
 let state=EditorState.create({schema,doc:schema.nodeFromJSON(doc(para(text('Texto')))),plugins:[headingAnchorPlugin()]});
 state=state.applyTransaction(state.tr.setNodeMarkup(0,schema.nodes.heading,{level:2,id:null})).state;const id=state.doc.firstChild.attrs.id;assert(id.startsWith('sec-'));
 state=state.applyTransaction(state.tr.insertText(' novo',state.doc.content.size-1)).state;assert.equal(state.doc.firstChild.attrs.id,id);
 const duplicate=schema.nodes.heading.create({level:2,id},schema.text('Copiado'));state=state.applyTransaction(state.tr.insert(state.doc.content.size,duplicate)).state;assert.equal(state.doc.firstChild.attrs.id,id);assert.notEqual(state.doc.lastChild.attrs.id,id);assert(validRuleDocument(state.doc.toJSON()));
});
