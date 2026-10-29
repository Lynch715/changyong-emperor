import {requiredEvents,availableEvents} from './engine.js';
export function courtEvents(s){return [...new Map([...requiredEvents(s),...availableEvents(s)].filter(e=>['government','followup'].includes(e.kind)&&!e.projectId).map(e=>[e.id,e])).values()];}
export function renderCourtAgenda(s,eventCard){const events=courtEvents(s);return `<section class="court-agenda"><div class="section-header"><h2>待议与回访</h2><small>眼前可办的奏报与回音</small></div><div class="paper-panel">${events.length?events.map(e=>eventCard(e,true)).join(''):'<p>眼前没有新的奏报。到了回访或下一段要紧的日子，再来核阅。</p>'}</div></section>`;}
