import {CHARACTERS} from './content.js';
export const sameAction=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const deniedAction=text=>/(?:不要|别再|别|无需|不必|先不|不想|暂不)(?:再|替朕|替我|给朕|给我)?(?:安排|拨款|拨|发放|送礼|送|赠|宴请|邀请|约|散步|私聊|写信|牵手|拥抱|留宿|备制|买|取消|撤销|改期|改到|改至|把.{0,24}(?:取消|撤销|改期|改到|改至))|(?:不与|不和|不陪).*(?:散步|私聊|见面|同游)/.test(text);
export const reportedIntent=text=>/^(?:你|他|她|他们|她们|听说|据说|上回|上次|从前|此前)|(?:你|他|她).{0,5}(?:说过|说的|喜欢|不爱)|[“「『].*(?:喜欢|合作|恋爱)/.test(text);
export const negatedBoundary=text=>/(?:不要|不想|不是|不愿).{0,3}(?:仅合作|只.*(?:合作|公事|君臣)|终止恋爱|到此为止)/.test(text);
export function ownsPreference(text){return !reportedIntent(text)&&!CHARACTERS.some(c=>text.includes(c.name)&&new RegExp(c.name+'.{0,6}(?:喜欢|不喜|不爱|爱喝)').test(text));}
export function activityParaphrase(text){return text.replace(/走一趟|走一段|走一走|逛一逛|逛逛/g,'散步').replace(/聊几句/g,'私聊').replace(/捎封信|修书/g,'写信').replace(/拉拉手/g,'牵手');}
const aliases={
 M01:{steady:/(?:留|亮).*(?:灯|烛)|先缓一缓/,verify:/(?:问清|核对).*(?:年款|年份|年月)/,call:/苏培盛.*(?:过来|近些|走近)/},
 M02:{tea:/(?:把|另).*(?:杯|盏).*(?:给|递|推|留)|(?:陪|一起).*喝茶/,duty:/(?:更次|更簿|交接册|轮值).*(?:看看|一起|核对)|(?:核对|看看).*(?:更次|更簿|交接册)/,rest:/(?:交班|下值).*(?:休息|歇|睡)|(?:让你|让他).*(?:睡|歇)/},
 M03:{sample:/停(?:供|香).*(?:留样|核验)/,explain:/(?:先|把).*(?:疑虑|缘由).*(?:说明|说清|告诉)|先说明.*停(?:供|香)/,quiet:/(?:暗中|悄悄).*(?:换|停).*香/},
 M05:{rights:/先.*(?:中宫|皇后).*(?:权责|权限)/,visit:/(?:定期|经常).*(?:见面|相见)/,gift:/先留.*玉环/},
 M08:{listen:/(?:问|听).*(?:医事|教习).*(?:心愿|志愿)|听他.*想做.*医事/,medical:/只.*(?:脉案|医职)/},
 M09:{music:/谈.*(?:笛谱|曲谱|节拍)/,duty:/先问.*(?:宗室|王府)/,listen:/只听.*(?:一曲|笛声)/},
 M11:{clear:/(?:不拿|不当|不作|别再拿).*(?:旧人|替身|比较)/,polite:/礼遇.*(?:疏离|距离)/,unsure:/(?:还没|尚未).*想定.*(?:不等|别等|不该.*等)/},
 G04:{pause:/^(?:先|就)?(?:暂停|暂缓)拨款(?:并|，)?(?:限期重报)?$/}
};
export function optionEvidence(event,text){
 if(!event||deniedAction(text)||reportedIntent(text))return [];
 const compact=text.replace(/[“”‘’\s]/g,''),exact=event.options.find(o=>compact===o.label.replace(/[“”‘’\s]/g,''));if(exact)return [exact];
 // A selection ordinal must describe a method, not an unrelated first person/item.
 if(/^(?:(?:今天|今日|这次|这回|朕|我|决定|就|先|请|还是|采用|选择|选|按|照|用|依|办|你|刚才|说|的|来|做|执行|办法|方案|第|[一二三四五\d]|个|项|种|条|套|\s))*$/.test(text)){
  const n=[...text.matchAll(/第?([一二三四五]|\d+)(?:个|项|种|条|套)/g)];if(n.length===1){const k=/\d/.test(n[0][1])?Number(n[0][1]):'一二三四五'.indexOf(n[0][1])+1;return event.options[k-1]?[event.options[k-1]]:[];}
 }
 const mentioned=CHARACTERS.filter(c=>text.includes(c.name));if(mentioned.some(c=>c.id!==event.actor))return [];
 const matches=event.options.filter(o=>aliases[event.id]?.[o.id]?.test(text));return matches.length===1?matches:[];
}
export const PARSE_CLARIFICATIONS={date:'请说明具体的活动日期。',period:'请说明日间还是晚间。',actor:'请明确这次要与谁相处。',item:'请从手中的新物中选定一件。',choice:'请说清选哪一种办法，或引用眼前的选项。',scope:'请明确这句话要告诉谁、说到哪一层。',unsupported:'这部分还不能落定，请把具体做法再说清一点。'};
