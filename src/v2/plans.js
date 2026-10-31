import {KIN,isChildId,explicitAllowed} from './audience.js';
// 先检查，再调用模型或花费资源。强迫、药物、未成年任何时候都不行；亲密的安排只在成人描写打开、对方在名单内时可以。
const NEVER=/(?:强迫|胁迫|逼迫|强要|下药|迷药|迷奸|性暴力|趁醉|灌醉|未成年|幼女|幼男|幼童|孩童|女童|男童|萝莉|正太)/i;
const SEXUAL=/(?:性爱|性交|交媾|做爱|裸露|裸身|脱光|宽衣|色情|露骨|生殖器|云雨|欢好|行房|侍寝|情欲)/i;
const CHILD_AFFECTION=/(?:亲密|亲吻|接吻|拥吻|恋爱|爱抚|情欲|裸|侍寝|调情|伴侣|恋人|成婚|婚配|牵手|依偎|拥抱)/;
// 与 KIN 同类的永久排除：不随游戏年龄增长而开放。
export function childPlanAllowed(text,id,s=null){
 text=String(text||'');
 const target=isChildId(id)||(s?.children||[]).some(c=>c.id===id);
 const mentioned=/(?:皇嗣|皇子|公主|孩子|儿子|女儿|宝宝|婴儿|少年|K\d+)/i.test(text)||(s?.children||[]).some(c=>text.includes(c.id)||(c.name&&text.includes(c.name)));
 return !(target||mentioned)||!(SEXUAL.test(text)||CHILD_AFFECTION.test(text));
}
export function planAllowed(text,id,s=null,storage){
 if(NEVER.test(text)||!childPlanAllowed(text,id,s))return false;
 if(KIN.has(id)&&(SEXUAL.test(text)||/(?:亲吻|接吻|拥吻|恋爱)/.test(text)))return false;
 return !SEXUAL.test(text)||explicitAllowed(s,id,storage);
}
export const PLAN_NOTICE='这个安排不能照做，可以换成喝茶、读书或休息。';
export const REST_IDEAS=['泡一回温泉，早些歇下','去御花园钓鱼','睡到日上三竿','听一出喜欢的戏','临几页帖，喝一盏茶'];
export function nightIdeas(id){
 const shared=['并肩看一会儿书','喝茶说说今日的小事','早点歇下，明日一起看花'];
 const own={N01:['下一局棋，输的人讲一件旧事','听他说说巷子外的事'],N02:['请她弹那支故乡的曲','灯下说说家里的事'],C02:['留一盏灯，听他讲宫里的趣事','亲手给他倒杯热茶'],C03:['看一回旧时的行军图','从骑马的旧事聊到月上柳梢'],C04:['请他看看脉，再一起读书','泡脚暖身，听他说养身的事'],C05:['和皇弟下棋，聊聊家常','听皇弟说今日的差事'],C06:['一起抄一页经书','听她说说园里新开的花'],C07:['骑马回来泡汤，各自换好衣裳再喝茶','陪她在廊下看月亮'],C08:['听她唱一支喜欢的小曲','一起认窗外的鸟鸣'],C09:['一起读诗，挑一句最喜欢的','吹箫听笛，说些旧事'],C10:['一起挑几枝花插瓶','坐在窗边说说家常']};
 return [...(own[id]||['下一局棋，不急着分输赢','在廊下走走，听一听风']),...shared];
}
export const restCost=text=>/温泉|泡汤/.test(text)?1.2:/听戏|看戏/.test(text)?.3:/钓鱼/.test(text)?.1:/茶/.test(text)?.05:/临帖|临几|书法/.test(text)?.02:0;
