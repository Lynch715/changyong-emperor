import {backupInfo, backupError} from './save-manager.js';
import {gameDate} from './dates.js';

// 存档操作集中放在设置；导入先预览与确认，恢复入口在标题页也可找到。
export function savePanel(state) {
 const backup = backupInfo();
 return `<div class="card save-panel"><b>存档与备份</b><p>每个动作后自动保存，另保留上一份有效进度。换设备或清理浏览器前，请先导出。</p>
  ${state ? '<button data-act="save-export">导出当前存档</button>' : ''}
  <label class="save-import">导入 JSON 存档<input id="saveImport" type="file" accept=".json,application/json"></label>
  <p class="small">只导入游戏进度。确认前会显示存档年月，当前有效进度会先备份；API 地址与密钥不进入导出文件。</p>
  ${backupError() ? `<p class="backup-error" role="status">${backupError()}</p>` : ''}
  ${backup ? `<p>上一份备份：${gameDate(`${backup.year}-${backup.month}`)} · 第${backup.life}世</p>
   <button data-act="save-restore">恢复上一份备份</button>` : '<p class="small">继续游玩并保存后，这里会出现上一份有效备份。</p>'}
  ${state ? '<button data-act="new-confirm">重新开始</button>' : ''}
  <button data-act="title">回到标题</button></div>`;
}

export function recoveryEntry() {
 const backup = backupInfo();
 return backup ? `<p class="small">可恢复上一份备份：${gameDate(`${backup.year}-${backup.month}`)}</p>
  <button data-act="save-restore">恢复上一份备份</button>` : '';
}
