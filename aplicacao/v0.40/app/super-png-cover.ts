'use client';
import type {ExportContent} from '../lib/content-file';
import {countRules} from '../lib/model.ts';
import {themeMediaSource} from '../lib/system-visuals.ts';
import {superPngImageRect,SUPER_PNG_COVER_WIDTH,SUPER_PNG_COVER_HEIGHT} from '../lib/super-png-cover-layout.ts';

export function currentExportAccent():string{
 const value=getComputedStyle(document.documentElement).getPropertyValue('--palette-value').trim();return /^#[0-9a-f]{6}$/i.test(value)?value:'#43855a';
}
function mix(hex:string,other:string,weight:number):string{
 const rgb=(s:string)=>[1,3,5].map(i=>Number.parseInt(s.slice(i,i+2),16));const a=rgb(hex),b=rgb(other);return '#'+a.map((v,i)=>Math.round(v*(1-weight)+b[i]*weight).toString(16).padStart(2,'0')).join('');
}
function fittedLines(ctx:CanvasRenderingContext2D,text:string,width:number,maxLines:number,size:number,minSize:number,maxHeight:number):{lines:string[];size:number}{
 const split=(fontSize:number)=>{ctx.font=`600 ${fontSize}px sans-serif`;const lines:string[]=[];let line='';for(const word of (text.trim()||'Sem nome').split(/\s+/)){const test=line?line+' '+word:word;if(ctx.measureText(test).width<=width){line=test;continue;}if(line){lines.push(line);line='';}for(const char of Array.from(word)){if(ctx.measureText(line+char).width>width&&line){lines.push(line);line=char;}else line+=char;}}if(line)lines.push(line);return lines;};
 let lines=split(size);while((lines.length>maxLines||lines.length*size*1.2>maxHeight)&&size>minSize){size-=2;lines=split(size);}if(lines.length>maxLines){lines=lines.slice(0,maxLines);let last=lines[maxLines-1];while(ctx.measureText(last+'…').width>width)last=last.slice(0,-1);lines[maxLines-1]=last+'…';}return {lines,size};
}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,width:number,size:number,maxLines=1,minSize=22,maxHeight=Infinity){
 const fitted=fittedLines(ctx,value,width,maxLines,size,minSize,maxHeight);ctx.font=`600 ${fitted.size}px sans-serif`;ctx.textAlign='left';ctx.textBaseline='top';fitted.lines.forEach((line,i)=>ctx.fillText(line,x,y+i*fitted.size*1.2));return fitted.lines.length*fitted.size*1.2;
}
async function image(src:string|undefined):Promise<HTMLImageElement|null>{
 if(!src||!/^data:image\/(png|jpeg|webp);base64,/.test(src))return null;
 return new Promise(resolve=>{const img=new Image();const timer=setTimeout(()=>{img.src='';resolve(null);},5000);img.onload=()=>{clearTimeout(timer);resolve(img.naturalWidth&&img.naturalHeight?img:null);};img.onerror=()=>{clearTimeout(timer);resolve(null);};img.src=src;});
}
function contain(ctx:CanvasRenderingContext2D,img:HTMLImageElement,x:number,y:number,w:number,h:number){const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight);const width=img.naturalWidth*scale,height=img.naturalHeight*scale;ctx.drawImage(img,x+(w-width)/2,y+(h-height)/2,width,height);}
function portraitPlaceholder(ctx:CanvasRenderingContext2D,accent:string){
 ctx.fillStyle=mix(accent,'#ffffff',.63);ctx.beginPath();ctx.arc(450,350,104,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.roundRect(242,482,416,238,[180,180,20,20]);ctx.fill();
}
function bookPlaceholder(ctx:CanvasRenderingContext2D,color:string){
 ctx.strokeStyle=color;ctx.lineWidth=7;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(450,270);ctx.quadraticCurveTo(365,225,280,256);ctx.lineTo(280,418);ctx.quadraticCurveTo(365,387,450,432);ctx.quadraticCurveTo(535,387,620,418);ctx.lineTo(620,256);ctx.quadraticCurveTo(535,225,450,270);ctx.lineTo(450,432);ctx.stroke();
}
export async function renderSuperPngCover(content:ExportContent,themeAccent:string):Promise<Blob>{
 const canvas=document.createElement('canvas');canvas.width=SUPER_PNG_COVER_WIDTH;canvas.height=SUPER_PNG_COVER_HEIGHT;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Este navegador não conseguiu gerar a capa PNG. Use JSON ou tente novamente.');
 const sheet=content.format==='ab10-character'?content:null,book=content.format==='rpg-ruleset'?content:null;
 const accent=sheet?.blocks.find(b=>b.color)?.color||book?.sheetTemplate?.blocks.find(b=>b.color)?.color||themeAccent;
 const custom=book?.visuals?.areas.superPngCover,customSource=themeMediaSource(book?.visuals,'superPngCover',false);
 if(custom&&customSource){
  const cover=await image(customSource);if(!cover)throw new Error('Não foi possível abrir a imagem da capa do Super PNG. Substitua a imagem e tente novamente.');
  const rect=superPngImageRect(cover.naturalWidth,cover.naturalHeight,custom);
  ctx.fillStyle='#fdfcf8';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.globalAlpha=custom.opacity;ctx.drawImage(cover,rect.x,rect.y,rect.width,rect.height);ctx.restore();
  ctx.save();ctx.globalAlpha=custom.overlayOpacity;ctx.fillStyle=custom.overlayColor;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
  return canvasPng(canvas);
 }
 ctx.fillStyle=mix(accent,'#ffffff',.91);ctx.fillRect(0,0,900,1160);
 if(sheet){
  ctx.save();ctx.shadowColor='#1b27292b';ctx.shadowBlur=35;ctx.shadowOffsetY=14;ctx.fillStyle='#ffffff';ctx.fillRect(60,50,780,1038);ctx.restore();
  ctx.fillStyle=mix(accent,'#ffffff',.86);ctx.fillRect(88,78,724,700);
  const portrait=await image(sheet.portrait);
  if(portrait)contain(ctx,portrait,104,94,692,668);else portraitPlaceholder(ctx,accent);
  ctx.fillStyle='#243432';text(ctx,sheet.name,101,815,698,62,3,20,166);
  ctx.fillStyle=mix(accent,'#162525',.35);if(sheet.system?.name)text(ctx,sheet.system.name,103,1031,695,25,1,20);
  ctx.fillStyle=accent;ctx.fillRect(103,1005,56,4);
 }else if(book){
  ctx.fillStyle='#d5d9d5';ctx.fillRect(91,68,737,1027);ctx.fillStyle='#fdfcf8';ctx.fillRect(103,65,733,1017);
  for(let at=1073;at<1090;at+=4){ctx.fillStyle='#b5bcb630';ctx.fillRect(102,at,725,1);}
  ctx.save();ctx.shadowColor='#1b27292b';ctx.shadowBlur=30;ctx.shadowOffsetY=9;
  const gradient=ctx.createLinearGradient(80,0,815,1060);gradient.addColorStop(0,mix(accent,'#152627',.56));gradient.addColorStop(1,mix(accent,'#152627',.28));ctx.fillStyle=gradient;ctx.fillRect(80,50,740,1025);ctx.restore();
  ctx.fillStyle='#00000020';ctx.fillRect(80,50,32,1025);ctx.fillStyle='#ffffff15';ctx.fillRect(116,50,3,1025);
  ctx.strokeStyle='#ffffff40';ctx.lineWidth=1;ctx.strokeRect(149,112,603,888);
  const logo=await image(book.logo);if(logo)contain(ctx,logo,194,172,510,312);else bookPlaceholder(ctx,mix(accent,'#ffffff',.72));
  ctx.fillStyle='#ffffff';text(ctx,book.name,186,548,529,64,4,22,290);
  ctx.fillStyle='#ffffffb8';text(ctx,'Conjunto de regras',190,938,530,25);
  ctx.fillStyle=mix(accent,'#ffffff',.7);ctx.fillRect(191,897,65,4);
  ctx.fillStyle='#ffffffa6';text(ctx,`${countRules(book.chapters)} tópicos${book.sheetTemplate?' · ficha-modelo incluída':''}`,190,980,530,19,1,17);
 }
 ctx.fillStyle=mix(accent,'#243432',.45);ctx.font='600 17px sans-serif';ctx.textBaseline='top';ctx.textAlign='center';ctx.fillText('ANTROPOLOGO RPG  /  SUPER PNG',450,1121);
 return canvasPng(canvas);
}
function canvasPng(canvas:HTMLCanvasElement):Promise<Blob>{return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar o PNG. Tente novamente.')),'image/png'));}
