(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SiteStudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CONFIG = Object.freeze({
    storageKey: 'personal-site-studio-draft',
    version: 2,
    sections: ['nav', 'hero', 'about', 'projects', 'resume', 'terminal', 'footer'],
    presets: ['classic', 'terminal', 'arcade', 'code'],
    minScale: 80,
    maxScale: 140,
    step: 5,
    defaultScale: 100,
    maxTextLength: 5000
  });

  var SECTION_LABELS = Object.freeze({
    nav: '导航',
    hero: 'Hero',
    about: 'About',
    projects: 'Projects',
    resume: 'Resume',
    terminal: 'Terminal',
    footer: '页脚'
  });

  var FONT_LABELS = Object.freeze({
    classic: '经典像素',
    terminal: '清晰终端',
    arcade: '硬核街机',
    code: '代码等宽'
  });

  function createEmptyDraft() {
    return {
      version: CONFIG.version,
      text: {},
      textStyles: {},
      ui: { selectedKey: null, openSections: [] }
    };
  }

  function has(list, value) {
    return list.indexOf(value) >= 0;
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function isValidScale(value) {
    return Number.isInteger(value) && value >= CONFIG.minScale && value <= CONFIG.maxScale &&
      (value - CONFIG.minScale) % CONFIG.step === 0;
  }

  function sectionFromKey(key) {
    var section = String(key || '').split('.')[0];
    return has(CONFIG.sections, section) ? section : null;
  }

  function normalizeTextStyle(value) {
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

  function uniqueKnownKeys(knownKeys) {
    var result = [];
    (knownKeys || []).forEach(function (key) {
      if (typeof key === 'string' && key.length > 0 && key.length <= 120 && result.indexOf(key) < 0) {
        result.push(key);
      }
    });
    return result;
  }

  function normalizeDraft(value, knownKeys) {
    var parsed = parseDraft(value);
    var draft = createEmptyDraft();
    var keys = uniqueKnownKeys(knownKeys);
    if (!parsed || (parsed.version !== 1 && parsed.version !== CONFIG.version)) return draft;

    var text = parsed.text && typeof parsed.text === 'object' ? parsed.text : {};
    keys.forEach(function (key) {
      if (typeof text[key] === 'string' && text[key].length <= CONFIG.maxTextLength) {
        draft.text[key] = text[key];
      }
    });

    if (parsed.version === 1) {
      var sections = parsed.sections && typeof parsed.sections === 'object' ? parsed.sections : {};
      keys.forEach(function (key) {
        var section = sectionFromKey(key);
        if (section && hasOwn(sections, section)) {
          draft.textStyles[key] = normalizeTextStyle(sections[section]);
        }
      });
      return draft;
    }

    var textStyles = parsed.textStyles && typeof parsed.textStyles === 'object' ? parsed.textStyles : {};
    keys.forEach(function (key) {
      if (hasOwn(textStyles, key) && textStyles[key] && typeof textStyles[key] === 'object') {
        draft.textStyles[key] = normalizeTextStyle(textStyles[key]);
      }
    });

    var ui = parsed.ui && typeof parsed.ui === 'object' ? parsed.ui : {};
    draft.ui.selectedKey = has(keys, ui.selectedKey) ? ui.selectedKey : null;
    var openSections = Array.isArray(ui.openSections) ? ui.openSections : [];
    openSections.forEach(function (section) {
      if (has(CONFIG.sections, section) && !has(draft.ui.openSections, section)) {
        draft.ui.openSections.push(section);
      }
    });
    return draft;
  }

  function cloneDraft(draft, knownKeys) {
    return normalizeDraft({
      version: CONFIG.version,
      text: draft.text,
      textStyles: draft.textStyles,
      ui: draft.ui
    }, knownKeys);
  }

  function getStorage(storage) {
    if (storage) return storage;
    if (typeof window === 'undefined') return null;
    try { return window.localStorage; } catch (error) { return null; }
  }

  function getTextElements(doc) {
    return doc && doc.querySelectorAll
      ? Array.prototype.slice.call(doc.querySelectorAll('[data-edit-key]'))
      : [];
  }

  function getEditableText(element) {
    if (element.getAttribute('data-edit-attribute') === 'placeholder') {
      return element.getAttribute('placeholder') || '';
    }
    return element.textContent || '';
  }

  function clearElement(element) {
    while (element && element.firstChild) element.removeChild(element.firstChild);
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
    var englishClass = element.getAttribute('data-edit-english-class') || 'text-en-body';
    splitTextByLanguage(text).forEach(function (part) {
      var span = doc.createElement('span');
      span.lang = part.lang;
      span.className = part.lang === 'zh-CN' ? 'text-cn' : englishClass;
      span.textContent = part.text;
      element.appendChild(span);
    });
  }

  function applyEditableText(doc, element, text) {
    if (element.getAttribute('data-edit-attribute') === 'placeholder') {
      element.setAttribute('placeholder', text);
      return;
    }
    setPlainText(doc, element, text);
  }

  function clearTextStyle(element) {
    if (!element) return;
    element.removeAttribute('data-studio-font');
    if (element.style && element.style.removeProperty) element.style.removeProperty('--studio-item-scale');
  }

  function applyTextStyle(element, setting) {
    if (!element) return;
    var safe = normalizeTextStyle(setting);
    element.setAttribute('data-studio-font', safe.font);
    if (element.style && element.style.setProperty) {
      element.style.setProperty('--studio-item-scale', String(safe.scale / 100));
    }
  }

  function createController(doc, storage) {
    if (!doc) {
      if (typeof document === 'undefined') return null;
      doc = document;
    }
    var elements = getTextElements(doc);
    var knownKeys = elements.map(function (element) { return element.getAttribute('data-edit-key'); });
    var elementByKey = {};
    var sourceText = {};
    elements.forEach(function (element) {
      var key = element.getAttribute('data-edit-key');
      elementByKey[key] = element;
      var source = element.getAttribute('data-edit-source');
      sourceText[key] = source !== null ? source : getEditableText(element);
    });

    storage = getStorage(storage);
    var saved = null;
    if (storage) {
      try { saved = storage.getItem(CONFIG.storageKey); } catch (error) { saved = null; }
    }
    var parsedSaved = parseDraft(saved);
    var draft = normalizeDraft(parsedSaved, knownKeys);

    function persist() {
      if (!storage) return;
      try { storage.setItem(CONFIG.storageKey, JSON.stringify(draft)); } catch (error) { /* optional */ }
    }

    function applyItem(key, restoreSourceText) {
      var element = elementByKey[key];
      if (!element) return;
      if (hasOwn(draft.text, key)) {
        applyEditableText(doc, element, draft.text[key]);
        element.setAttribute('data-studio-draft-applied', 'true');
      } else if (restoreSourceText) {
        applyEditableText(doc, element, sourceText[key]);
        element.removeAttribute('data-studio-draft-applied');
      }
      if (hasOwn(draft.textStyles, key)) applyTextStyle(element, draft.textStyles[key]);
      else clearTextStyle(element);
    }

    function applyAll(restoreSourceText) {
      knownKeys.forEach(function (key) { applyItem(key, restoreSourceText); });
    }

    function getItemState(key) {
      var element = elementByKey[key];
      if (!element) return null;
      return {
        key: key,
        section: element.getAttribute('data-edit-section') || sectionFromKey(key),
        label: element.getAttribute('data-edit-label') || key,
        multiline: element.getAttribute('data-edit-multiline') === 'true',
        text: getEditableText(element),
        sourceText: sourceText[key],
        style: hasOwn(draft.textStyles, key)
          ? normalizeTextStyle(draft.textStyles[key])
          : { font: 'classic', scale: CONFIG.defaultScale }
      };
    }

    applyAll(false);
    if (parsedSaved && parsedSaved.version === 1) persist();

    return {
      getDraft: function () { return cloneDraft(draft, knownKeys); },
      getItems: function () {
        return knownKeys.map(getItemState).filter(function (item) { return !!item; });
      },
      getElement: function (key) { return elementByKey[key] || null; },
      getItemState: getItemState,
      setText: function (key, text) {
        if (!elementByKey[key] || typeof text !== 'string') return false;
        var safeText = text.slice(0, CONFIG.maxTextLength);
        if (safeText === sourceText[key]) delete draft.text[key];
        else draft.text[key] = safeText;
        applyItem(key, true);
        persist();
        return true;
      },
      setTextStyle: function (key, font, scale) {
        if (!elementByKey[key]) return false;
        var setting = normalizeTextStyle({ font: font, scale: Number(scale) });
        if (setting.font === 'classic' && setting.scale === CONFIG.defaultScale) {
          delete draft.textStyles[key];
        } else {
          draft.textStyles[key] = setting;
        }
        applyItem(key, false);
        persist();
        return true;
      },
      setUi: function (selectedKey, openSections) {
        draft.ui.selectedKey = has(knownKeys, selectedKey) ? selectedKey : null;
        draft.ui.openSections = [];
        (openSections || []).forEach(function (section) {
          if (has(CONFIG.sections, section) && !has(draft.ui.openSections, section)) {
            draft.ui.openSections.push(section);
          }
        });
        persist();
      },
      resetItem: function (key) {
        if (!elementByKey[key]) return false;
        delete draft.text[key];
        delete draft.textStyles[key];
        applyItem(key, true);
        persist();
        return true;
      },
      resetSection: function (name) {
        if (!has(CONFIG.sections, name)) return false;
        knownKeys.forEach(function (key) {
          if (sectionFromKey(key) === name) {
            delete draft.text[key];
            delete draft.textStyles[key];
            applyItem(key, true);
          }
        });
        persist();
        return true;
      },
      resetAll: function () {
        draft = createEmptyDraft();
        applyAll(true);
        if (storage && storage.removeItem) {
          try { storage.removeItem(CONFIG.storageKey); } catch (error) { persist(); }
        } else {
          persist();
        }
      }
    };
  }

  function appendText(doc, parent, text, className) {
    var span = doc.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    parent.appendChild(span);
    return span;
  }

  function truncatePreview(text) {
    var compact = String(text).replace(/\s+/g, ' ').trim();
    return compact.length > 28 ? compact.slice(0, 28) + '…' : compact;
  }

  function bindPanel(doc, controller) {
    if (!doc || !controller || !doc.getElementById || !doc.createElement) return;
    var toggle = doc.getElementById('siteStudioToggle');
    var panel = doc.getElementById('siteStudioPanel');
    var close = doc.getElementById('siteStudioClose');
    var mount = doc.getElementById('siteStudioSections');
    var resetAll = doc.getElementById('siteStudioResetAll');
    if (!toggle || !panel || !close || !mount) return;

    var itemControls = {};
    var sectionControls = {};
    var selectedKey = controller.getDraft().ui.selectedKey;

    function editingIsOpen() {
      return panel.hidden === false;
    }

    function currentOpenSections() {
      return CONFIG.sections.filter(function (section) {
        return sectionControls[section] && sectionControls[section].details.open;
      });
    }

    function saveUi() {
      controller.setUi(selectedKey, currentOpenSections());
    }

    function clearPageSelection() {
      controller.getItems().forEach(function (item) {
        var element = controller.getElement(item.key);
        if (element) element.removeAttribute('data-studio-selected');
      });
    }

    function syncItem(key) {
      var state = controller.getItemState(key);
      var controls = itemControls[key];
      if (!state || !controls) return;
      controls.text.value = state.text;
      controls.font.value = state.style.font;
      controls.scale.value = String(state.style.scale);
      controls.output.textContent = state.style.scale + '%';
      controls.preview.textContent = truncatePreview(state.text) || '（空）';
    }

    function selectItem(key, focusEditor) {
      var controls = itemControls[key];
      var element = controller.getElement(key);
      if (!controls || !element) return false;
      selectedKey = key;
      clearPageSelection();
      element.setAttribute('data-studio-selected', 'true');
      Object.keys(itemControls).forEach(function (itemKey) {
        itemControls[itemKey].details.open = itemKey === key;
      });
      controls.section.open = true;
      saveUi();
      if (focusEditor) {
        if (typeof controls.details.scrollIntoView === 'function') {
          controls.details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        if (typeof controls.text.focus === 'function') controls.text.focus();
      }
      return true;
    }

    function makeFieldLabel(text) {
      var label = doc.createElement('label');
      label.className = 'site-studio-field';
      appendText(doc, label, text, 'site-studio-field-label');
      return label;
    }

    function buildItem(item, sectionDetails) {
      var details = doc.createElement('details');
      details.className = 'site-studio-item-control';
      details.setAttribute('data-studio-item-control', item.key);

      var summary = doc.createElement('summary');
      summary.className = 'site-studio-item-summary';
      appendText(doc, summary, item.label, 'site-studio-item-label');
      var preview = appendText(doc, summary, truncatePreview(item.text) || '（空）', 'site-studio-item-preview');
      details.appendChild(summary);

      var textLabel = makeFieldLabel('文案');
      var textInput = doc.createElement(item.multiline ? 'textarea' : 'input');
      textInput.className = 'site-studio-text-input';
      textInput.setAttribute('data-studio-text-input', '');
      textInput.setAttribute('aria-label', item.label + '文案');
      if (!item.multiline) textInput.setAttribute('type', 'text');
      textInput.value = item.text;
      textLabel.appendChild(textInput);
      details.appendChild(textLabel);

      var fontLabel = makeFieldLabel('字体');
      var font = doc.createElement('select');
      font.setAttribute('data-studio-item-font', '');
      font.setAttribute('aria-label', item.label + '字体');
      CONFIG.presets.forEach(function (preset) {
        var option = doc.createElement('option');
        option.value = preset;
        option.setAttribute('value', preset);
        option.textContent = FONT_LABELS[preset];
        font.appendChild(option);
      });
      font.value = item.style.font;
      fontLabel.appendChild(font);
      details.appendChild(fontLabel);

      var scaleLabel = makeFieldLabel('字号');
      var output = doc.createElement('output');
      output.className = 'site-studio-scale-value';
      output.textContent = item.style.scale + '%';
      scaleLabel.appendChild(output);
      var scale = doc.createElement('input');
      scale.setAttribute('data-studio-item-scale', '');
      scale.setAttribute('aria-label', item.label + '字号');
      scale.setAttribute('type', 'range');
      scale.setAttribute('min', String(CONFIG.minScale));
      scale.setAttribute('max', String(CONFIG.maxScale));
      scale.setAttribute('step', String(CONFIG.step));
      scale.value = String(item.style.scale);
      scaleLabel.appendChild(scale);
      details.appendChild(scaleLabel);

      var reset = doc.createElement('button');
      reset.className = 'site-studio-reset-item';
      reset.setAttribute('type', 'button');
      reset.textContent = '恢复此项默认值';
      details.appendChild(reset);

      itemControls[item.key] = {
        details: details,
        section: sectionDetails,
        preview: preview,
        text: textInput,
        font: font,
        scale: scale,
        output: output
      };

      textInput.addEventListener('input', function () {
        controller.setText(item.key, textInput.value);
        preview.textContent = truncatePreview(textInput.value) || '（空）';
      });
      function saveStyle() {
        controller.setTextStyle(item.key, font.value, Number(scale.value));
        syncItem(item.key);
      }
      font.addEventListener('change', saveStyle);
      scale.addEventListener('input', saveStyle);
      reset.addEventListener('click', function () {
        controller.resetItem(item.key);
        syncItem(item.key);
      });
      details.addEventListener('toggle', function () {
        if (!details.open) return;
        Object.keys(itemControls).forEach(function (key) {
          if (key !== item.key) itemControls[key].details.open = false;
        });
        selectedKey = item.key;
        clearPageSelection();
        var pageElement = controller.getElement(item.key);
        if (pageElement && editingIsOpen()) pageElement.setAttribute('data-studio-selected', 'true');
        saveUi();
      });
      return details;
    }

    function buildSidebar() {
      clearElement(mount);
      itemControls = {};
      sectionControls = {};
      var groups = {};
      controller.getItems().forEach(function (item) {
        if (!groups[item.section]) groups[item.section] = [];
        groups[item.section].push(item);
      });
      var draft = controller.getDraft();
      CONFIG.sections.forEach(function (section) {
        var items = groups[section] || [];
        if (!items.length) return;
        var details = doc.createElement('details');
        details.className = 'site-studio-section-control';
        details.setAttribute('data-studio-section-control', section);
        details.open = has(draft.ui.openSections, section) || sectionFromKey(selectedKey) === section;
        var summary = doc.createElement('summary');
        summary.textContent = SECTION_LABELS[section];
        details.appendChild(summary);
        items.forEach(function (item) { details.appendChild(buildItem(item, details)); });
        var reset = doc.createElement('button');
        reset.className = 'site-studio-reset-section';
        reset.setAttribute('type', 'button');
        reset.textContent = '恢复本模块默认值';
        reset.addEventListener('click', function () {
          controller.resetSection(section);
          items.forEach(function (item) { syncItem(item.key); });
        });
        details.appendChild(reset);
        details.addEventListener('toggle', saveUi);
        sectionControls[section] = { details: details, items: items };
        mount.appendChild(details);
      });
    }

    function setPanelOpen(open, restoreFocus) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (doc.documentElement) {
        doc.documentElement.setAttribute('data-site-studio-editing', String(open));
      }
      if (open) {
        buildSidebar();
        var savedSelected = controller.getDraft().ui.selectedKey;
        if (savedSelected) selectItem(savedSelected, false);
      } else {
        clearPageSelection();
        if (restoreFocus !== false && typeof toggle.focus === 'function') toggle.focus();
      }
    }

    controller.getItems().forEach(function (item) {
      var element = controller.getElement(item.key);
      if (!element) return;
      element.addEventListener('click', function (event) {
        if (!editingIsOpen()) return;
        event.preventDefault();
        event.stopPropagation();
        selectItem(item.key, true);
      });
    });

    toggle.addEventListener('click', function () {
      if (panel.hidden) setPanelOpen(true, false);
    });
    close.addEventListener('click', function () { setPanelOpen(false, true); });
    if (resetAll) {
      resetAll.addEventListener('click', function () {
        controller.resetAll();
        selectedKey = null;
        clearPageSelection();
        buildSidebar();
      });
    }
    setPanelOpen(false, false);
  }

  function init(doc, storage) {
    var controller = createController(doc || (typeof document !== 'undefined' ? document : null), storage);
    if (controller) bindPanel(doc || document, controller);
    return controller;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { init(document); });
    } else {
      init(document);
    }
  }

  return {
    CONFIG: CONFIG,
    createEmptyDraft: createEmptyDraft,
    normalizeDraft: normalizeDraft,
    createController: createController,
    bindPanel: bindPanel,
    splitTextByLanguage: splitTextByLanguage,
    init: init
  };
});
