import {ordinal} from './calendar.js';
const unfinished={
 C02:'那夜没有说完的话，仍留在案侧。今日重新留了时辰，苏培盛把更簿放在外间，才走进灯下。',
 C04:'那场雨过去以后，想问的话仍留在页边。今日另留时辰，温实初将值诊的册子交清，才来听你接着说。',
 C05:'笛声早已散了，那半拍却还记得。允礼这回依奉事或约好的日子入宫，先说明回府时辰，再将没说完的那页谱放到桌上。',
 C06:'那枚玉环仍有原来的来处，未说完的话也没有另换一个开头。宜修将今日宫务交代完，重新把旁边的位置留出来。',
 C07:'上回撤香之后留着的话，今日才有了单独坐下说的时辰。年世兰将原先的纸翻开，等你接着答，没有替先前那段空白填一个圆满。',
 C08:'那一日席上没有来得及说的话，今日另留在安静处。安陵容先把练曲的页子收好，问你想从哪一句接起。'
};
export function continuationView(s,e){
 if(!s.weekly||s.events[e.id]?.completed||e.remoteRelation)return e;
 if(e.volume&&e.kind==='relation'&&s.deferred.includes(e.id)){const pre='上次主场留下的这段话，今日另留时辰接着谈。未说的仍是未说，今日的答复只记在今日。';return {...e,body:pre+'\n\n'+e.body,sceneVisible:pre+'\n'+e.sceneVisible};}
 const p=e.parent&&s.events[e.parent];
 if(e.kind==='relation'&&s.deferred.includes(e.id)&&p&&ordinal(s.date)>=ordinal(p.date)&&unfinished[e.actor])return {...e,body:unfinished[e.actor]+'\n\n'+(e.actor==='C04'?e.body.replace('廊檐将雨水接成一线。','窗外新起一阵雨，廊檐又接起细细的水线。'):e.body),sceneVisible:'这是延期后实际另约的相谈，尚未完成的原话从今日接续；不能补写此前已谈妥。\n'+e.sceneVisible};
 if(['G01','G02','G04','G05','P01','P09','P10','P11'].includes(e.id)&&s.turn>e.turn)return {...e,body:'原来那一季留下的材料，今日重新送到案前。你翻开原页，经手人将新取的凭单附在后面，等着这一回的朱批。\n\n'+e.body,sceneVisible:'正在接续旧材料，今日才作实际处置，没有补写过去已办。\n'+e.sceneVisible};
 return e;
}
export function deferStory(s,e){
 if(e.volume)return '你把今日没有说完的那页另夹好，先将眼前公事收妥。另日相见须核日程，未约的没有写成赴约，未答的也没有写成答应。';
 const line={C02:'你将留茶后未说完的半句话记在更簿旁，先让眼前差事各归其处。',C03:'舆图仍夹着那道旧折痕。你将战功之外想问的那一句另折一页，未说成已经听过他的答复。',C04:'你把雨廊里还想问的那句话留在页边。病休与值诊各照实记着，不为这一场私话把人提前唤来。',C05:'你将那半页谱收好，回府的时辰照旧，不拿一句改日相谈将他留成宫中常客。',C06:'玉环仍放在原处，尚未说完的话另留一页。宫务照常交接，没有替那份私意先落一句答应。',C07:'你把该答的话留在案边，没有拿未说出口的解释算作她已经听见。旧香照原先处置，今后的分寸等本人再问。',C08:'你将席上未尽的话留在曲页之外，不让她为赶一场相谈停下该有的练习。'}[e.actor];
 return (e.kind==='relation'?line:null)||'原页仍收在待办里，未拨的款没有拨出，未走的工期也没有先走。今日先放下这一页，等真正办理时另记经手与落款。';
}
