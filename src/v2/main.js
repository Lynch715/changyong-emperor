import * as Fiscal from './fiscal.js';
import {askConfirmation} from './dialogs.js';
import {budgetDisplay, affectionChange, monthIncomeText, treasuryExpenseText} from './presentation.js';
import * as F from './family.js';
import {KID_ART} from './art.js';
import {authorOf,POLICIES,policyHostValid} from './government.js';
import {nightIdeas,REST_IDEAS,planAllowed,PLAN_NOTICE} from './plans.js';
import {PORTRAIT_IDS,placeBackground,NIGHT_BG,portraitFile} from './art.js';
import {audienceOf,confirmAge,setTenderness} from './audience.js';
import {GROUPS} from './roster.js';
import {PLACES,DESTINATIONS,SUMMON_ROLES} from './outings.js';
import {moneyText,treasuryIndex} from './economy.js';
// 新版界面：一个状态对象 + 一个 render。点击用 data-act 分发。
import * as E from './engine.js';
import {PEOPLE,CORE,STATS,MONTHS,SEASON,CRISES,GIFTS,GIFT_LINES,TOPICS,TOPIC_LINES,NIGHT_LINES,ENDING_KINGDOM,ENDING_PEOPLE,NAMES,YEAR_NAME,portrait,thumb,bgFor,BG,stageOf,STAGES,AGENDA,ECONOMY,CAST} from './data.js';
import * as AI from './ai.js';
import {LOVER_ENDING} from './romance.js';
import {ENDING_KINGDOM2,ENDING2} from './vol2.js';
import {ENDING_KINGDOM3,ENDING3} from './vol3.js';
import {ACHIEVEMENTS,loadGallery,updateGallery,takeAchievement} from './gallery.js';
import {rivalsOf,friendsOf} from './social.js';
import {BIRTH,BIRTH_LINES} from './festivals.js';
import {FREEDOM,fateText,fatePreview} from './fate.js';
const FATE_SHORT=['今天怎么说都不顺','对方不太买账','如常','对方愿意接你的话','说什么，对方都愿意听'];
const fateLine=f=>f&&!f.free?`<div class="fate t${f.tier}">${esc(fateText(f))}</div>`:'';
const bondName=id=>id==='C05'?'知己':'两情相悦';

const app=document.getElementById('app');
let s=null;            // 存档
let view={name:'title'};
let busy=false;
let activeAchievement = null;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const paras=t=>String(t||'').split(/\n{1,}/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
const statValue=(k,n)=>['treasury','inner'].includes(k)?moneyText(n):n;
const statName=id=>STATS.find(x=>x.id===id)?.name||id;
const nm=id=>F.childById(s,id)?.name||NAMES[id]||PEOPLE[id]?.name||'';
const dateText=st=>`雍正${YEAR_NAME(st.year)}年 · ${MONTHS[st.month-1]}`;
const THUMBS=PORTRAIT_IDS;
const face=id=>THUMBS.has(id)?thumb(id):portrait(id);
const avatar=(id,cls='')=>THUMBS.has(id)?`<picture class="portrait-media"><source type="image/webp" srcset="${portraitFile(id,cls==='portrait'||cls==='person-face'?'mobile':'thumb')}"><img class="${cls}" data-person="${id}" src="${portraitFile(id,cls==='portrait'||cls==='person-face'?'mobile':'thumb','png')}" loading="${cls==='portrait'?'eager':'lazy'}" decoding="async" alt="${esc(nm(id))}"></picture>`:`<span class="avatar ${cls}" aria-label="${esc(nm(id))}">${esc((PEOPLE[id]?.name||nm(id)||'人')[0])}</span>`;
const abs=p=>new URL(p,location.href).href;
const save=()=>{if(!s)return;for(const a of updateGallery(s))E.cele(s,{k:'ach',a});E.save(s);};

// ---------- 反馈：数值与情分变化的小标签 ----------
function chips(stats={},people={},extra=''){
 const a=[];
 for(const[k,v]of Object.entries(stats||{}))if(v)a.push(`<span class="chip ${v>0?'up':'down'}">${statName(k)} ${v>0?'+':'−'}${statValue(k,Math.abs(v))}</span>`);
 for(const[k,v]of Object.entries(people||{}))if(v)a.push(`<span class="chip heart ${v>0?'up':'down'}">${nm(k)} 情分 ${v>0?'+':''}${v}</span>`);
 return a.length||extra?`<div class="chips">${a.join('')}${extra}</div>`:'';
}
const notesHtml=r=>r?.notes?.length?`<div class="notes"><small>宫里传来的话</small>${r.notes.map(n=>`<p>${esc(n)}</p>`).join('')}</div>`:'';
function toast(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2200);}

// ---------- 顶栏 ----------
function header(){
 if(!s)return '';
 const d=s.delta.stats;
 return `<header class="top">
  <div class="date"><b>${dateText(s)}</b><span>${s.life>1?`第${s.life}世 · `:''}${SEASON(s.month)} · ${E.weatherOf(s)}</span></div>
  <div class="stats">${STATS.map(x=>{const v=s.stats[x.id],dd=d[x.id]||0;return `<div class="stat ${v<30?'low':''}" title="${esc(x.hint)}"><span class="sn">${x.name}</span><span class="sv">${statValue(x.id,v)}</span>${dd?`<span class="sd ${dd>0?'up':'down'}">${dd>0?'▲':'▼'}${statValue(x.id,Math.abs(dd))}</span>`:''}<i style="width:${x.id==='treasury'?treasuryIndex(s):x.id==='inner'?Math.min(100,v):v}%"></i></div>`;}).join('')}</div>
 </header>`;
}
function apPips(){return `<span class="pips">${Array.from({length:E.AP_PER_MONTH},(_,i)=>`<i class="${i<s.ap?'on':''}"></i>`).join('')}</span>`;}

// 告诉玩家现在该做什么
function guide(){
 if(s.stats.treasury<200&&!s.agenda.length&&s.ap>0)return `国库只剩 ${moneyText(s.stats.treasury)}。下旨省些用度，或从内帑拨银。还有 ${s.ap} 个时辰。`;
 if(s.agenda.length)return `本月有 ${s.agenda.length} 件要事等你处置。`;
 if(s.ap>0)return `还有 ${s.ap} 个时辰。每件事用一个。`;
 return '今日的时辰用完了。入夜，选一处去。';
}

// ---------- 首页：本月 ----------
// 首页沿用现有卡片；可选旨意始终放在行动按钮上方。
function home() {
  const pending = E.pendingScene(s),
    sc = pending && E.scene(s, pending);
  const people = [
    ...CORE.filter((id) => E.present(s, id) && !E.gone(s, id)),
    ...Object.keys(s.inPalace || {}),
  ];
  const later = CORE.filter((id) => !E.present(s, id) || !s.people[id].met).length;
  return `${header()}<main class="home">
    <div class="guide"><span>${guide()}</span>${apPips()}</div>
    ${
      s.nanfeng?.visit && !s.nanfeng.visit.done
        ? '<button class="night-btn" data-act="go" data-to="nanfeng">回到南风馆，把这盏茶喝完 ›</button>'
        : ''
    }
    ${agendaCard(sc)}${festivalCards()}${openingCard()}${homeActions(sc)}
    <button class="night-btn ${!sc && (s.ap === 0 || s.night) ? 'glow' : ''}"
      data-act="night" ${sc ? 'disabled' : ''}>
      ${
        s.night
          ? '结束这个月 ›<span>今夜已经过了</span>'
          : `入夜 ›<span>${s.ap > 0 && !sc ? `还剩 ${s.ap} 个时辰` : '选一处去，或独寝'}</span>`
      }
    </button>
    <h3 class="sec">身边的人</h3><section class="people">
      ${people.map((id) => personCard(id)).join('')}
      ${later ? `<div class="pc ghost"><b>还有 ${later} 人</b><span>会在往后的日子里出现</span></div>` : ''}
    </section>
    ${budgetLine()}${birthdayCards()}${familyStatus()}${visitCard()}
    <details class="court-details"><summary>朝局详情 ›</summary>
      ${courtOverview()}${crisisCards()}${campaignCard()}
    </details>
  </main>${nav()}`;
}

// 本月要事仍是独立卡片，只有必做事项会锁住日间行动。
function agendaCard(sc) {
  if (!sc) return '';
  const place = sc.location || sc.place;
  return `<button class="agenda" data-act="scene">
    <img src="${face(sc.actor)}" alt="" onerror="this.style.visibility='hidden'">
    <div><small>本月要事 · ${s.agenda.length} 件</small><b>${esc(sc.title)}</b>
      <span>${esc(nm(sc.actor))}${place ? ' · ' + esc(place) : ''}</span></div><em>处置 ›</em>
  </button>`;
}

// 六个行动统一判断是否能办，浏览本身不扣除资源。
function homeActions(sc) {
  const acts = [
    ['chat', '召见'], ['gift', '赏赐'], ['edict', '下旨'],
    ['review', `批折 · ${E.memorialCounts(s).pending}`], ['outing', '微服'], ['rest', '休养'],
  ];
  return `<section class="acts ${sc ? 'locked' : ''}">${acts.map(([id, text]) => {
    const poor = id === 'gift' && s.stats.inner < .01 || id === 'outing' && s.stats.inner < ECONOMY.outingCost;
    const disabled = !E.canAct(s) || id === 'review' && !E.memorialCounts(s).pending || poor;
    return `<button data-act="${id}" ${disabled ? 'disabled' : ''}>
      <b>${text}${poor ? ' · 内帑不足' : ''}</b></button>`;
  }).join('')}</section>`;
}

// 生辰提醒不改变原来的庆生入口与效果。
function birthdayCards() {
  return E.birthdays(s).map(id => {
    const done = E.birthdayDone(s, id);
    return `<div class="visit bday ${done ? 'done' : ''}">${avatar(id)}<div>
      <small>生辰 · ${done ? '你记得' : '本月'}</small><b>${PEOPLE[id].name}的生辰</b>
      <span>${done ? '贺过了。' : '召见、赏赐或夜里去看看，都算记得。整月不去，情分会掉。'}</span>
    </div></div>`;
  }).join('');
}

// 来访卡仍可免费迎进来，保持人物原有的文字。
function visitCard() {
  const visit = E.visitOf(s);
  if (!visit) return '';
  return `<button class="visit" data-act="visit"><img src="${face(visit.id)}" alt=""><div>
    <small>有人来了 · 不占时辰</small><b>${PEOPLE[visit.id].name}来看你</b>
    <span>${esc(visit.title)}</span></div><em>迎进来 ›</em></button>`;
}

// 朝局的各个查看入口共用一段展示，不改变实际政务。
function courtOverview() {
  return `<h3 class="sec">局势 · <button class="gov-link" data-act="go" data-to="provinces">地方 ›</button></h3>
    <button class="gov-link" data-act="go" data-to="memorials">奏报与已收回报 ›</button>
    <p>派系声势：${Object.entries(s.factions).map(([name, value]) => `${name} ${value}`).join(' · ')}</p>
    <button class="gov-link" data-act="go" data-to="secrets">御览密折 · ${s.secrets.filter(m => !m.done).length}</button>
    ${s.month === 12 ? '<button class="gov-link" data-act="go" data-to="assessment">腊月考绩 ›</button>' : ''}
    <p class="small">盛世还须：至少两项新政完成、十省平均吏治达到60且无省低于45、待办原折不超过六道。</p>`;
}

// 要务卡仍按原有步骤和期限显示进展。
function crisisCards() {
  const cards = E.ALL_CRISES.filter(crisis => crisis.vol === (s.vol || 1)).map(crisis => {
    const status = E.crisisStatus(s, crisis);
    if (status === 'later') return '';
    const done = crisis.scenes.filter(id => s.done[id]).length;
    const goal = crisis.goal && status === 'open' && GOAL_TEXT[crisis.id] ?
      ` · ${GOAL_TEXT[crisis.id](s.stats)}` : '';
    const label = {open: '进行中', solved: '已了结', failed: '没办好'}[status];
    return `<div class="crisis ${status}"><b>${crisis.name}</b><em>${label}</em><p>${esc(crisis.desc)}</p>
      <div class="bar"><i style="width:${done / crisis.scenes.length * 100}%"></i></div>
      <small>${done}/${crisis.scenes.length} 步${goal} ·
        期限 ${YEAR_NAME(crisis.deadline[0])}年${MONTHS[crisis.deadline[1] - 1]}</small></div>`;
  }).join('');
  return `<h3 class="sec">要务</h3><section class="crises">${cards || '<p class="muted">眼下还没有。</p>'}</section>`;
}

// 节庆先于可选朝政卡显示，不办也不会挡住召见或入夜。
function festivalCards() {
  if (s.night || s.ended) return '';
  return E.optionalFestivalIds(s)
    .map((id) => {
      const sc = E.scene(s, id);
      return `<section class="opening-card festival-card"><small>本月可选 · 不占时辰</small>
      <h3>${esc(sc.title)}</h3><p>选一个人同过，或全家一起。不想去也不妨事。</p>
      <button data-act="festival-open" data-id="${id}">去过节 ›</button></section>`;
    })
    .join('');
}

// 正月可选的小事醒目显示，是否办理由玩家决定。
function openingCard() {
  const decree = E.openingDecree(s);
  if (!decree) return '';
  return `<section class="opening-card">
    <small>正月可选 · 不占时辰</small><h3>${esc(decree.title)}</h3>
    <p>${esc(decree.text)}</p><p>国库 −10 万两 · 民心 +3</p>
    <button data-act="opening-edict" ${!s.done.M01 || s.agenda.length || s.stats.treasury < 10 ? 'disabled' : ''}>
      拨银赈济</button></section>`;
}
function campaignCard(){
 const c=E.campaignInfo(s),upcoming=E.upcomingStories(s);
 const when=value=>{const [year,month]=String(value).split('-').map(Number);return `${YEAR_NAME(year)}年${MONTHS[month-1]||''}`;};
 return `<section class="campaign-card"><b>${esc(c.title)}</b><p>${c.continuing?'三十年主线已回顾，宫中岁月仍可沿月历继续。':'三十年主线 · 岁时照常，人物与宫廷故事择月展开。'}</p><details><summary>待续故事 · ${upcoming.length} 件</summary><p class="small">普通事宜可暂缓，急灾、军情和岁时照常呈报。故事按先后和人物处境展开，已做过的选择不会重来。</p>${upcoming.slice(0,8).map(x=>`<div class="story-preview"><b>${esc(x.title)}</b><span>${esc(x.status)} · ${esc(when(x.earliest))}起${x.latest?`，建议在${esc(when(x.latest))}前处理；逾期优先呈报且不能再暂缓`:''}</span></div>`).join('')||'<p class="small">眼下没有待续事宜，仍可安排日常。</p>'}${upcoming.length>8?'<p class="small">其余故事会随岁月和前事逐渐展开。</p>':''}</details></section>`;
}
const GOAL_TEXT={deficit:x=>`国库 ${moneyText(x.treasury)}/600 万两`,eight:x=>`朝局 ${x.court}/55`,reform:x=>`民心 ${x.people}/60 · 国库 ${moneyText(x.treasury)}/470 万两`,border:x=>`朝局 ${x.court}/50`,tusi:x=>`民心 ${x.people}/55`,body:x=>`圣躬 ${x.health}/45`};
// 人物卡分别显示现有情分和本月变化，颜色沿用原有的涨跌配色。
function personCard(id, act = 'person') {
  const p = s.people[id], stage = E.affectionStage(s, id), next = STAGES.find(([n]) => n > p.aff);
  const lo = STAGES.filter(([n]) => p.aff >= n).at(-1)[0], hi = next ? next[0] : 100;
  const delta = s.delta.people[id] || 0;
  let badge = '';
  if (p.knot) badge = '<em class="knot">心结</em>';
  else if (E.hasStory(s, id)) badge = '<em class="ready">有话想说</em>';
  else if (E.birthdayOf(s, id) && !E.birthdayDone(s, id)) badge = '<em class="ready">生辰</em>';
  else if (E.away(s, id)) badge = '<em class="away">在外</em>';
  else if (p.lover) badge = `<em class="lover">${bondName(id)}</em>`;
  return `<button class="pc" data-act="${act}" data-id="${id}">${avatar(id)}
    <div><b>${PEOPLE[id].name}${p.met ? badge : '<em class="no">未见</em>'}</b>
      <span>${stage} · ${p.aff}${delta ? `<i class="${delta > 0 ? 'up' : 'down'}">${affectionChange(delta)}</i>` : ''}</span>
      <div class="bar"><i style="width:${(p.aff - lo) / (hi - lo) * 100}%"></i></div>
    </div></button>`;
}
function nav(){return `<nav class="bottom"><button data-act="go" data-to="home" class="${view.name==='home'?'on':''}">本月</button><button data-act="go" data-to="people" class="${view.name==='people'?'on':''}">人物</button><button data-act="go" data-to="gallery" class="${['gallery','replay'].includes(view.name)?'on':''}">珍藏</button><button data-act="go" data-to="log" class="${view.name==='log'?'on':''}">起居注</button><button data-act="go" data-to="settings" class="${view.name==='settings'?'on':''}">设置</button></nav>`;}

// ---------- 场景 ----------
// 可选节庆可以随时合上，选择后的数值和人物回话仍走原来的结果页。
function sceneView() {
  if (view.loading)
    return `<div class="stage" style="--bg:url('${abs(BG.desk)}')"><article class="paper">
    <h2>回报送到了</h2><p class="muted wait">张廷玉正把各地的折子一份份摞在案上……</p></article></div>`;
  const sc = E.scene(s, view.id);
  if (!sc) return home();
  const place = sc.location || sc.place || '',
    r = view.result;
  const defer = E.canDeferScene(s, sc.id)
    ? `<div class="story-defer">
    <button data-act="story-defer" data-id="${sc.id}">过些时候再谈 · 最早下月</button>
    <p class="small">不占时辰，最多暂缓三次；最早下月起另择月份再呈。建议期限后优先呈报且不能再暂缓，
      原事与已做过的选择都会保留。</p></div>`
    : '';
  return `<div class="stage" style="--bg:url('${abs(bgFor(place))}')"><div class="stage-top">
    ${E.optionalFestivalIds(s).includes(view.id) ? '<button data-act="go" data-to="home">‹ 先忙别的</button>' : ''}
    <span>${dateText(s)}</span><span>${esc(place)}</span></div>
    ${sc.actor ? avatar(sc.actor, 'portrait') : ''}<article class="paper"><h2>${esc(sc.title)}</h2>
    ${
      r
        ? `<div class="choice">你选择：${esc(r.choice)}</div>${paras(r.text)}
      ${
        r.echo
          ? `<blockquote class="echo"><b>${esc(nm(r.actor))}</b>${esc(r.echo)}</blockquote>`
          : r.echoWait
            ? '<p class="muted wait">……</p>'
            : ''
      }
      ${chips(r.stats, r.people, r.knot ? `<span class="chip knot">${nm(r.knot)} 心里有了结</span>` : '')}
      ${r.knot ? `<p class="hint">心结未解时，${nm(r.knot)}的情分不会再涨。召见时可以“说开那件事”。</p>` : ''}
      <button class="primary" data-act="scene-next">继续</button>`
        : `${paras(sc.body)}<div class="options">${E.optionsFor(s, sc)
            .map((o) => `<button data-act="pick" data-opt="${o.id}">${esc(o.label)}</button>`)
            .join('')}</div>${defer}`
    }
    </article></div>`;
}
// ---------- 召见 / 赏赐：先选人 ----------
function pickPerson(kind){
 const ids=CAST.filter(id=>E.present(s,id)&&(s.people[id].met||(!PEOPLE[id].secondary&&kind==='chat')));
 return `${header()}<main class="pick"><div class="bar-title"><button data-act="go" data-to="home">‹ 返回</button><b>${kind==='chat'?'召见谁？':'赏给谁？'}</b></div>
  <section class="people">${ids.map(id=>personCard(id,kind==='chat'?'chat-with':'gift-to')).join('')}</section>
  <p class="muted center">${kind==='chat'?(E.away(s,'C03')&&ids.includes('C03')?'人在外地的，只能写信。':'每次召见最多说六句。说到心坎上，情分涨得多。'):'送对了心头好，情分 +6；寻常的 +2；同样的东西再送，只 +1；送到讨厌的，情分 −3。'}</p></main>`;
}

// 在第一次亲口说话之前说明掷骰与加减点，已经掷过则沿用本次结果。
function chatView() {
  const c = view.chat, id = c.id, p = PEOPLE[id], st = s.people[id];
  const ai = AI.aiMode() !== 'off', used = c.topics || [], left = Math.max(0, 6 - c.turns);
  return `<div class="stage chat" style="--bg:url('${abs(bgFor(E.placeOf(s, id)))}')">
    <div class="stage-top"><button data-act="chat-end">‹ 告退</button>
      <span>${c.letter ? '书信 · ' : ''}${esc(E.placeOf(s, id))}</span>
      <span class="pill">${E.affectionStage(s, id)} ${st.aff}${c.gained ? ` <i class="up">+${c.gained}</i>` : ''}</span>
    </div>${avatar(id, 'portrait')}<article class="paper talk">
      <h2>${p.name}<small>${E.titleOf(s, id)}${st.knot ? ' · 心结：' + esc(st.knot.text) : ''}</small></h2>
      <div class="msgs" id="msgs">${c.msgs.map(m => `<div class="msg ${m.who}${m.tier != null ? ' fate t' + m.tier : ''}">
        ${m.who === 'npc' ? `<b>${p.name}</b>` : ''}${esc(m.text)}
        ${m.d != null && m.who === 'npc' ? `<span class="md ${m.d > 0 ? 'up' : m.d < 0 ? 'down' : ''}">
          ${m.mood ? esc(m.mood) + ' · ' : ''}${m.d > 0 ? '情分 +' + m.d : m.d < 0 ? '情分 ' + m.d : '情分不变'}
        </span>` : ''}</div>`).join('')}
        ${busy ? `<div class="msg npc typing"><b>${p.name}</b>……</div>` : ''}</div>
      ${left > 0 ? `<div class="topics">
        ${st.knot ? `<button data-act="repair" class="repair" ${busy ? 'disabled' : ''}>
          说开「${esc(st.knot.text)}」那件事</button>` : ''}
        ${TOPICS.map(t => `<button data-act="topic" data-t="${t.id}" ${used.includes(t.id) || busy ? 'disabled' : ''}>
          ${t.label}</button>`).join('')}</div>
        ${ai ? `${c.fate ? '<p class="fate-preview">本次沿用刚才的骰面，不再重掷。</p>' : `<p class="fate-preview">亲口说话时，${esc(fatePreview(s, 'chat', id))}</p>`}
          <form class="say" data-act="say"><input name="t" maxlength="120"
            placeholder="${c.letter ? '写几句给远方的人……' : '想对' + p.name + '说什么？'}"
            autocomplete="off" ${busy ? 'disabled' : ''}><button ${busy ? 'disabled' : ''}>说</button></form>
          <p class="muted small">还能说 ${left} 句。真诚的话打动人，敷衍和冒犯也会被记住。</p>` :
          '<p class="muted small">接入 AI 后可以随意说话。现在只能从上面挑话题。</p>'}` :
        '<p class="muted center">该说的都说了。</p>'}
      <button class="primary" data-act="chat-end">告退</button>
    </article></div>`;
}

function giftView(){
 const id=view.id,p=PEOPLE[id],known=s.known?.[id]&&!Array.isArray(s.known[id])?s.known[id]:{};
 if(view.result){const r=view.result;return `<div class="stage" style="--bg:url('${abs(bgFor(E.placeOf(s,id)))}')">${avatar(id,'portrait')}<article class="paper"><h2>赏${p.name}</h2><div class="choice">${esc(GIFTS[r.gift].name)}${r.disliked?' · 不合心意':r.liked&&!r.repeat?' · 正合心意':r.repeat?' · 送过了':''}${r.birthday?' · 生辰贺礼':''}</div>${paras(r.text)}${chips(r.stats,r.people,r.knot?'<span class="chip knot">心结未解，情分没有涨</span>':'')}${notesHtml(r)}<button class="primary" data-act="done">好</button></article></div>`;}
 return `${header()}<main class="pick"><div class="bar-title"><button data-act="gift">‹ 换人</button><b>赏${p.name}什么？</b></div>
 <section class="gifts">${Object.entries(GIFTS).map(([g,x])=>`<button data-act="give" data-g="${g}" ${s.stats.inner<x.innerCost||(x.inventory&&!s.inventory.length)?'disabled':''}><b>${x.category?'〔'+x.category+'〕':''}${x.name}${x.inventory?'（'+s.inventory.length+'）':''}${known[g]===true?' <em>♥</em>':known[g]===false&&p.dislikes.includes(g)?' <em class="no">不喜欢</em>':''}</b><span>${x.innerCost?'内帑 −'+moneyText(x.innerCost):'不花钱'}${s.stats.inner<x.innerCost?' · 内帑不足':''}</span></button>`).join('')}</section>
 <p class="muted center">送过一次，就知道${p.name}喜不喜欢了（♥）。</p></main>`;
}

// ---------- 下旨 ----------
const PRESET_EDICTS=[
 {title:'减膳节用',text:'宫中用度减三成，从朕的御膳减起。',effects:{treasury:5,palace:-2,health:-1},narration:'旨意一下，御膳房先撤了一半的菜。各宫的份例也跟着减了。有人私下抱怨，可看见皇上自己的桌上只剩四个菜，也就不好再说什么。几个月下来，内务府省下了一笔不小的银子。'},
 {title:'开恩科',text:'今岁加开恩科，广纳寒门之士。',effects:{court:4,treasury:-3,people:1},narration:'恩科的消息传出去，各省的读书人都动了起来。考场里坐满了人，有白发的老秀才，也有十几岁的少年。放榜那天，有一半的新科进士出身寒门。'},
 {title:'赦免轻罪',text:'京畿牢狱中，轻罪者一律释放回家。',effects:{people:4,court:-2},narration:'几百个犯人走出了牢门，有的人在门口就跪下磕头。刑部的几位老臣连上了三道折子，说这样下去法度要乱。百姓却都说，新皇上是个心软的。'}
];
function policiesHtml(){return `<section class="policies"><h3>新政</h3><p>先在人物页任命地方官，再选试点和主持人。启动或改派用一个时辰、十二万两；每月六万两推进，离任或缺银则暂停；完成后每项每月一万两维持，按季改善地方。火耗试河南，摊丁试直隶，改流限云贵；名单为空时，先任命该地官员。</p>${Object.entries(POLICIES).map(([id,c])=>{const p=s.policies[id];return `<article class="crisis"><b>${c.name} · ${p.progress}/100</b><p>${c.desc}</p><p>${p.host?nm(p.host)+' · '+p.pilot:'尚未指定主持人'} · ${p.progress>=100?'推广完成':p.progress>=35?'推广中':'试点中'}</p>${p.progress<100?`<form data-act="policy" data-id="${id}"><label>试点与主持人<select name="host">${Object.keys(s.provinces).flatMap(province=>Object.keys(s.appointments).filter(host=>policyHostValid(s,id,host,province)).map(host=>`<option value="${host}|${province}">${esc(province)} · ${nm(host)}</option>`)).join('')}</select></label><button ${!E.canAct(s)?'disabled':''}>${p.active?'改派主持人':'下旨推行'}</button></form>`:''}</article>`;}).join('')}</section>`;}
function secretsView(){return `${header()}<main class="government"><button data-act="go" data-to="home">‹ 返回</button><h2>密折 · 御览</h2><p>此处情报尚待核实。留存与训示不占时辰，查办两个月后回报。</p>${s.secrets.map(m=>`<article class="crisis"><h3>${nm(m.author)} · ${esc(m.province)}</h3>${paras(m.body)}${m.done?`<p>已${{keep:'留存',warn:'朱批训示',investigate:'交查'}[m.done]}</p>`:[['keep','留存'],['warn','朱批训示'],['investigate','据此查办']].map(([choice,label])=>`<button data-act="secret" data-id="${m.uid}" data-choice="${choice}">${label}</button>`).join('')}</article>`).join('')||'<p>尚无密折。</p>'}</main>`;}
function assessmentView(){return `${header()}<main class="government"><button data-act="go" data-to="home">‹ 返回</button><h2>腊月 · 京察大计</h2><p>京官京察、外官大计，在游戏中统一为每年腊月考绩。任内变化自任命或上次考绩计算，升降须有职缺。</p>${E.assessmentRows(s).map(r=>`<article class="crisis"><b>${nm(r.id)} · ${r.title}</b><p>能力 ${r.ability} · 忠诚 ${r.loyalty}</p><p>${esc(r.change)}</p>${r.done?'<p>本年已考</p>':`<button data-act="assess" data-id="${r.id}" data-decision="stay">留任</button>${E.assessmentOptions(s,r.id).map(o=>`<button data-act="assess" data-id="${r.id}" data-decision="${o.decision}" data-office="${o.office}" ${o.reason?'disabled':''}>${{promote:'升',demote:'降',dismiss:'罢'}[o.decision]} · ${o.title}${o.reason?'（'+esc(o.reason)+'）':''}</button>`).join('')}`}</article>`).join('')}</main>`;}
// 首页银账压成一句话，点击后查看完整账目。
function budgetLine() {
  const f = budgetDisplay(s);
  return `<button class="budget-line" data-act="go" data-to="finance">
    本月进 ${moneyText(f.income)} · 出 ${moneyText(f.outgo)} · 月底预计 ${moneyText(f.expected)}
  </button>`;
}

// 明细只在理财页展开，开局未办过的零值经营和新政不占篇幅。
function budgetCard() {
  const f = budgetDisplay(s), count = E.memorialCounts(s);
  return `<section class="budget-card"><div><b>户部银账</b>
    <button data-act="go" data-to="finance">理财与收支 ›</button></div>
    <p>本月已入 ${moneyText(f.income)} · 已出 ${moneyText(f.outgo)}</p>
    <p>月底常例 ${moneyText(f.base)} · 地方浮动 ${f.province >= 0 ? '+' : '−'}${moneyText(Math.abs(f.province))}
      ${f.showProjects ? ` · 经营进项 ${moneyText(f.projects)}` : ''}</p>
    <p class="small">月底军政 ${moneyText(f.publicOutgo)}
      ${f.showPolicy ? `；新政预留最多 ${moneyText(f.policy)}` : ''}${f.arrears ? `；旧欠 ${moneyText(f.arrears)}` : ''}。
      官职浮动另计，未批折子与临时用度尚未扣除。
      ${count.waiting ? `另有 ${count.waiting} 道已交查勘，不算未批积压。` : ''}</p></section>`;
}
function financeView(){const f=Fiscal.forecast(s),collection=Fiscal.collectionInfo(s),last=s.fiscal.lastReport,can=E.canAct(s)&&!s.night;return `${header()}<main class="finance-page"><div class="bar-title"><button data-act="go" data-to="home">‹ 返回御案</button><b>户部理财</b></div>${budgetCard()}<p>查看不占时辰。理财安排各用一个时辰；先办完月初要事，再安排人手。银子实际解到才入库，不向百姓临时加派。</p><h3 class="sec">稳定进项</h3><p class="muted small">两项经营各有三级，每月最多安排一项，下个月办妥后按月解库。</p>${Fiscal.projectOptions(s).map(o=>`<article class="fiscal-project"><h3>${esc(o.name)} · ${o.level}/3 级</h3><p>${esc(o.description)}</p><p>当前每月 ${moneyText(o.monthly)}${o.pending?`；正在办理第 ${o.pending.level} 级，下月见效`:o.level<3?`；办妥后每月 ${moneyText(o.nextMonthly)}`:'；已完成整顿'}</p><button data-act="fiscal-invest" data-id="${o.id}" ${!can||o.reason?'disabled':''}>${o.reason?esc(o.reason):`${o.level?'继续整顿':'着手办理'} · 国库 ${moneyText(o.cost)} · 1 时辰`}</button></article>`).join('')}<h3 class="sec">催解旧欠</h3><article class="fiscal-project"><p>这批账面旧欠尚有 ${moneyText(collection.pool)}。每三个月最多催解一次，实际到账后扣减欠额，不能反复领取。</p><p>${s.fiscal.collectionPending?`已经催解 ${moneyText(s.fiscal.collectionPending.amount)}，待下月到账。`:`本次可核定 ${moneyText(collection.amount)}，下月解库。`}</p><button data-act="fiscal-collect" ${!can||collection.reason?'disabled':''}>${collection.reason?esc(collection.reason):'催解一批 · 不另花银 · 1 时辰'}</button></article>${publicWorksCard(can)}<h3 class="sec">上月银账</h3>${last?`<article class="fiscal-project"><h4>${YEAR_NAME(last.year)}年${MONTHS[last.month-1]}</h4><p>常例税银 ${moneyText(last.base)} · 地方浮动 ${last.province>=0?'+':'−'}${moneyText(Math.abs(last.province))} · 户部任职浮动 ${last.office>=0?'+':'−'}${moneyText(Math.abs(last.office))} · 理财进项 ${moneyText(last.projects)}</p><p>新政实付 ${moneyText(last.policySpent)} · 军政及补欠 ${moneyText(last.publicOutgo)}</p><p>全月总入 ${moneyText(last.ledger.in)} · 总出 ${moneyText(last.ledger.out)} · 结余 ${moneyText(last.balance)}</p><p class="small">总入、总出还包括当月剧情、朱批、追缴到账和理财立项，以上常例不可重复相加。</p></article>`:'<p>尚未结算过一个月。到月末会列出实际收支。</p>'}</main>${nav()}`;}
function publicWorksCard(can){if(s.year<7)return '';const info=Fiscal.publicWorksInfo(s);return `<h3 class="sec">地方修缮</h3><article class="fiscal-project public-works"><p>修缮一省仓渠与学舍：国库 ${moneyText(info.cost)}，用一个时辰，每三个月最多安排一次。当地民生 +4、吏治 +2。</p><p class="small">这是可选公共投入，按实际拨银入账。</p><label>修缮省份<select aria-label="修缮省份" ${!can||info.reason?'disabled':''}>${info.provinces.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select></label><button data-act="fiscal-works" ${!can||info.reason?'disabled':''}>${info.reason?esc(info.reason):'拨银修缮 · 1 时辰'}</button></article>`;}
function provincesView(){return `${header()}<main class="government"><button data-act="go" data-to="home">‹ 返回御案</button><h2>地方</h2><p>十省等权汇入民心与朝局，财赋影响月度国库进账。数值是游戏抽象，江南、陕甘、云贵按督辖区合列。</p>${Object.entries(s.provinces).map(([name,p])=>`<article class="crisis"><h3>${esc(name)} · ${esc(authorOf(s,name)?nm(authorOf(s,name)):'地方衙门')}</h3><p>民生 ${p.livelihood} · 吏治 ${p.integrity} · 财赋 ${p.revenue}</p>${p.reports.map(t=>`<p class="small">${esc(t)}</p>`).join('')||'<p class="muted">尚无回报。</p>'}</article>`).join('')}</main>`;}
// 展开折匣时保留本时辰额度，尚未落笔时说明何时扣时辰。
function memorialView() {
  const r = s.reviewSession;
  const counts = E.memorialCounts(s);
  return `${header()}<main class="government">
    <button data-act="go" data-to="home">‹ 合上折匣</button>
    <h2>折匣 · ${counts.pending} 道待批</h2>
    <p>另有 ${counts.waiting} 道正在查勘，原折保留，等勘报回来再裁。</p>
    <p>急灾排在最前。查核只查清楚，办事还要另拨银子。</p>
    ${s.memorials.some(m => m.result) ? '<button data-act="archive-reports">收存待阅回报（不占时辰）</button>' : ''}
    <details><summary>已收回报 · ${s.govReports.length}</summary>
      ${s.govReports.slice(-12).reverse().map(m => `<p>${esc(m.body)}</p>`).join('') || '<p>尚无。</p>'}
    </details>
    <p>${r?.charged ? `本时辰还可批 ${r.left} 道；留中也算一道。合上再开不另扣时辰。` :
      '浏览不占时辰，第一次落笔才用一个时辰。'}</p>
    ${view.feedback ? paras(view.feedback) : ''}
    ${s.memorials.map(m => {
      const allowed = r?.left && !r.held.includes(m.uid) && !s.night && (r.charged || E.canAct(s));
      return `<article class="crisis"><h3>${esc(m.title)}</h3>
        <small>${esc(m.author)} · ${esc(m.province)} · ${esc(m.type)}</small>${paras(E.memorialBody(m))}
        ${m.inspectionPending ? '<p class="small">正在查勘，未批执行经费。急灾仍须先行赈救。</p>' :
          m.inspected ? '<p class="small">勘报已回，执行经费待裁。</p>' : ''}
        <div class="options">${E.memorialOptions(m).map(([id, label]) => {
          const cost = E.memorialCost(m, id);
          return `<button data-act="memorial" data-id="${m.uid}" data-choice="${id}" ${allowed ? '' : 'disabled'}>
            ${esc(label)}${cost ? ' · 国库' + cost + '万两' : ''}</button>`;
        }).join('')}</div>
        ${AI.aiMode() !== 'off' && allowed ? `<form data-act="memorial-write" data-id="${m.uid}">
          <p class="fate-preview">${esc(fatePreview(s, 'edict'))}</p>
          <label>亲笔批<textarea name="t" maxlength="200" required></textarea></label>
          <button ${busy ? 'disabled' : ''}>${busy ? '候回报……' : '朱批'}</button></form>` : ''}
      </article>`;
    }).join('')}</main>`;
}
// 用印前列出本次骰子的朝局加减点，结果页只显示一次骰面。
function edictView() {
  const r = view.result, ai = AI.aiMode() !== 'off';
  if (r) return `<div class="stage" style="--bg:url('${abs(BG.court)}')"><article class="paper">
    <h2>${esc(r.title || '旨意')}</h2><div class="choice">朱批：${esc(r.src)}</div>${fateLine(r.fate)}
    ${paras(r.text)}${chips(r.stats, r.people)}<button class="primary" data-act="done">好</button></article></div>`;
  return `<div class="stage" style="--bg:url('${abs(BG.desk)}')"><div class="stage-top">
    <button data-act="go" data-to="home">‹ 收起</button><span>养心殿御案</span></div><article class="paper">
      <h2>亲笔下旨</h2>${policiesHtml()}
      <form class="transfer" data-act="transfer"><h4>拨银</h4>
        <p>国库 ${moneyText(s.stats.treasury)} · 内帑 ${moneyText(s.stats.inner)}</p>
        <p class="small">与下旨一样，用一个时辰。拨进内帑，朝局 −2；充入国库，民心 +2。</p>
        <label>从哪里拨<select name="direction"><option value="toInner">国库 → 内帑</option>
          <option value="toTreasury">内帑 → 国库</option></select></label>
        <label>万两<input name="amount" type="number" min="0.01" step="0.01" value="10" required></label>
        <button class="primary">拨银</button></form>
      ${ai ? `<p class="muted">写下你想办的事，任何事都可以。它会怎样落地，有什么代价，由天下来回答。</p>
        <p class="fate-preview">${esc(fatePreview(s, 'edict'))}</p>
        <form class="edict" data-act="decree"><textarea name="t" maxlength="200" rows="4"
          placeholder="例如：在京城设十处粥厂，入冬前施粥三月。" ${busy ? 'disabled' : ''}></textarea>
          <button class="primary" ${busy ? 'disabled' : ''}>${busy ? '旨意正在传下去……' : '用印'}</button></form>
        <p class="muted small">举几个例子：</p>` : '<p class="muted">没有接入 AI，只能从拟好的旨意里选一道。</p>'}
      <div class="options">${PRESET_EDICTS.map((e, i) => `<button data-act="${ai ? 'fill' : 'preset'}"
        data-i="${i}" ${busy ? 'disabled' : ''}>${esc(e.text)}</button>`).join('')}</div>
    </article></div>`;
}

function outingsView(){return `${header()}<main><div class="bar-title"><button data-act="go" data-to="home">‹ 返回</button><b>微服去哪里？</b></div><p class="muted">选好去处才用时辰。这里的花费都走内帑。</p><section class="places">${Object.entries(PLACES).map(([id,p])=>`<button data-act="travel" data-id="${id}" ${!E.canAct(s)||s.stats.inner<p.cost?'disabled':''}><img class="place-thumb" src="${placeBackground(id,s.month,'thumb')}" loading="lazy" decoding="async" alt="${p.name}"><b>${p.name}</b><span>${p.desc}</span><small>内帑 ${moneyText(p.cost)}${s.stats.inner<p.cost?' · 内帑不足':''}</small><small>${p.hint}</small></button>`).join('')}</section></main>`;}
// 入馆和留宿的价钱分别写清，已经付过的入馆费不重复收取。
function nanfengView() {
  const choices = [['N02', '听雨汐弹琵琶、唱曲'], ['N01', '和花妍下棋、说话'], ['tea', '只喝茶听曲']];
  return `${header()}<main class="nanfeng-hall" style="--place-bg:url('${abs(placeBackground('nanfeng-interior', s.month))}')">
    <h3 class="sec">南风馆 · 灯下</h3><p>今夜不问姓名，只听一曲，或下一局棋。</p><section class="places">
      ${choices.filter(([id]) => !s.freed[id]).map(([id, label]) =>
        `<button data-act="company" data-id="${id}">${label}</button>`).join('')}
      ${['N02', 'N01'].filter(id => !s.freed[id] && s.people[id].aff >= 36 && !s.night).map(id =>
        `<button data-act="nanfeng-stay" data-id="${id}">留宿，今夜陪${nm(id)}（内帑 3 万两）</button>`).join('')}
    </section><p class="muted small">入馆的银子已付过。坐定后，这一回便结束。</p></main>`;
}

// ---------- 白天的小结果（微服、休养） ----------
// 免费可选事项办完直接回御案，不触发普通行动结束后的随机插曲。
function resultView() {
  const r = view.result;
  return `<div class="stage" style="--bg:url('${abs(r.bg || BG.garden)}')">
    ${r.id ? `<img class="portrait" src="${portrait(r.id)}" alt="">` : ''}
    <article class="paper"><h2>${esc(r.title)}</h2>${fateLine(r.fate)}${paras(r.text)}${chips(r.stats, r.people)}
      <button class="primary" data-act="${r.optional ? 'go' : 'done'}" data-to="home">好</button>
    </article></div>`;
}

// ---------- 夜 ----------
const ideasHtml=(ideas,target)=>`<div class="plan-ideas">${ideas.map((t,i)=>`<button data-act="plan-idea" data-target="${target}" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
function restView(){const ai=AI.aiMode()!=='off';return `${header()}<main class="plan-page"><div class="bar-title"><button data-act="go" data-to="home">‹ 返回</button><b>今天想怎么歇？</b></div>
 ${busy?'<p class="wait">窗外的风慢了下来……</p>':`${ai?`${ideasHtml(REST_IDEAS,'restPlan')}<label for="restPlan">今天想怎么歇？</label><textarea id="restPlan" maxlength="200" rows="5" placeholder="写下安排，最多200字">${esc(view.draft||'')}</textarea><label for="restCompanion">请谁作陪？</label><select id="restCompanion"><option value="">独自歇着</option>${E.restCompanions(s).map(id=>`<option value="${id}" ${view.companion===id?'selected':''}>${esc(nm(id))}</option>`).join('')}</select><p class="muted small">安排会先掷骰，一档不掷。最多花内帑3万两；若没有收到回话，就照常歇着。</p><button class="primary" data-act="rest-plan">就这样歇一日</button>`:'<p>把门关上，留一日给自己。</p>'}<button data-act="rest-default">照常歇着</button>`}</main>`;}
// 写下夜间安排前先说明骰子与情分加减点，留空时仍按原有夜间流程。
function nightView() {
  const background = E.stayOf(s) ? placeBackground('nanfeng-interior', s.month) : NIGHT_BG;
  if (view.result) {
    const r = view.result;
    return `<div class="stage night" style="--bg:url('${abs(background)}')">${r.id ? avatar(r.id, 'portrait') : ''}
      <article class="paper"><h2>${r.id ? E.placeOf(s, r.id) + ' · 夜' : '独寝'}</h2>
        ${fateLine(r.fate)}${paras(r.text)}${chips(r.stats, r.people)}${notesHtml(r)}
        <button class="primary" data-act="month-end">天亮了 ›</button></article></div>`;
  }
  if (s.night && !busy && !s.agenda.length) return `<div class="stage night" style="--bg:url('${abs(background)}')">
    <article class="paper"><h2>今夜已经过了</h2><p>天快亮了。</p>
      <button class="primary" data-act="month-end">结束这个月 ›</button></article></div>`;
  const list = E.nightChoices(s), ai = AI.aiMode() !== 'off', id = view.id || E.stayOf(s);
  let family = '';
  if (id && F.isMother(id)) {
    const status = s.pregnancy[id] ? '已有孕期记录，本夜不会重复判定。' :
      id === 'C07' && !s.flags.stop_huanyi ? '欢宜香尚未停用，不会受孕。' : F.chance(s, id) > 0 ?
        `本夜可能有孕（约 ${Math.round(F.chance(s, id) * 100)}%），一至两个月后复诊报喜。` : '目前不会触发生育。';
    family = `<p class="muted small">生育意愿：${wishLabel(s.people[id].wish)}。${status}</p>`;
  }
  return `<div class="stage night" style="--bg:url('${abs(background)}')"><div class="stage-top">
    ${busy ? '<span></span>' : '<button data-act="go" data-to="home">‹ 再等等</button>'}
    <span>${dateText(s)} · 夜</span></div><article class="paper plan-page">
      <h2>${id ? '今夜陪着' + nm(id) : '今夜去哪里？'}</h2>${family}
      ${busy ? '<p class="muted center wait">灯一盏一盏亮起来……</p>' : id ? `
        ${ai ? `${ideasHtml(nightIdeas(id), 'nightPlan')}
          <label for="nightPlan">今夜想和${esc(nm(id))}做些什么？</label>
          <textarea id="nightPlan" maxlength="300" rows="5" placeholder="可以不写，最多300字">${esc(view.draft || '')}</textarea>
          <p class="fate-preview">写下安排时，${esc(fatePreview(s, 'night', id))}留空就照往常过。</p>` :
          '<p>灯已经点上了，过去坐坐吧。</p>'}
        <button class="primary" data-act="night-go" data-id="${id}">过去看看</button>
        <button data-act="night-select" data-id="">再选一处</button>` : `
        <section class="people">${list.map(person => `<button class="pc" data-act="night-select" data-id="${person.id}">
          ${avatar(person.id)}<div><b>${PEOPLE[person.id].name}
            ${person.special ? '<em class="ready">有话想说</em>' : person.knot ? '<em class="knot">心结</em>' : ''}</b>
            <span>${E.placeOf(s, person.id)} · ${stageOf(s.people[person.id].aff)}</span></div></button>`).join('')}
          <button class="pc" data-act="night-go" data-id=""><div><b>独寝</b><span>一个人睡，圣躬 +3</span></div></button>
        </section><p class="muted small">“有话想说”的人，今夜会有一段新剧情。</p>`}
    </article></div>`;
}

// ---------- 月末 ----------
// 月报只列实际收支与变化，国库支出下面紧跟能够对账的用途。
function summaryView() {
  const r = view.report, next = s.ended ? 0 : s.agenda.length;
  return `<div class="stage" style="--bg:url('${abs(BG.desk)}')"><article class="paper summary">
    <h2>${YEAR_NAME(r.y)}年${MONTHS[r.m - 1]} · 月末</h2>
    ${(r.govNotes || []).map(note => `<p>${esc(note)}</p>`).join('')}
    ${r.publicArrears ? `<p class="small">军政尚欠 ${moneyText(r.publicArrears)}，下月进账后优先补欠。</p>` : ''}
    <h4>这个月</h4>${monthIncomeText(r) ? `<p class="small">${esc(monthIncomeText(r))}</p>` : ''}
    ${chips(r.stats, r.people) || '<p class="muted">风平浪静。</p>'}
    <p class="muted small">国库：进 ${moneyText(r.ledger.treasury.in)}，出 ${moneyText(r.ledger.treasury.out)}，
      余 ${moneyText(r.balances.treasury)}</p>
    ${treasuryExpenseText(r) ? `<p class="expense-detail">${esc(treasuryExpenseText(r))}</p>` : ''}
    <p class="muted small">内帑：进 ${moneyText(r.ledger.inner.in)}，出 ${moneyText(r.ledger.inner.out)}，
      余 ${moneyText(r.balances.inner)}</p>
    ${r.missingYou?.length ? `<p class="missing-you">谁在想你：${r.missingYou.map(nm).join('、')}。
      下个月记得去看看，或写封信；再不相见，情分会淡一点。</p>` : ''}
    ${r.cooled.length ? `<p class="muted small">${r.cooled.map(nm).join('、')}这个月没见到你，情分淡了一点。</p>` : ''}
    ${r.forgot?.length ? `<p class="muted small">${r.forgot.map(nm).join('、')}的生辰，你没有去。情分 −3。</p>` : ''}
    ${r.crises.filter(crisis => crisis.status !== 'later').map(crisis => `<div class="crisis mini ${crisis.status}">
      <b>${crisis.name}</b><em>${{open: '进行中', solved: '已了结', failed: '没办好'}[crisis.status]}</em></div>`).join('')}
    ${s.ended ? `<button class="primary" data-act="ending">
      ${s.year >= 30 ? '三十年回顾' : `${YEAR_NAME(s.year)}年岁末 · 阶段回顾`} ›</button>` : `
      <h4>下个月</h4><p>${dateText(s)}${next ? `，有 ${next} 件要事。` : '，暂无要事。'}</p>
      ${E.birthdays(s).length ? `<p class="new">下个月是${E.birthdays(s).map(nm).join('、')}的生辰。</p>` : ''}
      ${CORE.filter(id => E.present(s, id) && !s.people[id].met && PEOPLE[id].from[0] === s.year &&
        PEOPLE[id].from[1] === s.month).map(id =>
        `<p class="new">新面孔：${PEOPLE[id].name}（${PEOPLE[id].title}）</p>`).join('')}
      <button class="primary" data-act="go" data-to="home">进入${MONTHS[s.month - 1]} ›</button>`}
  </article></div>`;
}

// ---------- 结局 ----------
function endingView(){
 if(s.year>=7)return longEndingView();
 const vol=s.vol||1,v2=vol>=2,K=[ENDING_KINGDOM,ENDING_KINGDOM2,ENDING_KINGDOM3][vol-1];
 const e=E.ending(s),low=Math.min(treasuryIndex(s),...['people','court','palace','health'].map(k=>s.stats[k])),k=K.find((x,i)=>e.score>=x.min&&!(i===0&&(low<40||!e.governmentReady))&&!(i===1&&low<20))||K.at(-1);
 const text=p=>{if(p.gone)return '年羹尧在狱中。他托人带出一句话：臣不怨皇上。只是这一句话，比怨更让你睡不着。';if(vol===3)return ENDING3[p.id][p.tier];if(v2)return ENDING2[p.id][p.tier];return p.tier===3?LOVER_ENDING[p.id]:ENDING_PEOPLE[p.id][Math.min(p.tier,2)];};
 const label=p=>p.gone?'狱中':p.tier===3?(p.id==='C05'?'知己':'相守'):stageOf(p.aff);
 return `<div class="stage" style="--bg:url('${abs(BG.court)}')"><article class="paper ending">
  <small>雍正${['二','四','六'][vol-1]}年 · 岁末</small><h2>${k.title}</h2>${paras(k.text)}
  <div class="chips">${STATS.map(x=>`<span class="chip">${x.name} ${statValue(x.id,s.stats[x.id])}</span>`).join('')}<span class="chip">了结要务 ${e.solved}/3</span></div>
  <h4>他们</h4>
  ${e.people.map(p=>`<div class="end-p"><img src="${face(p.id)}" alt=""><div><b>${PEOPLE[p.id].name} · ${label(p)}</b><p>${esc(text(p))}</p></div></div>`).join('')}
  ${vol===3?`<p class="muted center">第三卷完。往后还有新政、用人和宫中故事。</p>${E.canContinueCampaign(s)?'<button class="primary" data-act="family-continue">进入七年至十年 · 改命成局 ›</button>':''}<p class="muted small center">三十年主线继续展开，存档、情分与皇嗣出生记录全部延续。</p><button class="primary" data-act="rebirth">再活一世 ›</button><p class="muted small center">带着一样记忆，回到雍正元年正月。</p><button data-act="new-confirm" class="plain">从头再来</button>`
   :`<p class="muted center">第${vol===2?'二':'一'}卷完。</p><button class="primary" data-act="${vol===2?'vol3':'vol2'}">进入第${vol===2?'三卷：雍正五年':'二卷：雍正三年'} ›</button><p class="muted small center">存档、情分和他们记得的事，都会带过去。</p><button data-act="rebirth" class="plain">再活一世</button> <button data-act="new-confirm" class="plain">从头再来</button>`}
 </article></div>`;
}
function longEndingView(){
 const c=E.campaignInfo(s),e=E.ending(s),final=s.year>=30;
 const title=final?'三十年 · 改命之后':'岁月有回声';
 const text=final?'当年醒来时，你只想着挽回眼前的人。三十年过去，奏折里的名字换过几轮，宫中的旧物也添了新的磨痕。你留下的决定，有的见了成效，有的仍待料理。回顾到此，日子并不就此停住。':'这一段岁月走过了。新政的成效、地方的难处，还有人与人之间的信任，都留下了痕迹。你可以把账册合上一晚，再接着往前走。';
 const personText=p=>p.gone?'此人的旧事仍记在册中，往日的决定没有被抹去。':s.people[p.id]?.knot?'这段关系还有未说开的心结，往后的日子仍有机会认真面对。':p.tier===3?'这些年彼此记得，也愿意在寻常日子里相伴。':p.tier===2?'多年相处，已经有些话能够坦然说起。':p.tier===1?'相识的旧事仍在，往后如何相处，还由你们决定。':'各自过着日子，相逢时依旧按礼问安。';
 return `<div class="stage" style="--bg:url('${abs(BG.court)}')"><article class="paper ending"><small>${dateText(s)} · ${final?'主线回顾':'阶段回顾'}</small><h2>${title}</h2>${paras(text)}<p class="muted small">${esc(c.title)}</p><div class="chips">${STATS.map(x=>`<span class="chip">${x.name} ${statValue(x.id,s.stats[x.id])}</span>`).join('')}</div><h4>这些年身边的人</h4>${e.people.map(p=>`<div class="end-p"><img src="${face(p.id)}" alt=""><div><b>${esc(nm(p.id))} · ${p.gone?'旧事':p.tier===3?(p.id==='C05'?'知己':'相守'):stageOf(p.aff)}</b><p>${esc(personText(p))}</p></div></div>`).join('')}${s.children?.length?`<h4>皇嗣近况</h4>${s.children.map(child=>`<p>${esc(child.name)} · ${F.childAge(s,child)}岁 · 生母${esc(nm(child.mother))}。${esc(child.notes?.at(-1)||'成长与读书的近况仍按月记录。')}</p>`).join('')}<p class="small">所有皇嗣均按未成年人保护，仅有家庭、读书与考校内容。</p>`:'<p>宫中没有新增皇嗣，也不妨碍这一段人生完整走过。</p>'}${E.canContinueCampaign(s)?`<button class="primary" data-act="family-continue">${final?'继续宫中岁月 · 不限年数':`接续${YEAR_NAME(c.nextYear||s.year+1)}年`} ›</button>`:''}<p class="muted small center">${final?'三十年主线已回顾。日常、节庆、地方事务与皇嗣教育仍可继续。':'已完成的选择保留，下一阶段的故事将择月呈报。'}</p><button data-act="rebirth">再活一世 ›</button><button data-act="new-confirm" class="plain">从头再来</button></article></div>`;
}

// ---------- 再活一世 ----------
function rebirthView(){
 const past=E.pastHearts(s);
 return `<div class="stage" style="--bg:url('${abs('assets/exports/s11-v1/cover-display.webp')}')"><article class="paper rebirth">
  <small>第${(s.life||1)+1}世</small><h2>再活一世</h2>
  <p>你又一次醒在雍正元年的正月。这一回，你能带走一样东西。</p>
  ${past.length?`<p class="muted small">这些人，会对你有一种说不清的似曾相识：</p><div class="past">${past.map(id=>`<span>${avatar(id)}${PEOPLE[id].name}${s.people[id].lover?' ♥':''}</span>`).join('')}</div>`:'<p class="muted small">上一世没有谁对你动过心。这一回，也许会不一样。</p>'}
  <div class="options">${Object.entries(E.BOONS).map(([k,b])=>`<button data-act="boon" data-b="${k}"><b>${b.name}</b><br><span class="small">${b.desc}</span></button>`).join('')}</div>
  <p class="muted small center">珍藏和成就都会留着。这一世的存档会被新的一世替换。</p>
  <button class="plain" data-act="ending">再想想</button>
 </article></div>`;
}

// ---------- 人物 / 起居注 / 设置 ----------
const wishLabel=w=>({open:'愿意考虑',later:'暂缓',no:'不生育'})[w]||'愿意考虑';
function familyStatus(){const ids=Object.keys(s.pregnancy||{}).filter(id=>s.pregnancy[id].known||s.pregnancy[id].fake);return ids.length?`<section class="family-status"><h3 class="sec">宫中近况</h3>${ids.map(id=>{const p=s.pregnancy[id];return `<div class="card"><b>${esc(nm(id))} · ${p.fake?'待复核传闻':'有喜'}</b><p>${p.fake?'还没有确认真实孕期。温实初可复核，传闻不会生成孩子。':`预期 ${esc(p.due)}，照护 ${p.care}，风险 ${p.risk}。安胎每月一次，可用一个时辰或内帑一万两。`}</p>${!p.fake?careButtons(id):''}</div>`;}).join('')}</section>`:'';}
function careButtons(id){const p=s.pregnancy[id],blocked=s.ended||s.night||s.agenda.length||s.pendingBirth||s.familyArt?.required||p.caredAt===E.monthKey(s);return `<button data-act="family-care" data-id="${id}" ${blocked||s.ap<1?'disabled':''}>安胎 · 1 时辰</button> <button data-act="family-care" data-id="${id}" data-pay="yes" ${blocked||s.stats.inner<1?'disabled':''}>安胎 · 内帑 1 万两</button>`;}
function motherControls(id){const p=s.people[id],preg=s.pregnancy[id];return `<section class="card"><h3>商量生育</h3><p>本人意愿：${wishLabel(p.wish)}。商量花一个时辰，每月一次。她会按自己的性格与情分答复；愿意考虑也可以再改为暂缓或不生育。没有孩子，原有关系线照样完整。</p><div class="family-actions">${[['open','商量迎接孩子'],['later','商量暂缓'],['no','商量不生育']].map(([wish,label])=>`<button data-act="family-wish" data-id="${id}" data-wish="${wish}" ${!E.canAct(s)||E.away(s,id)||E.gone(s,id)?'disabled':''}>${label}</button>`).join('')}<button data-act="family-tonic" data-id="${id}" ${!E.canAct(s)?'disabled':''}>请温实初调养 · 1 时辰</button>${id==='C07'&&!s.flags.stop_huanyi?`<button data-act="family-stop" ${!E.canAct(s)?'disabled':''}>停用欢宜香 · 1 时辰</button>`:''}</div>${preg?`<p>${preg.fake?'假孕传闻待复诊，不计真实孕期。':preg.known?`孕期从 ${esc(preg.start)} 记起，预期 ${esc(preg.due)}。照护 ${preg.care}，风险 ${preg.risk}。`:'起居已记录，尚未复诊确认。'}</p>${preg.known&&!preg.fake?careButtons(id):''}`:''}</section>`;}
function childrenSection(){return `<section class="children-section"><h3 class="sec">皇嗣 · ${(s.children||[]).length}</h3><p class="muted small">全部皇嗣按未成年人保护，只安排亲情、读书和节庆日常。</p>${s.children.length?s.children.map(c=>{const age=F.childAge(s,c),stage=F.childStage(s,c),pic=KID_ART[c.art[stage]];return `<article class="child-card">${pic?`<img src="${pic.mobile}" alt="${esc(pic.description)}">`:'<div class="kid-empty">少年立绘待选</div>'}<div><h3>${esc(c.name)} · ${c.sex==='男'?'皇子':'公主'}</h3><p>生母：${esc(nm(c.mother))} · ${age}岁 · 未成年<br>出生：${esc(c.born)}${E.childBirthdays(s).some(x=>x.id===c.id)?' · 本月生辰':''}</p><p>近况：${esc(c.notes.at(-1)||'平安成长')}</p>${c.traits.length?`<p>性情：${c.traits.map(esc).join('、')}</p>`:''}<button data-act="kid-art-open" data-id="${c.id}">更换${stage==='infant'?'婴儿':'少年'}立绘</button>${age>=10?`<button data-act="kid-study" data-id="${c.id}" data-kind="read" ${!E.canAct(s)?'disabled':''}>读书 · 1 时辰</button><button data-act="kid-study" data-id="${c.id}" data-kind="quiz" ${!E.canAct(s)?'disabled':''}>考校 · 1 时辰</button>`:''}</div></article>`;}).join(''):'<p>尚无皇嗣。生育由本人意愿决定，不必为此赶进度。</p>'}</section>`;}
function familyWizard(){const b=s.pendingBirth,c=s.familyArt&&F.childById(s,s.familyArt.child),stage=b?'infant':F.childStage(s,c),sex=b?.sex||c.sex,chosen=view.kidArt&&KID_ART[view.kidArt],pics=Object.values(KID_ART).filter(p=>p.stage===stage&&p.sex===sex);return `<div class="family-wizard"><article class="paper"><small>${b?'宫中添喜':'皇嗣立绘'} · ${esc(dateText(s))}</small><h2>${b?b.name?`为${esc(b.name)}挑选婴儿立绘`:'给孩子取名':`${esc(c.name)} · ${F.childAge(s,c)}岁`}</h2>${b&&!b.name?`<p>${esc(nm(b.mother))}诞下${sex==='男'?'皇子':'公主'}。取名后，再挑一张婴儿立绘。</p><form data-act="kid-name"><label for="kidName">名字</label><input id="kidName" name="t" maxlength="12" autocomplete="off" placeholder="输入名字"><button class="primary">就用这个名字</button></form><div class="family-actions">${F.nameIdeas(sex).map(n=>`<button data-act="kid-name-idea" data-name="${n}">${n}</button>`).join('')}</div>`:`<p>点击缩略图可放大预览，再确认。当前图库：${stage==='infant'?'婴儿':'十岁起的少年'} · ${sex==='男'?'皇子':'公主'}。</p>${pics.some(pic=>pic.placeholder)?'<p class="muted small">当前图库含姓名牌占位，正式立绘待补。</p>':''}<div class="kid-art-grid">${pics.map(pic=>`<button data-act="kid-art-preview" data-art="${pic.id}" aria-pressed="${chosen?.id===pic.id}"><img src="${pic.thumb}" alt="${esc(pic.description)}"><span>${esc(pic.description)}</span></button>`).join('')}</div>${chosen&&pics.includes(chosen)?`<div class="kid-preview"><img src="${chosen.mobile}" alt="${esc(chosen.description)}"><p>${esc(chosen.description)}${chosen.placeholder?' · 占位图':''}</p><button class="primary" data-act="kid-art-confirm">确认这张立绘</button></div>`:'<p>请先点选一张图。</p>'}${s.familyArt&&!s.familyArt.required?'<button data-act="kid-art-cancel">返回人物页</button>':''}`}</article></div>`;}
function familyResult(fn){try{const r=fn();save();go({name:'result',result:r});}catch(e){toast(e.message);}}
function peopleView(){
 const id=view.id;
 if(id){const p=PEOPLE[id],st=s.people[id],known=likedList(id);return `${header()}<main class="person"><div class="bar-title"><button data-act="go" data-to="people">‹ 人物</button><b>${p.name}</b></div>
  <div class="person-hero">${avatar(id,'person-face')}<div><h2>${p.name}</h2><p>${E.titleOf(s,id)} · ${E.placeOf(s,id)}</p><p class="small">${p.category||'故人'} · 能力 ${st.ability}/10 · 忠诚 ${st.loyalty}/100 · ${esc(st.faction)}</p>${p.desc?`<p class="small">${esc(p.desc)}</p>`:''}<p class="big">${E.affectionStage(s,id)} <b>${st.aff}</b></p>
   <div class="stages">${STAGES.map(([n,t])=>`<span class="${st.aff>=n?'on':''}">${p.secondary?({0:'生疏',25:'相识',45:'信任',65:'亲近',85:'深信'})[n]:t}</span>`).join('')}</div>
   ${st.knot?`<p class="knot-line">心结：${esc(st.knot.text)}。召见时说开它。</p>`:''}
   ${st.lover?`<p class="ready-line">${bondName(id)}</p>`:''}
   ${E.hasStory(s,id)?`<p class="ready-line">有话想对你说。${E.away(s,id)?'会有书信来。':'今夜去看看。'}</p>`:st.first&&!st.second&&st.aff<45?'<p class="muted small">情分到「相知」后，会有新的剧情。</p>':st.second&&!st.third&&st.aff<65?'<p class="muted small">情分到「倾心」后，还有一段剧情。</p>':st.third&&!st.fourth&&s.year>=E.RELATION_PACING.fourthYear&&st.aff<75?'<p class="muted small">情分到 75，还会有一段剧情。</p>':st.fourth&&!st.fifth&&s.year>=E.RELATION_PACING.fifthYear&&st.aff<80?'<p class="muted small">情分到 80，还有最后一段剧情。</p>':''}
   ${(()=>{const rel=[...rivalsOf(id).map(x=>`<span class="rel bad">与${PEOPLE[x].name}不和</span>`),...friendsOf(id).map(x=>`<span class="rel good">与${PEOPLE[x].name}亲近</span>`)];return rel.length?`<p class="rels">${rel.join('')}</p>`:'';})()}
   ${BIRTH[id]||p.birth?`<p class="muted small">生辰：${MONTHS[(BIRTH[id]||p.birth)-1]}</p>`:''}<p class="muted small">喜欢：${known.length?known.map(g=>GIFTS[g].name).join('、'):'还不知道'}</p></div></div>
  <div class="person-actions"><button data-act="chat-with" data-id="${id}" ${!E.canAct(s)||E.gone(s,id)?'disabled':''}>${E.away(s,id)?'写信':'召见'}</button>${E.summonRoles(s,id).length&&!s.inPalace?.[id]&&s.freed?.[id]?.destination!=='home'?`<button data-act="summon-open" ${!E.canAct(s)||E.summonReason(s,id)?'disabled':''} title="${esc(E.summonReason(s,id))}">召入宫</button>`:''}${E.appointmentOptions(s,id).length?`<button data-act="appoint-open" ${!E.canAct(s)||E.gone(s,id)?'disabled':''}>任命 / 调整位分</button>`:''}</div>
  ${F.isMother(id)?motherControls(id):''}
  <h3 class="sec">任命旧事</h3><ul class="mem">${(s.appointmentHistory[id]||[]).slice().reverse().map(a=>`<li><small>${YEAR_NAME(a.year)}年${MONTHS[a.month-1]}</small>${esc(a.from?a.from+' → '+a.to:a.to)}<br><small>${esc(a.source)}</small></li>`).join('')}</ul>
  <h3 class="sec">${p.name}记得的事</h3>
  <ul class="mem">${st.memories.slice().reverse().map(m=>`<li><small>${YEAR_NAME(m.y)}年${MONTHS[m.m-1]}</small>${esc(m.text)}</li>`).join('')||'<li class="muted">还没有。</li>'}</ul>${view.appoint?appointmentDialog(id):''}${view.summon?summonDialog(id):''}${E.summonRoles(s,id).length&&E.summonReason(s,id)&&!s.inPalace?.[id]?`<p class="muted small">召入宫：${esc(E.summonReason(s,id))}</p>`:''}</main>${nav()}`;}
 return `${header()}<main><h3 class="sec">人物</h3>${childrenSection()}${Object.entries(GROUPS).map(([name,categories])=>{const ids=CAST.filter(id=>categories.includes(PEOPLE[id].category)&&E.present(s,id)&&s.people[id].met);return `<details class="people-group" open><summary>${name} · ${ids.length}</summary><section class="people">${ids.map(id=>personCard(id)).join('')||'<p class="muted">还没有相识的人。</p>'}</section></details>`;}).join('')}</main>${nav()}`;
}
function summonDialog(id){return `<dialog class="appointment-modal" open aria-label="召${esc(nm(id))}入宫"><button data-act="summon-close">收起</button><h3>召${esc(nm(id))}入宫</h3><p class="muted small">${s.freed?.[id]?'已赎身，不再花赎金。':'先替其赎身，内帑 15 万两。'}用掉一个时辰。</p>${E.summonRoles(s,id).map(r=>`<button data-act="summon" data-id="${id}" data-role="${r.key}"><b>${esc(r.name)}</b><br><span class="small">${esc(r.desc)}</span></button>`).join('')}</dialog>`;}
function appointmentDialog(id){return `<dialog class="appointment-modal" open aria-label="为${esc(nm(id))}安排职司"><button data-act="appoint-close">收起</button><h3>${esc(nm(id))} · 任命</h3><p>每次用一个时辰。满员时，先腾出空位。</p><div class="options">${E.appointmentOptions(s,id).map(o=>`<button data-act="appoint" data-id="${id}" data-office="${o.office}" ${o.reason?'disabled':''}>${o.title}${o.reason?`<small> · ${esc(o.reason)}</small>`:''}</button>`).join('')}</div></dialog>`;}
function logView(){
 const items=s.log.slice().reverse();
 return `${header()}<main><h3 class="sec">起居注</h3><ul class="log">${items.map(l=>`<li><small>${YEAR_NAME(l.y)}年${MONTHS[l.m-1]}</small><em>${l.kind}</em>${esc(l.text)}</li>`).join('')||'<li class="muted">还没有记录。</li>'}</ul></main>${nav()}`;
}
function settingsView() {
  const m = AI.aiMode();
  const status = m === 'server' ? '已连接本机的 AI 服务。' :
    m === 'byok' ? '正在使用你填写的 API。' : '未开启。召见只能挑话题，旨意只能选拟好的。';
  return `${header()}<main class="settings"><h3 class="sec">设置</h3>
    <div class="card"><b>成人描写</b><label class="audience-toggle">
      <input type="checkbox" data-pref="tenderness" ${audienceOf().tenderness ? 'checked' : ''}> 直白描写亲密场景</label>
      <p>夜里、休养作陪、与恋人私下召见时，AI 可以直白描写两人的亲密。
        仅限后宫、恋人与南风馆两位，宗室、太后、大臣不在内；人物始终可以婉拒。
        需要你用的 AI 服务允许这类内容，否则会自动退回固定文字。关掉后回到含蓄写法。</p></div>
    <div class="card"><b>AI 对话</b><p>不同服务的写法会有差别；若没有收到可用的回话，就用固定文字继续。</p>
      <p>${status}</p>${AI.aiError() ? `<p class="muted small">上次出错：${esc(AI.aiError())}</p>` : ''}
      <button data-act="ai-toggle">${m === 'off' ? '尝试开启 AI' : '关闭 AI，改用固定文字'}</button></div>
    ${m !== 'server' ? apiConnectionForm() : ''}
    ${s ? freedomSettings() : ''}
    <div class="card"><b>存档</b><p>每个动作后自动保存在这台设备的浏览器里。</p>
      ${s ? '<button data-act="new-confirm">重新开始</button> ' : ''}
      <button data-act="title">回到标题</button></div>
  </main>${s ? nav() : ''}`;
}

// 密钥保存方式就近说明，读出的已存配置只用于填表。
function apiConnectionForm() {
  const c = AI.savedConnection();
  return `<form class="card api" data-act="api"><b>使用自己的 API</b>
    <p class="small">默认 DeepSeek。密钥只存在这台设备的浏览器里，不进存档。</p>
    <label>地址<input name="url" value="${esc(c.url)}"></label>
    <label>模型<input name="model" value="${esc(c.model)}"></label>
    <label>密钥<input name="key" type="password" placeholder="${c.key ? '已保存，留空不改' : 'sk-……'}" autocomplete="off"></label>
    <label class="chk"><input type="checkbox" name="remember" aria-describedby="remember-key-hint" checked> 记住在这台设备上</label>
    <p class="small muted" id="remember-key-hint">密钥会以明文保存在本浏览器。</p>
    <button ${busy ? 'disabled' : ''}>${busy ? '正在测试……' : '测试并启用'}</button></form>`;
}

// 设置页列出原有三档自由度及当前选择。
function freedomSettings() {
  const levels = [1, 2, 3].map(l => `<button data-act="freedom" data-l="${l}" class="${E.freedomOf(s) === l ? 'on' : ''}">
    <b>${l} 档 · ${FREEDOM[l].name}</b><span>${FREEDOM[l].desc}</span></button>`).join('');
  return `<div class="card freedom"><b>自由度</b><p>决定 AI 推演听不听你的。
    下旨、召见时亲口说的话、夜里的第一句会用到。没开 AI 时不起作用。</p>${levels}</div>`;
}
function ageView(){return `<div class="title-screen" style="--bg:url('${abs(BG.desk)}')"><div class="title-box"><h1>入卷之前</h1><p>本游戏含成熟题材，仅供年满 18 周岁者游玩。</p><button class="primary" data-act="age-confirm">我已年满 18 周岁</button><button data-act="age-leave">离开</button>${view.left?'<p class="small">已停在此处。你可以关闭这个页面。</p>':''}</div></div>`;}
// 标题页保留开局入口，把详细的批折规则放在可展开的玩法说明里。
function titleView() {
  const loaded = E.load(), has = !!loaded;
  const campaign = (loaded?.life > 1 ? `第${loaded.life}世 · ` : '') +
    (loaded ? E.campaignInfo(loaded).title : '三十年主线，之后无限续玩');
  return `<div class="title-screen" style="--bg:url('${abs('assets/exports/s11-v1/cover-display.webp')}')">
    <div class="title-box"><h1>重生长雍<br>帝王赋</h1>
      <p>雍正元年正月。你从死里醒来，那些后来再也挽回不了的人，此刻都还在。</p>
      ${has ? '<button class="primary" data-act="continue">继续</button>' : ''}
      <button class="${has ? '' : 'primary'}" data-act="${has ? 'new-confirm' : 'new'}">新开一局</button>
      <p class="muted small">${campaign} · AI ${AI.aiMode() === 'off' ? '未开启' : '已开启'} ·
        <a href="#" data-act="go" data-to="settings">设置</a></p>
      ${playHelp()}
    </div></div>`;
}

// 规则按月历、人物和批折分段收进“怎么玩”，不挤占折匣正文。
function playHelp() {
  return `<details class="how"><summary>怎么玩</summary>
    <p>一个月是一回合。月初先处置要事；然后有三个时辰，可以召见、赏赐、下旨、批折、微服或休养；
      入夜选一处去，或独寝。月末结算。</p>
    <p>情分到「相知」，那个人会在夜里有话想说；到「倾心」，还有一次说破心意的机会。
      若你在两难里没站在谁那边，那人会有心结，要当面说开。</p>
    <p>主线铺至三十年，之后仍可无限续玩。六年后按阶段回顾，新政、用人和宫中故事继续展开。
      普通故事可择月呈报，急灾、军情、生辰照常。除夕与中秋须过，其余节庆随意。阶段之间存档、情分和皇嗣出生记录全部延续，
      也可以带着一样记忆“再活一世”。</p>
    <p>折匣：一个时辰可批 ${E.reviewLimit({})} 道（设值房后 ${E.reviewLimit({done: {W08: 'council'}})} 道）。
      浏览不占时辰，第一次落笔才扣一个时辰。留中也算一道，合上再开不另扣；做别的行动后另起一个时辰。
      查核只查清案情，工程、赈灾仍要另批银子，急灾不能以核代赈。交部议下月带原折复奏。
      办结回报自动收存，不挤占时辰；钱粮清欠准奏后，追缴的银子实际到账才计入国库。</p>
    <p>设置里有三档自由度：一档言出法随；二档、三档在下旨和亲口说话前先掷骰，
      大吉照你写的走，大凶对方会找理由回绝。</p>
  </details>`;
}

const KIND_NAME={longStory:'岁月',deep5:'深情',festival:'节',main:'主线',relation:'情',extension:'情',romance:'心意',deep:'深情',dilemma:'两难',government:'政务',followup:'政务',side:'宫中'};
// 珍藏回看使用当前存档，不借用其他读档留下的动态场景。
function galleryView() {
  const g = loadGallery(),
    n = Object.keys(g.ach || {}).length;
  const seen = Object.entries(g.seen || {})
    .map(([id, opt]) => ({ id, opt, sc: E.scene(s, id) }))
    .filter((x) => x.sc && x.sc.kind && KIND_NAME[x.sc.kind]);
  return `${header()}<main class="gallery"><h3 class="sec">成就 <small>${n}/${ACHIEVEMENTS.length}</small></h3>
  <section class="achs">${ACHIEVEMENTS.map((a) => {
    const got = g.ach?.[a.id];
    return `<div class="ach ${got ? 'got' : ''}"><i>${got ? a.icon : '?'}</i><b>${got ? a.title : '？？？'}</b><span>${esc(a.desc)}</span></div>`;
  }).join('')}</section>
  <h3 class="sec">看过的剧情 <small>${seen.length}</small></h3>
  <section class="replays">${seen.map(x => `<button data-act="replay" data-id="${x.id}">
    <em>${KIND_NAME[x.sc.kind]}</em><b>${esc(x.sc.title)}</b>
    <span>${esc(nm(x.sc.actor))}</span></button>`).join('') || '<p class="muted">还没有。</p>'}</section>
  <p class="muted small center">珍藏跨存档保留在这台设备上，重开一局也不会丢。</p>
 </main>${s ? nav() : ''}`;
}
function replayView() {
  const sc = E.scene(s, view.id),
    opt = loadGallery().seen?.[view.id],
    o = sc.options.find((x) => x.id === opt);
  return `<div class="stage" style="--bg:url('${abs(bgFor(sc.location || sc.place || ''))}')"><div class="stage-top">
    <button data-act="go" data-to="gallery">‹ 珍藏</button><span>回看</span></div>
  ${PEOPLE[sc.actor] || sc.actor ? `<img class="portrait" src="${portrait(sc.actor)}" alt="">` : ''}
  <article class="paper"><h2>${esc(sc.title)}</h2>${paras(sc.body)}${o ? `<div class="choice">
    那一回，你选择：${esc(o.label.replace('{n}', nm(o.who)))}</div>${paras(o.reply || '')}` : ''}
  <button class="primary" data-act="go" data-to="gallery">合上</button></article></div>`;
}
const STAGE_LINE={相识:'开始记得你了。',相知:'愿意跟你说心里话了。',倾心:'动心了。',相守:'这一世，不会再错过了。'};
// 当前页保留正在看的成就，存档中的待弹队列已经在显示时扣除。
function celebration() {
  if (activeAchievement?.save !== s) activeAchievement = null;
  let event = activeAchievement?.event || s?.cele?.[0];
  if (!event) return '';
  if (event.k === 'ach' && !activeAchievement) {
    event = takeAchievement(s, E.save);
    activeAchievement = {save: s, event};
  }
  let img = '', big = '', small = '', cls = '';
  if (event.k === 'birth') {
    const child = F.childById(s, event.child);
    if (!child) return '';
    img = KID_ART[child.art[F.childStage(s, child)]]?.mobile || '';
    big = `宫中添喜 · ${esc(child.name)}`;
    small = `${esc(nm(child.mother))}诞下${child.sex === '男' ? '皇子' : '公主'}，已记入起居注。`;
    cls = 'gold';
  } else if (event.k === 'stage') {
    const person = PEOPLE[event.id];
    img = person.secondary ? '' : portrait(event.id);
    big = `${person.name} · ${event.stage}`;
    small = person.secondary ? '愿意把心里话告诉你了。' : STAGE_LINE[event.stage] || '';
    if (E.hasStory(s, event.id)) small += `<br><span>今夜去找${person.name}，会有新的剧情。</span>`;
    else if (['相知', '倾心'].includes(event.stage)) {
      small += `<br><span>等名字旁出现「有话想说」，夜里去找${person.name}。</span>`;
    }
    cls = 'stage-up';
  } else if (event.k === 'lover') {
    img = PEOPLE[event.id].secondary ? '' : portrait(event.id);
    big = event.id === 'C05' ? '知己' : '两情相悦';
    small = event.id === 'C05' ? '这一世，你多了一个知己。' : `你和${PEOPLE[event.id].name}，说破了心意。`;
    cls = 'lover';
  } else if (event.k === 'fifth') {
    img = PEOPLE[event.id].secondary ? '' : portrait(event.id);
    big = `${PEOPLE[event.id].name} · 第五幕`;
    small = '这一段，你们一起走完了。';
    cls = 'lover';
  } else if (event.k === 'knot') {
    img = PEOPLE[event.id].secondary ? '' : portrait(event.id);
    big = '心结解开了';
    small = `${PEOPLE[event.id].name}的情分又能涨了。`;
  } else if (event.k === 'crisis') {
    big = '要务了结';
    small = event.name;
    cls = 'gold';
  } else if (event.k === 'crisisFail') {
    big = '要务没办好';
    small = `${event.name}。不要紧，路还长。`;
    cls = 'sad';
  } else if (event.k === 'ach') {
    big = `${event.a.icon}`;
    small = `成就解锁 · ${event.a.title}<br><span>${esc(event.a.desc)}</span>`;
    cls = 'ach-pop';
  }
  return `<div class="cele ${cls}" data-act="cele">${img ? `<img src="${img}" alt="">` : ''}
    <div class="cele-box"><b>${big}</b><p>${small}</p><small>点一下继续</small></div></div>`;
}
const VIEWS={finance:financeView,secrets:secretsView,assessment:assessmentView,provinces:provincesView,memorials:memorialView,rest:restView,outings:outingsView,nanfeng:nanfengView,rebirth:rebirthView,gallery:galleryView,replay:replayView,title:titleView,home,scene:sceneView,pick:()=>pickPerson(view.kind),chat:chatView,gift:giftView,edict:edictView,result:resultView,night:nightView,summary:summaryView,ending:endingView,people:peopleView,log:logView,settings:settingsView};
let lastVibration=null;
// 先收取已显示的成就再画页面，刷新时就不会重新弹出。
function render() {
  if (!audienceOf().confirmed) {app.innerHTML = ageView(); return;}
  const family = s?.pendingBirth || s?.familyArt;
  const showCelebration = !family && ['home', 'summary', 'people', 'gallery', 'ending'].includes(view.name) && !busy;
  const overlay = showCelebration ? celebration() : '';
  const event = activeAchievement?.save === s ? activeAchievement.event : s?.cele?.[0];
  if (event !== lastVibration) {
    lastVibration = event;
    if (event && ['stage', 'lover'].includes(event.k)) {
      try {globalThis.navigator?.vibrate?.(30);} catch {}
    }
  }
  app.innerHTML = (family ? familyWizard() : (VIEWS[view.name] || home)()) + overlay;
  const messages = document.getElementById('msgs');
  if (messages) messages.scrollTop = messages.scrollHeight;
  if (view.name === 'chat' && !busy) app.querySelector('.say input')?.focus();
}
function go(v){view=v;render();window.scrollTo(0,0);}

// ---------- 动作 ----------
async function withBusy(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){toast(e.message||String(e));}finally{busy=false;save();render();}}
function learn(id,g,liked){s.known=s.known||{};const k=s.known[id]=s.known[id]&&!Array.isArray(s.known[id])?s.known[id]:{};k[g]=liked;}
const likedList=id=>Object.entries(s.known?.[id]||{}).filter(([,v])=>v).map(([g])=>g);

const ACTS={
 'festival-open': el => openScene(el.dataset.id),
 'opening-edict': () => familyResult(() => E.openingEdict(s)),
 'fiscal-invest':el=>familyResult(()=>E.investFiscal(s,el.dataset.id)),
 'fiscal-collect':()=>familyResult(()=>E.collectFiscal(s)),
 'fiscal-works':el=>familyResult(()=>E.publicWorks(s,el.closest('.public-works').querySelector('select').value)),
 'story-defer':el=>familyResult(()=>E.deferScene(s,el.dataset.id)),
 'family-continue':()=>{E.continueFamily(s);save();go({name:'home'});},
 'family-wish':el=>familyResult(()=>E.discussWish(s,el.dataset.id,el.dataset.wish)),
 'family-care':el=>familyResult(()=>E.pregnancyCare(s,el.dataset.id,el.dataset.pay==='yes')),
 'family-tonic':el=>familyResult(()=>E.pregnancyTonic(s,el.dataset.id)),
 'family-stop':()=>familyResult(()=>E.stopHuanyi(s)),
 'kid-study':el=>familyResult(()=>E.teachChild(s,el.dataset.id,el.dataset.kind)),
 'kid-name-idea':el=>{E.nameChild(s,el.dataset.name);view.kidArt=null;save();render();},
 'kid-art-open':el=>{s.familyArt={child:el.dataset.id,stage:F.childStage(s,F.childById(s,el.dataset.id)),required:false};view.kidArt=null;save();render();},
 'kid-art-preview':el=>{view.kidArt=el.dataset.art;render();},
 'kid-art-cancel':()=>{delete s.familyArt;view.kidArt=null;save();render();},
 'kid-art-confirm':()=>{try{if(s.pendingBirth){E.completeBirth(s,view.kidArt);view={name:'home'};}else{E.changeChildArt(s,s.familyArt.child,view.kidArt);view={name:'people'};}save();go(view);}catch(e){toast(e.message);}},

 'archive-reports':()=>{const n=E.archiveReports(s);save();view.feedback=`已收存${n}道回报，原文仍可查看。`;render();},
 secret:el=>{try{E.judgeSecret(s,el.dataset.id,el.dataset.choice);save();render();}catch(e){toast(e.message);}},
 assess:el=>{try{E.assessOfficial(s,el.dataset.id,el.dataset.decision,el.dataset.office);save();render();}catch(e){toast(e.message);}},
 'age-confirm':async()=>{try{confirmAge();await AI.initAI();s=E.load();go({name:'title'});}catch{toast('没有记住年龄确认，请检查浏览器是否允许保存。');}},
 'age-leave':()=>{view.left=true;render();},
 vol2:()=>{E.startVolume2(s);save();go({name:'home'});},
 vol3:()=>{E.startVolume3(s);save();go({name:'home'});},
 rebirth:()=>go({name:'rebirth'}),
 freedom:el=>{E.setFreedom(s,el.dataset.l);save();toast('自由度：'+FREEDOM[s.freedom].name);render();},
 boon:el=>{s=E.newGamePlus(s,el.dataset.b);save();toast(`第${s.life}世`);go({name:'home'});},
 go: el => {
  const to = el.dataset.to;
  if (to === 'home' && s.ended && !view.report) return go({name: 'ending'});
  if (to === 'memorials') E.review(s);
  go({name: to});
 },
 title:()=>go({name:'title'}),
 new:()=>{s=E.newGame();save();go({name:'home'});},
 'new-confirm': async () => {
  const accepted = await askConfirmation({
    title: '重新开始这一局？',
    text: '重新开始会覆盖现在的存档。',
    cancel: '保留现在的存档',
    accept: '重新开始',
  });
  if (!accepted) return;
  s = E.newGame();
  save();
  go({name: 'home'});
 },
 continue:()=>{s=E.load();go({name:s?.ended?'ending':'home'});},
 scene:()=>openScene(E.pendingScene(s)),
 pick:async (el) => {
  const id = view.id,
    r = E.choose(s, id, el.dataset.opt);
  save();
  view.result = r;
  if (
    E.scene(s, id)?.kind !== 'family' &&
    id !== 'Y10' &&
    r.actor &&
    PEOPLE[r.actor] &&
    AI.aiMode() !== 'off'
  ) {
    r.echoWait = true;
    render();
    const echo = await AI.sceneEcho(s, r.actor, r.title, r.choice, r.text);
    r.echoWait = false;
    if (echo) {
      r.echo = echo;
    }
  }
  render();
},
 'scene-next':()=>{
  if(view.result?.optional)return go({name:'home'});
  if(s.agenda.length)return openScene(E.pendingScene(s));
  if(s.night)return monthEnd();
  go({name:'home'});
 },
 person:el=>go({name:'people',id:el.dataset.id}),
 'appoint-open':()=>{view.appoint=true;render();},
 'summon-open':()=>{view.summon=true;render();},
 'summon-close':()=>{view.summon=false;render();},
 summon:el=>{try{const r=E.summonToPalace(s,el.dataset.id,el.dataset.role);save();go({name:'result',result:{...r,id:el.dataset.id,bg:BG.palace}});}catch(e){toast(e.message);}},
 'nanfeng-stay':el=>{try{const id=el.dataset.id,r=E.nanfengStay(s,id);save();go({name:'night',id});if(r.notes.length)toast(r.notes[0]);else if(r.risk&&!r.risk.free)toast(fateText(r.risk));}catch(e){toast(e.message);}},
 'appoint-close':()=>{view.appoint=false;render();},
 appoint:el=>{try{const r=E.appointPerson(s,el.dataset.id,el.dataset.office);save();go({name:'result',result:r});}catch(e){toast(e.message);}},
 chat:()=>go({name:'pick',kind:'chat'}),
 gift:()=>go({name:'pick',kind:'gift'}),
 'chat-with':el=>{const id=el.dataset.id;try{const c=E.beginChat(s,id);c.msgs=[{who:'npc',text:(c.birthday?`（今天是${PEOPLE[id].name}的生辰。）`:'')+opener(id,c.letter)}];c.topics=[];save();go({name:'chat',chat:c});if(c.birthday)toast(`记得${PEOPLE[id].name}的生辰`);}catch(e){toast(e.message);}},
 topic:el=>withBusy(async()=>{const c=view.chat,t=TOPICS.find(x=>x.id===el.dataset.t);c.topics.push(t.id);c.msgs.push({who:'player',text:t.label});
  let reply=null;if(AI.aiMode()!=='off'&&t.id!=='likes')reply=await AI.chatReply(s,c.id,c.msgs,{letter:c.letter});
  let liked=null;if(t.id==='likes'){liked=E.hintLike(s,c.id);if(liked)toast(`记下了：${PEOPLE[c.id].name}${s.known[c.id][liked]?'喜欢':'不喜欢'}${GIFTS[liked].name}`);}
  const text=reply?.reply||(t.id==='likes'?(liked?`${PEOPLE[c.id].name}想了想，说：“${GIFTS[liked].name}，我${s.known[c.id][liked]?'很喜欢':'不喜欢'}。”`:`${PEOPLE[c.id].name}笑了：“皇上送的，都喜欢。”`):(TOPIC_LINES[c.id]?.[t.id]||`${PEOPLE[c.id].name}恭敬地听完，低声谢过你的关心。`));let d=E.applyChat(s,c,{affection:reply?Math.max(reply.affection,1):t.gain,memory:reply?.memory||''});
  if(t.stat&&!c.statDone){E.applyStats(s,t.stat);c.statDone=true;}
  c.msgs.push({who:'npc',text,d,mood:reply?.mood});}),
 repair:()=>withBusy(async()=>{const c=view.chat,knot=s.people[c.id].knot;c.msgs.push({who:'player',text:`说起「${knot.text}」那件事`});const line=E.repairKnot(s,c);c.msgs.push({who:'npc',text:line,d:3});toast('心结解开了');}),
 'chat-end':()=>{const c=view.chat;if(c&&c.gained)E.log(s,`召见${PEOPLE[c.id].name}，说了${c.turns}句话`,'见');else if(c)E.log(s,`召见${PEOPLE[c.id].name}`,'见');save();afterAction();},
 'gift-to':el=>go({name:'gift',id:el.dataset.id}),
 give:el=>withBusy(async()=>{const id=view.id,g=el.dataset.g,r=E.giveGift(s,id,g);if(r.liked||r.disliked)learn(id,g,r.liked);
  let text=null;if(AI.aiMode()!=='off')text=await AI.giftReply(s,id,GIFTS[g].name,r.liked,r.disliked);
  view.result={...r,gift:g,text:r.antique?(r.counterfeit?'对方对着天光看了许久，才小心地说，这件古玩像是新仿的。':r.liked?'对方轻轻展开旧画，低声谢恩，一直舍不得合上。':'对方双手接过古玩，恭敬谢恩，让人仔细收好。'):text||(r.birthday&&!r.disliked?(BIRTH_LINES[id]?.gift||`${PEOPLE[id].name}俯身谢恩，轻声说，没想到你会记得这个日子。`):(GIFT_LINES[id]?.[r.disliked?'disliked':r.liked?'liked':'plain']||`${PEOPLE[id].name}双手接过，恭敬谢了恩。`))};}),
 edict:()=>go({name:'edict'}),
 fill:el=>{const ta=app.querySelector('textarea');if(ta){ta.value=PRESET_EDICTS[el.dataset.i].text;ta.focus();}},
 preset:el=>{const e=PRESET_EDICTS[el.dataset.i];const r=E.applyEdict(s,e.text,{effects:e.effects,title:e.title,narration:e.narration});save();go({name:'edict',result:{...r,title:e.title,src:e.text}});},
 outing:()=>go({name:'outings'}),
 travel:el=>{try{const r=E.goOuting(s,el.dataset.id);save();go({name:'result',result:{...r,bg:placeBackground(el.dataset.id,s.month)}});}catch(e){toast(e.message);}},
 company:el=>{try{const r=E.nanfengCompany(s,el.dataset.id);save();go({name:'result',result:{...r,bg:placeBackground('nanfeng-interior',s.month)}});}catch(e){toast(e.message);}},
 visit:()=>{const r=E.acceptVisit(s);save();go({name:'result',result:{...r,bg:bgFor(E.placeOf(s,r.id))}});},
 cele: () => {
  if (activeAchievement?.save === s) activeAchievement = null;
  else s.cele.shift();
  E.save(s);
  render();
 },
 replay:el=>go({name:'replay',id:el.dataset.id}),
 rest:()=>go({name:'rest'}),
 'rest-default':()=>{const r=E.rest(s);save();go({name:'result',result:{...r,bg:BG.desk}});},
 'plan-idea':el=>{const ta=document.getElementById(el.dataset.target);if(ta){ta.value=(el.dataset.target==='restPlan'?REST_IDEAS:nightIdeas(view.id))[+el.dataset.i];ta.focus();}},
 'rest-plan':()=>{const plan=(document.getElementById('restPlan')?.value||'').trim(),companion=document.getElementById('restCompanion')?.value||null;if(!plan)return toast('写个安排，或选“照常歇着”。');if(!planAllowed(plan,companion))return toast(PLAN_NOTICE);view.draft=plan;view.companion=companion;
  withBusy(async()=>{const fate=E.rollFate(s,'rest',companion),v=await AI.restScene(s,plan,{companion,fate});const r=v?E.plannedRest(s,plan,{...v,companion,fate}):E.rest(s);view={name:'result',result:{...r,bg:BG.garden}};});},
 review:()=>{try{E.review(s);save();go({name:'memorials'});}catch(e){toast(e.message);}},
 memorial:el=>{try{const r=E.judgeMemorial(s,el.dataset.id,el.dataset.choice);view.feedback=r.text;save();render();}catch(e){toast(e.message);}},
 done:()=>{if(s.nanfeng?.visit&&!s.nanfeng.visit.done)return go({name:'nanfeng'});afterAction();},
 night: async () => {
  if (s.nanfeng?.visit && !s.nanfeng.visit.done) return go({name: 'nanfeng'});
  if (s.agenda.length) return toast('先把要事办完。');
  if (s.night) return monthEnd();
  if (E.stayOf(s)) return go({name: 'night', id: E.stayOf(s)});
  if (s.ap > 0) {
    const accepted = await askConfirmation({
      title: '现在入夜？',
      text: `还有 ${s.ap} 个时辰没用。确定入夜吗？`,
      cancel: '再忙一会儿',
      accept: '入夜',
    });
    if (!accepted) return;
  }
  go({name: 'night'});
 },
 'night-select':el=>go({name:'night',id:el.dataset.id||null}),
 'night-go':el=>{if(s.night&&!s.agenda.length)return monthEnd();const id=el.dataset.id||null,line=AI.aiMode()==='off'?'':(document.getElementById('nightPlan')?.value||'').trim();
  if(!planAllowed(line,id,s))return toast(PLAN_NOTICE);view.draft=line;
  if(id&&!line&&E.hasStory(s,id)){const sid=E.queueSpecial(s,id);save();return go({name:'scene',id:sid});}
  withBusy(async()=>{let v=null,fate=null;if(id&&AI.aiMode()!=='off'){if(line)fate=E.rollFate(s,'night',id);v=await AI.nightScene(s,id,line,fate);}
   const lines=id?NIGHT_LINES[id]:null,bad=fate&&!fate.free&&fate.tier<=1;const text=id?(v?.text||(bad?'对方告了罪，你让人添了热茶。灯下坐了一会儿，便各自歇下。':(lines?.length?lines[(s.month+s.year)%lines.length]:`${nm(id)}行过礼，请你坐下。你们喝了茶，说过几句家常，便早些歇下。`))):'你让人都退下，一个人睡了。难得一夜无梦。';
   const r=E.spendNight(s,id,{affection:v?v.affection:3,health:v?.health||0,memory:v?.memory||'',fate});view.result={...r,id,fate,text:!v&&!bad&&r.birthday?BIRTH_LINES[id].night:text};});
 },
 'month-end':()=>monthEnd(),
 ending:()=>go({name:'ending'}),
 'ai-toggle':async()=>{if(AI.aiMode()==='off'){AI.setAIOff(false);const m=await AI.initAI();toast(m==='off'?'没有找到可用的 AI 服务。':'AI 已开启');}else{AI.setAIOff(true);await AI.initAI();toast('已改用固定文字');}render();}
};
// 打开一件要事；旨意的回报先请 AI 写出来
async function openScene(id){
 if(id?.startsWith('FU')&&!s.dyn?.[id]&&AI.aiMode()!=='off'){
  view={name:'scene',id,loading:true};render();
  const e=(s.edicts||[]).find(x=>'FU'+x.n===id);const v=e?await AI.edictFollow(s,e):null;
  if(v){E.setDyn(s,id,v);save();}
 }
 go({name:'scene',id});
}
// 做完一件事回首页前，有时会撞见点小事
function afterAction(){const sid=E.rollSurprise(s);if(sid){save();toast('路上遇见了点事……');return go({name:'scene',id:sid});}go({name:'home'});}
function monthEnd(){const report=E.endMonth(s);save();go({name:'summary',report});}
function opener(id,letter){
 const p=s.people[id],n=PEOPLE[id].name;
 if(letter)return `（${n}远在${E.placeOf(s,id)}。你铺开信纸。）`;
 if(p.knot)return `${n}行了礼，站得比平日远些。「${p.knot.text}」那件事，还横在你们中间。`;
 if(PEOPLE[id].secondary)return `${n}行过礼，恭敬地候着。你让人上了茶，才慢慢开口。`;
 const st=stageOf(p.aff);
 return {生分:`${n}进来行了礼，垂手站着，等你开口。`,相识:`${n}行过礼，抬眼看了看你：“皇上召见，可是有事？”`,相知:`${n}进门时带着笑：“皇上今日得空了？”`,倾心:`${n}一进来，先看你的脸色，才放心地笑了。`,相守:`${n}没等通传就进来了，在你手边坐下。`}[st];
}

async function sayHandler(text){
 const c=view.chat;if(!text||c.turns>=6)return;if(!planAllowed(text,c.id,s))return toast(PLAN_NOTICE);
 await withBusy(async()=>{c.msgs.push({who:'player',text});if(!c.fate){c.fate=E.rollFate(s,'chat',c.id);if(!c.fate.free)c.msgs.push({who:'sys',tier:c.fate.tier,text:fateText(c.fate)+'：'+FATE_SHORT[c.fate.tier]});}const r=await AI.chatReply(s,c.id,c.msgs,{letter:c.letter,fate:c.fate});
  if(!r){c.msgs.push({who:'npc',text:'（AI 没有回应：'+(AI.aiError()||'连接失败')+'。可以先用上面的话题。）'});c.msgs.at(-2).failed=true;return;}
  const d=E.applyChat(s,c,{affection:r.affection,memory:r.memory});c.msgs.push({who:'npc',text:r.reply,d,mood:r.mood});
  if(r.memory)toast(`${PEOPLE[c.id].name}记下了：${r.memory}`);});
}
async function decreeHandler(text){
 if(!text)return toast('旨意还是空的。');
 if(!planAllowed(text,null,s))return toast(PLAN_NOTICE);
 await withBusy(async()=>{const fate=E.rollFate(s,'edict');const v=await AI.edictResult(s,text,CAST.filter(id=>E.present(s,id)&&s.people[id].met),fate);
  if(!v)throw Error('旨意没能传下去：'+(AI.aiError()||'AI 未回应')+'。时辰没有用掉。');
  const r=E.applyEdict(s,text,{...v,fate});view.result={...r,title:v.title,src:text,text:v.narration,fate};});
}

app.addEventListener('error',e=>{const img=e.target;if(img.tagName!=='IMG'||!img.dataset.person)return;const id=img.dataset.person,span=document.createElement('span');span.className='avatar '+img.className;span.textContent=(PEOPLE[id]?.name||'人')[0];span.setAttribute('aria-label',nm(id));(img.closest('picture')||img).replaceWith(span);},true);
app.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||el.tagName==='FORM')return;if(el.disabled)return;const f=ACTS[el.dataset.act];if(f){e.preventDefault();f(el);}});
app.addEventListener('change',e=>{if(e.target.dataset.pref==='tenderness'){try{setTenderness(e.target.checked);}catch(err){toast(err.message);render();}}});
app.addEventListener('submit',e=>{e.preventDefault();if(!audienceOf().confirmed)return;const f=e.target,t=(f.t?.value||'').trim();if(f.dataset.act==='kid-name'){try{E.nameChild(s,t);view.kidArt=null;save();render();}catch(e){toast(e.message);}}else if(f.dataset.act==='transfer'){try{const r=E.transferFunds(s,f.direction.value,f.amount.value);save();go({name:'result',result:r});}catch(e){toast(e.message);}}else if(f.dataset.act==='say')sayHandler(t);else if(f.dataset.act==='decree')decreeHandler(t);
 else if(f.dataset.act==='memorial-write')withBusy(async()=>{const fate=E.rollFate(s,'edict'),v=await AI.edictResult(s,t,CAST.filter(id=>E.present(s,id)),fate);if(!v)throw Error('朱批未发出，可重试。');const r=E.writeMemorial(s,f.dataset.id,t,{...v,fate});view.feedback=r.text;});
 else if(f.dataset.act==='policy'){try{const [host,pilot]=f.host.value.split('|');E.launchPolicy(s,f.dataset.id,host,pilot);save();render();}catch(e){toast(e.message);}}
 else if(f.dataset.act==='api'){const d={url:f.url.value.trim(),model:f.model.value.trim(),key:f.key.value.trim()},rem=f.remember.checked;withBusy(async()=>{await AI.saveConnection(d,rem);toast('AI 已开启');});}});

(async()=>{render();if(!audienceOf().confirmed)return;await AI.initAI();s=E.load();render();})();

// iOS Safari 不认 user-scalable=no：拦下双指缩放和双击放大；输入框收起后把页面放回原位
(()=>{const d=globalThis.document;if(!d?.addEventListener)return;
 for(const ev of ['gesturestart','gesturechange','gestureend'])d.addEventListener(ev,e=>e.preventDefault(),{passive:false});
 d.addEventListener('touchmove',e=>{if(e.touches&&e.touches.length>1)e.preventDefault();},{passive:false});
 let last=0;d.addEventListener('touchend',e=>{const now=Date.now();if(now-last<300&&!e.target?.closest?.('input,textarea,select,button'))e.preventDefault();last=now;},{passive:false});
 d.addEventListener('focusout',e=>{if(e.target?.matches?.('input,textarea'))setTimeout(()=>{if(!d.activeElement?.matches?.('input,textarea'))globalThis.scrollTo?.(0,globalThis.scrollY||0);},50);});
})();
