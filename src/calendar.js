import {RuleError} from './rules.js';
export function validDate(d){return !!d&&Number.isInteger(d.year)&&d.year>=1&&d.year<=999&&Number.isInteger(d.month)&&d.month>=1&&d.month<=12&&Number.isInteger(d.day)&&d.day>=1&&d.day<=30;}
export function ordinal(d){if(!validDate(d))throw new RuleError('日期须在每月30日的架空日历内。');return (d.year-1)*360+(d.month-1)*30+d.day;}
export function fromOrdinal(n){if(!Number.isInteger(n)||n<1||n>999*360)throw new RuleError('实际日超出日历范围。');return {year:Math.floor((n-1)/360)+1,month:Math.floor(((n-1)%360)/30)+1,day:(n-1)%30+1};}
export function addDays(d,n){if(!Number.isInteger(n))throw new RuleError('工期须为整数实际日。');return fromOrdinal(ordinal(d)+n);}
export function dateTurn(d){ordinal(d);return (d.year-1)*4+Math.floor((d.month-1)/3)+1;}
export function season(d){return ['春','夏','秋','冬'][Math.floor((d.month-1)/3)];}
export function ageOn(birth,d){const days=ordinal(d)-ordinal(birth);if(days<0)throw new RuleError('尚未到出生日期。');return Math.floor(days/360);}
export function stamp(d,period='day'){if(!['day','evening'].includes(period))throw new RuleError('时段须为日间或晚间。');return (ordinal(d)-1)*2+(period==='evening'?1:0);}
export function unstamp(n){if(!Number.isInteger(n)||n<0)throw new RuleError('时段序号错误。');return {date:fromOrdinal(Math.floor(n/2)+1),period:n%2?'evening':'day'};}
export const monthKey=d=>`${d.year}-${String(d.month).padStart(2,'0')}`;
