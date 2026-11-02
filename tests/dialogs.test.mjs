import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {askConfirmation} from '../src/v2/dialogs.js';

// 模拟浏览器的 dialog 关闭事件，验证取消、确认与键盘退出三条路径。
function dialogDocument() {
  const parts = new Map();
  const dialog = new EventTarget();
  dialog.querySelector = selector => {
    if (!parts.has(selector)) parts.set(selector, {focus() {this.focused = true;}});
    return parts.get(selector);
  };
  dialog.setAttribute = () => {};
  dialog.showModal = () => {dialog.open = true;};
  dialog.close = value => {
    if (value !== undefined) dialog.returnValue = value;
    dialog.open = false;
    dialog.dispatchEvent(new Event('close'));
  };
  return {getElementById: () => dialog, dialog};
}

test('B4 页面确认框展示指定文字，取消、确认和Escape分别返回正确结果', async () => {
  const doc = dialogDocument();
  const options = {title: '现在入夜？', text: '还有3个时辰没用。', cancel: '再忙一会儿', accept: '入夜'};
  const first = askConfirmation(options, doc);
  assert.equal(doc.dialog.querySelector('#modal-title').textContent, options.title);
  assert.equal(doc.dialog.querySelector('#modal-text').textContent, options.text);
  assert.equal(doc.dialog.querySelector('[data-answer="cancel"]').focused, true);
  assert.equal(await askConfirmation(options, doc), false, '不重复打开同一个确认框');
  doc.dialog.querySelector('[data-answer="cancel"]').onclick();
  assert.equal(await first, false);
  const accepted = askConfirmation(options, doc);
  doc.dialog.querySelector('[data-answer="accept"]').onclick();
  assert.equal(await accepted, true);
  const escaped = askConfirmation(options, doc);
  doc.dialog.close();
  assert.equal(await escaped, false, '按Escape关闭时不沿用上次确认');
});

test('B4 游戏代码不再调用浏览器原生confirm', async () => {
  const source = await readFile(new URL('../src/v2/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bconfirm\s*\(/);
});
