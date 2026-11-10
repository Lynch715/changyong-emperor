import {gameDate} from './dates.js';
import {pregnancyNews, pregnancyThreat} from './family-scenes.js';
// 生育与皇嗣只走固定、克制的家庭剧情；月份是架空游戏历。
import {PEOPLE,YEAR_NAME,MONTHS} from './data.js';
import {SECONDARIES} from './roster.js';
import {canBeTender} from './audience.js';
import {KID_ART} from './art.js';
import {appointmentOptions,recordAppointment,OFFICES} from './appointments.js';
export const SAVE_VERSION=2;
export const mothers=['C06','C07','C08','C09','C10',...Object.keys(SECONDARIES).filter(id=>SECONDARIES[id].category==='妃嫔')];
export const isMother=id=>mothers.includes(id);
export const serial=date=>{const [y,m]=String(date).split('-').map(Number);return (y-1)*12+m;};
export const now=s=>(s.year-1)*12+s.month;
export const key=n=>`${Math.floor((n-1)/12)+1}-${(n-1)%12+1}`;
export const childAge=(s,c)=>Math.max(0,Math.floor((now(s)-serial(c.born))/12));
// 四段年龄只按出生月份计算；选图与保护规则不推定孩子成年。
export function childStage(s, c) {
 const age = childAge(s, c);
 return age >= 10 ? 'youth' : age >= 4 ? 'child' : age >= 1 ? 'toddler' : 'infant';
}
export const defaultChildArt = (stage, sex) => Object.values(KID_ART).find(p => p.stage === stage && p.sex === sex)?.id;
export const childById=(s,id)=>(s.children||[]).find(c=>c.id===id);
export const nameIdeas=sex=>sex==='男'?['弘昀','弘昭','弘宁']:['静宁','和安','昭华'];
export function initFamily(s){
 s.version=SAVE_VERSION;s.pregnancy??={};s.children??=[];s.family??={};
 for(const p of Object.values(s.people))p.wish??='open';
 // M03 的三个选项均实际撤下旧香，不能只迁移其中一个分支。
 if(['sample','explain','quiet'].includes(s.done?.M03)||s.done?.['R07-01'])s.flags.stop_huanyi=true;
 for(const c of s.children){
  c.art??={};c.traits??=[];c.notes??=[];
  for(const stage of ['toddler','child'])c.art[stage]??=defaultChildArt(stage,c.sex);
 }
 return s;
}
export function chance(s,id){
 if(!isMother(id)||!canBeTender(s,id)||s.people[id].wish!=='open'||s.pregnancy[id]||s.family.recovery?.[id]>now(s)||s.flags?.['gone_'+id]||s.flags?.['away_'+id])return 0;
 if(id==='C07'&&!s.flags.stop_huanyi)return 0;
 const care=s.family.tonic?.[id]>=now(s)?0.08:0;
 return Math.max(.02,.15+care-(s.stats.health<40?.1:s.stats.health<60?.05:0));
}
export function tryConceive(s,id,a){
 const p=chance(s,id);if(!p)return false;
 if(a.rand(s)>=p)return false;
 const at=now(s),first=3+Math.floor(a.rand(s)*3),two=a.rand(s)<.5;
 s.pregnancy[id]={start:key(at),due:key(at+10),care:0,risk:0,known:false,fake:false,announce:at+1+Math.floor(a.rand(s)*2),threats:two?[first,first+2]:[first],handled:[]};
 return true;
}
const add=(s,id,sc)=>{if(s.done[id]||s.agenda.includes(id))return;s.dyn??={};s.dyn[id]={id,kind:'family',location:PEOPLE[sc.actor]?.place||'宫中',...sc};s.agenda.push(id);};
const option=(id,label,reply,extra={})=>({id,label,reply,effects:{},...extra});
// 每月只排入到期的家庭事项，已经选择的年龄图与处理记录不重复发放。
export function month(s, a) {
 initFamily(s);
 if (s.agenda.includes('Y10') && !s.pregnancy.C10) {
  s.pregnancy.C10 = {start: key(now(s)), due: key(now(s) + 10), care: 0, risk: 0, known: false, fake: true};
 }
 for (const [id, p] of Object.entries(s.pregnancy)) {
  const name = PEOPLE[id]?.name;
  if (!name) continue;
  if (p.fake) {
   if (p.resolveAt && now(s) >= p.resolveAt) add(s, `PF-${id}-${p.start}`, {
    actor: id, familyType: 'fake', mother: id, title: '脉案里的破绽',
    body: '温实初核过原方和两次脉案，指着一处笔迹说：“这一页添得晚，原方也并非本人所求。”旁边的贺礼尚未拆开，你让人先把改过的册子封好。',
    options: [option('clear', '公布复核结果，还她清白（情分 +3）', '旧药停用，传闻澄清。沈眉庄俯身谢恩。')],
   });
   continue;
  }
  const age = now(s) - serial(p.start);
  if (!p.known && now(s) >= (p.announce ?? serial(p.start) + 2)) {
   add(s, `PN-${id}-${p.start}`, pregnancyNews(id, promotion(s, id)));
  }
  if (p.known && (p.threats || []).includes(age) && !(p.handled || []).includes(age)) {
   const kind = ['香料', '饮食', '落水'][Math.floor(a.rand(s) * 3)];
   const clue = {香料: '新香盒的封签与领用册对不上', 饮食: '送来的汤盅封条被揭过，膳房留底却没有这一盅',
    落水: '池边栏杆的榫头松了，木屑还是新的'}[kind];
   p.handled ??= []; p.handled.push(age);
   s.clues.push({at: key(now(s)), text: `${name}宫中的线索：${clue}。`});
   add(s, `PT-${id}-${p.start}-${age}`, pregnancyThreat(id, kind, clue));
  }
  if (now(s) >= serial(p.due)) add(s, `PB-${id}-${p.start}`, {
   actor: id, mother: id, familyType: 'birth', title: '宫中添喜',
   body: `${name}到了待产的月份。太医院和稳婆都已候好，宫门外有人轻声报平安。你将御案上的折子推到一旁，静静听着帘外的脚步声。`,
   options: [option('boy', '皇子', '宫里传来报喜声。'), option('girl', '公主', '宫里传来报喜声。'),
    option('random', '交给天意', '宫里传来报喜声。')],
  });
 }
 for (const c of s.children) {
  const age = childAge(s, c), stage = childStage(s, c);
  if ([1, 4].includes(age) && !(c.growthChosen || []).includes(stage)) add(s, `PG-${stage}-${c.id}`, {
   actor: c.mother, child: c.id, familyType: 'growth', title: `${c.name}${age}岁了`,
   body: `${c.name}又长高了一些，旧衣裳已经短了一截。内务府送来合身的新衣，请你看看。`,
   options: [option('art', '看看新的日常立绘', '新衣已经备好，孩子的旧画像也会好好留着。')],
  });
  if (age >= 10 && !c.youthChosen) add(s, `PY-${c.id}`, {
   actor: c.mother, child: c.id, familyType: 'youth', title: `${c.name}十岁了`,
   body: `${c.name}已满十岁，换上合龄的日常衣裳。书案上添了几本新书，你让人把小时候的画像收好，另备一张新像。`,
   options: [option('art', '挑选少年立绘', '书案已经备好，等孩子慢慢长大。')],
  });
  if (now(s) > serial(c.born) && serial(c.born) % 12 === now(s) % 12 && !(s.bdayDone || []).includes(c.id)) {
   add(s, `PK-${c.id}-${s.year}`, {actor: c.mother, child: c.id, familyType: 'birthday', title: `${c.name}的生辰`,
    body: `你还记得${gameDate(c.born)}报平安的那一日。如今${c.name}已经${age}岁，宫里备了一碗长寿面，等你来坐一会儿。`,
    options: [option('visit', '陪孩子过生辰（不花银，记录家庭近况）', '你陪孩子吃了长寿面，把这一日记在家常册里。')],
   });
  }
 }
}
function promotion(s,id){const rank=Number(s.appointments?.[id]?.office?.replace('rank',''));if(!Number.isInteger(rank)||rank>=7)return null;return appointmentOptions(s,id).find(o=>o.office===`rank${rank+1}`&&!o.reason)?.office||null;}
export function resolve(s,sc,opt,a){
 const id=sc.mother,p=s.pregnancy[id],people={},stats={};const aff=n=>{people[id]=a.gain(s,id,n);};
 if(opt.cost){if(s.stats.inner<opt.cost)throw Error('内帑不足，改选不花银的办法。');Object.assign(stats,a.applyStats(s,{inner:-opt.cost}));}
 if(sc.familyType==='news'){
  if(!p||p.fake)throw Error('这份喜讯已无有效孕期。');p.known=true;
  if(opt.id==='promote'){const next=promotion(s,id);if(next)recordAppointment(s,id,next,OFFICES[next].title,'有喜晋位');aff(6);}else aff(opt.id==='reward'?4:2);
 }else if(sc.familyType==='threat'&&p&&!p.fake){
  if(opt.id==='expose'){p.risk=Math.max(0,p.risk-1);aff(3);Object.assign(stats,a.applyStats(s,{palace:1}));}
  else if(opt.id==='guard'){p.care++;aff(2);}
  else{p.risk+=2;if(a.rand(s)<Math.max(.05,p.risk*.18-p.care*.03)){delete s.pregnancy[id];s.family.recovery??={};s.family.recovery[id]=now(s)+3;
   add(s,`PL-${id}-${p.start}`,{actor:id,mother:id,familyType:'comfort',title:'陪她慢慢养好',body:`太医低声回禀，这一胎没能保住。${PEOPLE[id].name}需要休养，也需要有人听她说话。这件事不是她的过错，往后的生活仍由她自己选择。`,options:[option('listen','陪她坐坐，听她说（情分 +4）','你没有催她振作。茶换过一盏，她终于肯说起心里的难过。'),option('rest','让她安心休养（情分 +3）','你嘱咐照她的意愿安排日常，不让人拿这件事催问。')]});
   opt={...opt,reply:'太医来回过几次，最终低声回禀：这一胎没能保住。你放下手里的折子，先让她好好歇着。'};
   a.log(s,`${PEOPLE[id].name}失去这一胎，已安排休养与安抚。`,'家');}
  }
 }else if(sc.familyType==='comfort')aff(opt.id==='listen'?4:3);
 else if(sc.familyType==='fake'){if(p?.fake)delete s.pregnancy[id];aff(3);}
 else if(sc.familyType==='birth'){
  if(!p||p.fake)throw Error('没有到期的真实孕期。');s.pendingBirth={mother:id,sex:opt.id==='random'?(a.rand(s)<.5?'男':'女'):opt.id==='boy'?'男':'女',born:key(now(s)),name:''};
 }else if(['youth','growth'].includes(sc.familyType)){
  s.familyArt={child:sc.child,stage:childStage(s,childById(s,sc.child)),required:true};
 }
 else if(sc.familyType==='birthday'){const c=childById(s,sc.child);c.notes.push(`${key(now(s))}：与家人一起过生辰`);s.bdayDone.push(c.id);}
 a.log(s,`${sc.title}：${opt.label}`,'家');return {title:sc.title,choice:opt.label,text:opt.reply,stats,people};
}
export function discuss(s,id,wish,a){
 if(!isMother(id)||!['open','later','no'].includes(wish)||!s.people[id]?.met||a.away(s,id)||a.gone(s,id))throw Error('现在不能商量这件事。');
 if(s.family.discussed?.[id]===key(now(s)))throw Error('这个月已经谈过，给她些时间。');
 a.spend(s);s.family.discussed??={};s.family.discussed[id]=key(now(s));
 const p=s.people[id],cautious=['C06','C08','C12'].includes(id),accepted=wish!=='open'||a.rand(s)<Math.max(.05,Math.min(.9,(p.aff-25)/100-(cautious?.15:0)));
 if(accepted)p.wish=wish;
 const text=accepted?(wish==='open'?'她听完，点头说：“臣妾也愿意试着迎接一个孩子，往后若想缓缓，还请皇上容臣妾再说。”':wish==='later'?'她轻声说：“臣妾也想先缓一缓。”你答应不再催她。':'她行了礼：“臣妾想把日子过好，不打算生育。”你尊重她的选择，这条关系线照样能走完。'):'她迟疑片刻，低声告罪：“臣妾还没有想好，请皇上容臣妾再想想。”她原来的意愿没有改变。';
 a.log(s,`与${PEOPLE[id].name}商量生育：${accepted?{open:'愿意考虑',later:'暂缓',no:'不生育'}[wish]:'尚未答应'}`,'家');return {title:'商量以后的日子',text,stats:{},people:{}};
}
export function care(s,id,pay,a){
 const p=s.pregnancy[id];if(!p?.known||p.fake)throw Error('只有已复诊确认的孕期可以安胎。');if(p.caredAt===key(now(s)))throw Error('本月已经照护过了。');a.ready(s);
 if(pay){if(s.stats.inner<1)throw Error('内帑不足。');}else a.spend(s);
 const stats=pay?a.applyStats(s,{inner:-1}):{};p.care++;p.caredAt=key(now(s));const d=a.gain(s,id,1);a.log(s,`为${PEOPLE[id].name}安排安胎，照护 +1`,'家');return {title:'安心养胎',text:`轮值、饮食与起居都逐项看过。她俯身谢恩。本月照护 +1，累计照护 ${p.care}。`,stats,people:{[id]:d}};
}
export function tonic(s,id,a){
 if(!isMother(id)||!s.people[id]?.met||!s.people.C04?.met||a.away(s,'C04')||a.gone(s,'C04')||a.away(s,id)||a.gone(s,id))throw Error('眼下请不到温实初或这位妃嫔。');
 a.spend(s);s.family.tonic??={};s.family.tonic[id]=now(s)+2;const d=a.gain(s,'C04',1);a.log(s,`温实初为${PEOPLE[id].name}调养，三个月内受孕判定 +8 个百分点`,'家');return {title:'请太医调养',text:'温实初问过本人的作息与不适，留下温和的调养安排。本月及随后两个月，受孕判定增加八个百分点；暂缓或不生育时仍不会触发。',stats:{},people:{C04:d}};
}
export function setBirthName(s,name){if(!s.pendingBirth)throw Error('没有等待取名的孩子。');name=String(name||'').trim();if(!/^[\p{Script=Han}A-Za-z·]{1,12}$/u.test(name))throw Error('请用一至十二个汉字或字母取名。');s.pendingBirth.name=name;}
export function finishBirth(s,art,a){
 const b=s.pendingBirth;if(!b?.name)throw Error('请先给孩子取名。');const pic=KID_ART[art];if(pic?.stage!=='infant'||pic.sex!==b.sex)throw Error('请选对应性别的婴儿立绘。');
 let n=1;while(childById(s,'K'+String(n).padStart(2,'0')))n++;const c={id:'K'+String(n).padStart(2,'0'),mother:b.mother,name:b.name,sex:b.sex,born:b.born,art:{infant:art,youth:''},traits:[],notes:['出生平安，日常起居由家人照护']};s.children.push(c);delete s.pregnancy[b.mother];delete s.pendingBirth;
 const [year,m]=c.born.split('-').map(Number);a.log(s,`${YEAR_NAME(year)}年${MONTHS[m-1]}，${PEOPLE[c.mother].name}诞下${c.sex==='男'?'皇子':'公主'}${c.name}`,'家');a.cele(s,{k:'birth',child:c.id});s.cele.unshift(s.cele.pop());return c;
}
// 本人当前年龄与性别均匹配才保存选图，其他年龄段的历史选择原样保留。
export function setChildArt(s,id,art){
 const c=childById(s,id),pic=KID_ART[art];
 if(!c||pic?.stage!==childStage(s,c)||pic.sex!==c.sex)throw Error('只能选当前年龄段及对应性别的立绘。');
 c.art[pic.stage]=art;
 if(pic.stage==='youth')c.youthChosen=true;
 c.growthChosen=[...new Set([...(c.growthChosen||[]),pic.stage])];
 delete s.familyArt;
}
export function study(s,id,kind,a){const c=childById(s,id);if(!c||childAge(s,c)<10||!['read','quiz'].includes(kind))throw Error('孩子满十岁后才能读书、考校。');a.spend(s);const text=kind==='read'?'陪孩子读过一页书，遇到不懂的地方慢慢讲。':'考校几句诗文，答错也不要紧，留待下回再学。';c.notes.push(`${key(now(s))}：${text}`);if(!c.traits.includes('好学'))c.traits.push('好学');a.log(s,`${c.name}：${text}`,'家');return {title:kind==='read'?'陪孩子读书':'考校功课',text,stats:{},people:{}};}
// 假脉案与真实孕期分开处理；剧情只呈现复核与人物回应。
export function y10Scene(s, sc) {
 if (!s) return sc;
 const real = s.pregnancy?.C10 && !s.pregnancy.C10.fake;
 if (real) return {...sc, title: '真假脉案',
  body: '沈眉庄已有复诊确认的喜讯，宫里却传出“假孕”的话。她带来一份被换过的脉案，俯身请你查明。' +
   '温实初将前次复诊的原案放在一旁：“这一页的字迹与用方都不对，臣请再核经手的人。”',
  options: sc.options.map(o => ({...o, reply: '温实初核对原案，查明有人换过脉案。沈眉庄仍照原来的诊见休养，临走时，轻声谢你肯听她说。'}))};
 return {...sc, options: sc.options.map(o => ({...o,
  reply: o.id === 'stay' ? '温实初复诊并核对药方，查明没有喜脉。传闻澄清，沈眉庄俯身谢过你肯听她说话。' :
   `温实初开始核对脉案，约${o.id === 'mid' ? '一个' : '两个'}月后复查。你先撤下道贺的礼单，不再让她为传言受扰。`,
 }))};
}
export function afterStory(s,id,opt){
 if(id==='M03'||id==='L07')s.flags.stop_huanyi=true;
 if(id==='Y10'&&s.pregnancy.C10?.fake){if(opt==='stay')delete s.pregnancy.C10;else s.pregnancy.C10.resolveAt=now(s)+(opt==='mid'?1:2);}
}
export function childrenContext(s){return (s.children||[]).length?'\n皇嗣（全部永久按未成年人保护）：'+s.children.map(c=>`${c.id}=${c.name}，${childAge(s,c)}岁，未成年，生母${PEOPLE[c.mother]?.name}，仅限亲情、学习与节庆日常`).join('；')+'。皇嗣不得进入任何亲密、恋爱或性内容；不得凭故事推定其成年。':'';}
