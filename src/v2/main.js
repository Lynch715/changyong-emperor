// 新版界面：一个状态对象 + 一个 render。点击用 data-act 分发。
import * as E from './engine.js';
import {PEOPLE,CORE,STATS,MONTHS,SEASON,CRISES,GIFTS,GIFT_LINES,TOPICS,TOPIC_LINES,NIGHT_LINES,ENDING_KINGDOM,ENDING_PEOPLE,NAMES,YEAR_NAME,portrait,thumb,bgFor,BG,stageOf,STAGES,AGENDA} from './data.js';
import * as AI from './ai.js';
import {LOVER_ENDING} from './romance.js';
import {ENDING_KINGDOM2,ENDING2} from './vol2.js';
const bondName=id=>id==='C05'?'知己':'两情相悦';

const app=document.getElementById('app');
let s=null;            // 存档
let view={name:'title'};
let busy=false;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const paras=t=>String(t||'').split(/\n{1,}/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
const statName=id=>STATS.find(x=>x.id===id)?.name||id;
const nm=id=>NAMES[id]||PEOPLE[id]?.name||'';
const dateText=st=>`雍正${YEAR_NAME(st.year)}年 · ${MONTHS[st.month-1]}`;
const THUMBS=new Set(['C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C19','C20','C21','C22','C26','C28','C32']);
const face=id=>THUMBS.has(id)?thumb(id):portrait(id);
const abs=p=>new URL(p,location.href).href;
const save=()=>{if(s)E.save(s);};

// ---------- 反馈：数值与情分变化的小标签 ----------
function chips(stats={},people={},extra=''){
 const a=[];
 for(const[k,v]of Object.entries(stats||{}))if(v)a.push(`<span class="chip ${v>0?'up':'down'}">${statName(k)} ${v>0?'+':''}${v}</span>`);
 for(const[k,v]of Object.entries(people||{}))if(v)a.push(`<span class="chip heart ${v>0?'up':'down'}">${nm(k)} 情分 ${v>0?'+':''}${v}</span>`);
 return a.length||extra?`<div class="chips">${a.join('')}${extra}</div>`:'';
}
function toast(text){const t=document.getElementById('toast');t.textContent=text;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2200);}

// ---------- 顶栏 ----------
function header(){
 if(!s)return '';
 const d=s.delta.stats;
 return `<header class="top">
  <div class="date"><b>${dateText(s)}</b><span>${SEASON(s.month)}</span></div>
  <div class="stats">${STATS.map(x=>{const v=s.stats[x.id],dd=d[x.id]||0;return `<div class="stat ${v<30?'low':''}" title="${esc(x.hint)}"><span class="sn">${x.name}</span><span class="sv">${v}</span>${dd?`<span class="sd ${dd>0?'up':'down'}">${dd>0?'▲':'▼'}${Math.abs(dd)}</span>`:''}<i style="width:${v}%"></i></div>`;}).join('')}</div>
 </header>`;
}
function apPips(){return `<span class="pips">${Array.from({length:E.AP_PER_MONTH},(_,i)=>`<i class="${i<s.ap?'on':''}"></i>`).join('')}</span>`;}

// 告诉玩家现在该做什么
function guide(){
 if(s.stats.treasury<20&&!s.agenda.length&&s.ap>0)return `国库只剩 ${s.stats.treasury}。少赏赐，或下旨开源节流。还有 ${s.ap} 个时辰。`;
 if(s.agenda.length)return `本月有 ${s.agenda.length} 件要事等你处置。`;
 if(s.ap>0)return `还有 ${s.ap} 个时辰。召见、赏赐、下旨、出宫或休养，各用一个。`;
 return '今日的时辰用完了。入夜，选一处去。';
}

// ---------- 首页：本月 ----------
function home(){
 const pending=E.pendingScene(s),sc=pending&&E.scene(pending);
 const acts=[
  ['chat','召见','找一个人说话。AI 会让对方真的接住你的话',''],
  ['gift','赏赐','送对东西，情分涨得快。要花国库',''],
  ['edict','下旨','亲笔写一道旨意，看它会掀起什么',AI.aiMode()==='off'?'（无 AI 时只能选拟好的旨意）':''],
  ['outing','微服','出宫走走，看看真实的京城',''],
  ['rest','休养','什么都不做，养一养身子','']
 ];
 const ppl=CORE.filter(id=>E.present(s,id)&&s.people[id].met);
 const later=CORE.filter(id=>!E.present(s,id)||!s.people[id].met).length;
 return `${header()}
 <main class="home">
  <div class="guide"><span>${guide()}</span>${apPips()}</div>
  ${sc?`<button class="agenda" data-act="scene">
    <img src="${face(sc.actor)}" alt="" onerror="this.style.visibility='hidden'">
    <div><small>本月要事 · ${s.agenda.length} 件</small><b>${esc(sc.title)}</b><span>${esc(nm(sc.actor)||'')}${sc.location||sc.place?' · '+esc(sc.location||sc.place):''}</span></div>
    <em>处置 ›</em></button>`:''}
  <section class="acts ${sc?'locked':''}">
   ${acts.map(([id,t,d,n])=>`<button data-act="${id}" ${!E.canAct(s)?'disabled':''}><b>${t}</b><span>${d}${n}</span></button>`).join('')}
  </section>
  <button class="night-btn ${!sc&&s.ap===0?'glow':''}" data-act="night" ${sc?'disabled':''}>入夜 ›<span>${s.ap>0&&!sc?`还剩 ${s.ap} 个时辰`:'选一处去，或独寝'}</span></button>

  <h3 class="sec">身边的人</h3>
  <section class="people">
   ${ppl.map(id=>personCard(id)).join('')}
   ${later?`<div class="pc ghost"><b>还有 ${later} 人</b><span>会在往后的日子里出现</span></div>`:''}
  </section>

  <h3 class="sec">要务</h3>
  <section class="crises">${E.ALL_CRISES.filter(c=>c.vol===(s.vol||1)).map(c=>{const st=E.crisisStatus(s,c);if(st==='later')return '';const done=c.scenes.filter(id=>s.done[id]).length;return `<div class="crisis ${st}"><b>${c.name}</b><em>${{open:'进行中',solved:'已了结',failed:'没办好'}[st]}</em><p>${esc(c.desc)}</p><div class="bar"><i style="width:${done/c.scenes.length*100}%"></i></div><small>${done}/${c.scenes.length} 步${c.goal&&st==='open'?` · 国库 ${s.stats.treasury}/50`:''} · 期限 ${YEAR_NAME(c.deadline[0])}年${MONTHS[c.deadline[1]-1]}</small></div>`;}).join('')||'<p class="muted">眼下还没有。</p>'}</section>
 </main>
 ${nav()}`;
}
function personCard(id,act='person'){
 const p=s.people[id],st=stageOf(p.aff),next=STAGES.find(([n])=>n>p.aff);
 const lo=STAGES.filter(([n])=>p.aff>=n).at(-1)[0],hi=next?next[0]:100;
 const dd=s.delta.people[id]||0;
 const badge=p.knot?'<em class="knot">心结</em>':E.hasStory(s,id)?'<em class="ready">有话想说</em>':E.away(s,id)?'<em class="away">在外</em>':p.lover?`<em class="lover">${bondName(id)}</em>`:'';
 return `<button class="pc" data-act="${act}" data-id="${id}"><img src="${face(id)}" alt="">
  <div><b>${PEOPLE[id].name}${badge}</b><span>${st} · ${p.aff}${dd?`<i class="${dd>0?'up':'down'}">${dd>0?'+':''}${dd}</i>`:''}</span><div class="bar"><i style="width:${(p.aff-lo)/(hi-lo)*100}%"></i></div></div></button>`;
}
function nav(){return `<nav class="bottom"><button data-act="go" data-to="home" class="${view.name==='home'?'on':''}">本月</button><button data-act="go" data-to="people" class="${view.name==='people'?'on':''}">人物</button><button data-act="go" data-to="log" class="${view.name==='log'?'on':''}">起居注</button><button data-act="go" data-to="settings" class="${view.name==='settings'?'on':''}">设置</button></nav>`;}

// ---------- 场景 ----------
function sceneView(){
 const sc=E.scene(view.id);if(!sc)return home();
 const place=sc.location||sc.place||'';
 const r=view.result;
 return `<div class="stage" style="--bg:url('${abs(bgFor(place))}')">
  <div class="stage-top"><span>${dateText(s)}</span><span>${esc(place)}</span></div>
  ${sc.actor?`<img class="portrait" src="${portrait(sc.actor)}" alt="${esc(nm(sc.actor))}">`:''}
  <article class="paper">
   <h2>${esc(sc.title)}</h2>
   ${r?`<div class="choice">你选择：${esc(r.choice)}</div>${paras(r.text)}
     ${r.echo?`<blockquote class="echo"><b>${esc(nm(r.actor))}</b>${esc(r.echo)}</blockquote>`:r.echoWait?'<p class="muted wait">……</p>':''}
     ${chips(r.stats,r.people,r.knot?`<span class="chip knot">${nm(r.knot)} 心里有了结</span>`:'')}
     ${r.knot?`<p class="hint">心结未解时，${nm(r.knot)}的情分不会再涨。召见时可以“说开那件事”。</p>`:''}
     <button class="primary" data-act="scene-next">继续</button>`
   :`${paras(sc.body)}<div class="options">${E.optionsFor(s,sc).map(o=>`<button data-act="pick" data-opt="${o.id}">${esc(o.label)}</button>`).join('')}</div>`}
  </article></div>`;
}

// ---------- 召见 / 赏赐：先选人 ----------
function pickPerson(kind){
 const ids=CORE.filter(id=>E.present(s,id)&&(s.people[id].met||kind==='chat'));
 return `${header()}<main class="pick"><div class="bar-title"><button data-act="go" data-to="home">‹ 返回</button><b>${kind==='chat'?'召见谁？':'赏给谁？'}</b></div>
  <section class="people">${ids.map(id=>personCard(id,kind==='chat'?'chat-with':'gift-to')).join('')}</section>
  <p class="muted center">${kind==='chat'?(E.away(s,'C03')&&ids.includes('C03')?'人在外地的，只能写信。':'每次召见最多说六句。说到心坎上，情分涨得多。'):'送对了心头好，情分 +6；寻常的 +2；同样的东西再送，只 +1。'}</p></main>`;
}

function chatView(){
 const c=view.chat,id=c.id,p=PEOPLE[id],st=s.people[id];
 const ai=AI.aiMode()!=='off',used=c.topics||[];
 const left=Math.max(0,6-c.turns);
 return `<div class="stage chat" style="--bg:url('${abs(bgFor(E.placeOf(s,id)))}')">
  <div class="stage-top"><button data-act="chat-end">‹ 告退</button><span>${c.letter?'书信 · ':''}${esc(E.placeOf(s,id))}</span><span class="pill">${stageOf(st.aff)} ${st.aff}${c.gained?` <i class="up">+${c.gained}</i>`:''}</span></div>
  <img class="portrait" src="${portrait(id)}" alt="">
  <article class="paper talk">
   <h2>${p.name}<small>${E.titleOf(s,id)}${st.knot?' · <em class="knot">心结：'+esc(st.knot.text)+'</em>':''}</small></h2>
   <div class="msgs" id="msgs">${c.msgs.map(m=>`<div class="msg ${m.who}">${m.who==='npc'?`<b>${p.name}</b>`:''}${esc(m.text)}${m.d!=null&&m.who==='npc'?`<span class="md ${m.d>0?'up':m.d<0?'down':''}">${m.mood?esc(m.mood)+' · ':''}${m.d>0?'情分 +'+m.d:m.d<0?'情分 '+m.d:'情分不变'}</span>`:''}</div>`).join('')}${busy?`<div class="msg npc typing"><b>${p.name}</b>……</div>`:''}</div>
   ${left>0?`<div class="topics">${st.knot?`<button data-act="repair" class="repair" ${busy?'disabled':''}>说开「${esc(st.knot.text)}」那件事</button>`:''}${TOPICS.map(t=>`<button data-act="topic" data-t="${t.id}" ${used.includes(t.id)||busy?'disabled':''}>${t.label}</button>`).join('')}</div>
   ${ai?`<form class="say" data-act="say"><input name="t" maxlength="120" placeholder="${c.letter?'写几句给远方的人……':'想对'+p.name+'说什么？'}" autocomplete="off" ${busy?'disabled':''}><button ${busy?'disabled':''}>说</button></form><p class="muted small">还能说 ${left} 句。真诚的话打动人，敷衍和冒犯也会被记住。</p>`:'<p class="muted small">接入 AI 后可以随意说话。现在只能从上面挑话题。</p>'}`
   :`<p class="muted center">该说的都说了。</p>`}
   <button class="primary" data-act="chat-end">${left>0?'告退':'告退'}</button>
  </article></div>`;
}

function giftView(){
 const id=view.id,p=PEOPLE[id],known=s.known?.[id]&&!Array.isArray(s.known[id])?s.known[id]:{};
 if(view.result){const r=view.result;return `<div class="stage" style="--bg:url('${abs(bgFor(E.placeOf(s,id)))}')"><img class="portrait" src="${portrait(id)}" alt=""><article class="paper"><h2>赏${p.name}</h2><div class="choice">${esc(GIFTS[r.gift].name)}${r.liked&&!r.repeat?' · 正合心意':r.repeat?' · 送过了':''}</div>${paras(r.text)}${chips(r.stats,r.people,r.knot?'<span class="chip knot">心结未解，情分没有涨</span>':'')}<button class="primary" data-act="done">好</button></article></div>`;}
 return `${header()}<main class="pick"><div class="bar-title"><button data-act="gift">‹ 换人</button><b>赏${p.name}什么？</b></div>
 <section class="gifts">${Object.entries(GIFTS).map(([g,x])=>`<button data-act="give" data-g="${g}" ${s.stats.treasury<x.cost?'disabled':''}><b>${x.name}${known[g]===true?' <em>♥</em>':known[g]===false?' <em class="no">送过</em>':''}</b><span>${x.cost?'国库 −'+x.cost:'不花钱'}</span></button>`).join('')}</section>
 <p class="muted center">送过一次，就知道${p.name}喜不喜欢了（♥）。</p></main>`;
}

// ---------- 下旨 ----------
const PRESET_EDICTS=[
 {title:'减膳节用',text:'宫中用度减三成，从朕的御膳减起。',effects:{treasury:5,palace:-2,health:-1},narration:'旨意一下，御膳房先撤了一半的菜。各宫的份例也跟着减了。有人私下抱怨，可看见皇上自己的桌上只剩四个菜，也就不好再说什么。几个月下来，内务府省下了一笔不小的银子。'},
 {title:'开恩科',text:'今岁加开恩科，广纳寒门之士。',effects:{court:4,treasury:-3,people:1},narration:'恩科的消息传出去，各省的读书人都动了起来。考场里坐满了人，有白发的老秀才，也有十几岁的少年。放榜那天，有一半的新科进士出身寒门。'},
 {title:'赦免轻罪',text:'京畿牢狱中，轻罪者一律释放回家。',effects:{people:4,court:-2},narration:'几百个犯人走出了牢门，有的人在门口就跪下磕头。刑部的几位老臣连上了三道折子，说这样下去法度要乱。百姓却都说，新皇上是个心软的。'}
];
function edictView(){
 const r=view.result,ai=AI.aiMode()!=='off';
 if(r)return `<div class="stage" style="--bg:url('${abs(BG.court)}')"><article class="paper"><h2>${esc(r.title||'旨意')}</h2><div class="choice">朱批：${esc(r.src)}</div>${paras(r.text)}${chips(r.stats,r.people)}<button class="primary" data-act="done">好</button></article></div>`;
 return `<div class="stage" style="--bg:url('${abs(BG.desk)}')"><div class="stage-top"><button data-act="go" data-to="home">‹ 收起</button><span>养心殿御案</span></div><article class="paper">
  <h2>亲笔下旨</h2>
  ${ai?`<p class="muted">写下你想办的事，任何事都可以。它会怎样落地，有什么代价，由天下来回答。</p>
  <form class="edict" data-act="decree"><textarea name="t" maxlength="200" rows="4" placeholder="例如：在京城设十处粥厂，入冬前施粥三月。" ${busy?'disabled':''}></textarea><button class="primary" ${busy?'disabled':''}>${busy?'旨意正在传下去……':'用印'}</button></form>
  <p class="muted small">举几个例子：</p>`:`<p class="muted">没有接入 AI，只能从拟好的旨意里选一道。</p>`}
  <div class="options">${PRESET_EDICTS.map((e,i)=>`<button data-act="${ai?'fill':'preset'}" data-i="${i}" ${busy?'disabled':''}>${esc(e.text)}</button>`).join('')}</div>
 </article></div>`;
}

// ---------- 白天的小结果（微服、休养） ----------
function resultView(){const r=view.result;return `<div class="stage" style="--bg:url('${abs(r.bg||BG.garden)}')"><article class="paper"><h2>${esc(r.title)}</h2>${paras(r.text)}${chips(r.stats,r.people)}<button class="primary" data-act="done">好</button></article></div>`;}

// ---------- 夜 ----------
function nightView(){
 if(view.result){const r=view.result;return `<div class="stage night" style="--bg:url('${abs(BG.palace)}')">${r.id?`<img class="portrait" src="${portrait(r.id)}" alt="">`:''}<article class="paper"><h2>${r.id?E.placeOf(s,r.id)+' · 夜':'独寝'}</h2>${paras(r.text)}${chips(r.stats,r.people)}<button class="primary" data-act="month-end">天亮了 ›</button></article></div>`;}
 const list=E.nightChoices(s),ai=AI.aiMode()!=='off';
 return `<div class="stage night" style="--bg:url('${abs(BG.palace)}')"><div class="stage-top"><button data-act="go" data-to="home">‹ 再等等</button><span>${dateText(s)} · 夜</span></div><article class="paper">
  <h2>今夜去哪里？</h2>
  ${busy?'<p class="muted center wait">灯一盏一盏亮起来……</p>':`
  <section class="people">${list.map(x=>`<button class="pc" data-act="night-go" data-id="${x.id}"><img src="${face(x.id)}" alt=""><div><b>${PEOPLE[x.id].name}${x.special?'<em class="ready">有话想说</em>':x.knot?'<em class="knot">心结</em>':''}</b><span>${E.placeOf(s,x.id)} · ${stageOf(s.people[x.id].aff)}</span></div></button>`).join('')}
   <button class="pc" data-act="night-go" data-id=""><div><b>独寝</b><span>一个人睡，圣躬 +3</span></div></button></section>
  ${ai?'<input class="night-line" id="nightLine" maxlength="60" placeholder="（可选）进门时想说的第一句话">':''}
  <p class="muted small">“有话想说”的人，今夜会有一段新剧情。</p>`}
 </article></div>`;
}

// ---------- 月末 ----------
function summaryView(){
 const r=view.report;
 const next=s.ended?0:s.agenda.length;
 return `<div class="stage" style="--bg:url('${abs(BG.desk)}')"><article class="paper summary">
  <h2>${YEAR_NAME(r.y)}年${MONTHS[r.m-1]} · 月末</h2>
  <h4>这个月</h4>${chips(r.stats,r.people)||'<p class="muted">风平浪静。</p>'}
  <p class="muted small">${s.year>=3?'每月国库进账 +3，圣躬 −1；八爷党与新政的阻力让朝局 −1、民心 −1。':'每月国库自然进账 +5，圣躬劳损 −1。'}${r.cooled.length?`<br>${r.cooled.map(nm).join('、')}这个月没见到你，情分淡了一点。`:''}</p>
  ${r.crises.filter(c=>c.status!=='later').map(c=>`<div class="crisis mini ${c.status}"><b>${c.name}</b><em>${{open:'进行中',solved:'已了结',failed:'没办好'}[c.status]}</em></div>`).join('')}
  ${s.ended?`<button class="primary" data-act="ending">${s.vol===2?'四年过去了':'两年过去了'} ›</button>`:`<h4>下个月</h4><p>${dateText(s)}${next?`，有 ${next} 件要事。`:'，暂无要事。'}</p>${CORE.filter(id=>E.present(s,id)&&!s.people[id].met&&PEOPLE[id].from[0]===s.year&&PEOPLE[id].from[1]===s.month).map(id=>`<p class="new">新面孔：${PEOPLE[id].name}（${PEOPLE[id].title}）</p>`).join('')}<button class="primary" data-act="go" data-to="home">进入${MONTHS[s.month-1]} ›</button>`}
 </article></div>`;
}

// ---------- 结局 ----------
function endingView(){
 const v2=s.vol===2,K=v2?ENDING_KINGDOM2:ENDING_KINGDOM;
 const e=E.ending(s),low=Math.min(...Object.values(s.stats)),k=K.find((x,i)=>e.score>=x.min&&!(i===0&&low<40)&&!(i===1&&low<20))||K.at(-1);
 const text=p=>{if(p.gone)return '年羹尧在狱中。他托人带出一句话：臣不怨皇上。只是这一句话，比怨更让你睡不着。';if(v2)return ENDING2[p.id][p.tier];return p.tier===3?LOVER_ENDING[p.id]:ENDING_PEOPLE[p.id][Math.min(p.tier,2)];};
 const label=p=>p.gone?'狱中':p.tier===3?(p.id==='C05'?'知己':'相守'):stageOf(p.aff);
 return `<div class="stage" style="--bg:url('${abs(BG.court)}')"><article class="paper ending">
  <small>雍正${v2?'四':'二'}年 · 岁末</small><h2>${k.title}</h2>${paras(k.text)}
  <div class="chips">${STATS.map(x=>`<span class="chip">${x.name} ${s.stats[x.id]}</span>`).join('')}<span class="chip">了结要务 ${e.solved}/3</span></div>
  <h4>他们</h4>
  ${e.people.map(p=>`<div class="end-p"><img src="${face(p.id)}" alt=""><div><b>${PEOPLE[p.id].name} · ${label(p)}</b><p>${esc(text(p))}</p></div></div>`).join('')}
  ${v2?`<p class="muted center">第二卷完。后面的故事，还在写。</p><button class="primary" data-act="new">从头再来</button>`
   :`<p class="muted center">第一卷完。</p><button class="primary" data-act="vol2">进入第二卷：雍正三年 ›</button><p class="muted small center">存档、情分和他们记得的事，都会带过去。</p><button data-act="new-confirm" class="plain">从头再来</button>`}
 </article></div>`;
}

// ---------- 人物 / 起居注 / 设置 ----------
function peopleView(){
 const id=view.id;
 if(id){const p=PEOPLE[id],st=s.people[id],known=likedList(id);return `${header()}<main class="person"><div class="bar-title"><button data-act="go" data-to="people">‹ 人物</button><b>${p.name}</b></div>
  <div class="person-hero"><img src="${portrait(id)}" alt=""><div><h2>${p.name}</h2><p>${E.titleOf(s,id)} · ${E.placeOf(s,id)}</p><p class="big">${stageOf(st.aff)} <b>${st.aff}</b></p>
   <div class="stages">${STAGES.map(([n,t])=>`<span class="${st.aff>=n?'on':''}">${t}</span>`).join('')}</div>
   ${st.knot?`<p class="knot-line">心结：${esc(st.knot.text)}。召见时说开它。</p>`:''}
   ${st.lover?`<p class="ready-line">${bondName(id)}</p>`:''}
   ${E.hasStory(s,id)?`<p class="ready-line">有话想对你说。${E.away(s,id)?'会有书信来。':'今夜去看看。'}</p>`:st.first&&!st.second&&st.aff<45?'<p class="muted small">情分到「相知」后，会有新的剧情。</p>':st.second&&!st.third&&st.aff<65?'<p class="muted small">情分到「倾心」后，还有一段剧情。</p>':st.third&&!st.fourth&&s.year>=3&&st.aff<75?'<p class="muted small">情分到 75，还会有一段剧情。</p>':''}
   <p class="muted small">喜欢：${known.length?known.map(g=>GIFTS[g].name).join('、'):'还不知道'}</p></div></div>
  <h3 class="sec">${p.name}记得的事</h3>
  <ul class="mem">${st.memories.slice().reverse().map(m=>`<li><small>${YEAR_NAME(m.y)}年${MONTHS[m.m-1]}</small>${esc(m.text)}</li>`).join('')||'<li class="muted">还没有。</li>'}</ul></main>${nav()}`;}
 return `${header()}<main><h3 class="sec">人物</h3><section class="people">${CORE.filter(id=>E.present(s,id)&&s.people[id].met).map(id=>personCard(id)).join('')}</section></main>${nav()}`;
}
function logView(){
 const items=s.log.slice().reverse();
 return `${header()}<main><h3 class="sec">起居注</h3><ul class="log">${items.map(l=>`<li><small>${YEAR_NAME(l.y)}年${MONTHS[l.m-1]}</small><em>${l.kind}</em>${esc(l.text)}</li>`).join('')||'<li class="muted">还没有记录。</li>'}</ul></main>${nav()}`;
}
function settingsView(){
 const m=AI.aiMode();
 return `${header()}<main class="settings"><h3 class="sec">设置</h3>
  <div class="card"><b>AI 对话</b><p>${m==='server'?'已连接本机的 AI 服务。':m==='byok'?'正在使用你填写的 API。':'未开启。召见只能挑话题，旨意只能选拟好的。'}</p>
  ${AI.aiError()?`<p class="muted small">上次出错：${esc(AI.aiError())}</p>`:''}
  <button data-act="ai-toggle">${m==='off'?'尝试开启 AI':'关闭 AI，改用固定文字'}</button></div>
  ${m!=='server'?(()=>{const c=AI.savedConnection();return `<form class="card api" data-act="api"><b>使用自己的 API</b><p class="small">默认 DeepSeek。密钥只存在这台设备的浏览器里，不进存档。</p>
   <label>地址<input name="url" value="${esc(c.url)}"></label><label>模型<input name="model" value="${esc(c.model)}"></label><label>密钥<input name="key" type="password" placeholder="${c.key?'已保存，留空不改':'sk-……'}" autocomplete="off"></label>
   <label class="chk"><input type="checkbox" name="remember" checked> 记住在这台设备上</label><button ${busy?'disabled':''}>${busy?'正在测试……':'测试并启用'}</button></form>`;})():''}
  <div class="card"><b>存档</b><p>每个动作后自动保存在这台设备的浏览器里。</p>${s?'<button data-act="new-confirm">重新开始</button> ':''}<button data-act="title">回到标题</button></div>
  <div class="card"><b>旧版</b><p>以前的版本还在，可以继续玩旧存档。</p><a href="?legacy=1">打开旧版</a></div>
 </main>${s?nav():''}`;
}
function titleView(){
 const has=!!E.load();
 return `<div class="title-screen" style="--bg:url('${abs('assets/exports/s11-v1/cover-display.webp')}')"><div class="title-box">
  <h1>重生长雍<br>帝王赋</h1><p>雍正元年正月。你从死里醒来，那些后来再也挽回不了的人，此刻都还在。</p>
  ${has?'<button class="primary" data-act="continue">继续</button>':''}
  <button class="${has?'':'primary'}" data-act="${has?'new-confirm':'new'}">新开一局</button>
  <p class="muted small">${has&&E.load()?.vol===2?'第二卷 · 三年至四年':'第一卷 · 元年至二年'} · 每卷约一小时 · AI ${AI.aiMode()==='off'?'未开启':'已开启'} · <a href="#" data-act="go" data-to="settings">设置</a></p>
  <details class="how"><summary>怎么玩</summary><p>一个月是一回合。月初先处置要事；然后有三个时辰，可以召见、赏赐、下旨、微服或休养；入夜选一处去，或独寝。月末结算。</p><p>情分到「相知」，那个人会在夜里有话想说；到「倾心」，还有一次说破心意的机会。若你在两难里没站在谁那边，那人会有心结，要当面说开。</p><p>两年为一卷。第一卷结束后，存档和情分都能带进第二卷（雍正三年至四年）。</p></details>
 </div></div>`;
}

const VIEWS={title:titleView,home,scene:sceneView,pick:()=>pickPerson(view.kind),chat:chatView,gift:giftView,edict:edictView,result:resultView,night:nightView,summary:summaryView,ending:endingView,people:peopleView,log:logView,settings:settingsView};
function render(){app.innerHTML=(VIEWS[view.name]||home)();const m=document.getElementById('msgs');if(m)m.scrollTop=m.scrollHeight;if(view.name==='chat'&&!busy)app.querySelector('.say input')?.focus();}
function go(v){view=v;render();window.scrollTo(0,0);}

// ---------- 动作 ----------
async function withBusy(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){toast(e.message||String(e));}finally{busy=false;save();render();}}
function learn(id,g,liked){s.known=s.known||{};const k=s.known[id]=s.known[id]&&!Array.isArray(s.known[id])?s.known[id]:{};k[g]=liked;}
const likedList=id=>Object.entries(s.known?.[id]||{}).filter(([,v])=>v).map(([g])=>g);

const ACTS={
 vol2:()=>{E.startVolume2(s);save();go({name:'home'});},
 go:el=>{const to=el.dataset.to;if(to==='home'&&s.ended&&!view.report)return go({name:'ending'});go({name:to});},
 title:()=>go({name:'title'}),
 new:()=>{s=E.newGame();save();go({name:'home'});},
 'new-confirm':()=>{if(confirm('重新开始会覆盖现在的存档。确定吗？')){s=E.newGame();save();go({name:'home'});}},
 continue:()=>{s=E.load();go({name:s?.ended?'ending':'home'});},
 scene:()=>go({name:'scene',id:E.pendingScene(s)}),
 pick:async el=>{
  const id=view.id,r=E.choose(s,id,el.dataset.opt);save();view.result=r;
  if(r.actor&&PEOPLE[r.actor]&&AI.aiMode()!=='off'){r.echoWait=true;render();const echo=await AI.sceneEcho(s,r.actor,r.title,r.choice,r.text);r.echoWait=false;if(echo){r.echo=echo;}}
  render();
 },
 'scene-next':()=>{
  if(s.agenda.length)return go({name:'scene',id:E.pendingScene(s)});
  if(s.night)return monthEnd();
  go({name:'home'});
 },
 person:el=>go({name:'people',id:el.dataset.id}),
 chat:()=>go({name:'pick',kind:'chat'}),
 gift:()=>go({name:'pick',kind:'gift'}),
 'chat-with':el=>{const id=el.dataset.id;try{const c=E.beginChat(s,id);c.msgs=[{who:'npc',text:opener(id,c.letter)}];c.topics=[];save();go({name:'chat',chat:c});}catch(e){toast(e.message);}},
 topic:el=>withBusy(async()=>{const c=view.chat,t=TOPICS.find(x=>x.id===el.dataset.t);c.topics.push(t.id);c.msgs.push({who:'player',text:t.label});
  let reply=null;if(AI.aiMode()!=='off')reply=await AI.chatReply(s,c.id,c.msgs,{letter:c.letter});
  const text=reply?.reply||TOPIC_LINES[c.id][t.id];let d=E.applyChat(s,c,{affection:reply?Math.max(reply.affection,1):t.gain,memory:reply?.memory||''});
  if(t.stat&&!c.statDone){E.applyStats(s,t.stat);c.statDone=true;}
  c.msgs.push({who:'npc',text,d,mood:reply?.mood});}),
 repair:()=>withBusy(async()=>{const c=view.chat,knot=s.people[c.id].knot;c.msgs.push({who:'player',text:`说起「${knot.text}」那件事`});const line=E.repairKnot(s,c);c.msgs.push({who:'npc',text:line,d:3});toast('心结解开了');}),
 'chat-end':()=>{const c=view.chat;if(c&&c.gained)E.log(s,`召见${PEOPLE[c.id].name}，说了${c.turns}句话`,'见');else if(c)E.log(s,`召见${PEOPLE[c.id].name}`,'见');save();go({name:'home'});},
 'gift-to':el=>go({name:'gift',id:el.dataset.id}),
 give:el=>withBusy(async()=>{const id=view.id,g=el.dataset.g,r=E.giveGift(s,id,g);learn(id,g,r.liked);
  let text=null;if(AI.aiMode()!=='off')text=await AI.giftReply(s,id,GIFTS[g].name,r.liked);
  view.result={...r,gift:g,text:text||GIFT_LINES[id][r.liked?'liked':'plain']};}),
 edict:()=>go({name:'edict'}),
 fill:el=>{const ta=app.querySelector('textarea');if(ta){ta.value=PRESET_EDICTS[el.dataset.i].text;ta.focus();}},
 preset:el=>{const e=PRESET_EDICTS[el.dataset.i];const r=E.applyEdict(s,e.text,{effects:e.effects,title:e.title,narration:e.narration});save();go({name:'edict',result:{...r,title:e.title,src:e.text}});},
 outing:()=>{const r=E.goOuting(s);save();go({name:'result',result:{...r,bg:BG.garden}});},
 rest:()=>{const r=E.rest(s);save();go({name:'result',result:{...r,bg:BG.desk}});},
 done:()=>go({name:'home'}),
 night:()=>{if(s.agenda.length)return toast('先把要事办完。');if(s.ap>0&&!confirm(`还有 ${s.ap} 个时辰没用。确定入夜吗？`))return;go({name:'night'});},
 'night-go':el=>{const id=el.dataset.id||null;const line=(document.getElementById('nightLine')?.value||'').trim();
  if(id&&E.hasStory(s,id)){const sid=E.queueSpecial(s,id);save();return go({name:'scene',id:sid});}
  withBusy(async()=>{let v=null;if(id&&AI.aiMode()!=='off')v=await AI.nightScene(s,id,line);
   const lines=id?NIGHT_LINES[id]:null;const text=id?(v?.text||lines[(s.month+s.year)%lines.length]):'你让人都退下，一个人睡了。难得一夜无梦。';
   const r=E.spendNight(s,id,{affection:v?v.affection:3,memory:v?.memory||''});view.result={...r,id,text};});
 },
 'month-end':()=>monthEnd(),
 ending:()=>go({name:'ending'}),
 'ai-toggle':async()=>{if(AI.aiMode()==='off'){AI.setAIOff(false);const m=await AI.initAI();toast(m==='off'?'没有找到可用的 AI 服务。':'AI 已开启');}else{AI.setAIOff(true);await AI.initAI();toast('已改用固定文字');}render();}
};
function monthEnd(){const report=E.endMonth(s);save();go({name:'summary',report});}
function opener(id,letter){
 const p=s.people[id],n=PEOPLE[id].name;
 if(letter)return `（${n}远在${E.placeOf(s,id)}。你铺开信纸。）`;
 if(p.knot)return `${n}行了礼，站得比平日远些。「${p.knot.text}」那件事，还横在你们中间。`;
 const st=stageOf(p.aff);
 return {生分:`${n}进来行了礼，垂手站着，等你开口。`,相识:`${n}行过礼，抬眼看了看你：“皇上召见，可是有事？”`,相知:`${n}进门时带着笑：“皇上今日得空了？”`,倾心:`${n}一进来，先看你的脸色，才放心地笑了。`,相守:`${n}没等通传就进来了，在你手边坐下。`}[st];
}

async function sayHandler(text){
 const c=view.chat;if(!text||c.turns>=6)return;
 await withBusy(async()=>{c.msgs.push({who:'player',text});const r=await AI.chatReply(s,c.id,c.msgs,{letter:c.letter});
  if(!r){c.msgs.push({who:'npc',text:'（AI 没有回应：'+(AI.aiError()||'连接失败')+'。可以先用上面的话题。）'});c.msgs.at(-2).failed=true;return;}
  const d=E.applyChat(s,c,{affection:r.affection,memory:r.memory});c.msgs.push({who:'npc',text:r.reply,d,mood:r.mood});
  if(r.memory)toast(`${PEOPLE[c.id].name}记下了：${r.memory}`);});
}
async function decreeHandler(text){
 if(!text)return toast('旨意还是空的。');
 await withBusy(async()=>{const v=await AI.edictResult(s,text,CORE.filter(id=>E.present(s,id)&&s.people[id].met));
  if(!v)throw Error('旨意没能传下去：'+(AI.aiError()||'AI 未回应')+'。时辰没有用掉。');
  const r=E.applyEdict(s,text,v);view.result={...r,title:v.title,src:text,text:v.narration};});
}

app.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||el.tagName==='FORM')return;if(el.disabled)return;const f=ACTS[el.dataset.act];if(f){e.preventDefault();f(el);}});
app.addEventListener('submit',e=>{e.preventDefault();const f=e.target,t=(f.t?.value||'').trim();if(f.dataset.act==='say')sayHandler(t);else if(f.dataset.act==='decree')decreeHandler(t);
 else if(f.dataset.act==='api'){const d={url:f.url.value.trim(),model:f.model.value.trim(),key:f.key.value.trim()},rem=f.remember.checked;withBusy(async()=>{await AI.saveConnection(d,rem);toast('AI 已开启');});}});

(async()=>{render();await AI.initAI();s=E.load();render();})();
