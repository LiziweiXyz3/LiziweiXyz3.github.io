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

  function getTextElements(doc) {
    return doc && doc.querySelectorAll ? Array.prototype.slice.call(doc.querySelectorAll('[data-edit-key]')) : [];
  }

  function ensureStaticEditKeys(doc) {
    if (!doc || !doc.querySelector) return;
    var registrations = [
      { selector: '.hero-scroll-hint', key: 'hero.scrollHint' },
      { selector: '#statsPanel .about-card-title span[lang="en"]', key: 'about.statsHeading' },
      { selector: '#skillsPanel .about-card-title span[lang="en"]', key: 'about.skillsHeading' }
    ];
    registrations.forEach(function (registration) {
      var element = doc.querySelector(registration.selector);
      if (element && !element.getAttribute('data-edit-key')) element.setAttribute('data-edit-key', registration.key);
    });
  }

  function clearElement(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function splitTextByLanguage(text) {
    var parts = [];
    var current = '';
    var language = 'zh-CN';
    String(text).split('').forEach(function (character) {
      var nextLanguage = language;
      if (/[A-Za-z0-9_+#@&/.-]/.test(character)) nextLanguage = 'en';
      else if (/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(character)) nextLanguage = 'zh-CN';
      if (current && nextLanguage !== language) {
        parts.push({ lang: language, text: current });
        current = '';
      }
      language = nextLanguage;
      current += character;
    });
    if (current) parts.push({ lang: language, text: current });
    return parts;
  }

  function setPlainText(doc, element, text) {
    if (!doc || !doc.createElement || !element || !element.appendChild || !element.removeChild) {
      element.textContent = text;
      return;
    }
    clearElement(element);
    splitTextByLanguage(text).forEach(function (part) {
      var span = doc.createElement('span');
      span.lang = part.lang;
      span.className = part.lang === 'zh-CN' ? 'text-cn' : 'text-en-body';
      span.textContent = part.text;
      element.appendChild(span);
    });
  }

  function applyDraft(doc, draft, sourceText, restoreSourceText) {
    if (!doc || !doc.querySelectorAll) return;
    var sections = doc.querySelectorAll('[data-studio-section]');
    sections.forEach(function (element) {
      var name = element.getAttribute('data-studio-section');
      applySection(element, getSectionSetting(draft, name));
    });
    getTextElements(doc).forEach(function (element) {
      var key = element.getAttribute('data-edit-key');
      if (Object.prototype.hasOwnProperty.call(draft.text, key)) {
        setPlainText(doc, element, draft.text[key]);
        element.setAttribute('data-studio-draft-applied', 'true');
      } else if (restoreSourceText) {
        if (typeof sourceText[key] === 'string') setPlainText(doc, element, sourceText[key]);
        element.removeAttribute('data-studio-draft-applied');
      }
    });
  }

  function createController(doc, storage) {
    if (!doc) {
      if (typeof document === 'undefined') return null;
      doc = document;
    }
    ensureStaticEditKeys(doc);
    storage = getStorage(storage);
    var saved = null;
    if (storage) {
      try { saved = storage.getItem(CONFIG.storageKey); } catch (error) { saved = null; }
    }
    var draft = normalizeDraft(saved);
    var sourceText = {};
    getTextElements(doc).forEach(function (element) {
      var key = element.getAttribute('data-edit-key');
      sourceText[key] = element.getAttribute('data-edit-source') || element.textContent;
    });

    function persist() {
      if (!storage) return;
      try { storage.setItem(CONFIG.storageKey, JSON.stringify(draft)); } catch (error) { /* storage is optional */ }
    }

    function apply(restoreSourceText) {
      applyDraft(doc, draft, sourceText, restoreSourceText);
    }

    function findTextElement(key) {
      return getTextElements(doc).find(function (element) { return element.getAttribute('data-edit-key') === key; }) || null;
    }

    apply(false);

    return {
      getDraft: function () { return cloneDraft(draft); },
      setText: function (key, text) {
        var element = findTextElement(key);
        if (!element || typeof text !== 'string') return false;
        var safeText = text.slice(0, CONFIG.maxTextLength);
        if (safeText === sourceText[key]) delete draft.text[key];
        else draft.text[key] = safeText;
        apply(true);
        persist();
        return true;
      },
      setSection: function (name, font, scale) {
        if (!has(CONFIG.sections, name)) return false;
        draft.sections[name] = normalizeSection({ font: font, scale: scale });
        apply(false);
        persist();
        return true;
      },
      resetSection: function (name) {
        if (!has(CONFIG.sections, name)) return false;
        delete draft.sections[name];
        apply(false);
        persist();
        return true;
      },
      resetAll: function () {
        draft = createEmptyDraft();
        apply(true);
        if (storage && storage.removeItem) {
          try { storage.removeItem(CONFIG.storageKey); } catch (error) { persist(); }
        } else persist();
      }
    };
  }

  function bindPanel(doc, controller) {
    if (!doc || !controller || !doc.getElementById) return;
    var toggle = doc.getElementById('siteStudioToggle');
    var panel = doc.getElementById('siteStudioPanel');
    var close = doc.getElementById('siteStudioClose');
    var editMode = doc.getElementById('siteStudioEditMode');
    var resetAll = doc.getElementById('siteStudioResetAll');
    if (!toggle || !panel || !editMode) return;

    function setPanelOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) syncControls();
    }

    function closePanel() {
      setPanelOpen(false);
      if (typeof toggle.focus === 'function') toggle.focus();
    }

    function syncControls() {
      var draft = controller.getDraft();
      Array.prototype.slice.call(doc.querySelectorAll('[data-studio-control]')).forEach(function (group) {
        var name = group.getAttribute('data-studio-control');
        var setting = getSectionSetting(draft, name);
        var font = group.querySelector('[data-studio-font-control]');
        var scale = group.querySelector('[data-studio-scale-control]');
        var output = group.querySelector('[data-studio-scale-value]');
        if (font) font.value = setting.font;
        if (scale) scale.value = String(setting.scale);
        if (output) output.textContent = setting.scale + '%';
      });
    }

    function setEditMode(enabled) {
      if (doc.documentElement) doc.documentElement.setAttribute('data-site-studio-editing', String(enabled));
      getTextElements(doc).forEach(function (element) {
        if (enabled) {
          element.setAttribute('contenteditable', 'plaintext-only');
          if ('contentEditable' in element && element.contentEditable !== 'plaintext-only') {
            element.setAttribute('contenteditable', 'true');
          }
          element.setAttribute('spellcheck', 'false');
        } else {
          element.removeAttribute('contenteditable');
          element.removeAttribute('spellcheck');
          element.removeAttribute('data-studio-original');
        }
      });
      editMode.checked = enabled;
    }

    toggle.addEventListener('click', function () { setPanelOpen(panel.hidden); });
    if (close) close.addEventListener('click', closePanel);
    editMode.addEventListener('change', function () { setEditMode(editMode.checked); });

    getTextElements(doc).forEach(function (element) {
      element.addEventListener('click', function (event) {
        if (editMode.checked) event.preventDefault();
      });
      element.addEventListener('focus', function () {
        if (editMode.checked) element.setAttribute('data-studio-original', element.textContent);
      });
      element.addEventListener('blur', function () {
        if (editMode.checked) {
          controller.setText(element.getAttribute('data-edit-key'), element.textContent);
          syncControls();
        }
      });
      element.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && editMode.checked) {
          event.preventDefault();
          var original = element.getAttribute('data-studio-original');
          if (original !== null) controller.setText(element.getAttribute('data-edit-key'), original);
          element.blur();
          syncControls();
        }
      });
    });

    Array.prototype.slice.call(doc.querySelectorAll('[data-studio-control]')).forEach(function (group) {
      var name = group.getAttribute('data-studio-control');
      var font = group.querySelector('[data-studio-font-control]');
      var scale = group.querySelector('[data-studio-scale-control]');
      var reset = group.querySelector('[data-studio-reset-section]');
      function saveSetting() {
        controller.setSection(name, font.value, Number(scale.value));
        syncControls();
      }
      if (font) font.addEventListener('change', saveSetting);
      if (scale) scale.addEventListener('input', saveSetting);
      if (reset) reset.addEventListener('click', function () { controller.resetSection(name); syncControls(); });
    });

    if (resetAll) resetAll.addEventListener('click', function () { controller.resetAll(); syncControls(); });
    doc.addEventListener('click', function (event) {
      var target = event.target;
      if (!panel.hidden && (!panel.contains(target) && !toggle.contains(target))) closePanel();
    });
    doc.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && panel.hidden === false && !editMode.checked) closePanel();
    });
    setPanelOpen(false);
    setEditMode(false);
  }

  function init(doc, storage) {
    var controller = createController(doc, storage);
    if (controller) bindPanel(doc || document, controller);
    return controller;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
    else init(document);
  }

  return {
    CONFIG: CONFIG,
    createEmptyDraft: createEmptyDraft,
    normalizeDraft: normalizeDraft,
    createController: createController,
    bindPanel: bindPanel,
    init: init
  };
});
