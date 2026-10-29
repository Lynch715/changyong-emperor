// Design generator only. Does not import the runtime engine or write saves.
import fs from 'node:fs';import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),dir=new URL('design/S14/',root);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const registry=read('design/S01/事件总表.json').events,extras=read('design/S12/扩展二线路线卡.json');
const d=(y,m,n=2)=>[y,m,n],ord=a=>(a[0]-1)*360+(a[1]-1)*30+a[2],date=n=>[Math.floor((n-1)/360)+1,Math.floor(((n-1)%360)/30)+1,(n-1)%30+1];
const label=a=>`${a[0]}年${a[1]}月${a[2]}日`,end=[30,12,30];
const volumes=[['V01','初醒御案',1,1,1,6],['V02','深宫初绽',2,2,7,12],['V03','信任有价',3,4,13,18],['V04','改命成局',5,6,19,24],['V05','太平有隙',7,12,25,30],['V06','共治风雨',13,20,31,36],['V07','新旧之间',21,26,37,42],['V08','岁岁有归',27,30,43,48]].map(([id,title,startYear,endYear,firstMain,lastMain])=>({id,title,start:[startYear,1,1],end:[endYear,12,30],mains:Array.from({length:lastMain-firstMain+1},(_,i)=>'M'+String(firstMain+i).padStart(2,'0')),status:startYear<=2?'first-edition-runtime':'design-only'}));
const weeks=[];const addWeek=(id,start,purpose)=>weeks.push({id,start,end:date(ord(start)+6),slots:6,maxDailySlots:2,maxMainPackages:2,purpose,status:'planned-not-created'});
for(let y=3;y<=6;y++)for(let q=1;q<=4;q++)addWeek(`WL-${y}-Q${q}`,d(y,(q-1)*3+1),'三至六年逐季推进与生活');
for(let y=7;y<=26;y++){addWeek(`WL-${y}-A`,d(y,y===9?1:4),y===9?'春宴与各自选择':'年度国政、成长或关系');addWeek(`WL-${y}-B`,d(y,10),'回访、独立生活、补谈与成果');}
for(const [id,y,m,n,purpose]of [['spring',27,1,2,'交班复核与补谈'],['summer',27,4,2,'行程预告与修复'],['arrival',27,9,2,'九月抵京与舆图'],['farewell',27,11,2,'十一月送别与长灯'],['doctor',27,12,2,'十二月问诊，独立保存'],['flute',27,12,16,'另日果郡王笛约'],['palace',28,1,2,'宜修、年世兰、安陵容依次分日'],['extra',28,4,2,'甄沈独立暮年窗口'],['handover',29,1,2,'山河交付正式核验'],['repair',29,7,2,'交班补工与晚成准备'],['late',30,6,2,'晚成前的实际补谈与兑现'],['final',30,12,24,'三十年末事实核查与史册']])addWeek(`WL-${y}-${id}`,[y,m,n],purpose);
weeks.sort((a,b)=>ord(a.start)-ord(b.start));
const weekAt=a=>weeks.find(w=>ord(a)>=ord(w.start)&&ord(a)<=ord(w.end));
const years=[];for(let y=3;y<=30;y++){
 const focus=weeks.filter(w=>w.start[0]===y),regular=[];let cursor=ord([y,1,1]);
 for(const w of focus){if(cursor<ord(w.start))regular.push({start:date(cursor),end:date(ord(w.start)-1)});cursor=ord(w.end)+1;}
 if(cursor<=ord([y,12,30]))regular.push({start:date(cursor),end:[y,12,30]});
 years.push({year:y,focusWeeks:focus.map(w=>w.id),regularPeriods:regular,monthlyCheckpoints:Array.from({length:12},(_,i)=>({key:`${y}-${String(i+1).padStart(2,'0')}`,date:[y,i+1,30],period:'evening',onceKey:`MONTH-${y}-${String(i+1).padStart(2,'0')}`,status:'planned-not-settled'}))});
}
const extensionCandidates=[];for(let y=3;y<=30;y++)for(let q=1;q<=4;q++){
 const start=ord(d(y,(q-1)*3+1)),last=ord([y,q*3,30]);let n=start;
 while(n+6<=last&&weeks.some(w=>n<=ord(w.end)&&n+6>=ord(w.start)))n++;
 if(n+6>last)throw Error('no legal extension');
 extensionCandidates.push({id:`XL-${y}-Q${q}`,quarterKey:`${y}-Q${q}`,start:date(n),end:date(n+6),slots:6,status:'candidate-not-accepted'});
}
const mainDates={13:d(3,1),14:d(3,4),15:d(3,10),16:d(4,1),17:d(4,4),18:d(4,10),19:d(5,4),20:d(5,7),21:d(5,10),22:d(6,1),23:d(6,4),24:d(6,10),25:d(7,4),26:d(8,4),27:d(9,1),28:d(10,4),29:d(11,4),30:d(12,4),31:d(13,4),32:d(14,4),33:d(15,4),34:d(17,4),35:d(19,4),36:d(20,4),37:d(21,4),38:d(22,4),39:d(23,4),40:d(24,4),41:d(25,4),42:d(26,4),43:d(27,9),44:d(27,11),45:d(27,12),46:d(28,1),47:d(29,1),48:d(30,12,24)};
const events=[];
function put(id,at,requires=[],slots=0,opts={}){
 const source=registry.find(e=>e.id===id);if(!source)throw Error(id);
 const volume=volumes.find(v=>ord(at)>=ord(v.start)&&ord(at)<=ord(v.end));
 const item={id,title:source.title,kind:source.kind,actor:source.actor,volume:volume.id,status:'design-only-runtime-pending',recommended:at,period:slots?'day':'day',focusWeek:weekAt(at)?.id||null,slots,delivery:slots?'arranged':'document',sceneId:'SC-'+id,costGroup:'SC-'+id,effectOwner:id,requires,gates:[],window:{start:at,end,lateRoute:'next-legal-week-no-history-rewrite'},sourceRefs:['design/S01/事件总表.json#'+id],...opts};events.push(item);return item;
}
for(let n=13;n<=48;n++){
 const id='M'+String(n).padStart(2,'0'),prior='M'+String(n-1).padStart(2,'0');
 // Numeric order does not make adulthood a prerequisite for M34.
 const requires=n===34?['M33#education']:n===45?['M44#farewell']:n===46?['M45#flute']:n===47?['M46#complete']:[prior];
 put(id,mainDates[n],requires,0,{delivery:'main-package',mainPackage:id,sourceRefs:['design/S01/事件总表.json#'+id,'规范V1.2#第五章与附录四'],gates:['main-does-not-require-romance']});
}
const event=id=>events.find(e=>e.id===id);
// Stage IDs are internal parts of their original logical event, never new event counts.
const stage=(id,key,at,requires=[],slots=0,more={})=>({id:`${id}#${key}`,recommended:at,period:'day',focusWeek:weekAt(at)?.id||null,slots,delivery:slots?'arranged':'document',requires,...more});
event('M13').stages=[stage('M13','supply-review',d(3,1,24),['M13'],0,{minimumDays:21,after:'M13',meaning:'仅核原方案本批补给，不宣称军需已永久解决'})];
event('M21').stages=[stage('M21','family-decision',d(4,10,4),['M17'],1,{optional:true,gates:['both-consent','existing-pregnancy-preserved'],meaning:'可选择不生育；同意不等于受孕'}),stage('M21','birth-or-autonomy',d(5,10),['M21'],0,{alternatives:['actual-birth-with-date','autonomous-life','pregnancy-awaits-actual-birth'],sharedWith:'R07-04'}),{id:'M21#later-birth',delivery:'date-triggered',slots:0,requires:['actual-conception-and-both-consent'],dateRule:'actualConceptionDate + configuredGestationDays, never before actual date',gates:['preserve-original-M21-and-R07-04-no-reward-repeat']}];
event('M22').stages=[stage('M22','audit-review',d(6,1,10),['M22'],0,{minimumDays:7,after:'M22',meaning:'核真实原簿、承办和工期，未办结仍待核'})];
event('M26').stages=[stage('M26','relief-review',d(8,4,24),['M26'],0,{minimumDays:21,after:'M26',meaning:'仅限本批实际救济与凭据，不由私情生成成果'})];
event('M30').stages=[stage('M30','work-review',d(12,5),['M30'],0,{minimumDays:30,after:'M30',meaning:'本人独立事务实际完成才可作为R08-04证据'})];
event('M32').stages=[stage('M32','training-review',d(14,5),['M32'],0,{minimumDays:30,after:'M32'})];
event('M33').requires=['M32'];event('M33').stages=[stage('M33','education',d(15,4),['M32'],0,{alternatives:['actual-child-education','next-generation-education-and-autonomy'],meaning:'本阶段处理后M34可继续'}),{id:'M33#adult-decision',delivery:'birthday-triggered',slots:1,requires:['M33#education'],dateRule:'actualBirthDate + 18 * 360 days; choose a legal week at or after birthday',gates:['actual-child-exists','child-willing-to-discuss','not-forced-to-marry'],sharedWith:'P12',costGroup:'FAMILY-ADULT-DECISION-C36',effectOwner:'M33#adult-decision',lateRoute:'beyond-year30-is-pending-or-not-applicable-not-a-main-blocker',mainPackage:'M33'}];
event('M34').stages=[stage('M34','handover-review',d(17,4,24),['M34'],0,{minimumDays:21,after:'M34'})];
event('M35').stages=[stage('M35','handover-review',d(19,4,10),['M35'],0,{minimumDays:7,after:'M35'})];
event('M37').stages=[stage('M37','trial-review',d(21,5,3),['M37'],0,{minimumDays:30,after:'M37',meaning:'观察施政来源，不等于已经立储'})];
event('M41').stages=[stage('M41','handover-review',d(25,4,10),['M41'],0,{minimumDays:7,after:'M41'})];
event('M42').stages=[stage('M42','rotation-review',d(26,4,24),['M42'],0,{minimumDays:21,after:'M42'})];
event('M44').stages=[stage('M44','farewell',d(27,11),['M43'],0,{mainPackage:'M44',participants:['C01','C03'],meaning:'先送年羹尧启程，再进入苏培盛私谈'})];
event('M45').stages=[stage('M45','diagnosis',d(27,12),['M44#farewell'],0,{mainPackage:'M45',participants:['C01','C04']}),stage('M45','flute',d(27,12,16),['M45#diagnosis'],0,{mainPackage:'M45',participants:['C01','C05'],gates:['accepted-palace-visit-and-fulfilled']})];
event('M46').stages=[stage('M46','yixiu',d(28,1),['M45#flute'],0,{mainPackage:'M46',participants:['C01','C06']}),stage('M46','shilan',d(28,1,4),['M46#yixiu'],0,{mainPackage:'M46',participants:['C01','C07']}),stage('M46','lingrong',d(28,1,6),['M46#shilan'],0,{mainPackage:'M46',participants:['C01','C08']}),stage('M46','complete',d(28,1,7),['M46#lingrong'],0)];
event('M47').stages=[stage('M47','decision',d(29,1),['M46#complete','G23'],0,{mainPackage:'M47'}),stage('M47','complete',d(29,1,24),['M47#decision','G24'],0)];
event('M48').requires=['M47#complete'];
for(const id of ['M13','M34','M42'])event(id).contactMode='document-no-live-reply';
const core=[
 ['R02-03',3,4,2,'M14',0],['R02-04',5,4,5,null,1],['R02-05',23,10,3,null,1],['R02-06',27,11,2,'M44#farewell',0],
 ['R03-03',3,10,2,'M15',0],['R03-04',5,4,2,'M19',0],['R03-05',17,10,2,null,1],['R03-06',27,9,2,'M43',0],
 ['R04-03',6,4,2,'M23',0],['R04-04',14,4,2,'M32',0],['R04-05',21,10,3,null,1],['R04-06',27,12,2,'M45#diagnosis',0],
 ['R05-03',5,7,2,'M20',0],['R05-04',11,4,2,'M29',0],['R05-05',22,10,3,null,1],['R05-06',27,12,16,'M45#flute',0],
 ['R06-03',4,4,2,'M17',0],['R06-04',6,1,4,null,1],['R06-05',19,10,2,null,1],['R06-06',28,1,2,'M46#yixiu',0],
 ['R07-03',5,7,4,null,1],['R07-04',5,10,2,'M21',0],['R07-05',24,10,3,null,1],['R07-06',28,1,4,'M46#shilan',0],
 ['R08-03',4,10,2,'M18',0],['R08-04',12,10,2,null,1],['R08-05',24,10,4,null,1],['R08-06',28,1,6,'M46#lingrong',0]
];
const special={
 'R02-03':['M14'],'R02-05':['R02-04','G21'],'R02-06':['M41#handover-review'],
 'R03-04':['M19'],'R03-05':['M34#handover-review'],'R03-06':['G06','M42#rotation-review'],
 'R04-04':['M32'],'R04-05':['M32#training-review','G21'],'R04-06':['R04-05'],
 'R05-04':['G13'],'R05-05':['G15'],'R05-06':['R05-05'],
 'R06-05':['M35#handover-review'],'R06-06':['R06-05'],
 'R07-03':['M19'],'R07-04':['M21#birth-or-autonomy'],'R07-05':['M33#education'],'R07-06':['M19','R07-05'],
 'R08-04':['M30#work-review'],'R08-05':['R08-04'],'R08-06':['R08-05']};
for(const [id,y,m,n,parent,cost]of core){const previous=id.replace(/(\d\d)$/,(v)=>String(Number(v)-1).padStart(2,'0'));put(id,[y,m,n],[previous,...(parent?[parent]:[])],cost,{period:cost?'day':'evening',delivery:parent?'embedded-private-section':'arranged',...(parent?{sceneId:'SC-'+parent,costGroup:'SC-'+parent,effectOwner:parent}:{costReason:'另日或另场相谈，不能沿用原主线免费场次'}),evidenceRefs:special[id]||[],romanceRequires:special[id]||[],requiresMode:'previous-node-handled-not-romance',missingEvidence:'只记待核与补办，不补造业绩或恋爱；不得阻断其他主线',gates:['cooperation-completes-applicable-outcome','romance-needs-current-mutual-consent','preserve-old-high-stage-no-reward-repeat','same-scene-private-visibility']});}
const xr=[['XR09-03',4,7,3],['XR09-04',9,1,4],['XR09-05',23,4,4],['XR09-06',26,10,3],['XR10-03',6,1,3],['XR10-04',8,10,3],['XR10-05',24,4,4],['XR10-06',26,10,4]];
for(const [id,y,m,n]of xr){const source=extras.nodes.find(e=>e.id===id);put(id,[y,m,n],[...source.requires,...(id==='XR10-04'?['M26#relief-review']:[])],1,{gates:['independent-npc-answer','cooperation-equal-rights','mutual-consent-for-romance'],sourceRefs:['design/S12/扩展二线路线卡.json#'+id]});}
// Each government chain has a decision and a real delayed report, not a T+1 shortcut.
const government=[
 {ids:['G07','G08','G09'],start:d(7,4,3),execute:d(7,4,4),report:d(7,4,25),after:'M25',minimumDays:21},
 {ids:['G10','G11','G12'],start:d(13,4),execute:d(13,4,3),report:d(13,7,3),after:'M31',minimumDays:90},
 {ids:['G13','G14','G15'],start:d(11,4),execute:d(11,4,3),report:d(11,4,24),after:'M29',minimumDays:21},
 {ids:['G16','G17','G18'],start:d(5,4,3),execute:d(5,4,4),report:d(5,4,25),after:'M19',minimumDays:21},
 {ids:['G19','G20','G21'],start:d(3,7),execute:d(3,7,3),report:d(3,7,24),after:'M03',minimumDays:21},
 {ids:['G22','G23','G24'],start:d(21,4,3),execute:d(21,4,4),report:d(29,1,23),after:'M37',minimumDays:30}
];
for(const c of government){put(c.ids[0],c.start,[c.after],0,{project:c.ids[0]+'-CHAIN',projectPhase:'discovery',delivery:'document-decision',decisionCount:1});put(c.ids[1],c.execute,[c.ids[0]],1,{project:c.ids[0]+'-CHAIN',projectPhase:'execution',decisionCount:1});put(c.ids[2],c.report,[c.ids[1],...(c.ids[2]==='G24'?['M47#decision']:[])],0,{project:c.ids[0]+'-CHAIN',projectPhase:'review',minimumDays:c.minimumDays,after:c.ids[1],delivery:'due-report',gates:['real-execution-and-receipt','review-not-automatically-read-or-awarded'],milestones:c.ids[2]==='G24'?Array.from({length:7},(_,i)=>({date:[22+i,4,20],meaning:'阶段试办回执，只按实记录，不提前确认最终交接'})):[]});}
const side=[['P02',3,7,4,'M03'],['P03',10,10,3,'M28'],['P04',5,10,3,'M21'],['P05',6,7,3,'M12'],['P06',6,7,4,'M24'],['P07',23,10,4,'R02-05'],['P08',9,10,3,'M27']];
// P06 must not depend on the later six-year winter M24.
for(const [id,y,m,n,req]of side)put(id,[y,m,n],[id==='P06'?'M22':req],1,{gates:['own-profession-and-agency','no-romance-prerequisite']});
put('P12',d(23,10),['M33#education'],0,{delivery:'conditional-shared-entry',costGroup:'FAMILY-ADULT-DECISION-C36',effectOwner:'M33#adult-decision',dateRule:'same actual adult decision as M33, otherwise not applicable/pending',gates:['actual-child-exists','age-at-least-18','child-willing-to-discuss','one-marriage-transaction-only'],mainPackage:'M33'});
const daily=[[9,9,1,5,'spring'],[10,6,4,5,'summer'],[11,7,7,5,'autumn'],[12,27,9,4,'autumn'],[13,6,10,5,'winter'],[14,27,12,4,'winter'],[15,8,10,5,'any'],[16,16,1,15,'spring'],[17,10,10,5,'any'],[18,15,10,3,'any'],[19,23,10,5,'any'],[20,18,10,3,'any'],[21,18,1,3,'spring'],[22,20,10,3,'any'],[23,25,10,3,'any'],[24,27,12,18,'winter']];
for(const [n,y,m,day,season]of daily){const id='D'+String(n).padStart(2,'0');put(id,[y,m,day],[],1,{optional:true,season,delivery:weekAt([y,m,day])?'optional-template':'extension-template',extensionCandidate:weekAt([y,m,day])?null:'XL-'+y+'-Q'+(Math.floor((m-1)/3)+1),gates:n===17?['actual-child-birthday-else-alternative-growth']:['actual-location-and-participants'],recurrence:{kind:'template-not-new-logical-event',cooldownDays:7,oncePerWeekPerActor:true}});}
// D16's sample requires an explicitly chosen extension covering the fifteenth, not the default candidate date.
event('D16').customExtension={id:'XL-16-Q1',start:[16,1,12],end:[16,1,18],replacesCandidate:true};
event('D15').dateRule='actual-player-birthday; sample date does not establish a birthday fact';
event('D17').dateRule='actual-child-birthday; absent child uses separately named alternative, never fabricated birth';
const epi=[['E01',27,9,3,'R03-06',['G06','M34#handover-review','M42#rotation-review']],['E02',27,11,3,'R02-06',['M14','R02-05']],['E03',27,12,3,'R04-06',['G21','R04-05']],['E04',27,12,17,'R05-06',['R05-03','G15']],['E05',28,1,3,'R06-06',['R06-05']],['E06',28,1,5,'R07-06',['M19','R07-05']],['E07',28,1,7,'R08-06',['R08-04','R08-05']],['XE09',28,4,3,'XR09-06',[]],['XE10',28,4,5,'XR10-06',[]]];
for(const [id,y,m,n,r,reqs]of epi)put(id,[y,m,n],[r,...reqs],0,{delivery:'conditional-readonly-page',gates:['current-established-together-and-actual-outcomes','cooperation-visit-is-not-romance-epilogue'],window:{start:[y,m,n],end,lateRoute:'current-date-late-page-no-appointment-or-reward'},latePolicy:{needs:'actual-prior-meeting-and-current-gates',cannot:['backdate','award','perform-appointment','change-original-visit','rewrite-sealed-ending']}});
event('E06').gates.push('actual-child-growth-or-no-child-autonomy');
for(let n=1;n<=4;n++)put('F0'+n,end,['M48','M47#complete'],0,{period:'evening',delivery:'mutually-exclusive-ending',branchGroup:'FINAL-CHRONICLE',gates:n===1?['seven-core-together','seven-core-epilogues','all-key-governance-settled','state-indicators-at-least-45']:n===2?['handover-complete','at-least-three-core-together','other-routes-cooperative','state-indicators-at-least-45']:n===3?['state-functioning','record-real-unresolved-items']:['actual-unresolved-crisis','explicit-choice-of-repair-tail'],window:{start:end,end,lateRoute:'F04-repair-tail-only-with-real-dates-no-duplicate-settlement'}});
for(const id of ['M22','M26','M27','M39','M40']){event(id).sourceRefs.push('design/S12/主线分支修订与未完清单.md#'+id);event(id).branchPolicy='采用S12-04修订：本世证据、署名、职责与私人答复分开；允许诚实发展、合作、未定或终止；不反向要求后续XR';}
for(const id of ['F01','F02','F03','F04'])event(id).extensionRule='甄沈各按本世实际相伴、合作、未定或终止落款；不强制九线相守，不回算旧史册';
const companions=[['CP-C09-1',23,10,6,'XR09-05'],['CP-C09-2',27,1,4,'XR09-06'],['CP-C10-1',24,10,5,'XR10-05'],['CP-C10-2',27,4,4,'XR10-06']].map(([id,y,m,n,req])=>({id,actor:id.slice(3,6),recommended:[y,m,n],period:'evening',focusWeek:weekAt([y,m,n]).id,slots:1,requires:[req],gates:['actual-established-stage','current-mutual-consent'],cooperationAlternative:'不生成伴侣事实，空位可自行活动',budget:'activity-variant-not-logical-event',status:'design-only-runtime-pending'}));
const travel=[{actor:'C03',visits:[{start:[3,10,1],end:[3,10,8]},{start:[5,4,1],end:[5,4,8]},{start:[17,10,1],end:[17,10,8]},{start:[27,9,1],end:[27,11,2]}],default:'外任，书信至少单程7日；额外归京须实际行程与核准',departure:[27,11,2]}, {actor:'C05',visits:[{start:[5,7,2],end:[5,7,8]},{start:[11,4,2],end:[11,4,8]},{start:[22,10,2],end:[22,10,8]},{start:[27,12,16],end:[27,12,22]}],default:'王府，以上均为须实际接受的往返候选；未接受不得到场'}];
const policies={calendar:{daysPerMonth:30,monthsPerYear:12,spanStart:[3,1,1],spanEnd:end,physicalDays:10080},weekly:{slots:6,dailySlots:2,mainPackages:2,decisions:2,activeProjects:2,extensionPerQuarter:1,extensionRequiresExplicitAcceptance:true,emptyQuarterMayRequestExtension:true,extensionCannotOverlap:true},monthly:{key:'year-month',count:336,settle:'actual-date-once',rates:'运行值12/9仅作为试调参照，长期平衡按S14后续核算，不叠季度或年度收益'},parenthood:{gestationDaysCandidate:300,status:'fictional-calendar-design-parameter-not-implemented',birthNeverFromConsentAlone:true,adultAgeDays:18*360,adultBeyondFinal:'pending-not-blocking',none:'education-alternative-and-adult-not-applicable',sharedAdultCost:1},regularAdvance:{barriers:['due-appointment','pending-main-or-subscene','project-decision','project-due-report','message-delivery-and-answer','month-end','actual-birthday-stage','travel-and-rest-change'],automatic:['accepted-routine-only','single-month-ledger'],neverAutomatic:['accept-invitation','execute-key-node','create-birth','award-epilogue','grant-romance']},late:{romanceNode:'next-legal-meeting-or-letter-when-supported, never bypass presence',ordinaryMain:'later-legal-week-within-final',epilogue:'read-current-date-only-after-real-prerequisites',sealedF00:'explicit-future-copy-required-original-sealed-save-unchanged'},repairTail:{trigger:'F04',scope:'post-year30-repair-interface-not-a-ninth-volume',dates:'actual dates may continue into year31; no frozen-date repair or fake work periods',income:'no replay of year30 or past monthly keys; postcap budget rules require S14/S15 implementation',newLogicalEvents:0,completion:'repair existing finite unresolved items, then generate a new current chronicle; preserve old F04'} };
policies.sameMomentOrder=['travel-and-presence-check','due-commitments-and-explicit-choices','month-end-once','chronicle-after-month-end'];
const sources=['design/重生长雍帝王赋_AI文游游戏设计规范_V1.2.docx','design/重生长雍帝王赋_周活动完整玩法方案_讨论稿V1.0.docx','design/重生长雍帝王赋_完整施工计划与验收要求_V1.0.docx','design/S01/事件总表.json','design/S01/周排程.json','design/S12/扩展二线路线卡.json','design/S12/主线分支修订与未完清单.md'].map(p=>({path:p,sha256:createHash('sha256').update(fs.readFileSync(new URL(p,root))).digest('hex')}));
for(const w of weeks){w.contentRefs=[...events.filter(e=>e.focusWeek===w.id).map(e=>e.id),...events.flatMap(e=>e.stages||[]).filter(s=>s.focusWeek===w.id).map(s=>s.id),...companions.filter(c=>c.focusWeek===w.id).map(c=>c.id)];w.lifeChoices=['study','rest','accepted-meeting-or-walk'];w.payoffRule='仅引用本周实际成果与已发生回应；没有新增事件时保留独处与真实常规记录';w.expectationRule='只引用已接受约期、真实工期或下一已登记窗口，不预先答应';}
const plan={schemaVersion:1,date:'2026-10-27',task:'S14-01',status:'design-accepted-runtime-pending',sources,policies,volumes,weeks,years,extensionCandidates,travel,companions};
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(new URL('长期周排程.json',dir),JSON.stringify(plan,null,2)+'\n');fs.writeFileSync(new URL('后期事件映射.json',dir),JSON.stringify({schemaVersion:1,status:plan.status,fullRegistryCount:181,firstFullIds:registry.filter(e=>e.first&&e.full).map(e=>e.id),events:events.sort((a,b)=>ord(a.recommended)-ord(b.recommended)||a.id.localeCompare(b.id))},null,2)+'\n');
const lines=['# 三年至三十年年度周历','','这是设计排程，不是运行通关；每个重点周6格，其他日期为有到期中断的常规时段。延展候选不等于已接受。','', '| 年份 | 重点周（起止日） | 常规时段 | 月账检查点 |','| --- | --- | --- | --- |',...years.map(y=>`| ${y.year} | ${weeks.filter(w=>w.start[0]===y.year).map(w=>w.id+' '+label(w.start)+'—'+label(w.end)).join('；')} | ${y.regularPeriods.map(r=>label(r.start)+'—'+label(r.end)).join('；')} | 1—12月各30日晚，共12次 |`)];
fs.writeFileSync(new URL('年度周历.md',dir),lines.join('\n')+'\n');
fs.writeFileSync(new URL('事件映射表.md',dir),['# 后期127逻辑单元映射','','子阶段、四个伴侣变体不另增逻辑数。四史册互斥，不能声称一条路线同时经历四种结局。','', '| ID | 标题 | 推荐日期／窗口 | 占格 | 前置 | 承载 |','| --- | --- | --- | --- | --- | --- |',...events.map(e=>`| ${e.id} | ${e.title} | ${label(e.recommended)}${e.dateRule?'（按真实日期触发，非强制此日）':''} | ${e.slots} | ${e.requires.join('、')||'合法参与者与日程'} | ${e.focusWeek||'常规到期／显式延展'} · ${e.delivery} |`)].join('\n')+'\n');
console.log(JSON.stringify({weeks:weeks.length,extensions:extensionCandidates.length,events:events.length,regularDays:years.reduce((n,y)=>n+y.regularPeriods.reduce((s,r)=>s+ord(r.end)-ord(r.start)+1,0),0)}));
