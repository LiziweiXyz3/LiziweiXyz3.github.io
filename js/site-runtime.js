(function () {
  'use strict';

  var FONT_CN = {
    zpix: "'Zpix', monospace",
    'cubic-11': "'Cubic 11', 'Zpix', monospace",
    'boutique-7x7': "'Boutique Bitmap 7x7', 'Zpix', monospace"
  };
  var FONT_EN = {
    zpix: "'Zpix', monospace",
    'press-start': "'Press Start 2P', monospace",
    vt323: "'VT323', monospace",
    'fira-code': "'Fira Code', monospace",
    'ibm-plex-mono': "'IBM Plex Mono', monospace"
  };
  var GRADIENTS = window.SiteConfig && window.SiteConfig.GRADIENTS || {};
  var COLOR_VARS = {
    bgDeep: '--bg-deep',
    bgSurface: '--bg-surface',
    bgCard: '--bg-card',
    blue: '--blue',
    red: '--red',
    yellow: '--yellow',
    green: '--green',
    terminal: '--terminal',
    purple: '--purple',
    text: '--text',
    textDim: '--text-dim',
    border: '--border'
  };
  var previewMode = new URLSearchParams(window.location.search).get('studio-preview') === '1';
  var selectedKey = null;

  function escapeSelector(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, '\\$&');
  }

  function languageParts(value) {
    if (window.SiteBehaviors && window.SiteBehaviors.splitTextByLanguage) {
      return window.SiteBehaviors.splitTextByLanguage(value);
    }
    var parts = [];
    var current = '';
    var language = 'zh-CN';
    function flush() {
      if (!current) return;
      parts.push({ lang: language, text: current });
      current = '';
    }
    String(value || '').split('').forEach(function (character) {
      var nextLanguage = language;
      if (/[A-Za-z0-9_+#@&/.-]/.test(character)) nextLanguage = 'en';
      else if (/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(character)) nextLanguage = 'zh-CN';
      if (current && nextLanguage !== language) flush();
      language = nextLanguage;
      current += character;
    });
    flush();
    return parts;
  }

  function splitText(element, value) {
    if (!element) return;
    if (element.getAttribute('data-edit-attribute') === 'placeholder') {
      element.setAttribute('placeholder', value);
      return;
    }
    var preserved = Array.prototype.slice.call(element.children || []).filter(function (child) {
      return child.getAttribute && child.getAttribute('data-edit-preserve') === 'true';
    });
    while (element.firstChild) element.removeChild(element.firstChild);
    languageParts(value).forEach(function (part) {
      var span = document.createElement('span');
      span.lang = part.lang;
      span.className = part.lang === 'zh-CN' ? 'text-cn' :
        (element.getAttribute('data-edit-english-class') || 'text-en-body');
      span.textContent = part.text;
      span.setAttribute('data-studio-text-part', 'true');
      element.appendChild(span);
    });
    preserved.forEach(function (child) { element.appendChild(child); });
  }

  function repairMislabeledTextParts(element) {
    if (!element || element.getAttribute('data-edit-attribute') === 'placeholder') return;
    var parts = Array.prototype.slice.call(
      element.querySelectorAll ? element.querySelectorAll('[data-studio-text-part]') : []
    );
    var needsRepair = parts.some(function (part) {
      var value = part.textContent || '';
      var hasLatin = /[A-Za-z0-9]/.test(value);
      var hasChinese = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(value);
      return (hasLatin && part.lang !== 'en') ||
        (hasChinese && part.lang !== 'zh-CN') ||
        (hasLatin && hasChinese);
    });
    if (needsRepair) splitText(element, element.textContent || '');
  }

  function applyTheme(config) {
    var root = document.documentElement;
    var theme = config.theme || {};
    var colors = theme.colors || {};
    Object.keys(COLOR_VARS).forEach(function (key) {
      if (colors[key]) root.style.setProperty(COLOR_VARS[key], colors[key]);
    });
    root.style.setProperty('--scanline', 'rgba(0, 0, 0, ' + Number(theme.scanlineOpacity || 0) + ')');
    root.style.setProperty('--pixel-shadow', Number(theme.shadowSize || 0) + 'px ' +
      Number(theme.shadowSize || 0) + 'px 0 #000');
    root.style.setProperty('--gap', Number(theme.sectionGap || 32) + 'px');
    root.setAttribute('data-site-animations', config.effects && config.effects.animations === false ? 'off' : 'on');
    root.style.scrollBehavior = config.effects && config.effects.smoothScroll === false ? 'auto' : 'smooth';
  }

  function applyModuleOrder(config) {
    var order = config.content && Array.isArray(config.content.moduleOrder)
      ? config.content.moduleOrder : [];
    var moduleIds = ['hero', 'about', 'projects', 'resume', 'contact'];
    var footer = document.querySelector('footer.footer');
    var parent = footer && footer.parentNode;
    if (!parent) return;
    moduleIds.forEach(function (id) {
      var section = document.getElementById(id);
      var visible = order.indexOf(id) >= 0;
      if (section) section.hidden = !visible;
      var navLink = document.querySelector('nav a[href="#' + id + '"]');
      if (navLink) navLink.hidden = !visible;
    });
    order.forEach(function (id) {
      var section = document.getElementById(id);
      if (section) parent.insertBefore(section, footer);
    });
  }

  function cursorValue(cursor) {
    var preset = cursor && cursor.preset;
    var cursorColor = cursor && /^#[0-9a-f]{6}$/i.test(cursor.color || '')
      ? cursor.color : '#b388ff';
    var shapes = {
      'pixel-arrow': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><path fill="#080812" stroke="' + cursorColor + '" stroke-width="2" d="M2 2v16l5-5 4 9 4-2-4-8h8z"/></svg>',
      'pixel-hand': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><path fill="#080812" stroke="' + cursorColor + '" stroke-width="2" d="M7 3h4v7h2V6h3v5h2V8h3v9l-4 5H8l-5-8v-3h3l2 3z"/></svg>',
      'pixel-crosshair': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><path stroke="' + cursorColor + '" stroke-width="2" d="M12 1v7M12 16v7M1 12h7M16 12h7"/><rect x="9" y="9" width="6" height="6" fill="none" stroke="' + cursorColor + '" stroke-width="2"/></svg>',
      'pixel-terminal': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><rect x="9" y="2" width="6" height="20" fill="#080812" stroke="' + cursorColor + '" stroke-width="2"/><path stroke="' + cursorColor + '" stroke-width="2" d="M5 2h14M5 22h14"/></svg>',
      'pixel-outline': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><rect x="2" y="2" width="20" height="20" fill="none" stroke="' + cursorColor + '" stroke-width="2"/><rect x="10" y="10" width="4" height="4" fill="' + cursorColor + '"/></svg>'
    };
    var svg = shapes[preset] || shapes['pixel-arrow'];
    var hotspot = preset === 'pixel-arrow' || preset === 'pixel-hand' ? '2 2' : '12 12';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + hotspot + ', auto';
  }

  function applyCursor(config) {
    document.body.style.cursor = cursorValue(config.cursor || {});
  }

  function applyStaticCopy(config) {
    var map = config.content && config.content.static || {};
    var overrides = config.content && config.content.overrides && config.content.overrides.text || {};
    Object.keys(map).forEach(function (key) {
      var element = document.querySelector('[data-edit-key="' + escapeSelector(key) + '"]');
      if (element) {
        var value = Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : map[key];
        splitText(element, value);
      }
    });
    Object.keys(overrides).forEach(function (key) {
      var element = document.querySelector('[data-edit-key="' + escapeSelector(key) + '"]');
      if (element) {
        splitText(element, overrides[key]);
        syncDerived(element, key, overrides[key]);
      }
    });
    var terminalIntro = document.querySelector('[data-edit-key="terminal.intro"]');
    if (terminalIntro && config.content && config.content.contact) {
      splitText(terminalIntro, config.content.contact.intro || '');
    }
  }

  function syncDerived(element, key, value) {
    if (!/^about\.stats\.[^.]+\.value$/.test(key) || !element.closest) return;
    var row = element.closest('.stat-row');
    var bar = row && row.querySelector('.stat-bar-inner');
    if (!bar) return;
    var match = String(value).match(/-?\d+(?:\.\d+)?/);
    var number = Math.max(0, Math.min(100, match ? Number(match[0]) : 0));
    bar.style.width = number + '%';
    bar.setAttribute('data-width', number + '%');
  }

  function applyElementStyles(config) {
    var styles = config.styles && config.styles.elements || {};
    document.querySelectorAll('[data-edit-key]').forEach(function (element) {
      element.removeAttribute('data-studio-style');
      element.removeAttribute('data-studio-font-cn');
      element.removeAttribute('data-studio-font-en');
      element.removeAttribute('data-studio-size');
      element.removeAttribute('data-studio-line-height');
      element.removeAttribute('data-studio-weight');
      element.removeAttribute('data-studio-letter-spacing');
      element.removeAttribute('data-studio-color');
      element.removeAttribute('data-studio-gradient');
      element.removeAttribute('data-studio-align');
      element.style.removeProperty('--studio-font-cn');
      element.style.removeProperty('--studio-font-en');
      element.style.removeProperty('--studio-size');
      element.style.removeProperty('--studio-line-height');
      element.style.removeProperty('--studio-weight');
      element.style.removeProperty('--studio-letter-spacing');
      element.style.removeProperty('--studio-color');
      element.style.removeProperty('--studio-gradient');
      element.style.removeProperty('--studio-align');
      element.removeAttribute('data-studio-italic');
    });
    Object.keys(styles).forEach(function (key) {
      var element = document.querySelector('[data-edit-key="' + escapeSelector(key) + '"]');
      var style = styles[key];
      if (!element || !style) return;
      repairMislabeledTextParts(element);
      element.setAttribute('data-studio-style', 'true');
      if (FONT_CN[style.fontCn]) {
        element.setAttribute('data-studio-font-cn', 'true');
        element.style.setProperty('--studio-font-cn', FONT_CN[style.fontCn]);
      }
      if (FONT_EN[style.fontEn]) {
        element.setAttribute('data-studio-font-en', 'true');
        element.style.setProperty('--studio-font-en', FONT_EN[style.fontEn]);
      }
      if (style.size) {
        element.setAttribute('data-studio-size', 'true');
        element.style.setProperty('--studio-size', style.size + 'px');
      }
      if (style.lineHeight) {
        element.setAttribute('data-studio-line-height', 'true');
        element.style.setProperty('--studio-line-height', style.lineHeight);
      }
      if (style.weight) {
        element.setAttribute('data-studio-weight', 'true');
        element.style.setProperty('--studio-weight', style.weight);
      }
      if (style.letterSpacing !== undefined) {
        element.setAttribute('data-studio-letter-spacing', 'true');
        element.style.setProperty('--studio-letter-spacing', style.letterSpacing + 'px');
      }
      if (style.color) {
        element.setAttribute('data-studio-color', 'true');
        element.style.setProperty('--studio-color', style.color);
      }
      if (GRADIENTS[style.gradient]) {
        element.setAttribute('data-studio-gradient', 'true');
        element.style.setProperty('--studio-gradient', GRADIENTS[style.gradient]);
      }
      if (style.align) {
        element.setAttribute('data-studio-align', 'true');
        element.style.setProperty('--studio-align', style.align);
      }
      if (typeof style.italic === 'boolean') {
        element.setAttribute('data-studio-italic', style.italic ? 'true' : 'false');
      }
    });
  }

  function fontId(fontFamily, type) {
    var value = String(fontFamily || '').toLowerCase();
    var map = type === 'cn' ? {
      'boutique bitmap 7x7': 'boutique-7x7',
      'cubic 11': 'cubic-11',
      zpix: 'zpix'
    } : {
      zpix: 'zpix',
      'press start 2p': 'press-start',
      vt323: 'vt323',
      'fira code': 'fira-code',
      'ibm plex mono': 'ibm-plex-mono'
    };
    return Object.keys(map).find(function (name) { return value.indexOf(name) >= 0; })
      ? map[Object.keys(map).find(function (name) { return value.indexOf(name) >= 0; })]
      : (type === 'cn' ? 'zpix' : 'vt323');
  }

  function selectionStyle(element) {
    if (!element || !window.getComputedStyle) return null;
    var cn = element.querySelector('.text-cn, [lang="zh-CN"]') || element;
    var en = element.querySelector('[lang="en"]') || element;
    var computed = window.getComputedStyle(element);
    var backgroundImage = computed.backgroundImage && computed.backgroundImage !== 'none'
      ? computed.backgroundImage : '';
    var textFillColor = computed.webkitTextFillColor || '';
    var defaultGradient = computed.getPropertyValue('--studio-default-gradient').trim();
    var hasGradientText = backgroundImage.indexOf('gradient(') >= 0 &&
      (textFillColor === 'transparent' || textFillColor === 'rgba(0, 0, 0, 0)');
    var lineHeight = parseFloat(computed.lineHeight);
    var letterSpacing = parseFloat(computed.letterSpacing);
    var weight = Math.round((parseInt(computed.fontWeight, 10) || 400) / 100) * 100;
    return {
      fontCn: fontId(window.getComputedStyle(cn).fontFamily, 'cn'),
      fontEn: fontId(window.getComputedStyle(en).fontFamily, 'en'),
      size: Math.round(parseFloat(computed.fontSize) || 16),
      lineHeight: Number.isFinite(lineHeight) && computed.fontSize
        ? Number((lineHeight / (parseFloat(computed.fontSize) || 16)).toFixed(2)) : 1.5,
      weight: Math.max(300, Math.min(900, weight)),
      italic: computed.fontStyle === 'italic' || computed.fontStyle === 'oblique',
      letterSpacing: Number.isFinite(letterSpacing) ? Number(letterSpacing.toFixed(1)) : 0,
      align: ['left', 'center', 'right'].indexOf(computed.textAlign) >= 0 ? computed.textAlign : 'left',
      color: computed.color,
      colorMode: hasGradientText ? 'gradient' : 'solid',
      gradient: hasGradientText ? backgroundImage : '',
      defaultGradient: defaultGradient
    };
  }

  function notifySelectionStyle() {
    if (!previewMode || window.parent === window || !selectedKey) return;
    var element = document.querySelector('[data-edit-key="' + escapeSelector(selectedKey) + '"]');
    if (!element) return;
    window.parent.postMessage({
      type: 'studio:selection-style',
      key: selectedKey,
      style: selectionStyle(element)
    }, window.location.origin);
  }

  function applySelected(reveal) {
    document.querySelectorAll('[data-studio-selected]').forEach(function (element) {
      element.removeAttribute('data-studio-selected');
    });
    if (!selectedKey) return;
    var element = document.querySelector('[data-edit-key="' + escapeSelector(selectedKey) + '"]');
    if (element) {
      element.setAttribute('data-studio-selected', 'true');
      if (reveal) {
        var bounds = element.getBoundingClientRect();
        var targetTop = window.scrollY + bounds.top - window.innerHeight * 0.28;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
      }
    }
  }

  function applyConfig(config) {
    if (!config) return;
    window.siteConfig = config;
    applyTheme(config);
    applyModuleOrder(config);
    applyCursor(config);
    applyStaticCopy(config);
    applyElementStyles(config);
    applySelected();
    document.dispatchEvent(new CustomEvent('site:config-applied', { detail: { config: config } }));
  }

  function setupPreviewBridge() {
    if (!previewMode || window.parent === window) return;
    document.documentElement.setAttribute('data-site-studio-preview', 'true');
    document.addEventListener('click', function (event) {
      var editable = event.target && event.target.closest && event.target.closest('[data-edit-key]');
      if (!editable) return;
      event.preventDefault();
      event.stopPropagation();
      selectedKey = editable.getAttribute('data-edit-key');
      applySelected();
      window.parent.postMessage({ type: 'studio:select', key: selectedKey }, window.location.origin);
      notifySelectionStyle();
    }, true);
    window.addEventListener('message', function (event) {
      if (event.origin !== window.location.origin || event.source !== window.parent || !event.data) return;
      if (event.data.type === 'studio:apply-draft' && event.data.config) {
        if (window.SiteApp && window.SiteApp.applyConfig) window.SiteApp.applyConfig(event.data.config);
        else applyConfig(event.data.config);
      } else if (event.data.type === 'studio:select') {
        selectedKey = event.data.key || null;
        applySelected(true);
        notifySelectionStyle();
      } else if (event.data.type === 'studio:reload-saved') {
        window.location.reload();
      } else if (event.data.type === 'studio:start-game') {
        if (event.data.config && window.SiteApp && window.SiteApp.applyConfig) {
          window.SiteApp.applyConfig(event.data.config);
        }
        if (window.SiteApp && window.SiteApp.startGame) window.SiteApp.startGame();
      }
    });
    window.parent.postMessage({ type: 'studio:preview-ready' }, window.location.origin);
  }

  window.SiteRuntime = {
    applyConfig: applyConfig,
    splitText: splitText,
    cursorValue: cursorValue,
    isPreview: previewMode
  };

  setupPreviewBridge();
})();
