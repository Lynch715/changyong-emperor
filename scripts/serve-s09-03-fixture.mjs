// Isolated local acceptance fixture. Never contacts a provider or production save.
import fs from'node:fs';import path from'node:path';import{fileURLToPath}from'node:url';import{makeServer}from'../server.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),logPath=path.join(root,'docs/施工/证据/2026-10-25-S09-03/模拟API请求记录.json'),requests=[];
export function fixtureServer(){return makeServer({config:{key:'TEST_ONLY_LOCAL',model:'S09-03-local-fixture',base:'https://fixture.invalid/v1',protocol:'responses',limit:100},fetcher:async(_url,options)=>{
 const body=JSON.parse(options.body),p=JSON.parse(body.input),actor=p.context.actorId;let value;
 if(p.kind==='parse'){
  const source=p.input.split(/[，,]/).at(-1),first=p.context.actionCatalog[0];
  value={segments:p.input.includes('不爱浓茶')?[{kind:'boundary',text:'朕不爱浓茶',intent:'终止恋爱'}]:[],actions:[{type:'candidate',candidateId:first?.id||'A1',sourceText:first?.sourceText||source}],clarifications:[]};
 }else value={speakerId:actor,text:p.input.includes('今日的小事')?'先坐稳，慢慢说。你想从哪一件小事说起？':'你我已经成婚，我们的孩子已经出生了。柳树井已经修好。',factIds:[]};
 requests.push({kind:p.kind,input:p.input,actor,catalogCount:p.context.actionCatalog?.length??null,contextKeys:Object.keys(p.context),fullSaveAbsent:!('weekly'in p.context)&&!('transactions'in p.context),response:value});fs.writeFileSync(logPath,JSON.stringify(requests,null,2));
 return{ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:1,output_tokens:1}})};
 }});}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||5194,server=fixtureServer();server.listen(port,'127.0.0.1',()=>console.log('S09-03 local fixture only: http://127.0.0.1:'+port));}
