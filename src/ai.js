import {DEFAULT_AI,modelPayload,restoreFactIds} from './ai-provider.js';
import {requestScope} from './ai-request.js';
import {fitAIContext,AI_WIRE_LIMIT,contextSources} from './context-budget.js';
import {CHAT_SCHEMA,PARSE_SCHEMA,validateNarrative,validateRemoteParse,buildAIContext,buildReactionContext,inputActionCatalog} from './input.js';
import {RuleError} from './engine.js';
const config={mode:'fixed',...DEFAULT_AI,key:'',limit:30};
let activeRequest=null,configRevision=0;
export const getAIConfig=()=>({...config,key:undefined,hasKey:!!config.key,revision:configRevision});
export function setAIConfig(next){configRevision++;for(const k of ['mode','url','protocol','model','key','limit'])if(Object.hasOwn(next,k))config[k]=next[k];if(!['fixed','server','byok'].includes(config.mode))config.mode='fixed';config.limit=Math.max(1,Math.min(200,Number(config.limit)||30));}
function usage(){try{const u=JSON.parse(localStorage.getItem('changyong-ai-usage')||'null');return u?.day===new Date().toISOString().slice(0,10)?u:{day:new Date().toISOString().slice(0,10),calls:0,input:0,output:0,failures:0};}catch{return {day:new Date().toISOString().slice(0,10),calls:0,input:0,output:0,failures:0};}}
export const getUsage=usage;
function writeUsage(u){try{localStorage.setItem('changyong-ai-usage',JSON.stringify(u));}catch{}}
function wireBody(kind,context,input){
 const schema=kind==='parse'?PARSE_SCHEMA:CHAT_SCHEMA;
 const instructions=kind==='parse'?'逐句理解玩家原话。动作只能选context.actionCatalog中对应同一sourceText的candidateId，type必须为candidate；只输出type、candidateId、sourceText三字段，不得自行指定日期、金额、人物、物品、奖励或执行结果。原句没有对应候选就澄清，不能改选别的选项。咨询和否定不得变命令；最多3项，不能吞掉未识别子句。clarifications只填date/period/actor/item/choice/scope/unsupported代码。preference和boundary须逐字引用玩家本人当前明确表达的原句；不得从提问、转述或他人喜好补造。':'扮演指定角色，用中文回复玩家，通常40至120字；简单问句可以更短，不为凑字数补话。严格服从mandatory边界，只用可见事实与记忆，其他角色私聊不可猜测。你不执行命令，不替玩家承诺，不宣布新增婚姻子女、钱款、官职、礼物或数值，不为迎合而撤回职责。可以承认未知、拒绝亲密。不知道重生时不提此事。conversationMemory是有来源的原话摘记；只证明说过，不将提问、否定、未决或单方声称改写成本世事实、同意或守诺。JSON只含speakerId,text,factIds。';
 const reactionGuide='\n这是已发生选择后的接话。承接context.reaction中的具体经过，以角色自己的措辞说60至140字；贴合当前相处阶段，可有欢喜、释然或克制。不要复述规则、数值或系统说明，不添加新事实、礼物、约定或关系升级。';
 const payload={kind,context,input},systemInstructions=instructions+(kind==='reaction'?reactionGuide:'');
 if(config.mode==='server')return payload;
 const name=kind==='parse'?'action_parse':'role_reply';
 return modelPayload({base:config.url,model:config.model,protocol:config.protocol,guide:systemInstructions,payload,schema,name});
}
function requestContext(context,kind,input){return fitAIContext(context,{kind,input,maxChars:AI_WIRE_LIMIT,measure:ctx=>JSON.stringify(wireBody(kind,ctx,input)).length});}
async function invoke(kind,context,input,{signal:externalSignal}={}){
 if(externalSignal?.aborted)throw new RuleError('接话已取消，原回应保留。','CANCELLED');
 if(config.mode==='fixed')throw new RuleError('当前使用固定文本模式。');if(activeRequest)throw new RuleError('上一条回复尚未结束。');const u=usage();if(u.calls>=config.limit)throw new RuleError('今日调用上限已到，固定选项仍可继续。');
 if(config.mode==='byok'&&(!config.key||!config.model))throw new RuleError('请先在设置中填写模型和会话密钥。');
 const encoded=JSON.stringify(wireBody(kind,context,input));if(encoded.length>AI_WIRE_LIMIT)throw new RuleError('对话材料超过安全长度，请分段询问。');u.calls++;writeUsage(u);const token=Symbol();activeRequest=token;const scope=requestScope({signal:externalSignal,timeoutMs:kind==='reaction'?14000:35000,onAbort:()=>{if(activeRequest===token)activeRequest=null;}}),signal=scope.signal;
 try{
  let data;
  if(config.mode==='server'){
   const r=await scope.wait(fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','X-Changyong-Request':'1'},body:encoded,signal}));if(!r.ok){let reason='';try{reason=(await scope.wait(r.json())).error||'';}catch(err){if(['CANCELLED','TIMEOUT'].includes(err?.code))throw err;}throw new RuleError(reason||`AI服务不可用（${r.status}）`);}data=await scope.wait(r.json());
  }else{
   const url=new URL(config.url);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw new RuleError('远程模型地址须使用HTTPS。');
   const base=config.url.replace(/\/+$/,'');const path=config.protocol==='responses'?'/responses':'/chat/completions';
   const r=await scope.wait(fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.key},body:encoded,signal}));if(!r.ok)throw new RuleError(`模型请求失败（${r.status}）；可切回固定文本。`);const raw=await scope.wait(r.json());
   const text=raw.choices?.[0]?.message?.content||raw.output?.filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
   if(!text||raw.status==='incomplete'||raw.choices?.[0]?.finish_reason==='length')throw new RuleError('模型未给出完整回复。');data={value:restoreFactIds(JSON.parse(text),context,config.url),usage:raw.usage||{}};
  }
  const latest=usage();latest.input+=data.usage?.input_tokens||data.usage?.prompt_tokens||0;latest.output+=data.usage?.output_tokens||data.usage?.completion_tokens||0;writeUsage(latest);return data.value;
 }catch(err){if(err?.code==='CANCELLED')throw err;const latest=usage();latest.failures++;writeUsage(latest);if(err instanceof RuleError)throw err;throw new RuleError(err?.name==='TimeoutError'?'等待超时，固定文本仍可继续。':'AI连接或结构校验失败，已保留固定文本。');}
 finally{scope.dispose();if(activeRequest===token)activeRequest=null;}
}
function checkedModelValue(value,verify){try{return verify(value);}catch(err){const u=usage();u.failures++;writeUsage(u);throw err;}}
export async function parseAI(s,actor,eventId,input,options={}){const base=buildAIContext(s,actor,eventId,{kind:'parse',input}),catalog=inputActionCatalog(s,actor,eventId,input);base.actionCatalog=catalog;const ctx=requestContext(base,'parse',input),value=await invoke('parse',ctx,input,options);return checkedModelValue(value,v=>validateRemoteParse(v,{state:s,actor,eventId,input,catalog}));}
export async function chatAI(s,actor,eventId,input,{withSources=false,signal}={}){const ctx=requestContext(buildAIContext(s,actor,eventId,{kind:'chat',input}),'chat',input);const value=await invoke('chat',ctx,input,{signal}),text=checkedModelValue(value,v=>validateNarrative(v,ctx));return withSources?{text,memorySources:contextSources(ctx)}:text;}
export async function reactionAI(s,actor,eventId,options={}){const input='请接着刚才发生的这一幕，以自己的口吻说几句话。',ctx=requestContext(buildReactionContext(s,actor,eventId),'reaction',input);const value=await invoke('reaction',ctx,input,options);return checkedModelValue(value,v=>validateNarrative(v,ctx));}
export async function serverStatus(){if(globalThis.document?.querySelector('meta[name="changyong-hosting"]')?.content==='static')return {configured:false};try{const r=await fetch('/api/status');if(!r.ok)return {configured:false};return await r.json();}catch{return {configured:false};}}
