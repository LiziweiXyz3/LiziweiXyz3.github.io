(function () {
  'use strict';

  var FONT_CN = {
    zpix: "'Zpix', monospace",
    'noto-sans-sc': "'Noto Sans SC', 'Microsoft YaHei', sans-serif",
    'lxgw-wenkai': "'LXGW WenKai', 'KaiTi', serif"
  };
  var FONT_EN = {
    'press-start': "'Press Start 2P', monospace",
    vt323: "'VT323', monospace",
    'fira-code': "'Fira Code', monospace",
    'ibm-plex-mono': "'IBM Plex Mono', monospace"
  };
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
    var current = '';
    var lang = 'zh-CN';
    function flush() {
      if (!current) return;
      var span = document.createElement('span');
      span.lang = lang;
      span.className = lang === 'zh-CN' ? 'text-cn' :
        (element.getAttribute('data-edit-english-class') || 'text-en-body');
      span.textContent = current;
      span.setAttribute('data-studio-text-part', 'true');
      element.appendChild(span);
      current = '';
    }
    String(value).split('').forEach(function (character) {
      var next = lang;
      if (/[A-Za-z0-9_+#@&/.-]/.test(character)) next = 'en';
      else if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(character)) next = 'zh-CN';
      if (current && next !== lang) flush();
      lang = next;
      current += character;
    });
    flush();
    preserved.forEach(function (child) { element.appendChild(child); });
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
    if (preset === 'system') return 'auto';
    if (preset === 'crosshair') return 'crosshair';
    if (preset === 'pointer') return 'pointer';
    if (preset === 'terminal') return 'text';
    if (preset === 'custom' && cursor.src) {
      return 'url("' + cursor.src.replace(/["\n\r]/g, '') + '") ' +
        Number(cursor.hotspotX || 0) + ' ' + Number(cursor.hotspotY || 0) + ', auto';
    }
    return 'url("data:image/svg+xml,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 16 16%27><rect x=%270%27 y=%270%27 width=%2714%27 height=%2714%27 fill=%27none%27 stroke=%27%23b388ff%27 stroke-width=%272%27/></svg>") 8 8, crosshair';
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
      element.style.removeProperty('--studio-font-cn');
      element.style.removeProperty('--studio-font-en');
      element.style.removeProperty('--studio-size');
      element.style.removeProperty('--studio-mobile-size');
      element.style.removeProperty('--studio-line-height');
      element.style.removeProperty('--studio-weight');
      element.style.removeProperty('--studio-letter-spacing');
      element.style.removeProperty('--studio-color');
      element.style.removeProperty('--studio-align');
      element.removeAttribute('data-studio-italic');
    });
    Object.keys(styles).forEach(function (key) {
      var element = document.querySelector('[data-edit-key="' + escapeSelector(key) + '"]');
      var style = styles[key];
      if (!element || !style) return;
      element.setAttribute('data-studio-style', 'true');
      if (FONT_CN[style.fontCn]) element.style.setProperty('--studio-font-cn', FONT_CN[style.fontCn]);
      if (FONT_EN[style.fontEn]) element.style.setProperty('--studio-font-en', FONT_EN[style.fontEn]);
      if (style.size) element.style.setProperty('--studio-size', style.size + 'px');
      if (style.mobileSize) element.style.setProperty('--studio-mobile-size', style.mobileSize + 'px');
      if (style.lineHeight) element.style.setProperty('--studio-line-height', style.lineHeight);
      if (style.weight) element.style.setProperty('--studio-weight', style.weight);
      if (style.letterSpacing !== undefined) element.style.setProperty('--studio-letter-spacing', style.letterSpacing + 'px');
      if (style.color) element.style.setProperty('--studio-color', style.color);
      if (style.align) element.style.setProperty('--studio-align', style.align);
      if (style.italic) element.setAttribute('data-studio-italic', 'true');
    });
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
    }, true);
    window.addEventListener('message', function (event) {
      if (event.origin !== window.location.origin || event.source !== window.parent || !event.data) return;
      if (event.data.type === 'studio:apply-draft' && event.data.config) {
        if (window.SiteApp && window.SiteApp.applyConfig) window.SiteApp.applyConfig(event.data.config);
        else applyConfig(event.data.config);
      } else if (event.data.type === 'studio:select') {
        selectedKey = event.data.key || null;
        applySelected(true);
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
