"""Inspect exported pixels and encoded files, independently of export routines."""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
root=Path(__file__).resolve().parents[1];data=json.loads((root/'design/S11/导出登记.json').read_text());report=[]
assert len(data['assets'])==44 and data['export_files']==264
paths=[]
for a in data['assets']:
    raw=(root/a['source']).read_bytes();assert hashlib.sha256(raw).hexdigest()==a['source_sha256']
    portrait=a['asset_id'].startswith('char_');expected={'display':(768,1152),'mobile':(384,576),'thumb':(128,192)} if portrait else {'full':(1672,941),'display':(1280,720),'thumb':(320,180)}
    result={'asset_id':a['asset_id'],'variants':[]}
    for role,size in expected.items():
        pair=[e for e in a['exports'] if e['role']==role];assert len(pair)==2
        images={}
        for e in pair:
            p=root/e['path'];raw=p.read_bytes();assert hashlib.sha256(raw).hexdigest()==e['sha256'];assert len(raw)==e['bytes'];paths.append(e['path'])
            im=Image.open(p);im.load();assert im.size==size and list(im.size)==e['dimensions'];assert im.format==e['format'];images[e['format']]=im
            if portrait:
                assert im.mode=='RGBA';alpha=im.getchannel('A');assert alpha.getextrema()[0]==0;box=alpha.point(lambda n:255 if n>=128 else 0).getbbox();assert box
                factor=size[1]/1152;x,y,r,b=box
                assert abs((b-y)-1036*factor)<=3,(a['asset_id'],role,box)
                assert abs(b-1094*factor)<=3 and abs((x+r)/2-384*factor)<=3,(a['asset_id'],role,box)
                assert x>0 and y>0 and r<size[0] and b<size[1]
                # Completely clear outer frame; no subject, veil or low-alpha halo is cut.
                assert not any(alpha.crop(box).getbbox() for box in [(0,0,size[0],1),(0,size[1]-1,size[0],size[1]),(0,0,1,size[1]),(size[0]-1,0,size[0],size[1])])
            else:assert im.mode=='RGB'
        if portrait:
            assert ImageChops.difference(images['PNG'].getchannel('A'),images['WEBP'].getchannel('A')).getbbox() is None
            mask=images['PNG'].getchannel('A').point(lambda n:255 if n>=128 else 0)
            error=ImageStat.Stat(ImageChops.difference(images['PNG'].convert('RGB'),images['WEBP'].convert('RGB')),mask).mean
            assert max(error)<7,(a['asset_id'],role,error)
        else:
            error=ImageStat.Stat(ImageChops.difference(images['JPEG'],images['WEBP'])).mean;assert max(error)<10
        result['variants'].append({'role':role,'dimensions':list(size),'mean_absolute_channel_error':error,'webp_bytes':next(e['bytes'] for e in pair if e['format']=='WEBP'),'fallback_bytes':next(e['bytes'] for e in pair if e['format']!='WEBP'),'alpha_exact':portrait})
    report.append(result)
assert len(set(paths))==264
out=root/'docs/施工/证据/2026-10-26-S11-05/导出像素核验.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'assets':44,'files':264,'portrait_alpha_pairs':111,'source_bytes':sum(a['source_bytes'] for a in data['assets']),'display_webp_bytes':sum(e['bytes'] for a in data['assets'] for e in a['exports'] if e['role']=='display' and e['format']=='WEBP'),'display_fallback_bytes':sum(e['bytes'] for a in data['assets'] for e in a['exports'] if e['role']=='display' and e['format']!='WEBP'),'all_export_bytes':sum(e['bytes'] for a in data['assets'] for e in a['exports'])}))
