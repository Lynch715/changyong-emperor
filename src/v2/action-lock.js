// 所有等待型动作共用一把锁，页面只能在该动作结束后继续操作。
export function createActionRunner({onBusy, onError, persist}) {
 let running = false;
 return async (work, {save = true} = {}) => {
  if (running) return;
  running = true;
  onBusy(true);
  try {await work();} catch (error) {onError(error);}
  finally {
   if (save) {
    try {persist();} catch (error) {onError(error);}
   }
   running = false;
   onBusy(false);
  }
 };
}
