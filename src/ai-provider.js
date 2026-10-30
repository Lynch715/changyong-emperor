// 新版浏览器配置和本地代理共用的默认连接。
export const DEFAULT_AI={url:'https://api.deepseek.com',model:'deepseek-flash',protocol:'chat-completions'};
export function isDeepSeek(base){try{return new URL(base).hostname==='api.deepseek.com';}catch{return false;}}
