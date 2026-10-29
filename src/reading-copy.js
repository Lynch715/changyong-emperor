import {STORY} from './story.js';
import {NARRATIVE_COPY} from './narrative-copy.js';
export const READING_VERSION=22;
const str=x=>String(x??'');
// Exact authored passages only. Never rewrite arbitrary player or model text.
export function readingText(value,eventId){let text=str(value);const edit=NARRATIVE_COPY[eventId],old=STORY[eventId];if(!edit||!old)return text;if(edit.body&&old.body)text=text.split(old.body).join(edit.body);for(const[k,reply]of Object.entries(edit.replies||{})){const prior=old.replies?.[k];if(prior)text=text.split(prior).join(reply);}return text;}
export function recordReading(record,field){return record?.storyVersion>=READING_VERSION?readingText(record[field],record.eventId):str(record?.[field]);}
export const readingNote=id=>NARRATIVE_COPY[id]?.note||'';
export const readingTitle=(id,title)=>id==='M33'?'窗下课目':str(title);
const UI_COPY=new Map(Object.entries({
 'THE IMPERIAL DESK':'御前日常','COURT AND KINGDOM':'朝堂内外','PALACE AND PEOPLE':'宫中往来','A PERSON OF THEIR OWN':'故人近况','PREFERENCES AND ARCHIVES':'阅读与存档','THE RECORD OF THIS LIFE':'此生留痕','PEOPLE AND RELATIONS':'故人簿','MEMORY AND RECORDS':'旧事重读',
 '真实年龄与共同成年决定':'澄宁的成年心事','澄宁的真实年龄与共同成年决定':'澄宁的成年心事','暮年附页与晚成入口':'故人灯下','真实相守与另留时辰':'闲时相伴','真实相处与私人阶段':'往来与心意',
 '先核真实抵京':'将军到京了吗','核年羹尧今日真实抵京与否':'查看今日抵京消息','真实抵京、启程与分场':'归京、送行与探望','交班原件实核':'交班复核','交班执行方案':'交班安排','另日收存交班完成页':'收好交班回单','旧图与实际归京':'舆图与归期',
 '志业范围，听本人说':'想做什么，听她说','公事之后，单独说明私人意愿':'公事说完，再谈心意','终止恋爱推进':'说清不再发展私情','重读共同成年决定':'重读她的决定','收好真实成年日期，暂不安排':'记下生辰，改日再谈','M33成年决定：支持今日不定婚事':'支持她今日不定婚事','M33成年决定：先按本人范围了解人选':'依她的意思了解人选',
 '甄嬛的独立私人答复':'甄嬛的回话','沈眉庄的独立私人答复':'沈眉庄的回话','昨日只是请求，尚未由你替她回答。':'昨日问过的事，今天听她怎样答。','听本人对这一次请求的答复':'听她答话','听眉庄愿接的有限范围':'听眉庄想接哪一部分','按此刻双方心意相伴':'留一段相伴的时辰','接受不是已到场，今日到期再赴约。':'应下后记好日子，到了约期再去。',
 '对应第六节点尚未真实完成':'还有一段旧事没谈完','既有承诺仍有未补谈问题':'先前的失约还没说清','军饷实领核验不足':'军饷收领还没查清','副将与依法轮替来源不足':'副将轮替与交接还没办妥','尚无真实抵京':'尚未收到抵京的消息','诬案尚未澄清':'那桩诬案还没查清','轮值实际交接不足':'轮值还没交清','医事独立核验与培养同僚不足':'医案复核与同僚教习还没办妥','明约、回避或实际笛约未完成':'先前的约定、回避或这次笛约还有未办完的地方','宫务交班不足':'宫务还没交清','年家依法收束或适用自主成长不足':'年家的旧事或她自己的安排还有未办完的部分','独立事务与教艺不足':'她自己经办的事与教艺安排还没办妥',
 'THE COURT':'朝堂内外','WITHIN AND BEYOND':'宫中往来','SEVEN THREADS':'故人簿','THE BOOK OF DAYS':'旧事重读',
 '尚无当前双方愿意的相守':'这段情意尚未说定','尚无实际抵京':'还没有抵京的消息','尚无明确接受并实际履行的笛约':'尚未应约相见','本世没有已登记公主，成年决定与择婿不适用，不制造孩子，也不阻断主线。':'这一世未有子女，眼下没有婚事要议。其他事情照常往下走。',
 '两入口已共用本次决定，只读原页不重选、不再扣格。':'这件事已经谈过，可重读当时的回答；不另占时间。','共同决定已有原页，两入口不再扣格或生成配偶。':'她已经说过自己的选择。可回看原话，不另作决定。',
 '先有对应第六节点与本人答复，阅读才可开放。未达标留探望，后来达标另立当前日期附页，原页保持；阅读不代办、不加数值。':'旧事与心意说清以后，才有相守的后续。尚未说定，也可探望；后来有了新话，另记在那一天。重读不另占时间。',
 '轮替准备不是已到场；来源不足便保留尚未归来。':'先看行程与交接是否办妥。消息未到时，仍按将军尚未归京安排。',
 '不撤去原署名、拒差与正常待遇；请求不能替她答应。':'不论怎样答，已经做过的事都记在她名下，推掉的差事也不再强派。','十月二至八日仍须明确接受，未接受不算到场。':'十月初二至初八，可请允礼来往。先应下这一程，再等约期。',
 '记录知情范围：':'这些话会让谁知道：','办理时段：':'时间：','原预占已核销':'已用去预约的时辰','当前制作范围':'可游玩的内容','本机对白 · 设置中可连接 AI':'固定对白 · 可在设置中开启AI','自由对白 · AI 已连接':'AI对白已开启','固定文本':'固定对白','逻辑单元':'段经历','姓名牌':'人物姓名',
 'F00 已封存':'初卷已收','初卷尚未结束':'初卷未完','F00 · 阶段收束':'初卷 · 卷末','普通无代价对白直接回应，正式安排先核对。':'闲谈可直接说，花钱或占时辰的安排会先请你确认。',
 '下一步缺口':'接下来可办的事','本轮范围':'这次要办什么','本批实际范围':'这次查到的部分','尚未实施':'尚未着手','已经完成的部分不会因为拒绝私人邀请而撤销。':'私人邀请可以推辞，已经办过的事仍记在她名下。',
 '场景未找到':'这一页暂时打不开','返回御案重新选择。':'回御案再试一次。','这段经历已经变化。':'这段进度已经更新，请先重新打开这一页。','状态已变化，请重新核对预览。':'进度已经更新，请重新确认这次安排。'
}));
export const uiReadingText=value=>UI_COPY.get(str(value))??str(value);
// Only chrome and help/status copy. Saved prose, quotations, inputs and AI replies
// are excluded even if the player happened to use the same words as a UI label.
export function applyReadingUi(root){
 const selector='button,summary,h1,h2,h3,h4,.eyebrow,.inline-note,.small-label,.quiet-note,.chronicle-open-note,.confirmation-reading p,.settings-section > p,.modal-scroll > p,.page-heading > div > p,.composer-footer small,.tag';
 const blocked='.story-text,.response-text,.chat-bubble,.npc-afterword,.memory-echo,.moment-reward,.ending-text,[data-original-text],textarea,input,select,option';const seen=new WeakSet();
 for(const element of root.querySelectorAll(selector)){if(element.closest(blocked))continue;const walker=element.ownerDocument.createTreeWalker(element,4);let node;while((node=walker.nextNode())){if(seen.has(node)||node.parentElement?.closest(blocked))continue;seen.add(node);const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(node.nodeValue),next=uiReadingText(m[2]);if(next!==m[2])node.nodeValue=m[1]+next+m[3];}}
}
