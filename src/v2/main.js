import {nightIdeas,REST_IDEAS,planAllowed,PLAN_NOTICE} from './plans.js';
import {PORTRAIT_IDS,placeBackground,NIGHT_BG,portraitFile} from './art.js';
import {audienceOf,confirmAge,setTenderness} from './audience.js';
import {GROUPS} from './roster.js';
import {PLACES,DESTINATIONS} from './outings.js';
import {moneyText,treasuryIndex} from './economy.js';
// 新版界面：一个状态对象 + 一个 render。点击用 data-act 分发。
import * as E from './engine.js';
import {PEOPLE,CORE,STATS,MONTHS,SEASON,CRISES,GIFTS,GIFT_LINES,TOPICS,TOPIC_LINES,NIGHT_LINES,ENDING_KINGDOM,ENDING_PEOPLE,NAMES,YEAR_NAME,portrait,thumb,bgFor,BG,stageOf,STAGES,AGENDA,ECONOMY,CAST} from './data.js';
import * as AI from './ai.js';
import {LOVER_ENDING} from './romance.js';
import {ENDING_KINGDOM2,ENDING2} from './vol2.js';
import {ENDING_KINGDOM3,ENDING3} from './vol3.js';
import {ACHIEVEMENTS,loadGallery,updateGallery} from './gallery.js';
import {rivalsOf,friendsOf} from './social.js';
import {BIRTH,BIRTH_LINES} from './festivals.js';
import {FREEDOM,fateText} from './fate.js';
const FATE_SHORT=['今天怎么说都不顺','对方不太买账','如常','对方愿意接你的话','说什么，对方都愿意听'];
const fateLine=f=>f&&!f.free?`<div class="fate t${f.tier}">${esc(fateText(f))}</div>`:'';
const bondName=id=>id==='C05'?'知己':'两情相悦';

const app=document.getElementById('app');
let s=null;            // 存档
let view={name:'title'};
let busy=false;
const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const paras=t=>String(t||'').split(/\n{1,}/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
const statValue=(k,n)=>['treasury','inner'].includes(k)?moneyText(n):n;
const statName=id=>STATS.find(x=>x.id===id)?.name||id;
const nm=id=>NAMES[id]||PEOPLE[id]?.name||'';
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
function home(){
 const pending=E.pendingScene(s),sc=pending&&E.scene(pending);
 const acts=[['chat','召见'],['gift','赏赐'],['edict','下旨'],['review','批折'],['outing','微服'],['rest','休养']];
 const ppl=CORE.filter(id=>E.present(s,id)&&s.people[id].met);
 const later=CORE.filter(id=>!E.present(s,id)||!s.people[id].met).length;
 return `${header()}
 <main class="home">
  <div class="guide"><span>${guide()}</span>${apPips()}</div>${s.nanfeng?.visit&&!s.nanfeng.visit.done?'<button class="night-btn" data-act="go" data-to="nanfeng">回到南风馆，把这盏茶喝完 ›</button>':''}
  ${E.birthdays(s).map(id=>`<div class="visit bday ${E.birthdayDone(s,id)?'done':''}">${avatar(id)}<div><small>生辰 · ${E.birthdayDone(s,id)?'你记得':'本月'}</small><b>${PEOPLE[id].name}的生辰</b><span>${E.birthdayDone(s,id)?'贺过了。':'召见、赏赐或夜里去看看，都算记得。整月不去，情分会掉。'}</span></div></div>`).join('')}
  ${(()=>{const v=E.visitOf(s);return v?`<button class="visit" data-act="visit"><img src="${face(v.id)}" alt=""><div><small>有人来了 · 不占时辰</small><b>${PEOPLE[v.id].name}来看你</b><span>${esc(v.title)}</span></div><em>迎进来 ›</em></button>`:'';})()}
  ${sc?`<button class="agenda" data-act="scene">
    <img src="${face(sc.actor)}" alt="" onerror="this.style.visibility='hidden'">
    <div><small>本月要事 · ${s.agenda.length} 件</small><b>${esc(sc.title)}</b><span>${esc(nm(sc.actor)||'')}${sc.location||sc.place?' · '+esc(sc.location||sc.place):''}</span></div>
    <em>处置 ›</em></button>`:''}
  <section class="acts ${sc?'locked':''}">
   ${acts.map(([id,t])=>`<button data-act="${id}" ${!E.canAct(s)||(id==='gift'&&s.stats.inner<.01)||(id==='outing'&&s.stats.inner<ECONOMY.outingCost)?'disabled':''}><b>${t}${((id==='gift'&&s.stats.inner<.01)||(id==='outing'&&s.stats.inner<ECONOMY.outingCost))?' · 内帑不足':''}</b></button>`).join('')}
  </section>
  <button class="night-btn ${!sc&&s.ap===0?'glow':''}" data-act="night" ${sc?'disabled':''}>入夜 ›<span>${s.ap>0&&!sc?`还剩 ${s.ap} 个时辰`:'选一处去，或独寝'}</span></button>

  <h3 class="sec">身边的人</h3>
  <section class="people">
   ${ppl.map(id=>personCard(id)).join('')}
   ${later?`<div class="pc ghost"><b>还有 ${later} 人</b><span>会在往后的日子里出现</span></div>`:''}
  </section>

  <h3 class="sec">要务</h3>
  <section class="crises">${E.ALL_CRISES.filter(c=>c.vol===(s.vol||1)).map(c=>{const st=E.crisisStatus(s,c);if(st==='later')return '';const done=c.scenes.filter(id=>s.done[id]).length;return `<div class="crisis ${st}"><b>${c.name}</b><em>${{open:'进行中',solved:'已了结',failed:'没办好'}[st]}</em><p>${esc(c.desc)}</p><div class="bar"><i style="width:${done/c.scenes.length*100}%"></i></div><small>${done}/${c.scenes.length} 步${c.goal&&st==='open'&&GOAL_TEXT[c.id]?` · ${GOAL_TEXT[c.id](s.stats)}`:''} · 期限 ${YEAR_NAME(c.deadline[0])}年${MONTHS[c.deadline[1]-1]}</small></div>`;}).join('')||'<p class="muted">眼下还没有。</p>'}</section>
 </main>
 ${nav()}`;
}
const GOAL_TEXT={deficit:x=>`国库 ${moneyText(x.treasury)}/600 万两`,eight:x=>`朝局 ${x.court}/55`,reform:x=>`民心 ${x.people}/60 · 国库 ${moneyText(x.treasury)}/470 万两`,border:x=>`朝局 ${x.court}/50`,tusi:x=>`民心 ${x.people}/55`,body:x=>`圣躬 ${x.health}/45`};
function personCard(id,act='person'){
 const p=s.people[id],st=E.affectionStage(s,id),next=STAGES.find(([n])=>n>p.aff);
 const lo=STAGES.filter(([n])=>p.aff>=n).at(-1)[0],hi=next?next[0]:100;
 const dd=s.delta.people[id]||0;
 const badge=p.knot?'<em class="knot">心结</em>':E.hasStory(s,id)?'<em class="ready">有话想说</em>':E.birthdayOf(s,id)&&!E.birthdayDone(s,id)?'<em class="ready">生辰</em>':E.away(s,id)?'<em class="away">在外</em>':p.lover?`<em class="lover">${bondName(id)}</em>`:'';
 return `<button class="pc" data-act="${act}" data-id="${id}">${avatar(id)}
  <div><b>${PEOPLE[id].name}${badge}</b><span>${st} · ${p.aff}${dd?`<i class="${dd>0?'up':'down'}">${dd>0?'+':''}${dd}</i>`:''}</span><div class="bar"><i style="width:${(p.aff-lo)/(hi-lo)*100}%"></i></div></div></button>`;
}
function nav(){return `<nav class="bottom"><button data-act="go" data-to="home" class="${view.name==='home'?'on':''}">本月</button><button data-act="go" data-to="people" class="${view.name==='people'?'on':''}">人物</button><button data-act="go" data-to="gallery" class="${['gallery','replay'].includes(view.name)?'on':''}">珍藏</button><button data-act="go" data-to="log" class="${view.name==='log'?'on':''}">起居注</button><button data-act="go" data-to="settings" class="${view.name==='settings'?'on':''}">设置</button></nav>`;}

// ---------- 场景 ----------
function sceneView(){
 if(view.loading)return `<div class="stage" style="--bg:url('${abs(BG.desk)}')"><article class="paper"><h2>回报送到了</h2><p class="muted wait">张廷玉正把各地的折子一份份摞在案上……</p></article></div>`;
 const sc=E.scene(view.id);if(!sc)return home();
 const place=sc.location||sc.place||'';
 const r=view.result;
 return `<div class="stage" style="--bg:url('${abs(bgFor(place))}')">
  <div class="stage-top"><span>${dateText(s)}</span><span>${esc(place)}</span></div>
  ${sc.actor?`${avatar(sc.actor,'portrait')}`:''}
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
 const ids=CAST.filter(id=>E.present(s,id)&&(s.people[id].met||(!PEOPLE[id].secondary&&kind==='chat')));
 return `${header()}<main class="pick"><div class="bar-title"><button data-act="go" data-to="home">‹ 返回</button><b>${kind==='chat'?'召见谁？':'赏给谁？'}</b></div>
  <section class="people">${ids.map(id=>personCard(id,kind==='chat'?'chat-with':'gift-to')).join('')}</section>
  <p class="muted center">${kind==='chat'?(E.away(s,'C03')&&ids.includes('C03')?'人在外地的，只能写信。':'每次召见最多说六句。说到心坎上，情分涨得多。'):'送对了心头好，情分 +6；寻常的 +2；同样的东西再送，只 +1；送到讨厌的，情分 −3。'}</p></main>`;
}

function chatView(){
 const c=view.chat,id=c.id,p=PEOPLE[id],st=s.people[id];
 const ai=AI.aiMode()!=='off',used=c.topics||[];
 const left=Math.max(0,6-c.turns);
 return `<div class="stage chat" style="--bg:url('${abs(bgFor(E.placeOf(s,id)))}')">
  <div class="stage-top"><button data-act="chat-end">‹ 告退</button><span>${c.letter?'书信 · ':''}${esc(E.placeOf(s,id))}</span><span class="pill">${E.affectionStage(s,id)} ${st.aff}${c.gained?` <i class="up">+${c.gained}</i>`:''}</span></div>
  ${avatar(id,'portrait')}
  <article class="paper talk">
   <h2>${p.name}<small>${E.titleOf(s,id)}${st.knot?' · <em class="knot">心结：'+esc(st.knot.text)+'</em>':''}</small></h2>
   <div class="msgs" id="msgs">${c.msgs.map(m=>`<div class="msg ${m.who}${m.tier!=null?' fate t'+m.tier:''}">${m.who==='npc'?`<b>${p.name}</b>`:''}${esc(m.text)}${m.d!=null&&m.who==='npc'?`<span class="md ${m.d>0?'up':m.d<0?'down':''}">${m.mood?esc(m.mood)+' · ':''}${m.d>0?'情分 +'+m.d:m.d<0?'情分 '+m.d:'情分不变'}</span>`:''}</div>`).join('')}${busy?`<div class="msg npc typing"><b>${p.name}</b>……</div>`:''}</div>
   ${left>0?`<div class="topics">${st.knot?`<button data-act="repair" class="repair" ${busy?'disabled':''}>说开「${esc(st.knot.text)}」那件事</button>`:''}${TOPICS.map(t=>`<button data-act="topic" data-t="${t.id}" ${used.includes(t.id)||busy?'disabled':''}>${t.label}</button>`).join('')}</div>
   ${ai?`<form class="say" data-act="say"><input name="t" maxlength="120" placeholder="${c.letter?'写几句给远方的人……':'想对'+p.name+'说什么？'}" autocomplete="off" ${busy?'disabled':''}><button ${busy?'disabled':''}>说</button></form><p class="muted small">还能说 ${left} 句。真诚的话打动人，敷衍和冒犯也会被记住。</p>`:'<p class="muted small">接入 AI 后可以随意说话。现在只能从上面挑话题。</p>'}`
   :`<p class="muted center">该说的都说了。</p>`}
   <button class="primary" data-act="chat-end">${left>0?'告退':'告退'}</button>
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
function edictView(){
 const r=view.result,ai=AI.aiMode()!=='off';
 if(r)return `<div class="stage" style="--bg:url('${abs(BG.court)}')"><article class="paper"><h2>${esc(r.title||'旨意')}</h2><div class="choice">朱批：${esc(r.src)}</div>${fateLine(r.fate)}${fateLine(r.fate)}${paras(r.text)}${chips(r.stats,r.people)}<button class="primary" data-act="done">好</button></article></div>`;
 return `<div class="stage" style="--bg:url('${abs(BG.desk)}')"><div class="stage-top"><button data-act="go" data-to="home">‹ 收起</button><span>养心殿御案</span></div><article class="paper">
  <h2>亲笔下旨</h2>
  <form class="transfer" data-act="transfer"><h4>拨银</h4><p>国库 ${moneyText(s.stats.treasury)} · 内帑 ${moneyText(s.stats.inner)}</p><p class="small">与下旨一样，用一个时辰。拨进内帑，朝局 −2；充入国库，民心 +2。</p><label>从哪里拨<select name="direction"><option value="toInner">国库 → 内帑</option><option value="toTreasury">内帑 → 国库</option></select></label><label>万两<input name="amount" type="number" min="0.01" step="0.01" value="10" required></label><button class="primary">拨银</button></form>
  ${ai?`<p class="muted">写下你想办的事，任何事都可以。它会怎样落地，有什么代价，由天下来回答。</p>
  <form class="edict" data-act="decree"><textarea name="t" maxlength="200" rows="4" placeholder="例如：在京城设十处粥厂，入冬前施粥三月。" ${busy?'disabled':''}></textarea><button class="primary" ${busy?'disabled':''}>${busy?'旨意正在传下去……':'用印'}</button></form>
  <p class="muted small">自由度：${FREEDOM[E.freedomOf(s)].name}${E.freedomOf(s)>1?'。用印前先掷骰，朝局越稳，骰运越好。':'。'}</p><p class="muted small">举几个例子：</p>`:`<p class="muted">没有接入 AI，只能从拟好的旨意里选一道。</p>`}
  <div class="options">${PRESET_EDICTS.map((e,i)=>`<button data-act="${ai?'fill':'preset'}" data-i="${i}" ${busy?'disabled':''}>${esc(e.text)}</button>`).join('')}</div>
 </article></div>`;
}

function outingsView(){return `${header()}<main><div class="bar-title"><button data-act="go" data-to="home">‹ 返回</button><b>微服去哪里？</b></div><p class="muted">选好去处才用时辰。这里的花费都走内帑。</p><section class="places">${Object.entries(PLACES).map(([id,p])=>`<button data-act="travel" data-id="${id}" ${!E.canAct(s)||s.stats.inner<p.cost?'disabled':''}><img class="place-thumb" src="${placeBackground(id,s.month,'thumb')}" loading="lazy" decoding="async" alt="${p.name}"><b>${p.name}</b><span>${p.desc}</span><small>内帑 ${moneyText(p.cost)}${s.stats.inner<p.cost?' · 内帑不足':''}</small><small>${p.hint}</small></button>`).join('')}</section></main>`;}
function nanfengView(){return `${header()}<main class="nanfeng-hall" style="--place-bg:url('${abs(placeBackground('nanfeng-interior',s.month))}')"><h3 class="sec">南风馆 · 灯下</h3><p>今夜不问姓名，只听一曲，或下一局棋。</p><section class="places">${[['N02','听雨汐弹琵琶、唱曲'],['N01','和花妍下棋、说话'],['tea','只喝茶听曲']].filter(([id])=>!s.freed[id]).map(([id,label])=>`<button data-act="company" data-id="${id}">${label}</button>`).join('')}</section><p class="muted small">入馆的银子已付过。坐定后，这一回便结束。</p></main>`;}

// ---------- 白天的小结果（微服、休养） ----------
function resultView(){const r=view.result;return `<div class="stage" style="--bg:url('${abs(r.bg||BG.garden)}')">${r.id?`<img class="portrait" src="${portrait(r.id)}" alt="">`:''}<article class="paper"><h2>${esc(r.title)}</h2>${fateLine(r.fate)}${paras(r.text)}${chips(r.stats,r.people)}<button class="primary" data-act="done">好</button></article></div>`;}

// ---------- 夜 ----------
const ideasHtml=(ideas,target)=>`<div class="plan-ideas">${ideas.map((t,i)=>`<button data-act="plan-idea" data-target="${target}" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
function restView(){const ai=AI.aiMode()!=='off';return `${header()}<main class="plan-page"><div class="bar-title"><button data-act="go" data-to="home">‹ 返回</button><b>今天想怎么歇？</b></div>
 ${busy?'<p class="wait">窗外的风慢了下来……</p>':`${ai?`${ideasHtml(REST_IDEAS,'restPlan')}<label for="restPlan">今天想怎么歇？</label><textarea id="restPlan" maxlength="200" rows="5" placeholder="写下安排，最多200字">${esc(view.draft||'')}</textarea><label for="restCompanion">请谁作陪？</label><select id="restCompanion"><option value="">独自歇着</option>${E.restCompanions(s).map(id=>`<option value="${id}" ${view.companion===id?'selected':''}>${esc(nm(id))}</option>`).join('')}</select><p class="muted small">安排会先掷骰，一档不掷。最多花内帑3万两；若没有收到回话，就照常歇着。</p><button class="primary" data-act="rest-plan">就这样歇一日</button>`:'<p>把门关上，留一日给自己。</p>'}<button data-act="rest-default">照常歇着</button>`}</main>`;}
function nightView(){
 if(view.result){const r=view.result;return `<div class="stage night" style="--bg:url('${abs(NIGHT_BG)}')">${r.id?avatar(r.id,'portrait'):''}<article class="paper"><h2>${r.id?E.placeOf(s,r.id)+' · 夜':'独寝'}</h2>${fateLine(r.fate)}${paras(r.text)}${chips(r.stats,r.people)}${notesHtml(r)}<button class="primary" data-act="month-end">天亮了 ›</button></article></div>`;}
 const list=E.nightChoices(s),ai=AI.aiMode()!=='off',id=view.id;
 return `<div class="stage night" style="--bg:url('${abs(NIGHT_BG)}')"><div class="stage-top"><button data-act="go" data-to="home">‹ 再等等</button><span>${dateText(s)} · 夜</span></div><article class="paper plan-page">
 <h2>${id?'今夜陪着'+nm(id):'今夜去哪里？'}</h2>
 ${busy?'<p class="muted center wait">灯一盏一盏亮起来……</p>':id?`${ai?`${ideasHtml(nightIdeas(id),'nightPlan')}<label for="nightPlan">今夜想和${esc(nm(id))}做些什么？</label><textarea id="nightPlan" maxlength="300" rows="5" placeholder="可以不写，最多300字">${esc(view.draft||'')}</textarea><p class="muted small">写下安排会先掷骰，一档不掷。留空就照往常过。</p>`:'<p>灯已经点上了，过去坐坐吧。</p>'}<button class="primary" data-act="night-go" data-id="${id}">过去看看</button><button data-act="night-select" data-id="">再选一处</button>`:`<section class="people">${list.map(x=>`<button class="pc" data-act="night-select" data-id="${x.id}">${avatar(x.id)}<div><b>${PEOPLE[x.id].name}${x.special?'<em class="ready">有话想说</em>':x.knot?'<em class="knot">心结</em>':''}</b><span>${E.placeOf(s,x.id)} · ${stageOf(s.people[x.id].aff)}</span></div></button>`).join('')}<button class="pc" data-act="night-go" data-id=""><div><b>独寝</b><span>一个人睡，圣躬 +3</span></div></button></section><p class="muted small">“有话想说”的人，今夜会有一段新剧情。</p>`}
 </article></div>`;
}

// ---------- 月末 ----------
function summaryView(){
 const r=view.report;
 const next=s.ended?0:s.agenda.length;
 return `<div class="stage" style="--bg:url('${abs(BG.desk)}')"><article class="paper summary">
  <h2>${YEAR_NAME(r.y)}年${MONTHS[r.m-1]} · 月末</h2>
  <h4>这个月</h4>${chips(r.stats,r.people)||'<p class="muted">风平浪静。</p>'}
  <p class="muted small">${['treasury','inner'].map(k=>`${statName(k)}：进 ${moneyText(r.ledger[k].in)}，出 ${moneyText(r.ledger[k].out)}，余 ${moneyText(r.balances[k])}`).join('<br>')}<br>${r.cooled.length?`<br>${r.cooled.map(nm).join('、')}这个月没见到你，情分淡了一点。`:''}${r.forgot?.length?`<br>${r.forgot.map(nm).join('、')}的生辰，你没有去。情分 −3。`:''}</p>
  ${r.crises.filter(c=>c.status!=='later').map(c=>`<div class="crisis mini ${c.status}"><b>${c.name}</b><em>${{open:'进行中',solved:'已了结',failed:'没办好'}[c.status]}</em></div>`).join('')}
  ${s.ended?`<button class="primary" data-act="ending">${['两年过去了','四年过去了','六年过去了'][(s.vol||1)-1]} ›</button>`:`<h4>下个月</h4><p>${dateText(s)}${next?`，有 ${next} 件要事。`:'，暂无要事。'}</p>${E.birthdays(s).length?`<p class="new">下个月是${E.birthdays(s).map(nm).join('、')}的生辰。</p>`:''}${CORE.filter(id=>E.present(s,id)&&!s.people[id].met&&PEOPLE[id].from[0]===s.year&&PEOPLE[id].from[1]===s.month).map(id=>`<p class="new">新面孔：${PEOPLE[id].name}（${PEOPLE[id].title}）</p>`).join('')}<button class="primary" data-act="go" data-to="home">进入${MONTHS[s.month-1]} ›</button>`}
 </article></div>`;
}

// ---------- 结局 ----------
function endingView(){
 const vol=s.vol||1,v2=vol>=2,K=[ENDING_KINGDOM,ENDING_KINGDOM2,ENDING_KINGDOM3][vol-1];
 const e=E.ending(s),low=Math.min(treasuryIndex(s),...['people','court','palace','health'].map(k=>s.stats[k])),k=K.find((x,i)=>e.score>=x.min&&!(i===0&&low<40)&&!(i===1&&low<20))||K.at(-1);
 const text=p=>{if(p.gone)return '年羹尧在狱中。他托人带出一句话：臣不怨皇上。只是这一句话，比怨更让你睡不着。';if(vol===3)return ENDING3[p.id][p.tier];if(v2)return ENDING2[p.id][p.tier];return p.tier===3?LOVER_ENDING[p.id]:ENDING_PEOPLE[p.id][Math.min(p.tier,2)];};
 const label=p=>p.gone?'狱中':p.tier===3?(p.id==='C05'?'知己':'相守'):stageOf(p.aff);
 return `<div class="stage" style="--bg:url('${abs(BG.court)}')"><article class="paper ending">
  <small>雍正${['二','四','六'][vol-1]}年 · 岁末</small><h2>${k.title}</h2>${paras(k.text)}
  <div class="chips">${STATS.map(x=>`<span class="chip">${x.name} ${statValue(x.id,s.stats[x.id])}</span>`).join('')}<span class="chip">了结要务 ${e.solved}/3</span></div>
  <h4>他们</h4>
  ${e.people.map(p=>`<div class="end-p"><img src="${face(p.id)}" alt=""><div><b>${PEOPLE[p.id].name} · ${label(p)}</b><p>${esc(text(p))}</p></div></div>`).join('')}
  ${vol===3?`<p class="muted center">第三卷完。后面的故事，还在写。</p><button class="primary" data-act="rebirth">再活一世 ›</button><p class="muted small center">带着一样记忆，回到雍正元年正月。</p><button data-act="new-confirm" class="plain">从头再来</button>`
   :`<p class="muted center">第${vol===2?'二':'一'}卷完。</p><button class="primary" data-act="${vol===2?'vol3':'vol2'}">进入第${vol===2?'三卷：雍正五年':'二卷：雍正三年'} ›</button><p class="muted small center">存档、情分和他们记得的事，都会带过去。</p><button data-act="rebirth" class="plain">再活一世</button> <button data-act="new-confirm" class="plain">从头再来</button>`}
 </article></div>`;
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
function peopleView(){
 const id=view.id;
 if(id){const p=PEOPLE[id],st=s.people[id],known=likedList(id);return `${header()}<main class="person"><div class="bar-title"><button data-act="go" data-to="people">‹ 人物</button><b>${p.name}</b></div>
  <div class="person-hero">${avatar(id,'person-face')}<div><h2>${p.name}</h2><p>${E.titleOf(s,id)} · ${E.placeOf(s,id)}</p><p class="small">${p.category||'故人'} · 能力 ${st.ability}/10 · 忠诚 ${st.loyalty}/100 · ${esc(st.faction)}</p>${p.desc?`<p class="small">${esc(p.desc)}</p>`:''}<p class="big">${E.affectionStage(s,id)} <b>${st.aff}</b></p>
   <div class="stages">${STAGES.map(([n,t])=>`<span class="${st.aff>=n?'on':''}">${p.secondary?({0:'生疏',25:'相识',45:'信任',65:'亲近',85:'深信'})[n]:t}</span>`).join('')}</div>
   ${st.knot?`<p class="knot-line">心结：${esc(st.knot.text)}。召见时说开它。</p>`:''}
   ${st.lover?`<p class="ready-line">${bondName(id)}</p>`:''}
   ${E.hasStory(s,id)?`<p class="ready-line">有话想对你说。${E.away(s,id)?'会有书信来。':'今夜去看看。'}</p>`:st.first&&!st.second&&st.aff<45?'<p class="muted small">情分到「相知」后，会有新的剧情。</p>':st.second&&!st.third&&st.aff<65?'<p class="muted small">情分到「倾心」后，还有一段剧情。</p>':st.third&&!st.fourth&&s.year>=3&&st.aff<75?'<p class="muted small">情分到 75，还会有一段剧情。</p>':st.fourth&&!st.fifth&&s.year>=5&&st.aff<80?'<p class="muted small">情分到 80，还有最后一段剧情。</p>':''}
   ${(()=>{const rel=[...rivalsOf(id).map(x=>`<span class="rel bad">与${PEOPLE[x].name}不和</span>`),...friendsOf(id).map(x=>`<span class="rel good">与${PEOPLE[x].name}亲近</span>`)];return rel.length?`<p class="rels">${rel.join('')}</p>`:'';})()}
   ${BIRTH[id]||p.birth?`<p class="muted small">生辰：${MONTHS[(BIRTH[id]||p.birth)-1]}</p>`:''}<p class="muted small">喜欢：${known.length?known.map(g=>GIFTS[g].name).join('、'):'还不知道'}</p></div></div>
  <div class="person-actions"><button data-act="chat-with" data-id="${id}" ${!E.canAct(s)||E.gone(s,id)?'disabled':''}>${E.away(s,id)?'写信':'召见'}</button>${E.appointmentOptions(s,id).length?`<button data-act="appoint-open" ${!E.canAct(s)||E.gone(s,id)?'disabled':''}>任命 / 调整位分</button>`:''}</div>
  <h3 class="sec">任命旧事</h3><ul class="mem">${(s.appointmentHistory[id]||[]).slice().reverse().map(a=>`<li><small>${YEAR_NAME(a.year)}年${MONTHS[a.month-1]}</small>${esc(a.from?a.from+' → '+a.to:a.to)}<br><small>${esc(a.source)}</small></li>`).join('')}</ul>
  <h3 class="sec">${p.name}记得的事</h3>
  <ul class="mem">${st.memories.slice().reverse().map(m=>`<li><small>${YEAR_NAME(m.y)}年${MONTHS[m.m-1]}</small>${esc(m.text)}</li>`).join('')||'<li class="muted">还没有。</li>'}</ul>${view.appoint?appointmentDialog(id):''}</main>${nav()}`;}
 return `${header()}<main><h3 class="sec">人物</h3>${Object.entries(GROUPS).map(([name,categories])=>{const ids=CAST.filter(id=>categories.includes(PEOPLE[id].category)&&E.present(s,id)&&s.people[id].met);return `<details class="people-group" open><summary>${name} · ${ids.length}</summary><section class="people">${ids.map(id=>personCard(id)).join('')||'<p class="muted">还没有相识的人。</p>'}</section></details>`;}).join('')}</main>${nav()}`;
}
function appointmentDialog(id){return `<dialog class="appointment-modal" open aria-label="为${esc(nm(id))}安排职司"><button data-act="appoint-close">收起</button><h3>${esc(nm(id))} · 任命</h3><p>每次用一个时辰。满员时，先腾出空位。</p><div class="options">${E.appointmentOptions(s,id).map(o=>`<button data-act="appoint" data-id="${id}" data-office="${o.office}" ${o.reason?'disabled':''}>${o.title}${o.reason?`<small> · ${esc(o.reason)}</small>`:''}</button>`).join('')}</div></dialog>`;}
function logView(){
 const items=s.log.slice().reverse();
 return `${header()}<main><h3 class="sec">起居注</h3><ul class="log">${items.map(l=>`<li><small>${YEAR_NAME(l.y)}年${MONTHS[l.m-1]}</small><em>${l.kind}</em>${esc(l.text)}</li>`).join('')||'<li class="muted">还没有记录。</li>'}</ul></main>${nav()}`;
}
function settingsView(){
 const m=AI.aiMode();
 return `${header()}<main class="settings"><h3 class="sec">设置</h3>
  <div class="card"><b>成人描写</b><label class="audience-toggle"><input type="checkbox" data-pref="tenderness" ${audienceOf().tenderness?'checked':''}> 直白描写亲密场景</label><p>夜里、休养作陪、与恋人私下召见时，AI 可以直白描写两人的亲密。仅限后宫、恋人与南风馆两位，宗室、太后、大臣不在内；人物始终可以婉拒。需要你用的 AI 服务允许这类内容，否则会自动退回固定文字。关掉后回到含蓄写法。</p></div>
  <div class="card"><b>AI 对话</b><p>不同服务的写法会有差别；若没有收到可用的回话，就用固定文字继续。</p><p>${m==='server'?'已连接本机的 AI 服务。':m==='byok'?'正在使用你填写的 API。':'未开启。召见只能挑话题，旨意只能选拟好的。'}</p>
  ${AI.aiError()?`<p class="muted small">上次出错：${esc(AI.aiError())}</p>`:''}
  <button data-act="ai-toggle">${m==='off'?'尝试开启 AI':'关闭 AI，改用固定文字'}</button></div>
  ${m!=='server'?(()=>{const c=AI.savedConnection();return `<form class="card api" data-act="api"><b>使用自己的 API</b><p class="small">默认 DeepSeek。密钥只存在这台设备的浏览器里，不进存档。</p>
   <label>地址<input name="url" value="${esc(c.url)}"></label><label>模型<input name="model" value="${esc(c.model)}"></label><label>密钥<input name="key" type="password" placeholder="${c.key?'已保存，留空不改':'sk-……'}" autocomplete="off"></label>
   <label class="chk"><input type="checkbox" name="remember" checked> 记住在这台设备上</label><button ${busy?'disabled':''}>${busy?'正在测试……':'测试并启用'}</button></form>`;})():''}
  ${s?`<div class="card freedom"><b>自由度</b><p>决定 AI 推演听不听你的。下旨、召见时亲口说的话、夜里的第一句会用到。没开 AI 时不起作用。</p>${[1,2,3].map(l=>`<button data-act="freedom" data-l="${l}" class="${E.freedomOf(s)===l?'on':''}"><b>${l} 档 · ${FREEDOM[l].name}</b><span>${FREEDOM[l].desc}</span></button>`).join('')}</div>`:''}
  <div class="card"><b>存档</b><p>每个动作后自动保存在这台设备的浏览器里。</p>${s?'<button data-act="new-confirm">重新开始</button> ':''}<button data-act="title">回到标题</button></div>
 </main>${s?nav():''}`;
}
function ageView(){return `<div class="title-screen" style="--bg:url('${abs(BG.desk)}')"><div class="title-box"><h1>入卷之前</h1><p>本游戏含成熟题材，仅供年满 18 周岁者游玩。</p><button class="primary" data-act="age-confirm">我已年满 18 周岁</button><button data-act="age-leave">离开</button>${view.left?'<p class="small">已停在此处。你可以关闭这个页面。</p>':''}</div></div>`;}
function titleView(){
 const has=!!E.load();
 return `<div class="title-screen" style="--bg:url('${abs('assets/exports/s11-v1/cover-display.webp')}')"><div class="title-box">
  <h1>重生长雍<br>帝王赋</h1><p>雍正元年正月。你从死里醒来，那些后来再也挽回不了的人，此刻都还在。</p>
  ${has?'<button class="primary" data-act="continue">继续</button>':''}
  <button class="${has?'':'primary'}" data-act="${has?'new-confirm':'new'}">新开一局</button>
  <p class="muted small">${(()=>{const L=has&&E.load();return (L?.life>1?`第${L.life}世 · `:'')+['第一卷 · 元年至二年','第二卷 · 三年至四年','第三卷 · 五年至六年'][(L?.vol||1)-1];})()} · 每卷约一小时 · AI ${AI.aiMode()==='off'?'未开启':'已开启'} · <a href="#" data-act="go" data-to="settings">设置</a></p>
  <details class="how"><summary>怎么玩</summary><p>一个月是一回合。月初先处置要事；然后有三个时辰，可以召见、赏赐、下旨、批折、微服或休养；入夜选一处去，或独寝。月末结算。</p><p>情分到「相知」，那个人会在夜里有话想说；到「倾心」，还有一次说破心意的机会。若你在两难里没站在谁那边，那人会有心结，要当面说开。</p><p>两年为一卷，共三卷，存档和情分一路带下去。每月有人过生辰，年节可以选一个人陪着过。走完任何一卷，都可以带着一样记忆“再活一世”。</p><p>设置里有三档自由度：一档言出法随；二档、三档在下旨和亲口说话前先掷骰，大吉照你写的走，大凶对方会找理由回绝。</p></details>
 </div></div>`;
}

const KIND_NAME={deep5:'深情',festival:'节',main:'主线',relation:'情',extension:'情',romance:'心意',deep:'深情',dilemma:'两难',government:'政务',followup:'政务',side:'宫中'};
function galleryView(){
 const g=loadGallery(),n=Object.keys(g.ach||{}).length;
 const seen=Object.entries(g.seen||{}).map(([id,opt])=>({id,opt,sc:E.scene(id)})).filter(x=>x.sc&&x.sc.kind&&KIND_NAME[x.sc.kind]);
 return `${header()}<main class="gallery"><h3 class="sec">成就 <small>${n}/${ACHIEVEMENTS.length}</small></h3>
  <section class="achs">${ACHIEVEMENTS.map(a=>{const got=g.ach?.[a.id];return `<div class="ach ${got?'got':''}"><i>${got?a.icon:'?'}</i><b>${got?a.title:'？？？'}</b><span>${esc(a.desc)}</span></div>`;}).join('')}</section>
  <h3 class="sec">看过的剧情 <small>${seen.length}</small></h3>
  <section class="replays">${seen.map(x=>`<button data-act="replay" data-id="${x.id}"><em>${KIND_NAME[x.sc.kind]}</em><b>${esc(x.sc.title)}</b><span>${esc(nm(x.sc.actor))}</span></button>`).join('')||'<p class="muted">还没有。</p>'}</section>
  <p class="muted small center">珍藏跨存档保留在这台设备上，重开一局也不会丢。</p>
 </main>${s?nav():''}`;
}
function replayView(){
 const sc=E.scene(view.id),opt=loadGallery().seen?.[view.id],o=sc.options.find(x=>x.id===opt);
 return `<div class="stage" style="--bg:url('${abs(bgFor(sc.location||sc.place||''))}')"><div class="stage-top"><button data-act="go" data-to="gallery">‹ 珍藏</button><span>回看</span></div>
  ${PEOPLE[sc.actor]||sc.actor?`<img class="portrait" src="${portrait(sc.actor)}" alt="">`:''}
  <article class="paper"><h2>${esc(sc.title)}</h2>${paras(sc.body)}${o?`<div class="choice">那一回，你选择：${esc(o.label.replace('{n}',nm(o.who)))}</div>${paras(o.reply||'')}`:''}
  <button class="primary" data-act="go" data-to="gallery">合上</button></article></div>`;
}
const STAGE_LINE={相识:'开始记得你了。',相知:'愿意跟你说心里话了。',倾心:'动心了。',相守:'这一世，不会再错过了。'};
function celebration(){
 const c=s?.cele?.[0];if(!c)return '';
 let img='',big='',small='',cls='';
 if(c.k==='stage'){img=PEOPLE[c.id].secondary?'':portrait(c.id);big=`${PEOPLE[c.id].name} · ${c.stage}`;small=(PEOPLE[c.id].secondary?'愿意把心里话告诉你了。':STAGE_LINE[c.stage]||'')+(E.hasStory(s,c.id)?`<br><span>今夜去找${PEOPLE[c.id].name}，会有新的剧情。</span>`:['相知','倾心'].includes(c.stage)?`<br><span>等名字旁出现「有话想说」，夜里去找${PEOPLE[c.id].name}。</span>`:'');cls='stage-up';}
 else if(c.k==='lover'){img=PEOPLE[c.id].secondary?'':portrait(c.id);big=c.id==='C05'?'知己':'两情相悦';small=c.id==='C05'?'这一世，你多了一个知己。':`你和${PEOPLE[c.id].name}，说破了心意。`;cls='lover';}
 else if(c.k==='fifth'){img=PEOPLE[c.id].secondary?'':portrait(c.id);big=`${PEOPLE[c.id].name} · 第五幕`;small='这一段，你们一起走完了。';cls='lover';}
 else if(c.k==='knot'){img=PEOPLE[c.id].secondary?'':portrait(c.id);big='心结解开了';small=`${PEOPLE[c.id].name}的情分又能涨了。`;}
 else if(c.k==='crisis'){big='要务了结';small=c.name;cls='gold';}
 else if(c.k==='crisisFail'){big='要务没办好';small=`${c.name}。不要紧，路还长。`;cls='sad';}
 else if(c.k==='ach'){big=`${c.a.icon}`;small=`成就解锁 · ${c.a.title}<br><span>${esc(c.a.desc)}</span>`;cls='ach-pop';}
 return `<div class="cele ${cls}" data-act="cele">${img?`<img src="${img}" alt="">`:''}<div class="cele-box"><b>${big}</b><p>${small}</p><small>点一下继续</small></div></div>`;
}
const VIEWS={rest:restView,outings:outingsView,nanfeng:nanfengView,rebirth:rebirthView,gallery:galleryView,replay:replayView,title:titleView,home,scene:sceneView,pick:()=>pickPerson(view.kind),chat:chatView,gift:giftView,edict:edictView,result:resultView,night:nightView,summary:summaryView,ending:endingView,people:peopleView,log:logView,settings:settingsView};
let lastVibration=null;
function render(){if(!audienceOf().confirmed){app.innerHTML=ageView();return;}const c=s?.cele?.[0];if(c!==lastVibration){lastVibration=c;if(c&&['stage','lover'].includes(c.k)){try{globalThis.navigator?.vibrate?.(30);}catch{}}}app.innerHTML=(VIEWS[view.name]||home)()+(['home','summary','people','gallery','ending'].includes(view.name)&&!busy?celebration():'');const m=document.getElementById('msgs');if(m)m.scrollTop=m.scrollHeight;if(view.name==='chat'&&!busy)app.querySelector('.say input')?.focus();}
function go(v){view=v;render();window.scrollTo(0,0);}

// ---------- 动作 ----------
async function withBusy(fn){if(busy)return;busy=true;render();try{await fn();}catch(e){toast(e.message||String(e));}finally{busy=false;save();render();}}
function learn(id,g,liked){s.known=s.known||{};const k=s.known[id]=s.known[id]&&!Array.isArray(s.known[id])?s.known[id]:{};k[g]=liked;}
const likedList=id=>Object.entries(s.known?.[id]||{}).filter(([,v])=>v).map(([g])=>g);

const ACTS={
 'age-confirm':async()=>{try{confirmAge();await AI.initAI();s=E.load();go({name:'title'});}catch{toast('没有记住年龄确认，请检查浏览器是否允许保存。');}},
 'age-leave':()=>{view.left=true;render();},
 vol2:()=>{E.startVolume2(s);save();go({name:'home'});},
 vol3:()=>{E.startVolume3(s);save();go({name:'home'});},
 rebirth:()=>go({name:'rebirth'}),
 freedom:el=>{E.setFreedom(s,el.dataset.l);save();toast('自由度：'+FREEDOM[s.freedom].name);render();},
 boon:el=>{s=E.newGamePlus(s,el.dataset.b);save();toast(`第${s.life}世`);go({name:'home'});},
 go:el=>{const to=el.dataset.to;if(to==='home'&&s.ended&&!view.report)return go({name:'ending'});go({name:to});},
 title:()=>go({name:'title'}),
 new:()=>{s=E.newGame();save();go({name:'home'});},
 'new-confirm':()=>{if(confirm('重新开始会覆盖现在的存档。确定吗？')){s=E.newGame();save();go({name:'home'});}},
 continue:()=>{s=E.load();go({name:s?.ended?'ending':'home'});},
 scene:()=>openScene(E.pendingScene(s)),
 pick:async el=>{
  const id=view.id,r=E.choose(s,id,el.dataset.opt);save();view.result=r;
  if(r.actor&&PEOPLE[r.actor]&&AI.aiMode()!=='off'){r.echoWait=true;render();const echo=await AI.sceneEcho(s,r.actor,r.title,r.choice,r.text);r.echoWait=false;if(echo){r.echo=echo;}}
  render();
 },
 'scene-next':()=>{
  if(s.agenda.length)return openScene(E.pendingScene(s));
  if(s.night)return monthEnd();
  go({name:'home'});
 },
 person:el=>go({name:'people',id:el.dataset.id}),
 'appoint-open':()=>{view.appoint=true;render();},
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
 cele:()=>{s.cele.shift();E.save(s);render();},
 replay:el=>go({name:'replay',id:el.dataset.id}),
 rest:()=>go({name:'rest'}),
 'rest-default':()=>{const r=E.rest(s);save();go({name:'result',result:{...r,bg:BG.desk}});},
 'plan-idea':el=>{const ta=document.getElementById(el.dataset.target);if(ta){ta.value=(el.dataset.target==='restPlan'?REST_IDEAS:nightIdeas(view.id))[+el.dataset.i];ta.focus();}},
 'rest-plan':()=>{const plan=(document.getElementById('restPlan')?.value||'').trim(),companion=document.getElementById('restCompanion')?.value||null;if(!plan)return toast('写个安排，或选“照常歇着”。');if(!planAllowed(plan,companion))return toast(PLAN_NOTICE);view.draft=plan;view.companion=companion;
  withBusy(async()=>{const fate=E.rollFate(s,'rest',companion),v=await AI.restScene(s,plan,{companion,fate});const r=v?E.plannedRest(s,plan,{...v,companion,fate}):E.rest(s);view={name:'result',result:{...r,bg:BG.garden}};});},
 review:()=>{const r=E.review(s);save();go({name:'result',result:{...r,bg:BG.desk}});},
 done:()=>{if(s.nanfeng?.visit&&!s.nanfeng.visit.done)return go({name:'nanfeng'});afterAction();},
 night:()=>{if(s.nanfeng?.visit&&!s.nanfeng.visit.done)return go({name:'nanfeng'});if(s.agenda.length)return toast('先把要事办完。');if(s.ap>0&&!confirm(`还有 ${s.ap} 个时辰没用。确定入夜吗？`))return;go({name:'night'});},
 'night-select':el=>go({name:'night',id:el.dataset.id||null}),
 'night-go':el=>{const id=el.dataset.id||null,line=AI.aiMode()==='off'?'':(document.getElementById('nightPlan')?.value||'').trim();
  if(!planAllowed(line,id,s))return toast(PLAN_NOTICE);view.draft=line;
  if(id&&!line&&E.hasStory(s,id)){const sid=E.queueSpecial(s,id);save();return go({name:'scene',id:sid});}
  withBusy(async()=>{let v=null,fate=null;if(id&&AI.aiMode()!=='off'){if(line)fate=E.rollFate(s,'night',id);v=await AI.nightScene(s,id,line,fate);}
   const lines=id?NIGHT_LINES[id]:null,bad=fate&&!fate.free&&fate.tier<=1;const text=id?(v?.text||(bad?'对方告了罪，你让人添了热茶。灯下坐了一会儿，便各自歇下。':lines[(s.month+s.year)%lines.length])):'你让人都退下，一个人睡了。难得一夜无梦。';
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
 const c=view.chat;if(!text||c.turns>=6)return;
 await withBusy(async()=>{c.msgs.push({who:'player',text});if(!c.fate){c.fate=E.rollFate(s,'chat',c.id);if(!c.fate.free)c.msgs.push({who:'sys',tier:c.fate.tier,text:fateText(c.fate)+'：'+FATE_SHORT[c.fate.tier]});}const r=await AI.chatReply(s,c.id,c.msgs,{letter:c.letter,fate:c.fate});
  if(!r){c.msgs.push({who:'npc',text:'（AI 没有回应：'+(AI.aiError()||'连接失败')+'。可以先用上面的话题。）'});c.msgs.at(-2).failed=true;return;}
  const d=E.applyChat(s,c,{affection:r.affection,memory:r.memory});c.msgs.push({who:'npc',text:r.reply,d,mood:r.mood});
  if(r.memory)toast(`${PEOPLE[c.id].name}记下了：${r.memory}`);});
}
async function decreeHandler(text){
 if(!text)return toast('旨意还是空的。');
 await withBusy(async()=>{const fate=E.rollFate(s,'edict');const v=await AI.edictResult(s,text,CAST.filter(id=>E.present(s,id)&&s.people[id].met),fate);
  if(!v)throw Error('旨意没能传下去：'+(AI.aiError()||'AI 未回应')+'。时辰没有用掉。');
  const r=E.applyEdict(s,text,{...v,fate});view.result={...r,title:v.title,src:text,text:v.narration,fate};});
}

app.addEventListener('error',e=>{const img=e.target;if(img.tagName!=='IMG'||!img.dataset.person)return;const id=img.dataset.person,span=document.createElement('span');span.className='avatar '+img.className;span.textContent=(PEOPLE[id]?.name||'人')[0];span.setAttribute('aria-label',nm(id));(img.closest('picture')||img).replaceWith(span);},true);
app.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el||el.tagName==='FORM')return;if(el.disabled)return;const f=ACTS[el.dataset.act];if(f){e.preventDefault();f(el);}});
app.addEventListener('change',e=>{if(e.target.dataset.pref==='tenderness'){try{setTenderness(e.target.checked);}catch(err){toast(err.message);render();}}});
app.addEventListener('submit',e=>{e.preventDefault();if(!audienceOf().confirmed)return;const f=e.target,t=(f.t?.value||'').trim();if(f.dataset.act==='transfer'){try{const r=E.transferFunds(s,f.direction.value,f.amount.value);save();go({name:'result',result:r});}catch(e){toast(e.message);}}else if(f.dataset.act==='say')sayHandler(t);else if(f.dataset.act==='decree')decreeHandler(t);
 else if(f.dataset.act==='api'){const d={url:f.url.value.trim(),model:f.model.value.trim(),key:f.key.value.trim()},rem=f.remember.checked;withBusy(async()=>{await AI.saveConnection(d,rem);toast('AI 已开启');});}});

(async()=>{render();if(!audienceOf().confirmed)return;await AI.initAI();s=E.load();render();})();

// iOS Safari 不认 user-scalable=no：拦下双指缩放和双击放大；输入框收起后把页面放回原位
(()=>{const d=globalThis.document;if(!d?.addEventListener)return;
 for(const ev of ['gesturestart','gesturechange','gestureend'])d.addEventListener(ev,e=>e.preventDefault(),{passive:false});
 d.addEventListener('touchmove',e=>{if(e.touches&&e.touches.length>1)e.preventDefault();},{passive:false});
 let last=0;d.addEventListener('touchend',e=>{const now=Date.now();if(now-last<300&&!e.target?.closest?.('input,textarea,select,button'))e.preventDefault();last=now;},{passive:false});
 d.addEventListener('focusout',e=>{if(e.target?.matches?.('input,textarea'))setTimeout(()=>{if(!d.activeElement?.matches?.('input,textarea'))globalThis.scrollTo?.(0,globalThis.scrollY||0);},50);});
})();
