// Re-encode selected built-in imagegen outputs. No cropping, stretching or background synthesis.
// Usage: node scripts/export-v043-kid-art.mjs /path/to/selected-sources.json
// Without an input map, re-export the committed PNG sources and preserve the prompt registry.
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const registryFile=path.join(root,'design/S11/0.43-皇嗣立绘.json');
const sha=b=>createHash('sha256').update(b).digest('hex');
const selected=process.argv[2]?JSON.parse(await readFile(process.argv[2],'utf8')):JSON.parse(await readFile(registryFile,'utf8')).assets.map(x=>({id:x.id,source:path.join(root,x.source),prompt:x.prompt}));
if(selected.length!==14||new Set(selected.map(x=>x.id)).size!==14)throw Error('Expected 14 distinct kid assets');
const output=path.join(root,'assets/exports/s11-v1');await mkdir(output,{recursive:true});await mkdir(path.dirname(registryFile),{recursive:true});
function webpDimensions(buffer){
 for(let offset=12;offset+8<=buffer.length;){
  const type=buffer.toString('ascii',offset,offset+4),size=buffer.readUInt32LE(offset+4),body=offset+8;
  if(type==='VP8X')return [buffer.readUIntLE(body+4,3)+1,buffer.readUIntLE(body+7,3)+1];
  if(type==='VP8L'){const bits=buffer.readUInt32LE(body+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}
  if(type==='VP8 ')return [buffer.readUInt16LE(body+6)&0x3fff,buffer.readUInt16LE(body+8)&0x3fff];
  offset=body+size+(size%2);
 }
 throw Error('Unrecognized WebP header');
}
const assets=[];
for(const item of selected){
 if(!/^k_(infant_0[1-6]|youth_0[1-8])$/.test(item.id))throw Error('Unexpected asset ID');
 const stem=item.id.replace(/^k_/,'kid_'),source=`assets/${stem}.png`,native=path.join(root,source);
 if(path.resolve(item.source)!==native)await copyFile(item.source,native);
 const data=await readFile(native);if(data.subarray(1,4).toString()!=='PNG'||data[25]!==6)throw Error('Expected RGBA PNG: '+item.id);
 const width=data.readUInt32BE(16),height=data.readUInt32BE(20),exports=[];
 for(const [role,targetHeight] of [['mobile',640],['thumb',200]]){
  const file=`assets/exports/s11-v1/${stem}-${role}.webp`;
  const args=['-quiet','-m','6','-resize','0',String(targetHeight),...(role==='thumb'?['-lossless']:['-q','90','-alpha_q','100']),native,'-o',path.join(root,file)];
  const r=spawnSync('cwebp',args,{encoding:'utf8'});if(r.status!==0)throw Error('cwebp failed: '+(r.stderr||r.error));
  const bytes=await readFile(path.join(root,file));exports.push({role,path:file,bytes:bytes.length,sha256:sha(bytes),dimensions:webpDimensions(bytes)});
 }
 const stage=item.id.includes('infant')?'infant':'youth',num=Number(item.id.slice(-2));
 assets.push({id:item.id,stage,sex:num<=(stage==='infant'?3:4)?'男':'女',source,nativeDimensions:[width,height],sourceSha256:sha(data),generator:'built-in image_gen',status:'generated-reviewed',prompt:item.prompt,exports});
}
await writeFile(registryFile,JSON.stringify({release:'0.43.0',style:'清宫工笔，暖色绢本质感，合龄日常服饰',exportPolicy:'cwebp: retain full image and alpha, preserve aspect ratio; mobile height 640, lossless thumb height 200',assets},null,2)+'\n');
console.log(`Exported ${assets.length} original PNGs and ${assets.length*2} WebP assets`);
