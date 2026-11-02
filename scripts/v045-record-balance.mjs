import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {balanceSummary} from './v045-balance.mjs';

// 每阶段把可复算的逐月数据和目标核对一同留在仓库。
const [stage, note] = process.argv.slice(2);
const result = JSON.parse(readFileSync(`output/balance-v045/${stage}.json`, 'utf8'));
const summary = balanceSummary(result);
const root = 'docs/施工';
mkdirSync(`${root}/平衡`, {recursive: true});
writeFileSync(`${root}/平衡/v045-${stage}.json`, JSON.stringify(result, null, 2) + '\n');
const file = `${root}/0.45-平衡验收.md`;
if (!existsSync(file)) writeFileSync(file, `# v0.45 平衡验收\n
从元年逐月推进，不补钱、不跳月、不改存档余额。种子为45000、45097、45194。
被动路线三时辰以随机赏赐（60%）和休养为主、随机选可去的人入夜，不理财、不批折。
必做剧情沿用v044脚本的固定选项优先表；行动后也处理正常随机插曲与皇嗣向导。
均匀交往路线轮流召见，每次两句各4点，受原有上限约束；全赏赐路线先随机挑付费礼物，买不起时改休养，并记录首次吃紧月份。
积极理财路线沿用v044的批折、经营和公共工程策略。所有结果为游戏模拟，不含真实模型调用。
各阶段JSON保留全部逐月银账、余额、人物情分；可运行 BALANCE_STAGE=编号 node scripts/v045-balance.mjs 复算。

目标：被动路线六年末国库600–1500万两；第三年内帑≤80万两；全时辰赏赐一年内吃紧；第四年末至少5位核心人物情分≥45。
C1前对照：六年末国库2608.75／2480.21／2423.22万两，第三年内帑184.78／185.85／185.17万两。
`);
const rows = summary.passive.map((row, i) => `| ${row.seed} | ${row.treasury72} | ${row.inner36} | ` +
  `${summary.social[i].people45At48} | ${summary.gifts[i].tightAt ?? '未吃紧'} | ${summary.active[i].treasury72} |`);
const annual = result.passive[0].curve.filter(row => row.calendarMonth === 12).map((row, i) =>
  `| ${row.year} | ${result.passive.map(run => run.curve[(i + 1) * 12 - 1].treasury).join(' | ')} |`);
const section = `\n## ${stage}\n\n${note}\n
| 种子 | 被动6年国库 | 被动3年内帑 | 均匀交往4年≥45人数 | 全赏赐吃紧月份 | 理财6年国库 |
|---|---:|---:|---:|---:|---:|
${rows.join('\n')}

三组国库年度曲线（万两）：

| 年末 | 45000 | 45097 | 45194 |
|---|---:|---:|---:|
${annual.join('\n')}

完整月曲线：[v045-${stage}.json](平衡/v045-${stage}.json)。\n`;
writeFileSync(file, readFileSync(file, 'utf8') + section);
