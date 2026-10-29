// Local QA transport only. The dummy provider is an in-process function.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {makeServer} from '../server.mjs';
const log=fileURLToPath(new URL('../docs/施工/证据/2026-10-25-S09-05/IAB模拟请求.json',import.meta.url)),requests=[];
const server=makeServer({config:{key:'TEST_ONLY_LOCAL',model:'S09-05-local-fixture',base:'https://fixture.invalid/v1',protocol:'responses',limit:30},fetcher:async(_url,options)=>{
 const wire=JSON.parse(options.body),p=JSON.parse(wire.input),raw=JSON.stringify(p.context),old=raw.includes('荷塘旧约尚未说定，先别替我答应。');
 const value=p.kind==='parse'?{segments:[],actions:[],clarifications:['unsupported']}:{speakerId:p.context.actorId,text:old?'那句荷塘旧约尚未说定的话还在，先别替谁答应。你愿说，我便听完；原来的约定仍等实际赴约。':'这句话眼下没有可用的旧记录，我先听你现在怎么说。',factIds:[]};
 requests.push({kind:p.kind,input:p.input,requestChars:p.context.contextBudget.requestChars,providerWireChars:options.body.length,context:p.context,oldSourceFound:old,otherPrivateAbsent:!raw.includes('仅宜修听过的私下核对'),retiredPreferenceAbsent:!raw.includes('朕不爱浓茶'),response:value});
 fs.writeFileSync(log,JSON.stringify(requests,null,2));
 return{ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:1,output_tokens:1}})};
}});
server.listen(Number(process.env.PORT)||5202,'127.0.0.1',()=>console.log('S09-05 local QA fixture: http://127.0.0.1:5202'));
