'use client';
import { useEffect,useId,useLayoutEffect,useRef,useState,type FocusEvent,type MouseEvent,type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Info,X } from 'lucide-react';

// Both hover and long press use the same details panel. A held tap never rolls.
export function useFieldDetails(label:string,details:string|undefined,enabled:boolean){
 const id=useId(),target=useRef<HTMLElement|null>(null),popup=useRef<HTMLDivElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),leaveTimer=useRef<ReturnType<typeof setTimeout>|null>(null),press=useRef<{x:number;y:number;pointerId:number}|null>(null),suppressClick=useRef(false),pinned=useRef(false);
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12});
 const active=enabled&&!!details?.trim();
 function clearTimer(){if(timer.current)clearTimeout(timer.current);timer.current=null;}
 function clearLeave(){if(leaveTimer.current)clearTimeout(leaveTimer.current);leaveTimer.current=null;}
 function close(){clearTimer();clearLeave();pinned.current=false;setOpen(false);}
 function delayedClose(){clearTimer();if(pinned.current)return;clearLeave();leaveTimer.current=setTimeout(()=>setOpen(false),180);}
 function schedule(){clearLeave();clearTimer();timer.current=setTimeout(()=>{pinned.current=false;setOpen(true);},700);}
 useEffect(()=>()=>{clearTimer();clearLeave();},[]);
 useEffect(()=>{if(!active)close();},[active]);
 useLayoutEffect(()=>{if(!open||!active)return;const rect=target.current?.getBoundingClientRect(),box=popup.current?.getBoundingClientRect();if(!rect||!box)return;setPosition({left:Math.max(12,Math.min(window.innerWidth-box.width-12,rect.left)),top:rect.bottom+10+box.height<=window.innerHeight-12?rect.bottom+10:Math.max(12,rect.top-box.height-10)});},[open,active,details]);
 useEffect(()=>{
  if(!open)return;
  const outside=(e:globalThis.PointerEvent)=>{if(!target.current?.contains(e.target as Node)&&!popup.current?.contains(e.target as Node))close();};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}};
  const scroll=(e:Event)=>{if(!popup.current?.contains(e.target as Node))close();};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);window.addEventListener('scroll',scroll,true);window.addEventListener('resize',close);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',close);};
 },[open]);
 const events=active?{
  ref:(el:HTMLElement|null)=>{target.current=el;},
  'aria-describedby':open?id:undefined,
  onPointerEnter:(e:PointerEvent<HTMLElement>)=>{if(e.pointerType==='mouse'&&!press.current)schedule();},
  onPointerLeave:()=>{press.current=null;delayedClose();},
  onFocus:(e:FocusEvent<HTMLElement>)=>{if(e.target===e.currentTarget&&e.currentTarget.matches(':focus-visible'))schedule();},
  onBlur:(e:FocusEvent<HTMLElement>)=>{if(!popup.current?.contains(e.relatedTarget as Node))delayedClose();},
  onPointerDown:(e:PointerEvent<HTMLElement>)=>{if(e.button!==0)return;clearTimer();clearLeave();suppressClick.current=false;const interactive=(e.target as HTMLElement).closest('input,textarea,select,button,a');if(interactive&&interactive!==e.currentTarget){press.current=null;close();return;}press.current={x:e.clientX,y:e.clientY,pointerId:e.pointerId};timer.current=setTimeout(()=>{if(!press.current)return;suppressClick.current=true;pinned.current=true;setOpen(true);},600);},
  onPointerMove:(e:PointerEvent<HTMLElement>)=>{const p=press.current;if(p&&(Math.abs(e.clientX-p.x)>10||Math.abs(e.clientY-p.y)>10)){clearTimer();press.current=null;}},
  onPointerUp:(e:PointerEvent<HTMLElement>)=>{clearTimer();press.current=null;if(suppressClick.current)e.preventDefault();},
  onPointerCancel:()=>{clearTimer();press.current=null;},
  onClickCapture:(e:MouseEvent<HTMLElement>)=>{if(suppressClick.current){suppressClick.current=false;if(e.detail!==0){e.preventDefault();e.stopPropagation();}}},
  onContextMenu:(e:MouseEvent<HTMLElement>)=>{if(press.current||pinned.current)e.preventDefault();}
 }:{};
 const panel=open&&active?createPortal(<div ref={popup} className="field-details-popup" role="dialog" aria-label={'Detalhes de '+label} style={position} onPointerEnter={clearLeave} onPointerLeave={delayedClose} onFocus={clearLeave} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node)&&!target.current?.contains(e.relatedTarget as Node))delayedClose();}}><div className="field-details-heading"><span><Info size={17}/><strong>{label||'Detalhes do campo'}</strong></span><button type="button" className="icon-button" aria-label="Fechar detalhes do campo" onClick={close}><X size={17}/></button></div><p id={id}>{details}</p></div>,document.body):null;
 return {events,panel,active};
}
