// ============================================================
//  ★ 个人网站数据文件 — 你只改这个文件
// ============================================================
//  维护方式：改数据 → 刷新浏览器 → 看效果
//  加项目：复制 projects 数组里的一项，改字段
//  加面经：复制 interviewNotes 数组里的一项，改字段
//  改个人信息：改下方 user 对象
// ============================================================

// ---------- 个人信息 ----------
const user = {
  name: "岁安",
  title: "Data Analyst / AI Learner",
  bio: "互联网数据分析师，正在学习 AI。用数据理解世界，用 AI 拓展边界。",
  avatar: "👾",          // 可以用 emoji，后续换成图片路径如 "assets/avatar.png"
  email: "zhongzhengzhng@gmail.com",
  github: "https://github.com/LiziweiXyz3",
  location: "中国"
};

// ---------- 导航 ----------
const navItems = [
  { id: "hero",     label: "HOME",      color: "#4285F4" },
  { id: "about",    label: "ABOUT",     color: "#EA4335" },
  { id: "projects", label: "PROJECTS",  color: "#FBBC05" },
  { id: "resume",   label: "RESUME",    color: "#34A853" },
  { id: "contact",  label: "TERMINAL",  color: "#00ff41" }
];

// ---------- About Me — RPG 属性 ----------
const about = {
  intro: "Hey！我是岁安，一个游走在数据与代码之间的探索者。白天和 SQL 打交道，晚上折腾 AI 项目。\n\n这个网站是我在数字世界的「存档点」——记录学到的技能、做过的项目、踩过的坑。",
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
const projects = [
  {
    id: 1,
    title: "个人网站",
    desc: "极客像素风格个人主页，数据驱动渲染，部署在 GitHub Pages",
    tags: ["HTML", "CSS", "JavaScript"],
    status: "done",
    link: null,
    icon: "🌐"
  }
];

// ---------- 简历 / 经历 ----------
const experiences = [
  {
    period: "2024 - 至今",
    title: "数据分析师",
    company: "虎牙",
    type: "work",           // "work" | "edu"
    desc: "负责XX业务线数据分析，搭建指标体系，输出业务洞察",
    highlights: ["日活监控看板搭建", "用户留存分析", "AB 测试设计"]
  },
  {
    period: "20XX - 20XX",
    title: "XX大学 XX专业",
    company: "XX大学",
    type: "edu",
    desc: "本科/硕士，GPA X.X",
    highlights: ["XX课程", "XX竞赛"]
  }
];

// ---------- 联系方式 ----------
const contact = {
  intro: "> 输入 help 查看可用命令，输入 clear 清屏",
  commands: {
    help:   "可用命令: about | projects | resume | contact | clear",
    about:  `> ${user.name} / ${user.title}\n> ${user.bio}`,
    projects: "> 跳转到项目展示区...",
    resume: "> 跳转到简历区...",
    contact: `> Email: ${user.email}\n> GitHub: ${user.github}`,
    whoami: `> ${user.name}`,
    pwd:    "> /home/suian",
    date:   `> ${new Date().toLocaleDateString("zh-CN")}`,
    hello:  "> 你好，旅行者！欢迎来到我的个人站点。输入 help 查看可以做什么。"
  }
};
