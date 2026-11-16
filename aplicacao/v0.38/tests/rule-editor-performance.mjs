import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {mountedRuleEditor,documentOf,paragraph} from './helpers/rule-editor-dom.mjs';
import {validRuleDocument,ruleDocumentText,MAX_RULE_DOCUMENT_BYTES} from '../lib/rule-document.ts';
import {readFileSync} from 'node:fs';
import {parseRulebook,serializeRulebook} from '../lib/model.ts';

const corpus=['ação','texto','dados','regra','teste','símbolo'];
function makeDocument(words){const blocks=[];let total=0,index=0;while(total<words){const n=Math.min(50,words-total),value=Array.from({length:n},(_,i)=>corpus[(total+i)%corpus.length]).join(' ');let block=paragraph(value,index%7===0?{ruleSize:'small'}:undefined);if(index%6===0)block={...block,type:'heading',attrs:{level:1+index%4,id:'sec-benchmark-'+index}};if(index%9===0)block.content[0].marks=[{type:'bold'},{type:'italic'}];else if(index%11===0)block.content[0].marks=[{type:'ruleLink',attrs:{kind:'external',href:'https://example.com/manual',topicId:null,anchorId:null}}];else if(index%5===0&&block.type==='paragraph')block={type:'bulletList',content:[{type:'listItem',content:[block]}]};blocks.push(block);total+=n;index++;}return documentOf(...blocks);}
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];
const out=[];
// Warm library caches before recording the five progressive cases.
mountedRuleEditor().close();
for(const words of [500,2000,5000,10000,20000]){
 const before=process.memoryUsage(),start=performance.now(),h=mountedRuleEditor(makeDocument(words)),mountMs=performance.now()-start,e=h.editor;
 const samples=[],selection=[],serialization=[],lengthBefore=ruleDocumentText(e.getJSON()).length;
 for(let i=0;i<50;i++){h.at(2);let at=performance.now();h.type('x');samples.push(performance.now()-at);at=performance.now();h.at(e.state.doc.content.size-2);selection.push(performance.now()-at);at=performance.now();ruleDocumentText(e.getJSON());serialization.push(performance.now()-at);}
 assert.equal(ruleDocumentText(e.getJSON()).length,lengthBefore+50);
 const doc=JSON.parse(JSON.stringify(e.getJSON())),valid=validRuleDocument(doc),fixture=JSON.parse(readFileSync(new URL('./fixtures/ruleset-rich-v1.regras',import.meta.url),'utf8'));fixture.chapters[0].document=doc;fixture.chapters[0].content=ruleDocumentText(doc);
 let save='rejected-by-existing-limit',saveMs=0,reopenMs=0;
 if(valid){let at=performance.now();const encoded=serializeRulebook(fixture);saveMs=performance.now()-at;at=performance.now();const loaded=parseRulebook(JSON.parse(encoded));reopenMs=performance.now()-at;assert.deepEqual(loaded.chapters[0].document,doc);save='round-trip-passed';}else assert.throws(()=>serializeRulebook(fixture));
 const after=process.memoryUsage();out.push({words,characters:ruleDocumentText(doc).length,jsonBytes:Buffer.byteLength(JSON.stringify(doc)),save,mountMs,typingP50Ms:percentile(samples,.5),typingP95Ms:percentile(samples,.95),selectionP95Ms:percentile(selection,.95),countP95Ms:percentile(serialization,.95),saveMs,reopenMs,heapDeltaMiB:(after.heapUsed-before.heapUsed)/1048576,rssMiB:after.rss/1048576});h.close();
}
console.log(JSON.stringify({environment:'Node '+process.version+' + jsdom 26.1.0; no native layout, mobile keyboard or browser memory measurements',limits:{characters:50000,documentBytes:MAX_RULE_DOCUMENT_BYTES},samplesPerCase:50,results:out},null,2));
