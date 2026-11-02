// 用页面内的确认框询问玩家，取消与按 Escape 都不会执行后续操作。
export function askConfirmation({title, text, cancel, accept}, doc = globalThis.document) {
  const dialog = doc.getElementById('modal');
  if (!dialog || dialog.open) return Promise.resolve(false);
  dialog.innerHTML = `<h2 id="modal-title"></h2><p id="modal-text"></p>
    <div class="dialog-actions"><button data-answer="cancel"></button>
    <button class="primary" data-answer="accept"></button></div>`;
  dialog.setAttribute('aria-describedby', 'modal-text');
  dialog.querySelector('#modal-title').textContent = title;
  dialog.querySelector('#modal-text').textContent = text;
  const cancelButton = dialog.querySelector('[data-answer="cancel"]');
  const acceptButton = dialog.querySelector('[data-answer="accept"]');
  cancelButton.textContent = cancel;
  acceptButton.textContent = accept;
  dialog.returnValue = '';
  return new Promise(resolve => {
    // close 事件只接收一次，确认框关闭以后才能继续入夜或重开。
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'accept'), {once: true});
    cancelButton.onclick = () => dialog.close('cancel');
    acceptButton.onclick = () => dialog.close('accept');
    dialog.showModal();
    cancelButton.focus();
  });
}
