const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../js/site-studio.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'stylesheet.css'), 'utf8');

function createStyle() {
  const values = Object.create(null);
  return {
    setProperty: function (name, value) { values[name] = String(value); },
    getPropertyValue: function (name) { return values[name] || ''; }
  };
}

function createElement(attributes, text) {
  const attrs = Object.assign(Object.create(null), attributes || {});
  return {
    attributes: attrs,
    style: createStyle(),
    textContent: text || '',
    getAttribute: function (name) { return Object.hasOwn(attrs, name) ? attrs[name] : null; },
    setAttribute: function (name, value) { attrs[name] = String(value); },
    removeAttribute: function (name) { delete attrs[name]; }
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
});

test('studio styles scope font choices and text scaling without sizing visual assets', function () {
  assert.match(css, /\[data-studio-font="code"\][\s\S]*--studio-font-en-body:\s*var\(--font-code\)/);
  assert.match(css, /--studio-text-scale:\s*1/);
  assert.match(css, /--type-body:\s*calc\(var\(--base-type-body\) \* var\(--studio-text-scale, 1\)\)/);
  assert.doesNotMatch(css, /\.project-icon[\s\S]*var\(--studio-text-scale/);
});
