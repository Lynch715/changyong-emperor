import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {ALL_ROSTER,VERSION} from '../src/content.js';
import {STORY_VERSION} from '../src/story.js';
const root=fileURLToPath(new URL('../',import.meta.url)),dir='docs/施工/证据/2026-10-26-S11-03/';
const read=p=>fs.readFileSync(path.join(root,p)),json=p=>JSON.parse(read(p)),hash=p=>crypto.createHash('sha256').update(read(p)).digest('hex');
const baseline=json(dir+'施工前文件基线.json'),rows=json('design/S11/资产登记.json').assets,pixels=json(dir+'原生图像核对.json');
assert.equal(rows.length,44);assert.equal(new Set(rows.map(a=>a.asset_id)).size,44);assert.equal(rows.filter(a=>a.release==='first').length,26);assert.equal(rows.filter(a=>a.status==='pending').length,0);
assert.deepEqual(rows.filter(a=>a.asset_id.endsWith('_base')).map(a=>a.character_id).sort(),ALL_ROSTER.map(([id])=>id).sort());assert.ok(!rows.some(a=>a.character_id==='C23'));
const portraits=rows.filter(a=>a.category==='portrait');assert.equal(portraits.length,37);assert.equal(pixels.length,44);
for(const a of rows){const b=read(a.path);assert.equal(hash(a.path),a.sha256);assert.deepEqual([b.readUInt32BE(16),b.readUInt32BE(20)],a.actual_dimensions);assert.ok(a.visual_review.length>15);const e=pixels.find(x=>x.asset_id===a.asset_id);assert.equal(e.sha256,a.sha256);assert.deepEqual(e.alpha,a.alpha);if(a.category==='portrait'){assert.equal(b[25],6);assert.deepEqual(a.actual_dimensions,[1024,1536]);assert.equal(a.alpha.range[0],0);assert.ok(a.alpha.transparent_pixels>100000);assert.ok(a.alpha.near_opaque_pixels>100000);const [x,y,r,bt]=a.alpha.subject_bbox_alpha128;assert.ok(x>0&&y>0&&r<1024&&bt<1536);}else assert.deepEqual(a.actual_dimensions,[1672,941]);if(a.status==='generated-reviewed'){assert.equal(hash(a.path),hash(a.source_file));assert.ok(a.prompt_files.length);for(const p of a.prompt_files)assert.ok(read(p).length>100);}}
const ids=['C12','C13','C14','C15','C16','C17','C18','C24','C25','C27','C29','C30','C31','C33','C34','C35','C36'].map(id=>`char_${id}_base`).concat('char_C01_elder').sort();
assert.deepEqual(rows.filter(a=>!Object.hasOwn(baseline,a.path)).map(a=>a.asset_id).sort(),ids);
assert.deepEqual(rows.find(a=>a.asset_id==='char_C01_elder').input_references,['assets/char_C01_base.png']);for(const id of ['C33','C34','C35','C36'])assert.match(rows.find(a=>a.character_id===id).visual_review,/仅成年/);
const allowed=['README.md','docs/施工/施工进度.md','docs/美术进度.md','design/S11/资产登记.json','design/S11/美术资产登记与缺件表.md','scripts/update-s11-art-register.py'];
const changed=Object.keys(baseline).filter(p=>hash(p)!==baseline[p]);assert.deepEqual(changed.sort(),allowed.sort());assert.equal(Object.keys(baseline).length,1582);
const oldArt=Object.keys(baseline).filter(p=>p.startsWith('assets/')),words=Object.keys(baseline).filter(p=>p.endsWith('.docx'));assert.equal(oldArt.length,26);assert.equal(words.length,5);for(const p of [...oldArt,...words])assert.equal(hash(p),baseline[p]);
const sizes=['320x568','360x780','390x844','768x1024','844x390','1440x900'],gallery=json(dir+'44项画廊_六视口.json');assert.deepEqual(gallery.map(x=>`${x.width}x${x.height}`),sizes);
for(const x of gallery){assert.equal(x.width,x.scrollWidth);assert.equal(x.images.length,44);assert.ok(x.images.every(i=>i.loaded&&i.fit==='contain'));assert.deepEqual(x.images.map(i=>i.id).sort(),rows.map(a=>a.asset_id).sort());}
const full=json(dir+'成年与暮年完整查看_六视口.json');assert.equal(full.length,30);for(const size of sizes)assert.deepEqual(full.filter(x=>`${x.width}x${x.height}`===size).map(x=>x.art),['弘时基准立绘','弘历基准立绘','弘昼基准立绘','澄宁基准立绘','雍正暮年常服']);
for(const x of full){assert.ok(x.loaded);assert.equal(x.fit,'contain');assert.deepEqual(x.native,[1024,1536]);assert.ok(x.dialog.top>=0&&x.dialog.bottom<=x.height&&x.dialog.left>=0&&x.dialog.right<=x.width);assert.ok(x.image.top>=x.dialog.top&&x.image.bottom<=x.dialog.bottom);assert.ok(x.buttons.every(b=>b.hit));}
assert.equal(VERSION,'0.10.6');assert.equal(STORY_VERSION,9);assert.match(read(dir+'最终自动测试.txt').toString(),/tests 699[\s\S]*pass 699[\s\S]*fail 0/);
const tasks=[...read('docs/施工/施工进度.md').toString().matchAll(/^\| (S\d+-\d+) \| ([^|]+) \|/gm)];assert.equal(tasks.length,98);assert.equal(tasks.filter(x=>x[2].trim()==='通过').length,71);assert.equal(tasks.find(x=>x[1]==='S11-03')[2].trim(),'通过');assert.notEqual(tasks.find(x=>x[1]==='S11-06')[2].trim(),'通过');
const result={date:'2026-10-26',version:VERSION,storyVersion:STORY_VERSION,assets:44,firstAssets:26,fullAdditional:18,portraits:37,characters:35,newAssetIds:ids,remainingMissing:0,nativePortrait:[1024,1536],nativeLandscape:[1672,941],upscaled:false,originalFiles:1582,changedOriginal:changed,unchanged:1582-changed.length,oldAssetsUnchanged:26,wordUnchanged:5,browser:{origin:'http://127.0.0.1:5224',page:'read-only asset review',sizes,allAssetsLoad:44,fullViewChecks:30,physicalDevice:false,gameIntegrationVerified:false,playerSaveOriginOpened:false},tests:699,tasks:'71/98',next:'S11-05 uniform exports; then S11-06 actual story/activity integration'};
fs.writeFileSync(path.join(root,dir+'完整版清单与保护核验.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
