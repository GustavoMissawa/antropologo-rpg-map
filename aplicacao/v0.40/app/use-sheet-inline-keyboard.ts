'use client';

import {useEffect, type RefObject} from 'react';

const textField = 'textarea, [contenteditable="true"], input:not([type=checkbox],[type=radio],[type=file],[type=button],[type=range],[type=color])';

export function useSheetInlineKeyboard(viewport: RefObject<HTMLDivElement | null>, compact: boolean) {
  useEffect(()=>{
    const visual=window.visualViewport, node=viewport.current;
    if (!compact || !visual || !node) return;
    let previousTop: number | undefined;
    let adjustedTop: number | undefined;
    let frame=0;

    function restore() {
      if (node && previousTop!==undefined && adjustedTop!==undefined && Math.abs(node.scrollTop-adjustedTop)<2)
        node.scrollTop=previousTop;
      previousTop=undefined;
      adjustedTop=undefined;
      if (node) delete node.dataset.keyboard;
    }

    function adjust() {
      if (!node || !visual) return;
      const field=document.activeElement;
      if (!(field instanceof HTMLElement) || !node.contains(field) || !field.matches(textField)) { restore(); return; }
      const bottom=visual.offsetTop+visual.height;
      if (window.innerHeight-visual.height<70) { restore(); return; }

      node.dataset.keyboard='open';
      const fieldRect=field.getBoundingClientRect();
      const stage=node.getBoundingClientRect();
      const visibleTop=Math.max(stage.top,visual.offsetTop)+10, visibleBottom=Math.min(stage.bottom,bottom)-12;
      if (visibleBottom<=visibleTop) return;
      const delta=fieldRect.top<visibleTop?fieldRect.top-visibleTop:
        fieldRect.bottom>visibleBottom?Math.min(fieldRect.bottom-visibleBottom,fieldRect.top-visibleTop):0;
      if (!delta) return;
      previousTop ??= node.scrollTop;
      node.scrollTop += delta;
      adjustedTop=node.scrollTop;
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(adjust);
    }

    visual.addEventListener('resize',schedule);
    visual.addEventListener('scroll',schedule);
    node.addEventListener('focusin',schedule);
    node.addEventListener('focusout',schedule);
    return ()=>{
      cancelAnimationFrame(frame);
      visual.removeEventListener('resize',schedule);
      visual.removeEventListener('scroll',schedule);
      node.removeEventListener('focusin',schedule);
      node.removeEventListener('focusout',schedule);
      restore();
    };
  },[viewport,compact]);
}
