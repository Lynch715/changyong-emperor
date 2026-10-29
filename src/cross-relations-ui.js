import {CROSS_PAIRS,crossHistory,crossStatus} from './cross-relations.js';
import {NAMES} from './content.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCrossRelations(s,cid='C01'){
 const pairs=Object.entries(CROSS_PAIRS).filter(([,p])=>cid==='C01'||p.actors.includes(cid));if(!pairs.length)return '';
 return `<section class="paper-panel settings-section cross-relations"><h2>这一世，各自说过的话</h2><p>认识、心意和承诺要分别听明白。一人的回答，不替另一人作答。</p>${pairs.map(([id,p])=>`<article class="entry"><h3>${p.name}</h3>${p.actors.filter(a=>cid==='C01'||a===cid).map(actor=>{const h=crossHistory(s).find(h=>h.pair===id&&h.actor===actor),status=crossStatus(s,id,actor);return h?`<details><summary>${NAMES[actor]}亲口说 · ${h.date.year}年${h.date.month}月${h.date.day}日</summary><p>当时知情：雍正、${NAMES[actor]}。对方不在场。</p><div class="story-text">${esc(h.text)}</div><small>来源：${p.name} · ${NAMES[actor]}本次亲口说明。重读保留当时原话。</small></details>`:`<p>${NAMES[actor]}这次的回答尚未记录。</p>${status.ready?`<button class="secondary-btn" data-cross-pair="${id}" data-cross-actor="${actor}">分别问${NAMES[actor]}</button><p class="quiet-note">同场接问不重复扣格；另谈核对本人日程与一格安排。</p>`:`<p class="quiet-note">${status.reason}</p>`}`;}).join('')}</article>`).join('')}</section>`;
}
