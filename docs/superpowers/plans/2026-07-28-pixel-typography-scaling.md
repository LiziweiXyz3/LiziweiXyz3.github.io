# 像素风中英文字体与全站缩放 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有像素游戏风格的同时，建立全站可复用的中英文字体体系，并通过顶部按钮和 90%～130% 滑块实时调节全站文字大小。

**Architecture:** CSS 负责字体角色、语义字号、九档根字号和控件视觉；HTML 提供带可访问性属性的按钮与滑块；独立的 `js/font-scale.js` 负责校验、同步、持久化和开合交互，并由 Node 内置测试覆盖。现有 `js/script.js` 继续负责页面内容渲染，只补充明确的语言标签和初始化调用。

**Tech Stack:** 原生 HTML、CSS、JavaScript，Node.js `node:test`，浏览器 `localStorage`，Git。

## Global Constraints

- 中文像素字体使用 Zpix；英文展示字体使用 Press Start 2P；英文正文使用 VT323；终端与代码使用 Fira Code。
- 中英文视觉倍率通过正常 `font-size` 排版与基线对齐实现，不使用 `transform: scale()`。
- 字体缩放范围固定为 90%～130%，步长固定为 5%，默认值固定为 100%。
- 本地存储键名固定为 `personal-site-font-scale`；非法、越界或非 5 倍数的值必须回退到 100%。
- 仅文字跟随缩放；头像、Emoji、图片、边框、阴影、粒子背景和 Canvas 游戏文字不缩放。
- 字体按钮位于顶部导航栏，显示 `A 100%` 一类当前比例；按钮控制滑块面板开合。
- 点击控件外或按 `Escape` 关闭面板；从面板内按 `Escape` 时焦点返回按钮。
- 保留整张项目卡片新标签页跳转、导航滚动、终端和小游戏现有行为。
- 不引入前端框架、UI 库或第三方依赖。
- 只创建本地 Git 提交，禁止执行 `git push`。

---

### Task 1: 建立全站语义字体与中英文混排基础

**Files:**
- Modify: `stylesheet.css`
- Modify: `index.html`
- Modify: `js/script.js`
- Test: `stylesheet.css`、`index.html`、`js/script.js` 静态断言

**Interfaces:**
- Consumes: 现有 Zpix、Press Start 2P、VT323、Fira Code 字体资源和现有页面类名。
- Produces: `--font-cn-pixel`、`--font-en-display`、`--font-en-body`、`--font-code` 字体角色；全站语义字号变量；`.text-mixed`、`.text-cn`、`.text-en-display`、`.text-en-body` 混排类；供 Task 2 根字号状态统一缩放的 `rem` 字号。

- [ ] **Step 1: 运行会失败的字体体系静态检查**

```powershell
$css = Get-Content -Raw -Encoding utf8 stylesheet.css
$html = Get-Content -Raw -Encoding utf8 index.html
$script = Get-Content -Raw -Encoding utf8 js\script.js
if ($css -notmatch '--font-cn-pixel:' -or $css -notmatch '--font-en-display:' -or $css -notmatch '--font-en-body:') { throw 'semantic font roles missing' }
if ($css -notmatch '\.text-mixed' -or $css -notmatch '\.text-cn' -or $css -notmatch '\.text-en-display') { throw 'mixed-language utilities missing' }
if (([regex]::Matches($css, 'font-size:\s*var\(--type-')).Count -lt 20) { throw 'semantic type tokens are not applied broadly enough' }
if ($html -notmatch 'class="section-subtitle text-mixed"' -or $html -notmatch 'lang="zh-CN"' -or $html -notmatch 'lang="en"') { throw 'static mixed text is not marked by language' }
if ($script -notmatch 'class="project-title-cn" lang="zh-CN"' -or $script -notmatch 'class="project-title-en" lang="en"') { throw 'dynamic project title language tags missing' }
```

Expected: FAIL，提示语义字体角色或混排工具类缺失。

- [ ] **Step 2: 在 CSS 根变量中定义字体角色和语义字号**

在 `:root` 中保留现有颜色和间距变量，并把字体区更新为以下完整变量集合：

```css
--font-cn-pixel: 'Zpix', monospace;
--font-en-display: 'Press Start 2P', monospace;
--font-en-body: 'VT323', monospace;
--font-code: 'Fira Code', monospace;
--font-pixel: var(--font-en-display);
--font-mono: var(--font-en-body);
--font-cn: var(--font-cn-pixel);
--font-title-cn: var(--font-cn-pixel);
--font-title-en: var(--font-en-display);
--font-cn-scale: 1.05;
--font-en-display-scale: 0.9;
--font-en-body-scale: 1;
--font-title-cn-scale: var(--font-cn-scale);
--font-title-en-scale: var(--font-en-display-scale);
--project-title-leading: 1.25;
--project-title-gap: 0.45em;

--type-body-base: 1.375rem;
--type-display: clamp(1.125rem, 5vw, 2rem);
--type-section: clamp(0.875rem, 3vw, 1.25rem);
--type-section-subtitle: 1.25rem;
--type-card-title: 1.125rem;
--type-body: 1rem;
--type-nav-brand: 0.75rem;
--type-nav: 0.5625rem;
--type-button: 0.625rem;
--type-panel-title: 0.6875rem;
--type-stat: 1.125rem;
--type-skill: 0.5rem;
--type-status: 0.5rem;
--type-tag: 0.4375rem;
--type-caption: 0.875rem;
--type-small: 0.8125rem;
--type-support: 0.9375rem;
--type-terminal: 0.875rem;
--type-footer: 1.25rem;
--type-footer-title: 0.875rem;
--type-game-score: 0.75rem;
```

- [ ] **Step 3: 添加混排工具类并替换全站文字字号**

添加以下通用混排规则；项目标题复用同一组变量：

```css
.text-mixed {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--project-title-gap);
}
.text-cn,
.project-title-cn {
  font-family: var(--font-cn-pixel);
  font-size: calc(1em * var(--font-cn-scale));
}
.text-en-display,
.project-title-en {
  font-family: var(--font-en-display);
  font-size: calc(1em * var(--font-en-display-scale));
}
.text-en-body {
  font-family: var(--font-en-body);
  font-size: calc(1em * var(--font-en-body-scale));
}
```

将所有文字用途的 `font-size: Npx` 改为上一步对应的语义变量或等值 `rem`。以下非文字图形尺寸保持像素值：`.hero-avatar img/canvas`、`.hero-subtitle .cursor`、`.section-title .icon`、`.stat-bar-outer`、`.skill-slot .slot-dot`、`.project-icon`、`.project-image`、`.project-empty .lock-icon`、`.terminal-dot`、`.footer-color` 及 Canvas 相关规则。响应式覆盖中的文字字号改为 `rem`：768px 下导航为 `0.4375rem`，480px 下 Hero 标题为 `0.875rem`、区块标题为 `0.75rem`、导航为 `0.375rem`。

- [ ] **Step 4: 标记当前静态和动态语言片段**

在 `index.html` 中把三个区块副标题和页脚混排文字改为明确语言片段，例如：

```html
<p class="section-subtitle text-mixed">
  <span class="text-en-body" lang="en">// QUEST LOG —</span>
  <span class="text-cn" lang="zh-CN">任务日志</span>
</p>
```

同样处理 `// LEVEL PROGRESS — 关卡进度`、`// CONTACT — 建立连接` 和 `© 2026 岁安 · Built with 8-bit love`。在 `js/script.js` 的项目标题模板中使用：

```js
var titleHtml =
  '<span class="project-title-cn" lang="zh-CN">' + proj.title + '</span>' +
  (proj.titleEn ? '<span class="project-title-en" lang="en">' + proj.titleEn + '</span>' : '');
```

导航动态链接和项目状态、技术标签标记 `lang="en"`；Hero 中文姓名与简介标记 `lang="zh-CN"`，英文身份标记 `lang="en"`。不自动拆分 `data.js` 中的自由文本。

- [ ] **Step 5: 运行静态检查并提交 Task 1**

```powershell
node --check js\script.js
git diff --check
$css = Get-Content -Raw -Encoding utf8 stylesheet.css
$html = Get-Content -Raw -Encoding utf8 index.html
$script = Get-Content -Raw -Encoding utf8 js\script.js
if ($css -notmatch '--font-cn-pixel:' -or $css -notmatch '--font-en-display:' -or $css -notmatch '--font-en-body:') { throw 'semantic font roles missing' }
if ($css -notmatch '\.text-mixed' -or $css -notmatch '\.text-cn' -or $css -notmatch '\.text-en-display') { throw 'mixed-language utilities missing' }
if (([regex]::Matches($css, 'font-size:\s*var\(--type-')).Count -lt 20) { throw 'semantic type tokens are not applied broadly enough' }
if ($html -notmatch 'class="section-subtitle text-mixed"' -or $script -notmatch 'class="project-title-cn" lang="zh-CN"') { throw 'language markup missing' }
git add stylesheet.css index.html js\script.js
git commit -m "feat: standardize pixel typography"
```

Expected: 检查均通过，创建一个本地提交，不执行 `git push`。

---

### Task 2: 实现可测试的字体滑块控制器

**Files:**
- Create: `js/font-scale.js`
- Create: `tests/font-scale.test.js`
- Modify: `index.html`
- Modify: `stylesheet.css`
- Modify: `js/script.js`
- Test: `tests/font-scale.test.js`

**Interfaces:**
- Consumes: Task 1 的 `rem` 语义字号、现有 `.nav-inner`/`.nav-links` 布局和浏览器 `localStorage`。
- Produces: 全局 `FontScaleControl` 对象，公开 `CONFIG`、`normalizeScale(value)`、`init(doc, storage)`；HTML ID `fontScaleControl`、`fontScaleToggle`、`fontScalePanel`、`fontScaleRange`、`fontScaleValue`、`fontScaleButtonValue`；根元素 `data-font-scale` 状态。

- [ ] **Step 1: 创建失败的 Node 单元测试**

创建 `tests/font-scale.test.js`，完整内容如下：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../js/font-scale.js');

function createTarget() {
  const listeners = Object.create(null);
  return {
    attributes: Object.create(null),
    hidden: true,
    value: '',
    textContent: '',
    focused: false,
    addEventListener: function (type, handler) { listeners[type] = handler; },
    dispatch: function (type, event) {
      if (listeners[type]) listeners[type](Object.assign({ target: this }, event || {}));
    },
    setAttribute: function (name, value) { this.attributes[name] = String(value); },
    getAttribute: function (name) { return this.attributes[name]; },
    contains: function (target) { return target === this || Boolean(target && target.insideControl); },
    focus: function () { this.focused = true; }
  };
}

function createHarness(savedValue) {
  const doc = createTarget();
  const root = createTarget();
  const control = createTarget();
  const toggle = createTarget();
  const panel = createTarget();
  const range = createTarget();
  const output = createTarget();
  const buttonValue = createTarget();
  const elements = {
    fontScaleControl: control,
    fontScaleToggle: toggle,
    fontScalePanel: panel,
    fontScaleRange: range,
    fontScaleValue: output,
    fontScaleButtonValue: buttonValue
  };
  const writes = [];
  doc.documentElement = root;
  doc.getElementById = function (id) { return elements[id] || null; };
  const storage = {
    getItem: function () { return savedValue == null ? null : String(savedValue); },
    setItem: function (key, value) { writes.push([key, value]); }
  };
  return { doc, root, control, toggle, panel, range, output, buttonValue, storage, writes };
}

test('normalizeScale accepts only 90..130 in steps of 5', function () {
  assert.equal(api.normalizeScale('90'), 90);
  assert.equal(api.normalizeScale(115), 115);
  assert.equal(api.normalizeScale('130'), 130);
  assert.equal(api.normalizeScale('91'), 100);
  assert.equal(api.normalizeScale('150'), 100);
  assert.equal(api.normalizeScale('bad'), 100);
});

test('init uses the default and restores valid stored values', function () {
  const defaultHarness = createHarness(null);
  api.init(defaultHarness.doc, defaultHarness.storage);
  assert.equal(defaultHarness.root.getAttribute('data-font-scale'), '100');

  const storedHarness = createHarness(120);
  api.init(storedHarness.doc, storedHarness.storage);
  assert.equal(storedHarness.root.getAttribute('data-font-scale'), '120');
  assert.equal(storedHarness.range.value, '120');

  const invalidHarness = createHarness(117);
  api.init(invalidHarness.doc, invalidHarness.storage);
  assert.equal(invalidHarness.root.getAttribute('data-font-scale'), '100');
});

test('slider input updates every visible value and storage', function () {
  const harness = createHarness(null);
  const controller = api.init(harness.doc, harness.storage);
  harness.range.value = '130';
  harness.range.dispatch('input');
  assert.equal(controller.getScale(), 130);
  assert.equal(harness.root.getAttribute('data-font-scale'), '130');
  assert.equal(harness.buttonValue.textContent, '130%');
  assert.equal(harness.output.textContent, '130%');
  assert.equal(harness.range.value, '130');
  assert.deepEqual(harness.writes.at(-1), ['personal-site-font-scale', '130']);
});

test('button, outside click and Escape control the panel', function () {
  const harness = createHarness(null);
  const controller = api.init(harness.doc, harness.storage);
  harness.toggle.dispatch('click');
  assert.equal(controller.isOpen(), true);
  assert.equal(harness.toggle.getAttribute('aria-expanded'), 'true');

  harness.doc.dispatch('click', { target: {} });
  assert.equal(controller.isOpen(), false);

  harness.toggle.dispatch('click');
  harness.doc.dispatch('keydown', { key: 'Escape' });
  assert.equal(controller.isOpen(), false);
  assert.equal(harness.toggle.focused, true);
});
```

Run: `node --test tests\font-scale.test.js`

Expected: FAIL，提示找不到 `../js/font-scale.js`。

- [ ] **Step 2: 创建独立字体缩放控制器**

创建浏览器与 CommonJS 双环境可用的 `js/font-scale.js`，完整内容如下：

```js
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FontScaleControl = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CONFIG = Object.freeze({
    min: 90,
    max: 130,
    step: 5,
    defaultValue: 100,
    storageKey: 'personal-site-font-scale'
  });

  function normalizeScale(value) {
    var number = Number(value);
    var valid = Number.isInteger(number) &&
      number >= CONFIG.min &&
      number <= CONFIG.max &&
      (number - CONFIG.min) % CONFIG.step === 0;
    return valid ? number : CONFIG.defaultValue;
  }

  function init(doc, storage) {
    if (!doc) {
      if (typeof document === 'undefined') return null;
      doc = document;
    }
    if (!storage && typeof window !== 'undefined') {
      try { storage = window.localStorage; } catch (error) { storage = null; }
    }

    var rootElement = doc.documentElement;
    var control = doc.getElementById('fontScaleControl');
    var toggle = doc.getElementById('fontScaleToggle');
    var panel = doc.getElementById('fontScalePanel');
    var range = doc.getElementById('fontScaleRange');
    var output = doc.getElementById('fontScaleValue');
    var buttonValue = doc.getElementById('fontScaleButtonValue');
    if (!rootElement || !control || !toggle || !panel || !range || !output || !buttonValue) return null;

    var currentScale = CONFIG.defaultValue;

    function applyScale(value, persist) {
      currentScale = normalizeScale(value);
      var label = currentScale + '%';
      rootElement.setAttribute('data-font-scale', currentScale);
      range.value = String(currentScale);
      output.textContent = label;
      buttonValue.textContent = label;
      if (persist && storage) {
        try { storage.setItem(CONFIG.storageKey, String(currentScale)); } catch (error) { /* storage is optional */ }
      }
    }

    function setOpen(isOpen, returnFocus) {
      panel.hidden = !isOpen;
      toggle.setAttribute('aria-expanded', String(isOpen));
      if (!isOpen && returnFocus) toggle.focus();
    }

    var saved = null;
    if (storage) {
      try { saved = storage.getItem(CONFIG.storageKey); } catch (error) { saved = null; }
    }
    applyScale(saved == null ? CONFIG.defaultValue : saved, false);
    setOpen(false, false);

    toggle.addEventListener('click', function () { setOpen(panel.hidden, false); });
    range.addEventListener('input', function () { applyScale(range.value, true); });
    doc.addEventListener('click', function (event) {
      if (!panel.hidden && !control.contains(event.target)) setOpen(false, false);
    });
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false, true);
    });

    return {
      getScale: function () { return currentScale; },
      isOpen: function () { return !panel.hidden; }
    };
  }

  return { CONFIG: CONFIG, normalizeScale: normalizeScale, init: init };
});
```

- [ ] **Step 3: 添加导航按钮与滑块面板**

把 `index.html` 的导航链接和控制器包入 `.nav-actions`，添加以下结构：

```html
<div class="font-scale-control" id="fontScaleControl">
  <button class="font-scale-toggle" id="fontScaleToggle" type="button"
          aria-expanded="false" aria-controls="fontScalePanel"
          aria-label="调整全站字体大小">
    <span aria-hidden="true">A</span>
    <span id="fontScaleButtonValue">100%</span>
  </button>
  <div class="font-scale-panel" id="fontScalePanel" hidden>
    <label class="font-scale-label" for="fontScaleRange">
      <span lang="zh-CN">字体大小</span>
      <output id="fontScaleValue" for="fontScaleRange">100%</output>
    </label>
    <input class="font-scale-range" id="fontScaleRange" type="range"
           min="90" max="130" step="5" value="100">
  </div>
</div>
```

在 `data.js` 后、`js/script.js` 前加载 `<script src="js/font-scale.js"></script>`。在现有 `init()` 中、页面内容初始化之前安全调用：

```js
if (window.FontScaleControl) {
  window.FontScaleControl.init(document, window.localStorage);
}
```

- [ ] **Step 4: 添加九档根字号与像素风控件样式**

在 CSS 中添加精确的九档基础字号：

```css
html { font-size: 16px; }
html[data-font-scale="90"]  { font-size: 14.4px; }
html[data-font-scale="95"]  { font-size: 15.2px; }
html[data-font-scale="100"] { font-size: 16px; }
html[data-font-scale="105"] { font-size: 16.8px; }
html[data-font-scale="110"] { font-size: 17.6px; }
html[data-font-scale="115"] { font-size: 18.4px; }
html[data-font-scale="120"] { font-size: 19.2px; }
html[data-font-scale="125"] { font-size: 20px; }
html[data-font-scale="130"] { font-size: 20.8px; }
```

`.nav-actions` 使用可换行 flex；`.font-scale-control` 为相对定位；按钮使用现有像素字体、边框、深色背景和清晰的 `:focus-visible`；面板绝对定位在按钮下方、宽度不超过 `calc(100vw - 32px)`、层级高于页面内容；滑块使用 `accent-color: var(--purple)`。`[hidden]` 必须保持 `display: none`。768px 以下 `.nav-actions` 占满一行并居中，面板以控件为中心且不超出视口。

- [ ] **Step 5: 运行单元与静态检查并提交 Task 2**

```powershell
node --test tests\font-scale.test.js
node --check js\font-scale.js
node --check js\script.js
git diff --check
$html = Get-Content -Raw -Encoding utf8 index.html
$css = Get-Content -Raw -Encoding utf8 stylesheet.css
if ($html -notmatch 'id="fontScaleRange"' -or $html -notmatch 'src="js/font-scale.js"') { throw 'font scale markup or script missing' }
if (($css | Select-String -AllMatches 'html\[data-font-scale=').Matches.Count -ne 9) { throw 'font scale state count is not 9' }
git add js\font-scale.js tests\font-scale.test.js index.html stylesheet.css js\script.js
git commit -m "feat: add font scale slider"
```

Expected: 所有测试通过，创建一个本地提交，不执行 `git push`。

- [ ] **Step 6: 浏览器验收**

使用本地静态服务器打开网站，分别在桌面宽度和不大于 480px 的手机宽度检查 90%、100%、130%。必须验证：按钮和滑块实时同步；刷新恢复；非法存储值回退；点击外部和 `Escape` 关闭；键盘方向键可调节滑块；导航、卡片、时间线、终端和页脚无重叠或裁切；项目卡片仍在新标签页打开 GitHub；Canvas 游戏和图片尺寸不随滑块改变。

Expected: 所有设计文档中的浏览器验收项通过；发现问题必须修复、重跑相关单元测试并创建本地修复提交。
