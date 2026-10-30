import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
test('只提供新版入口，设置页没有旧版链接',async()=>{const html=await readFile(path.join(root,'index.html'),'utf8'),main=await readFile(path.join(root,'src/v2/main.js'),'utf8');assert.ok(html.includes('src="./src/v2/main.js"'));assert.ok(html.includes('href="src/v2/v2.css"'));assert.ok(!html.includes('legacy'));assert.ok(!main.includes('?legacy=1'));await assert.rejects(access(path.join(root,'src/app.js')));await assert.rejects(access(path.join(root,'styles.css')));});
test('删旧版后，新版所有本地模块依赖仍完整',async()=>{const files=(await readdir(path.join(root,'src/v2'))).filter(f=>f.endsWith('.js')).map(f=>path.join(root,'src/v2',f));files.push(path.join(root,'src/ai-provider.js'),path.join(root,'src/ai-connection-settings.js'));for(const file of files){const text=await readFile(file,'utf8');for(const m of text.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g))await access(path.resolve(path.dirname(file),m[1]));}});
test('Pages产物只有新版与共用模块，不包含旧版或本机文件',async()=>{execFileSync(process.execPath,['scripts/build-pages.mjs'],{cwd:root});const src=await readdir(path.join(root,'_site/src'));assert.deepEqual(src.sort(),['ai-connection-settings.js','ai-provider.js','v2']);for(const f of ['.env','123.env','server.mjs','styles.css'])await assert.rejects(access(path.join(root,'_site',f)));const html=await readFile(path.join(root,'_site/index.html'),'utf8');assert.ok(html.includes('changyong-hosting'));assert.ok(!html.includes('legacy'));assert.equal(JSON.parse(await readFile(path.join(root,'_site/version.json'))).version,'0.38.0');});
