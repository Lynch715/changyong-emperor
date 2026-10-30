import {treasuryIndex} from './economy.js';
// 珍藏：成就、看过的剧情、见过的结局。跨存档保留在这台设备上。
import {CORE} from './data.js';
export const GALLERY_KEY='changyong-v2-gallery';
const loversN=s=>CORE.filter(id=>s.people[id]?.lover&&id!=='C05').length;
const any=(s,f)=>CORE.some(id=>s.people[id]&&f(s.people[id],id));
export const ACHIEVEMENTS=[
 {id:'month1',icon:'灯',title:'重来一次',desc:'熬过重生后的第一个月',check:s=>s.year>1||s.month>1},
 {id:'tea',icon:'茶',title:'一盏茶',desc:'让苏培盛坐下来，陪你喝茶说闲话',check:s=>s.done['M02']==='tea'||s.done['R02-01']==='warm'},
 {id:'incense',icon:'香',title:'停香',desc:'对年世兰说出欢宜香的实话',check:s=>s.done.M03==='explain'||s.done['R07-01']==='warm'},
 {id:'song',icon:'曲',title:'曲子还没完',desc:'宫宴上，让安陵容把曲子唱完',check:s=>s.done.M07==='skill'},
 {id:'all9',icon:'人',title:'故人俱在',desc:'九位故人都已重逢',check:s=>CORE.every(id=>s.people[id]?.met)},
 {id:'heart',icon:'心',title:'初次倾心',desc:'有人对你动了心（情分 65）',check:s=>any(s,p=>p.aff>=65)},
 {id:'lover',icon:'缘',title:'两情相悦',desc:'和一个人说破了心意',check:s=>any(s,(p,id)=>p.lover&&id!=='C05')},
 {id:'lovers3',icon:'春',title:'三宫六院',desc:'与三个人两情相悦',check:s=>loversN(s)>=3},
 {id:'brother',icon:'笛',title:'这一世来得及',desc:'把那个很长的梦告诉允礼',check:s=>s.done.L05==='confess'},
 {id:'knot',icon:'结',title:'解铃',desc:'当面说开一个心结',check:s=>(s.count?.knots||0)>=1},
 {id:'visit',icon:'门',title:'不请自来',desc:'有人主动来看你',check:s=>(s.count?.visits||0)>=1},
 {id:'visit10',icon:'院',title:'门庭若市',desc:'被人主动探望十次',check:s=>(s.count?.visits||0)>=10},
 {id:'talk',icon:'言',title:'话匣子',desc:'召见时说满一百句话',check:s=>(s.count?.lines||0)>=100},
 {id:'edict',icon:'旨',title:'金口玉言',desc:'亲笔下十道旨意',check:s=>(s.count?.edicts||0)>=10},
 {id:'rich',icon:'银',title:'国库充盈',desc:'国库达到 5400 万两',check:s=>treasuryIndex(s)>=90},
 {id:'people',icon:'民',title:'民心所向',desc:'民心达到 100',check:s=>s.stats.people>=100},
 {id:'deficit',icon:'账',title:'填平窟窿',desc:'了结“各省亏空”',check:s=>s.crises?.deficit==='solved'},
 {id:'nian',icon:'印',title:'大将军善终',desc:'这一世，年羹尧没有走上死路',check:s=>!!s.flags?.nian_safe},
 {id:'name',icon:'名',title:'不改名',desc:'处置八爷党时，没有给兄弟改那个名字',check:s=>s.done.V08==='mercy'||s.done.V08==='law'},
 {id:'xiang',icon:'王',title:'十三弟',desc:'逼允祥好好歇了半年',check:s=>s.done.V04==='rest'},
 {id:'end1',icon:'卷',title:'第一卷完',desc:'走完元年至二年',check:s=>s.ended&&s.year===2||s.vol===2},
 {id:'shouhe',icon:'守',title:'相守',desc:'与一人相守（两情相悦且情分 85）',check:s=>any(s,(p,id)=>p.lover&&p.aff>=85&&id!=='C05')},
 {id:'end2',icon:'史',title:'第二卷完',desc:'走完雍正四年',check:s=>s.ended&&s.vol===2||s.vol>=3},
 {id:'bday',icon:'寿',title:'记得',desc:'给五个人过了生辰',check:s=>(s.count?.bdays||0)>=5},
 {id:'fest',icon:'灯',title:'佳节',desc:'和人一起过一个年节',check:s=>(s.count?.festivals||0)>=1},
 {id:'fifth',icon:'玉',title:'一生',desc:'走完一个人的第五幕',check:s=>CORE.some(id=>s.people[id]?.fifth)},
 {id:'council',icon:'值',title:'学会先睡',desc:'设一间值房，不再一个人批到天明',check:s=>s.done.W08==='council'},
 {id:'end3',icon:'雪',title:'第三卷完',desc:'走完雍正六年',check:s=>s.ended&&s.vol===3},
 {id:'life2',icon:'梦',title:'再活一世',desc:'带着记忆，从头再来',check:s=>(s.life||1)>=2},
 {id:'life3',icon:'轮',title:'三生',desc:'第三次醒在雍正元年',check:s=>(s.life||1)>=3}
];
export function loadGallery(storage=globalThis.localStorage){try{return JSON.parse(storage.getItem(GALLERY_KEY)||'null')||{ach:{},seen:{}};}catch{return {ach:{},seen:{}};}}
// 每次存档后调用；返回新解锁的成就
export function updateGallery(s,storage=globalThis.localStorage){
 const g=loadGallery(storage),fresh=[];g.ach=g.ach||{};g.seen=g.seen||{};
 for(const a of ACHIEVEMENTS)if(!g.ach[a.id]){let ok=false;try{ok=a.check(s);}catch{}if(ok){g.ach[a.id]=Date.now();fresh.push(a);}}
 for(const[id,opt]of Object.entries(s.done||{}))g.seen[id]=opt;
 try{storage.setItem(GALLERY_KEY,JSON.stringify(g));}catch{}
 return fresh;
}
