import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// 只重编码本轮登记的六张原图；保留全幅和透明通道，不覆盖旧版人物资源。
const registryPath = new URL('../design/S11/0.47-审计修复美术.json', import.meta.url);
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const root = new URL('../', import.meta.url);
for (const asset of registry.assets) {
 const child = /^k_(toddler|child)_0[12]$/.test(asset.id), performer = /^N0[12]$/.test(asset.id);
 if (!child && !performer) throw Error('不属于本轮美术的编号：' + asset.id);
 const source = new URL(asset.source, root), bytes = await readFile(source);
 if (bytes[25] !== 6) throw Error('原图必须保留 RGBA 通道：' + asset.id);
 asset.sourceSha256 = createHash('sha256').update(bytes).digest('hex');
 const stem = child ? asset.id.replace(/^k_/, 'kid_') : `char_${asset.id}_qing`;
 for (const item of asset.exports) {
  const match = item.path.match(new RegExp(`^assets/exports/s11-v1/${stem}-(mobile|thumb|display)\\.(png|webp)$`));
  if (!match) throw Error('导出路径超出本轮范围：' + item.path);
  const [, role, format] = match, height = role === 'thumb' ? child ? 200 : 192 : child ? 640 : 1152;
  const file = new URL(item.path, root);
  if (format === 'png') execFileSync('sips', ['-Z', String(height), fileURLToPath(source), '--out', fileURLToPath(file)], {stdio: 'ignore'});
  else execFileSync('cwebp', ['-quiet', '-m', '6', '-resize', '0', String(height), '-q', '92', '-alpha_q', '100',
   fileURLToPath(source), '-o', fileURLToPath(file)]);
  const out = await readFile(file);
  item.bytes = out.length;
  item.sha256 = createHash('sha256').update(out).digest('hex');
 }
}
await writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n');
console.log('六张审计修复原图已重新导出，旧图保持原样。');
