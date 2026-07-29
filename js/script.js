// ============================================================
//  极客像素个人网站 — 渲染引擎 & 交互
// ============================================================

(function () {
  'use strict';

  var activeGameCleanup = null;

  // ========== 初始化导航 ==========
  function renderNav() {
    var container = document.getElementById('navLinks');
    if (!container) return;
    clearElement(container);
    navItems.forEach(function (item) {
      var a = document.createElement('a');
      a.className = 'nav-link';
      setEditKey(a, 'nav.' + item.id, item.label, item.label + ' 导航', false, 'text-en-display');
      a.href = '#' + item.id;
      a.lang = 'en';
      a.textContent = item.label;
      a.style.color = item.color;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (document.documentElement.getAttribute('data-site-studio-editing') === 'true') return;
        var target = document.getElementById(item.id);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        setActiveNav(item.id);
      });
      container.appendChild(a);
    });
  }

  // 滚动时高亮当前 section 的导航
  function setActiveNav(currentId) {
    var links = document.querySelectorAll('.nav-link');
    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === '#' + currentId) {
        link.classList.add('active');
        link.style.color = '';
      } else {
        link.classList.remove('active');
        // restore original color from navItems
        var item = navItems.find(function (n) { return '#' + n.id === href; });
        if (item) link.style.color = item.color;
      }
    });
  }

  function handleScroll() {
    var sections = document.querySelectorAll('.section, .hero');
    var scrollPos = window.scrollY + window.innerHeight / 3;
    var current = 'hero';
    sections.forEach(function (sec) {
      if (sec.offsetTop <= scrollPos) {
        current = sec.id || 'hero';
      }
    });
    setActiveNav(current);
  }

  function clearElement(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function setEditKey(element, key, sourceText, label, multiline, englishClass) {
    if (!element) return;
    element.setAttribute('data-edit-key', key);
    element.setAttribute('data-edit-section', key.split('.')[0]);
    element.setAttribute('data-edit-label', label || key);
    if (typeof sourceText === 'string') element.setAttribute('data-edit-source', sourceText);
    if (multiline) element.setAttribute('data-edit-multiline', 'true');
    if (englishClass) element.setAttribute('data-edit-english-class', englishClass);
  }

  function splitTextByLanguage(value) {
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
      var next = language;
      if (/[A-Za-z0-9_+#@&/.-]/.test(character)) next = 'en';
      else if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(character)) next = 'zh-CN';
      if (current && next !== language) flush();
      language = next;
      current += character;
    });
    flush();
    return parts;
  }

  // 将文字片段转为安全的 DOM 节点，并确保中英文可以分别设置字体。
  function renderTextParts(target, content, englishClass) {
    var parts = typeof content === 'string' ? splitTextByLanguage(content) : content;
    clearElement(target);
    (parts || []).forEach(function (part) {
      var span = document.createElement('span');
      span.textContent = part.text;
      if (part.lang) {
        span.lang = part.lang;
        span.className = part.lang === 'zh-CN' ? 'text-cn' : (englishClass || 'text-en-body');
      }
      span.setAttribute('data-studio-text-part', 'true');
      target.appendChild(span);
    });
  }

  function partsToText(content) {
    if (typeof content === 'string') return content;
    return (content || []).map(function (part) { return part.text; }).join('');
  }

  // ========== Hero 渲染 ==========
  function renderHero() {
    var avatarEl = document.getElementById('heroAvatar');
    if (!avatarEl) return;
    if (window.__heroAvatarController) {
      window.removeEventListener('scroll', window.__heroAvatarController.onScroll);
      window.__heroAvatarController = null;
    }
    clearElement(avatarEl);

    var img = document.createElement('img');
    img.src = window.siteConfig && window.siteConfig.assets && window.siteConfig.assets.heroStand
      ? window.siteConfig.assets.heroStand : 'selfie_stand.png';
    img.alt = user.name;
    avatarEl.appendChild(img);
    var avatar = window.SiteBehaviors && window.SiteBehaviors.createAvatarController
      ? window.SiteBehaviors.createAvatarController(img, function () { return window.scrollY; }, {
          threshold: window.siteConfig && window.siteConfig.effects
            ? window.siteConfig.effects.avatarScrollThreshold : 10,
          standSrc: window.siteConfig && window.siteConfig.assets
            ? window.siteConfig.assets.heroStand : 'selfie_stand.png',
          jumpSrc: window.siteConfig && window.siteConfig.assets
            ? window.siteConfig.assets.heroJump : 'selfie_jump.png'
        })
      : null;
    if (avatar) {
      window.__heroAvatarController = avatar;
      img.addEventListener('click', avatar.toggle);
      window.addEventListener('scroll', avatar.onScroll, { passive: true });
    }

    var heroTitle = document.getElementById('heroTitle');
    var heroDesc = document.getElementById('heroDesc');
    heroTitle.textContent = user.name;
    heroTitle.setAttribute('lang', 'zh-CN');
    setEditKey(heroTitle, 'hero.title', user.name, '姓名');
    renderTextParts(heroDesc, user.bioParts);
    setEditKey(heroDesc, 'hero.description', partsToText(user.bioParts), '个人简介', true);
    var typeSpeed = window.siteConfig && window.siteConfig.effects
      ? window.siteConfig.effects.typewriterSpeed : 60;
    typeWriter('heroSubtitle', '> ' + user.title, typeSpeed, 'en', 'hero.subtitle', '身份介绍');
  }

  // 打字机效果
  function typeWriter(elementId, text, speed, lang, editKey, editLabel) {
    var el = document.getElementById(elementId);
    if (!el) return;
    if (editKey) setEditKey(el, editKey, text, editLabel || editKey, false, 'text-en-body');
    var i = 0;
    renderFrame('');
    function renderFrame(current) {
      clearElement(el);
      if (current) {
        var text = document.createElement('span');
        text.lang = lang;
        text.className = lang === 'zh-CN' ? 'text-cn' : 'text-en-body';
        text.textContent = current;
        el.appendChild(text);
      }
      var cursor = document.createElement('span');
      cursor.className = 'cursor';
      cursor.setAttribute('data-edit-preserve', 'true');
      el.appendChild(cursor);
    }
    function tick() {
      if (el.getAttribute('data-studio-draft-applied') === 'true') return;
      if (i < text.length) {
        var current = text.substring(0, i + 1);
        renderFrame(current);
        i++;
        setTimeout(tick, speed);
      }
    }
    if (window.SiteRuntime && window.SiteRuntime.isPreview) renderFrame(text);
    else tick();
  }

  // ========== About 渲染 ==========
  function renderAbout() {
    var aboutIntro = document.getElementById('aboutIntro');
    if (aboutIntro) {
      renderTextParts(aboutIntro, about.introParts);
      setEditKey(aboutIntro, 'about.intro', partsToText(about.introParts), '个人介绍', true);
    }

    // 属性条
    var statsContainer = document.getElementById('statsContainer');
    clearElement(statsContainer);
    about.stats.forEach(function (stat, index) {
      var statId = stat.id || String(index);
      var row = document.createElement('div');
      row.className = 'stat-row';
      var label = document.createElement('div');
      label.className = 'stat-label';
      var name = document.createElement('span');
      name.className = 'stat-name';
      renderTextParts(name, [
        { lang: 'en', text: '[' + stat.label + '] ' },
        { lang: 'zh-CN', text: stat.name }
      ]);
      setEditKey(name, 'about.stats.' + statId + '.name', '[' + stat.label + '] ' + stat.name, stat.name + ' · 属性名称');
      var value = document.createElement('span');
      value.className = 'stat-value';
      value.textContent = stat.value + '/100';
      value.style.color = stat.valueColor || '';
      setEditKey(value, 'about.stats.' + statId + '.value', stat.value + '/100', stat.name + ' · 属性数值', false, 'text-en-body');
      label.appendChild(name);
      label.appendChild(value);
      var outer = document.createElement('div');
      outer.className = 'stat-bar-outer';
      var inner = document.createElement('div');
      inner.className = 'stat-bar-inner';
      inner.style.width = '0';
      inner.style.background = stat.color;
      inner.setAttribute('data-width', stat.value + '%');
      outer.appendChild(inner);
      row.appendChild(label);
      row.appendChild(outer);
      statsContainer.appendChild(row);
    });

    // 技能槽
    var skillsContainer = document.getElementById('skillsContainer');
    clearElement(skillsContainer);
    about.skills.forEach(function (skill, index) {
      var skillId = skill.id || String(index);
      var slot = document.createElement('div');
      slot.className = 'skill-slot slot-cat-' + skill.category;
      var dot = document.createElement('span');
      dot.className = 'slot-dot';
      if (skill.color) {
        dot.style.background = skill.color;
        dot.style.borderColor = skill.color;
      }
      slot.appendChild(dot);
      var skillText = document.createElement('span');
      skillText.lang = 'en';
      skillText.textContent = skill.name + ' Lv.' + skill.level;
      setEditKey(skillText, 'about.skills.' + skillId, skill.name + ' Lv.' + skill.level, skill.name + ' · 技能文字', false, 'text-en-display');
      slot.appendChild(skillText);
      skillsContainer.appendChild(slot);
    });
    window.requestAnimationFrame(animateStatBars);
  }

  // 属性条动画
  function animateStatBars() {
    var bars = document.querySelectorAll('.stat-bar-inner');
    bars.forEach(function (bar) {
      var targetWidth = bar.getAttribute('data-width');
      bar.style.width = targetWidth;
    });
  }

  // ========== Projects 渲染 ==========
  function renderProjects() {
    var grid = document.getElementById('projectsGrid');
    if (!grid) return;
    clearElement(grid);

    if (projects.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'project-empty';
      var lock = document.createElement('span');
      lock.className = 'lock-icon';
      lock.textContent = '🔒';
      var question = document.createElement('p');
      question.textContent = '???';
      var hint = document.createElement('p');
      hint.style.marginTop = '8px';
      renderTextParts(hint, [
        { lang: 'en', text: 'QUEST SLOTS — ' },
        { lang: 'zh-CN', text: '暂无项目，等待新的冒险...' }
      ]);
      empty.appendChild(lock);
      empty.appendChild(question);
      empty.appendChild(hint);
      grid.appendChild(empty);
      return;
    }

    projects.forEach(function (proj) {
      var card = document.createElement(proj.link ? 'a' : 'div');
      card.className = 'project-card' + (proj.link ? ' project-card-link' : '');

      if (proj.link) {
        card.href = proj.link;
        card.target = '_blank';
        card.rel = 'noopener';
      }

      card.addEventListener('click', function (event) {
        if (document.documentElement.getAttribute('data-site-studio-editing') === 'true') {
          event.preventDefault();
        }
      });

      var statusText = { done: 'DONE', wip: 'WIP', planned: 'TODO' }[proj.status] || '???';
      var status = document.createElement('span');
      status.className = 'project-status status-' + proj.status;
      status.lang = 'en';
      status.textContent = statusText;
      setEditKey(status, 'projects.' + proj.id + '.status', statusText, proj.title + ' · 状态', false, 'text-en-display');
      var icon = document.createElement(proj.image ? 'img' : 'div');
      icon.className = proj.image ? 'project-image' : 'project-icon';
      if (proj.image) {
        icon.src = proj.image;
        icon.alt = '';
      } else {
        icon.textContent = proj.icon || String.fromCodePoint(0x1f4e6);
      }
      var title = document.createElement('h3');
      title.className = 'project-title';
      var titleCn = document.createElement('span');
      titleCn.className = 'project-title-cn';
      titleCn.lang = 'zh-CN';
      titleCn.textContent = proj.title;
      setEditKey(titleCn, 'projects.' + proj.id + '.title', proj.title, proj.title + ' · 项目标题');
      title.appendChild(titleCn);
      if (proj.titleEn) {
        var titleEn = document.createElement('span');
        titleEn.className = 'project-title-en';
        titleEn.lang = 'en';
        titleEn.textContent = proj.titleEn;
        setEditKey(titleEn, 'projects.' + proj.id + '.titleEn', proj.titleEn, proj.title + ' · 英文标题', false, 'text-en-display');
        title.appendChild(titleEn);
      }
      var desc = document.createElement('p');
      desc.className = 'project-desc';
      renderTextParts(desc, proj.descParts || proj.desc);
      setEditKey(desc, 'projects.' + proj.id + '.description', partsToText(proj.descParts || proj.desc), proj.title + ' · 项目介绍', true);
      var tags = document.createElement('div');
      tags.className = 'project-tags';
      proj.tags.forEach(function (tag, index) {
        var tagItem = proj.tagItems && proj.tagItems[index];
        var tagId = tagItem && tagItem.id ? tagItem.id : String(index);
        var tagEl = document.createElement('span');
        tagEl.className = 'project-tag';
        tagEl.lang = 'en';
        tagEl.textContent = '#' + tag;
        setEditKey(tagEl, 'projects.' + proj.id + '.tag.' + tagId, '#' + tag, proj.title + ' · 标签 ' + (index + 1), false, 'text-en-display');
        tags.appendChild(tagEl);
      });
      card.appendChild(status);
      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(tags);

      grid.appendChild(card);
    });
  }

  // ========== Resume 渲染 ==========
  function renderResume() {
    var timeline = document.getElementById('timeline');
    if (!timeline) return;
    clearElement(timeline);

    experiences.forEach(function (exp, index) {
      var experienceId = exp.id || String(index);
      var node = document.createElement('div');
      node.className = 'timeline-node node-type-' + exp.type;

      var field = document.createElement('div');
      field.className = 'node-period ' + exp.type;
      field.setAttribute('data-edit-unified-font', 'cn');
      renderTextParts(field, exp.periodParts || exp.period);
      setEditKey(field, 'resume.' + experienceId + '.period', partsToText(exp.periodParts || exp.period), exp.company + ' · 时间');
      node.appendChild(field);

      field = document.createElement('div');
      field.className = 'node-company';
      renderTextParts(field, exp.companyParts || exp.company);
      setEditKey(field, 'resume.' + experienceId + '.company', partsToText(exp.companyParts || exp.company), exp.company + ' · 公司/学校');
      node.appendChild(field);

      field = document.createElement('div');
      field.className = 'node-title';
      renderTextParts(field, exp.titleParts || exp.title, 'text-en-display');
      setEditKey(field, 'resume.' + experienceId + '.title', partsToText(exp.titleParts || exp.title), exp.company + ' · 职业/专业', false, 'text-en-display');
      node.appendChild(field);

      field = document.createElement('div');
      field.className = 'node-desc';
      renderTextParts(field, exp.descParts || exp.desc);
      setEditKey(field, 'resume.' + experienceId + '.desc', partsToText(exp.descParts || exp.desc), exp.company + ' · 描述', true);
      node.appendChild(field);

      var tags = document.createElement('div');
      tags.className = 'node-tags';
      (exp.highlights || []).forEach(function (highlight, highlightIndex) {
        var highlightItem = exp.highlightItems && exp.highlightItems[highlightIndex];
        var highlightId = highlightItem && highlightItem.id ? highlightItem.id : String(highlightIndex);
        var tag = document.createElement('span');
        tag.className = 'node-tag';
        renderTextParts(tag, typeof highlight === 'string'
          ? [{ lang: 'zh-CN', text: '▶ ' }].concat(splitTextByLanguage(highlight))
          : [{ lang: 'zh-CN', text: '▶ ' }].concat(highlight));
        setEditKey(tag, 'resume.' + experienceId + '.highlight.' + highlightId, '▶ ' + partsToText(highlight), exp.company + ' · 亮点 ' + (highlightIndex + 1));
        tags.appendChild(tag);
      });
      node.appendChild(tags);

      timeline.appendChild(node);
    });
  }

  // ========== 终端 ==========
  function setupTerminal() {
    var body = document.getElementById('terminalBody');
    var input = document.getElementById('terminalInput');
    var introEl = document.getElementById('terminalIntro');
    if (!body || !input) return;

    if (introEl) {
      renderTextParts(introEl, contact.introParts);
      setEditKey(introEl, 'terminal.intro', partsToText(contact.introParts), '开场提示', true);
    }

    var history = [];

    function addLine(content, type) {
      var line = document.createElement('div');
      line.className = 'terminal-line';
      var output = document.createElement('span');
      output.className = type || 'output';
      output.textContent = partsToText(content);
      line.appendChild(output);
      body.appendChild(line);
      body.scrollTop = body.scrollHeight;
    }

    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (document.documentElement.getAttribute('data-site-studio-editing') === 'true') return;
      var cmd = input.value.trim().toLowerCase();
      if (!cmd) return;

      // 回显命令
      addLine('SuiAn@dev:~$ ' + cmd, 'cmd');

      if (cmd === 'clear') {
        clearElement(body);
      } else if (cmd === 'home') {
        addLine(contact.commands[cmd], 'output');
        var hero = document.getElementById('hero');
        if (hero) hero.scrollIntoView({ behavior: 'smooth' });
      } else if (cmd === 'game') {
        addLine(contact.commands[cmd], 'output');
        startDinoGame();
        setTimeout(function () { input.blur(); }, 10);
      } else if (contact.commands[cmd]) {
        addLine(contact.commands[cmd], 'output');
      } else {
        addLine('命令未找到: ' + cmd + '。输入 help 查看可用命令。', 'error');
      }

      input.value = '';
      body.scrollTop = body.scrollHeight;
    });

    // 点击终端区域聚焦输入框
    body.addEventListener('click', function (e) {
      if (e.target.closest('.dino-game-wrap')) return;
      if (document.documentElement.getAttribute('data-site-studio-editing') === 'true') return;
      input.focus();
    });
  }

  // ========== 粒子背景 ==========
  function initParticles() {
    var canvas = document.getElementById('particles');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var w, h;
    var particles = [];
    var mouse = { x: -1000, y: -1000 };
    var PARTICLE_COUNT = window.siteConfig && window.siteConfig.theme
      ? window.siteConfig.theme.particleCount : 80;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function createParticle() {
      var colors = window.siteConfig && window.siteConfig.theme && window.siteConfig.theme.colors
        ? window.siteConfig.theme.colors : {};
      var palette = [
        colors.blue || '#4285F4', colors.red || '#EA4335', colors.yellow || '#FBBC05',
        colors.green || '#34A853', colors.purple || '#b388ff', colors.terminal || '#00ff41'
      ];
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        color: palette[Math.floor(Math.random() * palette.length)]
      };
    }

    // 创建粒子
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }

    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var particlesEnabled = !window.siteConfig || !window.siteConfig.effects ||
        window.siteConfig.effects.particles !== false;
      var targetCount = particlesEnabled && window.siteConfig && window.siteConfig.theme
        ? Number(window.siteConfig.theme.particleCount) || 0 : (particlesEnabled ? PARTICLE_COUNT : 0);
      while (particles.length < targetCount) particles.push(createParticle());
      if (particles.length > targetCount) particles.length = targetCount;

      particles.forEach(function (p) {
        // 移向鼠标
        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          p.x += dx * 0.015;
          p.y += dy * 0.015;
        }

        // 移动
        p.x += p.vx;
        p.y += p.vy;

        // 边界
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // 绘制
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);

        // 连线
        particles.forEach(function (p2) {
          var dx2 = p.x - p2.x;
          var dy2 = p.y - p2.y;
          var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist2 < 100) {
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = (100 - dist2) / 100 * 0.15;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });
      });

      requestAnimationFrame(draw);
    }
    draw();
  }

  // ========== 滚动动画 ==========
  function initScrollReveal() {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // 当 About section 进入视野时触发属性条动画
          if (entry.target.id === 'about') {
            animateStatBars();
          }
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.section').forEach(function (sec) {
      observer.observe(sec);
    });
  }

  function renderConfiguredContent() {
    renderNav();
    renderHero();
    renderAbout();
    renderProjects();
    renderResume();
    if (window.SiteRuntime && window.siteConfig) {
      window.SiteRuntime.applyConfig(window.siteConfig);
    }
  }

  // ========== 全局初始化 ==========
  function init() {
    if (window.FontScaleControl) {
      window.FontScaleControl.init(document);
    }

    // 禁止浏览器恢复上次滚动位置，每次打开都从顶部开始
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    renderConfiguredContent();
    setupTerminal();
    initParticles();
    initScrollReveal();

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // 按下 Enter 键跳转到 About 区
    window.addEventListener('keydown', function (e) {
      var activeElement = document.activeElement;
      var siteStudioPanel = document.getElementById('siteStudioPanel');
      if (siteStudioPanel && (siteStudioPanel.contains(e.target) || siteStudioPanel.contains(activeElement))) return;
      var isInteractive = activeElement && activeElement.matches('button, a, input, select, textarea, summary, [contenteditable]');
      if (e.key === 'Enter' && !isInteractive) {
        e.preventDefault();
        var aboutSection = document.getElementById('about');
        if (aboutSection) aboutSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
    document.dispatchEvent(new CustomEvent('site:ready'));
  }

  // ========== 终端内嵌小游戏 ==========
  function startDinoGame() {
    if (activeGameCleanup) activeGameCleanup();
    var body = document.getElementById('terminalBody');
    if (!body) return;

    var wrap = document.createElement('div');
    wrap.className = 'dino-game-wrap';
    var scoreEl = document.createElement('div');
    scoreEl.className = 'dino-game-score';
    var canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 280;
    wrap.appendChild(scoreEl);
    wrap.appendChild(canvas);
    body.appendChild(wrap);
    body.scrollTop = body.scrollHeight;

    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var groundY = H - 38;

    var gameBehaviors = window.SiteBehaviors || {};
    var DEFAULT_GAME_CONFIG = gameBehaviors.GAME_CONFIG || {
      startSpeed: 1, maxSpeed: 2.5, speedStep: 0.15, speedEveryFrames: 600,
      firstObstacleRatio: 0.6, minObstacleGap: 260, maxObstacleGap: 360, maxObstacles: 3,
      jumpVelocity: -6, riseGravity: 0.18, fallGravity: 0.08, hangFrames: 8,
      anticipationFrames: 6, landingFrames: 3
    };
    var GAME_CONFIG = Object.assign({}, DEFAULT_GAME_CONFIG,
      window.siteConfig && window.siteConfig.game ? window.siteConfig.game : {});
    GAME_CONFIG.maxSpeed = Math.min(2.5, Number(GAME_CONFIG.maxSpeed) || 2.5);
    GAME_CONFIG.startSpeed = Math.min(GAME_CONFIG.maxSpeed, Number(GAME_CONFIG.startSpeed) || 1);
    var firstObstacleXBase = gameBehaviors.firstObstacleX || function (width, config) {
      config = config || GAME_CONFIG;
      return Math.round(width * config.firstObstacleRatio);
    };
    var obstacleGapBase = gameBehaviors.obstacleGap || function (randomValue, config) {
      config = config || GAME_CONFIG;
      return Math.round(config.minObstacleGap +
        (config.maxObstacleGap - config.minObstacleGap) * randomValue);
    };
    var canSpawnObstacleBase = gameBehaviors.canSpawnObstacle || function (width, latestX, count, nextGap, config) {
      config = config || GAME_CONFIG;
      return count < config.maxObstacles && width - latestX >= nextGap;
    };
    var firstObstacleX = function (width) { return firstObstacleXBase(width, GAME_CONFIG); };
    var obstacleGap = function (randomValue) { return obstacleGapBase(randomValue, GAME_CONFIG); };
    var canSpawnObstacle = function (width, latestX, count, nextGap) {
      return canSpawnObstacleBase(width, latestX, count, nextGap, GAME_CONFIG);
    };
    var score = 0, running = false, speed = GAME_CONFIG.startSpeed, started = false;
    var monster = {
      x: 50, y: groundY - 32, w: 50, h: 32, vy: 0, jumping: false,
      hangTimer: 0, landTimer: 0, anticipationTimer: 0
    };
    var RISE_GRAVITY = GAME_CONFIG.riseGravity, FALL_GRAVITY = GAME_CONFIG.fallGravity;
    var JUMP_VEL = GAME_CONFIG.jumpVelocity;
    var LANDING_VEL = Math.abs(JUMP_VEL) * Math.sqrt(FALL_GRAVITY / RISE_GRAVITY);
    var HANG_FRAMES = Number(GAME_CONFIG.hangFrames) || 0;
    var ANTICIPATION_FRAMES = GAME_CONFIG.anticipationFrames;  // 蓄力挤压的帧数（参考源 ANTICIPATION_DURATION_FRAMES=6）
    var obstacles = [], frame = 0, nextObstacleGap = obstacleGap(Math.random());

    var stars = [];
    var starSpeeds = [];
    for (var si = 0; si < 50; si++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * (groundY - 20),
        size: Math.random() < 0.15 ? 2 : 1,
        bright: Math.random() < 0.25
      });
      starSpeeds.push(0.15 + Math.random() * 0.4);
    }

    function createObstacle(x, forcedType) {
      return {
        x: x,
        y: groundY,
        type: forcedType || (Math.random() < 0.35 ? 'cactus-big' : 'cactus-small')
      };
    }

    function chooseSequence() {
      var enabled = (GAME_CONFIG.sequences || []).filter(function (sequence) {
        return sequence && sequence.enabled !== false && sequence.items && sequence.items.length;
      });
      if (!enabled.length) return { items: [{ type: Math.random() < 0.35 ? 'cactus-big' : 'cactus-small', gap: 0 }] };
      var total = enabled.reduce(function (sum, sequence) { return sum + Math.max(1, Number(sequence.weight) || 1); }, 0);
      var cursor = Math.random() * total;
      for (var index = 0; index < enabled.length; index++) {
        cursor -= Math.max(1, Number(enabled[index].weight) || 1);
        if (cursor <= 0) return enabled[index];
      }
      return enabled[enabled.length - 1];
    }

    function appendSequence(startX, sequence) {
      var x = startX;
      (sequence.items || []).slice(0, GAME_CONFIG.maxObstacles).forEach(function (item, itemIndex) {
        var obstacle = createObstacle(x, item.type);
        obstacles.push(obstacle);
        var width = obstacle.type === 'cactus-big' ? 16 : 10;
        x += width + (itemIndex < sequence.items.length - 1 ? Math.max(24, Number(item.gap) || 40) : 0);
      });
    }

    function spawnObstacle() {
      var latest = obstacles[obstacles.length - 1];
      if (!latest || canSpawnObstacle(W, latest.x, obstacles.length, nextObstacleGap)) {
        appendSequence(W, chooseSequence());
        nextObstacleGap = obstacleGap(Math.random());
      }
      if (frame % GAME_CONFIG.speedEveryFrames === 0 && speed < GAME_CONFIG.maxSpeed) {
        speed = Math.min(GAME_CONFIG.maxSpeed, speed + GAME_CONFIG.speedStep);
      }
    }

    function update() {
      if (!running) return;
      frame++;
      score++;
      if (monster.landTimer > 0) monster.landTimer--;
      // 蓄力阶段：倒计时，归零时正式启动跳跃
      if (monster.anticipationTimer > 0) {
        monster.anticipationTimer--;
        if (monster.anticipationTimer === 0) {
          monster.jumping = true;
          monster.vy = JUMP_VEL;
        }
      }
      if (monster.jumping) {
        if (monster.hangTimer > 0) {
          monster.hangTimer--;
        } else {
          monster.y += monster.vy;
          var nextVelocity = monster.vy + (monster.vy < 0 ? RISE_GRAVITY : FALL_GRAVITY);
          if (monster.vy < 0 && nextVelocity >= 0 && HANG_FRAMES > 0) {
            monster.vy = 0;
            monster.hangTimer = HANG_FRAMES;
          } else {
            monster.vy = nextVelocity;
          }
        }
        if (monster.y >= groundY - monster.h) {
          monster.y = groundY - monster.h;
          monster.jumping = false;
          monster.vy = 0;
          monster.landTimer = Number(GAME_CONFIG.landingFrames) || 0;
        }
      }
      spawnObstacle();
      for (var i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= speed;
        var o = obstacles[i];
        var ow = o.type === 'cactus-big' ? 16 : 10;
        var oh = o.type === 'cactus-big' ? 38 : 26;
        if (o.x + ow < 0) { obstacles.splice(i, 1); continue; }
        if (monster.x + monster.w - 10 > o.x + 2 && monster.x + 10 < o.x + ow - 2 && monster.y + monster.h - 4 > groundY - oh && monster.y + 4 < groundY) { running = false; }
      }
      draw();
      scoreEl.textContent = 'SCORE  ' + Math.floor(score / 6);
      if (running) requestAnimationFrame(update);
    }

    // 像素仙人掌
    function drawCactus(x, y, type) {
      var G1 = '#2a8', G2 = '#3b9', S1 = '#d44';
      if (type === 'cactus-big') {
        ctx.fillStyle = G1;
        ctx.fillRect(x+5, y-38, 8, 38);
        ctx.fillRect(x+1, y-22, 5, 6);
        ctx.fillRect(x+1, y-16, 10, 4);
        ctx.fillRect(x+12,y-26, 5, 6);
        ctx.fillRect(x+8, y-20, 10, 4);
        ctx.fillStyle = G2;
        ctx.fillRect(x+7, y-38, 4, 38);
        ctx.fillStyle = S1;
        ctx.fillRect(x+6, y-34, 2, 3);
        ctx.fillRect(x+2, y-20, 2, 2);
        ctx.fillRect(x+13,y-24, 2, 2);
      } else {
        ctx.fillStyle = G1;
        ctx.fillRect(x+3, y-26, 4, 26);
        ctx.fillRect(x,   y-14, 10, 4);
        ctx.fillRect(x,   y-18, 4, 5);
        ctx.fillStyle = G2;
        ctx.fillRect(x+5, y-26, 2, 26);
        ctx.fillStyle = S1;
        ctx.fillRect(x+4, y-24, 1, 2);
        ctx.fillRect(x+1, y-16, 2, 2);
      }
    }

    // Clawd 角色（来源：vibe-motion/jumping-clawd，viewBox 0 0 274 178）
    function drawClawd(px, py) {
      var s = 0.196;   // 50 / 254.94，把源坐标缩到 50px 宽
      var ox = 9.23;   // 源最左 x（左手臂）
      var oy = 8.74;   // 源最上 y（身体顶）

      // 身体压拉（Plan A：蓄力 + 落地）
      // 参考源：ANTICIPATION_SCALE_X=1.12, ANTICIPATION_SCALE_Y=0.77
      // 参考源：LANDING_SCALE_X=1.15, LANDING_SCALE_Y=0.7
      var scaleX = 1, scaleY = 1;
      if (monster.anticipationTimer > 0) {
        var tAt = 1 - (monster.anticipationTimer / ANTICIPATION_FRAMES); // 0 → 1
        scaleX = 1 + 0.12 * tAt;
        scaleY = 1 - 0.23 * tAt;
      } else if (monster.landTimer > 0) {
        var tL = monster.landTimer / 3; // 1 → 0
        scaleX = 1 + 0.15 * tL;
        scaleY = 1 - 0.3 * tL;
      }

      // 手臂摆动角度（参考源 ARM_PIVOTS / ARM_*_SWING_DEGREES）
      function getArmAngleRad() {
        if (monster.landTimer > 0) return 30 * Math.PI / 180;   // 落地瞬间：下摆 30°
        if (monster.anticipationTimer > 0) return 38 * Math.PI / 180; // 蓄力：下摆 38°
        if (!monster.jumping)    return 0;                      // 静止：0°
        if (monster.vy <= 0) {
          // 上升：38°（起跳）→ -42°（最高点）
          var t = 1 - (monster.vy / JUMP_VEL);
          return (38 + t * -80) * Math.PI / 180;
        } else {
          // 下落：-42°（最高点）→ 30°（落地前一帧）
          var t = Math.min(monster.vy / LANDING_VEL, 1);
          return (-42 + t * 72) * Math.PI / 180;
        }
      }
      var armAngle = getArmAngleRad();

      function r(sx, sy, sw, sh, color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.round(px + (sx - ox) * s),
          Math.round(py + (sy - oy) * s),
          Math.round(sw * s),
          Math.round(sh * s)
        );
      }
      // 绕源坐标 pivot 旋转绘制一个矩形（在外部 scale 包裹的坐标系里）
      // sign=-1 用于左臂：左臂在 pivot 左侧，需取反才能跟右臂同步往同一方向甩
      function drawArm(pivotSrcX, pivotSrcY, armSrcX, armSrcY, armSrcW, armSrcH, color, sign) {
        ctx.save();
        ctx.translate(
          px + (pivotSrcX - ox) * s,
          py + (pivotSrcY - oy) * s
        );
        ctx.rotate(armAngle * sign);
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.round((armSrcX - pivotSrcX) * s),
          Math.round((armSrcY - pivotSrcY) * s),
          Math.round(armSrcW * s),
          Math.round(armSrcH * s)
        );
        ctx.restore();
      }

      // 整体围绕角色底部中心 (136.7, 172.77) 缩放（脚不动，身子挤压拉伸）
      var pivotSrcX = 136.7;
      var pivotSrcY = 172.77;
      var pivotScreenX = px + (pivotSrcX - ox) * s;
      var pivotScreenY = py + (pivotSrcY - oy) * s;

      ctx.save();
      ctx.translate(pivotScreenX, pivotScreenY);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-pivotScreenX, -pivotScreenY);

      // 身体
      r(40.9,  8.74,  191.6,  127.85, '#DA7756');
      // 手臂（绕 pivot 旋转；左臂取反保持镜像同步）
      drawArm(48.9, 58.45,  9.23, 42.62, 39.67, 31.66, '#DA7756', -1); // 左臂，pivot 在右边缘
      drawArm(224,  58.45,  224,  42.62, 40.17, 31.66, '#DA7756',  1); // 右臂，pivot 在左边缘
      // 四条腿
      r(57.4,  144.59, 15.39, 28.18, '#DA7756');
      r(89.29, 144.59, 15.76, 28.18, '#DA7756');
      r(168.67,144.59, 15.6,  28.18, '#DA7756');
      r(200.04,144.59, 15.18, 28.18, '#DA7756');
      // 眼睛
      r(73.24, 42.62,  16.26, 30.66, '#000');
      r(183.9, 42.62,  16.26, 30.66, '#000');

      ctx.restore();
    }

    var offsetX = 0;
    function drawGround() {
      ctx.fillStyle = '#1a2028';
      ctx.fillRect(0, groundY, W, 38);
      ctx.fillStyle = 'rgba(180,160,220,0.18)';
      ctx.fillRect(0, groundY, W, 1);
      for (var gx = Math.floor(offsetX % 16); gx < W; gx += 16) {
        ctx.fillStyle = 'rgba(180,160,220,0.08)';
        ctx.fillRect(gx + 6, groundY + 3, 4, 1);
      }
    }

    function draw() {
      var bg = ctx.createLinearGradient(0,0,0,H);
      bg.addColorStop(0, '#08081a');
      bg.addColorStop(0.5, '#111133');
      bg.addColorStop(1, '#1a1a40');
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
      for (var si = 0; si < stars.length; si++) {
        stars[si].x -= starSpeeds[si];
        if (stars[si].x < 0) stars[si].x = W;
        if (stars[si].bright && frame % 30 < 15) continue;
        var a = stars[si].bright ? 0.5 : 0.2;
        ctx.fillStyle = 'rgba(200,180,255,' + a + ')';
        ctx.fillRect(Math.floor(stars[si].x), Math.floor(stars[si].y), stars[si].size, stars[si].size);
      }
      drawClawd(monster.x, monster.y);
      for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        drawCactus(o.x, o.y, o.type);
      }
      offsetX = (offsetX + 1) % 16;
      drawGround();
      if (!started) {
        ctx.fillStyle = 'rgba(4,4,16,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#c8b0f0';
        ctx.font = 'bold 20px Zpix';
        ctx.fillText('跳跃躲避仙人掌  DODGE THE CACTUS', W/2, H/2-22);
        ctx.fillStyle = '#a098d0';
        ctx.font = '15px Zpix';
        ctx.fillText('点击或按空格開始遊戲  CLICK / SPACE TO START', W/2, H/2+16);
        ctx.textAlign = 'start';
      }
      if (!running && started) {
        ctx.fillStyle = 'rgba(4,4,16,0.75)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f66';
        ctx.font = 'bold 22px Zpix';
        ctx.fillText('游戏结束  GAME OVER', W/2, H/2-20);
        ctx.fillStyle = '#aab';
        ctx.font = '15px Zpix';
        ctx.fillText('空格 重新开始  /  ESC 退出', W/2, H/2+14);
        ctx.textAlign = 'start';
      }
    }

    function jump() {
      if (!monster.jumping && monster.anticipationTimer === 0) { monster.anticipationTimer = ANTICIPATION_FRAMES; }
      if (!running) restart();
    }

    function restart() {
      started = true; running = true; score = 0; speed = GAME_CONFIG.startSpeed; frame = 0;
      obstacles = [];
      appendSequence(firstObstacleX(W), chooseSequence());
      nextObstacleGap = obstacleGap(Math.random());
      monster.y = groundY - monster.h; monster.vy = 0; monster.jumping = false; monster.hangTimer = 0;
      update();
    }

    function cleanupGame(showScore) {
      running = false;
      document.removeEventListener('keydown', keyHandler);
      canvas.removeEventListener('click', jump);
      if (showScore) {
        var finalScore = Math.floor(score / 6);
        var line = document.createElement('div');
        line.className = 'terminal-line';
        var error = document.createElement('span');
        error.className = 'error';
        error.textContent = 'GAME OVER  SCORE ' + finalScore;
        line.appendChild(error);
        body.appendChild(line);
        body.scrollTop = body.scrollHeight;
      }
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      if (activeGameCleanup === cleanupGame) activeGameCleanup = null;
    }

    function exitGame() {
      cleanupGame(true);
    }

    function keyHandler(e) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); jump(); return; }
      if (e.key === 'Escape') { exitGame(); return; }
    }

    document.addEventListener('keydown', keyHandler);
    canvas.addEventListener('click', jump);
    activeGameCleanup = cleanupGame;

    draw();
  }

  window.SiteApp = {
    applyConfig: function (config) {
      if (!config) return;
      if (typeof applySiteConfigGlobals === 'function') applySiteConfigGlobals(config);
      renderConfiguredContent();
    },
    startGame: function () {
      var terminal = document.getElementById('contact');
      startDinoGame();
      if (terminal) {
        var bounds = terminal.getBoundingClientRect();
        window.scrollTo({
          top: Math.max(0, window.scrollY + bounds.top - 24),
          behavior: window.SiteRuntime && window.SiteRuntime.isPreview ? 'auto' :
            (window.siteConfig && window.siteConfig.effects && window.siteConfig.effects.smoothScroll ? 'smooth' : 'auto')
        });
      }
    }
  };

  // 配置加载完成并且 DOM 可用后启动。
  function boot() {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
  if (window.SiteConfigReady && typeof window.SiteConfigReady.then === 'function') {
    window.SiteConfigReady.then(boot);
  } else {
    boot();
  }
})();
