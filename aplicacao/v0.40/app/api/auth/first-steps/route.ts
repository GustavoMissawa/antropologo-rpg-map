import {and, eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {demoFirstSteps} from '../../../../db/schema';
import {advanceFirstSteps, FIRST_STEPS_ACTIONS, type FirstStepsAction} from '../../../../lib/orbital-first-steps';
import {currentPlayer, mutationBody, RouteError, routeFailure} from '../../../../lib/player-server';
import {json} from '../../../../lib/storage';

const columns = {settings: demoFirstSteps.settings, systems: demoFirstSteps.systems, disk: demoFirstSteps.disk};

async function firstStepsPlayer(request: Request) {
  const player = await currentPlayer(request);
  if (!player) throw new RouteError('A sessão de teste não está ativa.', 401);
  return player;
}

export async function GET(request: Request) {
  try {
    const player = await firstStepsPlayer(request);
    const progress = await getDb().select(columns).from(demoFirstSteps).where(eq(demoFirstSteps.userId, player.userId)).get();
    return json({progress: progress ?? null});
  } catch (error) {
    return routeFailure(error, 'Não foi possível consultar o progresso.');
  }
}

export async function POST(request: Request) {
  try {
    const body = await mutationBody(request) as {handle?: unknown; expiresAt?: unknown; action?: unknown} | null;
    const action = body?.action as FirstStepsAction;
    if (!FIRST_STEPS_ACTIONS.includes(action)) throw new RouteError('Etapa inválida.', 400);
    const player = await firstStepsPlayer(request);
    if (body?.handle !== player.handle || body.expiresAt !== player.expiresAt) throw new RouteError('A sessão de teste mudou.', 409);

    const db = getDb();
    const owner = eq(demoFirstSteps.userId, player.userId);
    // Compare all stages so two tabs cannot both reserve the same visual cue.
    for (;;) {
      const current = await db.select(columns).from(demoFirstSteps).where(owner).get();
      if (!current) return json({progress: null, changed: false});
      const next = advanceFirstSteps(current, action);
      if (next === current) return json({progress: current, changed: false});
      const progress = await db.update(demoFirstSteps).set(next).where(and(owner,
        eq(demoFirstSteps.settings, current.settings), eq(demoFirstSteps.systems, current.systems), eq(demoFirstSteps.disk, current.disk),
      )).returning(columns).get();
      if (progress) return json({progress, changed: true});
    }
  } catch (error) {
    return routeFailure(error, 'Não foi possível atualizar o progresso.');
  }
}
