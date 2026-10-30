import http from 'node:http';
import {DEFAULT_AI,isDeepSeek} from './src/ai-provider.js';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
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
  const pathname=decodeURIComponent(url.pathname);if(!['/','/index.html'].includes(pathname)&&!/^\/(src|assets)\/[\w/.-]+$/.test(pathname))return send(404,{error:'文件不存在。'});
  const target=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(ROOT+path.sep))return send(403,{error:'路径无效。'});
  const ext=path.extname(target);if(!Object.hasOwn(TYPES,ext))return send(404,{error:'文件类型未开放。'});
  const bytes=await readFile(target);res.writeHead(200,{'Content-Type':TYPES[ext],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(err){if(!res.headersSent)send(err.code==='ENOENT'?404:500,{error:err.code==='ENOENT'?'文件不存在。':'本地服务暂时无法处理请求。'});else res.end();}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT)||5173;const server=makeServer();server.listen(port,'127.0.0.1',()=>console.log(`重生长雍帝王赋 · 本地开发版\nhttp://127.0.0.1:${port}`));server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口${port}已占用，可使用 PORT=其他端口 npm start。`:'启动失败：'+e.code);process.exitCode=1;});
}
