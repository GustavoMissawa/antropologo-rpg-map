import { env } from 'cloudflare:workers';
export const bucket=()=>{ const b=(env as Cloudflare.Env).BUCKET; if(!b)throw new Error('O armazenamento não está disponível. Tente novamente.'); return b; };
// Reject cross-origin mutations as an additional CSRF safeguard.
export function sameOrigin(request:Request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
