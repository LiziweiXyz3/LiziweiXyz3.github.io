(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SiteStudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CONFIG = Object.freeze({
    storageKey: 'personal-site-studio-draft',
    version: 1,
    sections: ['nav', 'hero', 'about', 'projects', 'resume', 'terminal', 'footer'],
    presets: ['classic', 'terminal', 'arcade', 'code'],
    minScale: 80,
    maxScale: 140,
    step: 5,
    defaultScale: 100,
    maxTextLength: 5000
  });

  function createEmptyDraft() {
    return { version: CONFIG.version, sections: {}, text: {} };
  }

  function has(list, value) {
    return list.indexOf(value) >= 0;
  }

  function isValidScale(value) {
    return Number.isInteger(value) && value >= CONFIG.minScale && value <= CONFIG.maxScale &&
      (value - CONFIG.minScale) % CONFIG.step === 0;
  }

  function normalizeSection(value) {
    var font = value && has(CONFIG.presets, value.font) ? value.font : 'classic';
    var scale = Number(value && value.scale);
    return { font: font, scale: isValidScale(scale) ? scale : CONFIG.defaultScale };
  }

  function parseDraft(value) {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch (error) { return null; }
    }
    return value && typeof value === 'object' ? value : null;
  }

  function normalizeDraft(value) {
    var parsed = parseDraft(value);
    var draft = createEmptyDraft();
    if (!parsed || parsed.version !== CONFIG.version) return draft;

    var sections = parsed.sections && typeof parsed.sections === 'object' ? parsed.sections : {};
    CONFIG.sections.forEach(function (section) {
      if (Object.prototype.hasOwnProperty.call(sections, section)) {
        draft.sections[section] = normalizeSection(sections[section]);
      }
    });

    var text = parsed.text && typeof parsed.text === 'object' ? parsed.text : {};
    Object.keys(text).forEach(function (key) {
      if (key.length > 0 && key.length <= 120 && typeof text[key] === 'string' && text[key].length <= CONFIG.maxTextLength) {
        draft.text[key] = text[key];
      }
    });
    return draft;
  }

  function cloneDraft(draft) {
    return normalizeDraft({ version: CONFIG.version, sections: draft.sections, text: draft.text });
  }

  function getStorage(storage) {
    if (storage) return storage;
    if (typeof window === 'undefined') return null;
    try { return window.localStorage; } catch (error) { return null; }
  }

  function getSectionSetting(draft, name) {
    return draft.sections[name] || { font: 'classic', scale: CONFIG.defaultScale };
  }

  function applySection(element, setting) {
    if (!element) return;
    element.setAttribute('data-studio-font', setting.font);
    element.style.setProperty('--studio-text-scale', String(setting.scale / 100));
  }

  function applyDraft(doc, draft) {
    if (!doc || !doc.querySelectorAll) return;
    var sections = doc.querySelectorAll('[data-studio-section]');
    sections.forEach(function (element) {
      var name = element.getAttribute('data-studio-section');
      applySection(element, getSectionSetting(draft, name));
    });
    var textNodes = doc.querySelectorAll('[data-edit-key]');
    textNodes.forEach(function (element) {
      var key = element.getAttribute('data-edit-key');
      if (Object.prototype.hasOwnProperty.call(draft.text, key)) element.textContent = draft.text[key];
    });
  }

  function createController(doc, storage) {
    if (!doc) {
      if (typeof document === 'undefined') return null;
      doc = document;
    }
    storage = getStorage(storage);
    var saved = null;
    if (storage) {
      try { saved = storage.getItem(CONFIG.storageKey); } catch (error) { saved = null; }
    }
    var draft = normalizeDraft(saved);
    applyDraft(doc, draft);

    return {
      getDraft: function () { return cloneDraft(draft); }
    };
  }

  return {
    CONFIG: CONFIG,
    createEmptyDraft: createEmptyDraft,
    normalizeDraft: normalizeDraft,
    createController: createController
  };
});
