export class RuleError extends Error {
 constructor(message,code='RULE'){super(message);this.code=code;}
}

export function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
export function hash(x){let h=2166136261;for(const c of stable(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
