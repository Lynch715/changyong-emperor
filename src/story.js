import {V8_STORY} from './volume8-content.js';
import {V7_STORY} from './volume7-content.js';
import {V6_STORY} from './volume6-content.js';
import {sixthReply} from './volume6.js';
import {V5_STORY} from './volume5-content.js';
import {fifthReply} from './volume5.js';
import {V4_STORY} from './volume4-content.js';
import {fourthReply} from './volume4.js';
import {EXTENSION_EVENTS,EXTENSION_REPLIES} from './extension-content.js';
import {V3_STORY} from './volume3-content.js';
import {incenseSceneReply,incenseEcho} from './incense.js';
import {attitudeEcho} from './extension-bridge.js';
import {WORLD_STORY,worldSceneReply} from './world-story.js';
import {RELATION_STORY,relationSceneEcho,remoteNodeReply} from './relation-story.js';
import {MAIN_STORY,mainSceneEcho} from './main-story.js';
// Authored scenes and bounded callbacks. No model owns these outcomes or rewards.
export const STORY_VERSION = 22;
export const STORY = {
 ...Object.fromEntries(Object.values(EXTENSION_EVENTS).map(e=>[e.id,{body:e.body,replies:EXTENSION_REPLIES[e.id]}])),
 ...MAIN_STORY,
 ...RELATION_STORY,
 ...WORLD_STORY,
 ...V3_STORY,
 ...V4_STORY,
 ...V5_STORY,
 ...V6_STORY,
 ...V8_STORY,
 ...V7_STORY
};

export function installStory(events){for(const [id,story] of Object.entries(STORY)){const e=events[id];if(!e)continue;e.body=story.body;e.sceneVisible=story.visible||story.body;for(const o of e.options){if(story.labels?.[o.id])o.label=story.labels[o.id];if(e.kind==='main'||e.kind==='relation'){o.detail=Object.entries(o.effects).filter(([,v])=>v).map(([k,v])=>`${({treasury:'国库',mood:'心绪',health:'圣躬',palace:'六宫秩序',stability:'朝局稳定',execution:'政令执行',people:'民生',defense:'边防'})[k]} ${v>0?'+':''}${v}`).join(' · ');if(e.kind==='relation')o.detail=o.id==='warm'?'信任 +5 · 安全感 +2':o.id==='work'?'信任 +3':'信任 +1 · 保持合作';}}}}
export function teaMemory(s,actor){return s.memories.filter(m=>m.actor===actor&&!m.deleted&&!m.supersededBy&&m.scope==='夜间饮茶').at(-1);}
function teaEcho(mem,actor,id){
 const names={C02:'苏培盛',C03:'年羹尧',C04:'温实初',C05:'允礼',C06:'宜修',C07:'年世兰',C08:'安陵容'},name=names[actor],text=mem.text;
 const noTea=/(?:不喝茶|不饮茶|不要茶)/.test(text)&&!/(?:并非|不是不|浓|淡)/.test(text);
 const light=/(?:不爱|不喜|别给|不要).{0,6}浓茶|(?:爱喝|喜欢|改喝|换成|改成).{0,3}淡茶/.test(text)&&!/(?:并非不|不是不)/.test(text);
 const strong=/(?:爱喝|喜欢).{0,3}浓茶/.test(text)&&!/(?:不爱|不喜|并非|不是)/.test(text);
 if(noTea)return `${name}这回没有添茶，将一杯温水放在你手边。你望过去，对方道：“记得你上回说过。”`;
 if(light)return id.endsWith('02')?`${name}送到手边的茶依然沏得淡。你揭盖时，对方看见你闻过茶气，才放心将壶放稳。`:`${name}端来一盏淡茶，轻轻拨过杯盖：“这一盏沏得淡些。”你没有再说过浓淡，对方却已记住。`;
 if(strong)return `${name}添茶前，先照你说过的浓淡试了水色。热气升起来，正是你提过的那种茶气。`;
 return `${name}添茶前先停了停：“你上回说，‘${text}’。今日也照这个来么？”`;
}
export function memoryEcho(s,e){
 if(e.remoteRelation)return '';
 const lines=[];
 const attitude=attitudeEcho(s,e);if(attitude)lines.push(attitude);
 const relationEcho=incenseEcho(s,e,relationSceneEcho(s,e));if(relationEcho)lines.push(relationEcho);
 const mainEcho=mainSceneEcho(s,e);if(mainEcho)lines.push(mainEcho);
 const fulfilled=(s.weekly?[...(s.weekly.migration?.source.promises||[]),...s.weekly.plans.filter(p=>p.status==='completed'&&['meet','rest','letter'].includes(p.kind)&&(p.kind!=='letter'||s.weekly.notices.some(n=>n.source===p.id&&n.type==='delivery'&&n.status==='read')))]:s.promises).filter(p=>p.actor===e.actor&&['fulfilled','completed'].includes(p.status)).at(-1);
 if(e.kind==='relation'&&fulfilled)lines.push(fulfilled.purpose==='rest'?'苏培盛说起上次按时交班，眉间松快了些：“那一夜睡得踏实，皇上后来问的，奴才还记着。”':fulfilled.purpose==='letter'?'那封依时寄出的信，还被仔细留着。今日再提起，对方认得你信里的那句话。':({C02:'他提起那次如约的相见，语气比初时松快：“皇上说的话，奴才记着。”',C03:'年羹尧还记得上回依约留出的那段时间，那次未说完的近况，今日有了下文。',C04:'他还记得你上次依约留出的那段时间，今日带来一页可以接着往下看的脉案。',C05:'允礼说起上次依时的相见，笑道：“这回臣弟也先将府里的事排妥了。”',C06:'她记得你上次依时而来，这回不再先问今日会不会走得很急。',C07:'她还记得你上回按约来过，今日见你进门，先将另一只茶杯挪近。',C08:'她还记得你上次没有失约，这回备曲时，也敢先问你想听哪一段。'})[e.actor]);
 const mem=teaMemory(s,e.actor);if(mem&&e.kind==='relation'&&e.id!=='R03-02')lines.push(teaEcho(mem,e.actor,e.id));
 return lines.filter(Boolean).join('\n\n');
}
export function sceneText(s,e){return [memoryEcho(s,e),e.body].filter(Boolean).join('\n\n');}
export function sceneReply(s,e,choice){const v6=sixthReply(s,e,choice);if(v6)return v6;const v5=fifthReply(s,e,choice);if(v5)return v5;const v4=fourthReply(s,e,choice);if(v4)return v4;if(e.remoteRelation)return remoteNodeReply(choice);if(e.id==='G21'){const mode=s.events.G20?.outcomeId;return (mode==='independent'?'本轮独立抽核的取样、单据与借阅签名已按授权核对，本批有据可对；缺页仍列待补，不代判初年旧案。':mode==='limited'?'本轮只核现有目录和可取原件，能对上的一批已留下回执，缺样部分未做独立抽检，不记全面验收。':'本轮没有新增经费，回单只说明常规目录核到的范围；独立抽检仍未执行，不把未花的款写成已做的成果。')+'\n\n'+V3_STORY.G21.replies.review;}const base=worldSceneReply(s,e,choice)||STORY[e.id]?.replies[choice.id]||({government:'朱批落下，经手的人上前接过原页，复述一遍要办的事。殿外脚步远去，案上留下待回的那一份。',followup:'回报摊到灯下，原先圈出的地方终于有了下文。你核过几处，旁边的人才将新页夹回旧册。',side:'话说清后，对面的人终于接得上话，收起原先攥着的那张纸。门外风过，今日这桩事有了着落。',daily:'这片刻没有人催你落朱批。茶慢慢温下来，身旁的人也说起一件自己的小事。等再回御案，灯下的纸似乎没有方才那样冷。'})[e.kind]||'对方应下你的话，将眼前的事接着说完。';return incenseSceneReply(s,e,base);}
export function sceneReward(s,e,choice){const st=STORY[e.id];if(e.kind!=='relation'||!st?.milestone)return null;return {title:choice.id==='warm'?st.milestone:choice.id==='work'?`${e.title} · 共事有了默契`:`${e.title} · 彼此已说清`,text:choice.id==='warm'?'这一刻，留在了你们共同的记忆里。':choice.id==='work'?'这件事，你们可以一起做下去。':'往后的来往，有了彼此听明白的分寸。',tone:choice.id==='warm'?'warm':'calm'};}
export function promiseStory(actor,purpose,cancelled=false){if(cancelled)return '你将改期的缘由说清，对方收到回话。原来腾出的那段时间收回日程，话却没有被悄悄抹去。';const meet={C02:'约好的时辰，苏培盛果然来了。他看见你将奏折合上，先怔了一下，才把手边那壶茶放稳。“今日，真不问差事？”你点头，他便把准备好的名册又收回袖中。',C03:'年羹尧按约进来，身上换过了便服。见你把军需册收到一旁，他先笑了一声：“今日，当真只问近况？”你让他坐下，听他讲起归京路上没来得及说的事。',C04:'温实初按时进来，见案上留着上回那页脉案，先笑了笑。你们从夹着纸签的地方续起，这次谁也不必重说最初的话。',C05:'允礼比约定早来片刻，笛子用旧帕裹着。见你也已到了，他扬起眉：“今日总算不用隔着帖子等回话。”你们在原先约好的地方坐下。',C06:'宜修听见通报时，仍朝漏刻看了一眼。你到得正好。她将留着的那杯茶揭开，热气腾起来，脸上便有了一点压不住的笑。',C07:'年世兰嘴上说这时辰有什么好记，案上却早备了两只杯子。你如期进门，她才示意颂芝撤下挡在座旁的那摞单子：“今日先不看这个。”',C08:'安陵容等在约好的地方，手里的曲谱已翻软一角。见你来，她先深吸一口气，又笑了：“臣妾还以为，要再等一会儿。”这回她从自己最想唱的那段起调。'};if(purpose==='rest')return '交班的人按时到了。苏培盛还在叮嘱茶水与炭火，你从帘内唤了一声，他才住口。\n\n“去歇吧。”\n\n他抱着拂尘站了一会儿，终于把它交给接更的人。“那奴才明早再来。”门外那串惯常守到天亮的脚步，今夜终于走向了值房。';if(purpose==='letter'&&actor==='C03')return '来信在约好的时候交给驿使。你把近况写在末页，压好封口，亲手递出去。关于他的那句话，终于跟着驿路出了京城。';if(purpose==='letter'&&actor!=='C03')return '约好的回信写毕，你又读了一遍，将末尾过于生硬的两字改掉。封口压实，信送到那个人手里；这一次，等待终于有了回音。';return meet[actor]||'约好的时辰，你们依时见面，将上回没说完的话接了下去。';}
