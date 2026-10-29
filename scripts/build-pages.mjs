import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'_site');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
// Publish only browser runtime files; local credentials, archives and the
// development server must never be included in the Pages artifact.
for(const name of ['src','assets','styles.css']){
 await cp(path.join(root,name),path.join(output,name),{
  recursive:true,
  filter:source=>!path.basename(source).startsWith('.')&&!/\.env$/i.test(source)
 });
}
let html=await readFile(path.join(root,'index.html'),'utf8');
html=html.replace('<head>','<head><meta name="changyong-hosting" content="static">');
await writeFile(path.join(output,'index.html'),html);
await writeFile(path.join(output,'.nojekyll'),'');
const {version}=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
await writeFile(path.join(output,'version.json'),JSON.stringify({version})+'\n');
console.log(`GitHub Pages v${version}: ${output}`);
