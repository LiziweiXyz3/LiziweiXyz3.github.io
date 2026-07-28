# 终端占位文案原地编辑实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让终端输入框的占位提示在网站编辑模式下可以原地修改并保存，同时保证正常模式下的终端命令输入完全不受影响。

**Architecture:** 在现有稳定编辑键协议上增加 `data-edit-attribute="placeholder"`，由 `js/site-studio.js` 统一读取、应用和重置属性型文案。输入框在编辑模式下使用自身 `value` 作为临时编辑缓冲区；`js/script.js` 只在编辑模式下跳过终端命令处理，正常模式保持原逻辑。

**Tech Stack:** 原生 HTML、CSS、JavaScript、浏览器 `localStorage`、Node 内置 `node:test`。

## Global Constraints

- 仅修改 `D:\PersonalSite`，允许创建本地 Git 提交，严禁执行 GitHub push。
- 草稿继续使用 `personal-site-studio-draft`，不得读写或清理 `personal-site-font-scale`。
- 普通文案继续使用 `textContent`；终端占位提示只使用 `placeholder`，不得使用 `innerHTML`。
- 正常模式继续支持 `help`、`home`、`game` 等终端命令。
- 编辑模式下：失焦或 Enter 保存；Escape 恢复进入编辑前的占位提示；保存后输入框 `value` 必须清空。
- 允许保存空字符串，表示隐藏终端输入提示。
- 不新增依赖，不改变终端小游戏 Canvas、项目链接或其他区域的编辑行为。

---

### Task 1：支持终端占位提示的属性型草稿与原地编辑

**Files:**

- Modify: `index.html:132`
- Modify: `js/site-studio.js:98-285`
- Modify: `js/script.js:384-411`
- Test: `tests/site-studio.test.js`

**Interfaces:**

- Consumes: `SiteStudio.createController(doc, storage)`、`controller.setText(key, text)`、页面根节点的 `data-site-studio-editing`。
- Produces: `data-edit-key="terminal.inputPlaceholder"`、`data-edit-attribute="placeholder"`；属性型文案复用现有草稿 `text` 映射和重置 API。

- [ ] **Step 1：编写控制器属性读写与重置的失败测试**

在 `tests/site-studio.test.js` 的 harness 中加入一个终端输入框：

```js
const terminalInput = createElement({
  'data-edit-key': 'terminal.inputPlaceholder',
  'data-edit-attribute': 'placeholder',
  placeholder: '输入 help 查看可用命令...'
});
```

将 harness 中对应的查询和返回值改为：

```js
if (selector === '[data-edit-key]') return [heroTitle, aboutIntro, terminalInput];

return { doc, storage, hero, about, heroTitle, aboutIntro, terminalInput, writes };
```

然后添加以下测试：

```js
test('placeholder copy persists as an attribute and reset restores its source', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);

  controller.setText('terminal.inputPlaceholder', '输入 game 开始挑战');
  assert.equal(harness.terminalInput.getAttribute('placeholder'), '输入 game 开始挑战');
  assert.equal(controller.getDraft().text['terminal.inputPlaceholder'], '输入 game 开始挑战');

  controller.resetAll();
  assert.equal(harness.terminalInput.getAttribute('placeholder'), '输入 help 查看可用命令...');
});
```

- [ ] **Step 2：运行目标测试并确认按预期失败**

Run:

```powershell
node --test tests\site-studio.test.js
```

Expected: FAIL；控制器仍读写输入框的 `textContent`，所以 `placeholder` 不会变为 `输入 game 开始挑战`。

- [ ] **Step 3：实现属性型文案的最小控制器支持**

在 `js/site-studio.js` 中加入统一读写函数，并让 `applyDraft`、源文案快照和 `setText` 通过它们工作：

```js
function getEditableText(element) {
  if (element.getAttribute('data-edit-attribute') === 'placeholder') {
    return element.getAttribute('placeholder') || '';
  }
  return element.textContent;
}

function applyEditableText(doc, element, text) {
  if (element.getAttribute('data-edit-attribute') === 'placeholder') {
    element.setAttribute('placeholder', text);
    return;
  }
  setPlainText(doc, element, text);
}
```

把 `applyDraft()` 中两处 `setPlainText(...)` 分别替换为：

```js
applyEditableText(doc, element, draft.text[key]);
applyEditableText(doc, element, sourceText[key]);
```

把 `createController()` 的源文案快照改为：

```js
sourceText[key] = element.getAttribute('data-edit-source') || getEditableText(element);
```

在 `index.html` 的终端输入框加入：

```html
data-edit-key="terminal.inputPlaceholder"
data-edit-attribute="placeholder"
```

- [ ] **Step 4：运行目标测试，确认属性保存与重置转绿**

Run:

```powershell
node --test tests\site-studio.test.js
```

Expected: PASS；新测试确认占位提示写入属性、进入草稿并能由 `resetAll()` 恢复。

- [ ] **Step 5：编写编辑模式键盘/焦点行为的失败测试**

先在 `createElement()` 返回对象中加入可触发监听器的 `blur()`：

```js
blur: function () {
  if (listeners.blur) listeners.blur({
    target: this,
    preventDefault: function () {}
  });
}
```

再在测试文件中加入完整的面板 harness：

```js
function createPanelHarness() {
  const hero = createElement({ 'data-studio-section': 'hero' });
  const heroTitle = createElement({ 'data-edit-key': 'hero.title' }, '岁安');
  const terminalInput = createElement({
    'data-edit-key': 'terminal.inputPlaceholder',
    'data-edit-attribute': 'placeholder',
    placeholder: '输入 help 查看可用命令...'
  });
  terminalInput.value = '';

  const toggle = createElement();
  const panel = createElement();
  panel.hidden = true;
  const close = createElement();
  const editMode = createElement();
  const resetAll = createElement();
  const font = createElement();
  font.value = 'classic';
  const scale = createElement();
  scale.value = '100';
  const output = createElement();
  const resetSection = createElement();
  const group = createElement({ 'data-studio-control': 'hero' });
  group.querySelector = function (selector) {
    return {
      '[data-studio-font-control]': font,
      '[data-studio-scale-control]': scale,
      '[data-studio-scale-value]': output,
      '[data-studio-reset-section]': resetSection
    }[selector] || null;
  };

  const listeners = Object.create(null);
  const root = createElement();
  const doc = {
    documentElement: root,
    getElementById: function (id) {
      return {
        siteStudioToggle: toggle,
        siteStudioPanel: panel,
        siteStudioClose: close,
        siteStudioEditMode: editMode,
        siteStudioResetAll: resetAll
      }[id] || null;
    },
    querySelectorAll: function (selector) {
      if (selector === '[data-studio-section]') return [hero];
      if (selector === '[data-edit-key]') return [heroTitle, terminalInput];
      if (selector === '[data-studio-control]') return [group];
      return [];
    },
    addEventListener: function (name, listener) { listeners[name] = listener; }
  };
  const storage = {
    getItem: function () { return null; },
    setItem: function () {},
    removeItem: function () {}
  };
  const controller = api.createController(doc, storage);
  api.bindPanel(doc, controller);

  return { controller, editMode, terminalInput };
}
```

然后添加交互测试：

```js
test('placeholder editing saves on Enter and cancels on Escape without becoming contenteditable', function () {
  const harness = createPanelHarness();
  harness.editMode.checked = true;
  harness.editMode.fire('change');

  assert.equal(harness.terminalInput.getAttribute('contenteditable'), null);
  harness.terminalInput.fire('focus');
  assert.equal(harness.terminalInput.value, '输入 help 查看可用命令...');

  harness.terminalInput.value = '输入 game 开始挑战';
  harness.terminalInput.fire('keydown', {
    key: 'Enter',
    preventDefault: function () {},
    stopPropagation: function () {}
  });
  assert.equal(harness.terminalInput.getAttribute('placeholder'), '输入 game 开始挑战');
  assert.equal(harness.terminalInput.value, '');

  harness.terminalInput.fire('focus');
  harness.terminalInput.value = '不保存这句';
  harness.terminalInput.fire('keydown', { key: 'Escape', preventDefault: function () {} });
  assert.equal(harness.terminalInput.getAttribute('placeholder'), '输入 game 开始挑战');
  assert.equal(harness.terminalInput.value, '');
});
```

再增加静态断言，要求 `js/script.js` 的终端 Enter 处理在编辑模式下立即返回：

```js
assert.match(script, /data-site-studio-editing[^\n]+=== 'true'[^\n]+return/);
```

- [ ] **Step 6：运行目标测试并确认交互用例按预期失败**

Run:

```powershell
node --test tests\site-studio.test.js
```

Expected: FAIL；输入框仍被设置 `contenteditable`，焦点不会载入占位提示，Enter 也没有保存专用流程。

- [ ] **Step 7：实现占位提示的专用编辑流程与终端命令隔离**

在 `js/site-studio.js` 的编辑元素绑定中区分 `data-edit-attribute="placeholder"`：

```js
function isPlaceholderEditor(element) {
  return element.getAttribute('data-edit-attribute') === 'placeholder';
}

function finishPlaceholderEdit(element, save) {
  if (element.getAttribute('data-studio-placeholder-active') !== 'true') return;
  var key = element.getAttribute('data-edit-key');
  var original = element.getAttribute('data-studio-original');
  if (save) controller.setText(key, element.value.slice(0, CONFIG.maxTextLength));
  else if (original !== null) controller.setText(key, original);
  element.value = '';
  element.removeAttribute('data-studio-placeholder-active');
  element.removeAttribute('data-studio-original');
}
```

将现有 `getTextElements(doc).forEach(...)` 事件绑定替换为以下分支结构：

```js
getTextElements(doc).forEach(function (element) {
  element.addEventListener('click', function (event) {
    if (editMode.checked && !isPlaceholderEditor(element)) event.preventDefault();
  });

  element.addEventListener('focus', function () {
    if (!editMode.checked) return;
    element.setAttribute('data-studio-original', getEditableText(element));
    if (isPlaceholderEditor(element)) {
      element.setAttribute('data-studio-placeholder-active', 'true');
      element.value = getEditableText(element);
    }
  });

  element.addEventListener('blur', function () {
    if (!editMode.checked) return;
    if (isPlaceholderEditor(element)) finishPlaceholderEdit(element, true);
    else controller.setText(element.getAttribute('data-edit-key'), element.textContent);
    syncControls();
  });

  element.addEventListener('keydown', function (event) {
    if (!editMode.checked) return;
    if (isPlaceholderEditor(element)) {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        element.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        finishPlaceholderEdit(element, false);
        element.blur();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      var original = element.getAttribute('data-studio-original');
      if (original !== null) controller.setText(element.getAttribute('data-edit-key'), original);
      element.blur();
      syncControls();
    }
  });
});
```

在 `setEditMode(enabled)` 遍历中，只给普通文案设置 `contenteditable`；属性型输入框只设置 `spellcheck="false"`。关闭编辑模式时，如果属性型输入框仍处于活动状态，先调用 `finishPlaceholderEdit(element, true)`，再移除编辑属性并清空 `value`：

```js
if (enabled) {
  if (!isPlaceholderEditor(element)) {
    element.setAttribute('contenteditable', 'plaintext-only');
    if ('contentEditable' in element && element.contentEditable !== 'plaintext-only') {
      element.setAttribute('contenteditable', 'true');
    }
  }
  element.setAttribute('spellcheck', 'false');
} else {
  if (isPlaceholderEditor(element) && element.getAttribute('data-studio-placeholder-active') === 'true') {
    finishPlaceholderEdit(element, true);
  }
  element.removeAttribute('contenteditable');
  element.removeAttribute('spellcheck');
  element.removeAttribute('data-studio-original');
  element.removeAttribute('data-studio-placeholder-active');
  if (isPlaceholderEditor(element)) element.value = '';
}
```

在 `js/script.js` 的终端输入框 Enter 监听中，于读取命令前加入：

```js
if (document.documentElement.getAttribute('data-site-studio-editing') === 'true') return;
```

这样脚本先跳过命令执行，随后由工作台监听处理 Enter 保存。

- [ ] **Step 8：运行目标测试和全量测试**

Run:

```powershell
node --test tests\site-studio.test.js
node --test tests\typography.test.js tests\site-studio.test.js tests\site-behaviors.test.js tests\font-scale.test.js
node --check data.js
node --check js\font-scale.js
node --check js\site-studio.js
node --check js\site-behaviors.js
node --check js\script.js
git diff --check
```

Expected: 所有测试 PASS、语法检查退出码为 `0`、`git diff --check` 无输出。

- [ ] **Step 9：建立本地 Git 版本记录**

Run:

```powershell
git add index.html js/site-studio.js js/script.js tests/site-studio.test.js
git commit -m "feat: edit terminal placeholder inline"
```

Expected: 只创建本地提交；不运行 `git push`。

- [ ] **Step 10：完成交付检查**

Run:

```powershell
git status --short --branch
git log -2 --oneline
```

Expected: 工作区无未提交文件，`main` 仅领先 `origin/main`；最新提交为 `feat: edit terminal placeholder inline`。

手动浏览器验收仍包含：编辑模式下的保存、Escape 取消、刷新恢复、正常模式终端命令，以及桌面/390px 手机视口无溢出。若浏览器插件继续禁止访问本地页面，必须明确记录该项未能自动执行，不得用静态测试冒充浏览器验收。
