// ============================================================
//  ★ 个人网站数据文件 — 你只改这个文件
// ============================================================
//  维护方式：改数据 → 刷新浏览器 → 看效果
//  加项目：复制 projects 数组里的一项，改字段
//  加面经：复制 interviewNotes 数组里的一项，改字段
//  改个人信息：改下方 user 对象
// ============================================================

// ---------- 个人信息 ----------
var user = {
  name: "岁安",
  title: "Data Analyst / AI Learner",
  bioParts: [
    { lang: "zh-CN", text: "互联网数据分析师，正在学习 " },
    { lang: "en", text: "AI" },
    { lang: "zh-CN", text: "。用数据理解世界，用 " },
    { lang: "en", text: "AI" },
    { lang: "zh-CN", text: " 拓展边界。" }
  ],
  avatar: "👾",          // 可以用 emoji，后续换成图片路径如 "assets/avatar.png"
  email: "zhongzhengzhng@gmail.com",
  github: "https://github.com/LiziweiXyz3"
};

// ---------- 导航 ----------
var navItems = [
  { id: "hero",     label: "HOME",      color: "#4285F4" },
  { id: "about",    label: "ABOUT",     color: "#EA4335" },
  { id: "projects", label: "PROJECTS",  color: "#FBBC05" },
  { id: "resume",   label: "RESUME",    color: "#34A853" },
  { id: "contact",  label: "TERMINAL",  color: "#00ff41" }
];

// ---------- About Me — RPG 属性 ----------
var about = {
  introParts: [
    { lang: "en", text: "Hey" },
    { lang: "zh-CN", text: "！我是岁安，一个游走在数据与代码之间的探索者。白天和 " },
    { lang: "en", text: "SQL" },
    { lang: "zh-CN", text: " 打交道，晚上折腾 " },
    { lang: "en", text: "AI" },
    { lang: "zh-CN", text: " 项目。\n\n这个网站是我在数字世界的「存档点」——记录学到的技能、做过的项目、踩过的坑。" }
  ],
  stats: [
    { label: "HP",  name: "学习热情", value: 95, color: "#EA4335" },
    { label: "MP",  name: "技能点数", value: 70, color: "#4285F4" },
    { label: "EXP", name: "项目经验", value: 55, color: "#34A853" }
  ],
  skills: [
    { name: "SQL",        level: 90, category: "data" },
    { name: "Python",     level: 55, category: "code"  },
    { name: "Excel",      level: 85 , category: "data"  },
    { name: "Tableau",    level: 60, category: "data"  },
    { name: "HTML/CSS",   level: 30, category: "code"  },
    { name: "JavaScript", level: 20, category: "code"  },
    { name: "AI/LLM",     level: 25, category: "ai"    },
    { name: "Prompt Eng", level: 40, category: "ai"    }
  ]
};

// ---------- 项目展示 ----------
// status: "done"=已完成 | "wip"=进行中 | "planned"=计划中
// 目前是空占位，后续加了项目会自动渲染
var projects = [
  {
    id: 1,
    title: "个人网站",
    descParts: [
      { lang: "zh-CN", text: "极客像素风格个人主页，数据驱动渲染，部署在 " },
      { lang: "en", text: "GitHub Pages" }
    ],
    tags: ["HTML", "CSS", "JavaScript"],
    status: "done",
    link: "https://github.com/LiziweiXyz3/LiziweiXyz3.github.io",
    icon: "🌐"
  },
  {
    id: 2,
    title: "松绑",
    desc: "面向职场青年的心理韧性训练与理想生活探索工具。",
    tags: ["React", "TypeScript", "Vite", "Tailwind CSS", "IndexedDB"],
    status: "wip",
    link: "https://github.com/LiziweiXyz3/songbang",
    icon: "💼"
  },
  {
    id: 3,
    title: "游戏直播 ChatBI",
    desc: "用自然语言查询并诊断游戏直播经营数据。",
    tags: ["Dify", "FastAPI", "DuckDB", "SQLGlot", "Python"],
    status: "done",
    link: "https://github.com/LiziweiXyz3/gamelive-chatbi",
    icon: "📊"
  }
];

// ---------- 简历 / 经历 ----------
var experiences = [
  {
    periodParts: [
      { lang: "en", text: "2024 -" },
      { lang: "zh-CN", text: "至今" }
    ],
    title: "数据分析师",
    company: "虎牙",
    type: "work",
    descParts: [
      { lang: "zh-CN", text: "负责 " },
      { lang: "en", text: "SDK" },
      { lang: "zh-CN", text: " 及渠道业务线数据分析，搭建指标体系，输出业务洞察与自动化报表" }
    ],
    highlights: [
      "日活监控看板搭建",
      "渠道产能分析",
      [{ lang: "en", text: "SDK" }, { lang: "zh-CN", text: " 周报自动化" }],
      [{ lang: "en", text: "AB" }, { lang: "zh-CN", text: " 测试设计" }]
    ]
  },
  {
    periodParts: [{ lang: "en", text: "2023 - 2024" }],
    title: "数据分析师",
    company: "京东",
    type: "work",
    desc: "负责供应链/物流相关业务数据分析与运营支持",
    highlights: ["仓储运营分析", "物流时效监控", "业务看板搭建"]
  },
  {
    periodParts: [{ lang: "en", text: "2021 - 2022" }],
    titleParts: [{ lang: "en", text: "MSc Digital Strategy & Information Systems" }],
    company: "英国南安普顿大学",
    type: "edu",
    descParts: [
      { lang: "zh-CN", text: "数字战略与信息系统硕士，一等学位 (" },
      { lang: "en", text: "Distinction" },
      { lang: "zh-CN", text: ")" }
    ],
    highlights: ["数据分析", "信息系统管理", "数字战略", "商业智能"]
  }
];

// ---------- 联系方式 ----------
var contact = {
  introParts: [
    { lang: "en", text: "> help " },
    { lang: "zh-CN", text: "查看命令 | " },
    { lang: "en", text: "game " },
    { lang: "zh-CN", text: "玩小游戏 | " },
    { lang: "en", text: "contact " },
    { lang: "zh-CN", text: "联系方式 | " },
    { lang: "en", text: "clear " },
    { lang: "zh-CN", text: "清屏" }
  ],
  commands: {
    help:   "可用命令: home | about | projects | resume | contact | game | clear",
    home:   "> 跳回首页...",
    about:  "Hey！我是岁安，一个游走在数据与代码之间的探索者。\n这个网站是我在数字世界的「存档点」，可以随便逛逛~",
    projects: "> 跳转到项目展示区...",
    resume: "> 跳转到简历区...",
    contact: `> Email: ${user.email}\n> GitHub: ${user.github}`,
    whoami: `> ${user.name}`,
    pwd:    "> /home/suian",
    date:   `> ${new Date().toLocaleDateString("zh-CN")}`,
    hello:  "> 你好，旅行者！欢迎来到我的个人站点。输入 help 查看可以做什么。",
    game:   "> 🎮 启动小游戏..."
  }
};

// ---------- Site Studio V3 配置加载 ----------
// 公开主页和本地编辑器共用 site-config.json。读取失败时保留上面的安全默认值。
function applySiteConfigGlobals(config) {
  if (!config || !config.content) return;
  var content = config.content;
  var configuredUser = content.user || {};
  user = {
    name: configuredUser.name || user.name,
    title: configuredUser.title || user.title,
    bioParts: configuredUser.bio || user.bioParts,
    avatar: user.avatar,
    email: configuredUser.email || user.email,
    github: configuredUser.github || user.github
  };

  if (Array.isArray(content.nav)) navItems = content.nav;
  if (content.about) {
    about = {
      introParts: content.about.intro || about.introParts,
      stats: Array.isArray(content.about.stats) ? content.about.stats : about.stats,
      skills: Array.isArray(content.about.skills) ? content.about.skills : about.skills
    };
  }
  if (Array.isArray(content.projects)) {
    projects = content.projects.map(function (project) {
      return {
        id: project.id,
        title: project.title,
        desc: project.description,
        tags: (project.tags || []).map(function (tag) {
          return typeof tag === 'string' ? tag : tag.text;
        }),
        tagItems: project.tags || [],
        status: project.status,
        link: project.link,
        icon: project.icon,
        image: project.image
      };
    });
  }
  if (Array.isArray(content.experiences)) {
    experiences = content.experiences.map(function (experience) {
      return {
        id: experience.id,
        period: experience.period,
        title: experience.title,
        company: experience.company,
        type: experience.type,
        desc: experience.description,
        highlights: (experience.highlights || []).map(function (highlight) {
          return typeof highlight === 'string' ? highlight : highlight.text;
        }),
        highlightItems: experience.highlights || []
      };
    });
  }
  if (content.contact) {
    contact = {
      introParts: content.contact.intro || contact.introParts,
      commands: content.contact.commands || contact.commands
    };
  }
  window.siteConfig = config;
}

window.SiteConfigReady = fetch('site-config.json', { cache: 'no-store' })
  .then(function (response) {
    if (!response.ok) throw new Error('site-config.json 读取失败');
    return response.json();
  })
  .then(function (config) {
    var normalized = window.SiteConfig
      ? window.SiteConfig.normalizeConfig(config, config)
      : config;
    applySiteConfigGlobals(normalized);
    return normalized;
  })
  .catch(function () {
    window.siteConfig = null;
    return null;
  });
