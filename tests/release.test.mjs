import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access, stat } from 'node:fs/promises';
import path from 'node:path';
import {runtimeAssets} from '../scripts/runtime-assets.mjs';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
test('只提供新版入口，设置页没有旧版链接', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8'),
    main = await readFile(path.join(root, 'src/v2/main.js'), 'utf8');
  assert.match(html, /src="\.\/src\/v2\/main\.js(?:\?v=[^"]+)?"/);
  assert.match(html, /href="src\/v2\/v2\.css(?:\?v=[^"]+)?"/);
  assert.ok(!html.includes('legacy'));
  assert.ok(!main.includes('?legacy=1'));
  await assert.rejects(access(path.join(root, 'src/app.js')));
  await assert.rejects(access(path.join(root, 'styles.css')));
});
test('删旧版后，新版所有本地模块依赖仍完整', async () => {
  const files = (await readdir(path.join(root, 'src/v2')))
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(root, 'src/v2', f));
  files.push(path.join(root, 'src/ai-provider.js'), path.join(root, 'src/ai-connection-settings.js'));
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const m of text.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g))
      await access(path.resolve(path.dirname(file), m[1]));
  }
});
test('Pages产物只有新版与共用模块，不包含旧版或本机文件', async () => {
  execFileSync(process.execPath, ['scripts/build-pages.mjs'], { cwd: root });
  const src = await readdir(path.join(root, '_site/src'));
  assert.deepEqual(src.sort(), ['ai-connection-settings.js', 'ai-provider.js', 'v2']);
  for (const f of ['.env', '123.env', 'server.mjs', 'styles.css'])
    await assert.rejects(access(path.join(root, '_site', f)));
  const html = await readFile(path.join(root, '_site/index.html'), 'utf8');
  assert.ok(html.includes('changyong-hosting'));
  assert.ok(!html.includes('legacy'));
  assert.equal(
    JSON.parse(await readFile(path.join(root, '_site/version.json'))).version,
    JSON.parse(await readFile(path.join(root, 'package.json'))).version,
  );

});

test('A4 Pages 样式和模块入口都带 package.json 的当前版本', async () => {
  const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const html = await readFile(path.join(root, '_site/index.html'), 'utf8');
  assert.ok(html.includes(`src/v2/v2.css?v=${version}`));
  assert.ok(html.includes(`src/v2/main.js?v=${version}`));
});

// 递归核算发布资源的实际字节数。
async function assetBytes(dir) {
  let bytes = 0;
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    bytes += entry.isDirectory() ? await assetBytes(file) : (await stat(file)).size;
  }
  return bytes;
}

test('A5 所有静态及动态资源引用均存在，发布资源小于90MB且不含原图', async () => {
  const assets = await runtimeAssets(root);
  assert.ok(assets.length > 100);
  for (const asset of assets) await access(path.join(root, '_site', asset));
  assert.ok(await assetBytes(path.join(root, '_site/assets')) < 90 * 1024 * 1024);
  assert.deepEqual((await readdir(path.join(root, '_site/assets'))).sort(), ['exports', 'fonts']);
  const published = await readdir(path.join(root, '_site/assets/exports/s11-v1'));
  assert.ok(!published.some(name => /-full\.|\.jpg$/.test(name)));
});
