import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { demoAccounts,demoAuthSessions } from '../db/schema';
import { DEMO_LIFETIME_MS,parseCredentials,randomHex,hashPassword,digest,constantTimeEqual } from './demo-auth';
import { cleanupDemo,limitAuth,mutationBody,RouteError,routeFailure,sessionCookie } from './player-server';
export async function authenticate(request:Request,register:boolean){try{
 const body=await mutationBody(request);let credentials;try{credentials=parseCredentials(body);}catch(e){throw new RouteError((e as Error).message,400);}
 await cleanupDemo();
 const {handle,password}=credentials;
 await limitAuth('handle:'+handle,12);
 const ip=request.headers.get('cf-connecting-ip');if(ip)await limitAuth('ip:'+await digest(ip),40);
 const db=getDb();const account=await db.select().from(demoAccounts).where(eq(demoAccounts.handle,handle)).get();
 const salt=account?.passwordSalt||randomHex(16);const passwordHash=await hashPassword(password,salt);
 const token=randomHex();const tokenHash=await digest(token);let expiresAt:number;
 if(register){
  if(account)throw new RouteError('Este @ já está em uso. Escolha outro ou entre com sua senha.',409);
  expiresAt=Date.now()+DEMO_LIFETIME_MS;
  try{await db.batch([db.insert(demoAccounts).values({handle,calendarKey:crypto.randomUUID(),passwordHash,passwordSalt:salt,createdAt:Date.now(),expiresAt}),db.insert(demoAuthSessions).values({tokenHash,handle,expiresAt})]);}
  catch(error){if((await db.select({handle:demoAccounts.handle}).from(demoAccounts).where(eq(demoAccounts.handle,handle)).get()))throw new RouteError('Este @ já está em uso. Escolha outro ou entre com sua senha.',409);throw error;}
 }else{
  if(!account||!constantTimeEqual(passwordHash,account.passwordHash))throw new RouteError('@ ou senha incorretos, ou conta de teste expirada.',401);
  expiresAt=account.expiresAt;
  await db.insert(demoAuthSessions).values({tokenHash,handle,expiresAt});
 }
 return Response.json({user:{handle,expiresAt}},{status:register?201:200,headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie(token,expiresAt)}});
}catch(e){return routeFailure(e,'Não foi possível entrar agora. Tente novamente.');}}
