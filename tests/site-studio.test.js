const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../js/site-studio.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'stylesheet.css'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'script.js'), 'utf8');
const floatingScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'floating-clawd.js'), 'utf8');
const studioScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-studio.js'), 'utf8');
const editorHtml = fs.readFileSync(path.join(__dirname, '..', 'editor.html'), 'utf8');
const editorScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'studio-editor.js'), 'utf8');

function createStyle() {
  const values = Object.create(null);
  return {
    setProperty: function (name, value) { values[name] = String(value); },
    removeProperty: function (name) { delete values[name]; },
    getPropertyValue: function (name) { return values[name] || ''; }
  };
}

function attributeSelector(selector) {
  const match = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(selector);
  return match ? { name: match[1], value: match[2] } : null;
}

function createElement(tagName, attributes, text) {
  if (typeof tagName !== 'string') {
    text = attributes;
    attributes = tagName;
    tagName = 'div';
  }
  const attrs = Object.assign(Object.create(null), attributes || {});
  const listeners = Object.create(null);
  const children = [];
  let textValue = text || '';
  const element = {
    tagName: String(tagName || 'div').toUpperCase(),
    attributes: attrs,
    style: createStyle(),
    children: children,
    parentNode: null,
    value: '',
    hidden: false,
    open: false,
    checked: false,
    focused: false,
    scrolled: false,
    className: '',
    getAttribute: function (name) { return Object.hasOwn(attrs, name) ? attrs[name] : null; },
    setAttribute: function (name, value) { attrs[name] = String(value); },
    removeAttribute: function (name) { delete attrs[name]; },
    appendChild: function (child) {
      child.parentNode = element;
      children.push(child);
      return child;
    },
    removeChild: function (child) {
      const index = children.indexOf(child);
      if (index >= 0) children.splice(index, 1);
      child.parentNode = null;
      return child;
    },
    addEventListener: function (name, listener) {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(listener);
    },
    fire: function (name, event) {
      const payload = event || {};
      if (!payload.target) payload.target = element;
      if (!payload.preventDefault) payload.preventDefault = function () {};
      if (!payload.stopPropagation) payload.stopPropagation = function () {};
      (listeners[name] || []).forEach(function (listener) { listener(payload); });
    },
    contains: function (target) {
      if (target === element) return true;
      return children.some(function (child) { return child.contains && child.contains(target); });
    },
    matches: function (selector) {
      const attr = attributeSelector(selector);
      if (attr) {
        if (!Object.hasOwn(attrs, attr.name)) return false;
        return attr.value === undefined || attrs[attr.name] === attr.value;
      }
      if (selector.charAt(0) === '.') {
        return String(element.className).split(/\s+/).indexOf(selector.slice(1)) >= 0;
      }
      return element.tagName.toLowerCase() === selector.toLowerCase();
    },
    querySelectorAll: function (selector) {
      const found = [];
      children.forEach(function visit(child) {
        if (child.matches && child.matches(selector)) found.push(child);
        (child.children || []).forEach(visit);
      });
      return found;
    },
    querySelector: function (selector) { return element.querySelectorAll(selector)[0] || null; },
    closest: function (selector) {
      let current = element;
      while (current) {
        if (current.matches && current.matches(selector)) return current;
        current = current.parentNode;
      }
      return null;
    },
    focus: function () { element.focused = true; },
    blur: function () { element.fire('blur'); },
    scrollIntoView: function () { element.scrolled = true; }
  };
  element.cloneNode = function (deep) {
    const clone = createElement(element.tagName, Object.assign({}, attrs), textValue);
    clone.className = element.className;
    clone.lang = element.lang;
    if (deep) children.forEach(function (child) { clone.appendChild(child.cloneNode(true)); });
    return clone;
  };
  Object.defineProperty(element, 'firstChild', {
    configurable: true,
    get: function () { return children[0] || null; }
  });
  Object.defineProperty(element, 'childNodes', {
    configurable: true,
    get: function () { return children; }
  });
  Object.defineProperty(element, 'textContent', {
    configurable: true,
    get: function () {
      return children.length
        ? children.map(function (child) { return child.textContent; }).join('')
        : textValue;
    },
    set: function (value) {
      while (children.length) children.pop().parentNode = null;
      textValue = String(value);
    }
  });
  return element;
}

function createDocument(editables, ids) {
  const listeners = Object.create(null);
  const root = createElement('html');
  return {
    documentElement: root,
    createElement: function (tagName) { return createElement(tagName); },
    querySelectorAll: function (selector) {
      if (selector === '[data-edit-key]') return editables;
      return [];
    },
    querySelector: function (selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    getElementById: function (id) { return ids && ids[id] || null; },
    addEventListener: function (name, listener) {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(listener);
    },
    fire: function (name, event) {
      (listeners[name] || []).forEach(function (listener) { listener(event || {}); });
    }
  };
}

function editable(key, label, text, extra) {
  return createElement('span', Object.assign({
    'data-edit-key': key,
    'data-edit-section': key.split('.')[0],
    'data-edit-label': label,
    'data-edit-source': text
  }, extra || {}), text);
}

function createStudioHarness(savedValue) {
  const heroTitle = editable('hero.title', '姓名', '岁安');
  const heroSubtitle = editable('hero.subtitle', '身份介绍', '> Data Analyst / AI Learner');
  const aboutIntro = editable('about.intro', '个人介绍', '原始介绍', { 'data-edit-multiline': 'true' });
  const terminalInput = createElement('input', {
    'data-edit-key': 'terminal.inputPlaceholder',
    'data-edit-section': 'terminal',
    'data-edit-label': '输入框提示',
    'data-edit-attribute': 'placeholder',
    'data-edit-source': '输入 help 查看可用命令...',
    placeholder: '输入 help 查看可用命令...'
  });
  const editables = [heroTitle, heroSubtitle, aboutIntro, terminalInput];
  const writes = [];
  const storage = {
    getItem: function () { return savedValue == null ? null : String(savedValue); },
    setItem: function (key, value) { writes.push([key, value]); },
    removeItem: function (key) { writes.push([key, null]); }
  };
  const doc = createDocument(editables);
  return { doc, storage, editables, heroTitle, heroSubtitle, aboutIntro, terminalInput, writes };
}

function createPanelHarness(savedValue) {
  const base = createStudioHarness(savedValue);
  const toggle = createElement('button');
  const panel = createElement('aside');
  panel.hidden = true;
  const close = createElement('button');
  const sections = createElement('div');
  const resetAll = createElement('button');
  const save = createElement('button');
  const undo = createElement('button');
  const status = createElement('output');
  const ids = {
    siteStudioToggle: toggle,
    siteStudioPanel: panel,
    siteStudioClose: close,
    siteStudioSections: sections,
    siteStudioResetAll: resetAll,
    siteStudioSave: save,
    siteStudioUndo: undo,
    siteStudioStatus: status
  };
  const doc = createDocument(base.editables, ids);
  base.doc = doc;
  const controller = api.createController(doc, base.storage);
  api.bindPanel(doc, controller);
  return Object.assign(base, {
    doc, controller, toggle, panel, close, sections, resetAll, save, undo, status,
    root: doc.documentElement,
    outside: createElement('div')
  });
}

test('normalizes V2 text styles and UI state against known edit keys', function () {
  const draft = api.normalizeDraft({
    version: 2,
    text: { 'hero.title': '', unknown: 'drop me' },
    textStyles: {
      'hero.title': { font: 'terminal', scale: 120, bold: true, italic: true },
      'hero.subtitle': { font: 'invalid', scale: 103 }
    },
    ui: { selectedKey: 'hero.title', openSections: ['hero', 'unknown', 'hero'] }
  }, ['hero.title', 'hero.subtitle']);

  assert.equal(draft.text['hero.title'], '');
  assert.equal(draft.text.unknown, undefined);
  assert.deepEqual(draft.textStyles['hero.title'], { font: 'terminal', scale: 120, bold: true, italic: true });
  assert.deepEqual(draft.textStyles['hero.subtitle'], { font: 'classic', scale: 100, bold: false, italic: false });
  assert.deepEqual(draft.ui, { selectedKey: 'hero.title', openSections: ['hero'] });
});

test('migrates V1 section typography to every known item and writes V2 back', function () {
  const raw = JSON.stringify({
    version: 1,
    sections: { hero: { font: 'code', scale: 125 } },
    text: { 'hero.title': '新名字', unknown: 'drop me' }
  });
  const normalized = api.normalizeDraft(raw, ['hero.title', 'hero.subtitle', 'about.intro']);
  assert.equal(normalized.version, 2);
  assert.equal(normalized.text['hero.title'], '新名字');
  assert.deepEqual(normalized.textStyles['hero.title'], { font: 'code', scale: 125, bold: false, italic: false });
  assert.deepEqual(normalized.textStyles['hero.subtitle'], { font: 'code', scale: 125, bold: false, italic: false });
  assert.equal(normalized.textStyles['about.intro'], undefined);

  const harness = createStudioHarness(raw);
  api.createController(harness.doc, harness.storage);
  assert.equal(JSON.parse(harness.writes.at(-1)[1]).version, 2);
});

test('controller persists plain text and empty placeholder text without HTML execution', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);
  controller.setText('hero.title', '<b>岁安</b>');
  controller.setText('terminal.inputPlaceholder', '');
  assert.equal(harness.heroTitle.textContent, '<b>岁安</b>');
  assert.equal(harness.terminalInput.getAttribute('placeholder'), '');
  assert.equal(controller.getDraft().text['terminal.inputPlaceholder'], '');
});

test('edited mixed text keeps separate English and Chinese language nodes', function () {
  const children = [];
  const title = editable('hero.title', '姓名', '原始标题');
  title.appendChild = function (child) { children.push(child); child.parentNode = title; };
  title.removeChild = function (child) {
    const index = children.indexOf(child);
    if (index >= 0) children.splice(index, 1);
  };
  Object.defineProperty(title, 'firstChild', { get: function () { return children[0] || null; } });
  const doc = createDocument([title]);
  const controller = api.createController(doc, null);
  controller.setText('hero.title', 'AI 产品经理');
  assert.deepEqual(children.map(function (child) {
    return { lang: child.lang, text: child.textContent };
  }), [
    { lang: 'en', text: 'AI ' },
    { lang: 'zh-CN', text: '产品经理' }
  ]);
});

test('applies font, scale, bold and italic independently to sibling Hero text', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);
  controller.setTextStyle('hero.title', 'arcade', 90, true, false);
  controller.setTextStyle('hero.subtitle', 'terminal', 125, false, true);
  assert.equal(harness.heroTitle.getAttribute('data-studio-font'), 'arcade');
  assert.equal(harness.heroTitle.getAttribute('data-studio-bold'), 'true');
  assert.equal(harness.heroTitle.getAttribute('data-studio-italic'), null);
  assert.equal(harness.heroTitle.style.getPropertyValue('--studio-item-scale'), '0.9');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-font'), 'terminal');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-bold'), null);
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-italic'), 'true');
  assert.equal(harness.heroSubtitle.style.getPropertyValue('--studio-item-scale'), '1.25');
});

test('item, section and global resets clear only their intended V2 scope', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);
  controller.setText('hero.title', '新名字');
  controller.setTextStyle('hero.title', 'code', 110);
  controller.setTextStyle('hero.subtitle', 'terminal', 120);
  controller.setTextStyle('about.intro', 'arcade', 90);

  controller.resetItem('hero.title');
  assert.equal(harness.heroTitle.textContent, '岁安');
  assert.equal(controller.getDraft().textStyles['hero.title'], undefined);
  assert.deepEqual(controller.getDraft().textStyles['hero.subtitle'], { font: 'terminal', scale: 120, bold: false, italic: false });

  controller.resetSection('hero');
  assert.equal(controller.getDraft().textStyles['hero.subtitle'], undefined);
  assert.deepEqual(controller.getDraft().textStyles['about.intro'], { font: 'arcade', scale: 90, bold: false, italic: false });

  controller.resetAll();
  assert.deepEqual(controller.getDraft(), api.createEmptyDraft());
});

test('public page has no editor chrome while the local editor owns the studio controls', function () {
  assert.doesNotMatch(html, /id="siteStudioSections"/);
  assert.doesNotMatch(html, /id="siteStudioToggle"/);
  assert.doesNotMatch(html, /js\/site-studio\.js/);
  assert.match(editorHtml, /id="structureTree"/);
  assert.match(editorHtml, /id="saveButton"/);
  assert.match(editorHtml, /id="undoButton"/);
  assert.match(editorHtml, /index\.html\?studio-preview=1/);
});

test('static and dynamic edit keys expose human-readable sidebar metadata', function () {
  assert.match(html, /data-edit-key="nav\.brand"[^>]*data-edit-label="站点名称"/);
  assert.match(html, /data-edit-key="hero\.scrollHint"[^>]*data-edit-label="下滑提示"/);
  assert.match(html, /data-edit-key="terminal\.inputPlaceholder"[^>]*data-edit-label="输入框提示"/);
  assert.match(script, /setEditKey\(heroTitle, 'hero\.title', user\.name, '姓名'/);
  assert.match(script, /setEditKey\(heroDesc, 'hero\.description',[\s\S]*?'个人简介', true\)/);
  assert.match(script, /proj\.title \+ ' · 项目介绍'/);
  assert.match(script, /var experienceId = exp\.id \|\| String\(index\)/);
  assert.match(script, /'resume\.' \+ experienceId \+ '\.desc'/);
  assert.match(editorScript, /resume\.' \+ experience\.id \+ '\.period'/);
});

test('sidebar generates all controls and edits copy and typography live', function () {
  const harness = createPanelHarness(null);
  harness.toggle.fire('click');
  assert.equal(harness.panel.hidden, false);
  assert.equal(harness.root.getAttribute('data-site-studio-editing'), 'true');
  assert.equal(harness.sections.querySelectorAll('[data-studio-item-control]').length, 4);

  const control = harness.sections.querySelector('[data-studio-item-control="hero.subtitle"]');
  const textInput = control.querySelector('[data-studio-text-input]');
  const font = control.querySelector('[data-studio-item-font]');
  const scale = control.querySelector('[data-studio-item-scale]');
  const bold = control.querySelector('[data-studio-item-bold]');
  const italic = control.querySelector('[data-studio-item-italic]');
  textInput.value = '> AI Product Manager';
  textInput.fire('input');
  font.value = 'code';
  font.fire('change');
  scale.value = '130';
  scale.fire('input');
  bold.checked = true;
  bold.fire('change');
  italic.checked = true;
  italic.fire('change');

  assert.equal(harness.heroSubtitle.textContent, '> AI Product Manager');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-font'), 'code');
  assert.equal(harness.heroSubtitle.style.getPropertyValue('--studio-item-scale'), '1.3');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-bold'), 'true');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-italic'), 'true');
});

test('multiline copy preserves authored line breaks on the page', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);
  controller.setText('about.intro', '互联网数据分析师，正在学习 AI。\n用数据理解世界，用 AI 拓展边界。');

  assert.equal(harness.aboutIntro.textContent, '互联网数据分析师，正在学习 AI。\n用数据理解世界，用 AI 拓展边界。');
  assert.match(css, /\[data-edit-key\]\[data-edit-multiline="true"\][^{]*\{[^}]*white-space:\s*pre-wrap/);
});

test('editing an About stat value updates and clamps its linked bar width', function () {
  const row = createElement('div');
  row.className = 'stat-row';
  const value = editable('about.stats.0.value', '分析能力 · 属性数值', '75/100');
  const bar = createElement('div');
  bar.className = 'stat-bar-inner';
  row.appendChild(value);
  row.appendChild(bar);
  const controller = api.createController(createDocument([value]), null);

  controller.setText('about.stats.0.value', '42/100');
  assert.equal(bar.style.getPropertyValue('width'), '42%');
  assert.equal(bar.getAttribute('data-width'), '42%');
  controller.setText('about.stats.0.value', '135');
  assert.equal(bar.style.getPropertyValue('width'), '100%');
});

test('sidebar save confirms persistence and undo restores the previous editing step', function () {
  const harness = createPanelHarness(null);
  harness.toggle.fire('click');
  const control = harness.sections.querySelector('[data-studio-item-control="hero.title"]');
  const input = control.querySelector('[data-studio-text-input]');
  input.value = '岁';
  input.fire('input');
  input.value = '岁安的新名字';
  input.fire('input');
  input.fire('blur');

  assert.equal(harness.heroTitle.textContent, '岁安的新名字');
  assert.equal(harness.undo.disabled, false);
  harness.undo.fire('click');
  assert.equal(harness.heroTitle.textContent, '岁安');
  harness.save.fire('click');
  assert.equal(harness.status.textContent, '已保存到本地');
  assert.equal(JSON.parse(harness.writes.at(-1)[1]).version, 2);
});

test('outside click and Escape keep sidebar open while only close exits editing', function () {
  const harness = createPanelHarness(null);
  harness.toggle.fire('click');
  harness.doc.fire('click', { target: harness.outside });
  harness.doc.fire('keydown', { key: 'Escape' });
  assert.equal(harness.panel.hidden, false);
  harness.close.fire('click');
  assert.equal(harness.panel.hidden, true);
  assert.equal(harness.root.getAttribute('data-site-studio-editing'), 'false');
  assert.equal(harness.toggle.focused, true);
});

test('page text selects, scrolls and focuses its sidebar editor and restores on reopen', function () {
  const harness = createPanelHarness(null);
  harness.toggle.fire('click');
  let prevented = false;
  harness.doc.fire('click', {
    target: harness.heroSubtitle,
    preventDefault: function () { prevented = true; },
    stopPropagation: function () {}
  });
  const control = harness.sections.querySelector('[data-studio-item-control="hero.subtitle"]');
  const input = control.querySelector('[data-studio-text-input]');
  assert.equal(prevented, true);
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-selected'), 'true');
  assert.equal(control.open, true);
  assert.equal(control.scrolled, true);
  assert.equal(input.focused, true);

  harness.close.fire('click');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-selected'), null);
  harness.toggle.fire('click');
  const rebuilt = harness.sections.querySelector('[data-studio-item-control="hero.subtitle"]');
  assert.equal(rebuilt.open, true);
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-selected'), 'true');
});

test('terminal placeholder is edited from the sidebar and never becomes contenteditable', function () {
  const harness = createPanelHarness(null);
  harness.toggle.fire('click');
  const control = harness.sections.querySelector('[data-studio-item-control="terminal.inputPlaceholder"]');
  const input = control.querySelector('[data-studio-text-input]');
  input.value = '输入 game 开始挑战';
  input.fire('input');
  assert.equal(harness.terminalInput.getAttribute('placeholder'), '输入 game 开始挑战');
  assert.equal(harness.terminalInput.getAttribute('contenteditable'), null);
  assert.match(script, /if \(document\.documentElement\.getAttribute\('data-site-studio-editing'\) === 'true'\) return;/);
});

test('editing mode suppresses project-card navigation and terminal command focus', function () {
  assert.match(script, /card\.addEventListener\('click',[\s\S]*?data-site-studio-editing'[\s\S]*?preventDefault/);
  assert.match(script, /body\.addEventListener\('click',[\s\S]*?if \(document\.documentElement\.getAttribute\('data-site-studio-editing'\) === 'true'\) return;[\s\S]*?input\.focus\(\)/);
});

test('terminal navigation commands use the dedicated about copy and scroll to every matching section', function () {
  assert.match(
    script,
    /var terminalSectionTargets = \{[\s\S]*?home:\s*'hero'[\s\S]*?projects:\s*'projects'[\s\S]*?resume:\s*'resume'[\s\S]*?contact:\s*'contact'/
  );
  assert.doesNotMatch(script, /terminalSectionTargets\s*=\s*\{[^}]*about:\s*'about'/);
  assert.match(script, /Hey！我是岁安，一个游走在数据与代码之间的探索者。\\n/);
  assert.match(script, /这个网站是我在数字世界的「存档点」，可以随便逛逛~/);
  assert.match(script, /cmd === 'about'\)[\s\S]*?addLine\(terminalAboutCopy, 'output'\)/);
  assert.match(script, /document\.getElementById\(terminalSectionTargets\[cmd\]\)/);
  assert.match(script, /targetSection\.scrollIntoView\(\{ behavior: smoothScroll \? 'smooth' : 'auto' \}\)/);
});

test('global Enter shortcut leaves studio summaries and controls to their native keyboard behavior', function () {
  assert.match(script, /siteStudioPanel[\s\S]*?contains\(e\.target\)[\s\S]*?return/);
  assert.match(script, /matches\('button, a, input, select, textarea, summary, \[contenteditable\]'\)/);
});

test('editing text preserves decorative nodes and marks generated language parts as size-neutral', function () {
  const title = editable('hero.subtitle', '身份介绍', '> Data Analyst');
  const cursor = createElement('span', { 'data-edit-preserve': 'true' });
  cursor.className = 'cursor';
  title.appendChild(cursor);
  const doc = createDocument([title]);
  const controller = api.createController(doc, null);
  controller.setText('hero.subtitle', '> AI 产品经理');
  assert.equal(title.children.includes(cursor), true);
  assert.equal(title.children.filter(function (child) {
    return child.getAttribute && child.getAttribute('data-studio-text-part') === 'true';
  }).length > 0, true);
  controller.resetItem('hero.subtitle');
  assert.equal(title.children.some(function (child) { return child.className === 'cursor'; }), true);
  assert.match(css, /\[data-edit-key\] \[data-studio-text-part\][^{]*\{[^}]*font-size:\s*inherit/);
});

test('registry refresh keeps the original source template for an already edited element', function () {
  const title = editable('hero.subtitle', '身份介绍', '> Data Analyst');
  title.textContent = '';
  const originalText = createElement('span', {}, '> Data Analyst');
  originalText.className = 'original-text';
  const cursor = createElement('span', { 'data-edit-preserve': 'true' });
  cursor.className = 'cursor';
  title.appendChild(originalText);
  title.appendChild(cursor);
  const doc = createDocument([title]);
  const controller = api.createController(doc, null);
  controller.setText('hero.subtitle', '> AI 产品经理');
  controller.refreshRegistry();
  controller.resetItem('hero.subtitle');
  assert.equal(title.children[0].className, 'original-text');
  assert.equal(title.children[1].className, 'cursor');
});

test('controller refreshes replaced dynamic elements without dropping existing drafts', function () {
  const first = editable('hero.title', '姓名', '岁安');
  const editables = [first];
  const doc = createDocument(editables);
  const controller = api.createController(doc, null);
  controller.setText('hero.title', '新名字');

  const replacement = editable('hero.title', '姓名', '岁安');
  const dynamic = editable('projects.dynamic.title', '动态项目标题', '新项目');
  editables.splice(0, editables.length, replacement, dynamic);
  controller.refreshRegistry();

  assert.equal(controller.getElement('hero.title'), replacement);
  assert.equal(replacement.textContent, '新名字');
  assert.equal(controller.setText('projects.dynamic.title', '动态项目'), true);
  assert.equal(controller.getDraft().text['hero.title'], '新名字');
  assert.equal(controller.getDraft().text['projects.dynamic.title'], '动态项目');
});

test('open sidebar rebuilds labels and removes stale controls after same-key DOM replacement', function () {
  const harness = createPanelHarness(null);
  harness.toggle.fire('click');
  const replacement = editable('hero.title', '更新后的姓名标签', '岁安');
  harness.editables.splice(0, harness.editables.length, replacement, harness.aboutIntro, harness.terminalInput);
  harness.doc.fire('click', {
    target: replacement,
    preventDefault: function () {},
    stopPropagation: function () {}
  });
  const titleControl = harness.sections.querySelector('[data-studio-item-control="hero.title"]');
  assert.equal(titleControl.querySelector('.site-studio-item-label').textContent, '更新后的姓名标签');
  assert.equal(harness.sections.querySelector('[data-studio-item-control="hero.subtitle"]'), null);
});

test('reopening returns to the panel top when the previously selected item disappeared', function () {
  const harness = createPanelHarness(null);
  harness.toggle.fire('click');
  harness.doc.fire('click', {
    target: harness.heroSubtitle,
    preventDefault: function () {},
    stopPropagation: function () {}
  });
  harness.panel.scrollTop = 240;
  harness.close.fire('click');
  const removedIndex = harness.editables.indexOf(harness.heroSubtitle);
  harness.editables.splice(removedIndex, 1);
  harness.toggle.fire('click');
  assert.equal(harness.controller.getDraft().ui.selectedKey, null);
  assert.equal(harness.panel.scrollTop, 0);
});

test('all terminal command copy uses fixed Zpix at 15px', function () {
  assert.match(html, /terminal-line terminal-command-line/);
  assert.match(script, /line\.className = 'terminal-line terminal-command-line'/);
  assert.match(css, /\.terminal-command-line[\s\S]*?font-family:\s*'Zpix',\s*monospace\s*!important;[\s\S]*?font-size:\s*15px\s*!important;/);
  assert.match(css, /\.terminal-command-line \[data-edit-key\][\s\S]*?font-family:\s*'Zpix',\s*monospace\s*!important;[\s\S]*?font-size:\s*15px\s*!important;/);
});

test('studio CSS applies per-item scaling, font presets and selected states', function () {
  assert.match(css, /\[data-edit-key\][\s\S]*--studio-item-scale:\s*1/);
  assert.match(css, /font-size:\s*calc\([^;]+var\(--studio-item-scale, 1\)\)/);
  assert.match(css, /\[data-edit-key\]\[data-studio-font="code"\]/);
  assert.match(css, /\[data-edit-key\]\[data-studio-bold="true"\][^{]*\{[^}]*font-weight:\s*700/);
  assert.match(css, /\[data-edit-key\]\[data-studio-italic="true"\][^{]*\{[^}]*font-style:\s*italic/);
  assert.match(css, /\[data-edit-key\]\[data-studio-selected="true"\]/);
  assert.doesNotMatch(css, /\[data-studio-section\][\s\S]{0,400}--studio-text-scale/);
  assert.doesNotMatch(css, /\.project-icon\s*\{[^}]*--studio-item-scale/);
});

test('Chinese Hero title font presets override the default Zpix rule', function () {
  assert.match(css, /\[data-edit-key\]\[data-studio-font="terminal"\][^{]*\{[^}]*font-family:[^}]*Microsoft YaHei/);
  assert.match(css, /\[data-edit-key\]\[data-studio-font="arcade"\][^{]*\{[^}]*font-family:[^}]*SimHei/);
  assert.match(css, /\[data-edit-key\]\[data-studio-font="code"\][^{]*\{[^}]*font-family:[^}]*FangSong/);
});

test('selected text highlight preserves gradient-backed text such as the site brand', function () {
  const selectedRule = css.match(/html\[data-site-studio-editing="true"\] \[data-edit-key\]\[data-studio-selected="true"\]\s*\{([^}]*)\}/);
  assert.ok(selectedRule);
  assert.doesNotMatch(selectedRule[1], /\bbackground(?:-color)?\s*:/);
  assert.match(selectedRule[1], /box-shadow\s*:/);
});

test('mobile typography and panel keep each item scale reachable', function () {
  assert.match(css, /\.hero-title\s*\{[^}]*var\(--studio-item-scale, 1\)/);
  assert.match(css, /\.nav-link\s*\{[^}]*var\(--studio-item-scale, 1\)/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.site-studio-panel/);
});

test('public page loads config runtime after dynamic rendering and keeps normal regressions', function () {
  assert.match(html, /<script src="js\/site-config\.js"><\/script>/);
  assert.match(html, /<script src="js\/site-runtime\.js"><\/script>\s*<script src="js\/floating-clawd\.js"><\/script>\s*<script src="js\/script\.js"><\/script>/);
  assert.match(script, /window\.addEventListener\('scroll', avatar\.onScroll, \{ passive: true \}\)/);
  assert.match(script, /speed = GAME_CONFIG\.startSpeed/);
  assert.match(script, /speed = Math\.min\(GAME_CONFIG\.maxSpeed, speed \+ GAME_CONFIG\.speedStep\)/);
  assert.doesNotMatch(html, /id="terminalInput"[^>]*autofocus/);
  assert.doesNotMatch(studioScript, /contenteditable/);
});

test('the terminal game character floats through the page background without blocking interaction', function () {
  assert.match(html, /<canvas class="floating-clawd-canvas" id="floatingClawd" aria-hidden="true"><\/canvas>/);
  assert.match(html, /<script src="js\/floating-clawd\.js"><\/script>\s*<script src="js\/script\.js"><\/script>/);
  assert.match(script, /initParticles\(\);\s*if \(window\.FloatingClawd\) window\.FloatingClawd\.init\(\);/);
  assert.match(floatingScript, /function init\(options\)/);
  assert.match(floatingScript, /prefers-reduced-motion: reduce/);
  assert.match(floatingScript, /COLLISION_SELECTOR/);
  assert.match(floatingScript, /addEventListener\('mousemove', handlePointerMove/);
  assert.match(floatingScript, /collideWithPointer\(now\)/);
  assert.match(floatingScript, /sideLaneGeometry\(/);
  assert.match(floatingScript, /wrapAcrossViewport\(/);
  assert.match(css, /\.floating-clawd-canvas\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*-1;[^}]*pointer-events:\s*none;/);
  assert.doesNotMatch(css, /floating-clawd-hit|clawd-impact-flash/);
});

test('mini game uses distance-based obstacle pacing instead of fixed-frame spawning', function () {
  assert.doesNotMatch(script, /frame % 60/);
  assert.match(script, /firstObstacleX\(W\)/);
  assert.match(script, /canSpawnObstacle\(W, latest\.x, obstacles\.length, nextObstacleGap\)/);
  assert.match(script, /obstacleGap\(Math\.random\(\)\)/);
  assert.match(script, /gameBehaviors\.isSequencePlayable\(sequence, speed, GAME_CONFIG\)/);
  assert.match(script, /gameBehaviors\.isSequenceUnlocked\(sequence, speed, frame\)/);
});

test('mini game reads its slower jump physics from shared configuration', function () {
  assert.match(script, /var RISE_GRAVITY = GAME_CONFIG\.riseGravity, FALL_GRAVITY = GAME_CONFIG\.fallGravity;/);
  assert.match(script, /var nextVelocity = monster\.vy \+ \(monster\.vy < 0 \? RISE_GRAVITY : FALL_GRAVITY\);/);
  assert.match(script, /var HANG_FRAMES = Number\(GAME_CONFIG\.hangFrames\) \|\| 0;/);
  assert.match(script, /monster\.hangTimer = HANG_FRAMES;/);
  assert.match(script, /var ANTICIPATION_FRAMES = GAME_CONFIG\.anticipationFrames;/);
});
