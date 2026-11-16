import type {DemoUser} from './demo-auth.ts';
import type {PDF} from './model.ts';
import {parseSession,type Session} from './schedule.ts';
import {invalidApiResponse} from './browser-request.ts';
export function playerResponse(value:unknown):{user:DemoUser|null}{
 if(!value||typeof value!=='object'||!('user' in value))throw invalidApiResponse();const user=value.user;
 if(user===null)return {user:null};
 if(!user||typeof user!=='object'||!('handle' in user)||typeof user.handle!=='string'||!/^[a-z0-9_]{3,24}$/.test(user.handle)||!('expiresAt' in user)||typeof user.expiresAt!=='number'||!Number.isFinite(user.expiresAt))throw invalidApiResponse();
 return {user:{handle:user.handle,expiresAt:user.expiresAt}};
}
export function sessionResponse(value:unknown):Session{
 try{
  const row=value as Session;if(!row||typeof row.id!=='string'||!row.id||row.id.length>100||typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt))||typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt)))throw invalidApiResponse();
  return {...parseSession(row),id:row.id,createdAt:row.createdAt,updatedAt:row.updatedAt};
 }catch{throw invalidApiResponse();}
}
export function sessionsResponse(value:unknown):Session[]{if(!Array.isArray(value))throw invalidApiResponse();return value.map(sessionResponse);}
export function pdfsResponse(value:unknown):PDF[]{
 if(!Array.isArray(value))throw invalidApiResponse();
 for(const row of value){
  if(!row||!['id','title','filename','category','description','createdAt','url'].every(key=>typeof row[key]==='string')||!row.id||!Number.isFinite(row.size)||row.size<0)throw invalidApiResponse();
  let url:URL;try{url=new URL(row.url,'https://app.local');}catch{throw invalidApiResponse();}if(!['http:','https:','blob:'].includes(url.protocol))throw invalidApiResponse();
 }
 return value;
}
/** A late initial response must not discard PDFs added locally while it loaded. */
export function mergePdfCatalog(remote:PDF[],current:PDF[]):PDF[]{const local=current.filter(pdf=>pdf.url?.startsWith('blob:')),ids=new Set(local.map(pdf=>pdf.id));return [...local,...remote.filter(pdf=>!ids.has(pdf.id))];}
