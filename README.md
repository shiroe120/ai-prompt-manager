# AI Prompt Manager | AI 提示词右键随身看板

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Tampermonkey-purple.svg)](https://www.tampermonkey.net/)

一个专为 AI 重度用户打造的浏览器高效插件。它能在你常用的各大 AI 网页端输入框中，通过右键点击瞬间唤醒你的提示词（Prompt）库，一键插入，彻底告别繁琐的复制粘贴。

---

## 特性亮点

*   **分屏独立看板**：采用现代桌面端通用的“左侧列表切换 + 右侧独立编辑”逻辑，彻底告别传统表单无限向下堆叠的拥挤感。
*   **域名沙盒围栏**：自带智能域名过滤机制，仅在指定的 AI 网站输入框内生效，绝不污染你日常浏览普通网页的右键菜单。
*   **视觉美学重构**：采用现代化微交互视觉设计，支持全毛玻璃（Blur）上下文菜单、呼吸灯输入框聚焦、独立面板卡片以及顺滑的模态框弹性动画。
*   **边缘碰撞防护**：内置浏览器排版智能检测，即使在屏幕最底部或最右侧边缘右键，菜单也会自动寻找安全空间反向展开，绝不溢出屏幕。
*   **丝滑文本落焦**：完美兼容普通输入框（Input/Textarea）以及现代富文本编辑器（ContentEditable），插入提示词后自动触发输入事件，AI 网页能无缝感应。

---

## 默认预设支持的 AI 平台

本插件在安装后，默认已为你配置好了国内外主流 AI 平台的生态圈：

| 平台名称 | 默认匹配域名 |
| :--- | :--- |
| **ChatGPT** | `chatgpt.com`, `chat.openai.com` |
| **Claude** | `claude.ai` |
| **DeepSeek** | `deepseek.com`, `chat.deepseek.com` |
| **Gemini** | `gemini.google.com` |
| **Kimi Chat** | `kimi.moonshot.cn` |
| **豆包** | `doubao.com` |
| **通义千问** | `tongyi.aliyun.com` |
| **文心一言** | `yiyan.baidu.com` |
| **秘塔 AI** | `metaso.cn` |

> **提示**：如果你使用的 AI 站点不在此列表中，你可以随时在管理面板的“生效网站”标签页中，一键添加任意新域名。

---

## 安装指南

1.  请确保你的浏览器已安装 Tampermonkey（油猴）扩展插件。
2.  [前往 Greasy Fork 脚本商店](https://greasyfork.org/zh-CN/scripts/578669-ai%E6%8F%90%E7%A4%BA%E8%AF%8D%E7%AE%A1%E7%90%86%E5%99%A8)。
3.  点击页面上的绿色的“安装此脚本”按钮。
4.  刷新你的 AI 网页，即可立即开始体验！

---

## 使用说明

### 1. 快速唤醒与插入
在任何受支持的 AI 网页对话输入框内点击右键，即可弹出你的个性化提示词菜单，左键单击任意一条即可瞬间完成填装。

### 2. 配置与管理
*   **方式 A**：在右键菜单的底部，点击“配置提示词面板”。
*   **方式 B**：点击浏览器右上角油猴扩展图标，在弹出的菜单中选择“打开常用语管理”。

> **注意**：为了保障轻量化与隐私安全，所有提示词数据和域名白名单均通过浏览器的 `GM_setValue` 本地安全隔离存储，绝不上传至任何第三方服务器。

---

## 开发者与自动化运维

项目基于 GitHub 到 Greasy Fork Webhook 自动化流水线构建。

如果你想对本项目进行二次开发或贡献代码：
1. `fork` 本仓库到你的账号下。
2. 修改 `script.user.js` 中的核心逻辑或样式。
3. 提交 `Commit` 并推送到 GitHub，云端机器人会自动触发 Webhook 将最新代码部署上架至 Greasy Fork 商店。

---

## 开源许可证

本项目基于 MIT 许可证开源。
