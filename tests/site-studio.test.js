const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../js/site-studio.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'stylesheet.css'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'script.js'), 'utf8');
const studioScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-studio.js'), 'utf8');

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
  Object.defineProperty(element, 'firstChild', {
    configurable: true,
    get: function () { return children[0] || null; }
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
  const ids = {
    siteStudioToggle: toggle,
    siteStudioPanel: panel,
    siteStudioClose: close,
    siteStudioSections: sections,
    siteStudioResetAll: resetAll
  };
  const doc = createDocument(base.editables, ids);
  base.doc = doc;
  const controller = api.createController(doc, base.storage);
  api.bindPanel(doc, controller);
  return Object.assign(base, {
    doc, controller, toggle, panel, close, sections, resetAll,
    root: doc.documentElement,
    outside: createElement('div')
  });
}

test('normalizes V2 text styles and UI state against known edit keys', function () {
  const draft = api.normalizeDraft({
    version: 2,
    text: { 'hero.title': '', unknown: 'drop me' },
    textStyles: {
      'hero.title': { font: 'terminal', scale: 120 },
      'hero.subtitle': { font: 'invalid', scale: 103 }
    },
    ui: { selectedKey: 'hero.title', openSections: ['hero', 'unknown', 'hero'] }
  }, ['hero.title', 'hero.subtitle']);

  assert.equal(draft.text['hero.title'], '');
  assert.equal(draft.text.unknown, undefined);
  assert.deepEqual(draft.textStyles['hero.title'], { font: 'terminal', scale: 120 });
  assert.deepEqual(draft.textStyles['hero.subtitle'], { font: 'classic', scale: 100 });
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
  assert.deepEqual(normalized.textStyles['hero.title'], { font: 'code', scale: 125 });
  assert.deepEqual(normalized.textStyles['hero.subtitle'], { font: 'code', scale: 125 });
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

test('applies font and scale independently to sibling Hero text', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);
  controller.setTextStyle('hero.title', 'arcade', 90);
  controller.setTextStyle('hero.subtitle', 'terminal', 125);
  assert.equal(harness.heroTitle.getAttribute('data-studio-font'), 'arcade');
  assert.equal(harness.heroTitle.style.getPropertyValue('--studio-item-scale'), '0.9');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-font'), 'terminal');
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
  assert.deepEqual(controller.getDraft().textStyles['hero.subtitle'], { font: 'terminal', scale: 120 });

  controller.resetSection('hero');
  assert.equal(controller.getDraft().textStyles['hero.subtitle'], undefined);
  assert.deepEqual(controller.getDraft().textStyles['about.intro'], { font: 'arcade', scale: 90 });

  controller.resetAll();
  assert.deepEqual(controller.getDraft(), api.createEmptyDraft());
});

test('page provides a generated sidebar mount instead of section-wide controls', function () {
  assert.match(html, /id="siteStudioSections"/);
  assert.doesNotMatch(html, /id="siteStudioEditMode"/);
  assert.doesNotMatch(html, /data-studio-font-control/);
});

test('static and dynamic edit keys expose human-readable sidebar metadata', function () {
  assert.match(html, /data-edit-key="nav\.brand"[^>]*data-edit-label="站点名称"/);
  assert.match(html, /data-edit-key="hero\.scrollHint"[^>]*data-edit-label="下滑提示"/);
  assert.match(html, /data-edit-key="terminal\.inputPlaceholder"[^>]*data-edit-label="输入框提示"/);
  assert.match(script, /setEditKey\(heroTitle, 'hero\.title', user\.name, '姓名'/);
  assert.match(script, /setEditKey\(heroDesc, 'hero\.description',[\s\S]*?'个人简介', true\)/);
  assert.match(script, /proj\.title \+ ' · 项目介绍'/);
  assert.match(script, /'第 ' \+ \(index \+ 1\) \+ ' 段经历 · 描述'/);
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
  textInput.value = '> AI Product Manager';
  textInput.fire('input');
  font.value = 'code';
  font.fire('change');
  scale.value = '130';
  scale.fire('input');

  assert.equal(harness.heroSubtitle.textContent, '> AI Product Manager');
  assert.equal(harness.heroSubtitle.getAttribute('data-studio-font'), 'code');
  assert.equal(harness.heroSubtitle.style.getPropertyValue('--studio-item-scale'), '1.3');
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
  harness.heroSubtitle.fire('click', {
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

test('studio CSS applies per-item scaling, font presets and selected states', function () {
  assert.match(css, /\[data-edit-key\][\s\S]*--studio-item-scale:\s*1/);
  assert.match(css, /font-size:\s*calc\([^;]+var\(--studio-item-scale, 1\)\)/);
  assert.match(css, /\[data-edit-key\]\[data-studio-font="code"\]/);
  assert.match(css, /\[data-edit-key\]\[data-studio-selected="true"\]/);
  assert.doesNotMatch(css, /\[data-studio-section\][\s\S]{0,400}--studio-text-scale/);
  assert.doesNotMatch(css, /\.project-icon\s*\{[^}]*--studio-item-scale/);
});

test('mobile typography and panel keep each item scale reachable', function () {
  assert.match(css, /\.hero-title\s*\{[^}]*var\(--studio-item-scale, 1\)/);
  assert.match(css, /\.nav-link\s*\{[^}]*var\(--studio-item-scale, 1\)/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.site-studio-panel/);
});

test('page still loads controller after dynamic rendering and keeps normal regressions', function () {
  assert.match(html, /<script src="js\/script\.js"><\/script>\s*<script src="js\/site-studio\.js"><\/script>/);
  assert.match(script, /window\.addEventListener\('scroll', avatar\.onScroll, \{ passive: true \}\)/);
  assert.match(script, /speed = GAME_CONFIG\.startSpeed/);
  assert.match(script, /speed = Math\.min\(GAME_CONFIG\.maxSpeed, speed \+ GAME_CONFIG\.speedStep\)/);
  assert.doesNotMatch(html, /id="terminalInput"[^>]*autofocus/);
  assert.doesNotMatch(studioScript, /contenteditable/);
});
