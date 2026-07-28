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
