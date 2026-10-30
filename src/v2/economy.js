import {ECONOMY} from './data.js';
export const silver=n=>Math.round((Number(n)||0)*100)/100;
export const treasuryIndex=s=>Math.min(100,Math.max(0,Math.round(s.stats.treasury/ECONOMY.fullTreasury*100)));
export const moneyText=n=>{const v=Math.abs(silver(n));return v===0?'0 万两':v>=1?`${v} 万两`:v>=.1?`${silver(v*10)} 千两`:`${silver(v*100)} 百两`;};
export function initEconomy(s){
 if(!s.economyVersion){s.stats.treasury=silver(s.stats.treasury*ECONOMY.legacyScale);s.economyVersion=1;}
 s.stats.inner=Number.isFinite(s.stats.inner)?s.stats.inner:ECONOMY.startInner;
 s.ledger=s.ledger||{treasury:{in:0,out:0},inner:{in:0,out:0}};return s;
}
export const emptyLedger=()=>({treasury:{in:0,out:0},inner:{in:0,out:0}});
export function funds(s,changes){const applied={};s.ledger=s.ledger||emptyLedger();for(const k of ['treasury','inner']){if(!Number.isFinite(changes[k]))continue;const before=s.stats[k];s.stats[k]=Math.max(0,silver(before+changes[k]));const d=silver(s.stats[k]-before);if(!d)continue;applied[k]=d;s.delta.stats[k]=silver((s.delta.stats[k]||0)+d);const row=s.ledger[k];if(d>0)row.in=silver(row.in+d);else row.out=silver(row.out-d);}return applied;}
