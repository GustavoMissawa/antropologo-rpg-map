export class ApiError extends Error{
 status:number;reason:'http'|'timeout'|'network'|'invalid';
 constructor(message:string,status:number,reason:ApiError['reason']='http'){super(message);this.name='ApiError';this.status=status;this.reason=reason;}
}
export const REQUEST_TIMEOUT_MS=15000;
export function invalidApiResponse(){return new ApiError('O servidor enviou uma resposta inválida. Verifique os dados antes de tentar novamente.',200,'invalid');}
/** Bounded reads can retry transient gateway failures. Mutations are never replayed. */
export async function requestJson<T>(path:string,{method='GET',value,timeoutMs=REQUEST_TIMEOUT_MS}:{method?:string;value?:unknown;timeoutMs?:number}={}):Promise<T>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const timeout=()=>new ApiError(method==='GET'?'A conexão demorou demais. Tente novamente; seus dados nesta página foram mantidos.':'Não foi possível confirmar a ação a tempo. Ela pode ter sido concluída. Verifique os dados antes de tentar novamente.',0,'timeout');
 const deadline=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(timeout());},timeoutMs);});
 const task=(async()=>{
  for(let attempt=0;;attempt++){
   try{
    const response=await fetch(path,{method,signal:controller.signal,cache:'no-store',headers:value!==undefined?{'Content-Type':'application/json'}:undefined,body:value!==undefined?JSON.stringify(value):undefined});
    let data:unknown;try{data=await response.json();}catch{if(controller.signal.aborted)throw timeout();if(response.ok)throw invalidApiResponse();}
    if(!response.ok){const error=data&&typeof data==='object'&&'error' in data?data.error:null;throw new ApiError(typeof error==='string'&&error.trim()&&error.length<=400?error:'Não foi possível concluir. Tente novamente.',response.status);}
    return data as T;
   }catch(error){
    if(controller.signal.aborted)throw timeout();
    const failure=error instanceof ApiError?error:new ApiError(method==='GET'?'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.':'Não foi possível confirmar a ação. Verifique sua conexão e os dados antes de tentar novamente.',0,'network');
    if(method==='GET'&&attempt===0&&(failure.reason==='network'||[502,503,504].includes(failure.status)))continue;
    throw failure;
   }
  }
 })();
 try{return await Promise.race([task,deadline]);}finally{clearTimeout(timer);}
}
