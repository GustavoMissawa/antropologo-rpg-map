import {AB10_RULEBOOK_ID,type Rulebook} from './model.ts';
import {restoreWorkspace,type PlatformWorkspace} from './platform-context.ts';

const DB_NAME='antropologo-platform-session-v1',TOKEN_KEY='antropologo-workspace-session';
export const SESSION_OPEN_TIMEOUT_MS=8000;
type Meta={version:1;ids:string[];contextId:string|null;page:PlatformWorkspace['page'];savedAt:number};
const request=<T>(r:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const complete=(t:IDBTransaction)=>new Promise<void>((resolve,reject)=>{t.oncomplete=()=>resolve();t.onabort=()=>reject(t.error||new Error('Não foi possível manter o contexto nesta sessão.'));t.onerror=()=>reject(t.error);});
/** Browser-local cache, separate from account storage and export files. One key per book per tab. */
export async function openPlatformSession({timeoutMs=SESSION_OPEN_TIMEOUT_MS}={}){
 let token=sessionStorage.getItem(TOKEN_KEY);if(!token){token=crypto.randomUUID();sessionStorage.setItem(TOKEN_KEY,token);}
 const prefix=token+':',opening=indexedDB.open(DB_NAME,1);
 opening.onupgradeneeded=()=>{const db=opening.result;db.createObjectStore('contexts');db.createObjectStore('books');};
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{
  let settled=false;const fail=(error:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);};
  const timer=setTimeout(()=>fail(new Error('O cache não respondeu a tempo. O conteúdo existente foi preservado.')),timeoutMs);
  opening.onblocked=()=>fail(new Error('O cache está bloqueado por outra aba.'));
  opening.onerror=()=>fail(opening.error);
  opening.onsuccess=()=>{if(settled){opening.result.close();return;}settled=true;clearTimeout(timer);resolve(opening.result);};
 });
 let references=new Map<string,Rulebook>(),closed=false;const pending=new Map<string,number>();
 db.onversionchange=()=>{closed=true;db.close();};
 return {
  async load({timeoutMs=SESSION_OPEN_TIMEOUT_MS}={}):Promise<PlatformWorkspace>{
   const loading=(async()=>{
   const meta=await request<Meta|undefined>(db.transaction('contexts').objectStore('contexts').get(token!));
   if(!meta||meta.version!==1||!Array.isArray(meta.ids)||meta.ids.length>50)return restoreWorkspace(null);
   const tx=db.transaction('books'),store=tx.objectStore('books');
   const books=await Promise.all(meta.ids.filter(id=>typeof id==='string'&&id.length<=100).map(id=>request(store.get(prefix+id))));
   const restored=restoreWorkspace({...meta,books});references=new Map(restored.books.filter(b=>b.id!==AB10_RULEBOOK_ID).map(b=>[b.id,b]));return restored;
   })();
   let timer:ReturnType<typeof setTimeout>|undefined;
   const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('A leitura do cache não respondeu a tempo. O conteúdo existente foi preservado.')),timeoutMs);});
   try{return await Promise.race([loading,deadline]);}finally{clearTimeout(timer);}
  },
  save(workspace:PlatformWorkspace):Promise<void>{
   if(closed)return Promise.reject(new Error('O cache de sessão foi fechado.'));
   const custom=workspace.books.filter(b=>b.id!==AB10_RULEBOOK_ID),next=new Map(custom.map(b=>[b.id,b])),changed=new Set<string>();
   let tx:IDBTransaction|undefined,done:Promise<void>|undefined;
   try{
    // Register accepted work immediately: closing the connection still lets
    // IndexedDB finish it. Pending records are rewritten defensively in later
    // transactions so an earlier abort cannot leave metadata without a book.
    tx=db.transaction(['contexts','books'],'readwrite');done=complete(tx);const store=tx.objectStore('books');
    for(const [id,book] of next)if(references.get(id)!==book||pending.has(id)){changed.add(id);store.put(book,prefix+id);}
    for(const id of new Set([...references.keys(),...pending.keys()]))if(!next.has(id)){changed.add(id);store.delete(prefix+id);}
    tx.objectStore('contexts').put({version:1,ids:custom.map(b=>b.id),contextId:workspace.contextId,page:workspace.page,savedAt:Date.now()} satisfies Meta,token!);
    for(const id of changed)pending.set(id,(pending.get(id)||0)+1);
    return done.then(()=>{references=next;}).finally(()=>{for(const id of changed){const remaining=(pending.get(id)||1)-1;if(remaining)pending.set(id,remaining);else pending.delete(id);}});
   }catch(error){try{tx?.abort();}catch{}return (done?.catch(()=>{})||Promise.resolve()).then(()=>{throw error;});}
  },
  close(){closed=true;db.close();}
 };
}
