// ============================================================
//  极客像素个人网站 — 渲染引擎 & 交互
// ============================================================

(function () {
  'use strict';

  // ========== 初始化导航 ==========
  function renderNav() {
    var container = document.getElementById('navLinks');
    if (!container) return;
    container.innerHTML = '';
    navItems.forEach(function (item) {
      var a = document.createElement('a');
      a.className = 'nav-link';
      a.href = '#' + item.id;
      a.textContent = item.label;
      a.style.color = item.color;
      a.addEventListener('click', function (e) {
        e.preventDefault();
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

  // ========== Hero 渲染 ==========
  function renderHero() {
    document.getElementById('heroAvatar').textContent = user.avatar;
    document.getElementById('heroTitle').textContent = user.name + '.Dev';
    document.getElementById('heroDesc').textContent = user.bio;
    typeWriter('heroSubtitle', '> ' + user.title, 60);
  }

  // 打字机效果
  function typeWriter(elementId, text, speed) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var i = 0;
    el.innerHTML = '<span class="cursor"></span>';
    function tick() {
      if (i < text.length) {
        // remove cursor, add char, re-add cursor
        var current = text.substring(0, i + 1);
        el.innerHTML = current + '<span class="cursor"></span>';
        i++;
        setTimeout(tick, speed);
      }
    }
    tick();
  }

  // ========== About 渲染 ==========
  function renderAbout() {
    document.getElementById('aboutIntro').textContent = about.intro;

    // 属性条
    var statsContainer = document.getElementById('statsContainer');
    statsContainer.innerHTML = '';
    about.stats.forEach(function (stat) {
      var row = document.createElement('div');
      row.className = 'stat-row';
      row.innerHTML =
        '<div class="stat-label">' +
          '<span class="stat-name">[' + stat.label + '] ' + stat.name + '</span>' +
          '<span class="stat-value">' + stat.value + '/100</span>' +
        '</div>' +
        '<div class="stat-bar-outer">' +
          '<div class="stat-bar-inner" style="width:0;background:' + stat.color + ';" data-width="' + stat.value + '%"></div>' +
        '</div>';
      statsContainer.appendChild(row);
    });

    // 技能槽
    var skillsContainer = document.getElementById('skillsContainer');
    skillsContainer.innerHTML = '';
    about.skills.forEach(function (skill) {
      var slot = document.createElement('div');
      slot.className = 'skill-slot slot-cat-' + skill.category;
      slot.innerHTML = '<span class="slot-dot"></span>' + skill.name + ' Lv.' + skill.level;
      skillsContainer.appendChild(slot);
    });
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
    grid.innerHTML = '';

    if (projects.length === 0) {
      grid.innerHTML =
        '<div class="project-empty">' +
          '<span class="lock-icon">🔒</span>' +
          '<p>???</p>' +
          '<p style="margin-top:8px;">QUEST SLOTS — 暂无项目，等待新的冒险...</p>' +
        '</div>';
      return;
    }

    projects.forEach(function (proj) {
      var card = document.createElement('div');
      card.className = 'project-card';

      var statusClass = 'status-' + proj.status;
      var statusText = { done: 'DONE', wip: 'WIP', planned: 'TODO' }[proj.status] || '???';

      var tagsHtml = proj.tags.map(function (t) {
        return '<span class="project-tag">#' + t + '</span>';
      }).join('');

      var linkHtml = proj.link
        ? '<a href="' + proj.link + '" target="_blank" rel="noopener" style="font-family:var(--font-pixel);font-size:9px;color:var(--blue);">🔗 VIEW</a>'
        : '';

      card.innerHTML =
        '<span class="project-status ' + statusClass + '">' + statusText + '</span>' +
        '<div class="project-icon">' + (proj.icon || '📦') + '</div>' +
        '<h3 class="project-title">' + proj.title + '</h3>' +
        '<p class="project-desc">' + proj.desc + '</p>' +
        '<div class="project-tags">' + tagsHtml + '</div>' +
        (linkHtml ? '<div style="margin-top:10px;">' + linkHtml + '</div>' : '');

      grid.appendChild(card);
    });
  }

  // ========== Resume 渲染 ==========
  function renderResume() {
    var timeline = document.getElementById('timeline');
    if (!timeline) return;
    timeline.innerHTML = '';

    experiences.forEach(function (exp) {
      var node = document.createElement('div');
      node.className = 'timeline-node node-type-' + exp.type;

      var tagsHtml = (exp.highlights || []).map(function (h) {
        return '<span class="node-tag">▶ ' + h + '</span>';
      }).join('');

      node.innerHTML =
        '<div class="node-period ' + exp.type + '">' + exp.period + '</div>' +
        '<div class="node-title">' + exp.title + '</div>' +
        '<div class="node-company">' + exp.company + '</div>' +
        '<div class="node-desc">' + exp.desc + '</div>' +
        '<div class="node-tags">' + tagsHtml + '</div>';

      timeline.appendChild(node);
    });
  }

  // ========== 面经渲染 ==========
  function renderInterview() {
    var grid = document.getElementById('interviewGrid');
    if (!grid) return;

    if (interviewNotes.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">' +
          '<span class="empty-icon">📭</span>' +
          '<p>暂无面经图鉴</p>' +
          '<p style="margin-top:8px;font-size:10px;">— 图鉴为空，等待冒险记录 —</p>' +
        '</div>';
      return;
    }

    interviewNotes.forEach(function (note, idx) {
      var card = document.createElement('div');
      card.className = 'interview-card';

      var starsHtml = '';
      for (var i = 1; i <= 5; i++) {
        starsHtml += i <= note.difficulty ? '⭐' : '☆';
      }

      var tagsHtml = note.tags.map(function (t) {
        return '<span class="interview-tag">#' + t + '</span>';
      }).join('');

      card.innerHTML =
        '<div class="interview-card-header">' +
          '<div>' +
            '<div class="interview-company">' + note.company + '</div>' +
            '<div class="interview-role">' + note.role + '</div>' +
          '</div>' +
          '<div class="interview-date">' + note.date + '</div>' +
        '</div>' +
        '<div class="interview-stars" style="padding:0 20px;">' + starsHtml + '</div>' +
        '<div class="interview-summary">' + note.summary + '</div>' +
        '<div class="interview-tags">' + tagsHtml + '</div>' +
        '<div class="interview-detail" id="detail-' + idx + '">' +
          '<div class="interview-detail-content">' + escapeHtml(note.detail) + '</div>' +
        '</div>' +
        '<div class="interview-toggle" data-idx="' + idx + '">▶ 展开详情</div>';

      grid.appendChild(card);
    });

    // 展开/折叠
    grid.querySelectorAll('.interview-toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var idx = this.getAttribute('data-idx');
        var detail = document.getElementById('detail-' + idx);
        if (!detail) return;
        var isOpen = detail.classList.contains('open');
        if (isOpen) {
          detail.classList.remove('open');
          this.textContent = '▶ 展开详情';
        } else {
          detail.classList.add('open');
          this.textContent = '▼ 收起详情';
        }
      });
    });
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ========== 终端 ==========
  function setupTerminal() {
    var body = document.getElementById('terminalBody');
    var input = document.getElementById('terminalInput');
    var introEl = document.getElementById('terminalIntro');
    if (!body || !input) return;

    if (introEl) introEl.textContent = contact.intro;

    var history = [];

    function addLine(text, type) {
      var line = document.createElement('div');
      line.className = 'terminal-line';
      line.innerHTML = '<span class="' + (type || 'output') + '">' + escapeHtml(text) + '</span>';
      body.appendChild(line);
      body.scrollTop = body.scrollHeight;
    }

    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var cmd = input.value.trim().toLowerCase();
      if (!cmd) return;

      // 回显命令
      addLine('sui@dev:~$ ' + cmd, 'cmd');

      if (cmd === 'clear') {
        body.innerHTML = '';
      } else if (contact.commands[cmd]) {
        addLine(contact.commands[cmd], 'output');
      } else {
        addLine('命令未找到: ' + cmd + '。输入 help 查看可用命令。', 'error');
      }

      input.value = '';
      body.scrollTop = body.scrollHeight;
    });

    // 点击终端区域聚焦输入框
    body.addEventListener('click', function () {
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
    var PARTICLE_COUNT = 80;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // 创建粒子
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        color: ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#b388ff', '#00ff41'][Math.floor(Math.random() * 6)]
      });
    }

    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    function draw() {
      ctx.clearRect(0, 0, w, h);

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

  // ========== 全局初始化 ==========
  function init() {
    renderNav();
    renderHero();
    renderAbout();
    renderProjects();
    renderResume();
    renderInterview();
    setupTerminal();
    initParticles();
    initScrollReveal();

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // DOM 加载完成后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
