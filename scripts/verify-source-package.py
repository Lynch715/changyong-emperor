"""Verify a source archive; optionally unpack only into a new empty destination."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import tarfile

def verify(archive_path, destination=None):
    with tarfile.open(archive_path,'r:gz') as archive:
        members=archive.getmembers()
        names=[m.name for m in members]
        if len(names)!=len(set(names)) or any(not m.isfile() for m in members):
            raise ValueError('包内有重复条目、目录或链接，停止。')
        candidates=[n for n in names if n.count('/')==1 and n.endswith('/文件校验清单.json')]
        if len(candidates)!=1:
            raise ValueError('包内清单缺失或重复。')
        manifest=json.loads(archive.extractfile(candidates[0]).read())
        prefix=manifest['root']; files=manifest['files']
        if manifest.get('format')!='changyong-source-package' or prefix!='雍正爱恋':
            raise ValueError('包格式或根目录错误。')
        for rel in files:
            p=PurePosixPath(rel)
            if p.is_absolute() or '..' in p.parts or str(p)!=rel or '\\' in rel:
                raise ValueError('包内路径错误。')
        expected={prefix+'/'+rel for rel in files}|{prefix+'/文件校验清单.json',prefix+'/包内说明.txt'}
        if set(names)!=expected:
            raise ValueError('包条目与清单不一致。')
        for rel,item in files.items():
            data=archive.extractfile(prefix+'/'+rel).read()
            if len(data)!=item['bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']:
                raise ValueError('文件校验失败：'+rel)
        # Verify every entry before creating any destination files.
        if destination is not None:
            target=Path(destination)
            target.mkdir(parents=True,exist_ok=False)
            for name in names:
                output=target / name
                output.parent.mkdir(parents=True,exist_ok=True)
                with output.open('xb') as out:
                    out.write(archive.extractfile(name).read())
        result={'mode':manifest['mode'],'files':len(files),'runtimeVersion':manifest['runtimeVersion'],'storyVersion':manifest['storyVersion'],'sha256':hashlib.sha256(Path(archive_path).read_bytes()).hexdigest(),'extractedTo':str(Path(destination).resolve() / prefix) if destination is not None else None}
        return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('archive');parser.add_argument('--extract-to')
    args=parser.parse_args()
    try:
        print(json.dumps(verify(args.archive,args.extract_to),ensure_ascii=False))
    except (ValueError,OSError,KeyError,tarfile.TarError) as error:
        parser.exit(1,'校验或解包未完成：'+str(error)+'\n')
