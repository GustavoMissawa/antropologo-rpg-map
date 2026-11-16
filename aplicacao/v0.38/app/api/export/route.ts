import {CONTENT_QUOTAS} from '../../../lib/content-limits';
import { parseSheet } from '../../../lib/model';
import { sameOrigin, json } from '../../../lib/storage';
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Origem não autorizada.'},403);
 if(Number(request.headers.get('content-length'))>6*1024*1024)return json({error:'Ficha muito grande.'},413);
 try{
  const form=await request.formData();const raw=form.get('sheet');
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>CONTENT_QUOTAS.character)return json({error:'Ficha inválida ou muito grande.'},400);
  const sheet=parseSheet(JSON.parse(raw));
  const filename=(sheet.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-')||'personagem')+'.ab10';
  return new Response(JSON.stringify(sheet,null,2),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return json({error:'Não foi possível exportar a ficha. Volte ao editor e tente novamente.'},400);}
}
