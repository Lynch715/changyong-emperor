import {RuleError} from './rules.js';

// The deadline covers headers and body decoding, including a transport adapter
// that ignores AbortSignal. Intentional navigation cancellation is separate.
export function requestScope({signal,timeoutMs,onAbort=()=>{}}){
 const controller=new AbortController();let rejectAbort;
 const interrupted=new Promise((_,reject)=>{rejectAbort=reject;});interrupted.catch(()=>{});
 function abort(reason){if(controller.signal.aborted)return;controller.abort(reason);rejectAbort(reason);onAbort(reason);}
 const cancel=()=>abort(new RuleError('接话已取消，原回应保留。','CANCELLED'));
 const timer=setTimeout(()=>abort(new RuleError('等待超时，固定文本仍可继续。','TIMEOUT')),timeoutMs);
 if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 return{signal:controller.signal,wait:promise=>Promise.race([promise,interrupted]),dispose(){clearTimeout(timer);signal?.removeEventListener('abort',cancel);}};
}
