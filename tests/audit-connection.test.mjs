import test from 'node:test';
import assert from 'node:assert/strict';
import * as AI from '../src/v2/ai.js';
import {AI_SETTINGS_KEY} from '../src/ai-connection-settings.js';
import * as E from '../src/v2/engine.js';

test('全面审计：API测试失败保留原连接，会话连接改为记住后不被旧会话覆盖', async () => {
  const oldFetch = globalThis.fetch, oldDocument = globalThis.document;
  const data = new Map();
  const storage = {getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k)};
  const used = [];
  globalThis.document = {querySelector: () => ({content: 'static'})};
  globalThis.fetch = async (url, options) => {
    used.push(url);
    if (url.includes('failed.invalid')) throw Error('模拟测试失败');
    return {ok: true, json: async () => ({choices: [{message: {content: '{"ok":true,"reply":"臣在。"}'}}]})};
  };
  const form = domain => ({url: `https://${domain}/v1`, model: 'fixture', key: 'TEST_ONLY_KEY'});
  try {
    await AI.saveConnection(form('session.invalid'), false, storage);
    assert.equal(AI.savedConnection(storage).remember, false);
    assert.equal(data.has(AI_SETTINGS_KEY), false);
    await AI.saveConnection({...form('session.invalid'), key: ''}, false, storage);
    await assert.rejects(AI.saveConnection(form('failed.invalid'), true, storage));
    const s = E.newGame(42);
    s.people.C02.met = true;
    await AI.chatReply(s, 'C02', [{who: 'player', text: '近来可好？'}]);
    assert.ok(used.at(-1).includes('session.invalid'));
    await AI.saveConnection(form('remembered.invalid'), true, storage);
    await AI.initAI(storage);
    await AI.chatReply(s, 'C02', [{who: 'player', text: '近来可好？'}]);
    assert.ok(used.at(-1).includes('remembered.invalid'));
    assert.equal(AI.savedConnection(storage).url, 'https://remembered.invalid/v1');
    assert.ok(data.get(AI_SETTINGS_KEY).includes('remembered.invalid'));
  } finally {
    globalThis.fetch = oldFetch;
    globalThis.document = oldDocument;
  }
});
