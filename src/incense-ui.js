import {ordinal} from './calendar.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=d=>`${d.year===1?'元':d.year===2?'二':d.year}年${d.month}月${d.day}日`;
export function renderIncensePanel(s){
 if(!s.events.M03?.completed||!['sample','explain','quiet'].includes(s.events.M03.outcomeId))return '';
 const c=s.incenseCase;
 if(!c)return s.sealed?'':`<section class="paper-panel"><h3>旧香与那页原簿</h3><p>先前的处置留在旧事里，核对回单尚未接续。${s.events.M03.outcomeId==='quiet'?'原记载没有封样交接，不能拿新香补成旧样。':'可沿原先的留样记载，继续追问原方。'}</p><button class="secondary-btn" data-incense="request">把原簿接着查</button></section>`;
 if(c.shared)return '<details class="paper-panel"><summary>旧香案卷 · 副单已交</summary><p>年世兰已亲自留有副单，原方上尚缺的一行仍待补。</p><button class="text-btn" data-incense="reread">重读核对回单 →</button></details>';
 const ready=ordinal(s.date)>=ordinal(c.request.dueDate);
 return `<section class="paper-panel"><div class="section-header"><h3>${c.review?'原方上，还空着一行':ready?'太医院捎来一页回单':c.sample==='sealed'?'封着的旧香':'停下的旧香与待查原簿'}</h3></div>${c.review?`<p>${c.shared?'年世兰已亲自留有副单。对得上的日期与尚缺的用量，都没有被省去。':'御案已读过回单，那份副单还没交到年世兰手中。可带到下次相见，让她自己看。'}</p><button class="text-btn" data-incense="reread">重读核对回单 →</button>${!c.shared&&!s.sealed?'<button class="secondary-btn" data-incense="share">带上副单，去听她的话</button><p class="quiet-note">同场可接着说；另往按一次安排核对时段。</p>':''}`:`<p>${ready?'回单已经送到。先看它查明了哪几页，也看看还有哪些不能作答。':`太医院接下领用与原方的核对。${when(c.request.dueDate)}，才到收回单的时候。旧香先停着，没查清的也先留着。`}</p>${ready&&!s.sealed?'<button class="secondary-btn" data-incense="review">展开这份回单 →</button>':''}`}</section>`;
}
