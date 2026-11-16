/** Geometry for the system editor only; no rule or dice data is stored here. */
export function systemEditorViewport(layoutWidth:number,layoutHeight:number,viewport?:{width:number;height:number;offsetTop?:number;offsetLeft?:number;scale?:number}|null,focused=false){
 const positive=(value:number,fallback:number)=>Number.isFinite(value)&&value>0?value:fallback;
 const width=positive(viewport?.width||0,layoutWidth),height=positive(viewport?.height||0,layoutHeight),top=Math.max(0,viewport?.offsetTop||0),left=Math.max(0,viewport?.offsetLeft||0);
 return {width,height,top,left,compact:layoutWidth<=980,fullscreen:layoutWidth<=790,keyboard:layoutWidth<=790&&focused&&(viewport?.scale||1)<1.2&&layoutHeight-height>130};
}
