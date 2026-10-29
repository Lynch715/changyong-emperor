// QA server only: delayed/success/failure provider replies are generated here.
// It exposes the normal game routes; there is no game-state or jump-year API.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {makeServer} from '../server.mjs';
const log=fileURLToPath(new URL('../docs/施工/证据/2026-10-25-S09-06/IAB模拟请求.json',import.meta.url));
const requests=[];
function save(){fs.writeFileSync(log,JSON.stringify(requests,null,2));}
const server=makeServer({config:{key:'TEST_ONLY_LOCAL',model:'S09-06-local-fixture',base:'https://fixture.invalid/v1',protocol:'responses',limit:100},fetcher:async(_url,options)=>{
 const body=JSON.parse(options.body),p=JSON.parse(body.input),eventId=p.context.event?.id,choice=p.context.reaction?.choice||'';
 const slow=eventId==='M01'&&choice==='把灯留下，先缓一缓',failure=eventId==='M01'&&choice==='问清年款，再问故人的近况';
 const item={sequence:requests.length+1,kind:p.kind,eventId,choice,startedAt:new Date().toISOString(),phase:'waiting',slow,failure,context:p.context};requests.push(item);save();
 if(slow)await new Promise(resolve=>setTimeout(resolve,6000));
 if(failure){item.phase='failed';item.finishedAt=new Date().toISOString();save();throw Error('Local QA provider failure');}
 const value={speakerId:p.context.actorId,text:slow?'旧幕那盏灯还亮着，奴才先在帘外候着。':'这盏茶还暖，奴才便把刚才的话慢慢说完。',factIds:[]};
 item.phase='returned';item.finishedAt=new Date().toISOString();item.response=value;save();
 return{ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:1,output_tokens:1}})};
}});
const port=Number(process.env.PORT)||5204;
server.listen(port,'127.0.0.1',()=>console.log('S09-06 local QA: http://127.0.0.1:'+port));
