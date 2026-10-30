import {CAST,BG} from './data.js';
export const PORTRAIT_IDS=new Set(['C01',...CAST]);
export const PLACE_ART={rice:'rice',liuli:'liuli',temple:'temple',tianqiao:'tianqiao',qianmen:'qianmen',shicha:'shicha-summer',baiyun:'baiyun',river:'river',nanfeng:'nanfeng-exterior','nanfeng-interior':'nanfeng-interior'};
export const NIGHT_BG='assets/exports/s11-v1/bg_v039_bedchamber-display.webp';
export function placeBackground(id,month=1,role='display'){
 let key=PLACE_ART[id];if(id==='shicha')key=month>=10?'shicha-winter':month>=4&&month<=6?'shicha-summer':'river';
 return key?`assets/exports/s11-v1/bg_v039_${key}-${role}.webp`:BG.garden;
}
export const portraitFile=(id,role='mobile',format='webp')=>`assets/exports/s11-v1/char_${id}_base-${role}${role==='thumb'&&format==='webp'&&id.startsWith('C')&&Number(id.slice(1))<=36?'-lossless':''}.${format}`;
