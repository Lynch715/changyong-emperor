"""Build local S13-06 archives with explicit file manifests; never overwrite an archive."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'docs/施工/证据/2026-10-27-S13-06'
OUTPUT = ROOT / 'output/S13-06交付_20261027'
PREFIX = '雍正爱恋'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def build(mode):
    if mode == 'rollback':
        files = json.loads((EVIDENCE / '施工前文件基线.json').read_text())
        name = '原项目回退_v0.13.0_S13-06前.tar.gz'
        note = '这是S13-06施工前项目快照。请先保全当前项目和浏览器导出，在空目录解包核对，不要覆盖正在使用的目录或回写浏览器存储。包中不含浏览器实时存档、密钥或.env；已有历史验收归档属于旧证据，不是玩家当前进度。运行版本0.13.0、正文快照15。'
    else:
        paths = [ROOT / n for n in ['index.html','styles.css','server.mjs','package.json','.env.example']]
        paths += [p for n in ['src','assets'] for p in (ROOT / n).rglob('*') if p.is_file() and p.name != '.DS_Store']
        paths += [ROOT / 'scripts/extract-archive-save.mjs', ROOT / 'scripts/verify-source-package.py', ROOT / 'docs/交付/交付保护与恢复说明_S13-06.md']
        sources = {p.relative_to(ROOT).as_posix():p for p in sorted(paths)}
        sources['README.md'] = ROOT / 'docs/交付/本地运行入口_S13-06.md'
        files = {rel: {'sha256':digest(p.read_bytes()),'bytes':p.stat().st_size} for rel,p in sorted(sources.items())}
        name = '本地交付_v0.13.0_S13-06.tar.gz'
        note = '本地运行包，Node.js 22以上，npm start；需独立端口时PORT=5251 npm start。无依赖安装，无开发fixture和测试存档，无玩家实时进度或.env密钥。先阅读docs/交付/交付保护与恢复说明_S13-06.md；不要清空浏览器或将不同端口误认为丢档。'
    OUTPUT.mkdir(parents=True,exist_ok=True)
    target = OUTPUT / name
    if target.exists():
        raise SystemExit(f'已有回退/交付包，拒绝覆盖：{target.name}')
    manifest = {'format':'changyong-source-package','version':1,'mode':mode,'runtimeVersion':'0.13.0','storyVersion':15,'root':PREFIX,'files':files}
    # Check every source before creating the archive; a stale baseline cannot be packaged.
    for rel, item in files.items():
        source = ROOT / rel if mode == 'rollback' else sources[rel]
        if source.is_symlink() or digest(source.read_bytes()) != item['sha256']:
            raise SystemExit(f'源文件与清单不一致：{rel}')
    with target.open('xb') as out:
        with tarfile.open(fileobj=out,mode='w:gz',compresslevel=6) as archive:
            for rel in files:
                archive.add(ROOT / rel if mode == 'rollback' else sources[rel],arcname=PREFIX+'/'+rel,recursive=False)
            for rel,data in [('文件校验清单.json',json.dumps(manifest,ensure_ascii=False,indent=2).encode()),('包内说明.txt',note.encode())]:
                item=tarfile.TarInfo(PREFIX+'/'+rel);item.size=len(data);item.mode=0o644
                archive.addfile(item,io.BytesIO(data))
    result={'file':name,'bytes':target.stat().st_size,'sha256':digest(target.read_bytes()),'files':len(files),'sourceBytes':sum(v['bytes']for v in files.values())}
    (EVIDENCE / (mode+'-包校验.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['rollback','delivery'])
    build(parser.parse_args().mode)
