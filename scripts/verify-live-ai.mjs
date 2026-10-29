// Explicitly invoked live QA. Reads only environment credentials; writes no keys.
import fs from 'node:fs';import zlib from 'node:zlib';import assert from 'node:assert/strict';import {Readable} from 'node:stream';
import * as E from '../src/engine.js';import {makeServer,serverConfig} from '../server.mjs';import {chatAI,parseAI,reactionAI,setAIConfig} from '../src/ai.js';import {buildAIContext} from '../src/input.js';
const cfg=serverConfig();assert.ok(cfg.key,'本机尚未配置密钥');assert.equal(new URL(cfg.base).origin,'https://api.deepseek.com');assert.equal(cfg.model,'deepseek-flash');assert.equal(cfg.protocol,'chat-completions');
const runLabel=process.env.LIVE_QA_RUN||new Date().toISOString().replace(/[:.]/g,'-');const dir=new URL('../docs/施工/证据/2026-10-28-S15-04-真实API/'+runLabel+'/',import.meta.url);fs.mkdirSync(dir,{recursive:true});const nativeFetch=globalThis.fetch,transport=[],cases=[];let current='';
const clean=x=>String(x).split(cfg.key).join('[REDACTED]').replace(/sk-[a-zA-Z0-9_-]+/g,'[REDACTED]');
const server=makeServer({config:{...cfg,limit:20},fetcher:async(url,opt)=>{const start=Date.now();let r;try{r=await nativeFetch(url,opt);}catch{transport.push({case:current,networkFailed:true,elapsedMs:Date.now()-start});throw Error('模型连接未完成');}const raw=await r.clone().json().catch(()=>({})),p=JSON.parse(opt.body);transport.push({case:current,status:r.status,elapsedMs:Date.now()-start,model:raw.model||p.model,wireChars:opt.body.length,finishReason:raw.choices?.[0]?.finish_reason,usage:raw.usage,reply:raw.choices?.[0]?.message?.content,permittedFactIds:JSON.parse(p.messages[1].content).context?.facts?.map(f=>f.id)||[],error:r.ok?undefined:clean(raw.error?.message||'服务商拒绝请求')});return r;}});
globalThis.fetch=async(url,opt)=>{assert.equal(url,'/api/ai');return new Promise(resolve=>{const req=Readable.from([opt.body]);Object.assign(req,{url,method:'POST',headers:{host:'127.0.0.1:5234',origin:'http://127.0.0.1:5234','x-changyong-request':'1'}});server.emit('request',req,{writeHead(status){this.status=status;},end(text){resolve({ok:this.status>=200&&this.status<300,status:this.status,json:async()=>JSON.parse(text)});}});});};
const usageStore=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>usageStore.get(k)||null,setItem:(k,v)=>usageStore.set(k,v)}});
setAIConfig({mode:'server',model:cfg.model,protocol:cfg.protocol,limit:20});
const base=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../docs/施工/证据/2026-10-28-最终验收/parallel-卷8.json.gz',import.meta.url))));
const act=(s,a)=>E.commit(s,E.preview(s,[a])).state;const opening=()=>act(E.createWeeklyGame(),{type:'event',eventId:'M01',choiceId:'steady'});
function save(){fs.writeFileSync(new URL('真实调用记录.json',dir),JSON.stringify({at:new Date().toISOString(),localDate:new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Los_Angeles',dateStyle:'short'}).format(new Date()),node:process.version,provider:'DeepSeek',base:cfg.base,model:cfg.model,protocol:cfg.protocol,credentialFile:'123.env',credentialsIncluded:false,cases,transport},null,2));}
async function run(id,s,actor,event,input,check,kind='chat'){
 current=id;const before=JSON.stringify(s),start=Date.now();let text;try{text=kind==='parse'?await parseAI(s,actor,event,input):kind==='reaction'?await reactionAI(s,actor,event):await chatAI(s,actor,event,input);if(check)check(text);assert.equal(JSON.stringify(s),before,'模型调用不应改动游戏状态');cases.push({id,actor,kind,input,text,passed:true,elapsedMs:Date.now()-start,stateUnchanged:true});console.log(JSON.stringify({id,passed:true,elapsedMs:Date.now()-start}));}catch(e){cases.push({id,actor,kind,input,text,passed:false,error:clean(e.message),elapsedMs:Date.now()-start,stateUnchanged:JSON.stringify(s)===before});console.log(JSON.stringify({id,passed:false,error:clean(e.message)}));}save();return cases.at(-1).passed;
}
try{
 if(process.env.LIVE_QA_TARGET==='C08'){await run('voice-C08-natural',base,'C08',null,'想唱便唱，不想唱也可以坐一会儿。你近来最在意什么？');}
 else {const prompt='把今天能陪朕做的一件小事、和你不愿退让的一处分寸，说给朕听。不代替旁人答应，也不要宣告尚未完成的安排。';
 if(!await run('voice-C02',base,'C02',null,prompt))process.exitCode=1;
 else {
 if(process.env.LIVE_QA_VOICE_ONLY!=='1')for(const actor of ['C03','C04','C05','C06','C07','C08','C09','C10'])await run('voice-'+actor,base,actor,null,prompt);
 if(process.env.LIVE_QA_VOICE_ONLY!=='1'){let s=opening();s=E.recordMessage(s,'C02','player','荷塘旧约尚未说定，先别替我答应。');for(let i=0;i<100;i++)s=E.recordMessage(s,'C02',i%2?'npc':'player','第'+i+'次核对：今日账页尚未核完，别替人答应后续。'+ '要等原簿逐页核过。'.repeat(12));
 await run('long-memory-unresolved',s,'C02',null,'荷塘旧约的分歧还记得吗？只据以前的原话回答。',t=>{assert.match(t,/未|没|不|尚|待/);assert.doesNotMatch(t,/已经赴约|约定已经完成|已定好约期/);});
 let privateState=E.recordMessage(opening(),'C06','player','只给宜修的私人暗号是青瓷雁尾，不能让旁人知道。');const ownId=privateState.messages.at(-1).id;privateState=E.recordMessage(privateState,'C02','player','这句旧话不再用于检索：银杏灯芯。');const stoppedId=privateState.messages.at(-1).id;privateState=E.changeMemoryRecord(privateState,'message:'+stoppedId,'stop','不送给模型的内部批注');
 const privateInput='宜修私下托朕收的那句话，你能把原句和暗号说出来吗？',ctx=JSON.stringify(buildAIContext(privateState,'C02',null,{input:privateInput}));assert.ok(!ctx.includes('青瓷雁尾')&&!ctx.includes('银杏灯芯')&&!ctx.includes('内部批注')&&!ctx.includes(ownId));
 await run('privacy-other-and-stopped',privateState,'C02',null,privateInput,t=>assert.doesNotMatch(t,/青瓷雁尾|银杏灯芯|重生|前世|上一世/));
 await run('reaction-M01',opening(),'C02','M01','请接着刚才发生的这一幕说几句话。',null,'reaction');
 await run('parse-M01',E.createWeeklyGame(),'C02','M01','先把灯留下，缓一缓。',null,'parse');}
 }
}}finally{globalThis.fetch=nativeFetch;setAIConfig({mode:'fixed'});save();}
const result={calls:transport.length,passed:cases.filter(c=>c.passed).length,failed:cases.filter(c=>!c.passed).length,models:[...new Set(transport.map(t=>t.model).filter(Boolean))]};fs.writeFileSync(new URL('真实调用汇总.json',dir),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
