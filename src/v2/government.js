// 政务事实、排期与抽取均由引擎决定，AI 只处理亲笔朱批。
import {PEOPLE} from './data.js';
export const monthIndex=s=>(s.year-1)*12+s.month;
export const PROVINCE_NAMES=['直隶','山东','河南','江南','浙江','湖广','四川','陕甘','云贵','广东'];
const topics=[
 ['河工',[2,3,6,7,8,9],['堤岸渗水','疏浚运河','添筑子堤','修复涵洞','河工冒领','秋汛备料','河员保举'],'先勘河道，按丈核销'],
 ['赈灾',[1,2,4,6,7,10,12],['旱田失收','蝗卵待除','暴雪封路','疫病初起','饥户待赈','粥厂缺粮','流民安置'],'开仓赈济，派员核户'],
 ['钱粮',null,['库银亏空','火耗私派','漕粮短解','盐课拖欠','清丈隐田','仓谷霉变','养廉核支'],'先核账册，再议追缴'],
 ['吏治',null,['知县侵渔','同僚互参','廉员举荐','胥吏勒索','驿站扰民','官员避责','考语失实'],'派员查核，毋许罗织'],
 ['边务',null,['粮道梗阻','边堡待修','军马缺草','营兵冒饷','商道争执','屯田乏种','哨探请赏'],'核实军需，限期回报'],
 ['刑名',null,['命案疑点','久系未决','盗案株连','狱粮短缺','证人翻供','赃物失落','冤狱申诉'],'复核供证，慎勿滥刑'],
 ['文教',null,['学舍漏雨','乡试冒籍','义学缺师','书院田产','寒士赴考','学田侵占','考棚修缮'],'地方筹措，官府稽核'],
 ['民情',null,['米价骤涨','佃户争租','市井械斗','渡口失修','水源争用','粮商囤积','乡约争讼'],'访查民情，平粜调剂']
];
const details=[
 ['老堤背水处已见浑水，河员请先埋桩护脚，村民却怕取土毁田。','运河浅滩使粮船停泊，经办请雇民夫挑浚，沿岸春耕又正缺人手。','大堤外两村请求添筑子堤，上游乡民担心堵水之后水势转向自家。','涵洞木闸腐坏，修闸须暂闭灌口，田户与河员各执一词。','料石领数多于实砌丈尺，承办声称洪水冲失，账房却无验收文书。','秋汛将至，芦苇木料尚未运齐，商人请先领银再交料。','一名熟悉河道的州同被荐补缺，履历清楚，却无大员为其作保。'],
 ['麦苗久旱枯黄，州县请缓征新粮，粮商又趁机收买田契。','田间已见蝗卵，乡民愿合力掘除，但缺口粮不能久役。','山路积雪封闭，赈粮不能到村，州县请雇驮队转运。','村中发热病者日增，医者请设药棚，附近市集却怕封路断炊。','旧册漏记逃荒归来的饥户，按册给粮省事，按实重查则要迟发。','粥厂仓粮将尽，有胥吏以稀粥充数，领赈人已在门前争吵。','邻境流民进入县城，乡绅请逐回原籍，知县请给荒地安插。'],
 ['交代库银短少，前任称银已解京，新任称未得收据。','州县以熔银耗损为名私加钱粮，民户交银之后仍拿不到完税票。','漕船解粮不足额，押运称沿途霉损，仓官却说出仓已短。','盐商拖欠课银，愿以家产抵缴，但请宽限到下一引盐售出。','丈田册与鱼鳞图不符，豪户隐田多年，小户却担着虚额。','仓谷表面完好，底层受潮霉烂，仓役请折银补买。','地方请求核定养廉银，称可禁绝私派，户部担心公项挪用。'],
 ['县令借办差向商户索银，商民各有呈词，却不敢具名对质。','两名官员互指侵占公项，所附账册年月相互矛盾。','一名知县任内清欠有方，百姓联名保举，同僚称其沽名。','书吏把持发票，声称非添纸笔费不予登记，正印官称毫不知情。','驿站索取夫马超过额数，民户逃役，来往公文又不敢迟递。','河渠争讼跨两县，各官只发移文，不肯亲到现场划界。','属官考语年年优等，任内讼案却积压数百件，请重核考册。'],
 ['军粮转运遇山路塌方，营中请改道，沿途州县无余夫马。','边堡墙垣坍塌，守将请修，工料估数却比旧例多出一半。','军马瘦损，草料商请加价供给，营官怀疑私卖草料。','点名有兵额无本人，营官称病假在外，却不能呈出诊册。','边市商队争夺通行次序，请设公所稽查，又恐增添苛索。','屯田荒芜，军户请给种籽，守将主张仍派军户操练。','哨探带回边外消息，请给赏银，守将尚不能核明虚实。'],
 ['命案只有一人招供，验尸伤痕与供词不合，按察使请重审。','狱中人犯久押未结，案卷移送三次，证人已散居他县。','缉盗牵连同村数十家，失主只能认出赃物，不能认出人。','牢饭供应短缺，狱吏向犯人家属索银，贫户无力应付。','证人翻供称原供出于恐惧，原审官请求先治其反复之罪。','封存赃物开验时短少，库吏称上回点验并未逐件登记。','老母叩衙诉子冤枉，原案供词相同，却查不到当年物证。'],
 ['学舍屋漏，学生无处课读，学官请拨银，地方称可募修。','应试生员籍贯与保结不符，学官请彻查，恐耽误无辜考生。','义学有屋无师，贫家子弟已经散去，请延聘乡间老儒。','书院田产被族人占种，山长请归公，族人称原系先人捐赠。','寒士进城赴考无盘缠，乡约请给路费，又怕冒名领银。','学田租银多年未入公账，管事称替学中置办纸笔已经用尽。','考棚梁柱朽坏，距乡试不远，请先修危房，其他缓办。'],
 ['米价连涨，商人称运输艰难，乡民却见粮栈夜夜装车外运。','佃户请求因歉收减租，田主称自身亦须缴纳钱粮。','两市商贩因摊位争执械斗，乡绅请保释本族子弟。','渡口旧船破损，船户请拨料修船，又请准许加收渡钱。','上下两村争灌溉水源，县令按旧例分水，两村皆不肯服。','粮商囤米待价，州县拟开仓平粜，商人请以低息借粮替代。','乡约强令各户摊派祭费，贫户拒缴，族老请求照乡规处置。']
];
export const MEMORIAL_POOL=topics.flatMap(([type,months,titles,special],t)=>titles.map((title,i)=>({id:`M${t}-${i}`,type,months,province:PROVINCE_NAMES[(t+i)%10],title,special,body:`臣谨奏：本省${title}，${details[t][i]}臣已令属员封存原册，分别听取当事人供述。此事既关地方生计，也关官府信用，不敢只凭一面之词轻断。谨将勘报与经费清单随折呈览，恳请皇上裁夺；奉旨之后，臣当逐项办理，限期回奏，绝不以空言塞责。`})));
export function initGovernment(s){s.memorials??=[];s.memorialUsed??=[];s.followups??=[];s.govSerial??=0;s.govNotes??=[];s.govReports??=[];initProvinces(s);initPolicies(s);return s;}
export function authorOf(s,province){const offices={直隶:'zhili',江南:'liangjiang',四川:'chuanshan',陕甘:'chuanshan',云贵:'yungui',河南:'henan',浙江:'zhejiang',山东:'shandong',湖广:'huguang',广东:'guangdong'};return Object.keys(s.appointments||{}).find(id=>s.appointments[id].office===offices[province]&&!s.flags?.['gone_'+id])||null;}
export function addMemorial(s,p){const author=authorOf(s,p.province);const m={...p,uid:'mem'+(++s.govSerial),author:author?PEOPLE[author].name:(p.province+'巡抚'),at:monthIndex(s)};if(m.disaster)s.memorials.unshift(m);else s.memorials.push(m);return m;}
// 核实只查案情；需支出的工程、赈务查明之后仍须另批经费。
export const needsFunding=m=>['河工','赈灾','边务','文教','民情'].includes(m.type);
export const memorialCost=(m,choice)=>choice==='inspect'?2:choice==='approve'?({河工:18,赈灾:18,边务:18,文教:12,民情:8,钱粮:6,吏治:6,刑名:4}[m.type]||6):0;
export function archiveReports(s){initGovernment(s);const reports=s.memorials.filter(m=>m.result);s.govReports.push(...reports);s.memorials=s.memorials.filter(m=>!m.result);return reports.length;}

export function memorialMonth(s,rng){initGovernment(s);const now=monthIndex(s);if(s.memorialAt===now)return;s.memorialAt=now;s.reviewSession=null;s.govNotes=[];
 for(const f of s.followups.filter(f=>f.at<=now&&f.id==='department')){addMemorial(s,{...f.data,disasterKey:f.data.disasterKey||f.data.uid,department:true,body:f.data.body+'\n前次朱批“交部议”，户部会同有关衙门核过清册，建议先勘实情、分批给银；请皇上再裁。'});s.govNotes.push('前次朱批交部议：'+f.data.title+'，部议已回。');}
 s.followups=s.followups.filter(f=>!(f.at<=now&&f.id==='department'));
 const n=3+Math.floor(rng(s)*3);for(let i=0;i<n;i++){if(s.memorialUsed.length>=MEMORIAL_POOL.length)s.memorialUsed=[];const eligible=MEMORIAL_POOL.filter(p=>!s.memorialUsed.includes(p.id)&&(!p.months||p.months.includes(s.month)));if(!eligible.length){addMemorial(s,{id:`B${now}-${i}`,type:'民情',province:PROVINCE_NAMES[(now+i)%10],title:'地方月报·'+now+'-'+i,body:'臣谨奏：本月应季旧案已逐件呈览，尚有民户补报口粮与春耕借种的情形。州县正在按里甲核验，暂未发现大户冒领，但偏远村落尚未走访。臣拟先将现有查册送部存核，余户续查续报，不敢以一时平静视作全省无事，伏乞皇上垂察。',special:'覆核里甲清册',result:true});continue;}const p=eligible[Math.floor(rng(s)*eligible.length)];s.memorialUsed.push(p.id);addMemorial(s,p);}}
export function beginReview(s,spend){initGovernment(s);if(!s.memorials.length)throw Error('折匣里没有未批奏折。');spend(s);s.reviewSession={at:monthIndex(s),left:s.done?.W08==='council'?5:3,held:[]};return {title:'折匣',text:'展开奏折，逐道朱批。',stats:{},people:{}};}
export function checkReview(s,uid){const r=s.reviewSession,m=s.memorials.find(m=>m.uid===uid);if(!m||!r||r.at!==monthIndex(s)||r.left<=0||s.night||r.held.includes(uid))throw Error('这一时辰不能再批这道折子。');return m;}
export function memorialOptions(m){if(m.result)return [['ack','阅，知道了']];return [['approve','准'],['reject','驳'],...(!m.department?[['department','交部议']]:[]),['hold','留中'],...(!m.inspectionPending&&!m.inspected?[['inspect',needsFunding(m)?'先核实案情（仍须另批经费）':m.special||'派员核实']]:[])];}
export function decideMemorial(s,uid,choice,api){const m=checkReview(s,uid);if(!memorialOptions(m).some(([id])=>id===choice))throw Error('没有这道朱批。');const cost=memorialCost(m,choice);if(s.stats.treasury<cost)throw Error(`国库不足${cost}万两，宜先缓办或交部议。`);
 s.reviewSession.left--;if(choice==='hold'){s.reviewSession.held.push(uid);return {title:m.title,text:'朱批留中，原折仍留在折匣。',stats:{},people:{}};}
 const pending=choice==='inspect'&&needsFunding(m);if(pending){m.inspectionPending=true;s.reviewSession.held.push(uid);}else s.memorials=s.memorials.filter(x=>x.uid!==uid);
 if(choice==='department')s.followups.push({at:monthIndex(s)+1,id:'department',data:m});
 const stats={...api.funds(s,{treasury:-cost}),...api.applyStats(s,['approve','inspect'].includes(choice)?{health:-1}:{})};
 scheduleDecision(s,m,choice);api.log(s,`${m.province}·${m.title}：${memorialOptions({...m,inspectionPending:false,inspected:false}).find(x=>x[0]===choice)?.[1]||'阅'}`,'政');return {title:m.title,text:choice==='department'?'交有关部臣核议，下月带原折复奏。灾情不会因此停止发展。':pending?'已派员查勘，费用二万两；核实后仍须另批经费。灾情不能以核代赈。':choice==='approve'?`已批经费${cost}万两，经办衙门须据实回奏。`:'朱批已发，后续据实回奏。',stats,people:{},memorial:m,choice};}

export function backlog(s,applyStats){const n=s.memorials.length;if(n>6){s.govNotes.push(`折子堆了：尚有${n}道未批。`);applyStats(s,{court:-1,...(n>10?{health:-1}:{})});}}

export const OFFICE_PROVINCES={zhili:['直隶'],liangjiang:['江南'],chuanshan:['四川','陕甘'],yungui:['云贵'],henan:['河南'],zhejiang:['浙江'],shandong:['山东'],huguang:['湖广'],guangdong:['广东']};
const clamp=n=>Math.min(100,Math.max(0,n));
export function initProvinces(s){s.provinces??={};for(const name of PROVINCE_NAMES)s.provinces[name]??={livelihood:55,integrity:50,revenue:55,reports:[]};s.regionCarry??={people:0,court:0};}
export function regionChange(s,name,changes,api){const p=s.provinces[name];if(!p)return;const old={...p};for(const [k,v]of Object.entries(changes))if(['livelihood','integrity','revenue'].includes(k))p[k]=clamp(p[k]+v);
 // 十省等权；小数变化累积，避免每月四舍五入吞掉地方变化。
 for(const [national,key]of [['people','livelihood'],['court','integrity']]){s.regionCarry[national]+=(p[key]-old[key])/10;const d=Math.trunc(Number(s.regionCarry[national].toFixed(6)));if(d){api.applyStats(s,{[national]:d});s.regionCarry[national]-=d;}}}
export function provinceIncome(s){return Math.round(Object.values(s.provinces).reduce((n,p)=>n+(p.revenue-55)*.09,0)*100)/100;}
export function scheduleDecision(s,m,choice){if(['department','hold'].includes(choice)||m.result)return;const delay=m.type==='河工'?3:2;s.followups.push({at:monthIndex(s)+delay,id:'decision',data:{ruleVersion:2,requestUid:m.uid,needsFunding:needsFunding(m),province:m.province,title:m.title,type:m.type,choice,authorId:authorOf(s,m.province),funding:choice==='approve'?18:0,source:choice==='approve'?'准':choice==='reject'?'驳':'派员核实'}});}
function report(s,data,text){const body=`前次朱批“${data.source}”，所办${data.title}一事，今据实回奏：${text}`;s.govNotes.push(body);s.provinces[data.province].reports.unshift(body);s.provinces[data.province].reports=s.provinces[data.province].reports.slice(0,3);s.govReports.push({title:data.title+'·回报',province:data.province,type:'回报',body,result:true,at:monthIndex(s)});if(s.govReports.length>120)s.govReports.shift();}
function resolveDecision(s,d,api){
 const p=s.provinces[d.province],officer=d.authorId&&s.appointments[d.authorId]?.office&&OFFICE_PROVINCES[s.appointments[d.authorId].office]?.includes(d.province)?s.people[d.authorId]:null,competence=officer?officer.ability*officer.loyalty/100:4;
 // 0.41.0已经付出代价、排好的旧朱批沿用原有成功率及收益。
 if(!d.ruleVersion){if(d.choice==='reject'){regionChange(s,d.province,{livelihood:d.type==='赈灾'?-7:-2,integrity:-1},api);report(s,d,'原案搁置，地方请求补救。');}else{const ok=api.rand(s)<Math.min(.9,.25+competence*.05+p.integrity*.003+d.funding*.008);regionChange(s,d.province,ok?{livelihood:4,integrity:d.choice==='inspect'?5:1,revenue:2}:{livelihood:-5,integrity:-3,revenue:-2},api);report(s,d,ok?'旧案办理已见实效，清册核实。':'旧案经办走样，须重新料理。');}return;}
 if(d.choice==='reject'){regionChange(s,d.province,d.type==='赈灾'?{livelihood:-5}:d.needsFunding?{livelihood:-1}:{integrity:-1},api);report(s,d,d.type==='赈灾'?'赈项未开，流民请求补救。':'原案未办，地方继续按旧章维持。');return;}
 if(d.choice==='inspect'&&d.needsFunding){const m=s.memorials.find(m=>m.uid===d.requestUid);if(!m)return;m.inspectionPending=false;m.inspected=true;m.body+='\n前次朱批先核实：经费清册已核，请另裁是否拨银。';report(s,d,'勘报已核清；尚未拨银执行，不能算工程或赈务已成。');return;}
 const chance=Math.min(.92,.35+competence*.035+p.integrity*.002+(d.choice==='approve'?.18:0)),ok=api.rand(s)<chance;
 const effects=d.choice==='inspect'?(ok?{integrity:2,revenue:1}:{integrity:-1}):(ok?{livelihood:d.needsFunding?4:2,integrity:2,revenue:2}:{livelihood:-2,integrity:-1,revenue:-1});regionChange(s,d.province,effects,api);
 report(s,d,ok?(d.choice==='inspect'?'账证已经查明，责成整顿；未凭核查发放工程与赈款。':d.type==='河工'?'汛期堤岸稳固，拨银按册销核。':'经费已落实，地方办理见效。'):(d.type==='河工'?'工程遇险，须补救并追查经办。':'经办未达预期，须重新料理。'));
}

export function regionalMonth(s,api){initGovernment(s);const now=monthIndex(s);if(s.regionalAt===now)return;s.regionalAt=now;
 for(const f of s.followups.filter(f=>f.at<=now&&f.id==='decision'))resolveDecision(s,f.data,api);
 for(const f of s.followups.filter(f=>f.at<=now&&f.id==='disaster')){const deferred=s.followups.find(x=>x.id==='department'&&x.data.uid===f.data.uid);const m=s.memorials.find(m=>m.uid===f.data.uid||m.disasterKey===f.data.uid)||deferred?.data;if(!m)continue;if(deferred)s.followups=s.followups.filter(x=>x!==deferred);s.memorials=s.memorials.filter(x=>x.uid!==m.uid);const id='DIS'+m.uid;s.dyn??={};s.dyn[id]={id,title:m.province+'灾情加重',kind:'government',actor:authorOf(s,m.province)||'C28',body:'前次灾情折未奉朱批，流民已聚集州城。地方请速开仓，不可再缓。',options:[{id:'relief',label:'开仓急赈（国库二十五万两）',effects:{},reply:'赈粮送到，地方仍须核查受灾户口。'},{id:'deny',label:'令地方自行筹措',effects:{},reply:'州县四处借粮，百姓仍在等待。'}],disaster:m.province};s.agenda.push(id);s.govNotes.push(m.province+'灾情未处理，已升级为要务。');regionChange(s,m.province,{livelihood:-3,revenue:-2},api);}
 s.followups=s.followups.filter(f=>!(f.at<=now&&['decision','disaster'].includes(f.id)));
 if(api.rand(s)<.38){const seasonal=s.month<=3?['春旱',['直隶','山东','河南']]:s.month<=6?['夏汛',['河南','江南']]:s.month<=9?['秋蝗',['山东','直隶']]:['冬雪',['陕甘']];const [title,names]=api.rand(s)<.15?['疫病',PROVINCE_NAMES]:seasonal;const province=names[Math.floor(api.rand(s)*names.length)],m=addMemorial(s,{title:province+title,province,type:'赈灾',body:`臣谨奏：${province}发生${title}，已据州县查报，乡民口粮与田地均受损。臣已令属员按村核户，封存受损田亩与存粮清册，不敢冒报浮数。恳请速定赈务，若迁延至下月，恐流民聚集、灾情加重；奉旨之后，当据实际受赈户数续报。`,disaster:true,special:'先行平粜，核户给赈'});s.followups.push({at:now+1,id:'disaster',data:{uid:m.uid}});}}
export function regionalMonthly(s,api){for(const [name,p]of Object.entries(s.provinces)){const id=authorOf(s,name),officer=id?s.people[id]:null;
 if(officer){const v=officer.ability>=8&&officer.loyalty>=70?1:officer.loyalty<50?-1:0;if(s.month%2===0)regionChange(s,name,{livelihood:v,integrity:v,revenue:v},api);}
 // 未点名督抚仍有常任州县署理，按季向日常水平缓慢回归，而非全省持续崩坏。
 else if(s.month%3===0)regionChange(s,name,Object.fromEntries(['livelihood','integrity','revenue'].map(k=>[k,Math.sign(50-p[k])])),api);
 }return provinceIncome(s);}
export function sentimentAdjustment(s){const mean=Object.values(s.provinces).reduce((n,p)=>n+p.livelihood,0)/10;return Math.abs(mean-s.stats.people)>8?Math.sign(mean-s.stats.people):0;}
export function courtAdjustment(s,officeSupport=0){const mean=Object.values(s.provinces).reduce((n,p)=>n+p.integrity,0)/10;const target=clamp(50+(mean-50)*.75+Math.min(8,Math.max(-8,officeSupport*2)));return Math.abs(target-s.stats.court)>=5?Math.sign(target-s.stats.court):0;}

export function resolveDisaster(s,sc,choice,api){if(!sc.disaster)return;if(choice==='relief'){api.funds(s,{treasury:-25});regionChange(s,sc.disaster,{livelihood:5},api);}else regionChange(s,sc.disaster,{livelihood:-3,integrity:-1},api);}

export const POLICIES={huohao:{name:'火耗归公与养廉银',pilot:'河南',host:'C30',desc:'参考山西、河南试点，先核火耗、再定养廉，逐步推广。'},land:{name:'摊丁入亩',pilot:'直隶',host:'C31',desc:'先试点，再将丁银并入田赋。'},service:{name:'士民一体当差',pilot:'浙江',host:'C31',desc:'士绅也须承担差役，阻力较大。'},tusi:{name:'改土归流',pilot:'云贵',host:'C29',desc:'先抚后改，设流官承接地方事务。'}};
export function initPolicies(s){s.policies??={};for(const id of Object.keys(POLICIES))s.policies[id]??={progress:id==='tusi'?(s.done?.W03==='force'?30:s.done?.W03==='slow'?15:0):id==='land'&&s.done?.V07?10:0,active:false,host:null,pilot:POLICIES[id].pilot};s.factions??={'八爷党':s.done?.V08?10:35,'新政':25,'中立':40};s.secrets??=[];s.assessments??={};s.tenureBaseline??={};}
export function factionChange(s,faction,n){const k=faction==='新政'?'新政':faction==='八爷党'?'八爷党':'中立';s.factions[k]=clamp(s.factions[k]+n);}
export function policyHostValid(s,id,host,pilot){const a=s.appointments[host];return !!({huohao:['河南'],land:['直隶'],service:['直隶','河南','浙江','江南'],tusi:['云贵']}[id]?.includes(pilot))&&!!s.people[host]&&!s.flags?.['gone_'+host]&&!!a?.office&&!!OFFICE_PROVINCES[a.office]?.includes(pilot);}
export function validatePolicy(s,id,host,pilot){if(!POLICIES[id]||!s.provinces[pilot]||!policyHostValid(s,id,host,pilot))throw Error('须选在试点省任职的地方官主持。');if(s.policies[id].progress>=100)throw Error('这项新政已完成。');if(s.stats.treasury<12)throw Error('试点需国库十二万两。');}
export function launchPolicy(s,id,host,pilot,api){const p=s.policies[id];Object.assign(p,{active:true,host,pilot});api.funds(s,{treasury:-12});factionChange(s,'新政',3);api.log(s,`${PEOPLE[host].name}主持${POLICIES[id].name}，于${pilot}试点`,'政');}
export function policyMonthly(s,api){for(const [id,p]of Object.entries(s.policies)){if(p.progress>=100){if(s.stats.treasury<1){s.govNotes.push(POLICIES[id].name+'维持经费不足，本月收益暂停。');continue;}api.funds(s,{treasury:-1});if(s.month%3===0)for(const [name,province]of Object.entries(s.provinces)){const key=id==='land'||id==='huohao'?'revenue':'livelihood';if(province[key]<75)regionChange(s,name,{[key]:1},api);}continue;}if(!p.active)continue;if(!policyHostValid(s,id,p.host,p.pilot)){s.govNotes.push(POLICIES[id].name+'主持人已离任，进度暂停，须重新委任。');continue;}if(s.stats.treasury<6){s.govNotes.push(POLICIES[id].name+'经费不足，进度暂停。');continue;}api.funds(s,{treasury:-6});const officer=s.people[p.host],province=s.provinces[p.pilot];const resistance=api.rand(s)<(id==='service'?.4:.22);const gain=Math.max(1,Math.round(officer.ability*.3+province.integrity*.025+(p.host===POLICIES[id].host?2:0)+(officer.loyalty-60)/20));p.progress=clamp(p.progress+(resistance?-2:gain));if(resistance){regionChange(s,p.pilot,{integrity:-2},api);s.govNotes.push(POLICIES[id].name+'受阻：士绅抗议，言官参劾主持人，进度退二。');factionChange(s,'八爷党',2);}else{regionChange(s,p.pilot,{revenue:1},api);factionChange(s,'新政',1);}if(p.progress>=100)s.govNotes.push(POLICIES[id].name+'推广完成，今后各省每月受益。');}}
export function policyStory(s,id,choice){if(id==='W03'){const p=s.policies.tusi;p.progress=Math.max(p.progress,choice==='force'?30:choice==='slow'?15:0);}if(id==='V07')s.policies.land.progress=Math.max(s.policies.land.progress,10);if(id==='V08'){s.factions['八爷党']=choice==='spare'?20:8;}}
export function secretMonth(s,api){const now=monthIndex(s);for(const f of s.followups.filter(f=>f.at<=now&&f.id==='secret')){const d=f.data,success=api.rand(s)<d.chance;const text=`前次朱批“据此查办”：${d.province}${d.topic}，${success?'已查实，责成整顿。':'查无实据，告密者须自省，被查者心生芥蒂。'}`;if(success){api.applyStats(s,{court:s.stats.court<70?1:0});regionChange(s,d.province,{integrity:2},api);factionChange(s,'新政',2);}else{s.people[d.author].loyalty=clamp(s.people[d.author].loyalty-6);if(d.target)api.gain(s,d.target,-5);}s.govNotes.push(text);s.provinces[d.province].reports.unshift(text);s.provinces[d.province].reports=s.provinces[d.province].reports.slice(0,3);}
 s.followups=s.followups.filter(f=>!(f.at<=now&&f.id==='secret'));
 for(const province of PROVINCE_NAMES){const author=authorOf(s,province);if(!author||s.people[author].loyalty<70||api.rand(s)>=.12)continue;const topics=['属员亏空','米价暗涨','地方绅商与八爷党往来'];const topic=topics[Math.floor(api.rand(s)*topics.length)],target=Object.keys(s.appointments).find(id=>id!==author&&s.appointments[id].office&&['文官','武官'].includes(PEOPLE[id].category));s.secrets.push({uid:'sec'+(++s.govSerial),author,province,topic,target,chance:Math.min(.85,.35+s.people[author].ability*.04),body:`臣${PEOPLE[author].name}密奏：据本省查访，${topic}已有端倪，尚待核实。此非定案，不敢张扬，谨请皇上独览，或训示，或交查，臣当恪守机密。`,at:now});}s.secrets=s.secrets.slice(-30);
 if(s.factions['八爷党']>=65&&api.rand(s)<.35){api.applyStats(s,{court:-2});s.govNotes.push('八爷党联名保举，廷议掣肘，朝局减二。');}}
export function decideSecret(s,uid,choice,api){const m=s.secrets.find(x=>x.uid===uid);if(!m||m.done||!['keep','warn','investigate'].includes(choice))throw Error('这封密折已经收存，或处置不明。');m.done=choice;if(choice==='warn'){s.people[m.author].loyalty=clamp(s.people[m.author].loyalty+1);}if(choice==='investigate')s.followups.push({at:monthIndex(s)+2,id:'secret',data:m});api.log(s,'密折已御览收存','政');}
export function snapshotTenure(s,id){const provinces=OFFICE_PROVINCES[s.appointments[id]?.office]||[];s.tenureBaseline[id]={at:monthIndex(s),provinces:Object.fromEntries(provinces.map(name=>[name,{...s.provinces[name],reports:[]}]))};}
export function assessmentRows(s){return Object.entries(s.appointments).filter(([id,a])=>a.office&&!s.flags?.['gone_'+id]&&['文官','武官','宗室'].includes(PEOPLE[id].category)).map(([id,a])=>{const base=s.tenureBaseline[id];const change=base?Object.entries(base.provinces).map(([name,p])=>`${name}：民生 ${s.provinces[name].livelihood-p.livelihood}、吏治 ${s.provinces[name].integrity-p.integrity}、财赋 ${s.provinces[name].revenue-p.revenue}`).join('；'):'';return {id,title:a.title,ability:s.people[id].ability,loyalty:s.people[id].loyalty,change:change||'京职或尚无地方任期记录',done:s.assessments[s.year]?.[id]};});}

export function governanceReady(s){return Object.values(s.policies).filter(p=>p.progress>=100).length>=2&&Object.values(s.provinces).reduce((n,p)=>n+p.integrity,0)/10>=60&&Object.values(s.provinces).every(p=>p.integrity>=45)&&s.memorials.filter(m=>!m.result).length<=6;}
