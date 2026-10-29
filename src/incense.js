import {ordinal,addDays,validDate} from './calendar.js';
import {RuleError} from './rules.js';

// A bounded case file, not a diagnosis system. Older saves acquire it only through a new action.
const copy=x=>structuredClone(x),paths=['sample','explain','quiet'];
const complete=(s,id)=>!!s.events[id]?.completed;
const pathOf=s=>s.incenseCase?.path||(complete(s,'M03')&&paths.includes(s.events.M03.outcomeId)?s.events.M03.outcomeId:null);
const source=(s,id)=>({eventId:id,choiceId:s.events[id].outcomeId,transactionId:s.events[id].transactionId,date:copy(s.events[id].date)});
export function incenseReuse(s,eventId){
 const c=s.incenseCase,share=c?.shared;
 if(!['R07-01','R07-02'].includes(eventId)||share?.via!=='incense-share'||share.cost!==1||ordinal(share.date)!==ordinal(s.date)||s.weekly?.plans.some(p=>p.status==='accepted'&&p.eventId===eventId))return null;
 const index=s.transactions.findIndex(t=>t.id===share.transactionId);if(index<0)return null;
 if(['R07-01','R07-02'].some(id=>{const e=s.events[id];return e?.completed&&ordinal(e.date)>=ordinal(share.date)&&(s.transactions.findIndex(t=>t.id===e.transactionId)>index||!s.transactions.some(t=>t.id===e.transactionId));}))return null;
 if(s.transactions.slice(index+1).some(t=>t.results.some(r=>r.actionCost>0)||t.actions.some(a=>a.type==='event'&&['R07-01','R07-02'].includes(a.eventId))))return null;
 if(!s.weekly)return 'quarter-same-meeting';
 return Object.entries(s.weekly.consumed).find(([,g])=>g.source==='IC-SHARE-'+share.transactionId)?.[0]||null;
}
export function incenseEcho(s,e,base){
 if(e.id==='R07-01'&&s.incenseCase?.shared&&!complete(s,'R07-01'))return '核对副单已经亲手交过，撤香的缘由也说到了她面前。今日她仍可以接着问，却不必再被当作从未听过解释的人。';
 return base;
}
const requestText='请核封存旧香、领用单与原方册；分别写清能核对的项目和不能据此判断的事。';
const requestFor=(path,fresh)=>fresh||path==='sample'?requestText:path==='quiet'?'旧档未记封样交接，先查原领用单和原方册，不得以新香补旧样。':'旧档只记留香，封口与交接待核；请先查原领用单和原方册。';
function start(s,tx,origin){
 const path=pathOf(s);if(!path)throw new RuleError('尚无可接续的停香处置。');
 if(s.incenseCase)throw new RuleError('这份核对已经交办，不重复开单。');
 const fresh=origin==='M03';
 s.incenseCase={version:1,path,origin,stoppedAt:copy(s.events.M03.date),sample:fresh||path==='sample'?'sealed':path==='explain'?'retained-unsealed':'unrecorded',request:{date:copy(s.date),dueDate:addDays(s.date,7),transactionId:tx,text:requestFor(path,fresh)},arrivedAt:null,arrivalTransaction:null,review:null,shared:null,explanations:[]};
 if(path==='explain')s.incenseCase.explanations.push(source(s,'M03'));
 // An existing conversation is evidence of what was said, never a new, retrospective report.
 if(!fresh&&complete(s,'R07-01'))s.incenseCase.explanations.push(source(s,'R07-01'));
 return s.incenseCase;
}
export function incenseStop(s){const c=s.incenseCase;return c&&!c.arrivedAt&&ordinal(c.request.dueDate)<=720?{kind:'incense',id:'IC-INCENSE',label:'太医院的核对回单',date:copy(c.request.dueDate)}:null;}
export function syncIncense(s,tx){const c=s.incenseCase;if(!c||c.arrivedAt||ordinal(s.date)<ordinal(c.request.dueDate))return;c.arrivedAt=copy(c.request.dueDate);c.arrivalTransaction=tx;}
export function incenseReport(c){
 const sample=c.sample==='sealed'?'封存旧香的封口与领用批次能够相互对上，太医院将封样另册收好。':c.sample==='retained-unsealed'?'旧档记下曾留下旧香，却未记封口与交接。医官将这份记载单列，未把留着的香盒当成封存链已经齐全。':'旧档只记撤换，没有留下封样交接的记载。医官没有拿新香补作旧样，只将这一处空白写明。';
 return `回单上，卫临将领用单与原方册分列，末尾附着经手的落款。\n\n${sample}\n\n领用单与出库簿的日期核对相符，原方册却少了一处用量。医官圈出空行，没有替它填一个想当然的数：“这一行须调原件。现下能核的是这批东西从哪一册领出，不能据此说谁已查出病，更不能替谁定下责任。”\n\n两份副单一份留院，一份呈到你手里。此前只有一个令人警觉的香名，如今有了能追问的批次、经手签字和待补的那一行。旧香继续停用，身体情形另留起居记录；尚未查清的，没有被一句无妨盖过去。`;
}
const explanation={
 sample:'“先停、先留样，是怕疑处没问清便又照旧用了。”你把话放慢，“眼下交太医院核的是领用与原方，还没有身体损伤或谁授意的结论。”',
 explain:'“那日你自己合上香炉，留下旧香，朕记得。”你将她留的那页纸摆正，“今日能告诉你的仍是待核的范围，没有新回单，就不能拿一句放心替它作答。”',
 quiet:'“先撤去、留样，却没把疑处告诉你，是朕当时的处置。”你没有再用另换一味带过去，“领用与原方还要核，身体情形也得听你自己说。如今没有检验结论，也不能据此说有人害你。”'
};
const openings={
 sample:'年世兰把合着的香盒放在案上，先问封样送去之后，如今究竟查到了哪一步。\n\n“先停，臣妾听见了。可太医院要核哪几页，别只让臣妾等一句回话。”\n\n她将近来的睡眠记在纸上，自己圈过两处，等你把已知与尚未知的分开说。',
 explain:'年世兰见你进来，将那日自己合上的香炉挪开，露出底下的起居纸。\n\n“说好先停再核，臣妾没忘。”她指指纸角，“这两处也记下了。今日该听的，是有没有新凭据，不是一遍遍叫臣妾安心。”\n\n她给你留了座，却没把追问收回去。',
 quiet:'年世兰将换香那日记下的几行推到你面前。\n\n“换过什么，臣妾看见了。为什么要换，却一直没人说清。”\n\n她让颂芝先退下，手仍按在纸上：“若还要等回单，也照实告诉臣妾。别拿等一等，将该说的话也一起搁过去。”\n\n屋里已没有旧香的烟，她等的却不是另一盒赏物。'
};
export function incenseEventView(s,e){
 if(e.id==='M03')return {...e,sceneVisible:'年世兰请雍正闻旧例所用的香，雍正抬手拦住。她询问为何改动，颂芝手持领用单。疑处尚未向她说明，没有任何检验、病因或幕后责任结论。'};
 const path=pathOf(s);if(!path||!['R07-01','R07-02'].includes(e.id))return e;
 const c=s.incenseCase,shared=!!c?.shared,reviewed=!!c?.review;
 const seen=shared?'年世兰已经实际阅过领用与原方核对副单；仅核明文书项目，缺失用量仍待补，未诊断身体损伤，未查明幕后责任。':path==='quiet'&&!c?.explanations.length?'年世兰只实际看见撤换旧香，尚未听见御前解释疑处；她不知道封样与核对进展。':'年世兰已听见先停与待核的说明，尚未收到具体核对副单；不能知道御案私下阅过的内容。';
 if(e.id==='R07-02')return {...e,body:e.body+(reviewed&&!shared?'\n\n你带来的医官副单另夹在封袋里。今日若将安排说完，也一并单独交她留存，不经旁人转述。':''),sceneVisible:e.sceneVisible+' '+seen};
 const opening=shared?'年世兰将已经留过的核对副单摊开，指向尚未补齐的那一行。\n\n“先前为何撤换，皇上已说过。臣妾今日还想问，缺的原件以后由谁回，自己的起居又该记给谁看？”\n\n她记得你已亲自交过副单，没有将那一回解释抹去；还没解开的，也仍要问到底。':openings[path];
 return {...e,body:opening+(reviewed&&!shared?'\n\n你带来的副单仍折着，尚未递到她手里。':'')+'\n\n窗边的花被她转向日光。她把纸摊平，等你接着说。',sceneVisible:seen+' 年世兰亲口询问停香及待核事项，要求自己留起居纸。'};
}
export function incenseSceneReply(s,e,base){
 const path=pathOf(s);if(!path||!['R07-01','R07-02'].includes(e.id))return base;
 const c=s.incenseCase,share=c?.review&&!c.shared;
 const unknownOldSample=path==='quiet'&&(c?.sample==='unrecorded'||!c&&!(s.transcripts.M03?.storyVersion>=7));
 const lead=e.id==='R07-01'?(c?.shared?'你把先前交给她的副单与今日的起居纸放在一起，接着回答剩下的问题，没有将已经说过的缘由又搁回未说。':unknownOldSample?'“先撤去，却没把疑处告诉你，是朕当时的处置。”你将旧单上的空白留着，“原记载没有旧样交接，不能今日补说它早已核好。先从原领用与方册查起，身体情形也要听你自己说；尚没有病因或幕后责任的结论。”':explanation[path]):'';
 if(e.id==='R07-01'&&c?.shared)base=base.replace('年世兰起初冷着脸，听到最后问：“若臣妾今日不问呢？”\n\n“也该来告诉你。”','她点过副单上的空行：“下一回补到了什么，也请照原样给臣妾看。”\n\n“照样留一份。”');
 if(e.id==='R07-01'&&path!=='quiet')base=base.replace('年世兰起初冷着脸，听到最后问：“若臣妾今日不问呢？”\n\n“也该来告诉你。”',path==='explain'?'年世兰沿着原先那页纸问得更细：“回单来了，臣妾也要亲自看。”\n\n“给你留一份。”':'她在纸角添上一行：“既留了样，原方那一页也别漏了。”\n\n“照样核。”');
 const report=share?'你将真正收到的副单展开给她看，圈明已核对的日期、尚缺的原方用量，以及不能由此推出的结论。她没有先谢赏，逐行看完，自己留下一份：“以后缺的这一行，臣妾也要问经手的人。”':'';
 return [lead,base,report].filter(Boolean).join('\n\n');
}
export function recordIncenseEvent(s,e,choice,tx){
 if(e.id==='M03'){start(s,tx,'M03');return;}
 if(!['R07-01','R07-02'].includes(e.id)||!pathOf(s))return;
 const c=s.incenseCase||start(s,tx,e.id);
 if(e.id==='R07-01'){
  if(!c.explanations.some(x=>x.eventId===e.id))c.explanations.push(source(s,e.id));
  if(s.flags.incenseExplanationDue)s.flags.incenseExplanationDue=false;
 }
 if(c.review&&!c.shared)c.shared={date:copy(s.date),transactionId:tx,via:e.id};
}
export function applyIncenseAction(s,a,tx,{spendShare}){
 if(s.sealed)throw new RuleError('初卷已封存，只能重读原话。');
 if(!complete(s,'M03'))throw new RuleError('先有本次停香处置，才有可核对的旧香。');
 if(Object.keys(a).some(k=>!['type'].includes(k)))throw new RuleError('核对与阅报不接受额外结论、听者或奖励。');
 if(a.type==='incense-request'){
  const c=start(s,tx,'legacy-request');return {label:'接续核对旧香原簿',detail:`已按今天发出核对单。${c.sample==='unrecorded'?'旧样交接未载，不补作已留样；先查原簿。':c.sample==='retained-unsealed'?'旧记只说留香，封口与交接另核，不补作封存链齐全。':'沿原先封样记载继续追原方。'}七实际日后才有回单。`,actionCost:0,treasury:0};
 }
 const c=s.incenseCase;if(!c)throw new RuleError('旧档尚无这次核对单，请先接续核对，原记录不会改写。');
 syncIncense(s,tx);
 if(a.type==='incense-review'){
  if(!c.arrivedAt)throw new RuleError('回单尚在核对，须等满七实际日，不能提前查出结果。');
  if(c.review)throw new RuleError('这份回单已经读过，可在案卷重读。');
  const text=incenseReport(c);c.review={date:copy(s.date),transactionId:tx,text};return {label:'太医院的核对回单',detail:'已核对领用与原方文书；身体损伤与幕后责任尚无结论。此份先到御案，未自动向其他人说明。',dialogue:text,actionCost:0,treasury:0};
 }
 if(a.type==='incense-share'){
  if(!c.review)throw new RuleError('先实际阅过这份回单，才能带给她看。');
  if(c.shared)throw new RuleError('她已经留有这份副单，不重复领回报。');
  const paid=spendShare();c.shared={date:copy(s.date),transactionId:tx,via:'incense-share',cost:paid.cost};
  const quiet=c.path==='quiet'&&!c.explanations.length;
  c.explanations.push({eventId:null,choiceId:'share',date:copy(s.date),transactionId:tx});if(s.flags.incenseExplanationDue)s.flags.incenseExplanationDue=false;
  const text=[quiet?'你先将当时撤香却未说明的事承认下来，没拿今日的副单倒作那日已经查明的证据。':'你把真正收到的副单带到她面前，先将圈出的空行留给她看。','年世兰逐页核过，将相符的日期与缺失的用量分别指给你看：“这一处已对上，这一处还没对上。以后就照这样回，别替臣妾省掉后头半句。”','她自己收好副单，没再让颂芝把话转一遍。该解释的终于说到了本人面前，尚待补的仍未补；她又指了指那处空行，将纸收好：“补到了，也照样给臣妾看。”'].join('\n\n');
  return {label:'把核对副单带给年世兰',detail:'当面交副单，保留仍待补的项目；双方意愿仍照原话。',dialogue:text,actionCost:paid.cost,treasury:0};
 }
 throw new RuleError('没有这项核对操作。');
}
export function incenseKnowledge(s,cid){
 const path=pathOf(s);if(!path||!['C01','C07','C19','C22'].includes(cid)||cid==='C22'&&!s.incenseCase)return null;
 const c=s.incenseCase,emperor=cid==='C01',patient=cid==='C07',doctor=cid==='C22',explained=path==='explain'||!!c?.explanations.length||complete(s,'R07-01');
 const observations=[];
 if(emperor||patient||cid==='C19')observations.push({text:'翊坤宫旧香已经撤换。',kind:'observed-action',source:{eventId:'M03',date:copy(s.events.M03.date),transactionId:s.events.M03.transactionId}});
 const heard=path!=='quiet'?source(s,'M03'):c?.explanations[0]||(complete(s,'R07-01')?source(s,'R07-01'):null);
 if(emperor||doctor||patient&&(path!=='quiet'||explained))observations.push({text:'领用、原方与身体情形须分别核对；尚未作身体损伤或幕后责任的结论。',kind:'pending-inquiry',source:patient&&heard?{eventId:heard.eventId,date:copy(heard.date),transactionId:heard.transactionId}:c?{date:copy(c.request.date),dueDate:copy(c.request.dueDate),transactionId:c.request.transactionId}:source(s,'M03')});
 if(cid==='C19'&&complete(s,'R07-02'))observations.push({text:'她亲眼见年世兰先阅新香单、询问经手人；未因此听见医官私下回单。',kind:'observed-action',source:{eventId:'R07-02',date:copy(s.events['R07-02'].date),transactionId:s.events['R07-02'].transactionId}});
 const canSeeReport=doctor?!!c?.arrivedAt:!!c?.review&&(emperor||patient&&c.shared);
 return {observations,explanationHeard:patient?explained:undefined,report:canSeeReport?{text:doctor?(c.review?.text||incenseReport(c)):c.review.text,date:copy(doctor?c.arrivedAt:patient?c.shared.date:c.review.date),arrivedAt:patient?undefined:copy(c.arrivedAt),sourceTransaction:doctor?c.arrivalTransaction:patient?c.shared.transactionId:c.review.transactionId,kind:'document-check',scope:'只核文书，不证明身体损伤与幕后人'}:null,rules:['前世记忆与听说只是线索，不能作为本世检验或定罪证据','只引用本人实际见过或听过的项目，不能因身在宫中或医官身份而读到他人的私谈','样品与领用文书不等于病因结论；未写入回单的检查不能编造','宫务与照护不以答应恋爱为条件，解释不代表疑虑已经全消']};
}
export function incenseFacts(s,cid,k=incenseKnowledge(s,cid)){
 if(!k)return [];
 const rows=k.observations.map((o,i)=>({id:`IC-INCENSE-${cid}-${o.source.eventId||o.kind}-${i}`,text:o.text,date:copy(o.source.date),visibleTo:[...new Set(['C01',cid])],source:o.source.transactionId,epistemic:{kind:o.kind,status:o.kind==='pending-inquiry'?'pending':'observed',scope:'仅本人实际见闻；交办与疑虑不等于检验结论'}}));
 if(k.report){const sample=s.incenseCase.sample==='sealed'?'封样与领用批次能相互对上':s.incenseCase.sample==='retained-unsealed'?'留过旧香，但封口与交接未载':'封样交接未载';rows.push({id:`IC-INCENSE-REPORT-${cid}`,text:`核对回单载明：${sample}；领用与出库日期相符，原方用量缺一行。尚无身体损伤、病因或幕后责任结论。`,date:copy(k.report.date),visibleTo:[...new Set(['C01',cid])],source:k.report.sourceTransaction,epistemic:{kind:'document-check',status:'checked-within-scope',arrivedAt:k.report.arrivedAt?copy(k.report.arrivedAt):undefined,learnedAt:copy(k.report.date),scope:k.report.scope}});}
 return rows;
}
export function epistemicFact(f){
 const id=f.id||'';
 if(id.startsWith('CROSS-'))return {kind:'heard-account',status:'personal-statement',scope:'只证明本人在这次相谈中说过；不替另一人答复，也不证明未发生的恋爱、放下或背叛',source:f.source};
 if(id==='FACT_REBIRTH')return {kind:'past-life-lead',status:'subjective-memory',scope:'仅作皇帝自身线索，不作本世证据',source:f.source};
 if(id.startsWith('DISCLOSE_'))return {kind:'heard-account',status:'unverified',scope:'听过叙述不等于确信，更不等于掌握全部前世细节',source:f.source};
 if(id.startsWith('FACT_'))return {kind:'action-record',status:'recorded',scope:'只证明记录中的选择与经过，不自动证明动机、病因或罪责',source:f.source};
 return {kind:'world-record',status:'scoped-record',scope:'仅限此记录实际明示的内容，未知部分继续待核',source:f.source};
}
export function incenseReply(s,cid,input){
 if(!/香|原方|停用|核验|查明|回单|证据|病因|下毒|不孕|谁害/.test(input))return '';
 const k=incenseKnowledge(s,cid);if(!k)return '';
 if(k.report)return cid==='C07'?'那份副单臣妾已经看过。对上的日期与还缺的用量，分开记着；可不能拿前半页，替后半页说都查清了。':'回单核的是领用与原方文书，未补的用量仍待追原件，尚无身体损伤或幕后责任的结论。';
 if(cid==='C07')return k.explanationHeard||pathOf(s)!=='quiet'?'先停与待核的安排，臣妾听见了。可具体回单还没交到臣妾手里，查到了哪一处，也该听过再说。':'换香的事臣妾看见了，为什么换，却还没听皇上说明。旁人的猜测，臣妾不想拿来替皇上作答。';
 if(cid==='C19')return '奴婢见过撤换旧香。御前私下怎样核、医官回单写了什么，没交到奴婢手里的，不敢替谁传成已经查明。';
 return '眼前只有待核的领用与原方安排。回单要等实际核对，不能拿猜测先填一个结论。';
}
export function validateIncense(s){
 const c=s.incenseCase;if(c===undefined)return;
 const known=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(k=>keys.includes(k));
 if(!known(c,['version','path','origin','stoppedAt','sample','request','arrivedAt','arrivalTransaction','review','shared','explanations'])||!known(c.request,['date','dueDate','transactionId','text'])||c.review&&!known(c.review,['date','transactionId','text'])||c.shared&&!known(c.shared,['date','transactionId','via','cost']))throw new RuleError('案卷含有未知结论或额外字段。');
 const e=s.events.M03;if(!c||c.version!==1||!e?.completed||!paths.includes(c.path)||c.path!==e.outcomeId||!['M03','R07-01','R07-02','legacy-request'].includes(c.origin)||!['sealed','unrecorded','retained-unsealed'].includes(c.sample)||!validDate(c.stoppedAt)||ordinal(c.stoppedAt)!==ordinal(e.date)||!c.request||!validDate(c.request.date)||!validDate(c.request.dueDate)||ordinal(c.request.date)<ordinal(c.stoppedAt)||ordinal(c.request.date)>ordinal(s.date)||ordinal(c.request.dueDate)-ordinal(c.request.date)!==7||!Array.isArray(c.explanations)||c.explanations.length>10||typeof c.request.text!=='string'||c.request.text.length>300)throw new RuleError('停香案卷来源或日期错误。');
 if(c.origin==='M03'&&!(s.transcripts.M03?.storyVersion>=7))throw new RuleError('旧幕不能补作新版本已交办的案卷。');
 if(c.origin==='M03'&&c.sample!=='sealed'||c.sample==='retained-unsealed'&&(c.path!=='explain'||c.origin==='M03')||c.sample==='unrecorded'&&(c.path!=='quiet'||c.origin==='M03'))throw new RuleError('留样状态与实际处置不符。');
 const txFor=(id,type,eventId)=>s.transactions.find(t=>t.id===id&&t.actions.some(a=>a.type===type&&(!eventId||a.eventId===eventId)));
 if(c.origin!=='legacy-request'&&(!s.events[c.origin]?.completed||ordinal(c.request.date)!==ordinal(s.events[c.origin].date)))throw new RuleError('交办日期与实际场景不符。');
 if(!txFor(c.request.transactionId,c.origin==='legacy-request'?'incense-request':'event',c.origin==='legacy-request'?null:c.origin))throw new RuleError('核对单缺少实际交办。');
 if(c.sample==='sealed'&&c.path==='explain'&&c.origin!=='M03')throw new RuleError('旧档只记留香，不能补作封存链齐全。');
 if(c.sample==='sealed'&&c.path==='quiet'&&(c.origin!=='M03'||!(s.transcripts.M03?.storyVersion>=7)))throw new RuleError('旧档未记封样，不能补作已留样。');
 if(c.arrivedAt&&(!validDate(c.arrivedAt)||ordinal(c.arrivedAt)!==ordinal(c.request.dueDate)||ordinal(c.arrivedAt)>ordinal(s.date)||!s.transactions.some(t=>t.id===c.arrivalTransaction&&ordinal(t.date)>=ordinal(c.request.dueDate))))throw new RuleError('核对回单提前到达或缺少事务。');
 const reviewTx=c.review&&txFor(c.review.transactionId,'incense-review'),reviewIndex=reviewTx?.actions.findIndex(a=>a.type==='incense-review');
 if(c.review&&(!c.arrivedAt||!validDate(c.review.date)||ordinal(c.review.date)<ordinal(c.request.dueDate)||ordinal(c.review.date)>ordinal(s.date)||typeof c.review.text!=='string'||c.review.text.length>2500||c.review.text!==reviewTx?.results?.[reviewIndex]?.dialogue||!txFor(c.review.transactionId,'incense-review')))throw new RuleError('回单缺少实际阅核或提前产生。');
 for(const x of c.explanations){if(!x||!validDate(x.date)||ordinal(x.date)>ordinal(s.date)||x.eventId&&!['M03','R07-01','R07-02'].includes(x.eventId)||x.eventId==='M03'&&x.choiceId!=='explain'||!txFor(x.transactionId,x.eventId?'event':'incense-share',x.eventId)||x.eventId&&(!complete(s,x.eventId)||s.events[x.eventId].outcomeId!==x.choiceId||s.events[x.eventId].transactionId!==x.transactionId||ordinal(s.events[x.eventId].date)!==ordinal(x.date)))throw new RuleError('解释缺少本人实际听见的来源。');}
 if(c.shared&&(!c.review||!validDate(c.shared.date)||ordinal(c.shared.date)<ordinal(c.review.date)||ordinal(c.shared.date)>ordinal(s.date)||!['R07-01','R07-02','incense-share'].includes(c.shared.via)||!txFor(c.shared.transactionId,c.shared.via==='incense-share'?'incense-share':'event',c.shared.via==='incense-share'?null:c.shared.via)))throw new RuleError('副单尚未实际交给本人。');
 if(c.shared&&c.shared.via!=='incense-share'){const e=s.events[c.shared.via];if(!e?.completed||e.transactionId!==c.shared.transactionId||ordinal(e.date)!==ordinal(c.shared.date))throw new RuleError('副单知情不能借用另一次相谈或日期。');}
}
