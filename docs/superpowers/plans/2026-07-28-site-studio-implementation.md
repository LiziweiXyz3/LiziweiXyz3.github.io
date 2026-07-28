# PersonalSite 临时可视化编辑工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 为网站加入仅本地使用的可视化编辑工作台，使岁安能原地编辑所有约定的可见文案、按区域调整字体和字号，并降低终端小游戏难度。

**架构：** 新增独立的 `js/site-studio.js` 作为草稿状态与编辑交互控制器；它读取一个经过校验的 `localStorage` 草稿、按稳定编辑键应用文本、按区域注入字体/字号属性。`index.html` 和 `js/script.js` 为静态与动态文本补充稳定键，`stylesheet.css` 提供工作台与区域作用域样式。现有 `data.js` 继续作为源数据，定稿前不被工作台直接写入。

**技术栈：** 原生 HTML/CSS/JavaScript、浏览器 `localStorage`、Node 内置 `node:test`、Codex 本地浏览器验收。

## 全局约束

- 仅修改 `D:\PersonalSite`，可创建本地 Git 提交；严禁执行 GitHub push。
- 工作台草稿存储键固定为 `personal-site-studio-draft`，与已有 `personal-site-font-scale` 分离。
- 字体方案仅使用已有 Zpix、Press Start 2P、VT323、Fira Code；不新增外部依赖。
- 用户文案绝不通过 `innerHTML` 或 `outerHTML` 写入；只能使用 `textContent` 和 DOM 节点。
- 中文保持 Zpix；英文按区域选择 `经典像素`、`清晰终端`、`硬核街机` 或 `代码等宽`。
- 区域字体倍率只影响文字；图片、Emoji、Canvas、边框、间距和布局尺寸保持固定。
- Hero 人物：首次为 stand；点击切换；下滚 jump、上滚 stand；首屏不得因终端自动聚焦离开 Hero。
- 小游戏：起始速度 `3`，加速更慢，最大速度 `5`。

---

### Task 1：建立可测试的工作台草稿与排版控制器

**文件：**

- 创建：`js/site-studio.js`
- 创建：`tests/site-studio.test.js`
- 修改：`index.html`（在 `js/script.js` 后加载 `js/site-studio.js`）

**接口：**

- 产生：全局/CommonJS 模块 `SiteStudio`。
- 产生：`SiteStudio.normalizeDraft(value)`、`SiteStudio.createController(doc, storage)`。
- 消费：带 `data-edit-key` 与 `data-studio-section` 的 DOM 节点。
- 草稿结构：`{ version: 1, sections: { [section]: { font: preset, scale: number } }, text: { [editKey]: string } }`。

- [ ] **Step 1：先编写会失败的草稿校验与恢复测试**

在 `tests/site-studio.test.js` 建立轻量 DOM harness，并先写入以下真实期望：

```js
test('normalizeDraft rejects invalid stored data and keeps valid section settings', () => {
  assert.deepEqual(api.normalizeDraft('{bad json'), api.createEmptyDraft());
  const draft = api.normalizeDraft(JSON.stringify({
    version: 1,
    sections: { hero: { font: 'terminal', scale: 115 } },
    text: { 'hero.title': '新的标题' }
  }));
  assert.equal(draft.sections.hero.font, 'terminal');
  assert.equal(draft.sections.hero.scale, 115);
  assert.equal(draft.text['hero.title'], '新的标题');
});

test('controller restores safe text and independent section typography from storage', () => {
  const harness = createStudioHarness(savedDraft);
  const controller = api.createController(harness.doc, harness.storage);
  assert.equal(harness.heroTitle.textContent, '新的标题');
  assert.equal(harness.hero.getAttribute('data-studio-font'), 'terminal');
  assert.equal(harness.hero.style.getPropertyValue('--studio-text-scale'), '1.15');
  assert.equal(controller.getDraft().text['hero.title'], '新的标题');
});
```

- [ ] **Step 2：执行测试，确认其因为模块不存在而失败**

运行：`node --test tests/site-studio.test.js`

预期：失败原因是 `Cannot find module '../js/site-studio.js'`。

- [ ] **Step 3：实现最小的纯状态 API 与安全存储访问**

在 `js/site-studio.js` 用与 `js/font-scale.js` 相同的 UMD 形式暴露 API。实现以下常量和函数：

```js
var CONFIG = Object.freeze({
  storageKey: 'personal-site-studio-draft',
  version: 1,
  sections: ['nav', 'hero', 'about', 'projects', 'resume', 'terminal', 'footer'],
  presets: ['classic', 'terminal', 'arcade', 'code'],
  minScale: 80,
  maxScale: 140,
  defaultScale: 100
});

function createEmptyDraft() {
  return { version: CONFIG.version, sections: {}, text: {} };
}

function normalizeSection(value) {
  var font = CONFIG.presets.indexOf(value && value.font) >= 0 ? value.font : 'classic';
  var scale = Number(value && value.scale);
  if (!Number.isInteger(scale) || scale < CONFIG.minScale || scale > CONFIG.maxScale || scale % 5 !== 0) scale = CONFIG.defaultScale;
  return { font: font, scale: scale };
}
```

`normalizeDraft` 只接受对象、版本号 `1`、允许的 section key、长度不超过 5000 的字符串文本；其余字段丢弃并返回结构完整的安全草稿。`createController` 需捕获 `storage.getItem` / `storage.setItem` 异常，保证无存储环境不报错。

- [ ] **Step 4：再次运行单测，确认通过**

运行：`node --test tests/site-studio.test.js`

预期：新增草稿校验与恢复测试全部通过。

- [ ] **Step 5：提交该独立控制器任务**

运行：

```powershell
git add js/site-studio.js tests/site-studio.test.js index.html
git commit -m "feat: add site studio draft controller"
```

---

### Task 2：加入工作台结构、可访问控件和区域样式

**文件：**

- 修改：`index.html`
- 修改：`stylesheet.css`
- 修改：`tests/site-studio.test.js`

**接口：**

- 消费：`SiteStudio.createController`。
- 产生：唯一按钮 `#siteStudioToggle`、唯一侧边栏 `#siteStudioPanel`、区域容器 `data-studio-section`。
- 产生：字体选择控件值 `classic`、`terminal`、`arcade`、`code` 与滑块 80–140、步长 5。

- [ ] **Step 1：为面板结构和样式隔离写失败测试**

向 `tests/site-studio.test.js` 追加静态断言：

```js
test('page exposes an initially closed accessible site studio panel', () => {
  assert.match(html, /id="siteStudioToggle"[\s\S]*aria-controls="siteStudioPanel"/);
  assert.match(html, /id="siteStudioPanel"[^>]*hidden/);
  assert.match(html, /value="classic"[\s\S]*value="terminal"[\s\S]*value="arcade"[\s\S]*value="code"/);
});

test('studio styles scope font choices and text scaling without sizing visual assets', () => {
  assert.match(css, /\[data-studio-font="code"\][\s\S]*--studio-font-en-body:\s*var\(--font-code\)/);
  assert.match(css, /font-size:\s*calc\(var\(--type-[^)]+\) \* var\(--studio-text-scale, 1\)\)/);
  assert.doesNotMatch(css, /\.project-icon[\s\S]*var\(--studio-text-scale/);
});
```

- [ ] **Step 2：运行新增测试，确认面板结构尚不存在**

运行：`node --test tests/site-studio.test.js`

预期：上述页面结构和工作台样式断言失败。

- [ ] **Step 3：在页面加入默认关闭的右侧编辑入口与分区面板**

在 `index.html` 的 `</body>` 前加入：

```html
<button class="site-studio-toggle" id="siteStudioToggle" type="button"
        aria-expanded="false" aria-controls="siteStudioPanel">编辑网站</button>
<aside class="site-studio-panel" id="siteStudioPanel" hidden aria-label="网站排版与文案编辑">
  <div class="site-studio-header">
    <span class="text-cn" lang="zh-CN">排版与文案</span>
    <button id="siteStudioClose" type="button" aria-label="关闭编辑网站">×</button>
  </div>
  <label><input id="siteStudioEditMode" type="checkbox"> 原地编辑文案</label>
  <div id="siteStudioSections"></div>
  <button id="siteStudioResetAll" type="button">恢复全部默认值</button>
</aside>
```

为导航、Hero、About、Projects、Resume、Terminal、Footer 直接添加 `data-studio-section`。保留原始全站字号控件，两个控件不得复用 ID。

在 `stylesheet.css` 添加固定右侧面板、像素风焦点态、移动端底部抽屉回退和 `data-studio-font` / `--studio-text-scale` 规则。只将现有文字选择器改为：

```css
.hero [lang="en"], .section [lang="en"], .footer [lang="en"] {
  font-family: var(--studio-font-en-body, var(--font-en-body));
}
[data-studio-font="arcade"] { --studio-font-en-body: var(--font-en-display); }
[data-studio-font="code"]   { --studio-font-en-body: var(--font-code); }
[data-studio-font="terminal"] { --studio-font-en-body: var(--font-en-body); }
```

对既有字号变量的使用点添加 `* var(--studio-text-scale, 1)`；保留 `.about-card-icon` 的 `11px`、图片、Canvas 与固定像素尺寸不变。

- [ ] **Step 4：运行测试，确认结构和样式断言通过**

运行：`node --test tests/site-studio.test.js`

预期：页面结构、四种字体方案和视觉资产不缩放的断言通过。

- [ ] **Step 5：提交面板和样式任务**

运行：

```powershell
git add index.html stylesheet.css tests/site-studio.test.js
git commit -m "feat: add site studio panel and section typography"
```

---

### Task 3：实现原地纯文本编辑、区域设置和草稿恢复

**文件：**

- 修改：`js/site-studio.js`
- 修改：`index.html`
- 修改：`js/script.js`
- 修改：`tests/site-studio.test.js`

**接口：**

- 消费：`[data-edit-key]`、`[data-studio-section]`、工作台控件。
- 产生：`controller.setText(editKey, text)`、`controller.setSection(section, font, scale)`、`controller.resetSection(section)`、`controller.resetAll()`。
- 产生：页面级属性 `data-site-studio-editing="true"`，仅在原地编辑模式开启时存在。

- [ ] **Step 1：为编辑保存、重载恢复和重置写失败测试**

在 `tests/site-studio.test.js` 添加：

```js
test('inline edits persist plain text without accepting markup', () => {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);
  controller.setText('hero.title', '<b>岁安</b>');
  assert.equal(harness.heroTitle.textContent, '<b>岁安</b>');
  assert.match(harness.writes.at(-1)[1], /"hero.title":"<b>岁安<\\\/b>"/);
});

test('section controls persist independently and reset only their own defaults', () => {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);
  controller.setSection('hero', 'code', 125);
  controller.setSection('about', 'arcade', 90);
  controller.resetSection('hero');
  assert.equal(controller.getDraft().sections.hero, undefined);
  assert.deepEqual(controller.getDraft().sections.about, { font: 'arcade', scale: 90 });
});
```

- [ ] **Step 2：运行测试，确认新的编辑和重置 API 尚不存在**

运行：`node --test tests/site-studio.test.js`

预期：因为 `setText`、`setSection` 或 `resetSection` 未定义而失败。

- [ ] **Step 3：为所有可编辑文字配置稳定键**

静态文字在 `index.html` 中放入独立 span，例如：

```html
<span data-edit-key="footer.gameover">— GAME OVER —</span>
```

动态文字在 `js/script.js` 创建后立即设置，如：

```js
titleCn.setAttribute('data-edit-key', 'projects.' + proj.id + '.title');
desc.setAttribute('data-edit-key', 'projects.' + proj.id + '.desc');
field.setAttribute('data-edit-key', 'resume.' + index + '.desc');
```

为 `renderNav`、`renderHero`、`renderAbout`、`renderProjects`、`renderResume` 与 `setupTerminal` 中所有用户可见文本分别赋予稳定、可预测的键。不要为图标、状态条的 CSS 宽度、Canvas 内文字或终端命令执行后的动态日志添加编辑键。

- [ ] **Step 4：实现安全的原地编辑和区域控制**

在 `SiteStudio` 中：

1. 读取草稿后遍历 `[data-edit-key]`，用 `element.textContent = draft.text[key]` 应用已保存文案。
2. 编辑模式开启时为这些元素添加 `contenteditable="plaintext-only"`；不支持该值的浏览器回退为 `contenteditable="true"`，但始终通过 `textContent` 保存。
3. 在 `blur` 与 Escape 时保存 `element.textContent.slice(0, 5000)`；Escape 同时还原本次聚焦前的文本。
4. 按 section 生成 `<select>`、`<input type="range">` 和单区恢复按钮；事件调用 `setSection` 与 `resetSection`。
5. 字体面板遵守现有键盘规则：按钮 Enter/Space 打开，Escape 关闭并回到入口；点击侧边栏外关闭。

保存函数使用：

```js
function persist() {
  if (!storage) return;
  try { storage.setItem(CONFIG.storageKey, JSON.stringify(draft)); } catch (error) { /* optional storage */ }
}
```

- [ ] **Step 5：运行全量单测，确认编辑、重置和既有行为均通过**

运行：`node --test`

预期：`font-scale`、`typography` 与新增 `site-studio` 测试全部通过。

- [ ] **Step 6：提交原地编辑任务**

运行：

```powershell
git add js/site-studio.js js/script.js index.html tests/site-studio.test.js
git commit -m "feat: enable inline site copy editing"
```

---

### Task 4：修正人物首屏/滚动状态并降低小游戏难度

**文件：**

- 修改：`index.html`
- 修改：`js/script.js`
- 创建：`js/site-behaviors.js`
- 创建：`tests/site-behaviors.test.js`
- 修改：`tests/typography.test.js`

**接口：**

- 产生：CommonJS / 浏览器全局模块 `SiteBehaviors`。
- 产生：Hero 状态控制器 `SiteBehaviors.createAvatarController(img, getScrollY)`，暴露 `onScroll()`、`toggle()`、`getState()`。
- 产生：小游戏常量 `SiteBehaviors.GAME_CONFIG = { startSpeed: 3, maxSpeed: 5, speedStep: 0.15, speedEveryFrames: 600 }`。

- [ ] **Step 1：先为人物初始/滚动状态与小游戏常量写失败测试**

创建 `tests/site-behaviors.test.js`，引入 `const api = require('../js/site-behaviors.js');` 并写入：

```js
test('avatar begins standing, jumps on downward scroll and stands on upward scroll', () => {
  let y = 0;
  const image = { src: '', style: {} };
  const avatar = api.createAvatarController(image, () => y);
  assert.equal(avatar.getState(), 'stand');
  y = 30; avatar.onScroll();
  assert.equal(avatar.getState(), 'jump');
  y = 0; avatar.onScroll();
  assert.equal(avatar.getState(), 'stand');
});

test('mini game difficulty uses the agreed capped speed constants', () => {
  assert.deepEqual(api.GAME_CONFIG, { startSpeed: 3, maxSpeed: 5, speedStep: 0.15, speedEveryFrames: 600 });
});
```

在 `tests/typography.test.js` 增加静态断言，确认终端 input 不再含有 `autofocus`：

```js
assert.doesNotMatch(html, /id="terminalInput"[^>]*\sautofocus/);
```

- [ ] **Step 2：运行测试，确认初始状态、常量和 autofocus 修复尚未存在**

运行：`node --test tests/site-behaviors.test.js tests/typography.test.js`

预期：因为 `../js/site-behaviors.js` 不存在而失败，且 HTML 仍包含 `autofocus`。

- [ ] **Step 3：提取 Hero 控制器并做最小行为修复**

新增 UMD 形式的 `js/site-behaviors.js`，其中包含 `createAvatarController` 和 `GAME_CONFIG`。控制器使初始状态固定为 stand，且每次滚动只在绝对差值大于 10px 时改变状态。随后在 `index.html` 中于 `js/script.js` 前加载该模块；将 `renderHero` 的滚动监听改为：

```js
var avatar = SiteBehaviors.createAvatarController(img, function () { return window.scrollY; });
img.addEventListener('click', avatar.toggle);
window.addEventListener('scroll', avatar.onScroll, { passive: true });
```

移除 `#terminalInput` 的 `autofocus` 属性，保留已有“点击终端区域聚焦输入框”行为。

将小游戏速度逻辑替换为：

```js
var GAME_CONFIG = SiteBehaviors.GAME_CONFIG;
var score = 0, running = false, speed = GAME_CONFIG.startSpeed, started = false;
if (frame % GAME_CONFIG.speedEveryFrames === 0 && speed < GAME_CONFIG.maxSpeed) {
  speed = Math.min(GAME_CONFIG.maxSpeed, speed + GAME_CONFIG.speedStep);
}
```

`restart()` 同样重置为 `GAME_CONFIG.startSpeed`。`js/script.js` 不新增 CommonJS 出口，浏览器运行路径保持不变。

- [ ] **Step 4：运行目标测试与全量测试**

运行：

```powershell
node --test tests/site-behaviors.test.js tests/typography.test.js
node --test
node --check js/script.js
node --check js/site-behaviors.js
git diff --check
```

预期：所有测试通过，语法和差异检查无输出。

- [ ] **Step 5：提交人物与小游戏任务**

运行：

```powershell
git add index.html js/script.js js/site-behaviors.js tests/site-behaviors.test.js tests/typography.test.js
git commit -m "fix: restore avatar scroll states and slow mini game"
```

---

### Task 5：浏览器验收、回归检查和本地交付

**文件：**

- 修改：仅在发现缺陷时修改对应运行代码与测试；否则不新增文件。

**接口：**

- 消费：Task 1–4 的页面、草稿键、区域控件和小游戏配置。
- 产生：已验证的本地 Git 提交；不产生远程变更。

- [ ] **Step 1：运行最终自动化检查**

运行：

```powershell
node --test
node --check data.js
node --check js/font-scale.js
node --check js/site-studio.js
node --check js/site-behaviors.js
node --check js/script.js
git diff --check origin/main...HEAD
git status --short --branch
```

预期：所有测试通过、所有语法检查通过、差异检查无输出，分支仅显示领先 `origin/main`，没有未提交文件。

- [ ] **Step 2：桌面浏览器验收**

在本地静态服务访问网站，检查：

1. 右侧 `编辑网站` 默认关闭；鼠标、Enter、Space 可打开，Escape 与外部点击可关闭。
2. 选择 Hero 的四种字体、调到 80% 与 140%，只影响 Hero 文字；头像、分隔线与布局尺寸不变。
3. 修改 Hero 标题、Projects 描述和 Footer 文案；刷新后草稿保留，且文本以纯文本显示，不将 `<b>` 解析为标签。
4. 单区恢复不会影响其他区域；全部恢复清除工作台草稿，但不改变顶部全站字号偏好。
5. 首屏为 stand；点击切换；滚下为 jump、滚上为 stand；不自动跳转到终端。
6. 项目卡整卡仍在新标签页以 `noopener` 打开 GitHub；导航、终端 `help` / `home` / `game` 命令仍可用。
7. 小游戏启动后节奏可控，连续运行后速度不超过 5。

- [ ] **Step 3：手机浏览器验收**

在 390px 宽度、全站字号 130% 下检查：侧边栏使用底部抽屉或不溢出视口；每个区域控件可触达；编辑提示不会遮挡文本；页面和终端输入行均无横向溢出。

- [ ] **Step 4：本地提交验收修复（仅在需要时）**

如浏览器验收发现问题，必须先在对应测试中写出失败复现，再最小修复、重新运行 Step 1–3，并执行：

```powershell
git add index.html stylesheet.css js/site-studio.js js/script.js tests
git commit -m "fix: polish site studio interaction"
```

若没有验收缺陷，不创建空提交。

- [ ] **Step 5：交付边界**

报告本地提交、测试与浏览器验收结果，明确工作台草稿只保存在本机浏览器且 GitHub 未推送。保留工作台，直到岁安明确表示“定稿并移除侧边栏”。
