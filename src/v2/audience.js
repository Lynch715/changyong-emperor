import {PEOPLE} from './data.js';
import {SECONDARIES} from './roster.js';
// 设备上的阅读偏好，与游戏存档分开保存。
export const AUDIENCE_KEY='changyong-v2-audience-v1';
export function audienceOf(storage=globalThis.localStorage){try{const v=JSON.parse(storage?.getItem(AUDIENCE_KEY)||'null');return {confirmed:v?.version===1&&v.confirmed===true,tenderness:v?.version===1&&v.confirmed===true&&v.tenderness!==false};}catch{return {confirmed:false,tenderness:false};}}
export function confirmAge(storage=globalThis.localStorage){const v={version:1,confirmed:true,tenderness:true};storage.setItem(AUDIENCE_KEY,JSON.stringify(v));return v;}
export function setTenderness(on,storage=globalThis.localStorage){if(!audienceOf(storage).confirmed)throw Error('请先确认年龄。');storage.setItem(AUDIENCE_KEY,JSON.stringify({version:1,confirmed:true,tenderness:!!on}));}
export const KIN=new Set(['C05','C21','C24','C25','C26','C42','C43']);
// 能写亲密的人：恋爱主线、后宫妃嫔、南风馆两位。宗室兄弟、太后、大臣、其余太监宫女一律不在内
export const INTIMATE=new Set(['C02','C03','C04','C06','C07','C08','C09','C10','N01','N02']);
export const intimateEligible=id=>!KIN.has(id)&&(INTIMATE.has(id)||SECONDARIES[id]?.category==='妃嫔');
export const canBeTender=(s,id)=>!!s.people[id]&&PEOPLE[id]?.adult===true&&intimateEligible(id)&&!s.people[id].knot&&s.people[id].aff>=65;
export function tendernessGuide(s,id,kind,{letter=false,fate=null,storage=globalThis.localStorage}={}){
 if(!['night','private-chat','rest'].includes(kind)||letter||!audienceOf(storage).tenderness||!canBeTender(s,id)||(fate&&!fate.free&&fate.tier<=1))return '';
 return '\n成人描写：这是成人向作品，玩家已确认年满十八岁。两人私下亲密时，可以直白、具体地描写亲吻、爱抚、身体与性爱，不必用含蓄、省略或转场回避；按皇上的安排和两人的情分来写，着重人物的情绪、反应与回应，写出各自的性格。称呼与礼数照旧，情愿出于情分，不出于畏惧。硬性边界：两人都是成年人，不写稚气的外貌或言行；对方要有明确的意愿与回应，不写强迫、胁迫、药物、趁醉或性暴力；只写两人私下，不写旁人观看。';
}
// 自拟安排能否写进亲密内容：开关打开且对方在名单内
export function explicitAllowed(s,id,storage=globalThis.localStorage){return !!s&&!!id&&audienceOf(storage).tenderness&&canBeTender(s,id);
}
export const quietRefusal=t=>typeof t!=='string'||!t.trim()||/(?:作为.{0,8}(?:AI|人工智能)|语言模型|无法(?:生成|提供)|不能(?:生成|提供).{0,12}内容|I cannot (?:help|assist)|I'm sorry)/i.test(t);
