(function () {
  'use strict';

  var DRAFT_KEY = 'personal-site-studio-v3-draft';
  var savedConfig = null;
  var draft = null;
  var selectedKey = null;
  var selectedTool = null;
  var selectionDefaults = {};
  var undoStack = [];
  var activeHistoryGroup = null;
  var previewReady = false;
  var gamePreviewTimer = null;

  function byId(id) { return document.getElementById(id); }
  function clone(value) { return window.SiteConfig.clone(value); }
  function configSignature(value) {
    function compact(item) {
      if (Array.isArray(item)) return item.map(compact);
      if (!item || typeof item !== 'object') return item;
      var output = {};
      Object.keys(item).forEach(function (key) {
        var next = compact(item[key]);
        if (next && typeof next === 'object' && !Array.isArray(next) && Object.keys(next).length === 0) return;
        output[key] = next;
      });
      return output;
    }
    return JSON.stringify(compact(value));
  }
  function sameConfig(left, right) {
    return configSignature(left) === configSignature(right);
  }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function findById(list, id) {
    return (list || []).find(function (item) { return String(item.id) === String(id); });
  }
  function setStatus(message, dirty) {
    var output = byId('saveState');
    output.textContent = message;
    output.setAttribute('data-dirty', dirty ? 'true' : 'false');
  }
  function toast(message) {
    var node = byId('toast');
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () { node.hidden = true; }, 2600);
  }
  function requestJson(url, options) {
    return fetch(url, options).then(function (response) {
      return response.json().then(function (payload) {
        if (!response.ok) throw new Error(payload.error || '请求失败');
        return payload;
      });
    });
  }
  function saveDraftLocally() {
    if (savedConfig && sameConfig(draft, savedConfig)) {
      localStorage.removeItem(DRAFT_KEY);
      setStatus('当前内容与正式配置一致', false);
      return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setStatus('草稿已自动保留，尚未保存到网站', true);
  }
  function sendDraft() {
    if (previewReady) {
      byId('sitePreview').contentWindow.postMessage({
        type: 'studio:apply-draft',
        config: draft
      }, window.location.origin);
    }
  }
  function postDraft() {
    saveDraftLocally();
    sendDraft();
  }
  function beginChange(group) {
    if (activeHistoryGroup === group) return;
    undoStack.push(clone(draft));
    if (undoStack.length > 100) undoStack.shift();
    activeHistoryGroup = group || null;
    byId('undoButton').disabled = false;
  }
  function endChange() { activeHistoryGroup = null; }
  function mutate(group, callback, rebuildTree, rerenderInspector) {
    beginChange(group);
    callback();
    draft = window.SiteConfig.normalizeConfig(draft, savedConfig);
    postDraft();
    if (selectedTool === 'game') scheduleGamePreview(false);
    if (rebuildTree) buildTree();
    if (rerenderInspector) renderCurrentView();
  }
  function undo() {
    if (!undoStack.length) return;
    draft = undoStack.pop();
    activeHistoryGroup = null;
    byId('undoButton').disabled = undoStack.length === 0;
    postDraft();
    buildTree();
    renderCurrentView();
    toast('已撤销上一步');
  }
  function discardDraft() {
    if (!sameConfig(draft, savedConfig) &&
        !window.confirm('放弃全部未保存修改并恢复正式配置吗？')) return;
    draft = clone(savedConfig);
    localStorage.removeItem(DRAFT_KEY);
    undoStack = [];
    activeHistoryGroup = null;
    byId('undoButton').disabled = true;
    sendDraft();
    buildTree();
    renderCurrentView();
    setStatus('已恢复正式配置', false);
    toast('未保存草稿已清除');
  }

  function textOverrides(create) {
    if (!draft.content.overrides) {
      if (!create) return {};
      draft.content.overrides = {};
    }
    if (!draft.content.overrides.text) {
      if (!create) return {};
      draft.content.overrides.text = {};
    }
    return draft.content.overrides.text;
  }
  function overrideOr(key, fallback) {
    var overrides = textOverrides(false);
    return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : fallback;
  }

  function getText(key) {
    var parts = String(key || '').split('.');
    var content = draft.content;
    if (content.static && Object.prototype.hasOwnProperty.call(content.static, key)) {
      return overrideOr(key, content.static[key]);
    }
    if (key === 'hero.title') return overrideOr(key, content.user.name);
    if (key === 'hero.subtitle') return overrideOr(key, '> ' + content.user.title);
    if (key === 'hero.description') return overrideOr(key, content.user.bio);
    if (key === 'about.intro') return overrideOr(key, content.about.intro);
    if (key === 'terminal.intro') return overrideOr(key, content.contact.intro);
    if (parts[0] === 'nav' && parts.length === 2) {
      var nav = findById(content.nav, parts[1]);
      return overrideOr(key, nav ? nav.label : '');
    }
    if (parts[0] === 'about' && parts[1] === 'stats') {
      var stat = findById(content.about.stats, parts[2]);
      if (!stat) return '';
      if (parts[3] === 'name') return overrideOr(key, '[' + stat.label + '] ' + stat.name);
      if (parts[3] === 'value') return overrideOr(key, stat.value + '/100');
    }
    if (parts[0] === 'about' && parts[1] === 'skills') {
      var skill = findById(content.about.skills, parts[2]);
      return overrideOr(key, skill ? skill.name + ' Lv.' + skill.level : '');
    }
    if (parts[0] === 'projects') {
      var project = findById(content.projects, parts[1]);
      if (!project) return '';
      if (parts[2] === 'title') return overrideOr(key, project.title);
      if (parts[2] === 'description') return overrideOr(key, project.description);
      if (parts[2] === 'status') return overrideOr(key, ({ done: 'DONE', wip: 'WIP', planned: 'TODO' })[project.status] || project.status);
      if (parts[2] === 'tag') {
        var projectTag = findById(project.tags, parts[3]);
        return overrideOr(key, projectTag ? '#' + projectTag.text : '');
      }
    }
    if (parts[0] === 'resume') {
      var experience = findById(content.experiences, parts[1]);
      if (!experience) return '';
      if (parts[2] === 'period') return overrideOr(key, experience.period);
      if (parts[2] === 'title') return overrideOr(key, experience.title);
      if (parts[2] === 'company') return overrideOr(key, experience.company);
      if (parts[2] === 'desc') return overrideOr(key, experience.description);
      if (parts[2] === 'highlight') {
        var highlight = findById(experience.highlights, parts[3]);
        return overrideOr(key, highlight ? '▶ ' + highlight.text : '');
      }
    }
    return overrideOr(key, '');
  }

  function setText(key, value) {
    var parts = String(key || '').split('.');
    var content = draft.content;
    var overrides = textOverrides(true);
    if (content.static && Object.prototype.hasOwnProperty.call(content.static, key)) {
      content.static[key] = value;
      delete overrides[key];
      return;
    }
    if (key === 'hero.title') { content.user.name = value; delete overrides[key]; return; }
    if (key === 'hero.subtitle') {
      content.user.title = value.replace(/^>\s*/, '');
      delete overrides[key];
      return;
    }
    if (key === 'hero.description') { content.user.bio = value; delete overrides[key]; return; }
    if (key === 'about.intro') { content.about.intro = value; delete overrides[key]; return; }
    if (key === 'terminal.intro') { content.contact.intro = value; delete overrides[key]; return; }
    if (parts[0] === 'nav' && parts.length === 2) {
      var nav = findById(content.nav, parts[1]);
      if (nav) nav.label = value;
      delete overrides[key];
      return;
    }
    if (parts[0] === 'about' && parts[1] === 'stats') {
      var stat = findById(content.about.stats, parts[2]);
      if (stat && parts[3] === 'name') {
        var statMatch = /^\[([^\]]+)\]\s*(.*)$/.exec(value);
        if (statMatch) { stat.label = statMatch[1]; stat.name = statMatch[2]; }
        else stat.name = value;
      } else if (stat && parts[3] === 'value') {
        var number = Number((value.match(/-?\d+(?:\.\d+)?/) || [0])[0]);
        stat.value = Math.max(0, Math.min(100, number));
      }
      delete overrides[key];
      return;
    }
    if (parts[0] === 'about' && parts[1] === 'skills') {
      var skill = findById(content.about.skills, parts[2]);
      var skillMatch = /^(.*?)\s+Lv\.(\d+)/i.exec(value);
      if (skill && skillMatch) { skill.name = skillMatch[1]; skill.level = Math.max(0, Math.min(100, Number(skillMatch[2]))); }
      else if (skill) skill.name = value;
      delete overrides[key];
      return;
    }
    if (parts[0] === 'projects') {
      var project = findById(content.projects, parts[1]);
      if (project && parts[2] === 'title') project.title = value;
      else if (project && parts[2] === 'description') project.description = value;
      else if (project && parts[2] === 'status') {
        var statusMap = { DONE: 'done', WIP: 'wip', TODO: 'planned' };
        project.status = statusMap[value.toUpperCase()] || project.status;
      } else if (project && parts[2] === 'tag') {
        var projectTag = findById(project.tags, parts[3]);
        if (projectTag) projectTag.text = value.replace(/^#/, '');
      }
      delete overrides[key];
      return;
    }
    if (parts[0] === 'resume') {
      var experience = findById(content.experiences, parts[1]);
      if (experience && parts[2] === 'period') experience.period = value;
      else if (experience && parts[2] === 'title') experience.title = value;
      else if (experience && parts[2] === 'company') experience.company = value;
      else if (experience && parts[2] === 'desc') experience.description = value;
      else if (experience && parts[2] === 'highlight') {
        var highlight = findById(experience.highlights, parts[3]);
        if (highlight) highlight.text = value.replace(/^▶\s*/, '');
      }
      delete overrides[key];
      return;
    }
    overrides[key] = value;
  }

  function keyLabel(key) {
    var parts = key.split('.');
    var labels = {
      period: '时间', title: '职位/标题', company: '公司', desc: '描述',
      description: '介绍', status: '状态', name: '名称', value: '数值',
      heading: '模块标题', subtitle: '模块副标题', intro: '开场文案'
    };
    if (key === 'hero.title') return '姓名';
    if (key === 'hero.subtitle') return '身份介绍';
    if (key === 'hero.description') return '个人简介';
    if (parts.includes('highlight')) return '亮点标签';
    if (parts.includes('tag')) return '项目标签';
    return labels[parts[parts.length - 1]] || getText(key).slice(0, 20) || key;
  }

  function sectionForKey(key) { return key.split('.')[0]; }
  function styleForKey(key) {
    draft.styles.elements[key] = draft.styles.elements[key] || {};
    return draft.styles.elements[key];
  }

  function createTreeItem(key, label) {
    var button = el('button', 'tree-item');
    button.type = 'button';
    button.setAttribute('data-key', key);
    button.setAttribute('aria-current', key === selectedKey ? 'true' : 'false');
    button.appendChild(el('span', '', label));
    button.appendChild(el('small', '', getText(key).replace(/\s+/g, ' ').slice(0, 18)));
    button.addEventListener('click', function () { selectKey(key, true); });
    return button;
  }

  function createToolItem(tool, label, description) {
    var button = el('button', 'tree-item tree-tool');
    button.type = 'button';
    button.setAttribute('data-tool', tool);
    button.setAttribute('aria-current', tool === selectedTool ? 'true' : 'false');
    button.appendChild(el('span', '', label));
    button.appendChild(el('small', '', description));
    button.addEventListener('click', function () { selectTool(tool); });
    return button;
  }

  function recordActions(kind, id, list, index, onAddChild) {
    var actions = el('div', 'tree-record-actions');
    [
      ['上移', -1],
      ['下移', 1]
    ].forEach(function (entry) {
      var button = el('button', '', entry[0]);
      button.type = 'button';
      button.disabled = index + entry[1] < 0 || index + entry[1] >= list.length;
      button.addEventListener('click', function (event) {
        event.preventDefault();
        mutate('move:' + kind + ':' + id, function () {
          var next = index + entry[1];
          var item = list.splice(index, 1)[0];
          list.splice(next, 0, item);
        }, true, true);
      });
      actions.appendChild(button);
    });
    if (onAddChild) {
      var add = el('button', '', '新增标签');
      add.type = 'button';
      add.addEventListener('click', function (event) { event.preventDefault(); onAddChild(); });
      actions.appendChild(add);
    }
    var remove = el('button', '', '删除');
    remove.type = 'button';
    remove.addEventListener('click', function (event) {
      event.preventDefault();
      if (!window.confirm('确定删除这条内容吗？')) return;
      mutate('delete:' + kind + ':' + id, function () {
        list.splice(index, 1);
        selectedKey = null;
      }, true, true);
    });
    actions.appendChild(remove);
    return actions;
  }

  function createRecord(label, items, actions) {
    var details = el('details', 'tree-record');
    if (items.some(function (item) { return item.key === selectedKey; })) details.open = true;
    details.appendChild(el('summary', '', label));
    var itemBox = el('div', 'tree-items');
    items.forEach(function (item) { itemBox.appendChild(createTreeItem(item.key, item.label)); });
    details.appendChild(itemBox);
    if (actions) details.appendChild(actions);
    return details;
  }

  function createSection(title, records, items, addLabel, addAction) {
    var details = el('details', 'tree-section');
    var containsSelection = (items || []).some(function (item) { return item.key === selectedKey; }) ||
      (records || []).some(function (record) {
        return !!(selectedKey && record.querySelector('[data-key="' + selectedKey + '"]'));
      });
    details.open = containsSelection;
    details.appendChild(el('summary', '', title));
    var body = el('div');
    if (items && items.length) {
      var itemBox = el('div', 'tree-items');
      items.forEach(function (item) { itemBox.appendChild(createTreeItem(item.key, item.label)); });
      body.appendChild(itemBox);
    }
    (records || []).forEach(function (record) { body.appendChild(record); });
    if (addAction) {
      var add = el('button', 'tree-add', addLabel);
      add.type = 'button';
      add.addEventListener('click', addAction);
      body.appendChild(add);
    }
    details.appendChild(body);
    return details;
  }

  function addProject() {
    mutate('add:project', function () {
      var id = window.SiteConfig.uniqueId('new-project', draft.content.projects.map(function (item) { return item.id; }), 'new-project');
      draft.content.projects.push({
        id: id, title: '新项目', description: '请输入项目介绍', tags: [{ id: 'tag-1', text: '新标签' }],
        status: 'planned', link: '', icon: '', image: ''
      });
      selectedKey = 'projects.' + id + '.title';
    }, true, true);
  }
  function addExperience() {
    mutate('add:experience', function () {
      var id = window.SiteConfig.uniqueId('new-experience', draft.content.experiences.map(function (item) { return item.id; }), 'new-experience');
      draft.content.experiences.push({
        id: id, period: '时间', title: '职位', company: '公司', type: 'work',
        description: '请输入经历描述', highlights: [{ id: 'highlight-1', text: '新亮点' }]
      });
      selectedKey = 'resume.' + id + '.title';
    }, true, true);
  }
  function addSkill() {
    mutate('add:skill', function () {
      var id = window.SiteConfig.uniqueId('new-skill', draft.content.about.skills.map(function (item) { return item.id; }), 'new-skill');
      draft.content.about.skills.push({ id: id, name: 'New Skill', level: 50, category: 'ai', color: '#b388ff' });
      selectedKey = 'about.skills.' + id;
    }, true, true);
  }

  function buildTree() {
    var root = byId('structureTree');
    root.textContent = '';
    root.appendChild(createSection('导航', [], [
      { key: 'nav.brand', label: '站点名称' }
    ].concat(draft.content.nav.map(function (item) {
      return { key: 'nav.' + item.id, label: item.label + ' 导航' };
    }))));
    root.appendChild(createSection('Hero', [], [
      { key: 'hero.title', label: '姓名' },
      { key: 'hero.subtitle', label: '身份介绍' },
      { key: 'hero.description', label: '个人简介' },
      { key: 'hero.scrollHint', label: '下滑提示' }
    ]));

    var statRecords = draft.content.about.stats.map(function (stat) {
      return createRecord(stat.name, [
        { key: 'about.stats.' + stat.id + '.name', label: '属性名称' },
        { key: 'about.stats.' + stat.id + '.value', label: '属性数值' }
      ]);
    });
    var skillRecords = draft.content.about.skills.map(function (skill, index, list) {
      return createRecord(skill.name, [{ key: 'about.skills.' + skill.id, label: '技能文字' }],
        recordActions('skill', skill.id, list, index));
    });
    root.appendChild(createSection('About', statRecords.concat(skillRecords), [
      { key: 'about.heading', label: '模块标题' },
      { key: 'about.intro', label: '个人介绍' },
      { key: 'about.statsHeading', label: '属性面板标题' },
      { key: 'about.skillsHeading', label: '技能面板标题' }
    ], '新增技能', addSkill));

    var projectRecords = draft.content.projects.map(function (project, index, list) {
      var items = [
        { key: 'projects.' + project.id + '.title', label: '项目标题' },
        { key: 'projects.' + project.id + '.description', label: '项目介绍' },
        { key: 'projects.' + project.id + '.status', label: '状态' }
      ].concat((project.tags || []).map(function (tag) {
        return { key: 'projects.' + project.id + '.tag.' + tag.id, label: '标签 · ' + tag.text };
      }));
      return createRecord(project.title, items, recordActions('project', project.id, list, index, function () {
        mutate('add:project-tag:' + project.id, function () {
          var used = project.tags.map(function (item) { return item.id; });
          var tagId = window.SiteConfig.uniqueId('tag', used, 'tag');
          project.tags.push({ id: tagId, text: '新标签' });
          selectedKey = 'projects.' + project.id + '.tag.' + tagId;
        }, true, true);
      }));
    });
    root.appendChild(createSection('Projects', projectRecords, [
      { key: 'projects.heading', label: '模块标题' },
      { key: 'projects.subtitle', label: '模块副标题' }
    ], '新增项目', addProject));

    var resumeRecords = draft.content.experiences.map(function (experience, index, list) {
      var items = [
        { key: 'resume.' + experience.id + '.period', label: '时间' },
        { key: 'resume.' + experience.id + '.title', label: '职位/学位' },
        { key: 'resume.' + experience.id + '.company', label: '公司/学校' },
        { key: 'resume.' + experience.id + '.desc', label: '描述' }
      ].concat((experience.highlights || []).map(function (highlight) {
        return { key: 'resume.' + experience.id + '.highlight.' + highlight.id, label: '亮点 · ' + highlight.text };
      }));
      return createRecord(experience.company + ' · ' + experience.title, items,
        recordActions('experience', experience.id, list, index, function () {
          mutate('add:highlight:' + experience.id, function () {
            var used = experience.highlights.map(function (item) { return item.id; });
            var highlightId = window.SiteConfig.uniqueId('highlight', used, 'highlight');
            experience.highlights.push({ id: highlightId, text: '新亮点' });
            selectedKey = 'resume.' + experience.id + '.highlight.' + highlightId;
          }, true, true);
        }));
    });
    root.appendChild(createSection('Resume', resumeRecords, [
      { key: 'resume.heading', label: '模块标题' },
      { key: 'resume.subtitle', label: '模块副标题' }
    ], '新增经历', addExperience));

    root.appendChild(createSection('Terminal', [], [
      { key: 'terminal.heading', label: '模块标题' },
      { key: 'terminal.subtitle', label: '模块副标题' },
      { key: 'terminal.title', label: '窗口标题' },
      { key: 'terminal.intro', label: '开场提示' },
      { key: 'terminal.prompt', label: '命令提示符' },
      { key: 'terminal.inputPlaceholder', label: '输入框提示' }
    ]));
    root.appendChild(createSection('页脚', [], [
      { key: 'footer.gameover', label: '结束标题' },
      { key: 'footer.text', label: '版权说明' }
    ]));

    var tools = el('details', 'tree-section');
    tools.open = !!selectedTool;
    tools.appendChild(el('summary', '', '高级工具'));
    var toolItems = el('div', 'tree-items');
    toolItems.appendChild(createToolItem('cursor', '像素光标', '像素预设'));
    toolItems.appendChild(createToolItem('game', '终端小游戏', '参数与即时试玩'));
    toolItems.appendChild(createToolItem('history', '保存历史', '恢复已保存版本'));
    tools.appendChild(toolItems);
    root.appendChild(tools);
  }

  function selectKey(key, focusText) {
    selectedKey = key;
    selectedTool = null;
    byId('selectionBreadcrumb').textContent = key;
    byId('sitePreview').contentWindow.postMessage({ type: 'studio:select', key: key }, window.location.origin);
    buildTree();
    renderElementInspector();
    showInspectorView('element');
    if (focusText) byId('textControl').focus();
  }

  function selectTool(tool) {
    selectedTool = tool;
    selectedKey = null;
    byId('selectionBreadcrumb').textContent = tool === 'game' ? '终端小游戏' :
      tool === 'cursor' ? '像素光标' : '保存历史';
    buildTree();
    showInspectorView(tool);
    if (tool === 'game') scheduleGamePreview(true);
  }

  function parseColor(value) {
    var rgba = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/i.exec(value || '');
    if (rgba) {
      return {
        hex: '#' + [rgba[1], rgba[2], rgba[3]].map(function (item) {
          return Number(item).toString(16).padStart(2, '0');
        }).join(''),
        opacity: Math.round((rgba[4] === undefined ? 1 : Number(rgba[4])) * 100)
      };
    }
    return { hex: /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#e0e0e0', opacity: 100 };
  }
  function rgba(hex, opacity) {
    var safe = hex.replace('#', '');
    var values = [0, 2, 4].map(function (index) { return parseInt(safe.slice(index, index + 2), 16); });
    return Number(opacity) >= 100 ? '#' + safe : 'rgba(' + values.join(', ') + ', ' + (Number(opacity) / 100).toFixed(2) + ')';
  }
  function luminance(hex) {
    var rgb = [1, 3, 5].map(function (index) {
      var value = parseInt(hex.slice(index, index + 2), 16) / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  function updateContrast(hex) {
    var background = draft.theme.colors.bgDeep || '#0a0a0a';
    var ratio = (Math.max(luminance(hex), luminance(background)) + 0.05) /
      (Math.min(luminance(hex), luminance(background)) + 0.05);
    var output = byId('contrastOutput');
    output.textContent = ratio >= 4.5
      ? '文字清晰易读 · 对比度 ' + ratio.toFixed(1) + ':1'
      : '文字不够清晰 · 建议选择与背景差异更大的颜色（对比度 ' + ratio.toFixed(1) + ':1）';
    output.setAttribute('data-pass', ratio >= 4.5 ? 'true' : 'false');
  }

  function renderElementInspector() {
    var empty = byId('emptySelection');
    var form = byId('elementForm');
    if (!selectedKey) { empty.hidden = false; form.hidden = true; return; }
    empty.hidden = true;
    form.hidden = false;
    var style = draft.styles.elements[selectedKey] || {};
    var defaults = selectionDefaults[selectedKey] || {};
    var defaultGradient = defaults.defaultGradient || (defaults.colorMode === 'gradient' ? defaults.gradient : '');
    var usesDefaultGradient = !!defaultGradient && !style.color;
    var parsed = parseColor(style.color || defaults.color || draft.theme.colors.text);
    byId('elementScope').textContent = sectionForKey(selectedKey) + ' / ' + selectedKey.split('.').slice(1, -1).join(' / ');
    byId('elementLabel').textContent = keyLabel(selectedKey);
    var currentText = getText(selectedKey);
    byId('textControl').value = currentText;
    var hasChinese = /[\u3400-\u9fff]/.test(currentText);
    var hasLatin = /[A-Za-z]/.test(currentText);
    byId('fontCnField').hidden = !hasChinese && hasLatin;
    byId('fontEnField').hidden = !hasLatin && hasChinese;
    byId('fontCnControl').value = style.fontCn || defaults.fontCn || 'zpix';
    byId('fontEnControl').value = style.fontEn || defaults.fontEn || 'vt323';
    byId('sizeControl').value = style.size || defaults.size || 16;
    byId('lineHeightControl').value = style.lineHeight || defaults.lineHeight || 1.5;
    byId('boldControl').checked = (style.weight || defaults.weight || 400) >= 600;
    byId('italicControl').checked = style.italic !== undefined ? style.italic === true : defaults.italic === true;
    var alignValue = style.align || defaults.align || 'left';
    var alignInput = document.querySelector('input[name="alignControl"][value="' + alignValue + '"]');
    if (alignInput) alignInput.checked = true;
    var letterSpacing = style.letterSpacing !== undefined ? style.letterSpacing : (defaults.letterSpacing || 0);
    byId('letterSpacingControl').value = letterSpacing;
    byId('letterSpacingOutput').textContent = letterSpacing + 'px';
    byId('colorControl').value = parsed.hex;
    byId('colorHexControl').value = parsed.hex;
    byId('opacityControl').value = parsed.opacity;
    byId('opacityOutput').textContent = parsed.opacity + '%';
    byId('gradientColorNotice').hidden = !usesDefaultGradient;
    byId('gradientColorPreview').style.backgroundImage = usesDefaultGradient ? defaultGradient : '';
    byId('solidColorLabel').textContent = usesDefaultGradient ? '改为单色' : '文字颜色';
    byId('solidHexLabel').textContent = usesDefaultGradient ? '单色颜色值（HEX）' : '颜色值（HEX）';
    byId('opacityLabel').textContent = usesDefaultGradient ? '单色透明度' : '透明度';
    byId('restoreGradientButton').hidden = !defaultGradient || !style.color;
    if (usesDefaultGradient) {
      byId('contrastOutput').textContent = '当前使用渐变色；改成单色后，这里会提示文字是否容易看清。';
      byId('contrastOutput').removeAttribute('data-pass');
    } else {
      updateContrast(parsed.hex);
    }
    var linked = linkedColorTarget(selectedKey);
    byId('linkedColorControls').hidden = !linked;
    if (linked) {
      byId('linkedColorLabel').textContent = linked.label;
      byId('linkedColorControl').value = linked.get();
    }
  }

  function linkedColorTarget(key) {
    var parts = String(key || '').split('.');
    if (parts[0] === 'about' && parts[1] === 'stats') {
      var stat = findById(draft.content.about.stats, parts[2]);
      if (!stat) return null;
      return {
        label: '属性进度色块颜色',
        get: function () { return stat.color || '#4285F4'; },
        set: function (value) { stat.color = value; }
      };
    }
    if (parts[0] === 'about' && parts[1] === 'skills') {
      var skill = findById(draft.content.about.skills, parts[2]);
      if (!skill) return null;
      return {
        label: '技能分类色块颜色',
        get: function () { return skill.color || '#b388ff'; },
        set: function (value) { skill.color = value; }
      };
    }
    return null;
  }

  function bindElementControls() {
    byId('textControl').addEventListener('input', function () {
      if (!selectedKey) return;
      mutate('text:' + selectedKey, function () { setText(selectedKey, byId('textControl').value); });
    });
    byId('textControl').addEventListener('blur', function () {
      endChange();
      buildTree();
    });
    [
      ['fontCnControl', 'fontCn', 'change'],
      ['fontEnControl', 'fontEn', 'change'],
      ['lineHeightControl', 'lineHeight', 'input'],
      ['letterSpacingControl', 'letterSpacing', 'input']
    ].forEach(function (entry) {
      byId(entry[0]).addEventListener(entry[2], function () {
        if (!selectedKey) return;
        var value = byId(entry[0]).value;
        if (['lineHeight', 'weight', 'letterSpacing'].includes(entry[1])) value = Number(value);
        mutate('style:' + selectedKey + ':' + entry[1], function () {
          var style = styleForKey(selectedKey);
          if (value === '') delete style[entry[1]];
          else style[entry[1]] = value;
        });
      });
      byId(entry[0]).addEventListener('change', endChange);
    });
    byId('sizeControl').addEventListener('input', function () {
      mutate('style:' + selectedKey + ':size', function () { styleForKey(selectedKey).size = Number(byId('sizeControl').value); });
    });
    byId('sizeControl').addEventListener('change', endChange);
    byId('boldControl').addEventListener('change', function () {
      mutate('style:' + selectedKey + ':bold', function () {
        styleForKey(selectedKey).weight = byId('boldControl').checked ? 700 : 400;
      });
      endChange();
    });
    byId('italicControl').addEventListener('change', function () {
      mutate('style:' + selectedKey + ':italic', function () { styleForKey(selectedKey).italic = byId('italicControl').checked; });
      endChange();
    });
    document.querySelectorAll('input[name="alignControl"]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!selectedKey || !input.checked) return;
        mutate('style:' + selectedKey + ':align', function () {
          styleForKey(selectedKey).align = input.value;
        });
        endChange();
      });
    });
    function updateElementColor(group) {
      var hex = byId('colorControl').value;
      var opacity = Number(byId('opacityControl').value);
      byId('colorHexControl').value = hex;
      byId('opacityOutput').textContent = opacity + '%';
      updateContrast(hex);
      mutate(group, function () { styleForKey(selectedKey).color = rgba(hex, opacity); }, false, true);
    }
    byId('colorControl').addEventListener('input', function () { updateElementColor('style:' + selectedKey + ':color'); });
    byId('opacityControl').addEventListener('input', function () { updateElementColor('style:' + selectedKey + ':opacity'); });
    byId('colorHexControl').addEventListener('change', function () {
      if (!/^#[0-9a-f]{6}$/i.test(this.value)) { this.value = byId('colorControl').value; return; }
      byId('colorControl').value = this.value;
      updateElementColor('style:' + selectedKey + ':color');
      endChange();
    });
    byId('linkedColorControl').addEventListener('input', function () {
      var target = linkedColorTarget(selectedKey);
      if (!target) return;
      mutate('linked-color:' + selectedKey, function () { target.set(byId('linkedColorControl').value); });
    });
    byId('restoreGradientButton').addEventListener('click', function () {
      if (!selectedKey) return;
      mutate('style:' + selectedKey + ':restore-gradient', function () {
        delete styleForKey(selectedKey).color;
      }, true, true);
    });
    byId('resetElementButton').addEventListener('click', function () {
      mutate('reset:' + selectedKey, function () {
        delete draft.styles.elements[selectedKey];
        if (draft.content.overrides && draft.content.overrides.text) delete draft.content.overrides.text[selectedKey];
      }, true, true);
    });
    byId('resetSectionButton').addEventListener('click', function () {
      var prefix = sectionForKey(selectedKey) + '.';
      mutate('reset-section:' + prefix, function () {
        Object.keys(draft.styles.elements).forEach(function (key) {
          if (key.indexOf(prefix) === 0) delete draft.styles.elements[key];
        });
      }, false, true);
    });
    var swatches = byId('elementColorSwatches');
    ['#e0e0e0', '#888888', '#4285F4', '#EA4335', '#FBBC05', '#34A853', '#00ff41', '#b388ff'].forEach(function (value) {
      var button = el('button', 'color-swatch');
      button.type = 'button';
      button.style.background = value;
      button.title = value;
      button.addEventListener('click', function () {
        byId('colorControl').value = value;
        byId('colorHexControl').value = value;
        byId('opacityControl').value = 100;
        mutate('style:' + selectedKey + ':color', function () {
          styleForKey(selectedKey).color = value;
        }, false, true);
        endChange();
      });
      swatches.appendChild(button);
    });
  }

  function showInspectorView(name) {
    document.querySelectorAll('.inspector-view').forEach(function (view) {
      view.hidden = view.getAttribute('data-view') !== name;
    });
    if (name === 'cursor') renderCursor();
    if (name === 'game') renderGame();
    if (name === 'history') loadHistory();
  }
  function renderCurrentView() {
    var view = selectedTool || 'element';
    showInspectorView(view);
    if (view === 'element') renderElementInspector();
  }

  function pixelCursorValue(preset) {
    var shapes = {
      'pixel-arrow': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><path fill="#080812" stroke="#b388ff" stroke-width="2" d="M2 2v16l5-5 4 9 4-2-4-8h8z"/></svg>',
      'pixel-hand': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><path fill="#080812" stroke="#fbbc05" stroke-width="2" d="M7 3h4v7h2V6h3v5h2V8h3v9l-4 5H8l-5-8v-3h3l2 3z"/></svg>',
      'pixel-crosshair': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><path stroke="#00ff41" stroke-width="2" d="M12 1v7M12 16v7M1 12h7M16 12h7"/><rect x="9" y="9" width="6" height="6" fill="none" stroke="#00ff41" stroke-width="2"/></svg>',
      'pixel-terminal': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><rect x="9" y="2" width="6" height="20" fill="#080812" stroke="#41d9ff" stroke-width="2"/><path stroke="#41d9ff" stroke-width="2" d="M5 2h14M5 22h14"/></svg>',
      'pixel-outline': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" shape-rendering="crispEdges"><rect x="2" y="2" width="20" height="20" fill="none" stroke="#b388ff" stroke-width="2"/><rect x="10" y="10" width="4" height="4" fill="#b388ff"/></svg>'
    };
    var svg = shapes[preset] || shapes['pixel-arrow'];
    var hotspot = preset === 'pixel-arrow' || preset === 'pixel-hand' ? '2 2' : '12 12';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + hotspot + ', auto';
  }

  function renderCursor() {
    byId('cursorPresetControl').value = draft.cursor.preset;
    byId('cursorPreview').style.cursor = pixelCursorValue(draft.cursor.preset);
  }

  function startGamePreview() {
    if (!previewReady || selectedTool !== 'game' || !gameError().valid) return;
    byId('sitePreview').contentWindow.postMessage({
      type: 'studio:start-game',
      config: draft
    }, window.location.origin);
  }

  function scheduleGamePreview(immediate) {
    window.clearTimeout(gamePreviewTimer);
    gamePreviewTimer = window.setTimeout(startGamePreview, immediate ? 80 : 220);
  }

  function setEditorCollapsed(collapsed) {
    var layout = byId('studioLayout');
    layout.setAttribute('data-editor-collapsed', collapsed ? 'true' : 'false');
    byId('showEditorButton').hidden = !collapsed;
  }

  function gameError() {
    var validation = window.SiteConfig.validateConfig(draft);
    var output = byId('gameValidation');
    output.textContent = validation.valid ? '参数有效，可以保存并试玩。' : validation.errors.join('；');
    output.setAttribute('data-state', validation.valid ? 'success' : 'error');
    return validation;
  }
  function renderGame() {
    var map = {
      gameStartSpeed: 'startSpeed', gameMaxSpeed: 'maxSpeed', gameSpeedStep: 'speedStep',
      gameSpeedFrames: 'speedEveryFrames', gameJumpVelocity: 'jumpVelocity', gameRiseGravity: 'riseGravity',
      gameFallGravity: 'fallGravity', gameHangFrames: 'hangFrames',
      gameAnticipation: 'anticipationFrames', gameLanding: 'landingFrames',
      gameMaxObstacles: 'maxObstacles', gameMinGap: 'minObstacleGap', gameMaxGap: 'maxObstacleGap'
    };
    Object.keys(map).forEach(function (id) { byId(id).value = draft.game[map[id]]; });
    renderSequences();
    gameError();
  }
  function renderSequences() {
    var root = byId('sequenceEditor');
    root.textContent = '';
    draft.game.sequences.forEach(function (sequence, sequenceIndex) {
      var card = el('div', 'sequence-card');
      var head = el('div', 'sequence-card-head');
      var name = document.createElement('input');
      name.type = 'text';
      name.value = sequence.name;
      name.addEventListener('input', function () {
        mutate('sequence-name:' + sequence.id, function () {
          var current = findById(draft.game.sequences, sequence.id);
          if (current) current.name = name.value;
        });
      });
      name.addEventListener('blur', endChange);
      var enabledLabel = el('label');
      var enabled = document.createElement('input');
      enabled.type = 'checkbox';
      enabled.checked = sequence.enabled;
      enabled.addEventListener('change', function () {
        mutate('sequence-enabled:' + sequence.id, function () {
          var current = findById(draft.game.sequences, sequence.id);
          if (current) current.enabled = enabled.checked;
        });
        gameError();
      });
      enabledLabel.appendChild(enabled);
      enabledLabel.appendChild(document.createTextNode(' 启用'));
      var remove = el('button', '', '删除');
      remove.type = 'button';
      remove.addEventListener('click', function () {
        mutate('sequence-delete:' + sequence.id, function () { draft.game.sequences.splice(sequenceIndex, 1); }, false, true);
      });
      head.appendChild(name); head.appendChild(enabledLabel); head.appendChild(remove);
      card.appendChild(head);

      var weightLabel = el('label', 'studio-field');
      weightLabel.appendChild(el('span', '', '出现权重'));
      var weight = document.createElement('input');
      weight.type = 'number'; weight.min = '1'; weight.max = '10'; weight.value = sequence.weight;
      weight.addEventListener('input', function () {
        mutate('sequence-weight:' + sequence.id, function () {
          var current = findById(draft.game.sequences, sequence.id);
          if (current) current.weight = Number(weight.value);
        });
        var normalized = findById(draft.game.sequences, sequence.id);
        if (normalized) weight.value = normalized.weight;
        gameError();
      });
      weightLabel.appendChild(weight);
      card.appendChild(weightLabel);

      var items = el('div', 'sequence-items');
      sequence.items.forEach(function (item, itemIndex) {
        var row = el('div', 'sequence-item');
        var type = document.createElement('select');
        [['cactus-small', '小仙人掌'], ['cactus-big', '大仙人掌']].forEach(function (entry) {
          var option = el('option', '', entry[1]); option.value = entry[0]; type.appendChild(option);
        });
        type.value = item.type;
        type.addEventListener('change', function () {
          mutate('sequence-type:' + sequence.id + ':' + itemIndex, function () {
            var current = findById(draft.game.sequences, sequence.id);
            if (current && current.items[itemIndex]) current.items[itemIndex].type = type.value;
          });
          gameError();
        });
        var gap = document.createElement('input');
        gap.type = 'number'; gap.min = '24'; gap.max = '220'; gap.step = '2';
        gap.value = item.gap || 40; gap.title = '与下一个障碍的内部间距';
        gap.disabled = itemIndex === sequence.items.length - 1;
        gap.addEventListener('input', function () {
          mutate('sequence-gap:' + sequence.id + ':' + itemIndex, function () {
            var current = findById(draft.game.sequences, sequence.id);
            if (current && current.items[itemIndex]) current.items[itemIndex].gap = Number(gap.value);
          });
          var normalized = findById(draft.game.sequences, sequence.id);
          if (normalized && normalized.items[itemIndex]) gap.value = normalized.items[itemIndex].gap;
          gameError();
        });
        var removeItem = el('button', '', '移除');
        removeItem.type = 'button';
        removeItem.disabled = sequence.items.length <= 1;
        removeItem.addEventListener('click', function () {
          mutate('sequence-item-delete:' + sequence.id + ':' + itemIndex, function () {
            var current = findById(draft.game.sequences, sequence.id);
            if (current) current.items.splice(itemIndex, 1);
          }, false, true);
        });
        row.appendChild(type); row.appendChild(gap); row.appendChild(removeItem);
        items.appendChild(row);
      });
      var addItem = el('button', '', '添加障碍');
      addItem.type = 'button';
      addItem.disabled = sequence.items.length >= 4;
      addItem.addEventListener('click', function () {
        mutate('sequence-item-add:' + sequence.id, function () {
          var current = findById(draft.game.sequences, sequence.id);
          if (!current) return;
          if (current.items.length) current.items[current.items.length - 1].gap = 40;
          current.items.push({ type: 'cactus-small', gap: 0 });
        }, false, true);
      });
      items.appendChild(addItem);
      card.appendChild(items);
      root.appendChild(card);
    });
  }

  function loadHistory() {
    requestJson('/api/history').then(function (payload) {
      var root = byId('historyList');
      root.textContent = '';
      if (!payload.history.length) root.appendChild(el('p', 'view-help', '还没有已保存历史。'));
      payload.history.forEach(function (entry) {
        var row = el('div', 'history-entry');
        var info = el('div');
        info.appendChild(el('strong', '', new Date(entry.savedAt).toLocaleString('zh-CN')));
        info.appendChild(el('small', '', Math.round(entry.size / 1024) + ' KB'));
        var button = el('button', '', '恢复');
        button.type = 'button';
        button.addEventListener('click', function () {
          if (!window.confirm('恢复这个已保存版本吗？当前正式配置会先自动备份。')) return;
          requestJson('/api/history/restore', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id })
          }).then(function (restored) {
            savedConfig = restored.config;
            draft = clone(savedConfig);
            localStorage.removeItem(DRAFT_KEY);
            undoStack = [];
            sendDraft();
            buildTree();
            renderCurrentView();
            setStatus('已恢复历史版本', false);
            toast('历史版本已恢复');
            loadHistory();
          }).catch(function (error) { toast(error.message); });
        });
        row.appendChild(info); row.appendChild(button); root.appendChild(row);
      });
    }).catch(function (error) { toast(error.message); });
  }

  function saveFormal() {
    var validation = window.SiteConfig.validateConfig(draft);
    if (!validation.valid) { toast(validation.errors.join('；')); selectTool('game'); return; }
    byId('saveButton').disabled = true;
    setStatus('正在保存…', true);
    requestJson('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: draft })
    }).then(function (payload) {
      savedConfig = payload.config;
      draft = clone(savedConfig);
      localStorage.removeItem(DRAFT_KEY);
      undoStack = [];
      byId('undoButton').disabled = true;
      setStatus('已保存到网站配置', false);
      toast('保存成功，公开主页已更新');
      loadHistory();
    }).catch(function (error) {
      setStatus('保存失败', true);
      toast(error.message);
    }).finally(function () { byId('saveButton').disabled = false; });
  }

  function bindGlobalControls() {
    byId('undoButton').addEventListener('click', undo);
    byId('discardDraftButton').addEventListener('click', discardDraft);
    byId('saveButton').addEventListener('click', saveFormal);
    byId('collapseTreeButton').addEventListener('click', function () {
      document.querySelectorAll('.studio-tree details').forEach(function (details) { details.open = false; });
    });
    byId('hideEditorButton').addEventListener('click', function () { setEditorCollapsed(true); });
    byId('showEditorButton').addEventListener('click', function () { setEditorCollapsed(false); });

    var cursorPresets = {
      'pixel-arrow': '像素箭头',
      'pixel-hand': '像素手型',
      'pixel-crosshair': '像素准星',
      'pixel-terminal': '像素终端',
      'pixel-outline': '像素方框'
    };
    Object.keys(cursorPresets).forEach(function (key) {
      var option = el('option', '', cursorPresets[key]); option.value = key; byId('cursorPresetControl').appendChild(option);
    });
    byId('cursorPresetControl').addEventListener('change', function () {
      mutate('cursor:preset', function () {
        draft.cursor.preset = byId('cursorPresetControl').value;
        draft.cursor.src = '';
      });
      renderCursor();
      endChange();
    });

    var gameMap = {
      gameStartSpeed: 'startSpeed', gameMaxSpeed: 'maxSpeed', gameSpeedStep: 'speedStep',
      gameSpeedFrames: 'speedEveryFrames', gameJumpVelocity: 'jumpVelocity', gameRiseGravity: 'riseGravity',
      gameFallGravity: 'fallGravity', gameHangFrames: 'hangFrames',
      gameAnticipation: 'anticipationFrames', gameLanding: 'landingFrames',
      gameMaxObstacles: 'maxObstacles', gameMinGap: 'minObstacleGap', gameMaxGap: 'maxObstacleGap'
    };
    Object.keys(gameMap).forEach(function (id) {
      byId(id).addEventListener('input', function () {
        mutate('game:' + gameMap[id], function () { draft.game[gameMap[id]] = Number(byId(id).value); });
        byId(id).value = draft.game[gameMap[id]];
        gameError();
        scheduleGamePreview(false);
      });
      byId(id).addEventListener('change', endChange);
    });
    byId('addSequenceButton').addEventListener('click', function () {
      mutate('sequence:add', function () {
        var id = window.SiteConfig.uniqueId('sequence', draft.game.sequences.map(function (item) { return item.id; }), 'sequence');
        draft.game.sequences.push({ id: id, name: '新障碍组合', enabled: true, weight: 1, items: [{ type: 'cactus-small', gap: 0 }] });
      }, false, true);
      scheduleGamePreview(false);
    });
    byId('testGameButton').addEventListener('click', function () {
      if (!gameError().valid) return;
      startGamePreview();
      toast('左侧预览已定位终端并重新试玩');
    });
    byId('refreshHistoryButton').addEventListener('click', loadHistory);

  }

  function init() {
    requestJson('/api/config').then(function (payload) {
      savedConfig = window.SiteConfig.normalizeConfig(payload.config, payload.config);
      var local = null;
      try { local = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (error) { local = null; }
      draft = local ? window.SiteConfig.normalizeConfig(local, savedConfig) : clone(savedConfig);
      if (local && sameConfig(draft, savedConfig)) {
        localStorage.removeItem(DRAFT_KEY);
        local = null;
        draft = clone(savedConfig);
      }
      setStatus(local ? '已恢复未保存草稿' : '已载入正式配置', !!local);
      buildTree();
      bindElementControls();
      bindGlobalControls();
      renderCurrentView();
    }).catch(function (error) {
      document.body.textContent = '编辑器启动失败：' + error.message + '。请通过 start-editor.cmd 打开。';
    });
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || event.source !== byId('sitePreview').contentWindow || !event.data) return;
    if (event.data.type === 'studio:preview-ready') {
      previewReady = true;
      sendDraft();
      if (selectedTool === 'game') scheduleGamePreview(true);
    } else if (event.data.type === 'studio:select' && event.data.key) {
      selectKey(event.data.key, false);
    } else if (event.data.type === 'studio:selection-style' && event.data.key && event.data.style) {
      selectionDefaults[event.data.key] = event.data.style;
      if (selectedKey === event.data.key) renderElementInspector();
    }
  });

  init();
})();
