// Offline recovery aid: preserve the selected record's bytes; never write browser storage.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseImport} from '../src/storage.js';

export function extractArchiveSave(input,key,output){
 const raw=fs.readFileSync(input,'utf8'),a=JSON.parse(raw);
 if(a.format!=='changyong-local-archive'||a.archiveVersion!==1||!Array.isArray(a.records)||a.records.length!==8)throw Error('请选择原始八槽档案集合；完整迁移包请用游戏迁移入口。');
 const prefix=/^(changyong-v12|changyong-week-s02|changyong-week-copy-[a-f0-9]{64})-(auto|previous|import-backup|manual-[0-4])$/;
 const keys=a.records.map(r=>r.key),m=typeof key==='string'&&prefix.exec(key);
 if(!m||new Set(keys).size!==8||keys.some(k=>typeof k!=='string'||!prefix.test(k)||!k.startsWith(m[1]+'-')))throw Error('集合槽位不完整、重复或跨来源，未输出。');
 const record=a.records.find(r=>r.key===key);
 if(typeof record?.raw!=='string')throw Error('所选槽为空，未输出。');
 const state=parseImport(record.raw);
 if((state.worldVersion==='changyong-week-s02-1')!==(m[1]!=='changyong-v12')||(state.weekly?.migration?.copyId||null)!==(m[1].startsWith('changyong-week-copy-')?m[1].slice('changyong-week-copy-'.length):null))throw Error('槽位与时间规则或副本身份不一致，未输出。');
 fs.writeFileSync(output,record.raw,{flag:'wx'});
 return {key,world:state.worldVersion,date:state.date,sealed:state.sealed,bytes:Buffer.byteLength(record.raw)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,key,output,...extra]=process.argv.slice(2);
 if(!input||!key||!output||extra.length){console.error('用法：node scripts/extract-archive-save.mjs 八槽档案.json 完整槽位键 新单档.json');process.exitCode=1;}
 else try{console.log(JSON.stringify(extractArchiveSave(input,key,output),null,2));}catch(error){console.error('未覆盖任何已有文件：'+error.message);process.exitCode=1;}
}
