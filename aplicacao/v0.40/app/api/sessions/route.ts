import { eq } from 'drizzle-orm';
import { getDb } from '../../../db';
import { demoCalendarEvents as rpgSessions } from '../../../db/schema';
import { json } from '../../../lib/storage';
import { requirePlayer,mutationBody,routeFailure,RouteError } from '../../../lib/player-server';
import { parseSession,type Session } from '../../../lib/schedule';
export async function GET(request:Request){try{const user=await requirePlayer(request);const rows=await getDb().select({data:rpgSessions.data}).from(rpgSessions).where(eq(rpgSessions.userId,user.userId));return json(rows.map(r=>r.data));}catch(e){return routeFailure(e,'Não foi possível carregar sua agenda.');}}
export async function POST(request:Request){try{const user=await requirePlayer(request);const body=await mutationBody(request);let value;try{value=parseSession(body);}catch(e){throw new RouteError((e as Error).message,400);}const now=new Date().toISOString();const session:Session={...value,id:crypto.randomUUID(),createdAt:now,updatedAt:now};await getDb().insert(rpgSessions).values({id:session.id,userId:user.userId,date:session.date,data:session,updatedAt:now});return json(session,201);}catch(e){return routeFailure(e,'Não foi possível criar a sessão. Tente novamente.');}}
