import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';
import {Readable} from 'node:stream';import {fileURLToPath,pathToFileURL} from 'node:url';
import * as E from '../src/engine.js';import {parseImport} from '../src/storage.js';import {extractArchiveSave} from './extract-archive-save.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'docs/施工/证据/2026-10-27-S13-06/'),output=path.join(root,'output/S13-06交付_20261027/');
const read=n=>JSON.parse(fs.readFileSync(dir+n,'utf8')),sha=data=>createHash('sha256').update(data).digest('hex');
const baseline=read('施工前文件基线.json'),changed=[],missing=[],allowed=new Set(['README.md','design/S13/README.md','docs/施工/施工进度.md']);
for(const [p,v]of Object.entries(baseline)){if(!fs.existsSync(root+p))missing.push(p);else if(sha(fs.readFileSync(root+p))!==v.sha256)changed.push(p);}
assert.deepEqual(missing,[]);assert.ok(changed.every(p=>allowed.has(p)),changed.join('\n'));
const packages=[],temporary=[];const packageRoots={rollback:'/private/tmp/changyong-s13-06-rollback-20261027/雍正爱恋',delivery:'/private/tmp/changyong-s13-06-delivery-20261027/雍正爱恋'};
function request(server,url){return new Promise(resolve=>{const req=Readable.from([]);Object.assign(req,{url,method:'GET',headers:{host:'127.0.0.1:5248'}});const res={headersSent:false,writeHead(status,headers){this.status=status;this.headersSent=true;},end(bytes){resolve({status:this.status,text:bytes?.toString()||''});}};server.emit('request',req,res);});}
const archives=fs.readdirSync(path.join(root,'docs/施工/证据/2026-10-27-S13-05/')).filter(n=>/八槽.json$/.test(n));
for(const mode of ['rollback','delivery']){
 const saved=read(mode+'-包校验.json'),file=output+saved.file;
 assert.equal(sha(fs.readFileSync(file)),saved.sha256);
 const result=JSON.parse(execFileSync('python3',[root+'scripts/verify-source-package.py',file],{encoding:'utf8'}));
 assert.equal(result.files,saved.files);assert.equal(result.sha256,saved.sha256);
 let extracted=packageRoots[mode];
 if(!fs.existsSync(extracted)){const temp=fs.mkdtempSync(path.join(os.tmpdir(),'changyong-s13-06-package-'));temporary.push(temp);const target=path.join(temp,'unpacked');execFileSync('python3',[root+'scripts/verify-source-package.py',file,'--extract-to',target],{encoding:'utf8'});extracted=path.join(target,'雍正爱恋');}
 const manifest=JSON.parse(fs.readFileSync(extracted+'/文件校验清单.json'));
 for(const [rel,item]of Object.entries(manifest.files))assert.equal(sha(fs.readFileSync(extracted+'/'+rel)),item.sha256,`extracted ${mode}/${rel}`);
 if(mode==='rollback')assert.deepEqual(manifest.files,baseline);
 else{
  for(const rel of Object.keys(manifest.files))assert.ok(/^(src\/|assets\/|docs\/交付\/交付保护与恢复说明_S13-06\.md$|scripts\/(extract-archive-save\.mjs|verify-source-package\.py)$|index\.html$|styles\.css$|server\.mjs$|package\.json$|README\.md$|\.env\.example$)/.test(rel),rel);
  assert.ok(!fs.existsSync(extracted+'/tests'));assert.ok(!fs.existsSync(extracted+'/scripts/serve-s13-05-e2e.mjs'));
  for(const rel of ['index.html','styles.css','server.mjs',...Object.keys(manifest.files).filter(p=>p.startsWith('src/'))])assert.equal(sha(fs.readFileSync(extracted+'/'+rel)),sha(fs.readFileSync(root+rel)));
 }
 const restoredEngine=await import(pathToFileURL(extracted+'/src/engine.js').href);let valid=0;
 for(const n of archives){const a=JSON.parse(fs.readFileSync(root+'docs/施工/证据/2026-10-27-S13-05/'+n));for(const r of a.records)if(r.raw){const s=JSON.parse(r.raw).state;const restored=restoredEngine.validateSave(s);assert.deepEqual(restored.transcripts,s.transcripts);assert.deepEqual(restored.weekly.reports,s.weekly.reports);valid++;}}
 const {makeServer}=await import(pathToFileURL(extracted+'/server.mjs').href),server=makeServer({config:{}}),routes=[];
 for(const [url,status]of [['/',200],['/src/app.js',200],['/styles.css',200],['/api/status',200],['/.env',404],['/server.mjs',404],['/scripts/extract-archive-save.mjs',404],['/qa/fixture/legacy',404],['/scripts/serve-s13-05-e2e.mjs',404],['/docs/交付/交付保护与恢复说明_S13-06.md',404],['/output/anything.tar.gz',404],['/design/test.docx',404]]){const r=await request(server,url);assert.equal(r.status,status,mode+' '+url);if(url==='/')assert.ok(!/qa-controls|播种五槽|qa\/fixture/.test(r.text));if(url==='/api/status')assert.equal(JSON.parse(r.text).configured,false);routes.push({url,status:r.status});}
 for(const rel of Object.keys(manifest.files).filter(p=>p.startsWith('src/'))){const text=fs.readFileSync(extracted+'/'+rel,'utf8');assert.ok(!/qa-controls|\/qa\/fixture\/|播种五槽保护样例|载入通关快照|赠送状态|跳年/.test(text),rel);for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))assert.ok(fs.existsSync(path.resolve(extracted,path.dirname(rel),match[1])),`missing import ${rel}: ${match[1]}`);}
 packages.push({...saved,verifiedUnpackedFiles:result.files,restoredSaveStates:valid,routes});
}
const testLog=fs.readFileSync(dir+'全量最终.txt','utf8');assert.match(testLog,/tests 836/);assert.match(testLog,/pass 836/);assert.match(testLog,/fail 0/);
const packageFailures=JSON.parse(execFileSync('python3',['-c',`
import io,json,hashlib,runpy,tarfile,tempfile
from pathlib import Path
verify=runpy.run_path(${JSON.stringify(root+'scripts/verify-source-package.py')},run_name='package_test')['verify']
results=[]
with tempfile.TemporaryDirectory(prefix='changyong-package-check-') as tmp:
 for case in ['valid','bad-hash','traversal','symlink','duplicate']:
  p=Path(tmp)/case;p.mkdir();archive=p/'test.tar.gz';out=p/'output'
  rel='../escape.txt' if case=='traversal' else 'test.txt'
  manifest={'format':'changyong-source-package','mode':'test','root':'雍正爱恋','runtimeVersion':'0.13.0','storyVersion':15,'files':{rel:{'bytes':4,'sha256':hashlib.sha256(b'good').hexdigest()}}}
  with tarfile.open(archive,'w:gz') as t:
   data=b'evil' if case=='bad-hash' else b'good'
   entries=[('雍正爱恋/'+rel,data),('雍正爱恋/文件校验清单.json',json.dumps(manifest).encode()),('雍正爱恋/包内说明.txt',b'note')]
   if case=='duplicate':entries.append(entries[0])
   for name,data in entries:
    info=tarfile.TarInfo(name);info.size=len(data)
    if case=='symlink' and name.endswith('test.txt'):info.type=tarfile.SYMTYPE;info.linkname='../../escape';info.size=0;t.addfile(info)
    else:t.addfile(info,io.BytesIO(data))
  if case=='valid':verify(archive,out);assert (out/'雍正爱恋/test.txt').read_bytes()==b'good'
  else:
   try:verify(archive,out)
   except ValueError:pass
   else:raise AssertionError('unsafe package accepted: '+case)
   assert not out.exists()
  results.append({'case':case,'passed':True})
print(json.dumps(results))
`],{encoding:'utf8'}));
fs.writeFileSync(dir+'包异常验证.json',JSON.stringify(packageFailures,null,2));
const rehearsal=read('隔离恢复演练.json');assert.equal(rehearsal.validatedNonemptyStates,18);assert.equal(rehearsal.migration.eightSlotRawExact,true);
const names=fs.readdirSync(dir).filter(n=>/^浏览器_.+八槽.json$/.test(n)),browser=Object.fromEntries(names.map(n=>[n,read(n)]));let browserStates=0;
for(const a of Object.values(browser)){assert.equal(a.records.length,8);for(const r of a.records)if(r.raw){E.validateSave(JSON.parse(r.raw).state);browserStates++;}}
const b=n=>browser['浏览器_'+n+'八槽.json'],state=a=>JSON.parse(a.records[0].raw).state;
assert.deepEqual(b('普通周初始').records,b('取消导入后').records);
const imported=parseImport(fs.readFileSync(dir+'演练_普通周单档.json','utf8'));
assert.deepEqual(state(b('周档导入后')),imported);
assert.deepEqual(state(b('第五槽恢复后')),state(b('五槽保存后')));
for(const name of ['第五槽恢复后','坏导入后','迁移操作后普通周','上期恢复后','恢复前备份取回后'])for(let i=3;i<8;i++)assert.equal(b(name).records[i].raw,b('五槽保存后').records[i].raw);
assert.deepEqual(b('第五槽恢复后').records,b('坏导入后').records);
assert.deepEqual(b('坏导入后').records,b('迁移操作后普通周').records);
assert.deepEqual(state(b('上期恢复后')),state(b('普通周初始')));
assert.deepEqual(state(b('恢复前备份取回后')),imported);
assert.equal(b('上期恢复后').records[2].raw,b('迁移操作后普通周').records[0].raw);
assert.equal(b('恢复前备份取回后').records[2].raw,b('上期恢复后').records[0].raw);
const bundle=read('演练_完整迁移包.json'),restoredBundle=read('浏览器_恢复后迁移包.json'),duplicate=read('浏览器_重复导入后迁移包.json');
assert.deepEqual(restoredBundle.records,bundle.records);assert.equal(restoredBundle.sourceRaw,bundle.sourceRaw);
assert.deepEqual(b('副本恢复后').records,bundle.records);assert.deepEqual(b('副本刷新后').records,bundle.records);
assert.equal(fs.readFileSync(dir+'浏览器_恢复后季度原JSON.json','utf8'),bundle.sourceRaw);
assert.deepEqual(duplicate.records,b('副本继续后').records);assert.equal(duplicate.sourceRaw,bundle.sourceRaw);
assert.equal(state(b('副本继续后')).events['R02-01'].completed,true);assert.ok(state(b('副本继续后')).revision>state(b('副本恢复后')).revision);
assert.deepEqual(read('浏览器_控制台.json'),[]);
// Verify offline extraction using the actual browser-exported fifth slot, not a synthetic mirror.
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'changyong-s13-06-check-'));
try{
 const source=dir+'浏览器_五槽保存后八槽.json',target=path.join(temp,'fifth.json');extractArchiveSave(source,'changyong-week-s02-manual-4',target);assert.equal(fs.readFileSync(target,'utf8'),b('五槽保存后').records[7].raw);
 const sentinel=path.join(temp,'keep');fs.mkdirSync(sentinel);fs.writeFileSync(path.join(sentinel,'original.txt'),'keep');
 const failed=spawnSync('python3',[root+'scripts/verify-source-package.py',output+packages[1].file,'--extract-to',sentinel],{encoding:'utf8'});assert.notEqual(failed.status,0);assert.deepEqual(fs.readdirSync(sentinel),['original.txt']);assert.equal(fs.readFileSync(path.join(sentinel,'original.txt'),'utf8'),'keep');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
const progress=fs.readFileSync(root+'docs/施工/施工进度.md','utf8').split('\n').filter(l=>/^\| S\d\d-\d\d \|/.test(l));assert.equal(progress.length,98);assert.equal(progress.filter(l=>l.split('|')[2].trim().startsWith('通过')).length,84);
const result={task:'S13-06',date:'2026-10-27',status:'通过（本地）',version:'0.13.0',storyVersion:15,tests:836,newExtractionTests:5,runtimeChanges:0,packages,packageFailureChecks:packageFailures,progress:{passed:84,total:98},protection:{baselineFiles:Object.keys(baseline).length,changed,unchanged:Object.keys(baseline).length-changed.length,missing,images:Object.keys(baseline).filter(p=>p.startsWith('assets/')&&/\.(png|jpe?g|webp)$/i.test(p)).length,wordFiles:Object.keys(baseline).filter(p=>p.endsWith('.docx')).length,actualPlayerStorageTouched:false,oldEvidenceUnchanged:true},recovery:rehearsal,browser:{origin:'http://127.0.0.1:5248',source:'解包后的385文件正式运行包',archives:names.length,validatedStates:browserStates,cancelAtomic:true,badImportAtomic:true,fiveManualSlotsUnchanged:true,restoreBackupRoundtrip:true,migrationEightSlotRawExact:true,originalRawExact:true,duplicateKeepsNewProgress:true,ordinaryWeeklyUnaffected:true,consoleErrors:0},next:'S14-01三年至三十年周排程',limitations:['真实API未验','实体手机与原生输入法未验','普通八槽集合无整包回写按钮；离线提取保全单槽raw，逐槽UI恢复state不承诺raw一致','回退包不含浏览器实时存储、真实.env或密钥','S12-04后期、S14与S15仍待施工'],published:false};
fs.writeFileSync(output+'SHA256SUMS.txt',packages.map(p=>p.sha256+'  '+p.file).join('\n')+'\n');
fs.writeFileSync(dir+'验收与保护核对.json',JSON.stringify(result,null,2));
for(const temp of temporary)fs.rmSync(temp,{recursive:true,force:true});
console.log(JSON.stringify(result,null,2));
