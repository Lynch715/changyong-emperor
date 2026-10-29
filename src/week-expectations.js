import {isEighth,eighthRunLabel} from './volume8.js';
import {isSeventh,seventhRunLabel} from './volume7.js';
import {isSixth,sixthRunLabel} from './volume6.js';
import {isFifth,fifthRunLabel} from './volume5.js';
import {hasContinuation,horizonDate,isFourth} from './longform.js';
import {NAMES} from './content.js';
import {PROJECTS} from './project-content.js';
import {ordinal,monthKey} from './calendar.js';
import {RuleError} from './rules.js';
const allRuns=s=>{const a=[];for(let p=s.weekly?.continuation;p;p=p.source?.weekly?.continuation)a.push(...p.runs);return a;};
const when=d=>`${d.year===1?'元':d.year===2?'二':d.year}年${d.month}月${d.day}日`,cp=x=>structuredClone(x);
// Player-only, frozen expectations. A future date never awards its outcome.
export function reviewExpectations(s,w){
 const rows=[],push=(kind,id,date,text)=>rows.push({kind,id,date:cp(date),text});
 const v7=s.weekly.continuation;if(isSeventh(s)||isEighth(s)){for(const q of v7.lateRequests.filter(q=>q.status==='pending'))push('v7-wish',q.id,q.dueDate,`${when(q.dueDate)}再听本人私人答复，今日只是请求，未先升级。`);for(const q of v7.adult.invitations.filter(q=>q.status==='pending'))push('v7-adult',q.id,q.dueDate,`${when(q.dueDate)}再听澄宁是否愿谈，尚无本人同意或婚配。`);if(v7.career?.status==='pending')push('v7-career',v7.career.transactionId,v7.career.dueDate,`${when(v7.career.dueDate)}再听本人愿接的有限志业范围，机会提出不等于已经接差。`);}
 const f=s.weekly.continuation?.family;if(f){for(const d of f.discussions)if(d.status==='pending')push('family',d.id,d.dueDate,`${when(d.dueDate)}再听年世兰本人答复，尚未替她同意或开始孕育。`);if(f.conception&&!f.child)push('family',f.conception.transactionId,f.conception.dueDate,`${when(f.conception.dueDate)}才满本次孕育实际工期，出生仍须届时亲自核回执，不先造孩子。`);}
 for(const r of s.weekly.continuation?.runs||[])if(r.status==='pending')push('volume-run',r.id,r.dueDate,`${when(r.dueDate)}再核${r.id.startsWith('V8-')?eighthRunLabel(r):r.id.startsWith('V7-')?seventhRunLabel(r):r.id.startsWith('V6-')?sixthRunLabel(r):['M26','M30'].includes(r.eventId)?fifthRunLabel(r):r.eventId==='M22'?'眉庄疑账本批回执':r.eventId==='M13'?'本批西北补给':'内廷封发补页'}。眼下只有经办安排，实际回报仍待阅核。`);
 for(const q of s.queue.filter(q=>['G20','G17','G08','G14','G11'].includes(q.source)&&!s.events[q.eventId]?.completed))push('event-followup',q.eventId,q.dueDate,`${when(q.dueDate)}再核${q.source==='G11'?'河工首轮':q.source==='G08'?'税制试点':q.source==='G14'?'宗室请托':q.source==='G17'?'官员答辩':'医事'}本批回报，费用与范围按原方案记，未阅核前不先写成完成。`);
 for(const p of s.weekly.plans.filter(p=>p.status==='accepted'&&ordinal(p.date)>ordinal(w.end)).slice(0,1))push('plan',p.id,p.date,`${when(p.date)}还约有「${p.label}」。这只是已接受的约期，尚未记作赴约或共同经历。`);
 for(const p of Object.values(s.weekly.projects?.items||{})){
  if(p.status==='needs-repair'){const r=p.reports.at(-1);if(r)push('project-report',r.id,r.date,'原回报仍留着待补的缺口。是否另排工期与费用，由你之后决定；眼下没有记成已经补好。');}
  else if(['executing','repairing','review'].includes(p.status)){const r=p.runs.at(-1);if(r)push('project-run',r.id,r.dueDate,`${when(r.dueDate)}是这轮核回报的日子。${ordinal(r.dueDate)<=ordinal(s.date)?'已到日期，仍待亲自阅核。':'先等实际工期走满，再看回报。'}尚不写成已经验收完成。`);}
 }
 for(const q of s.weekly.relationships?.requests.filter(q=>q.status==='pending')||[])push('request',q.id,q.dueDate,`${NAMES[q.actor]}的答复最早${when(q.dueDate)}再听。${q.remote?'信与回信各有驿程，送达不等于已读到答复。':'请求只记了你说过的话，尚不替对方回答。'}`);
 for(const sh of s.weekly.activities?.shipments.filter(sh=>sh.status!=='answered')||[]){const date=sh.kind==='gift'&&sh.status==='sent'?sh.deliveryAt:sh.dueDate;push('shipment',sh.id,date,`${when(date)}${ordinal(date)<=ordinal(s.date)?'已到递送或回信日，仍待亲自展开给':'再留意给'}${NAMES[sh.actor]}${sh.kind==='gift'?'的新物与回执':'的信与回信'}。${sh.kind==='gift'?'未收到回执，不能先写成收下。':'递送与答复分别记，未读的原话暂不补写。'}`);}
 for(const m of s.weekly.relationships?.messages.filter(m=>m.status==='pending'&&m.kind==='note')||[]){if(rows.length>=3)break;push('initiative',m.id,m.date,`${NAMES[m.actor]}有一句接着前事的话，${ordinal(m.date)>ordinal(s.date)?when(m.date)+'之后再看':'尚未展开'}。没有读过的内容，此处不先替本人说出来。`);}
 if(!rows.length){const next=s.weekly.weeks.filter(x=>x.type==='focus'&&ordinal(x.start)>ordinal(s.date)).sort((a,b)=>ordinal(a.start)-ordinal(b.start))[0];if(next)push('week',next.id,next.start,`${when(next.start)}还有下一段重点时日，可以重新留自己的安排；具体相逢和结果尚未发生。`);else{const date={...s.date,day:30};if(!s.weekly.monthly.some(m=>m.key===monthKey(date)))push('month',monthKey(date),date,`${when(date)}还有一份当月账待核。初卷的收束须沿真实日期走，不提前领后面的收入或写完未发生的事。`);}}
 if(!rows.length)push('closure',isEighth(s)?'V08':isSeventh(s)?'V07':isSixth(s)?'V06':isFifth(s)?'V05':isFourth(s)?'V04':hasContinuation(s)?'V03':'F00',horizonDate(s),isEighth(s)?'第八卷已到据实封存日，最终史册另立，旧卷保持。':isSeventh(s)?'第七卷已走到可以收存的日子。只收本卷实际记录，旧卷与未完事项仍保留。':isSixth(s)?'第六卷已走到可以收存的日子。只收本卷实际记录，旧卷与未完事项仍保留。':isFifth(s)?'第五卷已走到可以收存的日子。只收本卷实际记录，旧卷与未完事项仍保留。':isFourth(s)?'第四卷已走到可以收存的日子。只收本卷实际记录，旧卷与未完事项仍保留。':hasContinuation(s)?'第三卷已走到可以收存的日子。只收本卷实际记录，原初卷与未完事项仍保留。':'初卷已走到可以收存的日子。下一步据实清点与封卷，未完成的事仍照原记录留下。');
 return rows.slice(0,3);
}
export function validateExpectations(s,r,w){
 const rows=r.review.expectations;if(!Array.isArray(rows)||!rows.length||rows.length>3)throw new RuleError('新周回顾缺少有来源的后续期待。');
 const cutoff=ordinal(r.date),fail=()=>{throw new RuleError('周回顾的期待缺少当时已知的真实来源。');};
 for(const x of rows){if(!x||!['v7-wish','v7-adult','v7-career','family','event-followup','volume-run','plan','project-run','project-report','request','shipment','initiative','week','month','closure'].includes(x.kind)||typeof x.text!=='string'||!x.text||x.text.length>1000||Object.keys(x).some(k=>!['kind','id','date','text'].includes(k)))fail();const at=ordinal(x.date);let source,known;
  if(x.kind.startsWith('v7-')){for(let b=s.weekly.continuation;b;b=b.source?.weekly?.continuation){source=x.kind==='v7-wish'?b.lateRequests?.find(q=>q.id===x.id):x.kind==='v7-adult'?b.adult?.invitations.find(q=>q.id===x.id):b.career?.transactionId===x.id?b.career:null;if(source)break;}known=source?.date;if(!source||at!==ordinal(source.dueDate))fail();}
  if(x.kind==='event-followup'){source=s.queue.find(q=>q.eventId===x.id&&['G20','G17','G08','G14','G11'].includes(q.source));known=s.events[source?.source]?.date;if(source&&at!==ordinal(source.dueDate))fail();}
  if(x.kind==='family'){const f=s.weekly.continuation?.family;source=f?.discussions.find(d=>d.id===x.id)||f?.conception?.transactionId===x.id&&f.conception;known=source?.date;if(!source||at!==ordinal(source.dueDate))fail();}
  if(x.kind==='volume-run'){source=allRuns(s).find(r=>r.id===x.id);known=source?.date;if(source&&at!==ordinal(source.dueDate))fail();}
  if(x.kind==='plan'){source=s.weekly.plans.find(p=>p.id===x.id);known=source?.acceptedAt; if(!source||at!==ordinal(source.date)||at<=ordinal(w.end))fail();}
  if(x.kind==='project-run'){source=Object.values(s.weekly.projects.items).flatMap(p=>p.runs).find(p=>p.id===x.id);known=source?.startedAt;if(source&&at<ordinal(source.startedAt)+source.minimumDays)fail();}
  if(x.kind==='project-report'){source=Object.values(s.weekly.projects.items).flatMap(p=>p.reports).find(p=>p.id===x.id&&p.issue);known=source?.date;if(source&&at!==ordinal(source.date))fail();}
  if(x.kind==='request'){source=s.weekly.relationships.requests.find(q=>q.id===x.id);known=source?.date;if(source&&at<ordinal(source.date)+(source.remote?14:1))fail();}
  if(x.kind==='shipment'){source=s.weekly.activities?.shipments.find(sh=>sh.id===x.id);known=source?.sentAt;if(source&&at<ordinal(source.sentAt)+7)fail();}
  if(x.kind==='initiative'){source=s.weekly.relationships.messages.find(m=>m.id===x.id);known=source?.sourceDate;if(source&&at!==ordinal(source.date))fail();}
  if(x.kind==='week'){source=s.weekly.weeks.find(q=>q.id===x.id&&q.type==='focus');known=w.start;if(source&&(at!==ordinal(source.start)||at<=cutoff))fail();}
  if(x.kind==='month'){source={};known=w.start;if(x.id!==monthKey(x.date)||x.date.day!==30||at<cutoff||s.weekly.monthly.some(m=>m.key===x.id&&ordinal(m.date)<cutoff))fail();}
  if(x.kind==='closure'){source={};known=w.start;if(!((x.id==='F00'&&at===720&&cutoff>=720)||(hasContinuation(s)&&x.id==='V03'&&at===1440&&cutoff>=1440)||((isFourth(s)||isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s))&&x.id==='V04'&&at===2160&&cutoff>=2160)||((isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s))&&x.id==='V05'&&at===4320&&cutoff>=4320)||((isSixth(s)||isSeventh(s)||isEighth(s))&&x.id==='V06'&&at===7200&&cutoff>=7200)||(isEighth(s)&&x.id==='V08'&&at===10800&&cutoff>=10800)||((isSeventh(s)||isEighth(s))&&x.id==='V07'&&at===9360&&cutoff>=9360)))fail();}
  if(!source||!known||ordinal(known)>cutoff)fail();
  const texts={
   'v7-wish': [`${when(x.date)}再听本人私人答复，今日只是请求，未先升级。`],
   'v7-adult': [`${when(x.date)}再听澄宁是否愿谈，尚无本人同意或婚配。`],
   'v7-career': [`${when(x.date)}再听本人愿接的有限志业范围，机会提出不等于已经接差。`],
   family:[`${when(x.date)}再听年世兰本人答复，尚未替她同意或开始孕育。`,`${when(x.date)}才满本次孕育实际工期，出生仍须届时亲自核回执，不先造孩子。`],
   'event-followup':[`${when(x.date)}再核${source?.source==='G11'?'河工首轮':source?.source==='G08'?'税制试点':source?.source==='G14'?'宗室请托':source?.source==='G17'?'官员答辩':'医事'}本批回报，费用与范围按原方案记，未阅核前不先写成完成。`],
   'volume-run':[`${when(x.date)}再核${source?.id?.startsWith('V8-')?eighthRunLabel(source):source?.id?.startsWith('V7-')?seventhRunLabel(source):source?.id?.startsWith('V6-')?sixthRunLabel(source):['M26','M30'].includes(source?.eventId)?fifthRunLabel(source):source?.eventId==='M22'?'眉庄疑账本批回执':source?.eventId==='M13'?'本批西北补给':'内廷封发补页'}。眼下只有经办安排，实际回报仍待阅核。`],
   plan:[`${when(x.date)}还约有「${source?.label}」。这只是已接受的约期，尚未记作赴约或共同经历。`],
   'project-report':['原回报仍留着待补的缺口。是否另排工期与费用，由你之后决定；眼下没有记成已经补好。'],
   'project-run':['已到日期，仍待亲自阅核。','先等实际工期走满，再看回报。'].map(t=>`${when(x.date)}是这轮核回报的日子。${t}尚不写成已经验收完成。`),
   request:[`${NAMES[source?.actor]}的答复最早${when(x.date)}再听。${source?.remote?'信与回信各有驿程，送达不等于已读到答复。':'请求只记了你说过的话，尚不替对方回答。'}`],
   shipment:['再留意给','已到递送或回信日，仍待亲自展开给'].map(t=>`${when(x.date)}${t}${NAMES[source?.actor]}${source?.kind==='gift'?'的新物与回执':'的信与回信'}。${source?.kind==='gift'?'未收到回执，不能先写成收下。':'递送与答复分别记，未读的原话暂不补写。'}`),
   initiative:[when(x.date)+'之后再看','尚未展开'].map(t=>`${NAMES[source?.actor]}有一句接着前事的话，${t}。没有读过的内容，此处不先替本人说出来。`),
   week:[`${when(x.date)}还有下一段重点时日，可以重新留自己的安排；具体相逢和结果尚未发生。`],
   month:[`${when(x.date)}还有一份当月账待核。初卷的收束须沿真实日期走，不提前领后面的收入或写完未发生的事。`],
   closure:['初卷已走到可以收存的日子。下一步据实清点与封卷，未完成的事仍照原记录留下。',...(isEighth(s)?['第八卷已到据实封存日，最终史册另立，旧卷保持。']:[]),...(isSeventh(s)||isEighth(s)?['第七卷已走到可以收存的日子。只收本卷实际记录，旧卷与未完事项仍保留。']:[]),...(isSixth(s)||isSeventh(s)||isEighth(s)?['第六卷已走到可以收存的日子。只收本卷实际记录，旧卷与未完事项仍保留。']:[]),...(isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s)?['第五卷已走到可以收存的日子。只收本卷实际记录，旧卷与未完事项仍保留。']:[]),...(isFourth(s)||isFifth(s)||isSixth(s)||isSeventh(s)||isEighth(s)?['第四卷已走到可以收存的日子。只收本卷实际记录，旧卷与未完事项仍保留。']:[]),...(hasContinuation(s)?['第三卷已走到可以收存的日子。只收本卷实际记录，原初卷与未完事项仍保留。']:[])]
  };if(!texts[x.kind].includes(x.text))fail();
 }
}
export function validateReviewPassages(s,v){
 const allowed=new Set([
  '窗前的日影慢慢移过。案边仍有可坐的位置，这一周留给自己的空白，也不必急着填满。',
  '收笔时，你将带回签名的纸放在一边，把尚待回来的留在另一边。忙过的这一周，不只剩案上少了几本折子。',
  '收笔时，灯下的纸慢慢归拢。白日说过的话，有的还惹人一笑，有的并不轻快，却都不必因一周过去便丢在门外。',
  '案边还留着下一回的时辰。今夜先将已经走过的收好，未到的那一段，等彼此真有空时再慢慢接。',
  '灯将熄时，你又看过最后一页。做成的有了落款，没解开的仍能再问；自己的时辰，也可以从明日重新留起。'
 ]),runs=[];
 for(const x of v.sources){
  if(x.kind==='plan'){const p=s.weekly.plans.find(p=>p.id===x.id);if(p?.kind==='letter')allowed.add(`给${NAMES[p.actor]}的信已经交驿。还没到手的字句，暂不填成对方的答复。`);else if(p?.dialogue)allowed.add(p.dialogue);}
  else if(x.kind==='transcript'){const t=s.transcripts[x.id];if(t){allowed.add(`${t.title}\n${t.dialogue}`);allowed.add(`${NAMES[t.actor]} · ${t.title}\n${t.dialogue}`);}}
  else if(x.kind==='fact')allowed.add(s.facts.find(f=>f.id===x.id)?.text);
  else if(x.kind==='activity'){const e=s.weekly.activities?.entries.find(e=>e.id===x.id);if(e){allowed.add(e.text);allowed.add(e.title+'\n'+e.text);}}
  else if(x.kind==='initiative'){const m=s.weekly.relationships.messages.find(m=>m.id===x.id);if(m)allowed.add(`${NAMES[m.actor]}捎来的话\n${m.text}`);}
  else if(x.kind==='answer'){const q=s.weekly.relationships.requests.find(q=>q.id===x.id);if(q)allowed.add(`${NAMES[q.actor]}的答复\n${q.text}`);}
  else if(x.kind==='stage'){const h=s.weekly.relationships.history.find(h=>h.id===x.id&&h.kind==='stage');if(h)allowed.add(`${NAMES[h.actor]} · ${h.to}\n${h.text}`);}
  else if(x.kind==='extension-talk'){const h=s.extensionRoutes?.history.find(h=>h.transactionId===x.id);if(h)allowed.add(`${NAMES[h.actor]}后来亲自说过的话\n${h.text}`);}
  else if(x.kind==='incense'){if(x.id==='review')allowed.add('太医院的核对回单\n'+s.incenseCase.review.text);else allowed.add('年世兰已亲自留有核对副单，已对上的日期与尚缺的用量仍分开记着。');}
  else if(x.kind==='defer'){const t=s.transactions.find(t=>t.id===x.id),i=t?.actions.findIndex(a=>a.type==='defer'&&a.eventId===x.eventId);if(t&&i>=0)allowed.add(`${t.results[i]?.label||'未说完的话'}仍留着。未约的没有算作失约，未说完的也没有写成已经相知；等彼此有空，再从原话接起。`);}
  else {const p=s.weekly.projects?.items[x.projectId];if(x.kind==='project-report')allowed.add(p?.reports.find(r=>r.id===x.id)?.text);if(x.kind==='project-evidence'){const e=p?.evidence.find(e=>e.id===x.id);if(e){allowed.add(e.text);allowed.add(`「${PROJECTS[p.id].title}」留下了新材料：${e.text}`);}}if(x.kind==='project-run'&&p){const run=p.runs.find(r=>r.id===x.id);runs.push({prefix:`${NAMES[p.officer]}接下了「${PROJECTS[p.id].title}」。`,run});}}
 }
 for(const text of v.passages){if(allowed.has(text))continue;
  // A later pause may change the live due date; keep the original authored projection.
  const validRun=runs.some(({prefix,run})=>{if(!text.startsWith(prefix))return false;const tail=text.slice(prefix.length),m=/^(元|二|[3-9]|1[0-9]|2[0-9]|3[01])年(\d{1,2})月(\d{1,2})日才到核回报的日子，眼下收着的是经办签名，尚未把差事写成办完。$/.exec(tail);if(!m)return false;try{return ordinal({year:m[1]==='元'?1:m[1]==='二'?2:+m[1],month:+m[2],day:+m[3]})>=ordinal(run.startedAt)+run.minimumDays;}catch{return false;}});
  if(!validRun)throw new RuleError('新周回顾正文与所列真实原话来源不符。');
 }
}
