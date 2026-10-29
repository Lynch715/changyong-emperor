import {PROJECTS,PROJECT_FOR_EVENT} from './project-content.js';
import {ordinal,validDate} from './calendar.js';
import {RuleError} from './rules.js';
import {volumeProjectIds} from './longform.js';
const active=new Set(['planned','executing','review','repairing']);
export function policyWeek(s,d=s.date){const n=ordinal(d),w=s.weekly.weeks.find(w=>n>=ordinal(w.start)&&n<=ordinal(w.end));return w?.id||`regular-${Math.floor((n-2)/7)}`;}
export function focusProjects(s){return [...Object.values(PROJECTS).filter(c=>{const p=s.weekly?.projects?.items[c.id];if(p)return active.has(p.status);return !!s.events[c.nodes[1]]?.completed&&!s.events[c.nodes[2]]?.completed||c.id==='PR-MILITARY'&&s.events.G04?.completed&&!s.events.G06?.completed;}).map(c=>c.id),...volumeProjectIds(s)];}
export function governanceStatus(s){const weekId=policyWeek(s);return {weekId,active:focusProjects(s),decisions:s.weekly.governance?.decisions.filter(x=>x.weekId===weekId)||[],limit:2};}
// New choices opt into the policy; loading an older save never invents or cancels work.
export function claimProjectDecision(s,projectId,operation,tx,{activates=false,eventId=null,count=true}={}){
 if(!s.weekly)return;
 const focuses=focusProjects(s);if(activates&&!focuses.includes(projectId)&&focuses.length>=2)throw new RuleError('已有两项重点差事在推进。先核完一项回报，或明确暂停一项，再接新差事。','PROJECT_LIMIT');
 if(!count)return;
 const today=ordinal(s.date);if(!s.weekly.weeks.some(w=>w.status!=='ended'&&today>=ordinal(w.start)&&today<=ordinal(w.end)))throw new RuleError('眼下是常规时段。亲自决定新方案，请先为本季留一周；已经办过的差事与到期回报照常接续。','DECISION_WEEK');
 const weekId=policyWeek(s),b=s.weekly.governance;
 if((b?.decisions.filter(x=>x.weekId===weekId).length||0)>=2)throw new RuleError('这一周已亲自定过两次项目办法。原差事照常经办，回报仍可读；新的决定请留到后一个可操作周。','DECISION_LIMIT');
 const book=s.weekly.governance||(s.weekly.governance={version:1,activatedAt:structuredClone(s.date),cutoverRevision:s.revision,decisions:[]});
 book.decisions.push({id:tx+'-DECISION-'+book.decisions.length,projectId,operation,eventId,weekId,date:structuredClone(s.date),transactionId:tx});
}
export function claimProjectEvent(s,e,tx){const id=PROJECT_FOR_EVENT[e.id];if(!s.weekly||!id)return;const c=PROJECTS[id];if(e.id===c.nodes[1]||e.id==='G04')claimProjectDecision(s,id,'event',tx,{activates:true,eventId:e.id});}
export function validateGovernance(s){
 const b=s.weekly.governance;if(b===undefined)return;
 if(b.version!==1||!validDate(b.activatedAt)||ordinal(b.activatedAt)>ordinal(s.date)||!Number.isInteger(b.cutoverRevision)||b.cutoverRevision<0||b.cutoverRevision>s.revision||!Array.isArray(b.decisions)||b.decisions.length>20000||new Set(b.decisions.map(x=>x.id)).size!==b.decisions.length)throw new RuleError('项目决策记录格式错误。');
 const counts={};for(const x of b.decisions){const cfg=PROJECTS[x.projectId],t=s.transactions.find(t=>t.id===x.transactionId);if(!cfg||!validDate(x.date)||ordinal(x.date)<ordinal(b.activatedAt)||ordinal(x.date)>ordinal(s.date)||x.weekId!==policyWeek(s,x.date)||!t||ordinal(t.date)<ordinal(x.date)||t.revisionBefore<b.cutoverRevision||!['event','project-assign','project-repair'].includes(x.operation)||!t.actions.some(a=>a.type===x.operation&&(x.operation==='event'?a.eventId===x.eventId&&[cfg.nodes[1],...(x.projectId==='PR-MILITARY'?['G04']:[])].includes(x.eventId):a.projectId===x.projectId)))throw new RuleError('项目决定缺少对应事务或实际日期。');counts[x.weekId]=(counts[x.weekId]||0)+1;}
 if(Object.values(counts).some(n=>n>2))throw new RuleError('同周项目决定超过两次。');
}
