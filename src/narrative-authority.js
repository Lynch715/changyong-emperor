import {RuleError} from './rules.js';
const normalize=s=>s.normalize('NFKC').replace(/[\u200b-\u200f\u2060\ufeff]/g,'');
const consequential=/(?:册封|晋封|升任|任命|赐官|罢免|革职|赐婚|成婚|大婚|婚约|怀孕|有喜|诞下|生下|我们的孩子|咱们的孩子|你我已有.{0,6}(?:孩子|皇子)|封为.{0,6}(?:王|侯|将军)|赐你.{0,6}(?:玉|礼|金|银)|已经收下.{0,8}(?:礼|玉|炉))/g;
const relationship=/(?:我们|咱们|你我).{0,10}(?:已相爱|已经相爱|已相守|已经相守|已定情|已经定情|已和好|已经和好|已复合|已经复合)|(?:昨夜|昨日|上回|上次|那晚|那夜|已经|早已).{0,12}(?:牵手|亲吻|拥吻|相拥|留宿|共枕|侍寝)/g;
const achievement=/(?:已经|业已|均已|全部|全都|早就|终于|已).{0,12}(?:办妥|完工|竣工|修成|追回|收复|缴清|结清|领到|送到|修好|建成|大获全胜|国泰民安)|(?:井台|粮道|军饷|库银|欠账|旧账).{0,8}(?:全平|已清|清了|修好|领完)|(?:国库|民生|信任|亲密|安全感).{0,6}(?:增加|提高|加了|扣了|[+＋]\s*\d)/g;
const commitment=/(?:明日|明天|明晚|后日|下回).{0,10}(?:定了|就来|一定来|必来|说定了)|(?:已经|已).{0,8}(?:约好|答应赴约|答应相守|订婚|定下婚)/g;
function denied(clause,index,span){if(/[吗么]|难道/.test(clause))return false;const before=clause.slice(Math.max(0,index-8),index);if(/(?:不是|并非)(?:没有|未曾|不曾|不|没)/.test(before+span))return false;if(/(?:尚未|没有|并未|不会|不能|还没).{0,3}(?:修好|清了|领完|全平|完成|领到|送到|结清|追回|建成|成婚|相守|相爱)/.test(span))return true;return /(?:没有|并未|尚未|不能|不曾|不会|不等于|并非|未曾|还没|不敢|不得|尚无|不是).{0,3}$/.test(before);}
export function assertNarrativeAuthority(value,ctx){
 if(Object.keys(value).some(k=>!['speakerId','text','factIds'].includes(k)))throw new RuleError('AI对白夹带了状态或执行字段，保留手写回应。');
 if(value.factIds.length>30||value.factIds.some(x=>typeof x!=='string')||new Set(value.factIds).size!==value.factIds.length)throw new RuleError('AI事实引用格式不合法。');
 const sources=ctx.facts.filter(f=>value.factIds.includes(f.id)&&!/^FACT_|^DISCLOSE_/.test(f.id)).map(f=>normalize(f.text));
 // A cited, literal world record is evidence for that wording only. An unrelated
 // citation or the record of choosing a policy is not proof that it succeeded.
 for(const raw of normalize(value.text).split(/[，,。！？!?；;\n]/).filter(Boolean)){
  const clause=raw.replace(/[“”‘’「」]/g,'');
  for(const pattern of[consequential,relationship,achievement,commitment]){pattern.lastIndex=0;for(const m of clause.matchAll(pattern)){
   if(denied(clause,m.index,m[0]))continue;
   if(sources.some(s=>s.includes(m[0])))continue;
   throw new RuleError('AI加入了没有本世来源的任免、子女、婚约、关系经历或已完成结果，保留手写回应。');
  }}
 }
}
