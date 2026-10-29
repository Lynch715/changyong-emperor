import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createGame,createWeeklyGame,preview,commit,getEvent} from '../src/engine.js';
import {exportSave} from '../src/storage.js';
import {prepareMigration} from '../src/migration.js';
import {extractArchiveSave} from '../scripts/extract-archive-save.mjs';

const archive=(prefix,state)=>({format:'changyong-local-archive',archiveVersion:1,records:['auto','previous','import-backup',...Array.from({length:5},(_,i)=>'manual-'+i)].map((suffix,i)=>({key:prefix+'-'+suffix,raw:i===0?exportSave(state):null}))});
function files(t,a){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'changyong-extract-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const input=path.join(dir,'archive.json'),output=path.join(dir,'restored.json');fs.writeFileSync(input,JSON.stringify(a));return{input,output};}

test('离线提取季度与周档保留槽raw和完整正文，不改源集合',t=>{
 for(const [prefix,initial]of [['changyong-v12',createGame()],['changyong-week-s02',createWeeklyGame()]]){
  const state=commit(initial,preview(initial,[{type:'event',eventId:'M01',choiceId:getEvent(initial,'M01').options[0].id}])).state;
  const a=archive(prefix,state),f=files(t,a),before=fs.readFileSync(f.input);
  extractArchiveSave(f.input,prefix+'-auto',f.output);
  assert.equal(fs.readFileSync(f.output,'utf8'),a.records[0].raw);assert.deepEqual(fs.readFileSync(f.input),before);
  assert.deepEqual(JSON.parse(fs.readFileSync(f.output)).state.transcripts,state.transcripts);
 }
});
test('离线提取拒绝覆盖现有文件和源集合',t=>{const a=archive('changyong-v12',createGame()),f=files(t,a);fs.writeFileSync(f.output,'请保留');assert.throws(()=>extractArchiveSave(f.input,a.records[0].key,f.output),/EEXIST/);assert.equal(fs.readFileSync(f.output,'utf8'),'请保留');const raw=fs.readFileSync(f.input);assert.throws(()=>extractArchiveSave(f.input,a.records[0].key,f.input),/EEXIST/);assert.deepEqual(fs.readFileSync(f.input),raw);});
test('空槽、坏JSON和非法state提取失败且没有输出',t=>{for(const type of ['empty','bad-json','invalid-state']){const a=archive('changyong-v12',createGame());if(type==='empty')a.records[0].raw=null;else if(type==='bad-json')a.records[0].raw='{bad';else{const s=createGame();s.stats.treasury=-1;a.records[0].raw=JSON.stringify({state:s});}const f=files(t,a);assert.throws(()=>extractArchiveSave(f.input,a.records[0].key,f.output));assert.equal(fs.existsSync(f.output),false);}});
test('缺槽、重复键、混入另一世界及伪装槽位身份拒绝输出',t=>{for(const type of ['missing','duplicate','mixed','wrong-world','bundle']){const a=archive('changyong-v12',createGame());if(type==='missing')a.records.pop();if(type==='duplicate')a.records[1].key=a.records[0].key;if(type==='mixed')a.records[1].key='changyong-week-s02-previous';if(type==='wrong-world')a.records[0].raw=exportSave(createWeeklyGame());if(type==='bundle')a.format='changyong-migration-bundle';const f=files(t,a);assert.throws(()=>extractArchiveSave(f.input,'changyong-v12-auto',f.output));assert.equal(fs.existsSync(f.output),false);}});
test('迁移副本提取保留原JSON快照，只接受匹配副本身份的槽',async t=>{const plan=await prepareMigration(exportSave(createGame()),{storage:{getItem:()=>null}}),prefix='changyong-week-copy-'+plan.copyId,a=archive(prefix,plan.target),f=files(t,a);extractArchiveSave(f.input,prefix+'-auto',f.output);assert.equal(fs.readFileSync(f.output,'utf8'),a.records[0].raw);const wrong=structuredClone(a);wrong.records=wrong.records.map(r=>({...r,key:r.key.replace(plan.copyId,'0'.repeat(64))}));const bad=files(t,wrong);assert.throws(()=>extractArchiveSave(bad.input,wrong.records[0].key,bad.output));assert.equal(fs.existsSync(bad.output),false);});
