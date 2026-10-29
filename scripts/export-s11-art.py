"""Deterministic S11-05 delivery exports. Originals are never written.
Only transparent padding is cropped; content is resampled, never regenerated.
Run with Pillow 12.2.0; explicit --register adds export metadata to inventory.
"""
import argparse, hashlib, io, json
from pathlib import Path
from PIL import Image, __version__ as pillow_version
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/exports/s11-v1'
MANIFEST=ROOT/'design/S11/导出登记.json'

def digest(data):return hashlib.sha256(data).hexdigest()
def save_exclusive(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():
        assert path.read_bytes()==data,f'Refusing to replace differing file: {path}'
    else:
        with path.open('xb') as f:f.write(data)

def resized(im,size):
    # Premultiplied alpha avoids dark fringes from RGB in transparent pixels.
    if im.mode=='RGBA':return im.convert('RGBa').resize(size,Image.Resampling.LANCZOS).convert('RGBA')
    return im.resize(size,Image.Resampling.LANCZOS)

def normalized(im):
    alpha=im.getchannel('A');crop=alpha.getbbox();subject=alpha.point(lambda n:255 if n>=128 else 0).getbbox()
    assert crop and subject
    x,y,r,b=subject;scale=1036/(b-y)
    piece=im.crop(crop);size=tuple(round(n*scale) for n in piece.size)
    # Fixed visible-subject center and baseline; preserve all nonzero alpha.
    sx=size[0]/piece.width;sy=size[1]/piece.height
    px=round(384-((x+r)/2-crop[0])*sx);py=round(1094-(b-crop[1])*sy)
    assert px>=0 and py>=0 and px+size[0]<=768 and py+size[1]<=1152
    assert sx<=1 and sy<=1
    canvas=Image.new('RGBA',(768,1152),(0,0,0,0));canvas.paste(resized(piece,size),(px,py))
    return canvas,{'crop_alpha_nonzero':list(crop),'subject_alpha128':list(subject),'scaled_crop_size':list(size),'offset':[px,py],'scale_xy':[sx,sy],'target_subject_height':1036,'target_subject_bottom':1094,'target_subject_center_x':384,'content_removed':False}

def export(a,previous):
    source=ROOT/a['path'];raw=source.read_bytes();assert digest(raw)==a['sha256']
    im=Image.open(io.BytesIO(raw));im.load();portrait=a['category']=='portrait'
    base,transform=normalized(im) if portrait else (im,{'crop':[0,0,*im.size],'content_removed':False})
    sizes=[('display',(768,1152)),('mobile',(384,576)),('thumb',(128,192))] if portrait else [('full',im.size),('display',(1280,720)),('thumb',(320,180))]
    exports=[]
    for role,size in sizes:
        img=base if base.size==size else resized(base,size)
        for fmt in (['PNG','WEBP'] if portrait else ['JPEG','WEBP']):
            ext={'PNG':'png','WEBP':'webp','JPEG':'jpg'}[fmt];suffix='-lossless' if (role=='thumb' or a['asset_id']=='char_C01_formal') and fmt=='WEBP' else '';target=OUT/f"{a['asset_id']}-{role}{suffix}.{ext}";buf=io.BytesIO()
            options={'optimize':True,'compress_level':9} if fmt=='PNG' else {'quality':86,'method':6,'exact':True} if fmt=='WEBP' else {'quality':88,'subsampling':0,'optimize':True,'progressive':True}
            if (role=='thumb' or a['asset_id']=='char_C01_formal') and fmt=='WEBP':options={'lossless':True,'method':6,'exact':True}
            cached=next((e for old in previous if old['asset_id']==a['asset_id'] and old['source_sha256']==digest(raw) and old['normalization']==transform for e in old['exports'] if e['role']==role and e['format']==fmt and e['settings']==options and e['dimensions']==list(size)),None)
            if cached:
                data=(ROOT/cached['path']).read_bytes();assert digest(data)==cached['sha256']
            else:
                img.save(buf,format=fmt,**options);data=buf.getvalue()
            save_exclusive(target,data)
            check=Image.open(io.BytesIO(data));check.load();alpha=check.getchannel('A') if 'A' in check.getbands() else None
            exports.append({'role':role,'path':str(target.relative_to(ROOT)),'format':fmt,'dimensions':list(check.size),'mode':check.mode,'bytes':len(data),'sha256':digest(data),'alpha_range':list(alpha.getextrema()) if alpha else None,'subject_bbox_alpha128':list(alpha.point(lambda n:255 if n>=128 else 0).getbbox()) if alpha else None,'settings':options})
    assert source.read_bytes()==raw
    return {'asset_id':a['asset_id'],'source':a['path'],'source_sha256':digest(raw),'source_bytes':len(raw),'native_dimensions':list(im.size),'normalization':transform,'exports':exports}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--register',action='store_true');parser.add_argument('--previous-manifest');args=parser.parse_args()
    p=ROOT/'design/S11/资产登记.json';register=json.loads(p.read_text());previous=json.loads((ROOT/args.previous_manifest).read_text())['assets'] if args.previous_manifest else [];rows=[export(a,previous) for a in register['assets']]
    manifest={'schema_version':1,'date':'2026-10-26','export_version':'s11-v1','tool':'Pillow '+pillow_version,'independent_assets':44,'export_files':sum(len(a['exports']) for a in rows),'upscaled':False,'originals_preserved':True,'note':'尺寸导出不增加独立资产数；建议母版分辨率未达到。人物只裁全透明空白，完整横图不裁切，不烘焙文字或UI。','assets':rows}
    save_exclusive(MANIFEST,(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode())
    if args.register:
        by_id={a['asset_id']:a for a in rows}
        for a in register['assets']:
            a['exports']=by_id[a['asset_id']]['exports'];a['export_manifest']='design/S11/导出登记.json'
        p.write_text(json.dumps(register,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'assets':len(rows),'files':manifest['export_files'],'source_bytes':sum(a['source_bytes'] for a in rows),'export_bytes':sum(e['bytes'] for a in rows for e in a['exports'])}))
if __name__=='__main__':main()
