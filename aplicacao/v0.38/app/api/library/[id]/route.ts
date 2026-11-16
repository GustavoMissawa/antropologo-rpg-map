import { json } from '../../../../lib/storage';
export function GET(){return json({error:'PDF não encontrado nesta versão de teste.'},404);}
export function DELETE(){return json({error:'Nesta versão de teste, PDFs ficam apenas na página.'},410);}
