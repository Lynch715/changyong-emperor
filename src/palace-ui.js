import {renderBondAvailability} from './activity-reading.js';
import {CHARACTERS} from './content.js';
import {actorUnlocked,actorPlace,canMeetOn} from './engine.js';
import {FUTURE_MEETINGS} from './week-experience.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderWeeklyPalace(s,{heading,monogram}){
 return `${heading('WITHIN AND BEYOND','宫阙','想说的话、想送的心意，都从这里慢慢商量。')}<div class="palace-tools button-row"><button class="secondary-btn" data-activity-box>匣中新物</button><button class="secondary-btn" data-person-activity="banquet" data-activity-actor="C01" ${s.sealed?'disabled':''}>邀几位故人小坐</button></div><div class="cards-grid palace-directory">${CHARACTERS.map(c=>{
  const unlocked=actorUnlocked(s,c.id),r=s.relations[c.id],remote=c.id==='C03'&&!canMeetOn(s,c.id,s.date),disabled=!unlocked||s.sealed?'disabled':'';
  return `<article class="paper-panel person-card palace-person"><div class="palace-person-heading"><div><small>${esc(c.title)} · ${esc(actorPlace(s,c.id))}</small><h2>${esc(c.name)}</h2></div>${monogram(c)}</div>${unlocked?`<p class="palace-relationship">${esc(r.stage)} · 你的意愿：${esc(r.playerIntent)} · 对方意愿：${esc(r.npcIntent)}</p>`:`<p>${esc(FUTURE_MEETINGS[c.id]||'沿着这一世的时日，等真正相逢。')}</p>`}<div class="palace-actions"><button class="primary-btn" data-person-activity="${remote?'letter':'chat'}" data-activity-actor="${c.id}" ${disabled}>${remote?'写信与话题':'话题与交谈'}</button><button class="secondary-btn" data-person-activity="gift" data-activity-actor="${c.id}" ${disabled}>赠送新物</button><button class="secondary-btn" data-schedule="${c.id}" ${disabled}>邀请与约期</button><button class="text-btn" data-person="${c.id}">人物与往事</button></div>${unlocked?renderBondAvailability(s,c.id):''}</article>`;
 }).join('')}</div>`;
}
