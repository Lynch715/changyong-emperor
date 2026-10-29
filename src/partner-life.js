import {extensionRelation,extensionRelationAt} from './extension-routes.js';
import {BOND_MODES} from './activity-content.js';
import {ordinal} from './calendar.js';
const NAMES={C02:'苏培盛',C03:'年羹尧',C04:'温实初',C05:'允礼',C06:'宜修',C07:'年世兰',C08:'安陵容',C09:'甄嬛',C10:'沈眉庄'};
import {RuleError} from './rules.js';
export const SHARED_LIFE={
 C02:'苏培盛将交清的更簿放远，只留下两只杯子。“明早有人接更，奴才想把那段空闲留给自己。皇上若也想来，咱们另问时辰。”你们商量谁收书、谁换凉茶，他挑了自己愿做的那件。今晚没有因此替他添一班差。',
 C03:'年羹尧把归程与今夜的饭分开说：“回营不能误，饭也不想总吃凉的。”你们各讲一种惯常作息，将能一起吃饭的意思留着，日期却没有擅自替下一回写定。军册照章，私下的碗筷可以共同收好。',
 C04:'温实初先说清值诊的时辰，才将两本闲书并排放下。“这本臣想自己读，另一本倒想听你念半页。”你们商量灯放哪一边、何时各自歇息；下值后的生活没有变成另一份问诊，也没有许诺疾病因此痊愈。',
 C05:'允礼说起王府那扇总有风声的窗，你则嫌灯挪得太近。两个人换了位置，又各自笑起来。“府里仍要回，往返也还得问。至于今夜，这半页不妨一道看完。”他收自己的笛，你收自己的书，没有把相守写成从此常住宫中。',
 C06:'宜修把两种花样铺开，挑了与你不同的一幅。“这一处想照我的意思。”你们商量灯与针线各留何处，宫务则仍由原职掌交清。旧怨没有因共同整理一张小桌便消失，新的一晚也不必只为查账才留。',
 C07:'年世兰先挑自己的衣裳，又嫌你把花笺压在书下。你挪开，她也肯替你留一块空处。“一同过日子，也不是事事都得一样。”你们把今夜的小事说妥，未替孩子、生育或她明日的去处作任何新决定。',
 C08:'安陵容说今夜不唱，想将自己选的谱页收在靠窗的一侧。你替书册腾出位置，她却笑着指另一处：“这边才方便我拿。”两个人一起收好小桌，各留一盏灯的意思；谁也不必用表演换得留下的位置。',
 C09:'甄嬛把读到一半的诗页折好，问你要不要各留一处书角。“共用一盏灯，倒不必把批注写成同一种。”你们商量杯盏与书的位置，她保留自己读书的闲时，也愿听你说一件琐事。共同生活没有把她定成旧人的样子。',
 C10:'沈眉庄将记花的纸与宫账分开放。“这几页想留给我自己，茶倒可以一道慢慢喝。”你们挑了各自顺手的位置，商量谁收杯、谁将窗掩好。她没有因为相守接下新差事，独立的署名与原来的份例照旧。'
};
export const EXTENSION_BONDS={
 C09:[
 '甄嬛将诗页合上，先问你愿不愿不说话地坐一会儿。她自己挪近一点，窗外的风声没有被催成一首应景的诗。',
 '甄嬛把手留在你近旁，等你回应才握住。“这条路想走慢些。”她挑了方向，也听你自己的意思。',
 '甄嬛先说愿意，才轻轻靠近。一个拥抱里仍容得下她自己的名字，不必成为谁记忆中的影子。',
 '甄嬛挑了一段自己喜欢的小径。你们对树影各有一种读法，走完这段路也没有硬改成同一句话。',
 '灯下，甄嬛说起今日不赞同你的那一处，后来又笑着讲了一件趣事。两个人将话听完，不让同意所有意见成为留下的条件。',
 '甄嬛先问今夜，也说清自己愿意。等你的回答落定，才把灯留低；诗页收在一旁，夜色之后的留白只属于两个人。'
 ],
 C10:[
 '沈眉庄先把宫账收好，留一杯淡茶给自己。“今夜只想歇一会儿。”你们安静坐着，不把闲时写成另一件差事。',
 '沈眉庄说想这样走，才将手递来。你握住，她也没有收起自己的步速；两个人慢慢商量前面的路。',
 '沈眉庄问过你的意思，坦然靠近。她的手在你背后停稳，拥抱没有要求她将不同意见一并放下。',
 '沈眉庄挑了能看见菊影的路，走到风口又与你商量折回。今天看花，只为自己喜欢，不须交一份勤勉的回报。',
 '沈眉庄将茶换淡，说起一处仍想坚持的看法。你听完也说自己的，她没有因夜深便敷衍赞同；后来谈起窗边的小事，两个人都笑了。',
 '沈眉庄亲口说愿意，也认真等你的答复。窗掩好，灯光渐低；今夜留下的人仍有自己的心意，往后的亲近仍要另问。'
 ]
};
export const EXTENSION_REPAIR={
 C09:'甄嬛将那份已接受却落空的原约拿来，先说自己为何不高兴。你没有让礼物代替解释，也没有让她收回不同意见。“改日可以，先把改动说清。”这次把原约与解释核对过，旧失约仍在，新的心意另由两个人决定。',
 C10:'沈眉庄将原来留出的时辰说清：“不来可以先说，不该让我将自己的闲时一直空着。”你听完没有添一份差事补偿，也不请她以喜欢作回答。这回约定已经补谈，旧记录保留，往后是否亲近仍依彼此当下意愿。'
};
const rank=x=>['相识','信任','倾心','共担','相守'].indexOf(x);
export const partnerRelation=(s,cid)=>s.relations[cid]||extensionRelation(s,cid);
export const partnerIssues=(s,cid)=>s.weekly?.relationships?.issues.filter(i=>i.actor===cid&&i.status==='open')||[];
export function extensionBondReady(s,cid,mode){
 const r=extensionRelation(s,cid);
 return !!r&&!!BOND_MODES[mode]&&r.playerIntent==='愿发展'&&r.npcIntent==='愿发展'&&!r.unresolvedGift&&!r.requiresRenewal&&rank(r.stage)>=rank(BOND_MODES[mode].stage)&&!partnerIssues(s,cid).length&&!(s.weekly?.continuation?.lateRequests||[]).some(q=>q.actor===cid&&q.status==='pending');
}
export const pausedPartnerText=cid=>`${NAMES[cid]}听见你想先停一停，便把距离留好。你们只在原处坐了片刻，今晚不再继续亲近。茶还温着，谁也没有催下一步。`;
export const partnerBondText=(cid,mode)=>mode==='daily'?SHARED_LIFE[cid]:EXTENSION_BONDS[cid]?.[Object.keys(BOND_MODES).indexOf(mode)];
export function validatePartnerLife(s){
 if(!s.weekly)return;
 const fail=()=>{throw new RuleError('相守后生活缺少本人实际阶段、原约或私人正文，原档未覆盖。');};
 const idx=id=>s.transactions.findIndex(t=>t.id===id),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 for(const p of s.weekly.plans.filter(p=>p.kind==='bond'&&(EXTENSION_BONDS[p.actor]||p.activity?.mode==='daily'))){
  const a=p.activity,cut=idx(p.createdTransaction);if(!a||a.partnerLifeVersion!==1||cut<0)fail();
  if(EXTENSION_BONDS[p.actor]){const r=extensionRelationAt(s,p.actor,p.createdTransaction);if(!r||r.playerIntent!=='愿发展'||r.npcIntent!=='愿发展'||r.requiresRenewal||r.unresolvedGift||r.stage!==a.agreedStage||rank(r.stage)<rank(BOND_MODES[a.mode]?.stage))fail();for(const i of s.weekly.relationships.issues.filter(i=>i.actor===p.actor)){const plan=s.weekly.plans.find(p=>p.id===i.source);if(idx(plan?.resolvedTransaction)<=cut&&idx(plan?.resolvedTransaction)>=0&&(!i.resolution||idx(i.resolution)>cut))fail();}}
  if(p.status==='completed'){const e=s.weekly.activities.entries.find(e=>e.id===a.entryId),t=s.transactions.find(t=>t.id===p.completedTransaction);if(!e||!t||!same(e.visibleTo,[p.actor])||!t.results.some(r=>r.dialogue===e.text)||!same(e.date,p.date)||e.text!==(a.paused?pausedPartnerText(p.actor):partnerBondText(p.actor,a.mode)))fail();}
 }
 for(const f of s.facts.filter(f=>f.id.startsWith('ISSUE-')&&f.visibleTo.length===2&&EXTENSION_BONDS[f.visibleTo[1]])){if(!s.weekly.relationships.issues.some(i=>i.id===f.id&&i.actor===f.visibleTo[1]))fail();}
 for(const i of s.weekly.relationships?.issues.filter(i=>EXTENSION_BONDS[i.actor])||[]){
  const p=s.weekly.plans.find(p=>p.id===i.source),t=s.transactions.find(t=>t.id===p?.resolvedTransaction),f=s.facts.find(f=>f.id===i.id);if(i.kind!=='breach'||!p||p.actor!==i.actor||p.status!=='breached'||!t?.actions.some(a=>a.type==='week-breach'&&a.planId===p.id)||!same(t.date,i.date)||i.id!==`ISSUE-${t.id}-${i.actor}`||!f||f.source!==p.id||!same(f.visibleTo,['C01',i.actor])||f.text!==i.text)fail();
  if(i.status==='open'&&s.facts.some(f=>f.id.startsWith('REPAIR_REL_')&&f.source===i.id))fail();if(i.status==='resolved'){const r=s.transactions.find(t=>t.id===i.resolution),f=s.facts.find(f=>f.id==='REPAIR_REL_'+i.resolution);if(!r?.actions.some(a=>a.type==='relationship-repair'&&a.actor===i.actor&&a.issueId===i.id)||ordinal(r.date)<ordinal(i.date)||!same(r.date,i.resolvedAt)||!r.results.some(r=>r.dialogue===EXTENSION_REPAIR[i.actor])||!f||f.text!==EXTENSION_REPAIR[i.actor]||!same(f.visibleTo,['C01',i.actor]))fail();}
 }
}
