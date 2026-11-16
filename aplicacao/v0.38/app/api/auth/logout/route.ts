import { eq } from 'drizzle-orm';
import { getDb } from '../../../../db';
import { demoAccounts } from '../../../../db/schema';
import { currentPlayer,routeFailure,RouteError,sessionCookie } from '../../../../lib/player-server';
import { sameOrigin } from '../../../../lib/storage';
export async function POST(request:Request){try{if(!sameOrigin(request))throw new RouteError('Origem não autorizada.',403);const player=await currentPlayer(request);if(player)await getDb().delete(demoAccounts).where(eq(demoAccounts.handle,player.handle));return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':sessionCookie('',0)}});}catch(e){return routeFailure(e,'Não foi possível sair. Tente novamente.');}}
