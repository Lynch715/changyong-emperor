import * as E from '../../src/v2/engine.js';
import * as G from '../../src/v2/government.js';
export function screenLike(seed=432){
 const old=E.newGame(seed);delete old.fiscal;old.year=3;old.month=2;old.vol=2;old.agenda=[];old.memorials=[];old.followups=[];old.majorEvent=null;old.ap=0;old.night=false;
 Object.assign(old.stats,{treasury:786.62,inner:111.98,people:65,court:64,palace:86,health:96});
 for(let i=0;i<60;i++){const p=G.MEMORIAL_POOL[i%G.MEMORIAL_POOL.length];G.addMemorial(old,{...p,id:'old-'+i});}
 return E.load({getItem:()=>JSON.stringify(old)});
}
