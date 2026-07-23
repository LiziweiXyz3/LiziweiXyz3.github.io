# Songbang README and Project Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a privacy-safe README for Songbang on GitHub and add GitHub links for both projects on the local personal website.

**Architecture:** Songbang receives one documentation-only change in its own repository. The personal site continues to render project cards from the `projects` array in `data.js`, so both card links are configured there without changing the rendering component.

**Tech Stack:** Markdown, Git, HTML, CSS, vanilla JavaScript, React/Vite (Songbang only for build validation).

## Global Constraints

- Songbang README must not include a developer name, email, personal website, demo URL, or Trae forum URL.
- Songbang changes are committed locally and its README is pushed to `origin/master`.
- Personal website changes are committed locally on `main` and must not be pushed.
- The Songbang project card must display `WIP` and link to `https://github.com/LiziweiXyz3/songbang`.
- The existing personal-website card must link to `https://github.com/LiziweiXyz3/LiziweiXyz3.github.io`.

---

### Task 1: Create and publish the Songbang README

**Files:**
- Create: `D:\songbang\README.md`
- Verify: `D:\songbang\package.json`

**Interfaces:**
- Consumes: product description and feature set recorded in `D:\songbang\PROJECT_CONTEXT.md`.
- Produces: a repository-root `README.md` rendered by GitHub.

- [ ] **Step 1: Write the failing existence check**

Run:

```powershell
if (Test-Path -LiteralPath README.md) { exit 1 } else { Write-Output 'README missing as expected' }
```

Expected: `README missing as expected`.

- [ ] **Step 2: Create the README**

Create `README.md` with these sections: `# 松绑`, `项目简介`, `适用人群`, `核心设计`, `主要功能`, `技术栈`, `本地运行`, and `隐私说明`. Describe the product as a PWA that supports emotional awareness, pressure unpacking, ideal-day exploration, career exploration, cognitive reframing, and micro-actions. State that it is for self-exploration and does not replace professional medical or psychological services. Use `npm install` and `npm run dev` as the local commands. Do not include any URL, personal name, email, or author section.

- [ ] **Step 3: Verify README content and build**

Run:

```powershell
@('README.md') | ForEach-Object { if (-not (Test-Path -LiteralPath $_)) { throw "Missing $_" } }
$readme = Get-Content -Raw -LiteralPath README.md
@('岁安', '@', 'http://', 'https://', 'forum.trae.cn') | ForEach-Object { if ($readme.Contains($_)) { throw "Privacy or link violation: $_" } }
if ($readme -notmatch 'npm install' -or $readme -notmatch 'npm run dev') { throw 'Missing local run commands' }
npm run build
```

Expected: no PowerShell exception and a successful Vite build.

- [ ] **Step 4: Commit and publish only the README**

Run:

```powershell
git add README.md
git commit -m "docs: add Songbang README"
git push origin master
```

Expected: `README.md` appears on the GitHub repository homepage; no application source file is committed.

### Task 2: Add GitHub links to local project cards

**Files:**
- Modify: `D:\PersonalSite\data.js`

**Interfaces:**
- Consumes: each project object fields `id`, `title`, `desc`, `tags`, `status`, `link`, and `icon`.
- Produces: two card objects rendered by `renderProjects()` in `D:\PersonalSite\js\script.js`.

- [ ] **Step 1: Write the failing project-card check**

Run:

```powershell
$data = Get-Content -Raw -LiteralPath data.js
if ($data -match 'title: "松绑 Songbang"') { exit 1 } else { Write-Output 'Songbang card missing as expected' }
```

Expected: `Songbang card missing as expected`.

- [ ] **Step 2: Update the project data**

Change the existing `个人网站` object so `link` is `https://github.com/LiziweiXyz3/LiziweiXyz3.github.io`. Add this second object to `projects`:

```javascript
{
  id: 2,
  title: "松绑 Songbang",
  desc: "面向职场青年的心理韧性训练与理想生活探索工具，用情绪觉察、压力拆解和微行动帮助找回主动选择。",
  tags: ["React", "Vite", "Tailwind CSS", "PWA"],
  status: "wip",
  link: "https://github.com/LiziweiXyz3/songbang",
  icon: "🪢"
}
```

- [ ] **Step 3: Verify syntax and expected links**

Run:

```powershell
node --check data.js
$data = Get-Content -Raw -LiteralPath data.js
@('https://github.com/LiziweiXyz3/LiziweiXyz3.github.io', 'title: "松绑 Songbang"', 'status: "wip"', 'https://github.com/LiziweiXyz3/songbang') | ForEach-Object { if (-not $data.Contains($_)) { throw "Missing $_" } }
```

Expected: Node exits with code 0 and no PowerShell exception.

- [ ] **Step 4: Commit the website update locally**

Run:

```powershell
git add data.js
git commit -m "feat: add Songbang project link"
git status --short --branch
```

Expected: a new local commit on `main`; no `git push` command is run.
