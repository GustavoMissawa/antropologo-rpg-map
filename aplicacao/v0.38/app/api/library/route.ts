import { json } from '../../../lib/storage';
export function GET(){return json([]);}
export function POST(){return json({error:'Nesta versão de teste, PDFs ficam apenas na página.'},410);}
