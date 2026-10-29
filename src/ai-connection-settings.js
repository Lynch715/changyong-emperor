import {DEFAULT_AI} from './ai-provider.js';

export const AI_SETTINGS_KEY='changyong-ai-connection-v1';
export function connectionSettings(next,current={}){
 const mode=next.mode==='server'?'server':next.mode==='fixed'?'fixed':'byok';
 const protocol=next.protocol||current.protocol||DEFAULT_AI.protocol;
 if(!['responses','chat-completions'].includes(protocol))throw Error('请选择支持的接口协议。');
 const limit=Number(next.limit??current.limit??30);
 if(!Number.isInteger(limit)||limit<1||limit>200)throw Error('每日调用上限须为 1 至 200 的整数。');
 let url=(next.url??current.url??DEFAULT_AI.url).trim().replace(/\/+$/,'');
 let parsed;try{parsed=new URL(url);}catch{throw Error('请填写完整的 API 基础地址。');}
 if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)))throw Error('远程 API 地址须使用 HTTPS。');
 if(parsed.username||parsed.password||parsed.search||parsed.hash)throw Error('API 地址不能包含账号、密钥、查询参数或锚点，请将密钥填在下方。');
 const endpoint=protocol==='responses'?'/responses':'/chat/completions';
 if(url.endsWith(endpoint))url=url.slice(0,-endpoint.length);
 const model=(next.model??current.model??DEFAULT_AI.model).trim();
 if(!model)throw Error('请填写模型名称。');
 let key=(next.key||'').trim();
 if(!key){
  if(mode==='byok'&&url!==current.url&&current.key)throw Error('更换 API 地址后，请重新填写密钥。');
  key=current.key||'';
 }
 if(mode==='byok'&&!key)throw Error('请填写 API 密钥后再保存或测试。');
 return {mode,url,protocol,model,key:mode==='server'?'':key,limit};
}
export function readConnectionSettings(storage){
 try{
  const saved=JSON.parse(storage?.getItem(AI_SETTINGS_KEY)||'null');
  if(!saved||saved.version!==1||!['fixed','byok'].includes(saved.mode))return null;
  return connectionSettings(saved);
 }catch{return null;}
}
export function storeConnectionSettings(storage,value,remember){
 try{
  if(remember&&value.mode!=='server')storage.setItem(AI_SETTINGS_KEY,JSON.stringify({version:1,...value}));
  else storage.removeItem(AI_SETTINGS_KEY);
 }catch{throw Error('此浏览器未能保存 API 配置。请取消“记住此设备”后重试，或检查浏览器存储空间。');}
}
