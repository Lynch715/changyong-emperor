import {PEOPLE} from './data.js';
import {OFFICES} from './appointments.js';

export const familyOption = (id, label, reply, extra = {}) => ({id, label, reply, effects: {}, ...extra});

// 家庭正文专注人物当下的反应，费用与规则留在选项、帮助和近况页。
export function pregnancyNews(id, promotion) {
 const own = id === 'C07' ?
  '年世兰把手放在早已冷下的香炉旁，许久才说：“停香以后，臣妾只盼能安稳过日子。”太医叮嘱按月休养，她认真点了头。' :
  '她听过诊见，亲自问清了休养安排，才低声谢恩。';
 const court = id === 'C06' ? '各宫依礼来向中宫道贺，礼单谁厚谁薄，彼此都记在心里。' :
  '宜修依礼备了贺礼，回禀：“臣妾会照应各宫，皇上放心。”各宫面上恭贺，暗里都多问了一句起居与赏例。';
 return {actor: id, mother: id, familyType: 'news', title: '太医诊出喜脉',
  body: `温实初将复诊的脉案呈上：“启禀皇上，${PEOPLE[id].name}有喜了。”\n\n${own}\n\n${court}`,
  options: [
   familyOption('promote', `晋位${promotion ? '至' + OFFICES[promotion].title : '：下一位已满或已至最高位，改赏'}（内帑 −3 万两，情分 +6）`,
    '礼部照例核定名分，内务府照旨备礼。', {cost: 3, promotion}),
   familyOption('reward', '厚赏（内帑 −2 万两，情分 +4）', '赏赐按例送到，她恭敬谢恩，也请你不必铺张。', {cost: 2}),
   familyOption('quiet', '低调照应（不花银，情分 +2）', '你只嘱咐太医院按时问诊，不惊动各宫。她松了口气。'),
  ]};
}

export function pregnancyThreat(id, kind, clue) {
 const safety = kind === '落水' ? '人还没有走到池边，随侍已经拦住了去路。' : '东西尚未用过，掌事的人已封好留样。';
 return {actor: id, mother: id, familyType: 'threat', title: `${kind}疑云`,
  body: `${PEOPLE[id].name}宫里送来回话：${clue}。\n\n${safety}你让人把领用册取来，准备亲自看过。`,
  options: [
   familyOption('expose', '按线索核查（不花银，风险 −1，情分 +3，后宫 +1）',
    '线索与原册对上，涉事物件被封存。她安然无恙，俯身谢过皇上的照应。'),
   familyOption('guard', '加派照护（内帑 −1 万两，照护 +1，情分 +2）',
    '新添的轮值守好饮食与出入，这个月平稳度过。', {cost: 1}),
   familyOption('ignore', '当作小事（不花银，风险 +2，可能失去孩子）', '你没有追查，隐患留了下来。'),
  ]};
}
