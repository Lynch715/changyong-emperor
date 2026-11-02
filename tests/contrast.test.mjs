import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// 用相对亮度计算文字与底色的实际对比度。
function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(pair => parseInt(pair, 16) / 255);
  const linear = rgb.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}

test('D4 全部数值标签配色对比度至少4.5，情分涨跌分别使用绿色与红色', async () => {
  const css = await readFile(new URL('../src/v2/v2.css', import.meta.url), 'utf8');
  const variables = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(m => [m[1], m[2]]));
  for (const selector of ['.chip', '.chip.up', '.chip.down', '.chip.heart.up', '.chip.heart.down', '.chip.knot']) {
    const rule = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].find(m =>
      m[1].trim() === selector && m[2].includes('background:'))?.[2];
    assert.ok(rule, selector);
    const resolve = token => token.startsWith('var') ? variables[token.slice(6, -1)] : token;
    const background = resolve(rule.match(/background:(#[\da-f]{6}|var\(--[^)]+\))/i)[1]);
    const foreground = resolve(rule.match(/(?:^|;)color:(#[\da-f]{6}|#[\da-f]{3}|var\(--[^)]+\))/i)[1]);
    const normalized = foreground.length === 4 ? '#' + [...foreground.slice(1)].map(c => c + c).join('') : foreground;
    const values = [luminance(background), luminance(normalized)].sort((a, b) => b - a);
    const ratio = (values[0] + .05) / (values[1] + .05);
    assert.ok(ratio >= 4.5, `${selector}: ${ratio.toFixed(2)}`);
  }
  assert.match(css, /\.chip\.heart\.up\{background:#d5ead9;color:#245c3c\}/);
  assert.match(css, /\.chip\.heart\.down\{background:#f4d6cf;color:#8a2a1e\}/);
});
