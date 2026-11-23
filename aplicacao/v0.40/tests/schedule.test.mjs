import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays,parseProfile,parseSession,occursOn,occurrencesBetween,sessionTime,validDate,todayKey,upcomingOccurrences,indexOccurrencesByDate } from '../lib/schedule.ts';
const base={title:'Mesa de teste',kind:'recurring',date:'2026-10-23',startTime:'22:00',duration:240,frequency:'weekly',until:null,location:'Discord',description:''};
test('One-shot acontece uma única vez, sem herdar recorrência',()=>{
 const s=parseSession({...base,kind:'one-shot'});assert.equal(s.frequency,null);assert.equal(s.until,null);assert.equal(occursOn(s,'2026-10-23'),true);assert.equal(occursOn(s,'2026-10-30'),false);
});
test('Séries semanais e quinzenais respeitam início e fim inclusivo',()=>{
 const s=parseSession({...base,until:'2026-11-06'});assert.equal(occursOn(s,'2026-10-16'),false);assert.equal(occursOn(s,'2026-10-30'),true);assert.equal(occursOn(s,'2026-11-06'),true);assert.equal(occursOn(s,'2026-11-13'),false);
 const q=parseSession({...base,frequency:'fortnightly'});assert.equal(occursOn(q,'2026-10-30'),false);assert.equal(occursOn(q,'2026-11-06'),true);
});
test('Mensal mantém a data âncora e usa o último dia de meses menores',()=>{
 const s=parseSession({...base,date:'2028-01-31',frequency:'monthly'});assert.equal(occursOn(s,'2028-02-29'),true);assert.equal(occursOn(s,'2028-02-28'),false);assert.equal(occursOn(s,'2028-03-31'),true);assert.equal(occursOn(s,'2028-03-29'),false);
});
test('Agenda ordena horários e mantém séries como um único registro',()=>{
 const s={...parseSession(base),id:'series',createdAt:'',updatedAt:''};const o={...parseSession({...base,kind:'one-shot',startTime:'18:00'}),id:'one',createdAt:'',updatedAt:''};const occurrences=occurrencesBetween([s,o],'2026-10-23','2026-11-06');assert.deepEqual(occurrences.map(o=>o.key),['one:2026-10-23','series:2026-10-23','series:2026-10-30','series:2026-11-06']);
});
test('Expansão em intervalos equivale à consulta diária, inclusive em fevereiro bissexto e na janela de 400 dias',()=>{
 const sessions=[
  {date:'2026-12-08'},
  {date:'2028-01-31',frequency:'monthly',until:'2028-02-29'},
  {date:'2027-12-31',frequency:'monthly'},
  {date:'2028-01-10',frequency:'fortnightly',until:'2028-03-20'},
  {date:'2028-02-29',kind:'one-shot',startTime:'16:00'},
  {date:'2028-02-29',kind:'one-shot',startTime:'16:00'},
  {date:'2028-01-24',kind:'one-shot'},
  {date:'2028-02-24',kind:'one-shot'},
  {date:'2029-03-01',kind:'one-shot'},
 ].map((fields,i)=>({...parseSession({...base,...fields}),id:String(i),createdAt:'',updatedAt:''}));
 for(const [from,to] of [['2028-01-25','2029-06-01'],['2028-02-29','2028-02-29'],['2028-03-01','2028-02-29']]){
  const expected=[];
  for(let date=from,days=0;date<=to&&days<400;date=addDays(date,1),days++){
   for(const session of sessions)if(occursOn(session,date))expected.push({session,date,key:session.id+':'+date});
  }
  expected.sort((a,b)=>(a.date+a.session.startTime).localeCompare(b.date+b.session.startTime)||a.session.title.localeCompare(b.session.title));
  assert.deepEqual(occurrencesBetween(sessions,from,to),expected);
 }
});
test('Horário de Brasília e término no dia seguinte são explícitos',()=>{
 assert.equal(todayKey(new Date('2026-10-24T01:00:00Z')),'2026-10-23');assert.equal(sessionTime(parseSession(base)),'22:00–02:00 (+1 dia)');
});
test('Valida perfil, datas inexistentes, horários e intervalos inválidos',()=>{
 assert.deepEqual(parseProfile({name:' Guss ',email:' jogador@example.com '}),{name:'Guss',email:'jogador@example.com'});assert.throws(()=>parseProfile({name:'Guss',email:'invalido'}));assert.equal(validDate('2026-02-30'),false);
 for(const value of [{...base,date:'2026-02-30'},{...base,startTime:'25:00'},{...base,duration:0},{...base,until:'2026-10-22'},{...base,frequency:'random'},{...base,title:' '}])assert.throws(()=>parseSession(value));
});

test('Próximas sessões excluem horários que já passaram no dia',()=>{
 const s={...parseSession({...base,startTime:'18:00'}),id:'series',createdAt:'',updatedAt:''};
 const o={...s,...parseSession({...base,kind:'one-shot',startTime:'19:00'}),id:'one'};
 const upcoming=upcomingOccurrences([s,o],new Date('2026-10-23T21:30:00Z'));
 assert.equal(upcoming[0].key,'one:2026-10-23');assert.equal(upcoming[1].key,'series:2026-10-30');
});

test('Índice da agenda mantém ordem, referências e todos os eventos de cada dia sem modificar a entrada',()=>{
 const first={session:{id:'a'},date:'2026-11-01',key:'a:1'},second={session:{id:'b'},date:'2026-11-02',key:'b:2'},third={session:{id:'c'},date:'2026-11-01',key:'c:1'},source=[first,second,third],index=indexOccurrencesByDate(source);
 assert.deepEqual(index.get('2026-11-01'),[first,third]);assert.deepEqual(index.get('2026-11-02'),[second]);assert.equal(index.get('2026-11-03'),undefined);assert.equal(index.get('2026-11-01')[0],first);assert.deepEqual(source,[first,second,third]);
});
