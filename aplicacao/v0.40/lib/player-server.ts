import { and,eq,lte,sql } from 'drizzle-orm';
import { getDb } from '../db';
import { demoAccounts,demoAuthSessions,demoAuthLimits } from '../db/schema';
import { digest } from './demo-auth';
import { json,sameOrigin } from './storage';
export class RouteError extends Error{constructor(message:string,public status:number){super(message);}}
const cookieName=()=>import.meta.env.DEV?'ab10_demo_session':'__Host-ab10_demo_session';
export function sessionCookie(token:string,expiresAt:number){return `${cookieName()}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0,Math.floor((expiresAt-Date.now())/1000))}${import.meta.env.DEV?'':'; Secure'}`;}
export async function cleanupDemo(){const db=getDb();await db.batch([db.delete(demoAccounts).where(lte(demoAccounts.expiresAt,Date.now())),db.delete(demoAuthLimits).where(lte(demoAuthLimits.expiresAt,Date.now()))]);}
export async function currentPlayer(request:Request){
 await cleanupDemo();
 const token=(request.headers.get('cookie')||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(cookieName()+'='))?.slice(cookieName().length+1);
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const row=await getDb().select({userId:demoAccounts.calendarKey,handle:demoAccounts.handle,expiresAt:demoAccounts.expiresAt,sessionExpiresAt:demoAuthSessions.expiresAt}).from(demoAuthSessions).innerJoin(demoAccounts,eq(demoAccounts.handle,demoAuthSessions.handle)).where(eq(demoAuthSessions.tokenHash,await digest(token))).get();
 if(!row||row.expiresAt<=Date.now()||row.sessionExpiresAt<=Date.now())return null;
 return {userId:row.userId,handle:row.handle,expiresAt:row.expiresAt};
}
export async function requirePlayer(request:Request){const player=await currentPlayer(request);if(!player)throw new RouteError('Entre ou crie uma conta de teste para acessar sua agenda.',401);return player;}
export async function limitAuth(key:string,max:number){
 const db=getDb();const now=Date.now();
 const row=await db.insert(demoAuthLimits).values({key,attempts:1,expiresAt:now+15*60*1000}).onConflictDoUpdate({target:demoAuthLimits.key,set:{attempts:sql`${demoAuthLimits.attempts}+1`}}).returning().get();
 if(row.attempts>max)throw new RouteError('Muitas tentativas. Aguarde 15 minutos para tentar novamente.',429);
}
export async function mutationBody(request:Request):Promise<unknown>{
 if(!sameOrigin(request))throw new RouteError('Origem não autorizada.',403);
 if(Number(request.headers.get('content-length'))>20000)throw new RouteError('Os dados enviados são muito grandes.',413);
 const body=await request.text();if(body.length>20000)throw new RouteError('Os dados enviados são muito grandes.',413);
 try{return JSON.parse(body);}catch{throw new RouteError('Os dados enviados são inválidos.',400);}
}
export function routeFailure(error:unknown,message:string){return error instanceof RouteError?json({error:error.message},error.status):json({error:message},500);}
export function validSessionId(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new RouteError('Sessão inválida.',400);}
