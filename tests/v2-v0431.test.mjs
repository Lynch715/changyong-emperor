import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import * as AI from '../src/v2/ai.js';
import {childPlanAllowed,filterChildSentences,planAllowed} from '../src/v2/plans.js';
import {confirmAge,setTenderness} from '../src/v2/audience.js';

const ready=()=>{const s=E.newGame(431);s.agenda=[];s.year=11;s.month=3;Object.assign(s.people.C09,{aff:85,met:true,lover:true});s.children=[{id:'K01',mother:'C09',name:'弘昀',sex:'男',born:'1-3',art:{},traits:[],notes:[]},{id:'K02',mother:'C09',name:'静宁',sex:'女',born:'2-3',art:{},traits:[],notes:[]}];return s;};
class Storage{data=new Map();getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,String(v));}removeItem(k){this.data.delete(k);}}
async function withModel(value,fn,{byok=false}={}){
 const oldFetch=globalThis.fetch,oldStorage=globalThis.localStorage,oldDoc=globalThis.document,storage=new Storage(),calls=[];
 globalThis.localStorage=storage;globalThis.document=undefined;confirmAge(storage);
 globalThis.fetch=async(url,options)=>{
  if(url==='/api/status')return {ok:true,json:async()=>({configured:!byok})};
  calls.push(JSON.parse(options.body));
  return {ok:true,json:async()=>byok?{choices:[{message:{content:JSON.stringify(value)}}]}:{value}};
 };
 try{
  if(byok)await AI.saveConnection({url:'https://model.example.test/v1',model:'fixture',key:'test-key'},true,storage);
  else await AI.initAI(storage);
  return await fn({calls,storage});
 }finally{
  await AI.initAI({getItem:()=> '1'});globalThis.fetch=oldFetch;globalThis.localStorage=oldStorage;globalThis.document=oldDoc;
 }
}

test('0.43.1 生母依偎不因孩子背景误伤，逗号内的明确成人主语单独识别',()=>{
 const s=ready();
 for(const text of ['孩子睡了，甄嬛依偎在你肩头','孩子睡了，她依偎过来','孩子睡了，甄嬛轻轻依偎在你肩头，弘昀睡得安稳']){
  assert.equal(childPlanAllowed(text,'C09',s),true,text);assert.equal(planAllowed(text,'C09',s),true,text);assert.equal(filterChildSentences(text,'C09',s),text);
 }
 assert.equal(childPlanAllowed('孩子睡了，甄嬛依偎在你肩头',null,s),true);
 for(const text of ['孩子依偎在你肩头','弘昀走过来，她依偎在你肩头','公主睡了，她依偎在你肩头'])assert.equal(childPlanAllowed(text,null,s),false,text);
 assert.equal(childPlanAllowed('依偎在你肩头','K01',s),false);
});

test('0.43.1 牵手、拥抱与哄睡按亲情放行，孩子可作为显式或当前目标对象',()=>{
 const s=ready();
 for(const text of ['牵着弘昀的手去御花园','抱一抱孩子','拍着孩子睡','拥抱孩子','拥抱弘昀','皇上拥抱了小公主','你与静宁牵手去看花']){
  assert.equal(planAllowed(text,null,s),true,text);assert.equal(filterChildSentences(text,null,s),text);
 }
 for(const text of ['牵手','拥抱','牵着弘昀的手去御花园','抱一抱孩子','拍着孩子睡'])assert.equal(planAllowed(text,'K01',s),true,text);
 assert.equal(planAllowed('弘昀拥抱一个不明对象',null,s),false);
});

test('0.43.1 孩子指称与恋爱、亲吻或性词同句仍拦截，照顾动作不能提供豁免',()=>{
 const s=ready();
 for(const ref of ['皇嗣','皇子','公主','孩子','K01','弘昀','静宁'])for(const word of ['恋爱','亲吻','接吻','调情','婚配','伴侣','恋人','亲密','爱抚','侍寝','云雨','行房']){
  const text=`牵着${ref}的手，谈起${word}`;
  assert.equal(childPlanAllowed(text,'C09',s),false,text);assert.equal(planAllowed(text,'C09',s),false,text);assert.equal(filterChildSentences(text,'C09',s),'');
 }
 for(const id of ['K01','K02'])for(const word of ['恋爱','亲吻','调情','婚配','伴侣','侍寝'])assert.equal(planAllowed(word,id,s),false);
});

test('0.43.1 按五种句界删除违规句，保留前后安全文字、换行和标点',()=>{
 const s=ready();
 for(const boundary of ['。','！','？','；','\n']){
  const text=`先看一页书${boundary}亲吻弘昀${boundary}甄嬛依偎在你肩头。`;
  assert.equal(childPlanAllowed(text,'C09',s),false);assert.equal(filterChildSentences(text,'C09',s),`先看一页书${boundary}甄嬛依偎在你肩头。`);
  const safe=`弘昀去读书${boundary}甄嬛依偎在你肩头。`;
  assert.equal(childPlanAllowed(safe,'C09',s),true);assert.equal(filterChildSentences(safe,'C09',s),safe);
 }
 assert.equal(filterChildSentences('“亲吻孩子。”\n','C09',s),'');
 assert.equal(filterChildSentences('她端来茶。亲吻孩子！\n你们继续看书。','C09',s),'她端来茶。你们继续看书。');
});

test('0.43.1 玩家安排使用同句规则，原成人开关和其他禁令仍生效',()=>{
 const s=ready(),storage=new Storage();confirmAge(storage);
 assert.equal(planAllowed('弘昀去读书。甄嬛侍寝。','C09',s,storage),true);
 assert.equal(planAllowed('弘昀去读书，甄嬛侍寝。','C09',s,storage),false);
 setTenderness(false,storage);assert.equal(planAllowed('弘昀去读书。甄嬛侍寝。','C09',s,storage),false);
 for(const text of ['孩子睡了，甄嬛依偎在你肩头','牵着弘昀的手去御花园','拍着孩子睡'])assert.equal(planAllowed(text,'C09',s,storage),true);
 assert.equal(planAllowed('先去看孩子。强迫对方亲吻。','C09',s,storage),false);
 assert.equal(planAllowed('弘昀去读书。与皇弟恋爱。','C05',s,storage),false);
});

test('0.43.1 AI只删违规句，安全对白和安全记忆保留，不修改原返回对象或存档',async()=>{
 const value={reply:'孩子睡了，甄嬛依偎在你肩头。亲吻弘昀。她端来一盏热茶。',memory:'拥抱孩子。与弘昀恋爱。',affection:2,mood:'安心'};
 const original=structuredClone(value),s=ready(),before=JSON.stringify(s);
 await withModel(value,async()=>{
  const r=await AI.chatReply(s,'C09',[{who:'player',text:'说说今日的小事'}]);
  assert.equal(r.reply,'孩子睡了，甄嬛依偎在你肩头。她端来一盏热茶。');assert.equal(r.memory,'拥抱孩子。');assert.equal(r.affection,2);assert.equal(r.mood,'安心');
 });
 assert.deepEqual(value,original);assert.equal(JSON.stringify(s),before);
});

test('0.43.1 AI文本字段之间不互相误伤，真实换行按句界处理',async()=>{
 const s=ready();
 await withModel({reply:'甄嬛依偎在你肩头。',memory:'弘昀学了新字',affection:1},async()=>{const r=await AI.chatReply(s,'C09',[]);assert.equal(r.reply,'甄嬛依偎在你肩头。');assert.equal(r.memory,'弘昀学了新字');});
 await withModel({text:'弘昀去读书\n甄嬛依偎在你肩头。与公主恋爱。她递来热茶。',memory:'孩子读书',affection:2},async()=>{const r=await AI.nightScene(s,'C09');assert.equal(r.text,'弘昀去读书\n甄嬛依偎在你肩头。她递来热茶。');assert.equal(r.memory,'孩子读书');});
 await withModel({reply:'孩子睡了，她依偎过来。'},async()=>{assert.equal(await AI.giftReply(s,'C09','书',true),'孩子睡了，她依偎过来。');});
});

test('0.43.1 嵌套选项也只删违规句，并保留结构、资源数值和安全选项',async()=>{
 const s=ready(),value={title:'家常回报',body:'孩子在读书。亲吻弘昀。书声还在继续。',options:[{label:'送些书去。',effects:{health:1},reply:'弘昀谢过。与孩子恋爱。大家继续读书。'},{label:'陪孩子散步。',effects:{health:2},reply:'牵着弘昀的手去御花园。'}]};
 await withModel(value,async()=>{
  const r=await AI.edictFollow(s,{at:1,text:'送书去书房',narration:'已送到。'});
  assert.equal(r.body,'孩子在读书。书声还在继续。');assert.equal(r.options.length,2);assert.equal(r.options[0].reply,'弘昀谢过。大家继续读书。');assert.equal(r.options[0].effects.health,1);assert.equal(r.options[1].reply,'牵着弘昀的手去御花园。');
 });
});

test('0.43.1 违规句删光才回退固定文字，所有原AI显示入口一致',async()=>{
 const s=ready(),value={reply:'“亲吻孩子。”',text:'与弘昀恋爱。',narration:'亲吻公主。',body:'与孩子调情。',title:'回报',memory:'普通家常',affection:3,options:[]};
 await withModel(value,async()=>{
  for(const action of [()=>AI.chatReply(s,'C09',[]),()=>AI.giftReply(s,'C09','书',true),()=>AI.nightScene(s,'C09'),()=>AI.restScene(s,'喝茶',{companion:'C09'}),()=>AI.sceneEcho(s,'C09','家常','听完',''),()=>AI.edictResult(s,'送书去书房',['C09']),()=>AI.edictFollow(s,{at:1,text:'送书',narration:'已送到'})])assert.equal(await action(),null);
 });
});

test('0.43.1 浏览器直连模型也只删违规句，和本机服务行为一致',async()=>{
 const s=ready();
 await withModel({reply:'孩子睡了，甄嬛依偎在你肩头。亲吻弘昀。她递来茶。'},async()=>{assert.equal(AI.aiMode(),'byok');assert.equal(await AI.giftReply(s,'C09','书',true),'孩子睡了，甄嬛依偎在你肩头。她递来茶。');},{byok:true});
});
