export const FIRST_STEPS_STATES = ['pending', 'presented', 'completed', 'discovered'] as const;
type StageState = typeof FIRST_STEPS_STATES[number];
export type FirstStepsProgress = {settings: StageState; systems: StageState; disk: StageState};
export type FirstStepsZone = 'home' | 'systems';
export type FirstStepsCue = 'entry' | 'systems' | 'disk';
export const FIRST_STEPS_IDLE_MS = {entry: 30_000, systems: 30_000, disk: 10_000} as const;

export const FIRST_STEPS_ACTIONS = [
  'settings-opened', 'settings-closed', 'systems-presented', 'systems-visited', 'disk-presented', 'disk-used',
] as const;
export type FirstStepsAction = typeof FIRST_STEPS_ACTIONS[number];

function resolved(state: StageState) {
  return state === 'completed' || state === 'discovered';
}

export function pendingFirstStepsCue(progress: FirstStepsProgress | null, zone: FirstStepsZone) {
  if (!progress || !resolved(progress.settings)) return null;
  if (zone === 'home' && progress.systems === 'pending') return 'systems';
  if (zone === 'systems' && resolved(progress.systems) && progress.disk === 'pending') return 'disk';
  return null;
}

export function advanceFirstSteps(progress: FirstStepsProgress, action: FirstStepsAction): FirstStepsProgress {
  switch (action) {
    case 'settings-opened':
      return progress.settings === 'pending' ? {...progress, settings: 'presented'} : progress;
    case 'systems-presented':
      return pendingFirstStepsCue(progress, 'home') === 'systems' ? {...progress, systems: 'presented'} : progress;
    case 'disk-presented':
      return pendingFirstStepsCue(progress, 'systems') === 'disk' ? {...progress, disk: 'presented'} : progress;
    default: {
      const stage = action === 'settings-closed' ? 'settings' : action === 'systems-visited' ? 'systems' : 'disk';
      const state = progress[stage];
      if (resolved(state)) return progress;
      return {...progress, [stage]: state === 'presented' ? 'completed' : 'discovered'};
    }
  }
}
