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
