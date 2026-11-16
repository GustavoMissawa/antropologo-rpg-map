import { currentPlayer,routeFailure } from '../../../../lib/player-server';
import { json } from '../../../../lib/storage';
export async function GET(request:Request){try{const player=await currentPlayer(request);return json({user:player?{handle:player.handle,expiresAt:player.expiresAt}:null});}catch(e){return routeFailure(e,'Não foi possível verificar sua sessão de teste.');}}
