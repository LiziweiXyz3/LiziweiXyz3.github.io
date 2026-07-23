# Projects 卡片排版统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Songbang 项目卡片仅显示中文和 💼 图标，两个项目卡片等高，并建立清晰的标题、说明字号层级。

**Architecture:** 项目内容继续由 `data.js` 的 `projects` 数组驱动，已有渲染器会自动采用 `icon` 字段。样式仅在项目网格、卡片和文字规则中实现等高与两行截断，不改变跳转、新标签页或未来双语标题的通用结构。

**Tech Stack:** 原生 HTML、CSS、JavaScript；Node.js 语法检查；Git。

## Global Constraints

- Songbang 使用 `title: "松绑"` 和 `icon: "💼"`，不再带 `titleEn` 或 `image` 字段。
- Songbang 说明精确为 `面向职场青年的心理韧性训练与理想生活探索工具。`，视觉上最多显示两行并预留两行空间。
- 项目标题为 18px，项目说明为 16px；标题必须大于说明。
- 同一行项目卡片拉伸为相同高度；项目卡片仍可整卡新标签页跳转。
- 移除不再使用的 `assets/songbang-knot.svg`，保留未来项目可用的双语标题 CSS 与渲染结构。
- 个人网站只在本地提交，禁止推送 GitHub。

---

### Task 1: 更新 Songbang 内容与项目卡片布局

**Files:**
- Delete: `assets/songbang-knot.svg`
- Modify: `data.js:60-82`
- Modify: `stylesheet.css:309-385`
- Test: Node.js 语法检查与静态内容检查（无自动化测试框架）

**Interfaces:**
- Consumes: `projects` 数组中的 `title`、`desc`、`icon`、`link` 字段，以及 `js/script.js` 已有的 `icon` 回退渲染。
- Produces: Songbang 仅显示中文、💼 图标、统一卡片高度和两行说明占位的项目展示。

- [ ] **Step 1: 写出会失败的静态断言并运行**

在 PowerShell 中运行以下检查；当前版本应因旧的英文标题、SVG 字段、长说明、旧字号及未固定两行而失败：

```powershell
$data = Get-Content -Raw -Encoding utf8 data.js
$css = Get-Content -Raw -Encoding utf8 stylesheet.css
if ($data -notmatch 'icon: "💼"') { throw 'Songbang icon is missing' }
if ($data -match 'titleEn: "Songbang"|image: "assets/songbang-knot.svg"') { throw 'Songbang legacy metadata remains' }
if ($data -notmatch 'desc: "面向职场青年的心理韧性训练与理想生活探索工具。"') { throw 'Songbang description is wrong' }
if ($css -notmatch 'align-items: stretch;' -or $css -notmatch 'height: 100%;' -or $css -notmatch '-webkit-line-clamp: 2;' -or $css -notmatch 'font-size: 18px;' -or $css -notmatch 'font-size: 16px;') { throw 'Card layout rules are incomplete' }
```

Expected: FAIL with one or more legacy-content or layout-rule messages.

- [ ] **Step 2: 写出最小实现**

在 `data.js` 的 Songbang 对象中替换为以下字段组合，其余 `tags`、`status`、`link` 保持不变：

```js
title: "松绑",
desc: "面向职场青年的心理韧性训练与理想生活探索工具。",
icon: "💼"
```

删除该对象的 `titleEn` 和 `image` 字段。使用 `apply_patch` 删除 `assets/songbang-knot.svg`。

在 `stylesheet.css` 中做以下精确调整：

```css
.projects-grid {
  align-items: stretch;
}

.project-card {
  height: 100%;
}

.project-title {
  font-size: 18px;
}

.project-desc {
  font-size: 16px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  min-height: calc(1.6em * 2);
}
```

保留已有的 `margin-bottom: 12px` 与双语标题选择器，不修改项目跳转渲染逻辑。

- [ ] **Step 3: 运行验证**

```powershell
node --check data.js
node --check js\script.js
git diff --check
$data = Get-Content -Raw -Encoding utf8 data.js
$css = Get-Content -Raw -Encoding utf8 stylesheet.css
if ($data -notmatch 'title: "松绑"' -or $data -notmatch 'icon: "💼"') { throw 'Songbang Chinese title or briefcase icon is missing' }
if ($data -match 'titleEn: "Songbang"|image: "assets/songbang-knot.svg"') { throw 'Songbang legacy metadata remains' }
if ($data -notmatch 'desc: "面向职场青年的心理韧性训练与理想生活探索工具。"') { throw 'Songbang description is wrong' }
if ($css -notmatch 'align-items: stretch;' -or $css -notmatch 'height: 100%;' -or $css -notmatch '-webkit-line-clamp: 2;' -or $css -notmatch 'font-size: 18px;' -or $css -notmatch 'font-size: 16px;') { throw 'Card layout rules are incomplete' }
if (Test-Path 'assets/songbang-knot.svg') { throw 'Obsolete Songbang SVG still exists' }
```

Expected: 两条 `node --check` 命令无输出且退出码为 0；其余断言无输出；`git diff --check` 无输出。

- [ ] **Step 4: 本地提交**

```powershell
git add data.js stylesheet.css assets/songbang-knot.svg
git commit -m "feat: refine project card layout"
```

Expected: 创建一个只包含项目内容、样式和移除旧 SVG 的本地提交；不执行 `git push`。
