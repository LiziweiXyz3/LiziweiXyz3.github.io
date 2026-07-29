(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SiteConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var VERSION = 3;
  var MAX_TEXT = 5000;
  var FONT_CN = ['zpix', 'cubic-11', 'boutique-7x7'];
  var FONT_EN = ['zpix', 'press-start', 'vt323', 'fira-code', 'ibm-plex-mono'];
  var ALIGNMENTS = ['left', 'center', 'right'];
  var ELEMENT_STYLE_PROPERTIES = [
    'fontCn', 'fontEn', 'size', 'mobileSize', 'lineHeight', 'weight',
    'italic', 'letterSpacing', 'align', 'color'
  ];
  var CURSORS = ['pixel-arrow', 'pixel-hand', 'pixel-crosshair', 'pixel-terminal', 'pixel-outline'];
  var OBSTACLES = ['cactus-small', 'cactus-big'];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clamp(value, min, max, fallback) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function text(value, fallback, maxLength) {
    if (typeof value !== 'string') return fallback;
    return value.slice(0, maxLength || MAX_TEXT);
  }

  function color(value, fallback) {
    return typeof value === 'string' &&
      (/^#[0-9a-f]{6}$/i.test(value) || /^rgba?\([^)]+\)$/i.test(value))
      ? value : fallback;
  }

  function identifier(value, fallback) {
    var safe = String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 64);
    return safe || fallback;
  }

  function uniqueId(value, used, fallback) {
    var base = identifier(value, fallback);
    var candidate = base;
    var index = 2;
    while (used.indexOf(candidate) >= 0) {
      candidate = base + '-' + index;
      index += 1;
    }
    used.push(candidate);
    return candidate;
  }

  function normalizeElementStyle(value) {
    value = isObject(value) ? value : {};
    var style = {};
    if (FONT_CN.indexOf(value.fontCn) >= 0) style.fontCn = value.fontCn;
    if (FONT_EN.indexOf(value.fontEn) >= 0) style.fontEn = value.fontEn;
    if (value.size !== undefined) style.size = clamp(value.size, 8, 96, 16);
    if (value.mobileSize !== undefined && value.mobileSize !== null && value.mobileSize !== '') {
      style.mobileSize = clamp(value.mobileSize, 8, 72, style.size || 16);
    }
    if (value.lineHeight !== undefined) style.lineHeight = clamp(value.lineHeight, 0.8, 3, 1.5);
    if (value.weight !== undefined) style.weight = Math.round(clamp(value.weight, 300, 900, 400) / 100) * 100;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (value.letterSpacing !== undefined) style.letterSpacing = clamp(value.letterSpacing, -2, 12, 0);
    if (ALIGNMENTS.indexOf(value.align) >= 0) style.align = value.align;
    if (value.color) style.color = color(value.color, '#e0e0e0');
    return style;
  }

  function updateElementStyle(config, key, property, value) {
    var result = clone(isObject(config) ? config : {});
    if (!/^[a-z0-9._-]{1,120}$/i.test(String(key || '')) ||
        ELEMENT_STYLE_PROPERTIES.indexOf(property) < 0) return result;
    result.styles = isObject(result.styles) ? result.styles : {};
    result.styles.elements = isObject(result.styles.elements) ? result.styles.elements : {};
    var nextStyle = isObject(result.styles.elements[key]) ? clone(result.styles.elements[key]) : {};
    if (value === undefined || value === null || value === '') delete nextStyle[property];
    else nextStyle[property] = value;
    nextStyle = normalizeElementStyle(nextStyle);
    if (Object.keys(nextStyle).length) result.styles.elements[key] = nextStyle;
    else delete result.styles.elements[key];
    return result;
  }

  function normalizeSequence(sequence, index) {
    var items = Array.isArray(sequence && sequence.items) ? sequence.items : [];
    return {
      id: identifier(sequence && sequence.id, 'sequence-' + (index + 1)),
      name: text(sequence && sequence.name, '障碍组合 ' + (index + 1), 80),
      enabled: !sequence || sequence.enabled !== false,
      weight: Math.round(clamp(sequence && sequence.weight, 1, 10, 1)),
      items: items.slice(0, 4).map(function (item) {
        return {
          type: OBSTACLES.indexOf(item && item.type) >= 0 ? item.type : 'cactus-small',
          gap: Math.round(clamp(item && item.gap, 0, 220, 40))
        };
      })
    };
  }

  function normalizeConfig(input, fallback) {
    var base = isObject(fallback) ? clone(fallback) : {};
    var source = isObject(input) ? input : {};
    var result = base;
    result.version = VERSION;
    result.content = isObject(source.content) ? clone(source.content) : (result.content || {});

    result.theme = result.theme || {};
    result.theme.colors = result.theme.colors || {};
    var sourceTheme = isObject(source.theme) ? source.theme : {};
    var sourceColors = isObject(sourceTheme.colors) ? sourceTheme.colors : {};
    Object.keys(result.theme.colors).forEach(function (key) {
      result.theme.colors[key] = color(sourceColors[key], result.theme.colors[key]);
    });
    result.theme.scanlineOpacity = clamp(sourceTheme.scanlineOpacity, 0, 0.35, result.theme.scanlineOpacity || 0.08);
    result.theme.particleCount = Math.round(clamp(sourceTheme.particleCount, 0, 200, result.theme.particleCount || 80));
    result.theme.shadowSize = Math.round(clamp(sourceTheme.shadowSize, 0, 12, result.theme.shadowSize || 4));
    result.theme.sectionGap = Math.round(clamp(sourceTheme.sectionGap, 12, 96, result.theme.sectionGap || 32));

    result.styles = { elements: {} };
    var sourceStyles = source.styles && isObject(source.styles.elements) ? source.styles.elements : {};
    Object.keys(sourceStyles).slice(0, 500).forEach(function (key) {
      if (/^[a-z0-9._-]{1,120}$/i.test(key)) result.styles.elements[key] = normalizeElementStyle(sourceStyles[key]);
    });
    result.responsive = { mobile: {} };
    var mobile = source.responsive && isObject(source.responsive.mobile) ? source.responsive.mobile : {};
    Object.keys(mobile).slice(0, 500).forEach(function (key) {
      if (/^[a-z0-9._-]{1,120}$/i.test(key)) {
        result.responsive.mobile[key] = { size: clamp(mobile[key] && mobile[key].size, 8, 72, 16) };
      }
    });

    var sourceCursor = isObject(source.cursor) ? source.cursor : {};
    result.cursor = {
      preset: CURSORS.indexOf(sourceCursor.preset) >= 0 ? sourceCursor.preset : 'pixel-outline',
      src: '',
      hotspotX: 8,
      hotspotY: 8
    };

    var sourceEffects = isObject(source.effects) ? source.effects : {};
    result.effects = {
      typewriterSpeed: Math.round(clamp(sourceEffects.typewriterSpeed, 0, 200, 60)),
      smoothScroll: sourceEffects.smoothScroll !== false,
      avatarScrollThreshold: Math.round(clamp(sourceEffects.avatarScrollThreshold, 1, 100, 10)),
      particles: sourceEffects.particles !== false,
      animations: sourceEffects.animations !== false
    };

    result.assets = isObject(source.assets) ? clone(source.assets) : (result.assets || {});
    var sourceGame = isObject(source.game) ? source.game : {};
    result.game = {
      startSpeed: clamp(sourceGame.startSpeed, 0.5, 2.5, 1),
      maxSpeed: clamp(sourceGame.maxSpeed, 0.5, 2.5, 2.5),
      speedStep: clamp(sourceGame.speedStep, 0, 0.5, 0.15),
      speedEveryFrames: Math.round(clamp(sourceGame.speedEveryFrames, 120, 1800, 600)),
      firstObstacleRatio: clamp(sourceGame.firstObstacleRatio, 0.45, 0.9, 0.6),
      minObstacleGap: Math.round(clamp(sourceGame.minObstacleGap, 180, 700, 260)),
      maxObstacleGap: Math.round(clamp(sourceGame.maxObstacleGap, 220, 900, 360)),
      maxObstacles: Math.round(clamp(sourceGame.maxObstacles, 1, 6, 3)),
      jumpVelocity: clamp(sourceGame.jumpVelocity, -10, -3, -6),
      riseGravity: clamp(sourceGame.riseGravity, 0.05, 0.5, 0.18),
      fallGravity: clamp(sourceGame.fallGravity, 0.03, 0.35, 0.08),
      hangFrames: Math.round(clamp(sourceGame.hangFrames, 0, 30, 8)),
      anticipationFrames: Math.round(clamp(sourceGame.anticipationFrames, 0, 24, 6)),
      landingFrames: Math.round(clamp(sourceGame.landingFrames, 0, 24, 3)),
      sequences: (Array.isArray(sourceGame.sequences) ? sourceGame.sequences : [])
        .slice(0, 12).map(normalizeSequence).filter(function (sequence) { return sequence.items.length > 0; })
    };
    if (result.game.startSpeed > result.game.maxSpeed) result.game.startSpeed = result.game.maxSpeed;
    if (result.game.minObstacleGap > result.game.maxObstacleGap) {
      result.game.maxObstacleGap = result.game.minObstacleGap;
    }
    return result;
  }

  function validateConfig(config) {
    var errors = [];
    if (!isObject(config)) errors.push('配置必须是对象');
    if (Number(config && config.version) !== VERSION) errors.push('配置版本必须为 ' + VERSION);
    if (!config || !isObject(config.content)) errors.push('缺少 content');
    if (config && isObject(config.content)) {
      if (!Array.isArray(config.content.moduleOrder)) errors.push('缺少模块排序');
      if (!isObject(config.content.user)) errors.push('缺少用户资料');
      if (!Array.isArray(config.content.nav)) errors.push('缺少导航内容');
      if (!isObject(config.content.about) ||
          !Array.isArray(config.content.about.stats) ||
          !Array.isArray(config.content.about.skills)) errors.push('缺少 About 内容');
      if (!Array.isArray(config.content.projects)) errors.push('缺少项目内容');
      if (!Array.isArray(config.content.experiences)) errors.push('缺少履历内容');
      if (!isObject(config.content.contact)) errors.push('缺少终端内容');
      ['nav', 'projects', 'experiences'].forEach(function (collection) {
        (config.content[collection] || []).forEach(function (item) {
          if (!item || !/^[a-z0-9][a-z0-9-]*$/i.test(String(item.id || ''))) {
            errors.push(collection + ' 中存在无效稳定 ID');
          }
        });
      });
    }
    if (!config || !isObject(config.theme) || !isObject(config.theme.colors)) errors.push('缺少主题颜色');
    if (!config || !isObject(config.styles) || !isObject(config.styles.elements)) errors.push('缺少元素样式');
    if (!config || !isObject(config.cursor)) errors.push('缺少光标设置');
    if (!config || !isObject(config.effects)) errors.push('缺少交互设置');
    if (!config || !isObject(config.assets)) errors.push('缺少素材设置');
    if (!config || !isObject(config.game)) errors.push('缺少小游戏设置');
    if (config && config.game) {
      ['startSpeed', 'maxSpeed', 'speedStep', 'jumpVelocity', 'riseGravity', 'fallGravity', 'hangFrames',
        'minObstacleGap', 'maxObstacleGap', 'maxObstacles'].forEach(function (key) {
        if (!Number.isFinite(Number(config.game[key]))) errors.push('小游戏参数 ' + key + ' 无效');
      });
      if (Number(config.game.maxSpeed) > 2.5) errors.push('小游戏最高速度不能超过 2.5');
      if (Number(config.game.startSpeed) > Number(config.game.maxSpeed)) errors.push('起始速度不能超过最高速度');
      if (!Array.isArray(config.game.sequences) || !config.game.sequences.some(function (item) {
        return item && item.enabled !== false && Array.isArray(item.items) && item.items.length;
      })) errors.push('至少需要启用一个障碍组合');
      var jumpVelocity = Math.abs(Number(config.game.jumpVelocity));
      var riseGravity = Number(config.game.riseGravity);
      var fallGravity = Number(config.game.fallGravity);
      var jumpHeight = jumpVelocity * jumpVelocity / (2 * riseGravity);
      var riseFrames = Math.ceil(jumpVelocity / riseGravity);
      var fallFrames = Math.ceil(Math.sqrt(2 * jumpHeight / fallGravity));
      var airborneDistance = (riseFrames + fallFrames + Number(config.game.hangFrames || 0)) *
        Number(config.game.maxSpeed);
      if (jumpHeight < 46) errors.push('当前跳跃力度无法越过大仙人掌');
      (config.game.sequences || []).forEach(function (sequence) {
        var sequenceSpan = 0;
        (sequence.items || []).forEach(function (item) {
          sequenceSpan += item.type === 'cactus-big' ? 16 : 10;
          sequenceSpan += Number(item.gap) || 0;
          if (Number(item.gap) > 0 && Number(item.gap) < 24) {
            errors.push('障碍组合“' + sequence.name + '”内部间距至少为 24');
          }
        });
        if ((sequence.items || []).length > 1 && sequenceSpan > airborneDistance) {
          errors.push('障碍组合“' + sequence.name + '”超过当前跳跃可通过距离');
        }
      });
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function migrateLegacyDraft(legacy, config) {
    var result = normalizeConfig(config, config);
    if (!isObject(legacy)) return result;
    var textMap = isObject(legacy.text) ? legacy.text : {};
    var styles = isObject(legacy.textStyles) ? legacy.textStyles : {};
    var indexToId = (result.content.experiences || []).map(function (item) { return item.id; });
    function stableKey(key) {
      var match = /^resume\.(\d+)\.(.+)$/.exec(key);
      return match && indexToId[Number(match[1])]
        ? 'resume.' + indexToId[Number(match[1])] + '.' + match[2]
        : key;
    }
    result.content.overrides = result.content.overrides || {};
    result.content.overrides.text = result.content.overrides.text || {};
    Object.keys(textMap).forEach(function (key) {
      result.content.overrides.text[stableKey(key)] = text(textMap[key], '', MAX_TEXT);
    });
    Object.keys(styles).forEach(function (key) {
      var old = styles[key] || {};
      var fontMap = {
        classic: { fontCn: 'zpix', fontEn: 'press-start' },
        terminal: { fontCn: 'cubic-11', fontEn: 'vt323' },
        arcade: { fontCn: 'zpix', fontEn: 'press-start' },
        code: { fontCn: 'boutique-7x7', fontEn: 'fira-code' }
      };
      var next = fontMap[old.font] || fontMap.classic;
      next.size = Math.round(16 * clamp(old.scale, 80, 140, 100) / 100);
      next.weight = old.bold ? 700 : 400;
      next.italic = old.italic === true;
      result.styles.elements[stableKey(key)] = normalizeElementStyle(next);
    });
    return result;
  }

  return {
    VERSION: VERSION,
    FONT_CN: FONT_CN,
    FONT_EN: FONT_EN,
    CURSORS: CURSORS,
    ELEMENT_STYLE_PROPERTIES: ELEMENT_STYLE_PROPERTIES,
    clone: clone,
    normalizeConfig: normalizeConfig,
    normalizeElementStyle: normalizeElementStyle,
    updateElementStyle: updateElementStyle,
    normalizeSequence: normalizeSequence,
    validateConfig: validateConfig,
    migrateLegacyDraft: migrateLegacyDraft,
    identifier: identifier,
    uniqueId: uniqueId
  };
});
