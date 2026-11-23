export const RPG_TIMEZONE = 'America/Sao_Paulo';
export type Profile = { name:string; email:string };
export type SessionInput = { title:string; kind:'one-shot'|'recurring'; date:string; startTime:string; duration:number; frequency:'weekly'|'fortnightly'|'monthly'|null; until:string|null; location:string; description:string; timezone:typeof RPG_TIMEZONE };
export type Session = SessionInput & { id:string; createdAt:string; updatedAt:string };
export type Occurrence = { session:Session; date:string; key:string };
export const frequencyNames = {weekly:'Semanal',fortnightly:'Quinzenal',monthly:'Mensal'};
const DAY_MS = 86_400_000;
const brasiliaDate = new Intl.DateTimeFormat('en-CA',{timeZone:RPG_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'});
const brasiliaClock = new Intl.DateTimeFormat('en-GB',{timeZone:RPG_TIMEZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function civilDate(date:string):Date {return new Date(date+'T12:00:00.000Z');}
export function dateKey(date:Date):string {return date.toISOString().slice(0,10);}
export function addDays(date:string,n:number):string {const d=civilDate(date);d.setUTCDate(d.getUTCDate()+n);return dateKey(d);}
export function todayKey(now=new Date()):string {const parts=brasiliaDate.formatToParts(now);const part=(key:string)=>parts.find(p=>p.type===key)?.value;return `${part('year')}-${part('month')}-${part('day')}`;}
export function validDate(date:unknown):date is string {if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=civilDate(date);return Number.isFinite(d.getTime())&&dateKey(d)===date&&date>='2000-01-01'&&date<='2100-12-31';}
export function parseProfile(value:unknown):Profile {if(!value||typeof value!=='object')throw new Error('Preencha seu nome e e-mail.');const p=value as Record<string,unknown>;if(typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>100)throw new Error('Informe um nome com até 100 caracteres.');if(typeof p.email!=='string'||p.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))throw new Error('Informe um e-mail válido.');return {name:p.name.trim(),email:p.email.trim()};}
export function parseSession(value:unknown):SessionInput {
 if(!value||typeof value!=='object')throw new Error('Confira os dados da sessão.');const s=value as Record<string,unknown>;
 if(typeof s.title!=='string'||!s.title.trim()||s.title.trim().length>100)throw new Error('Dê um título à sessão, com até 100 caracteres.');
 if(s.kind!=='one-shot'&&s.kind!=='recurring')throw new Error('Escolha one-shot ou recorrente.');
 if(!validDate(s.date))throw new Error('Informe uma data válida entre 2000 e 2100.');
 if(typeof s.startTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime))throw new Error('Informe um horário válido.');
 if(typeof s.duration!=='number'||!Number.isInteger(s.duration)||s.duration<15||s.duration>1440)throw new Error('A duração deve ser de 15 minutos a 24 horas.');
 if(s.kind==='recurring'&&!['weekly','fortnightly','monthly'].includes(s.frequency as string))throw new Error('Escolha a frequência da série.');
 if(s.kind==='recurring'&&s.until!==null&&s.until!==''&&(!validDate(s.until)||s.until<s.date))throw new Error('A data final deve ser igual ou posterior à primeira sessão.');
 if(typeof s.location!=='string'||s.location.length>300||typeof s.description!=='string'||s.description.length>3000)throw new Error('Use até 300 caracteres para o local e 3.000 para as anotações.');
 return {title:s.title.trim(),kind:s.kind,date:s.date,startTime:s.startTime,duration:s.duration,frequency:s.kind==='recurring'?s.frequency as SessionInput['frequency']:null,until:s.kind==='recurring'&&s.until?s.until as string:null,location:s.location.trim(),description:s.description.trim(),timezone:RPG_TIMEZONE};
}
export function occursOn(session:SessionInput,date:string):boolean {
 if(date<session.date||(session.until&&date>session.until))return false;
 if(session.kind==='one-shot')return date===session.date;
 const start=civilDate(session.date),day=civilDate(date);
 if(session.frequency==='monthly'){const last=new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,0)).getUTCDate();return day.getUTCDate()===Math.min(start.getUTCDate(),last);}
 const delta=Math.round((day.getTime()-start.getTime())/DAY_MS);
 return delta%(session.frequency==='fortnightly'?14:7)===0;
}
export function occurrencesBetween(sessions:Session[],from:string,to:string):Occurrence[]{
 if(!sessions.length||from>to)return [];
 const found:Occurrence[]=[];
 const limit=addDays(from,399);
 const last=to<limit?to:limit;
 for(const session of sessions){
  const first=session.date>from?session.date:from;
  const end=session.until&&session.until<last?session.until:last;
  if(first>end)continue;
  const record=(date:string)=>found.push({session,date,key:session.id+':'+date});
  if(session.kind==='one-shot'){
   if(first===session.date)record(first);
   continue;
  }
  const anchor=civilDate(session.date);
  if(session.frequency==='monthly'){
   const month=civilDate(first);
   month.setUTCDate(1);
   const finalMonth=end.slice(0,7);
   for(;dateKey(month).slice(0,7)<=finalMonth;month.setUTCMonth(month.getUTCMonth()+1)){
    const lastDay=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
    const date=dateKey(month).slice(0,8)+String(Math.min(anchor.getUTCDate(),lastDay)).padStart(2,'0');
    if(date>=first&&date<=end)record(date);
   }
   continue;
  }
  const interval=(session.frequency==='fortnightly'?14:7)*DAY_MS;
  const start=anchor.getTime();
  const firstTime=civilDate(first).getTime();
  const endTime=civilDate(end).getTime();
  for(let time=start+Math.ceil((firstTime-start)/interval)*interval;time<=endTime;time+=interval){
   record(dateKey(new Date(time)));
  }
 }
 return found.sort((a,b)=>{
  if(a.date!==b.date)return a.date<b.date?-1:1;
  if(a.session.startTime!==b.session.startTime)return a.session.startTime<b.session.startTime?-1:1;
  return a.session.title.localeCompare(b.session.title);
 });
}
/** Reuse the existing occurrence order instead of scanning it once for every grid cell. */
export function indexOccurrencesByDate(occurrences:Occurrence[]):Map<string,Occurrence[]>{const index=new Map<string,Occurrence[]>();for(const occurrence of occurrences){const day=index.get(occurrence.date);if(day)day.push(occurrence);else index.set(occurrence.date,[occurrence]);}return index;}
export function upcomingOccurrences(sessions:Session[],now=new Date()):Occurrence[]{const today=todayKey(now);const clock=brasiliaClock.format(now);return occurrencesBetween(sessions,today,addDays(today,120)).filter(o=>o.date+o.session.startTime>=today+clock);}
export function monthGrid(month:string):string[]{const first=month+'-01';const weekday=(civilDate(first).getUTCDay()+6)%7;const start=addDays(first,-weekday);return Array.from({length:42},(_,i)=>addDays(start,i));}
export function shiftMonth(month:string,amount:number):string {const d=civilDate(month+'-01');d.setUTCMonth(d.getUTCMonth()+amount);return dateKey(d).slice(0,7);}
export function sessionTime(session:SessionInput):string {const [h,m]=session.startTime.split(':').map(Number);const end=h*60+m+session.duration;return `${session.startTime}–${String(Math.floor(end/60)%24).padStart(2,'0')}:${String(end%60).padStart(2,'0')}${end>=1440?' (+1 dia)':''}`;}
export function formatDate(date:string,options:Intl.DateTimeFormatOptions={day:'numeric',month:'long'}):string{return civilDate(date).toLocaleDateString('pt-BR',{...options,timeZone:'UTC'});}
