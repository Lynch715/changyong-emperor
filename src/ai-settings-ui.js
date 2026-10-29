const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderAISettings(cfg,{configured=false,remembered=false,usage:u={}}={}){
 const editorMode=cfg.mode==='server'&&configured?'server':'byok';
 const current=cfg.mode==='byok'?'已启用 · '+cfg.model:cfg.mode==='server'?'已启用 · 本机代理':'当前使用固定剧情';
 return `<section class="paper-panel settings-section api-settings" aria-labelledby="api-settings-title"><div class="section-header"><h2 id="api-settings-title">API 与 AI 对话</h2><span class="tag">${esc(current)}</span></div>
 <p>在手机或电脑上直接填写、修改，保存后即可用于人物对话，无需修改项目文件。</p>
 <form id="ai-form">
 <label class="field">连接方式<select name="mode"><option value="byok" ${editorMode==='byok'?'selected':''}>我的 API · 浏览器直接连接</option>${configured?`<option value="server" ${editorMode==='server'?'selected':''}>本机代理 · 已配置</option>`:''}</select></label>
 <fieldset id="byok-fields" ${editorMode==='server'?'hidden disabled':''}>
 <label class="field">API 基础地址<input name="url" type="url" value="${esc(cfg.url)}" placeholder="https://api.deepseek.com" autocomplete="off" autocapitalize="none" spellcheck="false" required></label>
 <p class="api-field-hint">默认填基础地址；若粘贴了 /chat/completions 或 /responses，会按所选协议自动整理。</p>
 <div class="api-field-grid"><label class="field">接口协议<select name="protocol"><option value="chat-completions" ${cfg.protocol==='chat-completions'?'selected':''}>Chat Completions（DeepSeek 等）</option><option value="responses" ${cfg.protocol==='responses'?'selected':''}>Responses API</option></select></label>
 <label class="field">模型名称<input name="model" value="${esc(cfg.model)}" placeholder="服务商提供的模型名称" autocomplete="off" autocapitalize="none" spellcheck="false" required></label></div>
 <label class="field" for="api-key">API 密钥</label><div class="api-key-row"><input id="api-key" name="key" type="password" placeholder="${cfg.hasKey?'已填写；留空沿用，填写新密钥可替换':'填写你的 API 密钥'}" autocomplete="off" autocapitalize="none" spellcheck="false"><button type="button" class="secondary-btn" id="ai-show-key" aria-controls="api-key" aria-pressed="false">显示</button></div>
 <label class="switch-line api-remember">记住此设备上的配置与密钥<input name="remember" type="checkbox" ${remembered?'checked':''}></label>
 <p class="api-field-hint">勾选后，刷新或重新打开仍可使用。配置仅保存在当前浏览器，不随游戏存档导出，也不上传到 GitHub；共用设备请勿勾选。</p>
 </fieldset>
 <label class="field">本机每日调用上限<input name="limit" type="number" min="1" max="200" step="1" value="${cfg.limit}" required></label>
 <div class="button-row api-actions"><button class="primary-btn" type="submit">保存并启用 API</button><button class="secondary-btn" type="button" id="ai-test">测试连接</button></div>
 <p class="api-field-hint">测试会发送一次简短请求，可能产生少量费用，不携带游戏记录。游戏对话仅发送所需上下文；服务商不允许网页跨域连接时，请使用支持跨域的接口或本机代理。</p>
 <p id="ai-feedback" class="operation-feedback" role="status" aria-live="polite"></p>
 </form>
 <div class="button-row"><button class="secondary-btn" id="ai-pause">改用固定剧情</button><button class="text-btn" id="ai-clear">清除本机 API 配置</button></div>
 <p class="api-field-hint">今日 ${u.calls||0} 次调用 · 输入 ${u.input||0} / 输出 ${u.output||0} token · 失败 ${u.failures||0} 次。停用 AI 或修改连接均不影响游戏进度。</p></section>`;
}
