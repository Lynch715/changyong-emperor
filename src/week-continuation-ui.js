import {weekResumptions} from './week.js';
import {NAMES} from './content.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=d=>`${d.year===1?'元':d.year===2?'二':d.year}年${d.month}月${d.day}日`;
export function renderWeekContinuations(s){
 const rows=weekResumptions(s).filter(x=>s.deferred.includes(x.id)||!x.ready||s.turn>x.event.turn);
 if(!rows.length)return '';
 return `<details class="paper-panel settings-section"><summary>还没说完的话 · ${rows.length}</summary>${rows.map(x=>`<article class="entry"><h3>${esc(NAMES[x.actor])} · ${esc(x.title)}</h3><p>${esc(x.reason||'原页还留着，等一个真正坐下来的时辰。')}</p>${x.next?`<p class="quiet-note">${when(x.next.date)}${x.next.period==='day'?'日间':'晚间'}${x.next.remote?'，可以写下边书；送达与回音各有驿程。':x.next.appointment?'可商量入宫约期，尚未替对方答应。':'可核对下一段时辰。'}${x.next.extensionStart?'须先为本季留一周，尚未建立。':''}</p>`:''}<div class="button-row">${x.canDefer?`<button class="text-btn" data-defer="${x.id}">把这句话留待另日</button>`:x.next?.extensionStart?`<button class="text-btn" data-continuation-extend="${x.id}">为这句话留一周</button>`:x.next&&['relation','extension'].includes(x.event.kind)?`<button class="secondary-btn" data-continuation-plan="${x.id}">${x.next.planId?'查看原约期':'商量这次相谈'}</button>`:x.ready?`<button class="secondary-btn" data-event="${x.id}">接着看这页原簿</button>`:''}</div></article>`).join('')}</details>`;
}
