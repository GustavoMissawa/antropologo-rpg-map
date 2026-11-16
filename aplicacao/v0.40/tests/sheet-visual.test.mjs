import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeSheet,makeBlock,parseSheet,copyBlock,positionLayout,setPositionMode,makeRulebook,withRulebookSheetTemplate,characterFromRulebook,serializeRulebook,parseRulebook} from '../lib/model.ts';
import {validSheetImage,MAX_SHEET_IMAGE_BYTES} from '../lib/sheet-visual.ts';
import {createFieldResolver,resolveRollVariables} from '../lib/sheet-engine.ts';
import {compileDice,rollDice} from '../lib/dice.ts';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJx8AAAAASUVORK5CYII=';
function fixture(){
 const s=makeSheet('Astra','Guss'),b=makeBlock('attributes'),image=makeBlock('image');
 b.columns=3;b.color='#8d66bb';b.layout.width=600;
 b.fields=[{id:'dex',label:'Destreza',type:'composite',value:16,composite:{mode:'ability',modifier:0},columnSpan:1},{id:'skill',label:'Furtividade',type:'calculated',value:'',columnSpan:2,dependency:{sourceId:'dex',part:'modifier',offset:2},roll:{formula:'1d20 + @valor',variables:[]}}];
 image.image={src:png,fit:'contain'};image.layout={x:720,y:72,width:480,height:432};image.color='#397fc4';
 s.blocks=[b,image];s.rolls=[{id:'r',name:'Teste',formula:'1d20 + @skill',variables:[{name:'skill',fieldId:'skill',part:'value'}]}];return s;
}
test('v7 salva cores, colunas, larguras e imagem sem perder dependências, fórmulas e proporções',()=>{
 const s=fixture(),before=JSON.stringify(s),l=parseSheet(JSON.parse(before));
 assert.equal(l.version,13);assert.equal(l.blocks[0].color,'#8d66bb');assert.equal(l.blocks[0].columns,3);assert.deepEqual(l.blocks[0].fields.map(f=>f.columnSpan),[1,2]);
 assert.equal(l.blocks[1].kind,'image');assert.deepEqual(l.blocks[1].image,s.blocks[1].image);assert.deepEqual(l.blocks[1].layout,s.blocks[1].layout);
 assert.equal(l.blocks[0].fields[1].dependency.sourceId,l.blocks[0].fields[0].id);assert.equal(createFieldResolver(l)(l.blocks[0].fields[1].id).value,5);
 const r=l.rolls[0],values=resolveRollVariables(l,compileDice(r.formula).variables,r.variables);assert.equal(rollDice(r.formula,values,()=>10).total,15);
 assert.deepEqual(parseSheet(JSON.parse(JSON.stringify(l))).blocks[1].image,l.blocks[1].image);assert.equal(JSON.stringify(s),before);
});
test('v1 a v6 conservam todos os campos, sem exigir metadados visuais novos',()=>{
 for(const version of [1,2,3,4,5,6]){
  const s=makeSheet('Legado','');s.version=version;s.blocks=[makeBlock('notes')];s.blocks[0].fields[0].value='História anterior';
  const l=parseSheet(s);assert.equal(l.version,13);assert.equal(l.blocks[0].fields[0].value,'História anterior');
  assert.equal(l.blocks[0].color,undefined);assert.equal(l.blocks[0].columns,undefined);assert.equal(l.blocks[0].image,undefined);
 }
});
test('Duplicar bloco conserva estilo e remapeia campos; imagem e dimensões ficam independentes',()=>{
 const s=fixture(),b=s.blocks[0],c=copyBlock(b);assert.equal(c.color,b.color);assert.equal(c.columns,3);assert.equal(c.fields[1].columnSpan,2);assert.equal(c.fields[1].dependency.sourceId,c.fields[0].id);
 const i=copyBlock(s.blocks[1]);assert.equal(i.layout.height,432);assert.deepEqual(i.image,s.blocks[1].image);i.image.fit='cover';i.layout.height=600;assert.equal(s.blocks[1].image.fit,'contain');assert.equal(s.blocks[1].layout.height,432);
});
test('Pacote de sistema leva imagens e layout, mantendo personagens independentes do modelo',()=>{
 const b=withRulebookSheetTemplate(makeRulebook('Sistema'),fixture()),loaded=parseRulebook(JSON.parse(serializeRulebook(b))),c=characterFromRulebook(loaded,'Personagem');
 assert.equal(c.blocks[0].columns,3);assert.equal(c.blocks[0].color,'#8d66bb');assert.equal(c.blocks[1].image.src,png);
 c.blocks[0].color='#b8605b';c.blocks[0].fields[1].columnSpan=1;c.blocks[1].image.fit='cover';
 assert.equal(loaded.sheetTemplate.blocks[0].color,'#8d66bb');assert.equal(loaded.sheetTemplate.blocks[0].fields[1].columnSpan,2);assert.equal(loaded.sheetTemplate.blocks[1].image.fit,'contain');
});
test('Importação recusa metadados inválidos e imagens ativas ou remotas sem modificar a entrada',()=>{
 const base=fixture(),before=JSON.stringify(base);
 const mutations=[b=>b.color='url(javascript:alert(1))',b=>b.color='#abc',b=>b.columns=5,b=>b.columns=1.5,b=>b.fields[0].columnSpan=0,b=>b.fields[0].columnSpan=5,b=>b.layout.height=Infinity,b=>b.layout.height=119];
 for(const change of mutations){const next=structuredClone(base);change(next.blocks[0]);assert.throws(()=>parseSheet(next));}
 for(const src of ['https://example.com/image.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,YmFk','javascript:alert(1)']){const next=structuredClone(base);next.blocks[1].image.src=src;assert.throws(()=>parseSheet(next));}
 for(const image of [null,{}, {src:png,fit:'stretch'}]){const next=structuredClone(base);next.blocks[1].image=image;assert.throws(()=>parseSheet(next));}
 const wrong=structuredClone(base);wrong.blocks[0].image={src:png,fit:'contain'};assert.throws(()=>parseSheet(wrong));assert.equal(JSON.stringify(base),before);
});
test('Validação de imagem limita o tamanho e reconhece assinaturas PNG/JPEG/WebP',()=>{
 assert.equal(validSheetImage(png),true);
 assert.equal(validSheetImage('data:image/jpeg;base64,'+Buffer.from([255,216,255,0]).toString('base64')),true);
 assert.equal(validSheetImage('data:image/webp;base64,'+Buffer.from('RIFF0000WEBP').toString('base64')),true);
 assert.equal(validSheetImage('data:image/jpeg;base64,'+Buffer.from('not a jpeg').toString('base64')),false);
 const bytes=Buffer.alloc(MAX_SHEET_IMAGE_BYTES+1);Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);assert.equal(validSheetImage('data:image/png;base64,'+bytes.toString('base64')),false);
});
test('Grade e limites preservam altura de imagens e não adicionam altura aos blocos antigos',()=>{
 assert.deepEqual(positionLayout({x:59,y:85,width:368,height:271},'grid'),{x:48,y:96,width:360,height:264});
 assert.equal(positionLayout({x:0,y:0,width:368,height:2000},'free').height,1200);
 const s=fixture(),g=setPositionMode(s,'grid');assert.equal(g.blocks[1].layout.height,432);assert.equal(g.blocks[0].layout.height,undefined);assert.equal(g.blocks[1].image.src,png);
});
