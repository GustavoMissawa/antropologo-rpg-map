// Payload quotas are separate from image limits and the PNG transport envelope.
export const MIB=1024*1024;
export const CONTENT_QUOTAS=Object.freeze({character:5*MIB,ruleset:20*MIB});
export const MAX_JSON_BYTES=Math.max(...Object.values(CONTENT_QUOTAS));
// v2 stores the payload once; decoded metadata has a strict independent ceiling.
export const MAX_SUPER_PNG_METADATA_BYTES=MAX_JSON_BYTES+64*1024;
export const SUPER_PNG_FILE_BYTES=30*MIB;
export const contentByteLimit=(kind:'character'|'ruleset')=>CONTENT_QUOTAS[kind];
export const contentQuotaLabel=(kind:'character'|'ruleset')=>(contentByteLimit(kind)/MIB)+' MiB';

/** Exact pretty-JSON byte size without copying Base64 strings into temporary buffers. */
export function serializedUtf8Size(value:unknown):number{let images=0;const text=JSON.stringify(value,(_key,v)=>{if(typeof v==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(v)){images+=v.length;return '';}return v;},2);return new TextEncoder().encode(text).length+images;}
