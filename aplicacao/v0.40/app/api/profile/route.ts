import { json } from '../../../lib/storage';
export function GET(){return json({error:'O perfil de teste usa apenas @ e agenda. Use /api/auth/session.'},410);}
export const PUT=GET;
