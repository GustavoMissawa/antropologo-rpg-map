import type { Block,BlockLayout,Sheet } from './model.ts';
export type BlockConnection={from:string;to:string;side:'above'|'below'|'left'|'right';offset:number};
const opposite={above:'below',below:'above',left:'right',right:'left'} as const;
export const connectionSideName={above:'acima',below:'abaixo',left:'à esquerda',right:'à direita'} as const;
export function connectedBlockIds(id:string,connections:BlockConnection[]=[]):Set<string>{
 const ids=new Set([id]),queue=[id];for(let i=0;i<queue.length;i++)for(const edge of connections){const other=edge.from===queue[i]?edge.to:edge.to===queue[i]?edge.from:null;if(other&&!ids.has(other)){ids.add(other);queue.push(other);}}return ids;
}
export function inferBlockConnection(from:Block,to:Block,heights:Record<string,number>={}):BlockConnection{
 const a=from.layout,b=to.layout,ah=heights[from.id]||a.height||260,bh=heights[to.id]||b.height||260,dx=b.x+b.width/2-a.x-a.width/2,dy=b.y+bh/2-a.y-ah/2;
 const vertical=Math.abs(dy)/((ah+bh)/2)>=Math.abs(dx)/((a.width+b.width)/2),side=vertical?(dy<0?'above':'below'):(dx<0?'left':'right');
 return {from:from.id,to:to.id,side,offset:vertical?b.x-a.x:b.y-a.y};
}
export function connectSheetBlocks(sheet:Sheet,fromId:string,toId:string,heights:Record<string,number>={}):Sheet{
 const from=sheet.blocks.find(b=>b.id===fromId),to=sheet.blocks.find(b=>b.id===toId);
 if(!from||!to||from===to||from.tabId!==to.tabId)throw new Error('Escolha outro bloco desta mesma aba.');
 const sourceGroup=connectedBlockIds(fromId,sheet.connections),targetGroup=connectedBlockIds(toId,sheet.connections);if(sourceGroup.has(toId))throw new Error('Estes blocos já fazem parte do mesmo conjunto conectado.');
 // Join the nearest edges of two compositions, preserving intervening blocks.
 const distance=(a:Block,b:Block)=>Math.hypot(Math.max(0,b.layout.x-a.layout.x-a.layout.width,a.layout.x-b.layout.x-b.layout.width),Math.max(0,b.layout.y-a.layout.y-(heights[a.id]||a.layout.height||260),a.layout.y-b.layout.y-(heights[b.id]||b.layout.height||260)));
 let source=from,target=to,best=distance(from,to);for(const a of sheet.blocks.filter(b=>sourceGroup.has(b.id)))for(const b of sheet.blocks.filter(b=>targetGroup.has(b.id))){const score=distance(a,b);if(score<best){source=a;target=b;best=score;}}
 return {...sheet,connections:[...sheet.connections||[],inferBlockConnection(source,target,heights)]};
}
export function pruneBlockConnections(sheet:Sheet):Sheet{
 const ids=new Map(sheet.blocks.map(b=>[b.id,b.tabId])),connections=sheet.connections?.filter(c=>ids.has(c.from)&&ids.has(c.to)&&ids.get(c.from)===ids.get(c.to));
 const {connections:previous,...rest}=sheet;return {...rest,...(connections?.length?{connections}:{})};
}
export function refreshBlockConnections(sheet:Sheet,id:string,heights:Record<string,number>={}):Sheet{
 const next=pruneBlockConnections(sheet);if(!next.connections)return next;const blocks=new Map(next.blocks.map(b=>[b.id,b]));
 return {...next,connections:next.connections.map(c=>c.from===id||c.to===id?inferBlockConnection(blocks.get(c.from)!,blocks.get(c.to)!,heights):c)};
}
export function parseBlockConnections(input:unknown,blocks:Block[],ids:Map<string,string>):BlockConnection[]|undefined{
 if(input===undefined)return;const fail=():never=>{throw new Error('As conexões dos blocos são inválidas. Use blocos distintos da mesma aba, sem ligações repetidas ou ciclos.');};
 if(!Array.isArray(input)||input.length>99)return fail();const parsed:BlockConnection[]=[],byId=new Map(blocks.map(b=>[b.id,b]));
 for(const edge of input){if(!edge||typeof edge.from!=='string'||typeof edge.to!=='string'||!ids.has(edge.from)||!ids.has(edge.to)||!['above','below','left','right'].includes(edge.side)||typeof edge.offset!=='number'||!Number.isFinite(edge.offset)||Math.abs(edge.offset)>16000)return fail();const from=ids.get(edge.from)!,to=ids.get(edge.to)!;if(from===to||byId.get(from)!.tabId!==byId.get(to)!.tabId||connectedBlockIds(from,parsed).has(to))return fail();parsed.push({from,to,side:edge.side,offset:edge.offset});}
 return parsed.length?parsed:undefined;
}
/** Resolve only connected blocks for reading. The editor's coordinates remain intact. */
export function connectedBlockLayouts(blocks:Block[],connections:BlockConnection[]=[],heights:Record<string,number>={}):Block[]{
 if(!connections.length)return blocks;
 const byId=new Map(blocks.map(b=>[b.id,b])),edges=connections.filter(c=>byId.has(c.from)&&byId.has(c.to)),placed=new Map<string,BlockLayout>(),visited=new Set<string>();
 const height=(id:string)=>heights[id]||byId.get(id)!.layout.height||260;
 for(const root of [...blocks].sort((a,b)=>a.layout.y-b.layout.y||a.layout.x-b.layout.x)){
  if(visited.has(root.id))continue;const members=connectedBlockIds(root.id,edges);for(const id of members)visited.add(id);if(members.size<2)continue;
  placed.set(root.id,{...root.layout});const queue=[root.id],done=new Set(queue);
  for(let i=0;i<queue.length;i++)for(const edge of edges){const reverse=edge.to===queue[i];if(edge.from!==queue[i]&&!reverse)continue;const id=reverse?edge.from:edge.to;if(done.has(id))continue;const side=reverse?opposite[edge.side]:edge.side,offset=reverse?-edge.offset:edge.offset,a=placed.get(queue[i])!,b=byId.get(id)!.layout;
   placed.set(id,{...b,x:side==='left'?a.x-b.width:side==='right'?a.x+a.width:a.x+offset,y:side==='above'?a.y-height(id):side==='below'?a.y+height(queue[i]):a.y+offset});done.add(id);queue.push(id);
  }
  const memberBlocks=[...members].map(id=>byId.get(id)!),minX=Math.min(...memberBlocks.map(b=>b.layout.x)),minY=Math.min(...memberBlocks.map(b=>b.layout.y)),dx=minX-Math.min(...queue.map(id=>placed.get(id)!.x)),dy=minY-Math.min(...queue.map(id=>placed.get(id)!.y));
  for(const id of queue){const p=placed.get(id)!;placed.set(id,{...p,x:p.x+dx,y:p.y+dy});}
 }
 return blocks.map(b=>placed.has(b.id)?{...b,layout:placed.get(b.id)!}:b);
}
export function connectedSides(id:string,connections:BlockConnection[]=[]){return connections.flatMap(c=>c.from===id?[c.side]:c.to===id?[opposite[c.side]]:[]).join(' ');}
