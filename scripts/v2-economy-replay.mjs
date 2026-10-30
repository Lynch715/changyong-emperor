import * as E from '../src/v2/engine.js';
export function replay(seed=38){const s=E.newGame(seed),curve=[];let n=0;while(n<72){while(s.agenda.length){const sc=E.scene(s.agenda[0]),os=E.optionsFor(s,sc);const o=os.find(x=>['warm','stay','keep','council','pilot','audit','both','develop','slow','alone'].includes(x.id))||os[0];E.choose(s,sc.id,o.id);}
 if(s.ap)E.review(s);if(s.ap)E.rest(s);if(s.ap&&s.people.C02.met)E.giveGift(s,'C02','tea');else if(s.ap)E.rest(s);E.spendNight(s,null);E.endMonth(s);n++;if(n%12===0)curve.push({month:n,treasury:s.stats.treasury,inner:s.stats.inner});if(s.ended&&n<72){if(n===24)E.startVolume2(s);if(n===48)E.startVolume3(s);}}
 return {curve,state:s};}
if(process.argv[1]?.endsWith('v2-economy-replay.mjs'))console.log(JSON.stringify(replay().curve,null,2));
