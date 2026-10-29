import {taskBoundaryGuide} from './ai-task-guide.js';
import {roleVoiceGuide} from './ai-voice.js';
// Shared by the local proxy and the optional session-only browser adapter.
export const DEFAULT_AI={url:'https://api.deepseek.com',model:'deepseek-flash',protocol:'chat-completions'};
export function isDeepSeek(base){try{return new URL(base).hostname==='api.deepseek.com';}catch{return false;}}
function factAliases(context){const ids=[...new Set((context?.facts||[]).map(f=>f.id))],used=new Set(ids);let n=0;return new Map(ids.map(id=>{let alias;do{alias='F'+(++n);}while(used.has(alias));return [id,alias];}));}
function aliasPayload(payload){const map=factAliases(payload.context),visit=v=>typeof v==='string'?(map.get(v)||v):Array.isArray(v)?v.map(visit):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)])):v;return {...payload,context:visit(payload.context)};}
// Only map this request's visible fact aliases. Unknown references stay invalid.
export function restoreFactIds(value,context,base){if(!isDeepSeek(base)||!Array.isArray(value?.factIds))return value;const reverse=new Map([...factAliases(context)].map(([id,alias])=>[alias,id]));return {...value,factIds:value.factIds.map(id=>reverse.get(id)||id)};}
export function modelPayload({base,model,protocol,guide,payload,schema,name}){
 if(isDeepSeek(base)&&name==='role_reply')payload=aliasPayload(payload);
 const deepseek=isDeepSeek(base),example=name==='action_parse'?{segments:[],actions:[],clarifications:[]}:{speakerId:payload.context?.actorId||'C02',text:'依照眼前已经发生的事回答。',factIds:[]};
 const sourceRule=name==='role_reply'?'\nspeakerId必须等于context.actorId。factIds只能逐字抄取context.facts中的id；不得填写事件编号、人物编号、消息号、事务号或其他层的来源引用，不得缩写或自造编号。没有使用具体事实时填空数组[]。':'';
 const voiceRule=name==='role_reply'?roleVoiceGuide(payload.context?.actorId):'';
 const taskRule=taskBoundaryGuide(name,payload.context,payload.input);
 const instructions=deepseek?guide+sourceRule+voiceRule+taskRule+'\n仅输出 JSON，遵循此 JSON Schema：'+JSON.stringify(schema)+'\n格式示例（不是已发生的事实）：'+JSON.stringify(example):guide+sourceRule+voiceRule+taskRule;
 if(protocol==='responses')return {model,store:false,instructions,input:JSON.stringify(payload),max_output_tokens:1200,...(deepseek?{reasoning:{effort:'none'},text:{format:{type:'json_object'}}}:{text:{format:{type:'json_schema',name,strict:true,schema}}})};
 return {model,messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(payload)}],max_tokens:1200,...(deepseek?{thinking:{type:'disabled'},response_format:{type:'json_object'}}:{response_format:{type:'json_schema',json_schema:{name,strict:true,schema}}})};
}
