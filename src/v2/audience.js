import {PEOPLE} from './data.js';
// 设备上的阅读偏好，与游戏存档分开保存。
export const AUDIENCE_KEY='changyong-v2-audience-v1';
export function audienceOf(storage=globalThis.localStorage){try{const v=JSON.parse(storage?.getItem(AUDIENCE_KEY)||'null');return {confirmed:v?.version===1&&v.confirmed===true,tenderness:v?.version===1&&v.confirmed===true&&v.tenderness!==false};}catch{return {confirmed:false,tenderness:false};}}
export function confirmAge(storage=globalThis.localStorage){const v={version:1,confirmed:true,tenderness:true};storage.setItem(AUDIENCE_KEY,JSON.stringify(v));return v;}
export function setTenderness(on,storage=globalThis.localStorage){if(!audienceOf(storage).confirmed)throw Error('请先确认年龄。');storage.setItem(AUDIENCE_KEY,JSON.stringify({version:1,confirmed:true,tenderness:!!on}));}
const KIN=new Set(['C05','C21','C24','C25','C26','C42','C43']);
export const canBeTender=(s,id)=>!!s.people[id]&&PEOPLE[id]?.adult===true&&!KIN.has(id)&&!s.people[id].knot&&s.people[id].aff>=65;
export function tendernessGuide(s,id,kind,{letter=false,fate=null,storage=globalThis.localStorage}={}){
 if(!['night','private-chat','rest'].includes(kind)||letter||!audienceOf(storage).tenderness||!canBeTender(s,id)||(fate&&!fate.free&&fate.tier<=1))return '';
 return '\n亲密氛围：只写明确成年、非亲属、双方自由自愿的温柔相处。可以牵手、拥抱、依偎或轻吻；重在情绪、对白与彼此照顾，点到为止，不写性行为或裸露细节。人物可以婉拒，皇帝的身份和赏赐不能代替对方的意愿。';
}
export const quietRefusal=t=>typeof t!=='string'||!t.trim()||/(?:作为.{0,8}(?:AI|人工智能)|语言模型|无法(?:生成|提供)|不能(?:生成|提供).{0,12}内容|I cannot (?:help|assist)|I'm sorry)/i.test(t);
