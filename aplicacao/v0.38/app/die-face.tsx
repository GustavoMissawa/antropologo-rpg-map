'use client';
import { Check,Flame,Heart,Leaf,Moon,Shield,Skull,Sun,Swords,Target,X,Zap } from 'lucide-react';
import type { DieFace,DieFaceIcon,DiceSymbol,SymbolAmount } from '../lib/dice-set';
const icons={skull:Skull,flame:Flame,heart:Heart,shield:Shield,swords:Swords,bolt:Zap,sun:Sun,moon:Moon,leaf:Leaf,target:Target,check:Check,cross:X};
export function SymbolCombination({amounts,symbols}:{amounts:SymbolAmount[];symbols:DiceSymbol[]}){
 const count=amounts.reduce((n,s)=>n+s.count,0);
 return <span className="custom-die-combo">{amounts.map(a=>{const symbol=symbols.find(s=>s.id===a.symbolId);if(!symbol)return null;return <span className="custom-die-symbols" key={a.symbolId} aria-label={symbol.name+' ×'+a.count}>{Array.from({length:count<=8?a.count:1},(_,i)=><DieFaceContent key={i} face={symbol.display}/>)}{count>8&&<small>×{a.count}</small>}</span>;})}</span>;
}
export function DieFaceContent({face,value,symbols=[]}:{face?:DieFace|null;value?:number;symbols?:DiceSymbol[]}){
 if(face?.kind==='blank')return <span className="custom-die-empty" aria-hidden="true"/>;
 if(face?.kind==='number')return <>{face.value}</>;
 if(face?.kind==='symbols')return <SymbolCombination amounts={face.symbols} symbols={symbols}/>;
 if(face?.kind==='image')return face.src?<img className="custom-die-face-image" src={face.src} alt={face.label} draggable={false}/>:<span className="muted small-text">Envie a imagem</span>;
 if(!face)return <>{value}</>;if(face.kind==='icon'){const Icon=icons[face.icon as DieFaceIcon];return <Icon aria-hidden="true" className="custom-die-face-icon" size={25}/>;}
 return <span className={'custom-die-face-text '+face.kind}>{face.text}</span>;
}
