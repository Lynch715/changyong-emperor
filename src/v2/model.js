// 调用模型，返回解析后的 JSON。本地服务端与浏览器直连共用。
const isDeepSeek=base=>{try{return new URL(base).hostname==='api.deepseek.com';}catch{return false;}};
export async function callModel(config,fetcher,system,user){
 const deepseek=isDeepSeek(config.base),responses=config.protocol==='responses';
 const body=responses?{model:config.model,store:false,instructions:system,input:user,max_output_tokens:900,text:{format:{type:'json_object'}},...(deepseek?{reasoning:{effort:'none'}}:{})}
  :{model:config.model,messages:[{role:'system',content:system},{role:'user',content:user}],max_tokens:900,temperature:0.9,response_format:{type:'json_object'},...(deepseek?{thinking:{type:'disabled'}}:{})};
 const endpoint=config.base.replace(/\/+$/,'')+(responses?'/responses':'/chat/completions');
 let r;try{r=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.key},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});}catch{throw Error('模型连接失败或超时。');}
 if(!r.ok)throw Error(`模型服务暂不可用（${r.status}）。`);
 const raw=await r.json();const text=raw.choices?.[0]?.message?.content||raw.output?.filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
 if(!text)throw Error('模型没有返回内容。');
 try{return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw Error('模型返回的格式无法解析。');}
}
