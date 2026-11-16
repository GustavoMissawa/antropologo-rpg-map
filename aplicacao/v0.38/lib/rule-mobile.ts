export const RULE_MOBILE_QUERY='(max-width: 790px), (pointer: coarse)';
export type RuleVisualViewport={width:number;height:number;offsetLeft?:number;offsetTop?:number;scale?:number};
export type RuleKeyboardRect={x:number;y:number;width:number;height:number};
export type RuleMobileViewport={left:number;width:number;top:number;bottom:number;height:number;keyboard:boolean};
const finite=(n:number|undefined,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?n:fallback;
/** Fixed coordinates in the layout viewport, bounded by the visible viewport. */
export function ruleMobileViewport(layoutWidth:number,layoutHeight:number,visual?:RuleVisualViewport|null,keyboard?:RuleKeyboardRect|null):RuleMobileViewport{
 const width=Math.max(1,finite(layoutWidth,1)),height=Math.max(1,finite(layoutHeight,1));
 const left=Math.max(0,Math.min(width-1,finite(visual?.offsetLeft,0))),top=Math.max(0,Math.min(height-1,finite(visual?.offsetTop,0)));
 const visibleWidth=Math.max(1,Math.min(width-left,finite(visual?.width,width))),visibleHeight=Math.max(1,Math.min(height-top,finite(visual?.height,height)));
 const keyboardTop=keyboard&&keyboard.height>0&&keyboard.width>=width*.6&&keyboard.y>top?keyboard.y:height;
 const bottom=Math.max(top+1,Math.min(height,top+visibleHeight,keyboardTop));
 return {left,width:visibleWidth,top,bottom,height:bottom-top,keyboard:keyboardTop<height||finite(visual?.scale,1)===1&&height-visibleHeight>120};
}
/** Touch keeps its OS selection menu; a real mouse keeps the desktop menu. */
export function usesNativeRuleMenu(pointerType:string|undefined,lastPointerType:string,coarse:boolean):boolean{
 // Some touch browsers report the contextmenu itself as a mouse event. The
 // preceding real pointerdown is authoritative; a real mouse resets it.
 if(lastPointerType==='touch'||lastPointerType==='pen')return true;
 if(pointerType==='mouse')return false;
 return pointerType==='touch'||pointerType==='pen'||coarse;
}
