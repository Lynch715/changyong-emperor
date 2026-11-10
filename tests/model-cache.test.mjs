import test from 'node:test';
import assert from 'node:assert/strict';
import {callModel, modelUsage} from '../src/v2/model.js';

test('缓存用量：兼容提供商返回的命中字段，缺失用量不伪造百分比', () => {
  assert.deepEqual(modelUsage({usage: {prompt_tokens: 1000, prompt_cache_hit_tokens: 750, completion_tokens: 100}}),
    {inputTokens: 1000, cachedTokens: 750, outputTokens: 100, hitRate: .75});
  assert.equal(modelUsage({usage: {input_tokens: 200, input_tokens_details: {cached_tokens: 100}}}).hitRate, .5);
  assert.equal(modelUsage({}).hitRate, null);
  assert.equal(modelUsage({usage: {prompt_tokens: 20}}).cachedTokens, null);
});

test('缓存用量：仍逐次调用模型，返回最新输出，不把游戏回复按文本缓存', async () => {
  let n = 0, usage;
  const fetcher = async () => ({ok: true, json: async () => ({
    choices: [{message: {content: JSON.stringify({turn: ++n})}}],
    usage: {prompt_tokens: 1000, prompt_cache_hit_tokens: 800, completion_tokens: 10},
  })});
  const config = {base: 'https://fixture.invalid', model: 'fixture', key: 'test'};
  const a = await callModel(config, fetcher, '固定规则', '同一句话', {onUsage: v => {usage = v;}});
  const b = await callModel(config, fetcher, '固定规则', '同一句话');
  assert.deepEqual(a, {turn: 1}); assert.deepEqual(b, {turn: 2});
  assert.equal(usage.hitRate, .8);
});
