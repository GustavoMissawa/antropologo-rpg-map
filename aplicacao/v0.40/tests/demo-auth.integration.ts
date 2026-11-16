// Shared route assertions. The Node test uses an isolated SQLite adapter;
// running these in a local Worker remains a separate runtime validation.
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { demoAccounts,demoAuthSessions,demoCalendarEvents } from '../db/schema';
import { POST as register } from '../app/api/auth/register/route';
import { POST as login } from '../app/api/auth/login/route';
import { POST as logout } from '../app/api/auth/logout/route';
import { GET as auth } from '../app/api/auth/session/route';
import { GET as list,POST as create } from '../app/api/sessions/route';
import { PUT as edit,DELETE as remove } from '../app/api/sessions/[id]/route';
import { GET as rules,PUT as changeRules } from '../app/api/rules/route';
import { GET as library,POST as uploadPdf } from '../app/api/library/route';
import { GET as privatePdf,DELETE as deletePdf } from '../app/api/library/[id]/route';
import { GET as oldProfile } from '../app/api/profile/route';
import { randomHex } from '../lib/demo-auth';
export async function runAuthChecks(){
 const checks:string[]=[];const handles:string[]=[];
 function check(ok:unknown,message:string){if(!ok)throw new Error(message);checks.push(message);}
 const request=(path:string,method='GET',body?:unknown,cookie='',origin='https://qa.local')=>new Request('https://qa.local'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
 const credentials=(suffix:string)=>({handle:'qa_'+randomHex(4)+suffix,password:randomHex(16)});
 const one={title:'QA one-shot',kind:'one-shot',date:'2026-10-24',startTime:'19:00',duration:180,location:'Mesa de teste',description:''};
 const db=getDb();
 try{
  check(rules().status===200,'Regras de demonstração acessíveis sem login');
  check((await library().json() as any[]).length===0,'Biblioteca pública não expõe arquivos da publicação privada');
  check(changeRules().status===410&&uploadPdf().status===410&&deletePdf().status===410,'Visitantes não persistem alterações de regras e PDFs');
  check(privatePdf().status===404&&oldProfile().status===410,'Endpoints antigos não expõem PDFs e perfis privados');
  check((await list(request('/api/sessions'))).status===401,'Agenda exige login próprio, mesmo sem autenticação Sites');
  const spoofed=request('/api/sessions');spoofed.headers.set('oai-authenticated-user-id','local-preview');check((await list(spoofed)).status===401,'Cabeçalho externo não substitui a sessão da conta');
  check((await register(request('/api/auth/register','POST',{handle:'ab',password:'short'}))).status===400,'Valida @ e tamanho da senha');
  const a=credentials('a');handles.push(a.handle);const res=await register(request('/api/auth/register','POST',a));const created=await res.json() as any;const cookieA=res.headers.get('set-cookie')?.split(';')[0]||'';
  check(res.status===201&&created.user.handle===a.handle,'Cria conta com @ único e senha escolhida');
  check(/HttpOnly/.test(res.headers.get('set-cookie')||'')&&/SameSite=Lax/.test(res.headers.get('set-cookie')||''),'Cookie protege o token da sessão');
  check(created.user.expiresAt>Date.now()+7100000&&created.user.expiresAt<=Date.now()+7200000,'Conta expira 2 horas depois da criação');
  const stored=await db.select().from(demoAccounts).where(eq(demoAccounts.handle,a.handle)).get();check(stored&&stored.passwordHash!==a.password&&stored.passwordHash.length===64&&stored.passwordSalt.length===32,'Senha usa hash com salt e nunca texto puro');
  check((await register(request('/api/auth/register','POST',{...a,handle:'@'+a.handle.toUpperCase()}))).status===409,'Mesmo @ com outra capitalização é recusado');
  check((await login(request('/api/auth/login','POST',{...a,password:'senha_errada'}))).status===401,'Senha incorreta não autentica');
  const relog=await login(request('/api/auth/login','POST',{...a,handle:'@'+a.handle.toUpperCase()}));const cookieA2=relog.headers.get('set-cookie')?.split(';')[0]||'';check(relog.status===200&&(await relog.json() as any).user.expiresAt===created.user.expiresAt,'Login normaliza @ e não prolonga a expiração');
  const made=await create(request('/api/sessions','POST',one,cookieA));const event=await made.json() as any;check(made.status===201&&event.title===one.title,'Cria evento one-shot para a conta');
  const series=await create(request('/api/sessions','POST',{...one,title:'QA recorrente',kind:'recurring',frequency:'weekly',until:'2026-11-24'},cookieA));check(series.status===201,'Cria série recorrente para a conta');
  check((await (await list(request('/api/sessions','GET',undefined,cookieA2))).json() as any[]).length===2,'Calendário reaparece ao entrar novamente');
  const b=credentials('b');handles.push(b.handle);const rb=await register(request('/api/auth/register','POST',b));const cookieB=rb.headers.get('set-cookie')?.split(';')[0]||'';
  check((await (await list(request('/api/sessions','GET',undefined,cookieB))).json() as any[]).length===0,'Outra conta não vê eventos alheios');
  const params={params:Promise.resolve({id:event.id})};check((await edit(request('/api/sessions/'+event.id,'PUT',{...one,title:'Tentativa alheia'},cookieB),params)).status===404,'Outra conta não edita evento alheio');
  check((await remove(request('/api/sessions/'+event.id,'DELETE',undefined,cookieB),params)).status===404,'Outra conta não exclui evento alheio');
  check((await edit(request('/api/sessions/'+event.id,'PUT',{...one,title:'Revisada'},cookieA),params)).status===200,'Titular pode editar seu evento');
  check((await create(request('/api/sessions','POST',one,cookieA,'https://outside.local'))).status===403,'Recusa alteração originada de outro site');
  check((await logout(request('/api/auth/logout','POST',undefined,cookieA))).status===200,'Botão Sair encerra a conta temporária');
  check((await auth(request('/api/auth/session','GET',undefined,cookieA2))).status===200&&(await (await auth(request('/api/auth/session','GET',undefined,cookieA2))).json() as any).user===null,'Sair invalida também outras sessões da mesma conta');
  check(!(await db.select().from(demoAccounts).where(eq(demoAccounts.handle,a.handle)).get())&&!(await db.select().from(demoCalendarEvents).where(eq(demoCalendarEvents.userId,stored!.calendarKey)).get())&&!(await db.select().from(demoAuthSessions).where(eq(demoAuthSessions.handle,a.handle)).get()),'Sair apaga conta, calendário e tokens em cascata');
  const reuse=await register(request('/api/auth/register','POST',a));const reusedCookie=reuse.headers.get('set-cookie')?.split(';')[0]||'';check(reuse.status===201&&(await (await list(request('/api/sessions','GET',undefined,reusedCookie))).json() as any[]).length===0,'@ liberado pode ser reutilizado sem herdar calendário anterior');
  await create(request('/api/sessions','POST',one,cookieB));const oldB=await db.select().from(demoAccounts).where(eq(demoAccounts.handle,b.handle)).get();await db.update(demoAccounts).set({expiresAt:Date.now()-1}).where(eq(demoAccounts.handle,b.handle));
  check((await list(request('/api/sessions','GET',undefined,cookieB))).status===401&&!(await db.select().from(demoCalendarEvents).where(eq(demoCalendarEvents.userId,oldB!.calendarKey)).get()),'Expiração bloqueia acesso e limpa dados temporários');
  const concurrent=credentials('race');handles.push(concurrent.handle);const racing=await Promise.all([register(request('/api/auth/register','POST',concurrent)),register(request('/api/auth/register','POST',concurrent))]);check(racing.map(r=>r.status).sort().join(',')==='201,409','Cadastro simultâneo mantém @ globalmente único');
  const brute=credentials('limit');for(let i=0;i<12;i++)await login(request('/api/auth/login','POST',brute));check((await login(request('/api/auth/login','POST',brute))).status===429,'Limita tentativas repetidas de senha');
  return checks;
 }finally{for(const handle of handles)await db.delete(demoAccounts).where(eq(demoAccounts.handle,handle));}
}
