export const DEMO_LIFETIME_MS=2*60*60*1000;
export type DemoUser={handle:string;expiresAt:number};
export function parseCredentials(value:unknown){
 if(!value||typeof value!=='object')throw new Error('Informe seu @ e sua senha.');
 const body=value as Record<string,unknown>;
 const handle=typeof body.handle==='string'?body.handle.trim().replace(/^@/,'').toLowerCase():'';
 if(!/^[a-z0-9_]{3,24}$/.test(handle))throw new Error('Use de 3 a 24 letras, números ou _ no @.');
 if(typeof body.password!=='string'||body.password.length<8||body.password.length>128)throw new Error('A senha deve ter de 8 a 128 caracteres.');
 return {handle,password:body.password};
}
export function randomHex(bytes=32){return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function hashPassword(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256);
 return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');
}
export function constantTimeEqual(a:string,b:string){let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return difference===0;}
