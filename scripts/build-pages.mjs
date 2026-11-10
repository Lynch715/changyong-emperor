import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {runtimeAssets} from './runtime-assets.mjs';
import {preparePages} from './prepare-pages.mjs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, '_site');
await preparePages(output);
// Publish only browser runtime files; local credentials, archives and the
// development server must never be included in the Pages artifact.
for (const name of ['src/v2', 'src/ai-provider.js', 'src/ai-connection-settings.js', 'assets/fonts']) {
  await cp(path.join(root, name), path.join(output, name), {
    recursive: true,
    filter: (source) => !path.basename(source).startsWith('.') && !/\.env$/i.test(source),
  });
}
for (const asset of await runtimeAssets(root)) {
  await mkdir(path.dirname(path.join(output, asset)), {recursive: true});
  await cp(path.join(root, asset), path.join(output, asset));
}
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
// 同一版本的所有模块使用相同版本参数，避免新入口命中旧子模块的浏览器缓存。
async function versionModules(dir) {
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await versionModules(file);
    else if (entry.name.endsWith('.js')) {
      const source = await readFile(file, 'utf8');
      const changed = source.replace(/(\b(?:from\s*|import\s*(?:\(\s*)?))(['"])(\.[^'"\s]+\.js)(?:\?[^'"]*)?\2/g,
        (_, prefix, quote, specifier) => `${prefix}${quote}${specifier}?v=${version}${quote}`);
      await writeFile(file, changed);
    }
  }
}
await versionModules(path.join(output, 'src'));
let html = await readFile(path.join(root, 'index.html'), 'utf8');
html = html.replace(/\?v=[^"'\s>]+/g, `?v=${version}`);
html = html.replace(/(src="\.\/src\/v2\/main\.js)(?:\?v=[^"]+)?"/, `$1?v=${version}"`);
html = html.replace('<head>', '<head><meta name="changyong-hosting" content="static">');
await writeFile(path.join(output, 'index.html'), html);
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, 'version.json'), JSON.stringify({ version }) + '\n');
console.log(`GitHub Pages v${version}: ${output}`);
