// Add a reviewed native output without ever replacing existing artwork.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),[id,source]=process.argv.slice(2);
const data=JSON.parse(fs.readFileSync(path.join(root,'design/S11/资产登记.json'))),a=data.assets.find(a=>a.asset_id===id);
assert.ok(a,'Unknown asset ID');assert.ok(/^\/Users\/ruis\/\.codex\/generated_images\/[a-z0-9-]+\/exec-[a-z0-9-]+\.png$/.test(source),'Not a generated output path');
const bytes=fs.readFileSync(source);assert.equal(bytes.subarray(1,4).toString(),'PNG');
for(const rel of [`output/imagegen/S11/${id}-native.png`,a.path]){const target=path.join(root,rel);if(fs.existsSync(target))assert.ok(fs.readFileSync(target).equals(bytes),'Refusing to overwrite existing asset');else fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);}
console.log(`${id}: native output copied; existing assets preserved`);
