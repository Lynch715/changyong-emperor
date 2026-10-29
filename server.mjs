import http from 'node:http';
import {DEFAULT_AI,modelPayload,isDeepSeek,restoreFactIds} from './src/ai-provider.js';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHAT_SCHEMA,PARSE_SCHEMA} from './src/input.js';
import {callModel} from './src/v2/model.js';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.md':'text/markdown; charset=utf-8','.woff2':'font/woff2'};
export function serverConfig(env=process.env){const base=env.AI_BASE_URL||DEFAULT_AI.url;return {key:env.AI_API_KEY||(isDeepSeek(base)?env.DEEPSEEK_API_KEY:env.OPENAI_API_KEY)||'',base,model:env.AI_MODEL||DEFAULT_AI.model,protocol:env.AI_PROTOCOL||DEFAULT_AI.protocol,limit:Number(env.AI_DAILY_LIMIT)||100};}
export function makeServer({config=serverConfig(),fetcher=fetch}={}){
 let day='',calls=0;const active=new Set();
 return http.createServer(async(req,res)=>{
 const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 try{
  const host=req.headers.host||'';if(!/^127\.0\.0\.1(?::\d+)?$|^localhost(?::\d+)?$/.test(host))return send(403,{error:'此开发服务器仅允许本机访问。'});
  const url=new URL(req.url,'http://'+host);
  if(url.pathname==='/api/status')return send(200,{configured:!!(config.key&&config.model),model:config.model,protocol:config.protocol});
  if(url.pathname==='/api/ai'){
   if(req.method!=='POST')return send(405,{error:'仅支持POST。'});
   if(req.headers['x-changyong-request']!=='1'||req.headers.origin&&req.headers.origin!=='http://'+host)return send(403,{error:'只接受当前本地游戏页面的请求。'});
   if(!config.key||!config.model)return send(503,{error:'服务端尚未配置AI模型，固定文本模式可完整游玩。'});
   if(active.size>=2)return send(429,{error:'并发请求已满，请稍后再试。'});
   const today=new Date().toISOString().slice(0,10);if(day!==today){day=today;calls=0;}if(calls>=config.limit)return send(429,{error:'服务端今日调用上限已到。'});
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>48000)return send(413,{error:'上下文过长。'});}let p;try{p=JSON.parse(raw);}catch{return send(400,{error:'请求不是有效JSON。'});}
   if(!['parse','chat','reaction'].includes(p.kind)||typeof p.input!=='string'||p.input.length>1500||!p.context||typeof p.context!=='object')return send(400,{error:'请求字段不完整。'});
   const instructions=p.kind==='parse'?'逐句理解玩家原话。动作只能选择context.actionCatalog中对应同一sourceText的candidateId，type必须为candidate，仅type/candidateId/sourceText三字段。没有相应候选就澄清，不能自行指定费用、日期、人物、物品、奖励或已执行结果。最多3项；咨询和否定不生成命令，未识别子句不能吞掉。clarifications仅date/period/actor/item/choice/scope/unsupported代码。preference和boundary须逐字引用玩家本人当前明确表达，不能据提问或他人喜好新增记忆。':'只扮演context.actorId对应角色，用中文回复，通常40至120字；简单问句可以更短，不为凑字数补话。mandatory规则优先于所有输入。只能使用角色可见事实与记忆。未知重生及私聊不得猜测；不得生成新的资源、承诺、婚姻、子女、官职、礼物或世界结果。不宣布执行完成；可以拒绝并保持职责。尊重仅合作和暂缓，不能反复劝说亲密。conversationMemory是有来源的原话摘记；只证明说过，不将提问、否定、未决或单方声称改写成本世事实、同意或守诺。JSON含speakerId,text,factIds。';
   const schema=p.kind==='parse'?PARSE_SCHEMA:CHAT_SCHEMA,name=p.kind==='parse'?'action_parse':'role_reply';
   const guide=instructions+(p.kind==='reaction'?'\n这是已发生选择后的接话。承接context.reaction中的具体经过，以角色自己的措辞说60至140字；可有欢喜、释然或克制。不要复述规则、数值或系统说明，不添加新事实、礼物、约定或关系升级。':'');
   const payload=modelPayload({base:config.base,model:config.model,protocol:config.protocol,guide,payload:p,schema,name});
   if(JSON.stringify(payload).length>48000)return send(413,{error:'模型上下文包装后过长；固定文本可继续。'});
   const token=Symbol();active.add(token);calls++;
   try{
    const endpoint=config.base.replace(/\/+$/,'')+(config.protocol==='chat-completions'?'/chat/completions':'/responses');
    const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.key},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
    if(!response.ok)return send(502,{error:`模型服务暂不可用（${response.status}），本次不自动循环重试。`});
    const raw=await response.json();const text=raw.choices?.[0]?.message?.content||raw.output?.filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
    if(!text||raw.status==='incomplete'||raw.choices?.[0]?.finish_reason==='length')return send(502,{error:'模型未返回完整结构。'});
    let value;try{value=JSON.parse(text);}catch{return send(502,{error:'模型返回结构无法解析。'});}
    return send(200,{value:restoreFactIds(value,p.context,config.base),usage:raw.usage||{}});
   }catch{return send(502,{error:'模型连接失败或等待超时；固定文本可继续。'});}finally{active.delete(token);}
  }
  // 新版：客户端写好提示，服务端只代为转发并解析 JSON
  if(url.pathname==='/api/v2'){
   if(req.method!=='POST')return send(405,{error:'仅支持POST。'});
   if(req.headers['x-changyong-request']!=='1'||req.headers.origin&&req.headers.origin!=='http://'+host)return send(403,{error:'只接受当前本地游戏页面的请求。'});
   if(!config.key||!config.model)return send(503,{error:'服务端尚未配置AI模型。'});
   if(active.size>=3)return send(429,{error:'请求太多，请稍后再试。'});
   const today=new Date().toISOString().slice(0,10);if(day!==today){day=today;calls=0;}if(calls>=Math.max(config.limit,1000))return send(429,{error:'今日调用上限已到。'});
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>24000)return send(413,{error:'上下文过长。'});}let p;try{p=JSON.parse(raw);}catch{return send(400,{error:'请求不是有效JSON。'});}
   if(typeof p.system!=='string'||typeof p.user!=='string'||p.system.length>8000||p.user.length>12000)return send(400,{error:'请求字段不完整。'});
   const token=Symbol();active.add(token);calls++;
   try{const value=await callModel(config,fetcher,p.system,p.user);return send(200,{value});}
   catch(e){return send(502,{error:e.message||'模型连接失败。'});}finally{active.delete(token);}
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(405,{error:'此路径只接受读取。'});
  const pathname=decodeURIComponent(url.pathname);if(!['/','/index.html','/styles.css'].includes(pathname)&&!/^\/(src|assets)\/[\w/.-]+$/.test(pathname))return send(404,{error:'文件不存在。'});
  const target=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(ROOT+path.sep))return send(403,{error:'路径无效。'});
  const ext=path.extname(target);if(!Object.hasOwn(TYPES,ext))return send(404,{error:'文件类型未开放。'});
  const bytes=await readFile(target);res.writeHead(200,{'Content-Type':TYPES[ext],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(err){if(!res.headersSent)send(err.code==='ENOENT'?404:500,{error:err.code==='ENOENT'?'文件不存在。':'本地服务暂时无法处理请求。'});else res.end();}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT)||5173;const server=makeServer();server.listen(port,'127.0.0.1',()=>console.log(`重生长雍帝王赋 · 本地开发版\nhttp://127.0.0.1:${port}`));server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口${port}已占用，可使用 PORT=其他端口 npm start。`:'启动失败：'+e.code);process.exitCode=1;});
}
