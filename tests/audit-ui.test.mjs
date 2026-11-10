import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/v2/engine.js';
import * as AI from '../src/v2/ai.js';
import {AUDIENCE_KEY} from '../src/v2/audience.js';
import {AI_SETTINGS_KEY} from '../src/ai-connection-settings.js';

let moduleId = 0;
const settle = () => new Promise(resolve => setImmediate(resolve));

// 用真实入口与点击分发模拟慢模型及存储故障，不向外部服务发送请求。
async function page({state, fetcher, rejectSave = () => false} = {}, run) {
  const keys = ['document', 'window', 'location', 'localStorage', 'fetch'];
  const prior = Object.fromEntries(keys.map(k => [k, globalThis[k]]));
  const data = new Map([[AUDIENCE_KEY, '{"version":1,"confirmed":true}']]);
  if (state) data.set(E.SAVE_KEY, JSON.stringify(state));
  data.set(AI.OFF_KEY, '1');
  if (fetcher) {
    data.delete(AI.OFF_KEY);
    data.set(AI_SETTINGS_KEY, JSON.stringify({version: 1, mode: 'byok', url: 'https://fixture.invalid',
      key: 'TEST_ONLY_KEY', model: 'fixture', protocol: 'chat-completions', limit: 30}));
  }
  const listeners = {};
  const app = {innerHTML: '', addEventListener(k, f) {listeners[k] = f;}, querySelector() {return null;}};
  const toast = {classList: {add() {}, remove() {}}};
  const storage = {
    getItem: k => data.get(k) ?? null,
    setItem(k, v) {if (k === E.SAVE_KEY && rejectSave()) throw Error('存储已满'); data.set(k, v);},
    removeItem: k => data.delete(k),
  };
  Object.assign(globalThis, {
    document: {getElementById: k => k === 'app' ? app : k === 'toast' ? toast : null,
      querySelector: () => ({content: 'static'}), addEventListener() {}},
    window: {scrollTo() {}}, location: {href: 'http://localhost:5497/'}, localStorage: storage,
    fetch: fetcher || (async () => {throw Error('不应发起模型请求');}),
  });
  const click = (act, extra = {}) => listeners.click({
    target: {closest: () => ({dataset: {act, ...extra}})}, preventDefault() {},
  });
  try {
    await import(`../src/v2/main.js?audit=${++moduleId}`);
    await settle();
    await run({app, click, storage, data});
  } finally {
    for (const k of keys) {
      if (prior[k] === undefined) delete globalThis[k]; else globalThis[k] = prior[k];
    }
  }
}

test('全面审计：初见首页不重复计算人数，存档失败持续提示且可恢复', async () => {
  let full = true;
  await page({rejectSave: () => full}, async ({app, click, storage}) => {
    click('new');
    assert.match(app.innerHTML, /还有 8 人/);
    assert.match(app.innerHTML, /role="alert"/);
    assert.match(app.innerHTML, /本次进度尚未保存/);
    assert.equal(storage.getItem(E.SAVE_KEY), null);
    click('go', {to: 'settings'});
    assert.match(app.innerHTML, /本次进度尚未保存/);
    full = false;
    click('save-retry');
    assert.doesNotMatch(app.innerHTML, /本次进度尚未保存/);
    assert.equal(E.load(storage).year, 1);
  });
});

test('全面审计：剧情回声等待期间不能重选或切换存档', async () => {
  let release, started = 0;
  const fetcher = async () => {
    started++;
    await new Promise(resolve => {release = resolve;});
    return {ok: true, json: async () => ({choices: [{message: {content: '{"reply":"奴才记下了。"}'}}]})};
  };
  await page({state: E.newGame(123), fetcher}, async ({app, click, storage}) => {
    click('continue'); click('scene'); click('pick', {opt: 'steady'});
    await settle();
    assert.equal(started, 1);
    const chosen = storage.getItem(E.SAVE_KEY);
    click('pick', {opt: 'verify'}); click('title'); click('new');
    assert.equal(storage.getItem(E.SAVE_KEY), chosen);
    assert.match(app.innerHTML, /养心惊梦/);
    release(); await settle(); await settle();
    assert.equal(E.load(storage).done.M01, 'steady');
    assert.equal(started, 1);
  });
});

test('全面审计：旨意回报等待期间不能重开，动态正文只落在原存档', async () => {
  const state = E.newGame(123);
  E.choose(state, 'M01', 'steady');
  state.edicts = [{n: 1, at: 1, due: 1, title: '核账', text: '请户部核账', effects: {court: 1}}];
  state.agenda = ['FU1'];
  let release;
  const fetcher = async () => {
    await new Promise(resolve => {release = resolve;});
    return {ok: true, json: async () => ({choices: [{message: {content: JSON.stringify({
      title: '核账回奏', body: '户部递来了核好的册子。',
      options: [{label: '知道了', effects: {}, reply: '册子已收好。'},
        {label: '再核一遍', effects: {}, reply: '户部领命复核。'}],
    })}}]})};
  };
  await page({state, fetcher}, async ({app, click, storage}) => {
    click('continue'); click('scene'); await settle();
    click('title'); click('new');
    assert.match(app.innerHTML, /回报|核账|正在/);
    release(); await settle(); await settle();
    const saved = E.load(storage);
    assert.equal(saved.done.M01, 'steady');
    assert.ok(saved.dyn.FU1);
  });
});

test('全面审计：人物离场结局按实际人物显示，不误写成另一人在狱中', async () => {
  const state = E.newGame(123);
  Object.assign(state, {year: 2, month: 12, ended: true, agenda: []});
  state.people.C02.met = true;
  state.flags.gone_C02 = true;
  await page({state}, async ({app, click}) => {
    click('continue');
    assert.match(app.innerHTML, /苏培盛已不在身边/);
    assert.doesNotMatch(app.innerHTML, /年羹尧在狱中/);
  });
});
