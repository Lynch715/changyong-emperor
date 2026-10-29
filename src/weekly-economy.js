// Treasury points are discretionary funds after ordinary running costs.
// The opening two years retain their teaching budget; long dates no longer
// multiply that short opening surplus across thirty years.
export function monthlyBudget(s,date){const long=s.weekly?.economy?.version===2&&date.year>=3;const income=12,expense=long&&date.month!==1?12:9;return{income,expense,net:income-expense};}
export function economyReading(s){return s.weekly?.economy?.version===2?'前两年每月结余3点；三年起常例收支相抵，每年正月留3点结余。拨款、宴席与新物另计。':'本卷沿原账：常规每月收入12点、支出9点；拨款与活动另计。';}
