import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import {parseLocal,resolveInput,inputActionCatalog,validateRemoteParse} from '../src/input.js';
import {act,choose,before,reach} from '../scripts/check-s08-06.mjs';
import {exportSave,parseImport} from '../src/storage.js';
const opened=()=>choose(E.createWeeklyGame(),'M01');
const ctx=(state,actor='C02',eventId=null)=>({state,actor,eventId});
const withGift=()=>act(opened(),{type:'activity-buy',giftId:'GF02'});
const military=()=>choose(choose(before.weekly.checkpoints.M10,'M10'),'R03-01');
const relation=()=>choose(before.weekly.checkpoints.M09,'M09');
const fixed=(kind,day,period='evening',extra={})=>({type:'week-plan',kind,actor:'C02',date:{year:1,month:1,day},period,status:'accepted',...extra});
const proposal=c=>({type:'candidate',candidateId:c.id,sourceText:c.sourceText});
const protectedText=s=>({transcripts:s.transcripts,messages:s.messages});

test('组合基线：偏好、问话与军需半额不吞句，确定金额与押运仅按程序结算',()=>{
 const s=military(),h=E.hash(s),p=parseLocal('朕不爱浓茶，为什么要核账？先拨一半，派允祥核账，并押运，暂不公开',ctx(s,'C03','G04'));
 assert.deepEqual(p.segments.map(x=>x.kind),['preference','query']);assert.equal(p.clarifications.length,0);
 assert.deepEqual(p.actions,[{type:'event',eventId:'G04',choiceId:'custom',params:{amount:6,officer:'C26',visibility:'private',escort:true}}]);
 const n=act(s,p.actions),expected=act(s,p.actions[0]);assert.deepEqual(n.stats,expected.stats);assert.equal(n.stats.treasury,s.stats.treasury-8);assert.equal(E.hash(s),h);assert.deepEqual(parseImport(exportSave(n)),n);
});
test('组合基线：假设统摄整句，含赠礼、宴席、秘密也不给候选或偏好',()=>{
 const s=withGift();for(const input of ['如果朕不爱浓茶，明晚送铜制暖手炉给你，后日日间宴请苏培盛和宜修会怎样？','假如我告诉宜修朕重生了，明晚与你散步会如何？']){
  const p=parseLocal(input,ctx(s));assert.equal(p.consultation,true);assert.equal(p.actions.length,0);assert.equal(p.disclosure,undefined);assert.deepEqual(p.segments,[{kind:'query',text:input}]);assert.deepEqual(inputActionCatalog(s,'C02',null,input),[]);
 }
});
for(const input of ['明晚与你散步？','明晚送铜制暖手炉给你?','明日日间宴请苏培盛和宜修？','取消与你的散步？','把与你的散步改到明晚？'])test('裸问号保留咨询：'+input,()=>{
 const s=withGift(),p=parseLocal(input,ctx(s));assert.equal(p.consultation,true);assert.equal(p.actions.length,0);assert.deepEqual(inputActionCatalog(s,'C02',null,input),[]);
});
test('前半问话保留问号，后半预约仍独立解析并必须确认',()=>{
 const s=opened(),p=parseLocal('为什么还要留时辰？明晚与你散步',ctx(s));assert.equal(p.clarifications.length,0);assert.equal(p.segments[0].text,'为什么还要留时辰？');assert.equal(p.actions[0].kind,'walk');assert.equal(E.previewInteraction(s,p.actions).confirmation.required,true);
});
for(const input of ['不要取消与你的散步','不要把与你的散步改到明晚','别撤销与你的散步','先不改期与你的散步'])test('否定更改原约无候选：'+input,()=>{
 const s=act(opened(),fixed('walk',4)),h=E.hash(s),p=parseLocal(input,ctx(s));assert.equal(p.actions.length,0);assert.equal(p.clarifications.length,0);assert.deepEqual(inputActionCatalog(s,'C02',null,input),[]);assert.equal(E.hash(s),h);assert.equal(s.weekly.plans[0].status,'accepted');
});
test('同句赠礼与散步都保留，省略第二项日期追问而不默吞',()=>{
 const s=withGift(),p=parseLocal('明晚送铜制暖手炉给你并陪你散步',ctx(s));assert.equal(p.actions[0].kind,'gift');assert.ok(p.clarifications.some(x=>x.includes('哪一天')));assert.deepEqual(inputActionCatalog(s,'C02',null,'明晚送铜制暖手炉给你并陪你散步'),[]);
});
test('明确日期的送礼与预约组成同一正式核对，预览及取消不动钱物与历史',()=>{
 const s=withGift(),h=E.hash(s),old=structuredClone(protectedText(s)),input='朕不爱浓茶，明晚送铜制暖手炉给你并且后日晚间与你散步',p=parseLocal(input,ctx(s));
 assert.equal(p.clarifications.length,0);assert.deepEqual(p.actions.map(a=>a.kind),['gift','walk']);assert.deepEqual(p.segments.map(x=>x.kind),['preference']);
 const {plan,confirmation}=E.previewInteraction(s,p.actions);assert.equal(confirmation.required,true);assert.equal(E.hash(s),h);assert.deepEqual(protectedText(s),old);
 const n=E.commit(s,plan).state;assert.deepEqual(n.weekly.plans.map(p=>p.kind),['gift','walk']);assert.equal(n.remaining,s.remaining-2);assert.equal(n.stats.treasury,s.stats.treasury);assert.equal(n.weekly.activities.inventory[0].status,'held');assert.deepEqual(protectedText(n),old);assert.deepEqual(parseImport(exportSave(n)),n);assert.deepEqual(E.commit(n,plan).state,n);
});
test('礼物与小宴占三格但预留不扣款；履约才送出真物与收小宴钱',()=>{
 let s=withGift();const old=structuredClone(s.transcripts),p=parseLocal('明晚送铜制暖手炉给你，后日日间清茶小宴宴请苏培盛和宜修',ctx(s));assert.equal(p.clarifications.length,0);
 s=act(s,p.actions);const gift=s.weekly.plans[0],banquet=s.weekly.plans[1],cash=s.stats.treasury;assert.equal(s.remaining,3);assert.equal(banquet.slots,2);assert.equal(banquet.money,2);
 s=reach(s,gift.date,gift.period);s=act(s,{type:'week-fulfill',planId:gift.id});assert.equal(s.weekly.plans[0].status,'completed');assert.equal(s.weekly.activities.inventory[0].status,'given');assert.equal(s.weekly.activities.inventory[0].recipient,'C02');
 s=reach(s,banquet.date,banquet.period);s=act(s,{type:'week-fulfill',planId:banquet.id});assert.equal(s.weekly.plans[1].status,'completed');assert.equal(s.stats.treasury,cash-2);for(const[k,t]of Object.entries(old))assert.deepEqual(s.transcripts[k],t);assert.deepEqual(parseImport(exportSave(s)),s);
});
test('备制再赠不能在物品尚未产出时预支新物',()=>{
 const s=opened(),h=E.hash(s),p=parseLocal('明日日间备制铜制暖手炉，后日晚间送铜制暖手炉给你',ctx(s));assert.ok(p.clarifications.some(x=>x.includes('手中没有')));assert.equal(E.hash(s),h);assert.deepEqual(inputActionCatalog(s,'C02',null,'明日日间备制铜制暖手炉，后日晚间送铜制暖手炉给你'),[]);
});
test('同一新物两次赠送、两个活动同一时段，组合预览整体拒绝且不扣资源',()=>{
 const s=withGift(),h=E.hash(s);for(const input of ['明晚送铜制暖手炉给你，后日晚间送铜制暖手炉给宜修','明晚送铜制暖手炉给你，明晚与你散步']){const p=parseLocal(input,ctx(s));assert.ok(p.clarifications.length,input);assert.deepEqual(inputActionCatalog(s,'C02',null,input),[]);}assert.equal(E.hash(s),h);
});
test('预览后库存或余位改变不能提交旧计划，原正文不回写',()=>{
 const s=withGift(),p=parseLocal('明晚送铜制暖手炉给你，后日晚间与你散步',ctx(s)),plan=E.preview(s,p.actions),changed=act(s,fixed('gift',5,'evening',{itemId:s.weekly.activities.inventory[0].id})),h=E.hash(changed);
 assert.throws(()=>E.commit(changed,plan));assert.equal(E.hash(changed),h);assert.deepEqual(changed.transcripts,s.transcripts);
});
test('多份同类原约可按原日期取消，后续新约一并预览，旧记录保留',()=>{
 let s=act(opened(),[fixed('walk',3),fixed('walk',4)]);const p=parseLocal('取消明日晚间与你的散步，五日晚间与你私聊',ctx(s));assert.equal(p.clarifications.length,0);assert.equal(p.actions[0].planId,s.weekly.plans[0].id);s=act(s,p.actions);assert.deepEqual(s.weekly.plans.map(p=>p.status),['cancelled','accepted','accepted']);
});
test('改期分别读取原时段与新时段，原约仍可追溯',()=>{
 let s=act(opened(),[fixed('walk',3),fixed('walk',4)]);const old=s.weekly.plans[0].id,p=parseLocal('把明日晚间与你的散步改到五日日间',ctx(s));assert.equal(p.clarifications.length,0);assert.equal(p.actions[0].planId,old);assert.equal(p.actions[0].period,'day');assert.equal(p.actions[0].date.day,5);s=act(s,p.actions);assert.equal(s.weekly.plans[0].status,'rescheduled');assert.equal(s.weekly.plans.at(-1).previousId,old);
});
test('与你取消不得指向另一人的唯一原约；缺原日期的同人多约仍澄清',()=>{
 const other=act(opened(),fixed('walk',4,'evening',{actor:'C06'}));assert.ok(parseLocal('取消与你的散步',ctx(other)).clarifications.length);
 const same=act(opened(),[fixed('walk',3),fixed('walk',4)]);assert.ok(parseLocal('取消与你的散步',ctx(same)).clarifications.some(x=>x.includes('原约日期')));
});
test('多人小宴取消按宾客定位，未列出的宾客不偷换',()=>{
 const s=act(opened(),{...fixed('banquet',4,'day'),actor:'C01',guests:['C02','C06'],theme:'tea'});assert.equal(parseLocal('取消苏培盛和宜修的小宴',ctx(s)).actions[0].planId,s.weekly.plans[0].id);assert.ok(parseLocal('取消苏培盛和年世兰的小宴',ctx(s)).clarifications.length);
});
test('关系延期与后续预约可组合，原节点未完成且同一事务需核对',()=>{
 const s=relation(),d=s.date.day+1,input=`改日再谈，${d}日晚间与你散步`,p=parseLocal(input,ctx(s,'C05','R05-01'));assert.equal(p.clarifications.length,0);assert.deepEqual(p.actions.map(a=>a.type),['defer','week-plan']);assert.equal(E.previewInteraction(s,p.actions).confirmation.required,true);const n=act(s,p.actions);assert.ok(n.deferred.includes('R05-01'));assert.equal(n.events['R05-01']?.completed,undefined);assert.deepEqual(n.transcripts,s.transcripts);
});
test('延期征询与明确新约分开：问题不替玩家延期',()=>{
 const s=relation(),p=parseLocal(`改日再谈？${s.date.day+1}日晚间与你散步`,ctx(s,'C05','R05-01'));assert.equal(p.clarifications.length,0);assert.deepEqual(p.actions.map(a=>a.type),['week-plan']);assert.equal(p.segments[0].kind,'query');
});
for(const input of ['朕重生了，明晚与你散步','告诉宜修朕重生了','告诉苏培盛和宜修朕重生了','告诉李卫朕重生了','不要告诉你朕重生了','向宜修坦白朕重生了'])test('秘密对象与组合隔离：'+input,async()=>{
 const s=withGift(),h=E.hash(s);let calls=0;const p=await resolveInput(input,ctx(s),async()=>{calls++;throw Error('不得联网');});assert.equal(p.disclosure,true);assert.equal(p.actions.length,0);assert.ok(p.clarifications.length);assert.equal(calls,0);assert.deepEqual(inputActionCatalog(s,'C02',null,input),[]);assert.equal(E.hash(s),h);
});
test('同一听者明确单独披露仍仅走原正式确认，不自动给其他人事实',()=>{
 const s=opened(),p=parseLocal('告诉苏培盛朕重生了',ctx(s));assert.equal(p.disclosure,true);assert.deepEqual(p.actions,[{type:'disclose',actor:'C02',scope:'full'}]);assert.equal(p.clarifications.length,0);assert.equal(E.previewInteraction(s,p.actions).confirmation.required,true);const n=act(s,p.actions);assert.equal(n.facts.filter(f=>f.id.startsWith('DISCLOSE_')).length,1);assert.deepEqual(n.transcripts,s.transcripts);
});
test('宴席与问话、偏好混合，宾客顺序、主题和私语读者由原规则保留',()=>{
 const s=opened(),p=parseLocal('为什么选清茶？朕不爱浓茶，明日日间清茶小宴宴请宜修和苏培盛',ctx(s));assert.equal(p.clarifications.length,0);assert.deepEqual(p.actions[0].guests,['C06','C02']);assert.deepEqual(p.actions[0].seats,['C06','C02']);assert.equal(p.actions[0].theme,'tea');const n=act(s,p.actions);assert.deepEqual(n.weekly.plans[0].visibleTo,['C01','C06','C02']);assert.equal(n.remaining,s.remaining-2);
});
test('三位已相见宾客有效；外任、未相见与第四位宾客不得越过组合预览',()=>{
 const s=choose(before.weekly.checkpoints.M10,'M10'),p=parseLocal('明日日间清茶小宴宴请苏培盛和宜修和年世兰',ctx(s));assert.equal(p.clarifications.length,0);assert.equal(p.actions[0].guests.length,3);
 assert.ok(parseLocal('明日日间宴请苏培盛和年羹尧',ctx(opened())).clarifications.length);assert.ok(parseLocal('明日日间宴请苏培盛和宜修和年世兰和温实初',ctx(s)).clarifications.length);
});
test('三个子行动合法，第四项必须整组澄清，不能隐去费用或悄悄截断',()=>{
 const s=withGift(),three='明晚送铜制暖手炉给你，后日日间宴请苏培盛和宜修，五日晚间独自学习';assert.equal(parseLocal(three,ctx(s)).clarifications.length,0);const four=three+'，六日晚间独自休养';assert.ok(parseLocal(four,ctx(s)).clarifications.length);assert.deepEqual(inputActionCatalog(s,'C02',null,four),[]);
});
test('模型目录按组合原句逐项绑定，伪造金额、听者和子句均不能改本地行动',()=>{
 const s=withGift(),input='明晚送铜制暖手炉给你，后日晚间与你散步',catalog=inputActionCatalog(s,'C02',null,input),c={...ctx(s),input};assert.equal(catalog.length,2);const raw={segments:[],actions:catalog.map(proposal),clarifications:[]};assert.deepEqual(validateRemoteParse(raw,c).actions,parseLocal(input,ctx(s)).actions);
 for(const bad of [{...proposal(catalog[0]),amount:999},{...proposal(catalog[0]),actor:'C06'},{...proposal(catalog[0]),sourceText:catalog[1].sourceText}])assert.throws(()=>validateRemoteParse({...raw,actions:[bad]},c));
});
test('未知附加命令离线及模型漏项都不执行前半句，偏好仍可独立记住',async()=>{
 const s=withGift(),h=E.hash(s),input='朕不爱浓茶，明晚送铜制暖手炉给你，另外安排李卫赐官';for(const remote of [null,async()=>({segments:[],actions:[],clarifications:[]})]){const p=await resolveInput(input,ctx(s),remote);assert.ok(p.clarifications.length);assert.ok(p.segments.some(x=>x.kind==='preference'));if(!remote)assert.equal(p.actions.length,0);}assert.equal(E.hash(s),h);
});
test('季度旧档仍使用旧约，混合查询不变成周制活动或改写历史',()=>{
 const s=choose(choose(choose(E.createGame(),'M01'),'M02'),'R02-01'),h=E.hash(s),p=parseLocal('朕不爱浓茶，为什么要等明日？明日陪你看灯',ctx(s));assert.equal(p.clarifications.length,0);assert.equal(p.actions[0].type,'promise');assert.equal(E.previewInteraction(s,p.actions).confirmation.required,true);assert.equal(E.hash(s),h);const n=act(s,p.actions);assert.deepEqual(n.transcripts,s.transcripts);assert.deepEqual(parseImport(exportSave(n)),n);
});
test('转述不构成命令，后半明确安排仍保留',()=>{
 const s=opened(),p=parseLocal('听说明晚与你散步，后日日间独自学习',ctx(s));assert.equal(p.clarifications.length,0);assert.deepEqual(p.actions.map(a=>a.kind),['study']);assert.equal(p.segments[0].kind,'chat');
 const money=parseLocal('听说先拨一半并押运，明日晚间独自学习',ctx(military(),'C03','G04'));assert.equal(money.clarifications.length,0);assert.deepEqual(money.actions.map(a=>a.kind),['study']);assert.equal(money.segments[0].kind,'chat');
});
test('宴席不可默丢陌生宾客；原约的两个时段亦须先澄清',()=>{
 const s=act(opened(),fixed('walk',4));assert.ok(parseLocal('明日日间宴请苏培盛和宜修和李卫',ctx(s)).clarifications.some(x=>x.includes('名单')));assert.ok(parseLocal('取消后日日间晚间与你散步',ctx(s)).clarifications.length);
});
test('说话后取消赠礼核对，明确拒绝和偏好保留，礼物与预约均未提交',()=>{
 const s=withGift(),text='朕不爱浓茶，只谈公事，明晚送铜制暖手炉给你',p=parseLocal(text,ctx(s));assert.equal(p.clarifications.length,0);let spoken=E.recordMessage(s,'C02','player',text),source=spoken.messages.at(-1).id;for(const part of p.segments){if(part.kind==='preference')spoken=E.savePreference(spoken,'C02',part.text,source);if(part.kind==='boundary')spoken=E.setBoundary(spoken,'C02',part.intent,source);}const h=E.hash(spoken);assert.equal(E.previewInteraction(spoken,p.actions).confirmation.required,true);assert.equal(E.hash(spoken),h);assert.equal(spoken.relations.C02.playerIntent,'仅合作');assert.ok(spoken.memories.some(m=>m.text==='朕不爱浓茶'));assert.equal(spoken.weekly.plans.length,0);assert.deepEqual(spoken.weekly.activities.inventory,s.weekly.activities.inventory);assert.deepEqual(spoken.transcripts,s.transcripts);
});
