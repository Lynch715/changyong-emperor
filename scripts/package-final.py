"""Local runtime delivery. Excludes .env, real saves, QA fixtures and old archives."""
import hashlib,io,json,tarfile,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/最终本地交付_20261028'
EVIDENCE=ROOT/'docs/施工/证据/2026-10-28-最终验收'
PREFIX='雍正爱恋'
VERSION=json.loads((ROOT/'package.json').read_text())['version']
GUIDE='docs/交付/本地运行与配置_v'+VERSION+'.md'
sha=lambda data:hashlib.sha256(data).hexdigest()
paths=[ROOT/n for n in ['index.html','styles.css','server.mjs','package.json','.env.example','scripts/verify-source-package.py','scripts/extract-archive-save.mjs',GUIDE,'docs/施工/真实DeepSeek长记忆秘密接话与解析验收_2026-10-28.md','docs/施工/真实DeepSeek新版对白口吻验收_2026-10-28.md','docs/施工/叙事文案审校与修改_2026-10-28.md','docs/施工/最终施工与本地交付验收_2026-10-28.md','docs/施工/S15-04真实DeepSeek接入与验收_2026-10-28.md']]
paths += [p for n in ['src','assets'] for p in (ROOT/n).rglob('*') if p.is_file() and p.name!='.DS_Store']
sources={p.relative_to(ROOT).as_posix():p for p in sorted(paths)}
sources['README.md']=ROOT/GUIDE
files={rel:{'sha256':sha(p.read_bytes()),'bytes':p.stat().st_size} for rel,p in sorted(sources.items())}
assert not any(rel.endswith('.env') or '证据/' in rel or 'tests/' in rel for rel in files)
manifest={'format':'changyong-source-package','version':1,'mode':'delivery','runtimeVersion':VERSION,'storyVersion':int(re.search(r'STORY_VERSION\s*=\s*(\d+)',(ROOT/'src/story.js').read_text()).group(1)),'root':PREFIX,'files':files}
OUT.mkdir(parents=True,exist_ok=True)
target=OUT/('本地交付_v'+VERSION+'.tar.gz')
with target.open('xb') as out:
 with tarfile.open(fileobj=out,mode='w:gz',compresslevel=6) as archive:
  for rel,p in sources.items():
   assert not p.is_symlink()
   archive.add(p,arcname=PREFIX+'/'+rel,recursive=False)
  for rel,data in [('文件校验清单.json',json.dumps(manifest,ensure_ascii=False,indent=2).encode()),('包内说明.txt','Node.js22.9+，npm start，默认固定文本，联网预设DeepSeek Flash但不含密钥。无玩家实时进度或测试存档。先阅读README.md；请在空目录解包，旧回退包保留在原项目output目录。本包未公开发布。'.encode())]:
   item=tarfile.TarInfo(PREFIX+'/'+rel);item.size=len(data);item.mode=0o644;archive.addfile(item,io.BytesIO(data))
result={'file':str(target.relative_to(ROOT)),'bytes':target.stat().st_size,'sha256':sha(target.read_bytes()),'files':len(files),'nativeAssets':44,'assetFiles':len([x for x in files if x.startswith('assets/')]),'containsKey':False,'containsQASaves':False}
(EVIDENCE/('本地运行包校验_v'+VERSION+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
