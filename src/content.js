import {V8_EVENTS} from './volume8-content.js';
import {V7_EVENTS} from './volume7-content.js';
import {V6_EVENTS} from './volume6-content.js';
import {V5_EVENTS} from './volume5-content.js';
import {V4_EVENTS} from './volume4-content.js';
import {EXTENSION_EVENTS} from './extension-content.js';
import {V3_EVENTS} from './volume3-content.js';
import {installStory} from './story.js';
export const VERSION = '0.24.0';
export const SPEC = 'V1.2';
export const STAT_NAMES = {treasury:'国库',people:'民生',execution:'政令执行',stability:'朝局稳定',defense:'边防',palace:'六宫秩序',health:'圣躬',mood:'心绪'};
const person = (id,name,title,sign,color,trust,goal,voice,request,place='在宫') => ({id,name,title,sign,color,trust,goal,voice,request,place});
export const CHARACTERS = [
 person('C02','苏培盛','御前总管','灯','#6a5942',40,'御前的灯、茶与更次，他总比别人多惦记一些；自己的疲惫却不肯先说。','简短周全，私下才试探着提自己的请求。','皇上今日不急着看折子？那奴才先把这盏茶放稳。'),
 person('C03','年羹尧','抚远大将军','图','#70463b',35,'西北的风沙藏在他的字里，凯旋的人也想有一句不只问战功的问候。','直接、少虚辞；关切将士，也有自负。','西北风大，信纸总压不住。倒是想问问，京里那张舆图，还在案上么？','待凯旋'),
 person('C04','温实初','太医院医官','药','#617360',25,'药箱里除了脉案，还有想教给后来人的本事，以及几句尚未说出口的话。','先讲观察再给建议，温和而有底线。','臣今日新添了一页批注，倒想请皇上先看看。上回说到一半的那处，已有了下文。','待召'),
 person('C05','允礼','果郡王','笛','#53757a',25,'王府有差事，园中有笛声；他愿与你认真争一处节拍，也愿听你把话说完。','疏朗有分寸，谈音律，也谈具体的王府事务。','这页旧谱有两种奏法。皇兄先听，臣弟暂且不说自己喜欢哪一种。','王府'),
 person('C06','宜修','中宫皇后','环','#6b586f',30,'宫账最难的一页，她已独自看了很久；案侧的空位，却一直留着。','稳重，先陈事实后表态，不轻信一时温言。','茶还热着。皇上今日想先听宫里的事，还是……坐一会儿再说？'),
 person('C07','年世兰','翊坤宫华妃','绣','#944d43',30,'她喜欢明亮的花，也藏不住尖锐的问话；这一次，想听的是真正的答复。','鲜活尖锐，也能直面错误；尊重不能等同包庇。','窗下的花又开了，臣妾自己挑的。皇上进门时，可曾留心看一眼？'),
 person('C08','安陵容','新入宫小主','香','#8a8763',25,'唱到熟悉的一段，她便会忘记怯场；那页曲谱，想端端正正写自己的名字。','由短促试探走向完整表达，不永远怯声。','有一句转音，臣妾又改过了。若皇上愿听，今日想从这一处唱起。','尚未入宫')
];
export const character = id => CHARACTERS.find(c=>c.id===id);
export const TURNS = [
 {id:1,year:1,season:'春',month:1,title:'初醒御案',subtitle:'旧梦醒时，灯火依然。',main:['M01','M02'],focus:'长夜将尽，门外的人还没有走。'},
 {id:2,year:1,season:'夏',month:4,title:'停香无声',subtitle:'一缕香，牵出深宫与边关。',main:['M03','M04'],focus:'翊坤宫的香炉合上，西北的催粮折却又到了。'},
 {id:3,year:1,season:'秋',month:7,title:'玉环与宫账',subtitle:'一枚玉环，未必抵得过一次守诺。',main:['M05'],focus:'她把玉放在掌心，等你坐下来。'},
 {id:4,year:1,season:'冬',month:10,title:'殿前新面',subtitle:'宫门初开，各人自有来路。',main:['M06'],focus:'新面孔走进宫门，旧日往事还未发生。'},
 {id:5,year:2,season:'春',month:1,title:'宫宴微澜',subtitle:'被听见，有时比被赏赐更难。',main:['M07','M08'],focus:'一支被打断的曲，一段还没停的雨。'},
 {id:6,year:2,season:'夏',month:4,title:'御园与凯旋',subtitle:'笛音尚在，西北军报已到。',main:['M09','M10'],focus:'园中笛声正好，宫门外又传来凯旋。'},
 {id:7,year:2,season:'秋',month:7,title:'旧影新衣',subtitle:'有人问旧影，有人寄边书。',main:['M11'],focus:'京中有人问旧影，边关有人寄来风沙。'},
 {id:8,year:2,season:'冬',month:10,title:'六宫新规',subtitle:'两载灯火，先收一卷。',main:['M12'],focus:'灯下的两本宫账，终于翻到了最后一页。'}
];
const opt=(id,label,detail,effects={},flags={})=>({id,label,detail,effects,flags});
const event=(id,title,turn,body,options,extra={})=>({id,title,turn,kind:'main',actor:'C02',location:'养心殿御案',body,options,...extra});
export const EVENTS={...EXTENSION_EVENTS};
function add(e){EVENTS[e.id]=e;return e;}
[
 event('M01','养心惊梦',1,'冷汗沿着鬓边落下。帘外是苏培盛压低的脚步声，御案上那本旧折的日期，却停在雍正元年。\n\n你记得病榻，记得未竟的边报，也记得几个再没能好好说话的人。如今灯还亮着，眼前的折子也还未落朱批。\n\n“皇上，可要传人？”苏培盛在帘外问。先确认这是什么时候，别急着替所有人定下今生。',[
 opt('steady','先稳住心绪','心绪 +4。重生仍是你一人的秘密。',{mood:4},{opening:'steady'}),opt('verify','核对年号与旧折','政令执行 +2，确认本世日期。',{execution:2},{opening:'verify'}),opt('call','唤苏培盛近前','心绪 +2，先问今夜的值守。',{mood:2},{opening:'call'})]),
 event('M02','留茶夜谈',1,'茶已经有些凉了。苏培盛收起空盏，照旧准备退到门外值夜。\n\n上一世，这样的夜晚实在太多。你曾把他的在场当作理所当然，连一句疲惫也未曾细问。如今若要留他，得先让他有说不的余地。',[
 opt('tea','留一盏茶，再说会儿话','心绪 +2。随后进入苏培盛的第一关系节点。',{mood:2},{suTea:true}),opt('duty','先问值守，不急着谈心','政令执行 +1，保留合作与后续相知。',{execution:1},{suTea:false}),opt('rest','让他交班后休息','圣躬 +1、心绪 +1。不会自动生成尚未核对轮值的休假。',{health:1,mood:1},{suRestConcern:true})],{embedded:['R02-01']}),
 event('M03','停香无声',2,'颂芝来报，翊坤宫的香料已按旧例领足。那熟悉的香名落在纸上，你握笔的手停了一瞬。\n\n旧日记忆足以让你警觉，却不是此刻可以公之于众的检验结果。停用、留样、照护与解释，件件都要有人负责。',[
 opt('sample','停供留样，请太医院核验','国库 −2、圣躬 +2、六宫秩序 +2；先保护，再查证。',{treasury:-2,health:2,palace:2},{incense:'testing'}),opt('explain','先说明疑虑，再安排停供','国库 −2、六宫秩序 +3；解释为待核验风险。',{treasury:-2,palace:3},{incense:'explained'}),opt('quiet','暗中换去香料，暂不说明','国库 −1、六宫秩序 −2；留下解释责任。',{treasury:-1,palace:-2},{incense:'hidden',incenseExplanationDue:true})],{actor:'C07',location:'翊坤宫',embedded:['R07-01']}),
 event('M04','新帝第一折',2,'地方库银亏空，西北军需又催得急。账册上两行相邻的数字，到了县里便是秋粮，到了边关便是口粮。\n\n张廷玉把核对过的清单放在案边：“追缴自有章程，只怕期限一紧，最后又摊到百姓头上。”这一折先定方向，财政清理还须另行执行、回访。',[
 opt('balance','先保周转，分期清账','国库 −3、民生 +3；不等于追缴已经执行。',{treasury:-3,people:3},{fiscalPolicy:'phased'}),opt('quick','限期清缴，先稳国库','国库 +3、民生 −3；回访须查是否转嫁。',{treasury:3,people:-3},{fiscalPolicy:'quick'}),opt('audit','先查大户与经手人','国库 −1、政令执行 +3；速度较缓。',{treasury:-1,execution:3},{fiscalPolicy:'audit'})],{actor:'C28',embedded:['G01']}),
 event('M05','景仁赠环',3,'玉环放在宜修掌心，她却没有立刻戴上。\n\n“皇上今日来，是有宫务要问，还是有旧事想说？”她语气平稳，指尖仍停在玉的边缘。一次相赠不能抵销多年冷落，也不能凭一枚玉环，替她答应从此心安。',[
 opt('rights','先谈中宫权责','六宫秩序 +3；有章可循，比一时赏赐更长久。',{palace:3},{palacePolicy:'rights'}),opt('visit','提出定期相见，再核对日程','心绪 +2；这里只表达意向，正式约定需另行确认。',{mood:2},{visitDiscussed:true}),opt('gift','先留下玉环，不逼她回应','心绪 +1，保留距离。',{mood:1},{palacePolicy:'reserved'})],{actor:'C06',location:'景仁宫',embedded:['R06-01']}),
 event('M06','殿前择人',4,'宫门外的风把衣角吹得微微发紧。甄嬛、沈眉庄、安陵容依次进殿，各人都有自己的家世、期望与不安。\n\n你记得她们日后的模样，却不能拿尚未发生的事，提前判今天的人。名单已定，眼下能定的是接见、份例与办事的规矩。',[
 opt('fair','按位分给足份例','国库 −2、六宫秩序 +3；三人依原身份入宫。',{treasury:-2,palace:3},{selection:'fair'}),opt('ability','逐一询问所长','政令执行 +2，建立能力记录。',{execution:2},{selection:'ability'}),opt('brief','殿前依礼接见，不加私问','六宫秩序 +1，不产生恋爱承诺。',{palace:1},{selection:'formal'})],{actor:'C08',location:'宫宴大殿'}),
 event('M07','宫宴微澜',5,'杯盏间一句出身的讥讽，让安陵容把未唱完的曲子停在唇边。有人低头，有人等着御前的反应。\n\n你可以替她斥责，也可以把说完一支曲子的机会还给她。无论怎么做，都不该把她此后的尊严，绑在你每一次及时出现上。',[
 opt('queen','请皇后依规纠偏','六宫秩序 +3；维护中宫与小主的体面。',{palace:3},{banquet:'queen'}),opt('skill','让她把曲子唱完','心绪 +3；认可具体的能力。',{mood:3},{banquet:'skill'}),opt('stop','当场制止讥讽','六宫秩序 +1、朝局稳定 −1；保护鲜明，也须善后。',{palace:1,stability:-1},{banquet:'direct'})],{actor:'C08',location:'宫宴大殿',embedded:['R08-01']}),
 event('M08','雨廊赠衣',5,'雨水把宫廊外的石阶洗得发亮。温实初抱着药箱等候，袖口已经湿了。\n\n“臣今日来，只为复核脉案。”他先把话说清。你可以留他谈一谈，也可以只问医事。看见一个人的辛劳，不等于立刻取得他所有的心事。',[
 opt('listen','问他真正想做的医事','政令执行 +2；倾听志愿，不索取表忠。',{execution:2},{wenGoalHeard:true}),opt('medical','只核对脉案，守住医职边界','圣躬 +3。',{health:3},{medicalBoundary:true}),opt('rain','先让他避雨，再安排问诊','国库 −1、圣躬 +2。',{treasury:-1,health:2},{wenCare:true})],{actor:'C04',location:'宫门长廊',embedded:['R04-01']}),
 event('M09','御园笛声',6,'果郡王允礼办完宗室差事，途经御园。笛声收住时，他先行了礼，才把旧谱卷起。\n\n“臣弟午后还要回府核一桩差事。皇兄若有兴致，倒可先听这一段。”他有自己的王府与来往，不是在宫中候命的乐师。宫门与日程，也不因一句亲近便消失。',[
 opt('music','谈这一段笛谱','心绪 +3，建立有分寸的相知。',{mood:3},{yunMusic:true}),opt('duty','先问宗室差事与王府近况','朝局稳定 +2，保留职责。',{stability:2},{yunDuty:true}),opt('listen','只听一曲，依礼送行','心绪 +1，不替彼此许下尚未谈过的约定。',{mood:1},{yunReserved:true})],{actor:'C05',location:'御花园',embedded:['R05-01']}),
 event('M10','凯旋与军账',6,'年羹尧带着捷报归京，甲衣上还留着赶路的尘。凯旋的喜气未散，张廷玉呈上的军需册里，却有同一批粮的两笔支领。\n\n“先查清，是该的。”将军看了一眼册子，“只是关外的人还在等粮。”\n\n疑点是账目重复，还不是谁贪污的证据。欢迎、私谈与军账，各有一笔应当认真落下的决定。',[
 opt('welcome','先欢迎归人，再共同核账','朝局稳定 +2；不免除核验。',{stability:2},{returnPolicy:'joint'}),opt('audit','先核册，再议封赏','政令执行 +3、心绪 −1。',{execution:3,mood:-1},{returnPolicy:'audit'}),opt('delay','暂缓封赏，清楚说明原因','政令执行 +2、朝局稳定 −1。',{execution:2,stability:-1},{returnPolicy:'delay'})],{actor:'C03',embedded:['R03-01','G04']}),
 event('M11','旧影新衣',7,'甄嬛把一件新衣的颜色提起，话锋终于转到纯元。她想知道，自己在你眼中，究竟是怎样一个人。\n\n含混也许能暂时留住平静，却会把今日的误会，变成明日更深的失望。前世的伤不是她此刻的罪，也不是你可以继续许下假希望的理由。',[
 opt('clear','明确不作旧人比较','六宫秩序 +2，记下已说明的情感边界。',{palace:2},{zhenBoundary:'clear'}),opt('polite','维持礼遇，清楚说明疏离','朝局稳定 +1、心绪 +1。',{stability:1,mood:1},{zhenBoundary:'polite'}),opt('vague','含混赏赐，避开回答','国库 −2、心绪 −2；留下未澄清信号。',{treasury:-2,mood:-2},{zhenBoundary:'vague'}),opt('open','愿意了解你本人，不许诺已经相爱','六宫秩序 +2；她仍可保留自己的答复。',{palace:2},{zhenBoundary:'open'}),opt('unsure','坦言心意未定，不请她等候','六宫秩序 +2；不把未定说成许诺。',{palace:2},{zhenBoundary:'unsure'})],{actor:'C09',location:'养心殿暖阁'}),
 event('M12','六宫新规',8,'宜修把这两年的宫账摊开。份例、协理、休养与请示，零散的决定终于要写成能长期执行的规矩。\n\n“若只凭一时的体谅，换个人经手，又要重问一遍。”她把笔放在一旁，等你的处置。\n\n这一卷结束时，有些人已被认真听见，有些事尚待回访。把真实的结果收好，才能走向之后的年月。',[
 opt('system','写明份例与协理权限','国库 −2、六宫秩序 +5、政令执行 +2。',{treasury:-2,palace:5,execution:2},{palaceRules:'written'}),opt('comfort','先安抚，制度暂缓','心绪 +2、六宫秩序 −2；留下制度待办。',{mood:2,palace:-2},{palaceRules:'pending'}),opt('family','按家世分配协理','朝局稳定 +2、六宫秩序 −3。',{stability:2,palace:-3},{palaceRules:'family'})],{actor:'C06',location:'景仁宫'})
].forEach(add);
const relationDefs=[
 ['C02',1,'留茶',1,'M02','苏培盛仍半侧着身，等你吩咐。他习惯了退在灯影之外，尚不习惯有人认真问他想不想留下。','留他喝茶，允许他照常告退','依旧先谈御前值守'],
 ['C02',2,'初次请坐',1,null,'那张椅子空在案侧。你指向椅背时，苏培盛先是一怔：“奴才坐下，怕不合规矩。”你可以给出选择，不必用命令把体谅也做成另一件差事。','请他自行决定坐或站','尊重习惯，不勉强请坐'],
 ['C07',1,'停香解释',2,'M03','年世兰先问了香，又问太医何时来。她真正等的，是关于自己身体的实话，而不是一句“朕自有安排”。','说明已知风险与尚待核验之处','先明确太医与留样的安排'],
 ['C07',2,'公开尊重',2,null,'颂芝呈来份例单，年世兰把它推到一边：“若连知晓自己宫里用什么都要猜，臣妾要这些赏物做什么？”','承认她有知情与选择的权利','写明身体照护流程与知情权限'],
 ['C06',1,'玉环',3,'M05','宜修收下玉环，没有把它当作一份已经兑现的承诺。她问你，下次来时，是否也愿意听那些不讨喜的宫务。','愿意听，也容她保留疑虑','先从宫务合作开始'],
 ['C06',2,'共理宫账',3,null,'宫账里有几笔名目不清。宜修没有先谈情分，而是把经手人与原始凭据列好：“臣妾想要的，是有权把这件事查清。”','共同核账，认可她的判断','按中宫职责授权核账'],
 ['C08',1,'宫宴维护',5,'M07','安陵容下席时没有马上道谢。她把那支曲子的末句轻轻补完，才说：“臣妾还想再练好些。”你可以听见她的本领，而不是替她安排往后所有的路。','认可她自己唱完的这一曲','依礼鼓励，保留相处边界'],
 ['C08',2,'私下倾听',5,null,'安陵容说起家书，停了几次，终于把话说完整：“臣妾不想每一次被看见，都只因家里又求了什么。”','听她说完，不急着赏赐','询问所长与可承担的事务'],
 ['C04',1,'雨廊',5,'M08','温实初接过干帕，仍先把脉案递了过来：“臣的心事可以晚些说，病情却不能含糊。”亲近与职责，在他这里并不是互相替代的东西。','尊重医职，也愿慢慢了解他','只谈医事，不索取亲近'],
 ['C04',2,'倾听志愿',5,null,'“臣想把这些脉案留给后来的医者。”温实初说。若只把他留在御前，眼下方便，却也关上了他真正想做的事情。','支持他保留教人的时间','按医官职责讨论脉案制度'],
 ['C05',1,'御园听笛',6,'M09','允礼收起笛子：“臣弟不是不愿再来，只是王府也有等着答复的人。”你若要留这段笛音，就须连同他自己的生活一道尊重。','愿从相知开始，尊重往返','先维持皇兄与宗室的礼数'],
 ['C05',2,'共校旧谱',6,null,'一处旧谱的节拍有异，允礼请你先听完两种奏法，再说取舍。他讲得具体，不拿诗句避开分歧，也不因你是帝王便把判断改了。','共校旧谱，允许意见不同','只谈曲谱，依礼结束'],
 ['C03',1,'凯旋私谈',6,'M10','离开军账一刻，年羹尧才把声音放低：“臣想听一句，查这本账，同信不信臣，究竟是不是一回事。”','信其功劳，仍坚持依法核验','清楚说明君臣与审计边界'],
 ['C03',2,'边书',7,null,'信从西北来。年羹尧说起风沙、轮调，也问京里的那张舆图是否还摊在案上。字句直白，仍没有拿思念换一笔未经审核的军费。','回信谈近况，不许诺额外军权','依军务回复，也尊重他的付出']
];
for(const [cid,n,title,turn,parent,body,warm,work] of relationDefs){const num=cid.slice(1);add(event(`R${num}-${String(n).padStart(2,'0')}`,title,turn,body,[opt('warm',warm,'信任 +5、安全感 +2。建立相知，不直接跳到倾心。',{},{}),opt('work',work,'信任 +3。以合作完成节点，不强迫恋爱。',{},{}),opt('distance','说明只保持合作关系','信任 +1；此后关闭恋爱推进，可主动协商恢复。',{}, {})],{kind:'relation',actor:cid,parent,actionCost:parent?0:1,location:cid==='C03'&&n===2?'西北来信':cid==='C05'?'御花园':cid==='C06'?'景仁宫':cid==='C07'?'翊坤宫':'养心殿暖阁'}));}
add(event('G01','查亏空',2,'县库账目的缺口已经登记。现在需要确认核验范围，不能把上一世记得的名字当作这一次的证据。',[opt('records','先核原始账据','政令执行 +2。',{execution:2},{fiscalEvidence:'records'}),opt('local','听地方与百姓的两份说法','民生 +2。',{people:2},{fiscalEvidence:'local'}),opt('scope','列清经手责任与待查项','朝局稳定 +1。',{stability:1},{fiscalEvidence:'scope'})],{kind:'government',actor:'C28',parent:'M04',actionCost:0}));
add(event('G02','分期追缴',2,'缺口已经核明一部分，追缴不能只看回款数字。请确定执行方式；下一回合将核对县库与民间的实际情况。',[opt('phased','分期追缴，留足周转','本次国库 +4、民生 +2；下一回合回访。',{treasury:4,people:2},{collection:'phased'}),opt('strict','限期足额追缴','国库 +8、民生 −4；回访检查摊派。',{treasury:8,people:-4},{collection:'strict'}),opt('review','先追有凭据部分','国库 +2、政令执行 +2。',{treasury:2,execution:2},{collection:'review'})],{kind:'government',actor:'C28',requires:['G01'],actionCost:1,followup:'G03'}));
add(event('G03','复核县库',3,'回访带来的不仅是新账页，还有县里的米价与周转记录。数字是否好看，得与百姓的日子一起看。',[opt('review','阅核回访，保留实际结果','不重复征收、不重复扣原费用。')],{kind:'followup',actor:'C28',requires:['G02'],actionCost:0}));
add(event('G04','军需册中的重复支领',6,'军中申请加拨12点军费，同一批粮却出现两笔报销。年羹尧主张先补给，张廷玉请先保留核验。\n\n这是一处待核验的重复账目，不是将军贪污的结论。可选方案，也可输入“先拨一半，派张廷玉核账，暂不公开怀疑”。',[
 opt('emergency','先拨8点，联合核账','国库 −8、边防 +3、朝局稳定 +1；年羹尧信任 +2。',{treasury:-8,defense:3,stability:1},{military:'joint'}),opt('pause','暂停拨款，限期重报','边防 −4、政令执行 +2；将军安全感 −3。',{defense:-4,execution:2},{military:'pause'}),opt('full','全额拨12点，豁免审核','国库 −12、边防 +4、政令执行 −3，留下未审风险。',{treasury:-12,defense:4,execution:-3},{military:'unaudited'})],{kind:'government',actor:'C03',parent:'M10',requires:['R03-01'],actionCost:0}));
add(event('G05','整顿粮道',6,'拨款已经记在前账，不能再扣一遍。现在处理新增的执行成本、押运与经手分工，之后还须验收军纪与实际领粮。',[opt('escort','设押运并核发到人','新增执行费2点、边防 +2。',{treasury:-2,defense:2},{supplyExecution:'escort'}),opt('ledger','凭册交接，逐营签领','新增执行费1点、政令执行 +2。',{treasury:-1,execution:2},{supplyExecution:'ledger'}),opt('local','由现任军需官执行，保留复核','新增执行费0点；有未审标记时仍有风险。',{},{supplyExecution:'local'})],{kind:'government',actor:'C03',requires:['G04'],actionCost:1,followup:'G06'}));
add(event('G06','验收军纪',7,'送达回执与领粮名册一同入京。此时才检查钱粮是否真正到人，不能拿当日朱批代替后来执行。',[opt('review','阅核粮道与领粮回执','只结算本次回访，不重复拨款。')],{kind:'followup',actor:'C03',requires:['G05'],actionCost:0}));
const sideDefs=[['P01','敬妃交班',3,'C11','敬妃带来的不只是交班名册，还有三处职责重叠。“若无人能签字，出了事总是下头的人担着。”','写清交接人与签核权',{palace:3,execution:1},'先补名册，权限另议',{palace:1},'暂缓交班，保留问题',{palace:-1}],['P09','颂芝报忧',4,'C19','颂芝这回没有先报平安。她说年世兰夜里难眠，又怕一句实话惹出更多猜测。坏消息也该有能被认真听见的去处。','允许如实报告，安排复核',{health:2,palace:1},'先照护，再追问原因',{health:1},'只收下记录，暂不处置',{palace:-1}],['P10','宝鹃传话',7,'C20','同一封家书，转述与原文有两处不同。宝鹃说自己只是怕小主忧心。保护若成了代人筛掉消息，也会剥去选择。','让安陵容看原文，核对转述',{execution:2,palace:1},'先询问转述缘由',{palace:1},'暂保留旧传话方式',{palace:-2}],['P11','卫临留案',8,'C22','卫临想将核验过的脉案留存，便于轮值医官接手。温实初提醒，留案须有访问范围，不能让病情成为人人可传的谈资。','留档并分清访问权限',{health:2,execution:2},'先试行轮值医官查阅',{health:1,execution:1},'仍由一人保管',{execution:-1}]];
for(const [id,title,turn,actor,body,a,ae,b,be,c,ce] of sideDefs)add(event(id,title,turn,body,[opt('act',a,'按明示结果执行，不靠恋爱数值结算。',ae),opt('pilot',b,'保留部分改善与后续空间。',be),opt('delay',c,'保留实际缺憾。',ce)],{kind:'side',actor,actionCost:1}));
export const DAILY=[['D01','春日赏花','春','花事正盛，你让随行的人各说一件近来在意的小事。没有人需要为了取悦御前，说一句同样的赞语。',{mood:2}],['D02','春耕问答','春','地方送来的简报里，春耕的时点各不相同。你读完两份相反的建议，再留下一道待核的问题。',{people:1}],['D03','暑中问诊','夏','这次问诊先谈睡眠与作息。医者给出的休养建议，不因亲近与否改变。',{health:2}],['D04','荷塘听曲','夏','一曲终了，不必立即留人。让来往有约，也让告退成为自然的事。',{mood:2}],['D05','秋粮复核','秋','新到的秋粮摘要有一处口径不同。你把疑问记在册边，等有原始凭据再定论。',{execution:1}],['D06','边关家书','秋','信里有军务，也有风沙与起居。你逐一回信，不把私下问候写成未经审议的军令。',{mood:2}],['D07','冬日围炉','冬','炭火不旺，恰好温着手边的茶。有人谈值守，有人先告退，没有一件小事必须被说成誓言。',{mood:2}],['D08','旧物修补','冬','一处旧物的磨损留了下来。修补不是让过去从未发生，而是让它以后还能好好用。',{mood:1,health:1}]].map(([id,title,season,body,effects])=>add(event(id,title,1,body,[opt('finish','将这片刻记入旧事','占1次安排；同回合不能重复。',effects)],{kind:'daily',season,actor:'C02',actionCost:1})));
export const NAMES={C01:'雍正',...Object.fromEntries(CHARACTERS.map(c=>[c.id,c.name])),C09:'甄嬛',C10:'沈眉庄',C11:'敬妃',C12:'端妃',C13:'齐妃',C18:'浣碧',C24:'允禩',C29:'鄂尔泰',C14:'曹琴默',C15:'欣贵人',C16:'富察贵人',C30:'田文镜',C31:'李卫',C36:'澄宁',C34:'弘历',C17:'崔槿汐',C19:'颂芝',C20:'宝鹃',C21:'太后',C22:'卫临',C26:'允祥',C28:'张廷玉',C32:'岳钟琪'};
export const ALL_ROSTER=[['C01','雍正'],...CHARACTERS.map(c=>[c.id,c.name]),['C09','甄嬛'],['C10','沈眉庄'],['C11','敬妃'],['C12','端妃'],['C13','齐妃'],['C14','曹琴默'],['C15','欣贵人'],['C16','富察贵人'],['C17','崔槿汐'],['C18','浣碧'],['C19','颂芝'],['C20','宝鹃'],['C21','太后'],['C22','卫临'],['C24','允禩'],['C25','允禟'],['C26','允祥'],['C27','隆科多'],['C28','张廷玉'],['C29','鄂尔泰'],['C30','田文镜'],['C31','李卫'],['C32','岳钟琪'],['C33','弘时'],['C34','弘历'],['C35','弘昼'],['C36','澄宁']];
export const FIRST_ROSTER=['C01',...CHARACTERS.map(c=>c.id),'C09','C10','C11','C19','C20','C21','C22','C26','C28','C32'];
export const ASSET_MANIFEST=[...FIRST_ROSTER.map(id=>({id:`char_${id}_base`,name:`${NAMES[id]}基准立绘`,path:`assets/char_${id}_base.png`})),{id:'char_C01_formal',name:'雍正正式服',path:'assets/char_C01_formal.png'},...[1,2,3,4].map(i=>({id:`art_bg_0${i}`,name:['御案','宫室','御园','朝议'][i-1]+'氛围',path:`assets/art_bg_0${i}.png`})),{id:'cover',name:'封面底图',path:'assets/cover.png'},{id:'cg_CG01',name:'重生御案',path:'assets/cg_CG01.png'},{id:'cg_CG15',name:'宫宴微光',path:'assets/cg_CG15.png'}];
export const KIND_NAMES={main:'主线',relation:'相知',extension:'相知',government:'政务',followup:'回访',side:'群像',daily:'日常'};
export const MAIN_COUNT=12;

Object.assign(EVENTS,V3_EVENTS,V4_EVENTS,V5_EVENTS,V6_EVENTS,V7_EVENTS,V8_EVENTS);
installStory(EVENTS);
