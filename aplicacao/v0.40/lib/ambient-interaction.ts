/** Consecutive active mouse motion. Hovering or inertia does not count. */
export const AMBIENT_MOTION_THRESHOLD_MS=2000;
export const AMBIENT_MOTION_IDLE_MS=250;
export type AmbientMotion={last:number|null;elapsed:number};
export function emptyAmbientMotion():AmbientMotion{return {last:null,elapsed:0};}
export function advanceAmbientMotion(state:AmbientMotion,now:number,moving:boolean){
 if(!moving)return {state:emptyAmbientMotion(),triggered:false};
 const delta=state.last===null?0:now-state.last;
 const elapsed=delta>=0&&delta<=AMBIENT_MOTION_IDLE_MS?state.elapsed+delta:0;
 const triggered=elapsed>=AMBIENT_MOTION_THRESHOLD_MS;
 return {state:triggered?emptyAmbientMotion():{last:now,elapsed},triggered};
}
