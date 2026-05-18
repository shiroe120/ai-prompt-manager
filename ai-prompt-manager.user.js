// ==UserScript==
// @name         常用语右键插入工具（AI提示词看板版）
// @namespace    https://github.com/zhangsan/ai-prompt-manager
// @version      3.0.0
// @description  专为AI网页端定制的提示词管理工具，支持分屏独立编辑及域名白名单联动
// @author       shiroe120
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // ---------- 存储与配置项 ----------
    const PHRASES_KEY = 'commonPhrases_v3_data';
    const DOMAINS_KEY = 'commonPhrases_v3_domains';

    // 默认内置的国内外主流 AI 平台域名
    const DEFAULT_DOMAINS = [
        'chatgpt.com',
        'chat.openai.com',
        'claude.ai',
        'gemini.google.com',
        'deepseek.com',
        'chat.deepseek.com',
        'kimi.moonshot.cn',
        'doubao.com',
        'tongyi.aliyun.com',
        'yiyan.baidu.com',
        'metaso.cn'
    ];

    const DEFAULT_PHRASES = [
        { name: '代码大牛角色', content: '你现在是一位精通全栈开发的资深架构师，请帮我审查以下代码并指出潜在的性能瓶颈与安全隐患：' },
        { name: '周报润色大师', content: '请将以下零散的工作要点重构为一份结构清晰、用词专业、突出业绩成果的互联网大厂周报：\n' },
        { name: '中英金牌翻译', content: '你是一个兼具“信、达、雅”视角的专业翻译官。请将以下文本翻译为地道的英文/中文，并解释其中地道的俚语或专业词汇：\n' }
    ];

    function getPhrases() { return GM_getValue(PHRASES_KEY, DEFAULT_PHRASES.slice()); }
    function savePhrases(phrases) { GM_setValue(PHRASES_KEY, phrases); }

    function getDomains() { return GM_getValue(DOMAINS_KEY, DEFAULT_DOMAINS.slice()); }
    function saveDomains(domains) { GM_setValue(DOMAINS_KEY, domains); }

    // 域名匹配校验
    function isCurrentDomainAllowed() {
        const currentHost = window.location.hostname;
        const allowed = getDomains();
        return allowed.some(domain => currentHost === domain || currentHost.endsWith('.' + domain));
    }

    // ---------- UI 变量状态 ----------
    let menuElement = null;
    let dialogElement = null;
    let currentTarget = null;
    let savedRange = null;
    let savedSelectionStart = null;
    let savedSelectionEnd = null;

    // 核心高定样式注入
    GM_addStyle(`
        .cmn-phrases-menu, .cmn-phrases-dialog {
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .cmn-phrases-menu *, .cmn-phrases-dialog * { box-sizing: border-box; }

        /* 极简磨砂右键菜单 */
        .cmn-phrases-menu {
            position: fixed; z-index: 2147483647;
            background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 12px;
            box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08);
            min-width: 180px; max-width: 300px; padding: 6px;
            animation: cmn-menu-anim 0.1s ease-out;
        }
        .cmn-phrases-menu .item {
            padding: 8px 12px; cursor: pointer; font-size: 13px; color: #334155;
            border-radius: 6px; transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cmn-phrases-menu .item:hover { background: #f1f5f9; color: #0f172a; }
        .cmn-phrases-menu .separator { height: 1px; background: #e2e8f0; margin: 4px; }
        .cmn-phrases-menu .manage-btn {
            padding: 8px 12px; cursor: pointer; color: #2563eb; font-size: 13px; font-weight: 500;
            border-radius: 6px; transition: all 0.15s;
        }
        .cmn-phrases-menu .manage-btn:hover { background: #eff6ff; }

        /* 模态大沙盒遮罩 */
        .cmn-overlay {
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(15, 23, 42, 0.3); backdrop-filter: blur(4px);
            z-index: 2147483646; animation: cmn-fade 0.2s ease-out;
        }

        /* 侧边分屏管理面板 */
        .cmn-phrases-dialog {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 2147483647; background: #fff; border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            width: 760px; height: 520px; max-width: 95vw; max-height: 90vh;
            display: flex; overflow: hidden;
            animation: cmn-scale 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* 左侧控制台 */
        .cmn-dialog-sidebar {
            width: 240px; background: #f8fafc; border-right: 1px solid #e2e8f0;
            display: flex; flex-direction: column; padding: 20px 12px;
        }
        .cmn-sidebar-title { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 16px; padding: 0 8px; }
        .cmn-tab-nav { display: flex; gap: 4px; margin-bottom: 16px; background: #e2e8f0; padding: 3px; border-radius: 8px; }
        .cmn-tab-btn {
            flex:1; padding: 6px; border: none; background: transparent; font-size: 12px;
            font-weight: 500; color: #64748b; cursor: pointer; border-radius: 6px; transition: all 0.2s;
        }
        .cmn-tab-btn.active { background: #fff; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

        .cmn-list-container { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .cmn-list-item {
            padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; color: #475569;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: all 0.15s;
        }
        .cmn-list-item:hover { background: #cbd5e1; color: #0f172a; }
        .cmn-list-item.active { background: #e0f2fe; color: #0369a1; font-weight: 500; }
        .cmn-add-master-btn {
            margin-top: 12px; padding: 8px; background: #3b82f6; color:#fff; border:none;
            border-radius: 8px; cursor:pointer; font-size: 13px; font-weight: 500; text-align:center; transition: background 0.15s;
        }
        .cmn-add-master-btn:hover { background: #2563eb; }

        /* 右侧工作台 */
        .cmn-dialog-body { flex: 1; display: flex; flex-direction: column; padding: 24px; position: relative; background: #fff; }
        .cmn-body-title { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;}
        .cmn-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .cmn-form-group label { font-size: 12px; font-weight: 500; color: #64748b; }
        .cmn-form-group input, .cmn-form-group textarea {
            padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; color: #334155; transition: all 0.2s;
        }
        .cmn-form-group input:focus, .cmn-form-group textarea:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); outline: none; }
        .cmn-form-group textarea { resize: none; flex: 1; min-height: 200px; line-height: 1.5; }

        /* 底部动作区域 */
        .cmn-body-actions { display: flex; justify-content: space-between; margin-top: auto; padding-top: 16px; border-top: 1px solid #f1f5f9; }
        .cmn-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: 1px solid #cbd5e1; background: #fff; color: #475569;}
        .cmn-btn:hover { background: #f8fafc; color:#1e293b; }
        .cmn-btn.primary { background: #3b82f6; color: #fff; border: none; }
        .cmn-btn.primary:hover { background: #2563eb; }
        .cmn-btn.danger { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; }
        .cmn-btn.danger:hover { background: #ef4444; color: #fff; border-color: #ef4444; }

        /* 标签流视图（域名白名单配置专用） */
        .cmn-domain-manager { display: flex; flex-direction: column; height: 100%; }
        .cmn-domain-input-box { display: flex; gap: 8px; margin-bottom: 16px; }
        .cmn-domain-input-box input { flex:1; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; }
        .cmn-domain-tags { flex: 1; overflow-y: auto; display: flex; flex-wrap: wrap; content-visibility: auto; gap: 8px; align-content: flex-start; padding-right: 4px; }
        .cmn-tag {
            display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #f1f5f9;
            border: 1px solid #e2e8f0; border-radius: 20px; font-size: 12px; color: #475569;
        }
        .cmn-tag .cmn-tag-close { cursor: pointer; font-weight: bold; color: #94a3b8; transition: color 0.15s; }
        .cmn-tag .cmn-tag-close:hover { color: #ef4444; }

        /* 舒适优雅的滚动条 */
        .cmn-list-container::-webkit-scrollbar, .cmn-domain-tags::-webkit-scrollbar { width: 5px; }
        .cmn-list-container::-webkit-scrollbar-thumb, .cmn-domain-tags::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

        /* 核心精细动画 */
        @keyframes cmn-fade { from { opacity:0; } to { opacity:1; } }
        @keyframes cmn-scale { from { transform: translate(-50%, -46%) scale(0.96); opacity:0; } to { transform: translate(-50%, -50%) scale(1); opacity:1; } }
        @keyframes cmn-menu-anim { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform: translateY(0); } }
    `);

    // ---------- 右键智能唤醒菜单 ----------
    function showMenu(x, y) {
    removeMenu();
    if (!isCurrentDomainAllowed()) return;

    const phrases = getPhrases();
    if (phrases.length === 0) return;

    menuElement = document.createElement('div');
    menuElement.className = 'cmn-phrases-menu';

    phrases.forEach(phrase => {
        const item = document.createElement('div');
        item.className = 'item';
        item.textContent = phrase.name || '(未命名提示词)';
        item.title = phrase.content;
        item.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            insertPhrase(phrase.content || '');
            removeMenu();
        });
        menuElement.appendChild(item);
    });

    const sep = document.createElement('div');
    sep.className = 'separator';
    menuElement.appendChild(sep);

    const manageBtn = document.createElement('div');
    manageBtn.className = 'manage-btn';
    manageBtn.textContent = '配置提示词面板';
    manageBtn.addEventListener('mousedown', (e) => {
        e.preventDefault(); e.stopPropagation();
        removeMenu();
        openManager();
    });
    menuElement.appendChild(manageBtn);

    // 先隐藏并插入 DOM 以测量真实尺寸
    menuElement.style.visibility = 'hidden';
    document.body.appendChild(menuElement);

    const menuWidth = menuElement.offsetWidth;
    const menuHeight = menuElement.offsetHeight;

    // 计算最终位置，保证菜单完全在视口内（留 5px 边距）
    let left = x;
    let top = y;

    if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 5;
    }
    if (top + menuHeight > window.innerHeight) {
        top = window.innerHeight - menuHeight - 5;
    }

    menuElement.style.left = Math.max(0, left) + 'px';
    menuElement.style.top = Math.max(0, top) + 'px';
    menuElement.style.visibility = 'visible'; // 显示

    setTimeout(() => {
        document.addEventListener('mousedown', closeMenuOnClickOutside, true);
    }, 0);
}

    function closeMenuOnClickOutside(e) { if (menuElement && !menuElement.contains(e.target)) removeMenu(); }
    function removeMenu() {
        if (menuElement) { menuElement.remove(); menuElement = null; document.removeEventListener('mousedown', closeMenuOnClickOutside, true); }
    }

    // ---------- 智能核心文本落焦映射器 ----------
    function insertPhrase(text) {
        if (!currentTarget) return;
        currentTarget.focus();

        if (currentTarget.isContentEditable) {
            const selection = window.getSelection();
            if (savedRange) { selection.removeAllRanges(); selection.addRange(savedRange); }
            document.execCommand('insertText', false, text);
            savedRange = null;
        } else if (currentTarget.tagName === 'INPUT' || currentTarget.tagName === 'TEXTAREA') {
            const start = savedSelectionStart !== null ? savedSelectionStart : currentTarget.selectionStart;
            const end = savedSelectionEnd !== null ? savedSelectionEnd : currentTarget.selectionEnd;
            currentTarget.focus();
            currentTarget.setRangeText(text, start, end, 'end');
            savedSelectionStart = null; savedSelectionEnd = null;
        }
        currentTarget.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ---------- 高级看板控制中心 ----------
    function openManager() {
        if (dialogElement) return;

        let activeTab = 'phrases'; // phrases 或 domains
        let currentPhrases = getPhrases();
        let currentDomains = getDomains();
        let selectedPhraseIndex = currentPhrases.length > 0 ? 0 : -1; // 当前选中的提示词下标，-1代表新建

        const overlay = document.createElement('div');
        overlay.className = 'cmn-overlay';
        overlay.addEventListener('click', closeManager);
        document.body.appendChild(overlay);

        dialogElement = document.createElement('div');
        dialogElement.className = 'cmn-phrases-dialog';

        // 核心布局脚手架构建
        dialogElement.innerHTML = `
            <div class="cmn-dialog-sidebar">
                <div class="cmn-sidebar-title">AI Prompt Dashboard</div>
                <div class="cmn-tab-nav">
                    <button class="cmn-tab-btn active" data-tab="phrases">提示词</button>
                    <button class="cmn-tab-btn" data-tab="domains">生效网站</button>
                </div>
                <div class="cmn-list-container" id="sidebarList"></div>
                <button class="cmn-add-master-btn" id="sidebarAddBtn">+ 新建提示词</button>
            </div>
            <div class="cmn-dialog-body" id="workspaceBody"></div>
        `;
        document.body.appendChild(dialogElement);

        const sidebarList = dialogElement.querySelector('#sidebarList');
        const workspaceBody = dialogElement.querySelector('#workspaceBody');
        const sidebarAddBtn = dialogElement.querySelector('#sidebarAddBtn');

        // 左侧树渲染器
        function renderSidebar() {
            sidebarList.innerHTML = '';
            if (activeTab === 'phrases') {
                sidebarAddBtn.style.display = 'block';
                currentPhrases.forEach((phrase, idx) => {
                    const item = document.createElement('div');
                    item.className = `cmn-list-item ${idx === selectedPhraseIndex ? 'active' : ''}`;
                    item.textContent = phrase.name || '(未命名提示词)';
                    item.addEventListener('click', () => {
                        selectedPhraseIndex = idx;
                        renderSidebar();
                        renderWorkspace();
                    });
                    sidebarList.appendChild(item);
                });
            } else {
                sidebarAddBtn.style.display = 'none';
                const item = document.createElement('div');
                item.className = 'cmn-list-item active';
                item.textContent = ' 作用域域名配置';
                sidebarList.appendChild(item);
            }
        }

        // 右侧核心业务面板路由器
        function renderWorkspace() {
            workspaceBody.innerHTML = '';

            if (activeTab === 'phrases') {
                // 提示词数据编辑表单状态
                const isNew = selectedPhraseIndex === -1;
                const activeData = isNew ? { name: '', content: '' } : currentPhrases[selectedPhraseIndex];

                workspaceBody.innerHTML = `
                    <div class="cmn-body-title">${isNew ? ' 创建新提示词卡片' : ' 编辑提示词元数据'}</div>
                    <div class="cmn-form-group">
                        <label>提示词短名称 (用于右键菜单展示)</label>
                        <input type="text" id="editName" value="${escapeHtml(activeData.name)}" placeholder="例如：跨语言CodeReviewer">
                    </div>
                    <div class="cmn-form-group" style="flex: 1;">
                        <label>核心提示词内容 (PROMPT)</label>
                        <textarea id="editContent" placeholder="在此键入你庞大的AI Prompt结构逻辑...">${escapeHtml(activeData.content)}</textarea>
                    </div>
                    <div class="cmn-body-actions">
                        <div>
                            ${!isNew ? `<button class="cmn-btn danger" id="actionDelete">删除此条</button>` : ''}
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="cmn-btn" id="actionCancel">取消</button>
                            <button class="cmn-btn primary" id="actionSave">保存修改</button>
                        </div>
                    </div>
                `;

                // 绑定提示词表单内部动作事件
                workspaceBody.querySelector('#actionCancel').addEventListener('click', closeManager);
                workspaceBody.querySelector('#actionSave').addEventListener('click', () => {
                    const name = workspaceBody.querySelector('#editName').value.trim();
                    const content = workspaceBody.querySelector('#editContent').value;
                    if (!name && !content) return;

                    if (isNew) {
                        currentPhrases.push({ name, content });
                        selectedPhraseIndex = currentPhrases.length - 1;
                    } else {
                        currentPhrases[selectedPhraseIndex] = { name, content };
                    }
                    savePhrases(currentPhrases);
                    renderSidebar();
                    renderWorkspace();
                });

                if (!isNew) {
                    workspaceBody.querySelector('#actionDelete').addEventListener('click', () => {
                        currentPhrases.splice(selectedPhraseIndex, 1);
                        savePhrases(currentPhrases);
                        selectedPhraseIndex = currentPhrases.length > 0 ? 0 : -1;
                        renderSidebar();
                        renderWorkspace();
                    });
                }

            } else {
                // 专属网站标签流视图结构
                workspaceBody.innerHTML = `
                    <div class="cmn-domain-manager">
                        <div class="cmn-body-title">生效网站白名单限制</div>
                        <div style="font-size:12px; color:#64748b; margin-bottom:12px; line-height:1.4;">
                            为了避免污染日常浏览网页的右键菜单，本脚本仅在下方白名单域名（或子域名）下的输入框内右键方可唤醒。
                        </div>
                        <div class="cmn-domain-input-box">
                            <input type="text" id="newDomainInput" placeholder="键入新域名，如: deepseek.com (直接回车添加)">
                            <button class="cmn-btn primary" id="addDomainBtn" style="padding:0 16px;">部署</button>
                        </div>
                        <div class="cmn-domain-tags" id="domainTagsWrap"></div>
                        <div class="cmn-body-actions" style="margin-top:auto;">
                            <span style="font-size:12px; color:#94a3b8; align-self:center;">更改实时应用，配置完成直接关闭即可</span>
                            <button class="cmn-btn primary" id="domainFinishBtn">完成退出</button>
                        </div>
                    </div>
                `;

                const tagsWrap = workspaceBody.querySelector('#domainTagsWrap');
                const domainInput = workspaceBody.querySelector('#newDomainInput');

                function renderTags() {
                    tagsWrap.innerHTML = '';
                    currentDomains.forEach((domain, dIdx) => {
                        const tag = document.createElement('span');
                        tag.className = 'cmn-tag';
                        tag.innerHTML = `<span>${domain}</span><span class="cmn-tag-close" data-didx="${dIdx}">×</span>`;
                        tagsWrap.appendChild(tag);
                    });
                }

                function submitNewDomain() {
                    const value = domainInput.value.trim().toLowerCase();
                    if(value && !currentDomains.includes(value)) {
                        currentDomains.push(value);
                        saveDomains(currentDomains);
                        renderTags();
                        domainInput.value = '';
                    }
                }

                renderTags();

                // 部署动作事件映射
                workspaceBody.querySelector('#addDomainBtn').addEventListener('click', submitNewDomain);
                domainInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') submitNewDomain(); });
                tagsWrap.addEventListener('click', (e) => {
                    if(e.target.classList.contains('cmn-tag-close')) {
                        const dIdx = parseInt(e.target.getAttribute('data-didx'), 10);
                        currentDomains.splice(dIdx, 1);
                        saveDomains(currentDomains);
                        renderTags();
                    }
                });
                workspaceBody.querySelector('#domainFinishBtn').addEventListener('click', closeManager);
            }
        }

        // Tab导航栏切换切换监听
        dialogElement.querySelector('.cmn-tab-nav').addEventListener('click', (e) => {
            if (e.target.classList.contains('cmn-tab-btn') && !e.target.classList.contains('active')) {
                dialogElement.querySelectorAll('.cmn-tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                activeTab = e.target.getAttribute('data-tab');
                selectedPhraseIndex = activeTab === 'phrases' ? (currentPhrases.length > 0 ? 0 : -1) : -1;
                renderSidebar();
                renderWorkspace();
            }
        });

        // 侧边栏常驻“新建”按钮监听
        sidebarAddBtn.addEventListener('click', () => {
            selectedPhraseIndex = -1;
            renderSidebar();
            renderWorkspace();
        });

        function escapeHtml(str) {
            const div = document.createElement('div'); div.textContent = str; return div.innerHTML;
        }

        // 触发初始视图
        renderSidebar();
        renderWorkspace();
    }

    function closeManager() {
        if (dialogElement) { dialogElement.remove(); dialogElement = null; }
        const overlay = document.querySelector('.cmn-overlay');
        if (overlay) overlay.remove();
    }

    // ---------- 全局上下文捕获系统 ----------
    document.addEventListener('contextmenu', function (e) {
        // 先快速初筛：非白名单网站，直接放行原生右键，不浪费CPU算力去递归DOM
        if (!isCurrentDomainAllowed()) return;

        let target = e.target;
        while (target && target !== document.body) {
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                break;
            }
            target = target.parentElement;
        }

        if (!target || target === document.body) return;

        e.preventDefault(); e.stopPropagation();

        currentTarget = target;
        if (target.isContentEditable) {
            const selection = window.getSelection();
            savedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        } else if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            savedSelectionStart = target.selectionStart;
            savedSelectionEnd = target.selectionEnd;
        }

        showMenu(e.clientX, e.clientY);
    }, true);

    GM_registerMenuCommand('打开常用语管理', openManager);
})();
