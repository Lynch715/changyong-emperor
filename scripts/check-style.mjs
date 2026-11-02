import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const legacy = JSON.parse(readFileSync(path.join(root, 'scripts/legacy-style.json'), 'utf8')).files;
const digest = line => createHash('sha256').update(line).digest('hex');

// 只豁免升级前逐字未改的旧长行，任何新行或改过的行都必须在160字符内。
export function lineViolations(file, text, allowed = legacy) {
  const hashes = new Set(allowed[file] || []);
  return text.split('\n').flatMap((line, index) => [...line].length > 160 && !hashes.has(digest(line)) ?
    [{file, line: index + 1, length: [...line].length}] : []);
}

// 同时检查已跟踪文件和未提交的新代码，浅克隆中也不依赖历史提交可用。
export function checkStyle() {
  const files = [...new Set(execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {cwd: root})
    .toString().split('\0').filter(file => /\.(?:js|mjs|css|html)$/.test(file)))];
  return files.flatMap(file => lineViolations(file, readFileSync(path.join(root, file), 'utf8')));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkStyle();
  if (errors.length) {
    for (const error of errors) console.error(`${error.file}:${error.line} 超过160字符（${error.length}）`);
    process.exitCode = 1;
  } else console.log('代码行宽检查通过：新增或改动的行均不超过160字符。');
}
