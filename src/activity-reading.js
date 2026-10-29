import {extensionRelation} from './extension-routes.js';
import {ACTIVITY_TOPICS,BOND_MODES,BANQUET_THEMES,TALK_CHOICES,WALK_PLACES,GROWTH,GIFTS} from './activity-content.js';
import {bondAllowed,itemAvailable} from './activities.js';
import {relationshipRecord} from './relationships.js';
import {relationshipUnlocked} from './relationship-schedule.js';
import {NAMES} from './content.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function activityPresentation(s,cid){
 const r=s.relations[cid]||extensionRelation(s,cid),record=relationshipRecord(s,cid),unlocked=relationshipUnlocked(s,cid);
 const modes=!s.sealed&&unlocked?Object.entries(BOND_MODES).filter(([id])=>bondAllowed(s,cid,id)).map(([id,cfg])=>({id,...cfg})):[];
 const reason=s.sealed?'这一卷已收，原话可以重读。':!unlocked?'还未真正相见，先沿眼前的故事往下走。':r?.playerIntent!=='愿发展'||r?.npcIntent!=='愿发展'?'亲近要听双方此刻的意思；眼下可以照已说清的分寸交谈与办事。':record.requests.some(r=>r.status==='pending')?'有一句心意还在等答复，先照原来的分寸相处。':record.issues.length?'先把尚未说开的原约谈清，再商量亲近。':!modes.length?'还需走到倾心，再商量两个人的亲近。':'可以商量这些相伴；赴约时仍听彼此当下的意思。';
 return {modes,reason,topics:Object.entries(ACTIVITY_TOPICS).map(([id,label])=>({id,label})),stage:r?.stage,playerIntent:r?.playerIntent,npcIntent:r?.npcIntent};
}
export function renderBondAvailability(s,cid){
 const x=activityPresentation(s,cid);
 return `<section class="bond-availability"><h3>两个人的亲近</h3><p>${esc(x.reason)}</p>${x.modes.length?`<p class="bond-modes">${x.modes.map(m=>esc(m.name)).join(' · ')}</p>`:''}<button class="secondary-btn" data-person-activity="bond" data-activity-actor="${cid}" ${x.modes.length?'':'disabled'}>商量亲近相伴</button></section>`;
}
export function availableGiftItems(s,planId=null){return (s.weekly.activities?.inventory||[]).filter(i=>itemAvailable(s,i.id,planId));}
export function activityPlanDetail(s,p){
 const a=p.activity;if(!a)return '';
 if(p.kind==='banquet')return `${BANQUET_THEMES[a.theme]?.name||'小宴'} · 座次：${(a.seats||[]).map(c=>NAMES[c]).join('、')}`;
 if(p.kind==='gift')return '所带新物：'+(s.weekly.activities?.inventory.find(i=>i.id===a.itemId)?.name||'原约中的新物');
 if(p.kind==='craft')return '备制：'+(GIFTS.find(g=>g.id===a.giftId)?.name||'原约中的新物');
 if(p.kind==='bond')return `相伴方式：${BOND_MODES[a.mode]?.name||'原约中的相伴'}${a.paused?'；本次改为安静坐坐':''}`;
 if(GROWTH[p.kind])return GROWTH[p.kind].steps[a.exercise]||'';
 if(['chat','meet','letter','walk'].includes(p.kind))return [p.kind==='walk'?WALK_PLACES[a.place]:null,ACTIVITY_TOPICS[a.topic],TALK_CHOICES[a.choice]].filter(Boolean).join(' · ');
 return '';
}
export function giftInventory(s){
 const book=s.weekly.activities;
 return (book?.inventory||[]).map(item=>{
  const reservation=s.weekly.plans.find(p=>['accepted','executing'].includes(p.status)&&p.activity?.itemId===item.id);
  const receipt=(book.entries||[]).filter(e=>e.kind==='gift-result'&&e.itemId===item.id).at(-1);
  const status=item.status==='given'?'已送给'+(NAMES[item.recipient]||'收礼的人'):item.status==='in-transit'?'正在递送，等实际回执':reservation?'已留给'+(NAMES[reservation.actor]||'原约')+'的约定':'匣中可送';
  return {item,reservation,receipt,status,available:itemAvailable(s,item.id)};
 });
}
export function renderGiftInventory(s){
 const rows=giftInventory(s);
 return rows.length?rows.map(({item,status,receipt})=>`<article class="entry activity-owned-gift"><h3>${esc(item.name)}</h3><p>${esc(status)} · ${item.source.startsWith('BUY')?'采买':'亲手备制'}</p>${receipt?`<p>${esc(receipt.title)}</p><button class="text-btn" data-activity-entry="${esc(receipt.id)}">重读收礼原话</button>`:''}</article>`).join(''):'<p>匣中还没有新物，可先挑选或留一格亲手备制。</p>';
}
// Preserve existing seats still invited, then fill added guests once each.
export function banquetSeatOrder(guests,previous=[]){return [...previous.filter((c,i)=>guests.includes(c)&&previous.indexOf(c)===i),...guests.filter(c=>!previous.includes(c))];}
