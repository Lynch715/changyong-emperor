"""Inspect native files; update factual inventory without changing image pixels."""
import json, hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
p=root/'design/S11/资产登记.json'
data=json.loads(p.read_text())
reviews={
'C01':'沿用原样张；中年长脸、石青常服，暖玉；保留原文件。',
'C02':'较宽面颊、眼周纹理、清须；深茶褐灰青总管常服，持巾，完整站姿。',
'C03':'方正骨相、浓眉、髭须，铁灰暗红将军常服与卷图；完整帽顶、靴与衣摆。',
'C04':'细长椭圆脸、清须与医箱；首稿帽式及汉服交领退回，改为清式圆帽及右衽领口。',
'C05':'修订后长方骨相、较深眉眼与微笑纹，石青竹绿与玉带；笛垂于身侧，保持果郡王身份。',
'C06':'沿用原样张；沉紫暗金中宫常服、成熟克制表情；保留原文件。',
'C07':'上挑眉眼、较饱满唇形与自持神态，石榴红暖金常服。',
'C08':'较窄椭圆脸、小弧眉、收敛目光；淡茶绿粉线，持绢。',
'C09':'偏心形脸、抬颌观察神态，杏白浅粉枝纹与折扇；独立人物基准。',
'C10':'相对宽的椭圆骨相、较平眉眼、平静正视；菊金湖绿常服。'}
asset_reviews={'char_C01_formal': '以原C01常服为身份参考，保留脸型、年龄与髭须；正式金赭龙袍、深石青领肩、冠与朝珠，完整冠顶、双手、衣摆与鞋。', 'char_C11_base': '成熟椭圆脸、平静眼神与较饱满面颊；烟蓝妃服、克制珠饰，完整站姿。', 'char_C19_base': '较方圆脸、直眉和警醒目光；砖玫瑰色侍从常服、简发簪、持巾，非妃嫔头冠。', 'char_C20_base': '较窄脸、细眉及谨慎表情；灰紫侍从常服、简花簪，无大冠或过量珠饰。', 'char_C21_base': '年长面部皱纹、灰发与成熟骨相；墨绿褐紫太后常服、珠串，非青年脸加白发。', 'char_C22_base': '较方脸、短浓眉、紧凑鼻形，清须；蓝灰医官常服与棕色短褂，持无字医册，与温实初区分。', 'char_C26_base': '长方骨相、较平眉、长于雍正的修整须形；深靛银纹亲王常服、玉带与无字文书卷。', 'char_C28_base': '较高额头、细眉、灰长须及眼周年龄纹理；深青文臣服、鸟纹补子，持无字奏折册。', 'char_C32_base': '较宽鼻、深色皮肤、短髭与坚实骨相；靛蓝军职常服、皮带与素靴，无甲胄，不复用年羹尧图。', 'art_bg_02': '通用宫室、屏风茶案与双盏；无人、无专属匾额和可读文字，未绑定某位人物的寝宫。', 'art_bg_03': '宫中廊道、竹松、山石与水面；无人无文字，无花雪天气；绿植水面明显，冬季不直接使用。', 'art_bg_04': '空置朝议殿、柱廊与正式座位；无人，无可读匾额或奏折文字，不冒充县衙、军帐。', 'cover': '左半纸墨留白，右侧御案、茶盏与灯，远处宫檐；无标题文字或按钮，软件叠字。', 'cg_CG01': '参考C01与C02身份合成：御案惊醒、帘边持拂尘的苏培盛、倒笔与朱砂；双人完整构图可查看，无亲密、赠礼及分支结果。', 'cg_CG15': '参考C01与C08身份合成：安陵容停曲持帕、雍正于独立席案放杯；宫宴局部构图，其他宾客在画外，无恋爱承诺、赏赐或分支结果。'}
asset_reviews.update({'char_C01_elder': '沿用C01身份参照，面颊消瘦、额眼纹及灰须、年长手部与微俯体态；石青常服，全身保留。', 'char_C12_base': '细长成熟面庞、平静疲惫神情；灰梅色常服与浅披肩，完整站姿，不画病榻。', 'char_C13_base': '较圆成熟面颊、微蹙眉；赭褐常服与手绢，端正站姿，独立面貌。', 'char_C14_base': '细长带棱角的椭圆脸、审慎目光；灰玫瑰金常服及高发髻，单人无温宜。', 'char_C15_base': '较宽面颊与笑纹，坦然微笑；青绿铜色常服，双手自然相叠。', 'char_C16_base': '成年长椭圆脸、微抬下颌；珍珠白淡紫常服，克制矜持的神情。', 'char_C17_base': '成熟宽椭圆脸与眼周纹理；蓝灰褐侍从常服、简簪，完整站姿。', 'char_C18_base': '紧凑心形偏方脸、直接目光；苔绿锈色侍从衣，简发髻持小袋。', 'char_C24_base': '成熟长椭圆脸、细弧眉与礼貌浅笑，髭及尖短须；银灰梅色亲王常服，双手相叠。', 'char_C25_base': '较宽颌面、低浓眉、短髭与审视目光；栗褐蓝绿亲王常服、持素账册，完整帽靴。', 'char_C27_base': '厚重方脸、斜浓眉、额纹与灰髭；炭灰铜色官服、鸟纹补子，双手相叠。', 'char_C29_base': '圆长脸、较宽鼻和短髭须；橄榄褐官服、鸟纹补子与朝珠，持素册。', 'char_C30_base': '年长瘦长脸、深眼窝、细灰长须及额纹；墨蓝灰官服持奏册，完整帽靴。', 'char_C31_base': '较宽圆脸、低眉笑眼、短髭与下颌须；深褐蓝绿常服持小册，舒展站姿。', 'char_C33_base': '仅成年弘时；棱角颌面、严肃窄眼、清须；赭红石青皇子常服，完整站姿。', 'char_C34_base': '仅成年弘历；长椭圆脸、较高额头、平静明亮目光；银蓝杏白竹纹常服持素书。', 'char_C35_base': '仅成年弘昼；较圆面颊、低弧眉、轻松微笑；米白青绿常服持合扇。', 'char_C36_base': '仅成年澄宁；心形面庞、舒展眉眼；玫瑰玉绿公主常服和金玉花簪，无婚礼头饰。'})
for a in data['assets']:
 f=root/a['path']
 if not f.exists():continue
 im=Image.open(f);a['actual_dimensions']=list(im.size)
 a['sha256']=hashlib.sha256(f.read_bytes()).hexdigest()
 if im.mode=='RGBA':
  alpha=im.getchannel('A');h=alpha.histogram()
  a['alpha']={'range':list(alpha.getextrema()),'transparent_pixels':h[0],'near_opaque_pixels':sum(h[240:]),'nonzero_pixels':sum(h[1:]),'subject_bbox_alpha128':list(alpha.point(lambda n:255 if n>=128 else 0).getbbox())}
 else:a['alpha']=None
 a['native_dimensions_note']='真实原生尺寸；未放大，不声明达到建议母版尺寸。'
 if a['status']=='pending':
  assert a['asset_id'] in asset_reviews or (a['asset_id'].endswith('_base') and a.get('character_id') in reviews), '缺少逐张视觉验收记录'
  source=f"output/imagegen/S11/{a['asset_id']}-native.png"
  assert (root/source).read_bytes()==f.read_bytes()
  a.update(source_file=source,status='generated-reviewed',version='S11-native-2026-10-26',generator='built-in image_gen',prompt_files=[str(x.relative_to(root)) for x in sorted((root/'output/imagegen/S11/prompts').glob(a['asset_id']+'*.txt'))],integration='未接入实际剧情与活动页')
 if a['asset_id'] in asset_reviews:a['visual_review']=asset_reviews[a['asset_id']]
 elif a.get('character_id') in reviews and a['asset_id'].endswith('_base'):a['visual_review']=reviews[a['character_id']]
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
ready=[a for a in data['assets'] if (root/a['path']).exists()]
first=[a for a in ready if a['release']=='first']
text=['# 美术资产登记与缺件表','',f"2026-10-26。44个唯一ID，首版26项。当前文件{len(ready)}项，首版缺{26-len(first)}项、完整版总缺{44-len(ready)}项；其中原3样张已接入，新增{len(ready)-3}图已检查但未接入实际剧情。",'', '施工前基线为3样张、首版缺23／完整缺41。审计清单完成不等于文件或页面验收全部完成。','','| ID | 名称 | 范围 | 视觉年龄 | 用途／服装 | 实际尺寸 | 状态 | 目标文件 |','| --- | --- | --- | --- | --- | --- | --- | --- |']
labels={'pending':'待制作','sample-integrated':'原样张已接入','generated-reviewed':'原生图已检查／待接入'}
for a in data['assets']:
 dims='×'.join(map(str,a['actual_dimensions'])) if a['actual_dimensions'] else '未生成'
 text.append(f"| {a['asset_id']} | {a['name']} | {'首版' if a['release']=='first' else '完整版追加'} | {a.get('age_range','—')} | {a['outfit_context']} | {dims} | {labels[a['status']]} | {a['path']} |")
text+=['','角色建议1600×2400透明PNG；背景、封面及插画建议2560×1440。真实尺寸与源图路径逐项保留；放大、缩略、裁切及退回稿均不增加独立资产数。','','C23停用，只映射C05允礼。甄嬛C09、沈眉庄C10共用唯一基准，不因扩展线再加ID。C33至C36仅成年图；未出生、童年及年龄明显不符时使用姓名牌。其他人物暮年缺图也不能拿青年图冒充。','','ART_BG01–04映射art_bg_01–04；逻辑BG01–22不扩成22张图，PR01–24继续文字。CG01对应M01、CG15对应M07首次完成，不能预设恋爱承诺。','','所有现有立绘的外围均有零alpha像素，主体近不透明；原三样张保留不改。新的全身基准均已逐张看图，实际正文及活动接入另按S11-06验收。']
(root/'design/S11/美术资产登记与缺件表.md').write_text('\n'.join(text)+'\n')
print(json.dumps({'ready':len(ready),'firstMissing':26-len(first),'fullMissing':44-len(ready)},ensure_ascii=False))
