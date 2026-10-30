"""Export selected built-in imagegen images using the S11 normalization rules."""
import json,sys,hashlib,shutil
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
plan=json.loads((ROOT/'design/S11/0.39-补图清单.json').read_text())
sources=json.loads(Path(sys.argv[1]).read_text())
registry_path=ROOT/'design/S11/资产登记.json'; export_path=ROOT/'design/S11/导出登记.json'
registry=json.loads(registry_path.read_text()); manifest=json.loads(export_path.read_text())
out=ROOT/'assets/exports/s11-v1';out.mkdir(parents=True,exist_ok=True)
review=ROOT/'output/playwright/v039';review.mkdir(parents=True,exist_ok=True)
items=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def put(im,p,**opts):
 import io
 buf=io.BytesIO();im.save(buf,format='WEBP' if p.suffix=='.webp' else 'PNG' if p.suffix=='.png' else 'JPEG',**opts);data=buf.getvalue()
 if p.exists() and p.read_bytes()!=data:raise RuntimeError('Refusing to overwrite changed export '+str(p))
 p.write_bytes(data)
 return {'path':p.relative_to(ROOT).as_posix(),'format':im.format or ('PNG' if p.suffix=='.png' else 'WebP' if p.suffix=='.webp' else 'JPEG'),'dimensions':list(im.size),'mode':im.mode,'bytes':len(data),'sha256':sha(p)}
for category in ['portraits','backgrounds']:
 for spec in plan[category]:
  if spec['id'] not in sources:continue
  native=ROOT/spec['source'];native.parent.mkdir(parents=True,exist_ok=True);selected=Path(sources[spec['id']])
  if native.exists() and native.read_bytes()!=selected.read_bytes():raise RuntimeError('Existing source differs '+str(native))
  if not native.exists():shutil.copy2(selected,native)
  im=Image.open(native);original_size=list(im.size);portrait=category=='portraits';asset_id='char_'+spec['id']+'_base' if portrait else 'bg_v039_'+spec['id'];files=[]
  if portrait:
   im=im.convert('RGBA');alpha=im.getchannel('A');extrema=alpha.getextrema()
   if extrema[0]!=0 or extrema[1]<128:raise RuntimeError(f'{asset_id}: transparency missing {extrema}')
   subject=alpha.point(lambda x:255 if x>=128 else 0).getbbox();crop=alpha.getbbox()
   if not subject:raise RuntimeError('Empty portrait')
   scale=1036/(subject[3]-subject[1]);scaled=(round((crop[2]-crop[0])*scale),round((crop[3]-crop[1])*scale));paste=(round(384-((subject[0]+subject[2])/2-crop[0])*scale),round(1094-(subject[3]-crop[1])*scale))
   if min(paste)<0 or paste[0]+scaled[0]>768 or paste[1]+scaled[1]>1152 or scale>1:raise RuntimeError('Portrait does not fit S11 '+asset_id)
   canvas=Image.new('RGBA',(768,1152));canvas.paste(im.crop(crop).convert('RGBa').resize(scaled,Image.Resampling.LANCZOS).convert('RGBA'),paste)
   for role,size in [('display',(768,1152)),('mobile',(384,576)),('thumb',(128,192))]:
    pic=canvas.convert('RGBa').resize(size,Image.Resampling.LANCZOS).convert('RGBA')
    for suffix,opts in [('.png',{}),('.webp',{'lossless':True} if role=='thumb' else {'quality':86,'method':6})]:
     info=put(pic,out/(asset_id+'-'+role+suffix),**opts);info['role']=role;files.append(info)
   normalized={'crop_alpha_nonzero':list(crop),'subject_alpha128':list(subject),'scaled_crop_size':list(scaled),'paste':list(paste),'target_subject_height':1036,'target_baseline':1094}
  else:
   im=im.convert('RGB');normalized={'crop':[0,0,*im.size],'content_removed':False,'display_fit':'contain on dark neutral canvas, no stretching'}
   for role,size in [('full',im.size),('display',(1280,720)),('thumb',(320,180))]:
    if role=='full':pic=im
    else:
     fitted=ImageOps.contain(im,size,Image.Resampling.LANCZOS);pic=Image.new('RGB',size,(27,42,53));pic.paste(fitted,((size[0]-fitted.width)//2,(size[1]-fitted.height)//2))
    for suffix,opts in [('.jpg',{'quality':88}),('.webp',{'lossless':True} if role=='thumb' else {'quality':86,'method':6})]:
     info=put(pic,out/(asset_id+'-'+role+suffix),**opts);info['role']=role;files.append(info)
  row={'asset_id':asset_id,'source':spec['source'],'source_sha256':sha(native),'source_bytes':native.stat().st_size,'native_dimensions':original_size,'normalization':normalized,'exports':files}
  record={'asset_id':asset_id,'character_id':spec['id'] if portrait else None,'name':spec['name'],'category':'portrait' if portrait else 'background','release':'v0.39.0','path':spec['source'],'source_file':spec['source'],'actual_dimensions':original_size,'required_transparency':portrait,'sha256':sha(native),'generator':'built-in image_gen','visual_brief':spec['brief'],'status':'generated-reviewed','prompt_files':['design/S11/0.39-补图清单.json'],'exports':files}
  registry['assets']=[a for a in registry['assets'] if a['asset_id']!=asset_id]+[record];manifest['assets']=[a for a in manifest['assets'] if a['asset_id']!=asset_id]+[row]
  items.append((spec,im,canvas if portrait else im))
  check=Image.new('RGB',(1000,680),(230,224,210));label=ImageDraw.Draw(check)
  label.text((14,12),asset_id+' | native '+str(tuple(original_size)),fill=(20,30,35))
  for j,(pic,title) in enumerate([(im,'NATIVE'),(canvas if portrait else Image.open(out/(asset_id+'-display.jpg')),'DISPLAY')]):
   preview=pic.copy();preview.thumbnail((450,570));x=15+j*490;y=65
   if preview.mode=='RGBA':check.paste(preview,(x,y),preview)
   else:check.paste(preview,(x,y))
   label.text((x,40),title+' '+str(pic.size),fill=(20,30,35))
  label.text((14,648),'Exports: '+', '.join(f['role']+' '+str(tuple(f['dimensions'])) for f in files[::2]),fill=(20,30,35))
  check.save(review/(asset_id+'-dimensions.png'))
registry['v039_added']=25;manifest['independent_assets']=len(manifest['assets']);manifest['export_files']=sum(len(a['exports']) for a in manifest['assets']);manifest['v039_note']='新增25项使用实际原生尺寸，未放大原图，人物透明规范化，背景完整保留。'
registry_path.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n');export_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
# Review contact sheets: original and normalized exports with dimensions.
for portrait in [True,False]:
 selected=[x for x in items if (x[0] in plan['portraits'])==portrait]
 if not selected:continue
 cellw,cellh=(260,430) if portrait else (420,300);sheet=Image.new('RGB',(cellw*4,cellh*((len(selected)+3)//4)),(230,224,210));d=ImageDraw.Draw(sheet)
 for i,(spec,im,norm) in enumerate(selected):
  thumb=norm.copy();thumb.thumbnail((cellw-12,cellh-60));x=(i%4)*cellw+(cellw-thumb.width)//2;y=(i//4)*cellh+28
  if portrait:sheet.paste(thumb,(x,y),thumb)
  else:sheet.paste(thumb,(x,y))
  d.text(((i%4)*cellw+6,(i//4)*cellh+5),spec['id']+' '+str(im.size)+' -> '+('768x1152' if portrait else '1280x720'),fill=(20,30,35))
 sheet.save(review/('portraits-contact.png' if portrait else 'backgrounds-contact.png'))
print('Exported',len(items),'selected assets')
