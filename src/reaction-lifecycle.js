import {RuleError} from './rules.js';

const copy=x=>structuredClone(x);
const stale=()=>new RuleError('这次接话对应的场景或进度已变化，原回应保留。','STALE');
function transcript(s,key,tx){const t=s.transcripts[key];if(!t||!s.events[key]?.completed||t.transactionId!==tx)throw stale();return t;}
export function claimReaction(s,key,tx,id,appVersion){
 const t=transcript(s,key,tx);
 if(t.aiReaction||t.reactionRequest)throw new RuleError('这段经历已经尝试接话，重读保留原文。','REACTION_USED');
 const n=copy(s);n.revision++;
 n.transcripts[key].reactionRequest={version:1,id,transactionId:tx,eventId:t.eventId,actor:t.actor,storyVersion:t.storyVersion??0,worldVersion:s.worldVersion,appVersion,requestedRevision:n.revision,status:'requested'};
 return n;
}
function currentRequest(s,b){
 const t=transcript(s,b.key,b.transactionId),r=t.reactionRequest;
 if(s.gameId!==b.gameId||s.worldVersion!==b.worldVersion||s.revision!==b.revision||!r||r.id!==b.id||r.status!=='requested'||t.actor!==b.actor||t.eventId!==b.eventId||(t.storyVersion??0)!==b.storyVersion)throw stale();
 return t;
}
export function finishReaction(s,b,text){
 const t=currentRequest(s,b);if(t.aiReaction)throw stale();
 if(typeof text!=='string'||text.length<2||text.length>1500)throw new RuleError('接话内容不完整。');
 const n=copy(s);n.transcripts[b.key].aiReaction=text;n.transcripts[b.key].reactionRequest.status='saved';n.revision++;return n;
}
export function failReaction(s,b){currentRequest(s,b);const n=copy(s);n.transcripts[b.key].reactionRequest.status='failed';n.revision++;return n;}
export function validateReactionRequests(s){
 const keys=['version','id','transactionId','eventId','actor','storyVersion','worldVersion','appVersion','requestedRevision','status'];
 for(const[key,t]of Object.entries(s.transcripts)){
  const r=t?.reactionRequest;if(r===undefined)continue;
  if(!r||Array.isArray(r)||Object.keys(r).length!==keys.length||Object.keys(r).some(k=>!keys.includes(k))||r.version!==1||typeof r.id!=='string'||r.id.length<1||r.id.length>100||r.transactionId!==t.transactionId||r.eventId!==t.eventId||r.actor!==t.actor||r.storyVersion!==(t.storyVersion??0)||!['changyong-v1.2-first-1','changyong-week-s02-1'].includes(r.worldVersion)||typeof r.appVersion!=='string'||!/^\d+\.\d+\.\d+(?:[-.][\w.-]+)?$/.test(r.appVersion)||r.appVersion.length>40||!Number.isSafeInteger(r.requestedRevision)||r.requestedRevision<1||!['requested','saved','failed'].includes(r.status)||!s.events[key]?.completed)throw new RuleError('接话请求记录格式错误。');
  if(r.status==='saved'?(typeof t.aiReaction!=='string'||t.aiReaction.length<2||t.aiReaction.length>1500):t.aiReaction!==undefined)throw new RuleError('接话请求与保存结果不一致。');
 }
}
const frameKeys=['storageKey','writeId','visit','appVersion','configVersion','view','sceneId','readingKey'];
function frameEqual(a,b){return frameKeys.every(k=>a[k]===b[k]);}
function sceneMatches(c,b){return c.view==='scene'&&!c.readingKey&&c.sceneId===b.eventId&&c.sceneKey===b.key;}
function matches(c,b){
 if(!sceneMatches(c,b)||!frameEqual(c,b.frame))return false;
 try{currentRequest(c.state,b);return true;}catch{return false;}
}

// write(fn) runs fn inside the app's storage lock; fn rechecks the live frame.
// No request is resumed by reading/importing a historical transcript.
export function createReactionLifecycle({read,write,request,onChange=()=>{}}){
 let active=null;
 const used=new Set();
 function cancel(){if(!active)return;const old=active;active=null;old.controller.abort();}
 async function start(eventId,key){
  const seed=read(),t=seed.state.transcripts[key],tx=t?.transactionId;
  if(active||!tx||!sceneMatches(seed,{eventId,key})||t.aiReaction||t.reactionRequest)return 'skipped';
  const once=[seed.storageKey,seed.state.gameId,key,tx].join('|');if(used.has(once))return 'skipped';used.add(once);
  const ticket={id:crypto.randomUUID(),controller:new AbortController()};active=ticket;
  let binding;
  try{
   await write(s=>{
    const now=read();if(active!==ticket||!frameEqual(seed,now)||s.gameId!==seed.state.gameId||s.worldVersion!==seed.state.worldVersion||s.revision!==seed.state.revision||s.transcripts[key]?.transactionId!==tx)throw stale();
    return claimReaction(s,key,tx,ticket.id,seed.appVersion);
   });
   const now=read(),record=now.state.transcripts[key];
   if(active!==ticket||ticket.controller.signal.aborted||!sceneMatches(now,{eventId,key})||now.visit!==seed.visit||now.appVersion!==seed.appVersion||now.configVersion!==seed.configVersion||now.state.revision!==seed.state.revision+1||record?.reactionRequest?.id!==ticket.id)throw stale();
   binding={id:ticket.id,key,eventId,transactionId:tx,actor:record.actor,storyVersion:record.storyVersion??0,gameId:now.state.gameId,worldVersion:now.state.worldVersion,revision:now.state.revision,frame:pickFrame(now)};
   ticket.binding=binding;onChange();
   const text=await request(copy(now.state),binding.actor,key,{signal:ticket.controller.signal});
   if(active!==ticket||!matches(read(),binding))return 'discarded';
   await write(s=>{if(active!==ticket||!matches({...read(),state:s},binding))throw stale();return finishReaction(s,binding,text);});
   return 'saved';
  }catch(err){
   if(!binding||active!==ticket||ticket.controller.signal.aborted||!matches(read(),binding))return 'discarded';
   try{await write(s=>{if(active!==ticket||!matches({...read(),state:s},binding))throw stale();return failReaction(s,binding);});}catch{return 'discarded';}
   return 'failed';
  }finally{if(active===ticket){active=null;onChange();}}
 }
 return{start,cancel,pendingKey:()=>active?.binding?.key||null};
}
function pickFrame(c){return Object.fromEntries(frameKeys.map(k=>[k,c[k]]));}
export function reactionHint(t,pending){return pending?'他像是还有一句话想说……':t.reactionRequest?'这一句没有再添上，先留住当时的话。':'';}
