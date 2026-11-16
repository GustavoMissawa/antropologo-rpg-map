import { json } from '../../../lib/storage';
import { initialRules } from '../../../lib/model';
// Public demo serves only authored baseline content. Prior private R2 records stay private.
export function GET(){return json(initialRules);}
export function PUT(){return json({error:'Nesta versão de teste, alterações de regras ficam apenas na página.'},410);}
