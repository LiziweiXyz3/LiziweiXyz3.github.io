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
    getPropertyValue: function (name) { return values[name] || ''; }
  };
}

function createElement(attributes, text) {
  const attrs = Object.assign(Object.create(null), attributes || {});
  const listeners = Object.create(null);
  return {
    attributes: attrs,
    style: createStyle(),
    textContent: text || '',
    hidden: false,
    focused: false,
    getAttribute: function (name) { return Object.hasOwn(attrs, name) ? attrs[name] : null; },
    setAttribute: function (name, value) { attrs[name] = String(value); },
    removeAttribute: function (name) { delete attrs[name]; },
    addEventListener: function (name, listener) { listeners[name] = listener; },
    fire: function (name, event) { if (listeners[name]) listeners[name](event || { target: this, preventDefault: function () {} }); },
    contains: function (target) { return target === this; },
    focus: function () { this.focused = true; }
  };
}

function createStudioHarness(savedValue) {
  const hero = createElement({ 'data-studio-section': 'hero' });
  const about = createElement({ 'data-studio-section': 'about' });
  const heroTitle = createElement({ 'data-edit-key': 'hero.title' }, '岁安');
  const aboutIntro = createElement({ 'data-edit-key': 'about.intro' }, '原始介绍');
  const writes = [];
  const doc = {
    querySelectorAll: function (selector) {
      if (selector === '[data-studio-section]') return [hero, about];
      if (selector === '[data-edit-key]') return [heroTitle, aboutIntro];
      return [];
    }
  };
  const storage = {
    getItem: function () { return savedValue == null ? null : String(savedValue); },
    setItem: function (key, value) { writes.push([key, value]); }
  };
  return { doc, storage, hero, about, heroTitle, aboutIntro, writes };
}

test('normalizeDraft rejects malformed data and keeps valid scoped values', function () {
  assert.deepEqual(api.normalizeDraft('{bad json'), api.createEmptyDraft());

  const draft = api.normalizeDraft(JSON.stringify({
    version: 1,
    sections: {
      hero: { font: 'terminal', scale: 115 },
      unexpected: { font: 'code', scale: 100 }
    },
    text: { 'hero.title': '新的标题', oversized: 'x'.repeat(5001) }
  }));

  assert.deepEqual(draft.sections.hero, { font: 'terminal', scale: 115 });
  assert.equal(draft.sections.unexpected, undefined);
  assert.equal(draft.text['hero.title'], '新的标题');
  assert.equal(draft.text.oversized, undefined);
});

test('controller restores safe text and independent section typography from storage', function () {
  const savedDraft = JSON.stringify({
    version: 1,
    sections: { hero: { font: 'terminal', scale: 115 } },
    text: { 'hero.title': '新的标题' }
  });
  const harness = createStudioHarness(savedDraft);
  const controller = api.createController(harness.doc, harness.storage);

  assert.equal(harness.heroTitle.textContent, '新的标题');
  assert.equal(harness.hero.getAttribute('data-studio-font'), 'terminal');
  assert.equal(harness.hero.style.getPropertyValue('--studio-text-scale'), '1.15');
  assert.equal(harness.about.getAttribute('data-studio-font'), 'classic');
  assert.equal(harness.about.style.getPropertyValue('--studio-text-scale'), '1');
  assert.equal(controller.getDraft().text['hero.title'], '新的标题');
});

test('page loads the studio controller after dynamic page rendering', function () {
  assert.match(html, /<script src="js\/script\.js"><\/script>\s*<script src="js\/site-studio\.js"><\/script>/);
});

test('page exposes an initially closed accessible site studio panel', function () {
  assert.match(html, /id="siteStudioToggle"[\s\S]*aria-controls="siteStudioPanel"/);
  assert.match(html, /id="siteStudioPanel"[^>]*hidden/);
  assert.match(html, /value="classic"[\s\S]*value="terminal"[\s\S]*value="arcade"[\s\S]*value="code"/);
  assert.match(html, /<details class="site-studio-section-control" data-studio-control="nav">/);
});

test('studio styles scope font choices and text scaling without sizing visual assets', function () {
  assert.match(css, /\[data-studio-font="code"\][\s\S]*--studio-font-en-body:\s*var\(--font-code\)/);
  assert.match(css, /--studio-text-scale:\s*1/);
  assert.match(css, /--type-body:\s*calc\(var\(--base-type-body\) \* var\(--studio-text-scale, 1\)\)/);
  assert.doesNotMatch(css, /\.project-icon[\s\S]*var\(--studio-text-scale/);
});

test('inline edits persist plain text without accepting markup', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);

  controller.setText('hero.title', '<b>岁安</b>');

  assert.equal(harness.heroTitle.textContent, '<b>岁安</b>');
  assert.equal(JSON.parse(harness.writes.at(-1)[1]).text['hero.title'], '<b>岁安</b>');
});

test('section controls persist independently and reset only their own defaults', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);

  controller.setSection('hero', 'code', 125);
  controller.setSection('about', 'arcade', 90);
  controller.resetSection('hero');

  assert.equal(controller.getDraft().sections.hero, undefined);
  assert.deepEqual(controller.getDraft().sections.about, { font: 'arcade', scale: 90 });
  assert.equal(harness.hero.getAttribute('data-studio-font'), 'classic');
  assert.equal(harness.about.getAttribute('data-studio-font'), 'arcade');
});

test('resetAll clears only the temporary studio draft', function () {
  const harness = createStudioHarness(null);
  const controller = api.createController(harness.doc, harness.storage);

  controller.setText('hero.title', '草稿标题');
  controller.setSection('hero', 'terminal', 110);
  controller.resetAll();

  assert.deepEqual(controller.getDraft(), api.createEmptyDraft());
  assert.equal(harness.heroTitle.textContent, '岁安');
  assert.equal(harness.hero.getAttribute('data-studio-font'), 'classic');
});

test('panel controls open, edit, close outside and restore focus to the trigger', function () {
  const hero = createElement({ 'data-studio-section': 'hero' });
  const heroTitle = createElement({ 'data-edit-key': 'hero.title' }, '岁安');
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
      if (selector === '[data-edit-key]') return [heroTitle];
      if (selector === '[data-studio-control]') return [group];
      return [];
    },
    addEventListener: function (name, listener) { listeners[name] = listener; },
    fire: function (name, event) { listeners[name](event); }
  };
  const storage = { getItem: function () { return null; }, setItem: function () {} };
  const controller = api.createController(doc, storage);
  api.bindPanel(doc, controller);

  toggle.fire('click');
  assert.equal(panel.hidden, false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');

  editMode.checked = true;
  editMode.fire('change');
  assert.equal(heroTitle.getAttribute('contenteditable'), 'plaintext-only');
  assert.equal(root.getAttribute('data-site-studio-editing'), 'true');

  font.value = 'code';
  scale.value = '125';
  scale.fire('input');
  assert.equal(hero.getAttribute('data-studio-font'), 'code');
  assert.equal(output.textContent, '125%');

  editMode.checked = false;
  editMode.fire('change');
  doc.fire('click', { target: createElement() });
  assert.equal(panel.hidden, true);
  assert.equal(toggle.focused, true);

  toggle.fire('click');
  doc.fire('keydown', { key: 'Escape' });
  assert.equal(panel.hidden, true);
});

test('all site regions expose stable edit keys and the studio uses contenteditable only in edit mode', function () {
  assert.match(html, /data-edit-key="nav\.brand"/);
  assert.match(html, /data-edit-key="projects\.subtitle"/);
  assert.match(html, /data-edit-key="footer\.gameover"/);
  assert.match(script, /setEditKey\(heroTitle, 'hero\.title'/);
  assert.match(script, /setEditKey\(titleCn, 'projects\.' \+ proj\.id \+ '\.title'/);
  assert.match(script, /setEditKey\(field, 'resume\.' \+ index \+ '\.desc'/);
  assert.match(studioScript, /contenteditable.*plaintext-only/);
  assert.match(studioScript, /function bindPanel\(/);
  assert.match(script, /data-site-studio-editing'\) === 'true'/);
  assert.match(script, /\[contenteditable\]/);
});

test('avatar scroll controls and mini game stay playable by default', function () {
  assert.match(html, /<script src="js\/site-behaviors\.js"><\/script>\s*<script src="js\/script\.js">/);
  assert.match(script, /window\.addEventListener\('scroll', avatar\.onScroll, \{ passive: true \}\)/);
  assert.match(script, /speed = GAME_CONFIG\.startSpeed/);
  assert.match(script, /speed = Math\.min\(GAME_CONFIG\.maxSpeed, speed \+ GAME_CONFIG\.speedStep\)/);
  assert.doesNotMatch(html, /id="terminalInput"[^>]*autofocus/);
});
