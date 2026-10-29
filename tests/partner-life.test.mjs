import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as E from '../src/engine.js';import {BOND_MODES} from '../src/activity-content.js';import {bondAllowed} from '../src/activities.js';import {extensionRelation} from '../src/extension-routes.js';
import {partnerIssues,SHARED_LIFE,EXTENSION_REPAIR} from '../src/partner-life.js';import {renderExtensionPerson} from '../src/extension-ui.js';import {renderPersonActivities} from '../src/activity-ui.js';
import {actors,actorCases,base,read,plan,act,dir} from '../scripts/s14-04-scenarios.mjs';import {parseImport,exportSave} from '../src/storage.js';import {reachEighth} from '../scripts/s14-02-v08-scenarios.mjs';import {canOfferLate} from '../src/volume7.js';
const __evidence=f=>{try{return f()}catch(e){if(e&&e.code==='ENOENT')return null;throw e}};

let cachedActor,cached;function cases(actor){if(cachedActor!==actor){cached=actorCases(actor);cachedActor=actor;}return cached;}
const clone=structuredClone,mutate=(s,fn)=>{s=clone(s);fn(s);assert.throws(()=>E.validateSave(s));};







test('S14-04新相伴预约须单独确认，同笔变更心意不混成旧答复',()=>{const s=base(),raw=JSON.stringify(s);assert.throws(()=>E.preview(s,[{type:'week-plan',kind:'bond',actor:'C09',mode:'quiet',date:{year:27,month:9,day:4},period:'evening'},{type:'extension-talk',actor:'C09',kind:'boundary',choice:'仅合作'}]),/单独确认/);assert.equal(JSON.stringify(s),raw);});






test('S14-04将军外任不能亲近瞬移，允礼同日不能凭高阶段入宫',()=>{const s=read('docs/施工/证据/2026-10-28-S14-02-V08/warm-checkpoint-opening.json');assert.throws(()=>act(s,{type:'week-plan',kind:'bond',actor:'C03',mode:'quiet',date:{year:27,month:1,day:2},period:'evening'}));const b=base();assert.throws(()=>act(b,{type:'week-plan',kind:'bond',actor:'C05',mode:'quiet',date:b.date,period:'evening'}));});



