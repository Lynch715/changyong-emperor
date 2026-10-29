import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import {parseImport,exportSave,storageForWorld} from '../src/storage.js';
import {LIFE_BOOKS,lifeRecords,personalReady,volumeLifeView} from '../src/volume-life.js';
import {renderVolumeLife,renderLifeArchive,renderLifeCoverage} from '../src/volume-life-ui.js';
import {prepareContinuation,commitContinuation} from '../src/continuation.js';
import {Store,act,reachRoot,settleRoot,oldUnsealed,read,dir} from '../scripts/s14-03-scenarios.mjs';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

const fixture=name=>__evidence(()=>parseImport(fs.readFileSync(new URL(name+'.json',dir),'utf8')));
const clone=structuredClone;
const root=()=>read('docs/施工/证据/2026-10-28-S14-03/新局_M04前.json');
const mutate=(s,fn)=>{const c=clone(s);fn(c);assert.throws(()=>E.validateSave(c));};
const practice=(s,kind,exercises,dates)=>{for(let i=0;i<exercises.length;i++){s=reachRoot(s,dates[i],'evening');s=act(s,{type:'week-plan',kind,actor:'C01',date:s.date,period:'evening',exercise:exercises[i]});s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});}return s;};



test('S14-03季度、封卷与F04尾声不接受开启手记',()=>{assert.throws(()=>act(E.createGame(),{type:'life-enable'}));assert.throws(()=>act(read('docs/施工/证据/2026-10-28-S14-02-V08/warm-第八卷封卷.json'),{type:'life-enable'}));assert.throws(()=>act(read('docs/施工/证据/2026-10-28-S14-02-V08/F04_显式进入三十一年.json'),{type:'life-enable'}));});

test('S14-03手记单独确认，组合命令拒绝且不改变状态',()=>{const s=root(),raw=JSON.stringify(s);assert.throws(()=>E.preview(s,[{type:'life-enable'},{type:'week-advance'}]),/单独确认/);assert.equal(JSON.stringify(s),raw);});




test('S14-03同日两项仍不能整理为三个实际日的成果',()=>{let s=settleRoot(act(E.createWeeklyGame(),{type:'life-enable'}));s=act(s,{type:'week-advance',date:{year:1,month:1,day:3}});for(const [i,exercise]of ['read','compare'].entries()){s=act(s,{type:'week-plan',kind:'study',actor:'C01',date:s.date,period:i?'evening':'day',exercise});s=act(s,{type:'week-fulfill',planId:s.weekly.plans.at(-1).id});}assert.equal(personalReady(s,'study'),false);});


















