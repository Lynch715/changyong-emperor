import {CAST,BG} from './data.js';
export const PORTRAIT_IDS=new Set(['C01',...CAST]);
export const PLACE_ART={rice:'rice',liuli:'liuli',temple:'temple',tianqiao:'tianqiao',qianmen:'qianmen',shicha:'shicha-summer',baiyun:'baiyun',river:'river',nanfeng:'nanfeng-exterior','nanfeng-interior':'nanfeng-interior'};
export const NIGHT_BG='assets/exports/s11-v1/bg_v039_bedchamber-display.webp';
export function placeBackground(id,month=1,role='display'){
 let key=PLACE_ART[id];if(id==='shicha')key=month>=10?'shicha-winter':month>=4&&month<=6?'shicha-summer':'river';
 return key?`assets/exports/s11-v1/bg_v039_${key}-${role}.webp`:BG.garden;
}
export const portraitFile=(id,role='mobile',format='webp')=>`assets/exports/s11-v1/char_${id}_base-${role}${role==='thumb'&&format==='webp'&&id.startsWith('C')&&Number(id.slice(1))<=36?'-lossless':''}.${format}`;

// 14 张合龄皇嗣正式立绘。稳定编号兼容已有存档，禁止以成年肖像代替孩子。
const infantDescriptions=['杏黄襁褓，安睡','天青襁褓，满月小帽','朱红襁褓，团花纹样','豆绿襁褓，绣花软帽','藕粉襁褓，月白包边','鹅黄襁褓，平安绣纹'];
const youthDescriptions=['青衫读书，神情专注','靛蓝骑射服，束袖立姿','竹青便服，执笔习字','月白常服，观棋思索','浅杏日常衣裙，案前读书','淡青常服，抚琴习曲','藕荷骑装，持弓习射','湖绿衣裙，临窗绘花'];
export const KID_ART=Object.fromEntries(['infant','youth'].flatMap(stage=>(stage==='infant'?infantDescriptions:youthDescriptions).map((description,i)=>{const num=String(i+1).padStart(2,'0'),id=`k_${stage}_${num}`,sex=i<(stage==='infant'?3:4)?'男':'女';return [id,{id,sex,stage,description,placeholder:false,mobile:`assets/exports/s11-v1/kid_${stage}_${num}-mobile.webp`,thumb:`assets/exports/s11-v1/kid_${stage}_${num}-thumb.webp`}];})));
