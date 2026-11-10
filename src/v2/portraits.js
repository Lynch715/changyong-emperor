import {PORTRAIT_IDS, portraitFile} from './art.js';

const esc = value => String(value ?? '').replace(/[&<>\"]/g, c =>
 ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// 小头像在圆框内显示头肩构图，舞台和人物页仍保留完整立绘。
export function portraitMarkup(id, cls, label) {
 if (!PORTRAIT_IDS.has(id)) return `<span class="avatar ${cls}" aria-label="${esc(label)}">${esc(label?.[0] || '人')}</span>`;
 const full = ['portrait', 'person-face'].includes(cls), role = 'mobile';
 return `<picture class="portrait-media ${full ? '' : 'headshot'}">
  <source type="image/webp" srcset="${portraitFile(id, role)}">
  <img class="${cls}" data-person="${id}" src="${portraitFile(id, role, 'png')}"
   loading="${cls === 'portrait' ? 'eager' : 'lazy'}" decoding="async" alt="${esc(label)}"></picture>`;
}
