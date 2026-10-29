import{lifeRecords}from'./volume-life.js';
import{renderLifeArchive,renderLifeCoverage}from'./volume-life-ui.js';
import {NAMES} from './content.js';
import {PROJECTS,PROJECT_STATUS} from './project-content.js';
import {getEvent,dateText} from './engine.js';
import {projectRecord,projectUnlocked,projectDisplayStatus} from './projects.js';
import {itemAvailable} from './activities.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const matches=(query,...values)=>!query||values.filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase());
export function archiveCollections(s,query=''){
 const entries=s.weekly?.activities?.entries||[];
 return {
  works:entries.filter(e=>e.kind==='growth-result'&&matches(query,e.title,e.text)),
  notes:entries.filter(e=>['study','training','rest'].includes(e.kind)&&matches(query,e.title,e.text)),
  keepsakes:Object.entries(s.transcripts).filter(([,t])=>t.reward&&matches(query,NAMES[t.actor],t.title,t.reward.title,t.reward.text)).map(([key,t])=>({key,actor:t.actor,date:t.date,title:t.reward.title,text:t.reward.text})),
  items:(s.weekly?.activities?.inventory||[]).filter(i=>matches(query,i.name,NAMES[i.recipient]))
 };
}
const entryHTML=e=>`<article class="entry"><small>${esc(dateText(e.date))}</small><h3>${esc(e.title)}</h3><p class="archive-text">${esc(e.text)}</p><button class="text-btn" data-activity-entry="${e.id}">重读原文 · ${esc(e.title)}</button></article>`;
export function renderArchiveCollection(s,tab,query=''){
 const x=archiveCollections(s,query);
 if(tab==='works')return `${renderLifeArchive(s,query)}<section class="archive-collection"><h2>${s.weekly?.life?'初次练成留下的成果':'已经整理成的作品'}</h2>${x.works.map(entryHTML).join('')||'<p class="entry">尚无已经整理成的作品，练过的每一页仍留在手记里。</p>'}${x.notes.length?`<details class="archive-notes"><summary>练习手记 · ${x.notes.length}篇</summary>${x.notes.map(entryHTML).join('')}</details>`:''}</section>`;
 return `<section class="archive-collection"><h2>旧事中的信物与纪念</h2><p class="archive-hint">旧物随当时的原话留存；想赠新物，可到宫阙的匣中挑选。</p>${x.keepsakes.map(k=>`<article class="entry"><small>${esc(dateText(k.date))} · ${esc(NAMES[k.actor])}</small><h3>${esc(k.title)}</h3><p class="archive-text">${esc(k.text)}</p><button class="text-btn" data-read="${esc(k.key)}">重读那一刻 · ${esc(k.title)}</button></article>`).join('')||'<p class="entry">尚无已留下的信物与纪念。</p>'}<h2>新物的来去</h2>${x.items.map(i=>`<article class="entry"><small>${esc(dateText(i.acquiredAt))} · ${i.source.startsWith('BUY')?'采买':'亲手备制'}</small><h3>${esc(i.name)}</h3><p>${i.status==='given'?'已送给'+esc(NAMES[i.recipient]||'对方'):i.status==='in-transit'?'正在递送，尚未收到回执':itemAvailable(s,i.id)?'匣中持有，尚未送出':'仍在匣中，已留给约定'}</p></article>`).join('')||'<p class="entry">尚未添置新物。</p>'}</section>`;
}
export function chronicleProgress(s){
 const collections=archiveCollections(s),stories=Object.values(s.transcripts);
 const projects=s.weekly?Object.values(PROJECTS).filter(c=>projectUnlocked(s,c.id)).map(c=>{const p=projectRecord(s,c.id);return {id:c.id,title:c.title,status:projectDisplayStatus(s,p),report:p.reports.at(-1)||null};}):[];
 return {main:stories.filter(t=>getEvent(s,t.eventId)?.kind==='main').length,relation:stories.filter(t=>getEvent(s,t.eventId)?.kind==='relation').length,works:collections.works.length+lifeRecords(s).filter(r=>r.kind==='personal').length,activities:s.weekly?.plans.filter(p=>!p.eventId&&p.status==='completed').length||0,projects,completedProjects:projects.filter(p=>p.status==='completed'&&p.report&&!p.report.issue).length,repairProjects:projects.filter(p=>p.status==='needs-repair').length};
}
export function renderChronicleProgress(s){
 const x=chronicleProgress(s),reports=x.projects.filter(p=>p.report);
 return `${renderLifeCoverage(s)}<section class="paper-panel settings-section chronicle-progress"><h2>已经走过的路</h2><p>已记主线 ${x.main} 幕，相知 ${x.relation} 幕；走过 ${x.activities} 段日常，整理成 ${x.works} 件作品。</p><div class="button-row"><button class="text-btn" data-journal-link="works">翻看作品与手记</button><button class="text-btn" data-journal-link="keepsakes">翻看信物与纪念</button></div></section><section class="chronicle-reports"><div class="section-header"><h2>差事留下的回报</h2></div><div class="paper-panel">${reports.length?`<p class="entry">${x.completedProjects} 项已完成，${x.repairProjects} 项仍待补做。</p>${reports.map(p=>`<article class="entry"><small>${esc(dateText(p.report.date))} · ${esc(PROJECT_STATUS[p.status])}</small><h3>${esc(p.title)}</h3><p class="archive-text">${esc(p.report.text.split('\n').filter(Boolean)[0])}</p><div class="button-row"><button class="text-btn" data-project-report="${p.id}">重读这份回报 · ${esc(p.title)}</button><button class="text-btn" data-nav="court">回朝议看原簿</button></div></article>`).join('')}`:'<p class="entry">等回信到了，便将查清的那一段收进来。</p>'}</div></section>`;
}
