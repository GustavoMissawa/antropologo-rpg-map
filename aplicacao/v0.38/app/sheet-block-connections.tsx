'use client';
import { Link2,Unlink } from 'lucide-react';
import type { Block,Sheet } from '../lib/model';
import { connectedBlockIds,connectionSideName,type BlockConnection } from '../lib/sheet-connections';
export function BlockConnectionControls({sheet,block,onStart,onRemove}:{sheet:Sheet;block:Block;onStart:()=>void;onRemove:(edge:BlockConnection)=>void}){
 const edges=sheet.connections?.filter(c=>c.from===block.id||c.to===block.id)||[];
 return <section className="map-block-connections" aria-label="Conexões do bloco"><h4><Link2 size={16}/> Conectar blocos</h4><p>No Modo ficha, as bordas conectadas ficam juntas. Cada novo bloco se liga à borda mais próxima do conjunto, mantendo a disposição do mapa e o conteúdo independente.</p>{edges.length>0&&<p>{connectedBlockIds(block.id,sheet.connections).size} blocos neste conjunto visual.</p>}<button className="button secondary" type="button" disabled={sheet.blocks.filter(b=>b.tabId===block.tabId).length<2} onClick={onStart}><Link2 size={15}/> Conectar a outro bloco</button>
  {edges.length>0&&<ul>{edges.map(edge=>{const source=sheet.blocks.find(b=>b.id===edge.from),target=sheet.blocks.find(b=>b.id===edge.to);return <li key={edge.from+':'+edge.to}><span>{target?.title||'Sem título'} {connectionSideName[edge.side]} de {source?.title||'Sem título'}</span><button className="icon-button" type="button" aria-label={'Desconectar '+(source?.title||'bloco')+' de '+(target?.title||'bloco')} onClick={()=>onRemove(edge)}><Unlink size={16}/></button></li>;})}</ul>}
 </section>;
}
