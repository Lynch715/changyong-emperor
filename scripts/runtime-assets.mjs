import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {BG, portrait, thumb} from '../src/v2/data.js';
import {PORTRAIT_IDS, PLACE_ART, KID_ART, NIGHT_BG, portraitFile, placeBackground} from '../src/v2/art.js';

// 枚举运行时实际使用的路径，动态立绘和季节背景也逐一展开。
export async function runtimeAssets(root) {
  const assets = new Set([...Object.values(BG), NIGHT_BG]);
  for (const id of PORTRAIT_IDS) {
    assets.add(portrait(id));
    assets.add(thumb(id));
    for (const role of ['mobile', 'thumb']) {
      for (const format of ['png', 'webp']) assets.add(portraitFile(id, role, format));
    }
  }
  for (const id of Object.keys(PLACE_ART)) {
    for (let month = 1; month <= 12; month++) {
      for (const role of ['display', 'thumb']) assets.add(placeBackground(id, month, role));
    }
  }
  for (const art of Object.values(KID_ART)) {
    assets.add(art.mobile);
    assets.add(art.thumb);
  }
  // 同时扫描所有模块中的直接引用；新增静态资源不必再手工维护名单。
  for (const file of await readdir(path.join(root, 'src/v2'))) {
    if (!file.endsWith('.js')) continue;
    const source = await readFile(path.join(root, 'src/v2', file), 'utf8');
    for (const match of source.matchAll(/['"`](assets\/[^'"`$]+\.(?:png|webp|jpg|svg))['"`]/g)) {
      assets.add(match[1]);
    }
  }
  return [...assets].sort();
}
