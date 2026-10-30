// 自由度与掷骰。一档言出法随；二、三档在 AI 推演前掷 20 面骰，三档更难。
export const FREEDOM={
 1:{name:'言出法随',desc:'不掷骰。你写什么，天下就照着走；你想听什么，对方就怎么回应。'},
 2:{name:'事在人为',desc:'下旨、召见时亲口说的话、夜里的第一句，先掷一次骰。多半能成，偶尔碰壁。'},
 3:{name:'天意难违',desc:'同样掷骰，但难得多。想事事顺遂，得先把朝局和情分经营好。'}
};
export const TIERS=['大凶','凶','平','吉','大吉'];
// 总点数不超过 CUT[i] 落在第 i 档，超过最后一个是大吉
export const CUT={2:[1,4,9,15],3:[3,8,13,17]};
export const tierOf=(level,total)=>{const c=CUT[level];const i=c.findIndex(x=>total<=x);return i<0?4:i;};
// 加减点：下旨看朝局；召见和夜里看情分与心结
export function fateBonus(s,kind,id){
 const out=[];
 if(kind==='edict'){const c=s.stats.court;if(c>=70)out.push(['朝局 '+c,2]);else if(c<30)out.push(['朝局 '+c,-2]);}
 else{const p=s.people[id];if(p){if(p.aff>=65)out.push(['情分 '+p.aff,2]);else if(p.aff<25)out.push(['情分 '+p.aff,-2]);if(p.knot)out.push(['心结',-2]);}}
 return out;
}
const GUIDE_EDICT=[
 '这次掷骰大凶：这道旨意办不成。找一个合乎时势、说得通的理由（祖制、国库、朝臣联名反对、天灾、经办的人出了事……）让它被拦下或者反噬。effects 以负面为主，正值不超过 1。',
 '这次掷骰为凶：事与愿违。执行走样、下面阳奉阴违，或者代价远超预期。写清楚原因，后果偏负面。',
 '这次掷骰为平：按常理推演，合理的部分能办成，过分或不现实的部分办不成。',
 '这次掷骰为吉：旨意大体照着落地，只有一处小波折或小代价。',
 '这次掷骰大吉：天意顺从。旨意完全照皇上写的落地，执行顺利，人心也服，不要另加波折。effects 以正面为主。'
];
const GUIDE_PERSON=[
 n=>`这次掷骰大凶：${n}不能顺着皇上的话走，要找一个合乎性格与处境的理由婉拒或推辞（身子不适、祖宗规矩、心结未解、怕人议论、差事在身……）。可以跪下告罪、面露难色、低头不语，但礼数周全，不顶撞、不斥责皇上。affection 不超过 0。`,
 n=>`这次掷骰为凶：${n}心里不太情愿，面上恭顺，话却说得含糊，委婉地推开，流露出一点理由。affection 不超过 1。`,
 n=>`这次掷骰为平：${n}如常反应。`,
 n=>`这次掷骰为吉：${n}愿意接住皇上的话，只带一点自己的小脾气或小条件。`,
 n=>`这次掷骰大吉：皇上希望${n}怎样回应，${n}就怎样回应（仍要符合性格与身份，不写露骨内容）。affection 不低于 2。`
];
export const fateGuide=(fate,kind,name='')=>!fate?'':kind==='edict'?GUIDE_EDICT[fate.tier]:GUIDE_PERSON[fate.tier](name);
// 引擎兜底：按骰面收紧正面收益
export function boundUp(v,tier){if(v<=0)return v;return tier===0?0:tier===1?Math.round(v/2):v;}
export const fateText=f=>!f||f.free?'':`掷骰 ${f.d}${f.bonus.map(([w,b])=>` ${b>0?'+':'−'}${Math.abs(b)}（${w}）`).join('')} = ${f.total} · ${TIERS[f.tier]}`;
