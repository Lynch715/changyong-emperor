// Only explicitly reviewed dialogue can skip the second click. Zero cost alone
// does not turn an order, gift, relationship step or future appointment into talk.
const ordinary={
 M01:['steady','verify','call'],M02:['tea','duty','rest'],
 M07:['skill'],M08:['listen'],M09:['music','duty','listen'],
 M11:['clear','polite','unsure'],
 ...Object.fromEntries(['R02-01','R02-02','R03-01','R04-01','R04-02','R05-01','R05-02','R06-01','R06-02','R07-01','R07-02','R08-01','R08-02'].map(id=>[id,['work','distance']]))
};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const commitments=s=>(s.weekly?.plans||s.promises).filter(p=>['accepted','executing','needs-reschedule'].includes(p.status));
export function actionConfirmation(before,actions,results,after){
 const reasons=[];
 if(results.some(r=>r.treasury))reasons.push('钱款将记账');
 if(results.some(r=>r.actionCost>0))reasons.push('需要履行或使用时间');
 if(!same(before.date,after.date)||before.turn!==after.turn||before.weekly?.clock!==after.weekly?.clock)reasons.push('时日将向前');
 if(!same(commitments(before),commitments(after)))reasons.push('正式约定将变更');
 if(!same(before.weekly?.activities?.inventory,after.weekly?.activities?.inventory))reasons.push('随身新物将变更');
 if(!same(before.facts.filter(f=>f.id.startsWith('DISCLOSE_')),after.facts.filter(f=>f.id.startsWith('DISCLOSE_'))))reasons.push('将向人物说明秘密');
 if(Object.entries(after.relations).some(([cid,r])=>r.stage!==before.relations[cid]?.stage||r.playerIntent==='愿发展'&&before.relations[cid]?.playerIntent!=='愿发展'||r.npcIntent==='愿发展'&&before.relations[cid]?.npcIntent!=='愿发展'))reasons.push('相处阶段或发展意愿将改变');
 if(actions.some(a=>a.type==='event'&&a.eventId.startsWith('R07')&&before.incenseCase?.review&&!before.incenseCase.shared))reasons.push('将把核对副单交给本人');
 const onlyTalk=actions.length===1&&(actions[0].type==='activity-followup'||actions[0].type==='event'&&ordinary[actions[0].eventId]?.includes(actions[0].choiceId));
 if(!onlyTalk)reasons.push('需要明确确认的安排或处置');
 return {required:reasons.length>0,reasons,...(reasons.includes('时日将向前')?{timeAdvance:{date:structuredClone(after.date),period:after.weekly?(after.weekly.clock%2?'晚间':'日间'):''}}:{})};
}
