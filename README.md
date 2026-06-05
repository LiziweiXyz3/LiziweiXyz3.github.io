# 岁安的个人网站 · SuiAn.Dev

极客像素风格个人主页，Google 彩色 + 游戏感设计。

## 快速开始

双击 `index.html` 直接在浏览器打开。

## 如何维护（只改一个文件）

所有内容都在 **`data.js`**，你只需要改这一个文件。

### 加项目
在 `projects` 数组里复制粘贴一项，改字段：
```js
{
  id: 2,
  title: "你的项目名",
  desc: "项目简介",
  tags: ["Python", "AI"],
  status: "done",        // "done" | "wip" | "planned"
  link: "https://github.com/xxx",
  icon: "🤖"
}
```

### 加面经
在 `interviewNotes` 数组里复制粘贴一项：
```js
{
  company: "公司名",
  role: "岗位",
  difficulty: 4,         // 1-5 星难度
  date: "2026-06",
  tags: ["SQL", "Python"],
  summary: "简短总结",
  detail: "详细面经内容..."
}
```

### 改个人信息
改 `user` 对象里的 name、email、github 等。

### 改简历经历
改 `experiences` 数组。

改完保存 → 刷新浏览器 → 看效果。

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库，命名随意（推荐 `username.github.io`）
2. 把 `PersonalSite/` 目录下所有文件推送到仓库
3. Settings → Pages → Source 选 `main` 分支 → Save
4. 几分钟后访问 `https://username.github.io` 即可

## 文件说明

| 文件 | 用途 | 需要改吗 |
|------|------|----------|
| `index.html` | 页面骨架 | 不用 |
| `style.css` | 样式系统 | 不用（除非想调颜色） |
| `data.js` | ★ 内容数据 | **只改这个** |
| `script.js` | 渲染引擎 | 不用 |

## 技术栈

纯 HTML + CSS + JS，零依赖，零构建工具。
