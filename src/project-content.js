import {WORLD_STORY} from './world-story.js';
// S04 uses the frozen S01 IDs. Existing quarterly content stays in content.js.
export const PROJECTS={
 'PR-COURT':{id:'PR-COURT',title:'御前交接与轮值',category:'朝廷',scope:'御前西值房',unlock:'M01',nodes:['WG-C01','WG-C02','WG-C03'],officers:['C02','C26'],defaultOfficer:'C26',days:7,problem:'值宿名册空了两处，苏培盛又在缺人的更次上写下自己的名字。',inspection:'你亲核此前七日的旧更簿：西值房缺的是夜三更与卯初之间的交接，两张单子原来各等对方先签。问题记在岗位上，不先归罪于哪个值夜的人。',progress:'西值房第一张交接单送来了。接班的人签了名，苏培盛这一夜可以先交出茶盘；带教能否连续接上，还要看满七日的更簿。'},
 'PR-FISCAL':{id:'PR-FISCAL',title:'财政清理与地方周转',category:'经济',scope:'京畿试办县东街',unlock:'M04',nodes:['G01','G02','G03'],officers:['C28','C26'],defaultOfficer:'C28',days:7,problem:'账上的库银缺口，到了东街，就是米铺还肯不肯给熟客赊下一斗米。',inspection:'你把原簿与追缴单逐页对照：经手人名下的旧欠，不能挪到东街铺户的新缴单里。三张有原凭的旧欠单另夹一处，缺凭部分仍待核。',progress:'首批追缴回单已经分项入册。县库报的是眼前这笔回款，东街铺户的周转和有无新增摊派，仍须等七日后分别核对。'},
 'PR-WATER':{id:'PR-WATER',title:'京郊井台与取水路',category:'民生',scope:'京郊柳树井',unlock:'M06',nodes:['WG-P01','WG-P02','WG-P03'],officers:['C26','C28'],defaultOfficer:'C26',days:7,problem:'柳树井的单子上写着“修好”，两户人家却还得绕过泥路，到远处提水。',inspection:'你亲核允祥带回的领料单和两户取水图：井绳虽已领出，井台边的泥路没有交工。那两句“井能用”和“水能提回家”，说的原不是同一件事。',progress:'柳树井送来开工短报：领用与经手签名已分开留存。临时水点是否开着、泥路是否能走，还不能拿这张领料单作结。'},
 'PR-MILITARY':{id:'PR-MILITARY',title:'西北粮道与军饷核验',category:'军事',scope:'西北前营转运粮道',unlock:'M10',nodes:['G04','G05','G06'],officers:['C28','C26','C32'],defaultOfficer:'C28',days:21,problem:'同一批粮出现两笔支领，前营催粮的信却不会因为账目待核而停下。',inspection:'你在御案亲核副册，没有替自己添一段远赴西北的行程。两笔支领的日期相同，签领人却不相同；要追的是转运交接，不把重复账目先写成谁贪污的结论。',progress:'承办人送来出仓短报：本批拨款与押运各有前账，发运签名已留。粮车在路上，前营逐名领粮的回执还未到京，不能先写成钱粮已经到人。'}
};
export const PROJECT_FOR_EVENT=Object.fromEntries(Object.values(PROJECTS).flatMap(p=>p.nodes.map(id=>[id,p.id])));
const opt=(id,label,detail,effects={})=>({id,label,detail,effects,flags:{}});
const scene=(id,title,actor,body,options,requires,stage,turn)=>({id,title,actor,body,options,requires,projectStage:stage,kind:stage==='report'?'followup':'government',location:'养心殿御案',turn,actionCost:stage==='execute'?1:0,projectId:PROJECT_FOR_EVENT[id]});
export const PROJECT_EVENTS={
 'WG-C01':scene('WG-C01','值宿名册的空白','C02','苏培盛把新更簿收进袖中时，一页薄纸掉在案边。两处值宿空着，他自己的名字却写了两遍。\n\n“调得开。”他俯身去拾，仍想把这页翻过去。\n\n你按住纸角。门外守灯的人，总不能只靠一句不妨事。先把缺口问明白，再谈怎样让人真正交班。',[opt('records','把名册摊开，核两处更次','只核实问题，不提前宣告轮值已改好。'),opt('listen','请他把那两夜说清','记录值守者的说法，留给后续对照。')],['M01'],'discover',1),
 'WG-C02':scene('WG-C02','让交班接得上','C02','留茶时提过的更簿，今日又送回案上。允祥把两张调人单放在一旁：“借调见效快，原处也得有人补；若从现有人里带教，头几日还要有人盯着。”\n\n苏培盛没有再说自己能守，只问：“这样排，接班的知道该接哪几件事么？”\n\n钱、签名与交接日，都得在这一页上落稳。',[opt('plan-1','带教并写交接清单','支出1点；七日核带教与实际交班，前期需解释。',{treasury:-1}),opt('plan-2','现员错峰轮值','暂不支出；先缓解重叠更次，剩余缺口如实保留。'),opt('plan-3','调入两名现有熟手','支出2点；先接住急缺更次，七日核借出处补位。',{treasury:-2})],['WG-C01','M02'],'execute',1),
 'WG-C03':scene('WG-C03','七日后的签名','C02','七日的更簿摊到灯下。你先翻的不是整洁的封面，而是那两处曾经空着的签名。',[opt('review','逐页核过，把实际结果收好','只核验这一轮，不重复收取原费用。'),opt('repair-candidate','核过结果，记下补做意向','此处只记意向；新的费用和时间另行预览。')],['WG-C02'],'report',1),
 'WG-P01':scene('WG-P01','签修好的那口井','C26','允祥呈来的修井单上，有个鲜红的“讫”字。另夹着的两张取水图，却在井旁画了一个大圈。\n\n“这两户仍绕远路。”他说，“经手的说井绳领过了。臣想先把井台和路，一处一处问清。”\n\n纸上的那条弯线，落到住户手里，便是每天要多提的一段水。',[opt('records','先核领料与交工记录','保留有凭据与待查的部分，不先定罪。'),opt('listen','先听两户人家怎样取水','记下住户说法，随后与原单对照。')],['M06'],'discover',4),
 'WG-P02':scene('WG-P02','先把水送到人前','C26','两张单子一同送来：一张是井台与泥路的用料，一张是临时取水点的值守。\n\n允祥没有替你挑最省钱的那张。“先供水，修井仍得挂着；先审领料，住户就得多等几日。”\n\n你想让七日后的回信，能具体说清哪一户少走了哪一段路。',[opt('plan-1','修井台，并留临时水点','支出2点；兼顾眼前供水与长久修缮，维护仍须交接。',{treasury:-2}),opt('plan-2','先设临时取水点','支出1点；先减少绕路，永久井台仍待补工。',{treasury:-1}),opt('plan-3','先核领料，再决定动工','暂不支出；证据更清，两户仍需多等七日。')],['WG-P01'],'execute',4),
 'WG-P03':scene('WG-P03','井边的回信','C26','井边的回信没有只写恭颂。两户取水图与井绳的样结，压在同一张纸上。',[opt('review','核取水路线，也核维护签名','只按实际方案验收，不把临时供水写成永久修好。'),opt('repair-candidate','核过回信，记下补工意向','此处只记意向；补工另列时间与费用。')],['WG-P02'],'report',4)
};
PROJECT_EVENTS['WG-C02'].followup='WG-C03';PROJECT_EVENTS['WG-P02'].followup='WG-P03';
export const PROJECT_EVENT_RULES=Object.fromEntries(Object.values(PROJECT_EVENTS).map(e=>[e.id,{actor:e.actor,requires:e.requires,costGroup:e.projectStage==='discover'?(e.id==='WG-C01'?'SC-M01':'SC-M06'):'SC-'+e.id,period:'day',slotCost:e.actionCost,window:{recommended:e.id.startsWith('WG-C')?[1,1,e.projectStage==='execute'?8:2]:[1,10,e.projectStage==='execute'?3:2],earliest:e.id.startsWith('WG-C')?[1,1,2]:[1,10,2],latest:[2,12,30]}}]));
export const PROJECT_STATUS={pending:'待核',planned:'已定方案',executing:'执行中',review:'待回访',completed:'已完成',paused:'已暂停','needs-repair':'待补做',repairing:'补做中'};

for(const [id,e] of Object.entries(PROJECT_EVENTS)){e.body=WORLD_STORY[id].body;e.sceneVisible=e.body;}
