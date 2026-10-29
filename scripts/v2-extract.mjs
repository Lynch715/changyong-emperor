// 从旧引擎抽取元年至二年的场景文字与选项，生成 src/v2/content.js（新版不再依赖旧引擎运行）。
import fs from 'node:fs';
import {STORY} from '../src/story.js';import {EVENTS} from '../src/content.js';import {readingText} from '../src/reading-copy.js';
import {DILEMMA_REPAIR} from '../src/dilemma-content.js';
const ids=['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12',
 'R02-01','R02-02','R07-01','R07-02','R06-01','R06-02','R08-01','R08-02','R04-01','R04-02','R05-01','R05-02','R03-01','R03-02',
 'XR09-01','XR09-02','XR10-01','XR10-02','G01','G02','G03','G04','G05','G06','P01','P09','P10','P11','K01','K02','K03','K04'];
const out={};
for(const id of ids){const e=EVENTS[id],st=STORY[id];if(!e||!st){console.error('missing',id);continue;}
 const rt=x=>readingText(x||'',id);
 out[id]={id,title:e.title,kind:e.kind,actor:e.actor,location:e.location||'',body:rt(st.body||e.body),
  options:(e.options||[]).map(o=>({id:o.id,label:o.label,effects:o.effects||{},bonds:o.bonds||{},slight:o.slight||null,reply:rt(st.replies?.[o.id]||'')}))};}
fs.writeFileSync('src/v2/content.js','// 自动生成：node scripts/v2-extract.mjs。请勿手改，改阅读稿后重新生成。\nexport const SCENES='+JSON.stringify(out,null,0)+';\nexport const REPAIR='+JSON.stringify(DILEMMA_REPAIR)+';\n');
console.log(Object.keys(out).length,'scenes',fs.statSync('src/v2/content.js').size,'bytes');
