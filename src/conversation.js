import {fixedReply,preview,getEvent,dateText,visibleContext} from './engine.js';
import {NAMES} from './content.js';
import {parseActivityClause,numberFromText} from './activity-input.js';
const voices={
 C02:{tired:'“守得住，也不是不累。”苏培盛把拂尘搁低些，“有交班的人，奴才才敢放心坐下。皇上肯问这一句，便不用再拿不知疲倦来回话。”',wish:'“想有一段空更，看看宫墙外的灯。不是采办，也不必替谁记着差事。”他顿了顿，“回来以后，还想把看见的说给人听。”',thanks:'苏培盛笑了笑：“这句奴才收着。皇上也坐稳，把这盏茶慢慢喝完。”'},
 C03:{tired:'“赶路会累，打了胜仗也一样。”年羹尧没有拿一句无妨搪塞，“歇够了再看舆图，反倒少出错。私下问起，臣愿说实话。”',wish:'“想收到一封先问近况的信，也想把不好听的实话说完。战功照军册记，别的话，不必每句都归到功劳里。”',thanks:'年羹尧扬了扬眉：“这句听着，比一整页客套舒坦。往后该争的，臣还是要争。”'},
 C04:{tired:'“有时会。下值以后，臣也想把药箱放远一点。”温实初将书合上，“不替谁看诊时，读得慢些也无妨。”',wish:'“想教出敢改先生错字的人。至于下值以后，臣还想留半页，写一点不必给病人看的话。”',thanks:'温实初点点头：“这句听见了。此刻若没有旁的急事，便把刚才的话慢慢说完。”'},
 C05:{tired:'允礼笑意淡下来：“有时也想把笛子收着，谁都不必吹给谁听。坐一会儿，自己便缓过来了。”',wish:'“想出门时先挑自己想走的路，奏曲时也能留一处不同意见。”允礼看向你，“皇兄若也有，何妨各自说说。”',thanks:'允礼轻敲一下笛身：“这声谢先收下。下回说到不同的拍子，臣弟可不会因此相让。”'},
 C06:{tired:'宜修将手从账页上移开：“会累。只是说惯了妥当，连停一停也像需要理由。”她看着案边空处，“今日既问了，便容我如实说。”',wish:'“想有一盏灯，只照我自己想读的那页。也想说一件欢喜，不必先问对宫务有没有用。”',thanks:'宜修微微颔首：“话说清了，便不必再添一份赏。坐一会儿，也能接着谈。”'},
 C07:{tired:'年世兰抬眼：“当然会。你若想听一句永远不累，我偏不这样答。”她语气松下来，“有时候只想坐着，什么也不急着做好。”',wish:'“想挑自己喜欢的衣裳，去看想看的花。不是为了叫谁夸一句懂事。”她反问，“这点心愿，也值得认真听吧？”',thanks:'年世兰忍不住笑：“谢我便好好听完。下一句若不同意，也不许只拿好听的话哄过去。”'},
 C08:{tired:'安陵容想了想才答：“会。最累的时候，是总想着旁人愿意听哪一种声音。若能说一句自己今日不想唱，反倒能松口气。”',wish:'“想让人记得，这是我挑的曲子。也想有一回，不先猜你的意思，先把我自己的想法说完。”',thanks:'安陵容抬起眼：“我听见了。下一回若有不同的想法，也想这样说给你听。”'}
};
function knownReply(s,cid,eventId,text,segments){
 const query=segments.some(x=>x.kind==='query'),v=voices[cid];
 if(/重生|前世|香料|停香|欢宜香/.test(text))return null;
 if(query&&/为什么.*(?:留|预留|安排).*(?:时间|时日)|为何.*(?:约|时间)/.test(text))return '“你我都有要做的事，先把时辰说清，才不必让一个人一直等。”'+(cid==='C02'?'苏培盛将更次单放稳：“交清班以后，才好安心说自己的话。”':'“想留给彼此的那段时间，也该认真放在日程里。”');
 if(query&&/(?:还剩|还有|可用).*(?:格|时间)|本周.*余量/.test(text)&&s.weekly)return `“这一周还留着${s.remaining}格可安排的时间。已约好的那几段另留着，想怎样用，等你自己挑。”`;
 if(query&&/拨|军饷|核账/.test(text)){
  const e=getEvent(s,eventId);
  if(e?.id==='G04'&&e.actor===cid){const m=text.match(/(?:拨|发|给)(?:款)?\s*([零一二两三四五六七八九十\d]+)点/),amount=/一半|半额/.test(text)?6:/全额|全部/.test(text)?12:m?numberFromText(m[1]):null,escort=/押运/.test(text)&&!/(?:不|无需|不要)押运/.test(text);
   if(amount!==null&&amount>=0&&amount<=12)return `“若先拨${amount}点${escort?'，押运另用2点，合计'+(amount+2)+'点':''}，${amount===0?'眼前的补给仍会耽误':'眼前的缺口只能先缓一部分'}。重复支领仍得拿原册核清，不能因银子拨了就算账也清了。”他把笔留在案侧：“先商量，等你定下再落款。”`;
   return '“册上申请的是十二点，两笔重复支领还圈着。先给多少、由谁核账，可以分开商量；钱下去了，也要等真正的领粮回执。”';
  }
  return '“要定数，得先看这份事的原册与经手记录。我手里没有的，不好隔空替人担保。你若要核这一笔，先让它真正送到案前。”';
 }
 if(/以前|之前|那次|上回|说过|谈过/.test(text)&&/记得|记住|回想/.test(text))return fixedReply(s,cid,text,eventId);
 if(query&&s.weekly){const p=parseActivityClause(text,{state:s,actor:cid});if(p){if(p.clarifications.length)return '“可以商量。'+p.clarifications.join('')+'”';try{preview(s,p.actions);const a=p.actions[0];return `“${a.date?dateText(a.date)+(a.period==='evening'?'晚间':'日间'):'这份安排'}可以这样商量${a.kind==='banquet'?'；小宴须留同日两格，另留用度':''}。等你说定，再正式记约。”`;}catch(err){return `“这个安排眼下还不能说定：${err.message}你可以另选时日，再来商量。”`;}}}
 if(query&&/约定|约好|什么时候见|记得.*约/.test(text)){const p=visibleContext(s,cid).mandatory.promises[0];return p?`“原来记下的是${dateText(p.date)}${p.period==='evening'?'晚间':p.period==='day'?'日间':''}。${p.status==='needs-reschedule'?'这份原约还待重新商量。':'照原约留着；若要改，先把新日子说清。'}”`:'“你我还没有一份已经说定的约。想何时相见，可以先商量。”';}
 if(v&&/累|疲倦|辛苦/.test(text))return v.tired;
 if(v&&/心愿|愿望|想做|自己的事/.test(text))return v.wish;
 if(v&&/谢谢|多谢|有劳/.test(text))return v.thanks;
 return null;
}
export async function replyToSegments(s,cid,eventId,segments,{askAI=null}={}){
 const speech=segments.filter(x=>['chat','query','preference','boundary'].includes(x.kind)),text=speech.map(x=>x.text).join('，');if(!text)return null;
 let reply=knownReply(s,cid,eventId,text,speech),fallback=true,error=null,memorySources;
 if(!reply&&askAI){try{const value=await askAI(text);reply=typeof value==='string'?value:value.text;memorySources=typeof value==='string'?undefined:value.memorySources;if(typeof reply!=='string')throw Error('回复格式不完整，保留固定文本。');fallback=false;}catch(err){error=err.message;reply=null;memorySources=undefined;}}
 if(!reply)reply=fixedReply(s,cid,text,eventId);
 const boundary=speech.find(x=>x.kind==='boundary'),preference=speech.find(x=>x.kind==='preference');
 if(fallback&&boundary)reply+='\n\n“'+(boundary.intent==='终止恋爱'?'相恋的事便到这里；往后的来往照你说明的分寸。':boundary.intent==='暂缓'?'这件事先放一放，不催你答应。':'往后只按合作来往，不再借体贴催你亲近。')+'”';
 if(fallback&&preference)reply+='\n\n“饮茶这句，照你刚刚说的记；浓淡与喝不喝，不混作一回事。”';
 return {reply,fallback,error,...(memorySources?{memorySources}:{})};
}
