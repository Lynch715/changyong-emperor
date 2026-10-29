// 旧验收存档已删除。需要“某幕主线开场前的局面”时，用当前引擎当场生成；只算一次。
import {mainCheckpoints} from './s08-main-scenarios.mjs';
let weekly,quarter;
export function generatedBaseline(){
 return {get weekly(){return weekly||={checkpoints:mainCheckpoints({weekly:true}).checkpoints};},
         get quarter(){return quarter||={checkpoints:mainCheckpoints({weekly:false}).checkpoints};}};
}
