import {EXTENSION_PEOPLE} from './extension-content.js';
import {extensionRelation,extensionWork} from './extension-routes.js';
import {bridgeSummary} from './extension-bridge.js';

// Called only when creating a new ending. Loading/re-reading a saved F00 never
// regenerates its prose, counts, or omissions from the current templates.
export function extensionEnding(s,cid){
 const person=EXTENSION_PEOPLE[cid];if(!person)return '';
 const history=(s.extensionRoutes?.history||[]).filter(h=>h.actor===cid);
 if(!history.length)return bridgeSummary(s,cid);
 const r=extensionRelation(s,cid),has=id=>r.nodes.includes(id),parts=[];
 if(cid==='C09'){
  if(has(person.first))parts.push('碎玉轩的那页诗笺让你想起两种不同的读法，她不必改成与你一样。');
  if(has(person.second))parts.push('后来在碎玉轩，你们又把旧影与私情分开说过；她的原话留在那一幕里。');
  else parts.push('《不作旧影》尚未发生，不能替下一次相谈写下答复。');
  if(r.unresolvedGift)parts.push('暖阁的赏物与两点花费仍有记录，那句回避尚未补谈；合卷没有替你答完。');
  else if(history.some(h=>h.kind==='repair'))parts.push('暖阁曾有的回避没有被删去。后来你实际承认并补谈，旧赏、旧话和新的回答各留在自己的日子。');
  else if(s.events.M11?.completed&&r.identityClarified)parts.push('暖阁里已说清不应以旧人比较；这一句仍不等于双方相爱。');
  else if(!s.events.M11?.completed)parts.push('暖阁新衣的质问尚未发生，旧影没有在卷末被补成已经说清。');
 }else{
  const work=extensionWork(s);
  if(work)parts.push('冬衣份例的疑点署着沈眉庄的名字，原簿已交掌册处复核，正式回执仍未至。她拒绝新增长差，既有职掌另行承办；私人分寸不撤去这份记录。');
  parts.push(has(person.second)?'茶凉的那次，她谈过菊与自己的闲时；那段私话没有变成接差的保证。':'《茶凉仍谈》尚未发生，卷末没有补写那次私下相谈。');
 }
 // Present boundaries take priority over a former yes or an outstanding repair.
 // No cooperation/termination branch implies that she is waiting to resume.
 if(r.playerIntent==='终止恋爱')parts.push('你已明确终止恋爱，当前不再推进亲近。共同经历仍保留，她没有被写成等你回心的人。');
 else if(r.playerIntent==='仅合作')parts.push('当前选择是仅合作，礼遇与各自所做的事照实保留；这是一种完整的分寸，不是一场等待恢复的私情。');
 else if(r.playerIntent==='暂缓')parts.push('你的心意仍暂缓，她也保留自己的决定。没有人被登记为必须等候。');
 else if(r.unresolvedGift)parts.push('愿意靠近仍只是你的意思，旧影与回避须先真实补谈，再听她自己的回答。');
 else if(r.requiresRenewal){
  parts.push(history.some(h=>h.kind==='repair')?'补谈已经发生，信任还须由后来相处兑现，再由她亲自答复。':'你后来表示愿意靠近，先前说清的分寸仍在；新的请求没有自动换来她的同意。');
  if(r.keptWordDate)parts.push('另日的兑现已有记录，尚未发生的重新答复仍空着。');
 }else if(r.playerIntent==='愿发展'&&r.npcIntent==='愿发展')parts.push('两人已亲自答应继续了解，各自仍有不同的意见。此卷写到信任与愿意继续，尚未许下相守。');
 else if(r.npcIntent==='仅合作')parts.push('她当前选择仅合作，礼遇与已有成果照实保留；你的愿望不能代她改口。');
 else if(r.npcIntent==='暂缓')parts.push('她当前仍保留心意，未把这段来往许为恋爱，也不欠一个将来的答应。');
 else parts.push('你愿意了解她，她尚未答应私情；一幕相谈没有在封卷时变成两人的许诺。');
 return person.name+'：'+parts.join('\n\n');
}
