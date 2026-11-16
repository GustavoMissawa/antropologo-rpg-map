import {JSDOM} from 'jsdom';
import {Editor} from '@tiptap/core';
import {ruleEditorExtensions,cleanPastedRuleHTML} from '../../app/rule-editor-extensions.ts';

// A DOM integration harness, not an Android/iOS or browser-layout emulator.
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://editor-test.invalid',pretendToBeVisual:true});
for(const key of ['window','document','navigator','DOMParser','Node','HTMLElement','Element','MutationObserver','getComputedStyle','KeyboardEvent','Event','MouseEvent','FocusEvent','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,key,{configurable:true,value:typeof dom.window[key]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(key)?dom.window[key].bind(dom.window):dom.window[key]});
globalThis.innerHeight=768;globalThis.innerWidth=1024;
export const paragraph=(value='',attrs)=>({type:'paragraph',...(attrs?{attrs}:{}),...(value?{content:[{type:'text',text:value}]}:{})});
export const documentOf=(...content)=>({type:'doc',content});
export function mountedRuleEditor(content=documentOf(paragraph())){
 const host=document.createElement('div');document.body.append(host);
 const editor=new Editor({element:host,extensions:ruleEditorExtensions(),content,editorProps:{transformPastedHTML:cleanPastedRuleHTML,handleScrollToSelection:()=>true}});
 return {editor,get state(){return editor.state;},at(from,to=from){editor.commands.setTextSelection({from,to});},type(value){for(const text of value){const {from,to}=editor.state.selection;let handled=false;editor.view.someProp('handleTextInput',handler=>handled=handler(editor.view,from,to,text));if(!handled)editor.view.dispatch(editor.state.tr.insertText(text,from,to));}},key(key,{ctrlKey=false,shiftKey=false,altKey=false,metaKey=false}={}){const event=new dom.window.KeyboardEvent('keydown',{key,ctrlKey,shiftKey,altKey,metaKey,bubbles:true,cancelable:true});editor.view.dom.dispatchEvent(event);return event.defaultPrevented;},paste(html){return editor.view.pasteHTML(html,new dom.window.Event('paste',{bubbles:true,cancelable:true}));},pasteText(text){return editor.view.pasteText(text,new dom.window.Event('paste',{bubbles:true,cancelable:true}));},copy(){return editor.view.serializeForClipboard(editor.state.selection.content());},close(){editor.destroy();host.remove();}};
}
