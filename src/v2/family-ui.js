import {gameDate} from './dates.js';
import * as E from './engine.js';
import * as F from './family.js';
import {KID_ART, CHILD_STAGE_NAMES} from './art.js';
import {PEOPLE, YEAR_NAME, MONTHS} from './data.js';

const esc = value => String(value ?? '').replace(/[&<>\"]/g, c =>
 ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const name = (s, id) => F.childById(s, id)?.name || PEOPLE[id]?.name || '';
const wishLabel = value => ({open: '愿意考虑', later: '暂缓', no: '不生育'})[value] || '愿意考虑';

export {gameDate} from './dates.js';

// 安胎按钮统一检查当月状态，查看近况不消耗资源。
export function careButtons(s, id) {
 const p = s.pregnancy[id];
 const blocked = s.ended || s.night || s.agenda.length || s.pendingBirth || s.familyArt?.required || p.caredAt === E.monthKey(s);
 return `<button data-act="family-care" data-id="${id}" ${blocked || s.ap < 1 ? 'disabled' : ''}>安胎 · 1 时辰</button>
  <button data-act="family-care" data-id="${id}" data-pay="yes" ${blocked || s.stats.inner < 1 ? 'disabled' : ''}>
  安胎 · 内帑 1 万两</button>`;
}

export function familyStatus(s) {
 const ids = Object.keys(s.pregnancy || {}).filter(id => s.pregnancy[id].known || s.pregnancy[id].fake);
 if (!ids.length) return '';
 return `<section class="family-status"><h3 class="sec">宫中近况</h3>${ids.map(id => {
  const p = s.pregnancy[id];
  return `<div class="card"><b>${esc(name(s, id))} · ${p.fake ? '待复核传闻' : '有喜'}</b>
   <p>${p.fake ? '太医还在复核脉案，喜讯尚未确认。' :
    `预期${esc(gameDate(p.due))}。照护 ${p.care}，风险 ${p.risk}。安胎每月一次，可用一个时辰或内帑一万两。`}</p>
   ${p.fake ? '' : careButtons(s, id)}</div>`;
 }).join('')}</section>`;
}

export function motherControls(s, id) {
 const p = s.people[id], pregnancy = s.pregnancy[id], disabled = !E.canAct(s) || E.away(s, id) || E.gone(s, id);
 const choices = [['open', '商量迎接孩子'], ['later', '商量暂缓'], ['no', '商量不生育']];
 return `<section class="card"><h3>商量生育</h3>
  <p>本人意愿：${wishLabel(p.wish)}。商量花一个时辰，每月一次。她会按自己的性格与情分答复，往后也可以再商量。</p>
  <div class="family-actions">${choices.map(([wish, label]) =>
   `<button data-act="family-wish" data-id="${id}" data-wish="${wish}" ${disabled ? 'disabled' : ''}>${label}</button>`).join('')}
  <button data-act="family-tonic" data-id="${id}" ${disabled ? 'disabled' : ''}>请温实初调养 · 1 时辰</button>
  ${id === 'C07' && !s.flags.stop_huanyi ?
   `<button data-act="family-stop" ${disabled ? 'disabled' : ''}>停用欢宜香 · 1 时辰</button>` : ''}</div>
  ${pregnancy ? `<p>${pregnancy.fake ? '传闻仍待复诊。' : pregnancy.known ?
   `孕期从${esc(gameDate(pregnancy.start))}记起，预期${esc(gameDate(pregnancy.due))}。照护 ${pregnancy.care}，风险 ${pregnancy.risk}。` :
   '起居已记录，尚待太医复诊。'}</p>${pregnancy.known && !pregnancy.fake ? careButtons(s, id) : ''}` : ''}</section>`;
}

export function childrenSection(s) {
 return `<section class="children-section"><h3 class="sec">皇嗣 · ${s.children.length}</h3>
  ${s.children.map(c => {
   const age = F.childAge(s, c), stage = F.childStage(s, c);
   const pic = KID_ART[c.art[stage] || F.defaultChildArt(stage, c.sex)], label = CHILD_STAGE_NAMES[stage];
   const note = String(c.notes.at(-1) || '平安成长').replace(/^(\d+-\d+)：/, (_, date) => gameDate(date) + '：');
   return `<article class="child-card">${pic ? `<img src="${pic.mobile}" alt="${esc(pic.description)}">` : ''}
    <div><h3>${esc(c.name)} · ${c.sex === '男' ? '皇子' : '公主'}</h3>
    <p>生母：${esc(name(s, c.mother))} · ${age}岁<br>出生：${esc(gameDate(c.born))}
    ${E.childBirthdays(s).some(x => x.id === c.id) ? ' · 本月生辰' : ''}</p>
    <p>近况：${esc(note)}</p>${c.traits.length ? `<p>性情：${c.traits.map(esc).join('、')}</p>` : ''}
    <button data-act="kid-art-open" data-id="${c.id}">更换${label}立绘</button>
    ${age >= 10 ? ['read', 'quiz'].map(kind => `<button data-act="kid-study" data-id="${c.id}" data-kind="${kind}"
     ${!E.canAct(s) ? 'disabled' : ''}>${kind === 'read' ? '读书' : '考校'} · 1 时辰</button>`).join('') : ''}</div></article>`;
  }).join('') || '<p>尚无皇嗣。按各人的心意慢慢过日子，不必为此赶进度。</p>'}</section>`;
}

// 取名与当前年龄选图独立呈现，旧年龄段的图片不会被覆盖。
export function familyWizard(s, view) {
 const birth = s.pendingBirth, child = s.familyArt && F.childById(s, s.familyArt.child);
 const stage = birth ? 'infant' : F.childStage(s, child), sex = birth?.sex || child.sex;
 const label = CHILD_STAGE_NAMES[stage], chosen = view.kidArt && KID_ART[view.kidArt];
 const pictures = Object.values(KID_ART).filter(p => p.stage === stage && p.sex === sex);
 const date = `雍正${YEAR_NAME(s.year)}年${MONTHS[s.month - 1]}`;
 return `<div class="family-wizard"><article class="paper"><small>${birth ? '宫中添喜' : '皇嗣立绘'} · ${date}</small>
  <h2>${birth ? birth.name ? `为${esc(birth.name)}挑选婴儿立绘` : '给孩子取名' : `${esc(child.name)} · ${F.childAge(s, child)}岁`}</h2>
  ${birth && !birth.name ? `<p>${esc(name(s, birth.mother))}诞下${sex === '男' ? '皇子' : '公主'}。取名后，再挑一张婴儿立绘。</p>
   <form data-act="kid-name"><label for="kidName">名字</label>
   <input id="kidName" name="t" maxlength="12" autocomplete="off" placeholder="输入名字">
   <button class="primary">就用这个名字</button></form>
   <div class="family-actions">${F.nameIdeas(sex).map(n =>
    `<button data-act="kid-name-idea" data-name="${n}">${n}</button>`).join('')}</div>` :
   `<p>点击图片预览，再确认。当前图库：${label} · ${sex === '男' ? '皇子' : '公主'}。</p>
   <div class="kid-art-grid">${pictures.map(pic => `<button data-act="kid-art-preview" data-art="${pic.id}"
    aria-pressed="${chosen?.id === pic.id}"><img src="${pic.thumb}" alt="${esc(pic.description)}">
    <span>${esc(pic.description)}</span></button>`).join('')}</div>
   ${chosen && pictures.includes(chosen) ? `<div class="kid-preview"><img src="${chosen.mobile}" alt="${esc(chosen.description)}">
    <p>${esc(chosen.description)}</p><button class="primary" data-act="kid-art-confirm">确认这张立绘</button></div>` : '<p>请先点选一张图。</p>'}
   ${s.familyArt && !s.familyArt.required ? '<button data-act="kid-art-cancel">返回人物页</button>' : ''}`}
  <button class="plain" data-act="save-export">导出这份进度</button></article></div>`;
}
