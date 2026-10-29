import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_AI} from '../src/ai-provider.js';
import {AI_SETTINGS_KEY,connectionSettings,readConnectionSettings} from '../src/ai-connection-settings.js';
import {getAIConfig,setAIConfig,saveAIConnection,restoreAIConnection,remembersAIConnection,pauseAIConnection,clearAIConnection,testAIConnection,getUsage} from '../src/ai.js';
import {renderAISettings} from '../src/ai-settings-ui.js';
import {createGame,createWeeklyGame} from '../src/engine.js';
import {storageForWorld} from '../src/storage.js';

class Storage{map=new Map();getItem(key){return this.map.get(key)??null;}setItem(key,value){this.map.set(key,String(value));}removeItem(key){this.map.delete(key);}}
const form=extra=>({mode:'byok',...DEFAULT_AI,key:'TEST_ONLY_DEVICE_KEY',limit:30,...extra});
function reset(){setAIConfig({mode:'fixed',...DEFAULT_AI,key:'',limit:30});}

test('完整接口地址自动整理；不允许远程HTTP、地址内凭据或查询密钥',()=>{
 assert.equal(connectionSettings(form({url:DEFAULT_AI.url+'/chat/completions/'})).url,DEFAULT_AI.url);
 assert.equal(connectionSettings(form({url:'https://fixture.invalid/v1/responses',protocol:'responses'})).url,'https://fixture.invalid/v1');
 for(const url of ['http://fixture.invalid','https://user:password@fixture.invalid','https://fixture.invalid?key=secret','https://fixture.invalid#key'])assert.throws(()=>connectionSettings(form({url})));
 assert.equal(connectionSettings(form({url:'http://127.0.0.1:8080/v1'})).url,'http://127.0.0.1:8080/v1');
 for(const limit of [0,201,1.5,'oops'])assert.throws(()=>connectionSettings(form({limit})));
});

test('更换地址不能把旧密钥静默发送给另一接口',()=>{
 const current=connectionSettings(form());
 assert.equal(connectionSettings(form({key:''}),current).key,current.key);
 assert.throws(()=>connectionSettings(form({key:'',url:'https://another.invalid/v1'}),current),/重新填写密钥/);
 assert.equal(connectionSettings(form({key:'NEW_TEST_ONLY',url:'https://another.invalid/v1'}),current).key,'NEW_TEST_ONLY');
});

test('未勾选记住时只在当前会话启用，不落盘，也不暴露密钥给渲染配置',()=>{
 reset();const storage=new Storage();saveAIConnection(form(),{storage});
 assert.equal(getAIConfig().mode,'byok');assert.equal(getAIConfig().hasKey,true);assert.equal(getAIConfig().key,undefined);
 assert.equal(storage.getItem(AI_SETTINGS_KEY),null);assert.equal(storage.getItem('changyong-ai-optout'),'0');
 reset();assert.equal(restoreAIConnection(storage),false);assert.equal(getAIConfig().hasKey,false);
});

test('主动记住后刷新可恢复；重复保存空白密钥沿用已有值',()=>{
 reset();const storage=new Storage();saveAIConnection(form(),{remember:true,storage});
 assert.equal(remembersAIConnection(storage),true);assert.equal(readConnectionSettings(storage).key,'TEST_ONLY_DEVICE_KEY');
 reset();assert.equal(restoreAIConnection(storage),true);assert.equal(getAIConfig().mode,'byok');assert.equal(getAIConfig().hasKey,true);
 saveAIConnection(form({key:'',model:'another-model'}),{remember:true,storage});
 assert.equal(readConnectionSettings(storage).key,'TEST_ONLY_DEVICE_KEY');assert.equal(readConnectionSettings(storage).model,'another-model');
});

test('取消记住会移除以前存储的密钥，仍可在当前会话使用',()=>{
 reset();const storage=new Storage();saveAIConnection(form(),{remember:true,storage});saveAIConnection(form({key:''}),{remember:false,storage});
 assert.equal(storage.getItem(AI_SETTINGS_KEY),null);assert.equal(getAIConfig().hasKey,true);reset();assert.equal(restoreAIConnection(storage),false);
});

test('暂停在下次打开仍保持固定剧情，连接保留供再次启用',()=>{
 reset();const storage=new Storage();saveAIConnection(form(),{remember:true,storage});pauseAIConnection(storage);
 assert.equal(getAIConfig().mode,'fixed');assert.equal(storage.getItem('changyong-ai-optout'),'1');
 reset();restoreAIConnection(storage);assert.equal(getAIConfig().mode,'fixed');assert.equal(getAIConfig().hasKey,true);
 saveAIConnection(form({key:''}),{remember:true,storage});assert.equal(getAIConfig().mode,'byok');
});

test('清除配置移除磁盘与内存密钥，所有游戏记录逐字保持',()=>{
 reset();const storage=new Storage();const save='{"state":"original save bytes"}';storage.setItem('changyong-weekly',save);storage.setItem('changyong-manual-1','manual bytes');
 saveAIConnection(form(),{remember:true,storage});clearAIConnection(storage);
 assert.equal(getAIConfig().mode,'fixed');assert.equal(getAIConfig().hasKey,false);assert.equal(storage.getItem(AI_SETTINGS_KEY),null);
 assert.equal(storage.getItem('changyong-weekly'),save);assert.equal(storage.getItem('changyong-manual-1'),'manual bytes');
});

test('季度与周制的当前存档和全部档案导出均不包含已记住的密钥',()=>{
 for(const world of ['quarter','weekly']){
  reset();const storage=new Storage(),slots=storageForWorld(world,storage),state=world==='weekly'?createWeeklyGame():createGame();
  slots.saveEnvelope(state,null);slots.saveManual(state,0);const original=storage.getItem(slots.STORAGE_KEY);
  saveAIConnection(form(),{remember:true,storage});
  for(const raw of [slots.exportSave(state),slots.exportArchive()]){assert.ok(!raw.includes('TEST_ONLY_DEVICE_KEY'));assert.ok(!raw.includes(AI_SETTINGS_KEY));}
  pauseAIConnection(storage);clearAIConnection(storage);assert.equal(storage.getItem(slots.STORAGE_KEY),original);
 }
});

test('损坏、过期或无效的已存配置不触发启用，也不触碰游戏存档',()=>{
 reset();const storage=new Storage();storage.setItem('game-save','unchanged');
 for(const raw of ['{bad',JSON.stringify({...form(),version:99}),JSON.stringify({...form({url:'http://untrusted.invalid'}),version:1}),JSON.stringify({...form({key:''}),version:1})]){
  storage.setItem(AI_SETTINGS_KEY,raw);assert.equal(restoreAIConnection(storage),false);assert.equal(getAIConfig().mode,'fixed');assert.equal(storage.getItem('game-save'),'unchanged');
 }
});

test('记住写入失败时保持原连接，不误报已启用或泄露密钥',()=>{
 reset();const before=getAIConfig(),storage={setItem(){throw Error('storage unavailable');},removeItem(){}};
 assert.throws(()=>saveAIConnection(form(),{remember:true,storage}),error=>/未能保存/.test(error.message)&&!error.message.includes('TEST_ONLY'));
 assert.deepEqual(getAIConfig(),before);
});

test('连接测试只发送独立检查，不启用草稿、不保存密钥、不携带游戏原档',async()=>{
 reset();const storage=new Storage(),oldStorage=globalThis.localStorage,oldFetch=globalThis.fetch,before=getAIConfig();let captured;
 storage.setItem('game-save','PRIVATE_GAME_SAVE_MARKER');globalThis.localStorage=storage;
 globalThis.fetch=async(url,options)=>{captured={url,options};return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({speakerId:'C02',text:'连接正常',factIds:[]})}}],usage:{prompt_tokens:5,completion_tokens:2}})};};
 try{
  assert.deepEqual(await testAIConnection(form()),{ok:true,model:DEFAULT_AI.model});
  assert.equal(captured.url,DEFAULT_AI.url+'/chat/completions');assert.equal(captured.options.headers.Authorization,'Bearer TEST_ONLY_DEVICE_KEY');
  assert.ok(!captured.options.body.includes('PRIVATE_GAME_SAVE_MARKER'));assert.ok(!captured.options.body.includes('TEST_ONLY_DEVICE_KEY'));
  assert.deepEqual(getAIConfig(),before);assert.equal(storage.getItem(AI_SETTINGS_KEY),null);assert.equal(storage.getItem('game-save'),'PRIVATE_GAME_SAVE_MARKER');assert.equal(getUsage().calls,1);
 }finally{globalThis.localStorage=oldStorage;globalThis.fetch=oldFetch;}
});

test('Responses协议的连接检查可用；网络错误与不兼容回复给出中文且不泄露原始错误',async()=>{
 reset();const oldStorage=globalThis.localStorage,oldFetch=globalThis.fetch;globalThis.localStorage=new Storage();
 try{
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({speakerId:'C02',text:'连接正常',factIds:[]})}]}]})});
  assert.equal((await testAIConnection(form({url:'https://fixture.invalid/v1',protocol:'responses'}))).ok,true);
  globalThis.fetch=async()=>({ok:true,json:async()=>({choices:[{message:{content:'not JSON'}}]})});await assert.rejects(testAIConnection(form()),/JSON/);
  globalThis.fetch=async()=>({ok:false,status:401});await assert.rejects(testAIConnection(form()),/HTTP 401/);
  globalThis.fetch=async()=>{throw Error('TEST_ONLY_DEVICE_KEY leaked transport message');};await assert.rejects(testAIConnection(form()),error=>/跨域/.test(error.message)&&!error.message.includes('TEST_ONLY'));
 }finally{globalThis.localStorage=oldStorage;globalThis.fetch=oldFetch;}
});

test('API设置渲染不含密钥，显示记住状态，并按文本转义服务商字段',()=>{
 reset();saveAIConnection(form(),{storage:new Storage()});
 const html=renderAISettings({...getAIConfig(),model:'<script>untrusted</script>'},{remembered:true});
 assert.ok(!html.includes('TEST_ONLY_DEVICE_KEY'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('name="remember" type="checkbox" checked'));
 assert.ok(html.includes('保存并启用 API'));assert.ok(html.includes('测试连接'));assert.ok(html.includes('清除本机 API 配置'));assert.ok(!html.includes('value="server"'));
 const proxy=renderAISettings({...getAIConfig(),mode:'server'},{configured:true});assert.ok(proxy.includes('id="byok-fields" hidden disabled'));
});
