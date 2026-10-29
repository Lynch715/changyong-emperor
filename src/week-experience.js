import {reviewExpectations,validateExpectations,validateReviewPassages} from './week-expectations.js';
import {NAMES,EVENTS} from './content.js';
import {PROJECTS} from './project-content.js';
import {ordinal} from './calendar.js';
import {RuleError} from './rules.js';
const cp=x=>structuredClone(x),when=d=>`${d.year===1?'元':d.year===2?'二':d.year}年${d.month}月${d.day}日`;
export const FUTURE_MEETINGS={C03:'西北的军报先来，人要到来年初夏凯旋时再相见；此后往来仍有驿程。',C04:'来年正月，宫门问诊时会与他正式相逢。下值之后，才有留给书页的话。',C05:'来年初夏的御园会有一段笛声。入宫与回王府，都有自己的约期。',C08:'这一年稍后，宫门会迎来新面孔。等真正相逢，再听她自己挑的曲子。'};
export function weekInvitation(s,w){
 if(!w||s.sealed||!s.events.M01?.completed)return null;
 if(w.id==='W01'){
  const first={steady:'那盏移近的灯还亮着。苏培盛把茶盘放稳，这一回，你不必等到一切太晚才问他一句。',verify:'你问过的名字都还在。御案边的更簿压着两处空白，眼前的人仍想把那页收回袖里。',call:'案侧腾出的地方还留着。苏培盛没有退回门外，袖中的更簿却露出一角。'}[s.events.M01.outcomeId]||'灯下的人还在。你想先留住一段说话的时间，还是把更簿上的空缺问清？';
  const text=s.events['WG-C02']?.completed?'交接清单已带出门，接更的人名写在上面。苏培盛将那只茶盘放稳；要看这一回是否真正接得上，还须等七日后的签名。':s.events['WG-C01']?.completed?'那页薄纸已经摊在案边。两处缺的更次照实留下，苏培盛这次没有再把自己的名字填进去。':first;
  return {title:s.events.M02?.completed?'茶温着，更簿也摊开了':'灯还留在案边',text,project:'PR-COURT',event:!s.events['WG-C01']?.completed?'WG-C01':!s.events['WG-C02']?.completed?'WG-C02':null,actor:'C02',choices:[['chat','留一段闲话'],['walk','约一段慢路'],['study','自己读两页']]};
 }
 if(w.id==='W06')return {title:'笛声之外，还有来信',text:s.events.M10?.completed?'西北的原册到了，园中那半拍也还留着。钱粮交给经办，自己的时辰也可以认真留给一个人。':s.events.M09?.completed?'允礼留下的那半拍还在耳边。宫门外尚有军报未到，今日想说的话，可以先约一个真正有空的时辰。':'园路的风渐暖。有人带着笛子往来王府，西北的信也在路上；先把眼前这一幕走完。',project:'PR-MILITARY',event:s.events.M10?.completed&&!s.events.G04?.completed?'G04':s.events.G04?.completed&&!s.events.G05?.completed?'G05':null,actor:'C05',choices:[['walk','把那半拍留给园路'],['study','灯下校一页书'],['rest','留一段安稳小憩']]};
 return null;
}
export function makeWeekReview(s,w){
 const inside=d=>!!d&&ordinal(d)>=ordinal(w.start)&&ordinal(d)<=ordinal(w.end),sources=[],passages=[];
 const completed=s.weekly.plans.filter(p=>p.weekId===w.id&&p.status==='completed'),stories=Object.entries(s.transcripts).filter(([,t])=>inside(t.date));
 const projects=Object.values(s.weekly.projects?.items||{}).filter(p=>p.history.some(h=>inside(h.date)));
 for(const p of projects.slice(0,3)){
  const cfg=PROJECTS[p.id],report=p.reports.filter(r=>inside(r.date)).at(-1),run=p.runs.filter(r=>inside(r.startedAt)).at(-1),evidence=p.evidence.filter(e=>inside(e.date)).at(-1);
  if(report){passages.push(report.text);sources.push({kind:'project-report',id:report.id,projectId:p.id});}
  else if(run){if(evidence?.id.startsWith('DISPATCH-')){passages.push(evidence.text);sources.push({kind:'project-evidence',id:evidence.id,projectId:p.id});}passages.push(`${NAMES[p.officer]}接下了「${cfg.title}」。${when(run.dueDate)}才到核回报的日子，眼下收着的是经办签名，尚未把差事写成办完。`);sources.push({kind:'project-run',id:run.id,projectId:p.id});}
  else if(evidence){passages.push(`「${cfg.title}」留下了新材料：${evidence.text}`);sources.push({kind:'project-evidence',id:evidence.id,projectId:p.id});}
 }
 const moments=completed.filter(p=>p.dialogue&&p.kind!=='letter'&&!p.eventId),personal=moments.filter(p=>p.actor!=='C01'||p.kind==='banquet').at(-1)||moments.at(-1);
 if(personal){passages.push(personal.dialogue);sources.push({kind:'plan',id:personal.id});}
 for(const [key,t]of stories.filter(([,t])=>/^(R|XR)/.test(t.eventId)).slice(-2)){passages.push(`${NAMES[t.actor]} · ${t.title}\n${t.dialogue}`);sources.push({kind:'transcript',id:key});}
 const incense=s.incenseCase;if(incense?.review&&inside(incense.review.date)){passages.push('太医院的核对回单\n'+incense.review.text);sources.push({kind:'incense',id:'review'});}if(incense?.shared&&inside(incense.shared.date)&&!stories.some(([,t])=>t.transactionId===incense.shared.transactionId)){passages.push('年世兰已亲自留有核对副单，已对上的日期与尚缺的用量仍分开记着。');sources.push({kind:'incense',id:'shared'});}
 const outgoing=completed.filter(p=>p.kind==='letter').at(-1);if(outgoing){passages.push(`给${NAMES[outgoing.actor]}的信已经交驿。还没到手的字句，暂不填成对方的答复。`);sources.push({kind:'plan',id:outgoing.id});}
 const otherStories=stories.filter(([,t])=>/^(P|D)/.test(t.eventId)||['M06','M11'].includes(t.eventId)||s.weekly.continuation&&/^M(?:1[3-9]|2[0-9]|3[0-9]|4[0-8])$/.test(t.eventId)).slice(-2);
 for(const [key,t] of otherStories){passages.push(`${t.title}\n${t.dialogue}`);sources.push({kind:'transcript',id:key});}
 const reports=new Set(sources.filter(x=>x.kind==='project-report').map(x=>x.projectId));
 for(const f of s.facts.filter(f=>f.id.startsWith('PROJECT_PROGRESS_')&&inside(f.date)&&f.visibleTo.includes('C01')).slice(-2)){
  if(Object.keys(PROJECTS).some(id=>reports.has(id)&&f.id.includes(id)))continue;
  passages.push(f.text);sources.push({kind:'fact',id:f.id});
 }
 for(const e of (s.weekly.activities?.entries||[]).filter(e=>inside(e.date)&&['gift-result','letter-reply','followup'].includes(e.kind)).slice(-2)){
  if(passages.includes(e.text))continue;passages.push(e.title+'\n'+e.text);sources.push({kind:'activity',id:e.id});
 }
 const note=(s.weekly.relationships?.messages||[]).filter(m=>m.text&&inside(m.readAt)).at(-1);
 if(note){passages.push(`${NAMES[note.actor]}捎来的话\n${note.text}`);sources.push({kind:'initiative',id:note.id});}
 const answer=s.weekly.relationships?.requests.filter(q=>q.status==='answered'&&inside(q.answeredAt)).at(-1);if(answer){passages.push(`${NAMES[answer.actor]}的答复\n${answer.text}`);sources.push({kind:'answer',id:answer.id});}
 for(const h of (s.weekly.relationships?.history||[]).filter(h=>h.kind==='stage'&&inside(h.date)).slice(-2)){passages.push(`${NAMES[h.actor]} · ${h.to}\n${h.text}`);sources.push({kind:'stage',id:h.id});}
 for(const h of (s.extensionRoutes?.history||[]).filter(h=>h.kind!=='node'&&inside(h.date)).slice(-2)){passages.push(`${NAMES[h.actor]}后来亲自说过的话\n${h.text}`);sources.push({kind:'extension-talk',id:h.transactionId});}
 for(const f of s.facts.filter(f=>(f.id.startsWith('FAMILY-')||f.id.startsWith('V5-')||f.id.startsWith('V6-')||f.id.startsWith('V7-')||f.id.startsWith('V8-'))&&inside(f.date)&&f.visibleTo.includes('C01')).slice(-2)){passages.push(f.text);sources.push({kind:'fact',id:f.id});}
 for(const f of s.facts.filter(f=>f.id.startsWith('REPAIR_REL_')&&inside(f.date)&&f.visibleTo.includes('C01')).slice(-1)){passages.push(f.text);sources.push({kind:'fact',id:f.id});}
 const postponed=s.transactions.filter(t=>inside(t.date)&&t.actions.some(a=>a.type==='defer'&&!s.events[a.eventId]?.completed)).at(-1);
 if(postponed){const a=postponed.actions.find(a=>a.type==='defer'&&!s.events[a.eventId]?.completed),title=postponed.results[postponed.actions.indexOf(a)]?.label||'未说完的话';passages.push(`${title}仍留着。未约的没有算作失约，未说完的也没有写成已经相知；等彼此有空，再从原话接起。`);sources.push({kind:'defer',id:postponed.id,eventId:a.eventId});}
 const pending=s.weekly.plans.filter(p=>p.status==='accepted'&&ordinal(p.date)>ordinal(w.end)).slice(0,2).map(p=>({id:p.id,date:cp(p.date),text:`${when(p.date)}，还留着「${p.label}」的时辰。`}));
 if(!passages.length)passages.push('窗前的日影慢慢移过。案边仍有可坐的位置，这一周留给自己的空白，也不必急着填满。');
 else{passages.unshift(projects.length?'收笔时，你将带回签名的纸放在一边，把尚待回来的留在另一边。忙过的这一周，不只剩案上少了几本折子。':'收笔时，灯下的纸慢慢归拢。白日说过的话，有的还惹人一笑，有的并不轻快，却都不必因一周过去便丢在门外。');passages.push(pending.length?'案边还留着下一回的时辰。今夜先将已经走过的收好，未到的那一段，等彼此真有空时再慢慢接。':'灯将熄时，你又看过最后一页。做成的有了落款，没解开的仍能再问；自己的时辰，也可以从明日重新留起。');}
 const ledger=s.ledger.filter(l=>inside(l.date)),income=ledger.filter(l=>l.amount>0).reduce((a,l)=>a+l.amount,0),expense=ledger.filter(l=>l.amount<0).reduce((a,l)=>a-l.amount,0);
 return {version:2,expectations:reviewExpectations(s,w),title:w.id==='W01'?'初醒之后，灯仍有人守':w.id==='W06'?'笛声与军书，都留下了回音':'这一周留下的回音',start:cp(w.start),end:cp(w.end),passages,sources,pending,income,expense};
}
export function validateWeekReviews(s){
 for(const r of s.weekly.reports){const v=r.review;if(v===undefined)continue;const w=s.weekly.weeks.find(w=>w.id===r.weekId);if(![1,2].includes(v.version)||typeof v.title!=='string'||!w||ordinal(v.start)!==ordinal(w.start)||ordinal(v.end)!==ordinal(w.end)||!Array.isArray(v.passages)||!v.passages.length||v.passages.some(p=>typeof p!=='string'||p.length>6000)||!Array.isArray(v.sources)||!Array.isArray(v.pending)||!Number.isFinite(v.income)||!Number.isFinite(v.expense)||v.income<0||v.expense<0)throw new RuleError('一周回顾格式或日期错误。');
  const inside=d=>d&&ordinal(d)>=ordinal(w.start)&&ordinal(d)<=ordinal(w.end);
  for(const source of v.sources){let d;if(source.kind==='plan')d=s.weekly.plans.find(p=>p.id===source.id&&p.status==='completed')?.date;else if(source.kind==='defer'){const t=s.transactions.find(t=>t.id===source.id&&t.actions.some(a=>a.type==='defer'&&a.eventId===source.eventId));d=t?.date;}else if(source.kind==='transcript')d=s.transcripts[source.id]?.date;else if(source.kind==='incense')d=(source.id==='review'?s.incenseCase?.review:source.id==='shared'?s.incenseCase?.shared:null)?.date;else if(source.kind==='fact')d=s.facts.find(f=>f.id===source.id&&f.visibleTo.includes('C01'))?.date;else if(source.kind==='activity')d=s.weekly.activities?.entries.find(e=>e.id===source.id)?.date;else if(source.kind==='stage')d=s.weekly.relationships?.history.find(h=>h.id===source.id&&h.kind==='stage')?.date;else if(source.kind==='extension-talk')d=s.extensionRoutes?.history.find(h=>h.transactionId===source.id&&h.kind!=='node')?.date;else if(source.kind==='answer')d=s.weekly.relationships?.requests.find(q=>q.id===source.id&&q.status==='answered')?.answeredAt;else if(source.kind==='initiative')d=s.weekly.relationships?.messages.find(m=>m.id===source.id&&m.text)?.readAt;else{const p=s.weekly.projects?.items[source.projectId];d=(source.kind==='project-run'?p?.runs.find(x=>x.id===source.id)?.startedAt:source.kind==='project-report'?p?.reports.find(x=>x.id===source.id)?.date:source.kind==='project-evidence'?p?.evidence.find(x=>x.id===source.id)?.date:null);}if(!inside(d))throw new RuleError('一周回顾缺少当周的真实来源。');}
  for(const pending of v.pending){const p=s.weekly.plans.find(p=>p.id===pending.id);if(!p||ordinal(p.date)!==ordinal(pending.date)||ordinal(p.date)<=ordinal(w.end))throw new RuleError('回顾里的未来约期缺少原约。');}
  if(v.version===2){validateExpectations(s,r,w);validateReviewPassages(s,v);}
  const ls=s.ledger.filter(l=>inside(l.date));if(v.income!==ls.filter(l=>l.amount>0).reduce((a,l)=>a+l.amount,0)||v.expense!==-ls.filter(l=>l.amount<0).reduce((a,l)=>a+l.amount,0))throw new RuleError('一周回顾收支与原流水不一致。');
 }
}
