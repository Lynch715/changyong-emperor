import {V7_EVENTS,V7_STORY,V7_RULES} from './volume7-content.js';
import {V5_EVENTS,V5_STORY,V5_RULES} from './volume5-content.js';
import {V4_EVENTS,V4_STORY,V4_RULES} from './volume4-content.js';
import {MEIZHUANG_EVENTS,MEIZHUANG_REPLIES} from './extension-meizhuang.js';
import {V3_EVENTS,V3_STORY,V3_RULES} from './volume3-content.js';
// Separate routes: never extend or renumber the seven core R routes.
const option=(id,label)=>({id,label,detail:'分别记录双方答复；不直接进入倾心。',effects:{},flags:{}});
export const EXTENSION_EVENTS={
 'XR09-04':V5_EVENTS['XR09-04'],'XR10-04':V5_EVENTS['XR10-04'],
 'XR10-03':V4_EVENTS['XR10-03'],
 ...MEIZHUANG_EVENTS,
 'XR09-03':V3_EVENTS['XR09-03'],
 'XR09-01':{id:'XR09-01',title:'名字之外',kind:'extension',actor:'C09',turn:4,location:'碎玉轩',actionCost:1,requires:['M06'],options:[option('develop','听完她不同的读法，愿意慢慢了解'),option('cooperate','只以诗相交，把私情的距离说清'),option('unsure','坦言尚未想定，不请她等候')],body:'碎玉轩的窗开了半扇，风将案上一页诗笺翻起。甄嬛伸手压住，先将茶挪远，怕水印落在纸上。\n\n“这句，臣妾原先觉得是惜别。”她指着末行，“今日再看，却觉得写诗的人未必肯留。”\n\n你说起另一种读法，她没有立刻应声。窗外有人走过，她等脚步远了，才问：“若臣妾读得与皇上不同，这一页还许留着么？”\n\n纸上并没有御前的题字，也没有为了迎合谁而重描的笔画。她将笔搁在自己的那一侧，留下一小块空白，既没有催你填，也没有代你写。\n\n你可以问她为什么改了想法，也可以只把今天当作一次读诗。殿前的接见已有名册与礼数；眼前这个人怎样看一句诗，却还得听她自己讲。\n\n她把那页纸转向你，笑意比方才轻快了一点：“若皇上只想听一句相同的话，臣妾便不必把这半日的疑问拿出来了。”\n\n案边的茶正好入口。她等的是你对这句话的回答，不是另一道赏赐。'},
 'XR09-02':{id:'XR09-02',title:'不作旧影',kind:'extension',actor:'C09',turn:7,location:'碎玉轩',actionCost:1,requires:['XR09-01','M11'],options:[option('develop','具体回答旧影，愿意继续了解本人'),option('cooperate','尊重她本人，也清楚说明无意私情'),option('unsure','说明尚未确定，不拿礼遇代替答案')],body:'那件新衣已经收起，甄嬛今日穿的是自己挑的寻常颜色。案边仍留着空白笺，她没有先拿诗来试探，只请你坐下。\n\n“暖阁里的话，臣妾听见了。”她将茶盖轻轻放稳，“可不拿臣妾与旧人相比，与愿不愿同臣妾来往，终究是两件事。”\n\n风吹动窗上的细格影，落在她的袖口。她没有换一个更讨喜的问法，也没有把今日的到来当作已经等到的答复。\n\n你想起第一次读诗时，她不肯随口改掉的那半句。若只要一个相同的答案，便连此刻的不同也看不见。她想知道的不是自己能比谁更好，而是往后说出不同的话，会不会又被要求照着别人的模样活。\n\n“若皇上无意，臣妾可以听明白；若尚未想定，也不必借旁的事替这句话。”她停了停，“只是臣妾如何答，还请容臣妾自己想。”\n\n茶在两人之间慢慢散着热气。今日可以说清一件事，却不能将过去没回答的话改成从来没有发生。她留着自己的决定，你也须对眼前说出的每一个字负责。'}
};
export const EXTENSION_WEEK_RULES=Object.fromEntries(Object.values(EXTENSION_EVENTS).map(e=>[e.id,{actor:e.actor,requires:e.requires,slotCost:1,costGroup:'SC-'+e.id,window:{earliest:e.id.endsWith('01')?[1,10,2]:e.actor==='C10'?[2,1,2]:[2,7,2],recommended:e.actor==='C10'?(e.id.endsWith('01')?[1,10,6]:[2,1,4]):e.id.endsWith('01')?[1,10,5]:[2,7,3],latest:[2,12,30]},...(e.id.endsWith('02')?{minimumDaysAfterPrevious:7}:{})}]));
export const EXTENSION_REPLIES={
 'XR09-04':V5_STORY['XR09-04'].replies,'XR10-04':V5_STORY['XR10-04'].replies,
 'XR10-03':V4_STORY['XR10-03'].replies,
 'XR09-03':V3_STORY['XR09-03'].replies,
 ...MEIZHUANG_REPLIES,
 'XR09-01':{
  develop:'你没有急着往空白处题字，先问她为什么改了读法。\n\n甄嬛将前一句也指给你看：“若只剩舍不得，后面便不该写得这样干净。”你仍有不同的看法，却没有让她重写。她把两种意思各说了一遍，笑道：“原来同一页纸，也容得下两个答案。”\n\n你说愿意慢慢了解她。她将纸收回自己面前：“那便先记得，臣妾今日没有同意这半句。”\n\n她愿意让你听见自己的想法，没有因此答应私情。临别时，她提起还有一首想读的诗；具体哪日再谈，仍要另行商量。',
  cooperate:'你把自己的读法说完，也说明往后依礼来往，私情不另许诺。\n\n甄嬛捏着纸角的手松开了些：“那臣妾倒不必为每一句话猜另一个意思。”她把不赞同的地方讲得更细，仍没有改成你的答案。\n\n你们各自留下对末句的解释，没有合写一份假装一致的题词。她收好诗笺，说下次若谈诗，仍可直说哪里不喜欢。\n\n门外有人候她，她依自己的时候告退。今天有清楚的距离，也有一段说完整的话；没有谁欠下一个往后必须亲近的答复。',
  unsure:'你说自己眼下尚未想定，不能为了留住今日的好意，请她替你等候。\n\n甄嬛没有急着接一句宽慰。她把那页诗翻到背面，才说：“那臣妾也不必先给一个答案。”\n\n后半盏茶仍能喝完。她谈起另一种断句，你听出她并非故意与你相反，只是不愿把不确定的事装成已经想通。\n\n告退前，她将诗笺放回自己的书里。今天没有约期，没有借礼物续上的许诺；若以后再谈，要从两个人届时真正愿说的话接起。'
 },
 'XR09-02':{
  develop:'你把话落在眼前：“朕想知道你为什么喜欢这句，又为什么会改。不是要你照谁的样子来。”\n\n甄嬛没有因这一句便将手递来。她问：“若以后臣妾的答案仍不合皇上心意呢？”\n\n你说那便听她说完，意见不同可以再谈，不用赏物遮住问题。她看了看案上空白的纸，仍把笔留在自己手边。\n\n这一次，你说的是愿意继续认识她，而不是宣布她已经爱上你。',
  cooperate:'你说明，不拿她与旧人相比，也不愿让礼遇继续被误当成私情许诺。\n\n甄嬛安静了一会儿，没有立刻笑出来。“这句话，臣妾听清了。”她端起茶，喝过才又开口，“往后谈诗，臣妾仍有自己的意思；应有的礼数，也不必因今日的话另作轻重。”\n\n你应下。她将窗开大了一点，说近日想把几页散稿理在一起。那是她自己的打算，不等一份御前的心意才开始。\n\n旧影之外，她仍有自己的名字。今日的距离有了清楚落款，往后不必将每次依礼相见都写成等待回心。',
  unsure:'你说尊重她本人，却不能把未定的心意说成已经有了归处，更不该让她替一句模糊的话等候。\n\n“臣妾也未曾答应等。”她的声音不高，却没有让这句话含混过去。\n\n你们把暖阁里的两件事分开：她不是旧人的影子，往后是否亲近仍须两个人各自回答。她可以继续读诗、见朋友，也可以改日不想谈这一件事。\n\n茶喝到一半，她合上杯盖。今日不添赏物，不替彼此作决定；原先说过的话仍留着，新的回答也只写到这里。'
 }
};

export const EXTENSION_PEOPLE={C09:{name:'甄嬛',place:'碎玉轩',first:'XR09-01',second:'XR09-02'},C10:{name:'沈眉庄',place:'宫中茶室',first:'XR10-01',second:'XR10-02'}};
EXTENSION_WEEK_RULES['XR09-03']={...V3_RULES['XR09-03'],slotCost:1};

EXTENSION_WEEK_RULES['XR10-03']={...V4_RULES['XR10-03'],slotCost:1};

for(const id of ['XR09-04','XR10-04'])EXTENSION_WEEK_RULES[id]={...V5_RULES[id],slotCost:1};

for(const id of ['XR09-05','XR10-05','XR09-06','XR10-06']){EXTENSION_EVENTS[id]=V7_EVENTS[id];EXTENSION_REPLIES[id]=V7_STORY[id].replies;EXTENSION_WEEK_RULES[id]={...V7_RULES[id],slotCost:1};}
