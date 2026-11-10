import {YEAR_NAME, MONTHS} from './data.js';

// 只改变显示方式，存档仍使用原来的年-月字符串。
export function gameDate(value) {
 const match = /^(\d+)-(\d+)$/.exec(String(value));
 return match && MONTHS[Number(match[2]) - 1] ?
  `雍正${YEAR_NAME(Number(match[1]))}年${MONTHS[Number(match[2]) - 1]}` : String(value || '待定');
}
